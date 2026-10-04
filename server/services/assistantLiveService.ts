import { randomBytes } from 'node:crypto';
import type { Express } from 'express';
import type { Server } from 'node:http';
import WebSocket, { WebSocketServer } from 'ws';
import rateLimit from 'express-rate-limit';
import { z } from 'zod';
import { requireAuth } from '../middleware/authMiddleware';
import { sendAITrialError } from '../routes/aiTrialRoutes';
import { authorizeAppointmentAI, beginAppointmentConversation, getAITrialUsage } from './aiTrialUsageService';
import { liveAppointmentSetup, liveInterpretationSchema, LIVE_SESSION_MS, LIVE_SOCKET_PATH } from '../../shared/liveAppointmentProtocol';

const startSchema = z.object({
  mode: z.enum(['work', 'personal']),
  language: z.string().min(2).max(20),
  greeting: z.string().min(1).max(250),
  conversationId: z.string().uuid().nullable().optional(),
});
type Ticket = z.infer<typeof startSchema> & { userId: number; expires: number };
const tickets = new Map<string, Ticket>();
const activeAccounts = new Map<number, WebSocket>();

/** One-use, short-lived capabilities. No API key or audio is sent to storage. */
export function consumeLiveTicket(ticket: string): Ticket | undefined {
  const value = tickets.get(ticket);
  tickets.delete(ticket);
  return value && value.expires > Date.now() ? value : undefined;
}
export function sameLiveOrigin(origin: string | undefined, host: string | undefined) {
  try { return !!origin && !!host && new URL(origin).host === host; } catch { return false; }
}

