"""Quizzes (8 question types), games (match pairs, speed round), statistics and achievements."""
import asyncio
import random
import re
import time
from datetime import date, timedelta

from aiogram import Router, F, Bot
from aiogram.filters import Command
from aiogram.types import Message, CallbackQuery

from .. import db, logic
from ..media import stats_image
from ..ui import show, B, L, n, bar, esc, pct, Photo, EFFECT_PARTY, events_text
from ..words import WORDS, CATS, cat_name, pos_name, deck
from .core import lab
from .common import ack, drop, speak, lock, QUIZ, GAME, WAIT

router = Router(name="play")
SRCS = ["recent7", "recent30", "learned", "starred", "difficult", "all"]
TYPES = ["mixed", "enfa", "faen", "def", "type", "listen", "blank", "tf"]
COUNTS = [5, 10, 15, 20]
TIMER = 15
SPEED_SECS = 60


def short(s, k=26):
    s = s.split("،")[0].split(",")[0].strip() if len(s) > k else s
    return s if len(s) <= k else s[:k - 1] + "…"


# ================================================================= quiz setup
async def pool(u, src):
    P = await db.all_p(u["id"])
    allw = await logic.user_words(u["id"])
    now = time.time()
    if src == "all":
        return allw
    out = []
    for w in allw:
        p = P.get(w.id)
        if not p:
            continue
        if src == "recent7" and p["seen"] and now - p["last"] <= 7 * 86400 \
                or src == "recent30" and p["seen"] and now - p["last"] <= 30 * 86400 \
                or src == "learned" and p["seen"] \
                or src == "starred" and p["star"] \
                or src == "difficult" and p["bad"] and (p["lapses"] >= 2 or p["bad"] >= p["ok"]):
            out.append(w)
    return out


async def quiz_setup(bot, u, msg=None, new=False):
    c = u["qcfg"]
    avail = len(await pool(u, c["src"]))
    rows = []
    for i in range(0, 6, 3):
        rows.append([B(("● " if c["src"] == s else "") + L(u, "src_" + s), f"qc:src:{s}", "primary" if c["src"] == s else None) for s in SRCS[i:i + 3]])
    for i in range(0, 8, 4):
        rows.append([B(L(u, "t_" + t) if c["type"] != t else "● " + L(u, "t_" + t), f"qc:type:{t}", "primary" if c["type"] == t else None) for t in TYPES[i:i + 4]])
    rows.append([B(("● " if c["count"] == k else "") + n(u, k), f"qc:count:{k}", "primary" if c["count"] == k else None) for k in COUNTS])
    rows.append([B(("✅ " if c["timer"] else "▫️ ") + lab(u, "q_timer"), "qc:timer:x")])
    rows.append([B(L(u, "b_qstart"), "qs", "success")])
    rows.append([B(L(u, "b_home"), "h")])
    ok = "✅" if avail >= 4 else "⚠️"
    text = (f"{L(u, 'quiz_title')}\n\n<blockquote>📚 {L(u, 'q_source')}: <b>{L(u, 'src_' + c['src'])}</b>\n"
            f"❓ {L(u, 'q_type')}: <b>{L(u, 't_' + c['type'])}</b>\n"
            f"🔢 {L(u, 'q_count')}: <b>{n(u, c['count'])}</b>{'  ·  ⏱ ' + n(u, TIMER) + 's' if c['timer'] else ''}\n"
            f"{ok} {L(u, 'q_available')}: <b>{n(u, avail)}</b></blockquote>\n\n"
            + ("💡 منبع، نوع و تعداد سؤال را انتخاب کنید." if u["lang"] == "fa" else "💡 Pick a source, a type and the number of questions."))
    await show(bot, u, text, rows, msg=msg, new=new)


@router.callback_query(F.data == "q")
async def cb_quiz(cb: CallbackQuery, bot: Bot, u: dict):
    QUIZ.pop(u["id"], None)
    await quiz_setup(bot, u, msg=cb.message)


@router.message(Command("quiz"))
async def cmd_quiz(msg: Message, bot: Bot, u: dict):
    await drop(msg)
    await quiz_setup(bot, u, new=True)


@router.callback_query(F.data.startswith("qc:"))
async def cb_quiz_cfg(cb: CallbackQuery, bot: Bot, u: dict):
    _, k, v = cb.data.split(":")
    c = dict(u["qcfg"])
    if k == "timer":
        c["timer"] = not c["timer"]
    elif k == "count":
        c["count"] = int(v)
    else:
        c[k] = v
    u["qcfg"] = c
    await quiz_setup(bot, u, msg=cb.message)


