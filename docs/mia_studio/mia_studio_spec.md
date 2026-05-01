# MIA ARCHITECT STUDIO (MIA-AS) — SPECIFICATION v1.1
## STATUS: APPROVED FOR IMPLEMENTATION (SSOT)

### VISION & OBJECTIVE
MIA Architect Studio (MIA-AS) adalah antarmuka khusus pengembang (Developer Console) di dalam ekosistem MIA yang memungkinkan kolaborasi coding tingkat lanjut antara User dan MIA. Studio ini mentransformasi MIA dari sekadar Chatbot menjadi **Autonomous Pair-Programmer**.

- Menyediakan lingkungan coding profesional (IDE-like) di dalam browser (Path: `frontend/src/mia_studio`).
- Menghilangkan friksi copy-paste kode dari chat.
- Memberikan visibilitas 100% terhadap logika internal (Graph) MIA.
- Menjamin keamanan sistem melalui **Strict Sandbox Isolation** dan **Proxy File Access**.

MASTERPLAN — MIA ARCHITECT STUDIO (MIA-AS)
TYPE: FULL EXECUTION ROADMAP (ZERO → PRODUCTION COMPLETE)
MODE: ENGINE-READY (NO DESIGN, NO AMBIGUITY)

============================================================
0. PRINCIPLE (NON-NEGOTIABLE)
=============================

P1 — CONTRACT FIRST
Semua implementasi HARUS didahului contract (execution rules) di `mia_studio_execution_contract.md`.

P2 — ISOLATION BY DEFAULT
Semua kode dari Studio dianggap **untrusted**. Eksekusi wajib dilakukan di sandbox terisolasi.

P3 — NO DIRECT MUTATION (PROXY ONLY)
Tidak ada perubahan ke core system atau skill directory secara langsung. Semua akses via `StudioFileService` dan `StudioDeployService`.

P4 — PROGRESSIVE EXPANSION
Feature dibuka bertahap. Phase 1 fokus pada "Read & Run" dengan observabilitas awal.

P5 — DETERMINISM OVER MAGIC
Lifecycle proses harus eksplisit (Execution ID, Registry, Hard Kill). Tidak boleh ada "zombie processes" atau "silent failures".

============================================================

1. SYSTEM TARGET (FINAL STATE)
   ============================================================

MIA-AS adalah:

* IDE-like environment di browser
* Autonomous pair-programmer (human + MIA)
* Full visibility ke execution graph
* Sandbox execution system
* Safe deployment pipeline ke skill system

FINAL CAPABILITIES:

✔ Multi-file editor (Monaco)
✔ AI-assisted coding (chat + diff)
✔ Sandbox execution (isolated)
✔ Version history + rollback
✔ Graph visualization (read-only → interactive)
✔ Debugging (step execution)
✔ Terminal streaming
✔ Resource monitoring
✔ Safe deploy system

============================================================
2. GLOBAL ARCHITECTURE (FINAL FORM)
===================================

FRONTEND:

* React + Vite
* Monaco Editor
* WebSocket client

BACKEND SERVICES (STRICT DOMAIN ISOLATION):

1. StudioSessionManager
   * Manage tab, state, draft, and active Execution IDs.

2. StudioFileService (Proxy Layer)
   * Wrapper aman untuk FS access.
   * Path normalization, whitelist enforcement, anti-traversal.
   * Read access ke /core hanya via explicit API (No direct path access).
   * **Atomic Write:** Write ke temp file -> validate -> atomic rename (Patch 6).

3. StudioExecutionService (Sandbox Runner)
   * ProcessRegistry (PID, start_time, session_id).
   * Lifecycle control (Start/Kill/Timeout).
   * Resource monitoring (Event-driven, 200ms interval).
   * **Session Isolation:** Reject cross-session execution access (Patch 1).
   * **Queue Control:** Max 1 concurrent execution per session (Patch 2).
   * **Log Boundary:** Truncate output at 1-5MB + "OUTPUT_TRUNCATED" flag (Patch 3).

4. StudioDeployService (Gatekeeper)
   * Validation chain (Linting, Syntax, Dry-run).
   * Snapshot/History management.
   * Automated rollback on failure.

