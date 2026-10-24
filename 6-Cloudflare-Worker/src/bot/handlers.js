/* DanaFox Telegram bot — webhook handler. Every user's data lives in the same D1 tables as the web app,
   so the bot, the in-Telegram mini app, the web app and the desktop app all share one account. */
import { one, all, run, now } from '../util.js';
import { newCode } from '../security.js';
import { mergeAccounts } from '../sync.js';
import { telegramUser } from '../auth.js';
import { isAdminTg, isAdminUser, tehranDay, tehranMidnight } from '../util.js';
import { getSettings } from '../settings.js';
import { tg, publicOrigin, botUsername, adminCommands } from './telegram.js';
import { t, n as N, esc } from './texts.js';
import * as E from './engine.js';

const enc = new TextEncoder();
const blen = s => enc.encode(s).length;

/* ---------- small UI helpers ---------- */
const B = (text, data) => ({ text, callback_data: data });
const U = (text, url) => ({ text, url });
const WA = (text, url) => ({ text, web_app: { url } });
function idOf(w) { if (!w) return null; if (blen(w.id) <= 54) return w.id; return w.pk ? '#' + w.pk : null; }
async function resolveId(ctx, s) { if (s.startsWith('#')) { const b = await E.bank(ctx.env); const w = b.list.find(x => x.pk === +s.slice(1)); return w ? w.id : null; } return s; }
const posName = (ctx, p) => (E.POS_NAMES[p] || [p, p])[ctx.lang === 'fa' ? 1 : 0];
const catName = (ctx, c) => (E.CAT_NAMES[c] || [c, c])[ctx.lang === 'fa' ? 1 : 0];
const lvName = (ctx, c, l) => ((E.LEVEL_NAMES[c] || [])[l - 1] || [String(l), String(l)])[ctx.lang === 'fa' ? 1 : 0];
const T = (ctx, k, v) => t(ctx.lang, k, v);
const n = (ctx, x) => N(ctx.lang, x);
const bar = (v, max, w = 10) => { const f = Math.max(0, Math.min(w, Math.round((max ? v / max : 0) * w))); return '▰'.repeat(f) + '▱'.repeat(w - f); };
function daysText(ctx, d) {
  d = Math.round(d);
  if (d <= 0) return T(ctx, 'now');
  if (d < 30) return n(ctx, d) + ' ' + T(ctx, 'day_u');
  if (d < 365) return n(ctx, Math.round(d / 30)) + ' ' + T(ctx, 'month_u');
  return n(ctx, Math.round(d / 365)) + ' ' + T(ctx, 'year_u');
}
function whenText(ctx, due) {
  const d = Math.floor((due - E.startOfDay(ctx.tz)) / E.DAY);
  return d <= 0 ? T(ctx, 'today') : d === 1 ? T(ctx, 'tomorrow') : daysText(ctx, d);
}

async function send(ctx, text, kb, extra = {}) {
  return tg(ctx.env, 'sendMessage', { chat_id: ctx.chat, text, parse_mode: 'HTML', disable_web_page_preview: true, ...(kb ? { reply_markup: { inline_keyboard: kb } } : {}), ...extra });
}
async function show(ctx, text, kb) {      // edit the current screen when coming from a button, otherwise send a new message
  if (ctx.msgId) {
    try { return await tg(ctx.env, 'editMessageText', { chat_id: ctx.chat, message_id: ctx.msgId, text, parse_mode: 'HTML', disable_web_page_preview: true, reply_markup: { inline_keyboard: kb || [] } }); }
    catch (e) { if (/not modified/.test(e.message)) return; }
  }
  return send(ctx, text, kb);
}
const toast = (ctx, text, alert = false) => { ctx.toast = { text: String(text).slice(0, 190), alert }; };

/* ---------- pronunciation (Google TTS → Telegram voice, file_id cached in D1) ---------- */
async function speak(ctx, text, accent, slow = false) {
  text = String(text || '').slice(0, 190); if (!text) return;
  accent = accent || ctx.p.settings.accent;
  const key = `${accent}|${slow ? 1 : 0}|${text.toLowerCase()}`;
  const c = await one(ctx.env, 'SELECT file_id FROM tts_cache WHERE key=?', key);
  if (c) { try { return await tg(ctx.env, 'sendVoice', { chat_id: ctx.chat, voice: c.file_id, caption: '🔊 ' + text }); } catch (e) {} }
  const host = accent === 'en-GB' ? 'translate.google.co.uk' : 'translate.google.com';
  const r = await fetch(`https://${host}/translate_tts?ie=UTF-8&client=tw-ob&tl=en&ttsspeed=${slow ? 0.3 : 1}&q=${encodeURIComponent(text)}`, { headers: { 'User-Agent': 'Mozilla/5.0', Referer: `https://${host}/` } });
  if (!r.ok) { toast(ctx, '🔇 ' + (ctx.lang === 'fa' ? 'تلفظ در دسترس نیست' : 'Audio unavailable')); return; }
  const fd = new FormData();
  fd.append('chat_id', String(ctx.chat)); fd.append('caption', '🔊 ' + text);
  fd.append('voice', new Blob([await r.arrayBuffer()], { type: 'audio/mpeg' }), 'voice.mp3');
  const m = await tg(ctx.env, 'sendVoice', fd);
  const fid = (m.voice || m.audio || m.document || {}).file_id;
  if (fid) await run(ctx.env, 'INSERT OR REPLACE INTO tts_cache(key,file_id) VALUES(?,?)', key, fid);
}

/* ---------- online lookup for "my words" ---------- */
async function lookup(word) {
  const out = { word, pos: 'n', fa: '', def: '', ex: '' };
  try {
    const r = await fetch('https://api.dictionaryapi.dev/api/v2/entries/en/' + encodeURIComponent(word));
    if (r.ok) {
      const j = await r.json(), m = j[0] && j[0].meanings && j[0].meanings[0];
      if (m) {
        const map = { noun: 'n', verb: 'v', adjective: 'adj', adverb: 'adv', preposition: 'prep', conjunction: 'conj' };
        out.pos = map[m.partOfSpeech] || 'n';
        const d = m.definitions.find(x => x.example) || m.definitions[0];
        out.def = (d && d.definition) || ''; out.ex = (d && d.example) || '';
      }
    }
  } catch (e) {}
  try {
    const r = await fetch('https://translate.googleapis.com/translate_a/single?client=gtx&sl=en&tl=fa&dt=t&q=' + encodeURIComponent(word));
    if (r.ok) { const j = await r.json(); out.fa = (j[0] || []).map(x => x[0]).join('').trim(); }
  } catch (e) {}
  return out;
}

/* =====================================================================  screens  */
function greet(ctx) { const h = E.localHour(ctx.tz); return T(ctx, h < 12 ? 'morning' : h < 17 ? 'afternoon' : h < 21 ? 'evening' : 'night'); }
async function appUrl(ctx) { const o = await publicOrigin(ctx.env); return o ? o + '/?tg=1' : null; }

async function home(ctx) {
  const [due, c, d] = await Promise.all([E.dueCount(ctx.env, ctx.u.id), E.counts(ctx.env, ctx.u.id), E.today(ctx)]);
  const goal = ctx.p.settings.goal, lv = E.levelOf(ctx.p.xp), [a, b] = E.levelRange(lv);
  const name = esc(ctx.u.display_name || ctx.u.tg_name || '');
  const linked = !!(ctx.u.email || ctx.u.phone);
  const st = await getSettings(ctx.env);
  const notice = st.notice && st.notice_bot ? `${T(ctx, 'notice')} <b>${esc(st.notice)}</b>\n\n` : '';
  const text = notice + `<b>${greet(ctx)}${name ? '، ' + name : ''}</b> 👋\n\n` +
    `🎯 ${T(ctx, 'home_goal')}: <b>${n(ctx, Math.min(d.reviews, goal))}/${n(ctx, goal)}</b>\n${bar(d.reviews, goal)}\n\n` +
    `🔥 <b>${n(ctx, E.streakNow(ctx))}</b> ${T(ctx, 'home_streak')}   ⭐ <b>${n(ctx, ctx.p.xp)}</b> ${T(ctx, 'home_xp')}\n` +
    `🏅 ${T(ctx, 'home_level')} <b>${n(ctx, lv)}</b>  ${bar(ctx.p.xp - a, b - a, 8)}\n` +
    `🧠 <b>${n(ctx, c.learned)}</b> ${T(ctx, 'home_learned')} · 💎 <b>${n(ctx, c.mastered)}</b> ${T(ctx, 'home_mastered')}\n\n` +
    (due ? `🔁 ${T(ctx, 'home_due')}: <b>${n(ctx, due)}</b> ${T(ctx, 'words')}` : T(ctx, 'home_nodue')) +
    `\n\n<i>${linked ? T(ctx, 'sync_note') : T(ctx, 'saved_bot')}</i>`;
  const url = await appUrl(ctx);
  const kb = [
    [B(T(ctx, 'b_review') + (due ? ` (${n(ctx, due)})` : ''), 'rv'), B(T(ctx, 'b_learn'), 'lrn')],
    [B(T(ctx, 'b_quiz'), 'q'), B(T(ctx, 'b_games'), 'g'), B(T(ctx, 'b_dict'), 'd')],
    [B(T(ctx, 'b_wotd'), 'wd'), B(T(ctx, 'b_mywords'), 'm')],
    [B(T(ctx, 'b_stats'), 's'), B(T(ctx, 'b_settings'), 'st')],
    [B(T(ctx, 'b_account'), 'acc'), B(T(ctx, 'b_help'), 'help')],
  ];
  if (url) kb.push([WA(T(ctx, 'b_app'), url)]);
  return show(ctx, text, kb);
}

