import math
from .event_store import event_store

class SystemState:
    """
    SHAD-CSA System State Engine.
    Computes system state snapshots from the event log.
    Includes the Sigmoid Mode Spectrum logic from v2.0.
    """
    def __init__(self, store=None):
        self.store = store or event_store

    def _sigmoid(self, x):
        """Sigmoid function for continuous mode spectrum."""
        return 1 / (1 + math.exp(-10 * (x - 0.4)))

    def snapshot(self):
        """
        Generates a state snapshot based on recent telemetry.
        """
        # Query recent health events
        health_events = self.store.query("HEALTH", limit=100)
        
        if not health_events:
            health_score = 1.0 # Default to perfect health if no data
        else:
            success_count = sum([1 for e in health_events if e["value"] > 0])
            health_score = success_count / len(health_events)

        # Calculate Behavior Spectrum via Sigmoid
        behavior_gradient = self._sigmoid(health_score)

        # Deterministic Mode Mapping for Bootstrap Phase
        if health_score < 0.2:
            mode = "ISOLATED"
        elif health_score < 0.5:
            mode = "RECOVERY"
        else:
            mode = "NORMAL"

        return {
            "health_score": health_score,
            "behavior_gradient": behavior_gradient,
            "mode": mode,
            "event_count": len(health_events)
        }

    def get_node_trust_score(self, node_id):
        """Calculate trust score for a specific node based on its history."""
        node_events = self.store.query(f"NODE_HEALTH_{node_id}", limit=50)
        if not node_events:
            return 1.0
        
        successes = sum([1 for e in node_events if e["value"] > 0])
        return successes / len(node_events)
