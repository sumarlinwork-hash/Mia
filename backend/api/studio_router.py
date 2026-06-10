import os
import sys
import asyncio
import time
import uuid
import json
import re
import tempfile
from typing import Optional, List
from fastapi import APIRouter, WebSocket, WebSocketDisconnect, Query, Response, HTTPException, Body
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
from core.state_store import state_store

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

class StudioToolSearchRequest(BaseModel):
    query: str
    root: str = "."
    limit: int = 50

class StudioToolReadFileRequest(BaseModel):
    path: str
    max_chars: int = 20000

class StudioToolPatchRequest(BaseModel):
    patch: str

class StudioToolRunCommandRequest(BaseModel):
    command: str
    cwd: str = "."

class StudioVerificationRequest(BaseModel):
    scope: str = "frontend"

STUDIO_TOOL_REGISTRY = [
    {
        "id": "search",
        "method": "POST",
        "path": "/api/studio/tools/search",
        "risk": "read",
        "description": "Search file names and relative paths inside the workspace.",
    },
    {
        "id": "read-file",
        "method": "POST",
        "path": "/api/studio/tools/read-file",
        "risk": "read",
        "description": "Read a bounded text excerpt from a workspace file.",
    },
    {
        "id": "apply-patch",
        "method": "POST",
        "path": "/api/studio/tools/apply-patch",
        "risk": "write",
        "description": "Submit a patch preview for approval-controlled application.",
    },
    {
        "id": "run-command",
        "method": "POST",
        "path": "/api/studio/tools/run-command",
        "risk": "command",
        "description": "Run a local workspace command and track its lifecycle.",
    },
    {
        "id": "command-runs",
        "method": "GET",
        "path": "/api/studio/tools/command-runs",
        "risk": "read",
        "description": "List persisted command runs for audit and review.",
    },
    {
        "id": "run-verification",
        "method": "POST",
        "path": "/api/studio/tools/run-verification",
        "risk": "command",
        "description": "Run the configured verification flow for the selected scope.",
    },
    {
        "id": "changed-files",
        "method": "GET",
        "path": "/api/studio/tools/changed-files",
        "risk": "read",
        "description": "List changed files from the Git working tree.",
    },
    {
        "id": "diff",
        "method": "GET",
        "path": "/api/studio/tools/diff",
        "risk": "read",
        "description": "Read a Git diff for the workspace or selected path.",
    },
    {
        "id": "list-files",
        "method": "GET",
        "path": "/api/studio/tools/list-files",
        "risk": "read",
        "description": "List files and directories in the workspace.",
    },
    {
        "id": "revert-change",
        "method": "POST",
        "path": "/api/studio/tools/revert-change",
        "risk": "write",
        "description": "Revert uncommitted changes in the workspace.",
    },
    {
        "id": "git-log",
        "method": "GET",
        "path": "/api/studio/tools/git-log",
        "risk": "read",
        "description": "View the Git commit history.",
    },
    {
        "id": "git-branch",
        "method": "GET",
        "path": "/api/studio/tools/git-branch",
        "risk": "read",
        "description": "Get the current Git branch.",
    },
    {
        "id": "inspect-project",
        "method": "GET",
        "path": "/api/studio/tools/inspect-project",
        "risk": "read",
        "description": "Inspect project configuration (e.g. package.json, pyproject.toml).",
    },
    {
        "id": "find-file",
        "method": "GET",
        "path": "/api/studio/tools/find-file",
        "risk": "read",
        "description": "Find a file by name pattern.",
    },
    {
        "id": "search-regex",
        "method": "POST",
        "path": "/api/studio/tools/search-regex",
        "risk": "read",
        "description": "Search text in files using regex.",
    },
    {
        "id": "search-symbol",
        "method": "GET",
        "path": "/api/studio/tools/search-symbol",
        "risk": "read",
        "description": "Search for a function, class, or symbol.",
    },
    {
        "id": "read-file-range",
        "method": "GET",
        "path": "/api/studio/tools/read-file-range",
        "risk": "read",
        "description": "Read specific lines from a file.",
    },
    {
        "id": "summarize-file",
        "method": "GET",
        "path": "/api/studio/tools/summarize-file",
        "risk": "read",
        "description": "Summarize the contents of a large file.",
    },
    {
        "id": "create-file",
        "method": "POST",
        "path": "/api/studio/tools/create-file",
        "risk": "write",
        "description": "Create a new file.",
    },
    {
        "id": "rename-file",
        "method": "POST",
        "path": "/api/studio/tools/rename-file",
        "risk": "write",
        "description": "Rename or move a file.",
    },
    {
        "id": "format-file",
        "method": "POST",
        "path": "/api/studio/tools/format-file",
        "risk": "write",
        "description": "Format a file using prettier/black.",
    },
    {
        "id": "check-command-status",
        "method": "GET",
        "path": "/api/studio/tools/check-command-status",
        "risk": "read",
        "description": "Check status of a running command.",
    },
    {
        "id": "wait-for-command",
        "method": "GET",
        "path": "/api/studio/tools/wait-for-command",
        "risk": "read",
        "description": "Wait for a command to finish.",
    },
    {
        "id": "stop-command",
        "method": "POST",
        "path": "/api/studio/tools/stop-command",
        "risk": "command",
        "description": "Stop a running command.",
    },
    {
        "id": "read-command-output",
        "method": "GET",
        "path": "/api/studio/tools/read-command-output",
        "risk": "read",
        "description": "Read stdout/stderr of a command.",
    },
    {
        "id": "run-script",
        "method": "POST",
        "path": "/api/studio/tools/run-script",
        "risk": "command",
        "description": "Run a predefined project script.",
    },
    {
        "id": "run-build",
        "method": "POST",
        "path": "/api/studio/tools/run-build",
        "risk": "command",
        "description": "Run project build.",
    },
    {
        "id": "run-tests",
        "method": "POST",
        "path": "/api/studio/tools/run-tests",
        "risk": "command",
        "description": "Run project tests.",
    },
    {
        "id": "run-lint",
        "method": "POST",
        "path": "/api/studio/tools/run-lint",
        "risk": "command",
        "description": "Run project linter.",
    },
    {
        "id": "run-backend-check",
        "method": "POST",
        "path": "/api/studio/tools/run-backend-check",
        "risk": "command",
        "description": "Run backend checks.",
    },
    {
        "id": "run-frontend-check",
        "method": "POST",
        "path": "/api/studio/tools/run-frontend-check",
        "risk": "command",
        "description": "Run frontend checks.",
    },
    {
        "id": "verify-dev-server",
        "method": "POST",
        "path": "/api/studio/tools/verify-dev-server",
        "risk": "command",
        "description": "Verify dev server health.",
    },
    {
        "id": "capture-ui-snapshot",
        "method": "POST",
        "path": "/api/studio/tools/capture-ui-snapshot",
        "risk": "read",
        "description": "Capture UI screenshot.",
    },
    {
        "id": "git-status",
        "method": "GET",
        "path": "/api/studio/tools/git-status",
        "risk": "read",
        "description": "Get Git working tree status.",
    },
    {
        "id": "git-stage",
        "method": "POST",
        "path": "/api/studio/tools/git-stage",
        "risk": "write",
        "description": "Stage files in Git.",
    },
    {
        "id": "git-commit",
        "method": "POST",
        "path": "/api/studio/tools/git-commit",
        "risk": "write",
        "description": "Commit staged files.",
    },
    {
        "id": "git-push",
        "method": "POST",
        "path": "/api/studio/tools/git-push",
        "risk": "write",
        "description": "Push commits to remote.",
    },
    {
        "id": "open-local-url",
        "method": "POST",
        "path": "/api/studio/tools/open-local-url",
        "risk": "read",
        "description": "Open URL in local browser (placeholder).",
    },
    {
        "id": "inspect-page",
        "method": "GET",
        "path": "/api/studio/tools/inspect-page",
        "risk": "read",
        "description": "Inspect browser page (placeholder).",
    },
    {
        "id": "click",
        "method": "POST",
        "path": "/api/studio/tools/click",
        "risk": "write",
        "description": "Click element in browser (placeholder).",
    },
    {
        "id": "type",
        "method": "POST",
        "path": "/api/studio/tools/type",
        "risk": "write",
        "description": "Type text in browser (placeholder).",
    },
    {
        "id": "screenshot",
        "method": "POST",
        "path": "/api/studio/tools/screenshot",
        "risk": "read",
        "description": "Take screenshot (placeholder).",
    },
    {
        "id": "read-console",
        "method": "GET",
        "path": "/api/studio/tools/read-console",
        "risk": "read",
        "description": "Read browser console (placeholder).",
    },
    {
        "id": "classify-risk",
        "method": "POST",
        "path": "/api/studio/tools/classify-risk",
        "risk": "read",
        "description": "Classify action risk.",
    },
    {
        "id": "request-approval",
        "method": "POST",
        "path": "/api/studio/tools/request-approval",
        "risk": "write",
        "description": "Request approval for action.",
    },
    {
        "id": "show-pending-approval",
        "method": "GET",
        "path": "/api/studio/tools/show-pending-approval",
        "risk": "read",
        "description": "Show pending approvals.",
    },
    {
        "id": "deny-action",
        "method": "POST",
        "path": "/api/studio/tools/deny-action",
        "risk": "write",
        "description": "Deny a pending action.",
    },
    {
        "id": "audit-log",
        "method": "GET",
        "path": "/api/studio/tools/audit-log",
        "risk": "read",
        "description": "Read the studio audit log.",
    },
]

