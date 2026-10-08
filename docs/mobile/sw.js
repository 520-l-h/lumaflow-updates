self.__MW_BUILD_ID="150fd251ca4c1cda";
self.__MW_PRECACHE=["./index.html","./manifest.webmanifest","./favicon-32.png","./apple-touch-icon.png","./icon-192.png","./icon-512.png","./icon-maskable-512.png","./assets/index-BKaJioPL.css","./assets/index-PSiymvTm.js","./assets/jszip.min-DuF75bdB.js","./assets/spring-B7B6llIs.webp","./assets/xlsx-rtMNn567.js"];
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
  return await cache.match(request) || fetch(request);
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
