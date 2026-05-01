from pydantic import BaseModel, Field
from enum import Enum
from typing import Optional
from datetime import datetime
import uuid
from dataclasses import dataclass

@dataclass
class TransactionContext:
    graph_version: str
    execution_fingerprint: str

class ExecutionStatus(str, Enum):
    RUNNING = "RUNNING"
    KILLED = "KILLED"
    DONE = "DONE"
    FAILED = "FAILED"

class EventPriority(int, Enum):
    LOW = 0
    MEDIUM = 1
    HIGH = 2

class JournalStatus(str, Enum):
    PENDING_UNCONFIRMED = "PENDING_UNCONFIRMED"
    PENDING_IN_FLIGHT = "PENDING_IN_FLIGHT"
    COMMITTED = "COMMITTED"

class SnapshotLabel(str, Enum):
    AUTO_SAVE = "AUTO_SAVE"
    PRE_RUN = "PRE_RUN"
    MANUAL_SAVE = "MANUAL_SAVE"
    PRE_OP = "PRE_OP"

class FileManifest(BaseModel):
    path: str
    hash: str
    size: int

class SnapshotManifest(BaseModel):
    snapshot_id: str
    project_id: str
    timestamp: datetime = Field(default_factory=datetime.now)
    label: SnapshotLabel
    files: list[FileManifest]
    total_size: int
    integrity_hash: str # Global hash of all file hashes

class StudioProjectMetadata(BaseModel):
    project_id: str
    name: str
    schema_version: str = "1.0" # P3-G
    entry_point: str = "main.py" # P3-H
    created_at: datetime = Field(default_factory=datetime.now)
    last_validated_snapshot: Optional[str] = None

class ExecutionEntry(BaseModel):
    execution_id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    pid: Optional[int] = None
    start_time: datetime = Field(default_factory=datetime.now)
    owner_session_id: str
    status: ExecutionStatus = ExecutionStatus.RUNNING
    exit_code: Optional[int] = None
    error_message: Optional[str] = None

class StudioErrorType(str, Enum):
    TIMEOUT = "TIMEOUT"
    FORK_BOMB = "FORK_BOMB"
    SECURITY = "SECURITY"
    FS_ERROR = "FS_ERROR"
    VERSION_ERROR = "VERSION_ERROR"
    INTERNAL = "INTERNAL"
    INTEGRITY_VIOLATION = "INTEGRITY_VIOLATION"
    VERSION_MISMATCH = "VERSION_MISMATCH"
    FINGERPRINT_MISMATCH = "FINGERPRINT_MISMATCH"

def format_studio_error(error_type: StudioErrorType, message: str) -> str:
    """Format error according to Patch 8: STUDIO_ERROR::<TYPE>::<MESSAGE>"""
    return f"STUDIO_ERROR::{error_type.value}::{message}"