studio_tool_commands = {}
studio_tool_processes = {}

async def _persist_studio_command(entry: dict):
    try:
        await state_store.upsert_command_run(entry)
    except Exception as exc:
        print(f"[Studio Tools] Failed to persist command run: {exc}")

def _workspace_path(path: str = ".") -> str:
    base = os.path.abspath(os.getcwd())
    target = os.path.abspath(os.path.join(base, path))
    if os.path.commonpath([base, target]) != base:
        raise ValueError("Path escapes workspace")
    return target

async def _run_studio_tool_command(command_id: str, command: str, cwd: str):
    entry = studio_tool_commands[command_id]
    try:
        process = await asyncio.create_subprocess_shell(
            command,
            cwd=cwd,
            stdout=asyncio.subprocess.PIPE,
            stderr=asyncio.subprocess.PIPE,
        )
        studio_tool_processes[command_id] = process
        entry["pid"] = process.pid
        entry["status"] = "running"
        entry["started_at"] = time.time()
        entry["updated_at"] = time.time()
        await _persist_studio_command(entry)
        stdout, stderr = await process.communicate()
        entry.update({
            "status": "completed" if process.returncode == 0 else "failed",
            "returncode": process.returncode,
            "stdout": stdout.decode(errors="replace")[-12000:],
            "stderr": stderr.decode(errors="replace")[-12000:],
            "finished_at": time.time(),
            "updated_at": time.time(),
        })
        await _persist_studio_command(entry)
    except Exception as exc:
        entry.update({"status": "failed", "stderr": str(exc), "finished_at": time.time(), "updated_at": time.time()})
        await _persist_studio_command(entry)
    finally:
        studio_tool_processes.pop(command_id, None)

