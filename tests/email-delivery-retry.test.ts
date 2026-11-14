import test from 'node:test';
import assert from 'node:assert/strict';
import { sendEmailWithRetry } from '../server/services/emailDeliveryRetry';

test('retries a temporary SMTP connection failure and records the successful attempt', async () => {
  let calls = 0;
  const attempts: number[] = [];
  const result = await sendEmailWithRetry(async () => {
    calls++;
    return calls === 1
      ? { success: false, error: 'connect ETIMEDOUT' }
      : { success: true };
  }, {
    retryDelayMs: [0, 0],
    beforeAttempt: async (attempt) => { attempts.push(attempt); },
  });

  assert.equal(result.result.success, true);
  assert.equal(result.attempts, 2);
  assert.deepEqual(attempts, [1, 2]);
});

test('does not retry missing email configuration or permanent SMTP errors', async () => {
  let calls = 0;
  const result = await sendEmailWithRetry(async () => {
    calls++;
    return { success: false, error: 'Email configuration not available' };
  }, { retryDelayMs: [0, 0] });

  assert.equal(result.result.success, false);
  assert.equal(result.attempts, 1);
  assert.equal(calls, 1);
});

test('stops after the configured maximum number of transient failures', async () => {
  let calls = 0;
  const result = await sendEmailWithRetry(async () => {
    calls++;
    return { success: false, error: 'SMTP 451 temporarily unavailable' };
  }, { maxAttempts: 3, retryDelayMs: [0, 0] });

  assert.equal(result.result.success, false);
  assert.equal(result.attempts, 3);
  assert.equal(calls, 3);
});
