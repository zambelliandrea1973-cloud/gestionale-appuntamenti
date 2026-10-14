import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

test('calendar legend shares event colors and includes active secondary accounts', () => {
  const source = readFileSync('client/src/pages/Calendar.tsx', 'utf8');
  const legend = source.slice(source.indexOf('aria-label={t(\'personalAppointments.legend'), source.indexOf('{(googleNeedsReauth'));
  assert.match(source, /colorForSourceEmail\(\)/);
  assert.match(source, /filter\(account => account.enabled\)/);
  assert.match(legend, /googleLegendColors\.map/);
  assert.match(legend, /backgroundColor: GOOGLE_IMPORTED_BG_SOLID, borderColor: color/);
  assert.match(legend, /backgroundColor: PERSONAL_APPOINTMENT_BACKGROUND, borderColor: PERSONAL_APPOINTMENT_COLOR/);
  assert.doesNotMatch(legend, /border-blue-500/);
});
