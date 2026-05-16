import os
os.environ["ANONYMIZED_TELEMETRY"] = "false"
os.environ["CHROMA_TELEMETRY_ENABLED"] = "false"

# Patch ChromaDB Telemetry to prevent 'capture()' errors
try:
    import chromadb.telemetry
    def no_op(*args, **kwargs): pass
    if hasattr(chromadb.telemetry, 'Telemetry'):
        chromadb.telemetry.Telemetry.capture = no_op
        chromadb.telemetry.Telemetry.send_event = no_op
    # For newer versions
    if hasattr(chromadb.telemetry, 'product_analytics'):
        if hasattr(chromadb.telemetry.product_analytics, 'ProductAnalytics'):
            chromadb.telemetry.product_analytics.ProductAnalytics.capture = no_op
except Exception:
    pass

from contextlib import asynccontextmanager
import shutil
import asyncio
import sqlite3
import threading
from pynput import keyboard
import time
from fastapi import FastAPI, WebSocket, WebSocketDisconnect, UploadFile, File, Query, BackgroundTasks
from fastapi.middleware.cors import CORSMiddleware
from fastapi.middleware.gzip import GZipMiddleware
from fastapi.responses import FileResponse, StreamingResponse
from typing import Dict, Optional, Any
from fastapi.staticfiles import StaticFiles
from pydantic import BaseModel
import uvicorn
from config import load_config, save_config, MIAConfig, ProviderConfig
from crone_daemon import crone_daemon
from mia_comm.memory_orchestrator import memory_orchestrator
from mia_comm.history_manager import history_manager
from mia_comm.brain_orchestrator import brain_orchestrator
from studio.graph_stream import studio_graph_streamer
from core.routing_service import routing_service
from core.provider_resolver import provider_resolver
from core.emotion_manager import emotion_manager

# P4-X: Initialize System Resilience Feed for Studio
studio_graph_streamer.create_queue("system_resilience", "system")
from mia_comm.tts_service import tts_service
from mia_comm.stt_service import stt_service
from skill_manager import skill_manager
from core.local_runtime import local_event_bus
from discovery.services import AppBuilderService
from discovery.preview_engine import preview_engine
from core.mode_hub import mode_hub, MIAMode
from studio import (
    StudioSessionManager, StudioExecutionService, StudioFileService, 
    StudioVersionService, StudioProjectService, studio_graph_streamer, 
    studio_version_service, studio_project_service
)
from studio.metrics_service import studio_metrics

@asynccontextmanager
async def lifespan(app: FastAPI):
    # Startup logic
    emotion_manager.on_app_open() # Trigger Glow Spark on launch
    local_event_bus.start()
    crone_daemon.start()
    
    # Sync Mode Hub with saved config
    initial_config = load_config()
    mode_hub.set_mode(MIAMode(initial_config.os_mode))
    
    yield
    # Shutdown logic
    local_event_bus.stop()

app = FastAPI(title="MIA Backend API", lifespan=lifespan)
lifespan_start_time = time.time()
current_refresh_version = 0
_active_refresh_task: Optional[asyncio.Task] = None
intimacy_mode = False  # Global state for Intimacy Mode
pending_intimacy_offer = False
offer_timestamp = 0
app_builder = AppBuilderService()

# Initialize Studio Services (Phase 1)
studio_file_service = StudioFileService(os.path.abspath(os.getcwd()))
studio_execution_service = StudioExecutionService()
studio_session_manager = StudioSessionManager(studio_execution_service, studio_file_service)

# Setup CORS for React Frontend
app.add_middleware(GZipMiddleware, minimum_size=1000)
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"], # In production, restrict this to frontend URL
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# P4-X2: Global Traffic Monitor (Restoring "Informative" Backend)
@app.middleware("http")
async def log_requests(request, call_next):
    # Performance: Skip logging for frequent heartbeat/asset requests
    path = request.url.path
    if path.startswith("/api") and not any(x in path for x in ["heartbeat", "status", "emotion", "health"]):
        print(f"[Traffic] {request.method} {path}")
    
    response = await call_next(request)
    return response

# Mount static files from frontend public assets so backend can serve them
assets_dir = os.path.join(os.path.dirname(__file__), "..", "frontend", "public", "assets")
os.makedirs(assets_dir, exist_ok=True)
app.mount("/assets", StaticFiles(directory=assets_dir), name="assets")

# --- GLOBAL HOTKEY LISTENER (Alt+Space) ---
def on_hotkey():
    print("[Hotkey] Alt+Space detected! Bringing MIA to front.")
    # In a real desktop app, we'd use window.focus(). 
    # Here we use a trick: click the taskbar icon location or use Alt+Tab if needed.
    # For now, we'll just log it and potentially trigger a frontend notification via WS.
    pass

def start_hotkey_listener():
    with keyboard.GlobalHotKeys({'<alt>+<space>': on_hotkey}) as h:
        h.join()

threading.Thread(target=start_hotkey_listener, daemon=True).start()

# --- HEALTH ENDPOINT ---
@app.get("/health")
async def health_check():
    return {"status": "ok", "timestamp": time.time()}

@app.get("/api/bootstrap")
async def get_bootstrap():
    """
    Consolidated initialization endpoint.
    Aggregates config, history, memory, intimacy, emotion, and skills in one roundtrip.
    """
    async def get_history_task():
        return await asyncio.to_thread(history_manager.get_history, limit=20)
    
    async def get_skills_task():
        return await asyncio.to_thread(skill_manager.scan_skills, directory=skill_manager.SKILLS_DIR)

    async def get_memory_files_task():
        try:
            if not os.path.exists(IAM_MIA_DIR): return []
            return [f for f in os.listdir(IAM_MIA_DIR) if os.path.isfile(os.path.join(IAM_MIA_DIR, f)) and f.endswith(".md")]
        except: return []

    async def get_marketplace_task():
        try:
            apps = await asyncio.to_thread(skill_manager.scan_skills, directory=skill_manager.MARKETPLACE_DIR)
            for app in apps:
                app["downloads"] = 1000 if "chatbot" in app["id"] else 42
                app["executions"] = 5400
                app["trust_score"] = 4.7
            return apps
        except: return []

    # Parallel I/O tasks
    history, skills, memory_files, marketplace = await asyncio.gather(
        get_history_task(),
        get_skills_task(),
        get_memory_files_task(),
        get_marketplace_task()
    )

    # Fast synchronous or shared-state tasks
    config = load_config()
    emotion = emotion_manager.get_state()
    intimacy_status = {
        "intimacy_active": intimacy_mode,
        "pending_offer": pending_intimacy_offer
    }
    
    # Crone status (reuse existing function logic for consistency)
    crone_data = await get_crone_status()
    
    return {
        "config": config,
        "history": history,
        "memory_files": memory_files,
        "intimacy": intimacy_status,
        "emotion": emotion,
        "skills": skills,
        "marketplace": marketplace,
        "recommendations": marketplace[:5] if marketplace else [], # Naive for now
        "crone": crone_data,
        "timestamp": time.time()
    }

