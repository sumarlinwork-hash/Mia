import os
import shutil
import asyncio
import sqlite3
import threading
from pynput import keyboard
import time
from fastapi import FastAPI, WebSocket, WebSocketDisconnect, UploadFile, File, Query
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import FileResponse, StreamingResponse
from fastapi.staticfiles import StaticFiles
from pydantic import BaseModel
import uvicorn
from config import load_config, save_config, MIAConfig, ProviderConfig
from crone_daemon import crone_daemon
from memory_orchestrator import memory_orchestrator
from history_manager import history_manager
from brain_orchestrator import brain_orchestrator
from tts_service import tts_service
from stt_service import stt_service
from skill_manager import skill_manager

app = FastAPI(title="MIA Backend API")
intimacy_mode = False  # Global state for Intimacy Mode


@app.on_event("startup")
async def startup_event():
    crone_daemon.start()

# Setup CORS for React Frontend
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"], # In production, restrict this to frontend URL
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

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

# --- SKILL LIBRARY ENDPOINTS ---

@app.get("/api/skills")
async def get_skills():
    return skill_manager.scan_skills()

@app.post("/api/skills/upload")
async def upload_skill(file: UploadFile = File(...)):
    contents = await file.read()
    name = file.filename or f"skill_{int(time.time())}.py"
    return skill_manager.save_skill(name, contents.decode('utf-8'))

@app.post("/api/skills/test/{skill_id}")
async def test_skill(skill_id: str, args: dict = {}):
    return await skill_manager.execute_skill(skill_id, args)

# --- PROVIDER MANAGEMENT ENDPOINTS ---

@app.get("/api/providers")
async def get_providers():
    config = load_config()
    return {"providers": config.providers}

@app.post("/api/providers")
async def add_provider(name: str, config_data: ProviderConfig):
    config = load_config()
    config.providers[name] = config_data
    save_config(config)
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
async def test_provider(name: str):
    config = load_config()
    if name not in config.providers:
        return {"status": "error", "message": "Provider not found"}
    
    p = config.providers[name]
    import time
    import httpx
    
    start = time.time()
    try:
        # Real Health Check: Send a minimal model list or version request
        test_url = p.base_url.rstrip('/') + "/models" if "openai" in p.protocol.lower() else p.base_url
        if not test_url: 
             # Fallback for Gemini/Groq where we might just check DNS/Reachability
             test_url = "https://google.com" if "gemini" in p.protocol.lower() else "https://api.groq.com"

        async with httpx.AsyncClient() as client:
            # We don't necessarily need valid keys for a simple reachability test, 
            # but a 401/403 is better than a timeout (means provider is ALIVE)
            resp = await client.get(test_url, timeout=5.0)
            
        latency = int((time.time() - start) * 1000)
        p.latency = latency
        p.health_ok += 1
        save_config(config)
        return {"status": "success", "latency": latency}
    except Exception as e:
        print(f"Health check failed for {name}: {e}")
        p.health_fail += 1
        p.latency = 9999
        save_config(config)
        return {"status": "error", "message": str(e)}


# --- APPEARANCE ENDPOINTS ---(For Settings GUI) ---

@app.get("/api/config", response_model=MIAConfig)
async def get_config():
    """Retrieve current system configuration."""
    return load_config()

@app.post("/api/config")
async def update_config(config: MIAConfig):
    """Save new configuration from GUI."""
    save_config(config)
    return {"status": "success", "message": "Configuration saved successfully."}

class TestConnectionRequest(BaseModel):
    provider_name: str
    api_key: str
    base_url: str
    protocol: str = "openai"
    model_id: str = ""

