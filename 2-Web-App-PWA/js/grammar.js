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
  if(e.L) body = exLayout(e, id, S);
  else if(e.m === 'gap'){
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
  const rest = e.L ? [] : e.key.filter(([k]) => !used.has(String(k)));
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
/* ---------- layout-faithful exercises (from the book's page layout: dotted lines, example answers, pictures, choices) ---------- */
const FIGS = ents => `<div class="gx-figs">${ents.map(f => `<img class="gx-fig" src="gr/${esc(f.s)}" alt="" loading="lazy" decoding="async" width="${Math.round(f.w * 1.35)}" height="${Math.round(f.h * 1.35)}" style="width:${Math.round(f.w * 1.35)}px" data-act="grZoom">`).join('')}</div>`;
ACT.grZoom = el => { const o = document.createElement('div'); o.className = 'gx-zoom'; o.innerHTML = `<img src="${esc(el.getAttribute('src'))}" alt="">`; o.addEventListener('click', () => o.remove()); document.body.appendChild(o); };
const isChoice = tk => tk[0] === 't' && /u/.test(tk[2]) && / \/ |\//.test(tk[1]) && tk[1].split('/').length <= 5;
function subKeys(a, subs){
  // "a Light b a light" → {a:'Light', b:'a light'}; "b there’s a lot of noise" → {b:…} (a = example)
  const out = {}; let rest = String(a).trim();
  subs.forEach((l, i) => {
    if(!rest.startsWith(l + ' ')) return;
    rest = rest.slice(l.length + 1);
    const nx = subs.slice(i + 1).map(m => rest.indexOf(' ' + m + ' ')).filter(x => x >= 0).sort((x, y) => x - y)[0];
    out[l] = (nx != null ? rest.slice(0, nx) : rest).trim(); rest = nx != null ? rest.slice(nx + 1) : '';
  });
  return out;
}
function model(e){
  // groups of answer slots per item / sub-item, in reading order
  if(e._m) return e._m;
  const M = {};
  (e.L.cols || []).forEach(c => c.kind === 'n' && c.i.forEach(it => {
    const m = M[it.k] = {groups: [], subs: []}; let cur = {sub: '', slots: []}; m.groups.push(cur);
    let pre = '', last = null;
    it.r.forEach(row => row.forEach(tk => {
      if(tk[0] === 't' && !isChoice(tk)){ pre += tk[1]; if(last){ last.post = (last.post || '') + tk[1]; } return; }
      if(tk[0] === 'l'){ cur = {sub: tk[1], slots: []}; m.groups.push(cur); m.subs.push(tk[1]); pre = ''; last = null; }
      else if(tk[0] === 'g'){ last = {t: 'g', pre}; cur.slots.push(last); pre = ''; }
      else if(isChoice(tk)) cur.slots.push({t: 'c', o: tk[1].split('/').map(x => x.trim()).filter(Boolean)});
    }));
    m.groups = m.groups.filter(g => g.slots.length);
  }));
  return (e._m = M);
}
function groupAns(e, k){
  const a = keyOf(e, k); if(a == null) return null; const m = model(e)[k];
  if(!m || !m.groups.some(g => g.sub)) return m && m.groups.length ? {'': a} : {'': a};
  const subs = m.groups.map(g => g.sub), sk = subKeys(a, subs);
  if(!Object.keys(sk).length) return {[subs[0]]: a};
  return sk;
}
const keyOf = (e, k) => { const x = e.key.find(([kk]) => String(kk) === String(k)); return x ? x[1] : null; };
function slotVals(S, k, g){ return g.slots.map((_, j) => S.v[`${k}|${g.sub}|${j}`] || ''); }
// the key often repeats words printed around the blank ("He’s tying" for "He …… a shoelace") → accept the blank part alone
function okCtx(v, a, sl){
  if(correct(v, a)) return true; if(!norm(v) || !sl) return false;
  const P = norm(sl.pre || '').split(' ').filter(Boolean).slice(-3), Q = norm(sl.post || '').split(' ').filter(Boolean).slice(0, 3);
  for(let i = 0; i <= P.length; i++) for(let j = 0; j <= Q.length; j++){ if(!i && !j) continue;
    if(correct([...P.slice(P.length - i), v, ...Q.slice(0, j)].join(' '), a)) return true; }
  return false;
}
function groupOk(S, k, g, a){
  const vals = slotVals(S, k, g), parts = String(a).split(/\s*…\s*|\s*\.\.\.\s*/).filter(Boolean);
  if(vals.length === 1) return [okCtx(vals[0], a, g.slots[0])];
  if(parts.length === vals.length) return vals.map((v, j) => okCtx(v, parts[j], g.slots[j]));
  const all = correct(vals.join(' '), a); return vals.map(() => all);
}
function itemState(e, S, k){
  // → {ok: bool|null, slots: {key: true/false}, ans: string}
  const a = keyOf(e, k); if(a == null || isOpen(e, a)) return {ok: null, slots: {}, ans: a};
  const m = model(e)[k], ga = groupAns(e, k), slots = {}; let ok = true;
  if(!m || !m.groups.length){ const v = S.v[`${k}||x`] || ''; const r = correct(v, a); slots[`${k}||x`] = r; return {ok: r, slots, ans: a}; }
  m.groups.forEach(g => { const ga1 = ga[g.sub] != null ? ga[g.sub] : (m.groups.length === 1 ? a : null); if(ga1 == null) return;
    groupOk(S, k, g, ga1).forEach((r, j) => { slots[`${k}|${g.sub}|${j}`] = r; if(!r) ok = false; }); });
  return {ok, slots, ans: a};
}
function exLayout(e, id, S){
  const L = e.L, M = model(e), st = {};
  const checked = S.checked;
  const inp = (key, w, cls = '') => `<input class="gr-in gx-in ${cls}" dir="ltr" autocomplete="off" autocapitalize="off" spellcheck="false" data-gx="${esc(id)}" data-k="${esc(key)}" value="${esc(S.v[key] || '')}" style="width:${Math.max(64, Math.min(520, Math.round(w * 1.15)))}px">`;
  const rowHTML = (row, k, ctx) => row.map(tk => {
    const [ty, a, b] = tk;
    if(ty === 's') return `<span class="gx-s" style="width:${Math.min(48, Math.round(a * .6))}px"></span>`;
    if(ty === 'l'){ ctx.sub = a; ctx.j = 0; return `<b class="gx-sub">${esc(a)}</b>`; }
    if(ty === 'h') return `<span class="gx-h" style="min-width:min(${b ? Math.min(400, Math.round(b * 1.1)) : 0}px,100%)">${esc(a)}</span>`;
    const hasAns = k != null && keyOf(e, k) != null && (() => { const ga = groupAns(e, k); return ga && ga[ctx.sub] != null; })();
    if(ty === 'g'){ if(k == null || (keyOf(e, k) != null && !hasAns)){ if(k != null) ctx.j++; return `<span class="gx-dots" style="width:${Math.min(300, Math.round(a * 1.1))}px"></span>`; }
      const key = `${k}|${ctx.sub}|${ctx.j++}`, r = ctx.state.slots[key]; return inp(key, a, checked && r != null ? (r ? 'ok' : 'bad') : ''); }
    if(isChoice(tk) && hasAns){
      const pm = a.match(/[.,;:!?]+\s*$/), punct = pm ? pm[0] : '', body = punct ? a.slice(0, -punct.length) : a;
      const key = `${k}|${ctx.sub}|${ctx.j++}`, val = S.v[key], r = ctx.state.slots[key];
      return ` <span class="gx-ch">${body.split('/').map(x => x.trim()).filter(Boolean).map((o, i, arr) => `<button class="gx-opt ${val === o ? 'on' : ''} ${checked && val === o && r != null ? (r ? 'ok' : 'bad') : ''}" data-act="grOpt" data-id="${esc(id)}" data-k="${esc(key)}" data-o="${esc(o)}">${esc(o)}</button>${i < arr.length - 1 ? '<span class="gx-sl">/</span>' : ''}`).join('')}</span>${esc(punct)}`;
    }
    const cls = (b || '').split('').map(c => 'gx-' + c).join(' ');
    if(!cls) return esc(a);
    const lead = a.match(/^\s*/)[0];
    return `${lead}<span class="${cls}">${esc(a.slice(lead.length))}</span>`;
  }).join('');
  const fbk = (k, state) => { if(!(checked || S.show) || state.ans == null) return '';
    const open = state.ok === null;
    if(S.show || open) return `<div class="gr-ans" dir="ltr">${open ? '💡 ' : '✓ '}${esc(state.ans)}</div>`;
    return state.ok ? '' : `<div class="gr-ans bad" dir="ltr">✓ ${esc(state.ans)}</div>`; };
  let html = '';
  (L.pre || []).forEach(([kind, v]) => {
    if(kind === 'box') html += `<div class="gx-box">${v.map(c => `<span>${esc(c)}</span>`).join('')}</div>`;
    else if(kind === 'fig') html += FIGS(v);
    else html += `<div class="gx-row gx-pre">${rowHTML(v, null, {sub: '', j: 0, state: {slots: {}}})}</div>`;
  });
  const used = new Set();
  html += `<div class="gx-cols">${(L.cols || []).map(c => `<div class="gx-col ${c.kind === 'l' ? 'gx-lc' : ''}" style="flex:1 1 ${Math.round(c.w * 1.3)}px">${c.i.map(it => {
    const k = c.kind === 'n' ? it.k : null; if(k != null) used.add(String(k));
    const state = k != null ? itemState(e, S, k) : {slots: {}}, ctx = {sub: '', j: 0, state};
    // book lines flow together (wraps naturally on phones); sub-items, dialogue turns and table-like lines stay on their own line
    const brk = r => !r.length || r[0][0] === 'l' || r.some(x => x[0] === 's') || (r[0][0] === 't' && /^\s*([A-Za-z]{1,6}:|[–—-]\s)/.test(r[0][1]));
    const lines = []; it.r.forEach((r, i) => { if(i && !brk(r) && !it.r[i - 1].some(x => x[0] === 's')) lines[lines.length - 1].push(['t', ' ', ''], ...r); else lines.push(r.slice()); });
    let rows = lines.map(r => `<div class="gx-row">${rowHTML(r, k, ctx)}</div>`).join('');
    if(k != null && keyOf(e, k) != null && !(M[k] && M[k].groups.length)){ const key = `${k}||x`, r = state.slots[key]; rows += `<div class="gx-row">${inp(key, 260, checked && r != null ? (r ? 'ok' : 'bad') : '')}</div>`; }
    return `<div class="gx-it ${checked && state.ok != null ? (state.ok ? 'ok' : 'bad') : ''}"><b class="gr-no ${c.kind === 'l' ? 'gx-ln' : ''}">${esc(it.k)}</b><div class="gx-tx">${it.f && it.f.length ? it.f.map(FIGS).join('') : ''}${rows}${k != null ? fbk(k, state) : ''}</div></div>`;
  }).join('')}</div>`).join('')}</div>`;
  const rest = e.key.filter(([k]) => !used.has(String(k)));
  if(rest.length) html += `<div class="gr-grid">${rest.map(([k, a]) => { const key = `${k}||x`, state = itemState(e, S, String(k)), r = state.slots[key];
    return `<label class="gr-cell"><b class="gr-no">${esc(String(k))}</b>${isOpen(e, a) ? `<textarea class="gr-in gr-ta" dir="ltr" data-gx="${esc(id)}" data-k="${esc(key)}" rows="2">${esc(S.v[key] || '')}</textarea>` : inp(key, 200, checked && r != null ? (r ? 'ok' : 'bad') : '')}${fbk(String(k), state)}</label>`; }).join('')}</div>`;
  return html;
}
ACT.grOpt = el => { const id = el.dataset.id, S = ST(id); grab(id); S.v[el.dataset.k] = S.v[el.dataset.k] === el.dataset.o ? '' : el.dataset.o; keepY(() => VY.rerender()); };
function gather(S, k, a){ const parts = String(a).split(/\s*…\s*/); if(S.v[k] != null) return S.v[k]; if(parts.length > 1) return parts.map((_, j) => S.v[k + '.' + j] || '').join(' '); return ''; }
function score(e, S){ if(e.L){ let s = 0, tot = 0; e.key.forEach(([k]) => { const r = itemState(e, S, String(k)); if(r.ok === null) return; tot++; if(r.ok) s++; }); return {score: s, total: tot}; }
  let s = 0, tot = 0; e.key.forEach(([k, a]) => { if(isOpen(e, a)) return; tot++; if(correct(gather(S, String(k), a), a)) s++; }); return {score: s, total: tot}; }
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
function tblHTML(x){
  const ls = String(x).split('\n'), rows = ls.map(l => l.trim() ? l.trim().split(/\s{2,}/) : null);
  const cells = rows.filter(Boolean), nc = Math.max(...cells.map(r => r.length));
  if(cells.length && nc > 1 && cells.filter(r => r.length === nc).length >= cells.length * .6)
    return `<div class="gr-tw"><table class="gr-tbl">${rows.map(r => r ? `<tr>${r.map((c, i) => `<td${r.length < nc && i === r.length - 1 ? ` colspan="${nc - r.length + 1}"` : ''}>${esc(c)}</td>`).join('')}</tr>` : `<tr class="gr-tsp"><td colspan="${nc}"></td></tr>`).join('')}</table></div>`;
  return `<pre class="gr-pre">${esc(x)}</pre>`;
}
const rich = r => r.map(([x, f]) => f ? `<span class="${f.split('').map(c => 'gx-' + c).join(' ')}">${esc(x)}</span>` : esc(x)).join('');
function lessonBlock(b, S){
  const tr = S.fa && b.fa ? `<div class="gr-fa" dir="rtl">${esc(b.fa)}</div>` : '';
  if(b.t === 'fig') return FIGS(b.f);
  if(b.t === 'tbl') return tblHTML(b.x);
  if(b.t === 'tb') return `<div class="gr-tw ${b.box ? 'box' : ''}"><table class="gr-tbl">${b.rows.map(r => `<tr>${r.map(c => `<td>${rich(c)}</td>`).join('')}</tr>`).join('')}</table></div>`;
  if(b.t === 'ex') return `<div class="gr-eg"><span class="gr-dot">▸</span><div style="flex:1;min-width:0">${b.r ? b.r.map(l => `<div>${rich(l)}</div>`).join('') : `<span>${esc(b.x)}</span>`}${tr}</div><button class="speak sm" data-act="speak" data-text="${esc(b.x)}" aria-label="speak">${icon('volume')}</button></div>`;
  return `<p class="gr-p">${b.r ? rich(b.r) : esc(b.x)}${tr}</p>`;
}
function lessonView(u, S){
  const hasFa = u.secs.some(s => s.b.some(b => b.fa));
  return `<div class="row between wrap mb12" style="gap:8px"><span class="small muted">📖 ${t('grLessonHint')}</span>${hasFa ? `<button class="btn btn-ghost btn-sm" data-act="grFa" data-u="${u.n}">${S.fa ? '✓ ' : ''}فا · ${t('translation')}</button>` : ''}</div>
  ${u.secs.map(s => `<div class="card gr-sec"><div class="gr-sl">${esc(s.l)}</div><div class="gr-sb en" dir="ltr">${s.b.map(b => lessonBlock(b, S)).join('')}</div></div>`).join('')}
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
