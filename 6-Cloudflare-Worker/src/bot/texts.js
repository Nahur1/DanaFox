/* bot texts = original strings + account / sync additions */
import { BASE } from './texts_base.js';
const EXTRA = {
  fa: {
    b_account: '👤 حساب و همگام‌سازی', b_web: '🌐 ورود به نسخهٔ وب', b_link_help: '🔗 اتصال به حساب وب',
    acc_title: '👤 <b>حساب شما</b>',
    acc_tg_only: 'اطلاعات شما (پیشرفت، مرورها، لغات من و تنظیمات) <b>داخل همین ربات</b> ذخیره می‌شود و با <b>اپ داخل تلگرام</b> هم یکی است.\n\nمی‌خواهید روی کامپیوتر یا مرورگر هم ادامه دهید؟',
    acc_linked: '✅ این تلگرام به حساب وب <b>{login}</b> وصل است.\nهمهٔ پیشرفت شما بین ربات، اپ تلگرام، وب‌اپ و نسخهٔ دسکتاپ <b>همگام</b> است.',
    acc_how: '<b>سه راه دارید:</b>\n1️⃣ <b>حساب سایت دارید؟</b> دکمهٔ «🔑 ورود با حساب سایت» را بزنید و داخل همین تلگرام با ایمیل/موبایل و رمزتان وارد شوید. اطلاعات ربات و حساب سایت یکی می‌شوند.\n2️⃣ یا در وب‌اپ وارد شوید ← تنظیمات ← «اتصال به تلگرام».\n3️⃣ <b>حساب سایت ندارید؟</b> «ورود به نسخهٔ وب» را بزنید؛ بدون رمز وارد می‌شوید و در تنظیمات می‌توانید ایمیل/موبایل و رمز بگذارید.',
    b_site_login: '🔑 ورود با حساب سایت',
    maint: '🛠 <b>دانافاکس در حال به‌روزرسانی است</b>\nلطفاً کمی بعد دوباره امتحان کنید.', blocked_acc: '⛔️ حساب شما توسط مدیر غیرفعال شده است.', notice: '📢',
    web_link: '🌐 <b>ورود به نسخهٔ وب</b>\nاین لینک یک‌بارمصرف است و تا ۱۰ دقیقه کار می‌کند. با آن، بدون رمز وارد <b>همین حساب</b> می‌شوید:',
    b_open_web: '🌐 باز کردن وب‌اپ', no_web: 'آدرس وب‌اپ هنوز تنظیم نشده است.',
    link_ok: '🎉 <b>اتصال انجام شد!</b>\nاین تلگرام به حساب <b>{login}</b> وصل شد{merged}. از این به بعد همه‌چیز بین ربات و وب‌اپ همگام است.',
    link_merged: ' و پیشرفت قبلی‌تان در ربات به آن حساب منتقل شد',
    link_bad: '❌ این لینک اتصال نامعتبر یا منقضی شده است. در وب‌اپ دوباره «اتصال به تلگرام» را بزنید.',
    link_other: '⚠️ این تلگرام قبلاً به حساب دیگری (<b>{login}</b>) وصل شده است. اول در آن حساب، اتصال تلگرام را قطع کنید.',
    link_same: '✅ این تلگرام از قبل به همین حساب وصل است.',
    sync_note: '☁️ همگام با وب‌اپ', saved_bot: '💾 ذخیره در ربات',
  },
  en: {
    b_account: '👤 Account & sync', b_web: '🌐 Sign in on the web', b_link_help: '🔗 Connect a web account',
    acc_title: '👤 <b>Your account</b>',
    acc_tg_only: 'Your data (progress, reviews, my words and settings) is saved <b>inside this bot</b> and shared with the <b>in-Telegram app</b>.\n\nWant to continue on a computer or browser too?',
    acc_linked: '✅ This Telegram is connected to the web account <b>{login}</b>.\nYour progress is <b>synced</b> between the bot, the Telegram app, the web app and the desktop app.',
    acc_how: '<b>Three ways:</b>\n1️⃣ <b>Have a site account?</b> Tap “🔑 Sign in with site account” and sign in right here in Telegram with your email/mobile and password. The bot data and the site account become one.\n2️⃣ Or sign in on the web app → Settings → “Connect Telegram”.\n3️⃣ <b>No site account?</b> Tap “Sign in on the web”; you get in without a password and can add an email/mobile and password in Settings.',
    b_site_login: '🔑 Sign in with site account',
    maint: '🛠 <b>DanaFox is being updated</b>\nPlease try again a little later.', blocked_acc: '⛔️ Your account has been disabled by the admin.', notice: '📢',
    web_link: '🌐 <b>Sign in on the web</b>\nThis one-time link works for 10 minutes and signs you into <b>this same account</b> without a password:',
    b_open_web: '🌐 Open the web app', no_web: 'The web app address is not configured yet.',
    link_ok: '🎉 <b>Connected!</b>\nThis Telegram is now linked to <b>{login}</b>{merged}. From now on everything is synced between the bot and the web app.',
    link_merged: ' and your previous bot progress was moved into that account',
    link_bad: '❌ This connect link is invalid or expired. Tap “Connect Telegram” in the web app again.',
    link_other: '⚠️ This Telegram is already connected to another account (<b>{login}</b>). Disconnect it there first.',
    link_same: '✅ This Telegram is already connected to this account.',
    sync_note: '☁️ synced with the web app', saved_bot: '💾 saved in the bot',
  },
};
export const T = { fa: { ...BASE.fa, ...EXTRA.fa }, en: { ...BASE.en, ...EXTRA.en } };
export function t(lang, key, vars) {
  let s = (T[lang] || T.en)[key] ?? T.en[key] ?? key;
  if (vars) for (const k in vars) s = s.split('{' + k + '}').join(String(vars[k]));
  return s;
}
const FA_D = '۰۱۲۳۴۵۶۷۸۹';
export const n = (lang, x) => (lang === 'fa' ? String(x).replace(/\d/g, d => FA_D[d]).replace(/\./g, '٫') : String(x));
export const esc = s => String(s ?? '').replace(/[&<>]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;' }[c]));
