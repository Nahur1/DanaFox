import asyncio, sys, os, json
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
from sim import *
from vajeyar import db


async def main():
    await db.init()
    u = await db.get_user(UID); u["online"] = False; await db.save_user(u)
    await msg("/start"); show("start")
    await cb("ob:l:fa"); show("track")
    await cb("ob:t:ielts"); show("goal")
    await cb("ob:g:20"); show("home")
    u = await db.get_user(UID); u["online"] = False; await db.save_user(u)
    await cb("l"); show("learn")
    await cb("lc:ielts"); show("levels")
    await cb("ld:ielts:1"); show("deck")
    await cb("ls:ielts:1"); show("card front")
    await cb("fl:0"); show("card back")
    await cb("rt:g:0"); await cb("fl:1"); await cb("rt:a:1"); await cb("rt:k:2")
    for i in range(3, 12):
        await cb(f"fl:{i}"); await cb(f"rt:d3:{i}")
    show("after session")
    await cb("h"); show("home2")
    await cb("q"); show("quiz setup")
    await cb("qc:src:learned"); await cb("qc:type:mixed"); await cb("qc:count:5")
    await cb("qs"); show("question 1")
    from vajeyar.handlers.common import QUIZ
    for k in range(5):
        Q = QUIZ.get(UID)
        if not Q: break
        q = Q["qs"][Q["i"]]
        if q["t"] in ("type", "listen"):
            from vajeyar import logic
            w = await logic.word_by_key(q["k"])
            await msg(w.word if k % 2 == 0 else "wrongword")
        else:
            await cb(f"qa:{Q['i']}:{q.get('ans', 1) if k % 2 == 0 else (q.get('ans', 1) + 1) % (len(q.get('opts', [0, 1])))}")
        if k == 0: show("feedback")
        await cb(f"qn:{Q['i']}")
    show("quiz result")
    await cb("qm"); show("mistakes review")
    await cb("fx")
    await cb("g"); show("games")
    await cb("gm"); show("match")
    from vajeyar.handlers.common import GAME
    G = GAME[UID]
    for i, k in enumerate(G["L"]):
        j = G["R"].index(k)
        await cb(f"gt:L:{i}"); await cb(f"gt:R:{j}")
    show("match done")
    await cb("gs"); show("speed")
    G = GAME[UID]; await cb(f"ga:0:{G['cur']['ans']}"); show("speed 2")
    await cb("g")
    await cb("st"); show("stats")
    name, d = last("SendPhoto")
    await cb("ac"); show("achievements")
    await cb("d"); show("dict")
    await msg("abandon"); show("search exact")
    await msg("ab"); show("search list")
    await cb("dp:1"); show("list p2")
    await cb("dl:c:ielts:1"); show("deck list")
    c = find_cb("dw:"); await cb(c); show("word")
    await cb(c.replace("dw:", "st:") + ":w"); await cb(c.replace("dw:", "nt:") + ":w"); show("note prompt")
    await msg("my mnemonic"); show("word w/ note")
    await cb("w"); show("mywords")
    await cb("wa"); await msg("serendipity - خوش‌شانسی - finding good things by chance - It was pure serendipity.\nresilient - مقاوم"); show("added")
    await cb("ls:custom:1"); show("custom card")
    await cb("fx")
    FILE_BYTES[0] = "word,persian,definition,example\nubiquitous,همه‌جا حاضر,found everywhere,Phones are ubiquitous.\n".encode()
    await cb("w"); await cb("wi"); await msg(document="w.csv"); show("after csv")
    await cb("we")
    await cb("s"); show("settings")
    for k in ("lang", "lang", "goal", "front", "accent", "autoplay"):
        await cb("sv:" + k)
    await cb("tp:rtime"); show("time picker"); await cb("tp:rtime:21:30")
    await cb("tz"); await cb("tz:1"); show("settings2")
    await cb("bk:e")
    bk = [d for n_, d in CALLS if n_ == "SendDocument"][-1]
    await cb("wd"); show("wotd")
    await cb("hp"); show("help")
    await cb("rs"); show("reset confirm")
    # restore from backup made earlier
    from vajeyar import config
    import io
    # inline query
    from aiogram.types import Update
    await dp.feed_update(bot, Update.model_validate({"update_id": 99999, "inline_query": {"id": "iq", "from": USER, "query": "miti", "offset": ""}}, context={"bot": bot}))
    iq = [d for n_, d in CALLS if n_ == "AnswerInlineQuery"][-1]
    print("\n===== inline =====\n", [r["title"] for r in iq["results"]][:5])
    # scheduler
    u = await db.get_user(UID); u["rtime"] = "00:00"; u["wtime"] = "00:00"; u["notified"] = None; u["wotd_sent"] = None; await db.save_user(u)
    from vajeyar.handlers.common import SESS, QUIZ, GAME
    SESS.clear(); QUIZ.clear(); GAME.clear()
    await scheduler.tick(bot); show("wotd push")
    await scheduler.tick(bot); show("reminder push")
    errs = [c for c in CALLS if c[0] == "SendMessage" and "unknown" in str(c)]
    print("\nTOTAL CALLS:", len(CALLS))
    from collections import Counter
    print(Counter(n_ for n_, _ in CALLS))
    await db.close()

asyncio.run(main())