/* ---------- onboarding ---------- */
async function onboarding(ctx, step) {
  if (step === 'lang') return show(ctx, t('fa', 'welcome') + '\n\n' + t('en', 'welcome'), [[B('🇮🇷 فارسی', 'ol:fa'), B('🇬🇧 English', 'ol:en')]]);
  if (step === 'track') return show(ctx, T(ctx, 'onb_track'), [[B(T(ctx, 'tr_general'), 'ot:general')], [B(T(ctx, 'tr_ielts'), 'ot:ielts')], [B(T(ctx, 'tr_toefl'), 'ot:toefl')]]);
  return show(ctx, T(ctx, 'onb_goal'), [[B(`${T(ctx, 'g_casual')} · ${n(ctx, 10)}`, 'og:10'), B(`${T(ctx, 'g_regular')} · ${n(ctx, 20)}`, 'og:20')], [B(`${T(ctx, 'g_serious')} · ${n(ctx, 30)}`, 'og:30'), B(`${T(ctx, 'g_intense')} · ${n(ctx, 50)}`, 'og:50')]]);
}

/* ---------- learn: categories → levels → deck ---------- */
async function learnCats(ctx) {
  const b = await E.bank(ctx.env), pm = await E.progressMap(ctx);
  const kb = Object.keys(E.CATS).map(c => { const ws = b.list.filter(w => w.cat === c); const l = ws.filter(w => (pm.get(w.id) || {}).seen).length; return [B(`${E.CAT_ICON[c]} ${catName(ctx, c)} · ${n(ctx, l)}/${n(ctx, ws.length)}`, 'lc:' + c)]; });
  const cw = await E.customWords(ctx.env, ctx.u.id);
  if (cw.length) kb.push([B(`✍️ ${catName(ctx, 'custom')} · ${n(ctx, cw.length)}`, 'ld:custom:1')]);
  kb.push([B(T(ctx, 'b_home'), 'h')]);
  return show(ctx, T(ctx, 'learn_title'), kb);
}
async function levels(ctx, cat) {
  const b = await E.bank(ctx.env), pm = await E.progressMap(ctx);
  const kb = [];
  for (let l = 1; l <= E.CATS[cat]; l++) {
    const ws = b.list.filter(w => w.cat === cat && w.level === l), learned = ws.filter(w => (pm.get(w.id) || {}).seen).length;
    kb.push([B(`${n(ctx, l)}. ${lvName(ctx, cat, l)} · ${n(ctx, learned)}/${n(ctx, ws.length)} ${learned === ws.length && ws.length ? '✅' : ''}`, `ld:${cat}:${l}`)]);
  }
  kb.push([B(T(ctx, 'b_back'), 'lrn'), B(T(ctx, 'b_home'), 'h')]);
  return show(ctx, `${E.CAT_ICON[cat]} <b>${catName(ctx, cat)}</b>\n${T(ctx, 'levels_title')}:`, kb);
}
async function deckWords(ctx, cat, lv) { return cat === 'custom' ? E.customWords(ctx.env, ctx.u.id) : (await E.bank(ctx.env)).list.filter(w => w.cat === cat && w.level === lv); }
async function deck(ctx, cat, lv) {
  const ws = await deckWords(ctx, cat, lv), pm = await E.progressMap(ctx);
  const st = { l: 0, m: 0, d: 0 }; for (const w of ws) { const p = pm.get(w.id); if (p && p.seen) { st.l++; if (p.interval >= 21) st.m++; if (p.due <= now()) st.d++; } }
  const title = cat === 'custom' ? `✍️ <b>${catName(ctx, 'custom')}</b>` : `${E.CAT_ICON[cat]} <b>${catName(ctx, cat)}</b> · ${lvName(ctx, cat, lv)}`;
  const text = `${title}\n\n📚 ${n(ctx, ws.length)} ${T(ctx, 'deck_words')}\n🧠 ${n(ctx, st.l)} ${T(ctx, 'deck_learned')} · 💎 ${n(ctx, st.m)} ${T(ctx, 'deck_mastered')} · 🔁 ${n(ctx, st.d)} ${T(ctx, 'deck_due')}\n${bar(st.l, ws.length)}` +
    (st.l === ws.length && ws.length ? '\n\n' + T(ctx, 'deck_done') : '');
  const kb = [];
  if (st.l < ws.length) kb.push([B(T(ctx, 'b_start'), `ls:${cat}:${lv}`)]);
  if (st.d) kb.push([B(`${T(ctx, 'b_review')} (${n(ctx, st.d)})`, `lr:${cat}:${lv}`)]);
  kb.push([B(T(ctx, 'b_browse'), `lb:${cat}:${lv}:0`)]);
  kb.push([B(T(ctx, 'b_back'), cat === 'custom' ? 'lrn' : 'lc:' + cat), B(T(ctx, 'b_home'), 'h')]);
  return show(ctx, text, kb);
}
async function browse(ctx, cat, lv, page) {
  const ws = await deckWords(ctx, cat, lv), pm = await E.progressMap(ctx), per = 10, pages = Math.max(1, Math.ceil(ws.length / per));
  page = Math.max(0, Math.min(pages - 1, page));
  const ico = { new: '⚪', learning: '🟡', review: '🟣', mastered: '💎' };
  const kb = ws.slice(page * per, page * per + per).map(w => { const id = idOf(w); return id ? [B(`${ico[E.status(pm.get(w.id))]} ${w.word} — ${w.fa}`.slice(0, 60), 'w:' + id)] : null; }).filter(Boolean);
  const nav = [];
  if (page > 0) nav.push(B('‹', `lb:${cat}:${lv}:${page - 1}`));
  nav.push(B(`${n(ctx, page + 1)}/${n(ctx, pages)}`, 'noop'));
  if (page < pages - 1) nav.push(B('›', `lb:${cat}:${lv}:${page + 1}`));
  kb.push(nav, [B(T(ctx, 'b_back'), `ld:${cat}:${lv}`)]);
  return show(ctx, `📖 <b>${cat === 'custom' ? catName(ctx, 'custom') : catName(ctx, cat) + ' · ' + lvName(ctx, cat, lv)}</b>\n⚪ ${T(ctx, 'st_new')} · 🟡 ${T(ctx, 'st_learning')} · 🟣 ${T(ctx, 'st_review')} · 💎 ${T(ctx, 'st_mastered')}`, kb);
}

/* ---------- flashcard sessions ---------- */
async function startSession(ctx, ids, mode, back) {
  if (!ids.length) return show(ctx, T(ctx, mode === 'review' ? 'no_due' : 'deck_done'), [[B(T(ctx, 'b_learn'), 'lrn'), B(T(ctx, 'b_quiz'), 'q')], [B(T(ctx, 'b_home'), 'h')]]);
  ctx.st.s = { q: ids, mode, back: back || 'h', flipped: false, n: 0, good: 0, again: 0, xp0: ctx.p.xp, front: null };
  ctx.saveState();
  return card(ctx);
}
async function learnNew(ctx, cat, lv) {
  const ws = await deckWords(ctx, cat, lv), pm = await E.progressMap(ctx);
  const fresh = ws.filter(w => !(pm.get(w.id) || {}).seen).slice(0, ctx.p.settings.sessionSize).map(w => w.id);
  return startSession(ctx, fresh, 'learn', `ld:${cat}:${lv}`);
}
async function card(ctx) {
  const s = ctx.st.s;
  if (!s || !s.q.length) return sessionDone(ctx);
  const w = await E.wordById(ctx.env, ctx.u.id, s.q[0]);
  if (!w) { s.q.shift(); ctx.saveState(); return card(ctx); }
  const p = await E.getP(ctx, w.id);
  if (!s.front) s.front = ctx.p.settings.front === 'mix' ? (Math.random() < 0.5 ? 'en' : 'fa') : ctx.p.settings.front;
  const head = `${E.CAT_ICON[w.cat] || ''} ${w.cat === 'custom' ? catName(ctx, 'custom') : catName(ctx, w.cat) + ' · ' + lvName(ctx, w.cat, w.level)}   ·   ${n(ctx, s.q.length)} ${ctx.lang === 'fa' ? 'کارت مانده' : 'left'}`;
  const star = p && p.star ? T(ctx, 'b_star_on') : T(ctx, 'b_star');
  let text;
  if (!s.flipped) {
    text = s.front === 'fa' ? `<i>${head}</i>\n\n🇮🇷 <b>${esc(w.fa)}</b>\n<i>(${posName(ctx, w.pos)})</i>\n\n${T(ctx, 'card_hint_fa')}`
      : `<i>${head}</i>\n\n🔤 <b>${esc(w.word)}</b>  <i>${posName(ctx, w.pos)}</i>\n\n${T(ctx, 'card_hint')}`;
    return show(ctx, text, [[B(T(ctx, 'b_show'), 'c:s')], [B(T(ctx, 'b_speak'), 'c:sp'), B(star, 'c:st'), B(T(ctx, 'b_exit'), 'c:x')]]);
  }
  const gi = E.goodInterval(p);
  text = `<i>${head}</i>\n\n🔤 <b>${esc(w.word)}</b>  <i>${posName(ctx, w.pos)}</i>\n🇮🇷 <b>${esc(w.fa)}</b>` +
    (w.def ? `\n\n📘 <i>${esc(w.def)}</i>` : '') + (w.ex ? `\n💬 ${esc(w.ex)}` : '') + (p && p.note ? `\n📝 ${esc(p.note)}` : '') +
    `\n\n${T(ctx, 'repeat_in')}`;
  return show(ctx, text, [
    [B(T(ctx, 'b_again'), 'c:r:again'), B(`${T(ctx, 'b_good')} · ${daysText(ctx, gi)}`, 'c:r:good')],
    [B(T(ctx, 'd1'), 'c:r:d:1'), B(T(ctx, 'd3'), 'c:r:d:3'), B(T(ctx, 'w1'), 'c:r:d:7'), B(T(ctx, 'm1'), 'c:r:d:30')],
    [B(T(ctx, 'b_know'), 'c:r:known'), B(T(ctx, 'b_speak'), 'c:sp'), B(T(ctx, 'b_speak_ex'), 'c:spx'), B(star, 'c:st')],
    [B(T(ctx, 'b_exit'), 'c:x')],
  ]);
}
async function rateCard(ctx, kind, days) {
  const s = ctx.st.s; if (!s || !s.q.length) return sessionExpired(ctx);
  const id = s.q.shift();
  await E.rate(ctx, id, kind, days);
  s.n++;
  if (kind === 'again') { s.again++; s.q.splice(Math.min(3, s.q.length), 0, id); toast(ctx, T(ctx, 'toast_again')); }
  else if (kind === 'known') { s.good++; toast(ctx, T(ctx, 'toast_known')); }
  else { s.good++; const p = await E.getP(ctx, id); toast(ctx, T(ctx, 'toast_good', { d: whenText(ctx, p.due) })); }
  s.flipped = false; s.front = null; ctx.saveState();
  return card(ctx);
}
async function sessionDone(ctx) {
  const s = ctx.st.s || { n: 0, good: 0, again: 0, xp0: ctx.p.xp, back: 'h' };
  delete ctx.st.s; ctx.saveState();
  const text = `${T(ctx, 'done_title')}\n${T(ctx, 'done_sub')}\n\n🔁 ${T(ctx, 'done_rev')}: <b>${n(ctx, s.n)}</b>\n✅ ${T(ctx, 'done_good')}: <b>${n(ctx, s.good)}</b>\n❌ ${T(ctx, 'done_again')}: <b>${n(ctx, s.again)}</b>\n⭐ ${T(ctx, 'done_xp')}: <b>+${n(ctx, ctx.p.xp - s.xp0)}</b>`;
  return show(ctx, text, [[B(T(ctx, 'b_more'), s.back && s.back.startsWith('ld:') ? s.back.replace('ld:', 'ls:') : 'lrn'), B(T(ctx, 'b_quiz_now'), 'q')], [B(T(ctx, 'b_home'), 'h')]]);
}
const sessionExpired = ctx => show(ctx, T(ctx, 'session_expired'), [[B(T(ctx, 'b_home'), 'h')]]);

