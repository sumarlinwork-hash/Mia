import os
import json
from pydantic import BaseModel
from typing import Dict, Any, Optional

CONFIG_FILE = os.path.join(os.path.dirname(__file__), "config.json")

VALID_THEME_HUES = {"teal", "violet", "amber", "emerald", "rose"}
LEGACY_THEME_HUE_MAP = {
    "170": "teal",
    "teal": "teal",
    "cyan": "teal",
    "violet": "violet",
    "purple": "violet",
    "amber": "amber",
    "orange": "amber",
    "emerald": "emerald",
    "green": "emerald",
    "rose": "rose",
    "pink": "rose",
}


def normalize_theme_hue(value: Any) -> str:
    if not isinstance(value, str):
        return "teal"

    normalized = LEGACY_THEME_HUE_MAP.get(value.strip().lower())
    if normalized in VALID_THEME_HUES:
        return normalized

    return "teal"

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
    failure_count: int = 0
    last_failure_time: float = 0
    circuit_breaker_until: float = 0


class AppearanceConfig(BaseModel):
    background_type: str = "video" # "video", "image", "color"
    background_url: str = "https://cdn.pixabay.com/video/2021/08/04/83893-585324227_large.mp4" # Default aesthetic anime/cyber background
    bubble_color_mia: str = "rgba(0, 255, 204, 0.15)"
    bubble_color_user: str = "rgba(255, 255, 255, 0.1)"
    ui_opacity: float = 0.8 # Range 0.0 - 1.0
    language: str = "id-ID"
    theme_hue: str = "teal"

class MIAConfig(BaseModel):
    bot_name: str = "MIA"
    bot_age: int = 18
    bot_persona: str = "Kamu adalah MIA, AI Personal Assistant wanita berusia 18 tahun."
    max_rpm: int = 15
    tts_engine: str = "edge-tts"
    elevenlabs_api_key: str = ""
    elevenlabs_voice_id: str = ""
    openai_api_key: str = ""
    stt_engine: str = "speech_recognition"
    is_professional_mode: bool = False
    is_production_mode: bool = False
    os_mode: str = "SAFE_MODE" # SAFE_MODE, POWER_MODE, BEGINNER_MODE
    
    # ARE (Affective Resonance Engine) Parameters - Synchronized with SSOT v5
    care_pulse_enabled: bool = True
    resonant_skin_enabled: bool = True
    bio_sync_enabled: bool = True
    warmth_decay_rate: float = 0.001
    arousal_decay_rate: float = 0.0005
    echo_decay_rate: float = 0.002
    imperfect_response_chance: float = 0.05
    
    providers: Dict[str, ProviderConfig] = {}
    appearance: AppearanceConfig = AppearanceConfig()
    test_timeout: int = 30

def get_default_config() -> MIAConfig:
    default_providers = {
        "Gemini": ProviderConfig(
            is_active=True, is_default=True, display_name="Gemini Flash", 
            model_id="gemini-1.5-flash", protocol="Gemini API", purpose="Inti Logika & Pikiran", cost_label="Gratis berlimit"
        ),
        "Groq": ProviderConfig(
            is_active=True, display_name="Groq Llama 3", 
            model_id="llama3-8b-8192", protocol="Groq", purpose="Inti Logika & Pikiran", cost_label="Gratis berlimit"
        ),
        "OpenAI": ProviderConfig(
            is_active=False, display_name="GPT-4o", 
            model_id="gpt-4o", protocol="OpenAI Compatible", purpose="Inti Logika & Pikiran", cost_label="Berbayar"
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
            data["appearance"]["theme_hue"] = normalize_theme_hue(
                data["appearance"].get("theme_hue")
            )
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
