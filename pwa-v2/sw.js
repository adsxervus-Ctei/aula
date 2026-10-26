/* Mesa y Ruta · trabajador de servicio
   · Abre sin señal: guarda la app al instalarse.
   · Fotos del menú (Unsplash y las subidas por el negocio): se guardan
     la primera vez que se ven, para mostrarlas luego sin señal.
   · Datos vivos (rutas, direcciones, base de datos): siempre a la red.
   Suba VERSION cada vez que cambie un archivo. */
const VERSION = 'myr-v2.0.0';
const FOTOS = 'myr-fotos-v1';
const ESENCIALES = ['./', './index.html', './css/app.css', './css/negocio.css', './js/config.js', './js/instalar.js', './js/catalogo.js', './js/arte.js',
  './js/nucleo.js', './js/ticket.js', './js/asistente.js', './js/cliente.js', './js/negocio.js', './js/xlsx.js',
  './vendor/qrcode.js', './vendor/fflate.js', './vendor/leaflet/leaflet.js', './vendor/leaflet/leaflet.css', './manifest.webmanifest', './icons/icono-192.png', './icons/icono-512.png'];
const OPCIONALES = ['./fonts/poppins-latin-400-normal.woff2', './fonts/poppins-latin-500-normal.woff2', './fonts/poppins-latin-600-normal.woff2', './fonts/poppins-latin-700-normal.woff2',
  './icons/icono-maskable-512.png', './icons/apple-touch-icon.png', './video/tutorial-cliente.jpg', './video/tutorial-negocio.jpg'];

self.addEventListener('install', e => {
  e.waitUntil((async () => {
    const c = await caches.open(VERSION);
    await c.addAll(ESENCIALES);
    await Promise.allSettled(OPCIONALES.map(u => c.add(u)));
    await self.skipWaiting();
  })());
});
self.addEventListener('activate', e => {
  e.waitUntil(caches.keys().then(ks => Promise.all(ks.filter(k => k !== VERSION && k !== FOTOS).map(k => caches.delete(k)))).then(() => self.clients.claim()));
});
self.addEventListener('fetch', e => {
  if (e.request.method !== 'GET') return;
  const u = new URL(e.request.url);
  // fotos: primero lo guardado; si no está, se trae y se guarda (máx. ~200)
  if (u.hostname === 'images.unsplash.com' || (u.hostname.endsWith('.supabase.co') && u.pathname.includes('/storage/v1/object/public/'))) {
    e.respondWith(caches.open(FOTOS).then(async c => {
      const hit = await c.match(e.request); if (hit) return hit;
      try { const r = await fetch(e.request); if (r && (r.ok || r.type === 'opaque')) { c.put(e.request, r.clone()); recortar(c); } return r; }
      catch (er) { return new Response('', { status: 504 }); }
    }));
    return;
  }
  if (u.origin !== self.location.origin) return;
  if (u.pathname.endsWith('.mp4')) return;     // videos: el navegador pide por rangos; se dejan a la red
  e.respondWith(caches.match(e.request, { ignoreSearch: e.request.mode === 'navigate' }).then(hit => {
    const red = fetch(e.request).then(r => {
      if (r && r.ok) { const copia = r.clone(); caches.open(VERSION).then(c => c.put(e.request, copia)).catch(() => {}); }
      return r;
    }).catch(() => hit);
    return hit || red;
  }));
});
async function recortar(c) { const ks = await c.keys(); if (ks.length > 200) for (const k of ks.slice(0, ks.length - 200)) await c.delete(k); }
self.addEventListener('notificationclick', e => {
  e.notification.close();
  e.waitUntil(self.clients.matchAll({ type: 'window' }).then(cs => cs.length ? cs[0].focus() : self.clients.openWindow('./')));
});
