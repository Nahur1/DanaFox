/* DanaFox v3 user features: usernames, user search, leaderboards, language duels, reading passages, feedback, AI tutor */
import { ApiError, json, one, all, run, now, int, str, body, meta, setMeta, tehranDay, clientIp } from './util.js';
import { newCode, isBlocked, failAttempt } from './security.js';
import { route } from './router.js';
import { currentUser, publicUser } from './auth.js';
import { tg, publicOrigin } from './bot/telegram.js';

const DAY = 86400000;
const J = JSON.stringify;
const P = s => { try { return JSON.parse(s); } catch (e) { return null; } };
const nameOf = r => (r.display_name || '').split(' ')[0] || (r.username ? '@' + r.username : '') || (r.tg_name || '').split(' ')[0] || 'DanaFox #' + r.id;
const card = (r, rating) => ({ id: r.id, username: r.username || null, name: nameOf(r), rating: rating ?? r.rating ?? 1000 });

/* ---------- username ---------- */
export const USERNAME_RE = /^[a-z][a-z0-9_]{2,19}$/;
const RESERVED = new Set(['admin', 'administrator', 'vajeyar', 'support', 'root', 'system', 'bot', 'null', 'undefined', 'moderator']);
route('PUT', '/api/me/username', async (env, req) => {
  const u = await currentUser(env, req), d = await body(req);
  const un = String(d.username || '').trim().replace(/^@/, '').toLowerCase();
  if (!un) { await run(env, 'UPDATE users SET username=NULL WHERE id=?', u.id); return { user: publicUser({ ...u, username: null }) }; }
  if (!USERNAME_RE.test(un)) throw new ApiError(400, 'bad_username');
  if (RESERVED.has(un)) throw new ApiError(409, 'username_taken');
  const other = await one(env, 'SELECT id FROM users WHERE username=?', un);
  if (other && other.id !== u.id) throw new ApiError(409, 'username_taken');
  await run(env, 'UPDATE users SET username=? WHERE id=?', un, u.id);
  return { user: publicUser({ ...u, username: un }) };
});
route('GET', '/api/users/search', async (env, req, p, url) => {
  const u = await currentUser(env, req);
  const s = String(url.searchParams.get('q') || '').trim().replace(/^@/, '').toLowerCase().slice(0, 40);
  if (!s) return { items: [] };
  const id = /^#?\d+$/.test(s) ? int(s.replace('#', '')) : -1;
  const rows = await all(env, `SELECT u.id, u.username, u.display_name, u.tg_name, COALESCE(d.rating,1000) rating FROM users u LEFT JOIN duel_stats d ON d.user_id=u.id
    WHERE u.blocked=0 AND u.id<>?1 AND (u.id=?2 OR u.username LIKE ?3 OR (length(?4)>=3 AND u.display_name LIKE ?5))
    ORDER BY (u.id=?2) DESC, (u.username=?4) DESC, u.username IS NULL, rating DESC LIMIT 12`, u.id, id, s.replace(/[%_]/g, '') + '%', s, '%' + s.replace(/[%_]/g, '') + '%');
  return { items: rows.map(r => card(r)) };
});

