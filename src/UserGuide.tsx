/**
 * Shared full User Guide modal for Simple, Expert and Project modes.
 * Scrollable body — full content, not a single “page”.
 */
import React, { useEffect } from 'react';
import { CircleHelp, X } from 'lucide-react';

export function UserGuideModal({ open, onClose }: { open: boolean; onClose: () => void }) {
  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose(); };
    document.addEventListener('keydown', onKey);
    const prev = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => {
      document.removeEventListener('keydown', onKey);
      document.body.style.overflow = prev;
    };
  }, [open, onClose]);

  if (!open) return null;

  return (
    <div
      className="modal-backdrop user-guide-backdrop"
      role="dialog"
      aria-modal="true"
      aria-label="BiForge user guide"
      onClick={onClose}
      style={{
        position: 'fixed',
        inset: 0,
        background: 'rgba(0,0,0,0.6)',
        zIndex: 2000,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: 12,
      }}
    >
      <div
        className="panel user-guide-panel"
        onClick={(e) => e.stopPropagation()}
        style={{
          maxWidth: 760,
          width: '100%',
          height: 'min(92vh, 900px)',
          display: 'flex',
          flexDirection: 'column',
          background: '#0d1b2a',
          border: '1px solid #3d7fc4',
          borderRadius: 12,
          overflow: 'hidden',
          boxShadow: '0 16px 48px rgba(0,0,0,0.45)',
        }}
      >
        <div
          style={{
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            gap: 12,
            padding: '14px 18px',
            borderBottom: '1px solid #1f4f86',
            flexShrink: 0,
          }}
        >
          <h2 style={{ margin: 0, fontSize: 18, display: 'flex', alignItems: 'center', gap: 8 }}>
            <CircleHelp size={18} /> BiForge user guide
          </h2>
          <button type="button" className="ghost" onClick={onClose} aria-label="Close guide" style={{ minHeight: 40 }}>
            <X size={16} /> Close
          </button>
        </div>
        <div
          className="user-guide-body"
          style={{
            flex: 1,
            overflowY: 'auto',
            overflowX: 'hidden',
            padding: '16px 20px 28px',
            fontSize: 14,
            lineHeight: 1.65,
            WebkitOverflowScrolling: 'touch',
          }}
        >
          <GuideBody />
        </div>
      </div>
    </div>
  );
}

