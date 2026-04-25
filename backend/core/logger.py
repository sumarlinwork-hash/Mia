import logging
import json
import os
from datetime import datetime

class StructuredLogger:
    def __init__(self, name: str):
        self.logger = logging.getLogger(name)
        self.logger.setLevel(logging.INFO)
        
        # Ensure log directory exists
        log_dir = os.path.join(os.path.dirname(__file__), "..", "logs")
        os.makedirs(log_dir, exist_ok=True)
        
        # File handler (JSON format)
        file_handler = logging.FileHandler(os.path.join(log_dir, "system.log"))
        self.logger.addHandler(file_handler)

    def log(self, level: str, message: str, **kwargs):
        log_entry = {
            "timestamp": datetime.now().isoformat(),
            "level": level,
            "message": message,
            **kwargs
        }
        self.logger.info(json.dumps(log_entry))

    def info(self, message: str, **kwargs):
        self.log("INFO", message, **kwargs)

    def error(self, message: str, **kwargs):
        self.log("ERROR", message, **kwargs)

    def metric(self, name: str, value: float, unit: str = "ms", **kwargs):
        self.log("METRIC", f"Metric: {name}", metric_name=name, metric_value=value, unit=unit, **kwargs)

logger = StructuredLogger("MIA_CORE")
