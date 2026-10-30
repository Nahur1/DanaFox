/* Admin API v3 — analytics, reading passages CMS, feedback inbox, duels, leaderboard and CSV/JSON exports */
import { ApiError, json, one, all, run, now, int, str, body, setMeta, tehranDay, tehranMidnight } from './util.js';
import { route } from './router.js';
import { requireAdmin, audit } from './auth.js';
import { tg } from './bot/telegram.js';

const DAY = 86400000;
const P = s => { try { return JSON.parse(s); } catch (e) { return null; } };
const dayAdd = (d, n) => new Date(Date.parse(d + 'T00:00:00Z') + n * DAY).toISOString().slice(0, 10);
const diffDays = (a, b) => Math.round((Date.parse(b + 'T00:00:00Z') - Date.parse(a + 'T00:00:00Z')) / DAY);
const platformOf = ua => {
  ua = ua || '';
  if (/Electron/i.test(ua)) return 'desktop';
  if (/Telegram/i.test(ua)) return 'telegram';
  if (/Android/i.test(ua) && /; wv\)|VajeYar|DanaFox/i.test(ua)) return 'android';
  if (/iPhone|iPad|iPod/i.test(ua) && /DanaFoxiOS/.test(ua)) return 'ios';
  if (/Android|iPhone|iPad|Mobile/i.test(ua)) return 'mobile_web';
  return ua ? 'web' : 'other';
};

