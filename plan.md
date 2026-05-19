app_path = r"d:\ProjectBuild\projects\mia\backend\api\companion_router.py"

with open(app_path, "r", encoding="utf-8") as f:
    content = f.read()

# 1. Add active_module variable
old_state = """# --- STATE VARIABLES ---
intimacy_mode = False  # Global state for Intimacy Mode
pending_intimacy_offer = False
offer_timestamp = 0"""

new_state = """# --- STATE VARIABLES ---
intimacy_mode = False  # Global state for Intimacy Mode
pending_intimacy_offer = False
offer_timestamp = 0
active_module = "companion" # Dynamic active engine state"""

content = content.replace(old_state, new_state)

# 2. Add /api/power_state endpoint
old_health = """@companion_router.get("/health")
async def health_check():
    return {"status": "ok", "timestamp": time.time()}"""

new_health = """@companion_router.get("/health")
async def health_check():
    return {"status": "ok", "timestamp": time.time()}

@companion_router.get("/api/power_state")
async def get_power_state():
    return {"active_module": active_module, "state": "SLEEP" if active_module == "studio" else "WAKE"}"""

content = content.replace(old_health, new_health)

# 3. Add Switch logic to websocket
old_ping = """                    if payload.get("type") == "ping":
                        await websocket.send_json({"type": "pong", "sent_at": payload.get("sent_at")})
                        continue"""

new_ping = """                    if payload.get("type") == "ping":
                        await websocket.send_json({"type": "pong", "sent_at": payload.get("sent_at")})
                        continue
                        
                    if payload.get("type") == "SWITCH_TO_STUDIO":
                        global active_module
                        active_module = "studio"
                        print("[Power-State] Switching to STUDIO. Suspending companion loops.")
                        crone_daemon.pause_job("proactive_caring")
                        crone_daemon.pause_job("Heartbeat Daemon")
                        await websocket.send_json({"type": "power_state", "state": "SLEEP"})
                        continue

                    if payload.get("type") == "SWITCH_TO_COMPANION":
                        global active_module
                        active_module = "companion"
                        print("[Power-State] Switching to COMPANION. Resuming companion loops.")
                        crone_daemon.resume_job("proactive_caring")
                        crone_daemon.resume_job("Heartbeat Daemon")
                        await websocket.send_json({"type": "power_state", "state": "WAKE"})
                        continue"""

content = content.replace(old_ping, new_ping)

# 4. Modify process_speech_to_text safeguard
old_stt = """@companion_router.post("/api/stt")
async def process_speech_to_text(audio: UploadFile = File(...)):
    text = await stt_service.transcribe_audio(audio)"""

new_stt = """@companion_router.post("/api/stt")
async def process_speech_to_text(audio: UploadFile = File(...)):
    if active_module == "studio":
        return {"status": "error", "message": "Companion loops are currently suspended in Sleep Mode."}
    text = await stt_service.transcribe_audio(audio)"""

content = content.replace(old_stt, new_stt)

with open(app_path, "w", encoding="utf-8") as f:
    f.write(content)

print("companion_router.py refactored successfully!")
