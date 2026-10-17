/* Admin API — only for the Telegram ids in ADMIN_TG_IDS, only with short-lived admin sessions, every change is audited */
import { ApiError, one, all, run, now, int, body, isAdminTg, isAdminUser, adminIds, adminEmails, tehranDay, tehranMidnight, clientIp } from './util.js';
import { hashPassword, passwordError, verifyInitData, newCode, isBlocked, failAttempt } from './security.js';
import * as W from './words.js';
import * as S from './sync.js';
import { route } from './router.js';
import { requireAdmin, startSession, checkCredentials, telegramUser, audit, publicUser, ADMIN_SESSION_MS } from './auth.js';
import { botToken, botUsername, botInfo, setupBot, tg, publicOrigin, tokenFromEnv } from './bot/telegram.js';
import { getSettings, saveSettings } from './settings.js';
import { AUDIENCES, audienceCounts, audienceWhere, broadcastStep, messageFor } from './broadcast.js';

const DAY = 86400000;

/* ---------- sign-in ---------- */
async function denied(env, req, what, details) {
  await failAttempt(env, 'adm:' + (clientIp(req) || 'x'));
  await audit(env, req, null, 'denied_' + what, details);
  return new ApiError(403, 'forbidden');
}
async function guardIp(env, req) { if (await isBlocked(env, 'adm:' + (clientIp(req) || 'x'))) throw new ApiError(429, 'too_many_attempts'); }

/* 1) inside the Telegram Mini App (/admin/?tg=1): signed initData, max 2 hours old */
route('POST', '/api/admin/auth/telegram', async (env, req) => {
  await guardIp(env, req);
  const d = await body(req), tu = await verifyInitData(d.initData, await botToken(env), 7200);
  if (!tu || !tu.id) throw await denied(env, req, 'telegram', 'bad initData');
  const linked = await one(env, 'SELECT * FROM users WHERE telegram_id=?', tu.id);
  if (!isAdminTg(env, tu.id) && !isAdminUser(env, linked)) throw await denied(env, req, 'telegram', { tg: tu.id, username: tu.username || null });
  const u = await telegramUser(env, tu);
  const res = await startSession(env, req, u.id, { admin: true });
  await audit(env, req, u, 'login', 'telegram mini app');
  return res;
});
/* 2) one-time browser link from the bot's /admin command (5 minutes) */
route('POST', '/api/admin/auth/code', async (env, req) => {
  await guardIp(env, req);
  const d = await body(req), code = String(d.code || '').toUpperCase().replace(/[^A-Z0-9]/g, '').slice(0, 32);
  const c = code && await one(env, "DELETE FROM auth_codes WHERE code=? AND kind='admin' RETURNING user_id, expires_at", code);
  const u = c && c.expires_at > now() && await one(env, 'SELECT * FROM users WHERE id=?', c.user_id);
  if (!u || !isAdminUser(env, u)) throw await denied(env, req, 'code', 'bad or expired code');
  const res = await startSession(env, req, u.id, { admin: true });
  await audit(env, req, u, 'login', 'one-time link from the bot');
  return res;
});
/* 3) password — only for a site account linked to an admin Telegram id or whose e-mail is in ADMIN_EMAILS */
route('POST', '/api/admin/auth/login', async (env, req) => {
  await guardIp(env, req);
  const d = await body(req), u = await checkCredentials(env, req, d.login, d.password, 'adm');
  if (!isAdminUser(env, u)) throw await denied(env, req, 'password', { user: u.id });
  const res = await startSession(env, req, u.id, { admin: true });
  await audit(env, req, u, 'login', 'password');
  return res;
});
route('POST', '/api/admin/auth/logout', async (env, req) => {
  const a = await requireAdmin(env, req);
  await run(env, 'DELETE FROM sessions WHERE token_hash=?', a._th);
  await audit(env, req, a, 'logout');
  return { ok: true };
});
route('GET', '/api/admin/me', async (env, req) => {
  const a = await requireAdmin(env, req);
  return { user: publicUser(a), expires_at: a._created + ADMIN_SESSION_MS, bot: await botUsername(env), origin: await publicOrigin(env) || new URL(req.url).origin };
});

