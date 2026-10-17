/* ===== VajeYar · Inside Reading Intro / 1 / 2 — each book is its own sub-section of Reading (#/reading/@ir0 … @ir2)
   book → 10 units → (2 readings with True/False questions · reading skill & vocabulary exercises with answer key · target-word deck)
   Book data (passages + exercises, ~1 MB) is loaded lazily from js/inside_data.js the first time it is needed. ===== */
(function(){
const {t, n, esc} = VY; const ACT = VY.ACT;
const fa = () => VY.lang() === 'fa';
let loading = null;
VY.isInside = c => /^ir\d$/.test(String(c || ''));
VY.loadInside = () => window.VY_INSIDE ? Promise.resolve(true) : loading || (loading = new Promise(res => {
  const s = document.createElement('script'); s.src = 'js/inside_data.js'; s.async = true;
  s.onload = () => res(!!window.VY_INSIDE); s.onerror = () => { loading = null; s.remove(); res(false); };
  document.head.appendChild(s);
}));
VY.insideWait = () => {
  VY.loadInside().then(ok => { if(ok) VY.rerender(); else { const e = document.getElementById('ir-wait'); if(e) e.innerHTML = `<div class="em">📡</div><p>${t('irLoadErr')}</p><button class="btn btn-primary" data-act="irRetryLoad">${t('retry')}</button>`; } });
  return `<div class="card empty" id="ir-wait"><div class="em"><span class="dot-spin"></span></div><p>${t('loading')}</p></div>`;
};
ACT.irRetryLoad = () => { VY.loadInside().then(ok => ok && VY.rerender()); };
const D = () => window.VY_INSIDE || {books:{}, readings:[]};
const book = c => D().books[c];
VY.insideReadings = () => D().readings;
VY.insideBookName = c => { const B = book(c), C = VY.CATS[c]; return C ? VY.catName(c) : B ? (fa() ? B.fa : B.title) : c; };
const rres = id => VY.kvGet('rd:' + id);
const best = id => { const x = rres(id); return x ? (x.best != null ? x.best : x.pct) : null; };
const scoreChip = id => { const b = best(id); return b != null ? `<span class="chip ${b>=.8?'green':b>=.5?'yellow':'red'}">✓ ${VY.pct(b*100)}</span>` : `<span class="chip">${t('newW')}</span>`; };
const rd = id => D().readings.find(r => r.id === id);
const lvCls = u => 'l' + (((u - 1) % 4) + 1);
/* forms of the unit's target words (analyze → analyzed, analysis …) for highlighting */
VY.insideWordRe = words => {
  if(!words || !words.length) return null;
  const parts = words.map(w => { const st = w.length > 4 && /[ey]$/.test(w) ? w.slice(0, -1) : w; return st.replace(/[.*+?^${}()|[\]\\]/g, '\\$&') + (w.length <= 4 ? '(?:s|es|ed|d|ing|ly|ies|ied)?' : '[a-z]*'); });
  return new RegExp('^(?:' + parts.join('|') + ')$', 'i');
};

/* ---------- book: list of units ---------- */
VY.insideBook = c => {
  if(!window.VY_INSIDE) return VY.insideWait();
  const B = book(c), C = VY.CATS[c]; if(!B) return '';
  const ws = VY.deckWords(c), seen = ws.filter(w => VY.P(w.id) && VY.P(w.id).seen).length;
  const rids = B.units.flatMap(u => u.readings), done = rids.filter(id => rres(id)).length;
  return `<section class="card sec-hero ${c}"><div class="sec-ic">${C ? C.icon : '📘'}</div><div style="flex:1;min-width:0"><h2>${VY.insideBookName(c)}</h2>${C && C.about ? `<p>${esc(VY.L(C.about))}</p>` : ''}
    <div class="row wrap mt12" style="gap:6px"><span class="chip">${n(B.units.length)} ${t('irUnits')}</span><span class="chip">${n(rids.length)} ${t('irReadings')}</span><span class="chip">${n(done)} / ${n(rids.length)} ${t('rdDone')}</span><span class="chip">${n(seen)} / ${n(ws.length)} ${t('words')}</span></div>
    <div class="progress mt12"><i style="width:${rids.length ? done/rids.length*100 : 0}%"></i></div></div></section>
  <div class="section-title"><h2>${t('irUnits')}</h2><span class="muted small">${t('irUnitsS')}</span></div>
  <div class="grid g2">${B.units.map(u => unitCard(c, u)).join('')}</div>`;
};
function unitCard(c, u){
  const s = VY.deckStats(c, u.n), pct = s.total ? s.seen / s.total : 0;
  return `<a class="card deck ir-unit" href="#/reading/@${c}/${u.n}">
    <div class="deck-head"><div class="deck-num ${lvCls(u.n)}">${n(u.n)}</div><div style="flex:1;min-width:0"><h3 class="en" dir="ltr" style="text-align:start">${esc(u.title)}</h3><div class="sub">${esc(u.fa || '')}</div></div>${s.due ? `<span class="badge">${n(s.due)}</span>` : ''}</div>
    ${u.skill ? `<div class="small muted">🧭 ${t('irSkill')}: <span class="en" dir="ltr">${esc(u.skill)}</span></div>` : ''}
    <div class="ir-rlist">${u.readings.map((id, i) => { const r = rd(id); return r ? `<div class="ir-rrow"><span class="chip tiny">${t('irReadingN', {n: n(i + 1)})}</span><span class="en" dir="ltr">${esc(r.title)}</span>${best(id) != null ? `<span class="chip tiny ${best(id)>=.8?'green':best(id)>=.5?'yellow':'red'}">${VY.pct(best(id)*100)}</span>` : ''}</div>` : ''; }).join('')}</div>
    <div class="progress"><i style="width:${pct*100}%"></i></div>
    <div class="deck-meta"><span><b>${n(s.total)}</b> ${t('words')}</span><span><b>${n(s.seen)}</b> ${t('learned')}</span><span><b>${n(u.blocks.length)}</b> ${t('irExercises')}</span></div>
  </a>`;
}

/* ---------- unit page ---------- */
VY.IRS = VY.IRS || {};
const KIND = {byr:'irK_byr', skill:'irK_skill', review:'irK_review', voc:'irK_voc', rcx:'irK_rcx', wd:'irK_wd', sar:'irK_sar'};
VY.insideUnit = (c, un) => {
  if(!window.VY_INSIDE) return VY.insideWait();
  const B = book(c), u = B && B.units.find(x => x.n === +un);
  if(!u) return VY.insideBook(c);
  const key = c + '/' + u.n, S = VY.IRS[key] || (VY.IRS[key] = {tab: 'read', open: {}, all: false});
  const prev = B.units.find(x => x.n === u.n - 1), next = B.units.find(x => x.n === u.n + 1);
  const tabs = [['read', '📄 ' + t('irReadings')], ['ex', '✏️ ' + t('irExercises')], ['words', '🔤 ' + t('irWords')]];
  return `<div class="row between wrap mb12" style="gap:8px"><a class="btn btn-ghost btn-sm" href="#/reading/@${c}">${icon('back')} ${esc(VY.insideBookName(c))}</a>
    <div class="row" style="gap:6px">${prev ? `<a class="btn btn-ghost btn-sm" href="#/reading/@${c}/${prev.n}" title="${esc(prev.title)}">${t('irUnit')} ${n(prev.n)}</a>` : ''}${next ? `<a class="btn btn-ghost btn-sm" href="#/reading/@${c}/${next.n}" title="${esc(next.title)}">${t('irUnit')} ${n(next.n)} ${icon('arrow')}</a>` : ''}</div></div>
  <section class="card sec-hero ${c}"><div class="sec-ic">${VY.CATS[c] ? VY.CATS[c].icon : '📘'}</div><div style="flex:1;min-width:0">
    <div class="small" style="opacity:.9">${esc(VY.insideBookName(c))} · ${t('irUnit')} ${n(u.n)}</div>
    <h2 class="en" dir="ltr" style="text-align:start">${esc(u.title)}</h2>${u.fa ? `<p>${esc(u.fa)}</p>` : ''}
    <div class="row wrap mt12" style="gap:6px">${u.skill ? `<span class="chip">🧭 ${t('irSkill')}: <span class="en" dir="ltr">${esc(u.skill)}</span></span>` : ''}<span class="chip">${n(u.words.length)} ${t('irTargetWords')}</span></div></div></section>
  <div class="tabs-scroll mt16"><div class="seg">${tabs.map(([k, l]) => `<button class="${S.tab === k ? 'on' : ''}" data-act="irTab" data-k="${key}" data-v="${k}">${l}</button>`).join('')}</div></div>
  <div class="mt16">${S.tab === 'ex' ? exTab(u, S, key) : S.tab === 'words' ? wordsTab(c, u) : readTab(c, u)}</div>`;
};
function readTab(c, u){
  return `<div class="grid g2">${u.readings.map((id, i) => { const r = rd(id); if(!r) return ''; return `<a class="card rd-card" href="#/reading/${encodeURIComponent(id)}">
    <div class="row between" style="gap:8px"><span class="chip purple">${t('irReadingN', {n: n(i + 1)})}</span>${scoreChip(id)}</div>
    <h3 class="en mt12" dir="ltr">${esc(r.title)}</h3>${r.pre ? `<div class="small muted en" dir="ltr">${esc(r.pre)}</div>` : ''}
    <div class="rd-meta"><span>❓ ${n(r.qs.length)} ${t('questions')} (True / False)</span><span>📄 ${n(r.paras.filter(p => !/^## /.test(p)).length)} ${t('paragraphs')}</span></div>
  </a>`; }).join('')}</div>
  <div class="card mt16 ir-tip"><b>💡 ${t('irHowTitle')}</b><p class="small muted">${t('irHow')}</p></div>`;
}
function wordsTab(c, u){
  const ws = VY.deckWords(c, u.n);
  return `<div class="grid g3">${VY.deckCard ? VY.deckCard(c, u.n) : ''}</div>
  <div class="card mt16"><div class="lbl">🔤 ${t('irTargetWords')}</div><div class="ir-words">${ws.map(w => `<button class="ir-w" data-act="irWord" data-id="${esc(w.id)}"><b class="en" dir="ltr">${esc(w.word)}</b><span>${esc(w.fa)}</span>${VY.statusChip ? VY.statusChip(w.id) : ''}</button>`).join('')}</div></div>`;
}
ACT.irWord = el => VY.openWord(el.dataset.id);
function exTab(u, S, key){
  let out = '', last = '';
  const anyKey = u.blocks.some(b => b.key);
  out += `<div class="row between wrap mb12" style="gap:8px"><span class="small muted">✏️ ${t('irExHint')}</span>${anyKey ? `<button class="btn btn-soft btn-sm" data-act="irAllKeys" data-k="${key}">${S.all ? '🙈 ' + t('irHideAll') : '🔑 ' + t('irShowAll')}</button>` : ''}</div>`;
  u.blocks.forEach((b, i) => {
    const sec = b.sec + (b.k === 'skill' && u.skill ? ': ' + u.skill : '');
    if(sec !== last){ out += `<div class="ir-sec"><b class="en" dir="ltr">${esc(sec)}</b><span class="muted small">${t(KIND[b.k] || 'irExercises')}</span></div>`; last = sec; }
    const open = S.all || S.open[i];
    out += `<div class="card ir-ex"><div class="row between" style="gap:8px"><span>${b.l ? `<span class="chip purple en" dir="ltr">${esc(b.l.trim())}</span>` : ''}</span><span class="small muted">${t('irPage')} ${n(b.p)}</span></div>
      <pre class="ir-t en" dir="ltr">${esc(b.t)}</pre>
      ${b.key ? `<button class="btn btn-ghost btn-sm mt8" data-act="irKey" data-k="${key}" data-i="${i}">${open ? '🙈 ' + t('irHideKey') : '🔑 ' + t('irShowKey')}</button>${open ? `<pre class="ir-key en" dir="ltr">${esc(b.key)}</pre>` : ''}` : ''}
    </div>`;
  });
  return out;
}
const keepY = fn => { const y = window.scrollY; fn(); window.scrollTo(0, y); };
ACT.irTab = el => { VY.IRS[el.dataset.k].tab = el.dataset.v; VY.rerender(); };
ACT.irKey = el => { const S = VY.IRS[el.dataset.k], i = +el.dataset.i; if(S.all){ S.all = false; const u = curUnit(el.dataset.k); if(u) u.blocks.forEach((_, k) => { S.open[k] = k !== i; }); } else S.open[i] = !S.open[i]; keepY(() => VY.rerender()); };
ACT.irAllKeys = el => { const S = VY.IRS[el.dataset.k]; S.all = !S.all; S.open = {}; keepY(() => VY.rerender()); };
const curUnit = k => { const [c, u] = k.split('/'); const B = book(c); return B && B.units.find(x => x.n === +u); };
VY.insideNext = r => { const L = D().readings, i = L.findIndex(x => x.id === r.id); return L.slice(i + 1).find(x => x.book === r.book) || null; };
})();
