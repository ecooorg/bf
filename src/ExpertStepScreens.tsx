/** Expert/Simple step screens extracted from App.tsx (p74). Behaviour unchanged. */
import React, { Component, ErrorInfo, useEffect, useMemo, useState, useCallback, useRef } from 'react';
import {
  AlertCircle, ArrowLeft, ArrowRight, BrainCircuit, Check, CircleHelp,
  Download, FlaskConical, KeyRound, Lock, Plus, ShieldAlert, Trash2, Upload,
  Cloud, CloudUpload, History as HistoryIcon, MoreHorizontal, SlidersHorizontal,
  RotateCcw, FolderOpen,
} from 'lucide-react';
import {
  Decision, emptyDecision, STAGES, LOOPS, Step, Option, ExperimentCard,
  Hypothesis, NeutralItem, Unknown, uid, computeReviewDates, SCHEMA_VERSION,
  Level, Door, HumanDecision, JournalEntry,
} from './decision.ts';
import {
  getStoredDecisions, saveDecisions, getActiveDecisionId, setActiveDecisionId,
  getMigrationReport, getArchived,
} from './storage.ts';
import { exportDecisionJson, exportAllJson, downloadBlob, parseImportedJson, parseImportedBackup } from './exportZip.ts';
import { DISTRESS_MARKERS, SUPPORT_CONTACTS, hasDistressMarker } from './support.ts';
import { FEATURES } from './config.ts';
import { exportFileName } from './exportName.ts';
import { useDrive } from './useDrive.ts';
import { HistoryPanel } from './HistoryPanel.tsx';
import { AutoInput, AutoTextarea } from './AutoGrow.tsx';
import { decisionToDocument } from './decisionDocument.ts';
import { ProgramFilesManager } from './ConversationFiles.tsx';
import { WorkspacePanel, isFolderPickerSupported, PICK_FOLDER_EVENT } from './WorkspacePanel.tsx';
import { migrateAttachmentsFromDecisions, exportProgramFilesPayload, importProgramFilesPayload, archiveAttachment } from './programFiles.ts';
import { en } from './en.ts';
import { triage, TRIAGE_OUTCOME_TEXT, TRIAGE_OUTCOME_LABEL } from './triage.ts';
import { evpi, evpiRange, evpiVerdict, validateEvpiInput } from './evpi.ts';
import { brierScore } from './brier.ts';
import { cardChecksum } from './sha256Export.ts';
import { detectUiLanguage, installUiLanguage, getStoredUiLanguage } from './ui.ts';
import { errorFromResponse, localizedException } from './errors.ts';
import { documentToMarkdown, libraryToDocument, planImport, importReport } from './libraryExport.ts';
import { saveDocumentToGoogleDocs } from './driveExport.ts';
import { isDriveConfigured } from './driveClient.ts';
import { downloadDocument, uploadAttachment } from './attachments.ts';
import { mirrorUserFile, setMirrorMode } from './driveMirror.ts';
import { ModeMenu, START_MODE_KEY, type AppMode } from './ModeMenu.tsx';
import { UserGuideModal } from './UserGuide.tsx';
import { ExpertSidebar, ExpertBottomBar } from './ExpertNav.tsx';
import { expertBaseline } from './expertHistory.ts';
import { STEP_TITLE } from './uiTerms.ts';
import { StateNotice, driveLabel as sharedDriveLabel, driveTitle, historyLabel, HISTORY_OFF_TITLE } from './uiStates.tsx';
import { briefSections, BRIEF_EMPTY_TEXT } from './briefView.ts';

export function AssistantMessage({ children }: { children: React.ReactNode }) {
  return (
    <div className="panel expert-result-card assistant-surface" style={{ margin: '0 0 16px', lineHeight: 1.7 }}>
      <div>{children}</div>
    </div>
  );
}

export function StepTitle({ step }: { step: Step }) {
  const t = STEP_TITLE[step];
  if (!t) return null;
  return (
    <header className="xn-title" data-testid="step-title">
      <h1>{t.title}</h1>
      <p>{t.hint}</p>
    </header>
  );
}

// --- TRIAGE ---

export function TriageScreen({
  d,
  update,
  onContinue,
}: {
  d: Decision;
  update: (p: Partial<Decision> | ((x: Decision) => Decision)) => void;
  onContinue: () => void;
}) {
  const t = d.triage || {
    crisis: false,
    onlyValues: false,
    q: { costly: false, hardToUndo: false, resolvableUnknowns: false, longHorizon: false },
    outcome: 'OVERKILL' as const,
  };

  const setT = (patch: Partial<typeof t>) => {
    const next = { ...t, ...patch };
    if (patch.q) next.q = { ...t.q, ...patch.q };
    const outcome = triage({
      crisis: next.crisis,
      onlyValues: next.onlyValues,
      ...next.q,
    });
    next.outcome = outcome;
    update({ triage: next });
  };

  // Quick start: if user needs urgent help — stop. No protocol.
  const crisisBlocked = !!t.crisis;

  return (
    <div className="panel">
      <div className="alert" style={{ marginBottom: 16 }}>
        <strong>{en.crisisTitle}</strong>
        <div style={{ marginTop: 8, display: 'flex', gap: 8 }}>
          <button
            className={t.crisis ? 'primary' : 'ghost'}
            onClick={() => setT({ crisis: true, crisisConfirmed: false })}
          >
            Yes
          </button>
          <button
            className={!t.crisis ? 'primary' : 'ghost'}
            onClick={() => setT({ crisis: false, crisisConfirmed: false })}
          >
            No
          </button>
        </div>
      </div>
      {t.crisis && (
        <div className="alert error">
          <strong>Please pause.</strong> {en.crisisYes}
          {SUPPORT_CONTACTS.length > 0 && (
            <ul>
              {SUPPORT_CONTACTS.map((c, i) => (
                <li key={i}>
                  {c.label}: {c.value}
                </li>
              ))}
            </ul>
          )}
          <p style={{ marginTop: 8, fontSize: 13 }}>
            Do not use this decision tool in this state. If things improve, come back and answer “No”.
          </p>
        </div>
      )}
      {!crisisBlocked && (
        <>
          <div className="triage-grid" style={{ display: 'grid', gap: 10, marginTop: 16 }}>
            <strong style={{ gridColumn: '1 / -1' }}>Tick what applies</strong>
            {(
              [
                ['costly', 'A wrong choice would cost a lot'],
                ['hardToUndo', 'It would be hard to undo'],
                ['resolvableUnknowns', 'I can still find out important things'],
                ['longHorizon', 'The effects would last years'],
              ] as const
            ).map(([key, label]) => (
              <label key={key} style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
                <input
                  type="checkbox"
                  checked={t.q[key]}
                  onChange={(e) => setT({ q: { ...t.q, [key]: e.target.checked } })}
                />
                {label}
              </label>
            ))}
            <label style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
              <input
                type="checkbox"
                checked={t.onlyValues}
                onChange={(e) => setT({ onlyValues: e.target.checked })}
              />
              It is only about my values, nothing to check
            </label>
          </div>
          {(t.confirmed || t.onlyValues || Object.values(t.q).some(Boolean)) && (
            <div className="alert" style={{ marginTop: 16 }}>
              <b>{TRIAGE_OUTCOME_LABEL[t.outcome]}</b> — {TRIAGE_OUTCOME_TEXT[t.outcome]}
            </div>
          )}
          <div className="actions" style={{ marginTop: 16 }}>
            <button
              className="primary"
              disabled={crisisBlocked}
              onClick={() => {
                update({
                  triage: { ...t, confirmed: true },
                  brief: {
                    ...d.brief,
                    errorCost: {
                      ...d.brief.errorCost,
                      preliminary: t.q.costly ? 'HIGH' : 'LOW',
                    },
                    reversibility: {
                      ...d.brief.reversibility,
                      preliminary: t.q.hardToUndo ? 'ONE_WAY' : 'TWO_WAY',
                    },
                  },
                });
                onContinue();
              }}
            >
              Continue <ArrowRight size={16} />
            </button>
          </div>
        </>
      )}
    </div>
  );
}

