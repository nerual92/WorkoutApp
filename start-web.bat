@echo off
REM Add Node.js to PATH temporarily
set PATH=C:\Program Files\nodejs;%PATH%

REM Start web dev server
cd web
npm run dev
