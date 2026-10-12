/* VajeYar Worker: static web app + admin panel (assets), JSON API, Telegram webhook and cron */
import { ApiError } from './util.js';
import { handleApi } from './router.js';
import './api.js';
import './admin.js';
import { webhookSecret, ensureBot } from './bot/telegram.js';
import { handleUpdate, cronTick } from './bot/handlers.js';
import { broadcastCron } from './broadcast.js';
import { getSettings } from './settings.js';

const CORS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
  'Access-Control-Allow-Headers': 'Authorization, Content-Type, If-None-Match',
  'Access-Control-Expose-Headers': 'ETag',
  'Access-Control-Max-Age': '86400',
};
const BASE_HEADERS = {
  'X-Content-Type-Options': 'nosniff',
  'Referrer-Policy': 'strict-origin-when-cross-origin',
  'Permissions-Policy': 'camera=(), microphone=(), geolocation=(), payment=()',
};
const TG_FRAMES = "'self' https://web.telegram.org https://*.telegram.org https://telegram.org";
const ADMIN_HEADERS = {
  'Content-Security-Policy': `default-src 'self'; script-src 'self'; style-src 'self' 'unsafe-inline'; img-src 'self' data: blob:; font-src 'self'; connect-src 'self'; ` +
    `frame-ancestors ${TG_FRAMES}; base-uri 'none'; form-action 'self'; object-src 'none'`,
  'Cache-Control': 'no-store', 'X-Robots-Tag': 'noindex, nofollow', 'Cross-Origin-Opener-Policy': 'same-origin',
};
function withHeaders(r, extra) {
  const h = new Headers(r.headers);
  for (const [k, v] of Object.entries(extra)) h.set(k, v);
  return new Response(r.body, { status: r.status, statusText: r.statusText, headers: h });
}
const errJson = (status, error, extra) => new Response(JSON.stringify({ error, ...(extra ? { detail: extra } : {}) }), { status, headers: { 'Content-Type': 'application/json; charset=utf-8', 'Cache-Control': 'no-store' } });

// maintenance mode keeps these working: config + word list for everyone, the whole admin API
const OPEN_IN_MAINTENANCE = /^\/api\/(config|words|admin\/)/;
async function api(req, env, url) {
  const isAdmin = url.pathname.startsWith('/api/admin/');
  const hdr = isAdmin ? { ...BASE_HEADERS, 'Cache-Control': 'no-store' } : { ...BASE_HEADERS, ...CORS };   // admin API: same origin only (no CORS)
  if (req.method === 'OPTIONS') return new Response(null, { status: 204, headers: isAdmin ? BASE_HEADERS : CORS });
  try {
    if (!OPEN_IN_MAINTENANCE.test(url.pathname) && (await getSettings(env)).maintenance) throw new ApiError(503, 'maintenance');
    return withHeaders(await handleApi(req, env, url), hdr);
  } catch (e) {
    if (e instanceof ApiError) return withHeaders(errJson(e.status, e.message, e.extra && typeof e.extra === 'string' ? e.extra : null), hdr);
    console.error('api error', url.pathname, e && e.stack || e);
    return withHeaders(errJson(500, 'server_error'), hdr);
  }
}

async function webhook(req, env, ctx) {
  if (req.method !== 'POST') return new Response('ok');
  const secret = await webhookSecret(env);
  if (!secret || req.headers.get('X-Telegram-Bot-Api-Secret-Token') !== secret) return new Response('forbidden', { status: 403 });
  let upd; try { upd = await req.json(); } catch (e) { return new Response('bad request', { status: 400 }); }
  // answer Telegram immediately, keep working in the background
  ctx.waitUntil(handleUpdate(env, upd).catch(e => console.error('update failed', e && e.stack || e)));
  return new Response('ok');
}

export default {
  async fetch(req, env, ctx) {
    const url = new URL(req.url);
    ctx.waitUntil(ensureBot(env, url.origin).catch(e => console.error('ensureBot', e.message)));
    if (url.pathname.startsWith('/api/')) return api(req, env, url);
    if (url.pathname === '/tg/webhook') return webhook(req, env, ctx);
    if (url.pathname.startsWith('/tg/')) return new Response('not found', { status: 404 });
    const r = await env.ASSETS.fetch(req);
    const sec = url.protocol === 'https:' ? { 'Strict-Transport-Security': 'max-age=31536000; includeSubDomains' } : {};
    if (url.pathname.startsWith('/admin')) return withHeaders(r, { ...BASE_HEADERS, ...sec, ...ADMIN_HEADERS });
    return withHeaders(r, { ...BASE_HEADERS, ...sec });
  },
  async scheduled(event, env, ctx) {
    ctx.waitUntil((async () => {
      let used = 0;
      try { used = await broadcastCron(env, 38); } catch (e) { console.error('broadcast cron failed', e && e.stack || e); }
      try { await cronTick(env, Math.max(8, 40 - used)); } catch (e) { console.error('cron failed', e && e.stack || e); }
    })());
  },
};
