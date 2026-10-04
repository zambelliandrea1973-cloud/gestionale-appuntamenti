import assert from 'node:assert/strict';
import test from 'node:test';
import { readFileSync } from 'node:fs';
import { getAssistantGreetingName } from '../client/src/lib/appointmentAssistant';
import {
  personalAppointmentSchema, personalAppointmentForCalendar,
  PERSONAL_APPOINTMENT_BACKGROUND, PERSONAL_APPOINTMENT_COLOR,
} from '../shared/personalAppointments';

const input = { title: 'Ritiro pacco', date: '2026-10-05', startTime: '10:15', endTime: '10:45' };

test('personal assistant opens with the work greeting followed by Dimmi pure', () => {
  const source = readFileSync('client/src/components/PersonalVoiceAppointmentAssistant.tsx', 'utf8');
  const start = source.indexOf('      const greetingName =');
  const end = source.indexOf('\n    }', start);
  assert.ok(start >= 0 && end > start);
  const openGreeting = new Function(
    'professionalEmail', 't', 'getAssistantGreetingName', 'setDraft', 'setInput', 'setMessages',
    source.slice(start, end),
  );
  const locale = JSON.parse(readFileSync('client/src/locales/it.json', 'utf8'));
  const t = (key: string, values?: { name: string } | string) => {
    const [section, item] = key.split('.');
    return locale[section][item].replace('{{name}}', typeof values === 'object' ? values.name : '');
  };
  for (const [email, expected] of [
    ['andrea@example.com', 'Ciao andrea. Dimmi pure.'],
    [undefined, 'Ciao. Dimmi pure.'],
  ]) {
    let messages: unknown;
    openGreeting(email, t, getAssistantGreetingName, () => {}, () => {}, (value: unknown) => { messages = value; });
    assert.deepEqual(messages, [{ role: 'assistant', content: expected }]);
  }
  const wrapper = readFileSync('client/src/components/VoiceAppointmentAssistant.tsx', 'utf8');
  assert.match(wrapper, /<PersonalVoiceAppointmentAssistant professionalEmail=\{props\.professionalEmail\}/);
});
test('personal entries require no client, service or Google account', () => {
  const result = personalAppointmentSchema.parse({ ...input, userId: 999, clientId: 34, serviceId: 51 });
  assert.equal(result.title, input.title);
  assert.equal('userId' in result, false);
  assert.equal('clientId' in result, false);
  assert.equal('serviceId' in result, false);
  assert.equal(result.location, '');
});
test('personal entries validate title and real calendar dates', () => {
  for (const date of ['2026-02-29', '2026-04-31', 'not a date']) assert.equal(personalAppointmentSchema.safeParse({ ...input, date }).success, false);
  assert.equal(personalAppointmentSchema.safeParse({ ...input, date: '2028-02-29' }).success, true);
  assert.equal(personalAppointmentSchema.safeParse({ ...input, title: '   ' }).success, false);
});
test('personal entries reject invalid, equal or backwards time ranges', () => {
  for (const endTime of ['09:00', '10:15', '24:00', '13:60']) assert.equal(personalAppointmentSchema.safeParse({ ...input, endTime }).success, false);
  assert.equal(personalAppointmentSchema.safeParse({ ...input, startTime: '9:15' }).success, false);
});
test('free titles, locations and notes are trimmed and bounded', () => {
  const result = personalAppointmentSchema.parse({ ...input, title: '  Dentista  ', location: ' Via Roma ', notes: ' Non un cliente ' });
  assert.equal(result.title, 'Dentista');
  assert.equal(result.location, 'Via Roma');
  assert.equal(personalAppointmentSchema.safeParse({ ...input, title: 'x'.repeat(201) }).success, false);
  assert.equal(personalAppointmentSchema.safeParse({ ...input, notes: 'x'.repeat(5001) }).success, false);
});
test('calendar personal IDs cannot collide with positive work appointment IDs', () => {
  const result = personalAppointmentForCalendar({ ...personalAppointmentSchema.parse(input), id: 21, userId: 3 });
  assert.equal(result.id, -21);
  assert.equal(result.personalAppointmentId, 21);
  assert.equal(result.isPersonalAppointment, true);
  assert.equal(result.importedFromGoogle, false);
  assert.equal(result.clientId, null);
  assert.equal(result.serviceId, null);
  assert.equal(result.service.duration, 30);
  assert.equal(result.service.price, 0);
  assert.equal(result.service.color, PERSONAL_APPOINTMENT_COLOR);
  assert.notEqual(PERSONAL_APPOINTMENT_BACKGROUND, '#f1f5f9');
});
test('personal persistence routes scope reads, updates and deletes to the signed-in owner', () => {
  const source = readFileSync('server/routes/personalAppointmentRoutes.ts', 'utf8');
  assert.equal((source.match(/eq\(personalAppointments\.userId, owner\(req\)\)/g) || []).length, 4);
  assert.match(source, /userId: owner\(req\)/);
  assert.match(source, /requireAuth/);
  assert.doesNotMatch(source, /googleapis|googleCalendar|sendMail|sendEmail|createClient|createService/);
});
test('one completed day-slot tap opens the form after pre-filling the time', () => {
  const source = readFileSync('client/src/components/DayViewWithTimeSlots.tsx', 'utf8');
  const handler = source.slice(source.indexOf('const handleSlotClick'), source.indexOf('// Gestisce la chiusura'));
  assert.match(handler, /touchMovedRef\.current/);
  assert.ok(handler.indexOf('setSelectedTime(slotTime)') < handler.indexOf('setIsAppointmentModalOpen(true)'));
  assert.doesNotMatch(handler, /secondTap/);
});
test('all supported languages include every personal-appointment label', () => {
  const languages = ['it','en','de','fr','es','nl','no','ro','ru','hi'];
  const keys = Object.keys(JSON.parse(readFileSync('client/src/locales/en.json', 'utf8')).personalAppointments).sort();
  for (const language of languages) {
    const values = JSON.parse(readFileSync(`client/src/locales/${language}.json`, 'utf8')).personalAppointments;
    assert.deepEqual(Object.keys(values).sort(), keys);
    assert.ok(Object.values(values).every(value => typeof value === 'string' && value.length > 0 && !value.includes('[TODO')));
  }
});