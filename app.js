const app = document.querySelector("#app");
const STORAGE_KEY = "heart-cut-prototype-v2";
const AD_CONFIG = { firstReveal: true, unlockInterpretation: true, minimumWatchMs: 1100 };
const INTERPRETATION_ENDPOINT = "/api/interpretation";
// Kept in lockstep with the app-shell version by both deployment scripts.
// Card art is otherwise cached for a long time, so an unversioned URL can leave
// one previously viewed card stuck on obsolete artwork after the deck changes.
const CARD_ART_VERSION = "42";

const MAJORS = [
  "The Fool", "The Magician", "The High Priestess", "The Empress", "The Emperor", "The Hierophant",
  "The Lovers", "The Chariot", "Strength", "The Hermit", "Wheel of Fortune", "Justice",
  "The Hanged Man", "Death", "Temperance", "The Devil", "The Tower", "The Star", "The Moon",
  "The Sun", "Judgement", "The World"
];
const SUITS = [
  ["Wands", "♨"], ["Cups", "♧"], ["Swords", "✣"], ["Pentacles", "✦"]
];
const RANKS = ["Ace", "Two", "Three", "Four", "Five", "Six", "Seven", "Eight", "Nine", "Ten", "Page", "Knight", "Queen", "King"];
const LOVE_STAGES = ["shuffle", "cutOne", "ritualCard", "reassembleOne", "cutThree", "reassembleThree", "spread", "choose", "reveal", "reading"];
const CAREER_STAGES = ["careerEmbers", "careerCut", "careerSpreadOne", "careerChooseOne", "careerSpreadTwo", "careerChooseTwo", "careerReveal", "reading"];
// Money now shares Love's shuffle/cut-into-three/spread/choose machinery: the same stage
// names ("shuffle", "cutThree", "spread", "choose") are reused so the generic gesture code
// (bindShuffle, sideDeckMarkup, bindSpread, animatePickCard, ...) needs no per-topic branching
// beyond the few points where the two rituals actually diverge. "pileOrder" replaces
// "reassembleThree": the three piles are ordered but never merged back into one deck.
const MONEY_STAGES = ["shuffle", "cutThree", "pileOrder", "spread", "choose", "moneyReveal", "reading"];
const DECISION_STAGES = ["decisionShuffle", "decisionCut", "decisionFuse", "decisionSpread", "decisionChoose", "decisionReveal", "reading"];
const KIN_STAGES = ["shuffle", "kinCut", "kinSpreadOne", "kinChooseOne", "kinSpreadTwo", "kinChooseTwo", "kinReveal", "reading"];
const GROWTH_STAGES = ["shuffle", "spread", "choose", "growthReveal", "reading"];
const FUTURE_STAGES = ["futureShuffle", "futureCutFour", "futureCompass", "futureSpread", "futureChooseDawn", "futureChooseZenith", "futureChooseDusk", "futureChooseMidnight", "futureReveal", "reading"];
const LOVE_POSITIONS = ["Hidden Heart", "You", "The Connection", "The Path Ahead"];
const CAREER_POSITIONS = ["Current Ground", "Your Unclaimed Strength", "The Friction", "Your Leverage", "The Next Bold Move"];
const MONEY_POSITIONS = ["What to Keep", "What to Grow", "What to Let Flow"];
const MONEY_VESSELS = ["Keep", "Grow", "Flow"];
const DECISION_POSITIONS = ["The Chosen Card"];
const KIN_POSITIONS = ["Your Voice", "Their Voice"];
const GROWTH_POSITIONS = ["The Root", "The Threshold", "The Becoming"];
const FUTURE_DIRECTIONS = ["Dawn", "Zenith", "Dusk", "Midnight"];
const FUTURE_POSITIONS = ["Dawn — What Begins", "Zenith — What Becomes Clear", "Dusk — What Must Change", "Midnight — What Guides You"];
// Money's entrance ad pays for its complete reading. Decision deliberately keeps the
// same two pauses as Love: one at the first reveal and another for the AI reflection.
const SEAMLESS_REVEAL_PATHS = ["Money", "Friendship / Family", "Personal Growth"];

const CARD_NOTES = {
  "The Lovers": ["choice", "alignment", "honest intimacy"],
  "The Star": ["hope", "renewal", "gentle faith"],
  "The Moon": ["intuition", "uncertainty", "the unspoken"],
  "The Sun": ["warmth", "clarity", "shared joy"],
  "Two of Cups": ["reciprocity", "meeting", "open exchange"],
  "Three of Swords": ["truth", "ache", "necessary honesty"],
  "Ten of Cups": ["emotional harmony", "belonging", "a shared vision"],
  "Ace of Cups": ["an opening", "feeling", "emotional generosity"],
  "Knight of Cups": ["invitation", "romance", "a tender pursuit"],
  "Queen of Cups": ["sensitivity", "attunement", "self-trust"],
  "King of Cups": ["emotional steadiness", "care", "maturity"],
  "The Tower": ["revelation", "release", "a changed story"],
  "Death": ["transition", "truth", "making room"],
  "Temperance": ["patience", "balance", "a gradual blend"],
  "Strength": ["bravery", "soft power", "self-respect"],
  "The Hermit": ["reflection", "inner guidance", "space"],
  "Justice": ["clarity", "accountability", "fairness"],
  "Wheel of Fortune": ["turning point", "timing", "change"],
  "The High Priestess": ["instinct", "silence", "what is sensed"],
  "The Empress": ["receiving", "nourishment", "self-worth"],
  "The Emperor": ["boundaries", "structure", "reliability"],
  "The Fool": ["beginning", "trust", "a brave step"],
  "The Devil": ["attachment", "desire", "seeing the tether"],
  "The Hanged Man": ["pause", "new perspective", "surrender"],
  "Judgement": ["awakening", "answering", "a clear call"],
  "The World": ["completion", "integration", "wholeness"]
};

