import os
import time
import threading
import uuid
from typing import Optional

class StudioLockService:
    """STEP 3.2: Distributed Lock Manager (DLM).
    Handles lock per project_id with timeout + deadlock recovery.
    """
    def __init__(self, lock_dir: str = "backend/studio/locks"):
        self.lock_dir = os.path.abspath(lock_dir)
        os.makedirs(self.lock_dir, exist_ok=True)
        self._local_locks: dict[str, threading.Lock] = {}
        self._global_lock = threading.Lock()

    def acquire_project_lock(self, project_id: str, timeout: float = 10.0) -> bool:
        """Acquires a cross-process file lock (simulating DLM)."""
        lock_path = os.path.join(self.lock_dir, f"{project_id}.lock")
        start_time = time.time()
        
        while time.time() - start_time < timeout:
            try:
                # O_CREAT | O_EXCL is atomic on most filesystems
                fd = os.open(lock_path, os.O_CREAT | os.O_EXCL | os.O_WRONLY)
                # Write owner info for deadlock debugging
                os.write(fd, f"PID:{os.getpid()}|TIME:{time.time()}".encode())
                os.close(fd)
                return True
            except FileExistsError:
                # [3.2] Deadlock Recovery Policy: If lock is too old (> 30s), force break it
                try:
                    if os.path.exists(lock_path):
                        mtime = os.path.getmtime(lock_path)
                        if time.time() - mtime > 30.0:
                            print(f"[DLM] Deadlock recovery: breaking stale lock for {project_id}")
                            os.remove(lock_path)
                except: pass
                time.sleep(0.1)
        return False

    def release_project_lock(self, project_id: str):
        lock_path = os.path.join(self.lock_dir, f"{project_id}.lock")
        try:
            if os.path.exists(lock_path):
                os.remove(lock_path)
        except Exception as e:
            print(f"[DLM Error] Failed to release lock: {e}")

studio_lock_service = StudioLockService()