/* ---------- dashboard ---------- */
const c = async (env, sql, ...a) => (await one(env, sql, ...a)).c;
route('GET', '/api/admin/dashboard', async (env, req) => {
  await requireAdmin(env, req);
  const t0 = tehranMidnight(), today = tehranDay(), d6 = tehranDay(now() - 6 * DAY), d29 = tehranDay(now() - 29 * DAY);
  const [k] = await Promise.all([one(env, `SELECT COUNT(*) users,
      SUM(created_at >= ?1) new_today, SUM(created_at >= ?2) new_7d, SUM(created_at >= ?3) new_30d,
      SUM(telegram_id IS NOT NULL) tg, SUM(email IS NOT NULL OR phone IS NOT NULL) web,
      SUM(telegram_id IS NOT NULL AND (email IS NOT NULL OR phone IS NOT NULL)) linked,
      SUM(blocked=1) blocked, SUM(blocked_bot=1) blocked_bot FROM users`, t0, t0 - 6 * DAY, t0 - 29 * DAY)]);
  const act = await one(env, `SELECT COUNT(DISTINCT CASE WHEN day=?1 THEN user_id END) today, COUNT(DISTINCT CASE WHEN day>=?2 THEN user_id END) d7,
      COUNT(DISTINCT user_id) d30, COALESCE(SUM(CASE WHEN day=?1 THEN reviews END),0) reviews_today, COALESCE(SUM(reviews),0) reviews_30d
      FROM user_daily_activity WHERE day>=?3`, today, d6, d29);
  const daily = await all(env, `SELECT day, COUNT(DISTINCT user_id) users, SUM(reviews) reviews, SUM(new_words) new_words, SUM(xp) xp
      FROM user_daily_activity WHERE day>=? GROUP BY day ORDER BY day`, d29);
  const signups = await all(env, `SELECT date((created_at + 12600000)/1000, 'unixepoch') day, COUNT(*) n,
      SUM(telegram_id IS NOT NULL AND email IS NULL AND phone IS NULL) tg FROM users WHERE created_at >= ? GROUP BY day ORDER BY day`, t0 - 29 * DAY);
  const top = await all(env, `SELECT u.id, COALESCE(u.display_name, '') name, COALESCE(u.email, u.phone, CASE WHEN u.tg_username IS NOT NULL THEN '@'||u.tg_username END, 'tg:'||u.telegram_id) login,
      COALESCE(p.xp,0) xp, COALESCE(p.streak_count,0) streak, (SELECT COUNT(*) FROM user_progress g WHERE g.user_id=u.id AND g.seen=1 AND g.deleted=0) learned
      FROM users u LEFT JOIN user_profile p ON p.user_id=u.id ORDER BY xp DESC LIMIT 8`);
  const recent = await all(env, `SELECT id, display_name name, email, phone, telegram_id, tg_username, created_at FROM users ORDER BY id DESC LIMIT 8`);
  return {
    kpi: { ...k, ...Object.fromEntries(Object.entries(k).map(([a, b]) => [a, b || 0])), tg_only: (k.tg || 0) - (k.linked || 0), web_only: (k.web || 0) - (k.linked || 0),
      active_today: act.today, active_7d: act.d7, active_30d: act.d30, reviews_today: act.reviews_today, reviews_30d: act.reviews_30d,
      reviews: await c(env, 'SELECT COALESCE(SUM(reviews),0) c FROM user_daily_activity'),
      learned: await c(env, 'SELECT COUNT(*) c FROM user_progress WHERE seen=1 AND deleted=0'),
      mastered: await c(env, 'SELECT COUNT(*) c FROM user_progress WHERE seen=1 AND deleted=0 AND interval_days>=21'),
      words: await c(env, 'SELECT COUNT(*) c FROM words WHERE is_active=1'),
      custom_words: await c(env, 'SELECT COUNT(*) c FROM user_custom_words WHERE deleted=0'),
      quizzes: await c(env, 'SELECT COUNT(*) c FROM quiz_results'),
      broadcasts_running: await c(env, "SELECT COUNT(*) c FROM broadcasts WHERE status='running'") },
    daily, signups, top, recent, categories: await W.categories(env), bot: await botUsername(env), today,
  };
});

