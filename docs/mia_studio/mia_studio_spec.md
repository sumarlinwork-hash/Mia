# MIA ARCHITECT STUDIO (MIA-AS) — SPECIFICATION v1.3
## STATUS: APPROVED FOR IMPLEMENTATION (SSOT)

### VISION & OBJECTIVE
MIA Architect Studio (MIA-AS) adalah antarmuka khusus pengembang (Developer Cockpit) di dalam ekosistem MIA yang memungkinkan kolaborasi coding tingkat lanjut antara User dan MIA. Studio ini mentransformasi MIA dari sekadar Chatbot biasa menjadi **Autonomous Pair-Programmer Orchestrator**.

Berbeda dengan IDE tradisional di browser yang meniru editor multi-file (VCS), MIA-AS menganut **Sleek Codex-Style Paradigm**:
- **Local IDE as Supreme Editor:** Dibandingkan memaksakan Monaco Editor atau browser file explorer setengah matang, Studio mempercayakan penulisan kode penuh kepada IDE lokal Bos (seperti **VS Code, Cursor, Trae, Qoder, Codex, IntelliJ**, dll) yang sudah terkonfigurasi di desktop lokal Bos.
- **IDE Auto-Discovery Service:** Saat pertama kali masuk `/studio`, backend secara otomatis mendeteksi IDE lokal apa saja yang terinstal pada sistem Windows Bos dan menampilkannya di status/dropdown bar `/studio` agar mudah diluncurkan dengan satu klik.
- **Interactive Prompt & Observation Cockpit:** Tampilan `/studio` difokuskan menjadi dashboard kontrol minimalis dan futuristik:
  - **Sisi Kiri:** Kolom input Prompt & Chat dengan MIA (untuk memandu, merencanakan, dan memerintahkan AI).
  - **Sisi Kanan:** Visualisasi real-time alur berpikir MIA (`GraphViewer`) menggunakan event-driven graph stream dan panel monitoring.
- **Git Workspace Guard:** Workspace proyek diperlakukan sebagai repositori Git aktif. Studio mendeteksi serta menampilkan nama **Active Branch** dan status **Dirty Index** (jumlah file yang berubah tapi belum di-commit) secara real-time di antarmuka Studio untuk menjamin integritas kode Bos.
- **Auto-Save Engine:** Setiap kali MIA menulis atau memodifikasi kode, kode tersebut secara otomatis disimpan langsung ke disk (*Auto-Save* aktif secara default) dan disinkronkan ke editor lokal Bos tanpa intervensi manual.

---

### 0. CORE ARCHITECTURAL PRINCIPLES (NON-NEGOTIABLE)

*   **P1 — CONTRACT FIRST**
    Semua eksekusi dan manipulasi file wajib menaati hukum tertulis di `mia_studio_execution_contract.md`.
*   **P2 — LOCAL IDE & GIT SUPREMACY**
    Editor browser ditiadakan. Semua aktivitas pengeditan dilakukan di IDE lokal terpilih. Integritas versi dikawal ketat oleh sistem Git repositori lokal.
*   **P3 — STATUTORY SANDBOX ISOLATION**
    Meskipun kode ditulis langsung ke workspace, eksekusi latar belakang (`RUN`) wajib dibatasi oleh batas RAM 256MB dan waktu timeout keras 25 detik di dalam subproses atau container Docker terisolasi.
*   **P4 — DETERMINISM OVER MAGIC**
    Siklus proses backend wajib terdaftar secara eksplisit menggunakan sistem Execution ID (UUID) yang terikat langsung ke session ID aktif.

---

### 1. GLOBAL ARCHITECTURE (Sleek Cockpit)

#### FRONTEND ROUTE (`/studio`):
*   **Full-Viewport Shell:** Sidebar global dan resonant orchestrator MIA disembunyikan di rute `/studio` agar memberikan fokus visual premium layaknya desktop console.
*   **Garden Launcher Mode:** Tampilan awal *My Garden* dengan kolom input prompt terpusat bergaya gelap (*dark Codex-like*).
*   **Workspace Mode:** Split-screen minimalis setelah prompt disubmit:
    - **Panel Kiri:** Kontrol percakapan & instruksi perbaikan kode langsung ke asisten MIA.
    - **Panel Kanan:** Visualisasi Graph dinamis (`GraphViewer`) untuk melihat MIA berpikir dan berinteraksi asinkron.
    - **Panel Bawah:** `StudioTerminal` streaming logs untuk memantau keluaran *dry-run* atau eksekusi proses lokal.
*   **Cockpit Topbar:** Berisi **IDE Selector Dropdown** (hasil deteksi lokal), indikator status **Git Branch & Dirty Index**, tombol **Zen Mode (`EyeOff`)**, dan sakelar **Settings (Auto-Save toggle)**.

#### BACKEND SERVICES (STRICT DOMAIN ISOLATION):
1.  **StudioSessionManager:** Mengatur status sesi, draft, dan pemetaan Execution ID.
2.  **StudioFileService (Proxy Layer):**
    - Mengelola penulisan kode asinkron dengan taktik **Atomic Writing** (tulis ke temp -> validasi -> rename) untuk mencegah file korup di Windows.
    - **Auto-Save Handler:** Menyuntikkan kode langsung ke disk ketika disetujui, lalu memicu notifikasi update.
3.  **StudioIDEDiscoveryService:**
    - Mendeteksi letak eksekusi aplikasi IDE lokal di Windows (Cursor, Trae, Qoder, VS Code, IntelliJ) melalui pemindaian registry (`HKCU` / `HKLM`) dan path lingkungan (*Environment variables*).
    - Menyediakan API `GET /api/studio/ide/list` dan `POST /api/studio/ide/open`.
