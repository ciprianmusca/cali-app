/* CALI-LAB service worker — offline app shell + asset cache */
const VERSION = "cali-lab-sw-v4";
const SHELL = [
  "/",
  "/acasa",
  "/autentificare",
  "/inregistrare",
  "/observatii",
  "/harta",
  "/politica-date",
  "/manifest.webmanifest",
  "/offline.html",
  "/hero-calimani.svg",
  "/icons/icon-192.png",
  "/icons/icon-512.png",
  "/placeholders/tree-1.svg",
  "/placeholders/tree-2.svg",
  "/placeholders/soil-1.svg",
  "/placeholders/soil-2.svg",
  "/placeholders/disturbance-1.svg",
  "/placeholders/disturbance-2.svg",
];

self.addEventListener("install", (event) => {
  event.waitUntil(
    caches
      .open(VERSION)
      .then((cache) => cache.addAll(SHELL))
      .then(() => self.skipWaiting())
      .catch(() => self.skipWaiting())
  );
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches
      .keys()
      .then((keys) =>
        Promise.all(keys.filter((k) => k !== VERSION).map((k) => caches.delete(k)))
      )
      .then(() => self.clients.claim())
  );
});

function isStaticAsset(url) {
  return (
    url.pathname.startsWith("/_next/static/") ||
    url.pathname.startsWith("/icons/") ||
    url.pathname.startsWith("/placeholders/") ||
    url.pathname.endsWith(".svg") ||
    url.pathname.endsWith(".png") ||
    url.pathname.endsWith(".woff2") ||
    url.pathname.endsWith(".webmanifest")
  );
}

self.addEventListener("fetch", (event) => {
  const { request } = event;
  if (request.method !== "GET") return;

  const url = new URL(request.url);
  if (url.origin !== self.location.origin) return;

  // Never cache sync API
  if (url.pathname.startsWith("/api/")) return;

  if (isStaticAsset(url)) {
    event.respondWith(cacheFirst(request));
    return;
  }

  // Navigations / HTML — network first, cache fallback
  if (request.mode === "navigate" || request.destination === "document") {
    event.respondWith(networkFirstNavigate(request));
    return;
  }

  event.respondWith(staleWhileRevalidate(request));
});

async function cacheFirst(request) {
  const cached = await caches.match(request);
  if (cached) return cached;
  try {
    const res = await fetch(request);
    if (res.ok) {
      const cache = await caches.open(VERSION);
      cache.put(request, res.clone());
    }
    return res;
  } catch {
    return cached || Response.error();
  }
}

async function networkFirstNavigate(request) {
  try {
    const res = await fetch(request);
    if (res.ok) {
      const cache = await caches.open(VERSION);
      cache.put(request, res.clone());
    }
    return res;
  } catch {
    const cached =
      (await caches.match(request)) ||
      (await caches.match("/")) ||
      (await caches.match("/offline.html"));
    return (
      cached ||
      new Response("Offline", {
        status: 503,
        headers: { "Content-Type": "text/plain" },
      })
    );
  }
}

async function staleWhileRevalidate(request) {
  const cache = await caches.open(VERSION);
  const cached = await cache.match(request);
  const network = fetch(request)
    .then((res) => {
      if (res.ok) cache.put(request, res.clone());
      return res;
    })
    .catch(() => cached);
  return cached || network;
}