/* ---------- quiz ---------- */
const QSRC = ['recent7', 'recent30', 'learned', 'starred', 'difficult', 'all'];
const QTYPES = ['mixed', 'enfa', 'faen', 'def', 'type', 'listen', 'blank', 'tf'];
async function quizPool(ctx, src) {
  const words = await E.allWords(ctx.env, ctx.u.id), pm = await E.progressMap(ctx), t0 = now();
  const f = { recent7: p => p && p.seen && t0 - p.last < 7 * E.DAY, recent30: p => p && p.seen && t0 - p.last < 30 * E.DAY, learned: p => p && p.seen,
    starred: p => p && p.star, difficult: p => p && p.seen && (p.bad > p.ok || p.lapses > 1), all: () => true }[src] || (() => true);
  return { pool: words.filter(w => f(pm.get(w.id))), words };
}
async function quizSetup(ctx) {
  const c = ctx.st.qc || (ctx.st.qc = { src: 'recent7', type: 'mixed', cnt: 10, timer: false });
  const { pool } = await quizPool(ctx, c.src);
  const sel = (on, label) => (on ? '● ' : '') + label;
  const kb = [
    QSRC.slice(0, 3).map(s => B(sel(c.src === s, T(ctx, 'src_' + s)), 'qc:src:' + s)), QSRC.slice(3).map(s => B(sel(c.src === s, T(ctx, 'src_' + s)), 'qc:src:' + s)),
    QTYPES.slice(0, 4).map(s => B(sel(c.type === s, T(ctx, 't_' + s)), 'qc:type:' + s)), QTYPES.slice(4).map(s => B(sel(c.type === s, T(ctx, 't_' + s)), 'qc:type:' + s)),
    [5, 10, 15, 20].map(k => B(sel(c.cnt === k, n(ctx, k)), 'qc:cnt:' + k)),
    [B((c.timer ? '✅ ' : '⬜ ') + T(ctx, 'q_timer'), 'qc:timer:x')],
    [B(T(ctx, 'b_qstart'), 'qgo')], [B(T(ctx, 'b_home'), 'h')],
  ];
  ctx.saveState();
  return show(ctx, `${T(ctx, 'quiz_title')}\n\n${T(ctx, 'q_source')} · ${T(ctx, 'q_type')} · ${T(ctx, 'q_count')}\n📚 ${n(ctx, pool.length)} ${T(ctx, 'q_available')}`, kb);
}
async function quizStart(ctx) {
  const c = ctx.st.qc || { src: 'recent7', type: 'mixed', cnt: 10, timer: false };
  const { pool, words } = await quizPool(ctx, c.src);
  if (pool.length < 4) return show(ctx, T(ctx, 'q_notenough'), [[B(T(ctx, 'b_learn'), 'lrn'), B(T(ctx, 'b_back'), 'q')]]);
  const items = E.shuffle(pool).slice(0, c.cnt).map(w => {
    let type = c.type === 'mixed' ? E.shuffle(['enfa', 'faen', 'def', 'type', 'blank', 'tf', 'enfa', 'faen'])[0] : c.type;
    if (type === 'def' && !w.def) type = 'enfa';
    if (type === 'blank' && !(w.ex && w.ex.toLowerCase().includes(w.word.toLowerCase()))) type = 'faen';
    const same = words.filter(x => x.id !== w.id && x.fa !== w.fa && x.word.toLowerCase() !== w.word.toLowerCase());
    const pref = same.filter(x => x.cat === w.cat && x.pos === w.pos);
    const distract = E.shuffle(pref.length >= 3 ? pref : same).slice(0, 3);
    const it = { id: w.id, type };
    if (type === 'tf') { it.claim = Math.random() < 0.5 ? w.id : distract[0].id; }
    else if (!['type', 'listen'].includes(type)) { const opts = E.shuffle([w, ...distract]); it.opts = opts.map(x => x.id); }
    return it;
  });
  ctx.st.qz = { items, i: 0, score: 0, wrong: [], answered: false, at: now(), timer: c.timer };
  ctx.saveState();
  return quizQuestion(ctx);
}
async function quizQuestion(ctx, feedback) {
  const z = ctx.st.qz; if (!z) return sessionExpired(ctx);
  if (z.i >= z.items.length) return quizEnd(ctx);
  const it = z.items[z.i], w = await E.wordById(ctx.env, ctx.u.id, it.id);
  if (!w) { z.i++; return quizQuestion(ctx); }
  const head = `📝 <b>${T(ctx, 'q_head', { i: n(ctx, z.i + 1), n: n(ctx, z.items.length) })}</b>  ${bar(z.i, z.items.length, 8)}${z.timer ? '  ⏱' : ''}\n\n`;
  let text = head, kb = [];
  const optWords = it.opts ? await Promise.all(it.opts.map(id => E.wordById(ctx.env, ctx.u.id, id))) : [];
  if (z.answered) {          // show result of the current question
    text = head + feedback + `\n\n🔤 <b>${esc(w.word)}</b> — ${esc(w.fa)}` + (w.def ? `\n📘 <i>${esc(w.def)}</i>` : '');
    kb = [[B(T(ctx, 'b_speak'), 'qsp'), B(z.i + 1 < z.items.length ? T(ctx, 'b_next') : T(ctx, 'b_finish'), 'qn')]];
    return show(ctx, text, kb);
  }
  const L = ctx.lang === 'fa' ? 'fa' : 'en';
  if (it.type === 'enfa') { text += `${T(ctx, 'q_what')}\n\n🔤 <b>${esc(w.word)}</b>`; kb = optWords.map((o, i) => [B(o.fa.slice(0, 60), 'qa:' + i)]); }
  else if (it.type === 'faen') { text += `${T(ctx, 'q_which')}\n\n🇮🇷 <b>${esc(w.fa)}</b>`; kb = [optWords.slice(0, 2).map((o, i) => B(o.word, 'qa:' + i)), optWords.slice(2).map((o, i) => B(o.word, 'qa:' + (i + 2)))]; }
  else if (it.type === 'def') { text += `${T(ctx, 'q_whichdef')}\n\n📘 <i>${esc(w.def)}</i>`; kb = [optWords.slice(0, 2).map((o, i) => B(o.word, 'qa:' + i)), optWords.slice(2).map((o, i) => B(o.word, 'qa:' + (i + 2)))]; }
  else if (it.type === 'blank') { const re = new RegExp(w.word.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'ig'); text += `${T(ctx, 'q_fill')}\n\n💬 ${esc(w.ex.replace(re, '_____'))}`; kb = [optWords.slice(0, 2).map((o, i) => B(o.word, 'qa:' + i)), optWords.slice(2).map((o, i) => B(o.word, 'qa:' + (i + 2)))]; }
  else if (it.type === 'tf') { const c = await E.wordById(ctx.env, ctx.u.id, it.claim); text += `${T(ctx, 'q_tf')}\n\n🔤 <b>${esc(w.word)}</b>  =  🇮🇷 <b>${esc((c || w).fa)}</b>`; kb = [[B(T(ctx, 'true'), 'qa:t'), B(T(ctx, 'false'), 'qa:f')]]; }
  else if (it.type === 'type') { text += `${T(ctx, 'q_typeit')}\n\n🇮🇷 <b>${esc(w.fa)}</b>  <i>(${posName(ctx, w.pos)}, ${n(ctx, w.word.length)} ${L === 'fa' ? 'حرف' : 'letters'})</i>`; kb = [[B(T(ctx, 'b_hint'), 'qh')]]; ctx.st.wait = 'qtype'; }
  else if (it.type === 'listen') { text += T(ctx, 'q_listen'); kb = [[B(T(ctx, 'b_play'), 'qsp'), B(T(ctx, 'b_slow'), 'qsl'), B(T(ctx, 'b_hint'), 'qh')]]; ctx.st.wait = 'qtype'; }
  kb.push([B(T(ctx, 'b_finish'), 'qe')]);
  z.at = now(); ctx.saveState();
  const r = await show(ctx, text, kb);
  if (it.type === 'listen' && !z.played) { z.played = true; await speak(ctx, w.word); }
  return r;
}
async function quizAnswer(ctx, ans) {
  const z = ctx.st.qz; if (!z || z.answered || z.i >= z.items.length) return;
  const it = z.items[z.i], w = await E.wordById(ctx.env, ctx.u.id, it.id);
  let ok;
  if (it.type === 'tf') ok = (ans === 't') === (it.claim === it.id);
  else if (typeof ans === 'string' && ans.startsWith('txt:')) ok = ans.slice(4).trim().toLowerCase().replace(/\s+/g, ' ') === w.word.toLowerCase();
  else ok = it.opts[+ans] === it.id;
  const late = z.timer && now() - z.at > 15000;
  if (late) ok = false;
  if (ok) z.score++; else z.wrong.push(it.id);
  z.answered = true; z.played = false; delete ctx.st.wait;
  await E.quizResult(ctx, it.id, ok);
  ctx.saveState();
  return quizQuestion(ctx, late ? T(ctx, 'timeup') : ok ? T(ctx, 'correct') : `${T(ctx, 'wrong')}\n${T(ctx, 'answer')}: <b>${esc(w.word)}</b>`);
}
async function quizEnd(ctx) {
  const z = ctx.st.qz; if (!z) return sessionExpired(ctx);
  const total = Math.min(z.i + (z.answered ? 1 : 0), z.items.length);
  if (total > 0) { await E.saveQuiz(ctx, z.score, total); await E.checkAch(ctx); }
  const pct = total ? Math.round(z.score / total * 100) : 0;
  const mistakes = (await Promise.all(z.wrong.map(id => E.wordById(ctx.env, ctx.u.id, id)))).filter(Boolean);
  ctx.st.lastWrong = z.wrong; delete ctx.st.qz; delete ctx.st.wait; ctx.saveState();
  const text = `${T(ctx, 'res_title')}\n\n🎯 <b>${n(ctx, z.score)}/${n(ctx, total)}</b> (${n(ctx, pct)}٪)\n${pct === 100 ? T(ctx, 'res_perfect') : pct >= 70 ? T(ctx, 'res_good') : T(ctx, 'res_keep')}\n\n` +
    (mistakes.length ? `<b>${T(ctx, 'res_mistakes')}:</b>\n` + mistakes.slice(0, 15).map(w => `• <b>${esc(w.word)}</b> — ${esc(w.fa)}`).join('\n') : T(ctx, 'res_nomistakes'));
  const kb = [];
  if (mistakes.length) kb.push([B(T(ctx, 'b_addmist'), 'qam')]);
  kb.push([B(T(ctx, 'b_retry'), 'qgo'), B(T(ctx, 'b_home'), 'h')]);
  return show(ctx, text, kb);
}

