const CACHE = "heart-cut-v22";
const SFX_ASSETS = [
  "./assets/audio/shuffle/1.ogg", "./assets/audio/shuffle/2.ogg", "./assets/audio/shuffle/3.ogg", "./assets/audio/shuffle/4.ogg",
  "./assets/audio/shuffle/5.ogg", "./assets/audio/shuffle/6.ogg", "./assets/audio/shuffle/7.ogg", "./assets/audio/shuffle/8.ogg",
  "./assets/audio/cut/1.ogg", "./assets/audio/cut/2.ogg", "./assets/audio/cut/3.ogg", "./assets/audio/cut/4.ogg",
  "./assets/audio/gather/1.ogg", "./assets/audio/gather/2.ogg", "./assets/audio/gather/3.ogg", "./assets/audio/gather/4.ogg",
  "./assets/audio/spread/1.ogg", "./assets/audio/spread/2.ogg",
  "./assets/audio/take/1.ogg", "./assets/audio/take/2.ogg",
  "./assets/audio/flip/1.ogg", "./assets/audio/flip/2.ogg"
];
const ASSETS = ["./", "./index.html", "./styles.css?v=22", "./app.js?v=22", "./manifest.webmanifest", "./icon.svg", ...SFX_ASSETS];

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
