import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync, readdirSync } from 'node:fs';
import React from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import i18n from '../client/src/lib/i18n';
import { appointmentOperationText as message, type AppointmentOperationMessage } from '../client/src/lib/appointmentOperationMessages';
import { createAppointmentOperations, appointmentSnapshot, type ExistingAppointment, type OperationState } from '../client/src/lib/appointmentOperations';
import Card from '../client/src/components/ExistingAppointmentOperationCard';

const record: ExistingAppointment = { id: 7, title: 'Synthetic appointment', date: '2026-10-28', startTime: '15:00', endTime: '16:00' };
function fixture(language = 'en', records = [record]) {
  let state: OperationState | null = null;
  let enabled = true;
  let fresh = record;
  let scope = 'personal:synthetic';
  const messages: string[] = [];
  const writes: unknown[] = [];
  const engine = createAppointmentOperations({
    language: () => language, scope: () => scope, enabled: () => enabled,
    load: async () => records, read: async () => fresh,
    write: async (...args) => { writes.push(args); },
    say: async text => { messages.push(text); }, state: value => { state = value; },
    changed: async () => {},
  });
  return { engine, messages, writes, state: () => state,
    language: (value: string) => { language = value; },
    lock: () => { enabled = false; }, fresh: (value: ExistingAppointment) => { fresh = value; },
    scope: () => { scope = 'personal:other-synthetic'; } };
}

