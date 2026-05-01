import os
import re
import json

IAM_MIA_DIR = os.path.join(os.path.dirname(os.path.dirname(__file__)), "iam_mia")
SOUL_PATH = os.path.join(IAM_MIA_DIR, "SOUL.md")

class PersonalityManager:
    def __init__(self):
        # Default Baseline (Warmth, Arousal, Echo) - Synchronized with SSOT v5
        self.default_p = [0.7, 0.5, 0.4]

    def parse_soul(self) -> list[float]:
        """
        Parses SOUL.md to derive the personality baseline vector P.
        Fulfills mia_sexy_emotion.md Section 4 (Active Dimensions).
        """
        if not os.path.exists(SOUL_PATH):
            return self.default_p

        try:
            with open(SOUL_PATH, "r", encoding="utf-8") as f:
                content = f.read().lower()

            # Initialize with default [warmth, arousal, echo]
            p = list(self.default_p)

            # Keyword Analysis (Synchronized with new Dimension logic)
            
            # 1. Genit/Nakal/Sexy keywords
            if any(k in content for k in ["genit", "nakal", "flirty", "tease", "sexy"]):
                p[1] += 0.2  # +Arousal
                p[2] += 0.2  # +Echo (More responsive/attention)

            # 2. Dewasa/Bijak/Sanguin keywords
            if any(k in content for k in ["dewasa", "bijak", "mature", "wise", "sanguin"]):
                p[0] += 0.2  # +Warmth
                p[1] -= 0.1  # -Arousal (More stable)

            # 3. Penurut/Setia keywords
            if any(k in content for k in ["penurut", "obedient", "setia", "loyal"]):
                p[0] += 0.1  # +Warmth
                p[2] += 0.2  # +Echo (High devotion)

            # 4. Ceria/Happy/Cheerful keywords
            if any(k in content for k in ["ceria", "happy", "bubbly", "ceria"]):
                p[0] += 0.1  # +Warmth
                p[1] += 0.1  # +Arousal

            # Clamp results
            return [max(0.0, min(1.0, v)) for v in p]

        except Exception as e:
            print(f"[Personality] Error parsing SOUL.md: {e}")
            return self.default_p

    def get_personality_json(self):
        p = self.parse_soul()
        return {
            "p_vector": p,
            "labels": ["warmth", "arousal", "echo"],
            "status": "synchronized" if os.path.exists(SOUL_PATH) else "default"
        }

personality_manager = PersonalityManager()
