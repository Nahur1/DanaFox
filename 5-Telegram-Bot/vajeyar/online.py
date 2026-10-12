"""Optional online helpers: free dictionary API (phonetics, audio, synonyms) and MyMemory translation."""
import aiohttp
from . import db
from .config import PROXY

_session: aiohttp.ClientSession | None = None


async def session():
    global _session
    if _session is None or _session.closed:
        _session = aiohttp.ClientSession(timeout=aiohttp.ClientTimeout(total=8))
    return _session


async def close():
    if _session and not _session.closed:
        await _session.close()


async def lookup(word: str) -> dict | None:
    k = word.lower().strip()
    cached = await db.dict_get(k)
    if cached is not None:
        return cached
    try:
        s = await session()
        async with s.get(f"https://api.dictionaryapi.dev/api/v2/entries/en/{k}") as r:
            if r.status == 404:
                await db.dict_set(k, {"none": True}); return {"none": True}
            if r.status != 200:
                return None
            j = await r.json()
    except Exception:
        return None
    out = {"phonetic": "", "us": "", "uk": "", "defs": [], "syn": [], "ant": []}
    for e in j:
        out["phonetic"] = out["phonetic"] or e.get("phonetic", "")
        for p in e.get("phonetics", []):
            out["phonetic"] = out["phonetic"] or p.get("text", "")
            a = p.get("audio") or ""
            if a.endswith("-uk.mp3"): out["uk"] = out["uk"] or a
            elif a: out["us"] = out["us"] or a
        for m in e.get("meanings", []):
            out["syn"] += m.get("synonyms", []); out["ant"] += m.get("antonyms", [])
            for d in m.get("definitions", []):
                if len(out["defs"]) < 5:
                    out["defs"].append({"pos": m.get("partOfSpeech", ""), "def": d.get("definition", ""), "ex": d.get("example", "")})
                out["syn"] += d.get("synonyms", []); out["ant"] += d.get("antonyms", [])
    out["syn"] = list(dict.fromkeys(out["syn"]))[:10]; out["ant"] = list(dict.fromkeys(out["ant"]))[:8]
    await db.dict_set(k, out)
    return out


async def translate(word: str) -> str:
    try:
        s = await session()
        async with s.get("https://api.mymemory.translated.net/get", params={"langpair": "en|fa", "q": word}) as r:
            j = await r.json(content_type=None)
        return (j.get("responseData") or {}).get("translatedText", "") or ""
    except Exception:
        return ""


async def fetch_bytes(url: str) -> bytes | None:
    try:
        s = await session()
        async with s.get(url) as r:
            return await r.read() if r.status == 200 else None
    except Exception:
        return None
