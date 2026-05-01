import asyncio
import time
import math
import random
from typing import List
from ..core.event_store import event_store

class CAPSETestHarness:
    """
    SHAD-CSA Phase 6: Test Harness.
    Continuous Adversarial Validation under live CAPSE entropy.
    """
    def __init__(self, system, capse, ecf, lifecycle):
        self.system = system
        self.capse = capse
        self.ecf = ecf
        self.lifecycle = lifecycle
        self.metrics = []
        self.violations = []
        self.start_time = time.time()
        self.last_node_count = len(lifecycle.active_nodes)
        self.node_state_history = {} # node_name -> [states]

    async def run_cycle(self, cycle_id: int):
        """Executes a single validation cycle."""
        # 1. INJECT REAL ENTROPY
        chaos_type = self.capse._sample_entropy_field()
        intensity = random.uniform(0.1, 0.9)
        await self.capse._inject(chaos_type, intensity)

        # 2. EXECUTE SYSTEM UNDER STRESS
        start_exec = time.time()
        response = await self.system.execute({"request": f"Validation Cycle {cycle_id}"})
        latency = time.time() - start_exec

        # 3. CAPTURE SNAPSHOT
        result = {
            "cycle": cycle_id,
            "success": "MIA_VALID" in str(response),
            "latency": latency,
            "node_count": len(self.lifecycle.active_nodes),
            "compute_budget": self.ecf.compute_budget,
            "node_budget": self.ecf.node_budget,
            "entropy": intensity
        }

        # 4. VALIDATE INVARIANTS
        self._validate_invariants(result)
        self._detect_drift(result)
        self._detect_oscillation()

        # 5. RECORD METRICS
        self.metrics.append(result)
        return result

    def _validate_invariants(self, result):
        """Checking for Node Explosion and Economic Collapse."""
        # 2.1 NO NODE EXPLOSION
        if result["node_count"] > 20:
            self._report_violation("NODE_BOUND_VIOLATION", f"Node count reached {result['node_count']}")

        # 2.2 ECONOMIC STABILITY
        if result["compute_budget"] < 0:
            self._report_violation("NEGATIVE_COMPUTE_BUDGET", "Compute budget exhausted below zero.")
        
        if result["node_budget"] > 20: # Overflow check
            self._report_violation("NODE_ECONOMY_OVERFLOW", f"Node budget overflow: {result['node_budget']}")

    def _detect_drift(self, result):
        """Detecting Silent Failure Drift."""
        # If system claims success but latency is impossibly low or high without explanation
        if result["success"] and result["latency"] < 0.01:
            self._report_violation("SILENT_DRIFT_SUSPECTED", "Success reported with near-zero latency (Possible Mock Bypass)")

    def _detect_oscillation(self):
        """Detecting Healing Oscillation (Flapping)."""
        for node in self.lifecycle.active_nodes:
            trust = self.system.state_engine.get_node_trust_score(node.name)
            state = "HEALTHY" if trust > 0.7 else ("QUARANTINE" if trust < 0.3 else "UNSTABLE")
            
            if node.name not in self.node_state_history:
                self.node_state_history[node.name] = []
            
            history = self.node_state_history[node.name]
            if not history or history[-1] != state:
                history.append(state)
            
            # Check for too many transitions in short window
            if len(history) > 5:
                self._report_violation("HEALING_OSCILLATION", f"Node {node.name} flipped states too many times: {history[-5:]}")

    def _report_violation(self, vtype, msg):
        print(f"[HARNESS:VIOLATION] {vtype}: {msg}")
        self.violations.append({"type": vtype, "message": msg, "time": time.time()})

    def get_survival_report(self):
        duration = time.time() - self.start_time
        success_rate = sum(1 for m in self.metrics if m["success"]) / (len(self.metrics) or 1)
        return {
            "survival_time": duration,
            "cycles_completed": len(self.metrics),
            "success_rate": success_rate,
            "violation_count": len(self.violations),
            "economic_stability_index": self.ecf.compute_budget / 500.0, # normalized
            "drift_velocity": self._calculate_drift_velocity()
        }

    def _calculate_drift_velocity(self):
        if len(self.metrics) < 10: return 0.0
        # Simple slope of success rate over last 50 cycles
        recent = self.metrics[-50:]
        rates = [1 if m["success"] else 0 for m in recent]
        return (sum(rates[-5:]) - sum(rates[:5])) / 5.0