/* ---------- games ---------- */
async function gamesMenu(ctx) {
  const g = ctx.p.games;
  return show(ctx, `${T(ctx, 'games_title')}\n\n${T(ctx, 'match')} — ${T(ctx, 'match_sub')}\n🏆 ${T(ctx, 'best_time')}: ${g.matchBest != null ? n(ctx, g.matchBest) + ' ' + T(ctx, 'sec') : '—'}\n\n${T(ctx, 'speed')} — ${T(ctx, 'speed_sub')}\n🏆 ${T(ctx, 'best')}: ${n(ctx, g.speedBest || 0)}`,
    [[B(T(ctx, 'match'), 'gm'), B(T(ctx, 'speed'), 'gs')], [B(T(ctx, 'b_home'), 'h')]]);
}
async function gamePool(ctx) {
  const words = await E.allWords(ctx.env, ctx.u.id), pm = await E.progressMap(ctx);
  let p = words.filter(w => (pm.get(w.id) || {}).seen);
  if (p.length < 8) p = words.filter(w => w.cat === (ctx.p.settings.track || 'general') && w.level <= 2);
  return p;
}
async function matchStart(ctx) {
  const pool = E.shuffle(await gamePool(ctx)), pairs = []; const seenFa = new Set();
  for (const w of pool) { if (!seenFa.has(w.fa) && w.fa.length <= 28 && w.word.length <= 22) { pairs.push(w); seenFa.add(w.fa); } if (pairs.length === 5) break; }
  ctx.st.g = { k: 'm', ids: pairs.map(w => w.id), w: pairs.map(w => w.word), f: pairs.map(w => w.fa), L: E.shuffle([0, 1, 2, 3, 4]), R: E.shuffle([0, 1, 2, 3, 4]), done: [], sel: null, err: 0, at: now() };
  ctx.saveState();
  return matchBoard(ctx);
}
async function matchBoard(ctx, msg = '') {
  const g = ctx.st.g; if (!g || g.k !== 'm') return sessionExpired(ctx);
  const kb = g.L.map((li, row) => {
    const ri = g.R[row];
    const left = g.done.includes(li) ? B('✅', 'noop') : B((g.sel === li ? '👉 ' : '') + g.w[li], 'gml:' + li);
    const right = g.done.includes(ri) ? B('✅', 'noop') : B(g.f[ri], 'gmr:' + ri);
    return ctx.lang === 'fa' ? [right, left] : [left, right];
  });
  kb.push([B(T(ctx, 'b_exit'), 'g')]);
  return show(ctx, `${T(ctx, 'match_head')}\n\n❌ ${T(ctx, 'mistakes')}: ${n(ctx, g.err)}${msg ? '\n' + msg : ''}`, kb);
}
async function matchPick(ctx, side, i) {
  const g = ctx.st.g; if (!g || g.k !== 'm') return sessionExpired(ctx);
  if (side === 'l') { g.sel = i; ctx.saveState(); return matchBoard(ctx); }
  if (g.sel == null) { toast(ctx, ctx.lang === 'fa' ? 'اول یک لغت انگلیسی را بزنید' : 'Tap an English word first'); return; }
  if (g.sel === i) { g.done.push(i); g.sel = null; } else { g.err++; g.sel = null; toast(ctx, '❌'); }
  if (g.done.length === 5) {
    const sec = Math.round((now() - g.at) / 1000), best = ctx.p.games.matchBest;
    if (best == null || sec < best) ctx.p.games.matchBest = sec;
    await E.logDay(ctx, {}, 10); await E.checkAch(ctx);
    delete ctx.st.g; ctx.saveState();
    return show(ctx, T(ctx, 'match_done', { t: n(ctx, sec), e: n(ctx, g.err), b: n(ctx, ctx.p.games.matchBest) }), [[B(T(ctx, 'b_playagain'), 'gm'), B(T(ctx, 'b_back'), 'g')], [B(T(ctx, 'b_home'), 'h')]]);
  }
  ctx.saveState();
  return matchBoard(ctx);
}
async function speedNext(ctx) {
  const g = ctx.st.g, left = 60 - Math.floor((now() - g.at) / 1000);
  if (left <= 0) {
    const best = Math.max(ctx.p.games.speedBest || 0, g.score); ctx.p.games.speedBest = best;
    if (g.score) await E.logDay(ctx, {}, g.score * 2);
    delete ctx.st.g; ctx.saveState();
    return show(ctx, T(ctx, 'speed_done', { s: n(ctx, g.score), b: n(ctx, best) }), [[B(T(ctx, 'b_playagain'), 'gs'), B(T(ctx, 'b_back'), 'g')], [B(T(ctx, 'b_home'), 'h')]]);
  }
  const pool = await gamePool(ctx), w = pool[Math.floor(Math.random() * pool.length)];
  const opts = E.shuffle([w, ...E.shuffle(pool.filter(x => x.id !== w.id && x.fa !== w.fa)).slice(0, 3)]);
  g.cur = { id: w.id, opts: opts.map(o => o.id) }; ctx.saveState();
  return show(ctx, `${T(ctx, 'speed_head')}   ${T(ctx, 'speed_left', { s: n(ctx, left) })}   ✅ ${n(ctx, g.score)}\n\n🔤 <b>${esc(w.word)}</b>`, [...opts.map((o, i) => [B(o.fa.slice(0, 60), 'gsa:' + i)]), [B(T(ctx, 'b_exit'), 'g')]]);
}

/* ---------- dictionary & word view ---------- */
async function search(ctx, qtext) {
  const s = qtext.trim().toLowerCase(); if (!s) return;
  const words = await E.allWords(ctx.env, ctx.u.id);
  const exact = words.filter(w => w.word.toLowerCase() === s);
  const res = exact.concat(words.filter(w => !exact.includes(w) && (w.word.toLowerCase().includes(s) || w.fa.includes(qtext.trim())))).slice(0, 12);
  if (exact.length === 1 && res.length >= 1 && res[0] === exact[0]) return wordView(ctx, exact[0].id, true);
  if (!res.length) return send(ctx, T(ctx, 'dict_none', { q: esc(qtext.slice(0, 40)) }), [[B(T(ctx, 'b_addword'), 'ma'), B(T(ctx, 'b_home'), 'h')]]);
  return send(ctx, T(ctx, 'dict_results', { q: esc(qtext.slice(0, 40)), n: n(ctx, res.length) }), [...res.map(w => idOf(w) ? [B(`${w.word} — ${w.fa}`.slice(0, 60), 'w:' + idOf(w))] : null).filter(Boolean), [B(T(ctx, 'b_home'), 'h')]]);
}
async function dictionary(ctx) {
  ctx.st.wait = 'dict'; ctx.saveState();
  return show(ctx, T(ctx, 'dict_title'), [[B(T(ctx, 'b_browse'), 'lrn'), B(T(ctx, 'b_mywords'), 'm')], [B(T(ctx, 'b_home'), 'h')]]);
}
async function wordView(ctx, id, fresh = false) {
  const w = await E.wordById(ctx.env, ctx.u.id, id); if (!w) return toast(ctx, '—');
  const p = await E.getP(ctx, w.id), stt = E.status(p), cid = idOf(w);
  let text = `🔤 <b>${esc(w.word)}</b>  <i>${posName(ctx, w.pos)}</i>\n${E.CAT_ICON[w.cat] || ''} ${w.cat === 'custom' ? catName(ctx, 'custom') : catName(ctx, w.cat) + ' · ' + lvName(ctx, w.cat, w.level)}\n\n` +
    `🇮🇷 <b>${T(ctx, 'w_meaning')}:</b> ${esc(w.fa)}` + (w.def ? `\n📘 <b>${T(ctx, 'w_def')}:</b> <i>${esc(w.def)}</i>` : '') + (w.ex ? `\n💬 <b>${T(ctx, 'w_ex')}:</b> ${esc(w.ex)}` : '') +
    (p && p.note ? `\n📝 <b>${T(ctx, 'w_note')}:</b> ${esc(p.note)}` : '') +
    `\n\n📊 ${T(ctx, 'st_' + stt)}` + (p && p.seen ? ` · ${T(ctx, 'w_next')}: ${whenText(ctx, p.due)} · ${T(ctx, 'w_box')} ${n(ctx, E.box(p))}` : '');
  const kb = cid ? [
    [B(T(ctx, 'b_us'), 'ws:us:' + cid), B(T(ctx, 'b_uk'), 'ws:uk:' + cid)],
    [B(T(ctx, 'b_addrev'), 'wa:add:' + cid), B(T(ctx, 'b_known'), 'wa:known:' + cid), B(p && p.star ? '⭐' : '☆', 'wa:star:' + cid)],
    [B(T(ctx, 'b_note'), 'wa:note:' + cid), ...(p ? [B(T(ctx, 'b_reset'), 'wa:reset:' + cid)] : []), ...(w.cat === 'custom' ? [B(T(ctx, 'b_delete'), 'mdl:' + cid)] : [])],
    [B(T(ctx, 'b_home'), 'h')],
  ] : [[B(T(ctx, 'b_home'), 'h')]];
  return fresh ? send(ctx, text, kb) : show(ctx, text, kb);
}