/* ---------- leaderboards ---------- */
route('GET', '/api/leaderboard', async (env, req, p, url) => {
  const u = await currentUser(env, req, { required: false });
  const board = ['xp', 'week', 'duel'].includes(url.searchParams.get('board')) ? url.searchParams.get('board') : 'week';
  let rows;
  if (board === 'xp') rows = await all(env, `SELECT u.id, u.username, u.display_name, u.tg_name, p.xp score FROM user_profile p JOIN users u ON u.id=p.user_id WHERE u.blocked=0 AND p.xp>0 ORDER BY p.xp DESC LIMIT 50`);
  else if (board === 'week') rows = await all(env, `SELECT u.id, u.username, u.display_name, u.tg_name, SUM(a.xp) score FROM user_daily_activity a JOIN users u ON u.id=a.user_id
    WHERE u.blocked=0 AND a.day>=? GROUP BY u.id HAVING score>0 ORDER BY score DESC LIMIT 50`, tehranDay(now() - 6 * DAY));
  else rows = await all(env, `SELECT u.id, u.username, u.display_name, u.tg_name, d.rating score, d.wins, d.losses, d.draws FROM duel_stats d JOIN users u ON u.id=d.user_id
    WHERE u.blocked=0 AND (d.wins+d.losses+d.draws)>0 ORDER BY d.rating DESC LIMIT 50`);
  const items = rows.map((r, i) => ({ rank: i + 1, ...card(r), score: r.score || 0, me: !!u && r.id === u.id, ...(board === 'duel' ? { wins: r.wins, losses: r.losses, draws: r.draws } : {}) }));
  let mine = null;
  if (u && !items.some(x => x.me)) {
    let sc = 0, rank = null;
    if (board === 'xp') { sc = (await one(env, 'SELECT xp c FROM user_profile WHERE user_id=?', u.id) || { c: 0 }).c; rank = (await one(env, 'SELECT COUNT(*)+1 c FROM user_profile WHERE xp>?', sc)).c; }
    else if (board === 'week') { const d0 = tehranDay(now() - 6 * DAY); sc = (await one(env, 'SELECT COALESCE(SUM(xp),0) c FROM user_daily_activity WHERE user_id=? AND day>=?', u.id, d0)).c;
      rank = (await one(env, 'SELECT COUNT(*)+1 c FROM (SELECT user_id, SUM(xp) s FROM user_daily_activity WHERE day>=? GROUP BY user_id HAVING s>?)', d0, sc)).c; }
    else { sc = (await one(env, 'SELECT rating c FROM duel_stats WHERE user_id=?', u.id) || { c: 1000 }).c; rank = (await one(env, 'SELECT COUNT(*)+1 c FROM duel_stats WHERE rating>? AND (wins+losses+draws)>0', sc)).c; }
    mine = { rank, ...card({ ...u }), score: sc, me: true };
  }
  return { board, items, mine };
});

/* ---------- language duels ---------- */
const Q_MS = 15000;                       // time per question
const START_DELAY = 3500;                 // countdown before the first question
const WAIT_MS = 45000;                    // random match search
const INVITE_MS = DAY;                    // invitation lifetime
const CATS = ['mix', 'general', 'ielts', 'toefl', 'awl', 'cambridge', 'listening', 'ir0', 'ir1', 'ir2', 'vi1', 'vi2'];
const shuffle = a => { for (let i = a.length - 1; i > 0; i--) { const j = Math.floor(Math.random() * (i + 1)); [a[i], a[j]] = [a[j], a[i]]; } return a; };

async function makeQuestions(env, cat, level, n) {
  const pool = await all(env, `SELECT slug, word, meaning_fa fa, pos FROM words WHERE is_active=1 AND (?1='mix' OR category_id=?1) AND (?2=0 OR level_no=?2) ORDER BY RANDOM() LIMIT ?3`, cat, level, Math.max(60, n * 6));
  if (pool.length < n + 3) throw new ApiError(400, 'not_enough_words');
  const qs = [], pick = pool.slice(0, n), rest = pool;
  const shortFa = s => String(s).split(/[،,؛;]/)[0].trim().slice(0, 60);
  pick.forEach((w, i) => {
    const type = i % 2 ? 'fa' : 'en';
    const same = rest.filter(x => x.slug !== w.slug && x.pos === w.pos), other = rest.filter(x => x.slug !== w.slug && x.pos !== w.pos);
    const ds = shuffle(same.slice()).concat(shuffle(other.slice())).filter((x, k, arr) => (type === 'en' ? shortFa(x.fa) !== shortFa(w.fa) : x.word !== w.word) &&
      arr.findIndex(y => (type === 'en' ? shortFa(y.fa) === shortFa(x.fa) : y.word === x.word)) === k).slice(0, 3);
    const opts = shuffle([w, ...ds]);
    qs.push({ s: w.slug, t: type, q: type === 'en' ? w.word : shortFa(w.fa), o: opts.map(x => (type === 'en' ? shortFa(x.fa) : x.word)), a: opts.indexOf(w) });
  });
  return qs;
}
const ratingOf = async (env, uid) => (await one(env, 'SELECT rating FROM duel_stats WHERE user_id=?', uid) || { rating: 1000 }).rating;
const points = (ok, ms) => (ok ? 10 + Math.max(0, Math.round((Q_MS - Math.min(Q_MS, ms)) / 1500)) : 0);

