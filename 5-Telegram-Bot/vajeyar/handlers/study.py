"""Learning: categories → levels → decks, flashcard sessions, review, word details, dictionary and lists."""
import asyncio
import time

from aiogram import Router, F, Bot
from aiogram.filters import Command
from aiogram.types import Message, CallbackQuery

from .. import db, logic, online
from ..ui import show, B, L, n, bar, esc, ivl_label, pct, EFFECT_PARTY, events_text
from ..words import WORDS, CATS, cat_name, level_name, level_tag, pos_name, deck
from .common import ack, drop, speak, SESS, LIST, WAIT
from .core import card_photo

router = Router(name="study")
STAT_ICON = {"new": "⚪", "learning": "🟡", "review": "🟣", "mastered": "🟢"}
PAGE = 10


def fa(u):
    return u["lang"] == "fa"


# ================================================================= learn: categories / levels / deck
async def learn_screen(bot, u, msg=None, new=False):
    P = await db.all_p(u["id"])
    lines = [L(u, "learn_title"), ""]
    rows = []
    for cat in ("general", "ielts", "toefl"):
        ws = deck(cat)
        learned = sum(1 for w in ws if P.get(w.id, {}).get("seen"))
        star = " ⭐" if u["track"] == cat else ""
        lines.append(f"{CATS[cat]['icon']} <b>{cat_name(cat, u['lang'])}</b>{star}\n<code>{bar(learned / len(ws), 12)}</code>  {n(u, learned)}/{n(u, len(ws))}")
        rows.append([B(f"{CATS[cat]['icon']} {cat_name(cat, u['lang'])}", f"lc:{cat}", "primary" if u["track"] == cat else None)])
    custom = await db.list_custom(u["id"])
    if custom:
        rows.append([B(f"✍️ {cat_name('custom', u['lang'])} · {n(u, len(custom))}", "ls:custom:1")])
    rows.append([B(L(u, "b_starred"), "dl:star"), B(L(u, "b_difficult"), "dl:hard")])
    rows.append([B(L(u, "b_home"), "h")])
    await show(bot, u, "\n\n".join(lines[:2]) + "\n\n".join(lines[2:]), rows, msg=msg, new=new)


@router.callback_query(F.data == "l")
async def cb_learn(cb: CallbackQuery, bot: Bot, u: dict):
    await learn_screen(bot, u, msg=cb.message)


@router.message(Command("learn"))
async def cmd_learn(msg: Message, bot: Bot, u: dict):
    await drop(msg)
    await learn_screen(bot, u, new=True)


def deck_stats(ws, P):
    now = time.time()
    seen = [P[w.id] for w in ws if P.get(w.id, {}).get("seen")]
    return dict(total=len(ws), learned=len(seen), mastered=sum(1 for p in seen if p["ivl"] >= 21),
                due=sum(1 for p in seen if p["due"] <= now))


@router.callback_query(F.data.startswith("lc:"))
async def cb_levels(cb: CallbackQuery, bot: Bot, u: dict):
    cat = cb.data[3:]
    P = await db.all_p(u["id"])
    lines = [f"{CATS[cat]['icon']} <b>{cat_name(cat, u['lang'])}</b> · {L(u, 'levels_title')}", ""]
    rows = []
    dots = ["🟢", "🟡", "🟠", "🔴"]
    nlev = len(CATS[cat]["levels"])
    for lv in range(1, nlev + 1):
        s = deck_stats(deck(cat, lv), P)
        d = dots[min(3, round((lv - 1) * 3 / max(1, nlev - 1)))]
        lines.append(f"{d} <b>{level_name(cat, lv, u['lang'])}</b> · <i>{level_tag(cat, lv)}</i>\n"
                     f"<code>{bar(s['learned'] / max(1, s['total']), 12)}</code>  {n(u, s['learned'])}/{n(u, s['total'])}")
        rows.append([B(f"{d} {level_name(cat, lv, u['lang'])} · {level_tag(cat, lv)}", f"ld:{cat}:{lv}")])
    rows.append([B(L(u, "b_back"), "l"), B(L(u, "b_home"), "h")])
    await show(bot, u, "\n\n".join(lines[:1]) + "\n\n" + "\n\n".join(lines[2:]), rows, msg=cb.message)


