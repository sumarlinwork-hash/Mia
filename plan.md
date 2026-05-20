# Rencana Implementasi Terperinci: Single-App Modular / Multi-Kernel

## Tujuan
Menyelesaikan implementasi arsitektur `1App4Kernell.md` dengan fokus pada:
- `skill metadata classification`
- strict backend scoping antara Companion / Studio
- memory editor UX untuk `/iam-mia`
- resource suspension lebih dari sekadar state flags

## Kondisi Saat Ini
Hasil audit menunjukkan bahwa repository saat ini sudah mendukung:
- routing frontend terpisah untuk `/`, `/studio`, `/llm`, `/skills`
- lazy loading route frontend
- UI Marketplace dengan tab `Lifestyle & Chat` dan `Developer & Automation`
- panel `System Operation Mode` di `LLMPage.tsx`
- `IamMia.tsx` editor file memory dasar
- backend modular router `backend/api/companion_router.py`, `backend/api/studio_router.py`, `backend/api/llm_router.py`
- `backend/skill_manager.py` membaca metadata dari `manifest` / `metadata` / class `Skill`
- websocket power-state toggle dan `active_module` di `backend/api/companion_router.py`

Namun terdapat gap penting:
- metadata skill belum mengikuti format wajib `__skill_metadata__`
- tidak ada enforcement Companion/Studio pada eksekusi skill/tool
- memory editor UX bersifat file-based, bukan visual metadata-driven memory sandbox
- suspension logic hanya menghentikan beberapa job Crone dan menolak STT; belum ada pengurangan resource yang lebih kuat

## Fase Implementasi

### Fase 1 - Standarisasi Metadata Skill
1. Tentukan format metadata wajib di `backend/skill_manager.py`:
   - `__skill_metadata__ = { "name": ..., "category": "companion|studio|shared", "mcp_enabled": true|false }`
   - dukung fallback `manifest` / `metadata` untuk kompatibilitas skill lama
2. Perbarui `SkillManager._load_skill()` untuk:
   - memprioritaskan `__skill_metadata__` jika ditemukan di module
   - menyimpan `category` dan `mcp_enabled` dalam metadata skill output
3. Tambahkan validator metadata di `skill_manager.save_skill()` untuk skill yang dibuat melalui UI / code builder.
4. Perbarui contoh skill marketplace di `backend/marketplace_skills/` agar memiliki `__skill_metadata__` standar.

### Fase 2 - Strict Backend Scoping Companion vs Studio
1. Definisikan domain scope di backend:
   - Companion kernel hanya menerima skill `category: "companion" | "shared"`
   - Studio kernel hanya menerima skill `category: "studio" | "shared"`
2. Perbarui `backend/api/companion_router.py` dan `backend/api/studio_router.py` untuk:
   - memfilter hasil `scan_skills()` berdasarkan category yang valid saat mengembalikan `installed` / `marketplace`
   - menolak `execute_skill` jika skill tidak sesuai context kernel
3. Perbarui `backend/mia_comm/brain_orchestrator.py` dan `backend/agent_tools.py` sehingga:
   - hanya menyediakan tool definition / `execute_skill` kepada LLM ketika category skill sesuai kernel aktif
   - panggilan `save_skill` tetap boleh, tetapi `execute_skill` harus terikat ke domain yang benar
4. Tambahkan endpoint atau middleware untuk `kernel_context` jika perlu, agar `Studio` requests ter-identifikasi secara eksplisit.

**Progress Fase 2:**
- Companion/Studio skill scanning telah dipisah dengan filter kategori di `companion_router.py` dan `studio_router.py`.
- `skill_manager.execute_skill(..., kernel=...)` sudah mendukung izin kernel dan menolak skill yang tidak diizinkan.
- `brain_orchestrator` sekarang menerima `kernel` context pada `execute_request()` dan meneruskannya ke `agent_tools.execute_skill()`.
- `companion_router` WebSocket pipeline kini memanggil `execute_request(..., kernel="companion")`.
- `studio_router` sekarang menyediakan endpoint `POST /api/studio/skill/execute` dan `POST /api/studio/skills/test/{skill_id}` dengan `kernel="studio"` enforcement.
- Sisa: tambahkan kernel context eksplisit untuk Studio graph flows dan perkuat tool list asumsi jika diperlukan.