5. GraphStreamService
   * Real-time execution graph streaming (Session bound).
   * **Filtering:** Graph events wajib memiliki `execution_id` (Patch 4).

============================================================
3. PROJECT STRUCTURE (PROPOSED)
============================================================

BACKEND: `backend/studio/`
- `session_manager.py`: Session & State handling.
- `file_service.py`: Secure file proxy & path validator.
- `execution_service.py`: Sandbox runner & process registry.
- `deploy_service.py`: Validation & Hot-reload logic.
- `graph_stream.py`: WS graph hooks for studio.
- `models.py`: Studio-specific data schemas.

FRONTEND: `frontend/src/mia_studio/`
- `components/`: Studio UI components (Monaco, Graph, Terminal).
- `hooks/`: Custom hooks for session and streaming.
- `services/`: API and WebSocket client wrappers.
- `StudioLayout.tsx`: Main studio interface.

============================================================
4. MASTER DEVELOPMENT PHASES
============================================================

TOTAL PHASE: 6
Setiap phase = production-ready subset

---

## PHASE 0 — EXECUTION CONTRACT (MANDATORY FOUNDATION)

OUTPUT:
`docs/mia_studio/mia_studio_execution_contract.md`

CHECKLIST:
✔ Implement MANDATORY PATCHES (1-8):
    1. Active Process Registry (PID, Start Time, Session ID).
    2. Hard Kill Switch (Graceful -> HARD KILL Fallback).
    3. Event-driven Resource Monitoring (Max 200ms interval).
    4. Proxy File Access (No direct FS calls, explicit API only).
    5. Path Validation (Normalization + Prefix Comparison + Anti-Traversal).
    6. Stateless Dry-Run (No registry, no persistence).
    7. Guaranteed Rollback (Auto-restore snapshot).
    8. Execution ID System (UUID mapping for logs/graph/process).

✔ Decide Isolation Strategy:
    - Phase 1-2: Subprocess + Timeout + Manual Kill.
    - Phase 3+: **Docker Container** (LOCK DECISION).

EXIT CRITERIA:
✔ Dokumen Kontrak disetujui dan menjadi hukum sistem.

---

## PHASE 1 — MINIMAL STUDIO CORE (FOUNDATION)

SCOPE: SINGLE FILE ONLY

FEATURE:

[ ] Monaco Editor (Single tab) - `frontend/src/mia_studio`
[ ] File Read (via Proxy Service)
[ ] Save to Draft (Isolated storage)
[ ] Basic Chat (AI Code Suggestion)
[ ] RUN (Sandbox v1 with Execution ID)
[ ] **Graph Viewer (READ-ONLY, Basic)** - Untuk feedback instan.

BACKEND:

✔ StudioFileService (Basic proxy)
✔ StudioExecutionService (ProcessRegistry + Kill switch)
✔ GraphStreamService (Read-only hook)

RULE:

* RUN tidak boleh menyentuh sistem utama.
* Wajib menggunakan Execution ID untuk streaming logs/graph.
* **One active execution per session:** Reject RUN jika masih ada proses aktif (Patch 2).
* **Session Binding:** Execution wajib terikat ke `session_id` (Patch 1).

EXIT CRITERIA:

✔ User bisa edit 1 file
✔ Bisa run tanpa merusak sistem
✔ Tidak ada crash

---

## PHASE 2 — FILE SYSTEM & VERSION CONTROL (SAFE STATE)

FEATURE:

[ ] Multi-file tabs
[ ] Draft vs Saved separation
[ ] Version snapshot (manual)
[ ] Diff view (basic)

BACKEND:

[ ] Version storage (snapshot JSON/file copy)
[ ] Diff generator

RULE:

* Tidak ada overwrite tanpa snapshot
* Semua perubahan reversible

EXIT CRITERIA:

✔ Tidak ada data loss
✔ User bisa rollback

---

## PHASE 3 — DOCKER ISOLATION & SAFE DEPLOY

FEATURE:

[ ] **Dockerized Sandbox** (Hard isolation for RUN).
[ ] DEPLOY button.
[ ] Validation layer:
- Linting & Syntax check.
- Stateless Dry-run test.
[ ] Rollback otomatis jika hot-reload gagal.

BACKEND:

[ ] StudioDeployService.
[ ] Docker Integration for StudioExecutionService.

