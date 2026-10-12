"""Learning engine: spaced repetition (SM-2 inspired + Leitner boxes), streaks, XP, achievements."""
import math
import random
import time
from datetime import datetime, timedelta, date
from zoneinfo import ZoneInfo

from . import db
from .words import WORDS, BY_ID, BY_KEY, Word, custom_word

DAY = 86400


# ---------- time ----------
def tz(u):
    try:
        return ZoneInfo(u.get("tz") or "Asia/Tehran")
    except Exception:
        return ZoneInfo("UTC")


def now_local(u):
    return datetime.now(tz(u))


def day_key(u, offset=0):
    return (now_local(u).date() + timedelta(days=offset)).isoformat()


def start_of_day(u, offset=0):
    d = now_local(u).date() + timedelta(days=offset)
    return datetime.combine(d, datetime.min.time(), tz(u)).timestamp()


# ---------- words ----------
async def user_words(uid) -> list[Word]:
    return WORDS + [custom_word(r) for r in await db.list_custom(uid)]


async def word_by_key(key: str) -> Word | None:
    if key.startswith("g"):
        return BY_KEY.get(key)
    if key.startswith("c") and key[1:].isdigit():
        r = await db.get_custom(int(key[1:]))
        return custom_word(r) if r else None
    return None


async def word_by_id(wid: str) -> Word | None:
    if wid.startswith("u:"):
        r = await db.get_custom(int(wid[2:]))
        return custom_word(r) if r else None
    return BY_ID.get(wid)


def new_p(wid):
    return dict(wid=wid, seen=0, reps=0, ease=2.5, ivl=0, due=0, lapses=0, ok=0, bad=0, star=0, note="", first=0, last=0)


def status(p):
    if not p or not p["seen"]:
        return "new"
    if p["ivl"] >= 21:
        return "mastered"
    if p["ivl"] >= 3:
        return "review"
    return "learning"


def box(p):
    if not p or not p["seen"]:
        return 0
    i = p["ivl"]
    return 1 if i < 1 else 2 if i < 3 else 3 if i < 7 else 4 if i < 21 else 5 if i < 60 else 6


def good_interval(p):
    if not p or not p["reps"]:
        return 1
    if p["reps"] == 1:
        return 3
    return max(int(p["ivl"]) + 1, round(p["ivl"] * p["ease"]))


def is_due(p):
    return bool(p and p["seen"] and p["due"] <= time.time())


async def due_ids(uid):
    async with db.conn().execute("SELECT wid FROM progress WHERE uid=? AND seen=1 AND due<=? ORDER BY due", (uid, time.time())) as cur:
        return [r["wid"] for r in await cur.fetchall()]


async def due_count(uid):
    async with db.conn().execute("SELECT COUNT(*) c FROM progress WHERE uid=? AND seen=1 AND due<=?", (uid, time.time())) as cur:
        return (await cur.fetchone())["c"]


# ---------- activity / streak / xp ----------
def update_streak(u):
    today, y, y2 = day_key(u), day_key(u, -1), day_key(u, -2)
    if u.get("last") == today:
        return
    if u.get("last") == y:
        u["streak"] += 1
    elif u.get("last") == y2 and u.get("freezes", 0) > 0:
        u["freezes"] -= 1; u["streak"] += 1
    else:
        u["streak"] = 1
    u["last"] = today
    u["best"] = max(u.get("best", 0), u["streak"])
    if u["streak"] % 7 == 0:
        u["freezes"] = min(2, u.get("freezes", 0) + 1)


def streak_now(u):
    last = u.get("last")
    if not last:
        return 0
    if last in (day_key(u), day_key(u, -1)) or (last == day_key(u, -2) and u.get("freezes", 0) > 0):
        return u["streak"]
    return 0


def level_of(xp):
    return int(math.sqrt(xp / 40)) + 1


def level_range(lv):
    return 40 * (lv - 1) ** 2, 40 * lv ** 2


async def log(u, events: list, xp=0, **inc):
    """Record activity for today; appends 'levelup:N' / 'ach:id' strings to events."""
    update_streak(u)
    if xp:
        before = level_of(u["xp"]); u["xp"] += xp
        if level_of(u["xp"]) > before:
            events.append(f"levelup:{level_of(u['xp'])}")
        inc["xp"] = xp
    if inc:
        await db.inc_day(u["id"], day_key(u), **inc)


async def rate(u, wid, kind, days=0, events=None):
    events = events if events is not None else []
    p = await db.get_p(u["id"], wid) or new_p(wid)
    now = time.time()
    is_new = not p["seen"]
    if is_new:
        p["seen"] = 1; p["first"] = now
    p["last"] = now
    sod = start_of_day(u)
    if kind == "again":
        p["lapses"] += 1; p["bad"] += 1; p["ease"] = max(1.3, p["ease"] - 0.2); p["reps"] = 0; p["ivl"] = 0; p["due"] = now
    elif kind == "good":
        p["ivl"] = good_interval(p); p["reps"] += 1; p["ok"] += 1; p["ease"] = min(3.0, p["ease"] + 0.05); p["due"] = start_of_day(u, int(p["ivl"]))
    elif kind == "days":
        p["ivl"] = days; p["reps"] = max(1, p["reps"] + 1); p["ok"] += 1
        if days <= 1: p["ease"] = max(1.3, p["ease"] - 0.1)
        if days >= 30: p["ease"] = min(3.0, p["ease"] + 0.1)
        p["due"] = start_of_day(u, days)
    elif kind == "known":
        p["ivl"] = 120; p["reps"] = max(3, p["reps"]); p["ok"] += 1; p["ease"] = 2.8; p["due"] = start_of_day(u, 120)
    elif kind == "add":   # add to review now
        p["due"] = now; p["ivl"] = 0
        await db.save_p(u["id"], p)
        if is_new:
            await log(u, events, new=1)
        return events
    await db.save_p(u["id"], p)
    ok = kind != "again"
    await log(u, events, xp=10 if ok else 2, reviews=1, correct=int(ok), wrong=int(not ok), **({"new": 1} if is_new else {}))
    await check_ach(u, events)
    return events