/* ---------- users ---------- */
const USER_COLS = `u.id, u.email, u.phone, u.telegram_id, u.tg_username, u.tg_name, u.display_name, u.blocked, u.blocked_bot, u.created_at, u.last_login_at, u.last_sync_at, u.last_bot_at,
  u.password_hash IS NOT NULL has_password, COALESCE(p.xp,0) xp, COALESCE(p.streak_count,0) streak, COALESCE(p.streak_best,0) best_streak,
  (SELECT COUNT(*) FROM user_progress g WHERE g.user_id=u.id AND g.seen=1 AND g.deleted=0) learned,
  (SELECT MAX(day) FROM user_daily_activity d WHERE d.user_id=u.id) last_day`;
const FILTERS = {
  web: 'u.telegram_id IS NULL', tg: 'u.email IS NULL AND u.phone IS NULL', linked: 'u.telegram_id IS NOT NULL AND (u.email IS NOT NULL OR u.phone IS NOT NULL)',
  telegram: 'u.telegram_id IS NOT NULL', blocked: 'u.blocked=1', bot_blocked: 'u.blocked_bot=1',
  active7: `EXISTS (SELECT 1 FROM user_daily_activity d WHERE d.user_id=u.id AND d.day>=?2)`,
  inactive: `NOT EXISTS (SELECT 1 FROM user_daily_activity d WHERE d.user_id=u.id AND d.day>=?2)`,
  new7: 'u.created_at >= ?3',
};
const SORTS = { recent: 'MAX(COALESCE(u.last_login_at,0), COALESCE(u.last_bot_at,0), COALESCE(u.last_sync_at,0), u.created_at) DESC', new: 'u.id DESC', old: 'u.id ASC', xp: 'xp DESC', learned: 'learned DESC' };
route('GET', '/api/admin/users', async (env, req, p, url) => {
  await requireAdmin(env, req);
  const g = k => url.searchParams.get(k) || '';
  const s = g('q').trim().slice(0, 80), f = FILTERS[g('filter')], size = Math.min(100, Math.max(5, int(g('size'), 30))), page = Math.max(1, int(g('page'), 1));
  const where = ['?4 IS NOT NULL'];   // keeps the parameter count constant (D1 rejects unused bindings)
  if (s) where.push(`(u.email LIKE ?1 OR u.phone LIKE ?1 OR u.display_name LIKE ?1 OR u.tg_name LIKE ?1 OR u.tg_username LIKE ?1 OR CAST(u.telegram_id AS TEXT) LIKE ?1 OR CAST(u.id AS TEXT)=?4)`);
  if (f) where.push(f);
  const args = [`%${s.replace(/^@/, '')}%`, tehranDay(now() - 6 * DAY), tehranMidnight() - 6 * DAY, s];
  const W_ = where.join(' AND ');
  const total = (await one(env, `SELECT COUNT(*) c FROM users u WHERE ${W_}`, ...args)).c;
  const items = await all(env, `SELECT ${USER_COLS} FROM users u LEFT JOIN user_profile p ON p.user_id=u.id WHERE ${W_} ORDER BY ${SORTS[g('sort')] || SORTS.recent} LIMIT ${size} OFFSET ${(page - 1) * size}`, ...args);
  for (const it of items) it.is_admin = isAdminUser(env, it);
  return { items, total, page, size };
});
async function target(env, id) { const u = await one(env, 'SELECT * FROM users WHERE id=?', int(id)); if (!u) throw new ApiError(404, 'not_found'); return u; }
route('GET', '/api/admin/users/{id}', async (env, req, p) => {
  await requireAdmin(env, req);
  const u = await one(env, `SELECT ${USER_COLS}, COALESCE(p.settings_json,'{}') settings_json, COALESCE(p.onboarded,0) onboarded FROM users u LEFT JOIN user_profile p ON p.user_id=u.id WHERE u.id=?`, int(p.id));
  if (!u) throw new ApiError(404, 'not_found');
  let st = {}; try { st = JSON.parse(u.settings_json); } catch (e) {}
  delete u.settings_json;
  const stats = await one(env, `SELECT (SELECT COUNT(*) FROM user_progress WHERE user_id=?1 AND seen=1 AND deleted=0 AND interval_days>=21) mastered,
     (SELECT COUNT(*) FROM user_progress WHERE user_id=?1 AND seen=1 AND deleted=0 AND due_at<=?2) due,
     (SELECT COUNT(*) FROM user_progress WHERE user_id=?1 AND starred=1 AND deleted=0) starred,
     (SELECT COUNT(*) FROM user_custom_words WHERE user_id=?1 AND deleted=0) custom,
     (SELECT COALESCE(SUM(reviews),0) FROM user_daily_activity WHERE user_id=?1) reviews,
     (SELECT COUNT(*) FROM user_daily_activity WHERE user_id=?1) active_days,
     (SELECT COUNT(*) FROM quiz_results WHERE user_id=?1) quizzes,
     (SELECT ROUND(AVG(100.0*score/total)) FROM quiz_results WHERE user_id=?1 AND total>0) quiz_avg,
     (SELECT COUNT(*) FROM user_achievements WHERE user_id=?1) achievements,
     (SELECT COUNT(*) FROM sessions WHERE user_id=?1 AND expires_at>?2 AND is_admin=0) sessions`, u.id, now());
  const days = await all(env, 'SELECT day, reviews, new_words, xp FROM user_daily_activity WHERE user_id=? AND day>=? ORDER BY day', u.id, tehranDay(now() - 29 * DAY));
  const quizzes = await all(env, 'SELECT taken_at, score, total FROM quiz_results WHERE user_id=? ORDER BY taken_at DESC LIMIT 6', u.id);
  return { user: { ...u, is_admin: isAdminUser(env, u), lang: st.lang || 'fa', track: st.track || 'general', goal: st.goal || 20 }, stats, days, quizzes };
});
route('POST', '/api/admin/users/{id}/message', async (env, req, p) => {
  const a = await requireAdmin(env, req), u = await target(env, p.id), d = await body(req);
  const text = String(d.text || '').trim().slice(0, 4000);
  if (!text) throw new ApiError(400, 'required');
  if (!u.telegram_id) throw new ApiError(400, 'no_telegram');
  try { await tg(env, 'sendMessage', { chat_id: u.telegram_id, ...(await messageFor(env, { text, open_app: !!d.open_app })) }); }
  catch (e) {
    if (e.code === 403) { await run(env, 'UPDATE users SET blocked_bot=1 WHERE id=?', u.id); throw new ApiError(400, 'bot_blocked'); }
    throw new ApiError(400, 'telegram_error', e.message);
  }
  await audit(env, req, a, 'user.message', { user: u.id, chars: text.length });
  return { ok: true };
});
route('POST', '/api/admin/users/{id}/password', async (env, req, p) => {
  const a = await requireAdmin(env, req), u = await target(env, p.id), d = await body(req);
  const pe = passwordError(d.password); if (pe) throw new ApiError(400, pe);
  if (!u.email && !u.phone) throw new ApiError(400, 'login_required');
  await run(env, 'UPDATE users SET password_hash=? WHERE id=?', await hashPassword(d.password), u.id);
  await run(env, 'DELETE FROM sessions WHERE user_id=? AND is_admin=0', u.id);
  await audit(env, req, a, 'user.password', { user: u.id });
  return { ok: true };
});
route('POST', '/api/admin/users/{id}/logout', async (env, req, p) => {
  const a = await requireAdmin(env, req), u = await target(env, p.id);
  const r = await run(env, 'DELETE FROM sessions WHERE user_id=? AND is_admin=0', u.id);
  await audit(env, req, a, 'user.logout', { user: u.id });
  return { ok: true, removed: r.meta ? r.meta.changes : 0 };
});
route('POST', '/api/admin/users/{id}/block', async (env, req, p) => {
  const a = await requireAdmin(env, req), u = await target(env, p.id), d = await body(req);
  if (isAdminUser(env, u)) throw new ApiError(400, 'cannot_change_admin');
  await run(env, 'UPDATE users SET blocked=? WHERE id=?', d.blocked ? 1 : 0, u.id);
  if (d.blocked) await run(env, 'DELETE FROM sessions WHERE user_id=?', u.id);
  await audit(env, req, a, d.blocked ? 'user.block' : 'user.unblock', { user: u.id });
  return { ok: true };
});
route('POST', '/api/admin/users/{id}/reset', async (env, req, p) => {
  const a = await requireAdmin(env, req), u = await target(env, p.id);
  await S.wipe(env, u.id); await run(env, 'DELETE FROM bot_state WHERE user_id=?', u.id);
  await audit(env, req, a, 'user.reset', { user: u.id });
  return { ok: true };
});
route('DELETE', '/api/admin/users/{id}', async (env, req, p) => {
  const a = await requireAdmin(env, req), u = await target(env, p.id);
  if (isAdminUser(env, u)) throw new ApiError(400, 'cannot_change_admin');
  await run(env, 'DELETE FROM users WHERE id=?', u.id);
  await audit(env, req, a, 'user.delete', { user: u.id, login: u.email || u.phone || (u.telegram_id ? 'tg:' + u.telegram_id : '') });
  return { ok: true };
});
route('GET', '/api/admin/users.csv', async (env, req) => {
  const a = await requireAdmin(env, req), r = await usersCsv(env);
  await audit(env, req, a, 'users.export', { rows: r.n });
  return new Response(r.csv, { headers: { 'Content-Type': 'text/csv; charset=utf-8', 'Content-Disposition': 'attachment; filename=vajeyar-users.csv' } });
});