/* ---------- my words ---------- */
async function myWords(ctx, page = 0) {
  const cw = await E.customWords(ctx.env, ctx.u.id), per = 8, pages = Math.max(1, Math.ceil(cw.length / per));
  page = Math.max(0, Math.min(pages - 1, page));
  const kb = cw.slice(page * per, page * per + per).map(w => idOf(w) ? [B(`${w.word} — ${w.fa}`.slice(0, 60), 'w:' + idOf(w))] : null).filter(Boolean);
  if (pages > 1) kb.push([...(page > 0 ? [B('‹', 'm:' + (page - 1))] : []), B(`${n(ctx, page + 1)}/${n(ctx, pages)}`, 'noop'), ...(page < pages - 1 ? [B('›', 'm:' + (page + 1))] : [])]);
  kb.push([B(T(ctx, 'b_addword'), 'ma')]);
  if (cw.length) kb.push([B(T(ctx, 'b_study_my'), 'ld:custom:1')]);
  kb.push([B(T(ctx, 'b_home'), 'h')]);
  return show(ctx, `${T(ctx, 'my_title')}\n\n${T(ctx, 'my_count')}: <b>${n(ctx, cw.length)}</b>`, kb);
}
async function addWords(ctx, text) {
  const lines = text.split('\n').map(l => l.trim()).filter(Boolean).slice(0, 15);
  let added = 0, dup = 0; const shown = [];
  let lookups = 0;
  for (const line of lines) {
    const parts = line.includes('|') ? line.split('|') : line.split(/\s+[-–—]\s+|\t/);
    const word = (parts[0] || '').trim().slice(0, 80); if (!word || !/[a-z]/i.test(word)) continue;
    let w = { word, pos: 'n', fa: (parts[1] || '').trim(), def: (parts[2] || '').trim(), ex: (parts[3] || '').trim() };
    if (!w.fa && lookups < 8) { lookups++; const l = await lookup(word); w = { ...l, word }; }
    if (!w.fa) w.fa = '—';
    if (await E.addCustom(ctx, w)) { added++; shown.push(`• <b>${esc(w.word)}</b> — ${esc(w.fa)}`); } else dup++;
  }
  await E.checkAch(ctx);
  delete ctx.st.wait; ctx.saveState();
  return send(ctx, (added ? T(ctx, 'added_n', { n: n(ctx, added) }) + '\n' + shown.join('\n') : '') + (dup ? '\n' + T(ctx, 'add_dup') : ''), [[B(T(ctx, 'b_addword'), 'ma'), B(T(ctx, 'b_mywords'), 'm')], [B(T(ctx, 'b_home'), 'h')]]);
}

/* ---------- stats & achievements ---------- */
async function stats(ctx) {
  const env = ctx.env, uid = ctx.u.id;
  const [c, d, agg, boxes, cats] = await Promise.all([
    E.counts(env, uid), E.today(ctx),
    one(env, 'SELECT COUNT(*) days, COALESCE(SUM(correct),0) ok, COALESCE(SUM(wrong),0) bad, (SELECT COUNT(*) FROM quiz_results WHERE user_id=?1) qz FROM user_daily_activity WHERE user_id=?1 AND reviews+correct+wrong>0', uid),
    all(env, `SELECT CASE WHEN interval_days<1 THEN 1 WHEN interval_days<3 THEN 2 WHEN interval_days<7 THEN 3 WHEN interval_days<21 THEN 4 WHEN interval_days<60 THEN 5 ELSE 6 END b, COUNT(*) c FROM user_progress WHERE user_id=? AND seen=1 AND deleted=0 GROUP BY 1`, uid),
    all(env, `SELECT w.category_id cat, COUNT(*) c FROM user_progress p JOIN words w ON w.slug=p.word_slug WHERE p.user_id=? AND p.seen=1 AND p.deleted=0 GROUP BY 1`, uid),
  ]);
  const b = await E.bank(env), totals = {}; for (const w of b.list) totals[w.cat] = (totals[w.cat] || 0) + 1;
  const acc = agg.ok + agg.bad ? Math.round(agg.ok / (agg.ok + agg.bad) * 100) : 0;
  const bm = Object.fromEntries(boxes.map(r => [r.b, r.c])), bmax = Math.max(1, ...boxes.map(r => r.c));
  const text = `${T(ctx, 'stats_title')}\n\n🧠 ${T(ctx, 's_learned')}: <b>${n(ctx, c.learned)}</b>\n💎 ${T(ctx, 's_mastered')}: <b>${n(ctx, c.mastered)}</b>\n🔥 ${T(ctx, 'home_streak')}: <b>${n(ctx, E.streakNow(ctx))}</b> · ${T(ctx, 's_best')}: <b>${n(ctx, ctx.p.streak.best || 0)}</b>\n` +
    `⭐ ${T(ctx, 'home_xp')}: <b>${n(ctx, ctx.p.xp)}</b> · ${T(ctx, 'home_level')} <b>${n(ctx, E.levelOf(ctx.p.xp))}</b>\n🎯 ${T(ctx, 's_acc')}: <b>${n(ctx, acc)}٪</b>\n📅 ${T(ctx, 's_days')}: <b>${n(ctx, agg.days)}</b> · 📝 ${T(ctx, 's_quizzes')}: <b>${n(ctx, agg.qz)}</b>\n` +
    `🛡 ${T(ctx, 's_freeze')}: <b>${n(ctx, ctx.p.streak.freezes || 0)}</b>\n📆 ${T(ctx, 's_today')}: <b>${n(ctx, d.reviews)}</b> 🔁 · <b>${n(ctx, d.new_words)}</b> ✨ · <b>+${n(ctx, d.xp)}</b> ⭐\n\n` +
    `<b>${T(ctx, 's_boxes')}</b>\n` + [1, 2, 3, 4, 5, 6].map(i => `${n(ctx, i)} ${bar(bm[i] || 0, bmax, 8)} ${n(ctx, bm[i] || 0)}`).join('\n') +
    `\n\n<b>${T(ctx, 's_cats')}</b>\n` + Object.keys(E.CATS).map(k => { const v = (cats.find(r => r.cat === k) || {}).c || 0; return `${E.CAT_ICON[k]} ${catName(ctx, k)}: ${bar(v, totals[k] || 1, 8)} ${n(ctx, v)}/${n(ctx, totals[k] || 0)}`; }).join('\n');
  return show(ctx, text, [[B(T(ctx, 'b_ach'), 'sa')], [B(T(ctx, 'b_home'), 'h')]]);
}
async function achievements(ctx) {
  const have = await E.achieved(ctx.env, ctx.u.id);
  const text = `${T(ctx, 'ach_title')}  ${n(ctx, Object.keys(have).length)}/${n(ctx, E.ACH.length)}\n\n` + E.ACH.map(([id, e, en, fa]) => { const L = ctx.lang === 'fa' ? fa : en; return `${have[id] ? e : '🔒'} <b>${L[0]}</b> — ${L[1]}`; }).join('\n');
  return show(ctx, text, [[B(T(ctx, 'b_back'), 's'), B(T(ctx, 'b_home'), 'h')]]);
}

/* ---------- settings ---------- */
async function settings(ctx) {
  const s = ctx.p.settings, on = v => (v ? '✅ ' + T(ctx, 'on') : '⬜ ' + T(ctx, 'off'));
  const sel = (cur, v, label) => B((String(cur) === String(v) ? '● ' : '') + label, `set:${arguments[4] || ''}`);
  const row = (key, opts) => opts.map(([v, l]) => B((String(s[key]) === String(v) ? '● ' : '') + l, `set:${key}:${v}`));
  const kb = [
    [B(T(ctx, 'set_lang'), 'noop')], row('lang', [['fa', 'فارسی'], ['en', 'English']]),
    [B(T(ctx, 'set_track'), 'noop')], row('track', [['general', '🌍'], ['ielts', '🎓 IELTS'], ['toefl', '🏛 TOEFL']]),
    [B(T(ctx, 'set_goal'), 'noop')], row('goal', [[10, n(ctx, 10)], [20, n(ctx, 20)], [30, n(ctx, 30)], [50, n(ctx, 50)]]),
    [B(T(ctx, 'set_session'), 'noop')], row('sessionSize', [[5, n(ctx, 5)], [10, n(ctx, 10)], [15, n(ctx, 15)], [20, n(ctx, 20)]]),
    [B(T(ctx, 'set_front'), 'noop')], row('front', [['en', T(ctx, 'front_en')], ['fa', T(ctx, 'front_fa')], ['mix', T(ctx, 'front_mix')]]),
    [B(T(ctx, 'set_accent'), 'noop')], row('accent', [['en-US', T(ctx, 'us')], ['en-GB', T(ctx, 'uk')]]),
    [B(`${T(ctx, 'set_reminder')}: ${on(s.reminder)}`, 'set:reminder:x'), B(`⏰ ${n(ctx, s.reminderTime)}`, 'pt:reminderTime')],
    [B(`${T(ctx, 'set_wotd')}: ${on(s.wotd)}`, 'set:wotd:x'), B(`⏰ ${n(ctx, s.wotdTime)}`, 'pt:wotdTime')],
    [B(T(ctx, 'b_resetall'), 'rst')], [B(T(ctx, 'b_home'), 'h')],
  ];
  return show(ctx, `${T(ctx, 'set_title')}\n🕒 ${esc(ctx.tz)} · ${n(ctx, E.localHM(ctx.tz))}`, kb);
}
async function pickTime(ctx, key) {
  const hours = [6, 7, 8, 9, 10, 12, 14, 16, 18, 19, 20, 21, 22, 23].map(h => String(h).padStart(2, '0') + ':00');
  const kb = []; for (let i = 0; i < hours.length; i += 4) kb.push(hours.slice(i, i + 4).map(h => B(n(ctx, h), `set:${key}:${h}`)));
  kb.push([B(T(ctx, 'b_back'), 'st')]);
  return show(ctx, T(ctx, 'pick_time'), kb);
}

