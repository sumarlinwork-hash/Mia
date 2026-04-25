import asyncio
from typing import Any, Dict, List, Optional
from pydantic import BaseModel
from .abstractions import ToolAdapter
from .permission_manager import permission_manager

class GraphNode(BaseModel):
    id: str
    tool: str
    args: Dict[str, Any] = {}
    next: Optional[str] = None
    condition: Optional[str] = None # Placeholder for future logic
    required_permission: Optional[str] = None

class SkillGraph(BaseModel):
    nodes: List[GraphNode]
    start_node: str

class GraphExecutor:
    def __init__(self, tool_registry: Dict[str, ToolAdapter], pid: Optional[str] = None):
        self.tool_registry = tool_registry
        self.pid = pid

    async def execute_graph(self, graph: SkillGraph, initial_inputs: Dict[str, Any]) -> Dict[str, Any]:
        """
        Executes a sequence of nodes. 
        """
        context = initial_inputs.copy()
        current_node_id = graph.start_node
        
        node_map = {node.id: node for node in graph.nodes}
        
        while current_node_id:
            node = node_map.get(current_node_id)
            if not node:
                break
                
            # Permission Check
            if node.required_permission:
                if not permission_manager.check(self.pid, node.required_permission):
                    raise Exception(f"Permission denied for node {node.id}: {node.required_permission}")

            print(f"[GraphExecutor] Executing node: {node.id} ({node.tool})")
            
            tool = self.tool_registry.get(node.tool)
            if not tool:
                raise Exception(f"Tool not found: {node.tool}")
            
            resolved_args = self._resolve_args(node.args, context)
            result = await tool.execute(resolved_args)
            
            context[node.id] = result
            current_node_id = node.next
            
        return context

    def _resolve_args(self, args: Dict[str, Any], context: Dict[str, Any]) -> Dict[str, Any]:
        resolved = {}
        for k, v in args.items():
            if isinstance(v, str) and v.startswith("{{") and v.endswith("}}"):
                key = v[2:-2].strip()
                resolved[k] = context.get(key, v)
            else:
                resolved[k] = v
        return resolved
