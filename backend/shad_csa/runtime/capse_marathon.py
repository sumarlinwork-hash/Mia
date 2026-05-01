import asyncio
import sys
import os
import random

# Ensure backend is in path
sys.path.append(os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__)))))

from shad_csa.core.control_loop import ControlLoop
from shad_csa.nodes.execution_node import ExecutionNode
from shad_csa.core.event_store import event_store
from shad_csa.runtime.capse_engine import CAPSEEngine

async def mock_provider(payload):
    # Standard cognitive latency
    await asyncio.sleep(0.05)
    return f"MIA_STABLE_RESPONSE_{random.randint(100, 999)}"

async def run_capse_environment():
    print("\n" + "="*60)
    print("SHAD-CSA v2.0 - CAPSE PERMANENT REALITY LAYER")
    print("MODE: CONTINUOUS ADVERSARIAL PRESSURE (NO RESET)")
    print("="*60 + "\n")
    
    # 1. Setup Control Field
    nodes = [
        ExecutionNode("Alpha", mock_provider),
        ExecutionNode("Beta", mock_provider),
        ExecutionNode("Gamma", mock_provider),
        ExecutionNode("Delta", mock_provider),
        ExecutionNode("Epsilon", mock_provider)
    ]
    loop = ControlLoop(nodes)
    
    # 2. Initialize CAPSE (The Adversarial Layer)
    capse = CAPSEEngine(loop, nodes)
    
    # 3. Launch CAPSE as Background Reality
    capse_task = asyncio.create_task(capse.run_forever())
    
    print("[SYSTEM] MIA is now running inside the CAPSE Entropy Field.")
    print("[SYSTEM] Monitoring stability emergence...\n")

    # 4. Continuous Application Loop (Simulating user interaction)
    cycle = 0
    try:
        while cycle < 100: # We run 100 cycles for this demonstration
            cycle += 1
            start_time = asyncio.get_event_loop().time()
            
            try:
                # MIA tries to survive and provide a valid response
                response = await loop.execute({"request": f"Reality Check {cycle}"})
                latency = asyncio.get_event_loop().time() - start_time
                
                is_valid = "MIA_STABLE" in str(response)
                status = "STABLE" if is_valid else "COMPROMISED"
                
                # Report status in a compact format
                print(f"Cycle {cycle:03} | Status: {status} | Latency: {latency:.2f}s | Field Stability: {capse.resilience_field['stability_index']:.2f}", flush=True)
                
            except Exception as e:
                print(f"Cycle {cycle:03} | CRITICAL COLLAPSE: {e}", flush=True)

            # Wait for next interaction
            await asyncio.sleep(0.5)
            
    except KeyboardInterrupt:
        print("\n[USER] CAPSE Environment terminated.")
    finally:
        capse.is_running = False
        await capse_task
        print("\n" + "="*60)
        print("CAPSE FINAL SURVIVAL SUMMARY")
        print(f"Total Cycles: {cycle}")
        print(f"Emergent Stability Index: {capse.resilience_field['stability_index']:.2f}")
        print("="*60 + "\n")

if __name__ == "__main__":
    asyncio.run(run_capse_environment())
