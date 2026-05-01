import os
import edge_tts
import base64
import tempfile
import uuid
import httpx
import json
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
            else:
                # Default: Edge-TTS (with Intimacy Manipulation)
                return await self._edge_tts(text_to_speak, is_intimate)
        except Exception as e:
            print(f"[TTS Error] Engine {engine} failed: {e}")
            return await self._edge_tts(text_to_speak, is_intimate) # Fallback to Edge

    async def _edge_tts(self, text: str, is_intimate: bool = False) -> str:
        temp_filename = os.path.join(tempfile.gettempdir(), f"mia_edge_{uuid.uuid4().hex}.mp3")
        
        # New Normal: Super Energetic & Fast (Gadis Neural Peak)
        pitch = "+40Hz" 
        rate = "+30%"
        
        # New Intimate: Calm, but much faster than before
        if is_intimate:
            pitch = "+15Hz"   # Softer tone
            rate = "+25%"   # Increased speed (was -15%)
            
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

    def _file_to_base64(self, filepath: str) -> str:
        with open(filepath, "rb") as f:
            b64 = base64.b64encode(f.read()).decode("utf-8")
        os.remove(filepath)
        return f"data:audio/mp3;base64,{b64}"

tts_service = TTSService()
