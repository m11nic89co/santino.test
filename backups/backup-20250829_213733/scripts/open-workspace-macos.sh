#!/bin/bash
# Script to open the Santino project folder in Finder and open the VS Code workspace.
# Place a shortcut to this script on the Desktop or run it from Terminal.

PROJECT_FOLDER="/Users/alexandrmelnicenco/Library/CloudStorage/GoogleDrive-melalnik@gmail.com/Мой диск/dev/santino"
WORKSPACE_FILE="$PROJECT_FOLDER/santino.code-workspace"

# Open the folder in Finder
open "$PROJECT_FOLDER"

# Small delay to ensure Finder is ready
sleep 0.15

# Open the workspace with Visual Studio Code
if command -v code >/dev/null 2>&1; then
  # Prefer CLI 'code' if installed
  code "$WORKSPACE_FILE" &>/dev/null &
else
  open -a "Visual Studio Code" "$WORKSPACE_FILE"
fi

exit 0
