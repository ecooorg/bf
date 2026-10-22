// Expert screen: the earlier conversation is shown once, collapsed; only messages that arrive
// after the person reached the method steps are shown in the open dialogue at the bottom.

const baselines = new Map<string, number>();

/** Number of history messages that already existed when the person first reached a method step. */
export function expertBaseline(decisionId: string, historyLength: number): number {
  if (!baselines.has(decisionId)) baselines.set(decisionId, historyLength);
  return Math.min(baselines.get(decisionId)!, historyLength);
}

/** Forget the stored baseline (new decision, tests). */
export function resetExpertBaseline(decisionId?: string): void {
  if (decisionId === undefined) baselines.clear();
  else baselines.delete(decisionId);
}

/** One-line label for the collapsed history: the person's first question, shortened. */
export function questionLine(history: Array<{ role?: string; content?: unknown }>, max = 110): string {
  const first = history.find((m) => m && m.role === 'user');
  const text = String(first?.content ?? '').replace(/\s+/g, ' ').trim();
  if (!text) return '';
  if (text.length <= max) return text;
  return `${text.slice(0, max).replace(/\s+\S*$/, '')}…`;
}
