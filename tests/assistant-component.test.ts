import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { spawnSync } from 'node:child_process';
import path from 'node:path';
import test from 'node:test';
import ts from 'typescript';
import { formatAssistantDate } from '../client/src/lib/appointmentAssistant';
import './assistant-speech.test';
import './assistant-trial-conversation.test';
import './ai-trial-policy.test';
import './personal-appointments.test';
import './appointment-mode-persistence.test';
import './assistant-recognition.test';
import './offline-assistant-greeting.test';
import './live-appointment-session.test';
import './live-appointment-server.test';

test('Italian confirmation dates include weekday, unpadded day, full month and year without mutating ISO dates', () => {
  assert.equal(formatAssistantDate('2026-10-19', 'it-IT'), 'lunedì 19 ottobre 2026');
  assert.equal(formatAssistantDate('2026-10-05', 'it'), 'lunedì 5 ottobre 2026');
  assert.equal(formatAssistantDate('2028-02-29', 'it-IT'), 'martedì 29 febbraio 2028');
  assert.equal(formatAssistantDate('2026-02-30', 'it-IT'), '2026-02-30');
  assert.equal(formatAssistantDate('', 'it-IT'), '');
  assert.match(formatAssistantDate('2026-10-19', 'en-US'), /Monday.*October.*19.*2026/);
  const personal = readFileSync('client/src/components/PersonalVoiceAppointmentAssistant.tsx', 'utf8');
  const work = readFileSync('client/src/components/VoiceAppointmentAssistant.tsx', 'utf8');
  assert.match(personal, /formatAssistantDate\(ready\.data\.date, locale\)/);
  assert.match(work, /formatAssistantDate\(nextDraft\.date, speechLocale\)/);
  assert.match(personal, /save\.mutate\(ready\.data\)/);
});

test('the restored appointment assistant has no unresolved runtime names', () => {
  const root = process.cwd();
  const config = ts.readConfigFile(path.join(root, 'tsconfig.json'), ts.sys.readFile);
  assert.equal(config.error, undefined);
  const parsed = ts.parseJsonConfigFileContent(config.config, ts.sys, root);
  const componentPath = path.join(root, 'client/src/components/VoiceAppointmentAssistant.tsx');
  const program = ts.createProgram([componentPath], { ...parsed.options, incremental: false });
  const component = program.getSourceFile(componentPath);
  assert.ok(component);
  const unresolved = program.getSemanticDiagnostics(component)
    .filter(diagnostic => diagnostic.code === 2304 || diagnostic.code === 2552)
    .map(diagnostic => ts.flattenDiagnosticMessageText(diagnostic.messageText, '\n'));
  assert.deepEqual(unresolved, []);
});

test('trial quotas reserve a conversation before interpretation and expose translated subscription actions', () => {
  const source = readFileSync('client/src/components/VoiceAppointmentAssistant.tsx', 'utf8');
  assert.match(source, /trialConversationRef\.current\.ensure/);
  assert.match(source, /conversationId: trialConversationRef\.current\.getId\(\)/);
  assert.ok(source.indexOf('await trialConversationRef.current.ensure') < source.indexOf("apiRequest('POST', '/api/ai-appointment-assistant/interpret'"));
  assert.match(source, /<AITrialNotice feature="appointments" activeConversation=\{conversationActive\} blocked=\{trialBlocked\}/);
  const notice = readFileSync('client/src/components/AITrialNotice.tsx', 'utf8');
  assert.match(notice, /href="\/subscribe"/);
  assert.match(notice, /t\('aiTrial\.subscribe'\)/);
});

test('both active voice entry points use Live audio and preserve authoritative transcript confirmation', () => {
  const source = readFileSync('client/src/components/VoiceAppointmentAssistant.tsx', 'utf8');
  const recognition = source.slice(source.indexOf('  const startListening ='), source.indexOf('  const stopListening ='));
  assert.match(recognition, /liveSessionRef\.current/);
  assert.match(recognition, /onTranscript: setInput/);
  assert.match(recognition, /void submitMessageRef\.current\(transcript\)/);
  assert.doesNotMatch(recognition, /event\.results.*\[0\]/);
  const personal = readFileSync('client/src/components/PersonalVoiceAppointmentAssistant.tsx', 'utf8');
  assert.match(personal, /createAssistantRecognition/);
  assert.match(personal, /onComplete: text/);
  assert.match(personal, /submitRef\.current\(text\)/);
  for (const component of [source, personal]) {
    assert.match(component, /startLiveAppointmentSession/);
    assert.match(component, /liveFields/);
    assert.match(component, /detectAssistantConfirmation/);
    assert.match(component, /conversationId: id/);
  }
  const submit = source.slice(source.indexOf('  const submitMessage ='), source.indexOf('  const startListening ='));
  assert.doesNotMatch(submit, /cancelListening|recognition\.abort/);
});

