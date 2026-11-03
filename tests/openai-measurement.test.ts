import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";
import {
  OPENAI_MEASUREMENT_CONSENT_KEY,
  OPENAI_MEASUREMENT_SETTINGS_EVENT,
  isOpenAiMeasurementConsentPage,
  initializeOpenAiMeasurement,
  openOpenAiMeasurementSettings,
  readOpenAiMeasurementConsent,
  saveOpenAiMeasurementConsent,
  sendOpenAiRegistrationConversion,
} from "../client/src/lib/openaiMeasurement";

type Queue = ((...args: unknown[]) => void) & { q?: unknown[][] };
type FakeScript = {
  src: string;
  dataset: Record<string, string>;
  onload: (() => void) | null;
  onerror: (() => void) | null;
  addEventListener: (name: string, callback: () => void, options?: unknown) => void;
};

function installBrowser(pathname = "/register", consent?: string) {
  const previousWindow = Object.getOwnPropertyDescriptor(globalThis, "window");
  const previousDocument = Object.getOwnPropertyDescriptor(globalThis, "document");
  const values = new Map<string, string>();
  const scripts: FakeScript[] = [];
  const dispatchedEvents: Event[] = [];
  if (consent) values.set(OPENAI_MEASUREMENT_CONSENT_KEY, consent);

  const fakeWindow: Record<string, any> = {
    location: { pathname },
    localStorage: {
      getItem: (key: string) => values.get(key) ?? null,
      setItem: (key: string, value: string) => values.set(key, value),
    },
    setTimeout: (callback: () => void) => {
      callback();
      return 0;
    },
    dispatchEvent: (event: Event) => {
      dispatchedEvents.push(event);
      return true;
    },
  };
  const fakeDocument = {
    head: {
      appendChild: (script: FakeScript) => {
        scripts.push(script);
        script.onload?.();
      },
    },
    querySelector: () => scripts[0] ?? null,
    createElement: () => ({
      src: "",
      dataset: {},
      onload: null,
      onerror: null,
      addEventListener: () => {},
    }),
  };

  Object.defineProperty(globalThis, "window", {
    configurable: true,
    value: fakeWindow,
  });
  Object.defineProperty(globalThis, "document", {
    configurable: true,
    value: fakeDocument,
  });

  return {
    values,
    scripts,
    window: fakeWindow,
    fakeWindow,
    dispatchedEvents,
    restore() {
      if (previousWindow) Object.defineProperty(globalThis, "window", previousWindow);
      else delete (globalThis as any).window;
      if (previousDocument) Object.defineProperty(globalThis, "document", previousDocument);
      else delete (globalThis as any).document;
    },
  };
}

test("acceptance is stored without loading the pixel before public-page consent handling", () => {
  const browser = installBrowser();
  try {
    saveOpenAiMeasurementConsent(true);
    assert.equal(browser.values.get(OPENAI_MEASUREMENT_CONSENT_KEY), "accepted");
    assert.equal(readOpenAiMeasurementConsent(), true);
    assert.deepEqual(browser.scripts, []);
    assert.equal(browser.fakeWindow.oaiq, undefined);
  } finally {
    browser.restore();
  }
});

test("accepted consent initializes the pixel on a public landing page without a conversion", async () => {
  const browser = installBrowser("/", "accepted");
  try {
    await initializeOpenAiMeasurement();

    assert.equal(browser.scripts.length, 1);
    const queue = browser.fakeWindow.oaiq as Queue;
    assert.deepEqual(queue.q, [
      ["consent", false],
      ["init", { pixelId: "AHRRP75PfYtE762B5AjVHm" }],
      ["consent", true],
    ]);
    assert.equal(queue.q?.some(([command]) => command === "measure"), false);
  } finally {
    browser.restore();
  }
});

test("accepted registration reuses landing-page initialization and fires one conversion", async () => {
  const browser = installBrowser("/", "accepted");
  try {
    await initializeOpenAiMeasurement();
    browser.fakeWindow.location.pathname = "/register";
    await sendOpenAiRegistrationConversion();

    assert.equal(browser.scripts.length, 1);
    const queue = browser.fakeWindow.oaiq as Queue;
    assert.equal(queue.q?.filter(([command]) => command === "init").length, 1);
    assert.deepEqual(
      queue.q?.filter(([command]) => command === "measure"),
      [["measure", "registration_completed", { type: "customer_action" }]],
    );
  } finally {
    browser.restore();
  }
});

test("pixel initialization is blocked without consent and on private pages", async () => {
  for (const [pathname, consent] of [["/", undefined], ["/dashboard", "accepted"]] as const) {
    const browser = installBrowser(pathname, consent);
    try {
      await initializeOpenAiMeasurement();
      assert.equal(browser.scripts.length, 0);
      assert.equal(browser.fakeWindow.oaiq, undefined);
    } finally {
      browser.restore();
    }
  }
});

test("missing and rejected consent keep measurement disabled", async () => {
  for (const consent of [undefined, "rejected"]) {
    const browser = installBrowser("/register", consent);
    try {
      await sendOpenAiRegistrationConversion();
      assert.equal(browser.scripts.length, 0);
      assert.equal(browser.fakeWindow.oaiq, undefined);
    } finally {
      browser.restore();
    }
  }
});

