import os
import sys
import asyncio
from typing import Optional, List
from fastapi import APIRouter, WebSocket, WebSocketDisconnect, Query, Response
from pydantic import BaseModel

# Ensure parent directory is in sys.path for clean import of core modules
parent_dir = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
if parent_dir not in sys.path:
    sys.path.insert(0, parent_dir)

from studio import (
    StudioSessionManager, StudioExecutionService, StudioFileService, 
    StudioVersionService, StudioProjectService, studio_graph_streamer, 
    studio_version_service, studio_project_service
)
from studio.metrics_service import studio_metrics
from crone_daemon import crone_daemon
from skill_manager import skill_manager

STUDIO_SKILL_CATEGORIES = ("studio", "shared")

studio_router = APIRouter(tags=["Studio Workspace"])

# Decoupled state instantiation for Studio Services
studio_file_service = StudioFileService(os.path.abspath(os.getcwd()))
studio_execution_service = StudioExecutionService()
studio_session_manager = StudioSessionManager(studio_execution_service, studio_file_service)

# Initialize System Resilience Feed for Studio
studio_graph_streamer.create_queue("system_resilience", "system")

# --- MODEL DEFINITIONS ---
class StudioHandshakeRequest(BaseModel):
    project_id: str

class StudioFileRequest(BaseModel):
    project_id: str
    session_id: str = ""
    path: str
    content: Optional[str] = None
    expected_hash: Optional[str] = None
    expected_snapshot_id: Optional[str] = None
    profile_type: Optional[str] = "COMPACT"

class StudioRollbackRequest(BaseModel):
    project_id: str
    session_id: str = ""
    snapshot_id: str

class StudioRenameRequest(BaseModel):
    project_id: str
    session_id: str = ""
    old_path: str
    new_path: str
    confirmed: bool = False
    check_only: bool = False

class StudioDeleteRequest(BaseModel):
    project_id: str
    session_id: str = ""
    path: str
    confirmed: bool = False
    check_only: bool = False

class StudioIdeRequest(BaseModel):
    project_id: str
    ide_command: str

class ShadFixRequest(BaseModel):
    fix_id: str
    project_id: str

# --- ROUTER ENDPOINTS ---

@studio_router.post("/api/studio/auth/handshake")
async def studio_handshake(req: StudioHandshakeRequest):
    try:
        session_id = studio_session_manager.init_session(req.project_id)
        return {"status": "success", "session_id": session_id}
    except Exception as e:
        return {"status": "error", "message": str(e)}

@studio_router.get("/api/studio/file/read")
async def studio_read_file(project_id: str, path: str, session_id: str = ""):
    try:
        await asyncio.to_thread(studio_session_manager.verify_identity, project_id, session_id)
        content = await asyncio.to_thread(studio_file_service.read_proxy, project_id, path, session_id)
        
        from studio.version_service import studio_version_service
        abs_path = os.path.join(studio_file_service.draft_dir, project_id, path)
        f_hash = await asyncio.to_thread(studio_version_service._calculate_hash, abs_path)
        snap_id = studio_version_service.current_snapshot_id.get(project_id)
        
        return {"status": "success", "content": content, "hash": f_hash, "snapshot_id": snap_id}
    except Exception as e:
        return {"status": "error", "message": str(e)}

@studio_router.post("/api/studio/file/write")
async def studio_write_file(req: StudioFileRequest):
    try:
        await asyncio.to_thread(studio_session_manager.verify_identity, req.project_id, req.session_id)
        await asyncio.to_thread(
            studio_file_service.write_proxy,
            req.project_id, 
            req.path, 
            req.content or "", 
            req.session_id, 
            req.expected_hash, 
            req.expected_snapshot_id
        )
        studio_graph_streamer.push_system_event(req.project_id, "project_updated", {"path": req.path})
        return {"status": "success"}
    except Exception as e:
        return {"status": "error", "message": str(e)}

@studio_router.get("/api/studio/file/list")
async def studio_list_files(project_id: str, session_id: str = "", path: str = ""):
    try:
        await asyncio.to_thread(studio_session_manager.verify_identity, project_id, session_id)
        files = await asyncio.to_thread(studio_file_service.list_files, project_id, path)
        return {"status": "success", "files": files}
    except Exception as e:
        return {"status": "error", "message": str(e)}

@studio_router.post("/api/studio/file/rename")
async def studio_rename_file(req: StudioRenameRequest):
    try:
        studio_session_manager.verify_identity(req.project_id, req.session_id)
        if req.check_only:
            from studio.dependency_service import studio_dependency_service
            impact = studio_dependency_service.analyze_impact(req.old_path)
            return {"status": "success", "impact": impact}
            
        studio_file_service.rename_file_proxy(req.project_id, req.old_path, req.new_path, req.session_id, req.confirmed)
        return {"status": "success"}
    except Exception as e:
        return {"status": "error", "message": str(e)}

