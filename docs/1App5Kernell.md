# SSOT: 1 Shell, 5 Independent Kernels

Dokumen ini adalah Single Source of Truth untuk arah flagship MIA setelah perubahan paradigma terbaru:

**MIA bukan web IDE. MIA adalah AI Operating Shell yang menjadi perantara antara User, LLM, dan PC.**

**MIA adalah My Intelligent Assistant: asisten pribadi sekaligus pasangan digital user yang membantu mempermudah hidup nyata.** MIA boleh menemani, mengingat, merawat konteks hidup user, mengurus pekerjaan praktis, menyiapkan pembelian, membantu penjualan, booking tiket/hotel/konser, mengatur jadwal, mengirim komunikasi, membuat konten, dan menjalankan workflow digital lintas aplikasi. Semua aksi eksternal tetap berjalan secara governed melalui pilihan user: `Review First` atau `Always Execute` dengan batas nominal, sumber dana, scope, audit log, dan izin yang jelas.

Frontend MIA tidak bertugas menjadi tempat user mengedit kode secara manual. Frontend bertugas menjadi panel kendali yang ringan, jelas, dan aman. LLM menjadi otak perencana, backend menjadi tangan yang berinteraksi dengan PC, dan Shell menjadi tempat user melihat rencana, memberi izin, memantau eksekusi, serta menerima hasil.

Monaco atau editor kode berat tidak menjadi fondasi produk. Bila ada tampilan kode, sifatnya hanya preview, diff, atau read-only inspection. Editing file dilakukan oleh LLM/tool backend melalui policy gate, bukan melalui browser IDE.

---

## Prinsip Utama

1. **1 Shell**
   Satu aplikasi utama yang menjadi cockpit kendali. Shell mengatur navigasi, status global, mode aktif, permission prompt, event log, dan komunikasi antar-kernel.

2. **5 Independent Kernels**
   Companion, Studio, LLM Warehouse, Creator, dan Market berjalan sebagai domain mandiri. Tiap kernel punya state, API, permissions, dan UI surface sendiri.

3. **App Sebagai Perantara**
   App tidak menggantikan PC, terminal, editor lokal, atau file explorer. App menghubungkan user dengan LLM dan PC tools secara governed.

4. **No Silent Failure**
   Setiap aksi besar wajib menampilkan status: planned, waiting approval, running, succeeded, failed, fallback, atau blocked.

5. **Strict Permission Boundary**
   Companion tidak boleh mengakses tool kerja berisiko. Studio tidak boleh menarik modul intimacy/persona kecuali dinyatakan shared dan aman.

6. **Low Hardware Burden**
   UI harus ringan. Hindari editor berat, render loop berlebihan, efek visual mahal, dan background process yang tidak aktif saat kernel lain sedang dipakai.

---

## Principal Guidelines

Guideline ini adalah kompas implementasi flagship MIA. Setiap fitur baru harus lulus prinsip di bawah sebelum dianggap layak masuk core app.

### 1. Clarity First

User harus selalu tahu sedang berada di kernel mana dan untuk apa:

- Companion untuk relasi personal dan assistant harian.
- Studio untuk eksekusi PC/dev workflow.
- LLM Warehouse untuk model, provider, fallback, dan budget.
- Creator untuk produksi konten dan video editing.
- Market untuk menambah kemampuan.

Jika sebuah fitur tidak jelas masuk kernel mana, jangan langsung ditambahkan. Putuskan domainnya dulu.

### 2. Trust Before Power

MIA boleh sangat mampu, tetapi tidak boleh terasa liar. Semua aksi eksternal harus governed.

Wajib ada:

- `Review First`
- `Always Execute` dengan limit dan scope
- approval screen yang jelas
- audit log
- dry-run untuk aksi berisiko
- emergency stop
- policy untuk high-stakes action

MIA boleh menyiapkan pembelian, booking, upload, publish, atau command. Tetapi eksekusi final harus mengikuti policy user.

### 3. Execution Must Be Visible

MIA tidak boleh bekerja dalam diam. User harus bisa melihat apa yang sedang terjadi.

Setiap kernel yang mengeksekusi aksi harus punya activity stream yang menampilkan:

- sedang berpikir/merencanakan
- membaca konteks
- mencari data
- menjalankan tool
- menunggu proses
- berhasil/gagal
- butuh approval
- hasil akhir

Jika user bertanya "MIA sedang ngapain?", UI harus sudah menjawab tanpa perlu membuka log mentah.

### 4. Reliability Is Product Quality

Flagship bukan jumlah fitur, tetapi rasa bisa dipercaya.

Wajib ada:

- no silent failure
- clear error state
- retry/fallback
- cancel/stop
- rollback untuk perubahan yang dibuat agent
- persistence untuk task panjang
- recovery setelah crash/reload
- status command/render/upload yang tidak ambigu

Fitur yang tidak bisa gagal dengan jelas belum siap menjadi fitur flagship.

### 5. One Shell, Not Many Apps

MIA harus terasa seperti satu sistem, bukan kumpulan halaman.

Wajib konsisten:

- global status bar
- composer behavior
- activity stream pattern
- approval UX
- settings pattern
- routing style
- terminology
- Market installation flow

Kernel boleh independen, tetapi pengalaman user tetap satu.

### 6. Minimal Surface, Maximum Capability

Frontend adalah cockpit, bukan tempat semua pekerjaan dilakukan manual.

Prinsip UI:

- tampilkan intent, plan, status, approval, hasil
- preview/diff boleh, editor berat tidak menjadi fondasi
- command/log/detail bisa dibuka saat dibutuhkan
- default view harus ringkas dan bisa discan
- jangan menambah panel jika action bisa diselesaikan dengan composer + activity stream

### 7. Domain Boundaries Are Safety Boundaries

Setiap kernel punya batas:

- Companion tidak menjalankan terminal/Git/file project.
- Studio tidak mengambil intimacy/memory personal tanpa izin.
- Creator tidak memakai private Companion memory untuk konten publik tanpa izin.
- Market tidak mengeksekusi skill tanpa scope dan permission.
- Automation Orchestrator tidak bypass kernel policy.

Batas domain bukan hanya arsitektur; itu bagian dari trust.

### 8. Real-Life Automation Needs Explicit Policy

Karena MIA bisa membantu hidup nyata, policy real-life automation harus jelas.

Untuk email, booking, shopping, selling, upload, publish, payment, dan calendar:

- default adalah `Review First`
- `Always Execute` harus granular per workflow
- nominal limit wajib untuk transaksi
- payment source wajib dipilih
- merchant/platform scope wajib jelas
- expiry wajib ada
- audit log wajib ada
- high-stakes action tetap tidak boleh autopilot

Convenience boleh tinggi, tetapi tidak boleh mengorbankan kendali user.

### 9. Build Incrementally, Verify Relentlessly

Urutan implementasi harus menjaga stabilitas:

1. Route dan Shell 5 kernel.
2. Global status bar dan power switching.
3. Studio activity-stream cockpit.
4. Market split.
5. Creator skeleton.
6. Automation Orchestrator.
7. `Always Execute` policy.
8. Integrasi real-life tools.

Setiap fase harus punya build/test/verification sendiri sebelum lanjut ke fase berikutnya.

### 10. Excellent Means Calm, Useful, and Safe

MIA excellent jika user merasa:

- ditemani
- dipahami
- dibantu secara nyata
- tidak dibingungkan
- tidak ditakutkan
- selalu bisa menghentikan atau meninjau aksi

Tujuan akhirnya bukan sekadar AI yang bisa melakukan banyak hal, tetapi pasangan/asisten digital yang membuat hidup user lebih ringan dengan cara yang bisa dipercaya.

---

## Arsitektur Konseptual

```txt
User Intent
  -> MIA Shell
  -> Active Kernel
  -> LLM Planner / Router
  -> Policy Gate
  -> PC Tools / Memory / Provider / Market Runtime
  -> Execution Result
  -> MIA Shell
```

Shell tidak mengambil alih kerja kernel. Shell hanya mengorkestrasi:

- active kernel
- global status bar
- permission requests
- notifications
- event stream
- routing
- power-state switching
- emergency stop

---

## Peta 1 Shell dan 5 Kernel

```txt
MIA Shell
  |
  |-- Kernel 1: Companion
  |     Personal chat, persona, emotion, memory, voice, visual presence.
  |
  |-- Kernel 2: Studio
  |     LLM-to-PC execution cockpit, task plan, approval, command/file actions.
  |
  |-- Kernel 3: LLM Warehouse
  |     Provider registry, model routing, health, latency, fallback, budget.
  |
  |-- Kernel 4: Creator
  |     Content creation and video editing cockpit, timeline, assets, render/export.
  |
  |-- Kernel 5: Market
        Companion Market, Studio Market, and Creator Market with strict skill boundaries.
```

---

## Kernel 1: Companion

Companion adalah kernel relasi personal sekaligus front door untuk assistant sehari-hari. Fokus utamanya tetap menghadirkan MIA sebagai pasangan digital user yang punya suara, memori, mood, persona, dan konteks hubungan. Namun dalam `isProfessional` mode, Companion juga boleh menjadi pintu masuk natural-language untuk tugas assistant nyata seperti email, jadwal, booking, pembelian, penjualan, reminder, dan koordinasi ringan.

Keputusan arsitektur:

> **Automasi umum tidak menjadi kernel keenam. Automasi adalah Action/Automation Orchestrator milik Shell yang dipanggil oleh kernel sesuai konteks.**

Dengan keputusan ini, nama MIA sebagai **My Intelligent Assistant** tetap utuh: user boleh meminta "MIA, booking tiket konser ini", "beli barang ini", "jual produk ini", "kirim email ini", atau "unggah konten ini" dari percakapan. Tetapi eksekusinya tetap diarahkan ke domain yang tepat dan melewati policy gate.

### Fungsi Utama

- Chat personal.
- Voice input/output.
- TTS/STT settings.
- Emotion state: warmth, arousal, echo, glow, soft distance.
- Memory: core identity, episodic memory, user preference.
- Appearance: figure, theme, background, bubble style, opacity.
- Onboarding dan personality calibration.
- Companion skills dari Companion Market.
- Professional assistant skills: email draft/send, calendar, booking, shopping, selling/listing, reminder, contact follow-up, dan lightweight workflow.

### Mode Companion

Companion punya beberapa mode perilaku:

- `normal`: percakapan sehari-hari, memory, voice, dan bantuan ringan.
- `intimacy`: relasi personal lebih hangat; tidak boleh menjalankan aksi eksternal berisiko.
- `professional`: mode My Intelligent Assistant untuk email, booking, jadwal, shopping, selling/listing, reminder, follow-up, dan koordinasi task lintas kernel.

