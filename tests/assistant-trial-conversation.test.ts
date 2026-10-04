import assert from 'node:assert/strict';
import test from 'node:test';
import { createAssistantTrialConversation } from '../client/src/lib/assistantTrialConversation';

test('one booking conversation is reserved only once across phrases and parallel callbacks', async () => {
  const conversation = createAssistantTrialConversation();
  let calls = 0;
  const start = async () => { calls++; return { conversationId: 'one-token' }; };
  assert.equal(conversation.isActive(), false);
  const first = conversation.ensure(start);
  const second = conversation.ensure(start);
  assert.equal(first, second);
  assert.equal(await first, 'one-token');
  assert.equal(await conversation.ensure(start), 'one-token');
  assert.equal(calls, 1);
  assert.equal(conversation.isActive(), true);
  conversation.reset();
  assert.equal(conversation.isActive(), false);
  await conversation.ensure(start);
  assert.equal(calls, 2);
});

test('paid accounts reuse a successful null token without trial reservations for every phrase', async () => {
  const conversation = createAssistantTrialConversation();
  let calls = 0;
  const start = async () => { calls++; return { conversationId: null }; };
  await conversation.ensure(start);
  await conversation.ensure(start);
  assert.equal(calls, 1);
  assert.equal(conversation.isActive(), true);
  assert.equal(conversation.getId(), null);
});

test('failed reservation is retryable and a reset ignores a stale response', async () => {
  const conversation = createAssistantTrialConversation();
  await assert.rejects(conversation.ensure(async () => { throw new Error('Quota reached'); }), /Quota reached/);
  assert.equal(conversation.isActive(), false);
  let finish!: (value: { conversationId: string }) => void;
  const pending = conversation.ensure(() => new Promise(resolve => { finish = resolve; }));
  await Promise.resolve();
  conversation.reset();
  finish({ conversationId: 'stale-token' });
  await assert.rejects(pending, { name: 'AbortError' });
  assert.equal(conversation.getId(), null);
  await conversation.ensure(async () => ({ conversationId: 'fresh-token' }));
  assert.equal(conversation.getId(), 'fresh-token');
});