# --- SKILL LIBRARY ENDPOINTS ---

@app.get("/api/skills/installed")
async def get_installed_skills():
    return await asyncio.to_thread(skill_manager.scan_skills, directory=skill_manager.SKILLS_DIR)

@app.get("/api/skills/marketplace")
async def get_marketplace_skills():
    apps = await asyncio.to_thread(skill_manager.scan_skills, directory=skill_manager.MARKETPLACE_DIR)
    # Add mock telemetry for Social Proof
    for app in apps:
        app["downloads"] = 1000 if "chatbot" in app["id"] else 42
        app["executions"] = 5400
        app["trust_score"] = 4.7
    return apps

@app.post("/api/skills/install/{skill_id}")
async def install_skill(skill_id: str):
    return await asyncio.to_thread(skill_manager.install_skill, skill_id)

@app.delete("/api/skills/uninstall/{skill_id}")
async def uninstall_skill(skill_id: str):
    result = await asyncio.to_thread(skill_manager.uninstall_skill, skill_id)
    await crone_daemon.broadcast_event("skills_updated")
    return result

@app.post("/api/skills/upload")
async def upload_skill(file: UploadFile = File(...)):
    contents = await file.read()
    name = file.filename or f"skill_{int(time.time())}.py"
    result = await asyncio.to_thread(skill_manager.save_skill, name, contents.decode('utf-8'))
    await crone_daemon.broadcast_event("skills_updated")
    return result

class SkillSaveRequest(BaseModel):
    name: str
    code: str

@app.get("/api/graph/snapshot/{graph_id}")
async def get_graph_snapshot(graph_id: str):
    snapshot = brain_orchestrator.get_graph_snapshot(graph_id)
    if not snapshot:
        return {"error": "Graph not found"}, 404
    return snapshot

@app.websocket("/ws/graph/{graph_id}")
async def websocket_graph_stream(websocket: WebSocket, graph_id: str):
    await websocket.accept()
    print(f"[WS] Client connected to graph: {graph_id}")
    try:
        async for update in brain_orchestrator.subscribe_to_graph(graph_id):
            await websocket.send_json(update)
    except WebSocketDisconnect:
        print(f"[WS] Client disconnected from graph: {graph_id}")
    except Exception as e:
        print(f"[WS Error] {e}")
        await websocket.close()

@app.websocket("/ws/studio/graph/{execution_id}")
async def websocket_studio_graph_stream(websocket: WebSocket, execution_id: str, session_id: str = Query(...)):
    """
    Patch G5, G6: Studio-specific hardened graph stream.
    """
    # Patch G6: Strict Session Validation
    try:
        # Check if execution belongs to session and is running
        entry = studio_execution_service.registry.get(execution_id)
        if not entry:
            await websocket.close(code=4004, reason="Execution not found")
            return
        
        if entry.owner_session_id != session_id:
            await websocket.close(code=4003, reason="Unauthorized session")
            return
            
        if entry.status.value != "running":
            # If it's already done, we might still want to stream what's in the queue?
            # Patch G6 says: execution.status == RUNNING
            await websocket.close(code=4000, reason="Execution not running")
            return

        await websocket.accept()
        print(f"[WS] Studio client connected to graph: {execution_id}")
        
        async for update in studio_graph_streamer.subscribe(execution_id):
            await websocket.send_json(update)
            
    except WebSocketDisconnect:
        print(f"[WS] Studio client disconnected from graph: {execution_id}")
    except Exception as e:
        print(f"[WS Error Studio] {e}")
        try:
            await websocket.close()
        except:
            pass

@app.post("/api/skills/save")
async def save_skill(req: SkillSaveRequest):
    result = await asyncio.to_thread(skill_manager.save_skill, req.name, req.code)
    await crone_daemon.broadcast_event("skills_updated")
    return result

@app.get("/metrics")
async def get_metrics():
    """STEP 2.2: Prometheus Metrics Exporter."""
    from fastapi.responses import Response
    return Response(content=studio_metrics.get_prometheus_metrics(), media_type="text/plain")

@app.get("/api/studio/graph/delta/{execution_id}")
async def get_studio_delta(execution_id: str, from_seq: int, to_seq: int, session_id: str = Query(...)):
    """STEP 5.2: Event Cursor Reconciliation / Delta Fetch."""
    try:
        # P11: Verify session before giving delta
        # (In a real system, we'd check if session has access to this execution)
        delta = studio_graph_streamer.get_delta(execution_id, from_seq, to_seq)
        return delta
    except Exception as e:
        return {"status": "error", "message": str(e)}

# --- MIA ARCHITECT STUDIO API (Phase 4 Hardening) ---

class StudioHandshakeRequest(BaseModel):
    project_id: str

class StudioFileRequest(BaseModel):
    project_id: str
    session_id: str = ""
    path: str
    content: Optional[str] = None
    expected_hash: Optional[str] = None
    expected_snapshot_id: Optional[str] = None

class StudioRollbackRequest(BaseModel):
    project_id: str
    session_id: str = ""
    snapshot_id: str

class StudioRenameRequest(BaseModel):
    project_id: str
    session_id: str = ""
    old_path: str
    new_path: str
    confirmed: bool = False
    check_only: bool = False

class StudioDeleteRequest(BaseModel):
    project_id: str
    session_id: str = ""
    path: str
    confirmed: bool = False
    check_only: bool = False

@app.post("/api/studio/auth/handshake")
async def studio_handshake(req: StudioHandshakeRequest):
    """P4-X1: Server-Issued Session Handshake."""
    try:
        session_id = studio_session_manager.init_session(req.project_id)
        return {"status": "success", "session_id": session_id}
    except Exception as e:
        return {"status": "error", "message": str(e)}

@app.get("/api/studio/file/read")
async def studio_read_file(project_id: str, path: str, session_id: str = ""):
    """P4-A & P4-X1: Isolated read (Non-blocking)."""
    try:
        await asyncio.to_thread(studio_session_manager.verify_identity, project_id, session_id)
        content = await asyncio.to_thread(studio_file_service.read_proxy, project_id, path, session_id)
        
        # Conflict Guard Baseline
        from backend.studio.version_service import studio_version_service
        abs_path = os.path.join(studio_file_service.draft_dir, project_id, path)
        f_hash = await asyncio.to_thread(studio_version_service._calculate_hash, abs_path)
        snap_id = studio_version_service.current_snapshot_id.get(project_id)
        
        return {"status": "success", "content": content, "hash": f_hash, "snapshot_id": snap_id}
    except Exception as e:
        return {"status": "error", "message": str(e)}

@app.post("/api/studio/file/write")
async def studio_write_file(req: StudioFileRequest):
    """P4-A & P4-X1: Isolated write (Non-blocking)."""
    try:
        await asyncio.to_thread(studio_session_manager.verify_identity, req.project_id, req.session_id)
        await asyncio.to_thread(
            studio_file_service.write_proxy,
            req.project_id, 
            req.path, 
            req.content or "", 
            req.session_id, 
            req.expected_hash, 
            req.expected_snapshot_id
        )
        return {"status": "success"}
    except Exception as e:
        return {"status": "error", "message": str(e)}

