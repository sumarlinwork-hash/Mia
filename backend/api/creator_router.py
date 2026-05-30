import os
import sys
import time
from typing import Any, Dict, Optional
from fastapi import APIRouter
from pydantic import BaseModel, Field

# Ensure parent directory is in sys.path for clean import of core modules
parent_dir = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
if parent_dir not in sys.path:
    sys.path.insert(0, parent_dir)

creator_router = APIRouter(prefix="/api/creator", tags=["Creator Kernel"])

creator_projects: Dict[str, Dict[str, Any]] = {}

class CreatorProjectRequest(BaseModel):
    name: str = "Untitled Creator Project"
    brief: str = ""

class CreatorProjectPatch(BaseModel):
    name: Optional[str] = None
    brief: Optional[str] = None
    status: Optional[str] = None

class CreatorAssetRequest(BaseModel):
    name: str
    kind: str = "asset"
    url: str = ""
    metadata: Dict[str, Any] = Field(default_factory=dict)

class CreatorTimelineRequest(BaseModel):
    tracks: list[Dict[str, Any]] = Field(default_factory=list)

class CreatorPreviewRequest(BaseModel):
    quality: str = "draft"

class CreatorExportRequest(BaseModel):
    format: str = "mp4"
    quality: str = "draft"

@creator_router.get("/status")
async def creator_status():
    return {
        "status": "ready",
        "kernel": "creator",
        "message": "Creator kernel skeleton is available. Implementation is under construction."
    }

@creator_router.get("/projects")
async def list_creator_projects():
    return {
        "projects": list(creator_projects.values())
    }

@creator_router.post("/projects")
async def create_creator_project(req: CreatorProjectRequest):
    project_id = f"creator-{int(time.time() * 1000)}"
    project = {
        "id": project_id,
        "name": req.name,
        "brief": req.brief,
        "status": "draft",
        "assets": [],
        "timeline": {"tracks": []},
        "render": {"status": "idle", "progress": 0},
        "created_at": time.time(),
        "updated_at": time.time(),
    }
    creator_projects[project_id] = project
    return {"status": "success", "project": project}

@creator_router.get("/projects/{project_id}")
async def get_creator_project(project_id: str):
    project = creator_projects.get(project_id)
    if not project:
        return {"status": "error", "message": "Project not found"}
    return {"status": "success", "project": project}

@creator_router.patch("/projects/{project_id}")
async def update_creator_project(project_id: str, req: CreatorProjectPatch):
    project = creator_projects.get(project_id)
    if not project:
        return {"status": "error", "message": "Project not found"}
    updates = req.model_dump(exclude_none=True)
    project.update(updates)
    project["updated_at"] = time.time()
    return {"status": "success", "project": project}

@creator_router.post("/projects/{project_id}/assets")
async def add_creator_asset(project_id: str, req: CreatorAssetRequest):
    project = creator_projects.setdefault(project_id, {
        "id": project_id,
        "name": "Untitled Creator Project",
        "brief": "",
        "status": "draft",
        "assets": [],
        "timeline": {"tracks": []},
        "render": {"status": "idle", "progress": 0},
        "created_at": time.time(),
        "updated_at": time.time(),
    })
    asset = req.model_dump()
    asset["id"] = f"asset-{len(project['assets']) + 1}"
    project["assets"].append(asset)
    project["updated_at"] = time.time()
    return {"status": "success", "asset": asset}

@creator_router.post("/projects/{project_id}/timeline")
async def update_creator_timeline(project_id: str, req: CreatorTimelineRequest):
    project = creator_projects.get(project_id)
    if not project:
        return {"status": "error", "message": "Project not found"}
    project["timeline"] = req.model_dump()
    project["updated_at"] = time.time()
    return {"status": "success", "timeline": project["timeline"]}

@creator_router.post("/projects/{project_id}/preview")
async def create_creator_preview(project_id: str, req: CreatorPreviewRequest):
    return {
        "status": "success",
        "project_id": project_id,
        "quality": req.quality,
        "preview_url": "",
        "message": "Preview rendering is queued in skeleton mode.",
    }

@creator_router.post("/projects/{project_id}/export")
async def export_creator_project(project_id: str, req: CreatorExportRequest):
    project = creator_projects.get(project_id)
    if project:
        project["render"] = {"status": "queued", "progress": 0, "format": req.format, "quality": req.quality}
    return {"status": "success", "project_id": project_id, "render": project["render"] if project else {"status": "queued"}}

@creator_router.get("/projects/{project_id}/render-status")
async def get_creator_render_status(project_id: str):
    project = creator_projects.get(project_id)
    render = project.get("render") if project else {"status": "idle", "progress": 0}
    return {"status": "success", "project_id": project_id, "render": render}
