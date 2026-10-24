"""Personal word lists: add (with auto-translation), CSV import / export."""
import asyncio
import csv
import io
import re

from aiogram import Router, F, Bot
from aiogram.filters import Command
from aiogram.types import Message, CallbackQuery, BufferedInputFile

from .. import db, logic, online
from ..ui import show, B, L, n, esc
from .common import ack, drop, WAIT, LIST

router = Router(name="mywords")
SPLIT = re.compile(r"\s+[-–—]\s+|\s*\|\s*|\t|\s*[:=]\s+")
POS_MAP = {"noun": "n", "verb": "v", "adjective": "adj", "adverb": "adv", "preposition": "prep", "conjunction": "conj"}


async def mywords_screen(bot, u, msg=None, new=False, note=None):
    rows_c = await db.list_custom(u["id"])
    P = await db.all_p(u["id"])
    fa = u["lang"] == "fa"
    lines = [L(u, "my_title"), ""]
    if note:
        lines.insert(0, note + "\n")
    if rows_c:
        lines.append(f"<blockquote>✍️ {L(u, 'my_count')}: <b>{n(u, len(rows_c))}</b>  ·  ✅ {n(u, sum(1 for r in rows_c if P.get('u:' + str(r['id']), {}).get('seen')))} {L(u, 'home_learned')}</blockquote>")
        lines.append(("🕘 آخرین لغات:" if fa else "🕘 Latest:"))
        for r in rows_c[-6:][::-1]:
            lines.append(f"• <b>{esc(r['word'])}</b> — {esc(r['fa'])}")
    else:
        lines.append(("هنوز لغتی اضافه نکرده‌اید. اولین لغت را اضافه کنید 👇" if fa else "No words yet — add your first one 👇"))
    rows = [[B(L(u, "b_addword"), "wa", "success")]]
    if rows_c:
        rows.append([B(L(u, "b_study_my"), "ls:custom:1", "primary"), B(L(u, "b_browse"), "dl:c:custom")])
    rows.append([B(L(u, "b_import"), "wi"), B(L(u, "b_export"), "we") if rows_c else None])
    rows.append([B(L(u, "b_home"), "h")])
    await show(bot, u, "\n".join(lines), rows, msg=msg, new=new)


@router.callback_query(F.data == "w")
async def cb_mywords(cb: CallbackQuery, bot: Bot, u: dict):
    await mywords_screen(bot, u, msg=cb.message)


@router.message(Command("words", "mywords"))
async def cmd_mywords(msg: Message, bot: Bot, u: dict):
    await drop(msg)
    await mywords_screen(bot, u, new=True)


@router.message(Command("add"))
async def cmd_add(msg: Message, bot: Bot, u: dict):
    await drop(msg)
    arg = (msg.text or "").split(maxsplit=1)
    if len(arg) > 1:
        return await add_lines(bot, u, arg[1])
    WAIT[u["id"]] = "add"
    await show(bot, u, L(u, "add_prompt"), [[B(L(u, "b_cancel"), "w")]], new=True)


@router.callback_query(F.data == "wa")
async def cb_add(cb: CallbackQuery, bot: Bot, u: dict):
    WAIT[u["id"]] = "add"
    await show(bot, u, L(u, "add_prompt"), [[B(L(u, "b_cancel"), "w")]], msg=cb.message)


async def autofill(word):
    tr, data = await asyncio.gather(online.translate(word), online.lookup(word))
    pos, df, ex = "n", "", ""
    if data and not data.get("none") and data.get("defs"):
        d0 = data["defs"][0]
        pos = POS_MAP.get(d0["pos"], "n"); df = d0["def"]
        ex = next((d["ex"] for d in data["defs"] if d.get("ex")), "")
    if tr and tr.strip().lower() == word.lower():
        tr = ""
    return tr, pos, df, ex