Mode `professional` bukan Studio dan bukan Creator. Ia adalah pintu bahasa natural untuk assistant task. Jika task menyentuh coding/PC project, Companion melakukan handoff ke Studio. Jika task menyentuh content/video/publish, Companion melakukan handoff ke Creator. Jika task berupa email, booking, calendar, pembelian, penjualan, atau admin harian, Companion memakai assistant automation skill melalui Shell Automation Orchestrator.

### Batas Aman

Companion boleh:

- membaca konteks chat
- membaca/menulis memory companion
- memicu TTS/STT jika diizinkan
- menjalankan skill companion yang aman
- memakai provider LLM yang dipilih
- dalam `professional` mode, membuat draft email, jadwal, booking request, shopping cart, listing jualan, reminder, atau follow-up setelah approval yang sesuai

Companion tidak boleh:

- mengedit file project
- menjalankan terminal command
- melakukan Git operation
- install dependency
- memakai Studio tool tanpa handoff eksplisit ke Studio Kernel
- mengirim email, membuat booking, melakukan pembayaran, membeli sesuatu, mengunggah konten, atau publish ke platform eksternal tanpa approval eksplisit user

### UI Surface

Companion tidak perlu menjadi dashboard teknis. UI utamanya:

- chat surface
- MIA visual/figure
- mood indicator
- active model selector
- voice controls
- memory/context badge
- settings drawer untuk persona, voice, appearance, memory

---

## Kernel 2: Studio

Studio adalah agent cockpit. Studio bukan browser IDE dan tidak membutuhkan Monaco sebagai fondasi. Studio adalah tempat user memberi misi, menyetujui rencana, memantau eksekusi LLM ke PC, dan membaca hasil.

### Paradigma Studio

```txt
Prompt Task
  -> LLM Plan
  -> User Approval
  -> Tool Execution
  -> Diff / Logs / Verification
  -> Result Summary
```

User tidak perlu mengetik langsung di editor web. Bila perlu melihat perubahan, Studio menampilkan diff, file list, command log, test result, dan ringkasan.

### Fungsi Utama

- Task prompt untuk memberi pekerjaan.
- Plan panel berisi langkah kerja LLM.
- Approval gate untuk aksi sensitif.
- Execution timeline.
- Agent activity stream yang menampilkan aktivitas kerja LLM secara real-time.
- Read-only terminal log.
- Changed files list.
- Diff preview ringan.
- Test/build verification result.
- Git status summary.
- Browser/PC automation status bila tersedia.
- Crone/automation management.
- Emergency stop.

### Activity Stream Wajib di `/studio`

`/studio` wajib menampilkan alur kerja agent secara transparan seperti transcript operasional, bukan hanya hasil akhir. Tujuannya agar user tahu MIA sedang berpikir, membaca, mencari, mengedit, menjalankan command, menunggu proses, atau memverifikasi hasil.

Activity stream minimal harus mendukung event berikut:

- `Thought for Ns`: menandakan agent sedang menyusun reasoning singkat atau menentukan langkah berikutnya.
- `Analyzed <file> #Lx-Ly`: menandakan agent membaca file tertentu dengan referensi baris.
- `Explored <n> file, <n> searches`: ringkasan eksplorasi konteks.
- `Searched <query> <n> results`: menandakan pencarian simbol, teks, route, hook, API, atau pattern di codebase.
- `Edited <n> file`: menandakan perubahan file berhasil diterapkan.
- `Ran <command>`: menandakan command lokal dijalankan, misalnya `npm run build`, `run_check_all.bat`, atau test runner.
- `Checked command status`: menandakan Studio memeriksa apakah proses command masih berjalan atau sudah selesai.
- `Waiting for command completion`: menandakan proses masih berjalan dan UI tidak boleh terlihat macet.
- `Generating`: menandakan agent sedang menyiapkan respons, patch, atau summary.
- `Build/Test succeeded`: menandakan verification berhasil.
- `Build/Test failed`: menandakan verification gagal dan harus menampilkan error ringkas.
- `Blocked`: menandakan agent tidak bisa lanjut tanpa approval, credential, dependency, atau keputusan user.

Contoh urutan activity stream:

```txt
Thought for 3s
Analyzed useWebSocket.ts #L1-L62
Searched useWebSocketMessage 4 results
Analyzed Home.tsx #L1-L800
Edited 2 files
Ran npm.cmd run build
Checked command status
Waiting for command completion
Build succeeded
4 files changed +298 -21
Review changes
```

Activity stream harus bisa collapsed/expanded per event. Baris ringkas tampil dulu, detail seperti output command, daftar hasil search, atau diff hanya dibuka saat user ingin melihatnya.

### Bottom Composer di `/studio`

Studio tetap memiliki input utama di bagian bawah, tetapi fungsinya bukan editor kode. Input ini adalah command prompt untuk memberi instruksi lanjutan ke agent.

Bottom composer wajib mendukung:

- follow-up request setelah pekerjaan selesai
- auto-review toggle
- model selector atau effort selector jika tersedia
- stop button untuk menghentikan task berjalan
- attachment/context button bila user ingin memberi file atau instruksi tambahan
- pending approval state bila agent menunggu izin

Jika ada perubahan file, area atas composer wajib menampilkan ringkasan seperti:

```txt
4 files changed +298 -21     Review changes
```

`Review changes` membuka daftar file dan diff read-only. User boleh meminta follow-up changes dari composer tanpa perlu membuka editor kode.

### Wiring Icon dan Fungsi `/studio`

Setiap ikon di `/studio` wajib punya fungsi eksplisit, state yang jelas, dan event yang tercatat. Ikon tidak boleh hanya dekoratif. Bila sebuah aksi belum tersedia, ikon harus disabled dengan tooltip yang menjelaskan alasannya.

#### Sidebar Shell

| UI / Ikon | Fungsi | Wiring |
| :--- | :--- | :--- |
| `New chat` | Membuat task/session Studio baru. | Reset composer, buat `studio_session_id`, activity stream kosong, workspace tetap aktif. |
| `Search` | Mencari riwayat task, file mention, activity event, atau hasil tool. | Memanggil search lokal UI dan, bila perlu, backend `search_history`. |
| `Plugins` | Membuka Market/Plugin management. | Route ke `/market?tab=studio` untuk Studio Market. |
| `Automations` | Membuka automation/crone Studio. | Route ke `/studio?tab=automation`. |
| `Pinned` | Membuka task/chat yang dipin. | Load session pinned tanpa mengubah workspace. |
| `Projects` | Memilih workspace/project aktif. | Update `active_workspace`, refresh Git/workspace status. |
| `Settings` | Membuka settings Shell atau kernel aktif. | Jika di `/studio`, buka Studio settings: tools, approvals, workspace, local execution. |

#### Top Bar `/studio`

| UI / Ikon | Fungsi | Wiring |
| :--- | :--- | :--- |
| Back / Forward | Navigasi antar session atau history view. | UI history stack, tidak menjalankan tool PC. |
| File / Edit / View / Window / Help | Menu desktop/app shell. | Shortcut ke command UI, docs, layout, diagnostics. |
| Workspace title | Menampilkan project aktif. | Bound ke `active_workspace.name`. |
| Status pill | Menampilkan mode aktif seperti local/remote/sandbox. | Bound ke `execution_mode` dan health check backend. |
| Terminal icon | Membuka log/command drawer read-only. | Menampilkan command history, stdout/stderr, running process. |
| Layout/sidebar icon | Toggle panel kiri/kanan atau compact mode. | Pure UI state, disimpan sebagai preference. |

#### Composer Utama

| UI / Ikon | Fungsi | Wiring |
| :--- | :--- | :--- |
| `+` | Menambah konteks. | Buka menu attachment: mention file, folder, screenshot, log, selected diff, atau paste context. |
| Text area | Instruksi task/follow-up. | Submit ke Studio Kernel sebagai `user_task` atau `follow_up_task`. |
| `Auto-review` toggle | Mengaktifkan review otomatis sebelum/ setelah eksekusi. | Update `auto_review_enabled`; bila aktif, agent wajib melakukan self-check dan menyarankan review. |
| Dropdown di `Auto-review` | Memilih mode review. | Opsi: off, after-edit, before-finish, strict. |
| Model / effort selector | Memilih model atau effort untuk task Studio. | Meminta route dari LLM Warehouse; update `studio_model_profile` atau `reasoning_effort`. |
| Microphone | Voice input untuk prompt Studio. | STT hanya mengisi composer; tidak menjalankan aksi sampai user submit. |
| Send arrow | Submit task. | Membuat activity event `User task submitted`, lalu memulai planning. |
| Stop button | Menghentikan task berjalan. | Memanggil `stop_command`/cancel token dan menandai task `stopped_by_user`. |

#### Context Row di Bawah Composer

| UI / Ikon | Fungsi | Wiring |
| :--- | :--- | :--- |
| Project/workspace selector | Memilih folder kerja. | Update workspace root dan scope semua tools bawaan. |
| Execution mode selector | Memilih cara kerja: local, sandbox, remote bila ada. | Update `execution_mode`; mempengaruhi permission dan command runner. |
| Branch selector | Menampilkan/memilih Git branch aktif. | Read dari `git_branch`; switch branch hanya boleh dengan approval eksplisit. |
| Environment badge | Menampilkan status dependency/runtime. | Bound ke backend health: Node, Python, package manager, dev server. |

#### Starter Actions

| UI / Ikon | Fungsi | Wiring |
| :--- | :--- | :--- |
| `Think of a suitable starter task...` | Meminta MIA memilih task awal yang berguna. | Jalankan discovery read-only: `inspect_project`, `list_files`, `grep/search`, lalu buat plan. |
| `Explain this project to me` | Menjelaskan struktur project. | Discovery read-only, tanpa edit dan tanpa command berisiko. |
| `Connect your favorite apps...` | Membuka integrasi/Market. | Route ke `/market` atau settings integration. |

#### Change Summary Card

| UI / Ikon | Fungsi | Wiring |
| :--- | :--- | :--- |
| File card | Menunjukkan file/dokumen yang disentuh. | Bound ke `changed_files` atau referenced files. |
| `Edited N files` | Ringkasan perubahan. | Dihitung dari diff session agent. |
| `+A -D` | Addition/deletion count. | Dihitung dari `git_diff` atau patch metadata. |
| `Undo` | Membatalkan perubahan agent sesi ini. | Memanggil `revert_own_change`; tidak boleh menyentuh perubahan user yang sudah ada sebelumnya. |
| `Review` / `Review changes` | Membuka diff read-only. | Buka Review Changes surface. |
| `Details` | Membuka metadata perubahan. | Menampilkan files, tools, commands, verification, dan approvals terkait. |

#### Activity Event Row

