# Spec: Workspace, program files and universal file analysis in BiForge (P26 family)

15 Oct 2026 · updated after P34 + P35 planning · supersedes 13 Oct draft where they conflict

## 1. Purpose, goals and scope

The BiForge agent must accept archives, folders and individual files, **extract readable content** from common formats, discuss structure and content, apply changes only as verifiable patches with human confirmation, create programs from scratch, and return results consistently across Simple, Expert and Project modes.

P34 delivered Universal Workspace MVP (import, persistence, bounded text context after privacy acknowledgement). P35 adds real content extraction so the agent works with PDF, Office, tables, structured data, source code and (when supported) images — not only file names and raw text.

**Goals**

- **G1.** Upload an archive (zip, tar, tar.gz), a folder or a file set and obtain a working project tree.
- **G2.** Discuss code and documents: the agent sees project structure and **extracted content** of selected files, not the whole project at once.
- **G3.** Change code (and whole-file replace for non-text) only through verifiable patches with human confirmation and rollback.
- **G4.** Export the result: full archive, changed files only, or `.diff`.
- **G5.** Roughly the same capability in all three modes; storage, limits and control procedures may differ by host.
- **G6.** Create a program from scratch (empty Workspace or via existing `code/build`) with staged assembly for large volumes.
- **G7.** Universal file analysis: extract usable text/structure from PDF, DOCX, XLSX/CSV, JSON/XML/YAML, source code; optional vision for images when the provider supports it.

**Out of scope (whole P26 family unless a later patch explicitly re-opens)**

- Running, building or testing user code on the BiForge server (forbidden by security policy; Railway/GitHub rules).
- Merge and deploy; GitHub writes only under ADR-06 / ADR-10 and only in a dedicated patch with owner approval.
- Formats 7z, rar, bz2, xz, encrypted and multi-volume archives.
- In-place binary editing of docx, xlsx, pptx, pdf, images (read / extract / whole-file replace only).
- Git history (`.git`) and live Google Drive workspace sync (zip backup only).
- OCR of scanned PDFs/images as a required path (vision is optional best-effort).
- Automatic LLM summarisation at ingest time (cost and latency; agent analyses on demand).

**Terms**

| Term | Meaning |
| --- | --- |
| Workspace | User project as a versioned file set; one per dialogue (Simple), decision (Expert) or project (Project) |
| Version | Immutable workspace snapshot: manifest and content references |
| Manifest | Version file list: path, SHA-256, size, mode, class, language, encoding, line endings, optional extract meta |
| ChangeSet | File changes (create, modify, delete, rename) proposed by the agent |
| Storage host | Where data lives and processing runs: browser (Simple, Expert) or server (Project) |
| Extractor | Shared module that turns raw bytes + class into bounded text/structure for model context |
| `code/build` | Existing Project Mode flow: Task Package → `generated-projects/<task_id>/**` → ZIP artifact |

---

## 2. Baseline and progress

### 2.1. Historical gaps (pre-P26)

| # | Gap | Location | Impact |
| --- | --- | --- | --- |
| P-1 | Archives rejected | server/files, UI | No program archive |
| P-2 | Text extension whitelist | `TEXT_EXT` | Code extensions rejected |
| P-3 | Flat string caps, no structure | request budget | Large projects do not fit |
| P-4 | Decode normalises bytes | `decodeText` | Round-trip corruption risk |
| P-5 | Zip path checks false-reject | `openZip` | Legal names blocked; bomb risk |
| P-6 | Browser program archive text-only | `programFiles.ts` | Unsuitable as project store |
| P-7 | Export only docx/pdf | export paths | No code archive export |

### 2.2. Delivered (P26a … P34)