@router.callback_query(F.data.startswith("ld:"))
async def cb_deck(cb: CallbackQuery, bot: Bot, u: dict):
    _, cat, lv = cb.data.split(":"); lv = int(lv)
    P = await db.all_p(u["id"])
    s = deck_stats(deck(cat, lv), P)
    text = (f"{CATS[cat]['icon']} <b>{cat_name(cat, u['lang'])}</b> › <b>{level_name(cat, lv, u['lang'])}</b> · <i>{level_tag(cat, lv)}</i>\n\n"
            f"<blockquote>📚 {n(u, s['total'])} {L(u, 'deck_words')}\n"
            f"✅ {n(u, s['learned'])} {L(u, 'deck_learned')}  ·  💎 {n(u, s['mastered'])} {L(u, 'deck_mastered')}\n"
            f"🔁 {n(u, s['due'])} {L(u, 'deck_due')}\n"
            f"<code>{bar(s['learned'] / max(1, s['total']), 14)}</code> {pct(u, round(100 * s['learned'] / max(1, s['total'])))}</blockquote>")
    rows = [[B(f"{L(u, 'b_start')} · {n(u, u['session'])}", f"ls:{cat}:{lv}", "success")]]
    if s["due"]:
        rows.append([B(f"{L(u, 'b_review')} · {n(u, s['due'])}", f"lr:{cat}:{lv}", "primary")])
    rows.append([B(L(u, "b_browse"), f"dl:c:{cat}:{lv}")])
    rows.append([B(L(u, "b_back"), f"lc:{cat}"), B(L(u, "b_home"), "h")])
    await show(bot, u, text, rows, msg=cb.message)


# ================================================================= flashcard session
async def start_session(bot, u, keys, mode, origin, msg=None, new=False, empty_text=None):
    if not keys:
        rows = [[B(L(u, "b_quiz"), "q"), B(L(u, "b_learn"), "l")], [B(L(u, "b_home"), "h")]]
        return await show(bot, u, empty_text or L(u, "empty_list"), rows, msg=msg, new=new)
    SESS[u["id"]] = dict(q=list(keys), i=0, back=False, ok=0, bad=0, xp0=u["xp"], mode=mode, origin=origin, re={}, ev=[], front="en", t=time.time())
    await show_card(bot, u, msg=msg, new=new)


@router.callback_query(F.data.startswith("ls:"))
async def cb_learn_start(cb: CallbackQuery, bot: Bot, u: dict):
    _, cat, lv = cb.data.split(":"); lv = int(lv)
    P = await db.all_p(u["id"])
    if cat == "custom":
        ws = [w for w in await logic.user_words(u["id"]) if w.cat == "custom"]
        due = [w for w in ws if logic.is_due(P.get(w.id))]
        fresh = [w for w in ws if not P.get(w.id, {}).get("seen")]
        keys = [w.key for w in (due + fresh)][:max(u["session"], 20)]
        return await start_session(bot, u, keys, "learn", cb.data, msg=cb.message,
                                   empty_text=L(u, "deck_done") if ws else L(u, "empty_list"))
    fresh = [w.key for w in deck(cat, lv) if not P.get(w.id, {}).get("seen")][:u["session"]]
    await start_session(bot, u, fresh, "learn", cb.data, msg=cb.message, empty_text=L(u, "deck_done"))


@router.callback_query(F.data.startswith("lr:"))
async def cb_deck_review(cb: CallbackQuery, bot: Bot, u: dict):
    _, cat, lv = cb.data.split(":")
    P = await db.all_p(u["id"])
    keys = [w.key for w in deck(cat, int(lv)) if logic.is_due(P.get(w.id))][:50]
    await start_session(bot, u, keys, "review", cb.data, msg=cb.message, empty_text=L(u, "no_due"))


async def review(bot, u, msg=None, new=False):
    ids = (await logic.due_ids(u["id"]))[:max(50, u["goal"])]
    keys = []
    for wid in ids:
        w = await logic.word_by_id(wid)
        if w:
            keys.append(w.key)
    await start_session(bot, u, keys, "review", "r", msg=msg, new=new, empty_text=L(u, "no_due"))


@router.callback_query(F.data == "r")
async def cb_review(cb: CallbackQuery, bot: Bot, u: dict):
    await review(bot, u, msg=cb.message)


@router.message(Command("review"))
async def cmd_review(msg: Message, bot: Bot, u: dict):
    await drop(msg)
    await review(bot, u, new=True)


