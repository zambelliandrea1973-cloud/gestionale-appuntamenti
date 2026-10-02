import { useQuery } from '@tanstack/react-query';
import { ApiRequestError } from '@/lib/apiError';

export interface AITrialAccess {
  unlimited: boolean;
  eligible: boolean;
  expiresAt: string | null;
  appointments: { used: number; limit: number; remaining: number };
  marketing: { used: number; limit: number; remaining: number };
}
export const AI_TRIAL_ACCESS_KEY = ['/api/ai/trial-access'] as const;
export function useAITrialAccess(enabled = true) {
  return useQuery<AITrialAccess>({ queryKey: AI_TRIAL_ACCESS_KEY, enabled, staleTime: 0 });
}
export function aiTrialMessageKey(error: unknown): string | null {
  if (!(error instanceof ApiRequestError)) return null;
  if (error.code === 'AI_TRIAL_EXPIRED') return 'aiTrial.trialExpired';
  if (error.code?.startsWith('AI_TRIAL_')) return 'aiTrial.limitReached';
  if (error.code?.startsWith('AI_CONVERSATION_')) return 'aiTrial.conversationExpired';
  return null;
}