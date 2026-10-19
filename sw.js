var VERSION = "folio-v9";
var CORE = [
  "./", "./index.html", "./manifest.webmanifest", "./icon-192.png", "./icon-512.png",
  "./lib/pdf-lib.min.js", "./lib/pdf.min.mjs", "./lib/pdf.worker.min.mjs"
];

self.addEventListener("install", function (e) {
  e.waitUntil(caches.open(VERSION).then(function (c) { return c.addAll(CORE); }).then(function () { return self.skipWaiting(); }));
});

self.addEventListener("activate", function (e) {
  e.waitUntil(caches.keys().then(function (keys) {
    return Promise.all(keys.filter(function (k) { return k !== VERSION; }).map(function (k) { return caches.delete(k); }));
  }).then(function () { return self.clients.claim(); }));
});

self.addEventListener("fetch", function (e) {
  var req = e.request;
  if (req.method !== "GET") return;
  var url = new URL(req.url);
  if (/(^|\.)(fonts\.googleapis\.com|fonts\.gstatic\.com)$/.test(url.hostname)) {
    // font saja: cache dulu, segarkan di belakang
    e.respondWith(caches.open(VERSION).then(function (c) {
      return c.match(req).then(function (hit) {
        var net = fetch(req).then(function (r) { if (r && (r.ok || r.type === "opaque")) c.put(req, r.clone()); return r; }).catch(function () { return hit; });
        return hit || net;
      });
    }));
    return;
  }
  if (url.origin !== location.origin) return;

  if (req.mode === "navigate") {
    // halaman: jaringan dulu, cadangan dari cache saat offline
    e.respondWith(fetch(req).then(function (r) {
      var copy = r.clone(); caches.open(VERSION).then(function (c) { c.put("./index.html", copy); }); return r;
    }).catch(function () { return caches.match("./index.html"); }));
    return;
  }
  // pustaka dan aset: cache dulu
  e.respondWith(caches.match(req).then(function (hit) { return hit || fetch(req); }));
});
