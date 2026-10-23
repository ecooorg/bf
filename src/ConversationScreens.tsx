/** Brief-entry and shared conversation screens extracted for task-local context (P82). */
import React, { useRef, useState } from 'react';
import { ArrowRight, RotateCcw } from 'lucide-react';
import type { Decision } from './decision.ts';
import { downloadBlob } from './exportZip.ts';
import { SUPPORT_CONTACTS, findDistressInTexts } from './support.ts';
import { FilesPanel, CopyButton, MessageExtras } from './ConversationFiles.tsx';
import { AutoTextarea } from './AutoGrow.tsx';
import { decisionToDocument } from './decisionDocument.ts';
import {
  Attachment, DocumentSpec, applyAttachmentNotes, attachmentOnlyText, collectDecisionAttachments,
  fitRequest, historyForRequest,
} from './attachments.ts';
import { archiveAgentDocument } from './programFiles.ts';
import { expertConversationFields } from './expertContext.ts';
import { questionLine } from './expertHistory.ts';
import { buildIcs } from './icsBuilder.ts';
import { parseChangeSetFromText } from './workspace/changeSetParse.ts';

// --- CONVERSATION HELPERS ---
const INTENT_CHIPS: { id: string; label: string; hint: string }[] = [
  { id: 'THINK_ALOUD', label: 'Think out loud', hint: 'Describe what is going on. There is no need to structure it.' },
  { id: 'ARGUE_AGAINST', label: 'Argue against my plan', hint: 'Describe your plan and why it appeals to you. We will look for its strongest weak points.' },
  { id: 'PREPARE_CONVERSATION', label: 'Prepare for a conversation', hint: 'Who do you need to talk to, and what do you want to find out from them?' },
  { id: 'WHAT_FIRST', label: 'What to find out first', hint: 'Describe the decision. We will look for the one thing that could change it most.' },
];

const NOTE_REQUEST =
  'Please write a short note: what matters to me, what I do not know yet, and what I will find out this week.';
export function icsDownload(d: Decision) {
  const events = (d.brief.reviewDates || []).map((date: string, i: number) => ({ uid: `${d.id}-rev-${i}@bifurcation`, date, summary: `Decision review ${i + 1}` }));
  downloadBlob(new Blob([buildIcs(events)], { type: 'text/calendar' }), 'review.ics');
}

const DOCUMENT_REQUEST =
  'Please prepare a downloadable document: a clear summary of this conversation, what matters, what is unknown and the next step.';

export function SafetyBox() {
  return (
    <div className="conversation-safety-box" role="note">
      <div>If you are in immediate danger, contact a person near you or local emergency services first. You do not have to decide anything today.</div>
      <ul>
        {SUPPORT_CONTACTS.map((c, i) => (
          <li key={i}>{c.label}: <b>{c.value}</b></li>
        ))}
      </ul>
    </div>
  );
}

// --- BRIEF ---

