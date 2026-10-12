/* Telegram broadcasts: the admin panel drives sending in small steps (free plan = 50 outgoing requests per invocation),
   the cron trigger finishes any broadcast that is still running if the panel was closed. */
import { one, all, run, now, tehranDay } from './util.js';
import { tg, publicOrigin } from './bot/telegram.js';

const WEEK = 7 * 86400000;
export const AUDIENCES = ['all', 'active7', 'inactive7', 'linked', 'tg_only'];
export function audienceWhere(aud) {
  const d7 = tehranDay(now() - 6 * 86400000), t7 = now() - WEEK;
  const active = `(u.last_bot_at >= ${t7} OR u.last_sync_at >= ${t7} OR EXISTS (SELECT 1 FROM user_daily_activity d WHERE d.user_id=u.id AND d.day >= '${d7}'))`;
  const base = 'u.telegram_id IS NOT NULL AND u.blocked_bot=0 AND u.blocked=0';
  switch (aud) {
    case 'active7': return `${base} AND ${active}`;
    case 'inactive7': return `${base} AND NOT ${active}`;
    case 'linked': return `${base} AND (u.email IS NOT NULL OR u.phone IS NOT NULL)`;
    case 'tg_only': return `${base} AND u.email IS NULL AND u.phone IS NULL`;
    default: return base;
  }
}
export async function audienceCounts(env) {
  const out = {};
  for (const a of AUDIENCES) out[a] = (await one(env, `SELECT COUNT(*) c FROM users u WHERE ${audienceWhere(a)}`)).c;
  return out;
}
export async function messageFor(env, b) {
  const kb = [];
  if (b.button_url) kb.push([{ text: (b.button_text || '🔗 Open').slice(0, 64), url: b.button_url }]);
  if (b.open_app) { const o = await publicOrigin(env); if (o) kb.push([{ text: (b.button_url ? '📚 واژه‌یار' : (b.button_text || '📚 باز کردن واژه‌یار')).slice(0, 64), web_app: { url: `${o}/?tg=1` } }]); }
  return { text: b.text, parse_mode: 'HTML', link_preview_options: { is_disabled: true }, ...(kb.length ? { reply_markup: { inline_keyboard: kb } } : {}) };
}

/** sends to the next `limit` recipients; safe to call concurrently (the cursor is claimed with a compare-and-set) */
export async function broadcastStep(env, id, limit = 25) {
  const b = await one(env, 'SELECT * FROM broadcasts WHERE id=?', id);
  if (!b || b.status !== 'running') return b;
  const rows = await all(env, `SELECT u.id, u.telegram_id FROM users u WHERE ${audienceWhere(b.audience)} AND u.id > ? ORDER BY u.id LIMIT ?`, b.cursor, limit);
  if (!rows.length) {
    await run(env, "UPDATE broadcasts SET status='done', finished_at=?, updated_at=? WHERE id=? AND status='running'", now(), now(), id);
    return one(env, 'SELECT * FROM broadcasts WHERE id=?', id);
  }
  const claim = await run(env, 'UPDATE broadcasts SET cursor=?, updated_at=? WHERE id=? AND cursor=? AND status=?', rows[rows.length - 1].id, now(), id, b.cursor, 'running');
  if (!claim.meta || !claim.meta.changes) return one(env, 'SELECT * FROM broadcasts WHERE id=?', id);   // another step took this batch
  const msg = await messageFor(env, b);
  let sent = 0, failed = 0, blocked = 0, last = b.cursor;
  for (const r of rows) {
    try { await tg(env, 'sendMessage', { chat_id: r.telegram_id, ...msg }); sent++; }
    catch (e) {
      if (e.code === 429) break;                                            // flood limit: continue from here next step
      if (e.code === 403) { blocked++; await run(env, 'UPDATE users SET blocked_bot=1 WHERE id=?', r.id); }
      else failed++;
    }
    last = r.id;
  }
  await run(env, 'UPDATE broadcasts SET sent=sent+?, failed=failed+?, blocked=blocked+?, cursor=?, updated_at=? WHERE id=?', sent, failed, blocked, last, now(), id);
  return one(env, 'SELECT * FROM broadcasts WHERE id=?', id);
}

/** cron: continue running broadcasts; returns the number of Telegram requests used */
export async function broadcastCron(env, budget = 40) {
  let used = 0;
  const list = await all(env, "SELECT id, updated_at FROM broadcasts WHERE status='running' ORDER BY id LIMIT 3");
  for (const b of list) {
    if (now() - b.updated_at < 45000) continue;              // the admin panel is driving it right now
    while (used < budget) {
      const r = await broadcastStep(env, b.id, Math.min(20, budget - used));
      used += Math.min(20, budget - used);
      if (!r || r.status !== 'running') break;
    }
  }
  return used;
}
