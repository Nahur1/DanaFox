/* VajeYar service worker — offline-first cache */
const CACHE = 'vajeyar-v1';
const ASSETS = ['./','./index.html','./manifest.webmanifest','./css/style.css','./js/icons.js','./js/i18n.js','./js/words_general.js','./js/words_ielts.js','./js/words_toefl.js','./js/words_extra.js','./js/core.js','./js/ui.js','./js/views.js','./icons/icon-192.png','./icons/icon-512.png','./icons/maskable-512.png',
 './fonts/vazirmatn-arabic-400-normal.woff2','./fonts/vazirmatn-arabic-500-normal.woff2','./fonts/vazirmatn-arabic-700-normal.woff2','./fonts/vazirmatn-arabic-800-normal.woff2','./fonts/vazirmatn-latin-400-normal.woff2','./fonts/vazirmatn-latin-500-normal.woff2','./fonts/vazirmatn-latin-700-normal.woff2','./fonts/vazirmatn-latin-800-normal.woff2'];
self.addEventListener('install', e => { e.waitUntil(caches.open(CACHE).then(c => c.addAll(ASSETS)).then(() => self.skipWaiting())); });
self.addEventListener('activate', e => { e.waitUntil(caches.keys().then(keys => Promise.all(keys.filter(k => k !== CACHE).map(k => caches.delete(k)))).then(() => self.clients.claim())); });
self.addEventListener('fetch', e => {
  const url = new URL(e.request.url);
  if (e.request.method !== 'GET' || url.origin !== location.origin) return; // online dictionary requests go to network
  e.respondWith(caches.match(e.request).then(r => r || fetch(e.request).then(res => { const copy = res.clone(); caches.open(CACHE).then(c => c.put(e.request, copy)); return res; }).catch(() => caches.match('./index.html'))));
});
