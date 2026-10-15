# P35 — отчёт о патче

## Что сделано

- Добавлен `src/workspace/extract.ts`: единый FileContentExtractor для PDF (`unpdf`), DOCX/XLSX/PPTX (`jszip` + XML), CSV/TSV, JSON и обычного текста.
- Классификация: zip с расширением `.docx` / `.xlsx` / `.pptx` → class `office`.
- `readWorkspaceFile` и `buildWorkspaceBlock` используют extract; блоки помечены как DATA (D-07).
- WorkspacePanel: вложения и превью файлов строятся из извлечённого текста; для недекодируемых форматов — честные metadata.
- Секреты по-прежнему не попадают в контекст без явного подтверждения.
- Оригинальные blob не изменяются.
- Тест `tests/workspace-p35.test.mjs` (`npm run test:p35`); версия продукта 35.

## Проверки

- Локально в среде патча: unit-фикстуры extract (CSV, JSON, text, image metadata, minimal DOCX/XLSX, secret block, e2e ingest→read).
- Требуется CI: `npm run test:p35`, `npm run test:p34`, `npm run test:p27`, `npm run typecheck`, `npm run build`, `npm run check`.

## Ограничения

- Изображения: только metadata (vision — отдельный optional path при multimodal-провайдере).
- Сканированные PDF без текстового слоя: metadata + note, без ложного «analysed».
- PPTX поддерживается на уровне extract, но не обязателен в UI-фикстурах.
- ChangeSet / export / серверная версионность — P36–P38.

## Действия Навигатора

1. После зелёного CI: Simple Mode → загрузить PDF с текстом → privacy ack → спросить содержание.
2. Повторить с DOCX и XLSX/CSV.
3. Загрузить изображение: UI и ответ агента не должны утверждать, что содержимое декодировано.
4. Убедиться, что без privacy ack workspace-текст не уходит в запрос.
