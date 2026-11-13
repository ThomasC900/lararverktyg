'use strict';
const CACHE = 'olyckeskolan-matsedel-v1';
const SCOPE = self.registration.scope;
const ASSETS = ['./','./index.html','./app.css','./app.js','./manifest.webmanifest','./qr-matsedel.png','./qr.html','./icons/icon-192.png','./icons/icon-512.png','./icons/icon-maskable.png','./icons/apple-touch-icon.png','../assets/lararverktyg.css','../assets/lararverktyg-logo.svg'].map(p => new URL(p, SCOPE).href);
self.addEventListener('install', event => {
  event.waitUntil(caches.open(CACHE).then(cache => cache.addAll(ASSETS)).then(() => self.skipWaiting()));
});
self.addEventListener('activate', event => {
  event.waitUntil(caches.keys().then(keys => Promise.all(keys.filter(k => k.startsWith('olyckeskolan-matsedel-') && k !== CACHE).map(k => caches.delete(k)))).then(() => self.clients.claim()));
});
self.addEventListener('fetch', event => {
  const request = event.request;
  const url = new URL(request.url);
  if (request.method !== 'GET' || url.origin !== self.location.origin) return;
  const isMenu = url.href === new URL('./menu.json', SCOPE).href;
  if (!isMenu && !ASSETS.includes(url.href) && !(request.mode === 'navigate' && url.href.startsWith(SCOPE))) return;
  event.respondWith((async () => {
    const cache = await caches.open(CACHE);
    const key = request.mode === 'navigate' && (url.pathname === new URL(SCOPE).pathname || url.pathname === new URL('index.html', SCOPE).pathname) ? new URL('./', SCOPE).href : request;
    try {
      const controller = new AbortController();
      const timeout = setTimeout(() => controller.abort(), 7000);
      let response;
      try { response = await fetch(request, {signal:controller.signal}); }
      finally { clearTimeout(timeout); }
      if (!response.ok) throw new Error('Network response failed');
      if (isMenu) {
        const data = await response.clone().json();
        if (!data || !Array.isArray(data.days) || data.days.length !== 5 || !Number.isInteger(data.week)) throw new Error('Invalid menu');
      }
      try { await cache.put(key, response.clone()); } catch (_) { /* The online response remains usable when storage is full. */ }
      return response;
    } catch (_) {
      const saved = await cache.match(key);
      if (saved && isMenu) {
        const headers = new Headers(saved.headers); headers.set('X-Matsedel-Cache','saved');
        return new Response(await saved.arrayBuffer(), {status:200, headers});
      }
      return saved || Response.error();
    }
  })());
});
