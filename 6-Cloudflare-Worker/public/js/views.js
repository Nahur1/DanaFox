/* ===== VajeYar views: quiz, games, dictionary, my words, stats, settings, onboarding ===== */
(function(){
const {t, n, esc} = VY; const ACT = VY.ACT, V = VY.V;
let timers = [];
VY.stopTimers = () => { timers.forEach(x=>{clearInterval(x); clearTimeout(x);}); timers = []; VY.quizKey = null; };

/* ================= QUIZ ================= */
const QTYPES = [['mixed','shuffle','tMixed'],['enfa','globe','tEnFa'],['faen','repeat','tFaEn'],['def','text','tDef'],['type','type','tType'],['listen','headphones','tListen'],['blank','edit','tBlank'],['tf','toggle','tTF']];
const SRCS = ['recent7','recent30','learned','starred','difficult','all'];
const srcLabel = s => t({recent7:'srcRecent7',recent30:'srcRecent30',learned:'srcLearned',starred:'srcStarred',difficult:'srcDifficult',all:'srcAll'}[s]);
function poolFor(src){
  const now = Date.now();
  return VY.words.filter(w => { const p = VY.P(w.id);
    if(src==='all') return true;
    if(!p || !p.seen) return src==='starred' && p && p.star;
    if(src==='recent7') return p.last > now-7*VY.DAY;
    if(src==='recent30') return p.last > now-30*VY.DAY;
    if(src==='starred') return p.star;
    if(src==='difficult') return p.lapses>=1 || p.bad>p.ok;
    return true; });
}
V.quiz = {title:'quiz', render(){
  if(VY.Q && !VY.Q.finished) return quizQuestion();
  if(VY.Q && VY.Q.finished) return quizResult();
  const c = VY.quizCfg = Object.assign({src:'recent7', type:'mixed', count:10, timer:false}, VY.quizCfg||{});
  const cnt = poolFor(c.src).length;
  return `<div class="quiz">
  <div class="card">
    <h3 style="font-size:19px">${t('quizSetup')}</h3>
    <div class="mt16"><label class="lbl">${t('source')}</label><div class="seg">${SRCS.map(s=>`<button class="${c.src===s?'on':''}" data-act="qcfg" data-k="src" data-v="${s}">${srcLabel(s)}</button>`).join('')}</div>
    <div class="tiny muted mt8">${n(cnt)} ${t('words')}</div></div>
    <div class="mt24"><label class="lbl">${t('qType')}</label><div class="grid g2" style="gap:10px">${QTYPES.map(([k,ic,lb])=>`<div class="qtype ${c.type===k?'on':''}" data-act="qcfg" data-k="type" data-v="${k}"><div class="qi">${icon(ic)}</div><div><b>${t(lb)}</b><span>${t(lb+'S')}</span></div></div>`).join('')}</div></div>
    <div class="row wrap between mt24">
      <div><label class="lbl">${t('qCount')}</label><div class="seg">${[5,10,20,30].map(x=>`<button class="${c.count===x?'on':''}" data-act="qcfg" data-k="count" data-v="${x}">${n(x)}</button>`).join('')}</div></div>
      <label class="row" style="cursor:pointer"><span class="small bold">${t('timer')}</span><span class="switch"><input type="checkbox" id="q-timer" ${c.timer?'checked':''}><span></span></span></label>
    </div>
    <button class="btn btn-primary btn-lg btn-block mt24" data-act="startQuiz" ${cnt<4?'disabled':''}>${icon('zap')} ${t('startQuiz')}</button>
    ${cnt<4?`<p class="small muted" style="text-align:center">${t('notEnough')}</p>`:''}
  </div></div>`;
}, after(){ const tm = document.getElementById('q-timer'); if(tm) tm.onchange = () => { VY.quizCfg.timer = tm.checked; }; if(VY.Q && !VY.Q.finished) quizAfter(); }};
ACT.qcfg = el => { const k = el.dataset.k; VY.quizCfg[k] = k==='count' ? +el.dataset.v : el.dataset.v; VY.rerender(); };

function distractors(w, field, k=3){
  const pick = (arr) => VY.shuffle(arr.filter(x => x.id!==w.id && x[field] && x[field]!==w[field]));
  let c = pick(VY.words.filter(x=>x.cat===w.cat && x.pos===w.pos));
  if(c.length < k) c = c.concat(pick(VY.words.filter(x=>x.cat===w.cat))).concat(pick(VY.words));
  const out = [], seen = new Set([w[field]]); for(const x of c){ if(!seen.has(x[field])){ seen.add(x[field]); out.push(x); } if(out.length===k) break; } return out;
}
function makeQuestion(w, type){
  if(type==='mixed'){ const types = ['enfa','faen','def','type','enfa','blank','tf']; if(VY.hasTTS()) types.push('listen'); type = types[Math.floor(Math.random()*types.length)]; }
  if(type==='blank' && !VY.blank(w.ex||'', w.word)) type = 'enfa';
  if(type==='def' && !w.def) type = 'enfa';
  const q = {id:w.id, type};
  if(['enfa','faen','def','blank'].includes(type)){
    const field = type==='enfa' ? 'fa' : 'word';
    const opts = VY.shuffle([w, ...distractors(w, field)]);
    q.opts = opts.map(o=>o[field]); q.answer = w[field];
  }
  if(type==='tf'){ q.truth = Math.random()<.5; q.shown = q.truth ? w.fa : (distractors(w,'fa',1)[0]||w).fa; if(q.shown===w.fa) q.truth = true; }
  return q;
}
ACT.startQuiz = () => {
  const c = VY.quizCfg; const pool = VY.shuffle(poolFor(c.src));
  if(pool.length < 4){ VY.toast(t('notEnough')); return; }
  VY.Q = {qs:pool.slice(0, c.count).map(w=>makeQuestion(w, c.type)), idx:0, score:0, answered:false, wrong:[], timer:c.timer, xp0:VY.S.xp, finished:false};
  VY.rerender();
};
function qWord(){ return VY.byId[VY.Q.qs[VY.Q.idx].id]; }
function quizQuestion(){
  const Q = VY.Q, q = Q.qs[Q.idx], w = VY.byId[q.id];
  let prompt = '', body = '';
  const opts = () => `<div class="opts">${q.opts.map((o,i)=>`<button class="opt ${['faen','def','blank'].includes(q.type)?'en':''}" ${['faen','def','blank'].includes(q.type)?'dir="ltr"':''} data-act="qAnswer" data-v="${esc(o)}"><span class="k">${n(i+1)}</span><span>${esc(o)}</span></button>`).join('')}</div>`;
  if(q.type==='enfa'){ prompt = `<div class="q-type">${t('qWhatMeans')}</div><div class="row" style="justify-content:center;gap:12px"><div class="q-main en" dir="ltr">${esc(w.word)}</div>${VY.speakBtn(w.word,'sm')}</div><div class="chip purple mt8">${VY.posName(w.pos)}</div>`; body = opts(); }
  if(q.type==='faen'){ prompt = `<div class="q-type">${t('qWhichWord')}</div><div class="q-main">${esc(w.fa)}</div>`; body = opts(); }
  if(q.type==='def'){ prompt = `<div class="q-type">${t('qWhichDef')}</div><div class="q-sent en" dir="ltr">“${esc(w.def)}”</div>`; body = opts(); }
  if(q.type==='blank'){ prompt = `<div class="q-type">${t('qFill')}</div><div class="q-sent en" dir="ltr">${VY.blank(w.ex, w.word)}</div><div class="muted small mt8">${esc(w.fa)}</div>`; body = opts(); }
  if(q.type==='type'){ prompt = `<div class="q-type">${t('qTypeIt')}</div><div class="q-main">${esc(w.fa)}</div><div class="muted small en mt8" dir="ltr">${esc(w.def)}</div><div class="muted mt8 en" dir="ltr" style="letter-spacing:4px" id="q-mask">${w.word.replace(/[a-z]/gi,'_ ')}</div>`; body = typeBox(); }
  if(q.type==='listen'){ prompt = `<div class="q-type">${t('qListenIt')}</div><div class="row mt16" style="justify-content:center"><button class="btn btn-primary btn-lg" data-act="speak" data-text="${esc(w.word)}">${icon('volume')} ${t('play')}</button><button class="btn btn-ghost btn-lg" data-act="speak" data-text="${esc(w.word)}" data-rate="0.55">🐢 ${t('slow')}</button></div>`; body = typeBox(); }
  if(q.type==='tf'){ prompt = `<div class="q-type">${t('qTrue')}</div><div class="row" style="justify-content:center;gap:12px"><div class="q-main en" dir="ltr">${esc(w.word)}</div>${VY.speakBtn(w.word,'sm')}</div><div class="q-sent" style="font-weight:800;color:var(--primary)">= ${esc(q.shown)}</div>`; body = `<div class="opts"><button class="opt" data-act="qAnswer" data-v="true"><span class="k">${n(1)}</span>✓ ${t('trueW')}</button><button class="opt" data-act="qAnswer" data-v="false"><span class="k">${n(2)}</span>✗ ${t('falseW')}</button></div>`; }
  return `<div class="quiz">
    <div class="study-top"><button class="icon-btn" data-act="exitQuiz">${icon('x')}</button><div class="progress yellow"><i style="width:${Q.idx/Q.qs.length*100}%"></i></div><span class="chip purple">${n(Q.idx+1)} / ${n(Q.qs.length)}</span><span class="chip green">✓ ${n(Q.score)}</span></div>
    ${Q.timer?'<div class="timer"><i id="q-timer-bar" style="width:100%"></i></div>':''}
    <div class="card q-prompt">${prompt}</div>
    ${body}
    <div id="q-feedback"></div>
  </div>`;
}
const typeBox = () => `<div class="card mt16" style="padding:16px"><div class="row"><input class="input en" dir="ltr" id="q-input" autocomplete="off" spellcheck="false" placeholder="…"><button class="btn btn-ghost" data-act="qHint" title="${t('hint')}">💡</button><button class="btn btn-primary" data-act="qCheck">${t('check')}</button></div></div>`;
function quizAfter(){
  const Q = VY.Q, q = Q.qs[Q.idx], w = qWord();
  const inp = document.getElementById('q-input'); if(inp){ inp.focus(); inp.addEventListener('keydown', e => { if(e.key==='Enter'){ e.preventDefault(); if(Q.answered) ACT.qNext(); else ACT.qCheck(); } }); }
  if(q.type==='listen') setTimeout(()=>VY.speak(w.word), 300);
  if(Q.timer){ let left = 15; const bar = document.getElementById('q-timer-bar'); timers.push(setInterval(()=>{ if(Q.answered) return; left--; if(bar) bar.style.width = (left/15*100)+'%'; if(left<=0) answer(null, true); }, 1000)); }
  VY.quizKey = e => { if(e.target.matches('input')) return; const btns = [...document.querySelectorAll('.opt')]; const i = parseInt(e.key,10); if(!Q.answered && i>=1 && i<=btns.length){ btns[i-1].click(); } else if(Q.answered && (e.key==='Enter' || e.code==='Space')){ e.preventDefault(); ACT.qNext(); } };
}
function answer(val, timeout){
  const Q = VY.Q; if(Q.answered) return; Q.answered = true;
  const q = Q.qs[Q.idx], w = VY.byId[q.id];
  let ok = false;
  if(q.type==='tf') ok = (val==='true') === q.truth;
  else if(q.type==='type' || q.type==='listen') ok = (val||'').trim().toLowerCase() === w.word.toLowerCase();
  else ok = val === q.answer;
  if(timeout) ok = false;
  if(ok) Q.score++; else Q.wrong.push(q.id);
  VY.quizResult(q.id, ok); VY.sound(ok?'ok':'bad');
  document.querySelectorAll('.opt').forEach(b => { b.disabled = true; const v = b.dataset.v;
    if(q.type==='tf'){ if((v==='true')===q.truth) b.classList.add('correct'); else if(v===val) b.classList.add('wrong'); }
    else { if(v===q.answer) b.classList.add('correct'); else if(v===val) b.classList.add('wrong'); } });
  const inp = document.getElementById('q-input'); if(inp){ inp.disabled = true; inp.style.borderColor = ok ? 'var(--green)' : 'var(--red)'; }
  const fb = document.getElementById('q-feedback');
  fb.innerHTML = `<div class="feedback ${ok?'ok':'bad'}"><span style="font-size:22px">${ok?'✓':'✗'}</span><div style="flex:1">${timeout?t('timeUp'):ok?t('correct'):t('wrong')} <span class="small" style="opacity:.85">${ok?'':t('answerWas')} <b class="en" dir="ltr">${esc(w.word)}</b> — ${esc(w.fa)}</span></div>${VY.speakBtn(w.word,'sm')}<button class="btn btn-primary btn-sm" data-act="qNext">${Q.idx+1<Q.qs.length?t('next'):t('finish')} ${icon('arrow')}</button></div>`;
  if(!ok && VY.S.settings.autoplay) VY.speak(w.word);
}
ACT.qAnswer = el => answer(el.dataset.v);
ACT.qCheck = () => { const i = document.getElementById('q-input'); if(i && i.value.trim()) answer(i.value); };
ACT.qHint = () => { const w = qWord(), m = document.getElementById('q-mask'), i = document.getElementById('q-input'); const cur = (i.value||'').length; const reveal = w.word.slice(0, Math.max(1, cur+1)); if(i){ i.value = reveal; i.focus(); } if(m) m.textContent = reveal + w.word.slice(reveal.length).replace(/[a-z]/gi,' _'); };
ACT.qNext = () => { const Q = VY.Q; VY.stopTimers(); Q.idx++; Q.answered = false; if(Q.idx >= Q.qs.length){ Q.finished = true; VY.S.quizzes.push({d:Date.now(), score:Q.score, total:Q.qs.length}); if(VY.S.quizzes.length>200) VY.S.quizzes.shift(); VY.addXP(Q.score===Q.qs.length?20:5); VY.save(); VY.sound('done'); } VY.rerender(); };
ACT.exitQuiz = () => { VY.stopTimers(); VY.Q = null; VY.rerender(); };
function quizResult(){
  const Q = VY.Q, pct = Math.round(Q.score*100/Q.qs.length); const wrong = [...new Set(Q.wrong)];
  const msg = pct===100 ? t('perfect') : pct>=70 ? t('good') : t('keep');
  return `<div class="quiz"><div class="card" style="text-align:center;padding:34px">
    <h3 class="muted" style="font-weight:600">${t('quizResult')}</h3>
    <div class="row mt16" style="justify-content:center">${VY.ring(pct/100, 150, 14, pct>=70?'var(--green)':pct>=40?'var(--yellow)':'var(--red)', 'var(--bg2)', `<div><b style="color:var(--text)">${n(pct)}${VY.lang()==='fa'?'٪':'%'}</b><br><span class="muted">${n(Q.score)} / ${n(Q.qs.length)}</span></div>`)}</div>
    <h2 style="margin:14px 0 2px">${msg}</h2><p class="muted">+${n(VY.S.xp-Q.xp0)} ${t('xp')}</p>
    <div class="row mt16" style="justify-content:center;flex-wrap:wrap"><button class="btn btn-ghost" data-act="exitQuiz">${t('back')}</button><button class="btn btn-primary" data-act="retryQuiz">${icon('repeat')} ${t('retry')}</button>${wrong.length?`<button class="btn btn-yellow" data-act="mistakesToReview">${icon('plus')} ${t('addMistakes')}</button>`:''}</div>
  </div>
  <div class="section-title"><h2>${t('mistakes')}</h2></div>
  <div class="card">${wrong.length ? `<div class="list">${wrong.map(id=>{const w=VY.byId[id]; return `<div class="li" data-act="word" data-id="${esc(id)}"><span class="w en" dir="ltr">${esc(w.word)}</span><span class="m">${esc(w.fa)}</span>${VY.speakBtn(w.word,'sm')}</div>`;}).join('')}</div>` : `<div class="empty"><div class="em">🌟</div>${t('noMistakes')}</div>`}</div></div>`;
}
ACT.retryQuiz = () => { VY.Q = null; ACT.startQuiz(); };
ACT.mistakesToReview = () => { [...new Set(VY.Q.wrong)].forEach(id => { const p = VY.ensureP(id); if(!p.seen){ p.seen = true; p.first = p.last = Date.now(); } p.due = Date.now(); p.interval = 0; }); VY.save(); VY.toast('✓ '+t('saved')); VY.refreshChrome(); };

/* ================= GAMES ================= */
V.games = {title:'games', render(){
  if(VY.G && VY.G.kind==='match') return matchView();
  if(VY.G && VY.G.kind==='speed') return speedView();
  const g = VY.S.games;
  return `<div class="grid g2">
    <div class="card"><div class="stat-ic p" style="width:56px;height:56px">${icon('layers')}</div><h3 class="mt16" style="font-size:18px">${t('matchGame')}</h3><p class="muted small">${t('matchSub')}</p><div class="row between mt16"><span class="chip yellow">🏆 ${t('bestTime')}: ${g.matchBest!=null?n(g.matchBest)+t('sec'):'—'}</span><button class="btn btn-primary" data-act="startMatch">${t('start')}</button></div></div>
    <div class="card"><div class="stat-ic y" style="width:56px;height:56px">${icon('zap')}</div><h3 class="mt16" style="font-size:18px">${t('speedGame')}</h3><p class="muted small">${t('speedSub')}</p><div class="row between mt16"><span class="chip yellow">🏆 ${t('best')}: ${n(g.speedBest||0)}</span><button class="btn btn-yellow" data-act="startSpeed">${t('start')}</button></div></div>
  </div>`;
}, after(){ if(VY.G && VY.G.kind==='match') matchAfter(); if(VY.G && VY.G.kind==='speed') speedAfter(); }};
const gamePool = () => { let p = VY.words.filter(w=>VY.P(w.id)&&VY.P(w.id).seen); if(p.length < 8) p = VY.words.filter(w=>w.cat===(VY.S.settings.track||'general') && w.level<=2); return p; };
ACT.startMatch = () => { const ws = VY.sample(gamePool(), 6); VY.G = {kind:'match', ws, left:VY.shuffle(ws.map(w=>w.id)), right:VY.shuffle(ws.map(w=>w.id)), done:[], sel:null, start:Date.now(), errors:0}; VY.rerender(); };
function matchView(){ const G = VY.G;
  return `<div class="quiz"><div class="study-top"><button class="icon-btn" data-act="exitGame">${icon('x')}</button><div class="progress"><i style="width:${G.done.length/6*100}%"></i></div><span class="chip purple">⏱ <span id="g-time">0</span>${t('sec')}</span><span class="chip red">${t('moves')}: ${n(G.errors)}</span></div>
  <div class="match"><div class="grid" style="gap:12px">${G.left.map(id=>`<button class="tile en ${G.done.includes(id)?'done':''}" dir="ltr" data-act="tile" data-side="L" data-id="${esc(id)}">${esc(VY.byId[id].word)}</button>`).join('')}</div>
  <div class="grid" style="gap:12px">${G.right.map(id=>`<button class="tile ${G.done.includes(id)?'done':''}" data-act="tile" data-side="R" data-id="${esc(id)}">${esc(VY.byId[id].fa)}</button>`).join('')}</div></div></div>`; }
function matchAfter(){ const el = document.getElementById('g-time'); timers.push(setInterval(()=>{ if(el) el.textContent = n(Math.floor((Date.now()-VY.G.start)/1000)); }, 500)); }
ACT.tile = el => { const G = VY.G, id = el.dataset.id, side = el.dataset.side;
  if(!G.sel || G.sel.side===side){ document.querySelectorAll('.tile.sel').forEach(x=>x.classList.remove('sel')); el.classList.add('sel'); G.sel = {id, side, el}; if(side==='L') VY.speak(VY.byId[id].word); return; }
  if(G.sel.id === id){ G.done.push(id); el.classList.add('done'); G.sel.el.classList.add('done'); G.sel = null; VY.sound('ok');
    if(G.done.length===6){ const secs = Math.floor((Date.now()-G.start)/1000)+G.errors*2; const best = VY.S.games.matchBest; if(best==null || secs<best) VY.S.games.matchBest = secs; VY.addXP(15); VY.save(); VY.stopTimers();
      setTimeout(()=>{ VY.modal(`<div style="text-align:center"><div style="font-size:52px">🎉</div><h2>${t('perfect')}</h2><p class="muted">${t('time')}: ${n(secs)}${t('sec')} · ${t('bestTime')}: ${n(VY.S.games.matchBest)}${t('sec')}</p><div class="row mt16" style="justify-content:center"><button class="btn btn-ghost" data-act="exitGame">${t('back')}</button><button class="btn btn-primary" data-act="againMatch">${t('playAgain')}</button></div></div>`); }, 350); }
  } else { G.errors++; VY.sound('bad'); [el, G.sel.el].forEach(x=>{ x.classList.add('err'); setTimeout(()=>x.classList.remove('err','sel'), 450); }); G.sel = null; }
};
ACT.againMatch = () => { VY.closeModal(); ACT.startMatch(); };
ACT.exitGame = () => { VY.closeModal(); VY.stopTimers(); VY.G = null; VY.rerender(); };
ACT.startSpeed = () => { VY.G = {kind:'speed', pool:gamePool(), score:0, end:Date.now()+60000}; nextSpeed(); VY.rerender(); };
function nextSpeed(){ const G = VY.G; const w = G.pool[Math.floor(Math.random()*G.pool.length)]; G.w = w; G.opts = VY.shuffle([w, ...distractors(w,'fa')]).map(o=>o.fa); }
function speedView(){ const G = VY.G; return `<div class="quiz"><div class="study-top"><button class="icon-btn" data-act="exitGame">${icon('x')}</button><div class="progress yellow"><i id="sp-bar" style="width:100%"></i></div><span class="chip green">✓ ${n(G.score)}</span></div>
  <div class="card q-prompt"><div class="q-main en" dir="ltr">${esc(G.w.word)}</div></div>
  <div class="opts">${G.opts.map((o,i)=>`<button class="opt" data-act="speedAns" data-v="${esc(o)}"><span class="k">${n(i+1)}</span>${esc(o)}</button>`).join('')}</div></div>`; }
function speedAfter(){ const bar = document.getElementById('sp-bar'); const tick = () => { const left = VY.G.end-Date.now(); if(bar) bar.style.width = Math.max(0,left/600)+'%'; if(left<=0){ VY.stopTimers(); const sc = VY.G.score; if(sc > (VY.S.games.speedBest||0)) VY.S.games.speedBest = sc; VY.addXP(sc*2); VY.save(); VY.modal(`<div style="text-align:center"><div style="font-size:52px">⚡</div><h2>${t('answered')}: ${n(sc)}</h2><p class="muted">${t('best')}: ${n(VY.S.games.speedBest)}</p><div class="row mt16" style="justify-content:center"><button class="btn btn-ghost" data-act="exitGame">${t('back')}</button><button class="btn btn-yellow" data-act="againSpeed">${t('playAgain')}</button></div></div>`); } }; tick(); timers.push(setInterval(tick, 200));
  VY.quizKey = null; }
ACT.speedAns = el => { const G = VY.G; if(Date.now()>G.end) return; const ok = el.dataset.v===G.w.fa; if(ok){ G.score++; VY.sound('ok'); } else { VY.sound('bad'); G.end -= 3000; } VY.quizResult(G.w.id, ok); const end = G.end; nextSpeed(); VY.stopTimers(); VY.rerender(); G.end = end; };
ACT.againSpeed = () => { VY.closeModal(); ACT.startSpeed(); };
document.addEventListener('keydown', e => { if(VY.current==='games' && VY.G && VY.G.kind==='speed' && !document.querySelector('.overlay')){ const i = parseInt(e.key,10); const b = document.querySelectorAll('.opt'); if(i>=1 && i<=b.length) b[i-1].click(); } });

/* ================= DICTIONARY ================= */
V.dictionary = {title:'dictionary', render(){
  const D = VY.dict = Object.assign({q:'', cat:'all', level:0, status:'all', limit:60}, VY.dict||{});
  const cats = ['all','general','ielts','toefl','custom'];
  return `<div class="card" style="padding:18px">
    <div class="search"><input class="input" id="d-q" placeholder="${t('searchWords')}" value="${esc(D.q)}">${icon('search')}</div>
    <div class="row wrap mt12"><div class="seg">${cats.map(c=>`<button class="${D.cat===c?'on':''}" data-act="dset" data-k="cat" data-v="${c}">${c==='all'?t('all'):VY.catName(c)}</button>`).join('')}</div>
    ${D.cat!=='all' && VY.CATS[D.cat].levels.length>1 ? `<div class="seg">${[0,...VY.CATS[D.cat].levels.map((_,i)=>i+1)].map(l=>`<button class="${D.level===l?'on':''}" data-act="dset" data-k="level" data-v="${l}">${l?VY.levelName(D.cat,l):t('allLevels')}</button>`).join('')}</div>`:''}</div>
    <div class="row wrap mt12"><div class="seg">${['all','new','learning','review','mastered','starred'].map(s=>`<button class="${D.status===s?'on':''}" data-act="dset" data-k="status" data-v="${s}">${s==='all'?t('all'):t(s==='starred'?'starred':s+'W')}</button>`).join('')}</div></div>
  </div>
  <div class="card mt16" id="d-list"></div>`;
}, after(){ const q = document.getElementById('d-q'); q.addEventListener('input', () => { VY.dict.q = q.value; VY.dict.limit = 60; dictList(); }); dictList(); }};
function dictFiltered(){ const D = VY.dict, q = D.q.trim().toLowerCase();
  return VY.words.filter(w => (D.cat==='all' || w.cat===D.cat) && (!D.level || w.level===D.level)
    && (D.status==='all' || (D.status==='starred' ? (VY.P(w.id)&&VY.P(w.id).star) : VY.status(w.id)===D.status))
    && (!q || w.word.toLowerCase().includes(q) || w.fa.includes(q) || w.def.toLowerCase().includes(q)))
    .sort((a,b)=> q ? (a.word.toLowerCase().startsWith(q)?0:1)-(b.word.toLowerCase().startsWith(q)?0:1) || a.word.localeCompare(b.word) : 0); }
function dictList(){ const list = dictFiltered(), D = VY.dict, el = document.getElementById('d-list');
  el.innerHTML = `<div class="row between mb8"><span class="small muted">${n(list.length)} ${t('results')}</span></div>` + (list.length ? `<div class="list">${list.slice(0,D.limit).map(w=>`<div class="li" data-act="word" data-id="${esc(w.id)}"><span class="dot ${VY.status(w.id)}"></span><span class="w en" dir="ltr">${esc(w.word)}</span><span class="chip">${VY.posName(w.pos)}</span><span class="m">${esc(w.fa)}</span>${VY.speakBtn(w.word,'sm')}${VY.starBtn(w.id)}</div>`).join('')}</div>${list.length>D.limit?`<div class="row mt12" style="justify-content:center"><button class="btn btn-ghost" data-act="dmore">${t('loadMore')}</button></div>`:''}` : `<div class="empty"><div class="em">🔍</div></div>`); }
ACT.dset = el => { const k = el.dataset.k; VY.dict[k] = k==='level' ? +el.dataset.v : el.dataset.v; if(k==='cat') VY.dict.level = 0; VY.dict.limit = 60; VY.rerender(); };
ACT.dmore = () => { VY.dict.limit += 60; dictList(); };

/* ---------- Word detail modal ---------- */
VY.openWord = id => {
  const w = VY.byId[id]; if(!w) return; const p = VY.P(id) || {};
  VY.modal(`
  <div class="modal-head"><div><div class="row" style="gap:12px"><h2 class="en" dir="ltr" style="margin:0;font-size:32px">${esc(w.word)}</h2>${VY.speakBtn(w.word)}</div><div class="row wrap mt8"><span class="chip purple">${VY.posName(w.pos)}</span><span class="chip">${VY.catName(w.cat)} · ${VY.levelName(w.cat,w.level)}</span>${VY.statusChip(id)}<span class="muted en" dir="ltr" id="m-phon"></span><span id="m-audio"></span></div></div><div class="spacer"></div>${VY.starBtn(id)}<button class="icon-btn" data-act="closeModal">${icon('x')}</button></div>
  <div style="font-size:24px;font-weight:800;color:var(--primary)">${esc(w.fa)}</div>
  ${w.def?`<div class="mt8"><span class="lbl" style="display:inline">${t('definition')}:</span> <span class="en" dir="ltr">${esc(w.def)}</span></div>`:''}
  ${w.ex?`<div class="example"><div class="en" dir="ltr" style="flex:1">${VY.highlight(w.ex, w.word)}</div>${VY.speakBtn(w.ex,'sm')}</div>`:''}
  <div id="m-online" class="mt16 small muted">${VY.S.settings.online?(navigator.onLine?t('loadingOnline'):t('offlineInfo')):''}</div>
  ${p.seen?`<div class="kv mt16"><div><b>${p.due<=Date.now()?t('today'):new Date(p.due).toLocaleDateString(VY.lang()==='fa'?'fa-IR':'en-GB')}</b><span>${t('nextReview')}</span></div><div><b>${VY.intervalLabel(p.interval)}</b><span>${t('interval')}</span></div><div><b>${n(VY.box(p))} / ${n(6)}</b><span>${t('box')}</span></div><div><b><span style="color:var(--green)">${n(p.ok)}</span> / <span style="color:var(--red)">${n(p.bad)}</span></b><span>✓ / ✗</span></div></div>`:''}
  <div class="mt16"><label class="lbl">📝 ${t('note')}</label><textarea class="input" id="m-note" placeholder="${t('notePh')}">${esc(p.note||'')}</textarea></div>
  <div class="row wrap mt16"><button class="btn btn-primary btn-sm" data-act="mSave" data-id="${esc(id)}">${icon('check')} ${t('save')}</button><button class="btn btn-soft btn-sm" data-act="mReview" data-id="${esc(id)}">${icon('repeat')} ${t('addReview')}</button><button class="btn btn-ghost btn-sm" data-act="mKnown" data-id="${esc(id)}">✓ ${t('markKnown')}</button>${p.seen?`<button class="btn btn-danger btn-sm" data-act="mReset" data-id="${esc(id)}">${t('reset')}</button>`:''}</div>`);
  VY.fetchDict(w.word).then(d => { const box = document.getElementById('m-online'); if(!box) return;
    if(!d || d.none){ box.innerHTML = d && d.none ? '' : (VY.S.settings.online?t('offlineInfo'):''); return; }
    const ph = document.getElementById('m-phon'); if(ph) ph.textContent = d.phonetic||'';
    const au = document.getElementById('m-audio'); if(au) au.innerHTML = [d.audioUS?`<button class="btn btn-ghost btn-sm" data-act="audio" data-src="${esc(d.audioUS)}">🔊 US</button>`:'', d.audioUK?`<button class="btn btn-ghost btn-sm" data-act="audio" data-src="${esc(d.audioUK)}">🔊 UK</button>`:''].join(' ');
    box.classList.remove('muted');
    box.innerHTML = `${d.syn.length?`<div><span class="lbl">${t('synonyms')}</span><div class="row wrap">${d.syn.map(s=>`<span class="chip purple en" dir="ltr">${esc(s)}</span>`).join('')}</div></div>`:''}
      ${d.ant.length?`<div class="mt12"><span class="lbl">${t('antonyms')}</span><div class="row wrap">${d.ant.map(s=>`<span class="chip orange en" dir="ltr">${esc(s)}</span>`).join('')}</div></div>`:''}
      ${d.defs.length?`<div class="mt12"><span class="lbl">${t('moreDefs')}</span><ol class="en" dir="ltr" style="margin:0;padding-left:20px;text-align:left">${d.defs.map(x=>`<li><i class="muted">${esc(x.pos)}</i> — ${esc(x.def)}${x.ex?`<div class="muted small">“${esc(x.ex)}”</div>`:''}</li>`).join('')}</ol></div>`:''}`; });
};
ACT.mSave = el => { const p = VY.ensureP(el.dataset.id); p.note = document.getElementById('m-note').value.trim(); VY.save(); VY.toast('✓ '+t('saved')); };
ACT.mReview = el => { ACT.addToReview(el); VY.closeModal(); if(VY.current!=='study') VY.rerender(); };
ACT.mKnown = el => { VY.rate(el.dataset.id, 'known'); VY.closeModal(); VY.toast('✓ '+t('saved')); if(VY.current!=='study') VY.rerender(); };
ACT.mReset = el => { VY.resetWord(el.dataset.id); VY.closeModal(); if(VY.current!=='study') VY.rerender(); };

/* ================= MY WORDS ================= */
V.mywords = {title:'myWords', render(){
  const list = VY.S.custom;
  return `<div class="grid g2">
  <div class="card"><h3>${t('addWord')}</h3>
    <div class="mt16"><label class="lbl">${t('wordEn')}</label><input class="input en" dir="ltr" id="c-word" autocomplete="off"></div>
    <div class="mt12"><label class="lbl">${t('meaningFa')}</label><div class="row"><input class="input" id="c-fa" dir="rtl"><button class="btn btn-soft" data-act="cTranslate" title="${t('autoTranslate')}">${icon('globe')}</button></div></div>
    <div class="mt12"><label class="lbl">${t('pos')}</label><select class="input" id="c-pos">${Object.keys(VY.POS).map(k=>`<option value="${k}">${VY.posName(k)}</option>`).join('')}</select></div>
    <div class="mt12"><label class="lbl">${t('definition')}</label><input class="input en" dir="ltr" id="c-def"></div>
    <div class="mt12"><label class="lbl">${t('example')}</label><input class="input en" dir="ltr" id="c-ex"></div>
    <button class="btn btn-primary btn-block mt16" data-act="cAdd">${icon('plus')} ${t('add')}</button>
  </div>
  <div class="card"><div class="row between"><h3>${t('myWords')} · ${n(list.length)}</h3><div class="row"><button class="btn btn-ghost btn-sm" data-act="cImport">${icon('upload')} ${t('importCsv')}</button><button class="btn btn-ghost btn-sm" data-act="cExport" ${list.length?'':'disabled'}>${icon('download')} ${t('exportCsv')}</button></div></div>
    <div class="tiny muted mt8">${t('csvHelp')}</div>
    ${list.length?`<div class="list mt12">${list.slice().reverse().map(c=>`<div class="li" data-act="word" data-id="${esc(c.id)}"><span class="dot ${VY.status(c.id)}"></span><span class="w en" dir="ltr">${esc(c.word)}</span><span class="m">${esc(c.fa)}</span><button class="star" data-act="cDel" data-id="${esc(c.id)}" title="delete">${icon('trash')}</button></div>`).join('')}</div>
    <button class="btn btn-yellow btn-block mt16" data-act="startLearn" data-cat="custom" data-level="1">${icon('sparkles')} ${t('study')}</button>`:`<div class="empty"><div class="em">✍️</div>${t('customEmpty')}</div>`}
  </div></div>`;
}};
function addCustom(word, fa, pos, def, ex){ word = (word||'').trim(); if(!word) return false; const id = 'custom:'+word.toLowerCase(); if(VY.S.custom.some(c=>c.id===id)) return false; VY.S.custom.push({id, word, fa:(fa||'').trim()||'—', pos:pos||'n', def:(def||'').trim(), ex:(ex||'').trim()}); return true; }
ACT.cAdd = () => { const g = i => document.getElementById(i).value; if(!g('c-word').trim()) return document.getElementById('c-word').focus(); if(addCustom(g('c-word'), g('c-fa'), g('c-pos'), g('c-def'), g('c-ex'))){ VY.save(); VY.buildWords(); VY.checkAch(); VY.toast('✓ '+t('added')); VY.rerender(); } };
ACT.cTranslate = async () => { const w = document.getElementById('c-word').value.trim(); if(!w) return; const f = document.getElementById('c-fa'); f.placeholder = '…'; const tr = await VY.translate(w); if(tr) f.value = tr; else VY.toast(t('offlineInfo')); f.placeholder = '';
  if(!document.getElementById('c-def').value){ const d = await VY.fetchDict(w); if(d && !d.none && d.defs[0]){ document.getElementById('c-def').value = d.defs[0].def; if(d.defs.find(x=>x.ex)) document.getElementById('c-ex').value = d.defs.find(x=>x.ex).ex; const ps = {noun:'n',verb:'v',adjective:'adj',adverb:'adv'}[d.defs[0].pos]; if(ps) document.getElementById('c-pos').value = ps; } } };
ACT.cDel = (el, e) => { e.stopPropagation(); VY.S.custom = VY.S.custom.filter(c=>c.id!==el.dataset.id); delete VY.S.progress[el.dataset.id]; VY.save(); VY.buildWords(); VY.toast(t('deleted')); VY.rerender(); };
const csvCell = s => '"'+String(s||'').replace(/"/g,'""')+'"';
ACT.cExport = () => VY.download('vajeyar-words.csv', '\ufeff'+VY.S.custom.map(c=>[c.word,c.fa,c.def,c.ex].map(csvCell).join(',')).join('\n'), 'text/csv');
function parseCSV(text){ const rows = []; let row = [], cur = '', q = false; for(let i=0;i<text.length;i++){ const ch = text[i]; if(q){ if(ch==='"' && text[i+1]==='"'){ cur+='"'; i++; } else if(ch==='"') q = false; else cur += ch; } else { if(ch==='"') q = true; else if(ch===',' || ch===';' || ch==='\t'){ row.push(cur); cur=''; } else if(ch==='\n'){ row.push(cur); rows.push(row); row=[]; cur=''; } else if(ch!=='\r') cur += ch; } } if(cur || row.length){ row.push(cur); rows.push(row); } return rows; }
ACT.cImport = () => VY.pickFile('.csv,.txt,.tsv', text => { let k = 0; parseCSV(text.replace(/^\ufeff/,'')).forEach(r => { if(r[0] && !/^word$/i.test(r[0].trim()) && addCustom(r[0], r[1], 'n', r[2], r[3])) k++; }); VY.save(); VY.buildWords(); VY.checkAch(); VY.toast('✓ '+n(k)+' '+t('words')); VY.rerender(); });

/* ================= STATS ================= */
V.stats = {title:'stats', render(){
  const S = VY.S, days = S.days, keys = Object.keys(days);
  const ok = keys.reduce((a,k)=>a+days[k].correct,0), bad = keys.reduce((a,k)=>a+days[k].wrong,0);
  const last14 = [...Array(14)].map((_,i)=>{ const k = VY.dayKey(VY.addDays(Date.now(), i-13)); return {k, v:(days[k]||{}).reviews||0}; });
  const mx = Math.max(1, ...last14.map(d=>d.v));
  const boxes = [0,0,0,0,0,0,0]; VY.words.forEach(w=>{ boxes[VY.box(VY.P(w.id))]++; });
  const bmx = Math.max(1, ...boxes.slice(1));
  const fc = [...Array(7)].map((_,i)=>{ const st = i===0?0:VY.addDays(VY.startOfDay(), i), en = VY.addDays(VY.startOfDay(), i+1); return VY.words.filter(w=>{const p=VY.P(w.id); return p&&p.seen&&p.due>=st&&p.due<en;}).length; });
  const fmx = Math.max(1,...fc);
  const weeks = 18, startHeat = VY.addDays(VY.startOfDay(), -(weeks*7-1) - new Date().getDay());
  const heat = [...Array(weeks*7 + new Date().getDay()+1)].map((_,i)=>{ const k = VY.dayKey(VY.addDays(startHeat, i)); const v = (days[k]||{}).reviews||0; return `<i class="${v===0?'':v<5?'l1':v<15?'l2':v<S.settings.goal?'l3':'l4'}" title="${k}: ${v}"></i>`; }).join('');
  const lvl = VY.levelOf(S.xp), [lo, hi] = VY.levelRange(lvl);
  const boxNames = VY.lang()==='fa' ? ['','۱: امروز','۲: ۱–۲ روز','۳: ۳–۶ روز','۴: ۱–۳ هفته','۵: ۱–۲ ماه','۶: تسلط'] : ['','1: today','2: 1–2 days','3: 3–6 days','4: 1–3 weeks','5: 1–2 months','6: mastered'];
  return `
  <div class="card row wrap" style="gap:20px">
    <div class="stat-ic y" style="width:64px;height:64px;font-size:26px;font-weight:800">${n(lvl)}</div>
    <div style="flex:1;min-width:200px"><div class="row between"><b>${t('level')} ${n(lvl)}</b><span class="small muted">${n(S.xp)} / ${n(hi)} ${t('xp')}</span></div><div class="progress yellow mt8" style="height:12px"><i style="width:${(S.xp-lo)/(hi-lo)*100}%"></i></div></div>
    <span class="chip">🧊 ${t('freeze')}: ${n(S.streak.freezes)}</span>
  </div>
  <div class="grid g4 mt16">
    <div class="card stat"><div class="stat-ic p">${icon('brain')}</div><div><b>${n(VY.learnedCount())}</b><span>${t('totalLearned')}</span></div></div>
    <div class="card stat"><div class="stat-ic g">${icon('check')}</div><div><b>${n(VY.masteredCount())}</b><span>${t('mastered')}</span></div></div>
    <div class="card stat"><div class="stat-ic o">${icon('flame')}</div><div><b>${n(S.streak.best)}</b><span>${t('bestStreak')}</span></div></div>
    <div class="card stat"><div class="stat-ic y">${icon('target')}</div><div><b>${n(ok+bad?Math.round(ok*100/(ok+bad)):0)}${VY.lang()==='fa'?'٪':'%'}</b><span>${t('accuracy')} · ${n(S.quizzes.length)} ${t('quiz')}</span></div></div>
  </div>
  <div class="grid g2 mt16">
    <div class="card"><h3>${t('last14')}</h3><div class="bars">${last14.map((d,i)=>`<div class="bar ${i===13?'today':''}"><span>${d.v?n(d.v):''}</span><i style="height:${d.v/mx*110}px"></i><span>${n(+d.k.slice(8))}</span></div>`).join('')}</div></div>
    <div class="card"><h3>${t('forecast')}</h3><div class="bars">${fc.map((v,i)=>`<div class="bar ${i===0?'today':''}"><span>${n(v)}</span><i style="height:${v/fmx*110}px"></i><span>${i===0?t('today'):i===1?t('tomorrow'):'+'+n(i)}</span></div>`).join('')}</div></div>
    <div class="card"><h3>${t('boxes')}</h3>${[1,2,3,4,5,6].map(b=>`<div class="hbar"><span class="muted">${boxNames[b]}</span><div class="progress ${b===6?'yellow':''}"><i style="width:${boxes[b]/bmx*100}%"></i></div><b>${n(boxes[b])}</b></div>`).join('')}<div class="hbar"><span class="muted">${t('newW')}</span><div class="progress"><i style="width:0"></i></div><b>${n(boxes[0])}</b></div></div>
    <div class="card"><h3>${t('catProgress')}</h3>${['general','ielts','toefl','custom'].map(c=>{const ws=VY.deckWords(c); const s=ws.filter(w=>VY.P(w.id)&&VY.P(w.id).seen).length; return `<div class="hbar"><span>${VY.CATS[c].icon} ${VY.catName(c)}</span><div class="progress"><i style="width:${ws.length?s/ws.length*100:0}%"></i></div><b>${n(ws.length?Math.round(s*100/ws.length):0)}${VY.lang()==='fa'?'٪':'%'}</b></div>`;}).join('')}</div>
  </div>
  <div class="card mt16"><h3>${t('heatmap')}</h3><div class="heat mt12" dir="ltr">${heat}</div></div>
  <div class="section-title"><h2>${t('achievements')}</h2><span class="chip yellow">${n(Object.keys(S.ach).length)} / ${n(VY.ACH.length)}</span></div>
  <div class="grid g3">${VY.ACH.map(a=>`<div class="ach ${S.ach[a.id]?'':'locked'}"><div class="ai">${a.e}</div><div><b>${a[VY.lang()][0]}</b><span>${a[VY.lang()][1]}</span></div></div>`).join('')}</div>`;
}};

/* ================= SETTINGS ================= */
let deferredPrompt = null;
window.addEventListener('beforeinstallprompt', e => { e.preventDefault(); deferredPrompt = e; });
const seg = (k, opts) => `<div class="seg">${opts.map(([v,l])=>`<button class="${String(VY.S.settings[k])===String(v)?'on':''}" data-act="setv" data-k="${k}" data-v="${v}">${l}</button>`).join('')}</div>`;
const sw = (k) => `<label class="switch"><input type="checkbox" data-set="${k}" ${VY.S.settings[k]?'checked':''}><span></span></label>`;
const row = (ic, title, sub, ctrl) => `<div class="set-row"><div class="stat-ic p" style="width:40px;height:40px">${icon(ic)}</div><div class="t"><b>${title}</b><span>${sub||''}</span></div>${ctrl}</div>`;
V.settings = {title:'settings', render(){
  const s = VY.S.settings;
  return `${VY.accountCard ? VY.accountCard() : ''}<div class="grid g2">
  <div class="card">
    ${row('globe', t('language'), t('languageS'), seg('lang', [['fa','فارسی'],['en','English']]))}
    ${row('sun', t('theme'), '', seg('theme', [['light',t('light')],['dark',t('dark')],['system',t('system')]]))}
    ${row('target', t('dailyGoal'), t('goalS'), seg('goal', [[10,n(10)],[20,n(20)],[30,n(30)],[50,n(50)]]))}
    ${row('sparkles', t('sessionSize'), t('sessionSizeS'), seg('sessionSize', [[5,n(5)],[10,n(10)],[15,n(15)],[20,n(20)]]))}
    ${row('layers', t('cardFront'), t('cardFrontS'), seg('front', [['en',t('frontEn')],['fa',t('frontFa')],['mix',t('frontMix')]]))}
    ${row('bell', t('reminder'), t('reminderS'), `<input type="time" class="input" style="width:120px" id="s-time" value="${s.reminderTime}">${sw('reminder')}`)}
  </div>
  <div class="card">
    ${row('volume', t('accent'), t('accentS'), seg('accent', [['en-US',t('us')],['en-GB',t('uk')]]))}
    ${row('clock', t('speed'), '', `<input type="range" min="0.5" max="1.3" step="0.1" value="${s.rate}" id="s-rate" style="accent-color:var(--primary)"><button class="speak sm" data-act="speak" data-text="Vocabulary">${icon('volume')}</button>`)}
    ${row('headphones', t('autoplay'), t('autoplayS'), sw('autoplay'))}
    ${row('zap', t('sounds'), t('soundsS'), sw('sounds'))}
    ${row('book', t('online'), t('onlineS'), sw('online'))}
    ${row('download', t('backup'), t('backupS'), `<button class="btn btn-ghost btn-sm" data-act="bExport">${t('exportB')}</button><button class="btn btn-ghost btn-sm" data-act="bImport">${t('importB')}</button>`)}
    ${deferredPrompt?row('plus','Install app','PWA', `<button class="btn btn-primary btn-sm" data-act="install">Install</button>`):''}
    ${row('trash', t('resetAll'), t('resetAllS'), `<button class="btn btn-danger btn-sm" data-act="resetAll">${t('reset')}</button>`)}
  </div></div>
  <div class="card mt16"><h3>⌨️ ${t('shortcuts')}</h3><div class="row wrap mt12 small">${[['Space',t('showAnswer')],['1',t('again')],['2',t('gotIt')],['3–7',t('repeatIn')+' '+t('d1')+' … '+t('m1')],['K',t('iKnow')],['S',t('listen')],['1–4',t('quiz')],['Esc',t('exit')]].map(([k,l])=>`<span class="chip"><span class="kbd" style="margin:0">${k}</span> ${l}</span>`).join('')}</div>
  <p class="small muted mt16">${t('aboutS')}</p></div>`;
}, after(){
  document.querySelectorAll('[data-set]').forEach(i => i.onchange = () => { VY.S.settings[i.dataset.set] = i.checked; VY.save(); if(i.dataset.set==='reminder' && i.checked && window.Notification && Notification.permission!=='granted') Notification.requestPermission(); });
  const r = document.getElementById('s-rate'); r.oninput = () => { VY.S.settings.rate = +r.value; VY.save(); };
  const tm = document.getElementById('s-time'); tm.onchange = () => { VY.S.settings.reminderTime = tm.value; VY.S.notified = null; VY.save(); };
}};
ACT.setv = el => { const k = el.dataset.k, v = el.dataset.v; VY.S.settings[k] = /^\d+$/.test(v) ? +v : v; VY.save(); if(k==='lang' || k==='theme') VY.renderShell(); else VY.rerender(); };
ACT.bExport = () => { VY.saveNow(); VY.download('vajeyar-backup-'+VY.dayKey()+'.json', JSON.stringify(VY.S)); VY.toast('✓ '+t('exported')); };
ACT.bImport = () => VY.pickFile('.json', text => { try{ const s = JSON.parse(text); if(!s || !s.v) throw 0; localStorage.setItem('vajeyar_state_v1', text); location.reload(); }catch(e){ VY.toast('✗ Invalid file'); } });
ACT.resetAll = () => { if(confirm(t('confirmReset'))){ VY.resetAll(); VY.renderShell(); } };
ACT.install = async () => { if(deferredPrompt){ deferredPrompt.prompt(); deferredPrompt = null; VY.rerender(); } };

/* ================= MORE (mobile) ================= */
V.more = {title:'more', render(){ return `<div class="grid g2">${[['games','game'],['dictionary','book'],['mywords','plus'],['stats','chart'],['settings','settings']].map(([k,ic])=>`<a class="card stat" href="#/${k}" style="text-decoration:none;color:inherit"><div class="stat-ic p">${icon(ic)}</div><div><b style="font-size:17px">${k==='mywords'?t('myWords'):t(k)}</b></div></a>`).join('')}</div>`; }};

/* ================= ONBOARDING ================= */
VY.onb = {step:0};
V.onboarding = {render(){
  const st = VY.onb.step, s = VY.S.settings;
  const steps = `<div class="steps">${[0,1,2].map(i=>`<i class="${i<=st?'on':''}"></i>`).join('')}</div>`;
  let body = '';
  if(st===0) body = `<h1>${t('welcome')} 👋</h1><p class="muted">${t('welcomeSub')}</p><label class="lbl mt24">${t('chooseLang')}</label>
    <button class="choice ${s.lang==='fa'?'on':''}" data-act="onbSet" data-k="lang" data-v="fa"><span class="ce">🇮🇷</span><div><b>فارسی</b><span>رابط کاربری فارسی — لغات به انگلیسی</span></div></button>
    <button class="choice ${s.lang==='en'?'on':''}" data-act="onbSet" data-k="lang" data-v="en"><span class="ce">🇬🇧</span><div><b>English</b><span>English interface</span></div></button>`;
  if(st===1) body = `<h1>${t('chooseTrack')}</h1>${[['general','🌍','trackGeneral'],['ielts','🎓','trackIelts'],['toefl','🏛️','trackToefl']].map(([k,e,l])=>`<button class="choice ${s.track===k?'on':''}" data-act="onbSet" data-k="track" data-v="${k}"><span class="ce">${e}</span><div><b>${t(l)}</b><span>${n(VY.deckWords(k).length)} ${t('words')} · ${n(VY.CATS[k].levels.length)} ${t('level')}</span></div></button>`).join('')}`;
  if(st===2) body = `<h1>${t('chooseGoal')}</h1>${[[10,'🙂','casual'],[20,'💪','regular'],[30,'🔥','serious'],[50,'🚀','intense']].map(([g,e,l])=>`<button class="choice ${s.goal===g?'on':''}" data-act="onbSet" data-k="goal" data-v="${g}"><span class="ce">${e}</span><div><b>${t(l)}</b><span>${n(g)} ${t('perDay')}</span></div></button>`).join('')}`;
  return `<div class="onb"><div class="onb-card">
    <div class="row between"><div class="brand" style="padding:0"><div class="brand-logo">${icon('logo')}</div><div><div class="brand-name">${t('appName')}</div><div class="brand-sub">${t('appSub')}</div></div></div><button class="icon-btn" data-act="toggleThemeOnb">${icon(document.documentElement.dataset.theme==='dark'?'sun':'moon')}</button></div>
    <div class="mt24">${steps}</div>
    ${body}
    <div class="row mt24">${st>0?`<button class="btn btn-ghost" data-act="onbBack">${t('back')}</button>`:''}<div style="flex:1"></div><button class="btn btn-primary btn-lg" data-act="onbNext">${st<2?t('continue'):t('letsGo')} ${icon('arrow')}</button></div>
  </div></div>`;
}};
ACT.onbSet = el => { const k = el.dataset.k; VY.S.settings[k] = k==='goal' ? +el.dataset.v : el.dataset.v; VY.save(); VY.renderShell(); };
ACT.onbNext = () => { if(VY.onb.step < 2){ VY.onb.step++; VY.renderShell(); } else { VY.S.onboarded = true; VY.learnCat = VY.S.settings.track; VY.save(); location.hash = '#/home'; VY.renderShell(); } };
ACT.onbBack = () => { VY.onb.step--; VY.renderShell(); };
ACT.toggleThemeOnb = () => { VY.S.settings.theme = document.documentElement.dataset.theme==='dark'?'light':'dark'; VY.save(); VY.renderShell(); };

/* ================= Reminder ================= */
setInterval(() => { const s = VY.S.settings; if(!s.reminder || !window.Notification || Notification.permission!=='granted') return;
  const now = new Date(), hm = String(now.getHours()).padStart(2,'0')+':'+String(now.getMinutes()).padStart(2,'0');
  if(hm >= s.reminderTime && VY.S.notified !== VY.dayKey()){ VY.S.notified = VY.dayKey(); VY.save(); const due = VY.dueIds().length; try{ new Notification(t('notifTitle'), {body:t('notifBody',{n:n(due)}), icon:'icons/icon-192.png'}); }catch(e){} } }, 30000);

/* ================= Boot ================= */
(VY.boot || VY.renderShell)();
if('serviceWorker' in navigator && location.protocol.startsWith('http')) navigator.serviceWorker.register('sw.js').catch(()=>{});
})();
