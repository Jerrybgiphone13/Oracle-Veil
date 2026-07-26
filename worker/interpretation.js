// The one implementation of the interpretation contract, imported by both runtimes:
// server.mjs (Node, on the cPanel origin) and worker/sites.js (the Cloudflare worker that
// actually serves oracleveil.online). Keeping it in one file is what stops the prompt
// wording, the topic list, and the card counts from drifting apart between them.
//
// Dependency-free and side-effect-free on purpose: it has to import cleanly under both
// Node and the Workers runtime. build-sites.sh copies it next to the worker entry point.

export const GEMINI_MODEL_DEFAULT = "gemini-2.5-flash";
export const GEMINI_TIMEOUT_MS = 20_000;

// The client sends state.category verbatim, and each path's spread length is fixed.
// A mismatch here rejects the request, and the app hides that error for every path
// except Love — so these must track readingPositions() in app.js exactly.
export const TOPIC_CARD_COUNTS = {
  Love: 4,
  Career: 5,
  Money: 3,
  Decision: 1,
  "Friendship / Family": 2,
  "Personal Growth": 3,
  "General Future": 4
};

export function promptFor({ question, cards, topic }) {
  const list = cards.map((card) => `${card.position}: ${card.name} (${card.orientation})`).join("\n");
  const career = topic === "Career";
  const money = topic === "Money";
  const decision = topic === "Decision";
  const kin = topic === "Friendship / Family";
  const growth = topic === "Personal Growth";
  const future = topic === "General Future";
  const focus = career
    ? "a career reading. Keep the guidance practical and agency-centered; never promise a job, promotion, income, or business outcome"
    : money
      ? "a money reading. Keep it reflective and agency-centered; never recommend a specific investment, debt product, purchase, trade, or financial outcome"
      : decision
        ? "a one-card decision reading. The reader shuffled the full deck, cut it in two, riffle-mixed the halves together, opened the spread, chose one card, and revealed it after a deliberate pause. Never tell the reader which option to pick, predict how a choice turns out, or imply there is a correct answer; use the chosen card as a reflective lens and leave the decision with them"
        : kin
          ? "a two-card friendship or family reading. One card represents the reader's voice and one represents the voice across the bond. Never claim to know another person's private thoughts; invite curiosity, communication, reciprocity, and healthy boundaries"
          : growth
            ? "a three-card personal-growth reading moving through root, threshold, and becoming. Keep it compassionate, practical, and free from diagnostic or therapeutic claims"
            : future
              ? "a four-card general-future reading built as a compass. The reader shuffled, cut the deck into four quarters, assigned them to Dawn, Zenith, Dusk, and Midnight, then chose one card from each. Never predict fixed events, dates, probabilities, or guaranteed outcomes"
              : "a love reading";
  const structure = career
    ? "5 short paragraphs (current ground, unclaimed strength, friction, leverage/support, and one specific gentle next experiment)"
    : money
      ? "3 short paragraphs (what to protect, what to grow, and what to let circulate) plus one small verifiable next action"
      : decision
        ? "3 short paragraphs (what the chosen card brings into focus, what to examine honestly, and one small reversible step that can produce better information)"
        : kin
          ? "3 short paragraphs (the reader's voice, the other voice held as a curious lens rather than mind-reading, and one practical act of communication or care)"
          : growth
            ? "3 short paragraphs (the root, the threshold or practice, and the quality becoming available) plus one small repeatable next action"
            : future
              ? "4 short paragraphs (what begins at Dawn, what becomes clear at Zenith, what must change at Dusk, and the grounded inner guidance held at Midnight)"
              : "4 short paragraphs (underlying theme, the reader's stance, connection dynamics, and one practical gentle next step)";
  return `You are writing a concise, emotionally intelligent tarot reflection for ${focus}. Tarot is reflective and uncertain, not predictive fact. Do not claim certainty, manipulate emotion, give medical/legal/financial advice, or state probabilities.\n\nQuestion:\n${question}\n\nCards:\n${list}\n\nRespond with a JSON object with two fields:\n"summary": a single short, warm sentence (max 18 words) that reads like a gentle, direct answer to the question, suitable as a headline on its own — no hedging phrases like "the cards suggest".\n"reading": ${structure}, referring to the exact cards naturally, under 380 words total.`;
}

// Throws on anything malformed; the caller turns that into a 400-ish JSON error.
export function normalizeInterpretationInput(input) {
  const topic = Object.prototype.hasOwnProperty.call(TOPIC_CARD_COUNTS, input?.topic) ? input.topic : "Love";
  const expectedCards = TOPIC_CARD_COUNTS[topic];
  if (typeof input?.question !== "string" || input.question.trim().length < 4 || !Array.isArray(input.cards) || input.cards.length !== expectedCards) {
    throw new Error(`A question and ${expectedCards} cards are required.`);
  }
  return {
    topic,
    question: input.question.trim().slice(0, 340),
    cards: input.cards.map((card) => ({
      position: String(card?.position || "").slice(0, 48),
      name: String(card?.name || "").slice(0, 90),
      orientation: card?.orientation === "reversed" ? "reversed" : "upright"
    }))
  };
}

export function geminiRequestBody({ question, cards, topic }) {
  return {
    contents: [{ role: "user", parts: [{ text: promptFor({ question, cards, topic }) }] }],
    generationConfig: {
      temperature: 0.75,
      maxOutputTokens: 2048,
      thinkingConfig: { thinkingBudget: 0 },
      responseMimeType: "application/json",
      responseSchema: {
        type: "OBJECT",
        properties: { summary: { type: "STRING" }, reading: { type: "STRING" } },
        required: ["summary", "reading"]
      }
    }
  };
}

export function geminiEndpoint(model) {
  return `https://generativelanguage.googleapis.com/v1beta/models/${encodeURIComponent(model || GEMINI_MODEL_DEFAULT)}:generateContent`;
}

// Gemini answers with JSON-in-a-string, so the reply is unwrapped twice.
export function parseGeminiPayload(payload, ok) {
  const raw = payload?.candidates?.[0]?.content?.parts?.map((part) => part.text || "").join("").trim();
  if (!ok || !raw) throw new Error(payload?.error?.message || "Gemini did not return an interpretation.");
  const parsed = JSON.parse(raw);
  const summary = String(parsed.summary || "").trim();
  const text = String(parsed.reading || "").trim();
  if (!summary || !text) throw new Error("Gemini did not return an interpretation.");
  return { summary, text };
}

// Best-effort per-IP limiter. On Node this is one process, so it is exact; on Workers it is
// per-isolate and therefore only approximate — good enough to blunt abuse, not a quota.
export function createRateLimiter({ windowMs = 10 * 60 * 1000, limit = 30 } = {}) {
  const buckets = new Map();
  return function rateLimited(ip) {
    const now = Date.now();
    const hits = (buckets.get(ip) || []).filter((at) => now - at < windowMs);
    if (hits.length >= limit) { buckets.set(ip, hits); return true; }
    hits.push(now);
    buckets.set(ip, hits);
    if (buckets.size > 5000) {
      for (const [key, list] of buckets) if (now - list[list.length - 1] > windowMs) buckets.delete(key);
    }
    return false;
  };
}
