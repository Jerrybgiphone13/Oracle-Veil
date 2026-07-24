const app = document.querySelector("#app");
const STORAGE_KEY = "heart-cut-prototype-v2";
const AD_CONFIG = { firstReveal: true, unlockInterpretation: true, minimumWatchMs: 1100 };
const INTERPRETATION_ENDPOINT = "/api/interpretation";

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
const STAGES = ["shuffle", "cutOne", "ritualCard", "reassembleOne", "cutThree", "reassembleThree", "spread", "choose", "reveal", "reading"];
const POSITIONS = ["Hidden Heart", "You", "The Connection", "The Path Ahead"];

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
function stageIndex() { return Math.max(0, STAGES.indexOf(state.stage)); }
function cardById(id) {
  return state.ritualCard?.id === id ? state.ritualCard : state.deck.find((card) => card.id === id) || state.piles.flat().find((card) => card.id === id);
}
function readingCards() { return [state.ritualCardId, ...state.selectedIds].map(cardById).filter(Boolean); }
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
  return `./assets/tarot/${artworkName}.png`;
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
  return `<img class="card-image" src="${cardImagePath(card)}" alt="" draggable="false" loading="lazy" decoding="async" data-name="${escapeHTML(card.name)}" data-mark="${card.mark}">`;
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
  return `<div class="stage-progress" aria-label="Ritual progress">${STAGES.map((stage, index) => `<i class="${index < current ? "done" : index === current ? "active" : ""}" title="${stage}"></i>`).join("")}</div>`;
}
function topbar() {
  return `<header class="topbar"><button class="brand" data-action="home" aria-label="Return to the opening">The Heart Cut</button>
    <div class="utility-row"><button class="settings-button" data-action="open-settings" aria-haspopup="dialog">${t("Settings")}</button></div></header>`;
}
function world(content, className = "") {
  return `<section class="world ${className}"><div class="cloud-bank top"></div><div class="cloud-bank bottom"></div><div class="temple"></div>${topbar()}${content}</section>`;
}

function renderStart() {
  return world(`<section class="scene hero"><div><p class="eyebrow">${t("A quiet ritual for the heart")}</p><h1>${t("Enter the<br>celestial book.")}</h1><p class="lede">${t("A reading begins with the deck in your hands. The question can wait until you feel its weight.")}</p></div><div class="hero-deck-wrap"><div class="hero-deck">${deckBackStack("")}</div></div><button class="seal-button" data-action="begin">${t("Open the ritual")}</button></section>`, "start-world");
}
function renderCategory() {
  const categories = [["Love", "♡", true], ["Career", "⌁"], ["Money", "✦"], ["Decision", "⚭"], ["Friendship / Family", "⌇"], ["Personal Growth", "☾"], ["General Future", "☉"]];
  return world(`<section class="scene"><div class="ritual-head"><p class="eyebrow">${t("Choose a path")}</p><h1>${t("What calls for your attention?")}</h1><p class="lede">${t("Each reading has its own little choreography. Love is ready tonight.")}</p></div><div class="category-grid">${categories.map(([name, symbol, available]) => `<button class="category ${available ? "available" : ""}" ${available ? "data-action=choose-love" : "disabled"}><span class="symbol">${symbol}</span><span>${t(name)}</span><small>${available ? t("begin") : t("coming soon")}</small></button>`).join("")}</div><button class="back-link" data-action="back-start">${t("Return to the book")}</button></section>`);
}
function renderQuestion() {
  const examples = ["Where is this relationship going?", "What should I understand about this person?", "What is blocking my love life?", "What energy surrounds this connection?"];
  return world(`<section class="scene"><div class="parchment"><p class="eyebrow">The Heart Cut · ${t("Love")}</p><h2>${t("What does your heart wish to understand?")}</h2><p>${t("Give the question enough room to breathe. It does not need to be yes or no.")}</p><textarea id="question-input" class="question-box" maxlength="340" placeholder="${t("Write here…")}">${escapeHTML(state.question)}</textarea><ul class="examples">${examples.map((ex) => `<li><button data-example="${escapeHTML(t(ex))}">${t(ex)}</button></li>`).join("")}</ul><div class="question-actions"><button class="back-link" data-action="back-category">${t("Choose another path")}</button><button class="seal-button" data-action="question-next" ${state.question.trim().length < 4 ? "disabled" : ""}>${t("Place the question")}</button></div></div></section>`);
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
  const [title, lede] = copy[state.stage] || ["The Heart Cut", ""];
  return `<div class="ritual-head">${progress()}<p class="eyebrow">${t("Love ritual")}</p><h1>${t(title)}</h1><p class="lede">${t(lede)}</p></div>`;
}

