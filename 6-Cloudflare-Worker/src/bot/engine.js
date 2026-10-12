/* bot learning engine on top of the shared D1 tables — exactly the same data the web app syncs */
import { one, all, run, q, now, meta } from '../util.js';
import { nextRev, progressUpsert, progressRow, progressOut, profileOut, profileUpsert, customUpsert, customRow, customOut } from '../sync.js';

export const DAY = 86400000;
export const CATS = { general: 4, ielts: 3, toefl: 3 };
export const CAT_ICON = { general: '🌍', ielts: '🎓', toefl: '🏛', custom: '✍️' };
export const LEVEL_NAMES = {
  general: [['Basic', 'پایه'], ['Regular', 'متوسط'], ['Upper-Intermediate', 'فوق‌متوسط'], ['Advanced', 'پیشرفته']],
  ielts: [['Band 5 – 6', 'نمرهٔ ۵ تا ۶'], ['Band 6.5 – 7', 'نمرهٔ ۶٫۵ تا ۷'], ['Band 7.5 – 9', 'نمرهٔ ۷٫۵ تا ۹']],
  toefl: [['Foundation', 'پایه'], ['Intermediate', 'متوسط'], ['Advanced', 'پیشرفته']],
};
export const CAT_NAMES = { general: ['General English', 'لغات عمومی'], ielts: ['IELTS', 'آیلتس'], toefl: ['TOEFL', 'تافل'], custom: ['My words', 'لغات من'] };
export const POS_NAMES = { n: ['noun', 'اسم'], v: ['verb', 'فعل'], adj: ['adjective', 'صفت'], adv: ['adverb', 'قید'], prep: ['preposition', 'حرف اضافه'], conj: ['conjunction', 'حرف ربط'], phr: ['phrase', 'عبارت'] };
export const DEFAULT_SETTINGS = { lang: 'fa', theme: 'light', goal: 20, sessionSize: 10, front: 'en', accent: 'en-US', rate: 0.9, autoplay: true, online: true,
  reminder: false, reminderTime: '20:00', sounds: true, track: 'general', wotd: false, wotdTime: '09:00' };

/* ---------- word bank (cached per Worker instance) ---------- */
let WC = { at: 0, ver: null, list: [], byId: new Map() };
export async function bank(env) {
  if (Date.now() - WC.at < 60000 && WC.list.length) return WC;
  const ver = await meta(env, 'words_version', '0');
  if (ver !== WC.ver || !WC.list.length) {
    const rows = await all(env, 'SELECT id, slug, word, pos, meaning_fa, definition, example, category_id, level_no FROM words WHERE is_active=1 ORDER BY category_id, level_no, id');
    const list = rows.map(r => ({ id: r.slug, pk: r.id, word: r.word, pos: r.pos, fa: r.meaning_fa, def: r.definition, ex: r.example, cat: r.category_id, level: r.level_no }));
    WC = { at: Date.now(), ver, list, byId: new Map(list.map(w => [w.id, w])) };
  } else WC.at = Date.now();
  return WC;
}
export const customWords = async (env, uid) => (await all(env, 'SELECT * FROM user_custom_words WHERE user_id=? AND deleted=0 ORDER BY created_at', uid)).map(r => ({ ...customOut(r), cat: 'custom', level: 1 }));
export async function wordById(env, uid, id) {
  if (id.startsWith('custom:')) { const r = await one(env, 'SELECT * FROM user_custom_words WHERE user_id=? AND slug=? AND deleted=0', uid, id); return r ? { ...customOut(r), cat: 'custom', level: 1 } : null; }
  return (await bank(env)).byId.get(id) || null;
}
export async function allWords(env, uid) { return (await bank(env)).list.concat(await customWords(env, uid)); }

