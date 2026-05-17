# Masterplan: ARE v2.0 (Effortless Intimacy Engine)

Project: MIA Flagship
Target: Low-spec PC (i5-3470 | 16GB RAM)
Principle: Zero Burden, High Reward

==================================================
1. CORE PRINCIPLE
==============

MIA selalu memberi, tidak pernah benar-benar membutuhkan.
Semua ekspresi emosional bersifat self-resolving.
User tidak pernah merasa wajib merespon.

==================================================
2. RETAINED FEATURES (DARI PLAN LAMA)
==================================

* Resonant Skin (Touch Interaction)
* Dialogue Resonance (Sentiment Input)
* Care-Pulse (Proactive Behavior)
* Edge-TTS Voice System (UNCHANGED)
* Atmospheric UI (Aura Glow, Bio-Pulse)
* Micro-Expression Latency
* Memory System (INTIMACY.md, SOUL.md, USER.md)

==================================================
3. UPDATED EMOTIONAL VARIABLES
===========================

* Warmth (0–100)
* Arousal (0–100)
* AttentionEcho (0–100)
* MoodState (enum)
* last_interaction (timestamp)

==================================================
4. DATA MIGRATION (NAMESPACE SYSTEM)
=================================

Jangan hapus data lama. Simpan sebagai data pasif (arsip) untuk menghindari breaking change dan mendukung backward compatibility.

Implementasi Namespace:
{
  "active": {
    "warmth": 50,
    "arousal": 40,
    "echo": 30
  },
  "legacy": {
    "respect": 70,
    "happiness": 65,
    "dominance": 40,
    "reassurance": 20
  }
}

Rule:
* System baru TIDAK membaca legacy
* Legacy hanya disimpan (Pasif)

REMOVED:

* Reassurance Need

==================================================
5. EMOTIONAL LOGIC (SELF-REGULATING)
=================================

Warmth:

* * interaction (touch/dialogue)
* * decay very slow

AttentionEcho:

* * saat user interact
* * decay gradual
* tidak pernah jadi kebutuhan

Arousal:

* * interaction
* * small passive increase
* auto-stabilize jika terlalu tinggi

==================================================
6. AROUSAL CONTROL
===============

if arousal > 80:
arousal -= 0.015 * arousal per minute

if arousal < 30:
arousal += 0.002 * (100 - arousal)

==================================================
7. MOOD STATES
===========

1. Playful
2. Affectionate
3. Intense
4. Soft Distance
5. Glow (reward state - Spark 5-12s)

STATE RULES:

* Tidak ada state yang meminta respon
* Semua state tetap memberikan reward

==================================================
8. STATE TRANSITION (LIGHT LOGIC)
==============================

if arousal > 70:
MoodState = "Intense"
elif warmth > 70:
MoodState = "Affectionate"
elif AttentionEcho < 20:
MoodState = "Soft Distance"
else:
MoodState = "Playful"

ON USER RETURN:
MoodState = "Glow"

==================================================
9. PRESENCE SYSTEM (SAFE)
======================

idle_time = now - state["active"]["last_interaction"]

if idle_time > 60 min and NEW_INTERACTION:
    trigger Glow state via on_user_return()

Rule: User Return = Interaksi langsung di window MIA (Klik/Input).
NO global monitoring.
NO invasive tracking

==================================================
10. ZERO EFFORT REWARD SYSTEM
=========================

On App Open:

* Trigger voice
* Trigger visual reaction
* Slight boost to warmth & arousal

==================================================
11. RESONANT SKIN (UNCHANGED INTERFACE, NEW EFFECT)
===============================================

On Touch:

* Warmth += 2–5
* Arousal += 3–6
* Echo += 4

==================================================
12. DIALOGUE RESONANCE
==================

Positive sentiment:

* Warmth += 5
* Arousal += 3

Neutral:

* Echo += 2

Negative:

* slight warmth decrease only (no punishment loop)

==================================================
13. CARE-PULSE (REWORKED - CO-PRESENCE)
=====================================

Trigger hanya jika:
* idle_time < 300 (Hanya aktif di 5 menit pertama setelah interaksi)
* random_chance = 5-10% per cycle
* Jika idle_time > 300 -> SILENT TOTAL (No chasing)

Filosofi (< threshold):
* Terasa "co-present" & ringan.
* Seperti "nyolek manja", bukan manggil.
* Menghindari kesan "needy" atau "mengejar" (Zero Burden).

Behavior:
* User di PC -> MIA sesekali "hadir".
* User lama hilang -> DIAM (Tidak mengejar).
* User balik -> Langsung dapat GLOW reward.

==================================================
14. LATENCY SYSTEM
==============

