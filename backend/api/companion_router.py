import os
import sys
import time
from datetime import datetime
import json
import sqlite3
import shutil
import asyncio
import re
from typing import Dict, Optional, Any, List
from fastapi import APIRouter, WebSocket, WebSocketDisconnect, Query, UploadFile, File, Response, HTTPException
from fastapi.responses import FileResponse
from pydantic import BaseModel

# Ensure parent directory is in sys.path for clean import of core modules
parent_dir = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
if parent_dir not in sys.path:
    sys.path.insert(0, parent_dir)

from config import load_config, save_config, MIAConfig, ProviderConfig
from crone_daemon import crone_daemon
from mia_comm.memory_orchestrator import memory_orchestrator
from mia_comm.history_manager import history_manager
from mia_comm.brain_orchestrator import brain_orchestrator
from mia_comm.tts_service import tts_service
from mia_comm.stt_service import stt_service
from skill_manager import skill_manager
from core.emotion_manager import emotion_manager
from discovery.services import AppBuilderService
from discovery.preview_engine import preview_engine

companion_router = APIRouter(tags=["Companion Hub"])

from core.event_bus import event_bus

# --- STATE VARIABLES ---
intimacy_mode = False  # Global state for Intimacy Mode
pending_intimacy_offer = False
offer_timestamp = 0
active_module = "companion" # Dynamic active engine state
app_builder = AppBuilderService()
IAM_MIA_DIR = os.path.join(parent_dir, "iam_mia")
COMPANION_SKILL_CATEGORIES = ("companion", "shared")

async def _handle_module_switch(module_name: str):
    global active_module
    if active_module == module_name:
        return
        
    print(f"[Power State] Switching from {active_module} to {module_name}")
    active_module = module_name
    
    if module_name == "studio":
        print("[Power State] Studio active: Suspending companion background loops (STT/TTS, Polling)")
        # STT and TTS are inherently disabled because frontend stops sending requests, 
        # but we can proactively trigger backend stop if they had internal loops.
        # Suspending crone daemon companion jobs
        crone_daemon.pause_companion_jobs()
        emotion_manager.suspend()
    else:
        print("[Power State] Companion active: Waking up companion loops")
        crone_daemon.resume_companion_jobs()
        emotion_manager.resume()

event_bus.subscribe("SWITCH_TO_STUDIO", lambda _: _handle_module_switch("studio"))
event_bus.subscribe("SWITCH_TO_COMPANION", lambda _: _handle_module_switch("companion"))

# --- MODEL DEFINITIONS ---
class SkillSaveRequest(BaseModel):
    name: str
    code: str

class MemorySaveRequest(BaseModel):
    filename: str
    content: str

class ChatUpdateRequest(BaseModel):
    message_id: int
    content: str

class FeedbackRequest(BaseModel):
    message_id: int
    liked: int # 1, 0, -1

class AppGenerateRequest(BaseModel):
    template_id: str
    app_name: str
    prompt: str

# Helper to fetch crone data for bootstrap
async def _get_crone_status_helper():
    from datetime import datetime
    jobs = []
    try:
        for job in crone_daemon.scheduler.get_jobs():
            next_run = job.next_run_time
            meta = crone_daemon.job_metadata.get(job.name, {})
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
    except Exception:
        return {"scheduler_running": False, "jobs": [], "server_time": datetime.now().strftime("%Y-%m-%d %H:%M:%S")}

# --- ROUTER ENDPOINTS ---

@companion_router.get("/health")
async def health_check():
    return {"status": "ok", "timestamp": time.time()}

@companion_router.get("/api/power_state")
async def get_power_state():
    return {"active_module": active_module, "state": "SLEEP" if active_module == "studio" else "WAKE"}

