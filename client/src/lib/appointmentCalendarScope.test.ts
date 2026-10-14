import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import test from 'node:test';
import { canContinuePersonalHandoff, classifyCalendarScope, personalHandoff } from './appointmentCalendarScope';
import { scopedLiveAppointmentSetup, scopedLiveInterpretationSchema } from './appointmentCalendarScopeProtocol';
import { liveAppointmentSetup, liveInterpretationSchema } from '../../../shared/liveAppointmentProtocol';
import './personalOperatorHandoff.test';
import './personalSpaceIdle.test';

test('bank tomorrow and personal memos do not require client or service', () => {
  const request = 'crea un appuntamento per domani per andare in banca';
  assert.equal(classifyCalendarScope(request), 'personal');
  assert.equal(classifyCalendarScope(request, { clientName: 'Banca', serviceName: 'Appuntamento' }, true), 'personal');
  const handoff = personalHandoff(request, {}, new Date('2026-10-18T10:00:00Z'));
  assert.deepEqual(handoff, { request, fields: { title: 'Andare in banca', date: '2026-10-19' } });
  assert.equal(personalHandoff(request, { serviceName: 'appuntamento' }).fields.title, 'Andare in banca');
  assert.equal(classifyCalendarScope('memo per ritirare un pacco domani'), 'personal');
  assert.equal(classifyCalendarScope('ricordami di chiamare mia sorella'), 'personal');
});

test('explicit client work wins, uncertain requests require destination confirmation', () => {
  assert.equal(classifyCalendarScope('prenota un trattamento per la cliente Anna domani alle 10'), 'work');
  assert.equal(classifyCalendarScope('appuntamento in banca con il cliente Sergio'), 'work');
  assert.equal(classifyCalendarScope('segna un appuntamento domani'), 'uncertain');
  assert.equal(classifyCalendarScope('incontro con Andrea', { calendarScope: 'uncertain' }), 'uncertain');
  assert.equal(classifyCalendarScope('fissa una visita', { calendarScope: 'personal', clientName: 'Anna' }), 'uncertain');
  assert.equal(classifyCalendarScope('domani alle 10', {}, true), 'work');
});

test('handoff preserves only original personal fields, no work client draft or approval', () => {
  const request = 'memo domani alle 9';
  const result = personalHandoff(request, { title: 'Ritiro documenti', date: '2026-10-23', startTime: '10:15', clientName: 'Anna', serviceName: 'Massaggio', servicePrice: 85, durationMinutes: 25 });
  assert.deepEqual(result, { request, fields: { title: 'Ritiro documenti', date: '2026-10-23', startTime: '10:15', durationMinutes: 25 } });
});