function GuideBody() {
  return (
    <>
      <p>
        <strong>BiForge</strong> helps you think through hard choices and run projects as managed state — not as a chat dump.
        The AI proposes structure and questions; <strong>only you make decisions</strong>. This is not legal, medical, or financial advice.
      </p>

      <h3>1. Three modes</h3>
      <ul>
        <li>
          <strong>Simple</strong> — open conversation without required steps. Best for explanations, advice, and light structure.
          <br />
          <em>When to choose:</em> you want a calm chat and optional detail fields.
        </li>
        <li>
          <strong>Expert</strong> — guided method: Understand → Explore → Challenge → Check → Learn. Stages appear in the sidebar;
          you confirm suggestions. Open chat stays available for clarifications.
          <br />
          <em>When to choose:</em> a hard decision where a careful process helps.
        </li>
        <li>
          <strong>Project</strong> — separate workspace for longer work: project description, analysis (confirm/reject), plans, tasks,
          Delivery (hand-off packages; GitHub is read-only), files, and optional developer JSON.
          <br />
          <em>When to choose:</em> multi-step delivery with durable state, not a single chat.
        </li>
      </ul>
      <p style={{ color: '#8fa6c2' }}>
        Switch modes with the <strong>Mode</strong> button. Project opens a separate workspace (page reload). Simple/Expert dialogues stay where they were.
      </p>

      <h3>2. Top menu (same idea in every mode)</h3>
      <ul>
        <li><strong>Mode</strong> — Simple / Expert / Project, or back to mode selection.</li>
        <li><strong>New</strong> (Simple/Expert) — start a new dialogue.</li>
        <li><strong>Drive</strong> — connect Google Drive. Mirroring runs <em>while this tab is open</em>, not forever in the background.</li>
        <li><strong>History</strong> — past dialogues on this device (unavailable in some private browser modes).</li>
        <li><strong>Decision brief</strong> (Expert) — short overview of the current decision (also under More).</li>
        <li>
          <strong>More</strong> — Export (JSON, Markdown, Word, PDF, Google Docs), Import (backup, folder on desktop, Drive, file as new dialogue),
          saved texts, optional Gemini API key, Decision brief / Delete (Expert), and this guide.
        </li>
      </ul>

      <h3>3. Simple mode</h3>
      <ol>
        <li>Describe the situation in your own words (a few sentences is enough).</li>
        <li>Chat with the assistant; ask for options, risks, or clearer framing.</li>
        <li>Optional: <strong>Add more detail</strong> (facts, unknowns, values, constraints, options).</li>
        <li>Attach files the assistant may read (workspace / folder on desktop browsers).</li>
        <li>Export backups under More; connect Drive if you want live mirror while the tab is open.</li>
      </ol>

      <h3>4. Expert mode — stages</h3>
      <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13 }}>
        <thead>
          <tr style={{ textAlign: 'left', borderBottom: '1px solid #1f4f86' }}>
            <th style={{ padding: '6px 4px' }}>Stage</th>
            <th style={{ padding: '6px 4px' }}>You</th>
            <th style={{ padding: '6px 4px' }}>Model</th>
          </tr>
        </thead>
        <tbody>
          <tr><td style={{ padding: '6px 4px' }}>Start (Triage)</td><td>Safety and “is a careful process useful?”</td><td>—</td></tr>
          <tr><td style={{ padding: '6px 4px' }}>Your story</td><td>Describe the situation</td><td>Helps organize a brief</td></tr>
          <tr><td style={{ padding: '6px 4px' }}>Clarify</td><td>Confirm facts, unknowns, values</td><td>Knowledge map</td></tr>
          <tr><td style={{ padding: '6px 4px' }}>Options</td><td>Mark realistic options; add yours</td><td>Suggests more options</td></tr>
          <tr><td style={{ padding: '6px 4px' }}>Challenge</td><td>Stress-test options</td><td>Challenges assumptions</td></tr>
          <tr><td style={{ padding: '6px 4px' }}>Check</td><td>Small tests / evidence</td><td>Helps design tests</td></tr>
          <tr><td style={{ padding: '6px 4px' }}>Decide</td><td>Write <em>your</em> decision</td><td>Does not choose for you</td></tr>
          <tr><td style={{ padding: '6px 4px' }}>Synthesis / Learn</td><td>Review dates, lessons, next cycle</td><td>Summarizes</td></tr>
        </tbody>
      </table>
      <p>
        Each stage shows <strong>what this step is for</strong> and what to do next. Open chat under the stages is for clarifications;
        it does not auto-advance stages. If you need urgent personal help, pause and contact a real person or help service.
      </p>

      <h3>5. Project mode</h3>
      <p>
        Scope: analysis, plan, small programs as a ZIP download, hand-off of code tasks to an outside tool. <strong>GitHub is read-only</strong>;
        BiForge never merges.
      </p>
      <ol>
        <li>Sign in if required. Expand <strong>What is available here</strong> for server capabilities.</li>
        <li>Create a project (name + optional goal). Confirm the <strong>project description</strong> (formerly called passport) to unlock analysis.</li>
        <li>Optionally add workspace files (folder import: desktop browsers only).</li>
        <li>
          Run <strong>analysis</strong>. On <strong>Results</strong>, nothing is accepted until you press <strong>Confirm</strong>.
          Use <strong>Reject</strong> for wrong suggestions. Add human decisions in your own words.
        </li>
        <li>Create a <strong>plan</strong>, approve budgets and gates (explicit human decisions), start tasks.</li>
        <li>
          <strong>Delivery</strong>: create a hand-off task → download PACKAGE.md → work in an external tool → refresh checks from GitHub (read-only) →
          accept, repair, or reject. BiForge never merges.
        </li>
        <li><strong>Files</strong>: artifacts, versions, Drive save, model request history.</li>
        <li><strong>Data</strong> (developer tools): raw project JSON — enable only if you need it; bad edits can break the project.</li>
      </ol>
      <p>
        Suggested path: <strong>Description → Analysis → Confirm items → Plan → Tasks → Delivery</strong>.
      </p>

      <h3>6. Google Drive</h3>
      <p>
        Connect via <strong>Drive</strong> in the top bar. While the tab is open and connected, decisions and selected files can be mirrored.
        Closing the tab stops live mirroring for that session. Drive is optional.
      </p>

      <h3>7. Export and backup</h3>
      <ul>
        <li><strong>JSON</strong> — full restore of a dialogue</li>
        <li><strong>Markdown / Word / PDF</strong> — sharing or printing</li>
        <li><strong>Google Docs</strong> — when Drive is connected</li>
        <li>Project artifacts and program ZIP — from Project files / build</li>
      </ul>

      <h3>8. Safety</h3>
      <ul>
        <li>Do not enter passwords, card numbers, or ID documents.</li>
        <li>Urgent personal help → stop and contact a real person or local help service.</li>
        <li>Model output can be wrong; verify important facts yourself.</li>
        <li>Optional web search (if enabled on the server) still needs your judgment.</li>
      </ul>

      <h3>9. Troubleshooting</h3>
      <ul>
        <li><strong>Project unavailable</strong> — disabled for this deployment; ask the administrator.</li>
        <li><strong>Analysis blocked</strong> — confirm the project description first.</li>
        <li><strong>Save rejected</strong> — the project changed in another window; reload and retry.</li>
        <li><strong>Drive not syncing</strong> — reconnect; keep the tab open; check browser permissions.</li>
        <li><strong>Folder import missing</strong> — use a desktop browser with folder picker support.</li>
        <li><strong>Gemini errors</strong> — try the server key, or set your own key under More.</li>
      </ul>

      <p style={{ color: '#8fa6c2', marginBottom: 0 }}>
        Full markdown copy: <code>docs/USER_GUIDE.md</code> in the repository. Operators: <code>docs/OWNER_OPS.md</code>.
      </p>
    </>
  );
}

export default UserGuideModal;
