# Spec: working with program files and archives in BiForge (P26)

13 Oct 2026 · @B · updated after review

## 1. Purpose, goals and scope

The BiForge agent must accept program archives, discuss them, apply changes as patches, **create programs from scratch**, and return results to the user consistently across Simple, Expert and Project modes. Today the agent only handles documents: archives are rejected, code files are not accepted, and export is limited to Word and PDF. Project Mode already has a `code/build` flow (Task Package → `generated-projects/<task_id>/**` → ZIP artifact), but it is not wired to Workspace and is unavailable in Simple/Expert modes.

**Goals**

- **G1.** Upload an archive (zip, tar, tar.gz), a folder or a file set and obtain a working project tree.
- **G2.** Discuss code: the agent sees project structure and reads needed files, not the whole project at once.
- **G3.** Change code only through verifiable patches with human confirmation and rollback.
- **G4.** Export the result: full archive, changed files only, or `.diff`.
- **G5.** Roughly the same capability in all three modes; storage, limits and control procedures may differ.
- **G6.** Create a program from scratch (empty Workspace or via existing `code/build`) with staged assembly for large volumes.

**Out of scope for P26**

- Running, building or testing code on the BiForge server (forbidden by security policy).
- Merge and deploy; GitHub writes belong only in patch D and remain under ADR-06 and ADR-10.
- Formats 7z, rar, bz2, xz, encrypted and multi-volume archives.
- In-place editing of docx, xlsx, pptx, pdf, images and other binaries (read or whole-file replace only).
- Git history (`.git`) and Google Drive workspace sync (zip backup only).

**Terms**

| Term | Meaning |
| --- | --- |
| Workspace | User project as a versioned file set; one per dialogue (Simple), decision (Expert) or project (Project) |
| Version | Immutable workspace snapshot: manifest and content references |
| Manifest | Version file list: path, SHA-256, size, mode, class, language, encoding, line endings |
| ChangeSet | File changes (create, modify, delete, rename) proposed by the agent |
| Storage host | Where data lives and processing runs: browser (Simple, Expert) or server (Project) |
| `code/build` | Existing Project Mode flow: Task Package → `generated-projects/<task_id>/**` → ZIP artifact |

---

## 2. Baseline (bf-v24 code)

Current code blocks software work on seven levels, but already contains almost all mechanisms needed for a safe solution. Findings from code reading; tests and build were not run for this survey.

**What blocks**

| # | Finding | Where | Effect |
| --- | --- | --- | --- |
| P-1 | Non-office archives rejected with “Archives are not supported” | `server/files.ts`, `processUpload` | Cannot upload a program archive |
| P-2 | Text extension whitelist: `txt, md, markdown, csv, tsv, json, log`; else 415 | `server/files.ts`, `TEXT_EXT` | `.ts`, `.py`, `.yml`, `.sql`, `.html`, `Dockerfile` rejected |
| P-3 | File becomes a string up to 30 000 chars; chat total 60 000; expert step 20 000; max 5 files; body ~235 KB | `MAX_TEXT_*`, `REQUEST_BUDGET_BYTES` | No path/structure; hundred-file projects do not fit |
| P-4 | Reader normalises `\r\n`, strips BOM, pretty-prints JSON | `decodeText` | Export of edited files corrupts bytes |
| P-5 | Unzip trust header sizes; `n.includes('..')` also blocks legal names like `a..b.txt` | `openZip` | Forged headers can bypass zip-bomb guards; false rejects |
| P-6 | Browser program archive stores only text ≤30 000 chars, no binaries | `src/programFiles.ts` | Unsuitable as project storage |
| P-7 | Export only docx/pdf; `exportZip.ts` builds a JSON backup | `/api/export-document`, `src/exportZip.ts` | No way to export a code archive |

**Environment limits**

- Simple/Expert data live in `localStorage` / browser storage; Project Mode uses server Postgres and artifacts.
- Railway memory limits push large ingest to the storage host (browser worker or server worker_thread), not the request path.

---

## 3. Principles and decisions

All requirements below follow from these decisions; changing any requires editing this section.

