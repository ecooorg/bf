# BiForge User Guide

**Product version:** 48  
**Audience:** people who use BiForge to think through decisions or run structured projects  
**Language:** English  
**Note:** Top menu is aligned across Simple, Expert, and Project (Mode, Drive, More → User guide). The in-app User guide scrolls fully.

BiForge is a calm decision and project workspace. It does **not** replace professional advice (legal, medical, financial, or otherwise). It does **not** pick a winner for you. The AI proposes structure and questions; **only you make decisions**.

---

## 1. Getting started

1. Open the BiForge URL provided by your administrator.
2. Read the welcome / privacy notice. Do **not** enter passwords, card numbers, or identity documents.
3. Choose a mode on the start screen (or later via the **Mode** control):
   - **Simple** — open conversation for everyday thinking.
   - **Expert** — guided method: Understand → Explore → Challenge → Check → Learn.
   - **Project** — separate workspace for multi-step projects (may require sign-in; can be disabled on some servers).

Use the **Mode** button (layers icon) at any time to switch modes or return to mode selection.

---

## 2. Common controls (Simple and Expert)

| Control | What it does |
|--------|----------------|
| **Mode** | Switch between Simple, Expert, and Project (if enabled). “Back to mode selection” returns to the start screen. |
| **New** | Start a new dialogue (current work stays in History if available). |
| **Drive** | Connect or show Google Drive status. While connected, decisions and files can be mirrored to Drive for the open tab. |
| **History** | Open past dialogues stored on this device or server (when available). |
| **More** | Export, import, saved texts, Gemini API key, Decision brief (Expert), Delete dialogue (Expert), and **User guide**. |

### More menu

- **Export all ▸**
  - **Backup (.json)** — full machine-readable backup of the dialogue.
  - **Readable text (.md)** — Markdown summary.
  - **Word** — .docx document.
  - **PDF** — PDF document.
  - **Google Docs** — create a Google Doc (requires Drive).
- **Import ▸**
  - **From backup (.json)** — restore a previous export.
  - **Project folder (desktop)** — load a folder from this computer so the assistant can read it (desktop browsers only).
  - **From Google Drive** — import from connected Drive.
  - **From a file as a new dialogue** — start a dialogue from a .txt / .docx / .pdf file.
- **Saved texts on this device** — texts you saved from chats on this browser.
- **Your Gemini API key** — optional personal key for Gemini (overrides server default when set).
- **Decision brief** (Expert only) — short overview of the current decision.
- **Delete dialogue** (Expert only) — permanently remove the current dialogue.
- **User guide** — opens this guide summary in the app.

---

## 3. Simple mode

**Purpose:** free-form conversation to think aloud, get structure, and explore a choice without a rigid pipeline.

### How to use

1. Describe your situation in your own words (a few sentences is enough).
2. Chat with the assistant. Ask for options, risks, questions to research, or a clearer framing.
3. Optionally open **Add more detail** fields (facts, unknowns, assumptions, values, constraints, options, leaning, cost of error, reversibility).
4. Use **Export** / **Import** under **More** to keep backups.
5. Connect **Google Drive** if you want files and decisions mirrored while the tab is open.

### What Simple does *not* do

- It does not force stages or lock cards.
- It does not auto-approve anything.
- Numbers and claims may still be challenged; treat model output as assistance, not truth.

### Tips

- Prefer concrete context (“I have two job offers, A pays more but is remote…”) over vague prompts.
- Switch to **Expert** when you want a step-by-step method with explicit stages.
- Switch to **Project** when the work is a multi-week effort with plans, tasks, and deliverables.

---

## 4. Expert mode

**Purpose:** a structured decision method. The formula is:

**Understand → Explore → Challenge → Check → Learn**

The left sidebar (when visible) shows progress through the stages. You can still use the open chat area for clarifications; Expert contract (mode, stage, method state) is sent with conversation requests.

### Stages