/* ---------- word bank ---------- */
route('GET', '/api/admin/categories', async (env, req) => { await requireAdmin(env, req); return { categories: await W.categories(env) }; });
route('GET', '/api/admin/words', async (env, req, p, url) => {
  await requireAdmin(env, req);
  const g = k => url.searchParams.get(k) || '';
  return W.searchWords(env, { q: g('q').trim(), cat: g('cat'), level: int(g('level')), status: g('status') || 'active', page: int(g('page'), 1), size: int(g('size'), 50) });
});
route('POST', '/api/admin/words', async (env, req) => {
  const a = await requireAdmin(env, req), w = await W.createWord(env, await body(req));
  await audit(env, req, a, 'word.create', { id: w.pk, word: w.word }); return [w, 201];
});
route('PUT', '/api/admin/words/{id}', async (env, req, p) => {
  const a = await requireAdmin(env, req), w = await W.updateWord(env, int(p.id), await body(req));
  await audit(env, req, a, 'word.update', { id: int(p.id), word: w && w.word }); return w;
});
route('DELETE', '/api/admin/words/{id}', async (env, req, p, url) => {
  const a = await requireAdmin(env, req), hard = url.searchParams.get('hard') === '1';
  if (!(await W.deleteWord(env, int(p.id), hard))) throw new ApiError(404, 'not_found');
  await audit(env, req, a, hard ? 'word.delete' : 'word.hide', { id: int(p.id) }); return { ok: true };
});
route('POST', '/api/admin/words/import', async (env, req) => {
  const a = await requireAdmin(env, req), d = await body(req);
  const r = await W.importText(env, d.text, d.cat || '', int(d.level, 1), d.update !== false);
  await audit(env, req, a, 'word.import', r); return r;
});
route('GET', '/api/admin/words/export.csv', async (env, req, p, url) => {
  await requireAdmin(env, req);
  return new Response(await W.exportCsv(env, url.searchParams.get('all') === '1'), { headers: { 'Content-Type': 'text/csv; charset=utf-8', 'Content-Disposition': 'attachment; filename=vajeyar-words.csv' } });
});

