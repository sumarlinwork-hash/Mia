import os
import sys
import asyncio
from typing import Optional
from fastapi import APIRouter, HTTPException

# Ensure parent directory is in sys.path for clean import of core modules
parent_dir = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
if parent_dir not in sys.path:
    sys.path.insert(0, parent_dir)

from skill_manager import skill_manager

market_router = APIRouter(prefix="/api/market", tags=["Market Kernel"])

@market_router.get("/skills")
async def list_market_skills(market: Optional[str] = None):
    skills = await asyncio.to_thread(
        skill_manager.scan_skills,
        directory=skill_manager.MARKETPLACE_DIR
    )
    if market:
        normalized_market = market.strip().lower()
        skills = [s for s in skills if s.get("market") == normalized_market or s.get("category") == normalized_market]
    return skills

@market_router.post("/skills/install/{skill_id}")
async def install_market_skill(skill_id: str):
    result = await asyncio.to_thread(skill_manager.install_skill, skill_id)
    if result.get("status") != "success":
        raise HTTPException(status_code=404, detail=result.get("message"))
    return result

@market_router.delete("/skills/uninstall/{skill_id}")
async def uninstall_market_skill(skill_id: str):
    result = await asyncio.to_thread(skill_manager.uninstall_skill, skill_id)
    if result.get("status") != "success":
        raise HTTPException(status_code=404, detail=result.get("message"))
    return result
