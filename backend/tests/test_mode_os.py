import asyncio
from core.mode_hub import mode_hub, MIAMode
from core.cognitive_hub import cognitive_hub, CognitiveStatus

async def test_mode_enforcement():
    # Setup: Risky plan (Delete task)
    risky_prompt = "Hapus file Desktop"
    cognitive_hub._decompose_goals = lambda intent: [
        {"id": "del_task", "tool": "delete_files", "args": {"path": "Desktop/*"}, "dependencies": []}
    ]

    # 1. Test SAFE_MODE (Threshold 0.8)
    # 1.0 - 0.4 = 0.6. 0.6 < 0.8 -> REJECTED
    mode_hub.set_mode(MIAMode.SAFE_MODE)
    print(f"\n[Test] Mode: {mode_hub.get_mode()}")
    resp_safe = await cognitive_hub.process_request(risky_prompt)
    assert resp_safe.status == CognitiveStatus.REJECTED
    print(f"[Test] Success: Risky action REJECTED in SAFE_MODE (Score: {resp_safe.confidence})")

    # 2. Test POWER_MODE (Threshold 0.6)
    # 1.0 - 0.4 = 0.6. 0.6 >= 0.6 -> APPROVED
    mode_hub.set_mode(MIAMode.POWER_MODE)
    print(f"\n[Test] Mode: {mode_hub.get_mode()}")
    resp_power = await cognitive_hub.process_request(risky_prompt)
    assert resp_power.status == CognitiveStatus.APPROVED
    print(f"[Test] Success: Risky action APPROVED in POWER_MODE (Expert Access)")

    # 3. Test BEGINNER_MODE (Threshold 0.9)
    # 1.0 - 0.4 = 0.6. 0.6 < 0.9 -> REJECTED
    mode_hub.set_mode(MIAMode.BEGINNER_MODE)
    print(f"\n[Test] Mode: {mode_hub.get_mode()}")
    resp_beginner = await cognitive_hub.process_request(risky_prompt)
    assert resp_beginner.status == CognitiveStatus.REJECTED
    print(f"[Test] Success: Risky action REJECTED in BEGINNER_MODE (Strict Safety)")

if __name__ == "__main__":
    asyncio.run(test_mode_enforcement())