function renderRitual() {
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
function renderShuffle() {
  const ready = state.shuffleMoves >= 3;
  const pieces = state.shuffleLayout?.length ? state.shuffleLayout : buildShuffleLayout(state.seed);
  return {
    surface: `<div class="table-surface shuffle-table" id="shuffle-surface"><div class="scatter-pile" aria-label="A loose pile of face-down tarot cards">${pieces.map((piece, index) => `<button class="shuffle-card card back" data-shuffle-index="${index}" aria-label="${t("Move card")} ${index + 1}" style="--x:${piece.x}%;--y:${piece.y}%;--r:${piece.r}deg;--z:${piece.z}"></button>`).join("")}</div><p class="physical-instruction ${state.shuffleMoves ? "quiet" : ""}">${t("Sweep across the loose cards to send a wave through the pile.")}</p><span class="piles-guide" id="shuffle-guide">${state.shuffleMoves ? `${state.shuffleMoves} ${t("physical moves · keep mixing or gather them")}` : t("Drag through the cards—a wave ripples across the pile")}</span></div>`,
    actions: `<p class="status-note" id="shuffle-status">${ready ? t("The cards feel mixed. Gather them when you are ready.") : `${3 - state.shuffleMoves} ${t("more moves will loosen the order.")}`}</p><button class="text-button" data-action="assist-shuffle">${t("Send a wave for me")}</button><button class="seal-button" data-action="shuffle-done" ${ready ? "" : "disabled"}>${t("Gather into a deck")}</button>`
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
  const draft = mode === "two" ? state.cutDraft : state.threeCutDraft;
  const settled = mode === "three" ? [...state.threeCuts].sort((a, b) => a - b) : [];
  const markers = settled.map((cut, index) => `<i class="cut-marker settled" style="top:${cut / total * 100}%" aria-hidden="true"><span>${index + 1}</span></i>`).join("");
  const boundaries = mode === "two" ? [draft] : [...settled, draft].sort((a, b) => a - b);
  const all = [0, ...boundaries, total];
  const segments = all.slice(0, -1).map((start, index) => `<div class="edge-segment segment-${index + 1}" style="top:${start / total * 100}%;height:${(all[index + 1] - start) / total * 100}%"></div>`).join("");
  return `<div class="cut-workbench" data-cut-mode="${mode}" style="--cut-pos:${draft / total * 100}%"><p class="side-label">${t("Side view · slide the brass marker up and down between the card edges")}</p><div class="cut-stage"><div class="side-deck" data-motion-key="main-deck">${segments}${markers}<i class="cut-marker active" aria-hidden="true"><span>✦</span></i></div><input class="cut-range" id="${mode === "two" ? "first-cut-range" : "three-cut-range"}" type="range" min="9" max="${total - 9}" value="${draft}" aria-label="${t("Choose where to cut the deck")}"></div><p class="cut-reading" id="cut-reading">${cutMood(draft, total)}</p></div>`;
}
function renderCutOne() {
  return { surface: `<div class="table-surface cut-table" id="cut-one-surface">${sideDeckMarkup("two")}<span class="piles-guide">${t("The deck is shown from the side so every possible cut is reachable.")}</span></div>`, actions: `<p class="status-note">${t("Move the marker, then lift the deck at that exact place.")}</p><button class="seal-button" data-action="make-first-cut">${t("Lift at this point")}</button>` };
}
function stackLayers() {
  return `<div class="stack-card"></div><div class="stack-card"></div><div class="stack-card"></div><div class="stack-card"></div>`;
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
  return { surface: `<div class="table-surface centered-table" id="ritual-card-surface"><div class="pile-field two">${pileMarkup(top, "0", t("lifted packet"), { extra: "lifted" })}${pileMarkup(bottom, "1", t("resting packet"))}<button class="ritual-draw-card card back" data-action="take-ritual" aria-label="${t("Draw the hidden card from beneath the lifted packet")}"></button></div><div class="hidden-heart-slot"><span>${t("Hidden Heart")}</span><i>${t("one card waits here")}</i></div></div>`, actions: `<p class="status-note">${t("The card directly beneath the lifted packet becomes the Hidden Heart.")}</p><button class="seal-button" data-action="take-ritual">${t("Draw the hidden card")}</button>` };
}
function renderReassembleOne() {
  return { surface: `<div class="table-surface centered-table" id="reassemble-one-surface"><div class="pile-field two choose-field">${pileMarkup(state.piles[0] || [], "0", `${t("pile")} 1`, { action: "choose-two-top", selected: state.twoTop === 0 })}${pileMarkup(state.piles[1] || [], "1", `${t("pile")} 2`, { action: "choose-two-top", selected: state.twoTop === 1 })}</div><div class="hidden-heart-slot filled"><span>${t("Hidden Heart")}</span>${cardBack("selected")}</div></div>`, actions: `<p class="status-note">${t("Tap the pile you want on top. Both piles will meet in the center.")}</p><button class="seal-button" data-action="join-two" ${state.twoTop === null ? "disabled" : ""}>${t("Stack with this pile on top")}</button>` };
}
function renderCutThree() {
  const cuts = state.threeCuts.length;
  return { surface: `<div class="table-surface cut-table" id="cut-three-surface">${sideDeckMarkup("three")}<span class="piles-guide">${cuts === 0 ? t("Place the first marker") : t("First marker set · choose a different place for the second")}</span></div>`, actions: `<p class="status-note">${cuts === 0 ? t("Choose the first break in the side of the deck.") : t("Choose the second break. The two markers will form three piles.")}</p><button class="seal-button" data-action="place-three-cut">${cuts === 0 ? t("Place first cut") : t("Make three piles")}</button>` };
}
function renderReassembleThree() {
  const selected = state.assemblyOrder;
  return { surface: `<div class="table-surface centered-table" id="reassemble-three-surface"><div class="pile-field three choose-field">${state.piles.map((pile, index) => { const order = selected.indexOf(index); return pileMarkup(pile, String(index), `${t("pile")} ${index + 1}`, { action: "choose-pile", selected: order >= 0, order: order >= 0 ? order : null }); }).join("")}</div><div class="hidden-heart-slot filled compact"><span>${t("Hidden Heart")}</span>${cardBack("selected")}</div></div>`, actions: `<p class="status-note">${selected.length ? `${selected.length} ${t("of 3 chosen · numbers show the top-to-bottom order")}` : t("Tap the pile that should return first (on top).")}</p><button class="seal-button" data-action="reassemble-three" ${selected.length === 3 ? "" : "disabled"}>${t("Stack in this order")}</button>` };
}
function renderSpread() {
  return { surface: `<div class="table-surface" id="spread-surface"><div class="spread-preview-layer" aria-hidden="true"></div>${deckBackStack("")}<span class="piles-guide">${t("One touch fans every card into a reading arc")}</span></div>`, actions: `<p class="status-note">${t("Open the spread and the cards fan across the table.")}</p><button class="seal-button" data-action="assist-spread">${t("Open the spread")}</button>` };
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
  return { surface: `<div class="table-surface"><div class="spread-layer">${state.deck.map((card, index) => {
    const p = positionForSpread(index, state.deck.length, spread);
    const isPicked = picked.has(card.id);
    return `<div class="spread-card ${isPicked ? "picked" : ""}" style="left:${p.x}%;top:${p.y}%;z-index:${index + 1};transform:translate(-50%,-50%) rotate(${p.rotation + card.microRotation}deg)"><button class="card back ${isPicked ? "selected" : ""}" data-action="pick-card" data-card-id="${card.id}" aria-label="${t("Select a face-down card")}"></button></div>`;
  }).join("")}</div><div class="draw-dock"><span class="dock-title">${t("Drawn")} · ${drawn}/3</span><div class="drawn-row">${state.selectedIds.map((id, index) => `<div style="--dock-r:${index === 1 ? 0 : index ? 5 : -5}deg">${cardBack("selected")}</div>`).join("")}</div></div></div>`, actions: `<p class="status-note">${drawn ? `${drawn} ${t(drawn === 1 ? "card has moved into the center tray." : "cards have moved into the center tray.")}` : t("Tap any face-down card. It will travel into the center tray.")}</p><button class="seal-button" data-action="to-reveal" ${drawn === 3 ? "" : "disabled"}>${t("Place the four cards")}</button>` };
}
function revealActions() {
  const done = state.revealedIds.length === 4;
  return `<p class="status-note">${done ? t("The reading is ready to be gathered.") : t("There is no required order.")}</p>${done ? `<button class="seal-button" data-action="open-reading">${t("Gather the reading")}</button>` : ""}`;
}
function renderReveal() {
  const cards = readingCards();
  preloadCardArt(cards); // ensure art is warming even on a reload straight into this stage
  return { surface: `<div class="reveal-layout">${cards.map((card, index) => {
    const revealed = state.revealedIds.includes(card.id);
    const pending = state.ad?.cardId === card.id;
    return `<div class="reveal-slot"><button class="card reveal-card ${card.reversed ? "reversed" : ""} ${revealed ? "flipped" : ""} ${pending ? "flip-pending" : ""}" data-action="reveal-card" data-card-id="${card.id}" ${revealed ? "disabled" : ""} aria-label="${revealed ? `${card.name}, ${t(card.reversed ? "Reversed" : "Upright").toLowerCase()}` : `${t("Reveal")} ${t(POSITIONS[index])}`}"><span class="card-inner"><span class="card-side back"></span><span class="card-side front">${faceInner(card)}</span></span></button><span class="label">${t(POSITIONS[index])}</span><span class="orientation ${revealed ? "" : "is-hidden"}">${t(card.reversed ? "Reversed" : "Upright")}</span></div>`;
  }).join("")}</div>`, actions: revealActions() };
}

function cardKeywords(card) {
  if (CARD_NOTES[card.name]) return CARD_NOTES[card.name];
  const suitWords = {
    Wands: ["desire", "momentum", "courage"], Cups: ["feeling", "connection", "receptivity"],
    Swords: ["clarity", "truth", "a necessary thought"], Pentacles: ["grounding", "value", "what can grow"],
    "Major Arcana": ["a larger pattern", "inner change", "attention"]
  };
  const words = suitWords[card.suit] || suitWords["Major Arcana"];
  return card.reversed ? ["turned inward", ...words.slice(0, 2)] : words;
}
function positionMeaning(position, card) {
  const upright = card.reversed ? "turned inward or delayed" : "available to meet directly";
  const snippets = {
    "Hidden Heart": `Under the question, ${card.name} suggests an influence that is ${upright}. Notice what has been felt before it has been named.`,
    "You": `In your own position, ${card.name} points to the way you are meeting this situation: ${upright}.`,
    "The Connection": `Between you and the connection itself, ${card.name} asks for attention to what is ${upright}.`,
    "The Path Ahead": `As a possible next movement, ${card.name} describes an energy that is ${upright}; treat it as guidance, not a fixed outcome.`
  };
  return snippets[position];
}
function personalInterpretation(cards) {
  const [hidden, you, connection, ahead] = cards;
  const reversed = cards.filter((card) => card.reversed).length;
  const question = state.question.trim() || "this question";
  return `Your question — “${question}” — is held here as an invitation to notice rather than a promise of certainty.

${hidden.name} sits beneath the surface as the Hidden Heart. It suggests that something subtle is already shaping how you approach this: an unspoken need, a hope, or a pattern asking to be acknowledged without being rushed.

In your position, ${you.name} asks you to meet the connection with more of your own voice present. The spread does not require you to predict another person; it invites you to be clear about what you need in order to feel respected and at ease.

${connection.name} describes the space between you. Look for the practical evidence of its message: how communication feels, what actions repeat, and whether tenderness is reciprocated. ${reversed ? `With ${reversed} reversed card${reversed > 1 ? "s" : ""}, some part of the story may need time, private reflection, or a change in perspective before it can move freely.` : "The cards lean toward directness rather than guessing."}

For the Path Ahead, ${ahead.name} offers a next small experiment rather than a verdict. Try one honest conversation, one boundary, or one act of self-care that brings your daily experience closer to the kind of love you want to practice. Let what happens next inform you.`;
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
  { id: "paper-moon", label: "Paper Moon" },
  { id: "midnight", label: "Midnight" },
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

  // Four cards, fanned, town skyline resting beneath them
  const cw = 238, ch = 397;
  const lefts = [40, 295, 548, 801];
  const tops = [664, 640, 646, 671];
  const angles = [-5, -1, 2, 5];
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
  if (cards.length !== 4) throw new Error("The reading is incomplete.");
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
  return `${summary}\n\n✦ My tarot reading from The Heart Cut · oracleveil.online`;
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
function shareTile(platform) {
  return `<button class="share-tile ${platform}" type="button" data-action="share-platform" data-platform="${platform}"><span class="share-tile-icon">${SHARE_ICONS[platform]}</span><span class="share-tile-label">${SHARE_PLATFORMS[platform].label}</span></button>`;
}
function renderShareSheet() {
  if (!shareSheetOpen) return "";
  const more = navigator.share ? `<button class="share-tile more" type="button" data-action="share-native"><span class="share-tile-icon">${SHARE_ICONS.more}</span><span class="share-tile-label">More</span></button>` : "";
  return `<div class="share-sheet-scrim" data-action="share-sheet-close">
    <section class="share-sheet" role="dialog" aria-modal="true" aria-label="Share your reading" data-action="share-sheet-keep">
      <span class="share-sheet-grip" aria-hidden="true"></span>
      <h3 class="share-sheet-title">Share your reading</h3>
      <p class="share-sheet-sub">Post your card to a story or feed.</p>
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
      <div class="share-brand">✦ THE HEART CUT ✦</div>
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
    state.aiError = "Live interpretation needs the local server. Open the app through the command in README.md.";
    persist(); render();
    return;
  }
  try {
    const response = await fetch(INTERPRETATION_ENDPOINT, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        question: state.question,
        cards: readingCards().map((card, index) => ({
          position: POSITIONS[index], name: card.name, orientation: card.reversed ? "reversed" : "upright"
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
    state.aiError = error instanceof Error ? error.message : "The interpretation service is unavailable.";
  } finally {
    state.aiLoading = false;
    persist(); render();
  }
}
function readingShareText() {
  return `${state.question}\n\n${readingCards().map((card, index) => `${POSITIONS[index]}: ${card.name} (${card.reversed ? "reversed" : "upright"})`).join("\n")}`;
}
function renderReading() {
  const cards = readingCards();
  const summary = state.aiSummary || personalSummary(cards);
  const interpretation = state.aiLoading
    ? `<p class="ai-copy">${t("Listening to the cards…")}</p>`
    : `<p class="ai-summary">${escapeHTML(summary)}</p><p class="ai-copy">${escapeHTML(state.aiText || personalInterpretation(cards))}</p>${state.aiError ? `<p class="disclaimer">${escapeHTML(state.aiError)} ${t("The prototype reading remains available below as a fallback.")}</p>` : ""}`;
  return world(`<section class="scene reading"><div class="parchment"><p class="eyebrow">The Heart Cut · ${t("your reading")}</p><h2>${t("Four cards, gathered beneath one sky.")}</h2><p class="reading-question">“${escapeHTML(state.question)}”</p><div class="reading-card-row">${cards.map((card) => `<div class="reading-card">${cardFace(card)}</div>`).join("")}</div><div class="meaning-grid">${cards.map((card, index) => `<article class="meaning"><p class="meaning-meta">${t(POSITIONS[index])} · ${t(card.reversed ? "Reversed" : "Upright").toLowerCase()}</p><h3>${escapeHTML(card.name)}</h3><p><strong>${cardKeywords(card).join(" · ")}</strong></p><p>${positionMeaning(POSITIONS[index], card)}</p></article>`).join("")}</div><div class="ai-block">${state.aiUnlocked ? `<p class="eyebrow">${t("Personal interpretation")}</p><h3>${t("A reflection for the path in front of you")}</h3>${interpretation}` : `<div class="ai-lock"><p class="eyebrow">${t("A closer reflection")}</p><h3>${t("Would you like a personal interpretation?")}</h3><p>${t("Watch a short ad to unlock a reflection based on your exact question and all four cards.")}</p><button class="seal-button" data-action="unlock-ai">${t("Generate my personal interpretation")}</button></div>`}</div><p class="disclaimer">${t("Tarot is offered here as a reflective, imaginative tool—not a factual prediction or professional advice.")}</p><div class="question-actions"><button class="back-link" data-action="restart">${t("Begin a new reading")}</button><button class="text-button" data-action="share-copy">${t("Copy the reading")}</button>${navigator.share ? `<button class="text-button" data-action="share-reading">${t("Share the reading")}</button>` : ""}</div><div class="share-row"><button class="seal-button share-button" data-action="share-image">${t("Share as an image")}</button></div></div></section>`);
}
function renderAd() {
  if (!state.ad) return "";
  const ready = state.ad.ready;
  const title = state.ad.intent === "interpretation" ? t("A quiet pause before the closer reading") : t("A small doorway in the ritual");
  return `<div class="ad-scrim" role="dialog" aria-modal="true" aria-label="Mock advertisement"><section class="ad-card" tabindex="-1"><p class="ad-tag">${t("Mock sponsored moment")}</p><div class="ad-illustration">${t("The sky keeps<br>its own counsel.")}</div><h2>${title}</h2><p>${t("This placeholder is deliberately separate from the ritual so an advertising provider can be exchanged later.")}</p><div class="ad-footer"><span>${ready ? t("You may continue") : t("The door opens in a breath…")}</span><button class="text-button" data-action="dismiss-ad" ${ready ? "" : "disabled"}>${ready ? t("Continue") : t("Please wait")}</button></div></section></div>`;
}
function renderSettings() {
  if (!settingsOpen) return "";
  const languageNames = { en: "English", fr: "Français", ru: "Русский", zh: "中文" };
  return `<div class="settings-scrim" role="dialog" aria-modal="true" aria-labelledby="settings-title"><section class="settings-panel"><div class="settings-heading"><div><p class="eyebrow">The Heart Cut</p><h2 id="settings-title">${t("Settings")}</h2></div><button class="settings-close" data-action="close-settings" aria-label="Close settings">×</button></div><label class="settings-field" for="settings-language"><span>${t("Language")}</span><select id="settings-language"><option value="en" ${state.settings.language === "en" ? "selected" : ""}>English</option><option value="fr" ${state.settings.language === "fr" ? "selected" : ""}>Français</option><option value="ru" ${state.settings.language === "ru" ? "selected" : ""}>Русский</option><option value="zh" ${state.settings.language === "zh" ? "selected" : ""}>中文</option></select><small id="settings-language-value">${t("Selected:")} ${languageNames[state.settings.language]}</small></label><label class="settings-toggle" for="settings-sfx"><input id="settings-sfx" type="checkbox" ${state.settings.sfxEnabled ? "checked" : ""}><span><strong>${t("Sound effects")}</strong><small>${t("Card, shuffle, and transition sounds.")}</small></span></label><label class="settings-field" for="settings-volume"><span>${t("Volume")} <output id="settings-volume-value">${state.settings.volume}%</output></span><input id="settings-volume" type="range" min="0" max="100" value="${state.settings.volume}" ${state.settings.sfxEnabled ? "" : "disabled"}><small>${t("Controls every card, shuffle, and transition sound.")}</small></label><label class="settings-toggle" for="settings-music"><input id="settings-music" type="checkbox" ${state.settings.music ? "checked" : ""}><span><strong>${t("Background music")}</strong><small>“Sunset” — Kai Engel · CC BY 4.0</small></span></label><button class="seal-button settings-done" data-action="close-settings">${t("Save settings")}</button></section></div>`;
}
function debugPanel() {
  if (!state.debug) return `<button class="debug-toggle" data-action="toggle-debug" aria-label="Open ritual diagnostics">⌘</button>`;
  return `<button class="debug-toggle" data-action="toggle-debug" aria-label="Close ritual diagnostics">×</button><aside class="debug-panel"><strong>Ritual diagnostics</strong><br>stage: ${state.stage}<br>seed: ${state.seed}<br>deck cards: ${state.deck.length}<br>piles: ${state.piles.map((p) => p.length).join(" / ") || "—"}<br>first cut: ${state.firstCut ?? "—"}<br>three cuts: ${state.threeCuts.join(", ") || "—"}<br>chosen: ${state.selectedIds.map((id) => id.split("-").slice(1, 2)).join(", ") || "—"}<br>revealed: ${state.revealedIds.length}/4<br>interactions: ${state.performance.interactions}<details><summary>Deck order (top → bottom)</summary>${state.deck.map((card, index) => `${String(index + 1).padStart(2, "0")}. ${escapeHTML(card.name)} ${card.reversed ? "↕" : "↑"}`).join("<br>")}</details><p><button class="text-button" data-action="toggle-simplified" aria-pressed="${state.settings.simplified}">${state.settings.simplified ? "Guided mode on" : "Guided mode off"}</button> <button class="text-button" data-action="reset-reading">Reset</button></p></aside>`;
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
    // One "shuffle" sample per card the very moment it starts moving — not per gesture — so the
    // number of sounds heard tracks the number of cards actually swept, like a real deck. A wide
    // wave can catch many cards in the same instant, so stagger them into a cascade, not one blast.
    if (!touched.has(index)) setTimeout(() => sound("shuffle", clamp(.08 + falloff * .09, .06, .2)), Math.random() * 80);
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
  surface.addEventListener("pointerdown", (event) => {
    if (transitioning) return;
    pileBox = pile.getBoundingClientRect();
    active = true;
    start = { x: event.clientX, y: event.clientY };
    last = start;
    touched = new Set();
    capturePointer(surface, event);
  });
  surface.addEventListener("pointermove", (event) => {
    if (!active) return;
    const now = { x: event.clientX, y: event.clientY };
    const dx = now.x - last.x;
    const dy = now.y - last.y;
    if (Math.hypot(dx, dy) < 1.5) return;
    wave(now.x, now.y, dx, dy);
    last = now;
  });
  const finish = (event) => {
    if (!active) return;
    active = false;
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
  deck.classList.add(pieces === 2 ? "splitting-two" : "splitting-three");
  document.querySelectorAll(".ritual-actions button").forEach((button) => { button.disabled = true; });
  buzz([9, 20, 9]);
  sound("cut", .2);
  setTimeout(() => { done(); transitioning = false; render(); }, 720);
}
function createDefaultSpread() { return { start: { x: 13, y: 64 }, end: { x: 85, y: 56 }, bend: { x: 0, y: -17 }, rotation: 34 }; }
function spreadFromPoints(surface, points) {
  const rect = surface.getBoundingClientRect();
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
function bindSpread(surface) {
  const deck = surface.querySelector(".deck"); if (!deck) return;
  const preview = surface.querySelector(".spread-preview-layer");
  let points = [];
  const finishSpread = (event) => {
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
    state.spread = spreadFromPoints(surface, points);
    if (preview) preview.innerHTML = spreadPreviewMarkup(state.spread, state.deck.length, true);
    deck.classList.add("spread-source-away");
    transitioning = true;
    interaction(); buzz([7, 17, 7]); sound("spread", clamp(.1 + distance / 1000, .1, .22));
    setTimeout(() => { state.stage = "choose"; transitioning = false; render(); }, 620);
  };
  deck.addEventListener("pointerdown", (event) => {
    points = [{ x: event.clientX, y: event.clientY }];
    capturePointer(deck, event);
    deck.classList.add("is-grabbing");
    window.addEventListener("pointerup", finishSpread, { once: true });
    window.addEventListener("pointercancel", finishSpread, { once: true });
  });
  deck.addEventListener("pointermove", (event) => {
    if (!points.length || transitioning) return;
    if (points.length < 60) points.push({ x: event.clientX, y: event.clientY });
    const start = points[0];
    const distance = Math.hypot(event.clientX - start.x, event.clientY - start.y);
    deck.style.transform = `translate(${(event.clientX - start.x) * .16}px, ${(event.clientY - start.y) * .11}px) rotate(${(event.clientX - start.x) * .06}deg)`;
    deck.classList.add("is-grabbing");
    if (distance > 14 && preview) preview.innerHTML = spreadPreviewMarkup(spreadFromPoints(surface, points), clamp(Math.round(distance / 9), 6, 32));
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
  setTimeout(() => { state.stage = "cutOne"; transitioning = false; interaction(); render(); }, 760);
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
  setTimeout(() => { state.stage = "choose"; transitioning = false; render(); }, 620);
}
function animatePickCard(element, id) {
  if (transitioning || state.selectedIds.includes(id) || state.selectedIds.length >= 3) return;
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

function resetReading() { state = createState(); persist(); render(); }
function act(action, element) {
  if (transitioning) return;
  if (action === "home" || action === "back-start") { state.stage = "start"; render(); return; }
  if (action === "begin") { state.stage = "category"; interaction(); render(); return; }
  if (action === "choose-love") { state.stage = "question"; interaction(); render(); return; }
  if (action === "back-category") { state.stage = "category"; render(); return; }
  if (action === "question-next") { if (state.question.trim().length < 4) return; state.shuffleLayout = buildShuffleLayout(state.seed); state.shuffleMoves = 0; state.stage = "shuffle"; interaction(); buzz(12); render(); return; }
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
      animateDeckCut(3, () => { const [a, b] = [...state.threeCuts].sort((x, y) => x - y); state.piles = [state.deck.slice(0, a), state.deck.slice(a, b), state.deck.slice(b)]; state.assemblyOrder = []; state.stage = "reassembleThree"; interaction(); });
    }
    return;
  }
  if (action === "choose-pile") { const index = Number(element.dataset.pileIndex); if (state.assemblyOrder.includes(index)) { state.assemblyOrder = state.assemblyOrder.filter((item) => item !== index); } else if (state.assemblyOrder.length < 3) { state.assemblyOrder.push(index); buzz(7); sound("take", .1); } interaction(); render(); return; }
  if (action === "reassemble-three") { animateThreePileJoin(); return; }
  if (action === "assist-spread") { animateAssistedSpread(); return; }
  if (action === "pick-card") { animatePickCard(element, element.dataset.cardId); return; }
  if (action === "to-reveal") { if (state.selectedIds.length !== 3) return; preloadCardArt(readingCards()); state.stage = "reveal"; interaction(); render(); return; }
  if (action === "reveal-card") {
    const id = element.dataset.cardId;
    if (state.revealedIds.includes(id) || state.ad) return;
    if (AD_CONFIG.firstReveal && state.revealedIds.length === 0) {
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
    } else {
      flipRevealCard(ad.cardId);
    }
    return;
  }
  if (action === "open-reading") { state.stage = "reading"; interaction(); render(); return; }
  if (action === "unlock-ai") {
    if (!AD_CONFIG.unlockInterpretation) { state.aiUnlocked = true; render(); return; }
    state.ad = { intent: "interpretation", ready: false };
    mountAd(); interaction();
    setTimeout(() => { if (state.ad?.intent === "interpretation") { state.ad.ready = true; persist(); markAdReady(); } }, AD_CONFIG.minimumWatchMs);
    return;
  }
  if (action === "share-copy") { navigator.clipboard?.writeText(readingShareText()).then(() => showToast(t("Reading copied.")), () => showToast(t("Copy is unavailable in this browser."))); return; }
  if (action === "share-reading") { if (navigator.share) navigator.share({ title: "The Heart Cut", text: readingShareText() }).catch(() => {}); return; }
  if (action === "share-image") { if (readingCards().length !== 4) return; resetShareCache(); state.stage = "share"; interaction(); render(); return; }
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
  const target = event.target.closest("[data-action]"); if (target && !target.disabled) act(target.dataset.action, target);
});
function pickCutFromPoint(deck, clientY) {
  const workbench = deck.closest(".cut-workbench");
  if (!workbench) return;
  const mode = workbench.dataset.cutMode;
  const total = state.deck.length;
  const rect = deck.getBoundingClientRect();
  const frac = clamp((clientY - rect.top) / rect.height, 0, 1);
  let value = clamp(Math.round(frac * total), 9, total - 9);
  if (mode === "three") {
    if (state.threeCuts.length && Math.abs(value - state.threeCuts[0]) < 12) value = value < state.threeCuts[0] ? state.threeCuts[0] - 12 : state.threeCuts[0] + 12;
    value = clamp(value, 9, total - 9);
    state.threeCutDraft = value;
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
  const boundaries = mode === "two" ? [value] : [...state.threeCuts, value].sort((a, b) => a - b);
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
  }
});

let cutDragDeck = null;
app.addEventListener("pointerdown", (event) => {
  if (transitioning) return;
  const deck = event.target.closest(".cut-workbench .side-deck");
  if (!deck) return;
  cutDragDeck = deck;
  capturePointer(deck, event);
  pickCutFromPoint(deck, event.clientY);
});
window.addEventListener("pointermove", (event) => { if (cutDragDeck) pickCutFromPoint(cutDragDeck, event.clientY); });
window.addEventListener("pointerup", () => { cutDragDeck = null; });
window.addEventListener("pointercancel", () => { cutDragDeck = null; });

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
