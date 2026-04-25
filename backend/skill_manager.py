import os
import ast
import subprocess
import json
import sys
import threading
from datetime import datetime

SKILLS_DIR = os.path.join(os.path.dirname(__file__), "skills")
os.makedirs(SKILLS_DIR, exist_ok=True)

class SkillManager:
    def __init__(self):
        self.skills_cache = {}

    def scan_skills(self):
        """Scan the skills directory and extract metadata from docstrings."""
        skills = []
        for filename in os.listdir(SKILLS_DIR):
            if filename.endswith(".py") and not filename.startswith("__"):
                filepath = os.path.join(SKILLS_DIR, filename)
                metadata = self._extract_metadata(filepath)
                skills.append(metadata)
        return skills

    def _extract_metadata(self, filepath):
        """Parse the Python file to get its name, description, and required args."""
        try:
            with open(filepath, "r", encoding="utf-8") as f:
                tree = ast.parse(f.read())
            
            docstring = ast.get_docstring(tree) or "No description provided."
            name = os.path.basename(filepath).replace(".py", "")
            
            # Simple metadata structure
            return {
                "id": name,
                "name": name.replace("_", " ").title(),
                "description": docstring,
                "file_path": filepath,
                "created_at": datetime.fromtimestamp(os.path.getctime(filepath)).isoformat()
            }
        except Exception as e:
            return {"id": os.path.basename(filepath), "error": str(e)}

    async def execute_skill(self, skill_id, args=None):
        """Execute a skill script as a subprocess and return output."""
        filepath = os.path.join(SKILLS_DIR, f"{skill_id}.py")
        if not os.path.exists(filepath):
            return {"status": "error", "message": f"Skill '{skill_id}' not found."}

        # Prepare arguments as JSON string
        args_json = json.dumps(args or {})
        
        try:
            # Run the script with the current python interpreter
            result = subprocess.run(
                [sys.executable, filepath, args_json],
                capture_output=True,
                text=True,
                timeout=30 # Safety timeout
            )
            
            if result.returncode == 0:
                return {"status": "success", "output": result.stdout.strip()}
            else:
                return {"status": "error", "message": result.stderr.strip()}
        except subprocess.TimeoutExpired:
            return {"status": "error", "message": "Skill execution timed out (30s limit)."}
        except Exception as e:
            return {"status": "error", "message": str(e)}

    def save_skill(self, name, code):
        """Save a new skill script to the library."""
        # Sanitize name
        safe_name = "".join([c if c.isalnum() or c == "_" else "_" for c in name.lower()])
        if not safe_name.endswith(".py"):
            safe_name += ".py"
            
        filepath = os.path.join(SKILLS_DIR, safe_name)
        with open(filepath, "w", encoding="utf-8") as f:
            f.write(code)
        return {"status": "success", "file": safe_name}

# Singleton
skill_manager = SkillManager()