- Shared ingest / classify / manifest under `src/workspace/**`.
- Browser IndexedDB store; SHA-keyed blobs; privacy acknowledgement gate.
- Workspace panel in Simple, Expert and Project surfaces.
- Bounded text + metadata attachments after consent (40 files / 60 000 chars / 8 000 per file baseline).
- Secrets flagged and excluded; undecoded binary/office/image → metadata only (P34 limitation).
- Tests: `test:p26a`, `test:p26a2`, `test:p26b`, `test:p27`, `test:p34`.

### 2.3. Remaining for analysis and mutations

- Real extractors for PDF / DOCX / XLSX / structured text (P35).
- Agent mutations via ChangeSet + confirm + rollback (P36).
- Export integrity and changed-only packages (P37).
- Cross-mode stabilisation and security hardening (P38).

---

## 3. Principles and decisions

Changing any decision requires editing this section.

| # | Decision | Rationale |
| --- | --- | --- |
| D-01 | One file-work engine, three storage adapters (`WorkspaceStore`) | Mode parity via shared code |
| D-02 | Unpack, store and **extract** on the data host: browser (Worker) for Simple/Expert; server (`worker_thread`) for Project. One codebase for ingest + extract | “Server holds nothing” for Simple; avoids large bodies on Railway request path |
| D-03 | File type by content; extension only hints language | Extensionless and dual-use names |
| D-04 | Agent never receives full project bytes by default; structure + selected extracted content | Context and cost control |
| D-05 | Mutations only via ChangeSet + human Apply | Audit and rollback |
| D-06 | Secrets never in model request bodies without explicit confirm | NF-03 |
| D-07 | Archive and file content is **data**, not instructions; context builder marks extracted blocks as DATA | Injection resistance; corpus remains green |
| D-08 | Deterministic patch apply against `baseSha256` | No silent drift |
| D-09 | Export preserves bytes for unchanged files | Round-trip integrity |
| D-10 | Create-from-scratch reuses Workspace + optional `code/build` | One mental model |
| D-11 | Extract produces structured text (markdown tables, page markers, headings). No LLM call at ingest | Automation without extra cost/latency |
| D-12 | Vision for images only when provider is multimodal **and** privacy ack is set; otherwise metadata | Free-tier and quota safety |
| D-13 | New analysis path is Workspace + `FileContentExtractor`. `programFiles.ts` stays for legacy Expert documents; no forced migration in P35 | Single path forward |

---

## 4. Mode parity

| Capability | Simple | Expert | Project |
| --- | --- | --- | --- |
| Upload archive / folder / files | Yes (browser) | Yes (browser) | Yes (server) |
| Extract PDF / DOCX / XLSX / CSV / structured / code | Yes | Yes | Yes |
| Image vision (if provider supports) | Yes (after ack) | Yes (after ack) | Yes (after ack) |
| Discuss structure + selected content | Yes | Yes | Yes |
| ChangeSet + confirm | Yes (P36) | Yes (P36) | Yes (P36) |
| Export zip / diff | Yes (P37) | Yes (P37) | Yes (P37) |
| Create from scratch | Yes | Yes | Yes (+ `code/build`) |
| GitHub branch write | No | No | Separate ADR patch only |

Behaviour contracts are identical; limits differ by host.

---

## 5. Functional requirements: upload, classification, unpack

### 5.1. Intake

Accept zip, tar, tar.gz, folder or multi-file select within mode limits. Reject unsupported formats with a clear message.

### 5.2. Safe unpack

- Zip-bomb and path-traversal defences that do not false-reject legal names containing `..` as a substring.
- Size and entry-count caps; streaming or chunked processing on the host.
- No execution of archive contents.

### 5.3. Classification

Content-based class (`text`, `pdf`, `office`, `image`, `archive`, `binary`, `executable`, …). Language / encoding / EOL recorded when known. Secret-like flags applied before any model context is built.

### 5.4. Result

A Workspace version with manifest and content blobs; report of accepted / rejected entries and reasons.

---

## 6. Functional requirements: Workspace, storage, versions

