import React from 'react';

/**
 * One pattern for empty / loading / unavailable / error / done, shared by Simple, Expert and Project (docs/18, S1).
 * Wording rules: at most 12 words; say what is happening or what to do next; never an internal id.
 */
export type UiStateKind = 'loading' | 'empty' | 'unavailable' | 'error' | 'done';

export function StateNotice(props: { kind: UiStateKind; children: React.ReactNode }) {
  return (
    <div className="state-notice" data-state={props.kind} role={props.kind === 'error' ? 'alert' : 'status'}>
      {props.children}
    </div>
  );
}

/** Shown next to paused buttons while an action is running. */
export function BusyHint(props: { busy: boolean }) {
  return props.busy ? <StateNotice kind="loading">Working… buttons are paused.</StateNotice> : null;
}

/** One wording for the Drive control in every mode: «Drive off» / «Drive» / «Drive on» / «Syncing…». */
export function driveLabel(s: { configured?: boolean; connected: boolean; busy?: boolean }): string {
  if (s.busy) return 'Syncing…';
  if (s.configured === false) return 'Drive off';
  return s.connected ? 'Drive on' : 'Drive';
}

export function driveTitle(s: { configured?: boolean; connected: boolean }): string {
  if (s.configured === false) return 'Google Drive is not set up on this server.';
  return s.connected
    ? 'Google Drive is on. Files sync only while this tab is open.'
    : 'Connect Google Drive. Files sync only while this tab is open.';
}

/** Same «X off» pattern as the Drive control. */
export function historyLabel(available: boolean): string {
  return available ? 'History' : 'History off';
}
export const HISTORY_OFF_TITLE = 'This browser cannot save history here. Private mode?';
