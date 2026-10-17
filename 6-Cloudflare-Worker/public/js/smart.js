/* ===== VajeYar smart layer: examples with Persian, daily plan, insights, smart sessions, AI tutor, translation ===== */
(function(){
const {t, n, esc} = VY; const ACT = VY.ACT, V = VY.V;
const pct = x => n(Math.round(x)) + (VY.lang()==='fa' ? '٪' : '%');
VY.pct = pct;
/* readable message for an API error code */
VY.errMsg = c => { c = c || 'server_error'; const k = 'err_' + c, a = t(k); if(a !== k) return a; const b = VY.tA ? VY.tA(k) : k; return b !== k ? b : t('err_generic'); };

/* ---------- examples: [[english, persian], …] ---------- */
VY.exList = w => {
  if(!w) return [];
  const a = Array.isArray(w.exs) && w.exs.length ? w.exs : (w.ex ? [[w.ex, '']] : []);
  return a.map(x => Array.isArray(x) ? [String(x[0]||''), String(x[1]||'')] : [String(x||''), '']).filter(x => x[0].trim());
};
/* list of examples; Persian is shown under each one (Settings → "Persian under examples"), otherwise one tap reveals it */
VY.exHTML = (w, max = 3, cls = '') => {
  const list = VY.exList(w).slice(0, max); if(!list.length) return '';
  const show = VY.S.settings.exFa !== false;
  return `<div class="exs ${cls}">${list.map(([e, f]) => `<div class="example ex2">
    <div class="ex-body"><div class="en ex-en" dir="ltr">${VY.highlight(e, w.word)}</div>${f ? `<div class="ex-fa${show ? '' : ' hide'}" dir="rtl">${esc(f)}</div>` : ''}</div>
    <div class="ex-act">${VY.speakBtn(e, 'sm')}${f && !show ? `<button class="speak sm fa-btn" data-act="exFa" title="${t('showFa')}">فا</button>` : ''}</div></div>`).join('')}</div>`;
};
ACT.exFa = (el, e) => { e.stopPropagation(); const f = el.closest('.example').querySelector('.ex-fa'); if(f) f.classList.toggle('hide'); };
/* an example that contains the word (for "fill the gap" questions) */
VY.blankEx = w => { const x = VY.exList(w).find(([e]) => VY.blank(e, w.word)); return x || null; };

/* ---------- translation (server first, free fallback) ---------- */
const TKEY = 'vajeyar_tr_cache';
let trc = {}; try{ trc = JSON.parse(localStorage.getItem(TKEY)) || {}; }catch(e){}
VY.trFa = async text => {
  text = String(text||'').replace(/\s+/g, ' ').trim().slice(0, 120); if(!text) return null;
  const k = text.toLowerCase(); if(trc[k]) return trc[k];
  let out = null;
  if(VY.isServer && VY.isServer() && navigator.onLine !== false){
    try{ const j = await VY.api('/translate?q=' + encodeURIComponent(text), {timeout: 8000}); if(j && j.fa) out = {fa: j.fa, alts: j.alts || []}; }catch(e){}
  }
  if(!out && navigator.onLine !== false){ const fa = await VY.translate(text); if(fa && fa.toLowerCase() !== k) out = {fa, alts: []}; }
  if(out){ trc[k] = out; const ks = Object.keys(trc); if(ks.length > 600) delete trc[ks[0]]; try{ localStorage.setItem(TKEY, JSON.stringify(trc)); }catch(e){} }
  return out;
};

/* ---------- finding words in the bank (handles plurals, -ed, -ing …) ---------- */
let idx = null, idxN = -1;
const index = () => { if(idx && idxN === VY.words.length) return idx; idx = {}; VY.words.forEach(w => { const k = w.word.toLowerCase(); if(!idx[k] || w.cat !== 'custom') idx[k] = w; }); idxN = VY.words.length; return idx; };
VY.findWord = raw => {
  const s = String(raw||'').toLowerCase().replace(/[’']s$/, '').replace(/[^a-z\- ]/g, '').trim(); if(!s) return null;
  const I = index(); if(I[s]) return I[s];
  const c = [];
  if(s.endsWith('ies')) c.push(s.slice(0,-3)+'y');
  if(s.endsWith('es')) c.push(s.slice(0,-2));
  if(s.endsWith('s')) c.push(s.slice(0,-1));
  if(s.endsWith('ied')) c.push(s.slice(0,-3)+'y');
  if(s.endsWith('ed')){ c.push(s.slice(0,-2), s.slice(0,-1)); if(/(.)\1ed$/.test(s)) c.push(s.slice(0,-3)); }
  if(s.endsWith('ing')){ c.push(s.slice(0,-3), s.slice(0,-3)+'e'); if(/(.)\1ing$/.test(s)) c.push(s.slice(0,-4)); }
  if(s.endsWith('ly')){ c.push(s.slice(0,-2)); if(s.endsWith('ily')) c.push(s.slice(0,-3)+'y'); }
  if(s.endsWith('er')) c.push(s.slice(0,-2), s.slice(0,-1));
  if(s.endsWith('est')) c.push(s.slice(0,-3));
  if(s.endsWith('ment')) c.push(s.slice(0,-4));
  if(s.endsWith('ness')) c.push(s.slice(0,-4));
  for(const x of c) if(I[x]) return I[x];
  return null;
};

/* ---------- smart selection ---------- */
VY.recLevel = cat => {   // starting deck level suggested by the placement test
  const pl = VY.kvGet('placement'); if(!pl || !pl.rec) return 1;
  return Math.max(1, Math.min(VY.CATS[cat] ? VY.CATS[cat].levels.length : 1, +pl.rec[cat] || 1));
};
VY.nextNewIds = (k, cat) => {
  cat = cat || VY.S.settings.track || 'general'; if(k <= 0) return [];
  const L = VY.CATS[cat] ? VY.CATS[cat].levels.length : 1, start = VY.recLevel(cat), out = [];
  const order = [...Array(L)].map((_,i)=>i+1); const ord = order.slice(start-1).concat(order.slice(0, start-1));
  for(const l of ord){ for(const w of VY.deckWords(cat, l)){ if(VY.status(w.id)==='new') out.push(w.id); if(out.length >= k) return out; } }
  return out;
};
VY.newLeftToday = () => Math.max(0, (+VY.S.settings.newPerDay || 10) - (VY.today().newWords || 0));
/* one session: forgotten-first reviews + a few weak words + today's new words, new ones spread between reviews */
VY.smartQueue = () => {
  const goal = +VY.S.settings.goal || 20, td = VY.today();
  const due = VY.dueIds().slice(0, Math.max(10, goal - (td.reviews||0)) + 10);
  const weak = VY.weakIds(12).filter(id => !due.includes(id)).slice(0, 5);
  const fresh = VY.nextNewIds(Math.min(VY.newLeftToday(), +VY.S.settings.sessionSize || 10));
  const rev = [...due, ...weak], q = [];
  let i = 0, j = 0;
  while(i < rev.length || j < fresh.length){ for(let k=0;k<3 && i<rev.length;k++) q.push(rev[i++]); if(j < fresh.length) q.push(fresh[j++]); }
  return q;
};
ACT.smartSession = () => { const q = VY.smartQueue(); if(!q.length){ VY.toast(t('planAllDone')); return; } VY.startSession(q, t('smartSession')); };
ACT.smartNew = () => { const q = VY.nextNewIds(Math.max(5, VY.newLeftToday() || +VY.S.settings.sessionSize || 10)); if(!q.length){ VY.toast(t('deckDone')); return; } VY.startSession(q, t('learnNew')); };
ACT.smartWeak = () => { const q = VY.weakIds(25); if(!q.length){ VY.toast(t('noWeak')); return; } VY.startSession(q, t('weakWords')); };

/* ---------- memory insights ---------- */
VY.insights = () => {
  const now = Date.now(); let seen = 0, sumR = 0, risk = 0, mast = 0;
  VY.words.forEach(w => { const p = VY.P(w.id); if(!p || !p.seen) return; seen++; const r = VY.FSRS.retr(p, now); sumR += r; if(r < 0.8) risk++; if(p.interval >= 21) mast++; });
  const days = VY.S.days, wk = (a, b) => { let s = 0; for(let i=a;i<b;i++){ const d = days[VY.dayKey(VY.addDays(now, -i))]; if(d) s += d.newWords||0; } return s; };
  const thisWeek = wk(0,7), lastWeek = wk(7,14), pace = wk(0,14) / 14;
  const track = VY.S.settings.track || 'general', tw = VY.deckWords(track), left = tw.filter(w => VY.status(w.id)==='new').length;
  let ok = 0, bad = 0; for(let i=0;i<14;i++){ const d = days[VY.dayKey(VY.addDays(now, -i))]; if(d){ ok += d.correct||0; bad += d.wrong||0; } }
  return {seen, mem: seen ? sumR/seen*100 : 0, risk, mast, leech: VY.leechIds().length, weak: VY.weakIds(500).length, thisWeek, lastWeek, pace,
    left, track, eta: pace > 0.2 ? Math.ceil(left / pace) : null, acc14: ok+bad ? ok*100/(ok+bad) : null};
};
VY.insightsCard = () => {
  const I = VY.insights(), pl = VY.kvGet('placement');
  if(!I.seen && !pl) return '';
  const trend = I.thisWeek - I.lastWeek;
  const tip = I.leech ? t('tipLeech', {n: n(I.leech)}) : I.risk > 10 ? t('tipRisk', {n: n(I.risk)}) : I.pace < 3 ? t('tipPace') : t('tipGood');
  return `<div class="card insights mb16">
    <div class="row between wrap"><h3>🧠 ${t('insights')}</h3>${pl ? `<span class="chip purple">${t('yourLevel')}: <b class="en" dir="ltr">${esc(pl.cefr)}</b> · ${t('vocabSize')} ≈ ${n(pl.vocab)}</span>` : `<button class="btn btn-soft btn-sm" data-act="go" data-to="placement">${icon('target')} ${t('placementTest')}</button>`}</div>
    <div class="kv mt12">
      <div><b style="color:${I.mem>=85?'var(--green)':I.mem>=70?'var(--yellow-strong)':'var(--red)'}">${pct(I.mem)}</b><span>${t('memStrength')}</span></div>
      <div><b>${n(I.risk)}</b><span>${t('atRisk')}</span></div>
      <div><b>${n(I.thisWeek)} <small style="color:${trend>=0?'var(--green)':'var(--red)'}">${trend>=0?'▲':'▼'}${n(Math.abs(trend))}</small></b><span>${t('newThisWeek')}</span></div>
      <div><b>${I.eta ? n(I.eta) + ' ' + t('days') : '—'}</b><span>${t('etaTrack', {c: VY.catName(I.track)})}</span></div>
    </div>
    <div class="tip mt12">💡 ${tip}</div>
    <div class="row wrap mt12">${I.weak ? `<button class="btn btn-soft btn-sm" data-act="smartWeak">${icon('target')} ${t('weakWords')} · ${n(I.weak)}</button>` : ''}${I.leech ? `<button class="btn btn-ghost btn-sm" data-act="leechList">${icon('zap')} ${t('leeches')} · ${n(I.leech)}</button>` : ''}</div>
  </div>`;
};
ACT.leechList = () => {
  const ids = VY.leechIds();
  VY.modal(`<div class="modal-head"><h2>⚡ ${t('leeches')}</h2><div class="spacer"></div><button class="icon-btn" data-act="closeModal">${icon('x')}</button></div>
    <p class="muted small">${t('leechSub')}</p><div class="list">${ids.map(id => { const w = VY.byId[id]; return w ? `<div class="li" data-act="word" data-id="${esc(id)}"><span class="w en" dir="ltr">${esc(w.word)}</span><span class="m">${esc(w.fa)}</span><span class="chip red">${n(VY.P(id).lapses)}×</span></div>` : ''; }).join('')}</div>
    <div class="row mt16"><button class="btn btn-primary btn-block" data-act="leechStudy">${icon('repeat')} ${t('study')}</button></div>`);
};
ACT.leechStudy = () => { VY.closeModal(); VY.startSession(VY.leechIds().slice(0, 30), t('leeches')); };

/* ---------- today's plan (home) ---------- */
VY.planCard = () => {
  const td = VY.today(), due = VY.dueIds().length, newLeft = VY.newLeftToday(), weak = VY.weakIds(30).filter(id => !VY.isDue(id)).length;
  const pl = VY.kvGet('placement'), rd = VY.nextReading ? VY.nextReading() : null, rdDone = rd && VY.readingDoneToday && VY.readingDoneToday();
  const steps = [];
  steps.push({ic:'repeat', title: t('planReview'), sub: due ? t('planReviewS', {n: n(due)}) : t('planNoDue'), done: !due, act:'startReview'});
  steps.push({ic:'sparkles', title: t('planNew'), sub: newLeft ? t('planNewS', {n: n(newLeft)}) : t('planNewDone'), done: !newLeft, act:'smartNew'});
  if(weak) steps.push({ic:'target', title: t('planWeak'), sub: t('planWeakS', {n: n(Math.min(weak, 25))}), done:false, act:'smartWeak'});
  if(rd) steps.push({ic:'text', title: t('planReading'), sub: rdDone ? t('planReadingDone') : esc(VY.lang()==='fa' && rd.title_fa ? rd.title_fa : rd.title), done: !!rdDone, to: 'reading/' + rd.id});
  if(!pl) steps.push({ic:'trophy', title: t('placementTest'), sub: t('placementS'), done:false, to:'placement'});
  else if(VY.features && VY.features().duel) steps.push({ic:'zap', title: t('duelTitle'), sub: t('planDuelS'), done:false, to:'duel'});
  const doneN = steps.filter(s => s.done).length, total = due + (td.newWords||0) + Math.min(newLeft, 99);
  return `<div class="card plan mt24">
    <div class="row between wrap"><div><h3>📋 ${t('todayPlan')}</h3><div class="sub">${t('todayPlanS')}</div></div><span class="chip ${doneN===steps.length?'green':'purple'}">${n(doneN)} / ${n(steps.length)}</span></div>
    <div class="plan-steps">${steps.map(s => `<button class="plan-step ${s.done?'done':''}" ${s.to ? `data-act="go" data-to="${s.to}"` : `data-act="${s.act}"`}>
      <span class="ps-ic">${s.done ? icon('check') : icon(s.ic)}</span><span class="ps-t"><b>${s.title}</b><span>${s.sub}</span></span><span class="ps-go">${icon('arrow')}</span></button>`).join('')}</div>
    ${due || newLeft ? `<button class="btn btn-primary btn-block mt12" data-act="smartSession">${icon('brain')} ${t('smartSession')} <span class="chip" style="background:rgba(255,255,255,.25);color:inherit">${n(Math.min(total, VY.smartQueue().length))}</span></button>` : ''}
  </div>`;
};

/* ---------- AI tutor ---------- */
VY.features = () => { const c = VY.account && VY.account.cfg; return (c && c.features) || {}; };
VY.aiTutor = id => {
  const w = VY.byId[id]; if(!w) return;
  const can = VY.isLoggedIn && VY.isLoggedIn() && VY.features().ai;
  VY.modal(`<div class="modal-head"><div><h2 style="margin:0">✨ ${t('aiTutor')}</h2><div class="muted small">${t('aiTutorS')}</div></div><div class="spacer"></div><button class="icon-btn" data-act="closeModal">${icon('x')}</button></div>
    <div class="row" style="gap:10px"><b class="en" dir="ltr" style="font-size:calc(22px*var(--fs,1))">${esc(w.word)}</b>${VY.speakBtn(w.word,'sm')}<span class="muted">${esc(w.fa)}</span></div>
    <label class="lbl mt16">${t('aiWrite')}</label>
    <textarea class="input en" dir="ltr" id="ai-sent" rows="3" placeholder="${esc(t('aiPh', {w: w.word}))}"></textarea>
    <div class="row wrap mt12"><button class="btn btn-primary" data-act="aiCheck" data-id="${esc(id)}">${icon('check')} ${t('aiCheck')}</button><button class="btn btn-ghost" data-act="aiExplain" data-id="${esc(id)}">${icon('sparkles')} ${t('aiExplain')}</button></div>
    ${can ? '' : `<p class="small muted mt8">${VY.isLoggedIn && VY.isLoggedIn() ? t('aiOffline') : t('aiNeedLogin')}</p>`}
    <div id="ai-out" class="mt16"></div>`);
  setTimeout(() => { const i = document.getElementById('ai-sent'); if(i) i.focus(); }, 60);
};
ACT.aiTutor = (el, e) => { if(e) e.stopPropagation(); VY.aiTutor(el.dataset.id); };
function localCheck(w, s){   // offline: simple checks that still help
  const tips = [], words = s.trim().split(/\s+/);
  const has = new RegExp('\\b' + w.word.toLowerCase().replace(/(e|y)$/, '').replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'i').test(s);
  if(!has) tips.push(t('lcNoWord', {w: w.word}));
  if(words.length < 5) tips.push(t('lcShort'));
  if(!/^[A-Z]/.test(s.trim())) tips.push(t('lcCap'));
  if(!/[.!?]$/.test(s.trim())) tips.push(t('lcPunct'));
  return tips;
}
async function aiCall(el, mode){
  const w = VY.byId[el.dataset.id], box = document.getElementById('ai-out'), s = (document.getElementById('ai-sent') || {}).value || '';
  if(mode === 'check' && s.trim().split(/\s+/).length < 3){ VY.toast(t('aiTooShort')); return; }
  const can = VY.isLoggedIn && VY.isLoggedIn() && VY.features().ai && navigator.onLine !== false;
  if(!can){
    if(mode === 'check'){ const tips = localCheck(w, s); box.innerHTML = `<div class="ai-res ${tips.length?'warn':'ok'}"><b>${tips.length ? t('lcTitle') : '✓ ' + t('lcOk')}</b>${tips.map(x=>`<div>• ${x}</div>`).join('')}<div class="muted small mt8">${t('aiLocalNote')}</div></div>`; }
    else box.innerHTML = `<div class="ai-res"><b>${esc(w.fa)}</b><div class="en" dir="ltr">${esc(w.def||'')}</div>${VY.exHTML(w, 3)}</div>`;
    return;
  }
  el.disabled = true; el.classList.add('loading'); box.innerHTML = `<div class="muted small"><span class="dot-spin"></span> ${t('aiThinking')}</div>`;
  try{
    const j = await VY.api('/ai/check', {method:'POST', body:{word: w.word, sentence: s, mode}, timeout: 30000}), r = j.result || {};
    if(mode === 'check') box.innerHTML = `<div class="ai-res ${r.correct ? 'ok' : 'warn'}">
      <div class="row between"><b>${r.correct ? '✓ ' + t('aiGood') : '✎ ' + t('aiFix')}</b><span class="chip ${+r.score>=7?'green':+r.score>=4?'yellow':'red'}">${n(+r.score||0)} / ${n(10)}</span></div>
      ${r.corrected ? `<div class="en mt8" dir="ltr"><b>→</b> ${esc(r.corrected)}</div>` : ''}${r.feedback_fa ? `<div class="mt8" dir="rtl">${esc(r.feedback_fa)}</div>` : ''}${r.tip_en ? `<div class="muted small en mt8" dir="ltr">💡 ${esc(r.tip_en)}</div>` : ''}</div>`;
    else box.innerHTML = `<div class="ai-res">${r.meaning_fa ? `<b dir="rtl">${esc(r.meaning_fa)}</b>` : ''}${r.explain_fa ? `<div class="mt8" dir="rtl">${esc(r.explain_fa)}</div>` : ''}
      ${Array.isArray(r.collocations) && r.collocations.length ? `<div class="row wrap mt8">${r.collocations.slice(0,6).map(c=>`<span class="chip purple en" dir="ltr">${esc(c)}</span>`).join('')}</div>` : ''}
      ${Array.isArray(r.examples) ? VY.exHTML({word: w.word, exs: r.examples.filter(Array.isArray)}, 3) : ''}</div>`;
    if(j.left != null) box.insertAdjacentHTML('beforeend', `<div class="muted tiny mt8">${t('aiLeft', {n: n(j.left)})}</div>`);
  }catch(e){ const c = e.code || 'server_error'; box.innerHTML = `<div class="ai-res warn">${c === 'ai_limit' ? t('aiLimit') : ['ai_unavailable','network','ai_bad_response'].includes(c) ? t('aiOffline') : esc(VY.errMsg(c))}</div>`; }
  el.disabled = false; el.classList.remove('loading');
}
ACT.aiCheck = el => aiCall(el, 'check');
ACT.aiExplain = el => aiCall(el, 'explain');
})();