/* ---------- account / linking ---------- */
async function account(ctx) {
  const linked = ctx.u.email || ctx.u.phone, url = await publicOrigin(ctx.env);
  const text = `${T(ctx, 'acc_title')}\n\n` + (linked ? T(ctx, 'acc_linked', { login: esc(linked) }) : T(ctx, 'acc_tg_only') + '\n\n' + T(ctx, 'acc_how'));
  const kb = [];
  if (!linked && url) kb.push([WA(T(ctx, 'b_site_login'), `${url}/?tg=1&action=link`)]);    // method A: link inside the Mini App
  kb.push([B(T(ctx, 'b_web'), 'web')]);
  if (url) kb.push([U(T(ctx, 'b_open_web'), url + '/')]);
  kb.push([B(T(ctx, 'b_home'), 'h')]);
  return show(ctx, text, kb);
}
async function webLogin(ctx) {
  const o = await publicOrigin(ctx.env); if (!o) return toast(ctx, T(ctx, 'no_web'), true);
  const code = newCode(12);
  await run(ctx.env, "INSERT INTO auth_codes(code,kind,user_id,expires_at) VALUES(?,'login',?,?)", code, ctx.u.id, now() + 10 * 60000);
  return send(ctx, T(ctx, 'web_link'), [[U(T(ctx, 'b_open_web'), `${o}/?login=${code}`)]]);
}
async function linkAccount(ctx, code) {
  const c = await one(ctx.env, "SELECT * FROM auth_codes WHERE code=? AND kind='link'", code.toUpperCase());
  if (!c || c.expires_at < now()) return send(ctx, T(ctx, 'link_bad'));
  const web = await one(ctx.env, 'SELECT * FROM users WHERE id=?', c.user_id);
  if (!web) return send(ctx, T(ctx, 'link_bad'));
  if (web.id === ctx.u.id) { await run(ctx.env, 'DELETE FROM auth_codes WHERE code=?', c.code); return send(ctx, T(ctx, 'link_same'), [[B(T(ctx, 'b_home'), 'h')]]); }
  if (ctx.u.email || ctx.u.phone) return send(ctx, T(ctx, 'link_other', { login: esc(ctx.u.email || ctx.u.phone) }));
  const tgId = ctx.u.telegram_id, uname = ctx.u.tg_username, tname = ctx.u.tg_name;
  const hasData = await one(ctx.env, 'SELECT (SELECT COUNT(*) FROM user_progress WHERE user_id=?1) + (SELECT COUNT(*) FROM user_custom_words WHERE user_id=?1) c', ctx.u.id);
  await mergeAccounts(ctx.env, ctx.u.id, web.id);          // moves bot data into the web account and deletes the Telegram-only account
  await ctx.env.DB.batch([
    ctx.env.DB.prepare('UPDATE users SET telegram_id=?, tg_username=?, tg_name=? WHERE id=?').bind(tgId, uname, tname, web.id),
    ctx.env.DB.prepare('DELETE FROM auth_codes WHERE code=?').bind(c.code),
  ]);
  ctx.u = await one(ctx.env, 'SELECT * FROM users WHERE id=?', web.id);
  ctx.p = await E.loadProfile(ctx.env, web.id); ctx.st = {}; ctx.dirtyP = false; ctx.rev = null;
  await send(ctx, T(ctx, 'link_ok', { login: esc(web.email || web.phone), merged: hasData.c ? T(ctx, 'link_merged') : '' }));
  if (!ctx.p.onboarded) { ctx.p.onboarded = true; ctx.saveProfile(); }
  return home(ctx);
}

/* ---------- admin (only the Telegram ids in ADMIN_TG_IDS) ---------- */
async function adminHome(ctx, fresh) {
  const env = ctx.env, t0 = tehranMidnight(), today = tehranDay(), fa = ctx.lang === 'fa';
  const k = await one(env, 'SELECT COUNT(*) users, SUM(created_at>=?1) nt, SUM(created_at>=?2) n7, SUM(telegram_id IS NOT NULL) tgc, SUM(email IS NOT NULL OR phone IS NOT NULL) web, SUM(blocked_bot=1) bb FROM users', t0, t0 - 6 * E.DAY);
  const a = await one(env, 'SELECT COUNT(DISTINCT CASE WHEN day=?1 THEN user_id END) td, COUNT(DISTINCT user_id) d7, COALESCE(SUM(CASE WHEN day=?1 THEN reviews END),0) rv FROM user_daily_activity WHERE day>=?2', today, tehranDay(now() - 6 * E.DAY));
  const br = (await one(env, "SELECT COUNT(*) c FROM broadcasts WHERE status='running'")).c;
  const st = await getSettings(env), o = await publicOrigin(env), x = v => n(ctx, v || 0);
  const text = (fa ? '🛠 <b>پنل مدیریت دانافاکس</b>\n\n' : '🛠 <b>DanaFox admin</b>\n\n') +
    `👥 ${fa ? 'کاربران' : 'Users'}: <b>${x(k.users)}</b>  ·  🆕 ${fa ? 'امروز' : 'today'} <b>${x(k.nt)}</b>  ·  ${fa ? '۷ روز' : '7 days'} <b>${x(k.n7)}</b>\n` +
    `✈️ ${fa ? 'تلگرام' : 'Telegram'}: <b>${x(k.tgc)}</b>  ·  🌐 ${fa ? 'وب' : 'Web'}: <b>${x(k.web)}</b>  ·  🚫 ${fa ? 'ربات را بسته‌اند' : 'blocked the bot'}: <b>${x(k.bb)}</b>\n` +
    `🔥 ${fa ? 'فعال امروز' : 'Active today'}: <b>${x(a.td)}</b>  ·  ${fa ? 'فعال ۷ روز' : 'active 7d'}: <b>${x(a.d7)}</b>\n` +
    `🔁 ${fa ? 'مرورهای امروز' : 'Reviews today'}: <b>${x(a.rv)}</b>` +
    (br ? `\n📣 ${fa ? 'پیام همگانی در حال ارسال' : 'Broadcasts running'}: <b>${x(br)}</b>` : '') +
    (st.maintenance ? `\n\n⚠️ <b>${fa ? 'حالت تعمیر روشن است' : 'Maintenance mode is ON'}</b>` : '') +
    `\n\n<i>${fa ? 'پنل فقط برای شناسهٔ تلگرام شما باز می‌شود.' : 'The panel opens only for your Telegram id.'}</i>`;
  const kb = [];
  if (o) kb.push([WA(fa ? '🛠 باز کردن پنل مدیریت' : '🛠 Open admin panel', `${o}/admin/?tg=1`)]);
  kb.push([B(fa ? '🌐 لینک ورود یک‌بارمصرف (مرورگر)' : '🌐 One-time browser sign-in link', 'adml')]);
  kb.push([B(fa ? '🔄 به‌روزرسانی' : '🔄 Refresh', 'adm'), B(T(ctx, 'b_home'), 'h')]);
  if (fresh) await adminCommands(env, ctx.chat);
  return fresh ? send(ctx, text, kb) : show(ctx, text, kb);
}
async function adminLink(ctx) {
  const o = await publicOrigin(ctx.env), fa = ctx.lang === 'fa';
  if (!o) return toast(ctx, T(ctx, 'no_web'), true);
  const code = newCode(20);
  await ctx.env.DB.batch([
    ctx.env.DB.prepare("DELETE FROM auth_codes WHERE user_id=? AND kind='admin'").bind(ctx.u.id),
    ctx.env.DB.prepare("INSERT INTO auth_codes(code,kind,user_id,expires_at) VALUES(?,'admin',?,?)").bind(code, ctx.u.id, now() + 5 * 60000),
    ctx.env.DB.prepare("INSERT INTO admin_log(at,admin_id,tg_id,action,details) VALUES(?,?,?,'link_created','one-time browser link from the bot')").bind(now(), ctx.u.id, ctx.u.telegram_id),
  ]);
  return send(ctx, fa ? '🔐 <b>لینک ورود به پنل مدیریت</b>\nفقط <b>یک بار</b> و تا <b>۵ دقیقه</b> کار می‌کند. آن را برای کسی نفرستید.\nنشست مرورگر بعد از ۱۲ ساعت خودکار بسته می‌شود.'
    : '🔐 <b>Admin panel sign-in link</b>\nWorks <b>once</b> and for <b>5 minutes</b>. Don’t forward it.\nThe browser session ends automatically after 12 hours.', [[U(fa ? '🔐 ورود به پنل' : '🔐 Open the panel', `${o}/admin/?code=${code}`)]]);
}

