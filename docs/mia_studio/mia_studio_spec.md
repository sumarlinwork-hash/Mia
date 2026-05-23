# MIA ARCHITECT STUDIO (MIA-AS) — SPECIFICATION v1.3
## STATUS: MODULE SPEC — SUPERSEDED BY `docs/1App5Kernell.md` FOR APP-LEVEL ARCHITECTURE

> **Alignment Note (2026-05-23):** Dokumen ini masih berguna untuk detail legacy Studio services seperti IDE discovery, Git guard, sandbox runner, dan websocket stream. Namun arah produk terbaru menetapkan `/studio` sebagai **agent cockpit**, bukan web IDE dan bukan local-IDE-first workflow. Local IDE tetap boleh ada sebagai integrasi opsional, tetapi alur utama adalah prompt -> plan -> approval -> tools -> activity stream -> review changes.

### VISION & OBJECTIVE
MIA Architect Studio (MIA-AS) adalah antarmuka khusus pengembang (Developer Cockpit) di dalam ekosistem MIA yang memungkinkan kolaborasi coding tingkat lanjut antara User dan MIA. Studio ini mentransformasi MIA dari sekadar Chatbot biasa menjadi **Autonomous Pair-Programmer Orchestrator**.

Berbeda dengan IDE tradisional di browser yang meniru editor multi-file (VCS), MIA-AS menganut **Agent Cockpit Paradigm**:
- **No Browser IDE / No Monaco Foundation:** Browser tidak menjadi tempat editing manual utama. Jika ada tampilan kode, sifatnya preview, diff, atau read-only inspection.
- **Local IDE as Optional Companion:** IDE lokal seperti VS Code/Cursor/Trae boleh diluncurkan dari Studio, tetapi hanya sebagai integrasi opsional. Ia tidak menjadi pusat arsitektur Studio.
- **Interactive Prompt & Observation Cockpit:** Tampilan `/studio` difokuskan menjadi dashboard kontrol minimalis dan futuristik:
  - **Composer:** input task/follow-up untuk memberi instruksi ke agent.
  - **Activity Stream:** event real-time seperti Thought, Analyzed, Searched, Edited, Ran command, Waiting, Verification result.
  - **Review Changes:** diff read-only, changed-files summary, undo own changes, dan run verification.
  - **Logs/Graph:** terminal log dan graph viewer menjadi detail observability, bukan pusat UI tunggal.
- **Git Workspace Guard:** Workspace proyek diperlakukan sebagai repositori Git aktif. Studio mendeteksi serta menampilkan nama **Active Branch** dan status **Dirty Index** (jumlah file yang berubah tapi belum di-commit) secara real-time di antarmuka Studio untuk menjamin integritas kode Bos.
- **Agent Patch / Auto-Save Engine:** Setiap kali MIA menulis atau memodifikasi kode, perubahan disimpan melalui service backend yang aman, lalu ditampilkan sebagai Review Changes. Editor lokal hanya menerima efek file system jika user membukanya, bukan menjadi alur utama.

---

### 0. CORE ARCHITECTURAL PRINCIPLES (NON-NEGOTIABLE)

*   **P1 — CONTRACT FIRST**
    Semua eksekusi dan manipulasi file wajib menaati hukum tertulis di `mia_studio_execution_contract.md`.
*   **P2 — AGENT COCKPIT & REVIEW CHANGES**
    Editor browser ditiadakan. Perubahan file dilakukan oleh agent/tool backend melalui approval/policy gate, lalu ditampilkan sebagai diff/read-only Review Changes. IDE lokal boleh dipakai opsional untuk inspeksi manual.
*   **P3 — STATUTORY SANDBOX ISOLATION**
    Meskipun kode ditulis langsung ke workspace, eksekusi latar belakang (`RUN`) wajib dibatasi oleh batas RAM 256MB dan waktu timeout keras 25 detik di dalam subproses atau container Docker terisolasi.
*   **P4 — DETERMINISM OVER MAGIC**
    Siklus proses backend wajib terdaftar secara eksplisit menggunakan sistem Execution ID (UUID) yang terikat langsung ke session ID aktif.

---

### 1. GLOBAL ARCHITECTURE (Sleek Cockpit)

#### FRONTEND ROUTE (`/studio`):
*   **Full-Viewport Shell:** Sidebar global dan resonant orchestrator MIA disembunyikan di rute `/studio` agar memberikan fokus visual premium layaknya desktop console.
*   **Garden Launcher Mode:** Tampilan awal dengan kolom input prompt terpusat.
*   **Workspace Mode:** Agent cockpit setelah prompt disubmit:
    - **Activity Stream:** transcript kerja agent.
    - **Bottom Composer:** follow-up instruction, stop action, auto-review/model/effort control, pending approval state.
    - **Review Changes:** changed-files summary dan diff read-only.
    - **Details:** terminal log, graph viewer, Git status, dan optional local IDE launcher.
*   **Cockpit Topbar:** Berisi status kernel, active model, Git Branch/Dirty Index, pending approval count, running task count, dan emergency stop. IDE Selector boleh ada sebagai menu tambahan, bukan kontrol utama.

#### BACKEND SERVICES (STRICT DOMAIN ISOLATION):
1.  **StudioSessionManager:** Mengatur status sesi, draft, dan pemetaan Execution ID.
2.  **StudioFileService (Proxy Layer):**
    - Mengelola penulisan kode asinkron dengan taktik **Atomic Writing** (tulis ke temp -> validasi -> rename) untuk mencegah file korup di Windows.
    - **Agent Patch Handler:** Menulis perubahan ke disk setelah task/approval sesuai policy, lalu memicu changed-files summary dan Review Changes.
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

#### PHASE 1 — MINIMAL AGENT COCKPIT CORE (FOUNDATION)
*   **Goal:** Membangun antarmuka Garden Launcher terpusat, activity stream, bottom composer, dan Review Changes.
*   **Frontend:**
    - [ ] `GardenLauncher.tsx` - Prompt builder hitam Codex-style.
    - [ ] `StudioPage.tsx` - Workspace mode: Activity Stream + Bottom Composer + Review Changes.
    - [ ] IDE Selector Dropdown hanya sebagai optional integration.
*   **Backend:**
    - [ ] `StudioIDEDiscoveryService` dengan pemindai registry Windows.
    - [ ] API `GET /api/studio/ide/list` dan `POST /api/studio/ide/open`.
    - [ ] `StudioExecutionService` untuk menjalankan skrip CLI terisolasi.
*   **Exit Criteria:** User bisa menulis prompt awal, melihat activity stream, melihat changed-files summary, membuka Review Changes, dan menjalankan verifikasi tanpa editor browser.

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
MIA Architect Studio dinyatakan selaras dengan `1App5Kernell.md` jika:
1.  Bos dapat memberi perintah di `/studio` dan melihat activity stream agent secara real-time.
2.  Perubahan file tampil sebagai changed-files summary dan Review Changes read-only.
3.  Perubahan yang dibuat agent bisa diverifikasi, dihentikan, atau diminta follow-up.
4.  Status Git repositori terintegrasi penuh dan terupdate secara real-time di browser.
5.  Semua komponen aman di bawah batas sandbox defensif yang ketat.