@router.callback_query(F.data == "ss")
async def cb_study_list(cb: CallbackQuery, bot: Bot, u: dict):
    lst = LIST.get(u["id"])
    if not lst:
        return await ack(cb, L(u, "session_expired"), alert=True)
    await start_session(bot, u, lst["keys"][:30], "list", "ss", msg=cb.message)


def prefetch(u, s, w):
    """Look the word up in the background while the user is still thinking (keeps flipping instant)."""
    if u.get("online") and " " not in w.word.strip():
        s["pf"] = asyncio.create_task(online.lookup(w.word))


async def get_phonetic(u, s, w):
    if not u.get("online") or " " in w.word.strip():
        return ""
    task = s.get("pf")
    if task and not task.done():
        try:
            await asyncio.wait_for(asyncio.shield(task), 1.5)
        except Exception:
            pass
    d = await db.dict_get(w.word.lower())
    return d.get("phonetic", "") if d and not d.get("none") else ""


def card_head(u, s, w):
    i, tot = s["i"], len(s["q"])
    mode_icon = {"learn": "✨", "review": "🔁", "list": "📖"}[s["mode"]]
    return f"{mode_icon} <b>{n(u, i + 1)}</b>/{n(u, tot)}  <code>{bar(i / tot, 10)}</code>  {CATS[w.cat]['icon']} <i>{esc(level_tag(w.cat, w.level) if w.cat != 'custom' else cat_name('custom', u['lang']))}</i>"


async def show_card(bot, u, msg=None, new=False):
    s = SESS.get(u["id"])
    if not s:
        return
    if s["i"] >= len(s["q"]):
        return await session_done(bot, u, msg=msg)
    key = s["q"][s["i"]]
    w = await logic.word_by_key(key)
    if not w:
        s["q"].pop(s["i"]); return await show_card(bot, u, msg, new)
    p = await db.get_p(u["id"], w.id) or logic.new_p(w.id)
    i = s["i"]
    star = L(u, "b_star_on") if p["star"] else L(u, "b_star")
    pos = esc(pos_name(w.pos, u["lang"]))
    images = u.get("images", True)
    if not s["back"]:
        front = u.get("front", "en")
        if front == "mix":
            front = "fa" if hash((key, i)) % 2 else "en"
        s["front"] = front
        if front == "en":
            big = "" if images else f"\n\n<b>{esc(w.word.upper() if len(w.word) < 14 else w.word)}</b>\n<i>{pos}</i>"
            text = f"{card_head(u, s, w)}{big}\n\n{L(u, 'card_hint')}"
            rows = [[B(L(u, "b_show"), f"fl:{i}", "primary")],
                    [B(L(u, "b_speak"), f"sp:w:{key}"), B(star, f"st:{key}:c"), B(L(u, "b_know"), f"rt:k:{i}")],
                    [B(L(u, "b_exit"), "fx")]]
        else:
            text = f"{card_head(u, s, w)}\n\n🇮🇷 <b>{esc(w.fa)}</b>\n<i>{pos}</i>\n\n{L(u, 'card_hint_fa')}"
            rows = [[B(L(u, "b_show"), f"fl:{i}", "primary")],
                    [B(star, f"st:{key}:c"), B(L(u, "b_know"), f"rt:k:{i}")],
                    [B(L(u, "b_exit"), "fx")]]
        photo = card_photo(w, mystery=(front == "fa")) if images else None
        prefetch(u, s, w)
        await show(bot, u, text, rows, photo=photo, msg=msg, new=new)
        if u.get("autoplay") and front == "en":
            await speak(bot, u, w.word)
        return
    # ----- back side
    ph = await get_phonetic(u, s, w)
    t = [card_head(u, s, w), "",
         f"<b>{esc(w.word)}</b>{('  <code>' + esc(ph) + '</code>') if ph else ''}  ·  <i>{pos}</i>",
         f"🇮🇷 <b>{esc(w.fa)}</b>"]
    if w.df:
        t.append(f"📘 {esc(w.df)}")
    if w.ex:
        t.append(f"<blockquote>💬 <i>{esc(w.ex)}</i></blockquote>")
    if p.get("note"):
        t.append(f"📝 {esc(p['note'])}")
    gi = logic.good_interval(p)
    t.append(f"\n{L(u, 'repeat_in')}")
    rows = [[B(L(u, "b_again"), f"rt:a:{i}", "danger"), B(f"{L(u, 'b_good')} · {ivl_label(u, gi)}", f"rt:g:{i}", "success")],
            [B(L(u, "d1"), f"rt:d1:{i}"), B(L(u, "d2"), f"rt:d2:{i}"), B(L(u, "d3"), f"rt:d3:{i}"), B(L(u, "w1"), f"rt:d7:{i}"), B(L(u, "m1"), f"rt:d30:{i}")],
            [B("🔊", f"sp:w:{key}"), B("🔊 " + L(u, "w_ex"), f"sp:x:{key}") if w.ex else None, B(star, f"st:{key}:c"), B(L(u, "b_note"), f"nt:{key}:c")],
            [B(L(u, "b_exit"), "fx")]]
    photo = None
    if images:
        photo = card_photo(w) if s.get("front") == "fa" else "keep"
    await show(bot, u, "\n".join(t), rows, photo=photo, msg=msg)
    if u.get("autoplay") and s.get("front") == "fa":
        await speak(bot, u, w.word)


