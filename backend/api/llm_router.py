import os
import sys
import time
import asyncio
import httpx
from typing import Dict, Optional, Any
from fastapi import APIRouter, Query, HTTPException
from pydantic import BaseModel

# Ensure parent directory is in sys.path for clean import of core modules
parent_dir = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
if parent_dir not in sys.path:
    sys.path.insert(0, parent_dir)

from config import load_config, save_config, MIAConfig, ProviderConfig
from crone_daemon import crone_daemon
from mia_comm.brain_orchestrator import brain_orchestrator
from core.provider_resolver import provider_resolver
from core.mode_hub import mode_hub, MIAMode

llm_router = APIRouter(prefix="/api", tags=["LLM Warehouse"])

# Global tracker for configuration version and task execution
current_refresh_version = 0
_active_refresh_task: Optional[asyncio.Task] = None
start_time = time.time()

class TestConnectionRequest(BaseModel):
    provider_name: str
    api_key: str
    base_url: str
    protocol: str = "openai"
    model_id: str = ""
    purpose: str = "Inti Logika & Pikiran"

async def _bg_config_refresh(config: MIAConfig, version: int, skip_brain: bool = False):
    global current_refresh_version
    
    if version < current_refresh_version:
        print(f"[Orchestrator] Skipping stale refresh version: {version} (Latest is {current_refresh_version})")
        return

    print(f"[Orchestrator] Executing versioned refresh: {version} (SkipBrain={skip_brain})")
    
    try:
        if not skip_brain:
            # Rebuild Brain (Sync logic inside) - ONLY if critical config changed
            brain_orchestrator._refresh_brain_nodes()
        
        # Check cancellation point
        await asyncio.sleep(0) 
        
        # Sync Mode Hub
        mode_hub.set_mode(MIAMode(config.os_mode))
        
        # Broadcast (Async)
        await crone_daemon.broadcast_config_update()
        print(f"[Orchestrator] V{version} Refresh Complete")
        
    except asyncio.CancelledError:
        print(f"[Orchestrator] V{version} Refresh Cancelled by newer version")
        raise
    except Exception as e:
        print(f"[Orchestrator] V{version} Refresh Failed: {e}")

@llm_router.get("/config")
async def get_config():
    return load_config()

@llm_router.post("/config")
async def update_config(config: MIAConfig):
    global current_refresh_version, _active_refresh_task
    from runtime_logger import runtime_logger
    start = time.time()
    
    current_refresh_version += 1
    v = current_refresh_version
    
    # Smart Sync: Determine if we need a full brain refresh
    try:
        old_config = load_config(force_reload=True)
        # Compare core fields (excluding appearance)
        old_core = old_config.model_dump(exclude={"appearance"})
        new_core = config.model_dump(exclude={"appearance"})
        appearance_only = (old_core == new_core)
    except Exception:
        appearance_only = False

    # Cancellation-Aware: Cancel old task if still running
    if _active_refresh_task and not _active_refresh_task.done():
        _active_refresh_task.cancel()
        try:
            await _active_refresh_task
        except asyncio.CancelledError:
            pass
    
    try:
        print(f"[Config] Received update request V{v}. (AppearanceOnly={appearance_only})")
        save_config(config)
        
        # Save new task to global tracker (Async context safe)
        _active_refresh_task = asyncio.create_task(_bg_config_refresh(config, v, skip_brain=appearance_only))
        
        runtime_logger.log_metric("update_config_latency", (time.time() - start) * 1000)
        return {"status": "success", "version": v}

    except Exception as e:
        print(f"[Config] Critical failure during save/sync: {e}")
        import traceback
        traceback.print_exc()
        raise HTTPException(status_code=500, detail=str(e))

@llm_router.get("/system/metrics")
async def get_system_metrics():
    import anyio
    from runtime_logger import runtime_logger
    
    try:
        limiter = anyio.to_thread.current_default_thread_limiter()
        return {
            "status": "healthy",
            "uptime": time.time() - start_time,
            "threadpool": {
                "total": limiter.total_tokens,
                "borrowed": limiter.borrowed_tokens,
                "available": limiter.total_tokens - limiter.borrowed_tokens
            },
            "history": runtime_logger.get_metrics_summary()
        }
    except Exception as e:
        return {"status": "error", "message": str(e)}

@llm_router.get("/providers")
async def get_providers():
    config = load_config()
    # Merge RAM states dynamically
    for name, p in config.providers.items():
        r_state = brain_orchestrator.get_runtime_state(name)
        p.active_path = r_state.get("active_path", "")
        p.health_status = r_state.get("health_status", "Healthy")
    return {"providers": config.providers}