/* ---------- word of the day ---------- */
async function wotd(ctx, fresh = true) {
  const b = await E.bank(ctx.env), w = E.wordOfDay(b.list, ctx.p.settings.track, ctx.tz), cid = idOf(w);
  const text = `${T(ctx, 'wotd_title')}\n\n🔤 <b>${esc(w.word)}</b>  <i>${posName(ctx, w.pos)}</i>\n🇮🇷 <b>${esc(w.fa)}</b>` + (w.def ? `\n📘 <i>${esc(w.def)}</i>` : '') + (w.ex ? `\n💬 ${esc(w.ex)}` : '');
  const kb = [[B(T(ctx, 'b_speak'), 'ws:us:' + cid), B(T(ctx, 'b_addstudy'), 'wa:add:' + cid)], [B(T(ctx, 'b_home'), 'h')]];
  return fresh ? send(ctx, text, kb) : show(ctx, text, kb);
}

/* =====================================================================  dispatch  */
async function onCommand(ctx, cmd, arg) {
  delete ctx.st.wait; ctx.saveState();
  if (cmd === 'admin' && ctx.admin) return adminHome(ctx, true);
  if (cmd === 'start') {                                   // pin the Mini App menu button in this chat (the bot-wide default isn't always applied by Telegram)
    const o = await publicOrigin(ctx.env);
    if (o) await tg(ctx.env, 'setChatMenuButton', { chat_id: ctx.chat, menu_button: { type: 'web_app', text: 'دانافاکس', web_app: { url: `${o}/?tg=1` } } }).catch(() => {});
    if (ctx.admin) await adminCommands(ctx.env, ctx.chat).catch(() => {});
  }
  if (cmd === 'start' && arg && arg.startsWith('link_')) return linkAccount(ctx, arg.slice(5));
  if (!ctx.p.onboarded && !['help'].includes(cmd)) return onboarding(ctx, 'lang');
  switch (cmd) {
    case 'start': case 'menu': return home(ctx);
    case 'review': return startSession(ctx, await E.dueIds(ctx), 'review');
    case 'learn': return learnCats(ctx);
    case 'quiz': return quizSetup(ctx);
    case 'games': return gamesMenu(ctx);
    case 'dict': return dictionary(ctx);
    case 'words': return myWords(ctx);
    case 'stats': return stats(ctx);
    case 'wotd': return wotd(ctx);
    case 'settings': return settings(ctx);
    case 'account': case 'link': case 'web': return account(ctx);
    case 'help': return send(ctx, T(ctx, 'help', { bot: (await botUsername(ctx.env)) || 'VajeYarBot' }), [[B(T(ctx, 'b_home'), 'h')]]);
    default: return send(ctx, T(ctx, 'unknown'), [[B(T(ctx, 'b_home'), 'h')]]);
  }
}
async function onText(ctx, text) {
  const w = ctx.st.wait;
  if (w === 'qtype' && ctx.st.qz) { ctx.msgId = null; return quizAnswer(ctx, 'txt:' + text); }
  if (w === 'add') return addWords(ctx, text);
  if (w && w.startsWith('note:')) {
    const id = w.slice(5), p = (await E.getP(ctx, id)) || E.newP(); p.note = text.slice(0, 500); await E.saveP(ctx, id, p);
    delete ctx.st.wait; ctx.saveState(); await send(ctx, T(ctx, 'note_saved')); return wordView(ctx, id, true);
  }
  if (!ctx.p.onboarded) return onboarding(ctx, 'lang');
  return search(ctx, text);
}
async function onCallback(ctx, data) {
  const [a, b, c, d] = data.split(':');
  if (a === 'noop') return;
  if (a === 'adm' && ctx.admin) return adminHome(ctx, false);
  if (a === 'adml' && ctx.admin) return adminLink(ctx);
  if (a === 'ol') { ctx.p.settings.lang = b === 'en' ? 'en' : 'fa'; ctx.saveProfile(); return onboarding(ctx, 'track'); }
  if (a === 'ot') { ctx.p.settings.track = E.CATS[b] ? b : 'general'; ctx.saveProfile(); return onboarding(ctx, 'goal'); }
  if (a === 'og') { ctx.p.settings.goal = +b || 20; ctx.p.onboarded = true; ctx.saveProfile(); toast(ctx, T(ctx, 'onb_done')); return home(ctx); }
  if (!ctx.p.onboarded) return onboarding(ctx, 'lang');
  if (a !== 'qh' && a !== 'qsp' && a !== 'qsl' && ctx.st.wait === 'qtype') delete ctx.st.wait;
  switch (a) {
    case 'h': delete ctx.st.wait; ctx.saveState(); return home(ctx);
    case 'help': return show(ctx, T(ctx, 'help', { bot: (await botUsername(ctx.env)) || 'VajeYarBot' }), [[B(T(ctx, 'b_home'), 'h')]]);
    case 'lrn': return learnCats(ctx);
    case 'lc': return levels(ctx, b);
    case 'ld': return deck(ctx, b, +c);
    case 'ls': return learnNew(ctx, b, +c);
    case 'lr': { const ws = await deckWords(ctx, b, +c), pm = await E.progressMap(ctx); return startSession(ctx, ws.filter(w => { const p = pm.get(w.id); return p && p.seen && p.due <= now(); }).map(w => w.id), 'review', `ld:${b}:${c}`); }
    case 'lb': return browse(ctx, b, +c, +d || 0);
    case 'rv': return startSession(ctx, await E.dueIds(ctx), 'review');
    case 'c': {
      const s = ctx.st.s; if (!s || !s.q.length) return sessionExpired(ctx);
      if (b === 's') { s.flipped = true; ctx.saveState(); return card(ctx); }
      if (b === 'r') return rateCard(ctx, c === 'd' ? 'days' : c, +d || 0);
      if (b === 'st') { const on = await E.toggleStar(ctx, s.q[0]); toast(ctx, T(ctx, on ? 'starred' : 'unstarred')); return card(ctx); }
      if (b === 'sp' || b === 'spx') { const w = await E.wordById(ctx.env, ctx.u.id, s.q[0]); return speak(ctx, b === 'sp' ? w.word : (w.ex || w.word)); }
      if (b === 'x') return sessionDone(ctx);
      return;
    }
    case 'q': return quizSetup(ctx);
    case 'qc': { const qc = ctx.st.qc || (ctx.st.qc = { src: 'recent7', type: 'mixed', cnt: 10, timer: false }); if (b === 'timer') qc.timer = !qc.timer; else qc[b] = b === 'cnt' ? +c : c; return quizSetup(ctx); }
    case 'qgo': return quizStart(ctx);
    case 'qa': return quizAnswer(ctx, b);
    case 'qn': { const z = ctx.st.qz; if (!z) return sessionExpired(ctx); z.i++; z.answered = false; ctx.saveState(); return quizQuestion(ctx); }
    case 'qe': return quizEnd(ctx);
    case 'qh': { const z = ctx.st.qz; if (!z) return; const w = await E.wordById(ctx.env, ctx.u.id, z.items[z.i].id); return toast(ctx, T(ctx, 'hint_is', { h: w.word[0] + w.word.slice(1).replace(/[a-z]/gi, '•') }).replace(/<\/?code>/g, ''), true); }
    case 'qsp': case 'qsl': { const z = ctx.st.qz; if (!z) return; return speak(ctx, (await E.wordById(ctx.env, ctx.u.id, z.items[z.i].id)).word, null, a === 'qsl'); }
    case 'qam': { for (const id of (ctx.st.lastWrong || [])) await E.rate(ctx, id, 'add'); toast(ctx, T(ctx, 'added_review')); return; }
    case 'g': delete ctx.st.g; ctx.saveState(); return gamesMenu(ctx);
    case 'gm': return matchStart(ctx);
    case 'gml': return matchPick(ctx, 'l', +b);
    case 'gmr': return matchPick(ctx, 'r', +b);
    case 'gs': ctx.st.g = { k: 's', at: now(), score: 0 }; return speedNext(ctx);
    case 'gsa': { const g = ctx.st.g; if (!g || g.k !== 's' || !g.cur) return sessionExpired(ctx); if (g.cur.opts[+b] === g.cur.id) g.score++; else toast(ctx, '❌'); return speedNext(ctx); }
    case 'd': return dictionary(ctx);
    case 'w': { const id = await resolveId(ctx, data.slice(2)); return id && wordView(ctx, id); }
    case 'ws': { const id = await resolveId(ctx, data.split(':').slice(2).join(':')); const w = id && await E.wordById(ctx.env, ctx.u.id, id); return w && speak(ctx, w.word, b === 'uk' ? 'en-GB' : 'en-US'); }
    case 'wa': {
      const id = await resolveId(ctx, data.split(':').slice(2).join(':')); if (!id) return;
      if (b === 'add') { await E.rate(ctx, id, 'add'); toast(ctx, T(ctx, 'added_review')); }
      else if (b === 'known') { await E.rate(ctx, id, 'known'); toast(ctx, T(ctx, 'toast_known')); }
      else if (b === 'star') { const on = await E.toggleStar(ctx, id); toast(ctx, T(ctx, on ? 'starred' : 'unstarred')); }
      else if (b === 'reset') { await E.resetP(ctx, id); toast(ctx, T(ctx, 'reset_done')); }
      else if (b === 'note') { const w = await E.wordById(ctx.env, ctx.u.id, id); ctx.st.wait = 'note:' + id; ctx.saveState(); return send(ctx, T(ctx, 'note_prompt', { w: esc(w.word) })); }
      return wordView(ctx, id);
    }
    case 'm': return myWords(ctx, +b || 0);
    case 'ma': ctx.st.wait = 'add'; ctx.saveState(); return send(ctx, T(ctx, 'add_prompt'), [[B(T(ctx, 'b_cancel'), 'm')]]);
    case 'mdl': { await E.deleteCustom(ctx, data.slice(4)); toast(ctx, T(ctx, 'deleted')); return myWords(ctx); }
    case 's': return stats(ctx);
    case 'sa': return achievements(ctx);
    case 'st': return settings(ctx);
    case 'pt': return pickTime(ctx, b);
    case 'set': {
      const key = b, v = data.split(':').slice(2).join(':'), s = ctx.p.settings;
      if (key === 'reminder' || key === 'wotd') s[key] = !s[key];
      else if (['goal', 'sessionSize'].includes(key)) s[key] = +v;
      else if (['lang', 'track', 'front', 'accent', 'reminderTime', 'wotdTime'].includes(key)) s[key] = v;
      if (key === 'reminderTime') ctx.p.notified = null;
      ctx.saveProfile();
      return settings(ctx);
    }
    case 'rst': return show(ctx, T(ctx, 'confirm_reset'), [[B(T(ctx, 'b_yes_reset'), 'rsty'), B(T(ctx, 'b_cancel'), 'st')]]);
    case 'rsty': { const { wipe } = await import('../sync.js'); const lang = ctx.lang; await wipe(ctx.env, ctx.u.id); ctx.p = await E.loadProfile(ctx.env, ctx.u.id); ctx.p.settings.lang = lang; ctx.p.onboarded = true; ctx.saveProfile(); ctx.st = {}; ctx.saveState(); toast(ctx, T(ctx, 'reset_all_done')); return home(ctx); }
    case 'acc': return account(ctx);
    case 'web': return webLogin(ctx);
    case 'wd': return wotd(ctx, false);
  }
}