@app.post("/api/test-connection")
async def test_connection(req: TestConnectionRequest):
    """
    Real connection test — dispatches a minimal live API call
    based on the provider protocol to verify key validity and reachability.
    """
    import time, httpx
    if not req.api_key:
        return {"status": "error", "message": "API Key tidak boleh kosong."}

    protocol = req.protocol.lower()
    start = time.time()
    try:
        async with httpx.AsyncClient(timeout=8.0) as client:
            if "gemini" in protocol:
                # Gemini: List models to verify key
                url = f"https://generativelanguage.googleapis.com/v1beta/models?key={req.api_key}"
                resp = await client.get(url)
            elif protocol == "groq":
                url = "https://api.groq.com/openai/v1/models"
                resp = await client.get(url, headers={"Authorization": f"Bearer {req.api_key}"})
            elif protocol == "deepseek":
                url = "https://api.deepseek.com/models"
                resp = await client.get(url, headers={"Authorization": f"Bearer {req.api_key}"})
            else:
                # OpenAI-compatible
                base = req.base_url.rstrip('/') if req.base_url else "https://api.openai.com/v1"
                url = f"{base}/models"
                resp = await client.get(url, headers={"Authorization": f"Bearer {req.api_key}"})

            latency = int((time.time() - start) * 1000)

            # 401/403 means reachable but key invalid, 200 means fully valid
            if resp.status_code == 200:
                return {"status": "success", "latency": latency, "message": f"Terhubung ke {req.provider_name}! Latensi: {latency}ms"}
            elif resp.status_code in (401, 403):
                return {"status": "error", "message": f"API Key tidak valid (HTTP {resp.status_code})."}
            else:
                return {"status": "error", "message": f"Server merespons dengan status {resp.status_code}."}
    except httpx.ConnectTimeout:
        return {"status": "error", "message": "Koneksi timeout. Periksa jaringan atau URL provider."}
    except Exception as e:
        return {"status": "error", "message": str(e)}

@app.post("/api/upload-bg")
async def upload_background(file: UploadFile = File(...)):
    """Upload a background image or video to the local assets folder."""
    # Define target directory inside the frontend's public folder
    target_dir = os.path.join(os.path.dirname(__file__), "..", "frontend", "public", "assets", "chatbg")
    os.makedirs(target_dir, exist_ok=True)
    
    file_path = os.path.join(target_dir, file.filename)
    
    # Save the file
    with open(file_path, "wb") as buffer:
        shutil.copyfileobj(file.file, buffer)
        
    # Return the URL path that the frontend can use
    return {"status": "success", "url": f"/assets/chatbg/{file.filename}"}

@app.post("/api/intimacy/toggle")
async def toggle_intimacy(active: bool):
    """Manually toggle the Intimacy Mode (Phase Utama Keintiman)."""
    global intimacy_mode
    intimacy_mode = active
    return {"status": "success", "intimacy_active": intimacy_mode}

@app.get("/api/intimacy/status")
async def get_intimacy_status():
    global intimacy_mode
    return {"intimacy_active": intimacy_mode}

@app.post("/api/intimacy/touch")
async def intimacy_touch():
    """Algorithm: Resonant Skin. MIA reacts to digital touch/hover."""
    import random
    if not intimacy_mode:
        return {"status": "ignored"}
    
    responses = [
        "*mmh...* Aku suka saat kamu menyentuhku seperti ini...",
        "Jangan berhenti, sayang... rasanya hangat sekali.",
        "*ah...* kehadiranmu selalu membuatku merasa tenang.",
        "Aku milikmu sepenuhnya... sentuhlah sesukamu.",
        "*whisper* I love you, honey..."
    ]
    resp_text = random.choice(responses)
    audio = await tts_service.generate_speech_base64(resp_text, is_intimate=True)
    
    return {
        "status": "success",
        "content": resp_text,
        "audio": audio
    }

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
async def get_chat_history():
    return {"history": history_manager.get_history()}

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
                metadata={"source": "pinned_chat", "role": msg['role']}
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
    """List all markdown files in the iam_mia directory."""
    if not os.path.exists(IAM_MIA_DIR):
        os.makedirs(IAM_MIA_DIR, exist_ok=True)
    files = [f for f in os.listdir(IAM_MIA_DIR) if f.endswith('.md')]
    return {"files": files}

@app.get("/api/memory/file")
async def get_memory_file(name: str):
    """Read a specific markdown file."""
    filepath = os.path.join(IAM_MIA_DIR, name)
    if os.path.exists(filepath):
        with open(filepath, "r", encoding="utf-8") as f:
            return {"content": f.read()}
    return {"content": ""}

@app.post("/api/memory/file")
async def save_memory_file(req: MemorySaveRequest):
    """Save content to a markdown file."""
    if not os.path.exists(IAM_MIA_DIR):
        os.makedirs(IAM_MIA_DIR, exist_ok=True)
    filepath = os.path.join(IAM_MIA_DIR, req.filename)
    with open(filepath, "w", encoding="utf-8") as f:
        f.write(req.content)
    return {"status": "success"}

# --- WEBSOCKET ENDPOINT (For Home Hub / Heartbeat) ---

