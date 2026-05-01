import pyautogui
import os
import time
import base64
from PIL import Image
import io

# Safety: Fail-safe is on by default. Moving mouse to corner kills the script.
pyautogui.FAILSAFE = True

class AgentTools:
    def __init__(self):
        self.screenshot_dir = os.path.join(os.path.dirname(__file__), "temp_screens")
        os.makedirs(self.screenshot_dir, exist_ok=True)

    def get_tool_names(self):
        """Returns a list of callable tool names."""
        return ["take_screenshot_bytes", "click", "type_text", "press_key", "run_command", "save_skill", "execute_skill"]

    def take_screenshot_bytes(self) -> bytes:
        """Takes a screenshot and returns the raw bytes."""
        screenshot = pyautogui.screenshot()
        img_byte_arr = io.BytesIO()
        screenshot.save(img_byte_arr, format='PNG')
        return img_byte_arr.getvalue()

    def click(self, x: int, y: int):
        """Clicks at specific coordinates."""
        pyautogui.click(x, y)
        return f"Clicked at ({x}, {y})"

    def type_text(self, text: str):
        """Types text at current focus."""
        pyautogui.write(text, interval=0.01)
        return f"Typed text into active window."

    def press_key(self, key: str):
        """Presses a specific key (e.g., 'enter', 'esc')."""
        pyautogui.press(key)
        return f"Pressed: {key}"

    def run_command(self, command: str):
        """Runs a system command asynchronously with safety filters."""
        import subprocess
        
        # Security: Blacklist of destructive commands
        blacklist = [
            "rm -rf", "del /s", "format ", "mkfs", "dd if=", 
            "> /dev/", ":(){ :|:& };:", "shutdown", "reboot"
        ]
        
        for forbidden in blacklist:
            if forbidden in command.lower():
                return f"Security Alert: Command '{command}' is blocked due to safety policies."

        try:
            # Use Popen to avoid blocking the backend
            subprocess.Popen(command, shell=True)
            return f"Command executed: {command}"
        except Exception as e:
            return f"Execution Error: {str(e)}"

    def save_skill(self, name: str, code: str):
        """Saves a new skill script to the library."""
        from skill_manager import skill_manager
        return skill_manager.save_skill(name, code)

    async def execute_skill(self, name: str, args: dict = {}):
        """Executes a previously saved skill."""
        from skill_manager import skill_manager
        return await skill_manager.execute_skill(name, args)

agent_tools = AgentTools()
