MIA 3D AVATAR PLAN — REVISED (PRODUCTION-READY VERSION v2)

Visi:
Membangun sistem 3D avatar real-time yang tidak hanya interaktif secara visual, tetapi juga memiliki arsitektur yang scalable, maintainable, dan mampu berkembang menjadi “AI Character Engine” (bukan sekadar renderer avatar), dengan fokus pada behavior realism dan sistem yang tahan terhadap kompleksitas jangka panjang.

---

## 1. CORE ARCHITECTURE (REFACTOR UTAMA)

---

Sistem dipisahkan menjadi beberapa layer jelas:

1. AvatarRenderer

   * Bertanggung jawab hanya untuk rendering (Three.js + R3F)
   * Tidak mengandung business logic

2. AnimationController

   * Mengelola AnimationMixer, clip, blending
   * Menerima state final (bukan event mentah)
   * Bertugas melakukan mapping state → animasi

3. StateMachine (INTI SISTEM)

   * Mengelola state karakter berbasis layered state:
     {
     base: "idle",
     emotionVector: {
       arousal,
       warmth,
       happiness,
       reassurance,
       dominance,
       respect
     },
     overlay: "look_at_mouse"
     }

   * Menghindari flat state untuk mencegah combinatorial explosion

   * Menghasilkan "resolved state" yang stabil untuk AnimationController

   * StateMachine tidak mengubah Emotional Engine, tetapi membaca dan menerjemahkan nilai-nilai tersebut menjadi behavior state.

4. InteractionController

   * Handle input user (mouse, click, time-based event)
   * Tidak langsung memicu animasi, tetapi mengirim intent

5. EventProcessor

   * Menerima event dari backend & interaction
   * Memiliki:

     * Event Queue
     * Priority Resolver
     * Debounce / Cooldown system
   * Mengirim hasil ke StateMachine

Catatan:
useFrame hanya digunakan untuk apply transform & interpolation, bukan untuk logic atau decision making.

---

## 2. ENGINE & RENDERING

---

Stack:

* Three.js + React Three Fiber (R3F)
* @pixiv/three-vrm

Optimasi:

* Low-poly model (<15k triangles)
* Disable shadow, reflection, post-processing berat
* Reuse geometry & material
* Gunakan r3f-perf untuk monitoring

Tambahan:

* Device profiling saat startup
* Adaptive quality system:

  * FPS < 40 → disable eye tracking
  * FPS < 30 → reduce animation update rate
  * FPS < 25 → simplify animation blending

Tujuan:
Menjaga stabilitas, bukan hanya peak performance.

---

## 3. MODEL & ASSET PIPELINE

---

Format:

* VRM (export dari VRoid Studio)

Standarisasi:

* Semua model harus menggunakan rig yang sama
* Semua animasi harus sudah retarget ke rig tersebut
* Penamaan bone harus konsisten

Pipeline:

* VRoid (model base)
* Mixamo (animasi)
* Retargeting → Standard Rig
* Convert ke GLTF / VRM-compatible

Tambahan:

* Animation tagging system (UPGRADE):

  Tag tidak lagi bersifat tunggal (emotion_happy), tetapi multi-dimensional
  dan dapat dipetakan terhadap emotional engine.

  Contoh tag:

  base_idle
  base_shift

  overlay_look_user
  overlay_body_lean

  intensity_low
  intensity_mid
  intensity_high

  style_soft
  style_playful
  style_dominant

  attention_seek
  attention_hold

  Setiap animasi dapat memiliki metadata tambahan:
  - cocok untuk arousal range tertentu
  - cocok untuk warmth level tertentu
  - bias terhadap dominance / reassurance

Tujuan:
* Animasi tidak hanya berdasarkan kategori, tetapi dipilih berdasarkan kondisi emosional karakter (terutama arousal & variabel lain)
* Menghindari mismatch rig & mempermudah scaling animasi

---

## 4. ANIMATION SYSTEM (STATE-DRIVEN)

---

Menggunakan:

* AnimationMixer + Layered State Machine

State bukan kombinasi manual:
Bukan:
playAnimation("jump_happy")

Melainkan:
state = {
  base: "idle",
  emotionVector: {
    arousal: 70,
    warmth: 60,
    happiness: 50,
    reassurance: 30,
    dominance: 40,
    respect: 80
  },
  overlay: "look_at_mouse"
}

StateMachine akan:

* resolve konflik antar state
* menentukan prioritas layer
* memilih animasi dari tag

Fitur:

* Crossfade terkontrol
* Interrupt handling berbasis priority
* Layering (body + facial + overlay)
* Animation fallback jika tidak tersedia

Tujuan:
Menghindari animation conflict & spaghetti logic.

Tambahan:

AnimationController tidak hanya memilih animasi berdasarkan tag,
tetapi juga mempertimbangkan nilai dari Emotional Engine.

Selain mempengaruhi pemilihan animasi, nilai emotional engine juga
mempengaruhi kecenderungan perilaku.

Contoh:

- Arousal tinggi → animasi dengan intensity tinggi & respons lebih cepat
- Warmth tinggi → animasi dengan style lebih lembut
- Dominance tinggi → postur lebih tegas
- Reassurance need tinggi → meningkatkan probabilitas behavior attention-seeking dan interaction initiation

* Dengan pendekatan ini, animasi menjadi representasi dari kondisi internal,
bukan hanya trigger statis.
* Pendekatan ini memungkinkan karakter menampilkan variasi perilaku yang lebih luas tanpa perlu menambah jumlah animasi secara eksplisit.

---

## 5. STATE EXPLOSION PREVENTION

---

Masalah:
Jumlah kombinasi state akan meningkat secara eksponensial.

Solusi:

* Gunakan layered state (base + emotion + overlay)
* Hindari hardcoded kombinasi
* Gunakan rule-based resolution:

  * emotion tidak mengubah locomotion
  * overlay tidak override base

Contoh:

base: idle
emotionVector: {
  arousal: 20,
  warmth: 30,
  happiness: 20,
  reassurance: 60,
  dominance: 20,
  respect: 80
}
overlay: look_mouse

→ tetap idle, tapi dengan ekspresi low energy + kecenderungan mencari perhatian


---

## 6. EVENT SYSTEM & CONFLICT HANDLING

---

Masalah:
Multiple event bisa datang bersamaan (backend + user + system).

Solusi:

EventProcessor memiliki:

1. Queue system
2. Priority level (0–5)
3. Cooldown / debounce

Contoh event:

{
"intent": "emotion_change",
"value": "happy",
"priority": 2,
"duration": 3000
}

Aturan:

* Event priority tinggi bisa interrupt state
* Event low priority akan diabaikan jika konflik
* Event dengan durasi memiliki lifecycle

Tujuan:
Menghindari jitter, spam, dan animation conflict.

---

## 7. MICRO-BEHAVIOR SYSTEM (LIFE-LIKE LAYER)

---

Tambahan behavior kecil:

* Auto blink (random interval)
* Breathing idle
* Subtle body shift
* Random idle variation

Eye tracking:

* Lerp smoothing
* Delay kecil (human-like reaction)
* Micro jitter

Contoh:
currentLook = lerp(currentLook, target, 0.08)

Tambahan:

* Probabilistic behavior (tidak selalu respon sama)
* Reaction delay (tidak instan)

Micro-behavior juga dipengaruhi oleh emotional engine:

- Arousal mempengaruhi frekuensi gerakan kecil
- Warmth mempengaruhi smoothness gerakan
- Reassurance need meningkatkan kecenderungan mencari perhatian

Tujuan:
Meningkatkan perceived intelligence & menghindari kesan robotik.

---

## 8. WARDROBE SYSTEM (SCALABLE DESIGN)

---

Pendekatan awal (DITINGGALKAN):

* Toggle mesh visible

Pendekatan baru:

* Dynamic asset loading
* Load on demand (per outfit)

Strategi:

1. Load clothing saat dibutuhkan
2. Share skeleton
3. Disable body mesh yang tertutup (anti clipping)
4. Optional:

   * Texture swap
   * Mesh merge saat runtime

Masalah yang dihindari:

* Clipping
* Memory bloat
* Load time berat

---

## 9. BACKEND INTEGRATION (INTENT-BASED)

---

Backend tidak mengontrol animasi secara langsung.

Menggunakan intent-based contract:

{
"intent": "action",
"value": "jump",
"priority": 3,
"duration": 1500
}

Frontend:

* EventProcessor menerima
* Queue + resolve
* Kirim ke StateMachine

Tambahan:

* Event batching (jika diperlukan)
* Rate limiting dari backend

Tujuan:

* Decoupling backend & visual layer
* Fleksibilitas behavior

---

## 10. MEMORY & LIFECYCLE MANAGEMENT

---

Wajib:

* Dispose geometry saat tidak dipakai
* Dispose texture
* Cleanup AnimationMixer
* Clear unused animation clips
* Unmount scene dengan benar

Tambahan:

* Asset reference tracking
* Lazy unloading asset lama

Tujuan:
Mencegah memory leak dan degradasi performa jangka panjang.

---

## 11. PERFORMANCE TARGET (REALISTIS)

---

Target:

* Stabil di device mid-low

Strategi:

* Adaptive degradation
* Dynamic LOD
* Reduce update rate saat FPS drop
* Disable non-critical system saat drop:

  * eye tracking
  * micro behavior

Catatan:
60 FPS di low-end = target optimis, bukan baseline wajib.

---

## 12. IMPLEMENTASI BERTAHAP

---

Phase 1:

* Load VRM + idle animation
* Setup renderer

Phase 2:

* StateMachine (layered)
* AnimationController

Phase 3:

* EventProcessor + queue + priority

Phase 4:

* Eye tracking + micro-behavior

Phase 5:

* Wardrobe system (dynamic load)

Phase 6:

* Backend integration (intent-based)

Phase 7:

* Performance optimization + stress test

---

## 13. KESIMPULAN

---

Versi ini tidak hanya fokus pada rendering dan fitur visual, tetapi juga:

* mencegah state explosion sejak awal
* menangani event conflict & concurrency
* menjaga scalability saat fitur bertambah
* meningkatkan perceived intelligence karakter

Dengan pendekatan ini, sistem berkembang dari:

“3D Avatar Viewer”

menjadi:

“Scalable AI Character Engine”

---

## ADDENDUM v2
(Vectorized Emotional Model & Matrix-Based Behavior Mapping)

---

TUJUAN

Mengganti pendekatan scalar terpisah menjadi:
- Model berbasis vektor (clean)
- Interaksi emosi via matrix (scalable)
- Mapping langsung ke behavior & animation

Semua dihitung dalam satu pipeline matematis.

---

1. EMOTIONAL STATE VECTOR

Definisikan state sebagai vektor:

E = [
  arousal,
  warmth,
  happiness,
  reassurance,
  dominance,
  respect
]^T

Contoh:

E =
[0.75, 0.85, 0.80, 0.70, 0.55, 0.80]^T

---

2. EMOTIONAL INTERACTION MATRIX

Gunakan matrix 6x6 untuk memodelkan interaksi antar emosi:

M =

[ 1.0  -0.5   0.2   0.3   0.2   0.0
  0.0   1.0   0.3   0.2  -0.2   0.1
  0.1   0.2   1.0   0.3  -0.1   0.2
  0.2   0.3   0.2   1.0  -0.2   0.1
  0.3  -0.3  -0.2   0.2   1.0   0.1
  0.0   0.2   0.3   0.2  -0.1   1.0 ]

Interpretasi contoh:
- warmth (-0.5) menurunkan arousal
- arousal (+0.3) meningkatkan reassurance drive
- dominance (-0.3) menurunkan warmth
- dll

---

3. EFFECTIVE EMOTIONAL VECTOR

Hitung:

E_eff = clamp(M × E, 0, 1)

Perhitungan (ringkas):

E_eff ≈
[
 0.47,
 0.88,
 0.92,
 0.89,
 0.48,
 0.93
]

Interpretasi:
- Arousal turun (teredam warmth)
- Warmth & happiness tetap tinggi
- Reassurance naik (engagement kuat)
- Dominance jadi moderat

---

4. BEHAVIOR PROJECTION MATRIX

Mapping dari emosi → parameter animasi:

B = W × E_eff

Dimana W adalah matrix (behavior weights):

W =

[ 1.2   0.0   0.2   0.3   0.2   0.0   ← intensity
  0.0   1.3   0.3   0.2  -0.2   0.1   ← softness
  0.2   0.0   0.3   0.5   0.1   0.0   ← interaction_drive
  0.3   0.2   0.2   0.6   0.1   0.0   ← attention_bias
  0.4  -0.3  -0.2   0.1   1.0   0.1   ← assertiveness
]

---

5. RESULTING BEHAVIOR VECTOR

B ≈

intensity         ≈ 0.78
softness          ≈ 1.21
interaction_drive ≈ 0.87
attention_bias    ≈ 0.91
assertiveness     ≈ 0.62

(clamp jika perlu)

---

6. FINAL ANIMATION WEIGHT

Gunakan kombinasi multiplicative:

final_weight =
  intensity *
  softness *
  assertiveness

≈ 0.78 * 1.21 * 0.62
≈ 0.585

Interpretasi:
- Tidak terlalu agresif
- Lebih ke soft-engaged behavior

---

7. BEHAVIOR OUTPUT (DERIVED DIRECTLY)

Dari vector B:

A. Movement
- intensity 0.78 → aktif moderat
- softness 1.21 → gerakan halus dominan

→ hasil: smooth energetic motion

B. Interaction
- interaction_drive 0.87 → sering initiate
- attention_bias 0.91 → fokus ke user tinggi

→ hasil:
- sering mendekat
- gaze sustain lebih lama

C. Dominance Expression
- assertiveness 0.62

