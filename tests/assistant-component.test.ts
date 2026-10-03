import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import path from 'node:path';
import test from 'node:test';
import ts from 'typescript';
import { assistantFinalTranscript, assistantRecognitionErrorKey } from '../client/src/lib/assistantVoice';
import { assistantInterpretationErrorKey } from '../client/src/lib/assistantConversation';
import { ApiRequestError } from '../client/src/lib/apiError';

test('the actual appointment assistant component has no unresolved runtime names', () => {
  const root = process.cwd();
  const configPath = path.join(root, 'tsconfig.json');
  const config = ts.readConfigFile(configPath, ts.sys.readFile);
  assert.equal(config.error, undefined);
  const parsed = ts.parseJsonConfigFileContent(config.config, ts.sys, root);
  const componentPath = path.join(root, 'client/src/components/VoiceAppointmentAssistant.tsx');
  const program = ts.createProgram([componentPath], { ...parsed.options, incremental: false });
  const component = program.getSourceFile(componentPath);
  assert.ok(component, 'The component being delivered must exist');
  // Vite's build transpiles TSX without checking identifiers. A partially merged
  // component can therefore build successfully but throw on the first send.
  const unresolved = program.getSemanticDiagnostics(component)
    .filter(diagnostic => diagnostic.code === 2304 || diagnostic.code === 2552)
    .map(diagnostic => ts.flattenDiagnosticMessageText(diagnostic.messageText, '\n'));
  assert.deepEqual(unresolved, [], 'An unresolved name would freeze the assistant at runtime');
});

test('every microphone error has a real message in every supported assistant language', () => {
  const errors = ['no-speech', 'network', 'not-allowed', 'audio-capture', 'language-not-supported', 'unknown'];
  for (const language of ['it', 'en', 'de', 'fr', 'es', 'nl', 'no', 'ro', 'ru', 'hi']) {
    const translations = JSON.parse(readFileSync(path.join(
      process.cwd(), 'client/src/locales', `${language}.json`
    ), 'utf8'));
    for (const error of errors) {
      const key = assistantRecognitionErrorKey(error)!;
      const message = translations.voiceAppointmentAssistant?.[key];
      assert.ok(typeof message === 'string' && message.trim() && !message.includes('[TODO:'),
        `${language}: missing microphone error message ${key}`);
    }
  }
});

test('every provider diagnosis is translated, preserving diagnostic interpolation', () => {
  const codes = ['AI_PROVIDER_NOT_CONFIGURED', 'AI_PROVIDER_AUTH_FAILED', 'AI_PROVIDER_QUOTA_EXHAUSTED',
    'AI_PROVIDER_RATE_LIMITED', 'AI_PROVIDER_ACCESS_DENIED', 'AI_PROVIDER_MODEL_UNAVAILABLE',
    'AI_PROVIDER_REQUEST_INVALID', 'AI_PROVIDER_CONNECTION_FAILED', 'AI_PROVIDER_TIMEOUT', 'AI_ASSISTANT_INTERNAL_ERROR'];
  for (const language of ['it', 'en', 'de', 'fr', 'es', 'nl', 'no', 'ro', 'ru', 'hi']) {
    const translations = JSON.parse(readFileSync(path.join(process.cwd(), 'client/src/locales', `${language}.json`), 'utf8'));
    for (const code of codes) {
      const key = assistantInterpretationErrorKey(new ApiRequestError('Service unavailable', 503, code));
      const message = translations.voiceAppointmentAssistant?.[key];
      assert.ok(typeof message === 'string' && message.trim() && !message.includes('[TODO:'), `${language}: missing ${key}`);
      if (['interpretationProviderSetupError', 'interpretationConnectionError', 'interpretationInternalError'].includes(key)) {
        assert.ok(message.includes('{{code}}'), `${language}: missing diagnostic code interpolation`);
      }
    }
  }
});