/* ---------- analytics ---------- */
async function analytics(env, days) {
  const today = tehranDay(), from = tehranDay(now() - (days - 1) * DAY), from30 = dayAdd(from, -29), t0 = tehranMidnight() - (days - 1) * DAY;
  const pairs = await all(env, 'SELECT user_id u, day d, reviews r, new_words n, correct c, wrong w, xp x FROM user_daily_activity WHERE day>=? LIMIT 200000', from30);
  const byDay = new Map();
  for (const p of pairs) { if (!byDay.has(p.d)) byDay.set(p.d, []); byDay.get(p.d).push(p); }
  const series = [];
  for (let i = 0; i < days; i++) {
    const d = dayAdd(from, i), rows = byDay.get(d) || [];
    const wau = new Set(), mau = new Set();
    for (let k = 0; k < 30; k++) for (const r of byDay.get(dayAdd(d, -k)) || []) { mau.add(r.u); if (k < 7) wau.add(r.u); }
    const s = rows.reduce((a, r) => ({ reviews: a.reviews + r.r, new_words: a.new_words + r.n, correct: a.correct + r.c, wrong: a.wrong + r.w, xp: a.xp + r.x }), { reviews: 0, new_words: 0, correct: 0, wrong: 0, xp: 0 });
    series.push({ day: d, dau: new Set(rows.map(r => r.u)).size, wau: wau.size, mau: mau.size, ...s });
  }
  const last = series[series.length - 1] || { dau: 0, wau: 0, mau: 0 };
  const inRange = series.filter(x => x.mau > 0);
  const stickiness = inRange.length ? Math.round(1000 * inRange.reduce((a, x) => a + x.dau / x.mau, 0) / inRange.length) / 10 : 0;

  // retention: weekly sign-up cohorts (last 8 weeks), classic day-N retention (active exactly on day N) + rolling (active on day N or later)
  const users = await all(env, 'SELECT id, created_at FROM users WHERE created_at>=?', tehranMidnight() - 56 * DAY);
  const act = await all(env, 'SELECT user_id u, day d FROM user_daily_activity WHERE user_id IN (SELECT id FROM users WHERE created_at>=?)', tehranMidnight() - 56 * DAY);
  const ad = new Map(); for (const a of act) { if (!ad.has(a.u)) ad.set(a.u, new Set()); ad.get(a.u).add(a.d); }
  const cohorts = new Map();
  for (const u of users) {
    const sd = tehranDay(u.created_at), age = diffDays(sd, today);
    const wk = Math.floor(diffDays(sd, today) / 7), key = dayAdd(today, -(wk * 7 + 6));
    if (!cohorts.has(key)) cohorts.set(key, { week: key, size: 0, d1: [0, 0], d7: [0, 0], d30: [0, 0], r7: [0, 0], any: 0 });
    const c = cohorts.get(key), s = ad.get(u.id) || new Set();
    c.size++;
    const later = [...s].map(d => diffDays(sd, d)).filter(n => n >= 1);
    if (later.length) c.any++;
    for (const [k, n] of [['d1', 1], ['d7', 7], ['d30', 30]]) if (age >= n) { c[k][1]++; if (s.has(dayAdd(sd, n))) c[k][0]++; }
    if (age >= 7) { c.r7[1]++; if (later.some(n => n >= 7)) c.r7[0]++; }
  }
  const pct = ([a, b]) => (b ? Math.round(1000 * a / b) / 10 : null);
  const retention = [...cohorts.values()].sort((a, b) => (a.week < b.week ? 1 : -1)).map(c => ({ week: c.week, size: c.size, d1: pct(c.d1), d7: pct(c.d7), d30: pct(c.d30), rolling7: pct(c.r7), returned: c.size ? Math.round(1000 * c.any / c.size) / 10 : 0, eligible: { d1: c.d1[1], d7: c.d7[1], d30: c.d30[1] } }));
  const tot = (k, a, b) => [a.reduce((s, x) => s + x[k][0], 0), a.reduce((s, x) => s + x[k][1], 0)];
  const allC = [...cohorts.values()];
  const retentionAll = { d1: pct(tot('d1', allC)), d7: pct(tot('d7', allC)), d30: pct(tot('d30', allC)), rolling7: pct(tot('r7', allC)) };

  const learn = await one(env, `SELECT COUNT(*) seen, SUM(interval_days>=21) mastered, SUM(interval_days>=3 AND interval_days<21) review, SUM(interval_days<3) learning,
      SUM(due_at<=?1) due, ROUND(AVG(ease),2) ease, SUM(lapses) lapses, SUM(correct_count) ok, SUM(wrong_count) bad, SUM(starred) starred, COUNT(DISTINCT user_id) learners
      FROM user_progress WHERE deleted=0 AND seen=1`, now());
  const period = series.reduce((a, x) => ({ reviews: a.reviews + x.reviews, new_words: a.new_words + x.new_words, correct: a.correct + x.correct, wrong: a.wrong + x.wrong, xp: a.xp + x.xp }), { reviews: 0, new_words: 0, correct: 0, wrong: 0, xp: 0 });
  const activeUsers = new Set(pairs.filter(p => p.d >= from).map(p => p.u)).size;
  const activeDays = pairs.filter(p => p.d >= from).length;
  const hardest = await all(env, `SELECT p.word_slug slug, COALESCE(w.word, substr(p.word_slug, instr(p.word_slug,':')+1)) word, COALESCE(w.meaning_fa,'') fa, COALESCE(w.category_id,'custom') cat, COALESCE(w.level_no,0) level,
      SUM(p.wrong_count) bad, SUM(p.correct_count) ok, SUM(p.lapses) lapses, COUNT(*) learners
      FROM user_progress p LEFT JOIN words w ON w.slug=p.word_slug WHERE p.deleted=0 AND p.seen=1 GROUP BY p.word_slug HAVING (bad+ok)>=3
      ORDER BY 1.0*bad/(bad+ok) DESC, lapses DESC, learners DESC LIMIT 25`);
  const decks = await all(env, `SELECT COALESCE(w.category_id,'custom') cat, COALESCE(w.level_no,0) level, COUNT(*) seen, SUM(p.interval_days>=21) mastered, COUNT(DISTINCT p.user_id) learners,
      ROUND(100.0*SUM(p.correct_count)/MAX(1,SUM(p.correct_count)+SUM(p.wrong_count)),1) accuracy
      FROM user_progress p LEFT JOIN words w ON w.slug=p.word_slug WHERE p.deleted=0 AND p.seen=1 GROUP BY cat, level ORDER BY cat, level`);
  const quiz = await one(env, `SELECT COUNT(*) n, ROUND(AVG(100.0*score/total),1) avg, SUM(100*score<50*total) b0, SUM(100*score>=50*total AND 100*score<70*total) b1,
      SUM(100*score>=70*total AND 100*score<90*total) b2, SUM(100*score>=90*total) b3, COUNT(DISTINCT user_id) users FROM quiz_results WHERE total>0 AND taken_at>=?`, t0);
  const quizDaily = await all(env, `SELECT date((taken_at+12600000)/1000,'unixepoch') day, COUNT(*) n, ROUND(AVG(100.0*score/total),1) avg FROM quiz_results WHERE total>0 AND taken_at>=? GROUP BY day ORDER BY day`, t0);
  const placement = await all(env, `SELECT json_extract(data,'$.cefr') cefr, COUNT(*) n, ROUND(AVG(json_extract(data,'$.vocab'))) vocab, ROUND(AVG(json_extract(data,'$.score')),1) score
      FROM user_kv WHERE k='placement' AND deleted=0 GROUP BY cefr ORDER BY cefr`);
  const reading = await all(env, `SELECT json_extract(data,'$.exam') exam, COUNT(*) n, COUNT(DISTINCT user_id) users, ROUND(AVG(json_extract(data,'$.pct')),1) avg
      FROM user_kv WHERE k LIKE 'rd:%' AND deleted=0 GROUP BY exam ORDER BY n DESC`);
  const readingTop = await all(env, `SELECT substr(k,4) slug, COUNT(*) n, ROUND(AVG(json_extract(data,'$.pct')),1) avg FROM user_kv WHERE k LIKE 'rd:%' AND deleted=0 GROUP BY slug ORDER BY n DESC LIMIT 10`);
  const duels = await one(env, `SELECT COUNT(*) total, SUM(status='done') done, SUM(status='active') active, SUM(status='invited') invited, SUM(status IN ('declined','cancelled','expired')) dropped,
      SUM(status='done' AND winner_id IS NULL) draws, COUNT(DISTINCT a_id) starters FROM duels WHERE created_at>=?`, t0);
  const fb = await all(env, 'SELECT status, COUNT(*) n FROM feedback GROUP BY status');
  const sess = await all(env, 'SELECT user_id, user_agent FROM sessions WHERE is_admin=0 AND last_seen_at>=?', t0);
  const platforms = {}; const seenPU = new Set();
  for (const s of sess) { const p = platformOf(s.user_agent), k = p + ':' + s.user_id; if (seenPU.has(k)) continue; seenPU.add(k); platforms[p] = (platforms[p] || 0) + 1; }
  const botUsers = (await one(env, 'SELECT COUNT(*) c FROM users WHERE last_bot_at>=?', t0)).c;
  if (botUsers) platforms.telegram_bot = botUsers;
  const funnel = await one(env, `SELECT COUNT(*) signed_up, SUM(EXISTS(SELECT 1 FROM user_progress p WHERE p.user_id=u.id AND p.seen=1)) learned_one,
      SUM((SELECT COUNT(*) FROM user_progress p WHERE p.user_id=u.id AND p.seen=1)>=20) learned_20,
      SUM((SELECT COUNT(DISTINCT day) FROM user_daily_activity d WHERE d.user_id=u.id)>=3) active_3days,
      SUM((SELECT COUNT(DISTINCT day) FROM user_daily_activity d WHERE d.user_id=u.id)>=7) active_7days FROM users u WHERE u.created_at>=?`, t0);
  const streaks = await one(env, 'SELECT COUNT(*) n, ROUND(AVG(streak_count),1) avg, MAX(streak_best) best, SUM(streak_count>=7) week_plus FROM user_profile WHERE streak_count>0');
  return {
    days, from, today, series,
    kpi: { dau: last.dau, wau: last.wau, mau: last.mau, stickiness, dau_mau_today: last.mau ? Math.round(1000 * last.dau / last.mau) / 10 : 0,
      active_users: activeUsers, avg_days_per_user: activeUsers ? Math.round(10 * activeDays / activeUsers) / 10 : 0,
      reviews_per_active_day: activeDays ? Math.round(10 * period.reviews / activeDays) / 10 : 0,
      accuracy: period.correct + period.wrong ? Math.round(1000 * period.correct / (period.correct + period.wrong)) / 10 : null, ...period },
    retention, retention_all: retentionAll, learning: learn, hardest, decks, quiz: { ...quiz, daily: quizDaily }, placement, reading, reading_top: readingTop,
    duels, feedback: Object.fromEntries(fb.map(r => [r.status, r.n])), platforms, funnel, streaks,
  };
}
route('GET', '/api/admin/analytics', async (env, req, p, url) => {
  await requireAdmin(env, req);
  const days = [7, 14, 30, 60, 90].includes(int(url.searchParams.get('days'))) ? int(url.searchParams.get('days')) : 30;
  return analytics(env, days);
});

