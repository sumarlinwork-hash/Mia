import os
import sys
import shutil
import asyncio
import threading
import time
from contextlib import asynccontextmanager
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from fastapi.middleware.gzip import GZipMiddleware
from fastapi.staticfiles import StaticFiles
from pynput import keyboard
import uvicorn

# Environment Configuration and Telemetry Mitigation
os.environ["ANONYMIZED_TELEMETRY"] = "false"
os.environ["CHROMA_TELEMETRY_ENABLED"] = "false"

try:
    import chromadb.telemetry
    def no_op(*args, **kwargs): pass
    if hasattr(chromadb.telemetry, 'Telemetry'):
        chromadb.telemetry.Telemetry.capture = no_op
        chromadb.telemetry.Telemetry.send_event = no_op
    if hasattr(chromadb.telemetry, 'product_analytics'):
        if hasattr(chromadb.telemetry.product_analytics, 'ProductAnalytics'):
            chromadb.telemetry.product_analytics.ProductAnalytics.capture = no_op
except Exception:
    pass

# Ensure current directory is in sys.path
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))

from config import load_config
from crone_daemon import crone_daemon
from core.local_runtime import local_event_bus
from core.emotion_manager import emotion_manager
from core.mode_hub import mode_hub, MIAMode
from mia_comm.brain_orchestrator import brain_orchestrator

# Import newly modularized APIRouters
from api.llm_router import llm_router
from api.studio_router import studio_router
from api.companion_router import companion_router

# Lifespan context for startup and shutdown procedures
@asynccontextmanager
async def lifespan(app: FastAPI):
    # Startup procedure
    emotion_manager.on_app_open() # Trigger Glow Spark on launch
    local_event_bus.start()
    crone_daemon.start()
    
    # Sync Mode Hub with SQLite persistent config
    initial_config = load_config()
    mode_hub.set_mode(MIAMode(initial_config.os_mode))

    # Pre-load Local LLM if active (Zero-latency first response)
    asyncio.create_task(brain_orchestrator.preload_local_models())
    
    yield
    # Shutdown procedure
    local_event_bus.stop()

# Initialize FastAPI instance
app = FastAPI(title="MIA Backend API", lifespan=lifespan)

# Setup GZip and CORS Middleware
app.add_middleware(GZipMiddleware, minimum_size=1000)
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Global Request Logging Middleware for Traffic Monitoring
@app.middleware("http")
async def log_requests(request, call_next):
    path = request.url.path
    if path.startswith("/api") and not any(x in path for x in ["heartbeat", "status", "emotion", "health"]):
        print(f"[Traffic] {request.method} {path}")
    response = await call_next(request)
    return response

# Mount public assets folder
assets_dir = os.path.join(os.path.dirname(__file__), "..", "frontend", "public", "assets")
os.makedirs(assets_dir, exist_ok=True)
app.mount("/assets", StaticFiles(directory=assets_dir), name="assets")

# Global Keyboard Hotkey Listener (Alt+Space)
def on_hotkey():
    print("[Hotkey] Alt+Space detected! Bringing MIA to front.")
    # In a real desktop app, Alt+Space triggers a window focus or frontend notification

def start_hotkey_listener():
    try:
        with keyboard.GlobalHotKeys({'<alt>+<space>': on_hotkey}) as h:
            h.join()
    except Exception as e:
        print(f"[Hotkey Listener] Warning: Failed to start hotkey listener: {e}")

threading.Thread(target=start_hotkey_listener, daemon=True).start()

# Mount all the decoupled modular routers
app.include_router(llm_router)
app.include_router(studio_router)
app.include_router(companion_router)

if __name__ == "__main__":
    uvicorn.run(
        "main:app", 
        host="127.0.0.1", 
        port=8000, 
        reload=True, 
        reload_excludes=[
            "*.json", "*.md", "*.db", "iam_mia/*", "history/*", 
            "state.db", "memory/*", "data/*", "temp_screens/*", 
            "**/public/assets/*"
        ]
    )