export function BriefScreen({
  d,
  update,
  runApi,
  busy,
  onProposedChangeSet,
  expert,
}: {
  expert?: boolean;
  d: Decision;
  update: (p: Partial<Decision> | ((x: Decision) => Decision)) => void;
  runApi: (path: string, body: unknown, onOk: (data: any, meta: any) => void) => void;
  busy: boolean;
  onProposedChangeSet?: (text: string | null) => void;
}) {
  const b = d.brief;
  const setB = (patch: Partial<typeof b>) => update({ brief: { ...b, ...patch } });
  const [files, setFiles] = useState<Attachment[]>([]);
  const canContinue = b.decision.trim().length >= 3 || files.length > 0;
  const distress = findDistressInTexts([b.decision]);
  const [intent, setIntent] = useState<string>('THINK_ALOUD');
  const chip = INTENT_CHIPS.find((c) => c.id === intent) || INTENT_CHIPS[0];

  const [dragOver, setDragOver] = useState(false);

  const submit = () => {
    if (!canContinue || busy) return;
    const text = b.decision.trim() || attachmentOnlyText(files);
    window.dispatchEvent(new CustomEvent('be:user-language', { detail: { text } }));
    const userMessage: any = { role: 'user', content: text, at: Date.now(), ...(files.length ? { attachments: files } : {}) };
    // Persist pending so ConversationScreen can Retry if this first call fails.
    update({
      title: text.slice(0, 80) || d.title,
      brief: { ...b, decision: text },
      modelSuggestions: {
        ...d.modelSuggestions,
        conversation: [userMessage],
        pendingSend: { text, files: [...files], intent },
      },
      step: 'UNDERSTAND',
      interactionState: 'UNDERSTANDING',
    });
    runApi('/api/conversation', fitRequest({ brief: { ...b, decision: text }, history: historyForRequest([userMessage]), attachments: collectDecisionAttachments(d, [userMessage]), intent, ...expertConversationFields(d, expert) }), (data, meta) => {
      const assistant: any = { role: 'assistant', content: data.reply, at: Date.now(), ...(data.document ? { document: data.document } : {}) };
      if (typeof data.reply === 'string' && parseChangeSetFromText(data.reply)) onProposedChangeSet?.(data.reply);
      setFiles([]);
      update({
        modelSuggestions: {
          ...d.modelSuggestions,
          conversation: [...applyAttachmentNotes([userMessage], data.attachmentNotes), assistant],
          conversationMeta: meta,
          conversationState: data.state,
          conversationNextStep: data.triage === 'CRISIS' ? '' : data.nextStep || '',
          conversationCrisis: data.triage === 'CRISIS',
          pendingSend: undefined,
        },
        interactionState: 'PREVIEW_READY',
      });
      if (data.document) void archiveAgentDocument(data.document, d.id);
    });
  };

  const onDragOver = (e: React.DragEvent) => {
    if (busy || !e.dataTransfer?.types?.includes('Files')) return;
    e.preventDefault();
    e.stopPropagation();
    setDragOver(true);
  };
  const onDragLeave = (e: React.DragEvent) => {
    e.preventDefault();
    setDragOver(false);
  };
  const onDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setDragOver(false);
    if (busy) return;
    const list = e.dataTransfer?.files;
    if (list?.length) {
      window.dispatchEvent(new CustomEvent('be:attach-files', { detail: { files: Array.from(list) } }));
    }
  };
  const onPaste = (e: React.ClipboardEvent) => {
    if (busy) return;
    const items = e.clipboardData?.items;
    if (!items) return;
    const pasted: File[] = [];
    for (let i = 0; i < items.length; i++) {
      const it = items[i];
      if (it.kind === 'file') {
        const f = it.getAsFile();
        if (f) pasted.push(f);
      }
    }
    if (pasted.length) {
      e.preventDefault();
      window.dispatchEvent(new CustomEvent('be:attach-files', { detail: { files: pasted } }));
    }
  };

  return (
    <div
      className={`conversation-shell${dragOver ? ' drag-over' : ''}`}
      onDragOver={onDragOver}
      onDragLeave={onDragLeave}
      onDrop={onDrop}
    >
      {dragOver && <div className="drag-overlay" aria-hidden>Drop files to attach</div>}
      <div className="conversation-entry">
        <div className="conversation-promise">
          Not advice. We help you find what you do not know yet.
        </div>
        <div className="conversation-chips" role="group" aria-label="How do you want to start?">
          {INTENT_CHIPS.map((c) => (
            <button key={c.id} type="button" className={`chip ${c.id === intent ? 'active' : ''}`} onClick={() => setIntent(c.id)}>
              {c.label}
            </button>
          ))}
        </div>
        <AutoTextarea
          className="story-input conversation-input"
          rows={7}
          autoFocus
          dir="auto"
          placeholder={chip.hint}
          value={b.decision}
          onChange={(e) => {
            const v = e.target.value;
            setB({ decision: v });
            update({ title: v.slice(0, 80) || d.title });
          }}
          onKeyDown={(e) => {
            if ((e.ctrlKey || e.metaKey) && e.key === 'Enter') submit();
          }}
          onPaste={onPaste}
        />
        {distress && <SafetyBox />}
        <FilesPanel
          files={files}
          onFilesChange={setFiles}
          disabled={busy}
          expertMode={false}
          title={d.title || b.decision.slice(0, 40) || 'Decision'}
          history={[]}
        />
        <div className="conversation-entry-actions">
          <button className="primary" disabled={!canContinue || busy} onClick={submit}>{busy ? 'Thinking…' : 'Send'} <ArrowRight size={16} /></button>
          <span className="conversation-hint">Ctrl/Cmd + Enter</span>
        </div>
      </div>
    </div>
  );
}

