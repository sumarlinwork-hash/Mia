import logging
import json
import os
import time
from datetime import datetime
from typing import Optional, Dict, Any
from enum import Enum

class AuditCategory(str, Enum):
    REPLAY = "REPLAY"
    DELTA = "DELTA"
    RECOVERY = "RECOVERY"
    WRITE = "WRITE"
    HARD_ABORT = "HARD_ABORT"

class StudioAuditService:
    def __init__(self, log_dir: str = "backend/studio/logs"):
        self.log_dir = os.path.abspath(log_dir)
        os.makedirs(self.log_dir, exist_ok=True)
        
        self.logger = logging.getLogger("studio_audit")
        self.logger.setLevel(logging.INFO)
        
        # File handler for structured JSON logs
        handler = logging.FileHandler(os.path.join(self.log_dir, "audit.jsonl"))
        formatter = logging.Formatter('%(message)s')
        handler.setFormatter(formatter)
        self.logger.addHandler(handler)

    def log_event(self, category: AuditCategory, event_type: str, data: Dict[str, Any]):
        """STEP 1.2: Implement structured log schema."""
        record = {
            "timestamp": datetime.utcnow().isoformat() + "Z",
            "category": category.value,
            "event_type": event_type,
            "data": data
        }
        # Mandatory fields for deterministic debugging
        if "graph_v" not in record["data"]: record["data"]["graph_v"] = "UNKNOWN"
        if "fp" not in record["data"]: record["data"]["fp"] = "UNKNOWN"
        
        self.logger.info(json.dumps(record))

    def log_replay_start(self, project_id: str, snapshot_id: str, entry_count: int, graph_v: str):
        """[1.1] replay_start logging."""
        self.log_event(AuditCategory.REPLAY, "REPLAY_START", {
            "project_id": project_id,
            "snapshot_id": snapshot_id,
            "entry_count": entry_count,
            "graph_v": graph_v
        })

    def log_replay_step(self, seq: int, latency_ms: float, success: bool, failure_reason: Optional[str] = None):
        """[1.1] replay_step logging (with failure_reason)."""
        self.log_event(AuditCategory.REPLAY, "REPLAY_STEP", {
            "seq": seq,
            "latency_ms": latency_ms,
            "success": success,
            "failure_reason": failure_reason
        })

    def log_delta_fetch(self, exec_id: str, from_seq: int, to_seq: int, latency_ms: float, cache_layer_id: str = "L1"):
        """[1.1] delta_fetch logging (with cache_layer_id)."""
        self.log_event(AuditCategory.DELTA, "DELTA_FETCH", {
            "exec_id": exec_id,
            "from": from_seq,
            "to": to_seq,
            "latency_ms": latency_ms,
            "cache_layer_id": cache_layer_id
        })

    def log_recovery(self, project_id: str, reason: str, classification: str):
        """[1.1] recovery_reason logging (extended)."""
        self.log_event(AuditCategory.RECOVERY, "RECOVERY_EVENT", {
            "project_id": project_id,
            "reason": reason,
            "classification": classification # In-flight, Unconfirmed, CORRUPTED_PARTIAL
        })

studio_audit = StudioAuditService()