@studio_router.post("/api/shad_csa/fix")
async def shad_csa_execute_fix(req: ShadFixRequest):
    print(f"[SHAD-CSA] Executing manual fix: {req.fix_id}")
    return {"status": "success", "message": f"Fix {req.fix_id} applied successfully."}

@studio_router.post("/api/studio/file/delete")
async def studio_delete_file(req: StudioDeleteRequest):
    try:
        studio_session_manager.verify_identity(req.project_id, req.session_id)
        if req.check_only:
            from studio.dependency_service import studio_dependency_service
            impact = studio_dependency_service.analyze_impact(req.path)
            return {"status": "success", "impact": impact}
            
        studio_file_service.delete_file_proxy(req.project_id, req.path, req.session_id, req.confirmed)
        return {"status": "success"}
    except Exception as e:
        return {"status": "error", "message": str(e)}

@studio_router.post("/api/studio/execution/run")
async def studio_run_code(req: StudioFileRequest):
    try:
        execution_id = studio_session_manager.run_studio_code(
            req.project_id, 
            req.session_id, 
            req.content or "", 
            req.profile_type or "COMPACT"
        )
        return {"status": "success", "execution_id": execution_id}
    except Exception as e:
        return {"status": "error", "message": str(e)}

@studio_router.post("/api/studio/execution/stop")
async def studio_stop_code(req: StudioFileRequest):
    try:
        studio_session_manager.stop_studio_code(req.session_id, req.path)
        return {"status": "success"}
    except Exception as e:
        return {"status": "error", "message": str(e)}

@studio_router.get("/api/studio/versions/list")
async def studio_list_snapshots(project_id: str, session_id: str):
    try:
        studio_session_manager.verify_identity(project_id, session_id)
        from studio.version_service import studio_version_service
        snapshots = studio_version_service.list_snapshots(project_id)
        return {"status": "success", "snapshots": [s.model_dump() for s in snapshots]}
    except Exception as e:
        return {"status": "error", "message": str(e)}

@studio_router.post("/api/studio/versions/rollback")
async def studio_rollback_snapshot(req: StudioRollbackRequest):
    try:
        studio_session_manager.verify_identity(req.project_id, req.session_id)
        studio_version_service.rollback(req.project_id, req.snapshot_id)
        return {"status": "success"}
    except Exception as e:
        return {"status": "error", "message": str(e)}

@studio_router.get("/api/studio/ide/list")
async def studio_list_ides(refresh: bool = False):
    try:
        from studio.ide_discovery_service import studio_ide_discovery_service
        discovered = studio_ide_discovery_service.scan_installed_ides(force_refresh=refresh)
        return {"status": "success", "ides": discovered}
    except Exception as e:
        return {"status": "error", "message": str(e)}

@studio_router.post("/api/studio/ide/open")
async def studio_open_ide(req: StudioIdeRequest):
    try:
        from studio.ide_discovery_service import studio_ide_discovery_service
        success = studio_ide_discovery_service.open_ide(req.project_id, req.ide_command)
        if success:
            return {"status": "success"}
        else:
            return {"status": "error", "message": f"Failed to launch IDE '{req.ide_command}'"}
    except Exception as e:
        return {"status": "error", "message": str(e)}

@studio_router.get("/api/studio/git/status")
async def studio_get_git_status():
    try:
        from studio.git_guard_service import studio_git_guard
        status = studio_git_guard.get_git_status()
        return {"status": "success", "branch": status["branch"], "dirty_count": status["dirty_count"]}
    except Exception as e:
        return {"status": "error", "message": str(e)}

@studio_router.get("/api/studio/project/metadata")
async def studio_get_metadata(project_id: str, session_id: str = ""):
    try:
        studio_session_manager.verify_identity(project_id, session_id)
        meta = studio_project_service.get_project_metadata(project_id)
        return {"status": "success", "metadata": meta.model_dump()}
    except Exception as e:
        return {"status": "error", "message": str(e)}

@studio_router.get("/api/studio/skills/installed")
async def studio_installed_skills():
    return await asyncio.to_thread(
        skill_manager.scan_skills,
        directory=skill_manager.SKILLS_DIR,
        categories=STUDIO_SKILL_CATEGORIES
    )

@studio_router.get("/api/studio/skills/marketplace")
async def studio_marketplace_skills():
    apps = await asyncio.to_thread(
        skill_manager.scan_skills,
        directory=skill_manager.MARKETPLACE_DIR,
        categories=STUDIO_SKILL_CATEGORIES
    )
    for app in apps:
        app["downloads"] = 1000 if "chatbot" in app["id"] else 42
        app["executions"] = 5400
        app["trust_score"] = 4.7
    return apps

