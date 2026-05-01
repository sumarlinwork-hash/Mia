@echo off
setlocal EnableDelayedExpansion
echo ===================================================
echo [MIA TERMINATOR] Hard Kill Sequence Activated...
echo ===================================================
echo.

echo [1/3] Mematikan proses berdasarkan Port (Paling Akurat)...

:: Port 8000 (Backend)
echo - Membersihkan Port 8000 (Backend)...
for /f "tokens=5" %%a in ('netstat -aon ^| findstr ":8000" ^| findstr "LISTENING"') do (
    set PID=%%a
    if not "!PID!"=="" (
        echo   [FOUND] Killing PID !PID!...
        taskkill /F /PID !PID! /T >nul 2>&1
    )
)

:: Port 5173 (Frontend Vite)
echo - Membersihkan Port 5173 (Frontend)...
for /f "tokens=5" %%a in ('netstat -aon ^| findstr ":5173" ^| findstr "LISTENING"') do (
    set PID=%%a
    if not "!PID!"=="" (
        echo   [FOUND] Killing PID !PID!...
        taskkill /F /PID !PID! /T >nul 2>&1
    )
)

echo [2/3] Mematikan proses berdasarkan Nama (Defense in Depth)...
:: Mencari proses python yang mengandung kata "mia" di command line
wmic process where "CommandLine like '%%python%%mia%%' and Name='python.exe'" get ProcessID 2>nul | findstr [0-9] > pids.txt
for /f %%p in (pids.txt) do (
    echo   [WMIC] Killing Python Process %%p...
    taskkill /F /PID %%p /T >nul 2>&1
)
del pids.txt 2>nul

:: Mencari proses node/vite
wmic process where "CommandLine like '%%vite%%' and Name='node.exe'" get ProcessID 2>nul | findstr [0-9] > pids.txt
for /f %%p in (pids.txt) do (
    echo   [WMIC] Killing Node Process %%p...
    taskkill /F /PID %%p /T >nul 2>&1
)
del pids.txt 2>nul

echo [3/3] Menutup Jendela Terminal (Window Match)...
taskkill /FI "WindowTitle eq MIA_BACKEND*" /T /F >nul 2>&1
taskkill /FI "WindowTitle eq MIA_FRONTEND*" /T /F >nul 2>&1

echo.
echo ===================================================
echo [SUCCESS] Sistem MIA telah sepenuhnya dimatikan.
echo Port 8000 dan 5173 kini bebas.
echo ===================================================
pause
