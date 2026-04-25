import json
import os
from typing import Dict

class CostManager:
    def __init__(self):
        self.stats = {
            "total_cost": 0.0,
            "daily_quota": 5.0, # USD
            "is_kill_switch_active": False
        }
        self.save_path = os.path.join(os.path.dirname(__file__), "..", "data", "costs.json")
        self._load()

    def _load(self):
        if os.path.exists(self.save_path):
            with open(self.save_path, "r") as f:
                self.stats.update(json.load(f))

    def _save(self):
        os.makedirs(os.path.dirname(self.save_path), exist_ok=True)
        with open(self.save_path, "w") as f:
            json.dump(self.stats, f)

    def track_call(self, provider: str, tokens: int):
        # Mock cost calculation
        cost = (tokens / 1000) * 0.01 # Assume $0.01 per 1k tokens
        self.stats["total_cost"] += cost
        
        if self.stats["total_cost"] >= self.stats["daily_quota"]:
            print(f"[CostManager] QUOTA EXCEEDED! Activating Kill-switch.")
            self.stats["is_kill_switch_active"] = True
            
        self._save()

    def is_allowed(self) -> bool:
        return not self.stats["is_kill_switch_active"]

cost_manager = CostManager()
