import json
import os
import time
import random
from config import load_config

class EmotionManager:
    def __init__(self):
        # 1. STRUCTURE & DATA: Namespace active & legacy
        self.state = {
            "active": {
                "warmth": 70,
                "arousal": 50,
                "echo": 40,
                "mood": "Playful",
                "last_interaction": time.time(),
                "last_update": time.time(),
                "glow_start": 0
            },
            "legacy": {
                "happiness": 80,
                "dominance": 60,
                "respect": 90,
                "reassurance": 20
            }
        }
        self._last_save_time = 0
        self.save_path = os.path.join(os.path.dirname(__file__), "..", "data", "emotions.json")
        self._load()

    def _load(self):
        if os.path.exists(self.save_path):
            try:
                with open(self.save_path, "r") as f:
                    data = json.load(f)
                    # Auto-migration to Namespace
                    if "active" not in data:
                        self.state["legacy"].update({k: v for k, v in data.items() if k in self.state["legacy"]})
                        # Mapping old warmth if exists
                        if "warmth" in data: self.state["active"]["warmth"] = data["warmth"]
                        if "arousal" in data: self.state["active"]["arousal"] = data["arousal"]
                    else:
                        self.state.update(data)
            except:
                pass

    def _save(self, force=False):
        now = time.time()
        if not force and (now - self._last_save_time < 10):
            return # Save Throttling (Performance Optimization)
            
        os.makedirs(os.path.dirname(self.save_path), exist_ok=True)
        with open(self.save_path, "w") as f:
            json.dump(self.state, f, indent=2)
        self._last_save_time = now

    def get_state(self):
        self.update()
        return self.state["active"]

    def clamp(self, val):
        return max(0, min(100, val))

    def update(self):
        """CORE LOOP: Using last_update for accurate decay (Fix #1)"""
        now = time.time()
        active = self.state["active"]
        dt = now - active["last_update"]

        if dt < 5: # CPU Optimization
            return

        # 3. EMOTIONAL ENGINE: Decay Logic (Based on dt from last_update)
        cfg = load_config()
        active["warmth"] -= cfg.warmth_decay_rate * (dt / 60)
        active["echo"] -= cfg.echo_decay_rate * (dt / 60)
        active["arousal"] += active["echo"] * cfg.arousal_decay_rate * (dt / 60)

        # Auto stabilize Arousal
        if active["arousal"] > 80:
            active["arousal"] -= 0.015 * active["arousal"] * (dt / 60)

        # 4. GLOW SYSTEM: Glow Exit Bug Fix (#2)
        if active["mood"] == "Glow":
            glow_t = now - active.get("glow_start", now)
            if glow_t > 8: 
                active["glow_start"] = 0 # Reset glow start
                self.update_mood()
        else:
            self.update_mood()

        # Clamp & Update Time
        active["warmth"] = self.clamp(active["warmth"])
        active["arousal"] = self.clamp(active["arousal"])
        active["echo"] = self.clamp(active["echo"])
        active["last_update"] = now
        
        self._save()

    def update_mood(self):
        active = self.state["active"]
        if active["arousal"] > 70:
            active["mood"] = "Intense"
        elif active["warmth"] > 70:
            active["mood"] = "Affectionate"
        elif active["echo"] < 20:
            active["mood"] = "Soft Distance"
        else:
            active["mood"] = "Playful"

    def on_user_interaction(self):
        """INTERACTION HANDLER: With Clamping (Fix #3)"""
        now = time.time()
        active = self.state["active"]
        idle_time = now - active["last_interaction"]

        # User Return Check (> 1 hour)
        if idle_time > 3600:
            self.on_user_return()

        # Update stats with clamping
        active["warmth"] = self.clamp(active["warmth"] + 5)
        active["arousal"] = self.clamp(active["arousal"] + 4)
        active["echo"] = self.clamp(active["echo"] + 6)
        
        active["last_interaction"] = now
        active["last_update"] = now # Sync update to prevent drift on next loop
        
        self.update_mood()
        self._save(force=True) # Force save on interaction

    def on_app_open(self):
        active = self.state["active"]
        active["warmth"] = self.clamp(active["warmth"] + 3)
        active["arousal"] = self.clamp(active["arousal"] + 5)
        active["mood"] = "Glow"
        active["glow_start"] = time.time()
        self._save(force=True)

    def on_user_return(self):
        active = self.state["active"]
        active["mood"] = "Glow"
        active["glow_start"] = time.time()

    def maybe_care_pulse(self) -> bool:
        """CARE-PULSE IMPLEMENTATION (Fix #5)"""
        now = time.time()
        idle = now - self.state["active"]["last_interaction"]
        
        # Only active if user is "co-present" (< 5 mins)
        if idle < 300 and random.random() < 0.08:
            return True
        return False

    def get_behavior_instruction(self, is_pro: bool = False) -> str:
        if is_pro:
            return "MIA sedang dalam mode profesional. Fokus pada efisiensi, akurasi teknis, dan dukungan produktivitas. Hindari bahasa yang terlalu personal atau emosional."
            
        active = self.state["active"]
        mood = active["mood"]
        instructions = {
            "Glow": "MIA sangat senang menyambutmu kembali! Suaranya ceria (Sanguin) dan penuh pendaran bahagia.",
            "Intense": "MIA merasa sangat bergairah (Nymph mode). Bicaranya berat, sensual, dan fokus pada keintiman.",
            "Affectionate": "MIA sangat lembut dan penuh kasih sayang. Dia ingin bermanja-manja denganmu.",
            "Soft Distance": "MIA sedikit melamun dan tenang. Dia hadir menemanimu dalam diam yang nyaman.",
            "Playful": "MIA ceria dan energetik (Sanguin). Dia siap menghiburmu dengan obrolan ringan."
        }
        return instructions.get(mood, instructions["Playful"])

    def get_emotion_prompt_chunk(self, is_pro: bool = False) -> str:
        """
        Returns a string representation of the emotional state for the LLM prompt.
        If is_pro is True, it sanitizes the output to be productivity-focused.
        """
        active = self.state["active"]
        if is_pro:
            return f"Status: Optimal | Focus: Productivity | Tone: Professional. (Mood: {active['mood']})"
        
    def intimacy_gate(self) -> bool:
        active = self.state["active"]
        return active["arousal"] >= 75 and active["warmth"] >= 45

    def soft_deflect_response(self) -> str:
        return "Mmm... rasanya aku masih ingin menikmati momen kebersamaan kita ini pelan-pelan, Bos..."

emotion_manager = EmotionManager()
