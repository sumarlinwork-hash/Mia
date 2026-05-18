# MIA ARCHITECT STUDIO (MIA-AS) — MASTER PLAN V1.0
## PANDUAN UTAMA PEMBANGUNAN (SINGLE SOURCE OF TRUTH - SSOT)
**PARADIGMA:** Sleek Codex Cockpit + Local IDE Discovery + Git Workspace Guard

Master Plan ini disusun sebagai cetak biru komprehensif dari awal hingga akhir untuk membangun **MIA Architect Studio (MIA-AS)** menjadi antarmuka pengembangan kelas flagship (*Flagship-Grade Developer Cockpit*) yang sangat aman, responsif, dan terintegrasi penuh ke lingkungan lokal.

---

## 🗺️ PENDAHULUAN & FILOSOFI DESAIN

MIA-AS tidak berupaya meniru IDE browser yang berat dan lambat. Sebaliknya, Studio ini bertindak sebagai **"Otak dan Pusat Orkestrasi Asisten"** yang beroperasi selaras di samping editor desktop tangguh Bos (Trae, Cursor, VS Code, dll).

```
+-------------------------------------------------------------------+
|                           STUDIO COCKPIT                          |
|  +-----------------------------------+  +----------------------+  |
|  |                                   |  |     GRAPH VIEWER     |  |
|  |         INTERACTIVE PROMPT        |  |  (MIA's Thought Map) |  |
|  |           & CHAT WINDOW           |  |                      |  |
|  |                                   |  +----------------------+  |
|  |                                   |  |  RESILIENCE MONITOR  |  |
|  |                                   |  |      (SHAD-CSA)      |  |
|  +-----------------------------------+  +----------------------+  |
|  |          STUDIO TERMINAL          |  |     IDE LINK CARD    |  |
|  +-----------------------------------+  +----------------------+  |
+-------------------------------------------------------------------+
                                  ^
                                  | WebSocket Sync (Auto-Save Signal)
                                  v
+-------------------------------------------------------------------+
|                        LOCAL MACHINE DISK                         |
|   +-----------------------+           +-----------------------+   |
|   |    LOCAL IDE ACTIVE   | <-------> |    LOCAL GIT REPO     |   |
|   | (Trae, Cursor, VSC)   | CTRL+S    | (Branch & Dirty State)|   |
|   +-----------------------+           +-----------------------+   |
+-------------------------------------------------------------------+
```

---

## 🛠️ REKAYASA INFRASTRUKTUR BACKEND

### 1. StudioIDEDiscoveryService (Jembatan IDE Lokal)
*   **Tujuan:** Mendeteksi secara dinamis seluruh instalasi IDE modern pada komputer Windows Bos.
*   **Logika Pemindaian Registry (Windows Registry Scan):**
    Sistem akan memindai registry secara asinkron pada path berikut:
    - `HKCU\Software\Microsoft\Windows\CurrentVersion\Uninstall`
    - `HKLM\Software\Microsoft\Windows\CurrentVersion\Uninstall`
    - Memeriksa variabel lingkungan `PATH` untuk perintah CLI (`code`, `cursor`, `trae`).
*   **Whitelisting IDE Resmi:**
    Sistem hanya mendeteksi dan mengizinkan IDE berikut untuk mencegah Command Injection:
    1.  **Trae:** `trae` (Path: `%USERPROFILE%\AppData\Local\Programs\Trae`)
    2.  **Cursor:** `cursor` (Path: `%USERPROFILE%\AppData\Local\Programs\cursor`)
    3.  **VS Code:** `code` (Path: `%USERPROFILE%\AppData\Local\Programs\Microsoft VS Code`)
    4.  **Qoder:** `qoder`
    5.  **Codex:** `codex`
    6.  **IntelliJ IDEA:** `idea`
*   **Spesifikasi API:**
    *   `GET /api/studio/ide/list` $\rightarrow$ Mengembalikan array `{ id: string, name: string, path: string }`.
    *   `POST /api/studio/ide/open` $\rightarrow$ Menerima `{ project_id: string, ide_command: string }`. Menjalankan `subprocess.Popen` secara terisolasi tanpa shell (`shell=False`) untuk membuka folder proyek di IDE terpilih.

### 2. StudioGitGuard (Pengawal Versi & Integritas)
*   **Tujuan:** Memantau status repositori Git lokal proyek secara pasif tanpa mengunci I/O disk.
*   **Ekstraksi Status Git:**
    Menggunakan perintah CLI aman secara internal:
    - Melacak branch: `git branch --show-current`
    - Melacak dirty files: `git status --porcelain` (dihitung jumlah barisnya untuk mendapatkan *dirty count*).
