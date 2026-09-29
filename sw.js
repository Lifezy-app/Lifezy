// Lifezy · service worker: funciona sin Internet y avisa de versiones nuevas.
// Cambia VERSION cada vez que subas cambios para que los clientes reciban la actualización.
const VERSION = 'lifezy-v3';
const SHELL = ['./', './index.html', './manifest.webmanifest', './icon.svg', './icon-192.png', './icon-512.png'];

self.addEventListener('install', e => {
  e.waitUntil(caches.open(VERSION).then(c => c.addAll(SHELL)).then(() => self.skipWaiting()));
});
self.addEventListener('activate', e => {
  e.waitUntil(caches.keys().then(keys => Promise.all(keys.filter(k => k !== VERSION).map(k => caches.delete(k)))).then(() => self.clients.claim()));
});
self.addEventListener('message', e => { if (e.data === 'skipWaiting') self.skipWaiting(); });

self.addEventListener('fetch', e => {
  const req = e.request;
  if (req.method !== 'GET') return;
  const url = new URL(req.url);
  const sameOrigin = url.origin === self.location.origin;
  const cdn = url.hostname === 'www.gstatic.com' || url.hostname === 'fonts.googleapis.com' || url.hostname === 'fonts.gstatic.com';
  if (!sameOrigin && !cdn) return; // Firebase (cuentas y datos) va siempre directo a la red
  // La página principal: primero Internet (siempre la última versión); sin conexión, la copia guardada.
  if (sameOrigin && req.mode === 'navigate') {
    e.respondWith(fetch(req).then(res => { const copy = res.clone(); caches.open(VERSION).then(c => c.put('./index.html', copy)); return res; })
      .catch(() => caches.match('./index.html')));
    return;
  }
  // El resto: primero la copia guardada (rápido y sin Internet); si no está, la red.
  e.respondWith(
    caches.match(req, { ignoreSearch: sameOrigin }).then(hit => hit || fetch(req).then(res => {
      if (res.ok || res.type === 'opaque') { const copy = res.clone(); caches.open(VERSION).then(c => c.put(req, copy)); }
      return res;
    }).catch(() => sameOrigin && req.mode === 'navigate' ? caches.match('./index.html') : undefined))
  );
});
