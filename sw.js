/* ClimaWatt - service worker
   Guarda los archivos de la app en caché para que funcione sin internet. */
const CACHE = 'climawatt-v1';
const ARCHIVOS = [
  './', './index.html', './css/styles.css',
  './js/datos.js', './js/calculos.js', './js/almacenamiento.js', './js/app.js',
  './manifest.webmanifest', './img/icon-192.png', './img/icon-512.png'
];

self.addEventListener('install', e => {
  e.waitUntil(caches.open(CACHE).then(c => c.addAll(ARCHIVOS)).then(() => self.skipWaiting()));
});

self.addEventListener('activate', e => {
  e.waitUntil(caches.keys()
    .then(keys => Promise.all(keys.filter(k => k !== CACHE).map(k => caches.delete(k))))
    .then(() => self.clients.claim()));
});

// Primero intenta la red (para tener siempre la última versión) y si no hay internet usa la caché
self.addEventListener('fetch', e => {
  if (e.request.method !== 'GET') return;
  e.respondWith(
    fetch(e.request)
      .then(r => { const copia = r.clone(); caches.open(CACHE).then(c => c.put(e.request, copia)); return r; })
      .catch(() => caches.match(e.request).then(r => r || caches.match('./index.html')))
  );
});
