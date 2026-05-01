import ast
import os
import threading
from typing import List, Dict, Set, Optional

class StudioDependencyService:
    def __init__(self, draft_dir: str = "backend/studio/drafts"):
        self.draft_dir = os.path.abspath(draft_dir)
        self._forward_graph: Dict[str, Set[str]] = {} 
        self._reverse_graph: Dict[str, Set[str]] = {} 
        self._uncertain_map: Dict[str, Set[str]] = {} # target -> dependent (uncertain)
        self._graph_version: str = "GENESIS"
        self._lock = threading.Lock()

    def rebuild_graph(self):
        with self._lock:
            new_forward = {}
            new_reverse = {}
            new_uncertain = {}
            
            if not os.path.exists(self.draft_dir):
                return

            for root, _, files in os.walk(self.draft_dir):
                for file in files:
                    if file.endswith(".py"):
                        full_path = os.path.abspath(os.path.join(root, file))
                        rel_path = os.path.relpath(full_path, self.draft_dir).replace("\\", "/")
                        
                        deps, uncertain_deps = self._scan_file_dependencies(full_path)
                        new_forward[rel_path] = deps
                        
                        for dep in deps:
                            if dep not in new_reverse: new_reverse[dep] = set()
                            new_reverse[dep].add(rel_path)
                            
                        for un_dep in uncertain_deps:
                            if un_dep not in new_uncertain: new_uncertain[un_dep] = set()
                            new_uncertain[un_dep].add(rel_path)
            
            self._forward_graph = new_forward
            self._reverse_graph = new_reverse
            self._uncertain_map = new_uncertain
            
            # GAP-10: Update Graph Version
            import hashlib
            raw_struct = str(sorted(new_forward.items()))
            self._graph_version = hashlib.sha256(raw_struct.encode()).hexdigest()
            
            print(f"[DependencyService] Graph rebuilt: {len(new_forward)} nodes. Version: {self._graph_version[:8]}")

    def _resolve_to_path(self, module_name: Optional[str], current_file_path: str, level: int) -> Optional[str]:
        base_dir = os.path.dirname(current_file_path)
        if level > 0:
            target_dir = base_dir
            for _ in range(level - 1):
                target_dir = os.path.dirname(target_dir)
            base_dir = target_dir
        else:
            base_dir = self.draft_dir

        if not module_name: 
            rel_base = os.path.relpath(base_dir, self.draft_dir).replace("\\", "/")
            if rel_base == ".": return None
            return rel_base + "/__init__.py" if os.path.exists(os.path.join(base_dir, "__init__.py")) else None
        
        path_parts = module_name.split('.')
        potential_base = os.path.join(base_dir, *path_parts)
        candidates = [potential_base + ".py", os.path.join(potential_base, "__init__.py")]
        
        for cand in candidates:
            if os.path.exists(cand):
                return os.path.relpath(cand, self.draft_dir).replace("\\", "/")
        return None

    def _scan_file_dependencies(self, file_path: str):
        try:
            with open(file_path, "r", encoding="utf-8") as f:
                tree = ast.parse(f.read())
        except Exception:
            return set(), set()

        resolved_paths = set()
        uncertain_paths = set()
        for node in ast.walk(tree):
            if isinstance(node, ast.Import):
                for name in node.names:
                    path = self._resolve_to_path(name.name, file_path, 0)
                    if path: resolved_paths.add(path)
            elif isinstance(node, ast.ImportFrom):
                # FIX P2.5: Detect Star Import
                if any(n.name == '*' for n in node.names):
                    path = self._resolve_to_path(node.module, file_path, node.level)
                    if path: uncertain_paths.add(path)
                
                path = self._resolve_to_path(node.module, file_path, node.level)
                if path: resolved_paths.add(path)
                if node.module:
                    for name in node.names:
                        full_mod = f"{node.module}.{name.name}"
                        path = self._resolve_to_path(full_mod, file_path, node.level)
                        if path: resolved_paths.add(path)
        return resolved_paths, uncertain_paths

    def analyze_impact(self, target_rel_path: str) -> Dict:
        target_rel_path = target_rel_path.replace("\\", "/")
        from .project_service import studio_project_service
        try:
            metadata = studio_project_service.get_project_metadata("default_project")
            if target_rel_path == metadata.entry_point.replace("\\", "/"):
                return {"severity": "CRITICAL", "impacted_files": [], "reason": "ENTRY POINT PROTECTION"}
        except Exception: pass

        direct = sorted(list(self._reverse_graph.get(target_rel_path, [])))
        uncertain = sorted(list(self._uncertain_map.get(target_rel_path, [])))
        
        visited = {target_rel_path}
        queue = list(direct)
        transitive = []
        while queue:
            curr = queue.pop(0)
            if curr not in visited:
                visited.add(curr)
                if curr not in direct: transitive.append(curr)
                queue.extend(self._reverse_graph.get(curr, []))

        if direct:
            return {
                "severity": "HIGH", 
                "impacted_files": sorted(list(set(direct + transitive + uncertain))), 
                "reason": f"Directly imported by {len(direct)} files. Structural impact is HIGH."
            }
        
        if uncertain:
            return {
                "severity": "MEDIUM",
                "impacted_files": uncertain,
                "reason": "UNCERTAIN: Target is part of a wildcard (*) or dynamic import. Manual check required."
            }

        if transitive:
            return {
                "severity": "MEDIUM", 
                "impacted_files": sorted(transitive), 
                "reason": f"Indirectly affects {len(transitive)} files via dependency chain."
            }
        
        return {"severity": "LOW", "impacted_files": [], "reason": "No dependencies detected."}

    def get_graph_version(self) -> str:
        """GAP-10: Stable identifier for the graph structure."""
        return self._graph_version

    def get_execution_fingerprint(self, project_id: str) -> str:
        """GAP-10: Unique fingerprint of current project execution state."""
        import hashlib
        h = hashlib.sha256()
        h.update(self._graph_version.encode())
        # Add a placeholder for project-specific config or state if needed
        h.update(project_id.encode())
        return h.hexdigest()

studio_dependency_service = StudioDependencyService()
