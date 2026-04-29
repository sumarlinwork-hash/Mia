import os
import time
import base64
import io
from typing import List, Optional, Dict, Any
from pydantic import BaseModel, Field
from PIL import Image
import pyautogui
import cv2
import numpy as np

class VisionElement(BaseModel):
    id: str
    label: str
    type: str # e.g., "button", "input", "window", "icon"
    coordinates: Dict[str, int] # x, y, width, height
    confidence: float = 1.0
    text_content: Optional[str] = None
    attributes: Dict[str, Any] = Field(default_factory=dict)

class VisionScene(BaseModel):
    timestamp: float = Field(default_factory=time.time)
    screenshot_b64: str
    elements: List[VisionElement] = Field(default_factory=list)
    screen_resolution: Dict[str, int]
    metadata: Dict[str, Any] = Field(default_factory=dict)

class VisionHub:
    def __init__(self, persistence_dir: str = "backend/data/vision"):
        self.persistence_dir = persistence_dir
        os.makedirs(self.persistence_dir, exist_ok=True)
        pyautogui.FAILSAFE = True

    async def capture_scene(self) -> VisionScene:
        """
        Captures the current screen and builds a structured Scene Graph (Rule 3.2).
        """
        # 1. Take Screenshot
        screenshot = pyautogui.screenshot()
        img_byte_arr = io.BytesIO()
        screenshot.save(img_byte_arr, format='PNG')
        img_bytes = img_byte_arr.getvalue()
        b64_str = base64.b64encode(img_bytes).decode("utf-8")
        
        width, height = screenshot.size
        
        # 2. Build Scene Graph
        # [A] Window Detection (Native OS Layer)
        elements = self._detect_windows()
        
        # [B] Visual Element Detection (OpenCV Layer)
        visual_elements = self._detect_basic_elements(screenshot)
        elements.extend(visual_elements)
        
        scene = VisionScene(
            screenshot_b64=b64_str,
            elements=elements,
            screen_resolution={"width": width, "height": height},
            metadata={"source": "os_native_hybrid_vision"}
        )
        
        return scene

    def _detect_windows(self) -> List[VisionElement]:
        """
        Detects open windows using PyGetWindow (built into PyAutoGUI stack).
        """
        import pygetwindow as gw
        elements = []
        try:
            windows = gw.getAllWindows()
            for i, win in enumerate(windows):
                if win.title and win.visible:
                    elements.append(VisionElement(
                        id=f"win_{i}",
                        label=win.title,
                        type="window",
                        coordinates={
                            "x": win.left, 
                            "y": win.top, 
                            "width": win.width, 
                            "height": win.height
                        },
                        attributes={"is_active": win.isActive}
                    ))
        except Exception as e:
            print(f"[Vision Warning] Window detection failed: {e}")
            
        return elements

    def _detect_basic_elements(self, pil_image: Image.Image) -> List[VisionElement]:
        """
        Heuristic-based element detection using OpenCV (Primitive Affordance Detection).
        """
        elements = []
        
        # Convert PIL to OpenCV format
        open_cv_image = np.array(pil_image)
        open_cv_image = cv2.cvtColor(open_cv_image, cv2.COLOR_RGB2BGR)
        gray = cv2.cvtColor(open_cv_image, cv2.COLOR_BGR2GRAY)
        
        # Simple edge/contour detection to find "objects"
        ret, thresh = cv2.threshold(gray, 127, 255, 0)
        contours, hierarchy = cv2.findContours(thresh, cv2.RETR_TREE, cv2.CHAIN_APPROX_SIMPLE)
        
        # Filter and create elements (This is a simplified prototype of the "Next Level" vision)
        for i, cnt in enumerate(contours[:50]): # Limit for performance
            x, y, w, h = cv2.boundingRect(cnt)
            if w > 50 and h > 20: # Filter small noise
                elements.append(VisionElement(
                    id=f"element_{i}",
                    label="potential_ui_element",
                    type="bounding_box",
                    coordinates={"x": x, "y": y, "width": w, "height": h},
                    confidence=0.5
                ))
                
        return elements

vision_hub = VisionHub()