function hashString(input) {
  let h = 2166136261;
  for (let i = 0; i < input.length; i += 1) h = Math.imul(h ^ input.charCodeAt(i), 16777619);
  return h >>> 0;
}
function rngFor(seed) {
  let n = hashString(String(seed)) || 1;
  return () => ((n = Math.imul(1664525, n) + 1013904223 >>> 0) / 4294967296);
}
function shuffleStable(items, random) {
  const result = [...items];
  for (let i = result.length - 1; i > 0; i -= 1) {
    const j = Math.floor(random() * (i + 1));
    [result[i], result[j]] = [result[j], result[i]];
  }
  return result;
}
function uid() { return `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}`; }
function clamp(value, min, max) { return Math.max(min, Math.min(max, value)); }
function escapeHTML(value = "") { return String(value).replace(/[&<>'"]/g, (char) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", "'": "&#39;", '"': "&quot;" }[char])); }

// Localization. t(en) returns the current-language string, falling back to the English source.
const I18N = {
  fr: {
    "Settings": "Réglages", "Language": "Langue", "Sound effects": "Effets sonores", "Volume": "Volume",
    "Card, shuffle, and transition sounds.": "Sons de carte, de mélange et de transition.",
    "Controls every card, shuffle, and transition sound.": "Contrôle chaque son de carte, de mélange et de transition.",
    "Background music": "Musique de fond", "Save settings": "Enregistrer les réglages", "Selected:": "Choisi :",
    "A quiet ritual for the heart": "Un rituel paisible pour le cœur",
    "Enter the<br>celestial book.": "Entrez dans le<br>livre céleste.",
    "A reading begins with the deck in your hands. The question can wait until you feel its weight.": "Une lecture commence avec le jeu entre vos mains. La question peut attendre que vous en sentiez le poids.",
    "Open the ritual": "Ouvrir le rituel",
    "Choose a path": "Choisissez une voie", "What calls for your attention?": "Qu'est-ce qui appelle votre attention ?",
    "Each reading has its own little choreography. Love is ready tonight.": "Chaque lecture a sa propre petite chorégraphie. L'amour est prêt ce soir.",
    "Return to the book": "Revenir au livre", "begin": "commencer", "coming soon": "bientôt",
    "Love": "Amour", "Career": "Carrière", "Money": "Argent", "Decision": "Décision", "Friendship / Family": "Amitié / Famille", "Personal Growth": "Développement personnel", "General Future": "Avenir général",
    "Love ritual": "Rituel de l'amour",
    "What does your heart wish to understand?": "Que souhaite comprendre votre cœur ?",
    "Give the question enough room to breathe. It does not need to be yes or no.": "Laissez à la question l'espace de respirer. Elle n'a pas besoin d'être par oui ou par non.",
    "Write here…": "Écrivez ici…",
    "Where is this relationship going?": "Où va cette relation ?",
    "What should I understand about this person?": "Que dois-je comprendre au sujet de cette personne ?",
    "What is blocking my love life?": "Qu'est-ce qui bloque ma vie amoureuse ?",
    "What energy surrounds this connection?": "Quelle énergie entoure ce lien ?",
    "Choose another path": "Choisir une autre voie", "Place the question": "Poser la question",
    "Loosen the cards beneath your hands.": "Détendez les cartes sous vos mains.",
    "Sweep your hand across the loose pile to send a wave through the cards.": "Balayez la main sur le tas épars pour envoyer une onde à travers les cartes.",
    "Cut the deck where it feels right.": "Coupez le jeu là où cela vous semble juste.",
    "Use the side view to choose the exact place, then lift there.": "Utilisez la vue de côté pour choisir l'endroit exact, puis soulevez là.",
    "Take the card beneath the lifted pile.": "Prenez la carte sous le paquet soulevé.",
    "It will remain hidden: the quiet energy beneath your question.": "Elle restera cachée : l'énergie tranquille sous votre question.",
    "Bring the two remaining piles together.": "Réunissez les deux paquets restants.",
    "Choose which pile belongs on top; both will settle in the center.": "Choisissez le paquet du dessus ; les deux se poseront au centre.",
    "Divide the deck into three.": "Divisez le jeu en trois.",
    "Place two markers along the side of the deck.": "Placez deux repères le long du côté du jeu.",
    "Choose the order in which to return the piles.": "Choisissez l'ordre de retour des paquets.",
    "Touch the piles from top to bottom, then watch them come home.": "Touchez les paquets de haut en bas, puis regardez-les revenir.",
    "Let the deck open.": "Laissez le jeu s'ouvrir.",
    "Open the spread and the cards will fan across the table on their own.": "Ouvrez le tirage et les cartes s'étaleront d'elles-mêmes sur la table.",
    "Choose three cards that call to you.": "Choisissez trois cartes qui vous appellent.",
    "Touch a card to draw it into the reading.": "Touchez une carte pour l'amener dans la lecture.",
    "Reveal the story in the order you wish.": "Révélez l'histoire dans l'ordre de votre choix.",
    "The first turn opens a brief doorway. The others are uninterrupted.": "Le premier retournement ouvre une brève porte. Les autres se font sans interruption.",
    "Gather into a deck": "Rassembler en un jeu", "Send a wave for me": "Envoyer une onde pour moi",
    "Lift at this point": "Soulever à cet endroit", "Draw the hidden card": "Tirer la carte cachée",
    "Stack with this pile on top": "Empiler avec ce paquet dessus", "Place first cut": "Placer la première coupe", "Make three piles": "Former trois paquets",
    "Stack in this order": "Empiler dans cet ordre", "Open the spread": "Ouvrir le tirage", "Place the four cards": "Disposer les quatre cartes", "Gather the reading": "Rassembler la lecture",
    "Hidden Heart": "Cœur caché", "You": "Vous", "The Connection": "Le lien", "The Path Ahead": "Le chemin à venir",
    "Reversed": "Renversée", "Upright": "À l'endroit",
    "Four cards, gathered beneath one sky.": "Quatre cartes, réunies sous un même ciel.",
    "Tarot is offered here as a reflective, imaginative tool—not a factual prediction or professional advice.": "Le tarot est proposé ici comme un outil de réflexion et d'imagination — non comme une prédiction factuelle ou un conseil professionnel.",
    "Begin a new reading": "Commencer une nouvelle lecture", "Copy the reading": "Copier la lecture",
    "Share the reading": "Partager la lecture", "Share as an image": "Partager en image",
    "New reading": "Nouvelle lecture", "Share": "Partager", "Reading actions": "Actions de lecture",
    "Sweep across the loose cards to send a wave through the pile.": "Balayez les cartes éparses pour envoyer une onde à travers le tas.",
    "Drag through the cards—a wave ripples across the pile": "Glissez à travers les cartes — une onde parcourt le tas",
    "physical moves · keep mixing or gather them": "gestes physiques · continuez à mélanger ou rassemblez-les",
    "The cards feel mixed. Gather them when you are ready.": "Les cartes semblent mélangées. Rassemblez-les quand vous êtes prêt·e.",
    "more moves will loosen the order.": "mouvements de plus déferont l'ordre.",
    "Side view · slide the brass marker up and down between the card edges": "Vue de côté · faites glisser le repère en laiton entre les tranches des cartes",
    "a light upper packet": "un paquet supérieur léger",
    "a deep upper packet": "un paquet supérieur épais",
    "a balanced division": "une division équilibrée",
    "The deck is shown from the side so every possible cut is reachable.": "Le jeu est montré de côté pour que chaque coupe soit accessible.",
    "Move the marker, then lift the deck at that exact place.": "Déplacez le repère, puis soulevez le jeu à cet endroit précis.",
    "lifted packet": "paquet soulevé", "resting packet": "paquet posé", "pile": "paquet", "cards": "cartes",
    "one card waits here": "une carte attend ici",
    "The card directly beneath the lifted packet becomes the Hidden Heart.": "La carte située juste sous le paquet soulevé devient le Cœur caché.",
    "Tap the pile you want on top. Both piles will meet in the center.": "Touchez le paquet à placer dessus. Les deux paquets se rejoindront au centre.",
    "Place the first marker": "Placez le premier repère",
    "First marker set · choose a different place for the second": "Premier repère placé · choisissez un autre endroit pour le second",
    "Choose the first break in the side of the deck.": "Choisissez la première cassure sur le côté du jeu.",
    "Choose the second break. The two markers will form three piles.": "Choisissez la seconde cassure. Les deux repères formeront trois paquets.",
    "of 3 chosen · numbers show the top-to-bottom order": "sur 3 choisis · les numéros indiquent l'ordre de haut en bas",
    "Tap the pile that should return first (on top).": "Touchez le paquet qui revient en premier (dessus).",
    "One touch fans every card into a reading arc": "Un toucher déploie chaque carte en arc de lecture",
    "Open the spread and the cards fan across the table.": "Ouvrez le tirage et les cartes s'éventailent sur la table.",
    "Drawn": "Tirées",
    "Tap any face-down card. It will travel into the center tray.": "Touchez une carte face cachée. Elle voyagera vers le plateau central.",
    "card has moved into the center tray.": "carte a rejoint le plateau central.",
    "cards have moved into the center tray.": "cartes ont rejoint le plateau central.",
    "The reading is ready to be gathered.": "La lecture est prête à être rassemblée.",
    "There is no required order.": "Il n'y a pas d'ordre imposé.",
    "A quiet pause before the closer reading": "Une pause paisible avant la lecture approfondie",
    "A small doorway in the ritual": "Une petite porte dans le rituel",
    "Mock sponsored moment": "Moment sponsorisé fictif",
    "The sky keeps<br>its own counsel.": "Le ciel garde<br>son propre conseil.",
    "This placeholder is deliberately separate from the ritual so an advertising provider can be exchanged later.": "Cet espace réservé est volontairement séparé du rituel pour pouvoir remplacer le fournisseur publicitaire plus tard.",
    "You may continue": "Vous pouvez continuer",
    "The door opens in a breath…": "La porte s'ouvre dans un souffle…",
    "Continue": "Continuer", "Please wait": "Veuillez patienter",
    "your reading": "votre lecture",
    "Personal interpretation": "Interprétation personnelle",
    "A reflection for the path in front of you": "Une réflexion pour le chemin devant vous",
    "A closer reflection": "Une réflexion plus intime",
    "Would you like a personal interpretation?": "Souhaitez-vous une interprétation personnelle ?",
    "Watch a short ad to unlock a reflection based on your exact question and all four cards.": "Regardez une courte publicité pour débloquer une réflexion basée sur votre question exacte et les quatre cartes.",
    "Generate my personal interpretation": "Générer mon interprétation personnelle",
    "Listening to the cards…": "À l'écoute des cartes…",
    "The prototype reading remains available below as a fallback.": "La lecture du prototype reste disponible ci-dessous.",
    "Sweep a little farther so the cards have room to open.": "Balayez un peu plus loin pour que les cartes aient la place de s'ouvrir.",
    "Reading copied.": "Lecture copiée.",
    "Copy is unavailable in this browser.": "La copie est indisponible dans ce navigateur.",
    "Guided interaction mode is on.": "Mode d'interaction guidée activé.",
    "Guided interaction mode is off.": "Mode d'interaction guidée désactivé.",
    "Face-down tarot card": "Carte de tarot face cachée",
    "Select a face-down card": "Choisir une carte face cachée",
    "Move card": "Déplacer la carte",
    "Draw the hidden card from beneath the lifted packet": "Tirer la carte cachée sous le paquet soulevé",
    "Choose where to cut the deck": "Choisir où couper le jeu",
    "Reveal": "Révéler"
  },
  ru: {
    "Settings": "Настройки", "Language": "Язык", "Sound effects": "Звуковые эффекты", "Volume": "Громкость",
    "Card, shuffle, and transition sounds.": "Звуки карт, тасования и переходов.",
    "Controls every card, shuffle, and transition sound.": "Управляет всеми звуками карт, тасования и переходов.",
    "Background music": "Фоновая музыка", "Save settings": "Сохранить настройки", "Selected:": "Выбрано:",
    "A quiet ritual for the heart": "Тихий ритуал для сердца",
    "Enter the<br>celestial book.": "Откройте<br>небесную книгу.",
    "A reading begins with the deck in your hands. The question can wait until you feel its weight.": "Гадание начинается с колоды в ваших руках. Вопрос может подождать, пока вы не почувствуете его вес.",
    "Open the ritual": "Начать ритуал",
    "Choose a path": "Выберите путь", "What calls for your attention?": "Что взывает к вашему вниманию?",
    "Each reading has its own little choreography. Love is ready tonight.": "У каждого гадания своя маленькая хореография. Любовь готова сегодня вечером.",
    "Return to the book": "Вернуться к книге", "begin": "начать", "coming soon": "скоро",
    "Love": "Любовь", "Career": "Карьера", "Money": "Деньги", "Decision": "Решение", "Friendship / Family": "Дружба / Семья", "Personal Growth": "Личностный рост", "General Future": "Будущее в целом",
    "Love ritual": "Ритуал любви",
    "What does your heart wish to understand?": "Что хочет понять ваше сердце?",
    "Give the question enough room to breathe. It does not need to be yes or no.": "Дайте вопросу простор для дыхания. Он не обязан быть на «да» или «нет».",
    "Write here…": "Пишите здесь…",
    "Where is this relationship going?": "Куда движутся эти отношения?",
    "What should I understand about this person?": "Что мне важно понять об этом человеке?",
    "What is blocking my love life?": "Что мешает моей личной жизни?",
    "What energy surrounds this connection?": "Какая энергия окружает эту связь?",
    "Choose another path": "Выбрать другой путь", "Place the question": "Задать вопрос",
    "Loosen the cards beneath your hands.": "Расслабьте карты под ладонями.",
    "Sweep your hand across the loose pile to send a wave through the cards.": "Проведите рукой по рассыпанной стопке, посылая волну сквозь карты.",
    "Cut the deck where it feels right.": "Снимите колоду там, где чувствуете верным.",
    "Use the side view to choose the exact place, then lift there.": "Через вид сбоку выберите точное место и снимите там.",
    "Take the card beneath the lifted pile.": "Возьмите карту под снятой стопкой.",
    "It will remain hidden: the quiet energy beneath your question.": "Она останется скрытой — тихая энергия под вашим вопросом.",
    "Bring the two remaining piles together.": "Соедините две оставшиеся стопки.",
    "Choose which pile belongs on top; both will settle in the center.": "Выберите, какая стопка ляжет сверху; обе сойдутся в центре.",
    "Divide the deck into three.": "Разделите колоду на три части.",
    "Place two markers along the side of the deck.": "Поставьте две метки вдоль края колоды.",
    "Choose the order in which to return the piles.": "Выберите порядок возвращения стопок.",
    "Touch the piles from top to bottom, then watch them come home.": "Коснитесь стопок сверху вниз и смотрите, как они возвращаются.",
    "Let the deck open.": "Позвольте колоде раскрыться.",
    "Open the spread and the cards will fan across the table on their own.": "Раскройте расклад — карты сами веером лягут на стол.",
    "Choose three cards that call to you.": "Выберите три карты, которые вас зовут.",
    "Touch a card to draw it into the reading.": "Коснитесь карты, чтобы взять её в гадание.",
    "Reveal the story in the order you wish.": "Открывайте историю в желаемом порядке.",
    "The first turn opens a brief doorway. The others are uninterrupted.": "Первый переворот открывает короткую дверь. Остальные — без остановок.",
    "Gather into a deck": "Собрать в колоду", "Send a wave for me": "Пустить волну за меня",
    "Lift at this point": "Снять в этом месте", "Draw the hidden card": "Взять скрытую карту",
    "Stack with this pile on top": "Сложить этой стопкой сверху", "Place first cut": "Поставить первый срез", "Make three piles": "Сделать три стопки",
    "Stack in this order": "Сложить в этом порядке", "Open the spread": "Раскрыть расклад", "Place the four cards": "Разложить четыре карты", "Gather the reading": "Собрать гадание",
    "Hidden Heart": "Скрытое сердце", "You": "Вы", "The Connection": "Связь", "The Path Ahead": "Путь впереди",
    "Reversed": "Перевёрнутая", "Upright": "Прямая",
    "Four cards, gathered beneath one sky.": "Четыре карты под одним небом.",
    "Tarot is offered here as a reflective, imaginative tool—not a factual prediction or professional advice.": "Таро предлагается здесь как инструмент размышления и воображения — не как фактическое предсказание или профессиональный совет.",
    "Begin a new reading": "Начать новое гадание", "Copy the reading": "Скопировать гадание",
    "Share the reading": "Поделиться гаданием", "Share as an image": "Поделиться как изображением",
    "New reading": "Новое гадание", "Share": "Поделиться", "Reading actions": "Действия с гаданием",
    "Sweep across the loose cards to send a wave through the pile.": "Проведите по разложенным картам, чтобы послать волну по стопке.",
    "Drag through the cards—a wave ripples across the pile": "Проведите по картам — волна пройдёт по стопке",
    "physical moves · keep mixing or gather them": "физических движений · продолжайте мешать или соберите их",
    "The cards feel mixed. Gather them when you are ready.": "Карты перемешаны. Соберите их, когда будете готовы.",
    "more moves will loosen the order.": "движений ещё — и порядок разомкнётся.",
    "Side view · slide the brass marker up and down between the card edges": "Вид сбоку · двигайте латунную метку вверх и вниз между срезами карт",
    "a light upper packet": "лёгкая верхняя стопка",
    "a deep upper packet": "плотная верхняя стопка",
    "a balanced division": "ровное разделение",
    "The deck is shown from the side so every possible cut is reachable.": "Колода показана сбоку, чтобы любой срез был доступен.",
    "Move the marker, then lift the deck at that exact place.": "Двигайте метку, затем снимите колоду точно в этом месте.",
    "lifted packet": "снятая стопка", "resting packet": "оставшаяся стопка", "pile": "стопка", "cards": "карт",
    "one card waits here": "здесь ждёт одна карта",
    "The card directly beneath the lifted packet becomes the Hidden Heart.": "Карта прямо под снятой стопкой становится Скрытым сердцем.",
    "Tap the pile you want on top. Both piles will meet in the center.": "Коснитесь стопки, которая ляжет сверху. Обе стопки сойдутся в центре.",
    "Place the first marker": "Поставьте первую метку",
    "First marker set · choose a different place for the second": "Первая метка стоит · выберите другое место для второй",
    "Choose the first break in the side of the deck.": "Выберите первый разрыв на срезе колоды.",
    "Choose the second break. The two markers will form three piles.": "Выберите второй разрыв. Две метки образуют три стопки.",
    "of 3 chosen · numbers show the top-to-bottom order": "из 3 выбрано · номера показывают порядок сверху вниз",
    "Tap the pile that should return first (on top).": "Коснитесь стопки, которая вернётся первой (сверху).",
    "One touch fans every card into a reading arc": "Одно касание раскладывает все карты веером",
    "Open the spread and the cards fan across the table.": "Раскройте расклад — карты веером лягут на стол.",
    "Drawn": "Вытянуто",
    "Tap any face-down card. It will travel into the center tray.": "Коснитесь любой карты рубашкой вверх. Она переместится в центральный лоток.",
    "card has moved into the center tray.": "карта переместилась в центральный лоток.",
    "cards have moved into the center tray.": "карты переместились в центральный лоток.",
    "The reading is ready to be gathered.": "Гадание готово к сбору.",
    "There is no required order.": "Порядок не имеет значения.",
    "A quiet pause before the closer reading": "Тихая пауза перед подробным гаданием",
    "A small doorway in the ritual": "Маленькая дверь в ритуале",
    "Mock sponsored moment": "Демо-реклама",
    "The sky keeps<br>its own counsel.": "Небо хранит<br>свой совет.",
    "This placeholder is deliberately separate from the ritual so an advertising provider can be exchanged later.": "Эта заглушка намеренно отделена от ритуала, чтобы рекламного провайдера можно было заменить позже.",
    "You may continue": "Можно продолжить",
    "The door opens in a breath…": "Дверь откроется через мгновение…",
    "Continue": "Продолжить", "Please wait": "Пожалуйста, подождите",
    "your reading": "ваше гадание",
    "Personal interpretation": "Личное толкование",
    "A reflection for the path in front of you": "Размышление о пути впереди",
    "A closer reflection": "Более глубокое размышление",
    "Would you like a personal interpretation?": "Хотите личное толкование?",
    "Watch a short ad to unlock a reflection based on your exact question and all four cards.": "Посмотрите короткую рекламу, чтобы открыть размышление по вашему вопросу и всем четырём картам.",
    "Generate my personal interpretation": "Создать моё личное толкование",
    "Listening to the cards…": "Слушаем карты…",
    "The prototype reading remains available below as a fallback.": "Демо-гадание ниже остаётся доступным.",
    "Sweep a little farther so the cards have room to open.": "Проведите чуть дальше, чтобы картам хватило места раскрыться.",
    "Reading copied.": "Гадание скопировано.",
    "Copy is unavailable in this browser.": "Копирование недоступно в этом браузере.",
    "Guided interaction mode is on.": "Режим управляемого взаимодействия включён.",
    "Guided interaction mode is off.": "Режим управляемого взаимодействия выключен.",
    "Face-down tarot card": "Карта таро рубашкой вверх",
    "Select a face-down card": "Выбрать карту рубашкой вверх",
    "Move card": "Переместить карту",
    "Draw the hidden card from beneath the lifted packet": "Взять скрытую карту под снятой стопкой",
    "Choose where to cut the deck": "Выбрать место среза колоды",
    "Reveal": "Открыть"
  },
  zh: {
    "Settings": "设置", "Language": "语言", "Sound effects": "音效", "Volume": "音量",
    "Card, shuffle, and transition sounds.": "卡牌、洗牌与过渡音效。",
    "Controls every card, shuffle, and transition sound.": "控制所有卡牌、洗牌与过渡音效。",
    "Background music": "背景音乐", "Save settings": "保存设置", "Selected:": "已选择：",
    "A quiet ritual for the heart": "献给心灵的静谧仪式",
    "Enter the<br>celestial book.": "翻开<br>星空之书",
    "A reading begins with the deck in your hands. The question can wait until you feel its weight.": "解读始于你手中的牌。问题可以等到你感受到它的分量时再提。",
    "Open the ritual": "开启仪式",
    "Choose a path": "选择一条道路", "What calls for your attention?": "什么在呼唤你的关注？",
    "Each reading has its own little choreography. Love is ready tonight.": "每一次解读都有属于自己的小小编排。今夜，爱已就绪。",
    "Return to the book": "返回书本", "begin": "开始", "coming soon": "敬请期待",
    "Love": "爱情", "Career": "事业", "Money": "财富", "Decision": "抉择", "Friendship / Family": "友情 / 家庭", "Personal Growth": "个人成长", "General Future": "综合运势",
    "Love ritual": "爱情仪式",
    "What does your heart wish to understand?": "你的心想要理解什么？",
    "Give the question enough room to breathe. It does not need to be yes or no.": "给问题足够的呼吸空间。它不必是「是」或「否」。",
    "Write here…": "在此书写…",
    "Where is this relationship going?": "这段关系将走向何方？",
    "What should I understand about this person?": "关于这个人，我该理解什么？",
    "What is blocking my love life?": "是什么在阻碍我的爱情？",
    "What energy surrounds this connection?": "什么样的能量围绕着这段联系？",
    "Choose another path": "选择另一条道路", "Place the question": "落定问题",
    "Loosen the cards beneath your hands.": "在指尖下松开这些牌。",
    "Sweep your hand across the loose pile to send a wave through the cards.": "用手扫过散开的牌堆，让一道波浪穿过牌阵。",
    "Cut the deck where it feels right.": "在你觉得合适的地方切牌。",
    "Use the side view to choose the exact place, then lift there.": "借助侧视图选择确切的位置，然后在那里抬起。",
    "Take the card beneath the lifted pile.": "取出被抬起牌堆下方的那张牌。",
    "It will remain hidden: the quiet energy beneath your question.": "它将保持隐藏：你问题之下那股静谧的能量。",
    "Bring the two remaining piles together.": "将剩下的两堆合在一起。",
    "Choose which pile belongs on top; both will settle in the center.": "选择哪一堆置于上方；两堆都会归拢到中央。",
    "Divide the deck into three.": "将牌分成三堆。",
    "Place two markers along the side of the deck.": "在牌堆侧面放置两个标记。",
    "Choose the order in which to return the piles.": "选择将各堆归位的顺序。",
    "Touch the piles from top to bottom, then watch them come home.": "由上至下依次触碰各堆，看它们归位。",
    "Let the deck open.": "让牌阵展开。",
    "Open the spread and the cards will fan across the table on their own.": "开启牌阵，牌会自行在桌面上铺成扇形。",
    "Choose three cards that call to you.": "选择三张呼唤你的牌。",
    "Touch a card to draw it into the reading.": "触碰一张牌，将它带入解读。",
    "Reveal the story in the order you wish.": "以你想要的顺序揭示这个故事。",
    "The first turn opens a brief doorway. The others are uninterrupted.": "第一次翻牌会开启一道短暂的门，其余的则一气呵成。",
    "Gather into a deck": "聚拢成一副牌", "Send a wave for me": "替我送出一道波浪",
    "Lift at this point": "在此处抬起", "Draw the hidden card": "抽出隐藏之牌",
    "Stack with this pile on top": "以此堆置顶叠放", "Place first cut": "放下第一道切口", "Make three piles": "形成三堆",
    "Stack in this order": "按此顺序叠放", "Open the spread": "开启牌阵", "Place the four cards": "落定这四张牌", "Gather the reading": "汇集这次解读",
    "Hidden Heart": "隐秘之心", "You": "你", "The Connection": "这段联系", "The Path Ahead": "前方之路",
    "Reversed": "逆位", "Upright": "正位",
    "Four cards, gathered beneath one sky.": "四张牌，共聚于同一片天空之下。",
    "Tarot is offered here as a reflective, imaginative tool—not a factual prediction or professional advice.": "此处的塔罗是一种用于反思与想象的工具——并非事实预测或专业建议。",
    "Begin a new reading": "开始新的解读", "Copy the reading": "复制解读",
    "Share the reading": "分享解读", "Share as an image": "分享为图片",
    "New reading": "新的解读", "Share": "分享", "Reading actions": "解读操作",
    "Sweep across the loose cards to send a wave through the pile.": "扫过散开的牌，让一道波浪穿过牌堆。",
    "Drag through the cards—a wave ripples across the pile": "拖过牌面——涟漪将荡过整堆牌",
    "physical moves · keep mixing or gather them": "次实际移动 · 继续混合或将它们聚拢",
    "The cards feel mixed. Gather them when you are ready.": "牌已经洗匀。准备好后就将它们聚拢。",
    "more moves will loosen the order.": "次移动即可松动牌序。",
    "Side view · slide the brass marker up and down between the card edges": "侧视图 · 在牌缘之间上下滑动黄铜标记",
    "a light upper packet": "较薄的上方牌叠",
    "a deep upper packet": "较厚的上方牌叠",
    "a balanced division": "均衡的划分",
    "The deck is shown from the side so every possible cut is reachable.": "牌组以侧面展示，以便触及每个可能的切口。",
    "Move the marker, then lift the deck at that exact place.": "移动标记，然后在该位置准确抬起牌组。",
    "lifted packet": "被抬起的牌叠", "resting packet": "静置的牌叠", "pile": "牌堆", "cards": "张牌",
    "one card waits here": "一张牌在此等候",
    "The card directly beneath the lifted packet becomes the Hidden Heart.": "被抬起牌叠正下方的那张牌将成为隐秘之心。",
    "Tap the pile you want on top. Both piles will meet in the center.": "点选你想置于上方的牌堆。两堆将在中央汇合。",
    "Place the first marker": "放置第一个标记",
    "First marker set · choose a different place for the second": "第一个标记已就位 · 请为第二个选择不同的位置",
    "Choose the first break in the side of the deck.": "在牌组侧面选择第一个断口。",
    "Choose the second break. The two markers will form three piles.": "选择第二个断口。两个标记将形成三堆。",
    "of 3 chosen · numbers show the top-to-bottom order": "/3 已选 · 数字显示自上而下的顺序",
    "Tap the pile that should return first (on top).": "点选应最先归位（置于顶部）的牌堆。",
    "One touch fans every card into a reading arc": "一次触碰即可将所有牌展成解读弧",
    "Open the spread and the cards fan across the table.": "开启牌阵，牌将在桌面上扇形铺开。",
    "Drawn": "已抽",
    "Tap any face-down card. It will travel into the center tray.": "点选任意一张面朝下的牌。它将移入中央牌托。",
    "card has moved into the center tray.": "张牌已移入中央牌托。",
    "cards have moved into the center tray.": "张牌已移入中央牌托。",
    "The reading is ready to be gathered.": "解读已就绪，可以汇集。",
    "There is no required order.": "没有规定的顺序。",
    "A quiet pause before the closer reading": "深入解读前的片刻宁静",
    "A small doorway in the ritual": "仪式中的一扇小门",
    "Mock sponsored moment": "模拟赞助时刻",
    "The sky keeps<br>its own counsel.": "天空自有<br>其主张。",
    "This placeholder is deliberately separate from the ritual so an advertising provider can be exchanged later.": "此占位内容刻意与仪式分离，以便日后替换广告提供商。",
    "You may continue": "可以继续了",
    "The door opens in a breath…": "门扉将在一次呼吸间开启…",
    "Continue": "继续", "Please wait": "请稍候",
    "your reading": "你的解读",
    "Personal interpretation": "个人解读",
    "A reflection for the path in front of you": "为你脚下之路的一次映照",
    "A closer reflection": "更贴近的映照",
    "Would you like a personal interpretation?": "你想要一份个人解读吗？",
    "Watch a short ad to unlock a reflection based on your exact question and all four cards.": "观看一个简短广告，解锁基于你的问题与全部四张牌的映照。",
    "Generate my personal interpretation": "生成我的个人解读",
    "Listening to the cards…": "正在聆听牌意…",
    "The prototype reading remains available below as a fallback.": "下方仍提供原型解读作为备选。",
    "Sweep a little farther so the cards have room to open.": "再扫远一点，让牌有空间展开。",
    "Reading copied.": "解读已复制。",
    "Copy is unavailable in this browser.": "此浏览器无法复制。",
    "Guided interaction mode is on.": "引导交互模式已开启。",
    "Guided interaction mode is off.": "引导交互模式已关闭。",
    "Face-down tarot card": "面朝下的塔罗牌",
    "Select a face-down card": "选择一张面朝下的牌",
    "Move card": "移动牌",
    "Draw the hidden card from beneath the lifted packet": "从被抬起的牌叠下方抽出隐藏之牌",
    "Choose where to cut the deck": "选择切牌的位置",
    "Reveal": "揭示"
  }
};

// Career has its own five-card ritual. Keeping its vocabulary grouped here makes
// the new path complete in every language without disturbing the established Love copy.
Object.assign(I18N.fr, {
  "Two paths are ready tonight. Career opens after a brief sponsored passage.": "Deux voies sont prêtes ce soir. La Carrière s’ouvre après un bref passage sponsorisé.",
  "watch to enter": "regarder pour entrer",
  "Career Compass": "Boussole de carrière",
  "What part of your working life is asking to move?": "Quelle part de votre vie professionnelle demande à évoluer ?",
  "Name the tension, opportunity, or direction you want to explore. Open questions leave room for a useful reflection.": "Nommez la tension, l’occasion ou la direction à explorer. Une question ouverte laisse place à une réflexion utile.",
  "What strength am I ready to be known for?": "Pour quelle force suis-je prêt·e à être reconnu·e ?",
  "What is keeping me from my next career chapter?": "Qu’est-ce qui me retient avant mon prochain chapitre professionnel ?",
  "Where should I focus my energy at work?": "Où devrais-je concentrer mon énergie au travail ?",
  "What opportunity am I not seeing yet?": "Quelle occasion ne vois-je pas encore ?",
  "Enter the Career ritual": "Entrer dans le rituel de carrière",
  "Career ritual": "Rituel de carrière",
  "Wake the embers in your deck.": "Réveillez les braises de votre jeu.",
  "Touch three cards that feel alive. They will become the sparks beneath your path.": "Touchez trois cartes qui semblent vivantes. Elles deviendront les étincelles sous votre chemin.",
  "Set the direction of your ambition.": "Donnez une direction à votre ambition.",
  "Turn the brass compass toward the quality your next chapter needs.": "Tournez la boussole de laiton vers la qualité dont votre prochain chapitre a besoin.",
  "Build your constellation ladder.": "Construisez votre échelle de constellation.",
  "At every rung, choose the stepping-stone that feels like yours.": "À chaque barreau, choisissez la pierre qui vous ressemble.",
  "Turn over the path you have built.": "Retournez le chemin que vous avez construit.",
  "Five cards now hold the arc from where you stand to your next bold move.": "Cinq cartes dessinent l’arc entre votre position actuelle et votre prochain geste audacieux.",
  "embers awake": "braises éveillées", "Touch any three cards. There is no wrong constellation.": "Touchez trois cartes. Il n’existe pas de mauvaise constellation.",
  "Raise the constellation": "Élever la constellation", "Mastery": "Maîtrise", "Visibility": "Visibilité", "Security": "Stabilité", "Reinvention": "Réinvention",
  "Your compass points toward": "Votre boussole pointe vers", "Seal this direction": "Sceller cette direction",
  "Choose one of the two stepping-stones.": "Choisissez l’une des deux pierres.", "Your path is complete. The skyline is ready.": "Votre chemin est complet. L’horizon est prêt.",
  "Read the skyline": "Lire l’horizon", "Five cards, a constellation for the work ahead.": "Cinq cartes, une constellation pour le travail à venir.",
  "Current Ground": "Terrain actuel", "Your Unclaimed Strength": "Votre force inexploitée", "The Friction": "La friction", "Your Leverage": "Votre levier", "The Next Bold Move": "Le prochain geste audacieux",
  "A short passage before the Career ritual": "Un bref passage avant le rituel de carrière", "The next horizon<br>is taking shape.": "Le prochain horizon<br>prend forme.",
  "Unlock the Career path": "Ouvrir la voie Carrière", "Watch this brief sponsored moment to open the Career ritual.": "Regardez ce bref moment sponsorisé pour ouvrir le rituel de carrière.",
  "Sweep across the table—these cards scatter apart instead of gathering.": "Balayez la table : ces cartes se dispersent au lieu de se rassembler.",
  "Drag through the cards—they push each other apart": "Glissez à travers les cartes : elles s’écartent les unes des autres",
  "sweeps · keep scattering or lay them out": "balayages · continuez à disperser ou étalez-les",
  "The cards lie apart. Lay them out when you are ready.": "Les cartes sont bien séparées. Étalez-les quand vous êtes prêt·e.",
  "more sweeps will scatter the deck.": "balayages de plus disperseront le jeu.",
  "Scatter them for me": "Disperser pour moi", "Lay them out to choose": "Les étaler pour choisir", "Scatter them again": "Les disperser à nouveau",
  "Keep these three and gather the rest": "Garder ces trois cartes et rassembler le reste",
  "Cut the gathered deck into two.": "Coupez en deux le jeu rassemblé.", "Choose where the two remaining paths separate.": "Choisissez où les deux chemins restants se séparent.",
  "Open the first pile.": "Ouvrez la première pile.", "Spread the first half and let one card become Your Leverage.": "Étalez la première moitié et laissez une carte devenir Votre levier.",
  "Choose one card from the first spread.": "Choisissez une carte dans le premier éventail.", "This card will become Your Leverage.": "Cette carte deviendra Votre levier.",
  "Open the second pile.": "Ouvrez la deuxième pile.", "Spread the second half and let one card become The Next Bold Move.": "Étalez la seconde moitié et laissez une carte devenir Le prochain geste audacieux.",
  "Choose one card from the second spread.": "Choisissez une carte dans le second éventail.", "This card will become The Next Bold Move.": "Cette carte deviendra Le prochain geste audacieux.",
  "Your three chosen cards are held aside. Cut the gathered deck into two.": "Vos trois cartes choisies restent de côté. Coupez le jeu rassemblé en deux.",
  "Move the marker, then divide the gathered deck into two piles.": "Déplacez le repère, puis divisez le jeu rassemblé en deux piles.", "Make two piles": "Former deux piles",
  "One card has joined your constellation.": "Une carte a rejoint votre constellation.", "Choose one face-down card from this spread.": "Choisissez une carte face cachée dans cet éventail.",
  "Continue to the second pile": "Continuer vers la deuxième pile", "Reveal the constellation": "Révéler la constellation", "The pile opens directly into a spread.": "La pile s’ouvre directement en éventail.",
  "Watch a short ad to unlock a reflection based on your exact question and all five cards.": "Regardez une courte publicité pour débloquer une réflexion basée sur votre question exacte et les cinq cartes."
});
Object.assign(I18N.ru, {
  "Two paths are ready tonight. Career opens after a brief sponsored passage.": "Сегодня готовы два пути. Карьера откроется после короткой рекламной паузы.",
  "watch to enter": "посмотреть и войти", "Career Compass": "Карьерный компас",
  "What part of your working life is asking to move?": "Какая часть вашей рабочей жизни просит перемен?",
  "Name the tension, opportunity, or direction you want to explore. Open questions leave room for a useful reflection.": "Назовите напряжение, возможность или направление, которое хотите исследовать. Открытый вопрос оставит место для полезного размышления.",
  "What strength am I ready to be known for?": "Какой сильной стороной я готов(а) стать известен(на)?",
  "What is keeping me from my next career chapter?": "Что удерживает меня от следующей главы карьеры?",
  "Where should I focus my energy at work?": "На чём мне сосредоточить энергию в работе?",
  "What opportunity am I not seeing yet?": "Какую возможность я пока не замечаю?",
  "Enter the Career ritual": "Войти в карьерный ритуал", "Career ritual": "Карьерный ритуал",
  "Wake the embers in your deck.": "Разбудите угли в колоде.", "Touch three cards that feel alive. They will become the sparks beneath your path.": "Коснитесь трёх живых карт. Они станут искрами под вашим путём.",
  "Set the direction of your ambition.": "Задайте направление амбиции.", "Turn the brass compass toward the quality your next chapter needs.": "Поверните латунный компас к качеству, нужному вашей следующей главе.",
  "Build your constellation ladder.": "Постройте лестницу созвездия.", "At every rung, choose the stepping-stone that feels like yours.": "На каждой ступени выберите камень, который кажется вашим.",
  "Turn over the path you have built.": "Откройте построенный вами путь.", "Five cards now hold the arc from where you stand to your next bold move.": "Пять карт держат дугу от вашей нынешней точки до следующего смелого шага.",
  "embers awake": "угля пробуждены", "Touch any three cards. There is no wrong constellation.": "Коснитесь любых трёх карт. Неверного созвездия нет.",
  "Raise the constellation": "Поднять созвездие", "Mastery": "Мастерство", "Visibility": "Заметность", "Security": "Устойчивость", "Reinvention": "Обновление",
  "Your compass points toward": "Ваш компас указывает на", "Seal this direction": "Закрепить направление",
  "Choose one of the two stepping-stones.": "Выберите один из двух камней.", "Your path is complete. The skyline is ready.": "Ваш путь завершён. Горизонт готов.",
  "Read the skyline": "Прочесть горизонт", "Five cards, a constellation for the work ahead.": "Пять карт — созвездие для предстоящей работы.",
  "Current Ground": "Текущая опора", "Your Unclaimed Strength": "Ваша неприсвоенная сила", "The Friction": "Сопротивление", "Your Leverage": "Ваш рычаг", "The Next Bold Move": "Следующий смелый шаг",
  "A short passage before the Career ritual": "Короткий переход перед карьерным ритуалом", "The next horizon<br>is taking shape.": "Новый горизонт<br>обретает форму.",
  "Unlock the Career path": "Открыть путь Карьеры", "Watch this brief sponsored moment to open the Career ritual.": "Посмотрите эту короткую рекламную паузу, чтобы открыть карьерный ритуал.",
  "Sweep across the table—these cards scatter apart instead of gathering.": "Проведите рукой по столу — эти карты разлетаются в стороны, а не собираются вместе.",
  "Drag through the cards—they push each other apart": "Проведите сквозь карты — они расталкивают друг друга",
  "sweeps · keep scattering or lay them out": "движений · продолжайте разбрасывать или разложите их",
  "The cards lie apart. Lay them out when you are ready.": "Карты лежат врозь. Разложите их, когда будете готовы.",
  "more sweeps will scatter the deck.": "движений ещё разбросают колоду.",
  "Scatter them for me": "Разбросать за меня", "Lay them out to choose": "Разложить для выбора", "Scatter them again": "Разбросать заново",
  "Keep these three and gather the rest": "Оставить эти три и собрать остальные",
  "Cut the gathered deck into two.": "Разрежьте собранную колоду на две части.", "Choose where the two remaining paths separate.": "Выберите место, где разделятся два оставшихся пути.",
  "Open the first pile.": "Откройте первую стопку.", "Spread the first half and let one card become Your Leverage.": "Разложите первую половину и позвольте одной карте стать Вашим рычагом.",
  "Choose one card from the first spread.": "Выберите одну карту из первого расклада.", "This card will become Your Leverage.": "Эта карта станет Вашим рычагом.",
  "Open the second pile.": "Откройте вторую стопку.", "Spread the second half and let one card become The Next Bold Move.": "Разложите вторую половину и позвольте одной карте стать Следующим смелым шагом.",
  "Choose one card from the second spread.": "Выберите одну карту из второго расклада.", "This card will become The Next Bold Move.": "Эта карта станет Следующим смелым шагом.",
  "Your three chosen cards are held aside. Cut the gathered deck into two.": "Три выбранные карты отложены. Разрежьте собранную колоду на две части.",
  "Move the marker, then divide the gathered deck into two piles.": "Передвиньте маркер, затем разделите собранную колоду на две стопки.", "Make two piles": "Сделать две стопки",
  "One card has joined your constellation.": "Одна карта присоединилась к вашему созвездию.", "Choose one face-down card from this spread.": "Выберите одну закрытую карту из этого расклада.",
  "Continue to the second pile": "Перейти ко второй стопке", "Reveal the constellation": "Открыть созвездие", "The pile opens directly into a spread.": "Стопка сразу раскрывается в расклад.",
  "Watch a short ad to unlock a reflection based on your exact question and all five cards.": "Посмотрите короткую рекламу, чтобы открыть размышление по вашему вопросу и всем пяти картам."
});
Object.assign(I18N.zh, {
  "Two paths are ready tonight. Career opens after a brief sponsored passage.": "今夜已有两条路径准备就绪。职业主题将在一段简短赞助内容后开启。",
  "watch to enter": "观看后进入", "Career Compass": "职业罗盘",
  "What part of your working life is asking to move?": "你的职业生活中，哪一部分正在呼唤改变？",
  "Name the tension, opportunity, or direction you want to explore. Open questions leave room for a useful reflection.": "写下你想探索的张力、机会或方向。开放式问题会为有益的映照留出空间。",
  "What strength am I ready to be known for?": "我已准备好因哪种优势而被看见？",
  "What is keeping me from my next career chapter?": "是什么阻挡我进入职业生涯的下一章？",
  "Where should I focus my energy at work?": "我应该把工作精力集中在哪里？",
  "What opportunity am I not seeing yet?": "还有什么机会是我尚未看见的？",
  "Enter the Career ritual": "进入职业仪式", "Career ritual": "职业仪式",
  "Wake the embers in your deck.": "唤醒牌组中的余烬。", "Touch three cards that feel alive. They will become the sparks beneath your path.": "触碰三张充满生命力的牌。它们将成为道路下方的火花。",
  "Set the direction of your ambition.": "为你的抱负设定方向。", "Turn the brass compass toward the quality your next chapter needs.": "将黄铜罗盘转向下一章最需要的品质。",
  "Build your constellation ladder.": "搭建你的星座阶梯。", "At every rung, choose the stepping-stone that feels like yours.": "在每一级，选择最像属于你的那块踏脚石。",
  "Turn over the path you have built.": "翻开你亲手搭建的道路。", "Five cards now hold the arc from where you stand to your next bold move.": "五张牌连接你此刻的立足点与下一个大胆行动。",
  "embers awake": "枚余烬已唤醒", "Touch any three cards. There is no wrong constellation.": "触碰任意三张牌。没有错误的星座。",
  "Raise the constellation": "升起星座", "Mastery": "精进", "Visibility": "被看见", "Security": "稳定", "Reinvention": "重塑",
  "Your compass points toward": "你的罗盘指向", "Seal this direction": "封印这个方向",
  "Choose one of the two stepping-stones.": "从两块踏脚石中选择一块。", "Your path is complete. The skyline is ready.": "你的道路已经完成。天际线正等待解读。",
  "Read the skyline": "解读天际线", "Five cards, a constellation for the work ahead.": "五张牌，为前方事业连成一座星座。",
  "Current Ground": "当下立足点", "Your Unclaimed Strength": "尚未认领的力量", "The Friction": "阻力", "Your Leverage": "你的杠杆", "The Next Bold Move": "下一个大胆行动",
  "A short passage before the Career ritual": "进入职业仪式前的短暂通道", "The next horizon<br>is taking shape.": "下一片地平线<br>正在成形。",
  "Unlock the Career path": "解锁职业路径", "Watch this brief sponsored moment to open the Career ritual.": "观看这段简短赞助内容，即可开启职业仪式。",
  "Sweep across the table—these cards scatter apart instead of gathering.": "在桌面上划过——这些牌会彼此散开，而不是聚拢。",
  "Drag through the cards—they push each other apart": "从牌间划过——它们会互相推开",
  "sweeps · keep scattering or lay them out": "次划动 · 继续散牌或摊开它们",
  "The cards lie apart. Lay them out when you are ready.": "牌已散开。准备好后就摊开它们。",
  "more sweeps will scatter the deck.": "次划动后牌阵便会散开。",
  "Scatter them for me": "替我散牌", "Lay them out to choose": "摊开以供挑选", "Scatter them again": "重新散牌",
  "Keep these three and gather the rest": "保留这三张，并收拢其余牌",
  "Cut the gathered deck into two.": "将收拢后的牌组切成两半。", "Choose where the two remaining paths separate.": "选择两条余下道路分开的地方。",
  "Open the first pile.": "展开第一叠牌。", "Spread the first half and let one card become Your Leverage.": "摊开第一半，让其中一张成为你的杠杆。",
  "Choose one card from the first spread.": "从第一组摊牌中选择一张。", "This card will become Your Leverage.": "这张牌将成为你的杠杆。",
  "Open the second pile.": "展开第二叠牌。", "Spread the second half and let one card become The Next Bold Move.": "摊开第二半，让其中一张成为下一个大胆行动。",
  "Choose one card from the second spread.": "从第二组摊牌中选择一张。", "This card will become The Next Bold Move.": "这张牌将成为下一个大胆行动。",
  "Your three chosen cards are held aside. Cut the gathered deck into two.": "你选中的三张牌已放在一旁。将收拢后的牌组切成两半。",
  "Move the marker, then divide the gathered deck into two piles.": "移动标记，然后将收拢后的牌组分成两叠。", "Make two piles": "分成两叠",
  "One card has joined your constellation.": "一张牌已加入你的星座。", "Choose one face-down card from this spread.": "从这组摊牌中选择一张背面朝上的牌。",
  "Continue to the second pile": "继续前往第二叠", "Reveal the constellation": "揭示星座", "The pile opens directly into a spread.": "这叠牌会直接展开。",
  "Watch a short ad to unlock a reflection based on your exact question and all five cards.": "观看一个简短广告，解锁基于你的问题与全部五张牌的映照。"
});

// Money now shuffles, cuts into three piles, orders them, and spreads each pile in turn
// for one card apiece — the same gesture vocabulary as Love, applied to three piles kept
// separate instead of one deck.
Object.assign(I18N.fr, {
  "Three paths are ready tonight. Career and Money open after a brief sponsored passage.": "Trois voies sont prêtes ce soir. Carrière et Argent s’ouvrent après un bref passage sponsorisé.",
  "Money Ledger": "Registre d’argent", "Money ritual": "Rituel de l’argent",
  "What part of your money life needs a clearer current?": "Quelle part de votre vie financière a besoin d’un courant plus clair ?",
  "Name the choice, pressure, or possibility you want to understand. Keep the question open enough for a useful reflection.": "Nommez le choix, la pression ou la possibilité à comprendre. Gardez la question assez ouverte pour une réflexion utile.",
  "What is my money asking me to understand?": "Que cherche mon argent à me faire comprendre ?",
  "What should I protect before I try to grow?": "Que dois-je protéger avant de chercher à grandir ?",
  "Where is value leaking from my life?": "Où la valeur s’échappe-t-elle de ma vie ?",
  "What resource am I not using fully?": "Quelle ressource n’utilisé-je pas pleinement ?",
  "Enter the Money ritual": "Entrer dans le rituel de l’argent",
  "Choose the order of the three piles.": "Choisissez l’ordre des trois paquets.", "Touch the piles left to right, in the order you want them to sit on the table.": "Touchez les paquets de gauche à droite, dans l’ordre où vous les voulez sur la table.",
  "Let this pile open.": "Laissez ce paquet s’ouvrir.", "Choose the card that calls to you.": "Choisissez la carte qui vous appelle.",
  "Turn over the three cards you chose.": "Retournez les trois cartes que vous avez choisies.", "Each pile gave you exactly one card, in the order you set: Keep, Grow, and Flow.": "Chaque paquet vous a donné exactement une carte, dans l’ordre que vous avez fixé : Garder, Grandir et Circuler.",
  "of 3 chosen · numbers show the left-to-right order": "sur 3 choisis · les numéros indiquent l’ordre de gauche à droite",
  "Tap the pile that should sit first, on the left.": "Touchez le paquet qui doit se trouver en premier, à gauche.", "Set this order": "Fixer cet ordre",
  "Tap any face-down card from this pile.": "Touchez n’importe quelle carte face cachée de ce paquet.", "One card has moved into the center.": "Une carte s’est déplacée vers le centre.",
  "Take this card": "Prendre cette carte",
  "Open the treasury": "Ouvrir le trésor", "Three cards, a living ledger for your resources.": "Trois cartes, un registre vivant pour vos ressources.",
  "What to Keep": "Ce qu’il faut garder", "What to Grow": "Ce qu’il faut faire grandir", "What to Let Flow": "Ce qu’il faut laisser circuler",
  "Keep": "Garder", "Grow": "Grandir", "Flow": "Circuler",
  "Unlock the Money path": "Ouvrir la voie Argent", "A short passage before the Money ritual": "Un bref passage avant le rituel de l’argent",
  "The treasury<br>is taking shape.": "Le trésor<br>prend forme.", "Watch this brief sponsored moment to open the Money ritual.": "Regardez ce bref moment sponsorisé pour ouvrir le rituel de l’argent."
});
Object.assign(I18N.ru, {
  "Three paths are ready tonight. Career and Money open after a brief sponsored passage.": "Сегодня готовы три пути. Карьера и Деньги откроются после короткой рекламной паузы.",
  "Money Ledger": "Денежная книга", "Money ritual": "Денежный ритуал",
  "What part of your money life needs a clearer current?": "Какой части вашей денежной жизни нужен более ясный поток?",
  "Name the choice, pressure, or possibility you want to understand. Keep the question open enough for a useful reflection.": "Назовите выбор, давление или возможность, которые хотите понять. Оставьте вопрос достаточно открытым для полезного размышления.",
  "What is my money asking me to understand?": "Что мои деньги просят меня понять?", "What should I protect before I try to grow?": "Что мне стоит защитить, прежде чем расти?",
  "Where is value leaking from my life?": "Где ценность утекает из моей жизни?", "What resource am I not using fully?": "Какой ресурс я использую не полностью?",
  "Enter the Money ritual": "Войти в денежный ритуал",
  "Choose the order of the three piles.": "Выберите порядок трёх стопок.", "Touch the piles left to right, in the order you want them to sit on the table.": "Коснитесь стопок слева направо, в том порядке, в котором они должны лечь на стол.",
  "Let this pile open.": "Дайте этой стопке раскрыться.", "Choose the card that calls to you.": "Выберите карту, которая зовёт вас.",
  "Turn over the three cards you chose.": "Переверните три выбранные вами карты.", "Each pile gave you exactly one card, in the order you set: Keep, Grow, and Flow.": "Каждая стопка отдала вам ровно одну карту, в заданном вами порядке: Сохранить, Вырастить и Отпустить.",
  "of 3 chosen · numbers show the left-to-right order": "из 3 выбрано · номера показывают порядок слева направо",
  "Tap the pile that should sit first, on the left.": "Коснитесь стопки, которая должна оказаться первой, слева.", "Set this order": "Задать этот порядок",
  "Tap any face-down card from this pile.": "Коснитесь любой карты рубашкой вверх из этой стопки.", "One card has moved into the center.": "Одна карта переместилась в центр.",
  "Take this card": "Взять эту карту",
  "Open the treasury": "Открыть сокровищницу", "Three cards, a living ledger for your resources.": "Три карты — живая книга ваших ресурсов.",
  "What to Keep": "Что сохранить", "What to Grow": "Что вырастить", "What to Let Flow": "Что отпустить",
  "Keep": "Сохранить", "Grow": "Вырастить", "Flow": "Отпустить",
  "Unlock the Money path": "Открыть путь Денег", "A short passage before the Money ritual": "Короткий переход перед денежным ритуалом",
  "The treasury<br>is taking shape.": "Сокровищница<br>обретает форму.", "Watch this brief sponsored moment to open the Money ritual.": "Посмотрите этот короткий рекламный момент, чтобы открыть денежный ритуал."
});
Object.assign(I18N.zh, {
  "Three paths are ready tonight. Career and Money open after a brief sponsored passage.": "今夜已有三条路径准备就绪。事业与财富将在一段简短赞助内容后开启。",
  "Money Ledger": "财富账簿", "Money ritual": "财富仪式",
  "What part of your money life needs a clearer current?": "你的金钱生活中，哪一部分需要更清晰的流向？",
  "Name the choice, pressure, or possibility you want to understand. Keep the question open enough for a useful reflection.": "写下你想理解的选择、压力或可能性，让问题保持开放，以容纳有用的映照。",
  "What is my money asking me to understand?": "我的金钱正在要求我理解什么？", "What should I protect before I try to grow?": "在追求增长之前，我应该先守护什么？",
  "Where is value leaking from my life?": "价值正从我生活的哪里流失？", "What resource am I not using fully?": "我尚未充分使用哪项资源？",
  "Enter the Money ritual": "进入财富仪式",
  "Choose the order of the three piles.": "选择三叠牌的顺序。", "Touch the piles left to right, in the order you want them to sit on the table.": "从左到右依次点触牌堆，按你希望它们在桌上排列的顺序。",
  "Let this pile open.": "让这叠牌展开。", "Choose the card that calls to you.": "选出那张呼唤你的牌。",
  "Turn over the three cards you chose.": "翻开你选出的三张牌。", "Each pile gave you exactly one card, in the order you set: Keep, Grow, and Flow.": "每叠牌都给了你恰好一张牌，按你设定的顺序：守护、成长与流动。",
  "of 3 chosen · numbers show the left-to-right order": "已选 3 中的 · 数字表示从左到右的顺序",
  "Tap the pile that should sit first, on the left.": "点触应放在最左边、第一位的牌堆。", "Set this order": "确定此顺序",
  "Tap any face-down card from this pile.": "点触这叠牌中任意一张背面朝上的牌。", "One card has moved into the center.": "一张牌已移到中央。",
  "Take this card": "取走这张牌",
  "Open the treasury": "开启宝库", "Three cards, a living ledger for your resources.": "三张牌，一本记录资源的活账簿。",
  "What to Keep": "值得守护", "What to Grow": "值得成长", "What to Let Flow": "值得流动",
  "Keep": "守护", "Grow": "成长", "Flow": "流动",
  "Unlock the Money path": "解锁财富路径", "A short passage before the Money ritual": "进入财富仪式前的短暂通道",
  "The treasury<br>is taking shape.": "宝库<br>正在成形。", "Watch this brief sponsored moment to open the Money ritual.": "观看这段简短赞助内容，即可开启财富仪式。"
});

// Decision says as little as it can. The reader breaks the deck where they like and takes
// one of two offered cards five times; nothing on screen tells them what any of it means.
Object.assign(I18N.fr, {
  "Four paths are ready tonight. Career, Money and Decision open after a brief sponsored passage.": "Quatre voies sont prêtes ce soir. Carrière, Argent et Décision s’ouvrent après un bref passage sponsorisé.",
  "Crossroads": "Croisée des chemins", "Decision ritual": "Rituel de la décision", "Enter the Decision ritual": "Entrer dans le rituel de la décision",
  "Which choice is holding you still?": "Quel choix vous retient immobile ?",
  "Name the tension that is holding you still. From here the ritual asks for nothing but your hands.": "Nommez la tension qui vous retient. Le rituel ne vous demandera rien d’autre que vos mains.",
  "Should I stay where I am or begin again?": "Dois-je rester où je suis ou tout recommencer ?",
  "Which of these two offers is truly mine?": "Laquelle de ces deux offres est vraiment la mienne ?",
  "Do I speak now or wait a little longer?": "Dois-je parler maintenant ou attendre encore un peu ?",
  "What am I refusing to admit about this choice?": "Qu’est-ce que je refuse d’admettre au sujet de ce choix ?",
  "Break the deck in two.": "Brisez le jeu en deux.",
  "Drag across the deck. It comes apart where your hand leaves it.": "Glissez la main sur le jeu. Il se sépare là où votre main le quitte.",
  "Choose where the deck comes apart": "Choisir où le jeu se sépare",
  "Neither half is better. They are only two halves.": "Aucune moitié ne vaut mieux que l’autre. Ce sont deux moitiés.",
  "Break it here": "Briser ici",
  "Take one. Leave one.": "Prenez-en une. Laissez l’autre.",
  "Each half offers its top card. Draw the one you want; the other is set aside face-down.": "Chaque moitié présente sa carte du dessus. Prenez celle que vous voulez ; l’autre est mise de côté, face cachée.",
  "Draw the card on the": "Prendre la carte de", "left": "gauche", "right": "droite",
  "There is no wrong card to take.": "Aucune carte n’est la mauvaise.",
  "What you kept": "Ce que vous avez gardé", "set aside, unturned": "mises de côté, non retournées",
  "Five stayed. Five never turned over.": "Cinq sont restées. Cinq ne seront jamais retournées.",
  "Turn over what you kept": "Retourner ce que vous avez gardé",
  "Turn over what you kept.": "Retournez ce que vous avez gardé.",
  "Five cards stayed with you. The five you passed over stay as they are.": "Cinq cartes vous sont restées. Les cinq que vous avez laissées restent telles quelles.",
  "Five cards, one crossroads held open.": "Cinq cartes, une croisée laissée ouverte.",
  "The First Reach": "Le premier geste", "What You Are Standing In": "Ce dans quoi vous vous tenez",
  "The Turning": "Le basculement", "What It Costs": "Ce que cela coûte", "What Opens": "Ce qui s’ouvre",
  "Unlock the Decision path": "Ouvrir la voie Décision", "A short passage before the Decision ritual": "Un bref passage avant le rituel de la décision",
  "The crossroads<br>is taking shape.": "La croisée<br>prend forme.", "Watch this brief sponsored moment to open the Decision ritual.": "Regardez ce bref moment sponsorisé pour ouvrir le rituel de la décision."
});
Object.assign(I18N.ru, {
  "Four paths are ready tonight. Career, Money and Decision open after a brief sponsored passage.": "Сегодня готовы четыре пути. Карьера, Деньги и Решение откроются после короткой рекламной паузы.",
  "Crossroads": "Перекрёсток", "Decision ritual": "Ритуал решения", "Enter the Decision ritual": "Войти в ритуал решения",
  "Which choice is holding you still?": "Какой выбор держит вас на месте?",
  "Name the tension that is holding you still. From here the ritual asks for nothing but your hands.": "Назовите напряжение, которое вас держит. Больше ритуалу не понадобится ничего, кроме ваших рук.",
  "Should I stay where I am or begin again?": "Остаться там, где я есть, или начать заново?",
  "Which of these two offers is truly mine?": "Какое из двух предложений действительно моё?",
  "Do I speak now or wait a little longer?": "Сказать сейчас или подождать ещё немного?",
  "What am I refusing to admit about this choice?": "В чём я отказываюсь себе признаться насчёт этого выбора?",
  "Break the deck in two.": "Разломите колоду надвое.",
  "Drag across the deck. It comes apart where your hand leaves it.": "Проведите рукой по колоде. Она разойдётся там, где рука её оставит.",
  "Choose where the deck comes apart": "Выберите, где колода разойдётся",
  "Neither half is better. They are only two halves.": "Ни одна половина не лучше. Это просто две половины.",
  "Break it here": "Разломить здесь",
  "Take one. Leave one.": "Возьмите одну. Оставьте другую.",
  "Each half offers its top card. Draw the one you want; the other is set aside face-down.": "Каждая половина показывает свою верхнюю карту. Возьмите ту, что хотите; другая ляжет в сторону рубашкой вверх.",
  "Draw the card on the": "Взять карту", "left": "слева", "right": "справа",
  "There is no wrong card to take.": "Здесь нет неправильной карты.",
  "What you kept": "Что вы оставили себе", "set aside, unturned": "отложены, не перевёрнуты",
  "Five stayed. Five never turned over.": "Пять остались. Пять не будут перевёрнуты никогда.",
  "Turn over what you kept": "Перевернуть оставленное",
  "Turn over what you kept.": "Переверните то, что оставили.",
  "Five cards stayed with you. The five you passed over stay as they are.": "Пять карт остались с вами. Пять, которые вы не взяли, останутся как есть.",
  "Five cards, one crossroads held open.": "Пять карт — перекрёсток, оставленный открытым.",
  "The First Reach": "Первое движение", "What You Are Standing In": "То, в чём вы стоите",
  "The Turning": "Перелом", "What It Costs": "Чего это стоит", "What Opens": "Что открывается",
  "Unlock the Decision path": "Открыть путь Решения", "A short passage before the Decision ritual": "Короткий переход перед ритуалом решения",
  "The crossroads<br>is taking shape.": "Перекрёсток<br>обретает форму.", "Watch this brief sponsored moment to open the Decision ritual.": "Посмотрите этот короткий рекламный момент, чтобы открыть ритуал решения."
});
Object.assign(I18N.zh, {
  "Four paths are ready tonight. Career, Money and Decision open after a brief sponsored passage.": "今夜已有四条路径准备就绪。事业、财富与抉择将在一段简短赞助内容后开启。",
  "Crossroads": "岔路口", "Decision ritual": "抉择仪式", "Enter the Decision ritual": "进入抉择仪式",
  "Which choice is holding you still?": "哪一个抉择让你停在原地？",
  "Name the tension that is holding you still. From here the ritual asks for nothing but your hands.": "写下让你停住的那份张力。除此之外，仪式只需要你的双手。",
  "Should I stay where I am or begin again?": "我该留在原地，还是重新开始？",
  "Which of these two offers is truly mine?": "这两个机会中，哪一个真正属于我？",
  "Do I speak now or wait a little longer?": "我该现在开口，还是再等一等？",
  "What am I refusing to admit about this choice?": "关于这个抉择，我拒绝承认什么？",
  "Break the deck in two.": "把牌组掰成两半。",
  "Drag across the deck. It comes apart where your hand leaves it.": "在牌组上横向拖动。你的手在哪里离开，它就在哪里裂开。",
  "Choose where the deck comes apart": "选择牌组分开的位置",
  "Neither half is better. They are only two halves.": "两半没有优劣，它们只是两半。",
  "Break it here": "在此掰开",
  "Take one. Leave one.": "取一张，留一张。",
  "Each half offers its top card. Draw the one you want; the other is set aside face-down.": "每一半都递出它最上面的牌。取走你要的那张；另一张会被覆置一旁。",
  "Draw the card on the": "取走", "left": "左边那张", "right": "右边那张",
  "There is no wrong card to take.": "没有哪张牌是错的。",
  "What you kept": "你留下的牌", "set aside, unturned": "置于一旁，未曾翻开",
  "Five stayed. Five never turned over.": "五张留下，五张永不翻开。",
  "Turn over what you kept": "翻开你留下的牌",
  "Turn over what you kept.": "翻开你留下的牌。",
  "Five cards stayed with you. The five you passed over stay as they are.": "五张牌留在你身边。你放过的那五张，就保持原样。",
  "Five cards, one crossroads held open.": "五张牌，一个始终敞开的岔路口。",
  "The First Reach": "最初的伸手", "What You Are Standing In": "你身处之境",
  "The Turning": "转折", "What It Costs": "代价", "What Opens": "由此敞开",
  "Unlock the Decision path": "解锁抉择路径", "A short passage before the Decision ritual": "进入抉择仪式前的短暂通道",
  "The crossroads<br>is taking shape.": "岔路口<br>正在成形。", "Watch this brief sponsored moment to open the Decision ritual.": "观看这段简短赞助内容，即可开启抉择仪式。"
});
Object.assign(I18N.fr, {
  "Mix the two halves back together.": "Mélangez à nouveau les deux moitiés.",
  "Watch the cards alternate from each pile into a newly mixed deck.": "Regardez les cartes alterner entre les deux paquets pour former un jeu fraîchement mélangé.",
  "One touch will interleave the two halves into a newly mixed deck.": "Un geste entrelacera les deux moitiés en un jeu fraîchement mélangé.",
  "Mix the two piles": "Mélanger les deux paquets",
  "Two halves, one deck.": "Deux moitiés, un seul jeu.",
  "Choose one card that calls to you.": "Choisissez la carte qui vous appelle.",
  "Touch a card to carry it into the reveal.": "Touchez une carte pour l’amener jusqu’à la révélation.",
  "Turn over the card you chose.": "Retournez la carte que vous avez choisie.",
  "Its face is still veiled. Reveal it when you are ready.": "Son visage est encore voilé. Révélez-le lorsque vous êtes prêt·e.",
  "Turn over your chosen card when you are ready.": "Retournez la carte choisie lorsque vous êtes prêt·e.",
  "One card will remain.": "Une seule carte restera.",
  "Chosen": "Choisie",
  "The Chosen Card": "La carte choisie",
  "One card, held at the crossroads.": "Une carte, tenue à la croisée des chemins.",
  "Watch a short ad to unlock a reflection based on your exact question and chosen card.": "Regardez une courte publicité pour débloquer une réflexion basée sur votre question exacte et la carte choisie.",
  "Watch an ad to unlock my interpretation": "Regarder une publicité pour débloquer mon interprétation"
});
Object.assign(I18N.ru, {
  "Mix the two halves back together.": "Снова перемешайте две половины.",
  "Watch the cards alternate from each pile into a newly mixed deck.": "Смотрите, как карты поочерёдно выходят из обеих стопок и образуют заново перемешанную колоду.",
  "One touch will interleave the two halves into a newly mixed deck.": "Одно касание переплетёт две половины в заново перемешанную колоду.",
  "Mix the two piles": "Перемешать две стопки",
  "Two halves, one deck.": "Две половины — одна колода.",
  "Choose one card that calls to you.": "Выберите одну карту, которая вас зовёт.",
  "Touch a card to carry it into the reveal.": "Коснитесь карты, чтобы перенести её к раскрытию.",
  "Turn over the card you chose.": "Переверните выбранную карту.",
  "Its face is still veiled. Reveal it when you are ready.": "Её лицо всё ещё скрыто. Откройте карту, когда будете готовы.",
  "Turn over your chosen card when you are ready.": "Переверните выбранную карту, когда будете готовы.",
  "One card will remain.": "Останется одна карта.",
  "Chosen": "Выбрано",
  "The Chosen Card": "Выбранная карта",
  "One card, held at the crossroads.": "Одна карта на перекрёстке.",
  "Watch a short ad to unlock a reflection based on your exact question and chosen card.": "Посмотрите короткую рекламу, чтобы открыть размышление по вашему вопросу и выбранной карте.",
  "Watch an ad to unlock my interpretation": "Посмотреть рекламу и открыть толкование"
});
Object.assign(I18N.zh, {
  "Mix the two halves back together.": "将两半牌重新混合。",
  "Watch the cards alternate from each pile into a newly mixed deck.": "看着两堆牌交替穿插，重新混成一副牌。",
  "One touch will interleave the two halves into a newly mixed deck.": "轻触一下，两半牌将交错穿插，重新混成一副牌。",
  "Mix the two piles": "混合两堆牌",
  "Two halves, one deck.": "两半牌，一副牌。",
  "Choose one card that calls to you.": "选择那张在召唤你的牌。",
  "Touch a card to carry it into the reveal.": "触碰一张牌，将它带入揭晓环节。",
  "Turn over the card you chose.": "翻开你选择的牌。",
  "Its face is still veiled. Reveal it when you are ready.": "牌面仍被遮掩。准备好时再揭晓它。",
  "Turn over your chosen card when you are ready.": "准备好时，翻开你选择的牌。",
  "One card will remain.": "最终只会留下一张牌。",
  "Chosen": "已选",
  "The Chosen Card": "你选择的牌",
  "One card, held at the crossroads.": "一张牌，停驻在岔路口。",
  "Watch a short ad to unlock a reflection based on your exact question and chosen card.": "观看一个简短广告，解锁基于你的问题与所选牌面的映照。",
  "Watch an ad to unlock my interpretation": "观看广告以解锁我的解读"
});
Object.assign(I18N.fr, {
  "Celestial tarot": "Tarot céleste",
  "Seven paths are ready tonight. Sponsored paths open after a brief passage.": "Sept voies sont ouvertes ce soir. Les voies sponsorisées s’ouvrent après un bref passage.",
  "The Bond": "Le Lien", "Inner Moon": "Lune intérieure", "The Far Horizon": "L’Horizon lointain",
  "Enter the Bond ritual": "Entrer dans le rituel du Lien", "Enter the Growth ritual": "Entrer dans le rituel de Croissance", "Enter the Future ritual": "Entrer dans le rituel de l’Avenir",
  "Friendship / Family ritual": "Rituel Amitié / Famille", "Personal Growth ritual": "Rituel de développement personnel", "General Future ritual": "Rituel de l’avenir général",
  "Which bond is asking to be understood?": "Quel lien demande à être compris ?", "What within you is ready to change shape?": "Qu’est-ce qui, en vous, est prêt à changer de forme ?", "Which horizon are you looking toward?": "Vers quel horizon regardez-vous ?",
  "Name the friendship or family dynamic that needs more honesty, warmth, or room. The two halves will hold both voices.": "Nommez la dynamique amicale ou familiale qui a besoin de plus de vérité, de chaleur ou d’espace. Les deux moitiés porteront les deux voix.",
  "Name the habit, threshold, or part of yourself you want to meet more clearly. Three cards will trace the movement.": "Nommez l’habitude, le seuil ou la part de vous que vous souhaitez rencontrer plus clairement. Trois cartes en traceront le mouvement.",
  "Place an open question about the season ahead. This longer ritual holds what is hidden, what is arriving, and what can guide you.": "Posez une question ouverte sur la saison à venir. Ce rituel plus long tient ce qui est caché, ce qui arrive et ce qui peut vous guider.",
  "Your Voice": "Votre voix", "Their Voice": "Leur voix", "The Root": "La Racine", "The Threshold": "Le Seuil", "The Becoming": "Le Devenir",
  "The Veiled Horizon": "L’Horizon voilé", "What Is Arriving": "Ce qui arrive", "What Is Changing": "Ce qui change", "What Guides You": "Ce qui vous guide",
  "Loosen the cards between two voices.": "Déliez les cartes entre deux voix.", "Divide the deck into two voices.": "Divisez le jeu en deux voix.", "Let your half open.": "Laissez votre moitié s’ouvrir.", "Choose the card that sounds like you.": "Choisissez la carte qui vous ressemble.", "Let their half open.": "Laissez leur moitié s’ouvrir.", "Choose the card that answers from across the bond.": "Choisissez la carte qui répond de l’autre côté du lien.", "Turn over the two voices.": "Retournez les deux voix.",
  "Loosen the pattern beneath your hands.": "Déliez le motif sous vos mains.", "Let the inner path open.": "Laissez le chemin intérieur s’ouvrir.", "Choose three moments of becoming.": "Choisissez trois moments de devenir.", "Turn over the movement within you.": "Retournez le mouvement en vous.",
  "Loosen the cards beneath the coming sky.": "Déliez les cartes sous le ciel à venir.", "Cut where the horizon first opens.": "Coupez là où l’horizon s’ouvre.", "Take the card beneath the lifted future.": "Prenez la carte sous l’avenir soulevé.", "Return the two halves beneath the horizon.": "Réunissez les deux moitiés sous l’horizon.", "Divide the season ahead into three.": "Divisez la saison à venir en trois.", "Choose how the three currents return.": "Choisissez comment les trois courants reviennent.", "Let the horizon open.": "Laissez l’horizon s’ouvrir.", "Choose three signs from the road ahead.": "Choisissez trois signes sur la route à venir.", "Reveal the horizon in the order you wish.": "Révélez l’horizon dans l’ordre souhaité.",
  "Divide the two voices": "Diviser les deux voix", "Continue to the second voice": "Continuer vers la seconde voix", "Reveal the bond": "Révéler le lien", "Place the three moments": "Placer les trois moments", "Place the four signs": "Placer les quatre signes",
  "Two cards, two voices within one bond.": "Deux cartes, deux voix dans un même lien.", "Three cards, an inner movement taking shape.": "Trois cartes, un mouvement intérieur qui prend forme.", "Four cards, gathered along the far horizon.": "Quatre cartes, réunies sur l’horizon lointain.",
  "Unlock the Bond path": "Ouvrir la voie du Lien", "Unlock the Growth path": "Ouvrir la voie de Croissance", "Unlock the Future path": "Ouvrir la voie de l’Avenir",
  "Watch a short ad to unlock a reflection based on your exact question and both cards.": "Regardez une courte publicité pour ouvrir une réflexion fondée sur votre question et les deux cartes.",
  "Watch a short ad to unlock a reflection based on your exact question and all three cards.": "Regardez une courte publicité pour ouvrir une réflexion fondée sur votre question et les trois cartes."
});
Object.assign(I18N.ru, {
  "Celestial tarot": "Небесное таро",
  "Seven paths are ready tonight. Sponsored paths open after a brief passage.": "Сегодня открыты семь путей. Спонсируемые пути откроются после короткой паузы.",
  "The Bond": "Связь", "Inner Moon": "Внутренняя луна", "The Far Horizon": "Дальний горизонт",
  "Enter the Bond ritual": "Войти в ритуал Связи", "Enter the Growth ritual": "Войти в ритуал Роста", "Enter the Future ritual": "Войти в ритуал Будущего",
  "Friendship / Family ritual": "Ритуал дружбы / семьи", "Personal Growth ritual": "Ритуал личностного роста", "General Future ritual": "Ритуал общего будущего",
  "Which bond is asking to be understood?": "Какая связь просит понимания?", "What within you is ready to change shape?": "Что внутри вас готово изменить форму?", "Which horizon are you looking toward?": "К какому горизонту вы обращены?",
  "Your Voice": "Ваш голос", "Their Voice": "Их голос", "The Root": "Корень", "The Threshold": "Порог", "The Becoming": "Становление",
  "The Veiled Horizon": "Скрытый горизонт", "What Is Arriving": "Что приходит", "What Is Changing": "Что меняется", "What Guides You": "Что вас направляет",
  "Loosen the cards between two voices.": "Освободите карты между двумя голосами.", "Divide the deck into two voices.": "Разделите колоду на два голоса.", "Let your half open.": "Позвольте своей половине раскрыться.", "Choose the card that sounds like you.": "Выберите карту, которая звучит как вы.", "Let their half open.": "Позвольте их половине раскрыться.", "Choose the card that answers from across the bond.": "Выберите карту, отвечающую с другой стороны связи.", "Turn over the two voices.": "Переверните два голоса.",
  "Loosen the pattern beneath your hands.": "Освободите узор под руками.", "Let the inner path open.": "Позвольте внутреннему пути раскрыться.", "Choose three moments of becoming.": "Выберите три момента становления.", "Turn over the movement within you.": "Переверните внутреннее движение.",
  "Loosen the cards beneath the coming sky.": "Освободите карты под небом грядущего.", "Cut where the horizon first opens.": "Срежьте там, где впервые открывается горизонт.", "Take the card beneath the lifted future.": "Возьмите карту под поднятым будущим.", "Return the two halves beneath the horizon.": "Соедините две половины под горизонтом.", "Divide the season ahead into three.": "Разделите будущий сезон на три.", "Choose how the three currents return.": "Выберите, как вернутся три течения.", "Let the horizon open.": "Позвольте горизонту раскрыться.", "Choose three signs from the road ahead.": "Выберите три знака на пути впереди.", "Reveal the horizon in the order you wish.": "Откройте горизонт в любом порядке.",
  "Divide the two voices": "Разделить два голоса", "Continue to the second voice": "Перейти ко второму голосу", "Reveal the bond": "Открыть связь", "Place the three moments": "Разместить три момента", "Place the four signs": "Разместить четыре знака",
  "Two cards, two voices within one bond.": "Две карты, два голоса в одной связи.", "Three cards, an inner movement taking shape.": "Три карты, внутреннее движение обретает форму.", "Four cards, gathered along the far horizon.": "Четыре карты, собранные у дальнего горизонта.",
  "Unlock the Bond path": "Открыть путь Связи", "Unlock the Growth path": "Открыть путь Роста", "Unlock the Future path": "Открыть путь Будущего"
});
Object.assign(I18N.zh, {
  "Celestial tarot": "星穹塔罗",
  "Seven paths are ready tonight. Sponsored paths open after a brief passage.": "今夜七条路径已经开启。赞助路径将在短暂片刻后开放。",
  "The Bond": "羁绊", "Inner Moon": "内在之月", "The Far Horizon": "远方地平线",
  "Enter the Bond ritual": "进入羁绊仪式", "Enter the Growth ritual": "进入成长仪式", "Enter the Future ritual": "进入未来仪式",
  "Friendship / Family ritual": "友情 / 家庭仪式", "Personal Growth ritual": "个人成长仪式", "General Future ritual": "综合未来仪式",
  "Which bond is asking to be understood?": "哪一段关系正在等待被理解？", "What within you is ready to change shape?": "你内在的什么已经准备好改变形态？", "Which horizon are you looking toward?": "你正望向哪一片地平线？",
  "Your Voice": "你的声音", "Their Voice": "对方的声音", "The Root": "根源", "The Threshold": "门槛", "The Becoming": "成为",
  "The Veiled Horizon": "隐秘地平线", "What Is Arriving": "正在到来", "What Is Changing": "正在改变", "What Guides You": "指引你的力量",
  "Loosen the cards between two voices.": "在两种声音之间松开牌阵。", "Divide the deck into two voices.": "将牌组分成两种声音。", "Let your half open.": "让属于你的那一半展开。", "Choose the card that sounds like you.": "选择一张像你声音的牌。", "Let their half open.": "让属于对方的那一半展开。", "Choose the card that answers from across the bond.": "选择一张从关系另一端回应的牌。", "Turn over the two voices.": "翻开两种声音。",
  "Loosen the pattern beneath your hands.": "松开手下熟悉的模式。", "Let the inner path open.": "让内在道路展开。", "Choose three moments of becoming.": "选择三个成为的时刻。", "Turn over the movement within you.": "翻开你内在的变化。",
  "Loosen the cards beneath the coming sky.": "在将至的天空下松开牌阵。", "Cut where the horizon first opens.": "在地平线初次开启之处切牌。", "Take the card beneath the lifted future.": "抽出被抬起的未来之下那张牌。", "Return the two halves beneath the horizon.": "在地平线下重新合起两半牌。", "Divide the season ahead into three.": "将前方的时节分成三部分。", "Choose how the three currents return.": "选择三股流向回归的次序。", "Let the horizon open.": "让地平线展开。", "Choose three signs from the road ahead.": "从前方道路选择三个征兆。", "Reveal the horizon in the order you wish.": "按你希望的顺序揭开地平线。",
  "Divide the two voices": "分开两种声音", "Continue to the second voice": "前往第二种声音", "Reveal the bond": "揭示羁绊", "Place the three moments": "安放三个时刻", "Place the four signs": "安放四个征兆",
  "Two cards, two voices within one bond.": "两张牌，同一羁绊中的两种声音。", "Three cards, an inner movement taking shape.": "三张牌，内在变化正在成形。", "Four cards, gathered along the far horizon.": "四张牌，汇聚于远方地平线。",
  "Unlock the Bond path": "解锁羁绊路径", "Unlock the Growth path": "解锁成长路径", "Unlock the Future path": "解锁未来路径"
});
Object.assign(I18N.fr, {
  "Dawn": "Aube", "Zenith": "Zénith", "Dusk": "Crépuscule", "Midnight": "Minuit",
  "Dawn — What Begins": "Aube — Ce qui commence", "Zenith — What Becomes Clear": "Zénith — Ce qui devient clair", "Dusk — What Must Change": "Crépuscule — Ce qui doit changer", "Midnight — What Guides You": "Minuit — Ce qui vous guide",
  "Disturb the map of what comes next.": "Brouillez la carte de ce qui vient.", "Mark four quarters in the coming sky.": "Marquez quatre quartiers dans le ciel à venir.", "Give each pile its direction.": "Donnez sa direction à chaque pile.", "Let the compass breathe open.": "Laissez la boussole s’ouvrir.",
  "Choose from Dawn.": "Choisissez à l’Aube.", "Choose from Zenith.": "Choisissez au Zénith.", "Choose from Dusk.": "Choisissez au Crépuscule.", "Choose from Midnight.": "Choisissez à Minuit.", "Turn over the four directions.": "Retournez les quatre directions.",
  "Place the Dawn marker": "Placer le repère de l’Aube", "Place the Zenith marker": "Placer le repère du Zénith", "Complete the four quarters": "Compléter les quatre quartiers", "Align the four directions": "Aligner les quatre directions",
  "Choose the pile that belongs to": "Choisissez la pile qui appartient à", "Only": "Seule", "is awake. Choose one card from its quarter.": "est éveillée. Choisissez une carte dans son quartier."
});
Object.assign(I18N.ru, {
  "Dawn": "Рассвет", "Zenith": "Зенит", "Dusk": "Сумерки", "Midnight": "Полночь",
  "Dawn — What Begins": "Рассвет — Что начинается", "Zenith — What Becomes Clear": "Зенит — Что проясняется", "Dusk — What Must Change": "Сумерки — Что должно измениться", "Midnight — What Guides You": "Полночь — Что вас направляет",
  "Disturb the map of what comes next.": "Нарушьте карту того, что будет дальше.", "Mark four quarters in the coming sky.": "Отметьте четыре четверти грядущего неба.", "Give each pile its direction.": "Дайте каждой стопке направление.", "Let the compass breathe open.": "Позвольте компасу раскрыться.",
  "Choose from Dawn.": "Выберите на Рассвете.", "Choose from Zenith.": "Выберите в Зените.", "Choose from Dusk.": "Выберите в Сумерках.", "Choose from Midnight.": "Выберите в Полночь.", "Turn over the four directions.": "Переверните четыре направления.",
  "Place the Dawn marker": "Поставить метку Рассвета", "Place the Zenith marker": "Поставить метку Зенита", "Complete the four quarters": "Завершить четыре четверти", "Align the four directions": "Выровнять четыре направления"
});
Object.assign(I18N.zh, {
  "Dawn": "黎明", "Zenith": "天顶", "Dusk": "黄昏", "Midnight": "午夜",
  "Dawn — What Begins": "黎明 — 正在开始", "Zenith — What Becomes Clear": "天顶 — 逐渐清晰", "Dusk — What Must Change": "黄昏 — 必须改变", "Midnight — What Guides You": "午夜 — 指引你的力量",
  "Disturb the map of what comes next.": "打乱下一程的旧地图。", "Mark four quarters in the coming sky.": "在将至的天空标记四个方位。", "Give each pile its direction.": "为每一叠牌赋予方向。", "Let the compass breathe open.": "让罗盘舒展开来。",
  "Choose from Dawn.": "从黎明中选择。", "Choose from Zenith.": "从天顶中选择。", "Choose from Dusk.": "从黄昏中选择。", "Choose from Midnight.": "从午夜中选择。", "Turn over the four directions.": "翻开四个方向。",
  "Place the Dawn marker": "放置黎明标记", "Place the Zenith marker": "放置天顶标记", "Complete the four quarters": "完成四个方位", "Align the four directions": "校准四个方向"
});
function t(source) {
  const lang = state?.settings?.language || "en";
  if (lang === "en") return source;
  return I18N[lang]?.[source] ?? source;
}

function buildDeck(seed) {
  const raw = MAJORS.map((name, index) => ({ name, suit: "Major Arcana", mark: "✦", rank: String(index) }))
    .concat(SUITS.flatMap(([suit, mark]) => RANKS.map((rank) => ({ name: `${rank} of ${suit}`, suit, mark, rank }))));
  const random = rngFor(seed);
  return shuffleStable(raw, random).map((card, index) => ({
    id: `card-${index + 1}-${card.name.toLowerCase().replace(/[^a-z0-9]+/g, "-")}`,
    ...card,
    reversed: random() < .29,
    microRotation: Number(((random() - .5) * 2.2).toFixed(2)),
    depth: index
  }));
}
function buildShuffleLayout(seed) {
  const random = rngFor(`${seed}-scatter`);
  return Array.from({ length: 26 }, (_, index) => {
    const angle = random() * Math.PI * 2;
    const radius = 5 + Math.sqrt(random()) * 25;
    return {
      id: `scatter-${index}`,
      x: Number((50 + Math.cos(angle) * radius).toFixed(2)),
      y: Number((50 + Math.sin(angle) * radius * .58).toFixed(2)),
      r: Number(((random() - .5) * 96).toFixed(2)),
      z: index + 1
    };
  });
}
// Career opens on a physical table too, but its sweep pushes cards apart instead of
// letting them clump the way Love's pile does: the constellation wants space between
// its sparks, so every wave is followed by a separation pass.
const CAREER_SCATTER_COUNT = 34;
function buildCareerScatter(seed) {
  const random = rngFor(`${seed}-career-scatter`);
  return Array.from({ length: CAREER_SCATTER_COUNT }, (_, index) => {
    const angle = random() * Math.PI * 2;
    const radius = 4 + Math.sqrt(random()) * 13;
    return {
      x: Number((50 + Math.cos(angle) * radius).toFixed(2)),
      y: Number((50 + Math.sin(angle) * radius * .72).toFixed(2)),
      r: Number(((random() - .5) * 58).toFixed(2)),
      z: index + 1
    };
  });
}
function createCareerState(seed) {
  return {
    phase: "shuffle",
    scatter: buildCareerScatter(seed),
    shuffleMoves: 0,
    emberIds: [],
    heldCards: [],
    cut: null,
    pileStep: 0,
    selectedIds: []
  };
}
// Decision keeps only what the reader watched happen: where the deck was cut and the
// single card they chose from the final spread.
function createDecisionState() {
  return {
    cut: null,
    selectedId: null
  };
}
function createKinState() {
  return {
    cut: null,
    pileStep: 0,
    selectedIds: []
  };
}
function createFutureState() {
  return {
    cuts: [],
    cutDraft: 19,
    order: [],
    selectedIds: []
  };
}
function createState() {
  const seed = uid();
  return {
    version: 2,
    seed,
    stage: "start",
    category: "Love",
    question: "",
    deck: buildDeck(seed),
    piles: [],
    ritualCardId: null,
    ritualCard: null,
    firstCut: null,
    threeCuts: [],
    assemblyOrder: [],
    selectedIds: [],
    revealedIds: [],
    spread: null,
    shuffleMoves: 0,
    shuffleLayout: buildShuffleLayout(seed),
    cutDraft: 36,
    threeCutDraft: 23,
    twoTop: null,
    ad: null,
    career: createCareerState(seed),
    // The three cut piles, once ordered left to right, are worked through one at a time:
    // pileStep points at the pile currently being spread, selectedIds accumulates the one
    // card taken from each as the reader moves left to right.
    money: { pileStep: 0, selectedIds: [] },
    decision: createDecisionState(),
    kin: createKinState(),
    future: createFutureState(),
    shareTheme: "midnight",
    aiUnlocked: false,
    aiLoading: false,
    aiText: null,
    aiSummary: null,
    aiError: null,
    settings: { language: "en", volume: 65, sfxEnabled: true, music: false, haptics: true, simplified: false },
    debug: false,
    performance: { interactions: 0, lastGesture: 0 }
  };
}
function normalizeSettings(settings = {}) {
  return {
    language: ["en", "fr", "ru", "zh"].includes(settings.language) ? settings.language : "en",
    volume: clamp(Number(settings.volume ?? 65), 0, 100),
    sfxEnabled: settings.sfxEnabled !== false,
    music: Boolean(settings.music),
    haptics: settings.haptics !== false,
    simplified: Boolean(settings.simplified)
  };
}
function loadState() {
  // Always begin a fresh reading on load; only carry over saved preferences.
  const fresh = createState();
  try {
    const stored = JSON.parse(localStorage.getItem(STORAGE_KEY));
    if (stored?.settings) fresh.settings = normalizeSettings(stored.settings);
  } catch { /* fresh reading */ }
  return fresh;
}
let state = loadState();
let toastTimer;
let transitioning = false;
let autoSpreadTimer;
let settingsOpen = false;
let lastFocusedStage = state.stage;
const MUSIC_URL = "https://upload.wikimedia.org/wikipedia/commons/a/af/Kai_Engel_-_09_-_Sunset.ogg";
const MUSIC_LEVEL = 0.5;
let musicAudio;
let musicContext;
let musicMaster;
let musicNodes = [];
let musicUsesSynth = false;

// Writes are debounced: gestures and drags call persist() many times per second,
// and a synchronous localStorage write of the full state would jank every frame.
let persistTimer;
function persistNow() {
  clearTimeout(persistTimer);
  try { localStorage.setItem(STORAGE_KEY, JSON.stringify(state)); } catch { /* storage can be unavailable (private mode) */ }
}
function persist() {
  clearTimeout(persistTimer);
  persistTimer = setTimeout(persistNow, 250);
}
window.addEventListener("pagehide", persistNow);
document.addEventListener("visibilitychange", () => { if (document.visibilityState === "hidden") persistNow(); });
function ritualStages() {
  if (state.category === "Career") return CAREER_STAGES;
  if (state.category === "Money") return MONEY_STAGES;
  if (state.category === "Decision") return DECISION_STAGES;
  if (state.category === "Friendship / Family") return KIN_STAGES;
  if (state.category === "Personal Growth") return GROWTH_STAGES;
  if (state.category === "General Future") return FUTURE_STAGES;
  return LOVE_STAGES;
}
function readingPositions() {
  if (state.category === "Career") return CAREER_POSITIONS;
  if (state.category === "Money") return MONEY_POSITIONS;
  if (state.category === "Decision") return DECISION_POSITIONS;
  if (state.category === "Friendship / Family") return KIN_POSITIONS;
  if (state.category === "Personal Growth") return GROWTH_POSITIONS;
  if (state.category === "General Future") return FUTURE_POSITIONS;
  return LOVE_POSITIONS;
}
function stageIndex() { return Math.max(0, ritualStages().indexOf(state.stage)); }
function cardById(id) {
  if (state.ritualCard?.id === id) return state.ritualCard;
  return state.career?.heldCards?.find((card) => card.id === id)
    || state.deck.find((card) => card.id === id)
    || state.piles.flat().find((card) => card.id === id);
}
function readingCards() {
  const ids = state.category === "Career"
    ? state.career.selectedIds
    : state.category === "Money"
      ? state.money.selectedIds
      : state.category === "Decision"
        ? [state.decision.selectedId]
        : state.category === "Friendship / Family"
          ? state.kin.selectedIds
          : state.category === "Personal Growth"
            ? state.selectedIds
            : state.category === "General Future"
              ? state.future.selectedIds
              : [state.ritualCardId, ...state.selectedIds];
  return ids.map(cardById).filter(Boolean);
}
function interaction() { state.performance.interactions += 1; state.performance.lastGesture = Date.now(); persist(); }

function buzz(pattern = 10) {
  if (state.settings.haptics && navigator.vibrate) navigator.vibrate(pattern);
}
// Recorded sound effects (CC0, public domain — Kenney "Casino Audio" pack; see assets/audio/LICENSE.txt).
// Each category holds several near-identical takes of one physical action; a random take plays
// each time so a repeated gesture (e.g. sweeping several cards) doesn't sound mechanically identical.
const SFX_VARIANTS = {
  shuffle: 8, cut: 4, gather: 4, spread: 2, take: 2, flip: 2
};
const SFX_TONES = { flip: { type: "sine", frequency: 280 }, cut: { type: "triangle", frequency: 125 }, gather: { type: "triangle", frequency: 125 } };
function sfxUrl(kind) {
  const count = SFX_VARIANTS[kind] || 1;
  const pick = 1 + Math.floor(Math.random() * count);
  return `./assets/audio/${kind}/${pick}.ogg`;
}
function synthSound(kind, intensity) {
  if (!window.AudioContext && !window.webkitAudioContext) return;
  try {
    const Ctx = window.AudioContext || window.webkitAudioContext;
    const ctx = new Ctx();
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    const tone = SFX_TONES[kind] || { type: "triangle", frequency: 170 };
    osc.type = tone.type;
    osc.frequency.value = tone.frequency;
    gain.gain.setValueAtTime(intensity * state.settings.volume / 100, ctx.currentTime);
    gain.gain.exponentialRampToValueAtTime(.001, ctx.currentTime + .12);
    osc.connect(gain).connect(ctx.destination); osc.start(); osc.stop(ctx.currentTime + .13);
  } catch { /* audio remains optional */ }
}
function sound(kind = "shuffle", intensity = .18) {
  if (!state.settings.sfxEnabled || state.settings.volume <= 0) return;
  // Prefer a recorded sample (randomized per category); fall back to a synthesized tone if it can't load.
  try {
    const audio = new Audio(sfxUrl(kind));
    audio.volume = clamp(intensity * state.settings.volume / 100, 0, 1);
    audio.playbackRate = .94 + Math.random() * .12; // tiny pitch variance so repeats feel physical, not looped
    audio.addEventListener("error", () => synthSound(kind, intensity), { once: true });
    const played = audio.play();
    if (played?.catch) played.catch(() => synthSound(kind, intensity));
  } catch { synthSound(kind, intensity); }
}
// Music is deliberately independent of the "Sound effects" volume: that slider only scales sound().
function setMusicLevel() {
  const on = Boolean(state.settings.music);
  if (musicAudio) musicAudio.volume = on ? MUSIC_LEVEL : 0;
  if (musicMaster && musicContext) musicMaster.gain.setTargetAtTime(on && musicUsesSynth ? .05 : 0, musicContext.currentTime, .3);
}
function startSynthAmbience() {
  if (!window.AudioContext && !window.webkitAudioContext) return;
  try {
    musicUsesSynth = true;
    if (!musicContext) {
      const Ctx = window.AudioContext || window.webkitAudioContext;
      musicContext = new Ctx();
      musicMaster = musicContext.createGain();
      musicMaster.gain.value = 0;
      musicMaster.connect(musicContext.destination);
      [110, 164.81, 220].forEach((frequency, index) => {
        const tone = musicContext.createOscillator();
        const toneGain = musicContext.createGain();
        const drift = musicContext.createOscillator();
        const driftGain = musicContext.createGain();
        tone.type = index === 1 ? "triangle" : "sine";
        tone.frequency.value = frequency;
        toneGain.gain.value = [.26, .12, .08][index];
        drift.frequency.value = [.035, .052, .071][index];
        driftGain.gain.value = [2.2, 1.3, .8][index];
        drift.connect(driftGain).connect(tone.frequency);
        tone.connect(toneGain).connect(musicMaster);
        tone.start(); drift.start();
        musicNodes.push(tone, drift);
      });
    }
    musicContext.resume();
    setMusicLevel();
  } catch { /* ambience is optional */ }
}
function startBackgroundMusic() {
  if (!state.settings.music) return;
  try {
    if (!musicAudio) {
      musicAudio = new Audio(MUSIC_URL);
      musicAudio.loop = true;
      musicAudio.preload = "auto";
      musicAudio.volume = MUSIC_LEVEL;
      // Fall back to generated tones if the track cannot be played (e.g. no Ogg support or offline).
      musicAudio.addEventListener("error", () => { musicAudio = null; startSynthAmbience(); }, { once: true });
    }
    musicAudio.volume = MUSIC_LEVEL;
    const played = musicAudio.play();
    if (played && played.catch) played.catch(() => startSynthAmbience());
  } catch { startSynthAmbience(); }
}
function stopBackgroundMusic() {
  if (musicAudio) musicAudio.pause();
  setMusicLevel();
}
function updatePageLanguage() {
  document.documentElement.lang = state.settings.language;
}
function showToast(message) {
  clearTimeout(toastTimer);
  const existing = document.querySelector(".toast");
  if (existing) existing.remove();
  const toast = document.createElement("div");
  toast.className = "toast";
  toast.setAttribute("role", "status");
  toast.setAttribute("aria-live", "polite");
  toast.textContent = message;
  document.body.append(toast);
  toastTimer = setTimeout(() => toast.remove(), 1900);
}

function deckBackStack(extra = "") {
  const layers = Array.from({ length: 22 }, (_, i) => `<div class="stack-card" style="--i:${i}"></div>`).join("");
  return `<div class="deck ${extra}" data-gesture="deck">${layers}</div>`;
}
function cardImagePath(card) {
  const artworkName = card.name === "Two of Cups"
    ? "two_of_cups_reconstructed"
    : card.name.toLowerCase().replace(/[^a-z0-9]+/g, "_").replace(/^_|_$/g, "");
  return `./assets/tarot/${artworkName}.png?v=${CARD_ART_VERSION}`;
}
// Warm the browser cache for a card's (large) artwork the moment it's known, so the
// later face-up flip paints instantly instead of waiting on a fresh network fetch.
const preloadedArt = new Set();
function preloadCardArt(cards) {
  (Array.isArray(cards) ? cards : [cards]).forEach((card) => {
    if (!card) return;
    const src = cardImagePath(card);
    if (preloadedArt.has(src)) return;
    preloadedArt.add(src);
    const img = new Image();
    img.decoding = "async";
    img.src = src;
  });
}
function cardImage(card) {
  return `<img class="card-image" src="${cardImagePath(card)}" width="91" height="155" alt="" draggable="false" decoding="async" data-name="${escapeHTML(card.name)}" data-mark="${card.mark}">`;
}
function cardFace(card, extra = "") {
  return `<button class="card face image-face ${card.reversed ? "reversed" : ""} ${extra}" aria-label="${escapeHTML(card.name)}, ${t(card.reversed ? "Reversed" : "Upright").toLowerCase()}">${cardImage(card)}</button>`;
}
function faceInner(card) {
  return cardImage(card);
}
function cardBack(extra = "") { return `<button class="card back ${extra}" aria-label="${t("Face-down tarot card")}"></button>`; }
function majorSymbol(name) {
  const symbols = { "The Lovers": "♥", "The Moon": "☾", "The Sun": "☉", "The Star": "✦", "The Tower": "⌁", "Death": "☠", "The World": "◎", "The Fool": "✧", "The High Priestess": "☽", "Wheel of Fortune": "☸", "Justice": "⚖", "Strength": "♌", "The Hermit": "◌" };
  return symbols[name] || "✦";
}
function paintCardArt() {
  document.querySelectorAll("[data-art]").forEach((node) => { node.style.setProperty("--art", `"${node.dataset.art}"`); });
}

function progress() {
  const current = stageIndex();
  return `<div class="stage-progress" aria-label="Ritual progress">${ritualStages().map((stage, index) => `<i class="${index < current ? "done" : index === current ? "active" : ""}" title="${stage}"></i>`).join("")}</div>`;
}
function topbar() {
  return `<header class="topbar"><button class="brand" data-action="home" aria-label="Return to the opening"><span class="brand-sigil" aria-hidden="true"><i></i></span><span class="brand-copy"><strong>Oracle Veil</strong><small>${t("Celestial tarot")}</small></span></button>
    <div class="utility-row"><button class="settings-button" data-action="open-settings" aria-haspopup="dialog">${t("Settings")}</button></div></header>`;
}
function world(content, className = "") {
  return `<section class="world ${className}"><div class="cloud-bank top"></div><div class="cloud-bank bottom"></div><div class="temple"></div>${topbar()}${content}</section>`;
}

function renderStart() {
  return world(`<section class="scene hero"><div><p class="eyebrow">${t("A quiet ritual for the heart")}</p><h1>${t("Enter the<br>celestial book.")}</h1><p class="lede">${t("A reading begins with the deck in your hands. The question can wait until you feel its weight.")}</p></div><div class="hero-deck-wrap"><div class="hero-deck">${deckBackStack("")}</div></div><button class="seal-button" data-action="begin">${t("Open the ritual")}</button></section>`, "start-world");
}
function renderCategory() {
  const categories = [
    { name: "Love", symbol: "♡", action: "choose-love", note: "begin" },
    { name: "Career", symbol: "⌁", action: "choose-career", note: "watch to enter", locked: true },
    { name: "Money", symbol: "◉", action: "choose-money", note: "watch to enter", locked: true },
    { name: "Decision", symbol: "⚭", action: "choose-decision", note: "watch to enter", locked: true },
    { name: "Friendship / Family", symbol: "⌇", action: "choose-kin", note: "watch to enter", locked: true },
    { name: "Personal Growth", symbol: "☾", action: "choose-growth", note: "watch to enter", locked: true },
    { name: "General Future", symbol: "☉", action: "choose-future", note: "watch to enter", locked: true }
  ];
  return world(`<section class="scene"><div class="ritual-head"><p class="eyebrow">${t("Choose a path")}</p><h1>${t("What calls for your attention?")}</h1><p class="lede">${t("Seven paths are ready tonight. Sponsored paths open after a brief passage.")}</p></div><div class="category-grid">${categories.map(({ name, symbol, action, note, locked }) => `<button class="category ${action ? "available" : ""} ${locked ? "locked" : ""}" ${action ? `data-action="${action}"` : "disabled"}>${locked ? `<span class="category-lock" aria-hidden="true"><i></i></span>` : ""}<span class="symbol">${symbol}</span><span>${t(name)}</span><small>${action ? t(note) : t("coming soon")}</small></button>`).join("")}</div><button class="back-link" data-action="back-start">${t("Return to the book")}</button></section>`);
}
// Each path introduces itself with its own vocabulary before the ritual begins.
const QUESTION_COPY = {
  Career: {
    pathName: "Career Compass", nextLabel: "Enter the Career ritual", theme: "career",
    title: "What part of your working life is asking to move?",
    lede: "Name the tension, opportunity, or direction you want to explore. Open questions leave room for a useful reflection.",
    examples: ["What strength am I ready to be known for?", "What is keeping me from my next career chapter?", "Where should I focus my energy at work?", "What opportunity am I not seeing yet?"]
  },
  Money: {
    pathName: "Money Ledger", nextLabel: "Enter the Money ritual", theme: "money",
    title: "What part of your money life needs a clearer current?",
    lede: "Name the choice, pressure, or possibility you want to understand. Keep the question open enough for a useful reflection.",
    examples: ["What is my money asking me to understand?", "What should I protect before I try to grow?", "Where is value leaking from my life?", "What resource am I not using fully?"]
  },
  Decision: {
    pathName: "Crossroads", nextLabel: "Enter the Decision ritual", theme: "decision",
    title: "Which choice is holding you still?",
    lede: "Name the tension that is holding you still. From here the ritual asks for nothing but your hands.",
    examples: ["Should I stay where I am or begin again?", "Which of these two offers is truly mine?", "Do I speak now or wait a little longer?", "What am I refusing to admit about this choice?"]
  },
  "Friendship / Family": {
    pathName: "The Bond", nextLabel: "Enter the Bond ritual", theme: "kin",
    title: "Which bond is asking to be understood?",
    lede: "Name the friendship or family dynamic that needs more honesty, warmth, or room. The two halves will hold both voices.",
    examples: ["What does this friendship need from me now?", "How can I meet this family tension differently?", "What remains unspoken between us?", "Where can this bond become more mutual?"]
  },
  "Personal Growth": {
    pathName: "Inner Moon", nextLabel: "Enter the Growth ritual", theme: "growth",
    title: "What within you is ready to change shape?",
    lede: "Name the habit, threshold, or part of yourself you want to meet more clearly. Three cards will trace the movement.",
    examples: ["What pattern am I ready to outgrow?", "Where am I being invited to trust myself?", "What deserves more courage from me?", "What would help me feel more whole?"]
  },
  "General Future": {
    pathName: "The Far Horizon", nextLabel: "Enter the Future ritual", theme: "future",
    title: "Which horizon are you looking toward?",
    lede: "Place an open question about the season ahead. Four directional piles will hold what begins, clarifies, changes, and guides you.",
    examples: ["What is the next season asking of me?", "What change is beginning to gather?", "Where should I place my attention now?", "What can help me meet the months ahead?"]
  },
  Love: {
    pathName: "Love", nextLabel: "Place the question", theme: "",
    title: "What does your heart wish to understand?",
    lede: "Give the question enough room to breathe. It does not need to be yes or no.",
    examples: ["Where is this relationship going?", "What should I understand about this person?", "What is blocking my love life?", "What energy surrounds this connection?"]
  }
};
function renderQuestion() {
  const copy = QUESTION_COPY[state.category] || QUESTION_COPY.Love;
  const themeClass = copy.theme ? `${copy.theme}-parchment` : "";
  const worldClass = copy.theme ? `${copy.theme}-world` : "";
  const sealClass = copy.theme ? `${copy.theme}-seal` : "";
  return world(`<section class="scene"><div class="parchment ${themeClass}"><p class="eyebrow">Oracle Veil · ${t(copy.pathName)}</p><h2>${t(copy.title)}</h2><p>${t(copy.lede)}</p><textarea id="question-input" class="question-box" maxlength="340" placeholder="${t("Write here…")}">${escapeHTML(state.question)}</textarea><ul class="examples">${copy.examples.map((ex) => `<li><button data-example="${escapeHTML(t(ex))}">${t(ex)}</button></li>`).join("")}</ul><div class="question-actions"><button class="back-link" data-action="back-category">${t("Choose another path")}</button><button class="seal-button ${sealClass}" data-action="question-next" ${state.question.trim().length < 4 ? "disabled" : ""}>${t(copy.nextLabel)}</button></div></div></section>`, worldClass);
}
function ritualTitle() {
  const copy = {
    shuffle: ["Loosen the cards beneath your hands.", "Sweep your hand across the loose pile to send a wave through the cards."],
    cutOne: ["Cut the deck where it feels right.", "Use the side view to choose the exact place, then lift there."],
    ritualCard: ["Take the card beneath the lifted pile.", "It will remain hidden: the quiet energy beneath your question."],
    reassembleOne: ["Bring the two remaining piles together.", "Choose which pile belongs on top; both will settle in the center."],
    cutThree: ["Divide the deck into three.", "Place two markers along the side of the deck."],
    reassembleThree: ["Choose the order in which to return the piles.", "Touch the piles from top to bottom, then watch them come home."],
    spread: ["Let the deck open.", "Open the spread and the cards will fan across the table on their own."],
    choose: ["Choose three cards that call to you.", "Touch a card to draw it into the reading."],
    reveal: ["Reveal the story in the order you wish.", "The first turn opens a brief doorway. The others are uninterrupted."],
  };
  const [title, lede] = copy[state.stage] || ["Oracle Veil", ""];
  return `<div class="ritual-head">${progress()}<p class="eyebrow">${t("Love ritual")}</p><h1>${t(title)}</h1><p class="lede">${t(lede)}</p></div>`;
}

function renderRitual() {
  if (state.category === "Career") return renderCareerRitual();
  if (state.category === "Money") return renderMoneyRitual();
  if (state.category === "Decision") return renderDecisionRitual();
  if (state.category === "Friendship / Family") return renderKinRitual();
  if (state.category === "Personal Growth") return renderGrowthRitual();
  if (state.category === "General Future") return renderFutureRitual();
  let surface = "";
  let actions = "";
  if (state.stage === "shuffle") ({ surface, actions } = renderShuffle());
  if (state.stage === "cutOne") ({ surface, actions } = renderCutOne());
  if (state.stage === "ritualCard") ({ surface, actions } = renderRitualCard());
  if (state.stage === "reassembleOne") ({ surface, actions } = renderReassembleOne());
  if (state.stage === "cutThree") ({ surface, actions } = renderCutThree());
  if (state.stage === "reassembleThree") ({ surface, actions } = renderReassembleThree());
  if (state.stage === "spread") ({ surface, actions } = renderSpread());
  if (state.stage === "choose") ({ surface, actions } = renderChoose());
  if (state.stage === "reveal") ({ surface, actions } = renderReveal());
  return world(`<section class="scene ritual">${ritualTitle()}${surface}<div class="ritual-actions">${actions}</div></section>`);
}

function kinTitle() {
  const copy = {
    shuffle: ["Loosen the cards between two voices.", "Sweep across the loose deck until the bond no longer follows its old order."],
    kinCut: ["Divide the deck into two voices.", "Choose the place where your perspective and theirs separate."],
    kinSpreadOne: ["Let your half open.", "The first half spreads for the voice, need, or truth you bring."],
    kinChooseOne: ["Choose the card that sounds like you.", "Touch one card from the first voice."],
    kinSpreadTwo: ["Let their half open.", "The second half spreads for what the other side may be carrying."],
    kinChooseTwo: ["Choose the card that answers from across the bond.", "Touch one card from the second voice."],
    kinReveal: ["Turn over the two voices.", "Read them beside one another. Neither card is a verdict on the other person."]
  };
  const [title, lede] = copy[state.stage] || ["The Bond", ""];
  return `<div class="ritual-head kin-ritual-head">${progress()}<p class="eyebrow">${t("Friendship / Family ritual")}</p><h1>${t(title)}</h1><p class="lede">${t(lede)}</p></div>`;
}
function renderKinRitual() {
  let view = { surface: "", actions: "" };
  if (state.stage === "shuffle") view = renderShuffle();
  if (state.stage === "kinCut") view = renderKinCut();
  if (state.stage === "kinSpreadOne" || state.stage === "kinSpreadTwo") view = renderSpread();
  if (state.stage === "kinChooseOne" || state.stage === "kinChooseTwo") view = renderChoose();
  if (state.stage === "kinReveal") view = renderPositionReveal(KIN_POSITIONS, "kin-reveal-layout");
  return world(`<section class="scene ritual kin-ritual">${kinTitle()}${view.surface}<div class="ritual-actions">${view.actions}</div></section>`, "kin-world");
}
function renderKinCut() {
  return {
    surface: `<div class="table-surface cut-table kin-cut-surface" id="kin-cut-surface">${sideDeckMarkup("two")}<span class="piles-guide">${t("One deck will become two voices.")}</span></div>`,
    actions: `<p class="status-note">${t("Move the marker, then let the deck divide at that exact place.")}</p><button class="seal-button kin-seal" data-action="kin-make-cut">${t("Divide the two voices")}</button>`
  };
}

function growthTitle() {
  const copy = {
    shuffle: ["Loosen the pattern beneath your hands.", "Sweep the cards until the familiar order gives way."],
    spread: ["Let the inner path open.", "The gathered deck spreads directly into one continuous path."],
    choose: ["Choose three moments of becoming.", "Draw a Root, a Threshold, and a Becoming from the open path."],
    growthReveal: ["Turn over the movement within you.", "Three cards trace what formed you, what asks courage, and what is emerging."]
  };
  const [title, lede] = copy[state.stage] || ["Inner Moon", ""];
  return `<div class="ritual-head growth-ritual-head">${progress()}<p class="eyebrow">${t("Personal Growth ritual")}</p><h1>${t(title)}</h1><p class="lede">${t(lede)}</p></div>`;
}
function renderGrowthRitual() {
  let view = { surface: "", actions: "" };
  if (state.stage === "shuffle") view = renderShuffle();
  if (state.stage === "spread") view = renderSpread();
  if (state.stage === "choose") view = renderChoose();
  if (state.stage === "growthReveal") view = renderPositionReveal(GROWTH_POSITIONS, "growth-reveal-layout");
  return world(`<section class="scene ritual growth-ritual">${growthTitle()}${view.surface}<div class="ritual-actions">${view.actions}</div></section>`, "growth-world");
}

function futureTitle() {
  const copy = {
    futureShuffle: ["Disturb the map of what comes next.", "Sweep the full deck until expectation loses its familiar direction."],
    futureCutFour: ["Mark four quarters in the coming sky.", "Place three brass markers to divide the deck into four living directions."],
    futureCompass: ["Give each pile its direction.", "Touch the four piles in the order Dawn, Zenith, Dusk, and Midnight."],
    futureSpread: ["Let the compass breathe open.", "The four directions will fan outward together around the central star."],
    futureChooseDawn: ["Choose from Dawn.", "Draw one card for the first light: what is beginning before it has a name."],
    futureChooseZenith: ["Choose from Zenith.", "Draw one card for what rises into view and asks to be seen clearly."],
    futureChooseDusk: ["Choose from Dusk.", "Draw one card for the pattern that must change, soften, or be released."],
    futureChooseMidnight: ["Choose from Midnight.", "Draw one card for the quiet inner compass that can guide the whole horizon."],
    futureReveal: ["Turn over the four directions.", "The first turn opens a brief doorway. Then the compass reveals without interruption."]
  };
  const [title, lede] = copy[state.stage] || ["The Far Horizon", ""];
  return `<div class="ritual-head future-ritual-head">${progress()}<p class="eyebrow">${t("General Future ritual")}</p><h1>${t(title)}</h1><p class="lede">${t(lede)}</p></div>`;
}
function renderFutureRitual() {
  let view = { surface: "", actions: "" };
  if (state.stage === "futureShuffle") view = renderShuffle();
  if (state.stage === "futureCutFour") view = renderFutureCutFour();
  if (state.stage === "futureCompass") view = renderFutureCompass();
  if (state.stage === "futureSpread") view = renderFutureSpread();
  if (state.stage.startsWith("futureChoose")) view = renderFutureChoose();
  if (state.stage === "futureReveal") view = renderPositionReveal(FUTURE_POSITIONS, "future-reveal-layout");
  return world(`<section class="scene ritual future-ritual">${futureTitle()}${view.surface}<div class="ritual-actions">${view.actions}</div></section>`, "future-world");
}

function careerTitle() {
  const scattering = state.stage === "careerEmbers" && state.career.phase !== "pick";
  const copy = {
    careerEmbers: scattering
      ? ["Loosen the cards beneath your hands.", "Sweep across the table—these cards scatter apart instead of gathering."]
      : ["Wake the embers in your deck.", "Touch three cards that feel alive. They will become the sparks beneath your path."],
    careerCut: ["Cut the gathered deck into two.", "Choose where the two remaining paths separate."],
    careerSpreadOne: ["Open the first pile.", "Spread the first half and let one card become Your Leverage."],
    careerChooseOne: ["Choose one card from the first spread.", "This card will become Your Leverage."],
    careerSpreadTwo: ["Open the second pile.", "Spread the second half and let one card become The Next Bold Move."],
    careerChooseTwo: ["Choose one card from the second spread.", "This card will become The Next Bold Move."],
    careerReveal: ["Turn over the path you have built.", "Five cards now hold the arc from where you stand to your next bold move."]
  };
  const [title, lede] = copy[state.stage] || ["Career Compass", ""];
  return `<div class="ritual-head career-ritual-head">${progress()}<p class="eyebrow">${t("Career ritual")}</p><h1>${t(title)}</h1><p class="lede">${t(lede)}</p></div>`;
}
function renderCareerRitual() {
  let view = { surface: "", actions: "" };
  if (state.stage === "careerEmbers") view = renderCareerEmbers();
  if (state.stage === "careerCut") view = renderCareerCut();
  if (state.stage === "careerSpreadOne" || state.stage === "careerSpreadTwo") view = renderSpread();
  if (state.stage === "careerChooseOne" || state.stage === "careerChooseTwo") view = renderChoose();
  if (state.stage === "careerReveal") view = renderCareerReveal();
  return world(`<section class="scene ritual career-ritual">${careerTitle()}${view.surface}<div class="ritual-actions">${view.actions}</div></section>`, "career-world");
}
function careerScatter() {
  if (!state.career.scatter?.length) state.career.scatter = buildCareerScatter(state.seed);
  return state.career.scatter;
}
// The engraved guide is an ellipse on screen. Keep each card's centre inside it even
// after repeated sweeps and neighbour-separation passes.
function confineCareerScatterPoint(piece) {
  const radiusX = 43;
  const radiusY = 43;
  const dx = piece.x - 50;
  const dy = piece.y - 50;
  const distance = Math.hypot(dx / radiusX, dy / radiusY);
  if (distance > 1) {
    piece.x = 50 + dx / distance;
    piece.y = 50 + dy / distance;
  }
  piece.x = Number(piece.x.toFixed(2));
  piece.y = Number(piece.y.toFixed(2));
  return piece;
}
function renderCareerEmbers() {
  const picking = state.career.phase === "pick";
  const chosen = new Set(state.career.emberIds);
  const moves = state.career.shuffleMoves || 0;
  const ready = moves >= 3;
  // Every scattered card is a real position in the deck, so the sweep that reorders
  // the deck underneath also reshuffles which card each face-down back is hiding.
  const field = careerScatter().map((piece, index) => {
    const card = state.deck[index];
    if (!card) return "";
    const awake = chosen.has(card.id);
    const pick = picking ? `data-action="career-ember" data-card-id="${card.id}" aria-pressed="${awake}"` : "";
    const label = picking ? (awake ? "Awake ember" : "Wake this card") : `${t("Move card")} ${index + 1}`;
    return `<button class="career-ember-card card back ${awake ? "awake" : ""}" data-shuffle-index="${index}" ${pick} aria-label="${label}" style="--x:${piece.x}%;--y:${piece.y}%;--r:${piece.r}deg;--z:${piece.z}"></button>`;
  }).join("");
  // The overlay line only guides the sweep; while choosing, the heading and status note
  // already say what to do, so the table stays clear.
  const instruction = picking ? "" : t("Sweep across the table—these cards scatter apart instead of gathering.");
  const guide = picking
    ? `${state.career.emberIds.length}/3 ${t("embers awake")}`
    : moves
      ? `${moves} ${t("sweeps · keep scattering or lay them out")}`
      : t("Drag through the cards—they push each other apart");
  const surface = `<div class="table-surface career-ember-surface" id="career-scatter-surface"><div class="career-orbit ${picking ? "picking" : ""} ${picking && chosen.size ? "has-selection" : ""}" aria-label="A scatter of face-down cards">${field}<div class="career-forge-mark" aria-hidden="true"><span>⌁</span><i></i><i></i><i></i></div></div>${instruction ? `<p class="physical-instruction ${moves ? "quiet" : ""}">${instruction}</p>` : ""}<span class="piles-guide" id="career-scatter-guide">${guide}</span></div>`;
  if (picking) {
    return {
      surface,
      actions: `<p class="status-note">${t("Touch any three cards. There is no wrong constellation.")}</p><button class="text-button" data-action="career-scatter-again">${t("Scatter them again")}</button><button class="seal-button career-seal" data-action="career-raise" ${state.career.emberIds.length === 3 ? "" : "disabled"}>${t("Keep these three and gather the rest")}</button>`
    };
  }
  return {
    surface,
    actions: `<p class="status-note" id="career-scatter-status">${ready ? t("The cards lie apart. Lay them out when you are ready.") : `${3 - moves} ${t("more sweeps will scatter the deck.")}`}</p><button class="text-button" data-action="assist-career-scatter">${t("Scatter them for me")}</button><button class="seal-button career-seal" data-action="career-scatter-done" ${ready ? "" : "disabled"}>${t("Lay them out to choose")}</button>`
  };
}
function updateCareerEmberSelection(card) {
  const id = card?.dataset.cardId;
  if (!id) return;
  const selected = state.career.emberIds.includes(id);
  card.classList.toggle("awake", selected);
  card.setAttribute("aria-pressed", String(selected));
  card.setAttribute("aria-label", selected ? "Awake ember" : "Wake this card");
  card.closest(".career-orbit")?.classList.toggle("has-selection", state.career.emberIds.length > 0);
  const guide = document.querySelector("#career-scatter-guide");
  if (guide) guide.textContent = `${state.career.emberIds.length}/3 ${t("embers awake")}`;
  const gather = document.querySelector('[data-action="career-raise"]');
  if (gather) gather.disabled = state.career.emberIds.length !== 3;
}
function renderCareerCut() {
  return {
    surface: `<div class="table-surface cut-table career-cut-surface" id="career-cut-surface">${sideDeckMarkup("two")}<span class="piles-guide">${t("Your three chosen cards are held aside. Cut the gathered deck into two.")}</span></div>`,
    actions: `<p class="status-note">${t("Move the marker, then divide the gathered deck into two piles.")}</p><button class="seal-button career-seal" data-action="career-make-cut">${t("Make two piles")}</button>`
  };
}
function renderCareerReveal() {
  const cards = readingCards();
  preloadCardArt(cards);
  return {
    surface: `<div class="reveal-layout career-reveal-layout">${cards.map((card, index) => {
      const revealed = state.revealedIds.includes(card.id);
      return `<div class="reveal-slot"><button class="card reveal-card ${card.reversed ? "reversed" : ""} ${revealed ? "flipped" : ""}" data-action="reveal-card" data-card-id="${card.id}" ${revealed ? "disabled" : ""} aria-label="${revealed ? `${card.name}, ${t(card.reversed ? "Reversed" : "Upright").toLowerCase()}` : `${t("Reveal")} ${t(CAREER_POSITIONS[index])}`}"><span class="card-inner"><span class="card-side back"></span><span class="card-side front">${faceInner(card)}</span></span></button><span class="label">${t(CAREER_POSITIONS[index])}</span><span class="orientation ${revealed ? "" : "is-hidden"}">${t(card.reversed ? "Reversed" : "Upright")}</span></div>`;
    }).join("")}</div>`,
    actions: revealActions()
  };
}

function moneyTitle() {
  const vessel = t(MONEY_VESSELS[state.money.pileStep] || "Keep");
  const copy = {
    // Reuses Love's exact "shuffle" and "cutThree" copy — the gesture is identical.
    shuffle: ["Loosen the cards beneath your hands.", "Sweep your hand across the loose pile to send a wave through the cards."],
    cutThree: ["Divide the deck into three.", "Place two markers along the side of the deck."],
    pileOrder: ["Choose the order of the three piles.", "Touch the piles left to right, in the order you want them to sit on the table."],
    spread: ["Let this pile open.", "The pile opens directly into a spread."],
    choose: ["Choose the card that calls to you.", "Touch a card to draw it into the reading."],
    moneyReveal: ["Turn over the three cards you chose.", "Each pile gave you exactly one card, in the order you set: Keep, Grow, and Flow."]
  };
  const [title, lede] = copy[state.stage] || ["Money Ledger", ""];
  const vesselSuffix = (state.stage === "spread" || state.stage === "choose") ? ` · ${vessel}` : "";
  return `<div class="ritual-head money-ritual-head">${progress()}<p class="eyebrow">${t("Money ritual")}${vesselSuffix}</p><h1>${t(title)}</h1><p class="lede">${t(lede)}</p></div>`;
}
function renderMoneyRitual() {
  let view = { surface: "", actions: "" };
  if (state.stage === "shuffle") view = renderShuffle();
  if (state.stage === "cutThree") view = renderCutThree();
  if (state.stage === "pileOrder") view = renderReassembleThree();
  if (state.stage === "spread") view = renderSpread();
  if (state.stage === "choose") view = renderChoose();
  if (state.stage === "moneyReveal") view = renderMoneyReveal();
  return world(`<section class="scene ritual money-ritual">${moneyTitle()}${view.surface}<div class="ritual-actions">${view.actions}</div></section>`, "money-world");
}
function renderMoneyReveal() {
  const cards = readingCards();
  preloadCardArt(cards);
  return {
    surface: `<div class="reveal-layout money-reveal-layout">${cards.map((card, index) => {
      const revealed = state.revealedIds.includes(card.id);
      return `<div class="reveal-slot"><button class="card reveal-card ${card.reversed ? "reversed" : ""} ${revealed ? "flipped" : ""}" data-action="reveal-card" data-card-id="${card.id}" ${revealed ? "disabled" : ""} aria-label="${revealed ? `${card.name}, ${t(card.reversed ? "Reversed" : "Upright").toLowerCase()}` : `${t("Reveal")} ${t(MONEY_POSITIONS[index])}`}"><span class="card-inner"><span class="card-side back"></span><span class="card-side front">${faceInner(card)}</span></span></button><span class="label">${t(MONEY_POSITIONS[index])}</span><span class="orientation ${revealed ? "" : "is-hidden"}">${t(card.reversed ? "Reversed" : "Upright")}</span></div>`;
    }).join("")}</div>`,
    actions: revealActions()
  };
}

function decisionTitle() {
  const copy = {
    decisionShuffle: ["Loosen the cards beneath your hands.", "Sweep your hand across the loose pile to send a wave through the cards."],
    decisionCut: ["Cut the deck where it feels right.", "Use the side view to choose the exact place, then lift there."],
    decisionFuse: ["Mix the two halves back together.", "Watch the cards alternate from each pile into a newly mixed deck."],
    decisionSpread: ["Let the deck open.", "Open the spread and the cards will fan across the table on their own."],
    decisionChoose: ["Choose one card that calls to you.", "Touch a card to carry it into the reveal."],
    decisionReveal: ["Turn over the card you chose.", "Its face is still veiled. Reveal it when you are ready."]
  };
  const [title, lede] = copy[state.stage] || ["Crossroads", ""];
  return `<div class="ritual-head decision-ritual-head">${progress()}<p class="eyebrow">${t("Decision ritual")}</p><h1>${t(title)}</h1><p class="lede">${t(lede)}</p></div>`;
}
function renderDecisionRitual() {
  let view = { surface: "", actions: "" };
  if (state.stage === "decisionShuffle") view = renderShuffle();
  if (state.stage === "decisionCut") view = renderDecisionCut();
  if (state.stage === "decisionFuse") view = renderDecisionFuse();
  if (state.stage === "decisionSpread") view = renderSpread();
  if (state.stage === "decisionChoose") view = renderDecisionChoose();
  if (state.stage === "decisionReveal") view = renderDecisionReveal();
  return world(`<section class="scene ritual decision-ritual">${decisionTitle()}${view.surface}<div class="ritual-actions">${view.actions}</div></section>`, "decision-world");
}
function renderDecisionCut() {
  return {
    surface: `<div class="table-surface cut-table decision-cut-surface" id="decision-cut-surface">${sideDeckMarkup("two")}<span class="piles-guide">${t("The deck is shown from the side so every possible cut is reachable.")}</span></div>`,
    actions: `<p class="status-note">${t("Move the marker, then lift the deck at that exact place.")}</p><button class="seal-button decision-seal" data-action="decision-make-cut">${t("Lift at this point")}</button>`
  };
}
function renderDecisionFuse() {
  const riffleCards = Array.from({ length: 20 }, (_, index) => {
    const from = index % 2 ? "10rem" : "-10rem";
    const near = index % 2 ? "1.3rem" : "-1.3rem";
    const tilt = index % 2 ? "7deg" : "-7deg";
    const counterTilt = index % 2 ? "-1.75deg" : "1.75deg";
    const settle = `${(index - 9.5) * -.42}px`;
    return `<i class="decision-riffle-card card back" style="--i:${index};--from:${from};--near:${near};--tilt:${tilt};--counter-tilt:${counterTilt};--settle:${settle}" aria-hidden="true"></i>`;
  }).join("");
  return {
    surface: `<div class="table-surface centered-table decision-fuse-surface" id="decision-fuse-surface"><div class="pile-field two decision-fuse-field">${pileMarkup(state.piles[0] || [], "0", `${t("pile")} 1`)}${pileMarkup(state.piles[1] || [], "1", `${t("pile")} 2`)}</div><div class="decision-riffle-stream" aria-hidden="true">${riffleCards}</div><span class="decision-fuse-sigil" aria-hidden="true">⚭</span><span class="piles-guide">${t("Two halves, one deck.")}</span></div>`,
    actions: `<p class="status-note">${t("One touch will interleave the two halves into a newly mixed deck.")}</p><button class="seal-button decision-seal" data-action="decision-fuse">${t("Mix the two piles")}</button>`
  };
}
function renderDecisionChoose() {
  const spread = state.spread || createDefaultSpread();
  return {
    surface: `<div class="table-surface decision-choose-surface"><div class="spread-layer">${state.deck.map((card, index) => {
      const p = positionForSpread(index, state.deck.length, spread);
      return `<div class="spread-card" style="left:${p.x}%;top:${p.y}%;z-index:${index + 1};transform:translate(-50%,-50%) rotate(${p.rotation + card.microRotation}deg)"><button class="card back" data-action="pick-decision-card" data-card-id="${card.id}" aria-label="${t("Select a face-down card")}"></button></div>`;
    }).join("")}</div><div class="draw-dock decision-draw-dock"><span class="dock-title">${t("Chosen")} · 0/1</span><span class="decision-dock-sigil" aria-hidden="true">⚭</span></div></div>`,
    actions: `<p class="status-note">${t("One card will remain.")}</p>`
  };
}
function renderDecisionReveal() {
  const [card] = readingCards();
  if (!card) return { surface: "", actions: "" };
  preloadCardArt(card);
  const revealed = state.revealedIds.includes(card.id);
  const pending = state.ad?.cardId === card.id;
  return {
    surface: `<div class="reveal-layout decision-reveal-layout"><div class="reveal-slot"><button class="card reveal-card ${card.reversed ? "reversed" : ""} ${revealed ? "flipped" : ""} ${pending ? "flip-pending" : ""}" data-action="reveal-card" data-card-id="${card.id}" ${revealed ? "disabled" : ""} aria-label="${revealed ? `${card.name}, ${t(card.reversed ? "Reversed" : "Upright").toLowerCase()}` : `${t("Reveal")} ${t("The Chosen Card")}`}"><span class="card-inner"><span class="card-side back"></span><span class="card-side front">${faceInner(card)}</span></span></button><span class="label">${t("The Chosen Card")}</span><span class="orientation ${revealed ? "" : "is-hidden"}">${t(card.reversed ? "Reversed" : "Upright")}</span></div></div>`,
    actions: revealActions()
  };
}
function renderShuffle() {
  const ready = state.shuffleMoves >= 3;
  const pieces = state.shuffleLayout?.length ? state.shuffleLayout : buildShuffleLayout(state.seed);
  const sealClass = state.category === "Money" ? "money-seal"
    : state.category === "Friendship / Family" ? "kin-seal"
      : state.category === "Personal Growth" ? "growth-seal"
        : state.category === "General Future" ? "future-seal" : "";
  return {
    surface: `<div class="table-surface shuffle-table" id="shuffle-surface"><div class="scatter-pile" aria-label="A loose pile of face-down tarot cards">${pieces.map((piece, index) => `<button class="shuffle-card card back" data-shuffle-index="${index}" aria-label="${t("Move card")} ${index + 1}" style="--x:${piece.x}%;--y:${piece.y}%;--r:${piece.r}deg;--z:${piece.z}"></button>`).join("")}</div><p class="physical-instruction ${state.shuffleMoves ? "quiet" : ""}">${t("Sweep across the loose cards to send a wave through the pile.")}</p><span class="piles-guide" id="shuffle-guide">${state.shuffleMoves ? `${state.shuffleMoves} ${t("physical moves · keep mixing or gather them")}` : t("Drag through the cards—a wave ripples across the pile")}</span></div>`,
    actions: `<p class="status-note" id="shuffle-status">${ready ? t("The cards feel mixed. Gather them when you are ready.") : `${3 - state.shuffleMoves} ${t("more moves will loosen the order.")}`}</p><button class="text-button" data-action="assist-shuffle">${t("Send a wave for me")}</button><button class="seal-button ${sealClass}" data-action="shuffle-done" ${ready ? "" : "disabled"}>${t("Gather into a deck")}</button>`
  };
}
function cutMood(value, total) {
  const ratio = value / Math.max(1, total);
  if (ratio < .34) return t("a light upper packet");
  if (ratio > .66) return t("a deep upper packet");
  return t("a balanced division");
}
function sideDeckMarkup(mode) {
  const total = state.deck.length;
  const four = mode === "four";
  const draft = mode === "two" ? state.cutDraft : four ? state.future.cutDraft : state.threeCutDraft;
  const settled = mode === "three"
    ? [...state.threeCuts].sort((a, b) => a - b)
    : four
      ? [...state.future.cuts].sort((a, b) => a - b)
      : [];
  const markers = settled.map((cut, index) => `<i class="cut-marker settled" style="top:${cut / total * 100}%" aria-hidden="true"><span>${index + 1}</span></i>`).join("");
  const boundaries = mode === "two" ? [draft] : [...settled, draft].sort((a, b) => a - b);
  const all = [0, ...boundaries, total];
  const segments = all.slice(0, -1).map((start, index) => `<div class="edge-segment segment-${index + 1}" style="top:${start / total * 100}%;height:${(all[index + 1] - start) / total * 100}%"></div>`).join("");
  const rangeId = mode === "two" ? "first-cut-range" : four ? "future-cut-range" : "three-cut-range";
  return `<div class="cut-workbench" data-cut-mode="${mode}" style="--cut-pos:${draft / total * 100}%"><p class="side-label">${t("Side view · slide the brass marker up and down between the card edges")}</p><div class="cut-stage"><div class="side-deck" data-motion-key="main-deck">${segments}${markers}<i class="cut-marker active" aria-hidden="true"><span>${four ? "☉" : "✦"}</span></i></div><input class="cut-range" id="${rangeId}" type="range" min="${four ? 8 : 9}" max="${total - (four ? 8 : 9)}" value="${draft}" aria-label="${t("Choose where to cut the deck")}"></div><p class="cut-reading" id="cut-reading">${cutMood(draft, total)}</p></div>`;
}
function renderCutOne() {
  return { surface: `<div class="table-surface cut-table" id="cut-one-surface">${sideDeckMarkup("two")}<span class="piles-guide">${t("The deck is shown from the side so every possible cut is reachable.")}</span></div>`, actions: `<p class="status-note">${t("Move the marker, then lift the deck at that exact place.")}</p><button class="seal-button" data-action="make-first-cut">${t("Lift at this point")}</button>` };
}
function stackLayers() {
  return `<div class="stack-card"></div><div class="stack-card"></div><div class="stack-card"></div><div class="stack-card"></div>`;
}
function hiddenCardPosition() {
  return "Hidden Heart";
}
function pileMarkup(cards, key, label, options = {}) {
  const { action = "", selected = false, order = null, extra = "" } = options;
  const tag = action ? "button" : "div";
  const actionAttrs = action ? ` data-action="${action}" data-pile-index="${key}" aria-pressed="${selected}"` : "";
  return `<${tag} class="pile ${extra} ${selected ? "chosen" : ""}" data-pile="${key}"${actionAttrs} style="--order:${order ?? 0}">${stackLayers()}${order !== null ? `<span class="order-badge">${order + 1}</span>` : ""}<span class="pile-label">${label} · ${cards.length} ${t("cards")}</span></${tag}>`;
}
function renderRitualCard() {
  const top = state.piles[0] || [];
  const bottom = state.piles[1] || [];
  const hidden = hiddenCardPosition();
  return { surface: `<div class="table-surface centered-table" id="ritual-card-surface"><div class="pile-field two">${pileMarkup(top, "0", t("lifted packet"), { extra: "lifted" })}${pileMarkup(bottom, "1", t("resting packet"))}<button class="ritual-draw-card card back" data-action="take-ritual" aria-label="${t("Draw the hidden card from beneath the lifted packet")}"></button></div><div class="hidden-heart-slot"><span>${t(hidden)}</span><i>${t("one card waits here")}</i></div></div>`, actions: `<p class="status-note">${t("The card directly beneath the lifted packet becomes the Hidden Heart.")}</p><button class="seal-button" data-action="take-ritual">${t("Draw the hidden card")}</button>` };
}
function renderReassembleOne() {
  return { surface: `<div class="table-surface centered-table" id="reassemble-one-surface"><div class="pile-field two choose-field">${pileMarkup(state.piles[0] || [], "0", `${t("pile")} 1`, { action: "choose-two-top", selected: state.twoTop === 0 })}${pileMarkup(state.piles[1] || [], "1", `${t("pile")} 2`, { action: "choose-two-top", selected: state.twoTop === 1 })}</div><div class="hidden-heart-slot filled"><span>${t(hiddenCardPosition())}</span>${cardBack("selected")}</div></div>`, actions: `<p class="status-note">${t("Tap the pile you want on top. Both piles will meet in the center.")}</p><button class="seal-button" data-action="join-two" ${state.twoTop === null ? "disabled" : ""}>${t("Stack with this pile on top")}</button>` };
}
function renderCutThree() {
  const cuts = state.threeCuts.length;
  const money = state.category === "Money";
  const sealClass = money ? "money-seal" : "";
  return { surface: `<div class="table-surface cut-table" id="cut-three-surface">${sideDeckMarkup("three")}<span class="piles-guide">${cuts === 0 ? t("Place the first marker") : t("First marker set · choose a different place for the second")}</span></div>`, actions: `<p class="status-note">${cuts === 0 ? t("Choose the first break in the side of the deck.") : t("Choose the second break. The two markers will form three piles.")}</p><button class="seal-button ${sealClass}" data-action="place-three-cut">${cuts === 0 ? t("Place first cut") : t("Make three piles")}</button>` };
}
function renderReassembleThree() {
  const selected = state.assemblyOrder;
  const money = state.category === "Money";
  const heartSlot = money ? "" : `<div class="hidden-heart-slot filled compact"><span>${t(hiddenCardPosition())}</span>${cardBack("selected")}</div>`;
  const status = selected.length
    ? `${selected.length} ${t(money ? "of 3 chosen · numbers show the left-to-right order" : "of 3 chosen · numbers show the top-to-bottom order")}`
    : t(money ? "Tap the pile that should sit first, on the left." : "Tap the pile that should return first (on top).");
  const sealClass = money ? "money-seal" : "";
  return { surface: `<div class="table-surface centered-table" id="reassemble-three-surface"><div class="pile-field three choose-field">${state.piles.map((pile, index) => { const order = selected.indexOf(index); return pileMarkup(pile, String(index), `${t("pile")} ${index + 1}`, { action: "choose-pile", selected: order >= 0, order: order >= 0 ? order : null }); }).join("")}</div>${heartSlot}</div>`, actions: `<p class="status-note">${status}</p><button class="seal-button ${sealClass}" data-action="reassemble-three" ${selected.length === 3 ? "" : "disabled"}>${t(money ? "Set this order" : "Stack in this order")}</button>` };
}
function normalizeFutureCut(raw) {
  const total = state.deck.length;
  const minGap = 10;
  const value = clamp(Math.round(raw || total * .25), minGap, total - minGap);
  if ([0, total, ...state.future.cuts].every((boundary) => Math.abs(value - boundary) >= minGap)) return value;
  const candidates = Array.from({ length: total - minGap * 2 + 1 }, (_, index) => index + minGap)
    .filter((candidate) => [0, total, ...state.future.cuts].every((boundary) => Math.abs(candidate - boundary) >= minGap))
    .sort((a, b) => Math.abs(a - value) - Math.abs(b - value));
  return candidates[0] ?? null;
}
function nextFutureCutDraft() {
  const total = state.deck.length;
  const targets = [total * .25, total * .5, total * .75].map(Math.round);
  const unused = targets.find((target) => [0, total, ...state.future.cuts].every((boundary) => Math.abs(target - boundary) >= 10));
  return normalizeFutureCut(unused ?? total * .5) ?? Math.round(total * .5);
}
function renderFutureCutFour() {
  const cuts = state.future.cuts.length;
  const labels = ["Place the Dawn marker", "Place the Zenith marker", "Complete the four quarters"];
  const guide = cuts
    ? `${cuts} ${t(cuts === 1 ? "direction marked · choose the next break" : "directions marked · choose the final break")}`
    : t("Place the first of three directional markers");
  return {
    surface: `<div class="table-surface cut-table future-cut-surface" id="future-cut-surface">${sideDeckMarkup("four")}<span class="piles-guide">${guide}</span></div>`,
    actions: `<p class="status-note">${t("Each marker creates another quarter of the coming sky.")}</p><button class="seal-button future-seal" data-action="place-future-cut">${t(labels[cuts] || labels[2])}</button>`
  };
}
function renderFutureCompass() {
  const selected = state.future.order;
  const nextDirection = FUTURE_DIRECTIONS[selected.length] || FUTURE_DIRECTIONS[3];
  const piles = state.piles.map((pile, index) => {
    const order = selected.indexOf(index);
    const label = order >= 0 ? t(FUTURE_DIRECTIONS[order]) : `${t("pile")} ${index + 1}`;
    return pileMarkup(pile, String(index), label, { action: "choose-future-pile", selected: order >= 0, order: order >= 0 ? order : null, extra: `future-compass-pile future-compass-pile-${index}` });
  }).join("");
  const status = selected.length < 4
    ? `${t("Choose the pile that belongs to")} ${t(nextDirection)} · ${selected.length}/4`
    : t("The four directions are named. Set the compass in motion.");
  return {
    surface: `<div class="table-surface future-compass-surface" id="future-compass-surface"><div class="future-compass-ring" aria-hidden="true"><i></i><b>☉</b><span class="north">N</span><span class="east">E</span><span class="south">S</span><span class="west">W</span></div><div class="future-compass-piles">${piles}</div><span class="piles-guide">${t("Touch a named pile again to release it and choose anew.")}</span></div>`,
    actions: `<p class="status-note">${status}</p><button class="seal-button future-seal" data-action="align-future-compass" ${selected.length === 4 ? "" : "disabled"}>${t("Align the four directions")}</button>`
  };
}
function futurePreviewCards(direction) {
  return Array.from({ length: 11 }, (_, index) => `<i class="future-preview-card card back" style="--fp:${index};--direction:${direction}" aria-hidden="true"></i>`).join("");
}
function renderFutureSpread() {
  const quarters = state.piles.map((pile, index) => `<div class="future-quarter quarter-${index}"><div class="future-quarter-stack">${stackLayers()}</div><div class="future-preview-fan">${futurePreviewCards(index)}</div><span>${t(FUTURE_DIRECTIONS[index])} · ${pile.length}</span></div>`).join("");
  return {
    surface: `<div class="table-surface future-spread-surface" id="future-spread-surface"><div class="future-compass-star" aria-hidden="true"><i></i><b>☉</b></div>${quarters}<span class="piles-guide">${t("Four quarters, opening as one sky.")}</span></div>`,
    actions: `<p class="status-note">${t("Watch each direction unfold around the compass.")}</p>`
  };
}
function futureStep() {
  const stages = ["futureChooseDawn", "futureChooseZenith", "futureChooseDusk", "futureChooseMidnight"];
  return Math.max(0, stages.indexOf(state.stage));
}
function futureSpreadPath(direction) {
  return [
    { start: { x: 31, y: 24 }, end: { x: 69, y: 24 }, bend: { x: 0, y: -7 }, rotation: 28 },
    { start: { x: 76, y: 31 }, end: { x: 76, y: 69 }, bend: { x: 7, y: 0 }, rotation: 28 },
    { start: { x: 69, y: 76 }, end: { x: 31, y: 76 }, bend: { x: 0, y: 7 }, rotation: 28 },
    { start: { x: 24, y: 69 }, end: { x: 24, y: 31 }, bend: { x: -7, y: 0 }, rotation: 28 }
  ][direction];
}
function renderFutureChoose() {
  const active = futureStep();
  const picked = new Set(state.future.selectedIds);
  const cards = state.piles.map((pile, pileIndex) => pile.map((card, index) => {
    const p = positionForSpread(index, pile.length, futureSpreadPath(pileIndex));
    const isPicked = picked.has(card.id);
    const selectable = pileIndex === active && !isPicked;
    return `<div class="future-spread-card ${selectable ? "is-active" : ""} ${isPicked ? "picked" : ""} direction-${pileIndex}" style="left:${p.x}%;top:${p.y}%;z-index:${pileIndex * 100 + index + 1};transform:translate(-50%,-50%) rotate(${p.rotation + card.microRotation}deg)"><button class="card back" ${selectable ? `data-action="pick-future-card" data-card-id="${card.id}" data-pile-index="${pileIndex}"` : "disabled"} aria-label="${selectable ? t("Select a face-down card") : t(FUTURE_DIRECTIONS[pileIndex])}"></button></div>`;
  }).join("")).join("");
  const labels = FUTURE_DIRECTIONS.map((direction, index) => `<span class="future-direction-label direction-${index} ${index === active ? "is-active" : ""} ${index < active ? "is-done" : ""}">${t(direction)}<i>${index < active ? "✓" : index === active ? "✦" : ""}</i></span>`).join("");
  const kept = state.future.selectedIds.map((id, index) => `<div class="future-kept-card" style="--kept:${index}">${cardBack("selected")}</div>`).join("");
  return {
    surface: `<div class="table-surface future-choose-surface"><div class="future-spread-layer">${cards}</div>${labels}<div class="future-compass-dock"><span>${state.future.selectedIds.length}/4</span><b aria-hidden="true">☉</b><div class="future-kept-row">${kept}</div></div></div>`,
    actions: `<p class="status-note">${t("Only")} ${t(FUTURE_DIRECTIONS[active])} ${t("is awake. Choose one card from its quarter.")}</p>`
  };
}
function renderSpread() {
  const money = state.category === "Money";
  const career = state.category === "Career";
  const kin = state.category === "Friendship / Family";
  const growth = state.category === "Personal Growth";
  const guide = money
    ? `${t(MONEY_VESSELS[state.money.pileStep])} · ${state.deck.length} ${t("cards")}`
    : career
      ? `${t(CAREER_POSITIONS[3 + state.career.pileStep])} · ${state.deck.length} ${t("cards")}`
      : kin
        ? `${t(KIN_POSITIONS[state.kin.pileStep])} · ${state.deck.length} ${t("cards")}`
        : growth
          ? `${t("Three moments")} · ${state.deck.length} ${t("cards")}`
          : t("One touch fans every card into a reading arc");
  const sealClass = money ? "money-seal" : career ? "career-seal" : kin ? "kin-seal" : growth ? "growth-seal" : "";
  const actions = money || career || kin || growth
    ? `<p class="status-note">${t("The pile opens directly into a spread.")}</p>`
    : `<p class="status-note">${t("Open the spread and the cards fan across the table.")}</p><button class="seal-button ${sealClass}" data-action="assist-spread">${t("Open the spread")}</button>`;
  return { surface: `<div class="table-surface" id="spread-surface"><div class="spread-preview-layer" aria-hidden="true"></div>${deckBackStack("")}<span class="piles-guide">${guide}</span></div>`, actions };
}
function positionForSpread(index, total, path) {
  const t = index / Math.max(1, total - 1);
  const start = path.start, end = path.end, bend = path.bend;
  const x = start.x + (end.x - start.x) * t + bend.x * Math.sin(Math.PI * t);
  const y = start.y + (end.y - start.y) * t + bend.y * Math.sin(Math.PI * t);
  return { x: clamp(x, 4, 91), y: clamp(y, 10, 81), rotation: (t - .5) * path.rotation + Math.sin(t * 11) * .35 };
}
function renderChoose() {
  const spread = state.spread || createDefaultSpread();
  const picked = new Set(state.selectedIds);
  const drawn = state.selectedIds.length;
  const money = state.category === "Money";
  const career = state.category === "Career";
  const kin = state.category === "Friendship / Family";
  const growth = state.category === "Personal Growth";
  const cap = money || career || kin ? 1 : 3;
  const dock = money
    ? `<div class="draw-dock"><span class="dock-title">${t(MONEY_VESSELS[state.money.pileStep])}</span><div class="drawn-row">${drawn ? cardBack("selected") : ""}</div></div>`
    : career
      ? `<div class="draw-dock"><span class="dock-title">${t(CAREER_POSITIONS[3 + state.career.pileStep])} · ${drawn}/1</span><div class="drawn-row">${drawn ? cardBack("selected") : ""}</div></div>`
      : kin
        ? `<div class="draw-dock"><span class="dock-title">${t(KIN_POSITIONS[state.kin.pileStep])} · ${drawn}/1</span><div class="drawn-row">${drawn ? cardBack("selected") : ""}</div></div>`
        : `<div class="draw-dock"><span class="dock-title">${t(growth ? "Moments" : "Drawn")} · ${drawn}/3</span><div class="drawn-row">${state.selectedIds.map((id, index) => `<div style="--dock-r:${index === 1 ? 0 : index ? 5 : -5}deg">${cardBack("selected")}</div>`).join("")}</div></div>`;
  const status = money
    ? (drawn ? t("One card has moved into the center.") : t("Tap any face-down card from this pile."))
    : career
      ? (drawn ? t("One card has joined your constellation.") : t("Choose one face-down card from this spread."))
      : kin
        ? (drawn ? t("One voice has moved into the reading.") : t("Choose one face-down card from this voice."))
        : (drawn ? `${drawn} ${t(drawn === 1 ? "card has moved into the center tray." : "cards have moved into the center tray.")}` : t("Tap any face-down card. It will travel into the center tray."));
  const buttonLabel = money
    ? (state.money.pileStep === 2 ? t("Open the treasury") : t("Take this card"))
    : career
      ? t(state.career.pileStep === 0 ? "Continue to the second pile" : "Reveal the constellation")
      : kin
        ? t(state.kin.pileStep === 0 ? "Continue to the second voice" : "Reveal the bond")
        : growth
          ? t("Place the three moments")
          : t("Place the four cards");
  const sealClass = money ? "money-seal" : career ? "career-seal" : kin ? "kin-seal" : growth ? "growth-seal" : "";
  return { surface: `<div class="table-surface"><div class="spread-layer">${state.deck.map((card, index) => {
    const p = positionForSpread(index, state.deck.length, spread);
    const isPicked = picked.has(card.id);
    return `<div class="spread-card ${isPicked ? "picked" : ""}" style="left:${p.x}%;top:${p.y}%;z-index:${index + 1};transform:translate(-50%,-50%) rotate(${p.rotation + card.microRotation}deg)"><button class="card back ${isPicked ? "selected" : ""}" data-action="pick-card" data-card-id="${card.id}" aria-label="${t("Select a face-down card")}"></button></div>`;
  }).join("")}</div>${dock}</div>`, actions: `<p class="status-note">${status}</p><button class="seal-button ${sealClass}" data-action="to-reveal" ${drawn === cap ? "" : "disabled"}>${buttonLabel}</button>` };
}
function revealActions() {
  const done = state.revealedIds.length === readingPositions().length;
  const waiting = state.category === "Decision"
    ? t("Turn over your chosen card when you are ready.")
    : t("There is no required order.");
  return `<p class="status-note">${done ? t("The reading is ready to be gathered.") : waiting}</p>${done ? `<button class="seal-button" data-action="open-reading">${t("Gather the reading")}</button>` : ""}`;
}
function renderReveal() {
  const cards = readingCards();
  const positions = readingPositions();
  preloadCardArt(cards); // ensure art is warming even on a reload straight into this stage
  return { surface: `<div class="reveal-layout">${cards.map((card, index) => {
    const revealed = state.revealedIds.includes(card.id);
    const pending = state.ad?.cardId === card.id;
    return `<div class="reveal-slot"><button class="card reveal-card ${card.reversed ? "reversed" : ""} ${revealed ? "flipped" : ""} ${pending ? "flip-pending" : ""}" data-action="reveal-card" data-card-id="${card.id}" ${revealed ? "disabled" : ""} aria-label="${revealed ? `${card.name}, ${t(card.reversed ? "Reversed" : "Upright").toLowerCase()}` : `${t("Reveal")} ${t(positions[index])}`}"><span class="card-inner"><span class="card-side back"></span><span class="card-side front">${faceInner(card)}</span></span></button><span class="label">${t(positions[index])}</span><span class="orientation ${revealed ? "" : "is-hidden"}">${t(card.reversed ? "Reversed" : "Upright")}</span></div>`;
  }).join("")}</div>`, actions: revealActions() };
}
function renderPositionReveal(positions, layoutClass) {
  const cards = readingCards();
  preloadCardArt(cards);
  return {
    surface: `<div class="reveal-layout ${layoutClass}">${cards.map((card, index) => {
      const revealed = state.revealedIds.includes(card.id);
      return `<div class="reveal-slot"><button class="card reveal-card ${card.reversed ? "reversed" : ""} ${revealed ? "flipped" : ""}" data-action="reveal-card" data-card-id="${card.id}" ${revealed ? "disabled" : ""} aria-label="${revealed ? `${card.name}, ${t(card.reversed ? "Reversed" : "Upright").toLowerCase()}` : `${t("Reveal")} ${t(positions[index])}`}"><span class="card-inner"><span class="card-side back"></span><span class="card-side front">${faceInner(card)}</span></span></button><span class="label">${t(positions[index])}</span><span class="orientation ${revealed ? "" : "is-hidden"}">${t(card.reversed ? "Reversed" : "Upright")}</span></div>`;
    }).join("")}</div>`,
    actions: revealActions()
  };
}

function cardKeywords(card) {
  if (state.category === "Love" && CARD_NOTES[card.name]) return CARD_NOTES[card.name];
  const suitWords = state.category === "Career"
    ? {
        Wands: ["initiative", "momentum", "visibility"], Cups: ["collaboration", "instinct", "shared values"],
        Swords: ["strategy", "communication", "a clear decision"], Pentacles: ["craft", "resources", "sustainable growth"],
        "Major Arcana": ["a defining chapter", "leadership", "purpose"]
      }
    : state.category === "Money"
      ? {
          Wands: ["enterprise", "momentum", "calculated risk"], Cups: ["values", "enoughness", "reciprocity"],
          Swords: ["discernment", "clear terms", "a deliberate choice"], Pentacles: ["material value", "stewardship", "patient growth"],
          "Major Arcana": ["a money pattern", "agency", "a defining choice"]
        }
    : state.category === "Decision"
      ? {
          Wands: ["appetite", "the cost of waiting", "nerve"], Cups: ["what you actually want", "loyalty", "regret"],
          Swords: ["the plain facts", "a clean cut", "second-guessing"], Pentacles: ["what it costs", "daily life after", "durability"],
          "Major Arcana": ["a threshold", "a turning point", "consequence"]
        }
      : state.category === "Friendship / Family"
        ? {
            Wands: ["warmth", "shared momentum", "honest expression"], Cups: ["care", "belonging", "emotional reciprocity"],
            Swords: ["the needed conversation", "perspective", "clear boundaries"], Pentacles: ["reliability", "shared history", "everyday care"],
            "Major Arcana": ["a bond pattern", "mutual growth", "a defining truth"]
          }
        : state.category === "Personal Growth"
          ? {
              Wands: ["inner fire", "practice", "courage"], Cups: ["self-compassion", "intuition", "emotional room"],
              Swords: ["a changing belief", "discernment", "a truer story"], Pentacles: ["embodiment", "patience", "steady becoming"],
              "Major Arcana": ["an inner threshold", "integration", "deep change"]
            }
          : state.category === "General Future"
            ? {
                Wands: ["emerging momentum", "possibility", "the courage to begin"], Cups: ["a changing feeling", "connection", "receptivity"],
                Swords: ["new information", "clarity", "a necessary choice"], Pentacles: ["what is taking form", "resources", "durable growth"],
                "Major Arcana": ["a larger season", "turning", "the horizon ahead"]
              }
      : {
        Wands: ["desire", "momentum", "courage"], Cups: ["feeling", "connection", "receptivity"],
        Swords: ["clarity", "truth", "a necessary thought"], Pentacles: ["grounding", "value", "what can grow"],
        "Major Arcana": ["a larger pattern", "inner change", "attention"]
              };
  const words = suitWords[card.suit] || suitWords["Major Arcana"];
  return card.reversed ? ["turned inward", ...words.slice(0, 2)] : words;
}
function positionMeaning(position, card) {
  const upright = card.reversed ? "turned inward or delayed" : "available to meet directly";
  if (state.category === "Decision") {
    const decisionSnippets = {
      "The Chosen Card": `${card.name} is the card your hand found in the open deck: ${upright}. Treat it as a lens on the decision, not an instruction or a verdict.`
    };
    return decisionSnippets[position];
  }
  if (state.category === "Career") {
    const careerSnippets = {
      "Current Ground": `${card.name} describes the ground beneath your working life now: ${upright}. Notice the conditions you are actually building from.`,
      "Your Unclaimed Strength": `${card.name} points to an ability, standard, or point of view that deserves more deliberate ownership.`,
      "The Friction": `${card.name} names the productive tension in the path. Meet it as information about what must change, not as a verdict on your ability.`,
      "Your Leverage": `${card.name} highlights a person, practice, or resource that can multiply your effort when you use it with intention.`,
      "The Next Bold Move": `${card.name} offers a concrete direction for the next experiment. Keep it small enough to begin and visible enough to learn from.`
    };
    return careerSnippets[position];
  }
  if (state.category === "Money") {
    const moneySnippets = {
      "What to Keep": `${card.name} points to a resource, boundary, or practice worth protecting before you ask it to produce more: ${upright}.`,
      "What to Grow": `${card.name} highlights where patient attention could compound into greater capacity, choice, or resilience.`,
      "What to Let Flow": `${card.name} asks what can circulate, be spent with intention, or be released so value does not become fearfully stuck.`
    };
    return moneySnippets[position];
  }
  if (state.category === "Friendship / Family") {
    const kinSnippets = {
      "Your Voice": `${card.name} reflects the need, tone, or truth you bring into this bond: ${upright}. Notice what is yours to communicate or care for.`,
      "Their Voice": `${card.name} offers a lens on what may be carried across the bond. Hold it as an invitation to curiosity, not a claim about another person's private mind.`
    };
    return kinSnippets[position];
  }
  if (state.category === "Personal Growth") {
    const growthSnippets = {
      "The Root": `${card.name} points toward an older pattern, strength, or need that helped form the ground beneath you: ${upright}.`,
      "The Threshold": `${card.name} names the living edge of the work—the choice, discomfort, or practice that asks to be met now.`,
      "The Becoming": `${card.name} suggests a quality that can emerge through repeated action. Treat it as a direction to practice, not an identity you must perform.`
    };
    return growthSnippets[position];
  }
  if (state.category === "General Future") {
    const futureSnippets = {
      "Dawn — What Begins": `${card.name} rises at Dawn as the first light of the reading: ${upright}. Look for beginnings that are already present in small, practical form.`,
      "Zenith — What Becomes Clear": `${card.name} reaches Zenith where something can no longer remain half-seen. Let evidence, timing, and direct experience clarify its meaning.`,
      "Dusk — What Must Change": `${card.name} belongs to Dusk and shows where an old arrangement may need to soften, end, or be carried differently.`,
      "Midnight — What Guides You": `${card.name} waits at Midnight as the quiet inner compass. Carry its strongest quality into the season ahead without treating it as a fixed forecast.`
    };
    return futureSnippets[position];
  }
  const snippets = {
    "Hidden Heart": `Under the question, ${card.name} suggests an influence that is ${upright}. Notice what has been felt before it has been named.`,
    "You": `In your own position, ${card.name} points to the way you are meeting this situation: ${upright}.`,
    "The Connection": `Between you and the connection itself, ${card.name} asks for attention to what is ${upright}.`,
    "The Path Ahead": `As a possible next movement, ${card.name} describes an energy that is ${upright}; treat it as guidance, not a fixed outcome.`
  };
  return snippets[position];
}
function personalInterpretation(cards) {
  if (state.category === "Career") return careerPersonalInterpretation(cards);
  if (state.category === "Money") return moneyPersonalInterpretation(cards);
  if (state.category === "Decision") return decisionPersonalInterpretation(cards);
  if (state.category === "Friendship / Family") return kinPersonalInterpretation(cards);
  if (state.category === "Personal Growth") return growthPersonalInterpretation(cards);
  if (state.category === "General Future") return futurePersonalInterpretation(cards);
  const [hidden, you, connection, ahead] = cards;
  const reversed = cards.filter((card) => card.reversed).length;
  const question = state.question.trim() || "this question";
  return `Your question — “${question}” — is held here as an invitation to notice rather than a promise of certainty.

${hidden.name} sits beneath the surface as the Hidden Heart. It suggests that something subtle is already shaping how you approach this: an unspoken need, a hope, or a pattern asking to be acknowledged without being rushed.

In your position, ${you.name} asks you to meet the connection with more of your own voice present. The spread does not require you to predict another person; it invites you to be clear about what you need in order to feel respected and at ease.

${connection.name} describes the space between you. Look for the practical evidence of its message: how communication feels, what actions repeat, and whether tenderness is reciprocated. ${reversed ? `With ${reversed} reversed card${reversed > 1 ? "s" : ""}, some part of the story may need time, private reflection, or a change in perspective before it can move freely.` : "The cards lean toward directness rather than guessing."}

For the Path Ahead, ${ahead.name} offers a next small experiment rather than a verdict. Try one honest conversation, one boundary, or one act of self-care that brings your daily experience closer to the kind of love you want to practice. Let what happens next inform you.`;
}
function careerPersonalInterpretation(cards) {
  const [ground, strength, friction, leverage, next] = cards;
  const reversed = cards.filter((card) => card.reversed).length;
  const question = state.question.trim() || "this career question";
  return `Your question — “${question}” — is held in five cards: three sparks you chose from the first shuffle, followed by one card from each half of the deck after your cut. Treat them as a way to frame choices and experiments, not as a fixed forecast.

${ground.name} marks your Current Ground: the real conditions, habits, and expectations you are standing on. ${strength.name} is Your Unclaimed Strength, inviting you to name an ability you may be using quietly instead of owning visibly.

${friction.name} describes The Friction. It may be a constraint, an outdated role, or the cost of a direction that no longer fits. ${reversed ? `With ${reversed} reversed card${reversed > 1 ? "s" : ""}, part of the work may be internal: confidence, timing, or a belief that needs testing against present evidence.` : "The spread is asking for direct observation and a clear conversation with reality."}

From the first half, ${leverage.name} becomes Your Leverage—the relationship, system, practice, or resource that makes effort travel farther. Do not only ask what you can push through alone; ask what becomes possible when support is designed into the plan.

From the second half, ${next.name} becomes The Next Bold Move and favors one visible experiment. Choose a step you can take within the next seven days: make the request, show the work, learn the skill, or close one door with intention. Let the response become useful evidence for what follows.`;
}
function moneyPersonalInterpretation(cards) {
  const [keep, grow, flow] = cards;
  const question = state.question.trim() || "this money question";
  return `Your question — “${question}” — is held here as a question of stewardship, not a prediction. You cut the shuffled deck into three piles, set the order they would sit in, and drew one card from each in that order.

${keep.name} came from the first pile and marks What to Keep. Protect the boundary, reserve, relationship, or capability it evokes before pursuing expansion.

${grow.name} came from the second pile and marks What to Grow. Treat it as a place for consistent attention rather than a promise of fast return.

${flow.name} came from the third and final pile, marking What to Let Flow. This may be a thoughtful expense, a fair exchange, or something to release because holding it has become costly. Choose one small next action you can verify in real life: review one number, clarify one term, automate one safeguard, or make one values-aligned allocation. Tarot can frame the question; your records and circumstances should decide the money.`;
}
function decisionPersonalInterpretation(cards) {
  const [chosen] = cards;
  if (!chosen) return "Your card is still settling into place.";
  const question = state.question.trim() || "this decision";
  const orientation = chosen.reversed
    ? "Its reversed orientation asks you to pause over what may be delayed, resisted, or still forming inside you."
    : "Its upright orientation asks you to meet its theme plainly and look for where it is already present.";
  return `Your question — “${question}” — is held by one card, not answered by it. After the shuffle, cut, reunion, and spread, your hand chose ${chosen.name}. Let that choice narrow your attention without surrendering your judgment.

${chosen.name} brings ${cardKeywords(chosen).join(", ")} into the room. ${orientation}

Use it as a practical prompt: name one fact in your situation that reflects this card, one fear that might be coloring it, and one small reversible step that would give you better information. The decision remains yours; the card simply gives you a clearer place to look from.`;
}
function kinPersonalInterpretation(cards) {
  const [yours, theirs] = cards;
  const question = state.question.trim() || "this bond";
  return `Your question — “${question}” — is held by two halves of one deck. ${yours.name} came from the half named Your Voice; ${theirs.name} came from the half named Their Voice. Read them as two perspectives that need room beside each other, not as proof of what anyone else thinks.

${yours.name} asks you to own the part of the bond that is within your reach: what you feel, what you need, what you can say cleanly, and what kind of care or boundary you can offer without abandoning yourself.

${theirs.name} invites curiosity about the other side. Instead of assuming, make space for one question that could reveal more. Notice whether the bond allows difference, repair, and reciprocity—or whether one voice repeatedly has to disappear.

Choose one small act that honors both cards: name something true without accusation, ask rather than guess, or make one dependable gesture of care. Let the real response—not the cards—show you what this bond can hold.`;
}
function growthPersonalInterpretation(cards) {
  const [root, threshold, becoming] = cards;
  const question = state.question.trim() || "this inner change";
  return `Your question — “${question}” — moves through three cards chosen from one continuous path.

${root.name} is The Root. It points toward what has shaped the pattern: perhaps a protection, value, fear, or strength that once had a reason to exist. Understanding the root is not the same as staying loyal to it.

${threshold.name} is The Threshold. This is where insight asks to become practice. Look for a choice small enough to repeat: a boundary, a conversation, a pause before the old reaction, or a way to ask for support.

${becoming.name} is The Becoming. It does not describe a finished version of you; it names a quality that can grow through lived evidence. Give it one visible action this week. Measure progress by greater honesty, steadiness, and freedom—not by perfection.`;
}
function futurePersonalInterpretation(cards) {
  const [dawn, zenith, dusk, midnight] = cards;
  const reversed = cards.filter((card) => card.reversed).length;
  const question = state.question.trim() || "the season ahead";
  return `Your question — “${question}” — is held in a four-direction compass. You shuffled the full deck, placed three cuts to create four quarters, assigned each pile to Dawn, Zenith, Dusk, and Midnight, then drew one card from every direction.

${dawn.name} rises at Dawn as What Begins. Look for its first evidence in a new desire, invitation, practice, or possibility that is still small enough to overlook.

${zenith.name} stands at Zenith as What Becomes Clear. It asks you to bring something into full light: a fact, priority, capacity, or truth that becomes easier to meet when it is named plainly.

${dusk.name} rests at Dusk as What Must Change. ${reversed ? `With ${reversed} reversed card${reversed > 1 ? "s" : ""}, some of this movement may begin internally or unfold more slowly than expected.` : "The compass leans toward changes that become easier to understand through direct observation."} Release the need to decide too quickly what the change means.

${midnight.name} waits at Midnight as What Guides You. Carry its strongest quality into one decision you can make now. This compass is not a fixed forecast; it is a way to meet the future with a clearer gaze, a steadier hand, and room to revise as reality speaks.`;
}
// First sentence of a longer interpretation, for a one-line share/summary line.
function firstSentence(text) {
  const s = String(text || "").replace(/\s+/g, " ").trim();
  const match = s.match(/^.*?[.!?](\s|$)/);
  let sentence = (match ? match[0] : s).trim();
  if (sentence.length > 180) sentence = sentence.slice(0, 177).replace(/\s+\S*$/, "") + "…";
  return sentence;
}
function personalSummary(cards) {
  if (state.category === "Career") {
    const [, strength, , leverage, next] = cards;
    return `${strength.name} is the strength to own; ${leverage.name} helps ${next.name} become your next visible move.`;
  }
  if (state.category === "Money") {
    const [keep, grow, flow] = cards;
    return `Keep ${keep.name} steady, grow through ${grow.name}, and let ${flow.name} restore movement.`;
  }
  if (state.category === "Decision") {
    const [chosen] = cards;
    return chosen ? `${chosen.name} is the single lens your hand chose for this decision.` : "One card is settling into place.";
  }
  if (state.category === "Friendship / Family") {
    const [yours, theirs] = cards;
    return `${yours.name} names your voice; ${theirs.name} invites curiosity about the voice across the bond.`;
  }
  if (state.category === "Personal Growth") {
    const [root, threshold, becoming] = cards;
    return `${root.name} holds the root, ${threshold.name} marks the threshold, and ${becoming.name} gives becoming a direction.`;
  }
  if (state.category === "General Future") {
    const [dawn, zenith, dusk, midnight] = cards;
    return `${dawn.name} begins the movement, ${zenith.name} clarifies it, ${dusk.name} changes it, and ${midnight.name} guides it.`;
  }
  const [, , connection, ahead] = cards;
  return `${connection.name} shapes the connection now, while ${ahead.name} points toward ${cardKeywords(ahead)[0]} as the next step.`;
}
function loadImage(src) {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => resolve(img);
    img.onerror = reject;
    img.src = src;
  });
}
function roundRectPath(ctx, x, y, w, h, r) {
  ctx.beginPath();
  ctx.moveTo(x + r, y);
  ctx.arcTo(x + w, y, x + w, y + h, r);
  ctx.arcTo(x + w, y + h, x, y + h, r);
  ctx.arcTo(x, y + h, x, y, r);
  ctx.arcTo(x, y, x + w, y, r);
  ctx.closePath();
}
function wrapCanvasText(ctx, text, maxWidth) {
  const words = text.split(/\s+/).filter(Boolean);
  const lines = [];
  let line = "";
  for (const word of words) {
    const candidate = line ? `${line} ${word}` : word;
    if (ctx.measureText(candidate).width > maxWidth && line) { lines.push(line); line = word; } else { line = candidate; }
  }
  if (line) lines.push(line);
  return lines;
}
function drawWrappedText(ctx, text, cx, y, maxWidth, lineHeight) {
  const lines = wrapCanvasText(ctx, text, maxWidth);
  lines.forEach((line, index) => ctx.fillText(line, cx, y + index * lineHeight));
  return y + lines.length * lineHeight;
}
// The three celestial "story" looks a reader can pick before saving/sharing.
const SHARE_THEMES = [
  { id: "midnight", label: "Midnight" },
  { id: "paper-moon", label: "Paper Moon" },
  { id: "golden-hour", label: "Golden Hour" }
];
const SHARE_INK = "#071b24";
// Each theme's skyline art ends at a different height, so pin the town to a common
// bottom line (matching Golden Hour, the reference look) instead of letting Midnight float.
const SHARE_SKYLINE_DY = { "paper-moon": 0, "golden-hour": 0, midnight: 196 };
function shareThemeId() {
  const id = state.shareTheme;
  return SHARE_THEMES.some((theme) => theme.id === id) ? id : "midnight";
}

// Shrink a font until `text` fits within maxWidth (keeps one long question/title on its line).
function fitFontPx(ctx, text, maxWidth, startPx, fontFor, minPx = 20) {
  let px = startPx;
  while (px > minPx) {
    ctx.font = fontFor(px);
    if (ctx.measureText(text).width <= maxWidth) break;
    px -= 2;
  }
  return px;
}

// Draw one tarot card, fanned by `angle`, with a gold frame. The source image is
// inset before drawing so the card scan's rough cream paper edge never reaches the
// export — the gold frame then sits cleanly on the trimmed edge.
function drawFramedShareCard(ctx, img, reversed, cx, cy, cw, ch, angle) {
  const r = cw * 0.05;
  const inset = 0.034;
  const sx = img.naturalWidth * inset, sy = img.naturalHeight * inset;
  const sw = img.naturalWidth * (1 - inset * 2), sh = img.naturalHeight * (1 - inset * 2);
  ctx.save();
  ctx.translate(cx, cy);
  ctx.rotate((angle * Math.PI) / 180);
  // soft drop shadow so the cards lift off the sky
  ctx.save();
  ctx.shadowColor = "rgba(0,0,0,.42)";
  ctx.shadowBlur = 22;
  ctx.shadowOffsetY = 12;
  ctx.fillStyle = "#0d1b22";
  roundRectPath(ctx, -cw / 2, -ch / 2, cw, ch, r);
  ctx.fill();
  ctx.restore();
  // clip to the rounded card and paint the trimmed artwork (flipped when reversed)
  ctx.save();
  roundRectPath(ctx, -cw / 2, -ch / 2, cw, ch, r);
  ctx.clip();
  if (reversed) ctx.rotate(Math.PI);
  ctx.drawImage(img, sx, sy, sw, sh, -cw / 2, -ch / 2, cw, ch);
  ctx.restore();
  // gold frame that hides the trimmed edge
  ctx.strokeStyle = "rgba(229,210,162,.95)";
  ctx.lineWidth = 8;
  roundRectPath(ctx, -cw / 2 + 4, -ch / 2 + 4, cw - 8, ch - 8, r);
  ctx.stroke();
  ctx.strokeStyle = "rgba(139,104,53,.8)";
  ctx.lineWidth = 2;
  roundRectPath(ctx, -cw / 2 + 11, -ch / 2 + 11, cw - 22, ch - 22, r * 0.7);
  ctx.stroke();
  ctx.restore();
}

async function buildShareCanvas(question, cards, summary, theme = shareThemeId()) {
  const W = 1080, H = 1920;
  const canvas = document.createElement("canvas");
  canvas.width = W; canvas.height = H;
  const ctx = canvas.getContext("2d");
  const base = `./assets/share/themes/${theme}`;
  // Composite the base from its own layers (background → town skyline → gold frame) so the
  // town can be pinned to the bottom per theme, and always sits *under* the cards drawn next.
  const [background, skyline, frame, titlePanel, questionPanel, quotePanel, ...images] = await Promise.all([
    loadImage(`${base}/background.svg`),
    loadImage(`${base}/skyline-overlay.png`),
    loadImage(`${base}/celestial-frame-overlay.png`),
    loadImage("./assets/share/shared/title-panel.png"),
    loadImage("./assets/share/shared/question-panel.png"),
    loadImage("./assets/share/shared/quote-panel.png"),
    ...cards.map((card) => loadImage(cardImagePath(card)))
  ]);

  ctx.drawImage(background, 0, 0, W, H);
  ctx.drawImage(skyline, 0, SHARE_SKYLINE_DY[theme] || 0, W, H);
  ctx.drawImage(frame, 0, 0, W, H);
  ctx.textAlign = "center";
  ctx.textBaseline = "middle";

  // Title panel
  ctx.drawImage(titlePanel, 212, 200, 656, 320);
  ctx.fillStyle = SHARE_INK;
  const titleFor = (px) => `${px}px Georgia, "Times New Roman", serif`;
  ctx.font = titleFor(66);
  ctx.fillText("MY TAROT", 540, 322);
  ctx.fillText("READING", 540, 398);

  // Question panel (auto-fits the reader's own wording to a single line)
  ctx.drawImage(questionPanel, 215, 505, 650, 131);
  const q = question.trim();
  fitFontPx(ctx, q, 588, 44, (px) => `italic ${px}px Georgia, "Times New Roman", serif`, 16);
  ctx.fillStyle = SHARE_INK;
  ctx.fillText(q, 540, 571);

  // Love keeps the four-card fan, Career forms a centered 3-over-2 constellation,
  // Money and Growth use three, the Bond holds two facing cards, and the one-card
  // Decision reading gets a large portrait.
  const one = cards.length === 1;
  const two = cards.length === 2;
  const five = cards.length === 5;
  const three = cards.length === 3;
  const cw = one ? 328 : two ? 300 : five ? 176 : three ? 268 : 238;
  const ch = one ? 548 : two ? 500 : five ? 294 : three ? 447 : 397;
  const lefts = one ? [376] : two ? [224, 556] : five ? [282, 452, 622, 367, 537] : three ? [118, 406, 694] : [40, 295, 548, 801];
  const tops = one ? [682] : two ? [662, 662] : five ? [650, 650, 650, 914, 914] : three ? [658, 636, 658] : [664, 640, 646, 671];
  const angles = one ? [0] : two ? [-3, 3] : five ? [-2.5, 0, 2.5, -1.5, 1.5] : three ? [-5, 0, 5] : [-5, -1, 2, 5];
  cards.forEach((card, index) => {
    drawFramedShareCard(ctx, images[index], card.reversed, lefts[index] + cw / 2, tops[index] + ch / 2, cw, ch, angles[index]);
  });

  // Quote panel with the short answer, auto-fit to at most three lines
  ctx.drawImage(quotePanel, 240, 1245, 600, 318);
  ctx.fillStyle = SHARE_INK;
  let aPx = 50, lines;
  while (aPx >= 30) {
    ctx.font = `italic ${aPx}px Georgia, "Times New Roman", serif`;
    lines = wrapCanvasText(ctx, summary.trim(), 460);
    if (lines.length <= 3) break;
    aPx -= 3;
  }
  const lh = aPx * 1.22;
  const startY = 1404 - ((lines.length - 1) * lh) / 2;
  lines.forEach((line, index) => ctx.fillText(line, 540, startY + index * lh));

  ctx.textBaseline = "alphabetic";
  return canvas;
}
// Rendered share canvases (and their data URLs) are cached per theme so switching looks,
// re-tapping Save/Share, and opening the share sheet stay instant and flash-free.
let shareCanvasCache = {};
let shareDataUrlCache = {};
let shareSheetOpen = false;
function resetShareCache() { shareCanvasCache = {}; shareDataUrlCache = {}; shareSheetOpen = false; }
async function shareCanvasFor(theme) {
  if (shareCanvasCache[theme]) return shareCanvasCache[theme];
  const cards = readingCards();
  if (cards.length !== readingPositions().length) throw new Error("The reading is incomplete.");
  const summary = state.aiSummary || personalSummary(cards);
  const canvas = await buildShareCanvas(state.question, cards, summary, theme);
  shareCanvasCache[theme] = canvas;
  return canvas;
}
async function mountSharePreview() {
  const frame = document.querySelector(".story-canvas");
  if (!frame) return;
  const theme = shareThemeId();
  // Cached image: paint it synchronously so re-renders (e.g. opening the sheet) don't flash.
  if (shareDataUrlCache[theme]) {
    frame.style.backgroundImage = `url("${shareDataUrlCache[theme]}")`;
    frame.classList.add("ready");
    return;
  }
  try {
    const canvas = await shareCanvasFor(theme);
    if (state.stage !== "share" || shareThemeId() !== theme) return;
    const url = canvas.toDataURL("image/png");
    shareDataUrlCache[theme] = url;
    frame.style.backgroundImage = `url("${url}")`;
    frame.classList.add("ready");
  } catch {
    frame.classList.add("failed");
  }
}
function saveBlob(blob, filename) {
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url; link.download = filename;
  document.body.append(link); link.click(); link.remove();
  setTimeout(() => URL.revokeObjectURL(url), 4000);
}
async function shareImageFile(theme) {
  const canvas = await shareCanvasFor(theme);
  const blob = await new Promise((resolve) => canvas.toBlob(resolve, "image/png"));
  if (!blob) throw new Error("Could not render the image.");
  return { blob, file: new File([blob], `oracle-veil-${theme}.png`, { type: "image/png" }) };
}
function shareCaption() {
  const summary = state.aiSummary || personalSummary(readingCards());
  return `${summary}\n\n✦ My tarot reading from Oracle Veil · oracleveil.online`;
}
// "Save image" and the native "More" option.
async function exportShareImage(mode, button) {
  const theme = shareThemeId();
  if (button) button.classList.add("busy");
  try {
    const { blob, file } = await shareImageFile(theme);
    if (mode === "share" && navigator.canShare && navigator.canShare({ files: [file] })) {
      await navigator.share({ files: [file], title: "My Tarot Reading", text: shareCaption() });
    } else {
      saveBlob(blob, file.name);
      showToast(mode === "share" ? "Sharing isn't available here, so the image was saved." : "Your image has been saved.");
    }
    shareSheetOpen = false; render();
  } catch (error) {
    if (button) button.classList.remove("busy");
    if (error?.name !== "AbortError") showToast("Couldn't create the share image.");
  }
}
// Landing the user in an app's post/story composer WITH the image is only possible on the
// web via the Web Share API — Instagram and TikTok expose no web link into their composer,
// and a deep link would just open the app's home. navigator.share hands the file to the OS
// sheet; picking the app there opens it straight to "Add to story / post" with the image
// loaded. Desktop (no app share target) saves the image and opens the platform's site
// (X via its compose intent, which prefills the caption).
const SHARE_PLATFORMS = {
  instagram: { label: "Instagram", web: "https://www.instagram.com/" },
  tiktok: { label: "TikTok", web: "https://www.tiktok.com/upload" },
  x: { label: "X", web: "https://twitter.com/intent/tweet" }
};
function platformUrl(platform, caption) {
  if (platform === "x") return `${SHARE_PLATFORMS.x.web}?text=${encodeURIComponent(caption)}`;
  return SHARE_PLATFORMS[platform].web;
}
function canShareImageFile() {
  if (!navigator.canShare || typeof File === "undefined") return false;
  try { return navigator.canShare({ files: [new File([new Uint8Array(1)], "p.png", { type: "image/png" })] }); }
  catch { return false; }
}
async function shareToPlatform(platform, button) {
  const meta = SHARE_PLATFORMS[platform];
  if (!meta) return;
  const caption = shareCaption();
  const native = canShareImageFile();
  // Desktop: no app share target — open the platform site inside the click gesture (so a
  // popup blocker doesn't eat it) and save the image so it can be attached.
  const win = native ? null : window.open(platformUrl(platform, caption), "_blank", "noopener");
  if (button) button.classList.add("busy");
  try {
    const { blob, file } = await shareImageFile(shareThemeId());
    if (native) {
      // Opens the app the user picks straight to its post/story composer with the image.
      await navigator.share({ files: [file], title: "My Tarot Reading", text: caption });
    } else {
      saveBlob(blob, file.name);
      showToast(`Image saved — add it to your ${meta.label} post.`);
    }
    shareSheetOpen = false; render();
  } catch (error) {
    if (win) win.close?.();
    if (button) button.classList.remove("busy");
    if (error?.name !== "AbortError") showToast("Couldn't prepare the image.");
  }
}
const SHARE_ICONS = {
  instagram: `<svg viewBox="0 0 24 24" aria-hidden="true"><rect x="3" y="3" width="18" height="18" rx="5.4" fill="none" stroke="currentColor" stroke-width="2"/><circle cx="12" cy="12" r="4.2" fill="none" stroke="currentColor" stroke-width="2"/><circle cx="17.4" cy="6.6" r="1.25" fill="currentColor"/></svg>`,
  tiktok: `<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M13.4 3h2.9a5.2 5.2 0 0 0 4.2 4.2v2.9a8 8 0 0 1-4.2-1.3v5.7a5.9 5.9 0 1 1-5.9-5.9c.3 0 .6 0 .9.05v3a2.9 2.9 0 1 0 2.1 2.8V3z" fill="currentColor"/></svg>`,
  x: `<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M17.9 3h3.2l-7 8 8.2 10.9h-6.4l-5-6.5-5.8 6.5H1.9l7.5-8.6L1.6 3h6.6l4.5 6 5.6-6z" fill="currentColor"/></svg>`,
  save: `<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M12 3.5v10.4m0 0l-4.2-4.2M12 13.9l4.2-4.2M4.5 19.5h15" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/></svg>`,
  more: `<svg viewBox="0 0 24 24" aria-hidden="true"><circle cx="5.5" cy="12" r="1.9" fill="currentColor"/><circle cx="12" cy="12" r="1.9" fill="currentColor"/><circle cx="18.5" cy="12" r="1.9" fill="currentColor"/></svg>`
};
// Direct-to-composer sharing isn't reachable from a web page yet, so the per-app tiles are
// disabled for now (flip to true to re-enable the Web Share API flow). Save / More still work.
const PLATFORM_TILES_ENABLED = false;
function shareTile(platform) {
  const off = !PLATFORM_TILES_ENABLED;
  return `<button class="share-tile ${platform}${off ? " is-disabled" : ""}" type="button"${off ? " disabled aria-disabled=\"true\"" : ` data-action="share-platform" data-platform="${platform}"`}><span class="share-tile-icon">${SHARE_ICONS[platform]}${off ? `<span class="share-tile-soon">Soon</span>` : ""}</span><span class="share-tile-label">${SHARE_PLATFORMS[platform].label}</span></button>`;
}
function renderShareSheet() {
  if (!shareSheetOpen) return "";
  const more = navigator.share ? `<button class="share-tile more" type="button" data-action="share-native"><span class="share-tile-icon">${SHARE_ICONS.more}</span><span class="share-tile-label">More</span></button>` : "";
  return `<div class="share-sheet-scrim" data-action="share-sheet-close">
    <section class="share-sheet" role="dialog" aria-modal="true" aria-label="Share your reading" data-action="share-sheet-keep">
      <span class="share-sheet-grip" aria-hidden="true"></span>
      <h3 class="share-sheet-title">Share your reading</h3>
      <p class="share-sheet-sub">Save your card, then post it to your story or feed.</p>
      <div class="share-tiles">
        ${shareTile("instagram")}${shareTile("tiktok")}${shareTile("x")}
        <button class="share-tile save" type="button" data-action="share-save"><span class="share-tile-icon">${SHARE_ICONS.save}</span><span class="share-tile-label">Save</span></button>
        ${more}
      </div>
      <button class="share-sheet-cancel" type="button" data-action="share-sheet-close">Cancel</button>
    </section>
  </div>`;
}
function renderSharePage() {
  const themeId = shareThemeId();
  const cards = readingCards();
  const chips = SHARE_THEMES.map((theme) => `
    <button class="theme-choice" type="button" role="radio" aria-checked="${theme.id === themeId}" data-action="share-theme" data-theme="${theme.id}">
      <span class="theme-thumbnail">
        <img class="theme-art" src="./assets/share/themes/${theme.id}/thumbnail.png" alt="" loading="lazy" decoding="async" />
        ${theme.id === themeId ? `<img class="selected-mark" src="./assets/share/shared/selected-check.svg" alt="" aria-hidden="true" />` : ""}
      </span>
      <span class="theme-name">${theme.label}</span>
    </button>`).join("");
  return `<div class="share-page world" data-theme="${themeId}">
    <header class="share-topbar">
      <button class="share-back" type="button" data-action="share-back" aria-label="Back to the reading"><span aria-hidden="true">←</span></button>
      <div class="share-brand">✦ Oracle Veil ✦</div>
      <h1 class="share-title">Make it yours</h1>
      <button class="share-exit text-button" type="button" data-action="share-back">Exit</button>
    </header>
    <div class="share-layout">
      <section class="preview-region" aria-label="Tarot share preview">
        <div class="story-canvas" role="img" aria-label="${escapeHTML(cards[0]?.name || "Your reading")} tarot story preview">
          <span class="story-spinner" aria-hidden="true">Preparing your image…</span>
        </div>
      </section>
      <aside class="customize-panel" aria-label="Choose a look">
        <h2 class="customize-heading">Choose a look</h2>
        <div class="theme-grid" role="radiogroup" aria-label="Share style">${chips}</div>
        <div class="share-actions">
          <button class="primary-action" type="button" data-action="share-continue"><span>Continue to share</span><span class="button-sparkle" aria-hidden="true">✦</span></button>
          <button class="secondary-action" type="button" data-action="share-save">Save image</button>
        </div>
        <p class="share-privacy">Your full reading stays private.</p>
      </aside>
    </div>
    ${renderShareSheet()}
  </div>`;
}
async function requestAIInterpretation() {
  if (location.protocol === "file:") {
    state.aiLoading = false;
    state.aiError = state.category !== "Love" ? null : "Live interpretation needs the local server. Open the app through the command in README.md.";
    persist(); render();
    return;
  }
  try {
    const response = await fetch(INTERPRETATION_ENDPOINT, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        topic: state.category,
        question: state.question,
        cards: readingCards().map((card, index) => ({
          position: readingPositions()[index], name: card.name, orientation: card.reversed ? "reversed" : "upright"
        }))
      })
    });
    const payload = await response.json().catch(() => ({}));
    if (!response.ok || typeof payload.text !== "string" || !payload.text.trim()) throw new Error(payload.error || "The interpretation service is unavailable.");
    state.aiText = payload.text.trim();
    // The server may omit a short "summary"; derive one from the interpretation so the
    // reading and the share image still get a personal one-line takeaway.
    const givenSummary = typeof payload.summary === "string" ? payload.summary.trim() : "";
    state.aiSummary = givenSummary || firstSentence(state.aiText) || personalSummary(readingCards());
    state.aiError = null;
  } catch (error) {
    // Career and Money entrance ads already unlock the complete built-in reflection.
    // If an API is not configured on a static host, keep that experience seamless.
    state.aiError = state.category !== "Love" ? null : error instanceof Error ? error.message : "The interpretation service is unavailable.";
  } finally {
    state.aiLoading = false;
    persist(); render();
  }
}
function renderReading() {
  const cards = readingCards();
  const positions = readingPositions();
  const career = state.category === "Career";
  const money = state.category === "Money";
  const decision = state.category === "Decision";
  const kin = state.category === "Friendship / Family";
  const growth = state.category === "Personal Growth";
  const future = state.category === "General Future";
  const readingTitle = career
    ? "Five cards, a constellation for the work ahead."
    : money
      ? "Three cards, a living ledger for your resources."
      : decision
        ? "One card, held at the crossroads."
        : kin
          ? "Two cards, two voices within one bond."
          : growth
            ? "Three cards, an inner movement taking shape."
            : future
              ? "Four cards, gathered along the far horizon."
              : "Four cards, gathered beneath one sky.";
  const cardCount = positions.length;
  const unlockCopy = decision
    ? t("Watch a short ad to unlock a reflection based on your exact question and chosen card.")
    : cardCount === 2
      ? t("Watch a short ad to unlock a reflection based on your exact question and both cards.")
      : cardCount === 3
        ? t("Watch a short ad to unlock a reflection based on your exact question and all three cards.")
        : cardCount === 5
          ? t("Watch a short ad to unlock a reflection based on your exact question and all five cards.")
          : t("Watch a short ad to unlock a reflection based on your exact question and all four cards.");
  const summary = state.aiSummary || personalSummary(cards);
  const interpretation = state.aiLoading
    ? `<p class="ai-copy">${t("Listening to the cards…")}</p>`
    : `<p class="ai-summary">${escapeHTML(summary)}</p><p class="ai-copy">${escapeHTML(state.aiText || personalInterpretation(cards))}</p>${state.aiError ? `<p class="disclaimer">${escapeHTML(state.aiError)} ${t("The prototype reading remains available below as a fallback.")}</p>` : ""}`;
  const cardRow = `<div class="reading-card-row">${cards.map((card) => `<div class="reading-card">${cardFace(card)}</div>`).join("")}</div>`;
  const meaningGrid = `<div class="meaning-grid">${cards.map((card, index) => `<article class="meaning"><p class="meaning-meta">${t(positions[index])} · ${t(card.reversed ? "Reversed" : "Upright").toLowerCase()}</p><h3>${escapeHTML(card.name)}</h3><p><strong>${cardKeywords(card).join(" · ")}</strong></p><p>${positionMeaning(positions[index], card)}</p></article>`).join("")}</div>`;
  const cardReading = decision ? `<div class="decision-reading-core">${cardRow}${meaningGrid}</div>` : `${cardRow}${meaningGrid}`;
  const unlockLabel = decision ? "Watch an ad to unlock my interpretation" : "Generate my personal interpretation";
  const readingClass = career ? "career-reading" : money ? "money-reading" : decision ? "decision-reading" : kin ? "kin-reading" : growth ? "growth-reading" : future ? "future-reading" : "";
  const parchmentClass = money ? "money-parchment" : decision ? "decision-parchment" : kin ? "kin-parchment" : growth ? "growth-parchment" : future ? "future-parchment" : "";
  const worldClass = career ? "career-world" : money ? "money-world" : decision ? "decision-world" : kin ? "kin-world" : growth ? "growth-world" : future ? "future-world" : "";
  return world(`<section class="scene reading ${readingClass}"><div class="parchment ${parchmentClass}"><p class="eyebrow">Oracle Veil · ${t("your reading")}</p><h2>${t(readingTitle)}</h2><p class="reading-question">“${escapeHTML(state.question)}”</p>${cardReading}<div class="ai-block">${state.aiUnlocked ? `<p class="eyebrow">${t("Personal interpretation")}</p><h3>${t("A reflection for the path in front of you")}</h3>${interpretation}` : `<div class="ai-lock"><p class="eyebrow">${t("A closer reflection")}</p><h3>${t("Would you like a personal interpretation?")}</h3><p>${unlockCopy}</p><button class="seal-button" data-action="unlock-ai">${t(unlockLabel)}</button></div>`}</div><p class="disclaimer">${t("Tarot is offered here as a reflective, imaginative tool—not a factual prediction or professional advice.")}</p><div class="reading-actions" aria-label="${t("Reading actions")}"><button class="reading-action reading-action-new" data-action="restart"><span>${t("New reading")}</span></button><button class="reading-action reading-action-share" data-action="share-image"><span>${t("Share")}</span></button></div></div></section>`, worldClass);
}
function renderAd() {
  if (!state.ad) return "";
  const ready = state.ad.ready;
  // Gated paths share one entrance ad, differing only in the copy and artwork
  // that promises what is on the other side of it.
  const entries = {
    "career-entry": { theme: "career-ad", title: "Unlock the Career path", illustration: "The next horizon<br>is taking shape.", copy: "Watch this brief sponsored moment to open the Career ritual.", wait: "A short passage before the Career ritual" },
    "money-entry": { theme: "money-ad", title: "Unlock the Money path", illustration: "The treasury<br>is taking shape.", copy: "Watch this brief sponsored moment to open the Money ritual.", wait: "A short passage before the Money ritual" },
    "decision-entry": { theme: "decision-ad", title: "Unlock the Decision path", illustration: "The crossroads<br>is taking shape.", copy: "Watch this brief sponsored moment to open the Decision ritual.", wait: "A short passage before the Decision ritual" },
    "kin-entry": { theme: "kin-ad", title: "Unlock the Bond path", illustration: "Two voices<br>find their place.", copy: "Watch this brief sponsored moment to open the Friendship / Family ritual.", wait: "A short passage before the Bond ritual" },
    "growth-entry": { theme: "growth-ad", title: "Unlock the Growth path", illustration: "The inner moon<br>is rising.", copy: "Watch this brief sponsored moment to open the Personal Growth ritual.", wait: "A short passage before the Growth ritual" },
    "future-entry": { theme: "future-ad", title: "Unlock the Future path", illustration: "The far horizon<br>is gathering light.", copy: "Watch this brief sponsored moment to open the General Future ritual.", wait: "A short passage before the Future ritual" }
  };
  const entry = entries[state.ad.intent];
  const title = entry
    ? t(entry.title)
    : state.ad.intent === "interpretation" ? t("A quiet pause before the closer reading") : t("A small doorway in the ritual");
  const illustration = entry ? t(entry.illustration) : t("The sky keeps<br>its own counsel.");
  const copy = entry ? t(entry.copy) : t("This placeholder is deliberately separate from the ritual so an advertising provider can be exchanged later.");
  const waitLabel = entry ? entry.wait : "The door opens in a breath…";
  return `<div class="ad-scrim ${entry ? entry.theme : ""}" role="dialog" aria-modal="true" aria-label="Mock advertisement"><section class="ad-card" tabindex="-1"><p class="ad-tag">${t("Mock sponsored moment")}</p><div class="ad-illustration">${illustration}</div><h2>${title}</h2><p>${copy}</p><div class="ad-footer"><span>${ready ? t("You may continue") : t(waitLabel)}</span><button class="text-button" data-action="dismiss-ad" ${ready ? "" : "disabled"}>${ready ? t("Continue") : t("Please wait")}</button></div></section></div>`;
}
function renderSettings() {
  if (!settingsOpen) return "";
  const languageNames = { en: "English", fr: "Français", ru: "Русский", zh: "中文" };
  return `<div class="settings-scrim" role="dialog" aria-modal="true" aria-labelledby="settings-title"><section class="settings-panel"><div class="settings-heading"><div><p class="eyebrow">Oracle Veil</p><h2 id="settings-title">${t("Settings")}</h2></div><button class="settings-close" data-action="close-settings" aria-label="Close settings">×</button></div><label class="settings-field" for="settings-language"><span>${t("Language")}</span><select id="settings-language"><option value="en" ${state.settings.language === "en" ? "selected" : ""}>English</option><option value="fr" ${state.settings.language === "fr" ? "selected" : ""}>Français</option><option value="ru" ${state.settings.language === "ru" ? "selected" : ""}>Русский</option><option value="zh" ${state.settings.language === "zh" ? "selected" : ""}>中文</option></select><small id="settings-language-value">${t("Selected:")} ${languageNames[state.settings.language]}</small></label><label class="settings-toggle" for="settings-sfx"><input id="settings-sfx" type="checkbox" ${state.settings.sfxEnabled ? "checked" : ""}><span><strong>${t("Sound effects")}</strong><small>${t("Card, shuffle, and transition sounds.")}</small></span></label><label class="settings-field" for="settings-volume"><span>${t("Volume")} <output id="settings-volume-value">${state.settings.volume}%</output></span><input id="settings-volume" type="range" min="0" max="100" value="${state.settings.volume}" ${state.settings.sfxEnabled ? "" : "disabled"}><small>${t("Controls every card, shuffle, and transition sound.")}</small></label><label class="settings-toggle" for="settings-music"><input id="settings-music" type="checkbox" ${state.settings.music ? "checked" : ""}><span><strong>${t("Background music")}</strong><small>“Sunset” — Kai Engel · CC BY 4.0</small></span></label><button class="seal-button settings-done" data-action="close-settings">${t("Save settings")}</button></section></div>`;
}
function debugPanel() {
  if (!state.debug) return `<button class="debug-toggle" data-action="toggle-debug" aria-label="Open ritual diagnostics">⌘</button>`;
  const chosen = state.category === "Career" ? state.career.selectedIds
    : state.category === "Money" ? state.money.selectedIds
      : state.category === "Decision" ? [state.decision.selectedId].filter(Boolean)
        : state.category === "Friendship / Family" ? state.kin.selectedIds
          : state.category === "General Future" ? state.future.selectedIds
            : state.selectedIds;
  return `<button class="debug-toggle" data-action="toggle-debug" aria-label="Close ritual diagnostics">×</button><aside class="debug-panel"><strong>Ritual diagnostics</strong><br>topic: ${state.category}<br>stage: ${state.stage}<br>seed: ${state.seed}<br>deck cards: ${state.deck.length}<br>piles: ${state.piles.map((p) => p.length).join(" / ") || "—"}<br>first cut: ${state.firstCut ?? "—"}<br>three cuts: ${state.threeCuts.join(", ") || "—"}<br>chosen: ${chosen.map((id) => id.split("-").slice(1, 2)).join(", ") || "—"}<br>revealed: ${state.revealedIds.length}/${readingPositions().length}<br>interactions: ${state.performance.interactions}<details><summary>Deck order (top → bottom)</summary>${state.deck.map((card, index) => `${String(index + 1).padStart(2, "0")}. ${escapeHTML(card.name)} ${card.reversed ? "↕" : "↑"}`).join("<br>")}</details><p><button class="text-button" data-action="toggle-simplified" aria-pressed="${state.settings.simplified}">${state.settings.simplified ? "Guided mode on" : "Guided mode off"}</button> <button class="text-button" data-action="reset-reading">Reset</button></p></aside>`;
}

