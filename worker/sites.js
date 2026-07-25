const SECURITY_HEADERS = {
  "Referrer-Policy": "no-referrer",
  "X-Content-Type-Options": "nosniff",
  "X-Frame-Options": "SAMEORIGIN"
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

export default {
  async fetch(request, env) {
    const url = new URL(request.url);

    if (url.pathname === "/api/interpretation") {
      if (request.method !== "POST") return json(405, { error: "Method not allowed." });
      return json(503, {
        error: "Live interpretation is not configured on this private preview. The built-in ritual reading remains available."
      });
    }

    if (request.method !== "GET" && request.method !== "HEAD") {
      return json(405, { error: "Method not allowed." });
    }

    if (!env.ASSETS) return new Response("Static assets are unavailable.", { status: 503, headers: SECURITY_HEADERS });
    const assetUrl = new URL(request.url);
    if (assetUrl.pathname === "/") assetUrl.pathname = "/index.html";
    return env.ASSETS.fetch(new Request(assetUrl, request));
  }
};
