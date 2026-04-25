from typing import List, Dict, Any

class PermissionManager:
    def __init__(self):
        # Default policy: Everything requires permission unless explicitly allowed
        self.granted_permissions: Dict[str, List[str]] = {} # PID -> List[Permissions]

    def grant(self, pid: str, permission: str):
        if pid not in self.granted_permissions:
            self.granted_permissions[pid] = []
        self.granted_permissions[pid].append(permission)

    def check(self, pid: str, required_permission: str) -> bool:
        # If no PID provided (system call), allow
        if not pid:
            return True
        
        granted = self.granted_permissions.get(pid, [])
        if required_permission in granted or "all" in granted:
            return True
            
        print(f"[PermissionManager] ACCESS DENIED: Process {pid} requested {required_permission}")
        return False

permission_manager = PermissionManager()
