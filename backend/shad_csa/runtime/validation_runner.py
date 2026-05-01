import asyncio
import sys
import os
import random

# Ensure backend is in path
sys.path.append(os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__)))))

from shad_csa.core.control_loop import ControlLoop
from shad_csa.nodes.execution_node import ExecutionNode
from shad_csa.economy.economic_control import EconomicControlField
from shad_csa.runtime.lifecycle_manager import NodeLifecycleManager
from shad_csa.runtime.resilience_interpreter import ResilienceInterpreter
from shad_csa.runtime.capse_engine import CAPSEEngine
from shad_csa.runtime.test_harness import CAPSETestHarness

async def mock_provider(payload):
    # Simulated work with potential drift
    await asyncio.sleep(0.05 + random.uniform(0, 0.01))
    return f"MIA_VALID_SIGNAL_{random.randint(1000, 9999)}"

async def run_validation_marathon(target_cycles=1000):
    print("\n" + "="*60)
    print(f"SHAD-CSA PHASE 6 - CAPSE VALIDATION MARATHON")
    print(f"TARGET: {target_cycles:,} CYCLES | MODE: ADVERSARIAL AUDIT")
    print("="*60 + "\n")
    
    # 1. Setup EBARF Components
    ecf = EconomicControlField(compute_budget=target_cycles + 100, node_budget=15, chaos_budget=500)
    lifecycle = NodeLifecycleManager(ecf, mock_provider)
    interpreter = ResilienceInterpreter()
    
    # Bootstrap initial nodes
    nodes = [lifecycle.spawn_node() for _ in range(5)]
    loop = ControlLoop(nodes, ecf=ecf, interpreter=interpreter)
    
    # 2. Setup CAPSE & Harness
    capse = CAPSEEngine(loop, nodes)
    harness = CAPSETestHarness(loop, capse, ecf, lifecycle)
    
    print("[HARNESS] Adversarial Audit active. Checking Invariants...\n")

    # 3. Execution Loop
    for cycle in range(1, target_cycles + 1):
        
        # Periodic Replenishment Logic
        if len(lifecycle.active_nodes) < 3:
            lifecycle.spawn_node()
            loop.nodes = lifecycle.active_nodes

        # Run Cycle through Harness
        result = await harness.run_cycle(cycle)

        # Log Progress every 100 cycles
        if cycle % 100 == 0:
            report = harness.get_survival_report()
            print(f"--- [CHECKPOINT {cycle:05}] ---")
            print(f"Success Rate: {report['success_rate']*100:.2f}%")
            print(f"Violations: {report['violation_count']}")
            print(f"Drift Velocity: {report['drift_velocity']:.4f}")
            print(f"Economic Health: {report['economic_stability_index']:.2f}")
            print("----------------------------\n", flush=True)

        if ecf.compute_budget <= 0:
            print("[HARNESS:ABORT] Economic Exhaustion.")
            break

    # 4. Final Verdict
    final_report = harness.get_survival_report()
    print("\n" + "="*60)
    print("FINAL VALIDATION VERDICT")
    print(f"Status: {'VALIDATED' if final_report['violation_count'] == 0 else 'COMPROMISED'}")
    print(f"Cycles: {final_report['cycles_completed']}")
    print(f"Survival Time: {final_report['survival_time']:.2f}s")
    print(f"Total Violations: {final_report['violation_count']}")
    print("="*60 + "\n")

if __name__ == "__main__":
    # Rational target for session validation
    asyncio.run(run_validation_marathon(target_cycles=1000))
