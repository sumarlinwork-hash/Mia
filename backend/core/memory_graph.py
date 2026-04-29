import json
import os
import time
import hashlib
from enum import Enum
from typing import Any, Dict, List, Optional, Set, Union
from pydantic import BaseModel, Field, PrivateAttr

class MemoryNodeType(str, Enum):
    IDENTITY = "identity" # Stable user traits, profile
    EVENT = "event"       # Time-based actions, episodic memory
    CONCEPT = "concept"   # Abstract knowledge, semantic memory
    SYSTEM = "system"    # AI-generated inference, metadata

class MemoryNode(BaseModel):
    id: str
    type: MemoryNodeType
    content: Dict[str, Any] = Field(default_factory=dict)
    timestamp: float = Field(default_factory=time.time)
    schema_version: str = "1.0.0"
    activation_score: float = 0.0
    access_count: int = 0
    metadata: Dict[str, Any] = Field(default_factory=dict)
    
    _is_frozen: bool = PrivateAttr(default=False)

    def __setattr__(self, name, value):
        if getattr(self, "_is_frozen", False) and name not in ["activation_score", "access_count"]:
            raise AttributeError(f"MemoryNode {self.id} is frozen and immutable.")
        super().__setattr__(name, value)

class MemoryEdge(BaseModel):
    source: str
    target: str
    relation: str
    weight: float = 1.0
    timestamp: float = Field(default_factory=time.time)
    metadata: Dict[str, Any] = Field(default_factory=dict)

class MemoryGraphStore:
    def __init__(self, persistence_dir: str = "backend/data/memory"):
        self.persistence_dir = persistence_dir
        self.nodes: Dict[str, MemoryNode] = {}
        self.edges: List[MemoryEdge] = []
        self._load_from_disk()

    def add_node(self, node: MemoryNode):
        """
        Adds a node with strict write-time validation.
        """
        if node.id in self.nodes:
            # Update existing node (Policy: Identity nodes are stable, Events are new)
            self.nodes[node.id].content.update(node.content)
            self.nodes[node.id].access_count += 1
        else:
            self.nodes[node.id] = node
        
        self._save_to_disk()

    def add_edge(self, source_id: str, target_id: str, relation: str, weight: float = 1.0):
        if source_id not in self.nodes or target_id not in self.nodes:
            raise ValueError("Both source and target nodes must exist in the memory graph.")
        
        edge = MemoryEdge(source=source_id, target=target_id, relation=relation, weight=weight)
        self.edges.append(edge)
        self._save_to_disk()

    def get_node(self, node_id: str) -> Optional[MemoryNode]:
        node = self.nodes.get(node_id)
        if node:
            node.access_count += 1
        return node

    def _save_to_disk(self):
        try:
            os.makedirs(self.persistence_dir, exist_ok=True)
            # Save nodes
            with open(f"{self.persistence_dir}/nodes.json", "w") as f:
                nodes_data = {nid: n.dict() for nid, n in self.nodes.items()}
                json.dump(nodes_data, f, indent=2)
            # Save edges
            with open(f"{self.persistence_dir}/edges.json", "w") as f:
                edges_data = [e.dict() for e in self.edges]
                json.dump(edges_data, f, indent=2)
        except Exception as e:
            print(f"[Memory Store Error] Failed to persist memory: {e}")

    def _load_from_disk(self):
        try:
            nodes_path = f"{self.persistence_dir}/nodes.json"
            if os.path.exists(nodes_path):
                with open(nodes_path, "r") as f:
                    data = json.load(f)
                    self.nodes = {nid: MemoryNode(**n) for nid, n in data.items()}
            
            edges_path = f"{self.persistence_dir}/edges.json"
            if os.path.exists(edges_path):
                with open(edges_path, "r") as f:
                    data = json.load(f)
                    self.edges = [MemoryEdge(**e) for e in data]
        except Exception as e:
            print(f"[Memory Store Error] Failed to load memory from disk: {e}")

import chromadb
from chromadb.config import Settings
import httpx

