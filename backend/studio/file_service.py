import os
import shutil
import hashlib
from typing import List, Optional, Dict, Any
from .models import StudioErrorType, format_studio_error

class StudioFileService:
    def __init__(self, project_root: str):
        self.project_root = os.path.realpath(project_root)
        self.draft_dir = os.path.join(self.project_root, "backend", "studio", "drafts")
        self.history_dir = os.path.join(self.project_root, "backend", "studio", "history")
        self.skills_dir = os.path.join(self.project_root, "backend", "skills")
        self.core_dir = os.path.join(self.project_root, "backend", "core")
        
        for d in [self.draft_dir, self.history_dir, self.skills_dir]:
            os.makedirs(d, exist_ok=True)

    def _calculate_hash(self, path: str) -> str:
        if not os.path.exists(path): return ""
        hasher = hashlib.sha256()
        with open(path, "rb") as f:
            for chunk in iter(lambda: f.read(4096), b""):
                hasher.update(chunk)
        return hasher.hexdigest()

    def _get_project_root(self, project_id: str, category: str = "drafts") -> str:
        base = self.draft_dir if category == "drafts" else self.history_dir
        path = os.path.realpath(os.path.join(base, project_id))
        os.makedirs(path, exist_ok=True)
        return path

    def _validate_path(self, project_id: str, path: str, write: bool = False) -> str:
        """
        P4-X2: Strict Path Canonicalization + Sandbox Isolation Guard.
        Blocks path traversal (../) and symbolic link escapes absolutely.
        """
        project_sandbox = self._get_project_root(project_id, "drafts")
        target_abs = os.path.abspath(os.path.join(project_sandbox, path))
        target_real = os.path.realpath(target_abs)
        
        # Verify prefix comparison for sandbox boundary
        if not target_real.startswith(project_sandbox):
            core_real = os.path.realpath(self.core_dir)
            if not write and target_real.startswith(core_real):
                return target_real
            skills_real = os.path.realpath(self.skills_dir)
            if write and target_real.startswith(skills_real):
                 return target_real
            raise ValueError(f"STUDIO_ERROR::PATH_TRAVERSAL::Access denied outside sandbox: {target_real}")
            
        return target_real

    def read_proxy(self, project_id: str, path: str, session_id: str) -> str:
        valid_path = self._validate_path(project_id, path, write=False)
        if not os.path.exists(valid_path):
            raise FileNotFoundError(f"STUDIO_ERROR::FILE_NOT_FOUND::File not found: {path}")
        with open(valid_path, "r", encoding="utf-8") as f:
            return f.read()

    def write_proxy(self, project_id: str, path: str, content: str, session_id: str, expected_hash: Optional[str] = None, expected_snapshot_id: Optional[str] = None):
        from .version_service import studio_version_service
        valid_path = self._validate_path(project_id, path, write=True)
        
        if expected_hash and os.path.exists(valid_path):
            current_hash = self._calculate_hash(valid_path)
            if current_hash != expected_hash:
                raise Exception(format_studio_error(StudioErrorType.CONFLICT, f"CONFLICT: Hash mismatch on {path}"))

        if expected_snapshot_id:
            current_snap = studio_version_service.current_snapshot_id.get(project_id)
            if current_snap != expected_snapshot_id:
                 raise Exception(format_studio_error(StudioErrorType.CONFLICT, f"CONFLICT: Project state shifted."))

        # Leverage Safe Atomic Version Service Write
        studio_version_service.write_draft_file(project_id, path, content, session_id)

    def list_files(self, project_id: str, rel_path: str = "") -> List[dict]:
        project_sandbox = self._get_project_root(project_id, "drafts")
        target_dir = self._validate_path(project_id, rel_path, write=False)
        
        if not os.path.isdir(target_dir):
            return []

        items = []
        for entry in os.scandir(target_dir):
            if entry.name.startswith(".") or entry.name.endswith(".tmp"): continue
            rel_entry_path = os.path.relpath(entry.path, project_sandbox)
            
            item = {
                "name": entry.name, 
                "path": rel_entry_path, 
                "is_dir": entry.is_dir(),
                "size": entry.stat().st_size if entry.is_file() else 0,
                "hash": None
            }
            items.append(item)
        return sorted(items, key=lambda x: (not x["is_dir"], x["name"]))

    def rename_file_proxy(self, project_id: str, old_path: str, new_path: str, session_id: str, confirmed: bool = False):
        from .version_service import studio_version_service
        # Validate both paths strictly
        self._validate_path(project_id, old_path, write=True)
        self._validate_path(project_id, new_path, write=True)
        studio_version_service.rename_draft_file(project_id, old_path, new_path, session_id, confirmed)

    def delete_file_proxy(self, project_id: str, path: str, session_id: str, confirmed: bool = False):
        from .version_service import studio_version_service
        self._validate_path(project_id, path, write=True)
        studio_version_service.delete_draft_file(project_id, path, session_id, confirmed)

studio_file_service = StudioFileService(project_root="d:/ProjectBuild/projects/mia")
