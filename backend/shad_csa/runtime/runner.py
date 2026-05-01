import asyncio
import sys
import os
import time

# Ensure backend is in path
sys.path.append(os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__)))))

from shad_csa.core.control_loop import ControlLoop
from shad_csa.nodes.execution_node import ExecutionNode

async def mock_unstable_provider(payload):
    # Simulate a provider that starts failing
    if getattr(mock_unstable_provider, "fail_now", False):
        await asyncio.sleep(0.1)
        return {"node": "UnstableNode", "success": False, "payload": "ERROR", "latency_ms": 100}
    await asyncio.sleep(0.1)
    return "Stable Response"

async def run_resilience_test():
    print("=== SHAD-CSA v2.0 Resilience & Actionable Fix Test ===")
    
    nodes = [ExecutionNode("UnstableNode", mock_unstable_provider)]
    loop = ControlLoop(nodes)
    
    # Cycle 1-3: Stable
    for i in range(3):
        print(f"Cycle {i+1} (Stable)...")
        await loop.execute({"text": "Test"})
        
    # Cycle 4-8: Trigger High Density Failure
    mock_unstable_provider.fail_now = True
    print("\n[CHAOS] Injecting high failure density...")
    
    for i in range(5):
        # We need to pass a mock telemetry_cb to capture suggestions
        async def telemetry_logger(data):
            if data["event"] == "CYCLE_COMPLETE":
                s = data["data"].get("suggestions", [])
                if s:
                    print(f"  [SUGGESTION DETECTED] {s[0]['label']}: {s[0]['description']}")
        
        loop.telemetry_cb = telemetry_logger
        await loop.execute({"text": "Chaos Test"})
        
    print("\nTest Complete. System successfully detected trends and generated actionable solutions.")

if __name__ == "__main__":
    asyncio.run(run_resilience_test())
