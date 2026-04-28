import wave
import contextlib
import os

# For mp3, we might need a different approach if wave doesn't work, 
# but let's try a simple file size/bitrate estimate or use a more robust way.
# Actually, I'll use the 'mutagen' library if available, or just try to read headers.

try:
    from pydub.utils import mediainfo
    info = mediainfo(r"d:\ProjectBuild\projects\mia\frontend\public\heartbeat.mp3")
    print(f"Duration: {info['duration']}")
except:
    # Fallback: Just assume 1 second if it's a loop, or check file size.
    size = os.path.getsize(r"d:\ProjectBuild\projects\mia\frontend\public\heartbeat.mp3")
    print(f"File size: {size} bytes")
