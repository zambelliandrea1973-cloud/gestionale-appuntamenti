import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import ts from 'typescript';
import { getISOWeek } from 'date-fns';

// Run the actual component with synthetic DOM/touches, without sign-in or HTTP.
function mountGrid(appointments: any[] = []) {
  const effects: Array<() => void> = [];
  const heights: number[] = [];
  const listeners = new Map<string, (event: any) => void>();
  const resizes = new Map<string, () => void>();
  const timers: Array<() => void> = [];
  const styles = new Map<string, string>();
  const selected: Date[] = [];
  const browser = {
    innerHeight: 900, scrollY: 0,
    visualViewport: { height: 900, addEventListener() {}, removeEventListener() {} },
    addEventListener: (name: string, callback: () => void) => resizes.set(name, callback),
    removeEventListener() {},
    setTimeout: (callback: () => void) => { timers.push(callback); },
  };
  const root = { parentElement: {}, getBoundingClientRect: () => ({ top: 300 - browser.scrollY }) };
  const clip = {
    scrollLeft: 0, scrollTop: 0, dataset: {} as Record<string, string>,
    getBoundingClientRect: () => ({ left: 0, top: 300 - browser.scrollY }),
    addEventListener: (name: string, callback: (event: any) => void) => listeners.set(name, callback),
    removeEventListener() {},
  };
  const grid = { style: { setProperty: (key: string, value: string) => styles.set(key, value) } };
  const refs = [root, clip, grid, 1];
  let refIndex = 0;
  let stateIndex = 0;
  const jsx = (type: any, props: any) => ({ type, props });
  const dependencies: Record<string, any> = {
    react: {
      useRef: () => ({ current: refs[refIndex++] }),
      useState: (value: any) => {
        const index = stateIndex++;
        return [value, (next: number) => { if (index === 1) heights.push(next); }];
      },
      useEffect: (callback: () => void) => effects.push(callback),
    },
    'react/jsx-runtime': { jsx, jsxs: jsx },
    'date-fns': { getISOWeek },
    'lucide-react': { Maximize2: () => null, Plus: () => null },
    'react-i18next': { useTranslation: () => ({ t: (key: string, fallback?: string) => fallback || key, i18n: { language: 'it' } }) },
    './MobileMonthGrid.css': {},
  };
  const source = readFileSync('client/src/components/MobileMonthGrid.tsx', 'utf8');
  const code = ts.transpileModule(source, {
    compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022, jsx: ts.JsxEmit.ReactJSX },
  }).outputText;
  const exports: any = {};
  new Function('exports', 'require', 'window', 'ResizeObserver', code)(
    exports, (name: string) => { assert.ok(name in dependencies, name); return dependencies[name]; },
    browser, class { observe() {} disconnect() {} },
  );
  const tree = exports.default({
    weeks: [[new Date(2026, 9, 31)]], month: new Date(2026, 9, 1), isLoading: false,
    getAppointments: () => appointments, getColors: () => null, getEventColor: () => '#000000',
    onDateSelect: (date: Date) => selected.push(date),
  });
  effects.forEach(callback => callback());
  const findDay = (node: any): any => {
    if (!node || typeof node !== 'object') return;
    if (node.props?.className?.startsWith('mobile-month-day')) return node;
    for (const child of [node.props?.children].flat(Infinity)) {
      const match = findDay(child);
      if (match) return match;
    }
  };
  return { browser, heights, listeners, resizes, timers, styles, selected, clip, day: findDay(tree) };
}

test('scrolling the page does not inflate the fixed month-grid height on viewport recalculation', () => {
  const fixture = mountGrid();
  assert.equal(fixture.heights.at(-1), 592);
  fixture.browser.scrollY = 240;
  fixture.resizes.get('resize')!();
  assert.equal(fixture.heights.at(-1), 592);
});
test('mobile private busy cells label the assigned operator without exposing private content', () => {
  const fixture = mountGrid([
    { id: -1, isPersonalBusy: true, staffName: 'Operator Ada', startTime: '09:00', title: 'SECRET', notes: 'SECRET', client: { firstName: 'SECRET' } },
    { id: -2, isPersonalBusy: true, staffName: 'Operator Bruno', startTime: '11:00', title: 'SECRET' },
  ]);
  const view = JSON.stringify(fixture.day);
  assert.match(view, /Occupato · Operator Ada/);
  assert.match(view, /Occupato · Operator Bruno/);
  assert.doesNotMatch(view, /SECRET/);
});

test('single-finger movement stays native while two-finger grid zoom remains active', () => {
  const fixture = mountGrid();
  let prevented = 0;
  const event = (touches: any[]) => ({ touches, preventDefault: () => { prevented++; } });
  const start = fixture.listeners.get('touchstart')!;
  const move = fixture.listeners.get('touchmove')!;
  start(event([{ clientX: 10, clientY: 400 }]));
  move(event([{ clientX: 10, clientY: 350 }]));
  assert.equal(prevented, 0, 'a page scroll must not be intercepted');
  start(event([{ clientX: 0, clientY: 400 }, { clientX: 100, clientY: 400 }]));
  move(event([{ clientX: 0, clientY: 400 }, { clientX: 200, clientY: 400 }]));
  assert.equal(prevented, 1);
  assert.equal(fixture.styles.get('--mobile-zoom'), '2');
});

test('pinching still suppresses accidental day navigation and ordinary taps remain enabled', () => {
  const fixture = mountGrid();
  fixture.listeners.get('touchstart')!({ touches: [{ clientX: 0, clientY: 400 }, { clientX: 100, clientY: 400 }] });
  fixture.listeners.get('touchend')!({ touches: [] });
  fixture.day.props.onClick({});
  assert.equal(fixture.selected.length, 0);
  fixture.timers.forEach(callback => callback());
  fixture.day.props.onClick({});
  assert.equal(fixture.selected.length, 1);
});

test('mobile-only clearance sits outside the grid and its scroll can reach the page', () => {
  const css = readFileSync('client/src/components/MobileMonthGrid.css', 'utf8');
  const month = readFileSync('client/src/components/MonthView.tsx', 'utf8');
  assert.match(css, /@media \(max-width: 639px\)\s*\{\s*\.mobile-month-page-clearance/);
  assert.match(css, /padding-bottom:\s*calc\(112px \+ env\(safe-area-inset-bottom\)\)/);
  assert.match(month, /className="sm:hidden mobile-month-page-clearance"/);
  assert.match(css, /\.mobile-month-clip\s*\{[^}]*overscroll-behavior:\s*auto/);
  assert.match(css, /touch-action:\s*pan-x pan-y/);
});

test('monthly grid has no duplicate floating creation button', () => {
  const source = readFileSync('client/src/components/MobileMonthGrid.tsx', 'utf8');
  assert.doesNotMatch(source, /mobile-month-add|onNewAppointment|<Plus/);
});

test('both appointment assistants keep the calendar interactive without outside-tap dismissal', () => {
  for (const file of [
    'client/src/components/VoiceAppointmentAssistant.tsx',
    'client/src/components/PersonalVoiceAppointmentAssistant.tsx',
  ]) {
    const assistant = readFileSync(file, 'utf8');
    assert.match(assistant, /<Dialog modal=\{false\}/);
    assert.match(assistant, /overlayClassName="bg-black\/15 !pointer-events-none"/);
  }
  const dialog = readFileSync('client/src/components/ui/dialog.tsx', 'utf8');
  assert.match(dialog, /onInteractOutside=\{\(e\) => e\.preventDefault\(\)\}/);
});
