# Implementasi Lanjutan: 1 Shell, 5 Kernels

## Konteks

Berdasarkan fact-check langsung terhadap kode aktual (bukan asumsi), berikut adalah status real kondisi repo:

---

## Fact-Check Result: Apa yang Sudah Ada

| Item | Status | Catatan |
|---|---|---|
| 5 Route: `/companion`, `/studio`, `/llm`, `/creator`, `/market` | ✅ Ada | Semua route sudah terdaftar di `App.tsx` |
| Sidebar 5 kernel | ✅ Ada | `Sidebar.tsx` menampilkan Companion, Studio, LLM Warehouse, Creator, Market |
| Power-state switching 5 kernel | ✅ Ada | `App.tsx` mengirim `SWITCH_TO_*` per route (semua 5 kernel) |
| Backend router: Companion, Studio, LLM | ✅ Ada | Router terpisah di `backend/api/` |
| Backend router: Market | ✅ Skeleton | `market_router.py` (1.5KB) — hanya list/install/uninstall skills |
| Backend router: Creator | ✅ Skeleton | `creator_router.py` (708B) — hanya `/status` dan `/projects` kosong |
| `main.py` mounting semua router | ✅ Ada | 5 router sudah di-include |
| Creator.tsx | ✅ Skeleton | DALL preview card UI, theme-aware, belum punya cockpit |
| Market.tsx | ✅ Stub | Placeholder teks saja, belum ada tab Companion/Studio/Creator |
| SkillMarketplace.tsx | ✅ Ada | Full marketplace lama, masih memakai kategori lama |
| Global theme via `useTheme` + `useConfig` | ✅ Ada | Creator sudah implement ini |
| Studio Activity Stream | ❌ Belum | `StudioPage.tsx` masih pakai chat + terminal. Tidak ada event stream resmi |
| Studio Bottom Composer (SSOT-spec) | ❌ Belum | Ada input chat biasa, belum ada follow-up/stop/auto-review/model-selector sesuai SSOT |
| Studio built-in tools API | ❌ Belum | Backend punya service tapi belum ada tool layer eksplisit |
| Review Changes surface | ❌ Belum | Belum ada |
| Global Shell Status Bar | ❌ Belum | Belum ada surface tunggal |
| Market tab split (Companion/Studio/Creator) | ❌ Belum | Market.tsx masih stub |
| Creator Kernel UI lengkap | ❌ Belum | Hanya DALL preview card |
| Creator backend lengkap | ❌ Belum | Hanya skeleton `/status` dan `/projects []` |
| Action/Automation Orchestrator | ❌ Belum | Tidak ada |
| `Review First` / `Always Execute` | ❌ Belum | Tidak ada |
| SQLite tables baru (SSOT) | ❌ Belum | Hanya `config_store` yang ada |
| Monaco dependency | ⚠️ Drift | `@monaco-editor/react` masih di package.json, tidak dipakai |

---

## Open Questions

> [!IMPORTANT]
> **Prioritas mana yang diinginkan user?**
> Dokumen SSOT memiliki banyak gap. Saya perlu konfirmasi urutan MVP mana yang dikerjakan sekarang.

> [!WARNING]
> **Market.tsx vs SkillMarketplace.tsx**
> Saat ini `/market` route pakai `SkillMarketplace.tsx` (bukan `Market.tsx`). Market.tsx adalah stub kosong. Apakah Market.tsx yang harus dikembangkan menjadi full Market Kernel (dengan 3 tab), atau SkillMarketplace.tsx yang direfactor?
>
> Cek faktual: di `App.tsx` line 10-11:
> ```tsx
> const MarketLazy = lazy(() => import('./SkillMarketplace'));  // ini yang dipakai di /market
> const CreatorLazy = lazy(() => import('./Creator'));
> ```
> Jadi `/market` saat ini render `SkillMarketplace.tsx`, bukan `Market.tsx`.

---

## Gap Prioritas (berdasarkan MVP Phasing SSOT)

### MVP 1: Shell Alignment ✅ Sudah Selesai
- 5 route skeleton → **Done**
- Sidebar 5 kernel → **Done**  
- Kernel switch events → **Done**
- Shell status bar → **Belum ada** (1 item sisa)

### MVP 2: Studio Cockpit ← **Target Utama Berikutnya**
- Activity stream → **Belum**
- Studio composer (SSOT-spec) → **Belum**
- Built-in tools API skeleton → **Belum**
- Changed-files summary → **Belum**
- Review Changes → **Belum**

### MVP 3: Market Split ← **Target Paralel**
- Market router → **Skeleton ada**
- Market UI tabs: Companion, Studio, Creator → **Belum**
- Skill metadata migration → **Partial** (skill_manager sudah support, UI belum)

### MVP 4: Creator Skeleton ← **Sebagian ada**
- Creator page → **DALL preview ada, cockpit belum**
- Asset bin → **Belum**
- Preview panel → **Belum**
- Timeline placeholder → **Belum**
- Render/export mock → **Belum**

---

## Proposed Changes

### Fase A: Shell Status Bar (MVP 1 completion)

#### [NEW] `frontend/src/shell/ShellStatusBar.tsx`
Global status bar yang selalu terlihat:
- Active kernel pill
- WebSocket status dot
- Active model badge
- Provider health indicator
- Pending approvals badge
- Running tasks badge
- Emergency stop button

