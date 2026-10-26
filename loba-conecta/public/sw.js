// Service worker de Loba Conecta
// - Recibe las notificaciones push y las muestra aunque la app esté cerrada
// - Al tocar la notificación, abre la app en la sección correcta
// - Guarda la "cáscara" de la app para que abra rápido con mala señal

const CACHE = 'loba-conecta-v1';
const SHELL = ['./', './index.html', './manifest.webmanifest', './icon-192.png', './icon.svg'];

self.addEventListener('install', (event) => {
  event.waitUntil(caches.open(CACHE).then((c) => c.addAll(SHELL)).catch(() => {}));
  self.skipWaiting();
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((keys) => Promise.all(keys.filter((k) => k !== CACHE).map((k) => caches.delete(k))))
  );
  self.clients.claim();
});

// Red primero; si no hay señal, usa lo guardado (solo para la app, nunca para datos)
self.addEventListener('fetch', (event) => {
  const req = event.request;
  if (req.method !== 'GET') return;
  const url = new URL(req.url);
  if (url.origin !== self.location.origin) return;
  event.respondWith(
    fetch(req)
      .then((res) => {
        const copy = res.clone();
        caches.open(CACHE).then((c) => c.put(req, copy)).catch(() => {});
        return res;
      })
      .catch(() => caches.match(req).then((r) => r || caches.match('./index.html')))
  );
});

self.addEventListener('push', (event) => {
  let data = {};
  try { data = event.data ? event.data.json() : {}; } catch { data = { title: 'Loba Conecta', body: event.data && event.data.text() }; }
  const title = data.title || 'Loba Conecta';
  event.waitUntil(
    self.registration.showNotification(title, {
      body: data.body || 'Hay novedades en Hatillo de Loba',
      icon: './icon-192.png',
      badge: './icon-192.png',
      tag: data.tag || undefined,
      data: { url: data.url || '#/novedades' },
    })
  );
});

self.addEventListener('notificationclick', (event) => {
  event.notification.close();
  const target = new URL('./' + (event.notification.data?.url || '#/novedades'), self.registration.scope).href;
  event.waitUntil(
    self.clients.matchAll({ type: 'window', includeUncontrolled: true }).then((list) => {
      for (const client of list) {
        if ('focus' in client) {
          client.navigate(target).catch(() => {});
          return client.focus();
        }
      }
      return self.clients.openWindow(target);
    })
  );
});
