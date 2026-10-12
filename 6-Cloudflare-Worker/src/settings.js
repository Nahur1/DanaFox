/* app-wide settings editable from the admin panel (stored in meta.app_settings; defaults come from wrangler vars) */
import { meta, setMeta } from './util.js';
const flag = (v, d) => (v == null || v === '' ? d : /^(1|true|yes|on)$/i.test(String(v)));
let CACHE = { at: 0, v: null };
export function defaults(env) {
  return { registration: flag(env.ALLOW_REGISTRATION, true), guest: flag(env.ALLOW_GUEST, true),
    maintenance: false, maintenance_msg: '', notice: '', notice_level: 'info', notice_bot: false, bot_new_users: true };
}
export async function getSettings(env, fresh = false) {
  if (!fresh && CACHE.v && Date.now() - CACHE.at < 15000) return CACHE.v;
  let s = {}; try { s = JSON.parse((await meta(env, 'app_settings')) || '{}'); } catch (e) {}
  CACHE = { at: Date.now(), v: { ...defaults(env), ...s } };
  return CACHE.v;
}
export async function saveSettings(env, patch) {
  const cur = await getSettings(env, true), d = defaults(env), next = { ...cur };
  for (const k of Object.keys(d)) {
    if (!(k in patch)) continue;
    if (typeof d[k] === 'boolean') next[k] = !!patch[k];
    else if (k === 'notice_level') next[k] = ['info', 'success', 'warning', 'danger'].includes(patch[k]) ? patch[k] : 'info';
    else next[k] = String(patch[k] ?? '').slice(0, 600);
  }
  await setMeta(env, 'app_settings', JSON.stringify(next));
  CACHE = { at: Date.now(), v: next };
  return next;
}
