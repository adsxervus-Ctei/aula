/* Lainec · Service worker
   1. Guarda la app en el celular para que abra sin señal (apagón o datos caídos).
   2. Recibe los avisos Web Push (domicilios nuevos) aunque la app esté cerrada.
   La API (/api/…) NUNCA se guarda: los datos de pedidos y ofertas siempre vienen frescos. */
const VERSION = 'lainec-v8-1';
const CASCARA = [
  './',
  './index.html',
  './css/estilos.css',
  './css/lobamall.css',
  './css/lainec.css',
  './js/config.js',
  './js/app.js',
  './js/lm-api.js',
  './js/lm-repartidor.js',
  './js/lm-admin.js',
  './js/lm-negocio.js',
  './js/lm-tipos.js',
  './js/lm-mesas.js',
  './js/lm-pos.js',
  './js/lm-inventario.js',
  './js/lm-entrada.js',
  './js/vendor/qrcode.min.js',
  './manifest.webmanifest',
  './privacidad.html',
  './icons/favicon.svg',
  './icons/icon-192.png',
  './icons/icon-512.png'
];

self.addEventListener('install', e => {
  e.waitUntil(caches.open(VERSION).then(c => c.addAll(CASCARA)).then(() => self.skipWaiting()));
});

self.addEventListener('activate', e => {
  e.waitUntil(
    caches.keys()
      .then(ks => Promise.all(ks.filter(k => k !== VERSION).map(k => caches.delete(k))))
      .then(() => self.clients.claim())
  );
});

self.addEventListener('fetch', e => {
  const req = e.request;
  if (req.method !== 'GET') return;
  const url = new URL(req.url);
  if (url.origin === location.origin && url.pathname.startsWith('/api/')) return; // siempre a la red
  if (url.hostname.endsWith('tile.openstreetmap.org')) return;                    // mapas: no llenar el celular
  e.respondWith(
    fetch(req)
      .then(res => {
        if (res.ok && url.origin === location.origin) {
          const copia = res.clone();
          caches.open(VERSION).then(c => c.put(req, copia)).catch(() => {});
        }
        return res;
      })
      .catch(() => caches.match(req).then(r => r || caches.match('./index.html')))
  );
});

/* ---------- Web Push ---------- */
self.addEventListener('push', e => {
  let d = {};
  try { d = e.data ? e.data.json() : {}; } catch (x) { d = { titulo: 'Lainec', cuerpo: e.data ? e.data.text() : '' }; }
  const domicilio = d.tipo === 'oferta_domicilio';
  e.waitUntil(self.registration.showNotification(d.titulo || 'Lainec', {
    body: d.cuerpo || '',
    icon: './icons/icon-192.png',
    badge: './icons/icon-192.png',
    tag: d.datos && d.datos.oferta_id ? 'oferta-' + d.datos.oferta_id : (d.tipo || 'lobamall') + '-' + (d.id || ''),
    renotify: domicilio,
    requireInteraction: domicilio,
    vibrate: domicilio ? [250, 120, 250, 120, 400] : [120],
    data: { url: d.url || './index.html?app=1#rep' }
  }));
});

self.addEventListener('notificationclick', e => {
  e.notification.close();
  const url = new URL(e.notification.data && e.notification.data.url || './index.html?app=1#rep', self.registration.scope).href;
  e.waitUntil(self.clients.matchAll({ type: 'window', includeUncontrolled: true }).then(ws => {
    for (const w of ws) { if ('focus' in w) { w.navigate(url).catch(() => {}); return w.focus(); } }
    return self.clients.openWindow(url);
  }));
});
