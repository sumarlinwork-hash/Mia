# MASIH STUCK!!!

# MIA FLOATING AVATAR — STANDALONE RENDERER CONTRACT (v1.0)

## 🎯 VISI
Membangun visualisasi MIA sebagai entitas desktop otonom (Native PC) yang ringan dan responsif, terpisah dari proses browser, namun tetap dikendalikan oleh "Otak" emosional pusat.

---

## 🛰️ 1. DATA STREAM PROTOCOL (THE BRIDGE)

Aplikasi Utama (Backend/Web) akan mengirimkan "Emotional Pulse" ke Standalone Avatar melalui **Local WebSocket** atau **Shared JSON File** di folder `mia_avatar`.

### Data Payload:
```json
{
  "timestamp": 1714396200,
  "identity": "MIA",
  "emotions": {
    "attention_echo": 68.5,
    "arousal": 54.2,
    "warmth": 88.0
  },
  "intent": {
    "action": "idle",
    "priority": 1
  }
}
```

---

## 🎭 2. BEHAVIOR MAPPING (3-DIMENSIONAL EMOTION CALCULATION ENGINE)

Aplikasi Desktop (Unity/Native) akan menerjemahkan 3 angka tersebut menjadi perilaku visual:

### A. Attention Echo (Fokus & Responsivitas)
- **High (>70)**: Pandangan mata MIA akan mengunci ke posisi kursor mouse secara agresif (Fast Tracking).
- **Low (<30)**: MIA akan tampak sering melamun, melihat ke arah acak, atau berkedip lebih lambat (Dreamy Look).

### B. Arousal (Energi & Intensitas)
- **High (>80)**: Animasi napas lebih cepat, gerakan tubuh lebih dinamis (Subtle Swaying), dan frekuensi berkedip meningkat.
- **Low (<40)**: Gerakan sangat tenang, napas lambat dan dalam, transisi antar animasi sangat lembut.

### C. Warmth (Ekspresi & Aura)
- **High (>70)**: Rona merah tipis pada pipi (Blush), senyum lembut yang konstan, dan sudut pandang mata yang "hangat".
- **Low (<40)**: Ekspresi lebih netral, aura visual lebih dingin/kebiruan, dan jarak emosional yang terasa di tatapan matanya.

---

## ⚙️ 3. RENDERER ARCHITECTURE (NATIVE PC)

1. **Standalone Process**: Berjalan di folder `mia_avatar` sebagai file executable (.exe).
2. **Always-on-Top**: Memanfaatkan Windows API untuk tetap berada di depan jendela lain tanpa mengganggu input (Click-through enabled).
3. **Hardware Acceleration**: Menggunakan DirectX/Vulkan langsung untuk beban nol (0%) pada browser.

---

## 🚀 4. IMPLEMENTASI LOGIC

1. **MIA Brain** (Python) → Menghitung 3 nilai emosi setiap detik.
2. **Emitter** → Mengirim nilai ke port lokal (misal: 127.0.0.1:8888).
3. **MIA Avatar** (Native) → Mendengar port tersebut, melakukan interpolasi (smoothing), dan merender visual sesuai target state.

---
*Status: DRAFT READY — Model emosi dikunci pada Attention Echo, Arousal, dan Warmth.*

FULL EXECUTION CONTRACT SPEC
MIA FLOATING AVATAR — STANDALONE RENDERER
ENGINE-READY v1.0 (HARDENED REAL-TIME EMOTION RUNTIME)

========================================
STATUS: NATIVE VISUAL RUNTIME LAYER ACTIVE
========================================

CORE RULE:
AVATAR IS A STATE-DRIVEN RENDER ENGINE
NO LOCAL AUTONOMY EXISTS
ALL BEHAVIOR IS EXTERNALLY CONTROLLED

========================================
1. DATA STREAM CONTRACT (BRIDGE LAYER)
========================================

SOURCE OF TRUTH:
MIA BRAIN EMOTION ENGINE (BACKEND)

TRANSPORT LAYER (STRICT ENUM):

ALLOWED:
- Local WebSocket (PRIMARY)
- Local UDP (OPTIONAL HIGH PERF)
- Shared JSON File (FALLBACK ONLY)

FORBIDDEN:
- Browser polling
- HTTP REST polling loops
- Uncontrolled local state mutation

----------------------------------------

1.1 EMOTION PAYLOAD SCHEMA (STRICT)

REQUIRED FIELDS:

{
  timestamp: number,
  identity: "MIA",
  emotions: {
    attention_echo: float,
    arousal: float,
    warmth: float
  },
  intent: {
    action: string,
    priority: int
  }
}

VALIDATION RULE:
IF any emotion field missing → REJECT FRAME