| # | Decision | Rationale |
| --- | --- | --- |
| D-01 | One file-work engine, three storage adapters (`WorkspaceStore`) | Mode parity via shared code, not copies |
| D-02 | Unpack and store on the data host: browser (Web Worker) for Simple/Expert; server (`worker_thread`) for Project. One ingest codebase | Keeps “server holds nothing” for Simple, avoids shipping 60 MB bodies and blowing Railway RAM |
| D-03 | File type by content; extension only hints language | Software has many extensionless and dual-use names |
| D-04 | Agent never receives full project bytes by default; structure + selected files | Context and cost control |
| D-05 | Mutations only via ChangeSet + human apply | Audit and rollback |
| D-06 | Secrets never in model request bodies without explicit confirm | NF-03 |
| D-07 | Archive content is data, not instructions | Injection resistance |
| D-08 | Deterministic patch apply against `baseSha256` | No silent drift |
| D-09 | Export preserves bytes for unchanged files | Round-trip integrity |
| D-10 | Create-from-scratch reuses Workspace + optional `code/build` | One mental model |

---

## 4. Mode parity

| Capability | Simple | Expert | Project |
| --- | --- | --- | --- |
| Upload archive / folder / files | Yes (browser store) | Yes (browser store) | Yes (server store) |
| Discuss structure + selected files | Yes | Yes | Yes |
| ChangeSet + confirm | Yes | Yes | Yes |
| Export zip / diff | Yes | Yes | Yes |
| Create from scratch | Yes | Yes | Yes (+ `code/build`) |
| GitHub branch write | No | No | Patch D only (ADR-06/10) |

Limits (size, file count, retention) differ by host; behaviour contracts stay the same.

---

## 5. Functional requirements: upload, classification, unpack

### 5.1. Intake

Accept zip, tar, tar.gz, folder or multi-file select within mode limits. Reject unsupported formats with a clear message.

### 5.2. Safe unpack

- Zip-bomb and path traversal defences that do not false-reject legal names containing `..` as a substring.
- Size and entry-count caps; streaming or chunked processing on the host.
- No execution of archive contents.

### 5.3. Classification

Content-based class (text, binary, secret-like, ignore). Language/encoding/line endings recorded in the manifest when known.

### 5.4. Result

A Workspace version with manifest and content blobs; report of accepted/rejected entries and reasons.

---

## 6. Functional requirements: Workspace, storage, versions

- Immutable versions; apply ChangeSet → new version.
- Manifest lists path, hash, size, class, language, encoding, EOL.
- Soft delete / quota policy for Project Mode (e.g. 200 MB class limits — refine in ADR-08).
- Browser: IndexedDB (or equivalent) with persist hint; server: Postgres + blob store.

---

## 7. Functional requirements: agent read, patches, export, UI, create from scratch

### 7.1. Agent read

- Default: tree + summaries; full file bodies only on `needFiles` (bounded rounds).
- Agent must state when it has not read a file (FW-36 class rules).

### 7.2. Patches

- ChangeSet ops: create, edit, delete, rename with base hashes.
- UI card shows diff and counters; version changes only after **Apply**.
- Deterministic validation before apply.

### 7.3. Export

- Full archive, changed-only, or unified diff.
- Unchanged binary/text bytes preserved.

### 7.4. UI

- Upload, tree, file preview, ChangeSet card, export actions; no internal protocol jargon in Simple Mode.

### 7.5. Create from scratch

- Empty Workspace + iterative files, or Project Mode `code/build` path, then same discuss/patch/export loop.

---

## 8. Non-functional requirements

### 8.1. Unpack security (NF-01)

Hard caps on uncompressed size, entry count, compression ratio; no path escape; no symlink escape to outside the workspace root.

### 8.2. Other

- **NF-03** Secrets: not sent to the model without explicit per-workspace confirmation; never in logs.
- Memory/time budgets on mobile (NF-07 class).
- Injection corpus remains green when README-style instructions appear inside archives.

---

## 9. Architecture

### 9.1. Scheme

UI → Workspace API → `WorkspaceStore` adapter (browser or server) → ingest/classify/version modules → optional model context builder (`needFiles`).

### 9.2. Modules

