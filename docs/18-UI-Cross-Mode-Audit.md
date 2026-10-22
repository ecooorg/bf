# 18 — UI cross-mode audit (P66)

Audit only. No product logic changed. Evidence from source after P65 (header tap ≥44px).
Scope: Simple, Expert, Project — duplicate copy/actions, unclear labels, controls without a current job, inconsistent empty/loading/error/unavailable states.

Priority:
- **P0** — confuses a first-time user on the main path; fix next (P67+)
- **P1** — visible jargon, long copy, or secondary noise; fix in small follow-ups
- **P2** — polish / consistency; after P0–P1

---

## 1. Already improved (do not re-open without new evidence)

| Area | Patches | What is good enough now |
| --- | --- | --- |
| Simple empty | P63 | One primary «Start conversation»; files optional under details; no reference to a missing message box |
| Mobile header labels + a11y names | P63, P65 | Short labels kept; tap height ≥44px under 900px |
| Expert flow | P61 | One conversation stream; one files block; step nav; reason next to disabled Continue on some steps |
| Project landing vs open project | P62 | List vs detail; «All projects»; workspace files gated; Advanced entry |
| Shared guide | P63 | Shortened; Simple / Expert / Project covered |
| Copy discipline | P60+ | Forbidden jargon list + per-file debt; debt must only fall |

---

## 2. Cross-mode findings

### 2.1 Unclear or internal labels (P0 / P1)

| ID | Mode | Issue | Evidence | Priority |
| --- | --- | --- | --- | --- |
| L1 | Project | Tab **Delivery** is a pipeline name, not a user goal | `ProjectMode.tsx` nav: `['delivery', 'Delivery']` | P0 |
| L2 | Project | Notices still say **Passport** while the form title says «Project description» | `savePassport` → `Passport confirmed.` / `Passport saved.`; status `(proposed\|confirmed)` on the heading | P0 |
| L3 | Project | Tab **Data · developers** vs button **Advanced** vs section **Advanced project data** — three names | nav `Data · developers`; Advanced button; `h3` Advanced project data | P0 |
| L4 | Project | **Hand-off** / **waive** / **gates** on the Delivery screen | `ProjectDelivery.tsx`: «New hand-off task», «Waive…», gate approve UI; lint debt hand-off 6, waive 5, gates 2 | P0 |
| L5 | Project | Raw task / code-task ids and machine `statusReason` on Results | e.g. `Task {id} · Code task {id}`, `source_bundle_ready_github_delivery_not_requested` | P1 |
| L6 | Project | File list shows content **hash** next to the name | journal tab: `a.hash.slice(0, 12)` | P1 |
| L7 | Simple | Banner «Mode: Simple chat — …» while Mode is already in the header | `App.tsx` `data-testid="mode-banner"` | P1 |

### 2.2 Duplicate or competing actions (P0 / P1)

| ID | Mode | Issue | Evidence | Priority |
| --- | --- | --- | --- | --- |
| A1 | Project | Plan tab: several equal buttons (Start task, Mark passed/failed, Open in Delivery) with no single primary | task list buttons, `minHeight: 32` | P0 |
| A2 | Project | Delivery: long step strip + many peer buttons (Download, Approve, Copy, Send, Commit, Refresh, Waive, Accept, Repair, Reject, Close) | `ProjectDelivery.tsx` step list + action row | P0 |
| A3 | Project | Results packs analysis, program build, decision, and suggested path on one scroll without a clear «do this next» | Results tab + dashed «Suggested path» | P1 |
| A4 | Project | Two «Project workspace» titles (page `h1` and detail `h2`) | `h1` ~line 364; `h2` in detail panel | P1 |
| A5 | Project | Journal: `h3` Files and `h4` Files | duplicate heading structure | P2 |
| A6 | Simple / Expert | Header **New** vs empty-state **Start conversation** — same job, two labels | Header `onNew` / empty primary | P2 |
| A7 | All | Drive appears as header control and again under More (Save all / import) — OK if roles differ; labels still overlap («Drive · this tab») | Header + More menus in App and ProjectMode | P2 |

### 2.3 Controls or detail without a current job (P1)

