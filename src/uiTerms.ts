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

/** Title and one short hint (at most 12 words) shown at the top of each Expert step. */
export const STEP_TITLE: Record<string, { title: string; hint: string }> = {
  TRIAGE: { title: 'Quick check', hint: 'A minute to see if this fits.' },
  BRIEF: { title: 'Your story', hint: 'Describe the situation in your own words.' },
  UNDERSTAND: { title: 'Clarify', hint: 'Confirm what we understood and fill the gaps.' },
  EXPAND: { title: 'Options', hint: 'See the realistic paths, not only the obvious ones.' },
  ATTACK: { title: 'Stress-test', hint: 'Look for how each path could fail.' },
  TEST: { title: 'Test ideas', hint: 'Pick the cheapest way to check what matters.' },
  DECIDE: { title: 'Decide', hint: 'Choose what you will do.' },
  SYNTHESIS: { title: 'Plan', hint: 'See the whole picture and your next step.' },
  LEARN: { title: 'Learn', hint: 'Record what happened and what you learned.' },
};
