/* HTTP API for the apps: accounts, word bank, sync, Telegram linking (admin API lives in admin.js) */
import { ApiError, json, one, run, now, int, body, meta, clientIp } from './util.js';
import { hashPassword, verifyPassword, newCode, parseLogin, passwordError, verifyInitData } from './security.js';
import * as W from './words.js';
import * as S from './sync.js';
import { botToken, botUsername } from './bot/telegram.js';
import { route } from './router.js';
import { publicUser, currentUser, startSession, checkCredentials, telegramUser } from './auth.js';
import { getSettings } from './settings.js';

export const VERSION = '3.1.0';

/* ---------- handlers ---------- */

route('GET', '/api/config', async (env) => {
  const bot = await botUsername(env), s = await getSettings(env);
  return { app: env.APP_NAME || 'VajeYar', version: VERSION, registration: s.registration, guest: s.guest,
    words_version: await meta(env, 'words_version', '0'), telegram: bot ? { bot } : null,
    notice: s.notice ? { text: s.notice, level: s.notice_level } : null, maintenance: s.maintenance ? (s.maintenance_msg || true) : null,
    readings_version: await meta(env, 'readings_version', '0'), features: { duel: true, leaderboard: true, feedback: true, ai: !!env.AI, translate: true } };
});

route('POST', '/api/auth/register', async (env, req) => {
  if (!(await getSettings(env)).registration) throw new ApiError(403, 'registration_closed');
  const d = await body(req), [kind, value] = parseLogin(d.login);
  if (!kind) throw new ApiError(400, value);
  const pe = passwordError(d.password); if (pe) throw new ApiError(400, pe);
  if (await one(env, `SELECT id FROM users WHERE ${kind}=?`, value)) throw new ApiError(409, 'already_registered');
  const name = String(d.name || '').split(/\s+/).filter(Boolean).join(' ').slice(0, 60);
  const r = await one(env, `INSERT INTO users(${kind},password_hash,display_name,created_at) VALUES(?,?,?,?) RETURNING id`, value, await hashPassword(d.password), name, now());
  return [await startSession(env, req, r.id), 201];
});

route('POST', '/api/auth/login', async (env, req) => {
  const d = await body(req), u = await checkCredentials(env, req, d.login, d.password);
  if (u.blocked) throw new ApiError(403, 'account_blocked');
  return startSession(env, req, u.id);
});

route('POST', '/api/auth/logout', async (env, req) => {
  const u = await currentUser(env, req);
  await run(env, 'DELETE FROM sessions WHERE token_hash=?', u._th);
  return { ok: true };
});

/* Telegram Mini App: sign in with the Telegram account (same account the bot uses) */
route('POST', '/api/auth/telegram', async (env, req) => {
  const d = await body(req), tu = await verifyInitData(d.initData, await botToken(env));
  if (!tu || !tu.id) throw new ApiError(401, 'bad_telegram_data');
  const u = await telegramUser(env, tu);
  if (u.blocked) throw new ApiError(403, 'account_blocked');
  return startSession(env, req, u.id);
});
/* Method A — inside the Mini App: sign in with the site account (email/mobile + password) and link this Telegram to it.
   The Telegram-only data (bot progress) is merged into the site account, then the Telegram-only account is removed. */
route('POST', '/api/auth/telegram/link', async (env, req) => {
  const d = await body(req), tu = await verifyInitData(d.initData, await botToken(env), 86400);
  if (!tu || !tu.id) throw new ApiError(401, 'bad_telegram_data');
  const web = await checkCredentials(env, req, d.login, d.password);
  if (web.blocked) throw new ApiError(403, 'account_blocked');
  if (web.telegram_id && +web.telegram_id === +tu.id) return startSession(env, req, web.id);           // already linked to this Telegram
  if (web.telegram_id) throw new ApiError(409, 'already_linked');                                      // linked to another Telegram account
  const tgu = await one(env, 'SELECT * FROM users WHERE telegram_id=?', tu.id);
  if (tgu && (tgu.email || tgu.phone)) throw new ApiError(409, 'telegram_linked_other');              // this Telegram belongs to another site account
  if (tgu && tgu.blocked) throw new ApiError(403, 'account_blocked');
  let merged = false;
  if (tgu) {
    const c = await one(env, 'SELECT (SELECT COUNT(*) FROM user_progress WHERE user_id=?1) + (SELECT COUNT(*) FROM user_custom_words WHERE user_id=?1) c', tgu.id);
    merged = c.c > 0;
    await S.mergeAccounts(env, tgu.id, web.id);
  }
  const name = [tu.first_name, tu.last_name].filter(Boolean).join(' ').slice(0, 60);
  await run(env, 'UPDATE users SET telegram_id=?, tg_username=?, tg_name=?, last_bot_at=COALESCE(last_bot_at, ?) WHERE id=?', tu.id, tu.username || null, name, tgu ? tgu.last_bot_at : null, web.id);
  await run(env, 'DELETE FROM bot_state WHERE user_id=?', web.id);
  return { ...(await startSession(env, req, web.id)), merged };
});
/* one-time sign-in link created by the bot (“Open on the web”) */
route('POST', '/api/auth/code', async (env, req) => {
  const d = await body(req), code = String(d.code || '').toUpperCase().slice(0, 20);
  const c = await one(env, "DELETE FROM auth_codes WHERE code=? AND kind='login' RETURNING user_id, expires_at", code);
  if (!c || c.expires_at < now()) throw new ApiError(400, 'bad_code');
  return startSession(env, req, c.user_id);
});

