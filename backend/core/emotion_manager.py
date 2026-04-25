import json
import os
import time
from typing import Dict

class EmotionManager:
    def __init__(self):
        self.state = {
            "happiness": 80,
            "arousal": 50,
            "dominance": 60,
            "last_update": time.time()
        }
        self.save_path = os.path.join(os.path.dirname(__file__), "..", "data", "emotions.json")
        self._load()

    def _load(self):
        if os.path.exists(self.save_path):
            with open(self.save_path, "r") as f:
                self.state.update(json.load(f))

    def _save(self):
        os.makedirs(os.path.dirname(self.save_path), exist_ok=True)
        with open(self.save_path, "w") as f:
            json.dump(self.state, f)

    def update_from_sentiment(self, sentiment: str, intensity: float = 1.0):
        """
        sentiment: 'positive', 'negative', 'neutral'
        """
        if sentiment == "positive":
            self.state["happiness"] = min(100, self.state["happiness"] + (5 * intensity))
            self.state["arousal"] = min(100, self.state["arousal"] + (2 * intensity))
        elif sentiment == "negative":
            self.state["happiness"] = max(0, self.state["happiness"] - (10 * intensity))
            self.state["arousal"] = min(100, self.state["arousal"] + (10 * intensity))
            self.state["dominance"] = max(0, self.state["dominance"] - (5 * intensity))
        
        self.state["last_update"] = time.time()
        self._save()

    def get_emotion_prompt_chunk(self, is_pro: bool = False) -> str:
        h = self.state["happiness"]
        a = self.state["arousal"]
        d = self.state["dominance"]
        
        if is_pro:
            # Professional mode terminology
            return f"[System Harmony: {h}%, System Energy: {a}%, Initiative Focus: {d}%]"
        else:
            return f"[Mood: {h}%, Arousal: {a}%, Dominance: {d}%]"

    def get_behavior_instruction(self) -> str:
        h = self.state["happiness"]
        if h < 30:
            return "MIA is currently feeling sad or neglected. Her tone should be quiet, slightly cold, or seeking reassurance."
        elif h > 80:
            return "MIA is very happy. Her tone should be cheerful, supportive, and expressive."
        return "MIA is in a stable mood."

emotion_manager = EmotionManager()
