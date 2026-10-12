from aiogram import Router
from .common import UserMiddleware
from . import core, study, mywords, play, inline, input as input_


def setup() -> Router:
    root = Router(name="vajeyar")
    mw = UserMiddleware()
    root.message.outer_middleware(mw)
    root.callback_query.outer_middleware(mw)
    for r in (core.router, study.router, mywords.router, play.router, inline.router, input_.router):
        root.include_router(r)
    return root
