"""Builds migrations/0002_seed_words.sql from the app's words_*.js files."""
import pathlib
import re
import time

B = re.compile(r"VY_DATA\.push\(\{\s*cat:'(\w+)',\s*level:(\d+),\s*raw:`(.*?)`\s*\}\)", re.S)
POS = {"n", "v", "adj", "adv", "prep", "conj", "phr"}
SRC = pathlib.Path(__file__).resolve().parents[1] / "data" / "legacy"   # original word lists (the app now ships public/js/words_data.js)
OUT = pathlib.Path(__file__).resolve().parents[1] / "migrations" / "0002_seed_words.sql"


def q(s):
    return "'" + s.replace("'", "''") + "'"


t = int(time.time() * 1000)
rows, seen = [], set()
for f in ["words_general.js", "words_ielts.js", "words_toefl.js", "words_extra.js"]:
    for cat, lv, raw in B.findall((SRC / f).read_text(encoding="utf-8")):
        for line in raw.strip().splitlines():
            p = [x.strip() for x in line.split("|")]
            if len(p) < 3:
                continue
            p += ["", ""]
            slug = f"{cat}:{p[0].lower()}"
            if slug in seen:
                continue
            seen.add(slug)
            rows.append(f"({q(slug)},{q(p[0])},{q(p[1] if p[1] in POS else 'n')},{q(p[2])},{q(p[3])},{q(p[4])},{q(cat)},{int(lv)},{t},{t})")
out = [f"-- seed: initial word bank ({len(rows)} words)"]
for i in range(0, len(rows), 40):
    out.append("INSERT OR IGNORE INTO words(slug,word,pos,meaning_fa,definition,example,category_id,level_no,created_at,updated_at) VALUES\n"
               + ",\n".join(rows[i:i + 40]) + ";")
out.append(f"INSERT OR REPLACE INTO meta(key,value) VALUES('words_version','{t}');")
OUT.write_text("\n".join(out), encoding="utf-8")
print(len(rows), "words →", OUT)