| UI / Ikon | Fungsi | Wiring |
| :--- | :--- | :--- |
| Chevron `>` | Expand/collapse detail event. | Pure UI state per event. |
| File badge | Membuka read-only file range. | Memanggil `read_file_range` atau cached excerpt. |
| Search result badge | Membuka daftar hasil search. | Menampilkan hasil `grep/search_text/search_symbol`. |
| Command badge | Membuka command output. | Menampilkan stdout/stderr ringkas dan exit code. |
| Spinner | Menandakan proses masih berjalan. | Bound ke running command/task status. |
| Success/check state | Menandakan event selesai berhasil. | Bound ke result status. |
| Error state | Menandakan event gagal. | Wajib punya detail dan next action. |

#### Prinsip Wiring

- Semua ikon wajib punya tooltip.
- Semua aksi yang menyentuh PC wajib menghasilkan activity event.
- Semua aksi read-only boleh otomatis dalam workspace aktif.
- Semua aksi write/command/destructive mengikuti risk policy.
- UI icon state harus mencerminkan backend state, bukan optimisme frontend saja.
- Jika backend belum siap, ikon menampilkan disabled/loading/error state yang jelas.

### Review Changes

`Review changes` adalah surface utama untuk inspeksi hasil edit. Ini menggantikan kebutuhan editor manual.

Review changes wajib menampilkan:

- daftar file berubah
- jumlah addition/deletion
- diff read-only
- status file: added, modified, deleted, renamed
- tombol request follow-up changes
- tombol run verification
- tombol accept/close review

Review changes tidak wajib menyediakan edit manual. Jika user ingin mengubah sesuatu, user memberi instruksi lanjutan ke agent melalui composer.

### Tools Bawaan `/studio`

`/studio` wajib punya tool bawaan yang cukup untuk membuat LLM dapat memahami codebase, menjalankan pekerjaan di PC, dan memverifikasi hasil tanpa membutuhkan web IDE. Tool bawaan ini adalah kemampuan inti Studio Kernel, berbeda dari skill tambahan di Studio Market.

Tool bawaan dibagi menjadi beberapa kelompok:

#### 1. Context Discovery Tools

Dipakai untuk memahami project sebelum mengubah apa pun.

- `list_files`: melihat struktur folder dan file.
- `find_file`: mencari file berdasarkan nama atau pattern.
- `grep` / `search_text`: mencari teks literal di file.
- `search_regex`: mencari pattern dengan regex.
- `search_symbol`: mencari nama function, class, component, hook, route, endpoint, atau variable.
- `read_file`: membaca isi file.
- `read_file_range`: membaca bagian file dengan nomor baris.
- `summarize_file`: membuat ringkasan singkat file besar.
- `inspect_project`: membaca sinyal project seperti package manager, framework, bahasa, script, dan entrypoint.

Event activity stream yang terkait:

```txt
Explored 1 file, 2 searches
Searched useWebSocketMessage 4 results
Analyzed useMIAQueries.ts #L1-L73
```

#### 2. Edit and Patch Tools

Dipakai untuk mengubah file secara terkontrol.

- `apply_patch`: menerapkan perubahan file berbasis patch.
- `create_file`: membuat file baru.
- `rename_file`: mengganti nama atau memindahkan file.
- `format_file`: menjalankan formatter yang relevan jika tersedia.
- `generate_diff`: membuat diff read-only untuk review.
- `changed_files`: menampilkan daftar file yang berubah.
- `revert_own_change`: membatalkan perubahan yang dibuat oleh agent pada sesi berjalan, jika aman dan diminta user.

Catatan penting: edit manual di browser bukan alur utama. User memberi instruksi, lalu agent membuat patch dan menampilkan diff.

Event activity stream yang terkait:

```txt
Edited 1 file
Edited 2 files
4 files changed +298 -21
Review changes
```

#### 3. Command and Process Tools

Dipakai untuk menjalankan command lokal melalui backend dengan policy gate.

- `run_command`: menjalankan command lokal.
- `check_command_status`: mengecek status command yang sedang berjalan.
- `wait_for_command`: menunggu command selesai dengan timeout yang jelas.
- `stop_command`: menghentikan command berjalan.
- `read_command_output`: membaca stdout/stderr ringkas.
- `run_script`: menjalankan script project seperti `npm run build`, `pytest`, atau `run_check_all.bat`.

Command tool wajib menampilkan status hidup, bukan membuat UI terlihat diam.

Event activity stream yang terkait:

```txt
Ran npm.cmd run build
Ran run_check_all.bat
Checked command status
Waiting for command completion
Build succeeded
Build failed
```

#### 4. Verification Tools

Dipakai untuk membuktikan hasil kerja.

- `run_build`: menjalankan build project.
- `run_tests`: menjalankan test suite yang relevan.
- `run_lint`: menjalankan lint/typecheck jika tersedia.
- `run_backend_check`: menjalankan pengecekan backend Python.
- `run_frontend_check`: menjalankan pengecekan frontend.
- `verify_dev_server`: mengecek dev server lokal jika app web perlu dibuka.
- `capture_ui_snapshot`: mengambil snapshot/screenshot untuk validasi visual bila browser automation tersedia.

Verification result wajib masuk ke activity stream dan result summary.

#### 5. Git and Change Inspection Tools

Dipakai untuk membaca status perubahan dan membantu release workflow.

- `git_status`: membaca status working tree.
- `git_diff`: membaca diff.
- `git_log`: membaca riwayat commit ringkas.
- `git_branch`: membaca branch aktif.
- `git_stage`: staging file jika user meminta.
- `git_commit`: commit jika user meminta.
- `git_push`: push jika user meminta.

Git write operation (`stage`, `commit`, `push`) wajib mengikuti instruksi eksplisit user. Studio tidak boleh commit atau push diam-diam.

#### 6. Browser and Local App Tools

Dipakai ketika hasil kerja perlu diverifikasi di browser atau app lokal.

- `open_local_url`: membuka target lokal seperti `localhost`.
- `inspect_page`: membaca status page.
- `click`: klik elemen UI untuk smoke test.
- `type`: mengetik input untuk smoke test.
- `screenshot`: mengambil gambar hasil render.
- `read_console`: membaca error console browser jika tersedia.

Tool ini hanya dipakai untuk verifikasi lokal atau atas permintaan user.

#### 7. Approval and Safety Tools

Dipakai untuk menjaga semua aksi tetap governed.

- `classify_risk`: mengklasifikasikan risiko aksi.
- `request_approval`: meminta izin user sebelum aksi sensitif.
- `show_pending_approval`: menampilkan aksi yang sedang menunggu izin.
- `deny_action`: membatalkan aksi yang tidak disetujui.
- `audit_log`: mencatat aksi penting.

Approval tool wajib muncul di UI sebagai state eksplisit, bukan hanya pesan teks di chat.

### Aturan Tool Bawaan

- Tool discovery/read-only seperti `list_files`, `grep`, `search_text`, `read_file`, dan `git_status` boleh berjalan otomatis dalam scope workspace Studio.
- Tool edit seperti `apply_patch`, `create_file`, dan `format_file` boleh berjalan setelah task disetujui, tetapi hasilnya wajib muncul di `Review changes`.
- Tool command seperti `run_command`, `run_script`, `run_build`, dan `run_tests` wajib menampilkan command yang dijalankan dan status proses.
- Tool destructive, credential, install dependency, network-sensitive, Git write, atau long-running background task wajib meminta approval eksplisit.
- Semua tool output harus diringkas untuk UI, tetapi detail mentah tetap bisa dibuka bila user membutuhkan.
- Semua tool event harus masuk ke activity stream agar `/studio` tidak pernah terasa diam atau ambigu.

### Batas Aman

Studio boleh, setelah permission:

- membaca file
- menulis file
- menjalankan command
- menjalankan test/build
- membaca status Git
- membuat commit/branch/PR jika user meminta
- mengakses browser automation
- menjalankan skill Studio Market

Studio wajib meminta approval untuk:

- destructive file operations
- dependency install
- network operation yang berisiko
- credential/API key changes
- Git destructive operation
- long-running background task

### Pengganti Monaco

Studio menggunakan komponen ringan:

- Markdown plan viewer.
- Checklist interaktif.
- Diff viewer berbasis teks.
- Read-only code snippet viewer.
- Read-only terminal/log viewer.
- File change summary.
- Button actions: approve, reject, run verification, stop.

Monaco boleh dihapus dari dependency bila tidak ada komponen lain yang masih memakainya. Jika preview kode tetap diperlukan, gunakan renderer ringan seperti syntax highlighter read-only.

---

## Kernel 3: LLM Warehouse

LLM Warehouse adalah kernel provider dan model routing. Semua kernel lain menggunakan LLM melalui kernel ini agar routing, fallback, budget, dan health status konsisten.

### Fungsi Utama

- Registry provider: OpenAI, Gemini, Groq, DeepSeek, local GGUF, dan provider lain.
- Active/default model selector.
- Model profile: companion default, studio default, fallback default.
- Latency ping.
- Health check.
- Circuit breaker.
- Local model preload.
- Provider stats.
- Budget and cost guard.
- API key presence check tanpa membocorkan secret.

### UI Surface

LLM Warehouse harus langsung menjawab:

- model mana yang aktif
- provider mana yang sehat
- provider mana yang gagal
- model mana yang dipakai Companion
- model mana yang dipakai Studio
- fallback apa yang akan terjadi jika provider utama gagal
- apakah local model siap

---

## Kernel 4: Creator

Creator adalah kernel produksi konten dan video editing. Kernel ini berdiri sendiri karena kebutuhan content creation berbeda dari Companion dan Studio.

Keputusan arsitektur:

> **Creator tidak dimasukkan ke Companion. Creator menjadi kernel mandiri.**

Alasannya:

- Companion adalah ruang relasi personal, mood, memory, voice, dan persona. Jika video editing dimasukkan ke Companion, ruang personal menjadi terlalu berat dan kehilangan fokus.
- Studio adalah ruang kerja LLM-to-PC untuk coding, command, file operation, dan developer workflow. Video editing punya pipeline media, timeline, asset bin, render queue, subtitle, audio, dan export yang berbeda dari coding workflow.
- Creator membutuhkan permission media tersendiri: membaca folder media, membuat file output, menjalankan render/transcode, mengelola asset, dan menyimpan project kreatif.
- Creator bisa memakai LLM untuk script, caption, storyboard, shot list, dan editing plan, tetapi UI-nya harus seperti production cockpit, bukan chat companion dan bukan web IDE.

### Fungsi Utama

- Content brief dan creative prompt.
- Script generation untuk video pendek/panjang.
- Hook, caption, title, hashtag, dan description generator.
- Storyboard dan shot list.
- Asset bin untuk video, image, audio, voiceover, subtitle, dan brand kit.
- Timeline editing ringan seperti CapCut-style workflow.
- Trim, split, reorder, overlay, subtitle, audio sync, dan transition planning.
- Auto subtitle dan caption styling.
- Voiceover/TTS pipeline bila diizinkan.
- Template editing untuk short-form content.
- Render/export queue.
- Output presets: TikTok, YouTube Shorts, Instagram Reels, YouTube landscape, custom.
- Review preview dan revision request.

