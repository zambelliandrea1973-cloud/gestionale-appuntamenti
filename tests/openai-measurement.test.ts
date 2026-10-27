import test from "node:test";
import assert from "node:assert/strict";
import {
  OPENAI_MEASUREMENT_CONSENT_KEY,
  OPENAI_MEASUREMENT_SETTINGS_EVENT,
  openOpenAiMeasurementSettings,
  saveOpenAiMeasurementConsent,
  sendOpenAiRegistrationConversion,
} from "../client/src/lib/openaiMeasurement";

type Queue = ((...args: unknown[]) => void) & { q?: unknown[][] };

function installBrowser(pathname: string, consent?: string) {
  const previousWindow = Object.getOwnPropertyDescriptor(globalThis, "window");
  const previousDocument = Object.getOwnPropertyDescriptor(globalThis, "document");
  const storage = new Map<string, string>();
  const scripts: any[] = [];
  const dispatchedEvents: Event[] = [];
  if (consent) storage.set(OPENAI_MEASUREMENT_CONSENT_KEY, consent);

  const browserWindow: any = {
    localStorage: {
      getItem: (key: string) => storage.get(key) ?? null,
      setItem: (key: string, value: string) => storage.set(key, value),
    },
    location: { pathname },
    setTimeout: (callback: () => void) => {
      callback();
      return 1;
    },
    dispatchEvent: (event: Event) => {
      dispatchedEvents.push(event);
      return true;
    },
  };
  const browserDocument: any = {
    head: {
      appendChild: (script: any) => {
        scripts.push(script);
        script.onload?.(new Event("load"));
      },
    },
    querySelector: () => scripts[0] ?? null,
    createElement: () => ({
      dataset: {},
      addEventListener() {},
    }),
  };

  Object.defineProperty(globalThis, "window", {
    configurable: true,
    value: browserWindow,
  });
  Object.defineProperty(globalThis, "document", {
    configurable: true,
    value: browserDocument,
  });

  return {
    window: browserWindow,
    scripts,
    dispatchedEvents,
    restore() {
      if (previousWindow) Object.defineProperty(globalThis, "window", previousWindow);
      else delete (globalThis as any).window;
      if (previousDocument) Object.defineProperty(globalThis, "document", previousDocument);
      else delete (globalThis as any).document;
    },
  };
}

test("OpenAI measurement stays off when consent is missing or rejected", async () => {
  for (const consent of [undefined, "rejected"]) {
    const browser = installBrowser("/register", consent);
    try {
      await sendOpenAiRegistrationConversion();
      assert.equal(browser.scripts.length, 0);
      assert.equal(browser.window.oaiq, undefined);
    } finally {
      browser.restore();
    }
  }
});

test("OpenAI measurement does not load from non-registration routes", async () => {
  const browser = installBrowser("/calendar", "accepted");
  try {
    await sendOpenAiRegistrationConversion();
    assert.equal(browser.scripts.length, 0);
    assert.equal(browser.window.oaiq, undefined);
  } finally {
    browser.restore();
  }
});

test("accepted registration sends only the standard registration event", async () => {
  const browser = installBrowser("/register", "accepted");
  try {
    await sendOpenAiRegistrationConversion();

    assert.equal(browser.scripts.length, 1);
    assert.equal(
      browser.scripts[0].src,
      "https://bzrcdn.openai.com/sdk/oaiq.min.js",
    );
    const queue = browser.window.oaiq as Queue;
    assert.ok(queue);
    assert.deepEqual(queue.q, [
      ["consent", false],
      ["init", { pixelId: "AHRRP75PfYtE762B5AjVHm" }],
      ["consent", true],
      ["measure", "registration_completed", { type: "customer_action" }],
    ]);

    const eventPayload = queue.q?.find((args) => args[0] === "measure")?.[2];
    assert.deepEqual(eventPayload, { type: "customer_action" });
    assert.equal(JSON.stringify(queue.q).includes("email"), false);
    assert.equal(JSON.stringify(queue.q).includes("appointment"), false);
    assert.equal(JSON.stringify(queue.q).includes("client"), false);
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
      browser.window.localStorage.getItem(OPENAI_MEASUREMENT_CONSENT_KEY),
      "accepted",
    );
  } finally {
    browser.restore();
  }
});