@companion_router.get("/api/bootstrap")
async def get_bootstrap():
    async def get_history_task():
        return await asyncio.to_thread(history_manager.get_history, limit=20)
    
    async def get_skills_task():
        return await asyncio.to_thread(
            skill_manager.scan_skills,
            directory=skill_manager.SKILLS_DIR,
            categories=COMPANION_SKILL_CATEGORIES
        )

    async def get_memory_files_task():
        try:
            if not os.path.exists(IAM_MIA_DIR): return []
            return [f for f in os.listdir(IAM_MIA_DIR) if os.path.isfile(os.path.join(IAM_MIA_DIR, f)) and f.endswith(".md")]
        except: return []

    async def get_marketplace_task():
        try:
            apps = await asyncio.to_thread(
                skill_manager.scan_skills,
                directory=skill_manager.MARKETPLACE_DIR,
                categories=COMPANION_SKILL_CATEGORIES
            )
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

    config = load_config()
    emotion = emotion_manager.get_state()
    intimacy_status = {
        "intimacy_active": intimacy_mode,
        "pending_offer": pending_intimacy_offer
    }
    
    crone_data = await _get_crone_status_helper()
    
    return {
        "config": config,
        "history": history,
        "memory_files": memory_files,
        "intimacy": intimacy_status,
        "emotion": emotion,
        "skills": skills,
        "marketplace": marketplace,
        "recommendations": marketplace[:5] if marketplace else [],
        "crone": crone_data,
        "timestamp": time.time()
    }

@companion_router.get("/api/skills/installed")
async def get_installed_skills():
    return await asyncio.to_thread(
        skill_manager.scan_skills,
        directory=skill_manager.SKILLS_DIR,
        categories=COMPANION_SKILL_CATEGORIES
    )

@companion_router.get("/api/skills/marketplace")
async def get_marketplace_skills():
    apps = await asyncio.to_thread(
        skill_manager.scan_skills,
        directory=skill_manager.MARKETPLACE_DIR,
        categories=COMPANION_SKILL_CATEGORIES
    )
    for app in apps:
        app["downloads"] = 1000 if "chatbot" in app["id"] else 42
        app["executions"] = 5400
        app["trust_score"] = 4.7
    return apps

@companion_router.post("/api/skills/install/{skill_id}")
async def install_skill(skill_id: str):
    return await asyncio.to_thread(skill_manager.install_skill, skill_id)

@companion_router.delete("/api/skills/uninstall/{skill_id}")
async def uninstall_skill(skill_id: str):
    result = await asyncio.to_thread(skill_manager.uninstall_skill, skill_id)
    await crone_daemon.broadcast_event("skills_updated")
    return result

@companion_router.post("/api/skills/upload")
async def upload_skill(file: UploadFile = File(...)):
    contents = await file.read()
    name = file.filename or f"skill_{int(time.time())}.py"
    result = await asyncio.to_thread(skill_manager.save_skill, name, contents.decode('utf-8'))
    await crone_daemon.broadcast_event("skills_updated")
    return result

@companion_router.post("/api/skills/save")
async def save_skill(req: SkillSaveRequest):
    result = await asyncio.to_thread(skill_manager.save_skill, req.name, req.code)
    await crone_daemon.broadcast_event("skills_updated")
    return result

@companion_router.post("/api/skills/test/{skill_id}")
async def test_skill(skill_id: str, args: dict = {}):
    return await skill_manager.execute_skill(skill_id, args, kernel="companion")

@companion_router.post("/api/skill/execute")
async def execute_skill(req: dict):
    skill_id = req.get("skill_id") or req.get("name")
    args = req.get("args", {})
    if not skill_id:
        raise HTTPException(status_code=400, detail="Missing skill_id or name in request payload.")
    return await skill_manager.execute_skill(skill_id, args, kernel="companion")

@companion_router.get("/api/apps/templates")
async def get_app_templates():
    return app_builder.get_templates()

@companion_router.post("/api/apps/generate")
async def generate_app(req: AppGenerateRequest):
    return await app_builder.generate_from_template(req.template_id, req.app_name, req.prompt)

@companion_router.post("/api/apps/{id}/preview")
async def preview_app(id: str, req: dict = {}):
    user_input = req.get("user_input", "")
    session_id = req.get("session_id", "default_session")
    
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

