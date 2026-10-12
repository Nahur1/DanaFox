"""Admin tools (only for ADMIN_IDS): /admin statistics and /broadcast."""
import asyncio
import time

from aiogram import Router, Bot, F
from aiogram.exceptions import TelegramForbiddenError, TelegramRetryAfter
from aiogram.filters import Command
from aiogram.types import Message

from . import db, logic
from .config import ADMIN_IDS

router = Router(name="admin")
router.message.filter(F.from_user.id.in_(ADMIN_IDS))


@router.message(Command("admin"))
async def cmd_admin(msg: Message):
    users = await db.all_users()
    today = time.strftime("%Y-%m-%d")
    active = sum(1 for u in users if u.get("last") == today)
    async with db.conn().execute("SELECT COUNT(*) c, SUM(seen) s FROM progress") as cur:
        r = await cur.fetchone()
    async with db.conn().execute("SELECT SUM(reviews) r FROM days") as cur:
        rv = (await cur.fetchone())["r"] or 0
    await msg.answer(
        "🛠 <b>VajeYar · Admin</b>\n\n<blockquote>"
        f"👥 Users: <b>{len(users)}</b>\n"
        f"🟢 Active today: <b>{active}</b>\n"
        f"🚫 Blocked: <b>{sum(1 for u in users if u.get('blocked'))}</b>\n"
        f"📚 Words learned (all users): <b>{r['s'] or 0}</b>\n"
        f"🔁 Total reviews: <b>{rv}</b></blockquote>\n\n"
        "📣 <code>/broadcast your message</code> — or reply to any message with /broadcast")


@router.message(Command("broadcast"))
async def cmd_broadcast(msg: Message, bot: Bot):
    src = msg.reply_to_message
    text = (msg.text or "").split(maxsplit=1)
    if not src and len(text) < 2:
        return await msg.answer("Usage: /broadcast text (HTML allowed) — or reply to a message with /broadcast")
    users = [u for u in await db.all_users() if not u.get("blocked")]
    ok = fail = 0
    status = await msg.answer(f"📣 Sending to {len(users)} users…")
    for u in users:
        try:
            if src:
                await bot.copy_message(u["id"], msg.chat.id, src.message_id)
            else:
                await bot.send_message(u["id"], text[1])
            ok += 1
        except TelegramRetryAfter as e:
            await asyncio.sleep(e.retry_after)
        except TelegramForbiddenError:
            fail += 1
            full = await db.get_user(u["id"]); full["blocked"] = True; await db.save_user(full)
        except Exception:
            fail += 1
        await asyncio.sleep(0.05)
    await status.edit_text(f"📣 Done — ✅ {ok} · ❌ {fail}")