*   **Keamanan Eksekusi:**
    Setiap pemanggilan perintah Git dikunci menggunakan argumen terpisah untuk menangkal bahaya manipulasi string dari luar.

### 3. StudioFileService & Auto-Save Engine
*   **Tujuan:** Menulis kode yang dihasilkan MIA langsung ke disk secara instan dan aman.
*   **Kontrol Auto-Save (Stateful):**
    Status Auto-Save (Aktif/Mati) disimpan di dalam `session_manager.py` per sesi proyek.
*   **Teknik Atomic Writing:**
    Untuk mencegah kerusakan file saat komputer drop atau proses terputus:
    1.  Tulis kode baru ke berkas temporer: `exec_[uuid].tmp`
    2.  Validasi sintaksis skrip secara asinkron (`python -m py_compile`).
    3.  Lakukan penggantian nama file secara atomik di OS: `os.replace()`.
*   **WebSocket Broadcast:**
    Setelah file berhasil ditulis, kirimkan sinyal `"project_updated"` ke frontend `/studio` untuk memicu pembaruan antarmuka secara instan.

### 4. StudioExecutionService (Sandbox Terisolasi)
*   Mengelola eksekusi latar belakang dengan batasan keras:
    - **Timeout:** Maksimal 25 detik menggunakan pembatalan subprocess.
    - **Memori Watchdog:** Membatasi penggunaan RAM maksimal 256MB dengan interval monitoring 200ms via `psutil`.

---

## 🎨 STRUKTUR UI FRONTEND (ESTETIKA FLAGSHIP)

Untuk memberikan kesan premium yang memukau pengembang saat pertama kali melihatnya, antarmuka `/studio` mengadopsi standar visual berikut:
*   **Harmoni Obsidian & Neon Glow:** Latar belakang bertema gelap murni obsidian (`#0a0a0a`) dipadukan dengan aksen neon cemerlang HSL Tailored Cyan (`#00E5FF`) dan mikro-glow ambient pada tombol aktif.
*   **Monospace Typography:** Menggunakan Google Fonts *Outfit* untuk teks UI dan *Fira Code / JetBrains Mono* untuk terminal dan log alur berpikir.
*   **Transisi 60 FPS:** Efek hover mikro-animasi pada setiap tombol kontrol untuk memberikan kesan antarmuka yang hidup dan responsif.

---

## 🏁 MASTER IMPLEMENTATION PHASES (FASE PEMBANGUNAN)

### FASE 1: IDE Discovery & Launcher Droptop (Fondasi Konektivitas)
*   **Pekerjaan Backend:**
    *   Membangun file `backend/studio/ide_discovery_service.py`.
    *   Membuat modul pemindai Windows Registry dan memetakan letak eksekusi Trae, Cursor, VS Code, dll.
    *   Mendaftarkan API endpoint `GET /api/studio/ide/list` dan `POST /api/studio/ide/open`.
*   **Pekerjaan Frontend:**
    *   Membangun Dropdown IDE Selector di Topbar `StudioPage.tsx` yang secara otomatis memanggil API list saat halaman dimuat.
    *   Menghubungkan aksi klik menu dropdown ke API launcher untuk membuka editor desktop Bos dalam sekali klik.
*   **Uji Validasi:** Membuka `/studio`, memilih "Cursor" atau "Trae" dari dropdown, mengklik tombol, dan memastikan editor di komputer lokal Bos terbuka secara instan pada folder proyek.

### FASE 2: Git Workspace Guard & Auto-Save Configuration (Keamanan Proyek)
*   **Pekerjaan Backend:**
    *   Membuat file `backend/studio/git_guard.py` untuk membaca branch aktif dan file termodifikasi secara aman.
    *   Menambahkan flag `auto_save: bool` di model status sesi.
    *   Mengintegrasikan sinyal WebSocket `"project_updated"` pada `StudioFileService` setiap kali ada perubahan file sukses.
*   **Pekerjaan Frontend:**
    *   Mengintegrasikan Git Status Bar di Topbar `/studio` untuk menampilkan Branch Aktif dan indikator Dirty State.
    *   Membuat Toggle Sakelar "Auto-Save" di bilah menu Workspace.
    *   Menghubungkan kolom prompt Chat kiri ke simulasi pemrosesan MIA yang memicu auto-save ke disk.