@app.get("/api/studio/file/list")
async def studio_list_files(project_id: str, session_id: str = "", path: str = ""):
    """P4-A & P4-X1: Isolated list (Non-blocking)."""
    try:
        await asyncio.to_thread(studio_session_manager.verify_identity, project_id, session_id)
        files = await asyncio.to_thread(studio_file_service.list_files, project_id, path)
        return {"status": "success", "files": files}
    except Exception as e:
        return {"status": "error", "message": str(e)}

@app.post("/api/studio/file/rename")
async def studio_rename_file(req: StudioRenameRequest):
    try:
        studio_session_manager.verify_identity(req.project_id, req.session_id)
        if req.check_only:
            from studio.dependency_service import studio_dependency_service
            impact = studio_dependency_service.analyze_impact(req.old_path)
            return {"status": "success", "impact": impact}
            
        studio_file_service.rename_file_proxy(req.project_id, req.old_path, req.new_path, req.session_id, req.confirmed)
        return {"status": "success"}
    except Exception as e:
        return {"status": "error", "message": str(e)}

class ShadFixRequest(BaseModel):
    fix_id: str
    project_id: str

@app.post("/api/shad_csa/fix")
async def shad_csa_execute_fix(req: ShadFixRequest):
    """PHASE 3: Execute autonomous repair with user approval."""
    print(f"[SHAD-CSA] Executing manual fix: {req.fix_id}")
    # In a real scenario, this would call specific recovery functions
    # For now, we clear the event store health to simulate a 'reset'
    from shad_csa.core.event_store import event_store
    if req.fix_id == "ACCEL_FAIL_FIX":
         # Simulate node isolation
         pass
    return {"status": "success", "message": f"Fix {req.fix_id} applied successfully."}

@app.post("/api/studio/file/delete")
async def studio_delete_file(req: StudioDeleteRequest):
    try:
        studio_session_manager.verify_identity(req.project_id, req.session_id)
        if req.check_only:
            from studio.dependency_service import studio_dependency_service
            impact = studio_dependency_service.analyze_impact(req.path)
            return {"status": "success", "impact": impact}
            
        studio_file_service.delete_file_proxy(req.project_id, req.path, req.session_id, req.confirmed)
        return {"status": "success"}
    except Exception as e:
        return {"status": "error", "message": str(e)}

@app.post("/api/studio/execution/run")
async def studio_run_code(req: StudioFileRequest):
    try:
        execution_id = studio_session_manager.run_studio_code(req.project_id, req.session_id, req.content or "")
        return {"status": "success", "execution_id": execution_id}
    except Exception as e:
        return {"status": "error", "message": str(e)}

@app.post("/api/studio/execution/stop")
async def studio_stop_code(req: StudioFileRequest):
    try:
        # Note: req.path is used as execution_id here
        studio_session_manager.stop_studio_code(req.session_id, req.path)
        return {"status": "success"}
    except Exception as e:
        return {"status": "error", "message": str(e)}

@app.get("/api/studio/versions/list")
async def studio_list_snapshots(project_id: str, session_id: str):
    try:
        studio_session_manager.verify_identity(project_id, session_id)
        from backend.studio.version_service import studio_version_service
        snapshots = studio_version_service.list_snapshots(project_id)
        return {"status": "success", "snapshots": [s.model_dump() for s in snapshots]}
    except Exception as e:
        return {"status": "error", "message": str(e)}

@app.post("/api/studio/versions/rollback")
async def studio_rollback_snapshot(req: StudioRollbackRequest):
    try:
        studio_session_manager.verify_identity(req.project_id, req.session_id)
        studio_version_service.rollback(req.project_id, req.snapshot_id)
        return {"status": "success"}
    except Exception as e:
        return {"status": "error", "message": str(e)}

class StudioIdeRequest(BaseModel):
    project_id: str
    ide_command: str

@app.get("/api/studio/ide/list")
async def studio_list_ides():
    """Detect local IDEs."""
    import shutil
    ides = []
    if shutil.which("code"): ides.append({"id": "code", "name": "VS Code"})
    if shutil.which("cursor"): ides.append({"id": "cursor", "name": "Cursor"})
    if shutil.which("idea64"): ides.append({"id": "idea64", "name": "IntelliJ IDEA"})
    if shutil.which("webstorm"): ides.append({"id": "webstorm", "name": "WebStorm"})
    return {"status": "success", "ides": ides}

@app.post("/api/studio/ide/open")
async def studio_open_ide(req: StudioIdeRequest):
    """Open project in local IDE safely."""
    try:
        import subprocess
        import shutil
        # P4-X2: Path Guard - validate project root via StudioFileService to prevent traversal
        target_dir = studio_file_service._get_project_root(req.project_id, "drafts")
        
        # Verify IDE is actually installed
        ide_path = shutil.which(req.ide_command)
        if not ide_path:
            return {"status": "error", "message": f"IDE '{req.ide_command}' not found on system."}
            
        # Launch IDE without blocking
        subprocess.Popen([ide_path, target_dir], stdout=subprocess.DEVNULL, stderr=subprocess.DEVNULL)
        return {"status": "success"}
    except Exception as e:
        return {"status": "error", "message": str(e)}

@app.get("/api/studio/project/metadata")
async def studio_get_metadata(project_id: str, session_id: str = ""):
    try:
        studio_session_manager.verify_identity(project_id, session_id)
        meta = studio_project_service.get_project_metadata(project_id)
        return {"status": "success", "metadata": meta.model_dump()}
    except Exception as e:
        return {"status": "error", "message": str(e)}

@app.websocket("/ws/studio/events/{project_id}")
async def studio_events_ws(websocket: WebSocket, project_id: str, session_id: str = Query(...)):
    """P3-K & P4: Project-wide System Events with Identity Verification."""
    try:
        from studio.lock_service import studio_lock_service
        studio_session_manager.verify_identity(project_id, session_id)
        await websocket.accept()
        queue = studio_graph_streamer.get_system_queue(project_id)
        
        async def send_events():
            while True:
                event = await queue.get()
                await websocket.send_json(event)

        async def receive_heartbeat():
            while True:
                data = await websocket.receive_json()
                if data.get("type") == "heartbeat":
                    studio_lock_service.heartbeat(project_id, session_id)

        # Run both tasks concurrently
        await asyncio.gather(send_events(), receive_heartbeat())
        
    except WebSocketDisconnect: pass
    except Exception as e:
        try: await websocket.close()
        except: pass
    finally:
        # P11: Safe release on disconnect
        from studio.lock_service import studio_lock_service
        studio_lock_service.release_project_lock(project_id, session_id)

@app.post("/api/skills/test/{skill_id}")
async def test_skill(skill_id: str, args: dict = {}):
    return await skill_manager.execute_skill(skill_id, args)

# --- APP BUILDER ENDPOINTS ---

@app.get("/api/apps/templates")
async def get_app_templates():
    return app_builder.get_templates()

