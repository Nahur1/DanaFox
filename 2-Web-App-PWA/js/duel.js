/* ===== DanaFox language duels: quick match, invite by username, live 1-v-1 rounds, Elo rating, offline practice vs. bot ===== */
(function(){
const {t, n, esc} = VY; const ACT = VY.ACT, V = VY.V;
const D = VY.DUEL = {cat:'mix', n:10, lobby:null, g:null, search:'', results:null, busy:false};
const fa = () => VY.lang() === 'fa';
const can = () => VY.isServer && VY.isServer() && VY.isLoggedIn && VY.isLoggedIn();
const nm = p => p ? (p.name || (p.username ? '@' + p.username : '—')) : '—';
const av = p => `<span class="d-av">${esc(String(nm(p)).replace('@', '').trim().charAt(0).toUpperCase() || '?')}</span>`;
const catLbl = c => c === 'mix' ? t('allWords') : VY.catName(c);
const Q_MS = 15000;
const pts = (ok, ms) => ok ? 10 + Math.max(0, Math.round((Q_MS - Math.min(Q_MS, ms)) / 1500)) : 0;
const dt = [];   // timers of the current duel screen (cleared on every re-render)
const clearDT = () => dt.splice(0).forEach(x => { clearInterval(x); clearTimeout(x); });
const poll = (fn, ms) => { const x = setInterval(fn, ms); dt.push(x); VY.addTimer(x); return x; };
const later = (fn, ms) => { const x = setTimeout(fn, ms); VY.addTimer(x); return x; };
const err = e => VY.toast(VY.errMsg(e && e.code));

/* ---------- lobby ---------- */
async function loadLobby(){ try{ D.lobby = await VY.api('/duel'); D.lobbyErr = null; }catch(e){ D.lobbyErr = e.code || 'network'; } if(VY.current === 'duel' && !(VY.params||[])[0]) VY.rerender(); }
function lobbyView(){
  if(!can()) return `<div class="card empty duel-guest"><div class="em">⚔️</div><h2 style="color:var(--text)">${t('duelTitle')}</h2><p>${t(VY.isServer && VY.isServer() ? 'duelNeedLogin' : 'duelOffline')}</p>
    <div class="row wrap" style="justify-content:center">${VY.isServer && VY.isServer() ? `<button class="btn btn-primary" data-act="accSignIn">${icon('user')} ${t('signIn')}</button>` : ''}<button class="btn btn-yellow" data-act="botStart">${icon('game')} ${t('duelBot')}</button></div></div>`;
  const L = D.lobby;
  if(!L) return `<div class="card empty"><div class="spinner"></div><p>${D.lobbyErr ? VY.errMsg(D.lobbyErr) : t('loading')}</p>${D.lobbyErr ? `<div class="row wrap" style="justify-content:center"><button class="btn btn-ghost" data-act="duelReload">${icon('repeat')} ${t('retry')}</button><button class="btn btn-yellow" data-act="botStart">${icon('game')} ${t('duelBot')}</button></div>` : ''}</div>`;
  const s = L.stats || {rating:1000, wins:0, losses:0, draws:0}, u = VY.account.user || {};
  const segs = (k, opts) => `<div class="seg">${opts.map(([v, l]) => `<button class="${String(D[k]) === String(v) ? 'on' : ''}" data-act="duelOpt" data-k="${k}" data-v="${v}">${l}</button>`).join('')}</div>`;
  const row = d => `<div class="li d-li">${av(d.opponent)}<div style="flex:1;min-width:0"><b>${esc(nm(d.opponent))}</b><div class="small muted">${catLbl(d.cat)} · ${n(d.n)} ${t('questions')}${d.opponent && d.opponent.rating ? ' · ★ ' + n(d.opponent.rating) : ''}</div></div>`;
  return `<section class="hero duel-hero"><div style="position:relative;z-index:1;flex:1;min-width:0"><h2>⚔️ ${t('duelTitle')}</h2><p>${t('duelSub')}</p>
      <div class="row wrap mt12"><span class="chip" style="background:#fff;color:#4A3A00">★ ${t('rating')}: ${n(s.rating)}</span><span class="chip" style="background:rgba(255,255,255,.22);color:inherit">${n(s.wins)} ${t("wShort")} · ${n(s.losses)} ${t("lShort")} · ${n(s.draws)} ${t("dShort")}</span>
      ${u.username ? `<button class="chip" data-act="unameSet" style="background:rgba(255,255,255,.22);color:inherit;border:0;cursor:pointer"><span class="en" dir="ltr">@${esc(u.username)}</span> ✎</button>` : ''}</div></div>
      <div class="duel-emb">🏆</div></section>
    ${!u.username ? `<div class="card mt16 hl-card"><div class="row wrap between"><div style="flex:1;min-width:200px"><b>👤 ${t('unameTitle')}</b><div class="small muted">${t('unameWhy')}</div></div><button class="btn btn-primary btn-sm" data-act="unameSet">${t('unameSetBtn')}</button></div></div>` : ''}
    ${L.invites.length ? `<div class="card mt16"><h3>📨 ${t('duelInvites')}</h3><div class="list">${L.invites.map(d => row(d) + `<button class="btn btn-primary btn-sm" data-act="duelAccept" data-code="${d.code}">${t('accept')}</button><button class="btn btn-ghost btn-sm" data-act="duelDecline" data-code="${d.code}">${icon('x')}</button></div>`).join('')}</div></div>` : ''}
    <div class="grid g2 mt16">
      <div class="card"><h3>⚡ ${t('quickMatch')}</h3><p class="small muted">${t('quickMatchS')}</p>
        <label class="lbl mt12">${t('duelWords')}</label>${segs('cat', [['mix', t('allWords')], ['general', VY.catName('general')], ['ielts', 'IELTS'], ['toefl', 'TOEFL'], ...VY.deckCats('reading').concat(VY.deckCats('listening')).map(c => [c, VY.CATS[c].short ? VY.L(VY.CATS[c].short) : VY.catName(c)])])}
        <label class="lbl mt12">${t('qCount')}</label>${segs('n', [[5, n(5)], [10, n(10)], [15, n(15)]])}
        <div class="row wrap mt16"><button class="btn btn-yellow btn-lg" data-act="duelRandom">${icon('zap')} ${t('findOpponent')}</button><button class="btn btn-ghost" data-act="botStart">${icon('game')} ${t('duelBot')}</button></div></div>
      <div class="card"><h3>🤝 ${t('inviteFriend')}</h3><p class="small muted">${t('inviteFriendS')}</p>
        <div class="row mt12"><input class="input en" dir="ltr" id="d-q" placeholder="@username" value="${esc(D.search)}" autocomplete="off" autocapitalize="off"><button class="btn btn-primary" data-act="duelSearch">${icon('search')}</button></div>
        <div class="list mt8" id="d-res">${D.results ? (D.results.length ? D.results.map(p => `<div class="li d-li">${av(p)}<div style="flex:1;min-width:0"><b>${esc(nm(p))}</b><div class="small muted"><span class="en" dir="ltr">${p.username ? '@' + esc(p.username) : '#' + p.id}</span> · ★ ${n(p.rating)}</div></div><button class="btn btn-soft btn-sm" data-act="duelInvite" data-id="${p.id}">${icon('send')} ${t('invite')}</button></div>`).join('') : `<div class="muted small">${t('noResults')}</div>`) : ''}</div></div>
    </div>
    ${L.open.length ? `<div class="card mt16"><h3>⏳ ${t('duelOpen')}</h3><div class="list">${L.open.map(d => row(d) + `<span class="chip ${d.status === 'active' ? 'green' : 'yellow'}">${t('dst_' + d.status)}</span>${d.status === 'active' ? `<button class="btn btn-primary btn-sm" data-act="go" data-to="duel/${d.code}">${t('play')}</button>` : `<button class="btn btn-ghost btn-sm" data-act="duelDecline" data-code="${d.code}">${t('cancel')}</button>`}</div>`).join('')}</div></div>` : ''}
    <div class="grid g2 mt16">
      <div class="card"><div class="row between"><h3>🕘 ${t('duelHistory')}</h3></div>${L.history.length ? `<div class="list">${L.history.map(d => row(d) + `<span class="chip ${d.result === 'win' ? 'green' : d.result === 'loss' ? 'red' : ''}">${t('res_' + d.result)} ${n(d.my_score || 0)}–${n(d.op_score || 0)}</span><span class="small ${d.delta >= 0 ? 'pos' : 'neg'}">${d.delta >= 0 ? '+' : ''}${n(d.delta || 0)}</span><button class="icon-btn sm" data-act="go" data-to="duel/${d.code}" title="${t('details')}">${icon('arrow')}</button></div>`).join('')}</div>` : `<p class="muted small">${t('duelNoHistory')}</p>`}</div>
      <div class="card"><h3>🏅 ${t('leaderboard')}</h3><p class="small muted">${t('leaderboardS')}</p><button class="btn btn-soft mt8" data-act="go" data-to="leaderboard">${icon('trophy')} ${t('seeLeaderboard')}</button></div>
    </div>`;
}
ACT.duelReload = () => { D.lobby = null; D.lobbyErr = null; VY.rerender(); loadLobby(); };
ACT.duelOpt = el => { D[el.dataset.k] = el.dataset.k === 'n' ? +el.dataset.v : el.dataset.v; VY.rerender(); };
ACT.duelSearch = async () => { const q = (document.getElementById('d-q') || {}).value || ''; D.search = q.trim(); if(!D.search) return; try{ D.results = (await VY.api('/users/search?q=' + encodeURIComponent(D.search))).items; }catch(e){ err(e); D.results = []; } VY.rerender(); };
ACT.duelInvite = async el => { el.disabled = true; try{ const s = await VY.api('/duel/invite', {method:'POST', body:{user_id: +el.dataset.id, cat: D.cat, n: D.n}}); VY.toast('✓ ' + t('inviteSent')); D.results = null; D.search = ''; VY.go('duel/' + s.code); }catch(e){ el.disabled = false; err(e); } };
ACT.duelRandom = async el => { el.disabled = true; el.classList.add('loading'); try{ const s = await VY.api('/duel/random', {method:'POST', body:{cat: D.cat, n: D.n}}); D.g = null; VY.go('duel/' + s.code); }catch(e){ el.disabled = false; el.classList.remove('loading'); err(e); } };
ACT.duelAccept = async el => { el.disabled = true; try{ await VY.api('/duel/' + el.dataset.code + '/accept', {method:'POST', body:{}}); VY.go('duel/' + el.dataset.code); }catch(e){ el.disabled = false; err(e); loadLobby(); } };
ACT.duelDecline = async el => { el.disabled = true; try{ await VY.api('/duel/' + el.dataset.code + '/decline', {method:'POST', body:{}}); }catch(e){ err(e); } if((VY.params||[])[0]) VY.go('duel'); else loadLobby(); };

/* ---------- live game ---------- */
function setState(s){
  const G = D.g && D.g.code === s.code ? D.g : (D.g = {code: s.code, shownAt: 0, picked: null, reveal: null});
  G.s = s; G.off = s.now - Date.now();
  return G;
}
const srvNow = G => Date.now() + (G.off || 0);
async function refresh(code){ try{ const s = await VY.api('/duel/' + code, {timeout: 8000}); const G = setState(s); return G; }catch(e){ if(e.code === 'not_found'){ D.g = {code, gone: true}; VY.rerender(); } return null; } }
function gameView(code){
  if(!can() && code !== 'BOT') return lobbyView();
  const G = D.g && D.g.code === code ? D.g : null;
  if(!G) return `<div class="card empty"><div class="spinner"></div><p>${t('loading')}</p></div>`;
  if(G.gone) return `<div class="card empty"><div class="em">🤷</div><p>${t('duelGone')}</p><button class="btn btn-primary" data-act="go" data-to="duel">${t('back')}</button></div>`;
  const s = G.s, me = s.me_user, op = s.opponent;
  const head = `<div class="d-head card"><div class="d-p">${av(me)}<b>${esc(nm(me))}</b><span class="d-sc" id="d-me">${n(s.my_score || 0)}</span></div><div class="d-vs">VS</div><div class="d-p">${av(op)}<b>${op ? esc(nm(op)) : '…'}</b><span class="d-sc" id="d-op">${n(s.op_score || 0)}</span></div></div>`;
  if(s.status === 'waiting') return `<div class="duel">${head}<div class="card empty"><div class="radar"><i></i><i></i><span>⚔️</span></div><h3 style="color:var(--text)">${t('searching')}</h3><p id="d-wait">${t('searchingS')}</p><div class="row wrap" style="justify-content:center"><button class="btn btn-ghost" data-act="duelCancel">${t('cancel')}</button></div></div></div>`;
  if(s.status === 'invited') return `<div class="duel">${head}<div class="card empty"><div class="em">📨</div>${s.incoming ? `<h3 style="color:var(--text)">${t('invitedYou', {n: esc(nm(op))})}</h3><p>${catLbl(s.cat)} · ${n(s.n)} ${t('questions')}</p><div class="row wrap" style="justify-content:center"><button class="btn btn-primary btn-lg" data-act="duelAccept" data-code="${s.code}">${t('accept')}</button><button class="btn btn-ghost" data-act="duelDecline" data-code="${s.code}">${t('decline')}</button></div>` : `<h3 style="color:var(--text)">${t('waitingAccept', {n: esc(nm(op))})}</h3><p>${t('waitingAcceptS')}</p><button class="btn btn-ghost" data-act="duelCancel">${t('cancel')}</button>`}</div></div>`;
  if(['expired', 'declined', 'cancelled'].includes(s.status)) return `<div class="duel">${head}<div class="card empty"><div class="em">⌛</div><h3 style="color:var(--text)">${t('dst_' + s.status)}</h3><div class="row wrap" style="justify-content:center"><button class="btn btn-primary" data-act="go" data-to="duel">${t('back')}</button>${s.status !== 'cancelled' ? `<button class="btn btn-yellow" data-act="botStart">${icon('game')} ${t('duelBot')}</button>` : ''}</div></div></div>`;
  if(s.status === 'done') return doneView(G, head);
  // active
  const left = (s.started_at || 0) - srvNow(G);
  if(left > 0) return `<div class="duel">${head}<div class="card empty"><div class="countdown" id="d-cd">${n(Math.ceil(left/1000))}</div><p>${t('getReady')}</p></div></div>`;
  const i = s.answers.length;
  if(s.my_done || i >= s.n) return `<div class="duel">${head}<div class="card empty"><div class="spinner"></div><h3 style="color:var(--text)">${t('waitOpponent')}</h3><p>${t('opProgress', {a: n(s.op_answered), b: n(s.n)})}</p><button class="btn btn-ghost btn-sm" data-act="duelForfeit">${t('leave')}</button></div></div>`;
  const q = s.questions[i]; if(!q) return `<div class="duel">${head}<div class="card empty"><div class="spinner"></div></div></div>`;
  const rv = G.reveal && G.reveal.i === i ? G.reveal : null;
  return `<div class="duel">${head}
    <div class="study-top"><span class="chip purple">${n(i+1)} / ${n(s.n)}</span><div class="progress"><i style="width:${i/s.n*100}%"></i></div><span class="chip" title="${t('opponent')}">${av(op)} ${n(s.op_answered)}/${n(s.n)}</span></div>
    <div class="timer"><i id="d-timer" style="width:100%"></i></div>
    <div class="card q-prompt"><div class="q-type">${q.t === 'en' ? t('qWhatMeans') : t('qWhichWord')}</div><div class="q-main ${q.t === 'en' ? 'en' : ''}" ${q.t === 'en' ? 'dir="ltr"' : ''}>${esc(q.q)}</div></div>
    <div class="opts">${q.o.map((o, j) => `<button class="opt ${q.t === 'fa' ? 'en' : ''} ${rv ? (j === rv.a ? 'correct' : j === rv.c ? 'wrong' : '') : ''}" ${q.t === 'fa' ? 'dir="ltr"' : ''} data-act="duelAns" data-i="${i}" data-c="${j}" ${rv || G.sending ? 'disabled' : ''}><span class="k">${n(j+1)}</span><span>${esc(o)}</span></button>`).join('')}</div>
    ${rv ? `<div class="feedback ${rv.ok ? 'ok' : 'bad'}">${rv.ok ? '✓ +' + n(rv.points) : rv.c < 0 ? '⏱ ' + t('timeUp') : '× ' + t('wrong')}</div>` : ''}
  </div>`;
}
function doneView(G, head){
  const s = G.s, r = s.result;
  const qs = s.questions || [], mine = s.answers || [], th = s.op_answers || [];
  return `<div class="duel">${head}
    <div class="card d-result ${r}"><div class="em">${r === 'win' ? '🏆' : r === 'loss' ? '😤' : '🤝'}</div><h2>${t('res_' + r)}</h2>
      <div class="row wrap" style="justify-content:center"><span class="chip purple">${n(s.my_score || 0)} – ${n(s.op_score || 0)}</span>${s.delta != null && G.bot !== true ? `<span class="chip ${s.delta >= 0 ? 'green' : 'red'}">★ ${s.delta >= 0 ? '+' : ''}${n(s.delta)}</span>` : ''}</div>
      <div class="row wrap mt16" style="justify-content:center"><button class="btn btn-ghost" data-act="go" data-to="duel">${t('back')}</button>${G.bot ? `<button class="btn btn-yellow" data-act="botStart">${icon('repeat')} ${t('playAgain')}</button>` : s.opponent ? `<button class="btn btn-yellow" data-act="duelRematch" data-id="${s.opponent.id}">${icon('repeat')} ${t('rematch')}</button>` : ''}</div></div>
    ${qs.length ? `<div class="card mt16"><h3>${t('duelReview')}</h3><div class="list">${qs.map((q, i) => { const m = mine[i] || [-1, 0, 0], o = th[i]; return `<div class="li d-rev"><span class="rq-n">${n(i+1)}</span><div style="flex:1;min-width:0"><b class="${q.t === 'en' ? 'en' : ''}" ${q.t === 'en' ? 'dir="ltr"' : ''}>${esc(q.q)}</b><div class="small ${q.t === 'fa' ? 'en' : ''}" ${q.t === 'fa' ? 'dir="ltr"' : ''}>→ ${esc(q.o[q.a])}</div></div><span class="chip ${m[2] ? 'green' : 'red'}">${m[2] ? '✓' : '×'} ${t('you')}</span>${o ? `<span class="chip ${o[2] ? 'green' : 'red'}">${o[2] ? '✓' : '×'}</span>` : ''}${q.s && VY.byId[q.s] ? `<button class="icon-btn sm" data-act="addToReview" data-id="${esc(q.s)}" title="${t('addReview')}">${icon('plus')}</button>` : ''}</div>`; }).join('')}</div></div>` : ''}
  </div>`;
}
ACT.duelRematch = async el => { el.disabled = true; try{ const s = await VY.api('/duel/invite', {method:'POST', body:{user_id: +el.dataset.id, cat: (D.g && D.g.s.cat) || D.cat, n: (D.g && D.g.s.n) || D.n}}); D.g = null; VY.toast('✓ ' + t('inviteSent')); VY.go('duel/' + s.code); }catch(e){ el.disabled = false; err(e); } };
ACT.duelCancel = async () => { const G = D.g; if(!G) return VY.go('duel'); try{ await VY.api('/duel/' + G.code + '/decline', {method:'POST', body:{}}); }catch(e){} D.g = null; VY.go('duel'); };
ACT.duelForfeit = async () => { const G = D.g; if(!G || !confirm(t('forfeitQ'))) return; try{ setState(await VY.api('/duel/' + G.code + '/forfeit', {method:'POST', body:{}})); }catch(e){ err(e); } VY.rerender(); };
ACT.duelAns = el => answer(+el.dataset.i, +el.dataset.c);
async function answer(i, c){
  const G = D.g; if(!G || G.sending || G.reveal || !G.s || G.s.answers.length !== i) return;
  if(G.bot) return botAnswer(i, c);
  G.sending = true; clearDT(); const ms = Math.min(Q_MS, Date.now() - (G.shownAt || Date.now()));
  document.querySelectorAll('.duel .opt').forEach(b => b.disabled = true);
  if(c >= 0){ const b = document.querySelector(`.duel .opt[data-c="${c}"]`); if(b) b.classList.add('sel'); }
  let r;
  try{ r = await VY.api('/duel/' + G.code + '/answer', {method:'POST', body:{i, c, ms}, timeout: 10000}); }
  catch(e){ G.sending = false; err(e); await refresh(G.code); VY.rerender(); return; }
  G.sending = false;
  if(D.g !== G) return;
  G.off = r.now - Date.now();
  // keep the revealed answer on screen for a moment, then move on with the full state
  G.reveal = {i, a: r.a, c, ok: r.ok, points: r.points};
  G.s = Object.assign({}, r, {answers: (r.answers || []).slice(0, i), my_done: false, status: 'active'});
  VY.sound(r.ok ? 'ok' : 'bad');
  if(VY.current === 'duel') VY.rerender();
  later(() => { if(D.g !== G) return; G.reveal = null; G.s = r; if(VY.current === 'duel') VY.rerender(); }, 1000);
}
function gameAfter(code){
  const G = D.g && D.g.code === code ? D.g : null;
  if(!G){ refresh(code).then(g => { if(g && VY.current === 'duel') VY.rerender(); }); return; }
  if(G.gone || !G.s) return;
  const s = G.s;
  if(['waiting', 'invited'].includes(s.status)){
    const t0 = s.created_at || Date.now();
    poll(async () => { const g = await refresh(code); if(g && g.s.status !== s.status) VY.rerender(); else { const w = document.getElementById('d-wait'); if(w && s.status === 'waiting'){ const left = Math.max(0, Math.round((t0 + 45000 - srvNow(G)) / 1000)); w.textContent = t('searchingS') + ' · ' + n(left) + 's'; } } }, 1500);
    return;
  }
  if(s.status !== 'active') return;
  const left = (s.started_at || 0) - srvNow(G);
  if(left > 0){ const cd = document.getElementById('d-cd'); poll(() => { const l = (s.started_at || 0) - srvNow(G); if(cd) cd.textContent = n(Math.max(1, Math.ceil(l/1000))); if(l <= 0){ VY.stopTimers(); refresh(code).then(() => VY.rerender()); } }, 200); return; }
  const i = s.answers.length;
  if(s.my_done || i >= s.n){ poll(async () => { const g = await refresh(code); if(g && (g.s.status !== 'active' || g.s.op_answered !== s.op_answered)) VY.rerender(); }, 2000); return; }
  if(G.reveal && G.reveal.i === i) return;
  if(!s.questions[i]){ later(() => refresh(code).then(() => VY.rerender()), 800); return; }
  if(G.shownI !== i){ G.shownI = i; G.shownAt = Date.now(); }
  const bar = document.getElementById('d-timer');
  poll(() => { const l = Q_MS - (Date.now() - G.shownAt); if(bar) bar.style.width = Math.max(0, l / Q_MS * 100) + '%'; if(l <= 0){ VY.stopTimers(); answer(i, -1); } }, 200);
  poll(async () => { if(G.sending) return; try{ const s2 = await VY.api('/duel/' + code, {timeout: 6000}); if(!D.g || D.g !== G || G.sending || G.reveal) return; G.s.op_answered = s2.op_answered; G.s.op_score = s2.op_score; const o = document.getElementById('d-op'); if(o) o.textContent = n(s2.op_score || 0); if(s2.status === 'done'){ setState(s2); VY.rerender(); } }catch(e){} }, 2500);
  VY.duelKey = e => { const k = parseInt(e.key, 10); if(k >= 1 && k <= 4) answer(i, k - 1); };
}
document.addEventListener('keydown', e => { if(VY.current === 'duel' && VY.duelKey && !e.target.matches('input,textarea')) VY.duelKey(e); });

/* ---------- practice vs. bot (works offline) ---------- */
ACT.botStart = () => {
  const pool = VY.words.filter(w => w.cat !== 'custom' && (D.cat === 'mix' || w.cat === D.cat) && w.fa && w.fa !== '—'); if(pool.length < 20){ VY.toast(t('notEnough')); return; }
  const sf = s => String(s).split(/[،,؛;]/)[0].trim(), pick = VY.sample(pool, D.n);
  const qs = pick.map((w, i) => { const type = i % 2 ? 'fa' : 'en', seen = new Set([type === 'en' ? sf(w.fa) : w.word]), ds = [];
    for(const x of VY.shuffle(pool)){ const v = type === 'en' ? sf(x.fa) : x.word; if(x.id !== w.id && !seen.has(v)){ seen.add(v); ds.push(x); } if(ds.length === 3) break; }
    const o = VY.shuffle([w, ...ds]); return {t: type, q: type === 'en' ? w.word : sf(w.fa), o: o.map(x => type === 'en' ? sf(x.fa) : x.word), a: o.indexOf(w), s: w.id}; });
  const lvl = Math.min(0.9, 0.55 + (VY.levelOf(VY.S.xp) * 0.02));
  const bot = {id: 0, name: '🤖 ' + t('botName'), rating: 1000};
  const botAns = qs.map(q => { const ok = Math.random() < lvl, ms = 2500 + Math.random() * 7500; return [ok ? q.a : (q.a + 1) % 4, Math.round(ms), ok ? 1 : 0]; });
  D.g = {code: 'BOT', bot: true, botAns, s: {code: 'BOT', status: 'active', me: 'a', n: D.n, cat: D.cat, started_at: Date.now() + 3000, now: Date.now(), questions: qs.map(q => ({t: q.t, q: q.q, o: q.o})), full: qs, answers: [], my_score: 0, op_score: 0, op_answered: 0, me_user: {name: (VY.account && VY.account.user && VY.account.user.name) || t('you')}, opponent: bot}, off: 0};
  if(VY.current === 'duel' && (VY.params||[])[0] === 'BOT') VY.rerender(); else VY.go('duel/BOT');
};
function botTick(){ const G = D.g; if(!G || !G.bot) return; const s = G.s, el = Date.now() - s.started_at; let k = 0, sc = 0, acc = 0; G.botAns.forEach((a, i) => { acc += a[1] + 1200; if(acc <= el){ k = i + 1; sc += pts(a[2], a[1]); } }); s.op_answered = Math.min(k, s.n); s.op_score = sc; const o = document.getElementById('d-op'); if(o) o.textContent = n(sc); }
function botAnswer(i, c){
  const G = D.g, s = G.s, q = s.full[i], ms = Math.min(Q_MS, Date.now() - G.shownAt), ok = c === q.a, p = pts(ok, ms);
  clearDT();
  const full = s.answers.concat([[c, ms, ok ? 1 : 0]]);
  s.questions[i] = Object.assign({}, s.questions[i], {a: q.a, s: q.s}); s.my_score += p;
  G.reveal = {i, a: q.a, c, ok, points: p}; VY.sound(ok ? 'ok' : 'bad'); VY.quizResult(q.s, ok);
  VY.rerender();
  later(() => { if(D.g !== G) return; G.reveal = null; s.answers = full;
    if(full.length >= s.n){ s.op_answered = s.n; s.op_score = G.botAns.reduce((a, x) => a + pts(x[2], x[1]), 0); s.op_answers = G.botAns; s.status = 'done'; s.result = s.my_score > s.op_score ? 'win' : s.my_score < s.op_score ? 'loss' : 'draw'; s.delta = null; s.questions = s.full.map(x => x); VY.addXP(s.result === 'win' ? 15 : 5); VY.save(); VY.sound('done'); }
    if(VY.current === 'duel') VY.rerender(); }, 1000);
}
const origAfter = gameAfter;
function afterAny(code){
  const G = D.g;
  if(code === 'BOT'){
    if(!G || !G.bot) return VY.go('duel');
    G.s.full = G.s.full || G.full;
    const s = G.s; if(s.status !== 'active') return;
    const left = s.started_at - Date.now();
    if(left > 0){ const cd = document.getElementById('d-cd'); poll(() => { const l = s.started_at - Date.now(); if(cd) cd.textContent = n(Math.max(1, Math.ceil(l/1000))); if(l <= 0){ VY.stopTimers(); VY.rerender(); } }, 200); return; }
    const i = s.answers.length; if(G.reveal && G.reveal.i === i) return;
    if(G.shownI !== i){ G.shownI = i; G.shownAt = Date.now(); }
    const bar = document.getElementById('d-timer');
    poll(() => { botTick(); const l = Q_MS - (Date.now() - G.shownAt); if(bar) bar.style.width = Math.max(0, l / Q_MS * 100) + '%'; if(l <= 0){ VY.stopTimers(); answer(i, -1); } }, 200);
    VY.duelKey = e => { const k = parseInt(e.key, 10); if(k >= 1 && k <= 4) answer(i, k - 1); };
    return;
  }
  origAfter(code);
}

V.duel = {title:'duelTitle', render(){
  VY.duelKey = null;
  const code = (VY.params || [])[0];
  if(code === 'BOT') return D.g && D.g.bot ? gameView('BOT') : lobbyView();
  return code ? gameView(code.toUpperCase()) : lobbyView();
}, after(){
  clearDT();
  const code = (VY.params || [])[0];
  if(code) return afterAny(code === 'BOT' ? 'BOT' : code.toUpperCase());
  if(can()){ const i = document.getElementById('d-q'); if(i) i.onkeydown = e => { if(e.key === 'Enter') ACT.duelSearch(); };
    if(!D.lobbyLoading && Date.now() - (D.lastLoad || 0) > 4000){ D.lobbyLoading = true; D.lastLoad = Date.now(); loadLobby().finally(() => { D.lobbyLoading = false; }); }
    poll(() => { if(!document.hidden) VY.api('/duel').then(L => { const ch = JSON.stringify([L.invites.map(x=>x.code), L.open.map(x=>x.code+x.status)]) !== JSON.stringify([(D.lobby||{invites:[]}).invites.map(x=>x.code), ((D.lobby||{open:[]}).open||[]).map(x=>x.code+x.status)]); D.lobby = L; if(ch && VY.current === 'duel' && !(VY.params||[])[0] && !document.activeElement.matches('input')) VY.rerender(); }).catch(() => {}); }, 8000); }
}};

/* ---------- username ---------- */
ACT.unameSet = () => {
  const u = (VY.account && VY.account.user) || {};
  VY.modal(`<div class="modal-head"><h2 style="margin:0">👤 ${t('unameTitle')}</h2><div class="spacer"></div><button class="icon-btn" data-act="closeModal">${icon('x')}</button></div>
    <p class="small muted">${t('unameRules')}</p>
    <div class="input-ic en" dir="ltr" style="position:relative"><span style="position:absolute;left:14px;top:50%;transform:translateY(-50%);color:var(--muted)">@</span><input class="input en" dir="ltr" id="un-in" style="padding-left:30px" maxlength="20" value="${esc(u.username || '')}" autocomplete="off" autocapitalize="off" spellcheck="false"></div>
    <div class="auth-err small mt8" id="un-err"></div>
    <div class="row mt16"><button class="btn btn-primary btn-block" data-act="unameSave">${icon('check')} ${t('save')}</button></div>`);
  const i = document.getElementById('un-in'); i.focus(); i.oninput = () => { i.value = i.value.toLowerCase().replace(/[^a-z0-9_]/g, ''); }; i.onkeydown = e => { if(e.key === 'Enter') ACT.unameSave(document.querySelector('[data-act=unameSave]')); };
};
ACT.unameSave = async el => {
  const v = document.getElementById('un-in').value.trim(), er = document.getElementById('un-err');
  if(v && !/^[a-z][a-z0-9_]{2,19}$/.test(v)){ er.textContent = t('err_bad_username'); return; }
  el.disabled = true;
  try{ const r = await VY.api('/me/username', {method:'PUT', body:{username: v}}); VY.setUser(r.user); if(D.lobby) D.lobby.username = r.user.username; VY.closeModal(); VY.toast('✓ ' + t('saved')); VY.rerender(); }
  catch(e){ el.disabled = false; er.textContent = VY.errMsg(e.code); }
};
// opened from a Telegram invitation (?duel=CODE)
VY.openPendingDuel = () => { if(VY.pendingDuel){ const c = VY.pendingDuel; VY.pendingDuel = null; location.hash = '#/duel/' + c; } };
})();