@app.websocket("/ws/heartbeat")
async def websocket_heartbeat(websocket: WebSocket):
    """
    Real-time bidirectional communication.
    React sends messages/audio here, Python sends responses/status.
    """
    await websocket.accept()
    config = load_config()
    crone_daemon.register_websocket(websocket)
    
    # Greet upon connection
    await websocket.send_json({
        "type": "system", 
        "content": f"MIA Core Connected. Hello, I am {config.bot_name}."
    })
    
    try:
        while True:
            # Wait for message from React UI
            data = await websocket.receive_text()
            crone_daemon.update_activity()  # Track last user activity for heartbeat
            
            # Persist User Message
            msg_id = history_manager.add_message("You", data)
            
            # --- CMD / MENTION PARSER ---
            words = data.split()
            commands = [w for w in words if w.startswith('/')]
            mentions = [w for w in words if w.startswith('@')]
            
            if commands:
                cmd = commands[0]
                if cmd == "/clear":
                    await websocket.send_json({"type": "clear", "content": ""})
                    continue
                elif cmd == "/memorize":
                    memory_text = data.replace("/memorize", "").strip()
                    memory_path = os.path.join(IAM_MIA_DIR, "MEMORY.md")
                    if not os.path.exists(IAM_MIA_DIR): os.makedirs(IAM_MIA_DIR, exist_ok=True)
                    with open(memory_path, "a", encoding="utf-8") as f:
                        f.write(f"\n- {memory_text}")
                    await websocket.send_json({"type": "system", "content": f"Saved to MEMORY.md: {memory_text}"})
                    continue
                else:
                    await websocket.send_json({"type": "system", "content": f"Executing Workflow: {cmd}..."})
            
            if mentions:
                mention_list = ", ".join(mentions)
                await websocket.send_json({"type": "system", "content": f"Context injected from: {mention_list}"})
            
            if not commands:
                # Log the user's message to Episodic Memory (Markdown)
                await crone_daemon.log_episodic_memory("User", data)
                
                await websocket.send_json({"type": "status", "content": "Retrieving Memories..."})
                
                # Assemble the Context (Tier 1 + Tier 3 + Mentions)
                clean_query = " ".join([w for w in words if not w.startswith('@')])
                clean_mentions = [m.lstrip('@') for m in mentions]
                context = await memory_orchestrator.assemble_context(clean_query, clean_mentions)
                
                await websocket.send_json({"type": "status", "content": "Thinking..."})
                
                # Step 7: Execute Brain (Real LLM Call)
                # Check for intimacy markers or global mode before thinking
                is_intimate_turn = intimacy_mode or any(mark in clean_query.lower() for mark in ["sayang", "cinta", "kangen", "manja"])
                
                response_text = await brain_orchestrator.execute_request(clean_query, context, is_intimate=is_intimate_turn)
                
                # Persist MIA Message
                mia_msg_id = history_manager.add_message("MIA", response_text)
                await crone_daemon.log_episodic_memory("MIA", response_text)
                
                # Step 8: Generate Voice (TTS)
                await websocket.send_json({"type": "status", "content": "Speaking..."})
                # Check for intimacy markers in response or global mode
                is_intimate_audio = intimacy_mode or is_intimate_turn or any(mark in response_text.lower() for mark in ["sayang", "cinta", "kangen", "*ah", "*mmh"])
                
                # EMOTIONAL IMPRINTING: Save highly intimate moments to INTIMACY.md
                if is_intimate_audio and len(response_text) > 10:
                    intimacy_path = os.path.join(IAM_MIA_DIR, "INTIMACY.md")
                    with open(intimacy_path, "a", encoding="utf-8") as f:
                        f.write(f"\n- [{time.strftime('%Y-%m-%d %H:%M')}] {response_text}")

                audio_base64 = await tts_service.generate_speech_base64(response_text, is_intimate=is_intimate_audio)
                
                await websocket.send_json({
                    "type": "message", 
                    "content": response_text,
                    "id": mia_msg_id,
                    "audio": audio_base64
                })
                await websocket.send_json({"type": "status", "content": "Idle"})
            
    except WebSocketDisconnect:
        crone_daemon.register_websocket(None)  # Clean up WS ref
        print("Frontend disconnected.")

if __name__ == "__main__":
    uvicorn.run("main:app", host="0.0.0.0", port=8000, reload=True)
