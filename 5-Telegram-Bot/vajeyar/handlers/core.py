"""Start & onboarding, home dashboard, help, word of the day and settings."""
import io
import json
import time

from aiogram import Router, F, Bot
from aiogram.filters import Command, CommandStart, CommandObject
from aiogram.types import Message, CallbackQuery, BufferedInputFile

from .. import db, logic
from ..config import WEBAPP_URL
from ..media import card_image
from ..ui import show, B, L, n, bar, esc, Photo, EFFECT_PARTY, pct
from ..words import WORDS, cat_name, level_tag, level_name, pos_name, POS, CATS
from .common import ack, drop, speak, greeting, WAIT, SESS, QUIZ, GAME

router = Router(name="core")
GOALS = [10, 20, 30, 50]
SESSIONS = [5, 10, 15, 20]
TZS = ["Asia/Tehran", "Asia/Dubai", "Europe/Istanbul", "Asia/Kabul", "Europe/London", "Europe/Berlin",
       "America/New_York", "America/Toronto", "America/Los_Angeles", "Australia/Sydney", "Asia/Tokyo", "UTC"]


# ---------------------------------------------------------------- onboarding
@router.message(CommandStart())
async def cmd_start(msg: Message, bot: Bot, u: dict, command: CommandObject):
    await drop(msg)
    WAIT.pop(u["id"], None)
    arg = (command.args or "").strip()
    if not u.get("onboarded"):
        return await onboarding_lang(bot, u, new=True)
    if arg.startswith("w_"):
        from .study import word_screen
        w = await logic.word_by_key(arg[2:])
        if w:
            return await word_screen(bot, u, w, new=True)
    await home(bot, u, new=True)


async def onboarding_lang(bot, u, msg=None, new=False):
    text = "🟣 <b>دانافاکس · DanaFox</b>\n\n" + "به <b>دانافاکس</b> خوش آمدید 👋\nWelcome to <b>DanaFox</b> 👋\n\n<b>زبان برنامه را انتخاب کنید</b>\n<b>Choose your language</b>"
    await show(bot, u, text, [[B("🇮🇷 فارسی", "ob:l:fa", "primary"), B("🇬🇧 English", "ob:l:en", "primary")]], msg=msg, new=new)


@router.callback_query(F.data.startswith("ob:"))
async def cb_onboarding(cb: CallbackQuery, bot: Bot, u: dict):
    _, step, val = cb.data.split(":")
    if step == "l":
        u["lang"] = val
        rows = [[B(L(u, f"tr_{k}"), f"ob:t:{k}")] for k in ("general", "ielts", "toefl")]
        await show(bot, u, f"🟣 <b>{L(u, 'brand')}</b> · 1/2\n\n" + L(u, "onb_track"), rows, msg=cb.message)
    elif step == "t":
        u["track"] = val
        names = {10: "g_casual", 20: "g_regular", 30: "g_serious", 50: "g_intense"}
        rows = [[B(f"{L(u, names[g])} · {n(u, g)} {L(u, 'per_day')}", f"ob:g:{g}")] for g in GOALS]
        await show(bot, u, f"🟣 <b>{L(u, 'brand')}</b> · 2/2\n\n" + L(u, "onb_goal"), rows, msg=cb.message)
    elif step == "g":
        u["goal"] = int(val); u["onboarded"] = True
        await ack(cb, L(u, "onb_done"))
        await home(bot, u, effect=EFFECT_PARTY, banner=L(u, "onb_done"))


