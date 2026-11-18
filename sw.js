/* ClimaWatt - service worker
   Guarda los archivos de la app en caché para que funcione sin internet. */
const CACHE = 'climawatt-v3';
const ARCHIVOS = [
  './', './index.html', './css/styles.css',
  './js/datos.js', './js/iconos.js', './js/calculos.js', './js/almacenamiento.js', './js/lector.js', './js/app.js',
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

// Primero intenta la red (para tener siempre la última versión) y si no hay internet usa la caché.
// Solo se guardan respuestas correctas del mismo sitio.
self.addEventListener('fetch', e => {
  const req = e.request;
  if (req.method !== 'GET' || new URL(req.url).origin !== self.location.origin) return;
  e.respondWith(
    fetch(req)
      .then(r => {
        if (r.ok && r.type === 'basic') {
          const copia = r.clone();
          caches.open(CACHE).then(c => c.put(req, copia)).catch(() => {});
        }
        return r;
      })
      .catch(() => caches.match(req, { ignoreSearch: true }).then(r => {
        if (r) return r;
        // Sin conexión: solo las páginas se responden con la app; el resto falla normalmente
        if (req.mode === 'navigate') return caches.match('./index.html');
        return Response.error();
      }))
  );
});
