import time

class EconomicControlField:
    """
    SHAD-CSA Phase 6: Economic Control Field.
    Introduces resource scarcity and budget-bound evolution.
    """
    def __init__(self, compute_budget=1000, node_budget=10, chaos_budget=100):
        self.compute_budget = compute_budget
        self.node_budget = node_budget
        self.chaos_budget = chaos_budget
        self.history = []

    def allocate(self, request_type: str, cost: float) -> bool:
        """
        Attempts to allocate budget for a specific action.
        Types: 'compute', 'node', 'chaos'
        """
        current_budget = getattr(self, f"{request_type}_budget", 0)
        
        if current_budget >= cost:
            setattr(self, f"{request_type}_budget", current_budget - cost)
            self.history.append({
                "type": request_type,
                "cost": cost,
                "remaining": current_budget - cost,
                "timestamp": time.time()
            })
            return True
        
        return False

    def refund(self, request_type: str, amount: float):
        """Partial refund for retired resources."""
        current = getattr(self, f"{request_type}_budget", 0)
        setattr(self, f"{request_type}_budget", current + amount)

    def get_status(self):
        return {
            "compute": self.compute_budget,
            "node": self.node_budget,
            "chaos": self.chaos_budget
        }
