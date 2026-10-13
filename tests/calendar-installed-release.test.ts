import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync, mkdirSync, writeFileSync, mkdtempSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { execFileSync } from 'node:child_process';
import { CALENDAR_RELEASE } from '../shared/calendarRelease';

test('production frontend copy replaces the served shell even when the destination already exists', () => {
  const dockerfile = readFileSync('Dockerfile', 'utf8');
  const command = dockerfile.match(/RUN mkdir -p server\/public[\s\S]*?cmp dist\/public\/index.html server\/public\/index.html/)?.[0];
  assert.ok(command);
  for (const existing of [false, true]) {
    const directory = mkdtempSync(path.join(tmpdir(), 'calendar-static-'));
    try {
      mkdirSync(path.join(directory, 'dist/public/assets'), { recursive: true });
      writeFileSync(path.join(directory, 'dist/public/index.html'), `<script src="/assets/${CALENDAR_RELEASE}.js"></script>`);
      writeFileSync(path.join(directory, `dist/public/assets/${CALENDAR_RELEASE}.js`), 'current frontend');
      if (existing) {
        mkdirSync(path.join(directory, 'server/public'), { recursive: true });
        writeFileSync(path.join(directory, 'server/public/index.html'), 'old frontend');
      }
      execFileSync('sh', ['-c', command.replace(/^RUN /, '').replace(/\\\r?\n/g, '')], { cwd: directory });
      assert.equal(readFileSync(path.join(directory, 'server/public/index.html'), 'utf8'),
        readFileSync(path.join(directory, 'dist/public/index.html'), 'utf8'));
      assert.equal(readFileSync(path.join(directory, `server/public/assets/${CALENDAR_RELEASE}.js`), 'utf8'), 'current frontend');
    } finally { rmSync(directory, { recursive: true, force: true }); }
  }
});
test('installed frontend and server expose the same public release without private information', () => {
  const server = readFileSync('server/index.ts', 'utf8');
  const calendar = readFileSync('client/src/pages/Calendar.tsx', 'utf8');
  assert.match(server, /app\.get\('\/api\/calendar-release'/);
  assert.match(server, /set\('Cache-Control', 'no-store'\)\.json\(\{ release: CALENDAR_RELEASE \}\)/);
  assert.match(calendar, /CALENDAR_RELEASE/);
});

test('new installed build purges frontend caches only once and keeps private and account storage', async () => {
  const main = readFileSync('client/src/main.tsx', 'utf8');
  assert.match(main, /const SW_VERSION = `calendar-\$\{CALENDAR_RELEASE\}`/);
  const refreshSource = main.match(/async function forceServiceWorkerRefresh\(\) \{[\s\S]*?\n\}/)?.[0];
  assert.ok(refreshSource);
  const values = new Map([['last-sw-version', 'v12-onboarding-fix'], ['private-consent', 'keep'], ['calendar-mode', 'personal']]);
  const removed: string[] = [];
  let reloads = 0, unregistered = 0;
  const refresh = new Function('localStorage', 'navigator', 'window', 'caches', 'console', 'SW_VERSION', 'LAST_SW_VERSION_KEY',
    `${refreshSource}; return forceServiceWorkerRefresh;`)(
    { getItem: (key: string) => values.get(key), setItem: (key: string, value: string) => values.set(key, value) },
    { serviceWorker: { getRegistrations: async () => [{ unregister: async () => { unregistered++; } }] } },
    { caches: {}, location: { reload: () => { reloads++; } } },
    { keys: async () => ['old-frontend'], delete: async (key: string) => { removed.push(key); } },
    { log() {}, error(error: unknown) { throw error; } }, `calendar-${CALENDAR_RELEASE}`, 'last-sw-version',
  );
  await refresh();
  await refresh();
  assert.equal(reloads, 1);
  assert.equal(unregistered, 1);
  assert.deepEqual(removed, ['old-frontend']);
  assert.equal(values.get('private-consent'), 'keep');
  assert.equal(values.get('calendar-mode'), 'personal');
  assert.equal(values.get('last-sw-version'), `calendar-${CALENDAR_RELEASE}`);
});
