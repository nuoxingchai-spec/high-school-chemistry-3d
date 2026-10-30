@echo off
cd /d "%~dp0"
chcp 65001 >nul
echo CHEM-PLANT - starting local server at http://localhost:8000
start "CHEM-PLANT server" python -m http.server 8000
timeout /t 2 /nobreak >nul
start "" http://localhost:8000/