async function finalize(env, d) {
  if (d.status !== 'active') return d;
  const aa = P(d.a_answers) || [], bb = P(d.b_answers) || [];
  const end = d.started_at + d.n * (Q_MS + 2500) + 20000;
  if (!(d.a_done && d.b_done) && now() < end) return d;
  const winner = d.a_score === d.b_score ? (d.a_ms === d.b_ms || !aa.length || !bb.length ? null : d.a_ms < d.b_ms ? d.a_id : d.b_id) : d.a_score > d.b_score ? d.a_id : d.b_id;
  const ra = await ratingOf(env, d.a_id), rb = await ratingOf(env, d.b_id);
  const ea = 1 / (1 + 10 ** ((rb - ra) / 400)), sa = winner == null ? 0.5 : winner === d.a_id ? 1 : 0;
  const da = Math.round(32 * (sa - ea)), db = -da;
  const res = await run(env, `UPDATE duels SET status='done', winner_id=?, a_delta=?, b_delta=?, finished_at=?, updated_at=?, a_done=1, b_done=1 WHERE id=? AND status='active'`, winner, da, db, now(), now(), d.id);
  if (!res.meta || !res.meta.changes) return one(env, 'SELECT * FROM duels WHERE id=?', d.id);     // someone else finished it
  const up = (uid, delta, s) => env.DB.prepare(`INSERT INTO duel_stats(user_id,rating,wins,losses,draws,updated_at) VALUES(?1,1000+?2,?3,?4,?5,?6)
    ON CONFLICT(user_id) DO UPDATE SET rating=MAX(100,rating+?2), wins=wins+?3, losses=losses+?4, draws=draws+?5, updated_at=?6`).bind(uid, delta, s === 1 ? 1 : 0, s === 0 ? 1 : 0, s === 0.5 ? 1 : 0, now());
  await env.DB.batch([up(d.a_id, da, sa), up(d.b_id, db, 1 - sa)]);
  return { ...d, status: 'done', winner_id: winner, a_delta: da, b_delta: db, finished_at: now(), a_done: 1, b_done: 1 };
}
async function expire(env, d) {
  if (d.status === 'waiting' && now() - d.created_at > WAIT_MS) { await run(env, "UPDATE duels SET status='expired', updated_at=? WHERE id=? AND status='waiting'", now(), d.id); d.status = 'expired'; }
  if (d.status === 'invited' && now() - d.created_at > INVITE_MS) { await run(env, "UPDATE duels SET status='expired', updated_at=? WHERE id=? AND status='invited'", now(), d.id); d.status = 'expired'; }
  if (d.status === 'active') d = await finalize(env, d);
  return d;
}
async function people(env, ids) {
  ids = [...new Set(ids.filter(Boolean))];
  if (!ids.length) return new Map();
  const rows = await all(env, `SELECT u.id, u.username, u.display_name, u.tg_name, COALESCE(d.rating,1000) rating FROM users u LEFT JOIN duel_stats d ON d.user_id=u.id WHERE u.id IN (SELECT value FROM json_each(?))`, J(ids));
  return new Map(rows.map(r => [r.id, card(r)]));
}
function brief(d, uid, ppl) {
  const me = d.a_id === uid ? 'a' : 'b', op = me === 'a' ? d.b_id : d.a_id;
  return { code: d.code, status: d.status, me, cat: d.cat, level: d.level_no, n: d.n, created_at: d.created_at, started_at: d.started_at, finished_at: d.finished_at,
    incoming: me === 'b' && d.status === 'invited', opponent: op ? ppl.get(op) || null : null,
    my_score: d[me + '_score'], op_score: d[(me === 'a' ? 'b' : 'a') + '_score'],
    result: d.status === 'done' ? (d.winner_id == null ? 'draw' : d.winner_id === uid ? 'win' : 'loss') : null, delta: d.status === 'done' ? d[me + '_delta'] : 0 };
}
async function duelFor(env, uid, code) {
  const d = await one(env, 'SELECT * FROM duels WHERE code=?', String(code || '').toUpperCase().slice(0, 12));
  if (!d || (d.a_id !== uid && d.b_id !== uid)) throw new ApiError(404, 'not_found');
  return expire(env, d);
}
async function state(env, uid, d) {
  const ppl = await people(env, [d.a_id, d.b_id]), b = brief(d, uid, ppl), me = b.me, op = me === 'a' ? 'b' : 'a';
  const qs = P(d.questions) || [], mine = P(d[me + '_answers']) || [], theirs = P(d[op + '_answers']) || [];
  const live = d.status === 'active' || d.status === 'done';
  return { ...b, now: now(), q_ms: Q_MS, me_user: ppl.get(uid) || null,
    questions: live && now() >= (d.started_at || 0) - 1500 ? qs.map((q, i) => ({ t: q.t, q: q.q, o: q.o, ...(d.status === 'done' || i < mine.length ? { a: q.a, s: q.s } : {}) })) : [],
    answers: mine, op_answered: theirs.length, op_done: !!d[op + '_done'], my_done: !!d[me + '_done'],
    op_answers: d.status === 'done' ? theirs : undefined };
}
async function notifyInvite(env, from, to, d) {
  if (!to.telegram_id || to.blocked_bot) return;
  const o = await publicOrigin(env), fa = true;
  const text = `⚔️ <b>${String(nameOf(from)).replace(/[<>&]/g, '')}</b> شما را به یک دوئل لغت دعوت کرد!\n` +
    `📚 ${d.n} سؤال · ${d.cat === 'mix' ? 'همهٔ لغات' : d.cat.toUpperCase()}${d.level_no ? ' · سطح ' + d.level_no : ''}\n\n<i>${fa ? 'دعوت تا ۲۴ ساعت معتبر است.' : ''}</i>`;
  const kb = o ? { inline_keyboard: [[{ text: '⚔️ قبول دوئل', web_app: { url: `${o}/?tg=1&duel=${d.code}` } }]] } : undefined;
  await tg(env, 'sendMessage', { chat_id: to.telegram_id, text, parse_mode: 'HTML', ...(kb ? { reply_markup: kb } : {}) }).catch(e => {
    if (e.code === 403) return run(env, 'UPDATE users SET blocked_bot=1 WHERE id=?', to.id);
  });
}
function duelOpts(d) {
  const cat = CATS.includes(d.cat) ? d.cat : 'mix';
  const level = Math.max(0, Math.min(6, int(d.level)));
  const n = [5, 10, 15].includes(int(d.n)) ? int(d.n) : 10;
  return { cat, level: cat === 'mix' ? 0 : level, n };
}
route('GET', '/api/duel', async (env, req) => {
  const u = await currentUser(env, req);
  let rows = await all(env, `SELECT * FROM duels WHERE (a_id=?1 OR b_id=?1) AND (status IN ('waiting','invited','active') OR (status='done' AND finished_at>?2)) ORDER BY id DESC LIMIT 60`, u.id, now() - 60 * DAY);
  rows = await Promise.all(rows.map(d => expire(env, d)));
  const ppl = await people(env, rows.flatMap(d => [d.a_id, d.b_id]));
  const st = await one(env, 'SELECT rating, wins, losses, draws FROM duel_stats WHERE user_id=?', u.id) || { rating: 1000, wins: 0, losses: 0, draws: 0 };
  const B = rows.map(d => brief(d, u.id, ppl));
  return { stats: st, username: u.username || null, invites: B.filter(x => x.incoming), open: B.filter(x => !x.incoming && ['waiting', 'invited', 'active'].includes(x.status)), history: B.filter(x => x.status === 'done').slice(0, 20) };
});
route('POST', '/api/duel/invite', async (env, req) => {
  const u = await currentUser(env, req), d = await body(req), o = duelOpts(d);
  const to = d.user_id ? await one(env, 'SELECT * FROM users WHERE id=?', int(d.user_id)) : await one(env, 'SELECT * FROM users WHERE username=?', String(d.username || '').replace(/^@/, '').toLowerCase());
  if (!to || to.blocked) throw new ApiError(404, 'user_not_found');
  if (to.id === u.id) throw new ApiError(400, 'cannot_invite_self');
  const open = await one(env, "SELECT COUNT(*) c FROM duels WHERE a_id=? AND status='invited' AND created_at>?", u.id, now() - INVITE_MS);
  if (open.c >= 10) throw new ApiError(429, 'too_many_invites');
  const qs = await makeQuestions(env, o.cat, o.level, o.n), code = newCode(8);
  await run(env, `INSERT INTO duels(code,a_id,b_id,status,cat,level_no,n,questions,created_at,updated_at) VALUES(?,?,?,'invited',?,?,?,?,?,?)`, code, u.id, to.id, o.cat, o.level, o.n, J(qs), now(), now());
  const dd = await one(env, 'SELECT * FROM duels WHERE code=?', code);
  await notifyInvite(env, u, to, dd);
  return state(env, u.id, dd);
});
route('POST', '/api/duel/random', async (env, req) => {
  const u = await currentUser(env, req), d = await body(req), o = duelOpts(d);
  await run(env, "UPDATE duels SET status='cancelled', updated_at=? WHERE a_id=? AND status='waiting'", now(), u.id);
  const r = await ratingOf(env, u.id);
  const cands = await all(env, `SELECT d.* FROM duels d LEFT JOIN duel_stats s ON s.user_id=d.a_id WHERE d.status='waiting' AND d.a_id<>?1 AND d.created_at>?2 AND d.n=?5
      AND (d.cat=?3 OR d.cat='mix' OR ?3='mix') AND (d.level_no=?4 OR d.level_no=0 OR ?4=0)
      ORDER BY ABS(COALESCE(s.rating,1000)-?6), d.id LIMIT 5`, u.id, now() - WAIT_MS, o.cat, o.level, o.n, r);
  for (const c of cands) {
    const t = now() + START_DELAY;
    const res = await run(env, "UPDATE duels SET b_id=?, status='active', started_at=?, updated_at=? WHERE id=? AND status='waiting' AND b_id IS NULL", u.id, t, now(), c.id);
    if (res.meta && res.meta.changes) return state(env, u.id, { ...c, b_id: u.id, status: 'active', started_at: t });
  }
  const qs = await makeQuestions(env, o.cat, o.level, o.n), code = newCode(8);
  await run(env, `INSERT INTO duels(code,a_id,status,cat,level_no,n,questions,created_at,updated_at) VALUES(?,?,'waiting',?,?,?,?,?,?)`, code, u.id, o.cat, o.level, o.n, J(qs), now(), now());
  return state(env, u.id, await one(env, 'SELECT * FROM duels WHERE code=?', code));
});
route('GET', '/api/duel/{code}', async (env, req, p) => { const u = await currentUser(env, req); return state(env, u.id, await duelFor(env, u.id, p.code)); });
route('POST', '/api/duel/{code}/accept', async (env, req, p) => {
  const u = await currentUser(env, req), d = await duelFor(env, u.id, p.code);
  if (d.b_id !== u.id || d.status !== 'invited') throw new ApiError(409, 'duel_' + d.status);
  const t = now() + START_DELAY;
  await run(env, "UPDATE duels SET status='active', started_at=?, updated_at=? WHERE id=? AND status='invited'", t, now(), d.id);
  return state(env, u.id, { ...d, status: 'active', started_at: t });
});
route('POST', '/api/duel/{code}/decline', async (env, req, p) => {
  const u = await currentUser(env, req), d = await duelFor(env, u.id, p.code);
  const st = d.b_id === u.id && d.status === 'invited' ? 'declined' : d.a_id === u.id && ['invited', 'waiting'].includes(d.status) ? 'cancelled' : null;
  if (!st) throw new ApiError(409, 'duel_' + d.status);
  await run(env, 'UPDATE duels SET status=?, updated_at=? WHERE id=?', st, now(), d.id);
  return { ok: true, status: st };
});
route('POST', '/api/duel/{code}/answer', async (env, req, p) => {
  const u = await currentUser(env, req), x = await body(req);
  let d = await duelFor(env, u.id, p.code);
  if (d.status !== 'active') throw new ApiError(409, 'duel_' + d.status);
  if (now() < d.started_at - 1000) throw new ApiError(409, 'not_started');
  const me = d.a_id === u.id ? 'a' : 'b', qs = P(d.questions) || [], ans = P(d[me + '_answers']) || [];
  const i = int(x.i, -1);
  if (i !== ans.length || i >= qs.length) return state(env, u.id, d);         // duplicate / out of order → just return the state
  const c = int(x.c, -1), ms = Math.max(0, Math.min(Q_MS + 1000, int(x.ms, Q_MS))), ok = c === qs[i].a;
  ans.push([c, ms, ok ? 1 : 0]);
  const score = ans.reduce((s, a) => s + points(a[2], a[1]), 0), tms = ans.reduce((s, a) => s + a[1], 0), done = ans.length >= qs.length ? 1 : 0;
  const res = await run(env, `UPDATE duels SET ${me}_answers=?, ${me}_score=?, ${me}_ms=?, ${me}_done=?, updated_at=? WHERE id=? AND status='active' AND json_array_length(${me}_answers)=?`, J(ans), score, tms, done, now(), d.id, i);
  d = await one(env, 'SELECT * FROM duels WHERE id=?', d.id);
  if (res.meta && res.meta.changes && done) d = await finalize(env, d);
  return { ok, a: qs[i].a, points: points(ok, ms), ...(await state(env, u.id, d)) };
});
route('POST', '/api/duel/{code}/forfeit', async (env, req, p) => {
  const u = await currentUser(env, req); let d = await duelFor(env, u.id, p.code);
  if (d.status !== 'active') throw new ApiError(409, 'duel_' + d.status);
  const me = d.a_id === u.id ? 'a' : 'b';
  await run(env, `UPDATE duels SET ${me}_done=1, ${me}_score=0, ${me}_ms=999999, updated_at=? WHERE id=?`, now(), d.id);
  d = await one(env, 'SELECT * FROM duels WHERE id=?', d.id);
  await run(env, `UPDATE duels SET ${me === 'a' ? 'b' : 'a'}_done=1 WHERE id=?`, d.id);
  d = await finalize(env, { ...d, a_done: 1, b_done: 1 });
  return state(env, u.id, d);
});