/* ---------- reading passages ---------- */
const EXAMS = ['ielts', 'toefl', 'gre', 'pte', 'general'];
const QTYPES = ['mcq', 'multi', 'tfng', 'ynng', 'head', 'match', 'gap', 'bank', 'insert', 'order', 'select', 'tc'];
function cleanReading(d) {
  const exam = EXAMS.includes(d.exam) ? d.exam : null;
  if (!exam) throw new ApiError(400, 'bad_exam');
  const title = str(d.title, 160).trim(); if (!title) throw new ApiError(400, 'required');
  let data = d.data;
  if (typeof data === 'string') { data = P(data); if (!data) throw new ApiError(400, 'bad_json'); }
  if (!data || typeof data !== 'object') throw new ApiError(400, 'bad_json');
  const paras = Array.isArray(data.paras) ? data.paras.map(x => str(x, 6000)).filter(Boolean) : [];
  if (!paras.length) throw new ApiError(400, 'no_text');
  const qs = Array.isArray(data.qs) ? data.qs.filter(q => q && QTYPES.includes(q.type)).slice(0, 60) : [];
  if (!qs.length) throw new ApiError(400, 'no_questions');
  const slug = (str(d.slug, 80) || `${exam}-${int(d.level, 1)}-${title}`).toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '').slice(0, 80) || 'r' + now();
  const clean = { ...data, paras, qs }; delete clean.id; delete clean.exam; delete clean.level; delete clean.title;
  const txt = JSON.stringify(clean); if (txt.length > 120000) throw new ApiError(400, 'too_large');
  return { slug, exam, level: Math.max(1, Math.min(4, int(d.level, 1))), title, data: txt, active: d.active === false || d.is_active === 0 ? 0 : 1, sort: int(d.sort) };
}
const bumpReadings = env => setMeta(env, 'readings_version', now());
route('GET', '/api/admin/readings', async (env, req) => {
  await requireAdmin(env, req);
  const rows = await all(env, `SELECT r.*, (SELECT COUNT(*) FROM user_kv k WHERE k.k='rd:'||r.slug AND k.deleted=0) attempts,
      (SELECT ROUND(AVG(json_extract(k.data,'$.pct')),1) FROM user_kv k WHERE k.k='rd:'||r.slug AND k.deleted=0) avg FROM readings r ORDER BY exam, level_no, sort, id`);
  return { items: rows.map(r => ({ id: r.id, slug: r.slug, exam: r.exam, level: r.level_no, title: r.title, active: !!r.is_active, sort: r.sort, data: P(r.data), attempts: r.attempts, avg: r.avg, updated_at: r.updated_at })) };
});
route('POST', '/api/admin/readings', async (env, req) => {
  const a = await requireAdmin(env, req), r = cleanReading(await body(req));
  if (await one(env, 'SELECT id FROM readings WHERE slug=?', r.slug)) throw new ApiError(409, 'slug_exists');
  const row = await one(env, 'INSERT INTO readings(slug,exam,level_no,title,data,is_active,sort,created_at,updated_at) VALUES(?,?,?,?,?,?,?,?,?) RETURNING id', r.slug, r.exam, r.level, r.title, r.data, r.active, r.sort, now(), now());
  await bumpReadings(env); await audit(env, req, a, 'reading.create', { id: row.id, slug: r.slug });
  return [{ id: row.id, slug: r.slug }, 201];
});
route('PUT', '/api/admin/readings/{id}', async (env, req, p) => {
  const a = await requireAdmin(env, req), d = await body(req), cur = await one(env, 'SELECT * FROM readings WHERE id=?', int(p.id));
  if (!cur) throw new ApiError(404, 'not_found');
  if (Object.keys(d).length === 1 && 'active' in d) {
    await run(env, 'UPDATE readings SET is_active=?, updated_at=? WHERE id=?', d.active ? 1 : 0, now(), cur.id);
  } else {
    const r = cleanReading({ slug: cur.slug, ...d });
    await run(env, 'UPDATE readings SET exam=?, level_no=?, title=?, data=?, is_active=?, sort=?, updated_at=? WHERE id=?', r.exam, r.level, r.title, r.data, r.active, r.sort, now(), cur.id);
  }
  await bumpReadings(env); await audit(env, req, a, 'reading.update', { id: cur.id, slug: cur.slug });
  return { ok: true };
});
route('DELETE', '/api/admin/readings/{id}', async (env, req, p) => {
  const a = await requireAdmin(env, req), cur = await one(env, 'SELECT slug FROM readings WHERE id=?', int(p.id));
  if (!cur) throw new ApiError(404, 'not_found');
  await run(env, 'DELETE FROM readings WHERE id=?', int(p.id));
  await bumpReadings(env); await audit(env, req, a, 'reading.delete', { id: int(p.id), slug: cur.slug });
  return { ok: true };
});