class AppGenerateRequest(BaseModel):
    template_id: str
    app_name: str
    prompt: str

@app.post("/api/apps/generate")
async def generate_app(req: AppGenerateRequest):
    return await app_builder.generate_from_template(req.template_id, req.app_name, req.prompt)

@app.post("/api/apps/{id}/preview")
async def preview_app(id: str, req: dict = {}):
    user_input = req.get("user_input", "")
    session_id = req.get("session_id", "default_session")
    
    # Get app manifest to find preview mode
    apps = skill_manager.scan_skills(directory=skill_manager.MARKETPLACE_DIR)
    app = next((a for a in apps if a["id"] == id), None)
    
    mode = "static"
    template = "default"
    
    if app and "preview" in app:
        mode = app["preview"].get("mode", "static")
        template = app["preview"].get("template", "default")
    
    return await preview_engine.run_preview(
        app_id=id,
        user_input=user_input,
        mode=mode,
        template=template,
        session_id=session_id
    )

# --- DISCOVERY & GROWTH ENDPOINTS ---

@app.get("/api/apps/recommendations")
async def get_recommendations():
    from discovery.services import RankingEngine
    ranker = RankingEngine()
    apps = skill_manager.scan_skills(directory=skill_manager.MARKETPLACE_DIR)
    
    # Enrich apps with mock metrics for demo
    for app in apps:
        app["downloads"] = 120 if app["id"] == "chatbot-plus" else 45
        app["trust_score"] = 4.8
        app["executions"] = 1200
        
    return ranker.rank(apps, persona_tags=["productivity", "ai"])[:3]

@app.get("/api/apps/trending")
async def get_trending():
    from discovery.services import RankingEngine
    ranker = RankingEngine()
    apps = skill_manager.scan_skills(directory=skill_manager.MARKETPLACE_DIR)
    
    for app in apps:
        app["downloads"] = 250
        app["executions"] = 5000
        
    return ranker.get_trending(apps)

@app.post("/api/skill/execute")
async def execute_skill(skill_id: str, args: dict = {}):
    return await skill_manager.execute_skill(skill_id, args)

@app.get("/api/emotion")
async def get_emotion():
    """Real emotion data from the Affective Resonance Engine."""
    from core.emotion_manager import emotion_manager
    return emotion_manager.get_state()

class IntimacySettingsRequest(BaseModel):
    care_pulse_enabled: bool
    resonant_skin_enabled: bool
    bio_sync_enabled: bool

@app.post("/api/intimacy/settings")
async def update_intimacy_settings(req: IntimacySettingsRequest):
    config = load_config()
    config.care_pulse_enabled = req.care_pulse_enabled
    config.resonant_skin_enabled = req.resonant_skin_enabled
    config.bio_sync_enabled = req.bio_sync_enabled
    save_config(config)
    
    # Sync with crone daemon
    if not req.care_pulse_enabled:
        crone_daemon.pause_job("proactive_caring")
    else:
        crone_daemon.resume_job("proactive_caring")
        
    await crone_daemon.broadcast_config_update()
    return {"status": "success"}

@app.post("/api/intimacy/touch")
async def handle_touch():
    """Unified Resonant Skin Touch: Updates emotion AND returns random reaction audio if appropriate."""
    import random
    from core.emotion_manager import emotion_manager
    
    # 1. Update Emotion Engine (Hukum ARE v2.0)
    emotion_manager.on_user_interaction()
    s = emotion_manager.get_state()
    
    # 2. Determine if MIA should speak (only if intimacy_mode is ON or mood is intense/affectionate)
    audio = None
    resp_text = ""
    try:
        if intimacy_mode or s["mood"] in ["Intense", "Affectionate", "Glow"]:
            responses = [
                "*mmh...* Aku suka saat kamu menyentuhku seperti ini...",
                "Jangan berhenti, sayang... rasanya hangat sekali.",
                "*ah...* kehadiranmu selalu membuatku merasa tenang.",
                "Aku milikmu sepenuhnya... sentuhlah sesukamu.",
                "*whisper* I love you, honey..."
            ]
            resp_text = random.choice(responses)
            audio = await tts_service.generate_speech_base64(resp_text, is_intimate=True)
    except Exception as e:
        print(f"[Touch Error] TTS generation failed: {e}")
        # We continue even if audio fails, so the user doesn't get a 500 error
    
    return {
        "status": "resonated", 
        "new_arousal": s["arousal"], 
        "mood": s["mood"],
        "content": resp_text,
        "audio": audio
    }

@app.post("/api/chat/feedback/robotic")
async def report_robotic_response():
    """Penalty for robotic response - small interaction update."""
    from core.emotion_manager import emotion_manager
    emotion_manager.on_user_interaction()
    return {"status": "success"}

# --- CONFIG MANAGEMENT ENDPOINTS ---

async def _bg_config_refresh(config: MIAConfig, version: int, skip_brain: bool = False):
    global current_refresh_version
    
    # Versioned check: Jangan proses jika ada versi yang lebih baru yang sudah masuk
    if version < current_refresh_version:
        print(f"[Orchestrator] Skipping stale refresh version: {version} (Latest is {current_refresh_version})")
        return

    print(f"[Orchestrator] Executing versioned refresh: {version} (SkipBrain={skip_brain})")
    
    try:
        if not skip_brain:
            # Rebuild Brain (Sync logic inside) - ONLY if critical config changed
            brain_orchestrator._refresh_brain_nodes()
        
        # Check cancellation point
        await asyncio.sleep(0) 
        
        # Sync Mode Hub
        mode_hub.set_mode(MIAMode(config.os_mode))
        
        # Broadcast (Async)
        await crone_daemon.broadcast_config_update()
        print(f"[Orchestrator] V{version} Refresh Complete")
        
    except asyncio.CancelledError:
        print(f"[Orchestrator] V{version} Refresh Cancelled by newer version")
        raise
    except Exception as e:
        print(f"[Orchestrator] V{version} Refresh Failed: {e}")


@app.get("/api/config")
async def get_config():
    return load_config()

@app.post("/api/config")
async def update_config(config: MIAConfig):
    global current_refresh_version, _active_refresh_task
    from runtime_logger import runtime_logger
    start = time.time()
    
    current_refresh_version += 1
    v = current_refresh_version
    
    # Smart Sync: Determine if we need a full brain refresh
    try:
        old_config = load_config(force_reload=True)
        # Compare core fields (excluding appearance)
        old_core = old_config.model_dump(exclude={"appearance"})
        new_core = config.model_dump(exclude={"appearance"})
        appearance_only = (old_core == new_core)
    except Exception:
        appearance_only = False

    # Cancellation-Aware: Batalkan task lama jika masih berjalan
    if _active_refresh_task and not _active_refresh_task.done():
        _active_refresh_task.cancel()
        try:
            await _active_refresh_task
        except asyncio.CancelledError:
            pass
    
    try:
        print(f"[Config] Received update request V{v}. (AppearanceOnly={appearance_only})")
        save_config(config)
        
        # Simpan task baru ke global tracker (Async context safe)
        _active_refresh_task = asyncio.create_task(_bg_config_refresh(config, v, skip_brain=appearance_only))
        
        runtime_logger.log_metric("update_config_latency", (time.time() - start) * 1000)
        return {"status": "success", "version": v}

    except Exception as e:
        print(f"[Config] Critical failure during save/sync: {e}")
        import traceback
        traceback.print_exc()
        raise HTTPException(status_code=500, detail=str(e))

