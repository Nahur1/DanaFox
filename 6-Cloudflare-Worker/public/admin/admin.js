/* ===== VajeYar · admin panel (works in the browser and as a Telegram Mini App) ===== */
(function () {
'use strict';
const W = window.Telegram && window.Telegram.WebApp;
const tg = W && W.initData ? W : null;
const TOK = 'vy_adm_tok', LANGK = 'vy_admin_lang', THK = 'vy_admin_theme';
const S = { token: sessionStorage.getItem(TOK), me: null, view: 'dash', lang: localStorage.getItem(LANGK) || 'fa', cats: null, bcRun: {}, users: { q: '', filter: '', sort: 'recent', page: 1 }, words: { q: '', cat: '', level: 0, status: 'active', page: 1 }, sec: { page: 1, action: '' } };
const $ = (s, r = document) => r.querySelector(s);
const esc = s => String(s == null ? '' : s).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));

/* ---------- texts ---------- */
const L = {
fa: {
  panel: 'پنل مدیریت', sendBtn: 'ارسال', app: 'واژه‌یار', dash: 'داشبورد', users: 'کاربران', words: 'بانک لغات', bc: 'پیام همگانی', bot: 'ربات تلگرام', settings: 'تنظیمات برنامه', security: 'امنیت',
  loading: 'در حال بارگذاری…', retry: 'تلاش دوباره', save: 'ذخیره', cancel: 'انصراف', close: 'بستن', confirm: 'تأیید', del: 'حذف', edit: 'ویرایش', add: 'افزودن', search: 'جستجو…', yes: 'بله', back: 'بازگشت',
  logout: 'خروج', expiresIn: '{h} مانده', hours: '{n} ساعت', minutes: '{n} دقیقه', signedAs: 'وارد شده با', today: 'امروز', d7: '۷ روز', d30: '۳۰ روز', total: 'کل',
  loginT: 'ورود به پنل مدیریت', loginS: 'این پنل فقط برای حساب تلگرام مدیر باز می‌شود.',
  way1: '<b>از داخل تلگرام (پیشنهادی):</b> در ربات {bot} دستور <span class="code">/admin</span> را بفرستید و «باز کردن پنل مدیریت» را بزنید.',
  way2: '<b>در مرورگر:</b> در ربات <span class="code">/admin</span> ← «لینک ورود یک‌بارمصرف». لینک فقط ۵ دقیقه و یک بار کار می‌کند.',
  way3: '<b>با رمز:</b> فقط برای حساب سایتی که به تلگرام مدیر وصل است.', pwLogin: 'ورود با ایمیل/موبایل و رمز', idL: 'ایمیل یا موبایل', passL: 'رمز عبور', signIn: 'ورود',
  deniedT: 'دسترسی ندارید', deniedS: 'این پنل فقط برای مالک واژه‌یار در دسترس است. این تلاش ثبت شد.', expired: 'نشست شما تمام شد؛ دوباره وارد شوید.', reopen: 'نشست تلگرام قدیمی است؛ پنل را دوباره از ربات باز کنید.',
  k_users: 'کاربران', k_active: 'فعال امروز', k_tg: 'کاربران تلگرام', k_reviews: 'مرورهای امروز', k_learned: 'لغات یادگرفته', k_words: 'لغات بانک', k_quiz: 'آزمون‌ها', k_new30: 'عضو جدید ۳۰ روز',
  s_new: '+{a} امروز · +{b} هفته', s_act: '۷ روز {a} · ۳۰ روز {b}', s_tg: 'متصل {a} · فقط تلگرام {b}', s_rev: 'کل {a}', s_learn: 'تسلط کامل {a}', s_words: 'لغات شخصی {a}', s_quiz: '', s_new30: 'ربات را بسته‌اند {a}',
  ch_act: 'فعالیت ۳۰ روز اخیر', ch_sign: 'ثبت‌نام‌ها', ch_plat: 'کاربران بر اساس نوع حساب', ch_top: 'برترین زبان‌آموزان', ch_recent: 'تازه‌واردها', ch_cats: 'لغات هر دسته',
  lg_rev: 'مرورها', lg_users: 'کاربران فعال', lg_web: 'وب/دسکتاپ', lg_tg: 'تلگرام', p_web: 'فقط سایت', p_tg: 'فقط تلگرام', p_linked: 'سایت + تلگرام',
  q_bc: 'پیام همگانی جدید', q_word: 'افزودن لغت', q_bot: 'وضعیت ربات', xp: 'امتیاز', learned: 'یادگرفته', streak: 'زنجیره', lastAct: 'آخرین فعالیت', joined: 'عضویت', never: 'هرگز',
  f_all: 'همه', f_telegram: 'تلگرام', f_web: 'فقط سایت', f_tg: 'فقط تلگرام', f_linked: 'متصل', f_active7: 'فعال ۷ روز', f_inactive: 'غیرفعال', f_new7: 'جدید', f_blocked: 'مسدود', f_bot_blocked: 'ربات را بسته',
  so_recent: 'آخرین فعالیت', so_new: 'جدیدترین', so_old: 'قدیمی‌ترین', so_xp: 'بیشترین امتیاز', so_learned: 'بیشترین لغت', export: 'خروجی CSV', exportTg: 'ارسال فایل به تلگرام من', sentTg: 'فایل در تلگرام برایتان ارسال شد ✓',
  nUsers: '{n} کاربر', page: 'صفحهٔ {a} از {b}', prev: 'قبلی', next: 'بعدی', noUsers: 'کاربری پیدا نشد', admin: 'مدیر', blocked: 'مسدود', botBlocked: 'ربات را بسته', tgOnly: 'تلگرام', web: 'سایت', linked: 'متصل',
  u_mastered: 'تسلط کامل', u_due: 'آمادهٔ مرور', u_reviews: 'مرورها', u_days: 'روز فعال', u_quiz: 'آزمون', u_custom: 'لغت شخصی', u_ach: 'مدال', u_sessions: 'دستگاه‌های وارد شده', u_best: 'بهترین',
  u_email: 'ایمیل', u_phone: 'موبایل', u_tg: 'تلگرام', u_lang: 'زبان', u_track: 'مسیر', u_goal: 'هدف روزانه', u_lastLogin: 'آخرین ورود', u_lastSync: 'آخرین همگام‌سازی', u_lastBot: 'آخرین استفاده از ربات', u_act30: 'مرورهای ۳۰ روز اخیر', u_quizzes: 'آزمون‌های اخیر',
  a_msg: 'ارسال پیام در تلگرام', a_pass: 'تعیین رمز جدید', a_logout: 'خروج از همهٔ دستگاه‌ها', a_block: 'مسدود کردن', a_unblock: 'رفع مسدودی', a_reset: 'صفر کردن پیشرفت', a_delete: 'حذف حساب',
  msgT: 'پیام به {n}', msgS: 'از طرف ربات ارسال می‌شود. قالب HTML تلگرام مجاز است.', withApp: 'دکمهٔ «باز کردن واژه‌یار» زیر پیام', sent: 'ارسال شد ✓',
  passT: 'رمز جدید برای {n}', passS: 'همهٔ نشست‌های این کاربر بسته می‌شود.', newPass: 'رمز جدید (حداقل ۶ کاراکتر)', gen: 'ساخت رمز تصادفی',
  logoutQ: 'این کاربر از همهٔ دستگاه‌ها خارج شود؟', blockQ: 'حساب {n} مسدود شود؟ از همه‌جا خارج می‌شود و ربات هم برایش کار نمی‌کند.', unblockQ: 'مسدودی {n} برداشته شود؟',
  resetQ: 'همهٔ پیشرفت، مرورها و لغات شخصی {n} پاک می‌شود. این کار برگشت‌پذیر نیست.', deleteQ: 'حساب {n} و همهٔ اطلاعاتش برای همیشه حذف می‌شود.', typeDel: 'برای تأیید «{w}» را تایپ کنید', delWord: 'حذف',
  done: 'انجام شد ✓', saved: 'ذخیره شد ✓', copied: 'کپی شد ✓',
  w_all: 'همه', w_active: 'فعال', w_deleted: 'پنهان', w_cat: 'همهٔ دسته‌ها', w_level: 'همهٔ سطح‌ها', w_add: 'لغت جدید', w_import: 'وارد کردن', w_word: 'لغت', w_pos: 'نوع', w_fa: 'معنی فارسی', w_def: 'تعریف انگلیسی', w_ex: 'مثال',
  w_catL: 'دسته', w_levelL: 'سطح', w_activeL: 'نمایش در برنامه', w_hide: 'پنهان کردن', w_restore: 'بازگرداندن', w_delQ: 'لغت «{w}» برای همیشه حذف شود؟ پیشرفت کاربران روی این لغت بی‌اثر می‌شود.', nWords: '{n} لغت', noWords: 'لغتی پیدا نشد',
  imp_t: 'وارد کردن لغات', imp_s: 'هر خط یک لغت: <span class="code">word | pos | معنی | definition | example</span> — CSV با سطر عنوان (word,pos,meaning_fa,definition,example,category,level) هم قبول است.',
  imp_up: 'لغات تکراری به‌روزرسانی شوند', imp_go: 'وارد کن', imp_res: '{a} جدید · {b} به‌روزرسانی · {c} رد شد', imp_err: '{n} خط خطا داشت', w_inact: 'شامل لغات پنهان',
  bc_new: 'نوشتن پیام همگانی', bc_text: 'متن پیام', bc_ph: 'سلام! 👋\nلغات جدید آیلتس اضافه شد…', bc_aud: 'گیرندگان', bc_btn: 'دکمهٔ لینک (اختیاری)', bc_btnText: 'متن دکمه', bc_btnUrl: 'آدرس https://…', bc_app: 'دکمهٔ باز کردن اپ واژه‌یار',
  bc_test: 'ارسال آزمایشی برای من', bc_send: 'ارسال برای {n} نفر', bc_prev: 'پیش‌نمایش در تلگرام', bc_hist: 'پیام‌های قبلی', bc_none: 'هنوز پیامی ارسال نشده', bc_sendQ: 'این پیام برای {n} کاربر تلگرام ارسال شود؟',
  bc_testOk: 'پیام آزمایشی در تلگرام شما ارسال شد ✓', bc_cancel: 'توقف ارسال', bc_resume: 'ادامهٔ ارسال', bc_sent: 'ارسال‌شده', bc_failed: 'ناموفق', bc_blocked: 'ربات را بسته‌اند', bc_of: 'از {n}',
  st_running: 'در حال ارسال', st_done: 'تمام شد', st_cancelled: 'متوقف شد', bc_note: 'ارسال در دسته‌های ۲۵تایی انجام می‌شود. اگر صفحه را ببندید، ادامهٔ ارسال هر ۱۵ دقیقه به‌صورت خودکار انجام می‌شود.',
  au_all: 'همهٔ کاربران تلگرام', au_active7: 'فعال در ۷ روز اخیر', au_inactive7: 'غیرفعال ۷ روز اخیر', au_linked: 'متصل به حساب سایت', au_tg_only: 'فقط تلگرام', nPeople: '{n} نفر', chars: '{a} / ۴۰۰۰',
  b_status: 'وضعیت ربات', b_ok: 'ربات وصل و فعال است', b_bad: 'وبهوک درست تنظیم نشده', b_none: 'ربات هنوز تنظیم نشده', b_user: 'نام کاربری', b_name: 'نام', b_hook: 'وبهوک', b_pending: 'پیام‌های در صف', b_err: 'آخرین خطا', b_setupAt: 'آخرین تنظیم خودکار',
  b_open: 'باز کردن ربات', b_copyApp: 'کپی لینک اپ', b_resetup: 'تنظیم دوباره (وبهوک، دستورها، منو)', b_admins: 'شناسهٔ تلگرام مدیران', b_secret: 'توکن ربات به‌صورت Secret در Cloudflare ذخیره است و در پنل نمایش داده نمی‌شود.',
  b_tips: 'نکته‌های BotFather', b_tok: 'توکن جدید ربات', b_tokS: 'فقط وقتی توکن در Cloudflare Secret نیست.', b_inline: 'حالت Inline', on: 'روشن', off: 'خاموش',
  tip1: '<b>لینک مستقیم اپ:</b> در @BotFather دستور <span class="code">/newapp</span> را بزنید، ربات را انتخاب کنید و آدرس <span class="code">{app}</span> را بدهید تا لینکی مثل <span class="code">t.me/{bot}/app</span> بگیرید.',
  tip2: '<b>جستجوی لغت در هر چت:</b> <span class="code">/setinline</span> را در @BotFather فعال کنید؛ سپس در هر چتی بنویسید <span class="code">@{bot} word</span>.',
  tip3: '<b>امنیت توکن:</b> اگر توکن جایی فاش شد، در @BotFather با <span class="code">/revoke</span> توکن تازه بگیرید و با <span class="code">npx wrangler secret put TG_BOT_TOKEN</span> جایگزین کنید؛ ربات خودکار دوباره تنظیم می‌شود.',
  tip4: '<b>ظاهر:</b> با <span class="code">/setuserpic</span> عکس ربات و با <span class="code">/setjoingroups</span> → Disable جلوی اضافه شدن به گروه‌ها را بگیرید.',
  s_reg: 'ثبت‌نام کاربر جدید در سایت', s_regS: 'اگر خاموش باشد فقط کاربران فعلی می‌توانند وارد شوند (ربات تلگرام همچنان کار می‌کند).', s_guest: 'استفادهٔ بدون حساب', s_guestS: 'گزینهٔ «استفاده بدون حساب» در صفحهٔ ورود نمایش داده شود.',
  s_maint: 'حالت تعمیر و نگهداری', s_maintS: 'همگام‌سازی و ورود موقتاً بسته می‌شود و ربات برای همه به‌جز مدیر پیام تعمیر نشان می‌دهد.', s_maintMsg: 'پیام حالت تعمیر (اختیاری)',
  s_notice: 'اطلاعیه', s_noticeS: 'بالای صفحهٔ اپ نمایش داده می‌شود (کاربر می‌تواند ببندد).', s_noticeText: 'متن اطلاعیه (خالی = بدون اطلاعیه)', s_noticeBot: 'در صفحهٔ اصلی ربات هم نشان داده شود',
  lv_info: 'اطلاع', lv_success: 'موفق', lv_warning: 'هشدار', lv_danger: 'مهم',
  sec_admins: 'مدیران مجاز', sec_life: 'عمر نشست مدیر', sec_denied: 'تلاش ناموفق ۲۴ ساعت', sec_rl: 'IP/حساب محدودشده', sec_sess: 'نشست‌های فعال پنل', sec_cur: 'همین دستگاه', sec_revoke: 'بستن', sec_revokeAll: 'خروج همهٔ نشست‌های دیگر',
  sec_log: 'گزارش فعالیت‌ها', sec_clear: 'پاک کردن محدودیت‌های ورود', sec_note: 'دسترسی فقط با شناسهٔ تلگرام مدیر · نشست‌ها حداکثر ۱۲ ساعت · ورود ناموفق ثبت و پس از ۸ تلاش، ۱۰ دقیقه مسدود می‌شود · همهٔ تغییرات ثبت می‌شوند.',
  lf_all: 'همه', lf_login: 'ورودها', lf_denied: 'تلاش‌های ناموفق', lf_user: 'کاربران', lf_broadcast: 'پیام همگانی', lf_settings: 'تنظیمات', lf_word: 'لغات', noLog: 'موردی ثبت نشده',
  err_network: 'اتصال به سرور برقرار نشد.', err_server_error: 'خطای سرور', err_forbidden: 'دسترسی ندارید.', err_unauthorized: 'لطفاً دوباره وارد شوید.', err_session_expired: 'نشست ۱۲ ساعته تمام شد؛ دوباره وارد شوید.',
  err_too_many_attempts: 'تلاش زیاد؛ ۱۰ دقیقهٔ دیگر امتحان کنید.', err_wrong_credentials: 'ایمیل/موبایل یا رمز اشتباه است.', err_bad_login: 'ایمیل یا موبایل معتبر نیست.', err_bad_email: 'ایمیل معتبر نیست.',
  err_required: 'این بخش را پر کنید.', err_weak_password: 'رمز باید حداقل ۶ کاراکتر باشد.', err_login_required: 'این کاربر ایمیل/موبایل ندارد.', err_no_telegram: 'این کاربر تلگرام ندارد.', err_bot_blocked: 'کاربر ربات را بسته است.',
  err_telegram_error: 'خطای تلگرام', err_cannot_change_admin: 'روی حساب مدیر نمی‌شود این کار را کرد.', err_bad_url: 'آدرس دکمه باید با https:// شروع شود.', err_duplicate: 'این لغت در این دسته وجود دارد.',
  err_telegram_not_configured: 'ربات تنظیم نشده است.', err_bad_token: 'توکن نامعتبر است.', err_token_in_secret: 'توکن در Cloudflare Secret است؛ از wrangler عوض کنید.', err_not_found: 'پیدا نشد.', err_word_required: 'لغت را بنویسید.', err_meaning_required: 'معنی فارسی لازم است.', err_bad_pos: 'نوع کلمه نامعتبر است.', err_bad_category_or_level: 'دسته یا سطح نامعتبر است.',
  act_login: 'ورود به پنل', act_logout: 'خروج از پنل', act_link_created: 'ساخت لینک ورود', act_denied_telegram: 'تلاش ورود ناموفق (تلگرام)', act_denied_code: 'لینک ورود نامعتبر', act_denied_password: 'ورود با رمز رد شد',
  'act_user.message': 'پیام به کاربر', 'act_user.password': 'تغییر رمز کاربر', 'act_user.logout': 'خروج اجباری کاربر', 'act_user.block': 'مسدود کردن کاربر', 'act_user.unblock': 'رفع مسدودی', 'act_user.reset': 'صفر کردن پیشرفت', 'act_user.delete': 'حذف کاربر',
  'act_users.export': 'خروجی کاربران', 'act_words.export': 'خروجی لغات', 'act_word.create': 'افزودن لغت', 'act_word.update': 'ویرایش لغت', 'act_word.hide': 'پنهان کردن لغت', 'act_word.delete': 'حذف لغت', 'act_word.import': 'وارد کردن لغات',
  'act_broadcast.start': 'شروع پیام همگانی', 'act_broadcast.cancel': 'توقف پیام همگانی', 'act_telegram.setup': 'تنظیم ربات', 'act_settings.update': 'تغییر تنظیمات', 'act_security.revoke': 'بستن نشست‌ها', 'act_security.clear_rate_limits': 'پاک کردن محدودیت‌ها',
  theme: 'تم', lang: 'English', ago_now: 'همین الان', ago_m: '{n} دقیقه پیش', ago_h: '{n} ساعت پیش', ago_d: '{n} روز پیش',
},
en: {
  panel: 'Admin panel', sendBtn: 'Send', app: 'VajeYar', dash: 'Dashboard', users: 'Users', words: 'Word bank', bc: 'Broadcast', bot: 'Telegram bot', settings: 'App settings', security: 'Security',
  loading: 'Loading…', retry: 'Retry', save: 'Save', cancel: 'Cancel', close: 'Close', confirm: 'Confirm', del: 'Delete', edit: 'Edit', add: 'Add', search: 'Search…', yes: 'Yes', back: 'Back',
  logout: 'Sign out', expiresIn: '{h} left', hours: '{n} h', minutes: '{n} min', signedAs: 'Signed in as', today: 'Today', d7: '7 days', d30: '30 days', total: 'Total',
  loginT: 'Admin sign-in', loginS: 'This panel opens only for the admin’s Telegram account.',
  way1: '<b>Inside Telegram (recommended):</b> send <span class="code">/admin</span> to {bot} and tap “Open admin panel”.',
  way2: '<b>In a browser:</b> in the bot send <span class="code">/admin</span> → “One-time browser sign-in link”. It works once, for 5 minutes.',
  way3: '<b>Password:</b> only for a site account that is linked to the admin Telegram.', pwLogin: 'Sign in with email/mobile & password', idL: 'Email or mobile', passL: 'Password', signIn: 'Sign in',
  deniedT: 'Access denied', deniedS: 'This panel is only available to the owner of VajeYar. This attempt was logged.', expired: 'Your session ended; please sign in again.', reopen: 'The Telegram session is old; reopen the panel from the bot.',
  k_users: 'Users', k_active: 'Active today', k_tg: 'Telegram users', k_reviews: 'Reviews today', k_learned: 'Words learned', k_words: 'Words in bank', k_quiz: 'Quizzes', k_new30: 'New in 30 days',
  s_new: '+{a} today · +{b} this week', s_act: '7d {a} · 30d {b}', s_tg: 'linked {a} · Telegram-only {b}', s_rev: 'total {a}', s_learn: 'mastered {a}', s_words: 'personal words {a}', s_quiz: '', s_new30: 'blocked the bot {a}',
  ch_act: 'Activity — last 30 days', ch_sign: 'Sign-ups', ch_plat: 'Users by account type', ch_top: 'Top learners', ch_recent: 'Newest users', ch_cats: 'Words per category',
  lg_rev: 'Reviews', lg_users: 'Active users', lg_web: 'Web/desktop', lg_tg: 'Telegram', p_web: 'Site only', p_tg: 'Telegram only', p_linked: 'Site + Telegram',
  q_bc: 'New broadcast', q_word: 'Add a word', q_bot: 'Bot status', xp: 'XP', learned: 'learned', streak: 'streak', lastAct: 'Last active', joined: 'Joined', never: 'never',
  f_all: 'All', f_telegram: 'Telegram', f_web: 'Site only', f_tg: 'Telegram only', f_linked: 'Linked', f_active7: 'Active 7d', f_inactive: 'Inactive', f_new7: 'New', f_blocked: 'Blocked', f_bot_blocked: 'Blocked the bot',
  so_recent: 'Last activity', so_new: 'Newest', so_old: 'Oldest', so_xp: 'Most XP', so_learned: 'Most words', export: 'Export CSV', exportTg: 'Send the file to my Telegram', sentTg: 'File sent to you on Telegram ✓',
  nUsers: '{n} users', page: 'Page {a} of {b}', prev: 'Previous', next: 'Next', noUsers: 'No users found', admin: 'admin', blocked: 'blocked', botBlocked: 'blocked bot', tgOnly: 'Telegram', web: 'Site', linked: 'Linked',
  u_mastered: 'Mastered', u_due: 'Due now', u_reviews: 'Reviews', u_days: 'Active days', u_quiz: 'Quizzes', u_custom: 'Personal words', u_ach: 'Badges', u_sessions: 'Signed-in devices', u_best: 'best',
  u_email: 'Email', u_phone: 'Mobile', u_tg: 'Telegram', u_lang: 'Language', u_track: 'Track', u_goal: 'Daily goal', u_lastLogin: 'Last sign-in', u_lastSync: 'Last sync', u_lastBot: 'Last bot use', u_act30: 'Reviews — last 30 days', u_quizzes: 'Recent quizzes',
  a_msg: 'Message on Telegram', a_pass: 'Set a new password', a_logout: 'Sign out everywhere', a_block: 'Block', a_unblock: 'Unblock', a_reset: 'Reset progress', a_delete: 'Delete account',
  msgT: 'Message to {n}', msgS: 'Sent by the bot. Telegram HTML formatting is allowed.', withApp: 'Add an “Open VajeYar” button', sent: 'Sent ✓',
  passT: 'New password for {n}', passS: 'All of this user’s sessions will be signed out.', newPass: 'New password (min. 6 characters)', gen: 'Generate random',
  logoutQ: 'Sign this user out on every device?', blockQ: 'Block {n}? They are signed out everywhere and the bot stops working for them.', unblockQ: 'Unblock {n}?',
  resetQ: 'All progress, reviews and personal words of {n} will be erased. This can’t be undone.', deleteQ: 'The account of {n} and all its data will be deleted forever.', typeDel: 'Type “{w}” to confirm', delWord: 'DELETE',
  done: 'Done ✓', saved: 'Saved ✓', copied: 'Copied ✓',
  w_all: 'All', w_active: 'Active', w_deleted: 'Hidden', w_cat: 'All categories', w_level: 'All levels', w_add: 'New word', w_import: 'Import', w_word: 'Word', w_pos: 'Type', w_fa: 'Persian meaning', w_def: 'English definition', w_ex: 'Example',
  w_catL: 'Category', w_levelL: 'Level', w_activeL: 'Visible in the apps', w_hide: 'Hide', w_restore: 'Restore', w_delQ: 'Delete “{w}” forever? Users’ progress on this word stops counting.', nWords: '{n} words', noWords: 'No words found',
  imp_t: 'Import words', imp_s: 'One word per line: <span class="code">word | pos | meaning | definition | example</span> — CSV with a header row (word,pos,meaning_fa,definition,example,category,level) also works.',
  imp_up: 'Update words that already exist', imp_go: 'Import', imp_res: '{a} new · {b} updated · {c} skipped', imp_err: '{n} lines had errors', w_inact: 'Include hidden words',
  bc_new: 'Write a broadcast', bc_text: 'Message', bc_ph: 'Hi! 👋\nNew IELTS words were added…', bc_aud: 'Audience', bc_btn: 'Link button (optional)', bc_btnText: 'Button text', bc_btnUrl: 'URL https://…', bc_app: '“Open VajeYar” app button',
  bc_test: 'Send a test to me', bc_send: 'Send to {n} people', bc_prev: 'Telegram preview', bc_hist: 'Previous broadcasts', bc_none: 'No broadcasts yet', bc_sendQ: 'Send this message to {n} Telegram users?',
  bc_testOk: 'Test message sent to your Telegram ✓', bc_cancel: 'Stop', bc_resume: 'Resume', bc_sent: 'sent', bc_failed: 'failed', bc_blocked: 'blocked the bot', bc_of: 'of {n}',
  st_running: 'sending', st_done: 'finished', st_cancelled: 'stopped', bc_note: 'Messages go out in batches of 25. If you close this page, sending continues automatically every 15 minutes.',
  au_all: 'All Telegram users', au_active7: 'Active in the last 7 days', au_inactive7: 'Inactive for 7 days', au_linked: 'Linked to a site account', au_tg_only: 'Telegram only', nPeople: '{n} people', chars: '{a} / 4000',
  b_status: 'Bot status', b_ok: 'The bot is connected and running', b_bad: 'The webhook is not set correctly', b_none: 'The bot is not set up yet', b_user: 'Username', b_name: 'Name', b_hook: 'Webhook', b_pending: 'Pending updates', b_err: 'Last error', b_setupAt: 'Last automatic setup',
  b_open: 'Open the bot', b_copyApp: 'Copy app link', b_resetup: 'Set up again (webhook, commands, menu)', b_admins: 'Admin Telegram ids', b_secret: 'The bot token is stored as a Cloudflare secret and is never shown in the panel.',
  b_tips: 'BotFather tips', b_tok: 'New bot token', b_tokS: 'Only when the token isn’t a Cloudflare secret.', b_inline: 'Inline mode', on: 'on', off: 'off',
  tip1: '<b>Direct app link:</b> in @BotFather send <span class="code">/newapp</span>, pick the bot and enter <span class="code">{app}</span> to get a link like <span class="code">t.me/{bot}/app</span>.',
  tip2: '<b>Look words up in any chat:</b> enable <span class="code">/setinline</span> in @BotFather, then type <span class="code">@{bot} word</span> in any chat.',
  tip3: '<b>Token safety:</b> if the token leaks, get a new one with <span class="code">/revoke</span> in @BotFather and replace it with <span class="code">npx wrangler secret put TG_BOT_TOKEN</span>; the bot sets itself up again automatically.',
  tip4: '<b>Looks:</b> <span class="code">/setuserpic</span> sets the bot photo; <span class="code">/setjoingroups</span> → Disable keeps it out of groups.',
  s_reg: 'New sign-ups on the site', s_regS: 'When off, only existing users can sign in (the Telegram bot keeps working).', s_guest: 'Use without an account', s_guestS: 'Show “Use without an account” on the sign-in screen.',
  s_maint: 'Maintenance mode', s_maintS: 'Sync and sign-in pause and the bot shows a maintenance message to everyone except the admin.', s_maintMsg: 'Maintenance message (optional)',
  s_notice: 'Announcement', s_noticeS: 'Shown at the top of the app (users can dismiss it).', s_noticeText: 'Announcement text (empty = none)', s_noticeBot: 'Also show it on the bot’s home screen',
  lv_info: 'Info', lv_success: 'Success', lv_warning: 'Warning', lv_danger: 'Important',
  sec_admins: 'Allowed admins', sec_life: 'Admin session lifetime', sec_denied: 'Denied attempts, 24h', sec_rl: 'Rate-limited IPs/accounts', sec_sess: 'Active panel sessions', sec_cur: 'this device', sec_revoke: 'Revoke', sec_revokeAll: 'Sign out all other sessions',
  sec_log: 'Audit log', sec_clear: 'Clear sign-in rate limits', sec_note: 'Access only with the admin Telegram id · sessions last at most 12 hours · failed sign-ins are logged and blocked for 10 minutes after 8 tries · every change is audited.',
  lf_all: 'All', lf_login: 'Sign-ins', lf_denied: 'Denied', lf_user: 'Users', lf_broadcast: 'Broadcasts', lf_settings: 'Settings', lf_word: 'Words', noLog: 'Nothing logged',
  err_network: 'Can’t reach the server.', err_server_error: 'Server error', err_forbidden: 'Access denied.', err_unauthorized: 'Please sign in again.', err_session_expired: 'The 12-hour session ended; please sign in again.',
  err_too_many_attempts: 'Too many attempts; try again in 10 minutes.', err_wrong_credentials: 'Wrong email/mobile or password.', err_bad_login: 'Not a valid email or mobile number.', err_bad_email: 'Not a valid email.',
  err_required: 'Please fill this in.', err_weak_password: 'Password must be at least 6 characters.', err_login_required: 'This user has no email/mobile.', err_no_telegram: 'This user has no Telegram.', err_bot_blocked: 'The user has blocked the bot.',
  err_telegram_error: 'Telegram error', err_cannot_change_admin: 'Not allowed on the admin account.', err_bad_url: 'The button URL must start with https://', err_duplicate: 'This word already exists in that category.',
  err_telegram_not_configured: 'The bot is not set up.', err_bad_token: 'Invalid token.', err_token_in_secret: 'The token is a Cloudflare secret; change it with wrangler.', err_not_found: 'Not found.', err_word_required: 'Enter the word.', err_meaning_required: 'A Persian meaning is required.', err_bad_pos: 'Invalid part of speech.', err_bad_category_or_level: 'Invalid category or level.',
  act_login: 'Panel sign-in', act_logout: 'Panel sign-out', act_link_created: 'Sign-in link created', act_denied_telegram: 'Denied sign-in (Telegram)', act_denied_code: 'Invalid sign-in link', act_denied_password: 'Denied password sign-in',
  'act_user.message': 'Messaged a user', 'act_user.password': 'Changed a user password', 'act_user.logout': 'Signed a user out', 'act_user.block': 'Blocked a user', 'act_user.unblock': 'Unblocked a user', 'act_user.reset': 'Reset progress', 'act_user.delete': 'Deleted a user',
  'act_users.export': 'Exported users', 'act_words.export': 'Exported words', 'act_word.create': 'Added a word', 'act_word.update': 'Edited a word', 'act_word.hide': 'Hid a word', 'act_word.delete': 'Deleted a word', 'act_word.import': 'Imported words',
  'act_broadcast.start': 'Started a broadcast', 'act_broadcast.cancel': 'Stopped a broadcast', 'act_telegram.setup': 'Bot setup', 'act_settings.update': 'Changed settings', 'act_security.revoke': 'Revoked sessions', 'act_security.clear_rate_limits': 'Cleared rate limits',
  theme: 'Theme', lang: 'فارسی', ago_now: 'just now', ago_m: '{n} min ago', ago_h: '{n} h ago', ago_d: '{n} d ago',
}};
const t = (k, v) => { let s = (L[S.lang] || L.fa)[k]; if (s == null) s = L.en[k] != null ? L.en[k] : k; if (v) for (const x in v) s = s.split('{' + x + '}').join(v[x]); return s; };
const fa = () => S.lang === 'fa';
const N = n => new Intl.NumberFormat(fa() ? 'fa-IR' : 'en-US').format(n || 0);
const dt = (ms, withTime = true) => !ms ? t('never') : new Intl.DateTimeFormat(fa() ? 'fa-IR-u-ca-persian' : 'en-GB', { timeZone: 'Asia/Tehran', year: 'numeric', month: 'short', day: 'numeric', ...(withTime ? { hour: '2-digit', minute: '2-digit' } : {}) }).format(new Date(ms));
const dayLabel = d => new Intl.DateTimeFormat(fa() ? 'fa-IR-u-ca-persian' : 'en-GB', { month: 'short', day: 'numeric', timeZone: 'UTC' }).format(new Date(d + 'T12:00:00Z'));
function ago(ms) {
  if (!ms) return t('never');
  const s = (Date.now() - ms) / 1000;
  if (s < 90) return t('ago_now'); if (s < 3600) return t('ago_m', { n: N(Math.round(s / 60)) });
  if (s < 86400) return t('ago_h', { n: N(Math.round(s / 3600)) }); if (s < 30 * 86400) return t('ago_d', { n: N(Math.round(s / 86400)) });
  return dt(ms, false);
}
const dayAgo = d => { if (!d) return t('never'); const ms = Date.parse(d + 'T12:00:00Z'); return Date.now() - ms < 86400000 ? t('today') : ago(ms); };

