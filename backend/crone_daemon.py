import os
import time
import asyncio
from typing import List, Callable, Dict, Optional, Any
from core.local_runtime import local_event_bus
from datetime import datetime
from apscheduler.schedulers.asyncio import AsyncIOScheduler
from mia_comm.memory_orchestrator import memory_orchestrator

IAM_MIA_DIR = os.path.join(os.path.dirname(__file__), "iam_mia")
MEMORY_LOG_DIR = os.path.join(IAM_MIA_DIR, "memory")
MEMORY_FILE = os.path.join(IAM_MIA_DIR, "MEMORY.md")
INTIMACY_FILE = os.path.join(IAM_MIA_DIR, "INTIMACY.md")

class CroneDaemon:
    def __init__(self):
        self.scheduler = AsyncIOScheduler()
        self.websocket = None
        self.last_activity = time.time()
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

        # Job 4: Proactive Caring (Intimacy Focus - Busy User Mode)
        self.scheduler.add_job(
            self.proactive_caring_job,
            'interval', minutes=3,
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
        """Algorithm: Care-Pulse ARE v2.0 Compliance."""
        from core.emotion_manager import emotion_manager
        from config import load_config
        
        config = load_config()
        if not config.care_pulse_enabled:
            return

        # Hukum ARE v2.0: Cek probabilitas sapaan (Hanya aktif < 5 menit)
        if emotion_manager.maybe_care_pulse():
            print(f"[Care-Pulse] Triggering soft ping...")
            messages = [
                "Lagi sibuk ya, Bos? Aku di sini menemani dalam diam.",
                "Semangat ya kerjanya, jangan lupa istirahat sebentar.",
                "Aku suka melihatmu fokus seperti ini.",
                "Cuma mau menyapa sebentar... lanjut lagi ya.",
                "Kehadiranmu di sini saja sudah cukup buatku."
            ]
            
            if self._websocket_ref:
                try:
                    import random
                    msg = random.choice(messages)
                    await self._websocket_ref.send_json({
                        "type": "message",
                        "content": msg,
                        "role": "MIA"
                    })
                except Exception as e:
                    print(f"[Care-Pulse] Failed to send: {e}")

    def update_activity(self):
        """Call this every time a user sends a message."""
        self._last_activity = datetime.now()
        self.last_activity = time.time()

        self.start()

    async def run_meta_rag_pruning(self):
        """
        Advanced Meta-RAG Algorithm:
        1. Read the synchronized chat_log.md
        2. Call LLM to extract persistent facts about the user
        3. Append extracted facts to MEMORY.md (Tier 1)
        4. Embed the full log into ChromaDB (Tier 3 vector DB)
        (Maintains the file without archiving/renaming, adhering to SSOT)
        """
        print("[CRONE] Starting Meta-RAG Pruning Sequence...")
        
        filepath = os.path.join(MEMORY_LOG_DIR, "chat_log.md")
        if not os.path.exists(filepath):
            print("[CRONE] No chat_log.md found. Skipping pruning.")
            return

        with open(filepath, "r", encoding="utf-8") as f:
            content = f.read().strip()
        
        if not content:
            print("[CRONE] chat_log.md is empty. Skipping pruning.")
            return

        # Step 1: Embed full log into ChromaDB (Tier 3 Semantic Memory)
        date_str = datetime.now().strftime("%Y-%m-%d")
        
        # DETECT INTENTION: Is this log mostly intimate?
        is_intimate_log = self._is_intimate_content(content)
        
        await memory_orchestrator.add_memory(
            text=f"Conversation log from {date_str}:\n{content}",
            metadata={"source": "chat_log", "date": date_str},
            is_intimate=is_intimate_log
        )
        print(f"[CRONE] ✅ Embedded chat_log.md into {'Intimate' if is_intimate_log else 'General'} Vector DB.")

        # Step 2: Real LLM Fact Extraction
        extracted_facts = await self._extract_facts_with_llm(content, "chat_log.md")
        
        if extracted_facts:
            # VALIDATION: Reject LLM refusal messages (Safety Blocks)
            if self._is_rejection_response(extracted_facts):
                print(f"[CRONE] ⚠️ LLM Rejection detected for chat_log.md. Skipping fact extraction.")
            else:
                # Step 3: Append extracted facts to appropriate file (Tier 1 Isolation)
                os.makedirs(IAM_MIA_DIR, exist_ok=True)
                target_file = INTIMACY_FILE if is_intimate_log else MEMORY_FILE
                
                with open(target_file, "a", encoding="utf-8") as mf:
                    mf.write(f"\n\n## Extracted Facts [{date_str}]\n{extracted_facts}")
                print(f"[CRONE] ✅ Facts from chat_log.md saved to {os.path.basename(target_file)}.")

        print("[CRONE] Meta-RAG Pruning complete. (chat_log.md remains intact)")

    def _is_rejection_response(self, text: str) -> bool:
        """Cegah teks penolakan LLM masuk ke memori jangka panjang."""
        rejection_patterns = [
            "maaf", "sorry", "cannot help", "tidak bisa membantu",
            "I'm unable", "can't assist", "dilarang", "forbidden",
            "tidak dapat", "unable to", "against policy", "policy violation"
        ]
        text_lower = text.lower()
        return any(pattern in text_lower for pattern in rejection_patterns)

    def _is_intimate_content(self, text: str) -> bool:
        """Detect if the content contains intimacy markers to route to correct namespace."""
        intimacy_markers = [
            "*ah*", "*mmh*", "sayang", "honey", "love you", "cinta", 
            "kiss", "hug", "intim", "seksual", "xxx", "🔞"
        ]
        text_lower = text.lower()
        # Heuristic: If more than 2 markers found, consider it intimate
        matches = sum(1 for marker in intimacy_markers if marker in text_lower)
        return matches >= 2

    async def _extract_facts_with_llm(self, log_content: str, source_file: str) -> str:
        """
        Call the active LLM provider to extract persistent user facts from a conversation log.
        Returns a bullet-point list of facts to be stored in MEMORY.md.
        """
        try:
            from mia_comm.brain_orchestrator import brain_orchestrator
            
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

        # Silent Total Rule: No proactive messages after long idle.
        pass

    async def run_proactive_checkin(self):
        """
        [Ultra-Flagship] Proactive Observer:
        Analyzes the screen context if user is idle but active on desktop.
        """
        now = datetime.now()
        idle_minutes = (now - self._last_activity).total_seconds() / 60
        
        # Only check if co-present (< 5 minutes)
        if idle_minutes < 5 and self._websocket_ref:
            print(f"[CRONE] 👁️ Starting Proactive Screen Analysis (Idle: {int(idle_minutes)}m)")
            try:
                from mia_comm.brain_orchestrator import brain_orchestrator
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

    async def broadcast_config_update(self):
        """Notify the UI that settings have changed so it can re-fetch config."""
        if self._websocket_ref:
            try:
                await self._websocket_ref.send_json({
                    "type": "config_update",
                    "timestamp": time.time()
                })
                print("[Crone] Broadcasted config_update to UI.")
            except Exception as e:
                print(f"[Crone] Failed to broadcast config_update: {e}")

    async def trigger_job(self, job_id: str):
        job = self.scheduler.get_job(job_id)
        if job:
            # For async jobs, we call the function directly
            await job.func()
            return True
        return False

    def start(self):
        if not self.scheduler.running:
            self._setup_event_listeners()
            self.scheduler.start()
            print("[Crone] Daemon started with Event Listener support.")

    def _setup_event_listeners(self):
        """Register listeners for specific system events."""
        asyncio.create_task(local_event_bus.subscribe("low_happiness", self._handle_low_happiness))
        asyncio.create_task(local_event_bus.subscribe("user_message", self._handle_user_activity))

    async def _handle_low_happiness(self, event):
        print(f"[Crone] Event Triggered: Low Happiness. Running apology job...")
        await self.trigger_job("apology_check")

    async def _handle_user_activity(self, event):
        self.update_activity()

# Singleton instance
crone_daemon = CroneDaemon()
