import os
import ast
import subprocess
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

    def scan_skills(self, directory=None):
        """Scan a directory and load plugin modules or extract legacy metadata."""
        if directory is None:
            directory = self.SKILLS_DIR
            
        skills = []
        if not os.path.exists(directory):
            return []
            
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
                # Check if installed (if we are scanning marketplace)
                if directory == self.MARKETPLACE_DIR:
                    metadata["is_installed"] = self.is_installed(skill_id)
                skills.append(metadata)
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
                
                if hasattr(module, "Skill"):
                    skill_instance = module.Skill()
                    # Only register to self.plugins if it's in the SKILLS_DIR
                    if self.SKILLS_DIR in path:
                        self.plugins[skill_id] = skill_instance
                        
                    return {
                        "id": skill_id,
                        "name": getattr(skill_instance, "name", skill_id.replace("_", " ").title()),
                        "description": getattr(skill_instance, "description", "Dynamic plugin skill."),
                        "category": getattr(skill_instance, "category", "Plugin"),
                        "type": "plugin",
                        "created_at": datetime.fromtimestamp(os.path.getctime(path)).isoformat()
                    }

            # Fallback to legacy metadata extraction
            return self._extract_legacy_metadata(skill_id, path)
        except Exception as e:
            return {"id": skill_id, "error": str(e)}

    def _extract_legacy_metadata(self, skill_id, filepath):
        if os.path.isdir(filepath): filepath = os.path.join(filepath, "__init__.py")
        try:
            with open(filepath, "r", encoding="utf-8") as f:
                tree = ast.parse(f.read())
            docstring = ast.get_docstring(tree) or "Legacy subprocess skill."
            return {
                "id": skill_id,
                "name": skill_id.replace("_", " ").title(),
                "description": docstring,
                "type": "legacy",
                "created_at": datetime.fromtimestamp(os.path.getctime(filepath)).isoformat()
            }
        except:
            return {"id": skill_id, "type": "legacy", "description": "Legacy script."}

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

    async def execute_skill(self, skill_id, args=None):
        """Execute a skill (plugin or legacy) with caching."""
        # Caching logic
        cache_key = f"{skill_id}:{json.dumps(args, sort_keys=True)}"
        if cache_key in self.execution_cache:
            result, timestamp = self.execution_cache[cache_key]
            if datetime.now() - timestamp < self.cache_ttl:
                return result

        # Plugin execution
        if skill_id in self.plugins:
            try:
                plugin = self.plugins[skill_id]
                # Support both async and sync execute
                import inspect
                if inspect.iscoroutinefunction(plugin.execute):
                    output = await plugin.execute(args or {})
                else:
                    output = plugin.execute(args or {})
                
                res = {"status": "success", "output": output}
                self.execution_cache[cache_key] = (res, datetime.now())
                return res
            except Exception as e:
                return {"status": "error", "message": str(e)}

        # Legacy execution fallback
        return await self._execute_legacy(skill_id, args)

    async def _execute_legacy(self, skill_id, args):
        filepath = os.path.join(self.SKILLS_DIR, f"{skill_id}.py")
        if not os.path.exists(filepath):
            return {"status": "error", "message": f"Skill '{skill_id}' not found."}

        args_json = json.dumps(args or {})
        try:
            result = subprocess.run(
                [sys.executable, filepath, args_json],
                capture_output=True, text=True, timeout=30
            )
            if result.returncode == 0:
                res = {"status": "success", "output": result.stdout.strip()}
                # Cache successful legacy runs too
                cache_key = f"{skill_id}:{args_json}"
                self.execution_cache[cache_key] = (res, datetime.now())
                return res
            return {"status": "error", "message": result.stderr.strip()}
        except Exception as e:
            return {"status": "error", "message": str(e)}

    def save_skill(self, name, code):
        safe_name = "".join([c if c.isalnum() or c == "_" else "_" for c in name.lower()])
        # Don't add .py if it's already there
        filename = safe_name if safe_name.endswith(".py") else f"{safe_name}.py"
        filepath = os.path.join(self.SKILLS_DIR, filename)
        with open(filepath, "w", encoding="utf-8") as f:
            f.write(code)
        return {"status": "success", "file": filename}

# Singleton
skill_manager = SkillManager()

