/* DanaFox service worker — offline-first.
   App shell: served from the cache at once (works with no connection), refreshed in the background (stale-while-revalidate);
   a new version is picked up on the next start. API calls (/api/…) and the admin panel are never cached here. */
const CACHE = 'vajeyar-v13';
const ASSETS = ['./','./index.html','./manifest.webmanifest','./icons/mark.png','./icons/icon-192.png','./css/style.css','./js/icons.js','./js/i18n.js','./js/i18n3.js','./js/words_data.js','./js/decks_data.js','./js/reading_data.js','./js/core.js','./js/ui.js','./js/config.js','./js/account.js','./js/views.js','./js/smart.js','./js/reading.js','./js/inside.js','./js/inside_data.js','./js/grammar.js','./js/grammar_data.js','./js/vbooks.js','./js/vbooks_data.js','./js/placement.js','./js/duel.js','./js/social.js','./js/boot.js','./js/telegram.js','./js/telegram-web-app.js','./icons/icon-192.png','./icons/icon-512.png','./icons/maskable-512.png',
 './fonts/vazirmatn-arabic-400-normal.woff2','./fonts/vazirmatn-arabic-500-normal.woff2','./fonts/vazirmatn-arabic-700-normal.woff2','./fonts/vazirmatn-arabic-800-normal.woff2','./fonts/vazirmatn-latin-400-normal.woff2','./fonts/vazirmatn-latin-500-normal.woff2','./fonts/vazirmatn-latin-700-normal.woff2','./fonts/vazirmatn-latin-800-normal.woff2'];
self.addEventListener('install', e => {
  // cache: 'reload' skips the HTTP cache so a new version never installs stale files
  e.waitUntil(caches.open(CACHE).then(c => Promise.all(ASSETS.map(u => fetch(new Request(u, {cache: 'reload'})).then(r => r.ok && c.put(u, r)).catch(() => {})))
    // Grammar in Use pictures (~4 MB) so exercises work offline
    .then(() => fetch('./gr/list.json').then(r => r.json()).then(l => Promise.all(l.map(f => './gr/' + f).map(u => c.match(u).then(h => h || fetch(u).then(r => r.ok && c.put(u, r)).catch(() => {}))))).catch(() => {}))).then(() => self.skipWaiting()));
});
self.addEventListener('activate', e => { e.waitUntil(caches.keys().then(keys => Promise.all(keys.filter(k => k.startsWith('vajeyar-') && k !== CACHE).map(k => caches.delete(k)))).then(() => self.clients.claim())); });
const fresh = (req, key) => fetch(req).then(res => { if(res && res.ok && res.type === 'basic'){ const c = res.clone(); caches.open(CACHE).then(x => x.put(key || req, c)); } return res; });
self.addEventListener('fetch', e => {
  const req = e.request, url = new URL(req.url);
  if(req.method !== 'GET' || url.origin !== location.origin) return;            // online dictionary, translation, Telegram … → network
  if(/\/(api|admin)(\/|$)/.test(url.pathname)) return;                           // server data is never cached here
  if(req.mode === 'navigate'){                                                    // the page itself: cached shell first, works offline
    e.respondWith(caches.match('./index.html').then(hit => { const net = fresh(req, './index.html').catch(() => null); return hit || net.then(r => r || Response.error()); }));
    return;
  }
  e.respondWith(caches.match(req, {ignoreSearch: true}).then(hit => {
    const net = fresh(req).catch(() => null);
    if(hit){ e.waitUntil(net); return hit; }                                       // stale-while-revalidate
    return net.then(r => r || caches.match('./index.html'));
  }));
});
self.addEventListener('message', e => { if(e.data === 'skipWaiting') self.skipWaiting(); });
