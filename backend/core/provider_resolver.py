import httpx
import json
import asyncio
import re
from typing import Dict, Any, Optional

class ProviderResolver:
    """
    The 'Grand Resolver' of MIA.
    Centralizes all logic for endpoint construction and protocol detection.
    """
    
    @staticmethod
    def resolve(p_name: str, model_id: str, base_url: str, api_key: str = "") -> Dict[str, Any]:
        """
        Determines the final Target URL and Protocol.
        MIA SMART ASSEMBLY: Automatically replaces {model_id} in the URL template.
        """
        # CLEANING: Remove accidental prefixes from API Key (Common User Error)
        prefixes_to_clean = ["GEMINI_API_KEY=", "OPENAI_API_KEY=", "GROQ_API_KEY=", "ANTHROPIC_API_KEY="]
        for pref in prefixes_to_clean:
            if api_key.startswith(pref):
                api_key = api_key.replace(pref, "").strip()
                print(f"[Resolver] Cleaned API Key for {p_name} (Removed prefix)")

        raw_url = base_url.strip() if base_url else ""
        model_id = model_id.strip()
        protocol = "openai" # Default

        # 1. SMART ASSEMBLY (Placeholder Replacement)
        url = raw_url.replace("{model_id}", model_id) if raw_url else ""

        # 2. RECONCILIATION (Enforce model_id on standard URLs even if placeholder was missing)
        # This ensures that changing the 'Model ID' field in the UI actually changes the target model
        if url:
            # Google Gemini Pattern: .../models/MODEL_NAME:...
            if "generativelanguage.googleapis.com" in url:
                # Enforce v1beta to support system_instruction (avoids 400 errors)
                url = url.replace("/v1/", "/v1beta/")
                url = re.sub(r"/models/[^/:]+", f"/models/{model_id}", url)
                protocol = "gemini"
            
            # HF Native Hub Pattern: .../models/MODEL_NAME (Supports owner/model_name)
            elif "api-inference.huggingface.co" in url:
                url = re.sub(r"/models/.*", f"/models/{model_id}", url)
                protocol = "hf_native"

        # 3. PROTOCOL DETECTION & DEFAULTS
        # Gemini Protocol
        if "gemini" in model_id.lower() or "googleapis.com" in url or "Gemini" in p_name:
            protocol = "gemini"
            if not url:
                url = f"https://generativelanguage.googleapis.com/v1beta/models/{model_id or 'gemini-2.0-flash'}:generateContent"
        
        # Anthropic Protocol
        elif "claude" in model_id.lower() or "anthropic.com" in url:
            protocol = "anthropic"
            if not url:
                url = "https://api.anthropic.com/v1/messages"

        # Groq Protocol
        elif "groq" in p_name.lower() or "groq.com" in url:
            protocol = "openai" # Groq uses OpenAI protocol
            if not url:
                url = "https://api.groq.com/openai/v1/chat/completions"

        # 4. GLOBAL FALLBACK
        if not url:
            url = "https://api.openai.com/v1/chat/completions"

        print(f"[Resolver] Smart-Assembly: {p_name} -> {url} ({protocol})")
        return {
            "url": url,
            "protocol": protocol,
            "model_id": model_id,
            "api_key": api_key
        }

    @staticmethod
    async def diagnostic_probe(url: str) -> bool:
        """
        Performs a light network probe to distinguish between ISP block vs API error.
        """
        try:
            domain = url.split("//")[-1].split("/")[0]
            async with httpx.AsyncClient(timeout=3.0) as client:
                # Just a HEAD request to the domain to check reachability
                resp = await client.head(f"https://{domain}")
                return True
        except Exception:
            return False

# Global Instance
provider_resolver = ProviderResolver()
