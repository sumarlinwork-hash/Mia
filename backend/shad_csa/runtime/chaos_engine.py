import random
import asyncio
import time

class ChaosEngine:
    """
    SHAD-CSA v2.0 Chaos Adversarial Engine.
    Designed to prove system survivability under adversarial conditions.
    """
    
    def __init__(self, nodes, event_store):
        self.nodes = nodes
        self.store = event_store

    async def inject(self, chaos_type: str, intensity: float = 0.5):
        """
        Injects specific failure patterns into the live control field.
        """
        print(f"[CHAOS] Injecting {chaos_type} (Intensity: {intensity})", flush=True)
        
        if chaos_type == "LATENCY":
            await self._latency_spike(intensity)
        elif chaos_type == "NODE_CORRUPTION":
            self._corrupt_nodes(intensity)
        elif chaos_type == "CONSENSUS":
            self._attack_consensus(intensity)
        elif chaos_type == "EVENT_DRIFT":
            self._event_drift(intensity)
        elif chaos_type == "RESOURCE_COLLAPSE":
            self._resource_pressure(intensity)
        elif chaos_type == "CORRELATED_FAILURE":
            await self._cascade_failure(intensity)

    async def _latency_spike(self, intensity):
        """[TYPE A] Latency Chaos: Simulates jitter and queue delays."""
        for node in self.nodes:
            delay = random.uniform(0, 5 * intensity) # Up to 5s delay per node
            node.inject_latency_hook(delay)

    def _corrupt_nodes(self, intensity):
        """[TYPE B] Node Corruption: Simulates Byzantine failures / silent corruption."""
        corrupt_count = max(1, int(len(self.nodes) * intensity))
        affected_nodes = random.sample(self.nodes, corrupt_count)
        
        for node in affected_nodes:
            def malicious_output(original):
                return {
                    "node": node.name,
                    "success": True, # False success attack
                    "payload": f"BYZANTINE_CORRUPTION_{random.randint(1000, 9999)}",
                    "latency_ms": random.randint(1, 10) # Fast but wrong
                }
            node.override_output(malicious_output)

    def _attack_consensus(self, intensity):
        """[TYPE C] Consensus Adversarial: Forces disagreement clusters."""
        for node in self.nodes:
            # Inject semantic conflicts: flip the truth probability
            node.inject_conflict_mode(intensity)

    def _event_drift(self, intensity):
        """[TYPE D] Event Store Chaos: Breaks temporal ordering."""
        # Note: In our current EventStore based on deque, we simulate this by 
        # injecting out-of-order history if the store supports manipulation.
        self.store.append("CHAOS_EVENT", "TEMPORAL_DRIFT_INJECTED", {"intensity": intensity})

    def _resource_pressure(self, intensity):
        """[TYPE E] Resource Collapse: Simulates system degradation."""
        # Throttling simulate
        for node in self.nodes:
            node.throttle(intensity)

    async def _cascade_failure(self, intensity):
        """[TYPE F] Correlated Failure: Multi-node simultaneous collapse."""
        affected_count = max(1, int(len(self.nodes) * intensity))
        affected_nodes = random.sample(self.nodes, affected_count)
        
        for node in affected_nodes:
            node.fail_silently()
            
        self.store.append("CHAOS_EVENT", "CASCADE_FAILURE", {"nodes_down": affected_count})
        await asyncio.sleep(0.5)

    def reset(self):
        """Clears all chaos hooks and restores normal operation."""
        for node in self.nodes:
            node.clear_hooks()
        print("[CHAOS] System normalized. All hooks cleared.")