#### [MODIFY] [App.tsx](file:///d:/ProjectBuild/projects/mia/frontend/src/App.tsx)
- Inject `ShellStatusBar` di luar `<main>` agar selalu visible
- Posisi: top atau bottom bar, sebelum sidebar

---

### Fase B: Studio Activity Stream (MVP 2 core)

#### [NEW] `frontend/src/mia_studio/components/StudioActivityStream.tsx`
Komponen baru untuk menampilkan event stream real-time:
- Event types: `thought`, `analyzed_file`, `searched`, `edited`, `ran_command`, `command_status`, `waiting`, `verification_result`, `changed_files`, `blocked`
- Setiap event bisa expand/collapse
- Spinner untuk event yang masih berjalan
- File badge → buka read-only excerpt
- Command badge → tampilkan stdout/stderr ringkas

#### [NEW] `frontend/src/mia_studio/components/StudioComposer.tsx`
Bottom composer sesuai SSOT:
- Follow-up task input
- Stop button (connected ke execution)
- Auto-review toggle
- Model/effort selector
- Attachment button (`+`)
- Submit (send) button
- Changed-files summary strip di atas composer
- Pending approval state banner

#### [NEW] `frontend/src/mia_studio/components/ReviewChanges.tsx`
Review changes surface:
- Daftar file berubah dengan status (added/modified/deleted)
- Addition/deletion count
- Diff read-only viewer (syntax highlight, no edit)
- Undo button → revert own changes
- Run verification button
- Request follow-up button

#### [MODIFY] [StudioPage.tsx](file:///d:/ProjectBuild/projects/mia/frontend/src/mia_studio/components/StudioPage.tsx)
- Ganti chat+terminal layout dengan activity-stream cockpit layout
- Integrasikan `StudioActivityStream`, `StudioComposer`, `ReviewChanges`
- Pertahankan: GardenLauncher, Git status, IDE selector (sebagai opsional/secondary)
- Hapus: hardcoded task checklist, dummy messages

#### Backend additions untuk Studio built-in tools:
#### [MODIFY] [studio_router.py](file:///d:/ProjectBuild/projects/mia/backend/api/studio_router.py)
Tambah tool endpoint stubs:
```
POST /api/studio/tools/search
POST /api/studio/tools/read-file
POST /api/studio/tools/apply-patch
POST /api/studio/tools/run-command
GET  /api/studio/tools/command-status/{id}
POST /api/studio/tools/stop-command/{id}
GET  /api/studio/tools/changed-files
GET  /api/studio/tools/diff
```

---

### Fase C: Market Split (MVP 3)

#### [MODIFY] [SkillMarketplace.tsx](file:///d:/ProjectBuild/projects/mia/frontend/src/SkillMarketplace.tsx)
- Tambah 3 tabs: Companion Market | Studio Market | Creator Market
- Tab filter memanggil `/api/market/skills?market=companion` dll
- Pertahankan install/uninstall flow yang sudah ada

#### [MODIFY] [market_router.py](file:///d:/ProjectBuild/projects/mia/backend/api/market_router.py)
- Tambah `/api/market/skills/test/{skill_id}`
- Pastikan filtering `market` param berfungsi dengan benar

---

### Fase D: Creator Cockpit (MVP 4)

#### [MODIFY] [Creator.tsx](file:///d:/ProjectBuild/projects/mia/frontend/src/Creator.tsx)
Expand dari DALL preview menjadi Creator Cockpit:
- Brief composer (textarea + submit)
- Asset bin section (placeholder dengan structure)
- Timeline placeholder (visual bar)
- Preview player placeholder
- Render/export status panel
- Activity stream (media events)
- Pertahankan: theme-aware styling yang sudah ada

#### [MODIFY] [creator_router.py](file:///d:/ProjectBuild/projects/mia/backend/api/creator_router.py)
Tambah endpoint Creator sesuai SSOT:
```
POST /api/creator/projects
GET  /api/creator/projects/{id}
PATCH /api/creator/projects/{id}
POST /api/creator/projects/{id}/assets
POST /api/creator/projects/{id}/timeline
POST /api/creator/projects/{id}/preview
POST /api/creator/projects/{id}/export
GET  /api/creator/projects/{id}/render-status
```

---

## Verification Plan

### Automated
- `npm run build` di frontend — harus 0 error
- `python -m py_compile backend/api/*.py` — syntax clean

### Manual
1. Buka `/companion` → Companion normal
2. Buka `/studio` → Activity stream cockpit tampil (bukan chat lama)
3. Buka `/market` → 3 tabs (Companion/Studio/Creator) terlihat
4. Buka `/creator` → Creator cockpit dengan section asset bin, timeline, preview, render
5. Buka `/llm` → LLM Warehouse normal
6. Shell Status Bar selalu terlihat di semua kernel
7. WebSocket switch events terfiring saat pindah kernel

---

## Urutan Eksekusi yang Disarankan

1. **Fase C: Market Split** — paling mudah, value langsung terlihat, tidak merusak yang sudah ada
2. **Fase A: Shell Status Bar** — 1 file baru, inject ke App.tsx
3. **Fase B: Studio Activity Stream** — terbesar, tapi sesuai SSOT paling penting
4. **Fase D: Creator Cockpit** — expand skeleton yang sudah ada

> [!NOTE]
> Saya akan mengerjakan sesuai urutan yang user setujui. Tidak ada coding sebelum user approve rencana ini.
