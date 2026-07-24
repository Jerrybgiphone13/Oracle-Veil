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
  "X-Content-Type-Options": "nosniff",
  "Referrer-Policy": "no-referrer",
  "X-Frame-Options": "SAMEORIGIN"
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
function promptFor({ question, cards }) {
  const list = cards.map((card) => `${card.position}: ${card.name} (${card.orientation})`).join("\n");
  return `You are writing a concise, emotionally intelligent tarot reflection for a love reading. Tarot is reflective and uncertain, not predictive fact. Do not claim certainty, manipulate emotion, give medical/legal/financial advice, or state probabilities.\n\nQuestion:\n${question}\n\nCards:\n${list}\n\nRespond with a JSON object with two fields:\n"summary": a single short, warm sentence (max 18 words) that reads like a gentle, direct answer to the question, suitable as a headline on its own — no hedging phrases like "the cards suggest".\n"reading": 4 short paragraphs (underlying theme, the reader's stance, connection dynamics, and one practical gentle next step), referring to the exact cards naturally, under 340 words total.`;
}
async function interpret(request, response) {
  if (!process.env.GEMINI_API_KEY) return sendJSON(response, 503, { error: "GEMINI_API_KEY is not set on the server." });
  if (rateLimited(request.socket.remoteAddress || "unknown")) return sendJSON(response, 429, { error: "Too many requests. Please wait a few minutes before asking again." });
  try {
    const input = JSON.parse(await readBody(request));
    if (typeof input.question !== "string" || input.question.trim().length < 4 || !Array.isArray(input.cards) || input.cards.length !== 4) throw new Error("A question and four cards are required.");
    const cards = input.cards.map((card) => ({ position: String(card.position || "").slice(0, 48), name: String(card.name || "").slice(0, 90), orientation: card.orientation === "reversed" ? "reversed" : "upright" }));
    const gemini = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/${encodeURIComponent(model)}:generateContent`, {
      method: "POST",
      headers: { "Content-Type": "application/json", "x-goog-api-key": process.env.GEMINI_API_KEY },
      signal: AbortSignal.timeout(20_000),
      body: JSON.stringify({
        contents: [{ role: "user", parts: [{ text: promptFor({ question: input.question.trim().slice(0, 340), cards }) }] }],
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
}).listen(port, () => console.log(`The Heart Cut is ready on port ${port}`));