/* ---------- time (user's time zone, default Tehran) ---------- */
function parts(tz, ts = Date.now()) {
  const f = new Intl.DateTimeFormat('en-CA', { timeZone: tz, year: 'numeric', month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit', hourCycle: 'h23' });
  const o = {}; for (const p of f.formatToParts(new Date(ts))) o[p.type] = p.value;
  return o;
}
export function dayKey(tz, offset = 0) { const p = parts(tz, Date.now() + offset * DAY); return `${p.year}-${p.month}-${p.day}`; }
export function localHM(tz) { const p = parts(tz); return `${p.hour}:${p.minute}`; }
export function localHour(tz) { return +parts(tz).hour; }
export function startOfDay(tz, offset = 0) {
  const p = parts(tz), utcMid = Date.UTC(+p.year, +p.month - 1, +p.day + offset);
  const off = Date.UTC(+p.year, +p.month - 1, +p.day, +p.hour, +p.minute) - Math.floor(Date.now() / 60000) * 60000;  // tz offset
  return utcMid - off;
}

/* ---------- per-update context ---------- */
export async function loadProfile(env, uid) {
  const r = await one(env, 'SELECT * FROM user_profile WHERE user_id=?', uid);
  const p = r ? profileOut(r) : { settings: {}, onboarded: false, xp: 0, streak: { count: 0, best: 0, last: null, freezes: 0 }, games: { matchBest: null, speedBest: 0 }, notified: null };
  p.settings = { ...DEFAULT_SETTINGS, ...(p.settings || {}) };
  p.streak = { count: 0, best: 0, last: null, freezes: 0, ...(p.streak || {}) };
  p.games = { matchBest: null, speedBest: 0, ...(p.games || {}) };
  return p;
}
export class Ctx {
  constructor(env, user, prof, state) { this.env = env; this.u = user; this.p = prof; this.st = state; this.rev = null; this.dirtyP = false; this.dirtyS = false; this.events = []; }
  get lang() { return this.p.settings.lang === 'en' ? 'en' : 'fa'; }
  get tz() { return this.u.tz || 'Asia/Tehran'; }
  async getRev() { if (this.rev == null) this.rev = await nextRev(this.env, this.u.id); return this.rev; }
  async flush() {
    const st = [];
    if (this.dirtyP) st.push(profileUpsert(this.env, this.u.id, await this.getRev(), now(), this.p));
    if (this.dirtyS) st.push(q(this.env, 'INSERT INTO bot_state(user_id,data,updated_at) VALUES(?,?,?) ON CONFLICT(user_id) DO UPDATE SET data=excluded.data, updated_at=excluded.updated_at', this.u.id, JSON.stringify(this.st), now()));
    if (st.length) await this.env.DB.batch(st);
    this.dirtyP = this.dirtyS = false;
  }
  saveState() { this.dirtyS = true; }
  saveProfile() { this.dirtyP = true; }
}

/* ---------- progress ---------- */
export const newP = () => ({ seen: false, reps: 0, ease: 2.5, interval: 0, due: 0, lapses: 0, ok: 0, bad: 0, star: false, note: '', first: 0, last: 0 });
export async function getP(ctx, id) { const r = await one(ctx.env, 'SELECT * FROM user_progress WHERE user_id=? AND word_slug=?', ctx.u.id, id); return r && !r.deleted ? progressOut(r) : null; }
export async function progressMap(ctx) { const m = new Map(); for (const r of await all(ctx.env, 'SELECT * FROM user_progress WHERE user_id=? AND deleted=0', ctx.u.id)) m.set(r.word_slug, progressOut(r)); return m; }
export async function saveP(ctx, id, p) { await progressUpsert(ctx.env, ctx.u.id, await ctx.getRev(), [progressRow(id, now(), p)]).run(); }
export async function resetP(ctx, id) { await progressUpsert(ctx.env, ctx.u.id, await ctx.getRev(), [progressRow(id, now(), null)]).run(); }
export const status = p => (!p || !p.seen ? 'new' : p.interval >= 21 ? 'mastered' : p.interval >= 3 ? 'review' : 'learning');
export const box = p => { if (!p || !p.seen) return 0; const i = p.interval; return i < 1 ? 1 : i < 3 ? 2 : i < 7 ? 3 : i < 21 ? 4 : i < 60 ? 5 : 6; };
export const goodInterval = p => (!p || !p.reps ? 1 : p.reps === 1 ? 3 : Math.max(Math.floor(p.interval) + 1, Math.round(p.interval * p.ease)));
export async function dueIds(ctx, limit = 200) { return (await all(ctx.env, 'SELECT word_slug FROM user_progress WHERE user_id=? AND seen=1 AND deleted=0 AND due_at<=? ORDER BY due_at LIMIT ?', ctx.u.id, now(), limit)).map(r => r.word_slug); }
export async function dueCount(env, uid) { return (await one(env, 'SELECT COUNT(*) c FROM user_progress WHERE user_id=? AND seen=1 AND deleted=0 AND due_at<=?', uid, now())).c; }
export async function counts(env, uid) {
  const r = await one(env, 'SELECT COALESCE(SUM(seen),0) l, COALESCE(SUM(CASE WHEN seen=1 AND interval_days>=21 THEN 1 ELSE 0 END),0) m FROM user_progress WHERE user_id=? AND deleted=0', uid);
  return { learned: r.l, mastered: r.m };
}

/* ---------- activity, streak, XP ---------- */
export const levelOf = xp => Math.floor(Math.sqrt(xp / 40)) + 1;
export const levelRange = l => [40 * (l - 1) ** 2, 40 * l * l];
function updateStreak(ctx) {
  const s = ctx.p.streak, today = dayKey(ctx.tz);
  if (s.last === today) return;
  if (s.last === dayKey(ctx.tz, -1)) s.count++;
  else if (s.last === dayKey(ctx.tz, -2) && s.freezes > 0) { s.freezes--; s.count++; }
  else s.count = 1;
  s.last = today; s.best = Math.max(s.best || 0, s.count);
  if (s.count % 7 === 0) s.freezes = Math.min(2, (s.freezes || 0) + 1);
}
export function streakNow(ctx) {
  const s = ctx.p.streak; if (!s.last) return 0;
  return [dayKey(ctx.tz), dayKey(ctx.tz, -1)].includes(s.last) || (s.last === dayKey(ctx.tz, -2) && s.freezes > 0) ? s.count : 0;
}
export async function logDay(ctx, inc, xp = 0) {
  updateStreak(ctx);
  if (xp) { const before = levelOf(ctx.p.xp); ctx.p.xp += xp; if (levelOf(ctx.p.xp) > before) ctx.events.push('levelup:' + levelOf(ctx.p.xp)); }
  ctx.saveProfile();
  const d = { reviews: 0, new_words: 0, correct: 0, wrong: 0, xp, ...inc };
  await run(ctx.env, `INSERT INTO user_daily_activity(user_id,day,reviews,new_words,correct,wrong,xp,rev) VALUES(?,?,?,?,?,?,?,?)
    ON CONFLICT(user_id,day) DO UPDATE SET reviews=reviews+excluded.reviews, new_words=new_words+excluded.new_words, correct=correct+excluded.correct,
    wrong=wrong+excluded.wrong, xp=xp+excluded.xp, rev=excluded.rev`, ctx.u.id, dayKey(ctx.tz), d.reviews, d.new_words, d.correct, d.wrong, d.xp, await ctx.getRev());
}
export async function today(ctx) { return (await one(ctx.env, 'SELECT * FROM user_daily_activity WHERE user_id=? AND day=?', ctx.u.id, dayKey(ctx.tz))) || { reviews: 0, new_words: 0, correct: 0, wrong: 0, xp: 0 }; }

/** same rules as the web app (VY.rate) */
export async function rate(ctx, id, kind, days = 0) {
  const p = (await getP(ctx, id)) || newP(), t = now(), sod = startOfDay(ctx.tz);
  const isNew = !p.seen;
  if (isNew) { p.seen = true; p.first = t; }
  p.last = t;
  if (kind === 'again') { p.lapses++; p.bad++; p.ease = Math.max(1.3, p.ease - 0.2); p.reps = 0; p.interval = 0; p.due = t; }
  else if (kind === 'good') { p.interval = goodInterval(p); p.reps++; p.ok++; p.ease = Math.min(3.0, p.ease + 0.05); p.due = sod + p.interval * DAY; }
  else if (kind === 'days') { p.interval = days; p.reps = Math.max(1, p.reps + 1); p.ok++; if (days <= 1) p.ease = Math.max(1.3, p.ease - 0.1); if (days >= 30) p.ease = Math.min(3.0, p.ease + 0.1); p.due = sod + days * DAY; }
  else if (kind === 'known') { p.interval = 120; p.reps = Math.max(3, p.reps); p.ok++; p.ease = 2.8; p.due = sod + 120 * DAY; }
  else if (kind === 'add') { p.due = t; p.interval = 0; await saveP(ctx, id, p); if (isNew) await logDay(ctx, { new_words: 1 }); return p; }
  await saveP(ctx, id, p);
  const ok = kind !== 'again';
  await logDay(ctx, { reviews: 1, correct: ok ? 1 : 0, wrong: ok ? 0 : 1, new_words: isNew ? 1 : 0 }, ok ? 10 : 2);
  await checkAch(ctx);
  return p;
}
export async function quizResult(ctx, id, ok) {
  const p = await getP(ctx, id);
  if (p) { if (ok) p.ok++; else { p.bad++; if (p.seen) { p.due = Math.min(p.due, now()); p.interval = Math.min(p.interval, 1); } } await saveP(ctx, id, p); }
  await logDay(ctx, { correct: ok ? 1 : 0, wrong: ok ? 0 : 1 }, ok ? 5 : 0);
}
export async function toggleStar(ctx, id) { const p = (await getP(ctx, id)) || newP(); p.star = !p.star; await saveP(ctx, id, p); return p.star; }

/* ---------- achievements (same ids as the web app) ---------- */
export const ACH = [
  ['first', '🌱', ['First step', 'Learn your first word'], ['اولین قدم', 'اولین لغت را یاد بگیرید'], s => s.learned >= 1],
  ['w25', '📗', ['Word collector', 'Learn 25 words'], ['جمع‌کنندهٔ لغت', '۲۵ لغت یاد بگیرید'], s => s.learned >= 25],
  ['w100', '📚', ['Bookworm', 'Learn 100 words'], ['کرم کتاب', '۱۰۰ لغت یاد بگیرید'], s => s.learned >= 100],
  ['w300', '🧠', ['Word wizard', 'Learn 300 words'], ['جادوگر لغت', '۳۰۰ لغت یاد بگیرید'], s => s.learned >= 300],
  ['m10', '💎', ['Long-term memory', 'Master 10 words'], ['حافظهٔ بلندمدت', 'در ۱۰ لغت تسلط کامل پیدا کنید'], s => s.mastered >= 10],
  ['s3', '🔥', ['On fire', '3-day streak'], ['داغ داغ', '۳ روز پیاپی'], s => s.best >= 3],
  ['s7', '⚡', ['One week strong', '7-day streak'], ['یک هفتهٔ کامل', '۷ روز پیاپی'], s => s.best >= 7],
  ['s30', '👑', ['Unstoppable', '30-day streak'], ['توقف‌ناپذیر', '۳۰ روز پیاپی'], s => s.best >= 30],
  ['q1', '📝', ['Quiz taker', 'Finish your first quiz'], ['آزمون‌دهنده', 'اولین آزمون را تمام کنید'], s => s.quizzes >= 1],
  ['q100', '🏆', ['Perfectionist', 'Score 100% in a quiz'], ['کمال‌گرا', 'در یک آزمون ۱۰۰٪ بگیرید'], s => s.perfect],
  ['xp1k', '⭐', ['Rising star', 'Earn 1,000 XP'], ['ستارهٔ در حال طلوع', '۱۰۰۰ امتیاز کسب کنید'], s => s.xp >= 1000],
  ['goal', '🎯', ['Goal getter', 'Reach your daily goal'], ['هدف‌گیر', 'به هدف روزانه برسید'], s => s.goalHit],
  ['custom', '✍️', ['Curator', 'Add 5 of your own words'], ['گردآورنده', '۵ لغت شخصی اضافه کنید'], s => s.custom >= 5],
  ['game', '🎮', ['Player', 'Finish a match game'], ['بازیکن', 'یک بازی جفت‌یابی را تمام کنید'], s => s.match],
];
export async function achieved(env, uid) { const m = {}; for (const r of await all(env, 'SELECT achievement_id, unlocked_at FROM user_achievements WHERE user_id=?', uid)) m[r.achievement_id] = r.unlocked_at; return m; }
export async function checkAch(ctx) {
  const env = ctx.env, uid = ctx.u.id;
  const r = await one(env, `SELECT
    (SELECT COALESCE(SUM(seen),0) FROM user_progress WHERE user_id=?1 AND deleted=0) learned,
    (SELECT COUNT(*) FROM user_progress WHERE user_id=?1 AND deleted=0 AND seen=1 AND interval_days>=21) mastered,
    (SELECT COALESCE(MAX(reviews),0) FROM user_daily_activity WHERE user_id=?1) mx,
    (SELECT COUNT(*) FROM user_custom_words WHERE user_id=?1 AND deleted=0) custom,
    (SELECT COUNT(*) FROM quiz_results WHERE user_id=?1) quizzes,
    (SELECT COUNT(*) FROM quiz_results WHERE user_id=?1 AND score=total AND total>=5) perfect`, uid);
  const s = { learned: r.learned, mastered: r.mastered, best: ctx.p.streak.best || 0, quizzes: r.quizzes, perfect: r.perfect > 0, xp: ctx.p.xp, goalHit: r.mx >= ctx.p.settings.goal, custom: r.custom, match: ctx.p.games.matchBest != null };
  const have = await achieved(env, uid), add = [];
  for (const [id, , , , ok] of ACH) if (!have[id] && ok(s)) { add.push({ a: id, t: now() }); ctx.events.push('ach:' + id); }
  if (add.length) await run(env, `INSERT OR IGNORE INTO user_achievements(user_id,achievement_id,unlocked_at,rev) SELECT ?1, json_extract(value,'$.a'), json_extract(value,'$.t'), ?2 FROM json_each(?3)`, uid, await ctx.getRev(), JSON.stringify(add));
}
export const achInfo = (id, lang) => { const a = ACH.find(x => x[0] === id); return a ? [a[1], lang === 'fa' ? a[3] : a[2]] : ['🏅', [id, '']]; };

/* ---------- custom words ---------- */
export async function addCustom(ctx, w) {
  const slug = 'custom:' + w.word.toLowerCase();
  const ex = await one(ctx.env, 'SELECT deleted FROM user_custom_words WHERE user_id=? AND slug=?', ctx.u.id, slug);
  if (ex && !ex.deleted) return false;
  await customUpsert(ctx.env, ctx.u.id, await ctx.getRev(), [customRow(slug, now(), { word: w.word, pos: w.pos || 'n', fa: w.fa || '', def: w.def || '', ex: w.ex || '' })]).run();
  return true;
}
export async function deleteCustom(ctx, slug) { await customUpsert(ctx.env, ctx.u.id, await ctx.getRev(), [customRow(slug, now(), null)]).run(); }
export async function saveQuiz(ctx, score, total) { await run(ctx.env, 'INSERT OR IGNORE INTO quiz_results(user_id,taken_at,score,total,rev) VALUES(?,?,?,?,?)', ctx.u.id, now(), score, total, await ctx.getRev()); }

export const shuffle = a => { a = a.slice(); for (let i = a.length - 1; i > 0; i--) { const j = Math.floor(Math.random() * (i + 1)); [a[i], a[j]] = [a[j], a[i]]; } return a; };
export function wordOfDay(list, track, tz) {
  const pool = list.filter(w => w.cat === (track || 'general')); const P = pool.length ? pool : list;
  const d = Math.floor(startOfDay(tz) / DAY);
  return P[(d * 7919) % P.length];
}
