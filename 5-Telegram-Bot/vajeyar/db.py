"""SQLite storage (aiosqlite)."""
import json
import time
import aiosqlite
from .config import DB_PATH, DEFAULT_LANG, DEFAULT_TZ

SCHEMA = """
PRAGMA journal_mode=WAL;
CREATE TABLE IF NOT EXISTS users (id INTEGER PRIMARY KEY, data TEXT NOT NULL, created REAL);
CREATE TABLE IF NOT EXISTS progress (
  uid INTEGER, wid TEXT, seen INTEGER DEFAULT 0, reps INTEGER DEFAULT 0, ease REAL DEFAULT 2.5,
  ivl REAL DEFAULT 0, due REAL DEFAULT 0, lapses INTEGER DEFAULT 0, ok INTEGER DEFAULT 0, bad INTEGER DEFAULT 0,
  star INTEGER DEFAULT 0, note TEXT DEFAULT '', first REAL DEFAULT 0, last REAL DEFAULT 0, PRIMARY KEY (uid, wid));
CREATE INDEX IF NOT EXISTS ix_progress_due ON progress(uid, seen, due);
CREATE TABLE IF NOT EXISTS days (uid INTEGER, day TEXT, reviews INTEGER DEFAULT 0, new INTEGER DEFAULT 0,
  correct INTEGER DEFAULT 0, wrong INTEGER DEFAULT 0, xp INTEGER DEFAULT 0, PRIMARY KEY (uid, day));
CREATE TABLE IF NOT EXISTS custom (id INTEGER PRIMARY KEY AUTOINCREMENT, uid INTEGER, word TEXT, fa TEXT, pos TEXT, def TEXT, ex TEXT, created REAL);
CREATE INDEX IF NOT EXISTS ix_custom_uid ON custom(uid);
CREATE TABLE IF NOT EXISTS media (key TEXT PRIMARY KEY, file_id TEXT);
CREATE TABLE IF NOT EXISTS dict_cache (word TEXT PRIMARY KEY, data TEXT, ts REAL);
"""

DEFAULT_USER = dict(
    lang=DEFAULT_LANG, track="general", goal=20, session=10, front="en", accent="en-US", slow=False,
    autoplay=False, images=True, online=True, reminder=True, rtime="20:00", tz=DEFAULT_TZ, wotd=True, wtime="09:00",
    xp=0, streak=0, best=0, last=None, freezes=0, onboarded=False, ach={}, quizzes=[], match_best=None, speed_best=0,
    notified=None, wotd_sent=None, name="", screen=None, blocked=False,
    qcfg={"src": "recent7", "type": "mixed", "count": 10, "timer": False},
)

_db: aiosqlite.Connection | None = None


async def init():
    global _db
    _db = await aiosqlite.connect(DB_PATH)
    _db.row_factory = aiosqlite.Row
    await _db.executescript(SCHEMA)
    await _db.commit()


async def close():
    if _db:
        await _db.close()


def conn() -> aiosqlite.Connection:
    return _db


# ---------- users ----------
async def get_user(uid: int) -> dict:
    async with _db.execute("SELECT data FROM users WHERE id=?", (uid,)) as cur:
        row = await cur.fetchone()
    base = json.loads(json.dumps(DEFAULT_USER))
    if row:
        base.update(json.loads(row["data"]))
        if isinstance(base.get("qcfg"), dict):
            q = dict(DEFAULT_USER["qcfg"]); q.update(base["qcfg"]); base["qcfg"] = q
    base["id"] = uid
    base["_new"] = row is None
    return base


async def save_user(u: dict):
    data = {k: v for k, v in u.items() if k not in ("id", "_new")}
    await _db.execute("INSERT INTO users(id,data,created) VALUES(?,?,?) ON CONFLICT(id) DO UPDATE SET data=excluded.data",
                      (u["id"], json.dumps(data, ensure_ascii=False), time.time()))
    await _db.commit()
    u["_new"] = False


async def all_users():
    async with _db.execute("SELECT id, data FROM users") as cur:
        rows = await cur.fetchall()
    out = []
    for r in rows:
        u = json.loads(json.dumps(DEFAULT_USER)); u.update(json.loads(r["data"])); u["id"] = r["id"]; out.append(u)
    return out


