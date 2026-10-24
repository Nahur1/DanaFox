/* Telegram Bot API helpers + automatic bot setup (webhook, commands, descriptions, Mini App menu button) */
import { ApiError, meta, adminIds } from '../util.js';
import { sha256 } from '../security.js';
import { T } from './texts.js';

const SETUP_VERSION = 'v4';
let CACHE = { at: 0, token: null, username: null, secret: null, origin: null };
async function load(env) {
  if (Date.now() - CACHE.at < 30000) return CACHE;
  const rows = (await env.DB.prepare("SELECT key, value FROM meta WHERE key IN ('tg_token','tg_username','origin')").all()).results || [];
  const m = Object.fromEntries(rows.map(r => [r.key, r.value]));
  const token = env.TG_BOT_TOKEN || m.tg_token || null;
  CACHE = { at: Date.now(), token, username: m.tg_username || null, secret: token ? await secretFor(token) : null, origin: env.PUBLIC_URL || m.origin || null };
  return CACHE;
}
/* the webhook secret is derived from the bot token, so every Worker instance agrees on it without storing it */
const secretFor = async token => (await sha256('vajeyar-webhook:' + token)).slice(0, 48);
export const botToken = async env => (await load(env)).token;
export const botUsername = async env => { const c = await load(env); return c.token ? c.username : null; };
export const webhookSecret = async env => (await load(env)).secret;
export const publicOrigin = async env => (await load(env)).origin;
export const tokenFromEnv = env => !!env.TG_BOT_TOKEN;

export async function tg(env, method, params = {}, token) {
  token = token || await botToken(env);
  if (!token) throw new Error('no bot token');
  let opts;
  if (params instanceof FormData) opts = { method: 'POST', body: params };
  else opts = { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(params) };
  const r = await fetch(`${env.TG_API || 'https://api.telegram.org'}/bot${token}/${method}`, opts);   // TG_API: only for local tests
  const j = await r.json().catch(() => ({ ok: false, description: 'bad response' }));
  if (!j.ok) { const e = new Error(j.description || 'telegram error'); e.code = j.error_code; e.retry = j.parameters && j.parameters.retry_after; throw e; }
  return j.result;
}

export async function botInfo(env) {
  const c = await load(env);
  if (!c.token) return { configured: false };
  try {
    const [me, wh] = await Promise.all([tg(env, 'getMe'), tg(env, 'getWebhookInfo')]);
    const expected = c.origin ? `${c.origin}/tg/webhook` : null;
    return { configured: true, from_secret: tokenFromEnv(env), id: me.id, username: me.username, name: me.first_name, inline: !!me.supports_inline_queries,
      webhook: wh.url, webhook_ok: !!expected && wh.url === expected, pending: wh.pending_update_count || 0,
      last_error: wh.last_error_message || null, last_error_at: wh.last_error_date ? wh.last_error_date * 1000 : null,
      app_url: c.origin ? `${c.origin}/?tg=1` : null, admin_url: c.origin ? `${c.origin}/admin/?tg=1` : null, setup_at: +(await meta(env, 'tg_setup_at', 0)) || null };
  } catch (e) { return { configured: true, from_secret: tokenFromEnv(env), error: e.message }; }
}

const CMDS = ['menu', 'review', 'learn', 'quiz', 'games', 'dict', 'words', 'stats', 'wotd', 'settings', 'account', 'help'];
function commands(lang, admin) {
  const L = T[lang], extra = lang === 'fa' ? { account: 'حساب و همگام‌سازی با وب', admin: '🛠 پنل مدیریت' } : { account: 'Account & web sync', admin: '🛠 Admin panel' };
  const list = admin ? [...CMDS, 'admin'] : CMDS;
  return list.map(c => ({ command: c, description: (extra[c] || L['cmd_' + c] || c).slice(0, 256) }));
}
/** admin-only command list (shows /admin in the admin's own chat only) */
export async function adminCommands(env, chatId, token) {
  for (const lang of ['fa', 'en'])
    await tg(env, 'setMyCommands', { commands: commands(lang, true), scope: { type: 'chat', chat_id: chatId }, ...(lang === 'fa' ? { language_code: 'fa' } : {}) }, token).catch(() => {});
}

/** validates the token, registers the webhook (with a secret header), commands, descriptions and the Mini App menu button */
export async function setupBot(env, token, origin, { store = false } = {}) {
  if (!/^\d+:[\w-]{30,}$/.test(token)) throw new ApiError(400, 'bad_token');
  let me;
  try { me = await tg(env, 'getMe', {}, token); } catch (e) { throw new ApiError(400, 'bad_token'); }
  const secret = await secretFor(token);
  await tg(env, 'setWebhook', { url: `${origin}/tg/webhook`, secret_token: secret, allowed_updates: ['message', 'callback_query', 'inline_query', 'my_chat_member'], max_connections: 40 }, token);
  const stmts = [['tg_username', me.username], ['origin', origin]];
  if (store) stmts.push(['tg_token', token]);
  await env.DB.batch(stmts.map(([k, v]) => env.DB.prepare('INSERT OR REPLACE INTO meta(key,value) VALUES(?,?)').bind(k, v)));
  CACHE.at = 0;
  for (const lang of ['fa', 'en']) {
    const L = T[lang], lc = lang === 'fa' ? { language_code: 'fa' } : {};
    await tg(env, 'setMyCommands', { commands: commands(lang, false), ...lc }, token).catch(() => {});
    await tg(env, 'setMyDescription', { description: L.bot_desc, ...lc }, token).catch(() => {});
    await tg(env, 'setMyShortDescription', { short_description: L.bot_short, ...lc }, token).catch(() => {});
  }
  await tg(env, 'setChatMenuButton', { menu_button: { type: 'web_app', text: 'دانافاکس', web_app: { url: `${origin}/?tg=1` } } }, token).catch(() => {});
  for (const id of adminIds(env)) await adminCommands(env, id, token);
  await env.DB.batch([['tg_setup', await setupHash(token, origin)], ['tg_setup_at', String(Date.now())]].map(([k, v]) => env.DB.prepare('INSERT OR REPLACE INTO meta(key,value) VALUES(?,?)').bind(k, v)));   // only after every step ran
  return botInfo(env);
}
const setupHash = async (token, origin) => (await sha256(`${SETUP_VERSION}|${token}|${origin}`)).slice(0, 32);

/* runs once per Worker instance: if the token (wrangler secret) or the public URL changed since the last setup, set the bot up again */
let ENSURE = { done: false, at: 0 };
export async function ensureBot(env, origin) {
  if (ENSURE.done || Date.now() - ENSURE.at < 120000) return;
  ENSURE.at = Date.now();
  const c = await load(env); if (!c.token) { ENSURE.done = true; return; }
  const o = env.PUBLIC_URL || c.origin || origin;
  if ((await meta(env, 'tg_setup')) === await setupHash(c.token, o)) { ENSURE.done = true; return; }
  try { await setupBot(env, c.token, o); ENSURE.done = true; console.log('bot setup done'); }
  catch (e) { console.error('bot setup failed', e.message); }
}
