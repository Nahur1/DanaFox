-- ===== DanaFox · admin panel v2: audit log, broadcasts, blocked users, admin-only sessions =====
ALTER TABLE users ADD COLUMN blocked INTEGER NOT NULL DEFAULT 0;          -- 1 = account blocked by the admin
ALTER TABLE sessions ADD COLUMN is_admin INTEGER NOT NULL DEFAULT 0;     -- admin-panel sessions (short-lived, separate from app sessions)
ALTER TABLE sessions ADD COLUMN ip TEXT NOT NULL DEFAULT '';

CREATE TABLE IF NOT EXISTS admin_log (
  id INTEGER PRIMARY KEY AUTOINCREMENT, at INTEGER NOT NULL, admin_id INTEGER, tg_id INTEGER,
  action TEXT NOT NULL, details TEXT NOT NULL DEFAULT '', ip TEXT NOT NULL DEFAULT '', ua TEXT NOT NULL DEFAULT '');
CREATE INDEX IF NOT EXISTS ix_admin_log_at ON admin_log(at);

CREATE TABLE IF NOT EXISTS broadcasts (
  id INTEGER PRIMARY KEY AUTOINCREMENT, created_at INTEGER NOT NULL, admin_id INTEGER,
  text TEXT NOT NULL, button_text TEXT, button_url TEXT, open_app INTEGER NOT NULL DEFAULT 0,
  audience TEXT NOT NULL DEFAULT 'all', status TEXT NOT NULL DEFAULT 'running' CHECK (status IN ('running','done','cancelled')),
  total INTEGER NOT NULL DEFAULT 0, sent INTEGER NOT NULL DEFAULT 0, failed INTEGER NOT NULL DEFAULT 0, blocked INTEGER NOT NULL DEFAULT 0,
  cursor INTEGER NOT NULL DEFAULT 0, finished_at INTEGER, updated_at INTEGER NOT NULL DEFAULT 0);

CREATE INDEX IF NOT EXISTS ix_users_created ON users(created_at);
CREATE INDEX IF NOT EXISTS ix_days_day ON user_daily_activity(day);