| ID | Mode | Issue | Evidence | Priority |
| --- | --- | --- | --- | --- |
| C1 | Project | Provider token counts and model id on Results after a run | «Estimated context … Provider reported … tokens» | P1 |
| C2 | Project | **Model request history** on the Files tab | ledger list under journal | P1 |
| C3 | Project | Capability dump (on/off list) on the landing screen may overwhelm before first project | `describeCapabilities` list near top | P1 |
| C4 | Expert | Some long instructional paragraphs still exceed the 12-word hint target (lint allows up to 24) | `App.tsx` long strings (crisis, stress-test, etc.) | P1 |
| C5 | Project | Create-program block always visible after description confirmed, even when user only wants analysis | Results section «Create a small program» | P2 |

### 2.4 Inconsistent states (P0 / P1)

| ID | Modes | Issue | Evidence | Priority |
| --- | --- | --- | --- | --- |
| S1 | All three | No shared pattern for empty / loading / done / error / unavailable | Project: `Checking session…`, `Nothing here yet…`, red/green banners; Simple: empty hero; Expert: step-specific | P0 (define once, apply in later patches) |
| S2 | Project | Disabled Delivery actions explain well in one place (`Confirm the project description first`) — good model; Plan/Results lack the same short reason next to every disabled control | `newDisabledReason` in ProjectDelivery vs Plan buttons | P1 |
| S3 | Simple / Project | History unavailable vs Drive off wording differs in tone and structure | Header History vs Drive labels | P2 |
| S4 | Project | Leaving Project confirms with a long dialog; entering Project from start screen also confirms — necessary but text is long (>24 words) | `window.confirm` strings in App / ProjectMode | P2 |

### 2.5 Navigation clarity (P1)

| ID | Mode | Issue | Evidence | Priority |
| --- | --- | --- | --- | --- |
| N1 | Project | After open project, user must infer tab order; «Suggested path» helps but competes with tab chrome | dashed path box under tabs | P1 |
| N2 | Project | «Open in Delivery» from Plan uses internal tab name | Plan task button | P1 (ties to L1) |
| N3 | Simple ↔ Expert | Mode menu is clear; chat-vs-method boundary relies on banner + guide | ModeMenu + mode-banner | P2 after L7 |

---

## 3. Copy-lint debt (baseline for P67+)

From `scripts/lint-copy.mjs` DEBT (must only decrease):

| File | Debt |
| --- | --- |
| `ProjectDelivery.tsx` | hand-off 6, waive 5, gates 2, fingerprint 2, long 1 |
| `ProjectMode.tsx` | long 2, passport 3 |
| `projectAppBuilder.ts` | long 6, scaffold 3 |
| `App.tsx` | long 4 |
| `ProjectNoviceWizard.tsx` | scaffold 1 |
| `ProjectPathChooser.tsx` | long 2 |
| `WorkspacePanel.tsx` | long 1 |
| `projectCapabilities.ts` | hand-off 2 |
| `projectDeliveryModel.ts` | waive 1 |
| others | small |

Highest user impact: **ProjectDelivery** + **passport notices** in ProjectMode.

---

## 4. Recommended fix order (later patches only)

| Patch | Scope | Success |
| --- | --- | --- |
| **P67** | Labels: Delivery → user goal name; Passport notices → description; Data/Advanced one name; hide task ids / hashes from default lists | L1–L3, L5–L6; debt passport ↓ |
| **P68** | Delivery screen copy + one primary action per step; reword hand-off / waive / gates | L4, A2; ProjectDelivery debt ↓ |
| **P69** | Plan/Results hierarchy: one next action; move tokens/ledger under Advanced or details | A1, A3, C1–C2 |
| **P70** | Simple: remove or shorten mode-banner; trim App long copy where safe | L7, C4 |
| **P71+** | Shared empty/loading/error patterns; remaining P2 | S1 and leftovers |

Rules for all follow-ups: no product-logic change; no removal of a capability without owner approval; every UI patch checked at ~1200px and ~390px; lower lint debt, never raise it.

---

## 5. Out of scope for this audit

- Playwright install duration on CI (infra; left as-is)
- Server/API/state machines
- Enabling GitHub write or host-side code execution
- Changing Expert method steps or Project delivery pipeline behaviour

---

## 6. How this audit was done

- Read `AGENTS.md` STATE, `CHANGELOG` P61–P65, `scripts/lint-copy.mjs` DEBT
- Scanned visible strings in `App.tsx`, `ProjectMode.tsx`, `ProjectDelivery.tsx`, `ModeMenu.tsx`, `UserGuide.tsx`, `WorkspacePanel.tsx`, path chooser / novice wizard
- Mapped headings, tab labels, and button labels on Project and Delivery
- No browser run in the audit environment (Playwright deps not installed here); UI structure claims are from source