route('GET', '/api/me', async (env, req) => {
  const u = await currentUser(env, req);
  const s = await one(env, 'SELECT xp, learned, mastered, total_reviews, last_active_day, best_streak FROM v_user_summary WHERE id=?', u.id);
  return { user: publicUser(u), summary: s };
});
route('PUT', '/api/me', async (env, req) => {
  const u = await currentUser(env, req), d = await body(req);
  if ('name' in d) await run(env, 'UPDATE users SET display_name=? WHERE id=?', String(d.name).split(/\s+/).filter(Boolean).join(' ').slice(0, 60), u.id);
  if (d.login) {             // add / change email or mobile (Telegram-only accounts can add a web login this way)
    const [kind, value] = parseLogin(d.login); if (!kind) throw new ApiError(400, value);
    const other = await one(env, `SELECT id FROM users WHERE ${kind}=?`, value);
    if (other && other.id !== u.id) throw new ApiError(409, 'already_registered');
    if (u.password_hash && !(await verifyPassword(String(d.password || ''), u.password_hash))) throw new ApiError(401, 'wrong_credentials');
    await run(env, `UPDATE users SET ${kind}=? WHERE id=?`, value, u.id);
  }
  if (d.new_password) {
    if (u.password_hash && !(await verifyPassword(String(d.password || ''), u.password_hash))) throw new ApiError(401, 'wrong_credentials');
    const pe = passwordError(d.new_password); if (pe) throw new ApiError(400, pe);
    const fresh = await one(env, 'SELECT email, phone FROM users WHERE id=?', u.id);
    if (!fresh.email && !fresh.phone) throw new ApiError(400, 'login_required');
    await run(env, 'UPDATE users SET password_hash=? WHERE id=?', await hashPassword(d.new_password), u.id);
    await run(env, 'DELETE FROM sessions WHERE user_id=? AND token_hash<>?', u.id, u._th);
  }
  return { user: publicUser(await one(env, 'SELECT * FROM users WHERE id=?', u.id)) };
});
route('POST', '/api/me/reset', async (env, req) => { const u = await currentUser(env, req); await S.wipe(env, u.id); return { ok: true }; });
route('POST', '/api/me/delete', async (env, req) => {
  const u = await currentUser(env, req), d = await body(req);
  if (u.password_hash ? !(await verifyPassword(String(d.password || ''), u.password_hash)) : d.confirm !== true) throw new ApiError(401, 'wrong_credentials');
  await run(env, 'DELETE FROM users WHERE id=?', u.id);
  return { ok: true };
});
/* connect this web account with Telegram: returns a t.me deep link, the bot finishes the link */
route('POST', '/api/me/telegram', async (env, req) => {
  const u = await currentUser(env, req), bot = await botUsername(env);
  if (!bot) throw new ApiError(400, 'telegram_not_configured');
  const code = newCode(10);
  await run(env, "DELETE FROM auth_codes WHERE user_id=? AND kind='link'", u.id);
  await run(env, "INSERT INTO auth_codes(code,kind,user_id,expires_at) VALUES(?,'link',?,?)", code, u.id, now() + 15 * 60000);
  return { code, url: `https://t.me/${bot}?start=link_${code}`, expires_in: 900 };
});
route('DELETE', '/api/me/telegram', async (env, req) => {
  const u = await currentUser(env, req);
  if (!u.email && !u.phone) throw new ApiError(400, 'login_required');
  await run(env, 'UPDATE users SET telegram_id=NULL, tg_username=NULL, tg_name=NULL WHERE id=?', u.id);
  return { user: publicUser(await one(env, 'SELECT * FROM users WHERE id=?', u.id)) };
});