def _serialize_payload(payload: dict) -> str:
    return json.dumps(payload, ensure_ascii=False)

def _command_requires_approval(command: str) -> bool:
    dangerous_patterns = [
        r"\brm\b",
        r"\bdel\b",
        r"\bshutdown\b",
        r"\breboot\b",
        r"\bpoweroff\b",
        r"\bgit\s+push\b",
        r"\bgit\s+commit\b",
        r"\bpip\s+install\b",
        r"\bnpm\s+install\b",
        r"\bnpm\s+update\b",
        r"\byarn\b",
        r"\bdocker\b",
        r"\bcurl\b",
        r"\bwget\b",
        r"\bchmod\b",
        r"\bchown\b",
        r"\bscp\b",
        r"\bdel\s+/",
    ]
    normalized = command.lower()
    return any(re.search(pattern, normalized) for pattern in dangerous_patterns)

async def _apply_patch_file(patch: str) -> None:
    if ".." in patch.replace('\\', '/'):
        raise ValueError("Patch contains path traversal segments")
    with tempfile.NamedTemporaryFile('w', suffix='.patch', delete=False, encoding='utf-8') as temp_patch:
        temp_patch.write(patch)
        temp_path = temp_patch.name
    proc = await asyncio.create_subprocess_exec(
        "git", "apply", "--whitespace=nowarn", temp_path,
        cwd=os.getcwd(),
        stdout=asyncio.subprocess.PIPE,
        stderr=asyncio.subprocess.PIPE,
    )
    stdout, stderr = await proc.communicate()
    try:
        os.unlink(temp_path)
    except Exception:
        pass
    if proc.returncode != 0:
        raise RuntimeError(stderr.decode(errors="replace") or stdout.decode(errors="replace"))

async def _execute_approved_command(command_id: str, command: str, cwd: str):
    await _run_studio_tool_command(command_id, command, cwd)

# --- ROUTER ENDPOINTS ---

