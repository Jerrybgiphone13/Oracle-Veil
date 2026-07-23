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
    "Begin a new reading": "Commencer une nouvelle lecture", "Copy the reading": "Copier la lecture"
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
    "Begin a new reading": "Начать новое гадание", "Copy the reading": "Скопировать гадание"
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
    "Begin a new reading": "开始新的解读", "Copy the reading": "复制解读"
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
    aiUnlocked: false,
    aiLoading: false,
    aiText: null,
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
const MUSIC_URL = "https://upload.wikimedia.org/wikipedia/commons/a/af/Kai_Engel_-_09_-_Sunset.ogg";
const MUSIC_LEVEL = 0.5;
let musicAudio;
let musicContext;
let musicMaster;
let musicNodes = [];
let musicUsesSynth = false;

function persist() { localStorage.setItem(STORAGE_KEY, JSON.stringify(state)); }
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
  const toast = document.createElement("div"); toast.className = "toast"; toast.textContent = message; document.body.append(toast);
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
function cardFace(card, extra = "") {
  return `<button class="card face image-face ${card.reversed ? "reversed" : ""} ${extra}" aria-label="${escapeHTML(card.name)}${card.reversed ? ", reversed" : ", upright"}">
    <img class="card-image" src="${cardImagePath(card)}" alt="" draggable="false">
  </button>`;
}
function faceInner(card) {
  return `<img class="card-image" src="${cardImagePath(card)}" alt="" draggable="false">`;
}
function cardBack(extra = "") { return `<button class="card back ${extra}" aria-label="Face-down tarot card"></button>`; }
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
    surface: `<div class="table-surface shuffle-table" id="shuffle-surface"><div class="scatter-pile" aria-label="A loose pile of face-down tarot cards">${pieces.map((piece, index) => `<button class="shuffle-card card back" data-shuffle-index="${index}" aria-label="Move card ${index + 1}" style="--x:${piece.x}%;--y:${piece.y}%;--r:${piece.r}deg;--z:${piece.z}"></button>`).join("")}</div><p class="physical-instruction ${state.shuffleMoves ? "quiet" : ""}">Sweep across the loose cards to send a wave through the pile.</p><span class="piles-guide" id="shuffle-guide">${state.shuffleMoves ? `${state.shuffleMoves} physical move${state.shuffleMoves === 1 ? "" : "s"} · keep mixing or gather them` : "Drag through the cards—a wave ripples across the pile"}</span></div>`,
    actions: `<p class="status-note" id="shuffle-status">${ready ? "The cards feel mixed. Gather them when you are ready." : `${3 - state.shuffleMoves} more move${3 - state.shuffleMoves === 1 ? "" : "s"} will loosen the order.`}</p><button class="text-button" data-action="assist-shuffle">${t("Send a wave for me")}</button><button class="seal-button" data-action="shuffle-done" ${ready ? "" : "disabled"}>${t("Gather into a deck")}</button>`
  };
}
function cutMood(value, total) {
  const ratio = value / Math.max(1, total);
  if (ratio < .34) return "a light upper packet";
  if (ratio > .66) return "a deep upper packet";
  return "a balanced division";
}
function sideDeckMarkup(mode) {
  const total = state.deck.length;
  const draft = mode === "two" ? state.cutDraft : state.threeCutDraft;
  const settled = mode === "three" ? [...state.threeCuts].sort((a, b) => a - b) : [];
  const markers = settled.map((cut, index) => `<i class="cut-marker settled" style="top:${cut / total * 100}%" aria-hidden="true"><span>${index + 1}</span></i>`).join("");
  const boundaries = mode === "two" ? [draft] : [...settled, draft].sort((a, b) => a - b);
  const all = [0, ...boundaries, total];
  const segments = all.slice(0, -1).map((start, index) => `<div class="edge-segment segment-${index + 1}" style="top:${start / total * 100}%;height:${(all[index + 1] - start) / total * 100}%"></div>`).join("");
  return `<div class="cut-workbench" data-cut-mode="${mode}" style="--cut-pos:${draft / total * 100}%"><p class="side-label">Side view · slide the brass marker up and down between the card edges</p><div class="cut-stage"><div class="side-deck" data-motion-key="main-deck">${segments}${markers}<i class="cut-marker active" aria-hidden="true"><span>✦</span></i></div><input class="cut-range" id="${mode === "two" ? "first-cut-range" : "three-cut-range"}" type="range" min="9" max="${total - 9}" value="${draft}" aria-label="Choose where to cut the deck"></div><p class="cut-reading" id="cut-reading">${cutMood(draft, total)}</p></div>`;
}
function renderCutOne() {
  return { surface: `<div class="table-surface cut-table" id="cut-one-surface">${sideDeckMarkup("two")}<span class="piles-guide">The deck is shown from the side so every possible cut is reachable.</span></div>`, actions: `<p class="status-note">Move the marker, then lift the deck at that exact place.</p><button class="seal-button" data-action="make-first-cut">${t("Lift at this point")}</button>` };
}
function stackLayers() {
  return `<div class="stack-card"></div><div class="stack-card"></div><div class="stack-card"></div><div class="stack-card"></div>`;
}
function pileMarkup(cards, key, label, options = {}) {
  const { action = "", selected = false, order = null, extra = "" } = options;
  const tag = action ? "button" : "div";
  const actionAttrs = action ? ` data-action="${action}" data-pile-index="${key}" aria-pressed="${selected}"` : "";
  return `<${tag} class="pile ${extra} ${selected ? "chosen" : ""}" data-pile="${key}"${actionAttrs} style="--order:${order ?? 0}">${stackLayers()}${order !== null ? `<span class="order-badge">${order + 1}</span>` : ""}<span class="pile-label">${label} · ${cards.length} cards</span></${tag}>`;
}
function renderRitualCard() {
  const top = state.piles[0] || [];
  const bottom = state.piles[1] || [];
  return { surface: `<div class="table-surface centered-table" id="ritual-card-surface"><div class="pile-field two">${pileMarkup(top, "0", "lifted packet", { extra: "lifted" })}${pileMarkup(bottom, "1", "resting packet")}<button class="ritual-draw-card card back" data-action="take-ritual" aria-label="Draw the hidden card from beneath the lifted packet"></button></div><div class="hidden-heart-slot"><span>Hidden Heart</span><i>one card waits here</i></div></div>`, actions: `<p class="status-note">The card directly beneath the lifted packet becomes the Hidden Heart.</p><button class="seal-button" data-action="take-ritual">${t("Draw the hidden card")}</button>` };
}
function renderReassembleOne() {
  return { surface: `<div class="table-surface centered-table" id="reassemble-one-surface"><div class="pile-field two choose-field">${pileMarkup(state.piles[0] || [], "0", "pile one", { action: "choose-two-top", selected: state.twoTop === 0 })}${pileMarkup(state.piles[1] || [], "1", "pile two", { action: "choose-two-top", selected: state.twoTop === 1 })}</div><div class="hidden-heart-slot filled"><span>Hidden Heart</span>${cardBack("selected")}</div></div>`, actions: `<p class="status-note">Tap the pile you want on top. Both piles will meet in the center.</p><button class="seal-button" data-action="join-two" ${state.twoTop === null ? "disabled" : ""}>${t("Stack with this pile on top")}</button>` };
}
function renderCutThree() {
  const cuts = state.threeCuts.length;
  return { surface: `<div class="table-surface cut-table" id="cut-three-surface">${sideDeckMarkup("three")}<span class="piles-guide">${cuts === 0 ? "Place the first marker" : "First marker set · choose a different place for the second"}</span></div>`, actions: `<p class="status-note">${cuts === 0 ? "Choose the first break in the side of the deck." : "Choose the second break. The two markers will form three piles."}</p><button class="seal-button" data-action="place-three-cut">${cuts === 0 ? t("Place first cut") : t("Make three piles")}</button>` };
}
function renderReassembleThree() {
  const selected = state.assemblyOrder;
  return { surface: `<div class="table-surface centered-table" id="reassemble-three-surface"><div class="pile-field three choose-field">${state.piles.map((pile, index) => { const order = selected.indexOf(index); return pileMarkup(pile, String(index), `pile ${index + 1}`, { action: "choose-pile", selected: order >= 0, order: order >= 0 ? order : null }); }).join("")}</div><div class="hidden-heart-slot filled compact"><span>Hidden Heart</span>${cardBack("selected")}</div></div>`, actions: `<p class="status-note">${selected.length ? `${selected.length} of 3 chosen · numbers show the top-to-bottom order` : "Tap the pile that should return first (on top)."}</p><button class="seal-button" data-action="reassemble-three" ${selected.length === 3 ? "" : "disabled"}>${t("Stack in this order")}</button>` };
}
function renderSpread() {
  return { surface: `<div class="table-surface" id="spread-surface"><div class="spread-preview-layer" aria-hidden="true"></div>${deckBackStack("")}<span class="piles-guide">One touch fans every card into a reading arc</span></div>`, actions: `<p class="status-note">Open the spread and the cards fan across the table.</p><button class="seal-button" data-action="assist-spread">${t("Open the spread")}</button>` };
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
  return { surface: `<div class="table-surface"><div class="spread-layer">${state.deck.map((card, index) => {
    const p = positionForSpread(index, state.deck.length, spread);
    const isPicked = picked.has(card.id);
    return `<div class="spread-card ${isPicked ? "picked" : ""}" style="left:${p.x}%;top:${p.y}%;z-index:${index + 1};transform:translate(-50%,-50%) rotate(${p.rotation + card.microRotation}deg)"><button class="card back ${isPicked ? "selected" : ""}" data-action="pick-card" data-card-id="${card.id}" aria-label="Select a face-down card"></button></div>`;
  }).join("")}</div><div class="draw-dock"><span class="dock-title">Drawn · ${state.selectedIds.length}/3</span><div class="drawn-row">${state.selectedIds.map((id, index) => `<div style="--dock-r:${index === 1 ? 0 : index ? 5 : -5}deg">${cardBack("selected")}</div>`).join("")}</div></div></div>`, actions: `<p class="status-note">${state.selectedIds.length ? `${state.selectedIds.length} card${state.selectedIds.length === 1 ? " has" : "s have"} moved into the center tray.` : "Tap any face-down card. It will travel into the center tray."}</p><button class="seal-button" data-action="to-reveal" ${state.selectedIds.length === 3 ? "" : "disabled"}>${t("Place the four cards")}</button>` };
}
function revealActions() {
  const done = state.revealedIds.length === 4;
  return `<p class="status-note">${done ? "The reading is ready to be gathered." : "There is no required order."}</p>${done ? `<button class="seal-button" data-action="open-reading">${t("Gather the reading")}</button>` : ""}`;
}
function renderReveal() {
  const cards = readingCards();
  return { surface: `<div class="reveal-layout">${cards.map((card, index) => {
    const revealed = state.revealedIds.includes(card.id);
    const pending = state.ad?.cardId === card.id;
    return `<div class="reveal-slot"><button class="card reveal-card ${card.reversed ? "reversed" : ""} ${revealed ? "flipped" : ""} ${pending ? "flip-pending" : ""}" data-action="reveal-card" data-card-id="${card.id}" ${revealed ? "disabled" : ""} aria-label="${revealed ? `${card.name}, ${card.reversed ? "reversed" : "upright"}` : `Reveal ${POSITIONS[index]}`}"><span class="card-inner"><span class="card-side back"></span><span class="card-side front">${faceInner(card)}</span></span></button><span class="label">${t(POSITIONS[index])}</span><span class="orientation ${revealed ? "" : "is-hidden"}">${t(card.reversed ? "Reversed" : "Upright")}</span></div>`;
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
    if (!response.ok || typeof payload.text !== "string") throw new Error(payload.error || "The interpretation service is unavailable.");
    state.aiText = payload.text.trim();
    state.aiError = null;
  } catch (error) {
    state.aiError = error instanceof Error ? error.message : "The interpretation service is unavailable.";
  } finally {
    state.aiLoading = false;
    persist(); render();
  }
}
function renderReading() {
  const cards = readingCards();
  const interpretation = state.aiLoading
    ? `<p class="ai-copy">Listening to the cards…</p>`
    : `<p class="ai-copy">${escapeHTML(state.aiText || personalInterpretation(cards))}</p>${state.aiError ? `<p class="disclaimer">${escapeHTML(state.aiError)} The prototype reading remains available below as a fallback.</p>` : ""}`;
  return world(`<section class="scene reading"><div class="parchment"><p class="eyebrow">The Heart Cut · your reading</p><h2>${t("Four cards, gathered beneath one sky.")}</h2><p class="reading-question">“${escapeHTML(state.question)}”</p><div class="reading-card-row">${cards.map((card) => `<div class="reading-card">${cardFace(card)}</div>`).join("")}</div><div class="meaning-grid">${cards.map((card, index) => `<article class="meaning"><p class="meaning-meta">${t(POSITIONS[index])} · ${t(card.reversed ? "Reversed" : "Upright").toLowerCase()}</p><h3>${escapeHTML(card.name)}</h3><p><strong>${cardKeywords(card).join(" · ")}</strong></p><p>${positionMeaning(POSITIONS[index], card)}</p></article>`).join("")}</div><div class="ai-block">${state.aiUnlocked ? `<p class="eyebrow">Personal interpretation</p><h3>A reflection for the path in front of you</h3>${interpretation}` : `<div class="ai-lock"><p class="eyebrow">A closer reflection</p><h3>Would you like a personal interpretation?</h3><p>Watch a short ad to unlock a reflection based on your exact question and all four cards.</p><button class="seal-button" data-action="unlock-ai">Generate my personal interpretation</button></div>`}</div><p class="disclaimer">${t("Tarot is offered here as a reflective, imaginative tool—not a factual prediction or professional advice.")}</p><div class="question-actions"><button class="back-link" data-action="restart">${t("Begin a new reading")}</button><button class="text-button" data-action="share-copy">${t("Copy the reading")}</button></div></div></section>`);
}
function renderAd() {
  if (!state.ad) return "";
  const ready = state.ad.ready;
  const title = state.ad.intent === "interpretation" ? "A quiet pause before the closer reading" : "A small doorway in the ritual";
  return `<div class="ad-scrim" role="dialog" aria-modal="true" aria-label="Mock advertisement"><section class="ad-card"><p class="ad-tag">Mock sponsored moment</p><div class="ad-illustration">The sky keeps<br>its own counsel.</div><h2>${title}</h2><p>This placeholder is deliberately separate from the ritual so an advertising provider can be exchanged later.</p><div class="ad-footer"><span>${ready ? "You may continue" : "The door opens in a breath…"}</span><button class="text-button" data-action="dismiss-ad" ${ready ? "" : "disabled"}>${ready ? "Continue" : "Please wait"}</button></div></section></div>`;
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
}
function unmountAd() { document.querySelector(".ad-scrim")?.remove(); }
function markAdReady() {
  const scrim = document.querySelector(".ad-scrim");
  if (!scrim) return;
  const button = scrim.querySelector('[data-action="dismiss-ad"]');
  const note = scrim.querySelector(".ad-footer span");
  if (button) { button.disabled = false; button.textContent = "Continue"; }
  if (note) note.textContent = "You may continue";
}
function flipRevealCard(id) {
  const card = cardById(id);
  const button = document.querySelector(`.reveal-layout [data-card-id="${id}"]`);
  state.revealedIds.push(id);
  if (!card || !button) { render(); return; }
  button.classList.remove("flip-pending");
  button.classList.add("flipped");
  button.disabled = true;
  button.setAttribute("aria-label", `${card.name}, ${card.reversed ? "reversed" : "upright"}`);
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
  else markup = renderRitual();
  app.innerHTML = `${markup}${renderAd()}${renderSettings()}${debugPanel()}`;
  updatePageLanguage();
  paintCardArt();
  bindGestures();
  persist();
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
  if (status) status.textContent = ready ? "The cards feel mixed. Gather them when you are ready." : `${3 - state.shuffleMoves} more move${3 - state.shuffleMoves === 1 ? "" : "s"} will loosen the order.`;
  if (guide) guide.textContent = `${state.shuffleMoves} physical move${state.shuffleMoves === 1 ? "" : "s"} · keep mixing or gather them`;
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
      showToast("Sweep a little farther so the cards have room to open.");
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
    if (ritual) { state.ritualCardId = ritual.id; state.ritualCard = ritual; state.stage = "reassembleOne"; }
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
    const depth = depths[index];
    const dx = cx - (rect.left + rect.width / 2) + depth * 2;
    const dy = cy - (rect.top + rect.height / 2) + depth * 3;
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
  const dock = document.querySelector(".draw-dock");
  if (!dock) return;
  transitioning = true;
  const from = element.getBoundingClientRect();
  const to = dock.getBoundingClientRect();
  const dx = to.left + to.width / 2 - (from.left + from.width / 2);
  const dy = to.top + to.height / 2 - (from.top + from.height / 2);
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
  if (action === "open-settings") { settingsOpen = true; render(); return; }
  if (action === "close-settings") { settingsOpen = false; persist(); render(); return; }
  if (action === "toggle-debug") { state.debug = !state.debug; render(); return; }
  if (action === "toggle-simplified") { state.settings.simplified = !state.settings.simplified; persist(); showToast(state.settings.simplified ? "Guided interaction mode is on." : "Guided interaction mode is off."); render(); return; }
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
  if (action === "to-reveal") { if (state.selectedIds.length !== 3) return; state.stage = "reveal"; interaction(); render(); return; }
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
      state.aiUnlocked = true; state.aiLoading = true; state.aiText = null; state.aiError = null;
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
  if (action === "share-copy") { const text = `${state.question}\n\n${readingCards().map((card, index) => `${POSITIONS[index]}: ${card.name} (${card.reversed ? "reversed" : "upright"})`).join("\n")}`; navigator.clipboard?.writeText(text).then(() => showToast("Reading copied."), () => showToast("Copy is unavailable in this browser.")); return; }
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

if ("serviceWorker" in navigator) window.addEventListener("load", () => navigator.serviceWorker.register("./sw.js").catch(() => {}));
render();