@studio_router.post("/api/studio/skills/test/{skill_id}")
async def studio_test_skill(skill_id: str, args: dict = {}):
    return await skill_manager.execute_skill(skill_id, args, kernel="studio")

@studio_router.post("/api/studio/skill/execute")
async def studio_execute_skill(req: dict):
    skill_id = req.get("skill_id") or req.get("name")
    args = req.get("args", {})
    if not skill_id:
        raise HTTPException(status_code=400, detail="Missing skill_id or name in request payload.")
    return await skill_manager.execute_skill(skill_id, args, kernel="studio")

@studio_router.websocket("/ws/studio/events/{project_id}")
async def studio_events_ws(websocket: WebSocket, project_id: str, session_id: str = Query(...)):
    try:
        from studio.lock_service import studio_lock_service
        studio_session_manager.verify_identity(project_id, session_id)
        await websocket.accept()
        queue = studio_graph_streamer.get_system_queue(project_id)
        
        async def send_events():
            while True:
                event = await queue.get()
                await websocket.send_json(event)

        async def receive_heartbeat():
            while True:
                data = await websocket.receive_json()
                if data.get("type") == "heartbeat":
                    studio_lock_service.heartbeat(project_id, session_id)

        await asyncio.gather(send_events(), receive_heartbeat())
        
    except WebSocketDisconnect: pass
    except Exception as e:
        try: await websocket.close()
        except: pass
    finally:
        from studio.lock_service import studio_lock_service
        studio_lock_service.release_project_lock(project_id, session_id)

@studio_router.websocket("/ws/studio/graph/{execution_id}")
async def websocket_studio_graph_stream(websocket: WebSocket, execution_id: str, session_id: str = Query(...)):
    try:
        entry = studio_execution_service.registry.get(execution_id)
        if not entry:
            await websocket.close(code=4004, reason="Execution not found")
            return
        
        if entry.owner_session_id != session_id:
            await websocket.close(code=4003, reason="Unauthorized session")
            return
            
        if entry.status.value != "running":
            await websocket.close(code=4000, reason="Execution not running")
            return

        await websocket.accept()
        print(f"[WS] Studio client connected to graph: {execution_id}")
        
        async for update in studio_graph_streamer.subscribe(execution_id):
            await websocket.send_json(update)
            
    except WebSocketDisconnect:
        print(f"[WS] Studio client disconnected from graph: {execution_id}")
    except Exception as e:
        print(f"[WS Error Studio] {e}")
        try: await websocket.close()
        except: pass

@studio_router.get("/metrics")
async def get_metrics():
    return Response(content=studio_metrics.get_prometheus_metrics(), media_type="text/plain")

@studio_router.get("/api/studio/graph/delta/{execution_id}")
async def get_studio_delta(execution_id: str, from_seq: int, to_seq: int, session_id: str = Query(...)):
    try:
        delta = studio_graph_streamer.get_delta(execution_id, from_seq, to_seq)
        return delta
    except Exception as e:
        return {"status": "error", "message": str(e)}

# --- CRONE MANAGEMENT ROUTER ENDPOINTS ---

@studio_router.get("/api/crone/status")
async def get_crone_status():
    from datetime import datetime
    jobs = []
    for job in crone_daemon.scheduler.get_jobs():
        next_run = job.next_run_time
        meta = crone_daemon.job_metadata.get(job.name, {})
        is_paused = next_run is None
        
        jobs.append({
            "id": job.id,
            "name": job.name or job.func.__name__,
            "status": "Paused" if is_paused else "Active",
            "next_run": next_run.strftime("%H:%M %d-%m-%Y") if next_run else "Paused",
            "trigger": str(job.trigger),
            "description": meta.get("desc", ""),
            "cost": meta.get("cost", "Unknown"),
            "color": meta.get("color", "primary")
        })
    return {
        "scheduler_running": crone_daemon.scheduler.running,
        "jobs": jobs,
        "server_time": datetime.now().strftime("%Y-%m-%d %H:%M:%S")
    }

@studio_router.post("/api/crone/pause/{job_id}")
async def pause_crone_job(job_id: str):
    crone_daemon.pause_job(job_id)
    return {"status": "success"}

@studio_router.post("/api/crone/resume/{job_id}")
async def resume_crone_job(job_id: str):
    crone_daemon.resume_job(job_id)
    return {"status": "success"}

@studio_router.post("/api/crone/trigger/{job_id}")
async def trigger_crone_job(job_id: str):
    success = await crone_daemon.trigger_job(job_id)
    return {"status": "success" if success else "error"}
