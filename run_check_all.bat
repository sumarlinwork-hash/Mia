@echo off
setlocal enabledelayedexpansion

echo ===================================================
echo    MIA FLAGSHIP - DEEP SYSTEM INTEGRITY CHECK
echo ===================================================
echo.

set "GLOBAL_ERROR=0"

:: 1. Backend Audit
echo [1/5] MENGUJI INTEGRITAS OTAK (BACKEND)...
set "PYTHON_CMD=python"
if exist ".venv\Scripts\python.exe" (
    set "PYTHON_CMD=.venv\Scripts\python.exe"
)

:: Syntax Check
!PYTHON_CMD! -m compileall backend > nul 2>&1
if !errorlevel! neq 0 (
    echo [FAIL] Terdeteksi kesalahan sintaksis pada Backend!
    !PYTHON_CMD! -m compileall backend
    set "GLOBAL_ERROR=1"
) else (
    echo [SUCCESS] Sintaksis Backend Bersih.
)

:: Dependency Runtime Check
echo [INFO] Memverifikasi dependensi runtime...
!PYTHON_CMD! -c "import sys; sys.path.append('backend'); import main" > nul 2>&1
if !errorlevel! neq 0 (
    echo [FAIL] Gagal memuat dependensi Backend! Pastikan 'install_tools.bat' sudah dijalankan.
    set "GLOBAL_ERROR=1"
) else (
    echo [SUCCESS] Dependensi Backend Terverifikasi.
)
echo.

:: 2. API Connectivity Check (If running)
echo [2/5] MENGUJI KONEKTIVITAS API...
powershell -Command "$r = Invoke-WebRequest -Uri http://localhost:8000/api/config -UseBasicParsing -TimeoutSec 2; exit 0" > nul 2>&1
if %errorlevel% neq 0 (
    echo [WARN] Backend tidak merespon di port 8000. (Abaikan jika MIA memang belum dijalankan)
) else (
    echo [SUCCESS] API Backend merespon dengan baik.
)
echo.

:: 3. Frontend Integrity & Build Audit
echo [3/5] MENGUJI INTEGRITAS ^& BUNDLING (FRONTEND)...

:: Check Critical Files
if not exist "frontend\index.html" ( echo [FAIL] index.html hilang!; set "GLOBAL_ERROR=1" )
if not exist "frontend\src\main.tsx" ( echo [FAIL] main.tsx hilang!; set "GLOBAL_ERROR=1" )
if not exist "frontend\node_modules" ( echo [FAIL] node_modules hilang! Jalankan install_tools.bat; set "GLOBAL_ERROR=1" )

cd frontend
echo [INFO] Menjalankan Type-Check (TSC)...
:: Menggunakan node langsung untuk menghindari isu PowerShell
node node_modules\typescript\bin\tsc --noEmit
if !errorlevel! neq 0 (
    echo [FAIL] Terdeteksi ketidaksinkronan tipe data di Frontend!
    set "GLOBAL_ERROR=1"
) else (
    echo [SUCCESS] Tipe Data Frontend Sinkron.
)

echo [INFO] Menjalankan Build Simulation (Vite)...
:: Menggunakan node langsung untuk menghindari isu PowerShell
node node_modules\vite\bin\vite.js build > nul 2>&1
if !errorlevel! neq 0 (
    echo [FAIL] Bundling Gagal! Terdeteksi kesalahan runtime/import.
    echo [HINT] Jalankan 'npm run build' secara manual untuk melihat detail error.
    set "GLOBAL_ERROR=1"
) else (
    echo [SUCCESS] Bundling Frontend Berhasil.
)
cd ..
echo.

:: 4. Lint Audit
echo [4/5] MENGUJI KUALITAS KODE (LINT)...
cd frontend
call npm run lint
if !errorlevel! neq 0 (
    echo [FAIL] Terdeteksi pelanggaran standar kode di Frontend!
    set "GLOBAL_ERROR=1"
) else (
    echo [SUCCESS] Kualitas Kode Frontend Optimal.
)
cd ..
echo.

:: 5. Environment Audit
echo [5/5] MENGUJI KONFIGURASI LINGKUNGAN (ENV)...
if not exist ".env" (
    if exist ".env.example" (
        echo [WARN] .env tidak ditemukan. Menggunakan .env.example sebagai template...
        copy .env.example .env > nul
    ) else (
        echo [FAIL] .env dan .env.example tidak ditemukan!
        set "GLOBAL_ERROR=1"
    )
) else (
    echo [SUCCESS] File Konfigurasi .env Tersedia.
)
echo.

echo ===================================================
if !GLOBAL_ERROR! == 0 (
    echo [RESULT] STATUS: SEHAT - 100 PERCENT ERROR-FREE
    echo Semua sistem siap untuk dijalankan.
) else (
    echo [RESULT] STATUS: BUTUH PERHATIAN
    echo Silakan periksa detail error di atas sebelum menjalankan MIA.
)
echo ===================================================
echo.

pause
