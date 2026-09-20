// Minimal service worker whose only job is to satisfy Chrome's "installable
// as an app" requirements so the in-app Add to Home Screen button works on
// Android. It intentionally does no caching, since scores need to always be
// fresh from the network.
self.addEventListener('install', () => self.skipWaiting());
self.addEventListener('activate', (event) => event.waitUntil(self.clients.claim()));
self.addEventListener('fetch', (event) => {
  event.respondWith(fetch(event.request));
});
