/* Service worker: app-shell offline beschikbaar, gegevens altijd vers.
   Catalogus en orders gaan network-first zodat productwijzigingen in de
   backend direct zichtbaar zijn zonder nieuwe app-release. */
const SHELL = 'gng-shell-v1';
const SHELL_FILES = [
  '/app/', '/app/index.html', '/app/css/app.css', '/app/manifest.webmanifest',
  '/assets/brand/grabngo-logo.png',
];

self.addEventListener('install', (e) => {
  e.waitUntil(caches.open(SHELL).then((c) => c.addAll(SHELL_FILES)).then(() => self.skipWaiting()).catch(() => self.skipWaiting()));
});
self.addEventListener('activate', (e) => {
  e.waitUntil(caches.keys().then((ks) => Promise.all(ks.filter((k) => k !== SHELL).map((k) => caches.delete(k)))).then(() => self.clients.claim()));
});
self.addEventListener('fetch', (e) => {
  const url = new URL(e.request.url);
  if (e.request.method !== 'GET' || url.origin !== location.origin) return;

  const dataFirst = url.pathname.startsWith('/data/') || url.pathname.startsWith('/api/');
  if (dataFirst) {
    e.respondWith(fetch(e.request).catch(() => caches.match(e.request)));
    return;
  }
  e.respondWith(
    caches.match(e.request).then((hit) => hit || fetch(e.request).then((res) => {
      const copy = res.clone();
      if (res.ok) caches.open(SHELL).then((c) => c.put(e.request, copy));
      return res;
    }).catch(() => caches.match('/app/index.html')))
  );
});
