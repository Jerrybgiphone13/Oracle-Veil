const CACHE = "heart-cut-v14";
const ASSETS = [
  "./", "./index.html", "./styles.css?v=14", "./app.js?v=14",
  "./manifest.webmanifest", "./icon.svg", "./icon-192.png", "./icon-512.png", "./apple-touch-icon.png"
];

self.addEventListener("install", (event) => {
  event.waitUntil(caches.open(CACHE).then((cache) => cache.addAll(ASSETS)));
  self.skipWaiting();
});

self.addEventListener("activate", (event) => event.waitUntil(
  caches.keys().then((keys) => Promise.all(keys.filter((key) => key.startsWith("heart-cut-") && key !== CACHE).map((key) => caches.delete(key))))
    .then(() => self.clients.claim())
));

function cacheAndReturn(request, response) {
  if (response.ok) {
    const copy = response.clone();
    caches.open(CACHE).then((cache) => cache.put(request, copy));
  }
  return response;
}

self.addEventListener("fetch", (event) => {
  if (event.request.method !== "GET") return;
  const url = new URL(event.request.url);
  // Never intercept the interpretation API or cross-origin traffic (e.g. the music stream).
  if (url.origin !== location.origin || url.pathname.startsWith("/api/")) return;

  // Card art and icons are immutable content: serve from cache, populate on first use.
  if (url.pathname.includes("/assets/") || url.pathname.includes("/icon") || url.pathname.includes("apple-touch-icon")) {
    event.respondWith(
      caches.match(event.request).then((hit) => hit || fetch(event.request).then((response) => cacheAndReturn(event.request, response)))
    );
    return;
  }

  // App shell: network-first so deploys arrive immediately, cache keeps offline working.
  event.respondWith(
    fetch(event.request)
      .then((response) => cacheAndReturn(event.request, response))
      .catch(() => caches.match(event.request))
  );
});