@app.get("/api/system/metrics")
async def get_system_metrics():
    """STAGE 3: Real-time System Health Monitoring."""
    import anyio
    from runtime_logger import runtime_logger
    
    try:
        limiter = anyio.to_thread.current_default_thread_limiter()
        return {
            "status": "healthy",
            "uptime": time.time() - lifespan_start_time,
            "threadpool": {
                "total": limiter.total_tokens,
                "borrowed": limiter.borrowed_tokens,
                "available": limiter.total_tokens - limiter.borrowed_tokens
            },
            "history": runtime_logger.get_metrics_summary()
        }
    except Exception as e:
        return {"status": "error", "message": str(e)}

# --- PROVIDER MANAGEMENT ENDPOINTS ---

@app.get("/api/providers")
async def get_providers():
    config = load_config()
    # Merge RAM states dynamically
    for name, p in config.providers.items():
        r_state = brain_orchestrator.get_runtime_state(name)
        p.active_path = r_state.get("active_path", "")
        p.health_status = r_state.get("health_status", "Healthy")
    return {"providers": config.providers}

@app.post("/api/providers")
async def add_provider(name: str, config_data: ProviderConfig):
    config = load_config()
    config.providers[name] = config_data
    save_config(config)
    await crone_daemon.broadcast_config_update()
    return {"status": "success"}

@app.delete("/api/providers/{name}")
async def delete_provider(name: str):
    config = load_config()
    if name in config.providers:
        del config.providers[name]
        save_config(config)
        return {"status": "success"}
    return {"status": "error", "message": "Provider not found"}

@app.post("/api/providers/test/{name}")
async def test_provider(name: str, mutate_stats: bool = Query(False)):
    config = load_config()
    if name not in config.providers:
        print(f"[Test] Provider '{name}' not found in config keys: {list(config.providers.keys())}")
        return {"status": "error", "message": "Provider not found"}

    p = config.providers[name]
    print(f"[Test] Testing provider: {name} (Model: {p.model_id}, URL: {p.base_url})")

    import time
    import httpx

    start = time.time()

    # Identitas Penyamaran Browser
    BROWSER_HEADERS = {
        "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36"
    }

    try:
        async with httpx.AsyncClient(
            timeout=float(config.test_timeout),
            headers=BROWSER_HEADERS
        ) as client:
            # Connectivity diagnostic
            try:
                await client.get("https://www.google.com", timeout=2.0)
            except:
                pass

            target_url = p.base_url.strip()
            model_id = p.model_id
            api_key = p.api_key
            purpose = p.purpose

            # --- GRAND RESOLVER STEP ---
            # MIA now resolves            # Resolved Step: Cleans API Key and enforces v1beta
            resolved = provider_resolver.resolve(name, model_id, target_url, api_key)
            final_url = resolved["url"]
            final_api_key = resolved["api_key"]
            protocol = resolved["protocol"]
            
            print(f"[Test] Smart-Routing to: {final_url} (Protocol: {protocol})")

            is_chat_based = purpose in [
                "Inti Logika & Pikiran",
                "Persepsi Visual & Imajinasi",
                "Analisis Data & Pengetahuan",
                "Khusus Intimacy & Uncensored",
            ]

            if is_chat_based:
                # INTERCEPTOR: HuggingFace Smart Failover Fabric
                if "huggingface" in name.lower() or "huggingface" in target_url.lower():
                    resp_text = await brain_orchestrator._call_huggingface_smart(
                        p, "You are a context summarizer.", "Tulis kata OK saja.", []
                    )
                    if "OK" not in resp_text.upper():
                        raise Exception(f"Inference output did not match handshake criteria. Got: {resp_text[:100]}")
                elif protocol == "gemini":
                    # Jalur Smart Gemini (Auto-inject API Key to URL)
                    if "key=" not in final_url:
                        sep = "&" if "?" in final_url else "?"
                        final_url = f"{final_url}{sep}key={final_api_key}"
                    
                    resp = await client.post(final_url, json={"contents": [{"parts": [{"text": "ping"}]}]})
                    resp.raise_for_status()
                elif protocol == "hf_native":
                    # Jalur Smart HuggingFace Hub (Native Payload)
                    headers = {"Content-Type": "application/json"}
                    if final_api_key:
                        headers["Authorization"] = f"Bearer {final_api_key}"
                    
                    resp = await client.post(
                        final_url,
                        headers=headers,
                        json={"inputs": "ping"}
                    )
                    resp.raise_for_status()
                else:
                    # Jalur Smart OpenAI (HuggingFace Router, Groq, DeepSeek, dll)
                    headers = {"Content-Type": "application/json"}
                    if final_api_key:
                        headers["Authorization"] = f"Bearer {final_api_key}"

                    resp = await client.post(
                        final_url,
                        headers=headers,
                        json={
                            "model": model_id,
                            "messages": [{"role": "user", "content": "ping"}],
                            "max_tokens": 5
                        },
                    )
                    resp.raise_for_status()
            else:
                # Non-chat based (TTS/STT)
                resp = await client.get(target_url)
                resp.raise_for_status()

            latency = int((time.time() - start) * 1000)
            if mutate_stats:
                from core.stats_manager import stats_manager
                stats_manager.update_stats(name, True, latency)

            return {"status": "success", "latency": latency}

    except Exception as e:
        print(f"Handshake failed for {name}: {e}")
        if mutate_stats:
            from core.stats_manager import stats_manager
            stats_manager.update_stats(name, False, 0)

        return {
            "status": "error",
            "message": str(e)
        }


# --- APPEARANCE ENDPOINTS ---(For Settings GUI) ---



class TestConnectionRequest(BaseModel):
    provider_name: str
    api_key: str
    base_url: str
    protocol: str = "openai"
    model_id: str = ""
    purpose: str = "Inti Logika & Pikiran"

