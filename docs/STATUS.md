# BiForge — STATUS

> Единственный живой файл прогресса. Обновлено: 2026-10-16 · **v47; B-AUDIT.2 — audit files in ARCHIVE/ (flat)**

## 1. Сейчас

| Линия | Состояние |
| --- | --- |
| **Version** | **47** |
| **UI1 / P47** | Mode controls only in More |
| **QA1** | Offline 12/12 PASS |
| **CI** | B-AUDIT.2: audit artifacts in `ARCHIVE/` (flat). **Delete** residual `AUDIT/` and `docs/AUDIT/` if present. Expect p13a green. |
| **Поставка** | Deploy v47 — owner |

## Аудит

- **B-AUDIT.2:** `docs/AUDIT/*` → `ARCHIVE/bf_v40_*` (preflight forbids nested under `docs/`).
- **B-AUDIT:** version 40→47; first move to docs/AUDIT was insufficient.
- Export UX: EN deferred.

## 2. Следующее

| # | ID | Что | Owner |
| --- | --- | --- | --- |
| 1 | **CI** | Confirm green after B-AUDIT.2 | Owner (log) |
| 2 | **Deploy** | v47 staging | Owner |
| 3 | **MANUAL1** | Acceptance | Owner |

## 3. Нельзя без команды

Server execution; silent GitHub main; GitHub App write.

## 4. Открытые вопросы

1. UX1 approved.
2. Export UX: **closed** — EN until separate patch.

*STATUS*
