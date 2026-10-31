// Офлайн: при обновлении версии кэш пересобирается.
const VERSION = "ironlog-web-11";
const FILES = [
  "./", "index.html", "app.css", "manifest.webmanifest",
  "fonts/unbounded.ttf", "fonts/manrope.ttf",
  "icons/apple-touch-icon.png", "icons/icon-192.png", "icons/icon-512.png",
  "js/main.js", "js/store.js", "js/logic.js", "js/ui.js", "js/sound.js", "js/programs.js", "js/seed-data.js",
  "js/screens/train.js", "js/screens/food.js", "js/screens/library.js", "js/screens/stats.js", "js/screens/settings.js",
  "js/vendor/preact.module.js", "js/vendor/hooks.module.js", "js/vendor/htm.module.js",
];
self.addEventListener("install", (e) => { e.waitUntil(caches.open(VERSION).then((c) => c.addAll(FILES)).then(() => self.skipWaiting())); });
self.addEventListener("activate", (e) => {
  e.waitUntil(caches.keys().then((ks) => Promise.all(ks.filter((k) => k !== VERSION).map((k) => caches.delete(k)))).then(() => self.clients.claim()));
});
// сначала сеть (чтобы обновления приходили сразу), без сети — кэш
self.addEventListener("fetch", (e) => {
  if (e.request.method !== "GET") return;
  e.respondWith(
    fetch(e.request, { cache: "no-cache" }).then((r) => { const copy = r.clone(); caches.open(VERSION).then((c) => c.put(e.request, copy)); return r; })
      .catch(() => caches.match(e.request, { ignoreSearch: true }))
  );
});