route('GET', '/api/words', async (env, req) => {
  const ver = await meta(env, 'words_version', '0'), etag = `"w${ver}"`;
  if (req.headers.get('If-None-Match') === etag) return new Response(null, { status: 304, headers: { ETag: etag } });
  return json({ version: ver, categories: await W.categories(env), words: await W.publicWords(env) }, 200, { ETag: etag, 'Cache-Control': 'no-cache' });
});
route('POST', '/api/sync', async (env, req) => {
  const u = await currentUser(env, req), d = await body(req);
  return S.sync(env, u.id, d.since, d.changes || {});
});

/* Pronunciation audio: the same Google TTS engine the bot's voice messages use.
   Telegram's Android WebView exposes no speechSynthesis, so the web app cannot rely on the device engine. */
route('GET', '/api/tts', async (env, req, g, url) => {
  const text = String(url.searchParams.get('text') || '').replace(/\s+/g, ' ').trim().slice(0, 190);
  if (!text || !/[A-Za-z]/.test(text)) throw new ApiError(400, 'bad_text');
  const host = url.searchParams.get('accent') === 'en-GB' ? 'translate.google.co.uk' : 'translate.google.com';
  const up = `https://${host}/translate_tts?ie=UTF-8&client=tw-ob&tl=en&ttsspeed=` +
    (parseFloat(url.searchParams.get('rate')) < 0.9 ? '0.3' : '1') + '&q=' + encodeURIComponent(text);
  let r;
  try { r = await fetch(up, { headers: { 'User-Agent': 'Mozilla/5.0', Referer: `https://${host}/` } }); }
  catch (e) { throw new ApiError(502, 'tts_unavailable'); }
  if (!r.ok) throw new ApiError(502, 'tts_unavailable');
  const mp3 = await r.arrayBuffer();
  if (!mp3.byteLength) throw new ApiError(502, 'tts_unavailable');
  return new Response(mp3, { headers: {
    'Content-Type': 'audio/mpeg',
    'Cache-Control': 'public, max-age=604800',
  } });
});

/* quick English → Persian translation for words tapped in reading passages that are not in the word bank */
route('GET', '/api/translate', async (env, req, g, url) => {
  const text = String(url.searchParams.get('q') || '').replace(/\s+/g, ' ').trim().slice(0, 120);
  if (!text || !/[A-Za-z]/.test(text)) throw new ApiError(400, 'bad_text');
  let fa = '', alts = [], via = '';
  try {
    const r = await fetch('https://translate.googleapis.com/translate_a/single?client=gtx&sl=en&tl=fa&dt=t&dt=bd&q=' + encodeURIComponent(text), { headers: { 'User-Agent': 'Mozilla/5.0' } });
    const j = r.ok ? await r.json().catch(() => null) : null;
    if (j) { fa = (j[0] || []).map(x => x && x[0]).filter(Boolean).join(''); alts = (j[1] || []).map(b => ({ pos: b[0], terms: (b[1] || []).slice(0, 5) })).filter(b => b.terms.length).slice(0, 3); via = 'g'; }
  } catch (e) { /* try the next provider */ }
  if (!fa && env.AI) {
    try { const o = await env.AI.run('@cf/meta/m2m100-1.2b', { text, source_lang: 'en', target_lang: 'fa' }); fa = String((o && o.translated_text) || '').trim(); if (fa) via = 'ai'; } catch (e) { /* no Workers AI */ }
  }
  if (!fa) {
    try {
      const r = await fetch('https://api.mymemory.translated.net/get?langpair=en|fa&q=' + encodeURIComponent(text));
      const j = r.ok ? await r.json().catch(() => null) : null;
      const tr = j && j.responseData && j.responseData.translatedText;
      if (tr && !/MYMEMORY|INVALID/i.test(tr)) { fa = String(tr).trim(); via = 'mm'; }
    } catch (e) { /* offline */ }
  }
  if (!fa) throw new ApiError(502, 'translate_unavailable');
  return json({ text, fa, alts, via }, 200, { 'Cache-Control': 'public, max-age=604800' });
});
