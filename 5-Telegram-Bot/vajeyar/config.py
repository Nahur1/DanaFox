"""Configuration loaded from environment variables (or a .env file)."""
import os
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent


def _load_env():
    f = ROOT / ".env"
    if not f.exists():
        return
    for line in f.read_text(encoding="utf-8").splitlines():
        line = line.strip()
        if not line or line.startswith("#") or "=" not in line:
            continue
        k, v = line.split("=", 1)
        os.environ.setdefault(k.strip(), v.strip().strip('"').strip("'"))


_load_env()

BOT_TOKEN = os.getenv("BOT_TOKEN", "")
WEBAPP_URL = os.getenv("WEBAPP_URL", "").strip()          # HTTPS URL of the Mini App (optional)
DB_PATH = os.getenv("DB_PATH", str(ROOT / "vajeyar.db"))
DEFAULT_TZ = os.getenv("DEFAULT_TZ", "Asia/Tehran")
DEFAULT_LANG = os.getenv("DEFAULT_LANG", "fa")
ADMIN_IDS = {int(x) for x in os.getenv("ADMIN_IDS", "").replace(" ", "").split(",") if x.isdigit()}
PROXY = os.getenv("PROXY", "").strip() or None             # e.g. socks5://127.0.0.1:1080 or http://host:port
SERVE_WEBAPP = os.getenv("SERVE_WEBAPP", "false").lower() in ("1", "true", "yes")
WEBAPP_PORT = int(os.getenv("WEBAPP_PORT", "8080"))
USE_EFFECTS = os.getenv("USE_EFFECTS", "true").lower() in ("1", "true", "yes")
LOG_LEVEL = os.getenv("LOG_LEVEL", "INFO")
