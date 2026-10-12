"""Vocabulary bank — parsed from the same data files the web/desktop app uses (data/words_*.js)."""
import re
from dataclasses import dataclass
from .config import ROOT

CATS = {
    "general": {"icon": "🌍", "en": "General English", "fa": "لغات عمومی", "levels": [
        {"en": "Basic", "fa": "پایه", "tag": "A1–A2"}, {"en": "Regular", "fa": "متوسط", "tag": "B1"},
        {"en": "Upper-Intermediate", "fa": "فوق‌متوسط", "tag": "B2"}, {"en": "Advanced", "fa": "پیشرفته", "tag": "C1–C2"}]},
    "ielts": {"icon": "🎓", "en": "IELTS", "fa": "آیلتس", "levels": [
        {"en": "Band 5 – 6", "fa": "نمرهٔ ۵ تا ۶", "tag": "B1"}, {"en": "Band 6.5 – 7", "fa": "نمرهٔ ۶٫۵ تا ۷", "tag": "B2"},
        {"en": "Band 7.5 – 9", "fa": "نمرهٔ ۷٫۵ تا ۹", "tag": "C1–C2"}]},
    "toefl": {"icon": "🏛", "en": "TOEFL", "fa": "تافل", "levels": [
        {"en": "Foundation", "fa": "پایه", "tag": "B1"}, {"en": "Intermediate", "fa": "متوسط", "tag": "B2"},
        {"en": "Advanced", "fa": "پیشرفته", "tag": "C1–C2"}]},
    "custom": {"icon": "✍️", "en": "My Words", "fa": "لغات من", "levels": [{"en": "My list", "fa": "فهرست من", "tag": "—"}]},
}
POS = {"n": ("noun", "اسم"), "v": ("verb", "فعل"), "adj": ("adjective", "صفت"), "adv": ("adverb", "قید"),
       "prep": ("preposition", "حرف اضافه"), "conj": ("conjunction", "حرف ربط"), "phr": ("phrase", "عبارت")}


@dataclass
class Word:
    id: str          # stable id used in the database, e.g. "ielts:access" or "u:12"
    key: str         # short id for callback data, e.g. "g42" or "c12"
    word: str
    pos: str
    fa: str
    df: str
    ex: str
    cat: str
    level: int


WORDS: list[Word] = []
BY_ID: dict[str, Word] = {}
BY_KEY: dict[str, Word] = {}

_BLOCK = re.compile(r"VY_DATA\.push\(\{\s*cat:'(\w+)',\s*level:(\d+),\s*raw:`(.*?)`\s*\}\)", re.S)


def load():
    WORDS.clear(); BY_ID.clear(); BY_KEY.clear()
    files = sorted((ROOT / "data").glob("words_*.js"))
    order = ["words_general.js", "words_ielts.js", "words_toefl.js"]
    files.sort(key=lambda p: (order.index(p.name) if p.name in order else 99, p.name))
    for f in files:
        for cat, level, raw in _BLOCK.findall(f.read_text(encoding="utf-8")):
            for line in raw.strip().splitlines():
                p = [x.strip() for x in line.split("|")]
                if len(p) < 3:
                    continue
                wid = f"{cat}:{p[0].lower()}"
                if wid in BY_ID:
                    continue
                w = Word(wid, f"g{len(WORDS)}", p[0], p[1], p[2], p[3] if len(p) > 3 else "", p[4] if len(p) > 4 else "", cat, int(level))
                WORDS.append(w); BY_ID[wid] = w; BY_KEY[w.key] = w
    return len(WORDS)


def custom_word(row) -> Word:
    return Word(f"u:{row['id']}", f"c{row['id']}", row["word"], row["pos"] or "n", row["fa"] or "—", row["def"] or "", row["ex"] or "", "custom", 1)


def deck(cat, level=None):
    return [w for w in WORDS if w.cat == cat and (not level or w.level == level)]


def cat_name(cat, lang):
    return CATS[cat][lang if lang in ("fa", "en") else "en"]


def level_name(cat, level, lang):
    return CATS[cat]["levels"][level - 1][lang if lang in ("fa", "en") else "en"]


def level_tag(cat, level):
    return CATS[cat]["levels"][level - 1]["tag"]


def pos_name(pos, lang):
    p = POS.get(pos)
    return (p[1] if lang == "fa" else p[0]) if p else (pos or "")


load()
