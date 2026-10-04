import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import ts from 'typescript';
import { personalAppointmentForCalendar } from '../shared/personalAppointments';

// Exercise the calendar feed with cached private data, without authentication,
// database connections, or provider requests.
function render(mode: 'work' | 'personal', unlocked: boolean, date?: string) {
  const queries: any[] = [];
  const privateRecord = {
    id: 71, userId: 42, profileId: 3, title: 'Sensitive personal title',
    date: '2026-10-19', startTime: '10:00', endTime: '10:15',
    notes: 'Sensitive personal note', location: 'Sensitive location',
  };
  const dependencies: Record<string, any> = {
    react: { useMemo: (fn: () => any) => fn() },
    '@tanstack/react-query': { useQuery: (options: any) => {
      queries.push(options);
      return { data: options.queryKey[0] === '/api/appointments' ? [privateRecord] : [
        { ...privateRecord, staffId: null },
        { ...privateRecord, id: 72, staffId: 9 },
      ] };
    } },
    '@/components/personal-space/api': { personalRequest: () => { throw new Error('No HTTP allowed'); } },
    '@/components/personal-space/PersonalSpaceProvider': {
      usePersonalSpace: () => ({ unlocked, access: { profile: { id: 3 } } }),
    },
    '@/hooks/use-appointment-mode': { useAppointmentMode: () => [mode] },
    '../../../shared/personalAppointments': { personalAppointmentForCalendar },
  };
  const code = ts.transpileModule(readFileSync('client/src/hooks/use-personal-appointments.ts', 'utf8'), {
    compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 },
  }).outputText;
  const exports: any = {};
  new Function('exports', 'require', code)(exports, (name: string) => {
    assert.ok(name in dependencies, `Unexpected dependency ${name}`);
    return dependencies[name];
  });
  const work = { id: 10, client: { firstName: 'Shared work appointment' } };
  return { ...exports.usePersonalCalendarAppointments([work], date), queries, work };
}

test('shared mode never exposes cached private titles, even with a previously unlocked profile', () => {
  const result = render('work', true);
  assert.equal(result.queries[0].enabled, false);
  assert.ok(result.appointments.includes(result.work), 'shared work stays readable');
  assert.equal(result.appointments.filter((a: any) => a.isPersonalBusy).length, 2);
  assert.doesNotMatch(JSON.stringify(result.appointments), /Sensitive/);
});

test('locked personal mode also masks pre-existing cached details', () => {
  const result = render('personal', false);
  assert.equal(result.queries[0].enabled, false);
  assert.doesNotMatch(JSON.stringify(result.appointments), /Sensitive/);
});

test('personal mode reveals only selected profile details and deduplicates its anonymous busy slot', () => {
  const result = render('personal', true);
  assert.equal(result.queries[0].enabled, true);
  assert.equal(result.queries[0].queryKey[2], 3);
  assert.equal(result.appointments.filter((a: any) => a.isPersonalBusy).length, 1);
  assert.equal(result.appointments.find((a: any) => a.personalAppointmentId === 71).client.firstName, 'Sensitive personal title');
  assert.equal(result.appointments.find((a: any) => a.personalAppointmentId === 72).client.firstName, 'Occupato');
});

test('selected-day feed does not expose private details or busy slots from other days', () => {
  const result = render('personal', true, '2026-10-20');
  assert.deepEqual(result.appointments, [result.work]);
});

function pendingAccessProvider({ multi = true, ready = true } = {}) {
  let index = 0;
  let token: string | null = ready ? 'a'.repeat(64) : null;
  const changes: Array<{ index: number; value: any }> = [];
  const profiles = { multi, identities: [], profiles: [] };
  const jsx = (type: any, props: any) => ({ type, props });
  const dependencies: Record<string, any> = {
    'react/jsx-runtime': { jsx, jsxs: jsx },
    react: {
      createContext: () => ({ Provider: 'provider' }),
      useCallback: (fn: any) => fn, useMemo: (fn: any) => fn(),
      useContext: () => null, useEffect: () => {}, useRef: (value: any) => ({ current: value }),
      useState: (initial: any) => {
        const current = index++;
        return [current === 0 ? ready : initial, (value: any) => changes.push({ index: current, value })];
      },
    },
    '@tanstack/react-query': {
      useQueryClient: () => ({ removeQueries: () => {}, invalidateQueries: async () => {} }),
      useQuery: (options: any) => options.queryKey[0].endsWith('/profiles')
        ? { data: profiles, refetch: async () => ({ data: profiles }) }
        : { data: undefined, isError: false, isLoading: true },
    },
    'lucide-react': { LockKeyhole: () => null, ShieldCheck: () => null },
    '@/components/ui/button': { Button: () => null },
    '@/components/ui/input': { Input: () => null },
    './api': {
      getSpaceToken: () => token, setSpaceToken: (value: string | null) => { token = value; },
      setSpaceExpiredHandler: () => {}, spaceApi: { lock: async () => ({ locked: true }) },
    },
  };
  const code = ts.transpileModule(readFileSync('client/src/components/personal-space/PersonalSpaceProvider.tsx', 'utf8'), {
    compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022, jsx: ts.JsxEmit.ReactJSX },
  }).outputText;
  const exports: any = {};
  new Function('exports', 'require', code)(exports, (name: string) => {
    assert.ok(name in dependencies, `Unexpected dependency ${name}`);
    return dependencies[name];
  });
  const element = exports.PersonalSpaceProvider({ children: null, accountKey: 42 });
  return { context: element.props.value, changes };
}

test('accepted password does not reopen recognition form while protected metadata loads', async () => {
  const { context, changes } = pendingAccessProvider();
  assert.equal(context.unlocked, false, 'metadata is intentionally still pending');
  await context.requestAccess();
  assert.equal(changes.some(row => row.index === 1 && row.value === true), false);
});

test('an explicit profile change still closes existing access and opens recognition', async () => {
  const { context, changes } = pendingAccessProvider();
  await context.requestAccess(undefined, { force: true });
  assert.ok(changes.some(row => row.index === 0 && row.value === false), 'existing access was locked');
  assert.ok(changes.some(row => row.index === 1 && row.value === true), 'profile chooser was opened');
});

test('solo recognition requests never expose the password/profile form', async () => {
  const { context, changes } = pendingAccessProvider({ multi: false, ready: false });
  await context.requestAccess();
  assert.equal(changes.some(row => row.index === 1 && row.value === true), false);
});