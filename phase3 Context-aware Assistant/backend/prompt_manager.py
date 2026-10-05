"""
Prompt Manager: Manages versioned system prompts loaded from files.
Strictly validates that requested prompt versions match the active user role.
"""

import os
import re
from pathlib import Path
from typing import Dict, List, Optional
from .config import PROMPTS_DIR, ROLE_CUSTOMER, ROLE_SUPPORT_AGENT

class PromptVersion:
    def __init__(self, version_id: str, role: str, description: str, content: str, file_path: str):
        self.version_id = version_id
        self.role = role
        self.description = description
        self.content = content
        self.file_path = file_path

    def to_dict(self) -> Dict:
        return {
            "version_id": self.version_id,
            "role": self.role,
            "description": self.description,
            "content": self.content,
            "file_name": os.path.basename(self.file_path)
        }

class PromptManager:
    def __init__(self, prompts_dir: Path = PROMPTS_DIR):
        self.prompts_dir = prompts_dir
        self.prompts: Dict[str, PromptVersion] = {}
        self.load_prompts()

    def load_prompts(self):
        """Scans the prompts directory and parses all versioned prompt files."""
        self.prompts.clear()
        if not self.prompts_dir.exists():
            self.prompts_dir.mkdir(parents=True, exist_ok=True)
            return

        for file_path in self.prompts_dir.glob("*.txt"):
            try:
                raw_text = file_path.read_text(encoding="utf-8")
                version_id = file_path.stem  # e.g., customer_v1.0

                # Extract header metadata if present
                version_match = re.search(r"\[VERSION:\s*([^\]]+)\]", raw_text)
                if version_match:
                    version_id = version_match.group(1).strip()

                desc_match = re.search(r"\[DESCRIPTION:\s*([^\]]+)\]", raw_text)
                description = desc_match.group(1).strip() if desc_match else "Standard Prompt"

                clean_content = re.sub(r"\[(VERSION|ROLE|DESCRIPTION):[^\]]+\]\s*", "", raw_text).strip()

                # Normalize role
                normalized_role = ROLE_CUSTOMER if "customer" in file_path.name.lower() else ROLE_SUPPORT_AGENT

                self.prompts[version_id] = PromptVersion(
                    version_id=version_id,
                    role=normalized_role,
                    description=description,
                    content=clean_content,
                    file_path=str(file_path)
                )
            except Exception as e:
                print(f"Error reading prompt file {file_path}: {e}")

    def is_prompt_allowed_for_role(self, version_id: str, role: str) -> bool:
        """Verifies if the specified prompt version is authorized for the given role."""
        if not version_id or version_id not in self.prompts:
            return False
        return self.prompts[version_id].role == role

    def get_prompt(self, role: str, version_id: Optional[str] = None) -> PromptVersion:
        """
        Returns the requested prompt version IF it matches the role.
        Enforces: Customer -> customer_v1.0/v2.0; Support Agent -> agent_v1.0/v2.0.
        Safely falls back to default role prompt if invalid version requested.
        """
        if version_id and version_id in self.prompts:
            candidate = self.prompts[version_id]
            # Role validation: customer cannot use agent prompt and vice-versa
            if candidate.role == role:
                return candidate
            else:
                print(f"[PromptManager] Mismatch: version '{version_id}' belongs to role '{candidate.role}', but active role is '{role}'. Falling back to default.")

        # Default fallback by role
        default_version = "customer_v1.0" if role == ROLE_CUSTOMER else "agent_v1.0"
        if default_version in self.prompts:
            return self.prompts[default_version]

        for p in self.prompts.values():
            if p.role == role:
                return p

        return PromptVersion(
            version_id="fallback_v1",
            role=role,
            description="Fallback Prompt",
            content=f"You are a helpful support assistant for role: {role}.",
            file_path="inline"
        )

    def list_prompts(self, role: Optional[str] = None) -> List[Dict]:
        """Returns all loaded prompt versions, optionally filtered by role."""
        if role:
            return [p.to_dict() for p in self.prompts.values() if p.role == role]
        return [p.to_dict() for p in self.prompts.values()]

# Global singleton
prompt_manager = PromptManager()
