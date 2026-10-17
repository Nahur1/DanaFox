/* Two-way sync between devices and D1 — same protocol as the self-hosted Python server.
   request  {since, changes:{profile:{u,data}, progress:{slug:{u,data|null}}, days:{day:{…}}, custom:{slug:{u,data|null}}, kv:{key:{u,data|null}}, ach:{id:ts}, quizzes:[…]}}
   response {rev, changes:{…rows changed after `since`}, reset?}
   Rules: progress/custom/profile → newest edit wins; days → per-field max; achievements → union; quizzes → append. */
import { one, all, run, q, now, int, num, str, meta, setMeta } from './util.js';

export const progressOut = r => r.deleted ? null : ({ seen: !!r.seen, reps: r.reps, ease: r.ease, interval: r.interval_days, due: r.due_at, lapses: r.lapses,
  ok: r.correct_count, bad: r.wrong_count, star: !!r.starred, note: r.note, first: r.first_seen_at, last: r.last_seen_at });
export const profileOut = r => ({ settings: JSON.parse(r.settings_json || '{}'), onboarded: !!r.onboarded, xp: r.xp,
  streak: { count: r.streak_count, best: r.streak_best, last: r.streak_last, freezes: r.streak_freezes },
  games: { matchBest: r.match_best, speedBest: r.speed_best }, notified: r.notified });
export const customOut = r => r.deleted ? null : ({ id: r.slug, word: r.word, pos: r.pos, fa: r.meaning_fa, def: r.definition, ex: r.example });
export const dayOut = r => ({ reviews: r.reviews, newWords: r.new_words, correct: r.correct, wrong: r.wrong, xp: r.xp });
const chunk = (a, n) => { const o = []; for (let i = 0; i < a.length; i += n) o.push(a.slice(i, i + n)); return o; };
const J = JSON.stringify;

export const nextRev = async (env, uid) => (await one(env, 'UPDATE users SET rev=rev+1 WHERE id=? RETURNING rev', uid)).rev;

/* ---------- SQL building blocks (also used by the Telegram bot and account merging) ---------- */
export const progressUpsert = (env, uid, rev, rows) => q(env, `INSERT INTO user_progress(user_id,word_slug,seen,reps,ease,interval_days,due_at,lapses,correct_count,wrong_count,starred,note,first_seen_at,last_seen_at,deleted,updated_at,rev)
  SELECT ?1, json_extract(value,'$.s'), json_extract(value,'$.seen'), json_extract(value,'$.reps'), json_extract(value,'$.ease'), json_extract(value,'$.ivl'), json_extract(value,'$.due'),
    json_extract(value,'$.lapses'), json_extract(value,'$.ok'), json_extract(value,'$.bad'), json_extract(value,'$.star'), json_extract(value,'$.note'), json_extract(value,'$.first'),
    json_extract(value,'$.last'), json_extract(value,'$.del'), json_extract(value,'$.u'), ?2 FROM json_each(?3) WHERE true
  ON CONFLICT(user_id,word_slug) DO UPDATE SET seen=excluded.seen, reps=excluded.reps, ease=excluded.ease, interval_days=excluded.interval_days, due_at=excluded.due_at,
    lapses=excluded.lapses, correct_count=excluded.correct_count, wrong_count=excluded.wrong_count, starred=excluded.starred, note=excluded.note,
    first_seen_at=excluded.first_seen_at, last_seen_at=excluded.last_seen_at, deleted=excluded.deleted, updated_at=excluded.updated_at, rev=excluded.rev`, uid, rev, J(rows));
export function progressRow(slug, u, d) {
  if (!d) return { s: slug, u, seen: 0, reps: 0, ease: 2.5, ivl: 0, due: 0, lapses: 0, ok: 0, bad: 0, star: 0, note: '', first: 0, last: 0, del: 1 };
  return { s: slug, u, seen: d.seen ? 1 : 0, reps: int(d.reps), ease: num(d.ease, 2.5), ivl: num(d.interval), due: int(d.due), lapses: int(d.lapses), ok: int(d.ok), bad: int(d.bad),
    star: d.star ? 1 : 0, note: str(d.note, 1000), first: int(d.first), last: int(d.last), del: 0 };
}
export const daysUpsert = (env, uid, rev, rows) => q(env, `INSERT INTO user_daily_activity(user_id,day,reviews,new_words,correct,wrong,xp,rev)
  SELECT ?1, json_extract(value,'$.day'), json_extract(value,'$.reviews'), json_extract(value,'$.new_words'), json_extract(value,'$.correct'), json_extract(value,'$.wrong'), json_extract(value,'$.xp'), ?2
  FROM json_each(?3) WHERE true ON CONFLICT(user_id,day) DO UPDATE SET reviews=excluded.reviews, new_words=excluded.new_words, correct=excluded.correct, wrong=excluded.wrong, xp=excluded.xp, rev=excluded.rev`, uid, rev, J(rows));