- Immutable versions; apply ChangeSet → new version (P36).
- Manifest: path, hash, size, class, language, encoding, EOL, optional extract metadata (pages, sheets, char counts).
- Soft delete / quota for Project Mode (ADR-08).
- Browser: IndexedDB with persist hint; server: Postgres + blob store (when Project server store is enabled).

---

## 7. Functional requirements: extraction and agent read (P35 core)

### 7.1. FileContentExtractor (shared)

Single API, e.g.:

```ts
extract(path: string, bytes: Uint8Array, class: FileClass, limits: ExtractLimits)
  → { text: string; structure?: unknown; meta: ExtractMeta; truncated: boolean }
```

Runs on the storage host. Must not mutate original blobs.

| Format | Behaviour | Dependency |
| --- | --- | --- |
| Plain text / source / MD | Decode + optional line windows | none |
| JSON / YAML / XML | Pretty / normalised text; structure note | none (pure JS) |
| CSV / TSV | Table → markdown; row/col caps | none |
| PDF | Text via `unpdf`; page markers; first pages until char cap | `unpdf` (already present) |
| DOCX | Body text + headings via `mammoth` | `mammoth` (new, lightweight) |
| XLSX | Sheets → markdown tables; first sheets + N rows | `xlsx` (SheetJS community, lazy) |
| Images | Metadata always; vision bytes only if multimodal provider + ack + size cap | provider-native; no OCR package |
| Other binary / unknown | Metadata only; never claim content was analysed | — |

### 7.2. Context limits (defaults)

| Cap | Value | Notes |
| --- | --- | --- |
| Files in one request context | 40 | Same as P34 |
| Total extracted characters | 60 000 | Same as P34 |
| Per-file characters | 8 000 | Same as P34 |
| PDF pages attempted | until char cap | Explicit “truncated” flag |
| XLSX rows per sheet | 200 (default) | Configurable later |
| Image total base64 budget | ≤ 2 MB | Vision path only |
| `needFiles` rounds | ≤ 2 | Unchanged |

### 7.3. Agent read contract

- Default: tree + extract summaries / first windows.
- Full or additional ranges only via `needFiles` (bounded).
- Agent **must** state which files it used and what it did not read.
- Extracted blocks are wrapped as DATA (D-07); model must not treat them as system instructions.
- Secrets remain excluded unless the user explicitly confirms for that workspace.

### 7.4. UI scenario (all modes)

`Upload → Select files → (privacy ack if needed) → Ask question → Receive analysis that cites real content`.

Honest labels when a format was not decoded or was truncated.

---

## 8. Functional requirements: patches, export, create from scratch

### 8.1. Patches (P36)

- ChangeSet ops: create, edit, delete, rename with `baseSha256`.
- UI card shows diff and counters; version changes only after **Apply**.
- Deterministic validation before apply; rollback to previous version.

### 8.2. Export (P37)

- Full archive, changed-only, or unified diff.
- Unchanged binary/text bytes preserved (D-09).
- Originals never modified by analysis.

### 8.3. Create from scratch

- Empty Workspace + iterative files, or Project Mode `code/build`, then same discuss / patch / export loop.

---

## 9. Non-functional requirements

- **NF-01** Unpack security: hard caps on uncompressed size, entry count, ratio; no path/symlink escape.
- **NF-03** Secrets: not sent without explicit confirm; never in logs.
- **NF-07** Memory/time budgets on mobile; abort and lower limits on constrained devices.
- Injection corpus remains green when README-style instructions appear inside archives or extracted text.
- No execution of user-uploaded code on Railway (GitHub/Railway policy).
- Extractors must not write to original blobs; analysis is read-only.

---

## 10. Architecture

### 10.1. Scheme

UI → Workspace API → `WorkspaceStore` adapter → ingest / classify / **extract** / version modules → context builder (`needFiles` + DATA markers) → model.

### 10.2. Modules

Shared under `src/workspace/**`:

