-- ===== VajeYar · Cloudflare D1 database =====
-- All timestamps are milliseconds since epoch unless noted.
CREATE TABLE IF NOT EXISTS meta (key TEXT PRIMARY KEY, value TEXT NOT NULL);

CREATE TABLE IF NOT EXISTS categories (
  id TEXT PRIMARY KEY, name_en TEXT NOT NULL, name_fa TEXT NOT NULL, icon TEXT NOT NULL DEFAULT '', sort INTEGER NOT NULL DEFAULT 0);
CREATE TABLE IF NOT EXISTS levels (
  category_id TEXT NOT NULL REFERENCES categories(id) ON DELETE CASCADE, level_no INTEGER NOT NULL,
  name_en TEXT NOT NULL, name_fa TEXT NOT NULL, cefr TEXT NOT NULL DEFAULT '', PRIMARY KEY (category_id, level_no));

-- the word bank shown in every app (web, desktop, Telegram)
CREATE TABLE IF NOT EXISTS words (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  slug TEXT NOT NULL UNIQUE,                 -- "<category>:<word>" — permanent id, users' progress points to it
  word TEXT NOT NULL,
  pos TEXT NOT NULL DEFAULT 'n' CHECK (pos IN ('n','v','adj','adv','prep','conj','phr')),
  meaning_fa TEXT NOT NULL, definition TEXT NOT NULL DEFAULT '', example TEXT NOT NULL DEFAULT '',
  category_id TEXT NOT NULL, level_no INTEGER NOT NULL DEFAULT 1,
  is_active INTEGER NOT NULL DEFAULT 1,      -- 0 = hidden (soft delete)
  created_at INTEGER NOT NULL, updated_at INTEGER NOT NULL);
CREATE INDEX IF NOT EXISTS ix_words_deck ON words(category_id, level_no, is_active);
CREATE INDEX IF NOT EXISTS ix_words_word ON words(word);

-- one account = web login (email / phone + password) and/or a Telegram account
CREATE TABLE IF NOT EXISTS users (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  email TEXT UNIQUE, phone TEXT UNIQUE,
  password_hash TEXT,                        -- pbkdf2$iter$salt$hash (NULL for Telegram-only accounts)
  telegram_id INTEGER UNIQUE, tg_username TEXT, tg_name TEXT,
  display_name TEXT NOT NULL DEFAULT '',
  role TEXT NOT NULL DEFAULT 'user' CHECK (role IN ('user','admin')),
  rev INTEGER NOT NULL DEFAULT 0,            -- sync revision counter
  tz TEXT NOT NULL DEFAULT 'Asia/Tehran',
  blocked_bot INTEGER NOT NULL DEFAULT 0,
  created_at INTEGER NOT NULL, last_login_at INTEGER, last_sync_at INTEGER, last_bot_at INTEGER,
  CHECK (email IS NOT NULL OR phone IS NOT NULL OR telegram_id IS NOT NULL));

CREATE TABLE IF NOT EXISTS sessions (
  token_hash TEXT PRIMARY KEY, user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  created_at INTEGER NOT NULL, last_seen_at INTEGER NOT NULL, expires_at INTEGER NOT NULL, user_agent TEXT NOT NULL DEFAULT '');
CREATE INDEX IF NOT EXISTS ix_sessions_user ON sessions(user_id);

-- short-lived codes: 'link' (web account → Telegram) and 'login' (Telegram → web sign-in)
CREATE TABLE IF NOT EXISTS auth_codes (
  code TEXT PRIMARY KEY, kind TEXT NOT NULL, user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  expires_at INTEGER NOT NULL);

CREATE TABLE IF NOT EXISTS login_attempts (key TEXT PRIMARY KEY, fails INTEGER NOT NULL, until INTEGER NOT NULL);

CREATE TABLE IF NOT EXISTS user_profile (
  user_id INTEGER PRIMARY KEY REFERENCES users(id) ON DELETE CASCADE,
  settings_json TEXT NOT NULL DEFAULT '{}', onboarded INTEGER NOT NULL DEFAULT 0, xp INTEGER NOT NULL DEFAULT 0,
  streak_count INTEGER NOT NULL DEFAULT 0, streak_best INTEGER NOT NULL DEFAULT 0, streak_last TEXT, streak_freezes INTEGER NOT NULL DEFAULT 0,
  match_best INTEGER, speed_best INTEGER NOT NULL DEFAULT 0, notified TEXT,
  updated_at INTEGER NOT NULL DEFAULT 0, rev INTEGER NOT NULL DEFAULT 0);

CREATE TABLE IF NOT EXISTS user_progress (
  user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE, word_slug TEXT NOT NULL,
  seen INTEGER NOT NULL DEFAULT 0, reps INTEGER NOT NULL DEFAULT 0, ease REAL NOT NULL DEFAULT 2.5, interval_days REAL NOT NULL DEFAULT 0,
  due_at INTEGER NOT NULL DEFAULT 0, lapses INTEGER NOT NULL DEFAULT 0, correct_count INTEGER NOT NULL DEFAULT 0, wrong_count INTEGER NOT NULL DEFAULT 0,
  starred INTEGER NOT NULL DEFAULT 0, note TEXT NOT NULL DEFAULT '', first_seen_at INTEGER NOT NULL DEFAULT 0, last_seen_at INTEGER NOT NULL DEFAULT 0,
  deleted INTEGER NOT NULL DEFAULT 0, updated_at INTEGER NOT NULL DEFAULT 0, rev INTEGER NOT NULL DEFAULT 0,
  PRIMARY KEY (user_id, word_slug));