4.  **StudioGitGuard:**
    - Memanggil perintah Git lokal secara aman (`git status`, `git branch`) untuk melacak branch aktif dan file yang telah dimodifikasi.
    - Menyediakan informasi state control ke frontend.
5.  **StudioExecutionService (Sandbox Runner):**
    - ProcessRegistry (PID, start_time, session_id).
    - Lifecycle control (Start/Kill/Timeout).
    - Memori watchdog (200ms check interval, limit 256MB).

---

### 2. MASTER DEVELOPMENT PHASES

#### PHASE 0 — EXECUTION CONTRACT (MANDATORY FOUNDATION)
*   **Output:** `docs/mia_studio/mia_studio_execution_contract.md`
*   **Status:** ✔ **LULUS**

#### PHASE 1 — MINIMAL COCKPIT CORE (FOUNDATION)
*   **Goal:** Membangun antarmuka Garden Launcher terpusat, split-screen minimalis, dan IDE discovery dropdown.
*   **Frontend:**
    - [ ] `GardenLauncher.tsx` - Prompt builder hitam Codex-style.
    - [ ] `StudioPage.tsx` - Workspace mode: Prompt Chat kiri + Graph/Terminal kanan & bawah.
    - [ ] IDE Selector Dropdown di Topbar.
*   **Backend:**
    - [ ] `StudioIDEDiscoveryService` dengan pemindai registry Windows.
    - [ ] API `GET /api/studio/ide/list` dan `POST /api/studio/ide/open`.
    - [ ] `StudioExecutionService` untuk menjalankan skrip CLI terisolasi.
*   **Exit Criteria:** User bisa memilih IDE lokal dari browser, meluncurkannya, menulis prompt awal, dan beralih ke Workspace split-screen.

#### PHASE 2 — GIT GUARD & AUTO-SAVE CONFIGURATION (SAFE WORKSPACE)
*   **Goal:** Memasang pelacak repositori Git lokal dan konfigurasi mesin Auto-Save.
*   **Frontend:**
    - [ ] Indikator status Git (Branch Name & Dirty State) di Topbar.
    - [ ] Toggle Sakelar Settings: "Auto-Save Generated Code" (Default: ON).
*   **Backend:**
    - [ ] `StudioGitGuard` tracker (aman dari shell injection).
    - [ ] Konfigurasi status auto-save di `session_manager.py`.
    - [ ] File Watcher asinkron untuk mendeteksi perubahan luar dan memperbarui status Git di UI.
*   **Exit Criteria:** Indikator Git branch terrender presisi, dan file otomatis tersimpan langsung ke folder disk tanpa menimpa repositori utama secara ilegal.

#### PHASE 3 — DOCKER ISOLATION FOR BACKGROUND EXECUTION
*   **Goal:** Memindahkan eksekusi skrip Python latar belakang (`RUN`) ke container Docker terisolasi.
*   **Backend:**
    - [ ] Integrasi Docker untuk `StudioExecutionService`.
    - [ ] Verifikasi ketersediaan Docker daemon saat sistem startup.
*   **Exit Criteria:** Menghindari eksekusi berbahaya di tingkat sistem operasi host lokal.

#### PHASE 4 — REAL-TIME TERMINAL & WS STREAMING
*   **Goal:** Aliran log keluaran terminal asinkron menggunakan WebSocket.
*   **Frontend & Backend:**
    - [ ] WebSocket log stream dengan sistem chunking jika melebihi batas 1-5MB.
*   **Exit Criteria:** Log streaming lancar tanpa ada zombie process yang tertinggal.

#### PHASE 5 — GRAPH HIGHLIGHTING & MONITORING
*   **Goal:** Visualisasi grafik alur berpikir MIA (`GraphViewer`) yang interaktif.
*   **Frontend & Backend:**
    - [ ] `GraphStreamService` terikat per sesi eksekusi.
    - [ ] Highlight dinamis pada simpul grafik (*graph nodes*) saat MIA memproses tugas.
*   **Exit Criteria:** Pengguna dapat melihat secara visual bagaimana cara MIA menyelesaikan tugas di `/studio`.

#### PHASE 6 — ADVANCED COCKPIT TELEMETRY (FINALIZATION)
*   **Goal:** Panel metrik resource CPU/RAM lokal dan Timeline Git terintegrasi.
*   **Exit Criteria:** Sistem 100% matang, stabil pada 60 FPS, dan siap digunakan untuk proses *autonomous pair-programming* profesional.

---

### 3. CRITICAL FAILURE ESCALATION MATRIX

| Skenario | Penanganan | Status UI |
| :--- | :--- | :--- |
| **IDE Gagal Diluncurkan** | Tangkap stderr OS, tawarkan untuk membuka folder secara manual | Notifikasi Eror Merah |
| **Gagal Melakukan Git Call** | Fallback ke status "Git Detached/Not Initialized" tanpa merusak UI | Indikator Kuning |
| **Penulisan File Bentrok** | Jika Auto-Save gagal karena file terkunci (Windows Lock), coba lagi selama 10s | Dialog Rekonsiliasi / Retry |
| **Koneksi WebSocket Putus** | Lakukan auto-reconnect dan minta status terbaru ke session manager | Status LED Lnk Berkedip Merah |

---

### 4. DEFINITION OF DONE
MIA Architect Studio dinyatakan **100% Selesai** jika:
1.  Bos dapat mendikte/menulis perintah di `/studio` dan melihat logika MIA dieksekusi di `GraphViewer`.
2.  Kode otomatis tersimpan di folder proyek lokal (*Auto-Save*) dan siap diedit/diuji di IDE lokal Bos (Trae/Cursor/VS Code).
3.  Status Git repositori terintegrasi penuh dan terupdate secara real-time di browser.
4.  Semua komponen aman di bawah batas sandbox defensif yang ketat.
