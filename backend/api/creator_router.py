import os
import sys
from fastapi import APIRouter

# Ensure parent directory is in sys.path for clean import of core modules
parent_dir = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
if parent_dir not in sys.path:
    sys.path.insert(0, parent_dir)

creator_router = APIRouter(prefix="/api/creator", tags=["Creator Kernel"])

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
        "projects": []
    }
