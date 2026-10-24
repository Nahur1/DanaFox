/* ===== DanaFox · IELTS vocabulary books inside Learn → IELTS (each book is its own sub-section)
   vi1 = Cambridge Vocabulary for IELTS (Intermediate) · vi2 = Cambridge Vocabulary for IELTS Advanced  (Pauline Cullen)
   #/learn/ielts/@vi1        → book: 25 units + 5 tests
   #/learn/ielts/@vi1/u3     → unit: book pages (scans + text) · answer key · recording scripts · word deck
   #/learn/ielts/@vi1/t2     → test (pages + answer key)
   Text data is loaded lazily from js/vbooks_data.js; page scans come from the server (bp/<book>/<pdf page>.webp). ===== */
(function(){
const {t, n, esc} = VY; const ACT = VY.ACT;
const fa = () => VY.lang() === 'fa';
let loading = null;
VY.VBOOKS = ['vi1', 'vi2'];
VY.isVBook = c => VY.VBOOKS.includes(c);
VY.loadVBooks = () => window.VY_VBOOKS ? Promise.resolve(true) : loading || (loading = new Promise(res => {
  const s = document.createElement('script'); s.src = 'js/vbooks_data.js'; s.async = true;
  s.onload = () => res(!!window.VY_VBOOKS); s.onerror = () => { loading = null; s.remove(); res(false); };
  document.head.appendChild(s);
}));
const wait = () => {
  VY.loadVBooks().then(ok => { if(ok) VY.rerender(); else { const e = document.getElementById('vb-wait'); if(e) e.innerHTML = `<div class="em">📡</div><p>${t('irLoadErr')}</p><button class="btn btn-primary" data-act="vbRetry">${t('retry')}</button>`; } });
  return `<div class="card empty" id="vb-wait"><div class="em"><span class="dot-spin"></span></div><p>${t('loading')}</p></div>`;
};
ACT.vbRetry = () => { VY.loadVBooks().then(ok => ok && VY.rerender()); };
const B = c => window.VY_VBOOKS && window.VY_VBOOKS[c];
const img = (c, p) => `${window.VY_SERVER || ''}/bp/${c}/${String(p).padStart(3, '0')}.webp`;
const keepY = fn => { const y = window.scrollY; fn(); window.scrollTo(0, y); };
const lv = u => 'l' + (((u - 1) % 4) + 1);
VY.VBS = VY.VBS || {};
const bookName = c => { const C = VY.CATS[c]; return C ? VY.catName(c) : c; };
const itemId = it => (it.k === 'u' ? 'u' : 't') + it.n;
const route = (c, x) => `#/learn/ielts/@${c}${x ? '/' + x : ''}`;

/* sub-tabs inside Learn → IELTS: the IELTS band decks + every book */
VY.ieltsTabs = active => {
  const tabs = [{k: '', e: '🎯', label: t('vbBands'), sub: `${n(VY.deckWords('ielts').length)} ${t('words')} · ${n(VY.CATS.ielts.levels.length)} ${t('secN')}`}]
    .concat(VY.VBOOKS.filter(c => VY.CATS[c]).map(c => ({k: '@' + c, e: VY.CATS[c].icon, label: VY.catName(c), sub: `${n(VY.CATS[c].levels.length)} ${t('grUnitsN')} · ${n(VY.deckWords(c).length)} ${t('words')}`, cls: c})))
    .concat(VY.deckCats('ielts').filter(c => !VY.VBOOKS.includes(c)).map(c => ({k: '@' + c, e: VY.CATS[c].icon, label: VY.catName(c), sub: `${n(VY.deckWords(c).length)} ${t('words')} · ${n(VY.CATS[c].levels.length)} ${t('secN')}`, cls: c})));
  return `<div class="sec-tabs mt16">${tabs.map(x => `<button class="sec-tab ${x.cls || ''} ${x.k === active ? 'on' : ''}" data-act="go" data-to="learn/ielts${x.k ? '/' + x.k : ''}"><span class="st-ic">${x.e}</span><span class="st-tx"><b>${esc(x.label)}</b><small>${x.sub}</small></span></button>`).join('')}</div>`;
};
/* ---------- book ---------- */
VY.vbView = (c, sub) => {
  if(!window.VY_VBOOKS) return wait();
  const D = B(c); if(!D) return '';
  if(sub){ const it = D.items.find(x => itemId(x) === sub); if(it) return itemView(c, D, it); }
  if(sub === 'scripts') return scriptsView(c, D);
  const C = VY.CATS[c], ws = VY.deckWords(c), seen = ws.filter(w => VY.P(w.id) && VY.P(w.id).seen).length;
  return `<section class="card sec-hero ${c}"><div class="sec-ic">${C ? C.icon : '📘'}</div><div style="flex:1;min-width:0"><h2 class="en" dir="ltr" style="text-align:start">${esc(D.title)}</h2><p>${esc(fa() ? D.fa : D.lvl)} · ${esc(D.author)}</p>${C && C.about ? `<p class="small">${esc(VY.L(C.about))}</p>` : ''}
    <div class="row wrap mt12" style="gap:6px"><span class="chip">${n(D.items.filter(x => x.k === 'u').length)} ${t('grUnitsN')}</span><span class="chip">${n(D.items.filter(x => x.k === 't').length)} ${t('vbTests')}</span><span class="chip">${n(seen)} / ${n(ws.length)} ${t('words')}</span></div>
    <div class="progress mt12"><i style="width:${ws.length ? seen / ws.length * 100 : 0}%"></i></div></div></section>
  <div class="card mt16 ir-tip"><b>💡 ${t('irHowTitle')}</b><p class="small muted">${t('vbHow')}</p></div>
  <div class="section-title"><h2>${t('irUnits')}</h2><span class="muted small">${t('vbUnitsS')}</span></div>
  <div class="grid g2">${D.items.map(it => card(c, it)).join('')}</div>
  ${D.scripts && D.scripts.length ? `<a class="card deck mt16" href="${route(c, 'scripts')}"><div class="deck-head"><div class="deck-num l2">🎧</div><div><h3>${t('vbScripts')}</h3><div class="sub">${n(D.scripts.length)} ${t('vbTracks')}</div></div></div></a>` : ''}`;
};
function card(c, it){
  if(it.k === 't') return `<a class="card deck vb-test" href="${route(c, itemId(it))}"><div class="deck-head"><div class="deck-num l4">✓</div><div style="flex:1;min-width:0"><h3 class="en" dir="ltr" style="text-align:start">${esc(it.title)}</h3><div class="sub en" dir="ltr">${esc(it.sub)} · ${t('vbTestS')}</div></div></div></a>`;
  const s = VY.CATS[c] && it.words && it.words.length ? VY.deckStats(c, it.n) : null, pct = s && s.total ? s.seen / s.total : 0;
  return `<a class="card deck" href="${route(c, itemId(it))}">
    <div class="deck-head"><div class="deck-num ${lv(it.n)}">${n(it.n)}</div><div style="flex:1;min-width:0"><h3 class="en" dir="ltr" style="text-align:start">${esc(it.title)}</h3><div class="sub">${esc(it.fa || '')}</div></div>${s && s.due ? `<span class="badge">${n(s.due)}</span>` : ''}</div>
    ${s ? `<div class="progress"><i style="width:${pct * 100}%"></i></div>` : ''}
    <div class="deck-meta"><span><b>${n(it.pages.length)}</b> ${t('vbPages')}</span>${s ? `<span><b>${n(s.total)}</b> ${t('words')}</span><span><b>${n(s.seen)}</b> ${t('learned')}</span>` : ''}${it.scripts && it.scripts.length ? `<span>🎧 ${n(it.scripts.length)}</span>` : ''}</div>
  </a>`;
}
/* ---------- unit / test ---------- */
function itemView(c, D, it){
  const id = c + '/' + itemId(it), S = VY.VBS[id] || (VY.VBS[id] = {tab: 'pages', txt: {}, keyImg: false}), i = D.items.indexOf(it), prev = D.items[i - 1], next = D.items[i + 1];
  const hasW = it.k === 'u' && it.words && it.words.length && VY.CATS[c] && VY.deckWords(c, it.n).length;
  const tabs = [['pages', '📖 ' + t('vbPagesT')], ['key', '🔑 ' + t('vbKey')]].concat(it.scripts && it.scripts.length ? [['scripts', '🎧 ' + t('vbScripts')]] : []).concat(hasW ? [['words', '🔤 ' + t('irWords')]] : []);
  if(!tabs.some(x => x[0] === S.tab)) S.tab = 'pages';
  const nm = x => x.k === 'u' ? `${t('irUnit')} ${n(x.n)}` : x.title;
  return `<div class="row between wrap mb12" style="gap:8px"><a class="btn btn-ghost btn-sm" href="${route(c)}">${icon('back')} ${esc(bookName(c))}</a>
    <div class="row" style="gap:6px">${prev ? `<a class="btn btn-ghost btn-sm" href="${route(c, itemId(prev))}" title="${esc(prev.title)}">${esc(nm(prev))}</a>` : ''}${next ? `<a class="btn btn-ghost btn-sm" href="${route(c, itemId(next))}" title="${esc(next.title)}">${esc(nm(next))} ${icon('arrow')}</a>` : ''}</div></div>
  <section class="card sec-hero ${c}"><div class="sec-ic">${it.k === 'u' ? n(it.n) : '✓'}</div><div style="flex:1;min-width:0">
    <div class="small" style="opacity:.9">${esc(D.title)}${it.k === 'u' ? ' · ' + t('irUnit') + ' ' + n(it.n) : ''}</div>
    <h2 class="en" dir="ltr" style="text-align:start">${esc(it.title)}</h2>${it.fa ? `<p>${esc(it.fa)}</p>` : it.sub ? `<p class="en" dir="ltr">${esc(it.sub)}</p>` : ''}</div></section>
  <div class="tabs-scroll mt16"><div class="seg">${tabs.map(([k, l]) => `<button class="${S.tab === k ? 'on' : ''}" data-act="vbTab" data-k="${esc(id)}" data-v="${k}">${l}</button>`).join('')}</div></div>
  <div class="mt16">${S.tab === 'key' ? keyTab(c, it, S, id) : S.tab === 'scripts' ? scriptList(it.scripts) : S.tab === 'words' ? wordsTab(c, it) : pagesTab(c, it, S, id)}</div>
  ${next ? `<div class="row mt16" style="justify-content:flex-end"><a class="btn btn-soft" href="${route(c, itemId(next))}">${esc(nm(next))} ${icon('arrow')}</a></div>` : ''}`;
}
function pageCard(c, p, text, S, id){
  const showT = S.txt[p];
  return `<div class="card vb-page"><div class="row between" style="gap:8px"><span class="chip">${t('irPage')} ${n(p)}</span>${text ? `<button class="btn btn-ghost btn-sm" data-act="vbTxt" data-k="${esc(id)}" data-p="${p}">${showT ? '🖼 ' + t('vbShowImg') : '📝 ' + t('vbShowTxt')}</button>` : ''}</div>
    ${showT ? `<pre class="vb-txt en" dir="ltr">${esc(text)}</pre>` : `<div class="vb-img"><img loading="lazy" decoding="async" src="${img(c, p)}" alt="page ${p}" data-act="vbZoom" data-src="${img(c, p)}" onerror="VY.vbImgErr(this)"></div>`}
    <textarea hidden>${esc(text || '')}</textarea></div>`;
}
function pagesTab(c, it, S, id){
  return `<div class="small muted mb12">📖 ${t('vbPagesHint')}</div>` + it.pages.map(pg => pageCard(c, pg.p, pg.t, S, id)).join('');
}
function keyTab(c, it, S, id){
  const k = it.key || {};
  return `<div class="row between wrap mb12" style="gap:8px"><span class="small muted">🔑 ${t('vbKeyHint')}</span>${k.pages && k.pages.length ? `<button class="btn btn-soft btn-sm" data-act="vbKeyImg" data-k="${esc(id)}">${S.keyImg ? '📝 ' + t('vbShowTxt') : '🖼 ' + t('vbKeyPages')}</button>` : ''}</div>
  ${S.keyImg || !k.t ? (k.pages || []).map(p => pageCard(c, p, '', {txt: {}}, id)).join('') : `<div class="card"><pre class="vb-txt en" dir="ltr">${esc(k.t)}</pre></div>`}`;
}
function scriptList(L){ return L.map(s => `<div class="card vb-page"><div class="row between"><span class="chip purple">🎧 ${/^\d/.test(s.id) ? 'Recording ' : ''}${esc(s.id)}</span></div><pre class="vb-txt en" dir="ltr">${esc(s.t)}</pre></div>`).join(''); }
function scriptsView(c, D){
  return `<div class="row between wrap mb12"><a class="btn btn-ghost btn-sm" href="${route(c)}">${icon('back')} ${esc(bookName(c))}</a></div>
  <section class="card sec-hero ${c}"><div class="sec-ic">🎧</div><div style="flex:1;min-width:0"><h2>${t('vbScripts')}</h2><p class="en" dir="ltr">${esc(D.title)}</p></div></section><div class="mt16">${scriptList(D.scripts)}</div>`;
}
function wordsTab(c, it){
  const ws = VY.deckWords(c, it.n);
  return `<div class="grid g3">${VY.deckCard ? VY.deckCard(c, it.n) : ''}</div>
  <div class="card mt16"><div class="lbl">🔤 ${t('irWords')}</div><div class="ir-words">${ws.map(w => `<button class="ir-w" data-act="irWord" data-id="${esc(w.id)}"><b class="en" dir="ltr">${esc(w.word)}</b><span>${esc(w.fa)}</span>${VY.statusChip ? VY.statusChip(w.id) : ''}</button>`).join('')}</div></div>`;
}
VY.vbImgErr = im => { const pg = im.closest('.vb-page'), ta = pg && pg.querySelector('textarea'), box = im.closest('.vb-img'); if(box) box.outerHTML = ta && ta.value ? `<pre class="vb-txt en" dir="ltr">${esc(ta.value)}</pre>` : `<div class="muted small">📡 ${t('vbImgErr')}</div>`; };
ACT.vbTab = el => { VY.VBS[el.dataset.k].tab = el.dataset.v; VY.rerender(); };
ACT.vbTxt = el => { const S = VY.VBS[el.dataset.k]; S.txt[el.dataset.p] = !S.txt[el.dataset.p]; keepY(() => VY.rerender()); };
ACT.vbKeyImg = el => { const S = VY.VBS[el.dataset.k]; S.keyImg = !S.keyImg; keepY(() => VY.rerender()); };
ACT.vbZoom = el => { const d = document.createElement('div'); d.className = 'vb-zoom'; d.innerHTML = `<img src="${el.dataset.src}" alt="">`; d.onclick = () => d.remove(); document.body.appendChild(d); };
if(!ACT.irWord) ACT.irWord = el => VY.openWord(el.dataset.id);
})();
