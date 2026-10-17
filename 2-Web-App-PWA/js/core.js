/* ===== VajeYar core: state, SRS, i18n, TTS, utils ===== */
(function(){
const VY = window.VY = {};
const DAY = 86400000;
VY.DAY = DAY;
const KEY = 'vajeyar_state_v1';

/* ---------- Categories & levels ---------- */
VY.CATS = {
  general:{icon:'🌍', levels:[{en:'Basic',fa:'پایه',tag:'A1–A2'},{en:'Regular',fa:'متوسط',tag:'B1'},{en:'Upper-Intermediate',fa:'فوق‌متوسط',tag:'B2'},{en:'Advanced',fa:'پیشرفته',tag:'C1–C2'}]},
  ielts:{icon:'🎓', levels:[{en:'Band 5 – 6',fa:'نمرهٔ ۵ تا ۶',tag:'B1'},{en:'Band 6.5 – 7',fa:'نمرهٔ ۶٫۵ تا ۷',tag:'B2'},{en:'Band 7.5 – 9',fa:'نمرهٔ ۷٫۵ تا ۹',tag:'C1–C2'},{en:'Reading · Core',fa:'ریدینگ · پایه',tag:'B2'},{en:'Reading · Upper',fa:'ریدینگ · متوسط',tag:'B2–C1'},{en:'Reading · Advanced',fa:'ریدینگ · پیشرفته',tag:'C1–C2'}]},
  toefl:{icon:'🏛️', levels:[{en:'Foundation',fa:'پایه',tag:'B1'},{en:'Intermediate',fa:'متوسط',tag:'B2'},{en:'Advanced',fa:'پیشرفته',tag:'C1–C2'}]},
  custom:{icon:'✍️', levels:[{en:'My list',fa:'فهرست من',tag:'—'}]}
};
VY.POS = {n:{en:'noun',fa:'اسم'},v:{en:'verb',fa:'فعل'},adj:{en:'adjective',fa:'صفت'},adv:{en:'adverb',fa:'قید'},prep:{en:'preposition',fa:'حرف اضافه'},conj:{en:'conjunction',fa:'حرف ربط'},phr:{en:'phrase',fa:'عبارت'}};

/* ---------- State ---------- */
const defaults = () => ({
  v:1, onboarded:false,
  settings:{lang:'fa', theme:'light', goal:20, sessionSize:10, front:'en', accent:'en-US', rate:0.9, autoplay:true, online:true, reminder:false, reminderTime:'20:00', sounds:true, track:'general', fs:1, exFa:true, retention:0.9, newPerDay:10},
  progress:{}, custom:[], days:{}, xp:0, kv:{},
  streak:{count:0, best:0, last:null, freezes:0},
  ach:{}, games:{matchBest:null, speedBest:0}, quizzes:[], notified:null
});
function load(){
  try{ const s = JSON.parse(localStorage.getItem(KEY)); if(s && s.v){ const d = defaults(); s.settings = Object.assign(d.settings, s.settings); return Object.assign(d, s); } }catch(e){}
  const d = defaults();
  if((navigator.language||'').toLowerCase().startsWith('fa')) d.settings.lang='fa';
  return d;
}
VY.S = load();
let saveT;
VY.save = () => { clearTimeout(saveT); saveT = setTimeout(()=>{ try{ localStorage.setItem(KEY, JSON.stringify(VY.S)); }catch(e){ console.warn(e); } }, 150); };
VY.saveNow = () => { try{ localStorage.setItem(KEY, JSON.stringify(VY.S)); }catch(e){} };
window.addEventListener('beforeunload', VY.saveNow);
VY.resetAll = () => { localStorage.removeItem(KEY); VY.S = defaults(); VY.saveNow(); VY.buildWords(); };

/* ---------- i18n ---------- */
VY.lang = () => VY.S.settings.lang;
VY.t = (k, vars) => { let s = (I18N[VY.lang()]||I18N.en)[k] ?? I18N.en[k] ?? k; if(vars) for(const v in vars) s = s.replace('{'+v+'}', vars[v]); return s; };
VY.L = o => (o && (o[VY.lang()] || o.en)) || '';
const faD = '۰۱۲۳۴۵۶۷۸۹';
VY.n = x => { const s = String(x); return VY.lang()==='fa' ? s.replace(/\d/g, d=>faD[d]).replace(/\./g,'٫') : s; };
VY.esc = s => String(s ?? '').replace(/[&<>"']/g, c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
VY.en = s => `<span class="en" dir="ltr">${VY.esc(s)}</span>`;
VY.catName = c => VY.t(c);
VY.levelName = (c,l) => VY.L(VY.CATS[c].levels[l-1]);
VY.posName = p => VY.L(VY.POS[p]) || p || '';

/* ---------- Dates ---------- */
VY.dayKey = (d=new Date()) => { const x = new Date(d); return x.getFullYear()+'-'+String(x.getMonth()+1).padStart(2,'0')+'-'+String(x.getDate()).padStart(2,'0'); };
VY.startOfDay = (ts=Date.now()) => { const d = new Date(ts); d.setHours(0,0,0,0); return d.getTime(); };
VY.addDays = (ts, n) => { const d = new Date(ts); d.setDate(d.getDate()+n); return d.getTime(); };

/* ---------- Words ---------- */
VY.buildWords = () => {
  const list = [], byId = {}, builtin = {};
  const add = w => { if(byId[w.id]) return; byId[w.id]=w; list.push(w); };
  (window.VY_WORDS||[]).forEach(r => builtin[r[0]] = r);
  const exsOf = (w, b) => {           // [[english, persian], …] — server copy first, Persian from the built-in bank when the server has none
    let a = Array.isArray(w.exs) && w.exs.length ? w.exs.map(x => [x[0]||'', x[1]||'']) : (w.ex ? [[w.ex, '']] : []);
    if(b && b[7]){ const m = {}; b[7].forEach(x => m[x[0]] = x[1]); a = a.map(x => [x[0], x[1] || m[x[0]] || '']); if(!a.length) a = b[7].slice(); }
    return a.filter(x => x[0]);
  };
  if(Array.isArray(VY.serverWords) && VY.serverWords.length){        // word bank delivered by the server (database)
    VY.serverWords.forEach(w => { if(w && w.id && w.word && VY.CATS[w.cat]){ const exs = exsOf(w, builtin[w.id]); add({id:w.id, word:w.word, pos:w.pos||'', fa:w.fa||'', def:w.def||'', ex:(exs[0]||[w.ex||''])[0], exs, cat:w.cat, level:+w.level||1}); } });
  } else if(window.VY_WORDS){                                          // built-in bank (offline, ships with every app)
    VY_WORDS.forEach(r => { if(!VY.CATS[r[5]]) return; const exs = (r[7]||[]).filter(x => x[0]); add({id:r[0], word:r[1], pos:r[2], fa:r[3], def:r[4], ex:(exs[0]||[''])[0], exs, cat:r[5], level:r[6]}); });
  } else (window.VY_DATA||[]).forEach(block => {
    block.raw.trim().split('\n').forEach(line => {
      const p = line.split('|'); if(p.length < 3) return;
      const word = p[0].trim(), ex = (p[4]||'').trim();
      add({id:block.cat+':'+word.toLowerCase(), word, pos:p[1].trim(), fa:p[2].trim(), def:(p[3]||'').trim(), ex, exs: ex ? [[ex, '']] : [], cat:block.cat, level:block.level});
    });
  });
  (VY.S.custom||[]).forEach(c => add(Object.assign({cat:'custom', level:1}, c, {exs: c.exs || (c.ex ? [[c.ex, '']] : [])})));
  VY.words = list; VY.byId = byId;
};
VY.buildWords();
VY.deckWords = (cat, level) => VY.words.filter(w => w.cat===cat && (!level || w.level===level));

/* ---------- Progress & spaced repetition: FSRS-6 (free spaced repetition scheduler, default parameters) ----------
   Stored in the synced fields: interval = stability-based interval (days), ease = difficulty mapped to 1.3–3.0.
   p.s (stability) / p.d (difficulty) are kept locally too; on other devices they are rebuilt from interval/ease. */
VY.P = id => VY.S.progress[id];
VY.ensureP = id => VY.S.progress[id] || (VY.S.progress[id] = {seen:false, reps:0, ease:2.5, interval:0, due:0, lapses:0, ok:0, bad:0, star:false, note:'', first:0, last:0});
VY.status = id => { const p = VY.P(id); if(!p || !p.seen) return 'new'; if(p.interval >= 21) return 'mastered'; if(p.interval >= 3) return 'review'; return 'learning'; };
VY.box = p => { if(!p || !p.seen) return 0; const i = p.interval; return i < 1 ? 1 : i < 3 ? 2 : i < 7 ? 3 : i < 21 ? 4 : i < 60 ? 5 : 6; };
VY.isDue = id => { const p = VY.P(id); return !!(p && p.seen && p.due <= Date.now()); };
const F = VY.FSRS = (() => {
  const w = [0.212,1.2931,2.3065,8.2956,6.4133,0.8334,3.0194,0.001,1.8722,0.1666,0.796,1.4835,0.0614,0.2629,1.6483,0.6014,1.8729,0.5425,0.0912,0.0658,0.1542];
  const decay = -w[20], factor = Math.pow(0.9, 1/decay) - 1;
  const clamp = (x, a, b) => Math.min(b, Math.max(a, x));
  const D0 = g => clamp(w[4] - Math.exp(w[5]*(g-1)) + 1, 1, 10);
  const R = (t, S) => Math.pow(1 + factor * t / Math.max(S, 0.01), decay);
  const interval = (S, r) => clamp(Math.round(S / factor * (Math.pow(r, 1/decay) - 1)), 1, 36500);
  const nextD = (d, g) => clamp(w[7]*D0(4) + (1-w[7]) * (d + (-w[6]*(g-3)) * (10-d)/9), 1, 10);
  const recall = (d, s, r, g) => s * (1 + Math.exp(w[8]) * (11-d) * Math.pow(s, -w[9]) * (Math.exp(w[10]*(1-r)) - 1) * (g===2 ? w[15] : 1) * (g===4 ? w[16] : 1));
  const forget = (d, s, r) => Math.min(w[11] * Math.pow(d, -w[12]) * (Math.pow(s+1, w[13]) - 1) * Math.exp(w[14]*(1-r)), s / Math.exp(w[17]*w[18]));
  const shortTerm = (s, g) => { let k = Math.pow(s, -w[19]) * Math.exp(w[17]*(g-3+w[18])); if(g >= 3) k = Math.max(k, 1); return clamp(s*k, 0.01, 36500); };
  const dOf = p => p.d != null ? p.d : clamp(1 + (3.0 - (p.ease || 2.5)) * 9 / 1.7, 1, 10);
  const sOf = p => p.s != null ? p.s : Math.max(0.1, p.interval || 0.5);
  /** state after grading (1 again · 2 hard · 3 good · 4 easy) — does not modify p */
  const next = (p, g, now = Date.now()) => {
    const r0 = +VY.S.settings.retention || 0.9;
    if(!p || !p.seen || !p.reps && !p.last){ const s = w[g-1], d = D0(g); return {s, d, ivl: g === 1 ? 0 : interval(s, r0)}; }
    const s = sOf(p), d = dOf(p), t = Math.max(0, (now - (p.last || now)) / 86400000), r = R(t, s);
    let s2, d2 = nextD(d, g);
    if(t < 1) s2 = shortTerm(s, g);                                     // reviewed again the same day
    else s2 = g === 1 ? forget(d, s, r) : recall(d, s, r, g);
    s2 = clamp(s2, 0.01, 36500);
    let ivl = g === 1 ? 0 : interval(s2, r0);
    if(g >= 3 && p.interval >= 1 && t >= 1) ivl = Math.max(ivl, Math.min(p.interval + 1, interval(s2 * 1.2, r0)));   // never shrink a passed card
    return {s: s2, d: d2, ivl};
  };
  return {w, R, next, sOf, dOf, interval, retr: (p, now = Date.now()) => (!p || !p.seen) ? 0 : R(Math.max(0, (now - (p.last || now)) / 86400000), sOf(p))};
})();
VY.retrievability = id => F.retr(VY.P(id));
/* due cards, most-forgotten first (lowest predicted recall), so a short session fixes the weakest memories */
VY.dueIds = () => { const now = Date.now(); return VY.words.filter(w => VY.isDue(w.id)).map(w => [w.id, F.retr(VY.P(w.id), now)]).sort((a,b) => a[1] - b[1]).map(x => x[0]); };
const touch = p => { const now = Date.now(); if(!p.seen){ p.seen = true; p.first = now; VY.logDay({newWords:1}); } p.last = now; };
VY.preview = (id, g) => F.next(VY.P(id), g).ivl;
VY.previewGood = id => VY.preview(id, 3);
const GRADE = {again:1, hard:2, good:3, easy:4};
VY.rate = (id, kind, days) => {
  const p = VY.ensureP(id), now = Date.now(), sod = VY.startOfDay();
  let g = kind === 'days' ? (days <= 1 ? 2 : days >= 30 ? 4 : 3) : kind === 'known' ? 4 : (GRADE[kind] || 3);
  const nx = F.next(p, g, now);
  touch(p);
  p.s = nx.s; p.d = Math.round(nx.d * 100) / 100;
  p.ease = Math.round((3.0 - (nx.d - 1) / 9 * 1.7) * 100) / 100;
  if(g === 1){ p.lapses++; p.bad++; p.reps = 0; p.interval = 0; p.due = now + 60000; }
  else {
    let ivl = nx.ivl;
    if(kind === 'days'){ ivl = days; p.s = Math.max(p.s, days); }
    if(kind === 'known' && p.reps === 0 && ivl < 60){ ivl = 60; p.s = Math.max(p.s, 60); }      // "I already know this word"
    p.interval = ivl; p.reps++; p.ok++; p.due = VY.addDays(sod, ivl);
  }
  VY.logDay({reviews:1, correct: g===1?0:1, wrong: g===1?1:0});
  VY.addXP(g===1 ? 2 : 10);
  VY.save();
};
/* words that keep being forgotten ("leeches") and words with weak memory right now */
VY.leechIds = () => VY.words.filter(w => { const p = VY.P(w.id); return p && p.seen && p.lapses >= 4; }).map(w => w.id);
VY.weakIds = (limit = 40) => { const now = Date.now(); return VY.words.map(w => [w, VY.P(w.id)]).filter(([w,p]) => p && p.seen && (F.retr(p, now) < 0.8 || (p.ok + p.bad >= 3 && p.bad / (p.ok + p.bad) > 0.35) || p.lapses >= 2))
  .map(([w,p]) => [w.id, F.retr(p, now) - p.lapses * 0.05]).sort((a,b) => a[1] - b[1]).slice(0, limit).map(x => x[0]); };
/* synced key/value records (reading results, placement test, …) */
VY.kvGet = k => (VY.S.kv || {})[k];
VY.kvSet = (k, v) => { VY.S.kv = VY.S.kv || {}; if(v == null) delete VY.S.kv[k]; else VY.S.kv[k] = v; VY.save(); };
VY.quizResult = (id, ok) => {
  const p = VY.ensureP(id);
  if(ok){ p.ok++; } else { p.bad++; if(p.seen){ p.due = Math.min(p.due, Date.now()); p.interval = Math.min(p.interval, 1); } }
  VY.logDay({correct: ok?1:0, wrong: ok?0:1});
  if(ok) VY.addXP(5);
  VY.save();
};
VY.resetWord = id => { delete VY.S.progress[id]; VY.save(); };
/* user font size (Settings): every font-size in style.css is multiplied by --fs */
VY.applyFont = () => { const f = +VY.S.settings.fs || 1; document.documentElement.style.setProperty('--fs', f); document.documentElement.classList.toggle('fs-big', f > 1.1); };
VY.toggleStar = id => { const p = VY.ensureP(id); p.star = !p.star; VY.save(); return p.star; };

/* ---------- Activity, streak, XP ---------- */
VY.logDay = inc => {
  const k = VY.dayKey(); const d = VY.S.days[k] || (VY.S.days[k] = {reviews:0, newWords:0, correct:0, wrong:0, xp:0});
  for(const f in inc) d[f] = (d[f]||0) + inc[f];
  updateStreak();
};
function updateStreak(){
  const st = VY.S.streak, today = VY.dayKey();
  if(st.last === today) return;
  const y = VY.dayKey(VY.addDays(Date.now(), -1)), y2 = VY.dayKey(VY.addDays(Date.now(), -2));
  if(st.last === y) st.count++;
  else if(st.last === y2 && st.freezes > 0){ st.freezes--; st.count++; }
  else st.count = 1;
  st.last = today; st.best = Math.max(st.best, st.count);
  if(st.count % 7 === 0) st.freezes = Math.min(2, st.freezes+1);
}
VY.streakNow = () => { const st = VY.S.streak; if(!st.last) return 0; const today = VY.dayKey(), y = VY.dayKey(VY.addDays(Date.now(),-1)), y2 = VY.dayKey(VY.addDays(Date.now(),-2)); if(st.last===today || st.last===y || (st.last===y2 && st.freezes>0)) return st.count; return 0; };
VY.levelOf = xp => Math.floor(Math.sqrt(xp/40)) + 1;
VY.levelRange = l => [40*(l-1)*(l-1), 40*l*l];
VY.addXP = n => {
  const before = VY.levelOf(VY.S.xp); VY.S.xp += n;
  VY.logDayXP(n);
  const after = VY.levelOf(VY.S.xp);
  if(after > before) setTimeout(()=>VY.toast('🎉 '+VY.t('levelUp')+' '+VY.t('level')+' '+VY.n(after)), 300);
  VY.checkAch();
};
VY.logDayXP = n => { const k = VY.dayKey(); const d = VY.S.days[k] || (VY.S.days[k] = {reviews:0,newWords:0,correct:0,wrong:0,xp:0}); d.xp += n; };
VY.today = () => VY.S.days[VY.dayKey()] || {reviews:0,newWords:0,correct:0,wrong:0,xp:0};

/* ---------- Achievements ---------- */
const learnedCount = () => Object.values(VY.S.progress).filter(p=>p.seen).length;
const masteredCount = () => Object.values(VY.S.progress).filter(p=>p.seen && p.interval>=21).length;
VY.learnedCount = learnedCount; VY.masteredCount = masteredCount;
VY.ACH = [
  {id:'first', e:'🌱', en:['First step','Learn your first word'], fa:['اولین قدم','اولین لغت را یاد بگیرید'], ok:()=>learnedCount()>=1},
  {id:'w25', e:'📗', en:['Word collector','Learn 25 words'], fa:['جمع‌کنندهٔ لغت','۲۵ لغت یاد بگیرید'], ok:()=>learnedCount()>=25},
  {id:'w100', e:'📚', en:['Bookworm','Learn 100 words'], fa:['کرم کتاب','۱۰۰ لغت یاد بگیرید'], ok:()=>learnedCount()>=100},
  {id:'w300', e:'🧠', en:['Word wizard','Learn 300 words'], fa:['جادوگر لغت','۳۰۰ لغت یاد بگیرید'], ok:()=>learnedCount()>=300},
  {id:'m10', e:'💎', en:['Long-term memory','Master 10 words'], fa:['حافظهٔ بلندمدت','در ۱۰ لغت تسلط کامل پیدا کنید'], ok:()=>masteredCount()>=10},
  {id:'s3', e:'🔥', en:['On fire','3-day streak'], fa:['داغ داغ','۳ روز پیاپی'], ok:()=>VY.S.streak.best>=3},
  {id:'s7', e:'⚡', en:['One week strong','7-day streak'], fa:['یک هفتهٔ کامل','۷ روز پیاپی'], ok:()=>VY.S.streak.best>=7},
  {id:'s30', e:'👑', en:['Unstoppable','30-day streak'], fa:['توقف‌ناپذیر','۳۰ روز پیاپی'], ok:()=>VY.S.streak.best>=30},
  {id:'q1', e:'📝', en:['Quiz taker','Finish your first quiz'], fa:['آزمون‌دهنده','اولین آزمون را تمام کنید'], ok:()=>VY.S.quizzes.length>=1},
  {id:'q100', e:'🏆', en:['Perfectionist','Score 100% in a quiz'], fa:['کمال‌گرا','در یک آزمون ۱۰۰٪ بگیرید'], ok:()=>VY.S.quizzes.some(q=>q.total>=5 && q.score===q.total)},
  {id:'xp1k', e:'⭐', en:['Rising star','Earn 1,000 XP'], fa:['ستارهٔ در حال طلوع','۱۰۰۰ امتیاز کسب کنید'], ok:()=>VY.S.xp>=1000},
  {id:'goal', e:'🎯', en:['Goal getter','Reach your daily goal'], fa:['هدف‌گیر','به هدف روزانه برسید'], ok:()=>Object.values(VY.S.days).some(d=>d.reviews>=VY.S.settings.goal)},
  {id:'custom', e:'✍️', en:['Curator','Add 5 of your own words'], fa:['گردآورنده','۵ لغت شخصی اضافه کنید'], ok:()=>VY.S.custom.length>=5},
  {id:'game', e:'🎮', en:['Player','Finish a match game'], fa:['بازیکن','یک بازی جفت‌یابی را تمام کنید'], ok:()=>VY.S.games.matchBest!=null}
];
VY.checkAch = () => { VY.ACH.forEach(a => { if(!VY.S.ach[a.id] && a.ok()){ VY.S.ach[a.id] = Date.now(); setTimeout(()=>VY.toast(a.e+' '+VY.t('achUnlocked')+': '+a[VY.lang()][0]), 600); } }); };

/* ---------- Toast ---------- */
VY.toast = msg => { let box = document.querySelector('.toasts'); if(!box){ box = document.createElement('div'); box.className='toasts'; document.body.appendChild(box); } const el = document.createElement('div'); el.className='toast'; el.textContent = msg; box.appendChild(el); setTimeout(()=>{ el.style.opacity='0'; el.style.transition='opacity .3s'; setTimeout(()=>el.remove(), 300); }, 2400); };

/* ---------- Text to speech: real audio from the server first, the device engine as fallback ---------- */
let voices = [];
const loadVoices = () => { voices = (window.speechSynthesis && speechSynthesis.getVoices()) || []; };
if(window.speechSynthesis){ loadVoices(); speechSynthesis.onvoiceschanged = loadVoices; }
VY.hasTTS = () => !!window.speechSynthesis || !!(VY.isServer && VY.isServer());
VY.pickVoice = () => {
  const acc = VY.S.settings.accent; const en = voices.filter(v => /^en[-_]/i.test(v.lang));
  const score = v => (v.lang.replace('_','-').toLowerCase()===acc.toLowerCase()?10:0) + (/natural|online|neural/i.test(v.name)?4:0) + (/google|microsoft/i.test(v.name)?2:0) + (v.localService?1:0);
  return en.sort((a,b)=>score(b)-score(a))[0] || null;
};
VY.ttsUrl = (text, rate) => { const s = VY.S.settings;
  return (VY.apiBase || '') + '/api/tts?text=' + encodeURIComponent(text) + '&accent=' + encodeURIComponent(s.accent) + '&rate=' + +(rate || s.rate || 1); };
VY.speak = async (text, rate) => {
  text = String(text || '').trim(); if(!text) return;
  if(navigator.onLine && VY.isServer && VY.isServer()){
    const a = new Audio(VY.ttsUrl(text, rate));
    let r;
    try{
      r = await new Promise(res => {
        a.onplaying = () => res('played');
        a.onerror = () => res('failed');
        a.play().catch(e => res(e && e.name === 'NotAllowedError' ? 'blocked' : 'failed'));
        setTimeout(() => res('timeout'), 6000);
      });
    }catch(e){ r = 'failed'; }
    if(r !== 'played') a.pause();
    // 'blocked' = the browser refuses sound before the first tap; the device engine is refused too, so stay quiet
    if(r === 'played' || r === 'blocked') return;
  }
  if(!window.speechSynthesis){ VY.toast(VY.t('noVoice')); return; }
  speechSynthesis.cancel();
  const u = new SpeechSynthesisUtterance(text);
  const v = VY.pickVoice(); if(v) u.voice = v; u.lang = v ? v.lang : VY.S.settings.accent;
  u.rate = rate || VY.S.settings.rate; speechSynthesis.speak(u);
};
VY.playAudio = url => { try{ new Audio(url).play(); }catch(e){} };

/* ---------- Sounds ---------- */
let actx;
VY.sound = kind => {
  if(!VY.S.settings.sounds) return;
  try{
    actx = actx || new (window.AudioContext||window.webkitAudioContext)();
    const notes = kind==='ok' ? [660, 880] : kind==='done' ? [523,659,784] : [220, 180];
    notes.forEach((f,i) => { const o = actx.createOscillator(), g = actx.createGain(); o.type = kind==='bad'?'triangle':'sine'; o.frequency.value = f; const t0 = actx.currentTime + i*0.09; g.gain.setValueAtTime(0.0001, t0); g.gain.exponentialRampToValueAtTime(0.12, t0+0.02); g.gain.exponentialRampToValueAtTime(0.0001, t0+0.22); o.connect(g).connect(actx.destination); o.start(t0); o.stop(t0+0.25); });
  }catch(e){}
};

/* ---------- Online dictionary (optional) ---------- */
const DKEY = 'vajeyar_dict_cache';
let dcache = {}; try{ dcache = JSON.parse(localStorage.getItem(DKEY)) || {}; }catch(e){}
VY.fetchDict = async word => {
  const k = word.toLowerCase();
  if(dcache[k]) return dcache[k];
  if(!VY.S.settings.online || !navigator.onLine) return null;
  try{
    const ctrl = new AbortController(); setTimeout(()=>ctrl.abort(), 7000);
    const r = await fetch('https://api.dictionaryapi.dev/api/v2/entries/en/'+encodeURIComponent(k), {signal:ctrl.signal});
    if(!r.ok) { dcache[k] = {none:true}; return dcache[k]; }
    const j = await r.json(); const out = {phonetic:'', audioUS:'', audioUK:'', defs:[], syn:[], ant:[]};
    j.forEach(e => {
      if(!out.phonetic && e.phonetic) out.phonetic = e.phonetic;
      (e.phonetics||[]).forEach(p => { if(!out.phonetic && p.text) out.phonetic = p.text; if(p.audio){ if(/-us\.mp3/.test(p.audio)) out.audioUS = out.audioUS||p.audio; else if(/-uk\.mp3/.test(p.audio)) out.audioUK = out.audioUK||p.audio; else out.audioUS = out.audioUS||p.audio; } });
      (e.meanings||[]).forEach(m => { (m.synonyms||[]).forEach(s=>out.syn.push(s)); (m.antonyms||[]).forEach(s=>out.ant.push(s)); (m.definitions||[]).forEach(d => { if(out.defs.length<6) out.defs.push({pos:m.partOfSpeech, def:d.definition, ex:d.example||''}); (d.synonyms||[]).forEach(s=>out.syn.push(s)); (d.antonyms||[]).forEach(s=>out.ant.push(s)); }); });
    });
    out.syn = [...new Set(out.syn)].slice(0,10); out.ant = [...new Set(out.ant)].slice(0,8);
    dcache[k] = out; const keys = Object.keys(dcache); if(keys.length > 800) delete dcache[keys[0]];
    try{ localStorage.setItem(DKEY, JSON.stringify(dcache)); }catch(e){}
    return out;
  }catch(e){ return null; }
};
VY.translate = async word => {
  try{ const r = await fetch('https://api.mymemory.translated.net/get?langpair=en|fa&q='+encodeURIComponent(word)); const j = await r.json(); return (j.responseData && j.responseData.translatedText) || ''; }catch(e){ return ''; }
};

/* ---------- Helpers ---------- */
VY.shuffle = a => { a = a.slice(); for(let i=a.length-1;i>0;i--){ const j = Math.floor(Math.random()*(i+1)); [a[i],a[j]]=[a[j],a[i]]; } return a; };
VY.sample = (a, n) => VY.shuffle(a).slice(0, n);
VY.highlight = (sentence, word) => {
  const stem = word.toLowerCase().replace(/(e|y)$/,'');
  const re = new RegExp('\\b('+stem.replace(/[.*+?^${}()|[\]\\]/g,'\\$&')+'[a-z]*)\\b','i');
  return VY.esc(sentence).replace(re, '<mark>$1</mark>');
};
VY.blank = (sentence, word) => {
  const stem = word.toLowerCase().replace(/(e|y)$/,'');
  const re = new RegExp('\\b('+stem.replace(/[.*+?^${}()|[\]\\]/g,'\\$&')+'[a-z]*)\\b','i');
  return re.test(sentence) ? VY.esc(sentence).replace(re, '<b>_____</b>') : null;
};
VY.intervalLabel = d => {
  if(d < 1) return VY.lang()==='fa' ? 'همین حالا' : 'now';
  if(d < 30) return VY.n(d) + ' ' + (VY.lang()==='fa' ? 'روز' : (d===1?'day':'days'));
  if(d < 365) return VY.n(Math.round(d/30)) + ' ' + (VY.lang()==='fa' ? 'ماه' : (Math.round(d/30)===1?'month':'months'));
  return VY.n((d/365).toFixed(1)) + ' ' + (VY.lang()==='fa' ? 'سال' : 'years');
};
VY.download = (name, text, type='application/json') => { const a = document.createElement('a'); a.href = URL.createObjectURL(new Blob([text], {type})); a.download = name; document.body.appendChild(a); a.click(); setTimeout(()=>{ URL.revokeObjectURL(a.href); a.remove(); }, 500); };
VY.pickFile = (accept, cb) => { const i = document.createElement('input'); i.type='file'; i.accept=accept; i.onchange = () => { const f = i.files[0]; if(!f) return; const r = new FileReader(); r.onload = () => cb(r.result); r.readAsText(f, 'utf-8'); }; i.click(); };
})();
