# MIA STUDIO EXECUTION CONTRACT (V1.2)
TYPE: ARCHITECTURAL LAW (NON-NEGOTIABLE)
STATUS: APPROVED (FINAL HARDENING PATCHES INCLUDED)
SCOPE: StudioExecutionService, StudioFileService, StudioDeployService

---

## 1. SANDBOX ISOLATION (THE "NO ESCAPE" RULE)

### 1.1 Process Lifecycle & Registry (Patch 1, 8)
- **Execution ID:** Setiap request `RUN` wajib memiliki `execution_id` (UUID). ID ini memetakan proses ke logs dan graph stream.
- **ProcessRegistry:** Semua eksekusi wajib didaftarkan ke registry yang menyimpan:
    - `execution_id`
    - `PID`
    - `start_time`
    - `owner_session_id`
    - `status` (RUNNING / KILLED / DONE)
- **Cleanup Policy:** `cleanup_stale_processes()` dijalankan saat startup dan secara berkala untuk membunuh proses orphan (tanpa session aktif) atau proses yang melewati timeout.

### 1.2 Hard Kill-Switch (Patch 2)
- **Enforced Timeout:** 25 detik adalah batas keras (Hard limit).
- **Kill Priority:** 
    1. Graceful Terminate (maks 1 detik).
    2. **HARD KILL (SIGKILL/TaskKill)** (MANDATORY fallback).
- **Fail-Safe:** Jika Hard Kill gagal dalam 1 detik, sistem wajib melempar status `CRITICAL` ke log sistem dan mencoba ulang secara agresif.

### 1.3 Event-Driven Monitoring (Patch 3)
- **Resource Limit:** Memori limit 256MB per proses.
- **Monitoring Interval:** Maksimal 200ms atau menggunakan watchdog thread untuk mendeteksi spike secara real-time. Jika limit terlampaui, proses di-kill seketika.
- **Log Stream Boundary:** Max log size 1-5MB. Jika melebihi, wajib dilakukan truncation dengan flag `OUTPUT_TRUNCATED`.

### 1.4 Session Isolation & Queue Control (Final Patch 1, 2)
- **Session Binding:** Setiap eksekusi HARUS terikat ke `session_id`. Akses lintas session (cross-session) wajib di-reject.
- **Concurrent Limit:** Maksimal 1 eksekusi aktif per session. Request `RUN` baru wajib ditolak jika masih ada proses aktif di session yang sama (Anti-Fork Bomb).

---

## 2. FILE ACCESS GUARD (THE "PROXY" RULE)

### 2.1 Proxy-Only Access (Patch 4)
- **No Direct Calls:** Dilarang menggunakan OS call langsung (`open()`, `os.listdir()`, dll) dari dalam kode sandbox.
- **StudioFileService Proxy:** Semua operasi I/O harus melalui `StudioFileService`.
- **Core Isolation:** Akses READ ke directory `/core` hanya diperbolehkan melalui explicit API yang disediakan Studio, bukan melalui navigasi file path.

### 2.2 Strict Path Validation (Patch 5)
- **Normalization:** Wajib menggunakan `os.path.abspath()` sebelum pengecekan.
- **Prefix Enforcement:** `real_path.startswith(ALLOWED_ROOT)` wajib divalidasi.
- **Blocked Operations:** 
    - Rejection total terhadap `../` (traversal).
    - Blokir symbolic link escape.
    - Blokir drive switching (misal mencoba pindah dari `D:` ke `C:`).

### 2.3 Atomic Writing (Final Patch 6)
- **Safe Write Flow:** Semua operasi tulis file wajib menggunakan pola: `Write to Temp` -> `Validation` -> `Atomic Rename`. Hal ini untuk mencegah file corrupt jika proses terputus di tengah jalan.

---

## 3. SAFE DEPLOY & DRY-RUN (THE "GATEKEEPER" RULE)

### 3.1 Stateless Dry-Run (Patch 6)
- **Isolation:** Dry-run wajib dijalankan di environment yang sepenuhnya stateless.
- **No Side-Effects:** 
    - Tidak boleh mendaftarkan tool ke `tool_registry` utama.
    - Tidak boleh menyimpan file permanen.
    - Tidak boleh memodifikasi global state sistem.

### 3.2 Guaranteed Rollback (Patch 7)
- **Snapshot Requirement:** Wajib membuat snapshot/backup sebelum proses `DEPLOY`.
- **Auto-Revert:** Jika `hot-reload` gagal atau terjadi exception saat loading skill baru, sistem wajib melakukan rollback otomatis ke state terakhir yang stabil SEBELUM broken state terekspos ke user.

### 3.3 Deploy Locking (Final Patch 5)
- **Race Condition Prevention:** Proses `DEPLOY` hanya diperbolehkan jika tidak ada eksekusi (`RUN`) yang sedang aktif di session tersebut.

---

## 4. INFRASTRUCTURE DECISION

### 4.1 Phase 1-2 (Soft Isolation)
- Menggunakan `subprocess` dengan `timeout` dan `psutil` monitoring (sesuai Patch 3).

### 4.2 Phase 3+ (Hard Isolation)
- **LOCK DECISION:** Menggunakan **Docker Container**. 
- Alasan: Menjamin parity, resource limiting yang presisi di Windows, dan isolasi kernel-level yang lebih kuat.

