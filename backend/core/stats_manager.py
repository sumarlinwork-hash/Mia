
import json
import os
import time
from typing import Dict, Any

STATS_FILE = os.path.join(os.path.dirname(os.path.dirname(__file__)), "provider_stats.json")

class StatsManager:
    def __init__(self):
        self.stats = self._load()

    def _load(self) -> Dict[str, Any]:
        if os.path.exists(STATS_FILE):
            try:
                with open(STATS_FILE, "r") as f:
                    return json.load(f)
            except:
                return {}
        return {}

    def save(self):
        with open(STATS_FILE, "w") as f:
            json.dump(self.stats, f, indent=4)

    def get_stats(self, provider_name: str) -> Dict[str, Any]:
        return self.stats.get(provider_name, {
            "latency": 0,
            "health_ok": 0,
            "health_fail": 0,
            "failure_count": 0,
            "last_failure_time": 0,
            "circuit_breaker_until": 0
        })

    def update_stats(self, name: str, success: bool, latency: int):
        if name not in self.stats:
            self.stats[name] = self.get_stats(name)
        
        s = self.stats[name]
        now = time.time()
        
        if success:
            s["health_ok"] += 1
            s["failure_count"] = 0
            s["circuit_breaker_until"] = 0
            # EMA for latency
            current_lat = s.get("latency", 0)
            s["latency"] = int((current_lat * 0.6) + (latency * 0.4)) if current_lat > 0 else latency
        else:
            s["health_fail"] += 1
            s["failure_count"] += 1
            s["last_failure_time"] = now
            s["latency"] = 9999
            
            if s["failure_count"] >= 3:
                s["circuit_breaker_until"] = now + 300 
                print(f"[Stats] Provider {name} DISABLED for 5 mins (Circuit Breaker)")
        
        self.save()

stats_manager = StatsManager()