/* ---------- feedback inbox ---------- */
route('GET', '/api/admin/feedback', async (env, req, p, url) => {
  await requireAdmin(env, req);
  const st = url.searchParams.get('status') || '', kind = url.searchParams.get('kind') || '', page = Math.max(1, int(url.searchParams.get('page'), 1));
  const where = `(?1='' OR f.status=?1) AND (?2='' OR f.kind=?2)`;
  const items = await all(env, `SELECT f.*, u.display_name, u.email, u.username, u.telegram_id, u.tg_username FROM feedback f LEFT JOIN users u ON u.id=f.user_id WHERE ${where} ORDER BY f.id DESC LIMIT 30 OFFSET ${(page - 1) * 30}`, st, kind);
  const total = (await one(env, `SELECT COUNT(*) c FROM feedback f WHERE ${where}`, st, kind)).c;
  const counts = Object.fromEntries((await all(env, 'SELECT status, COUNT(*) n FROM feedback GROUP BY status')).map(r => [r.status, r.n]));
  return { items, total, page, counts };
});
route('PUT', '/api/admin/feedback/{id}', async (env, req, p) => {
  const a = await requireAdmin(env, req), d = await body(req), f = await one(env, 'SELECT f.*, u.telegram_id FROM feedback f LEFT JOIN users u ON u.id=f.user_id WHERE f.id=?', int(p.id));
  if (!f) throw new ApiError(404, 'not_found');
  const status = ['new', 'seen', 'planned', 'done', 'rejected'].includes(d.status) ? d.status : f.status, reply = 'reply' in d ? str(d.reply, 2000).trim() : f.reply;
  await run(env, 'UPDATE feedback SET status=?, reply=?, updated_at=? WHERE id=?', status, reply, now(), f.id);
  let sent = false;
  if (d.notify && reply && f.telegram_id) {
    try { await tg(env, 'sendMessage', { chat_id: f.telegram_id, text: `💬 <b>پاسخ تیم دانافاکس به پیام شما</b>\n\n<i>${f.text.slice(0, 300).replace(/[<>&]/g, '')}</i>\n\n${reply.replace(/[<>&]/g, '')}`, parse_mode: 'HTML' }); sent = true; }
    catch (e) { /* the user may have blocked the bot */ }
  }
  await audit(env, req, a, 'feedback.update', { id: f.id, status, replied: !!reply, sent });
  return { ok: true, sent };
});
route('DELETE', '/api/admin/feedback/{id}', async (env, req, p) => {
  const a = await requireAdmin(env, req);
  await run(env, 'DELETE FROM feedback WHERE id=?', int(p.id));
  await audit(env, req, a, 'feedback.delete', { id: int(p.id) });
  return { ok: true };
});

