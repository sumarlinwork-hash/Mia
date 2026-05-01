import os
import tempfile
import speech_recognition as sr
from fastapi import UploadFile

class STTService:
    def __init__(self):
        self.recognizer = sr.Recognizer()

    async def transcribe_audio(self, file: UploadFile) -> str:
        """
        Receives an audio file (UploadFile), saves it temporarily,
        and uses SpeechRecognition to transcribe it.
        """
        try:
            # We save the incoming blob to a temporary wav file
            with tempfile.NamedTemporaryFile(delete=False, suffix=".wav") as temp_audio:
                content = await file.read()
                temp_audio.write(content)
                temp_audio_path = temp_audio.name

            text = ""
            with sr.AudioFile(temp_audio_path) as source:
                audio_data = self.recognizer.record(source)
                # Try Indonesian first, fallback to English if needed
                # In production, this can be mapped to config.appearance.language
                try:
                    text = self.recognizer.recognize_google(audio_data, language="id-ID")
                except sr.UnknownValueError:
                    text = "" # Could not understand
                except sr.RequestError as e:
                    print(f"[STT Error] Google Web Speech API error: {e}")
                    text = ""

            os.remove(temp_audio_path)
            return text
        except Exception as e:
            print(f"[STT Error] Processing failed: {e}")
            return ""

stt_service = STTService()
