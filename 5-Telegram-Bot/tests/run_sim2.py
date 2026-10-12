import asyncio, sys, os, json
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
from sim import *
from vajeyar import db


async def main():
    await db.init()
    USER["language_code"] = "en"
    await msg("/start"); await cb("ob:l:en"); await cb("ob:t:toefl"); await cb("ob:g:10"); show("home en")
    await cb("ls:toefl:3"); await cb("fl:0"); show("toefl back (online)")
    await cb("rt:d7:0"); await cb("fx"); show("exit summary")
    await msg("serendipitous"); show("online search")
    c = find_cb("oa:")
    if c: await cb(c); show("online add")
    await cb("s"); await cb("bk:e")
    bk = [d for n_, d in CALLS if n_ == "SendDocument"][-1]
    await cb("rs"); await cb("rs:y"); show("after reset")
    await cb("s"); await cb("bk:i"); show("restore prompt")
    # re-create backup bytes from DB before reset is not possible; craft a minimal valid one
    FILE_BYTES[0] = json.dumps({"progress": [{"wid": "toefl:ubiquitous", "seen": 1, "reps": 1, "ease": 2.5, "ivl": 1, "due": 0}], "days": [{"day": "2025-01-01", "reviews": 3}], "custom": [{"id": 5, "word": "zest", "fa": "شور"}], "user": {"xp": 50}}).encode()
    await msg(document="b.json"); show("restored")
    await cb("q"); await cb("qc:type:listen"); await cb("qc:timer:x"); await cb("qc:src:all"); await cb("qs"); show("listen q")
    await asyncio.sleep(16); show("timeout feedback")
    await msg("/stats"); show("stats en")
    await db.close()

asyncio.run(main())