function mountAd() {
  document.querySelector(".ad-scrim")?.remove();
  app.insertAdjacentHTML("beforeend", renderAd());
  document.querySelector(".ad-card")?.focus({ preventScroll: true });
}
function unmountAd() { document.querySelector(".ad-scrim")?.remove(); }
function markAdReady() {
  const scrim = document.querySelector(".ad-scrim");
  if (!scrim) return;
  const button = scrim.querySelector('[data-action="dismiss-ad"]');
  const note = scrim.querySelector(".ad-footer span");
  if (button) { button.disabled = false; button.textContent = t("Continue"); button.focus({ preventScroll: true }); }
  if (note) note.textContent = t("You may continue");
}
function flipRevealCard(id) {
  const card = cardById(id);
  const button = document.querySelector(`.reveal-layout [data-card-id="${id}"]`);
  state.revealedIds.push(id);
  if (!card || !button) { render(); return; }
  button.classList.remove("flip-pending");
  button.classList.add("flipped");
  button.disabled = true;
  button.setAttribute("aria-label", `${card.name}, ${t(card.reversed ? "Reversed" : "Upright").toLowerCase()}`);
  button.closest(".reveal-slot")?.querySelector(".orientation")?.classList.remove("is-hidden");
  interaction(); buzz([8, 20, 13]); sound("flip", .2);
  const actions = document.querySelector(".ritual-actions");
  if (actions) actions.innerHTML = revealActions();
}
function render() {
  let markup;
  if (state.stage === "start") markup = renderStart();
  else if (state.stage === "category") markup = renderCategory();
  else if (state.stage === "question") markup = renderQuestion();
  else if (state.stage === "reading") markup = renderReading();
  else if (state.stage === "share") markup = renderSharePage();
  else markup = renderRitual();
  app.innerHTML = `${markup}${renderAd()}${renderSettings()}${debugPanel()}`;
  updatePageLanguage();
  paintCardArt();
  bindGestures();
  if (shouldAutoSpread()) scheduleAutoSpread();
  if (state.stage === "share") void mountSharePreview();
  persist();
  // Announce stage changes by moving focus to the new heading (like a page change).
  // Skipped while a dialog is open and on the very first paint.
  if (state.stage !== lastFocusedStage && !settingsOpen && !state.ad) {
    lastFocusedStage = state.stage;
    const heading = app.querySelector(".world h1, .world h2");
    if (heading) {
      heading.setAttribute("tabindex", "-1");
      heading.focus({ preventScroll: true });
    }
  }
}

