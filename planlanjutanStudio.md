# Implementasi Lanjutan: 1 Shell, 5 Kernels

## Status Terbaru

Dokumen ini sudah di-update berdasarkan audit kode setelah implementasi lanjutan. Status di bawah adalah kondisi repo saat ini, bukan rencana lama.

---

## Fact-Check Result: Apa yang Sudah Ada

| Item | Status | Catatan |
|---|---|---|
| 5 Route: `/companion`, `/studio`, `/llm`, `/creator`, `/market` | Selesai | Semua route ada di `frontend/src/App.tsx`. |
| Sidebar 5 kernel | Selesai | `Sidebar.tsx` menampilkan Companion, Studio, LLM Warehouse, Creator, Market. |
| Power-state switching 5 kernel | Selesai | `App.tsx` mengirim `SWITCH_TO_*` berdasarkan route aktif. |
| Backend router: Companion, Studio, LLM | Selesai | Router terpisah sudah ada di `backend/api/`. |
| Backend router: Market | Partial | `market_router.py` sudah punya list/install/uninstall/test dan filter `market`. Belum ada policy gate/approval per market. |
| Backend router: Creator | Partial | `creator_router.py` sudah punya project/assets/timeline/preview/export/render-status skeleton in-memory. Belum persisted/terhubung renderer nyata. |
| `main.py` mounting semua router | Selesai | 5 router sudah di-include. |
| Global theme via `useTheme` + `useConfig` | Selesai | Creator tetap memakai global appearance config. |
| Global Shell Status Bar | Selesai | `frontend/src/shell/ShellStatusBar.tsx` sudah dibuat dan dipasang di `App.tsx`. |
| Market tab split | Selesai | `Market.tsx` sudah punya Companion Market, Studio Market, Creator Market dan query `/api/market/skills?market=...`. |
| `SkillMarketplace.tsx` | Tidak ada | File lama tidak ada di repo. Route `/market` memakai `frontend/src/Market.tsx`. |
| Studio Activity Stream | Partial | `StudioActivityStream.tsx` sudah ada dan dipakai, tapi masih render event/log sederhana. Belum event taxonomy lengkap, expand/collapse, file excerpt, command detail. |
| Studio Bottom Composer | Partial | `StudioComposer.tsx` sudah ada: follow-up input, stop, auto-review, model selector trigger, attachment button, changed-files strip. Belum effort selector dan approval banner nyata. |
| Studio built-in tools API | Partial | Endpoint search/read-file/apply-patch/run-command/status/stop/changed-files/diff sudah ada. Belum policy gate, real stop process, verification endpoint, command sandbox hardening. |
| Review Changes surface | Partial | `ReviewChanges.tsx` sudah ada. Belum fetch daftar file/diff nyata dan undo masih placeholder. |
| Creator Kernel UI | Partial | `Creator.tsx` sudah menjadi Creator Cockpit dengan brief, asset bin, timeline, preview, render/export, activity. Belum terhubung backend state. |
| Creator backend | Partial | Endpoint skeleton sudah ada. Belum database, file upload, render engine, export artifacts. |
| Action/Automation Orchestrator | Belum | Belum ada orchestrator lintas-kernel. |
| `Review First` / `Always Execute` | Belum | Belum ada policy preference global. |
| SQLite tables baru SSOT | Belum | Belum ada migrasi untuk tasks, approvals, creator projects, command runs, market installs. |
| Monaco dependency | Drift | `@monaco-editor/react` masih di `package.json`, belum dipakai. |

---

## Yang Sudah Dikerjakan dari Rencana Lama

### Fase C: Market Split

- Selesai: `frontend/src/Market.tsx` punya 3 tab market.
- Selesai: tab market memanggil `/api/market/skills?market=companion|studio|creator`.
- Selesai: install/use flow lama tetap dipertahankan.
- Selesai: `backend/api/market_router.py` punya `/api/market/skills/test/{skill_id}`.
- Partial: filtering `market` sudah ada, termasuk `shared` untuk Companion.

### Fase A: Shell Status Bar

- Selesai: `frontend/src/shell/ShellStatusBar.tsx` dibuat.
- Selesai: `App.tsx` meng-inject status bar global.
- Selesai: status bar menampilkan active kernel, WebSocket status, active model, provider health placeholder, approvals count placeholder, running tasks placeholder, emergency stop button.
- Belum: data approvals/tasks/provider health masih statis.

### Fase B: Studio Cockpit

