export interface EmailSendOutcome {
  success: boolean;
  error?: string;
}

export interface EmailRetryOptions {
  maxAttempts?: number;
  retryDelayMs?: number[];
  beforeAttempt?: (attempt: number) => Promise<void>;
  onRetry?: (attempt: number, error: string) => void;
}

const TRANSIENT_EMAIL_FAILURE =
  /\b(ECONNECTION|ETIMEDOUT|ECONNRESET|EAI_AGAIN|ESOCKET|EHOSTUNREACH|ENETUNREACH|EPIPE)\b|(?:^|\D)4(?:21|50|51|52)(?:\D|$)|timed?\s*out|temporar(?:y|ily)|try again/i;

export function isTransientEmailFailure(error?: string): boolean {
  return !!error && TRANSIENT_EMAIL_FAILURE.test(error);
}

export async function sendEmailWithRetry<T extends EmailSendOutcome>(
  send: () => Promise<T>,
  options: EmailRetryOptions = {},
): Promise<{ result: T; attempts: number }> {
  const maxAttempts = Math.max(1, options.maxAttempts ?? 3);
  const retryDelayMs = options.retryDelayMs ?? [1000, 3000];

  for (let attempt = 1; attempt <= maxAttempts; attempt++) {
    try {
      await options.beforeAttempt?.(attempt);
    } catch (error) {
      // Tracking should not prevent a welcome email from being sent.
      console.error('[WELCOME EMAIL] Could not persist attempt status:', error);
    }

    let result: T;
    try {
      result = await send();
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      result = { success: false, error: message } as T;
    }

    if (result.success || !isTransientEmailFailure(result.error) || attempt === maxAttempts) {
      return { result, attempts: attempt };
    }

    options.onRetry?.(attempt, result.error || 'Temporary email delivery failure');
    const delay = retryDelayMs[Math.min(attempt - 1, retryDelayMs.length - 1)] ?? 0;
    if (delay > 0) {
      await new Promise((resolve) => setTimeout(resolve, delay));
    }
  }

  throw new Error('Email retry loop ended unexpectedly');
}
