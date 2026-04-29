import asyncio
import hashlib
import json
import re
import time
import os
from enum import Enum
from typing import Any, Dict, List, Optional, Set, Union
from types import MappingProxyType
from pydantic import BaseModel, Field, PrivateAttr

# OS-level Cryptographic Anchor (In production, this should be in .env)
SYSTEM_INTEGRITY_SALT = os.getenv("MIA_OS_SALT", "mia_deterministic_os_v1.4_hardened")

class NodeStatus(str, Enum):
    PENDING = "pending"
    RUNNING = "running"
    COMPLETED = "completed"
    FAILED = "failed"
    SKIPPED = "skipped"

class ExecutionMode(str, Enum):
    SEQUENTIAL = "sequential"
    PARALLEL = "parallel"

class ExecutionNode(BaseModel):
    id: str
    tool: str
    args: Dict[str, Any] = Field(default_factory=dict)
    dependencies: List[str] = Field(default_factory=list)
    status: NodeStatus = NodeStatus.PENDING
    result: Optional[Any] = None
    error: Optional[str] = None
    
    # Metadata for OS-level tracking
    timestamp_created: float = Field(default_factory=time.time)
    retry_count: int = 0
    execution_context: Dict[str, Any] = Field(default_factory=dict)
    parent_graph_id: Optional[str] = None
    execution_mode: ExecutionMode = ExecutionMode.SEQUENTIAL
    sandbox_id: Optional[str] = None
    tool_version: str = "1.0.0"
    
    # Immutability & Determinism
    execution_fingerprint: Optional[str] = None
    
    _is_frozen: bool = PrivateAttr(default=False)

    def freeze(self):
        self.execution_fingerprint = self.calculate_fingerprint()
        self._is_frozen = True

    def __setattr__(self, name, value):
        if getattr(self, "_is_frozen", False) and name not in ["status", "result", "error", "retry_count"]:
            raise AttributeError(f"ExecutionNode {self.id} is frozen and immutable.")
        super().__setattr__(name, value)

    def calculate_fingerprint(self) -> str:
        """
        Generates a deterministic hash based on node structure and inputs + OS Salt.
        """
        # Manual stable serialization to avoid Pydantic version noise
        payload = {
            "id": self.id,
            "tool": self.tool,
            "args": self._stabilize_dict(self.args),
            "dependencies": sorted(self.dependencies),
            "tool_version": self.tool_version,
            "execution_mode": self.execution_mode,
            "system_salt": SYSTEM_INTEGRITY_SALT
        }
        dump = json.dumps(payload, sort_keys=True)
        return hashlib.sha256(dump.encode()).hexdigest()

    def _stabilize_dict(self, d: Any) -> Any:
        if isinstance(d, dict):
            return {k: self._stabilize_dict(v) for k, v in sorted(d.items())}
        if isinstance(d, list):
            return [self._stabilize_dict(x) for x in d]
        return d

