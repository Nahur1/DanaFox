/* ===== VajeYar core: state, SRS, i18n, TTS, utils ===== */
(function(){
const VY = window.VY = {};
const DAY = 86400000;
VY.DAY = DAY;
const KEY = 'vajeyar_state_v1';

/* ---------- Categories & levels ---------- */
VY.CATS = {
  general:{icon:'🌍', levels:[{en:'Basic',fa:'پایه',tag:'A1–A2'},{en:'Regular',fa:'متوسط',tag:'B1'},{en:'Upper-Intermediate',fa:'فوق‌متوسط',tag:'B2'},{en:'Advanced',fa:'پیشرفته',tag:'C1–C2'}]},
  ielts:{icon:'🎓', levels:[{en:'Band 5 – 6',fa:'نمرهٔ ۵ تا ۶',tag:'B1'},{en:'Band 6.5 – 7',fa:'نمرهٔ ۶٫۵ تا ۷',tag:'B2'},{en:'Band 7.5 – 9',fa:'نمرهٔ ۷٫۵ تا ۹',tag:'C1–C2'}]},
  toefl:{icon:'🏛️', levels:[{en:'Foundation',fa:'پایه',tag:'B1'},{en:'Intermediate',fa:'متوسط',tag:'B2'},{en:'Advanced',fa:'پیشرفته',tag:'C1–C2'}]},
  custom:{icon:'✍️', levels:[{en:'My list',fa:'فهرست من',tag:'—'}]}
};
VY.POS = {n:{en:'noun',fa:'اسم'},v:{en:'verb',fa:'فعل'},adj:{en:'adjective',fa:'صفت'},adv:{en:'adverb',fa:'قید'},prep:{en:'preposition',fa:'حرف اضافه'},conj:{en:'conjunction',fa:'حرف ربط'},phr:{en:'phrase',fa:'عبارت'}};

/* ---------- State ---------- */
const defaults = () => ({
  v:1, onboarded:false,
  settings:{lang:'fa', theme:'light', goal:20, sessionSize:10, front:'en', accent:'en-US', rate:0.9, autoplay:true, online:true, reminder:false, reminderTime:'20:00', sounds:true, track:'general'},
  progress:{}, custom:[], days:{}, xp:0,
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
  const list = [], byId = {};
  const add = w => { if(byId[w.id]) return; byId[w.id]=w; list.push(w); };
  (window.VY_DATA||[]).forEach(block => {
    block.raw.trim().split('\n').forEach(line => {
      const p = line.split('|'); if(p.length < 3) return;
      const word = p[0].trim();
      add({id:block.cat+':'+word.toLowerCase(), word, pos:p[1].trim(), fa:p[2].trim(), def:(p[3]||'').trim(), ex:(p[4]||'').trim(), cat:block.cat, level:block.level});
    });
  });
  (VY.S.custom||[]).forEach(c => add(Object.assign({cat:'custom', level:1}, c)));
  VY.words = list; VY.byId = byId;
};
VY.buildWords();
VY.deckWords = (cat, level) => VY.words.filter(w => w.cat===cat && (!level || w.level===level));

/* ---------- Progress & SRS (SM-2 inspired + Leitner boxes) ---------- */
VY.P = id => VY.S.progress[id];
VY.ensureP = id => VY.S.progress[id] || (VY.S.progress[id] = {seen:false, reps:0, ease:2.5, interval:0, due:0, lapses:0, ok:0, bad:0, star:false, note:'', first:0, last:0});
VY.status = id => { const p = VY.P(id); if(!p || !p.seen) return 'new'; if(p.interval >= 21) return 'mastered'; if(p.interval >= 3) return 'review'; return 'learning'; };
VY.box = p => { if(!p || !p.seen) return 0; const i = p.interval; return i < 1 ? 1 : i < 3 ? 2 : i < 7 ? 3 : i < 21 ? 4 : i < 60 ? 5 : 6; };
VY.isDue = id => { const p = VY.P(id); return !!(p && p.seen && p.due <= Date.now()); };
VY.dueIds = () => VY.words.filter(w => VY.isDue(w.id)).sort((a,b)=>VY.P(a.id).due - VY.P(b.id).due).map(w=>w.id);
const touch = p => { const now = Date.now(); if(!p.seen){ p.seen = true; p.first = now; VY.logDay({newWords:1}); } p.last = now; };
VY.previewGood = id => { const p = VY.P(id) || {reps:0, interval:0, ease:2.5}; return goodInterval(p); };
function goodInterval(p){ if(!p.reps) return 1; if(p.reps===1) return 3; return Math.max(p.interval+1, Math.round(p.interval * p.ease)); }
VY.rate = (id, kind, days) => {
  const p = VY.ensureP(id); touch(p);
  const sod = VY.startOfDay();
  if(kind==='again'){ p.lapses++; p.bad++; p.ease = Math.max(1.3, p.ease-0.2); p.reps = 0; p.interval = 0; p.due = Date.now(); }
  else if(kind==='good'){ p.interval = goodInterval(p); p.reps++; p.ok++; p.ease = Math.min(3.0, p.ease+0.05); p.due = VY.addDays(sod, p.interval); }
  else if(kind==='days'){ p.interval = days; p.reps = Math.max(1, p.reps+1); p.ok++; if(days<=1) p.ease = Math.max(1.3, p.ease-0.1); if(days>=30) p.ease = Math.min(3.0, p.ease+0.1); p.due = VY.addDays(sod, days); }
  else if(kind==='known'){ p.interval = 120; p.reps = Math.max(3, p.reps); p.ok++; p.ease = 2.8; p.due = VY.addDays(sod, 120); }
  VY.logDay({reviews:1, correct: kind==='again'?0:1, wrong: kind==='again'?1:0});
  VY.addXP(kind==='again' ? 2 : 10);
  VY.save();
};
VY.quizResult = (id, ok) => {
  const p = VY.ensureP(id);
  if(ok){ p.ok++; } else { p.bad++; if(p.seen){ p.due = Math.min(p.due, Date.now()); p.interval = Math.min(p.interval, 1); } }
  VY.logDay({correct: ok?1:0, wrong: ok?0:1});
  if(ok) VY.addXP(5);
  VY.save();
};
VY.resetWord = id => { delete VY.S.progress[id]; VY.save(); };
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

/* ---------- Text to speech ---------- */
let voices = [];
const loadVoices = () => { voices = (window.speechSynthesis && speechSynthesis.getVoices()) || []; };
if(window.speechSynthesis){ loadVoices(); speechSynthesis.onvoiceschanged = loadVoices; }
VY.hasTTS = () => !!window.speechSynthesis;
VY.pickVoice = () => {
  const acc = VY.S.settings.accent; const en = voices.filter(v => /^en[-_]/i.test(v.lang));
  const score = v => (v.lang.replace('_','-').toLowerCase()===acc.toLowerCase()?10:0) + (/natural|online|neural/i.test(v.name)?4:0) + (/google|microsoft/i.test(v.name)?2:0) + (v.localService?1:0);
  return en.sort((a,b)=>score(b)-score(a))[0] || null;
};
VY.speak = (text, rate) => {
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
