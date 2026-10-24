/* =========================================================================
   Aprende JAC · Chimí — Service worker
   Estrategia:
   - Instalación: guarda en caché TODO lo necesario para abrir sin señal.
   - Archivos de la app: primero caché, con actualización en segundo plano.
   - Fotos de /img: primero caché; si no existen, la app muestra el marcador.
   - Peticiones a Supabase: nunca se guardan en caché (van directo a la red).
   IMPORTANTE: cada vez que cambie un archivo, suba el número de VERSION.
   ========================================================================= */
const VERSION = "aprende-jac-v1.1.0";
const CACHE_APP = VERSION + "-app";
const CACHE_FOTOS = "aprende-jac-fotos";

const ARCHIVOS = [
  "./",
  "./index.html",
  "./manifest.webmanifest",
  "./css/app.css",
  "./js/config.js",
  "./js/contenido.js",
  "./js/sync.js",
  "./js/app.js",
  "./img/fotos.json",
  "./fonts/poppins-latin-400-normal.woff2",
  "./fonts/poppins-latin-500-normal.woff2",
  "./fonts/poppins-latin-600-normal.woff2",
  "./fonts/poppins-latin-700-normal.woff2",
  "./icons/icon-192.png",
  "./icons/icon-512.png",
  "./icons/icon-maskable-512.png",
  "./icons/apple-touch-icon.png",
  "./icons/favicon-32.png"
];

self.addEventListener("install", (e) => {
  e.waitUntil(
    caches.open(CACHE_APP)
      .then((c) => c.addAll(ARCHIVOS.map((u) => new Request(u, { cache: "reload" }))))
      .then(() => self.skipWaiting())
  );
});

self.addEventListener("activate", (e) => {
  e.waitUntil(
    caches.keys()
      .then((ks) => Promise.all(ks.filter((k) => k !== CACHE_APP && k !== CACHE_FOTOS).map((k) => caches.delete(k))))
      .then(() => self.clients.claim())
  );
});

self.addEventListener("fetch", (e) => {
  const req = e.request;
  if (req.method !== "GET") return;
  const url = new URL(req.url);
  if (url.origin !== self.location.origin) return; // Supabase u otros: red directa

  /* Navegación: siempre responde con la app (rutas por #, una sola página) */
  if (req.mode === "navigate") {
    e.respondWith(
      fetch(req).then((r) => {
        const copia = r.clone();
        caches.open(CACHE_APP).then((c) => c.put("./index.html", copia));
        return r;
      }).catch(() => caches.match("./index.html", { ignoreSearch: true }))
    );
    return;
  }

  /* Fotos: caché primero; se guardan la primera vez que se ven con señal */
  if (url.pathname.includes("/img/") && !url.pathname.endsWith(".json")) {
    e.respondWith(
      caches.open(CACHE_FOTOS).then((c) =>
        c.match(req).then((hit) => hit || fetch(req).then((r) => { if (r.ok) c.put(req, r.clone()); return r; }))
      )
    );
    return;
  }

  /* Archivos de la app: caché primero y actualización en segundo plano */
  e.respondWith(
    caches.open(CACHE_APP).then((c) =>
      c.match(req, { ignoreSearch: true }).then((hit) => {
        const red = fetch(req).then((r) => { if (r.ok) c.put(req, r.clone()); return r; }).catch(() => hit);
        return hit || red;
      })
    )
  );
});
