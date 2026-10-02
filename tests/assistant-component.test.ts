import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import path from 'node:path';
import test from 'node:test';
import ts from 'typescript';
import { assistantRecognitionErrorKey } from '../client/src/lib/assistantVoice';
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
  assert.match(recognition, /event\.results\?\.\[0\]\?\.\[0\]\?\.transcript\?\.trim\(\)/);
  assert.match(recognition, /void submitMessage\(transcript\)/);
  assert.doesNotMatch(recognition, /silenceMs|waitForSilence|onTranscript|createAssistantRecognitionSession/);
});