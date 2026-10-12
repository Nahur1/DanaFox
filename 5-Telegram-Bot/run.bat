@echo off
REM One-click start on Windows: creates a virtualenv, installs dependencies and runs the bot.
cd /d "%~dp0"
if not exist .env (copy .env.example .env >nul & echo Put your BOT_TOKEN in .env and run again. & pause & exit /b)
if not exist .venv (py -3 -m venv .venv || python -m venv .venv)
call .venv\Scripts\activate.bat
pip install -q -r requirements.txt
python bot.py
pause
