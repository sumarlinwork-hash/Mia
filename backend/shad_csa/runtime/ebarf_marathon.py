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

async def mock_provider(payload):
    await asyncio.sleep(0.05)
    return f"MIA_VALID_SIGNAL_{random.randint(1000, 9999)}"

async def run_ebarf_organism():
    print("\n" + "="*60)
    print("SHAD-CSA PHASE 6 - EBARF ORGANISM RUNTIME")
    print("MODE: ECONOMICALLY BOUNDED AUTONOMOUS RESILIENCE FIELD")
    print("="*60 + "\n")
    
    # 1. Initialize Economic Field
    ecf = EconomicControlField(compute_budget=500, node_budget=15, chaos_budget=100)
    
    # 2. Initialize Lifecycle & Interpreter
    lifecycle = NodeLifecycleManager(ecf, mock_provider)
    interpreter = ResilienceInterpreter()
    
    # 3. Initial Spawn (Bootstrap Pool)
    initial_nodes = []
    for _ in range(5):
        node = lifecycle.spawn_node()
        if node:
            initial_nodes.append(node)
            
    # 4. Initialize Brain (ControlLoop)
    loop = ControlLoop(initial_nodes, ecf=ecf, interpreter=interpreter)
    
    # 5. Launch CAPSE (Adversarial Reality)
    capse = CAPSEEngine(loop, initial_nodes)
    capse_task = asyncio.create_task(capse.run_forever())
    
    print("[SYSTEM] EBARF Organism is alive. Resource awareness enabled.")
    
    cycle = 0
    try:
        while cycle < 100:
            cycle += 1
            
            # REPLENISHMENT PHASE (The Evolution)
            # If nodes are failing/retired, spawn new ones from budget
            if len(lifecycle.active_nodes) < 5:
                print(f"[EBARF] Quorum under pressure ({len(lifecycle.active_nodes)} nodes). Attempting replenishment...")
                new_node = lifecycle.spawn_node()
                if new_node:
                    # Update loop with current active nodes
                    loop.nodes = lifecycle.active_nodes
            
            # EXECUTION PHASE
            start_time = asyncio.get_event_loop().time()
            response = await loop.execute({"task": f"Economic Cycle {cycle}"})
            latency = asyncio.get_event_loop().time() - start_time
            
            # BUDGET CHECK
            status = ecf.get_status()
            
            # RETIREMENT LOGIC (Hysteresis)
            # If a node is behaving poorly, retire it to get partial refund
            for node in list(lifecycle.active_nodes):
                trust = loop.state_engine.get_node_trust_score(node.name)
                if trust < 0.3:
                    print(f"[EBARF] Node {node.name} trust collapsed ({trust:.2f}). Retiring for refund.")
                    lifecycle.retire_node(node)
                    loop.nodes = lifecycle.active_nodes

            # Output Cycle Status
            is_valid = "MIA_VALID" in str(response)
            result_label = "VALID" if is_valid else "FAILED"
            print(f"Cycle {cycle:03} | {result_label} | Latency: {latency:.2f}s | Compute: {status['compute']} | Node Budget: {status['node']}", flush=True)

            if response == "MIA_SYSTEM_ERROR::ECONOMIC_EXHAUSTION":
                print("\n[CRITICAL] ECONOMIC COLLAPSE: All budgets exhausted. System shutting down.")
                break

            await asyncio.sleep(0.5)
            
    except KeyboardInterrupt:
        print("\n[USER] EBARF terminated.")
    finally:
        capse.is_running = False
        await capse_task
        print("\n" + "="*60)
        print("EBARF FINAL ORGANISM SUMMARY")
        print(f"Total Cycles: {cycle}")
        print(f"Final Node Budget: {ecf.node_budget}")
        print(f"Total Retired Nodes: {lifecycle.retired_count}")
        print("="*60 + "\n")

if __name__ == "__main__":
    asyncio.run(run_ebarf_organism())
