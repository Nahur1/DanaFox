/* shared helpers: D1 access, JSON responses, errors */
export class ApiError extends Error {
  constructor(status, code, extra) { super(code); this.status = status; this.code = code; this.extra = extra || {}; }
}
export const now = () => Date.now();
const clean = a => a.map(x => (x === undefined ? null : typeof x === 'boolean' ? (x ? 1 : 0) : x));
export const q = (env, sql, ...a) => env.DB.prepare(sql).bind(...clean(a));
export const one = (env, sql, ...a) => q(env, sql, ...a).first();
export const all = async (env, sql, ...a) => (await q(env, sql, ...a).all()).results || [];
export const run = (env, sql, ...a) => q(env, sql, ...a).run();
export const json = (data, status = 200, headers = {}) =>
  new Response(JSON.stringify(data ?? { ok: true }), { status, headers: { 'Content-Type': 'application/json; charset=utf-8', ...headers } });
export const int = (x, d = 0) => { const n = parseInt(x, 10); return Number.isFinite(n) ? n : d; };
export const num = (x, d = 0) => { const n = parseFloat(x); return Number.isFinite(n) ? n : d; };
export const str = (x, n = 2000) => String(x ?? '').slice(0, n);
export async function body(req) {
  try { const d = await req.json(); if (d && typeof d === 'object') return d; } catch (e) {}
  throw new ApiError(400, 'bad_json');
}
export async function meta(env, key, def = null) { const r = await one(env, 'SELECT value FROM meta WHERE key=?', key); return r ? r.value : def; }
export const setMeta = (env, key, value) => run(env, 'INSERT OR REPLACE INTO meta(key,value) VALUES(?,?)', key, String(value));
export const bumpWords = env => setMeta(env, 'words_version', now());

/* admins = Telegram numeric ids listed in ADMIN_TG_IDS, or e-mails listed in ADMIN_EMAILS (nothing else grants admin rights) */
export const adminIds = env => String(env.ADMIN_TG_IDS || '').split(/[\s,;]+/).map(x => parseInt(x, 10)).filter(x => Number.isFinite(x) && x > 0);
export const isAdminTg = (env, id) => !!id && adminIds(env).includes(Number(id));
/* …or site accounts whose (lower-case) e-mail is listed in ADMIN_EMAILS */
export const adminEmails = env => String(env.ADMIN_EMAILS || '').toLowerCase().split(/[\s,;]+/).filter(x => x.includes('@'));
export const isAdminEmail = (env, email) => !!email && adminEmails(env).includes(String(email).toLowerCase());
export const isAdminUser = (env, u) => !!u && (isAdminTg(env, u.telegram_id) || isAdminEmail(env, u.email));
export const clientIp = req => req.headers.get('CF-Connecting-IP') || req.headers.get('X-Forwarded-For') || '';
/* calendar day in Tehran (UTC+3:30) — used for admin statistics */
export const tehranDay = (t = Date.now()) => new Date(t + 12600000).toISOString().slice(0, 10);
export const tehranMidnight = (t = Date.now()) => Date.parse(tehranDay(t) + 'T00:00:00Z') - 12600000;
