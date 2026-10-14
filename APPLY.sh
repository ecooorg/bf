#!/usr/bin/env bash
set -euo pipefail
cd "$(dirname "$0")"
fail=0
ok() { echo "OK  $1"; }
bad() { echo "FAIL $1"; fail=1; }
grep -q 'aria-label="Gemini API key"' src/App.tsx && ok "App Gemini aria-label" || bad "App Gemini aria-label"
grep -q 'Enter the password to open this app' src/App.tsx && ok "App login copy" || bad "App login copy"
grep -q 'activeTab' src/ProjectMode.tsx && ok "PM tabs" || bad "PM tabs"
grep -q 'Create a small program' src/ProjectMode.tsx && ok "PM Create program" || bad "PM Create program"
grep -q 'Google AI key' tests/ui-check.mjs && ok "ui-check accepts Google AI key" || bad "ui-check"
grep -q "lazy(() => import('./ProjectMode" src/main.tsx && ok "main code-split" || bad "main code-split"
[ "$fail" -eq 0 ] || exit 1
echo "Ready to commit."
