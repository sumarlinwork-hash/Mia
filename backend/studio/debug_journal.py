import asyncio
import os
import shutil
import json
import sys

# Fix path
sys.path.append(os.path.join(os.getcwd(), 'backend'))
sys.path.append(os.path.join(os.getcwd(), 'backend', 'studio'))

from studio.version_service import studio_version_service

async def audit_journal():
    project_id = "p27_debug"
    journal_path = os.path.join(studio_version_service.journal_dir, project_id)
    if os.path.exists(journal_path): shutil.rmtree(journal_path)
    
    print("Writing A, B, C...")
    studio_version_service.write_draft_file(project_id, "A", "A")
    studio_version_service.write_draft_file(project_id, "B", "B")
    studio_version_service.write_draft_file(project_id, "C", "C")
    
    index_path = os.path.join(journal_path, "journal.jsonl")
    with open(index_path, "r") as f:
        lines = f.readlines()
        for i, line in enumerate(lines):
            print(f"Line {i}: {line.strip()}")

if __name__ == "__main__":
    asyncio.run(audit_journal())
