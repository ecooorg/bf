/**
 * Full-screen User Guide for Simple, Expert and Project.
 * - Covers the whole viewport (not a small card over the chat)
 * - Body scrolls end-to-end (flex minHeight: 0 — required on mobile Chrome)
 * - Optional “Open in new tab” for a real separate browser window
 */
import React, { useEffect, useCallback } from 'react';
import { CircleHelp, ExternalLink, X } from 'lucide-react';

export function UserGuideModal({ open, onClose }: { open: boolean; onClose: () => void }) {
  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    document.addEventListener('keydown', onKey);
    const prevOverflow = document.body.style.overflow;
    const prevPos = document.body.style.position;
    document.body.style.overflow = 'hidden';
    // Reduce background scroll on iOS/Android while guide is open
    document.body.style.position = 'relative';
    return () => {
      document.removeEventListener('keydown', onKey);
      document.body.style.overflow = prevOverflow;
      document.body.style.position = prevPos;
    };
  }, [open, onClose]);

  const openInNewTab = useCallback(() => {
    const html = `<!DOCTYPE html><html lang="en"><head><meta charset="utf-8"/><meta name="viewport" content="width=device-width,initial-scale=1"/><title>BiForge User Guide</title>
<style>
body{font-family:system-ui,-apple-system,sans-serif;line-height:1.6;max-width:720px;margin:24px auto;padding:0 16px 48px;background:#0d1b2a;color:#e6edf7}
h1{font-size:1.5rem}h2{font-size:1.2rem;margin-top:1.6em;border-bottom:1px solid #1f4f86;padding-bottom:6px}
h3{font-size:1.05rem;margin-top:1.2em;color:#9fd8ff}table{border-collapse:collapse;width:100%;font-size:0.9rem}
th,td{border:1px solid #25405e;padding:6px 8px;text-align:left}th{background:#10243a}
code{background:#07111f;padding:1px 4px;border-radius:4px}a{color:#78baff}ul,ol{padding-left:1.3em}
</style></head><body>${guideHtmlForPrint()}</body></html>`;
    const blob = new Blob([html], { type: 'text/html;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    window.open(url, '_blank', 'noopener,noreferrer');
    window.setTimeout(() => URL.revokeObjectURL(url), 60_000);
  }, []);

  if (!open) return null;

  return (
    <div
      className="user-guide-root"
      role="dialog"
      aria-modal="true"
      aria-label="BiForge quick guide"
      style={{
        position: 'fixed',
        inset: 0,
        zIndex: 3000,
        display: 'flex',
        flexDirection: 'column',
        background: '#07111f',
        color: '#e6edf7',
        width: '100%',
        height: '100%',
        maxHeight: '100dvh',
      }}
    >
      <div
        className="user-guide-toolbar"
        style={{
          flexShrink: 0,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          gap: 10,
          padding: '12px 14px',
          paddingTop: 'max(12px, env(safe-area-inset-top))',
          borderBottom: '1px solid #1f4f86',
          background: '#0d1b2a',
        }}
      >
        <h1 style={{ margin: 0, fontSize: 17, display: 'flex', alignItems: 'center', gap: 8, fontWeight: 600 }}>
          <CircleHelp size={18} aria-hidden /> BiForge quick guide
        </h1>
        <div style={{ display: 'flex', gap: 8, flexShrink: 0 }}>
          <button type="button" className="ghost" onClick={openInNewTab} title="Open this guide in a new browser tab">
            <ExternalLink size={14} /> <span className="lbl">New tab</span>
          </button>
          <button type="button" className="ghost" onClick={onClose} aria-label="Close user guide">
            <X size={16} /> <span className="lbl">Close</span>
          </button>
        </div>
      </div>

      {/* minHeight: 0 is required so this flex child can scroll on mobile Chrome */}
      <div
        className="user-guide-scroll"
        style={{
          flex: '1 1 auto',
          minHeight: 0,
          overflowY: 'auto',
          overflowX: 'hidden',
          WebkitOverflowScrolling: 'touch',
          overscrollBehavior: 'contain',
          padding: '16px 16px max(32px, env(safe-area-inset-bottom))',
          maxWidth: 720,
          width: '100%',
          margin: '0 auto',
          boxSizing: 'border-box',
          fontSize: 15,
          lineHeight: 1.65,
        }}
      >
        <GuideBody />
        <p style={{ color: '#8fa6c2', fontSize: 13, marginTop: 32, paddingBottom: 24 }}>
          Quick guide. Use <strong>New tab</strong> to open a separate copy.
        </p>
      </div>
    </div>
  );
}

function guideHtmlForPrint(): string {
  return `
<h1>BiForge quick guide</h1>
<p>The AI suggests; <strong>you decide</strong>. Check important facts yourself. Do not enter passwords, card numbers, or ID documents.</p>
<h2>Choose a mode</h2>
<ul><li><strong>Simple</strong> — ask a question and chat freely.</li><li><strong>Expert</strong> — work through Understand, Explore, Challenge, Check, and Learn. Confirm suggestions yourself.</li><li><strong>Project</strong> — organise a project, confirm analysis, make a plan, and prepare files. You publish and deploy manually.</li></ul>
<h2>Top bar</h2>
<ul><li><strong>Mode</strong> switches modes.</li><li><strong>New</strong> starts a dialogue.</li><li><strong>Drive</strong> mirrors files only while this tab is open.</li><li><strong>History</strong> opens saved dialogues on this device.</li><li><strong>More</strong> contains import, export, saved texts, settings, and help.</li></ul>
<h2>Quick tips</h2>
<ul><li><strong>Simple:</strong> describe the situation; attach relevant files only when useful.</li><li><strong>Expert:</strong> follow the stages and confirm each step. The assistant does not choose for you.</li><li><strong>Project:</strong> confirm the project description before analysis; review suggestions before creating a plan.</li><li><strong>Export:</strong> use More → Export for a backup or readable copy.</li></ul>
<h2>If something does not work</h2>
<ul><li>Project unavailable — check whether this site has Project mode enabled.</li><li>Analysis blocked — confirm the project description.</li><li>Drive not syncing — reconnect and keep this tab open.</li><li>Save rejected — reload if the project changed in another window.</li></ul>
<p>For advanced operational details, see the repository documentation. Project actions such as approvals and publishing always require your input.</p>`;
}

function GuideBody() {
  const h2: React.CSSProperties = {
    fontSize: 18, margin: '20px 0 8px', paddingBottom: 5,
    borderBottom: '1px solid #1f4f86', color: '#e6edf7',
  };
  const muted: React.CSSProperties = { color: '#8fa6c2' };
  return (
    <article className="user-guide-article">
      <p style={{ marginTop: 0 }}><strong>BiForge</strong> helps you think through decisions and organise projects. The AI suggests; <strong>you decide</strong>. Verify important facts and do not enter passwords, card numbers, or identity documents.</p>
      <h2 style={h2}>Choose a mode</h2>
      <ul>
        <li><strong>Simple</strong> — ask a question and chat freely. Add files only when they help explain the situation.</li>
        <li><strong>Expert</strong> — follow Understand → Explore → Challenge → Check → Learn. Review and confirm suggestions at each stage.</li>
        <li><strong>Project</strong> — describe a project, confirm its analysis, create a plan, and prepare files. You publish and deploy manually.</li>
      </ul>
      <h2 style={h2}>Top bar</h2>
      <ul>
        <li><strong>Mode</strong> switches between modes.</li>
        <li><strong>New</strong> starts a dialogue.</li>
        <li><strong>Drive</strong> mirrors files only while this tab is open.</li>
        <li><strong>History</strong> opens dialogues saved on this device.</li>
        <li><strong>More</strong> contains import, export, saved texts, settings, and help.</li>
      </ul>
      <h2 style={h2}>Quick tips</h2>
      <ul>
        <li><strong>Simple:</strong> start with your question; add context as needed.</li>
        <li><strong>Expert:</strong> move through the stages; chat clarifications do not advance a stage automatically.</li>
        <li><strong>Project:</strong> confirm the project description before analysis. Review suggestions before planning.</li>
        <li><strong>Export:</strong> choose More → Export for a backup or readable copy.</li>
      </ul>
      <h2 style={h2}>If something does not work</h2>
      <ul>
        <li><strong>Project unavailable</strong> — check whether this site has Project mode enabled.</li>
        <li><strong>Analysis blocked</strong> — confirm the project description.</li>
        <li><strong>Drive not syncing</strong> — reconnect and keep this tab open.</li>
        <li><strong>Save rejected</strong> — reload if the project changed in another window.</li>
      </ul>
      <p style={{ ...muted, marginBottom: 0 }}>Advanced operational details are in the repository documentation. Approvals and publishing always require your input.</p>
    </article>
  );
}

export default UserGuideModal;