function eventsToast(ctx) {
  for (const e of ctx.events) {
    if (e.startsWith('levelup:')) return T(ctx, 'levelup', { n: n(ctx, e.split(':')[1]) });
    if (e.startsWith('ach:')) { const [em, L] = E.achInfo(e.slice(4), ctx.lang); return T(ctx, 'ach_unlocked', { e: em, name: L[0] }); }
  }
  return null;
}

export async function handleUpdate(env, upd) {
  if (upd.inline_query) return inlineQuery(env, upd.inline_query);
  if (upd.my_chat_member) { const m = upd.my_chat_member; if (m.chat.type === 'private') await run(env, 'UPDATE users SET blocked_bot=? WHERE telegram_id=?', m.new_chat_member.status === 'kicked' ? 1 : 0, m.from.id); return; }
  const msg = upd.message, cb = upd.callback_query;
  const from = (msg || cb || {}).from, chat = msg ? msg.chat : cb && cb.message ? cb.message.chat : null;
  if (!from || !chat || chat.type !== 'private' || from.is_bot) { if (cb) await tg(env, 'answerCallbackQuery', { callback_query_id: cb.id }).catch(() => {}); return; }
  const user = await telegramUser(env, from), admin = isAdminTg(env, from.id) || isAdminUser(env, user);
  if (!admin && (user.blocked || (await getSettings(env)).maintenance)) {
    const lang = (from.language_code || 'fa').startsWith('fa') ? 'fa' : 'en', s = await getSettings(env);
    const text = user.blocked ? t(lang, 'blocked_acc') : s.maintenance_msg ? `🛠 ${esc(s.maintenance_msg)}` : t(lang, 'maint');
    if (cb) await tg(env, 'answerCallbackQuery', { callback_query_id: cb.id, text: text.replace(/<[^>]+>/g, '').slice(0, 190), show_alert: true }).catch(() => {});
    else await tg(env, 'sendMessage', { chat_id: chat.id, text, parse_mode: 'HTML' }).catch(() => {});
    return;
  }
  const [prof, stRow] = await Promise.all([E.loadProfile(env, user.id), one(env, 'SELECT data FROM bot_state WHERE user_id=?', user.id)]);
  if (!user.last_bot_at || now() - user.last_bot_at > 3600000 || user.blocked_bot) await run(env, 'UPDATE users SET last_bot_at=?, blocked_bot=0 WHERE id=?', now(), user.id);
  let st = {}; try { st = JSON.parse((stRow && stRow.data) || '{}'); } catch (e) {}
  const ctx = new E.Ctx(env, user, prof, st);
  ctx.chat = chat.id; ctx.admin = admin;
  if (!prof.onboarded && !prof.settings._langSet && from.language_code && !from.language_code.startsWith('fa')) { /* keep Persian default; user picks in onboarding */ }
  try {
    if (cb) {
      ctx.msgId = cb.message && cb.message.message_id;
      if (cb.message && (cb.message.voice || cb.message.audio)) ctx.msgId = null;
      await onCallback(ctx, cb.data || '');
    } else if (msg.text) {
      const m = msg.text.match(/^\/(\w+)(?:@\w+)?(?:\s+(.+))?$/s);
      if (m) await onCommand(ctx, m[1].toLowerCase(), (m[2] || '').trim());
      else await onText(ctx, msg.text);
    } else if (msg.document && ctx.st.wait === 'add') {
      const f = await tg(env, 'getFile', { file_id: msg.document.file_id });
      const r = await fetch(`${env.TG_API || 'https://api.telegram.org'}/file/bot${await (await import('./telegram.js')).botToken(env)}/${f.file_path}`);
      await addWords(ctx, (await r.text()).split('\n').slice(0, 15).map(l => l.split(',').join(' - ')).join('\n'));
    }
    await ctx.flush();
  } catch (e) {
    console.error('bot error', e && e.stack || e);
    try { await ctx.flush(); } catch (x) {}
    if (cb) ctx.toast = { text: '⚠️ ' + (ctx.lang === 'fa' ? 'خطایی رخ داد، دوباره امتحان کنید' : 'Something went wrong, please try again'), alert: false };
  }
  if (cb) {
    const ev = eventsToast(ctx);
    const tt = ev || (ctx.toast && ctx.toast.text);
    await tg(env, 'answerCallbackQuery', { callback_query_id: cb.id, ...(tt ? { text: tt, show_alert: !!(ctx.toast && ctx.toast.alert && !ev) } : {}) }).catch(() => {});
  } else if (ctx.events.length) { const ev = eventsToast(ctx); if (ev) await send(ctx, ev).catch(() => {}); }
}

/* inline mode: @bot word → share a word card in any chat */
async function inlineQuery(env, iq) {
  const s = (iq.query || '').trim().toLowerCase();
  const b = await E.bank(env);
  const res = (s ? b.list.filter(w => w.word.toLowerCase().startsWith(s) || w.fa.includes(iq.query.trim())) : E.shuffle(b.list).slice(0, 10)).slice(0, 20);
  const bot = await botUsername(env);
  await tg(env, 'answerInlineQuery', { inline_query_id: iq.id, cache_time: 60, results: res.map(w => ({
    type: 'article', id: String(w.pk), title: `${w.word} — ${w.fa}`.slice(0, 100), description: w.def.slice(0, 120),
    input_message_content: { parse_mode: 'HTML', message_text: `🔤 <b>${esc(w.word)}</b> <i>(${(E.POS_NAMES[w.pos] || [w.pos])[0]})</i>\n🇮🇷 ${esc(w.fa)}` + (w.def ? `\n📘 <i>${esc(w.def)}</i>` : '') + (w.ex ? `\n💬 ${esc(w.ex)}` : '') },
    reply_markup: bot ? { inline_keyboard: [[{ text: '📚 DanaFox', url: `https://t.me/${bot}?start=w` }]] } : undefined,
  })) }).catch(e => console.error('inline', e.message));
}

/* cron: daily reminders + word of the day at each user's local time */
export async function cronTick(env, budget = 35) {
  if (!(await (await import('./telegram.js')).botToken(env))) return;
  const rows = await all(env, `SELECT u.id, u.telegram_id, u.tz, p.settings_json, p.notified FROM users u JOIN user_profile p ON p.user_id=u.id
    WHERE u.telegram_id IS NOT NULL AND u.blocked_bot=0 AND u.blocked=0 AND (p.settings_json LIKE '%"reminder":true%' OR p.settings_json LIKE '%"wotd":true%')`);
  let sent = 0;
  for (const r of rows) {
    if (sent >= budget) break;
    const s = { ...E.DEFAULT_SETTINGS, ...JSON.parse(r.settings_json || '{}') }, tz = r.tz || 'Asia/Tehran', hm = E.localHM(tz), today = E.dayKey(tz);
    const inSlot = time => { const [h, m] = String(time).split(':').map(Number), [ch, cm] = hm.split(':').map(Number); const diff = (ch * 60 + cm) - (h * 60 + m); return diff >= 0 && diff < 15; };
    const lang = s.lang === 'en' ? 'en' : 'fa';
    const notified = String(r.notified || '');
    try {
      if (s.reminder && inSlot(s.reminderTime) && !notified.includes('r' + today)) {
        const d = await one(env, 'SELECT reviews FROM user_daily_activity WHERE user_id=? AND day=?', r.id, today);
        if (!d || d.reviews < s.goal) {
          const due = await E.dueCount(env, r.id);
          await tg(env, 'sendMessage', { chat_id: r.telegram_id, parse_mode: 'HTML', text: due ? t(lang, 'remind', { n: N(lang, due) }) : t(lang, 'remind_none'),
            reply_markup: { inline_keyboard: [[{ text: t(lang, due ? 'b_review' : 'b_learn'), callback_data: due ? 'rv' : 'lrn' }]] } });
          sent++;
        }
        await run(env, 'UPDATE user_profile SET notified=? WHERE user_id=?', 'r' + today + (notified.includes('w' + today) ? ' w' + today : ''), r.id);
      }
      if (s.wotd && inSlot(s.wotdTime) && !notified.includes('w' + today)) {
        const b = await E.bank(env), w = E.wordOfDay(b.list, s.track, tz);
        await tg(env, 'sendMessage', { chat_id: r.telegram_id, parse_mode: 'HTML', text: `${t(lang, 'wotd_title')}\n\n🔤 <b>${esc(w.word)}</b>\n🇮🇷 <b>${esc(w.fa)}</b>` + (w.def ? `\n📘 <i>${esc(w.def)}</i>` : '') + (w.ex ? `\n💬 ${esc(w.ex)}` : ''),
          reply_markup: { inline_keyboard: [[{ text: t(lang, 'b_addstudy'), callback_data: 'wa:add:' + w.id }]] } });
        sent++;
        const cur = (await one(env, 'SELECT notified FROM user_profile WHERE user_id=?', r.id)).notified || '';
        await run(env, 'UPDATE user_profile SET notified=? WHERE user_id=?', (cur.includes('r' + today) ? 'r' + today + ' ' : '') + 'w' + today, r.id);
      }
    } catch (e) { if (e.code === 403) await run(env, 'UPDATE users SET blocked_bot=1 WHERE id=?', r.id); }
  }
}
