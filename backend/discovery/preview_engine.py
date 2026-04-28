"""
Preview Engine - Phase 3.4
Semi-dynamic preview system with cost control

Multi-mode preview:
- static: Predefined responses ($0 cost)
- template: Template-based generation ($0 cost)
- light_llm: LLM-powered preview with rate limiting ($0.01-0.02 per preview)
"""

from typing import Dict, Any, Optional
import time


class PreviewEngine:
    """Handles semi-dynamic app previews with cost control"""

    # Rate limiting constants
    MAX_LLM_REQUESTS_PER_SESSION = 5
    LLM_TIMEOUT_SECONDS = 3
    MAX_LLM_TOKENS = 100

    def __init__(self):
        # Session tracking for rate limiting
        self.session_counts: Dict[str, int] = {}
        self.session_start: Dict[str, float] = {}

    async def run_preview(
        self,
        app_id: str,
        user_input: str = "",
        mode: str = "static",
        template: str = "default",
        session_id: str = "default_session"
    ) -> Dict[str, Any]:
        """
        Generate preview response based on mode

        Args:
            app_id: Application ID
            user_input: User's test input
            mode: Preview mode (static, template, light_llm)
            template: Template name for template/light_llm modes
            session_id: User session ID for rate limiting

        Returns:
            Dict with response and metadata
        """

        if mode == "static":
            return self._static_preview(template)

        elif mode == "template":
            return self._template_preview(template, user_input)

        elif mode == "light_llm":
            # Check rate limit
            if self._is_rate_limited(session_id):
                return {
                    "status": "error",
                    "error": f"Preview limit reached ({self.MAX_LLM_REQUESTS_PER_SESSION} attempts)",
                    "mode": "light_llm",
                }

            try:
                return await self._llm_preview(template, user_input, session_id)
            except Exception as e:
                # Fallback to template mode if LLM fails
                return self._template_preview(template, user_input)

        else:
            return self._static_preview("default")

    def _static_preview(self, template: str) -> Dict[str, Any]:
        """
        Static preview - predefined responses
        Cost: $0
        Speed: < 100ms
        """

        static_responses = {
            "chatbot_demo": "Hello! I'm your AI assistant. You can ask me questions, and I'll do my best to help. Try asking something!",
            "story_generator": "Once upon a time, in a world where AI could write anything... [This is a preview. Install for full stories!]",
            "analytics_sample": "Sample Analytics Report:\n\n• Total Users: 1,234\n• Growth Rate: +15%\n• Engagement: 78%\n\n[Install for live data]",
            "automation_preview": "Workflow Preview:\n\n1. Trigger: New email received\n2. Action: Extract attachments\n3. Output: Save to cloud storage\n\n[Install to activate]",
            "default": "This is a preview of the app. Install the app to unlock full functionality.",
        }

        return {
            "status": "success",
            "response": static_responses.get(template, static_responses["default"]),
            "mode": "static",
            "cost": 0,
            "timestamp": time.time(),
        }

    def _template_preview(self, template: str, user_input: str) -> Dict[str, Any]:
        """
        Template-based preview - rule-based generation
        Cost: $0
        Speed: < 500ms
        """

        # Simple template logic
        if "chatbot" in template:
            response = f"Bot response to: '{user_input}'\n\nThis is a template-based preview. Install for AI-powered responses!"

        elif "story" in template:
            response = f"Story preview inspired by: '{user_input}'\n\nOnce upon a time, in a land filled with wonder... [Install for full stories]"

        elif "analytics" in template:
            response = f"Analytics demo for query: '{user_input}'\n\n• Metric 1: 78% accuracy\n• Metric 2: +15% improvement\n\n[Install for real data]"

        else:
            response = f"Template preview: Processing '{user_input}'\n\nInstall for full functionality!"

        return {
            "status": "success",
            "response": response,
            "mode": "template",
            "cost": 0,
            "timestamp": time.time(),
        }

    async def _llm_preview(
        self,
        template: str,
        user_input: str,
        session_id: str
    ) -> Dict[str, Any]:
        """
        LLM-powered preview with rate limiting
        Cost: $0.01-0.02 per preview
        Speed: < 1s
        """
        # Increment session count
        self.session_counts[session_id] = self.session_counts.get(
            session_id, 0) + 1

        try:
            # Import inside method to avoid circular imports if any
            from brain_orchestrator import brain_orchestrator
            import re

            # Short, constrained prompt for preview purposes
            preview_prompt = (
                f"You are simulating a preview for the app '{template}'. "
                f"User test input: '{user_input}'. "
                "Respond as the app would, but keep it very brief (max 2 sentences). "
                "Do not include any JSON tool blocks."
            )

            response = await brain_orchestrator.execute_request(
                prompt=preview_prompt,
                context=f"[PREVIEW SESSION: {session_id}]",
                is_intimate=False
            )

            # Safety: Strip any accidentally generated tool blocks
            response = re.sub(r"```json\n(.*?)\n```", "",
                              response, flags=re.DOTALL).strip()

            if not response:
                response = "App preview is currently unavailable. Try a different query."

        except Exception as e:
            print(f"[PreviewEngine] LLM Fallback active. Error: {e}")
            response = f"Simulated response for '{template}': Processing '{user_input}'... [Install for full interactive AI]"

        return {
            "status": "success",
            "response": response,
            "mode": "light_llm",
            "cost": 0.015,  # Average cost
            "session_usage": f"{self.session_counts[session_id]}/{self.MAX_LLM_REQUESTS_PER_SESSION}",
            "timestamp": time.time(),
        }

    def _is_rate_limited(self, session_id: str) -> bool:
        """Check if session has exceeded LLM preview limit"""
        count = self.session_counts.get(session_id, 0)
        return count >= self.MAX_LLM_REQUESTS_PER_SESSION


# Global preview engine instance
preview_engine = PreviewEngine()
