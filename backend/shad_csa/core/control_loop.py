import asyncio
import time
from typing import Optional, Callable
from .event_store import event_store
from .system_state import SystemState
from .field_router import field_router
from ..consensus.consensus_engine import ConsensusEngine
from ..consensus.quorum_manager import quorum_manager
from ..nodes.healing_node import predictive_healer

class ControlLoop:
    """
    SHAD-CSA v2.0 Main Control Loop (Rewired).
    Follows the strict 8-step execution order for Chaos-Stable operation.
    """
    def __init__(self, nodes: list, telemetry_cb: Optional[Callable] = None, ecf=None, interpreter=None):
        self.nodes = nodes
        self.state_engine = SystemState(event_store)
        self.field_router = field_router
        self.quorum = quorum_manager
        self.consensus = ConsensusEngine()
        self.telemetry_cb = telemetry_cb
        self.ecf = ecf
        self.interpreter = interpreter

    async def _emit_telemetry(self, event_type: str, data: dict):
        if self.telemetry_cb:
            await self.telemetry_cb({
                "type": "shad_csa_event",
                "event": event_type,
                "data": data,
                "timestamp": time.time()
            })

    async def execute(self, request_payload: dict):
        """
        The Central Event Bus: Sense -> Modulate -> Scale -> Execute -> Resolve -> Track -> Heal -> Commit
        """
        
        # 1. SENSE (Snapshot system health)
        snapshot = self.state_engine.snapshot()
        
        # 2. MODULATE (Compute Sigmoid Policy + EBARF Policy)
        policy = self.field_router.compute(snapshot["health_score"])
        
        # EBARF: Interpret CAPSE signal if available
        if self.interpreter:
            # We use stability_index as proxy for entropy (1 - stability)
            ebarf_policy = self.interpreter.interpret(1.0 - snapshot["health_score"])
            policy.update(ebarf_policy)

        # 3. ECONOMIC VALIDATION (EBARF Core)
        if self.ecf and not self.ecf.allocate("compute", cost=1.0):
            print("[ControlLoop] ECONOMIC COLLAPSE: Insufficient compute budget.")
            return "MIA_SYSTEM_ERROR::ECONOMIC_EXHAUSTION"

        # 4. SCALE (Define Quorum Scope)
        active_nodes = self.quorum.select(self.nodes, policy["load_factor"])

        # 4. EXECUTE (Parallel Broadcast with Bounded Timeout)
        # In this phase, we use the timeout from policy
        tasks = [node.execute(request_payload) for node in active_nodes]
        
        try:
            # Enforce global cycle timeout
            node_results = await asyncio.wait_for(
                asyncio.gather(*tasks),
                timeout=policy["timeout_ms"] / 1000.0
            )
        except asyncio.TimeoutError:
            print("[ControlLoop] Global Execution Timeout reached.")
            node_results = [{"node": "system", "success": False, "payload": "TIMEOUT", "latency_ms": policy["timeout_ms"]}]

        # 5. RESOLVE (Consensus Resolution)
        # Get authority map for weighted consensus
        authority_map = {n.name: self.state_engine.get_node_trust_score(n.name) for n in self.nodes}
        decision = self.consensus.resolve(node_results, authority_map)

        # 6. TRACK (Update Telemetry - Side Effect)
        for res in node_results:
            if "node" in res:
                event_store.append("HEALTH", 1 if res["success"] else 0, {"node": res["node"]})
                event_store.append("LATENCY", res["latency_ms"], {"node": res["node"]})

        # 7. HEAL (Predictive Async Hook)
        # In v2.0, we now wait for evaluation to get actionable suggestions for telemetry
        suggestions = await predictive_healer.evaluate(event_store)

        # 8. COMMIT (Commit System Truth)
        event_store.append("SYSTEM_DECISION", 1 if decision["success"] else 0, {
            "mode": snapshot["mode"],
            "policy": policy,
            "node_count": len(active_nodes)
        })

        # 9. STREAM (Real-time Visual Analytics)
        await self._emit_telemetry("CYCLE_COMPLETE", {
            "snapshot": snapshot,
            "policy": policy,
            "decision": {
                "success": decision["success"],
                "node": decision.get("node", "consensus")
            },
            "nodes": [
                {"name": r["node"], "success": r["success"], "latency": r["latency_ms"]}
                for r in node_results if "node" in r
            ],
            "suggestions": suggestions
        })

        return decision["payload"]