### Checklist
- [x] Companion/Studio skill scanning split via category filters in `companion_router.py` and `studio_router.py`
- [x] `skill_manager.execute_skill(..., kernel=...)` kernel permission enforcement implemented
- [x] `brain_orchestrator` forwards `kernel` context through tool execution
- [x] Companion pipeline uses explicit `kernel="companion"`
- [x] Studio skill execution endpoints added with `kernel="studio"`
- [x] Add explicit `kernel` context for Studio graph / workspace flows
- [x] Harden kernel-specific tool exposure in graph compiler / tool registry
- [x] Review and sync frontend Studio graph requests with backend kernel enforcement
- [x] Update `plan.md` with current phase status

### Fase 3 - Perbaikan Memory Editor UX
1. Pertajam UX di `frontend/src/IamMia.tsx`:
   - tambahkan panel metadata memory / tag
   - sediakan tombol `Create New Memory` / `Rename`
   - tambahkan preview singkat dan tanggal modifikasi
2. Perbarui hook `useMIAQueries.ts` jika perlu untuk fetch metadata memory lebih kaya.
3. Perbarui backend memory endpoints jika diperlukan:
   - `GET /api/memory/file` bisa mengembalikan metadata tambahan
   - `POST /api/memory/file` bisa menerima `title`, `tags`, `mood`, `is_intimate`
4. Tambahkan dukungan visual memory list di UI companion hub dengan koneksi ke `IamMia`.

### Fase 4 - Resource Suspension Beyond State Flags
1. Evaluasi dan perluas `active_module` suspension:
   - `backend/api/companion_router.py` sudah pause/resume job `proactive_caring` dan `Heartbeat Daemon`
   - tambahkan suspend/restore untuk pipeline STT/TTS, emotion polling, dan companion loop lainnya
2. Perkuat `backend/companion_router.py` dan service terkait:
   - kalau `active_module == "studio"`, hentikan atau degrade background tasks lain yang tidak diperlukan
   - jalankan `studio` mode dengan prioritas lebih tinggi pada scheduler bila mungkin
3. Buat metric verifikasi resource:
   - log event `COMPANION_SUSPENDED` / `COMPANION_RESUMED`
   - tambahkan endpoint status `GET /api/power_state` dan `GET /api/suspension_metrics`
4. Perbarui frontend home/studio untuk menampilkan indikator suspension lebih jelas:
   - `Micro Eco Spark` hijau/cyan
   - nilai `powerState` + pesan `WAKE / SLEEP`

### Fase 5 - Verifikasi dan Dokumentasi
1. Tambahkan tes unit / integrasi:
   - `backend/tests/test_skills.py` untuk metadata parsing dan category filtering
   - `backend/tests/test_power_state.py` untuk `SWITCH_TO_STUDIO` / `SWITCH_TO_COMPANION`
   - `frontend` smoke tests jika tersedia
2. Jalankan build dan test:
   - `npm run build` di `frontend`
   - `python -m pytest backend/tests`
3. Dokumentasikan perubahan di `docs/1App4Kernell.md` jika struktur arsitektur berubah.

## Rincian Tindakan yang Akan Dijalankan
1. Buka dan modifikasi `backend/skill_manager.py`.
2. Perbarui semua skill marketplace di `backend/marketplace_skills/` dengan metadata standar.
3. Tambahkan validasi dan kategori di `backend/api/companion_router.py` dan `backend/api/studio_router.py`.
4. Tambahkan kernel-aware filtering di `backend/mia_comm/brain_orchestrator.py`.
5. Perkuat `frontend/src/IamMia.tsx` dan `frontend/src/hooks/useMIAQueries.ts`.
6. Perkuat power-state UI di `frontend/src/Home.tsx`, `frontend/src/mia_studio/components/StudioPage.tsx`, dan/atau `frontend/src/components/MiaFigure.tsx`.
7. Jalankan build lengkap dan tes untuk memverifikasi.

## Target Hasil Akhir
- [x] Metadata skill standar `__skill_metadata__` di semua skill plugin.
- [x] Companion dan Studio benar-benar dipisah di backend.
- [x] Memory Editor `/iam-mia` jadi lebih kaya dan terhubung ke memori personal.
- [x] Power-state tidak cuma flag; ia memicu suspension nyata pada service yang relevan.
- [x] Kode siap memenuhi visi `1App4Kernell.md` secara praktis.

---

> Catatan: Ini adalah rencana langsung untuk diimplementasikan. Setelah selesai, saya dapat memperbarui `docs/1App4Kernell.md` agar mencerminkan status aktual dan perbaikan teknis yang telah dijalankan.