export const customUpsert = (env, uid, rev, rows) => q(env, `INSERT INTO user_custom_words(user_id,slug,word,pos,meaning_fa,definition,example,deleted,created_at,updated_at,rev)
  SELECT ?1, json_extract(value,'$.s'), json_extract(value,'$.word'), json_extract(value,'$.pos'), json_extract(value,'$.fa'), json_extract(value,'$.def'), json_extract(value,'$.ex'),
    json_extract(value,'$.del'), json_extract(value,'$.u'), json_extract(value,'$.u'), ?2 FROM json_each(?3) WHERE true
  ON CONFLICT(user_id,slug) DO UPDATE SET word=excluded.word, pos=excluded.pos, meaning_fa=excluded.meaning_fa, definition=excluded.definition, example=excluded.example,
    deleted=excluded.deleted, updated_at=excluded.updated_at, rev=excluded.rev`, uid, rev, J(rows));
export function customRow(slug, u, d) {
  if (!d) return { s: slug, u, word: slug.split(':').slice(1).join(':') || slug, pos: 'n', fa: '', def: '', ex: '', del: 1 };
  return { s: slug, u, word: str(d.word, 80), pos: str(d.pos || 'n', 8), fa: str(d.fa, 300), def: str(d.def, 600), ex: str(d.ex, 600), del: 0 };
}
/* generic key/value records (reading results, placement test, plan state …): newest edit wins */
export const kvUpsert = (env, uid, rev, rows) => q(env, `INSERT INTO user_kv(user_id,k,data,deleted,updated_at,rev)
  SELECT ?1, json_extract(value,'$.s'), json_extract(value,'$.data'), json_extract(value,'$.del'), json_extract(value,'$.u'), ?2 FROM json_each(?3) WHERE true
  ON CONFLICT(user_id,k) DO UPDATE SET data=excluded.data, deleted=excluded.deleted, updated_at=excluded.updated_at, rev=excluded.rev`, uid, rev, J(rows));
export function kvRow(k, u, d) {
  if (d == null) return { s: k, u, data: 'null', del: 1 };
  const t = J(d);
  return { s: k, u, data: t.length > 60000 ? 'null' : t, del: t.length > 60000 ? 1 : 0 };
}
export const kvOut = r => { if (r.deleted) return null; try { return JSON.parse(r.data); } catch (e) { return null; } };
export const profileUpsert = (env, uid, rev, u, d, prevXp = 0, prevBest = 0) => {
  const st = d.streak || {}, gm = d.games || {};
  return q(env, `INSERT INTO user_profile(user_id,settings_json,onboarded,xp,streak_count,streak_best,streak_last,streak_freezes,match_best,speed_best,notified,updated_at,rev)
    VALUES(?,?,?,?,?,?,?,?,?,?,?,?,?) ON CONFLICT(user_id) DO UPDATE SET settings_json=excluded.settings_json, onboarded=excluded.onboarded, xp=excluded.xp,
    streak_count=excluded.streak_count, streak_best=excluded.streak_best, streak_last=excluded.streak_last, streak_freezes=excluded.streak_freezes,
    match_best=excluded.match_best, speed_best=excluded.speed_best, notified=excluded.notified, updated_at=excluded.updated_at, rev=excluded.rev`,
    uid, J(d.settings || {}).slice(0, 20000), d.onboarded ? 1 : 0, Math.max(int(d.xp), prevXp), int(st.count), Math.max(int(st.best), prevBest), st.last || null, int(st.freezes),
    gm.matchBest == null ? null : int(gm.matchBest), int(gm.speedBest), d.notified || null, u, rev);
};