→ hasil:
- playful control (bukan agresif)
- sedikit leaning forward + head tilt

---

8. MICRO-BEHAVIOR (VECTOR-DRIVEN)

Gunakan langsung dari B:

blink_rate =
  0.8 + 1.2 * intensity
≈ 1.736

movement_noise =
  0.02 + 0.03 * intensity
≈ 0.043

attention_lock_time =
  1.5 + 2.5 * attention_bias
≈ 3.78 detik

---

9. ANIMATION SELECTION (VECTORIZED SCORING)

Setiap animasi punya vector target:

A_i = [arousal, warmth, happiness, reassurance, dominance, respect]

Scoring:

score_i =
  1 - ||E_eff - A_i|| (Euclidean distance)

Contoh:

E_eff ≈ [0.47, 0.88, 0.92, 0.89, 0.48, 0.93]

Animasi kandidat:

idle_soft:
[0.3, 0.9, 0.8, 0.7, 0.3, 0.8]

idle_active_soft:
[0.6, 0.85, 0.85, 0.8, 0.5, 0.85]

Hitung jarak:

idle_soft distance ≈ 0.32
idle_active_soft distance ≈ 0.21

→ pilih idle_active_soft

---

10. KEUNGGULAN MODEL

- Semua berbasis vector → clean
- Mudah ditambah dimensi emosi
- Tidak perlu rewrite logic
- Cocok untuk scaling banyak animasi
- Bisa dioptimasi (GPU / SIMD friendly)

---

11. KESIMPULAN

Model ini mengubah sistem dari:

rule-based scattered logic

menjadi:

continuous emotional field → behavior projection

Dengan:
E → M → E_eff → W → B → animation

Ini memungkinkan:
- Behavior lebih natural
- Sistem tetap ringan
- Skalabilitas tinggi tanpa kompleksitas eksponensial

---

## MIA 3D AVATAR PLAN — ADDENDUM v3
(Emotional Data Initialization & Stabilization System — FINAL)

---

TUJUAN

Menjamin bahwa vektor emosi E:

* Stabil (tidak jitter)
* Tidak flip-flop (hysteresis)
* Memiliki decay natural (seperti manusia)
* Tetap ringan (PC low-end friendly)

Pipeline:
Raw → Normalize → Smooth → Hysteresis → Decay → Bias → Context → Clamp → Output

---

## 1. RAW INPUT VECTOR

E_raw ∈ [0–100]

E_raw =
[
arousal,
warmth,
happiness,
reassurance,
dominance,
respect
]

---

## 2. NORMALIZATION

E_norm = E_raw / 100

---

## 3. TEMPORAL SMOOTHING (EMA)

E_smooth(t) =
α * E_norm(t) + (1 - α) * E_prev

Adaptive α:

delta = ||E_norm - E_prev||

α =
lerp(0.08, 0.25, clamp(delta * 3, 0, 1))

---

## 4. HYSTERESIS SYSTEM (ANTI FLIP-FLOP)

Masalah:
Tanpa hysteresis → state bisa bolak-balik cepat

Solusi:
Gunakan threshold naik & turun berbeda

Untuk setiap dimensi i:

if E_smooth[i] > T_high[i]:
state_i = HIGH
else if E_smooth[i] < T_low[i]:
state_i = LOW
else:
state_i = state_prev

Contoh:

T_high_arousal = 0.65
T_low_arousal  = 0.45

Efek:

* Perubahan butuh “momentum”
* Tidak jitter saat di batas

---

## 5. EMOTIONAL DECAY (TEMPORAL BEHAVIOR CURVE)

Emosi tidak langsung hilang → ada decay

Gunakan exponential decay ringan:

E_decay(t) =
E_smooth * exp(-λ * Δt) + E_input_boost

Dimana:

λ (lambda) berbeda per dimensi:

λ =
[
0.9,   // arousal (cepat turun)
0.3,   // warmth (lambat)
0.4,   // happiness
0.6,   // reassurance
0.5,   // dominance
0.2    // respect (sangat stabil)
]

Δt = waktu sejak update terakhir

Implementasi ringan:

approx_exp(x) ≈ 1 / (1 + x)

Jadi:

decay_factor =
1 / (1 + λ * Δt)

E_decay =
E_prev * decay_factor + E_smooth * (1 - decay_factor)

---

## 6. EMOTIONAL INERTIA (MEMORY EFFECT)

Tambahan agar emosi “nempel”:

E_inertia =
β * E_decay + (1 - β) * E_prev

Dengan:

β = 0.2 (default)

Efek:

* Emosi tidak langsung berubah drastis
* Lebih “manusia”

---

## 7. BASELINE PERSONALITY BIAS

P (default Mia):

P =
[0.6, 0.8, 0.7, 0.6, 0.4, 0.8]

E_biased =
0.8 * E_inertia + 0.2 * P

---

## 8. CONTEXT MODULATION (LIGHTWEIGHT)

Scalar context:

C ∈ [-1, 1]

K =
[0.3, 0.1, 0.2, 0.4, 0.2, 0.1]

E_context =
E_biased + C * K

---

## 9. CLAMP & MICRO-STABILITY

E_final =
clamp(E_context, 0, 1)

Micro-freeze:

if |E_final - E_prev| < 0.01:
E_final = E_prev

---

## 10. OUTPUT CONTRACT

E_final → satu-satunya input ke:

* Matrix Emotional System (Addendum v2)
* AnimationController
* Micro-behavior

No bypass.

---

## 11. PERFORMANCE PROFILE

Semua operasi:

* Vector size tetap (6)
* Tanpa loop kompleks
* Tanpa allocation
* Tanpa trig function mahal

Kompleksitas:
O(1)

→ Aman untuk PC kentang

---

## 12. BEHAVIORAL EFFECT (HASIL NYATA)

Dengan sistem ini:

* Arousal spike → cepat naik, pelan turun
* Warmth → stabil, tidak jitter
* Reassurance → linger (tidak cepat hilang)
* Dominance → tidak flip-flop
* Respect → hampir konstan

Hasil:

Karakter terasa:

* Konsisten
* Tidak “robotik”
* Tidak overreact
* Tidak berubah-ubah tanpa alasan

---

## 13. KESIMPULAN

Ini bukan sekadar smoothing.

Ini adalah:

Temporal Emotional System

Yang mencakup:

* Signal filtering
* Memory (inertia)
* Decay biologis
* Hysteresis (stability)

Tanpa sistem ini:
behavior akan noisy & tidak believable

Dengan sistem ini:
avatar memiliki “emotional continuity”
yang mendekati manusia nyata.

---
## MIA 3D AVATAR PLAN — ADDENDUM v4
(Emotional Memory, History, Skill Integration & Soul Synchronization)

---

TUJUAN

Menyatukan sistem backend (Memory, History, Skill) dengan Avatar Engine
melalui satu bahasa universal:

→ Vektor Emosi (E)
→ Vektor Kepribadian (P)
→ Temporal Continuity

Fokus:

* Emosi tidak hanya dihitung → tapi disimpan & dihidupkan kembali
* Avatar bereaksi terhadap masa lalu, bukan hanya input saat ini
* Semua tetap ringan (PC kentang friendly)

---

## 1. EMOTIONAL MEMORY ENCODING (VECTOR-AWARE MEMORY)

---

Masalah:
Memory hanya menyimpan teks → kehilangan konteks emosional

Solusi:
Setiap memori disimpan sebagai tuple:

M_i = {
text: string,
embedding: vector,
E_snapshot: ℝ⁶,
t: timestamp,
valence: scalar,
salience: scalar
}

Dimana:

E_snapshot = E_final saat event terjadi

---

### A. VALENCE CALCULATION (EMOTIONAL POLARITY)

Gunakan weighted projection:

valence =
w_v · E_snapshot

w_v =
[ +0.2, +0.4, +0.5, +0.1, -0.2, +0.3 ]

Interpretasi:

* happiness, warmth → positif
* dominance berlebih → negatif ringan

---

### B. SALIENCE (MEMORY IMPORTANCE)

salience =
||E_snapshot - P||

(P = personality baseline)

Makna:

* Semakin berbeda dari baseline → semakin berkesan

---

## 2. EMOTIONAL RECALL SYSTEM (RAG + FEELING REPLAY)

---

Saat retrieval:

Ambil top-k memori:
M₁, M₂, ..., M_k

Gabungkan:

E_recall =
Σ (w_i * M_i.E_snapshot)

Dengan:

w_i =
softmax(similarity_i * salience_i)

---

### A. EMOTIONAL BLENDING DENGAN CURRENT STATE

E_blended =
(1 - γ) * E_current + γ * E_recall

γ = 0.2 – 0.4 (ringan)

---

### B. BEHAVIOR OUTPUT

Jika:

valence_recall < 0.3
→ trigger subtle sad/thinking animation

valence_recall > 0.7
→ trigger warm / nostalgic expression

---

## 3. HISTORY MANAGER (TEMPORAL EMOTIONAL TRACKING)

---

Tambahkan ke SQLite:

emotion_snapshot: JSON (6 dimensi)

---

### A. TREND VECTOR

Ambil N terakhir:

E_hist = [E₁, E₂, ..., E_N]

Hitung slope sederhana:

trend =
(E_N - E_1) / N

---

### B. MOOD DETECTION

Jika:

trend_happiness < -0.05
→ mood turun

trend_reassurance > +0.05
→ need attention naik

---

### C. PROACTIVE TRIGGER

interaction_trigger =
sigmoid( -trend_happiness + trend_reassurance )

Jika > 0.6 → initiate interaction

---

## 4. SKILL ↔ AVATAR BRIDGE (PHYSICAL INTENT LAYER)

---

Tambahkan kontrak:

Skill Output:

{
action: "...",
visual_intent: V
}

---

### A. VISUAL INTENT VECTOR

V ∈ ℝ⁵:

[
focus_mode,
confusion,
success,
failure,
idle_override
]

---

### B. MAPPING KE EMOTION

Gunakan matrix ringan:

E_skill =
S × V

S =

[ 0.2  0.3  0.4  0.5  0.0
0.1 -0.2  0.3  0.0  0.0
0.2 -0.3  0.5 -0.2  0.0
0.3  0.4  0.2  0.6  0.0
0.1  0.2  0.3  0.1  0.0
0.0  0.1  0.2  0.1  0.2 ]

---

### C. FINAL MERGE

E_final =
clamp(E_base + λ_skill * E_skill, 0, 1)

λ_skill = 0.2 (tidak overpower)

---

## 5. SOUL → PERSONALITY VECTOR (P SYNCHRONIZATION)

---

Masalah:
P hardcoded → tidak adaptif

Solusi:

Backend parsing SOUL.md → vector P

---

### A. FEATURE EXTRACTION

Gunakan keyword scoring ringan:

contoh:

"lembut" → warmth +0.2
"tegas" → dominance +0.3
"ceria" → happiness +0.3

---

### B. NORMALIZATION

P =
normalize(keyword_vector)

---

### C. FRONTEND UPDATE

P dikirim via endpoint:

/api/personality

Digunakan di:

* Bias layer (Addendum v3)
* Salience calculation
* Behavior baseline

---

## 6. REACTIVE SENSES SYSTEM (STT / TTS COUPLING)

---

### A. STT (LISTENING BOOST)

Saat STT aktif:

E_arousal += 0.05
E_reassurance += 0.03

Decay cepat (λ tinggi)

---

### B. TTS (SPEAKING STATE)

Trigger:

state.overlay = "speaking"

Tambahan:

viseme_weight =
audio_amplitude * k

k ≈ 1.2

---

## 7. PROACTIVE MEMORY BEHAVIOR

---

Jika topik muncul kembali:

Similarity tinggi + warmth tinggi di memori lama

Hitung:

affinity_score =
similarity * past_warmth

Jika > 0.7:

Trigger:

* lean_forward
* eye_contact increase
* micro-smile

---

## 8. TEMPORAL EMOTIONAL LOOP (FINAL PIPELINE)

---

1. Backend Input → E_raw
2. Initialization (Addendum v3) → E_final
3. Memory Recall → E_recall
4. Blend → E_blended
5. Skill Injection → E_skill
6. Final Merge → E_out
7. Matrix System (Addendum v2) → Behavior Vector B
8. Animation Output

---

## 9. PERFORMANCE PROFILE

---

Semua operasi:

* Vector dimensi kecil (6, 5)
* Matrix kecil (≤6x6)
* Tanpa deep loop
* Tanpa model AI runtime

Kompleksitas:

O(1)

→ Aman untuk PC kentang

---

## 10. PSYCHOLOGICAL REALISM (YOUNG AFFECTIONATE PROFILE)

---

Dengan sistem ini:

* Memori dengan warmth tinggi → memicu kedekatan ulang
* Reassurance tinggi → meningkatkan cling behavior
* Dominance moderat → muncul playful possessiveness
* Emotional recall → menghasilkan nostalgia / mood shift

Hasil:

Avatar tidak hanya:
“bereaksi”

Tapi:
“mengingat + merasakan ulang + mengekspresikan”

---

## 11. KESIMPULAN

---

Ini adalah layer yang menghilangkan “dinding” antara:

Backend Intelligence ↔ Frontend Body

Dengan:

Memory + Emotion + Behavior = Unified System

MIA sekarang memiliki:

* Emotional Memory
* Temporal Continuity
* Behavioral Consistency
* Physical Expression of Cognition

Bukan hanya AI yang berpikir,
tapi AI yang “merasakan melalui tubuhnya”.

---

# MIA 3D AVATAR PLAN — IMPLEMENTATION CHECKLIST (EXECUTION CONTRACT v2 — FINAL)

---

## 0. GLOBAL RULES (WAJIB — NON-NEGOTIABLE)

