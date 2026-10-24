-- ===== DanaFox v3: examples with translations, IELTS Reading vocabulary, usernames, generic sync store,
--       reading passages (CMS), language duels, feedback, placement results =====
ALTER TABLE words ADD COLUMN examples TEXT NOT NULL DEFAULT '[]';          -- JSON [[english, persian], ...]
INSERT OR IGNORE INTO levels(category_id,level_no,name_en,name_fa,cefr) VALUES
  ('ielts',4,'Reading · Core','ریدینگ · پایه','B2'),
  ('ielts',5,'Reading · Upper','ریدینگ · متوسط','B2–C1'),
  ('ielts',6,'Reading · Advanced','ریدینگ · پیشرفته','C1–C2');

ALTER TABLE users ADD COLUMN username TEXT;                                -- public handle for duels (lower-case, unique)
CREATE UNIQUE INDEX IF NOT EXISTS ux_users_username ON users(username) WHERE username IS NOT NULL;

-- generic per-user key/value data synced between devices (reading results, placement test, smart-plan state …)
CREATE TABLE IF NOT EXISTS user_kv (
  user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE, k TEXT NOT NULL, data TEXT NOT NULL DEFAULT 'null',
  deleted INTEGER NOT NULL DEFAULT 0, updated_at INTEGER NOT NULL DEFAULT 0, rev INTEGER NOT NULL DEFAULT 0,
  PRIMARY KEY (user_id, k));
CREATE INDEX IF NOT EXISTS ix_kv_rev ON user_kv(user_id, rev);

-- reading passages managed in the admin panel (the apps also ship a built-in copy for offline use)
CREATE TABLE IF NOT EXISTS readings (
  id INTEGER PRIMARY KEY AUTOINCREMENT, slug TEXT NOT NULL UNIQUE, exam TEXT NOT NULL, level_no INTEGER NOT NULL DEFAULT 1,
  title TEXT NOT NULL, data TEXT NOT NULL, is_active INTEGER NOT NULL DEFAULT 1, sort INTEGER NOT NULL DEFAULT 0,
  created_at INTEGER NOT NULL, updated_at INTEGER NOT NULL);
CREATE INDEX IF NOT EXISTS ix_readings_exam ON readings(exam, level_no, is_active);

-- language duels (two players answer the same questions; clients poll the state)
CREATE TABLE IF NOT EXISTS duels (
  id INTEGER PRIMARY KEY AUTOINCREMENT, code TEXT NOT NULL UNIQUE,
  a_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE, b_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
  status TEXT NOT NULL DEFAULT 'invited' CHECK (status IN ('waiting','invited','active','done','declined','cancelled','expired')),
  cat TEXT NOT NULL DEFAULT 'mix', level_no INTEGER NOT NULL DEFAULT 0, n INTEGER NOT NULL DEFAULT 10,
  questions TEXT NOT NULL DEFAULT '[]',
  a_answers TEXT NOT NULL DEFAULT '[]', b_answers TEXT NOT NULL DEFAULT '[]',
  a_score INTEGER NOT NULL DEFAULT 0, b_score INTEGER NOT NULL DEFAULT 0, a_ms INTEGER NOT NULL DEFAULT 0, b_ms INTEGER NOT NULL DEFAULT 0,
  a_done INTEGER NOT NULL DEFAULT 0, b_done INTEGER NOT NULL DEFAULT 0, winner_id INTEGER, a_delta INTEGER NOT NULL DEFAULT 0, b_delta INTEGER NOT NULL DEFAULT 0,
  created_at INTEGER NOT NULL, started_at INTEGER, finished_at INTEGER, updated_at INTEGER NOT NULL DEFAULT 0);
CREATE INDEX IF NOT EXISTS ix_duels_a ON duels(a_id, status);
CREATE INDEX IF NOT EXISTS ix_duels_b ON duels(b_id, status);
CREATE INDEX IF NOT EXISTS ix_duels_status ON duels(status, created_at);
CREATE TABLE IF NOT EXISTS duel_stats (
  user_id INTEGER PRIMARY KEY REFERENCES users(id) ON DELETE CASCADE, rating INTEGER NOT NULL DEFAULT 1000,
  wins INTEGER NOT NULL DEFAULT 0, losses INTEGER NOT NULL DEFAULT 0, draws INTEGER NOT NULL DEFAULT 0, updated_at INTEGER NOT NULL DEFAULT 0);

-- feedback / bug reports / content reports sent from the apps
CREATE TABLE IF NOT EXISTS feedback (
  id INTEGER PRIMARY KEY AUTOINCREMENT, user_id INTEGER, kind TEXT NOT NULL DEFAULT 'idea', text TEXT NOT NULL,
  ref TEXT NOT NULL DEFAULT '', platform TEXT NOT NULL DEFAULT '', status TEXT NOT NULL DEFAULT 'new', reply TEXT NOT NULL DEFAULT '',
  created_at INTEGER NOT NULL, updated_at INTEGER NOT NULL DEFAULT 0);
CREATE INDEX IF NOT EXISTS ix_feedback_status ON feedback(status, created_at);