/* ---------- merge incoming changes ---------- */
async function merge(env, uid, rev, ch, forced) {
  const stmts = [];
  const p = ch.profile;
  if (p && typeof p === 'object' && p.data && typeof p.data === 'object') {
    const u = int(p.u), ex = await one(env, 'SELECT updated_at, xp, streak_best FROM user_profile WHERE user_id=?', uid);
    if (!ex || u >= ex.updated_at) stmts.push(profileUpsert(env, uid, rev, u, p.data, ex ? ex.xp : 0, ex ? ex.streak_best : 0));
    else forced.profile = true;
  }
  const lww = async (items, table, keyCol, rowFn, upsert, forcedSet) => {
    const keys = Object.keys(items || {}).filter(k => items[k] && typeof items[k] === 'object').slice(0, 50000);
    if (!keys.length) return;
    const exist = new Map();
    for (const c of chunk(keys, 500)) for (const r of await all(env, `SELECT ${keyCol} k, updated_at FROM ${table} WHERE user_id=? AND ${keyCol} IN (SELECT value FROM json_each(?))`, uid, J(c))) exist.set(r.k, r.updated_at);
    const rows = [];
    for (const k of keys) {
      const it = items[k], u = int(it.u), slug = str(k, 200);
      if (exist.has(slug) && u < exist.get(slug)) { forcedSet.add(slug); continue; }
      rows.push(rowFn(slug, u, it.data));
    }
    for (const c of chunk(rows, 250)) stmts.push(upsert(env, uid, rev, c));
  };
  await lww(ch.progress, 'user_progress', 'word_slug', progressRow, progressUpsert, forced.progress);
  await lww(ch.custom, 'user_custom_words', 'slug', customRow, customUpsert, forced.custom);
  if (ch.kv && typeof ch.kv === 'object') {
    const kv = {}; for (const k of Object.keys(ch.kv).slice(0, 2000)) if (/^[\w:.\-]{1,80}$/.test(k)) kv[k] = ch.kv[k];
    await lww(kv, 'user_kv', 'k', (k, u, d) => kvRow(k, u, d), kvUpsert, forced.kv);
  }

  const days = Object.keys(ch.days || {}).filter(d => d.length === 10 && ch.days[d] && typeof ch.days[d] === 'object').slice(0, 5000);
  if (days.length) {
    const exist = new Map();
    for (const c of chunk(days, 500)) for (const r of await all(env, 'SELECT * FROM user_daily_activity WHERE user_id=? AND day IN (SELECT value FROM json_each(?))', uid, J(c))) exist.set(r.day, r);
    const rows = [];
    for (const day of days) {
      const d = ch.days[day], nw = { reviews: int(d.reviews), new_words: int(d.newWords), correct: int(d.correct), wrong: int(d.wrong), xp: int(d.xp) };
      const ex = exist.get(day);
      if (ex) {
        const m = {}; let same = true, lower = false;
        for (const k in nw) { m[k] = Math.max(nw[k], ex[k]); if (m[k] !== ex[k]) same = false; if (m[k] !== nw[k]) lower = true; }
        if (same) { if (lower) forced.days.add(day); continue; }
        rows.push({ day, ...m });
      } else rows.push({ day, ...nw });
    }
    for (const c of chunk(rows, 300)) stmts.push(daysUpsert(env, uid, rev, c));
  }
  const ach = Object.entries(ch.ach || {}).slice(0, 200).map(([a, t]) => ({ a: str(a, 40), t: int(t) }));
  if (ach.length) stmts.push(q(env, `INSERT OR IGNORE INTO user_achievements(user_id,achievement_id,unlocked_at,rev) SELECT ?1, json_extract(value,'$.a'), json_extract(value,'$.t'), ?2 FROM json_each(?3)`, uid, rev, J(ach)));
  const qz = (Array.isArray(ch.quizzes) ? ch.quizzes : []).filter(x => x && x.d).slice(0, 1000).map(x => ({ d: int(x.d), s: int(x.score), t: int(x.total) }));
  if (qz.length) stmts.push(q(env, `INSERT OR IGNORE INTO quiz_results(user_id,taken_at,score,total,rev) SELECT ?1, json_extract(value,'$.d'), json_extract(value,'$.s'), json_extract(value,'$.t'), ?2 FROM json_each(?3)`, uid, rev, J(qz)));
  if (!stmts.length) return false;
  const res = await env.DB.batch(stmts);
  return res.some(r => r.meta && r.meta.changes > 0);
}