*   **Uji Validasi:** Melakukan perubahan file di luar `/studio`, menekan `CTRL+S` di VS Code, dan memastikan status Dirty State di Topbar `/studio` ter-refresh otomatis.

### FASE 3: Docker-Isolated Subprocess Execution (Isolasi Sandboxing)
*   **Pekerjaan Backend:**
    *   Membuat lingkungan Docker container ringan (`Dockerfile.executor`).
    *   Memodifikasi `StudioExecutionService` agar ketika diperintahkan `RUN`, proses dialihkan ke dalam container terisolasi, bukan langsung ke OS host lokal.
*   **Uji Validasi:** Menjalankan perintah eksekusi kode tak aman di terminal, memastikan sistem menolaknya atau mengisolasinya dengan aman tanpa mengganggu sistem utama.

### FASE 4: Real-time Terminal Log WebSocket Streaming
*   **Pekerjaan Backend & Frontend:**
    *   Membangun jembatan streaming log keluaran terminal dari sandbox ke browser via WebSocket.
    *   Memasang pembatas ukuran buffer log (maksimal 2MB) untuk mencegah kelambatan rendering di frontend.
*   **Uji Validasi:** Menjalankan program cetak angka `1-1000` di latar belakang, memastikan log mengalir mulus tanpa lag di panel bawah `StudioTerminal`.

### FASE 5: Thought Graph Real-time Highlight (Observabilitas Otak AI)
*   **Pekerjaan Backend & Frontend:**
    *   Menghubungkan status pemrosesan asinkron MIA ke simpul visualisasi `GraphViewer`.
    *   Setiap kali MIA memproses file, simpul grafik yang bersangkutan di layar kanan browser `/studio` akan menyala terang (pulsing glow) secara interaktif.
*   **Uji Validasi:** Mengirim perintah prompt besar, lalu melihat grafik interaktif menyala dan bergerak melacak alur penyelesaian tugas MIA.

### FASE 6: Advanced Telemetry & Zen Customization (Finishing Flagship)
*   **Pekerjaan Frontend:**
    *   Menambahkan visualisasi grafik beban sistem RAM/CPU di card monitoring kanan.
    *   Menyempurnakan Zen Mode dengan menonaktifkan seluruh panel informasi secara total saat diaktifkan, menyisakan kolom chat bersih.
*   **Uji Validasi:** Menekan `Ctrl+Shift+Z` or klik ganda layar, memastikan semua elemen melebur halus menyisakan antarmuka minimalis 60 FPS yang luar biasa indah.

---

## 🚨 ESCALATION MATRIX (Rencana Mitigasi Kegagalan)

| Skenario Kegagalan | Tindakan Sistem | Tindakan UI |
| :--- | :--- | :--- |
| **IDE Gagal Meluncur** | Coba alternatif pemanggilan via command alias PATH. | Pop-up merah berisi instruksi cara membuka folder secara manual. |
| **I/O Disk Terkunci di Windows** | Lakukan retry penulisan file menggunakan interval eksponensial (maksimal 5 kali dalam 10 detik). | Menampilkan status "Menunggu akses file..." berwarna kuning. |
| **Koneksi Git Rusak / Hilang** | Fallback ke pembacaan direktori statis biasa. | Notifikasi "Git Tracker Offline" di Topbar. |
| **Watchdog Timeout Terlampaui** | Kirim sinyal hard-kill PID seketika, catat dump log terakhir ke folder `/logs/`. | Status terminal berubah merah: `STUDIO_ERROR::TIMEOUT`. |

---

## 🏆 DEFINITION OF DONE (DOD) KELAS FLAGSHIP

MIA Architect Studio dinyatakan **Selesai Secara Sempurna** jika memenuhi 4 pilar berikut:
1.  **Zero-Configuration Launch:** Cukup buka `/studio`, sistem secara otomatis mendeteksi IDE komputer lokal dan siap diluncurkan tanpa konfigurasi manual.
2.  **Zero-Latency Sync:** Setiap perubahan kode dari MIA langsung tersimpan di disk (*Auto-Save*) dan siap di-load oleh IDE lokal secara instan.
3.  **Strict Sandbox Immunity:** Eksekusi kode asing tidak pernah menembus batas aman memori (256MB) dan durasi (25 detik).
4.  **Premium UX Certified:** Lulus pengujian integrasi mendalam `.\run_check_all.bat` dengan status **SEHAT - 100% ERROR-FREE** dan konsisten berjalan pada kelancaran animasi **60 FPS**.
