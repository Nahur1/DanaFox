// Browser E2E for the Cloudflare build (run against `wrangler dev` + tgmock.py):
//   node tests/e2e.cjs http://127.0.0.1:8787 /data/vajeyar/tmp/shots
const { chromium } = require(process.env.PW || 'playwright');
const { execFileSync } = require('child_process');
const crypto = require('crypto'), path = require('path');
const BASE = process.argv[2] || 'http://127.0.0.1:8787', OUT = process.argv[3] || '/tmp/shots', CF = path.join(__dirname, '..');
const errors = []; let step = '';
const ok = (c, m) => { if (!c) throw new Error('FAIL: ' + m); console.log('  ✓ ' + m); };
const d1 = sql => JSON.parse(execFileSync('npx', ['wrangler', 'd1', 'execute', 'vajeyar-db', '--local', '--json', '--command', sql], { cwd: CF, encoding: 'utf8' }))[0].results;
const sleep = ms => new Promise(r => setTimeout(r, ms));
const api = async (p, body, tok) => { const r = await fetch(BASE + '/api' + p, { method: body ? 'POST' : 'GET', headers: { 'Content-Type': 'application/json', ...(tok ? { Authorization: 'Bearer ' + tok } : {}) }, body: body ? JSON.stringify(body) : undefined }); return [r.status, await r.json().catch(() => null)]; };
(async () => {
  const browser = await chromium.launch({ executablePath: process.env.CHROME || '/usr/local/bin/chromium', args: ['--no-sandbox'] });
  const mk = async (vp) => { const ctx = await browser.newContext({ viewport: vp || { width: 1366, height: 860 } }); const p = await ctx.newPage();
    p.on('pageerror', e => errors.push(step + ' pageerror: ' + e.message)); p.on('console', m => { if (m.type() === 'error' && !/favicon|ERR_|Failed to load resource/.test(m.text())) errors.push(step + ' console: ' + m.text()); }); return { ctx, p }; };
  const study = async (p, n) => { await p.goto(BASE + '/#/learn'); await p.click('[data-act="startLearn"] >> nth=0'); await p.waitForSelector('#flash');
    for (let i = 0; i < n; i++) { await p.click('#flash'); await p.waitForSelector('[data-act="rate"]'); await p.click('[data-act="rate"] >> nth=-1'); await p.waitForTimeout(300); } };
  const onboard = async p => { await p.waitForSelector('.onb-card', { timeout: 15000 }); for (let i = 0; i < 3; i++) { await p.click('[data-act="onbNext"]'); await p.waitForTimeout(200); } await p.waitForSelector('.topbar'); };
  const email = 'e2e' + Date.now() + '@test.dev';
  try {
    // ---------- 1. no-account mode ----------
    step = 'local'; const A = await mk(); const p = A.p;
    await p.goto(BASE + '/'); await p.waitForSelector('#au-form');
    ok(await p.isVisible('#au-guest'), 'login screen offers "use without an account"');
    await p.screenshot({ path: OUT + '/1-login-two-modes.png' });
    await p.click('#au-guest'); await onboard(p);
    await study(p, 4);
    const nLocal = await p.evaluate(() => Object.keys(VY.S.progress).length); ok(nLocal >= 4, 'studied ' + nLocal + ' words without an account');
    ok(await p.evaluate(() => !VY.isLoggedIn() && !document.getElementById('sync-ind')), 'no account, no sync indicator');
    await p.goto(BASE + '/#/settings'); await p.waitForSelector('.acc-card.local');
    await p.screenshot({ path: OUT + '/2-settings-local-mode.png' });
    await p.reload(); await p.waitForSelector('.topbar');
    ok(await p.evaluate(() => Object.keys(VY.S.progress).length) === nLocal, 'reload: local data kept on the device');
    // offline
    await sleep(800); await A.ctx.setOffline(true); await p.reload(); await p.waitForSelector('.topbar', { timeout: 15000 });
    ok(await p.evaluate(() => Object.keys(VY.S.progress).length) === nLocal, 'works offline (service worker) with local data');
    await A.ctx.setOffline(false);

    // ---------- 2. local → create account, keep the progress ----------
    step = 'register'; await p.goto(BASE + '/#/settings'); await p.waitForSelector('[data-act="accSignIn"]'); await p.click('[data-act="accSignIn"]');
    await p.waitForSelector('#au-form'); ok(await p.isVisible('#au-keep'), 'login form offers to keep this device\'s progress');
    await p.click('[data-mode="register"] >> nth=0'); await p.waitForSelector('#au-pass2');
    await p.fill('#au-login', email); await p.fill('#au-pass', 'secret12'); await p.fill('#au-pass2', 'secret12'); await p.click('#au-submit');
    await p.waitForSelector('#sync-ind', { timeout: 30000 });
    ok(await p.evaluate(() => VY.isLoggedIn() && Object.keys(VY.S.progress).length) === nLocal, 'account created, local progress kept');
    let [, login] = await api('/auth/login', { login: email, password: 'secret12' }); const tok = login.token, uid = login.user.id;
    let [, s] = await api('/sync', { since: 0, changes: {} }, tok);
    ok(Object.keys(s.changes.progress || {}).length === nLocal, 'local progress uploaded to the database (' + Object.keys(s.changes.progress || {}).length + ')');

    // ---------- 3. manual sync ----------
    step = 'manual'; await p.goto(BASE + '/#/settings'); await p.waitForSelector('.acc-card.full');
    await p.click('[data-act="accAuto"][data-v="0"]'); await p.waitForTimeout(200);
    ok(await p.evaluate(() => localStorage.getItem('vajeyar_autosync') === '0'), 'auto-sync switched off (manual mode)');
    await study(p, 2); await p.waitForTimeout(3500);
    ok(await p.evaluate(() => VY.account.status === 'pending' && VY.account.pend > 0), 'manual mode: changes wait, indicator shows pending');
    [, s] = await api('/sync', { since: 0, changes: {} }, tok);
    ok(Object.keys(s.changes.progress || {}).length === nLocal, 'nothing uploaded before pressing Sync');
    await p.goto(BASE + '/#/settings'); await p.waitForSelector('[data-act="accSync"]'); await p.screenshot({ path: OUT + '/3-settings-account-manual.png' });
    await p.click('[data-act="accSync"]'); await p.waitForTimeout(1500);
    [, s] = await api('/sync', { since: 0, changes: {} }, tok);
    ok(Object.keys(s.changes.progress || {}).length === nLocal + 2, 'Sync now uploads the changes');

    // ---------- 4. second device ----------
    step = 'B'; const B = await mk({ width: 390, height: 844 }); const q = B.p;
    await q.goto(BASE + '/'); await q.waitForSelector('#au-form'); ok(!(await q.isVisible('#au-keep')), 'fresh device: no "keep progress" box');
    await q.fill('#au-login', email.toUpperCase()); await q.fill('#au-pass', 'secret12'); await q.click('#au-submit');
    await q.waitForSelector('.topbar', { timeout: 15000 });
    ok(await q.evaluate(() => Object.keys(VY.S.progress).length) === nLocal + 2, 'device B restored everything from the account');
    await q.screenshot({ path: OUT + '/4-home-mobile.png' });

    if (process.env.LIVE) {   // live deployment: no access to the DB / bot → stop here and clean up
      await api('/me/delete', { password: 'secret12' }, tok);
      ok(errors.length === 0, 'no JavaScript errors' + (errors.length ? ': ' + errors.join(' | ') : ''));
      console.log('\nLIVE E2E OK'); await browser.close(); process.exit(0);
    }
    // ---------- 5. connect Telegram from the web ----------
    step = 'tg-link'; const FAKE = process.env.FAKE_TOKEN || '123456789:AAFakeTokenForLocalTestsOnly_abcdefghijk', ADMIN_ID = +(process.env.ADMIN_ID || 4242001);
    const secret = crypto.createHash('sha256').update('vajeyar-webhook:' + FAKE).digest('hex').slice(0, 48);
    const mkInit = u => { const f = { auth_date: String(Math.floor(Date.now() / 1000)), query_id: 'AAE' + Math.random(), user: JSON.stringify(u) };
      const dcs = Object.keys(f).sort().map(k => k + '=' + f[k]).join('\n');
      f.hash = crypto.createHmac('sha256', crypto.createHmac('sha256', 'WebAppData').update(FAKE).digest()).update(dcs).digest('hex');
      return new URLSearchParams(f).toString(); };
    const tgUrl = (path, init) => BASE + path + '#tgWebAppData=' + encodeURIComponent(init) + '&tgWebAppVersion=7.10&tgWebAppPlatform=android&tgWebAppThemeParams=' + encodeURIComponent('{"bg_color":"#ffffff"}');
    await p.goto(BASE + '/#/settings'); await p.reload(); await p.waitForSelector('[data-act="accTg"]', { timeout: 10000 });
    await p.click('[data-act="accTg"]'); await p.waitForSelector('#tg-open');
    const href = await p.getAttribute('#tg-open', 'href'); ok(/^https:\/\/t\.me\/vajeyar_test_bot\?start=link_[A-Z0-9]+$/.test(href), 'Connect Telegram opens the bot deep link');
    await p.screenshot({ path: OUT + '/5-connect-telegram.png' });
    const tgId = 6000000 + Math.floor(Math.random() * 99999), tu = { id: tgId, is_bot: false, first_name: 'Reza', username: 'reza_e2e', language_code: 'fa' };
    const hook = body => fetch(BASE + '/tg/webhook', { method: 'POST', headers: { 'Content-Type': 'application/json', 'X-Telegram-Bot-Api-Secret-Token': secret }, body: JSON.stringify({ update_id: Date.now() % 1e9, ...body }) });
    const tmsg = text => hook({ message: { message_id: 1, date: Math.floor(Date.now() / 1000), chat: { id: tgId, type: 'private' }, from: tu, text } });
    await tmsg('/start'); await sleep(1200);
    await tmsg('/start link_' + href.split('link_')[1]); await sleep(1500);
    await p.click('[data-act="accTgCheck"]').catch(() => {}); await p.waitForSelector('.acc-sub .chip.g', { timeout: 12000 });
    ok((await p.textContent('.acc-card')).includes('@reza_e2e'), 'settings shows the connected Telegram account');
    await p.screenshot({ path: OUT + '/6-telegram-connected.png' });

    // ---------- 6. Telegram Mini App = same account ----------
    step = 'miniapp';
    const f = { auth_date: String(Math.floor(Date.now() / 1000)), query_id: 'AAE', user: JSON.stringify({ id: tgId, first_name: 'Reza', username: 'reza_e2e', language_code: 'fa' }) };
    const dcs = Object.keys(f).sort().map(k => k + '=' + f[k]).join('\n');
    f.hash = crypto.createHmac('sha256', crypto.createHmac('sha256', 'WebAppData').update(FAKE).digest()).update(dcs).digest('hex');
    const initData = new URLSearchParams(f).toString();
    const M = await mk({ width: 400, height: 760 }); const m = M.p;
    await m.goto(BASE + '/?tg=1#tgWebAppData=' + encodeURIComponent(initData) + '&tgWebAppVersion=7.10&tgWebAppPlatform=android&tgWebAppThemeParams=%7B%7D');
    await m.waitForSelector('.topbar', { timeout: 15000 });
    ok(await m.evaluate(id => VY.isLoggedIn() && VY.account.user.id === id, uid), 'Mini App inside Telegram signs into the same account automatically');
    ok(await m.evaluate(() => Object.keys(VY.S.progress).length) === nLocal + 2, 'Mini App shows the same progress');
    await m.screenshot({ path: OUT + '/7-telegram-miniapp.png' });

    // ---------- 7. one-time sign-in link from the bot ----------
    step = 'code'; d1(`INSERT INTO auth_codes(code,kind,user_id,expires_at) VALUES('E2ELOGIN${tgId}','login',${uid},${Date.now() + 600000})`);
    const C = await mk(); const c = C.p;
    await c.goto(BASE + '/?login=E2ELOGIN' + tgId); await c.waitForSelector('.topbar', { timeout: 15000 });
    ok(await c.evaluate(id => VY.isLoggedIn() && VY.account.user.id === id && !location.search, uid), 'bot sign-in link (?login=CODE) signs in without a password');

    // ---------- 8. sign out ----------
    step = 'logout'; await q.goto(BASE + '/#/settings'); await q.waitForSelector('[data-act="accLogout"]');
    await q.click('[data-act="accLogout"]'); await q.click('[data-act="accLogoutYes"]'); await q.waitForSelector('#au-form');
    ok(await q.evaluate(() => Object.keys(VY.S.progress).length === 0 && !localStorage.getItem('vajeyar_token')), 'sign-out clears the device');

    // ---------- 9. method A: sign in with the site account inside the Mini App ----------
    step = 'methodA'; const email2 = 'e2eb' + Date.now() + '@test.dev';
    let [, reg2] = await api('/auth/register', { login: email2, password: 'secret34', name: 'Site Sara' });
    const tg2 = { id: 6100000 + Math.floor(Math.random() * 99999), first_name: 'Sara', username: 'sara_tg', language_code: 'fa' };
    const MA = await mk({ width: 400, height: 780 }); const ma = MA.p;
    await ma.goto(tgUrl('/?tg=1', mkInit(tg2)));
    await ma.waitForSelector('.onb-card, .topbar', { timeout: 15000 });
    if (await ma.isVisible('.onb-card')) await onboard(ma);
    await study(ma, 3);
    ok(await ma.evaluate(() => VY.isLoggedIn() && !VY.account.user.email), 'new Telegram user gets a Telegram-only account in the Mini App');
    await ma.goto(tgUrl('/?tg=1&action=link', mkInit(tg2))); await ma.waitForSelector('#sl-login', { timeout: 15000 });
    ok(true, 'bot button (?action=link) opens “sign in with site account” right away');
    await ma.screenshot({ path: OUT + '/8-miniapp-site-login.png' });
    await ma.fill('#sl-login', email2); await ma.fill('#sl-pass', 'wrong-pass'); await ma.click('#sl-go'); await ma.waitForSelector('#sl-err:not(.hidden)');
    ok(true, 'wrong password shows an error');
    await ma.fill('#sl-pass', 'secret34'); await ma.click('#sl-go');
    await ma.waitForFunction(id => window.VY && VY.account.user && VY.account.user.id === id, reg2.user.id, { timeout: 20000 });
    await ma.waitForTimeout(1500);
    ok(await ma.evaluate(() => Object.keys(VY.S.progress).length) >= 3, 'Mini App now uses the site account and keeps the Telegram progress');
    let [, s2] = await api('/sync', { since: 0, changes: {} }, reg2.token);
    ok(Object.keys(s2.changes.progress || {}).length >= 3, 'Telegram progress merged into the site account on the server');
    await ma.goto(BASE + '/#/settings'); await ma.waitForSelector('.acc-card.full'); await ma.screenshot({ path: OUT + '/9-miniapp-linked-settings.png' });

    // ---------- 10. admin panel ----------
    step = 'admin-denied'; const X = await mk({ width: 400, height: 780 });
    await X.p.goto(tgUrl('/admin/?tg=1', mkInit({ id: 4242999, first_name: 'Mallory', username: 'mal' }))); await X.p.waitForSelector('.login', { timeout: 15000 });
    ok((await X.p.textContent('.login')).match(/دسترسی ندارید|Access denied/), 'admin panel: other Telegram ids are denied');
    await X.p.screenshot({ path: OUT + '/10-admin-denied.png' });
    step = 'admin'; const AD = await mk({ width: 400, height: 820 }); const ad = AD.p;
    const admInit = mkInit({ id: ADMIN_ID, first_name: 'Mohammad', username: 'mf_admin', language_code: 'fa' });
    await ad.goto(tgUrl('/admin/?tg=1', admInit)); await ad.waitForSelector('.kpis', { timeout: 15000 });
    ok(true, 'admin opens the panel inside Telegram (auto sign-in)'); await ad.waitForTimeout(500);
    await ad.screenshot({ path: OUT + '/11-admin-mobile-dashboard.png', fullPage: true });
    for (const v of ['users', 'bc', 'words', 'bot', 'settings', 'security']) {
      await ad.click(`.tabs-m [data-nav="${v}"]`); await ad.waitForFunction(() => !document.querySelector('#page .skel'), null, { timeout: 15000 }); await ad.waitForTimeout(400);
      if (v === 'users') { await ad.click('#u-list .li >> nth=0'); await ad.waitForSelector('.drawer .stat-grid'); await ad.waitForTimeout(500); await ad.screenshot({ path: OUT + '/12-admin-mobile-user.png' }); await ad.click('.drawer [data-a="closeTop"]'); }
      if (v === 'bc') { await ad.fill('#bc-t', '<b>سلام!</b> لغات جدید آیلتس اضافه شد 🎉'); await ad.waitForTimeout(200); ok((await ad.innerHTML('#bc-pv')).includes('<b>سلام!</b>'), 'broadcast preview renders Telegram HTML'); }
      await ad.screenshot({ path: OUT + `/13-admin-mobile-${v}.png`, fullPage: true });
    }
    const DK = await mk({ width: 1440, height: 900 }); const dk = DK.p;
    await dk.goto(tgUrl('/admin/?tg=1', admInit)); await dk.waitForSelector('.kpis', { timeout: 15000 }); await dk.waitForTimeout(600);
    await dk.screenshot({ path: OUT + '/14-admin-desktop-dashboard.png', fullPage: true });
    await dk.click('.side [data-nav="users"]'); await dk.waitForSelector('#u-list .li'); await dk.click('#u-list .li >> nth=0'); await dk.waitForSelector('.drawer .stat-grid'); await dk.waitForTimeout(500);
    await dk.screenshot({ path: OUT + '/15-admin-desktop-user.png' }); await dk.click('.drawer [data-a="closeTop"]');
    await dk.click('.side [data-nav="bc"]'); await dk.waitForSelector('#bc-t'); await dk.fill('#bc-t', '<b>New words!</b> 50 new IELTS words were added.'); await dk.screenshot({ path: OUT + '/16-admin-desktop-broadcast.png', fullPage: true });
    await dk.click('[data-a="lang"]'); await dk.waitForTimeout(300); await dk.click('[data-a="theme"]'); await dk.click('.side [data-nav="dash"]'); await dk.waitForSelector('.kpis'); await dk.waitForTimeout(500);
    await dk.screenshot({ path: OUT + '/17-admin-desktop-dark-en.png', fullPage: true });
    ok((await dk.textContent('.side')).includes('Dashboard'), 'English + dark theme work');
    await api('/me/delete', { password: 'secret34' }, reg2.token);
    await api('/me/delete', { password: 'secret12' }, tok);
    ok(errors.length === 0, 'no JavaScript errors' + (errors.length ? ': ' + errors.join(' | ') : ''));
    console.log('\nE2E OK');
  } catch (e) { console.log(e.message); try { let i = 0; for (const pg of browser.contexts().flatMap(c => c.pages())) { await pg.screenshot({ path: OUT + '/fail-' + (i++) + '.png' }); console.log('page:', pg.url(), await pg.evaluate(() => [...document.querySelectorAll('.auth-err:not(.hidden),.toast')].map(x => x.textContent).join(' | '))); } } catch (_) {} console.log(errors.join('\n')); await browser.close(); process.exit(1); }
  await browser.close(); process.exit(0);
})();