[x] Tidak ada business logic di AvatarRenderer
[x] Tidak ada direct animation trigger dari InteractionController
[x] Tidak ada bypass ke AnimationController (harus lewat StateMachine)
[x] Tidak ada override ke E_final (hanya dari pipeline Addendum v3)
[x] useFrame hanya untuk transform & interpolation
[x] Semua update emosi terjadi event-driven (bukan per frame)

Jika salah satu dilanggar → sistem dianggap invalid

---

## 1. EMOTIONAL PIPELINE (ADDENDUM v3)

### Input & Normalization

[x] E_raw hanya dari EmotionProvider
[x] Range divalidasi (0–100)
[x] Normalisasi ke [0–1] hanya sekali

### Temporal Processing

[x] EMA smoothing adaptive α
[x] Delta pakai vector distance
[x] Tidak ada smoothing ulang di layer lain

### Hysteresis

[x] Dual threshold (T_high & T_low) per dimensi
[x] state_prev disimpan
[x] Tidak ada single threshold

### Decay

[x] λ per dimensi
[x] Δt berbasis waktu (bukan frame)
[x] exp di-approx (bukan Math.exp)

### Inertia

[x] β diterapkan setelah decay
[x] E_prev konsisten

### Bias & Context

[x] P tidak hardcoded di frontend (lihat Section 16)
[x] Context tidak override langsung
[x] K vector fixed

### Output

[x] E_final di-clamp
[x] Micro-freeze aktif
[x] Tidak ada bypass

---

## 2. VECTOR & MATRIX SYSTEM (ADDENDUM v2)

[x] E = vector 6 dimensi fixed
[x] M = constant matrix (immutable runtime)
[x] E_eff = clamp(M × E_final)
[x] Tidak dihitung per frame

---

## 3. BEHAVIOR PROJECTION

[x] W matrix terpisah dari M
[x] B = W × E_eff
[x] Semua behavior berasal dari B (tidak ada hardcode tersembunyi)

---

## 4. ANIMATION CONTROLLER

### Input

[x] resolved state
[x] behavior vector B

### Blending

[x] Crossfade time-based
[x] Tidak ada instant switch (kecuali priority)
[x] Weight berasal dari B

### Layering

[x] Base tidak di-override overlay
[x] Facial & body dipisah
[x] Overlay additive

---

## 5. STATE MACHINE

[x] Struktur: base + emotionVector + overlay
[x] Tidak ada flat state
[x] Deterministic resolution
[x] Output stabil

---

## 6. EVENT PROCESSOR

[x] Queue + priority
[x] Timestamp + duration
[x] Interrupt valid
[x] Cooldown enforced
[x] Rate limit backend aktif

---

## 7. INTERACTION CONTROLLER

[x] Input → intent
[x] Tidak ada animasi langsung
[x] Tidak ada logic emosi

---

## 8. MICRO-BEHAVIOR SYSTEM

[x] Semua parameter dari B
[x] Random controlled (seeded)
[x] Eye tracking lerp
[x] Reaction delay ada

---

## 9. MODEL & ASSET PIPELINE

[x] Rig konsisten
[x] Animasi sudah retarget
[x] Naming konsisten

### Metadata

[x] Setiap animasi punya:

* emotional range
* style
* intensity

[x] Tidak ada animasi tanpa metadata

---

## 10. ANIMATION SELECTION (DIPERJELAS)

[x] E_eff digunakan **EKSKLUSIF** untuk memilih base animation (Euclidean distance)
[x] Behavior vector B digunakan **EKSKLUSIF** untuk:

* layer weight
* micro behavior
* animation modulation

[x] Tidak ada pencampuran peran antara E_eff dan B

---

## 11. WARDROBE SYSTEM

[x] Load on demand
[x] Shared skeleton
[x] Mesh hidden (bukan delete)
[x] Tidak preload semua

---

## 12. PERFORMANCE GUARDRAIL

[x] Tidak ada heavy compute di useFrame
[x] Semua dihitung saat event

### Adaptive

[x] FPS monitor aktif
[x] <40 disable eye tracking
[x] <30 reduce update
[x] <25 simplify blending

---

## 13. MEMORY MANAGEMENT

[x] Dispose geometry
[x] Dispose texture
[x] Mixer cleanup
[x] Asset tracking aktif

---

## 14. INTEGRATION RULE

[x] Backend hanya kirim intent
[x] Frontend tidak expose animation control
[x] Tidak ada direct coupling backend → renderer

---

## 15. FINAL VALIDATION

[x] Tidak ada jitter
[x] Tidak ada flicker
[x] Tidak ada flip-flop
[x] Stabil saat FPS drop
[x] Memory tidak leak

---

# === TAMBAHAN DARI ADDENDUM v4 (CRITICAL INTEGRATION) ===

---

## 16. MEMORY & EMOTIONAL RECALL

[x] SQLite memiliki kolom `emotion_snapshot`
[x] Vector DB menyimpan:

* E_snapshot
* valence
* salience

[x] Retrieval menghasilkan E_recall
[x] E_recall di-blend ke E_current (γ valid)
[x] Tidak ada recall tanpa weighting

---

## 17. HISTORY & MOOD TRACKING

[x] History menyimpan vector emosi per message
[x] Trend dihitung dari window N terakhir
[x] Mood drop terdeteksi via slope
[x] Interaction initiation trigger berjalan

---

## 18. SOUL SYNCHRONIZATION (P VECTOR)

[x] Backend parser SOUL.md → vector P
[x] Keyword mapping jelas & deterministic
[x] Endpoint `/api/personality` tersedia
[x] Frontend update P tanpa hardcode

---

## 19. SKILL ↔ AVATAR CONTRACT

[x] Skill wajib return `visual_intent`
[x] V = vector 5 dimensi
[x] Matrix S diimplementasikan
[x] E_skill dihitung benar
[x] Merge ke E_final dengan λ kecil (tidak overpower)

---

## 20. PROACTIVE MEMORY BEHAVIOR

[x] Similarity + warmth menghasilkan affinity_score
[x] Jika threshold tercapai → trigger behavior
[x] Lean / gaze / engagement otomatis

---

## 21. REACTIVE SENSES

### STT

[x] Arousal naik saat listening
[x] Ada decay cepat

### TTS

[x] Viseme sinkron audio
[x] Overlay speaking aktif

---

## FINAL NOTE (UPDATED)

Checklist ini sekarang mencakup:

* Rendering Layer
* Emotional Math Layer
* Temporal Stability
* Memory & History
* Skill Integration
* Backend ↔ Frontend Bridge

Ini bukan lagi sekadar checklist teknis.

Ini adalah:

**EXECUTION CONTRACT END-TO-END (SOUL → MEMORY → EMOTION → BODY)**

Jika ini diikuti:
→ MIA akan terasa hidup, konsisten, dan punya “ingatan emosional”

Jika dilanggar:
→ sistem akan tetap jalan… tapi kehilangan “jiwa”


---

