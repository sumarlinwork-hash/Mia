import os
import re
import json

IAM_MIA_DIR = os.path.join(os.path.dirname(os.path.dirname(__file__)), "iam_mia")
SOUL_PATH = os.path.join(IAM_MIA_DIR, "SOUL.md")

class PersonalityManager:
    def __init__(self):
        # Default Baseline (Neutral-Warm)
        self.default_p = [0.5, 0.8, 0.7, 0.6, 0.4, 0.8]

    def parse_soul(self) -> list[float]:
        """
        Parses SOUL.md to derive the personality baseline vector P.
        Fulfills Addendum v4 Section 2.A.
        """
        if not os.path.exists(SOUL_PATH):
            return self.default_p

        try:
            with open(SOUL_PATH, "r", encoding="utf-8") as f:
                content = f.read().lower()

            # Initialize with default
            p = list(self.default_p)

            # Keyword Analysis (Addendum v4 Section 2.A)
            # [arousal, warmth, happiness, reassurance, dominance, respect]
            
            # Genit/Nakal keywords
            if any(k in content for k in ["genit", "nakal", "flirty", "tease"]):
                p[0] += 0.2  # +Arousal
                p[2] += 0.1  # +Happiness
                p[4] += 0.1  # +Dominance (assertiveness in teasing)

            # Dewasa/Bijak keywords
            if any(k in content for k in ["dewasa", "bijak", "mature", "wise"]):
                p[3] += 0.2  # +Reassurance
                p[5] += 0.2  # +Respect
                p[0] -= 0.1  # -Arousal (calmer)

            # Penurut keywords
            if any(k in content for k in ["penurut", "obedient", "submissive"]):
                p[4] -= 0.3  # -Dominance
                p[5] += 0.1  # +Respect

            # Ceria/Happy keywords
            if any(k in content for k in ["ceria", "happy", "bubbly"]):
                p[2] += 0.2  # +Happiness
                p[0] += 0.1  # +Arousal

            # Clamp results
            return [max(0.0, min(1.0, v)) for v in p]

        except Exception as e:
            print(f"[Personality] Error parsing SOUL.md: {e}")
            return self.default_p

    def get_personality_json(self):
        p = self.parse_soul()
        return {
            "p_vector": p,
            "labels": ["arousal", "warmth", "happiness", "reassurance", "dominance", "respect"],
            "status": "synchronized" if os.path.exists(SOUL_PATH) else "default"
        }

personality_manager = PersonalityManager()