/* ---------- icons ---------- */
const IC = {
  dash: '<rect x="3" y="3" width="7" height="9" rx="2"/><rect x="14" y="3" width="7" height="5" rx="2"/><rect x="14" y="12" width="7" height="9" rx="2"/><rect x="3" y="16" width="7" height="5" rx="2"/>',
  users: '<circle cx="9" cy="8" r="4"/><path d="M2 21a7 7 0 0 1 14 0"/><path d="M16 3.5a4 4 0 0 1 0 8"/><path d="M22 21a7 7 0 0 0-4-6.3"/>',
  user: '<circle cx="12" cy="8" r="4"/><path d="M4 21a8 8 0 0 1 16 0"/>',
  book: '<path d="M4 19.5A2.5 2.5 0 0 1 6.5 17H20V3H6.5A2.5 2.5 0 0 0 4 5.5z"/><path d="M4 19.5A2.5 2.5 0 0 0 6.5 22H20v-5"/>',
  mega: '<path d="m3 11 15-7v16L3 13z"/><path d="M11.6 16.8a3 3 0 1 1-5.8-1.6"/>',
  send: '<path d="m22 2-7 20-4-9-9-4z"/><path d="M22 2 11 13"/>',
  sliders: '<path d="M4 21v-7M4 10V3M12 21v-9M12 8V3M20 21v-5M20 12V3M1 14h6M9 8h6M17 16h6"/>',
  shield: '<path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/><path d="m9 12 2 2 4-4"/>',
  search: '<circle cx="11" cy="11" r="7"/><path d="m21 21-4.3-4.3"/>', plus: '<path d="M12 5v14M5 12h14"/>', x: '<path d="M18 6 6 18M6 6l12 12"/>', check: '<path d="M20 6 9 17l-5-5"/>',
  edit: '<path d="M12 20h9"/><path d="M16.5 3.5a2.1 2.1 0 0 1 3 3L7 19l-4 1 1-4z"/>', trash: '<path d="M3 6h18M8 6V4h8v2M19 6l-1 14H6L5 6"/>',
  eye: '<path d="M2 12s3.5-7 10-7 10 7 10 7-3.5 7-10 7S2 12 2 12z"/><circle cx="12" cy="12" r="3"/>', eyeOff: '<path d="M3 3l18 18"/><path d="M10.6 5.1A10 10 0 0 1 12 5c6.5 0 10 7 10 7a17 17 0 0 1-3.2 4.1M6.6 6.6C3.8 8.4 2 12 2 12s3.5 7 10 7a9.6 9.6 0 0 0 5.4-1.6"/>',
  download: '<path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><path d="m7 10 5 5 5-5M12 15V3"/>', upload: '<path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><path d="m17 8-5-5-5 5M12 3v12"/>',
  refresh: '<path d="M21 12a9 9 0 1 1-2.6-6.4L21 8"/><path d="M21 3v5h-5"/>', logout: '<path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"/><path d="m16 17 5-5-5-5M21 12H9"/>',
  sun: '<circle cx="12" cy="12" r="4"/><path d="M12 2v2M12 20v2M4.9 4.9l1.4 1.4M17.7 17.7l1.4 1.4M2 12h2M20 12h2M4.9 19.1l1.4-1.4M17.7 6.3l1.4-1.4"/>', moon: '<path d="M21 12.8A9 9 0 1 1 11.2 3a7 7 0 0 0 9.8 9.8z"/>',
  globe: '<circle cx="12" cy="12" r="10"/><path d="M2 12h20M12 2a15 15 0 0 1 0 20M12 2a15 15 0 0 0 0 20"/>', lock: '<rect x="4" y="10" width="16" height="11" rx="3"/><path d="M8 10V7a4 4 0 0 1 8 0v3"/>',
  key: '<circle cx="7.5" cy="15.5" r="4.5"/><path d="m10.7 12.3 9.8-9.8M17 6l3 3M14 9l2 2"/>', mail: '<rect x="3" y="5" width="18" height="14" rx="3"/><path d="m3.5 7 8.5 6 8.5-6"/>',
  phone: '<rect x="6" y="2" width="12" height="20" rx="3"/><path d="M11 18h2"/>', msg: '<path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/>',
  ban: '<circle cx="12" cy="12" r="10"/><path d="m4.9 4.9 14.2 14.2"/>', undo: '<path d="M3 7v6h6"/><path d="M21 17a9 9 0 0 0-15-6.7L3 13"/>', zap: '<path d="M13 2 3 14h9l-1 8 10-12h-9z"/>',
  flame: '<path d="M8.5 14.5A2.5 2.5 0 0 0 11 12c0-1.4-.5-2-1-3-1.1-2.1-.2-4 2-6 .5 2.5 2 4.9 4 6.5 2 1.6 3 3.5 3 5.5a7 7 0 1 1-14 0c0-1.2.4-2.3 1-3.3.3 1.5 1.2 2.8 2.5 2.8z"/>',
  star: '<path d="m12 2 3.1 6.3 6.9 1-5 4.9 1.2 6.8L12 17.8 5.8 21l1.2-6.8-5-4.9 6.9-1z"/>', trophy: '<path d="M8 21h8M12 17v4M7 4h10v5a5 5 0 0 1-10 0z"/><path d="M17 5h3v2a3 3 0 0 1-3 3M7 5H4v2a3 3 0 0 0 3 3"/>',
  clock: '<circle cx="12" cy="12" r="10"/><path d="M12 6v6l4 2"/>', alert: '<path d="M10.3 3.9 1.8 18a2 2 0 0 0 1.7 3h17a2 2 0 0 0 1.7-3L13.7 3.9a2 2 0 0 0-3.4 0z"/><path d="M12 9v4M12 17h.01"/>',
  link: '<path d="M10 13a5 5 0 0 0 7.5.5l3-3a5 5 0 0 0-7-7l-1.7 1.7"/><path d="M14 11a5 5 0 0 0-7.5-.5l-3 3a5 5 0 0 0 7 7l1.7-1.7"/>', copy: '<rect x="9" y="9" width="13" height="13" rx="2"/><path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"/>',
  ext: '<path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6M15 3h6v6M10 14 21 3"/>', activity: '<path d="M22 12h-4l-3 9L9 3l-3 9H2"/>', brain: '<path d="M9.5 2A2.5 2.5 0 0 1 12 4.5v15a2.5 2.5 0 0 1-4.96.44 2.5 2.5 0 0 1-2.96-3.08 3 3 0 0 1-.34-5.58 2.5 2.5 0 0 1 1.32-4.24 2.5 2.5 0 0 1 4.44-2.04Z"/><path d="M14.5 2A2.5 2.5 0 0 0 12 4.5v15a2.5 2.5 0 0 0 4.96.44 2.5 2.5 0 0 0 2.96-3.08 3 3 0 0 0 .34-5.58 2.5 2.5 0 0 0-1.32-4.24 2.5 2.5 0 0 0-4.44-2.04Z"/>',
  quiz: '<circle cx="12" cy="12" r="10"/><path d="M9.1 9a3 3 0 0 1 5.8 1c0 2-3 3-3 3M12 17h.01"/>', userPlus: '<circle cx="9" cy="8" r="4"/><path d="M2 21a7 7 0 0 1 14 0M19 8v6M16 11h6"/>', play: '<path d="m6 4 14 8-14 8z"/>', stop: '<rect x="5" y="5" width="14" height="14" rx="2"/>',
  bold: '<path d="M6 4h8a4 4 0 0 1 0 8H6zM6 12h9a4 4 0 0 1 0 8H6z"/>', chevron: '<path d="m9 18 6-6-6-6"/>', device: '<rect x="2" y="4" width="20" height="13" rx="2"/><path d="M8 21h8M12 17v4"/>',
};
const ic = (n, cls = '') => `<svg class="i ${cls}" viewBox="0 0 24 24" aria-hidden="true">${IC[n] || ''}</svg>`;
const COLORS = ['#8B6CF6', '#229ED9', '#16A34A', '#E2558E', '#D97706', '#0EA5A4', '#2F80ED', '#E5484D'];
const avatar = (u, cls = '') => { const nm = (u.display_name || u.name || u.tg_name || u.email || u.tg_username || '?').trim(); return `<div class="av ${cls}" style="background:${COLORS[(u.id || 0) % COLORS.length]}">${esc(nm.charAt(0).toUpperCase() || '?')}</div>`; };
const loginOf = u => u.email || u.phone || (u.tg_username ? '@' + u.tg_username : u.telegram_id ? 'tg:' + u.telegram_id : '#' + u.id);
const nameOf = u => u.display_name || u.name || u.tg_name || loginOf(u);

