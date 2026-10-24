/* ===== DanaFox placement test: adaptive vocabulary + yes/no recognition + short reading → CEFR, vocabulary size, IELTS/TOEFL estimate ===== */
(function(){
const {t, n, esc} = VY; const ACT = VY.ACT, V = VY.V;
const BAND = {'general:1':1.5, 'general:2':3, 'general:3':4, 'general:4':5.3, 'ielts:1':3.2, 'ielts:2':4.2, 'ielts:3':5.4, 'toefl:1':3.2, 'toefl:2':4.2, 'toefl:3':5.4};
const bandOf = w => BAND[w.cat + ':' + w.level];
const FAKE = ['flomper','grastle','prendical','ombrify','tasculent','brimbish','scrandle','vorcious','plemish','kriddle','mardulate','sopherous','crunkle','deplanish','wendicate','proptious','stalvery','mulpish','trevolent','plausic','renticle','obsterate','framulous','stendid'];
const CEFR = ['A1','A2','B1','B2','C1','C2'];
const cefrOf = th => CEFR[Math.max(0, Math.min(5, Math.round(th) - 1))];
const interp = (pts, x) => { if(x <= pts[0][0]) return pts[0][1]; for(let i=1;i<pts.length;i++) if(x <= pts[i][0]){ const [a, b] = [pts[i-1], pts[i]]; return a[1] + (b[1]-a[1]) * (x-a[0]) / (b[0]-a[0]); } return pts[pts.length-1][1]; };
const VOC = [[1,400],[2,1100],[3,2300],[4,3800],[5,6000],[6,9000]];
const IELTS = [[1,2.5],[2,3.5],[3,4.5],[3.5,5.5],[4,6],[4.5,6.5],[5,7],[5.5,7.5],[6,8.5]];
const TOEFL = [[1,0],[2,10],[3,35],[3.5,46],[4,60],[4.5,79],[5,95],[5.5,105],[6,115]];
const NEXT_VOC = {A1:1000, A2:2000, B1:3200, B2:5000, C1:7500, C2:10000};
const shortFa = s => String(s || '').split(/[،,؛;]/)[0].trim();
const PASSAGE = 'Why do some cities feel noisier than others? The answer is not only the number of cars. Researchers who measured sound in thirty European cities found that street design matters almost as much as traffic. Narrow streets lined with tall, hard-surfaced buildings reflect sound back and forth, so a single bus can seem twice as loud. Trees, on the other hand, absorb and scatter sound, although their effect is smaller than many people assume: a thin row of trees reduces noise by only one or two decibels. The researchers argue that the most effective measure is surprisingly simple — lowering speed limits, which cuts tyre noise, the dominant source of traffic noise above about 30 km/h.';
const RQS = [
  {q:'According to the passage, what affects noise levels almost as much as traffic?', o:['the weather','street design','the number of people','the age of buildings'], a:1},
  {q:'Tall buildings with hard surfaces make noise seem louder because they…', o:['absorb it','block it','reflect it','create it'], a:2},
  {q:'“A thin row of trees greatly reduces street noise.” — True or false?', o:['True','False'], a:1},
  {q:'The word “dominant” is closest in meaning to…', o:['main','rare','pleasant','hidden'], a:0},
  {q:'What does the writer suggest about many people?', o:['They want more cars in cities.','They overestimate how much trees reduce noise.','They prefer narrow streets.','They ignore speed limits.'], a:1}
];
const NV = 16, NYN = 24;
let P = null;   // running test

function pool(){ return VY.words.filter(w => bandOf(w) != null && w.fa && w.fa !== '—'); }
function pickVocab(){
  const used = new Set(P.v.map(x => x.id)), all = pool().filter(w => !used.has(w.id));
  let c = all.filter(w => Math.abs(bandOf(w) - P.th) <= 0.6); if(c.length < 4) c = all.slice().sort((a, b) => Math.abs(bandOf(a) - P.th) - Math.abs(bandOf(b) - P.th)).slice(0, 30);
  const w = c[Math.floor(Math.random() * c.length)];
  const fa = shortFa(w.fa), seen = new Set([fa]), ds = [];
  for(const x of VY.shuffle(all.filter(x => x.pos === w.pos)).concat(VY.shuffle(all))){ const f = shortFa(x.fa); if(x.id !== w.id && f && !seen.has(f)){ seen.add(f); ds.push(f); } if(ds.length === 3) break; }
  const o = VY.shuffle([fa, ...ds]);
  return {id: w.id, word: w.word, band: bandOf(w), o, a: o.indexOf(fa)};
}
function buildYN(){
  const used = new Set(P.v.map(x => x.id)), all = pool().filter(w => !used.has(w.id) && !/\s/.test(w.word)), real = [];
  [1.5, 3, 4, 4.6, 5.4].forEach(b => { const c = VY.shuffle(all.filter(w => Math.abs(bandOf(w) - b) < 0.35 && !real.some(r => r.id === w.id))); real.push(...c.slice(0, 3).map(w => ({id: w.id, word: w.word, band: bandOf(w), real: true}))); });
  let guard = 0;
  while(real.length < 16 && guard++ < 500){ const w = all[Math.floor(Math.random() * all.length)]; if(!real.some(r => r.id === w.id)) real.push({id: w.id, word: w.word, band: bandOf(w), real: true}); }
  const fake = VY.sample(FAKE, NYN - 16).map(w => ({word: w, real: false}));
  return VY.shuffle(real.slice(0, 16).concat(fake));
}
ACT.plStart = () => { if(pool().length < 40){ VY.toast(t('notEnough')); return; } if(VY.current !== 'placement' || (VY.params||[])[0]) location.hash = '#/placement'; P = {step:'v', th:3, k:0, v:[], yn:null, yi:0, ya:[], r:[], ri:0, t0:Date.now()}; P.cur = pickVocab(); VY.rerender(); };
ACT.plAns = el => {
  if(!P || P.lock) return; const c = +el.dataset.v, q = P.cur, ok = c === q.a;
  P.lock = true;
  document.querySelectorAll('.pl .opt').forEach(b => { const v = +b.dataset.v; b.disabled = true; if(v === q.a) b.classList.add('correct'); else if(v === c) b.classList.add('wrong'); });
  const s = Math.max(0.35, 1.2 * Math.pow(0.85, P.k)); P.k++;
  P.th = Math.max(1, Math.min(6, P.th + (ok ? s * 0.9 : -s)));
  P.v.push({id: q.id, band: q.band, ok, th: P.th});
  setTimeout(() => { P.lock = false; if(P.v.length >= NV){ P.step = 'yn'; P.yn = buildYN(); } else P.cur = pickVocab(); VY.rerender(); }, ok ? 450 : 900);
};
ACT.plYN = el => { if(!P || P.step !== 'yn') return; P.ya.push(el.dataset.v === '1'); P.yi++; if(P.yi >= P.yn.length) P.step = 'r'; VY.rerender(); };
ACT.plR = el => { if(!P || P.lock) return; const c = +el.dataset.v, q = RQS[P.ri]; P.lock = true;
  document.querySelectorAll('.pl .opt').forEach(b => { b.disabled = true; if(+b.dataset.v === c) b.classList.add('on'); });
  P.r.push(c === q.a); setTimeout(() => { P.lock = false; P.ri++; if(P.ri >= RQS.length) finish(); else VY.rerender(); }, 350); };
ACT.plQuit = () => { if(P && !confirm(t('plQuitQ'))) return; P = null; VY.go('home'); };
ACT.plSkip = () => { if(!P) return; if(P.step === 'yn'){ while(P.yi < P.yn.length){ P.ya.push(false); P.yi++; } P.step = 'r'; } else if(P.step === 'r'){ while(P.r.length < RQS.length) P.r.push(false); finish(); return; } VY.rerender(); };

function finish(){
  const thV = P.v.slice(-6).reduce((a, x) => a + x.th, 0) / Math.min(6, P.v.length);
  const real = P.yn.map((x, i) => [x, P.ya[i]]).filter(([x]) => x.real), fake = P.yn.map((x, i) => [x, P.ya[i]]).filter(([x]) => !x.real);
  const H = real.filter(([, y]) => y).length / Math.max(1, real.length), F = fake.filter(([, y]) => y).length / Math.max(1, fake.length);
  const corr = F >= 1 ? 0 : Math.max(0, (H - F) / (1 - F));
  const groups = {}; real.forEach(([x, y]) => { const b = x.band < 2.5 ? 1 : x.band < 3.6 ? 2 : x.band < 4.4 ? 3 : x.band < 5 ? 4 : 5; (groups[b] = groups[b] || []).push(y); });
  const W = {1:1500, 2:1500, 3:1500, 4:1500, 5:3000};
  let ynSize = 0; Object.keys(W).forEach(b => { const g = groups[b] || []; ynSize += (g.length ? g.filter(Boolean).length / g.length : 0) * W[b]; }); ynSize *= (1 - F);
  const thYN = interp(VOC.map(([a, b]) => [b, a]), Math.max(300, ynSize));
  const rs = P.r.filter(Boolean).length / RQS.length, thR = 1.8 + rs * 3.8;
  const th = Math.max(1, Math.min(6, 0.55 * thV + 0.25 * thYN + 0.2 * thR));
  const vocab = Math.round(((interp(VOC, thV) + Math.max(200, ynSize)) / 2) / 50) * 50;
  const cefr = cefrOf(th), lvl = (th % 1);
  const rec = {general: th < 2.5 ? 1 : th < 3.5 ? 2 : th < 4.5 ? 3 : 4, ielts: th < 3.6 ? 1 : th < 4.6 ? 2 : 3, toefl: th < 3.6 ? 1 : th < 4.6 ? 2 : 3};
  const old = VY.kvGet('placement'), hist = ((old && old.hist) || []).concat(old ? [{at: old.at, cefr: old.cefr, vocab: old.vocab}] : []).slice(-5);
  const out = {cefr, theta: Math.round(th * 100) / 100, sub: lvl < .35 ? 'low' : lvl < .7 ? 'mid' : 'high', vocab, ielts: Math.round(interp(IELTS, th) * 2) / 2, toefl: Math.round(interp(TOEFL, th)),
    score: Math.round((th - 1) / 5 * 100), at: Date.now(), time: Math.round((Date.now() - P.t0) / 1000),
    parts: {v: Math.round(P.v.filter(x => x.ok).length / P.v.length * 100), yn: Math.round(corr * 100), r: Math.round(rs * 100), fa: Math.round(F * 100)}, rec, hist};
  VY.kvSet('placement', out); VY.addXP(30); VY.save(); VY.sound('done');
  P = null; VY.go('placement/result');
}

function bar(label, v, color){ return `<div class="pl-bar"><div class="row between small"><span>${label}</span><b>${VY.pct(v)}</b></div><div class="progress ${color||''}"><i style="width:${Math.max(2, v)}%"></i></div></div>`; }
function resultView(r){
  const nextC = CEFR[Math.min(5, CEFR.indexOf(r.cefr) + 1)], need = Math.max(0, (NEXT_VOC[r.cefr] || 10000) - r.vocab), per = +VY.S.settings.newPerDay || 10;
  const weeks = p => Math.max(1, Math.ceil(need / (p * 0.8) / 7));
  const track = VY.S.settings.track || 'general', recL = r.rec[track] || 1;
  return `<div class="pl-res">
  <section class="hero pl-hero"><div style="position:relative;z-index:1;flex:1;min-width:0">
    <span class="chip" style="background:rgba(255,255,255,.22);color:inherit">${t('plResult')}</span>
    <h2 class="mt8">${t('yourLevel')}: <span class="en" dir="ltr">${esc(r.cefr)}</span> · ${t('cefr_' + r.cefr)}</h2>
    <p>${t('cefrD_' + r.cefr)}</p>
    <div class="row wrap mt12"><span class="chip" style="background:#fff;color:#4A3A00">📚 ${t('vocabSize')} ≈ ${n(r.vocab)}</span><span class="chip" style="background:rgba(255,255,255,.22);color:inherit">IELTS ≈ ${n(r.ielts)}</span><span class="chip" style="background:rgba(255,255,255,.22);color:inherit">TOEFL iBT ≈ ${n(r.toefl)}</span></div>
  </div>${VY.ring(r.score/100, 132, 12, '#FFE58A', 'rgba(255,255,255,.22)', `<div><b class="en">${esc(r.cefr)}</b><br><span>${t('plSub_' + r.sub)}</span></div>`)}</section>
  <div class="grid g2 mt16">
    <div class="card"><h3>📊 ${t('plParts')}</h3><div class="mt12">${bar(t('plPartV'), r.parts.v)}${bar(t('plPartYN'), r.parts.yn, 'yellow')}${bar(t('plPartR'), r.parts.r, 'green')}</div>${r.parts.fa >= 25 ? `<p class="small muted mt8">⚠️ ${t('plFakeWarn')}</p>` : ''}</div>
    <div class="card"><h3>🚀 ${t('plNext', {c: nextC})}</h3>${r.cefr === 'C2' ? `<p class="muted">${t('plTop')}</p>` : `<p class="muted small">${t('plNeed', {n: n(need), c: nextC})}</p>
      <div class="kv mt12">${[per, 20, 30].filter((x, i, a) => a.indexOf(x) === i).slice(0, 3).map(p => `<div><b>${n(weeks(p))} ${t('weeks')}</b><span>${n(p)} ${t('perDay')}</span></div>`).join('')}</div>`}</div>
  </div>
  <div class="card mt16"><h3>🎯 ${t('plRec')}</h3><p class="small muted">${t('plRecS')}</p>
    <div class="grid g3 mt12">${['general','ielts','toefl'].map(c => `<div class="pl-rec ${c === track ? 'on' : ''}"><div class="row between"><b>${VY.CATS[c].icon} ${VY.catName(c)}</b>${c === track ? `<span class="chip purple">✓</span>` : ''}</div><div class="small muted">${VY.levelName(c, r.rec[c])} · <span class="en" dir="ltr">${VY.CATS[c].levels[r.rec[c]-1].tag}</span></div><button class="btn btn-soft btn-sm mt8" data-act="startLearn" data-cat="${c}" data-level="${r.rec[c]}">${icon('sparkles')} ${t('study')}</button></div>`).join('')}</div>
    <div class="row wrap mt16"><button class="btn btn-primary" data-act="smartSession">${icon('brain')} ${t('smartSession')}</button>${recL > 1 ? `<button class="btn btn-ghost" data-act="plSkipEasy">${icon('check')} ${t('plSkipEasy')}</button>` : ''}<button class="btn btn-ghost" data-act="plStart">${icon('repeat')} ${t('plRetake')}</button></div>
  </div>
  ${r.hist && r.hist.length ? `<div class="card mt16"><h3>🕘 ${t('plHistory')}</h3><div class="list">${r.hist.slice().reverse().map(h => `<div class="li"><span class="w en" dir="ltr">${esc(h.cefr)}</span><span class="m">${n(h.vocab)} ${t('words')}</span><span class="muted small">${new Date(h.at).toLocaleDateString(VY.lang()==='fa'?'fa-IR':'en-GB')}</span></div>`).join('')}</div></div>` : ''}
  </div>`;
}
ACT.plSkipEasy = () => {
  const r = VY.kvGet('placement'); if(!r) return; const c = VY.S.settings.track || 'general', lv = r.rec[c] || 1;
  const ids = VY.words.filter(w => w.cat === c && w.level < lv && VY.status(w.id) === 'new').map(w => w.id);
  if(!ids.length){ VY.toast(t('done')); return; }
  if(!confirm(t('plSkipEasyQ', {n: n(ids.length)}))) return;
  const now = Date.now(), sod = VY.startOfDay();
  ids.forEach(id => { const p = VY.ensureP(id); Object.assign(p, {seen: true, first: now, last: now, reps: 1, interval: 60, s: 60, d: 2.5, ease: 2.76, due: VY.addDays(sod, 60), ok: p.ok + 1}); });
  VY.save(); VY.toast('✓ ' + n(ids.length)); VY.rerender();
};
function introView(){
  const r = VY.kvGet('placement');
  return `<div class="pl"><div class="card pl-intro">
    <div style="font-size:calc(52px*var(--fs,1))">🎯</div><h2>${t('placementTest')}</h2><p class="muted">${t('plIntro')}</p>
    <div class="pl-steps">${[['📝', t('plPartV'), t('plPartVS', {n: n(NV)})], ['👀', t('plPartYN'), t('plPartYNS', {n: n(NYN)})], ['📖', t('plPartR'), t('plPartRS', {n: n(RQS.length)})]].map(([e, a, b], i) => `<div class="pl-step"><span class="pl-n">${n(i+1)}</span><div><b>${e} ${a}</b><span class="small muted">${b}</span></div></div>`).join('')}</div>
    <p class="small muted">⏱ ${t('plTime')}</p>
    <div class="row wrap mt16" style="justify-content:center">${r ? `<button class="btn btn-ghost btn-lg" data-act="plLast">${t('plLast')} · <span class="en">${esc(r.cefr)}</span></button>` : ''}<button class="btn btn-primary btn-lg" data-act="plStart">${t('plBegin')} ${icon('arrow')}</button></div>
  </div></div>`;
}
ACT.plLast = () => VY.go('placement/result');
function testView(){
  const total = NV + NYN + RQS.length, done = P.v.length + P.yi + P.ri, part = P.step === 'v' ? 1 : P.step === 'yn' ? 2 : 3;
  let body = '';
  if(P.step === 'v'){ const q = P.cur;
    body = `<div class="card q-prompt"><div class="q-type">${t('qWhatMeans')}</div><div class="row" style="justify-content:center;gap:12px"><div class="q-main en" dir="ltr">${esc(q.word)}</div>${VY.speakBtn(q.word, 'sm')}</div></div>
      <div class="opts">${q.o.map((o, i) => `<button class="opt" data-act="plAns" data-v="${i}"><span class="k">${n(i+1)}</span><span>${esc(o)}</span></button>`).join('')}</div>
      <div class="row mt12" style="justify-content:center"><button class="btn btn-ghost" data-act="plAns" data-v="-1">🤷 ${t('dontKnow')}</button></div>`; }
  else if(P.step === 'yn'){ const q = P.yn[P.yi];
    body = `<div class="card q-prompt"><div class="q-type">${t('plYNQ')}</div><div class="q-main en" dir="ltr">${esc(q.word)}</div><div class="small muted mt8">${t('plYNHint')}</div></div>
      <div class="opts"><button class="opt" data-act="plYN" data-v="1"><span class="k">✓</span><span>${t('plKnow')}</span></button><button class="opt" data-act="plYN" data-v="0"><span class="k">×</span><span>${t('plDontKnow')}</span></button></div>`; }
  else { const q = RQS[P.ri];
    body = `<div class="card pl-passage"><div class="lbl">📖 ${t('plReadText')}</div><p class="en" dir="ltr">${esc(PASSAGE)}</p></div>
      <div class="card q-prompt mt12" style="padding:20px"><div class="q-sent en" dir="ltr">${esc(q.q)}</div></div>
      <div class="opts">${q.o.map((o, i) => `<button class="opt en" dir="ltr" data-act="plR" data-v="${i}"><span class="k">${String.fromCharCode(65+i)}</span><span>${esc(o)}</span></button>`).join('')}</div>`; }
  return `<div class="quiz pl">
    <div class="study-top"><button class="icon-btn" data-act="plQuit">${icon('x')}</button><div class="progress yellow"><i style="width:${done/total*100}%"></i></div><span class="chip purple">${t('plPart')} ${n(part)} / ${n(3)}</span></div>
    ${body}
    ${P.step !== 'v' ? `<div class="row mt16" style="justify-content:center"><button class="btn btn-ghost btn-sm" data-act="plSkip">${t('plSkipPart')}</button></div>` : ''}
  </div>`;
}
V.placement = {title:'placementTest', render(){
  if(P) return testView();
  const r = VY.kvGet('placement');
  if((VY.params || [])[0] === 'result' && r) return resultView(r);
  return introView();
}, after(){
  VY.quizKey = null;
  if(P) VY.plKey = e => { const i = parseInt(e.key, 10); const btns = [...document.querySelectorAll('.pl .opts .opt')]; if(i >= 1 && i <= btns.length) btns[i-1].click(); };
}};
document.addEventListener('keydown', e => { if(VY.current === 'placement' && P && !e.target.matches('input,textarea') && VY.plKey) VY.plKey(e); });
})();
