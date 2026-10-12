/**
 * PI-02 (TZ-INSTRUCTIONS-01 P2): server-side intent flags from the last user text.
 * Pure detectors — no Express, no model calls.
 */

export type UserIntentFlags = {
  userForbadeQuestions: boolean;
  userAskedApproximate: boolean;
  userAskedSearch: boolean;
  userCriticizedEvasion: boolean;
};

export type GainAuditSlice = {
  substantiveGain: string[];
  structuralNew: string[];
  hasNextStep: boolean;
};

// Note: avoid \\b after Cyrillic — JS word boundaries are ASCII-oriented.
const RE_FORBADE_QUESTIONS = /(?:^|[\s,.;:!?«»"'])(?:не\s+задавай(?:те)?(?:\s+вопрос(?:ов|ы|а)?)?|не\s+спрашивай(?:те)?|без\s+вопрос(?:ов|ов)|больше\s+ничего\s+не\s+(?:говори|спрашивай)|просто\s+(?:дай(?:\s+ответ)?|ответь)|don'?t\s+ask(?:\s+(?:me\s+)?(?:any\s+)?questions?)?|do\s+not\s+ask(?:\s+(?:me\s+)?(?:any\s+)?questions?)?|no\s+questions(?:\s+please)?|just\s+(?:give|answer|tell)(?:\s+(?:me\s+)?(?:the\s+)?answer)?|stop\s+asking)(?=$|[\s,.;:!?«»"'])/i;
const RE_ASKED_APPROXIMATE = /(?:приблизит(?:ельн(?:ая|о|ый|ую)|ельно)|примерно|груб(?:ая|о|ую)\s+оценк|оценка\s+без\s+гарантии|предварительн(?:ая|о|ый)|ballpark|rough\s+(?:estimate|figure|number|guess)|approximate(?:ly)?|without\s+(?:a\s+)?guarantee|order\s+of\s+magnitude)/i;
const RE_ASKED_SEARCH = /(?:найди(?:те)?(?:\s+(?:в\s+(?:сети|интернете)|онлайн|прогноз(?:ы)?))?|поиск(?:ай|ать)?(?:\s+в\s+(?:сети|интернете))?|(?:^|[\s,.;:!?])в\s+сети|(?:^|[\s,.;:!?])в\s+интернете|find\s+(?:(?:it|them|this|that|forecasts?|data|info(?:rmation)?)\s+)?(?:online|on\s+the\s+web|on\s+the\s+internet)|search\s+(?:the\s+)?(?:web|internet|online)|look\s+up\s+(?:online|on\s+the\s+web)|google\b)/i;
const RE_CRITICIZED_EVASION = /(?:это\s+не\s+решает(?:\s+мою\s+задачу)?|не\s+решает\s+(?:мою\s+)?задачу|не\s+помогает|бесполезн(?:о|ый|ая)|увилива(?:ешь|ние)|ты\s+уклоняешься|this\s+does\s+not\s+solve\s+(?:my\s+)?(?:task|problem)|doesn'?t\s+(?:solve|help)|you(?:'re|\s+are)\s+avoiding|useless\s+answer|not\s+what\s+I\s+(?:asked|need))/i;
const RE_LIMITATION_ONLY = /(?:невозможн|недоступн|не\s+могу\s+(?:дать|предсказать|спрогнозировать)|точный\s+(?:прогноз|ответ)\s+невозможен|cannot\s+(?:give|provide|predict)|impossible\s+to\s+(?:give|predict)|no\s+(?:exact|precise)\s+(?:forecast|answer)|I\s+(?:cannot|can't)\s+(?:give|provide))/i;

export function detectUserIntentFlags(lastUserText: string, history: Array<{ role: string; content: string }> = []): UserIntentFlags {
  const text = String(lastUserText || '');
  const recentUser = history
    .filter((m) => m?.role === 'user')
    .slice(-4)
    .map((m) => String(m.content || ''))
    .join('\n');
  return {
    userForbadeQuestions: RE_FORBADE_QUESTIONS.test(text) || RE_FORBADE_QUESTIONS.test(recentUser),
    userAskedApproximate: RE_ASKED_APPROXIMATE.test(text),
    userAskedSearch: RE_ASKED_SEARCH.test(text),
    userCriticizedEvasion: RE_CRITICIZED_EVASION.test(text),
  };
}

/** Soft-audit helper: reply is essentially only an explanation of limits (no gain, no next step). */
export function isLimitationOnlyReply(out: any, audit: GainAuditSlice): boolean {
  if (audit.substantiveGain.length > 0 || audit.structuralNew.length > 0 || audit.hasNextStep) return false;
  const reply = String(out?.reply || '');
  if (!reply.trim()) return true;
  return RE_LIMITATION_ONLY.test(reply);
}
