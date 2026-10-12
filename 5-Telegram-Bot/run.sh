#!/usr/bin/env bash
# One-command start on Linux / macOS: creates a virtualenv, installs dependencies and runs the bot.
set -e
cd "$(dirname "$0")"
[ -f .env ] || { cp .env.example .env; echo "➡  Put your BOT_TOKEN in .env and run again."; exit 1; }
[ -d .venv ] || python3 -m venv .venv
. .venv/bin/activate
pip install -q -r requirements.txt
exec python bot.py
