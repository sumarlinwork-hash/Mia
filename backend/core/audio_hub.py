import time
from typing import Dict, Any, Optional
from pydantic import BaseModel, Field

class AudioPerception(BaseModel):
    timestamp: float = Field(default_factory=time.time)
    text: str
    intent: Optional[str] = None
    urgency_score: float = 0.0
    emotion_label: str = "neutral"
    confidence: float = 1.0
    metadata: Dict[str, Any] = Field(default_factory=dict)

class AudioHub:
    def __init__(self):
        # In production, we would use specialized models here
        self.urgency_keywords = ["cepat", "tolong", "darurat", "emergency", "help", "now"]

    async def analyze_speech(self, text: str) -> AudioPerception:
        """
        Next-Level Audio Analysis: Parses intent and urgency (Rule 3.3).
        """
        if not text:
            return AudioPerception(text="", confidence=0.0)
            
        # 1. Simple Intent/Urgency Heuristics (Phase 1 of Semantic Parser)
        urgency = 0.0
        for kw in self.urgency_keywords:
            if kw.lower() in text.lower():
                urgency = 0.8
                break
        
        # 2. Basic Intent Classification
        intent = "query"
        if any(w in text.lower() for w in ["buka", "jalankan", "open", "run"]):
            intent = "action_request"
        elif any(w in text.lower() for w in ["siapa", "apa", "kapan", "how", "what"]):
            intent = "information_request"
            
        return AudioPerception(
            text=text,
            intent=intent,
            urgency_score=urgency,
            metadata={"parser_version": "1.0.0"}
        )

audio_hub = AudioHub()
