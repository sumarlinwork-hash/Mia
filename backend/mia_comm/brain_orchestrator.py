import asyncio
import os
import time
from config import load_config, save_config, ProviderConfig
import httpx
from agent_tools import agent_tools
from core.routing_service import routing_service
from core.graph_engine import GraphExecutor, ExecutionGraph, NodeStatus, ExecutionMode
from core.graph_compiler import GraphCompiler
from core.emotion_manager import emotion_manager
from core.cost_manager import cost_manager
import re
import random
import json
from typing import Dict, List, Any, Optional, Callable
# SHAD-CSA v2.0 Imports
from shad_csa.core.control_loop import ControlLoop
from shad_csa.nodes.execution_node import ExecutionNode
from shad_csa.economy.economic_control import EconomicControlField
from shad_csa.runtime.lifecycle_manager import NodeLifecycleManager
from shad_csa.runtime.resilience_interpreter import ResilienceInterpreter
from mia_comm.runtime.renderer import emotion_renderer
from studio.graph_stream import studio_graph_streamer

class BrainOrchestrator:
    def __init__(self):
        self.client = httpx.AsyncClient(timeout=60.0)
        self.response_history = [] # For semantic repetition check
        self.compiler = GraphCompiler(tool_registry=agent_tools.get_tool_names())
        self.active_graphs: Dict[str, ExecutionGraph] = {}
        self.graph_timestamps: Dict[str, float] = {}
        self._init_shad_csa()

    def _init_shad_csa(self):
        """
        Initializes SHAD-CSA v2.0 (EBARF Edition) for production.
        """
        config = load_config()
        
        # 1. EBARF Components
        self.ecf = EconomicControlField(compute_budget=5000, node_budget=20, chaos_budget=0)
        self.interpreter = ResilienceInterpreter()
        
        nodes = []
        for name, p in config.providers.items():
            if p.is_active:
                def make_provider_fn(provider_config):
                    async def provider_fn(payload):
                        return await self._call_api(
                            provider_config, 
                            payload["system_prompt"], 
                            payload["context"], 
                            payload["user_message"], 
                            payload["images"]
                        )
                    return provider_fn
                
                nodes.append(ExecutionNode(name, make_provider_fn(p)))
        
        # 2. Lifecycle Manager
        self.lifecycle = NodeLifecycleManager(self.ecf, None) # Placeholder provider_fn, logic handled by loop
        self.lifecycle.active_nodes = nodes
        
        # 3. Final Wiring
        self.control_loop = ControlLoop(
            nodes, 
            ecf=self.ecf, 
            interpreter=self.interpreter
        )

    def _cleanup_old_graphs(self):
        """
        Memory Lifecycle Manager: Remove graphs older than 1 hour.
        """
        now = time.time()
        ttl = 3600 # 1 hour
        to_delete = [gid for gid, ts in self.graph_timestamps.items() if now - ts > ttl]
        for gid in to_delete:
            print(f"[Memory] Cleaning up old graph: {gid}")
            del self.active_graphs[gid]
            del self.graph_timestamps[gid]

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

        iam_mia_dir = os.path.join(os.path.dirname(os.path.dirname(__file__)), "iam_mia")
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

    async def execute_request(self, prompt: str, context: str = "", is_intimate: bool = False, on_status: Optional[Callable] = None) -> str:
        """
        Hardened Entry Point: Enforces Global Timeout (Contract Section 0.3)
        """
        try:
            return await asyncio.wait_for(
                self._execute_pipeline(prompt, context, is_intimate, on_status),
                timeout=25.0
            )
        except asyncio.TimeoutError:
            print("[Critical] Global Pipeline Timeout (25s) reached.")
            if on_status:
                await on_status({
                    "type": "status", 
                    "stage": "ERROR", 
                    "message": "Global Timeout: Sistem terlalu lama merespons.", 
                    "timestamp": int(time.time() * 1000)
                })
            return await self._final_failsafe_response("MIA_SYSTEM_ALERT::GLOBAL_TIMEOUT")
        except Exception as e:
            import traceback
            print(f"[Critical] Unexpected error in execute_request: {e}")
            print(traceback.format_exc())
            return await self._final_failsafe_response(f"MIA_SYSTEM_ERROR::{str(e)}")

    async def _execute_pipeline(self, prompt: str, context: str = "", is_intimate: bool = False, on_status: Optional[Callable] = None) -> str:
        """
        Full 9-Step Execution Pipeline with Vision Support.
        """
        async def emit(stage: str, message: str):
            if on_status:
                await on_status({"type": "status", "stage": stage, "message": message, "timestamp": int(time.time() * 1000)})

        await emit("BOOT", "Initializing MIA Resilience Layer...")
        config = load_config()
        
        await emit("RETRIEVING", "Searching context and memories...")
        clean_prompt, images = self._parse_and_load_images(prompt)

        # Step 3: Build System Prompt from Personality + SOUL.md
        system_prompt = self._build_system_prompt(config, is_intimate)

        # Step 5: Select best provider dynamically (Prioritize intimacy provider if mode is active)
        try:
            purpose = "intimacy" if is_intimate else "llm"
            name, p = await self.select_best_provider(prompt, purpose=purpose)
            print(f"[Brain] Using provider: {name} ({p.protocol}) [Mode: {purpose}]")
            await emit("THINKING", f"MIA is thinking via {name}...")
        except Exception as e:
            await emit("FALLBACK", "Primary provider failed. Switching to fallback...")
            return await self._fallback_execute(visited_providers, system_prompt, current_context, clean_prompt, current_images, str(e), on_status, depth=0)

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
                behavior_instr = emotion_manager.get_behavior_instruction(is_pro=is_pro)
                
                
                
                full_system_prompt = f"{system_prompt}\n\nCurrent Emotional State: {emotion_chunk}\nInstructions: {behavior_instr}"
                
                # SHAD-CSA v2.0: Distributed Control Execution
                await emit("THINKING", "MIA is processing via SHAD-CSA v2.0...")
                
                # Bind telemetry to the main emitter for visual analytics
                async def shad_telemetry_bridge(data):
                    await emit("SHAD_CSA", data)
                    # P4-X: Also broadcast to System Stream for Studio visibility
                    config = load_config()
                    project_id = config.active_project_id or "default_project"
                    studio_graph_streamer.push_event(
                        execution_id="system_resilience", 
                        event_type="SHAD_CSA_TELEMETRY", 
                        payload=data,
                        project_id=project_id
                    )
                
                self.control_loop.telemetry_cb = shad_telemetry_bridge
                
                response = await self.control_loop.execute({
                    "system_prompt": full_system_prompt,
                    "context": current_context,
                    "user_message": clean_prompt,
                    "images": current_images
                })
                
                # Fallback to legacy if SHAD-CSA returns system error (Bootstrap protection)
                if response == "MIA_SYSTEM_ERROR::TOTAL_EXECUTION_FAILURE":
                    await emit("FALLBACK", "SHAD-CSA total failure. Using emergency legacy fallback...")
                    response = await self._call_api(p, full_system_prompt, current_context, clean_prompt, current_images)

                final_response = response
                
                # Step 8: Parse and Execute Graph Workflow (DAG-native)
                if "```json" in response:
                    try:
                        # NEW: execute_graph_workflow replaces execute_tools
                        graph_handle = await self.execute_graph_workflow(response)
                        graph_id = graph_handle["graph_id"]
                        
                        graph = self.active_graphs.get(graph_id)
                        if graph:
                            # Run and wait for result (Sequential for now, but background-friendly)
                            await emit("EXECUTING", f"Executing system tools via graph: {graph_id}...")
                            result_context = await self._run_graph_workflow_sync(graph)
                            
                            # Update context for next LLM turn
                            execution_summary = json.dumps(result_context, indent=2)
                            current_context = f"{current_context}\n\n[SYSTEM NOTIFICATION]: Graph '{graph_id}' executed.\nResults: {execution_summary}"
                            current_step += 1
                        else:
                            break
                    except Exception as graph_err:
                        print(f"[Graph Error] {graph_err}")
                        current_context += f"\n\n[SYSTEM ERROR]: Graph execution failed: {str(graph_err)}"
                        current_step += 1
                else:
                    break

            latency = int((time.time() - start_time) * 1000)
            await self._update_metrics(name, True, latency)
            
            # Step 9: Emotion Rendering (Isolated Layer B/C)
            await emit("DONE", "Response generated.")
            
            # Fetch current mood state
            mood = "Neutral"
            try:
                mood_state = emotion_manager.get_state()
                # Determine dominant mood for rendering
                if mood_state.get("warmth", 50) > 70: mood = "Affectionate"
                elif mood_state.get("arousal", 50) > 70: mood = "Intense"
                elif mood_state.get("warmth", 50) < 30: mood = "Soft"
            except:
                pass

            # Render Final Output (Safe Post-Process)
            render_result = emotion_renderer.render(final_response, "SUCCESS", mood)
            
            # Apply visual latency hint if provided
            if isinstance(render_result, dict):
                await asyncio.sleep(render_result.get("latency_hint", 0.1))
                return render_result["text"]
            
            return render_result
        except Exception as e:
            import traceback
            print(f"[Brain Error Pipeline] {e}")
            print(traceback.format_exc())
            
            if locals().get('name'):
                await self._update_metrics(locals()['name'], False, 0)
            
            await emit("FALLBACK", "Connection lost. Attempting recovery...")
            return await self._fallback_execute(locals().get('visited_providers', []), system_prompt, locals().get('current_context', context), locals().get('clean_prompt', prompt), locals().get('current_images', []), str(e), on_status, depth=0)

    def _local_heart_fallback(self, error: str) -> str:
        """
        TIER-3: Local Heart Fallback. NO API CALLS. 
        Returns a context-aware local response based on emotional state.
        """
        try:
            responses_path = os.path.join(os.path.dirname(os.path.dirname(__file__)), "core", "local_responses.json")
            if not os.path.exists(responses_path):
                return "MIA_SYSTEM_ALERT::LOCAL_DB_MISSING"
            
            with open(responses_path, "r", encoding="utf-8") as f:
                local_db = json.load(f)
            
            s = emotion_manager.get_state()
            warmth = s.get("warmth", 50)
            
            if warmth >= 70:
                bucket = "high_warmth"
            elif warmth <= 40:
                bucket = "low_warmth"
            else:
                bucket = "neutral"
                
            return random.choice(local_db[bucket])
        except Exception as inner_err:
            print(f"[Critical Fail] Local Heartbeat failed: {inner_err}")
            return "MIA_SYSTEM_ALERT::TOTAL_FAILURE"

    async def _final_failsafe_response(self, error: str) -> str:
        """
        LAST LINE OF DEFENSE — NEVER FAIL
        """
        try:
            return self._local_heart_fallback(error)
        except:
            return "MIA_SYSTEM_ALERT::TOTAL_FAILURE"
            
    async def execute_graph_workflow(self, llm_output: str) -> Dict[str, Any]:
        """
        Transforms LLM output into a graph and initiates metadata.
        """
        self._cleanup_old_graphs()
        print("[Brain] Compiling Execution Graph...")
        graph = self.compiler.compile(llm_output)
        self.active_graphs[graph.id] = graph
        self.graph_timestamps[graph.id] = time.time()
        
        return {
            "graph_id": graph.id,
            "replay_id": graph.graph_root_hash,
            "status": graph.status
        }

    async def _run_graph_workflow_sync(self, graph: ExecutionGraph) -> Dict[str, Any]:
        """
        Helper to run graph and return context.
        """
        executor = GraphExecutor(agent_tools)
        return await executor.execute_graph(graph, {})

    def get_graph_snapshot(self, graph_id: str) -> Optional[Dict[str, Any]]:
        """
        Recovery Endpoint: Returns full graph snapshot for frontend rehydration.
        """
        graph = self.active_graphs.get(graph_id)
        if graph:
            return graph.dict()
        return None

    async def subscribe_to_graph(self, graph_id: str):
        """
        True Event-Driven Stream using asyncio.Queue.
        """
        graph = self.active_graphs.get(graph_id)
        if not graph:
            return

        # Wait for logger to be attached
        for _ in range(10):
            if hasattr(graph, '_logger') and graph._logger:
                break
            await asyncio.sleep(0.5)
        
        if not hasattr(graph, '_logger') or not graph._logger:
            return

        logger = graph._logger
        
        # Stream past events
        for event in logger.events:
            yield {
                "graph_id": graph_id,
                "event": event.dict(),
                "execution_state": graph.status,
                "event_type": "update"
            }

        # Stream future events
        while True:
            event = await logger.queue.get()
            yield {
                "graph_id": graph_id,
                "event": event.dict(),
                "execution_state": graph.status,
                "event_type": "update"
            }
            if event.type in ["GRAPH_COMPLETE", "GRAPH_ABORT"]:
                break

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

    async def _fallback_execute(self, visited: list[str], system_prompt: str, context: str, prompt: str, images: list, last_error: str, on_status: Optional[Callable] = None, depth: int = 0) -> str:
        """Recursive fallback chain: find next best provider until success or exhaustion."""
        # [ISSUE-2] Guard against infinite recursion or excessive attempts
        if depth >= 3:
            print(f"[Critical] Max fallback depth reached ({depth}). Aborting.")
            if on_status:
                await on_status({"type": "status", "stage": "ERROR", "message": "Max recovery attempts reached.", "timestamp": int(time.time() * 1000)})
            return await self._final_failsafe_response("MIA_SYSTEM_ALERT::EXCESSIVE_FALLBACK")

        try:
            # Select next best provider, excluding those already tried
            name, p = await routing_service.select_best_provider(purpose="llm", exclude=visited)
            if on_status:
                await on_status({"type": "status", "stage": "FALLBACK", "message": f"Trying alternate brain path: {name}...", "timestamp": int(time.time() * 1000)})
            
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
                
                if on_status:
                    await on_status({"type": "status", "stage": "DONE", "message": "Recovered via fallback.", "timestamp": int(time.time() * 1000)})
                return await self._apply_realism(response, config)
            except Exception as e:
                await self._update_metrics(name, False, 0)
                print(f"[Brain] Fallback {name} failed: {e}")
                return await self._fallback_execute(visited, system_prompt, context, prompt, images, str(e), on_status, depth=depth + 1)
                
        except Exception:
            # Exhaustion: No more providers found or all failed
            if on_status:
                await on_status({"type": "status", "stage": "ERROR", "message": "All brain paths exhausted.", "timestamp": int(time.time() * 1000)})
            return await self._final_failsafe_response(last_error)

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