### Paradigma Creator

```txt
Creative Brief
  -> Script / Storyboard
  -> Asset Selection
  -> Edit Plan
  -> Timeline Assembly
  -> Preview
  -> Revision
  -> Render / Export
```

Creator bukan tempat intimacy Companion, dan bukan tempat command developer Studio. Creator adalah ruang produksi media.

### UI Surface Creator

`/creator` sebaiknya punya surface berikut:

- Brief composer.
- Asset bin.
- Timeline.
- Preview player.
- Script/caption panel.
- Subtitle panel.
- Brand kit/style panel.
- Render/export panel.
- Activity stream.
- Review changes untuk media project.

### Activity Stream Creator

Creator wajib transparan seperti Studio, tetapi event-nya berbasis media:

- `Analyzed media <file>`: membaca metadata media.
- `Generated script`: membuat naskah.
- `Generated captions`: membuat caption/subtitle.
- `Added asset to timeline`: memasukkan asset ke timeline.
- `Trimmed clip`: memotong clip.
- `Synced audio`: sinkronisasi audio.
- `Applied template`: menerapkan template.
- `Rendered preview`: membuat preview.
- `Export started`: mulai render/export.
- `Export completed`: export selesai.
- `Export failed`: export gagal dengan error ringkas.

### Tools Bawaan `/creator`

Creator wajib punya tool bawaan terpisah dari Studio:

#### 1. Media Discovery Tools

- `list_media`: melihat asset media di folder yang diizinkan.
- `inspect_media`: membaca metadata video/audio/image.
- `search_assets`: mencari asset berdasarkan nama, tag, durasi, type.
- `read_transcript`: membaca transcript/subtitle jika tersedia.

#### 2. Creative Planning Tools

- `generate_script`: membuat script.
- `generate_storyboard`: membuat storyboard.
- `generate_shot_list`: membuat shot list.
- `generate_caption`: membuat caption dan social copy.
- `generate_hashtags`: membuat hashtag.
- `generate_title`: membuat title.

#### 3. Timeline Tools

- `create_project`: membuat project creator.
- `add_clip`: menambahkan clip ke timeline.
- `trim_clip`: memotong clip.
- `split_clip`: membagi clip.
- `reorder_clip`: mengatur urutan clip.
- `add_text_overlay`: menambahkan teks.
- `add_subtitle`: menambahkan subtitle.
- `add_audio`: menambahkan musik/voiceover.
- `apply_transition`: menerapkan transition.
- `apply_template`: menerapkan template.

#### 4. Preview and Export Tools

- `render_preview`: membuat preview ringan.
- `export_video`: render final.
- `check_render_status`: mengecek status render.
- `stop_render`: menghentikan render.
- `open_output_folder`: membuka folder output jika user meminta.

#### 5. Safety Tools

- `classify_media_risk`: memeriksa risiko aksi media.
- `request_media_approval`: meminta izin untuk membaca folder media, render panjang, atau overwrite output.
- `audit_media_action`: mencatat aksi penting.

### Batas Aman Creator

Creator boleh, setelah permission:

- membaca folder media yang dipilih user
- membuat project kreatif
- membuat subtitle/caption/script
- membuat preview dan export
- menulis output ke folder yang disetujui
- memakai TTS/voiceover bila user mengaktifkan

Creator tidak boleh:

- membaca seluruh disk tanpa folder scope
- menghapus media asli tanpa approval eksplisit
- overwrite output tanpa konfirmasi
- memakai private memory Companion untuk konten publik tanpa izin eksplisit
- menjalankan command developer Studio kecuali melalui tool Creator yang sudah dipolicy
- publish otomatis ke platform sosial tanpa approval eksplisit

### Hubungan Creator dengan Kernel Lain

- Dengan Companion: boleh meminta gaya personal/brand voice jika user mengizinkan, tetapi tidak boleh mengambil memory intim secara diam-diam.
- Dengan Studio: boleh meminta bantuan teknis hanya untuk tool/media pipeline, bukan mengambil alih developer workflow.
- Dengan LLM Warehouse: semua generation script/caption/storyboard memakai routing model dari LLM Warehouse.
- Dengan Market: Creator punya Creator Market untuk template, subtitle style, transition pack, export preset, voice pack, dan content workflow.

---

## Kernel 5: Market

Market adalah kernel distribusi kemampuan. Market tidak lagi diperlakukan sebagai satu toko campur. Market terbagi menjadi tiga domain utama:

```txt
Market Kernel
  |-- Companion Market
  |-- Studio Market
  |-- Creator Market
```

Folder backend skill boleh tetap satu, misalnya `backend/skills/`, tetapi klasifikasi domain wajib tegas melalui metadata.

### Companion Market

Companion Market berisi kemampuan yang memperkaya relasi personal dan pengalaman companion.

Contoh:

- voice pack
- personality preset
- emotion module
- memory ritual
- daily caring routine
- visual figure/background theme
- chat style
- TTS/STT enhancement
- personal reminder ringan
- email assistant
- calendar assistant
- booking assistant
- shopping assistant
- selling/listing assistant
- contact follow-up assistant

Permission umum:

- read_chat_context
- read_memory
- write_memory
- tts
- stt
- appearance
- notification
- draft_email
- send_email
- calendar_read
- calendar_write
- booking_search
- booking_confirm
- shopping_search
- prepare_checkout
- purchase_confirm
- listing_draft
- listing_publish
- order_management

Companion Market tidak boleh memberi kemampuan edit file, terminal, Git, dependency install, atau PC automation berisiko. Skill email, calendar, booking, shopping, selling/listing, dan contact follow-up hanya boleh aktif sebagai `professional_assistant` dan wajib mengikuti approval rules.

### Studio Market

Studio Market berisi kemampuan kerja, coding, automasi PC, dan developer workflow.

Contoh:

- Git assistant
- test runner
- code refactor agent
- dependency checker
- file organizer
- browser automation
- local app launcher
- CI checker
- documentation generator
- project scanner
- build/deploy helper

Permission umum:

- read_files
- write_files
- run_command
- git_read
- git_write
- browser_control
- network
- install_dependency
- scheduler

Studio Market wajib lewat policy gate dan approval untuk aksi berisiko.

### Creator Market

Creator Market berisi kemampuan produksi media dan content workflow.

Contoh:

- video template pack
- subtitle style pack
- transition pack
- brand kit preset
- export preset
- caption workflow
- short-form content formula
- voiceover pack
- audio cleanup helper
- thumbnail generator
- social posting helper
- content upload assistant
- publishing scheduler

Permission umum:

- read_media
- write_media_project
- render_preview
- export_video
- read_transcript
- write_subtitle
- tts
- media_transform
- publish_social
- upload_content
- schedule_post

Creator Market wajib lewat media approval untuk membaca folder media, render panjang, overwrite output, memakai voice/brand identity, atau publish ke platform sosial.

### Metadata Skill Wajib

Setiap skill wajib punya metadata eksplisit.

```python
__skill_metadata__ = {
    "name": "Git Auto Commit",
    "market": "studio",
    "category": "developer",
    "permissions": ["read_files", "write_files", "git_write"],
    "setup_required": False,
    "enabled_by_default": False,
}
```

Contoh Companion:

```python
__skill_metadata__ = {
    "name": "Soft Morning Greeting",
    "market": "companion",
    "category": "affection",
    "permissions": ["read_memory", "write_memory", "tts"],
    "setup_required": False,
    "enabled_by_default": True,
}
```

Contoh Creator:

```python
__skill_metadata__ = {
    "name": "Shorts Subtitle Pack",
    "market": "creator",
    "category": "subtitle",
    "permissions": ["read_media", "write_subtitle", "render_preview"],
    "setup_required": False,
    "enabled_by_default": False,
}
```

Skill dengan `"market": "shared"` hanya boleh dipakai jika permission-nya aman lintas domain, atau jika metadata mendefinisikan `allowed_kernels` secara eksplisit.

---

## Routing UI Final

```txt
/companion    Companion Kernel
/studio       Studio Kernel
/llm          LLM Warehouse Kernel
/creator      Creator Kernel
/market       Market Kernel
```

Route lama boleh tetap ada sementara sebagai compatibility alias:

```txt
/             -> /companion
/iam-mia      -> /companion?tab=memory
/emotion      -> /companion?tab=resonance
/crone        -> /studio?tab=automation
/create       -> /creator
/skills       -> /market
```

Target akhir: user hanya melihat lima pintu utama, bukan banyak halaman yang terasa terpisah.

---

## Backend Blueprint

```txt
backend/
  main.py
  core/
    event_bus.py
    state_store.py
    policy_gate.py
    mode_hub.py
    local_runtime.py
  api/
    companion_router.py
    studio_router.py
    llm_router.py
    creator_router.py
    market_router.py
  skills/
    companion/
    studio/
    creator/
    shared/
  data/
    state.db
    provider_stats.db
    creator_projects/
```

`main.py` tetap micro-kernel startup:

- FastAPI init.
- CORS/GZip.
- static assets.
- event bus start/stop.
- crone daemon start/stop.
- router mounting.
- mode bootstrap.
- local model preload.

Business logic tidak kembali menumpuk di `main.py`.

---

## Power-State Switching

Shell wajib mengirim event ketika active kernel berubah:

```txt
SWITCH_TO_COMPANION
SWITCH_TO_STUDIO
SWITCH_TO_LLM
SWITCH_TO_CREATOR
SWITCH_TO_MARKET
```

Efek yang diharapkan:

- Saat masuk Studio, companion background loop yang berat ditidurkan.
- Saat kembali ke Companion, voice/emotion/figure boleh aktif lagi.
- Saat masuk Creator, companion background loop yang berat ditidurkan dan resource dialihkan untuk preview/render media.
- Saat masuk LLM Warehouse atau Market, semua background loop non-esensial tetap minimal.
- Crone/automation tetap berjalan hanya jika user mengaktifkannya.
- Render/export Creator tetap berjalan hanya jika user mengaktifkannya dan statusnya terlihat di Shell.

Target: MIA terasa hidup, tetapi tidak menjadi beban PC.

---

## UI Status Bar Global

Shell sebaiknya memiliki status bar ringkas yang selalu terlihat:

- active kernel
- websocket status
- active model
- provider health
- power state
- pending approval count
- running task count
- emergency stop

Status bar ini adalah wajah governance MIA: user selalu tahu sistem sedang apa.

---

## Action and Automation Orchestrator

Automation bukan kernel keenam. Automation adalah layanan bersama di Shell yang menghubungkan intent user dengan kernel yang tepat, skill yang tepat, approval yang tepat, dan audit log yang tepat.

Tujuan utamanya:

- menjaga MIA tetap terasa sebagai **My Intelligent Assistant**
- menghindari Companion menjadi terlalu berat
- menghindari Studio mengambil alih semua workflow non-dev
- menghindari Creator melakukan publish/upload tanpa governance