test('browser recognition preserves the original Gemini-era settings and transcript handoff', () => {
  const source = readFileSync(path.join(process.cwd(), 'client/src/components/VoiceAppointmentAssistant.tsx'), 'utf8');
  const recognition = source.slice(source.indexOf('  const startListening ='), source.indexOf('  const stopListening ='));
  assert.match(recognition, /new SpeechRecognition\(\)/);
  assert.match(recognition, /recognition\.continuous = false/);
  assert.match(recognition, /recognition\.interimResults = false/);
  assert.match(recognition, /assistantFinalTranscript\(event\.results\)/);
  assert.match(recognition, /void submitMessage\(transcript\)/);
  const resultHandler = recognition.slice(recognition.indexOf('recognition.onresult = (event: any) =>'));
  assert.doesNotMatch(resultHandler, /submitMessage/);
  assert.doesNotMatch(recognition, /silenceMs|waitForSilence|onTranscript|createAssistantRecognitionSession/);
});

function componentRecognition() {
  const source = readFileSync(path.join(process.cwd(), 'client/src/components/VoiceAppointmentAssistant.tsx'), 'utf8');
  // Execute the component's real setup block with a fake native browser object.
  const start = source.indexOf('      const recognition = new SpeechRecognition();');
  const end = source.indexOf('      session.start();', start) + '      session.start();'.length;
  assert.ok(start >= 0 && end > start);
  const compiled = ts.transpileModule(source.slice(start, end), {
    compilerOptions: { target: ts.ScriptTarget.ES2022 }
  }).outputText;
  const calls: string[] = [];
  const ref: { current: any } = { current: null };
  let browser: any;
  class SpeechRecognition {
    onstart: any; onend: any; onresult: any; onerror: any;
    abortCount = 0;
    constructor() { browser = this; }
    start() { this.onstart?.(); }
    stop() { this.onend?.(); }
    abort() { this.abortCount++; }
  }
  new Function('SpeechRecognition', 'speechLocale', 'recognitionRef', 'setIsListening',
    'setInput', 'submitMessage', 'handleRecognitionError', 'assistantFinalTranscript', compiled)(
    SpeechRecognition, 'it-IT', ref, () => {},
    (text: string) => calls.push(`input:${text}`),
    (text: string) => {
      assert.equal(ref.current, null, 'Recognition must be released before submitMessage cancels listening');
      calls.push(`submit:${text}`);
    },
    (error: string) => calls.push(`error:${error}`), assistantFinalTranscript
  );
  return { browser, ref, calls };
}

test('actual component waits for native end and sends all final segments exactly once', () => {
  const { browser, ref, calls } = componentRecognition();
  const result = browser.onresult;
  const end = browser.onend;
  result({ results: [[{ transcript: 'crea' }]] });
  assert.deepEqual(calls, ['input:crea']);
  assert.ok(ref.current);
  assert.equal(browser.abortCount, 0);
  result({ resultIndex: 1, results: [
    [{ transcript: 'crea' }], [{ transcript: 'un appuntamento domani alle dieci' }]
  ] });
  assert.ok(!calls.some(call => call.startsWith('submit:')));
  end();
  end();
  result({ results: [[{ transcript: 'late callback' }]] });
  assert.deepEqual(calls.filter(call => call.startsWith('submit:')),
    ['submit:crea un appuntamento domani alle dieci']);
  assert.equal(browser.abortCount, 0);
});

test('actual component replaces a revised result and manual stop submits the completed text', () => {
  const { browser, ref, calls } = componentRecognition();
  browser.onresult({ results: [[{ transcript: 'crea' }]] });
  browser.onresult({ results: [[{ transcript: 'crea un appuntamento' }]] });
  ref.current.stop();
  assert.deepEqual(calls.filter(call => call.startsWith('submit:')), ['submit:crea un appuntamento']);
});

test('actual component never submits buffered speech after cancellation or recognition failure', () => {
  for (const reason of ['cancel', 'network', 'aborted']) {
    const { browser, ref, calls } = componentRecognition();
    const end = browser.onend;
    const result = browser.onresult;
    result({ results: [[{ transcript: 'crea' }]] });
    if (reason === 'cancel') ref.current.cancel();
    else browser.onerror({ error: reason });
    end();
    result({ results: [[{ transcript: 'late' }]] });
    assert.ok(!calls.some(call => call.startsWith('submit:')), reason);
  }
});

test('final transcript ignores interim results and empty alternatives', () => {
  const interim = Object.assign([{ transcript: 'unfinished' }], { isFinal: false });
  assert.equal(assistantFinalTranscript([[{ transcript: '  crea  ' }], interim, [], [{ transcript: 'domani' }]]),
    'crea domani');
  assert.equal(assistantFinalTranscript(undefined), '');
});