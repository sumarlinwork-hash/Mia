import sys, os, json
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))

IAM_MIA_DIR = os.path.join(os.path.dirname(os.path.abspath(__file__)), "iam_mia")
CRITICAL_FILES = [
    ("backend/main.py", "main.py"),
    ("backend/brain_orchestrator.py", "brain_orchestrator.py"),
    ("backend/crone_daemon.py", "crone_daemon.py"),
    ("backend/config.py", "config.py"),
    ("backend/memory_orchestrator.py", "memory_orchestrator.py"),
    ("backend/history_manager.py", "history_manager.py"),
]

IAM_DOCS = ["AGENTS.md", "SOUL.md", "MEMORY.md", "USER.md", "TOOLS.md"]

print("=== File Structure Check ===")
base = os.path.dirname(os.path.abspath(__file__))
all_ok = True
for label, rel in CRITICAL_FILES:
    path = os.path.normpath(os.path.join(base, rel))
    exists = os.path.exists(path)
    size = os.path.getsize(path) if exists else 0
    status = "[OK]  " if exists and size > 0 else "[EMPTY]" if exists else "[MISS]"
    if not exists or size == 0:
        all_ok = False
    print(f"  {status} {label} ({size} bytes)")

print()
print("=== I'm_Mia Memory Files ===")
for doc in IAM_DOCS:
    path = os.path.join(IAM_MIA_DIR, doc)
    exists = os.path.exists(path)
    size = os.path.getsize(path) if exists else 0
    status = "[OK]  " if exists and size > 0 else "[EMPTY]" if exists else "[MISS] (will be created on first use)"
    print(f"  {status} {doc} ({size} bytes)")

print()
print("=== config.json ===")
config_path = os.path.join(base, "config.json")
try:
    with open(config_path) as f:
        data = json.load(f)
    print(f"  [OK]   config.json is valid JSON")
    for name, p in data.get("providers", {}).items():
        key_status = "KEY SET" if p.get("api_key") else "⚠️  NO KEY"
        print(f"  [{name}] active={p.get('is_active')} default={p.get('is_default')} | {key_status}")
except Exception as e:
    print(f"  [WARN] config.json issue: {e} — will use defaults")

print()
print("All critical files OK!" if all_ok else "WARNING: Some files missing!")