// Model output remains unrestricted. This display-only pass prevents a model-invented
// numeric example from looking like a user-provided or calculated value. It never retries
// or rejects an AI response.
export function sanitizeDisplayExample(text: unknown, userText: string): string {
  const value = String(text || '').trim();
  if (!value) return '';
  if (!/(?:например|допустим|условно|к примеру|скажем|for example|e\.g\.|suppose|let'?s say|say,?)/i.test(value)) return value;
  const userNumbers = new Set((userText.match(/-?\d+(?:[.,]\d+)?/g) || []).map((n) => n.replace(',', '.')));
  const actionNumbers = value.match(/-?\d+(?:[.,]\d+)?/g) || [];
  const hasUngroundedNumber = actionNumbers.some((n) => !userNumbers.has(n.replace(',', '.')));
  if (!hasUngroundedNumber) return value;

  // Keep the action, remove only the unsupported illustrative figure.
  return value
    .replace(/(?:например|допустим|условно|к примеру|скажем)\s+(?:около\s+|примерно\s+)?-?\d+(?:[.,]\d+)?(?:\s*(?:евро|€|доллар(?:ов|а)?|\$|%|процентов?))?/gi, 'небольшой тестовый бюджет')
    .replace(/(?:for example|e\.g\.|suppose|let'?s say)\s+(?:about\s+|around\s+)?-?\d+(?:[.,]\d+)?(?:\s*(?:eur|euro|€|usd|\$|%|percent))?/gi, 'a small test budget')
    .replace(/\s{2,}/g, ' ')
    .trim();
}

// --- UNDERSTAND ---
export function UnderstandScreen({
  d,
  update,
  runApi,
  busy,
}: {
  d: Decision;
  update: (p: Partial<Decision> | ((x: Decision) => Decision)) => void;
  runApi: (path: string, body: unknown, onOk: (data: any, meta: any) => void) => void;
  busy: boolean;
}) {
  const [answer, setAnswer] = useState('');
  const understandStarted = useRef(false);
  const preview: any = d.modelSuggestions?.preview;
  const unknowns = d.radar?.unknowns || [];
  const open = unknowns.filter((u) => u.critical && !u.discarded && !u.answer && u.status !== 'USER_UNKNOWN' && u.status !== 'ACCEPTED_UNCERTAINTY');
  const current = open[0];

  useEffect(() => {
    const analysisVersion = (d.radar as any)?.meta?.expertAnalysisVersion;
    const analysisIsCurrent = analysisVersion === 'v4';
    if (analysisIsCurrent || busy || understandStarted.current || !d.brief.decision) return;
    understandStarted.current = true;
    runApi('/api/understand', { brief: d.brief, history: d.modelSuggestions?.conversation || [] }, (data, meta) => {
      const neutralItems = data?.neutralization?.items || [];
      const radarData = data?.radar || {};
      const mapClaim = (c: any, kind: string) => ({
        id: c.id || uid('c'), kind: kind as any, text: c.text || '', source: c.source || 'USER_DATA',
        sourceType: 'MODEL' as const, status: 'UNRESOLVED' as const, evidenceIds: [],
        createdAt: Date.now(), updatedAt: Date.now(), userImportance: c.userImportance,
      });
      const radar = {
        facts: (radarData.facts || []).map((c: any) => ({ ...mapClaim(c, 'FACT'), provenance: c.provenance || 'KNOWN' })),
        assumptions: (radarData.assumptions || []).map((c: any) => ({ ...mapClaim(c, 'ASSUMPTION'), provenance: c.provenance || 'ASSUMPTION' })),
        examples: (radarData.examples || []).map((c: any) => ({ ...mapClaim(c, 'ASSUMPTION'), provenance: 'EXAMPLE', source: 'USER_EXAMPLE' })),
        interpretations: (radarData.interpretations || []).map((c: any) => mapClaim(c, 'INTERPRETATION')),
        values: (radarData.values || []).map((c: any) => mapClaim(c, 'VALUE')),
        needsExternalCheck: (radarData.needsExternalCheck || []).map((c: any) => mapClaim(c, 'EXTERNAL_VERIFY')),
        unknowns: (radarData.unknowns || []).map((u: any) => ({
          id: u.id || uid('u'), kind: 'UNKNOWN' as const, text: u.question || '', source: u.source || 'USER_DATA',
          sourceType: 'MODEL' as const, status: 'UNRESOLVED' as const, evidenceIds: [], createdAt: Date.now(), updatedAt: Date.now(),
          question: u.question || '', whyChangesDecision: u.whyChangesDecision || '', howToFindOut: u.howToFindOut || '',
          effort: u.effort || 'DAYS', branchIfA: u.branchIfA || { answer: '', leadsTo: '' }, branchIfB: u.branchIfB || { answer: '', leadsTo: '' },
          critical: !!u.critical, owner: u.owner || 'You',
        })),
        meta: { ...meta, expertAnalysisVersion: 'v4' },
      };
      update({
        neutralization: neutralItems.map((it: any) => ({ id: it.id || uid('n'), original: it.original || '', kind: it.kind || 'KEEP', neutralQuestion: it.neutralQuestion, userChoice: 'ACCEPT' as const })),
        neutralizationConfirmed: true,
        radar,
        interactionState: 'UNDERSTANDING',
      });
    });
  }, [d.radar, busy, d.brief.decision]);

  const resolveCurrent = (status: 'ANSWER' | 'UNKNOWN' | 'ACCEPT') => {
    if (!current) return;
    const next = unknowns.map((u) => u.id === current.id ? {
      ...u,
      status: status === 'ANSWER' ? 'USER_CONFIRMED' as const : status === 'UNKNOWN' ? 'USER_UNKNOWN' as const : 'ACCEPTED_UNCERTAINTY' as const,
      answer: status === 'ANSWER' ? answer.trim() : undefined,
      owner: u.owner || 'You',
    } : u);
    update({ radar: { ...d.radar!, unknowns: next } });
    setAnswer('');
  };

  const goToOptions = () => {
    if (!d.radar) return;
    runApi('/api/expand', { brief: d.brief, radar: d.radar, myOptions: d.brief.myOptions }, (data, meta) => {
      const modelOpts: Option[] = (data.options || []).map((o: any) => ({
        id: o.id || uid('opt'), title: o.title || '', description: o.description || '', byUser: false,
        kind: o.kind, keyAssumption: o.keyAssumption || '', exitCost: o.exitCost || '', cheapestTest: o.cheapestTest || '',
        door: o.door || 'TWO_WAY', realistic: 'UNKNOWN' as const, linkedUnknownIds: o.linkedUnknownIds || [],
      }));
      const userOpts = d.brief.myOptions.filter((o) => o.title.trim()).map((o) => ({
        id: o.id, title: o.title, description: '', byUser: true, keyAssumption: '', exitCost: '', cheapestTest: '', door: 'TWO_WAY' as Door, realistic: 'YES' as const, linkedUnknownIds: [],
      }));
      update({ knowledgeMap: { ...(data.knowledgeMap || {}), meta, confirmed: true }, options: [...userOpts, ...modelOpts], step: 'EXPAND', interactionState: 'OPTIONS_READY' });
    });
  };

  const compact = (value: unknown) => String(value || '').replace(/\s+/g, ' ').trim();
  const normalizeForCompare = (value: unknown) => compact(value).toLocaleLowerCase().replace(/[^\p{L}\p{N}%€$£]+/gu, ' ');
  const isUseful = (value: unknown) => {
    const text = compact(value);
    if (text.length < 8) return false;
    if (/^(?:unknown|unknown\.|not specified|not provided|none|n\/a)$/i.test(text)) return false;
    if (/^(?:consider your options|analyze the situation|collect more information|provide more details)$/i.test(text)) return false;
    return true;
  };
  const list = (items: any[] | undefined, max = 6) => {
    const seen = new Set<string>();
    return (items || []).filter((x) => {
      if (!x?.text || !isUseful(x.text)) return false;
      const key = normalizeForCompare(x.text);
      if (!key || seen.has(key)) return false;
      seen.add(key);
      return true;
    }).slice(0, max);
  };
  const textList = (items: any[] | undefined, max = 6) => {
    const seen = new Set<string>();
    return (items || []).filter((x) => {
      if (!isUseful(x)) return false;
      const key = normalizeForCompare(x);
      if (!key || seen.has(key)) return false;
      seen.add(key);
      return true;
    }).slice(0, max).map((x) => compact(x));
  };
  const facts = list(d.radar?.facts, 8);
  const summary = compact((d.radar as any)?.decisionSummary);
  const situation = textList((d.radar as any)?.currentSituation, 5).filter((x: string) => {
    const text = normalizeForCompare(x);
    return !facts.some((f: any) => normalizeForCompare(f.text) === text);
  });

  // Facts and the short situation are already present in the user's conversation.
  // Keep them as grounding data internally, but do not repeat them in the main result.
  const references = [summary, ...situation, ...facts.map((x: any) => x.text)].filter(Boolean).map(normalizeForCompare);
  const isRedundantWithGrounding = (text: string) => {
    const tokens = new Set(normalizeForCompare(text).split(/\s+/).filter(Boolean));
    if (tokens.size < 5) return references.includes(normalizeForCompare(text));
    return references.some((ref) => {
      const rt = new Set(ref.split(/\s+/).filter(Boolean));
      const overlap = [...tokens].filter((t) => rt.has(t)).length;
      return overlap / Math.max(tokens.size, rt.size) >= 0.78;
    });
  };

  const assumptions = list(d.radar?.assumptions, 8).filter((x: any) => !isRedundantWithGrounding(x.text));
  const examples = list((d.radar as any)?.examples, 8).filter((x: any) => !isRedundantWithGrounding(x.text));
  const interpretations = list(d.radar?.interpretations, 6).filter((x: any) => !isRedundantWithGrounding(x.text));
  const values = list(d.radar?.values, 6).filter((x: any) => !isRedundantWithGrounding(x.text));
  const externalChecks = list(d.radar?.needsExternalCheck, 6).filter((x: any) => !isRedundantWithGrounding(x.text));
  const answered = (d.radar?.unknowns || []).filter((u) => !u.discarded && (u.answer || u.status === 'USER_UNKNOWN' || u.status === 'ACCEPTED_UNCERTAINTY'));
  const unresolved = (d.radar?.unknowns || []).filter((u) => !u.discarded && !u.answer && u.status !== 'USER_UNKNOWN' && u.status !== 'ACCEPTED_UNCERTAINTY');

  const RadarBlock = ({ title, items, hint }: { title: string; items: any[]; hint?: string }) => {
    if (!items.length) return null;
    return (
      <div className="question">
        <div className="listhead">{title}</div>
        {hint && <div className="expert-info-hint">{hint}</div>}
        <ul>
          {items.map((x, i) => (
            <li key={x.id || i} dir="auto">
              {x.text}
              {x.provenance === 'EXAMPLE' && <span className="expert-info-hint" style={{ display: 'inline', marginLeft: 8 }}>example</span>}
            </li>
          ))}
        </ul>
      </div>
    );
  };

  return (
    <div className="friendly-flow">
      {!d.radar && busy && (
        <AssistantMessage>
          <p style={{ marginTop: 0 }}>Looking at the specific facts and unknowns in your situation…</p>
        </AssistantMessage>
      )}

      {d.radar && (
        <>
          {(Boolean(summary) || assumptions.length > 0 || examples.length > 0 || interpretations.length > 0 || values.length > 0 || externalChecks.length > 0) && (
            <AssistantMessage>
              {summary && (
                <div className="question">
                  <div className="listhead">YOUR DECISION</div>
                  <p style={{ marginBottom: 0 }} dir="auto">{summary}</p>
                </div>
              )}
              <RadarBlock title="What is still an assumption" items={assumptions} />
              <RadarBlock title="Examples and hypothetical values" items={examples} />
              <RadarBlock title="What may be an interpretation" items={interpretations} />
              <RadarBlock title="What matters to you" items={values} />
              <RadarBlock title="What needs an outside check" items={externalChecks} />
            </AssistantMessage>
          )}

          {Array.isArray((d.radar as any)?.nextActions) && (d.radar as any).nextActions.length > 0 && (
            <AssistantMessage>
              <div className="listhead">Next useful actions</div>
              <div className="cards">
                {(d.radar as any).nextActions.slice(0, 5).map((a: any, i: number) => {
                  const userText = [
                    d.brief?.decision,
                    ...((d.modelSuggestions?.conversation || []) as any[])
                      .filter((m: any) => m?.role === 'user')
                      .map((m: any) => m.content),
                  ].join(' ');
                  return (
                    <div className="option" key={i}>
                      <div className="optiontop" dir="auto">{sanitizeDisplayExample(a.action || a.title || `Action ${i + 1}`, userText)}</div>
                      {a.why && <div className="option-copy" dir="auto"><b className="ui-label">Why:</b> {sanitizeDisplayExample(a.why, userText)}</div>}
                      {a.measure && <div className="option-copy" dir="auto"><b className="ui-label">What to measure:</b> {sanitizeDisplayExample(a.measure, userText)}</div>}
                      {a.decisionEffect && <div className="option-copy" dir="auto"><b className="ui-label">What changes if the result is different:</b> {sanitizeDisplayExample(a.decisionEffect, userText)}</div>}
                    </div>
                  );
                })}
              </div>
            </AssistantMessage>
          )}

          {answered.length > 0 && (
            <div className="panel expert-result-card assistant-surface answered-card" style={{ margin: '0 0 16px', lineHeight: 1.7 }}>
              <div className="listhead">Your answers</div>
              <ul>
                {answered.map((u) => (
                  <li key={u.id} style={{ marginBottom: 12 }}>
                    <div className="open-question" dir="auto">{u.question}</div>
                    <div className="user-text answered-reply" dir="auto">{u.answer ? u.answer : "I don't know"}</div>
                  </li>
                ))}
              </ul>
              {unresolved.length > 0 && <div className="open-why" style={{ marginTop: 4 }}>Saved. The next question is below. Your answers are taken into account when the possible paths are built.</div>}
            </div>
          )}

          {unresolved.length > 0 ? (
            <AssistantMessage>
              <div className="listhead">Open questions</div>
              <ul>
                {unresolved.slice(0, 5).map((u) => (
                  <li key={u.id} style={{ marginBottom: 10 }}>
                    <div className="open-question" dir="auto">{u.question}</div>
                    {u.whyChangesDecision && <div className="open-why" style={{ marginTop: 3 }} dir="auto">{u.whyChangesDecision}</div>}
                    {u === current && (
                      <div className="question" style={{ marginTop: 10 }}>
                        {u.howToFindOut && <p dir="auto"><b className="ui-label">How to find out:</b> {u.howToFindOut}</p>}
                        <AutoTextarea className="open-question-input" value={answer} onChange={(e) => setAnswer(e.target.value)} placeholder="Your answer, or leave it blank if you do not know" rows={4} style={{ width: '100%' }} />
                        <div className="actions" style={{ marginTop: 10 }}>
                          <button className="primary" disabled={!answer.trim() || busy} onClick={() => resolveCurrent('ANSWER')}>Answer <ArrowRight size={16} /></button>
                          <button className="ghost" disabled={busy} onClick={() => resolveCurrent('UNKNOWN')}>I don't know</button>
                        </div>
                      </div>
                    )}
                  </li>
                ))}
              </ul>
            </AssistantMessage>
          ) : (
            <AssistantMessage>
              <button className="primary" disabled={busy} onClick={goToOptions}>See the possible paths <ArrowRight size={16} /></button>
            </AssistantMessage>
          )}
        </>
      )}
    </div>
  );
}

// --- EXPAND ---
export function ExpandScreen({ d, update, busy }: { d: Decision; update: (p: Partial<Decision> | ((x: Decision) => Decision)) => void; runApi?: any; busy: boolean; }) {
  const visible = d.options.filter((o) => o.realistic !== 'NO');
  return (
    <div className="friendly-flow">
      <AssistantMessage>
        <p style={{ marginTop: 0 }}>We have widened the decision beyond the original framing. These are possibilities to consider — not recommendations.</p>
        <p>Here are the main possibilities to keep on the table:</p>
        <div className="cards">
          {visible.map((o) => (
            <div key={o.id} className="option">
              <div className="optiontop">{o.title}</div>
              {o.description && <div className="option-copy">{o.description}</div>}
              {o.keyAssumption && <div><b className="ui-label">Key assumption:</b> {o.keyAssumption}</div>}
              {o.exitCost && <div><b className="ui-label">If it is wrong:</b> {o.exitCost}</div>}
              {o.cheapestTest && <div><b className="ui-label">Cheapest useful check:</b> {o.cheapestTest}</div>}
            </div>
          ))}
        </div>
        <p>Next: what would we need to learn to trust one of these?</p>
        <div className="actions">
          <button className="primary" disabled={busy || visible.length < 2} onClick={() => update({ step: 'ATTACK', interactionState: 'ATTACK_READY' })}>Let’s test what could go wrong <ArrowRight size={16} /></button>
          <button className="ghost" onClick={() => update({ step: 'DECIDE', interactionState: 'USER_SATISFIED' })}>I have enough to decide</button>
        </div>
      </AssistantMessage>
    </div>
  );
}

// --- ATTACK ---
export function AttackScreen({
  d,
  update,
  runApi,
  busy,
}: {
  d: Decision;
  update: (p: Partial<Decision> | ((x: Decision) => Decision)) => void;
  runApi: (path: string, body: unknown, onOk: (data: any, meta: any) => void) => void;
  busy: boolean;
}) {
  const real = d.options.filter((o) => o.realistic !== 'NO');
  const first = real.find((o) => o.id === d.preferredOptionId) || real[0];
  const second = real.find((o) => o.id === d.oppositeOptionId) || real.find((o) => o.id !== first?.id);
  const tested = d.redTeam.length >= 2;

  const testRisks = () => {
    if (!first || !second) return;
    runApi('/api/redteam-pair', { brief: d.brief, firstOption: first, secondOption: second, radar: d.radar, knowledgeMap: d.knowledgeMap }, (data, meta) => {
      const makeRound = (raw: any, role: 'PREFERRED' | 'OPPOSITE', fallbackId: string) => ({
        targetOptionId: raw?.targetOptionId || fallbackId, role,
        objections: (raw?.objections || []).map((o: any, i: number) => ({
          id: o.id || `${role.toLowerCase()}_obj_${i}`, argument: o.argument || '', hiddenAssumption: o.hiddenAssumption || '',
          failureMode: o.failureMode || '', whatMustBeTrueForCritiqueToBeWeak: o.whatMustBeTrueForCritiqueToBeWeak || '', verifiability: o.verifiability || 'SPECULATION',
        })), meta,
      });
      const rounds = data.rounds || [];
      const a = rounds.find((r: any) => r.role === 'PREFERRED') || rounds[0];
      const b = rounds.find((r: any) => r.role === 'OPPOSITE') || rounds[1];
      update({ preferredOptionId: first.id, oppositeOptionId: second.id, redTeam: [makeRound(a, 'PREFERRED', first.id), makeRound(b, 'OPPOSITE', second.id)] });
    });
  };

  return (
    <div className="friendly-flow">
      <AssistantMessage>
        <p style={{ marginTop: 0 }}>We test every path the same way.</p>
        {!tested && <button className="primary" disabled={busy || !first || !second} onClick={testRisks}>Show me the weak points</button>}
      </AssistantMessage>

      {tested && (
        <>
          {d.redTeam.map((r) => {
            const option = d.options.find((o) => o.id === r.targetOptionId);
            return (
              <AssistantMessage key={r.role}>
                <p style={{ marginTop: 0 }}><b>{option?.title || 'This path'}</b> — what could make it fail</p>
                {r.objections.map((o) => (
                  <div key={o.id} className="attack">
                    <div><b className="ui-label">Concern:</b> {o.argument}</div>
                    {o.hiddenAssumption && <div><b className="ui-label">Hidden assumption:</b> {o.hiddenAssumption}</div>}
                    {o.failureMode && <div><b className="ui-label">Failure mode:</b> {o.failureMode}</div>}
                    {o.whatMustBeTrueForCritiqueToBeWeak && <div><b className="ui-label">What would make this concern weaker:</b> {o.whatMustBeTrueForCritiqueToBeWeak}</div>}
                  </div>
                ))}
              </AssistantMessage>
            );
          })}
          <AssistantMessage>
            <p style={{ marginTop: 0 }}>You do not need to score or approve every objection. The point is simply to notice what deserves checking before you commit.</p>
            <div className="actions">
              <button className="primary" onClick={() => update({ step: 'DECIDE', interactionState: 'SYNTHESIS_READY' })}>I want to make my decision <ArrowRight size={16} /></button>
              <button className="ghost" onClick={() => update({ step: 'TEST', interactionState: 'TEST_READY' })}>I want to test something first</button>
            </div>
          </AssistantMessage>
        </>
      )}
    </div>
  );
}

// --- TEST ---
export function TestScreen({
  d,
  update,
  runApi,
  busy,
}: {
  d: Decision;
  update: (p: Partial<Decision> | ((x: Decision) => Decision)) => void;
  runApi: (path: string, body: unknown, onOk: (data: any, meta: any) => void) => void;
  busy: boolean;
}) {
  const selected = d.hypotheses.filter((h) => h.selectedByUser);
  // Contour 4: each selected hypothesis needs a locked card with metric, deadline, thresholds, forecast
  const allHypsCovered = selected.every((h) => {
    const card = d.experiments.find(
      (e) => e.hypothesisId === h.id && (e.status === 'READY' || e.lockedAt)
    );
    return (
      !!card &&
      !!card.metric?.trim() &&
      !!(card.deadline || (card as any).deadlineWords)?.toString().trim() &&
      !!card.successThreshold?.trim() &&
      !!card.stopThreshold?.trim() &&
      !!card.forecast?.wording?.trim() &&
      card.forecast?.confidence !== undefined
    );
  });
  const finalCostSet = !!d.brief.errorCost?.final;
  const finalRevSet = !!d.brief.reversibility?.final;

  return (
    <div>
      <div className="panel">
        <h2>Experiment drafts</h2>
        <p style={{ fontSize: 12, color: '#7f93aa' }}>
          Each idea needs a metric, a deadline and your forecast.
        </p>
        <button
          className="primary"
          disabled={busy || selected.length < 1}
          onClick={() =>
            runApi(
              '/api/experiment-draft',
              {
                brief: d.brief,
                hypotheses: selected,
                // Pass context from contour 1 so each loop feeds the next
                radar: d.radar,
                knowledgeMap: d.knowledgeMap,
                answeredUnknowns: (d.radar?.unknowns || [])
                  .filter((u) => u.critical && (u.answer || u.status))
                  .map((u) => ({
                    question: u.question || u.text,
                    answer: u.answer,
                    status: u.status,
                    owner: u.owner,
                  })),
              },
              (data) => {
                const locked = d.experiments.filter(
                  (e) => e.status === 'READY' || e.lockedAt || e.status === 'RUNNING' || e.status === 'COMPLETED'
                );
                const lockedHypIds = new Set(locked.map((e) => e.hypothesisId));
                const drafts: ExperimentCard[] = (data.drafts || [])
                  .filter((dr: any) => {
                    const hid = dr.hypothesisId || selected[0]?.id || '';
                    return !lockedHypIds.has(hid);
                  })
                  .map((dr: any) => ({
                    id: uid('exp'),
                    hypothesisId: dr.hypothesisId || selected[0]?.id || '',
                    whyCritical: dr.whyCritical || '',
                    test: dr.test || '',
                    metric: dr.metric || '',
                    deadlineWords: dr.deadlineWords || '',
                    thresholdQuestions: dr.threshold_questions || [],
                    validityThreats: (dr.validity_threats || []).map((t: any) => ({
                      threat: t.threat || '',
                      protection: t.protection || '',
                      handled: false,
                    })),
                    ifSuccess: dr.ifSuccessHint || '',
                    ifFailure: dr.ifFailureHint || '',
                    status: 'DRAFT' as const,
                    evidenceIds: [],
                    history: [],
                    thresholdShiftedAfterStart: false,
                  }));
                // Keep locked cards; replace only drafts for unlocked hypotheses
                const kept = d.experiments.filter(
                  (e) =>
                    e.status === 'READY' ||
                    e.lockedAt ||
                    e.status === 'RUNNING' ||
                    e.status === 'COMPLETED' ||
                    !selected.some((h) => h.id === e.hypothesisId)
                );
                update({ experiments: [...kept, ...drafts] });
              }
            )
          }
        >
          Get drafts
        </button>
      </div>

      {d.experiments.map((exp) => (
        <ExperimentCardEditor
          key={exp.id}
          exp={exp}
          d={d}
          update={update}
          busy={busy}
          runApi={runApi}
        />
      ))}

      <div className="panel" style={{ marginTop: 12 }}>
        <h3>Cost and risk</h3>
        <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap' }}>
          <div>
            <label>Cost of a wrong choice</label>
            <select
              value={d.brief.errorCost.final || ''}
              onChange={(e) =>
                update({
                  brief: {
                    ...d.brief,
                    errorCost: {
                      ...d.brief.errorCost,
                      final: (e.target.value || undefined) as Level | undefined,
                    },
                  },
                })
              }
            >
              <option value="">—</option>
              <option value="LOW">low</option>
              <option value="MEDIUM">medium</option>
              <option value="HIGH">high</option>
              <option value="UNKNOWN">unknown</option>
            </select>
          </div>
          <div>
            <label>Can you undo it?</label>
            <select
              value={d.brief.reversibility.final || ''}
              onChange={(e) =>
                update({
                  brief: {
                    ...d.brief,
                    reversibility: {
                      ...d.brief.reversibility,
                      final: (e.target.value || undefined) as Door | 'UNKNOWN' | undefined,
                    },
                  },
                })
              }
            >
              <option value="">—</option>
              <option value="TWO_WAY">yes, easily</option>
              <option value="ONE_WAY">no, hard to undo</option>
              <option value="UNKNOWN">unknown</option>
            </select>
          </div>
        </div>
        {d.brief.errorCost.final === 'HIGH' && d.brief.reversibility.final === 'ONE_WAY' && (
          <div className="alert" style={{ marginTop: 8 }}>
            High cost and hard to undo: get an independent re-check and an expert review.
          </div>
        )}
      </div>

      <div className="actions" style={{ marginTop: 16 }}>
        <button
          className="primary"
          disabled={!allHypsCovered || !finalCostSet || !finalRevSet}
          onClick={() => {
            // Only set review dates once if empty; do not recalculate on every continue
            const dates =
              d.brief.reviewDates?.length === 3
                ? d.brief.reviewDates
                : computeReviewDates(new Date());
            update({
              brief: { ...d.brief, reviewDates: dates },
              step: 'DECIDE',
            });
          }}
        >
          {en.continue} <ArrowRight size={16} />
        </button>
        {(!allHypsCovered || !finalCostSet || !finalRevSet) && (
          <span className="why-disabled">{!allHypsCovered ? 'Finish every card first.' : 'Answer both questions first.'}</span>
        )}
      </div>
    </div>
  );
}

export function Field({ label, value, onChange }: { label: string; value: string; onChange: (v: string) => void }) {
  return (
    <label className="field">
      <span>{label}</span>
      <AutoInput value={value} onChange={(e) => onChange(e.target.value)} />
    </label>
  );
}

export function ExperimentCardEditor({
  exp,
  d,
  update,
  busy,
  runApi,
}: {
  exp: ExperimentCard;
  d: Decision;
  update: (p: Partial<Decision> | ((x: Decision) => Decision)) => void;
  busy: boolean;
  runApi: (path: string, body: unknown, onOk: (data: any, meta: any) => void) => void;
}) {
  const locked = !!exp.lockedAt;
  const patch = (p: Partial<ExperimentCard>) => {
    if (locked && !['result', 'resultValue', 'status', 'completedAt', 'startedAt'].some((k) => k in p)) {
      return;
    }
    update({
      experiments: d.experiments.map((e) => (e.id === exp.id ? { ...e, ...p } : e)),
    });
  };

  // EVPI local state
  const [p, setP] = useState(40);
  const [G, setG] = useState(100);
  const [L, setL] = useState(150);
  const [c, setC] = useState(10);
  const pNorm = p > 1 ? p / 100 : p;
  const err = validateEvpiInput(pNorm, G, L, c);
  const result = !err ? evpi(pNorm, G, L) : null;
  const range = !err ? evpiRange(pNorm, G, L) : null;
  const verdict = range ? evpiVerdict(c, range) : null;

  return (
    <div className="panel" style={{ marginTop: 12 }}>
      <h3>
        <FlaskConical size={16} /> Experiment {locked && <Lock size={14} />}
        {exp.thresholdShiftedAfterStart && ' · threshold shifted'}
      </h3>
      <div className="formgrid">
        <Field label="Why critical" value={exp.whyCritical} onChange={(v) => patch({ whyCritical: v })} />
        <Field label="Test" value={exp.test} onChange={(v) => patch({ test: v })} />
        <Field label="Metric" value={exp.metric} onChange={(v) => patch({ metric: v })} />
        <Field label="Deadline (date)" value={exp.deadline || ''} onChange={(v) => patch({ deadline: v })} />
        <Field
          label="Success threshold"
          value={exp.successThreshold || ''}
          onChange={(v) => patch({ successThreshold: v })}
        />
        <Field
          label="Stop threshold"
          value={exp.stopThreshold || ''}
          onChange={(v) => patch({ stopThreshold: v })}
        />
        <Field
          label="Intermediate outcome"
          value={exp.intermediateOutcome || ''}
          onChange={(v) => patch({ intermediateOutcome: v })}
        />
        <Field label="If success" value={exp.ifSuccess || ''} onChange={(v) => patch({ ifSuccess: v })} />
        <Field label="If failure" value={exp.ifFailure || ''} onChange={(v) => patch({ ifFailure: v })} />
        <Field
          label="What to do if stopped"
          value={exp.whatToDoAfterStop || ''}
          onChange={(v) => patch({ whatToDoAfterStop: v })}
        />
        <Field
          label="What result would make you change your mind? *"
          value={exp.whatWouldChangeMyMind || ''}
          onChange={(v) => patch({ whatWouldChangeMyMind: v })}
        />
      </div>
      {exp.thresholdQuestions?.length > 0 && (
        <div className="alert" style={{ marginTop: 8 }}>
          Model questions about thresholds (answer with your own numbers above):
          <ul>
            {exp.thresholdQuestions.map((q, i) => (
              <li key={i}>{q}</li>
            ))}
          </ul>
        </div>
      )}
      {exp.validityThreats?.length > 0 && (
        <div style={{ marginTop: 8 }}>
          <h4>What could make this test unfair?</h4>
          {exp.validityThreats.map((t, i) => (
            <label key={i} style={{ display: 'flex', gap: 8 }}>
              <input
                type="checkbox"
                checked={t.handled}
                onChange={(e) => {
                  const validityThreats = exp.validityThreats.map((x, j) =>
                    j === i ? { ...x, handled: e.target.checked } : x
                  );
                  patch({ validityThreats });
                }}
              />
              {t.threat} — mitigation: {t.protection}
            </label>
          ))}
        </div>
      )}

      {/* Forecast (user only) */}
      <div className="forecast" style={{ marginTop: 12 }}>
        <h4>Your forecast</h4>
        {!locked && (
          <button
            className="ghost"
            style={{ marginBottom: 8 }}
            disabled={busy}
            onClick={() =>
              runApi('/api/forecast-wording', { experiment: exp }, (data) => {
                if (data?.wording || data?.suggestedWording) {
                  patch({
                    forecast: {
                      wording: data.wording || data.suggestedWording || exp.forecast?.wording || '',
                      confidence: exp.forecast?.confidence,
                      rationale: exp.forecast?.rationale,
                      source: 'USER',
                    },
                  });
                }
              })
            }
          >
            Help phrase it (model does not set confidence)
          </button>
        )}
        <AutoTextarea
          placeholder="Forecast wording"
          value={exp.forecast?.wording || ''}
          disabled={locked}
          onChange={(e) =>
            patch({
              forecast: {
                wording: e.target.value,
                confidence: exp.forecast?.confidence,
                rationale: exp.forecast?.rationale,
                source: 'USER',
              },
            })
          }
          rows={2}
          style={{ width: '100%' }}
        />
        <label style={{ display: 'block', marginTop: 6 }}>
          Basis
          <AutoTextarea
            placeholder="What data/assumptions the forecast rests on"
            value={exp.forecast?.rationale || ''}
            disabled={locked}
            onChange={(e) =>
              patch({
                forecast: {
                  wording: exp.forecast?.wording || '',
                  confidence: exp.forecast?.confidence,
                  rationale: e.target.value,
                  source: 'USER',
                },
              })
            }
            rows={2}
            style={{ width: '100%' }}
          />
        </label>
        <div className="forecast-inputs">
          <label>
            Confidence % or “low”
            <input
              disabled={locked}
              value={
                exp.forecast?.confidence === 'LOW_NO_DATA'
                  ? 'low'
                  : exp.forecast?.confidence ?? ''
              }
              onChange={(e) => {
                const v = e.target.value.trim();
                let confidence: number | 'LOW_NO_DATA' | undefined;
                if (v === '') confidence = undefined;
                else if (/low|insuffic/i.test(v)) confidence = 'LOW_NO_DATA';
                else {
                  const n = Number(v.replace('%', ''));
                  if (!Number.isFinite(n)) return;
                  confidence = Math.max(0, Math.min(100, n));
                }
                patch({
                  forecast: {
                    wording: exp.forecast?.wording || '',
                    confidence,
                    rationale: exp.forecast?.rationale,
                    source: 'USER',
                  },
                });
              }}
            />
          </label>
        </div>
      </div>

      {/* EVPI */}
      <div style={{ marginTop: 12, borderTop: '1px solid #1c3044', paddingTop: 12 }}>
        <h4>Is more information worth it?</h4>
        <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
          <label>
            Chance it helps (%)
            <input type="number" value={p} onChange={(e) => setP(Number(e.target.value))} />
          </label>
          <label>
            Upside if right
            <input type="number" value={G} onChange={(e) => setG(Number(e.target.value))} />
          </label>
          <label>
            Downside if wrong
            <input type="number" value={L} onChange={(e) => setL(Number(e.target.value))} />
          </label>
          <label>
            Cost to find out
            <input type="number" value={c} onChange={(e) => setC(Number(e.target.value))} />
          </label>
          <button
            className="ghost"
            onClick={() => {
              setP(40);
              setG(100);
              setL(150);
              setC(10);
            }}
          >
            Use example numbers
          </button>
        </div>
        {result && range && verdict && (
          <div className="alert" style={{ marginTop: 8 }}>
            Expected value without more info: {result.evOpen.toFixed(1)}; Value of more info ≈ {result.evpi.toFixed(1)};
            range {range.min.toFixed(0)}–{range.max.toFixed(0)}. {verdict.text}
            <br />
            <small>
              Rough estimates; risk-neutral assumption; real tests yield incomplete information.
            </small>
            {!locked && (
              <button
                className="ghost"
                style={{ marginTop: 6 }}
                onClick={() =>
                  patch({
                    evpi: { p: pNorm, gain: G, loss: L, testCost: c, unit: 'USD' },
                  })
                }
              >
                Save this estimate
              </button>
            )}
          </div>
        )}
        {err && <div className="alert error">{err}</div>}
      </div>

      {/* Final cost / reversibility */}
      <div style={{ marginTop: 12 }}>
        <label>Final cost of error</label>
        <select
          value={d.brief.errorCost.final || ''}
          onChange={(e) =>
            update({
              brief: {
                ...d.brief,
                errorCost: {
                  ...d.brief.errorCost,
                  final: (e.target.value || undefined) as Level | undefined,
                },
              },
            })
          }
        >
          <option value="">—</option>
          <option value="LOW">low</option>
          <option value="MEDIUM">medium</option>
          <option value="HIGH">high</option>
          <option value="UNKNOWN">unknown</option>
        </select>
        <label style={{ marginLeft: 12 }}>Final reversibility</label>
        <select
          value={d.brief.reversibility.final || ''}
          onChange={(e) =>
            update({
              brief: {
                ...d.brief,
                reversibility: {
                  ...d.brief.reversibility,
                  final: (e.target.value || undefined) as Door | 'UNKNOWN' | undefined,
                },
              },
            })
          }
        >
          <option value="">—</option>
          <option value="TWO_WAY">two-way (can reverse)</option>
          <option value="ONE_WAY">one-way (costly to reverse)</option>
          <option value="UNKNOWN">unknown</option>
        </select>
      </div>

      {!locked ? (
        <button
          className="primary"
          style={{ marginTop: 12 }}
          disabled={
            !exp.metric ||
            !exp.deadline ||
            !exp.successThreshold ||
            !exp.stopThreshold ||
            !exp.intermediateOutcome ||
            !exp.ifSuccess ||
            !exp.ifFailure ||
            !exp.whatToDoAfterStop ||
            !exp.whatWouldChangeMyMind ||
            !exp.forecast?.wording
          }
          onClick={() => {
            if (!exp.whatWouldChangeMyMind?.trim()) {
              if (!confirm('Empty “what would change your mind” — the test may not be needed. Continue?'))
                return;
            }
            const conf = exp.forecast?.confidence;
            if (conf === undefined || conf === null || conf === ('' as any)) {
              alert('Before locking, set confidence (0–100 or “low”). The method requires a forecast with confidence before the test.');
              return;
            }
            if (!exp.forecast?.wording?.trim()) {
              alert('Before locking, fill in the forecast wording.');
              return;
            }
            const lockedAt = Date.now();
            // One journal entry per forecast (not three independent Brier rows with the same wording)
            const hyp =
              d.hypotheses.find((h) => h.id === exp.hypothesisId)?.text ||
              exp.whyCritical ||
              exp.hypothesisId ||
              '';
            const dates = d.brief.reviewDates?.length
              ? d.brief.reviewDates
              : computeReviewDates();
            const entry: JournalEntry = {
              id: uid('j'),
              createdAt: lockedAt,
              hypothesis: hyp,
              forecastWording: exp.forecast?.wording || '',
              confidence: exp.forecast?.confidence,
              rationale: exp.forecast?.rationale || '',
              reviewDate: dates[0],
              horizonDays: 30,
              noResultYet: true,
            };
            update({
              experiments: d.experiments.map((e) =>
                e.id === exp.id
                  ? {
                      ...e,
                      status: 'READY' as const,
                      lockedAt,
                      // Persist EVPI if user computed it
                      evpi: e.evpi,
                    }
                  : e
              ),
              journal: [...d.journal, entry],
            });
          }}
        >
          <Lock size={14} /> {en.lockCard}
        </button>
      ) : (
        <div className="actions" style={{ marginTop: 12 }}>
          <button
            className="ghost"
            onClick={() => patch({ status: 'RUNNING', startedAt: Date.now() })}
          >
            {en.startTest}
          </button>
          <button
            className="ghost"
            onClick={async () => {
              const hash = await cardChecksum(exp);
              const text = `Experiment Card\n${JSON.stringify(exp, null, 2)}\n\nSHA-256: ${hash}\n(Hash shows the copy was not altered)`;
              downloadBlob(new Blob([text], { type: 'text/plain' }), `exp_${exp.id}.txt`);
            }}
          >
            Copy for a third party
          </button>
          <button
            className="ghost"
            onClick={() => {
              const reason = prompt('Reason for shifting the threshold (required)');
              if (!reason) return;
              const neu = prompt('New stop threshold', exp.stopThreshold);
              if (neu == null) return;
              patch({
                stopThreshold: neu,
                thresholdShiftedAfterStart: true,
                history: [
                  ...exp.history,
                  {
                    at: Date.now(),
                    field: 'stopThreshold',
                    from: exp.stopThreshold || '',
                    to: neu,
                    reason,
                  },
                ],
              });
            }}
          >
            Shift threshold
          </button>
        </div>
      )}
    </div>
  );
}

// --- DECIDE ---
export function DecideScreen({
  d,
  update,
}: {
  d: Decision;
  update: (p: Partial<Decision> | ((x: Decision) => Decision)) => void;
  runApi?: any;
}) {
  const hd = d.decision;
  const setHd = (patch: Partial<HumanDecision>) => {
    const base: HumanDecision = hd || {
      kind: 'CHOOSE_OPTION', whatIDecided: '', onWhichValues: '', underWhichData: '',
      acceptedUncertainties: [], decidedAt: Date.now(),
    };
    update({ decision: { ...base, ...patch, decidedAt: base.decidedAt || Date.now() } });
  };

  return (
    <div className="friendly-flow">
      <AssistantMessage>
        <p style={{ marginTop: 0 }}>You have seen the options and the risks. The choice is yours.</p>
        <AutoTextarea
          value={hd?.whatIDecided || ''}
          onChange={(e) => setHd({ whatIDecided: e.target.value })}
          placeholder="What will you do now? You may also postpone."
          rows={4}
          style={{ width: '100%' }}
        />
        <AutoTextarea
          value={hd?.onWhichValues || ''}
          onChange={(e) => setHd({ onWhichValues: e.target.value })}
          placeholder="Why? (optional)"
          rows={3}
          style={{ width: '100%', marginTop: 10 }}
        />
        <div className="actions" style={{ marginTop: 12 }}>
          <button className="primary" disabled={!hd?.whatIDecided?.trim()} onClick={() => {
            const dates = d.brief.reviewDates?.length > 0 ? d.brief.reviewDates : computeReviewDates(new Date());
            update({ brief: { ...d.brief, reviewDates: dates }, step: 'SYNTHESIS', interactionState: 'SYNTHESIS_READY' });
          }}>Continue <ArrowRight size={16} /></button>
          {!hd?.whatIDecided?.trim() && <span className="why-disabled">Write what you will do first.</span>}
        </div>
      </AssistantMessage>
    </div>
  );
}

// --- SYNTHESIS ---
export function SynthesisScreen({
  d,
  update,
  runApi,
  busy,
}: {
  d: Decision;
  update: (p: Partial<Decision> | ((x: Decision) => Decision)) => void;
  runApi: (path: string, body: unknown, onOk: (data: any, meta: any) => void) => void;
  busy: boolean;
}) {
  return (
    <div className="panel">
      <h2>Decision map</h2>
      <button
        className="primary"
        disabled={busy}
        onClick={() =>
          runApi(
            '/api/synthesis',
            {
              brief: d.brief,
              options: d.options,
              hypotheses: d.hypotheses.filter((h) => h.selectedByUser),
              experiments: d.experiments,
              decision: d.decision,
              radar: d.radar,
              knowledgeMap: d.knowledgeMap,
              preMortem: d.preMortem,
            },
            (data, meta) => {
              update({
                synthesis: {
                  paragraphs: data.paragraphs || ['', '', '', ''],
                  derivedNumbers: data.derived_numbers || [],
                  openGaps: data.open_gaps || [],
                  needsExternalCheck: data.needs_external_check || [],
                  unverifiedNumbers: [],
                  meta,
                },
              });
            }
          )
        }
      >
        Build the current picture
      </button>
      {d.synthesis && (
        <div style={{ marginTop: 16 }}>
          {d.synthesis.paragraphs.map((p, i) => (
            <p key={i} style={{ lineHeight: 1.6 }}>
              {p}
            </p>
          ))}
          {d.synthesis.openGaps?.length > 0 && (
            <div className="alert">
              Gaps: {d.synthesis.openGaps.join('; ')}
            </div>
          )}
          {d.synthesis.needsExternalCheck?.length > 0 && (
            <div className="alert">
              External check: {d.synthesis.needsExternalCheck.join('; ')}
            </div>
          )}
          <AutoTextarea
            placeholder="Your notes (optional)"
            value={d.synthesis.editedByUser || ''}
            onChange={(e) =>
              update({
                synthesis: { ...d.synthesis!, editedByUser: e.target.value },
              })
            }
            rows={4}
            style={{ width: '100%', marginTop: 12 }}
          />
          <div className="actions" style={{ marginTop: 12 }}>
            <button
              className="ghost"
              onClick={() => {
                const text = [
                  ...d.synthesis!.paragraphs,
                  '',
                  `${en.myDecision}: ${d.decision?.whatIDecided || ''}`,
                ].join('\n\n');
                navigator.clipboard?.writeText(text);
                alert('Copied to clipboard');
              }}
            >
              Copy
            </button>
            <button className="primary" onClick={() => update({ step: 'LEARN' })}>
              {en.continue} <ArrowRight size={16} />
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

// --- LEARN ---
export function LearnScreen({
  d,
  update,
  runApi,
  onNextCycle,
}: {
  d: Decision;
  update: (p: Partial<Decision> | ((x: Decision) => Decision)) => void;
  runApi: (path: string, body: unknown, onOk: (data: any, meta: any) => void) => void;
  onNextCycle: () => void;
}) {
  const addEntry = () => {
    const entry: JournalEntry = {
      id: uid('j'),
      createdAt: Date.now(),
      hypothesis: '',
      forecastWording: '',
      reviewDate: d.brief.reviewDates?.[0] || computeReviewDates()[0],
      horizonDays: 30,
    };
    update({ journal: [...d.journal, entry] });
  };

  const brierEntries = d.journal
    .filter(
      (j) =>
        typeof j.confidence === 'number' &&
        typeof j.outcome === 'boolean' &&
        j.confidence !== undefined
    )
    .map((j) => ({
      p: (j.confidence as number) > 1 ? (j.confidence as number) / 100 : (j.confidence as number),
      outcome: (j.outcome ? 1 : 0) as 0 | 1,
    }));
  const brier = brierEntries.length ? brierScore(brierEntries) : null;

  return (
    <div className="panel">
      <h2>Journal and learning</h2>
      <button className="ghost" onClick={addEntry}>
        <Plus size={14} /> Journal entry
      </button>
      {d.journal.map((j) => (
        <div key={j.id} className="question" style={{ marginTop: 10 }}>
          <AutoInput
            placeholder="Hypothesis"
            value={j.hypothesis}
            disabled={!!j.fact || !!j.reviewedAt}
            onChange={(e) =>
              update({
                journal: d.journal.map((x) =>
                  x.id === j.id ? { ...x, hypothesis: e.target.value } : x
                ),
              })
            }
          />
          <AutoInput
            placeholder="Forecast (wording)"
            value={j.forecastWording}
            disabled={!!j.fact || !!j.reviewedAt}
            onChange={(e) =>
              update({
                journal: d.journal.map((x) =>
                  x.id === j.id ? { ...x, forecastWording: e.target.value } : x
                ),
              })
            }
          />
          <input
            placeholder="Confidence 0–100 or “low”"
            value={
              j.confidence === 'LOW_NO_DATA' ? 'low' : j.confidence ?? ''
            }
            disabled={!!j.fact || !!j.reviewedAt}
            onChange={(e) => {
              const v = e.target.value.trim();
              let confidence: number | 'LOW_NO_DATA' | undefined;
              if (v === '') confidence = undefined;
              else if (/low/i.test(v)) confidence = 'LOW_NO_DATA';
              else {
                const n = Number(v.replace('%', ''));
                if (!Number.isFinite(n)) return;
                // store as 0–100; Brier normalizes later
                confidence = Math.max(0, Math.min(100, n));
              }
              update({
                journal: d.journal.map((x) =>
                  x.id === j.id ? { ...x, confidence } : x
                ),
              });
            }}
          />
          <AutoInput
            placeholder="Basis"
            value={j.rationale || ''}
            disabled={!!j.reviewedAt}
            onChange={(e) =>
              update({
                journal: d.journal.map((x) =>
                  x.id === j.id ? { ...x, rationale: e.target.value } : x
                ),
              })
            }
          />
          <AutoInput
            placeholder="Fact / result"
            value={j.fact || ''}
            disabled={!!j.reviewedAt}
            onChange={(e) =>
              update({
                journal: d.journal.map((x) =>
                  x.id === j.id ? { ...x, fact: e.target.value, noResultYet: false } : x
                ),
              })
            }
          />
          <label>
            <input
              type="checkbox"
              checked={!!j.noResultYet}
              disabled={!!j.reviewedAt}
              onChange={(e) =>
                update({
                  journal: d.journal.map((x) =>
                    x.id === j.id
                      ? {
                          ...x,
                          noResultYet: e.target.checked,
                          // Clearing «result not yet» does not unlock fact after review
                          ...(e.target.checked ? { fact: undefined, outcome: undefined } : {}),
                        }
                      : x
                  ),
                })
              }
            />{' '}
            Result not yet
          </label>
          <label>
            Occurred:{' '}
            <select
              value={j.outcome === true ? 'yes' : j.outcome === false ? 'no' : ''}
              disabled={!!j.reviewedAt || !!j.noResultYet}
              onChange={(e) =>
                update({
                  journal: d.journal.map((x) =>
                    x.id === j.id
                      ? {
                          ...x,
                          outcome:
                            e.target.value === 'yes'
                              ? true
                              : e.target.value === 'no'
                                ? false
                                : undefined,
                        }
                      : x
                  ),
                })
              }
            >
              <option value="">—</option>
              <option value="yes">yes</option>
              <option value="no">no</option>
            </select>
          </label>
          <select
            value={j.errorType || ''}
            disabled={!!j.reviewedAt}
            onChange={(e) =>
              update({
                journal: d.journal.map((x) =>
                  x.id === j.id
                    ? {
                        ...x,
                        errorType: (e.target.value || undefined) as JournalEntry['errorType'],
                      }
                    : x
                ),
              })
            }
          >
            <option value="">What went differently?</option>
            <option value="DATA">Data</option>
            <option value="ASSUMPTION">Assumption</option>
            <option value="REASONING">Reasoning</option>
            <option value="EXECUTION">Execution</option>
            <option value="LUCK">Chance</option>
          </select>
          <AutoInput
            placeholder="What I changed or learned"
            value={j.whatIUpdated || ''}
            disabled={!!j.reviewedAt}
            onChange={(e) =>
              update({
                journal: d.journal.map((x) =>
                  x.id === j.id ? { ...x, whatIUpdated: e.target.value } : x
                ),
              })
            }
          />
          {!j.reviewedAt && j.fact && j.outcome !== undefined && (
            <button
              className="ghost"
              onClick={() => {
                runApi(
                  '/api/review',
                  { entry: j },
                  (data) => {
                    update({
                      journal: d.journal.map((x) =>
                        x.id === j.id
                          ? {
                              ...x,
                              reviewedAt: Date.now(),
                              diagnosisNote: data?.note || data?.questions?.join('; ') || x.diagnosisNote,
                              discrepancy: data?.discrepancy || x.discrepancy,
                              // Lock fact after review — clearing the field no longer reopens
                            }
                          : x
                      ),
                    });
                  }
                );
              }}
            >
              Review discrepancy (model)
            </button>
          )}
          {!j.reviewedAt && j.fact && j.outcome !== undefined && (
            <button
              className="primary"
              onClick={() =>
                update({
                  journal: d.journal.map((x) =>
                    x.id === j.id ? { ...x, reviewedAt: Date.now() } : x
                  ),
                })
              }
            >
              Lock review
            </button>
          )}
          {j.reviewedAt && (
            <small style={{ color: '#7f93aa' }}>
              Review locked · fact cannot be erased to bypass the lock
            </small>
          )}
        </div>
      ))}
      {brier && (
        <div className="alert" style={{ marginTop: 12 }}>
          Forecast accuracy ≈ {brier.score.toFixed(2)} ({brier.n} forecasts; 0 is perfect, 0.25 is random)
          {brier.warning && ` · ${brier.warning}`}
        </div>
      )}
      <div className="actions" style={{ marginTop: 16 }}>
        <button className="primary" onClick={onNextCycle}>
          {en.nextCycle}
        </button>
      </div>
    </div>
  );
}

// --- Brief side panel ---

/** True when Decision brief has structured content beyond the first chat line. */
export function isBriefWorthShowing(d: Decision): boolean {
  const b = d.brief;
  if (!b) return false;
  const sections = briefSections(b);
  if (sections.length === 0) return false;
  const onlyThin =
    sections.length === 1 &&
    sections[0].title === 'Decision' &&
    sections[0].items.length === 1 &&
    !(b.facts?.length || b.unknowns?.length || b.values?.length || b.myOptions?.length || b.assumptions?.length || b.constraints?.length || b.goal || b.deadline);
  if (onlyThin && !d.decision?.whatIDecided) return false;
  return true;
}

export function BriefPanel({
  d,
  onClose,
}: {
  d: Decision;
  onClose: () => void;
  update?: (p: Partial<Decision> | ((x: Decision) => Decision)) => void;
}) {
  const sections = briefSections(d.brief);
  const doc = decisionToDocument(d);
  const extraBlocks = (doc.blocks || []).filter((bl: any) => {
    if (bl.type === 'heading' && /^(Decision|Решение)$/i.test(String(bl.text || ''))) return false;
    return true;
  });
  return (
    <div className="brief-backdrop" onClick={onClose} role="presentation">
      <div className="brief-panel brief-panel-full" role="dialog" aria-modal="true" aria-label="Decision brief" onClick={(e) => e.stopPropagation()}>
        <div className="brief-head">
          <h2>Decision brief</h2>
          <button type="button" className="ghost" onClick={onClose} aria-label="Close the decision brief">Close</button>
        </div>
        {sections.length === 0 ? (
          <p className="brief-empty">{BRIEF_EMPTY_TEXT}</p>
        ) : (
          sections.map((s) => (
            <section key={s.title} className="brief-section">
              <h3>{s.title}</h3>
              {s.items.length === 1 ? <p>{s.items[0]}</p> : <ul>{s.items.map((it, i) => <li key={i}>{it}</li>)}</ul>}
            </section>
          ))
        )}
        {extraBlocks.length > 0 && (
          <div className="brief-section" style={{ marginTop: 16 }}>
            {extraBlocks.map((bl: any, i: number) =>
              bl.type === 'heading' ? (
                <h3 key={i}>{bl.text}</h3>
              ) : bl.type === 'bullets' ? (
                <ul key={i}>{((bl.items as string[]) || []).map((it, j) => <li key={j}>{it}</li>)}</ul>
              ) : (
                <p key={i}>{bl.text}</p>
              ),
            )}
          </div>
        )}
      </div>
    </div>
  );
}

