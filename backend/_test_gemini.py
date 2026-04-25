import asyncio
import httpx

async def test():
    # Use the same structure as brain_orchestrator
    url = f"https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=DUMMY"
    payload = {
        "system_instruction": {
            "parts": [{"text": "You are MIA."}]
        },
        "contents": [
            {"role": "user", "parts": [{"text": "Hello"}]}
        ],
        "generationConfig": {
            "temperature": 0.7,
            "maxOutputTokens": 8192,
            "topP": 0.95,
            "topK": 40
        }
    }
    async with httpx.AsyncClient() as client:
        resp = await client.post(url, json=payload)
        print(f"Status: {resp.status_code}")
        print(f"Response: {resp.text}")

asyncio.run(test())
