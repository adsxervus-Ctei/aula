/* JAC Central de Chimí — trabajador de servicio.
   Su único trabajo: que la aplicación abra sin señal.
   Guarda los archivos la primera vez y después sirve siempre desde
   el teléfono. Si hay internet, revisa en silencio si hay versión nueva.

   v6 (diseño 2026): cada archivo se guarda por separado, así que si uno
   opcional falta (por ejemplo placa.jpg) la aplicación igual queda lista
   para abrir sin señal. Antes, un solo archivo ausente dañaba toda la
   instalación. */
const CACHE = 'jac-chimi-v6';
const ESENCIALES = ['./', './index.html', './manifest.json', './icono-192.png', './icono-512.png'];
const OPCIONALES = ['./placa.jpg', './icono-maskable-512.png', './apple-touch-icon.png'];

self.addEventListener('install', e => {
  e.waitUntil((async () => {
    const c = await caches.open(CACHE);
    await c.addAll(ESENCIALES);                        // sin estos no abre: deben estar
    await Promise.allSettled(OPCIONALES.map(u => c.add(u)));  // estos, si están
    await self.skipWaiting();
  })());
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
  const url = new URL(e.request.url);
  // WhatsApp y servicios de Google (mapas, inicio de sesión): siempre a la red,
  // nunca a la caché. Las políticas de los mapas no permiten guardarlos.
  // Solo las tipografías de Google se guardan, para que la letra no cambie sin señal.
  const h = url.hostname;
  const esFuente = h === 'fonts.googleapis.com' || h === 'fonts.gstatic.com';
  if (!esFuente && (h === 'wa.me' || h.endsWith('whatsapp.com') || h.endsWith('google.com') ||
      h.endsWith('googleapis.com') || h.endsWith('gstatic.com') || h.endsWith('firebaseapp.com'))) return;
  e.respondWith(
    caches.match(e.request).then(hit => {
      // Lo guardado manda: así abre igual de rápido con señal o sin señal.
      const red = fetch(e.request).then(r => {
        // Las tipografías de Google llegan como respuesta "opaca" (ok === false):
        // igual se guardan, para que la letra siga igual cuando no haya señal.
        if (r && (r.ok || r.type === 'opaque')) {
          const copia = r.clone();
          caches.open(CACHE).then(c => c.put(e.request, copia)).catch(() => {});
        }
        return r;
      }).catch(() => hit);
      return hit || red;
    })
  );
});
