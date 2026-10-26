/* Mesa y Ruta · trabajador de servicio: abre sin señal.
   Suba VERSION cada vez que cambie un archivo para que los teléfonos se actualicen. */
const VERSION = 'myr-v1.0.0';
const ESENCIALES = ['./', './index.html', './panel.html', './css/app.css', './css/panel.css', './js/config.js', './js/menu.js', './js/datos.js', './js/app.js', './js/panel.js',
  './vendor/leaflet/leaflet.js', './vendor/leaflet/leaflet.css', './vendor/qrcode.js', './manifest.webmanifest', './icons/icono-192.png', './icons/icono-512.png'];
const OPCIONALES = ['./fonts/poppins-latin-400-normal.woff2', './fonts/poppins-latin-500-normal.woff2', './fonts/poppins-latin-600-normal.woff2', './fonts/poppins-latin-700-normal.woff2',
  './icons/icono-maskable-512.png', './icons/apple-touch-icon.png', './vendor/leaflet/images/marker-icon.png', './vendor/leaflet/images/marker-shadow.png'];

self.addEventListener('install', e => {
  e.waitUntil((async () => {
    const c = await caches.open(VERSION);
    await c.addAll(ESENCIALES);
    await Promise.allSettled(OPCIONALES.map(u => c.add(u)));
    await self.skipWaiting();
  })());
});
self.addEventListener('activate', e => {
  e.waitUntil(caches.keys().then(ks => Promise.all(ks.filter(k => k !== VERSION).map(k => caches.delete(k)))).then(() => self.clients.claim()));
});
self.addEventListener('fetch', e => {
  if (e.request.method !== 'GET') return;
  const u = new URL(e.request.url);
  // Datos vivos (rutas, direcciones, mapas, base de datos): siempre a la red.
  if (u.origin !== self.location.origin) return;
  e.respondWith(caches.match(e.request, { ignoreSearch: e.request.mode === 'navigate' }).then(hit => {
    const red = fetch(e.request).then(r => {
      if (r && r.ok) { const copia = r.clone(); caches.open(VERSION).then(c => c.put(e.request, copia)).catch(() => {}); }
      return r;
    }).catch(() => hit);
    return hit || red;
  }));
});