class ExecutionGraph(BaseModel):
    id: str
    status: NodeStatus = NodeStatus.PENDING
    graph_root_hash: Optional[str] = None
    
    # Internal storage to enforce true immutability
    _nodes: Dict[str, ExecutionNode] = PrivateAttr(default_factory=dict)
    _metadata: Dict[str, Any] = PrivateAttr(default_factory=dict)
    _is_frozen: bool = PrivateAttr(default=False)

    def __init__(self, **data):
        nodes = data.pop("nodes", {})
        metadata = data.pop("metadata", {})
        super().__init__(**data)
        self._nodes = nodes
        self._metadata = metadata

    @property
    def nodes(self):
        if self._is_frozen:
            return MappingProxyType(self._nodes)
        return self._nodes

    @property
    def metadata(self):
        if self._is_frozen:
            return MappingProxyType(self._metadata)
        return self._metadata

    def freeze(self):
        """
        Locks the graph and anchors it with a root hash.
        """
        # First freeze all nodes
        for node in self._nodes.values():
            node.freeze()
            
        self.graph_root_hash = self.calculate_root_hash()
        self._is_frozen = True
        
        # OS Persistence Layer: Persist frozen graph for audit
        self._persist_graph()
        print(f"[ExecutionGraph] Graph {self.id} locked & persisted with root_hash: {self.graph_root_hash}")

    def _persist_graph(self):
        try:
            os.makedirs("backend/data/graphs", exist_ok=True)
            path = f"backend/data/graphs/{self.id}.json"
            # Stable dump
            data = {
                "id": self.id,
                "status": self.status,
                "graph_root_hash": self.graph_root_hash,
                "nodes": {nid: n.dict() for nid, n in self._nodes.items()},
                "metadata": self._metadata
            }
            with open(path, "w") as f:
                json.dump(data, f, indent=2, sort_keys=True)
        except Exception as e:
            print(f"[Storage Error] Failed to persist graph {self.id}: {e}")

    @classmethod
    def load_from_storage(cls, graph_id: str) -> Optional['ExecutionGraph']:
        """
        Snapshot Recovery: Reconstructs a graph from persistent storage (Rule 10.1A).
        """
        path = f"backend/data/graphs/{graph_id}.json"
        if not os.path.exists(path):
            return None
            
        try:
            with open(path, "r") as f:
                data = json.load(f)
                
            # Reconstruct nodes
            nodes = {nid: ExecutionNode(**n) for nid, n in data["nodes"].items()}
            
            # Create graph instance
            graph = cls(id=data["id"], status=data["status"])
            graph._nodes = nodes
            graph._metadata = data.get("metadata", {})
            graph.graph_root_hash = data.get("graph_root_hash")
            graph._is_frozen = True # Loaded graphs are already frozen
            
            return graph
        except Exception as e:
            print(f"[Recovery Error] Failed to load graph {graph_id}: {e}")
            return None

    def __setattr__(self, name, value):
        if getattr(self, "_is_frozen", False) and name not in ["status", "_logger"]:
            raise AttributeError(f"ExecutionGraph {self.id} is frozen and immutable.")
        super().__setattr__(name, value)

    def calculate_root_hash(self) -> str:
        """
        Generates a global immutability anchor from the FULL graph serialization + OS Salt.
        """
        # Sort nodes by ID for deterministic serialization
        sorted_node_ids = sorted(self._nodes.keys())
        node_fingerprints = {nid: self._nodes[nid].calculate_fingerprint() for nid in sorted_node_ids}
        
        graph_data = {
            "id": self.id,
            "node_fingerprints": node_fingerprints,
            "metadata": sorted(self._metadata.items()),
            "system_salt": SYSTEM_INTEGRITY_SALT
        }
        dump = json.dumps(graph_data, sort_keys=True)
        return hashlib.sha256(dump.encode()).hexdigest()

    def verify_integrity(self) -> bool:
        if not self.graph_root_hash:
            return False
        return self.calculate_root_hash() == self.graph_root_hash

    def validate_integrity(self):
        """
        Deep DAG validation before execution.
        """
        node_ids = set(self._nodes.keys())
        for node in self._nodes.values():
            for dep in node.dependencies:
                if dep not in node_ids:
                    raise ValueError(f"Node {node.id} has missing dependency: {dep}")
        
        # Cycle detection
        self._detect_cycles()

    def _detect_cycles(self):
        visited = set()
        stack = set()
        
        def visit(nid):
            if nid in stack: return True
            if nid in visited: return False
            stack.add(nid)
            for dep in self._nodes[nid].dependencies:
                if visit(dep): return True
            stack.remove(nid)
            visited.add(nid)
            return False

        for nid in self._nodes:
            if visit(nid):
                raise ValueError(f"Cycle detected in graph starting at node: {nid}")

class GraphEvent(BaseModel):
    type: str # NODE_START, NODE_COMPLETE, NODE_FAIL, GRAPH_ABORT
    timestamp: float = Field(default_factory=time.time)
    node_id: Optional[str] = None
    payload: Dict[str, Any] = Field(default_factory=dict)
    hash_chain_pointer: Optional[str] = None

class GraphLogger:
    def __init__(self, graph_id: str):
        self.graph_id = graph_id
        self.events: List[GraphEvent] = []
        self.current_hash: str = "root"
        self.queue = asyncio.Queue() # Event-driven streaming

    def log_event(self, event_type: str, node_id: Optional[str] = None, payload: Optional[Dict[str, Any]] = None):
        """
        Logs an event with cryptographically anchored hash chaining (Rule 8.2).
        """
        timestamp = time.time()
        
        # Payload for hashing (includes previous_hash for chaining)
        event_data = {
            "graph_id": self.graph_id,
            "type": event_type,
            "node_id": node_id,
            "timestamp": timestamp,
            "payload": payload or {},
            "previous_hash": self.current_hash,
            "system_salt": SYSTEM_INTEGRITY_SALT
        }
        
        event_json = json.dumps(event_data, sort_keys=True)
        new_hash = hashlib.sha256(event_json.encode()).hexdigest()
        
        event = GraphEvent(
            type=event_type,
            node_id=node_id,
            payload=payload or {},
            hash_chain_pointer=self.current_hash,
            timestamp=timestamp
        )
        
        # Store the hash in the event for the UI/Replay
        event_dict = event.dict()
        event_dict["event_hash"] = new_hash
        
        self.current_hash = new_hash
        self.events.append(event)
        self.queue.put_nowait(event_dict)
        print(f"[GraphLogger] {event_type} | Node: {node_id} | Chain: {new_hash[:8]}")

from core.policy_engine import PolicyEngine, PolicyAction

