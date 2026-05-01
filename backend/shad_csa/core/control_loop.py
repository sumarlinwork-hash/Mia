import asyncio
from .event_store import event_store
from .system_state import SystemState
from ..consensus.consensus_engine import ConsensusEngine

class ControlLoop:
    """
    SHAD-CSA Main Control Loop.
    The stateless coordinator that orchestrates the Sense -> Decide -> Execute -> Observe cycle.
    """
    def __init__(self, nodes: list):
        self.nodes = nodes
        self.state_engine = SystemState(event_store)
        self.consensus = ConsensusEngine()

    async def run_cycle(self, request_payload: dict):
        """
        Executes a single autonomous control cycle.
        """
        # 1. SENSE: Observe system state
        state = self.state_engine.snapshot()
        
        # 2. DECIDE: Determine execution strategy based on Mode
        active_nodes = self.nodes
        if state["mode"] == "DEGRADED":
            # In Degraded mode, we might only use the most trusted node to save resources
            active_nodes = self.nodes[:1] 
        elif state["mode"] == "ISOLATED":
            return "MIA_SYSTEM_MODE::ISOLATED_DETERMINISTIC_FALLBACK"

        # 3. EXECUTE: Parallel broadcast to Execution Nodes
        tasks = [node.execute(request_payload) for node in active_nodes]
        node_results = await asyncio.gather(*tasks)

        # 4. OBSERVE: Log telemetry to Event Store
        authority_map = {}
        for res in node_results:
            event_store.append("HEALTH", 1 if res["success"] else 0, {"node": res["node"]})
            event_store.append("LATENCY", res["latency_ms"], {"node": res["node"]})
            
            # Calculate authority for consensus
            authority_map[res["node"]] = self.state_engine.get_node_trust_score(res["node"])

        # 5. RESOLVE: Final Consensus
        final_result = self.consensus.resolve(node_results, authority_map)
        
        return final_result["payload"]
