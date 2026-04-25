import edge_tts
import asyncio

async def test_tts():
    try:
        communicate = edge_tts.Communicate("Halo dunia, ini adalah tes suara.", "id-ID-GadisNeural")
        await communicate.save("test_tts.mp3")
        print("SUCCESS: Audio saved to test_tts.mp3")
    except Exception as e:
        print(f"FAILED: {e}")

if __name__ == "__main__":
    asyncio.run(test_tts())
