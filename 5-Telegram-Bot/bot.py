"""VajeYar Telegram bot — entry point.   Run:  python bot.py"""
import asyncio
import logging
import sys

from aiogram import Bot, Dispatcher
from aiogram.client.default import DefaultBotProperties
from aiogram.client.session.aiohttp import AiohttpSession
from aiogram.enums import ParseMode
from aiogram.types import BotCommand, BotCommandScopeDefault, MenuButtonWebApp, MenuButtonCommands, WebAppInfo

from vajeyar import config, db, online, scheduler, admin
from vajeyar.handlers import setup as setup_handlers
from vajeyar.texts import t
from vajeyar.words import WORDS

log = logging.getLogger("vajeyar")
COMMANDS = ["menu", "review", "learn", "quiz", "games", "dict", "words", "stats", "wotd", "settings", "help"]


async def configure_profile(bot: Bot):
    """Commands, descriptions and the menu button — in Persian and English."""
    for lang in ("fa", "en"):
        cmds = [BotCommand(command=c, description=t(lang, f"cmd_{c}")) for c in COMMANDS]
        kw = {} if lang == config.DEFAULT_LANG else {"language_code": lang}
        try:
            await bot.set_my_commands(cmds, scope=BotCommandScopeDefault(), **kw)
            await bot.set_my_description(t(lang, "bot_desc"), **kw)
            await bot.set_my_short_description(t(lang, "bot_short"), **kw)
        except Exception as e:
            log.warning("profile setup (%s) failed: %s", lang, e)
    try:
        if config.WEBAPP_URL:
            await bot.set_chat_menu_button(menu_button=MenuButtonWebApp(text="VajeYar", web_app=WebAppInfo(url=config.WEBAPP_URL)))
        else:
            await bot.set_chat_menu_button(menu_button=MenuButtonCommands())
    except Exception as e:
        log.warning("menu button setup failed: %s", e)


async def serve_webapp():
    """Optional: serve the Mini App (webapp/) over HTTP. Put it behind an HTTPS reverse proxy (Telegram requires HTTPS)."""
    from aiohttp import web
    root = config.ROOT / "webapp"
    app = web.Application()

    async def index(_):
        return web.FileResponse(root / "index.html")
    app.router.add_get("/", index)
    app.router.add_static("/", root, show_index=False)
    runner = web.AppRunner(app)
    await runner.setup()
    await web.TCPSite(runner, "0.0.0.0", config.WEBAPP_PORT).start()
    log.info("Mini App served on http://0.0.0.0:%s", config.WEBAPP_PORT)


async def main():
    logging.basicConfig(level=config.LOG_LEVEL, format="%(asctime)s  %(levelname)-7s %(name)s: %(message)s")
    if not config.BOT_TOKEN:
        sys.exit("❌ BOT_TOKEN is missing. Copy .env.example to .env and put your token from @BotFather in it.")
    await db.init()
    session = AiohttpSession(proxy=config.PROXY) if config.PROXY else AiohttpSession()
    bot = Bot(config.BOT_TOKEN, session=session,
              default=DefaultBotProperties(parse_mode=ParseMode.HTML, link_preview_is_disabled=True))
    dp = Dispatcher()
    dp.include_router(admin.router)
    dp.include_router(setup_handlers())
    me = await bot.get_me()
    log.info("Starting @%s · %d words loaded", me.username, len(WORDS))
    await configure_profile(bot)
    if config.SERVE_WEBAPP:
        await serve_webapp()
    jobs = asyncio.create_task(scheduler.run(bot))
    try:
        await bot.delete_webhook(drop_pending_updates=False)
        await dp.start_polling(bot, allowed_updates=dp.resolve_used_update_types())
    finally:
        jobs.cancel()
        await online.close()
        await db.close()
        await bot.session.close()


if __name__ == "__main__":
    try:
        asyncio.run(main())
    except (KeyboardInterrupt, SystemExit) as e:
        if isinstance(e, SystemExit) and e.code not in (None, 0):
            raise