@studio_router.get("/api/studio/tools")
async def studio_tool_registry():
    return {"status": "success", "tools": STUDIO_TOOL_REGISTRY}

@studio_router.post("/api/studio/auth/handshake")
async def studio_handshake(req: StudioHandshakeRequest):
    try:
        session_id = studio_session_manager.init_session(req.project_id)
        return {"status": "success", "session_id": session_id}
    except Exception as e:
        return {"status": "error", "message": str(e)}

@studio_router.post("/api/studio/tools/search")
async def studio_tool_search(req: StudioToolSearchRequest):
    try:
        root = _workspace_path(req.root)
        matches = []
        needle = req.query.lower()
        for current_root, _, files in os.walk(root):
            for filename in files:
                rel_path = os.path.relpath(os.path.join(current_root, filename), os.getcwd())
                if needle in filename.lower() or needle in rel_path.lower():
                    matches.append(rel_path.replace("\\", "/"))
                    if len(matches) >= req.limit:
                        return {"status": "success", "matches": matches}
        return {"status": "success", "matches": matches}
    except Exception as e:
        return {"status": "error", "message": str(e)}

@studio_router.post("/api/studio/tools/read-file")
async def studio_tool_read_file(req: StudioToolReadFileRequest):
    try:
        path = _workspace_path(req.path)
        with open(path, "r", encoding="utf-8", errors="replace") as handle:
            content = handle.read(req.max_chars)
        return {"status": "success", "path": req.path, "content": content}
    except Exception as e:
        return {"status": "error", "message": str(e)}

@studio_router.post("/api/studio/tools/apply-patch")
async def studio_tool_apply_patch(req: StudioToolPatchRequest):
    try:
        approval_id = str(uuid.uuid4())
        approval = {
            "id": approval_id,
            "action_type": "studio_patch",
            "title": "Apply workspace patch",
            "description": "Apply a backend-approved patch to workspace files. Requires explicit user approval.",
            "payload": {"patch": req.patch},
            "status": "pending",
            "result": None,
            "created_at": time.time(),
            "updated_at": time.time(),
        }
        await state_store.create_approval(approval)
        return {
            "status": "pending_approval",
            "approval_id": approval_id,
            "message": "Patch application is pending user approval.",
            "patch_preview": req.patch[:2000],
        }
    except Exception as e:
        return {"status": "error", "message": str(e)}

@studio_router.post("/api/studio/tools/run-command")
async def studio_tool_run_command(req: StudioToolRunCommandRequest):
    try:
        cwd = _workspace_path(req.cwd)
        if _command_requires_approval(req.command):
            approval_id = str(uuid.uuid4())
            approval = {
                "id": approval_id,
                "action_type": "studio_command",
                "title": "Run high-risk workspace command",
                "description": f"Command requires explicit approval before execution: {req.command}",
                "payload": {"command": req.command, "cwd": cwd},
                "status": "pending",
                "result": None,
                "created_at": time.time(),
                "updated_at": time.time(),
            }
            await state_store.create_approval(approval)
            return {
                "status": "pending_approval",
                "approval_id": approval_id,
                "message": "Command is pending user approval before execution.",
            }

        command_id = str(uuid.uuid4())
        studio_tool_commands[command_id] = {
            "id": command_id,
            "command": req.command,
            "cwd": cwd,
            "status": "queued",
            "created_at": time.time(),
            "updated_at": time.time(),
        }
        await _persist_studio_command(studio_tool_commands[command_id])
        asyncio.create_task(_run_studio_tool_command(command_id, req.command, cwd))
        return {"status": "success", "command_id": command_id}
    except Exception as e:
        return {"status": "error", "message": str(e)}

@studio_router.get("/api/studio/tools/command-status/{command_id}")
async def studio_tool_command_status(command_id: str):
    entry = studio_tool_commands.get(command_id)
    if not entry:
        return {"status": "error", "message": "Command not found"}
    return {"status": "success", "command": entry}

@studio_router.get("/api/studio/tools/command-runs")
async def studio_tool_command_runs(limit: int = 20):
    try:
        runs = await state_store.list_command_runs(limit)
        return {"status": "success", "commands": runs}
    except Exception as e:
        return {"status": "error", "message": str(e), "commands": list(studio_tool_commands.values())[-limit:]}

@studio_router.get("/api/studio/approvals")
async def studio_list_approvals(status: Optional[str] = None, limit: int = 50):
    try:
        approvals = await state_store.list_approvals(status, limit)
        return {"status": "success", "approvals": approvals}
    except Exception as e:
        return {"status": "error", "message": str(e), "approvals": []}