async def quiz_result(u, wid, ok, events=None):
    events = events if events is not None else []
    p = await db.get_p(u["id"], wid)
    if p:
        if ok:
            p["ok"] += 1
        else:
            p["bad"] += 1
            if p["seen"]:
                p["due"] = min(p["due"], time.time()); p["ivl"] = min(p["ivl"], 1)
        await db.save_p(u["id"], p)
    await log(u, events, xp=5 if ok else 0, correct=int(ok), wrong=int(not ok))
    return events


async def toggle_star(uid, wid):
    p = await db.get_p(uid, wid) or new_p(wid)
    p["star"] = 0 if p["star"] else 1
    await db.save_p(uid, p)
    return bool(p["star"])


# ---------- achievements ----------
ACH = [
    ("first", "🌱", ("First step", "Learn your first word"), ("اولین قدم", "اولین لغت را یاد بگیرید"), lambda s: s["learned"] >= 1),
    ("w25", "📗", ("Word collector", "Learn 25 words"), ("جمع‌کنندهٔ لغت", "۲۵ لغت یاد بگیرید"), lambda s: s["learned"] >= 25),
    ("w100", "📚", ("Bookworm", "Learn 100 words"), ("کرم کتاب", "۱۰۰ لغت یاد بگیرید"), lambda s: s["learned"] >= 100),
    ("w300", "🧠", ("Word wizard", "Learn 300 words"), ("جادوگر لغت", "۳۰۰ لغت یاد بگیرید"), lambda s: s["learned"] >= 300),
    ("m10", "💎", ("Long-term memory", "Master 10 words"), ("حافظهٔ بلندمدت", "در ۱۰ لغت تسلط کامل پیدا کنید"), lambda s: s["mastered"] >= 10),
    ("s3", "🔥", ("On fire", "3-day streak"), ("داغ داغ", "۳ روز پیاپی"), lambda s: s["best"] >= 3),
    ("s7", "⚡", ("One week strong", "7-day streak"), ("یک هفتهٔ کامل", "۷ روز پیاپی"), lambda s: s["best"] >= 7),
    ("s30", "👑", ("Unstoppable", "30-day streak"), ("توقف‌ناپذیر", "۳۰ روز پیاپی"), lambda s: s["best"] >= 30),
    ("q1", "📝", ("Quiz taker", "Finish your first quiz"), ("آزمون‌دهنده", "اولین آزمون را تمام کنید"), lambda s: s["quizzes"] >= 1),
    ("q100", "🏆", ("Perfectionist", "Score 100% in a quiz"), ("کمال‌گرا", "در یک آزمون ۱۰۰٪ بگیرید"), lambda s: s["perfect"]),
    ("xp1k", "⭐", ("Rising star", "Earn 1,000 XP"), ("ستارهٔ در حال طلوع", "۱۰۰۰ امتیاز کسب کنید"), lambda s: s["xp"] >= 1000),
    ("goal", "🎯", ("Goal getter", "Reach your daily goal"), ("هدف‌گیر", "به هدف روزانه برسید"), lambda s: s["goal_hit"]),
    ("custom", "✍️", ("Curator", "Add 5 of your own words"), ("گردآورنده", "۵ لغت شخصی اضافه کنید"), lambda s: s["custom"] >= 5),
    ("game", "🎮", ("Player", "Finish a match game"), ("بازیکن", "یک بازی جفت‌یابی را تمام کنید"), lambda s: s["match"]),
]


async def counts(uid):
    async with db.conn().execute("SELECT SUM(seen) l, SUM(CASE WHEN seen=1 AND ivl>=21 THEN 1 ELSE 0 END) m FROM progress WHERE uid=?", (uid,)) as cur:
        r = await cur.fetchone()
    return (r["l"] or 0), (r["m"] or 0)


async def check_ach(u, events):
    learned, mastered = await counts(u["id"])
    async with db.conn().execute("SELECT MAX(reviews) mx FROM days WHERE uid=?", (u["id"],)) as cur:
        mx = (await cur.fetchone())["mx"] or 0
    ncustom = len(await db.list_custom(u["id"]))
    s = dict(learned=learned, mastered=mastered, best=u.get("best", 0), quizzes=len(u.get("quizzes", [])),
             perfect=any(q[1] == q[2] and q[2] >= 5 for q in u.get("quizzes", [])), xp=u["xp"], goal_hit=mx >= u["goal"],
             custom=ncustom, match=u.get("match_best") is not None)
    for aid, *_rest, ok in ACH:
        if aid not in u["ach"] and ok(s):
            u["ach"][aid] = time.time(); events.append(f"ach:{aid}")


def ach_info(aid, lang):
    for a in ACH:
        if a[0] == aid:
            return a[1], (a[3] if lang == "fa" else a[2])
    return "🏅", (aid, "")


# ---------- helpers ----------
def shuffle(a):
    a = list(a); random.shuffle(a); return a


def word_of_day(u):
    pool = [w for w in WORDS if w.cat == (u.get("track") or "general")] or WORDS
    d = now_local(u).date().toordinal()
    return pool[(d * 7919) % len(pool)]