// --- SHARED CONVERSATION CONTEXT ---
// The conversation is a single shared state. In Expert the part that existed before the method
// steps is shown once, collapsed, here; later messages appear in the open dialogue at the bottom.
// No new AI request is made by this component.
export function SharedConversationContext({ d, upTo, onDocumentEdit }: { d: Decision; upTo: number; onDocumentEdit?: (index: number, next: DocumentSpec) => void }) {
  const full: any[] = Array.isArray(d.modelSuggestions?.conversation) ? d.modelSuggestions!.conversation! : [];
  const history = full.slice(0, upTo);
  if (!history.length) return null;
  const line = questionLine(history);
  return (
    <details className="expert-history" data-testid="expert-history">
      <summary>
        <span className="expert-history-label">Earlier conversation</span>
        {line && <span className="expert-history-q" translate="no" dir="auto">{line}</span>}
      </summary>
      <div className="expert-history-body conversation-thread">
        {history.map((m: any, i: number) => (
          <div key={i} className={`conversation-message ${m.role === 'user' ? 'user' : 'assistant'}`}>
            <div className="conversation-message-text" translate="no" dir="auto">{m.content}</div>
            <MessageExtras message={m} onDocumentEdit={onDocumentEdit ? (next) => onDocumentEdit(i, next) : undefined} />
          </div>
        ))}
      </div>
    </details>
  );
}

