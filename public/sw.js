/* CALI-LAB service worker — offline app shell + asset cache */
const VERSION = "cali-lab-sw-v10";
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
  "/hero-padure.svg",
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

/** Next.js App Router soft navigations — must never be cached by the SW. */
function isNextDataRequest(request, url) {
  if (url.searchParams.has("_rsc")) return true;
  if (request.headers.get("RSC") === "1") return true;
  if (request.headers.get("Next-Router-Prefetch")) return true;
  if (request.headers.get("Next-Router-State-Tree")) return true;
  if (request.headers.get("Next-Url")) return true;
  return false;
}

function offlineFallback() {
  return (
    caches.match("/offline.html") ||
    caches.match("/") ||
    new Response("Offline", {
      status: 503,
      headers: { "Content-Type": "text/plain; charset=utf-8" },
    })
  );
}

self.addEventListener("fetch", (event) => {
  const { request } = event;
  if (request.method !== "GET") return;

  const url = new URL(request.url);
  if (url.origin !== self.location.origin) return;

  // Never touch APIs or Next.js RSC / soft-nav payloads
  if (url.pathname.startsWith("/api/")) return;
  if (isNextDataRequest(request, url)) return;

  if (isStaticAsset(url)) {
    event.respondWith(cacheFirst(request));
    return;
  }

  // Full document navigations only
  if (request.mode === "navigate" || request.destination === "document") {
    event.respondWith(networkFirstNavigate(request));
    return;
  }

  // Other same-origin GETs (fonts already covered): network, no undefined responses
  event.respondWith(networkOnly(request));
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
    return cached || (await offlineFallback());
  }
}

async function networkFirstNavigate(request) {
  try {
    const res = await fetch(request);
    // Cache only known shell paths — never dynamic /scoli/[id] etc.
    const url = new URL(request.url);
    const path = url.pathname.replace(/\/$/, "") || "/";
    if (res.ok && SHELL.includes(path)) {
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
        headers: { "Content-Type": "text/plain; charset=utf-8" },
      })
    );
  }
}

async function networkOnly(request) {
  try {
    return await fetch(request);
  } catch {
    const cached = await caches.match(request);
    return cached || (await offlineFallback());
  }
}