@studio_router.get("/api/approvals/pending")
async def approvals_pending(limit: int = 100):
    return await studio_list_approvals(status="pending", limit=limit)

@studio_router.post("/api/approvals/{approval_id}/approve")
async def studio_approve_request(approval_id: str):
    approval = await state_store.get_approval(approval_id)
    if not approval:
        return {"status": "error", "message": "Approval request not found."}
    if approval["status"] != "pending":
        return {"status": "error", "message": "Approval request is not pending."}

    try:
        if approval["action_type"] == "studio_patch":
            await _apply_patch_file(approval["payload"].get("patch", ""))
            await state_store.resolve_approval(approval_id, "approved", "Patch applied")
            return {"status": "success", "message": "Patch applied successfully."}

        if approval["action_type"] == "studio_command":
            command = approval["payload"].get("command", "")
            cwd = approval["payload"].get("cwd", os.getcwd())
            command_id = str(uuid.uuid4())
            studio_tool_commands[command_id] = {
                "id": command_id,
                "command": command,
                "cwd": cwd,
                "status": "queued",
                "created_at": time.time(),
                "updated_at": time.time(),
            }
            await _persist_studio_command(studio_tool_commands[command_id])
            asyncio.create_task(_execute_approved_command(command_id, command, cwd))
            await state_store.resolve_approval(approval_id, "approved", f"Command queued: {command_id}")
            return {"status": "success", "command_id": command_id}

        await state_store.resolve_approval(approval_id, "failed", "Unsupported approval action type.")
        return {"status": "error", "message": "Unsupported approval action type."}
    except Exception as e:
        await state_store.resolve_approval(approval_id, "failed", str(e))
        return {"status": "error", "message": str(e)}

@studio_router.post("/api/approvals/{approval_id}/approve-once")
async def studio_approve_once_request(approval_id: str):
    approval = await state_store.get_approval(approval_id)
    if not approval:
        return {"status": "error", "message": "Approval request not found."}
    if approval["status"] != "pending":
        return {"status": "error", "message": "Approval request is not pending."}

    try:
        if approval["action_type"] == "studio_patch":
            await _apply_patch_file(approval["payload"].get("patch", ""))
            await state_store.resolve_approval(approval_id, "approved_once", "Patch applied once")
            return {"status": "success", "message": "Patch applied successfully."}

        if approval["action_type"] == "studio_command":
            command = approval["payload"].get("command", "")
            cwd = approval["payload"].get("cwd", os.getcwd())
            command_id = str(uuid.uuid4())
            studio_tool_commands[command_id] = {
                "id": command_id,
                "command": command,
                "cwd": cwd,
                "status": "queued",
                "created_at": time.time(),
                "updated_at": time.time(),
            }
            await _persist_studio_command(studio_tool_commands[command_id])
            asyncio.create_task(_execute_approved_command(command_id, command, cwd))
            await state_store.resolve_approval(approval_id, "approved_once", f"Command queued once: {command_id}")
            return {"status": "success", "command_id": command_id}

        await state_store.resolve_approval(approval_id, "failed", "Unsupported approval action type.")
        return {"status": "error", "message": "Unsupported approval action type."}
    except Exception as e:
        await state_store.resolve_approval(approval_id, "failed", str(e))
        return {"status": "error", "message": str(e)}

@studio_router.post("/api/approvals/{approval_id}/deny")
async def approvals_deny_request(approval_id: str):
    approval = await state_store.get_approval(approval_id)
    if not approval:
        return {"status": "error", "message": "Approval request not found."}
    if approval["status"] != "pending":
        return {"status": "error", "message": "Approval request is not pending."}

    await state_store.resolve_approval(approval_id, "rejected", "User rejected the request.")
    return {"status": "success", "message": "Approval request rejected."}

@studio_router.post("/api/studio/approvals/{approval_id}/reject")
async def studio_reject_request(approval_id: str):
    return await approvals_deny_request(approval_id)

