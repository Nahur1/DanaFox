"""Background jobs: daily reminders and the word-of-the-day push, evaluated every minute in each user's time zone."""
import asyncio
import logging

from aiogram import Bot
from aiogram.exceptions import TelegramForbiddenError, TelegramRetryAfter

from . import db, logic
from .handlers.common import lock, SESS, QUIZ, GAME
from .handlers.core import wotd_text, card_photo
from .ui import show, B, L, n

log = logging.getLogger("vajeyar.scheduler")


def _reached(u, hhmm):
    now = logic.now_local(u)
    h, m = map(int, hhmm.split(":"))
    return (now.hour, now.minute) >= (h, m)


async def tick(bot: Bot):
    for u0 in await db.all_users():
        if u0.get("blocked") or not u0.get("onboarded"):
            continue
        uid = u0["id"]
        if uid in SESS or uid in QUIZ or uid in GAME:      # never interrupt an active session
            continue
        today = logic.day_key(u0)
        want_wotd = u0.get("wotd") and u0.get("wotd_sent") != today and _reached(u0, u0.get("wtime", "09:00"))
        want_rem = u0.get("reminder") and u0.get("notified") != today and _reached(u0, u0.get("rtime", "20:00"))
        if not (want_wotd or want_rem):
            continue
        async with lock(uid):
            u = await db.get_user(uid)
            try:
                if want_wotd:
                    u["wotd_sent"] = today
                    w = logic.word_of_day(u)
                    rows = [[B(L(u, "b_speak"), f"sp:w:{w.key}"), B(L(u, "b_addstudy"), f"wa:{w.key}", "success")],
                            [B("📖 " + ("جزئیات" if u["lang"] == "fa" else "Details"), f"dw:{w.key}"), B(L(u, "b_home"), "h")]]
                    await show(bot, u, wotd_text(u, w), rows, photo=card_photo(w) if u.get("images", True) else None, new=True)
                elif want_rem:
                    u["notified"] = today
                    # skip the reminder if today's goal is already reached
                    day = (await db.get_days(uid)).get(today, {})
                    if day.get("reviews", 0) < u["goal"]:
                        due = await logic.due_count(uid)
                        text = L(u, "remind", n=n(u, due)) if due else L(u, "remind_none")
                        streak = logic.streak_now(u)
                        if streak and u.get("last") != today:
                            text += ("\n🔥 " + (f"رکورد {n(u, streak)} روزه‌تان را از دست ندهید!" if u["lang"] == "fa" else f"Keep your {streak}-day streak alive!"))
                        rows = [[B(f"{L(u, 'b_review')} · {n(u, due)}", "r", "success")] if due else [B(L(u, "b_learn"), "l", "success")],
                                [B(L(u, "b_home"), "h")]]
                        await show(bot, u, text, rows, new=True)
            except TelegramForbiddenError:
                u["blocked"] = True
            except TelegramRetryAfter as e:
                await asyncio.sleep(e.retry_after)
            except Exception as e:
                log.warning("notify %s failed: %s", uid, e)
            await db.save_user(u)
        await asyncio.sleep(0.05)     # stay far below Telegram's broadcast limits


async def run(bot: Bot):
    while True:
        try:
            await tick(bot)
        except Exception:
            log.exception("scheduler tick failed")
        await asyncio.sleep(60)
