# واژه‌یار (VajeYar) — اپلیکیشن آموزش لغات انگلیسی

> نسخهٔ ۱٫۰ · دوزبانه (فارسی / انگلیسی) · کاملاً آفلاین · ۶۸۹ لغت در ۳ دسته و ۱۰ سطح

## 📦 محتویات بسته

| پوشه | توضیح |
|---|---|
| `1-Windows-EXE` | فایل **VajeYar-Portable-1.0.0.exe** — بدون نصب، فقط دوبار کلیک کنید (ویندوز ۱۰/۱۱، ۶۴ بیتی) |
| `2-Web-App-PWA` | نسخهٔ **وب‌اپلیکیشن** (HTML/CSS/JS) — آمادهٔ تبدیل به PWA؛ شامل `manifest.webmanifest` و `sw.js` |
| `3-Desktop-Source-Electron` | سورس نسخهٔ دسکتاپ برای ساخت دوبارهٔ exe یا نصب‌کننده (Setup) |
| `4-Android-APK-Capacitor` | پیکربندی آماده برای ساخت **APK** اندروید |
| `5-Telegram-Bot` | **ربات تلگرام** با همهٔ امکانات + مینی‌اپ — راهنمای کامل در `5-Telegram-Bot/README.md` |

---

## 🤖 ربات تلگرام
پوشهٔ `5-Telegram-Bot`: توکن را در `.env` بگذارید و `run.sh` / `run.bat` یا `docker compose up -d` را اجرا کنید. جزئیات در README همان پوشه.

## 🚀 اجرا

**ویندوز:** فایل `VajeYar-Portable-1.0.0.exe` را اجرا کنید. اگر Windows SmartScreen هشدار داد، روی «More info» و بعد «Run anyway» بزنید (چون فایل امضای دیجیتال تجاری ندارد).

**وب:** پوشهٔ `2-Web-App-PWA` را روی هر هاست HTTPS (مثل Netlify، Vercel، GitHub Pages یا Cloudflare Pages) آپلود کنید. برای تست محلی:
```
cd 2-Web-App-PWA
python -m http.server 8080
```
سپس `http://localhost:8080` را باز کنید. (اجرای مستقیم `index.html` هم کار می‌کند، اما Service Worker فقط روی http/https فعال می‌شود.)

## 📱 تبدیل به PWA
همه‌چیز آماده است: Manifest، آیکن‌های ۱۹۲ و ۵۱۲ و Maskable، و Service Worker برای کار آفلاین. کافی است وب‌اپ را روی یک دامنهٔ **HTTPS** قرار دهید؛ مرورگر گزینهٔ «Install app / افزودن به صفحهٔ اصلی» را نشان می‌دهد (در تنظیمات برنامه هم دکمهٔ نصب ظاهر می‌شود).