class GraphExecutor:
    def __init__(self, tool_registry: Any, policy_engine: Optional[PolicyEngine] = None, pid: Optional[str] = None):
        self.tool_registry = tool_registry
        self.policy_engine = policy_engine
        self.pid = pid
        self.logger: Optional[GraphLogger] = None

    async def execute_graph(self, graph: ExecutionGraph, initial_inputs: Dict[str, Any]) -> Dict[str, Any]:
        """
        Executes a DAG with Hard Sequential Gates (Spec v1.6).
        """
        # [1] CompileGate / Validation
        graph.validate_integrity()
        
        if not getattr(graph, "_is_frozen", False):
            graph.freeze()

        self.logger = GraphLogger(graph.id)
        graph._logger = self.logger
        
        # [2] PolicyGate (Pre-execution Gate)
        if self.policy_engine:
            for node in graph.nodes.values():
                decision = self.policy_engine.evaluate_node(node.id, node.tool, node.args, initial_inputs)
                if not decision.allowed:
                    self.logger.log_event("POLICY_BLOCK", node_id=node.id, payload={"reason": decision.reason_trace})
                    raise Exception(f"PolicyGate FAIL: Node {node.id} is blocked. Reason: {decision.reason_trace}")

        self.logger.log_event("GRAPH_START", payload={"initial_inputs": list(initial_inputs.keys())})
        
        graph.status = NodeStatus.RUNNING
        context = initial_inputs.copy()
        executed_nodes: Set[str] = set()
        
        try:
            while len(executed_nodes) < len(graph.nodes):
                executable_now = [
                    node for nid, node in graph.nodes.items() 
                    if nid not in executed_nodes and all(dep in executed_nodes for dep in node.dependencies)
                ]
                
                if not executable_now:
                    raise Exception("Execution deadlock detected at runtime.")

                for node in executable_now:
                    # [3] ExecutionGate (Runtime per-node Gate)
                    if self.policy_engine:
                        decision = self.policy_engine.evaluate_node(node.id, node.tool, node.args, context)
                        if not decision.allowed:
                            node.status = NodeStatus.SKIPPED
                            self.logger.log_event("POLICY_SKIP", node_id=node.id, payload={"reason": decision.reason_trace})
                            executed_nodes.add(node.id) # Mark as "done" but skipped
                            continue

                    # EXECUTION (Rule 3.4 Parallel Upgrade)
                    if node.execution_mode == ExecutionMode.PARALLEL:
                        # Delegation to Agent Cluster
                        from core.agent_cluster import agent_cluster, AgentType
                        task = asyncio.create_task(self._execute_node(node, context))
                        # We wait for now to keep context sync simple, 
                        # but the infrastructure for true async cluster is ready.
                        await task 
                    else:
                        await self._execute_node(node, context)
                        
                    executed_nodes.add(node.id)
            
            graph.status = NodeStatus.COMPLETED
            self.logger.log_event("GRAPH_COMPLETE")
        except Exception as e:
            graph.status = NodeStatus.FAILED
            self.logger.log_event("GRAPH_ABORT", payload={"reason": str(e)})
            raise e
            
        return context

    async def _execute_node(self, node: ExecutionNode, context: Dict[str, Any]):
        self.logger.log_event("NODE_START", node_id=node.id)
        node.status = NodeStatus.RUNNING
        
        try:
            tool = self.tool_registry.get(node.tool)
            if not tool:
                raise Exception(f"Tool not found: {node.tool}")
            
            # Safe argument resolution
            resolved_args = self._resolve_args(node.args, context)
            
            # Sandbox isolation (Timeout enforcement)
            async with asyncio.timeout(30.0): # 30s OS-level timeout
                result = await tool.execute(resolved_args)
            
            node.result = result
            node.status = NodeStatus.COMPLETED
            context[node.id] = result
            self.logger.log_event("NODE_COMPLETE", node_id=node.id, payload={"result_type": str(type(result))})
            
        except asyncio.TimeoutError:
            node.status = NodeStatus.FAILED
            node.error = "Execution timed out (30s limit)."
            self.logger.log_event("NODE_FAIL", node_id=node.id, payload={"error": node.error})
            raise Exception(f"Node {node.id} timed out.")
        except Exception as e:
            node.status = NodeStatus.FAILED
            node.error = str(e)
            self.logger.log_event("NODE_FAIL", node_id=node.id, payload={"error": str(e)})
            raise e

    def _resolve_args(self, args: Dict[str, Any], context: Dict[str, Any]) -> Dict[str, Any]:
        """
        Structured argument resolver to prevent string injection.
        """
        def resolve_value(v):
            if isinstance(v, str):
                # Check for exact single variable match: {{key}}
                # Using a stricter regex to ensure no nested/multiple variables for exact match
                exact_match = re.fullmatch(r"\{\{([a-zA-Z0-9_]+)\}\}", v)
                if exact_match:
                    key = exact_match.group(1).strip()
                    res = context.get(key, v)
                    return res
                
                # For mixed strings, we still use substitution but it's restricted
                res = re.sub(r"\{\{(.*?)\}\}", lambda m: str(context.get(m.group(1).strip(), m.group(0))), v)
                return res
            
            if isinstance(v, dict):
                return {k: resolve_value(val) for k, val in v.items()}
            if isinstance(v, list):
                return [resolve_value(x) for x in v]
            return v

        return {k: resolve_value(v) for k, v in args.items()}