CREATE INDEX IF NOT EXISTS ix_progress_rev ON user_progress(user_id, rev);
CREATE INDEX IF NOT EXISTS ix_progress_due ON user_progress(user_id, seen, due_at);

CREATE TABLE IF NOT EXISTS user_daily_activity (
  user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE, day TEXT NOT NULL,
  reviews INTEGER NOT NULL DEFAULT 0, new_words INTEGER NOT NULL DEFAULT 0, correct INTEGER NOT NULL DEFAULT 0, wrong INTEGER NOT NULL DEFAULT 0,
  xp INTEGER NOT NULL DEFAULT 0, rev INTEGER NOT NULL DEFAULT 0, PRIMARY KEY (user_id, day));
CREATE INDEX IF NOT EXISTS ix_days_rev ON user_daily_activity(user_id, rev);

CREATE TABLE IF NOT EXISTS user_custom_words (
  user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE, slug TEXT NOT NULL, word TEXT NOT NULL,
  pos TEXT NOT NULL DEFAULT 'n', meaning_fa TEXT NOT NULL DEFAULT '', definition TEXT NOT NULL DEFAULT '', example TEXT NOT NULL DEFAULT '',
  deleted INTEGER NOT NULL DEFAULT 0, created_at INTEGER NOT NULL DEFAULT 0, updated_at INTEGER NOT NULL DEFAULT 0, rev INTEGER NOT NULL DEFAULT 0,
  PRIMARY KEY (user_id, slug));
CREATE INDEX IF NOT EXISTS ix_custom_rev ON user_custom_words(user_id, rev);

CREATE TABLE IF NOT EXISTS user_achievements (
  user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE, achievement_id TEXT NOT NULL, unlocked_at INTEGER NOT NULL,
  rev INTEGER NOT NULL DEFAULT 0, PRIMARY KEY (user_id, achievement_id));

CREATE TABLE IF NOT EXISTS quiz_results (
  id INTEGER PRIMARY KEY AUTOINCREMENT, user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  taken_at INTEGER NOT NULL, score INTEGER NOT NULL, total INTEGER NOT NULL, rev INTEGER NOT NULL DEFAULT 0, UNIQUE (user_id, taken_at));

-- Telegram bot: per-user conversation state (current flashcard session, quiz, waiting for input …)
CREATE TABLE IF NOT EXISTS bot_state (user_id INTEGER PRIMARY KEY REFERENCES users(id) ON DELETE CASCADE, data TEXT NOT NULL DEFAULT '{}', updated_at INTEGER NOT NULL DEFAULT 0);
-- Telegram file_id cache for pronunciation audio
CREATE TABLE IF NOT EXISTS tts_cache (key TEXT PRIMARY KEY, file_id TEXT NOT NULL);

CREATE VIEW IF NOT EXISTS v_user_summary AS
SELECT u.id, COALESCE(u.email, u.phone, CASE WHEN u.tg_username IS NOT NULL THEN '@' || u.tg_username END, 'tg:' || u.telegram_id) AS login,
       u.email, u.phone, u.telegram_id, u.tg_username, u.display_name, u.role,
       COALESCE(p.xp, 0) AS xp, COALESCE(p.streak_best, 0) AS best_streak,
       (SELECT COUNT(*) FROM user_progress g WHERE g.user_id = u.id AND g.seen = 1 AND g.deleted = 0) AS learned,
       (SELECT COUNT(*) FROM user_progress g WHERE g.user_id = u.id AND g.seen = 1 AND g.deleted = 0 AND g.interval_days >= 21) AS mastered,
       (SELECT COALESCE(SUM(reviews), 0) FROM user_daily_activity d WHERE d.user_id = u.id) AS total_reviews,
       (SELECT MAX(day) FROM user_daily_activity d WHERE d.user_id = u.id) AS last_active_day,
       u.created_at, u.last_login_at, u.last_sync_at, u.last_bot_at
FROM users u LEFT JOIN user_profile p ON p.user_id = u.id;

CREATE VIEW IF NOT EXISTS v_word_bank AS
SELECT w.id, w.slug, w.word, w.pos, w.meaning_fa, w.definition, w.example, c.name_en AS category, l.name_en AS level, l.cefr, w.is_active, w.updated_at
FROM words w JOIN categories c ON c.id = w.category_id JOIN levels l ON l.category_id = w.category_id AND l.level_no = w.level_no;

INSERT OR IGNORE INTO categories(id,name_en,name_fa,icon,sort) VALUES
 ('general','General English','لغات عمومی','🌍',1),('ielts','IELTS','آیلتس','🎓',2),('toefl','TOEFL','تافل','🏛️',3);
INSERT OR IGNORE INTO levels(category_id,level_no,name_en,name_fa,cefr) VALUES
 ('general',1,'Basic','پایه','A1–A2'),('general',2,'Regular','متوسط','B1'),('general',3,'Upper-Intermediate','فوق‌متوسط','B2'),('general',4,'Advanced','پیشرفته','C1–C2'),
 ('ielts',1,'Band 5 – 6','نمرهٔ ۵ تا ۶','B1'),('ielts',2,'Band 6.5 – 7','نمرهٔ ۶٫۵ تا ۷','B2'),('ielts',3,'Band 7.5 – 9','نمرهٔ ۷٫۵ تا ۹','C1–C2'),
 ('toefl',1,'Foundation','پایه','B1'),('toefl',2,'Intermediate','متوسط','B2'),('toefl',3,'Advanced','پیشرفته','C1–C2');
