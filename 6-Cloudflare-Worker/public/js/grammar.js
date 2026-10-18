/* ===== VajeYar · Grammar section — English Grammar in Use (5th ed., Raymond Murphy)
   #/grammar               → units grouped like the book's contents (+ study guide test, additional exercises, appendices)
   #/grammar/u/<n>         → unit: lesson (sections A, B, C … with optional Persian) · interactive exercises with answer key
   #/grammar/test          → study guide: multiple-choice diagnostic test that points to the units to study
   #/grammar/add           → additional exercises       #/grammar/app/<n> → appendix (reference)
   Book data (~1.4 MB) is loaded lazily from js/grammar_data.js. ===== */
(function(){
const {t, n, esc} = VY; const ACT = VY.ACT, V = VY.V;
const fa = () => VY.lang() === 'fa';
let loading = null;
VY.loadGrammar = () => window.VY_GRAMMAR ? Promise.resolve(true) : loading || (loading = new Promise(res => {
  const s = document.createElement('script'); s.src = 'js/grammar_data.js'; s.async = true;
  s.onload = () => res(!!window.VY_GRAMMAR); s.onerror = () => { loading = null; s.remove(); res(false); };
  document.head.appendChild(s);
}));
const wait = () => {
  VY.loadGrammar().then(ok => { if(ok) VY.rerender(); else { const e = document.getElementById('gr-wait'); if(e) e.innerHTML = `<div class="em">📡</div><p>${t('irLoadErr')}</p><button class="btn btn-primary" data-act="grRetry">${t('retry')}</button>`; } });
  return `<div class="card empty" id="gr-wait"><div class="em"><span class="dot-spin"></span></div><p>${t('loading')}</p></div>`;
};
ACT.grRetry = () => { VY.loadGrammar().then(ok => ok && VY.rerender()); };
const G = () => window.VY_GRAMMAR;
const keepY = fn => { const y = window.scrollY; fn(); window.scrollTo(0, y); };
const res = id => VY.kvGet('gr:' + id);
const lv = u => 'l' + (((u - 1) % 4) + 1);
const unitDone = u => { const xs = u.exs.map(e => res(e.no)).filter(Boolean); return {done: xs.length, total: u.exs.length, pct: xs.length ? xs.reduce((a, x) => a + (x.total ? x.score / x.total : 1), 0) / xs.length : 0}; };
const pctChip = (p, cls = '') => `<span class="chip ${cls} ${p >= .8 ? 'green' : p >= .5 ? 'yellow' : 'red'}">${VY.pct(p * 100)}</span>`;

/* ---------- answer checking ---------- */
const norm = s => String(s || '').toLowerCase().replace(/[’‘`´]/g, "'").replace(/[“”]/g, '"').replace(/\.\.\.|…/g, ' ').replace(/[.,!?;:"]/g, ' ').replace(/\s*\/\s*/g, '/').replace(/\s+/g, ' ').trim();
function variants(ans){
  // "He’s tying / He is tying" → alternatives; "(the)" optional parts → with and without
  let alts = String(ans).replace(/\s*\((?:or|=|not)\b[^)]*\)/gi, '').split(/\s+\/\s+|\s+or\s+/);
  const out = new Set();
  alts.forEach(a => {
    const base = a.trim(); out.add(norm(base.replace(/[()]/g, ''))); out.add(norm(base.replace(/\([^)]*\)/g, ' ')));
  });
  return [...out].filter(Boolean);
}
const isOpen = (e, a) => e.ex || /^[A-Z]?[a-z].{70,}/.test(a) && a.split(' ').length > 12;
const correct = (val, ans) => { const v = norm(val); return !!v && variants(ans).some(x => x === v || x.replace(/'/g, '') === v.replace(/'/g, '')); };

/* ---------- exercise card (unit exercises + additional exercises) ---------- */
VY.GRS = VY.GRS || {};
const ST = id => VY.GRS[id] || (VY.GRS[id] = {v: {}, checked: false, show: false, fa: false});
const ITEM = /^\s*(\d{1,2}|[A-L])(?=\s)/;
function exCard(e, id, opts = {}){
  const S = ST(id), K = new Map(e.key.map(([k, a]) => [String(k), a])), r = res(id), used = new Set();
  const inp = (k, j, ph = '') => { const key = k + (j != null ? '.' + j : ''), val = S.v[key] || '';
    let cls = ''; if(S.checked && !isOpen(e, K.get(k))) cls = correct(gather(S, k, K.get(k)), K.get(k)) ? 'ok' : 'bad';
    return `<input class="gr-in ${cls}" dir="ltr" autocomplete="off" autocapitalize="off" spellcheck="false" data-gx="${esc(id)}" data-k="${esc(key)}" value="${esc(val)}" placeholder="${esc(ph)}">`; };
  const fb = k => { if(!(S.checked || S.show)) return ''; const a = K.get(k), open = isOpen(e, a);
    if(S.show || open) return `<div class="gr-ans" dir="ltr">${open ? '💡 ' : '✓ '}${esc(a)}</div>`;
    return correct(gather(S, k, a), a) ? '' : `<div class="gr-ans bad" dir="ltr">✓ ${esc(a)}</div>`; };
  let body = '';
  if(e.m === 'gap'){
    body = e.body.split('\n').map(line => {
      if(!line.trim()) return '<div class="gr-sp"></div>';
      const m = line.match(ITEM), k = m && m[1];
      if(!k || !K.has(k) || used.has(k)) return `<div class="gr-line">${esc(line.trim()).replace(/______/g, '<span class="gr-gap"></span>')}</div>`;
      used.add(k); const a = K.get(k), parts = a.split(/\s*…\s*/), gaps = (line.match(/______/g) || []).length;
      let html;
      if(gaps && !isOpen(e, a) && (gaps === 1 || gaps === parts.length)){
        let j = 0; html = esc(line.trim().slice(m[0].trim().length).trim()).replace(/______/g, () => inp(k, gaps > 1 ? j++ : null));
      } else html = `${esc(line.trim().slice(m[0].trim().length).trim()).replace(/______/g, '<span class="gr-gap"></span>')}<div class="gr-row">${isOpen(e, a) ? `<textarea class="gr-in gr-ta" dir="ltr" data-gx="${esc(id)}" data-k="${esc(k)}" rows="2">${esc(S.v[k] || '')}</textarea>` : inp(k)}</div>`;
      return `<div class="gr-line gr-item"><b class="gr-no">${esc(k)}</b><div class="gr-tx">${html}${fb(k)}</div></div>`;
    }).join('');
  } else body = `<pre class="gr-pre" dir="ltr">${esc(e.body)}</pre>`;
  const rest = e.key.filter(([k]) => !used.has(String(k)));
  if(rest.length) body += `<div class="gr-grid">${rest.map(([k, a]) => `<label class="gr-cell"><b class="gr-no">${esc(String(k))}</b>${isOpen(e, a) ? `<textarea class="gr-in gr-ta" dir="ltr" data-gx="${esc(id)}" data-k="${esc(String(k))}" rows="2">${esc(S.v[k] || '')}</textarea>` : inp(String(k))}${fb(String(k))}</label>`).join('')}</div>`;
  const sc = S.checked ? score(e, S) : null;
  return `<div class="card gr-ex" id="gx-${esc(id.replace(/\W/g, '_'))}">
    <div class="row between" style="gap:8px;align-items:flex-start"><div style="min-width:0"><span class="chip purple">${opts.label || t('grEx')} ${esc(e.no)}</span>${opts.sec ? ` <span class="small muted en" dir="ltr">${esc(opts.sec)}</span>` : ''}</div>${r ? pctChip(r.total ? r.score / r.total : 1, 'tiny') : ''}</div>
    <p class="gr-ins en" dir="ltr">${esc(e.ins)}</p>${e.insFa ? `<p class="gr-fa small muted" dir="rtl">${esc(e.insFa)}</p>` : ''}
    <div class="gr-body en" dir="ltr">${body}</div>
    ${e.kpre && (S.checked || S.show) ? `<div class="gr-ans" dir="ltr">${esc(e.kpre)}</div>` : ''}
    ${e.ex ? `<div class="small muted mt8">💡 ${t('grExample')}</div>` : ''}
    <div class="row wrap mt12" style="gap:8px"><button class="btn btn-primary btn-sm" data-act="grCheck" data-id="${esc(id)}">${icon('check')} ${t('grCheck')}</button>
      <button class="btn btn-ghost btn-sm" data-act="grShow" data-id="${esc(id)}">${S.show ? '🙈 ' + t('irHideAll') : '🔑 ' + t('irShowAll')}</button>
      ${S.checked || Object.keys(S.v).length ? `<button class="btn btn-ghost btn-sm" data-act="grReset" data-id="${esc(id)}">↺ ${t('grReset')}</button>` : ''}
      ${sc ? `<span class="gr-score ${sc.total && sc.score / sc.total >= .8 ? 'good' : ''}">${sc.total ? t('grScore', {a: n(sc.score), b: n(sc.total)}) : '✓'}</span>` : ''}</div>
  </div>`;
}
function gather(S, k, a){ const parts = String(a).split(/\s*…\s*/); if(S.v[k] != null) return S.v[k]; if(parts.length > 1) return parts.map((_, j) => S.v[k + '.' + j] || '').join(' '); return ''; }
function score(e, S){ let s = 0, tot = 0; e.key.forEach(([k, a]) => { if(isOpen(e, a)) return; tot++; if(correct(gather(S, String(k), a), a)) s++; }); return {score: s, total: tot}; }
const findEx = id => { const D = G(); if(!D) return null; if(id.startsWith('add')) return D.add.find(x => 'add' + x.no === id); for(const u of D.units){ const e = u.exs.find(x => x.no === id); if(e) return e; } return null; };
const grab = id => document.querySelectorAll(`[data-gx="${CSS.escape(id)}"]`).forEach(el => { ST(id).v[el.dataset.k] = el.value; });
ACT.grCheck = el => { const id = el.dataset.id, e = findEx(id); if(!e) return; grab(id); const S = ST(id); S.checked = true; const sc = score(e, S);
  VY.kvSet('gr:' + id, {score: sc.score, total: sc.total, at: Date.now()});
  if(sc.total && sc.score === sc.total) VY.toast('🎉 ' + t('grPerfect'));
  keepY(() => VY.rerender()); };
ACT.grShow = el => { const id = el.dataset.id; grab(id); ST(id).show = !ST(id).show; keepY(() => VY.rerender()); };
ACT.grReset = el => { const id = el.dataset.id; VY.GRS[id] = {v: {}, checked: false, show: false}; keepY(() => VY.rerender()); };

/* ---------- home ---------- */
const TABS = [['units', '📚', 'grUnits'], ['test', '🎯', 'grTest'], ['add', '✏️', 'grAdd'], ['app', '📎', 'grApp']];
function home(tab){
  const D = G(), all = D.units.flatMap(u => u.exs), done = all.filter(e => res(e.no)).length;
  return `<section class="card sec-hero gr-hero"><div class="sec-ic">📗</div><div style="flex:1;min-width:0"><h2 class="en" dir="ltr" style="text-align:start">Grammar in Use</h2><p>${t('grSub')}</p>
    <div class="row wrap mt12" style="gap:6px"><span class="chip">${n(D.units.length)} ${t('grUnitsN')}</span><span class="chip">${n(all.length)} ${t('grExN')}</span><span class="chip">${n(D.add.length)} ${t('grAdd')}</span><span class="chip">${n(done)} / ${n(all.length)} ${t('rdDone')}</span></div>
    <div class="progress mt12"><i style="width:${all.length ? done / all.length * 100 : 0}%"></i></div></div></section>
  <div class="tabs-scroll mt16"><div class="seg">${TABS.map(([k, e, l]) => `<button class="${tab === k ? 'on' : ''}" data-act="go" data-to="grammar${k === 'units' ? '' : '/' + k}">${e} ${t(l)}</button>`).join('')}</div></div>
  <div class="mt16">${tab === 'test' ? testView() : tab === 'add' ? addView() : tab === 'app' ? appList() : unitsView()}</div>`;
}
function unitsView(){
  const D = G();
  return `<div class="card ir-tip"><b>💡 ${t('grHowT')}</b><p class="small muted">${t('grHow')}</p></div>` + D.groups.map(g => `<div class="ir-sec"><b class="en" dir="ltr">${esc(g.t)}</b><span class="muted small">${esc(g.fa)} · ${t('grUnitsR', {a: n(g.from), b: n(g.to)})}</span></div>
    <div class="grid g2 gr-units">${D.units.filter(u => u.n >= g.from && u.n <= g.to).map(u => { const s = unitDone(u); return `<a class="card gr-unit" href="#/grammar/u/${u.n}">
      <div class="deck-num ${lv(u.n)}">${n(u.n)}</div><div style="flex:1;min-width:0"><b class="en" dir="ltr">${esc(u.title)}</b>${u.fa && fa() ? `<div class="small muted">${esc(u.fa)}</div>` : ''}
      <div class="progress mt8"><i style="width:${s.total ? s.done / s.total * 100 : 0}%"></i></div></div>${s.done ? pctChip(s.pct, 'tiny') : `<span class="small muted">${n(s.total)} ${t('grExS')}</span>`}</a>`; }).join('')}</div>`).join('');
}
/* ---------- unit ---------- */
function unitView(un, tab){
  const D = G(), u = D.units.find(x => x.n === +un); if(!u) return home('units');
  const S = VY.GRS['u' + u.n] || (VY.GRS['u' + u.n] = {fa: false}), prev = D.units.find(x => x.n === u.n - 1), next = D.units.find(x => x.n === u.n + 1), s = unitDone(u);
  const g = D.groups.find(x => u.n >= x.from && u.n <= x.to);
  tab = tab === 'ex' ? 'ex' : 'lesson';
  return `<div class="row between wrap mb12" style="gap:8px"><a class="btn btn-ghost btn-sm" href="#/grammar">${icon('back')} Grammar in Use</a>
    <div class="row" style="gap:6px">${prev ? `<a class="btn btn-ghost btn-sm" href="#/grammar/u/${prev.n}" title="${esc(prev.title)}">${t('irUnit')} ${n(prev.n)}</a>` : ''}${next ? `<a class="btn btn-ghost btn-sm" href="#/grammar/u/${next.n}" title="${esc(next.title)}">${t('irUnit')} ${n(next.n)} ${icon('arrow')}</a>` : ''}</div></div>
  <section class="card sec-hero gr-hero"><div class="sec-ic">${n(u.n)}</div><div style="flex:1;min-width:0"><div class="small" style="opacity:.9">${g ? esc(g.t) + ' · ' + esc(g.fa) : ''}</div>
    <h2 class="en" dir="ltr" style="text-align:start">${esc(u.title)}</h2>${u.fa ? `<p>${esc(u.fa)}</p>` : ''}
    <div class="row wrap mt12" style="gap:6px"><span class="chip">${n(u.secs.length)} ${t('grSecs')}</span><span class="chip">${n(u.exs.length)} ${t('grExN')}</span>${s.done ? `<span class="chip">${n(s.done)} / ${n(s.total)} ${t('rdDone')}</span>` : ''}</div></div></section>
  <div class="tabs-scroll mt16"><div class="seg"><button class="${tab === 'lesson' ? 'on' : ''}" data-act="go" data-to="grammar/u/${u.n}">📖 ${t('grLesson')}</button><button class="${tab === 'ex' ? 'on' : ''}" data-act="go" data-to="grammar/u/${u.n}/ex">✏️ ${t('grExercises')} <span class="chip tiny">${n(u.exs.length)}</span></button></div></div>
  <div class="mt16">${tab === 'ex' ? exercisesView(u) : lessonView(u, S)}</div>
  <div class="row between wrap mt16" style="gap:8px">${tab === 'lesson' ? `<a class="btn btn-primary" href="#/grammar/u/${u.n}/ex">✏️ ${t('grGoEx')} ${icon('arrow')}</a>` : `<a class="btn btn-ghost" href="#/grammar/u/${u.n}">📖 ${t('grLesson')}</a>`}${next ? `<a class="btn btn-soft" href="#/grammar/u/${next.n}">${t('irUnit')} ${n(next.n)} ${icon('arrow')}</a>` : ''}</div>`;
}
function lessonView(u, S){
  const hasFa = u.secs.some(s => s.b.some(b => b.fa));
  return `<div class="row between wrap mb12" style="gap:8px"><span class="small muted">📖 ${t('grLessonHint')}</span>${hasFa ? `<button class="btn btn-ghost btn-sm" data-act="grFa" data-u="${u.n}">${S.fa ? '✓ ' : ''}فا · ${t('translation')}</button>` : ''}</div>
  ${u.secs.map(s => `<div class="card gr-sec"><div class="gr-sl">${esc(s.l)}</div><div class="gr-sb en" dir="ltr">${s.b.map(b => b.t === 'tbl' ? `<pre class="gr-pre">${esc(b.x)}</pre>`
    : b.t === 'ex' ? `<div class="gr-eg"><span class="gr-dot">▸</span><div style="flex:1;min-width:0"><span>${esc(b.x)}</span>${S.fa && b.fa ? `<div class="gr-fa" dir="rtl">${esc(b.fa)}</div>` : ''}</div><button class="speak sm" data-act="speak" data-text="${esc(b.x)}" aria-label="speak">${icon('volume')}</button></div>`
    : `<p class="gr-p">${esc(b.x)}${S.fa && b.fa ? `<span class="gr-fa" dir="rtl">${esc(b.fa)}</span>` : ''}</p>`).join('')}</div></div>`).join('')}
  ${u.refs && u.refs.length ? `<div class="card gr-refs"><b>🔗 ${t('grSee')}</b>${u.refs.map(([a, b]) => { const m = String(b).match(/Units?\s+(\d+)/); return `<div class="small en" dir="ltr">${m ? `<a href="#/grammar/u/${m[1]}">${esc(a)} → ${esc(b)}</a>` : esc(a + ' → ' + b)}</div>`; }).join('')}</div>` : ''}`;
}
ACT.grFa = el => { const S = VY.GRS['u' + el.dataset.u]; S.fa = !S.fa; keepY(() => VY.rerender()); };
function exercisesView(u){ return `<div class="small muted mb12">✏️ ${t('grExHint')}</div>` + u.exs.map(e => exCard(e, e.no)).join(''); }
/* ---------- additional exercises ---------- */
function addView(){
  let last = '', out = `<div class="small muted mb12">✏️ ${t('grAddS')}</div>`;
  G().add.forEach(e => { if(e.sec !== last){ out += `<div class="ir-sec"><b class="en" dir="ltr">${esc(e.sec)}</b></div>`; last = e.sec; } out += exCard(e, 'add' + e.no, {label: t('grEx')}); });
  return out;
}
/* ---------- study guide test ---------- */
VY.GRS.sg = VY.GRS.sg || {sel: {}, checked: false};
function testView(){
  const S = VY.GRS.sg, D = G(), prev = res('sg');
  let last = '', out = `<div class="card ir-tip"><b>🎯 ${t('grTestT')}</b><p class="small muted">${t('grTestS')}</p>${prev ? `<div class="mt8">${t('grLast')}: ${pctChip(prev.score / prev.total)}</div>` : ''}</div>`;
  D.sg.forEach(q => {
    if(q.g !== last){ out += `<div class="ir-sec"><b class="en" dir="ltr">${esc(q.g)}</b></div>`; last = q.g; }
    const sel = S.sel[q.no] || [], ok = S.checked && sel.length === q.a.length && q.a.every(x => sel.includes(x));
    out += `<div class="card gr-q ${S.checked ? (ok ? 'ok' : 'bad') : ''}"><div class="row" style="gap:8px;align-items:flex-start"><b class="gr-no">${esc(q.no)}</b><p class="en" dir="ltr" style="margin:0;flex:1">${esc(q.q).replace(/______/g, '<span class="gr-gap"></span>')}</p></div>
      <div class="gr-opts" dir="ltr">${q.o.map((o, i) => { const on = sel.includes(i), right = q.a.includes(i); return `<button class="rchip ${on ? 'on' : ''} ${S.checked ? (right ? 'right' : on ? 'wrong' : '') : ''}" data-act="grSel" data-q="${esc(q.no)}" data-i="${i}"><b>${'ABCDE'[i]}</b> ${esc(o)}</button>`; }).join('')}</div>
      ${S.checked && !ok ? `<div class="small mt8">📘 ${t('grStudy')}: ${q.u.map(x => `<a href="#/grammar/u/${x}">${t('irUnit')} ${n(x)}</a>`).join(' · ')}</div>` : ''}</div>`;
  });
  const answered = Object.keys(S.sel).filter(k => S.sel[k].length).length;
  out += `<div class="card gr-submit row between wrap" style="gap:8px"><span class="small">${t('answeredN', {a: n(answered), b: n(D.sg.length)})}</span><div class="row" style="gap:8px">${S.checked ? `<button class="btn btn-ghost" data-act="grSgReset">↺ ${t('grReset')}</button>` : ''}<button class="btn btn-primary" data-act="grSgCheck">${icon('check')} ${t('grCheck')}</button></div></div>`;
  if(S.checked){ const wrong = D.sg.filter(q => { const sel = S.sel[q.no] || []; return !(sel.length === q.a.length && q.a.every(x => sel.includes(x))); });
    const units = [...new Set(wrong.map(q => q.u[0]))].sort((a, b) => a - b);
    out = `<div class="card gr-result"><h3>${t('grScore', {a: n(D.sg.length - wrong.length), b: n(D.sg.length)})}</h3>${units.length ? `<p class="small muted">${t('grStudyList')}</p><div class="row wrap" style="gap:6px">${units.map(x => { const u = D.units.find(z => z.n === x); return `<a class="chip purple" href="#/grammar/u/${x}" title="${esc(u ? u.title : '')}">${n(x)}</a>`; }).join('')}</div>` : `<p>🎉 ${t('grPerfect')}</p>`}</div>` + out;
  }
  return out;
}
ACT.grSel = el => { const S = VY.GRS.sg; if(S.checked) return; const q = el.dataset.q, i = +el.dataset.i, a = S.sel[q] || (S.sel[q] = []); const j = a.indexOf(i); if(j >= 0) a.splice(j, 1); else a.push(i); el.classList.toggle('on'); const c = document.querySelector('.gr-submit .small'); if(c) c.textContent = t('answeredN', {a: n(Object.keys(S.sel).filter(k => S.sel[k].length).length), b: n(G().sg.length)}); };
ACT.grSgCheck = () => { const S = VY.GRS.sg, D = G(); S.checked = true; const ok = D.sg.filter(q => { const sel = S.sel[q.no] || []; return sel.length === q.a.length && q.a.every(x => sel.includes(x)); }).length; VY.kvSet('gr:sg', {score: ok, total: D.sg.length, at: Date.now()}); VY.rerender(); };
ACT.grSgReset = () => { VY.GRS.sg = {sel: {}, checked: false}; VY.rerender(); };
/* ---------- appendices ---------- */
function appList(){ return `<div class="grid g2">${G().app.map(a => `<a class="card gr-unit" href="#/grammar/app/${a.n}"><div class="deck-num ${lv(a.n)}">${n(a.n)}</div><div style="flex:1;min-width:0"><b class="en" dir="ltr">Appendix ${a.n} · ${esc(a.title)}</b>${a.fa && fa() ? `<div class="small muted">${esc(a.fa)}</div>` : ''}</div></a>`).join('')}</div>`; }
function appView(k){ const a = G().app.find(x => x.n === +k); if(!a) return home('app');
  return `<div class="row between wrap mb12"><a class="btn btn-ghost btn-sm" href="#/grammar/app">${icon('back')} ${t('grApp')}</a></div>
  <section class="card"><h2 class="en" dir="ltr" style="text-align:start">Appendix ${a.n} · ${esc(a.title)}</h2>${a.fa ? `<div class="muted">${esc(a.fa)}</div>` : ''}<pre class="gr-pre gr-app mt12" dir="ltr">${esc(a.x).replace(/\(→ Units? ([\d–, A-Z]+)\)|→ Units? (\d+)/g, (m) => { const d = m.match(/\d+/); return d ? `<a href="#/grammar/u/${d[0]}">${m}</a>` : m; })}</pre></section>`; }

V.grammar = {title: () => { const p = VY.params || [], D = G(); if(p[0] === 'u' && D){ const u = D.units.find(x => x.n === +p[1]); if(u) return t('grammar') + ' · ' + t('irUnit') + ' ' + n(u.n); } return t('grammar'); },
  render(){ if(!window.VY_GRAMMAR) return wait(); const p = VY.params || [];
    if(p[0] === 'u') return unitView(p[1], p[2]); if(p[0] === 'app' && p[1]) return appView(p[1]);
    return home(['test', 'add', 'app'].includes(p[0]) ? p[0] : 'units'); },
  after(){ document.querySelectorAll('[data-gx]').forEach(el => el.addEventListener('input', () => { ST(el.dataset.gx).v[el.dataset.k] = el.value; }));
    document.querySelectorAll('input[data-gx]').forEach(el => el.addEventListener('keydown', ev => { if(ev.key === 'Enter'){ ev.preventDefault(); const all = [...document.querySelectorAll(`[data-gx="${CSS.escape(el.dataset.gx)}"]`)], i = all.indexOf(el); if(all[i + 1]) all[i + 1].focus(); else { const b = el.closest('.gr-ex').querySelector('[data-act="grCheck"]'); b && b.click(); } } })); }
};
})();
