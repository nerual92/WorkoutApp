@echo off
REM Add Node.js to PATH temporarily
set PATH=C:\Program Files\nodejs;%PATH%

REM Run the CDNJS command
npm %*
