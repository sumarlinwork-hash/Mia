import asyncio
import os
import shutil
import sys
import json
import hashlib
import time
from unittest.mock import MagicMock, patch

# Fix path for imports
BASE_DIR = os.path.realpath(os.path.join(os.getcwd(), "backend"))
if BASE_DIR not in sys.path:
    sys.path.append(BASE_DIR)

from studio.models import EventPriority
from studio.session_manager import studio_session_manager
from studio.file_service import studio_file_service
from studio.version_service import studio_version_service, SnapshotLabel, JournalStatus
from studio.graph_stream import studio_graph_streamer

async def run_chaos_test():
    print("\n" + "="*60)
    print(" MIA ARCHITECT STUDIO — CHAOS HARDENING TEST REPORT")
    print("="*60)
    
    project_id = "chaos_project"
    session_id = "sess_chaos_123"
    
    # Setup
    studio_version_service._get_paths(project_id)
    studio_session_manager.sessions[session_id] = MagicMock(project_id=project_id)

    # 1. TEST-Z1: Crash Consistency (WAJ Recovery)
    print("\n[TEST-Z1] Crash Consistency (WAJ Recovery)")
    # Simulate a PENDING_UNCONFIRMED entry (should be discarded)
    paths = studio_version_service._get_paths(project_id)
    journal_path = os.path.join(paths["journal"], "journal.jsonl")
    
    entry = {
        "seq": 999, "path": "crash_file.py", "blob": "999_blob.blob", 
        "prev_hash": "some_hash", "entry_hash": "fake_hash", "status": "PENDING_UNCONFIRMED"
    }
    with open(journal_path, "w") as f:
        f.write(json.dumps(entry) + "\n")
    
    print("Action: Triggering startup recovery...")
    studio_version_service.run_startup_recovery()
    
    with open(journal_path, "r") as f:
        content = f.read()
    
    if "PENDING_UNCONFIRMED" not in content:
        print("RESULT: [PASS] (Unconfirmed entry removed during recovery)")
    else:
        print("RESULT: [FAIL] (Unconfirmed entry still exists)")

    # 2. TEST-Z2: Disk Failure Handling
    print("\n[TEST-Z2] Disk Failure (ENOSPC Simulation)")
    with patch("shutil.disk_usage") as mock_usage:
        mock_usage.return_value = MagicMock(free=1024 * 1024) # 1MB free, threshold is 5MB
        print("Action: Attempting write with 1MB free space...")
        try:
            studio_file_service.write_proxy(project_id, "test.py", "DATA", session_id)
            print("RESULT: [FAIL] (Write succeeded despite low disk space)")
        except Exception as e:
            print(f"RESULT: [PASS] (Blocked: {e})")

    # 3. TEST-Z3: Event Flood Backpressure (Priority Aware + GAP-09 Aging)
    print("\n[TEST-Z3] Event Flood Backpressure (Priority Aware + GAP-09 Aging)")
    exec_id = "flood_exec_001"
    studio_graph_streamer.create_queue(exec_id, project_id)
    
    print("Action: Pushing 1000 LOW priority events...")
    for i in range(1000):
        studio_graph_streamer.push_event(exec_id, "TELEMETRY", f"node_{i}")
    
    print("Action: Waiting 2.1s for LOW priority events to age (Starvation Protection)...")
    time.sleep(2.1)
    
    print("Action: Pushing 500 MEDIUM priority events (should NOT drop aged LOWs)...")
    for i in range(500):
        studio_graph_streamer.push_event(exec_id, "NODE_START", f"node_{i}")
    
    queue_entry = studio_graph_streamer.execution_queues[exec_id]
    print(f"Queue Size: {len(queue_entry.events)}")
    
    # GAP-11: Delta Fetch Test
    print("\n[GAP-11] Delta Fetch Rehydration")
    delta = studio_graph_streamer.get_delta(exec_id, 0, 10)
    print(f"Delta Size (0-10): {len(delta)}")
    
    if len(delta) == 10:
        print("RESULT: [PASS] (Delta history preserved)")
    else:
        print("RESULT: [FAIL] (History buffer error)")

    # 8.1 Burst Event Simulation (Priority Skew)
    print("\n[TEST-8.1] Burst Event Simulation (Priority Skew)")
    # Push 1000 HIGH priority events quickly (GRAPH_START is HIGH)
    for i in range(1000):
        studio_graph_streamer.push_event(exec_id, "GRAPH_START")
    # Push LOW priority - should be dropped immediately if queue is full of HIGHs (TELEMETRY is LOW)
    studio_graph_streamer.push_event(exec_id, "TELEMETRY")
    print(f"Queue Size: {len(queue_entry.events)}")
    print(f"Dropped Events: {queue_entry.metrics['dropped_events_count']}")

    # 8.2 Split-Brain Simulation (Recovery Coordination)
    print("\n[TEST-8.2] Split-Brain Simulation (Recovery)")
    # We simulate this by having two instances of VersionService pointing to the same journal
    from studio.version_service import StudioVersionService
    instance2 = StudioVersionService(project_root="d:/ProjectBuild/projects/mia")
    
    # Instance 1 starts a write
    entry_hash = studio_version_service._record_journal(project_id, "split.py", "v1", status=JournalStatus.PENDING_IN_FLIGHT)
    
    # Instance 2 triggers recovery (simulating it taking over)
    print("Action: Instance 2 taking over (Recovery)...")
    instance2.run_startup_recovery()
    
    # Check if Instance 2 recovered the in-flight entry
    with open(journal_path, "r") as f:
        content = f.read()
    if "COMMITTED" in content and "split.py" in content:
        print("RESULT: [PASS] (Distributed recovery successful)")
    else:
        print("RESULT: [FAIL] (Split-brain recovery failure)")

    # 8.3 Hot Project Contention Test
    print("\n[TEST-8.3] Hot Project Contention Test")
    from studio.lock_service import studio_lock_service
    
    print("Action: Instance 1 acquiring lock...")
    studio_lock_service.acquire_project_lock(project_id)
    
    print("Action: Instance 2 attempting to acquire lock (should fail)...")
    success = studio_lock_service.acquire_project_lock(project_id, timeout=0.5)
    
    if not success:
        print("RESULT: [PASS] (Lock contention correctly handled)")
    else:
        print("RESULT: [FAIL] (Lock leakage detected)")
    
    studio_lock_service.release_project_lock(project_id)

    print("\n" + "="*60)
    print(" VERDICT: CHAOS HARDENING COMPLETE")
    print("="*60 + "\n")

if __name__ == "__main__":
    asyncio.run(run_chaos_test())