# FINAL VISUAL ARCHITECTURE: 2D STYLIZED ANIME + MOTION SYNTHESIS
### Visi Final MIA: "The Hyper-Responsive 2D Deity" Dengan tinggi 198cm dan proporsi Figure, MIA akan terlihat megah di layar user. Karena beban GPU sangat rendah, kita bisa menggunakan sisa resource untuk Atmospheric Effects (rim light, particles, glass blur) yang akan membuat MIA terlihat sangat premium dan "bernyawa".
### Emotion-First 2D Character Engine with Vector-Based Motion Synthesis

---

## Figure: MIA (ANIME FIGURE PROPORTION CHARACTER SPECIFICATION)
### ukuran figure di buat dinamis guna mempertahankan proporsi rasio tubuh vs tinggi screen user.

* Ini ukurannya di dunia nyata, agar proporsi nya pas.
Tinggi total dari ujung rambut sampai ujung kaki: 198 cm
Berat badan: 85 kg
Postur: ramping pinggang, torso jenjang, busty atas-bawah, paha ramping, kaki jenjang panjang

UKURAN DETAIL:
- Tinggi badan: 198 cm
- Bust (dada): 42DDD (lingkar dada 107-110 cm)
- Underbust: 78 cm
- Pinggang (waist): 68 cm (sangat ramping)
- Pinggul (hips): 98 cm
- Panjang torso (dari bahu ke pinggang): 50 cm (jenjang)
- Panjang inseam (dalam kaki): 94 cm
- Panjang kaki luar: 110 cm
- Lebar bahu: 42 cm
- Lingkar lengan atas: 28 cm
- Lingkar paha atas: 52 cm (ramping)
- Lingkar betis: 32 cm
- Lingkar pergelangan kaki: 20 cm
- Panjang lengan: 68 cm
- Panjang leher: 15 cm

WARNA & TEKSTUR:
- Kulit: putih cerah mulus ala Douyin, glassy skin, pori-pori halus, sedikit glossy natural, tanpa cacat
- Rambut: ginger sehat mengkilap, lurus panjang sampai pinggang dengan big curl di bagian 1/3 ujungnya, tekstur halus lembut, ujung sedikit layered
- Mata: hazel gelap besar, pupil tajam, bulu mata panjang lentik
- Bibir: merah muda alami, glossy tipis
- Kuku: panjang sedang, warna natural pinkish
- Puting & areola: kecil, pink muda

DETAIL TAMBAHAN:
- Tubuh: proporsi sempurna Douyin, pinggang kecil kontras dengan dada besar dan pinggul montok, kaki sangat jenjang ramping, paha dalam ramping tanpa selulit, betis ramping, perut rata dengan sedikit definisi


## Identitas
- Nama: MIA, 18th, perempuan

Kita akan mengadopsi pendekatan:

> **Emotion-Driven 2D Digital Presence System**

Bukan sekadar 2D avatar, tetapi sistem karakter berbasis emosi yang terhubung langsung ke behavior vector.

---

## 🔁 ARSITEKTUR BARU (REPLACEMENT SYSTEM)

### ❌ DIHAPUS / DITINGGALKAN

* B → 3D AnimationController → VRM / Three.js
* WebGL-heavy rendering pipeline
* Spring bone 3D physics system
* Shader-based SSS & rim lighting complex stack

---

### ✅ DIGANTI MENJADI

```
B (Behavior Vector)
   ↓
2D Motion System Compiler
   ↓
Motion Graph Resolver (Emotion-Aware)
   ↓
Live2D-like Layered Sprite System
   ↓
Final Render Output (Canvas/WebGL 2D optimized)
```

---

# 2. B VECTOR → 2D MOTION SYSTEM MAPPING

Vector B tetap menjadi inti sistem:

```
B = [
  intensity,
  softness,
  interaction_drive,
  attention_bias,
  assertiveness
]
```

---

## 🔧 MAPPING LOGIC

### A. INTENSITY → Motion Energy

```
motion_amplitude = B.intensity * base_sway
frame_speed_multiplier = lerp(0.8, 1.3, B.intensity)
```

Output:

* gerakan tubuh lebih aktif
* breathing lebih terasa
* idle motion lebih hidup

---

### B. SOFTNESS → Easing Function

```
easing = lerp(linear, cubicBezierSoft, B.softness)
```

Output:

* semua animasi menjadi lebih “smooth” atau “snappy”
* kontrol feel emotional softness

---

### C. INTERACTION DRIVE → Behavior Trigger Rate

```
interaction_interval = lerp(6s, 1.5s, B.interaction_drive)
```

Output:

* frekuensi glance ke user
* lean-forward probability
* micro reaction trigger

---

### D. ATTENTION BIAS → Gaze System

```
gaze_lock_time = lerp(1.5s, 4.0s, B.attention_bias)
eye_tracking_strength = B.attention_bias
```

Output:

* eye contact persistence
* head follow smoothing
* emotional “presence feeling”

---

### E. ASSERTIVENESS → Pose Deformation Layer

```
pose_offset = B.assertiveness * posture_curve_map
```

Output:

* slight forward lean
* chin angle shift
* shoulder openness

---

# 3. MOTION GRAPH SYSTEM (CORE ENGINE)

Kita akan menggunakan:

> **Emotion-Weighted Motion Graph (EW-MG)**

---

## STRUCTURE:

Each animation clip memiliki metadata:

```
Idle_Soft:
  arousal: 0.2–0.5
  softness: 0.7–1.0
  assertiveness: 0.1–0.3

Idle_Active:
  arousal: 0.5–0.8
  interaction_drive: 0.6–1.0
```

---

## SELECTION ALGORITHM:

```
score_i =
  1 - distance(B, clip_vector_i)
  + emotional_weight_bias
```

Output:

* no hardcoded animation switching
* fully vector-driven selection

---

# 4. LIVE2D-STYLE LAYER SYSTEM

## Layer breakdown:

### LAYER 1 — BASE BODY

* idle pose
* breathing animation
* posture deformation

### LAYER 2 — FACE SYSTEM

* eye movement
* blink asymmetry
* mouth viseme sync

### LAYER 3 — EMOTION OVERLAY

* blush shader (procedural)
* mood tint overlay
* highlight intensity shift

### LAYER 4 — MICRO BEHAVIOR

* gaze drift
* hair sway 2D physics (spring curve)
* micro jitter noise

---

# 5. VISUAL IDENTITY SPECIFICATION (FINALIZED)

Untuk menjaga konsistensi asset pipeline:

## MIA CHARACTER DESIGN

* Nama: MIA
* Umur: 18
* Gender: Female
* Style: Stylized Semi-Realistic Anime (High-End 2D)

---

### BODY PROFILE (2D RIG OPTIMIZED)

* Tinggi visual: 198 cm (proporsi stylized)
* Silhouette: slim waist + long torso + elongated legs
* Design focus: vertical elegance + soft femininity

---

### TEXTURE STYLE

