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

        # 2. Advanced Case: Semantic Clustering & Confidence-Weighted Selection
        clusters = {}
        for res in valid_results:
            payload_str = str(res["payload"])
            if payload_str not in clusters:
                clusters[payload_str] = {"score": 0.0, "nodes": [], "result": res}
            
            node_name = res["node"]
            authority = authority_map.get(node_name, 1.0) if authority_map else 1.0
            
            # Score formula: Authority / (Latency/1000 + 1)
            individual_score = authority / ((res["latency_ms"] / 1000) + 1)
            clusters[payload_str]["score"] += individual_score
            clusters[payload_str]["nodes"].append(node_name)

        # Apply Majority Multiplier (Byzantine Resilience)
        # If multiple nodes agree, the signal strength is multiplied by the number of nodes in that cluster
        for p_str in clusters:
            cluster_size = len(clusters[p_str]["nodes"])
            if cluster_size > 1:
                clusters[p_str]["score"] *= (cluster_size * 1.5)

        # Sort clusters by aggregate score descending
        final_ranking = sorted(clusters.values(), key=lambda x: x["score"], reverse=True)
        
        # Best stable signal wins
        return final_ranking[0]["result"]