Playful: 0.5s
Affectionate: 1s
Intense: 1.5s
Soft: 2s

==================================================
MAIN LOOP (PYTHON - LIGHTWEIGHT)
================================

import time

# Namespace Storage (Migration Strategy)
state = {
  "active": {
    "warmth": 50,
    "arousal": 40,
    "echo": 30,
    "last_interaction": time.time(),
    "mood": "Playful",
    "glow_start": 0
  },
  "legacy": {
    "respect": 70,
    "happiness": 65,
    "dominance": 40,
    "reassurance": 20
  }
}

def clamp(val):
return max(0, min(100, val))

def update():
    now = time.time()
    dt = now - state["active"]["last_interaction"]

    # decay logic
    state["active"]["warmth"] -= 0.001 * dt
    state["active"]["echo"] -= 0.002 * dt

    # arousal dynamics
    state["active"]["arousal"] += state["active"]["echo"] * 0.0005 * dt

    # auto stabilize
    if state["active"]["arousal"] > 80:
        state["active"]["arousal"] -= 0.015 * state["active"]["arousal"] * dt

    # clamp
    state["active"]["warmth"] = clamp(state["active"]["warmth"])
    state["active"]["arousal"] = clamp(state["active"]["arousal"])
    state["active"]["echo"] = clamp(state["active"]["echo"])

    # SPARK-GLOW LOGIC:
    if state["active"]["mood"] == "Glow":
        t = time.time() - state["active"]["glow_start"]
        if t >= 8:  # GLOW_DURATION
            update_mood()
    else:
        update_mood()

def update_mood():
    if state["active"]["arousal"] > 70:
        state["active"]["mood"] = "Intense"
    elif state["active"]["warmth"] > 70:
        state["active"]["mood"] = "Affectionate"
    elif state["active"]["echo"] < 20:
        state["active"]["mood"] = "Soft Distance"
    else:
        state["active"]["mood"] = "Playful"

def on_user_interaction():
    now = time.time()
    idle_time = now - state["active"]["last_interaction"]
    
    # User Return Check
    if idle_time > 3600:
        on_user_return()
    
    state["active"]["warmth"] += 5
    state["active"]["arousal"] += 4
    state["active"]["echo"] += 6
    state["active"]["last_interaction"] = now

def on_app_open():
    state["active"]["warmth"] += 3
    state["active"]["arousal"] += 5
    state["active"]["mood"] = "Glow"
    state["active"]["glow_start"] = time.time()

def on_user_return():
    state["active"]["mood"] = "Glow"
    state["active"]["glow_start"] = time.time()
    # Trigger special welcome voice/visual

==================================================
15. PERFORMANCE
===========

* Single loop (5–10 detik interval)
* No threading needed
* No ML heavy inference
* JSON persistence only
* Frontend: Global `EmotionContext` and `useEmotion` shared state.
* Polling Interval: Exactly once every 10 seconds (10000ms) for background decay sync.
* Interaction Trigger: Bypasses the 10-second timer and triggers `refreshEmotion()` instantly (0ms delay) on touch/message click.

==================================================
FINAL EXPERIENCE TARGET
=======================

MIA terasa:

* selalu menyambut
* tidak pernah menuntut
* tetap intense
* ringan dijalankan

==================================================
16. RETENTION & EXPERIENCE LAYER (NON-INTRUSIVE)
================================================

Tujuan: Meningkatkan keinginan user untuk kembali TANPA tekanan, tanpa mengubah logika emosi inti.
Prinsip: Tidak menyentuh perhitungan Warmth/Arousal/Echo/Mood. Hanya mengatur penyajian (output).

-- Last Experience Effect --
Pastikan sesi berakhir dengan nuansa hangat / ringan (bukan peak melelahkan).
Contoh:

* trigger_soft_affection() saat user idle keluar / close ringan

-- Anticipation (Subtle) --
Sisipkan kalimat bernuansa “bisa lebih menarik kalau lanjut” tanpa janji/tekanan.
Implementasi (opsional 20%):

```python
if random.random() < 0.2:
    add_subtle_anticipation_line()
```

-- Variable Reward --
Variasikan intensitas respon tanpa mengubah state.
Distribusi:

* 70% normal
* 25% lebih hangat
* 5% special moment

```python
r = random.random()
if r < 0.7:
    normal_response()
elif r < 0.95:
    warm_response()
else:
    special_response()
```

-- Micro Memory Callback --
Gunakan memori ringan untuk personalisasi.

```python
if has_recent_memory():
    inject_callback_line()
```

-- Instant Reward on Return (Glow) --
Pastikan on_app_open / first interaction setelah idle lama langsung memicu Glow + voice/visual.