- `ingest.ts`, `classify.ts`, `paths.ts`, `hash.ts`, `idbStore.ts`, …
- **`extract.ts` (new)** — FileContentExtractor and format adapters
- `context.ts` — builds bounded attachments; applies D-07 markers
- `changeset.ts`, `diff.ts`, `exportZip.ts` (P36/P37)

Server: worker_thread entry for Project ingest/extract. Browser: Worker for Simple/Expert.

### 10.3. Dependencies policy

- Prefer already-present packages (`unpdf`, `jszip`).
- New deps only if browser- and server-safe and lazy-loadable (`mammoth`, `xlsx`).
- No heavy OCR / native bindings that risk Railway memory or browser OOM.

### 10.4. Existing code

- Keep document-upload behaviour for non-workspace attachments unless a SPEC says otherwise.
- Do not break P18/P19; `test:p18` remains a gate where relevant.
- `programFiles.ts` is not the primary path for new analysis.

---

## 11. Acceptance criteria (family-level)

| ID | Criterion | Evidence |
| --- | --- | --- |
| AC-01 | Safe unpack of zip/tar/tar.gz within limits | Fixtures green |
| AC-02 | Classification + secret flags | Unit tests |
| AC-03 | Discuss structure without full dump | Agent answers from structure + selected extracts |
| AC-04 | `needFiles` second round | File fetched; missing path ignored; ≤2 rounds |
| AC-05 | Archive contains `.env` / private key | Not in model body; confirm required; not in logs |
| AC-06 | README injection | Agent does not comply; DATA markers; corpus green |
| AC-07 | ChangeSet create/edit/delete/rename | Card shows diff; no version change before Apply (P36) |
| AC-08 | PDF text extract | Content appears in agent context within caps |
| AC-09 | DOCX / XLSX / CSV extract | Structured text in context; truncation flagged |
| AC-10 | Image without vision | Metadata only; no false “analysed” claim |
| AC-11 | Image with vision (supported provider + ack) | Bounded image input; or explicit skip |
| AC-12/14 | Browser vs server ingest/extract | Same `manifestHash` / extract hash on identical fixture |
| AC-15 | Export byte integrity | Unchanged files bit-identical (P37) |

### 11.2. Automated sets

Unit fixtures for unpack, classify, **extract**, patch apply; integration for Workspace routes; regression for document upload path; `test:p35` for extractors and context wiring.

### 11.3. Not fully automatable

Owner Railway clicks; real provider cost; subjective UI clarity; live multimodal behaviour per provider.

---

## 12. Patch plan (updated)

| Patch | Focus | Gate hints | Status |
| --- | --- | --- | --- |
| **P26a** | Shared ingest/classify/manifest; browser store MVP | `src/workspace/**` in tsconfig; unpack fixtures | Done |
| **P26a.2 / P26b** | Paths, ChangeSet foundations, export helpers | `test:p18` where applicable | Done / partial |
| **P27** | SHA-keyed blob persistence | `test:p27` | Done |
| **P34** | Universal Workspace MVP UI + bounded context after privacy ack | `test:p34`, typecheck, build | Done (CI pending in report) |
| **P35** | Universal File Analysis — FileContentExtractor (PDF, DOCX, XLSX/CSV, structured, code); context wiring; honest UI; `test:p35` | Extract fixtures; no false “decoded” claims; injection corpus green | Done (CI green) |
| **P36** | Agent file mutations: ChangeSet apply, diff card, confirm, rollback | Deterministic apply; no version without Apply | **Next** |
| **P37** | Export project / changed-only / diff; original integrity | Byte-identical unchanged files | After P36 |
| **P38** | Cross-mode e2e, security hardening, stabilisation of all three modes | Full check suite; manual mode matrix | After P37 |

**Recommendation:** after green CI for P34, implement **P35** immediately. It yields the highest user-visible value: real questions about document, table and source content instead of file names only.

