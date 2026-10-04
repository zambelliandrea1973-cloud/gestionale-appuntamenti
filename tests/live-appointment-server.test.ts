import assert from 'node:assert/strict';
import test from 'node:test';
import express from 'express';
import { createServer } from 'node:http';
import { EventEmitter, once } from 'node:events';
import WebSocket from 'ws';
import { registerAssistantLive, sameLiveOrigin } from '../server/services/assistantLiveService';

test('Live socket origins must match the app and cannot use absent or malformed origins', () => {
  assert.equal(sameLiveOrigin('https://example.test', 'example.test'), true);
  assert.equal(sameLiveOrigin('https://other.test', 'example.test'), false);
  assert.equal(sameLiveOrigin(undefined, 'example.test'), false);
  assert.equal(sameLiveOrigin('bad', 'example.test'), false);
});

test('Live proxy has one-use authorization, deferred trial reservation, verified tool replies and no database writes in the test', async t => {
  const previous = process.env.GEMINI_APPOINTMENTS_API_KEY;
  process.env.GEMINI_APPOINTMENTS_API_KEY = 'unit-test-key';
  t.after(() => {
    if (previous === undefined) delete process.env.GEMINI_APPOINTMENTS_API_KEY;
    else process.env.GEMINI_APPOINTMENTS_API_KEY = previous;
  });
  let reservations = 0;
  const authorizations: string[] = [], providers: Provider[] = [];
  class Provider extends EventEmitter {
    readyState = WebSocket.OPEN; bufferedAmount = 0; sent: any[] = [];
    send(value: string) { this.sent.push(JSON.parse(value)); }
    close() { this.readyState = WebSocket.CLOSED; this.emit('close', 1000, Buffer.alloc(0)); }
    event(value: object) { this.emit('message', Buffer.from(JSON.stringify(value))); }
  }
  const app = express(); app.use(express.json());
  app.use((req: any, _res, next) => { req.user = { id: 99101 }; req.isAuthenticated = () => true; next(); });
  const server = createServer(app);
  registerAssistantLive(app, server, {
    getAITrialUsage: async () => ({ eligible: true, unlimited: false, expiresAt: null,
      appointments: { remaining: 2, used: 0, limit: 2 }, marketing: { remaining: 2, used: 0, limit: 2 } }) as any,
    beginAppointmentConversation: async () => { reservations++; return { conversationId: 'trial-token', usage: {} as any }; },
    authorizeAppointmentAI: async (_user, id, kind) => { assert.equal(id, 'trial-token'); authorizations.push(kind); },
    connectProvider: () => { const provider = new Provider(); providers.push(provider); queueMicrotask(() => provider.emit('open')); return provider as any; },
  });
  server.listen(0, '127.0.0.1'); await once(server, 'listening');
  const port = (server.address() as any).port;
  const origin = `http://127.0.0.1:${port}`;
  const created = await fetch(origin + '/api/ai-appointment-assistant/live-session', {
    method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ mode: 'personal', language: 'it-IT', greeting: 'Ciao. Dimmi pure.' }),
  });
  assert.equal(created.status, 200);
  const { ticket, path } = await created.json();
  const client = new WebSocket(origin.replace('http:', 'ws:') + path, { origin });
  const received: any[] = [];
  client.on('message', raw => received.push(JSON.parse(raw.toString())));
  t.after(() => { client.terminate(); server.closeAllConnections(); server.close(); });
  await once(client, 'open');
  const wait = async (predicate: () => boolean) => {
    for (let count = 0; count < 100 && !predicate(); count++) await new Promise(resolve => setTimeout(resolve, 5));
    assert.ok(predicate());
  };
  client.send(JSON.stringify({ type: 'start', ticket }));
  await wait(() => providers.length > 0 && providers[0].sent.length > 0);
  const provider = providers[0];
  provider.event({ setupComplete: {} });
  await wait(() => received.some(value => value.type === 'ready'));
  assert.equal(reservations, 0, 'Opening and greeting do not spend a trial conversation');
  assert.match(provider.sent[1].clientContent.turns[0].parts[0].text, /^APP_SAY /);
  // Replaying an consumed capability cannot open a second provider connection.
  const replay = new WebSocket(origin.replace('http:', 'ws:') + path, { origin });
  replay.on('error', () => {});
  await once(replay, 'open');
  replay.send(JSON.stringify({ type: 'start', ticket }));
  await once(replay, 'close');
  assert.equal(providers.length, 1);
  client.send(JSON.stringify({ type: 'audio', data: Buffer.alloc(32).toString('base64') }));
  await wait(() => received.some(value => value.type === 'active'));
  assert.equal(reservations, 1);
  provider.event({
    serverContent: { inputTranscription: { text: 'Dentista domani alle nove' } },
    toolCall: { functionCalls: [{ id: 'tool-1', name: 'appointment_turn', args: { title: 'Dentista', startTime: '09:00' } }] },
  });
  await wait(() => received.some(value => value.type === 'turn'));
  const turn = received.find(value => value.type === 'turn');
  assert.equal(turn.text, 'Dentista domani alle nove');
  assert.deepEqual(authorizations, ['interpretation']);
  client.send(JSON.stringify({ type: 'reply', id: turn.id, text: 'Confermi questo impegno?' }));
  await wait(() => provider.sent.some(value => value.toolResponse));
  assert.deepEqual(authorizations, ['interpretation', 'speech']);
  assert.equal(reservations, 1);
  provider.event({ toolCall: { functionCalls: [{ id: 'tool-2', name: 'appointment_turn', args: { startTime: '10:00' } }] } });
  await new Promise(resolve => setTimeout(resolve, 10));
  assert.equal(received.filter(value => value.type === 'turn').length, 1, 'A premature tool cannot invent a user confirmation');
  provider.event({ serverContent: { inputTranscription: { text: 'No, alle dieci' } } });
  await wait(() => received.some(value => value.type === 'turn' && value.id === 'tool-2'));
  assert.equal(received.find(value => value.id === 'tool-2').text, 'No, alle dieci');
  client.send(JSON.stringify({ type: 'reply', id: 'tool-2', text: 'Controlla la nuova bozza.' }));
  await wait(() => authorizations.length === 4);
  // A fabricated tool response is rejected rather than allowing arbitrary provider commands.
  client.send(JSON.stringify({ type: 'reply', id: 'not-issued', text: 'Saved' }));
  await once(client, 'close');
  assert.ok(received.some(value => value.type === 'error'));
});