function reorderDeck(dx, dy, distance) {
  const amount = clamp(Math.round(distance / 10) + 4, 5, 24);
  let packet;
  if (dx >= 0) { packet = state.deck.splice(0, amount); state.deck.push(...packet); }
  else { packet = state.deck.splice(Math.max(0, state.deck.length - amount), amount); state.deck.unshift(...packet); }
  if (Math.abs(dy) > 70) {
    const card = state.deck[clamp(Math.round(state.deck.length * .5 + dx / 9), 0, state.deck.length - 1)];
    if (card) card.reversed = !card.reversed;
  }
}
function bindGestures() {
  const shuffle = document.querySelector("#shuffle-surface"); if (shuffle) bindShuffle(shuffle);
  const scatter = document.querySelector("#career-scatter-surface"); if (scatter) bindCareerScatter(scatter);
  const spread = document.querySelector("#spread-surface"); if (spread) bindSpread(spread);
}
function capturePointer(element, event) {
  try { element.setPointerCapture(event.pointerId); } catch { /* mouse fallback has no native pointer capture */ }
}
function bridgeMouseToPointer(element) {
  let sawNativePointer = false;
  let mouseDown = false;
  element.addEventListener("pointerdown", () => {
    sawNativePointer = true;
    queueMicrotask(() => { sawNativePointer = false; });
  }, { capture: true });
  element.addEventListener("mousedown", (event) => {
    if (sawNativePointer || event.button !== 0) return;
    mouseDown = true;
    element.dispatchEvent(new PointerEvent("pointerdown", { bubbles: true, pointerId: 99, pointerType: "mouse", clientX: event.clientX, clientY: event.clientY }));
  });
  window.addEventListener("mousemove", (event) => {
    if (!mouseDown) return;
    element.dispatchEvent(new PointerEvent("pointermove", { bubbles: true, pointerId: 99, pointerType: "mouse", clientX: event.clientX, clientY: event.clientY }));
  });
  window.addEventListener("mouseup", (event) => {
    if (!mouseDown) return;
    mouseDown = false;
    element.dispatchEvent(new PointerEvent("pointerup", { bubbles: true, pointerId: 99, pointerType: "mouse", clientX: event.clientX, clientY: event.clientY }));
  });
}
function bindShuffle(surface) {
  const pile = surface.querySelector(".scatter-pile");
  const cards = [...surface.querySelectorAll(".shuffle-card")];
  if (!pile) return;
  let active = false;
  let start = null;
  let last = null;
  let pileBox = null;
  let touched = new Set();
  let lastShuffleSoundAt = 0;
  const radius = () => Math.max(72, pileBox.width * .26);
  const nudge = (index, dx, dy, falloff) => {
    const piece = state.shuffleLayout[index];
    piece.x = clamp(piece.x + dx / pileBox.width * 100 * falloff, 8, 92);
    piece.y = clamp(piece.y + dy / pileBox.height * 100 * falloff, 24, 80);
    piece.r = Number((piece.r + dx * .16 * falloff).toFixed(2));
    piece.z = 40 + state.shuffleMoves + touched.size;
    const card = cards[index];
    card.style.setProperty("--x", `${piece.x}%`);
    card.style.setProperty("--y", `${piece.y}%`);
    card.style.setProperty("--r", `${piece.r}deg`);
    card.style.setProperty("--z", piece.z);
    card.classList.add("held");
    // Keep a tactile stream of shuffle ticks without spawning dozens of overlapping audio
    // elements when one broad sweep catches most of the deck in the same frame.
    if (!touched.has(index) && Date.now() - lastShuffleSoundAt >= 42) {
      lastShuffleSoundAt = Date.now();
      sound("shuffle", clamp(.09 + falloff * .08, .07, .19));
    }
    touched.add(index);
  };
  const centerOf = (index) => {
    const piece = state.shuffleLayout[index];
    return { x: pileBox.left + piece.x / 100 * pileBox.width, y: pileBox.top + piece.y / 100 * pileBox.height };
  };
  const wave = (px, py, dx, dy) => {
    const rad = radius();
    cards.forEach((card) => {
      const index = Number(card.dataset.shuffleIndex);
      const c = centerOf(index);
      const dist = Math.hypot(px - c.x, py - c.y);
      if (dist < rad) nudge(index, dx, dy, (1 - dist / rad) * 1.4);
    });
  };
  let pendingMove = null, moveRaf = 0;
  const processMove = () => {
    moveRaf = 0;
    if (!active || !pendingMove) return;
    const now = pendingMove; pendingMove = null;
    const dx = now.x - last.x;
    const dy = now.y - last.y;
    if (Math.hypot(dx, dy) < 1.5) return;
    wave(now.x, now.y, dx, dy);
    last = now;
  };
  surface.addEventListener("pointerdown", (event) => {
    if (transitioning) return;
    pileBox = pile.getBoundingClientRect();
    active = true;
    start = { x: event.clientX, y: event.clientY };
    last = start;
    touched = new Set();
    pile.classList.add("shuffling"); // instant, layout-free response while sweeping
    capturePointer(surface, event);
  });
  surface.addEventListener("pointermove", (event) => {
    if (!active) return;
    pendingMove = { x: event.clientX, y: event.clientY }; // coalesce to one wave per frame
    if (!moveRaf) moveRaf = requestAnimationFrame(processMove);
  });
  const finish = (event) => {
    if (!active) return;
    active = false;
    if (moveRaf) { cancelAnimationFrame(moveRaf); moveRaf = 0; }
    pendingMove = null;
    pile.classList.remove("shuffling");
    const px = Number.isFinite(event.clientX) ? event.clientX : last.x;
    const py = Number.isFinite(event.clientY) ? event.clientY : last.y;
    if (!touched.size) {
      const rad = radius();
      cards.forEach((card) => {
        const index = Number(card.dataset.shuffleIndex);
        const c = centerOf(index);
        const dist = Math.hypot(px - c.x, py - c.y);
        if (dist < rad) nudge(index, (c.x - px) * .6 || (index % 2 ? 24 : -24), (c.y - py) * .6 - 8, (1 - dist / rad) * 1.2);
      });
    }
    cards.forEach((card) => card.classList.remove("held"));
    const count = touched.size;
    if (!count) return;
    const dxTotal = px - start.x;
    const dyTotal = py - start.y;
    const distance = Math.max(Math.hypot(dxTotal, dyTotal), 42);
    const passes = clamp(Math.round(count / 3), 1, 4);
    for (let i = 0; i < passes; i += 1) reorderDeck(dxTotal >= 0 ? distance : -distance, dyTotal, distance);
    state.shuffleMoves += clamp(count, 1, 6);
    interaction(); buzz([8, 16, 10]);
    updateShuffleStatus();
  };
  surface.addEventListener("pointerup", finish);
  surface.addEventListener("pointercancel", finish);
}
// Push overlapping neighbours apart along an ellipse the size of a card. One relaxation
// pass per frame is enough to keep the table readable without the cards ever jittering.
function separateCareerScatter(box, cardBox, strength = .34) {
  const pieces = careerScatter();
  const moved = new Set();
  // Slightly wider than a card, so a sliver of table always shows between two of them.
  const gapX = Math.max(16, cardBox.width * 1.15);
  const gapY = Math.max(22, cardBox.height * .88);
  const shift = (piece, index, dxPx, dyPx) => {
    piece.x += dxPx / box.width * 100;
    piece.y += dyPx / box.height * 100;
    confineCareerScatterPoint(piece);
    moved.add(index);
  };
  for (let a = 0; a < pieces.length; a += 1) {
    for (let b = a + 1; b < pieces.length; b += 1) {
      const pa = pieces[a], pb = pieces[b];
      const nx = (pb.x - pa.x) / 100 * box.width / gapX;
      const ny = (pb.y - pa.y) / 100 * box.height / gapY;
      const dist = Math.hypot(nx, ny);
      let ux, uy;
      if (dist < .001) { // perfectly stacked: shove them apart on a deterministic diagonal
        ux = (a % 2 ? 1 : -1) * gapX * .3;
        uy = (b % 2 ? 1 : -1) * gapY * .3;
      } else if (dist < 1) {
        const push = (1 - dist) * strength;
        ux = nx / dist * gapX * push;
        uy = ny / dist * gapY * push;
      } else continue;
      shift(pa, a, -ux, -uy);
      shift(pb, b, ux, uy);
    }
  }
  return moved;
}
// Relax the whole table at once — used when the cards are laid out for choosing, so the
// final constellation is reachable even where a sweep never passed.
function relaxCareerScatter(passes = 26) {
  const field = document.querySelector(".career-orbit");
  const card = field?.querySelector(".career-ember-card");
  if (!field || !card) return;
  const box = field.getBoundingClientRect();
  // offsetWidth/Height, not the bounding rect: the cards are rotated, and their rect would
  // report the inflated axis-aligned box instead of the real card footprint.
  const cardBox = { width: card.offsetWidth, height: card.offsetHeight };
  if (!box.width || !cardBox.width) return;
  for (let pass = 0; pass < passes; pass += 1) separateCareerScatter(box, cardBox, .5);
}
function paintCareerScatterNodes(nodes) {
  nodes.forEach((node) => {
    const piece = state.career.scatter[Number(node.dataset.shuffleIndex)];
    if (!piece) return;
    node.style.setProperty("--x", `${piece.x}%`);
    node.style.setProperty("--y", `${piece.y}%`);
    node.style.setProperty("--r", `${piece.r}deg`);
    node.style.setProperty("--z", piece.z);
  });
}
function animateCareerAssistedScatter() {
  const surface = document.querySelector("#career-scatter-surface");
  const field = surface?.querySelector(".career-orbit");
  const nodes = [...(surface?.querySelectorAll(".career-ember-card") || [])];
  const pieces = careerScatter();
  const focus = pieces[Math.floor(Math.random() * pieces.length)];
  let moved = 0;
  pieces.forEach((piece) => {
    const dx = piece.x - focus.x;
    const dy = piece.y - focus.y;
    const distance = Math.hypot(dx, dy);
    if (distance > 34) return;
    const falloff = 1 - distance / 34;
    const ux = distance > .4 ? dx / distance : (piece.z % 2 ? 1 : -1);
    const uy = distance > .4 ? dy / distance : (piece.z % 3 ? .7 : -.7);
    piece.x += ux * 26 * falloff;
    piece.y += uy * 22 * falloff;
    confineCareerScatterPoint(piece);
    piece.r = Number((piece.r + (ux >= 0 ? 22 : -22) * falloff).toFixed(2));
    moved += 1;
  });
  // Vary the travel so two taps in a row cannot cut the same packet back where it started.
  const travel = 45 + Math.random() * 90;
  reorderDeck(Math.random() < .5 ? -travel : travel, 20, travel);
  state.career.shuffleMoves = (state.career.shuffleMoves || 0) + 2;
  interaction();
  buzz([7, 15, 9]);
  if (!surface || !field || !nodes.length) {
    render();
    return;
  }
  transitioning = true;
  field.classList.add("assisted-scatter");
  document.querySelectorAll(".ritual-actions button").forEach((button) => { button.disabled = true; });
  void field.offsetWidth;
  requestAnimationFrame(() => paintCareerScatterNodes(nodes));
  const soundCount = clamp(Math.ceil(moved / 4), 3, 5);
  for (let index = 0; index < soundCount; index += 1) {
    setTimeout(() => sound("shuffle", .1 + index * .008), index * 210);
  }
  setTimeout(() => {
    field.classList.remove("assisted-scatter");
    transitioning = false;
    const assist = document.querySelector('[data-action="assist-career-scatter"]');
    if (assist) assist.disabled = false;
    updateCareerScatterStatus();
  }, 1120);
}
function animateCareerLayOut() {
  const surface = document.querySelector("#career-scatter-surface");
  const field = surface?.querySelector(".career-orbit");
  const nodes = [...(surface?.querySelectorAll(".career-ember-card") || [])];
  if (!surface || !field || !nodes.length) {
    relaxCareerScatter();
    state.career.phase = "pick";
    interaction();
    render();
    return;
  }
  transitioning = true;
  document.querySelectorAll(".ritual-actions button").forEach((button) => { button.disabled = true; });
  relaxCareerScatter(30);
  surface.classList.add("laying-out");
  const guide = document.querySelector("#career-scatter-guide");
  if (guide) guide.textContent = t("The cards lie apart. Lay them out when you are ready.");
  void surface.offsetWidth;
  requestAnimationFrame(() => paintCareerScatterNodes(nodes));
  buzz([8, 14, 8]);
  [0, 280, 570, 880].forEach((delay, index) => {
    setTimeout(() => sound(index === 3 ? "spread" : "shuffle", .11 + index * .014), delay);
  });
  setTimeout(() => {
    state.career.phase = "pick";
    transitioning = false;
    interaction();
    render();
  }, 1450);
}
let careerPickAt = 0;
// Which tiny card did that tap mean? The closest centre inside a fingertip-sized reach,
// preferring the card lying on top where two of them are equally near.
function nearestCareerCard(px, py, cards, box, cardBox) {
  const pieces = careerScatter();
  const reach = Math.max(30, cardBox.width * 1.5, cardBox.height * .9);
  let best = null, bestScore = Infinity;
  pieces.forEach((piece, index) => {
    const node = cards[index];
    if (!node || !node.dataset.cardId) return;
    const dx = px - (box.left + piece.x / 100 * box.width);
    const dy = py - (box.top + piece.y / 100 * box.height);
    const dist = Math.hypot(dx, dy);
    if (dist > reach) return;
    const score = dist - piece.z * .04; // a hair of preference for the card on top
    if (score < bestScore) { bestScore = score; best = node; }
  });
  return best;
}
function bindCareerScatter(surface) {
  const field = surface.querySelector(".career-orbit");
  const nodes = [...surface.querySelectorAll(".career-ember-card")];
  if (!field || !nodes.length) return;
  const cards = [];
  nodes.forEach((node) => { cards[Number(node.dataset.shuffleIndex)] = node; });
  const picking = field.classList.contains("picking");
  let active = false, start = null, last = null, box = null, cardBox = null;
  let touched = new Set(), swept = false;
  let lastShuffleSoundAt = 0;
  const radius = () => Math.max(66, box.width * .24);
  const paint = (index) => {
    const piece = state.career.scatter[index];
    const card = cards[index];
    if (!piece || !card) return;
    card.style.setProperty("--x", `${piece.x}%`);
    card.style.setProperty("--y", `${piece.y}%`);
    card.style.setProperty("--r", `${piece.r}deg`);
    card.style.setProperty("--z", piece.z);
  };
  const move = (index, dxPx, dyPx, spin) => {
    const piece = state.career.scatter[index];
    if (!piece) return;
    piece.x += dxPx / box.width * 100;
    piece.y += dyPx / box.height * 100;
    confineCareerScatterPoint(piece);
    if (spin) piece.r = Number((piece.r + spin).toFixed(2));
  };
  const nudge = (index, dx, dy, falloff) => {
    move(index, dx * falloff, dy * falloff, dx * .18 * falloff);
    state.career.scatter[index].z = 40 + (state.career.shuffleMoves || 0) + touched.size;
    cards[index].classList.add("held");
    if (!touched.has(index) && Date.now() - lastShuffleSoundAt >= 42) {
      lastShuffleSoundAt = Date.now();
      sound("shuffle", clamp(.09 + falloff * .08, .07, .19));
    }
    touched.add(index);
  };
  const separate = (directlyMoved) => {
    const changed = separateCareerScatter(box, cardBox);
    directlyMoved.forEach((index) => changed.add(index));
    changed.forEach((index) => paint(index));
  };
  const wave = (px, py, dx, dy) => {
    const rad = radius();
    const directlyMoved = new Set();
    cards.forEach((card) => {
      const index = Number(card.dataset.shuffleIndex);
      const piece = state.career.scatter[index];
      if (!piece) return;
      const cx = box.left + piece.x / 100 * box.width;
      const cy = box.top + piece.y / 100 * box.height;
      const dist = Math.hypot(px - cx, py - cy);
      if (dist >= rad) return;
      const falloff = (1 - dist / rad) * 1.35;
      // A little of the push is radial (away from the finger), which is what turns the
      // sweep into a scatter rather than a clump travelling across the table.
      const away = dist > 4 ? { x: (cx - px) / dist, y: (cy - py) / dist } : { x: 0, y: -1 };
      nudge(index, dx + away.x * 14, dy + away.y * 10, falloff);
      directlyMoved.add(index);
    });
    separate(directlyMoved);
  };
  let pendingMove = null, moveRaf = 0;
  const processMove = () => {
    moveRaf = 0;
    if (!active || !pendingMove) return;
    const now = pendingMove; pendingMove = null;
    const dx = now.x - last.x;
    const dy = now.y - last.y;
    if (Math.hypot(dx, dy) < 1.5) return;
    wave(now.x, now.y, dx, dy);
    last = now;
  };
  surface.addEventListener("pointerdown", (event) => {
    if (transitioning) return;
    box = field.getBoundingClientRect();
    cardBox = { width: nodes[0].offsetWidth, height: nodes[0].offsetHeight };
    active = true;
    swept = false;
    start = { x: event.clientX, y: event.clientY };
    last = start;
    touched = new Set();
    field.classList.add("shuffling");
    // Capture only while sweeping: with a captured pointer the browser can retarget the
    // following click to the surface, which would swallow the tap that lifts a card.
    if (!picking) capturePointer(surface, event);
  });
  surface.addEventListener("pointermove", (event) => {
    if (!active) return;
    pendingMove = { x: event.clientX, y: event.clientY };
    if (!moveRaf) moveRaf = requestAnimationFrame(processMove);
  });
  const finish = (event) => {
    if (!active) return;
    active = false;
    if (moveRaf) { cancelAnimationFrame(moveRaf); moveRaf = 0; }
    pendingMove = null;
    field.classList.remove("shuffling");
    const px = Number.isFinite(event.clientX) ? event.clientX : last.x;
    const py = Number.isFinite(event.clientY) ? event.clientY : last.y;
    cards.forEach((card) => card.classList.remove("held"));
    const count = touched.size;
    if (!count) {
      // A still tap stays a tap, so picking a card is never a shove. The cards are far
      // smaller than a fingertip, so the nearest one within reach is the one you meant.
      if (picking) {
        const target = nearestCareerCard(px, py, cards, box, cardBox);
        if (target) { careerPickAt = Date.now(); act("career-ember", target); }
      }
      return;
    }
    swept = true;
    const dxTotal = px - start.x;
    const dyTotal = py - start.y;
    const distance = Math.max(Math.hypot(dxTotal, dyTotal), 42);
    const passes = clamp(Math.round(count / 3), 1, 4);
    if (!picking) {
      // Only the shuffle phase reorders the deck; once the cards are laid out for choosing,
      // moving one must not change which card is hiding under a given back.
      for (let i = 0; i < passes; i += 1) reorderDeck(dxTotal >= 0 ? distance : -distance, dyTotal, distance);
      state.career.shuffleMoves = (state.career.shuffleMoves || 0) + clamp(count, 1, 6);
      updateCareerScatterStatus();
    }
    interaction(); buzz([8, 16, 10]); persist();
  };
  surface.addEventListener("pointerup", finish);
  surface.addEventListener("pointercancel", finish);
  // A sweep that ends over a card must not also count as choosing it.
  surface.addEventListener("click", (event) => {
    if (!swept) return;
    swept = false;
    event.stopPropagation();
    event.preventDefault();
  }, true);
}
function updateCareerScatterStatus() {
  const moves = state.career.shuffleMoves || 0;
  const ready = moves >= 3;
  const status = document.querySelector("#career-scatter-status");
  const guide = document.querySelector("#career-scatter-guide");
  const button = document.querySelector('[data-action="career-scatter-done"]');
  if (status) status.textContent = ready ? t("The cards lie apart. Lay them out when you are ready.") : `${3 - moves} ${t("more sweeps will scatter the deck.")}`;
  if (guide) guide.textContent = `${moves} ${t("sweeps · keep scattering or lay them out")}`;
  if (button) button.disabled = !ready;
  document.querySelector(".career-ember-surface .physical-instruction")?.classList.add("quiet");
}
function updateShuffleStatus() {
  const ready = state.shuffleMoves >= 3;
  const status = document.querySelector("#shuffle-status");
  const guide = document.querySelector("#shuffle-guide");
  const button = document.querySelector('[data-action="shuffle-done"]');
  if (status) status.textContent = ready ? t("The cards feel mixed. Gather them when you are ready.") : `${3 - state.shuffleMoves} ${t("more moves will loosen the order.")}`;
  if (guide) guide.textContent = `${state.shuffleMoves} ${t("physical moves · keep mixing or gather them")}`;
  if (button) button.disabled = !ready;
}
function animateDeckCut(pieces, done) {
  const deck = document.querySelector(".side-deck");
  if (!deck || transitioning) return;
  transitioning = true;
  deck.classList.add(pieces === 2 ? "splitting-two" : pieces === 4 ? "splitting-four" : "splitting-three");
  document.querySelectorAll(".ritual-actions button").forEach((button) => { button.disabled = true; });
  buzz([9, 20, 9]);
  sound("cut", .2);
  setTimeout(() => { done(); transitioning = false; render(); }, 720);
}
function animateFutureCompassAlign() {
  const surface = document.querySelector("#future-compass-surface");
  if (!surface || transitioning || state.future.order.length !== 4) return;
  transitioning = true;
  surface.classList.add("aligning");
  document.querySelectorAll(".ritual-actions button").forEach((button) => { button.disabled = true; });
  buzz([7, 12, 7, 16, 10]);
  sound("gather", .18);
  setTimeout(() => sound("cut", .11), 270);
  setTimeout(() => {
    state.piles = state.future.order.map((index) => state.piles[index]);
    state.stage = "futureSpread";
    transitioning = false;
    interaction();
    render();
  }, 880);
}
function animateFutureSpread() {
  const surface = document.querySelector("#future-spread-surface");
  if (!surface || transitioning) return;
  transitioning = true;
  surface.classList.add("opening");
  sound("spread", .18);
  setTimeout(() => sound("spread", .12), 230);
  setTimeout(() => sound("spread", .1), 480);
  buzz([7, 14, 7, 14]);
  setTimeout(() => {
    state.stage = "futureChooseDawn";
    transitioning = false;
    interaction();
    render();
  }, 980);
}
function finishFuturePick(id) {
  if (!state.future.selectedIds.includes(id)) state.future.selectedIds.push(id);
  const nextStages = ["futureChooseDawn", "futureChooseZenith", "futureChooseDusk", "futureChooseMidnight"];
  const current = nextStages.indexOf(state.stage);
  if (current >= 0 && current < nextStages.length - 1) {
    state.stage = nextStages[current + 1];
  } else {
    preloadCardArt(readingCards());
    state.revealedIds = [];
    state.stage = "futureReveal";
  }
  transitioning = false;
  interaction();
  buzz([8, 16, 9]);
  sound("take", .17);
  render();
}
function animateFuturePickCard(element, id, pileIndex) {
  const active = futureStep();
  if (transitioning || pileIndex !== active || state.future.selectedIds.includes(id)) return;
  const card = cardById(id);
  const dock = document.querySelector(".future-compass-dock");
  if (!card || !dock) return;
  preloadCardArt(card);
  if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) {
    finishFuturePick(id);
    return;
  }
  transitioning = true;
  const from = element.getBoundingClientRect();
  const to = dock.getBoundingClientRect();
  const scale = (element.offsetWidth && from.width / element.offsetWidth) || 1;
  const dx = (to.left + to.width / 2 - (from.left + from.width / 2)) / scale;
  const dy = (to.top + to.height / 2 - (from.top + from.height / 2)) / scale;
  element.closest(".future-spread-card")?.classList.add("future-flying");
  const animation = element.animate([
    { transform: "translate(0,0) rotate(0deg) scale(1)", filter: "brightness(1)", offset: 0 },
    { transform: `translate(${dx * .72}px,${dy * .7 - 24}px) rotate(${pileIndex % 2 ? 7 : -7}deg) scale(.92)`, filter: "brightness(1.3)", offset: .68 },
    { transform: `translate(${dx}px,${dy}px) rotate(0deg) scale(.64)`, filter: "brightness(1.12)", offset: 1 }
  ], { duration: 620, easing: "cubic-bezier(.18,.82,.2,1)", fill: "forwards" });
  animation.finished.catch(() => {}).then(() => {
    dock.classList.add("receiving");
    setTimeout(() => finishFuturePick(id), 250);
  });
}
function createDefaultSpread() { return { start: { x: 13, y: 64 }, end: { x: 85, y: 56 }, bend: { x: 0, y: -17 }, rotation: 34 }; }
function spreadFromPoints(rect, points) {
  const normal = points.map((point) => ({ x: (point.x - rect.left) / rect.width * 100, y: (point.y - rect.top) / rect.height * 100 }));
  const start = normal[0], end = normal[normal.length - 1], mid = normal[Math.floor(normal.length / 2)];
  const linearMid = { x: (start.x + end.x) / 2, y: (start.y + end.y) / 2 };
  const dx = end.x - start.x, dy = end.y - start.y;
  const speed = Math.hypot(dx, dy) + normal.length * 1.6;
  return { start, end, bend: { x: (mid.x - linearMid.x) * 1.25, y: clamp((mid.y - linearMid.y) * 1.3 - 12, -26, 25) }, rotation: clamp(dx * .54 + dy * .12, -45, 45) * clamp(speed / 55, .62, 1.35) };
}
function spreadPreviewMarkup(path, count, committed = false) {
  return Array.from({ length: count }, (_, index) => {
    const p = positionForSpread(index, count, path);
    return `<i class="preview-card card back ${committed ? "committed" : ""}" style="left:${p.x}%;top:${p.y}%;z-index:${index + 1};--preview-r:${p.rotation}deg;--preview-delay:${Math.min(index * 5, 210)}ms"></i>`;
  }).join("");
}
function chooseStageAfterSpread() {
  if (state.category === "Decision") return "decisionChoose";
  if (state.category === "Career") return state.career.pileStep === 0 ? "careerChooseOne" : "careerChooseTwo";
  if (state.category === "Friendship / Family") return state.kin.pileStep === 0 ? "kinChooseOne" : "kinChooseTwo";
  return "choose";
}
function bindSpread(surface) {
  const deck = surface.querySelector(".deck"); if (!deck) return;
  const preview = surface.querySelector(".spread-preview-layer");
  let points = [];
  let rect = null;             // cached once per gesture — no getBoundingClientRect per move
  let pending = null, raf = 0; // coalesce pointermove work to one update per animation frame
  const stopRaf = () => { if (raf) { cancelAnimationFrame(raf); raf = 0; } pending = null; };
  const processMove = () => {
    raf = 0;
    if (!points.length || transitioning || !pending) return;
    const { x, y } = pending; pending = null;
    const start = points[0];
    const distance = Math.hypot(x - start.x, y - start.y);
    deck.style.transform = `translate(${(x - start.x) * .16}px, ${(y - start.y) * .11}px) rotate(${(x - start.x) * .06}deg)`;
    if (distance > 14 && preview) preview.innerHTML = spreadPreviewMarkup(spreadFromPoints(rect, points), clamp(Math.round(distance / 9), 6, 28));
  };
  const finishSpread = (event) => {
    stopRaf();
    if (!points.length || transitioning) return;
    points.push({ x: event.clientX, y: event.clientY });
    const a = points[0], b = points[points.length - 1];
    const distance = Math.hypot(b.x - a.x, b.y - a.y);
    if (distance < 36) {
      points = [];
      deck.classList.remove("is-grabbing");
      deck.style.transform = "";
      if (preview) preview.innerHTML = "";
      showToast(t("Sweep a little farther so the cards have room to open."));
      return;
    }
    state.spread = spreadFromPoints(rect, points);
    if (preview) preview.innerHTML = spreadPreviewMarkup(state.spread, state.deck.length, true);
    deck.classList.add("spread-source-away");
    transitioning = true;
    interaction(); buzz([7, 17, 7]); sound("spread", clamp(.1 + distance / 1000, .1, .22));
    setTimeout(() => {
      state.stage = chooseStageAfterSpread();
      transitioning = false;
      render();
    }, 620);
  };
  deck.addEventListener("pointerdown", (event) => {
    points = [{ x: event.clientX, y: event.clientY }];
    rect = surface.getBoundingClientRect();
    capturePointer(deck, event);
    deck.classList.add("is-grabbing");
    window.addEventListener("pointerup", finishSpread, { once: true });
    window.addEventListener("pointercancel", finishSpread, { once: true });
  });
  deck.addEventListener("pointermove", (event) => {
    if (!points.length || transitioning) return;
    if (points.length < 60) points.push({ x: event.clientX, y: event.clientY });
    pending = { x: event.clientX, y: event.clientY };
    if (!raf) raf = requestAnimationFrame(processMove);
  });
  deck.addEventListener("pointerup", finishSpread);
}