test("registration measurement never loads from restricted routes", async () => {
  for (const pathname of ["/dashboard", "/appointments/private", "/calendar"]) {
    const browser = installBrowser(pathname, "accepted");
    try {
      await sendOpenAiRegistrationConversion();
      assert.equal(browser.scripts.length, 0, `${pathname} must not load the pixel`);
      assert.equal(browser.fakeWindow.oaiq, undefined);
    } finally {
      browser.restore();
    }
  }
});

test("consent banner is limited to public pages and accepts query strings", () => {
  assert.equal(isOpenAiMeasurementConsentPage("/register"), true);
  assert.equal(isOpenAiMeasurementConsentPage("/privacy?from=register"), true);
  assert.equal(isOpenAiMeasurementConsentPage("/dashboard"), false);
  assert.equal(isOpenAiMeasurementConsentPage("/appointments/private"), false);
});

test("one accepted registration sends one minimal standard conversion", async () => {
  const browser = installBrowser("/register", "accepted");
  try {
    await sendOpenAiRegistrationConversion();
    await sendOpenAiRegistrationConversion();

    assert.equal(browser.scripts.length, 1);
    assert.equal(browser.scripts[0].src, "https://bzrcdn.openai.com/sdk/oaiq.min.js");
    const queue = browser.fakeWindow.oaiq as Queue;
    assert.ok(queue);
    assert.deepEqual(queue.q, [
      ["consent", false],
      ["init", { pixelId: "AHRRP75PfYtE762B5AjVHm" }],
      ["consent", true],
      ["measure", "registration_completed", { type: "customer_action" }],
    ]);
    assert.doesNotMatch(JSON.stringify(queue.q), /email|client|appointment|customer@example/i);
  } finally {
    browser.restore();
  }
});

test("rejection and revocation disable future conversions", async () => {
  const browser = installBrowser("/register", "accepted");
  try {
    await sendOpenAiRegistrationConversion();
    const queue = browser.fakeWindow.oaiq as Queue;
    assert.equal(queue.q?.filter(([type]) => type === "measure").length, 1);

    saveOpenAiMeasurementConsent(false);
    assert.equal(browser.values.get(OPENAI_MEASUREMENT_CONSENT_KEY), "rejected");
    assert.equal(readOpenAiMeasurementConsent(), false);
    assert.ok(queue.q?.some(([type, accepted]) => type === "consent" && accepted === false));
    await sendOpenAiRegistrationConversion();

    assert.equal(queue.q?.filter(([type]) => type === "measure").length, 1);
    assert.equal(browser.scripts.length, 1);
  } finally {
    browser.restore();
  }
});

test("revoking consent stops later registration events and updates the SDK", async () => {
  const browser = installBrowser("/register", "accepted");
  try {
    await sendOpenAiRegistrationConversion();
    const queue = browser.window.oaiq as Queue;
    assert.equal(queue.q?.filter((args) => args[0] === "measure").length, 1);

    saveOpenAiMeasurementConsent(false);
    await sendOpenAiRegistrationConversion();

    assert.equal(
      browser.window.localStorage.getItem(OPENAI_MEASUREMENT_CONSENT_KEY),
      "rejected",
    );
    assert.deepEqual(queue.q?.at(-1), ["consent", false]);
    assert.equal(queue.q?.filter((args) => args[0] === "measure").length, 1);
    assert.equal(browser.scripts.length, 1);
  } finally {
    browser.restore();
  }
});

test("measurement settings can be reopened from the privacy page", () => {
  const browser = installBrowser("/privacy");
  try {
    openOpenAiMeasurementSettings();
    assert.equal(
      browser.dispatchedEvents[0]?.type,
      OPENAI_MEASUREMENT_SETTINGS_EVENT,
    );
    saveOpenAiMeasurementConsent(true);
    assert.equal(
      browser.fakeWindow.localStorage.getItem(OPENAI_MEASUREMENT_CONSENT_KEY),
      "accepted",
    );
    assert.equal(browser.scripts.length, 0);
  } finally {
    browser.restore();
  }
});

test("registration only invokes measurement after the API reports success", () => {
  const source = readFileSync("client/src/pages/RegisterPage.tsx", "utf8");
  const failedResponseCheck = source.indexOf("if (!response.ok)");
  const conversionCall = source.indexOf("await sendOpenAiRegistrationConversion()");
  assert.ok(failedResponseCheck >= 0);
  assert.ok(conversionCall > failedResponseCheck);
  assert.match(source, /if \(!response\.ok\)[\s\S]*?throw new Error/);

  const consentSource = readFileSync("client/src/components/OpenAiMeasurementConsent.tsx", "utf8");
  const chooseHandler = consentSource.slice(
    consentSource.indexOf("const choose ="),
    consentSource.indexOf("\n  };", consentSource.indexOf("const choose =")),
  );
  assert.doesNotMatch(chooseHandler, /sendOpenAiRegistrationConversion/);
});
