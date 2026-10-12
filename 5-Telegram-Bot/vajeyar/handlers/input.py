"""Free text and file input: typed quiz answers, notes, adding words, CSV / backup files and dictionary search."""
import io

from aiogram import Router, F, Bot
from aiogram.types import Message

from ..ui import show, B, L, n
from .common import drop, WAIT
from . import core, study, play, mywords

router = Router(name="input")


@router.message(F.text & ~F.text.startswith("/"))
async def on_text(msg: Message, bot: Bot, u: dict):
    await drop(msg)
    text = msg.text.strip()
    if not u.get("onboarded"):
        return await core.onboarding_lang(bot, u, new=True)
    w = WAIT.get(u["id"], "")
    if w == "quiz":
        return await play.typed_answer(bot, u, text)
    if w.startswith("note:"):
        WAIT.pop(u["id"], None)
        _, key, ctx = w.split(":")
        return await study.save_note(bot, u, key, ctx, text)
    if w == "add":
        return await mywords.add_lines(bot, u, text)
    if w in ("csv", "restore"):
        return await show(bot, u, L(u, "import_prompt" if w == "csv" else "restore_prompt"), [[B(L(u, "b_cancel"), "w" if w == "csv" else "s")]])
    await study.search(bot, u, text)


@router.message(F.document)
async def on_document(msg: Message, bot: Bot, u: dict):
    w = WAIT.get(u["id"], "")
    doc = msg.document
    if w not in ("csv", "restore") or doc.file_size > 5 * 1024 * 1024:
        await drop(msg)
        return await show(bot, u, L(u, "unknown"), [[B(L(u, "b_home"), "h")]])
    buf = io.BytesIO()
    await bot.download(doc, destination=buf)
    await drop(msg)
    WAIT.pop(u["id"], None)
    raw = buf.getvalue()
    if w == "csv":
        k = await mywords.import_csv(bot, u, raw)
        return await mywords.mywords_screen(bot, u, note=L(u, "added_n", n=n(u, k)))
    ok = await core.restore_file(bot, u, raw)
    await core.settings(bot, u, note=L(u, "restored") if ok else L(u, "bad_file"))


@router.message()
async def on_other(msg: Message, bot: Bot, u: dict):
    """Stickers, photos, voice… keep the chat clean and point back to the menu."""
    await drop(msg)
    if msg.text and msg.text.startswith("/"):
        return await core.home(bot, u, new=True)
    await show(bot, u, L(u, "unknown"), [[B(L(u, "b_home"), "h")]])
