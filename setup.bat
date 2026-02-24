@echo off
REM Add Node.js to PATH temporarily
set PATH=C:\Program Files\nodejs;%PATH%

REM Install dependencies for all packages
npm install

echo.
echo Dependencies installed!
echo.
echo To start the web app, run: start-web.bat
echo To start the mobile app, run: start-mobile.bat
pause
