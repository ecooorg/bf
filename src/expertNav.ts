// Navigation model for the Expert method: five loops, eight detailed steps, one source of truth.
// Used by the side list (wide screens) and the one-line bar (narrow screens).
import { LOOPS, STAGES, type Step } from './decision.ts';

export type NavState = 'done' | 'current' | 'next';
export interface NavStep { id: Step; label: string; state: NavState; reachable: boolean }
export interface NavLoop { id: number; label: string; state: NavState; reachable: boolean; target: Step; steps: NavStep[] }
export interface ExpertNav {
  loops: NavLoop[];
  /** 1-based position among the eight detailed steps; 0 before the method starts. */
  stepNo: number;
  stepTotal: number;
  stepLabel: string;
  loopNo: number;
  loopLabel: string;
}

const idx = (s: Step) => STAGES.findIndex((x) => x.id === s);

export function buildExpertNav(step: Step): ExpertNav {
  const si = idx(step);
  const detailed = STAGES.filter((s) => s.id !== 'TRIAGE');
  const loops: NavLoop[] = LOOPS.map((l) => {
    const current = (l.steps as readonly Step[]).includes(step);
    const done = (l.steps as readonly Step[]).every((s) => idx(s) < si);
    const steps: NavStep[] = (l.steps as readonly Step[]).map((id) => {
      const meta = STAGES[idx(id)];
      const state: NavState = id === step ? 'current' : idx(id) < si ? 'done' : 'next';
      return { id, label: meta ? meta.label : id, state, reachable: idx(id) <= si };
    });
    return {
      id: l.id,
      label: l.label,
      state: current ? 'current' : done ? 'done' : 'next',
      reachable: idx(l.steps[0] as Step) <= si,
      target: l.steps[0] as Step,
      steps,
    };
  });
  const pos = detailed.findIndex((s) => s.id === step);
  const cur = loops.find((l) => l.state === 'current');
  return {
    loops,
    stepNo: pos + 1,
    stepTotal: detailed.length,
    stepLabel: pos >= 0 ? detailed[pos]!.label : 'Start',
    loopNo: cur ? cur.id : 0,
    loopLabel: cur ? cur.label : '',
  };
}
