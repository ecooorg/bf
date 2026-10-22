// User-facing vocabulary. One name per thing: never invent a second name for the same step.
// Internal ids (UNDERSTAND, EXPAND, ATTACK, VERIFY, LEARN) stay in code and data; people see these names.
// The eight detailed steps are named by `STAGES[].label` in decision.ts.
export const LOOP_NAME: Record<number, string> = {
  1: 'Understand',
  2: 'Explore',
  3: 'Challenge',
  4: 'Check',
  5: 'Learn',
};

/** The five loops in order, for text such as «Understand → Explore → …». */
export const LOOP_ORDER_TEXT = [1, 2, 3, 4, 5].map((i) => LOOP_NAME[i]).join(' → ');