const defaultDependencies = {
  getAITrialUsage, beginAppointmentConversation, authorizeAppointmentAI,
  connectProvider: (key: string) => new WebSocket(
    'wss://generativelanguage.googleapis.com/ws/google.ai.generativelanguage.v1beta.GenerativeService.BidiGenerateContent?key=' + encodeURIComponent(key),
    { maxPayload: 2 * 1024 * 1024 },
  ),
};
export function registerAssistantLive(app: Express, server: Server, dependencies = defaultDependencies) {
  app.post('/api/ai-appointment-assistant/live-session', requireAuth, rateLimit({
    windowMs: 60_000, limit: 10, standardHeaders: true, legacyHeaders: false,
  }), async (req, res) => {
    const input = startSchema.safeParse(req.body);
    if (!input.success) return res.status(400).json({ message: 'Invalid voice session' });
    if (!process.env.GEMINI_APPOINTMENTS_API_KEY) {
      return res.status(503).json({ code: 'LIVE_NOT_CONFIGURED', message: 'Il servizio Gemini Live non è configurato su questo server.' });
    }
    try {
      const userId = Number((req.user as { id: number }).id);
      const access = await dependencies.getAITrialUsage(userId);
      if (!access.eligible || (!access.unlimited && access.appointments.remaining === 0 && !input.data.conversationId)) {
        return res.status(403).json({ code: access.eligible ? 'AI_TRIAL_LIMIT_REACHED' : 'AI_TRIAL_EXPIRED' });
      }
      for (const [key, value] of Array.from(tickets)) if (value.expires <= Date.now()) tickets.delete(key);
      if (tickets.size >= 500) return res.status(503).json({ message: 'Voice service busy' });
      const ticket = randomBytes(32).toString('hex');
      tickets.set(ticket, { ...input.data, userId, expires: Date.now() + 60_000 });
      res.set('Cache-Control', 'no-store').json({ ticket, path: LIVE_SOCKET_PATH });
    } catch (error) {
      if (!sendAITrialError(error, res)) res.status(503).json({ message: 'Voice access unavailable' });
    }
  });

  const sockets = new WebSocketServer({ noServer: true, maxPayload: 64 * 1024 });
  server.on('upgrade', (req, socket, head) => {
    if (req.url?.split('?')[0] !== LIVE_SOCKET_PATH) return; // Preserve Vite/other WebSockets.
    if (sockets.clients.size >= 500 || !sameLiveOrigin(req.headers.origin, req.headers.host)) {
      socket.write('HTTP/1.1 403 Forbidden\r\nConnection: close\r\n\r\n');
      socket.destroy();
      return;
    }
    sockets.handleUpgrade(req, socket, head, ws => sockets.emit('connection', ws));
  });
  sockets.on('connection', client => {
    let upstream: WebSocket | undefined;
    let ticket: Ticket | undefined;
    let conversationId: string | null = null;
    let activated = false, ready = false, closed = false;
    let queued = Promise.resolve();
    let bytes = 0, windowStart = Date.now();
    let inputText = '';
    let toolBusy = false;
    const pendingCalls = new Set<string>();
    const send = (data: object) => {
      if (client.readyState !== WebSocket.OPEN) return;
      if (client.bufferedAmount >= 512 * 1024) { client.close(1013); return; }
      client.send(JSON.stringify(data));
    };
    const timers: ReturnType<typeof setTimeout>[] = [];
    const close = (code?: string) => {
      if (closed) return;
      closed = true;
      if (code) send({ type: 'error', code });
      timers.forEach(clearTimeout);
      upstream?.close();
      client.close(1000);
      if (ticket && activeAccounts.get(ticket.userId) === client) activeAccounts.delete(ticket.userId);
    };
    const forward = (data: object) => {
      if (!ready || upstream?.readyState !== WebSocket.OPEN || upstream.bufferedAmount > 512 * 1024) throw new Error('Live unavailable');
      upstream.send(JSON.stringify(data));
    };
    const activate = async () => {
      if (activated || !ticket) return;
      const result = await dependencies.beginAppointmentConversation(ticket.userId, ticket.conversationId);
      if (closed) return;
      conversationId = result.conversationId;
      activated = true;
      send({ type: 'active', conversationId });
    };
    timers.push(setTimeout(() => close('LIVE_START_TIMEOUT'), 15_000));
    timers.push(setTimeout(() => close('AI_CONVERSATION_EXPIRED'), LIVE_SESSION_MS));
    // An unused greeting/session cannot stay connected and accrue unbounded cost.
    const idleTimer = setTimeout(() => { if (!activated) close('LIVE_IDLE_TIMEOUT'); }, 90_000);
    timers.push(idleTimer);
    client.on('close', () => close());
    client.on('error', () => close());
    client.on('message', raw => {
      if (closed) return;
      if (Date.now() - windowStart > 60_000) { bytes = 0; windowStart = Date.now(); }
      bytes += raw.toString().length;
      if (bytes > 4 * 1024 * 1024) { close('LIVE_RATE_LIMIT'); return; }
      queued = queued.then(async () => {
        if (closed) return;
        const message = JSON.parse(raw.toString());
        if (!ticket) {
          if (message.type !== 'start' || typeof message.ticket !== 'string') { close('LIVE_AUTH_REQUIRED'); return; }
          ticket = consumeLiveTicket(message.ticket);
          if (!ticket) { close('LIVE_AUTH_REQUIRED'); return; }
          activeAccounts.get(ticket.userId)?.close(1000);
          activeAccounts.set(ticket.userId, client);
          const key = process.env.GEMINI_APPOINTMENTS_API_KEY;
          if (!key) { close('LIVE_NOT_CONFIGURED'); return; }
          upstream = dependencies.connectProvider(key);
          upstream.on('open', () => {
            if (!closed && ticket) upstream!.send(JSON.stringify(liveAppointmentSetup(ticket.mode, ticket.language)));
          });
          let providerQueue = Promise.resolve();
          let deferredCall: { id: string; name: string; args: unknown } | null = null;
          let transcriptionTimer: ReturnType<typeof setTimeout> | undefined;
          const deliverCall = async (call: { id: string; name: string; args: unknown }) => {
            const parsed = liveInterpretationSchema.safeParse(call.args);
            if (!parsed.success || !inputText.trim() || !activated || !ticket) {
              forward({ toolResponse: { functionResponses: [{ id: call.id, name: call.name, response: {
                reply: 'Non ho ricevuto una richiesta completa. Ripeti per favore.',
              } }] } });
              toolBusy = false;
              return;
            }
            await dependencies.authorizeAppointmentAI(ticket.userId, conversationId, 'interpretation');
            if (closed) return;
            toolBusy = true;
            pendingCalls.add(call.id);
            send({ type: 'turn', id: call.id, text: inputText.trim(), interpretation: parsed.data });
            inputText = '';
          };
          upstream.on('message', data => {
            providerQueue = providerQueue.then(async () => {
              if (closed || !ticket) return;
              const event = JSON.parse(data.toString());
              if (event.setupComplete) {
                ready = true;
                clearTimeout(timers[0]);
                send({ type: 'ready' });
                forward({ clientContent: { turns: [{ role: 'user', parts: [{ text: 'APP_SAY ' + ticket.greeting }] }], turnComplete: true } });
              }
              const content = event.serverContent;
              if (content?.inputTranscription?.text) {
                inputText += content.inputTranscription.text;
                inputText = inputText.slice(-1500);
                send({ type: 'transcript', text: inputText });
                // Google transcription and tool events can arrive in either order.
                // Wait for the user's actual words; never invent approval from tool args.
                if (deferredCall) {
                  clearTimeout(transcriptionTimer);
                  transcriptionTimer = setTimeout(() => {
                    providerQueue = providerQueue.then(async () => {
                      if (closed || !deferredCall) return;
                      const call = deferredCall;
                      deferredCall = null;
                      await deliverCall(call);
                    }).catch(() => close('LIVE_PROVIDER_ERROR'));
                  }, 100);
                  timers.push(transcriptionTimer);
                }
              }
              if (content?.interrupted) send({ type: 'interrupted' });
              for (const part of content?.modelTurn?.parts || []) {
                if (part.inlineData?.data && /^audio\/pcm/.test(part.inlineData.mimeType || '')) {
                  send({ type: 'audio', data: part.inlineData.data });
                }
              }
              if (content?.turnComplete) send({ type: 'turnComplete' });
              if (event.toolCallCancellation) {
                for (const id of event.toolCallCancellation.ids || []) pendingCalls.delete(id);
                if (deferredCall && event.toolCallCancellation.ids?.includes(deferredCall.id)) {
                  deferredCall = null;
                  clearTimeout(transcriptionTimer);
                  inputText = '';
                }
                toolBusy = pendingCalls.size > 0;
                send({ type: 'cancelTurn' });
              }
              for (const call of event.toolCall?.functionCalls || []) {
                if (call.name !== 'appointment_turn' || typeof call.id !== 'string' || toolBusy) { close('LIVE_INVALID_TOOL'); return; }
                if (!inputText.trim() && activated && liveInterpretationSchema.safeParse(call.args).success) {
                  deferredCall = call;
                  toolBusy = true;
                  transcriptionTimer = setTimeout(() => close('LIVE_TRANSCRIPT_MISSING'), 6000);
                  timers.push(transcriptionTimer);
                } else {
                  await deliverCall(call);
                }
              }
              if (event.error) close('LIVE_PROVIDER_ERROR');
              if (event.goAway) close('AI_CONVERSATION_EXPIRED');
            }).catch(() => close('LIVE_PROVIDER_ERROR'));
          });
          upstream.on('error', () => close('LIVE_PROVIDER_ERROR')); // Do not log URL/key/provider payload.
          upstream.on('close', (_code, reason) => close(
            /not found|permission|not supported|model/i.test(reason.toString()) ? 'LIVE_MODEL_UNAVAILABLE' : 'LIVE_PROVIDER_CLOSED'));
          return;
        }
        if (message.type === 'audio') {
          if (typeof message.data !== 'string' || !/^[A-Za-z0-9+/]*={0,2}$/.test(message.data) || message.data.length > 16000) throw new Error('Invalid audio');
          await activate();
          if (!closed) forward({ realtimeInput: { audio: { data: message.data, mimeType: 'audio/pcm;rate=16000' } } });
        } else if (message.type === 'text') {
          const text = z.string().trim().min(1).max(1500).parse(message.text);
          await activate();
          inputText = text;
          if (!closed) forward({ clientContent: { turns: [{ role: 'user', parts: [{ text }] }], turnComplete: true } });
        } else if (message.type === 'reply') {
          const text = z.string().min(1).max(2000).parse(message.text);
          if (typeof message.id !== 'string' || !pendingCalls.delete(message.id)) throw new Error('Unknown tool');
          await dependencies.authorizeAppointmentAI(ticket.userId, conversationId, 'speech', text.length);
          if (!closed) forward({ toolResponse: { functionResponses: [{ id: message.id, name: 'appointment_turn', response: { reply: text } }] } });
          toolBusy = false;
        } else if (message.type === 'say') {
          const text = z.string().min(1).max(2000).parse(message.text);
          if (!activated) throw new Error('Conversation required');
          await dependencies.authorizeAppointmentAI(ticket.userId, conversationId, 'speech', text.length);
          if (!closed) forward({ clientContent: { turns: [{ role: 'user', parts: [{ text: 'APP_SAY ' + text }] }], turnComplete: true } });
        } else if (message.type === 'mute') {
          if (activated) forward({ realtimeInput: { audioStreamEnd: true } });
        } else throw new Error('Invalid live message');
      }).catch(error => close(typeof error?.code === 'string' && error.code.startsWith('AI_') ? error.code : 'LIVE_CONNECTION_ERROR'));
    });
  });
}