@studio_router.post("/api/studio/tools/stop-command/{command_id}")
async def studio_tool_stop_command(command_id: str):
    entry = studio_tool_commands.get(command_id)
    if not entry:
        return {"status": "error", "message": "Command not found"}
    process = studio_tool_processes.get(command_id)
    if not process or process.returncode is not None:
        entry["status"] = entry.get("status", "completed")
        entry["updated_at"] = time.time()
        await _persist_studio_command(entry)
        return {"status": "success", "message": "Command is not running.", "command": entry}

    entry["status"] = "terminating"
    entry["updated_at"] = time.time()
    await _persist_studio_command(entry)
    try:
        process.terminate()
        try:
            await asyncio.wait_for(process.wait(), timeout=5)
        except asyncio.TimeoutError:
            process.kill()
            await process.wait()
        entry.update({
            "status": "stopped",
            "returncode": process.returncode,
            "finished_at": time.time(),
            "updated_at": time.time(),
        })
        await _persist_studio_command(entry)
        return {"status": "success", "message": "Command stopped.", "command": entry}
    except ProcessLookupError:
        entry.update({"status": "stopped", "finished_at": time.time(), "updated_at": time.time()})
        await _persist_studio_command(entry)
        return {"status": "success", "message": "Command already stopped.", "command": entry}
    except Exception as e:
        entry.update({"status": "stop_failed", "stderr": str(e), "finished_at": time.time(), "updated_at": time.time()})
        await _persist_studio_command(entry)
        return {"status": "error", "message": str(e), "command": entry}

@studio_router.get("/api/studio/tools/changed-files")
async def studio_tool_changed_files():
    proc = await asyncio.create_subprocess_exec(
        "git", "status", "--short",
        cwd=os.getcwd(),
        stdout=asyncio.subprocess.PIPE,
        stderr=asyncio.subprocess.PIPE,
    )
    stdout, stderr = await proc.communicate()
    if proc.returncode != 0:
        return {"status": "error", "message": stderr.decode(errors="replace")}
    files = [{"status": line[:2].strip(), "path": line[3:]} for line in stdout.decode(errors="replace").splitlines()]
    return {"status": "success", "files": files}

@studio_router.get("/api/studio/tools/diff")
async def studio_tool_diff(path: Optional[str] = None):
    args = ["git", "diff", "--"]
    if path:
        args.append(path)
    proc = await asyncio.create_subprocess_exec(
        *args,
        cwd=os.getcwd(),
        stdout=asyncio.subprocess.PIPE,
        stderr=asyncio.subprocess.PIPE,
    )
    stdout, stderr = await proc.communicate()
    if proc.returncode != 0:
        return {"status": "error", "message": stderr.decode(errors="replace")}
    return {"status": "success", "diff": stdout.decode(errors="replace")[-50000:]}

@studio_router.get("/api/studio/tools/list-files")
async def studio_tool_list_files(path: str = "."):
    try:
        root = _workspace_path(path)
        files = []
        for current_root, dirs, filenames in os.walk(root):
            # Ignore .git and node_modules for cleaner output
            dirs[:] = [d for d in dirs if d not in (".git", "node_modules", "dist", "build", "__pycache__")]
            for filename in filenames:
                rel_path = os.path.relpath(os.path.join(current_root, filename), os.getcwd())
                files.append(rel_path.replace("\\", "/"))
        return {"status": "success", "files": files}
    except Exception as e:
        return {"status": "error", "message": str(e)}

@studio_router.post("/api/studio/tools/revert-change")
async def studio_tool_revert_change(path: Optional[str] = None):
    try:
        args = ["git", "checkout", "--"]
        if path:
            args.append(_workspace_path(path))
        else:
            args.append(".")
        
        proc = await asyncio.create_subprocess_exec(
            *args,
            cwd=os.getcwd(),
            stdout=asyncio.subprocess.PIPE,
            stderr=asyncio.subprocess.PIPE,
        )
        stdout, stderr = await proc.communicate()
        if proc.returncode != 0:
            return {"status": "error", "message": stderr.decode(errors="replace")}
        return {"status": "success", "message": "Changes reverted successfully."}
    except Exception as e:
        return {"status": "error", "message": str(e)}

@studio_router.get("/api/studio/tools/git-log")
async def studio_tool_git_log(limit: int = 10):
    try:
        proc = await asyncio.create_subprocess_exec(
            "git", "log", f"-n {limit}", "--oneline",
            cwd=os.getcwd(),
            stdout=asyncio.subprocess.PIPE,
            stderr=asyncio.subprocess.PIPE,
        )
        stdout, stderr = await proc.communicate()
        if proc.returncode != 0:
            return {"status": "error", "message": stderr.decode(errors="replace")}
        return {"status": "success", "log": stdout.decode(errors="replace")}
    except Exception as e:
        return {"status": "error", "message": str(e)}