# ---------- progress ----------
async def get_p(uid, wid):
    async with _db.execute("SELECT * FROM progress WHERE uid=? AND wid=?", (uid, wid)) as cur:
        r = await cur.fetchone()
    return dict(r) if r else None


async def all_p(uid) -> dict:
    async with _db.execute("SELECT * FROM progress WHERE uid=?", (uid,)) as cur:
        return {r["wid"]: dict(r) for r in await cur.fetchall()}


async def save_p(uid, p: dict):
    cols = ["seen", "reps", "ease", "ivl", "due", "lapses", "ok", "bad", "star", "note", "first", "last"]
    await _db.execute(f"INSERT INTO progress(uid,wid,{','.join(cols)}) VALUES(?,?,{','.join('?'*len(cols))}) "
                      f"ON CONFLICT(uid,wid) DO UPDATE SET {','.join(c+'=excluded.'+c for c in cols)}",
                      (uid, p["wid"], *[p.get(c, 0 if c != "note" else "") for c in cols]))
    await _db.commit()


async def del_p(uid, wid=None):
    if wid:
        await _db.execute("DELETE FROM progress WHERE uid=? AND wid=?", (uid, wid))
    else:
        await _db.execute("DELETE FROM progress WHERE uid=?", (uid,))
    await _db.commit()


# ---------- days ----------
async def inc_day(uid, day, **inc):
    await _db.execute("INSERT OR IGNORE INTO days(uid,day) VALUES(?,?)", (uid, day))
    sets = ",".join(f"{k}={k}+?" for k in inc)
    await _db.execute(f"UPDATE days SET {sets} WHERE uid=? AND day=?", (*inc.values(), uid, day))
    await _db.commit()


async def get_days(uid) -> dict:
    async with _db.execute("SELECT * FROM days WHERE uid=?", (uid,)) as cur:
        return {r["day"]: dict(r) for r in await cur.fetchall()}


# ---------- custom words ----------
async def add_custom(uid, word, fa, pos, df, ex):
    cur = await _db.execute("INSERT INTO custom(uid,word,fa,pos,def,ex,created) VALUES(?,?,?,?,?,?,?)", (uid, word, fa, pos, df, ex, time.time()))
    await _db.commit()
    return cur.lastrowid


async def list_custom(uid):
    async with _db.execute("SELECT * FROM custom WHERE uid=? ORDER BY id", (uid,)) as cur:
        return [dict(r) for r in await cur.fetchall()]


async def get_custom(cid):
    async with _db.execute("SELECT * FROM custom WHERE id=?", (cid,)) as cur:
        r = await cur.fetchone()
    return dict(r) if r else None


async def del_custom(uid, cid):
    await _db.execute("DELETE FROM custom WHERE uid=? AND id=?", (uid, cid))
    await _db.execute("DELETE FROM progress WHERE uid=? AND wid=?", (uid, f"u:{cid}"))
    await _db.commit()


async def wipe_user(uid):
    for tb in ("progress", "days", "custom"):
        await _db.execute(f"DELETE FROM {tb} WHERE uid=?", (uid,))
    await _db.execute("DELETE FROM users WHERE id=?", (uid,))
    await _db.commit()


# ---------- media & dictionary cache ----------
async def media_get(key):
    async with _db.execute("SELECT file_id FROM media WHERE key=?", (key,)) as cur:
        r = await cur.fetchone()
    return r["file_id"] if r else None


async def media_set(key, file_id):
    await _db.execute("INSERT OR REPLACE INTO media(key,file_id) VALUES(?,?)", (key, file_id))
    await _db.commit()


async def dict_get(word):
    async with _db.execute("SELECT data FROM dict_cache WHERE word=?", (word,)) as cur:
        r = await cur.fetchone()
    return json.loads(r["data"]) if r else None


async def dict_set(word, data):
    await _db.execute("INSERT OR REPLACE INTO dict_cache(word,data,ts) VALUES(?,?,?)", (word, json.dumps(data, ensure_ascii=False), time.time()))
    await _db.commit()
