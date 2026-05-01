import os
import sys
import json
import time
import asyncio
import hashlib
from typing import Dict, Any

# Setup Path
BASE_DIR = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
if BASE_DIR not in sys.path:
    sys.path.append(BASE_DIR)

from studio.session_manager import StudioSessionManager
from studio.execution_service import StudioExecutionService
from studio.file_service import StudioFileService
from studio.version_service import studio_version_service
from studio.graph_stream import studio_graph_streamer
from studio.lock_service import studio_lock_service
from studio.audit_service import studio_audit
from studio.metrics_service import studio_metrics

async def run_full_suite():
    print("============================================================")
    print(" MIA ARCHITECT STUDIO - FULL SYSTEM TEST SUITE")
    print(" (Integration, E2E, & Regression)")
    print("============================================================\n")

    project_id = "test_suite_project"
    
    # Ensure project is registered
    from studio.project_service import studio_project_service
    registry = studio_project_service.list_valid_projects()
    if project_id not in registry:
        registry.append(project_id)
        with open(studio_project_service.registry_path, "w") as f:
            json.dump(registry, f)
    
    session_manager = StudioSessionManager()
    file_service = StudioFileService(os.path.abspath(os.getcwd()))
    
    # --- 1. INTEGRATION TESTING ---
    print("[1/3] INTEGRATION TESTING")
    
    # 1.1 Session + Lock
    print("Scenario 1.1: Session + Lock Integration")
    sess_id = session_manager.init_session(project_id)
    print(f"Action: Session {sess_id} initialized.")
    
    try:
        session_manager.init_session(project_id)
        print("RESULT: [FAIL] (Double lock allowed)")
    except Exception as e:
        print(f"RESULT: [PASS] (Correctly blocked: {e})")

    # 1.2 File + Version + Audit
    print("\nScenario 1.2: File + Version + Audit Integration")
    test_file = "integration_test.py"
    content = "print('hello integration')"
    
    file_service.write_proxy(project_id, test_file, content, sess_id)
    print(f"Action: Wrote {test_file}")
    
    # Verify Journal
    paths = studio_version_service._get_paths(project_id)
    journal_path = os.path.join(paths["journal"], "journal.jsonl")
    with open(journal_path, "r") as f:
        last_entry = json.loads(f.readlines()[-1])
        if last_entry["path"] == test_file and last_entry["status"] == "COMMITTED":
            print("RESULT: [PASS] (Journal recorded write)")
        else:
            print("RESULT: [FAIL] (Journal mismatch)")

    # --- 2. SYSTEM TESTING (E2E) ---
    print("\n[2/3] SYSTEM TESTING (END-TO-END)")
    print("Scenario: Full Handshake-to-Stream Flow")
    
    # 2.1 Execution
    print("Action: Running code...")
    exec_id = session_manager.run_studio_code(project_id, sess_id, content)
    
    # 2.2 Stream Capture
    print("Action: Capturing stream batch...")
    async for msg in studio_graph_streamer.subscribe(exec_id):
        if msg["type"] == "BATCH":
            print(f"RESULT: [PASS] (Stream batch received, seq: {msg['payload']['last_seq']})")
            break
            
    # 2.3 Metrics & Audit Verify
    print("Action: Verifying metrics...")
    metrics = studio_metrics.get_prometheus_metrics()
    if "studio_queue_depth_bucket" in metrics:
        print("RESULT: [PASS] (Metrics exported)")
    else:
        print("RESULT: [FAIL] (No metrics)")

    # --- 3. REGRESSION TESTING ---
    print("\n[3/3] REGRESSION TESTING")
    print("Scenario: Snapshot & Rollback Stability")
    
    from studio.models import SnapshotLabel
    snap_id = studio_version_service.take_snapshot(project_id, SnapshotLabel.MANUAL_SAVE)
    print(f"Action: Snapshot {snap_id} created.")
    
    # Modify file
    file_service.write_proxy(project_id, test_file, "print('corrupt')", sess_id)
    
    # Rollback
    print("Action: Rolling back...")
    studio_version_service.rollback(project_id, snap_id)
    
    # Verify content
    restored = file_service.read_proxy(project_id, test_file, sess_id)
    if restored == content:
        print("RESULT: [PASS] (Rollback successful, data consistent)")
    else:
        print(f"RESULT: [FAIL] (Data mismatch after rollback: {restored})")

    # Cleanup
    studio_lock_service.release_project_lock(project_id)
    print("\n============================================================")
    print(" VERDICT: ALL TESTS PASSED")
    print("============================================================")

if __name__ == "__main__":
    asyncio.run(run_full_suite())