| Stage | Label | Your role | Model role |
|-------|--------|-----------|------------|
| **TRIAGE** | Start | Answer safety and “is a careful process useful?” questions | Not used yet |
| **BRIEF** | Your story | Describe the situation in your own words | Helps organize into a brief |
| **UNDERSTAND** | Clarify | Confirm facts, unknowns, assumptions, values; assign owners | Neutralizes wording; builds a knowledge map |
| **EXPAND** | Options | Mark realistic options; add your own | Suggests additional options |
| **ATTACK** | Challenge | Stress-test options; note failure modes | Challenges assumptions and options |
| **TEST** | Check | Design or record small experiments / evidence | Helps design tests |
| **DECIDE** | Decide | Record *your* decision and reasons | Does not choose for you |
| **SYNTHESIS** | Synthesis | Pull together the picture and review dates | Summarizes |
| **LEARN** | Learn | Capture what you learned; optionally start a next cycle | Supports reflection |

### Safety (Triage)

- If you need **urgent personal help**, say so. The app will ask you to pause and contact a real person or help service. BiForge is not crisis support.
- Optional “fit” questions ask whether a careful process is useful (costly error, hard to undo, resolvable unknowns, long horizon). You can skip them and continue.

### Typical Expert flow

1. Complete **Triage** (or skip if not needed).
2. Write your story on **Brief**; lock/save when ready.
3. Work through **Clarify → Options → Challenge**. Confirm or edit model suggestions; you own every acceptance.
4. Optionally run **Check** (tests / experiments) before deciding.
5. On **Decide**, write *your* decision. The tool does not score a winner.
6. Use **Synthesis** and **Learn**; you can start a **next cycle** with updated knowledge.

### Expert-only More items

- **Decision brief** — compact readable overview of the current decision package.
- **Delete dialogue** — remove this dialogue permanently.

---

## 5. Project mode (detailed)

**Purpose:** run a **project as a managed process**, not as a chat transcript. A project has **Project State**: goal, facts, unknowns, hypotheses, decisions, risks, requirements. The model proposes state changes; the system validates them; **only a human confirms or rejects**.

Project mode is a **separate workspace** from Simple/Expert chat. It may require a password and can be disabled for a deployment.

### 5.1 Sign-in and capabilities

- If authentication is required, sign in with the password given by your administrator.
- At the top you see **What is available here** (expandable). Typical capabilities:

| Capability | Meaning when on |
|------------|-----------------|
| **Analysis** | You confirm or reject every proposed change. |
| **Plans and approvals** | Tasks run under your budgets. |
| **Program as ZIP** | Source is checked and offered as a ZIP download; it is **not** executed on the server. |
| **Receive results from GitHub** | BiForge can read a pull request / checks for hand-off tasks (read-only). |
| **Writing to GitHub** | Off by design on standard deployments; BiForge never merges. |

Scope summary (product text): *Project: analysis, plan, small programs as a ZIP download, and hand-off of code tasks to an outside tool. GitHub is read-only.*

### 5.2 Creating and selecting projects

1. Enter a **name** (required) and optional **goal**.
2. Create the project. A **passport** (project description) is created and may be auto-confirmed on create, or you confirm it later.
3. Select a project from the list to open its workspace.
4. You can **delete** a project (confirmation required); this cannot be undone.

### 5.3 Project passport

The passport describes:

- Project type, goal, users, inputs/outputs  
- Constraints, security/data notes, success criteria  
- Budget (calls, tokens, executor runs)  
- Executor: `manual` or `model_patch`  
- Human level: `supervised` or `manual`  

**Confirm the passport** before analysis is fully enabled. You can edit and save without confirming; confirmation unlocks the analysis workflow.

### 5.4 Workspace files

- Attach files the assistant should read for analysis (when folder picker is supported: load a whole project folder from the desktop).
- **⋯** (more workspace actions) may include folder pick and related actions.
- Google Drive: connect and save artifacts / program ZIPs to Drive when configured.

### 5.5 Tabs

#### Results

- After **Run analysis**, the model proposes items in sections such as:
  - **facts**, **unknowns**, **hypotheses**, **risks**, **requirements**, **decisions**
- Each proposed item shows status (e.g. proposed / confirmed / rejected).
- **Confirm** or **Reject** every proposed change. Nothing is accepted automatically.
- **Your decision**: type a human decision (e.g. “We will use PostgreSQL because…”) and **Add decision**.

#### Plan

