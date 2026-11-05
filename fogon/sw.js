/* Mesa y Ruta · trabajador de servicio
   · Abre sin señal: guarda la app al instalarse.
   · Fotos del menú (Unsplash y las subidas por el negocio): se guardan
     la primera vez que se ven, para mostrarlas luego sin señal.
   · Datos vivos (rutas, direcciones, base de datos): siempre a la red.
   Suba VERSION cada vez que cambie un archivo. */
const VERSION = 'myr-v7.0.0';
const FOTOS = 'myr-fotos-v2';
const ESENCIALES = ['./', './index.html', './js/arranque.js', './css/app.css', './css/negocio.css', './css/v6.css', './js/config.js', './js/instalar.js', './js/catalogo.js', './js/arte.js',
  './js/nucleo.js', './js/ticket.js', './js/carnet.js', './js/seguimiento.js', './js/asistente.js', './js/tutorial.js', './js/cliente.js', './js/negocio.js', './js/xlsx.js', './js/informe.js', './js/datos.js',
  './vendor/qrcode.js', './vendor/fflate.js', './vendor/leaflet/leaflet.js', './vendor/leaflet/leaflet.css', './manifest.webmanifest', './icons/icono-192.png', './icons/icono-512.png'];
const OPCIONALES = ['./fonts/poppins-latin-400-normal.woff2', './fonts/poppins-latin-500-normal.woff2', './fonts/poppins-latin-600-normal.woff2', './fonts/poppins-latin-700-normal.woff2',
  './icons/icono-maskable-512.png', './icons/apple-touch-icon.png', './privacidad.html', './js/legal.js',
  './audio/tutorial/guion.json', './audio/tutorial/musica.mp3', ...Array.from({ length: 12 }, (_, k) => `./audio/tutorial/c${String(k + 1).padStart(2, '0')}.mp3`), ...Array.from({ length: 9 }, (_, k) => `./audio/tutorial/n${String(k + 1).padStart(2, '0')}.mp3`), './vendor/jsQR.js', './vendor/jspdf.umd.min.js', './vendor/jspdf.plugin.autotable.min.js', './fonts/playfair-display-latin-700-normal.woff2', './fonts/playfair-display-latin-700-italic.woff2'];

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
      // con CORS se sabe si la foto llegó bien y solo esa se guarda (antes una falla quedaba guardada)
      try { const r = await fetch(e.request.url, { mode: 'cors', credentials: 'omit' }); if (r.ok) { c.put(e.request, r.clone()).then(() => recortar(c)).catch(() => {}); return r; } }
      catch (er) { /* sin CORS o sin señal: se intenta normal */ }
      try { return await fetch(e.request); } catch (er) { return new Response('', { status: 504 }); }
    }));
    return;
  }
  if (u.origin !== self.location.origin) return;
  if (u.pathname.endsWith('.mp4')) return;     // videos: el navegador pide por rangos; se dejan a la red
  // la página, el código y los estilos: primero la red (así cada publicación llega de una vez);
  // si no hay señal o tarda más de 4 s, lo guardado. Imágenes, fuentes y audio: primero lo guardado.
  const codigo = e.request.mode === 'navigate' || /\.(html|js|css|json|webmanifest)$/.test(u.pathname) || u.pathname.endsWith('/');
  const deCache = () => caches.match(e.request, { ignoreSearch: e.request.mode === 'navigate' });
  const guardar = r => { if (r && r.ok && r.type === 'basic') { const copia = r.clone(); caches.open(VERSION).then(c => c.put(e.request, copia)).catch(() => {}); } return r; };
  if (codigo) {
    e.respondWith(new Promise(res => {
      let listo = false; const fin = r => { if (!listo && r) { listo = true; res(r); } };
      const t = setTimeout(() => deCache().then(fin), 4000);
      fetch(e.request).then(guardar).then(r => { clearTimeout(t); fin(r); })
        .catch(() => { clearTimeout(t); deCache().then(h => fin(h || new Response('Sin señal', { status: 503 }))); });
    }));
    return;
  }
  e.respondWith(deCache().then(hit => hit || fetch(e.request).then(guardar).catch(() => hit)));
});