# ---------------------------------------------------------------- home
async def home_text(u):
    learned, mastered = await logic.counts(u["id"])
    due = await logic.due_count(u["id"])
    days = await db.get_days(u["id"])
    today = days.get(logic.day_key(u), {})
    done = today.get("reviews", 0)
    goal = u["goal"]
    lv = logic.level_of(u["xp"]); lo, hi = logic.level_range(lv)
    streak = logic.streak_now(u)
    name = esc(u.get("name") or "")
    goal_line = f"🎯 {L(u, 'home_goal')}  {bar(done / goal if goal else 0)}  <b>{n(u, min(done, goal))}/{n(u, goal)}</b>" + (" ✅" if done >= goal else "")
    lines = [
        f"🟣 <b>{L(u, 'brand')}</b>  ·  {greeting(u)}{('، ' if u['lang'] == 'fa' else ', ') + name if name else ''}",
        "",
        "<blockquote>" + goal_line,
        f"🔥 <b>{n(u, streak)}</b> {L(u, 'home_streak')}{'  🧊×' + n(u, u['freezes']) if u.get('freezes') else ''}",
        f"⭐ {L(u, 'home_level')} <b>{n(u, lv)}</b>  {bar((u['xp'] - lo) / max(1, hi - lo), 6)}  {n(u, u['xp'])} {L(u, 'home_xp')}",
        f"📚 <b>{n(u, learned)}</b> {L(u, 'home_learned')}  ·  💎 <b>{n(u, mastered)}</b> {L(u, 'home_mastered')}</blockquote>",
        "",
        (f"🔁 {L(u, 'home_due')}: <b>{n(u, due)}</b> {L(u, 'words')}" if due else L(u, "home_nodue")),
    ]
    return "\n".join(lines), due


def home_rows(u, due):
    rows = []
    if due:
        rows.append([B(f"{L(u, 'b_review')} · {n(u, due)}", "r", "success")])
    else:
        rows.append([B(L(u, "b_learn"), "l", "success")])
    rows += [
        [B(L(u, "b_learn"), "l") if due else B(L(u, "b_quiz"), "q"), B(L(u, "b_quiz"), "q") if due else B(L(u, "b_games"), "g")],
        [B(L(u, "b_games"), "g") if due else B(L(u, "b_dict"), "d"), B(L(u, "b_dict"), "d") if due else B(L(u, "b_wotd"), "wd")],
        [B(L(u, "b_wotd"), "wd") if due else B(L(u, "b_mywords"), "w"), B(L(u, "b_mywords"), "w") if due else B(L(u, "b_stats"), "st")],
    ]
    if due:
        rows.append([B(L(u, "b_stats"), "st"), B(L(u, "b_settings"), "s")])
    else:
        rows.append([B(L(u, "b_settings"), "s"), B(L(u, "b_help"), "hp")])
    if WEBAPP_URL:
        rows.append([B(L(u, "b_app"), app=WEBAPP_URL, style="primary")])
    return rows


async def home(bot, u, msg=None, new=False, effect=None, banner=None):
    SESS.pop(u["id"], None); QUIZ.pop(u["id"], None); GAME.pop(u["id"], None); WAIT.pop(u["id"], None)
    text, due = await home_text(u)
    if banner:
        text = banner + "\n\n" + text
    await show(bot, u, text, home_rows(u, due), msg=msg, new=new, effect=effect)


@router.callback_query(F.data == "h")
async def cb_home(cb: CallbackQuery, bot: Bot, u: dict):
    await home(bot, u, msg=cb.message)


@router.message(Command("menu", "home"))
async def cmd_menu(msg: Message, bot: Bot, u: dict):
    await drop(msg)
    if not u.get("onboarded"):
        return await onboarding_lang(bot, u, new=True)
    await home(bot, u, new=True)


@router.callback_query(F.data == "noop")
async def cb_noop(cb: CallbackQuery):
    await ack(cb)


# ---------------------------------------------------------------- help
async def help_screen(bot, u, msg=None, new=False):
    me = await bot.me()
    await show(bot, u, L(u, "help", bot=me.username or "VajeYarBot"),
               [[B("🔎 " + ("جستجوی سریع" if u["lang"] == "fa" else "Quick search"), switch="")], [B(L(u, "b_home"), "h")]], msg=msg, new=new)


@router.callback_query(F.data == "hp")
async def cb_help(cb: CallbackQuery, bot: Bot, u: dict):
    await help_screen(bot, u, msg=cb.message)


@router.message(Command("help"))
async def cmd_help(msg: Message, bot: Bot, u: dict):
    await drop(msg)
    await help_screen(bot, u, new=True)


# ---------------------------------------------------------------- word of the day
def wotd_text(u, w):
    pos = pos_name(w.pos, u["lang"])
    t = [L(u, "wotd_title") + f"  ·  {logic.now_local(u).strftime('%Y-%m-%d') if u['lang'] != 'fa' else ''}".rstrip(" ·"),
         "", f"<b>{esc(w.word)}</b>  <i>{esc(pos)} · {esc(level_tag(w.cat, w.level))}</i>",
         f"🇮🇷 <b>{esc(w.fa)}</b>"]
    if w.df:
        t.append(f"📘 {esc(w.df)}")
    if w.ex:
        t.append(f"<blockquote>💬 <i>{esc(w.ex)}</i></blockquote>")
    return "\n".join(t)


