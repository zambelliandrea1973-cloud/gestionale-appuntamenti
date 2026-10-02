import assert from 'node:assert/strict';
import test from 'node:test';
import { ApiRequestError } from '../client/src/lib/apiError';
import { assistantInterpretationErrorKey, createAssistantTurnController } from '../client/src/lib/assistantConversation';
import { apiRequest } from '../client/src/lib/queryClient';

test('locks immediately, before React can render the busy state', () => {
  const turns = createAssistantTurnController();
  const first = turns.begin()!;
  assert.ok(first);
  for (let i = 0; i < 10; i++) assert.equal(turns.begin(), null);
  assert.equal(turns.isBusy(), true);
  assert.equal(turns.finish(first), true);
  assert.ok(turns.begin());
});

test('closing aborts the request and makes late responses inactive', () => {
  const turns = createAssistantTurnController();
  const old = turns.begin()!;
  turns.cancel();
  assert.equal(old.controller.signal.aborted, true);
  assert.equal(turns.isCurrent(old), false);
  const fresh = turns.begin()!;
  assert.equal(turns.finish(old), false);
  assert.equal(turns.isCurrent(fresh), true);
  assert.equal(turns.isBusy(), true);
});

test('completed turns cannot clear another request and repeated legitimate replies remain possible', () => {
  const turns = createAssistantTurnController();
  const first = turns.begin()!;
  assert.equal(turns.finish(first), true);
  const second = turns.begin()!;
  assert.equal(turns.finish(first), false);
  assert.equal(turns.isCurrent(second), true);
  assert.equal(turns.finish(second), true);
  assert.equal(turns.isBusy(), false);
});

test('service, timeout and network errors are not reported as unrecognized speech', () => {
  for (const error of [
    new ApiRequestError('Human readable message', 503, 'AI_INTERPRETATION_UNAVAILABLE'),
    new ApiRequestError('Invalid response', 502, 'AI_INTERPRETATION_INVALID'),
    new ApiRequestError('Server error', 500),
    new DOMException('Timed out', 'AbortError'),
    new TypeError('Failed to fetch')
  ]) assert.equal(assistantInterpretationErrorKey(error), 'interpretationUnavailable');
  assert.equal(assistantInterpretationErrorKey(new ApiRequestError('Bad request', 400)), 'interpretationError');
});

test('specific provider diagnoses take precedence over generic server and trial failures', () => {
  const messages = {
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
  for (const [code, key] of Object.entries(messages)) {
    assert.equal(assistantInterpretationErrorKey(new ApiRequestError('Unavailable', 503, code)), key);
  }
  assert.equal(assistantInterpretationErrorKey(new ApiRequestError('Limited', 429, 'AI_PROVIDER_RATE_LIMITED')), 'interpretationRateLimited');
  assert.equal(assistantInterpretationErrorKey(new ApiRequestError('Unknown', 503, '__proto__')), 'interpretationUnavailable');
});

test('apiRequest preserves status and provider code, and forwards the abort signal', async () => {
  const originalWindow = Object.getOwnPropertyDescriptor(globalThis, 'window');
  const originalNavigator = Object.getOwnPropertyDescriptor(globalThis, 'navigator');
  const originalDocument = Object.getOwnPropertyDescriptor(globalThis, 'document');
  const originalFetch = globalThis.fetch;
  const controller = new AbortController();
  try {
    Object.defineProperty(globalThis, 'window', { configurable: true, value: { matchMedia: () => ({ matches: false }), navigator: {} } });
    Object.defineProperty(globalThis, 'navigator', { configurable: true, value: { userAgent: 'Chrome' } });
    Object.defineProperty(globalThis, 'document', { configurable: true, value: { referrer: '' } });
    globalThis.fetch = async (_url, options) => {
      assert.equal(options?.signal, controller.signal);
      return new Response(JSON.stringify({ code: 'AI_INTERPRETATION_UNAVAILABLE', message: 'Service unavailable' }), { status: 503 });
    };
    await assert.rejects(
      apiRequest('POST', '/api/ai-appointment-assistant/interpret', { message: 'test' }, { signal: controller.signal }),
      error => error instanceof ApiRequestError && error.status === 503 && error.code === 'AI_INTERPRETATION_UNAVAILABLE'
    );
  } finally {
    globalThis.fetch = originalFetch;
    for (const [key, descriptor] of [['window', originalWindow], ['navigator', originalNavigator], ['document', originalDocument]] as const) {
      if (descriptor) Object.defineProperty(globalThis, key, descriptor);
      else Reflect.deleteProperty(globalThis, key);
    }
  }
});