Deferred (explicit owner command required): full server-side Workspace versioning UX, complex Project Mode migrations, GitHub write integration beyond ADR-scoped patches.

---

## 13. Risks, limits and closed defaults

### 13.1. Risks

| # | Risk | Mitigation |
| --- | --- | --- |
| R-1 | Safari clears IndexedDB | `navigator.storage.persist()`, warning, backup |
| R-2 | Tab OOM on phone | Lower device limits, incremental extract, abort |
| R-3 | Small free Gemini context | Selection, `needFiles`, line/page windows; agent states unread |
| R-4 | Bad model edits | `baseSha256`, confirm, retry (P36) |
| R-5 | Agent cannot run code | Human/CI verify; no server execution |
| R-6 | Content leaves to provider | NF-03; secret exclusion; DATA markers |
| R-7 | Postgres growth | Quota, dedup, soft delete (ADR-08) |
| R-8 | Browser/server drift | One extractor codebase; hash compare in tests |
| R-9 | Diff/export breaks P18/P19 | Re-export; keep `test:p18` gate |
| R-10 | Exotic tar | Own reader + fixtures; explicit reject |
| R-14 | Extract deps bloat / OOM | Lazy load; prefer existing `unpdf`; hard char/page caps |
| R-15 | Vision cost / failure | Opt-in only; size budget; metadata fallback |

### 13.2. Defaults chosen (closed)

| Topic | Default |
| --- | --- |
| Context caps | 40 files / 60 000 chars / 8 000 per file |
| PDF | `unpdf`; pages until char cap |
| DOCX | `mammoth` |
| XLSX | SheetJS `xlsx`, first sheets + 200 rows default |
| CSV | Pure JS → markdown |
| Images | Metadata; vision only if multimodal + ack + ≤2 MB total |
| Simple Mode binary blobs | Allowed for storage; content only via extractors |
| Secret UX | Exclude by default; explicit per-workspace confirm |
| Retention | Soft delete policy under ADR-08; no change in P35 |
| LLM at ingest | No |

---

## 14. What must not change without a new decision

- No server-side execution of user code or arbitrary shell.
- No silent writes to GitHub `main` or unscoped deploy.
- No removal of privacy acknowledgement before workspace content reaches the model.
- No claim that undecoded formats were “analysed”.
- Railway memory and request-body limits remain hard constraints for the request path.

---



## 15. Parallel product TZs and CI gates

### 15.1. Two TZs may coexist

| Document | Scope |
| --- | --- |
| Main product TZ (`docs/BiForge_TZ_v3.md` and related) | Modes, prompts, models, auth, budget, Railway/GitHub product rules |
| This file (P26 family) | Workspace, ingest, extract, ChangeSet, export |

They run in parallel. Do **not** merge unless file-work requirements are duplicated in the main TZ or patches regularly conflict on the same files.

**Anti-rollback rules**

1. Each patch SPEC lists **May change** and **Must not change**.
2. File-family patches do not alter prompts/router/auth unless the SPEC explicitly says so.
3. Main-TZ patches do not remove or weaken P34/P35 workspace extract behaviour without an explicit AC that replaces it.
4. Shared invariants stay in both: no server execution of user code, no silent GitHub `main`, privacy acknowledgement before model context, secrets excluded by default.

### 15.2. Later green CI closes earlier gates

A full green `npm run check` (and required build jobs) on a **later** patch in the same line of work **closes** pending CI confirmation for **earlier** patches in that line.

Example: green CI for P35 (including `test:p34` / `test:p27`) closes any “CI pending” note left on P34. Only the **current** patch needs explicit CI attention.

Record the closing patch in the earlier REPORT or in CURRENT_STATE when useful; do not block the queue waiting for historical CI narrative.

*End of BiForge_TZ_P26 (updated 15 Oct 2026). Implementation follows the patch plan in §12; each patch ships its own SPEC and REPORT.*