def card_photo(w, mystery=False):
    pos_en = POS.get(w.pos, (w.pos,))[0]
    tag = level_tag(w.cat, w.level)
    lab = CATS[w.cat]["en"] + ("" if w.cat == "custom" else " · " + CATS[w.cat]["levels"][w.level - 1]["en"])
    if mystery:
        return Photo(f"mys:{w.pos}:{w.cat}:{w.level}", lambda: card_image("", pos_en, tag, lab, mystery=True))
    return Photo(f"card:{w.id}", lambda: card_image(w.word, pos_en, tag, lab))


async def wotd_screen(bot, u, msg=None, new=False):
    w = logic.word_of_day(u)
    p = await db.get_p(u["id"], w.id)
    rows = [[B(L(u, "b_speak"), f"sp:w:{w.key}"), B(L(u, "b_speak_ex"), f"sp:x:{w.key}")] if w.ex else [B(L(u, "b_speak"), f"sp:w:{w.key}")],
            [B(L(u, "b_addstudy"), f"wa:{w.key}", "success")] if not (p and p["seen"]) else [],
            [B("📖 " + ("جزئیات" if u["lang"] == "fa" else "Details"), f"dw:{w.key}"), B("📤 " + ("اشتراک" if u["lang"] == "fa" else "Share"), switch=w.word)],
            [B(L(u, "b_home"), "h")]]
    photo = card_photo(w) if u.get("images", True) else None
    await show(bot, u, wotd_text(u, w), rows, photo=photo, msg=msg, new=new)


@router.callback_query(F.data == "wd")
async def cb_wotd(cb: CallbackQuery, bot: Bot, u: dict):
    await wotd_screen(bot, u, msg=cb.message)


@router.message(Command("wotd", "today"))
async def cmd_wotd(msg: Message, bot: Bot, u: dict):
    await drop(msg)
    await wotd_screen(bot, u, new=True)


@router.callback_query(F.data.startswith("wa:"))
async def cb_wotd_add(cb: CallbackQuery, bot: Bot, u: dict):
    w = await logic.word_by_key(cb.data[3:])
    if w:
        await logic.rate(u, w.id, "add")
        await ack(cb, L(u, "added_review"))
        await wotd_screen(bot, u, msg=cb.message) if cb.message and cb.message.photo else None


# ---------------------------------------------------------------- settings
def lab(u, key):
    """Label without its leading emoji."""
    return L(u, key).split(" ", 1)[-1]


def onoff(u, v):
    return "✅" if v else "▫️"


def settings_rows(u):
    fa = u["lang"] == "fa"
    front = {"en": L(u, "front_en"), "fa": L(u, "front_fa"), "mix": L(u, "front_mix")}[u.get("front", "en")]
    acc = "🇺🇸" if u.get("accent") == "en-US" else "🇬🇧"
    return [
        [B(f"{L(u, 'set_lang')}: {'فارسی' if fa else 'English'}", "sv:lang"), B(f"{L(u, 'set_track')}: {CATS[u['track']]['icon']}", "sv:track")],
        [B(f"{L(u, 'set_goal')}: {n(u, u['goal'])}", "sv:goal"), B(f"✨ {('جلسه' if fa else 'Session')}: {n(u, u['session'])}", "sv:session")],
        [B(f"{L(u, 'set_front')}: {front}", "sv:front"), B(f"{L(u, 'set_accent')}: {acc}", "sv:accent")],
        [B(f"{onoff(u, u['slow'])} {lab(u, 'set_speed')}", "sv:slow"), B(f"{onoff(u, u['autoplay'])} {lab(u, 'set_autoplay')}", "sv:autoplay")],
        [B(f"{onoff(u, u['images'])} {lab(u, 'set_images')}", "sv:images"), B(f"{onoff(u, u['online'])} {lab(u, 'set_online')}", "sv:online")],
        [B(f"{onoff(u, u['reminder'])} {lab(u, 'set_reminder')}", "sv:reminder"), B(f"⏰ {n(u, u['rtime'])}", "tp:rtime")],
        [B(f"{onoff(u, u['wotd'])} {lab(u, 'set_wotd')}", "sv:wotd"), B(f"⏰ {n(u, u['wtime'])}", "tp:wtime")],
        [B(f"{L(u, 'set_tz')}: {u['tz'].split('/')[-1].replace('_', ' ')}", "tz")],
        [B(L(u, "b_backup"), "bk:e"), B(L(u, "b_restore"), "bk:i")],
        [B(L(u, "b_resetall"), "rs", "danger")],
        [B(L(u, "b_home"), "h")],
    ]


