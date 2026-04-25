from typing import Dict, Any
from .abstractions import ToolAdapter
from agent_tools import agent_tools

class OSControlAdapter(ToolAdapter):
    def __init__(self, method_name: str):
        self._method_name = method_name

    @property
    def name(self) -> str:
        return f"OS Control: {self._method_name}"

    async def execute(self, args: Dict[str, Any]) -> Any:
        # Map to agent_tools methods
        if self._method_name == "click":
            return agent_tools.click(args.get("x", 0), args.get("y", 0))
        elif self._method_name == "type":
            return agent_tools.type_text(args.get("text", ""))
        elif self._method_name == "press":
            return agent_tools.press_key(args.get("key", "enter"))
        elif self._method_name == "terminal":
            return agent_tools.run_command(args.get("command", ""))
        elif self._method_name == "screenshot":
            # For graph engine, we might want to return the b64 or just success
            return "Screenshot captured."
        return f"Method {self._method_name} not implemented in adapter."

class ToolRegistry:
    def __init__(self):
        self._tools: Dict[str, ToolAdapter] = {}
        self._init_standard_tools()

    def _init_standard_tools(self):
        # Register core OS control tools
        for method in ["click", "type", "press", "terminal", "screenshot"]:
            self._tools[method] = OSControlAdapter(method)

    def register(self, name: str, tool: ToolAdapter):
        self._tools[name] = tool

    def get_tool(self, name: str) -> ToolAdapter:
        return self._tools.get(name)

    def list_tools(self) -> Dict[str, ToolAdapter]:
        return self._tools

tool_registry = ToolRegistry()
