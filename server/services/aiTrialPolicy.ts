export const AI_TRIAL_LIMITS = { appointments: 10, marketing: 5 } as const;
export const AI_TRIAL_DAYS = 40;
export const AI_CONVERSATION_MINUTES = 60;
export const AI_CONVERSATION_MAX_INTERPRETATIONS = 25;
export const AI_CONVERSATION_MAX_SPEECH = 30;
export const AI_CONVERSATION_MAX_CHARACTERS = 12000;
export type AITrialFeature = keyof typeof AI_TRIAL_LIMITS;

export interface AITrialLicense {
  type: string;
  is_active: boolean | null;
  created_at: Date | string | null;
  activated_at: Date | string | null;
  expires_at: Date | string | null;
}

export function evaluateAITrialLicense(licenses: AITrialLicense[], now = new Date()) {
  const paidTypes = new Set(['base', 'pro', 'business', 'staff_free', 'staff_free_10years', 'passepartout']);
  const validDate = (value: Date | string | null) => value ? new Date(value).getTime() : NaN;
  const paid = licenses.some(license => license.is_active && paidTypes.has(license.type) &&
    (!license.expires_at || validDate(license.expires_at) > now.getTime()));
  if (paid) return { unlimited: true, eligible: true, expiresAt: null };
  const trials = licenses.filter(license => license.type === 'trial').sort((a, b) =>
    validDate(b.activated_at || b.created_at) - validDate(a.activated_at || a.created_at));
  const trial = trials[0];
  if (!trial) return { unlimited: false, eligible: false, expiresAt: null };
  const start = validDate(trial.activated_at || trial.created_at);
  const maximumEnd = start + AI_TRIAL_DAYS * 86400000;
  const explicitEnd = validDate(trial.expires_at);
  const end = Number.isFinite(explicitEnd) ? Math.min(maximumEnd, explicitEnd) : maximumEnd;
  const eligible = Boolean(trial.is_active && Number.isFinite(start) && start <= now.getTime() && end > now.getTime());
  return { unlimited: false, eligible, expiresAt: Number.isFinite(end) ? new Date(end).toISOString() : null };
}