test('continuation is guarded by selected unlocked profile and cancellation invalidates callbacks', () => {
  assert.equal(canContinuePersonalHandoff(false, 4, 4), false);
  assert.equal(canContinuePersonalHandoff(true, undefined, undefined), false);
  assert.equal(canContinuePersonalHandoff(true, 5, 4), false);
  assert.equal(canContinuePersonalHandoff(true, 4, 4), true);
  const work = readFileSync('client/src/components/VoiceAppointmentAssistant.tsx', 'utf8');
  assert.match(work, /onCancel: \(\) => \{ if \(token === accessGeneration\.current\) cancel\(\); \}/);
  assert.match(work, /onComplete: \(\) => \{ if \(token === accessGeneration\.current\) \{ setUnlockPending\(false\); setWaitingAccess\(true\); \} \}/);
  assert.ok(work.indexOf('routePersonalRequest(userMessage, liveFieldsRef') < work.indexOf('await existing.handle(userMessage'));
  assert.ok(work.indexOf('routePersonalRequest(userMessage, interpretation)') < work.indexOf('await existing.handle(userMessage, interpretation)'));
  const route = work.slice(work.indexOf('const routePersonalRequest ='));
  assert.ok(route.indexOf('.respond(') < route.indexOf('handleOpenChange(false)'));
  const personal = readFileSync('client/src/components/PersonalVoiceAppointmentAssistant.tsx', 'utf8');
  const seed = personal.slice(personal.indexOf('const consumedHandoff'), personal.indexOf('function clearSpeechTimers'));
  assert.match(seed, /setDraft\(\{ \.\.\.initialRequest.fields/);
  assert.doesNotMatch(seed, /beginLive\(|save\.mutate|existing\.handle|askClientName|askService/);
  assert.doesNotMatch(seed, /askDate|askTime|role: 'assistant'/);
  assert.match(personal, /detectAssistantConfirmation\(text, locale\) === 'yes'/);
});

test('optional semantic protocol remains backwards compatible and conservative', () => {
  assert.equal(scopedLiveInterpretationSchema, liveInterpretationSchema);
  assert.equal(scopedLiveAppointmentSetup, liveAppointmentSetup);
  assert.equal(scopedLiveInterpretationSchema.safeParse({ date: '2026-10-19' }).success, true);
  assert.equal(scopedLiveInterpretationSchema.safeParse({ calendarScope: 'personal' }).success, true);
  assert.equal(scopedLiveInterpretationSchema.safeParse({ calendarScope: 'guess' }).success, false);
  const setup = scopedLiveAppointmentSetup('work', 'it');
  assert.match(setup.setup.systemInstruction.parts[0].text, /andare in banca/);
  assert.match(setup.setup.systemInstruction.parts[0].text, /segnali contrastanti usa uncertain/);
  assert.ok('calendarScope' in setup.setup.tools[0].functionDeclarations[0].parameters.properties);
  assert.match(JSON.stringify(setup.setup.tools[0].functionDeclarations[0].parameters.properties.title), /modalità work.*personal o uncertain/);
});

test('actual handoff seed/interpret lifecycle emits exactly one missing-field question and never saves', async () => {
  const ts = await import('typescript');
  const { completePersonalAppointmentDraft, personalAppointmentSchema } = await import('../../../shared/personalAppointments');
  const { detectAssistantConfirmation } = await import('./appointmentAssistant');
  const source = readFileSync('client/src/components/PersonalVoiceAppointmentAssistant.tsx', 'utf8');
  const ast = ts.createSourceFile('personal.tsx', source, ts.ScriptTarget.Latest, true, ts.ScriptKind.TSX);
  let handler = '';
  let seedEffect = '';
  let interpretEffect = '';
  const visit = (node: import('typescript').Node) => {
    if (ts.isFunctionDeclaration(node) && node.name?.text === 'submit') handler = node.getText(ast);
    if (ts.isCallExpression(node) && node.expression.getText(ast) === 'useEffect' && node.arguments[0]) {
      const effect = node.arguments[0].getText(ast);
      if (effect.includes('consumedHandoff.current = initialRequest')) seedEffect = effect;
      if (effect.includes('void submit(initialRequest.request, true)')) interpretEffect = effect;
    }
    ts.forEachChild(node, visit);
  };
  visit(ast);
  assert.match(source, /void submit\(initialRequest.request, true\)/);
  for (const fields of [
    { title: 'Andare in banca', date: '2026-10-19' },
    { title: 'Chiamare mia sorella' },
    { title: 'Andare in banca', startTime: '09:00' },
    { title: 'Andare in banca', date: '2026-10-19', startTime: '09:00' },
  ]) {
    const replies: string[] = [];
    let messages: { role: string; content: string }[] = [];
    let writes = 0;
    let operationRequest = '';
    let submitCalls = 0;
    const env = {
      open: true, blocked: false, inFlight: { current: false },
      profileId: 3, profileIdRef: { current: 3 },
      existing: { busy: false, state: null, handle: async (text: string) => { operationRequest = text; return false; } },
      liveSession: { current: null }, liveFields: { current: null },
      pendingAutoListen: { current: false }, cancelRecognition() {}, stopAudio() {},
      generation: { current: 1 }, setInput() {}, setError() {}, setProcessing() {},
      setMessages: (value: any) => { messages = typeof value === 'function' ? value(messages) : value; }, setDraft() {},
      conversation: { current: { ensure: async () => null, getId: () => 'test-handoff' } }, setConversationActive() {},
      apiRequest: async (_method: string, endpoint: string, body: any) => {
        assert.equal(endpoint, '/api/ai-appointment-assistant/interpret');
        assert.equal(body.appointmentKind, 'personal');
        assert.equal(body.message, request);
        assert.deepEqual(body.draft, fields);
        return { json: async () => ({ ...fields }) };
      },
      queryClient: { invalidateQueries() {} }, AI_TRIAL_ACCESS_KEY: ['synthetic'],
      draft: { ...fields }, ready: personalAppointmentSchema.safeParse(completePersonalAppointmentDraft(fields)),
      locale: 'it', completePersonalAppointmentDraft, personalAppointmentSchema, detectAssistantConfirmation,
      say: async (text: string) => { replies.push(text); messages.push({ role: 'assistant', content: text }); }, t: (key: string) => key,
      aiTrialMessageKey: () => null, setTrialBlocked() {}, listenRef: { current() {} },
      save: { isPending: false, mutateAsync: async () => { writes++; } },
    };
    const code = ts.transpileModule(handler, { compilerOptions: { target: ts.ScriptTarget.ES2022 } }).outputText;
    const submit = new Function('env', `const {${Object.keys(env).join(',')}}=env;${code};return submit;`)(env);
    const request = 'date' in fields && 'startTime' in fields ? 'sì'
      : fields.title === 'Chiamare mia sorella' ? 'memo: ricordami di chiamare mia sorella'
      : 'crea un appuntamento per domani per andare in banca';
    const initialRequest = { request, fields };
    let pending: Promise<void> | undefined;
    const lifecycleEnv = {
      ...env, initialRequest, consumedHandoff: { current: undefined },
      interpretedHandoff: { current: undefined }, space: { unlocked: true },
      openRef: { current: false }, setOpen() {},
      submit: (text: string, initial: boolean) => { submitCalls++; pending = submit(text, initial); },
    };
    const effect = (callback: string) => {
      assert.ok(callback, 'Actual lifecycle callback must be extracted');
      const compiled = ts.transpileModule(`const effect = ${callback};`, { compilerOptions: { target: ts.ScriptTarget.ES2022 } }).outputText;
      return new Function('env', `const {${Object.keys(lifecycleEnv).join(',')}}=env;${compiled};return effect;`)(lifecycleEnv);
    };
    const seed = effect(seedEffect);
    seed(); seed();
    const interpret = effect(interpretEffect);
    interpret(); interpret();
    await pending;
    assert.equal(submitCalls, 1, 'Repeated lifecycle effects must not repeat the turn');
    assert.equal(operationRequest, request);
    assert.equal(writes, 0, 'Destination confirmation must not become appointment save approval');
    const expected = !('date' in fields) ? 'voiceAppointmentAssistant.askDate'
      : !('startTime' in fields) ? 'voiceAppointmentAssistant.askTime' : 'personalAppointments.askConfirm';
    assert.deepEqual(replies, [expected]);
    assert.deepEqual(messages.filter(message => message.role === 'assistant').map(message => message.content), [expected],
      'Count seed messages AND interpreted replies: exactly one follow-up');
    assert.equal(messages.filter(message => message.role === 'user' && message.content === request).length, 1);
    assert.doesNotMatch(replies.join(' '), /askClient|askService/);
  }
});
