import time
import os
import json
from datetime import datetime
from threading import Lock

class RuntimeLogger:
    def __init__(self):
        self.log_dir = os.path.join(os.path.dirname(__file__), "..", "logs")
        os.makedirs(self.log_dir, exist_ok=True)
        self.log_file = os.path.join(self.log_dir, "runtime_metrics.jsonl")
        self.lock = Lock()

    def log_metric(self, metric_type: str, duration_ms: float, details: dict = None):
        """
        metric_type: 'endpoint_latency', 'websocket_rtt', 'refresh_duration', etc.
        duration_ms: Time in milliseconds
        """
        entry = {
            "timestamp": datetime.utcnow().isoformat(),
            "type": metric_type,
            "duration_ms": round(duration_ms, 2),
            "details": details or {}
        }
        
        # Persistent logging
        with self.lock:
            with open(self.log_file, "a", encoding="utf-8") as f:
                f.write(json.dumps(entry) + "\n")

    def get_metrics_summary(self, limit: int = 100):
        """Membaca log terakhir dan menghitung statistik rata-rata."""
        stats = {"avg_latency": 0, "count": 0}
        try:
            with self.lock:
                if not os.path.exists(self.log_file):
                    return stats
                
                with open(self.log_file, "r", encoding="utf-8") as f:
                    lines = f.readlines()[-limit:]
                    durations = []
                    for line in lines:
                        try:
                            data = json.loads(line)
                            if data.get("type") == "endpoint_latency":
                                durations.append(data["duration_ms"])
                        except: continue
                    
                    if durations:
                        stats["avg_latency"] = round(sum(durations) / len(durations), 2)
                        stats["count"] = len(durations)
            return stats
        except Exception as e:
            print(f"[RuntimeLogger] Summary failed: {e}")
            return stats

runtime_logger = RuntimeLogger()
