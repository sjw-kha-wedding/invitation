@echo off
chcp 65001 >nul
cd /d "%~dp0"
py manage.py preview
if errorlevel 1 python manage.py preview
pause