@companion_router.get("/api/apps/recommendations")
async def get_recommendations():
    from discovery.services import RankingEngine
    ranker = RankingEngine()
    apps = skill_manager.scan_skills(directory=skill_manager.MARKETPLACE_DIR)
    
    for app in apps:
        app["downloads"] = 120 if app["id"] == "chatbot-plus" else 45
        app["trust_score"] = 4.8
        app["executions"] = 1200
        
    return ranker.rank(apps, persona_tags=["productivity", "ai"])[:3]

@companion_router.get("/api/apps/trending")
async def get_trending():
    from discovery.services import RankingEngine
    ranker = RankingEngine()
    apps = skill_manager.scan_skills(directory=skill_manager.MARKETPLACE_DIR)
    
    for app in apps:
        app["downloads"] = 250
        app["executions"] = 5000
        
    return ranker.get_trending(apps)

@companion_router.get("/api/emotion")
async def get_emotion():
    return emotion_manager.get_state()

@companion_router.post("/api/intimacy/settings")
async def update_intimacy_settings(settings: dict):
    # Store settings inside the config
    config = load_config()
    for k, v in settings.items():
        if hasattr(config, k):
            setattr(config, k, v)
    save_config(config)
    return {"status": "success"}

@companion_router.post("/api/intimacy/touch")
async def handle_touch(req: dict):
    from core.emotion_manager import emotion_manager
    touch_type = req.get("touch_type", "head")
    intensity = req.get("intensity", 0.5)
    
    response = emotion_manager.handle_touch(touch_type, intensity)
    return response

@companion_router.post("/api/chat/feedback/robotic")
async def log_robotic_feedback(req: dict):
    # Passive logging
    return {"status": "success"}

@companion_router.post("/api/upload-bg")
async def upload_background(file: UploadFile = File(...)):
    target_dir = os.path.join(parent_dir, "..", "frontend", "public", "assets", "chatbg")
    os.makedirs(target_dir, exist_ok=True)
    
    original_name = file.filename or f"background_{int(time.time())}"
    base_name, ext = os.path.splitext(original_name)
    safe_base = re.sub(r"[^a-zA-Z0-9._-]+", "-", base_name).strip("-") or "background"
    safe_ext = re.sub(r"[^a-zA-Z0-9.]+", "", ext) or ".bin"
    version = int(time.time() * 1000)
    safe_filename = f"{safe_base}-{version}{safe_ext}"
    file_path = os.path.join(target_dir, safe_filename)
    
    import anyio
    def save_file_sync(file_obj, path):
        with open(path, "wb") as buffer:
            shutil.copyfileobj(file_obj, buffer)
            
    await anyio.to_thread.run_sync(save_file_sync, file.file, file_path)
    return {"status": "success", "url": f"/assets/chatbg/{safe_filename}?v={version}"}

@companion_router.post("/api/intimacy/toggle")
async def toggle_intimacy(active: bool):
    global intimacy_mode, pending_intimacy_offer, offer_timestamp
    
    if active:
        if intimacy_mode:
            return {"status": "success", "intimacy_active": True, "pending_offer": False}

        is_ready = emotion_manager.intimacy_gate()
        now = time.time()
        is_valid_offer = pending_intimacy_offer and (now - offer_timestamp < 180)
        
        if is_valid_offer or is_ready:
            intimacy_mode = True
            pending_intimacy_offer = False
            asyncio.create_task(crone_daemon.broadcast_event("intimacy_updated"))
            return {"status": "success", "intimacy_active": intimacy_mode, "pending_offer": pending_intimacy_offer}
        else:
            pending_intimacy_offer = False
            return {"status": "error", "message": "Sentuhan hatiku belum sampai ke sana saat ini... Tunggu aku merasa siap dan memintamu untuk menghubungkan jiwa kita ya, Bos? 🌸", "intimacy_active": intimacy_mode, "pending_offer": pending_intimacy_offer}
    else:
        intimacy_mode = False
        pending_intimacy_offer = False
        asyncio.create_task(crone_daemon.broadcast_event("intimacy_updated"))
        return {"status": "success", "intimacy_active": intimacy_mode, "pending_offer": pending_intimacy_offer}

