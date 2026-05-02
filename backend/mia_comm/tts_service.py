import os
import edge_tts
import base64
import tempfile
import uuid
import httpx
import json
import re
import subprocess
import shutil
from datetime import datetime
from config import load_config

class TTSService:
    def __init__(self):
        self.voice_id_edge = "id-ID-GadisNeural"
        
    async def generate_speech_base64(self, text: str, is_intimate: bool = False) -> str:
        config = load_config()
        engine = config.tts_engine
        
        # Cleaning text for TTS: Remove code blocks, markdown, and *emotion markers*
        import re
        text_to_speak = re.sub(r'```.*?```', '[Code Block]', text, flags=re.DOTALL)
        text_to_speak = re.sub(r'\*.*?\*', '', text_to_speak) # Remove *sigh*, *whisper*, etc.
        text_to_speak = re.sub(r'[*#_`~]', '', text_to_speak)
        if not text_to_speak.strip(): return ""

        try:
            if engine == "elevenlabs" and config.elevenlabs_api_key:
                return await self._elevenlabs_tts(text_to_speak, config, is_intimate)
            elif engine == "openai" and config.openai_api_key:
                return await self._openai_tts(text_to_speak, config)
            elif engine == "piper":
                return await self._piper_tts(text_to_speak, is_intimate)
            else:
                # Default: Edge-TTS
                return await self._edge_tts(text_to_speak, is_intimate)
        except Exception as e:
            print(f"[TTS] Primary Engine ({engine}) failed: {e}")
            print(f"[TTS] Falling back to local Piper...")
            try:
                return await self._piper_tts(text_to_speak, is_intimate)
            except Exception as pe:
                print(f"[TTS] Local Piper CRITICAL failure: {pe}")
                return "" # Return empty to avoid infinite loop

    async def _edge_tts(self, text: str, is_intimate: bool = False) -> str:
        temp_filename = os.path.join(tempfile.gettempdir(), f"mia_edge_{uuid.uuid4().hex}.mp3")
        
        # Reset to Natural Defaults
        pitch = "+0Hz" 
        rate = "+0%"
        
        if is_intimate:
            pitch = "+5Hz"   # Slightly softer
            rate = "+5%"    # Slightly faster but natural
            
        communicate = edge_tts.Communicate(text, self.voice_id_edge, pitch=pitch, rate=rate)
        await communicate.save(temp_filename)
        return self._file_to_base64(temp_filename)

    async def _elevenlabs_tts(self, text: str, config, is_intimate: bool = False) -> str:
        voice_id = config.elevenlabs_voice_id or "21m00Tcm4TlvDq8ikWAM" # Default Rachel
        url = f"https://api.elevenlabs.io/v1/text-to-speech/{voice_id}"
        headers = {"xi-api-key": config.elevenlabs_api_key, "Content-Type": "application/json"}
        
        # For intimacy in ElevenLabs, we lower stability to allow more "sighs/emotion"
        data = {
            "text": text,
            "model_id": "eleven_multilingual_v2",
            "voice_settings": {
                "stability": 0.35 if is_intimate else 0.5,
                "similarity_boost": 0.8,
                "style": 0.5 if is_intimate else 0.0,
                "use_speaker_boost": True
            }
        }
        
        async with httpx.AsyncClient() as client:
            resp = await client.post(url, json=data)
            if resp.status_code == 200:
                audio_base64 = base64.b64encode(resp.content).decode("utf-8")
                return f"data:audio/mp3;base64,{audio_base64}"
            return ""

    async def _openai_tts(self, text: str, config) -> str:
        url = "https://api.openai.com/v1/audio/speech"
        headers = {"Authorization": f"Bearer {config.openai_api_key}", "Content-Type": "json"}
        data = {"model": "tts-1", "voice": "nova", "input": text}
        
        async with httpx.AsyncClient() as client:
            resp = await client.post(url, json=data)
            if resp.status_code == 200:
                audio_base64 = base64.b64encode(resp.content).decode("utf-8")
                return f"data:audio/mp3;base64,{audio_base64}"
            return ""

    async def _piper_tts(self, text: str, is_intimate: bool = False) -> str:
        """
        Local Piper TTS Fallback.
        Ensures MIA can still talk offline.
        """
        # Robust Pathing: Derive root from this file's location (backend/mia_comm/tts_service.py)
        # Current file is 2 levels deep from backend root, and backend root is 1 level deep from project root
        current_file_dir = os.path.dirname(os.path.abspath(__file__))
        project_root = os.path.abspath(os.path.join(current_file_dir, "..", ".."))
        backend_root = os.path.abspath(os.path.join(current_file_dir, ".."))
        
        # Rollback: Use news_tts (Stable)
        model_path = os.path.join(backend_root, "data", "models", "id_ID-news_tts-medium.onnx")
        if not os.path.exists(model_path):
            print(f"[TTS] Piper model MISSING at: {model_path}")
            raise Exception(f"Piper model not found at {model_path}")

        temp_wav = os.path.join(tempfile.gettempdir(), f"mia_piper_{uuid.uuid4().hex}.wav")
        
        # Piper CLI command
        # Speed 1.3 to sound younger and energetic
        speed = "1.3" if not is_intimate else "1.1"
        
        # Note: Search for piper.exe in project root's .venv
        venv_path = os.path.join(project_root, ".venv", "Scripts", "piper.exe")
        if not os.path.exists(venv_path):
            venv_path = "piper" # Fallback to PATH

        piper_cmd = [
            venv_path, 
            "--model", model_path, 
            "--output_file", temp_wav,
            "--length_scale", str(1.0/float(speed))
        ]
        
        process = subprocess.Popen(piper_cmd, stdin=subprocess.PIPE, stdout=subprocess.PIPE, stderr=subprocess.PIPE)
        stdout, stderr = process.communicate(input=text.encode('utf-8'))
        
        if process.returncode != 0:
            raise Exception(f"Piper execution failed: {stderr}")

        # Post-Processing: Increase Pitch by 100% using FFmpeg
        # Formula: Increase sampling rate (asetrate) + Fix tempo (atempo)
        pitched_wav = os.path.join(tempfile.gettempdir(), f"mia_pitched_{uuid.uuid4().hex}.wav")
        # 22050 * 2 = 44100 (Double pitch)
        ffmpeg_cmd = [
            "ffmpeg", "-y", "-i", temp_wav,
            "-af", "asetrate=44100,atempo=0.5,atempo=1.0", 
            pitched_wav
        ]
        
        try:
            subprocess.run(ffmpeg_cmd, capture_output=True, check=True)
            if os.path.exists(pitched_wav):
                # Replace original with pitched version
                os.remove(temp_wav)
                temp_wav = pitched_wav
        except Exception as fe:
            print(f"[TTS] FFmpeg Pitch Shift failed (using original): {fe}")
            
        return self._file_to_base64(temp_wav)

    def _file_to_base64(self, filepath: str) -> str:
        # 1. Archive the file (Permanent Memory for MIA)
        current_file_dir = os.path.dirname(os.path.abspath(__file__))
        backend_root = os.path.abspath(os.path.join(current_file_dir, ".."))
        archive_dir = os.path.join(backend_root, "data", "voice_archive")
        os.makedirs(archive_dir, exist_ok=True)
        
        # Create timestamped filename
        ext = ".wav" if filepath.endswith(".wav") else ".mp3"
        timestamp = datetime.now().strftime("%Y%m%d_%H%M%S")
        unique_id = uuid.uuid4().hex[:6]
        archive_path = os.path.join(archive_dir, f"MIA_VOICE_{timestamp}_{unique_id}{ext}")
        
        try:
            shutil.copy(filepath, archive_path)
        except Exception as ae:
            print(f"[Archive Error] Failed to save voice to archive: {ae}")

        # 2. Convert to base64 for browser playback
        with open(filepath, "rb") as f:
            b64 = base64.b64encode(f.read()).decode("utf-8")
        
        # 3. Clean up the temporary file
        os.remove(filepath)
        
        # Proper MIME detection: Piper is WAV, Edge/OpenAI/11Labs are MP3
        mime = "audio/wav" if filepath.endswith(".wav") else "audio/mp3"
        return f"data:{mime};base64,{b64}"

tts_service = TTSService()