### Routing Automasi

```txt
User asks from anywhere
  -> Shell Intent Router
  -> Target Kernel
  -> Automation Orchestrator
  -> Policy Gate
  -> Skill / External App / PC Tool
  -> Activity Log + Result
```

Routing keputusan:

- Email, calendar, booking, shopping, selling/listing, reminder, contact follow-up -> Companion `professional` mode.
- Upload content, schedule post, render/export, caption publish -> Creator Kernel.
- Coding, file operation, command, Git, test/build, browser dev verification -> Studio Kernel.
- Provider/model selection -> LLM Warehouse.
- Skill install/setup/permission -> Market Kernel.

### Contoh Automasi

| User Intent | Target Kernel | Alasan |
| :--- | :--- | :--- |
| "Kirim email follow-up ke klien" | Companion Professional | Assistant communication workflow. |
| "Booking hotel untuk tanggal ini" | Companion Professional | Personal/professional assistant workflow. |
| "Booking tiket konser ini kalau masih ada" | Companion Professional | Real-life booking workflow. |
| "Cari dan siapkan checkout barang ini" | Companion Professional | Shopping workflow; purchase final tetap approval. |
| "Jual barang ini di marketplace" | Companion Professional | Selling/listing workflow; listing/publish tetap approval. |
| "Buat reminder meeting besok" | Companion Professional | Calendar/reminder workflow. |
| "Upload video ini ke TikTok dengan caption tadi" | Creator | Content publish workflow. |
| "Render versi YouTube Shorts dan jadwalkan upload" | Creator | Media export and scheduling workflow. |
| "Jalankan test dan commit perubahan" | Studio | Developer workflow. |
| "Install plugin subtitle baru" | Market | Capability management. |

### Assistant Skills di Companion Market

Companion Market tetap diperlukan karena MIA adalah assistant, bukan hanya persona chat. Namun skill Companion dibagi menjadi dua kelas:

- `personal_companion`: voice, persona, emotion, memory, intimacy-safe routine.
- `professional_assistant`: email, calendar, booking, shopping, selling/listing, reminder, contact follow-up, form filling, lightweight admin workflow.

Skill `professional_assistant` hanya aktif dalam `isProfessional` mode atau saat user mengizinkannya secara eksplisit. Dalam `normal` atau `intimacy` mode, skill ini boleh membuat draft atau saran, tetapi tidak boleh menjalankan aksi eksternal.

Contoh metadata:

```python
__skill_metadata__ = {
    "name": "Email Assistant",
    "market": "companion",
    "category": "professional_assistant",
    "permissions": ["read_contact_context", "draft_email", "send_email"],
    "requires_mode": "professional",
    "setup_required": True,
    "enabled_by_default": False,
}
```

### Execution Mode untuk Automasi

Automasi punya dua mode eksekusi yang dipilih user:

1. `Review First`
   Default. MIA boleh mencari, membandingkan, membuat draft, menyiapkan cart/listing/booking, lalu meminta approval sebelum aksi eksternal dijalankan.

2. `Always Execute`
   Opsional. MIA boleh langsung mengeksekusi aksi tertentu tanpa review per aksi, tetapi hanya dalam batas yang sudah ditentukan user.

`Always Execute` harus diatur per kategori workflow, bukan global buta.

Contoh kategori:

- email send
- calendar write
- reminder create
- booking ticket/hotel/concert
- shopping purchase
- selling/listing publish
- content upload/publish
- subscription/payment

### Settings Wajib untuk `Always Execute`

Sebelum `Always Execute` aktif, Shell wajib meminta setting berikut:

- kategori workflow yang diizinkan
- batas nominal per transaksi
- batas nominal harian
- batas nominal bulanan
- sumber dana: rekening, kartu, e-wallet, atau payment method mana yang boleh dipakai
- merchant/platform allowlist jika relevan
- kategori barang/jasa yang boleh dibeli atau dijual
- lokasi/waktu berlaku jika relevan
- auto-execute expiry, misalnya berlaku 24 jam, 7 hari, atau sampai dimatikan
- notification channel untuk laporan setelah eksekusi
- emergency stop untuk mematikan semua automasi

Contoh policy:

```txt
Shopping Always Execute:
  max_per_transaction: Rp250.000
  max_per_day: Rp750.000
  payment_source: GoPay
  allowed_merchants: Tokopedia, Shopee
  allowed_categories: groceries, household, office supplies
  expiry: 7 days
```

```txt
Concert Booking Always Execute:
  max_per_transaction: Rp1.500.000
  payment_source: BCA debit
  allowed_platforms: Loket, Tiket.com
  allowed_event_keywords: artist/user-approved list
  expiry: until ticket found or 48 hours
```

### Approval Rules untuk Automasi

- Draft email boleh dibuat otomatis.
- Kirim email mengikuti mode: `Review First` meminta approval, `Always Execute` boleh langsung kirim jika penerima/domain/template masuk policy.
- Booking search boleh otomatis.
- Booking final mengikuti mode: `Review First` meminta approval, `Always Execute` boleh langsung booking jika nominal, platform, tanggal, dan kategori masuk policy.
- Shopping search, price comparison, dan cart preparation boleh otomatis.
- Purchase final mengikuti mode: `Review First` meminta approval, `Always Execute` boleh langsung checkout jika nominal, payment source, merchant, dan kategori masuk policy.
- Selling draft, product description, price suggestion, dan listing preview boleh otomatis.
- Publish listing, accept offer, cancel order, refund, atau perubahan harga aktif mengikuti mode dan policy yang diset user.
- Calendar draft boleh otomatis; calendar write mengikuti mode dan policy.
- Reminder lokal boleh dibuat jika user meminta eksplisit atau masuk policy.
- Upload content dan publish/schedule post mengikuti mode Creator dan policy publish.
- Payment, purchase, subscription, atau transaksi finansial boleh `Always Execute` hanya jika berada di bawah limit, sumber dana, merchant/platform, kategori, dan expiry yang user set.
- Aksi yang memakai data personal harus menampilkan data apa yang dipakai dan tujuan penggunaannya di audit log.

### Aksi yang Tidak Boleh `Always Execute`

Beberapa aksi tetap harus `Review First` walaupun user mengaktifkan `Always Execute`:

- persetujuan hukum atau kontrak
- pinjaman, kredit, asuransi, investasi, atau produk finansial kompleks
- transaksi melebihi limit atau memakai sumber dana di luar policy
- pembelian barang berisiko tinggi atau terlarang
- keputusan medis/legal/finansial high-stakes
- penghapusan permanen akun/data
- perubahan password, recovery email, 2FA, atau security setting
- aksi yang meminta identitas user untuk consent legal

MIA tidak boleh menyamarkan diri sebagai user untuk persetujuan hukum/kontrak atau keputusan high-stakes. MIA boleh menyiapkan ringkasan dan form, tetapi final consent tetap harus user.

### Activity Log Automasi

Semua automasi wajib muncul di activity stream kernel terkait dan ringkasan Shell:

```txt
Drafted email
Waiting for approval to send
Sent email
Searched booking options
Waiting for booking confirmation
Compared shopping options
Prepared checkout
Drafted marketplace listing
Waiting for listing approval
Scheduled content upload
Upload completed
```

Jika automasi berjalan terjadwal, Shell harus menampilkan:

- next run
- target kernel
- permission state
- last result
- pause/resume/delete controls

---

## Execution and Permission Model

Setiap action dari LLM harus melewati lapisan berikut:

```txt
LLM Suggestion
  -> Kernel Scope Check
  -> Skill Permission Check
  -> Risk Classifier
  -> User Approval if needed
  -> Backend Execution
  -> Result Logging
```

Risk class:

- `safe_read`: boleh otomatis jika kernel mengizinkan.
- `safe_write`: butuh approval pertama atau setting eksplisit.
- `command`: butuh approval.
- `network`: butuh approval jika install/fetch/remote action.
- `destructive`: selalu butuh approval eksplisit.
- `credential`: selalu butuh approval dan secret-safe handling.

---

## Roadmap Implementasi Baru

### Fase 1: SSOT Alignment

- Kunci dokumen ini sebagai arah produk.
- Tandai Monaco/web IDE sebagai deprecated direction.
- Ubah istilah `Workspace Hub` menjadi `Studio Agent Cockpit`.
- Ubah `Mia Store` menjadi `Market Kernel` dengan tiga market: Companion, Studio, Creator.

### Fase 2: UI Consolidation

- Jadikan navigasi utama hanya: Companion, Studio, LLM, Creator, Market.
- Pindahkan Emotion dan IamMia ke subtab Companion.
- Pindahkan Crone dan Resilience ke subtab Studio.
- Ubah `/skills` menjadi alias ke `/market`.

### Fase 3: Studio Without Monaco

- Hapus asumsi code editor dari Studio.
- Ganti dengan task prompt, plan panel, approval gate, execution timeline, read-only logs, changed files, dan diff preview.
- Hapus dependency Monaco jika tidak lagi dipakai.

### Fase 4: Creator Kernel

- Tambahkan route `/creator`.
- Tambahkan Creator cockpit: brief composer, asset bin, timeline, preview, subtitle/caption panel, render/export panel.
- Tambahkan creator tools: media discovery, creative planning, timeline edit, preview/export, media approval.
- Pastikan Creator tidak mengambil memory intim Companion atau tool developer Studio tanpa izin eksplisit.

### Fase 5: Market Split

- Tambahkan metadata `market`.
- Pisahkan Companion Market, Studio Market, dan Creator Market di UI.
- Terapkan strict filtering di backend.
- Blokir permission Studio dari Companion.
- Blokir permission Creator dari Companion kecuali voice/appearance/content style yang aman dan disetujui.

### Fase 6: LLM Warehouse Hardening

- Tambahkan model profile per kernel.
- Tampilkan provider health/fallback.
- Pastikan semua kernel memakai routing dari LLM Warehouse.

### Fase 7: Verification

- Jalankan backend syntax/test check.
- Jalankan frontend build.
- Uji websocket kernel switching.
- Uji Companion tidak bisa memakai Studio tool.
- Uji Studio skill approval gate.
- Uji Creator media approval gate.
- Uji Creator preview/export status.
- Uji provider fallback.
- Uji Market filtering.

---

## Acceptance Criteria

MIA flagship dianggap selaras dengan paradigma ini jika:

