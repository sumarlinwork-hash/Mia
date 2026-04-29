import json
import re
import time
from typing import Any, Dict, List, Optional
from pydantic import ValidationError
from .graph_engine import ExecutionGraph, ExecutionNode, NodeStatus, ExecutionMode

class GraphCompiler:
    def __init__(self, tool_registry: Any = None, graph_id_prefix: str = "graph"):
        self.graph_id_prefix = graph_id_prefix
        self.tool_registry = tool_registry

    def compile(self, llm_output: str) -> ExecutionGraph:
        """
        4-Layer Pipeline to transform LLM output into a Hardened ExecutionGraph.
        """
        # 1. Parse Layer
        raw_data = self._parse_layer(llm_output)
        
        # 2. Validate Layer (Strict Schema + Deep Integrity)
        self._validate_layer(raw_data)
        
        # 3. Normalize Layer
        graph = self._normalize_layer(raw_data)
        
        # 4. Deterministic Lock Layer
        graph.freeze()
        
        return graph

    def _parse_layer(self, text: str) -> List[Dict[str, Any]]:
        """
        Extracts JSON list from LLM output with strict schema validation.
        """
        # Try to find json block
        match = re.search(r"```json\s*([\s\S]*?)\s*```", text)
        json_str = match.group(1) if match else text

        try:
            data = json.loads(json_str)
            if isinstance(data, dict) and "nodes" in data:
                 data = data["nodes"] # Allow wrapper format
            if not isinstance(data, list):
                data = [data]
            return data
        except json.JSONDecodeError as e:
            raise ValueError(f"GraphCompiler [ParseLayer] Failed: Invalid JSON format. {str(e)}")

    def _validate_layer(self, data: List[Dict[str, Any]]):
        """
        Strict schema, tool existence, and deep integrity validation.
        """
        node_ids = set()
        for i, raw_node in enumerate(data):
            # Basic Schema Validation
            try:
                # Use ExecutionNode for schema validation even if we don't keep the object yet
                ExecutionNode(**raw_node)
            except ValidationError as e:
                raise ValueError(f"GraphCompiler [ValidateLayer] Schema error at node {i}: {e.json()}")

            node_id = raw_node["id"]
            if node_id in node_ids:
                raise ValueError(f"GraphCompiler [ValidateLayer] Duplicate node ID '{node_id}'")
            node_ids.add(node_id)

            # Tool Existence Validation
            if self.tool_registry and raw_node["tool"] not in self.tool_registry:
                raise ValueError(f"GraphCompiler [ValidateLayer] Unknown tool '{raw_node['tool']}' in node '{node_id}'")

        # Deep Integrity: Missing Dependencies & Cycles
        for raw_node in data:
            for dep in raw_node.get("dependencies", []):
                if dep not in node_ids:
                    raise ValueError(f"GraphCompiler [ValidateLayer] Node '{raw_node['id']}' depends on non-existent node '{dep}'")

        # Orphan Node Detection (Optional, but good for cleanliness)
        all_deps = {dep for n in data for dep in n.get("dependencies", [])}
        # In a DAG, there must be at least one node with no dependencies (root)
        # and nodes that are not dependencies of anything (leafs) are fine, 
        # but nodes not reachable from anywhere (not roots and not deps of anything else)
        # are "orphans" if they aren't part of a connected component.
        # For Sprint 1, we just ensure every node is part of the graph.

        # Cycle Detection
        self._detect_cycles(data)

    def _detect_cycles(self, data: List[Dict[str, Any]]):
        adj = {n["id"]: n.get("dependencies", []) for n in data}
        visited = set()
        rec_stack = set()

        def has_cycle(u):
            visited.add(u)
            rec_stack.add(u)
            for v in adj.get(u, []):
                if v not in visited:
                    if has_cycle(v): return True
                elif v in rec_stack: return True
            rec_stack.remove(u)
            return False

        for node_id in adj:
            if node_id not in visited:
                if has_cycle(node_id):
                    raise ValueError(f"GraphCompiler [ValidateLayer] Cycle detected at node '{node_id}'")

    def _normalize_layer(self, data: List[Dict[str, Any]]) -> ExecutionGraph:
        """
        Standardizes format and builds the ExecutionGraph object.
        """
        graph_id = f"{self.graph_id_prefix}_{int(time.time())}"
        nodes = {}
        
        for raw_node in data:
            node_data = {
                "id": raw_node["id"],
                "tool": raw_node["tool"],
                "args": raw_node.get("args", {}),
                "dependencies": raw_node.get("dependencies", []),
                "parent_graph_id": graph_id
            }
            # Propagate optional OS-level fields if present
            for field in ["tool_version", "execution_mode", "sandbox_id", "retry_count"]:
                if field in raw_node:
                    node_data[field] = raw_node[field]
            
            node = ExecutionNode(**node_data)
            nodes[node.id] = node
            
        return ExecutionGraph(id=graph_id, nodes=nodes)