- Selesai: `StudioComposer.tsx` dibuat dan dipasang.
- Selesai: `ReviewChanges.tsx` dibuat dan dipasang.
- Partial: `StudioActivityStream.tsx` sudah ada, tapi masih basic renderer.
- Partial: layout Studio masih mempertahankan chat lama, terminal, graph, resilience monitor, task planner. Belum full SSOT cockpit replacement.
- Partial: backend tools API skeleton sudah ditambah.

### Fase D: Creator Cockpit

- Selesai: `Creator.tsx` di-expand dari DALL preview menjadi cockpit.
- Selesai: ada brief composer, asset bin, timeline placeholder, preview panel, render/export mock, activity.
- Selesai: `creator_router.py` punya endpoint skeleton sesuai daftar rencana.
- Belum: UI belum consume backend endpoint Creator.

---

## Gap yang Masih Terbuka

### MVP 1: Shell Alignment

Status: hampir selesai.

- Belum: Shell Status Bar mengambil jumlah pending approvals dari backend.
- Belum: Shell Status Bar mengambil running tasks dari backend.
- Belum: emergency stop terhubung ke orchestrator/command registry nyata, sekarang hanya mengirim event WebSocket `EMERGENCY_STOP`.
- Belum: provider health indicator memakai data nyata dari health check provider.

### MVP 2: Studio Cockpit

Status: partial, masih paling besar.

- Belum: Activity stream taxonomy resmi: `thought`, `analyzed_file`, `searched`, `edited`, `ran_command`, `command_status`, `waiting`, `verification_result`, `changed_files`, `blocked`.
- Belum: expand/collapse event activity stream.
- Belum: file badge yang membuka read-only excerpt.
- Belum: command badge dengan stdout/stderr ringkas per command.
- Belum: `GET /api/studio/tools` untuk registry tools, sesuai SSOT.
- Belum: `POST /api/studio/tools/run-verification`.
- Belum: real command stop. Endpoint stop saat ini hanya menandai `stop_requested`, belum terminate process.
- Belum: apply-patch endpoint masih skeleton approval, belum apply patch aman.
- Belum: Review Changes fetch `changed-files` dan `diff` nyata.
- Belum: Undo own changes.
- Belum: task planner lama/hardcoded masih ada di `StudioPage.tsx`.
- Belum: dummy chat response masih ada di `StudioPage.tsx`.

### MVP 3: Market Split

Status: UI split selesai, policy belum.

- Belum: metadata skill semua marketplace belum dimigrasi/ditandai `market`.
- Belum: strict skill boundary per market.
- Belum: Companion Market policy melarang file edit/terminal/Git/dependency install/PC automation berisiko.
- Belum: Studio Market policy gate + approval untuk aksi berisiko.
- Belum: Creator Market media approval untuk folder media, render panjang, overwrite output, voice/brand identity, publish sosial.
- Belum: test skill endpoint belum punya sandbox/policy wrapper.

### MVP 4: Creator Kernel

Status: cockpit skeleton selesai.

- Belum: Creator UI belum memakai `/api/creator/projects`.
- Belum: project state masih local UI dan backend in-memory.
- Belum: asset upload/read folder media.
- Belum: preview/render engine nyata.
- Belum: export output artifact.
- Belum: media approval flow.
- Belum: timeline model belum persisted.

### Cross-Kernel / SSOT

Status: belum.

- Belum: Action/Automation Orchestrator.
- Belum: global approval model: `Review First`, `Always Execute`, emergency stop semantics.
- Belum: SQLite migrations untuk:
  - `approvals`
  - `tasks`
  - `command_runs`
  - `creator_projects`
  - `creator_assets`
  - `creator_timelines`
  - `market_installs`
  - `kernel_events`
- Belum: unified event stream lintas kernel.
- Belum: persistence untuk running task dan audit log.

---

## Backend Endpoint Status

### Market

Sudah ada:

```txt
GET    /api/market/skills
POST   /api/market/skills/install/{skill_id}
DELETE /api/market/skills/uninstall/{skill_id}
POST   /api/market/skills/test/{skill_id}
```

Belum:

```txt
GET    /api/market/policies
POST   /api/market/skills/{skill_id}/approve
GET    /api/market/skills/{skill_id}/risk
```

### Studio

Sudah ada:

```txt
POST /api/studio/tools/search
POST /api/studio/tools/read-file
POST /api/studio/tools/apply-patch
POST /api/studio/tools/run-command
GET  /api/studio/tools/command-status/{id}
POST /api/studio/tools/stop-command/{id}
GET  /api/studio/tools/changed-files
GET  /api/studio/tools/diff
```

Belum:

```txt
GET  /api/studio/tools
POST /api/studio/tools/run-verification
POST /api/studio/tools/revert-own-change
GET  /api/studio/activity
GET  /api/studio/approvals
POST /api/studio/approvals/{id}/approve
POST /api/studio/approvals/{id}/reject
```

### Creator

Sudah ada:

```txt
GET   /api/creator/status
GET   /api/creator/projects
POST  /api/creator/projects
GET   /api/creator/projects/{id}
PATCH /api/creator/projects/{id}
POST  /api/creator/projects/{id}/assets
POST  /api/creator/projects/{id}/timeline
POST  /api/creator/projects/{id}/preview
POST  /api/creator/projects/{id}/export
GET   /api/creator/projects/{id}/render-status
```

Belum:

```txt
POST /api/creator/projects/{id}/assets/upload
GET  /api/creator/projects/{id}/assets
GET  /api/creator/projects/{id}/timeline
GET  /api/creator/projects/{id}/activity
POST /api/creator/projects/{id}/approve-media-action
GET  /api/creator/projects/{id}/exports
```

---

## Verification Status

### Automated

- Selesai: `npm.cmd run build` di `frontend` sukses.
- Belum: `python -m py_compile backend/api/*.py` belum bisa dijalankan karena Python lokal tidak tersedia.
  - `py -0p` melaporkan tidak ada Python terinstall.
  - `.venv/pyvenv.cfg` menunjuk ke `C:\Users\ISLAMIAH\AppData\Local\Programs\Python\Python311\python.exe`, tapi executable itu tidak ada.

### Manual

Belum dilakukan penuh.

Checklist manual yang masih perlu:

1. Buka `/companion` dan pastikan Companion normal.
2. Buka `/studio` dan pastikan composer/review/activity stream tampil.
3. Buka `/market` dan pastikan 3 tab market tampil serta fetch sesuai tab.
4. Buka `/creator` dan pastikan Creator Cockpit tampil.
5. Buka `/llm` dan pastikan LLM Warehouse normal.
6. Pastikan Shell Status Bar muncul di semua kernel selain onboarding.
7. Pastikan route switch masih mengirim event WebSocket.

Catatan: Vite foreground berhasil menunjukkan `http://127.0.0.1:5173/`, tetapi proses dev server background dari shell ini tidak berhasil dipertahankan.

---

## Prioritas Berikutnya yang Disarankan

1. **Studio real Review Changes**
   - Hubungkan `ReviewChanges.tsx` ke `/api/studio/tools/changed-files` dan `/api/studio/tools/diff`.
   - Tambah diff viewer read-only.
   - Tambah run verification endpoint.

2. **Studio command lifecycle**
   - Simpan process handle di command registry.
   - Implement real terminate di `/api/studio/tools/stop-command/{id}`.
   - Tambah command event ke activity stream.

3. **Shell status data nyata**
   - Endpoint untuk pending approvals dan running tasks.
   - Hubungkan status bar ke endpoint itu.

4. **Creator backend integration**
   - Creator UI create/load project dari `/api/creator/projects`.
   - Asset bin dan timeline consume backend state.

5. **Policy/Approval Orchestrator**
   - Implement `Review First` / `Always Execute`.
   - Gate command, patch, market skill test, media export.

6. **SQLite persistence**
   - Tambah migrasi untuk project Creator, approvals, command runs, kernel events, market installs.

---

## File yang Berubah dalam Implementasi Terakhir

Frontend:

- `frontend/src/App.tsx`
- `frontend/src/Market.tsx`
- `frontend/src/Creator.tsx`
- `frontend/src/shell/ShellStatusBar.tsx`
- `frontend/src/mia_studio/components/StudioPage.tsx`
- `frontend/src/mia_studio/components/StudioComposer.tsx`
- `frontend/src/mia_studio/components/ReviewChanges.tsx`

Backend:

- `backend/api/market_router.py`
- `backend/api/studio_router.py`
- `backend/api/creator_router.py`

Repo note:

- `.agent.PLANNER.agent.md` dan `.agent.bane.READER.agent.md` terlihat sebagai untracked file sebelum update dokumen ini. Saya tidak mengubah atau menghapusnya.