@companion_router.get("/api/intimacy/status")
async def get_intimacy_status():
    global intimacy_mode, pending_intimacy_offer, offer_timestamp
    if pending_intimacy_offer and (time.time() - offer_timestamp >= 180):
        pending_intimacy_offer = False
    return {"intimacy_active": intimacy_mode, "pending_offer": pending_intimacy_offer}

@companion_router.post("/api/stt")
async def process_speech_to_text(audio: UploadFile = File(...)):
    if active_module == "studio":
        return {"status": "error", "message": "Companion loops are currently suspended in Sleep Mode."}
    text = await stt_service.transcribe_audio(audio)
    if text:
        return {"status": "success", "text": text}
    return {"status": "error", "message": "Suara tidak terdengar jelas."}

@companion_router.get("/api/chat/history")
async def get_chat_history(limit: int = 50, offset: int = 0):
    history = await asyncio.to_thread(history_manager.get_history, limit=limit)
    return {"history": history}

@companion_router.delete("/api/chat/history")
async def clear_chat_history():
    history_manager.clear_history()
    await memory_orchestrator.clear_memory()
    return {"status": "success"}

@companion_router.post("/api/chat/history/rewind")
async def rewind_history(message_id: int = Query(...)):
    history_manager.rewind_to(message_id)
    brain_orchestrator.clear_cache()
    return {"status": "success"}

@companion_router.put("/api/chat/message")
async def update_message(req: ChatUpdateRequest):
    history_manager.update_message(req.message_id, req.content)
    return {"status": "success"}

@companion_router.delete("/api/chat/message/{message_id}")
async def delete_message(message_id: int):
    history_manager.delete_message(message_id)
    return {"status": "success"}

@companion_router.post("/api/chat/feedback")
async def give_feedback(req: FeedbackRequest):
    history_manager.set_liked(req.message_id, req.liked)
    return {"status": "success"}

@companion_router.post("/api/chat/pin/{message_id}")
async def pin_message(message_id: int):
    history_manager.set_pinned(message_id, True)
    with history_manager.get_connection() as conn:
        conn.row_factory = sqlite3.Row
        msg = conn.execute("SELECT * FROM messages WHERE id = ?", (message_id,)).fetchone()
        if msg:
            memory_path = os.path.join(IAM_MIA_DIR, "MEMORY.md")
            with open(memory_path, "a", encoding="utf-8") as f:
                f.write(f"\n- [PINNED] {msg['content']}")
            
            await memory_orchestrator.add_memory(
                msg['content'], 
                metadata={"source": "pinned_chat", "role": msg['role']},
                is_intimate=intimacy_mode
            )
    return {"status": "success"}

@companion_router.post("/api/agent/screenshot")
async def agent_screenshot():
    from agent_tools import agent_tools
    img_bytes = agent_tools.take_screenshot_bytes()
    
    target_dir = os.path.join(parent_dir, "..", "frontend", "public", "assets", "chatbg")
    os.makedirs(target_dir, exist_ok=True)
    filename = f"manual_screen_{int(time.time())}.png"
    file_path = os.path.join(target_dir, filename)
    
    with open(file_path, "wb") as f:
        f.write(img_bytes)
        
    return {"status": "success", "url": f"/assets/chatbg/{filename}"}

@companion_router.get("/api/video/play")
async def play_video(path: str = Query(..., description="Absolute path to the video file")):
    if os.path.exists(path):
        return FileResponse(path, media_type="video/mp4")
    return {"error": "File not found", "path": path}