/* ---------- broadcasts ---------- */
function cleanBroadcast(d) {
  const text = String(d.text || '').trim().slice(0, 4000);
  if (!text) throw new ApiError(400, 'required');
  const url = String(d.button_url || '').trim();
  if (url && !/^https:\/\/[^\s]+$/i.test(url) && !/^tg:\/\/[^\s]+$/i.test(url)) throw new ApiError(400, 'bad_url');
  return { text, audience: AUDIENCES.includes(d.audience) ? d.audience : 'all', button_text: String(d.button_text || '').trim().slice(0, 64) || null, button_url: url || null, open_app: d.open_app ? 1 : 0 };
}
route('GET', '/api/admin/broadcasts', async (env, req) => {
  await requireAdmin(env, req);
  return { items: await all(env, 'SELECT * FROM broadcasts ORDER BY id DESC LIMIT 30'), audiences: await audienceCounts(env), bot: await botUsername(env) };
});
route('POST', '/api/admin/broadcasts', async (env, req) => {
  const a = await requireAdmin(env, req), d = await body(req), b = cleanBroadcast(d);
  if (!(await botToken(env))) throw new ApiError(400, 'telegram_not_configured');
  if (d.test) {
    try { await tg(env, 'sendMessage', { chat_id: a.telegram_id, ...(await messageFor(env, b)) }); }
    catch (e) { throw new ApiError(400, 'telegram_error', e.message); }
    return { ok: true, test: true };
  }
  const total = (await one(env, `SELECT COUNT(*) c FROM users u WHERE ${audienceWhere(b.audience)}`)).c;
  const r = await one(env, `INSERT INTO broadcasts(created_at,admin_id,text,button_text,button_url,open_app,audience,total,updated_at) VALUES(?,?,?,?,?,?,?,?,?) RETURNING *`,
    now(), a.id, b.text, b.button_text, b.button_url, b.open_app, b.audience, total, 0);
  await audit(env, req, a, 'broadcast.start', { id: r.id, audience: b.audience, total });
  return [r, 201];
});
route('POST', '/api/admin/broadcasts/{id}/step', async (env, req, p) => {
  await requireAdmin(env, req);
  const r = await broadcastStep(env, int(p.id), 25);
  if (!r) throw new ApiError(404, 'not_found');
  return r;
});
route('POST', '/api/admin/broadcasts/{id}/cancel', async (env, req, p) => {
  const a = await requireAdmin(env, req);
  await run(env, "UPDATE broadcasts SET status='cancelled', finished_at=?, updated_at=? WHERE id=? AND status='running'", now(), now(), int(p.id));
  await audit(env, req, a, 'broadcast.cancel', { id: int(p.id) });
  return one(env, 'SELECT * FROM broadcasts WHERE id=?', int(p.id));
});

