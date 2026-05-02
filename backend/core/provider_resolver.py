import httpx
import json
import asyncio
from typing import Dict, Any, Optional

class ProviderResolver:
    """
    The 'Grand Resolver' of MIA.
    Centralizes all logic for endpoint construction and protocol detection.
    """
    
    @staticmethod
    def resolve(p_name: str, model_id: str, base_url: str) -> Dict[str, Any]:
        """
        Determines the final Target URL and Protocol based on Model ID and Provider.
        """
        url = base_url.strip() if base_url else ""
        protocol = "openai" # Default
        
        # 1. SMART HUGGINGFACE LOGIC
        if "huggingface" in p_name.lower() or "huggingface" in url.lower():
            # Check if it's a niche model (contains '/') or specifically hub URL
            # Note: We exclude some known popular models that might have '/' but are on router
            is_niche = "/" in model_id and not any(m in model_id.lower() for m in ["llama", "gemma", "qwen"])
            
            if "api-inference.huggingface.co" in url or is_niche:
                # Target: Native Hub (Universal)
                protocol = "hf_native"
                # If it's a niche model but the URL is still Router, we FORCE switch to Hub
                if not url or "router.huggingface.co" in url:
                    url = f"https://api-inference.huggingface.co/models/{model_id}"
            else:
                # Target: Router (Fast OpenAI compatible)
                protocol = "openai"
                if not url:
                    url = "https://router.huggingface.co/v1/chat/completions"

        # 2. SMART GEMINI LOGIC
        elif "google" in p_name.lower() or "gemini" in model_id.lower() or "googleapis.com" in url:
            protocol = "gemini"
            if not url:
                # Default to stable Pro if not specified
                m = model_id or "gemini-1.5-pro"
                url = f"https://generativelanguage.googleapis.com/v1beta/models/{m}:generateContent"

        # 3. GROQ LOGIC
        elif "groq" in p_name.lower() or "groq" in url:
            protocol = "openai"
            if not url:
                url = "https://api.groq.com/openai/v1/chat/completions"

        # 4. DEEPSEEK LOGIC
        elif "deepseek" in p_name.lower():
            protocol = "openai"
            if not url:
                url = "https://api.deepseek.com/chat/completions"

        # 5. ANTHROPIC LOGIC
        elif "anthropic" in p_name.lower() or "claude" in model_id.lower():
            protocol = "anthropic"
            if not url:
                url = "https://api.anthropic.com/v1/messages"

        # 6. DEFAULT FALLBACK
        else:
            protocol = "openai"
            if not url:
                url = "https://api.openai.com/v1/chat/completions"

        return {
            "url": url,
            "protocol": protocol,
            "model_id": model_id
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
