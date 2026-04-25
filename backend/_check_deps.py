import importlib, sys

modules = [
    ("fastapi", "fastapi"),
    ("uvicorn", "uvicorn"),
    ("httpx", "httpx"),
    ("apscheduler", "apscheduler"),
    ("chromadb", "chromadb"),
    ("colorama", "colorama"),
    ("python-multipart", "multipart"),
    ("pydantic", "pydantic"),
]

all_ok = True
for display, mod in modules:
    try:
        importlib.import_module(mod)
        print(f"  [OK]   {display}")
    except ImportError as e:
        print(f"  [MISS] {display} — {e}")
        all_ok = False

print()
print("All dependencies OK!" if all_ok else "MISSING PACKAGES DETECTED — run: pip install -r requirements.txt")