/* ---------- reading passages (built-in copies ship with the apps; these are added/edited in the admin panel) ---------- */
route('GET', '/api/readings', async (env, req) => {
  const ver = await meta(env, 'readings_version', '0'), etag = `"r${ver}"`;
  if (req.headers.get('If-None-Match') === etag) return new Response(null, { status: 304, headers: { ETag: etag } });
  const rows = await all(env, 'SELECT slug, exam, level_no, title, data, is_active, updated_at FROM readings ORDER BY exam, level_no, sort, id');
  const items = rows.map(r => { const d = P(r.data) || {}; return { ...d, id: r.slug, exam: r.exam, level: r.level_no, title: r.title, active: !!r.is_active, updated_at: r.updated_at }; });
  return json({ version: ver, items }, 200, { ETag: etag, 'Cache-Control': 'no-cache' });
});

/* ---------- feedback ---------- */
route('POST', '/api/feedback', async (env, req) => {
  const u = await currentUser(env, req, { required: false }), d = await body(req), ip = clientIp(req) || 'x';
  if (await isBlocked(env, 'fb:' + ip)) throw new ApiError(429, 'too_many_attempts');
  const text = String(d.text || '').trim().slice(0, 3000);
  if (text.length < 3) throw new ApiError(400, 'required');
  const kind = ['idea', 'bug', 'content', 'praise', 'other'].includes(d.kind) ? d.kind : 'other';
  const recent = await one(env, 'SELECT COUNT(*) c FROM feedback WHERE created_at>? AND (user_id=? OR (? IS NULL AND user_id IS NULL))', now() - 3600000, u ? u.id : null, u ? u.id : null);
  if (recent.c >= (u ? 15 : 40)) { await failAttempt(env, 'fb:' + ip); throw new ApiError(429, 'too_many_attempts'); }
  const contact = str(d.contact, 120);
  await run(env, 'INSERT INTO feedback(user_id,kind,text,ref,platform,status,created_at,updated_at) VALUES(?,?,?,?,?,?,?,?)', u ? u.id : null, kind,
    contact ? text + '\n— ' + contact : text, str(d.ref, 200), str(d.platform, 60), 'new', now(), now());
  return [{ ok: true }, 201];
});
route('GET', '/api/feedback', async (env, req) => {
  const u = await currentUser(env, req);
  return { items: await all(env, 'SELECT id, kind, text, status, reply, created_at, updated_at FROM feedback WHERE user_id=? ORDER BY id DESC LIMIT 30', u.id) };
});

