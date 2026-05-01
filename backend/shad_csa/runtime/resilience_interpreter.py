class ResilienceInterpreter:
    """
    SHAD-CSA Phase 6: Resilience Interpreter.
    Translates CAPSE entropy signals into operational policies.
    """
    def interpret(self, entropy_score: float):
        """
        Interprets entropy and defines mode, spawn rate, and shadow sampling.
        """
        if entropy_score > 0.8:
            return {
                "mode": "CONSERVATIVE",
                "spawn_rate": 0.2,
                "shadow_sampling": 0.1,
                "timeout_multiplier": 2.0
            }

        if entropy_score < 0.3:
            return {
                "mode": "EXPANSIVE",
                "spawn_rate": 0.7,
                "shadow_sampling": 0.4,
                "timeout_multiplier": 1.0
            }

        return {
            "mode": "BALANCED",
            "spawn_rate": 0.4,
            "shadow_sampling": 0.2,
            "timeout_multiplier": 1.5
        }