# ================================================================= question building
def _distractors(w, field, k, allw):
    same = [x for x in allw if x.cat == w.cat and x.id != w.id and getattr(x, field) != getattr(w, field)]
    other = [x for x in allw if x.id != w.id and getattr(x, field) != getattr(w, field)]
    src = same if len(same) >= k else other
    picks, seen = [], {getattr(w, field).lower()}
    for x in random.sample(src, min(len(src), 40)):
        v = getattr(x, field).lower()
        if v not in seen:
            picks.append(x); seen.add(v)
        if len(picks) == k:
            break
    return picks


def _blank(w):
    if not w.ex:
        return None
    stem = re.escape(w.word.lower()[:max(3, len(w.word) - 2)])
    m = re.search(rf"\b{stem}\w*", w.ex, re.I)
    if not m:
        return None
    return w.ex[:m.start()] + "＿＿＿＿" + w.ex[m.end():]


def build_question(w, typ, allw):
    choices = ["enfa", "faen", "tf", "type", "listen"] + (["def"] if w.df else []) + (["blank"] if _blank(w) else [])
    if typ == "mixed" or typ not in choices:
        typ = random.choice(choices) if typ == "mixed" else ("enfa" if typ in ("def", "blank") else typ)
    q = {"k": w.key, "t": typ, "res": None}
    if typ in ("enfa", "faen", "def", "blank"):
        field = "fa" if typ == "enfa" else "word"
        opts = [w] + _distractors(w, field, 3, allw)
        random.shuffle(opts)
        q["opts"] = [o.key for o in opts]; q["optlab"] = [getattr(o, field) for o in opts]
        q["ans"] = q["opts"].index(w.key)
        if typ == "blank":
            q["blank"] = _blank(w)
    elif typ == "tf":
        truth = random.random() < 0.5
        shown = w if truth else (_distractors(w, "fa", 1, allw) or [w])[0]
        q["shown"] = shown.fa; q["ans"] = 1 if shown.id == w.id or shown.fa == w.fa else 0
    return q


async def start_quiz(bot, u, msg=None, new=False):
    c = u["qcfg"]
    pl = await pool(u, c["src"])
    if len(pl) < 4:
        rows = [[B(L(u, "b_learn"), "l", "success")], [B(L(u, "b_back"), "q"), B(L(u, "b_home"), "h")]]
        return await show(bot, u, "⚠️ " + L(u, "q_notenough"), rows, msg=msg, new=new)
    allw = await logic.user_words(u["id"])
    targets = random.sample(pl, min(c["count"], len(pl)))
    qs = [build_question(w, c["type"], allw) for w in targets]
    QUIZ[u["id"]] = dict(qs=qs, i=0, score=0, t0=time.time(), qt=time.time(), ev=[], hint=0, token=random.random())
    await render_question(bot, u, msg=msg, new=new)


@router.callback_query(F.data.startswith("qs"))
async def cb_quiz_start(cb: CallbackQuery, bot: Bot, u: dict):
    if cb.data == "qs:recent":
        c = dict(u["qcfg"]); c["src"] = "recent7"; u["qcfg"] = c
        if len(await pool(u, "recent7")) < 4:
            c["src"] = "learned"
    await start_quiz(bot, u, msg=cb.message)


def q_header(u, Q):
    i, tot = Q["i"], len(Q["qs"])
    return f"📝 <b>{L(u, 'q_head', i=n(u, i + 1), n=n(u, tot))}</b>  <code>{bar(i / tot, 10)}</code>  ✅ {n(u, Q['score'])}"


