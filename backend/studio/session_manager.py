import os
import uuid
from typing import Dict, List, Optional
from .execution_service import studio_execution_service
from .file_service import studio_file_service
from .models import StudioErrorType, format_studio_error

class StudioSession:
    def __init__(self, session_id: str, project_id: str):
        self.session_id = session_id
        self.project_id = project_id
        self.active_tabs: List[str] = []
        self.current_execution_id: Optional[str] = None
        self.created_at = os.times().elapsed

class StudioSessionManager:
    def __init__(self, execution_service=None, file_service=None):
        self.execution_service = execution_service or studio_execution_service
        self.file_service = file_service or studio_file_service
        self.sessions: Dict[str, StudioSession] = {}

    def init_session(self, project_id: str) -> str:
        """P4-X1: Server-Issued Session Handshake."""
        from .project_service import studio_project_service
        from .lock_service import studio_lock_service
        
        # STEP 3.2: Distributed Lock Acquisition (Distributed SSOT)
        if not studio_lock_service.acquire_project_lock(project_id):
             raise Exception(f"Project {project_id} is currently locked by another instance.")
             
        studio_project_service.verify_project(project_id)
        
        session_id = f"sess_{uuid.uuid4().hex[:12]}"
        self.sessions[session_id] = StudioSession(session_id, project_id)
        return session_id

    def verify_identity(self, project_id: str, session_id: str):
        """P4-X1: Strict Identity Triad Verification."""
        session = self.sessions.get(session_id)
        if not session:
            raise Exception(format_studio_error(StudioErrorType.SECURITY, "Invalid or expired session"))
        
        if session.project_id != project_id:
            raise Exception(format_studio_error(StudioErrorType.SECURITY, "Session/Project mismatch violation"))

    def run_studio_code(self, project_id: str, session_id: str, code: str) -> str:
        self.verify_identity(project_id, session_id)
        from .version_service import studio_version_service
        from .models import SnapshotLabel
        studio_version_service.take_snapshot(project_id, SnapshotLabel.PRE_RUN)
        execution_id = self.execution_service.run_code(project_id, code, session_id)
        self.sessions[session_id].current_execution_id = execution_id
        return execution_id

    def stop_studio_code(self, session_id: str, execution_id: str):
        if session_id in self.sessions:
            self.verify_identity(self.sessions[session_id].project_id, session_id)
        self.execution_service.kill_execution(execution_id, session_id)
        if session_id in self.sessions:
            self.sessions[session_id].current_execution_id = None

studio_session_manager = StudioSessionManager()
