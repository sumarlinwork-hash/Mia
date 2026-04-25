@echo off
echo ===================================================
echo Mematikan Sistem MIA dan Semua Child Process...
echo ===================================================
echo.

echo [1/4] Memeriksa dan mematikan proses latar belakang yang dijalankan MIA...
:: Menggunakan WMI untuk mencari proses python/node yang HANYA menjalankan script utama MIA
:: (mencegah salah sasaran pada proses IDE seperti Pylance atau extension)
wmic process where "CommandLine like '%%python%%mia%%main.py%%' and Name='python.exe'" call terminate >nul 2>&1
wmic process where "CommandLine like '%%node%%mia%%vite%%' and Name='node.exe'" call terminate >nul 2>&1


echo [2/4] Menutup Jendela Terminal Utama MIA (beserta process tree-nya)...
:: /T akan melakukan Tree Kill (mematikan aplikasi utama beserta semua aplikasi yang di-spawn olehnya)
taskkill /FI "WindowTitle eq MIA_BACKEND*" /T /F >nul 2>&1
taskkill /FI "WindowTitle eq MIA_FRONTEND*" /T /F >nul 2>&1

echo [3/4] Memeriksa dan membebaskan Port Backend (8000)...
for /f "tokens=5" %%a in ('netstat -aon ^| find ":8000" ^| find "LISTENING"') do (
    taskkill /F /PID %%a /T >nul 2>&1
)

echo [4/4] Memeriksa dan membebaskan Port Frontend (5173)...
for /f "tokens=5" %%a in ('netstat -aon ^| find ":5173" ^| find "LISTENING"') do (
    taskkill /F /PID %%a /T >nul 2>&1
)

echo.
echo ===================================================
echo Seluruh layanan MIA dan proses otomatisnya telah dibersihkan!
echo ===================================================
pause
