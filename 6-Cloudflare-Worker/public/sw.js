/* VajeYar service worker — network-first for the app shell, cache fallback offline.
   API calls (/api/…) and the admin panel are never cached. */
const CACHE = 'vajeyar-v6';
const ASSETS = ['./','./index.html','./manifest.webmanifest','./css/style.css','./js/icons.js','./js/i18n.js','./js/words_general.js','./js/words_ielts.js','./js/words_toefl.js','./js/words_extra.js','./js/core.js','./js/ui.js','./js/config.js','./js/account.js','./js/views.js','./js/telegram.js','./js/telegram-web-app.js','./icons/icon-192.png','./icons/icon-512.png','./icons/maskable-512.png',
 './fonts/vazirmatn-arabic-400-normal.woff2','./fonts/vazirmatn-arabic-500-normal.woff2','./fonts/vazirmatn-arabic-700-normal.woff2','./fonts/vazirmatn-arabic-800-normal.woff2','./fonts/vazirmatn-latin-400-normal.woff2','./fonts/vazirmatn-latin-500-normal.woff2','./fonts/vazirmatn-latin-700-normal.woff2','./fonts/vazirmatn-latin-800-normal.woff2'];
self.addEventListener('install', e => { e.waitUntil(caches.open(CACHE).then(c => c.addAll(ASSETS)).then(() => self.skipWaiting())); });
self.addEventListener('activate', e => { e.waitUntil(caches.keys().then(keys => Promise.all(keys.filter(k => k !== CACHE).map(k => caches.delete(k)))).then(() => self.clients.claim())); });
self.addEventListener('fetch', e => {
  const url = new URL(e.request.url);
  if (e.request.method !== 'GET' || url.origin !== location.origin) return;       // online dictionary etc. → network
  if (/\/(api|admin)(\/|$)/.test(url.pathname)) return;                           // server data is never cached here
  const isFont = /\.(woff2|png)$/.test(url.pathname);
  if (isFont) {   // static binaries: cache-first
    e.respondWith(caches.match(e.request).then(r => r || fetch(e.request).then(res => { const c = res.clone(); caches.open(CACHE).then(x => x.put(e.request, c)); return res; })));
    return;
  }
  // html / js / css: network-first so updates show up immediately, cache when offline
  e.respondWith(fetch(e.request).then(res => { if (res.ok) { const c = res.clone(); caches.open(CACHE).then(x => x.put(e.request, c)); } return res; })
    .catch(() => caches.match(e.request).then(r => r || caches.match('./index.html'))));
});