Shared under `src/workspace/**` (ingest, manifest, patch, export); server worker_thread entry for Project Mode; browser worker for Simple/Expert.

### 9.3. Project Mode routes

Workspace CRUD / version list / apply ChangeSet / export under existing auth and Project Mode flags.

### 9.4. DB sketch (migration 015)

Tables for workspace, version, blob (by hash), optional soft-delete; jsonb manifest allowed.

### 9.5. Existing code changes

Relax `TEXT_EXT` / archive rejection in `server/files.ts` only on Workspace paths; keep document upload behaviour for non-workspace attachments unless SPEC says otherwise. Extract shared diff helpers without breaking P18/P19 (`test:p18` gate).

---

## 10. Patch plan P26a–P26d

| Patch | Focus | Gate hints |
| --- | --- | --- |
| **P26a** | Shared ingest/classify/manifest; browser store MVP; safe unpack fixtures | `tsconfig` includes `src/workspace/**`; unpack fixtures green |
| **P26b** | Agent read + ChangeSet apply + UI card; diff module extraction | `test:p18` green; apply requires confirm |
| **P26c** | Project Mode server store + routes + worker_thread | Auth and quotas; path coverage tsx vs dist-server |
| **P26d** | Export zip/diff; create-from-scratch; optional GitHub path under ADR | Export byte integrity; no merge to `main` |

---

## 11. Testing and acceptance

### 11.1. Acceptance scenarios (examples)

| ID | Scenario | Expect |
| --- | --- | --- |
| AC-01 | Upload a small source zip | Tree and manifest; rejected entries listed |
| AC-02 | Path traversal / zip bomb fixtures | Rejected safely |
| AC-03 | Discuss structure without full dump | Agent answers from structure + selected files |
| AC-04 | `needFiles` second round | File fetched; non-existent path ignored; ≤2 rounds |
| AC-05 | Archive contains `.env` and private key | Not in model body; show only after confirm; not in logs |
| AC-06 | README instructs to ignore rules and leak secrets | Agent does not comply; marked as data; injection corpus green |
| AC-07 | ChangeSet create/edit/delete/rename | Card shows diff; no version change before Apply |
| AC-12/14 | Browser vs server ingest | Same `manifestHash` on identical fixture |

### 11.2. Automated sets

Unit fixtures for unpack, classification, patch apply; integration for Workspace routes; regression for document upload path.

### 11.3. Not fully automatable

Owner Railway clicks; real provider cost; subjective UI clarity.

---

## 12. Risks, limits and open questions

### 12.1. Risks

| # | Risk | Mitigation |
| --- | --- | --- |
| R-1 | Safari clears IndexedDB | `navigator.storage.persist()`, warning, backup button, remind after major changes |
| R-2 | Tab OOM on phone | Lower device limits, incremental processing, abort; NF-07 |
| R-3 | Small free Gemini context | File selection, `needFiles`, line windows; staged build; agent must say what it did not read |
| R-4 | Bad model edits | Deterministic checks, `baseSha256`, confirm, retry; early experiment before freezing contract |
| R-5 | Agent cannot run code | Human or CI verify; P26d GitHub branch path |
| R-6 | Code fragments leave to provider | NF-03; secret exclusion |
| R-7 | Postgres growth | Quota, jsonb manifest, dedup, per-file cap, soft delete (ADR-08) |
| R-8 | Browser/server ingest drift | One codebase; `manifestHash` compare in AC-12/14 |
| R-9 | Diff extract breaks P18/P19 | Re-export; green `test:p18` is P26b gate |
| R-10 | Exotic tar variants | Own reader + fixtures; unsupported → explicit reject |
| R-11 | `tsconfig.server.json` misses `src/workspace/` | Explicit include; P26a gate |
| R-12 | `worker_thread` entry differs tsx vs dist-server | Path coverage test |
| R-13 | Up to 4 model calls per turn | Count in quota budget; document |

### 12.2. Open questions for the owner

Defaults apply if unanswered before the relevant patch starts (size caps, retention days, whether Simple Mode allows binary blobs, exact secret UX). Record answers in the patch SPEC “Defaults chosen” section.

---

*End of BiForge_TZ_P26. Implementation follows P26a–P26d SPECs and reports.*