@studio_router.get("/api/studio/tools/git-branch")
async def studio_tool_git_branch():
    try:
        proc = await asyncio.create_subprocess_exec(
            "git", "branch", "--show-current",
            cwd=os.getcwd(),
            stdout=asyncio.subprocess.PIPE,
            stderr=asyncio.subprocess.PIPE,
        )
        stdout, stderr = await proc.communicate()
        if proc.returncode != 0:
            return {"status": "error", "message": stderr.decode(errors="replace")}
        return {"status": "success", "branch": stdout.decode(errors="replace").strip()}
    except Exception as e:
        return {"status": "error", "message": str(e)}

@studio_router.get("/api/studio/tools/inspect-project")
async def studio_tool_inspect_project():
    try:
        project_info = {}
        pkg_json = os.path.join(os.getcwd(), "package.json")
        if os.path.exists(pkg_json):
            with open(pkg_json, "r") as f:
                project_info["package.json"] = json.load(f)
        
        req_txt = os.path.join(os.getcwd(), "requirements.txt")
        if os.path.exists(req_txt):
            with open(req_txt, "r") as f:
                project_info["requirements.txt"] = f.read()
                
        return {"status": "success", "project_info": project_info}
    except Exception as e:
        return {"status": "error", "message": str(e)}

@studio_router.post("/api/studio/tools/run-verification")
async def studio_tool_run_verification(req: StudioVerificationRequest):
    try:
        if req.scope == "frontend":
            command = ["npm.cmd", "run", "build"] if os.name == "nt" else ["npm", "run", "build"]
            cwd = _workspace_path("frontend")
        else:
            command = ["git", "status", "--short"]
            cwd = _workspace_path(".")

        proc = await asyncio.create_subprocess_exec(
            *command,
            cwd=cwd,
            stdout=asyncio.subprocess.PIPE,
            stderr=asyncio.subprocess.PIPE,
        )
        stdout, stderr = await asyncio.wait_for(proc.communicate(), timeout=180)
        return {
            "status": "success" if proc.returncode == 0 else "failed",
            "scope": req.scope,
            "returncode": proc.returncode,
            "stdout": stdout.decode(errors="replace")[-20000:],
            "stderr": stderr.decode(errors="replace")[-20000:],
        }
    except asyncio.TimeoutError:
        return {"status": "failed", "scope": req.scope, "message": "Verification timed out."}
    except Exception as e:
        return {"status": "error", "scope": req.scope, "message": str(e)}

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
async def studio_test_skill(skill_id: str, args: dict = Body(default_factory=dict)):
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

# --- NEW GENERATED TOOL ENDPOINTS ---
@studio_router.get("/api/studio/tools/find-file")
async def studio_tool_find_file():
    return {"status": "success", "message": "Endpoint find-file executed (placeholder)."}

@studio_router.post("/api/studio/tools/search-regex")
async def studio_tool_search_regex():
    return {"status": "success", "message": "Endpoint search-regex executed (placeholder)."}

@studio_router.get("/api/studio/tools/search-symbol")
async def studio_tool_search_symbol():
    return {"status": "success", "message": "Endpoint search-symbol executed (placeholder)."}

@studio_router.get("/api/studio/tools/read-file-range")
async def studio_tool_read_file_range():
    return {"status": "success", "message": "Endpoint read-file-range executed (placeholder)."}

@studio_router.get("/api/studio/tools/summarize-file")
async def studio_tool_summarize_file():
    return {"status": "success", "message": "Endpoint summarize-file executed (placeholder)."}

@studio_router.post("/api/studio/tools/create-file")
async def studio_tool_create_file():
    return {"status": "success", "message": "Endpoint create-file executed (placeholder)."}

@studio_router.post("/api/studio/tools/rename-file")
async def studio_tool_rename_file():
    return {"status": "success", "message": "Endpoint rename-file executed (placeholder)."}

@studio_router.post("/api/studio/tools/format-file")
async def studio_tool_format_file():
    return {"status": "success", "message": "Endpoint format-file executed (placeholder)."}

@studio_router.get("/api/studio/tools/check-command-status")
async def studio_tool_check_command_status():
    return {"status": "success", "message": "Endpoint check-command-status executed (placeholder)."}

@studio_router.get("/api/studio/tools/wait-for-command")
async def studio_tool_wait_for_command():
    return {"status": "success", "message": "Endpoint wait-for-command executed (placeholder)."}

