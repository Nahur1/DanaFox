# واژه‌یار (VajeYar) — مربی هوشمند لغت و ریدینگ انگلیسی

> نسخهٔ ۳٫۰ · دوزبانه (فارسی / انگلیسی) · وب/PWA، اندروید، ویندوز، مک، لینوکس، مینی‌اپ و ربات تلگرام · یک حساب، همگام روی همهٔ دستگاه‌ها · کار کامل آفلاین

🌐 **نسخهٔ آنلاین:** <https://vajeyar.mohammadfakhari59.workers.dev> · 🛠 **پنل مدیریت:** `/admin` · ⬇️ **دانلود اپ‌ها:** بخش [Releases](../../releases)

## 📦 ساختار ریپو

| پوشه | توضیح |
|---|---|
| `6-Cloudflare-Worker` | **قلب پروژه**: API، دیتابیس D1، ربات تلگرام، پنل مدیریت و خود وب‌اپ (`public/`). همهٔ اپ‌های دیگر از همین `public/` ساخته می‌شوند. |
| `2-Web-App-PWA` | کپی آمادهٔ وب‌اپ برای میزبانی روی هر هاست HTTPS دیگر (به API همین Worker وصل است) |
| `3-Desktop-Source-Electron` | نسخهٔ دسکتاپ (ویندوز / مک / لینوکس) |
| `4-Android-APK-Capacitor` | نسخهٔ اندروید (Capacitor 6) |
| `5-Telegram-Bot` | ربات پایتونی قدیمی (نسخهٔ فعلی ربات داخل Worker است) |
| `.github/workflows` | ساخت خودکار همهٔ اپ‌ها و انتشار Release، و استقرار خودکار Worker |

## ✨ امکانات
- **۱۱۷۶ لغت** آیلتس / تافل / عمومی در سطح‌های مختلف، هر لغت با تلفظ (آمریکایی/بریتانیایی)، تعریف، چند جملهٔ مثال و ترجمهٔ فارسی مثال‌ها
- **مرور فاصله‌دار هوشمند (FSRS)** با ۴ درجه، برنامهٔ روزانه، سقف لغت جدید، لغات ضعیف و «زالو»، تحلیل قدرت حافظه و زمان تخمینی اتمام مسیر
- **ریدینگ** IELTS / TOEFL / GRE / PTE / General — ۲۰ متن و ۱۶۲ سؤال در ۱۲ نوع سؤال آزمون، تایمر، نمرهٔ تخمینی، ترجمهٔ لمسی کلمه/پاراگراف، ذخیرهٔ لغات متن
- **آزمون تعیین سطح** تطبیقی (CEFR، دامنهٔ لغات، معادل آیلتس/تافل)
- **مسابقهٔ زنده** با دوستان یا حریف تصادفی (رتبهٔ Elo) و تمرین آفلاین با ربات؛ **جدول امتیازات**
- **مربی هوش مصنوعی** (Cloudflare Workers AI): بررسی جملهٔ شما و توضیح فارسی لغت
- آزمونک‌ها، فلش‌کارت، لغات شخصی، مدال‌ها، زنجیرهٔ روزانه، آمار و نقشهٔ فعالیت
- **ارسال نظر و گزارش مشکل** از داخل اپ و دیدن پاسخ مدیر
- اندازهٔ قلم قابل تنظیم، حالت تیره، نمایش درست روی گوشی‌های کوچک، میانبرهای صفحه‌کلید
- **پنل مدیریت** (ورود با تلگرام مدیر یا ایمیل مدیر): داشبورد، آمار و تحلیل (DAU/WAU/MAU، ماندگاری گروه‌ها، قیف، سخت‌ترین لغات، عملکرد بسته‌ها، پلتفرم‌ها)، کاربران، پیام همگانی، بانک لغات، متن‌های ریدینگ، صندوق پیام‌ها (با پاسخ در تلگرام)، مسابقه‌ها، جدول امتیازات، تنظیمات، امنیت و خروجی CSV/JSON

## 🚀 استقرار سرور (Cloudflare)
```bash
cd 6-Cloudflare-Worker
npm ci
export CLOUDFLARE_API_TOKEN=…  CLOUDFLARE_ACCOUNT_ID=…
npm run migrate        # اعمال مایگریشن‌های D1
npx wrangler deploy
```
با هر push به `main` که پوشهٔ `6-Cloudflare-Worker` را تغییر دهد، workflow «Deploy Cloudflare Worker» همین کار را خودکار انجام می‌دهد (Secretهای `CLOUDFLARE_API_TOKEN` و `CLOUDFLARE_ACCOUNT_ID`).
- مدیر: `ADMIN_EMAILS` و `ADMIN_TG_IDS` در `wrangler.toml`
- هوش مصنوعی: بلوک `[ai]` در `wrangler.toml` (اگر نباشد، اپ بررسی ساده‌تر آفلاین انجام می‌دهد)
- اجرای محلی بدون AI: یک کپی از `wrangler.toml` بدون بلوک `[ai]` با نام `wrangler.dev.toml` بسازید و `npx wrangler dev -c wrangler.dev.toml --local`

## 📱 ساخت اپ‌ها
**خودکار (پیشنهادی):** Actions ← «Build apps» ← Run workflow. خروجی: APK امضاشده، نصب‌کننده و نسخهٔ پرتابل ویندوز، dmg/zip مک، AppImage/deb لینوکس و zip وب — و یک Release تازه.

**دستی:**
```bash
# اندروید (JDK 17 + Android SDK)
cd 4-Android-APK-Capacitor && npm ci && npm run apk
#   کلید امضا: keystore/keystore.properties (در git نیست؛ در CI از Secretها ساخته می‌شود)

# دسکتاپ
cd 3-Desktop-Source-Electron && npm ci
npm run prepare-app && npm start   # اجرای آزمایشی
npm run dist:win | dist:mac | dist:linux
```
هر دو اسکریپت، `6-Cloudflare-Worker/public` را کپی و آدرس سرور را تزریق می‌کنند (`VAJEYAR_SERVER=https://… ` برای سرور دیگر).

---

# VajeYar — English vocabulary & reading trainer (EN)

One codebase (`6-Cloudflare-Worker/public`) powers the website/PWA, the Android app (Capacitor), the Windows/macOS/Linux apps (Electron) and the Telegram Mini App; accounts sync through a Cloudflare Worker + D1 API that also hosts the Telegram bot and the admin panel.

**Features:** 1,176 words with examples and Persian translations · FSRS spaced repetition with 4 grades, daily plan, weak-word and leech detection · exam-style reading (IELTS, TOEFL, GRE, PTE, General; 12 question types) · adaptive placement test · live duels with Elo + offline bot · leaderboards · AI tutor (Workers AI) · in-app feedback · adjustable font size, dark mode, offline-first service worker · admin panel with analytics, retention cohorts, reading CMS, feedback inbox, duels, leaderboards and exports.

**Deploy:** `cd 6-Cloudflare-Worker && npm ci && npm run migrate && npx wrangler deploy` (or push to `main`).
**Build apps:** run the *Build apps* workflow — it publishes a release with the APK, Windows installer/portable, macOS dmg/zip, Linux AppImage/deb and a web zip.
