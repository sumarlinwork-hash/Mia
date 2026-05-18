# MIA STUDIO EXECUTION CONTRACT (V1.3)
TYPE: ARCHITECTURAL LAW (NON-NEGOTIABLE)
STATUS: APPROVED (REVISED FOR SLEEK CODEX & LOCAL IDE PARADIGM)
SCOPE: StudioExecutionService, StudioFileService, StudioIDEDiscoveryService, StudioGitGuard

---

## 1. LOCAL IDE DISCOVERY & LAUNCHER SAFETY (THE "BRIDGE" RULE)

### 1.1 Discovery Scanner Sanitization
- **Windows Registry Guard:** Layanan `StudioIDEDiscoveryService` diperbolehkan memindai registry Windows (`HKCU\Software\Microsoft\Windows\CurrentVersion\Uninstall` atau `HKLM`) untuk mencari direktori instalasi IDE (VS Code, Cursor, Trae, Qoder, Codex, IntelliJ).
- **Explicit Executable Whitelisting:** Hanya eksekutor IDE resmi yang didaftarkan pada whitelist yang boleh diluncurkan. Dilarang memproses argumen eksternal yang tidak dikenal untuk menangkal eksekusi kode berbahaya (*command injection*).
- **Isolated Launching:** Pemanggilan perintah OS untuk membuka IDE wajib menggunakan `subprocess.Popen` tanpa argumen shell tambahan (`shell=False`) dan diarahkan secara mutlak ke folder root proyek menggunakan `StudioFileService._get_project_root()`.

---

## 2. SANDBOX ISOLATION & RUNTIME LIMITS (THE "NO ESCAPE" RULE)

### 2.1 Execution Registry & UUID
- **Execution ID:** Setiap tugas latar belakang atau perintah `RUN` wajib dialokasikan `execution_id` (UUID) yang mengikat log, visualisasi graph, dan metadata subproses.
- **ProcessRegistry:** Semua PID aktif wajib terdaftar secara transparan dalam registry asinkron dengan pembersihan otomatis (*orphan process cleaner*) secara berkala.

### 2.2 Strict Limits & Timeout
- **Hard Timeout:** Batas maksimal eksekusi adalah 25 detik. Jika terlampaui, lakukan terminasi bertahap (1 detik) kemudian eksekusi paksa menggunakan **HARD KILL (SIGKILL / TaskKill)**.
- **Memory Watchdog:** Limitasi penggunaan RAM adalah 256MB per proses. Watchdog thread wajib memeriksa konsumsi memori setiap 200ms. Jika terlampaui, bunuh proses seketika.

---

## 3. FILE ACCESS GUARD & AUTO-SAVE INTEGRITY (THE "PROXY" RULE)

### 3.1 Proxy-Only Workspace Modification
- **No Direct Mutation:** Dilarang menggunakan panggilan sistem langsung dari sandbox untuk mengubah file di luar direktori proyek. Semua operasi tulis dan baca wajib melewati `StudioFileService`.
- **Path Normalization:** Validasi jalur absolut (`os.path.abspath()`) dan perbandingan awalan folder (`real_path.startswith(ALLOWED_ROOT)`) wajib ditegakkan untuk memblokir traversal `../` atau symbolic link escape.

### 3.2 Auto-Save Execution Law
- **Atomic Writing:** Setiap penulisan kode asinkron oleh MIA wajib menggunakan taktik: `Write to Temp` -> `Validate Syntax` -> `Atomic Rename`. Hal ini untuk menjamin berkas proyek tidak korup di Windows jika proses terputus.
- **Auto-Save Status Sync:** Ketika Auto-Save aktif, berkas tertulis harus segera mengirimkan sinyal `"project_updated"` melalui WebSocket ke frontend agar status repositori disinkronkan.

---

## 4. GIT GUARD & VERSION SAFETY (THE "SAFE HARBOR" RULE)

### 4.1 Git Branch & Status Tracking
- **Command Sanitization:** Akses ke Git lokal wajib menggunakan pembungkus CLI aman (seperti pustaka `GitPython` atau `subprocess` terisolasi tanpa `shell=True`). Dilarang keras meneruskan string mentah dari input pengguna ke dalam shell Git.
- **Active Branch & Index Monitoring:** Sistem wajib mendeteksi status repositori secara pasif (tidak merusak isi berkas) untuk mengekstrak nama branch aktif dan jumlah berkas yang dimodifikasi.

### 4.2 Snapshot & Safe Deploy Commit
- **Auto-Commit Staging:** Sebelum MIA melakukan pembaruan kode besar (*deploying changes*), sistem wajib menyarankan pembuatan Git Commit sementara atau mencatat riwayat perubahan agar Bos dapat dengan mudah melakukan `git checkout` atau memeriksa perbandingan versi (*diff*) di IDE lokal.

---

## 5. REVISED START BUILD ORDER (PHASED EXECUTION)

Untuk menjamin kedisiplinan pembangunan, urutan pembuatan modul wajib mengikuti bagan berikut:

```mermaid
graph TD
    A["1. StudioIDEDiscoveryService (Registry Scan & IDE Whitelist)"] --> B["2. StudioGitGuard (Safe Branch & Index Tracking)"]
    B --> C["3. StudioFileService (Auto-Save Sync & Path Guard)"]
    C --> D["4. StudioExecutionService (Sandbox Subprocess & Registry)"]
    D --> E["5. StudioPage & GardenLauncher UI (Pure Cockpit Split-Screen)"]
```

---

## 6. ERROR STANDARDS & NORMALIZATION
Semua galat (error) di dalam sistem Studio wajib dinormalisasi secara baku mengikuti pola:
`STUDIO_ERROR::<TYPE>::<MESSAGE>`

Contoh normalisasi error:
- `STUDIO_ERROR::IDE_NOT_FOUND::Selected local IDE is not installed`
- `STUDIO_ERROR::GIT_FAIL::Failed to parse active git branch`
- `STUDIO_ERROR::TIMEOUT::Sandbox execution exceeded 25s limit`

---

### FINAL APPROVAL UNTUK HAL DI ATAS — MIA STUDIO EXECUTION CONTRACT v1.3
**STATUS:** FULLY APPROVED — PROCEED TO BUILD WITH PARADIGM SHIFT

Hukum arsitektur ini mengunci kedisiplinan kita agar tidak membuat komponen redundan, melainkan fokus membangun jembatan lokal yang super aman, kencang, dan terintegrasi dengan Git. Lanjutkan pembangunan dengan disiplin besi!