/* ---------- Telegram bot ---------- */
route('GET', '/api/admin/telegram', async (env, req) => { await requireAdmin(env, req); return { ...(await botInfo(env)), admin_ids: adminIds(env) }; });
route('POST', '/api/admin/telegram/setup', async (env, req) => {
  const a = await requireAdmin(env, req), d = await body(req);
  const origin = env.PUBLIC_URL || new URL(req.url).origin;
  let token = await botToken(env), store = false;
  if (d.token) { if (tokenFromEnv(env)) throw new ApiError(400, 'token_in_secret'); token = String(d.token).trim(); store = true; }
  if (!token) throw new ApiError(400, 'telegram_not_configured');
  const r = await setupBot(env, token, origin, { store });
  await audit(env, req, a, 'telegram.setup', { bot: r.username, token_changed: store });
  return { ...r, admin_ids: adminIds(env) };
});

/* ---------- app settings ---------- */
route('GET', '/api/admin/settings', async (env, req) => { await requireAdmin(env, req); return getSettings(env, true); });
route('PUT', '/api/admin/settings', async (env, req) => {
  const a = await requireAdmin(env, req), d = await body(req), before = await getSettings(env, true);
  const s = await saveSettings(env, d);
  const changed = Object.keys(s).filter(k => s[k] !== before[k]);
  await audit(env, req, a, 'settings.update', changed.join(', '));
  return s;
});

