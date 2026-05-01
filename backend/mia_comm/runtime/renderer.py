from ..emotion.emotion_engine import emotion_field_engine

class EmotionRenderer:
    """
    SHAD-CSA Phase 6: Emotion Renderer (Layer C).
    Binding layer that merges core output with emotion overlays.
    """
    def render(self, core_output: str, status: str, mood: str):
        """
        Renders the final response for the user.
        Strict Rule: If status is not SUCCESS, bypass emotion entirely.
        """
        if status != "SUCCESS":
            # Layer A Strict Fallback: Deterministic Only
            return f"SYSTEM_RECOVERY_MODE_ACTIVE::[SOURCE:{status}]::{core_output}"

        # Step 1: Apply Stylistic Variation
        rendered_text = emotion_field_engine.apply_stylistic_variation(core_output, mood)
        
        # Step 2: Extract Latency Hint (for UI/Orchestrator simulation)
        latency_hint = emotion_field_engine.get_latency_hint(mood)
        
        return {
            "text": rendered_text,
            "latency_hint": latency_hint
        }

emotion_renderer = EmotionRenderer()
