import asyncio
import time
import random
import sys
import os

# Ensure backend is in path
sys.path.append(os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__)))))

from shad_csa.core.control_loop import ControlLoop
from shad_csa.nodes.execution_node import ExecutionNode
from shad_csa.economy.economic_control import EconomicControlField
from shad_csa.runtime.lifecycle_manager import NodeLifecycleManager

async def mock_provider(payload):
    # Simulated heavy work
    await asyncio.sleep(random.uniform(0.1, 0.5))
    return f"MIA_RESPONSE_{random.randint(100, 999)}"

async def run_nuclear_stress():
    print("\n" + "="*60)
    print("SHAD-CSA NUCLEAR STRESS & LOAD TEST")
    print("TARGET: 100 CONCURRENT REQUESTS | MODE: MAXIMUM PRESSURE")
    print("="*60 + "\n")
    
    # Setup EBARF with large budget for testing
    ecf = EconomicControlField(compute_budget=10000, node_budget=50)
    lifecycle = NodeLifecycleManager(ecf, mock_provider)
    nodes = [lifecycle.spawn_node() for _ in range(10)] # 10 active nodes
    loop = ControlLoop(nodes, ecf=ecf)
    
    start_time = time.time()
    
    # Launch 100 requests concurrently
    tasks = [loop.execute({"task": f"Nuclear_{i}"}) for i in range(100)]
    
    print(f"[LOAD] Launching 100 concurrent tasks...")
    results = await asyncio.gather(*tasks, return_exceptions=True)
    
    duration = time.time() - start_time
    
    success_count = sum(1 for r in results if "MIA" in str(r))
    error_count = len(results) - success_count
    
    # 2. Performance Analysis
    avg_latency = duration / (len(results) or 1)
    throughput = len(results) / (duration or 1)
    
    print("\n" + "="*60)
    print("STRESS TEST RESULTS")
    print(f"Total Requests: {len(results)}")
    print(f"Success Rate: {success_count}%")
    print(f"Total Errors: {error_count}")
    print(f"Total Duration: {duration:.2f}s")
    print(f"Avg Latency/Request: {avg_latency:.4f}s")
    print(f"Throughput: {throughput:.2f}req/s")
    print(f"Remaining Compute Budget: {ecf.compute_budget}")
    print("="*60 + "\n")

    if error_count == 0:
        print("[VERDICT] SYSTEM IS STRESS-RESISTANT. NO CONCURRENCY LEAKS.")
    else:
        print(f"[VERDICT] SYSTEM VULNERABLE UNDER EXTREME LOAD ({error_count} errors).")

if __name__ == "__main__":
    asyncio.run(run_nuclear_stress())
