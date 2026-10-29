# P118.4 — Documentation Order — Manual Apply Instructions

This archive contains only documentation and one small guard script.  
There is **no runtime behaviour change**. Apply the files manually, then delete the listed obsolete files if they still exist in your working tree.

## 1. Files to add / overwrite (from this archive)

Copy the following into the **repository root** (or the corresponding paths):

| Archive path                        | Target path in repository          | Action      |
|-------------------------------------|------------------------------------|-------------|
| `TECHNICAL_SPECIFICATION.md`        | `TECHNICAL_SPECIFICATION.md`       | Add / replace |
| `ROADMAP.md`                        | `ROADMAP.md`                       | Add / replace |
| `TECHNICAL_REPORT.md`               | `TECHNICAL_REPORT.md`              | Add / replace |
| `AGENTS.md`                         | `AGENTS.md`                        | Replace     |
| `NEXT_PATCH.md`                     | `NEXT_PATCH.md`                    | Replace     |
| `docs/DOCUMENTATION-INDEX.md`       | `docs/DOCUMENTATION-INDEX.md`      | Replace     |
| `scripts/docs-integrity.mjs`        | `scripts/docs-integrity.mjs`       | Add         |

## 2. Optional but recommended package.json / script wiring

In `package.json`:

- Set `"patch": "118.4"` (keep `"version": "118"`).
- Add to the `"scripts"` section:

```json
"docs:integrity": "node scripts/docs-integrity.mjs"
```

(You can also add the node to your verification DAG later; it is not required for this patch to be useful.)

## 3. Files that should be deleted (if present)

These are obsolete competing or superseded documentation artefacts.  
**Do not delete** anything under `docs/schema-*.json`, generated inventories, or machine-readable verification files.

### Safe to delete (prose only, already superseded)

```
# Per-patch / historical SPECs and REPORTs that were moved into ARCHIVE
# or whose content has been absorbed into the three protected documents.
# Adjust the list to whatever still exists in your tree.

ARCHIVE/P08-SPEC.md
ARCHIVE/P09-SPEC.md
ARCHIVE/P10-SPEC.md
ARCHIVE/P11-SPEC.md
ARCHIVE/P11-REPORT.md
ARCHIVE/P12-SPEC.md
ARCHIVE/P12-REPORT.md
ARCHIVE/P13-SPEC.md
ARCHIVE/P13a-SPEC.md
ARCHIVE/P13b-SPEC.md
ARCHIVE/P13b-REPORT.md
ARCHIVE/P14-SPEC.md
ARCHIVE/P15-REPORT.md
ARCHIVE/P16-SPEC.md
ARCHIVE/P16-REPORT.md
ARCHIVE/P17-SPEC.md
ARCHIVE/BX-06-REPORT.md
ARCHIVE/BX-07-REPORT.md
ARCHIVE/E01-NOTES.md
ARCHIVE/GOLDEN-EVAL-REPORT.md
ARCHIVE/E01-RESULTS.json

# Any other root-level or docs/ files matching these patterns
# that are not the three protected documents and not listed
# in the current DOCUMENTATION-INDEX.md as rolling files:
#   P[0-9]+-SPEC.md
#   P[0-9]+-REPORT.md
#   *-NOTES.md (except operational ones you still need)
```

**Rule of thumb:** if a Markdown file is a one-off patch specification or report and is not referenced from the new `DOCUMENTATION-INDEX.md` or from `AGENTS.md`, it is a candidate for deletion after you have confirmed that any unique content you still need has been transferred into `TECHNICAL_SPECIFICATION.md` / `TECHNICAL_REPORT.md` / `ROADMAP.md`.

Keep:

- All `docs/schema-*.json` and generated `docs/generated-*.json`
- `docs/AI-*.md` rolling files listed in the index
- `docs/architecture-*.md` / `.json`
- `docs/OPERATIONS.md`, `docs/VIX-CONCEPT.md`, etc.
- `CHANGELOG.md`
- Everything under `migrations/`, `tests/`, `src/`, `server/`, `appBuilder/`

## 4. Verification after apply

```bash
node scripts/docs-integrity.mjs
# expected: docs:integrity PASS
```

Then open `NEXT_PATCH.md` and follow the “Next action” section.

## 5. What this patch deliberately does **not** do

- Does not change any TypeScript / React / server code.
- Does not close the P118 exit gate (live Architect ZIP is still outstanding).
- Does not force deletion of `ARCHIVE/`; it only lists candidates. You decide what to keep for local history.

Charter conflicts: none
