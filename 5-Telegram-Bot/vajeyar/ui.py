"""UI toolkit: formatting, keyboards and a single-message screen manager (clean chat)."""
import html
import logging
from aiogram import Bot
from aiogram.exceptions import TelegramBadRequest, TelegramForbiddenError
from aiogram.types import (InlineKeyboardButton, InlineKeyboardMarkup, BufferedInputFile, InputMediaPhoto, Message,
                           WebAppInfo, CopyTextButton)
from . import db
from .config import USE_EFFECTS
from .texts import t

log = logging.getLogger("vajeyar.ui")
FA_DIGITS = str.maketrans("0123456789.", "۰۱۲۳۴۵۶۷۸۹٫")
EFFECT_PARTY = "5046509860389126442"   # 🎉
EFFECT_FIRE = "5104841245755180586"    # 🔥

SCREEN: dict[int, tuple[int, str]] = {}   # uid -> (message_id, "text"|"photo")
EPH: dict[int, list[int]] = {}            # uid -> temporary message ids (voices, prompts)


def esc(s):
    return html.escape(str(s or ""), quote=False)


def n(u_or_lang, x):
    lang = u_or_lang if isinstance(u_or_lang, str) else u_or_lang.get("lang", "fa")
    s = str(x)
    return s.translate(FA_DIGITS) if lang == "fa" else s


def pct(u, x):
    return n(u, x) + ("٪" if u.get("lang") == "fa" else "%")


def bar(frac, length=10):
    frac = max(0.0, min(1.0, frac))
    k = round(frac * length)
    return "▰" * k + "▱" * (length - k)


def L(u, key, **kw):
    return t(u.get("lang", "fa"), key, **kw)


def ivl_label(u, d):
    fa = u.get("lang") == "fa"
    if d < 1:
        return L(u, "now")
    if d < 30:
        return f"{n(u, int(d))} {('روز' if fa else ('day' if d == 1 else 'days'))}"
    if d < 365:
        m = round(d / 30)
        return f"{n(u, m)} {('ماه' if fa else ('month' if m == 1 else 'months'))}"
    return f"{n(u, round(d / 365, 1))} {('سال' if fa else 'years')}"


# ---------- keyboards ----------
def B(text, cb=None, style=None, url=None, app=None, switch=None, copy=None):
    kw = {"text": text}
    if style:
        kw["style"] = style            # "primary" (blue) | "success" (green) | "danger" (red)
    if url:
        kw["url"] = url
    elif app:
        kw["web_app"] = WebAppInfo(url=app)
    elif switch is not None:
        kw["switch_inline_query_current_chat"] = switch
    elif copy:
        kw["copy_text"] = CopyTextButton(text=copy)
    else:
        kw["callback_data"] = cb or "noop"
    return InlineKeyboardButton(**kw)


def kb(rows):
    return InlineKeyboardMarkup(inline_keyboard=[[b for b in r if b] for r in rows if r and any(r)])


def mark(on):
    return "● " if on else "○ "


# ---------- photos ----------
class Photo:
    """A cacheable image: rendered once, then re-used by Telegram file_id."""
    def __init__(self, key, render):
        self.key, self.render = key, render

    async def input(self):
        fid = await db.media_get(self.key) if self.key else None
        return fid or BufferedInputFile(self.render(), filename="card.png")

    async def remember(self, msg: Message):
        if self.key and msg and getattr(msg, "photo", None):
            await db.media_set(self.key, msg.photo[-1].file_id)


# ---------- screen manager ----------
async def clear_eph(bot: Bot, uid: int):
    ids = EPH.pop(uid, [])
    for mid in ids:
        try:
            await bot.delete_message(uid, mid)
        except Exception:
            pass


def add_eph(uid, mid):
    EPH.setdefault(uid, []).append(mid)


async def _delete(bot, uid, mid):
    try:
        await bot.delete_message(uid, mid)
    except Exception:
        pass


async def show(bot: Bot, u: dict, text: str, rows=None, photo: "Photo | str | None" = None, msg: Message | None = None,
               new=False, effect=None):
    """Render a screen in-place. photo: None (text screen), Photo (image screen) or "keep" (only update caption)."""
    uid = u["id"]
    markup = kb(rows) if isinstance(rows, list) else rows
    await clear_eph(bot, uid)
    cur_id, cur_kind = (msg.message_id, "photo" if msg.photo else "text") if msg else SCREEN.get(uid, (None, None))
    want = "photo" if photo else "text"
    if cur_id and not new and not effect:
        try:
            if want == "text" and cur_kind == "text":
                await bot.edit_message_text(text, chat_id=uid, message_id=cur_id, reply_markup=markup)
                SCREEN[uid] = (cur_id, "text"); return cur_id
            if want == "photo" and cur_kind == "photo":
                if photo == "keep":
                    await bot.edit_message_caption(chat_id=uid, message_id=cur_id, caption=text, reply_markup=markup)
                else:
                    m = await bot.edit_message_media(InputMediaPhoto(media=await photo.input(), caption=text), chat_id=uid, message_id=cur_id, reply_markup=markup)
                    if isinstance(m, Message):
                        await photo.remember(m)
                SCREEN[uid] = (cur_id, "photo"); return cur_id
        except TelegramBadRequest as e:
            if "not modified" in str(e):
                return cur_id
            log.debug("edit failed, sending new: %s", e)
    if photo == "keep":
        photo = None; want = "text"
    try:
        if want == "photo":
            kw = {"message_effect_id": effect} if (effect and USE_EFFECTS) else {}
            m = await bot.send_photo(uid, await photo.input(), caption=text, reply_markup=markup, **kw)
            await photo.remember(m)
        else:
            try:
                kw = {"message_effect_id": effect} if (effect and USE_EFFECTS) else {}
                m = await bot.send_message(uid, text, reply_markup=markup, **kw)
            except TelegramBadRequest:
                m = await bot.send_message(uid, text, reply_markup=markup)
    except TelegramForbiddenError:
        return None
    if cur_id and cur_id != m.message_id:
        await _delete(bot, uid, cur_id)
    SCREEN[uid] = (m.message_id, want)
    return m.message_id


def events_text(u, events):
    from .logic import ach_info
    out = []
    for e in events:
        if e.startswith("levelup:"):
            out.append(L(u, "levelup", n=n(u, e.split(":")[1])))
        elif e.startswith("ach:"):
            emo, (name, _) = ach_info(e[4:], u["lang"])
            out.append(L(u, "ach_unlocked", e=emo, name=name))
    return "\n".join(out)
