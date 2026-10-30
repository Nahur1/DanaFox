/* ===== DanaFox community: leaderboards + feedback (works offline: messages wait in a queue) ===== */
(function(){
const {t, n, esc} = VY; const ACT = VY.ACT, V = VY.V;
const FQ = 'vajeyar_fb_queue';
VY.platform = () => { const ua = navigator.userAgent || ''; if(window.Telegram && Telegram.WebApp && Telegram.WebApp.initData) return 'telegram'; if(window.Capacitor && Capacitor.getPlatform && Capacitor.getPlatform() === 'ios' || /DanaFoxiOS/.test(ua)) return 'ios'; if(window.Capacitor || /VajeYarAndroid|; wv\)/.test(ua)) return 'android'; if(/Electron/i.test(ua)) return 'desktop'; if(matchMedia('(display-mode: standalone)').matches) return 'pwa'; return 'web'; };

/* ---------- leaderboard ---------- */
const LB = {board:'week', data:{}, err:null};
const medal = r => r === 1 ? '🥇' : r === 2 ? '🥈' : r === 3 ? '🥉' : n(r);
function lbRow(x, board){ return `<div class="li lb-li ${x.me ? 'me' : ''}"><span class="lb-r">${medal(x.rank)}</span><span class="d-av">${esc(String(x.name || '?').replace('@', '').charAt(0).toUpperCase())}</span><div style="flex:1;min-width:0"><b>${esc(x.name || '—')}${x.me ? ` <span class="chip purple tiny">${t('you')}</span>` : ''}</b>${x.username ? `<div class="small muted en" dir="ltr">@${esc(x.username)}</div>` : ''}</div>
  <b class="lb-s">${board === 'duel' ? '★ ' : ''}${n(x.score)}${board !== 'duel' ? ' <small class="muted">' + t('xp') + '</small>' : ''}</b>${board === 'duel' ? `<span class="small muted">${n(x.wins||0)}-${n(x.losses||0)}-${n(x.draws||0)}</span>` : ''}</div>`; }
V.leaderboard = {title:'leaderboard', render(){
  const b = LB.board, d = LB.data[b];
  const tabs = `<div class="seg">${[['week', t('lbWeek')], ['xp', t('lbAll')], ['duel', t('lbDuel')]].map(([k, l]) => `<button class="${k === b ? 'on' : ''}" data-act="lbTab" data-v="${k}">${l}</button>`).join('')}</div>`;
  let body;
  if(!(VY.isServer && VY.isServer())) body = `<div class="empty"><div class="em">📡</div><p>${t('lbOffline')}</p></div>`;
  else if(!d) body = LB.err ? `<div class="empty"><div class="em">📡</div><p>${VY.errMsg(LB.err)}</p><button class="btn btn-ghost" data-act="lbTab" data-v="${b}">${t('retry')}</button></div>` : `<div class="empty"><div class="spinner"></div></div>`;
  else body = d.items.length ? `<div class="list">${d.items.map(x => lbRow(x, b)).join('')}</div>${d.mine ? `<div class="lb-mine">${lbRow(d.mine, b)}</div>` : ''}` : `<div class="empty"><div class="em">🏁</div><p>${t('lbEmpty')}</p></div>`;
  return `<div class="card"><div class="row between wrap"><h3>🏅 ${t('leaderboard')}</h3>${tabs}</div><p class="small muted">${t('lbS_' + b)}</p>${body}
    ${VY.isLoggedIn && VY.isLoggedIn() && !(VY.account.user || {}).username ? `<div class="tip mt12">👤 ${t('unameWhy')} <button class="btn btn-soft btn-sm" data-act="unameSet">${t('unameSetBtn')}</button></div>` : ''}</div>
    <div class="row wrap mt16"><button class="btn btn-yellow" data-act="go" data-to="duel">${icon('zap')} ${t('duelTitle')}</button></div>`;
}, after(){ load(LB.board); }};
async function load(b){
  if(!(VY.isServer && VY.isServer())) return;
  if(LB.data[b] && Date.now() - LB.data[b].at < 60000) return;
  try{ const j = await VY.api('/leaderboard?board=' + b); j.at = Date.now(); LB.data[b] = j; LB.err = null; }catch(e){ LB.err = e.code || 'network'; }
  if(VY.current === 'leaderboard' && LB.board === b) VY.rerender();
}
ACT.lbTab = el => { LB.board = el.dataset.v; LB.err = null; if(LB.data[LB.board]) LB.data[LB.board].at = LB.data[LB.board].at || 0; VY.rerender(); };

/* ---------- feedback ---------- */
const KINDS = [['idea', '💡'], ['bug', '🐞'], ['content', '📚'], ['praise', '❤️'], ['other', '💬']];
let fbKind = 'idea';
const queue = () => { try{ return JSON.parse(localStorage.getItem(FQ)) || []; }catch(e){ return []; } };
const setQueue = q => { try{ localStorage.setItem(FQ, JSON.stringify(q.slice(-20))); }catch(e){} };
VY.flushFeedback = async () => {
  const q = queue(); if(!q.length || !(VY.isServer && VY.isServer()) || navigator.onLine === false) return;
  const left = [];
  for(const m of q){ try{ await VY.api('/feedback', {method:'POST', body:m}); }catch(e){ if(e.code === 'network' || e.status >= 500) left.push(m); } }
  setQueue(left); if(q.length > left.length) VY.toast('✓ ' + t('fbSentQueued'));
};
window.addEventListener('online', () => setTimeout(VY.flushFeedback, 1500));
VY.feedback = (kind, ref) => {
  if(kind) fbKind = kind;
  const logged = VY.isLoggedIn && VY.isLoggedIn();
  VY.modal(`<div class="modal-head"><div><h2 style="margin:0">💬 ${t('feedback')}</h2><div class="muted small">${t('feedbackS')}</div></div><div class="spacer"></div><button class="icon-btn" data-act="closeModal">${icon('x')}</button></div>
    <div class="row wrap" id="fb-kinds">${KINDS.map(([k, e]) => `<button class="chip-btn ${k === fbKind ? 'on' : ''}" data-act="fbKind" data-v="${k}">${e} ${t('fb_' + k)}</button>`).join('')}</div>
    <textarea class="input mt12" id="fb-text" rows="5" maxlength="3000" placeholder="${esc(t('fbPh_' + fbKind))}"></textarea>
    ${logged ? '' : `<input class="input mt8" id="fb-contact" maxlength="120" placeholder="${esc(t('fbContact'))}">`}
    <input type="hidden" id="fb-ref" value="${esc(ref || location.hash || '')}">
    <div class="row wrap mt16"><button class="btn btn-primary" data-act="fbSend">${icon('send')} ${t('send')}</button>${logged ? `<button class="btn btn-ghost" data-act="fbMine">${icon('clock')} ${t('fbMine')}</button>` : ''}</div>
    <div id="fb-list" class="mt16"></div>`);
  setTimeout(() => { const x = document.getElementById('fb-text'); if(x) x.focus(); }, 50);
};
ACT.feedback = el => VY.feedback(el && el.dataset && el.dataset.kind, el && el.dataset && el.dataset.ref);
ACT.fbKind = el => { fbKind = el.dataset.v; document.querySelectorAll('#fb-kinds .chip-btn').forEach(b => b.classList.toggle('on', b.dataset.v === fbKind)); const x = document.getElementById('fb-text'); if(x) x.placeholder = t('fbPh_' + fbKind); };
ACT.fbSend = async el => {
  const text = document.getElementById('fb-text').value.trim(); if(text.length < 3){ document.getElementById('fb-text').focus(); return; }
  const c = document.getElementById('fb-contact'), m = {kind: fbKind, text, contact: c ? c.value.trim() : '', ref: document.getElementById('fb-ref').value, platform: VY.platform() + ' · ' + (VY.account && VY.account.cfg && VY.account.cfg.version || '') + ' · ' + innerWidth + 'px'};
  el.disabled = true;
  if(!(VY.isServer && VY.isServer()) || navigator.onLine === false){ setQueue(queue().concat([m])); VY.closeModal(); VY.toast(t('fbQueued')); return; }
  try{ await VY.api('/feedback', {method:'POST', body:m}); VY.closeModal(); VY.toast('✓ ' + t('fbThanks')); }
  catch(e){ if(e.code === 'network'){ setQueue(queue().concat([m])); VY.closeModal(); VY.toast(t('fbQueued')); } else { el.disabled = false; VY.toast(VY.errMsg(e.code)); } }
};
ACT.fbMine = async () => {
  const box = document.getElementById('fb-list'); box.innerHTML = '<div class="spinner"></div>';
  try{ const j = await VY.api('/feedback');
    box.innerHTML = j.items.length ? `<div class="list">${j.items.map(x => `<div class="fb-item"><div class="row between"><span class="chip">${(KINDS.find(k => k[0] === x.kind) || ['', '💬'])[1]} ${t('fb_' + x.kind)}</span><span class="chip ${x.status === 'done' ? 'green' : x.status === 'planned' ? 'purple' : x.status === 'rejected' ? 'red' : ''}">${t('fbst_' + x.status)}</span></div><div class="mt8" style="white-space:pre-line">${esc(x.text)}</div>${x.reply ? `<div class="fb-reply mt8">↳ <b>${t('fbReply')}:</b> ${esc(x.reply)}</div>` : ''}<div class="tiny muted mt8">${new Date(x.created_at).toLocaleString(VY.lang() === 'fa' ? 'fa-IR' : 'en-GB')}</div></div>`).join('')}</div>` : `<p class="muted small">${t('fbNone')}</p>`;
  }catch(e){ box.innerHTML = `<p class="muted small">${VY.errMsg(e.code)}</p>`; }
};
})();
