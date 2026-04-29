import asyncio
import os
import shutil
from core.memory_graph import MemoryGraphStore, MemoryNode, MemoryNodeType, MemoryTraversalEngine, MemoryVectorIndex

async def test_memory_system():
    # Mock Embedding to avoid API dependency in test
    async def mock_embedding(text):
        # Keyword-based mock: return a vector based on shared keywords
        vec = [0.0] * 768
        keywords = ["Alice", "Python", "Coding", "event"]
        for i, kw in enumerate(keywords):
            if kw.lower() in text.lower():
                vec[i] = 1.0
        return vec
    
    # Cleanup old data
    if os.path.exists("backend/data/test_memory"):
        shutil.rmtree("backend/data/test_memory")
    
    store = MemoryGraphStore(persistence_dir="backend/data/test_memory")
    vector = MemoryVectorIndex(persistence_dir="backend/data/test_memory/chroma")
    vector._get_embedding = mock_embedding # Inject mock
    engine = MemoryTraversalEngine(store, vector)

    # 1. Add Nodes
    u1 = MemoryNode(id="user_1", type=MemoryNodeType.IDENTITY, content={"name": "Alice", "hobby": "Coding"})
    c1 = MemoryNode(id="concept_python", type=MemoryNodeType.CONCEPT, content={"name": "Python", "desc": "A programming language"})
    e1 = MemoryNode(id="event_chat_1", type=MemoryNodeType.EVENT, content={"action": "Alice asked about Python"})
    
    store.add_node(u1)
    store.add_node(c1)
    store.add_node(e1)
    
    await vector.add_node(u1)
    await vector.add_node(c1)
    await vector.add_node(e1)

    # 2. Add Relationships
    store.add_edge("user_1", "event_chat_1", "initiated")
    store.add_edge("event_chat_1", "concept_python", "referenced")

    # 3. Test Internal Traversal (The Heart of Associative Memory)
    print("[Test] Testing internal _traverse starting from 'user_1'...")
    # Explicitly start from Alice, see if it finds Python via the chat event
    traversal_results = engine._traverse(["user_1"], depth_limit=5)
    
    node_ids = [n.id for n in traversal_results]
    print(f"[Test] Traversal found: {node_ids}")
    
    assert "user_1" in node_ids
    assert "event_chat_1" in node_ids # Alice -> initiated -> event_chat_1
    assert "concept_python" in node_ids # event_chat_1 -> referenced -> concept_python
    
    # Check scores (Alice should be highest, then event, then python due to decay)
    scores = {n.id: n.activation_score for n in traversal_results}
    assert scores["user_1"] > scores["event_chat_1"]
    assert scores["event_chat_1"] > scores["concept_python"]

    print("[Test] Success: Spreading activation and decay verified.")

if __name__ == "__main__":
    asyncio.run(test_memory_system())
