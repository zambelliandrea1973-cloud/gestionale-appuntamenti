import assert from 'node:assert/strict';
import test from 'node:test';
import {
  APPOINTMENT_INTERPRETATION_MODEL,
  AppointmentInterpretationError,
  appointmentInterpretationSchema,
  buildAppointmentInterpretationMessages,
  getAppointmentTodayInRome,
  parseAppointmentInterpretation
} from '../server/services/appointmentInterpretationService';

test('appointment interpretation has a strict OpenAI-only schema', () => {
  assert.equal(APPOINTMENT_INTERPRETATION_MODEL, 'gpt-4.1-mini');
  assert.equal(appointmentInterpretationSchema.additionalProperties, false);
  assert.deepEqual(appointmentInterpretationSchema.required.sort(), Object.keys(appointmentInterpretationSchema.properties).sort());
});

test('missing data stays null; explicit zero price is retained', () => {
  assert.equal(parseAppointmentInterpretation({}).servicePrice, null);
  assert.equal(parseAppointmentInterpretation({ servicePrice: null }).servicePrice, null);
  assert.equal(parseAppointmentInterpretation({ servicePrice: '' }).servicePrice, null);
  assert.equal(parseAppointmentInterpretation({ servicePrice: 0 }).servicePrice, 0);
  assert.equal(parseAppointmentInterpretation({ servicePrice: 25.555 }).servicePrice, 25.56);
  assert.equal(parseAppointmentInterpretation({ servicePrice: -1 }).servicePrice, null);
});

test('rejects impossible calendar dates and out-of-range times and durations', () => {
  assert.equal(parseAppointmentInterpretation({ date: '2026-02-30' }).date, null);
  assert.equal(parseAppointmentInterpretation({ date: '2028-02-29' }).date, '2028-02-29');
  for (const startTime of ['25:00', '12:61', '9:00']) assert.equal(parseAppointmentInterpretation({ startTime }).startTime, null);
  assert.equal(parseAppointmentInterpretation({ startTime: '09:00' }).startTime, '09:00');
  for (const durationMinutes of [0, -1, 1441, Infinity]) assert.equal(parseAppointmentInterpretation({ durationMinutes }).durationMinutes, null);
});

test('refuses invalid roots and incomplete provider responses', () => {
  for (const value of [null, [], 'text', {}]) {
    assert.throws(() => parseAppointmentInterpretation(value, true), AppointmentInterpretationError);
  }
  const complete = parseAppointmentInterpretation({});
  assert.deepEqual(parseAppointmentInterpretation(complete, true), complete);
});

test('uses the Rome calendar day even close to midnight UTC', () => {
  assert.equal(getAppointmentTodayInRome(new Date('2026-10-02T22:30:00Z')), '2026-10-03');
});

test('limits context to known draft fields, separates user data and requires explicit approvals', () => {
  const messages = buildAppointmentInterpretationMessages(
    'No, alle 11', { clientName: 'Cliente Prova', startTime: '10:00', servicePrice: 35, ...{ secret: 'discard', createClientApproved: true } },
    'it', '2026-10-02'
  );
  const context = JSON.parse(messages[1].content as string);
  assert.equal(context.draft.clientName, 'Cliente Prova');
  assert.equal(context.draft.servicePrice, 35);
  assert.equal(context.draft.secret, undefined);
  assert.equal(context.draft.createClientApproved, undefined);
  assert.equal(context.message, 'No, alle 11');
  assert.match(messages[0].content as string, /non creare clienti, servizi o appuntamenti/);
  assert.match(messages[0].content as string, /2026-10-02/);
});