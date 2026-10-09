# BX-01 — Baseline and repository foundation

## Scope
- Keep existing Simple Mode behavior unchanged.
- Record known baseline test failures without hiding or weakening tests.
- Align development docs with `docs/BiForge_TZ_v3_ru.md`.
- Keep step records flat in `docs/`, alongside `BIFORGE-STATE.json`, `connectors.yaml`, and `docs/CONNECTIONS.md`.

## Acceptance
- Canonical spec links point to `docs/BiForge_TZ_v3_ru.md`.
- Connection manifest and human-readable connection guide exist and explicitly distinguish configured from unverified services.
- Known `virtual-stage2` failures remain visible in the state record.

## Status
PARTIAL: BX-01.b scaffolding implemented. BX-01.a test baseline is not fully green; known J3 bad-JSON retry failures are recorded rather than suppressed.