class MemoryVectorIndex:
    def __init__(self, persistence_dir: str = "backend/iam_mia/chroma_db"):
        os.makedirs(persistence_dir, exist_ok=True)
        self.client = chromadb.PersistentClient(
            path=persistence_dir,
            settings=Settings(anonymized_telemetry=False)
        )
        # Separate collection for graph entry points
        self.collection = self.client.get_or_create_collection(name="mia_memory_graph_index")

    async def _get_embedding(self, text: str) -> List[float]:
        # Borrowed logic from memory_orchestrator for consistency
        from config import load_config
        config = load_config()
        gemini = config.providers.get("Gemini")
        if not gemini or not gemini.api_key:
            return [0.0] * 768
            
        url = f"https://generativelanguage.googleapis.com/v1beta/models/text-embedding-004:embedContent?key={gemini.api_key}"
        headers = {'Content-Type': 'application/json'}
        payload = {
            "model": "models/text-embedding-004",
            "content": {"parts": [{"text": text}]}
        }
        
        async with httpx.AsyncClient() as client:
            try:
                response = await client.post(url, headers=headers, json=payload, timeout=10.0)
                response.raise_for_status()
                data = response.json()
                return data['embedding']['values']
            except Exception as e:
                print(f"[Vector Index Error] Embedding failed: {e}")
                return [0.0] * 768

    async def add_node(self, node: MemoryNode):
        text = json.dumps(node.content)
        embedding = await self._get_embedding(text)
        self.collection.add(
            ids=[node.id],
            embeddings=[embedding],
            metadatas=[{"type": node.type}]
        )

    async def search_candidates(self, query: str, n_results: int = 5) -> List[str]:
        embedding = await self._get_embedding(query)
        if sum(embedding) == 0.0: return []
        
        results = self.collection.query(
            query_embeddings=[embedding],
            n_results=n_results
        )
        return results['ids'][0] if results and 'ids' in results else []

class MemoryTraversalEngine:
    def __init__(self, store: MemoryGraphStore, vector_index: Optional[MemoryVectorIndex] = None):
        self.store = store
        self.vector_index = vector_index
        self.MAX_DEPTH = 5
        self.DECAY_FACTOR = 0.8
        self.STOP_THRESHOLD = 0.1

    async def retrieve_context(self, query: str) -> List[MemoryNode]:
        """
        Governed Retrieval: Vector Search (Entry Point) -> Graph Traversal (Truth)
        """
        entry_node_ids = []
        if self.vector_index:
            entry_node_ids = await self.vector_index.search_candidates(query)
            print(f"[Memory Engine] Vector candidates: {entry_node_ids}")
            
        results = self._traverse(entry_node_ids, self.MAX_DEPTH)
        
        # Fallback
        if not results and entry_node_ids:
            results = self._traverse(entry_node_ids, depth_limit=7)
            
        return results

    def _traverse(self, entry_ids: List[str], depth_limit: int) -> List[MemoryNode]:
        activated_nodes: Dict[str, float] = {}
        queue: List[tuple] = [(nid, 1.0, 0) for nid in entry_ids] # (node_id, activation_score, current_depth)
        visited: Set[str] = set()

        while queue:
            # Sort by activation score to process most relevant first
            queue.sort(key=lambda x: x[1], reverse=True)
            nid, score, depth = queue.pop(0)

            if nid in visited or depth > depth_limit or score < self.STOP_THRESHOLD:
                continue

            visited.add(nid)
            node = self.store.nodes.get(nid)
            if not node:
                continue

            # Apply Anti-Feedback-Loop Normalization (Approved Suggestion)
            import math
            global_access_sum = sum(n.access_count for n in self.store.nodes.values())
            norm_factor = math.log(1 + global_access_sum) if global_access_sum > 0 else 1.0
            
            # Update activation score
            current_node_score = (score + (node.access_count * 0.1)) / norm_factor
            activated_nodes[nid] = max(activated_nodes.get(nid, 0), current_node_score)

            # Traversal neighbors
            for edge in self.store.edges:
                if edge.source == nid:
                    new_score = current_node_score * self.DECAY_FACTOR * edge.weight
                    queue.append((edge.target, new_score, depth + 1))
                elif edge.target == nid: # Bidirectional relational traversal
                    new_score = current_node_score * self.DECAY_FACTOR * edge.weight
                    queue.append((edge.source, new_score, depth + 1))

        # Return sorted nodes by activation score
        final_nodes = []
        for nid in sorted(activated_nodes, key=activated_nodes.get, reverse=True):
            node = self.store.nodes[nid]
            node.activation_score = activated_nodes[nid]
            final_nodes.append(node)
            
        return final_nodes

# OS Singleton Layer
memory_store = MemoryGraphStore()
memory_vector = MemoryVectorIndex()
memory_engine = MemoryTraversalEngine(memory_store, memory_vector)
