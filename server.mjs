import { createReadStream } from "node:fs";
import { stat } from "node:fs/promises";
import http from "node:http";
import path from "node:path";
import { fileURLToPath } from "node:url";
import {
  createRateLimiter, geminiEndpoint, geminiRequestBody, GEMINI_TIMEOUT_MS,
  normalizeInterpretationInput, parseGeminiPayload
} from "./worker/interpretation.js";

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
const rateLimited = createRateLimiter({ windowMs: 10 * 60 * 1000, limit: 30 });

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
async function interpret(request, response) {
  if (!process.env.GEMINI_API_KEY) return sendJSON(response, 503, { error: "GEMINI_API_KEY is not set on the server." });
  if (rateLimited(request.socket.remoteAddress || "unknown")) return sendJSON(response, 429, { error: "Too many requests. Please wait a few minutes before asking again." });
  try {
    const { topic, question, cards } = normalizeInterpretationInput(JSON.parse(await readBody(request)));
    const gemini = await fetch(geminiEndpoint(model), {
      method: "POST",
      headers: { "Content-Type": "application/json", "x-goog-api-key": process.env.GEMINI_API_KEY },
      signal: AbortSignal.timeout(GEMINI_TIMEOUT_MS),
      body: JSON.stringify(geminiRequestBody({ question, cards, topic }))
    });
    const payload = await gemini.json().catch(() => ({}));
    sendJSON(response, 200, parseGeminiPayload(payload, gemini.ok));
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
