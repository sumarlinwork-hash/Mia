import edge_tts
import asyncio

async def make_test_mp3():
    text = "Halo kak! Ini suara baruku. Sekarang suaraku terdengar lebih muda, ceria, dan nggak kayak ibu-ibu lagi kan? Gimana menurut kakak?"
    # Settings: Gadis + Pitch +12Hz + Rate +10%
    communicate = edge_tts.Communicate(text, "id-ID-GadisNeural", pitch="+12Hz", rate="+10%")
    await communicate.save("test_suara_gadis_baru.mp3")
    print("SUCCESS: File 'test_suara_gadis_baru.mp3' telah dibuat di folder project.")

if __name__ == "__main__":
    asyncio.run(make_test_mp3())
