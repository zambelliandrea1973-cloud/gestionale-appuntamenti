import test from 'node:test';
import assert from 'node:assert/strict';
import {
  HELP_CALL_REMINDER_DELAY_MS,
  isItalianHelpCallReminderDue,
} from '../server/services/italianHelpCallReminderService';

test('the reminder becomes due after three days without authenticated program activity', () => {
  const now = new Date('2026-11-20T12:00:00.000Z');
  const eligibleAt = new Date(now.getTime() - HELP_CALL_REMINDER_DELAY_MS);

  assert.equal(isItalianHelpCallReminderDue({
    language: 'it-IT',
    emailNotificationsEnabled: true,
    eligibleAt,
    lastActivityAt: null,
    sentAt: null,
  }, now), true);
});

test('recent activity, prior delivery, disabled email, and non-Italian language suppress the reminder', () => {
  const now = new Date('2026-11-20T12:00:00.000Z');
  const eligibleAt = new Date(now.getTime() - HELP_CALL_REMINDER_DELAY_MS - 1000);
  const base = {
    language: 'it',
    emailNotificationsEnabled: true,
    eligibleAt,
    lastActivityAt: null,
    sentAt: null,
  };

  assert.equal(isItalianHelpCallReminderDue({
    ...base,
    lastActivityAt: new Date(now.getTime() - 2 * 24 * 60 * 60 * 1000),
  }, now), false);
  assert.equal(isItalianHelpCallReminderDue({
    ...base,
    sentAt: new Date(now.getTime() - 1),
  }, now), false);
  assert.equal(isItalianHelpCallReminderDue({
    ...base,
    emailNotificationsEnabled: false,
  }, now), false);
  assert.equal(isItalianHelpCallReminderDue({
    ...base,
    language: 'en',
  }, now), false);
});
