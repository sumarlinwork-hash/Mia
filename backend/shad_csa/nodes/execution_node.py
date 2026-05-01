import time
import asyncio

class ExecutionNode:
    """
    SHAD-CSA Execution Node.
    A stateless worker that interacts with LLM providers or Tools.
    """
    def __init__(self, name: str, provider_fn):
        self.name = name
        self.provider_fn = provider_fn # Async function that calls the API
        self.trust_score = 1.0

    async def execute(self, request_payload: dict):
        """
        Executes a request with isolated timing and error handling.
        """
        start_time = time.time()
        
        try:
            # Execute the provider function (Expected to be a coroutine)
            result_payload = await self.provider_fn(request_payload)
            latency_ms = int((time.time() - start_time) * 1000)

            return {
                "node": self.name,
                "success": True,
                "payload": result_payload,
                "latency_ms": latency_ms,
                "timestamp": time.time()
            }

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
