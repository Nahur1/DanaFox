/* passwords (PBKDF2-SHA256), session tokens, login parsing, Telegram signatures */
import { one, run, now } from './util.js';
const enc = new TextEncoder();
const b64u = buf => btoa(String.fromCharCode(...new Uint8Array(buf))).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
const unb64u = s => Uint8Array.from(atob(s.replace(/-/g, '+').replace(/_/g, '/') + '==='.slice((s.length + 3) % 4)), c => c.charCodeAt(0));
const hex = buf => [...new Uint8Array(buf)].map(b => b.toString(16).padStart(2, '0')).join('');
export const ITER = 20000;

async function pbkdf2(pw, salt, iter) {
  const key = await crypto.subtle.importKey('raw', enc.encode(pw), 'PBKDF2', false, ['deriveBits']);
  return crypto.subtle.deriveBits({ name: 'PBKDF2', hash: 'SHA-256', salt, iterations: iter }, key, 256);
}
export async function hashPassword(pw) {
  const salt = crypto.getRandomValues(new Uint8Array(16));
  return `pbkdf2$${ITER}$${b64u(salt)}$${b64u(await pbkdf2(pw, salt, ITER))}`;
}
export async function verifyPassword(pw, stored) {
  if (!stored || !pw) return false;
  const [alg, it, salt, h] = stored.split('$');
  if (alg !== 'pbkdf2') return false;
  const got = new Uint8Array(await pbkdf2(pw, unb64u(salt), parseInt(it, 10)));
  const exp = unb64u(h);
  if (got.length !== exp.length) return false;
  let d = 0; for (let i = 0; i < got.length; i++) d |= got[i] ^ exp[i];
  return d === 0;
}
export const sha256 = async s => hex(await crypto.subtle.digest('SHA-256', enc.encode(s)));
export const newToken = (n = 32) => b64u(crypto.getRandomValues(new Uint8Array(n)));
export function newCode(len = 8) {
  const A = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789'; const r = crypto.getRandomValues(new Uint8Array(len));
  return [...r].map(x => A[x % A.length]).join('');
}

const FA = { '۰': '0', '۱': '1', '۲': '2', '۳': '3', '۴': '4', '۵': '5', '۶': '6', '۷': '7', '۸': '8', '۹': '9', '٠': '0', '١': '1', '٢': '2', '٣': '3', '٤': '4', '٥': '5', '٦': '6', '٧': '7', '٨': '8', '٩': '9' };
const EMAIL = /^[^@\s]+@[^@\s]+\.[^@\s]{2,}$/;
/** -> ['email'|'phone', value] or [null, errorCode] */
export function parseLogin(raw) {
  let s = String(raw || '').trim().replace(/[۰-۹٠-٩]/g, c => FA[c]);
  if (s.includes('@')) { s = s.toLowerCase(); return EMAIL.test(s) && s.length <= 120 ? ['email', s] : [null, 'bad_email']; }
  let d = s.replace(/[\s\-().]/g, '');
  if (d.startsWith('00')) d = '+' + d.slice(2);
  if (/^09\d{9}$/.test(d)) return ['phone', '+98' + d.slice(1)];
  if (/^9\d{9}$/.test(d)) return ['phone', '+98' + d];
  if (/^989\d{9}$/.test(d)) return ['phone', '+' + d];
  if (/^\+\d{8,15}$/.test(d)) return ['phone', d];
  return [null, 'bad_login'];
}
export const passwordError = pw => (!pw || pw.length < 6 ? 'weak_password' : pw.length > 128 ? 'long_password' : null);

/* login rate limiting (stored in D1 so it works across Worker instances): 8 failures → 10 minute block */
export async function isBlocked(env, key) { const r = await one(env, 'SELECT fails, until FROM login_attempts WHERE key=?', key); return !!(r && r.fails >= 8 && r.until > now()); }
export const failAttempt = (env, key) => run(env, `INSERT INTO login_attempts(key,fails,until) VALUES(?,1,?) ON CONFLICT(key) DO UPDATE SET
  fails = CASE WHEN until < ? THEN 1 ELSE fails + 1 END, until = ?`, key, now() + 600000, now(), now() + 600000);
export const clearAttempts = (env, key) => run(env, 'DELETE FROM login_attempts WHERE key=?', key);

/* Telegram Mini App initData check — https://core.telegram.org/bots/webapps#validating-data-received-via-the-mini-app */
async function hmac(key, msg) {
  const k = await crypto.subtle.importKey('raw', typeof key === 'string' ? enc.encode(key) : key, { name: 'HMAC', hash: 'SHA-256' }, false, ['sign']);
  return new Uint8Array(await crypto.subtle.sign('HMAC', k, enc.encode(msg)));
}
export async function verifyInitData(initData, botToken, maxAgeSec = 7 * 86400) {
  if (!initData || !botToken) return null;
  const p = new URLSearchParams(initData); const h = p.get('hash'); if (!h) return null;
  p.delete('hash');
  const dcs = [...p.entries()].sort(([a], [b]) => (a < b ? -1 : 1)).map(([k, v]) => `${k}=${v}`).join('\n');
  const secret = await hmac('WebAppData', botToken);
  if (hex(await hmac(secret, dcs)) !== h) return null;
  if (now() / 1000 - parseInt(p.get('auth_date') || '0', 10) > maxAgeSec) return null;
  try { return JSON.parse(p.get('user') || 'null'); } catch (e) { return null; }
}
