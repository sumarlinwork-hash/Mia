import asyncio
import random
import time
import math
from typing import List
from ..core.event_store import event_store

class CAPSEEngine:
    """
    CAPSE: Continuous Adversarial Production Simulation Engine.
    The permanent reality layer for SHAD-CSA.
    """
    def __init__(self, control_loop, nodes):
        self.loop = control_loop
        self.nodes = nodes
        self.resilience_field = {
            "stability_index": 1.0,
            "drift_velocity": 0.0,
            "consensus_entropy": 0.0,
            "healing_latency": 0.0
        }
        self.is_running = False
        self._entropy_drift = 0.0 # Field drift over time

    async def run_forever(self):
        """The CAPSE Core Loop: No Stop Condition."""
        print("[CAPSE] Adversarial Reality Layer Activated.")
        self.is_running = True
        
        while self.is_running:
            # 1. SAMPLE ENTROPY FIELD (Non-deterministic)
            # Probabilities drift naturally over time
            self._entropy_drift += random.uniform(-0.01, 0.01)
            self._entropy_drift = max(0, min(1, self._entropy_drift))
            
            chaos_type = self._sample_entropy_field()
            intensity = random.uniform(0.1, 0.9) * (1 + self._entropy_drift)
            intensity = min(1.0, intensity)

            # 2. INJECT FAILURE INTO LIVE SYSTEM
            await self._inject(chaos_type, intensity)

            # 3. OBSERVE SYSTEM RESPONSE (Without Reset)
            metrics = await self._observe()

            # 4. UPDATE RESILIENCE MODEL
            self._update_resilience_field(metrics)

            # 5. LOG DEGRADATION CURVE
            await self._log_to_telemetry()

            # Random interval between 0.1s and 2s to simulate stochasticity
            await asyncio.sleep(random.uniform(0.1, 2.0))

    def _sample_entropy_field(self):
        """Stochastic Failure Field Selection."""
        weights = [0.35, 0.22, 0.18, 0.15, 0.10] # Latency, Corruption, Partition, Reordering, Silent
        chaos_types = ["LATENCY_DRIFT", "SILENT_CORRUPTION", "PARTITION", "EVENT_DRIFT", "CONSENSUS_DECAY"]
        return random.choices(chaos_types, weights=weights)[0]

    async def _inject(self, chaos_type, intensity):
        """ChaosInjector Logic: Modifying live system state."""
        print(f"[CAPSE:INJECT] {chaos_type} (Intensity: {intensity:.2f})", flush=True)
        
        if chaos_type == "LATENCY_DRIFT":
            # Add bias to node latency hooks
            for node in self.nodes:
                node.inject_latency_hook(random.gauss(intensity * 2, 0.5))
        
        elif chaos_type == "SILENT_CORRUPTION":
            # Flip output probability
            for node in self.nodes:
                if random.random() < intensity:
                    node.inject_conflict_mode(intensity)
                    
        elif chaos_type == "PARTITION":
            # Randomly disable nodes (simulating network partition)
            isolated_count = int(len(self.nodes) * intensity * 0.5)
            for node in random.sample(self.nodes, isolated_count):
                node.fail_silently()
                
        elif chaos_type == "CONSENSUS_DECAY":
            # Decaying the threshold of the consensus engine (if applicable)
            # For now, we simulate this by decreasing node trust scores
            for node in self.nodes:
                node.trust_score -= (0.01 * intensity)
                node.trust_score = max(0.1, node.trust_score)

    async def _observe(self):
        """Continuous Observability: Measuring degradation curves."""
        # Calculate drift from event store
        recent_events = list(event_store.events)[-100:]
        if not recent_events:
            return self.resilience_field

        success_rate = sum(1 for e in recent_events if e.get("type") == "SYSTEM_DECISION" and e.get("payload") == 1) / (len([e for e in recent_events if e.get("type") == "SYSTEM_DECISION"]) or 1)
        
        return {
            "stability_index": success_rate,
            "drift_velocity": abs(self.resilience_field["stability_index"] - success_rate),
            "consensus_entropy": 1.0 - success_rate, # Simplified entropy
            "healing_latency": random.uniform(0.1, 1.0) # Placeholder for repair tracking
        }

    def _update_resilience_field(self, metrics):
        """Updating the Resilience(x, t) survival surface."""
        self.resilience_field = metrics

    async def _log_to_telemetry(self):
        """Emitting CAPSE telemetry for visual tracking."""
        event_store.append("CAPSE_RESILIENCE", self.resilience_field["stability_index"], {
            "metrics": self.resilience_field,
            "entropy_drift": self._entropy_drift
        })
