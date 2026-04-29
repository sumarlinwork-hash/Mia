import asyncio
import time
import uuid
from enum import Enum
from typing import List, Dict, Any, Optional
from pydantic import BaseModel, Field

class AgentStatus(str, Enum):
    IDLE = "idle"
    BUSY = "busy"
    OFFLINE = "offline"

class AgentType(str, Enum):
    MASTER = "master"
    VISION = "vision"
    AUDIO = "audio"
    EXECUTION = "execution"
    MEMORY = "memory"

class AgentTask(BaseModel):
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    type: str
    payload: Dict[str, Any]
    status: str = "pending"
    result: Optional[Any] = None
    created_at: float = Field(default_factory=time.time)

class BaseAgent:
    def __init__(self, agent_id: str, agent_type: AgentType):
        self.id = agent_id
        self.type = agent_type
        self.status = AgentStatus.IDLE
        self.task_history: List[AgentTask] = []

    async def run_task(self, task: AgentTask) -> Any:
        self.status = AgentStatus.BUSY
        task.status = "running"
        try:
            result = await self._process(task)
            task.result = result
            task.status = "completed"
            return result
        except Exception as e:
            task.status = "failed"
            task.result = str(e)
            raise e
        finally:
            self.status = AgentStatus.IDLE
            self.task_history.append(task)

    async def _process(self, task: AgentTask) -> Any:
        raise NotImplementedError("Subclasses must implement _process")

# --- Specialized Agents ---

class VisionAgent(BaseAgent):
    def __init__(self, agent_id: str):
        super().__init__(agent_id, AgentType.VISION)
        from core.vision_hub import vision_hub
        self.hub = vision_hub

    async def _process(self, task: AgentTask) -> Any:
        if task.type == "capture_scene":
            return await self.hub.capture_scene()
        return "Unknown vision task"

class AudioAgent(BaseAgent):
    def __init__(self, agent_id: str):
        super().__init__(agent_id, AgentType.AUDIO)
        from core.audio_hub import audio_hub
        self.hub = audio_hub

    async def _process(self, task: AgentTask) -> Any:
        if task.type == "analyze_speech":
            return await self.hub.analyze_speech(task.payload.get("text", ""))
        return "Unknown audio task"

class ExecutionAgent(BaseAgent):
    def __init__(self, agent_id: str, executor: Any):
        super().__init__(agent_id, AgentType.EXECUTION)
        self.executor = executor

    async def _process(self, task: AgentTask) -> Any:
        if task.type == "execute_node":
            node = task.payload.get("node")
            context = task.payload.get("context", {})
            return await self.executor._execute_node(node, context)
        return "Unknown execution task"

# --- Master Orchestrator ---

class MasterOrchestrator:
    def __init__(self):
        self.agents: Dict[str, BaseAgent] = {}
        self._setup_cluster()

    def _setup_cluster(self):
        self.agents["vision_01"] = VisionAgent("vision_01")
        self.agents["audio_01"] = AudioAgent("audio_01")
        # Execution and Memory agents will be linked during system boot
        print(f"[AgentCluster] Cluster initialized with {len(self.agents)} core agents.")

    async def delegate_task(self, agent_type: AgentType, task_type: str, payload: Dict[str, Any]) -> Any:
        # Find idle agent of requested type
        available = [a for a in self.agents.values() if a.type == agent_type and a.status == AgentStatus.IDLE]
        
        if not available:
            # Simple queueing / waiting for demo purposes
            # In production, we would scale agents or use a more robust queue
            print(f"[AgentCluster] No idle {agent_type} agent. Waiting...")
            while not available:
                await asyncio.sleep(0.5)
                available = [a for a in self.agents.values() if a.type == agent_type and a.status == AgentStatus.IDLE]
        
        agent = available[0]
        task = AgentTask(type=task_type, payload=payload)
        return await agent.run_task(task)

agent_cluster = MasterOrchestrator()
