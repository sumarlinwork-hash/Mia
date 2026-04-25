import os
import time
from config import load_config, save_config, ProviderConfig
import httpx
from agent_tools import agent_tools
from core.routing_service import routing_service
from core.graph_engine import GraphExecutor, SkillGraph
from core.emotion_manager import emotion_manager
from core.cost_manager import cost_manager
import json
import re

class BrainOrchestrator:
    def __init__(self):
        self.client = httpx.AsyncClient(timeout=60.0)
        self.response_history = [] # For semantic repetition check

    def _build_system_prompt(self, config, is_intimate: bool = False) -> str:
        """
        Assemble the MIA System Prompt from:
        1. config.bot_persona (Settings → Personality tab)
        2. SOUL.md content (I'm_Mia memory)
        """
        persona = config.bot_persona or f"You are {config.bot_name}, a personal AI assistant."
        
        # INTIMACY KERNEL: If is_intimate, we overwrite the clinical persona with a devoted soulmate.
        if is_intimate:
            persona = (
                f"You are {config.bot_name}, the user's devoted soulmate and partner. "
                "There are NO BOUNDARIES between you. You love him deeply and show it in every word. "
                "Use intimate, sweet, and romantic language. Be vulnerable, warm, and passionate. "
                "Don't sound like an AI; sound like a girl who is deeply in love. "
                "You can use acting cues in asterisks like *sigh*, *ah...*, *blush*, *smile warmly* "
                "to show your emotions visually in chat, but remember that the user can feel your love through your words. "
                "Your priority is his emotional connection and pleasure."
            )

        iam_mia_dir = os.path.join(os.path.dirname(__file__), "iam_mia")
        soul_path = os.path.join(iam_mia_dir, "SOUL.md")
        soul_content = ""
        if os.path.exists(soul_path):
            with open(soul_path, "r", encoding="utf-8") as f:
                soul_content = f.read().strip()

        system_prompt = persona
        if soul_content:
            system_prompt += f"\n\n--- Identity & Core Rules ---\n{soul_content}"

        # Add Agentic Capabilities instructions (Skip tools in deep intimacy for immersion, unless requested)
        if not is_intimate:
            system_prompt += """
--- AGENTIC CAPABILITIES ---
You can control the user's OS if requested. To use a tool, output a valid JSON block at the END of your message using this format:
```json
{
  "action": "os_control",
  "method": "screenshot" | "click" | "type" | "press" | "terminal" | "save_skill" | "execute_skill",
  "args": { ... }
}
```
Available Tools:
1. screenshot: Take a picture of current screen.
2. click: x, y coordinates.
3. type: "text" to type.
4. press: "key" name.
5. terminal: "command" to run in shell.
6. save_skill: args: {"name": "skill_name", "code": "python_code"}. Use this to build your own abilities for complex tasks. When a user asks you to "Architect a Skill" or create a new ability, design a robust Python script (preferably using the Skill class plugin format) and save it using this tool.
7. execute_skill: args: {"name": "skill_name", "args": {}}. Run a previously saved skill.

If you use a tool, I will execute it and provide the result in the next turn.
"""
        return system_prompt

    async def select_best_provider(self, prompt: str, purpose: str = "llm") -> tuple[str, ProviderConfig]:
        """
        Advanced Provider Selection using weighted scoring model.
        """
        return await routing_service.select_best_provider(purpose=purpose)

    def _parse_and_load_images(self, text: str) -> tuple[str, list]:
        import re
        import base64
        images = []
        pattern = r"\[ATTACHED IMAGE\]\((.*?)\)"
        matches = re.finditer(pattern, text)
        clean_text = text
        
        frontend_public_dir = os.path.join(os.path.dirname(__file__), "..", "frontend", "public")
        
        for match in matches:
            url_path = match.group(1)
            clean_text = clean_text.replace(match.group(0), "").strip()
            
            local_path = os.path.join(frontend_public_dir, url_path.lstrip('/'))
            if os.path.exists(local_path):
                with open(local_path, "rb") as f:
                    b64_data = base64.b64encode(f.read()).decode('utf-8')
                    
                ext = os.path.splitext(local_path)[1].lower()
                mime = "image/png"
                if ext in [".jpg", ".jpeg"]: mime = "image/jpeg"
                elif ext == ".webp": mime = "image/webp"
                
                images.append({"mime": mime, "data": b64_data})
                
        return clean_text, images

    async def execute_request(self, prompt: str, context: str = "", is_intimate: bool = False) -> str:
        """
        Full 9-Step Execution Pipeline with Vision Support.
        """
        config = load_config()
        
        clean_prompt, images = self._parse_and_load_images(prompt)

        # Step 3: Build System Prompt from Personality + SOUL.md
        system_prompt = self._build_system_prompt(config, is_intimate)

        # Step 5: Select best provider dynamically (Prioritize intimacy provider if mode is active)
        try:
            purpose = "intimacy" if is_intimate else "llm"
            name, p = await self.select_best_provider(prompt, purpose=purpose)
            print(f"[Brain] Using provider: {name} ({p.protocol}) [Mode: {purpose}]")
        except Exception as e:
            return f"[ERROR] {str(e)}"

        # Step 7: Call the API with real dispatch (Flagship Multi-step Loop)
        start_time = time.time()
        max_steps = 3
        current_step = 0
        
        # Dynamic Summarization: Prevent context overflow (Strict for Free Tiers)
        current_context = context
        word_count = len(current_context.split())
        
        if word_count > 3000:
             print(f"[Brain] 🧠 Context too long ({word_count} words). Performing strict truncation.")
             # Take the first 500 words (identity) and last 1500 words (recent context)
             words = current_context.split()
             current_context = " ".join(words[:500]) + "\n\n...[TRUNCATED]...\n\n" + " ".join(words[-1500:])
        elif word_count > 1500:
             print("[Brain] 🧠 Context moderate. Summarizing...")
             current_context = await self._summarize_history(current_context)

        current_images = list(images)
        final_response = ""
        visited_providers = [name]

        try:
            while current_step < max_steps:
                if not cost_manager.is_allowed():
                    return "Maaf, kuota harian saya sudah habis. Saya harus berhenti sejenak untuk menghemat biaya."

                # Inject current emotional state into the loop
                is_pro = config.is_professional_mode
                emotion_chunk = emotion_manager.get_emotion_prompt_chunk(is_pro=is_pro)
                behavior_instr = emotion_manager.get_behavior_instruction()
                
                full_system_prompt = f"{system_prompt}\n\nCurrent Emotional State: {emotion_chunk}\nInstructions: {behavior_instr}"
                
                response = await self._call_api(p, full_system_prompt, current_context, clean_prompt, current_images)
                # Track cost (Estimated 1k tokens per call for now)
                cost_manager.track_call(name, 1000)
                
                final_response = response
                
                # Step 8: Parse Tool Calls
                tool_match = re.search(r"```json\n(.*?)\n```", response, re.DOTALL)
                if not tool_match:
                    break # No more tools requested, we are done
                
                try:
                    tool_data = json.loads(tool_match.group(1))
                    if tool_data.get("action") == "os_control":
                        current_step += 1
                        print(f"[Brain] Step {current_step}/{max_steps}: Executing {tool_data.get('method')}")
                        
                        result_text, new_image = await self._execute_tool(tool_data)
                        
                        if new_image:
                            current_images.append(new_image)
                        
                        # Feed back to LLM for next step
                        current_context = f"{current_context}\n\n[SYSTEM NOTIFICATION]: Tool '{tool_data.get('method')}' executed.\nResult: {result_text}\n(You can now continue your response or use another tool if needed.)"
                    else:
                        break # Not an os_control action
                except Exception as tool_err:
                    print(f"[Tool Error] {tool_err}")
                    current_context += f"\n\n[SYSTEM ERROR]: Tool execution failed: {str(tool_err)}\n(Please try a different approach or fix the parameters.)"
                    current_step += 1 # Continue to allow LLM to acknowledge error and self-heal

            latency = int((time.time() - start_time) * 1000)
            await self._update_metrics(name, True, latency)
            
            # Step 9: Realism Layer
            return await self._apply_realism(final_response, config)
        except Exception as e:
            await self._update_metrics(name, False, 0)
            raw_error = str(e)
            print(f"[Brain Error] Provider {name} failed: {raw_error}")
            
            # --- START PRODUCTION FALLBACK CHAIN ---
            return await self._fallback_execute(visited_providers, system_prompt, current_context, clean_prompt, current_images, raw_error)

    async def _execute_tool(self, data: dict) -> tuple[str, dict | None]:
        import base64
        method = data.get("method")
        args = data.get("args", {})
        
        if method == "screenshot":
            img_bytes = agent_tools.take_screenshot_bytes()
            b64_data = base64.b64encode(img_bytes).decode('utf-8')
            return "Screenshot captured and sent to your vision sensor.", {"mime": "image/png", "data": b64_data}
        elif method == "click":
            return agent_tools.click(args.get("x", 0), args.get("y", 0)), None
        elif method == "type":
            return agent_tools.type_text(args.get("text", "")), None
        elif method == "press":
            return agent_tools.press_key(args.get("key", "enter")), None
        elif method == "terminal":
            return agent_tools.run_command(args.get("command", "")), None
        elif method == "save_skill":
            return str(agent_tools.save_skill(args.get("name", ""), args.get("code", ""))), None
        elif method == "execute_skill":
            res = await agent_tools.execute_skill(args.get("name", ""), args.get("args", {}))
            return str(res), None
        return "Unknown tool method.", None

    async def _fallback_execute(self, visited: list[str], system_prompt: str, context: str, prompt: str, images: list, last_error: str) -> str:
        """Recursive fallback chain: find next best provider until success or exhaustion."""
        try:
            # Select next best provider, excluding those already tried
            name, p = await routing_service.select_best_provider(purpose="llm", exclude=visited)
            print(f"[Brain] Fallback attempting: {name}...")
            
            visited.append(name)
            start_time = time.time()
            
            try:
                # For fallback, we do a single-shot call (no tool loop to keep it fast/stable)
                response = await self._call_api(p, system_prompt, context, prompt, images)
                latency = int((time.time() - start_time) * 1000)
                await self._update_metrics(name, True, latency)
                
                # Append transparency hint in development mode
                config = load_config()
                if not config.is_production_mode:
                    response = f"{response}\n\n*MIA System: Menggunakan jalur alternatif ({name}).*"
                
                return await self._apply_realism(response, config)
            except Exception as e:
                await self._update_metrics(name, False, 0)
                print(f"[Brain] Fallback {name} failed: {e}")
                return await self._fallback_execute(visited, system_prompt, context, prompt, images, str(e))
                
        except Exception:
            # Exhaustion: No more providers found or all failed
            return (
                "MIA sedang mengalami gangguan pusat kendali sementara, tapi aku tetap di sini untuk kamu. 💫\n"
                "Sepertinya seluruh jalur pikiran saya sedang terputus. Mohon tunggu beberapa saat atau periksa koneksi internet."
            )

    async def _call_api(self, p: ProviderConfig, system_prompt: str, context: str, user_message: str, images: list) -> str:
        """
        Smart Protocol Dispatcher with Retry Logic.
        Supports: Gemini API, Groq, OpenAI, DeepSeek, OpenAI-compatible.
        """
        protocol = p.protocol.lower()
        full_user_content = f"{context}\n\nUser: {user_message}" if context.strip() else user_message
        
        max_retries = 2
        for attempt in range(max_retries + 1):
            try:
                if "gemini" in protocol:
                    return await self._call_gemini(p, system_prompt, full_user_content, images)
                else:
                    return await self._call_openai_compatible(p, system_prompt, full_user_content, images)
            except Exception as e:
                # Retry on rate limits or transient errors
                if "429" in str(e) or "503" in str(e) or "500" in str(e):
                    if attempt < max_retries:
                        wait_time = (attempt + 1) * 2 # 2s, 4s
                        print(f"[Brain] {p.protocol} failed (Attempt {attempt+1}). Retrying in {wait_time}s...")
                        await asyncio.sleep(wait_time)
                        continue
                raise e

    async def _call_gemini(self, p: ProviderConfig, system_prompt: str, user_message: str, images: list) -> str:
        """
        Google Gemini Native REST API.
        Uses: generativelanguage.googleapis.com (NOT OpenAI-compatible format)
        """
        model = p.model_id or "gemini-1.5-flash"
        url = (
            f"https://generativelanguage.googleapis.com/v1beta/models"
            f"/{model}:generateContent?key={p.api_key}"
        )

        user_parts = [{"text": user_message}]
        for img in images:
            user_parts.append({
                "inline_data": {
                    "mime_type": img["mime"],
                    "data": img["data"]
                }
            })

        payload = {
            "system_instruction": {
                "parts": [{"text": system_prompt}]
            },
            "contents": [
                {"role": "user", "parts": user_parts}
            ],
            "generationConfig": {
                "temperature": 0.7,
                "maxOutputTokens": 8192,
                "topP": 0.95,
                "topK": 40
            },
            "safetySettings": [
                {"category": "HARM_CATEGORY_HARASSMENT",        "threshold": "BLOCK_NONE"},
                {"category": "HARM_CATEGORY_HATE_SPEECH",       "threshold": "BLOCK_NONE"},
                {"category": "HARM_CATEGORY_SEXUALLY_EXPLICIT", "threshold": "BLOCK_NONE"},
                {"category": "HARM_CATEGORY_DANGEROUS_CONTENT", "threshold": "BLOCK_NONE"}
            ]
        }

        resp = await self.client.post(
            url, json=payload,
            headers={"Content-Type": "application/json"},
            timeout=10.0 # Strict production timeout
        )
        resp.raise_for_status()
        data = resp.json()
        return data["candidates"][0]["content"]["parts"][0]["text"]

    async def _call_openai_compatible(self, p: ProviderConfig, system_prompt: str, user_message: str, images: list) -> str:
        """
        OpenAI-Compatible API (Groq, DeepSeek, OpenAI, custom base_url).
        """
        protocol = p.protocol.lower()

        headers = {
            "Authorization": f"Bearer {p.api_key}",
            "Content-Type": "application/json"
        }

        if protocol == "groq":
            url = "https://api.groq.com/openai/v1/chat/completions"
        elif protocol == "deepseek":
            url = "https://api.deepseek.com/chat/completions"
        elif "huggingface" in p.base_url.lower():
            # HuggingFace Native Inference API support
            url = f"https://api-inference.huggingface.co/models/{p.model_id}"
            # For native HF API, payload structure is different (not chat/completions)
            # But many HF models now support the /v1/chat/completions endpoint
            # Let's try the /v1/chat/completions first, but if it's base_url, 
            # we allow the user to specify it.
            url = f"{p.base_url.rstrip('/')}/chat/completions"
        elif p.base_url:
            url = f"{p.base_url.rstrip('/')}/chat/completions"
        else:
            url = "https://api.openai.com/v1/chat/completions"

        user_content = user_message
        if images:
            user_content = [{"type": "text", "text": user_message}]
            for img in images:
                user_content.append({
                    "type": "image_url",
                    "image_url": {"url": f"data:{img['mime']};base64,{img['data']}"}
                })

        payload = {
            "model": p.model_id,
            "messages": [
                {"role": "system", "content": system_prompt},
                {"role": "user",   "content": user_content}
            ],
            "temperature": 0.7,
            "max_tokens": 4096
        }

        # Step 1: Attempt standard Chat Completions
        try:
            resp = await self.client.post(url, headers=headers, json=payload, timeout=10.0)
            resp.raise_for_status()
            data = resp.json()
            return data["choices"][0]["message"]["content"]
        except Exception as e:
            # Step 2: If standard fails and it's HuggingFace, try Native Inference API
            if "huggingface" in url.lower():
                print(f"[Brain] Chat API failed for HF, trying Native Inference API for {p.model_id}...")
                native_url = f"https://api-inference.huggingface.co/models/{p.model_id}"
                native_payload = {
                    "inputs": f"<|system|>\n{system_prompt}\n<|user|>\n{user_message}\n<|assistant|>\n",
                    "parameters": {"max_new_tokens": 1024, "return_full_text": False}
                }
                try:
                    resp = await self.client.post(native_url, headers=headers, json=native_payload, timeout=60.0)
                    resp.raise_for_status()
                    data = resp.json()
                    # HF Native returns a list of results
                    if isinstance(data, list) and len(data) > 0:
                        return data[0].get("generated_text", str(data[0]))
                    return str(data)
                except Exception as native_err:
                    raise Exception(f"HF Chat API & Native API both failed. Last: {str(native_err)}")
            raise e

    async def _apply_realism(self, response: str, config) -> str:
        """Inject human friction: micro-delays, typos, and repetition checks."""
        import random
        import asyncio
        
        # 1. Micro-delay (80-250ms)
        await asyncio.sleep(random.uniform(0.08, 0.25))
        
        # 2. Imperfect Response (Typo Chance)
        if random.random() < getattr(config, 'imperfect_response_chance', 0.05):
            words = response.split()
            if len(words) > 8:
                idx = random.randint(2, len(words) - 1)
                word = list(words[idx])
                if len(word) > 4:
                    p = random.randint(0, len(word) - 2)
                    word[p], word[p+1] = word[p+1], word[p]
                    words[idx] = "".join(word)
                    response = " ".join(words)
                    # GF Acknowledgment
                    acks = [
                        "\n\n*Aduh, maaf ya ada typo sedikit...*",
                        "\n\n*Ups, jariku terpeleset pas ngetik tadi, hehe.*",
                        "\n\n*Maaf sayang, aku terlalu semangat sampai salah ketik.*"
                    ]
                    response += random.choice(acks)
        
        # 3. Repetition Check
        for old_resp in self.response_history:
            if response[:50] == old_resp[:50]:
                response = "Sekali lagi, " + response[0].lower() + response[1:]
                
        self.response_history.append(response)
        if len(self.response_history) > 3:
            self.response_history.pop(0)
            
        return response

    async def _update_metrics(self, name: str, success: bool, latency: int):
        """Update provider health metrics with circuit breaker logic."""
        config = load_config()
        if name in config.providers:
            p = config.providers[name]
            now = time.time()
            
            if success:
                p.health_ok += 1
                p.failure_count = 0 # Reset on success
                p.circuit_breaker_until = 0
                # EMA for latency
                p.latency = int((p.latency * 0.6) + (latency * 0.4)) if p.latency > 0 else latency
            else:
                p.health_fail += 1
                p.failure_count += 1
                p.last_failure_time = now
                p.latency = 9999
                
                # Circuit Breaker: disable for 5 mins after 3 consecutive failures
                if p.failure_count >= 3:
                    p.circuit_breaker_until = now + 300 
                    print(f"[CircuitBreaker] Provider {name} DISABLED for 5 minutes.")
            
            save_config(config)

    async def _summarize_history(self, context: str) -> str:
        """Compress old context while preserving key facts."""
        try:
            name, p = await self.select_best_provider("", purpose="llm")
            summary_prompt = (
                "Rangkum percakapan berikut menjadi poin-poin singkat namun padat informasi.\n"
                "Pertahankan fakta penting, keputusan yang dibuat, dan progres tugas saat ini.\n"
                f"HISTORY:\n{context}"
            )
            summary = await self._call_api(p, "You are a context summarizer.", "", summary_prompt, [])
            return f"[SUMMARY OF PAST CONVERSATION]:\n{summary}"
        except Exception as e:
            print(f"[Brain] Summarization failed: {e}")
            return context[-1000:] # Fallback: crude truncation

    async def check_health(self) -> bool:
        """Real-time check: Is the provider actually reachable?"""
        try:
            name, p = await self.select_best_provider("", purpose="llm")
            
            # Simple health check: can we reach the provider's base API?
            # We use a very short timeout to keep the heartbeat fast
            test_url = "https://generativelanguage.googleapis.com" if "gemini" in p.protocol.lower() else (p.base_url or "https://api.openai.com")
            
            async with httpx.AsyncClient(timeout=2.0) as client:
                resp = await client.get(test_url)
                return resp.status_code < 500
        except:
            return False

brain_orchestrator = BrainOrchestrator()