async def q_body(u, q):
    w = await logic.word_by_key(q["k"])
    pos = esc(pos_name(w.pos, u["lang"]))
    t = q["t"]
    if t == "enfa":
        return w, f"{L(u, 'q_what')}\n\n🔤 <b>{esc(w.word)}</b>  <i>{pos}</i>"
    if t == "faen":
        return w, f"{L(u, 'q_which')}\n\n🇮🇷 <b>{esc(w.fa)}</b>  <i>{pos}</i>"
    if t == "def":
        return w, f"{L(u, 'q_whichdef')}\n\n<blockquote>📘 {esc(w.df)}</blockquote>"
    if t == "blank":
        return w, f"{L(u, 'q_fill')}\n\n<blockquote>💬 <i>{esc(q['blank'])}</i></blockquote>"
    if t == "tf":
        return w, f"{L(u, 'q_tf')}\n\n🔤 <b>{esc(w.word)}</b>  =  🇮🇷 <b>{esc(q['shown'])}</b>"
    if t == "type":
        return w, f"{L(u, 'q_typeit')}\n\n🇮🇷 <b>{esc(w.fa)}</b>  <i>{pos}</i>"
    return w, f"{L(u, 'q_listen')}\n\n🎧 <i>{pos}</i> · {n(u, len(w.word))} {'حرف' if u['lang'] == 'fa' else 'letters'}"


def hint_of(word, k):
    return " ".join(ch if (i < k or ch == " ") else "_" for i, ch in enumerate(word))


async def render_question(bot, u, msg=None, new=False):
    Q = QUIZ.get(u["id"])
    if not Q:
        return
    if Q["i"] >= len(Q["qs"]):
        return await quiz_result(bot, u, msg=msg)
    q = Q["qs"][Q["i"]]; i = Q["i"]
    w, body = await q_body(u, q)
    text = q_header(u, Q) + "\n\n" + body
    if Q["hint"]:
        text += "\n\n" + L(u, "hint_is", h=esc(hint_of(w.word, Q["hint"])))
    if u["qcfg"]["timer"]:
        text += f"\n\n⏱ <b>{n(u, TIMER)}</b> {L(u, 'sec')}"
    t = q["t"]
    if t in ("enfa",):
        rows = [[B(short(lab, 34), f"qa:{i}:{j}")] for j, lab in enumerate(q["optlab"])]
    elif t in ("faen", "def", "blank"):
        o = [B(lab, f"qa:{i}:{j}") for j, lab in enumerate(q["optlab"])]
        rows = [o[:2], o[2:]]
    elif t == "tf":
        rows = [[B(L(u, "true"), f"qa:{i}:1", "success"), B(L(u, "false"), f"qa:{i}:0", "danger")]]
    elif t == "type":
        rows = [[B(L(u, "b_hint"), f"qh:{i}"), B(("رد شدن" if u["lang"] == "fa" else "Skip") + " ›", f"qa:{i}:-1")]]
    else:
        rows = [[B(L(u, "b_play"), f"qp:{i}:n", "primary"), B(L(u, "b_slow"), f"qp:{i}:s")],
                [B(L(u, "b_hint"), f"qh:{i}"), B(("رد شدن" if u["lang"] == "fa" else "Skip") + " ›", f"qa:{i}:-1")]]
    rows.append([B(L(u, "b_finish"), "qx")])
    if t in ("type", "listen"):
        WAIT[u["id"]] = "quiz"
    elif WAIT.get(u["id"]) == "quiz":
        WAIT.pop(u["id"], None)
    if not Q.get("shown_i") == i:
        Q["shown_i"] = i; Q["qt"] = time.time(); Q["token"] = random.random()
        if u["qcfg"]["timer"]:
            asyncio.create_task(_timer(bot, u["id"], i, Q["token"]))
    await show(bot, u, text, rows, msg=msg, new=new)
    if t == "listen" and Q.get("spoken") != i:
        Q["spoken"] = i
        await speak(bot, u, w.word)


async def _timer(bot, uid, i, token):
    await asyncio.sleep(TIMER)
    async with lock(uid):
        Q = QUIZ.get(uid)
        if not Q or Q["i"] != i or Q["token"] != token or Q["qs"][i]["res"] is not None:
            return
        u = await db.get_user(uid)
        await answer(bot, u, Q, None, timeout=True)
        await db.save_user(u)


def norm(s):
    return re.sub(r"[^a-z0-9 ]", "", (s or "").lower().replace("’", "'")).strip()


async def answer(bot, u, Q, choice, typed=None, timeout=False, msg=None):
    """choice: option index / 1|0 for true-false / -1 skip / None (timeout or typed)."""
    q = Q["qs"][Q["i"]]
    if q["res"] is not None:
        return
    w = await logic.word_by_key(q["k"])
    if timeout:
        ok = False
    elif typed is not None:
        ok = norm(typed) == norm(w.word)
    else:
        ok = choice == q.get("ans") and choice != -1
    q["res"] = ok; q["picked"] = choice; q["typed"] = typed
    if ok:
        Q["score"] += 1
    await logic.quiz_result(u, w.id, ok, Q["ev"])
    if q["t"] in ("type", "listen") and WAIT.get(u["id"]) == "quiz":
        WAIT.pop(u["id"], None)
    await render_feedback(bot, u, Q, timeout=timeout, msg=msg)


