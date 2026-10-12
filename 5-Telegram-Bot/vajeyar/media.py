"""Media: beautiful flashcard images (Pillow), statistics charts (matplotlib) and text-to-speech."""
import asyncio
import hashlib
import io
import logging
from functools import lru_cache
from PIL import Image, ImageDraw, ImageFilter, ImageFont
from .config import ROOT

log = logging.getLogger("vajeyar.media")
FONTS = ROOT / "assets" / "fonts"
W, H = 1200, 630
PURPLE = (139, 108, 246); PURPLE_D = (115, 80, 236); PURPLE_SOFT = (238, 232, 255)
YELLOW = (247, 201, 72); YELLOW_SOFT = (255, 243, 196); INK = (42, 36, 64); MUTED = (123, 117, 145)


@lru_cache(maxsize=32)
def font(weight, size):
    try:
        return ImageFont.truetype(str(FONTS / f"Poppins-{weight}.ttf"), size)
    except Exception:
        return ImageFont.load_default(size)


@lru_cache(maxsize=1)
def _background():
    img = Image.new("RGB", (W, H), PURPLE)
    px = img.load()
    a, b = (180, 156, 255), (106, 71, 230)
    for y in range(H):
        for x in range(0, W, 2):
            tt = (x / W * 0.65 + y / H * 0.35)
            c = tuple(int(a[i] + (b[i] - a[i]) * tt) for i in range(3))
            px[x, y] = c
            if x + 1 < W:
                px[x + 1, y] = c
    glow = Image.new("L", (W, H), 0)
    ImageDraw.Draw(glow).ellipse((W - 380, -300, W + 200, 240), fill=95)
    glow = glow.filter(ImageFilter.GaussianBlur(90))
    img.paste(Image.new("RGB", (W, H), (255, 240, 190)), (0, 0), glow)
    # card shadow + card
    sh = Image.new("L", (W, H), 0)
    ImageDraw.Draw(sh).rounded_rectangle((70, 78, W - 70, H - 46), 48, fill=120)
    sh = sh.filter(ImageFilter.GaussianBlur(26))
    img.paste(Image.new("RGB", (W, H), (60, 30, 140)), (0, 0), sh)
    ImageDraw.Draw(img).rounded_rectangle((60, 56, W - 60, H - 60), 46, fill=(255, 255, 255))
    return img


def _chip(d, x, y, text, bg, fg, f):
    tw = d.textlength(text, font=f)
    d.rounded_rectangle((x, y, x + tw + 36, y + 46), 23, fill=bg)
    d.text((x + 18, y + 23), text, font=f, fill=fg, anchor="lm")
    return x + tw + 36 + 12


