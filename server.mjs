import { createReadStream } from "node:fs";
import { stat } from "node:fs/promises";
import http from "node:http";
import path from "node:path";
import { fileURLToPath } from "node:url";

const root = path.dirname(fileURLToPath(import.meta.url));
const port = Number(process.env.PORT || 4173);
const model = process.env.GEMINI_MODEL || "gemini-2.5-flash";
const mimeTypes = { ".css": "text/css; charset=utf-8", ".html": "text/html; charset=utf-8", ".js": "text/javascript; charset=utf-8", ".json": "application/json; charset=utf-8", ".mjs": "text/javascript; charset=utf-8", ".svg": "image/svg+xml" };

function sendJSON(response, status, body) {
  response.writeHead(status, { "Content-Type": "application/json; charset=utf-8", "Cache-Control": "no-store" });
  response.end(JSON.stringify(body));
}
function readBody(request) {
  return new Promise((resolve, reject) => {
    let body = "";
    request.on("data", (chunk) => {
      body += chunk;
      if (body.length > 16_000) reject(new Error("Request is too large."));
    });
    request.on("end", () => resolve(body));
    request.on("error", reject);
  });
}
function promptFor({ question, cards }) {
  const list = cards.map((card) => `${card.position}: ${card.name} (${card.orientation})`).join("\n");
  return `You are writing a concise, emotionally intelligent tarot reflection for a love reading. Tarot is reflective and uncertain, not predictive fact. Do not claim certainty, manipulate emotion, give medical/legal/financial advice, or state probabilities.\n\nQuestion:\n${question}\n\nCards:\n${list}\n\nWrite 4 short paragraphs: underlying theme, the reader's stance, connection dynamics, and one practical gentle next step. Refer to the exact cards naturally. Keep under 340 words.`;
}
async function interpret(request, response) {
  if (!process.env.GEMINI_API_KEY) return sendJSON(response, 503, { error: "GEMINI_API_KEY is not set on the server." });
  try {
    const input = JSON.parse(await readBody(request));
    if (typeof input.question !== "string" || input.question.trim().length < 4 || !Array.isArray(input.cards) || input.cards.length !== 4) throw new Error("A question and four cards are required.");
    const cards = input.cards.map((card) => ({ position: String(card.position || "").slice(0, 48), name: String(card.name || "").slice(0, 90), orientation: card.orientation === "reversed" ? "reversed" : "upright" }));
    const gemini = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/${encodeURIComponent(model)}:generateContent`, {
      method: "POST",
      headers: { "Content-Type": "application/json", "x-goog-api-key": process.env.GEMINI_API_KEY },
      body: JSON.stringify({
        contents: [{ role: "user", parts: [{ text: promptFor({ question: input.question.trim().slice(0, 340), cards }) }] }],
        generationConfig: { temperature: 0.75, maxOutputTokens: 2048, thinkingConfig: { thinkingBudget: 0 } }
      })
    });
    const payload = await gemini.json().catch(() => ({}));
    const text = payload?.candidates?.[0]?.content?.parts?.map((part) => part.text || "").join("").trim();
    if (!gemini.ok || !text) throw new Error(payload?.error?.message || "Gemini did not return an interpretation.");
    sendJSON(response, 200, { text });
  } catch (error) {
    sendJSON(response, 400, { error: error instanceof Error ? error.message : "Unable to generate an interpretation." });
  }
}
async function serveFile(request, response) {
  const cleanPath = decodeURIComponent(request.url.split("?")[0]);
  const requested = cleanPath === "/" ? "/index.html" : cleanPath;
  const filePath = path.resolve(root, `.${requested}`);
  if (!filePath.startsWith(root + path.sep) && filePath !== root) return response.writeHead(403).end();
  try {
    const metadata = await stat(filePath);
    if (!metadata.isFile()) return response.writeHead(404).end();
    response.writeHead(200, { "Content-Type": mimeTypes[path.extname(filePath)] || "application/octet-stream", "Cache-Control": "no-cache" });
    createReadStream(filePath).pipe(response);
  } catch { response.writeHead(404).end(); }
}

http.createServer((request, response) => {
  if (request.method === "POST" && request.url === "/api/interpretation") return void interpret(request, response);
  if (request.method !== "GET" && request.method !== "HEAD") return response.writeHead(405).end();
  return void serveFile(request, response);
}).listen(port, () => console.log(`The Heart Cut is ready on port ${port}`));
