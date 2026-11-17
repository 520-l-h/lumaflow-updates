self.__MW_BUILD_ID="bb258fa0bbebacf0";
self.__MW_PRECACHE=["./index.html","./manifest.webmanifest","./favicon-32.png","./apple-touch-icon.png","./icon-192.png","./icon-512.png","./icon-maskable-512.png","./assets/index-Bs8QYVuE.js","./assets/index-dDU_XT2N.css","./assets/spring-B7B6llIs.webp","./assets/xlsx-rtMNn567.js"];
const PREFIX = 'medworkbench-mobile-';
const CACHE = PREFIX + (self.__MW_BUILD_ID || 'development');
const APP_SHELL = self.__MW_PRECACHE || ['./index.html', './manifest.webmanifest', './favicon-32.png', './apple-touch-icon.png', './icon-192.png', './icon-512.png', './icon-maskable-512.png'];

self.addEventListener('install', event => event.waitUntil(
  caches.open(CACHE).then(cache => cache.addAll(APP_SHELL))
));
self.addEventListener('activate', event => event.waitUntil(
  caches.keys().then(keys => Promise.all(keys.filter(key => key.startsWith(PREFIX) && key !== CACHE).map(key => caches.delete(key))))
    .then(() => self.clients.claim())
));
self.addEventListener('message', event => { if (event.data?.type === 'SKIP_WAITING') void self.skipWaiting(); });

async function navigation(request) {
  const cache = await caches.open(CACHE);
  // Keep the document and hashed assets on the same installed build.
  return await cache.match('./index.html') || fetch(request);
}

async function asset(request) {
  const cache = await caches.open(CACHE);
  // Only public, same-origin app-shell assets reach here. Some static hosts add
  // Vary: Origin; module/CSS requests include Origin while install-time fetches
  // do not. They must still use the same pinned build when the device is offline.
  return await cache.match(request, { ignoreVary: true }) || fetch(request);
}

self.addEventListener('fetch', event => {
  const request = event.request;
  if (request.method !== 'GET') return;
  const url = new URL(request.url);
  const scope = new URL(self.registration.scope);
  if (url.origin !== scope.origin || !url.pathname.startsWith(scope.pathname)) return;
  const path = url.pathname.slice(scope.pathname.length);
  if (path === 'api' || path.startsWith('api/')) return;
  if (request.mode === 'navigate') { event.respondWith(navigation(request)); return; }
  if (path.startsWith('assets/') || ['favicon-32.png', 'apple-touch-icon.png', 'icon-192.png', 'icon-512.png', 'icon-maskable-512.png', 'manifest.webmanifest'].includes(path)) {
    event.respondWith(asset(request));
  }
});
