@echo off
setlocal enabledelayedexpansion

echo ===================================================
echo MIA - INTEGRATED INSTALLER ^& ENVIRONMENT SETUP
echo ===================================================
echo.
echo Script ini akan memastikan semua perangkat lunak dan 
echo dependensi MIA terpasang dengan benar.
echo.
echo 1. Software Dasar (Python, Node, Git, VS Code)
echo 2. Python Virtual Environment (.venv)
echo 3. Dependensi Backend (requirements.txt)
echo 4. Dependensi Frontend (npm install)
echo.
echo Pastikan Anda memiliki koneksi internet yang stabil.
pause

echo.
echo [STEP 1/4] Memeriksa Software Dasar...

:: Function to check if command exists
where python >nul 2>nul
if %errorlevel% neq 0 (
    echo Menginstal Python 3.11...
    winget install -e --id Python.Python.3.11 --accept-package-agreements --accept-source-agreements
    echo [PENTING] Python baru saja dipasang. Jika langkah selanjutnya gagal, silakan restart script ini.
) else (
    echo Python sudah terpasang.
)

where node >nul 2>nul
if %errorlevel% neq 0 (
    echo Menginstal Node.js...
    winget install -e --id OpenJS.NodeJS --accept-package-agreements --accept-source-agreements
) else (
    echo Node.js sudah terpasang.
)

where git >nul 2>nul
if %errorlevel% neq 0 (
    echo Menginstal Git...
    winget install -e --id Git.Git --accept-package-agreements --accept-source-agreements
) else (
    echo Git sudah terpasang.
)

where code >nul 2>nul
if %errorlevel% neq 0 (
    echo Menginstal Visual Studio Code...
    winget install -e --id Microsoft.VisualStudioCode --accept-package-agreements --accept-source-agreements
) else (
    echo VS Code sudah terpasang.
)

echo.
echo [STEP 2/4] Menyiapkan Virtual Environment...
if not exist ".venv" (
    echo Membuat .venv baru...
    python -m venv .venv
    if %errorlevel% neq 0 (
        echo [ERROR] Gagal membuat .venv. Pastikan Python terpasang dengan benar.
        goto :end
    )
) else (
    echo .venv sudah tersedia.
)

echo.
echo [STEP 3/4] Menginstal Dependensi Python (requirements.txt)...
if not exist ".venv\Scripts\activate.bat" (
    echo [ERROR] .venv tidak ditemukan. Pastikan Python terpasang dan ulangi script ini.
    goto :end
)

echo Mengaktifkan Lingkungan Virtual...
call .venv\Scripts\activate.bat
echo Mengupdate pip ke versi terbaru...
python -m pip install --upgrade pip --quiet
echo Memasang paket dari requirements.txt (Ini mungkin butuh waktu)...
pip install -r requirements.txt
echo [SUCCESS] Dependensi berhasil dipasang/diperbarui.

echo.
echo [STEP 4/4] Menginstal Dependensi Frontend (npm)...
if not exist "frontend\package.json" (
    echo [WARNING] frontend/package.json tidak ditemukan!
    goto :end
)

cd frontend
echo Menjalankan npm install di folder frontend...
call npm install --no-audit --no-fund
echo [SUCCESS] Frontend dependencies dipasang.
cd ..

echo.
echo [FINAL STEP] Memeriksa Konfigurasi Lingkungan (.env)...
if not exist ".env" (
    echo [WARNING] File .env tidak ditemukan!
    echo Menciptakan .env dari template...
    echo OPENAI_API_KEY=your_key_here > .env
    echo GOOGLE_API_KEY=your_key_here >> .env
    echo GROQ_API_KEY=your_key_here >> .env
    echo [INFO] Silakan isi kunci API Anda di file .env agar fitur Discovery ^& Preview berfungsi.
) else (
    echo File .env sudah tersedia. Pastikan kunci API Anda valid.
)

:end
echo.
echo ===================================================
echo KONFIGURASI SELESAI!
echo ===================================================
echo Tips:
echo - Jika ada error "Command not found", silakan RESTART PC Anda.
echo - Gunakan 'run_check_all.bat' untuk memverifikasi integritas sistem.
echo - Jalankan 'start_mia.bat' untuk menghidupkan MIA.
echo ===================================================
pause
