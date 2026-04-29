import asyncio
import os
import shutil
from core.perception import perception_hub
from core.memory_graph import memory_store

async def test_perception_system():
    # 0. Cleanup
    if os.path.exists("backend/data/test_perception"):
        shutil.rmtree("backend/data/test_perception")
    
    # 1. Test Observation (Eyes + Ears)
    print("[Test] Observing environment...")
    # Simulate hearing "Tolong buka browser sekarang!" (Urgent action request)
    state = await perception_hub.observe_environment(
        include_vision=True, 
        audio_text="Tolong buka browser sekarang!"
    )
    
    # 2. Verify Vision
    assert state.vision is not None
    print(f"[Test] Vision found {len(state.vision.elements)} elements.")
    # Check if we detected any windows
    windows = [e for e in state.vision.elements if e.type == "window"]
    if windows:
        print(f"[Test] Detected Window: {windows[0].label}")
    
    # 3. Verify Audio Semantic Parsing
    assert state.audio is not None
    assert state.audio.urgency_score > 0.5
    assert state.audio.intent == "action_request"
    print(f"[Test] Audio parsed: Intent={state.audio.intent}, Urgency={state.audio.urgency_score}")
    
    # 4. Verify Memory Persistence
    # Check if a perception node exists in memory
    all_nodes = memory_store.nodes
    perception_nodes = [nid for nid in all_nodes if nid.startswith("perception_")]
    assert len(perception_nodes) > 0
    print(f"[Test] Success: Perception event '{perception_nodes[0]}' persisted to Memory Graph.")

if __name__ == "__main__":
    asyncio.run(test_perception_system())
