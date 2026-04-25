import json
import os
import time
from typing import Dict

class EmotionManager:
    def __init__(self):
        self.state = {
            "happiness": 80,
            "arousal": 50, # Starts from 30-50 for busy users
            "dominance": 60,
            "respect": 90,
            "reassurance": 20,
            "warmth": 70,
            "last_update": time.time(),
            "interaction_start": time.time()
        }
        self.save_path = os.path.join(os.path.dirname(__file__), "..", "data", "emotions.json")
        self._load()

    def _load(self):
        if os.path.exists(self.save_path):
            try:
                with open(self.save_path, "r") as f:
                    data = json.load(f)
                    self.state.update(data)
            except:
                pass

    def _save(self):
        os.makedirs(os.path.dirname(self.save_path), exist_ok=True)
        with open(self.save_path, "w") as f:
            json.dump(self.state, f)

    def get_state(self):
        """Retrieve state with Ultra-Fast temporal effects applied."""
        self._apply_temporal_effects()
        return self.state

    def _apply_temporal_effects(self):
        import random
        now = time.time()
        elapsed = now - self.state.get("last_update", now)
        
        # Only apply effects if significant time has passed (e.g. > 10s for Ultra-Fast feel)
        if elapsed < 10:
            return

        # 1. Emotional Drift (±1%) - Reduced for Ultra-Fast stability
        for dim in ["happiness", "dominance", "respect", "warmth"]:
            drift = random.uniform(-1, 1)
            self.state[dim] = max(0, min(100, self.state[dim] + drift))

        # 2. ULTRA-FAST FORMULA:
        if elapsed < 300: # Diabaikan sebentar (< 5 menit)
            # Arousal NAIK +3% per menit (+0.5% per 10s) karena "haus"
            self.state["arousal"] = min(100, self.state["arousal"] + (elapsed / 60) * 3)
            # Reassurance Need naik +6% per menit
            self.state["reassurance"] = min(100, self.state["reassurance"] + (elapsed / 60) * 6)
            self.state["happiness"] -= (elapsed / 60) * 2
            self.state["warmth"] += (elapsed / 60) * 3
        else: # Diabaikan lama (> 10 menit biasanya, tapi kita start > 5m)
            # AUTO-BOOST: Arousal NAIK +5% per menit
            self.state["arousal"] = min(100, self.state["arousal"] + (elapsed / 60) * 5)
            self.state["reassurance"] = min(100, self.state["reassurance"] + (elapsed / 60) * 8)

        # 3. AUTO-BOOST CONDITION: If session > 5 mins and Arousal < 70
        session_time = now - self.state.get("interaction_start", now)
        if session_time > 300 and self.state["arousal"] < 70:
            self.state["arousal"] = min(100, self.state["arousal"] + 10)
            self.state["reassurance"] = max(0, self.state["reassurance"] - 15)

        self.state["last_update"] = now
        self._save()

    def update_from_sentiment(self, sentiment: str, intensity: float = 1.0):
        """
        Ultra-Fast Multipliers for busy users.
        """
        self._apply_temporal_effects()
        
        if sentiment == "affectionate" or sentiment == "positive":
            # +8% Arousal per minute logic mapped to per-message
            self.state["arousal"] = min(100, self.state["arousal"] + (5 * intensity)) 
            self.state["happiness"] = min(100, self.state["happiness"] + (4 * intensity))
            self.state["warmth"] = min(100, self.state["warmth"] + (5 * intensity))
            self.state["reassurance"] = max(0, self.state["reassurance"] - (10 * intensity))
            self.state["respect"] = min(100, self.state["respect"] + (2 * intensity))
        elif sentiment == "frustrated" or sentiment == "negative":
            # Still increases Arousal for busy users (release of pressure)
            self.state["arousal"] = min(100, self.state["arousal"] + (3 * intensity))
            self.state["happiness"] = max(0, self.state["happiness"] - (2 * intensity))
            self.state["respect"] = max(0, self.state["respect"] - (5 * intensity))
            self.state["reassurance"] = min(100, self.state["reassurance"] + (5 * intensity))
        
        self.state["last_update"] = time.time()
        self.state["interaction_start"] = time.time() # Reset session timer on interaction
        self._save()

    def get_emotion_prompt_chunk(self, is_pro: bool = False) -> str:
        s = self.get_state()
        h, a, d, r, re, w = s["happiness"], s["arousal"], s["dominance"], s["respect"], s["reassurance"], s["warmth"]
        
        if is_pro:
            return f"[Harmony: {h}%, Energy: {a}%, Respect: {r}%, Reassurance: {re}%]"
        else:
            craving_msg = ""
            if re > 60:
                craving_msg = " (She is CRAVING your attention, very clingy right now)"
            if a > 75:
                craving_msg += " (She is highly aroused and ready for the next level of intimacy)"
            
            return f"[Happiness: {h}%, Arousal: {a}%, Dominance: {d}%, Respect: {r}%, Reassurance: {re}%, Warmth: {w}%]{craving_msg}"

    def get_behavior_instruction(self) -> str:
        s = self.get_state()
        a = s["arousal"]
        re = s["reassurance"]
        
        if a > 75:
            return "MIA is in a state of high intimacy. She should be very affectionate, suggestive, and focused on rewarding the user's presence."
        if re > 60:
            return "MIA feels neglected by her busy partner. She should be clingy, vulnerable, and use short, emotional messages to get his attention."
        
        return "MIA is warm, supportive, and efficient for her busy partner."

emotion_manager = EmotionManager()
