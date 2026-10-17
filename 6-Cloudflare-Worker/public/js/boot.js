/* ===== VajeYar start-up (loaded last) ===== */
(function(){
  // learning insights (memory strength, at-risk words, pace, level) on top of the statistics page
  if(VY.V && VY.V.stats && VY.insightsCard){ const sr = VY.V.stats.render; VY.V.stats.render = function(){ const h = sr.apply(this, arguments); try{ return typeof h === 'string' ? VY.insightsCard() + h : h; }catch(e){ return h; } }; }
  // a duel invitation opened from Telegram (?duel=CODE) is shown as soon as the user is signed in
  const rs = VY.renderShell;
  VY.renderShell = (...a) => { const r = rs.apply(null, a); if(VY.pendingDuel && VY.isLoggedIn && VY.isLoggedIn() && VY.openPendingDuel) setTimeout(VY.openPendingDuel, 60); return r; };
  Promise.resolve((VY.boot || VY.renderShell)()).catch(e => { console.error(e); try{ VY.renderShell(); }catch(x){} }).then(() => {
    setTimeout(() => { if(VY.fetchReadings) VY.fetchReadings(); if(VY.flushFeedback) VY.flushFeedback(); }, 3500);
  });
  if('serviceWorker' in navigator && location.protocol.startsWith('http')) navigator.serviceWorker.register('sw.js').catch(() => {});
})();
