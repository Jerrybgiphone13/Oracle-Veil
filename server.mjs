import { createReadStream } from "node:fs";
import { stat } from "node:fs/promises";
import http from "node:http";
import path from "node:path";
import { fileURLToPath } from "node:url";

const root = path.dirname(fileURLToPath(import.meta.url));
const port = Number(process.env.PORT || 4173);
const model = process.env.GEMINI_MODEL || "gemini-2.5-flash";
const mimeTypes = {
  ".css": "text/css; charset=utf-8",
  ".html": "text/html; charset=utf-8",
  ".js": "text/javascript; charset=utf-8",
  ".mjs": "text/javascript; charset=utf-8",
  ".json": "application/json; charset=utf-8",
  ".webmanifest": "application/manifest+json",
  ".svg": "image/svg+xml",
  ".png": "image/png",
  ".jpg": "image/jpeg",
  ".jpeg": "image/jpeg",
  ".webp": "image/webp",
  ".ico": "image/x-icon",
  ".txt": "text/plain; charset=utf-8",
  ".woff2": "font/woff2",
  ".ogg": "audio/ogg",
  ".mp3": "audio/mpeg"
};
const SECURITY_HEADERS = {
  "Content-Security-Policy": "default-src 'self'; base-uri 'self'; connect-src 'self'; font-src 'self'; form-action 'self'; frame-ancestors 'none'; img-src 'self' data: blob:; manifest-src 'self'; media-src 'self' https://upload.wikimedia.org; object-src 'none'; script-src 'self'; style-src 'self' 'unsafe-inline'; worker-src 'self'; upgrade-insecure-requests",
  "Cross-Origin-Opener-Policy": "same-origin",
  "Cross-Origin-Resource-Policy": "same-origin",
  "Permissions-Policy": "camera=(), geolocation=(), microphone=(), payment=(), usb=()",
  "X-Content-Type-Options": "nosniff",
  "Referrer-Policy": "strict-origin-when-cross-origin",
  "Strict-Transport-Security": "max-age=31536000; includeSubDomains",
  "X-Frame-Options": "DENY"
};
// Per-IP rate limit for the paid Gemini endpoint.
const RATE_WINDOW_MS = 10 * 60 * 1000;
const RATE_LIMIT = 30;
const rateBuckets = new Map();

