import React from 'react';
import type { Step } from './decision.ts';
import { buildExpertNav } from './expertNav.ts';

// Expert method navigation. One list of five loops; the detailed steps of the current loop
// open inside it. Wide screens: left column. Narrow screens: one line at the bottom.

export function ExpertSidebar({
  step,
  heading,
  footer,
  onGo,
}: {
  step: Step;
  heading: React.ReactNode;
  footer?: React.ReactNode;
  onGo: (target: Step) => void;
}) {
  const nav = buildExpertNav(step);
  return (
    <aside className="sidebar method-sidebar xn-side" aria-label="Expert method steps" data-testid="expert-steps">
      <div className="brand">{heading}</div>
      <ol className="xn-list">
        {nav.loops.map((l) => (
          <li key={l.id} className={`xn-loop ${l.state}`}>
            <button
              type="button"
              className="xn-loop-btn"
              disabled={!l.reachable}
              aria-current={l.state === 'current' ? 'step' : undefined}
              onClick={() => onGo(l.target)}
            >
              <span className="xn-num">{l.state === 'done' ? '✓' : l.id}</span>
              <span className="xn-text">
                <b>{l.label}</b>
                <small>{l.state === 'current' ? 'You are here' : l.state === 'done' ? 'Completed' : 'Next'}</small>
              </span>
            </button>
            {l.state === 'current' && l.steps.length > 1 && (
              <ul className="xn-sub">
                {l.steps.map((s) => (
                  <li key={s.id}>
                    <button
                      type="button"
                      className={`xn-sub-btn ${s.state}`}
                      disabled={!s.reachable}
                      aria-current={s.state === 'current' ? 'step' : undefined}
                      onClick={() => onGo(s.id)}
                    >
                      {s.label}
                    </button>
                  </li>
                ))}
              </ul>
            )}
          </li>
        ))}
      </ol>
      {footer && <div className="sidebar-note xn-note">{footer}</div>}
    </aside>
  );
}

export function ExpertBottomBar({ step, onGo }: { step: Step; onGo: (target: Step) => void }) {
  const nav = buildExpertNav(step);
  return (
    <nav className="xn-bar" aria-label="Expert method progress" data-testid="expert-steps-bar">
      <span className="xn-segs">
        {nav.loops.map((l) => (
          <button
            key={l.id}
            type="button"
            className={`xn-seg ${l.state}`}
            disabled={!l.reachable}
            aria-label={`${l.label}: ${l.state === 'current' ? 'current' : l.state === 'done' ? 'completed' : 'next'}`}
            aria-current={l.state === 'current' ? 'step' : undefined}
            onClick={() => onGo(l.target)}
          />
        ))}
      </span>
      <span className="xn-bar-text">
        {nav.loopNo ? <><b>{nav.loopLabel}</b> · {nav.stepLabel} <small>{nav.stepNo}/{nav.stepTotal}</small></> : <b>{nav.stepLabel}</b>}
      </span>
    </nav>
  );
}
