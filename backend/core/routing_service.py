import math
from typing import Dict, List, Tuple
from config import ProviderConfig, load_config

class RoutingService:
    def __init__(self):
        # Weights for scoring (can be made configurable later)
        self.weights = {
            "availability": 0.3,
            "latency": 0.2,
            "cost": 0.2,
            "reliability": 0.2,
            "preference": 0.1
        }

    def calculate_score(self, name: str, p: ProviderConfig) -> float:
        """
        Score calculation (0 to 1, higher is better).
        """
        # 1. Availability (inverse of fail rate)
        total_calls = p.health_ok + p.health_fail
        fail_rate = p.health_fail / max(total_calls, 1)
        availability = 1.0 - fail_rate

        # 2. Latency (normalized, assume 5000ms is 'bad')
        # We use a log scale or simple linear mapping
        latency_score = max(0, 1.0 - (p.latency / 5000))

        # 3. Cost (Mocked for now based on cost_label)
        cost_map = {"GRATIS": 1.0, "PAID": 0.5, "PREMIUM": 0.2}
        cost_val = 1.0
        for label, val in cost_map.items():
            if label in p.cost_label.upper():
                cost_val = val
                break
        
        # 4. Reliability (EMA of success/fail, simplified here)
        reliability = availability # For now same as availability

        # 5. User Preference
        preference = 1.0 if p.is_default else 0.5

        # Weighted Sum
        score = (
            self.weights["availability"] * availability +
            self.weights["latency"] * latency_score +
            self.weights["cost"] * cost_val +
            self.weights["reliability"] * reliability +
            self.weights["preference"] * preference
        )
        
        return score

    async def select_best_provider(self, purpose: str = "llm") -> Tuple[str, ProviderConfig]:
        config = load_config()
        all_active = {name: p for name, p in config.providers.items() if p.is_active}
        
        # Filter by purpose
        filtered = {name: p for name, p in all_active.items() if purpose.lower() in p.purpose.lower()}
        if not filtered:
            filtered = {name: p for name, p in all_active.items() if "llm" in p.purpose.lower()}
        if not filtered:
            filtered = all_active
            
        if not filtered:
            raise Exception("No active AI providers found.")

        # Calculate scores and sort
        scored_providers = []
        for name, p in filtered.items():
            score = self.calculate_score(name, p)
            scored_providers.append((name, p, score))
            
        # Sort by score descending
        scored_providers.sort(key=lambda x: x[2], reverse=True)
        
        best_name, best_p, best_score = scored_providers[0]
        print(f"[Routing] Best provider: {best_name} (Score: {best_score:.2f})")
        
        return best_name, best_p

routing_service = RoutingService()