/* ---------- security ---------- */
route('GET', '/api/admin/security', async (env, req, p, url) => {
  const a = await requireAdmin(env, req);
  const page = Math.max(1, int(url.searchParams.get('page'), 1)), act = (url.searchParams.get('action') || '').slice(0, 40);
  const where = act === 'denied' ? "action LIKE 'denied_%' AND ?1 IS NOT NULL" : act ? 'action LIKE ?1' : '?1 IS NOT NULL';
  const log = await all(env, `SELECT l.*, COALESCE(u.display_name, u.tg_username, '') admin_name FROM admin_log l LEFT JOIN users u ON u.id=l.admin_id WHERE ${where} ORDER BY l.id DESC LIMIT 40 OFFSET ${(page - 1) * 40}`, act + '%');
  const total = (await one(env, `SELECT COUNT(*) c FROM admin_log WHERE ${where}`, act + '%')).c;
  const sessions = (await all(env, 'SELECT token_hash, created_at, last_seen_at, expires_at, ip, user_agent FROM sessions WHERE is_admin=1 AND expires_at>? ORDER BY created_at DESC', now()))
    .map(s => ({ id: s.token_hash.slice(0, 16), current: s.token_hash === a._th, created_at: s.created_at, last_seen_at: s.last_seen_at, expires_at: Math.min(s.expires_at, s.created_at + ADMIN_SESSION_MS), ip: s.ip, ua: s.user_agent }));
  const denied24 = (await one(env, "SELECT COUNT(*) c FROM admin_log WHERE action LIKE 'denied_%' AND at>?", now() - DAY)).c;
  const blockedKeys = (await one(env, 'SELECT COUNT(*) c FROM login_attempts WHERE fails>=8 AND until>?', now())).c;
  return { log, total, page, sessions, denied24, blocked_keys: blockedKeys, admin_ids: adminIds(env), admin_emails: adminEmails(env), session_hours: ADMIN_SESSION_MS / 3600000 };
});
route('POST', '/api/admin/security/revoke', async (env, req) => {
  const a = await requireAdmin(env, req), d = await body(req);
  let r;
  if (d.id) r = await run(env, "DELETE FROM sessions WHERE is_admin=1 AND substr(token_hash,1,16)=? AND token_hash<>?", String(d.id).slice(0, 16), a._th);
  else r = await run(env, 'DELETE FROM sessions WHERE is_admin=1 AND token_hash<>?', a._th);
  await audit(env, req, a, 'security.revoke', d.id ? 'one session' : 'all other admin sessions');
  return { ok: true, removed: r.meta ? r.meta.changes : 0 };
});
route('POST', '/api/admin/security/unblock', async (env, req) => {
  const a = await requireAdmin(env, req);
  await run(env, 'DELETE FROM login_attempts');
  await audit(env, req, a, 'security.clear_rate_limits');
  return { ok: true };
});

/* ---------- exports sent as a file to the admin's Telegram chat (downloads don't work inside the Telegram webview) ---------- */
async function usersCsv(env) {
  const rows = await all(env, `SELECT ${USER_COLS} FROM users u LEFT JOIN user_profile p ON p.user_id=u.id ORDER BY u.id`);
  const cols = ['id', 'display_name', 'email', 'phone', 'telegram_id', 'tg_username', 'xp', 'learned', 'streak', 'blocked', 'created_at', 'last_day'];
  const q = v => { v = v == null ? '' : String(v); return /[",\n]/.test(v) ? `"${v.replace(/"/g, '""')}"` : v; };
  return { csv: '\ufeff' + [cols.join(','), ...rows.map(r => cols.map(k => q(k === 'created_at' ? new Date(r[k]).toISOString() : r[k])).join(','))].join('\n'), n: rows.length };
}
route('POST', '/api/admin/export/telegram', async (env, req) => {
  const a = await requireAdmin(env, req), d = await body(req);
  const kind = d.kind === 'words' ? 'words' : 'users';
  const csv = kind === 'words' ? await W.exportCsv(env, !!d.all) : (await usersCsv(env)).csv;
  const fd = new FormData();
  if (!a.telegram_id) throw new ApiError(400, 'no_telegram');
  fd.append('chat_id', String(a.telegram_id));
  fd.append('caption', kind === 'words' ? '📚 VajeYar — word bank export' : '👥 VajeYar — users export');
  fd.append('document', new Blob([csv], { type: 'text/csv' }), `vajeyar-${kind}-${tehranDay()}.csv`);
  try { await tg(env, 'sendDocument', fd); } catch (e) { throw new ApiError(400, 'telegram_error', e.message); }
  await audit(env, req, a, kind + '.export', 'sent to Telegram');
  return { ok: true };
});