@router.callback_query(F.data.startswith("fl:"))
async def cb_flip(cb: CallbackQuery, bot: Bot, u: dict):
    s = SESS.get(u["id"])
    if not s or int(cb.data[3:]) != s["i"]:
        return await ack(cb, L(u, "session_expired") if not s else None)
    s["back"] = True
    await show_card(bot, u, msg=cb.message)


@router.callback_query(F.data.startswith("rt:"))
async def cb_rate(cb: CallbackQuery, bot: Bot, u: dict):
    s = SESS.get(u["id"])
    _, kind, idx = cb.data.split(":")
    if not s or int(idx) != s["i"]:
        return await ack(cb, L(u, "session_expired") if not s else None)
    key = s["q"][s["i"]]
    w = await logic.word_by_key(key)
    if kind == "a":
        await logic.rate(u, w.id, "again", events=s["ev"]); s["bad"] += 1
        s["re"][key] = s["re"].get(key, 0) + 1
        if s["re"][key] <= 2:
            s["q"].append(key)
        await ack(cb, L(u, "toast_again"))
    elif kind == "k":
        await logic.rate(u, w.id, "known", events=s["ev"]); s["ok"] += 1
        await ack(cb, L(u, "toast_known"))
    else:
        if kind == "g":
            p = await db.get_p(u["id"], w.id)
            d = logic.good_interval(p)
            await logic.rate(u, w.id, "good", events=s["ev"])
        else:
            d = int(kind[1:])
            await logic.rate(u, w.id, "days", days=d, events=s["ev"])
        s["ok"] += 1
        await ack(cb, L(u, "toast_good", d=ivl_label(u, d)))
    s["i"] += 1; s["back"] = False
    await show_card(bot, u, msg=cb.message)


async def session_done(bot, u, msg=None):
    s = SESS.pop(u["id"], None) or {}
    xp = u["xp"] - s.get("xp0", u["xp"])
    total = s.get("ok", 0) + s.get("bad", 0)
    days = await db.get_days(u["id"])
    today = days.get(logic.day_key(u), {}).get("reviews", 0)
    ev = events_text(u, s.get("ev", []))
    text = (f"{L(u, 'done_title')}\n{L(u, 'done_sub')}\n\n"
            f"<blockquote>🃏 {L(u, 'done_rev')}: <b>{n(u, total)}</b>\n"
            f"✅ {L(u, 'done_good')}: <b>{n(u, s.get('ok', 0))}</b>  ·  🔁 {L(u, 'done_again')}: <b>{n(u, s.get('bad', 0))}</b>\n"
            f"⭐ +<b>{n(u, xp)}</b> {L(u, 'done_xp')}  ·  🔥 <b>{n(u, logic.streak_now(u))}</b> {L(u, 'home_streak')}\n"
            f"🎯 {L(u, 'home_goal')}: <code>{bar(today / max(1, u['goal']), 10)}</code> {n(u, min(today, u['goal']))}/{n(u, u['goal'])}</blockquote>")
    if ev:
        text += "\n\n" + ev
    origin = s.get("origin", "h")
    more = origin if origin.startswith(("ls:", "r", "lr:")) else "l"
    rows = [[B(L(u, "b_more"), more, "success"), B(L(u, "b_quiz_now"), "qs:recent", "primary")], [B(L(u, "b_home"), "h")]]
    await show(bot, u, text, rows, msg=msg, effect=EFFECT_PARTY if total else None)