test('interpretation and Gemini speech both enforce server-side trial authorization before spending', () => {
  const interpretation = readFileSync('server/routes/aiAppointmentAssistantRoutes.ts', 'utf8');
  const speech = readFileSync('server/routes/assistantSpeechRoutes.ts', 'utf8');
  assert.match(interpretation, /router\.use\(trialRoutes\)/, 'Keep shared access endpoints for marketing and the rest of the app');
  for (const route of [interpretation, speech]) {
    assert.match(route, /requireAuth/);
    assert.match(route, /await authorizeAppointmentAI/);
    assert.match(route, /req\.body\?\.conversationId/);
    assert.match(route, /sendAITrialError\(error, res\)/);
  }
  assert.ok(interpretation.indexOf('await authorizeAppointmentAI') < interpretation.indexOf('await interpretAppointmentRequest'));
  assert.ok(speech.indexOf('await authorizeAppointmentAI') < speech.indexOf('await synthesizeAssistantSpeechStream'));
  assert.match(speech, /rateLimit/);
});

test('the original queued Gemini interpreter works with only the dedicated key, without legacy or OpenAI keys', () => {
  const result = spawnSync(process.execPath, ['--import', 'tsx', '--input-type=module', '-e', `
    import assert from 'node:assert/strict';
    import { mock } from 'node:test';
    import { GoogleGenerativeAI } from '@google/generative-ai';
    import { interpretAppointmentRequest } from './server/ai-chat.ts';
    let calls = 0;
    mock.method(GoogleGenerativeAI.prototype, 'getGenerativeModel', function (config) {
      assert.equal(this.apiKey, process.env.GEMINI_APPOINTMENTS_API_KEY);
      assert.equal(config.model, 'gemini-3.8-flash');
      assert.equal(config.generationConfig.responseMimeType, 'application/json');
      return { generateContent: async prompt => {
        calls++;
        assert.match(prompt, /modulo di comprensione di un assistente vocale/);
        assert.match(prompt, /Cliente Prova/);
        return { response: { text: () => JSON.stringify({
          clientName: 'Cliente Prova', date: '2026-10-04', startTime: '10:00',
          serviceName: null, durationMinutes: null, servicePrice: null,
          notes: null, confirmation: 'unknown'
        }) } };
      } };
    });
    const interpreted = await interpretAppointmentRequest('domani alle dieci', { clientName: 'Cliente Prova' }, 'it');
    assert.equal(calls, 1);
    assert.equal(interpreted.clientName, 'Cliente Prova');
    assert.equal(interpreted.startTime, '10:00');
    assert.equal(interpreted.servicePrice, null);
    assert.equal(process.env.GEMINI_API_KEY, undefined);
    assert.equal(process.env.OPENAI_API_KEY, undefined);
  `], {
    cwd: process.cwd(), encoding: 'utf8',
    env: { PATH: process.env.PATH, GEMINI_APPOINTMENTS_API_KEY: 'unit-test-placeholder-not-a-real-key' }
  });
  assert.equal(result.status, 0, result.stderr);
});