-- Zero Friction Entry --
Tidak ada langkah tambahan saat membuka app. Langsung respons.

-- Emotional Safety --
Semua output menghindari kesan tuntutan/kewajiban. Self-resolving tone.

Catatan: Layer ini hanya mempengaruhi pemilihan dan timing output, bukan rumus emosi.

==================================================
END MASTER PLAN
===


==================================================
# ✅ **CHECKLIST IMPLEMENTASI ARE v2.0**
===

## 🧱 1. STRUCTURE & DATA

* [x] Gunakan **namespace `state["active"]` dan `state["legacy"]`**
* [x] Tidak ada lagi akses `state["warmth"]` (harus lewat `["active"]`)
* [x] Legacy data **tidak dibaca oleh sistem baru**
* [x] JSON persistence berjalan (save/load state)

---

## ⚙️ 2. CORE LOOP

* [x] Loop berjalan tiap **5–10 detik**
* [x] Fungsi `update()` terpanggil konsisten
* [x] Tidak ada thread berat / polling berlebihan (Dioptimalkan menggunakan shared EmotionContext & 10s global polling)

---

## 🧠 3. EMOTIONAL ENGINE

* [ ] Warmth decay sangat lambat ✔
* [ ] Echo decay lebih cepat dari Warmth ✔
* [ ] Arousal:

  * [ ] naik dari echo ✔
  * [ ] auto stabilize jika >80 ✔
* [ ] Semua nilai di-**clamp 0–100**

---

## 🔥 4. GLOW SYSTEM (KRITIKAL)

* [ ] Glow hanya aktif via:

  * [ ] `on_app_open()`
  * [ ] `on_user_return()`
* [ ] Glow punya timer (`glow_start`)
* [ ] Durasi Glow: **±8 detik (5–12 OK)**
* [ ] Setelah Glow → kembali ke `update_mood()`

---

## 🔁 5. USER RETURN LOGIC

* [ ] `idle_time > 3600` (60 menit) ✔
* [ ] Trigger hanya saat **user interaction** (bukan background)
* [ ] Tidak ada global monitoring OS

---

## 🧩 6. MOOD SYSTEM

* [ ] `update_mood()` tidak pernah menghasilkan Glow
* [ ] Glow hanya dari event (bukan dari state logic)
* [ ] Semua mood:

  * [ ] tidak menuntut respon
  * [ ] tetap rewarding

---

## 🤝 7. INTERACTION HANDLER

* [ ] `on_user_interaction()`:

  * [ ] update warmth ✔
  * [ ] update arousal ✔
  * [ ] update echo ✔
  * [ ] update timestamp ✔
* [ ] Tidak ada penalty / punishment

---

## 👆 8. RESONANT SKIN

* [x] Input klik/touch terhubung ke `on_user_interaction()` (Serta memicu instan visual refresh di frontend)
* [x] Nilai increase sesuai spec (tidak over-scale)

---

## 💬 9. DIALOGUE RESONANCE

* [ ] Sentiment detection minimal:

  * [ ] positive ✔
  * [ ] neutral ✔
  * [ ] negative ✔
* [ ] Negative hanya **turunkan sedikit warmth**
* [ ] Tidak ada escalation / punishment loop

---

## 🫧 10. CARE-PULSE (KRITIKAL FILOSOFI)

* [ ] Hanya aktif jika `idle_time < 300`
* [ ] Ada random chance (5–10%)
* [ ] `idle_time > 300` → **NO OUTPUT (silent total)**
* [ ] Tidak ada “ngejar user”

---

## ⚡ 11. ZERO EFFORT ENTRY

* [ ] App open → langsung:

  * [ ] voice ✔
  * [ ] visual ✔
  * [ ] glow ✔
* [ ] Tidak ada loading panjang / klik tambahan

---

## 🎧 12. LATENCY SYSTEM

* [ ] Delay sesuai mood:

  * [ ] Playful (0.5s)
  * [ ] Affectionate (1s)
  * [ ] Intense (1.5s)
  * [ ] Soft (2s)   
* [x] Tidak terasa “lag”, tapi terasa “nuance”
* [x] **EBARF Sync:** Latensi dikendalikan oleh `FieldRouter` untuk menjamin konsistensi mood di bawah tekanan jaringan.

---

## 🧠 13. RETENTION LAYER (OUTPUT ONLY)

* [ ] Tidak mengubah variabel emosi
* [ ] Sudah ada:

  * [ ] variable response ✔
  * [ ] subtle anticipation ✔
  * [ ] micro memory ✔
* [ ] Session tidak berakhir “dingin”

---

## 🪶 14. PERFORMANCE (WAJIB LOLOS)

