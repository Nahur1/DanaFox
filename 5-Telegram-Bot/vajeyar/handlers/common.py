"""Shared state, middleware and helpers used by every handler module."""
import asyncio
import logging
import time
from typing import Any, Awaitable, Callable

from aiogram import BaseMiddleware, Bot
from aiogram.exceptions import TelegramBadRequest, TelegramForbiddenError
from aiogram.types import CallbackQuery, Message, TelegramObject, BufferedInputFile

from .. import db, media
from ..ui import SCREEN, L, add_eph, n

log = logging.getLogger("vajeyar.handlers")

LOCKS: dict[int, asyncio.Lock] = {}
WAIT: dict[int, str] = {}          # uid -> what free text / file we are waiting for ("add", "note:<key>", "quiz", ...)
SESS: dict[int, dict] = {}         # flashcard session
QUIZ: dict[int, dict] = {}         # quiz session
GAME: dict[int, dict] = {}         # match / speed game
LIST: dict[int, dict] = {}         # last word list (for paging and "back")
ACKED: set[str] = set()


def lock(uid) -> asyncio.Lock:
    if uid not in LOCKS:
        LOCKS[uid] = asyncio.Lock()
    return LOCKS[uid]


class UserMiddleware(BaseMiddleware):
    """Loads the user profile, serialises updates per user and saves the profile afterwards."""
    async def __call__(self, handler: Callable[[TelegramObject, dict], Awaitable[Any]], event: TelegramObject, data: dict):
        fu = getattr(event, "from_user", None)
        if not fu:
            return await handler(event, data)
        async with lock(fu.id):
            u = await db.get_user(fu.id)
            u["name"] = fu.first_name or ""
            u["blocked"] = False
            if u["_new"] and fu.language_code and not fu.language_code.startswith("fa"):
                u["lang"] = "en" if fu.language_code else u["lang"]
            if fu.id not in SCREEN and u.get("screen"):
                SCREEN[fu.id] = tuple(u["screen"])
            data["u"] = u
            if isinstance(event, CallbackQuery) and fu.id in WAIT:
                d = event.data or ""
                keep = d == "noop" or d.startswith("sp:") or (WAIT[fu.id] == "quiz" and d.startswith(("qh:", "qp:")))
                if not keep:
                    WAIT.pop(fu.id, None)
            try:
                return await handler(event, data)
            finally:
                if fu.id in SCREEN:
                    u["screen"] = list(SCREEN[fu.id])
                await db.save_user(u)
                if isinstance(event, CallbackQuery) and event.id not in ACKED:
                    try:
                        await event.answer()
                    except Exception:
                        pass
                ACKED.discard(getattr(event, "id", None))


async def ack(cb: CallbackQuery, text: str | None = None, alert=False):
    ACKED.add(cb.id)
    try:
        await cb.answer(text, show_alert=alert)
    except Exception:
        pass


async def drop(msg: Message):
    """Delete a user's message to keep the chat tidy (the bot works like a single-screen app)."""
    try:
        await msg.delete()
    except Exception:
        pass


async def speak(bot: Bot, u: dict, text: str, accent=None, slow=None, caption=None):
    """Send a pronunciation voice note as a temporary message (removed on the next screen)."""
    accent = accent or u.get("accent", "en-US")
    slow = u.get("slow", False) if slow is None else slow
    key = media.voice_key(text, accent, slow)
    fid = await db.media_get(key)
    try:
        await bot.send_chat_action(u["id"], "record_voice")
    except Exception:
        pass
    src = fid
    if not src:
        data = await media.tts(text, accent, slow)
        if not data:
            return None
        src = BufferedInputFile(data, filename="voice.mp3")
    try:
        try:
            m = await bot.send_voice(u["id"], src, caption=caption, disable_notification=True)
            if m.voice and not fid:
                await db.media_set(key, m.voice.file_id)
        except TelegramBadRequest:   # user restricted voice messages -> send as audio
            if not isinstance(src, BufferedInputFile):
                data = await media.tts(text, accent, slow)
                src = BufferedInputFile(data, filename="voice.mp3")
            m = await bot.send_audio(u["id"], src, caption=caption, title=text[:60], performer="VajeYar", disable_notification=True)
        add_eph(u["id"], m.message_id)
        return m
    except TelegramForbiddenError:
        return None
    except Exception as e:
        log.warning("voice failed: %s", e)
        return None


def greeting(u):
    from ..logic import now_local
    h = now_local(u).hour
    return L(u, "morning" if 5 <= h < 12 else "afternoon" if 12 <= h < 17 else "evening" if 17 <= h < 22 else "night")


def nn(u, x):
    return n(u, x)


def ago_days(ts):
    return (time.time() - ts) / 86400 if ts else 9999
