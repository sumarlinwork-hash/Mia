# 🛡️ MIA Unified Provider Architecture: Strategic Plan
**Goal:** Menghilangkan kebingungan URL, memastikan penambahan provider 100% Berhasil, dan mengotomatiskan segalanya di latar belakang.

## 1. Filosofi "Zero-Configuration"
Tugas Bos hanya dua: Masukkan **Model ID** dan **API Key**. 
MIA yang harus memikirkan: *"Ke mana saya harus mengirim data ini?"* dan *"Bahasa apa yang harus saya pakai?"*

---

## 2. Komponen Arsitektur Baru

### A. The Grand Resolver (Backend Engine)
Pusat komando baru di backend yang akan memproses input Bos.
- **Auto-Endpoint Construction:** MIA akan menyimpan database pola URL (HuggingFace Hub, OpenAI, Gemini, Groq, dll).
- **HuggingFace Smart-Switch:** 
    - Jika Model = Populer (Llama/Gemma) -> Gunakan jalur **Router** (Cepat).
    - Jika Model = Niche/Custom (Harrier/User-Model) -> Gunakan jalur **Native Hub** (Universal).
- **Auto-Protocol Detection:** Mendeteksi secara instan apakah model tersebut butuh format OpenAI, Gemini, atau Native HuggingFace.

### B. UI Simplified (Frontend)
- **Target URL** akan diubah fungsinya menjadi **"Target URL (Auto/Manual)"**.
- Secara default, kolom ini akan terisi **"AUTO"** saat Bos memilih preset.
- Jika "AUTO", Backend yang akan meresolusi alamat terbaik. Jika Bos ingin manual, Bos tetap punya otoritas penuh.

### C. The Resilience Handshake (Testing)
Tombol "Test" tidak hanya mengetes satu URL, tapi akan mencoba **Fallback Chain**:
1. Coba jalur tercepat (Router). 
2. Jika 400/404, coba jalur universal (Native Hub).
3. Jika tetap gagal, berikan saran cerdas ke Bos (misal: "Model ini butuh lisensi di HF").

---

## 3. Langkah Implementasi (The Road to 100% Success)

1. **[Backend] Centralized Resolver:** Membuat modul `provider_resolver.py` yang menampung semua logika cerdas di atas.
2. **[Backend] Unified Execution:** Menyatukan fungsi `test_provider` di `main.py` dan eksekusi chat di `brain_orchestrator.py` agar menggunakan modul resolver yang sama (Single Source of Truth).
3. **[Frontend] Dynamic Presets:** Mengupdate list preset agar lebih bersih dan hanya fokus pada Model ID.

---

## 5. Anti-Failure & Risk Mitigation (Pencegahan Gagal)

| Faktor Penghalang | Dampak | Solusi Cerdas MIA |
| :--- | :--- | :--- |
| **Gated Models** | Error 403 (Forbidden) | MIA mendeteksi string "gated model" dan memberikan link aktivasi ke Bos. |
| **Rate Limits** | Error 429 (Too Many Requests) | Implementasi **Smart Retry** dengan interval waktu yang bertambah. |
| **WAF / IP Block** | Koneksi Terputus (403/Timeout) | MIA melakukan **Network Probe** untuk membedakan blokir ISP vs kesalahan API Key. |
| **Model Deprecated** | Error 404 (Not Found) | MIA menyarankan model terbaru yang tersedia dari provider tersebut. |
| **Payload Mismatch** | Error 400 (Bad Request) | **Protocol Auto-Switch**: Jika format OpenAI gagal, MIA coba format alternatif. |

---

## 6. Security & Compliance Guarantee (Jaminan Keamanan)

Sistem ini dirancang untuk mematuhi **MIA Execution Contract** secara ketat:

- **SSRF Protection:** Semua resolusi URL dilakukan di sisi Server. MIA hanya akan mengizinkan koneksi ke domain yang terverifikasi (Whitelist).
- **Credential Integrity:** API Key tidak pernah dicatat dalam log publik atau dikirim melalui channel yang tidak aman.
- **Audit Transparency:** Setiap aksi "Smart-Switch" dicatat secara permanen di Audit Log untuk transparansi penuh.
- **Sandbox Isolation:** Proses koneksi diisolasi untuk mencegah kontaminasi antar-proyek (No Cross-Project Leakage).

---

## 7. Internal Component Synchronization (Harmonisasi Sistem)

Agar tidak terjadi konflik dengan modul yang sudah ada, berikut adalah protokol integrasinya:

- **`shad_csa` Integration:** Resolver harus merespons dalam < 200ms agar tidak memicu timeout pada sistem kontrol resiliensi.
- **`mia_comm` Clean-up:** Menghapus logika pemanggilan API redundan di `brain_orchestrator.py` dan menggantinya dengan call ke `Grand Resolver`.
- **`iam_mia` Integrity:** Resolver dilarang memodifikasi "Isi Pesan" dari sistem kepribadian; ia hanya boleh mengubah "Bungkus Teknis"-nya (Header/JSON Schema).
- **`history` Preservation:** Menyediakan formatter khusus untuk jalur Native (HuggingFace) agar konteks percakapan tetap utuh (Long-term Memory persistence).

---

## 8. Alignment with SHAD-CSA v2.0 Master Spec (Kepatuhan Arsitektur)

Sistem ini menjamin kepatuhan terhadap dokumen `mia_comm.md`:

- **Execution Contract:** Resolver mendukung amanat "Always Return String" dengan menyediakan pesan Error Diagnostik yang informatif jika terjadi kegagalan total.
- **Healing Support (Level 2):** Fitur "Auto-Switch" (Router -> Hub) adalah implementasi langsung dari protokol *Provider Swap* pada spek SHAD-CSA.
- **Circuit Breaker Integration:** Resolver menghormati status *Circuit Breaker* dan tidak akan memicu request pada node yang sedang dalam status OPEN (Blocked).
- **Telemetry-Ready:** Semua latensi dan kegagalan dilaporkan ke `health_score` engine untuk mendukung *Predictive Healing* (Level 5).

---

## 9. Single Source of Truth (SSOT) Enforcement (Rujukan Tunggal)

Untuk menjamin konsistensi total, sistem ini mewajibkan:

- **Absolute Authority:** `config.json` adalah satu-satunya rujukan untuk status provider, model ID, dan API Key.
- **Dynamic Refresh:** Setiap kali ada interaksi (Chat atau Test), sistem WAJIB membaca ulang `config.json` untuk memastikan data paling baru yang digunakan.
- **No Hardcoded Defaults:** Backend dilarang memiliki nilai default yang keras (hardcoded) yang bisa menimpa atau mengaburkan data di `config.json`.
- **Synchronized State:** Perubahan di `config.json` harus langsung tercermin di semua proses (Brain & Studio) tanpa perlu restart aplikasi.

---

**Sekarang "Konstitusi" MIA sudah lengkap, Bos. config.json resmi menjadi Raja. Siap eksekusi?**
