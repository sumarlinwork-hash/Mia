from core.abstractions import ToolAdapter
from typing import Dict, Any

class StoryWeaver(ToolAdapter):
    @property
    def name(self) -> str:
        return "Story Weaver"

    async def execute(self, args: Dict[str, Any]) -> Any:
        genre = args.get("genre", "Fantasy")
        theme = args.get("theme", "Mystery")
        return f"Once upon a time in a {genre} world, there was a {theme} that changed everything..."

# Metadata for marketplace
metadata = {
    "id": "story_weaver",
    "name": "Story Weaver",
    "version": "1.0.0",
    "category": "Creativity",
    "description": "Crafts beautiful stories based on genre and theme.",
    "author": "MIA Core",
    "permissions": ["llm_access"]
}
