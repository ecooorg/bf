#!/usr/bin/env bash
# Virtual tests: the real server.ts against a fake Gemini. No API key, no internet.
set -e
cd "$(dirname "$0")/.."
tsx tests/server.test.mjs
tsx tests/infra.test.mjs
tsx tests/v17.test.mjs
tsx tests/regression.test.mjs
tsx tests/perf.test.mjs
tsx tests/virtual-files.test.mjs
tsx tests/expert-files.test.mjs
tsx tests/stage2.test.mjs