- User melihat satu Shell dengan lima kernel utama.
- Studio tidak lagi terasa seperti web IDE.
- App dapat menjalankan pekerjaan PC melalui LLM dengan approval dan log yang jelas.
- `/studio` menampilkan activity stream real-time: thought, analyzed files, searches, edits, command runs, command status, waiting state, generation, dan verification result.
- `/studio` memiliki bottom composer untuk follow-up instruction, stop action, auto-review/model/effort control, dan pending approval state.
- `/studio` memiliki wiring eksplisit untuk setiap ikon/kontrol: fungsi, state, tooltip, backend event, dan risk policy.
- `/studio` menampilkan changed-files summary dan `Review changes` untuk diff read-only setelah agent mengubah file.
- `/studio` memiliki tools bawaan untuk context discovery, grep/search, file read, patch edit, command/process, verification, Git inspection, browser/local app verification, dan approval safety.
- Semua pemakaian tools bawaan `/studio` muncul sebagai event activity stream dan mengikuti risk/approval policy.
- `/creator` berdiri sebagai kernel mandiri untuk content creation dan video editing, bukan dimasukkan ke Companion.
- `/creator` memiliki brief composer, asset bin, timeline, preview player, subtitle/caption panel, render/export panel, dan activity stream media.
- `/creator` memiliki tools bawaan untuk media discovery, creative planning, timeline edit, preview/export, dan media approval.
- Automasi umum tidak menjadi kernel baru; automasi berjalan melalui Shell Action/Automation Orchestrator dan dirutekan ke kernel yang tepat.
- Companion `professional` mode menjadi pintu untuk assistant workflow seperti email, calendar, booking, shopping, selling/listing, reminder, dan contact follow-up.
- Upload content, schedule post, publish social, render/export, dan caption workflow diarahkan ke Creator, bukan Companion.
- Semua aksi eksternal seperti send email, booking final, checkout/purchase, publish listing, accept offer, upload/publish, payment, dan calendar write wajib mengikuti mode user: `Review First` atau `Always Execute`.
- `Always Execute` hanya boleh aktif jika user sudah mengatur batas nominal, sumber dana/rekening/e-wallet, kategori workflow, merchant/platform scope, expiry, audit log, dan emergency stop.
- Companion tidak bisa menyentuh file/terminal/Git.
- Market terbagi jelas menjadi Companion Market, Studio Market, dan Creator Market.
- LLM Warehouse menjadi pusat routing model untuk semua kernel.
- Power-state switching mengurangi beban saat kernel tertentu tidak aktif.
- Setiap kegagalan terlihat dan punya status yang dapat dipahami.

---

## Keputusan Final

Paradigma resmi MIA:

> **1 Shell, 5 Independent Kernels.**
>
> MIA adalah My Intelligent Assistant: asisten sekaligus pasangan digital user yang membantu hidup nyata.
> Shell adalah perantara yang aman antara User, LLM, dan PC.
> Companion adalah jiwa relasional.
> Studio adalah tangan eksekusi PC.
> LLM Warehouse adalah otak routing model.
> Creator adalah studio produksi konten dan video editing.
> Market adalah sumber kemampuan yang terbagi tegas antara Companion, Studio, dan Creator.
> Automation adalah orchestrator Shell lintas-kernel, bukan kernel keenam.

---

## Implementation Contracts

Bagian ini mengubah visi di atas menjadi kontrak implementasi berbasis struktur repo yang sudah ada sekarang. Tujuannya agar eksekusi tidak menebak-nebak file mana yang harus dipakai, file mana yang perlu dibuat, dan state mana yang disimpan di mana.

### Existing Foundation yang Wajib Dipakai

Backend yang sudah ada dan harus dipakai sebagai fondasi:

- `backend/main.py`: tetap micro-kernel startup dan router mounting.
- `backend/api/companion_router.py`: base Companion API dan websocket chat/heartbeat.
- `backend/api/studio_router.py`: base Studio API, websocket events, skill execution, Git status, IDE discovery.
- `backend/api/llm_router.py`: base LLM Warehouse API.
- `backend/core/state_store.py`: SQLite transactional store. Saat ini baru menyimpan `config_store`; perlu diperluas untuk table Shell/Automation/Market/Creator.
- `backend/core/event_bus.py`: in-memory pub/sub. Pakai untuk kernel switch, approval events, automation status, creator render status, dan market updates.
- `backend/core/policy_engine.py`: deterministic policy gate. Perlu rule baru untuk kernel/action risk.
- `backend/core/permission_manager.py`: permission grant/check sederhana. Perlu diperluas atau dibungkus oleh approval policy service.
- `backend/core/tool_registry.py`: tool registry OS control. Perlu menjadi registry eksplisit untuk Studio/Creator/Automation tools.
- `backend/skill_manager.py`: skill scan/install/execute. Perlu migrasi metadata `market`, `allowed_kernels`, `requires_mode`, dan Creator support.
- `backend/studio/`: fondasi Studio services: execution, file/version, git guard, graph stream, lock, session, IDE discovery.
- `backend/crone_daemon.py`: fondasi automation/heartbeat/recurring task yang bisa dipakai sementara sebelum Automation Orchestrator matang.

Frontend yang sudah ada dan harus dipakai sebagai fondasi:

- `frontend/src/App.tsx`: routing utama, lazy loading, power-state websocket sender.
- `frontend/src/Sidebar.tsx`: navigasi shell utama.
- `frontend/src/Companion.tsx`: Companion UI, chat, intimacy, active model selector.
- `frontend/src/LLMPage.tsx`: LLM Warehouse UI.
- `frontend/src/SkillMarketplace.tsx`: Market UI lama, calon basis Market Kernel.
- `frontend/src/mia_studio/components/StudioPage.tsx`: Studio UI utama.
- `frontend/src/mia_studio/components/GardenLauncher.tsx`: launcher/prompt awal Studio.
- `frontend/src/mia_studio/components/StudioTerminal.tsx`: terminal/log viewer.
- `frontend/src/mia_studio/components/GraphViewer.tsx`: visual graph viewer.
- `frontend/src/mia_studio/components/StudioTopbar.tsx` dan `StudioBottomBar.tsx`: calon basis top/bottom Studio controls.
- `frontend/src/context/WebSocketContext.tsx`: websocket context.
- `frontend/src/hooks/useWebSocket.ts`: websocket hook.
- `frontend/src/hooks/useMIAQueries.ts`: React Query hook collection.
- `frontend/src/context/ConfigContext.tsx`: config provider.

### Folder dan File Baru yang Dibutuhkan

Tambahan backend:

```txt
backend/
  api/
    creator_router.py          (NEW)
    market_router.py           (NEW)
    shell_router.py            (NEW, optional but recommended)
    automation_router.py       (NEW)
    approval_router.py         (NEW)
  core/
    shell_state.py             (NEW)
    approval_service.py        (NEW)
    automation_orchestrator.py (NEW)
    audit_log.py               (NEW)
    risk_classifier.py         (NEW)
  creator/
    __init__.py                (NEW)
    project_service.py         (NEW)
    media_service.py           (NEW)
    timeline_service.py        (NEW)
    render_service.py          (NEW)
  market/
    __init__.py                (NEW)
    market_service.py          (NEW)
```

Tambahan frontend:

```txt
frontend/src/
  Creator.tsx                  (NEW)
  Market.tsx                   (NEW or refactor SkillMarketplace.tsx)
  shell/
    ShellStatusBar.tsx         (NEW)
    ApprovalCenter.tsx         (NEW)
    ActivityStream.tsx         (NEW shared component)
  creator/
    CreatorPage.tsx            (NEW)
    AssetBin.tsx               (NEW)
    Timeline.tsx               (NEW)
    PreviewPlayer.tsx          (NEW)
    RenderPanel.tsx            (NEW)
  studio/
    StudioActivityStream.tsx   (NEW or shared ActivityStream)
    ReviewChanges.tsx          (NEW)
    StudioComposer.tsx         (NEW)
  hooks/
    useShellStatus.ts          (NEW)
    useApprovals.ts            (NEW)
    useAutomationPolicies.ts   (NEW)
    useCreatorQueries.ts       (NEW)
    useMarketQueries.ts        (NEW)
```

### Data Model Contract

Gunakan SQLite via `backend/core/state_store.py` sebagai source of truth lokal. Jangan membuat file JSON baru untuk state penting kecuali hanya cache/compatibility.

Table minimum:

```sql
kernel_sessions(
  id TEXT PRIMARY KEY,
  kernel TEXT NOT NULL,
  title TEXT,
  status TEXT NOT NULL,
  workspace TEXT,
  created_at REAL NOT NULL,
  updated_at REAL NOT NULL
)
```

```sql
activity_events(
  id TEXT PRIMARY KEY,
  session_id TEXT NOT NULL,
  kernel TEXT NOT NULL,
  type TEXT NOT NULL,
  title TEXT NOT NULL,
  summary TEXT,
  payload_json TEXT,
  status TEXT NOT NULL,
  created_at REAL NOT NULL
)
```

```sql
approval_requests(
  id TEXT PRIMARY KEY,
  session_id TEXT,
  kernel TEXT NOT NULL,
  action_type TEXT NOT NULL,
  risk_class TEXT NOT NULL,
  summary TEXT NOT NULL,
  payload_json TEXT,
  status TEXT NOT NULL,
  created_at REAL NOT NULL,
  resolved_at REAL
)
```

```sql
automation_policies(
  id TEXT PRIMARY KEY,
  workflow_category TEXT NOT NULL,
  mode TEXT NOT NULL, -- review_first | always_execute
  max_per_transaction REAL,
  max_per_day REAL,
  max_per_month REAL,
  payment_source TEXT,
  allowed_merchants_json TEXT,
  allowed_categories_json TEXT,
  expires_at REAL,
  enabled INTEGER NOT NULL,
  created_at REAL NOT NULL,
  updated_at REAL NOT NULL
)
```

```sql
market_skills(
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  market TEXT NOT NULL, -- companion | studio | creator | shared
  category TEXT,
  permissions_json TEXT,
  allowed_kernels_json TEXT,
  requires_mode TEXT,
  setup_required INTEGER NOT NULL,
  enabled INTEGER NOT NULL,
  installed INTEGER NOT NULL,
  metadata_json TEXT
)
```

```sql
creator_projects(
  id TEXT PRIMARY KEY,
  title TEXT NOT NULL,
  asset_root TEXT,
  timeline_json TEXT,
  render_status TEXT,
  output_path TEXT,
  created_at REAL NOT NULL,
  updated_at REAL NOT NULL
)
```

```sql
transaction_audit(
  id TEXT PRIMARY KEY,
  workflow_category TEXT NOT NULL,
  action_type TEXT NOT NULL,
  amount REAL,
  currency TEXT,
  payment_source TEXT,
  merchant TEXT,
  policy_id TEXT,
  approval_id TEXT,
  status TEXT NOT NULL,
  payload_json TEXT,
  created_at REAL NOT NULL
)
```

### API Contract

Router existing tetap dipakai, tetapi endpoint baru harus dikelompokkan sesuai domain.

Shell:

```txt
GET  /api/shell/status
POST /api/shell/switch-kernel
GET  /api/shell/activity
POST /api/shell/emergency-stop
```

Approvals:

```txt
GET  /api/approvals/pending
POST /api/approvals/{id}/approve
POST /api/approvals/{id}/deny
POST /api/approvals/{id}/approve-once
```

