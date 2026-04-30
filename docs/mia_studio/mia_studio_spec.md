# MIA ARCHITECT STUDIO (MIA-AS) — SPECIFICATION v1.0
## STATUS: ARCHITECTURAL DRAFT (SINGLE SOURCE OF TRUTH)

### 1. VISION & OBJECTIVE
MIA Architect Studio adalah antarmuka khusus pengembang (Developer Console) di dalam ekosistem MIA yang memungkinkan kolaborasi coding tingkat lanjut antara User dan MIA. Studio ini mentransformasi MIA dari sekadar Chatbot menjadi **Autonomous Pair-Programmer**.

**Objective:**
- Menyediakan lingkungan coding profesional (IDE-like) di dalam browser.
- Menghilangkan friksi copy-paste kode dari chat.
- Memberikan visibilitas 100% terhadap logika internal (Graph) MIA.

---

### 2. CORE INTERFACE ARCHITECTURE (TRIPLE-PANE LAYOUT)
GUI harus mengadopsi estetika futuristik (Dark Mode, Glassmorphism) dengan 3 area utama:

#### A. LEFT PANEL: NAVIGATION & LOGIC EXPLORER
- **Skill Explorer**: Daftar file `.py` di dalam folder `skills/`.
- **Logic Graph Viewer**: Visualisasi node-based dari `ExecutionGraph` yang sedang berjalan.
- **Context Manager**: Menampilkan memori atau dokumen (seperti `SOUL.md`) yang sedang aktif sebagai referensi coding.

#### B. CENTER PANEL: THE FORGE (MONACO EDITOR)
- **Monaco Editor Integration**: Full support untuk Python/Typescript (Syntax highlighting, IntelliSense).
- **Tabbed Interface**: Memungkinkan membuka beberapa file sekaligus.
- **Live Diff View**: Saat MIA menyarankan perubahan, tampilkan perbandingan (Split-view) sebelum user menekan "Merge/Apply".
- **Action Toolbar**:
    - `[RUN]`: Eksekusi kode di sandbox.
    - `[DEPLOY]`: Simpan kode ke sistem skill aktif.
    - `[DEBUG]`: Jalankan dengan log verbositas tinggi.

#### C. RIGHT PANEL: MIA CO-PILOT CHAT
- **Specialized Coding Chat**: Chat interface yang dioptimalkan untuk instruksi teknis.
- **Prompt Presets**: Tombol cepat untuk "Refactor", "Optimize", "Add Docstring", "Write Tests".
- **Voice-to-Code**: Indikator mic untuk input suara yang langsung dikonversi menjadi draf kode di panel tengah.

---

### 3. ADVANCED FEATURES (THE "100% BUTTONS" PROMISE)
Semua fitur yang ada di lingkungan IDE profesional (Antigravity/VS Code) harus hadir:

1.  **Integrated Terminal**: Terminal streaming dari backend untuk melihat output `stdout`/`stderr` secara real-time.
2.  **Resource Monitor**: Widget kecil yang menunjukkan penggunaan CPU/RAM backend saat eksekusi skill berat.
3.  **Agentic Debugger**: Kemampuan untuk melakukan *step-over* pada eksekusi graph MIA.
4.  **Version History**: Snapshot sederhana dari perubahan kode yang dilakukan bersama MIA.
5.  **Global Search**: Pencarian di seluruh folder `backend/` dan `skills/`.

---

### 4. TECHNICAL STACK (PROPOSED)
- **Frontend**: React (Vite) + Monaco Editor Wrapper (`@monaco-editor/react`).
- **Styling**: Vanilla CSS dengan variabel tema MIA (Primary: Neon Green/Cyan).
- **Communication**: WebSocket (untuk Terminal & Graph streaming) + REST API (untuk file management).
- **Backend Service**: `SkillManager` & `GraphExecutor` (Existing) dengan tambahan `StudioService` untuk file I/O.

---

### 5. FAILURE MODES & RESILIENCE (RE-INTEGRATION)
- **Global Timeout (25s)**: Tetap berlaku untuk semua permintaan yang dipicu dari Studio.
- **Execution Sandbox**: Kode yang dijalankan di Studio tidak boleh merusak core MIA (menggunakan proses terpisah).
- **Auto-Save**: Draft kode disimpan secara otomatis untuk mencegah kehilangan data saat koneksi drop.

---

### 6. DEVELOPMENT ROADMAP (DRAFT)
- **Phase 1**: Layouting & Monaco Editor Integration.
- **Phase 2**: File Management (Read/Write Skills).
- **Phase 3**: WebSocket Stream (Terminal & Log).
- **Phase 4**: Graph Logic Visualization.
- **Phase 5**: Polishing & "Fix My Brain" Studio Integration.

---
**STATUS:** `AWAITING DETAIL PLAN`
**AUTHOR:** Antigravity (MIA Core Agent)
**REFERENCE:** Conversation b1126562 (Resilience Hardening)
