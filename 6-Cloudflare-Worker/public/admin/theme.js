/* applies the saved / Telegram theme and language before the panel renders (no inline scripts: strict CSP) */
(function () {
  try {
    var t = localStorage.getItem('vy_admin_theme'), l = localStorage.getItem('vy_admin_lang') || 'fa';
    var d = t ? t === 'dark' : (window.matchMedia && matchMedia('(prefers-color-scheme: dark)').matches);
    if (!t && /tgWebAppThemeParams=[^&]*bg_color%22%3A%22%23([0-9a-f]{2})/i.test(location.hash)) d = parseInt(RegExp.$1, 16) < 128;
    document.documentElement.dataset.theme = d ? 'dark' : 'light';
    document.documentElement.lang = l; document.documentElement.dir = l === 'fa' ? 'rtl' : 'ltr';
  } catch (e) {}
})();