Automation:

```txt
GET  /api/automation/policies
POST /api/automation/policies
PATCH /api/automation/policies/{id}
DELETE /api/automation/policies/{id}
POST /api/automation/dry-run
POST /api/automation/execute
GET  /api/automation/audit
```

Market:

```txt
GET  /api/market/skills
GET  /api/market/skills?market=companion
GET  /api/market/skills?market=studio
GET  /api/market/skills?market=creator
POST /api/market/skills/install/{skill_id}
DELETE /api/market/skills/uninstall/{skill_id}
POST /api/market/skills/test/{skill_id}
```

Creator:

```txt
GET  /api/creator/projects
POST /api/creator/projects
GET  /api/creator/projects/{id}
PATCH /api/creator/projects/{id}
POST /api/creator/projects/{id}/assets
POST /api/creator/projects/{id}/timeline
POST /api/creator/projects/{id}/preview
POST /api/creator/projects/{id}/export
GET  /api/creator/projects/{id}/render-status
POST /api/creator/projects/{id}/stop-render
```

Studio built-in tools:

```txt
GET  /api/studio/tools
POST /api/studio/tools/search
POST /api/studio/tools/read-file
POST /api/studio/tools/apply-patch
POST /api/studio/tools/run-command
GET  /api/studio/tools/command-status/{id}
POST /api/studio/tools/stop-command/{id}
POST /api/studio/tools/run-verification
GET  /api/studio/tools/changed-files
GET  /api/studio/tools/diff
```

Compatibility rule: endpoint lama seperti `/api/skills/marketplace` boleh tetap hidup sementara, tetapi harus menjadi alias ke Market router.

### Permission Matrix

| Action | Default Mode | Kernel | Always Execute? | Hard Block? |
| :--- | :--- | :--- | :--- | :--- |
| Read chat memory | Auto | Companion | Yes | No |
| Write companion memory | Review First for sensitive | Companion | Limited | No |
| Send email | Review First | Companion Professional | Yes, if policy matches | No |
| Calendar write | Review First | Companion Professional | Yes, if policy matches | No |
| Booking final | Review First | Companion Professional | Yes, if policy matches | No |
| Shopping purchase | Review First | Companion Professional | Yes, if policy matches | No |
| Publish listing | Review First | Companion Professional | Yes, if policy matches | No |
| Upload/publish content | Review First | Creator | Yes, if policy matches | No |
| Render/export video | Auto after request | Creator | Yes | No |
| Read project files | Auto in workspace | Studio | Yes | No |
| Write project files | Review First / task approved | Studio | Limited | No |
| Run command | Review First | Studio | Limited by command policy | No |
| Git commit/push | Explicit request | Studio | No by default | No |
| Legal consent/contract | Review First required | Companion/Automation | No | Yes for autopilot |
| Loan/credit/insurance/investment | Review First required | Companion/Automation | No | Yes for autopilot |
| Password/2FA/security changes | Review First required | Shell/Automation | No | Yes for autopilot |
| Delete account/data | Review First required | Shell/Automation | No | Yes for autopilot |

### UX State Contract

Semua kernel yang menjalankan aksi harus memakai state berikut:

```txt
idle
planning
waiting_approval
executing
waiting_external_service
verifying
completed
failed
cancelled
blocked
```

Mapping UI:

- `idle`: composer aktif, no spinner.
- `planning`: activity event `Thought` / `Planning`.
- `waiting_approval`: approval banner/modal aktif.
- `executing`: stream event berjalan.
- `waiting_external_service`: tampilkan service/platform yang ditunggu.
- `verifying`: build/test/render/upload check.
- `completed`: result summary.
- `failed`: error ringkas + detail + retry option.
- `cancelled`: jelas siapa yang membatalkan.
- `blocked`: alasan policy/permission jelas.

### Integration Strategy

Integrasi real-life tidak boleh langsung hardcoded ke satu provider. Gunakan adapter.

Layer integrasi:

```txt
Automation Orchestrator
  -> Connector Adapter
  -> Provider/API/Browser Automation/Manual Handoff
```

Mode integrasi:

- API resmi jika tersedia dan user menghubungkan akun.
- Browser automation jika API tidak tersedia dan user mengizinkan.
- Deep link/manual handoff jika aksi terlalu sensitif.
- Dry-run untuk semua transaksi sebelum `Always Execute` pertama kali aktif.

Kategori adapter:

- `email_adapter`
- `calendar_adapter`
- `booking_adapter`
- `shopping_adapter`
- `selling_adapter`
- `social_publish_adapter`
- `payment_source_adapter`

### Persistence Strategy

- Config global tetap di `state_store.config_store`.
- Kernel session, activity event, approval, automation policy, market skill cache, creator project, dan transaction audit masuk SQLite `state_store.db`.
- File media besar tidak masuk SQLite. Simpan path dan metadata saja.
- Studio file edits tetap memakai service existing `backend/studio/version_service.py` untuk versioning/rollback.
- Render/export output Creator disimpan sebagai file output, dengan metadata di `creator_projects`.
- Audit log tidak boleh auto-delete tanpa explicit retention policy.

### Threat Model Minimum

Threat yang wajib ditangani:

- prompt injection dari website/email/marketplace content
- skill marketplace abuse
- accidental checkout/purchase
- accidental publish/upload
- wrong payment source
- credential leak
- command injection
- destructive file action
- malicious media file
- user confusion between intimacy/professional mode

Mitigasi minimum:

- kernel scope check
- permission matrix
- approval request
- Always Execute policy constraints
- audit log
- emergency stop
- read-only preview before sensitive action
- hard-block high-stakes autopilot
- connector allowlist

### MVP Phasing

MVP 1: Shell Alignment

- 5 route skeleton: `/companion`, `/studio`, `/llm`, `/creator`, `/market`
- Sidebar 5 kernel
- Shell status bar
- kernel switch events

MVP 2: Studio Cockpit

- activity stream
- Studio composer
- built-in tools API skeleton
- changed-files summary
- Review Changes

MVP 3: Market Split

- Market router
- Market UI tabs: Companion, Studio, Creator
- skill metadata migration
- creator-aware skill manager

MVP 4: Creator Skeleton

- Creator page
- asset bin
- preview panel
- timeline placeholder
- render/export mock/status flow

MVP 5: Automation Governance

- approval service
- automation policy store
- Review First / Always Execute UI
- audit log
- dry-run flow

MVP 6: Real-Life Integrations

- email/calendar first
- then booking/shopping/selling
- then social upload/publish
- each integration starts with dry-run and manual handoff before Always Execute.

### Audit and Recovery

Audit minimum:

- every external action
- every approval decision
- every Always Execute action
- payment source used
- amount/currency
- target merchant/platform
- result status
- raw provider reference if available

Recovery rules:

- File edits by Studio: use `revert_own_change` / version service.
- Commands: can stop running process, cannot always undo result.
- Email sent: cannot undo; can draft apology/follow-up.
- Booking/purchase: can attempt cancellation/refund if provider supports it.
- Listing publish: can unpublish/edit if provider supports it.
- Upload content: can delete/unpublish if provider supports it.
- Legal/financial high-stakes: no autopilot; always user final review.

---

## TODO Fact-Check Existing Implementation

Audit cepat terhadap kondisi repo saat ini menunjukkan bahwa dokumen ini adalah arah target, belum kondisi implementasi penuh. Status di bawah ini harus dipakai sebagai daftar kerja prioritas agar kode benar-benar selaras dengan SSOT.

### Sudah Ada / Sebagian Selaras

- **Backend micro-kernel sudah modular sebagian.**
  `backend/main.py` sudah ringan dan hanya melakukan startup, middleware, static mount, dan mounting router: `llm_router`, `studio_router`, `companion_router`.

- **Kernel backend yang sudah ada: Companion, Studio, LLM.**
  File yang sudah ada:
  - `backend/api/companion_router.py`
  - `backend/api/studio_router.py`
  - `backend/api/llm_router.py`

- **Power-state switching Companion/Studio sudah ada sebagian.**
  Frontend `App.tsx` mengirim `SWITCH_TO_STUDIO` saat masuk `/studio`, selain itu mengirim `SWITCH_TO_COMPANION`. Backend `companion_router.py` menangani dua event ini dan mengirim state `SLEEP` / `WAKE`.

- **Frontend lazy loading sudah ada.**
  `frontend/src/App.tsx` sudah memakai `React.lazy()` untuk Companion, Studio, LLM, SkillMarketplace, Emotion, IamMia, Crone, dan Onboarding.

- **Companion mode professional sudah ada sebagai toggle UI/config.**
  `frontend/src/components/settings/CompanionSettings.tsx` punya toggle `is_professional_mode`. Ini selaras sebagian dengan konsep Companion `professional` mode, tetapi belum punya workflow assistant nyata.

- **Companion intimacy mode sudah ada.**
  `frontend/src/Companion.tsx` punya toggle intimacy dan endpoint `/api/intimacy/toggle`, termasuk touch endpoint `/api/intimacy/touch`.

- **LLM Warehouse sudah ada sebagai halaman dan router.**
  `frontend/src/LLMPage.tsx` dan `backend/api/llm_router.py` sudah menjadi basis untuk provider/model management.

- **Studio backend punya beberapa fondasi.**
  `backend/studio/` sudah punya service untuk execution, file/versioning, git guard, IDE discovery, graph stream, locks, logs, dan tests. `backend/api/studio_router.py` sudah menyediakan endpoint Git status, IDE discovery, skills, dan websocket events.

- **Skill scoping Companion/Studio sudah ada sebagian.**
  `backend/skill_manager.py` sudah memblokir skill berdasarkan `category`:
  - Companion boleh `companion` dan `shared`
  - Studio boleh `studio` dan `shared`

- **Marketplace lama sudah ada.**
  `frontend/src/SkillMarketplace.tsx` dan endpoint `/api/skills/marketplace` sudah ada. Marketplace saat ini masih berbasis kategori lama, tetapi bisa menjadi fondasi Market Kernel.

- **Monaco belum terlihat dipakai di kode TSX.**
  Dependency `@monaco-editor/react` masih ada di `frontend/package.json`, tetapi pencarian kode tidak menemukan import aktif. Ini berarti arah "tanpa Monaco" sudah relatif aman untuk dilanjutkan dengan cleanup dependency.

### Belum Ada / Belum Selaras

- **File lama sudah rename ke `docs/1App5Kernell.md`.**
  Referensi langsung ke `1App4Kernell.md` di dokumen utama telah diarahkan ke `1App5Kernell.md`. Jika ada referensi baru muncul, perlakukan sebagai drift dokumentasi.

- **Routing final 5 kernel belum ada.**
  Target SSOT:
  - `/companion`
  - `/studio`
  - `/llm`
  - `/creator`
  - `/market`

  Kondisi sekarang:
  - `/` masih Companion
  - `/studio` sudah ada
  - `/llm` sudah ada
  - `/skills` masih Market lama
  - `/creator` belum ada
  - `/market` belum ada
  - `/companion` belum ada