@llm_router.post("/providers")
async def add_provider(name: str, config_data: ProviderConfig):
    config = load_config()
    config.providers[name] = config_data
    save_config(config)
    brain_orchestrator._refresh_brain_nodes() # INSTANT REFRESH
    await crone_daemon.broadcast_config_update()
    return {"status": "success"}

@llm_router.delete("/providers/{name}")
async def delete_provider(name: str):
    config = load_config()
    if name in config.providers:
        del config.providers[name]
        save_config(config)
        brain_orchestrator._refresh_brain_nodes() # INSTANT REFRESH
        await crone_daemon.broadcast_config_update()
        return {"status": "success"}
    return {"status": "error", "message": "Provider not found"}

@llm_router.post("/providers/test/{name}")
async def test_provider(name: str, mutate_stats: bool = Query(False)):
    config = load_config()
    if name not in config.providers:
        print(f"[Test] Provider '{name}' not found in config keys: {list(config.providers.keys())}")
        return {"status": "error", "message": "Provider not found"}

    p = config.providers[name]
    print(f"[Test] Testing provider: {name} (Model: {p.model_id}, URL: {p.base_url})")

    import httpx
    start = time.time()
    BROWSER_HEADERS = {
        "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36"
    }

    try:
        async with httpx.AsyncClient(
            timeout=float(config.test_timeout),
            headers=BROWSER_HEADERS
        ) as client:
            try:
                await client.get("https://www.google.com", timeout=2.0)
            except:
                pass

            target_url = p.base_url.strip()
            model_id = p.model_id
            api_key = p.api_key
            purpose = p.purpose

            # --- GRAND RESOLVER STEP ---
            resolved = provider_resolver.resolve(name, model_id, target_url, api_key)
            final_url = resolved["url"]
            final_api_key = resolved["api_key"]
            protocol = resolved["protocol"]
            
            print(f"[Test] Smart-Routing to: {final_url} (Protocol: {protocol})")

            is_chat_based = purpose in [
                "Inti Logika & Pikiran",
                "Persepsi Visual & Imajinasi",
                "Analisis Data & Pengetahuan",
                "Khusus Intimacy & Uncensored",
            ]

            if is_chat_based:
                if "huggingface" in name.lower() or "huggingface" in target_url.lower():
                    resp_text = await brain_orchestrator._call_huggingface_smart(
                        p, "You are a context summarizer.", "Tulis kata OK saja.", []
                    )
                    if "OK" not in resp_text.upper():
                        raise Exception(f"Inference output did not match handshake criteria. Got: {resp_text[:100]}")
                elif protocol == "gemini":
                    if "key=" not in final_url:
                        sep = "&" if "?" in final_url else "?"
                        final_url = f"{final_url}{sep}key={final_api_key}"
                    resp = await client.post(final_url, json={"contents": [{"parts": [{"text": "ping"}]}]})
                    resp.raise_for_status()
                elif protocol == "hf_native":
                    headers = {"Content-Type": "application/json"}
                    if final_api_key:
                        headers["Authorization"] = f"Bearer {final_api_key}"
                    resp = await client.post(final_url, headers=headers, json={"inputs": "ping"})
                    resp.raise_for_status()
                elif protocol == "native_binary":
                    if not os.path.exists(final_url):
                        raise Exception(f"File model tidak ditemukan di jalur: {final_url}")
                    try:
                        resp_text = await brain_orchestrator._call_native_binary(final_url, "Tulis OK.", "ping")
                        if not resp_text:
                            raise Exception("Model tidak memberikan respons.")
                        class MockResp: status_code = 200
                        resp = MockResp()
                    except Exception as e:
                        raise Exception(f"Gagal inisialisasi model: {str(e)}")
                else:
                    headers = {"Content-Type": "application/json"}
                    if final_api_key:
                        headers["Authorization"] = f"Bearer {final_api_key}"
                    resp = await client.post(
                        final_url,
                        headers=headers,
                        json={
                            "model": model_id,
                            "messages": [{"role": "user", "content": "ping"}],
                            "max_tokens": 5
                        },
                    )
                    resp.raise_for_status()
            else:
                resp = await client.get(target_url)
                resp.raise_for_status()

            latency = int((time.time() - start) * 1000)
            if mutate_stats:
                from core.stats_manager import stats_manager
                stats_manager.update_stats(name, True, latency)

            return {"status": "success", "latency": latency}

    except Exception as e:
        print(f"Handshake failed for {name}: {e}")
        if mutate_stats:
            from core.stats_manager import stats_manager
            stats_manager.update_stats(name, False, 0)
        return {"status": "error", "message": str(e)}