/* ---------- API ---------- */
async function api(path, { method = 'GET', body, raw = false } = {}) {
  const h = { Accept: 'application/json' };
  if (body !== undefined) h['Content-Type'] = 'application/json';
  if (S.token) h.Authorization = 'Bearer ' + S.token;
  let r;
  try { r = await fetch('/api/admin' + path, { method, headers: h, body: body !== undefined ? JSON.stringify(body) : undefined, cache: 'no-store', credentials: 'omit' }); }
  catch (e) { const x = new Error('network'); x.code = 'network'; throw x; }
  if (raw && r.ok) return r;
  let j = null; try { j = await r.json(); } catch (e) {}
  if (!r.ok) {
    const x = new Error((j && j.error) || 'server_error'); x.code = x.message; x.status = r.status; x.detail = j && j.detail;
    if (r.status === 401 && S.me && !path.startsWith('/auth/')) { dropToken(); S.me = null; showLogin(t(x.code === 'session_expired' ? 'err_session_expired' : 'expired')); }
    throw x;
  }
  return j;
}
const errText = e => (t('err_' + (e && e.code)) !== 'err_' + (e && e.code) ? t('err_' + e.code) : (e && e.code) || 'error') + (e && e.detail ? ` — ${e.detail}` : '');
const setToken = tk => { S.token = tk; try { sessionStorage.setItem(TOK, tk); } catch (e) {} };
const dropToken = () => { S.token = null; try { sessionStorage.removeItem(TOK); } catch (e) {} };

/* ---------- feedback ---------- */
function haptic(kind) { try { if (tg && tg.HapticFeedback) kind === 'sel' ? tg.HapticFeedback.selectionChanged() : tg.HapticFeedback.notificationOccurred(kind); } catch (e) {} }
function toast(msg, kind = '') {
  const box = $('#toasts'), d = document.createElement('div');
  d.className = 'toast ' + kind; d.textContent = msg; box.appendChild(d);
  if (kind === 'ok') haptic('success'); else if (kind === 'err') haptic('error');
  setTimeout(() => { d.style.opacity = '0'; d.style.transition = '.3s'; setTimeout(() => d.remove(), 300); }, kind === 'err' ? 4200 : 2600);
}
const fail = e => toast(errText(e), 'err');