function rateLimited(ip) {
  const now = Date.now();
  const hits = (rateBuckets.get(ip) || []).filter((at) => now - at < RATE_WINDOW_MS);
  if (hits.length >= RATE_LIMIT) { rateBuckets.set(ip, hits); return true; }
  hits.push(now);
  rateBuckets.set(ip, hits);
  if (rateBuckets.size > 5000) {
    for (const [key, list] of rateBuckets) if (now - list[list.length - 1] > RATE_WINDOW_MS) rateBuckets.delete(key);
  }
  return false;
}
function sendJSON(response, status, body) {
  response.writeHead(status, { ...SECURITY_HEADERS, "Content-Type": "application/json; charset=utf-8", "Cache-Control": "no-store" });
  response.end(JSON.stringify(body));
}
function readBody(request) {
  return new Promise((resolve, reject) => {
    let body = "";
    let tooLarge = false;
    request.on("data", (chunk) => {
      if (tooLarge) return;
      body += chunk;
      if (body.length > 16_000) {
        tooLarge = true;
        reject(new Error("Request is too large."));
        request.destroy();
      }
    });
    request.on("end", () => { if (!tooLarge) resolve(body); });
    request.on("error", reject);
  });
}
function promptFor({ question, cards, topic }) {
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
async function interpret(request, response) {
  if (!process.env.GEMINI_API_KEY) return sendJSON(response, 503, { error: "GEMINI_API_KEY is not set on the server." });
  if (rateLimited(request.socket.remoteAddress || "unknown")) return sendJSON(response, 429, { error: "Too many requests. Please wait a few minutes before asking again." });
  try {
    const input = JSON.parse(await readBody(request));
    const topics = ["Love", "Career", "Money", "Decision", "Friendship / Family", "Personal Growth", "General Future"];
    const topic = topics.includes(input.topic) ? input.topic : "Love";
    const expectedCards = {
      Love: 4, Career: 5, Money: 3, Decision: 1,
      "Friendship / Family": 2, "Personal Growth": 3, "General Future": 4
    }[topic];
    if (typeof input.question !== "string" || input.question.trim().length < 4 || !Array.isArray(input.cards) || input.cards.length !== expectedCards) throw new Error(`A question and ${expectedCards} cards are required.`);
    const cards = input.cards.map((card) => ({ position: String(card.position || "").slice(0, 48), name: String(card.name || "").slice(0, 90), orientation: card.orientation === "reversed" ? "reversed" : "upright" }));
    const gemini = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/${encodeURIComponent(model)}:generateContent`, {
      method: "POST",
      headers: { "Content-Type": "application/json", "x-goog-api-key": process.env.GEMINI_API_KEY },
      signal: AbortSignal.timeout(20_000),
      body: JSON.stringify({
        contents: [{ role: "user", parts: [{ text: promptFor({ question: input.question.trim().slice(0, 340), cards, topic }) }] }],
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
      })
    });
    const payload = await gemini.json().catch(() => ({}));
    const raw = payload?.candidates?.[0]?.content?.parts?.map((part) => part.text || "").join("").trim();
    if (!gemini.ok || !raw) throw new Error(payload?.error?.message || "Gemini did not return an interpretation.");
    const parsed = JSON.parse(raw);
    const summary = String(parsed.summary || "").trim();
    const text = String(parsed.reading || "").trim();
    if (!summary || !text) throw new Error("Gemini did not return an interpretation.");
    sendJSON(response, 200, { summary, text });
  } catch (error) {
    const message = error instanceof Error && error.name === "TimeoutError"
      ? "The interpretation service took too long to respond. Please try again."
      : error instanceof Error ? error.message : "Unable to generate an interpretation.";
    sendJSON(response, 400, { error: message });
  }
}
function cacheControlFor(requestUrl, filePath) {
  if (requestUrl.includes("?v=")) return "public, max-age=31536000, immutable";
  if (filePath.includes(`${path.sep}assets${path.sep}`)) return "public, max-age=86400";
  return "no-cache";
}
async function serveFile(request, response) {
  let cleanPath;
  try {
    cleanPath = decodeURIComponent(request.url.split("?")[0]);
  } catch {
    return response.writeHead(400, SECURITY_HEADERS).end();
  }
  const requested = cleanPath === "/" ? "/index.html" : cleanPath;
  const filePath = path.resolve(root, `.${requested}`);
  if (!filePath.startsWith(root + path.sep) && filePath !== root) return response.writeHead(403, SECURITY_HEADERS).end();
  try {
    const metadata = await stat(filePath);
    if (!metadata.isFile()) return response.writeHead(404, SECURITY_HEADERS).end();
    response.writeHead(200, {
      ...SECURITY_HEADERS,
      "Content-Type": mimeTypes[path.extname(filePath).toLowerCase()] || "application/octet-stream",
      "Content-Length": metadata.size,
      "Cache-Control": cacheControlFor(request.url, filePath)
    });
    if (request.method === "HEAD") return response.end();
    createReadStream(filePath).pipe(response);
  } catch { response.writeHead(404, SECURITY_HEADERS).end(); }
}

http.createServer((request, response) => {
  if (request.method === "POST" && request.url === "/api/interpretation") return void interpret(request, response);
  if (request.method !== "GET" && request.method !== "HEAD") return response.writeHead(405, SECURITY_HEADERS).end();
  return void serveFile(request, response);
}).listen(port, () => console.log(`Oracle Veil is ready on port ${port}`));
