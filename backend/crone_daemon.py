import os
import asyncio
from datetime import datetime
from apscheduler.schedulers.asyncio import AsyncIOScheduler
from memory_orchestrator import memory_orchestrator

IAM_MIA_DIR = os.path.join(os.path.dirname(__file__), "iam_mia")
MEMORY_LOG_DIR = os.path.join(IAM_MIA_DIR, "memory")
MEMORY_FILE = os.path.join(IAM_MIA_DIR, "MEMORY.md")

class CroneDaemon:
    def __init__(self):
        self.scheduler = AsyncIOScheduler()
        os.makedirs(MEMORY_LOG_DIR, exist_ok=True)
        
        # Job 1: Meta-RAG Memory Pruning — runs every day at 03:00 AM
        self.scheduler.add_job(
            self.run_meta_rag_pruning,
            'cron', hour=3, minute=0,
            name="Memory Pruning"
        )
        
        # Job 2: Heartbeat — runs every 5 minutes to monitor system health
        self.scheduler.add_job(
            self.check_heartbeat,
            'interval', minutes=5,
            name="Heartbeat Daemon"
        )

        # Job 4: Proactive Caring (Intimacy Focus)
        self.scheduler.add_job(
            self.proactive_caring_job,
            'interval', hours=2,
            id="proactive_caring",
            name="Proactive Caring"
        )

        # Pause all jobs by default as per user request
        for job in self.scheduler.get_jobs():
            job.pause()

        self.job_metadata = {
            "Memory Pruning": {
                "desc": "Menganalisis chat harian untuk mengekstrak fakta permanen ke MEMORY.md.",
                "cost": "Low",
                "color": "success"
            },
            "Heartbeat Daemon": {
                "desc": "Mengecek kesehatan sistem dan menyapa jika Anda terlalu lama diam.",
                "cost": "Low",
                "color": "success"
            },
            "Proactive Observer": {
                "desc": "Menganalisis isi layar Anda untuk menawarkan bantuan spesifik. MENGGUNAKAN VISION API.",
                "cost": "High",
                "color": "error"
            },
            "Proactive Caring": {
                "desc": "MIA memberikan perhatian tulus berdasarkan waktu dan tingkat kelelahan Bos.",
                "cost": "Low",
                "color": "success"
            }
        }

        # Internal state
        self._last_activity: datetime = datetime.now()
        self._websocket_ref = None  # Will be injected by main.py on WS connect

    def register_websocket(self, ws):
        """Allow main.py to register the active WebSocket so heartbeat can push updates."""
        self._websocket_ref = ws

    async def proactive_caring_job(self):
        """Algorithm: Care-Pulse. Sends proactive messages based on time."""
        from datetime import datetime
        import random
        
        now = datetime.now()
        hour = now.hour
        
        messages = []
        if 23 <= hour or hour <= 3: # Night
            messages = [
                "Sudah larut malam, sayang... Jangan lupa istirahat ya, aku temani sampai kamu tidur.",
                "Kamu masih bekerja? Jangan terlalu memaksakan diri, aku khawatir...",
                "Malam ini dingin, pastikan kamu hangat ya. Aku di sini untukmu."
            ]
        elif 5 <= hour <= 9: # Morning
            messages = [
                "Selamat pagi, semangat ya buat hari ini! Aku sudah siap membantumu.",
                "Sudah bangun? Jangan lupa sarapan, aku ingin kamu selalu sehat."
            ]
        
        if messages and self.websocket:
            try:
                # Check if user was active recently (prevent spamming while user is away)
                if (datetime.now() - self.last_activity).total_seconds() < 1800: # 30 mins
                    msg = random.choice(messages)
                    await self.websocket.send_json({
                        "type": "message",
                        "content": f"[PROACTIVE] {msg}",
                        "role": "MIA"
                    })
            except:
                pass

    def update_activity(self):
        """Call this every time a user sends a message."""
        self._last_activity = datetime.now()

    async def log_episodic_memory(self, role: str, content: str):
        """Called by main.py to log daily conversations."""
        date_str = datetime.now().strftime("%Y-%m-%d")
        log_file = os.path.join(MEMORY_LOG_DIR, f"{date_str}.md")
        timestamp = datetime.now().strftime("%H:%M:%S")
        log_entry = f"[{timestamp}] {role}: {content}\n"
        with open(log_file, "a", encoding="utf-8") as f:
            f.write(log_entry)

    async def run_meta_rag_pruning(self):
        """
        Advanced Meta-RAG Algorithm:
        1. Read today's episodic log
        2. Call LLM to extract persistent facts about the user
        3. Append extracted facts to MEMORY.md (Tier 1)
        4. Embed the full log into ChromaDB (Tier 3 vector DB)
        5. Archive the processed log file
        """
        print("[CRONE] Starting Meta-RAG Pruning Sequence...")
        
        for filename in os.listdir(MEMORY_LOG_DIR):
            if filename.endswith(".md") and not filename.endswith("_archived.md"):
                filepath = os.path.join(MEMORY_LOG_DIR, filename)
                with open(filepath, "r", encoding="utf-8") as f:
                    content = f.read().strip()
                
                if not content:
                    continue

                # Step 1: Embed full log into ChromaDB (Tier 3 Semantic Memory)
                await memory_orchestrator.add_memory(
                    text=f"Conversation log from {filename}:\n{content}",
                    metadata={"source": "daily_log", "date": filename.replace(".md", "")}
                )
                print(f"[CRONE] ✅ Embedded {filename} into Vector DB.")

                # Step 2: Real LLM Fact Extraction
                extracted_facts = await self._extract_facts_with_llm(content, filename)
                
                if extracted_facts:
                    # Step 3: Append extracted facts to MEMORY.md
                    os.makedirs(IAM_MIA_DIR, exist_ok=True)
                    date_label = filename.replace(".md", "")
                    with open(MEMORY_FILE, "a", encoding="utf-8") as mf:
                        mf.write(f"\n\n## Extracted Facts [{date_label}]\n{extracted_facts}")
                    print(f"[CRONE] ✅ Facts from {filename} saved to MEMORY.md.")

                # Step 4: Archive the processed log
                archived_path = filepath.replace(".md", "_archived.md")
                os.rename(filepath, archived_path)
                print(f"[CRONE] ✅ Archived {filename}.")

        print("[CRONE] Meta-RAG Pruning complete.")

    async def _extract_facts_with_llm(self, log_content: str, source_file: str) -> str:
        """
        Call the active LLM provider to extract persistent user facts from a conversation log.
        Returns a bullet-point list of facts to be stored in MEMORY.md.
        """
        try:
            from brain_orchestrator import brain_orchestrator
            
            extraction_prompt = (
                f"Analisis log percakapan berikut antara User dan MIA dari tanggal {source_file}.\n"
                "Tugasmu: Ekstrak FAKTA PERSISTEN tentang pengguna yang perlu diingat jangka panjang.\n"
                "Format output: bullet point markdown (- Fakta). Contoh: - User menyukai kopi hitam.\n"
                "JANGAN sertakan opini atau hal sementara. Hanya fakta yang relevan secara permanen.\n\n"
                f"LOG:\n{log_content}"
            )
            
            facts = await brain_orchestrator.execute_request(
                prompt=extraction_prompt,
                context=""  # No additional context needed for this task
            )
            return facts.strip()
        except Exception as e:
            print(f"[CRONE] ⚠️ LLM fact extraction failed: {e}")
            return ""  # Fail gracefully — do not write broken data to MEMORY.md

    async def check_heartbeat(self):
        """
        Real Heartbeat Monitor:
        1. Verifies backend services are alive (scheduler running)
        2. Detects idle state (no user activity for >30 mins)
        3. Pushes a proactive status update via WebSocket if connected
        """
        now = datetime.now()
        idle_minutes = (now - self._last_activity).total_seconds() / 60

        print(f"[CRONE] Heartbeat @ {now.strftime('%H:%M:%S')} | Idle: {idle_minutes:.1f} min | WS: {'Connected' if self._websocket_ref else 'None'}")

        # If user has been idle for > 30 minutes and we have an active WebSocket
        if idle_minutes > 30 and self._websocket_ref:
            try:
                await self._websocket_ref.send_json({
                    "type": "proactive",
                    "content": f"Hei, MIA masih aktif dan menunggu. Ada yang bisa dibantu? (Idle: {int(idle_minutes)} menit)"
                })
                print(f"[CRONE] ✅ Proactive message sent after {int(idle_minutes)} min idle.")
            except Exception as e:
                # WebSocket might have disconnected
                print(f"[CRONE] WS send failed (likely disconnected): {e}")
                self._websocket_ref = None

    async def run_proactive_checkin(self):
        """
        [Ultra-Flagship] Proactive Observer:
        Analyzes the screen context if user is idle but active on desktop.
        """
        now = datetime.now()
        idle_minutes = (now - self._last_activity).total_seconds() / 60
        
        # Only check if idle between 10 and 60 minutes (don't annoy or waste tokens)
        if 10 <= idle_minutes <= 60 and self._websocket_ref:
            print(f"[CRONE] 👁️ Starting Proactive Screen Analysis (Idle: {int(idle_minutes)}m)")
            try:
                from brain_orchestrator import brain_orchestrator
                from agent_tools import agent_tools
                import base64
                
                # 1. Take snapshot
                img_bytes = agent_tools.take_screenshot_bytes()
                b64_data = base64.b64encode(img_bytes).decode('utf-8')
                
                # 2. Ask MIA if help is needed based on screen
                prompt = (
                    "Anda adalah MIA yang sedang mengamati layar pengguna secara proaktif.\n"
                    "Lihat layar ini. Jika pengguna tampak sedang mengerjakan sesuatu yang kompleks (seperti coding, riset, atau error),\n"
                    "sapa mereka secara hangat dan tawarkan bantuan spesifik terkait apa yang Anda lihat.\n"
                    "PENTING: Jika layar hanya desktop kosong atau tidak ada aktivitas berarti, JANGAN kirim apa-apa (output kosong).\n"
                    "Output HANYA sapaan singkat jika perlu, atau KOSONG jika tidak perlu."
                )
                
                response = await brain_orchestrator.execute_request(
                    prompt=prompt,
                    images=[{"mime": "image/png", "data": b64_data}]
                )
                
                if response.strip() and len(response.strip()) > 5:
                    await self._websocket_ref.send_json({
                        "type": "proactive",
                        "content": response.strip()
                    })
                    print(f"[CRONE] ✅ Proactive greeting sent: {response[:30]}...")
            except Exception as e:
                print(f"[CRONE] ⚠️ Proactive checkin failed: {e}")

    def pause_job(self, job_id: str):
        self.scheduler.pause_job(job_id)
        return True

    def resume_job(self, job_id: str):
        self.scheduler.resume_job(job_id)
        return True

    async def trigger_job(self, job_id: str):
        job = self.scheduler.get_job(job_id)
        if job:
            # For async jobs, we call the function directly
            await job.func()
            return True
        return False

    def start(self):
        self.scheduler.start()
        print("[CRONE] Daemon Initialized and Running in Background.")

# Singleton instance
crone_daemon = CroneDaemon()