async def settings(bot, u, msg=None, new=False, note=None):
    fa = u["lang"] == "fa"
    lines = [L(u, "set_title"), "",
             "<blockquote>" + "\n".join([
                 f"🔔 {lab(u, 'set_reminder')}: <b>{L(u, 'on') if u['reminder'] else L(u, 'off')}</b> · {n(u, u['rtime'])}",
                 f"☀️ {lab(u, 'set_wotd')}: <b>{L(u, 'on') if u['wotd'] else L(u, 'off')}</b> · {n(u, u['wtime'])}",
                 f"🕒 {lab(u, 'set_tz')}: <code>{u['tz']}</code>",
                 f"🧭 {lab(u, 'set_track')}: <b>{cat_name(u['track'], u['lang'])}</b>"]) + "</blockquote>",
             ("💡 روی هر گزینه بزنید تا تغییر کند." if fa else "💡 Tap any option to change it.")]
    if note:
        lines.insert(1, note)
    await show(bot, u, "\n".join(lines), settings_rows(u), msg=msg, new=new)


@router.callback_query(F.data == "s")
async def cb_settings(cb: CallbackQuery, bot: Bot, u: dict):
    await settings(bot, u, msg=cb.message)


@router.message(Command("settings"))
async def cmd_settings(msg: Message, bot: Bot, u: dict):
    await drop(msg)
    await settings(bot, u, new=True)


def _cycle(seq, cur):
    return seq[(seq.index(cur) + 1) % len(seq)] if cur in seq else seq[0]


@router.callback_query(F.data.startswith("sv:"))
async def cb_set_value(cb: CallbackQuery, bot: Bot, u: dict):
    k = cb.data[3:]
    if k == "lang":
        u["lang"] = _cycle(["fa", "en"], u["lang"])
    elif k == "track":
        u["track"] = _cycle(["general", "ielts", "toefl"], u["track"])
    elif k == "goal":
        u["goal"] = _cycle(GOALS, u["goal"])
    elif k == "session":
        u["session"] = _cycle(SESSIONS, u["session"])
    elif k == "front":
        u["front"] = _cycle(["en", "fa", "mix"], u.get("front", "en"))
    elif k == "accent":
        u["accent"] = _cycle(["en-US", "en-GB"], u.get("accent", "en-US"))
        await ack(cb, "🇺🇸 " + L(u, "us") if u["accent"] == "en-US" else "🇬🇧 " + L(u, "uk"))
    elif k in ("slow", "autoplay", "images", "online", "reminder", "wotd"):
        u[k] = not u.get(k)
    await settings(bot, u, msg=cb.message)


@router.callback_query(F.data.startswith("tp:"))
async def cb_time_picker(cb: CallbackQuery, bot: Bot, u: dict):
    parts = cb.data.split(":")
    field = parts[1]
    if len(parts) == 4:          # tp:field:HH:MM
        u[field] = f"{parts[2]}:{parts[3]}"
        if field == "rtime":
            u["reminder"] = True; u["notified"] = None
        else:
            u["wotd"] = True; u["wotd_sent"] = None
        await ack(cb, "✅ " + n(u, u[field]))
        return await settings(bot, u, msg=cb.message)
    half = len(parts) == 3 and parts[2] == "30"
    mm = "30" if half else "00"
    rows, row = [], []
    for h in range(6, 24):
        v = f"{h:02d}:{mm}"
        row.append(B(("● " if u[field] == v else "") + n(u, v), f"tp:{field}:{h:02d}:{mm}", "primary" if u[field] == v else None))
        if len(row) == 4:
            rows.append(row); row = []
    if row:
        rows.append(row)
    rows.append([B(("✓ " if not half else "") + n(u, ":00"), f"tp:{field}"), B(("✓ " if half else "") + n(u, ":30"), f"tp:{field}:30")])
    rows.append([B(L(u, "b_back"), "s")])
    title = L(u, "set_rtime" if field == "rtime" else "set_wtime")
    await show(bot, u, f"<b>{title}</b>\n\n{L(u, 'pick_time')}", rows, msg=cb.message)