/* ---------- duels + leaderboard ---------- */
const NAME = `COALESCE(NULLIF(u.display_name,''), '@'||u.username, u.tg_name, 'user #'||u.id)`;
route('GET', '/api/admin/duels', async (env, req) => {
  await requireAdmin(env, req);
  const recent = await all(env, `SELECT d.id, d.code, d.status, d.cat, d.level_no, d.n, d.a_score, d.b_score, d.a_delta, d.winner_id, d.created_at, d.finished_at, d.a_id, d.b_id,
      (SELECT ${NAME} FROM users u WHERE u.id=d.a_id) a_name, (SELECT ${NAME} FROM users u WHERE u.id=d.b_id) b_name FROM duels d ORDER BY d.id DESC LIMIT 60`);
  const by = await all(env, 'SELECT status, COUNT(*) n FROM duels GROUP BY status');
  const daily = await all(env, `SELECT date((created_at+12600000)/1000,'unixepoch') day, COUNT(*) n, SUM(status='done') done FROM duels WHERE created_at>=? GROUP BY day ORDER BY day`, tehranMidnight() - 29 * DAY);
  const cats = await all(env, "SELECT cat, COUNT(*) n FROM duels WHERE status='done' GROUP BY cat ORDER BY n DESC");
  return { recent, by_status: Object.fromEntries(by.map(r => [r.status, r.n])), daily, cats };
});
route('GET', '/api/admin/leaderboard', async (env, req) => {
  await requireAdmin(env, req);
  const xp = await all(env, `SELECT u.id, ${NAME} name, u.username, p.xp score, p.streak_count streak FROM user_profile p JOIN users u ON u.id=p.user_id ORDER BY p.xp DESC LIMIT 25`);
  const week = await all(env, `SELECT u.id, ${NAME} name, u.username, SUM(a.xp) score, SUM(a.reviews) reviews FROM user_daily_activity a JOIN users u ON u.id=a.user_id WHERE a.day>=? GROUP BY u.id ORDER BY score DESC LIMIT 25`, tehranDay(now() - 6 * DAY));
  const duel = await all(env, `SELECT u.id, ${NAME} name, u.username, d.rating score, d.wins, d.losses, d.draws FROM duel_stats d JOIN users u ON u.id=d.user_id ORDER BY d.rating DESC LIMIT 25`);
  const streak = await all(env, `SELECT u.id, ${NAME} name, u.username, p.streak_count score, p.streak_best best FROM user_profile p JOIN users u ON u.id=p.user_id WHERE p.streak_count>0 ORDER BY p.streak_count DESC LIMIT 25`);
  return { xp, week, duel, streak };
});