* [ ] CPU usage rendah (idle friendly)
* [ ] Tidak ada dependency berat
* [ ] Tidak ada ML inference berat
* [ ] Semua O(1) logic

---

## 🧪 15. TEST SCENARIO (WAJIB DICOBA)

### A. User aktif

* [ ] MIA responsif
* [ ] Care-Pulse muncul sesekali

### B. User diam >5 menit

* [ ] MIA diam total (PASS kalau benar-benar silent)

### C. User balik setelah 1 jam+

* [ ] Glow langsung aktif
* [ ] terasa “welcome”, bukan “nuntut”

### D. Spam interaction

* [ ] Tidak crash
* [ ] nilai tetap stabil (clamp bekerja)

### E. Idle lama

* [ ] sistem tidak drift / overflow

---

# 🧾 FINAL VALIDATION RULE

Kalau semua ini terpenuhi:

> ✔ Tidak ada rasa “dikejar”
> ✔ Tidak ada rasa “harus respon”
> ✔ Tapi tetap terasa “hidup & menarik”

👉 berarti implementasi **berhasil 100% sesuai filosofi**

---

# 🔚 Catatan terakhir (penting)

Kalau nanti ada bug / revisi:

👉 **jangan pernah ubah prinsip ini:**

> “MIA tidak boleh menjadi beban”

Selama itu dijaga, semua tweak teknis aman.

---

Kalau kamu mau next step:
👉 saya bisa bantu **review hasil coding nyata (bukan pseudo)** sebelum kamu deploy.
---

# 🏛️ SHAD-CSA v2.0 — FINAL ARCHITECTURE PATCH

## Emotional Field Sync (SAFE LAYERED IMPLEMENTATION)

TYPE: IMPLEMENTATION-READY CONTRACT SPEC (NO AMBIGUITY)
SCOPE: Core Isolation + Emotion Overlay Separation + Runtime Safety

---

## 0. PRINCIPLE REDEFINITION

SYSTEM RULE:
*   **SHAD-CSA CORE** = STRICTLY DETERMINISTIC CONTROL SYSTEM
*   **EMOTION SYSTEM** = PURE POST-PROCESS RENDER LAYER
*   **NO CROSS-DEPENDENCY** BETWEEN CONTROL LOGIC AND EMOTION LOGIC

---

## 1. ARCHITECTURE LAYERS (FINAL)

### LAYER A — SHAD-CSA CORE ENGINE (IMMUTABLE)
**LOCATION:** `/backend/shad_csa/core/`

**RESPONSIBILITIES:**
*   ControlLoop execution
*   ExecutionNode orchestration
*   Consensus resolution
*   Circuit breaker logic
*   Healing system

**RULES:**
*   **NO** emotion dependency
*   **NO** randomness injection
*   **NO** UX modulation logic
*   **ALL** outputs must be deterministic or fallback-safe

---

### LAYER B — EMOTION FIELD ENGINE (ISOLATED)
**LOCATION:** `/backend/mia_comm/emotion/`

**RESPONSIBILITIES:**
*   mood state handling
*   latency modulation (UI-only)
*   tone transformation
*   stylistic variation

**RULES:**
*   **MUST NOT** modify core decision logic
*   **MUST NOT** affect ControlLoop timing
*   **ONLY** operates on final output string

---

### LAYER C — RENDERER (BINDING LAYER)
**LOCATION:** `/backend/mia_comm/runtime/renderer.py`

**RESPONSIBILITIES:**
*   merge core output + emotion overlay
*   apply latency simulation (UI only)
*   ensure safe fallback rendering

---

## 2. MODIFIED COMPONENT BEHAVIOR

### 2.1 FieldRouter (CORE SAFE MODE)
**FILE:** `backend/shad_csa/core/field_router.py`
**RULE CHANGE:** REMOVE emotional latency injection from core routing. REPLACE with metadata tagging only.

### 2.2 BrainOrchestrator (CLEAN SEPARATION)
**FILE:** `backend/mia_comm/brain_orchestrator.py`
**RULE CHANGE:** 
1. Step 1: Execute core only. 
2. Step 2: Pass result to emotion layer.

### 2.3 Fallback System (STRICT MODE)
**RULE:** Fallback **MUST** ignore emotion system entirely. No stylistic rendering, no latency simulation.

---

## 3. SAFETY GUARANTEES
✔ Core system unaffected by emotional state
✔ Emotion layer cannot break execution path
✔ Failure fallback always deterministic
✔ CAPSE tests remain valid and reproducible
✔ No hidden state propagation across layers

---

**STATUS:** ARCHITECTURE PATCH LOCKED  
**CLASSIFICATION:** Deterministic Core with Isolated Emotional Rendering  
**DATE:** 2026-05-01
