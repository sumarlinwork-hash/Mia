import asyncio
from enum import Enum
from typing import Dict, Any, Optional
from pydantic import BaseModel, Field

# --- PHASE 6 CONTRACT MODELS ---

class MIAMode(str, Enum):
    SAFE_MODE = "SAFE_MODE"
    POWER_MODE = "POWER_MODE"
    BEGINNER_MODE = "BEGINNER_MODE"

class ModeConfig(BaseModel):
    safety_threshold: float
    cognitive_loop_max: int
    simulation_required: bool = True
    memory_exposure: str # "LIMITED" | "FULL" | "MINIMAL"
    dag_stream_enabled: bool = False
    ui_visibility: str # "SANITIZED" | "FULL" | "MINIMAL"

# --- CORE MODE HUB KERNEL ---

class ModeHub:
    def __init__(self):
        self._state: MIAMode = MIAMode.SAFE_MODE
        self._subscribers = []
        
        # 3. MODE BEHAVIOR MATRIX (Contract 3.0)
        self.configs: Dict[MIAMode, ModeConfig] = {
            MIAMode.SAFE_MODE: ModeConfig(
                safety_threshold=0.8,
                cognitive_loop_max=2,
                memory_exposure="LIMITED",
                ui_visibility="SANITIZED"
            ),
            MIAMode.POWER_MODE: ModeConfig(
                safety_threshold=0.6,
                cognitive_loop_max=3,
                memory_exposure="FULL",
                dag_stream_enabled=True,
                ui_visibility="FULL"
            ),
            MIAMode.BEGINNER_MODE: ModeConfig(
                safety_threshold=0.9,
                cognitive_loop_max=2,
                memory_exposure="MINIMAL",
                ui_visibility="MINIMAL"
            )
        }

    def get_mode(self) -> MIAMode:
        return self._state

    def set_mode(self, mode: MIAMode):
        """
        MODE CHANGE = GLOBAL SYSTEM EVENT (Contract 4.0)
        """
        if mode == self._state:
            return
            
        print(f"[ModeHub] Switching to {mode}...")
        self._state = mode
        self._broadcast_change()

    def get_mode_config(self) -> ModeConfig:
        return self.configs[self._state]

    def _broadcast_change(self):
        """
        Notify all subsystems of mode change (Contract 4.0).
        """
        from core.local_runtime import local_event_bus
        from core.abstractions import Event
        import time
        
        event = Event(
            type="MODE_CHANGED",
            payload={"mode": self._state},
            source="mode_hub",
            timestamp=time.time()
        )
        asyncio.create_task(local_event_bus.publish(event))

# Singleton Instance
mode_hub = ModeHub()

# --- SUBSYSTEM INTEGRATION WRAPPERS ---

def get_current_safety_threshold() -> float:
    """
    Centralized helper for CognitiveEngine to read mode-dependent threshold (Contract 7.0).
    """
    return mode_hub.get_mode_config().safety_threshold

def is_telemetry_enabled(stream_type: str) -> bool:
    """
    Checks if specific telemetry stream is allowed in current mode (Contract 6.0).
    """
    config = mode_hub.get_mode_config()
    if stream_type == "DAG":
        return config.dag_stream_enabled
    if stream_type == "MEMORY":
        return config.memory_exposure == "FULL"
    return False
