/* DanaFox · Telegram Mini App bridge
   Runs only inside Telegram: follows Telegram's light/dark theme, expands to full height,
   adds haptic feedback and a native Back button. Outside Telegram this file does nothing. */
(function () {
  var tg = window.Telegram && window.Telegram.WebApp;
  if (!tg || !tg.initData) return;
  document.documentElement.classList.add('in-telegram');
  // the SDK has already read its launch parameters from the URL hash — give the hash back to the app router
  if (/^#tgWebApp/.test(location.hash)) { try { history.replaceState(null, '', location.pathname + location.search); } catch (e) {} }
  try { tg.ready(); tg.expand(); } catch (e) {}
  try { if (tg.disableVerticalSwipes) tg.disableVerticalSwipes(); } catch (e) {}

  // "System" theme = Telegram's current colour scheme
  var mm = window.matchMedia ? window.matchMedia.bind(window) : null;
  window.matchMedia = function (q) {
    if (/prefers-color-scheme:\s*dark/.test(q)) {
      return { matches: tg.colorScheme === 'dark', media: q, addEventListener: function () {}, removeEventListener: function () {}, addListener: function () {}, removeListener: function () {} };
    }
    return mm ? mm(q) : { matches: false };
  };

  function isDark() { return document.documentElement.dataset.theme === 'dark'; }
  function paintChrome() {
    var c = isDark() ? '#13111C' : '#F8F6FF';
    try { tg.setHeaderColor(c); tg.setBackgroundColor(c); if (tg.setBottomBarColor) tg.setBottomBarColor(c); } catch (e) {}
  }

  window.addEventListener('DOMContentLoaded', function () {
    var VY = window.VY;
    if (!VY || !VY.S) return;
    // first launch inside Telegram: follow Telegram theme + user's Telegram language
    if (!localStorage.getItem('vy_tg_init')) {
      localStorage.setItem('vy_tg_init', '1');
      VY.S.settings.theme = 'system';
      var lc = (tg.initDataUnsafe && tg.initDataUnsafe.user && tg.initDataUnsafe.user.language_code) || '';
      if (lc && lc.indexOf('fa') !== 0 && !VY.S.onboarded) VY.S.settings.lang = 'en';
      VY.save();
      if (VY.renderShell) VY.renderShell();
    }
    paintChrome();
    new MutationObserver(paintChrome).observe(document.documentElement, { attributes: true, attributeFilter: ['data-theme'] });
    tg.onEvent('themeChanged', function () { if (VY.S.settings.theme === 'system' && VY.renderShell) VY.renderShell(); paintChrome(); });

    // haptics
    document.addEventListener('click', function (e) {
      var el = e.target.closest && e.target.closest('button, [data-act], a');
      if (!el || !tg.HapticFeedback) return;
      var act = (el.dataset && el.dataset.act) || '';
      if (/again|wrong|danger|delete|reset/i.test(act)) tg.HapticFeedback.impactOccurred('rigid');
      else if (/good|known|correct|finish|start/i.test(act)) tg.HapticFeedback.notificationOccurred('success');
      else tg.HapticFeedback.selectionChanged();
    }, true);

    // native back button: go back in the app's hash history
    function syncBack() {
      var name = location.hash.replace(/^#\/?/, '').split('/')[0];
      if (name && name !== 'home') tg.BackButton.show(); else tg.BackButton.hide();
    }
    tg.BackButton.onClick(function () { history.length > 1 ? history.back() : (location.hash = ''); });
    window.addEventListener('hashchange', syncBack); syncBack();
  });
})();
