import asyncio
import uuid
from typing import Dict, Optional, Any
from pydantic import BaseModel

class ProcessStatus(BaseModel):
    id: str
    name: str
    status: str # 'running', 'paused', 'completed', 'failed'
    start_time: float
    metadata: Dict[str, Any] = {}

class ProcessManager:
    def __init__(self):
        self.processes: Dict[str, ProcessStatus] = {}

    def create_process(self, name: str, metadata: Dict[str, Any] = {}) -> str:
        pid = str(uuid.uuid4())[:8]
        import time
        self.processes[pid] = ProcessStatus(
            id=pid,
            name=name,
            status='running',
            start_time=time.time(),
            metadata=metadata
        )
        print(f"[ProcessManager] Created process {pid} ({name})")
        return pid

    def update_status(self, pid: str, status: str):
        if pid in self.processes:
            self.processes[pid].status = status

    def get_process(self, pid: str) -> Optional[ProcessStatus]:
        return self.processes.get(pid)

    def list_processes(self) -> Dict[str, ProcessStatus]:
        return self.processes

process_manager = ProcessManager()