function animateShuffleGather() {
  const surface = document.querySelector("#shuffle-surface");
  if (!surface || transitioning || state.shuffleMoves < 3) return;
  transitioning = true;
  surface.classList.add("gathering");
  document.querySelectorAll(".ritual-actions button").forEach((button) => { button.disabled = true; });
  buzz([7, 14, 9]); sound("gather", .18);
  setTimeout(() => {
    // Money skips the single hidden-card cut entirely and goes straight to cutting into
    // three, so its threeCuts reset happens here instead of at Love's join-two step.
    if (state.category === "Money") {
      state.threeCuts = [];
      state.threeCutDraft = Math.round(state.deck.length * .3);
      state.stage = "cutThree";
    } else if (state.category === "Friendship / Family") {
      state.cutDraft = Math.round(state.deck.length * .46);
      state.stage = "kinCut";
    } else if (state.category === "Personal Growth") {
      state.spread = null;
      state.stage = "spread";
    } else if (state.category === "General Future") {
      state.future.cuts = [];
      state.future.cutDraft = Math.round(state.deck.length * .24);
      state.stage = "futureCutFour";
    } else {
      state.stage = state.category === "Decision" ? "decisionCut" : "cutOne";
    }
    transitioning = false; interaction(); render();
  }, 760);
}
function finishCareerGather() {
  const embers = state.career.emberIds.map(cardById).filter(Boolean);
  const emberSet = new Set(state.career.emberIds);
  state.career.heldCards = embers;
  state.career.selectedIds = [...state.career.emberIds];
  state.career.cut = null;
  state.career.pileStep = 0;
  state.deck = state.deck.filter((card) => !emberSet.has(card.id));
  state.piles = [];
  state.selectedIds = [];
  state.spread = null;
  state.cutDraft = Math.round(state.deck.length * .46);
  state.stage = "careerCut";
  transitioning = false;
  interaction();
  render();
}
function animateCareerGather() {
  const surface = document.querySelector("#career-scatter-surface");
  if (!surface || transitioning || state.career.emberIds.length !== 3) return;
  if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) {
    finishCareerGather();
    return;
  }
  transitioning = true;
  surface.classList.add("gathering");
  document.querySelectorAll(".ritual-actions button").forEach((button) => { button.disabled = true; });
  buzz([7, 14, 8, 18, 10]);
  sound("gather", .2);
  setTimeout(() => sound("gather", .13), 260);
  setTimeout(finishCareerGather, 860);
}
function animateRitualDraw() {
  const surface = document.querySelector("#ritual-card-surface");
  if (!surface || transitioning) return;
  transitioning = true;
  surface.classList.add("drawing-hidden");
  document.querySelectorAll('[data-action="take-ritual"]').forEach((button) => { button.disabled = true; });
  buzz([6, 12, 8]); sound("take", .14);
  setTimeout(() => {
    const lifted = state.piles[0];
    const ritual = lifted?.pop();
    if (ritual) { state.ritualCardId = ritual.id; state.ritualCard = ritual; preloadCardArt(ritual); state.stage = "reassembleOne"; }
    transitioning = false; interaction(); render();
  }, 680);
}
// Slide every pile onto the exact center of the field so they overlap into a single stack,
// instead of each nudging a fixed amount toward the middle. Depth 0 sits on top.
function convergePiles(field, depthFor) {
  const piles = [...field.querySelectorAll(".pile")];
  const depths = piles.map(depthFor); // capture selection-based depth before clearing it
  piles.forEach((pile) => {
    pile.classList.remove("chosen"); // once they start moving they are no longer "selected"
    pile.querySelector(".order-badge")?.remove();
    pile.querySelector(".pile-label")?.remove(); // drop the "pile one · N cards" text as they merge
    pile.style.transform = "none";
  });
  const fieldRect = field.getBoundingClientRect();
  const cx = fieldRect.left + fieldRect.width / 2;
  const cy = fieldRect.top + fieldRect.height / 2;
  piles.forEach((pile, index) => {
    const rect = pile.getBoundingClientRect();
    // On mobile the piles are shrunk with the CSS `scale` property, which is applied
    // *outside* this inline translate — so a screen-pixel delta lands short. Divide by
    // the element's real scale so the piles travel the full way onto the center and stack.
    const scale = (pile.offsetWidth && rect.width / pile.offsetWidth) || 1;
    const depth = depths[index];
    const dx = (cx - (rect.left + rect.width / 2)) / scale + depth * 2;
    const dy = (cy - (rect.top + rect.height / 2)) / scale + depth * 3;
    pile.style.zIndex = String(20 - depth);
    pile.style.transform = `translate(${dx}px, ${dy}px)`;
  });
}
function animateTwoPileJoin() {
  const field = document.querySelector("#reassemble-one-surface .pile-field");
  if (!field || transitioning || state.twoTop === null) return;
  transitioning = true;
  field.classList.add("joining");
  convergePiles(field, (pile) => pile.classList.contains("chosen") ? 0 : 1);
  document.querySelectorAll(".ritual-actions button").forEach((button) => { button.disabled = true; });
  buzz([8, 18, 11]); sound("gather", .2);
  setTimeout(() => {
    const other = state.twoTop === 0 ? 1 : 0;
    state.deck = [...(state.piles[state.twoTop] || []), ...(state.piles[other] || [])];
    state.piles = [];
    state.threeCuts = [];
    state.threeCutDraft = Math.round(state.deck.length * .3);
    state.stage = "cutThree";
    transitioning = false; interaction(); render();
  }, 760);
}
function animateThreePileJoin() {
  const field = document.querySelector("#reassemble-three-surface .pile-field");
  if (!field || transitioning || state.assemblyOrder.length !== 3) return;
  transitioning = true;
  field.classList.add("stacking");
  convergePiles(field, (pile) => Number(pile.style.getPropertyValue("--order")) || 0);
  document.querySelectorAll(".ritual-actions button").forEach((button) => { button.disabled = true; });
  buzz([7, 18, 11]); sound("gather", .2);
  setTimeout(() => {
    state.deck = state.assemblyOrder.flatMap((index) => state.piles[index]);
    state.piles = [];
    state.stage = "spread";
    transitioning = false; interaction(); render();
  }, 900);
}
// Money never merges the three piles: it only reorders them left to right, then opens
// the first one for spreading. Unlike animateThreePileJoin, the piles stay separate.
function animateMoneyPileOrder() {
  const field = document.querySelector("#reassemble-three-surface .pile-field");
  if (!field || transitioning || state.assemblyOrder.length !== 3) return;
  transitioning = true;
  field.classList.add("stacking");
  document.querySelectorAll(".ritual-actions button").forEach((button) => { button.disabled = true; });
  buzz([7, 16, 10]); sound("cut", .16);
  setTimeout(() => {
    state.piles = state.assemblyOrder.map((index) => state.piles[index]);
    state.assemblyOrder = [];
    state.money.pileStep = 0;
    state.money.selectedIds = [];
    state.deck = state.piles[0];
    state.selectedIds = [];
    state.spread = null;
    state.stage = "spread";
    transitioning = false; interaction(); render();
  }, 700);
}
function shouldAutoSpread() {
  return (state.category === "Career" && (state.stage === "careerSpreadOne" || state.stage === "careerSpreadTwo"))
    || (state.category === "Friendship / Family" && (state.stage === "kinSpreadOne" || state.stage === "kinSpreadTwo"))
    || (state.category === "Money" && state.stage === "spread")
    || (state.category === "Personal Growth" && state.stage === "spread")
    || (state.category === "General Future" && state.stage === "futureSpread");
}
function scheduleAutoSpread() {
  clearTimeout(autoSpreadTimer);
  autoSpreadTimer = setTimeout(() => {
    autoSpreadTimer = null;
    if (!shouldAutoSpread()) return;
    if (state.category === "General Future") animateFutureSpread();
    else animateAssistedSpread();
  }, 140);
}
function animateAssistedSpread() {
  const surface = document.querySelector("#spread-surface");
  const preview = surface?.querySelector(".spread-preview-layer");
  const deck = surface?.querySelector(".deck");
  if (!surface || !preview || !deck || transitioning) return;
  state.spread = createDefaultSpread();
  preview.innerHTML = spreadPreviewMarkup(state.spread, state.deck.length, true);
  deck.classList.add("spread-source-away");
  transitioning = true;
  interaction(); sound("spread", .16);
  setTimeout(() => {
    state.stage = chooseStageAfterSpread();
    transitioning = false;
    render();
  }, 620);
}
function animatePickCard(element, id) {
  const cap = state.category === "Money" || state.category === "Career" || state.category === "Friendship / Family" ? 1 : 3;
  if (transitioning || state.selectedIds.includes(id) || state.selectedIds.length >= cap) return;
  preloadCardArt(cardById(id)); // start loading the art now, while it flies to the dock
  const dock = document.querySelector(".draw-dock");
  if (!dock) return;
  if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) {
    state.selectedIds.push(id);
    interaction(); render();
    return;
  }
  transitioning = true;
  const from = element.getBoundingClientRect();
  const to = dock.getBoundingClientRect();
  // Divide by the card's real scale so the flight lands on the dock on mobile too,
  // where the spread cards are shrunk with the CSS `scale` property (see convergePiles).
  const scale = (element.offsetWidth && from.width / element.offsetWidth) || 1;
  const dx = (to.left + to.width / 2 - (from.left + from.width / 2)) / scale;
  const dy = (to.top + to.height / 2 - (from.top + from.height / 2)) / scale;
  element.closest(".spread-card")?.classList.add("flying");
  const animation = element.animate([
    { transform: "translate(0, 0) rotate(0deg)", filter: "brightness(1)" },
    { transform: `translate(${dx}px, ${dy}px) rotate(${state.selectedIds.length % 2 ? 5 : -5}deg) scale(.82)`, filter: "brightness(1.16)" }
  ], { duration: 460, easing: "cubic-bezier(.2,.75,.2,1)", fill: "forwards" });
  animation.finished.catch(() => {}).then(() => {
    state.selectedIds.push(id);
    transitioning = false; interaction(); buzz(12); sound("take", .17); render();
  });
}