test('all supported languages have every new key and identical interpolation variables, without placeholders', () => {
  const resources = readdirSync('client/src/locales').filter(file => file.endsWith('.json')).map(file => ({
    language: file.slice(0, -5),
    messages: JSON.parse(readFileSync(`client/src/locales/${file}`, 'utf8')).existingAppointmentOperations,
  }));
  const base = resources.find(resource => resource.language === 'it')!.messages;
  assert.equal(resources.length, 10);
  const variables = (value: string) => [...value.matchAll(/{{(\w+)}}/g)].map(match => match[1]).sort();
  for (const resource of resources) {
    assert.deepEqual(Object.keys(resource.messages).sort(), Object.keys(base).sort(), resource.language);
    for (const [key, text] of Object.entries(resource.messages)) {
      assert.equal(typeof text, 'string');
      assert.ok((text as string).trim());
      assert.doesNotMatch(text as string, /TODO|existingAppointmentOperations\./);
      assert.deepEqual(variables(text as string), variables(base[key]), `${resource.language}.${key}`);
      const translated = message(resource.language, key as AppointmentOperationMessage, {
        appointment: record.title!, date: record.date, start: record.startTime, end: record.endTime, count: 2,
      });
      assert.doesNotMatch(translated, /{{|existingAppointmentOperations\./);
    }
  }
});

for (const language of ['it', 'en']) {
  test(`${language}: delete/move require confirmation and emit translated results`, async () => {
    const deletion = fixture(language);
    await deletion.engine.handle('delete', { action: 'delete', searchTitle: record.title });
    assert.equal(deletion.state()?.phase, 'confirm');
    assert.equal(deletion.writes.length, 0);
    assert.equal(deletion.messages[0], message(language, 'askDelete', {
      appointment: `${record.title} · ${record.date} · 15:00–16:00`,
    }));
    await deletion.engine.handle(language === 'it' ? 'sì, confermo' : 'yes, confirm');
    assert.equal(deletion.writes.length, 1);
    assert.equal(deletion.messages.at(-1), message(language, 'deleted'));
    const move = fixture(language);
    await move.engine.handle('move', { action: 'move', searchTitle: record.title });
    assert.match(move.messages[0], new RegExp(record.title!));
    assert.equal(move.state()?.phase, 'details');
    await move.engine.handle('new time', { startTime: '23:30', durationMinutes: 90 });
    assert.equal(move.messages.at(-1), message(language, 'invalidDestination'));
    assert.equal(move.writes.length, 0);
    await move.engine.handle('new date', { date: '2026-10-29', startTime: '17:00', durationMinutes: 60 });
    assert.equal(move.state()?.phase, 'confirm');
    assert.equal(move.writes.length, 0);
    await move.engine.confirm();
    assert.equal(move.writes.length, 1);
    assert.equal(move.messages.at(-1), message(language, 'moved'));
  });

  test(`${language}: search, selection, cancellation and guarded errors are translated`, async () => {
    const f = fixture(language, [record, { ...record, id: 8 }]);
    await f.engine.handle('delete', { searchTitle: record.title });
    assert.equal(f.messages[0], message(language, 'multipleFound', { count: 2 }));
    await f.engine.handle(language === 'it' ? 'sì' : 'yes');
    assert.equal(f.messages.at(-1), message(language, 'selectFirst'));
    await f.engine.handle(language === 'it' ? 'no' : 'no');
    assert.equal(f.messages.at(-1), message(language, 'cancelled'));
    assert.equal(f.writes.length, 0);
    await f.engine.handle('delete', { searchTitle: 'No synthetic match' });
    assert.equal(f.messages.at(-1), message(language, 'notFound'));
    f.engine.reset(); f.lock();
    await assert.rejects(f.engine.handle('delete'), { message: message(language, 'unlockProfile') });
    const mismatch = fixture(language);
    await mismatch.engine.handle('delete', { searchTitle: record.title });
    mismatch.fresh({ ...record, id: 999 });
    await assert.rejects(mismatch.engine.confirm(), { message: message(language, 'selectionMismatch') });
    assert.equal(mismatch.writes.length, 0);
    const changed = fixture(language);
    await changed.engine.handle('delete', { searchTitle: record.title });
    changed.fresh({ ...record, startTime: '15:30' });
    await changed.engine.confirm();
    assert.equal(changed.messages.at(-2), message(language, 'recordChanged'));
    assert.equal(changed.writes.length, 0);
    changed.scope();
    await changed.engine.confirm();
    assert.equal(changed.writes.length, 0);
  });

  test(`${language}: card renders translated headings, accessible labels, states and buttons`, () => {
    for (const action of ['delete', 'move'] as const) {
      for (const phase of ['search', 'choose', 'details', 'confirm'] as const) {
        const state: OperationState = { action, phase, scope: 'synthetic', candidates: [record, { ...record, id: 8 }],
          selected: phase === 'details' || phase === 'confirm' ? record : undefined,
          changes: action === 'move' ? { date: '2026-10-29' } : {} };
        const markup = renderToStaticMarkup(<Card language={language}
          assistant={{ state, busy: false, choose: () => {}, confirm: () => {}, cancel: () => {} }} />);
        for (const key of [action === 'delete' ? 'deleteLabel' : 'moveLabel',
          action === 'delete' ? 'deleteTitle' : 'moveTitle', 'cancelOperation'] as const) {
          assert.ok(markup.includes(message(language, key)), key);
        }
        const key = phase === 'search' ? 'searching' : phase === 'choose' ? 'selectAppointment' :
          phase === 'details' ? 'enterDestination' : action === 'delete' ? 'confirmDelete' : 'confirmMove';
        assert.ok(markup.includes(message(language, key)), key);
        assert.doesNotMatch(markup, /existingAppointmentOperations\.|{{/);
      }
    }
  });
}

test('language switches use the current assistant language without changing internal snapshots', async () => {
  const f = fixture('it');
  const untitled = { ...record, title: undefined };
  const snapshot = appointmentSnapshot(untitled);
  await f.engine.handle('delete', { searchTitle: record.title });
  f.language('en-GB');
  await f.engine.handle('no');
  assert.equal(f.messages.at(-1), message('en', 'cancelled'));
  await i18n.changeLanguage('en');
  assert.equal(appointmentSnapshot(untitled), snapshot);
  assert.equal(f.writes.length, 0);
});

test('both parent dialog headings use localized delete/move titles, including outside Italian', () => {
  for (const name of ['VoiceAppointmentAssistant', 'PersonalVoiceAppointmentAssistant']) {
    const source = readFileSync(`client/src/components/${name}.tsx`, 'utf8');
    // Evaluate the actual heading expression without mounting authenticated parents or making requests.
    const expression = source.match(/<DialogTitle\b[^>]*>[\s\S]*?\{(existing\.state[\s\S]*?)\}[\s\S]*?<\/DialogTitle>/)?.[1];
    assert.ok(expression, `${name}: existing-operation heading expression`);
    assert.doesNotMatch(expression, /Elimina appuntamento|Sposta appuntamento/);
    const heading = new Function('existing', 't', `return (${expression});`);
    for (const language of ['it', 'en', 'fr']) {
      for (const action of ['delete', 'move']) {
        const title = heading({ state: { action } }, i18n.getFixedT(language));
        assert.equal(title, message(language, action === 'delete' ? 'deleteTitle' : 'moveTitle'), `${name}/${language}/${action}`);
      }
      const inactiveKey = name === 'VoiceAppointmentAssistant' ? 'voiceAppointmentAssistant.title' : 'personalAppointments.new';
      assert.equal(heading({ state: null }, i18n.getFixedT(language)), i18n.getFixedT(language)(inactiveKey));
    }
  }
});