@router.callback_query(F.data == "fx")
async def cb_exit(cb: CallbackQuery, bot: Bot, u: dict):
    s = SESS.get(u["id"])
    if s and (s["ok"] + s["bad"]):
        s["q"] = s["q"][:s["i"]]
        return await session_done(bot, u, msg=cb.message)
    SESS.pop(u["id"], None)
    from .core import home
    await home(bot, u, msg=cb.message)


# ================================================================= speak / star / note
@router.callback_query(F.data.startswith("sp:"))
async def cb_speak(cb: CallbackQuery, bot: Bot, u: dict):
    _, what, key = cb.data.split(":", 2)
    w = await logic.word_by_key(key)
    if not w:
        return await ack(cb)
    await ack(cb, "🔊")
    if what == "x" and w.ex:
        await speak(bot, u, w.ex)
    elif what in ("u", "k"):
        await speak(bot, u, w.word, accent="en-US" if what == "u" else "en-GB", caption=("🇺🇸 " if what == "u" else "🇬🇧 ") + w.word)
    else:
        await speak(bot, u, w.word)


@router.callback_query(F.data.startswith("st:"))
async def cb_star(cb: CallbackQuery, bot: Bot, u: dict):
    _, key, ctx = cb.data.split(":")
    w = await logic.word_by_key(key)
    if not w:
        return await ack(cb)
    on = await logic.toggle_star(u["id"], w.id)
    await ack(cb, L(u, "starred" if on else "unstarred"))
    if ctx == "c" and SESS.get(u["id"]):
        await show_card(bot, u, msg=cb.message)
    else:
        await word_screen(bot, u, w, msg=cb.message)


@router.callback_query(F.data.startswith("nt:"))
async def cb_note(cb: CallbackQuery, bot: Bot, u: dict):
    _, key, ctx = cb.data.split(":")
    w = await logic.word_by_key(key)
    if not w:
        return await ack(cb)
    WAIT[u["id"]] = f"note:{key}:{ctx}"
    p = await db.get_p(u["id"], w.id)
    cur = f"\n\n📝 <i>{esc(p['note'])}</i>" if p and p.get("note") else ""
    back = "nb:" + key + ":" + ctx
    await show(bot, u, L(u, "note_prompt", w=esc(w.word)) + cur, [[B(L(u, "b_cancel"), back)]], msg=cb.message)


@router.callback_query(F.data.startswith("nb:"))
async def cb_note_back(cb: CallbackQuery, bot: Bot, u: dict):
    _, key, ctx = cb.data.split(":")
    await back_from_note(bot, u, key, ctx)


async def back_from_note(bot, u, key, ctx):
    if ctx == "c" and SESS.get(u["id"]):
        return await show_card(bot, u)
    w = await logic.word_by_key(key)
    if w:
        await word_screen(bot, u, w)


async def save_note(bot, u, key, ctx, text):
    w = await logic.word_by_key(key)
    if w:
        p = await db.get_p(u["id"], w.id) or logic.new_p(w.id)
        p["note"] = text.strip()[:500]
        await db.save_p(u["id"], p)
    await back_from_note(bot, u, key, ctx)


# ================================================================= word details
def status_line(u, p):
    st = logic.status(p)
    s = f"{STAT_ICON[st]} <b>{L(u, 'st_' + st)}</b>"
    if p and p["seen"]:
        days = (p["due"] - time.time()) / 86400
        when = L(u, "today") if days <= 0 else (L(u, "tomorrow") if days <= 1 else ivl_label(u, round(days)))
        s += f"  ·  📦 {L(u, 'w_box')} {n(u, logic.box(p))}/{n(u, 6)}  ·  ⏱ {L(u, 'w_next')}: {when}"
    return s