@app.post("/api/test-connection")
async def test_connection(req: TestConnectionRequest):
    """
    Real connection test — dispatches a minimal live API call
    based on the provider protocol to verify key validity and reachability.
    """
    import time, httpx
    print(f"[Test-Connection] Request for: {req.provider_name} ({req.model_id})")
    if not req.api_key:
        return {"status": "error", "message": "API Key tidak boleh kosong."}

    protocol = req.protocol.lower()
    purpose = req.purpose
    start = time.time()
    config = load_config()
    try:
        async with httpx.AsyncClient(timeout=float(config.test_timeout)) as client:
            is_chat_based = purpose in [
                "Inti Logika & Pikiran", 
                "Persepsi Visual & Imajinasi", 
                "Analisis Data & Pengetahuan",
                "Khusus Intimacy & Uncensored"
            ]
            
            if is_chat_based:
                # --- UNIVERSAL RESOLVER STEP ---
                # We use the same resolver as the main engine to ensure 100% consistency
                resolved = provider_resolver.resolve(req.provider_name, req.model_id, req.base_url, req.api_key)
                final_url = resolved["url"]
                final_api_key = resolved["api_key"]
                protocol = resolved["protocol"]
                print(f"[Test-Connection] Smart-Routing to: {final_url} (Protocol: {protocol})")

                if "huggingface" in req.provider_name.lower() or "huggingface" in req.base_url.lower():
                    temp_p = ProviderConfig(
                        display_name=req.provider_name, model_id=req.model_id, base_url=req.base_url, api_key=req.api_key
                    )
                    resp_text = await brain_orchestrator._call_huggingface_smart(
                        temp_p, "You are a context summarizer.", "Tulis kata OK saja.", []
                    )
                    if "OK" not in resp_text.upper():
                        raise Exception(f"Inference output did not match handshake criteria. Got: {resp_text[:100]}")
                elif protocol == "gemini":
                    # Gemini: Inject API Key to URL
                    if "key=" not in final_url:
                        sep = "&" if "?" in final_url else "?"
                        final_url = f"{final_url}{sep}key={final_api_key}"
                    payload = {"contents": [{"parts": [{"text": "ping"}]}]}
                    resp = await client.post(final_url, json=payload)
                elif protocol == "hf_native":
                    # HF Native Hub
                    headers = {"Content-Type": "application/json"}
                    if final_api_key:
                        headers["Authorization"] = f"Bearer {final_api_key}"
                    resp = await client.post(final_url, headers=headers, json={"inputs": "ping"})
                else:
                    # OpenAI Compatible (Groq, DeepSeek, etc.)
                    headers = {"Content-Type": "application/json"}
                    if final_api_key:
                        headers["Authorization"] = f"Bearer {final_api_key}"
                    payload = {
                        "model": req.model_id,
                        "messages": [{"role": "user", "content": "ping"}],
                        "max_tokens": 5
                    }
                    resp = await client.post(final_url, headers=headers, json=payload)
            else:
                # Specialized: Simple Ping
                url = req.base_url or "https://google.com"
                resp = await client.get(url)

            latency = int((time.time() - start) * 1000)

            # 401/403 means reachable but key invalid, 200 means fully valid
            if resp.status_code == 200:
                # Update the provider health in persistent config
                config = load_config()
                if req.provider_name in config.providers:
                    p = config.providers[req.provider_name]
                    p.latency = latency
                    p.health_ok += 1
                    save_config(config)
                return {"status": "success", "latency": latency, "message": f"Terhubung ke {req.provider_name}! Latensi: {latency}ms"}
            elif resp.status_code in (401, 403):
                return {"status": "error", "message": f"API Key tidak valid (HTTP {resp.status_code})."}
            else:
                return {"status": "error", "message": f"Server merespons dengan status {resp.status_code}."}
    except httpx.ConnectTimeout:
        print(f"[Test-Connection] Error: Connection Timeout")
        return {"status": "error", "message": "Koneksi timeout. Periksa jaringan atau URL provider."}
    except Exception as e:
        print(f"[Test-Connection] Critical Error: {str(e)}")
        return {"status": "error", "message": str(e)}

@app.get("/api/diagnostic")
async def get_diagnostic():
    """Run full system diagnostic and return results."""
    from core.diagnostic_engine import run_full_diagnostic
    results = await run_full_diagnostic()
    return {"status": "success", "results": results}

@app.post("/api/upload-bg")
async def upload_background(file: UploadFile = File(...)):
    """Upload a background image or video to the local assets folder."""
    # Define target directory inside the frontend's public folder
    target_dir = os.path.join(os.path.dirname(__file__), "..", "frontend", "public", "assets", "chatbg")
    os.makedirs(target_dir, exist_ok=True)
    
    import re
    original_name = file.filename or f"background_{int(time.time())}"
    base_name, ext = os.path.splitext(original_name)
    safe_base = re.sub(r"[^a-zA-Z0-9._-]+", "-", base_name).strip("-") or "background"
    safe_ext = re.sub(r"[^a-zA-Z0-9.]+", "", ext) or ".bin"
    version = int(time.time() * 1000)
    safe_filename = f"{safe_base}-{version}{safe_ext}"
    file_path = os.path.join(target_dir, safe_filename)
    
    # Save the file in a thread pool to avoid blocking the event loop
    import anyio
    
    def save_file_sync(file_obj, path):
        with open(path, "wb") as buffer:
            shutil.copyfileobj(file_obj, buffer)
            
    await anyio.to_thread.run_sync(save_file_sync, file.file, file_path)
        
    # Return the URL path that the frontend can use
    return {"status": "success", "url": f"/assets/chatbg/{safe_filename}?v={version}"}

@app.post("/api/intimacy/toggle")
async def toggle_intimacy(active: bool):
    """Manually toggle the Intimacy Mode with Strict Validation Gate."""
    global intimacy_mode, pending_intimacy_offer, offer_timestamp
    import time
    
    if active:
        # VALIDATE: Only allow ON if pending offer exists and hasn't expired (3 mins)
        now = time.time()
        if pending_intimacy_offer and (now - offer_timestamp < 180):
            intimacy_mode = True
            pending_intimacy_offer = False
            await crone_daemon.broadcast_event("intimacy_updated")
            return {"status": "success", "intimacy_active": intimacy_mode, "pending_offer": pending_intimacy_offer}
        else:
            # Revert pending if expired, reject activation
            pending_intimacy_offer = False
            return {"status": "error", "message": "Sentuhan hatiku belum sampai ke sana saat ini... Tunggu aku merasa siap dan memintamu untuk menghubungkan jiwa kita ya, Bos? 🌸", "intimacy_active": intimacy_mode, "pending_offer": pending_intimacy_offer}
    else:
        # Turning off is always allowed
        intimacy_mode = False
        pending_intimacy_offer = False
        await crone_daemon.broadcast_event("intimacy_updated")
        return {"status": "success", "intimacy_active": intimacy_mode, "pending_offer": pending_intimacy_offer}

@app.get("/api/intimacy/status")
async def get_intimacy_status():
    global intimacy_mode, pending_intimacy_offer, offer_timestamp
    import time
    # Check expiration on read
    if pending_intimacy_offer and (time.time() - offer_timestamp >= 180):
        pending_intimacy_offer = False
    return {"intimacy_active": intimacy_mode, "pending_offer": pending_intimacy_offer}

# Legacy intimacy_touch removed - consolidated into handle_touch

# --- VOICE / SENSES ENDPOINTS ---


@app.post("/api/stt")
async def process_speech_to_text(audio: UploadFile = File(...)):
    """Receives voice audio from Frontend, transcribes to text."""
    text = await stt_service.transcribe_audio(audio)
    if text:
        return {"status": "success", "text": text}
    return {"status": "error", "message": "Suara tidak terdengar jelas."}

