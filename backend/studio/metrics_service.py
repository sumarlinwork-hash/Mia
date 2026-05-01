import time
import threading
from typing import Dict, Any
from .graph_stream import studio_graph_streamer
from .audit_service import studio_audit, AuditCategory
from .models import EventPriority

class StudioMetrics:
    def __init__(self):
        self._lock = threading.Lock()
        self._start_time = time.time()
        self._total_writes = 0
        self._pre_write_aborts = 0
        self._post_write_aborts = 0

    def record_abort(self, is_post_write: bool):
        """[2.1] Abort rate with pre/post split."""
        with self._lock:
            if is_post_write: self._post_write_aborts += 1
            else: self._pre_write_aborts += 1

    def get_prometheus_metrics(self) -> str:
        """[2.2] /metrics endpoint with time-window aggregation style (simplified)."""
        lines = []
        
        # Queue Utilization per Priority Bucket (GAP-09)
        q_stats = self._get_queue_stats()
        for priority, depth in q_stats.items():
            lines.append(f'studio_queue_depth_bucket{{priority="{priority}"}} {depth}')
        
        # Abort Rates (GAP-13)
        lines.append(f'studio_abort_count{{type="pre_write"}} {self._pre_write_aborts}')
        lines.append(f'studio_abort_count{{type="post_write"}} {self._post_write_aborts}')
        
        # Merkle Growth Trend (GAP-08)
        # In a real system, we'd query the journal service for anchor count
        # lines.append(f'studio_merkle_anchors_total {anchor_count}')
        
        return "\n".join(lines)

    def _get_queue_stats(self) -> Dict[str, int]:
        stats = {"HIGH": 0, "MEDIUM": 0, "LOW": 0}
        for q in studio_graph_streamer.execution_queues.values():
            with q.event_lock:
                for e in q.events:
                    p_name = "HIGH" if e["priority"] == EventPriority.HIGH else \
                             "MEDIUM" if e["priority"] == EventPriority.MEDIUM else "LOW"
                    stats[p_name] += 1
        return stats

studio_metrics = StudioMetrics()