async def word_screen(bot, u, w, msg=None, new=False):
    p = await db.get_p(u["id"], w.id)
    data = None
    if u.get("online") and " " not in w.word.strip():
        try:
            data = await asyncio.wait_for(online.lookup(w.word), 3)
        except Exception:
            data = None
        if data and data.get("none"):
            data = None
    ph = (data or {}).get("phonetic", "")
    cat = f"{CATS[w.cat]['icon']} {cat_name(w.cat, u['lang'])}" + ("" if w.cat == "custom" else f" · {level_name(w.cat, w.level, u['lang'])} ({level_tag(w.cat, w.level)})")
    t = [f"<b>{esc(w.word)}</b>{('  <code>' + esc(ph) + '</code>') if ph else ''}",
         f"<i>{esc(pos_name(w.pos, u['lang']))}  ·  {esc(cat)}</i>", "",
         f"🇮🇷 <b>{esc(w.fa)}</b>"]
    if w.df:
        t.append(f"📘 {esc(w.df)}")
    if w.ex:
        t.append(f"<blockquote>💬 <i>{esc(w.ex)}</i></blockquote>")
    if data:
        extra = []
        for d in data.get("defs", [])[:4]:
            if d["def"].strip().lower() != (w.df or "").strip().lower():
                extra.append(f"• <i>{esc(d['pos'])}</i> — {esc(d['def'])}" + (f"\n   “{esc(d['ex'])}”" if d.get("ex") else ""))
        if data.get("syn"):
            extra.append(f"🔗 <b>{L(u, 'w_syn')}:</b> {esc(', '.join(data['syn'][:8]))}")
        if data.get("ant"):
            extra.append(f"⛔ <b>{L(u, 'w_ant')}:</b> {esc(', '.join(data['ant'][:6]))}")
        if extra:
            t.append(f"<blockquote expandable>📚 <b>{L(u, 'w_more')}</b>\n" + "\n".join(extra) + "</blockquote>")
    if p and p.get("note"):
        t.append(f"📝 <b>{L(u, 'w_note')}:</b> {esc(p['note'])}")
    t.append("")
    t.append(status_line(u, p))
    k = w.key
    star = L(u, "b_star_on") if p and p["star"] else L(u, "b_star")
    rows = [[B(L(u, "b_us"), f"sp:u:{k}"), B(L(u, "b_uk"), f"sp:k:{k}"), B("🔊 " + L(u, "w_ex"), f"sp:x:{k}") if w.ex else None],
            [B(star, f"st:{k}:w"), B(L(u, "b_note"), f"nt:{k}:w"),
             B(L(u, "b_addrev"), f"wr:{k}:add", "success") if not (p and p["seen"] and logic.is_due(p)) else None,
             B(L(u, "b_known"), f"wr:{k}:known")],
            [B(L(u, "b_reset"), f"wr:{k}:reset") if p and p["seen"] else None,
             B(L(u, "b_delete"), f"wr:{k}:del", "danger") if w.cat == "custom" else None,
             B("📋 " + ("کپی" if fa(u) else "Copy"), copy=f"{w.word} — {w.fa}")],
            [B(L(u, "b_back"), f"dp:{LIST[u['id']]['page']}" if LIST.get(u["id"]) else "d"),
             B(L(u, "b_home"), "h")]]
    await show(bot, u, "\n".join(t), rows, msg=msg, new=new)


@router.callback_query(F.data.startswith("dw:"))
async def cb_word(cb: CallbackQuery, bot: Bot, u: dict):
    w = await logic.word_by_key(cb.data[3:])
    if not w:
        return await ack(cb, "—")
    await word_screen(bot, u, w, msg=cb.message)


@router.callback_query(F.data.startswith("wr:"))
async def cb_word_action(cb: CallbackQuery, bot: Bot, u: dict):
    _, key, act = cb.data.split(":")
    w = await logic.word_by_key(key)
    if not w:
        return await ack(cb)
    if act == "add":
        await logic.rate(u, w.id, "add"); await ack(cb, L(u, "added_review"))
    elif act == "known":
        ev = await logic.rate(u, w.id, "known"); await ack(cb, L(u, "toast_known"))
    elif act == "reset":
        p = await db.get_p(u["id"], w.id) or logic.new_p(w.id)
        np_ = logic.new_p(w.id); np_["star"] = p.get("star", 0); np_["note"] = p.get("note", "")
        await db.save_p(u["id"], np_); await ack(cb, L(u, "reset_done"))
    elif act == "del":
        await db.del_custom(u["id"], int(key[1:])); await ack(cb, L(u, "deleted"))
        from .mywords import mywords_screen
        return await mywords_screen(bot, u, msg=cb.message)
    await word_screen(bot, u, w, msg=cb.message)


