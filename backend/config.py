import os
import json
from pydantic import BaseModel
from typing import Dict, Any, Optional

CONFIG_FILE = os.path.join(os.path.dirname(__file__), "config.json")

class ProviderConfig(BaseModel):
    is_premium: bool = False
    is_active: bool = False
    is_default: bool = False
    display_name: str = ""
    api_key: str = ""
    base_url: str = ""
    model_id: str = ""
    protocol: str = "openai" # openai, gemini, anthropic, etc.
    purpose: str = "llm" # llm, vision, code, audio, etc.
    cost_label: str = "free" # free, paid
    latency: int = 0
    health_ok: int = 0
    health_fail: int = 0


class AppearanceConfig(BaseModel):
    background_type: str = "video" # "video", "image", "color"
    background_url: str = "https://cdn.pixabay.com/video/2021/08/04/83893-585324227_large.mp4" # Default aesthetic anime/cyber background
    bubble_color_mia: str = "rgba(0, 255, 204, 0.15)"
    bubble_color_user: str = "rgba(255, 255, 255, 0.1)"
    ui_opacity: float = 0.8 # Range 0.0 - 1.0
    language: str = "id-ID"

class MIAConfig(BaseModel):
    bot_name: str = "MIA"
    bot_age: str = "18"
    bot_persona: str = "Kamu adalah MIA, AI Personal Assistant wanita berusia 18 tahun."
    max_rpm: int = 15
    tts_engine: str = "edge-tts"
    elevenlabs_api_key: str = ""
    elevenlabs_voice_id: str = ""
    openai_api_key: str = ""
    stt_engine: str = "speech_recognition"
    providers: Dict[str, ProviderConfig] = {}
    appearance: AppearanceConfig = AppearanceConfig()

def get_default_config() -> MIAConfig:
    default_providers = {
        "Gemini": ProviderConfig(
            is_active=True, is_default=True, display_name="Gemini Flash", 
            model_id="gemini-1.5-flash", protocol="Gemini API", purpose="LLM & Logic", cost_label="FREE"
        ),
        "Groq": ProviderConfig(
            is_active=True, display_name="Groq Llama 3", 
            model_id="llama3-8b-8192", protocol="Groq", purpose="Fast Logic", cost_label="FREE"
        ),
        "OpenAI": ProviderConfig(
            is_active=False, display_name="GPT-4o", 
            model_id="gpt-4o", protocol="OpenAI Compatible", purpose="Complex Tasks", cost_label="PAID"
        )
    }
    return MIAConfig(providers=default_providers)


def load_config() -> MIAConfig:
    if not os.path.exists(CONFIG_FILE):
        default_config = get_default_config()
        save_config(default_config)
        return default_config
    
    try:
        with open(CONFIG_FILE, "r") as f:
            data = json.load(f)
            # Migrate older configs
            if "appearance" not in data:
                data["appearance"] = AppearanceConfig().dict()
            return MIAConfig(**data)
    except Exception as e:
        print(f"Error loading config: {e}. Using default.")
        return get_default_config()

def save_config(config: MIAConfig):
    with open(CONFIG_FILE, "w") as f:
        # Pydantic v2 compatible serialization
        try:
            f.write(config.model_dump_json(indent=4))
        except AttributeError:
            # Pydantic v1 fallback
            f.write(config.json(indent=4))

