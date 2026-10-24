/* ===== DanaFox Reading: exam-style passages (IELTS · TOEFL · GRE · PTE · General) with tap-to-translate ===== */
(function(){
const {t, n, esc} = VY; const ACT = VY.ACT, V = VY.V;
const RKEY = 'vajeyar_readings_v1';
const EXAMS = {
  ielts:{e:'🎓', en:'IELTS Academic', fa:'آیلتس آکادمیک'}, toefl:{e:'🏛️', en:'TOEFL iBT', fa:'تافل iBT'},
  gre:{e:'🧠', en:'GRE Verbal', fa:'جی‌آر‌ای (Verbal)'}, pte:{e:'💻', en:'PTE Academic', fa:'پی‌تی‌ای آکادمیک'}, general:{e:'🌍', en:'General English', fa:'انگلیسی عمومی'}
};
const LEVELS = [{en:'Level 1 · Easier', fa:'سطح ۱ · آسان‌تر', tag:'B1'}, {en:'Level 2 · Medium', fa:'سطح ۲ · متوسط', tag:'B2'}, {en:'Level 3 · Hard', fa:'سطح ۳ · دشوار', tag:'C1'}, {en:'Level 4 · Expert', fa:'سطح ۴ · خیلی دشوار', tag:'C1–C2'}];
const fa = () => VY.lang() === 'fa';
VY.examName = e => e === 'inside' ? 'Inside Reading' : (EXAMS[e] || EXAMS.general)[fa() ? 'fa' : 'en'];
const lvName = l => (LEVELS[l-1] || LEVELS[0])[fa() ? 'fa' : 'en'];
const L = i => String.fromCharCode(65 + i);
const loadJ = (k, d) => { try{ return JSON.parse(localStorage.getItem(k)) || d; }catch(e){ return d; } };
let srv = loadJ(RKEY, null);

/* ---------- data: built-in passages + passages added/edited in the admin panel ---------- */
VY.readings = () => {
  const m = new Map();
  (window.VY_READINGS || []).forEach(r => m.set(r.id, r));
  if(srv && Array.isArray(srv.items)) srv.items.forEach(r => { if(!r || !r.id) return; if(r.active === false) m.delete(r.id); else m.set(r.id, Object.assign({}, m.get(r.id) || {}, r)); });
  const ord = Object.keys(EXAMS);
  return [...m.values()].filter(r => Array.isArray(r.paras) && r.paras.length && Array.isArray(r.qs) && r.qs.length)
    .sort((a, b) => (ord.indexOf(a.exam) - ord.indexOf(b.exam)) || (a.level - b.level) || String(a.title).localeCompare(String(b.title)));
};
VY.readingById = id => VY.readings().find(r => r.id === id) || (VY.insideReadings ? VY.insideReadings().find(r => r.id === id) : undefined);
VY.fetchReadings = async () => {
  if(!(VY.isServer && VY.isServer()) || navigator.onLine === false) return false;
  try{
    const j = await VY.api('/readings', {headers: srv && srv.etag ? {'If-None-Match': srv.etag} : {}, timeout: 12000});
    if(j.__notModified) return false;
    srv = {etag: j.__etag, version: j.version, items: j.items || []};
    try{ localStorage.setItem(RKEY, JSON.stringify(srv)); }catch(e){}
    return true;
  }catch(e){ return false; }
};
const res = id => VY.kvGet('rd:' + id);
VY.readingStats = () => { const all = VY.readings(); let done = 0, sum = 0; all.forEach(r => { const x = res(r.id); if(x){ done++; sum += x.best != null ? x.best : x.pct; } }); return {total: all.length, done, avg: done ? sum/done : 0}; };
const trackExam = () => ({ielts:'ielts', toefl:'toefl'})[VY.S.settings.track] || 'general';
const recRdLevel = () => { const pl = VY.kvGet('placement'); if(!pl) return 1; const c = pl.theta || 3; return c < 3.5 ? 1 : c < 4.3 ? 2 : c < 5.1 ? 3 : 4; };
VY.nextReading = () => {
  const list = VY.readings().filter(r => r.exam === trackExam()); if(!list.length) return null;
  const lv = recRdLevel();
  return list.find(r => !res(r.id) && r.level >= lv) || list.find(r => !res(r.id)) || list.slice().sort((a, b) => (res(a.id).best || 0) - (res(b.id).best || 0))[0];
};
VY.readingDoneToday = () => { const s = VY.startOfDay(), kv = VY.S.kv || {}; return Object.keys(kv).some(k => k.startsWith('rd:') && kv[k] && kv[k].at >= s); };

/* ---------- scaled scores ---------- */
const bandIelts = p => { const raw = Math.round(p * 40); return raw >= 39 ? 9 : raw >= 37 ? 8.5 : raw >= 35 ? 8 : raw >= 33 ? 7.5 : raw >= 30 ? 7 : raw >= 27 ? 6.5 : raw >= 23 ? 6 : raw >= 19 ? 5.5 : raw >= 15 ? 5 : raw >= 13 ? 4.5 : raw >= 10 ? 4 : raw >= 6 ? 3.5 : 3; };
const scaled = (exam, p) => exam === 'ielts' ? {k: t('rdBand'), v: n(bandIelts(p))} : exam === 'toefl' ? {k: 'TOEFL', v: n(Math.round(p * 30)) + ' / ' + n(30)}
  : exam === 'pte' ? {k: 'PTE', v: n(Math.round(10 + p * 80))} : exam === 'gre' ? {k: 'GRE', v: n(Math.round(130 + p * 40))} : {k: 'CEFR', v: p >= .9 ? 'C1' : p >= .7 ? 'B2' : p >= .5 ? 'B1' : 'A2'};

/* ---------- list ---------- */
const TYPE_N = {mcq:'MCQ', multi:'Multi', tfng:'T/F/NG', ynng:'Y/N/NG', head:'Headings', match:'Matching', gap:'Gap', bank:'Word bank', insert:'Insert', order:'Re-order', select:'Select', tc:'Completion'};
function rdCard(r){
  const x = res(r.id), best = x ? (x.best != null ? x.best : x.pct) : null;
  const types = [...new Set(r.qs.map(q => TYPE_N[q.type] || q.type))].slice(0, 4);
  return `<a class="card rd-card" href="#/reading/${encodeURIComponent(r.id)}">
    <div class="row between" style="gap:8px"><span class="chip ${['green','purple','yellow','orange'][r.level-1] || ''}">${lvName(r.level)}</span>${best != null ? `<span class="chip ${best>=.8?'green':best>=.5?'yellow':'red'}">✓ ${VY.pct(best*100)}</span>` : `<span class="chip">${t('newW')}</span>`}</div>
    <h3 class="en mt12" dir="ltr">${esc(r.title)}</h3>${r.title_fa ? `<div class="sub" dir="rtl">${esc(r.title_fa)}</div>` : ''}
    <div class="rd-meta"><span>⏱ ${n(r.minutes || 15)} ${t('minShort')}</span><span>❓ ${n(r.qs.length)} ${t('questions')}</span><span>📄 ${n(r.paras.length)} ${t('paragraphs')}</span></div>
    <div class="row wrap" style="gap:6px">${types.map(x => `<span class="chip tiny en" dir="ltr">${x}</span>`).join('')}</div>
  </a>`;
}
function listView(){
  return VY.secTabs('reading', '', {k:'', e:'📄', label:t('rdTexts'), sub:`${n(VY.readings().length)} ${t('rdTextsS')}`}) + textsView();
}
function deckView(c, u){ if(VY.isInside && VY.isInside(c)) return VY.secTabs('reading', '@' + c, {k:'', e:'📄', label:t('rdTexts'), sub:`${n(VY.readings().length)} ${t('rdTextsS')}`}) + (u ? VY.insideUnit(c, u) : VY.insideBook(c));
  return VY.secTabs('reading', '@' + c, {k:'', e:'📄', label:t('rdTexts'), sub:`${n(VY.readings().length)} ${t('rdTextsS')}`}) + VY.deckSection(c); }
function textsView(){
  const all = VY.readings(), ex = VY.rdExam = VY.rdExam || trackExam(), st = VY.readingStats();
  const items = all.filter(r => r.exam === ex), nx = VY.nextReading();
  return `<section class="card rd-hero">
    <div style="flex:1;min-width:0"><h2>📖 ${t('readingTitle')}</h2><p class="muted">${t('readingSub')}</p>
      <div class="row wrap mt12"><span class="chip purple">${n(st.done)} / ${n(st.total)} ${t('rdDone')}</span>${st.done ? `<span class="chip green">${t('avgScore')}: ${VY.pct(st.avg*100)}</span>` : ''}</div></div>
    ${nx ? `<a class="btn btn-primary" href="#/reading/${encodeURIComponent(nx.id)}">${icon('text')} ${t('rdSuggested')}</a>` : ''}
  </section>
  <div class="tabs-scroll mt16"><div class="seg">${Object.keys(EXAMS).map(k => `<button class="${k===ex?'on':''}" data-act="rdExam" data-v="${k}">${EXAMS[k].e} ${VY.examName(k)}</button>`).join('')}</div></div>
  <p class="small muted mt12">${t('rdAbout_' + ex)}</p>
  ${items.length ? `<div class="grid g2 mt12">${items.map(rdCard).join('')}</div>` : `<div class="card empty mt16"><div class="em">📭</div><p>${t('rdEmpty')}</p></div>`}`;
}
ACT.rdExam = el => { VY.rdExam = el.dataset.v; VY.rerender(); };

/* ---------- reader ---------- */
VY.RDS = VY.RDS || {};
const st = id => VY.RDS[id] || (VY.RDS[id] = {ans:{}, done:false, t0:Date.now(), tab:'text', fa:{}, allFa:false});
const wrap = (s, pi, insertP, twRe) => { let k = 0; return String(s).split(/([A-Za-z](?:[A-Za-z'’\-]*[A-Za-z])?)/).map((x, i) => i % 2 ? `<span class="w${twRe && twRe.test(x) ? ' tw' : ''}">${esc(x)}</span>` :
  esc(x).replace(/■/g, () => pi === insertP ? `<button class="sq" data-act="rdSq" data-k="${k++}" title="${n(k)}">■</button>` : '■')).join(''); };
const labelled = r => Array.isArray(r.labels) ? r.labels : r.qs.some(q => q.type === 'head' || q.type === 'match') ? r.paras.map((_, i) => L(i)) : null;
const norm = s => String(s == null ? '' : s).toLowerCase().replace(/[’']/g, "'").replace(/[^a-z0-9' ]+/g, ' ').replace(/\s+/g, ' ').trim().replace(/^(the|a|an) /, '');
const same = (a, b) => Array.isArray(a) && Array.isArray(b) && a.length === b.length && a.every((x, i) => x === b[i]);
const sameSet = (a, b) => Array.isArray(a) && Array.isArray(b) && a.length === b.length && a.every(x => b.includes(x));
function isRight(q, v){
  if(v == null || v === '') return false;
  switch(q.type){
    case 'multi': return sameSet(v, q.a);
    case 'gap': return (Array.isArray(q.a) ? q.a : [q.a]).some(x => norm(x) === norm(v)) && (!q.w || norm(v).split(' ').length <= q.w + 1);
    case 'order': return same(v, q.a);
    case 'tc': return same(v, q.a);
    default: return v === q.a;
  }
}
const TF = {tf:[['T','TRUE'],['F','FALSE']], tfng:[['T','TRUE'],['F','FALSE'],['NG','NOT GIVEN']], ynng:[['Y','YES'],['N','NO'],['NG','NOT GIVEN']]};
function fmtAns(q, v){
  if(v == null || (Array.isArray(v) && !v.length) || v === '') return '—';
  switch(q.type){
    case 'tf': case 'tfng': case 'ynng': return (TF[q.type].find(x => x[0] === v) || [0, v])[1];
    case 'gap': return Array.isArray(v) ? v[0] : v;
    case 'multi': return v.slice().sort().map(L).join(', ');
    case 'order': return v.map(i => n(i + 1)).join(' → ');
    case 'tc': return v.map((x, i) => q.o[i] && q.o[i][x] != null ? q.o[i][x] : '—').join(' / ');
    case 'insert': return '■ ' + n(v + 1);
    case 'head': case 'match': case 'bank': return String(q.o[v] != null ? q.o[v] : v);
    default: return L(v) + '. ' + (q.o[v] != null ? q.o[v] : '');
  }
}
const answered = (q, v) => !(v == null || v === '' || (Array.isArray(v) && (!v.length || (q.type === 'tc' && v.some(x => x == null)))));
function qBody(q, i, S){
  const v = S.ans[i], dis = S.done ? 'disabled' : '', ok = S.done && isRight(q, v);
  const optCls = j => { let c = ''; const sel = Array.isArray(v) ? v.includes(j) : v === j; if(sel) c += ' on'; if(S.done){ const right = Array.isArray(q.a) ? q.a.includes(j) : q.a === j; if(right) c += ' right'; else if(sel) c += ' bad'; } return c; };
  switch(q.type){
    case 'tf': case 'tfng': case 'ynng':
      return `<div class="rq-chips">${TF[q.type].map(([k, l]) => { let c = v === k ? ' on' : ''; if(S.done){ if(q.a === k) c += ' right'; else if(v === k) c += ' bad'; } return `<button class="rchip${c}" data-act="rdPick" data-q="${i}" data-v="${k}" ${dis}>${l}</button>`; }).join('')}</div>`;
    case 'gap':
      return `<div class="row mt8"><input class="input en rq-in ${S.done ? (ok ? 'ok' : 'bad') : ''}" dir="ltr" data-q="${i}" value="${esc(v || '')}" placeholder="${q.w ? esc(t('maxWords', {n: n(q.w)})) : '…'}" autocomplete="off" autocapitalize="off" spellcheck="false" ${dis}></div>`;
    case 'order': {
      const cur = Array.isArray(v) ? v : [], rest = q.o.map((_, j) => j).filter(j => !cur.includes(j));
      return `<div class="ord"><div class="ord-lbl small muted">${t('ordYours')}</div><div class="ord-list picked">${cur.length ? cur.map((j, k) => `<button class="ord-it on ${S.done ? (q.a[k] === j ? 'right' : 'bad') : ''}" data-act="rdOrd" data-q="${i}" data-v="${j}" ${dis}><b>${n(k+1)}</b><span class="en" dir="ltr">${esc(q.o[j])}</span></button>`).join('') : `<div class="muted small ord-empty">${t('ordHint')}</div>`}</div>
        ${rest.length ? `<div class="ord-lbl small muted mt8">${t('ordLeft')}</div><div class="ord-list">${rest.map(j => `<button class="ord-it" data-act="rdOrd" data-q="${i}" data-v="${j}" ${dis}><b>+</b><span class="en" dir="ltr">${esc(q.o[j])}</span></button>`).join('')}</div>` : ''}</div>`;
    }
    case 'tc': {
      const cur = Array.isArray(v) ? v : [];
      return q.o.map((opts, b) => `<div class="tc-row"><span class="tc-n">(${n(b+1)})</span><div class="rq-chips">${opts.map((o, j) => { let c = cur[b] === j ? ' on' : ''; if(S.done){ if(q.a[b] === j) c += ' right'; else if(cur[b] === j) c += ' bad'; } return `<button class="rchip en${c}" dir="ltr" data-act="rdTc" data-q="${i}" data-b="${b}" data-v="${j}" ${dis}>${esc(o)}</button>`; }).join('')}</div></div>`).join('');
    }
    case 'insert':
      return `<div class="rq-chips">${q.o.map((o, j) => `<button class="rchip${optCls(j)}" data-act="rdPick" data-q="${i}" data-v="${j}" ${dis}>■ ${n(j+1)}</button>`).join('')}</div><div class="small muted mt8">${t('insertHint')}</div>`;
    default: {
      const short = q.o.every(o => String(o).length <= 22);
      if(short && q.type !== 'mcq' && q.type !== 'multi') return `<div class="rq-chips">${q.o.map((o, j) => `<button class="rchip en${optCls(j)}" dir="ltr" data-act="rdPick" data-q="${i}" data-v="${j}" ${dis}>${esc(o)}</button>`).join('')}</div>`;
      const lt = !['head', 'select'].includes(q.type);
      return `<div class="ropts">${q.o.map((o, j) => `<button class="ropt${optCls(j)}" dir="ltr" data-act="rdPick" data-q="${i}" data-v="${j}" ${dis}>${lt ? `<span class="k">${L(j)}</span>` : ''}<span class="en">${esc(o)}</span></button>`).join('')}</div>`;
    }
  }
}
const qText = q => q.type === 'tc' ? esc(q.q).replace(/\[(\d)\]/g, (_, d) => `<b class="tc-gap">(${n(d)})</b>`) : esc(q.q).replace(/_{3,}/g, '<b class="gap-line">______</b>').replace(/\n/g, '<br>');
const HELP = {tf:'rh_tf', tfng:'rh_tfng', ynng:'rh_ynng', head:'rh_head', match:'rh_match', gap:'rh_gap', bank:'rh_bank', insert:'rh_insert', order:'rh_order', select:'rh_select', tc:'rh_tc', multi:'rh_multi'};
function questionsHTML(r, S){
  let out = '', seenHelp = {};
  r.qs.forEach((q, i) => {
    if(q.g) out += `<div class="rd-g en" dir="ltr">${esc(q.g)}</div>`;
    if(HELP[q.type] && !seenHelp[q.type] && fa()){ seenHelp[q.type] = 1; out += `<div class="rd-help">💡 ${t(HELP[q.type])}</div>`; }
    const v = S.ans[i], ok = S.done && isRight(q, v);
    out += `<div class="rq ${S.done ? (ok ? 'ok' : 'bad') : answered(q, v) ? 'ans' : ''}" id="rq-${i}">
      <div class="rq-h"><span class="rq-n">${n(i+1)}</span><div class="rq-q en" dir="ltr">${q.kind ? `<span class="chip tiny">${esc(q.kind)}</span> ` : ''}${qText(q)}${q.type === 'multi' && q.k ? ` <b class="muted">(${t('chooseN', {n: n(q.k)})})</b>` : ''}</div></div>
      ${qBody(q, i, S)}
      ${S.done ? `<div class="rq-res">${ok ? '✓ ' + t('correct') : `× ${t('answerWas')} <b class="en" dir="ltr">${esc(fmtAns(q, q.a))}</b>${answered(q, v) ? ` · <span class="muted">${t('yourAnswer')}: <span class="en" dir="ltr">${esc(fmtAns(q, v))}</span></span>` : ''}`}</div>` : ''}
    </div>`;
  });
  return out;
}
function resultHTML(r, S){
  const total = r.qs.length, score = r.qs.reduce((a, q, i) => a + (isRight(q, S.ans[i]) ? 1 : 0), 0), p = score / total, sc = scaled(r.exam, p);
  const x = res(r.id) || {}, nx = r.exam === 'inside' ? VY.insideNext(r) : VY.readings().filter(z => z.exam === r.exam && z.id !== r.id && !res(z.id))[0];
  return `<div class="card rd-result">
    <div class="row between wrap"><h3>${p >= .8 ? '🏆' : p >= .5 ? '👏' : '💪'} ${t('rdResult')}</h3><span class="chip purple">⏱ ${fmtTime(S.time || 0)}</span></div>
    <div class="kv mt12"><div><b>${n(score)} / ${n(total)}</b><span>${t('score')}</span></div><div><b style="color:${p>=.8?'var(--green)':p>=.5?'var(--yellow-strong)':'var(--red)'}">${VY.pct(p*100)}</b><span>${t('accuracy')}</span></div><div><b class="en" dir="ltr">${sc.v}</b><span>${sc.k} ≈</span></div><div><b>${VY.pct((x.best != null ? x.best : p)*100)}</b><span>${t('best')}</span></div></div>
    <div class="row wrap mt16"><button class="btn btn-primary btn-sm" data-act="rdRetry" data-id="${esc(r.id)}">${icon('repeat')} ${t('retry')}</button>${Object.keys(r.gl || {}).length ? `<button class="btn btn-soft btn-sm" data-act="rdSaveGl" data-id="${esc(r.id)}">${icon('plus')} ${t('rdSaveWords')}</button>` : ''}${nx ? `<a class="btn btn-ghost btn-sm" href="#/reading/${encodeURIComponent(nx.id)}">${t('next')} ${icon('arrow')}</a>` : ''}</div>
  </div>`;
}
const fmtTime = s => { s = Math.max(0, Math.round(s)); return n(Math.floor(s/60)) + ':' + n(String(s%60).padStart(2, '0')); };
function readerView(id){
  const r = VY.readingById(id);
  if(!r && /^ir\d-/.test(id) && !window.VY_INSIDE && VY.insideWait) return VY.insideWait();
  if(!r) return `<div class="card empty"><div class="em">📭</div><p>${t('rdEmpty')}</p><a class="btn btn-primary" href="#/reading">${t('back')}</a></div>`;
  const S = st(id), labs = labelled(r), ins = r.qs.find(q => q.type === 'insert'), insP = ins ? (ins.p != null ? ins.p : -1) : -1;
  const answeredN = r.qs.filter((q, i) => answered(q, S.ans[i])).length, pfa = Array.isArray(r.paras_fa) ? r.paras_fa : [];
  const gl = Object.entries(r.gl || {}), isIn = r.exam === 'inside', back = isIn ? `#/reading/@${r.book}/${r.unit}` : '#/reading', twRe = isIn && VY.insideWordRe ? VY.insideWordRe(r.words) : null;
  const sub = isIn ? `${VY.CATS[r.book] ? VY.CATS[r.book].icon : '📘'} ${esc(VY.insideBookName(r.book))} · ${t('irUnit')} ${n(r.unit)} · ${t('irReadingN', {n: n(r.no)})}` : `${EXAMS[r.exam] ? EXAMS[r.exam].e : ''} ${VY.examName(r.exam)} · ${lvName(r.level)}`;
  return `<div class="rd ${S.tab === 'qs' ? 'tab-qs' : 'tab-text'}">
    <div class="rd-top card">
      <a class="icon-btn" href="${back}" title="${t('back')}">${icon('back')}</a>
      <div class="rd-tt"><b class="en" dir="ltr">${esc(r.title)}</b><span>${sub}</span></div>
      <span class="chip ${S.done ? 'green' : 'yellow'}" id="rd-time">⏱ ${S.done ? fmtTime(S.time) : fmtTime((Date.now() - S.t0)/1000)}</span>
      ${pfa.length ? `<button class="btn btn-ghost btn-sm" data-act="rdAllFa" data-id="${esc(id)}" title="${t('translation')}">${S.allFa ? '✓ ' : ''}فا</button>` : ''}
    </div>
    <div class="rd-tabs"><button class="${S.tab !== 'qs' ? 'on' : ''}" data-act="rdTab" data-id="${esc(id)}" data-v="text">${icon('text')} ${t('passage')}</button><button class="${S.tab === 'qs' ? 'on' : ''}" data-act="rdTab" data-id="${esc(id)}" data-v="qs">${icon('quiz')} ${t('questions')} <span class="chip tiny">${n(answeredN)}/${n(r.qs.length)}</span></button></div>
    <div class="rd-grid">
      <section class="card rd-text" id="rd-text" data-id="${esc(id)}">
        <h2 class="en" dir="ltr">${esc(r.title)}</h2>${r.title_fa ? `<div class="muted" dir="rtl">${esc(r.title_fa)}</div>` : ''}
        <div class="rd-hint small muted">👆 ${t('tapWordHint')}${twRe ? ` · <span class="tw-key">${t('irTwHint')}</span>` : ''}</div>
        ${r.pre ? `<p class="rd-pre en" dir="ltr">${esc(r.pre)}</p>` : ''}
        ${r.paras.map((p, i) => /^## /.test(p) ? `<h3 class="rd-h en" dir="ltr">${esc(p.slice(3))}</h3>` : `<div class="rd-p">${labs && labs[i] ? `<span class="rd-lab">${esc(labs[i])}</span>` : ''}<div class="rd-pb"><p class="en" dir="ltr">${wrap(p, i, insP, twRe)}</p>
          ${pfa[i] ? `<div class="rd-fa ${S.allFa || S.fa[i] ? '' : 'hide'}" dir="rtl">${esc(pfa[i])}</div><button class="rd-tr" data-act="rdParaFa" data-id="${esc(id)}" data-i="${i}">${S.allFa || S.fa[i] ? t('hideTr') : t('showTr')}</button>` : ''}</div></div>`).join('')}
        ${Array.isArray(r.notes) && r.notes.length ? `<div class="rd-notes en" dir="ltr">${r.notes.map(x => `<div>${esc(x)}</div>`).join('')}</div>` : ''}
        ${gl.length ? `<div class="rd-gl"><div class="lbl">📚 ${t('glossary')}</div><div class="row wrap">${gl.map(([w, f]) => `<button class="chip purple" data-act="rdGlWord" data-w="${esc(w)}"><span class="en" dir="ltr">${esc(w)}</span> · ${esc(f)}</button>`).join('')}</div></div>` : ''}
        <button class="btn btn-primary btn-block mt16 rd-goq" data-act="rdTab" data-id="${esc(id)}" data-v="qs">${t('goQuestions')} ${icon('arrow')}</button>
      </section>
      <section class="rd-qs" id="rd-qs">
        ${S.done ? resultHTML(r, S) : ''}
        <div class="card">${questionsHTML(r, S)}
          ${S.done ? '' : `<div class="rd-submit"><span class="small muted">${t('answeredN', {a: n(answeredN), b: n(r.qs.length)})}</span><button class="btn btn-yellow btn-lg" data-act="rdSubmit" data-id="${esc(id)}">${icon('check')} ${t('rdSubmit')}</button></div>`}
        </div>
      </section>
    </div>
  </div>`;
}
V.reading = {title: () => { const id = VY.params && VY.params[0]; if(id && id[0] === '@'){ const C = VY.CATS[id.slice(1)]; return t('reading') + (C && C.short ? ' · ' + VY.L(C.short) : ''); } const r = id && VY.readingById(decodeURIComponent(id)); return r ? t('reading') + ' · ' + (r.exam === 'inside' ? VY.insideBookName(r.book) : VY.examName(r.exam)) : t('reading'); },
  render(){ const id = VY.params && VY.params[0]; if(id && id[0] === '@'){ const c = id.slice(1); return VY.deckCats('reading').includes(c) ? deckView(c, VY.params[1]) : listView(); } return id ? readerView(decodeURIComponent(id)) : listView(); },
  after(){
    const id = VY.params && VY.params[0] ? decodeURIComponent(VY.params[0]) : null;
    if(!id){ VY.fetchReadings().then(ch => { if(ch && VY.current === 'reading' && !(VY.params||[])[0]) VY.rerender(); }); return; }
    const S = VY.RDS[id]; if(!S) return;
    document.querySelectorAll('.rq-in').forEach(inp => inp.oninput = () => { S.ans[+inp.dataset.q] = inp.value; inp.closest('.rq').classList.toggle('ans', !!inp.value.trim()); counter(id); });
    const txt = document.getElementById('rd-text'); if(txt) txt.addEventListener('click', onWordTap);
    if(!S.done){ const tm = document.getElementById('rd-time'); const iv = setInterval(() => { if(!document.body.contains(tm)) return clearInterval(iv); tm.textContent = '⏱ ' + fmtTime((Date.now() - S.t0)/1000); }, 1000); VY.addTimer(iv); }
  }};
const timers = [];
VY.addTimer = x => timers.push(x);
const ost = VY.stopTimers; VY.stopTimers = () => { timers.splice(0).forEach(x => { clearInterval(x); clearTimeout(x); }); closeSheet(); if(ost) ost(); };
function counter(id){ const r = VY.readingById(id), S = VY.RDS[id]; const b = document.querySelector('.rd-tabs .chip'); if(b && r) b.textContent = n(r.qs.filter((q, i) => answered(q, S.ans[i])).length) + '/' + n(r.qs.length); const s = document.querySelector('.rd-submit .small'); if(s && r) s.textContent = t('answeredN', {a: n(r.qs.filter((q, i) => answered(q, S.ans[i])).length), b: n(r.qs.length)}); }
const keepScroll = fn => { const y = window.scrollY, q = document.getElementById('rd-qs'), qy = q ? q.scrollTop : 0; fn(); window.scrollTo(0, y); const q2 = document.getElementById('rd-qs'); if(q2) q2.scrollTop = qy; };
const curId = () => decodeURIComponent((VY.params || [])[0] || '');
ACT.rdTab = el => { const S = st(el.dataset.id); S.tab = el.dataset.v; VY.rerender(); const g = document.querySelector(S.tab === 'qs' ? '#rd-qs' : '#rd-text'); if(g && innerWidth < 960) g.scrollIntoView({block:'start'}); };
ACT.rdParaFa = el => { const S = st(el.dataset.id), i = +el.dataset.i; S.fa[i] = !(S.allFa || S.fa[i]); if(S.allFa && !S.fa[i]){ S.allFa = false; VY.readingById(el.dataset.id).paras.forEach((_, k) => { if(k !== i) S.fa[k] = true; }); } keepScroll(() => VY.rerender()); };
ACT.rdAllFa = el => { const S = st(el.dataset.id); S.allFa = !S.allFa; S.fa = {}; keepScroll(() => VY.rerender()); };
ACT.rdPick = el => {
  const id = curId(), r = VY.readingById(id), S = st(id); if(S.done) return;
  const i = +el.dataset.q, q = r.qs[i], raw = el.dataset.v, v = /^\d+$/.test(raw) ? +raw : raw;
  if(q.type === 'multi'){ let cur = Array.isArray(S.ans[i]) ? S.ans[i].slice() : []; if(cur.includes(v)) cur = cur.filter(x => x !== v); else { cur.push(v); if(q.k && cur.length > q.k) cur.shift(); } S.ans[i] = cur; }
  else S.ans[i] = S.ans[i] === v ? null : v;
  keepScroll(() => VY.rerender());
};
ACT.rdSq = (el, e) => { e.stopPropagation(); const id = curId(), r = VY.readingById(id), S = st(id); if(S.done) return; const i = r.qs.findIndex(q => q.type === 'insert'); if(i < 0) return; S.ans[i] = +el.dataset.k; keepScroll(() => VY.rerender()); VY.toast('■ ' + n(+el.dataset.k + 1) + ' ✓'); };
ACT.rdOrd = el => { const id = curId(), S = st(id); if(S.done) return; const i = +el.dataset.q, v = +el.dataset.v; let cur = Array.isArray(S.ans[i]) ? S.ans[i].slice() : []; cur = cur.includes(v) ? cur.filter(x => x !== v) : cur.concat(v); S.ans[i] = cur; keepScroll(() => VY.rerender()); };
ACT.rdTc = el => { const id = curId(), r = VY.readingById(id), S = st(id); if(S.done) return; const i = +el.dataset.q, b = +el.dataset.b, v = +el.dataset.v; const cur = Array.isArray(S.ans[i]) ? S.ans[i].slice() : r.qs[i].o.map(() => null); cur[b] = cur[b] === v ? null : v; S.ans[i] = cur; keepScroll(() => VY.rerender()); };
ACT.rdSubmit = el => {
  const id = el.dataset.id, r = VY.readingById(id), S = st(id);
  const left = r.qs.filter((q, i) => !answered(q, S.ans[i])).length;
  if(left && !confirm(t('rdUnanswered', {n: n(left)}))) return;
  S.done = true; S.time = (Date.now() - S.t0) / 1000;
  const score = r.qs.reduce((a, q, i) => a + (isRight(q, S.ans[i]) ? 1 : 0), 0), p = score / r.qs.length, old = res(id) || {};
  VY.kvSet('rd:' + id, {exam: r.exam, level: r.level, pct: Math.round(p*1000)/1000, score, total: r.qs.length, at: Date.now(), time: Math.round(S.time), best: Math.max(old.best || 0, Math.round(p*1000)/1000), n: (old.n || 0) + 1});
  VY.addXP(5 + score * 3); VY.logDay({}); VY.save(); VY.sound(p >= .5 ? 'done' : 'bad');
  S.tab = 'qs'; VY.rerender();
  const q = document.getElementById('rd-qs'); if(q) q.scrollIntoView({block:'start', behavior:'smooth'});
};
ACT.rdRetry = el => { delete VY.RDS[el.dataset.id]; VY.rerender(); };

/* ---------- saving words ---------- */
VY.addCustomWord = (word, fa, ex, exFa) => {
  word = String(word || '').trim(); if(!word) return null;
  const bank = VY.findWord(word); if(bank && bank.cat !== 'custom'){ ACT.addToReview({dataset:{id: bank.id}}); return bank.id; }
  const id = 'custom:' + word.toLowerCase();
  let c = VY.S.custom.find(x => x.id === id);
  if(!c){ c = {id, word, fa: (fa || '').trim() || '—', pos: 'n', def: '', ex: (ex || '').trim()}; if(ex) c.exs = [[ex, exFa || '']]; VY.S.custom.push(c); VY.buildWords(); }
  const p = VY.ensureP(id); if(!p.seen){ p.seen = true; p.first = p.last = Date.now(); VY.logDay({newWords: 1}); } p.due = Date.now(); p.interval = 0;
  VY.save(); VY.refreshChrome(); return id;
};
const sentenceOf = (text, word) => { const ss = String(text).replace(/■\s?/g, '').match(/[^.!?]+[.!?]+["”’)]*|[^.!?]+$/g) || [text]; const re = new RegExp('\\b' + word.replace(/[.*+?^${}()|[\]\\]/g, '\\$&') + '\\b', 'i'); return (ss.find(s => re.test(s)) || '').trim().slice(0, 300); };
ACT.rdSaveGl = el => {
  const r = VY.readingById(el.dataset.id); let k = 0;
  Object.entries(r.gl || {}).forEach(([w, f]) => { const para = r.paras.find(p => new RegExp('\\b' + w.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'i').test(p)) || ''; if(VY.addCustomWord(w, f, sentenceOf(para, w))) k++; });
  VY.toast('✓ ' + n(k) + ' ' + t('words') + ' → ' + t('review'));
};

/* ---------- tap a word / select a phrase → meaning sheet ---------- */
let sheetEl = null;
function closeSheet(){ if(sheetEl){ sheetEl.remove(); sheetEl = null; } const s = document.getElementById('rd-selbtn'); if(s) s.remove(); }
VY.closeSheet = closeSheet;
ACT.closeSheet = () => closeSheet();
function openSheet(word, ctx){
  closeSheet();
  const w = VY.findWord(word), r = VY.readingById(curId()), glk = r && r.gl ? Object.keys(r.gl).find(k => k.toLowerCase() === word.toLowerCase() || (w && k.toLowerCase() === w.word.toLowerCase())) : null;
  const d = document.createElement('div'); d.className = 'sheet'; sheetEl = d;
  const head = `<div class="row" style="gap:10px"><b class="en sh-w" dir="ltr">${esc(word)}</b>${VY.speakBtn(word, 'sm')}<div class="spacer" style="flex:1"></div><button class="icon-btn" data-act="closeSheet">${icon('x')}</button></div>`;
  let body = '';
  if(w) body = `<div class="sh-fa">${esc(w.fa)}</div>${w.word.toLowerCase() !== word.toLowerCase() ? `<div class="small muted en" dir="ltr">→ ${esc(w.word)}</div>` : ''}${w.def ? `<div class="small en" dir="ltr">${esc(w.def)}</div>` : ''}
    <div class="row wrap mt12"><span class="chip">${VY.catName(w.cat)}</span>${VY.statusChip(w.id)}</div>
    <div class="row wrap mt12"><button class="btn btn-primary btn-sm" data-act="shReview" data-id="${esc(w.id)}">${icon('plus')} ${t('addReview')}</button><button class="btn btn-ghost btn-sm" data-act="shDetails" data-id="${esc(w.id)}">${icon('book')} ${t('details')}</button></div>`;
  else body = `<div class="sh-fa" id="sh-fa">${glk ? esc(r.gl[glk]) : `<span class="dot-spin"></span> <span class="muted small">${t('translating')}</span>`}</div><div id="sh-alts" class="small muted"></div>
    <div class="row wrap mt12"><button class="btn btn-primary btn-sm" data-act="shSave" data-w="${esc(word)}">${icon('plus')} ${t('saveToMyWords')}</button></div>`;
  d.innerHTML = `<div class="sheet-in">${head}${body}${ctx ? `<div class="sh-ctx en small" dir="ltr">“${VY.highlight(ctx, word)}”</div>` : ''}</div>`;
  d.dataset.ctx = ctx || '';
  document.body.appendChild(d);
  if(!w && !glk) VY.trFa(word).then(x => { const f = document.getElementById('sh-fa'); if(!f) return; if(x && x.fa){ f.textContent = x.fa; const al = document.getElementById('sh-alts'); if(al && x.alts && x.alts.length) al.innerHTML = x.alts.filter(a => a.terms && a.terms.length).map(a => `<div><i class="en">${esc(a.pos)}</i>: ${esc(a.terms.join('، '))}</div>`).join(''); } else f.innerHTML = `<span class="muted small">${t('trOffline')}</span>`; });
}
function onWordTap(e){
  const s = e.target.closest('.w'); if(!s) return;
  const sel = window.getSelection && String(window.getSelection()); if(sel && sel.trim().includes(' ')) return;
  const p = s.closest('p'); const ctx = p ? sentenceOf(p.textContent, s.textContent) : '';
  document.querySelectorAll('.rd-text .w.hl').forEach(x => x.classList.remove('hl')); s.classList.add('hl');
  openSheet(s.textContent.replace(/[’']s$/, ''), ctx);
}
ACT.rdGlWord = el => openSheet(el.dataset.w, '');
ACT.shReview = el => { ACT.addToReview(el); closeSheet(); };
ACT.shDetails = el => { closeSheet(); VY.openWord(el.dataset.id); };
ACT.shSave = el => { const f = document.getElementById('sh-fa'), fa = f ? f.textContent.trim() : ''; const ctx = sheetEl ? sheetEl.dataset.ctx : ''; VY.addCustomWord(el.dataset.w, /…|\.\.\./.test(fa) ? '' : fa, ctx); VY.toast('✓ ' + t('added')); closeSheet(); };
let selT = null;
document.addEventListener('selectionchange', () => {
  clearTimeout(selT);
  selT = setTimeout(() => {
    if(VY.current !== 'reading') return;
    const s = window.getSelection(), txt = s ? String(s).replace(/\s+/g, ' ').trim() : '';
    const old = document.getElementById('rd-selbtn');
    const inText = s && s.anchorNode && s.anchorNode.parentElement && s.anchorNode.parentElement.closest('#rd-text');
    if(!inText || txt.length < 3 || txt.length > 120 || !/[a-z]/i.test(txt) || !txt.includes(' ')){ if(old) old.remove(); return; }
    const b = old || document.createElement('button'); b.id = 'rd-selbtn'; b.className = 'btn btn-primary sel-btn'; b.innerHTML = `${icon('globe')} ${t('translateSel')}`;
    b.onclick = ev => { ev.preventDefault(); const p = s.anchorNode.parentElement.closest('p'); openSheet(txt, ''); };
    if(!old) document.body.appendChild(b);
  }, 350);
});
document.addEventListener('click', e => { if(sheetEl && !e.target.closest('.sheet') && !e.target.closest('.rd-text .w') && !e.target.closest('[data-act="rdGlWord"]') && !e.target.closest('#rd-selbtn')) closeSheet(); }, true);
})();