const newForced = () => ({ profile: false, progress: new Set(), days: new Set(), custom: new Set(), kv: new Set() });
export async function changesSince(env, uid, since, forced = newForced()) {
  const out = {};
  const pr = await one(env, 'SELECT * FROM user_profile WHERE user_id=? AND (rev>? OR ?)', uid, since, forced.profile ? 1 : 0);
  if (pr) out.profile = { u: pr.updated_at, data: profileOut(pr) };
  const pick = async (table, key, set) => {
    let rows = await all(env, `SELECT * FROM ${table} WHERE user_id=? AND rev>?`, uid, since);
    if (set.size) rows = rows.concat(await all(env, `SELECT * FROM ${table} WHERE user_id=? AND rev<=? AND ${key} IN (SELECT value FROM json_each(?))`, uid, since, J([...set])));
    return rows;
  };
  out.progress = {}; for (const r of await pick('user_progress', 'word_slug', forced.progress)) out.progress[r.word_slug] = progressOut(r);
  out.days = {}; for (const r of await pick('user_daily_activity', 'day', forced.days)) out.days[r.day] = dayOut(r);
  out.custom = {}; for (const r of await pick('user_custom_words', 'slug', forced.custom)) out.custom[r.slug] = customOut(r);
  out.kv = {}; for (const r of await pick('user_kv', 'k', forced.kv || new Set())) out.kv[r.k] = kvOut(r);
  out.ach = {}; for (const r of await all(env, 'SELECT * FROM user_achievements WHERE user_id=? AND rev>?', uid, since)) out.ach[r.achievement_id] = r.unlocked_at;
  out.quizzes = (await all(env, 'SELECT * FROM quiz_results WHERE user_id=? AND rev>? ORDER BY taken_at', uid, since)).map(r => ({ d: r.taken_at, score: r.score, total: r.total }));
  return out;
}

export async function sync(env, uid, since, changes) {
  const forced = newForced();
  const rev = await nextRev(env, uid);
  await merge(env, uid, rev, changes || {}, forced);
  await run(env, 'UPDATE users SET last_sync_at=? WHERE id=?', now(), uid);
  since = Math.max(0, Math.min(int(since), rev));
  const reset = await meta(env, `reset:${uid}`);
  if (reset && since > 0 && since < int(reset)) return { rev, reset: true, changes: await changesSince(env, uid, 0, forced) };
  return { rev, changes: await changesSince(env, uid, since, forced) };
}

const DATA_TABLES = ['user_kv', 'user_progress', 'user_daily_activity', 'user_custom_words', 'user_achievements', 'quiz_results', 'user_profile'];
export async function wipe(env, uid) {
  await env.DB.batch(DATA_TABLES.map(t => q(env, `DELETE FROM ${t} WHERE user_id=?`, uid)));
  const rev = await nextRev(env, uid);
  await setMeta(env, `reset:${uid}`, rev);
}

