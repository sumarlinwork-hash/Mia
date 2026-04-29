import asyncio
import pytest
import json
from core.graph_engine import ExecutionGraph, ExecutionNode, GraphExecutor, NodeStatus
from core.policy_engine import PolicyEngine, PolicyAction, PolicyOperator

class MockTool:
    async def execute(self, args):
        return {"status": "ok", "result": args.get("val")}

async def test_policy_engine():
    # 1. Setup Policy Engine
    engine = PolicyEngine()
    policies = [
        {
            "id": "block_terminal_delete",
            "action": "deny",
            "tool_pattern": "terminal",
            "conditions": [
                {"field": "command", "operator": "IN", "value": ["rm", "del", "format"]}
            ],
            "priority": 10
        },
        {
            "id": "allow_safe_terminal",
            "action": "allow",
            "tool_pattern": "terminal",
            "conditions": [
                {"field": "command", "operator": "==", "value": "ls"}
            ],
            "priority": 5
        }
    ]
    engine.load_policies(json.dumps(policies))

    # 2. Setup Executor
    registry = {"terminal": MockTool()}
    executor = GraphExecutor(registry, policy_engine=engine)

    # 3. Test Pre-execution Block (PolicyGate)
    # Node n1 tries to run 'rm'
    nodes_unsafe = {
        "n1": ExecutionNode(id="n1", tool="terminal", args={"command": "rm"})
    }
    graph_unsafe = ExecutionGraph(id="unsafe_graph", nodes=nodes_unsafe)
    
    print("[Test] Testing PolicyGate block...")
    try:
        await executor.execute_graph(graph_unsafe, {})
        assert False, "Should have been blocked by PolicyGate"
    except Exception as e:
        assert "PolicyGate FAIL" in str(e)
        print(f"[Test] Success: PolicyGate blocked unsafe node. Reason: {e}")

    # 4. Test Runtime Skip (ExecutionGate)
    # n1 is safe, n2 is unsafe but its input depends on n1
    # Actually, let's test if a node is allowed based on dynamic context
    policies_dynamic = [
        {
            "id": "allow_if_admin",
            "action": "allow",
            "tool_pattern": "restricted_tool",
            "conditions": [
                {"field": "user_role", "operator": "==", "value": "admin"}
            ],
            "priority": 10
        }
    ]
    engine.load_policies(json.dumps(policies_dynamic))
    registry["restricted_tool"] = MockTool()
    
    nodes_dynamic = {
        "n1": ExecutionNode(id="n1", tool="restricted_tool", args={"val": "data"})
    }
    graph_dynamic = ExecutionGraph(id="dynamic_graph", nodes=nodes_dynamic)
    
    # Run with user_role = guest (Should be skipped/blocked)
    print("[Test] Testing ExecutionGate with guest role...")
    try:
        await executor.execute_graph(graph_dynamic, {"user_role": "guest"})
        assert False, "Should have been blocked by PolicyGate"
    except Exception as e:
        assert "PolicyGate FAIL" in str(e)
        print("[Test] Success: Guest access blocked.")

    # Run with user_role = admin (Should pass)
    print("[Test] Testing ExecutionGate with admin role...")
    results = await executor.execute_graph(graph_dynamic, {"user_role": "admin"})
    assert results["n1"]["result"] == "data"
    print("[Test] Success: Admin access allowed.")

if __name__ == "__main__":
    asyncio.run(test_policy_engine())
