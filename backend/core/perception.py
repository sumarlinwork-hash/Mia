import time
from typing import Optional, Dict, Any
from pydantic import BaseModel, Field
from core.vision_hub import vision_hub, VisionScene
from core.audio_hub import audio_hub, AudioPerception
from core.memory_graph import memory_store, MemoryNode, MemoryNodeType

class UnifiedWorldState(BaseModel):
    timestamp: float = Field(default_factory=time.time)
    vision: Optional[VisionScene] = None
    audio: Optional[AudioPerception] = None
    system_telemetry: Dict[str, Any] = Field(default_factory=dict)

class PerceptionHub:
    def __init__(self):
        self.memory = memory_store

    async def observe_environment(self, include_vision: bool = True, audio_text: Optional[str] = None) -> UnifiedWorldState:
        """
        Gathers multimodal input and persists it to Memory Graph (Rule 3.5).
        """
        vision_scene = None
        if include_vision:
            vision_scene = await vision_hub.capture_scene()
            
        audio_perception = None
        if audio_text:
            audio_perception = await audio_hub.analyze_speech(audio_text)
            
        state = UnifiedWorldState(
            vision=vision_scene,
            audio=audio_perception
        )
        
        # PERSIST TO MEMORY (Rule 7.1)
        # Create a PerceptionSnapshot node
        snapshot_id = f"perception_{int(state.timestamp)}"
        content = {
            "window_count": len(vision_scene.elements) if vision_scene else 0,
            "audio_text": audio_perception.text if audio_perception else None,
            "urgency": audio_perception.urgency_score if audio_perception else 0.0
        }
        
        node = MemoryNode(
            id=snapshot_id,
            type=MemoryNodeType.EVENT,
            content=content
        )
        self.memory.add_node(node)
        
        # Link to related concepts/entities if found
        if audio_perception and audio_perception.intent:
            # Simple relationship: Perception -> relates_to -> Intent
            # In a full version, we would link to specific Identity or Concept nodes
            pass
            
        return state

perception_hub = PerceptionHub()