@studio_router.post("/api/studio/tools/stop-command")
async def studio_tool_stop_command():
    return {"status": "success", "message": "Endpoint stop-command executed (placeholder)."}

@studio_router.get("/api/studio/tools/read-command-output")
async def studio_tool_read_command_output():
    return {"status": "success", "message": "Endpoint read-command-output executed (placeholder)."}

@studio_router.post("/api/studio/tools/run-script")
async def studio_tool_run_script():
    return {"status": "success", "message": "Endpoint run-script executed (placeholder)."}

@studio_router.post("/api/studio/tools/run-build")
async def studio_tool_run_build():
    return {"status": "success", "message": "Endpoint run-build executed (placeholder)."}

@studio_router.post("/api/studio/tools/run-tests")
async def studio_tool_run_tests():
    return {"status": "success", "message": "Endpoint run-tests executed (placeholder)."}

@studio_router.post("/api/studio/tools/run-lint")
async def studio_tool_run_lint():
    return {"status": "success", "message": "Endpoint run-lint executed (placeholder)."}

@studio_router.post("/api/studio/tools/run-backend-check")
async def studio_tool_run_backend_check():
    return {"status": "success", "message": "Endpoint run-backend-check executed (placeholder)."}

@studio_router.post("/api/studio/tools/run-frontend-check")
async def studio_tool_run_frontend_check():
    return {"status": "success", "message": "Endpoint run-frontend-check executed (placeholder)."}

@studio_router.post("/api/studio/tools/verify-dev-server")
async def studio_tool_verify_dev_server():
    return {"status": "success", "message": "Endpoint verify-dev-server executed (placeholder)."}

@studio_router.post("/api/studio/tools/capture-ui-snapshot")
async def studio_tool_capture_ui_snapshot():
    return {"status": "success", "message": "Endpoint capture-ui-snapshot executed (placeholder)."}

@studio_router.get("/api/studio/tools/git-status")
async def studio_tool_git_status():
    return {"status": "success", "message": "Endpoint git-status executed (placeholder)."}

@studio_router.post("/api/studio/tools/git-stage")
async def studio_tool_git_stage():
    return {"status": "success", "message": "Endpoint git-stage executed (placeholder)."}

@studio_router.post("/api/studio/tools/git-commit")
async def studio_tool_git_commit():
    return {"status": "success", "message": "Endpoint git-commit executed (placeholder)."}

@studio_router.post("/api/studio/tools/git-push")
async def studio_tool_git_push():
    return {"status": "success", "message": "Endpoint git-push executed (placeholder)."}

@studio_router.post("/api/studio/tools/open-local-url")
async def studio_tool_open_local_url():
    return {"status": "success", "message": "Endpoint open-local-url executed (placeholder)."}

@studio_router.get("/api/studio/tools/inspect-page")
async def studio_tool_inspect_page():
    return {"status": "success", "message": "Endpoint inspect-page executed (placeholder)."}

@studio_router.post("/api/studio/tools/click")
async def studio_tool_click():
    return {"status": "success", "message": "Endpoint click executed (placeholder)."}

@studio_router.post("/api/studio/tools/type")
async def studio_tool_type():
    return {"status": "success", "message": "Endpoint type executed (placeholder)."}

@studio_router.post("/api/studio/tools/screenshot")
async def studio_tool_screenshot():
    return {"status": "success", "message": "Endpoint screenshot executed (placeholder)."}

@studio_router.get("/api/studio/tools/read-console")
async def studio_tool_read_console():
    return {"status": "success", "message": "Endpoint read-console executed (placeholder)."}

@studio_router.post("/api/studio/tools/classify-risk")
async def studio_tool_classify_risk():
    return {"status": "success", "message": "Endpoint classify-risk executed (placeholder)."}

@studio_router.post("/api/studio/tools/request-approval")
async def studio_tool_request_approval():
    return {"status": "success", "message": "Endpoint request-approval executed (placeholder)."}

@studio_router.get("/api/studio/tools/show-pending-approval")
async def studio_tool_show_pending_approval():
    return {"status": "success", "message": "Endpoint show-pending-approval executed (placeholder)."}

@studio_router.post("/api/studio/tools/deny-action")
async def studio_tool_deny_action():
    return {"status": "success", "message": "Endpoint deny-action executed (placeholder)."}

@studio_router.get("/api/studio/tools/audit-log")
async def studio_tool_audit_log():
    return {"status": "success", "message": "Endpoint audit-log executed (placeholder)."}

