"""Offline simulator: drives the bot with fake Telegram updates and records every API call (no token needed)."""
import asyncio, os, sys, time, json, itertools
sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
os.environ["DB_PATH"] = "/tmp/vajeyar_test.db"
os.environ.setdefault("BOT_TOKEN", "123456:TEST")
if os.path.exists("/tmp/vajeyar_test.db"):
    os.remove("/tmp/vajeyar_test.db")

from aiogram import Bot, Dispatcher
from aiogram.client.session.base import BaseSession
from aiogram.client.default import DefaultBotProperties
from aiogram.methods import TelegramMethod
from aiogram.types import Update, Message, User
from vajeyar import db, admin, scheduler
from vajeyar.handlers import setup
from vajeyar.handlers.common import SESS, QUIZ, GAME, WAIT

CALLS = []
MID = itertools.count(100)
UID = 777


class FakeSession(BaseSession):
    async def make_request(self, bot, method: TelegramMethod, timeout=None):
        name = type(method).__name__
        data = method.model_dump(exclude_none=True)
        CALLS.append((name, data))
        ret = method.__returning__
        if name == "GetMe":
            return User(id=1, is_bot=True, first_name="DanaFox", username="VajeYarBot")
        if name in ("SendMessage", "SendPhoto", "EditMessageText", "EditMessageMedia", "EditMessageCaption", "SendVoice", "SendAudio", "SendDocument", "CopyMessage"):
            m = {"message_id": data.get("message_id") or next(MID), "date": int(time.time()), "chat": {"id": UID, "type": "private"}}
            if name in ("SendPhoto", "EditMessageMedia") or (name == "EditMessageCaption"):
                m["photo"] = [{"file_id": f"PHOTO{m['message_id']}", "file_unique_id": "x", "width": 1200, "height": 630}]
                m["caption"] = data.get("caption") or (data.get("media") or {}).get("caption", "")
            elif name == "SendVoice":
                m["voice"] = {"file_id": "VOICE1", "file_unique_id": "v", "duration": 1}
            else:
                m["text"] = data.get("text", "")
            return Message.model_validate(m, context={"bot": bot})
        if name == "GetFile":
            from aiogram.types import File
            return File(file_id="f", file_unique_id="f", file_path="doc.json")
        return True

    async def close(self): pass
    async def stream_content(self, url, headers=None, timeout=30, chunk_size=65536, raise_for_status=True):
        yield FILE_BYTES[0]


FILE_BYTES = [b""]
UPD = itertools.count(1)
bot = Bot("123456:TEST", session=FakeSession(), default=DefaultBotProperties(parse_mode="HTML"))
dp = Dispatcher()
dp.include_router(admin.router)
dp.include_router(setup())
USER = {"id": UID, "is_bot": False, "first_name": "Mohammad", "language_code": "fa"}


def last(kind=None):
    for name, d in reversed(CALLS):
        if name in ("SendMessage", "EditMessageText", "SendPhoto", "EditMessageMedia", "EditMessageCaption") and (not kind or name == kind):
            return name, d
    return None, None


def screen_text():
    name, d = last()
    return d.get("text") or d.get("caption") or (d.get("media") or {}).get("caption", "")


def buttons():
    name, d = last()
    kb = (d.get("reply_markup") or {}).get("inline_keyboard", [])
    return [[(b.get("text"), b.get("callback_data"), b.get("style")) for b in row] for row in kb]


async def msg(text=None, document=None):
    m = {"message_id": next(MID), "date": int(time.time()), "chat": {"id": UID, "type": "private"}, "from": USER}
    if text is not None:
        m["text"] = text
        if text.startswith("/"):
            m["entities"] = [{"type": "bot_command", "offset": 0, "length": len(text.split()[0])}]
    if document:
        m["document"] = {"file_id": "DOC", "file_unique_id": "d", "file_name": document, "file_size": len(FILE_BYTES[0])}
    await dp.feed_update(bot, Update.model_validate({"update_id": next(UPD), "message": m}, context={"bot": bot}))


async def cb(data):
    from vajeyar.ui import SCREEN
    mid, kind = SCREEN.get(UID, (1, "text"))
    m = {"message_id": mid, "date": int(time.time()), "chat": {"id": UID, "type": "private"}, "from": {"id": 1, "is_bot": True, "first_name": "B"}}
    if kind == "photo":
        m["photo"] = [{"file_id": "P", "file_unique_id": "p", "width": 1, "height": 1}]
    else:
        m["text"] = "x"
    await dp.feed_update(bot, Update.model_validate({"update_id": next(UPD), "callback_query": {
        "id": str(next(UPD)), "from": USER, "chat_instance": "c", "data": data, "message": m}}, context={"bot": bot}))


def find_cb(prefix):
    for row in buttons():
        for t, c, s in row:
            if c and c.startswith(prefix):
                return c
    return None


def show(title):
    print(f"\n===== {title} =====")
    print(screen_text())
    for row in buttons():
        print("   " + " | ".join(f"[{t}]" + (f"({s})" if s else "") for t, c, s in row))