async def add_lines(bot, u, text):
    existing = {r["word"].lower() for r in await db.list_custom(u["id"])}
    added, dup = [], 0
    lines = [x.strip() for x in text.strip().splitlines() if x.strip()][:30]
    if any(len(SPLIT.split(x)) == 1 for x in lines):
        await show(bot, u, L(u, "translating"), [])
    for line in lines:
        parts = [p.strip() for p in SPLIT.split(line) if p.strip()]
        word = parts[0][:60]
        if not word or word.lower() in existing:
            dup += 1; continue
        fa_, df, ex, pos = (parts + ["", "", ""])[1:4] + ["n"]
        if len(parts) == 1 or not df:
            tr, pos2, df2, ex2 = await autofill(word)
            fa_ = fa_ or tr; df = df or df2; ex = ex or ex2; pos = pos2
        cid = await db.add_custom(u["id"], word, fa_ or "—", pos, df, ex)
        await logic.rate(u, f"u:{cid}", "add")
        existing.add(word.lower())
        added.append((word, fa_ or "—"))
    ev = []
    await logic.check_ach(u, ev)
    from ..ui import events_text
    note = L(u, "added_n", n=n(u, len(added))) if added else L(u, "add_dup")
    if added:
        note += "\n" + "\n".join(f"• <b>{esc(w)}</b> — {esc(f)}" for w, f in added[:10])
    if dup and added:
        note += f"\n<i>({n(u, dup)} {'تکراری' if u['lang'] == 'fa' else 'duplicate'})</i>"
    if ev:
        note += "\n\n" + events_text(u, ev)
    WAIT[u["id"]] = "add"
    rows = [[B(L(u, "b_study_my"), "ls:custom:1", "success")], [B(L(u, "b_back"), "w"), B(L(u, "b_home"), "h")]]
    hint = "\n\n💡 " + ("لغت بعدی را بفرستید تا اضافه شود." if u["lang"] == "fa" else "Send another word to keep adding.")
    await show(bot, u, note + hint, rows)


@router.callback_query(F.data == "wi")
async def cb_import(cb: CallbackQuery, bot: Bot, u: dict):
    WAIT[u["id"]] = "csv"
    sample = "word,persian,definition,example\nresilient,مقاوم,able to recover quickly,She is resilient."
    await show(bot, u, L(u, "import_prompt") + f"\n\n<pre>{esc(sample)}</pre>", [[B(L(u, "b_cancel"), "w")]], msg=cb.message)


async def import_csv(bot, u, raw: bytes):
    text = raw.decode("utf-8-sig", errors="ignore")
    try:
        dialect = csv.Sniffer().sniff(text[:2000], delimiters=",;\t|")
    except Exception:
        dialect = csv.excel
    existing = {r["word"].lower() for r in await db.list_custom(u["id"])}
    added = 0
    for i, row in enumerate(csv.reader(io.StringIO(text), dialect)):
        row = [c.strip() for c in row]
        if not row or not row[0] or (i == 0 and row[0].lower() in ("word", "english", "لغت")):
            continue
        if row[0].lower() in existing:
            continue
        row += [""] * 4
        cid = await db.add_custom(u["id"], row[0][:60], row[1] or "—", "n", row[2], row[3])
        await logic.rate(u, f"u:{cid}", "add")
        existing.add(row[0].lower()); added += 1
        if added >= 2000:
            break
    await logic.check_ach(u, [])
    return added


@router.callback_query(F.data == "we")
async def cb_export(cb: CallbackQuery, bot: Bot, u: dict):
    out = io.StringIO()
    wr = csv.writer(out)
    wr.writerow(["word", "persian", "definition", "example"])
    for r in await db.list_custom(u["id"]):
        wr.writerow([r["word"], r["fa"], r["def"], r["ex"]])
    await ack(cb)
    await bot.send_document(u["id"], BufferedInputFile(("\ufeff" + out.getvalue()).encode("utf-8"), filename="danafox-my-words.csv"),
                            caption="📤 " + cb_label(u))
    await mywords_screen(bot, u, new=True)


def cb_label(u):
    return "لغات من — دانافاکس" if u["lang"] == "fa" else "My words — DanaFox"
