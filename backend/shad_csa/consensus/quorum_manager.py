import math

class QuorumManager:
    """
    SHAD-CSA Quorum Manager (Backpressure Control).
    Selects the optimal number of ExecutionNodes based on system load factor.
    """
    
    def select(self, nodes: list, load_factor: float):
        """
        Dynamically scales the active quorum based on load.
        If load is high, we reduce the number of participating nodes to save latency.
        """
        if not nodes:
            return []

        total_nodes = len(nodes)
        
        # Inverted load scaling: High load = Low participant count
        # Formula: round(total * (1 - load))
        target_size = round(total_nodes * (1 - load_factor))
        
        # Guarantee at least 1 node and at most total nodes
        final_size = max(1, min(target_size, total_nodes))
        
        # Return the most 'trusted' nodes first (assuming nodes are pre-sorted by trust)
        return nodes[:final_size]

quorum_manager = QuorumManager()