@router.callback_query(F.data.startswith("tz"))
async def cb_tz(cb: CallbackQuery, bot: Bot, u: dict):
    if cb.data.startswith("tz:"):
        u["tz"] = TZS[int(cb.data[3:])]; u["notified"] = None; u["wotd_sent"] = None
        return await settings(bot, u, msg=cb.message)
    rows, row = [], []
    for i, z in enumerate(TZS):
        lab = z.split("/")[-1].replace("_", " ")
        row.append(B(("● " if u["tz"] == z else "") + lab, f"tz:{i}", "primary" if u["tz"] == z else None))
        if len(row) == 3:
            rows.append(row); row = []
    if row:
        rows.append(row)
    rows.append([B(L(u, "b_back"), "s")])
    now = logic.now_local(u).strftime("%H:%M")
    await show(bot, u, f"{L(u, 'pick_tz')}\n\n🕒 <code>{u['tz']}</code> · {n(u, now)}", rows, msg=cb.message)


# ---------------------------------------------------------------- backup / restore / reset
@router.callback_query(F.data == "bk:e")
async def cb_backup(cb: CallbackQuery, bot: Bot, u: dict):
    data = {"app": "vajeyar-bot", "version": 1, "exported": time.time(),
            "user": {k: v for k, v in u.items() if k not in ("id", "_new", "screen", "blocked")},
            "progress": list((await db.all_p(u["id"])).values()),
            "days": list((await db.get_days(u["id"])).values()),
            "custom": await db.list_custom(u["id"])}
    raw = json.dumps(data, ensure_ascii=False, indent=1).encode()
    await ack(cb)
    await bot.send_document(u["id"], BufferedInputFile(raw, filename=f"danafox-backup-{logic.day_key(u)}.json"), caption=L(u, "backup_caption"))
    await settings(bot, u, new=True)


@router.callback_query(F.data == "bk:i")
async def cb_restore(cb: CallbackQuery, bot: Bot, u: dict):
    WAIT[u["id"]] = "restore"
    await show(bot, u, L(u, "restore_prompt"), [[B(L(u, "b_cancel"), "s")]], msg=cb.message)


async def restore_file(bot, u, raw: bytes):
    try:
        data = json.loads(raw.decode("utf-8"))
        assert isinstance(data, dict) and "progress" in data
    except Exception:
        return False
    uid = u["id"]
    await db.wipe_user(uid)
    for k, v in (data.get("user") or {}).items():
        if k not in ("id", "_new"):
            u[k] = v
    idmap = {}
    for c in data.get("custom", []):
        new_id = await db.add_custom(uid, c.get("word", ""), c.get("fa", ""), c.get("pos", "n"), c.get("def", ""), c.get("ex", ""))
        idmap[f"u:{c.get('id')}"] = f"u:{new_id}"
    for p in data.get("progress", []):
        p = dict(p); p["wid"] = idmap.get(p.get("wid"), p.get("wid"))
        if p["wid"]:
            await db.save_p(uid, p)
    for d in data.get("days", []):
        day = d.get("day")
        if day:
            await db.inc_day(uid, day, **{k: int(d.get(k) or 0) for k in ("reviews", "new", "correct", "wrong", "xp")})
    return True


@router.callback_query(F.data.startswith("rs"))
async def cb_reset(cb: CallbackQuery, bot: Bot, u: dict):
    if cb.data == "rs:y":
        lang, name = u["lang"], u.get("name")
        await db.wipe_user(u["id"])
        fresh = await db.get_user(u["id"])
        u.clear(); u.update(fresh); u["lang"] = lang; u["name"] = name; u["onboarded"] = True
        await ack(cb, L(u, "reset_all_done"), alert=True)
        return await home(bot, u, msg=cb.message)
    await show(bot, u, L(u, "confirm_reset"), [[B(L(u, "b_yes_reset"), "rs:y", "danger"), B(L(u, "b_cancel"), "s")]], msg=cb.message)