RULE:

* Deploy tidak boleh langsung overwrite tanpa snapshot.
* Harus lulus dry-run di environment stateless.
* **Deploy Lock:** Dilarang deploy jika ada execution aktif di session (Patch 5).

EXIT CRITERIA:

✔ Tidak ada broken skill masuk ke system
✔ Deploy failure tidak merusak state

---

## PHASE 4 — REAL-TIME EXECUTION & TERMINAL

FEATURE:

[ ] Integrated Terminal (stdout streaming)
[ ] WebSocket execution stream
[ ] Execution cancel (kill process)

BACKEND:

[ ] Streaming process handler
[ ] Kill-switch endpoint

RULE:

* Semua execution harus cancellable
* Tidak boleh ada zombie process

EXIT CRITERIA:

✔ User bisa lihat log real-time
✔ Bisa cancel execution

---

## PHASE 5 — GRAPH VISIBILITY & DEBUGGING

FEATURE:

[ ] Graph visualization (READ-ONLY)
[ ] Execution node highlight (real-time)
[ ] Step execution (basic debugger)

BACKEND:

[ ] GraphStreamService
[ ] Execution hooks per node

RULE:

* Tidak ada edit graph dulu
* Fokus observability

EXIT CRITERIA:

✔ User bisa “melihat otak MIA bekerja”

---

## PHASE 6 — ADVANCED CAPABILITIES (FINALIZATION)

FEATURE:

[ ] Resource monitor (CPU/RAM)
[ ] Auto-save (interval based)
[ ] Global search
[ ] Prompt presets (refactor, optimize, test)
[ ] Version history (timeline view)

OPTIONAL (LAST):
[ ] Voice-to-code

RULE:

* Semua feature harus stabil sebelum enable

EXIT CRITERIA:

✔ Feature complete
✔ Tidak ada blocking bug
✔ UX stabil

============================================================
PHASE 2 HARDENING DECISIONS (STATE INTEGRITY ENGINE)
============================================================

### ❗ ISSUE-5 — CACHE PRIORITY
✔ **Backend = Supreme Source of Truth (SSOT):** Backend snapshots adalah otoritas tunggal untuk integritas data.
✔ **LocalStorage = Emergency Fallback:** Hanya digunakan untuk pemulihan browser crash, tidak boleh menimpa SSOT secara otomatis tanpa validasi.

### ❗ SNAPSHOT CONSISTENCY & TIMING
✔ **Snapshot Lock Window:** Menolak semua write saat snapshot aktif (Anti-Race).
✔ **Retry Policy:** Frontend wajib melakukan retry selama max 10 detik jika terkena lock untuk menjamin zero-data-loss.
✔ **Post-Rollback Sync:** Editor wajib melakukan force-reload dari backend setelah rollback sukses untuk mencegah data stale.

============================================================
PHASE 3: INTERACTION & MULTI-FILE ARCHITECTURE
============================================================

### [P3-A] FILE OPERATION PIPELINE
✔ Semua operasi file (Rename, Move, Delete, Create) WAJIB melewati **Version Pipeline** (Pre-snapshot -> Execute -> Validate).
✔ Dilarang melakukan manipulasi struktur file langsung tanpa audit versioning.

### [P3-B] FILE EXPLORER INTEGRITY
✔ File Explorer adalah **View Layer**, bukan otoritas. Data diderivasi dari backend SSOT.
✔ Broken Dependency Warning wajib muncul saat operasi destruktif (menggunakan AST parsing sederhana).

### [P3-C] TAB & STATE SYNC
✔ **1 File = 1 State:** State file di memori harus tunggal meskipun dibuka di banyak tab.
✔ UI wajib mendeteksi perubahan eksternal dan mencegah *silent overwrite*.

============================================================
4. FAILURE HANDLING MATRIX (MANDATORY)
======================================

CASE: RUN TIMEOUT
→ Kill process
→ Return fallback message

CASE: EXECUTION CRASH
→ Capture stderr
→ Show to UI

CASE: DEPLOY FAIL
→ Reject commit
→ Restore last stable

CASE: FILE CORRUPT
→ Load last snapshot

CASE: WS DISCONNECT
→ Reconnect + resume stream