/** Move all learning data of `fromId` into `toId` (used when a Telegram account is linked to a web account), then delete `fromId`. */
export async function mergeAccounts(env, fromId, toId) {
  const rev = await nextRev(env, toId);
  const stmts = [
    // progress & custom words: keep the most recently changed version of each word
    q(env, `INSERT INTO user_progress(user_id,word_slug,seen,reps,ease,interval_days,due_at,lapses,correct_count,wrong_count,starred,note,first_seen_at,last_seen_at,deleted,updated_at,rev)
      SELECT ?2,word_slug,seen,reps,ease,interval_days,due_at,lapses,correct_count,wrong_count,starred,note,first_seen_at,last_seen_at,deleted,updated_at,?3 FROM user_progress WHERE user_id=?1 AND true
      ON CONFLICT(user_id,word_slug) DO UPDATE SET seen=excluded.seen, reps=excluded.reps, ease=excluded.ease, interval_days=excluded.interval_days, due_at=excluded.due_at,
        lapses=excluded.lapses, correct_count=excluded.correct_count, wrong_count=excluded.wrong_count, starred=excluded.starred, note=excluded.note,
        first_seen_at=excluded.first_seen_at, last_seen_at=excluded.last_seen_at, deleted=excluded.deleted, updated_at=excluded.updated_at, rev=excluded.rev
      WHERE excluded.updated_at > user_progress.updated_at`, fromId, toId, rev),
    q(env, `INSERT INTO user_custom_words(user_id,slug,word,pos,meaning_fa,definition,example,deleted,created_at,updated_at,rev)
      SELECT ?2,slug,word,pos,meaning_fa,definition,example,deleted,created_at,updated_at,?3 FROM user_custom_words WHERE user_id=?1 AND true
      ON CONFLICT(user_id,slug) DO UPDATE SET word=excluded.word, pos=excluded.pos, meaning_fa=excluded.meaning_fa, definition=excluded.definition, example=excluded.example,
        deleted=excluded.deleted, updated_at=excluded.updated_at, rev=excluded.rev WHERE excluded.updated_at > user_custom_words.updated_at`, fromId, toId, rev),
    q(env, `INSERT INTO user_daily_activity(user_id,day,reviews,new_words,correct,wrong,xp,rev) SELECT ?2,day,reviews,new_words,correct,wrong,xp,?3 FROM user_daily_activity WHERE user_id=?1 AND true
      ON CONFLICT(user_id,day) DO UPDATE SET reviews=user_daily_activity.reviews+excluded.reviews, new_words=user_daily_activity.new_words+excluded.new_words,
        correct=user_daily_activity.correct+excluded.correct, wrong=user_daily_activity.wrong+excluded.wrong, xp=user_daily_activity.xp+excluded.xp, rev=excluded.rev`, fromId, toId, rev),
    q(env, `INSERT OR IGNORE INTO user_achievements(user_id,achievement_id,unlocked_at,rev) SELECT ?2,achievement_id,unlocked_at,?3 FROM user_achievements WHERE user_id=?1`, fromId, toId, rev),
    q(env, `INSERT INTO user_kv(user_id,k,data,deleted,updated_at,rev) SELECT ?2,k,data,deleted,updated_at,?3 FROM user_kv WHERE user_id=?1 AND true
      ON CONFLICT(user_id,k) DO UPDATE SET data=excluded.data, deleted=excluded.deleted, updated_at=excluded.updated_at, rev=excluded.rev WHERE excluded.updated_at > user_kv.updated_at`, fromId, toId, rev),
    q(env, `INSERT OR IGNORE INTO quiz_results(user_id,taken_at,score,total,rev) SELECT ?2,taken_at,score,total,?3 FROM quiz_results WHERE user_id=?1`, fromId, toId, rev),
    // profile: keep the web account's settings, add up XP, keep the best records
    q(env, `INSERT INTO user_profile(user_id,settings_json,onboarded,xp,streak_count,streak_best,streak_last,streak_freezes,match_best,speed_best,notified,updated_at,rev)
      SELECT ?2,settings_json,onboarded,xp,streak_count,streak_best,streak_last,streak_freezes,match_best,speed_best,notified,?4,?3 FROM user_profile WHERE user_id=?1 AND true
      ON CONFLICT(user_id) DO UPDATE SET xp=user_profile.xp+excluded.xp, onboarded=MAX(user_profile.onboarded,excluded.onboarded),
        streak_best=MAX(user_profile.streak_best,excluded.streak_best),
        streak_count=CASE WHEN COALESCE(excluded.streak_last,'') > COALESCE(user_profile.streak_last,'') THEN excluded.streak_count ELSE user_profile.streak_count END,
        streak_last=MAX(COALESCE(user_profile.streak_last,''),COALESCE(excluded.streak_last,'')),
        match_best=CASE WHEN user_profile.match_best IS NULL THEN excluded.match_best WHEN excluded.match_best IS NULL THEN user_profile.match_best ELSE MIN(user_profile.match_best,excluded.match_best) END,
        speed_best=MAX(user_profile.speed_best,excluded.speed_best), updated_at=excluded.updated_at, rev=excluded.rev`, fromId, toId, rev, now()),
    q(env, 'DELETE FROM users WHERE id=?', fromId),
  ];
  await env.DB.batch(stmts);
}
