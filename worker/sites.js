import {
  createRateLimiter, geminiEndpoint, geminiRequestBody, GEMINI_TIMEOUT_MS,
  normalizeInterpretationInput, parseGeminiPayload
} from "./interpretation.js";

const SECURITY_HEADERS = {
  "Content-Security-Policy": "default-src 'self'; base-uri 'self'; connect-src 'self'; font-src 'self'; form-action 'self'; frame-ancestors 'none'; img-src 'self' data: blob:; manifest-src 'self'; media-src 'self' https://upload.wikimedia.org; object-src 'none'; script-src 'self'; style-src 'self' 'unsafe-inline'; worker-src 'self'; upgrade-insecure-requests",
  "Cross-Origin-Opener-Policy": "same-origin",
  "Cross-Origin-Resource-Policy": "same-origin",
  "Permissions-Policy": "camera=(), geolocation=(), microphone=(), payment=(), usb=()",
  "Referrer-Policy": "strict-origin-when-cross-origin",
  "Strict-Transport-Security": "max-age=31536000; includeSubDomains",
  "X-Content-Type-Options": "nosniff",
  "X-Frame-Options": "DENY"
};

function json(status, body) {
  return new Response(JSON.stringify(body), {
    status,
    headers: {
      ...SECURITY_HEADERS,
      "Cache-Control": "no-store",
      "Content-Type": "application/json; charset=utf-8"
    }
  });
}

// Best-effort and per-isolate: Workers give no shared counter without KV, so this blunts a
// single abusive client rather than enforcing a global quota. The Gemini key's own quota is
// the real backstop.
const rateLimited = createRateLimiter({ windowMs: 10 * 60 * 1000, limit: 30 });

// The reading is generated here rather than proxied to the cPanel origin, so the origin IP
// is never exposed and the site keeps sitting entirely behind the edge.
async function interpret(request, env) {
  if (!env.GEMINI_API_KEY) {
    return json(503, {
      error: "Live interpretation is not configured on this private preview. The built-in ritual reading remains available."
    });
  }
  const ip = request.headers.get("CF-Connecting-IP") || "unknown";
  if (rateLimited(ip)) return json(429, { error: "Too many requests. Please wait a few minutes before asking again." });
  try {
    const body = await request.text();
    if (body.length > 16_000) throw new Error("Request is too large.");
    const { topic, question, cards } = normalizeInterpretationInput(JSON.parse(body));
    const gemini = await fetch(geminiEndpoint(env.GEMINI_MODEL), {
      method: "POST",
      headers: { "Content-Type": "application/json", "x-goog-api-key": env.GEMINI_API_KEY },
      signal: AbortSignal.timeout(GEMINI_TIMEOUT_MS),
      body: JSON.stringify(geminiRequestBody({ question, cards, topic }))
    });
    const payload = await gemini.json().catch(() => ({}));
    return json(200, parseGeminiPayload(payload, gemini.ok));
  } catch (error) {
    const message = error instanceof Error && error.name === "TimeoutError"
      ? "The interpretation timed out. Please try again."
      : error instanceof Error ? error.message : "The interpretation service is unavailable.";
    return json(502, { error: message });
  }
}

export default {
  async fetch(request, env) {
    const url = new URL(request.url);

    if (url.pathname === "/api/interpretation") {
      if (request.method !== "POST") return json(405, { error: "Method not allowed." });
      return interpret(request, env);
    }

    if (request.method !== "GET" && request.method !== "HEAD") {
      return json(405, { error: "Method not allowed." });
    }

    if (!env.ASSETS) return new Response("Static assets are unavailable.", { status: 503, headers: SECURITY_HEADERS });
    const assetUrl = new URL(request.url);
    if (assetUrl.pathname === "/") assetUrl.pathname = "/index.html";
    const assetResponse = await env.ASSETS.fetch(new Request(assetUrl, request));
    const headers = new Headers(assetResponse.headers);
    for (const [name, value] of Object.entries(SECURITY_HEADERS)) headers.set(name, value);
    return new Response(request.method === "HEAD" ? null : assetResponse.body, {
      status: assetResponse.status,
      statusText: assetResponse.statusText,
      headers
    });
  }
};