@companion_router.get("/api/memory/files")
async def list_memory_files():
    def sync_list():
        if not os.path.exists(IAM_MIA_DIR):
            os.makedirs(IAM_MIA_DIR, exist_ok=True)
        files = []
        for f in os.listdir(IAM_MIA_DIR):
            if not f.endswith('.md'):
                continue
            filepath = os.path.join(IAM_MIA_DIR, f)
            if not os.path.isfile(filepath):
                continue
            stat = os.stat(filepath)
            preview = ""
            try:
                with open(filepath, "r", encoding="utf-8") as fh:
                    preview = fh.read(180).replace("\n", " ").strip()
            except:
                preview = ""
            files.append({
                "name": f,
                "created_at": datetime.fromtimestamp(stat.st_ctime).isoformat(),
                "updated_at": datetime.fromtimestamp(stat.st_mtime).isoformat(),
                "size": stat.st_size,
                "preview": preview
            })
        return files
    
    files = await asyncio.to_thread(sync_list)
    # The frontend is expecting just a list of strings, so we map the names
    return [f["name"] for f in files]

@companion_router.get("/api/memory/file")
async def get_memory_file(name: str):
    def sync_read():
        filepath = os.path.join(IAM_MIA_DIR, name)
        if not os.path.exists(filepath):
            return {"content": "", "metadata": {}}
        with open(filepath, "r", encoding="utf-8") as f:
            content = f.read()
        stat = os.stat(filepath)
        return {
            "content": content,
            "modified": stat.st_mtime,
            "metadata": {
                "name": name,
                "created_at": datetime.fromtimestamp(stat.st_ctime).isoformat(),
                "updated_at": datetime.fromtimestamp(stat.st_mtime).isoformat(),
                "size": stat.st_size
            }
        }
    
    content = await asyncio.to_thread(sync_read)
    return content

@companion_router.post("/api/memory/file")
async def save_memory_file(req: MemorySaveRequest):
    def sync_save():
        if not os.path.exists(IAM_MIA_DIR):
            os.makedirs(IAM_MIA_DIR, exist_ok=True)
        filepath = os.path.join(IAM_MIA_DIR, req.filename)
        with open(filepath, "w", encoding="utf-8") as f:
            f.write(req.content)
    
    await asyncio.to_thread(sync_save)
    return {"status": "success"}

@companion_router.get("/api/graph/snapshot/{graph_id}")
async def get_graph_snapshot(graph_id: str):
    snapshot = brain_orchestrator.get_graph_snapshot(graph_id)
    if not snapshot:
        return {"error": "Graph not found"}, 404
    return snapshot

@companion_router.websocket("/ws/graph/{graph_id}")
async def websocket_graph_stream(websocket: WebSocket, graph_id: str):
    await websocket.accept()
    try:
        async for update in brain_orchestrator.subscribe_to_graph(graph_id):
            await websocket.send_json(update)
    except WebSocketDisconnect: pass
    except Exception as e:
        try: await websocket.close()
        except: pass

