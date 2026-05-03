# MIA's Memory System (A-Z)
**Dokumen Referensi Resmi Arsitektur Memori MIA**

MIA menggunakan arsitektur memori multi-layer (*Multi-Tiered Memory Architecture*) yang menggabungkan kecepatan database relasional, fleksibilitas *markdown file*, dan pencarian semantik (Vector DB). Sistem ini dirancang untuk memiliki **Single Source of Truth (SSOT)** dan mensinkronisasikan UI (User Interface) dengan Backend secara absolut.

---

## 1. Tiga Lapis Memori (The 3 Tiers)

MIA mengklasifikasikan ingatannya menjadi tiga lapis utama yang dirakit oleh `MemoryOrchestrator` menjadi satu konteks yang utuh sebelum diberikan ke LLM:

### Tier 1: Core Declarative Memory (Ingatan Inti)
Ini adalah ingatan absolut dan aturan yang mendasari eksistensi MIA. Semuanya berupa file markdown statis di dalam folder `backend/iam_mia/`.
*   **`SOUL.md`**: Mendefinisikan kepribadian, gaya bicara, dan persona dasar MIA.
*   **`USER.md`**: Informasi eksplisit tentang pengguna (Bos).
*   **`MEMORY.md`**: Catatan fakta jangka panjang tentang pengguna (Umum).
*   **`INTIMACY.md`**: Catatan momen personal dan fakta intim yang diisolasi secara ketat.
*   **`TOOLS.md`, `AGENTS.md`**: Konteks opsional kapabilitas *tools* dan instruksi agen (otomatis di-load di `POWER_MODE`).

### Tier 2: Real-time Episodic Memory (Ingatan Jangka Pendek & Log Chat)
Ini adalah ingatan mengenai percakapan yang sedang berlangsung (riwayat chat).
*   Disimpan di database SQLite (`backend/history/chat_history.db`).
*   Secara otomatis di-sinkronisasikan ke file **`backend/iam_mia/memory/chat_log.md`**.

### Tier 3: Semantic Vector Memory (Ingatan Semantik & Jangka Panjang)
Kumpulan memori masa lalu yang diubah menjadi vektor.
*   **ChromaDB** (`backend/iam_mia/chroma_db/`).
*   **Isolasi Namespace**: `mia_general` dan `mia_intimate`.

---

## 2. Arsitektur Sinkronisasi Memori (SSOT - Single Source of Truth)

Untuk mencegah desync, diterapkan arsitektur sinkronisasi *strict* pada **`history_manager.py`**:
1. **SQLite sebagai UI Source**: Semua aksi dari *frontend* hanya mengubah SQLite.
2. **`_sync_to_markdown()` Trigger**: Setiap operasi CRUD otomatis men-trigger penulisan ulang file `chat_log.md`.
3. **Hasil**: File `chat_log.md` adalah cerminan absolut dari UI.

---

## 3. Sistem Meta-RAG Pruning (Crone Daemon)

MIA dilengkapi dengan "Otak Bawah Sadar" yang memproses ingatan saat MIA beristirahat (**`crone_daemon.py`**).

**Algoritma Pruning Malam Hari (03:00 AM):**
1. **Pendeteksian Konten**: Daemon mendeteksi apakah log chat harian bersifat intim.
2. **Isolasi Tier 3 (Vector)**: Log di-*embed* ke namespace ChromaDB yang sesuai (`general` vs `intimate`).
3. **Isolasi Tier 1 (Markdown Fakta)**: 
   - Fakta umum ditambahkan ke **`MEMORY.md`**.
   - Fakta personal/intim ditambahkan ke **`INTIMACY.md`**.
4. **Validasi Anti-Penolakan**: Menjamin tidak ada teks "Safety Block" LLM yang masuk ke memori permanen.

---

## 4. Aliran Perakitan Prompt (Mode-Aware Context Assembly)

`MemoryOrchestrator` merakit konteks berdasarkan mode operasional:
1. **Core Identity**: Membaca `SOUL.md`, `USER.md`, dan `MEMORY.md`.
2. **Mode-Aware Loading**:
   - **`POWER_MODE`**: Otomatis menyertakan `TOOLS.md` dan `AGENTS.md`.
   - **`is_intimate=True`**: Otomatis menyertakan `INTIMACY.md`.
3. **Semantic RAG**: Mengambil 3 memori relevan dari namespace Vector DB yang sedang aktif.
4. **Episodic Feed**: Menempelkan riwayat chat terbaru dari `chat_log.md`.

---

## 5. Status Implementasi & Arsitektur Isolasi (Fact-Check 03-05-2026)

Berdasarkan audit terbaru, sistem memori MIA telah mencapai level **Military-Grade Resilience & Privacy**:

### ✅ GAP 1: Amnesia Jangka Pendek (RESOLVED)
MIA kini memiliki kontinuitas percakapan 100% tersinkronisasi dengan UI melalui injeksi Tier 2 otomatis.

### ✅ GAP 2: Isolasi NSFW & Privasi (RESOLVED)
Sistem mengisolasi konten sensitif melalui empat lapis pengamanan:
1.  **Namespace Isolation (Tier 3)**: Pemisahan database vektor umum dan intim.
2.  **File Isolation (Tier 1)**: Fakta intim tidak pernah bercampur di `MEMORY.md`.
3.  **Mode-Aware Trigger**: Pemuatan konteks otomatis yang cerdas berbasis `ModeHub`.
4.  **Routing Prioritas**: `RoutingService` memprioritaskan provider "Uncensored" 10x lebih tinggi saat mode intimasi aktif.

[Final Update: 03-05-2026 13:06]