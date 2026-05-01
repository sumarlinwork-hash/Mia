import random
import asyncio
import time
from typing import List
from shad_csa.runtime.chaos_engine import ChaosEngine
from shad_csa.core.control_loop import ControlLoop

class EnduranceEngine:
    """
    SHAD-CSA Phase 4: Long-Horizon Stability & Entropy Engine.
    Designed for 1,000,000+ cycle stress testing without resets.
    """
    def __init__(self, loop: ControlLoop, chaos: ChaosEngine):
        self.loop = loop
        self.chaos = chaos
        self.stats = {
            "total_cycles": 0,
            "valid_signals": 0,
            "silent_drifts": 0,
            "recoveries": 0,
            "start_time": time.time()
        }

    async def run_stochastic_marathon(self, cycles: int = 1000000):
        """
        Runs a non-deterministic chaos marathon.
        Failures are injected randomly in time and intensity.
        """
        print(f"[MARATHON] Starting {cycles} cycle endurance test...", flush=True)
        
        for i in range(cycles):
            self.stats["total_cycles"] += 1
            
            # Non-deterministic failure injection (P0: Stochastic)
            if random.random() < 0.25: # High frequency for 'tergahar'
                chaos_type = random.choice(["LATENCY", "NODE_CORRUPTION", "CONSENSUS", "RESOURCE_COLLAPSE"])
                intensity = random.uniform(0.1, 0.9)
                await self.chaos.inject(chaos_type, intensity)
            
            # Periodic Cascade (Simulating major events)
            if i % 1000 == 0 and i > 0:
                print(f"[MARATHON] Checkpoint {i}: Degradation analysis in progress...", flush=True)
                await self.chaos.inject("CORRELATED_FAILURE", intensity=random.uniform(0.4, 0.6))

            try:
                # Execution
                payload = {"user_message": f"Endurance Load {i}", "entropy": random.random()}
                response = await self.loop.execute(payload)
                
                # Check for Silent Drift (P1: Semantic Drift) - Case Insensitive
                if "valid" in response.lower():
                    self.stats["valid_signals"] += 1
                else:
                    # If it didn't fail but output is wrong/empty, it's a drift
                    self.stats["silent_drifts"] += 1
                
            except Exception as e:
                print(f"[CRITICAL] System Deadlock at Cycle {i}: {e}")
                break

            # Gradual Reset (Simulating natural recovery)
            if i % 50 == 0:
                self.chaos.reset()

            # Throttle slightly to allow I/O but maintain high pressure
            await asyncio.sleep(0.001)

        self._print_final_report()

    def _print_final_report(self):
        duration = time.time() - self.stats["start_time"]
        print("\n" + "="*60, flush=True)
        print("MIA-AS PHASE 4: ENDURANCE REPORT (REALITY CHECK)", flush=True)
        print("="*60, flush=True)
        print(f"Duration: {duration/3600:.2f} hours", flush=True)
        print(f"Total Cycles: {self.stats['total_cycles']}", flush=True)
        print(f"Valid Signal Rate: {(self.stats['valid_signals']/self.stats['total_cycles'])*100:.2f}%", flush=True)
        print(f"Silent Drift Count: {self.stats['silent_drifts']}", flush=True)
        print(f"Survivability Class: {self._get_class()}", flush=True)
        print("="*60 + "\n", flush=True)

    def _get_class(self):
        rate = self.stats['valid_signals']/self.stats['total_cycles']
        if rate > 0.999: return "S-TIER (Production Grade)"
        if rate > 0.95: return "A-TIER (High Resilience)"
        return "B-TIER (Research Prototype)"
