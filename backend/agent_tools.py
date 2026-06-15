import pyautogui
import os
import time
import base64
from PIL import Image
import io
import webbrowser
import urllib.request
import urllib.error
import urllib.parse
import re
import asyncio
from playwright.async_api import async_playwright

# Safety: Fail-safe is on by default. Moving mouse to corner kills the script.
pyautogui.FAILSAFE = True

class AgentTools:
    def __init__(self):
        self.screenshot_dir = os.path.join(os.path.dirname(__file__), "temp_screens")
        os.makedirs(self.screenshot_dir, exist_ok=True)

    def get_tool_names(self, kernel: str | None = None):
        """Returns a list of callable tool names, restricted by the active kernel if provided."""
        default_tools = [
            "open_local_url",
            "inspect_page",
            "click",
            "type",
            "press",
            "screenshot",
            "run_command",
            "save_skill",
            "execute_skill",
        ]
        if kernel == "studio":
            # Studio can execute skills, but does not save companion-defined skills directly.
            return [tool for tool in default_tools if tool != "save_skill"]
        return default_tools

    def take_screenshot_bytes(self) -> bytes:
        """Takes a screenshot and returns the raw bytes."""
        screenshot = pyautogui.screenshot()
        img_byte_arr = io.BytesIO()
        screenshot.save(img_byte_arr, format='PNG')
        return img_byte_arr.getvalue()

    def take_screenshot_file(self) -> str:
        """Takes a screenshot and saves to temp_screens, returns filepath."""
        screenshot = pyautogui.screenshot()
        ts = int(time.time() * 1000)
        fname = os.path.join(self.screenshot_dir, f"screenshot_{ts}.png")
        screenshot.save(fname)
        return fname

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

    async def execute_skill(self, name: str, args: dict = {}, kernel: str | None = None):
        """Executes a previously saved skill. Respects optional `kernel` context to enforce permissions."""
        from skill_manager import skill_manager
        return await skill_manager.execute_skill(name, args, kernel=kernel)

    # -- Browser / Local App helpers --
    def open_local_url(self, url: str):
        """Open a local URL in the default browser. Restrict to localhost for safety."""
        try:
            parsed = urllib.parse.urlparse(url)
            host = parsed.hostname or ""
            if host not in ("localhost", "127.0.0.1", "::1"):
                return f"Security: only localhost URLs are allowed (blocked: {host})"
            webbrowser.open(url)
            return f"Opened local URL: {url}"
        except Exception as e:
            return f"open_local_url error: {e}"

    def inspect_page(self, url: str, timeout: int = 3):
        """Fetch a local page (localhost) and return a short inspection: status, title, content-snippet."""
        try:
            parsed = urllib.parse.urlparse(url)
            host = parsed.hostname or ""
            if host not in ("localhost", "127.0.0.1", "::1"):
                return {"ok": False, "error": "Only localhost inspection allowed"}

            req = urllib.request.Request(url, headers={"User-Agent": "MIA-Inspector/1.0"})
            with urllib.request.urlopen(req, timeout=timeout) as resp:
                status = getattr(resp, 'status', None) or resp.getcode()
                body = resp.read(4096)
                try:
                    text = body.decode('utf-8', errors='replace')
                except Exception:
                    text = str(body)
                # crude title extraction
                m = re.search(r"<title>(.*?)</title>", text, re.IGNORECASE | re.DOTALL)
                title = m.group(1).strip() if m else None
                snippet = text[:800]
                return {"ok": True, "status": status, "title": title, "snippet": snippet}
        except urllib.error.HTTPError as he:
            return {"ok": False, "error": f"HTTPError {he.code}: {he.reason}"}
        except Exception as e:
            return {"ok": False, "error": str(e)}

    def read_console(self, url: str = None):
        """Reads browser console logs using Playwright.
        
        Args:
            url: The URL to load and capture console logs from
            
        Returns:
            Dictionary with captured console messages or error
        """
        if not url:
            return {"ok": False, "error": "URL is required for console reading"}
        
        try:
            # Handle both sync and async contexts
            try:
                loop = asyncio.get_running_loop()
                # If we're in an event loop, we need to run in a thread
                import concurrent.futures
                with concurrent.futures.ThreadPoolExecutor() as pool:
                    future = pool.submit(lambda: asyncio.run(self._read_console_async(url)))
                    return future.result()
            except RuntimeError:
                # No running event loop, safe to use asyncio.run()
                return asyncio.run(self._read_console_async(url))
        except Exception as e:
            return {"ok": False, "error": f"Failed to read console: {str(e)}"}

    async def _read_console_async(self, url: str):
        """Async implementation of console reading using Playwright."""
        console_messages = []
        page_errors = []
        
        async with async_playwright() as p:
            # Use Chromium in headless mode for optimal performance
            browser = await p.chromium.launch(headless=True)
            context = await browser.new_context()
            page = await context.new_page()
            
            # Capture console messages (log, warn, error, info, debug, trace)
            def on_console_message(msg):
                console_messages.append({
                    "type": msg.type,  # log, warn, error, info, debug, trace
                    "text": msg.text,
                    "args": [str(arg) for arg in msg.args][:5]  # Limit to 5 args per message
                })
            
            # Capture page errors (uncaught exceptions)
            def on_page_error(error):
                page_errors.append({"type": "error", "text": str(error)})
            
            page.on("console", on_console_message)
            page.on("pageerror", on_page_error)
            
            try:
                # Navigate to the URL with timeout
                response = await page.goto(url, timeout=5000, wait_until="networkidle")
                
                # Wait a bit for any deferred console messages
                await page.wait_for_timeout(500)
                
                # Compile results
                all_messages = console_messages + page_errors
                
                return {
                    "ok": True,
                    "url": url,
                    "status": response.status if response else None,
                    "messages": all_messages,
                    "count": len(all_messages),
                    "has_errors": len(page_errors) > 0
                }
            
            except Exception as e:
                return {
                    "ok": False,
                    "error": str(e),
                    "messages": console_messages + page_errors,
                    "count": len(console_messages + page_errors)
                }
            
            finally:
                await context.close()
                await browser.close()

agent_tools = AgentTools()
