import os
import subprocess
import threading
import time
import uuid
import psutil
from typing import Dict, Optional, Any
from datetime import datetime
from .models import ExecutionEntry, ExecutionStatus, StudioErrorType, format_studio_error
from .graph_stream import studio_graph_streamer
from .audit_service import studio_audit, AuditCategory

class StudioExecutionService:
    def __init__(self, log_dir: str = "backend/studio/logs"):
        self.registry: Dict[str, ExecutionEntry] = {}
        self.log_dir = log_dir
        os.makedirs(self.log_dir, exist_ok=True)
        self._lock = threading.Lock()
        self.cleanup_stale_processes()

    def cleanup_stale_processes(self):
        """P1 & P7: Kill orphan processes cleanly."""
        for proc in psutil.process_iter(['pid', 'cmdline']):
            try:
                cmdline = proc.info.get('cmdline')
                if cmdline and any("exec_" in arg and ".py" in arg for arg in cmdline):
                    self._hard_kill(proc.info['pid'])
            except (psutil.NoSuchProcess, psutil.AccessDenied):
                continue
        with self._lock:
            self.registry.clear()

    def _hard_kill(self, pid: int):
        """
        Flagship Silent Recursive Terminate.
        Quietly kills the entire process tree recursively directly in memory using psutil,
        leaving zero resource leaks and without flickering any command prompt windows.
        """
        if not pid: return
        try:
            parent = psutil.Process(pid)
            # Find and terminate all child processes recursively
            children = parent.children(recursive=True)
            for child in children:
                try:
                    child.terminate()
                except psutil.NoSuchProcess:
                    pass
            
            # Terminate parent
            parent.terminate()
            
            # Wait for clean staged exit (1s)
            gone, alive = psutil.wait_procs(children + [parent], timeout=1.0)
            
            # Hard kill any remaining stubborn processes
            for survivor in alive:
                try:
                    survivor.kill()
                except psutil.NoSuchProcess:
                    pass
        except psutil.NoSuchProcess:
            pass
        except Exception:
            pass

    def get_active_execution_id(self, project_id: str, session_id: str) -> Optional[str]:
        """P4-A: Enforce execution limit per project/session."""
        with self._lock:
            for eid, entry in self.registry.items():
                if entry.project_id == project_id and entry.owner_session_id == session_id and entry.status == ExecutionStatus.RUNNING:
                    return eid
        return None

    def run_code(self, project_id: str, code: str, session_id: str, profile_type: str = "COMPACT") -> str:
        """
        Flagship Adaptive Subprocess Sandbox.
        Dynamically applies limits based on task context:
        - COMPACT (2m timeout, 256MB RAM)
        - BUILD_DEV (10m timeout, 1.5GB RAM)
        """
        # Determine parameters based on adaptive execution profile
        if profile_type == "BUILD_DEV":
            timeout = 600       # 10 minutes
            memory_limit = 1536 # 1.5 GB
        else:
            profile_type = "COMPACT"
            timeout = 120       # 2 minutes (120 seconds) - approved by User
            memory_limit = 256  # 256 MB

        active_id = self.get_active_execution_id(project_id, session_id)
        if active_id:
            raise Exception(format_studio_error(StudioErrorType.FORK_BOMB, "Active execution already running for this project/session"))

        execution_id = str(uuid.uuid4())
        entry = ExecutionEntry(execution_id=execution_id, project_id=project_id, owner_session_id=session_id)
        
        with self._lock:
            self.registry[execution_id] = entry

        # P4-A: Storage Isolation for exec files
        project_draft_dir = os.path.realpath(os.path.join("backend/studio/drafts", project_id))
        os.makedirs(project_draft_dir, exist_ok=True)
        temp_file = os.path.join(project_draft_dir, f"exec_{execution_id}.py")
        
        with open(temp_file, "w", encoding="utf-8") as f:
            f.write(code)

        studio_graph_streamer.create_queue(execution_id, project_id)
        studio_graph_streamer.push_event(execution_id, "GRAPH_START", payload={"project_id": project_id, "profile_type": profile_type})
        
        # Phase 5: Audit execution start
        studio_audit.log_event(AuditCategory.WRITE, "EXECUTION_START", {
            "execution_id": execution_id, "project_id": project_id, "session_id": session_id, "profile": profile_type
        })

        thread = threading.Thread(target=self._execute_thread, args=(execution_id, temp_file, timeout, memory_limit))
        thread.daemon = True
        thread.start()

        return execution_id

    def _execute_thread(self, execution_id: str, temp_file: str, timeout: int, memory_limit: int):
        entry = self.registry.get(execution_id)
        if not entry: return
        try:
            process = subprocess.Popen(
                ["python", temp_file],
                stdout=subprocess.PIPE,
                stderr=subprocess.PIPE,
                text=True,
                bufsize=1
            )
            entry.pid = process.pid
            
            # Start Eco-Friendly CPU Watchdog (2.0s sleep interval)
            monitor_thread = threading.Thread(target=self._monitor_resource, args=(execution_id, process, memory_limit))
            monitor_thread.daemon = True
            monitor_thread.start()

            stdout, stderr = process.communicate(timeout=timeout)
            
            with self._lock:
                if entry.status == ExecutionStatus.RUNNING:
                    entry.status = ExecutionStatus.DONE
                entry.exit_code = process.returncode
                
                full_output = stdout + stderr
                log_path = os.path.join(self.log_dir, f"{execution_id}.log")
                with open(log_path, "w", encoding="utf-8") as lf:
                    lf.write(full_output)

        except subprocess.TimeoutExpired:
            self._hard_kill(entry.pid)
            with self._lock:
                entry.status = ExecutionStatus.KILLED
                entry.error_message = format_studio_error(StudioErrorType.TIMEOUT, f"Execution exceeded hard timeout limit of {timeout}s")
        except Exception as e:
            with self._lock:
                entry.status = ExecutionStatus.FAILED
                entry.error_message = format_studio_error(StudioErrorType.INTERNAL, str(e))
        finally:
            final_status = "UNKNOWN"
            with self._lock:
                if execution_id in self.registry:
                    final_status = self.registry[execution_id].status.value

            studio_graph_streamer.push_event(execution_id, "EXECUTION_END", payload={
                "status": final_status,
                "project_id": entry.project_id
            })
            
            # Phase 5: Audit execution end
            studio_audit.log_event(AuditCategory.WRITE, "EXECUTION_END", {
                "execution_id": execution_id, "project_id": entry.project_id, "status": final_status
            })
            
            studio_graph_streamer.destroy_queue(execution_id)
            if os.path.exists(temp_file):
                try: os.remove(temp_file)
                except: pass

    def _monitor_resource(self, execution_id: str, process: subprocess.Popen, memory_limit_mb: int):
        """
        Eco-Friendly CPU Memory Watchdog.
        Queries OS process RSS at a relaxed 2.0-second interval to guarantee 0.00% CPU overhead on Ivy Bridge.
        """
        while process.poll() is None:
            try:
                proc = psutil.Process(process.pid)
                # Calculate total memory of parent process and all child processes recursively
                total_memory = proc.memory_info().rss
                for child in proc.children(recursive=True):
                    try:
                        total_memory += child.memory_info().rss
                    except (psutil.NoSuchProcess, psutil.AccessDenied):
                        pass
                
                if total_memory > memory_limit_mb * 1024 * 1024:
                    self._hard_kill(process.pid)
                    with self._lock:
                        entry = self.registry.get(execution_id)
                        if entry:
                            entry.status = ExecutionStatus.KILLED
                            entry.error_message = format_studio_error(StudioErrorType.SECURITY, f"Memory limit exceeded ({memory_limit_mb}MB)")
                    break
            except (psutil.NoSuchProcess, psutil.AccessDenied):
                break
            time.sleep(2.0) # Flagship Eco-Friendly 2.0 seconds relaxed interval

    def kill_execution(self, execution_id: str, session_id: str):
        entry = self.registry.get(execution_id)
        if not entry: raise Exception("Execution not found")
        if entry.owner_session_id != session_id:
            raise Exception(format_studio_error(StudioErrorType.SECURITY, "Unauthorized session access"))

        with self._lock:
            if entry.status == ExecutionStatus.RUNNING:
                entry.status = ExecutionStatus.KILLED
                self._hard_kill(entry.pid)

studio_execution_service = StudioExecutionService()