============================================================
5. ERROR STANDARDS & NORMALIZATION (PATCH 8)
============================================================

Semua error dari Studio wajib mengikuti format:
`STUDIO_ERROR::<TYPE>::<MESSAGE>`

Contoh:
- `STUDIO_ERROR::TIMEOUT::Execution exceeded 25s`
- `STUDIO_ERROR::FORK_BOMB::Concurrent execution limit reached`
- `STUDIO_ERROR::SECURITY::Unauthorized path access`

============================================================
6. STARTUP SANITY CHECK & INFRASTRUCTURE (PATCH 7)
============================================================

Backend wajib melakukan pengecekan berikut saat startup:
1. ✔ **Cleanup Orphan Processes:** Bunyi proses yang tidak terdaftar atau orphan.
2. ✔ **Directory Validation:** Auto-create jika folder berikut tidak ada:
   - `backend/skills/`
   - `backend/studio/drafts/`
   - `backend/studio/history/`
3. [ ] **Environment Check:** Pastikan Docker tersedia (untuk Phase 3+).

Editor load: < 1s
Run startup: < 500ms
Sandbox execution: max 25s
File save: < 100ms
WS latency: < 100ms

============================================================
6. FINAL DEFINITION OF DONE
===========================

MIA-AS dianggap 100% selesai jika:

✔ Tidak bisa merusak core system
✔ Semua execution terkontrol
✔ Semua perubahan reversible
✔ Tidak ada silent failure
✔ User bisa coding end-to-end tanpa keluar dari Studio
✔ Sistem memiliki "Self-Healing Control Loop" otonom (SHAD-CSA)

============================================================
8. SELF-HEALING AUTONOMOUS DISTRIBUTED CONTROL SYSTEM (SHAD-CSA)
============================================================

MIA-AS mengimplementasikan sistem kontrol terdistribusi loop-tertutup untuk menjamin ketahanan sistem operasi di atas infrastruktur yang tidak stabil.

### 8.1. Arsitektur Komponen (Stateless Core)
Seluruh komponen bersifat stateless, mengandalkan **Journal Store + Control Ledger** sebagai sumber kebenaran tunggal.

*   **Control Plane**: Mengatur alur kerja `OBSERVE → DETECT → DIAGNOSE → DECIDE → EXECUTE → VERIFY`.
*   **Diagnostics Layer**: Mengklasifikasikan anomali menjadi tipe kegagalan (Corruption, Lock-Storm, Drift).
*   **Healing Layer**: Melakukan tindakan korektif (Replay, Rollback, Node-Isolation, Load-Shedding).
*   **Safety Guard**: Memberlakukan "Kill-Switch" otomatis jika pemulihan gagal melebihi ambang batas.

### 8.2. Core Control Loop (The Tick)
Sistem beroperasi dalam siklus deterministik:
1.  **Observe**: Mengumpulkan snapshot telemetry (Lock state, Queue depth, Journal hashes).
2.  **Detect**: Membandingkan state aktual dengan kebijakan integritas (Policies).
3.  **Heal**: Memilih jalur pemulihan termurah (Cheapest safe path).
4.  **Consensus**: Melakukan rekonsiliasi state antar node setelah pemulihan.

### 8.3. Resilience Invariants (Non-Negotiable)
*   ✔ **Zero Silent Corruption**: Setiap hash mismatch harus memicu isolasi seketika.
*   ✔ **Bounded Recovery**: Biaya pemulihan harus dibatasi waktu dan sumber daya.
*   ✔ **Deterministic Conflict Resolution**: Pemulihan antar node harus menghasilkan state yang identik.

============================================================
9. STRICT DEVELOPMENT RULE
==========================

* DILARANG lompat phase
* DILARANG menambah feature di tengah phase
* WAJIB close semua exit criteria sebelum lanjut

============================================================

KESIMPULAN AKHIR:

Bangun ini seperti membangun sistem operasi kecil,
bukan fitur UI.

Kalau Anda disiplin mengikuti phase ini,
Anda akan mendapatkan:

→ IDE internal yang stabil
→ AI pair-programmer yang benar-benar usable
→ dan sistem yang tidak bisa “menyakiti dirinya sendiri”

Jika Anda lompat:
→ Anda akan mendapat chaos yang sulit diperbaiki.
