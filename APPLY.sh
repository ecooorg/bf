#!/usr/bin/env bash
# Apply UI polish patch and verify files actually changed.
set -euo pipefail
ROOT="$(cd "$(dirname "$0")" && pwd)"
cd "$ROOT"

if [ ! -f src/App.tsx ] || [ ! -f src/ProjectMode.tsx ]; then
  echo "ERROR: run this from the bf-main repo root (src/App.tsx must exist)"
  exit 1
fi

echo "== Before =="
grep -n "Access password\|Welcome screen\|activeTab\|JSON state\|Project description\|if (!privacy)" src/App.tsx src/ProjectMode.tsx 2>/dev/null | head -20 || true

cp -f "$ROOT/src/App.tsx" "$ROOT/src/App.tsx.bak-ui-polish" 2>/dev/null || true
cp -f "$ROOT/src/ProjectMode.tsx" "$ROOT/src/ProjectMode.tsx.bak-ui-polish" 2>/dev/null || true

# Files are already at src/ inside the zip when extracted at repo root
# This script is meant to live at repo root after unzip of the patch package

echo ""
echo "== Checking markers in current tree =="
fail=0
if grep -q "Access password" src/App.tsx; then echo "FAIL App still has Access password"; fail=1; else echo "OK App: Access password gone"; fi
if grep -q "if (!privacy)" src/App.tsx; then echo "FAIL App still has privacy gate"; fail=1; else echo "OK App: privacy gate removed"; fi
if grep -q "Enter the password to open this app" src/App.tsx; then echo "OK App: new login copy"; else echo "FAIL App missing new login copy"; fail=1; fi
if grep -q "activeTab" src/ProjectMode.tsx; then echo "OK PM: activeTab (tabs)"; else echo "FAIL PM missing tabs"; fail=1; fi
if grep -q "Data · for developers" src/ProjectMode.tsx; then echo "OK PM: developer data tab"; else echo "FAIL PM missing data tab"; fail=1; fi
if grep -q "Create a small program" src/ProjectMode.tsx; then echo "OK PM: Create program"; else echo "FAIL PM missing Create program"; fail=1; fi
if grep -q "JSON state" src/ProjectMode.tsx; then echo "FAIL PM still has JSON state on main UI"; fail=1; else echo "OK PM: JSON state not on main UI"; fi
if grep -q "Task Graph" src/ProjectMode.tsx; then echo "FAIL PM still has Task Graph"; fail=1; else echo "OK PM: Task Graph gone"; fi

if [ "$fail" -ne 0 ]; then
  echo ""
  echo "Patch files are NOT in place. Extract the zip at repo root:"
  echo "  unzip -o ui-polish-all-screens-v2.zip"
  echo "Then re-run: bash APPLY.sh"
  exit 1
fi

echo ""
echo "All markers OK. Next:"
echo "  git add src/App.tsx src/ProjectMode.tsx src/en.ts src/ConversationFiles.tsx"
echo "  git status"
echo "  git commit -m \"UI: skip Welcome, human labels, Project Mode tabs + Create program\""
echo "  git push"
echo "Wait for CI build + Railway deploy, then hard-refresh the browser (cache)."