/* ---------- AI tutor (optional: needs the Workers AI binding `AI`) ---------- */
// Workers AI models are retired from time to time; try a list and remember the first one that answers
const AI_MODELS = ['@cf/meta/llama-3.3-70b-instruct-fp8-fast', '@cf/meta/llama-4-scout-17b-16e-instruct', '@cf/mistralai/mistral-small-3.1-24b-instruct', '@cf/google/gemma-3-12b-it', '@cf/qwen/qwen3-30b-a3b-fp8', '@cf/meta/llama-3.2-3b-instruct', '@cf/meta/llama-3.1-8b-instruct-fast'];
let aiModel = null;
const aiText = o => { if (!o) return ''; const r = o.response ?? (o.result && o.result.response) ?? (o.choices && o.choices[0] && o.choices[0].message && o.choices[0].message.content); return typeof r === 'string' ? r : r ? JSON.stringify(r) : ''; };
async function aiRun(env, messages, max_tokens) {
  const list = aiModel ? [aiModel, ...AI_MODELS.filter(m => m !== aiModel)] : AI_MODELS;
  let last;
  for (const m of list) {
    try { const o = await env.AI.run(m, { messages, max_tokens, temperature: 0.2 }); const t = aiText(o); if (t) { aiModel = m; return t; } }
    catch (e) { last = e; console.error('ai', m, e && e.message); if (/limit|quota|neurons/i.test((e && e.message) || '')) break; }
  }
  throw last || new Error('no_model');
}
const AI_DAILY = 40;
function aiJson(text) {
  const s = String(text || ''), i = s.indexOf('{'), j = s.lastIndexOf('}');
  if (i < 0 || j < i) return null;
  try { return JSON.parse(s.slice(i, j + 1)); } catch (e) { return null; }
}
route('POST', '/api/ai/check', async (env, req) => {
  const u = await currentUser(env, req), d = await body(req);
  if (!env.AI) throw new ApiError(503, 'ai_unavailable');
  const word = str(d.word, 60).trim(), sentence = str(d.sentence, 400).trim(), mode = d.mode === 'explain' ? 'explain' : 'check';
  if (!word || (mode === 'check' && sentence.split(/\s+/).length < 3)) throw new ApiError(400, 'required');
  const key = `ai:${u.id}:${tehranDay()}`, used = int(await meta(env, key, '0'));
  if (used >= AI_DAILY) throw new ApiError(429, 'ai_limit');
  await setMeta(env, key, used + 1);
  const sys = 'You are a friendly, precise English tutor for Persian-speaking learners. Reply ONLY with one JSON object, no markdown.';
  const prompt = mode === 'check'
    ? `Target word: "${word}". Learner's sentence: "${sentence}".\nEvaluate whether the target word is used correctly and naturally, and whether the grammar is correct.\nReturn JSON: {"score": 0-10 integer, "correct": true|false, "corrected": "a corrected, natural version of the sentence (same meaning)", "feedback_fa": "2-3 short sentences of feedback in Persian", "tip_en": "one short tip in English"}`
    : `Explain the English word "${word}" for a Persian-speaking learner.\nReturn JSON: {"meaning_fa": "short Persian meaning", "explain_fa": "2-3 sentences in Persian about usage, register and common mistakes", "collocations": ["3-5 common collocations"], "examples": [["English example", "Persian translation"], ["English example", "Persian translation"]]}`;
  let out;
  try { out = await aiRun(env, [{ role: 'system', content: sys }, { role: 'user', content: prompt }], 500); }
  catch (e) { throw new ApiError(503, 'ai_unavailable'); }
  const j = aiJson(out);
  if (!j) throw new ApiError(502, 'ai_bad_response');
  return { mode, result: j, left: AI_DAILY - used - 1 };
});
