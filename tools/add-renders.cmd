@echo off
rem Double-click to process renders/ into the site. Add "-Push" to also publish.
powershell -NoProfile -ExecutionPolicy Bypass -File "%~dp0add-renders.ps1" %*
pause