def card_image(word: str, pos_en: str, tag: str, cat_label: str, mystery=False) -> bytes:
    img = _background().copy()
    d = ImageDraw.Draw(img)
    f_chip = font("SemiBold", 24)
    x = _chip(d, 104, 96, pos_en, PURPLE_SOFT, PURPLE_D, f_chip)
    if tag and tag != "—":
        x = _chip(d, x, 96, tag, YELLOW_SOFT, (150, 110, 0), f_chip)
    _chip(d, x, 96, cat_label, (243, 241, 248), MUTED, f_chip)
    # star accent
    d.ellipse((W - 150, 92, W - 104, 138), fill=YELLOW_SOFT)
    import math
    cx, cy, r1, r2 = W - 127, 115, 15, 6.5
    pts = [(cx + (r1 if i % 2 == 0 else r2) * math.sin(i * math.pi / 5), cy - (r1 if i % 2 == 0 else r2) * math.cos(i * math.pi / 5)) for i in range(10)]
    d.polygon(pts, fill=YELLOW)
    if mystery:
        d.text((W // 2, 315), "? ? ?", font=font("Bold", 120), fill=PURPLE, anchor="mm")
        d.text((W // 2, 420), "What's the English word?", font=font("Medium", 34), fill=MUTED, anchor="mm")
    else:
        size = 150
        while size > 54 and d.textlength(word, font=font("Bold", size)) > W - 260:
            size -= 6
        f = font("Bold", size)
        d.text((W // 2, 318), word, font=f, fill=INK, anchor="mm")
        bottom = d.textbbox((W // 2, 318), word, font=f, anchor="mm")[3]
        lw = min(220, d.textlength(word, font=f) * 0.5)
        d.rounded_rectangle((W // 2 - lw / 2, bottom + 22, W // 2 + lw / 2, bottom + 32), 5, fill=YELLOW)
    # brand
    d.rounded_rectangle((104, H - 128, 140, H - 92), 10, fill=PURPLE)
    d.text((122, H - 110), "V", font=font("Bold", 22), fill=(255, 255, 255), anchor="mm")
    d.text((152, H - 110), "VajeYar", font=font("SemiBold", 24), fill=MUTED, anchor="lm")
    out = io.BytesIO(); img.save(out, "PNG", optimize=True)
    return out.getvalue()


def stats_image(days14, forecast7, boxes, heat, kpis) -> bytes:
    import matplotlib
    matplotlib.use("Agg")
    import matplotlib.pyplot as plt
    from matplotlib.colors import LinearSegmentedColormap
    plt.rcParams["font.family"] = "DejaVu Sans"
    try:
        from matplotlib import font_manager
        for wgt in ("Medium", "SemiBold", "Bold"):
            font_manager.fontManager.addfont(str(FONTS / f"Poppins-{wgt}.ttf"))
        plt.rcParams["font.family"] = "Poppins"; plt.rcParams["font.weight"] = "medium"
    except Exception:
        pass
    p, y, ink, muted, soft = "#8B6CF6", "#F7C948", "#2A2440", "#7B7591", "#EEE8FF"
    fig = plt.figure(figsize=(12, 7.4), dpi=110, facecolor="#F8F6FF")
    gs = fig.add_gridspec(3, 4, height_ratios=[0.55, 1.25, 1.1], hspace=0.62, wspace=0.42, left=0.075, right=0.97, top=0.9, bottom=0.07)
    fig.text(0.05, 0.955, "VajeYar  ·  Statistics", fontsize=19, fontweight="bold", color=ink)
    for i, (val, lab) in enumerate(kpis[:4]):
        ax = fig.add_subplot(gs[0, i]); ax.axis("off")
        ax.add_patch(plt.Rectangle((0, 0), 1, 1, transform=ax.transAxes, color="white", ec="#E9E4F7", lw=1.2, clip_on=False))
        ax.text(0.08, 0.62, str(val), fontsize=21, fontweight="bold", color=p if i % 2 == 0 else "#C99A10", transform=ax.transAxes, va="center")
        ax.text(0.08, 0.24, lab, fontsize=10.5, color=muted, transform=ax.transAxes, va="center")

    def style(ax, title):
        ax.set_facecolor("white"); ax.set_title(title, loc="left", fontsize=12.5, fontweight="bold", color=ink, pad=8)
        for s in ax.spines.values(): s.set_visible(False)
        ax.tick_params(colors=muted, labelsize=8.5, length=0); ax.grid(axis="y", color="#F0EDF8", lw=1); ax.set_axisbelow(True)

    ax = fig.add_subplot(gs[1, :2]); style(ax, "Reviews · last 14 days")
    labels = [d[0] for d in days14]; vals = [d[1] for d in days14]
    ax.bar(range(14), vals, color=[p] * 13 + [y], width=0.62)
    ax.set_xticks(range(14)); ax.set_xticklabels(labels)
    ax = fig.add_subplot(gs[1, 2:]); style(ax, "Upcoming reviews · next 7 days")
    ax.bar(range(7), forecast7, color=[y] + [p] * 6, width=0.55)
    ax.set_xticks(range(7)); ax.set_xticklabels(["Today", "Tmrw", "+2", "+3", "+4", "+5", "+6"])
    ax = fig.add_subplot(gs[2, :2]); style(ax, "Memory boxes (Leitner)")
    names = ["Box 1", "Box 2", "Box 3", "Box 4", "Box 5", "Mastered"]
    ax.barh(range(6), boxes, color=[p] * 5 + [y], height=0.6); ax.set_yticks(range(6)); ax.set_yticklabels(names); ax.invert_yaxis(); ax.grid(axis="x", color="#F0EDF8")
    ax = fig.add_subplot(gs[2, 2:]); style(ax, "Study calendar · 18 weeks"); ax.grid(False)
    cmap = LinearSegmentedColormap.from_list("v", ["#F1EDFE", "#C9B8FF", p, "#6A47E6"])
    ax.imshow(heat, cmap=cmap, aspect="auto", vmin=0, vmax=max(4, max(max(r) for r in heat)))
    ax.set_yticks(range(7)); ax.set_yticklabels(["M", "", "W", "", "F", "", "S"]); ax.set_xticks([])
    buf = io.BytesIO(); fig.savefig(buf, format="png", facecolor=fig.get_facecolor()); plt.close(fig)
    return buf.getvalue()


# ---------- text to speech ----------
VOICES = {"en-US": "en-US-AriaNeural", "en-GB": "en-GB-SoniaNeural"}


def voice_key(text, accent, slow):
    return "v:" + hashlib.md5(f"{accent}|{slow}|{text}".encode()).hexdigest()


async def tts(text: str, accent="en-US", slow=False) -> bytes | None:
    try:
        import edge_tts
        com = edge_tts.Communicate(text, VOICES.get(accent, VOICES["en-US"]), rate="-30%" if slow else "-5%")
        buf = bytearray()
        async for chunk in com.stream():
            if chunk.get("type") == "audio":
                buf += chunk["data"]
        if buf:
            return bytes(buf)
    except Exception as e:
        log.info("edge-tts failed (%s), trying gTTS", e)
    try:
        from gtts import gTTS
        def _g():
            b = io.BytesIO(); gTTS(text, lang="en", tld="co.uk" if accent == "en-GB" else "com", slow=slow).write_to_fp(b); return b.getvalue()
        return await asyncio.to_thread(_g)
    except Exception as e:
        log.warning("TTS unavailable: %s", e)
        return None
