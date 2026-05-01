import time
import asyncio
import random

class ExecutionNode:
    """
    SHAD-CSA Execution Node.
    A stateless worker that interacts with LLM providers or Tools.
    """
    def __init__(self, name: str, provider_fn):
        self.name = name
        self.provider_fn = provider_fn 
        self.trust_score = 1.0
        # Chaos Hooks
        self._latency_delay = 0
        self._output_override = None
        self._conflict_mode = 0.0
        self._is_down = False
        self._throttle_intensity = 0.0

    async def execute(self, request_payload: dict):
        """
        Executes a request with isolated timing and error handling.
        """
        start_time = time.time()
        
        # [CHAOS] Latency Injection
        if self._latency_delay > 0:
            await asyncio.sleep(self._latency_delay)

        # [CHAOS] Resource Throttling (Simulated overhead)
        if self._throttle_intensity > 0:
            await asyncio.sleep(self._throttle_intensity * 2)

        # [CHAOS] Fail Silently Attack
        if self._is_down:
            return {"node": self.name, "success": False, "payload": "NODE_DOWN", "latency_ms": 10}

        try:
            # Execute the provider function
            result_payload = await self.provider_fn(request_payload)
            latency_ms = int((time.time() - start_time) * 1000)

            result = {
                "node": self.name,
                "success": True,
                "payload": result_payload,
                "latency_ms": latency_ms,
                "timestamp": time.time()
            }

            # [CHAOS] Output Override / Corruption
            if self._output_override:
                result = self._output_override(result_payload)

            # [CHAOS] Conflict Mode (Flip result randomly)
            if self._conflict_mode > 0 and random.random() < self._conflict_mode:
                result["payload"] = "CONFLICTING_SEMANTIC_OUTPUT"

            return result

        except Exception as e:
            latency_ms = int((time.time() - start_time) * 1000)
            print(f"[ExecutionNode:{self.name}] Error: {e}")
            
            return {
                "node": self.name,
                "success": False,
                "payload": str(e),
                "latency_ms": latency_ms,
                "timestamp": time.time()
            }

    # --- Chaos Hook API ---
    def inject_latency_hook(self, delay: float):
        self._latency_delay = delay

    def override_output(self, override_fn):
        self._output_override = override_fn

    def inject_conflict_mode(self, intensity: float):
        self._conflict_mode = intensity

    def fail_silently(self):
        self._is_down = True

    def throttle(self, intensity: float):
        self._throttle_intensity = intensity

    def clear_hooks(self):
        self._latency_delay = 0
        self._output_override = None
        self._conflict_mode = 0.0
        self._is_down = False
        self._throttle_intensity = 0.0