* Skin: smooth stylized skin (subtle gradient shading, no realism SSS)
* Hair: ginger long layered hair + controlled physics strands
* Eyes: hazel deep layered iris (parallax fake depth)
* Lips: soft gloss gradient

---

### DESIGN PRINCIPLE

> “Stylized believability over anatomical realism”

---

# 6. PERFORMANCE STRATEGY

* No WebGL heavy rendering
* No physics engine dependency
* Pure 2D interpolation + sprite deformation
* All motion computed from vector B (O(1) lightweight)

---

# 7. SUMMARY

Dengan pendekatan ini:

✔ Emotional system tetap utuh
✔ Behavior matrix tetap digunakan tanpa perubahan
✔ Performance jauh lebih ringan untuk low-end
✔ Visual tetap expressive melalui motion synthesis
✔ Sistem lebih scalable untuk future expansion

---

## FINAL STATEMENT

Ini bukan downgrade dari 3D ke 2D, tetapi:

> **re-architecture dari “visual-heavy system” menjadi “emotion-first character engine”**

yang justru membuat MIA lebih hidup, lebih responsif, dan lebih stabil secara teknis.

---

Saya sudah menganalisis requirement “Hyper-Expressive Semi-Realism + Atmospheric Integration” secara menyeluruh terhadap constraint performa (PC kentang / low-end stability), dan saya menemukan bahwa seluruh visi tersebut **masih bisa dicapai secara penuh**, namun dengan pendekatan yang lebih scalable dan ringan:

> **Keputusan arsitektur visual: 2D Stylized Anime + Motion Synthesis System (Live2D-class architecture)**

Ini bukan downgrade dari visi, tetapi **re-mapping dari 3D rendering cost ke 2D procedural animation system + shader-like layering logic**.

---

# 1. VISUAL PARADIGM SHIFT (3D → 2D HYBRID SYSTEM)

## OLD (DEPRECATED for Phase 1)

* ❌ Three.js VRM Character System
* ❌ AnimationController berbasis bone 3D
* ❌ Spring Bone / physics 3D mesh simulation

## NEW (PROPOSED)

✔ 2D Layered Character System (Live2D-style architecture)
✔ Sprite / mesh-separated rig system
✔ Motion synthesis engine berbasis vector B (existing emotional model)
✔ Procedural animation graph (no keyframe dependency heavy system)

---

# 2. HOW WE STILL ACHIEVE “HYPER-EXPRESSIVE SEMI-REALISM” IN 2D

## 2.1 EYES — “WINDOW TO SOUL” (2D PARALLAX EMULATION)

Instead of 3D eye shader:
✔ Multi-layer eye rig:

* sclera layer
* iris layer (parallax shift)
* pupil layer (arousal-driven scale)
* highlight layer (micro-reflection animated)

Mapping:

arousal → pupil_scale
attention_bias (from B vector) → gaze_lock_strength
warmth → softness blur + highlight intensity

Result:
→ “depth illusion” identical to 3D moist eye effect

---

## 2.2 SKIN — “SOFTNESS SIMULATION (FAKE SSS)”

Replace shader SSS with:
✔ dual texture blend system:

* base skin
* warmth overlay (blush / heat map)

Mapping from emotional vector B:

* warmth ↑ → blush intensity (pipi + shoulder mask)
* arousal ↑ → slight saturation + brightness shift
* reassurance ↑ → softness diffusion mask

Result:
→ visual “warm skin response” tanpa GPU heavy shader

---

## 2.3 DYNAMIC FABRIC — “LIVING 2D FABRIC SYSTEM”

Instead of Spring Bone:
✔ procedural mesh deformation (2D rig bones / Live2D-style cubism)

Inputs from B vector:

* intensity → cloth sway amplitude
* arousal → motion frequency
* dominance → posture stiffness
* warmth → motion smoothing factor

Result:
→ rambut & pakaian tetap “hidup” tanpa physics engine berat

---

## 2.4 ATMOSPHERIC INTEGRATION — LIGHTING EMULATION

Replace 3D lighting:

✔ screen-space lighting simulation:

* rim light overlay layer (UI-synced color)
* gradient ambient mask
* contact shadow texture layer

Mapping:

* dominance → rim light sharpness
* warmth → glow softness
* attention_bias → highlight direction stability

Result:
→ tetap “terasa berada di dalam UI glass environment”

---

## 2.5 HUMANITY LAYER — MICRO IMPERFECTION ENGINE

✔ asymmetrical animation driver:

* blink_left ≠ blink_right delay
* random micro offset generator (seeded, deterministic)
* sway noise from low-frequency Perlin 1D

Driven by:

* arousal → jitter frequency
* warmth → smoothness damping
* reassurance → movement hesitation

Result:
→ tetap “alive”, bukan robotik, tanpa physics engine

---

## 2.6 MODULAR WARDROBE — 2D CONTEXTUAL LAYER SYSTEM

Instead of mesh swapping:

✔ layered sprite wardrobe system:

* base body
* outfit overlay layer
* cloth physics simulation (2D bone warp)

Trigger system:

* time-of-day → outfit state
* intimacy score (from memory system) → outfit progression
* emotional state → outfit bias weighting

Result:
→ wardrobe tetap dynamic tanpa asset heavy loading

---

# 3. MOTION SYNTHESIS SYSTEM (CRITICAL CORE)

Ini yang menggantikan AnimationController 3D.

We introduce:

## Motion Graph Engine (B → Motion Mapping)

Input:
B = [
intensity,
softness,
interaction_drive,
attention_bias,
assertiveness
]

Output:

Motion Parameters:

* head_sway
* eye_tracking_speed
* blink_rate
* torso_angle
* idle_variation_strength

Mapping example:

interaction_drive → motion frequency
softness → easing curve strength
attention_bias → gaze lock duration
assertiveness → posture angle bias
intensity → global animation amplitude

---

# 4. WHAT IS REMOVED (IMPORTANT)

Untuk menjaga clarity & performance:

❌ VRM pipeline (Phase 1 removed)
❌ Three.js skeletal animation system
❌ Spring Bone physics dependency
❌ Real-time shader SSS / ray lighting
❌ AnimationController 3D layering system

---

# 5. WHAT IS RETAINED (CORE INTELLIGENCE STACK)

✔ Emotional Vector System (E, M, B matrix unchanged)
✔ StateMachine architecture
✔ EventProcessor + priority queue
✔ Memory-Orchestrator integration
✔ Skill system (visual_intent tetap dipakai)
✔ Backend → intent-based architecture

---

# 6. WHY THIS STILL MEETS YOUR VISUAL VISION

Walaupun berubah dari 3D ke 2D:

✔ Mata tetap punya depth & emotion fidelity
✔ Skin tetap responsive terhadap warmth/arousal
✔ Hair & cloth tetap “hidup”
✔ Lighting tetap atmospheric & immersive
✔ Micro-expression tetap human-like
✔ Emotional continuity tetap preserved dari Matrix system

---

# 7. FINAL POSITIONING

Ini bukan downgrade.

Ini adalah:

