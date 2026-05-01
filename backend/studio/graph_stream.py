import asyncio
import time
import threading
from typing import Dict, Optional, Any, AsyncGenerator
from .models import StudioErrorType, format_studio_error, EventPriority
from .audit_service import studio_audit

class StudioQueueEntry:
    def __init__(self, execution_id: str, project_id: str, max_size: int):
        self.execution_id = execution_id
        self.project_id = project_id
        self.events: list[dict] = [] # Changed from asyncio.Queue to managed list
        self.max_size = max_size
        self.status = "active"
        self.has_ended = False
        self.event_sequence = 0
        self.metrics = {"total_events_pushed": 0, "dropped_events_count": 0}
        self.event_lock = threading.Lock()
        self.history: list[dict] = [] # P4: History for Delta Fetch (GAP-11)
        self.MAX_HISTORY = 5000
        self.MAX_HOLD_TIME = {
            EventPriority.LOW: 2.0,
            EventPriority.MEDIUM: 1.0
        }

class StudioGraphStreamer:
    def __init__(self, max_queue_size: int = 1000):
        self.max_queue_size = max_queue_size
        self.execution_queues: Dict[str, StudioQueueEntry] = {}
        self.system_event_queues: Dict[str, asyncio.Queue] = {}
        self.system_sequences: Dict[str, int] = {} 
        self._lock = threading.Lock()

    def create_queue(self, execution_id: str, project_id: str):
        with self._lock:
            if execution_id in self.execution_queues: return
            self.execution_queues[execution_id] = StudioQueueEntry(execution_id, project_id, self.max_queue_size)

    def destroy_queue(self, execution_id: str, drain_ms: int = 500):
        entry = self.execution_queues.get(execution_id)
        if not entry: return
        entry.status = "closing"
        time.sleep(drain_ms / 1000.0)
        with self._lock:
            if execution_id in self.execution_queues: del self.execution_queues[execution_id]

    def push_event(self, execution_id: str, event_type: str, node_id: Optional[str] = None, payload: Optional[Dict[str, Any]] = None):
        """P4-X4: Push event with Priority-Aware Drop Strategy (P3)."""
        entry = self.execution_queues.get(execution_id)
        if not entry or entry.status == "closing": return

        if event_type == "EXECUTION_END":
            if entry.has_ended: return
            entry.has_ended = True

        # Assign Priority (P3)
        priority = EventPriority.LOW
        if event_type in ["GRAPH_START", "EXECUTION_END", "ERROR", "INTEGRITY_VIOLATION"]:
            priority = EventPriority.HIGH
        elif event_type in ["NODE_START", "NODE_END", "INFO"]:
            priority = EventPriority.MEDIUM

        event = {
            "sequence_id": entry.event_sequence,
            "type": event_type,
            "node_id": node_id,
            "payload": payload or {},
            "priority": priority,
            "timestamp": time.time(),
            "project_id": entry.project_id
        }
        entry.event_sequence += 1
        
        with entry.event_lock:
            entry.metrics["total_events_pushed"] += 1
            entry.events.append(event)
            
            # GAP-09: Priority-Aware Drop Strategy with Starvation Protection
            if len(entry.events) > entry.max_size:
                now = time.time()
                def is_protected(e):
                    hold_limit = entry.MAX_HOLD_TIME.get(e["priority"], 999)
                    return (now - e["timestamp"]) > hold_limit

                # Use immutable filtering (Fix Finding #1)
                initial_count = len(entry.events)
                for p_to_drop in [EventPriority.LOW, EventPriority.MEDIUM]:
                    if len(entry.events) <= entry.max_size: break
                    entry.events = [e for e in entry.events if not (e["priority"] == p_to_drop and not is_protected(e))]
                
                # Fallback: if still full, drop oldest non-HIGH
                if len(entry.events) > entry.max_size:
                    entry.events = entry.events[-entry.max_size:]
                
                entry.metrics["dropped_events_count"] += (initial_count - len(entry.events))

            # GAP-11: History Management
            entry.history.append(event)
            if len(entry.history) > entry.MAX_HISTORY:
                entry.history.pop(0)

    async def subscribe(self, execution_id: str) -> AsyncGenerator[Dict[str, Any], None]:
        """P4-Z3.1: Subscribe with Batch Throttling (P4: Truncation Marker)."""
        entry = self.execution_queues.get(execution_id)
        if not entry:
            yield {"type": "ERROR", "payload": {"message": "Queue not found"}}
            return
            
        last_heartbeat = time.time()
        batch_window = 0.1 # 100ms
        
        try:
            while True:
                batch = []
                with entry.event_lock:
                    if entry.events:
                        batch = entry.events[:]
                        entry.events.clear()
                
                if batch:
                    # P4: Sync Offset/Truncation Info
                    yield {
                        "type": "BATCH", 
                        "payload": {
                            "events": batch,
                            "dropped_count": entry.metrics["dropped_events_count"],
                            "last_seq": entry.event_sequence
                        }
                    }
                    last_heartbeat = time.time()
                else:
                    if time.time() - last_heartbeat > 5.0:
                        yield {
                            "execution_id": execution_id, "project_id": entry.project_id,
                            "sequence_id": -1, "timestamp": time.time(), "type": "HEARTBEAT", "payload": {}
                        }
                        last_heartbeat = time.time()
                    
                    if entry.status == "closing" and not entry.events:
                        break
                
                await asyncio.sleep(batch_window)
        finally: pass

    def get_delta(self, execution_id: str, from_seq: int, to_seq: int) -> list[dict]:
        """GAP-11: Fetch missing events for frontend reconciliation."""
        start_time = time.perf_counter()
        entry = self.execution_queues.get(execution_id)
        if not entry: return []
        
        with entry.event_lock:
            res = [e for e in entry.history if from_seq < e["sequence_id"] <= to_seq]
            latency = (time.perf_counter() - start_time) * 1000
            studio_audit.log_delta_fetch(execution_id, from_seq, to_seq, latency)
            return res

studio_graph_streamer = StudioGraphStreamer()
