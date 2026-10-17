/* sessions, current user, credentials check, admin guard and audit log */
import { ApiError, one, run, now, int, isAdminUser, clientIp } from './util.js';
import { sha256, newToken, parseLogin, verifyPassword, isBlocked, failAttempt, clearAttempts } from './security.js';

const DAY = 86400000;
export const ADMIN_SESSION_MS = 12 * 3600000;      // admin-panel sessions expire after 12 hours, no matter what

export function publicUser(u) {
  return { id: u.id, email: u.email, phone: u.phone, name: u.display_name, username: u.username || null, has_password: !!u.password_hash,
    telegram: u.telegram_id ? { id: u.telegram_id, username: u.tg_username, name: u.tg_name } : null };
}

async function sessionUser(env, req) {
  const h = req.headers.get('Authorization') || '';
  const tok = h.startsWith('Bearer ') ? h.slice(7).trim() : '';
  if (!tok || tok.length > 200) return null;
  const th = await sha256(tok);
  const u = await one(env, `SELECT u.*, s.token_hash AS _th, s.last_seen_at AS _seen, s.created_at AS _created, s.expires_at AS _expires, s.is_admin AS _adm
    FROM sessions s JOIN users u ON u.id=s.user_id WHERE s.token_hash=? AND s.expires_at>?`, th, now());
  if (u && now() - u._seen > (u._adm ? 300000 : 3600000)) await run(env, 'UPDATE sessions SET last_seen_at=? WHERE token_hash=?', now(), th);
  return u;
}
export async function currentUser(env, req, { required = true } = {}) {
  const u = await sessionUser(env, req);
  if (!u && required) throw new ApiError(401, 'unauthorized');
  if (u && u.blocked) throw new ApiError(403, 'account_blocked');
  return u;
}
/** admin guard: an admin-panel session (is_admin=1, younger than 12h) of a user whose Telegram id is in ADMIN_TG_IDS or e-mail in ADMIN_EMAILS */
export async function requireAdmin(env, req) {
  const u = await sessionUser(env, req);
  if (!u || !u._adm) throw new ApiError(401, 'unauthorized');
  if (now() - u._created > ADMIN_SESSION_MS) { await run(env, 'DELETE FROM sessions WHERE token_hash=?', u._th); throw new ApiError(401, 'session_expired'); }
  if (!isAdminUser(env, u)) { await run(env, 'DELETE FROM sessions WHERE token_hash=?', u._th); throw new ApiError(403, 'forbidden'); }
  u._req = req;
  return u;
}

export async function startSession(env, req, uid, { admin = false } = {}) {
  const tok = newToken(), t = now();
  await env.DB.batch([
    env.DB.prepare('INSERT INTO sessions(token_hash,user_id,created_at,last_seen_at,expires_at,user_agent,is_admin,ip) VALUES(?,?,?,?,?,?,?,?)')
      .bind(await sha256(tok), uid, t, t, t + (admin ? ADMIN_SESSION_MS : int(env.SESSION_DAYS, 90) * DAY), (req.headers.get('User-Agent') || '').slice(0, 200), admin ? 1 : 0, clientIp(req).slice(0, 64)),
    env.DB.prepare('UPDATE users SET last_login_at=? WHERE id=?').bind(t, uid),
  ]);
  const res = { token: tok, user: publicUser(await one(env, 'SELECT * FROM users WHERE id=?', uid)) };
  if (admin) res.expires_at = t + ADMIN_SESSION_MS;
  return res;
}

/** email/mobile + password check with rate limiting (8 failures per IP or per login → 10 minutes block) */
export async function checkCredentials(env, req, login, password, scope = '') {
  const [kind, value] = parseLogin(login), ip = clientIp(req) || 'x';
  if (await isBlocked(env, scope + 'ip:' + ip) || (kind && await isBlocked(env, scope + 'id:' + value))) throw new ApiError(429, 'too_many_attempts');
  if (!kind) throw new ApiError(400, value);
  const u = await one(env, `SELECT * FROM users WHERE ${kind}=?`, value);
  if (!u || !(await verifyPassword(String(password || ''), u.password_hash))) {
    await failAttempt(env, scope + 'ip:' + ip); await failAttempt(env, scope + 'id:' + value);
    throw new ApiError(401, 'wrong_credentials');
  }
  await clearAttempts(env, scope + 'id:' + value);
  return u;
}

/** the account used by the bot and the Mini App for a Telegram user (created on first contact) */
export async function telegramUser(env, tu) {
  let u = await one(env, 'SELECT * FROM users WHERE telegram_id=?', tu.id);
  const name = [tu.first_name, tu.last_name].filter(Boolean).join(' ').slice(0, 60);
  if (!u) u = await one(env, 'INSERT INTO users(telegram_id,tg_username,tg_name,display_name,created_at) VALUES(?,?,?,?,?) RETURNING *', tu.id, tu.username || null, name, name, now());
  else if (u.tg_username !== (tu.username || null) || u.tg_name !== name) { await run(env, 'UPDATE users SET tg_username=?, tg_name=? WHERE id=?', tu.username || null, name, u.id); u.tg_username = tu.username || null; u.tg_name = name; }
  return u;
}

/** admin audit log */
export async function audit(env, req, admin, action, details = '') {
  const d = typeof details === 'string' ? details : JSON.stringify(details);
  await run(env, 'INSERT INTO admin_log(at,admin_id,tg_id,action,details,ip,ua) VALUES(?,?,?,?,?,?,?)', now(), admin ? admin.id : null, admin ? admin.telegram_id : null,
    action, d.slice(0, 1000), clientIp(req).slice(0, 64), (req.headers.get('User-Agent') || '').slice(0, 200)).catch(e => console.error('audit', e.message));
}