# ================================================================= dictionary & lists
async def dict_screen(bot, u, msg=None, new=False):
    P = await db.all_p(u["id"])
    total = len(WORDS) + len(await db.list_custom(u["id"]))
    learned = sum(1 for p in P.values() if p["seen"])
    text = L(u, "dict_title") + f"\n\n<blockquote>📚 {n(u, total)} {L(u, 'words')}  ·  ✅ {n(u, learned)} {L(u, 'home_learned')}</blockquote>"
    rows = [[B("🔎 " + ("جستجوی زنده" if fa(u) else "Live search"), switch="", style="primary")],
            [B(f"{CATS[c]['icon']} {cat_name(c, u['lang'])}", f"dl:c:{c}") for c in ("general", "ielts", "toefl")],
            [B(L(u, "b_starred"), "dl:star"), B(L(u, "b_difficult"), "dl:hard"), B("✍️ " + cat_name("custom", u["lang"]), "dl:c:custom")],
            [B(f"🟡 {L(u, 'st_learning')}", "dl:s:learning"), B(f"🟣 {L(u, 'st_review')}", "dl:s:review"), B(f"🟢 {L(u, 'st_mastered')}", "dl:s:mastered")],
            [B(L(u, "b_home"), "h")]]
    await show(bot, u, text, rows, msg=msg, new=new)


@router.callback_query(F.data == "d")
async def cb_dict(cb: CallbackQuery, bot: Bot, u: dict):
    LIST.pop(u["id"], None)
    await dict_screen(bot, u, msg=cb.message)


@router.message(Command("dict", "dictionary"))
async def cmd_dict(msg: Message, bot: Bot, u: dict):
    await drop(msg)
    if msg.text and len(msg.text.split(maxsplit=1)) > 1:
        return await search(bot, u, msg.text.split(maxsplit=1)[1])
    await dict_screen(bot, u, new=True)


async def build_list(u, spec):
    P = await db.all_p(u["id"])
    allw = await logic.user_words(u["id"])
    parts = spec.split(":")
    if parts[0] == "c":
        cat = parts[1]; lv = int(parts[2]) if len(parts) > 2 else None
        ws = [w for w in allw if w.cat == cat and (not lv or w.level == lv)]
        title = f"{CATS[cat]['icon']} <b>{cat_name(cat, u['lang'])}</b>" + (f" › {level_name(cat, lv, u['lang'])}" if lv else "")
        back = f"ld:{cat}:{lv}" if lv else ("w" if cat == "custom" else "d")
    elif parts[0] == "star":
        ws = [w for w in allw if P.get(w.id, {}).get("star")]; title = f"<b>{L(u, 'b_starred')}</b>"; back = "d"
    elif parts[0] == "hard":
        ws = [w for w in allw if (P.get(w.id) or {}).get("bad", 0) and (P[w.id]["lapses"] >= 2 or P[w.id]["bad"] >= P[w.id]["ok"])]
        title = f"<b>{L(u, 'b_difficult')}</b>"; back = "d"
    elif parts[0] == "s":
        ws = [w for w in allw if logic.status(P.get(w.id)) == parts[1]]
        title = f"{STAT_ICON[parts[1]]} <b>{L(u, 'st_' + parts[1])}</b>"; back = "d"
    else:
        ws, title, back = [], "", "d"
    return title, ws, P, back