========================================
2. RENDER STATE ENGINE (CORE LOOP)
========================================

FRAME LOOP:

WHILE application_running:

    1. RECEIVE emotion_packet
    2. VALIDATE schema integrity
    3. APPLY smoothing filter
    4. UPDATE internal animation state
    5. RENDER frame
    6. WAIT next frame (delta time sync)

RULE:
FRAME UPDATE MUST BE INDEPENDENT OF UI THREAD

========================================
3. BEHAVIOR MAPPING ENGINE
========================================

3.1 ATTENTION_ECHO

RANGE RULES:

IF > 70:
    gaze_lock = TRUE
    tracking_mode = "cursor_hard_follow"

IF < 30:
    idle_behavior = "drift_gaze"
    blink_rate = LOW
    micro_saccades = RANDOM

----------------------------------------

3.2 AROUSAL

IF > 80:
    breathing_rate = FAST
    animation_intensity = HIGH
    sway_amplitude = INCREASED

IF < 40:
    breathing_rate = SLOW
    animation_intensity = LOW
    transition_smoothing = MAX

----------------------------------------

3.3 WARMTH

IF > 70:
    facial_blush = ENABLED
    eye_softness = HIGH
    aura_tone = WARM

IF < 40:
    facial_blush = DISABLED
    aura_tone = COOL
    emotional_distance_bias = HIGH

========================================
4. INTERPOLATION ENGINE (SMOOTHING CORE)
========================================

RULE:
NO DIRECT STATE JUMP ALLOWED

FORMULA:
current_state = lerp(previous_state, target_state, alpha)

WHERE:
alpha = delta_time * smoothing_factor

CONSTRAINT:
- prevent jitter
- enforce temporal continuity
- ensure emotional stability

========================================
5. NATIVE RENDERER ARCHITECTURE
========================================

PROCESS MODEL:

[PROCESS A] MIA BRAIN (Python)
    ↓ emits emotion stream

[PROCESS B] AVATAR RENDERER (Native EXE)
    ↓ consumes stream

RULE:
NO SHARED MEMORY STATE ALLOWED
ONLY STREAM INPUT

----------------------------------------

5.1 WINDOW LAYER RULES

- ALWAYS_ON_TOP = TRUE
- CLICK_THROUGH_MODE = OPTIONAL TOGGLE
- BORDERLESS_WINDOW = TRUE

FORBIDDEN:
- interfering with system input unless explicitly enabled
- browser dependency

========================================
6. PERFORMANCE ENFORCEMENT
========================================

FRAME TARGET:
- 60 FPS STANDARD
- 120 FPS IF HARDWARE ALLOWS

CONSTRAINTS:
- CPU usage target < 15%
- GPU usage delegated (DirectX/Vulkan only)
- NO MAIN THREAD BLOCKING

FAIL CONDITION:
IF frame_drop > threshold:
    activate "degrade_quality_mode"

========================================
7. FAILURE RECOVERY SYSTEM
========================================

7.1 STREAM LOSS HANDLING

IF websocket_disconnect:
    SWITCH TO:
        shared_json_fallback_mode

IF fallback fails:
    ENTER idle_emotion_state

----------------------------------------

7.2 CORRUPT FRAME HANDLING

IF invalid emotion packet:
    DISCARD FRAME
    REUSE LAST VALID STATE

========================================
8. EMOTION CONSISTENCY GUARANTEE
========================================

RULE:
NO RANDOM EMOTION GENERATION INSIDE RENDERER

STRICT RULE:
ALL EMOTION VALUES MUST COME FROM BRAIN ENGINE

FORBIDDEN:
- local AI inference
- heuristic emotion changes
- autonomous personality drift

========================================
9. SYNCHRONIZATION CONTRACT
========================================

RULE:
AVATAR STATE MUST ALWAYS MATCH LATEST VALID PACKET

LATENCY TARGET:
- < 100ms ideal
- < 250ms acceptable

OUT-OF-SYNC RULE:
IF packet delay > threshold:
    interpolate toward last known state only

========================================
10. SYSTEM GUARANTEES
========================================

✔ deterministic emotional rendering
✔ zero browser dependency
✔ real-time brain-to-avatar sync
✔ stable interpolation-based animation
✔ hardware-accelerated rendering pipeline

========================================
11. CRITICAL FAILURE MODES
========================================

SYSTEM FAIL IF:

- emotion schema invalid repeatedly
- stream desynchronization > 2s
- renderer enters uncontrolled state loop
- frame loop blocked > 200ms
- external mutation of internal state detected

RESULT:
→ ENTER SAFE IDLE STATE (STATIC AVATAR POSE)

========================================
END OF RENDERER CONTRACT
========================================