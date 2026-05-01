import os
import json
from typing import List
from .models import StudioProjectMetadata, StudioErrorType, format_studio_error

class StudioProjectService:
    def __init__(self, base_draft_dir: str = "backend/studio/drafts"):
        self.base_draft_dir = os.path.realpath(base_draft_dir)
        self.registry_path = os.path.join(os.path.dirname(self.base_draft_dir), "projects_registry.json")
        self._ensure_registry()

    def _ensure_registry(self):
        os.makedirs(os.path.dirname(self.registry_path), exist_ok=True)
        if not os.path.exists(self.registry_path):
            with open(self.registry_path, "w") as f:
                json.dump(["default_project"], f)

    def list_valid_projects(self) -> List[str]:
        try:
            with open(self.registry_path, "r") as f:
                return json.load(f)
        except Exception:
            return ["default_project"]

    def verify_project(self, project_id: str):
        if project_id not in self.list_valid_projects():
            raise Exception(format_studio_error(StudioErrorType.SECURITY, f"Unregistered Project ID: {project_id}"))
        
        project_path = os.path.join(self.base_draft_dir, project_id)
        if not os.path.exists(project_path):
             os.makedirs(project_path, exist_ok=True)

    def get_project_metadata(self, project_id: str) -> StudioProjectMetadata:
        self.verify_project(project_id)
        meta_path = os.path.join(self.base_draft_dir, project_id, ".miaproject")
        
        if not os.path.exists(meta_path):
            metadata = StudioProjectMetadata(
                project_id=project_id,
                name=project_id.capitalize()
            )
            self.save_project_metadata(project_id, metadata)
            return metadata

        try:
            with open(meta_path, "r", encoding="utf-8") as f:
                return StudioProjectMetadata.model_validate_json(f.read())
        except Exception as e:
            raise Exception(format_studio_error(StudioErrorType.INTERNAL, f"Failed to load project metadata: {str(e)}"))

    def save_project_metadata(self, project_id: str, metadata: StudioProjectMetadata):
        meta_path = os.path.join(self.base_draft_dir, project_id, ".miaproject")
        try:
            with open(meta_path, "w", encoding="utf-8") as f:
                f.write(metadata.model_dump_json(indent=2))
        except Exception as e:
            raise Exception(format_studio_error(StudioErrorType.FS_ERROR, f"Failed to save metadata: {str(e)}"))

studio_project_service = StudioProjectService()
