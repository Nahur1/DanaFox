/* ===== DanaFox UI: shell, router, dashboard, learn, flashcards ===== */
(function(){
const {t, n, esc, en} = VY;
const ACT = VY.ACT = {};
const V = VY.V = {};   // views: name -> {title, render(), after()}

/* ---------- Theme & direction ---------- */
VY.applyTheme = () => {
  const th = VY.S.settings.theme;
  const dark = th==='dark' || (th==='system' && matchMedia('(prefers-color-scheme: dark)').matches);
  document.documentElement.dataset.theme = dark ? 'dark' : 'light';
  const m = document.querySelector('meta[name=theme-color]'); if(m) m.content = dark ? '#13111C' : '#8B6CF6';
};
matchMedia('(prefers-color-scheme: dark)').addEventListener('change', VY.applyTheme);
VY.applyDir = () => { const fa = VY.lang()==='fa'; document.documentElement.lang = fa?'fa':'en'; document.documentElement.dir = fa?'rtl':'ltr'; document.title = t('appName'); };

/* ---------- Shell ---------- */
const NAV = [['home','home'],['learn','layers'],['review','repeat'],['quiz','quiz'],['games','game'],['dictionary','book'],['mywords','plus'],['stats','chart'],['settings','settings']];
const navLabel = k => k==='mywords' ? t('myWords') : t(k);
VY.renderShell = () => {
  VY.applyDir(); VY.applyTheme();
  const app = document.getElementById('app');
  if(!VY.S.onboarded){ app.innerHTML = V.onboarding.render(); V.onboarding.after && V.onboarding.after(); return; }
  app.innerHTML = `
  <div class="app">
    <aside class="sidebar">
      <div class="brand"><div class="brand-logo"><img src="icons/mark.png" alt=""></div><div><div class="brand-name">${t('appName')}</div><div class="brand-sub">${t('appSub')}</div></div></div>
      ${NAV.map(([k,ic],i)=>`${i===6?'<div class="nav-sep"></div>':''}<a class="nav-item" href="#/${k}" data-nav="${k}">${icon(ic)}<span>${navLabel(k)}</span>${k==='review'?'<span class="badge hidden" id="due-badge"></span>':''}</a>`).join('')}
      <div class="sidebar-foot" id="side-streak"></div>
    </aside>
    <div class="main">
      <header class="topbar">
        <h1 id="page-title"></h1><div class="spacer"></div>
        <button class="lang-btn" data-act="toggleLang" title="${t('language')}">${VY.lang()==='fa'?'EN':'فا'}</button>
        <button class="icon-btn" data-act="toggleTheme" title="${t('theme')}">${icon(document.documentElement.dataset.theme==='dark'?'sun':'moon')}</button>
      </header>
      <main class="content" id="view"></main>
    </div>
    <nav class="mobile-nav">${[['home','home'],['learn','layers'],['review','repeat'],['quiz','quiz'],['more','settings']].map(([k,ic])=>`<a href="#/${k}" data-nav="${k}">${icon(ic)}<span>${t(k)}</span></a>`).join('')}</nav>
  </div>`;
  VY.route();
};
VY.refreshChrome = () => {
  const due = VY.dueIds().length, b = document.getElementById('due-badge');
  if(b){ b.textContent = n(due); b.classList.toggle('hidden', !due); }
  const s = document.getElementById('side-streak');
  if(s) s.innerHTML = `<div class="flame">🔥</div><div><b>${n(VY.streakNow())} ${t('streak')}</b><span>${VY.t('level')} ${n(VY.levelOf(VY.S.xp))} · ${n(VY.S.xp)} ${t('xp')}</span></div>`;
};

/* ---------- Router ---------- */
VY.route = () => {
  if(!VY.S.onboarded) return VY.renderShell();
  const parts = (location.hash.replace(/^#\/?/, '') || 'home').split('/');
  let name = parts[0]; if(!V[name]) name = 'home';
  VY.current = name; VY.params = parts.slice(1);
  if(VY.stopTimers) VY.stopTimers();
  const view = V[name];
  const el = document.getElementById('view'); if(!el){ return VY.renderShell(); }
  document.getElementById('page-title').textContent = typeof view.title==='function' ? view.title() : t(view.title||name);
  el.innerHTML = view.render();
  document.querySelectorAll('[data-nav]').forEach(a => a.classList.toggle('active', a.dataset.nav===name || (name==='study' && a.dataset.nav==='learn') || (a.dataset.nav==='more' && ['games','dictionary','mywords','stats','settings','more'].includes(name))));
  view.after && view.after();
  VY.refreshChrome();
  window.scrollTo(0,0);
};
VY.go = h => { if(location.hash === '#/'+h) VY.route(); else location.hash = '#/'+h; };
window.addEventListener('hashchange', VY.route);
VY.rerender = () => { const el = document.getElementById('view'); if(el && V[VY.current]){ el.innerHTML = V[VY.current].render(); V[VY.current].after && V[VY.current].after(); VY.refreshChrome(); } };

/* ---------- Global events ---------- */
document.addEventListener('click', e => {
  const el = e.target.closest('[data-act]'); if(!el) return;
  const fn = ACT[el.dataset.act]; if(fn){ e.preventDefault(); fn(el, e); }
});
ACT.toggleTheme = () => { const s = VY.S.settings; s.theme = document.documentElement.dataset.theme==='dark' ? 'light' : 'dark'; VY.save(); VY.renderShell(); };
ACT.toggleLang = () => { VY.S.settings.lang = VY.lang()==='fa' ? 'en' : 'fa'; VY.save(); VY.renderShell(); };
ACT.go = el => VY.go(el.dataset.to);
ACT.speak = (el, e) => { e.stopPropagation(); VY.speak(el.dataset.text, el.dataset.rate ? +el.dataset.rate : undefined); };
ACT.audio = (el, e) => { e.stopPropagation(); VY.playAudio(el.dataset.src); };
ACT.star = (el, e) => { e.stopPropagation(); const on = VY.toggleStar(el.dataset.id); el.classList.toggle('on', on); };
ACT.word = el => VY.openWord(el.dataset.id);

/* ---------- Small builders ---------- */
VY.ring = (pct, size=132, stroke=12, color='#FFE58A', track='rgba(255,255,255,.22)', inner='') => {
  const r = (size-stroke)/2, c = 2*Math.PI*r, off = c*(1-Math.min(1,pct));
  return `<div class="ring" style="width:${size}px;height:${size}px"><svg width="${size}" height="${size}"><circle cx="${size/2}" cy="${size/2}" r="${r}" fill="none" stroke="${track}" stroke-width="${stroke}"/><circle cx="${size/2}" cy="${size/2}" r="${r}" fill="none" stroke="${color}" stroke-width="${stroke}" stroke-linecap="round" stroke-dasharray="${c}" stroke-dashoffset="${off}" style="transition:stroke-dashoffset .6s"/></svg><div class="ring-txt">${inner}</div></div>`;
};
VY.starBtn = id => { const p = VY.P(id); return `<button class="star ${p&&p.star?'on':''}" data-act="star" data-id="${esc(id)}" title="${t('star')}">${icon('star')}</button>`; };
VY.speakBtn = (text, cls='') => `<button class="speak ${cls}" data-act="speak" data-text="${esc(text)}" title="${t('listen')}">${icon('volume')}</button>`;
VY.statusChip = id => { const s = VY.status(id); const m = {new:['',t('newW')], learning:['yellow',t('learningW')], review:['purple',t('reviewW')], mastered:['green',t('masteredW')]}[s]; return `<span class="chip ${m[0]}">${m[1]}</span>`; };
VY.deckStats = (cat, level) => { const ws = VY.deckWords(cat, level); let seen=0, mast=0, due=0; ws.forEach(w => { const p = VY.P(w.id); if(p && p.seen){ seen++; if(p.interval>=21) mast++; if(p.due<=Date.now()) due++; } }); return {total:ws.length, seen, mast, due}; };

/* ================= HOME ================= */
V.home = {title:'home', render(){
  const S = VY.S, td = VY.today(), goal = S.settings.goal, due = VY.dueIds().length;
  const h = new Date().getHours(); const greet = h<12 ? t('goodMorning') : h<17 ? t('goodAfternoon') : t('goodEvening');
  const pct = Math.min(1, td.reviews/goal);
  const allDays = Object.values(S.days); const ok = allDays.reduce((a,d)=>a+d.correct,0), bad = allDays.reduce((a,d)=>a+d.wrong,0);
  const acc = ok+bad ? Math.round(ok*100/(ok+bad)) : 0;
  const pool = VY.words.filter(w => w.cat===(S.settings.track||'general'));
  const di = Math.floor(VY.startOfDay()/VY.DAY);
  const wd = pool[(di*7919) % pool.length] || VY.words[0];
  const recent = VY.words.filter(w => { const p = VY.P(w.id); return p && p.seen && p.last > Date.now()-7*VY.DAY; }).length;
  const fc = [0,1,2,3,4,5,6].map(i => { const end = VY.addDays(VY.startOfDay(), i+1); const start = i===0 ? 0 : VY.addDays(VY.startOfDay(), i); return VY.words.filter(w => { const p = VY.P(w.id); return p && p.seen && p.due < end && p.due >= start; }).length; });
  const decks = ['general','ielts','toefl'].map(c => VY.CATS[c].levels.map((_,i)=>({c, l:i+1, s:VY.deckStats(c,i+1)}))).flat().filter(d => d.s.seen>0 && d.s.seen<d.s.total).slice(0,3);
  const trackDecks = decks.length ? decks : VY.CATS[S.settings.track||'general'].levels.slice(0,3).map((_,i)=>({c:S.settings.track||'general', l:i+1, s:VY.deckStats(S.settings.track||'general', i+1)}));
  return `
  <section class="hero">
    <div style="position:relative;z-index:1">
      <h2>${greet} 👋</h2>
      <p>${t('heroSub')}</p>
      <div class="row wrap">
        <button class="btn btn-yellow btn-lg" data-act="startReview">${icon('repeat')} ${t('startReview')}${due?` <span class="badge" style="background:#fff;color:#4A3A00">${n(due)}</span>`:''}</button>
        <button class="btn btn-ghost btn-lg" data-act="go" data-to="learn">${icon('sparkles')} ${t('learnNew')}</button>
      </div>
    </div>
    ${VY.ring(pct, 132, 12, '#FFE58A', 'rgba(255,255,255,.22)', `<div><b>${n(td.reviews)}</b><br><span>${t('of')} ${n(goal)} · ${t('dailyGoal')}</span></div>`)}
  </section>
  <div class="grid g4 mt24">
    <div class="card stat"><div class="stat-ic o">${icon('flame')}</div><div><b>${n(VY.streakNow())}</b><span>${t('streak')}${S.streak.freezes?` · 🧊${n(S.streak.freezes)}`:''}</span></div></div>
    <div class="card stat"><div class="stat-ic y">${icon('star')}</div><div><b>${n(S.xp)}</b><span>${t('xp')} · ${t('level')} ${n(VY.levelOf(S.xp))}</span></div></div>
    <div class="card stat"><div class="stat-ic p">${icon('brain')}</div><div><b>${n(VY.learnedCount())}</b><span>${t('learned')}</span></div></div>
    <div class="card stat"><div class="stat-ic g">${icon('target')}</div><div><b>${n(acc)}${VY.lang()==='fa'?'٪':'%'}</b><span>${t('accuracy')}</span></div></div>
  </div>
  <div class="grid g2 mt24">
    <div class="card wotd">
      <div class="row between"><span class="chip yellow">☀️ ${t('wotd')}</span>${VY.starBtn(wd.id)}</div>
      <div class="row mt12" style="gap:14px"><div class="w en" dir="ltr">${esc(wd.word)}</div>${VY.speakBtn(wd.word)}</div>
      <div class="row wrap mt8"><span class="chip purple">${VY.posName(wd.pos)}</span><span class="chip">${VY.catName(wd.cat)} · ${VY.levelName(wd.cat, wd.level)}</span></div>
      <div class="mt12" style="font-size:20px;font-weight:800">${esc(wd.fa)}</div>
      <div class="muted small en" dir="ltr" style="text-align:start">${esc(wd.def)}</div>
      <div class="example"><div class="en" dir="ltr" style="flex:1">${VY.highlight(wd.ex, wd.word)}</div>${VY.speakBtn(wd.ex,'sm')}</div>
      <div class="row mt16"><button class="btn btn-soft btn-sm" data-act="addToReview" data-id="${esc(wd.id)}">${icon('plus')} ${t('addToStudy')}</button><button class="btn btn-ghost btn-sm" data-act="word" data-id="${esc(wd.id)}">${t('seeAll')}</button></div>
    </div>
    <div class="grid" style="gap:18px">
      <div class="card">
        <div class="row" style="gap:14px"><div class="stat-ic p">${icon('quiz')}</div><div style="flex:1"><h3>${t('quizSuggest')}</h3><div class="sub">${t('quizSuggestSub')}</div></div></div>
        <div class="row between mt16"><span class="chip purple">${n(recent)} ${t('words')} · ${t('srcRecent7')}</span><button class="btn btn-primary btn-sm" data-act="quickQuiz">${t('startQuiz')}</button></div>
      </div>
      <div class="card">
        <h3>${t('upcoming')}</h3>
        <div class="bars" style="height:110px">${fc.map((v,i)=>{ const mx = Math.max(1,...fc); return `<div class="bar ${i===0?'today':''}"><span>${n(v)}</span><i style="height:${Math.max(4, v/mx*70)}px"></i><span>${i===0?t('today'):i===1?t('tomorrow'):n(i)}</span></div>`; }).join('')}</div>
      </div>
    </div>
  </div>
  <div class="section-title"><h2>${t('continueLearning')}</h2><a class="small" href="#/learn">${t('seeAll')}</a></div>
  <div class="grid g3">${trackDecks.map(d => deckCard(d.c, d.l, d.s)).join('')}</div>`;
}};
ACT.addToReview = el => { const p = VY.ensureP(el.dataset.id); if(!p.seen){ p.seen = true; p.first = Date.now(); p.last = Date.now(); VY.logDay({newWords:1}); } p.due = Date.now(); p.interval = 0; VY.save(); VY.toast('✓ '+t('added')); VY.refreshChrome(); };
ACT.quickQuiz = () => { VY.quizCfg = Object.assign(VY.quizCfg||{}, {src:'recent7'}); VY.go('quiz'); };

/* ================= LEARN ================= */
function deckCard(c, l, s){
  s = s || VY.deckStats(c, l); const pct = s.total ? s.seen/s.total : 0;
  return `<div class="card deck" data-act="startLearn" data-cat="${c}" data-level="${l}">
    <div class="deck-head"><div class="deck-num l${Math.min(4,l)}">${n(l)}</div><div style="flex:1;min-width:0"><h3>${VY.levelName(c,l)}</h3><div class="sub">${VY.catName(c)} · <span class="en" dir="ltr">${VY.CATS[c].levels[l-1].tag}</span></div></div>${s.due?`<span class="badge">${n(s.due)}</span>`:''}</div>
    <div class="progress"><i style="width:${pct*100}%"></i></div>
    <div class="deck-meta"><span><b>${n(s.total)}</b> ${t('words')}</span><span><b>${n(s.seen)}</b> ${t('learned')}</span><span><b>${n(s.mast)}</b> ${t('mastered')}</span></div>
    <div class="row"><button class="btn btn-primary btn-sm" style="flex:1">${icon('sparkles')} ${t('study')}</button><button class="btn btn-ghost btn-sm" data-act="browseDeck" data-cat="${c}" data-level="${l}">${icon('book')}</button></div>
  </div>`;
}
V.learn = {title:'learn', render(){
  const cat = VY.params[0] || VY.learnCat || VY.S.settings.track || 'general'; VY.learnCat = cat;
  const cats = ['general','ielts','toefl','custom'];
  return `
  <div class="grid g4">${cats.map(c => { const tot = VY.deckWords(c).length, seen = VY.deckWords(c).filter(w=>VY.P(w.id)&&VY.P(w.id).seen).length; return `<div class="cat-card ${c}" data-act="pickCat" data-cat="${c}" style="${c===cat?'outline:3px solid var(--yellow);outline-offset:3px':''}"><div class="row between"><span style="font-size:28px">${VY.CATS[c].icon}</span>${c===cat?'<span class="chip" style="background:rgba(255,255,255,.3);color:inherit">✓</span>':''}</div><div><h3>${VY.catName(c)}</h3><div class="cnt">${n(seen)} / ${n(tot)} ${t('words')}</div></div></div>`; }).join('')}</div>
  <div class="section-title"><h2>${VY.catName(cat)}</h2><span class="muted small">${cat==='custom'?'':t('easyToHard')}</span></div>
  ${cat==='custom' && !VY.deckWords('custom').length ? `<div class="card empty"><div class="em">✍️</div><p>${t('customEmpty')}</p><button class="btn btn-primary" data-act="go" data-to="mywords">${icon('plus')} ${t('addWord')}</button></div>` :
  `<div class="grid g3">${VY.CATS[cat].levels.map((_,i) => deckCard(cat, i+1)).join('')}</div>`}
  <div class="section-title"><h2>${t('more')}</h2></div>
  <div class="grid g3">
    <div class="card deck" data-act="startSpecial" data-kind="starred"><div class="deck-head"><div class="deck-num l2">★</div><div><h3>${t('starred')}</h3><div class="sub">${n(VY.words.filter(w=>VY.P(w.id)&&VY.P(w.id).star).length)} ${t('words')}</div></div></div></div>
    <div class="card deck" data-act="startSpecial" data-kind="difficult"><div class="deck-head"><div class="deck-num l4">!</div><div><h3>${t('difficult')}</h3><div class="sub">${n(difficultIds().length)} ${t('words')}</div></div></div></div>
    <div class="card deck" data-act="startReview"><div class="deck-head"><div class="deck-num">↻</div><div><h3>${t('review')}</h3><div class="sub">${n(VY.dueIds().length)} ${t('due')}</div></div></div></div>
  </div>`;
}};
const difficultIds = VY.difficultIds = () => VY.words.filter(w => { const p = VY.P(w.id); return p && p.seen && (p.lapses>=1 || p.bad > p.ok); }).map(w=>w.id);
ACT.pickCat = el => { VY.learnCat = el.dataset.cat; VY.go('learn/'+el.dataset.cat); };
ACT.browseDeck = (el, e) => { e.stopPropagation(); VY.dict = {q:'', cat:el.dataset.cat, level:+el.dataset.level, status:'all', limit:60}; VY.go('dictionary'); };
ACT.startLearn = el => {
  const c = el.dataset.cat, l = +el.dataset.level, ws = VY.deckWords(c, l);
  const due = ws.filter(w => VY.isDue(w.id)).map(w=>w.id);
  const fresh = ws.filter(w => VY.status(w.id)==='new').slice(0, VY.S.settings.sessionSize).map(w=>w.id);
  const q = [...due.slice(0, 30), ...fresh];
  if(!q.length){ VY.toast(t('deckDone')); return; }
  VY.startSession(q, VY.catName(c)+' · '+VY.levelName(c,l));
};
ACT.startSpecial = el => { const ids = el.dataset.kind==='starred' ? VY.words.filter(w=>VY.P(w.id)&&VY.P(w.id).star).map(w=>w.id) : difficultIds(); if(!ids.length){ VY.toast(t('noDue')); return; } VY.startSession(VY.shuffle(ids).slice(0,40), t(el.dataset.kind)); };
ACT.startReview = () => { const ids = VY.dueIds(); if(!ids.length){ VY.go('review'); return; } VY.startSession(ids.slice(0,100), t('review')); };

/* ================= REVIEW (landing) ================= */
V.review = {title:'review', render(){
  const due = VY.dueIds();
  if(due.length){ setTimeout(()=>ACT.startReview(), 0); return ''; }
  return `<div class="card empty" style="max-width:560px;margin:30px auto"><div class="em">🎉</div><h2 style="color:var(--text)">${t('noDue')}</h2><p>${t('noDueSub')}</p><div class="row" style="justify-content:center"><button class="btn btn-primary" data-act="go" data-to="learn">${icon('sparkles')} ${t('learnNew')}</button><button class="btn btn-ghost" data-act="go" data-to="quiz">${icon('quiz')} ${t('startQuiz')}</button></div></div>`;
}};

/* ================= STUDY (flashcards) ================= */
VY.startSession = (ids, title) => { VY.session = {queue:ids.slice(), title, done:0, total:ids.length, good:0, again:0, xp0:VY.S.xp, flipped:false, dir:{}}; VY.go('study'); };
V.study = {title:()=> (VY.session && VY.session.title) || t('learn'), render(){
  const s = VY.session;
  if(!s){ setTimeout(()=>VY.go('learn'),0); return ''; }
  if(!s.queue.length) return studyDone(s);
  const w = VY.byId[s.queue[0]]; if(!w){ s.queue.shift(); return V.study.render(); }
  const p = VY.P(w.id);
  const fr = VY.S.settings.front; let dir = s.dir[w.id]; if(!dir){ dir = fr==='mix' ? (Math.random()<.5?'en':'fa') : fr; s.dir[w.id] = dir; }
  const pct = s.done/(s.done+s.queue.length)*100;
  const good = VY.previewGood(w.id);
  const frontHTML = dir==='en'
    ? `<div class="word en" dir="ltr">${esc(w.word)}</div><div class="phon en" dir="ltr" id="fc-phon"></div><div class="mt16">${VY.speakBtn(w.word)}</div>`
    : `<div class="meaning" style="font-size:34px;margin:0">${esc(w.fa)}</div><div class="muted mt8 en" dir="ltr">${esc(w.def)}</div>`;
  return `
  <div class="study">
    <div class="study-top">
      <button class="icon-btn" data-act="exitStudy" title="${t('exit')}">${icon('x')}</button>
      <div class="progress"><i style="width:${pct}%"></i></div>
      <span class="chip purple">${n(s.done)} / ${n(s.done+s.queue.length)}</span>
    </div>
    <div class="flash-wrap"><div class="flash ${s.flipped&&!s.anim?'flipped':''}" id="flash">
      <div class="face front">
        <div class="corner"><span class="chip purple">${VY.posName(w.pos)}</span><span class="chip">${VY.statusChip(w.id).replace(/<[^>]+>/g,'')}</span></div>
        <div class="corner-r">${VY.starBtn(w.id)}</div>
        ${frontHTML}
        <div class="hint">${t('tapFlip')}</div>
      </div>
      <div class="face back">
        <div class="corner-r">${VY.starBtn(w.id)}</div>
        <div class="row" style="justify-content:center;gap:12px;margin-top:8px"><div class="word en" dir="ltr" style="font-size:34px">${esc(w.word)}</div>${VY.speakBtn(w.word,'sm')}</div>
        <div class="phon en" dir="ltr" id="fc-phon2"></div>
        <div class="meaning">${esc(w.fa)}</div>
        <div class="defn en" dir="ltr">${esc(w.def)}</div>
        ${w.ex?`<div class="example"><div class="en" dir="ltr" style="flex:1">${VY.highlight(w.ex, w.word)}</div>${VY.speakBtn(w.ex,'sm')}</div>`:''}
        ${p && p.note ? `<div class="example" style="background:var(--primary-soft)">📝 <div style="flex:1">${esc(p.note)}</div></div>`:''}
        <div class="syn" id="fc-syn"></div>
      </div>
    </div></div>
    ${s.flipped ? `
    <div class="rate">
      <div class="rate-main">
        <button class="rate-btn again" data-act="rate" data-kind="again">${t('again')}<small>${t('againSub')} <span class="kbd">1</span></small></button>
        <button class="rate-btn good" data-act="rate" data-kind="good">${t('gotIt')}<small>${VY.intervalLabel(good)} <span class="kbd" style="border-color:rgba(255,255,255,.4);color:inherit">2</span></small></button>
      </div>
      <div class="sched"><span class="lbl2">${icon('clock').replace('<svg','<svg style="width:15px;height:15px;vertical-align:-3px"')} ${t('repeatIn')}</span>
        ${[[1,'d1',3],[2,'d2',4],[3,'d3',5],[7,'w1',6],[30,'m1',7]].map(([d,k,key])=>`<button data-act="rate" data-kind="days" data-days="${d}">${t(k)}<span class="kbd">${key}</span></button>`).join('')}
      </div>
    </div>` : `
    <div class="rate"><button class="btn btn-primary btn-lg btn-block" data-act="flip">${t('showAnswer')} <span class="kbd" style="color:inherit;border-color:rgba(255,255,255,.4)">Space</span></button></div>`}
    <div class="study-foot"><button class="btn btn-ghost btn-sm" data-act="rate" data-kind="known">✓ ${t('iKnow')} <span class="kbd">K</span></button><button class="btn btn-ghost btn-sm" data-act="word" data-id="${esc(w.id)}">${icon('book')}</button></div>
  </div>`;
}, after(){
  const s = VY.session; if(!s || !s.queue.length) return;
  const w = VY.byId[s.queue[0]];
  document.getElementById('flash').addEventListener('click', e => { if(e.target.closest('button')) return; ACT.flip(); });
  if(!s.flipped && VY.S.settings.autoplay && s.dir[w.id]==='en') setTimeout(()=>VY.speak(w.word), 250);
  VY.fetchDict(w.word).then(d => {
    if(!d || d.none || !VY.session || VY.session.queue[0]!==w.id) return;
    ['fc-phon','fc-phon2'].forEach(i => { const e = document.getElementById(i); if(e && d.phonetic) e.textContent = d.phonetic; });
    const sy = document.getElementById('fc-syn'); if(sy && d.syn.length) sy.innerHTML = `<span class="muted tiny" style="width:100%">${t('synonyms')}</span>` + d.syn.slice(0,6).map(x=>`<span class="chip purple en" dir="ltr">${esc(x)}</span>`).join('');
  });
}};
function studyDone(s){
  VY.sound('done');
  const xp = VY.S.xp - s.xp0;
  return `<div class="study"><div class="card" style="text-align:center;padding:40px 26px">
    <div style="font-size:56px">🏆</div><h2 style="margin:8px 0 4px">${t('sessionDone')}</h2><p class="muted">${t('sessionDoneSub')}</p>
    <div class="kv mt24"><div><b>${n(s.done)}</b><span>${t('reviewed')}</span></div><div><b style="color:var(--green)">${n(s.good)}</b><span>${t('gotItCount')}</span></div><div><b style="color:var(--red)">${n(s.again)}</b><span>${t('againCount')}</span></div><div><b style="color:var(--yellow-strong)">+${n(xp)}</b><span>${t('xpEarned')}</span></div></div>
    <div class="row mt24" style="justify-content:center"><button class="btn btn-ghost" data-act="go" data-to="home">${t('backHome')}</button><button class="btn btn-primary" data-act="go" data-to="learn">${t('studyMore')}</button><button class="btn btn-yellow" data-act="quickQuiz">${icon('quiz')} ${t('startQuiz')}</button></div>
  </div></div>`;
}
ACT.flip = () => { const s = VY.session; if(!s || !s.queue.length) return; if(s.flipped){ document.getElementById('flash').classList.toggle('flipped'); return; } s.flipped = true; s.anim = true; VY.rerender(); s.anim = false; requestAnimationFrame(()=>requestAnimationFrame(()=>{ const f=document.getElementById('flash'); if(f) f.classList.add('flipped'); })); };
ACT.rate = el => {
  const s = VY.session; if(!s || !s.queue.length) return;
  const id = s.queue.shift(), kind = el.dataset.kind;
  VY.rate(id, kind, +el.dataset.days || 0);
  if(kind==='again'){ s.again++; s.queue.splice(Math.min(3, s.queue.length), 0, id); VY.sound('bad'); }
  else { s.good++; s.done++; VY.sound('ok'); }
  s.flipped = false; VY.rerender();
};
ACT.exitStudy = () => { VY.session = null; VY.go('home'); };

/* ---------- Keyboard ---------- */
document.addEventListener('keydown', e => {
  if(e.target.matches('input,textarea,select')) return;
  if(document.querySelector('.overlay')){ if(e.key==='Escape') VY.closeModal(); return; }
  if(VY.current==='study' && VY.session && VY.session.queue.length){
    const s = VY.session;
    if(e.code==='Space' || e.key==='Enter'){ e.preventDefault(); if(!s.flipped) ACT.flip(); return; }
    if(e.key==='k' || e.key==='K'){ ACT.rate({dataset:{kind:'known'}}); return; }
    if(e.key==='s' || e.key==='S'){ VY.speak(VY.byId[s.queue[0]].word); return; }
    if(!s.flipped) return;
    const map = {'1':['again'],'2':['good'],'3':['days',1],'4':['days',2],'5':['days',3],'6':['days',7],'7':['days',30]}[e.key];
    if(map) ACT.rate({dataset:{kind:map[0], days:map[1]}});
  }
  if(VY.current==='quiz' && VY.quizKey) VY.quizKey(e);
});

/* ---------- Modal ---------- */
VY.modal = html => { VY.closeModal(); const o = document.createElement('div'); o.className='overlay'; o.innerHTML = `<div class="modal">${html}</div>`; o.addEventListener('click', e => { if(e.target===o) VY.closeModal(); }); document.body.appendChild(o); return o; };
VY.closeModal = () => document.querySelectorAll('.overlay').forEach(o=>o.remove());
ACT.closeModal = () => VY.closeModal();
})();
