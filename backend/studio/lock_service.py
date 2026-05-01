import time
import threading
from typing import Dict, Any, Optional

class StudioLockService:
    """STEP 3.2: Lease-Based Distributed Lock Manager (DLM).
    A lock is a time-bound lease with ownership and heartbeat renewal.
    """
    def __init__(self, ttl: int = 30):
        self.locks: Dict[str, Dict[str, Any]] = {}
        self.ttl = ttl
        self._lock = threading.Lock()
        self._start_reaper()

    def acquire_project_lock(self, project_id: str, session_id: str) -> bool:
        """Acquires a lease lock for a project."""
        with self._lock:
            now = time.time()
            lock = self.locks.get(project_id)

            # CASE 1: No lock exists
            if not lock:
                self.locks[project_id] = self._create_lock(project_id, session_id)
                return True

            # CASE 2: Lock expired -> auto-reclaim allowed
            if now > lock["expires_at"]:
                print(f"[DLM] Reclaiming expired lock for {project_id}")
                self.locks[project_id] = self._create_lock(project_id, session_id)
                return True

            # CASE 3: Same owner -> renew lease
            if lock["owner_id"] == session_id:
                lock["expires_at"] = now + self.ttl
                lock["last_heartbeat"] = now
                return True

            # CASE 4: Active lock owned by someone else
            return False

    def heartbeat(self, project_id: str, session_id: str) -> bool:
        """Extends the lease if the requester is the owner."""
        with self._lock:
            now = time.time()
            lock = self.locks.get(project_id)

            if not lock or lock["owner_id"] != session_id:
                return False

            if now > lock["expires_at"]:
                return False

            lock["expires_at"] = now + self.ttl
            lock["last_heartbeat"] = now
            return True

    def release_project_lock(self, project_id: str, session_id: str):
        """Releases the lock if owned by the session."""
        with self._lock:
            lock = self.locks.get(project_id)
            if lock and lock["owner_id"] == session_id:
                del self.locks[project_id]
                return True
            return False

    def _create_lock(self, project_id: str, session_id: str) -> Dict[str, Any]:
        now = time.time()
        return {
            "resource_id": project_id,
            "owner_id": session_id,
            "issued_at": now,
            "expires_at": now + self.ttl,
            "last_heartbeat": now
        }

    def _start_reaper(self):
        """Background thread to clean up dead locks."""
        def reaper_loop():
            while True:
                time.sleep(10)
                with self._lock:
                    now = time.time()
                    to_delete = [rid for rid, l in self.locks.items() if now > l["expires_at"]]
                    for rid in to_delete:
                        print(f"[DLM] Reaper: Removing stale lock for {rid}")
                        del self.locks[rid]
        
        threading.Thread(target=reaper_loop, daemon=True).start()

studio_lock_service = StudioLockService()
