@echo off
echo ===================================================
echo MIA - Pemasangan Perangkat Lunak Dasar (Prerequisites)
echo ===================================================
echo.
echo Script ini akan menginstal alat-alat yang dibutuhkan:
echo 1. Python (Core Engine MIA)
echo 2. Node.js (Untuk UI Avatar/Web)
echo 3. Git (Untuk Version Control)
echo 4. Visual Studio Code (Code Editor)
echo.
echo Pastikan Anda terhubung ke internet.
pause

echo.
echo Menginstal Python 3.11...
winget install -e --id Python.Python.3.11 --accept-package-agreements --accept-source-agreements

echo.
echo Menginstal Node.js...
winget install -e --id OpenJS.NodeJS --accept-package-agreements --accept-source-agreements

echo.
echo Menginstal Git...
winget install -e --id Git.Git --accept-package-agreements --accept-source-agreements

echo.
echo Menginstal Visual Studio Code...
winget install -e --id Microsoft.VisualStudioCode --accept-package-agreements --accept-source-agreements

echo.
echo ===================================================
echo Instalasi Selesai!
echo Silakan RESTART PC Anda agar semua sistem mendeteksi aplikasi baru.
echo Setelah itu, buka kembali VS Code untuk melanjutkan proyek MIA.
echo ===================================================
pause