## 🤖 ساخت APK اندروید
**روش ۱ — سریع (PWABuilder):** بعد از آپلود وب‌اپ روی HTTPS، آدرس را در [pwabuilder.com](https://www.pwabuilder.com) وارد کنید و Android → Download Package را بزنید (خروجی APK/AAB).

**روش ۲ — Capacitor (پیشنهادی):** نیازمند Node.js، JDK 17 و Android SDK
```
cd 4-Android-APK-Capacitor
npm install
npm run apk        ← ساخت مستقیم APK دیباگ
```
خروجی: `android/app/build/outputs/apk/debug/app-debug.apk`

آنچه داخل APK می‌نشیند از `6-Cloudflare-Worker/public` ساخته می‌شود (همان نسخه‌ای که حساب کاربری، همگام‌سازی و تلفظ صوتی سمت سرور را دارد) و آدرس سرور هنگام ساخت به `www/index.html` تزریق می‌شود. برای عوض‌کردن آدرس: `VAJEYAR_SERVER=https://your-domain npm run apk`. فقط برای بازکردن Android Studio: `npm run android`.

## 🛠 ساخت دوبارهٔ exe / نصب‌کننده
```
cd 3-Desktop-Source-Electron
xcopy /E /I ..\2-Web-App-PWA app      (در لینوکس/مک: cp -r ../2-Web-App-PWA app)
npm install
npm start              ← اجرای آزمایشی
npm run dist           ← ساخت exe پرتابل + نصب‌کنندهٔ Setup (روی ویندوز)
```

---

## ✨ ویژگی‌ها

### درخواست‌های شما
- رابط کاربری تمیز با ترکیب **بنفش روشن و زرد روشن** + **حالت تیره و روشن** (و حالت سیستم)
- **دوزبانه:** انتخاب زبان فارسی یا انگلیسی از همان صفحهٔ اول (با راست‌چین کامل)؛ لغات همیشه انگلیسی‌اند
- دسته‌های **عمومی (General)**، **آیلتس (IELTS)** و **تافل (TOEFL)**، هر کدام **سطح‌بندی‌شده از آسان به سخت**
  - عمومی: پایه (A1–A2) ← متوسط/رگولار (B1) ← فوق‌متوسط (B2) ← پیشرفته/ادونس (C1–C2)
  - آیلتس: نمرهٔ ۵–۶ ← ۶٫۵–۷ ← ۷٫۵–۹
  - تافل: پایه ← متوسط ← پیشرفته
- **فلش‌کارت** با دکمه‌های «فهمیدم» و «نفهمیدم (دوباره تکرار شود)»
- زمان‌بندی تکرار: **۱ روز، ۲ روز، ۳ روز، ۱ هفته، ۱ ماه**
- **آزمون (کوییز)** از لغاتی که در ۷ یا ۳۰ روز اخیر خوانده‌اید (و منابع دیگر)

### ویژگی‌های اضافه‌شده بر اساس تحقیق
| ویژگی | چرا |
|---|---|
| **تکرار فاصله‌دار هوشمند** (الگوریتم الهام‌گرفته از SM-2، مثل Anki) + **۶ جعبهٔ لایتنر** | پایهٔ علمی حفظ بلندمدت (منحنی فراموشی ابینگهاوس) |
| **۸ نوع سؤال:** معنی، معکوس، تعریف، املا (تایپی)، شنیداری (دیکته)، جای خالی، درست/غلط، ترکیبی | «اثر آزمون» (Retrieval practice) بیشتر از مرور ساده باعث یادگیری می‌شود |
| **تلفظ صوتی** (آمریکایی/بریتانیایی، تنظیم سرعت، پخش خودکار) | تقریباً همهٔ اپ‌های برتر دارند |
| **جملهٔ مثال** برای هر لغت + تعریف انگلیسی + نوع کلمه + سطح CEFR | یادگیری لغت در بافت جمله |
| **دیکشنری آنلاین اختیاری:** آوانگاری، صدای واقعی US/UK، مترادف، متضاد، تعاریف بیشتر | |
| **لغت روز** | عادت‌سازی روزانه |
| **رکورد روزهای پیاپی (Streak)** + **محافظ رکورد** + **هدف روزانه** | طبق داده‌های Duolingo، Streak مهم‌ترین عامل ماندگاری کاربر است |
| **امتیاز (XP)، سطح، ۱۴ دستاورد** | انگیزه و گیمیفیکیشن |
| **بازی‌ها:** جفت‌یابی زمان‌دار و دور سرعتی ۶۰ ثانیه‌ای | تنوع تمرین |
| **آمار کامل:** نمودار ۱۴ روز، پیش‌بینی مرور ۷ روز آینده، تقویم مطالعه، توزیع جعبه‌ها، پیشرفت هر دسته، دقت | |
| **نشان‌کردن لغات (★)**، **لغات سخت**، **یادداشت شخصی/نکتهٔ حفظی** برای هر لغت | |
| **دیکشنری داخلی** با جستجوی فارسی/انگلیسی و فیلتر دسته/سطح/وضعیت | |
| **لغات من:** افزودن لغت شخصی + **ترجمهٔ خودکار** + ورود/خروج CSV | |
| **پشتیبان‌گیری و بازیابی** کل پیشرفت (فایل JSON) | |
| **یادآور روزانه** (اعلان) | |
| **میانبرهای صفحه‌کلید** (Space، ۱ تا ۷، K، S، Esc) | |
| **واکنش‌گرا:** دسکتاپ، تبلت و موبایل (منوی پایین در موبایل) | |
| **کاملاً آفلاین**، بدون تبلیغ و بدون نیاز به ثبت‌نام | |

### نکتهٔ فنی
- تمام داده‌ها در حافظهٔ محلی دستگاه (localStorage) ذخیره می‌شوند.
- برای افزودن لغات بیشتر به بانک لغت، فایل‌های `2-Web-App-PWA/js/words_*.js` را ویرایش کنید (قالب هر خط: `word|pos|معنی فارسی|English definition|Example sentence`) یا از بخش «لغات من» فایل CSV وارد کنید.

---

# VajeYar — English Vocabulary Trainer (EN)

Bilingual (Persian/English UI), offline-first vocabulary app with 689 words across **General / IELTS / TOEFL**, each ordered easy → hard. Spaced-repetition flashcards (Got it / Didn't get it / 1 day / 2 days / 3 days / 1 week / 1 month), 8 quiz types, TTS pronunciation, streaks, XP, achievements, statistics, games, dictionary, custom words with CSV import/export, backup/restore, reminders, light/dark theme.

- **Windows:** run `1-Windows-EXE/VajeYar-Portable-1.0.0.exe` (no install needed).
- **Web / PWA:** host `2-Web-App-PWA` on any HTTPS host — it is installable as a PWA.
- **APK:** use PWABuilder, or Capacitor in `4-Android-APK-Capacitor` (`npm install && npm run android`).
- **Rebuild desktop:** copy the web app into `3-Desktop-Source-Electron/app`, then `npm install && npm run dist`.