@companion_router.websocket("/ws/chat/heartbeat")
@companion_router.websocket("/api/chat/heartbeat")
async def websocket_heartbeat(websocket: WebSocket):
    global active_module
    await websocket.accept()
    print("[WS] MIA Heartbeat Connected - Pipeline Open")
    crone_daemon.register_websocket(websocket)
    
    async def heartbeat_ping():
        while True:
            try:
                await websocket.send_json({"type": "ping"})
                llm_ok = await brain_orchestrator.check_health()
                await websocket.send_json({
                    "type": "health",
                    "backend": "ok",
                    "brain": "ok" if llm_ok else "error"
                })
            except: 
                break
            await asyncio.sleep(30)

    heartbeat_task = asyncio.create_task(heartbeat_ping())
    
    try:
        while True:
            try:
                data = await websocket.receive_text()
                crone_daemon.update_activity()
                
                try:
                    payload = json.loads(data)
                    if payload.get("type") == "ping":
                        await websocket.send_json({"type": "pong", "sent_at": payload.get("sent_at")})
                        continue
                        
                    if payload.get("type") == "SWITCH_TO_STUDIO":
                        active_module = "studio"
                        print("[Power-State] Switching to STUDIO. Suspending companion loops.")
                        try:
                            crone_daemon.pause_job("proactive_caring")
                            crone_daemon.pause_job("Heartbeat Daemon")
                            crone_daemon.pause_job("Memory Pruning")
                        except Exception as e:
                            print(f"[Power-State] Job pause warning: {e}")
                        await websocket.send_json({"type": "power_state", "state": "SLEEP"})
                        continue

                    if payload.get("type") == "SWITCH_TO_COMPANION":
                        active_module = "companion"
                        print("[Power-State] Switching to COMPANION. Resuming companion loops.")
                        try:
                            crone_daemon.resume_job("proactive_caring")
                            crone_daemon.resume_job("Heartbeat Daemon")
                            crone_daemon.resume_job("Memory Pruning")
                        except Exception as e:
                            print(f"[Power-State] Job resume warning: {e}")
                        await websocket.send_json({"type": "power_state", "state": "WAKE"})
                        continue
                        
                    if payload.get("type") == "chat":
                        user_text = payload.get("content", data)
                        client_id = payload.get("client_id")
                    elif payload.get("type"):
                        continue
                    else:
                        user_text = payload.get("content", data)
                        client_id = payload.get("client_id")
                except Exception:
                    user_text = data
                    client_id = None
                
                try:
                    msg_id = await asyncio.to_thread(history_manager.add_message, "You", user_text)
                    await crone_daemon.broadcast_event("history_updated")
                    
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
                        clean_query = " ".join([w for w in words if not w.startswith('@')])
                        mentions = [w for w in words if w.startswith('@')]
                        clean_mentions = [m.lstrip('@') for m in mentions]

                        await websocket.send_json({"type": "status", "content": "Retrieving Memories..."})
                        is_intimate_turn = intimacy_mode
                        
                        context = await memory_orchestrator.assemble_context(clean_query, clean_mentions, is_intimate=is_intimate_turn)
                        await websocket.send_json({"type": "status", "content": "Thinking..."})
                        emotion_manager.on_user_interaction()

                        async def handle_status_update(status_data):
                            try: await websocket.send_json(status_data)
                            except: pass

                        try:
                            response_text = await asyncio.wait_for(
                                brain_orchestrator.execute_request(
                                    clean_query, context, is_intimate=is_intimate_turn, on_status=handle_status_update, kernel="companion"
                                ),
                                timeout=60.0
                            )
                        except asyncio.TimeoutError:
                            response_text = brain_orchestrator._local_heart_fallback("timeout")
                            await websocket.send_json({"type": "status", "content": "TIMEOUT", "message": "AI Execution Exceeded 8s"})

                        global pending_intimacy_offer, offer_timestamp
                        if "[REQ_INTIMACY]" in response_text:
                            if emotion_manager.intimacy_gate():
                                pending_intimacy_offer = True
                                offer_timestamp = time.time()
                                response_text = response_text.replace("[REQ_INTIMACY]", "").strip()
                                await websocket.send_json({"type": "intimacy_offer_active"})
                            else:
                                response_text = emotion_manager.soft_deflect_response()

                        if response_text:
                            mia_msg_id = await asyncio.to_thread(history_manager.add_message, "MIA", response_text)
                        
                        await websocket.send_json({"type": "status", "content": "Speaking..."})
                        current_state = emotion_manager.get_state()
                        is_intimate_audio = intimacy_mode or current_state["mood"] in ["Intense", "Affectionate", "Glow"]
                        
                        await crone_daemon.broadcast_event("history_updated")
                        await websocket.send_json({
                            "type": "message", 
                            "id": mia_msg_id,
                            "user_msg_id": msg_id, 
                            "client_id": client_id, 
                            "content": response_text, 
                            "audio": None 
                        })

                        slices = re.split(r'([.!?]+(?:\s+|$))', response_text)
                        sentences = []
                        current = ""
                        for s in slices:
                            current += s
                            if (re.search(r'[.!?]+(?:\s+|$)', s) and len(current) > 300) or len(current) > 500:
                                if current.strip():
                                    sentences.append(current.strip())
                                current = ""
                        if current.strip():
                            sentences.append(current.strip())

                        for idx, sentence in enumerate(sentences):
                            try:
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

            except WebSocketDisconnect: raise
            except Exception: continue
            
    except WebSocketDisconnect:
        print("Frontend disconnected.")
    finally:
        crone_daemon.register_websocket(None)
        heartbeat_task.cancel()