- **Create plan** (template-based, e.g. spec → architecture → review → approval). Human approval is required before tasks can run.
- Approvals (including **budget** approvals) are explicit human decisions. Budget increases may prompt for a new limit.
- **Tasks** list shows state (`READY`, `VALIDATING`, blocked reasons, etc.).
  - **Start task** when READY.
  - **Mark as passed / failed** when VALIDATING.
  - Code-related tasks can **Open in Delivery**.

#### Delivery

Hand-off of coding work to an **external** tool. BiForge prepares packages and reads results; **you** review and decide. BiForge **never merges** and **never writes** to GitHub on standard deployments.

Typical actions:

- **New hand-off task** — define goal and create a delivery task.
- **Download PACKAGE.md** — package for the external tool.
- Approve package fingerprint when ready.
- **Refresh from GitHub** — read PR / check status (read-only).
- Review gates (PASS / FAIL / waive with reason).
- Accept, mark for repair, or reject results.
- Restart checks or prepare a new package for another attempt when needed.

All gates and acceptance steps are human-controlled.

#### Files (Journal)

- List of **artifacts** (filename, version, short hash).
- Open artifact content in the page.
- **Save to Google Drive** per file (when Drive is configured).
- **Model request history** (ledger): model id, status, token counts.

#### Data (for developers)

- Raw **Project JSON** for the selected project.
- Manual edits can break behavior; use with care.
- Optimistic concurrency: if the project was changed in another window, save is blocked to avoid overwriting newer data.
- **Save project data** after editing valid JSON.

### 5.6 Analysis workflow

1. Confirm passport.
2. Optionally load workspace files / folder.
3. Enter a **task** (what you want analyzed) and run **analysis**.
4. Review proposed changes on **Results**; confirm or reject each.
5. Record human decisions explicitly.
6. Optionally **create a plan**, approve gates/budgets, start tasks.
7. For code work, use **Delivery** to hand off and bring results back.
8. Export or save artifacts to Drive as needed.

### 5.7 Program / ZIP

When **Program as ZIP** is available:

- Provide a program goal and **build**.
- Source is validated; a downloadable ZIP may be produced.
- The server does **not** execute the generated program.
- You can save the ZIP to Google Drive when connected.

### 5.8 Sign out

Use **Sign out** when finished on a shared machine.

---

## 6. Google Drive

- Connect via the **Drive** control (Simple/Expert) or within Project when offered.
- While the tab is open and connected, decisions and selected files can be mirrored.
- Mode affects the Drive folder layout (Simple vs Expert vs Project subfolders).
- Disconnect or close the tab stops live mirroring for that session.

---

## 7. Privacy and safety

- Do not enter secrets, passwords, payment data, or ID documents.
- Crisis: if you need urgent personal help, stop and contact a real person or local help service.
- The app is not medical, legal, or financial advice.
- Model output can be wrong; verify important facts yourself.
- Optional web search (if enabled by the server) is for fresh facts and remains under human review.

---

## 8. Export, backup, and recovery

| Format | Use |
|--------|-----|
| JSON backup | Full restore of a dialogue |
| Markdown | Human-readable archive |
| Word / PDF | Sharing or printing |
| Google Docs | Live document in Drive |
| Project artifacts / ZIP | Project deliverables |

Keep JSON backups of important dialogues. Import restores from backup; “from a file as a new dialogue” starts fresh from a document.

---

## 9. Troubleshooting

| Symptom | What to try |
|---------|-------------|
| Project mode unavailable | Deployment may have Project disabled; check with the administrator. |
| Sign-in fails | Check password; ask admin if auth is required. |
| Analysis blocked | Confirm the project passport. |
| Save state rejected | Another window updated the project; reload and retry. |
| Drive not syncing | Reconnect Drive; keep the tab open; check browser permissions. |
| Folder import missing | Use a desktop browser that supports the folder picker. |
| Gemini errors | Try server key, or set **Your Gemini API key** under More. |

---

## 10. Principles to remember

1. **Human decides** — confirm, reject, approve, or write decisions yourself.  
2. **State over chat** — especially in Project, durable state (facts, risks, decisions) matters more than transcript length.  
3. **No silent automation** — plans, budgets, gates, and merges require explicit human action.  
4. **Calm process** — use Simple for free thought, Expert for a careful method, Project for managed delivery.  

---

*End of user guide. For operators and deployment, see `docs/OWNER_OPS.md` and `docs/STATUS.md`.*
