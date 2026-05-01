class ConsensusEngine:
    """
    SHAD-CSA Consensus Engine.
    Arbitrates decisions between multiple execution nodes.
    In Bootstrap phase, it uses a Confidence-Weighted selection.
    """
    
    @staticmethod
    def resolve(node_results: list, authority_map: dict = None):
        """
        Resolves multiple node results into a single stable output.
        """
        valid_results = [r for r in node_results if r["success"]]
        
        if not valid_results:
            return {
                "success": False,
                "payload": "MIA_SYSTEM_ERROR::TOTAL_EXECUTION_FAILURE",
                "source": "consensus_engine"
            }

        # 1. Simple Case: Only one result
        if len(valid_results) == 1:
            return valid_results[0]

        # 2. Advanced Case: Confidence-Weighted Selection (Bootstrap Version)
        # We prioritize nodes with lower latency and higher authority (if provided)
        scored_results = []
        for res in valid_results:
            node_name = res["node"]
            authority = authority_map.get(node_name, 1.0) if authority_map else 1.0
            
            # Score formula: Authority / (Latency/1000 + 1)
            # Higher is better
            score = authority / ((res["latency_ms"] / 1000) + 1)
            scored_results.append((score, res))

        # Sort by score descending
        scored_results.sort(key=lambda x: x[0], reverse=True)
        
        # Best stable signal wins
        return scored_results[0][1]
