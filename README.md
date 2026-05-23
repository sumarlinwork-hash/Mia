# MIA — AI Operating Shell

MIA adalah My Intelligent Assistant yang dirancang sebagai AI Operating Shell: mediator antara user, LLM, dan PC. Ini bukan web IDE. Frontend adalah cockpit ringan untuk melihat rencana, memberi izin, memantau eksekusi, dan menerima hasil.

## Prinsip Utama

- **1 Shell**: Satu aplikasi utama mengatur navigasi, status global, permission prompt, event log, dan komunikasi antar-kernel.
- **5 Independent Kernels**: Companion, Studio, LLM Warehouse, Creator, dan Market berjalan sebagai domain mandiri.
- **App sebagai perantara**: MIA menghubungkan user dengan LLM dan PC tools secara governed, tanpa menggantikan terminal atau editor lokal.
- **No silent failure**: Semua aksi besar jelas berstatus: planned, waiting approval, running, succeeded, failed, fallback, atau blocked.
- **Strict permission boundary**: Batas domain ketat untuk menjaga kepercayaan dan keamanan.
- **Low hardware burden**: UI ringan dan fokus pada informasi, bukan efek visual atau editor berat.

## Arsitektur

MIA terdiri dari satu Shell dan lima kernel:

- **Companion**: personal chat, persona, memory, voice, dan assistant harian.
- **Studio**: LLM-to-PC cockpit untuk task, planning, approval, file actions, dan command execution.
- **LLM Warehouse**: model/provider registry, routing, health, fallback, dan budget.
- **Creator**: content production dan video editing cockpit dengan asset, storyboard, timeline, preview, dan export.
- **Market**: marketplace kemampuan dan skill yang aman untuk masing-masing kernel.

Shell mengorkestrasi:

- active kernel
- global status bar
- permission requests
- notifications
- event stream
- routing
- power-state switching
- emergency stop

## Domain dan Batas Aman

### Companion

Companion adalah front door untuk interaksi personal dan assistant. Ia boleh membantu dengan:

- chat personal dan memory
- voice input/output
- draft email, booking, jadwal, shopping, list jualan, reminder, dan follow-up dengan approval

Companion tidak boleh:

- mengedit file project
- menjalankan terminal/Git
- install dependency
- melakukan aksi eksternal sensitif tanpa izin eksplisit

### Studio

Studio adalah cockpit kerja yang transparan. Fokusnya:

- prompt task dan plan
- activity stream
- read-only terminal/log
- diff viewer dan changed files
- verification build/test
- approval gate untuk aksi berisiko

### LLM Warehouse

LLM Warehouse mengelola provider dan model:

- registry provider
- active/default model selector
- fallback dan circuit breaker
- latency, health, budget, dan key presence

### Creator

Creator adalah kernel produksi konten, terpisah dari Companion dan Studio. Fungsinya:

- brief dan script generation
- asset bin dan timeline editing
- preview dan render/export
- subtitle, caption, dan brand voice

Creator hanya bekerja dengan folder dan media yang diizinkan, serta meminta konfirmasi untuk output atau overwrite.

### Market

Market menyediakan skill terpisah dan aman untuk masing-masing kernel, dengan batasan domain yang jelas.

## Fitur Kunci

- activity stream untuk semua kerja agent
- review changes sebagai surface inspeksi utama
- policy `Review First` dan `Always Execute` dengan limit dan scope
- approval screen, audit log, dry-run, emergency stop
- no manual code editor sebagai alur utama

## Tujuan

MIA bertujuan menjadi AI assistant yang terasa:

- dapat dipercaya
- jelas dalam niat dan status
- aman dalam eksekusi
- berguna dalam pekerjaan nyata dan kreatif

---

Dokumentasi konsep lengkap berada di `docs/1App5Kernell.md`.