async def render_feedback(bot, u, Q, timeout=False, msg=None):
    q = Q["qs"][Q["i"]]; i = Q["i"]
    w, body = await q_body(u, q)
    verdict = L(u, "timeup") if timeout else (L(u, "correct") if q["res"] else L(u, "wrong"))
    text = q_header(u, Q) + "\n\n" + body + "\n\n" + verdict
    if not q["res"]:
        text += f"\n{L(u, 'answer')}: <b>{esc(w.word)}</b> — {esc(w.fa)}"
        if q.get("typed"):
            text += f"\n<s>{esc(q['typed'])}</s>"
    if w.ex and q["t"] != "blank":
        text += f"\n<blockquote>💬 <i>{esc(w.ex)}</i></blockquote>"
    rows = []
    t = q["t"]
    if "opts" in q:
        btns = []
        for j, lab in enumerate(q["optlab"]):
            if j == q["ans"]:
                btns.append(B("✅ " + short(lab, 32), "noop", "success"))
            elif j == q.get("picked"):
                btns.append(B("❌ " + short(lab, 32), "noop", "danger"))
            else:
                btns.append(B(short(lab, 32), "noop"))
        rows = [[b] for b in btns] if t == "enfa" else [btns[:2], btns[2:]]
    elif t == "tf":
        rows = [[B(("✅ " if q["ans"] == 1 else "") + L(u, "true"), "noop", "success" if q["ans"] == 1 else None),
                 B(("✅ " if q["ans"] == 0 else "") + L(u, "false"), "noop", "success" if q["ans"] == 0 else None)]]
    last = i + 1 >= len(Q["qs"])
    rows.append([B("🔊", f"sp:w:{w.key}"), B(L(u, "b_finish") if last else L(u, "b_next"), "qn:" + str(i), "primary")])
    await show(bot, u, text, rows, msg=msg)


@router.callback_query(F.data.startswith("qa:"))
async def cb_quiz_answer(cb: CallbackQuery, bot: Bot, u: dict):
    Q = QUIZ.get(u["id"])
    _, i, j = cb.data.split(":")
    if not Q or int(i) != Q["i"]:
        return await ack(cb, L(u, "session_expired") if not Q else None)
    ok_before = Q["score"]
    await answer(bot, u, Q, int(j), msg=cb.message)
    await ack(cb, "✅" if Q["score"] > ok_before else "❌")


