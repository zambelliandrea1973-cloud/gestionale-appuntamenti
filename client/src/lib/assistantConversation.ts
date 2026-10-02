import { ApiRequestError } from './apiError';

export interface AssistantTurn {
  controller: AbortController;
}

// React state updates are not synchronous. This lock also guards callbacks
// captured by an earlier render and invalidates responses from a closed dialog.
export function createAssistantTurnController() {
  let current: AssistantTurn | null = null;
  return {
    begin(): AssistantTurn | null {
      if (current) return null;
      current = { controller: new AbortController() };
      return current;
    },
    isBusy: () => current !== null,
    isCurrent: (turn: AssistantTurn) => current === turn,
    finish(turn: AssistantTurn): boolean {
      if (current !== turn) return false;
      current = null;
      return true;
    },
    cancel() {
      const previous = current;
      current = null;
      previous?.controller.abort();
    }
  };
}

export function assistantInterpretationErrorKey(error: unknown): string {
  if (error instanceof ApiRequestError) {
    const providerMessages: Record<string, string> = {
      AI_PROVIDER_NOT_CONFIGURED: 'interpretationKeyMissing',
      AI_PROVIDER_AUTH_FAILED: 'interpretationKeyRejected',
      AI_PROVIDER_QUOTA_EXHAUSTED: 'interpretationQuotaExceeded',
      AI_PROVIDER_RATE_LIMITED: 'interpretationRateLimited',
      AI_PROVIDER_ACCESS_DENIED: 'interpretationProviderSetupError',
      AI_PROVIDER_MODEL_UNAVAILABLE: 'interpretationProviderSetupError',
      AI_PROVIDER_REQUEST_INVALID: 'interpretationProviderSetupError',
      AI_PROVIDER_CONNECTION_FAILED: 'interpretationConnectionError',
      AI_PROVIDER_TIMEOUT: 'interpretationConnectionError',
      AI_ASSISTANT_INTERNAL_ERROR: 'interpretationInternalError'
    };
    if (error.code && Object.hasOwn(providerMessages, error.code)) return providerMessages[error.code];
  }
  if (error instanceof ApiRequestError &&
      (error.status >= 500 || /^AI_INTERPRETATION_(UNAVAILABLE|INVALID)$/.test(error.code || ''))) {
    return 'interpretationUnavailable';
  }
  if (error instanceof Error && (error.name === 'AbortError' || error.name === 'TypeError')) {
    return 'interpretationUnavailable';
  }
  return 'interpretationError';
}