function interleaveDecisionPiles(leftPile, rightPile) {
  const left = [...leftPile];
  const right = [...rightPile];
  const mixed = [];
  const random = rngFor(`${state.seed}-decision-riffle-${state.decision.cut ?? left.length}`);
  let fromLeft = random() < .5;
  while (left.length || right.length) {
    const source = fromLeft ? left : right;
    const fallback = fromLeft ? right : left;
    const active = source.length ? source : fallback;
    // Mostly single cards with occasional two- and three-card clumps: a natural riffle,
    // never one untouched half simply placed above the other.
    const roll = random();
    const count = roll > .9 ? 3 : roll > .64 ? 2 : 1;
    mixed.push(...active.splice(0, count));
    fromLeft = active === source ? !fromLeft : fromLeft;
  }
  return mixed;
}

function animateDecisionFuse() {
  const field = document.querySelector("#decision-fuse-surface .pile-field");
  if (!field || transitioning || state.piles.length !== 2) return;
  transitioning = true;
  const surface = document.querySelector("#decision-fuse-surface");
  field.classList.add("decision-riffling");
  surface?.classList.add("decision-fusing");
  document.querySelectorAll(".ritual-actions button").forEach((button) => { button.disabled = true; });
  buzz([7, 12, 7, 12, 10, 18]);
  sound("shuffle", .16);
  setTimeout(() => sound("shuffle", .13), 150);
  setTimeout(() => sound("shuffle", .14), 300);
  setTimeout(() => sound("shuffle", .12), 450);
  setTimeout(() => sound("gather", .16), 720);
  setTimeout(() => {
    state.deck = interleaveDecisionPiles(state.piles[0] || [], state.piles[1] || []);
    state.piles = [];
    state.stage = "decisionSpread";
    transitioning = false;
    interaction();
    render();
  }, 1120);
}

