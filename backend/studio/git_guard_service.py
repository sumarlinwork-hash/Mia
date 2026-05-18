import os
import subprocess
from typing import Dict, Any

class StudioGitGuard:
    def __init__(self):
        # We target the root of the project workspace
        self.project_path = os.path.realpath(os.getcwd())

    def get_git_status(self) -> Dict[str, Any]:
        """
        Passive, non-destructive status tracking.
        Returns:
            Dict containing active branch name and count of modified/untracked files.
        """
        try:
            # 1. Resolve Active Branch
            branch_cmd = ["git", "rev-parse", "--abbrev-ref", "HEAD"]
            branch_bytes = subprocess.check_output(
                branch_cmd,
                cwd=self.project_path,
                shell=False,
                stderr=subprocess.DEVNULL,
                timeout=2.0
            )
            branch_name = branch_bytes.decode("utf-8").strip()
        except Exception:
            # Fallback in case of non-git repo or missing git binary
            branch_name = "main"

        try:
            # 2. Resolve Modified Files (Porcelain output is extremely fast & standardized)
            status_cmd = ["git", "status", "--porcelain"]
            status_bytes = subprocess.check_output(
                status_cmd,
                cwd=self.project_path,
                shell=False,
                stderr=subprocess.DEVNULL,
                timeout=2.0
            )
            lines = status_bytes.decode("utf-8").splitlines()
            # Count modified, deleted, added, untracked files
            dirty_count = len([line for line in lines if line.strip()])
        except Exception:
            dirty_count = 0

        return {
            "branch": branch_name,
            "dirty_count": dirty_count
        }

studio_git_guard = StudioGitGuard()