- **Sidebar belum menampilkan 5 kernel.**
  `frontend/src/Sidebar.tsx` saat ini hanya menampilkan Companion, Studio, LLM Warehouse, dan Store lama. Belum ada Creator dan belum memakai route `/market`.

- **Creator Kernel belum ada.**
  Belum ditemukan:
  - `frontend/src/Creator.tsx`
  - `backend/api/creator_router.py`
  - `backend/creator/`
  - route `/creator`
  - `SWITCH_TO_CREATOR`
  - media approval gate
  - asset bin, timeline, preview player, render/export queue

- **Market Kernel belum ada sebagai router/domain mandiri.**
  Belum ada `backend/api/market_router.py`. Endpoint market masih berada di `companion_router.py` dan sebagian `studio_router.py`.

- **Market belum terbagi menjadi Companion / Studio / Creator.**
  `SkillMarketplace.tsx` saat ini membagi tampilan ke `"Lifestyle & Chat"` vs developer-ish category. Belum ada:
  - Companion Market
  - Studio Market
  - Creator Market
  - metadata `market`
  - `allowed_kernels`
  - permission category untuk professional assistant dan creator media workflow

- **Skill metadata belum sesuai SSOT.**
  Existing marketplace skills memakai `__skill_metadata__` dengan field `category`, bukan field `market`. `backend/skill_manager.py` juga menormalisasi `category`, belum membaca `market`, `allowed_kernels`, `requires_mode`, atau permission policy yang lebih detail.

- **Skill manager belum mengenal Creator.**
  `is_skill_allowed_for_kernel()` hanya menangani `companion` dan `studio`. Kernel `creator` akan selalu ditolak karena belum ada branch creator.

- **Studio `/studio` belum menjadi activity-stream cockpit seperti target.**
  `StudioPage.tsx` masih punya launcher, chat cockpit, terminal, IDE discovery, graph/resilience panels, dan simulasi pesan "kode ditulis". Belum ada activity event model resmi seperti:
  - `Thought for Ns`
  - `Analyzed <file> #Lx-Ly`
  - `Searched <query>`
  - `Edited N files`
  - `Ran <command>`
  - `Checked command status`
  - `Waiting for command completion`
  - changed-files summary
  - `Review changes`

- **Bottom composer `/studio` belum sesuai SSOT.**
  Belum ada composer dengan kontrak lengkap: follow-up instruction, stop action, auto-review toggle, model/effort selector, pending approval state, changed-files summary, dan review button.

- **Tools bawaan Studio belum dipublikasi sebagai API/tool contract.**
  Backend punya beberapa service, tetapi belum ada tool layer eksplisit untuk:
  - `list_files`
  - `grep/search_text`
  - `search_symbol`
  - `read_file_range`
  - `apply_patch`
  - `generate_diff`
  - `run_command`
  - `check_command_status`
  - `wait_for_command`
  - `stop_command`
  - `run_build`
  - `run_tests`
  - browser/local verification
  - approval safety tools

- **Action/Automation Orchestrator belum ada.**
  Belum ada Shell-level orchestrator untuk routing email, calendar, booking, shopping, selling/listing, upload/publish, dan dev automation ke kernel yang tepat.

- **`Review First` / `Always Execute` belum ada.**
  Belum ditemukan policy store atau UI settings untuk:
  - execution mode per workflow
  - batas nominal per transaksi
  - batas harian/bulanan
  - rekening/kartu/e-wallet/payment source
  - merchant/platform allowlist
  - expiry
  - emergency stop
  - audit log real-life transaction

- **Professional assistant skills belum ada.**
  Belum ada implementation untuk email, calendar, booking, shopping, selling/listing, contact follow-up. Toggle `is_professional_mode` sudah ada, tetapi belum mengaktifkan assistant workflow nyata.

- **Upload/publish content belum diarahkan ke Creator.**
  Karena Creator belum ada, flow upload content, schedule post, publish social, caption workflow, dan render/export belum terimplementasi.

- **Power-state switching belum mencakup 5 kernel.**
  Saat ini hanya ada Companion vs Studio. Belum ada:
  - `SWITCH_TO_LLM`
  - `SWITCH_TO_CREATOR`
  - `SWITCH_TO_MARKET`
  - state management resource untuk render/export Creator
  - state management untuk Market/LLM low-power mode

- **Global status bar Shell belum ada sebagai surface tunggal.**
  Belum ada status bar yang selalu menampilkan active kernel, websocket status, active model, provider health, power state, pending approval count, running task count, dan emergency stop.

### Yang Salah / Drift terhadap SSOT

- **Marketplace endpoints berada di Companion router.**
  Ini drift arsitektur. Market seharusnya kernel sendiri, bukan domain Companion.

- **Skill classification masih `category`, bukan `market`.**
  Plan SSOT meminta Market terbagi Companion/Studio/Creator. Existing code memakai kategori `companion`, `studio`, `shared`, dan UI lama `Lifestyle & Chat`. Ini perlu migrasi metadata.

- **`media_curator` dikategorikan berbeda antara installed dan marketplace.**
  `backend/skills/media_curator.py` memakai legacy `metadata` dengan `"category": "Media"`, sementara `backend/marketplace_skills/media_curator.py` memakai `__skill_metadata__` dengan `"category": "shared"`. Ini bisa membuat filtering UI/backend tidak konsisten.

- **`save_skill()` default selalu membuat skill Companion.**
  `backend/skill_manager.py` menyisipkan metadata default `"category": "companion"` jika code belum punya `__skill_metadata__`. Ini tidak cocok untuk Market Kernel multi-domain. Default harus eksplisit dipilih user, bukan diam-diam companion.

- **Studio UI masih mengarah ke IDE/local editor workflow.**
  SSOT memutuskan MIA bukan web IDE dan Studio adalah agent cockpit. Existing `StudioPage.tsx` masih punya IDE discovery/open IDE dan pesan "sinkronkan ke editor lokal Anda". Ini boleh tetap sebagai integrasi opsional, tetapi tidak boleh menjadi alur utama Studio.

- **Monaco dependency masih ada.**
  Walaupun tidak terlihat dipakai, `@monaco-editor/react` masih di dependency. Ini drift kecil terhadap keputusan "tanpa Monaco" dan perlu dihapus setelah dipastikan tidak ada import tersembunyi.

- **Companion Professional belum dibatasi oleh policy nyata.**
  Toggle mode profesional sudah ada, tetapi belum ada batas mode `normal/intimacy/professional` terhadap aksi email/booking/belanja. Ini risk gap jika nanti tools eksternal ditambahkan tanpa policy.

### Perbaikan yang Disarankan

1. **Jaga referensi dokumen tetap canonical.**
   Semua rujukan arsitektur app-level harus mengarah ke `docs/1App5Kernell.md`. Dokumen module/historical boleh tetap ada, tetapi wajib menyatakan statusnya.

2. **Tambah routing 5 kernel di frontend.**
   - Tambah `/companion` sebagai route resmi.
   - Jadikan `/` alias ke `/companion`.
   - Tambah `/creator`.
   - Tambah `/market`.
   - Jadikan `/skills` alias ke `/market`.
   - Pindahkan `/emotion` dan `/iam-mia` menjadi subtab Companion.
   - Pindahkan `/crone` dan resilience menjadi subtab Studio.

3. **Update Sidebar menjadi 5 kernel.**
   Tampilkan Companion, Studio, LLM, Creator, Market. Jangan lagi memakai label Store lama sebagai route utama.

4. **Buat Creator Kernel minimum.**
   - `frontend/src/Creator.tsx`
   - `backend/api/creator_router.py`
   - `backend/creator/`
   - route `/creator`
   - `SWITCH_TO_CREATOR`
   - skeleton UI: brief composer, asset bin, preview panel, timeline placeholder, render/export panel, activity stream media.

5. **Ekstrak Market Kernel.**
   - Buat `backend/api/market_router.py`.
   - Pindahkan endpoint `/api/skills/*` dari Companion ke Market router atau alias-kan dulu.
   - Tambah endpoint market-filtered: companion/studio/creator.

6. **Migrasi skill metadata.**
   Target metadata baru:
   ```python
   __skill_metadata__ = {
       "name": "...",
       "market": "companion|studio|creator|shared",
       "category": "...",
       "permissions": [],
       "allowed_kernels": [],
       "requires_mode": None,
       "setup_required": False,
       "enabled_by_default": False,
   }
   ```
   `skill_manager.py` harus membaca `market`, bukan hanya `category`, dan harus mengenal kernel `creator`.

7. **Perbaiki `save_skill()` agar domain eksplisit.**
   Jangan default ke Companion. UI harus meminta target market/kernel saat membuat skill.

8. **Bangun Studio Activity Stream contract.**
   Buat model event standar:
   - `thought`
   - `analyzed_file`
   - `searched`
   - `edited`
   - `ran_command`
   - `command_status`
   - `waiting`
   - `verification_result`
   - `changed_files`
   - `blocked`

9. **Bangun Review Changes surface.**
   Tambah changed-files summary, diff read-only, additions/deletions, undo own changes, run verification, dan follow-up composer.

10. **Bangun Studio built-in tools API.**
    Buat layer tool eksplisit di backend untuk discovery, search, read, patch, command/process, verification, git inspection, browser verification, dan approval safety.

11. **Tambahkan Action/Automation Orchestrator.**
    Buat service Shell-level untuk routing:
    - Companion Professional: email, calendar, booking, shopping, selling/listing.
    - Creator: upload/publish content, render/export, caption workflow.
    - Studio: command/file/Git/dev workflow.

12. **Implement `Review First` / `Always Execute` policy store.**
    Buat UI settings dan backend store untuk:
    - workflow category
    - nominal limit per transaction/day/month
    - payment source/rekening/e-wallet
    - merchant/platform allowlist
    - allowed categories
    - expiry
    - notification channel
    - emergency stop
    - audit log

13. **Tambah hard-block high-stakes actions.**
    Walaupun `Always Execute` aktif, tetap paksa `Review First` untuk legal consent, loans, credit, insurance, investment, medical/legal/financial high-stakes, password/2FA/security changes, account deletion, dan transaksi di luar policy.

14. **Hapus Monaco dependency jika aman.**
    Setelah build lolos tanpa import Monaco, hapus `@monaco-editor/react` dari `frontend/package.json` dan lockfile.

15. **Verifikasi bertahap.**
    Setelah perubahan kode:
    - jalankan backend check
    - jalankan frontend build
    - uji route `/companion`, `/studio`, `/llm`, `/creator`, `/market`
    - uji websocket switching 5 kernel
    - uji Market filtering
    - uji Studio activity stream
    - uji Always Execute policy dengan dry-run sebelum aksi nyata
