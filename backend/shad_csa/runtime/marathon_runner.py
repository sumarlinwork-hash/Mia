import asyncio
import sys
import os

# Ensure backend is in path
sys.path.append(os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__)))))

from shad_csa.core.control_loop import ControlLoop
from shad_csa.nodes.execution_node import ExecutionNode
from shad_csa.core.event_store import event_store
from shad_csa.runtime.chaos_engine import ChaosEngine
from shad_csa.runtime.endurance_engine import EnduranceEngine

async def mock_provider(payload):
    # Base latency 50ms
    await asyncio.sleep(0.05)
    return f"VALID_SIGNAL_{payload.get('entropy', 0)}"

async def run_gahar_marathon():
    print("\n" + "!"*60)
    print("SHAD-CSA STOCHASTIC MARATHON - MODE: TERGAHAR (200 CYCLES)")
    print("TARGET: 200 CYCLES | STOCHASTIC_PRESSURE: 0.25 | CASCADE: 50")
    print("!"*60 + "\n")
    
    nodes = [
        ExecutionNode("Node_A", mock_provider),
        ExecutionNode("Node_B", mock_provider),
        ExecutionNode("Node_C", mock_provider),
        ExecutionNode("Node_D", mock_provider),
        ExecutionNode("Node_E", mock_provider)
    ]
    
    loop = ControlLoop(nodes)
    chaos = ChaosEngine(nodes, event_store)
    marathon = EnduranceEngine(loop, chaos)
    
    # 200 cycle marathon with high entropy
    # We increase chaos frequency for "tergahar" status
    success = await marathon.run_stochastic_marathon(cycles=200)
    
    return success

if __name__ == "__main__":
    try:
        asyncio.run(run_gahar_marathon())
    except KeyboardInterrupt:
        print("\n[USER_ABORT] Marathon interrupted by user.")