// --- CONVERSATION ---
export function ConversationScreen({
  d,
  update,
  runApi,
  busy,
  onDocumentEdit,
  onProposedChangeSet,
  alwaysShowComposer,
  expert,
  startAt = 0,
}: {
  expert?: boolean;
  /** Expert: first history index to show; earlier messages live in the collapsed history above. */
  startAt?: number;
  d: Decision;
  update: (p: Partial<Decision> | ((x: Decision) => Decision)) => void;
  runApi: (path: string, body: unknown, onOk: (data: any, meta: any) => void) => void;
  busy: boolean;
  onDocumentEdit?: (index: number, next: DocumentSpec) => void;
  onProposedChangeSet?: (text: string | null) => void;
  /** Expert: keep the message box visible even mid-method. */
  alwaysShowComposer?: boolean;
}) {
  const [input, setInput] = useState('');
  const [files, setFiles] = useState<Attachment[]>([]);
  const [dragOver, setDragOver] = useState(false);
  const ms: any = d.modelSuggestions || {};
  const history: any[] = Array.isArray(ms.conversation) ? ms.conversation : [];
  const waitingForAssistant = history.length > 0 && history[history.length - 1]?.role === 'user';
  const nextStep: string = typeof ms.conversationNextStep === 'string' ? ms.conversationNextStep : '';
  const lastAssistant = [...history].reverse().find((m: any) => m.role === 'assistant');
  const askedQuestion = !!lastAssistant && /[?\uFF1F\u061F]\s*$/.test(String(lastAssistant.content || '').split('\n---\n')[0].trim());
  const distress =
    !!ms.conversationCrisis ||
    !!findDistressInTexts([input, ...history.filter((m: any) => m.role === 'user').slice(-3).map((m: any) => m.content)]);

  // Pending payload kept so Retry can re-send after a network / model failure.
  // Also restored from modelSuggestions.pendingSend (set by BriefScreen on first send).
  const pendingRef = useRef<{ text: string; files: Attachment[]; intent?: string } | null>(
    ms.pendingSend && typeof ms.pendingSend.text === 'string'
      ? { text: ms.pendingSend.text, files: Array.isArray(ms.pendingSend.files) ? ms.pendingSend.files : [], intent: ms.pendingSend.intent }
      : null,
  );

  const send = (override?: string, intent?: string, fromRetry?: boolean, filesOverride?: Attachment[]) => {
    const activeFiles = filesOverride ?? files;
    const text = (override ?? input).trim() || (activeFiles.length ? attachmentOnlyText(activeFiles) : '');
    if (!text || busy) return;
    window.dispatchEvent(new CustomEvent('be:user-language', { detail: { text } }));
    const lastAt: number | undefined = history.length ? history[history.length - 1]?.at : undefined;
    const days = lastAt ? Math.floor((Date.now() - lastAt) / 86400000) : 0;
    // On retry the last history item is already the user message we are resending.
    const baseHistory = fromRetry && waitingForAssistant ? history.slice(0, -1) : history;
    const userMsg = { role: 'user' as const, content: text, at: Date.now(), ...(activeFiles.length ? { attachments: activeFiles } : {}) };
    const nextHistory = [...baseHistory, userMsg];
    const pending = { text, files: [...activeFiles], intent };
    pendingRef.current = pending;
    setInput('');
    setFiles([]);
    update({
      modelSuggestions: { ...d.modelSuggestions, conversation: nextHistory, pendingSend: pending },
      interactionState: 'UNDERSTANDING',
    });
    runApi(
      '/api/conversation',
      fitRequest({ brief: d.brief, history: historyForRequest(nextHistory), attachments: collectDecisionAttachments(d, nextHistory), state: ms.conversationState, intent, returningAfterDays: days >= 1 ? days : undefined, ...expertConversationFields(d, expert) }),
      (data, meta) => {
        pendingRef.current = null;
        update({
          modelSuggestions: {
            ...d.modelSuggestions,
            conversation: [...applyAttachmentNotes(nextHistory, data.attachmentNotes), { role: 'assistant', content: data.reply, at: Date.now(), ...(data.document ? { document: data.document } : {}) }],
            conversationMeta: meta,
            conversationState: data.state ?? ms.conversationState,
            conversationNextStep: data.triage === 'CRISIS' ? '' : data.nextStep || nextStep,
            conversationCrisis: data.triage === 'CRISIS',
            pendingSend: undefined,
          },
          interactionState: 'PREVIEW_READY',
        });
        if (typeof data.reply === 'string' && parseChangeSetFromText(data.reply)) onProposedChangeSet?.(data.reply);
        if (data.document) void archiveAgentDocument(data.document, d.id);
      },
    );
  };

  const retry = () => {
    const fromStore = ms.pendingSend && typeof ms.pendingSend.text === 'string'
      ? { text: ms.pendingSend.text, files: Array.isArray(ms.pendingSend.files) ? ms.pendingSend.files : [], intent: ms.pendingSend.intent }
      : null;
    const p = pendingRef.current || fromStore;
    if (!p || busy) return;
    // Fallback: resend last user message text from history if files were lost.
    if (!p.text && waitingForAssistant) {
      const last = history[history.length - 1];
      if (last?.role === 'user') {
        send(String(last.content || ''), undefined, true, Array.isArray(last.attachments) ? last.attachments : []);
        return;
      }
    }
    send(p.text, p.intent, true, p.files);
  };

  // Drag-and-drop onto the conversation shell
  const onDragOver = (e: React.DragEvent) => {
    if (busy || !e.dataTransfer?.types?.includes('Files')) return;
    e.preventDefault();
    e.stopPropagation();
    setDragOver(true);
  };
  const onDragLeave = (e: React.DragEvent) => {
    e.preventDefault();
    setDragOver(false);
  };
  const onDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setDragOver(false);
    if (busy) return;
    const list = e.dataTransfer?.files;
    if (list?.length) {
      window.dispatchEvent(new CustomEvent('be:attach-files', { detail: { files: Array.from(list) } }));
    }
  };

  // Paste image / files from clipboard into the composer
  const onPaste = (e: React.ClipboardEvent) => {
    if (busy) return;
    const items = e.clipboardData?.items;
    if (!items) return;
    const files: File[] = [];
    for (let i = 0; i < items.length; i++) {
      const it = items[i];
      if (it.kind === 'file') {
        const f = it.getAsFile();
        if (f) files.push(f);
      }
    }
    if (files.length) {
      e.preventDefault();
      window.dispatchEvent(new CustomEvent('be:attach-files', { detail: { files } }));
    }
  };

  return (
    <div
      className={`conversation-shell${dragOver ? ' drag-over' : ''}`}
      onDragOver={onDragOver}
      onDragLeave={onDragLeave}
      onDrop={onDrop}
    >
      {dragOver && <div className="drag-overlay" aria-hidden>Drop files to attach</div>}
      <div className="conversation-thread">
        {history.map((m: any, i: number) => i < startAt ? null : (
          <div key={i} className={`conversation-message ${m.role === 'user' ? 'user' : 'assistant'}`}>
            <div className="conversation-message-text" translate="no" dir="auto">{m.content}</div>
            <MessageExtras message={m} onDocumentEdit={onDocumentEdit ? (next) => onDocumentEdit(i, next) : undefined} />
            {m.role === 'assistant' && !m.document && i === history.map((x: any) => x.role).lastIndexOf('assistant') && String(m.content || '').length >= 120 && !String(m.content).includes('\n---\n') && <CopyButton title={d.title} text={String(m.content)} />}
            {/* Retry under the last user message when the assistant never answered */}
            {m.role === 'user' && i === history.length - 1 && waitingForAssistant && !busy && (
              <div className="message-retry">
                <button type="button" className="ghost retry-button" onClick={retry} aria-label="Retry">
                  <RotateCcw size={14} /> Retry
                </button>
                <span className="conversation-hint">No reply yet — try again</span>
              </div>
            )}
          </div>
        ))}
        {busy && <div className="conversation-message assistant"><div className="conversation-message-text conversation-thinking">Looking at your specific situation…</div></div>}
      </div>
      {distress && <SafetyBox />}
      {nextStep && !busy && !ms.conversationCrisis && history.length > startAt && (
        <div className="conversation-note assistant-surface">
          <span className="conversation-note-label">Next useful step: </span>
          <span translate="no" dir="auto">{nextStep}</span>
        </div>
      )}
      {/* Stage 2: permanent Files panel — always two buttons, both modes */}
      <FilesPanel
        files={files}
        onFilesChange={setFiles}
        disabled={busy}
        expertMode={!!expert}
        title={d.title}
        history={history}
        canCalendar={Array.isArray(d.brief?.reviewDates) && d.brief.reviewDates.length > 0}
        onAgentSummary={() => send(input.trim() ? input : DOCUMENT_REQUEST, 'DOCUMENT')}
        onCalendar={() => icsDownload(d)}
        buildFullReview={expert ? () => decisionToDocument(d) : undefined}
      />
      {(alwaysShowComposer || history.some((m: any) => m.role === 'assistant')) && !waitingForAssistant && !busy && (
        <div className="conversation-composer">
          <AutoTextarea
            value={input}
            dir="auto"
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={(e) => { if ((e.ctrlKey || e.metaKey) && e.key === 'Enter') send(); }}
            onPaste={onPaste}
            placeholder={
              alwaysShowComposer
                ? 'Clarify a fact, ask a question, or add something the steps missed…'
                : askedQuestion
                  ? 'Your answer. “I don’t know” is a fine answer too.'
                  : 'Anything to add, or something you want to look at next?'
            }
            rows={3}
          />
          <button className="primary" disabled={!input.trim() && !files.length} onClick={() => send()}>Send <ArrowRight size={16} /></button>
        </div>
      )}
    </div>
  );
}

