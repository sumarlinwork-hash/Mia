import os
import subprocess
import threading
import time
import uuid
import psutil
from typing import Dict, Optional
from datetime import datetime
from .models import ExecutionEntry, ExecutionStatus, StudioErrorType, format_studio_error
from .graph_stream import studio_graph_streamer

class StudioExecutionService:
    def __init__(self, log_dir: str = "backend/studio/logs"):
        self.registry: Dict[str, ExecutionEntry] = {}
        self.log_dir = log_dir
        os.makedirs(self.log_dir, exist_ok=True)
        self._lock = threading.Lock()
        self.cleanup_stale_processes()

    def cleanup_stale_processes(self):
        """P1 & P7: Kill orphan processes."""
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
        if not pid: return
        try:
            proc = psutil.Process(pid)
            proc.terminate()
            try:
                proc.wait(timeout=1)
            except psutil.TimeoutExpired:
                proc.kill()
        except psutil.NoSuchProcess: pass

    def get_active_execution_id(self, project_id: str, session_id: str) -> Optional[str]:
        """P4-A: Enforce execution limit per project/session."""
        with self._lock:
            for eid, entry in self.registry.items():
                if entry.project_id == project_id and entry.owner_session_id == session_id and entry.status == ExecutionStatus.RUNNING:
                    return eid
        return None

    def run_code(self, project_id: str, code: str, session_id: str, timeout: int = 25) -> str:
        """P4-A: Execute code in project-isolated sandbox."""
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
        studio_graph_streamer.push_event(execution_id, "GRAPH_START", payload={"project_id": project_id})

        thread = threading.Thread(target=self._execute_thread, args=(execution_id, temp_file, timeout))
        thread.daemon = True
        thread.start()

        return execution_id

    def _execute_thread(self, execution_id: str, temp_file: str, timeout: int):
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
            
            monitor_thread = threading.Thread(target=self._monitor_resource, args=(execution_id, process))
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
                entry.error_message = format_studio_error(StudioErrorType.TIMEOUT, f"Execution exceeded {timeout}s")
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
            
            studio_graph_streamer.destroy_queue(execution_id)
            if os.path.exists(temp_file):
                try: os.remove(temp_file)
                except: pass

    def _monitor_resource(self, execution_id: str, process: subprocess.Popen):
        limit_mb = 256
        while process.poll() is None:
            try:
                proc = psutil.Process(process.pid)
                if proc.memory_info().rss > limit_mb * 1024 * 1024:
                    self._hard_kill(process.pid)
                    with self._lock:
                        entry = self.registry.get(execution_id)
                        if entry:
                            entry.status = ExecutionStatus.KILLED
                            entry.error_message = format_studio_error(StudioErrorType.SECURITY, "Memory limit exceeded (256MB)")
                    break
            except (psutil.NoSuchProcess, psutil.AccessDenied): break
            time.sleep(0.2)

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