@router.callback_query(F.data.startswith("qh:"))
async def cb_quiz_hint(cb: CallbackQuery, bot: Bot, u: dict):
    Q = QUIZ.get(u["id"])
    if not Q or int(cb.data[3:]) != Q["i"]:
        return await ack(cb)
    w = await logic.word_by_key(Q["qs"][Q["i"]]["k"])
    Q["hint"] = min(len(w.word) - 1, Q["hint"] + max(1, len(w.word) // 4))
    await render_question(bot, u, msg=cb.message)


@router.callback_query(F.data.startswith("qp:"))
async def cb_quiz_play(cb: CallbackQuery, bot: Bot, u: dict):
    Q = QUIZ.get(u["id"])
    _, i, mode = cb.data.split(":")
    if not Q or int(i) != Q["i"]:
        return await ack(cb)
    await ack(cb, "🔊")
    w = await logic.word_by_key(Q["qs"][Q["i"]]["k"])
    await speak(bot, u, w.word, slow=(mode == "s"))


@router.callback_query(F.data.startswith("qn:"))
async def cb_quiz_next(cb: CallbackQuery, bot: Bot, u: dict):
    Q = QUIZ.get(u["id"])
    if not Q or int(cb.data[3:]) != Q["i"]:
        return await ack(cb)
    Q["i"] += 1; Q["hint"] = 0
    await render_question(bot, u, msg=cb.message)


@router.callback_query(F.data == "qx")
async def cb_quiz_finish(cb: CallbackQuery, bot: Bot, u: dict):
    Q = QUIZ.get(u["id"])
    if not Q:
        return await quiz_setup(bot, u, msg=cb.message)
    Q["qs"] = [q for q in Q["qs"] if q["res"] is not None]
    if not Q["qs"]:
        QUIZ.pop(u["id"], None); WAIT.pop(u["id"], None)
        return await quiz_setup(bot, u, msg=cb.message)
    Q["i"] = len(Q["qs"])
    await quiz_result(bot, u, msg=cb.message)


async def typed_answer(bot, u, text):
    Q = QUIZ.get(u["id"])
    if not Q or Q["i"] >= len(Q["qs"]):
        WAIT.pop(u["id"], None); return
    await answer(bot, u, Q, None, typed=text)


async def quiz_result(bot, u, msg=None):
    Q = QUIZ.get(u["id"])
    WAIT.pop(u["id"], None)
    tot = len(Q["qs"]); sc = Q["score"]
    u["quizzes"] = (u.get("quizzes") or [])[-49:] + [[time.time(), sc, tot]]
    await logic.check_ach(u, Q["ev"])
    p = round(100 * sc / max(1, tot))
    mood = L(u, "res_perfect") if sc == tot else L(u, "res_good") if p >= 70 else L(u, "res_keep")
    secs = int(time.time() - Q["t0"])
    text = (f"{L(u, 'res_title')}\n\n<blockquote><b>{n(u, sc)}/{n(u, tot)}</b>  ·  {pct(u, p)}\n<code>{bar(sc / max(1, tot), 14)}</code>\n"
            f"⏱ {n(u, secs // 60)}:{n(u, f'{secs % 60:02d}')}  ·  ⭐ +{n(u, sc * 5)} XP</blockquote>\n{mood}")
    wrong = [q for q in Q["qs"] if not q["res"]]
    if wrong:
        text += f"\n\n<b>{L(u, 'res_mistakes')}:</b>"
        for q in wrong[:12]:
            w = await logic.word_by_key(q["k"])
            text += f"\n• <b>{esc(w.word)}</b> — {esc(w.fa)}"
    ev = events_text(u, Q["ev"])
    if ev:
        text += "\n\n" + ev
    Q["wrong"] = [q["k"] for q in wrong]
    rows = []
    if wrong:
        rows.append([B(L(u, "b_addmist"), "qm", "success")])
    rows.append([B(L(u, "b_retry"), "qs", "primary"), B("⚙️ " + ("تنظیم آزمون" if u["lang"] == "fa" else "Quiz options"), "q")])
    rows.append([B(L(u, "b_home"), "h")])
    await show(bot, u, text, rows, msg=msg, effect=EFFECT_PARTY if (sc == tot and tot >= 5) else None)


@router.callback_query(F.data == "qm")
async def cb_quiz_mistakes(cb: CallbackQuery, bot: Bot, u: dict):
    Q = QUIZ.get(u["id"])
    if not Q:
        return await ack(cb, L(u, "session_expired"))
    for k in Q.get("wrong", []):
        w = await logic.word_by_key(k)
        if w:
            await logic.rate(u, w.id, "add")
    await ack(cb, L(u, "added_review"))
    from .study import start_session
    keys = Q.get("wrong", [])
    QUIZ.pop(u["id"], None)
    await start_session(bot, u, keys, "review", "r", msg=cb.message)


# ================================================================= games
async def games_screen(bot, u, msg=None, new=False):
    mb = u.get("match_best")
    text = (f"{L(u, 'games_title')}\n\n<blockquote>{L(u, 'match')} — {L(u, 'match_sub')}\n🏆 {L(u, 'best_time')}: "
            f"<b>{n(u, mb) + ' ' + L(u, 'sec') if mb else '—'}</b>\n\n{L(u, 'speed')} — {L(u, 'speed_sub')}\n🏆 {L(u, 'best')}: <b>{n(u, u.get('speed_best', 0))}</b></blockquote>")
    rows = [[B(L(u, "match"), "gm", "primary"), B(L(u, "speed"), "gs", "primary")], [B(L(u, "b_home"), "h")]]
    await show(bot, u, text, rows, msg=msg, new=new)


@router.callback_query(F.data == "g")
async def cb_games(cb: CallbackQuery, bot: Bot, u: dict):
    GAME.pop(u["id"], None)
    await games_screen(bot, u, msg=cb.message)


@router.message(Command("games"))
async def cmd_games(msg: Message, bot: Bot, u: dict):
    await drop(msg)
    await games_screen(bot, u, new=True)


async def game_pool(u, k):
    learned = await pool(u, "learned")
    if len(learned) >= k * 2:
        return random.sample(learned, k)
    base = [w for w in WORDS if w.cat == u["track"] and w.level <= 2] or WORDS
    extra = random.sample(base, min(len(base), k * 3))
    mix = list({w.id: w for w in (learned + extra)}.values())
    return random.sample(mix, k)


@router.callback_query(F.data == "gm")
async def cb_match_start(cb: CallbackQuery, bot: Bot, u: dict):
    ws = await game_pool(u, 6)
    keys = [w.key for w in ws]
    GAME[u["id"]] = dict(kind="match", L=logic.shuffle(keys), R=logic.shuffle(keys), names={w.key: w.word for w in ws},
                         fa={w.key: w.fa for w in ws}, sel=None, done=set(), err=0, t0=time.time())
    await render_match(bot, u, msg=cb.message)


async def render_match(bot, u, msg=None):
    G = GAME[u["id"]]
    rows = []
    for i in range(len(G["L"])):
        lk, rk = G["L"][i], G["R"][i]
        if lk in G["done"]:
            lb = B("✓ " + G["names"][lk], "noop", "success")
        else:
            on = G["sel"] == ("L", i)
            lb = B(("▸ " if on else "") + G["names"][lk], f"gt:L:{i}", "primary" if on else None)
        if rk in G["done"]:
            rb = B("✓ " + short(G["fa"][rk], 22), "noop", "success")
        else:
            on = G["sel"] == ("R", i)
            rb = B(("▸ " if on else "") + short(G["fa"][rk], 22), f"gt:R:{i}", "primary" if on else None)
        rows.append([lb, rb])
    rows.append([B(L(u, "b_exit"), "g")])
    text = (f"{L(u, 'match_head')}\n\n✓ <b>{n(u, len(G['done']))}/{n(u, len(G['L']))}</b>  ·  ❌ {L(u, 'mistakes')}: <b>{n(u, G['err'])}</b>"
            f"  ·  ⏱ {n(u, int(time.time() - G['t0']))} {L(u, 'sec')}")
    await show(bot, u, text, rows, msg=msg)


@router.callback_query(F.data.startswith("gt:"))
async def cb_match_tap(cb: CallbackQuery, bot: Bot, u: dict):
    G = GAME.get(u["id"])
    if not G or G["kind"] != "match":
        return await ack(cb, L(u, "session_expired"))
    _, side, i = cb.data.split(":"); i = int(i)
    if G["sel"] is None or G["sel"][0] == side:
        G["sel"] = (side, i)
        await ack(cb)
        return await render_match(bot, u, msg=cb.message)
    s_side, s_i = G["sel"]
    lk = G["L"][i] if side == "L" else G["L"][s_i]
    rk = G["R"][i] if side == "R" else G["R"][s_i]
    G["sel"] = None
    if lk == rk:
        G["done"].add(lk); await ack(cb, "✅")
    else:
        G["err"] += 1; await ack(cb, "❌")
    if len(G["done"]) == len(G["L"]):
        secs = int(time.time() - G["t0"])
        best = u.get("match_best")
        u["match_best"] = secs if not best else min(best, secs)
        ev = []
        await logic.log(u, ev, xp=20)
        await logic.check_ach(u, ev)
        GAME.pop(u["id"], None)
        text = L(u, "match_done", t=n(u, secs), e=n(u, G["err"]), b=n(u, u["match_best"])) + "\n⭐ +" + n(u, 20) + " XP"
        if events_text(u, ev):
            text += "\n\n" + events_text(u, ev)
        rows = [[B(L(u, "b_playagain"), "gm", "success"), B(L(u, "speed"), "gs")], [B(L(u, "b_back"), "g"), B(L(u, "b_home"), "h")]]
        return await show(bot, u, text, rows, msg=cb.message, effect=EFFECT_PARTY)
    await render_match(bot, u, msg=cb.message)


# ---------- speed round ----------
@router.callback_query(F.data == "gs")
async def cb_speed_start(cb: CallbackQuery, bot: Bot, u: dict):
    allw = await logic.user_words(u["id"])
    ws = await game_pool(u, 40) if len(WORDS) >= 80 else allw
    G = dict(kind="speed", t0=time.time(), score=0, n=0, pool=[w.key for w in ws], cur=None, token=random.random())
    GAME[u["id"]] = G
    await speed_next(bot, u, msg=cb.message)
    asyncio.create_task(_speed_timer(bot, u["id"], G["token"]))


async def speed_next(bot, u, msg=None):
    G = GAME[u["id"]]
    allw = await logic.user_words(u["id"])
    key = G["pool"][G["n"] % len(G["pool"])]
    w = await logic.word_by_key(key)
    opts = [w] + _distractors(w, "fa", 3, allw); random.shuffle(opts)
    G["cur"] = dict(k=key, ans=[o.key for o in opts].index(key), lab=[o.fa for o in opts])
    left = max(0, int(SPEED_SECS - (time.time() - G["t0"])))
    text = (f"{L(u, 'speed_head')}  ·  {L(u, 'speed_left', s=n(u, left))}  ·  ✅ <b>{n(u, G['score'])}</b>\n"
            f"<code>{bar(left / SPEED_SECS, 14)}</code>\n\n🔤 <b>{esc(w.word)}</b>  <i>{esc(pos_name(w.pos, u['lang']))}</i>")
    rows = [[B(short(lab, 34), f"ga:{G['n']}:{j}")] for j, lab in enumerate(G["cur"]["lab"])]
    rows.append([B(L(u, "b_exit"), "g")])
    await show(bot, u, text, rows, msg=msg)


async def speed_done(bot, u, msg=None):
    G = GAME.pop(u["id"], None)
    if not G:
        return
    u["speed_best"] = max(u.get("speed_best", 0), G["score"])
    ev = []
    await logic.log(u, ev, xp=G["score"] * 3, correct=G["score"], wrong=max(0, G["n"] - G["score"]))
    await logic.check_ach(u, ev)
    text = L(u, "speed_done", s=n(u, G["score"]), b=n(u, u["speed_best"])) + f"\n⭐ +{n(u, G['score'] * 3)} XP"
    if events_text(u, ev):
        text += "\n\n" + events_text(u, ev)
    rows = [[B(L(u, "b_playagain"), "gs", "success"), B(L(u, "match"), "gm")], [B(L(u, "b_back"), "g"), B(L(u, "b_home"), "h")]]
    await show(bot, u, text, rows, msg=msg, effect=EFFECT_PARTY if G["score"] >= 10 else None)


async def _speed_timer(bot, uid, token):
    await asyncio.sleep(SPEED_SECS + 0.5)
    async with lock(uid):
        G = GAME.get(uid)
        if not G or G.get("kind") != "speed" or G["token"] != token:
            return
        u = await db.get_user(uid)
        await speed_done(bot, u)
        await db.save_user(u)


@router.callback_query(F.data.startswith("ga:"))
async def cb_speed_answer(cb: CallbackQuery, bot: Bot, u: dict):
    G = GAME.get(u["id"])
    _, nn_, j = cb.data.split(":")
    if not G or G.get("kind") != "speed" or int(nn_) != G["n"]:
        return await ack(cb)
    ok = int(j) == G["cur"]["ans"]
    G["score"] += int(ok); G["n"] += 1
    await ack(cb, "✅" if ok else "❌ " + G["cur"]["lab"][G["cur"]["ans"]])
    if time.time() - G["t0"] >= SPEED_SECS:
        return await speed_done(bot, u, msg=cb.message)
    await speed_next(bot, u, msg=cb.message)


# ================================================================= statistics & achievements
async def stats_data(u):
    uid = u["id"]
    days = await db.get_days(uid)
    P = await db.all_p(uid)
    today = logic.now_local(u).date()
    days14 = []
    for off in range(-13, 1):
        d = today + timedelta(days=off)
        days14.append((str(d.day), days.get(d.isoformat(), {}).get("reviews", 0)))
    sods = [logic.start_of_day(u, i) for i in range(8)]
    fc = [0] * 7
    boxes = [0] * 6
    for p in P.values():
        if not p["seen"]:
            continue
        boxes[logic.box(p) - 1] += 1
        for i in range(7):
            if p["due"] < sods[i + 1]:
                fc[i] += 1; break
    monday = today - timedelta(days=today.weekday()) - timedelta(weeks=17)
    heat = [[0] * 18 for _ in range(7)]
    for c in range(18):
        for r in range(7):
            d = monday + timedelta(days=c * 7 + r)
            if d <= today:
                heat[r][c] = days.get(d.isoformat(), {}).get("reviews", 0)
    cor = sum(d["correct"] for d in days.values()); wr = sum(d["wrong"] for d in days.values())
    acc = round(100 * cor / (cor + wr)) if cor + wr else 0
    learned = sum(1 for p in P.values() if p["seen"]); mastered = sum(1 for p in P.values() if p["seen"] and p["ivl"] >= 21)
    return dict(days14=days14, fc=fc, boxes=boxes, heat=heat, acc=acc, learned=learned, mastered=mastered, P=P,
                study_days=sum(1 for d in days.values() if d["reviews"] or d["xp"]), today=days.get(today.isoformat(), {}))


async def stats_screen(bot, u, msg=None, new=False):
    s = await stats_data(u)
    streak = logic.streak_now(u)
    kpis = [(s["learned"], "Words learned"), (f"{streak}d", "Day streak"), (f"{s['acc']}%", "Accuracy"), (u["xp"], "Total XP")]
    img = await asyncio.to_thread(stats_image, s["days14"], s["fc"], s["boxes"], s["heat"], kpis)
    qz = u.get("quizzes") or []
    avg = round(100 * sum(q[1] for q in qz) / max(1, sum(q[2] for q in qz))) if qz else 0
    lv = logic.level_of(u["xp"])
    lines = [L(u, "stats_title"), "",
             "<blockquote>" + "\n".join([
                 f"📚 {L(u, 's_learned')}: <b>{n(u, s['learned'])}</b>  ·  💎 {L(u, 's_mastered')}: <b>{n(u, s['mastered'])}</b>",
                 f"🔥 {L(u, 'home_streak').capitalize()}: <b>{n(u, streak)}</b>  ·  🏆 {L(u, 's_best')}: <b>{n(u, u.get('best', 0))}</b>  ·  🧊 {n(u, u.get('freezes', 0))}",
                 f"🎯 {L(u, 's_acc')}: <b>{pct(u, s['acc'])}</b>  ·  📅 {L(u, 's_days')}: <b>{n(u, s['study_days'])}</b>",
                 f"📝 {L(u, 's_quizzes')}: <b>{n(u, len(qz))}</b>{('  ·  ' + pct(u, avg)) if qz else ''}  ·  ⭐ {L(u, 'home_level')} <b>{n(u, lv)}</b> · {n(u, u['xp'])} XP",
                 f"☀️ {L(u, 's_today')}: <b>{n(u, s['today'].get('reviews', 0))}</b> {L(u, 'done_rev')} · +{n(u, s['today'].get('xp', 0))} XP"]) + "</blockquote>",
             f"<b>{L(u, 's_cats')}</b>"]
    for cat in ("general", "ielts", "toefl"):
        ws = deck(cat)
        k = sum(1 for w in ws if s["P"].get(w.id, {}).get("seen"))
        lines.append(f"{CATS[cat]['icon']} <code>{bar(k / len(ws), 10)}</code> {n(u, k)}/{n(u, len(ws))}  {cat_name(cat, u['lang'])}")
    rows = [[B(L(u, "b_ach") + f" · {n(u, len(u['ach']))}/{n(u, len(logic.ACH))}", "ac", "primary")], [B(L(u, "b_home"), "h")]]
    await show(bot, u, "\n".join(lines), rows, photo=Photo(None, lambda: img), msg=msg, new=new)


@router.callback_query(F.data == "st")
async def cb_stats(cb: CallbackQuery, bot: Bot, u: dict):
    await ack(cb, "📊")
    await stats_screen(bot, u, msg=cb.message)


@router.message(Command("stats"))
async def cmd_stats(msg: Message, bot: Bot, u: dict):
    await drop(msg)
    await stats_screen(bot, u, new=True)


@router.callback_query(F.data == "ac")
async def cb_achievements(cb: CallbackQuery, bot: Bot, u: dict):
    lines = [L(u, "ach_title") + f"  ·  {n(u, len(u['ach']))}/{n(u, len(logic.ACH))}", ""]
    for aid, emo, en, fa_, _ in logic.ACH:
        name, desc = fa_ if u["lang"] == "fa" else en
        if aid in u["ach"]:
            lines.append(f"{emo} <b>{name}</b> ✅\n<i>{desc}</i>")
        else:
            lines.append(f"🔒 <b>{name}</b>\n<i>{desc}</i>")
    await show(bot, u, lines[0] + "\n\n" + "\n\n".join(lines[2:]), [[B(L(u, "b_back"), "st"), B(L(u, "b_home"), "h")]], msg=cb.message)
