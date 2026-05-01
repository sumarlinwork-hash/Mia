import asyncio
import sys
import os

# Ensure backend is in path
sys.path.append(os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__)))))

from shad_csa.core.control_loop import ControlLoop
from shad_csa.nodes.execution_node import ExecutionNode

async def mock_provider_gemini(payload):
    await asyncio.sleep(0.5)
    return f"Response from Gemini for: {payload.get('text')}"

async def mock_provider_groq(payload):
    await asyncio.sleep(0.2)
    return f"Response from Groq for: {payload.get('text')}"

async def run_bootstrap_test():
    print("=== SHAD-CSA v2.0 Bootstrap Test ===")
    
    # Initialize nodes
    nodes = [
        ExecutionNode("GeminiNode", mock_provider_gemini),
        ExecutionNode("GroqNode", mock_provider_groq)
    ]
    
    # Initialize loop
    loop = ControlLoop(nodes)
    
    # Run a few cycles to populate telemetry
    for i in range(3):
        print(f"\nCycle {i+1}:")
        result = await loop.run_cycle({"text": f"Hello MIA {i}"})
        print(f"Result: {result}")
        
    # Check system state
    state = loop.state_engine.snapshot()
    print(f"\nFinal System State: {state}")
    
    return True

if __name__ == "__main__":
    asyncio.run(run_bootstrap_test())
