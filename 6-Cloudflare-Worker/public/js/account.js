/* ===== DanaFox account: login / register, word bank from the server and two-way progress sync ===== */
(function(){
const TKEY = 'vajeyar_token', SKEY = 'vajeyar_sync_v1', WKEY = 'vajeyar_words_v1', GKEY = 'vajeyar_guest',
      AKEY = 'vajeyar_autosync', CKEY = 'vajeyar_cfg', UKEY = 'vajeyar_user';
const {esc} = VY;
const ACT = VY.ACT, V = VY.V;

/* ---------- texts ---------- */
const TX = {
 fa:{ login:'ورود', register:'ثبت‌نام', welcomeBack:'خوش برگشتی 👋', createAcc:'ساخت حساب جدید ✨',
  loginSub:'برای ادامه وارد حساب خود شوید تا پیشرفتتان روی همهٔ دستگاه‌ها همراهتان باشد.',
  registerSub:'فقط یک ایمیل یا شمارهٔ موبایل و یک رمز عبور — همین!',
  id:'ایمیل یا شمارهٔ موبایل', idPh:'example@mail.com یا ۰۹۱۲…', pass:'رمز عبور', pass2:'تکرار رمز عبور', name:'نام (اختیاری)', namePh:'مثلاً محمد',
  doLogin:'ورود به حساب', doRegister:'ساخت حساب', noAcc:'حساب ندارید؟', haveAcc:'قبلاً ثبت‌نام کرده‌اید؟', guest:'ادامه بدون حساب (فقط همین دستگاه)',
  heroT:'لغت یاد بگیر،<br>هیچ‌وقت فراموش نکن.', heroS:'مربی هوشمند لغات انگلیسی برای آیلتس، تافل و زبان عمومی',
  f1:'پیشرفتت همیشه ذخیره می‌ماند', f2:'همگام‌سازی بین گوشی و کامپیوتر', f3:'تکرار فاصله‌دار هوشمند',
  passHint:'حداقل ۶ کاراکتر', show:'نمایش', hide:'پنهان', syncing:'در حال همگام‌سازی…', loading:'در حال بارگذاری…',
  account:'حساب کاربری', synced:'همگام شد', syncedAgo:'آخرین همگام‌سازی', never:'هنوز همگام نشده', syncNow:'همگام‌سازی', logout:'خروج از حساب',
  offline:'آفلاین — بعداً همگام می‌شود', syncErr:'خطا در همگام‌سازی', changePass:'تغییر رمز', curPass:'رمز فعلی', newPass:'رمز جدید', save:'ذخیره', cancel:'انصراف',
  saved:'ذخیره شد ✓', logoutQ:'از حساب خارج می‌شوید؟ اطلاعات شما روی سرور محفوظ است.', signInSync:'برای ذخیرهٔ پیشرفت روی سرور وارد شوید', signIn:'ورود / ثبت‌نام',
  justNow:'همین الان', minAgo:'{n} دقیقه پیش', hourAgo:'{n} ساعت پیش', learned:'یادگرفته', reviews:'مرور', member:'عضو از',
  err_bad_email:'ایمیل معتبر نیست.', err_bad_login:'یک ایمیل یا شمارهٔ موبایل معتبر وارد کنید.', err_weak_password:'رمز عبور باید حداقل ۶ کاراکتر باشد.',
  err_already_registered:'با این ایمیل/شماره قبلاً ثبت‌نام شده است. وارد شوید.', err_wrong_credentials:'ایمیل/شماره یا رمز عبور اشتباه است.',
  err_too_many_attempts:'تلاش‌های زیادی انجام شد. چند دقیقهٔ دیگر امتحان کنید.', err_registration_closed:'ثبت‌نام فعلاً بسته است.',
  err_mismatch:'تکرار رمز عبور یکسان نیست.', err_bad_code:'لینک ورود نامعتبر است یا منقضی شده. از ربات یک لینک تازه بگیرید.', err_telegram_not_configured:'ربات تلگرام هنوز توسط مدیر تنظیم نشده است.',
  err_login_required:'ابتدا یک ایمیل یا شمارهٔ موبایل و رمز به حساب اضافه کنید.', err_bad_telegram_data:'ورود با تلگرام انجام نشد.', err_long_password:'رمز عبور خیلی طولانی است.',
  or:'یا', localTitle:'استفاده بدون حساب', localSub:'همه‌چیز فقط روی همین دستگاه ذخیره می‌شود؛ بدون اینترنت هم کار می‌کند. هر وقت خواستید حساب بسازید.',
  keepLocal:'پیشرفت فعلی این دستگاه به حساب اضافه شود', localMode:'حالت بدون حساب (فقط همین دستگاه)',
  localCardSub:'پیشرفت شما فقط روی همین دستگاه ذخیره است. با ورود یا ساخت حساب از آن نسخهٔ پشتیبان بگیرید و در وب، برنامهٔ کامپیوتر و ربات تلگرام داشته باشید.',
  updWords:'به‌روزرسانی لغات', wordsUpdated:'فهرست لغات به‌روز شد ✓', wordsSame:'فهرست لغات از قبل به‌روز است ✓',
  autoSync:'همگام‌سازی', autoOn:'خودکار', autoOff:'دستی', autoSyncS:'در حالت دستی فقط وقتی دکمهٔ «همگام‌سازی» را بزنید اطلاعات ارسال و دریافت می‌شود.',
  pending:'{n} تغییر همگام‌نشده', upToDate:'همه‌چیز همگام است',
  tgTitle:'ربات تلگرام', tgLinked:'متصل به تلگرام', tgConnect:'اتصال به تلگرام', tgConnectS:'ربات و اپ تلگرام هم از همین حساب استفاده کنند', tgUnlink:'قطع اتصال',
  tgOpen:'باز کردن تلگرام', tgSteps:'۱. روی «باز کردن تلگرام» بزنید.<br>۲. در ربات دکمهٔ <b>Start</b> را بزنید.<br>۳. اطلاعات ربات و این حساب یکی می‌شوند.', tgWaiting:'منتظر تأیید در تلگرام…', tgDone:'تلگرام وصل شد ✓',
  tgUnlinkQ:'اتصال ربات تلگرام از این حساب قطع شود؟ ربات از این به بعد یک حساب جداگانه خواهد داشت.', check:'بررسی', close:'بستن', unlink:'قطع اتصال',
  addLogin:'افزودن ایمیل/موبایل و رمز', addLoginS:'تا بتوانید با همین حساب در مرورگر و برنامهٔ کامپیوتر هم وارد شوید.', tgOnly:'حساب تلگرامی', logoutQtg:'از حساب خارج می‌شوید؟ اطلاعات شما در ربات تلگرام محفوظ است و با لینک ورود ربات دوباره وارد می‌شوید.', err_network:'اتصال به سرور برقرار نشد. اینترنت را بررسی کنید.', err_server_error:'خطای سرور. دوباره تلاش کنید.', err_required:'این فیلد را پر کنید.' },
 en:{ login:'Sign in', register:'Sign up', welcomeBack:'Welcome back 👋', createAcc:'Create your account ✨',
  loginSub:'Sign in to keep your progress with you on every device.',
  registerSub:'Just an email or a mobile number and a password — that’s it!',
  id:'Email or mobile number', idPh:'example@mail.com or +98912…', pass:'Password', pass2:'Repeat password', name:'Name (optional)', namePh:'e.g. Sara',
  doLogin:'Sign in', doRegister:'Create account', noAcc:'No account yet?', haveAcc:'Already have an account?', guest:'Continue without an account (this device only)',
  heroT:'Learn words.<br>Never forget them.', heroS:'Smart English vocabulary coach for IELTS, TOEFL and everyday English',
  f1:'Your progress is always saved', f2:'Sync between phone and computer', f3:'Smart spaced repetition',
  passHint:'At least 6 characters', show:'Show', hide:'Hide', syncing:'Syncing…', loading:'Loading…',
  account:'Account', synced:'Synced', syncedAgo:'Last sync', never:'Not synced yet', syncNow:'Sync now', logout:'Sign out',
  offline:'Offline — will sync later', syncErr:'Sync failed', changePass:'Change password', curPass:'Current password', newPass:'New password', save:'Save', cancel:'Cancel',
  saved:'Saved ✓', logoutQ:'Sign out? Your data stays safe on the server.', signInSync:'Sign in to save your progress on the server', signIn:'Sign in / Sign up',
  justNow:'just now', minAgo:'{n} min ago', hourAgo:'{n} h ago', learned:'learned', reviews:'reviews', member:'Member since',
  err_bad_email:'That email doesn’t look valid.', err_bad_login:'Enter a valid email or mobile number.', err_weak_password:'Password must be at least 6 characters.',
  err_already_registered:'This email / number is already registered. Please sign in.', err_wrong_credentials:'Wrong email / number or password.',
  err_too_many_attempts:'Too many attempts. Please try again in a few minutes.', err_registration_closed:'Registration is closed.',
  err_mismatch:'Passwords don’t match.', err_bad_code:'This sign-in link is invalid or expired. Get a fresh one from the bot.', err_telegram_not_configured:'The Telegram bot isn’t set up yet.',
  err_login_required:'Add an email or mobile number and a password first.', err_bad_telegram_data:'Telegram sign-in failed.', err_long_password:'Password is too long.',
  or:'or', localTitle:'Use without an account', localSub:'Everything is saved on this device only and works offline. Create an account whenever you like.',
  keepLocal:'Add this device’s current progress to the account', localMode:'No-account mode (this device only)',
  localCardSub:'Your progress is saved on this device only. Sign in or create an account to back it up and use it on the web, the desktop app and the Telegram bot.',
  updWords:'Update word list', wordsUpdated:'Word list updated ✓', wordsSame:'Word list is already up to date ✓',
  autoSync:'Sync', autoOn:'Automatic', autoOff:'Manual', autoSyncS:'In manual mode data is only sent and received when you press “Sync now”.',
  pending:'{n} unsynced changes', upToDate:'Everything is synced',
  tgTitle:'Telegram bot', tgLinked:'Connected to Telegram', tgConnect:'Connect Telegram', tgConnectS:'Let the bot and the Telegram app use this same account', tgUnlink:'Disconnect',
  tgOpen:'Open Telegram', tgSteps:'1. Tap “Open Telegram”.<br>2. Press <b>Start</b> in the bot.<br>3. The bot data and this account become one.', tgWaiting:'Waiting for confirmation in Telegram…', tgDone:'Telegram connected ✓',
  tgUnlinkQ:'Disconnect the Telegram bot from this account? The bot will use a separate account from now on.', check:'Check', close:'Close', unlink:'Disconnect',
  addLogin:'Add email/mobile & password', addLoginS:'So you can sign in to this same account in a browser and the desktop app.', tgOnly:'Telegram account', logoutQtg:'Sign out? Your data stays safe in the Telegram bot; use the bot’s sign-in link to come back.', err_network:'Can’t reach the server. Check your connection.', err_server_error:'Server error. Please try again.', err_required:'Please fill in this field.' }
};
Object.assign(TX.fa, { siteLogin:'ورود با حساب سایت', siteLoginS:'قبلاً در سایت یا برنامهٔ کامپیوتر حساب ساخته‌اید؟ همین‌جا وارد شوید تا این تلگرام به همان حساب وصل شود.',
  siteLoginInfo:'پیشرفت فعلی شما در ربات و اپ تلگرام به حساب سایت اضافه می‌شود و از این به بعد ربات، اپ تلگرام، سایت و برنامهٔ کامپیوتر همه یک حساب‌اند.',
  siteLoginDo:'ورود و اتصال', siteLinked:'تلگرام به حساب سایت وصل شد ✓', alreadyLinked:'این تلگرام از قبل به حساب سایت وصل است ✓',
  err_already_linked:'این حساب سایت قبلاً به یک تلگرام دیگر وصل شده است. اول در سایت (تنظیمات ← قطع اتصال) اتصال قبلی را قطع کنید.',
  err_telegram_linked_other:'این تلگرام قبلاً به یک حساب سایت دیگر وصل شده است.', err_account_blocked:'این حساب توسط مدیر غیرفعال شده است.',
  err_maintenance:'سرور در حال به‌روزرسانی است؛ کمی بعد دوباره امتحان کنید.', maintT:'در حال به‌روزرسانی' });
Object.assign(TX.en, { siteLogin:'Sign in with site account', siteLoginS:'Already have an account on the website or the desktop app? Sign in here to connect this Telegram to it.',
  siteLoginInfo:'Your current bot / Telegram app progress is added to the site account. From then on the bot, the Telegram app, the website and the desktop app all share one account.',
  siteLoginDo:'Sign in & connect', siteLinked:'Telegram connected to your site account ✓', alreadyLinked:'This Telegram is already connected to a site account ✓',
  err_already_linked:'This site account is already connected to another Telegram account. Disconnect it first on the website (Settings → Disconnect).',
  err_telegram_linked_other:'This Telegram is already connected to another site account.', err_account_blocked:'This account has been disabled by the admin.',
  err_maintenance:'The server is being updated; please try again in a little while.', maintT:'Maintenance' });
const T = (k, v) => { let s = (TX[VY.lang()] || TX.en)[k] || TX.en[k] || k; if(v) for(const x in v) s = s.replace('{'+x+'}', v[x]); return s; };
VY.tA = T;

/* ---------- state ---------- */
const loadJ = (k, d) => { try{ return JSON.parse(localStorage.getItem(k)) || d; }catch(e){ return d; } };
const A = VY.account = {
  base: null, cfg: null, token: localStorage.getItem(TKEY), user: null,
  meta: loadJ(SKEY, {uid:null, rev:0, shadow:{}, last:0}),
  status: 'idle', busy: false, again: false, timer: null, gen: 0, pend: 0, online: false,
  auto: localStorage.getItem(AKEY) !== '0'
};
const saveMeta = () => { try{ localStorage.setItem(SKEY, JSON.stringify(A.meta)); }catch(e){} };
VY.isServer = () => !!A.cfg;
VY.isLoggedIn = () => !!(A.cfg && A.token && A.user);

function resolveBase(){
  const s = window.VY_SERVER;
  if(s === null) return null;
  if(s) return String(s).replace(/\/+$/, '');
  return /^https?:$/.test(location.protocol) ? '' : null;
}

async function api(path, {method='GET', body, timeout=12000, keepalive=false, headers={}} = {}){
  const ctrl = new AbortController(); const tm = setTimeout(() => ctrl.abort(), timeout);
  const h = Object.assign({'Accept':'application/json'}, headers);
  if(body !== undefined) h['Content-Type'] = 'application/json';
  if(A.token) h['Authorization'] = 'Bearer ' + A.token;
  let r;
  try{ r = await fetch(A.base + '/api' + path, {method, headers:h, body: body!==undefined ? JSON.stringify(body) : undefined, signal: ctrl.signal, keepalive, cache:'no-store'}); }
  catch(e){ clearTimeout(tm); const err = new Error('network'); err.code = 'network'; err.status = 0; throw err; }
  clearTimeout(tm);
  if(r.status === 304) return {__notModified:true};
  let j = null; try{ j = await r.json(); }catch(e){}
  if(!r.ok || !j){ const err = new Error((j && j.error) || 'server_error'); err.code = (j && j.error) || (r.status === 404 ? 'network' : 'server_error'); err.status = r.status; throw err; }
  j.__etag = r.headers.get('ETag');
  return j;
}
VY.api = api;

/* ---------- word bank from server ---------- */
function useWords(cache){
  if(!cache || !Array.isArray(cache.words) || !cache.words.length) return false;
  VY.serverWords = cache.words; VY.buildWords(); return true;
}
async function fetchWords(){
  const cache = loadJ(WKEY, null);
  try{
    const j = await api('/words', {headers: cache && cache.etag ? {'If-None-Match': cache.etag} : {}, timeout: 15000});
    A.wordsErr = false; A.online = true;
    if(j.__notModified) return false;
    const c = {etag: j.__etag, version: j.version, words: j.words};
    try{ localStorage.setItem(WKEY, JSON.stringify(c)); }catch(e){}
    useWords(c); return true;
  }catch(e){ A.wordsErr = true; return false; }
}

/* ---------- serialisation of the local state ---------- */
const prof = S => ({settings:S.settings, onboarded:!!S.onboarded, xp:S.xp, streak:S.streak, games:S.games, notified:S.notified||null});
function snapshot(){
  const S = VY.S, m = {};
  m.profile = JSON.stringify(prof(S));
  for(const id in S.progress) m['p:'+id] = JSON.stringify(S.progress[id]);
  for(const d in S.days) m['d:'+d] = JSON.stringify(S.days[d]);
  (S.custom||[]).forEach(c => m['c:'+c.id] = JSON.stringify(c));
  for(const a in S.ach) m['a:'+a] = String(S.ach[a]);
  (S.quizzes||[]).forEach(q => { if(q && q.d) m['q:'+q.d] = JSON.stringify(q); });
  for(const k in (S.kv||{})) if(S.kv[k] != null) m['k:'+k] = JSON.stringify(S.kv[k]);
  return m;
}
function buildChanges(snap, shadow){
  const now = Date.now(), ch = {progress:{}, days:{}, custom:{}, ach:{}, quizzes:[], kv:{}}; let n = 0;
  for(const k in snap){
    if(snap[k] === shadow[k]) continue;
    const v = snap[k], kind = k.slice(0, 2), id = k.slice(2); n++;
    if(k === 'profile') ch.profile = {u: now, data: JSON.parse(v)};
    else if(kind === 'p:') ch.progress[id] = {u: now, data: JSON.parse(v)};
    else if(kind === 'd:') ch.days[id] = JSON.parse(v);
    else if(kind === 'c:') ch.custom[id] = {u: now, data: JSON.parse(v)};
    else if(kind === 'a:') ch.ach[id] = +v;
    else if(kind === 'q:') ch.quizzes.push(JSON.parse(v));
    else if(kind === 'k:') ch.kv[id] = {u: now, data: JSON.parse(v)};
  }
  for(const k in shadow){
    if(k in snap) continue;
    const kind = k.slice(0, 2), id = k.slice(2);
    if(kind === 'p:'){ ch.progress[id] = {u: now, data: null}; n++; }
    else if(kind === 'c:'){ ch.custom[id] = {u: now, data: null}; n++; }
    else if(kind === 'k:'){ ch.kv[id] = {u: now, data: null}; n++; }
  }
  return n ? ch : null;
}
function curVal(k){
  const S = VY.S, kind = k.slice(0, 2), id = k.slice(2);
  if(k === 'profile') return JSON.stringify(prof(S));
  if(kind === 'p:') return S.progress[id] ? JSON.stringify(S.progress[id]) : undefined;
  if(kind === 'd:') return S.days[id] ? JSON.stringify(S.days[id]) : undefined;
  if(kind === 'c:'){ const c = (S.custom||[]).find(x => x.id === id); return c ? JSON.stringify(c) : undefined; }
  if(kind === 'a:') return S.ach[id] != null ? String(S.ach[id]) : undefined;
  if(kind === 'k:') return S.kv && S.kv[id] != null ? JSON.stringify(S.kv[id]) : undefined;
  return undefined;
}
function applyIncoming(ch, sent){
  const S = VY.S, sh = A.meta.shadow; let words = false, any = false, shell = false;
  const clean = k => curVal(k) === (k in sent ? sent[k] : sh[k]);   // not modified locally while we were syncing
  if(ch.profile && clean('profile')){
    const d = ch.profile.data, wasOnb = S.onboarded, lang = S.settings.lang, theme = S.settings.theme;
    S.settings = Object.assign(S.settings, d.settings || {}); S.onboarded = !!d.onboarded; S.xp = d.xp || 0;
    S.streak = Object.assign({count:0, best:0, last:null, freezes:0}, d.streak || {});
    S.games = Object.assign({matchBest:null, speedBest:0}, d.games || {}); S.notified = d.notified || null;
    sh.profile = curVal('profile'); any = true; A.gotProfile = true;
    if(wasOnb !== S.onboarded || lang !== S.settings.lang || theme !== S.settings.theme) shell = true;
  }
  for(const id in (ch.progress||{})){
    const k = 'p:'+id; if(!clean(k)) continue;
    const d = ch.progress[id];
    if(d) S.progress[id] = d; else delete S.progress[id];
    if(d) sh[k] = JSON.stringify(d); else delete sh[k]; any = true;
  }
  for(const day in (ch.days||{})){ const k = 'd:'+day; if(!clean(k)) continue; S.days[day] = ch.days[day]; sh[k] = JSON.stringify(ch.days[day]); any = true; }
  for(const id in (ch.custom||{})){
    const k = 'c:'+id; if(!clean(k)) continue;
    const d = ch.custom[id]; S.custom = (S.custom||[]).filter(c => c.id !== id);
    if(d){ S.custom.push(d); sh[k] = JSON.stringify(d); } else delete sh[k];
    words = any = true;
  }
  for(const id in (ch.kv||{})){
    const k = 'k:'+id; if(!clean(k)) continue;
    const d = ch.kv[id]; S.kv = S.kv || {};
    if(d != null){ S.kv[id] = d; sh[k] = JSON.stringify(d); } else { delete S.kv[id]; delete sh[k]; }
    any = true;
  }
  for(const a in (ch.ach||{})){ if(S.ach[a] == null){ S.ach[a] = ch.ach[a]; any = true; } sh['a:'+a] = String(S.ach[a]); }
  (ch.quizzes||[]).forEach(q => { if(!S.quizzes.some(x => x.d === q.d)){ S.quizzes.push(q); any = true; } sh['q:'+q.d] = JSON.stringify(S.quizzes.find(x => x.d === q.d)); });
  if(any) S.quizzes.sort((a, b) => a.d - b.d);
  return {any, words, shell};
}

/* ---------- sync ---------- */
const origSave = VY.save, origSaveNow = VY.saveNow, origReset = VY.resetAll;
VY.save = () => { origSave(); schedule(); };
// automatic mode: push changes a few seconds after they happen; manual mode: only count them
function schedule(ms=2500){
  if(!VY.isLoggedIn()) return;
  clearTimeout(A.timer);
  if(!A.auto){ A.timer = setTimeout(updatePending, 600); return; }
  A.timer = setTimeout(() => VY.sync(), ms);
}
function pendingCount(){ const snap = snapshot(), sh = A.meta.shadow; let n = 0; for(const k in snap) if(snap[k] !== sh[k]) n++; for(const k in sh) if(!(k in snap) && (k[0]==='p'||k[0]==='c'||k[0]==='k')) n++; return n; }
function updatePending(){ if(!VY.isLoggedIn()) return; A.pend = pendingCount(); if(A.status !== 'syncing') setStatus(A.pend && !A.auto ? 'pending' : (A.status === 'pending' ? 'ok' : A.status)); }
function setStatus(s){ A.status = s; const el = document.getElementById('sync-ind'); if(el){ el.className = 'sync-ind ' + s; el.title = statusText(); } const c = document.getElementById('acc-status'); if(c) c.innerHTML = statusChip(); }
VY.setAutoSync = on => { A.auto = !!on; localStorage.setItem(AKEY, on ? '1' : '0'); if(on) schedule(300); else updatePending(); };

VY.sync = async ({keepalive=false} = {}) => {
  if(!VY.isLoggedIn()) return false;
  if(A.busy){ A.again = true; return false; }
  A.busy = true; setStatus('syncing');
  const gen = A.gen;
  try{
    const snap = snapshot(), changes = buildChanges(snap, A.meta.shadow);
    const sent = {};
    if(changes){ for(const k in snap) if(snap[k] !== A.meta.shadow[k]) sent[k] = snap[k]; for(const k in A.meta.shadow) if(!(k in snap) && (k[0]==='p'||k[0]==='c'||k[0]==='k')) sent[k] = undefined; }
    const res = await api('/sync', {method:'POST', body:{since: A.meta.rev || 0, changes: changes || {}}, keepalive, timeout: 20000});
    if(gen !== A.gen || !VY.isLoggedIn()) return false;          // signed out / switched account meanwhile
    if(res.reset){                      // account was reset on another device
      origReset(); A.meta.shadow = {}; A.meta.rev = 0;
    } else {
      for(const k in sent){ if(sent[k] === undefined) delete A.meta.shadow[k]; else A.meta.shadow[k] = sent[k]; }
    }
    const r = applyIncoming(res.changes || {}, res.reset ? {} : sent);
    A.meta.rev = res.rev; A.meta.last = Date.now(); saveMeta(); origSaveNow();
    A.online = true; A.pend = 0;
    if(r.words || res.reset) VY.buildWords();
    if(r.shell || res.reset) VY.renderShell();
    else if(r.any && ['home','stats','learn','review','mywords','dictionary','settings','more'].includes(VY.current)) VY.rerender();
    setStatus('ok');
    return true;
  }catch(e){
    if(gen !== A.gen) return false;
    if(e.status === 401){ A.token = null; localStorage.removeItem(TKEY); A.user = null; setStatus('error'); showLogin(); return false; }
    if(e.code === 'network') A.online = false;
    setStatus(e.code === 'network' ? 'offline' : 'error'); return false;
  }finally{
    A.busy = false;
    if(A.again){ A.again = false; if(A.auto) schedule(800); }
    if(A.settleFn){ const f = A.settleFn; A.settleFn = null; f(); }
  }
};
// wait until a running sync has finished (used before sign-out)
const settle = () => A.busy ? new Promise(r => { A.settleFn = r; setTimeout(r, 20000); }) : Promise.resolve();
VY.resetAll = () => { origReset(); if(VY.isLoggedIn()){ api('/me/reset', {method:'POST', body:{}}).then(() => { A.meta.shadow = {}; A.meta.rev = 0; saveMeta(); VY.sync(); }).catch(() => {}); } };

document.addEventListener('visibilitychange', () => { if(!A.auto) return; if(document.visibilityState === 'hidden') VY.sync({keepalive:true}); else schedule(300); });
window.addEventListener('online', () => { A.online = true; if(A.cfg && A.cfg.placeholder) refreshConfig(); if(A.auto) schedule(500); });
window.addEventListener('offline', () => { A.online = false; if(VY.isLoggedIn() && A.status !== 'syncing') setStatus('offline'); });
setInterval(() => { if(A.auto && document.visibilityState === 'visible') VY.sync(); }, 60000);
setInterval(() => { if(A.auto && VY.isServer() && document.visibilityState === 'visible') fetchWords().then(ch => { if(ch && !['study','quiz','games'].includes(VY.current)) VY.rerender(); }); }, 10 * 60000);

/* ---------- session handling ---------- */
function wipeLocal(){ origReset(); A.meta = {uid:null, rev:0, shadow:{}, last:0}; saveMeta(); }
const hasLocalData = () => !!(VY.S && (VY.S.onboarded || Object.keys(VY.S.progress || {}).length || (VY.S.custom || []).length));
const setUser = u => { A.user = u; try{ if(u) localStorage.setItem(UKEY, JSON.stringify(u)); else localStorage.removeItem(UKEY); }catch(e){} };
VY.setUser = setUser;
/* res = {token, user}; merge = keep the progress of the no-account mode and add it to the account */
async function afterLogin(res, {merge = true, isNew = false} = {}){
  A.gen++;
  if(res){ A.token = res.token; localStorage.setItem(TKEY, res.token); localStorage.removeItem(GKEY); setUser(res.user); }
  if(A.meta.uid && A.meta.uid !== A.user.id) wipeLocal();      // another account used this device before
  let guestXp = 0;
  if(A.meta.uid !== A.user.id){
    const local = hasLocalData();
    if(local && !merge) wipeLocal();
    A.meta = {uid: A.user.id, rev: 0, shadow: {}, last: 0};
    if(!VY.S.onboarded) A.meta.shadow.profile = JSON.stringify(prof(VY.S));   // fresh device: don't overwrite server settings
    else if(local && merge && !isNew){                                          // existing account: take its profile, add this device's XP
      guestXp = VY.S.xp || 0; A.meta.shadow.profile = JSON.stringify(prof(VY.S));
    }
    saveMeta();
  }
  showSplash(T('syncing'));
  A.gotProfile = false;
  await Promise.race([Promise.all([fetchWords(), VY.sync()]), new Promise(r => setTimeout(r, 9000))]);
  if(guestXp){
    if(A.gotProfile) VY.S.xp = (VY.S.xp || 0) + guestXp;
    else delete A.meta.shadow.profile;                  // account had no profile yet → push this device's one
    origSaveNow(); VY.sync();
  }
  if(location.hash.indexOf('#/') !== 0) location.hash = '#/home';
  VY.renderShell();
}
VY.logout = async () => {
  await settle();
  await VY.sync().catch(() => {});
  A.gen++;
  const tok = A.token;
  A.token = null; setUser(null); localStorage.removeItem(TKEY); wipeLocal(); showLogin();
  try{ await api('/auth/logout', {method:'POST', body:{}, headers:{Authorization:'Bearer ' + tok}}); }catch(e){}
};
VY.useLocal = () => { localStorage.setItem(GKEY, '1'); if(location.hash.indexOf('#/') !== 0) location.hash = '#/home'; VY.renderShell(); fetchWords().then(c => c && VY.rerender()); };

/* ---------- boot ---------- */
const tgApp = () => { const w = window.Telegram && window.Telegram.WebApp; return w && w.initData ? w : null; };
/* Offline-first start: the app opens at once from the cached config/user/word bank; the server is contacted in the background.
   Only a first sign-in (or Telegram / one-time-link sign-in) waits for the network. */
const PLACEHOLDER_CFG = {registration: true, guest: true, placeholder: true};
function refreshConfig(){
  return api('/config', {timeout: 8000}).then(c => {
    A.cfg = c; A.online = true; try{ localStorage.setItem(CKEY, JSON.stringify(c)); }catch(e){}
    if(document.querySelector('.main')) noticeBanner();
    if(VY.onConfig) VY.onConfig(c);
    return c;
  }).catch(() => { A.online = false; return null; });
}
function backgroundStart(){
  // runs after the shell is visible: verify the session, then pull/push changes and the word bank
  api('/me', {timeout: 10000}).then(me => {
    setUser(me.user); A.summary = me.summary; A.online = true;
    if(A.auto) VY.sync();
    fetchWords().then(c => { if(c && !['study','quiz','games','reading','duel','placement'].includes(VY.current)) VY.rerender(); });
  }).catch(e => {
    if(e.status === 401){ A.token = null; localStorage.removeItem(TKEY); setUser(null); A.gen++; return showLogin(); }
    setStatus('offline');
  });
}
VY.boot = async () => {
  A.base = resolveBase();
  VY.apiBase = A.base || '';                               // absolute API base for builds that are not served by the Worker itself
  if(A.base === null) return VY.renderShell();               // pure offline build
  const qs = new URLSearchParams(location.search), code = qs.get('login');
  if(qs.get('duel')) VY.pendingDuel = qs.get('duel');
  if(code || qs.has('tg') || qs.has('duel')){ try{ history.replaceState(null, '', location.pathname + location.hash); }catch(e){} }
  useWords(loadJ(WKEY, null));
  const tw = tgApp(), tu = tw && tw.initDataUnsafe && tw.initDataUnsafe.user, cu = loadJ(UKEY, null);
  const needNet = !!code || !!(tu && (!A.token || !cu || !cu.telegram || +cu.telegram.id !== +tu.id));
  A.cfg = loadJ(CKEY, null);
  if(!A.cfg || needNet){
    if(needNet || navigator.onLine !== false){ showSplash(T('loading')); await refreshConfig(); }
    if(!A.cfg) A.cfg = Object.assign({}, PLACEHOLDER_CFG);     // never reached the server: still offer sign-in + guest mode
  } else refreshConfig();
  // one-time sign-in link from the Telegram bot (?login=CODE)
  if(code && A.online){
    try{ const res = await api('/auth/code', {method:'POST', body:{code}}); return afterLogin(res); }
    catch(e){ setTimeout(() => VY.toast(T('err_' + (e.code || 'bad_code'))), 900); }
  }
  // inside Telegram: use the same account as the bot
  if(tu && A.online && needNet){
    try{ const res = await api('/auth/telegram', {method:'POST', body:{initData: tw.initData}}); return afterLogin(res); }catch(e){}
  }
  if(!A.token){
    if(localStorage.getItem(GKEY)){ fetchWords().then(c => c && VY.rerender()); return VY.renderShell(); }
    return showLogin();                                        // works offline too (guest button)
  }
  if(cu && A.meta.uid && +cu.id === +A.meta.uid){              // known account on this device → open immediately
    setUser(cu); if(location.hash.indexOf('#/') !== 0) location.hash = '#/home';
    VY.renderShell(); setStatus(navigator.onLine === false ? 'offline' : 'idle'); updatePending();
    return backgroundStart();
  }
  showSplash(T('loading'));
  try{ const me = await api('/me', {timeout: 8000}); setUser(me.user); A.summary = me.summary; }
  catch(e){
    if(e.status === 401){ A.token = null; localStorage.removeItem(TKEY); setUser(null); return showLogin(); }
    if(A.meta.uid){ setUser(cu || {id: A.meta.uid, email: '', phone: '', name: ''}); setStatus('offline'); return VY.renderShell(); }   // server down: keep working offline
    return showLogin();
  }
  await afterLogin();
};

/* ---------- splash ---------- */
function showSplash(msg){
  VY.applyDir(); VY.applyTheme();
  document.getElementById('app').innerHTML = `<div class="auth-splash"><div class="brand-logo big"><img src="icons/mark.png" alt=""></div><div class="spinner"></div><div class="muted">${esc(msg||'')}</div></div>`;
}

/* ---------- login / register screen ---------- */
let mode = 'login';
function showLogin(){
  VY.applyDir(); VY.applyTheme();
  const app = document.getElementById('app'), reg = mode === 'register', cfg = A.cfg || {};
  const keepBox = hasLocalData() && !A.meta.uid ? `<label class="auth-keep"><input type="checkbox" id="au-keep" checked> <span>${T('keepLocal')}</span></label>` : '';
  app.innerHTML = `
  <div class="auth">
    <section class="auth-hero">
      <div class="brand"><div class="brand-logo"><img src="icons/mark.png" alt=""></div><div><div class="brand-name">${VY.t('appName')}</div><div class="brand-sub">${VY.t('appSub')}</div></div></div>
      <div class="auth-hero-body">
        <h1>${T('heroT')}</h1><p>${T('heroS')}</p>
        <div class="auth-demo">
          <div class="auth-demo-card"><div class="chips"><span class="chip">verb</span><span class="chip y">B2</span><span class="chip g">IELTS</span></div>
            <div class="w" dir="ltr">mitigate</div><div class="m">کاهش دادن، تسکین دادن</div>
            <div class="r"><span class="bad">✕ ${VY.lang()==='fa'?'نفهمیدم':'Again'}</span><span class="good">✓ ${VY.lang()==='fa'?'فهمیدم':'Got it'}</span></div></div>
          <div class="auth-demo-pill">🔥 <b>${VY.n(7)}</b> ${VY.t('streak')}</div>
          <div class="auth-demo-pill two">⭐ +${VY.n(10)} ${VY.t('xp')}</div>
        </div>
        <ul class="auth-feats"><li>${icon('check')}${T('f1')}</li><li>${icon('check')}${T('f2')}</li><li>${icon('check')}${T('f3')}</li></ul>
      </div>
    </section>
    <section class="auth-side">
      <div class="auth-top"><button class="lang-btn" id="au-lang">${VY.lang()==='fa'?'EN':'فا'}</button><button class="icon-btn" id="au-theme">${icon(document.documentElement.dataset.theme==='dark'?'sun':'moon')}</button></div>
      <form class="auth-card" id="au-form" novalidate autocomplete="on">
        <div class="brand-logo mobile-only"><img src="icons/mark.png" alt=""></div>
        <h2>${reg ? T('createAcc') : T('welcomeBack')}</h2>
        <p class="muted">${reg ? T('registerSub') : T('loginSub')}</p>
        <div class="seg auth-tabs"><button type="button" class="${reg?'':'on'}" data-mode="login">${T('login')}</button>${cfg.registration!==false?`<button type="button" class="${reg?'on':''}" data-mode="register">${T('register')}</button>`:''}</div>
        <div class="auth-err hidden" id="au-err" role="alert"></div>
        ${reg ? `<label class="field"><span>${T('name')}</span><div class="input-ic">${icon('user')}<input class="input" id="au-name" name="name" autocomplete="name" placeholder="${T('namePh')}" maxlength="60"></div></label>` : ''}
        <label class="field"><span>${T('id')}</span><div class="input-ic">${icon('mail')}<input class="input en" id="au-login" name="username" autocomplete="username" inputmode="email" dir="ltr" placeholder="${T('idPh')}" required></div></label>
        <label class="field"><span>${T('pass')}${reg?` <i class="muted">· ${T('passHint')}</i>`:''}</span><div class="input-ic">${icon('lock')}<input class="input en" id="au-pass" name="password" type="password" dir="ltr" autocomplete="${reg?'new-password':'current-password'}" required minlength="6"><button type="button" class="eye" id="au-eye" aria-label="${T('show')}">${icon('eye')}</button></div></label>
        ${reg ? `<label class="field"><span>${T('pass2')}</span><div class="input-ic">${icon('lock')}<input class="input en" id="au-pass2" type="password" dir="ltr" autocomplete="new-password" required></div></label>` : ''}
        <button class="btn btn-primary btn-lg btn-block mt16" id="au-submit" type="submit"><span>${reg ? T('doRegister') : T('doLogin')}</span>${icon('arrow')}</button>
        <div class="auth-switch">${reg ? T('haveAcc') : T('noAcc')} <a href="#" data-mode="${reg?'login':'register'}">${reg ? T('login') : T('register')}</a></div>
        ${keepBox}
      </form>
      ${cfg.guest !== false ? `<div class="auth-or"><span>${T('or')}</span></div>
      <button type="button" class="auth-local" id="au-guest">${icon('device')}<div><b>${T('localTitle')}</b><span>${T('localSub')}</span></div>${icon('arrow')}</button>` : ''}
    </section>
  </div>`;
  const $ = id => document.getElementById(id);
  app.querySelectorAll('[data-mode]').forEach(b => b.onclick = e => { e.preventDefault(); if(b.dataset.mode === 'register' && cfg.registration === false) return; mode = b.dataset.mode; const v = $('au-login').value; showLogin(); $('au-login').value = v; $('au-login').focus(); });
  $('au-lang').onclick = () => { VY.S.settings.lang = VY.lang()==='fa' ? 'en' : 'fa'; origSaveNow(); showLogin(); };
  $('au-theme').onclick = () => { VY.S.settings.theme = document.documentElement.dataset.theme==='dark' ? 'light' : 'dark'; origSaveNow(); showLogin(); };
  $('au-eye').onclick = () => { const p = $('au-pass'), show = p.type === 'password'; p.type = show ? 'text' : 'password'; if($('au-pass2')) $('au-pass2').type = p.type; $('au-eye').innerHTML = icon(show ? 'eyeOff' : 'eye'); };
  if($('au-guest')) $('au-guest').onclick = () => VY.useLocal();
  const err = (code, field) => { const e = $('au-err'); e.textContent = T('err_' + code) || code; e.classList.remove('hidden'); if(field){ field.classList.add('invalid'); field.focus(); } };
  app.querySelectorAll('.input').forEach(i => i.addEventListener('input', () => { i.classList.remove('invalid'); $('au-err').classList.add('hidden'); }));
  $('au-form').onsubmit = async e => {
    e.preventDefault();
    const login = $('au-login').value.trim(), pass = $('au-pass').value;
    if(!login) return err('required', $('au-login'));
    if(!pass) return err('required', $('au-pass'));
    if(mode === 'register'){
      if(pass.length < 6) return err('weak_password', $('au-pass'));
      if(pass !== $('au-pass2').value) return err('mismatch', $('au-pass2'));
    }
    const btn = $('au-submit'); btn.disabled = true; btn.classList.add('loading');
    try{
      const res = await api(mode === 'register' ? '/auth/register' : '/auth/login', {method:'POST', body:{login, password: pass, name: $('au-name') ? $('au-name').value : ''}});
      await afterLogin(res, {merge: !$('au-keep') || $('au-keep').checked, isNew: mode === 'register'});
    }catch(x){
      btn.disabled = false; btn.classList.remove('loading');
      err(x.code || 'server_error', x.code === 'wrong_credentials' ? $('au-pass') : (/login|email/.test(x.code||'') || x.code === 'already_registered') ? $('au-login') : null);
    }
  };
  setTimeout(() => $('au-login') && $('au-login').focus(), 50);
}
VY.showLogin = () => { mode = 'login'; showLogin(); };

/* ---------- account card (settings) + top-bar indicator ---------- */
function ago(ts){
  if(!ts) return T('never');
  const m = Math.round((Date.now() - ts) / 60000);
  return m < 1 ? T('justNow') : m < 60 ? T('minAgo', {n: VY.n(m)}) : m < 2880 ? T('hourAgo', {n: VY.n(Math.round(m / 60))}) : new Date(ts).toLocaleDateString(VY.lang() === 'fa' ? 'fa-IR' : 'en-GB');
}
function statusText(){
  if(A.status === 'syncing') return T('syncing');
  if(A.status === 'pending') return T('pending', {n: VY.n(A.pend)}) + ' · ' + T('syncedAgo') + ': ' + ago(A.meta.last);
  if(A.status === 'offline') return T('offline');
  if(A.status === 'error') return T('syncErr');
  return (A.meta.last ? T('synced') + ' · ' + ago(A.meta.last) : T('never'));
}
function statusChip(){
  const cls = A.status === 'syncing' ? 'p' : A.status === 'offline' || A.status === 'pending' ? 'o' : A.status === 'error' ? 'r' : 'g';
  return `<span class="chip ${cls}">${A.status === 'syncing' ? '<span class="dot-spin"></span>' : icon(A.status === 'ok' || A.status === 'idle' ? 'cloud' : A.status === 'pending' ? 'upload' : 'x')} ${statusText()}</span>`;
}
const loginOf = u => u.email || u.phone || (u.telegram ? (u.telegram.username ? '@' + u.telegram.username : T('tgOnly')) : '');
const tgOn = () => !!(A.cfg && A.cfg.telegram);
VY.accountCard = () => {
  if(!VY.isServer()) return '';
  const wordsBtn = `<button class="btn btn-ghost btn-sm" data-act="accWords">${icon('download')} ${T('updWords')}</button>`;
  if(!VY.isLoggedIn()) return `<div class="card acc-card local">
    <div class="acc-av">${icon('device')}</div>
    <div class="acc-info"><b>${T('localMode')}</b><span>${T('localCardSub')}</span></div>
    <div class="acc-actions"><button class="btn btn-primary btn-sm" data-act="accSignIn">${icon('user')} ${T('signIn')}</button>${wordsBtn}</div></div>`;
  const u = A.user, idt = loginOf(u), nm = u.name || (u.email ? u.email.split('@')[0] : u.telegram && u.telegram.name) || idt;
  const webLogin = !!(u.email || u.phone);
  const tgRow = !tgOn() ? '' : u.telegram
    ? `<div class="acc-sub"><span class="chip g">${icon('send')} ${T('tgLinked')}${u.telegram.username ? ` · <span class="en" dir="ltr">@${esc(u.telegram.username)}</span>` : ''}</span>${webLogin ? `<button class="btn btn-ghost btn-sm" data-act="accTgUnlink">${T('tgUnlink')}</button>` : ''}</div>`
    : `<div class="acc-sub"><div class="t"><b>${icon('send')} ${T('tgTitle')}</b><span>${T('tgConnectS')}</span></div><button class="btn btn-soft btn-sm" data-act="accTg">${icon('link')} ${T('tgConnect')}</button></div>`;
  const siteRow = webLogin || !tgApp() ? '' : `<div class="acc-sub hl"><div class="t"><b>${icon('lock')} ${T('siteLogin')}</b><span>${T('siteLoginS')}</span></div><button class="btn btn-primary btn-sm" data-act="accSiteLogin">${icon('user')} ${T('siteLogin')}</button></div>`;
  const loginRow = webLogin ? '' : `<div class="acc-sub"><div class="t"><b>${icon('mail')} ${T('addLogin')}</b><span>${T('addLoginS')}</span></div><button class="btn btn-soft btn-sm" data-act="accAddLogin">${icon('plus')} ${T('addLogin')}</button></div>`;
  return `<div class="card acc-card full">
    <div class="acc-main">
      <div class="acc-av">${esc((nm || '?').trim().charAt(0).toUpperCase())}</div>
      <div class="acc-info"><b>${esc(nm)}</b><span class="en" dir="ltr">${esc(idt)}</span><div id="acc-status" class="mt8">${statusChip()}</div></div>
      <div class="acc-actions"><button class="btn btn-primary btn-sm" data-act="accSync">${icon('repeat')} ${T('syncNow')}</button>${wordsBtn}
        ${u.has_password !== false && webLogin ? `<button class="btn btn-ghost btn-sm" data-act="accPass">${icon('lock')} ${T('changePass')}</button>` : ''}
        <button class="btn btn-ghost btn-sm danger-text" data-act="accLogout">${icon('logout')} ${T('logout')}</button></div>
    </div>
    <div class="acc-sub"><div class="t"><b>${icon('cloud')} ${T('autoSync')}</b><span>${T('autoSyncS')}</span></div>
      <div class="seg"><button class="${A.auto ? 'on' : ''}" data-act="accAuto" data-v="1">${T('autoOn')}</button><button class="${A.auto ? '' : 'on'}" data-act="accAuto" data-v="0">${T('autoOff')}</button></div></div>
    ${tgRow}${siteRow}${loginRow}
  </div>`;
};
const rerenderSettings = () => { if(VY.current === 'settings') VY.rerender(); };
ACT.accSignIn = () => { localStorage.removeItem(GKEY); VY.showLogin(); };
ACT.accSync = async () => {
  const ok = await VY.sync();
  if(ok) fetchWords().then(c => c && VY.rerender());
  VY.toast(ok ? '✓ ' + T('synced') : T(A.status === 'offline' ? 'offline' : 'syncErr'));
};
ACT.accAuto = el => { VY.setAutoSync(el.dataset.v === '1'); rerenderSettings(); };
ACT.accWords = async el => {
  el.disabled = true; el.classList.add('loading');
  const ch = await fetchWords();
  el.disabled = false; el.classList.remove('loading');
  if(ch){ VY.toast(T('wordsUpdated')); VY.rerender(); } else VY.toast(A.wordsErr ? T('err_network') : T('wordsSame'));
};
ACT.accLogout = () => VY.modal(`<h2>${T('logout')}</h2><p class="muted">${A.user && !A.user.email && !A.user.phone ? T('logoutQtg') : T('logoutQ')}</p><div class="row mt16" style="justify-content:flex-end"><button class="btn btn-ghost" data-act="closeModalA">${T('cancel')}</button><button class="btn btn-danger" data-act="accLogoutYes">${icon('logout')} ${T('logout')}</button></div>`);
ACT.closeModalA = () => { clearInterval(A.tgPoll); VY.closeModal(); };
ACT.accLogoutYes = () => { VY.closeModal(); VY.logout(); };
const mErr = (id, code) => { const e = document.getElementById(id); if(e){ e.textContent = T('err_' + code) || code; e.classList.remove('hidden'); } };
ACT.accPass = () => {
  VY.modal(`<h2>${T('changePass')}</h2><div class="auth-err hidden" id="cp-err"></div>
    <label class="field"><span>${T('curPass')}</span><input class="input en" dir="ltr" type="password" id="cp-old" autocomplete="current-password"></label>
    <label class="field"><span>${T('newPass')} <i class="muted">· ${T('passHint')}</i></span><input class="input en" dir="ltr" type="password" id="cp-new" autocomplete="new-password"></label>
    <div class="row mt16" style="justify-content:flex-end"><button class="btn btn-ghost" data-act="closeModalA">${T('cancel')}</button><button class="btn btn-primary" data-act="accPassSave">${T('save')}</button></div>`);
};
ACT.accPassSave = async () => {
  const o = document.getElementById('cp-old').value, nw = document.getElementById('cp-new').value;
  if(nw.length < 6) return mErr('cp-err', 'weak_password');
  try{ await api('/me', {method:'PUT', body:{password:o, new_password:nw}}); VY.closeModal(); VY.toast(T('saved')); }
  catch(x){ mErr('cp-err', x.code); }
};
/* Telegram-only account → add an email / mobile + password for the web and desktop */
ACT.accAddLogin = () => {
  VY.modal(`<h2>${T('addLogin')}</h2><p class="muted">${T('addLoginS')}</p><div class="auth-err hidden" id="al-err"></div>
    <label class="field"><span>${T('id')}</span><input class="input en" dir="ltr" id="al-login" autocomplete="username" placeholder="${T('idPh')}"></label>
    <label class="field"><span>${T('pass')} <i class="muted">· ${T('passHint')}</i></span><input class="input en" dir="ltr" type="password" id="al-pass" autocomplete="new-password"></label>
    <label class="field"><span>${T('pass2')}</span><input class="input en" dir="ltr" type="password" id="al-pass2" autocomplete="new-password"></label>
    <div class="row mt16" style="justify-content:flex-end"><button class="btn btn-ghost" data-act="closeModalA">${T('cancel')}</button><button class="btn btn-primary" data-act="accAddLoginSave">${T('save')}</button></div>`);
};
ACT.accAddLoginSave = async el => {
  const login = document.getElementById('al-login').value.trim(), p1 = document.getElementById('al-pass').value, p2 = document.getElementById('al-pass2').value;
  if(!login) return mErr('al-err', 'required');
  if(p1.length < 6) return mErr('al-err', 'weak_password');
  if(p1 !== p2) return mErr('al-err', 'mismatch');
  el.disabled = true;
  try{ const r = await api('/me', {method:'PUT', body:{login, new_password: p1}}); setUser(r.user); VY.closeModal(); VY.toast(T('saved')); rerenderSettings(); }
  catch(x){ el.disabled = false; mErr('al-err', x.code); }
};
/* web account → connect the Telegram bot (deep link with a one-time code) */
async function refreshMe(){ try{ const me = await api('/me', {timeout: 6000}); setUser(me.user); return me.user; }catch(e){ return null; } }
ACT.accTg = async el => {
  el.disabled = true;
  let r; try{ r = await api('/me/telegram', {method:'POST', body:{}}); }catch(x){ el.disabled = false; return VY.toast(T('err_' + x.code) || x.code); }
  el.disabled = false;
  const tw = tgApp();
  VY.modal(`<h2>${icon('send')} ${T('tgConnect')}</h2><p class="muted" style="line-height:2">${T('tgSteps')}</p>
    <a class="btn btn-primary btn-block btn-lg" id="tg-open" href="${esc(r.url)}" target="_blank" rel="noopener">${icon('send')} ${T('tgOpen')}</a>
    <div class="muted small mt16 center" id="tg-wait"><span class="dot-spin"></span> ${T('tgWaiting')}</div>
    <div class="row mt16" style="justify-content:flex-end"><button class="btn btn-ghost" data-act="closeModalA">${T('close')}</button><button class="btn btn-soft" data-act="accTgCheck">${T('check')}</button></div>`);
  if(tw && tw.openTelegramLink) document.getElementById('tg-open').onclick = e => { e.preventDefault(); tw.openTelegramLink(r.url); };
  clearInterval(A.tgPoll); let n = 0;
  A.tgPoll = setInterval(() => { if(++n > 60 || !document.getElementById('tg-wait')) return clearInterval(A.tgPoll); ACT.accTgCheck(null, true); }, 4000);
};
ACT.accTgCheck = async (el, quiet) => {
  const u = await refreshMe();
  if(u && u.telegram){ clearInterval(A.tgPoll); VY.closeModal(); VY.toast(T('tgDone')); await VY.sync(); rerenderSettings(); }
  else if(!quiet) VY.toast(T('tgWaiting'));
};
ACT.accTgUnlink = () => VY.modal(`<h2>${T('tgUnlink')}</h2><p class="muted">${T('tgUnlinkQ')}</p><div class="row mt16" style="justify-content:flex-end"><button class="btn btn-ghost" data-act="closeModalA">${T('cancel')}</button><button class="btn btn-danger" data-act="accTgUnlinkYes">${T('unlink')}</button></div>`);
ACT.accTgUnlinkYes = async () => {
  VY.closeModal();
  try{ const r = await api('/me/telegram', {method:'DELETE'}); setUser(r.user); rerenderSettings(); VY.toast(T('saved')); }
  catch(x){ VY.toast(T('err_' + x.code) || x.code); }
};

/* Method A — inside Telegram: sign in with the site account and connect this Telegram to it */
ACT.accSiteLogin = () => {
  if(A.user && (A.user.email || A.user.phone)) return VY.toast(T('alreadyLinked'));
  VY.modal(`<h2>${T('siteLogin')}</h2><p class="muted">${T('siteLoginS')}</p><div class="auth-err hidden" id="sl-err" role="alert"></div>
    <form id="sl-form" autocomplete="on" onsubmit="return false">
    <label class="field"><span>${T('id')}</span><input class="input en" dir="ltr" id="sl-login" name="username" autocomplete="username" inputmode="email" placeholder="${T('idPh')}"></label>
    <label class="field"><span>${T('pass')}</span><input class="input en" dir="ltr" type="password" id="sl-pass" name="password" autocomplete="current-password"></label>
    <p class="muted small" style="line-height:1.9">${T('siteLoginInfo')}</p>
    <div class="row mt16" style="justify-content:flex-end"><button type="button" class="btn btn-ghost" data-act="closeModalA">${T('cancel')}</button><button type="submit" class="btn btn-primary" id="sl-go" data-act="accSiteLoginGo">${icon('link')} ${T('siteLoginDo')}</button></div></form>`);
  const pw = document.getElementById('sl-pass'); if(pw) pw.addEventListener('keydown', e => { if(e.key === 'Enter'){ e.preventDefault(); ACT.accSiteLoginGo(document.getElementById('sl-go')); } });
  setTimeout(() => { const e = document.getElementById('sl-login'); if(e) e.focus(); }, 80);
};
ACT.accSiteLoginGo = async el => {
  const tw = tgApp(); if(!tw || !el || el.disabled) return;
  const login = document.getElementById('sl-login').value.trim(), pass = document.getElementById('sl-pass').value;
  if(!login) return mErr('sl-err', 'required');
  if(!pass) return mErr('sl-err', 'required');
  el.disabled = true; el.classList.add('loading');
  try{
    if(VY.isLoggedIn()){ await settle(); await VY.sync().catch(() => {}); }     // push unsynced Telegram progress first, the server merges it
    const res = await api('/auth/telegram/link', {method:'POST', body:{initData: tw.initData, login, password: pass}});
    VY.closeModal();
    await afterLogin(res, {merge: false});                                         // local copy = old account → reload everything from the merged account
    VY.toast(T('siteLinked'));
    try{ if(tw.HapticFeedback) tw.HapticFeedback.notificationOccurred('success'); }catch(e){}
  }catch(x){ el.disabled = false; el.classList.remove('loading'); mErr('sl-err', x.code || 'server_error'); }
};
// ?tg=1&action=link (button in the bot's /account screen) opens the form right after start-up
const origBoot = VY.boot;
VY.boot = async () => {
  const act = new URLSearchParams(location.search).get('action');
  await origBoot();
  if(act === 'link' && tgApp() && VY.isLoggedIn()) setTimeout(() => (A.user.email || A.user.phone) ? VY.toast(T('alreadyLinked')) : ACT.accSiteLogin(), 400);
};

/* announcement banner + maintenance notice (set in the admin panel) */
const NKEY = 'vajeyar_notice_seen';
function noticeBanner(){
  const c = A.cfg || {}, main = document.querySelector('.main'), top = main && main.querySelector('.topbar');
  const old = document.getElementById('vy-notice'); if(old) old.remove();
  if(!top) return;
  let html = '';
  if(c.maintenance) html = `<div class="vy-notice warning"><b>🛠 ${T('maintT')}</b><span>${esc(typeof c.maintenance === 'string' ? c.maintenance : T('err_maintenance'))}</span></div>`;
  else if(c.notice && c.notice.text && localStorage.getItem(NKEY) !== c.notice.text) html = `<div class="vy-notice ${esc(c.notice.level || 'info')}"><b>📢</b><span>${esc(c.notice.text)}</span><button class="x" data-act="noticeClose" aria-label="close">${icon('x')}</button></div>`;
  if(!html) return;
  const d = document.createElement('div'); d.id = 'vy-notice'; d.innerHTML = html; top.after(d);
}
ACT.noticeClose = () => { try{ localStorage.setItem(NKEY, A.cfg.notice.text); }catch(e){} const n = document.getElementById('vy-notice'); if(n) n.remove(); };
if(!document.getElementById('vy-notice-css')){
  const st = document.createElement('style'); st.id = 'vy-notice-css';
  st.textContent = `.vy-notice{display:flex;gap:10px;align-items:flex-start;margin:10px 16px 0;padding:12px 14px;border-radius:14px;font-size:14px;line-height:1.8;background:var(--soft,#efeafe);color:var(--text,#222);border:1px solid rgba(139,108,246,.25)}
  .vy-notice b{white-space:nowrap}.vy-notice span{flex:1;white-space:pre-line}.vy-notice .x{border:0;background:transparent;color:inherit;opacity:.6;cursor:pointer;padding:2px;width:26px;height:26px}.vy-notice .x svg{width:18px;height:18px}
  .vy-notice.success{background:rgba(34,197,94,.12);border-color:rgba(34,197,94,.3)}.vy-notice.warning{background:rgba(245,158,11,.14);border-color:rgba(245,158,11,.35)}.vy-notice.danger{background:rgba(239,68,68,.12);border-color:rgba(239,68,68,.3)}
  .acc-sub.hl{background:rgba(139,108,246,.08);border-radius:14px;padding:12px}`;
  document.head.appendChild(st);
}

// top-bar sync indicator, injected after every shell render (click = sync now)
const origShell = VY.renderShell;
VY.renderShell = () => {
  origShell();
  noticeBanner();
  if(!VY.isLoggedIn() || !VY.S.onboarded) return;
  const bar = document.querySelector('.topbar .spacer');
  if(bar && !document.getElementById('sync-ind')){
    const b = document.createElement('button'); b.id = 'sync-ind'; b.className = 'sync-ind ' + A.status; b.title = statusText();
    b.innerHTML = icon('cloud') + '<span class="sync-dot"></span>'; b.onclick = () => ACT.accSync();
    bar.after(b);
  }
};
})();