@llm_router.post("/test-connection")
async def test_connection(req: TestConnectionRequest):
    import httpx
    print(f"[Test-Connection] Request for: {req.provider_name} ({req.model_id})")
    
    is_local = "localhost" in req.base_url or "127.0.0.1" in req.base_url
    if not req.api_key and not is_local:
        return {"status": "error", "message": "API Key tidak boleh kosong."}

    protocol = req.protocol.lower()
    purpose = req.purpose
    start = time.time()
    config = load_config()
    
    try:
        async with httpx.AsyncClient(timeout=float(config.test_timeout)) as client:
            is_chat_based = purpose in [
                "Inti Logika & Pikiran", 
                "Persepsi Visual & Imajinasi", 
                "Analisis Data & Pengetahuan",
                "Khusus Intimacy & Uncensored"
            ]
            
            if is_chat_based:
                resolved = provider_resolver.resolve(req.provider_name, req.model_id, req.base_url, req.api_key)
                final_url = resolved["url"]
                final_api_key = resolved["api_key"]
                protocol = resolved["protocol"]
                print(f"[Test-Connection] Smart-Routing to: {final_url} (Protocol: {protocol})")

                if "huggingface" in req.provider_name.lower() or "huggingface" in req.base_url.lower():
                    temp_p = ProviderConfig(
                        display_name=req.provider_name, model_id=req.model_id, base_url=req.base_url, api_key=req.api_key
                    )
                    resp_text = await brain_orchestrator._call_huggingface_smart(
                        temp_p, "You are a context summarizer.", "Tulis kata OK saja.", []
                    )
                    if "OK" not in resp_text.upper():
                        raise Exception(f"Inference output did not match handshake criteria. Got: {resp_text[:100]}")
                elif protocol == "gemini":
                    if "key=" not in final_url:
                        sep = "&" if "?" in final_url else "?"
                        final_url = f"{final_url}{sep}key={final_api_key}"
                    resp = await client.post(final_url, json={"contents": [{"parts": [{"text": "ping"}]}]})
                elif protocol == "hf_native":
                    headers = {"Content-Type": "application/json"}
                    if final_api_key:
                        headers["Authorization"] = f"Bearer {final_api_key}"
                    resp = await client.post(final_url, headers=headers, json={"inputs": "ping"})
                elif protocol == "native_binary":
                    if not os.path.exists(final_url):
                        return {"status": "error", "message": f"File model tidak ditemukan di jalur: {final_url}"}
                    try:
                        resp_text = await brain_orchestrator._call_native_binary(final_url, "Tulis OK.", "ping")
                        if resp_text:
                            class MockResp: status_code = 200
                            resp = MockResp()
                        else:
                            raise Exception("Model tidak memberikan respons.")
                    except Exception as e:
                        return {"status": "error", "message": f"Gagal inisialisasi model: {str(e)}"}
                else:
                    headers = {"Content-Type": "application/json"}
                    if final_api_key:
                        headers["Authorization"] = f"Bearer {final_api_key}"
                    resp = await client.post(
                        final_url,
                        headers=headers,
                        json={
                            "model": req.model_id,
                            "messages": [{"role": "user", "content": "ping"}],
                            "max_tokens": 5
                        },
                    )
            else:
                resp = await client.get(req.base_url or "https://google.com")

            latency = int((time.time() - start) * 1000)

            if resp.status_code == 200:
                config = load_config()
                if req.provider_name in config.providers:
                    p = config.providers[req.provider_name]
                    p.latency = latency
                    p.health_ok += 1
                    save_config(config)
                return {"status": "success", "latency": latency, "message": f"Terhubung ke {req.provider_name}! Latensi: {latency}ms"}
            elif resp.status_code in (401, 403):
                return {"status": "error", "message": f"API Key tidak valid (HTTP {resp.status_code})."}
            else:
                return {"status": "error", "message": f"Server merespons dengan status {resp.status_code}."}
    except httpx.ConnectTimeout:
        return {"status": "error", "message": "Koneksi timeout. Periksa jaringan atau URL provider."}
    except Exception as e:
        return {"status": "error", "message": str(e)}

@llm_router.get("/diagnostic")
async def get_diagnostic():
    from core.diagnostic_engine import run_full_diagnostic
    results = await run_full_diagnostic()
    return {"status": "success", "results": results}
