#!/usr/bin/env bash
# Virtual tests: real server.ts against fake Gemini. No API key or internet required.
# Run every suite even if an earlier suite fails; return non-zero at the end.
set +e
cd "$(dirname "$0")/../.." || exit 2

failed=0
suites=(server infra v17 regression perf files expert-files stage2)
for suite in "${suites[@]}"; do
  printf "\n===== virtual/%s.test.mjs =====\n" "$suite"
  npx --no-install tsx "tests/virtual/${suite}.test.mjs"
  code=$?
  if [ "$code" -eq 0 ]; then
    echo "[PASS] virtual/${suite}"
  else
    echo "[FAIL] virtual/${suite} (exit $code)"
    failed=1
  fi
done

if [ "$failed" -ne 0 ]; then
  echo "One or more virtual suites failed. See suite output above."
  exit 1
fi
echo "All virtual suites passed."