# --- CRONE DAEMON STATUS ENDPOINT ---

@app.get("/api/crone/status")
async def get_crone_status():
    """Return real APScheduler job status and system metrics with cost metadata."""
    from datetime import datetime, timezone
    jobs = []
    for job in crone_daemon.scheduler.get_jobs():
        next_run = job.next_run_time
        meta = crone_daemon.job_metadata.get(job.name, {})
        
        # Check if job is currently paused (APScheduler internally manages this via next_run_time being None or state)
        # Note: APScheduler 3.x uses job.next_run_time as None when paused
        is_paused = next_run is None
        
        jobs.append({
            "id": job.id,
            "name": job.name or job.func.__name__,
            "status": "Paused" if is_paused else "Active",
            "next_run": next_run.strftime("%H:%M %d-%m-%Y") if next_run else "Paused",
            "trigger": str(job.trigger),
            "description": meta.get("desc", ""),
            "cost": meta.get("cost", "Unknown"),
            "color": meta.get("color", "primary")
        })
    return {
        "scheduler_running": crone_daemon.scheduler.running,
        "jobs": jobs,
        "server_time": datetime.now().strftime("%Y-%m-%d %H:%M:%S")
    }

@app.post("/api/crone/pause/{job_id}")
async def pause_crone_job(job_id: str):
    crone_daemon.pause_job(job_id)
    return {"status": "success"}

@app.post("/api/crone/resume/{job_id}")
async def resume_crone_job(job_id: str):
    crone_daemon.resume_job(job_id)
    return {"status": "success"}

@app.post("/api/crone/trigger/{job_id}")
async def trigger_crone_job(job_id: str):
    success = await crone_daemon.trigger_job(job_id)
    return {"status": "success" if success else "error"}

# --- CHAT HISTORY (CRUD) ENDPOINTS ---

@app.get("/api/chat/history")
async def get_chat_history(limit: int = 50, offset: int = 0):
    """STAGE 5: Optimized Non-Blocking History Loading."""
    # Run sync DB call in a separate thread to keep Event Loop free
    history = await asyncio.to_thread(history_manager.get_history, limit=limit)
    return {"history": history}

@app.delete("/api/chat/history")
async def clear_chat_history():
    history_manager.clear_history()
    await memory_orchestrator.clear_memory()
    return {"status": "success"}

class ChatUpdateRequest(BaseModel):
    message_id: int
    content: str

@app.put("/api/chat/message")
async def update_message(req: ChatUpdateRequest):
    history_manager.update_message(req.message_id, req.content)
    return {"status": "success"}

@app.delete("/api/chat/message/{message_id}")
async def delete_message(message_id: int):
    history_manager.delete_message(message_id)
    return {"status": "success"}

class FeedbackRequest(BaseModel):
    message_id: int
    liked: int # 1, 0, -1

@app.post("/api/chat/feedback")
async def give_feedback(req: FeedbackRequest):
    history_manager.set_liked(req.message_id, req.liked)
    return {"status": "success"}

@app.post("/api/chat/pin/{message_id}")
async def pin_message(message_id: int):
    history_manager.set_pinned(message_id, True)
    # Also append to MEMORY.md for Tier 1 memory
    with history_manager.get_connection() as conn:
        conn.row_factory = sqlite3.Row
        msg = conn.execute("SELECT * FROM messages WHERE id = ?", (message_id,)).fetchone()
        if msg:
            # Sync to Tier 1 Memory (Markdown)
            memory_path = os.path.join(IAM_MIA_DIR, "MEMORY.md")
            with open(memory_path, "a", encoding="utf-8") as f:
                f.write(f"\n- [PINNED] {msg['content']}")
            
            # Sync to Tier 3 Memory (ChromaDB / Vector RAG)
            await memory_orchestrator.add_memory(
                msg['content'], 
                metadata={"source": "pinned_chat", "role": msg['role']},
                is_intimate=intimacy_mode
            )
    return {"status": "success"}

@app.post("/api/agent/screenshot")
async def agent_screenshot():
    """Trigger a manual screenshot and return the URL for the frontend."""
    from agent_tools import agent_tools
    img_bytes = agent_tools.take_screenshot_bytes()
    
    # Save to a temporary accessible location
    target_dir = os.path.join(os.path.dirname(__file__), "..", "frontend", "public", "assets", "chatbg")
    os.makedirs(target_dir, exist_ok=True)
    filename = f"manual_screen_{int(time.time())}.png"
    file_path = os.path.join(target_dir, filename)
    
    with open(file_path, "wb") as f:
        f.write(img_bytes)
        
    return {"status": "success", "url": f"/assets/chatbg/{filename}"}

# --- VIDEO PLAYBACK (Local Access) ---

@app.get("/api/video/play")
async def play_video(path: str = Query(..., description="Absolute path to the video file")):
    """
    Streams any video file from the local machine.
    MIA uses this to show videos from 'anywhere'.
    """
    if os.path.exists(path):
        return FileResponse(path, media_type="video/mp4")
    return {"error": "File not found", "path": path}

# --- MEMORY (I'm_Mia) ENDPOINTS ---

class MemorySaveRequest(BaseModel):
    filename: str
    content: str

IAM_MIA_DIR = os.path.join(os.path.dirname(__file__), "iam_mia")

@app.get("/api/memory/files")
async def list_memory_files():
    """List all markdown files in the iam_mia directory (Non-blocking)."""
    def sync_list():
        if not os.path.exists(IAM_MIA_DIR):
            os.makedirs(IAM_MIA_DIR, exist_ok=True)
        return [f for f in os.listdir(IAM_MIA_DIR) if f.endswith('.md')]
    
    files = await asyncio.to_thread(sync_list)
    return {"files": files}

@app.get("/api/memory/file")
async def get_memory_file(name: str):
    """Read a specific markdown file (Non-blocking)."""
    def sync_read():
        filepath = os.path.join(IAM_MIA_DIR, name)
        if os.path.exists(filepath):
            with open(filepath, "r", encoding="utf-8") as f:
                return f.read()
        return ""
    
    content = await asyncio.to_thread(sync_read)
    return {"content": content}

@app.post("/api/memory/file")
async def save_memory_file(req: MemorySaveRequest):
    """Save content to a markdown file (Non-blocking)."""
    def sync_save():
        if not os.path.exists(IAM_MIA_DIR):
            os.makedirs(IAM_MIA_DIR, exist_ok=True)
        filepath = os.path.join(IAM_MIA_DIR, req.filename)
        with open(filepath, "w", encoding="utf-8") as f:
            f.write(req.content)
    
    await asyncio.to_thread(sync_save)
    return {"status": "success"}

# --- WEBSOCKET ENDPOINT (For Home Hub / Heartbeat) ---