def list_rows(u, lst, P_icons):
    page, keys = lst["page"], lst["keys"]
    pages = max(1, (len(keys) + PAGE - 1) // PAGE)
    chunk = keys[page * PAGE:(page + 1) * PAGE]
    rows, row = [], []
    for k in chunk:
        row.append(B(f"{P_icons.get(k, '⚪')} {lst['names'][k]}", f"dw:{k}"))
        if len(row) == 2:
            rows.append(row); row = []
    if row:
        rows.append(row)
    if pages > 1:
        rows.append([B("‹" if page else "·", f"dp:{page - 1}" if page else "noop"), B(f"{n(u, page + 1)}/{n(u, pages)}", "noop"),
                     B("›" if page < pages - 1 else "·", f"dp:{page + 1}" if page < pages - 1 else "noop")])
    if keys:
        rows.append([B(f"✨ {('مطالعهٔ این فهرست' if fa(u) else 'Study this list')} · {n(u, min(30, len(keys)))}", "ss", "success")])
    rows.append([B(L(u, "b_back"), lst["back"]), B(L(u, "b_home"), "h")])
    return rows


async def render_list(bot, u, msg=None, new=False):
    lst = LIST[u["id"]]
    P = await db.all_p(u["id"])
    icons = {}
    for k, wid in lst["ids"].items():
        icons[k] = STAT_ICON[logic.status(P.get(wid))]
    page, keys = lst["page"], lst["keys"]
    chunk = keys[page * PAGE:(page + 1) * PAGE]
    lines = [lst["title"] + f"  ·  {n(u, len(keys))} {L(u, 'words')}", ""]
    if not keys:
        lines.append(L(u, "empty_list"))
    for j, k in enumerate(chunk, start=page * PAGE + 1):
        lines.append(f"{icons[k]} <b>{esc(lst['names'][k])}</b> — {esc(lst['fa'][k])}")
    lines.append("")
    lines.append("<i>⚪ " + L(u, "st_new") + "  🟡 " + L(u, "st_learning") + "  🟣 " + L(u, "st_review") + "  🟢 " + L(u, "st_mastered") + "</i>")
    lst["from_list"] = True
    await show(bot, u, "\n".join(lines), list_rows(u, lst, icons), msg=msg, new=new)


def set_list(u, title, ws, back, self_cb):
    LIST[u["id"]] = dict(title=title, keys=[w.key for w in ws], names={w.key: w.word for w in ws}, fa={w.key: w.fa for w in ws},
                         ids={w.key: w.id for w in ws}, page=0, back=back, self=self_cb, from_list=False)


@router.callback_query(F.data.startswith("dl:"))
async def cb_list(cb: CallbackQuery, bot: Bot, u: dict):
    title, ws, P, back = await build_list(u, cb.data[3:])
    set_list(u, title, ws, back, cb.data)
    await render_list(bot, u, msg=cb.message)


@router.callback_query(F.data.startswith("dp:"))
async def cb_list_page(cb: CallbackQuery, bot: Bot, u: dict):
    lst = LIST.get(u["id"])
    if not lst:
        return await dict_screen(bot, u, msg=cb.message)
    lst["page"] = max(0, int(cb.data[3:]))
    await render_list(bot, u, msg=cb.message)


# ---------- search (free text) ----------
async def search(bot, u, q):
    q = q.strip()[:60]
    ql = q.lower()
    allw = await logic.user_words(u["id"])
    exact = [w for w in allw if w.word.lower() == ql]
    starts = [w for w in allw if w.word.lower().startswith(ql) and w not in exact]
    contains = [w for w in allw if ql in w.word.lower() and w not in exact and w not in starts]
    fam = [w for w in allw if ql in w.fa and w not in exact and w not in starts and w not in contains]
    res = (exact + starts + contains + fam)[:60]
    if len(exact) == 1 and len(res) <= 3:
        LIST.pop(u["id"], None)
        return await word_screen(bot, u, exact[0])
    if res:
        set_list(u, f"🔎 <b>«{esc(q)}»</b>", res, "d", None)
        return await render_list(bot, u)
    # nothing found locally → online
    rows = [[B(L(u, "b_dict"), "d"), B(L(u, "b_home"), "h")]]
    text = L(u, "dict_none", q=esc(q))
    if u.get("online") and q.isascii() and q.replace(" ", "").replace("-", "").isalpha():
        data = await online.lookup(q)
        if data and not data.get("none"):
            tr = await online.translate(q)
            t = [f"🌍 <b>{esc(q)}</b>" + (f"  <code>{esc(data['phonetic'])}</code>" if data.get("phonetic") else "")]
            if tr:
                t.append(f"🇮🇷 <b>{esc(tr)}</b>")
            for d in data["defs"][:4]:
                t.append(f"• <i>{esc(d['pos'])}</i> — {esc(d['def'])}" + (f"\n   “{esc(d['ex'])}”" if d.get("ex") else ""))
            if data.get("syn"):
                t.append(f"🔗 {esc(', '.join(data['syn'][:8]))}")
            text = "\n".join(t)
            rows.insert(0, [B("➕ " + ("افزودن به لغات من" if fa(u) else "Add to my words"), f"oa:{q[:40]}", "success")])
    await show(bot, u, text, rows)


@router.callback_query(F.data.startswith("oa:"))
async def cb_online_add(cb: CallbackQuery, bot: Bot, u: dict):
    from .mywords import add_lines
    await ack(cb, L(u, "translating"))
    await add_lines(bot, u, cb.data[3:])
