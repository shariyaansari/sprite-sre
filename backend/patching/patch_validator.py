"""
Patch Validator

Before applying an edit, we must verify:
1. The target file matches the edit
2. The file content is available
3. The find text exists in the file
4. The find text occurs exactly once
5. The replacement would produce different content

This prevents:
- Editing the wrong file
- Trying to modify a file without its content
- Accidentally modifying multiple occurrences
- No-op edits
"""

from backend.schemas.file import File
from backend.schemas.patch import PatchEdit


class PatchValidator:
    """
    Validates a PatchEdit against the actual file content before application.
    """

    def validate(self, edit: PatchEdit, file: File) -> None:
        """
        Validate that a PatchEdit is safe to apply.

        Args:
            edit: The PatchEdit to validate.
            file: The File to apply the edit to.

        Raises:
            ValueError: If validation fails.
        """

        # Check 1: file path matches
        if file.path != edit.file_path:
            raise ValueError(
                f"File path mismatch: edit targets {edit.file_path}, "
                f"but received {file.path}"
            )

        # Check 2: file content is available
        if file.content is None:
            raise ValueError(
                f"Cannot validate patch for {edit.file_path}: "
                "file content is unavailable."
            )

        # Check 3: find text exists
        if edit.find not in file.content:
            raise ValueError(
                f"Patch target not found in {edit.file_path}. "
                f"Expected to find: {edit.find!r}"
            )

        # Check 4: find text occurs exactly once
        matches = file.content.count(edit.find)

        if matches != 1:
            raise ValueError(
                f"Expected exactly one patch target in {edit.file_path}, "
                f"found {matches} occurrences."
            )

        # Check 5: replacement would produce different content
        modified_content = file.content.replace(edit.find, edit.replace)

        if modified_content == file.content:
            raise ValueError(
                f"Patch for {edit.file_path} would produce no change. "
                "Find and replace are identical."
            )

    def apply(self, edit: PatchEdit, file: File) -> str:
        """
        Validate and apply a PatchEdit to file content.

        Args:
            edit: The PatchEdit to apply.
            file: The File containing the original content.

        Returns:
            The modified file content.

        Raises:
            ValueError: If validation fails.
        """

        self.validate(edit, file)

        # validate() guarantees content is not None.
        return file.content.replace(edit.find, edit.replace)