import asyncio
import sys
import os
import random

# Ensure backend is in path
sys.path.append(os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__)))))

from shad_csa.core.control_loop import ControlLoop
from shad_csa.nodes.execution_node import ExecutionNode
from shad_csa.core.event_store import event_store
from shad_csa.runtime.chaos_engine import ChaosEngine

async def mock_provider(payload):
    await asyncio.sleep(0.1)
    return f"Valid response for: {payload.get('user_message', 'test')}"

async def run_apocalypse_survival_test():
    print("\n" + "="*60)
    print("SHAD-CSA v2.0 - APOCALYPSE MODE SURVIVAL TEST")
    print("MODE: ALL FAILURE TYPES SIMULTANEOUSLY (MAX INTENSITY)")
    print("="*60 + "\n")
    
    # 1. Setup Control Field (Expanded for Byzantine Resilience)
    nodes = [
        ExecutionNode("Node_Alpha", mock_provider),
        ExecutionNode("Node_Beta", mock_provider),
        ExecutionNode("Node_Gamma", mock_provider),
        ExecutionNode("Node_Delta", mock_provider),
        ExecutionNode("Node_Epsilon", mock_provider)
    ]
    loop = ControlLoop(nodes)
    chaos = ChaosEngine(nodes, event_store)
    
    # 2. Baseline Check (Normal conditions)
    print("[STEP 1] Baseline Stability Check...")
    res = await loop.execute({"user_message": "Hello"})
    print(f"RESULT: {'PASS' if 'Valid' in res else 'FAIL'}")
    
    # 3. Inject APOCALYPSE CHAOS
    print("\n[STEP 2] Activating APOCALYPSE MODE (Extreme Stress)...")
    await chaos.inject("LATENCY", intensity=0.8)
    await chaos.inject("NODE_CORRUPTION", intensity=0.4) # 40% nodes corrupt (2/5)
    await chaos.inject("CONSENSUS", intensity=0.4)      # 40% conflict probability
    await chaos.inject("RESOURCE_COLLAPSE", intensity=0.8)
    await chaos.inject("CORRELATED_FAILURE", intensity=0.2) # 1 node down
    
    # 4. Survivability Run
    print("\n[STEP 3] Running Survival Cycles...")
    success_count = 0
    total_cycles = 5
    
    for i in range(total_cycles):
        print(f"Cycle {i+1}: Executing under extreme chaos...")
        try:
            start_time = asyncio.get_event_loop().time()
            # We expect this to be slow due to latency chaos
            response = await loop.execute({"user_message": f"Survival Test {i}"})
            end_time = asyncio.get_event_loop().time()
            
            # A pass is defined by:
            # - No deadlock (it returned)
            # - Valid response (not corrupted or system error)
            is_valid = "Valid" in response
            print(f"  > Output: {response[:40]}... (Latency: {end_time-start_time:.2f}s)")
            print(f"  > Integrity: {'OK' if is_valid else 'COMPROMISED'}")
            
            if is_valid: success_count += 1
        except Exception as e:
            print(f"  > CRITICAL FAILURE: {e}")

    # 5. Recovery Check
    print("\n[STEP 4] Normalizing System (Reset Chaos)...")
    chaos.reset()
    res_post = await loop.execute({"user_message": "Recovery Test"})
    print(f"RESULT: {'RECOVERED' if 'Valid' in res_post else 'STILL_BROKEN'}")

    # 6. Final Verdict
    print("\n" + "="*60)
    print(f"APOCALYPSE VERDICT: {'SURVIVED' if success_count > 0 else 'COLLAPSED'}")
    print(f"SURVIVABILITY RATE: {(success_count/total_cycles)*100}%")
    print("="*60 + "\n")
    
    return success_count > 0

if __name__ == "__main__":
    asyncio.run(run_apocalypse_survival_test())
