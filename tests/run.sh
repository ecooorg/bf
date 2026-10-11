#!/usr/bin/env bash
# Virtual tests: the real server.ts against a fake Gemini. No API key, no internet.
# Every file has a time limit (VIRTUAL_TEST_TIMEOUT seconds, default 180) and runs even if an earlier one failed; the exit code is 1 if any failed.
cd "$(dirname "$0")/.."
LIMIT="${VIRTUAL_TEST_TIMEOUT:-180}"
FAILED=0
run() {
  timeout -k 5 "$LIMIT" tsx "$1"
  local code=$?
  if [ "$code" -ne 0 ]; then
    if [ "$code" -eq 124 ] || [ "$code" -eq 137 ]; then echo "TIMEOUT after ${LIMIT}s: $1" >&2; else echo "FAILED (exit $code): $1" >&2; fi
    FAILED=1
  fi
}
run tests/bx06-runtime.test.mjs
run tests/server.test.mjs
run tests/infra.test.mjs
run tests/v17.test.mjs
run tests/regression.test.mjs
run tests/perf.test.mjs
run tests/virtual-files.test.mjs
run tests/expert-files.test.mjs
run tests/stage2.test.mjs
exit "$FAILED"