function finishDecisionChoice(id) {
  state.decision.selectedId = id;
  state.revealedIds = [];
  state.stage = "decisionReveal";
  state.aiUnlocked = false;
  state.aiLoading = false;
  state.aiText = null;
  state.aiSummary = null;
  state.aiError = null;
  transitioning = false;
  interaction();
  sound("gather", .18);
  buzz([8, 18, 12]);
  render();
}

function animateDecisionPickCard(element, id) {
  if (transitioning || state.decision.selectedId) return;
  const card = cardById(id);
  const dock = document.querySelector(".decision-draw-dock");
  if (!card || !dock) return;
  preloadCardArt(card);
  if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) {
    finishDecisionChoice(id);
    return;
  }
  transitioning = true;
  const from = element.getBoundingClientRect();
  const to = dock.getBoundingClientRect();
  const scale = (element.offsetWidth && from.width / element.offsetWidth) || 1;
  const dx = (to.left + to.width / 2 - (from.left + from.width / 2)) / scale;
  const dy = (to.top + to.height / 2 - (from.top + from.height / 2)) / scale;
  element.closest(".spread-card")?.classList.add("flying", "decision-flying");
  sound("take", .13);
  const animation = element.animate([
    { transform: "translate(0, 0) rotate(0deg) scale(1)", filter: "brightness(1)", offset: 0 },
    { transform: `translate(${dx * .78}px, ${dy * .72 - 22}px) rotate(-5deg) scale(.94)`, filter: "brightness(1.24)", offset: .7 },
    { transform: `translate(${dx}px, ${dy}px) rotate(0deg) scale(.82)`, filter: "brightness(1.12)", offset: 1 }
  ], { duration: 620, easing: "cubic-bezier(.18,.82,.2,1)", fill: "forwards" });
  animation.finished.catch(() => {}).then(() => {
    dock.classList.add("receiving");
    buzz([10, 18]);
    sound("gather", .14);
    setTimeout(() => finishDecisionChoice(id), 420);
  });
}

