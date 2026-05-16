import math

class FieldRouter:
    """
    SHAD-CSA Field Router (Brain Modulator).
    Translates health signals into dynamic execution policies using Sigmoid Field.
    """
    
    def _sigmoid(self, x):
        # Optimized sigmoid for health-to-intensity mapping
        # Transitions around 0.4-0.5 health
        return 1 / (1 + math.exp(-10 * (x - 0.4)))

    def compute(self, health_score: float):
        """
        Computes the operational policy based on current system health.
        """
        # Intensity 1.0 = Perfect Health, Intensity 0.0 = Total Failure
        intensity = self._sigmoid(health_score)
        
        # Sigmoid-based Dynamic Policies
        return {
            "load_factor": 1.0 - intensity, # High intensity means low load factor
            # P4-X: Increased timeout range (60s to 600s) for Local LLM support on slow hardware
            "timeout_ms": int(60000 + (1 - intensity) * 540000), 
            "parallel_execution": intensity > 0.4,
            "retry_count": int(intensity * 3),
            "use_local_heart": intensity < 0.2,
            "is_degraded": intensity < 0.5
        }

field_router = FieldRouter()
