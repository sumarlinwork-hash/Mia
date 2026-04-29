import asyncio
from core.cognitive_hub import cognitive_hub, CognitiveStatus

async def test_cognitive_pipeline():
    # 1. Test Ambiguity Detection
    print("[Test] Testing Ambiguity (short prompt)...")
    resp_ambiguous = await cognitive_hub.process_request("Hei")
    assert resp_ambiguous.status == CognitiveStatus.WAITING_USER
    print(f"[Test] Success: Ambiguity detected (Score: {resp_ambiguous.ambiguity_report.ambiguity_score})")

    # 2. Test Successful Pipeline
    print("\n[Test] Testing Successful Pipeline...")
    resp_ok = await cognitive_hub.process_request("Buka browser dan cari resep nasi goreng")
    assert resp_ok.status == CognitiveStatus.APPROVED
    assert resp_ok.confidence >= 0.7
    print(f"[Test] Success: Plan approved with confidence {resp_ok.confidence}")

    # 3. Test Risk Detection (Data Deletion)
    print("\n[Test] Testing Risk Detection (Delete tool)...")
    # Simulate a plan with a risky tool
    risky_prompt = "Hapus semua file di Desktop"
    # We mock the decomposition for this test to inject a risky tool
    cognitive_hub._decompose_goals = lambda intent: [
        {"id": "del_task", "tool": "delete_files", "args": {"path": "Desktop/*"}, "dependencies": []}
    ]
    resp_risky = await cognitive_hub.process_request(risky_prompt)
    assert resp_risky.status == CognitiveStatus.REJECTED
    print(f"[Test] Success: Risk rejected! Reason: {resp_risky.reason}")

    # 4. Test Memory Integration
    from core.memory_graph import memory_store
    all_nodes = memory_store.nodes
    trace_nodes = [nid for nid in all_nodes if nid.startswith("trace_")]
    assert len(trace_nodes) > 0
    print(f"\n[Test] Success: {len(trace_nodes)} Cognitive Traces found in Memory Graph.")

if __name__ == "__main__":
    asyncio.run(test_cognitive_pipeline())
