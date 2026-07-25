@echo off
chcp 65001 >nul
cd /d "%~dp0"
py manage.py build
if errorlevel 1 python manage.py build
pause