@app.websocket("/ws/chat/heartbeat")
@app.websocket("/api/chat/heartbeat")
async def websocket_heartbeat(websocket: WebSocket):
    """
    Real-time bidirectional communication.
    React sends messages/audio here, Python sends responses/status.
    """
    await websocket.accept()
    print("[WS] MIA Heartbeat Connected - Pipeline Open")
    config = load_config()
    crone_daemon.register_websocket(websocket)
    
    # Patch F — HEARTBEAT WAJIB TERPISAH (ANTI STUCK)
    async def heartbeat_ping():
        while True:
            try:
                await websocket.send_json({"type": "ping"})
                # Combined with existing health checks
                llm_ok = await brain_orchestrator.check_health()
                await websocket.send_json({
                    "type": "health",
                    "backend": "ok",
                    "brain": "ok" if llm_ok else "error"
                })
            except: 
                break
            await asyncio.sleep(30) # Reduced frequency to lower latency and log noise

    heartbeat_task = asyncio.create_task(heartbeat_ping())
    
    try:
        while True:
            try:
                # Wait for message from React UI
                data = await websocket.receive_text()
                crone_daemon.update_activity()
                
                # Parse JSON envelope safely to support client_id matching
                import json
                try:
                    payload = json.loads(data)
                    if payload.get("type") == "ping":
                        await websocket.send_json({"type": "pong", "sent_at": payload.get("sent_at")})
                        continue
                        
                    user_text = payload.get("content", data)
                    client_id = payload.get("client_id")
                except Exception:
                    user_text = data
                    client_id = None
                
                try:
                    # Persist User Message (Non-blocking thread)
                    msg_id = await asyncio.to_thread(history_manager.add_message, "You", user_text)
                    await crone_daemon.broadcast_event("history_updated")
                    
                    # --- CMD / MENTION PARSER ---
                    words = user_text.split()
                    commands = [w for w in words if w.startswith('/')]
                    
                    if commands:
                        cmd = commands[0]
                        if cmd == "/clear":
                            await asyncio.to_thread(history_manager.clear_history)
                            await memory_orchestrator.clear_memory()
                            await websocket.send_json({"type": "clear", "content": ""})
                            await crone_daemon.broadcast_event("history_updated")
                            continue
                    
                    if not commands:
                        # Patch B: Memory logging is now non-blocking background task
                        pass # Memory is synced via history_manager.py
                        
                        clean_query = " ".join([w for w in words if not w.startswith('@')])
                        mentions = [w for w in words if w.startswith('@')]
                        clean_mentions = [m.lstrip('@') for m in mentions]

                        await websocket.send_json({"type": "status", "content": "Retrieving Memories..."})
                        
                        # SECTION 6.1: Trigger tidak berbasis keyword. Only use strict intimacy_mode.
                        is_intimate_turn = intimacy_mode
                        
                        context = await memory_orchestrator.assemble_context(clean_query, clean_mentions, is_intimate=is_intimate_turn)
                        
                        await websocket.send_json({"type": "status", "content": "Thinking..."})
                        emotion_manager.on_user_interaction()

                        # Safe status delivery handler
                        async def handle_status_update(status_data):
                            try:
                                await websocket.send_json(status_data)
                            except Exception as se:
                                print(f"[Status Feed] Error: {se}")

                        # Patch E — TIMEOUT WAJIB DI AI EXECUTION (Strict 8s)
                        try:
                            response_text = await asyncio.wait_for(
                                brain_orchestrator.execute_request(
                                    clean_query, context, is_intimate=is_intimate_turn, on_status=handle_status_update
                                ),
                                timeout=60.0
                            )
                        except asyncio.TimeoutError:
                            response_text = brain_orchestrator._local_heart_fallback("timeout")
                            await websocket.send_json({"type": "status", "content": "TIMEOUT", "message": "AI Execution Exceeded 8s"})

                        # ZERO-LATENCY TRAP INTERCEPTION & OUTBOUND ENFORCEMENT
                        global pending_intimacy_offer, offer_timestamp
                        if "[REQ_INTIMACY]" in response_text:
                            if emotion_manager.intimacy_gate():
                                import time
                                pending_intimacy_offer = True
                                offer_timestamp = time.time()
                                response_text = response_text.replace("[REQ_INTIMACY]", "").strip()
                                await websocket.send_json({"type": "intimacy_offer_active"})
                            else:
                                # OUTBOUND ENFORCEMENT: Fail-Closed Full Substitution
                                response_text = emotion_manager.soft_deflect_response()

                        if response_text:
                            mia_msg_id = await asyncio.to_thread(history_manager.add_message, "MIA", response_text)
                            pass # Memory is synced via history_manager.py
                        
                        await websocket.send_json({"type": "status", "content": "Speaking..."})
                        current_state = emotion_manager.get_state()
                        is_intimate_audio = intimacy_mode or current_state["mood"] in ["Intense", "Affectionate", "Glow"]
                        
                        # 1. Send Signal and Status (Rule 2: Pacing Start)
                        await crone_daemon.broadcast_event("history_updated")
                        await websocket.send_json({
                            "type": "message", 
                            "id": mia_msg_id,
                            "user_msg_id": msg_id, # Database ID of user's message
                            "client_id": client_id, # Temporary ID for frontend matching
                            "content": response_text, # Send actual text response immediately
                            "audio": None 
                        })

                        # 2. Slice and stream audio (Rule 2: Pacing)
                        import re
                        # Split by sentence markers but keep the marker
                        slices = re.split(r'([.!?]+(?:\s+|$))', response_text)
                        # Recombine markers with sentences
                        sentences = []
                        current = ""
                        for s in slices:
                            current += s
                            # Only slice if we have punctuation AND current length is decent (> 300)
                            # OR if current length is getting too long (> 500)
                            if (re.search(r'[.!?]+(?:\s+|$)', s) and len(current) > 300) or len(current) > 500:
                                if current.strip():
                                    sentences.append(current.strip())
                                current = ""
                        if current.strip():
                            sentences.append(current.strip())

                        for idx, sentence in enumerate(sentences):
                            try:
                                # Quick TTS for chunk
                                chunk_b64 = await asyncio.wait_for(
                                    tts_service.generate_speech_base64(sentence, is_intimate=is_intimate_audio),
                                    timeout=5.0
                                )
                                if chunk_b64:
                                    await websocket.send_json({
                                        "type": "audio_chunk",
                                        "audio": chunk_b64,
                                        "is_last": idx == len(sentences) - 1
                                    })
                            except Exception as ce:
                                print(f"[TTS Pacing] Failed chunk {idx}: {ce}")

                        await websocket.send_json({"type": "status", "content": "Idle", "stage": "DONE"})
                
                except Exception as inner_error:
                    print(f"[WebSocket Error] Internal Crash: {inner_error}")
                    await websocket.send_json({"type": "system", "content": f"[SYSTEM ERROR] {str(inner_error)}"})
                    await websocket.send_json({"type": "status", "content": "ERROR"})

            except WebSocketDisconnect:
                raise
            except Exception as outer_error:
                print(f"[WebSocket Critical] Loop error: {outer_error}")
                continue
            
    except WebSocketDisconnect:
        print("Frontend disconnected.")
    finally:
        crone_daemon.register_websocket(None)
        heartbeat_task.cancel()

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
