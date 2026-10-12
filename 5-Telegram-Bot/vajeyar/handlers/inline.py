"""Inline mode: type @bot word in any chat to look up and share a beautifully formatted word card."""
import hashlib
import random

from aiogram import Router, Bot
from aiogram.types import InlineQuery, InlineQueryResultArticle, InputTextMessageContent, InlineKeyboardMarkup, InlineKeyboardButton

from .. import db, logic
from ..ui import esc
from ..words import WORDS, CATS, pos_name, level_tag, cat_name
from ..texts import t

router = Router(name="inline")


def card_html(w, lang):
    s = [f"🟣 <b>{esc(w.word)}</b>  <i>{esc(pos_name(w.pos, lang))}</i>",
         f"{CATS[w.cat]['icon']} {esc(cat_name(w.cat, lang))} · {esc(level_tag(w.cat, w.level))}", "",
         f"🇮🇷 <b>{esc(w.fa)}</b>"]
    if w.df:
        s.append(f"📘 {esc(w.df)}")
    if w.ex:
        s.append(f"<blockquote>💬 <i>{esc(w.ex)}</i></blockquote>")
    return "\n".join(s)


@router.inline_query()
async def on_inline(iq: InlineQuery, bot: Bot):
    u = await db.get_user(iq.from_user.id)
    lang = u.get("lang", "fa")
    q = (iq.query or "").strip().lower()
    if q:
        res = [w for w in WORDS if w.word.lower().startswith(q)] + [w for w in WORDS if q in w.word.lower() and not w.word.lower().startswith(q)] \
            + [w for w in WORDS if q in w.fa]
        res = list({w.id: w for w in res}.values())[:25]
    else:
        res = [logic.word_of_day(u)] + random.sample(WORDS, 9)
    me = await bot.me()
    out = []
    for w in res:
        kb = InlineKeyboardMarkup(inline_keyboard=[[InlineKeyboardButton(text=t(lang, "inline_open"), url=f"https://t.me/{me.username}?start=w_{w.key}")]])
        out.append(InlineQueryResultArticle(
            id=hashlib.md5(w.id.encode()).hexdigest(), title=f"{w.word} — {w.fa}",
            description=(w.df or w.ex or "")[:120],
            input_message_content=InputTextMessageContent(message_text=card_html(w, lang), parse_mode="HTML"),
            reply_markup=kb))
    await iq.answer(out, cache_time=30 if q else 5, is_personal=not q)