---

## 5. ERROR STANDARDS & NORMALIZATION (Final Patch 8)
- **Global Format:** `STUDIO_ERROR::<TYPE>::<MESSAGE>`
- **Mandatory Usage:** Semua error yang dikirim ke frontend wajib mengikuti format ini untuk konsistensi parsing dan stabilitas UI.

---

## 6. FAILURE ESCALATION & SANITY CHECK (Final Patch 7)
- **Startup Validation:** Backend wajib memvalidasi struktur folder studio (`/skills/`, `/studio/drafts/`, `/studio/history/`) dan auto-create jika hilang.
- **Zombie Sweep:** Startup sistem wajib menyapu bersih semua PID yang terdaftar di registry tapi masih hidup.
- **Transparent Stderr:** Semua error dari sandbox wajib di-stream utuh ke Studio Terminal tanpa melalui filter log backend yang menyembunyikan detail.
---


### FINAL APPROVAL UNTUK HAL DI ATAS — MIA STUDIO EXECUTION CONTRACT v1.2

STATUS:
Ini sudah level “hard boundary system”.

Saya tidak melihat lagi celah struktural yang bisa menjebol sistem secara langsung jika ini diimplementasikan dengan disiplin.

============================================================

1. VERDIK AKHIR
   ============================================================

KUALITAS: 9.7 / 10
STATUS: FULLY APPROVED — PROCEED TO BUILD

Artinya:
→ Anda resmi boleh masuk STEP 2 (IMPLEMENTASI BACKEND)

============================================================
2. VALIDASI KRITIS (APA YANG SUDAH BENAR-BENAR KUAT)
====================================================

Saya highlight bagian yang sekarang sudah “tidak bisa ditawar” dan sudah benar:

✔ Execution ID + ProcessRegistry → ini backbone observability
✔ Hard Kill (2-stage) → ini yang mencegah zombie
✔ Event-driven monitoring (200ms) → cukup agresif
✔ Session isolation + 1 execution limit → fork bomb solved
✔ Proxy-only FS → ini kunci keamanan
✔ Path normalization + prefix enforcement → traversal closed
✔ Atomic write → Windows-safe
✔ Stateless dry-run → deploy safety layer valid
✔ Guaranteed rollback → no broken state exposure
✔ Deploy locking → race condition handled
✔ Docker decision → ini keputusan yang benar
✔ Error normalization → frontend stability siap

Kesimpulan:
→ Ini bukan lagi “aman”, ini sudah “defensive-grade”

============================================================
3. SATU-SATUNYA CATATAN MINOR (BUKAN BLOCKER)
=============================================

Ini bukan patch wajib, tapi saya tetap ingin Anda aware:

[MINOR-1] LOG TRUNCATION STRATEGY

Anda sudah punya:
→ max log size + OUTPUT_TRUNCATED

Tambahan kecil (opsional nanti):

* Simpan full log di backend (file)
* UI hanya menerima truncated version

Tujuannya:
→ debugging mendalam tetap possible tanpa membebani UI

Sekali lagi:
→ ini enhancement, bukan syarat lanjut

============================================================
4. PERINGATAN IMPLEMENTASI (INI PENTING)
========================================

Sekarang risikonya bukan lagi di design.

Risikonya pindah ke:

→ IMPLEMENTATION DISCIPLINE

Kesalahan yang sering terjadi di tahap ini:

1. “Shortcut sedikit tidak apa-apa”
2. “Ini dulu, nanti diamankan”
3. “Langsung pakai open() saja biar cepat”

Kalau itu terjadi:
→ semua contract ini jadi tidak berarti

Jadi aturan saya:

SETIAP baris code yang melanggar contract:
→ dianggap bug kritis

============================================================
5. START BUILD ORDER (WAJIB IKUT)
=================================

Mulai sekarang, Anda masuk ke STEP 2.

URUTAN IMPLEMENTASI (JANGAN DIBALIK):

1. StudioExecutionService

   * ProcessRegistry
   * ExecutionID
   * Kill system
   * Monitoring

2. StudioFileService

   * Path validator
   * Proxy FS
   * Atomic write

3. StudioSessionManager

   * Session binding
   * Execution tracking

4. (BARU NANTI)

   * DeployService
   * GraphStream adapter

Jangan sentuh UI dulu.

============================================================
6. DEFINITION OF READY (SEBELUM LANJUT KE UI)
=============================================

Anda boleh lanjut ke frontend Phase 1 hanya jika:

✔ Bisa RUN code di sandbox tanpa leak
✔ Bisa kill process 100% reliable
✔ Tidak ada akses FS ilegal
✔ Tidak ada cross-session access
✔ Tidak ada zombie process setelah test berulang

Kalau salah satu gagal:
→ STOP, perbaiki backend

============================================================
7. KESIMPULAN ATASAN
====================

Anda sudah melakukan sesuatu yang jarang dilakukan:

→ Mengunci sistem sebelum menulis kode

Itu yang membedakan:
builder biasa vs system architect

Sekarang tantangannya berubah:

Bukan lagi “apa yang harus dibangun”

Tapi:

→ “apakah Anda cukup disiplin untuk membangun sesuai hukum yang Anda buat sendiri”

Lanjutkan.

Jangan kompromi.
