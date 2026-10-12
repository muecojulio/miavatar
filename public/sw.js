/*
 * Caché de miavatar (service worker).
 *
 * Estrategia deliberada y conservadora:
 * - Los archivos con huella (Vite `/assets/*`), los modelos de visión (`/vision/*`),
 *   las tipografías y el favicon se guardan en caché y se sirven al instante: es
 *   contenido inmutable y pesado (los modelos suman unos 27 MB), así que se
 *   descarga una sola vez.
 * - Los documentos HTML van siempre a la red primero. Si no hay conexión, se
 *   devuelve la última copia guardada para poder abrir la app.
 * - Nada más se cachea: no se tocan las consultas a The Color API ni a
 *   Open-Meteo (que ya tienen su propia caché con caducidad en la app).
 * - Nunca se guardan fotos: las imágenes del usuario viven en `blob:` y en
 *   IndexedDB, fuera del alcance de este worker.
 */

const VERSION = "miavatar-v1";
const STATIC_CACHE = `${VERSION}-static`;
const PAGES_CACHE = `${VERSION}-pages`;

const PRECACHE = ["/favicon.svg", "/og.jpg"];

const CACHE_FIRST = [/^\/vision\//, /^\/assets\//, /\.woff2$/];

self.addEventListener("install", (event) => {
  event.waitUntil(
    caches
      .open(STATIC_CACHE)
      .then((cache) => cache.addAll(PRECACHE).catch(() => undefined))
      .then(() => self.skipWaiting()),
  );
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches
      .keys()
      .then((keys) =>
        Promise.all(keys.filter((key) => !key.startsWith(VERSION)).map((key) => caches.delete(key))),
      )
      .then(() => self.clients.claim()),
  );
});

self.addEventListener("message", (event) => {
  const data = event.data || {};
  if (data.type === "clear-caches") {
    event.waitUntil(
      caches.keys().then((keys) => Promise.all(keys.map((key) => caches.delete(key)))),
    );
  }
  if (data.type === "skip-waiting") self.skipWaiting();
});

async function cacheFirst(request) {
  const cache = await caches.open(STATIC_CACHE);
  const hit = await cache.match(request);
  if (hit) return hit;
  const response = await fetch(request);
  if (response.ok && response.type === "basic") {
    cache.put(request, response.clone()).catch(() => undefined);
  }
  return response;
}

async function networkFirstPage(request) {
  const cache = await caches.open(PAGES_CACHE);
  try {
    const response = await fetch(request);
    if (response.ok) cache.put(request, response.clone()).catch(() => undefined);
    return response;
  } catch (error) {
    const hit = await cache.match(request);
    if (hit) return hit;
    throw error;
  }
}

self.addEventListener("fetch", (event) => {
  const request = event.request;
  if (request.method !== "GET") return;

  const url = new URL(request.url);
  if (url.origin !== self.location.origin) return; // Nunca tocamos peticiones de terceros.
  if (url.pathname === "/sw.js" || url.pathname === "/__app-env") return;

  if (request.mode === "navigate") {
    event.respondWith(networkFirstPage(request));
    return;
  }

  if (CACHE_FIRST.some((pattern) => pattern.test(url.pathname))) {
    event.respondWith(cacheFirst(request));
    return;
  }

  if (url.pathname === "/__grok/manifest.webmanifest") {
    event.respondWith(fetch(request));
  }
});
