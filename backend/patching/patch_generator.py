"""
Patch Generator Interface

Diagnosis → PatchEdit (via LLM)

The generator receives:
1. A structured Diagnosis (what failed and why)
2. The raw failure_reason (for context)
3. A list of File objects (what exists in the repo)

It returns a single PatchEdit proposing a targeted fix.

Important:
The LLM does NOT modify the repository.
The generator only proposes the edit.
SpriteSRE validates, applies, and generates the diff.
"""

from abc import ABC, abstractmethod

from backend.schemas.file import File
from backend.schemas.diagnosis import Diagnosis
from backend.schemas.patch import PatchEdit

class PatchGenerator(ABC):
    """
    Abstract base class for patch generation.
    
    Subclasses implement different LLM providers (Gemini, Claude, etc.).
    """

    @abstractmethod
    async def generate(
        self,
        diagnosis: Diagnosis,
        failure_reason: str,
        files: list[File],
    ) -> PatchEdit:
        """
        Generate a patch edit to fix a diagnosed failure.   
        
        Args:
            diagnosis: The structured diagnosis of the failure
            failure_reason: Raw error text from CI/CD logs (for context)
            files: List of File objects representing the repository
        
        Returns:
            A PatchEdit proposing a targeted fix
        
        Raises:
            ValueError: If the LLM response is invalid or unparseable
            Exception: If the API call fails
        
        Note:
            This does NOT modify the repository.
            SpriteSRE receives the edit, validates it, applies it,
            and generates a diff for the pull request.
        """
        pass