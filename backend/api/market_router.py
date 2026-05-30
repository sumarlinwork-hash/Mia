import os
import sys
import asyncio
from typing import Optional, Any, Dict
from fastapi import APIRouter, HTTPException, Body
from pydantic import BaseModel

# Ensure parent directory is in sys.path for clean import of core modules
parent_dir = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
if parent_dir not in sys.path:
    sys.path.insert(0, parent_dir)

from skill_manager import skill_manager

market_router = APIRouter(prefix="/api/market", tags=["Market Kernel"])

class MarketSkillExecuteRequest(BaseModel):
    skill_id: str
    args: Dict[str, Any] = {}
    target_kernel: Optional[str] = None

def _infer_skill_kernel(skill: dict, requested_kernel: Optional[str] = None) -> str:
    if requested_kernel:
        return requested_kernel.strip().lower()

    allowed = skill.get("allowed_kernels")
    if isinstance(allowed, (list, tuple)) and allowed:
        normalized = [str(item).strip().lower() for item in allowed if str(item).strip()]
        for preferred in ("companion", "studio", "creator"):
            if preferred in normalized:
                return preferred

    market = str(skill.get("market") or skill.get("category") or "companion").strip().lower()
    if market in {"studio", "creator", "companion"}:
        return market
    return "companion"

@market_router.get("/skills")
async def list_market_skills(market: Optional[str] = None):
    skills = await asyncio.to_thread(
        skill_manager.scan_skills,
        directory=skill_manager.MARKETPLACE_DIR
    )
    if market:
        normalized_market = market.strip().lower()
        accepted = {normalized_market}
        if normalized_market == "companion":
            accepted.add("shared")
        skills = [
            s for s in skills
            if str(s.get("market", "")).lower() in accepted
            or str(s.get("category", "")).lower() in accepted
        ]
    return skills

@market_router.post("/skills/test/{skill_id}")
async def test_market_skill(skill_id: str, args: dict = Body(default_factory=dict)):
    try:
        skill = skill_manager.get_skill(skill_id) or skill_manager.get_skill(skill_id, directory=skill_manager.MARKETPLACE_DIR)
        if not skill:
            raise HTTPException(status_code=404, detail=f"Skill '{skill_id}' not found.")
        target_kernel = _infer_skill_kernel(skill)
        return await skill_manager.execute_skill(skill_id, args, kernel=target_kernel)
    except Exception as exc:
        raise HTTPException(status_code=400, detail=str(exc))

@market_router.post("/skills/execute")
async def execute_market_skill(req: MarketSkillExecuteRequest):
    skill = skill_manager.get_skill(req.skill_id)
    if not skill:
        raise HTTPException(status_code=404, detail=f"Installed skill '{req.skill_id}' not found.")
    target_kernel = _infer_skill_kernel(skill, req.target_kernel)
    return await skill_manager.execute_skill(req.skill_id, req.args, kernel=target_kernel)

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
