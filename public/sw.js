/*
 * Service worker GPR — offline agressif.
 *
 * Stratégie :
 *  - Coquille d'appli + statiques (_next/static, icônes, manifeste) : cache-first,
 *    immuables, versionnés par l'URL de build.
 *  - Navigations (pages HTML/RSC) : network-first avec court délai. En ligne =
 *    toujours frais ; hors ligne = dernière version vue, sinon la page /offline.
 *  - Autres GET même origine : stale-while-revalidate.
 *  - Écritures (POST des Server Actions) : jamais interceptées ni mises en cache
 *    (le retry hors ligne est géré côté Next via experimental.useOffline).
 *
 * Sécurité multi-utilisateur : à la déconnexion, la page /login envoie
 * { type: 'CLEAR_RUNTIME' } pour purger tout le contenu authentifié mis en cache.
 */

const VERSION = "gpr-v1";
const PRECACHE = `${VERSION}-precache`;
const RUNTIME = `${VERSION}-runtime`;
const OFFLINE_URL = "/offline";

const PRECACHE_URLS = [
  "/",
  "/stock",
  "/vehicules",
  "/bons",
  "/carburant",
  "/e",
  "/login",
  OFFLINE_URL,
  "/manifest.webmanifest",
  "/icons/icon-192.png",
  "/icons/icon-512.png",
  "/icons/icon-maskable-512.png",
  "/icons/apple-icon-180.png",
];

const NAV_TIMEOUT_MS = 3500;

self.addEventListener("install", (event) => {
  event.waitUntil(
    (async () => {
      const cache = await caches.open(PRECACHE);
      // addAll échoue en bloc si une URL renvoie une erreur : on tolère les ratés.
      await Promise.allSettled(PRECACHE_URLS.map((u) => cache.add(new Request(u, { cache: "reload" }))));
      await self.skipWaiting();
    })(),
  );
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    (async () => {
      const keys = await caches.keys();
      await Promise.all(
        keys.filter((k) => !k.startsWith(VERSION)).map((k) => caches.delete(k)),
      );
      await self.clients.claim();
    })(),
  );
});

self.addEventListener("message", (event) => {
  const data = event.data || {};
  if (data.type === "SKIP_WAITING") self.skipWaiting();
  if (data.type === "CLEAR_RUNTIME") {
    event.waitUntil(caches.delete(RUNTIME));
  }
});

function isStaticAsset(url) {
  return (
    url.pathname.startsWith("/_next/static/") ||
    url.pathname.startsWith("/icons/") ||
    url.pathname === "/manifest.webmanifest" ||
    url.pathname === "/favicon.ico"
  );
}

async function networkFirstNavigation(request) {
  const runtime = await caches.open(RUNTIME);
  try {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), NAV_TIMEOUT_MS);
    const response = await fetch(request, { signal: controller.signal });
    clearTimeout(timer);
    if (response && response.ok && response.type === "basic") {
      runtime.put(request, response.clone());
    }
    return response;
  } catch {
    const cached =
      (await runtime.match(request)) ||
      (await caches.match(request, { ignoreSearch: true }));
    if (cached) return cached;
    const offline = await caches.match(OFFLINE_URL);
    if (offline) return offline;
    return new Response("Hors ligne", { status: 503, headers: { "Content-Type": "text/plain; charset=utf-8" } });
  }
}

async function cacheFirst(request) {
  const cached = await caches.match(request);
  if (cached) return cached;
  const response = await fetch(request);
  if (response && response.ok) {
    const cache = await caches.open(PRECACHE);
    cache.put(request, response.clone());
  }
  return response;
}

async function staleWhileRevalidate(request) {
  const runtime = await caches.open(RUNTIME);
  const cached = await runtime.match(request);
  const network = fetch(request)
    .then((response) => {
      if (response && response.ok && response.type === "basic") {
        runtime.put(request, response.clone());
      }
      return response;
    })
    .catch(() => null);
  return cached || (await network) || new Response("", { status: 504 });
}

self.addEventListener("fetch", (event) => {
  const { request } = event;
  if (request.method !== "GET") return; // les écritures passent au réseau, jamais en cache

  const url = new URL(request.url);
  if (url.origin !== self.location.origin) return;

  if (request.mode === "navigate") {
    event.respondWith(networkFirstNavigation(request));
    return;
  }
  if (isStaticAsset(url)) {
    event.respondWith(cacheFirst(request));
    return;
  }
  // RSC (?_rsc=...), /_next/image, data — fraîcheur souhaitable mais tolérant au hors ligne
  event.respondWith(staleWhileRevalidate(request));
});