/* ---------- layers (modal / drawer) + Telegram back button ---------- */
const layers = [];
function syncBack() { if (!tg || !tg.BackButton) return; layers.length ? tg.BackButton.show() : tg.BackButton.hide(); }
function pushLayer(el, ov, onClose) { layers.push({ el, ov, onClose }); syncBack(); }
function closeTop() { const l = layers.pop(); if (!l) return; l.el.remove(); if (l.ov) l.ov.remove(); if (l.onClose) l.onClose(); syncBack(); }
function closeAll() { while (layers.length) closeTop(); }
function modal(html, { onClose, wide } = {}) {
  const ov = document.createElement('div'); ov.className = 'ov modal-ov';
  const m = document.createElement('div'); m.className = 'modal'; if (wide) m.style.width = 'min(760px, calc(100% - 24px))';
  m.innerHTML = html; ov.onclick = closeTop;
  document.body.append(ov, m); pushLayer(m, ov, onClose);
  setTimeout(() => { const f = m.querySelector('[autofocus], input, textarea'); if (f && !('ontouchstart' in window)) f.focus(); }, 60);
  return m;
}
function drawer(html) {
  const ov = document.createElement('div'); ov.className = 'ov';
  const d = document.createElement('div'); d.className = 'drawer'; d.innerHTML = html; ov.onclick = closeTop;
  document.body.append(ov, d); pushLayer(d, ov); return d;
}
/** confirm dialog; with `word` the admin must type it */
function ask(title, text, { danger = false, word = '', ok } = {}) {
  return new Promise(res => {
    let done = false;
    const m = modal(`<h2>${danger ? ic('alert') : ic('check')} ${esc(title)}</h2><p class="muted" style="line-height:1.9">${esc(text)}</p>
      ${word ? `<label class="field"><span>${esc(t('typeDel', { w: word }))}</span><input class="input" id="ask-w" autocomplete="off" dir="auto"></label>` : ''}
      <div class="acts"><button class="btn ghost" data-x="no">${t('cancel')}</button><button class="btn ${danger ? 'danger' : 'primary'}" data-x="yes" ${word ? 'disabled' : ''}>${esc(ok || t('confirm'))}</button></div>`,
      { onClose: () => { if (!done) res(false); } });
    const yes = m.querySelector('[data-x=yes]');
    if (word) m.querySelector('#ask-w').oninput = e => { yes.disabled = e.target.value.trim().toUpperCase() !== word.toUpperCase(); };
    m.querySelector('[data-x=no]').onclick = () => closeTop();
    yes.onclick = () => { done = true; closeTop(); res(true); };
  });
}
async function busy(btn, fn) {
  if (btn) { btn.disabled = true; btn.classList.add('loading'); }
  try { return await fn(); } catch (e) { fail(e); return undefined; }
  finally { if (btn && btn.isConnected) { btn.disabled = false; btn.classList.remove('loading'); } }
}
function copy(text) {
  const done = () => toast(t('copied'), 'ok');
  if (navigator.clipboard && window.isSecureContext) navigator.clipboard.writeText(text).then(done, () => fallback());
  else fallback();
  function fallback() { const a = document.createElement('textarea'); a.value = text; document.body.appendChild(a); a.select(); try { document.execCommand('copy'); done(); } catch (e) {} a.remove(); }
}
function openLink(url) { if (tg && /^https:\/\/t\.me\//.test(url) && tg.openTelegramLink) tg.openTelegramLink(url); else if (tg && tg.openLink) tg.openLink(url); else window.open(url, '_blank', 'noopener'); }

/* ---------- theme / language ---------- */
const isDark = () => document.documentElement.dataset.theme === 'dark';
function paintTg() { if (!tg) return; const c = isDark() ? '#0F0D17' : '#F5F3FB'; try { tg.setHeaderColor(c); tg.setBackgroundColor(c); if (tg.setBottomBarColor) tg.setBottomBarColor(c); } catch (e) {} }
function setTheme(dark, save = true) { document.documentElement.dataset.theme = dark ? 'dark' : 'light'; if (save) localStorage.setItem(THK, dark ? 'dark' : 'light'); paintTg(); }
function setLang(l) { S.lang = l; localStorage.setItem(LANGK, l); document.documentElement.lang = l; document.documentElement.dir = l === 'fa' ? 'rtl' : 'ltr'; }
setLang(S.lang);

/* ---------- sign-in screens ---------- */
function bootScreen() { $('#app').innerHTML = `<div class="boot"><div class="logo-mark"></div><div class="spin"></div><div class="muted">${t('loading')}</div></div>`; }
function showLogin(msg = '') {
  closeAll();
  const bot = S.botName ? `<a href="https://t.me/${esc(S.botName)}" target="_blank" rel="noopener" class="en">@${esc(S.botName)}</a>` : t('app');
  $('#app').innerHTML = `<div class="login"><div class="card">
    <div class="row between"><div class="logo-mark sm"></div><div class="row"><button class="btn sm ghost" data-a="lang">${ic('globe')} ${t('lang')}</button><button class="btn sm ghost icon" data-a="theme">${ic(isDark() ? 'sun' : 'moon')}</button></div></div>
    <h1>${t('loginT')}</h1><p class="muted">${t('loginS')}</p>
    ${msg ? `<div class="tip-box warn mt12">${esc(msg)}</div>` : ''}
    <div class="way"><span class="n">1</span><div>${t('way1', { bot })}</div></div>
    <div class="way"><span class="n">2</span><div>${t('way2')}</div></div>
    <div class="way"><span class="n">3</span><div>${t('way3')}</div></div>
    ${tg ? `<button class="btn primary block lg mt16" data-a="tgRetry">${ic('send')} ${t('retry')}</button>` : ''}
    <details class="mt16"><summary class="muted" style="cursor:pointer">${t('pwLogin')}</summary>
      <form id="pw-form" class="mt8" autocomplete="on">
        <label class="field"><span>${t('idL')}</span><input class="input en" id="pw-login" name="username" autocomplete="username" dir="ltr" required></label>
        <label class="field"><span>${t('passL')}</span><input class="input en" id="pw-pass" name="password" type="password" autocomplete="current-password" dir="ltr" required></label>
        <button class="btn primary block mt16" type="submit" id="pw-go">${ic('lock')} ${t('signIn')}</button>
      </form></details>
  </div></div>`;
  $('#pw-form').onsubmit = async e => {
    e.preventDefault();
    await busy($('#pw-go'), async () => {
      const r = await api('/auth/login', { method: 'POST', body: { login: $('#pw-login').value.trim(), password: $('#pw-pass').value } });
      setToken(r.token); await start();
    });
  };
}
function showDenied() {
  closeAll();
  $('#app').innerHTML = `<div class="login"><div class="card" style="text-align:center">
    <div style="width:64px;height:64px;margin:0 auto;border-radius:20px;display:grid;place-items:center;background:var(--red-soft);color:var(--red)">${ic('shield').replace('class="i ', 'style="width:32px;height:32px" class="i ')}</div>
    <h1>${t('deniedT')}</h1><p class="muted" style="line-height:1.9">${t('deniedS')}</p>
    ${tg ? `<button class="btn ghost block mt16" data-a="tgClose">${t('close')}</button>` : `<button class="btn ghost block mt16" data-a="toLogin">${t('back')}</button>`}</div></div>`;
}

/* ---------- start-up ---------- */
async function start() {
  try { S.me = await api('/me'); }
  catch (e) { dropToken(); if (e.status === 403) return showDenied(); return showLogin(e.status === 401 ? '' : errText(e)); }
  S.botName = S.me.bot;
  renderShell();
  route();
}
async function boot() {
  if (tg) {
    document.documentElement.classList.add('in-tg');
    try { tg.ready(); tg.expand(); if (tg.disableVerticalSwipes) tg.disableVerticalSwipes(); } catch (e) {}
    if (!localStorage.getItem(THK)) setTheme(tg.colorScheme === 'dark', false);
    paintTg();
    tg.onEvent('themeChanged', () => { if (!localStorage.getItem(THK)) setTheme(tg.colorScheme === 'dark', false); });
    if (tg.BackButton) tg.BackButton.onClick(() => { if (layers.length) closeTop(); });
    if (!localStorage.getItem(LANGK)) { const lc = tg.initDataUnsafe && tg.initDataUnsafe.user && tg.initDataUnsafe.user.language_code; if (lc && !lc.startsWith('fa')) setLang('en'); }
  }
  const qs = new URLSearchParams(location.search), code = qs.get('code');
  if (code || qs.has('tg') || /^#tgWebApp/.test(location.hash)) { try { history.replaceState(null, '', location.pathname + (/^#\//.test(location.hash) ? location.hash : '')); } catch (e) {} }
  bootScreen();
  try { const c = await fetch('/api/config', { cache: 'no-store' }).then(r => r.json()); S.botName = c.telegram && c.telegram.bot; } catch (e) {}
  try {
    if (code) { dropToken(); const r = await api('/auth/code', { method: 'POST', body: { code } }); setToken(r.token); }
    else if (tg) {
      let ok = false;
      if (S.token) { try { await api('/me'); ok = true; } catch (e) { dropToken(); } }
      if (!ok) { const r = await api('/auth/telegram', { method: 'POST', body: { initData: tg.initData } }); setToken(r.token); }
    }
  } catch (e) {
    if (e.status === 403) return showDenied();
    return showLogin(errText(e));
  }
  if (!S.token) return showLogin();
  start();
}

/* ---------- shell & routing ---------- */
const NAV = [['dash', 'dash'], ['users', 'users'], ['bc', 'mega'], ['words', 'book'], ['bot', 'send'], ['settings', 'sliders'], ['security', 'shield']];
function renderShell() {
  const me = S.me.user, left = Math.max(0, S.me.expires_at - Date.now());
  const nav = cls => NAV.map(([k, i]) => `<button class="${cls}" data-nav="${k}">${ic(i)} <span>${t(k)}</span></button>`).join('');
  $('#app').innerHTML = `<div class="shell">
    <aside class="side"><div class="brand"><div class="logo-mark sm"></div><div><b>${t('app')}</b><small>${t('panel')}</small></div></div>
      ${nav('nav-a')}
      <div class="foot"><div class="row" style="gap:8px">${avatar({ ...me, display_name: me.name })}<div style="min-width:0"><div class="small muted">${t('signedAs')}</div><b class="small">${esc(me.name || (me.telegram && me.telegram.username ? '@' + me.telegram.username : ''))}</b></div></div></div></aside>
    <div class="main">
      <header class="top"><h1 id="ttl"></h1><span class="grow"></span>
        <span class="sess" title="${esc(dt(S.me.expires_at))}">${ic('clock')} <span id="sess-left">${t('expiresIn', { h: fmtLeft(left) })}</span></span>
        <button class="btn sm ghost" data-a="lang">${ic('globe')} <span class="hide-m">${t('lang')}</span></button>
        <button class="btn sm ghost icon" data-a="theme" aria-label="${t('theme')}">${ic(isDark() ? 'sun' : 'moon')}</button>
        <button class="btn sm ghost icon tg-hide" data-a="logout" aria-label="${t('logout')}">${ic('logout')}</button></header>
      <nav class="tabs-m">${nav('')}</nav>
      <div class="page" id="page"></div>
    </div></div>`;
}
function fmtLeft(ms) { const h = Math.floor(ms / 3600000); return h >= 1 ? t('hours', { n: N(h) }) : t('minutes', { n: N(Math.max(1, Math.round(ms / 60000))) }); }
setInterval(() => { if (!S.me) return; const left = S.me.expires_at - Date.now(); const el = $('#sess-left'); if (el) el.textContent = t('expiresIn', { h: fmtLeft(left) }); if (left <= 0) { dropToken(); S.me = null; showLogin(t('err_session_expired')); } }, 30000);

const VIEWS = {};
function route() {
  if (!S.me) return;
  const v = (location.hash.replace(/^#\/?/, '').split('/')[0]) || 'dash';
  S.view = VIEWS[v] ? v : 'dash';
  closeAll();
  document.querySelectorAll('[data-nav]').forEach(b => b.classList.toggle('on', b.dataset.nav === S.view));
  const ttl = $('#ttl'); if (ttl) ttl.textContent = t(S.view);
  const on = document.querySelector('.tabs-m .on'); if (on && on.scrollIntoView) on.scrollIntoView({ block: 'nearest', inline: 'center' });
  const p = $('#page'); p.innerHTML = '<div class="grid"><div class="skel"></div><div class="skel" style="min-height:260px"></div></div>';
  Promise.resolve(VIEWS[S.view](p)).catch(e => { if (S.me) p.innerHTML = `<div class="card empty">${ic('alert')}${esc(errText(e))}<div class="mt12"><button class="btn soft" data-a="reload">${t('retry')}</button></div></div>`; });
  window.scrollTo(0, 0);
}
window.addEventListener('hashchange', route);
const go = v => { if (location.hash === '#/' + v) route(); else location.hash = '#/' + v; };

/* ---------- global actions ---------- */
const ACT = {
  lang: () => { setLang(fa() ? 'en' : 'fa'); if (S.me) { renderShell(); route(); } else showLogin(); },
  theme: () => { setTheme(!isDark()); if (S.me) { const b = document.querySelector('[data-a=theme]'); if (b) b.innerHTML = ic(isDark() ? 'sun' : 'moon'); if (S.view === 'dash') route(); } else showLogin(); },
  logout: async () => { if (!(await ask(t('logout'), t('logout') + '?', { ok: t('logout') }))) return; try { await api('/auth/logout', { method: 'POST', body: {} }); } catch (e) {} dropToken(); S.me = null; showLogin(); },
  reload: () => route(), toLogin: () => showLogin(), tgClose: () => { try { tg.close(); } catch (e) {} },
  tgRetry: () => { dropToken(); boot(); },
};
document.addEventListener('click', e => {
  const n = e.target.closest('[data-nav]'); if (n) { haptic('sel'); return go(n.dataset.nav); }
  const a = e.target.closest('[data-a]'); if (a && ACT[a.dataset.a]) { e.preventDefault(); ACT[a.dataset.a](a, e); }
});
document.addEventListener('keydown', e => { if (e.key === 'Escape' && layers.length) closeTop(); });

/* ---------- charts (plain SVG) ---------- */
function lastDays(today, n = 30) { const out = [], t0 = Date.parse(today + 'T12:00:00Z'); for (let i = n - 1; i >= 0; i--) out.push(new Date(t0 - i * 86400000).toISOString().slice(0, 10)); return out; }
/** bars (+ optional second stacked series) and an optional line, with a hover / tap tooltip */
function barChart(days, rows, { bar, bar2, line, labels }) {
  const map = Object.fromEntries(rows.map(r => [r.day, r]));
  const data = days.map(d => ({ d, b: +((map[d] || {})[bar] || 0), b2: bar2 ? +((map[d] || {})[bar2] || 0) : 0, l: line ? +((map[d] || {})[line] || 0) : 0 }));
  const W_ = 640, H = 190, pl = 6, pr = 6, pt = 12, pb = 4, cw = (W_ - pl - pr) / data.length, bw = Math.max(4, cw * 0.62);
  const maxB = Math.max(1, ...data.map(x => x.b)), maxL = Math.max(1, ...data.map(x => x.l));
  const y = (v, m) => pt + (H - pt - pb) * (1 - v / m);
  const rtl = fa(), X = i => rtl ? W_ - pr - cw * (i + 0.5) : pl + cw * (i + 0.5);
  let g = '';
  for (let k = 0; k <= 3; k++) { const yy = pt + (H - pt - pb) * k / 3; g += `<line class="grid-l" x1="${pl}" x2="${W_ - pr}" y1="${yy}" y2="${yy}"/>`; }
  let bars = '', hits = '', lbl = '';
  data.forEach((x, i) => {
    const cx = X(i), h1 = (H - pt - pb) * (x.b - x.b2) / maxB, h2 = (H - pt - pb) * x.b2 / maxB, base = H - pb;
    if (bar2) { bars += `<rect class="bar b2" x="${cx - bw / 2}" y="${base - h2}" width="${bw}" height="${Math.max(h2, 0)}" rx="2"/>`; bars += `<rect class="bar" x="${cx - bw / 2}" y="${base - h2 - h1}" width="${bw}" height="${Math.max(h1, 0)}" rx="3"/>`; }
    else bars += `<rect class="bar" x="${cx - bw / 2}" y="${base - (H - pt - pb) * x.b / maxB}" width="${bw}" height="${(H - pt - pb) * x.b / maxB}" rx="3"/>`;
    hits += `<rect class="hit" data-i="${i}" x="${cx - cw / 2}" y="0" width="${cw}" height="${H}" fill="transparent"/>`;
    if (i % 5 === 4 || i === data.length - 1) lbl += `<span style="left:${(cx / W_ * 100).toFixed(2)}%">${esc(dayLabel(x.d))}</span>`;
  });
  let ln = '';
  if (line) {
    const pts = data.map((x, i) => `${X(i).toFixed(1)},${y(x.l, maxL).toFixed(1)}`);
    ln = `<path class="area" d="M${pts[0]} L${pts.join(' L')} L${X(data.length - 1)},${H - pb} L${X(0)},${H - pb} Z"/><path class="ln" d="M${pts.join(' L')}"/>` +
      '';
  }
  const id = 'c' + Math.random().toString(36).slice(2, 8);
  setTimeout(() => {
    const box = document.getElementById(id); if (!box) return;
    const tip = box.querySelector('.tip'), svg = box.querySelector('svg');
    const showTip = el => {
      const i = +el.dataset.i, x = data[i], r = svg.getBoundingClientRect(), br = box.getBoundingClientRect();
      tip.innerHTML = `<b>${esc(dayLabel(x.d))}</b><br>${labels[0]}: ${N(x.b)}${bar2 ? `<br>${labels[1]}: ${N(x.b2)}` : ''}${line ? `<br>${labels[bar2 ? 2 : 1]}: ${N(x.l)}` : ''}`;
      tip.style.left = (X(i) / W_ * r.width + (r.left - br.left)) + 'px'; tip.style.top = (y(Math.max(x.b, 0), maxB) / H * r.height) + 'px'; tip.classList.add('on');
    };
    box.querySelectorAll('.hit').forEach(h => { h.addEventListener('pointerenter', () => showTip(h)); h.addEventListener('click', () => showTip(h)); });
    box.addEventListener('pointerleave', () => tip.classList.remove('on'));
  }, 0);
  return `<div class="chart" id="${id}"><svg viewBox="0 0 ${W_} ${H}" preserveAspectRatio="none" style="height:190px">
    <defs><linearGradient id="ga" x1="0" x2="0" y1="0" y2="1"><stop offset="0" stop-color="#16A34A" stop-opacity=".25"/><stop offset="1" stop-color="#16A34A" stop-opacity="0"/></linearGradient></defs>
    ${g}${bars}${ln}${hits}</svg><div class="xlab">${lbl}</div><div class="tip"></div></div>`;
}
function donut(parts) {
  const total = parts.reduce((a, p) => a + p.v, 0) || 1, R = 54, C = 2 * Math.PI * R;
  let off = 0, segs = '';
  for (const p of parts) { const len = C * p.v / total; if (p.v) segs += `<circle r="${R}" cx="70" cy="70" fill="none" stroke="${p.c}" stroke-width="20" stroke-dasharray="${len} ${C - len}" stroke-dashoffset="${-off}" transform="rotate(-90 70 70)"/>`; off += len; }
  return `<div class="donut"><svg viewBox="0 0 140 140"><circle r="${R}" cx="70" cy="70" fill="none" stroke="var(--bg2)" stroke-width="20"/>${segs}
    <text x="70" y="68" text-anchor="middle" font-size="22" font-weight="800" fill="currentColor">${N(parts.reduce((a, p) => a + p.v, 0))}</text><text x="70" y="88" text-anchor="middle" font-size="11" fill="var(--muted)">${t('users')}</text></svg>
    <div class="lg">${parts.map(p => `<div><i style="background:${p.c}"></i>${esc(p.l)}<b class="num">${N(p.v)}</b><span class="muted tiny" style="min-width:3.2em;text-align:end">${N(Math.round(100 * p.v / total))}${fa() ? '٪' : '%'}</span></div>`).join('')}</div></div>`;
}
function spark(days, rows, key) {
  const map = Object.fromEntries(rows.map(r => [r.day, r[key] || 0])), vals = days.map(d => map[d] || 0), m = Math.max(1, ...vals), w = 300, h = 60, bw = w / vals.length;
  return `<svg viewBox="0 0 ${w} ${h}" preserveAspectRatio="none" style="width:100%;height:60px;display:block">${vals.map((v, i) => `<rect x="${(fa() ? w - (i + 1) * bw : i * bw) + 1}" y="${h - h * v / m}" width="${bw - 2}" height="${h * v / m}" rx="2" fill="var(--brand)" opacity="${v ? .85 : .15}"><title>${esc(dayLabel(days[i]))}: ${N(v)}</title></rect>`).join('')}</svg>`;
}

/* ---------- dashboard ---------- */
VIEWS.dash = async p => {
  const d = await api('/dashboard'), k = d.kpi, days = lastDays(d.today);
  const kpi = (cls, icon, v, l, s) => `<div class="kpi ${cls}"><div class="ic">${ic(icon)}</div><div class="v num">${N(v)}</div><div class="l">${l}</div><div class="s">${s}</div></div>`;
  const cats = d.categories.map(c => ({ n: fa() ? c.name_fa : c.name_en, v: c.levels.reduce((a, l) => a + l.count, 0), icon: c.icon }));
  const maxC = Math.max(1, ...cats.map(c => c.v));
  p.innerHTML = `
  <div class="kpis">
    ${kpi('', 'users', k.users, t('k_users'), t('s_new', { a: N(k.new_today), b: N(k.new_7d) }))}
    ${kpi('c3', 'activity', k.active_today, t('k_active'), t('s_act', { a: N(k.active_7d), b: N(k.active_30d) }))}
    ${kpi('c2', 'send', k.tg, t('k_tg'), t('s_tg', { a: N(k.linked), b: N(k.tg_only) }))}
    ${kpi('c4', 'refresh', k.reviews_today, t('k_reviews'), t('s_rev', { a: N(k.reviews) }))}
    ${kpi('c5', 'brain', k.learned, t('k_learned'), t('s_learn', { a: N(k.mastered) }))}
    ${kpi('c6', 'book', k.words, t('k_words'), t('s_words', { a: N(k.custom_words) }))}
    ${kpi('c7', 'quiz', k.quizzes, t('k_quiz'), k.broadcasts_running ? `${ic('mega')} ${N(k.broadcasts_running)} ${t('st_running')}` : '&nbsp;')}
    ${kpi('', 'userPlus', k.new_30d, t('k_new30'), t('s_new30', { a: N(k.blocked_bot) }))}
  </div>
  <div class="grid g3 mt16">
    <div class="card span2"><h3>${ic('activity')} ${t('ch_act')}</h3>
      <div class="legend mb8"><span><i style="background:var(--brand)"></i>${t('lg_rev')}</span><span><i style="background:var(--green)"></i>${t('lg_users')}</span></div>
      ${barChart(days, d.daily, { bar: 'reviews', line: 'users', labels: [t('lg_rev'), t('lg_users')] })}</div>
    <div class="card"><h3>${ic('users')} ${t('ch_plat')}</h3>
      ${donut([{ l: t('p_web'), v: k.web_only, c: '#8B6CF6' }, { l: t('p_tg'), v: k.tg_only, c: '#229ED9' }, { l: t('p_linked'), v: k.linked, c: '#16A34A' }])}
      <div class="row mt16"><button class="btn soft sm" data-nav="bc">${ic('mega')} ${t('q_bc')}</button><button class="btn ghost sm" data-a="dashAddWord">${ic('plus')} ${t('q_word')}</button><button class="btn ghost sm" data-nav="bot">${ic('send')} ${t('q_bot')}</button></div></div>
  </div>
  <div class="grid g3 mt16">
    <div class="card"><h3>${ic('userPlus')} ${t('ch_sign')} <span class="muted">· ${t('d30')}</span></h3>
      <div class="legend"><span><i style="background:var(--brand)"></i>${t('lg_web')}</span><span><i style="background:var(--tg)"></i>${t('lg_tg')}</span></div>
      ${barChart(days, d.signups.map(s => ({ day: s.day, n: s.n, tg: s.tg })), { bar: 'n', bar2: 'tg', labels: [t('total'), t('lg_tg')] })}</div>
    <div class="card"><h3>${ic('trophy')} ${t('ch_top')}</h3><div class="list">
      ${d.top.filter(u => u.xp > 0).map((u, i) => `<div class="li" data-a="openUser" data-id="${u.id}"><div class="av" style="background:${['#F5B301', '#A0A6B5', '#CD7F32'][i] || COLORS[u.id % COLORS.length]}">${i < 3 ? ['🥇', '🥈', '🥉'][i] : N(i + 1)}</div>
        <div class="t"><b>${esc(u.name || u.login)}</b><span class="en">${esc(u.login)}</span></div><div class="r"><b class="num">${N(u.xp)}</b> ${t('xp')}<br><span class="muted">${N(u.learned)} ${t('learned')}</span></div></div>`).join('') || `<div class="empty">${ic('trophy')}—</div>`}</div></div>
    <div class="card"><h3>${ic('clock')} ${t('ch_recent')}</h3><div class="list">
      ${d.recent.map(u => `<div class="li" data-a="openUser" data-id="${u.id}">${avatar(u)}<div class="t"><b>${esc(nameOf(u))}</b><span class="en">${esc(loginOf(u))}</span></div><div class="r">${u.telegram_id ? `<span class="badge t">${ic('send')}</span>` : ''} ${ago(u.created_at)}</div></div>`).join('') || `<div class="empty">${ic('users')}—</div>`}</div></div>
  </div>
  <div class="card mt16"><h3>${ic('book')} ${t('ch_cats')}</h3><div class="bars-h">
    ${cats.map(c => `<div class="r"><span>${esc(c.icon)} ${esc(c.n)}</span><div class="t"><i style="width:${100 * c.v / maxC}%"></i></div><b class="num">${N(c.v)}</b></div>`).join('')}</div></div>`;
};
ACT.dashAddWord = () => { go('words'); setTimeout(() => ACT.wordEdit(null), 400); };

/* ---------- users ---------- */
const UF = ['', 'telegram', 'tg', 'web', 'linked', 'active7', 'inactive', 'new7', 'blocked', 'bot_blocked'];
const userBadges = u => [
  u.is_admin ? `<span class="badge p">${ic('shield')} ${t('admin')}</span>` : '',
  u.telegram_id && (u.email || u.phone) ? `<span class="badge g">${ic('link')} ${t('linked')}</span>` : u.telegram_id ? `<span class="badge t">${ic('send')} ${t('tgOnly')}</span>` : `<span class="badge b">${ic('globe')} ${t('web')}</span>`,
  u.blocked ? `<span class="badge r">${ic('ban')} ${t('blocked')}</span>` : '', u.blocked_bot ? `<span class="badge a">${t('botBlocked')}</span>` : ''].join(' ');
VIEWS.users = async p => {
  const f = S.users;
  p.innerHTML = `<div class="card">
    <div class="toolbar"><div class="search">${ic('search')}<input class="input" id="u-q" placeholder="${t('search')}" value="${esc(f.q)}" autocomplete="off"></div>
      <select class="input" id="u-sort" style="width:auto">${['recent', 'new', 'old', 'xp', 'learned'].map(s => `<option value="${s}" ${f.sort === s ? 'selected' : ''}>${t('so_' + s)}</option>`).join('')}</select>
      <button class="btn ghost" data-a="usersExport">${ic('download')} <span class="hide-m">${tg ? t('exportTg') : t('export')}</span></button></div>
    <div class="chips" id="u-f">${UF.map(k => `<button class="chip ${f.filter === k ? 'on' : ''}" data-f="${k}">${t('f_' + (k || 'all'))}</button>`).join('')}</div>
    <div id="u-list" class="mt12"><div class="skel"></div></div></div>`;
  let tm;
  $('#u-q').oninput = e => { clearTimeout(tm); tm = setTimeout(() => { f.q = e.target.value.trim(); f.page = 1; loadUsers(); }, 300); };
  $('#u-sort').onchange = e => { f.sort = e.target.value; f.page = 1; loadUsers(); };
  $('#u-f').onclick = e => { const b = e.target.closest('[data-f]'); if (!b) return; f.filter = b.dataset.f; f.page = 1; $('#u-f').querySelectorAll('.chip').forEach(c => c.classList.toggle('on', c === b)); haptic('sel'); loadUsers(); };
  await loadUsers();
};
async function loadUsers() {
  const f = S.users, box = $('#u-list'); if (!box) return;
  const r = await api(`/users?q=${encodeURIComponent(f.q)}&filter=${f.filter}&sort=${f.sort}&page=${f.page}&size=30`);
  if (!$('#u-list')) return;
  const pages = Math.max(1, Math.ceil(r.total / r.size));
  box.innerHTML = `<div class="muted small">${t('nUsers', { n: N(r.total) })}</div>
    ${r.items.length ? `<div class="list mt8">${r.items.map(u => `<div class="li" data-a="openUser" data-id="${u.id}">${avatar(u)}
      <div class="t"><b>${esc(nameOf(u))} ${u.is_admin ? ic('shield') : ''}</b><span class="en">${esc(loginOf(u))}${u.telegram_id && (u.email || u.phone) && u.tg_username ? ' · @' + esc(u.tg_username) : ''}</span>
        <div class="row mt8" style="gap:5px">${userBadges(u)}</div></div>
      <div class="r"><div><b class="num">${N(u.xp)}</b> ${t('xp')} · ${N(u.learned)} ${t('learned')}</div><div class="muted">${u.streak ? '🔥 ' + N(u.streak) + ' · ' : ''}${dayAgo(u.last_day)}</div><div class="muted tiny hide-m">${t('joined')} ${dt(u.created_at, false)}</div></div></div>`).join('')}</div>`
      : `<div class="empty">${ic('users')}${t('noUsers')}</div>`}
    ${pages > 1 ? `<div class="pager"><button class="btn sm ghost" data-a="uPage" data-d="-1" ${f.page <= 1 ? 'disabled' : ''}>${t('prev')}</button><span>${t('page', { a: N(f.page), b: N(pages) })}</span><button class="btn sm ghost" data-a="uPage" data-d="1" ${f.page >= pages ? 'disabled' : ''}>${t('next')}</button></div>` : ''}`;
}
ACT.uPage = el => { S.users.page += +el.dataset.d; loadUsers().catch(fail); window.scrollTo({ top: 0, behavior: 'smooth' }); };
async function exportFile(kind, extra = '') {
  if (tg) { await api('/export/telegram', { method: 'POST', body: { kind, all: extra === 'all' } }); return toast(t('sentTg'), 'ok'); }
  const r = await api(kind === 'users' ? '/users.csv' : '/words/export.csv' + (extra === 'all' ? '?all=1' : ''), { raw: true });
  const blob = await r.blob(), a = document.createElement('a');
  a.href = URL.createObjectURL(blob); a.download = `vajeyar-${kind}.csv`; document.body.appendChild(a); a.click(); a.remove(); setTimeout(() => URL.revokeObjectURL(a.href), 4000);
}
ACT.usersExport = el => busy(el, () => exportFile('users'));

ACT.openUser = async el => {
  const id = +el.dataset.id;
  const d = drawer(`<div class="dh"><button class="btn sm ghost icon" data-a="closeTop">${ic('x')}</button><b class="grow">${t('users')} #${N(id)}</b></div><div class="db"><div class="skel"></div><div class="skel mt12" style="min-height:200px"></div></div>`);
  try { renderUser(d, await api('/users/' + id)); } catch (e) { d.querySelector('.db').innerHTML = `<div class="empty">${ic('alert')}${esc(errText(e))}</div>`; }
};
ACT.closeTop = () => closeTop();
function renderUser(d, r) {
  const u = r.user, s = r.stats, days = lastDays(new Date(Date.now() + 12600000).toISOString().slice(0, 10)), nm = nameOf(u);
  const st = (v, l) => `<div class="stat"><b class="num">${v}</b><span>${l}</span></div>`;
  const kv = (k, v) => v ? `<dt>${k}</dt><dd>${v}</dd>` : '';
  S.cur = u;
  d.innerHTML = `<div class="dh"><button class="btn sm ghost icon" data-a="closeTop">${ic('x')}</button><b class="grow">${esc(nm)}</b><button class="btn sm ghost icon" data-a="userRefresh" data-id="${u.id}">${ic('refresh')}</button></div>
  <div class="db">
    <div class="row" style="gap:14px">${avatar(u, 'lg')}<div class="grow" style="min-width:0"><div style="font-size:18px;font-weight:800">${esc(nm)}</div><div class="muted en small">${esc(loginOf(u))}</div><div class="row mt8" style="gap:5px">${userBadges(u)}</div></div></div>
    <div class="stat-grid mt16">
      ${st(N(u.xp), t('xp'))}${st(N(u.learned), t('learned'))}${st(N(s.mastered), t('u_mastered'))}
      ${st(N(s.due), t('u_due'))}${st(N(s.reviews), t('u_reviews'))}${st('🔥 ' + N(u.streak) + ` <span class="muted tiny">${t('u_best')} ${N(u.best_streak)}</span>`, t('streak'))}
      ${st(N(s.active_days), t('u_days'))}${st(N(s.quizzes) + (s.quiz_avg != null ? ` <span class="muted tiny">${N(s.quiz_avg)}٪</span>` : ''), t('u_quiz'))}${st(N(s.custom), t('u_custom'))}
    </div>
    <div class="card mt16" style="padding:14px"><h3 style="margin-bottom:8px">${ic('activity')} ${t('u_act30')}</h3>${spark(days, r.days, 'reviews')}</div>
    <div class="card mt16" style="padding:14px"><dl class="kv">
      ${kv('ID', `<span class="num">${N(u.id)}</span>`)}${kv(t('u_email'), u.email ? `<span class="en">${esc(u.email)}</span>` : '')}${kv(t('u_phone'), u.phone ? `<span class="en">${esc(u.phone)}</span>` : '')}
      ${kv(t('u_tg'), u.telegram_id ? `<span class="en">${u.tg_username ? '@' + esc(u.tg_username) + ' · ' : ''}${esc(u.telegram_id)}</span>` : '')}
      ${kv(t('u_lang'), u.lang === 'en' ? 'English' : 'فارسی')}${kv(t('u_track'), esc(u.track))}${kv(t('u_goal'), N(u.goal))}${kv(t('u_ach'), N(s.achievements))}${kv(t('u_sessions'), N(s.sessions))}
      ${kv(t('joined'), dt(u.created_at))}${kv(t('u_lastLogin'), u.last_login_at ? ago(u.last_login_at) : '')}${kv(t('u_lastSync'), u.last_sync_at ? ago(u.last_sync_at) : '')}${kv(t('u_lastBot'), u.last_bot_at ? ago(u.last_bot_at) : '')}
    </dl></div>
    ${r.quizzes.length ? `<div class="card mt16" style="padding:14px"><h3>${ic('quiz')} ${t('u_quizzes')}</h3><div class="list">${r.quizzes.map(q => `<div class="li" style="cursor:default"><div class="t"><b class="num">${N(q.score)} / ${N(q.total)}</b><span>${dt(q.taken_at)}</span></div><div class="r"><span class="badge ${q.score / q.total >= .8 ? 'g' : q.score / q.total >= .5 ? 'a' : 'r'}">${N(Math.round(100 * q.score / q.total))}٪</span></div></div>`).join('')}</div></div>` : ''}
    <div class="acts-grid mt16">
      ${u.telegram_id && !u.blocked_bot ? `<button class="btn tg" data-a="uMsg">${ic('msg')} ${t('a_msg')}</button>` : ''}
      ${u.email || u.phone ? `<button class="btn soft" data-a="uPass">${ic('key')} ${t('a_pass')}</button>` : ''}
      <button class="btn ghost" data-a="uLogout">${ic('logout')} ${t('a_logout')}</button>
      ${u.is_admin ? '' : u.blocked ? `<button class="btn green" data-a="uBlock" data-v="0">${ic('undo')} ${t('a_unblock')}</button>` : `<button class="btn danger-soft" data-a="uBlock" data-v="1">${ic('ban')} ${t('a_block')}</button>`}
      <button class="btn danger-soft" data-a="uReset">${ic('refresh')} ${t('a_reset')}</button>
      ${u.is_admin ? '' : `<button class="btn danger" data-a="uDelete">${ic('trash')} ${t('a_delete')}</button>`}
    </div>
  </div>`;
}
const curDrawer = () => document.querySelector('.drawer');
async function refreshUser() { const d = curDrawer(); if (d && S.cur) renderUser(d, await api('/users/' + S.cur.id)); if (S.view === 'users') loadUsers().catch(() => {}); }
ACT.userRefresh = el => busy(el, refreshUser);
ACT.uMsg = () => {
  const u = S.cur;
  const m = modal(`<h2>${ic('msg')} ${esc(t('msgT', { n: nameOf(u) }))}</h2><p class="muted small">${t('msgS')}</p>
    <textarea class="input" id="um-t" maxlength="4000" dir="auto" autofocus></textarea>
    <label class="row mt12"><span class="switch"><input type="checkbox" id="um-app"><i></i></span><span>${t('withApp')}</span></label>
    <div class="acts"><button class="btn ghost" data-a="closeTop">${t('cancel')}</button><button class="btn tg" id="um-go">${ic('send')} ${t('sendBtn')}</button></div>`);
  m.querySelector('#um-go').onclick = e => busy(e.currentTarget, async () => {
    const text = m.querySelector('#um-t').value.trim(); if (!text) throw Object.assign(new Error(), { code: 'required' });
    await api(`/users/${u.id}/message`, { method: 'POST', body: { text, open_app: m.querySelector('#um-app').checked } });
    closeTop(); toast(t('sent'), 'ok');
  });
};
ACT.uPass = () => {
  const u = S.cur;
  const m = modal(`<h2>${ic('key')} ${esc(t('passT', { n: nameOf(u) }))}</h2><p class="muted small">${t('passS')}</p>
    <label class="field"><span>${t('newPass')}</span><div class="row" style="flex-wrap:nowrap"><input class="input en" id="up-p" dir="ltr" autocomplete="new-password" autofocus><button class="btn ghost" id="up-gen">${ic('zap')}</button></div></label>
    <div class="acts"><button class="btn ghost" data-a="closeTop">${t('cancel')}</button><button class="btn primary" id="up-go">${t('save')}</button></div>`);
  m.querySelector('#up-gen').onclick = () => { const A = 'abcdefghjkmnpqrstuvwxyzABCDEFGHJKLMNPQRSTUVWXYZ23456789', r = crypto.getRandomValues(new Uint8Array(12)); m.querySelector('#up-p').value = [...r].map(x => A[x % A.length]).join(''); };
  m.querySelector('#up-go').onclick = e => busy(e.currentTarget, async () => {
    await api(`/users/${u.id}/password`, { method: 'POST', body: { password: m.querySelector('#up-p').value } });
    closeTop(); toast(t('saved'), 'ok');
  });
};
ACT.uLogout = async el => { if (!(await ask(t('a_logout'), t('logoutQ')))) return; busy(el, async () => { await api(`/users/${S.cur.id}/logout`, { method: 'POST', body: {} }); toast(t('done'), 'ok'); refreshUser(); }); };
ACT.uBlock = async el => {
  const b = el.dataset.v === '1', nm = nameOf(S.cur);
  if (!(await ask(t(b ? 'a_block' : 'a_unblock'), t(b ? 'blockQ' : 'unblockQ', { n: nm }), { danger: b }))) return;
  busy(el, async () => { await api(`/users/${S.cur.id}/block`, { method: 'POST', body: { blocked: b } }); toast(t('done'), 'ok'); await refreshUser(); });
};
ACT.uReset = async el => {
  if (!(await ask(t('a_reset'), t('resetQ', { n: nameOf(S.cur) }), { danger: true, word: fa() ? 'حذف' : 'DELETE' }))) return;
  busy(el, async () => { await api(`/users/${S.cur.id}/reset`, { method: 'POST', body: {} }); toast(t('done'), 'ok'); await refreshUser(); });
};
ACT.uDelete = async el => {
  if (!(await ask(t('a_delete'), t('deleteQ', { n: nameOf(S.cur) }), { danger: true, word: fa() ? 'حذف' : 'DELETE' }))) return;
  busy(el, async () => { await api(`/users/${S.cur.id}`, { method: 'DELETE' }); closeTop(); toast(t('done'), 'ok'); if (S.view === 'users') loadUsers(); else route(); });
};

/* ---------- word bank ---------- */
const POS = ['n', 'v', 'adj', 'adv', 'prep', 'conj', 'phr'];
async function cats() { if (!S.cats) S.cats = (await api('/categories')).categories; return S.cats; }
const catName = c => fa() ? c.name_fa : c.name_en;
const levelOpts = (cs, cat, sel, all = true) => { const c = cs.find(x => x.id === cat); return (all ? `<option value="0">${t('w_level')}</option>` : '') + (c ? c.levels.map(l => `<option value="${l.no}" ${+sel === l.no ? 'selected' : ''}>${esc(fa() ? l.fa : l.en)} · ${esc(l.tag)}</option>`).join('') : ''); };
VIEWS.words = async p => {
  const f = S.words, cs = await cats();
  p.innerHTML = `<div class="card">
    <div class="toolbar"><div class="search">${ic('search')}<input class="input" id="w-q" placeholder="${t('search')}" value="${esc(f.q)}" autocomplete="off"></div>
      <button class="btn primary" data-a="wordEdit">${ic('plus')} ${t('w_add')}</button>
      <button class="btn ghost" data-a="wordImport">${ic('upload')} <span class="hide-m">${t('w_import')}</span></button>
      <button class="btn ghost" data-a="wordExport">${ic('download')} <span class="hide-m">${tg ? t('exportTg') : t('export')}</span></button></div>
    <div class="toolbar">
      <select class="input" id="w-cat" style="width:auto"><option value="">${t('w_cat')}</option>${cs.map(c => `<option value="${c.id}" ${f.cat === c.id ? 'selected' : ''}>${esc(c.icon)} ${esc(catName(c))}</option>`).join('')}</select>
      <select class="input" id="w-lv" style="width:auto" ${f.cat ? '' : 'disabled'}>${levelOpts(cs, f.cat, f.level)}</select>
      <div class="seg" id="w-st">${['active', 'deleted', 'all'].map(k => `<button class="${f.status === k ? 'on' : ''}" data-s="${k}">${t('w_' + k)}</button>`).join('')}</div>
    </div>
    <div id="w-list"><div class="skel"></div></div></div>`;
  let tm;
  $('#w-q').oninput = e => { clearTimeout(tm); tm = setTimeout(() => { f.q = e.target.value.trim(); f.page = 1; loadWords(); }, 300); };
  $('#w-cat').onchange = e => { f.cat = e.target.value; f.level = 0; f.page = 1; const lv = $('#w-lv'); lv.innerHTML = levelOpts(cs, f.cat, 0); lv.disabled = !f.cat; loadWords(); };
  $('#w-lv').onchange = e => { f.level = +e.target.value; f.page = 1; loadWords(); };
  $('#w-st').onclick = e => { const b = e.target.closest('[data-s]'); if (!b) return; f.status = b.dataset.s; f.page = 1; $('#w-st').querySelectorAll('button').forEach(x => x.classList.toggle('on', x === b)); loadWords(); };
  await loadWords();
};
async function loadWords() {
  const f = S.words, cs = await cats();
  const r = await api(`/words?q=${encodeURIComponent(f.q)}&cat=${f.cat}&level=${f.level || ''}&status=${f.status}&page=${f.page}&size=40`);
  const box = $('#w-list'); if (!box) return;
  S.wordRows = Object.fromEntries(r.items.map(w => [w.pk, w]));
  const pages = Math.max(1, Math.ceil(r.total / r.size));
  const cl = w => { const c = cs.find(x => x.id === w.cat); const l = c && c.levels.find(x => x.no === w.level); return `${c ? esc(c.icon) + ' ' + esc(catName(c)) : esc(w.cat)} · ${l ? esc(fa() ? l.fa : l.en) : N(w.level)}`; };
  box.innerHTML = `<div class="muted small">${t('nWords', { n: N(r.total) })}</div>` + (r.items.length ? `<div class="tbl-wrap"><table class="tbl mt8"><thead><tr><th>${t('w_word')}</th><th class="hide-m">${t('w_pos')}</th><th>${t('w_fa')}</th><th class="hide-m">${t('w_catL')}</th><th></th></tr></thead><tbody>
    ${r.items.map(w => `<tr class="click" data-a="wordEdit" data-pk="${w.pk}" style="${w.active ? '' : 'opacity:.55'}"><td class="w en">${esc(w.word)}${w.active ? '' : ` <span class="badge a">${t('w_deleted')}</span>`}<div class="muted tiny hide-m" style="font-weight:400;max-width:340px;white-space:nowrap;overflow:hidden;text-overflow:ellipsis">${esc(w.def)}</div></td>
      <td class="hide-m"><span class="badge">${esc(w.pos)}</span></td><td>${esc(w.fa)}</td><td class="hide-m small">${cl(w)}</td>
      <td style="white-space:nowrap;text-align:end">${w.active ? `<button class="btn sm ghost icon" data-a="wordHide" data-pk="${w.pk}" title="${t('w_hide')}">${ic('eyeOff')}</button>` : `<button class="btn sm ghost icon" data-a="wordRestore" data-pk="${w.pk}" title="${t('w_restore')}">${ic('undo')}</button>`}<button class="btn sm ghost icon" data-a="wordDel" data-pk="${w.pk}" title="${t('del')}" style="color:var(--red)">${ic('trash')}</button></td></tr>`).join('')}
    </tbody></table></div>` : `<div class="empty">${ic('book')}${t('noWords')}</div>`) +
    (pages > 1 ? `<div class="pager"><button class="btn sm ghost" data-a="wPage" data-d="-1" ${f.page <= 1 ? 'disabled' : ''}>${t('prev')}</button><span>${t('page', { a: N(f.page), b: N(pages) })}</span><button class="btn sm ghost" data-a="wPage" data-d="1" ${f.page >= pages ? 'disabled' : ''}>${t('next')}</button></div>` : '');
}
ACT.wPage = el => { S.words.page += +el.dataset.d; loadWords().catch(fail); window.scrollTo({ top: 0, behavior: 'smooth' }); };
ACT.wordEdit = async (el, ev) => {
  if (ev && ev.target.closest('[data-a=wordHide],[data-a=wordRestore],[data-a=wordDel]') && ev.target.closest('[data-a]') !== el) return;
  const cs = await cats(), w = el && el.dataset && el.dataset.pk ? S.wordRows[el.dataset.pk] : null;
  const cat = w ? w.cat : (S.words.cat || cs[0].id);
  const m = modal(`<h2>${ic(w ? 'edit' : 'plus')} ${w ? esc(w.word) : t('w_add')}</h2>
    <div class="grid g2" style="gap:0 12px">
      <label class="field"><span>${t('w_word')}</span><input class="input en" id="we-word" dir="ltr" value="${esc(w ? w.word : '')}" autofocus></label>
      <label class="field"><span>${t('w_pos')}</span><select class="input" id="we-pos">${POS.map(x => `<option ${w && w.pos === x ? 'selected' : ''}>${x}</option>`).join('')}</select></label>
    </div>
    <label class="field"><span>${t('w_fa')}</span><input class="input" id="we-fa" dir="rtl" value="${esc(w ? w.fa : '')}"></label>
    <label class="field"><span>${t('w_def')}</span><textarea class="input en" id="we-def" dir="ltr" style="min-height:70px">${esc(w ? w.def : '')}</textarea></label>
    <label class="field"><span>${t('w_ex')}</span><textarea class="input en" id="we-ex" dir="ltr" style="min-height:70px">${esc(w ? w.ex : '')}</textarea></label>
    <div class="grid g2" style="gap:0 12px">
      <label class="field"><span>${t('w_catL')}</span><select class="input" id="we-cat" ${w ? 'disabled' : ''}>${cs.map(c => `<option value="${c.id}" ${cat === c.id ? 'selected' : ''}>${esc(c.icon)} ${esc(catName(c))}</option>`).join('')}</select></label>
      <label class="field"><span>${t('w_levelL')}</span><select class="input" id="we-lv">${levelOpts(cs, cat, w ? w.level : (S.words.level || 1), false)}</select></label>
    </div>
    ${w ? `<label class="row mt12"><span class="switch"><input type="checkbox" id="we-act" ${w.active ? 'checked' : ''}><i></i></span><span>${t('w_activeL')}</span></label>` : ''}
    <div class="acts">${w ? `<button class="btn danger-soft" data-a="wordDel" data-pk="${w.pk}" style="margin-inline-end:auto">${ic('trash')} ${t('del')}</button>` : ''}<button class="btn ghost" data-a="closeTop">${t('cancel')}</button><button class="btn primary" id="we-go">${t('save')}</button></div>`);
  m.querySelector('#we-cat').onchange = e => { m.querySelector('#we-lv').innerHTML = levelOpts(cs, e.target.value, 1, false); };
  m.querySelector('#we-go').onclick = e => busy(e.currentTarget, async () => {
    const v = id => m.querySelector(id).value.trim();
    const d = { word: v('#we-word'), pos: v('#we-pos'), fa: v('#we-fa'), def: v('#we-def'), ex: v('#we-ex'), level: +v('#we-lv') };
    if (w) { if (m.querySelector('#we-act')) d.active = m.querySelector('#we-act').checked; await api('/words/' + w.pk, { method: 'PUT', body: d }); }
    else { d.cat = v('#we-cat'); await api('/words', { method: 'POST', body: d }); }
    S.cats = null; closeTop(); toast(t('saved'), 'ok'); if (S.view === 'words') loadWords();
  });
};
ACT.wordHide = (el, ev) => { ev.stopPropagation(); busy(el, async () => { await api('/words/' + el.dataset.pk, { method: 'DELETE' }); S.cats = null; toast(t('done'), 'ok'); loadWords(); }); };
ACT.wordRestore = (el, ev) => { ev.stopPropagation(); busy(el, async () => { await api('/words/' + el.dataset.pk, { method: 'PUT', body: { active: true } }); S.cats = null; toast(t('done'), 'ok'); loadWords(); }); };
ACT.wordDel = async (el, ev) => {
  ev.stopPropagation();
  const w = S.wordRows[el.dataset.pk]; if (!(await ask(t('del'), t('w_delQ', { w: w ? w.word : '' }), { danger: true, ok: t('del') }))) return;
  busy(el, async () => { await api('/words/' + el.dataset.pk + '?hard=1', { method: 'DELETE' }); S.cats = null; if (layers.length && document.querySelector('#we-go')) closeTop(); toast(t('done'), 'ok'); loadWords(); });
};
ACT.wordImport = async () => {
  const cs = await cats(), cat = S.words.cat || cs[0].id;
  const m = modal(`<h2>${ic('upload')} ${t('imp_t')}</h2><p class="muted small" style="line-height:1.9">${t('imp_s')}</p>
    <textarea class="input en" id="wi-t" dir="ltr" style="min-height:180px" placeholder="mitigate | v | کاهش دادن | to make less severe | Trees mitigate heat.\nresilient | adj | مقاوم | able to recover quickly"></textarea>
    <div class="row mt8"><label class="btn sm ghost" style="cursor:pointer">${ic('upload')} CSV / TXT<input type="file" id="wi-f" accept=".csv,.txt,.tsv,text/plain,text/csv" hidden></label></div>
    <div class="grid g2" style="gap:0 12px">
      <label class="field"><span>${t('w_catL')}</span><select class="input" id="wi-cat">${cs.map(c => `<option value="${c.id}" ${cat === c.id ? 'selected' : ''}>${esc(c.icon)} ${esc(catName(c))}</option>`).join('')}</select></label>
      <label class="field"><span>${t('w_levelL')}</span><select class="input" id="wi-lv">${levelOpts(cs, cat, 1, false)}</select></label></div>
    <label class="row mt12"><span class="switch"><input type="checkbox" id="wi-up" checked><i></i></span><span>${t('imp_up')}</span></label>
    <div id="wi-res"></div>
    <div class="acts"><button class="btn ghost" data-a="closeTop">${t('close')}</button><button class="btn primary" id="wi-go">${ic('upload')} ${t('imp_go')}</button></div>`, { wide: true });
  m.querySelector('#wi-cat').onchange = e => { m.querySelector('#wi-lv').innerHTML = levelOpts(cs, e.target.value, 1, false); };
  m.querySelector('#wi-f').onchange = async e => { const f = e.target.files[0]; if (f) m.querySelector('#wi-t').value = await f.text(); };
  m.querySelector('#wi-go').onclick = e => busy(e.currentTarget, async () => {
    const r = await api('/words/import', { method: 'POST', body: { text: m.querySelector('#wi-t').value, cat: m.querySelector('#wi-cat').value, level: +m.querySelector('#wi-lv').value, update: m.querySelector('#wi-up').checked } });
    S.cats = null;
    m.querySelector('#wi-res').innerHTML = `<div class="tip-box mt12"><b>${t('imp_res', { a: N(r.added), b: N(r.updated), c: N(r.skipped) })}</b>${r.errors.length ? `<div class="mt8">${t('imp_err', { n: N(r.errors.length) })}:</div><div class="small en" dir="ltr">${r.errors.slice(0, 8).map(x => `#${x.line} ${esc(x.error)} — ${esc(x.text)}`).join('<br>')}</div>` : ''}</div>`;
    toast(t('done'), 'ok'); if (S.view === 'words') loadWords();
  });
};
ACT.wordExport = el => busy(el, () => exportFile('words', S.words.status === 'all' ? 'all' : ''));

/* ---------- broadcast ---------- */
const AUD = ['all', 'active7', 'inactive7', 'linked', 'tg_only'];
/** Telegram-HTML subset → safe preview HTML */
function tgHtml(src) {
  const tpl = document.createElement('template'); tpl.innerHTML = String(src).replace(/\n/g, '<br>');
  const OK = { B: 'b', STRONG: 'b', I: 'i', EM: 'i', U: 'u', INS: 'u', S: 's', STRIKE: 's', DEL: 's', CODE: 'code', PRE: 'code', BLOCKQUOTE: 'blockquote', BR: 'br', 'TG-SPOILER': 'span', A: 'a', SPAN: 'span' };
  const walk = n => [...n.childNodes].map(c => {
    if (c.nodeType === 3) return esc(c.textContent);
    if (c.nodeType !== 1) return '';
    const tag = OK[c.tagName]; if (!tag) return walk(c);
    if (tag === 'br') return '<br>';
    if (tag === 'a') { const h = c.getAttribute('href') || ''; return /^(https?:|tg:)/i.test(h) ? `<a href="${esc(h)}" target="_blank" rel="noopener">${walk(c)}</a>` : walk(c); }
    if (tag === 'span') return `<span style="background:rgba(128,128,128,.35);border-radius:3px">${walk(c)}</span>`;
    if (tag === 'blockquote') return `<span style="display:block;border-inline-start:3px solid #2481CC;padding-inline-start:8px">${walk(c)}</span>`;
    return `<${tag}>${walk(c)}</${tag}>`;
  }).join('');
  return walk(tpl.content);
}
VIEWS.bc = async p => {
  const r = await api('/broadcasts'); S.bcAud = r.audiences;
  const dr = S.bcDraft || (S.bcDraft = { text: '', audience: 'all', button_text: '', button_url: '', open_app: true });
  p.innerHTML = `<div class="composer">
    <div class="card"><h3>${ic('mega')} ${t('bc_new')}</h3>
      ${r.bot ? '' : `<div class="tip-box bad">${t('err_telegram_not_configured')}</div>`}
      <div class="fmt" id="bc-fmt"><button data-w="b"><b>B</b></button><button data-w="i"><i>I</i></button><button data-w="u"><u>U</u></button><button data-w="s"><s>S</s></button><button data-w="code">&lt;/&gt;</button><button data-w="tg-spoiler">▒</button><button data-w="blockquote">“ ”</button><button data-w="a">${ic('link')}</button></div>
      <textarea class="input" id="bc-t" dir="auto" maxlength="4000" style="min-height:170px" placeholder="${esc(t('bc_ph'))}">${esc(dr.text)}</textarea>
      <div class="row between small muted mt8"><span>HTML: &lt;b&gt; &lt;i&gt; &lt;u&gt; &lt;a href&gt; &lt;code&gt;</span><span id="bc-n" class="num"></span></div>
      <div class="field"><span>${t('bc_aud')}</span><div class="aud" id="bc-aud">${AUD.map(a => `<label><input type="radio" name="aud" value="${a}" ${dr.audience === a ? 'checked' : ''}><b>${t('au_' + a)}</b><span>${t('nPeople', { n: N(r.audiences[a]) })}</span></label>`).join('')}</div></div>
      <div class="field"><span>${t('bc_btn')}</span><div class="grid g2" style="gap:8px"><input class="input" id="bc-bt" placeholder="${t('bc_btnText')}" value="${esc(dr.button_text)}" maxlength="64"><input class="input en" dir="ltr" id="bc-bu" placeholder="${t('bc_btnUrl')}" value="${esc(dr.button_url)}"></div></div>
      <label class="row mt12"><span class="switch"><input type="checkbox" id="bc-app" ${dr.open_app ? 'checked' : ''}><i></i></span><span>${t('bc_app')}</span></label>
      <div class="row mt16"><button class="btn ghost" id="bc-test" ${r.bot ? '' : 'disabled'}>${ic('send')} ${t('bc_test')}</button><span class="grow"></span><button class="btn primary" id="bc-go" ${r.bot ? '' : 'disabled'}>${ic('mega')} <span></span></button></div>
      <p class="muted tiny mt12">${t('bc_note')}</p></div>
    <div class="grid"><div class="card"><h3>${ic('eye')} ${t('bc_prev')}</h3><div class="tgprev"><div class="bubble" id="bc-pv"></div><div class="ikb" id="bc-kb"></div></div></div>
      <div class="card"><h3>${ic('clock')} ${t('bc_hist')}</h3><div id="bc-hist"></div></div></div></div>`;
  const ta = $('#bc-t');
  const read = () => { dr.text = ta.value; dr.audience = (document.querySelector('input[name=aud]:checked') || {}).value || 'all'; dr.button_text = $('#bc-bt').value.trim(); dr.button_url = $('#bc-bu').value.trim(); dr.open_app = $('#bc-app').checked; return dr; };
  const upd = () => {
    read();
    $('#bc-pv').innerHTML = (dr.text.trim() ? tgHtml(dr.text) : `<span style="opacity:.45">${esc(t('bc_ph'))}</span>`) + `<span class="tm">${new Intl.DateTimeFormat(fa() ? 'fa-IR' : 'en-GB', { hour: '2-digit', minute: '2-digit' }).format(new Date())}</span>`;
    $('#bc-kb').innerHTML = (dr.button_url ? `<div>${esc(dr.button_text || '🔗 Open')} ↗</div>` : '') + (dr.open_app ? `<div>${esc(dr.button_url ? '📚 واژه‌یار' : (dr.button_text || '📚 باز کردن واژه‌یار'))}</div>` : '');
    $('#bc-n').textContent = t('chars', { a: N(dr.text.length) });
    $('#bc-go span').textContent = t('bc_send', { n: N(r.audiences[dr.audience] || 0) });
  };
  p.addEventListener('input', upd); p.addEventListener('change', upd); upd();
  $('#bc-fmt').onclick = e => {
    const b = e.target.closest('[data-w]'); if (!b) return;
    const w = b.dataset.w, s0 = ta.selectionStart, s1 = ta.selectionEnd, sel = ta.value.slice(s0, s1) || (fa() ? 'متن' : 'text');
    const put = ins => { ta.setRangeText(ins, s0, s1, 'end'); ta.focus(); upd(); };
    if (w !== 'a') return put(`<${w}>${sel}</${w}>`);
    const m = modal(`<h2>${ic('link')} Link</h2><label class="field"><span>URL</span><input class="input en" dir="ltr" id="lk-u" value="https://" autofocus></label>
      <div class="acts"><button class="btn ghost" data-a="closeTop">${t('cancel')}</button><button class="btn primary" id="lk-go">${t('add')}</button></div>`);
    m.querySelector('#lk-go').onclick = () => { const u = m.querySelector('#lk-u').value.trim().replace(/"/g, ''); closeTop(); if (/^(https?|tg):\/\/\S+$/i.test(u)) put(`<a href="${u}">${sel}</a>`); };
  };
  $('#bc-test').onclick = e => busy(e.currentTarget, async () => { read(); await api('/broadcasts', { method: 'POST', body: { ...dr, test: true } }); toast(t('bc_testOk'), 'ok'); });
  $('#bc-go').onclick = async e => {
    read(); if (!dr.text.trim()) return toast(t('err_required'), 'err');
    const n = r.audiences[dr.audience] || 0;
    if (!(await ask(t('bc_new'), t('bc_sendQ', { n: N(n) }), { ok: t('bc_send', { n: N(n) }) }))) return;
    busy(e.currentTarget, async () => { const b = await api('/broadcasts', { method: 'POST', body: dr }); S.bcDraft = null; ta.value = ''; upd(); toast(t('done'), 'ok'); runBc(b.id); await loadBcHist(); });
  };
  renderBcHist(r.items);
  r.items.filter(b => b.status === 'running').forEach(b => runBc(b.id));
};
async function loadBcHist() { const r = await api('/broadcasts'); renderBcHist(r.items); }
function bcRow(b) {
  const pct = b.total ? Math.min(100, Math.round(100 * (b.sent + b.failed + b.blocked) / b.total)) : (b.status === 'done' ? 100 : 0);
  const cls = { running: 'p', done: 'g', cancelled: 'a' }[b.status];
  return `<div class="bc" id="bc-${b.id}"><div class="row between"><span class="badge ${cls}">${b.status === 'running' ? '<span class="spin" style="width:11px;height:11px;border-width:2px"></span>' : ''} ${t('st_' + b.status)}</span><span class="muted tiny">${dt(b.created_at)} · ${t('au_' + b.audience)}</span></div>
    <div class="txt mt8">${esc(b.text.replace(/<[^>]+>/g, ''))}</div>
    <div class="prog mt8"><i style="width:${pct}%"></i></div>
    <div class="row between small mt8"><span><b class="num">${N(b.sent)}</b> ${t('bc_sent')} <span class="muted">${t('bc_of', { n: N(b.total) })}</span>${b.failed ? ` · <span style="color:var(--red)">${N(b.failed)} ${t('bc_failed')}</span>` : ''}${b.blocked ? ` · <span style="color:var(--amber)">${N(b.blocked)} ${t('bc_blocked')}</span>` : ''}</span>
      ${b.status === 'running' ? `<button class="btn sm danger-soft" data-a="bcCancel" data-id="${b.id}">${ic('stop')} ${t('bc_cancel')}</button>` : ''}</div></div>`;
}
function renderBcHist(items) { const h = $('#bc-hist'); if (h) h.innerHTML = items.length ? items.map(bcRow).join('') : `<div class="empty">${ic('mega')}${t('bc_none')}</div>`; }
async function runBc(id) {
  if (S.bcRun[id]) return; S.bcRun[id] = true;
  try {
    for (let i = 0; i < 2000; i++) {
      const b = await api(`/broadcasts/${id}/step`, { method: 'POST', body: {} });
      const el = document.getElementById('bc-' + id); if (el) el.outerHTML = bcRow(b);
      if (b.status !== 'running') { if (b.status === 'done') toast(`📣 ${t('st_done')} · ${N(b.sent)} ${t('bc_sent')}`, 'ok'); break; }
      await new Promise(r => setTimeout(r, 400));
    }
  } catch (e) { fail(e); } finally { delete S.bcRun[id]; }
}
ACT.bcCancel = el => busy(el, async () => { const b = await api(`/broadcasts/${el.dataset.id}/cancel`, { method: 'POST', body: {} }); const x = document.getElementById('bc-' + b.id); if (x) x.outerHTML = bcRow(b); });

/* ---------- Telegram bot ---------- */
VIEWS.bot = async p => {
  const b = await api('/telegram');
  const row = (k, v) => v == null || v === '' ? '' : `<dt>${k}</dt><dd>${v}</dd>`;
  const ok = b.configured && !b.error && b.webhook_ok;
  p.innerHTML = `<div class="grid g2">
    <div class="card"><h3>${ic('send')} ${t('b_status')}</h3>
      <div class="row"><span class="statusdot ${ok ? 'ok' : 'bad'}"></span><b>${!b.configured ? t('b_none') : ok ? t('b_ok') : t('b_bad')}</b></div>
      ${b.error ? `<div class="tip-box bad mt12 en" dir="ltr">${esc(b.error)}</div>` : ''}
      ${b.configured && !b.error ? `<dl class="kv mt16">
        ${row(t('b_user'), `<a class="en" href="https://t.me/${esc(b.username)}" target="_blank" rel="noopener">@${esc(b.username)}</a>`)}${row(t('b_name'), esc(b.name))}${row('ID', `<span class="num en">${esc(b.id)}</span>`)}
        ${row(t('b_hook'), `<span class="code">${esc(b.webhook || '—')}</span>`)}${row(t('b_pending'), N(b.pending))}${row(t('b_inline'), b.inline ? `<span class="badge g">${t('on')}</span>` : `<span class="badge">${t('off')}</span>`)}
        ${row(t('b_err'), b.last_error ? `<span class="en small" style="color:var(--red)">${esc(b.last_error)}</span> <span class="muted tiny">${ago(b.last_error_at)}</span>` : '')}
        ${row('Mini App', `<span class="code">${esc(b.app_url || '')}</span>`)}${row(t('b_setupAt'), b.setup_at ? ago(b.setup_at) : '')}
      </dl>` : ''}
      <div class="row mt16">${b.username ? `<button class="btn tg" data-a="botOpen" data-u="${esc(b.username)}">${ic('send')} ${t('b_open')}</button><button class="btn ghost" data-a="botCopy" data-v="${esc(b.app_url || '')}">${ic('copy')} ${t('b_copyApp')}</button>` : ''}
        ${b.configured ? `<button class="btn soft" data-a="botSetup">${ic('refresh')} ${t('b_resetup')}</button>` : ''}</div>
      ${b.from_secret ? `<p class="muted small mt16">${ic('lock')} ${t('b_secret')}</p>` : `<div class="field"><span>${t('b_tok')}</span><div class="row" style="flex-wrap:nowrap"><input class="input en" dir="ltr" id="bt-tok" type="password" autocomplete="off" placeholder="123456:ABC…"><button class="btn primary" data-a="botToken">${t('save')}</button></div><span class="muted tiny">${t('b_tokS')}</span></div>`}
      <div class="mt16"><div class="small muted">${t('b_admins')}</div><div class="row mt8">${(b.admin_ids || []).map(i => `<span class="badge p en">${ic('shield')} ${esc(i)}</span>`).join('')}</div></div></div>
    <div class="card"><h3>${ic('zap')} ${t('b_tips')}</h3>
      ${['tip1', 'tip2', 'tip3', 'tip4'].map(k => `<div class="way"><span class="n">${ic(k === 'tip3' ? 'lock' : k === 'tip2' ? 'search' : k === 'tip1' ? 'link' : 'star')}</span><div>${t(k, { app: esc(b.app_url || ''), bot: esc(b.username || 'your_bot') })}</div></div>`).join('')}</div></div>`;
};
ACT.botOpen = el => openLink('https://t.me/' + el.dataset.u);
ACT.botCopy = el => copy(el.dataset.v);
ACT.botSetup = el => busy(el, async () => { await api('/telegram/setup', { method: 'POST', body: {} }); toast(t('done'), 'ok'); route(); });
ACT.botToken = el => busy(el, async () => { await api('/telegram/setup', { method: 'POST', body: { token: $('#bt-tok').value.trim() } }); toast(t('saved'), 'ok'); route(); });

/* ---------- app settings ---------- */
VIEWS.settings = async p => {
  const s = await api('/settings');
  const sw = (id, on) => `<span class="switch"><input type="checkbox" id="${id}" ${on ? 'checked' : ''}><i></i></span>`;
  p.innerHTML = `<div class="grid g2">
    <div class="card"><h3>${ic('sliders')} ${t('settings')}</h3>
      <div class="set"><div class="t"><b>${t('s_reg')}</b><span>${t('s_regS')}</span></div>${sw('s-reg', s.registration)}</div>
      <div class="set"><div class="t"><b>${t('s_guest')}</b><span>${t('s_guestS')}</span></div>${sw('s-guest', s.guest)}</div>
      <div class="set"><div class="t"><b>${ic('alert')} ${t('s_maint')}</b><span>${t('s_maintS')}</span>
        <label class="field"><span>${t('s_maintMsg')}</span><textarea class="input" id="s-mmsg" dir="auto" style="min-height:70px" maxlength="600">${esc(s.maintenance_msg)}</textarea></label></div>${sw('s-maint', s.maintenance)}</div></div>
    <div class="card"><h3>${ic('mega')} ${t('s_notice')}</h3><p class="muted small">${t('s_noticeS')}</p>
      <label class="field"><span>${t('s_noticeText')}</span><textarea class="input" id="s-ntext" dir="auto" maxlength="600">${esc(s.notice)}</textarea></label>
      <div class="seg mt12" id="s-nlv">${['info', 'success', 'warning', 'danger'].map(k => `<button class="${s.notice_level === k ? 'on' : ''}" data-v="${k}">${t('lv_' + k)}</button>`).join('')}</div>
      <label class="row mt16"><span class="switch"><input type="checkbox" id="s-nbot" ${s.notice_bot ? 'checked' : ''}><i></i></span><span>${t('s_noticeBot')}</span></label></div></div>
    <div class="row end mt16"><button class="btn primary lg" data-a="saveSettings">${ic('check')} ${t('save')}</button></div>`;
  $('#s-nlv').onclick = e => { const b = e.target.closest('[data-v]'); if (!b) return; $('#s-nlv').querySelectorAll('button').forEach(x => x.classList.toggle('on', x === b)); };
};
ACT.saveSettings = el => busy(el, async () => {
  const lv = document.querySelector('#s-nlv .on');
  await api('/settings', { method: 'PUT', body: { registration: $('#s-reg').checked, guest: $('#s-guest').checked, maintenance: $('#s-maint').checked, maintenance_msg: $('#s-mmsg').value.trim(),
    notice: $('#s-ntext').value.trim(), notice_level: lv ? lv.dataset.v : 'info', notice_bot: $('#s-nbot').checked } });
  toast(t('saved'), 'ok');
});

/* ---------- security ---------- */
const LF = ['', 'login', 'denied', 'user.', 'broadcast.', 'settings.', 'word.'];
const actIcon = a => /^denied/.test(a) ? ['alert', 'r'] : /^login|link_created/.test(a) ? ['key', 'g'] : /^logout/.test(a) ? ['logout', ''] : /^user/.test(a) ? ['user', 'b'] : /^broadcast/.test(a) ? ['mega', 'p'] : /^settings|telegram/.test(a) ? ['sliders', 'a'] : /^word|words/.test(a) ? ['book', 't'] : ['shield', ''];
VIEWS.security = async p => {
  const f = S.sec, r = await api(`/security?page=${f.page}&action=${encodeURIComponent(f.action)}`);
  const pages = Math.max(1, Math.ceil(r.total / 40));
  const ua = s => { s = s || ''; const b = /Telegram/i.test(s) ? 'Telegram' : /Edg\//.test(s) ? 'Edge' : /Chrome\//.test(s) ? 'Chrome' : /Firefox\//.test(s) ? 'Firefox' : /Safari\//.test(s) ? 'Safari' : 'Browser'; const o = /Android/.test(s) ? 'Android' : /iPhone|iPad/.test(s) ? 'iOS' : /Windows/.test(s) ? 'Windows' : /Mac OS/.test(s) ? 'macOS' : /Linux/.test(s) ? 'Linux' : ''; return b + (o ? ' · ' + o : ''); };
  p.innerHTML = `<div class="tip-box">${ic('shield')} ${t('sec_note')}</div>
  <div class="kpis mt16">
    <div class="kpi"><div class="ic">${ic('shield')}</div><div class="v en" style="font-size:18px">${r.admin_ids.map(esc).join('<br>')}</div><div class="l">${t('sec_admins')}</div></div>
    <div class="kpi c7"><div class="ic">${ic('clock')}</div><div class="v">${t('hours', { n: N(r.session_hours) })}</div><div class="l">${t('sec_life')}</div></div>
    <div class="kpi c5"><div class="ic">${ic('alert')}</div><div class="v num">${N(r.denied24)}</div><div class="l">${t('sec_denied')}</div></div>
    <div class="kpi c4"><div class="ic">${ic('ban')}</div><div class="v num">${N(r.blocked_keys)}</div><div class="l">${t('sec_rl')}</div><div class="s">${r.blocked_keys ? `<button class="btn sm ghost" data-a="secClear">${t('sec_clear')}</button>` : '&nbsp;'}</div></div>
  </div>
  <div class="grid g3 mt16">
    <div class="card"><h3>${ic('device')} ${t('sec_sess')}</h3><div class="list">
      ${r.sessions.map(s => `<div class="li" style="cursor:default"><div class="av" style="background:${s.current ? 'var(--green)' : 'var(--muted)'}">${ic('device')}</div><div class="t"><b>${esc(ua(s.ua))} ${s.current ? `<span class="badge g">${t('sec_cur')}</span>` : ''}</b><span class="en">${esc(s.ip || '—')} · ${ago(s.last_seen_at)}</span><span>${t('expiresIn', { h: fmtLeft(s.expires_at - Date.now()) })}</span></div>
        ${s.current ? '' : `<button class="btn sm danger-soft" data-a="secRevoke" data-id="${esc(s.id)}">${t('sec_revoke')}</button>`}</div>`).join('')}</div>
      ${r.sessions.length > 1 ? `<button class="btn danger-soft block mt12" data-a="secRevokeAll">${ic('logout')} ${t('sec_revokeAll')}</button>` : ''}</div>
    <div class="card span2"><h3>${ic('activity')} ${t('sec_log')}</h3>
      <div class="chips" id="lf">${LF.map(k => `<button class="chip ${f.action === k ? 'on' : ''}" data-f="${k}">${t('lf_' + (k.replace('.', '') || 'all'))}</button>`).join('')}</div>
      <div class="list mt12">${r.log.map(l => { const [i, c] = actIcon(l.action); let det = l.details; try { const j = JSON.parse(det); det = Object.entries(j).map(([k, v]) => `${k}: ${v}`).join(' · '); } catch (e) {}
        return `<div class="li" style="cursor:default"><span class="badge ${c}" style="width:34px;height:34px;justify-content:center;border-radius:11px">${ic(i)}</span><div class="t"><b>${esc(t('act_' + l.action) !== 'act_' + l.action ? t('act_' + l.action) : l.action)}</b><span class="en">${esc(det || '')}</span><span class="en">${esc(l.ip || '')}${l.tg_id ? ' · tg ' + esc(l.tg_id) : ''} · ${esc(ua(l.ua))}</span></div><div class="r">${ago(l.at)}<br><span class="muted tiny">${dt(l.at)}</span></div></div>`; }).join('') || `<div class="empty">${ic('shield')}${t('noLog')}</div>`}</div>
      ${pages > 1 ? `<div class="pager"><button class="btn sm ghost" data-a="secPage" data-d="-1" ${f.page <= 1 ? 'disabled' : ''}>${t('prev')}</button><span>${t('page', { a: N(f.page), b: N(pages) })}</span><button class="btn sm ghost" data-a="secPage" data-d="1" ${f.page >= pages ? 'disabled' : ''}>${t('next')}</button></div>` : ''}</div></div>`;
  $('#lf').onclick = e => { const b = e.target.closest('[data-f]'); if (!b) return; f.action = b.dataset.f; f.page = 1; route(); };
};
ACT.secPage = el => { S.sec.page += +el.dataset.d; route(); };
ACT.secRevoke = el => busy(el, async () => { await api('/security/revoke', { method: 'POST', body: { id: el.dataset.id } }); toast(t('done'), 'ok'); route(); });
ACT.secRevokeAll = async el => { if (!(await ask(t('sec_revokeAll'), t('sec_revokeAll') + '?', { danger: true }))) return; busy(el, async () => { await api('/security/revoke', { method: 'POST', body: {} }); toast(t('done'), 'ok'); route(); }); };
ACT.secClear = el => busy(el, async () => { await api('/security/unblock', { method: 'POST', body: {} }); toast(t('done'), 'ok'); route(); });

boot();
})();
