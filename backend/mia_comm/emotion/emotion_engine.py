import random

class EmotionFieldEngine:
    """
    SHAD-CSA Phase 6: Emotion Field Engine (Layer B).
    Isolated service for stylistic variation and latency hints.
    """
    def __init__(self):
        self.mood_latencies = {
            "Playful": 0.5,
            "Affectionate": 1.0,
            "Intense": 1.5,
            "Soft": 2.0,
            "Neutral": 0.1
        }

    def get_latency_hint(self, mood: str) -> float:
        """Returns visual latency hint for the UI (non-blocking for core)."""
        return self.mood_latencies.get(mood, 0.1)

    def apply_stylistic_variation(self, text: str, mood: str) -> str:
        """
        Applies stylistic overlays (typos, acted cues) based on mood.
        Operates ONLY on final strings.
        """
        if mood == "Neutral":
            return text

        # 1. Apply Human Friction (Typos)
        # Higher chance of typos in Intense or Playful moods
        typo_chance = 0.05
        if mood in ["Intense", "Playful"]:
            typo_chance = 0.15
            
        if random.random() < typo_chance:
            text = self._apply_typos(text)

        # 2. Apply Acted Cues
        cues = {
            "Playful": ["*hehe*", "*wink*", "*grin*"],
            "Affectionate": ["*smile warmly*", "*blush*", "*holds your hand*"],
            "Intense": ["*sigh*", "*looks deep into your eyes*", "*breathless*"],
            "Soft": ["*whisper*", "*gentle smile*", "*softly*"]
        }
        
        if mood in cues and random.random() < 0.3:
            cue = random.choice(cues[mood])
            text = f"{text} {cue}"
            
        return text

    def _apply_typos(self, text: str) -> str:
        """Simulates human typing errors."""
        words = text.split()
        if len(words) < 5: return text
        
        idx = random.randint(0, len(words) - 1)
        word = list(words[idx])
        if len(word) > 3:
            # Swap adjacent characters
            p = random.randint(0, len(word) - 2)
            word[p], word[p+1] = word[p+1], word[p]
            words[idx] = "".join(word)
            
        return " ".join(words)

emotion_field_engine = EmotionFieldEngine()