test('appointment conversations and existing marketing use different Gemini credentials', () => {
  const result = spawnSync(process.execPath, ['--import', 'tsx', '--input-type=module', '-e', `
    import assert from 'node:assert/strict';
    import { mock } from 'node:test';
    import { GoogleGenerativeAI } from '@google/generative-ai';
    import { interpretAppointmentRequest, generateMarketingCampaign } from './server/ai-chat.ts';
    const credentials = [];
    mock.method(GoogleGenerativeAI.prototype, 'getGenerativeModel', function (config) {
      credentials.push(this.apiKey);
      const appointment = this.apiKey === process.env.GEMINI_APPOINTMENTS_API_KEY;
      assert.equal(config.model, appointment ? 'gemini-3.8-flash' : 'gemini-2.5-flash');
      return { generateContent: async prompt => {
        assert.match(prompt, appointment ? /assistente vocale per appuntamenti/ : /esperto di marketing/);
        return { response: { text: () => JSON.stringify(appointment
          ? { clientName: 'Cliente Prova', confirmation: 'unknown' }
          : { title: 'Campagna prova', message: 'Messaggio prova' }) } };
      } };
    });
    const appointment = await interpretAppointmentRequest('Cliente Prova');
    const campaign = await generateMarketingCampaign('campagna prova');
    assert.equal(appointment.clientName, 'Cliente Prova');
    assert.equal(campaign.title, 'Campagna prova');
    assert.deepEqual(credentials, [process.env.GEMINI_APPOINTMENTS_API_KEY, process.env.GEMINI_API_KEY]);
  `], {
    cwd: process.cwd(), encoding: 'utf8',
    env: {
      PATH: process.env.PATH,
      GEMINI_API_KEY: 'unit-test-legacy-key',
      GEMINI_APPOINTMENTS_API_KEY: 'unit-test-dedicated-key'
    }
  });
  assert.equal(result.status, 0, result.stderr);
});

test('the installed SDK sends the supported appointment model and dedicated key using the existing JSON generateContent contract', () => {
  const result = spawnSync(process.execPath, ['--import', 'tsx', '--input-type=module', '-e', `
    import assert from 'node:assert/strict';
    import { mock } from 'node:test';
    import { interpretAppointmentRequest } from './server/ai-chat.ts';
    let calls = 0;
    mock.method(globalThis, 'fetch', async (url, options) => {
      calls++;
      assert.equal(String(url), 'https://generativelanguage.googleapis.com/v1beta/models/gemini-3.8-flash:generateContent');
      assert.equal(options.method, 'POST');
      assert.equal(new Headers(options.headers).get('x-goog-api-key'), process.env.GEMINI_APPOINTMENTS_API_KEY);
      const body = JSON.parse(options.body);
      assert.equal(body.generationConfig.responseMimeType, 'application/json');
      assert.equal(body.generationConfig.temperature, 0.1);
      assert.match(body.contents[0].parts[0].text, /assistente vocale per appuntamenti/);
      return new Response(JSON.stringify({
        candidates: [{ content: { role: 'model', parts: [{ text: JSON.stringify({
          clientName: 'Cliente Prova', date: '2026-10-04', startTime: '18:00', confirmation: 'unknown'
        }) }] }, finishReason: 'STOP' }]
      }), { status: 200, headers: { 'Content-Type': 'application/json' } });
    });
    const draft = await interpretAppointmentRequest('Cliente Prova domani alle diciotto');
    assert.equal(calls, 1);
    assert.equal(draft.clientName, 'Cliente Prova');
    assert.equal(draft.startTime, '18:00');
  `], {
    cwd: process.cwd(), encoding: 'utf8',
    env: { PATH: process.env.PATH, GEMINI_APPOINTMENTS_API_KEY: 'unit-test-dedicated-key' }
  });
  assert.equal(result.status, 0, result.stderr);
});

test('a missing dedicated credential does not silently charge the existing Gemini project', () => {
  const result = spawnSync(process.execPath, ['--import', 'tsx', '--input-type=module', '-e', `
    import assert from 'node:assert/strict';
    import { mock } from 'node:test';
    import { GoogleGenerativeAI } from '@google/generative-ai';
    import { interpretAppointmentRequest } from './server/ai-chat.ts';
    mock.method(GoogleGenerativeAI.prototype, 'getGenerativeModel', () => {
      throw new Error('No provider call should occur without the dedicated credential');
    });
    await assert.rejects(interpretAppointmentRequest('domani alle dieci'), /GEMINI_APPOINTMENTS_API_KEY is required/);
  `], {
    cwd: process.cwd(), encoding: 'utf8',
    env: { PATH: process.env.PATH, GEMINI_API_KEY: 'unit-test-legacy-key' }
  });
  assert.equal(result.status, 0, result.stderr);
});