/* ---------- exports ---------- */
const csvOf = (cols, rows) => {
  const q = v => { v = v == null ? '' : typeof v === 'object' ? JSON.stringify(v) : String(v); return /[",\n]/.test(v) ? `"${v.replace(/"/g, '""')}"` : v; };
  return '\ufeff' + [cols.join(','), ...rows.map(r => cols.map(k => q(r[k])).join(','))].join('\n');
};
route('GET', '/api/admin/export/{kind}', async (env, req, p, url) => {
  const a = await requireAdmin(env, req), kind = String(p.kind).replace(/\.(csv|json)$/, '');
  let body_, type = 'text/csv; charset=utf-8', ext = 'csv';
  if (kind === 'analytics') { const r = await analytics(env, 90); body_ = csvOf(['day', 'dau', 'wau', 'mau', 'reviews', 'new_words', 'correct', 'wrong', 'xp'], r.series); }
  else if (kind === 'retention') { const r = await analytics(env, 30); body_ = csvOf(['week', 'size', 'd1', 'd7', 'd30', 'rolling7', 'returned'], r.retention); }
  else if (kind === 'hardest') { const r = await analytics(env, 30); body_ = csvOf(['slug', 'word', 'fa', 'cat', 'level', 'bad', 'ok', 'lapses', 'learners'], r.hardest); }
  else if (kind === 'feedback') body_ = csvOf(['id', 'created_at', 'kind', 'status', 'user_id', 'email', 'platform', 'ref', 'text', 'reply'], (await all(env, 'SELECT f.*, u.email FROM feedback f LEFT JOIN users u ON u.id=f.user_id ORDER BY f.id DESC')).map(r => ({ ...r, created_at: new Date(r.created_at).toISOString() })));
  else if (kind === 'duels') body_ = csvOf(['id', 'code', 'status', 'cat', 'level_no', 'n', 'a_id', 'b_id', 'a_score', 'b_score', 'winner_id', 'created_at'], (await all(env, 'SELECT * FROM duels ORDER BY id DESC')).map(r => ({ ...r, created_at: new Date(r.created_at).toISOString() })));
  else if (kind === 'placement') body_ = csvOf(['user_id', 'cefr', 'score', 'vocab', 'ielts', 'at'], (await all(env, "SELECT user_id, data FROM user_kv WHERE k='placement' AND deleted=0")).map(r => ({ user_id: r.user_id, ...(P(r.data) || {}) })));
  else if (kind === 'readings') { type = 'application/json; charset=utf-8'; ext = 'json'; body_ = JSON.stringify((await all(env, 'SELECT * FROM readings ORDER BY exam, level_no, sort, id')).map(r => ({ slug: r.slug, exam: r.exam, level: r.level_no, title: r.title, active: !!r.is_active, data: P(r.data) })), null, 1); }
  else throw new ApiError(404, 'not_found');
  await audit(env, req, a, 'export.' + kind);
  return new Response(body_, { headers: { 'Content-Type': type, 'Content-Disposition': `attachment; filename=danafox-${kind}-${tehranDay()}.${ext}` } });
});
