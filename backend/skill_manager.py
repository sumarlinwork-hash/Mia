import os
import ast
import subprocess
import asyncio
import json
import sys
import shutil
import importlib.util
from datetime import datetime, timedelta

SKILLS_DIR = os.path.join(os.path.dirname(__file__), "skills")
MARKETPLACE_DIR = os.path.join(os.path.dirname(__file__), "marketplace_skills")

os.makedirs(SKILLS_DIR, exist_ok=True)
os.makedirs(MARKETPLACE_DIR, exist_ok=True)

class SkillManager:
    def __init__(self):
        self.SKILLS_DIR = SKILLS_DIR
        self.MARKETPLACE_DIR = MARKETPLACE_DIR
        self.plugins = {}
        self.execution_cache = {}
        self.cache_ttl = timedelta(minutes=5)
        self._cached_metadata = {} # {directory: [skills]}
        self._folder_mtime = {}   # {directory: last_mtime}

    def scan_skills(self, directory=None, categories=None):
        """Scan a directory and load plugin modules or extract legacy metadata."""
        if directory is None:
            directory = self.SKILLS_DIR
            
        if not os.path.exists(directory):
            return []

        # Optimization: Check mtime of the folder
        try:
            current_mtime = os.path.getmtime(directory)
            if directory in self._folder_mtime and self._folder_mtime[directory] == current_mtime:
                return self._cached_metadata.get(directory, [])
        except:
            current_mtime = None

        skills = []
        for entry in os.listdir(directory):
            full_path = os.path.join(directory, entry)
            
            # Support both .py files and directories with __init__.py
            skill_id = None
            if os.path.isfile(full_path) and entry.endswith(".py") and not entry.startswith("__"):
                skill_id = entry.replace(".py", "")
            elif os.path.isdir(full_path) and os.path.exists(os.path.join(full_path, "__init__.py")):
                skill_id = entry
            
            if skill_id:
                metadata = self._load_skill(skill_id, full_path)
                if categories and metadata.get("category") not in categories:
                    continue
                # Check if installed (if we are scanning marketplace)
                if directory == self.MARKETPLACE_DIR:
                    metadata["is_installed"] = self.is_installed(skill_id)
                skills.append(metadata)
        
        # Update cache
        if current_mtime is not None:
            self._cached_metadata[directory] = skills
            self._folder_mtime[directory] = current_mtime
        return skills

    def is_installed(self, skill_id):
        return os.path.exists(os.path.join(self.SKILLS_DIR, f"{skill_id}.py")) or \
               os.path.exists(os.path.join(self.SKILLS_DIR, skill_id))

    def _load_skill(self, skill_id, path):
        """Try to load as a dynamic module, fallback to legacy metadata extraction."""
        try:
            # Check for modern class-based Skill plugin
            module_name = f"skills_temp.{skill_id}" # Use temp name to avoid conflicts during scan
            spec = importlib.util.spec_from_file_location(module_name, 
                os.path.join(path, "__init__.py") if os.path.isdir(path) else path)
            
            if spec and spec.loader:
                module = importlib.util.module_from_spec(spec)
                spec.loader.exec_module(module)

                # Prefer explicit skill metadata if defined
                manifest = getattr(module, "__skill_metadata__", None)
                if not isinstance(manifest, dict):
                    manifest = getattr(module, "manifest", None)
                    if not isinstance(manifest, dict):
                        manifest = getattr(module, "metadata", {}) or {}

                skill_instance = None
                if hasattr(module, "Skill"):
                    skill_instance = module.Skill()
                    # Only register to self.plugins if it's in the SKILLS_DIR
                    if self.SKILLS_DIR in path:
                        self.plugins[skill_id] = skill_instance

                if skill_instance is not None:
                    return self._build_skill_metadata(skill_id, path, manifest, skill_instance, module_type="plugin")

                if manifest:
                    return self._build_skill_metadata(skill_id, path, manifest, module_type="module")

            # Fallback to legacy metadata extraction
            return self._extract_legacy_metadata(skill_id, path)
        except Exception as e:
            return {"id": skill_id, "error": str(e)}

    def _extract_legacy_metadata(self, skill_id, filepath):
        if os.path.isdir(filepath): filepath = os.path.join(filepath, "__init__.py")
        try:
            with open(filepath, "r", encoding="utf-8") as f:
                tree = ast.parse(f.read())
            docstring = ast.get_docstring(tree) or "Legacy script."
            
            # Note: execution_mode is NOT read from docstrings as per requirements
            return {
                "id": skill_id,
                "name": skill_id.replace("_", " ").title(),
                "description": docstring,
                "execution_mode": "instant",
                "category": "shared",
                "market": "shared",
                "allowed_kernels": ["companion", "studio", "creator"],
                "mcp_enabled": False,
                "type": "legacy",
                "created_at": datetime.fromtimestamp(os.path.getctime(filepath)).isoformat(),
                "metadata": {"category": "shared", "market": "shared", "mcp_enabled": False}
            }
        except:
            return {"id": skill_id, "type": "legacy", "description": "Legacy script.", "execution_mode": "instant", "category": "shared", "mcp_enabled": False}

    def get_skill(self, skill_id, directory=None):
        directory = directory or self.SKILLS_DIR
        for skill in self.scan_skills(directory=directory):
            if skill.get("id") == skill_id:
                return skill
        return None

    def is_skill_allowed_for_kernel(self, skill_id, kernel):
        skill = self.get_skill(skill_id)
        if not skill:
            return False
        allowed_kernels = skill.get("allowed_kernels")
        if isinstance(allowed_kernels, (list, tuple)) and allowed_kernels:
            return kernel in [k.lower() for k in allowed_kernels]

        category = skill.get("category")
        if kernel == "companion":
            return category in ("companion", "shared")
        if kernel == "studio":
            return category in ("studio", "shared")
        if kernel == "creator":
            return category in ("creator", "shared")
        return False

    def _normalize_skill_category(self, category):
        if not category:
            return "shared"
        normalized = str(category).strip().lower()
        if normalized in {"companion", "assistant", "chatbot", "chat", "companion_kernel"}:
            return "companion"
        if normalized in {"studio", "developer", "automation", "editor", "creative", "code", "studio_kernel"}:
            return "studio"
        if normalized in {"creator", "content", "video", "editing", "render"}:
            return "creator"
        if normalized in {"shared", "common", "utility", "global", "plugin", "module", "productivity", "media", "creativity", "voice"}:
            return "shared"
        return normalized

    def _normalize_skill_market(self, market):
        if not market:
            return "shared"
        normalized = str(market).strip().lower()
        if normalized in {"companion", "assistant", "chatbot", "chat"}:
            return "companion"
        if normalized in {"studio", "developer", "automation", "editor", "code"}:
            return "studio"
        if normalized in {"creator", "content", "video", "editing", "render"}:
            return "creator"
        if normalized in {"shared", "common", "utility", "global", "plugin", "module", "productivity"}:
            return "shared"
        return normalized

    def _build_skill_metadata(self, skill_id, path, manifest, skill_instance=None, module_type="module"):
        if not isinstance(manifest, dict):
            manifest = {}

        name = manifest.get("name") or (getattr(skill_instance, "name", None) if skill_instance is not None else None) or skill_id.replace("_", " ").title()
        description = manifest.get("description") or (getattr(skill_instance, "description", None) if skill_instance is not None else None) or "Dynamic plugin skill."
        category = self._normalize_skill_category(
            manifest.get("category") or (getattr(skill_instance, "category", None) if skill_instance is not None else None) or "shared"
        )
        market = self._normalize_skill_market(
            manifest.get("market") or category
        )
        allowed_kernels = manifest.get("allowed_kernels")
        if isinstance(allowed_kernels, str):
            allowed_kernels = [allowed_kernels]
        if isinstance(allowed_kernels, (list, tuple)):
            allowed_kernels = [str(k).strip().lower() for k in allowed_kernels if str(k).strip()]
        else:
            allowed_kernels = None

        metadata = dict(manifest)
        metadata["market"] = market
        if allowed_kernels is not None:
            metadata["allowed_kernels"] = allowed_kernels

        return {
            "id": skill_id,
            "name": name,
            "description": description,
            "category": category,
            "market": market,
            "allowed_kernels": allowed_kernels,
            "execution_mode": manifest.get("execution_mode", "instant"),
            "mcp_enabled": bool(manifest.get("mcp_enabled", False)),
            "version": manifest.get("version", "1.0.0"),
            "author": manifest.get("author", "MIA Core"),
            "type": module_type,
            "created_at": datetime.fromtimestamp(os.path.getctime(path)).isoformat(),
            "metadata": metadata
        }

    def install_skill(self, skill_id):
        """Install a skill by copying from marketplace to skills directory."""
        # Check marketplace first
        src_py = os.path.join(self.MARKETPLACE_DIR, f"{skill_id}.py")
        src_dir = os.path.join(self.MARKETPLACE_DIR, skill_id)
        
        target_py = os.path.join(self.SKILLS_DIR, f"{skill_id}.py")
        target_dir = os.path.join(self.SKILLS_DIR, skill_id)
        
        if os.path.exists(src_py):
            shutil.copy2(src_py, target_py)
            return {"status": "success", "message": f"Skill {skill_id} installed."}
        elif os.path.exists(src_dir):
            if os.path.exists(target_dir):
                shutil.rmtree(target_dir)
            shutil.copytree(src_dir, target_dir)
            return {"status": "success", "message": f"Skill {skill_id} installed."}
        
        return {"status": "error", "message": "Skill not found in marketplace."}

    def uninstall_skill(self, skill_id):
        """Uninstall a skill by removing it from the skills directory."""
        target_py = os.path.join(self.SKILLS_DIR, f"{skill_id}.py")
        target_dir = os.path.join(self.SKILLS_DIR, skill_id)
        
        if os.path.exists(target_py):
            os.remove(target_py)
            if skill_id in self.plugins: del self.plugins[skill_id]
            return {"status": "success"}
        elif os.path.exists(target_dir):
            shutil.rmtree(target_dir)
            if skill_id in self.plugins: del self.plugins[skill_id]
            return {"status": "success"}
            
        return {"status": "error", "message": "Skill not found."}

    async def execute_skill(self, skill_id, args=None, kernel=None):
        """
        SHAD-CSA Phase 6: Resilient Skill Execution.
        Wired to EBARF for budget monitoring and resource safety.
        """
        if kernel and not self.is_skill_allowed_for_kernel(skill_id, kernel):
            return {
                "status": "error",
                "message": f"SKILL_RESTRICTED: Skill '{skill_id}' is not permitted in the {kernel} kernel.",
                "code": "SKILL_PERMISSION_DENIED"
            }

        from shad_csa.economy.economic_control import EconomicControlField
        ecf = EconomicControlField(compute_budget=5000, node_budget=20, chaos_budget=0)
        
        # 1. Economic Safety Check (EBARF)
        # Cost per skill run is 10.0 compute units
        if not ecf.allocate("compute", cost=10.0):
            return {
                "status": "error", 
                "message": "ECONOMIC_SCARCITY: Anggaran komputasi tidak mencukupi untuk menjalankan skill ini.",
                "code": "BUDGET_EXCEEDED"
            }

        # Caching logic
        cache_key = f"{skill_id}:{json.dumps(args, sort_keys=True)}"
        if cache_key in self.execution_cache:
            result, timestamp = self.execution_cache[cache_key]
            if datetime.now() - timestamp < self.cache_ttl:
                return result

        try:
            # 2. Execution Logic
            if skill_id in self.plugins:
                plugin = self.plugins[skill_id]
                import inspect
                if inspect.iscoroutinefunction(plugin.execute):
                    output = await plugin.execute(args or {})
                else:
                    output = plugin.execute(args or {})
                res = {"status": "success", "output": output}
            else:
                res = await self._execute_legacy(skill_id, args)
            
            self.execution_cache[cache_key] = (res, datetime.now())
            return res

        except Exception as e:
            # Resilience Mapping
            return {
                "status": "error", 
                "message": f"SYSTEM_HEALING_SIGNAL: {str(e)}",
                "code": "EXECUTION_FAILURE"
            }

    async def _execute_legacy(self, skill_id, args):
        filepath = os.path.join(self.SKILLS_DIR, f"{skill_id}.py")
        if not os.path.exists(filepath):
            return {"status": "error", "message": f"Skill '{skill_id}' not found."}

        args_json = json.dumps(args or {})
        try:
            # FLAGSHIP PERFORMANCE: Use true async subprocess
            proc = await asyncio.create_subprocess_exec(
                sys.executable, filepath, args_json,
                stdout=asyncio.subprocess.PIPE,
                stderr=asyncio.subprocess.PIPE
            )
            
            stdout, stderr = await proc.communicate()
            
            if proc.returncode == 0:
                res = {"status": "success", "output": stdout.decode().strip()}
                # Cache successful legacy runs
                cache_key = f"{skill_id}:{args_json}"
                self.execution_cache[cache_key] = (res, datetime.now())
                return res
            return {"status": "error", "message": stderr.decode().strip()}
        except Exception as e:
            return {"status": "error", "message": str(e)}

    def save_skill(self, name, code):
        safe_name = "".join([c if c.isalnum() or c == "_" else "_" for c in name.lower()])
        # Don't add .py if it's already there
        filename = safe_name if safe_name.endswith(".py") else f"{safe_name}.py"
        filepath = os.path.join(self.SKILLS_DIR, filename)

        if "__skill_metadata__" not in code:
            default_metadata = {
                "name": name,
                "category": "companion",
                "market": "companion",
                "allowed_kernels": ["companion"],
                "mcp_enabled": False
            }
            metadata_block = f"__skill_metadata__ = {json.dumps(default_metadata, indent=4, ensure_ascii=False)}\n\n"
            code = metadata_block + code

        with open(filepath, "w", encoding="utf-8") as f:
            f.write(code)
            
        # Invalidate folder mtime cache so new skills are loaded immediately
        if self.SKILLS_DIR in self._folder_mtime:
            del self._folder_mtime[self.SKILLS_DIR]
            
        return {"status": "success", "file": filename}

# Singleton
skill_manager = SkillManager()

