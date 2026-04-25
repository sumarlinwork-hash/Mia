@echo off
setlocal enabledelayedexpansion

echo ===================================================
echo   MIA FLAGSHIP - INTELLIGENT STARTUP ENGINE
echo ===================================================
echo.

:: 1. Check Port Availability
echo [1/4] Memvalidasi Jalur Komunikasi (Ports)
netstat -ano | findstr :8000 > nul
if !errorlevel! == 0 (
    echo [WARNING] Port 8000 - Backend terdeteksi sedang digunakan
    for /f "tokens=5" %%a in ('netstat -aon ^| findstr :8000') do taskkill /f /pid %%a > nul 2>&1
)

netstat -ano | findstr :5173 > nul
if !errorlevel! == 0 (
    echo [WARNING] Port 5173 - Frontend terdeteksi sedang digunakan
    for /f "tokens=5" %%a in ('netstat -aon ^| findstr :5173') do taskkill /f /pid %%a > nul 2>&1
)
echo Jalur Komunikasi SIAP
echo.

:: 2. Smart Dependency Check
echo [2/4] Memeriksa Integritas Dependensi
if not exist "frontend\node_modules\" (
    echo [INFO] Menginstal dependensi frontend
    cd frontend && call npm install && cd ..
) else (
    echo Dependensi Frontend OK
)

.venv\Scripts\python --version > nul 2>&1
if !errorlevel! neq 0 (
    echo [ERROR] Membuat Lingkungan Virtual
    python -m venv .venv
    .venv\Scripts\python -m pip install -r requirements.txt
)
echo Lingkungan Virtual OK
echo.

:: 3. Start Backend
echo [3/4] Mengaktifkan Otak MIA (Backend)
start "MIA_BACKEND" /min cmd /c "cd backend && ..\.venv\Scripts\python main.py"

:: 4. Wait for Backend
echo [4/4] Menunggu Sinkronisasi Otak
set "max_retries=15"
set "count=0"
:wait_loop
set /a count+=1
if !count! gtr !max_retries! (
    echo [ERROR] Otak MIA gagal merespon
    pause
    exit /b
)
:: Use ping for delay (more robust than timeout in some environments)
ping 127.0.0.1 -n 3 > nul
powershell -Command "try { $r = Invoke-WebRequest -Uri http://localhost:8000/api/config -UseBasicParsing; exit 0 } catch { exit 1 }" > nul 2>&1
if !errorlevel! neq 0 (
    echo Menunggu Backend - Percobaan !count! / !max_retries!
    goto wait_loop
)

echo.
echo ===================================================
echo    MIA ONLINE - SISTEM SIAP DIGUNAKAN
echo ===================================================
echo.
echo Memulai Antarmuka Visual (Web Hub)
start "MIA_FRONTEND" cmd /c "cd frontend && npm run dev"

echo Menunggu Web Hub siap
ping 127.0.0.1 -n 6 > nul
start http://localhost:5173

echo.
echo [INFO] Semua sistem telah aktif
exit
