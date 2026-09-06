"""
Diff Generator

Converts original and modified file content into a git-style unified diff.

Uses Python's standard library difflib.unified_diff.

No LLM required — deterministic, safe operation.

Example:

    original: "pytest\nblack"
    modified: "pytest\nrequests\nblack"

    Output:
    --- requirements.txt
    +++ requirements.txt
    @@ -1,2 +1,3 @@
     pytest
    +requests
     black
"""

import difflib

from backend.schemas.file import File
from backend.schemas.patch import PatchEdit
from backend.patching.patch_validator import PatchValidator



class DiffGenerator:
    """
    Generates git-style unified diffs from file changes.
    """

    def generate(
        self,
        file: File,
        modified_content: str,
    ) -> str:
        """
        Generate a unified diff from original and modified content.

        Args:
            file: The original File object.
            modified_content: The modified file content.

        Returns:
            A git-style unified diff string.

        Raises:
            ValueError: If the original file content is unavailable.
        """

        if file.content is None:
            raise ValueError(
                f"Cannot generate diff for {file.path}: "
                "original file content is unavailable."
            )

        original_lines = file.content.splitlines(keepends=True)
        modified_lines = modified_content.splitlines(keepends=True)

        diff = difflib.unified_diff(
            original_lines,
            modified_lines,
            fromfile=file.path,
            tofile=file.path,
            lineterm="",
        )

        return "\n".join(diff)

    def generate_from_edit(
        self,
        file: File,
        edit: PatchEdit,
    ) -> str:
        """
        Generate a diff for a PatchEdit.

        Applies and validates the edit first, then generates
        a unified diff from the original and modified content.

        Args:
            file: The original File object.
            edit: The PatchEdit to apply.

        Returns:
            A git-style unified diff string.

        Raises:
            ValueError: If the edit is invalid or file content
                is unavailable.
        """


        validator = PatchValidator()
        modified_content = validator.apply(edit, file)

        return self.generate(file, modified_content)