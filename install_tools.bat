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
if exist ".venv\Scripts\activate.bat" (
    echo Mengaktifkan Lingkungan Virtual...
    call .venv\Scripts\activate
    
    set "SKIP_PIP=0"
    if exist ".venv\.last_install" (
        powershell -Command "$req = Get-Item 'requirements.txt'; $last = Get-Item '.venv\.last_install'; if ($req.LastWriteTime -le $last.LastWriteTime) { exit 0 } else { exit 1 }" >nul 2>&1
        if !errorlevel! == 0 set "SKIP_PIP=1"
    )

    if "!SKIP_PIP!" == "1" (
        echo [SMART] requirements.txt tidak berubah sejak instalasi terakhir. Melewati...
    ) else (
        echo Mengupdate pip ke versi terbaru...
        python -m pip install --upgrade pip --quiet
        
        if exist "requirements.txt" (
            echo Memasang paket dari requirements.txt (Ini mungkin butuh waktu)...
            pip install -r requirements.txt --progress-bar off
            if !errorlevel! == 0 (
                echo. > ".venv\.last_install"
                echo [SUCCESS] Dependensi berhasil dipasang/diperbarui.
            )
        ) else (
            echo [WARNING] requirements.txt tidak ditemukan!
        )
    )
) else (
    echo [ERROR] .venv tidak ditemukan. Pastikan Python terpasang dan ulangi script ini.
)

echo.
echo [STEP 4/4] Menginstal Dependensi Frontend (npm)...
if exist "frontend\package.json" (
    cd frontend
    
    set "SKIP_NPM=0"
    if exist "node_modules\.last_install" (
        powershell -Command "$pkg = Get-Item 'package.json'; $last = Get-Item 'node_modules\.last_install'; if ($pkg.LastWriteTime -le $last.LastWriteTime) { exit 0 } else { exit 1 }" >nul 2>&1
        if !errorlevel! == 0 set "SKIP_NPM=1"
    )

    if "!SKIP_NPM!" == "1" (
        echo [SMART] package.json tidak berubah. Melewati npm install...
    ) else (
        echo Menjalankan npm install di folder frontend...
        call npm install --no-audit --no-fund
        if !errorlevel! == 0 echo. > "node_modules\.last_install"
    )
    cd ..
) else (
    echo [SKIP] Folder frontend atau package.json tidak ditemukan.
)

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
