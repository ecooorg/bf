#!/usr/bin/env bash
set -euo pipefail
cd "$(dirname "$0")"
head -1 README.md | grep -q 'v24' && echo "OK README title has v24" || { echo "FAIL README"; exit 1; }
grep -q 'persisted.ok === false' src/WorkspacePanel.tsx && echo "OK WorkspacePanel narrow" || { echo "FAIL WorkspacePanel"; exit 1; }
echo "Ready: git add README.md src/WorkspacePanel.tsx && commit && push"
