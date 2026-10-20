/* JAC Central de Chimí — trabajador de servicio.
   Su único trabajo: que la aplicación abra sin señal.
   Guarda los archivos la primera vez y después sirve siempre desde
   el teléfono. Si hay internet, revisa en silencio si hay versión nueva. */
const CACHE = 'jac-chimi-v2';
const ARCHIVOS = ['./','./index.html','./manifest.json','./placa.jpg'];

self.addEventListener('install', e => {
  e.waitUntil(caches.open(CACHE).then(c => c.addAll(ARCHIVOS)).then(() => self.skipWaiting()));
});

self.addEventListener('activate', e => {
  e.waitUntil(
    caches.keys()
      .then(ks => Promise.all(ks.filter(k => k !== CACHE).map(k => caches.delete(k))))
      .then(() => self.clients.claim())
  );
});

self.addEventListener('fetch', e => {
  if (e.request.method !== 'GET') return;
  e.respondWith(
    caches.match(e.request).then(hit => {
      // Lo guardado manda: así abre igual de rápido con señal o sin señal.
      const red = fetch(e.request).then(r => {
        // Las tipografías de Google llegan como respuesta "opaca" (ok === false):
        // igual se guardan, para que la letra siga igual cuando no haya señal.
        if (r && (r.ok || r.type === 'opaque')) {
          caches.open(CACHE).then(c => c.put(e.request, r.clone())).catch(() => {});
        }
        return r;
      }).catch(() => hit);
      return hit || red;
    })
  );
});
