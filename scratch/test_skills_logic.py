import sys
import os

# Add backend to path
backend_path = r"d:\ProjectBuild\projects\mia\backend"
sys.path.append(backend_path)

try:
    from skill_manager import skill_manager
    print("Skill Manager imported successfully.")
    
    print("Scanning installed skills...")
    installed = skill_manager.scan_skills()
    print(f"Installed: {installed}")
    
    print("Scanning marketplace skills...")
    marketplace = skill_manager.scan_skills(directory=skill_manager.MARKETPLACE_DIR)
    print(f"Marketplace found: {len(marketplace)} items.")
    
except Exception as e:
    import traceback
    traceback.print_exc()