> “Emotionally-driven 2D Living Avatar System powered by Vector-Based Behavioral Engine”

Dengan kata lain:

* Visual complexity diturunkan
* Emotional complexity tetap FULL (tidak dikurangi sama sekali)

---

# 8. CONCLUSION

Dengan approach ini:
✔ semua constraint hardware terpenuhi
✔ semua visi emotional realism tetap tercapai
✔ system jauh lebih scalable untuk fase AI Character Engine berikutnya

Jika disetujui, kita bisa langsung refactor:

Phase 1 → 2D Motion System Implementation
Phase 2 → Vector B → Motion Graph Compiler
Phase 3 → Memory-linked Emotional Recall Animation

---

PS. Tools

* implementasi Motion Graph Engine
* definisi clip metadata schema
* setup base 2D rig system
* desain Motion Graph JSON schema + engine structure 

---

IMPLEMENTATION CHECKLIST (EXECUTION CONTRACT vFINAL)
0. GLOBAL ARCHITECTURE LOCK
❌ FORBIDDEN (MUST NOT EXIST IN CODEBASE)

[x] Three.js VRM system dihapus total
[x] AnimationController 3D tidak digunakan
[x] Spring bone physics engine tidak digunakan
[x] WebGL heavy shader pipeline (SSS / ray tracing) tidak digunakan
[x] Per-frame emotional logic di useFrame tidak digunakan
[x] Backend tidak boleh mengirim animation command langsung

✅ CORE SYSTEMS ONLY

[x] Emotion Vector System (E) aktif
[x] Emotion Matrix System (M) aktif
[x] Behavior Vector (B) aktif
[x] Motion Graph Engine aktif
[x] 2D Layered Rendering System aktif
[x] StateMachine aktif
[x] EventProcessor aktif

1. EMOTION PIPELINE (E → M → B)
INPUT LAYER

[x] E_raw diterima dari EmotionProvider
[x] Range divalidasi [0–100]
[x] Normalisasi ke [0–1] hanya dilakukan 1x

MATRIX PROCESSING

[x] M matrix (6x6) statis & immutable
[x] E_eff = clamp(M × E)
[x] Tidak ada mutation runtime pada M

BEHAVIOR VECTOR OUTPUT

[x] B dihitung dari E_eff
[x] B memiliki 5 dimensi fixed:

intensity
softness
interaction_drive
attention_bias
assertiveness

[x] B tidak boleh diubah manual di layer lain

2. MOTION GRAPH ENGINE
CLIP SYSTEM

[x] Semua animation clip memiliki metadata vector
[x] Setiap clip memiliki range:

arousal
warmth
softness
interaction_drive
SELECTION ENGINE

[x] Menggunakan distance-based scoring
[x] Tidak ada if-else animation logic
[x] Tidak ada hardcoded animation trigger

score = 1 - distance(B, clip_vector)
OUTPUT

[x] Selected animation = highest score
[x] Fallback hanya jika tidak ada match

3. 2D LAYER SYSTEM (LIVE2D-STYLE)
BASE LAYER

[x] Body idle animation
[x] Breathing motion
[x] Posture baseline

FACE LAYER

[x] Eye system multi-layer:

sclera
iris parallax
pupil scale (arousal-driven)
highlight layer

[x] Blink system:

asymmetrical blink allowed
timed blink curve
EMOTION OVERLAY

[x] Blush layer (procedural from warmth)
[x] Glow overlay (emotion-driven)
[x] Mood tint layer

MICRO LAYER

[x] Gaze drift system
[x] Hair sway (2D spring simulation)
[x] Noise jitter (deterministic seeded)

4. MOTION SYNTHESIS (B → BEHAVIOR OUTPUT)
INTENSITY

[x] Mengontrol amplitude motion
[x] Mengontrol speed multiplier

SOFTNESS

[x] Mengontrol easing curve
[x] Mengontrol motion smoothing

INTERACTION DRIVE

[x] Mengontrol:

reaction frequency
lean forward probability
micro gesture triggers
ATTENTION BIAS

[x] Mengontrol:

gaze lock duration
eye tracking strength
head follow smoothing
ASSERTIVENESS

[x] Mengontrol:

posture angle offset
chin direction
shoulder openness
5. STATE MACHINE

[x] State terdiri dari:

base state
emotion vector state
overlay state

[x] Tidak ada string-state kombinasi kompleks

[x] Resolusi state deterministik
[x] Tidak ada random state switching

6. EVENT PROCESSOR

[x] Event queue FIFO aktif
[x] Priority system (0–5) aktif
[x] Cooldown system aktif
[x] Debounce system aktif

RULES

[x] Event priority tinggi bisa interrupt state
[x] Event low priority bisa di-drop
[x] Tidak ada double trigger

7. MICRO BEHAVIOR SYSTEM

[x] Semua micro behavior berasal dari B vector

termasuk:

[x] blink rate
[x] breathing amplitude
[x] gaze drift
[x] idle sway
[x] reaction delay

[x] Semua randomness harus seeded (deterministic)

8. RENDER SYSTEM (2D ONLY)

[x] Canvas/WebGL2 2D renderer
[x] Tidak ada 3D context
[x] Tidak ada bone-based rendering

9. ANIMATION SYSTEM

[x] Crossfade berbasis time interpolation
[x] Tidak ada instant switch kecuali interrupt priority tinggi
[x] Layer blending additive

10. ASSET PIPELINE

[x] Semua asset berbasis sprite / layered image
[x] Tidak ada VRM / GLTF skeletal dependency
[x] Semua outfit modular overlay system

11. WARDROBE SYSTEM

[x] Outfit berbasis layered sprite system
[x] Outfit switch tanpa reload full scene
[x] Context-aware outfit trigger aktif

12. PERFORMANCE GUARANTEE
HARD RULES

[x] Tidak ada computation di per-frame loop berat
[x] Semua update berbasis event
[x] O(1) vector operations only
[x] No dynamic allocation in animation loop

ADAPTIVE BEHAVIOR

[x] FPS monitor aktif
[x] Jika FPS < threshold:

reduce micro-behavior
reduce gaze update frequency
simplify interpolation
13. MEMORY & INTEGRATION

[x] Emotion data bisa disimpan ke memory system
[x] History bisa mempengaruhi B vector
[x] Skill system hanya mengirim visual_intent (no direct animation)

14. FINAL VALIDATION CHECK
SISTEM HARUS LULUS:

[x] Tidak ada animation jitter
[x] Tidak ada state flip-flop
[x] Tidak ada memory leak
[x] Tidak ada frame spike dari logic
[x] Behavior tetap stabil saat input noise tinggi
[x] Emotional continuity tetap konsisten

FINAL STATEMENT

Checklist ini mengunci sistem menjadi:

Emotion-driven deterministic 2D character engine dengan motion synthesis berbasis vector

Jika semua checklist ini terpenuhi:

✔ sistem stabil
✔ scalable
✔ low-end friendly
✔ emotionally consistent
✔ production ready