import math
import time
from typing import Dict, List, Tuple
from config import ProviderConfig, load_config

class RoutingService:
    def __init__(self):
        # Production-grade weights
        self.weights = {
            "success_rate": 0.4,
            "latency": 0.2,
            "cost": 0.2,
            "purpose_match": 0.2
        }

    def calculate_score(self, name: str, p: ProviderConfig, target_purpose: str = "llm") -> float:
        """
        Production scoring: (success_rate * 0.4) + (latency * 0.2) + (cost * 0.2) + (purpose * 0.2)
        """
        # 1. Success Rate
        total_calls = p.health_ok + p.health_fail
        success_rate = p.health_ok / max(total_calls, 1)

        # 2. Latency (normalized, assume 5000ms is 'bad')
        latency_score = max(0, 1.0 - (p.latency / 5000))

        # 3. Cost
        cost_map = {"GRATIS": 1.0, "PAID": 0.5, "PREMIUM": 0.2}
        cost_val = 1.0
        for label, val in cost_map.items():
            if label in p.cost_label.upper():
                cost_val = val
                break
        
        # 4. Purpose Match (Contract 6.2: Intimacy Hard-Priority)
        if target_purpose.lower() == "intimacy":
            purpose_match = 10.0 if "intimacy" in p.purpose.lower() else 0.1
        else:
            purpose_match = 1.0 if target_purpose.lower() in p.purpose.lower() else 0.5

        # Weighted Sum
        score = (
            self.weights["success_rate"] * success_rate +
            self.weights["latency"] * latency_score +
            self.weights["cost"] * cost_val +
            self.weights["purpose_match"] * purpose_match
        )
        
        # --- PENALTIES & CIRCUIT BREAKER ---
        now = time.time()
        if p.circuit_breaker_until > now:
            score *= 0.01 # Severe penalty for cooldown
        elif p.failure_count > 0:
            # Scale penalty by failure count (0.9^N)
            score *= (0.8 ** p.failure_count)

        return score

    async def select_best_provider(self, purpose: str = "llm", exclude: List[str] = None) -> Tuple[str, ProviderConfig]:
        """
        Selects the best provider based on scoring, skipping excluded and circuit-broken ones.
        """
        from core.stats_manager import stats_manager
        config = load_config()
        now = time.time()
        exclude_list = exclude or []
        
        # Merge static config with volatile stats
        merged_providers = {}
        for name, p in config.providers.items():
            # Create a deep copy to avoid modifying the original config object
            p_copy = p.model_copy() if hasattr(p, 'model_copy') else p.copy()
            stats = stats_manager.get_stats(name)
            p_copy.latency = stats["latency"]
            p_copy.health_ok = stats["health_ok"]
            p_copy.health_fail = stats["health_fail"]
            p_copy.failure_count = stats["failure_count"]
            p_copy.last_failure_time = stats["last_failure_time"]
            p_copy.circuit_breaker_until = stats["circuit_breaker_until"]
            merged_providers[name] = p_copy

        # 1. Get all active providers not in the exclusion list
        all_active = {name: p for name, p in merged_providers.items() 
                      if p.is_active and name not in exclude_list}
        
        if not all_active:
            if purpose != "llm":
                # Fallback to general LLM if specific purpose (e.g. intimacy) is unreachable
                print(f"[Routing] No active providers for '{purpose}'. Falling back to 'llm'...")
                return await self.select_best_provider(purpose="llm", exclude=exclude_list)
            raise Exception("No active AI providers available.")

        # 2. Filter out circuit breaker active providers
        healthy_active = {name: p for name, p in all_active.items() if p.circuit_breaker_until < now}
        
        # If ALL active providers are in circuit breaker, we have no choice but to try one anyway
        # (preferably the one whose cooldown is closest to ending)
        candidates = healthy_active if healthy_active else all_active

        # 3. Calculate scores and sort
        scored_providers = []
        for name, p in candidates.items():
            score = self.calculate_score(name, p, purpose)
            scored_providers.append((name, p, score))
            
        scored_providers.sort(key=lambda x: x[2], reverse=True)
        
        best_name, best_p, best_score = scored_providers[0]
        print(f"[Routing] Best provider: {best_name} (Score: {best_score:.2f}) [Excluding: {exclude_list}]")
        
        return best_name, best_p

routing_service = RoutingService()
