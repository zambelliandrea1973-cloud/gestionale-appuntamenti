import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { createHash } from 'node:crypto';
import { spawnSync } from 'node:child_process';
import path from 'node:path';
import test from 'node:test';
import ts from 'typescript';

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

test('the restored component is the exact historical source, not a reconstruction', () => {
  const source = readFileSync('client/src/components/VoiceAppointmentAssistant.tsx');
  // Pin the recovered pre-migration source so a later change must be deliberate.
  assert.equal(createHash('sha256').update(source).digest('hex'), '7509485de4a75eea43f80eeed3c7497f221f7fac117017326c0d846ad18ac6e5');
});

test('native recognition preserves original settings and hands the result directly to the original submit flow', () => {
  const source = readFileSync('client/src/components/VoiceAppointmentAssistant.tsx', 'utf8');
  const recognition = source.slice(source.indexOf('  const startListening ='), source.indexOf('  const stopListening ='));
  assert.match(recognition, /recognition\.continuous = false/);
  assert.match(recognition, /recognition\.interimResults = false/);
  assert.match(recognition, /void submitMessage\(transcript\)/);
  assert.doesNotMatch(source, /createAssistantRecognitionSession|assistantFinalTranscript|createAssistantTurnController|conversationIdRef|AITrialNotice/);
  const submit = source.slice(source.indexOf('  const submitMessage ='), source.indexOf('  const startListening ='));
  assert.doesNotMatch(submit, /cancelListening|recognition\.abort/);
  const start = source.indexOf('    const recognition = new SpeechRecognition();');
  const end = source.indexOf('    recognition.start();', start) + '    recognition.start();'.length;
  assert.ok(start > 0 && end > start);
  const compiled = ts.transpileModule(source.slice(start, end), {
    compilerOptions: { target: ts.ScriptTarget.ES2022 }
  }).outputText;
  const submitted: string[] = [];
  const ref: { current: any } = { current: null };
  class SpeechRecognition {
    onstart: any; onend: any; onresult: any; onerror: any;
    start() { this.onstart?.(); }
  }
  new Function('SpeechRecognition', 'speechLocale', 'recognitionRef', 'setIsListening',
    'setInput', 'submitMessage', 'draft', 'services', 'setServicePickerOptions',
    'setServicePickerOpen', 'setPendingQuestion', 'addAssistantMessage', 't', compiled)(
    SpeechRecognition, 'it-IT', ref, () => {}, () => {},
    (text: string) => submitted.push(text), {}, [], () => {}, () => {}, () => {}, () => {}, (key: string) => key
  );
  ref.current.onresult({ results: [[{ transcript: '  crea un appuntamento domani alle dieci  ' }]] });
  assert.deepEqual(submitted, ['crea un appuntamento domani alle dieci']);
});

test('interpretation and speech no longer require the new trial conversation token', () => {
  const interpretation = readFileSync('server/routes/aiAppointmentAssistantRoutes.ts', 'utf8');
  const speech = readFileSync('server/routes/assistantSpeechRoutes.ts', 'utf8');
  assert.match(interpretation, /router\.use\(trialRoutes\)/, 'Keep shared access endpoints for marketing and the rest of the app');
  for (const route of [interpretation, speech]) {
    assert.match(route, /requireAuth/);
    assert.doesNotMatch(route, /authorizeAppointmentAI|conversationId|sendAITrialError/);
  }
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