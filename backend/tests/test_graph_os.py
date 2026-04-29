import asyncio
import pytest
import json
from core.graph_engine import ExecutionGraph, ExecutionNode, GraphExecutor, NodeStatus
from core.graph_compiler import GraphCompiler

class MockTool:
    async def execute(self, args):
        await asyncio.sleep(0.1)
        return {"status": "ok", "echo": args.get("val")}

@pytest.mark.asyncio
async def test_graph_root_hash_integrity():
    compiler = GraphCompiler()
    llm_output = "```json [{\"id\": \"n1\", \"tool\": \"test\", \"args\": {\"val\": 1}}] ```"
    graph = compiler.compile(llm_output)
    
    initial_hash = graph.graph_root_hash
    assert initial_hash is not None
    
    # Verify Immutability
    with pytest.raises(AttributeError):
        graph.nodes["n1"].tool_version = "1.0.1"
    
    # Verify Hash Change with different input
    llm_output_v2 = "```json [{\"id\": \"n1\", \"tool\": \"test\", \"args\": {\"val\": 1}, \"tool_version\": \"1.0.1\"}] ```"
    graph_v2 = compiler.compile(llm_output_v2)
    assert graph_v2.graph_root_hash != initial_hash
    
    print("[Test] Root Hash Integrity & Immutability Verified.")

@pytest.mark.asyncio
async def test_cycle_detection():
    compiler = GraphCompiler()
    # Cyclic dependency: n1 -> n2 -> n1
    cyclic_data = [
        {"id": "n1", "tool": "test", "dependencies": ["n2"]},
        {"id": "n2", "tool": "test", "dependencies": ["n1"]}
    ]
    
    with pytest.raises(ValueError) as excinfo:
        compiler._detect_cycles(cyclic_data)
    
    assert "Cycle detected" in str(excinfo.value)
    print("[Test] Cycle Detection Verified.")

@pytest.mark.asyncio
async def test_graph_execution_order():
    registry = {"test": MockTool()}
    executor = GraphExecutor(registry)
    
    # n1 and n2 are independent, n3 depends on both
    nodes = {
        "n1": ExecutionNode(id="n1", tool="test", args={"val": "a"}),
        "n2": ExecutionNode(id="n2", tool="test", args={"val": "b"}),
        "n3": ExecutionNode(id="n3", tool="test", args={"val": "{{n1}} + {{n2}}"}, dependencies=["n1", "n2"])
    }
    graph = ExecutionGraph(id="test_graph", nodes=nodes)
    
    results = await executor.execute_graph(graph, {})
    
    assert results["n1"]["echo"] == "a"
    assert results["n2"]["echo"] == "b"
    # Check that both parts are in the string
    n3_echo = str(results["n3"]["echo"])
    assert "echo" in n3_echo
    assert "a" in n3_echo
    assert "b" in n3_echo
    print("[Test] Execution Order & Context Resolution Verified.")

@pytest.mark.asyncio
async def test_graph_deep_immutability():
    compiler = GraphCompiler()
    llm_output = "```json [{\"id\": \"n1\", \"tool\": \"test\"}] ```"
    graph = compiler.compile(llm_output)
    
    # Verify Property-based access
    assert "n1" in graph.nodes
    
    # Verify Deep Immutability (MappingProxyType blocks mutation)
    with pytest.raises(TypeError):
        graph.nodes["n2"] = ExecutionNode(id="n2", tool="test")
        
    with pytest.raises(AttributeError):
        graph.nodes["n1"].tool_version = "2.0.0"

    print("[Test] Deep Immutability Verified.")

@pytest.mark.asyncio
async def test_hash_chaining_with_salt():
    compiler = GraphCompiler()
    graph = compiler.compile("```json [{\"id\": \"n1\", \"tool\": \"test\"}] ```")
    
    registry = {"test": MockTool()}
    executor = GraphExecutor(registry)
    await executor.execute_graph(graph, {})
    
    events = executor.logger.events
    
    # Check chain with Salt
    from core.graph_engine import SYSTEM_INTEGRITY_SALT
    for i in range(1, len(events)):
        prev_event = events[i-1]
        prev_payload = {
            "type": prev_event.type,
            "timestamp": prev_event.timestamp,
            "node_id": prev_event.node_id,
            "payload": prev_event.payload,
            "system_salt": SYSTEM_INTEGRITY_SALT
        }
        prev_data = json.dumps(prev_payload, sort_keys=True)
        import hashlib
        expected_pointer = hashlib.sha256(prev_data.encode()).hexdigest()
        assert events[i].hash_chain_pointer == expected_pointer
        
    print("[Test] Salted Hash Chaining Verified.")

if __name__ == "__main__":
    asyncio.run(test_graph_root_hash_integrity())
    asyncio.run(test_cycle_detection())
    asyncio.run(test_graph_execution_order())
    asyncio.run(test_graph_deep_immutability())
    asyncio.run(test_hash_chaining_with_salt())