function resetReading() { state = createState(); persist(); render(); }
function act(action, element) {
  if (transitioning) return;
  if (action === "home" || action === "back-start") { state.stage = "start"; render(); return; }
  if (action === "begin") { state.stage = "category"; interaction(); render(); return; }
  if (action === "choose-love") { state.category = "Love"; state.question = ""; state.stage = "question"; interaction(); render(); return; }
  if (action === "choose-career") {
    state.category = "Career";
    state.question = "";
    state.ad = { intent: "career-entry", ready: false };
    mountAd(); interaction();
    setTimeout(() => { if (state.ad?.intent === "career-entry") { state.ad.ready = true; persist(); markAdReady(); } }, AD_CONFIG.minimumWatchMs);
    return;
  }
  if (action === "choose-money") {
    state.category = "Money";
    state.question = "";
    state.ad = { intent: "money-entry", ready: false };
    mountAd(); interaction();
    setTimeout(() => { if (state.ad?.intent === "money-entry") { state.ad.ready = true; persist(); markAdReady(); } }, AD_CONFIG.minimumWatchMs);
    return;
  }
  if (action === "choose-decision") {
    state.category = "Decision";
    state.question = "";
    state.ad = { intent: "decision-entry", ready: false };
    mountAd(); interaction();
    setTimeout(() => { if (state.ad?.intent === "decision-entry") { state.ad.ready = true; persist(); markAdReady(); } }, AD_CONFIG.minimumWatchMs);
    return;
  }
  if (action === "choose-kin" || action === "choose-growth" || action === "choose-future") {
    const path = action === "choose-kin" ? "kin" : action === "choose-growth" ? "growth" : "future";
    state.category = path === "kin" ? "Friendship / Family" : path === "growth" ? "Personal Growth" : "General Future";
    state.question = "";
    state.ad = { intent: `${path}-entry`, ready: false };
    mountAd(); interaction();
    setTimeout(() => { if (state.ad?.intent === `${path}-entry`) { state.ad.ready = true; persist(); markAdReady(); } }, AD_CONFIG.minimumWatchMs);
    return;
  }
  if (action === "back-category") { state.stage = "category"; render(); return; }
  if (action === "question-next") {
    if (state.question.trim().length < 4) return;
    if (state.category === "Decision") {
      state.decision = createDecisionState();
      state.piles = [];
      state.shuffleLayout = buildShuffleLayout(state.seed);
      state.shuffleMoves = 0;
      state.cutDraft = 36;
      state.spread = null;
      state.revealedIds = [];
      state.aiUnlocked = false; state.aiLoading = false; state.aiText = null; state.aiSummary = null; state.aiError = null;
      state.stage = "decisionShuffle";
    } else if (state.category === "Career") {
      state.career = createCareerState(state.seed);
      state.revealedIds = [];
      state.aiUnlocked = false; state.aiLoading = false; state.aiText = null; state.aiSummary = null; state.aiError = null;
      state.stage = "careerEmbers";
    } else if (state.category === "Money") {
      state.money = { pileStep: 0, selectedIds: [] };
      state.piles = [];
      state.assemblyOrder = [];
      state.selectedIds = [];
      state.spread = null;
      state.revealedIds = [];
      state.aiUnlocked = false; state.aiLoading = false; state.aiText = null; state.aiSummary = null; state.aiError = null;
      state.shuffleLayout = buildShuffleLayout(state.seed); state.shuffleMoves = 0; state.stage = "shuffle";
    } else if (state.category === "Friendship / Family") {
      state.kin = createKinState();
      state.piles = [];
      state.selectedIds = [];
      state.spread = null;
      state.revealedIds = [];
      state.aiUnlocked = false; state.aiLoading = false; state.aiText = null; state.aiSummary = null; state.aiError = null;
      state.shuffleLayout = buildShuffleLayout(state.seed); state.shuffleMoves = 0; state.cutDraft = 36; state.stage = "shuffle";
    } else if (state.category === "Personal Growth") {
      state.piles = [];
      state.ritualCardId = null; state.ritualCard = null;
      state.selectedIds = [];
      state.spread = null;
      state.revealedIds = [];
      state.aiUnlocked = false; state.aiLoading = false; state.aiText = null; state.aiSummary = null; state.aiError = null;
      state.shuffleLayout = buildShuffleLayout(state.seed); state.shuffleMoves = 0; state.stage = "shuffle";
    } else if (state.category === "General Future") {
      state.future = createFutureState();
      state.piles = [];
      state.selectedIds = [];
      state.spread = null;
      state.revealedIds = [];
      state.aiUnlocked = false; state.aiLoading = false; state.aiText = null; state.aiSummary = null; state.aiError = null;
      state.shuffleLayout = buildShuffleLayout(state.seed); state.shuffleMoves = 0; state.stage = "futureShuffle";
    } else {
      state.shuffleLayout = buildShuffleLayout(state.seed); state.shuffleMoves = 0; state.stage = "shuffle";
    }
    interaction(); buzz(12); render(); return;
  }
  if (action === "open-settings") { settingsOpen = true; render(); document.querySelector(".settings-close")?.focus(); return; }
  if (action === "close-settings") { settingsOpen = false; persistNow(); render(); document.querySelector(".settings-button")?.focus(); return; }
  if (action === "toggle-debug") { state.debug = !state.debug; render(); return; }
  if (action === "toggle-simplified") { state.settings.simplified = !state.settings.simplified; persistNow(); showToast(t(state.settings.simplified ? "Guided interaction mode is on." : "Guided interaction mode is off.")); render(); return; }
  if (action === "reset-reading" || action === "restart") { resetReading(); return; }
  if (action === "assist-shuffle") {
    const layout = state.shuffleLayout;
    const focus = layout[Math.floor(Math.random() * layout.length)];
    const dir = Math.random() < .5 ? -1 : 1;
    let moved = 0;
    layout.forEach((piece) => {
      const dist = Math.hypot(piece.x - focus.x, piece.y - focus.y);
      if (dist < 32) {
        const f = 1 - dist / 32;
        piece.x = clamp(piece.x + dir * 30 * f, 10, 90);
        piece.y = clamp(piece.y + (dir * 12 - 6) * f, 24, 80);
        piece.r = Number((piece.r + dir * 26 * f).toFixed(2));
        moved += 1;
      }
    });
    reorderDeck(dir * 60, 20, 90);
    state.shuffleMoves += 2; interaction(); buzz([7, 15, 9]);
    // Same "one sound per card moved" rule as the manual drag, since this button simulates a wave too.
    for (let i = 0; i < moved; i += 1) sound("shuffle", .08 + Math.random() * .08);
    render();
    return;
  }
  if (action === "shuffle-done") { animateShuffleGather(); return; }
  if (action === "make-first-cut") { const cut = clamp(Number(state.cutDraft) || Math.round(state.deck.length * .46), 9, state.deck.length - 9); animateDeckCut(2, () => { const source = state.deck; state.firstCut = cut; state.piles = [source.slice(0, cut), source.slice(cut)]; state.deck = []; state.twoTop = null; state.stage = "ritualCard"; interaction(); }); return; }
  if (action === "take-ritual") { animateRitualDraw(); return; }
  if (action === "choose-two-top") { state.twoTop = Number(element.dataset.pileIndex); interaction(); buzz(7); sound("take", .1); render(); return; }
  if (action === "join-two") { animateTwoPileJoin(); return; }
  if (action === "place-three-cut") {
    let cut = clamp(Number(state.threeCutDraft) || Math.round(state.deck.length * .3), 9, state.deck.length - 9);
    if (state.threeCuts.length === 0) {
      state.threeCuts = [cut];
      state.threeCutDraft = cut < state.deck.length / 2 ? Math.round(state.deck.length * .7) : Math.round(state.deck.length * .3);
      interaction(); buzz(9); sound("cut", .13); render();
    } else {
      const first = state.threeCuts[0];
      if (Math.abs(cut - first) < 12) cut = clamp(cut < first ? first - 12 : first + 12, 9, state.deck.length - 9);
      state.threeCuts = [first, cut];
      animateDeckCut(3, () => { const [a, b] = [...state.threeCuts].sort((x, y) => x - y); state.piles = [state.deck.slice(0, a), state.deck.slice(a, b), state.deck.slice(b)]; state.assemblyOrder = []; state.stage = state.category === "Money" ? "pileOrder" : "reassembleThree"; interaction(); });
    }
    return;
  }
  if (action === "choose-pile") { const index = Number(element.dataset.pileIndex); if (state.assemblyOrder.includes(index)) { state.assemblyOrder = state.assemblyOrder.filter((item) => item !== index); } else if (state.assemblyOrder.length < 3) { state.assemblyOrder.push(index); buzz(7); sound("take", .1); } interaction(); render(); return; }
  if (action === "reassemble-three") { if (state.category === "Money") animateMoneyPileOrder(); else animateThreePileJoin(); return; }
  if (action === "assist-spread") { animateAssistedSpread(); return; }
  if (action === "pick-card") { animatePickCard(element, element.dataset.cardId); return; }
  if (action === "pick-decision-card") { animateDecisionPickCard(element, element.dataset.cardId); return; }
  if (action === "to-reveal") {
    if (state.category === "Career") {
      if (state.selectedIds.length !== 1) return;
      state.career.selectedIds.push(state.selectedIds[0]);
      if (state.career.pileStep === 0) {
        state.career.pileStep = 1;
        state.deck = state.piles[1] || [];
        state.selectedIds = [];
        state.spread = null;
        state.stage = "careerSpreadTwo";
        interaction(); sound("cut", .14); render();
      } else {
        preloadCardArt(readingCards());
        state.revealedIds = [];
        state.stage = "careerReveal";
        interaction(); sound("spread", .18); render();
      }
      return;
    }
    if (state.category === "Friendship / Family") {
      if (state.selectedIds.length !== 1) return;
      state.kin.selectedIds.push(state.selectedIds[0]);
      if (state.kin.pileStep === 0) {
        state.kin.pileStep = 1;
        state.deck = state.piles[1] || [];
        state.selectedIds = [];
        state.spread = null;
        state.stage = "kinSpreadTwo";
        interaction(); sound("cut", .14); render();
      } else {
        preloadCardArt(readingCards());
        state.revealedIds = [];
        state.stage = "kinReveal";
        interaction(); sound("spread", .18); render();
      }
      return;
    }
    if (state.category === "Personal Growth") {
      if (state.selectedIds.length !== 3) return;
      preloadCardArt(readingCards());
      state.revealedIds = [];
      state.stage = "growthReveal";
      interaction(); sound("spread", .18); render();
      return;
    }
    if (state.category === "Money") {
      if (state.selectedIds.length !== 1) return;
      state.money.selectedIds.push(state.selectedIds[0]);
      const nextStep = state.money.pileStep + 1;
      if (nextStep < 3) {
        state.money.pileStep = nextStep;
        state.deck = state.piles[nextStep];
        state.selectedIds = [];
        state.spread = null;
        state.stage = "spread";
        interaction(); sound("cut", .14); render();
      } else {
        preloadCardArt(readingCards());
        state.stage = "moneyReveal";
        interaction(); sound("spread", .18); render();
      }
      return;
    }
    if (state.selectedIds.length !== 3) return;
    preloadCardArt(readingCards()); state.stage = "reveal"; interaction(); render(); return;
  }
  if (action === "assist-career-scatter") {
    animateCareerAssistedScatter(); return;
  }
  if (action === "career-scatter-done") {
    if ((state.career.shuffleMoves || 0) < 3) return;
    animateCareerLayOut(); return;
  }
  if (action === "career-scatter-again") {
    state.career.phase = "shuffle";
    state.career.emberIds = [];
    interaction(); sound("shuffle", .12); render(); return;
  }
  if (action === "career-ember") {
    if (state.career.phase !== "pick") return;
    const id = element.dataset.cardId;
    const selected = state.career.emberIds;
    let changed = false;
    if (selected.includes(id)) {
      state.career.emberIds = selected.filter((cardId) => cardId !== id);
      changed = true;
      sound("flip", .07);
    } else if (selected.length < 3) {
      state.career.emberIds.push(id);
      changed = true;
      buzz(8);
      sound("take", .09);
    }
    if (changed) {
      updateCareerEmberSelection(element);
      interaction();
    }
    return;
  }
  if (action === "career-raise") {
    animateCareerGather();
    return;
  }
  if (action === "career-make-cut") {
    if (!state.deck.length) return;
    const cut = clamp(Number(state.cutDraft) || Math.round(state.deck.length * .46), 9, state.deck.length - 9);
    animateDeckCut(2, () => {
      const source = state.deck;
      state.career.cut = cut;
      state.piles = [source.slice(0, cut), source.slice(cut)];
      state.career.pileStep = 0;
      state.career.selectedIds = [...state.career.emberIds];
      state.deck = state.piles[0];
      state.selectedIds = [];
      state.spread = null;
      state.stage = "careerSpreadOne";
      interaction();
    });
    return;
  }
  if (action === "kin-make-cut") {
    if (!state.deck.length) return;
    const cut = clamp(Number(state.cutDraft) || Math.round(state.deck.length * .46), 9, state.deck.length - 9);
    animateDeckCut(2, () => {
      const source = state.deck;
      state.kin.cut = cut;
      state.piles = [source.slice(0, cut), source.slice(cut)];
      state.kin.pileStep = 0;
      state.kin.selectedIds = [];
      state.deck = state.piles[0];
      state.selectedIds = [];
      state.spread = null;
      state.stage = "kinSpreadOne";
      interaction();
    });
    return;
  }
  if (action === "decision-make-cut") {
    if (!state.deck.length) return;
    const cut = clamp(Number(state.cutDraft) || Math.round(state.deck.length * .46), 9, state.deck.length - 9);
    animateDeckCut(2, () => {
      const source = state.deck;
      state.decision.cut = cut;
      state.piles = [source.slice(0, cut), source.slice(cut)];
      state.deck = [];
      state.stage = "decisionFuse";
      interaction();
    });
    return;
  }
  if (action === "decision-fuse") { animateDecisionFuse(); return; }
  if (action === "place-future-cut") {
    const cut = normalizeFutureCut(Number(state.future.cutDraft));
    if (!cut) return;
    if (state.future.cuts.length < 2) {
      state.future.cuts.push(cut);
      state.future.cuts.sort((a, b) => a - b);
      state.future.cutDraft = nextFutureCutDraft();
      interaction(); buzz(9); sound("cut", .13); render();
    } else {
      state.future.cuts.push(cut);
      state.future.cuts.sort((a, b) => a - b);
      animateDeckCut(4, () => {
        const [a, b, c] = state.future.cuts;
        state.piles = [state.deck.slice(0, a), state.deck.slice(a, b), state.deck.slice(b, c), state.deck.slice(c)];
        state.deck = [];
        state.future.order = [];
        state.future.selectedIds = [];
        state.stage = "futureCompass";
        interaction();
      });
    }
    return;
  }
  if (action === "choose-future-pile") {
    const index = Number(element.dataset.pileIndex);
    if (state.future.order.includes(index)) state.future.order = state.future.order.filter((item) => item !== index);
    else if (state.future.order.length < 4) { state.future.order.push(index); buzz(7); sound("take", .1); }
    interaction(); render(); return;
  }
  if (action === "align-future-compass") {
    if (state.future.order.length !== 4) return;
    animateFutureCompassAlign();
    return;
  }
  if (action === "pick-future-card") {
    animateFuturePickCard(element, element.dataset.cardId, Number(element.dataset.pileIndex));
    return;
  }

  if (action === "reveal-card") {
    const id = element.dataset.cardId;
    if (state.revealedIds.includes(id) || state.ad) return;
    if (!SEAMLESS_REVEAL_PATHS.includes(state.category) && AD_CONFIG.firstReveal && state.revealedIds.length === 0) {
      state.ad = { intent: "reveal", cardId: id, ready: false };
      element.classList.add("flip-pending");
      mountAd(); interaction();
      setTimeout(() => { if (state.ad?.cardId === id) { state.ad.ready = true; persist(); markAdReady(); } }, AD_CONFIG.minimumWatchMs);
      return;
    }
    flipRevealCard(id);
    return;
  }
  if (action === "dismiss-ad") {
    if (!state.ad?.ready) return;
    const ad = state.ad; state.ad = null; persist();
    unmountAd(); buzz([7, 18, 12]); sound("flip", .18);
    if (ad.intent === "interpretation") {
      state.aiUnlocked = true; state.aiLoading = true; state.aiText = null; state.aiSummary = null; state.aiError = null;
      interaction(); render(); void requestAIInterpretation();
    } else if (ad.intent === "career-entry") {
      state.stage = "question";
      interaction(); render();
    } else if (["money-entry", "decision-entry", "kin-entry", "growth-entry", "future-entry"].includes(ad.intent)) {
      state.stage = "question";
      interaction(); render();
    } else {
      flipRevealCard(ad.cardId);
    }
    return;
  }
  if (action === "open-reading") {
    state.stage = "reading";
    if (SEAMLESS_REVEAL_PATHS.includes(state.category) && !state.aiUnlocked) {
      state.aiUnlocked = true; state.aiLoading = true; state.aiText = null; state.aiSummary = null; state.aiError = null;
      interaction(); render(); void requestAIInterpretation();
    } else {
      interaction(); render();
    }
    return;
  }
  if (action === "unlock-ai") {
    if (!AD_CONFIG.unlockInterpretation) { state.aiUnlocked = true; render(); return; }
    state.ad = { intent: "interpretation", ready: false };
    mountAd(); interaction();
    setTimeout(() => { if (state.ad?.intent === "interpretation") { state.ad.ready = true; persist(); markAdReady(); } }, AD_CONFIG.minimumWatchMs);
    return;
  }
  if (action === "share-image") { if (readingCards().length !== readingPositions().length) return; resetShareCache(); state.shareTheme = "midnight"; state.stage = "share"; interaction(); render(); return; }
  if (action === "share-back") { shareSheetOpen = false; state.stage = "reading"; render(); return; }
  if (action === "share-theme") { const theme = element.dataset.theme; if (theme && theme !== state.shareTheme) { state.shareTheme = theme; sound("flip", .12); render(); } return; }
  if (action === "share-continue") { shareSheetOpen = true; sound("flip", .12); render(); document.querySelector(".share-tile")?.focus(); return; }
  if (action === "share-sheet-close") { shareSheetOpen = false; render(); return; }
  if (action === "share-sheet-keep") return; // click inside the sheet — keep it open
  if (action === "share-platform") { void shareToPlatform(element.dataset.platform, element); return; }
  if (action === "share-native") { void exportShareImage("share", element); return; }
  if (action === "share-save") { void exportShareImage("save", element); return; }
}

app.addEventListener("click", (event) => {
  const example = event.target.closest("[data-example]");
  if (example) { state.question = example.dataset.example; render(); return; }
  const target = event.target.closest("[data-action]"); if (!target || target.disabled) return;
  // The career scatter picks its card on pointerup (its cards are smaller than a fingertip,
  // so the tap is matched to the nearest one). Ignore the click that trails that tap, or the
  // ember would be lifted and immediately dropped again.
  if (target.dataset.action === "career-ember" && Date.now() - careerPickAt < 500) return;
  act(target.dataset.action, target);
});
function pickCutFromPoint(deck, clientY, knownRect = null) {
  const workbench = deck.closest(".cut-workbench");
  if (!workbench) return;
  const mode = workbench.dataset.cutMode;
  const total = state.deck.length;
  const rect = knownRect || deck.getBoundingClientRect();
  const frac = clamp((clientY - rect.top) / rect.height, 0, 1);
  let value = clamp(Math.round(frac * total), mode === "four" ? 8 : 9, total - (mode === "four" ? 8 : 9));
  if (mode === "three") {
    if (state.threeCuts.length && Math.abs(value - state.threeCuts[0]) < 12) value = value < state.threeCuts[0] ? state.threeCuts[0] - 12 : state.threeCuts[0] + 12;
    value = clamp(value, 9, total - 9);
    state.threeCutDraft = value;
  } else if (mode === "four") {
    value = normalizeFutureCut(value) ?? state.future.cutDraft;
    state.future.cutDraft = value;
  } else {
    state.cutDraft = value;
  }
  const range = workbench.querySelector(".cut-range");
  if (range) range.value = value;
  persist(); updateCutDeckVisual(mode, value);
}
function updateCutDeckVisual(mode, value) {
  const workbench = document.querySelector(`.cut-workbench[data-cut-mode="${mode}"]`);
  if (!workbench) return;
  const total = state.deck.length;
  const percent = value / total * 100;
  workbench.style.setProperty("--cut-pos", `${percent}%`);
  const reading = workbench.querySelector("#cut-reading");
  if (reading) reading.textContent = cutMood(value, total);
  const settled = mode === "four" ? state.future.cuts : state.threeCuts;
  const boundaries = mode === "two" ? [value] : [...settled, value].sort((a, b) => a - b);
  const all = [0, ...boundaries, total];
  workbench.querySelectorAll(".edge-segment").forEach((segment, index) => {
    const start = all[index];
    const end = all[index + 1];
    if (start === undefined || end === undefined) { segment.style.display = "none"; return; }
    segment.style.display = "block";
    segment.style.top = `${start / total * 100}%`;
    segment.style.height = `${(end - start) / total * 100}%`;
  });
}
app.addEventListener("input", (event) => {
  if (event.target.id === "settings-volume") {
    state.settings.volume = clamp(Number(event.target.value), 0, 100);
    document.querySelector("#settings-volume-value").value = `${state.settings.volume}%`;
    document.querySelector("#settings-volume-value").textContent = `${state.settings.volume}%`;
    persist();
    return;
  }
  if (event.target.id === "settings-language") {
    state.settings.language = event.target.value;
    updatePageLanguage(); persist(); render();
    return;
  }
  if (event.target.id === "settings-sfx") {
    state.settings.sfxEnabled = event.target.checked;
    persist(); render();
    return;
  }
  if (event.target.id === "settings-music") {
    state.settings.music = event.target.checked;
    if (state.settings.music) startBackgroundMusic(); else stopBackgroundMusic();
    persist();
    return;
  }
  if (event.target.id === "question-input") {
    state.question = event.target.value; persist();
    const button = document.querySelector('[data-action="question-next"]');
    if (button) button.disabled = state.question.trim().length < 4;
    return;
  }
  if (event.target.id === "first-cut-range") {
    state.cutDraft = Number(event.target.value);
    persist(); updateCutDeckVisual("two", state.cutDraft);
    return;
  }
  if (event.target.id === "three-cut-range") {
    let value = Number(event.target.value);
    if (state.threeCuts.length && Math.abs(value - state.threeCuts[0]) < 12) value = value < state.threeCuts[0] ? state.threeCuts[0] - 12 : state.threeCuts[0] + 12;
    value = clamp(value, 9, state.deck.length - 9);
    event.target.value = value;
    state.threeCutDraft = value;
    persist(); updateCutDeckVisual("three", value);
    return;
  }
  if (event.target.id === "future-cut-range") {
    const value = normalizeFutureCut(Number(event.target.value));
    if (value === null) return;
    event.target.value = value;
    state.future.cutDraft = value;
    persist(); updateCutDeckVisual("four", value);
  }
});

let cutDragDeck = null;
let cutDragRect = null;
let cutDragY = null;
let cutDragRaf = 0;
function processCutDrag() {
  cutDragRaf = 0;
  if (!cutDragDeck || !cutDragRect || cutDragY === null) return;
  const y = cutDragY;
  cutDragY = null;
  pickCutFromPoint(cutDragDeck, y, cutDragRect);
}
app.addEventListener("pointerdown", (event) => {
  if (transitioning) return;
  const deck = event.target.closest(".cut-workbench .side-deck");
  if (!deck) return;
  cutDragDeck = deck;
  cutDragRect = deck.getBoundingClientRect();
  cutDragY = null;
  capturePointer(deck, event);
  pickCutFromPoint(deck, event.clientY, cutDragRect);
});
window.addEventListener("pointermove", (event) => {
  if (!cutDragDeck) return;
  cutDragY = event.clientY;
  if (!cutDragRaf) cutDragRaf = requestAnimationFrame(processCutDrag);
});
function finishCutDrag(event) {
  if (cutDragDeck && cutDragRect && Number.isFinite(event?.clientY)) pickCutFromPoint(cutDragDeck, event.clientY, cutDragRect);
  if (cutDragRaf) cancelAnimationFrame(cutDragRaf);
  cutDragRaf = 0;
  cutDragY = null;
  cutDragRect = null;
  cutDragDeck = null;
}
window.addEventListener("pointerup", finishCutDrag);
window.addEventListener("pointercancel", finishCutDrag);

// Escape closes the settings dialog (and a finished mock ad), like a native dialog.
window.addEventListener("keydown", (event) => {
  if (event.key !== "Escape") return;
  if (settingsOpen) {
    settingsOpen = false;
    persistNow(); render();
    document.querySelector(".settings-button")?.focus();
  } else if (shareSheetOpen) {
    shareSheetOpen = false; render();
    document.querySelector('[data-action="share-continue"]')?.focus();
  } else if (state.ad?.ready) {
    act("dismiss-ad", null);
  }
});

// Artwork fallback: if a card image fails to load, swap in a styled text face
// instead of leaving a broken image. (error events do not bubble — capture them.)
app.addEventListener("error", (event) => {
  const img = event.target;
  if (!(img instanceof HTMLImageElement) || !img.classList.contains("card-image")) return;
  const fallback = document.createElement("span");
  fallback.className = "card-image-fallback";
  fallback.innerHTML = `<strong>${escapeHTML(img.dataset.name || "Tarot")}</strong><i>${escapeHTML(img.dataset.mark || "✦")}</i>`;
  img.replaceWith(fallback);
}, true);

if ("serviceWorker" in navigator) window.addEventListener("load", () => navigator.serviceWorker.register("./sw.js").catch(() => {}));
render();
