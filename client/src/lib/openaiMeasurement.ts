export const OPENAI_MEASUREMENT_CONSENT_KEY = "openai-measurement-consent-v1";
export const OPENAI_MEASUREMENT_SETTINGS_EVENT = "openai-measurement-settings";

const OPENAI_PIXEL_ID = "AHRRP75PfYtE762B5AjVHm";
const OPENAI_PIXEL_SCRIPT_URL = "https://bzrcdn.openai.com/sdk/oaiq.min.js";

type OpenAiQueue = ((...args: unknown[]) => void) & { q?: unknown[][] };

export function readOpenAiMeasurementConsent(): boolean | null {
  try {
    const value = window.localStorage.getItem(OPENAI_MEASUREMENT_CONSENT_KEY);
    if (value === "accepted") return true;
    if (value === "rejected") return false;
  } catch {
    // If storage is unavailable, consent remains unset and measurement stays off.
  }
  return null;
}

export function saveOpenAiMeasurementConsent(accepted: boolean): void {
  try {
    window.localStorage.setItem(
      OPENAI_MEASUREMENT_CONSENT_KEY,
      accepted ? "accepted" : "rejected",
    );
  } catch {
    // Without durable consent, the measurement helper will not send events.
  }

  if (!accepted && typeof window !== "undefined") {
    const queue = (window as Window & {
      oaiq?: (...args: unknown[]) => void;
    }).oaiq;
    queue?.("consent", false);
  }
}

export function openOpenAiMeasurementSettings(): void {
  window.dispatchEvent(new Event(OPENAI_MEASUREMENT_SETTINGS_EVENT));
}

function getQueue(): OpenAiQueue {
  const target = window as Window & {
    oaiq?: OpenAiQueue;
    __openAiMeasurementInitialized?: boolean;
  };

  if (target.oaiq) return target.oaiq;

  const queue = ((...args: unknown[]) => {
    queue.q?.push(args);
  }) as OpenAiQueue;
  queue.q = [];
  target.oaiq = queue;
  return queue;
}

/**
 * Fires only the registration conversion. No account, client, or appointment
 * fields are passed to OpenAI. Call only after the registration API succeeds.
 */
export async function sendOpenAiRegistrationConversion(): Promise<void> {
  if (
    typeof window === "undefined" ||
    window.location.pathname !== "/register" ||
    readOpenAiMeasurementConsent() !== true
  ) {
    return;
  }

  const target = window as Window & {
    oaiq?: OpenAiQueue;
    __openAiMeasurementInitialized?: boolean;
    __openAiMeasurementLoadPromise?: Promise<void>;
  };
  const queue = getQueue();

  if (!target.__openAiMeasurementInitialized) {
    // Explicitly hold the SDK in denied mode until its init call is queued.
    queue("consent", false);
    queue("init", { pixelId: OPENAI_PIXEL_ID });
    queue("consent", true);
    target.__openAiMeasurementInitialized = true;
  } else {
    queue("consent", true);
  }

  queue("measure", "registration_completed", {
    type: "customer_action",
  });

  if (!target.__openAiMeasurementLoadPromise) {
    target.__openAiMeasurementLoadPromise = new Promise<void>((resolve) => {
      const existing = document.querySelector<HTMLScriptElement>(
        'script[data-openai-measurement-pixel="true"]',
      );
      if (existing) {
        if (existing.dataset.loaded === "true") {
          resolve();
        } else {
          existing.addEventListener("load", () => resolve(), { once: true });
          existing.addEventListener("error", () => resolve(), { once: true });
        }
        return;
      }

      const script = document.createElement("script");
      script.async = true;
      script.src = OPENAI_PIXEL_SCRIPT_URL;
      script.dataset.openaiMeasurementPixel = "true";
      script.onload = () => {
        script.dataset.loaded = "true";
        resolve();
      };
      script.onerror = () => resolve();
      document.head.appendChild(script);

      // Never delay a successful registration indefinitely for ad measurement.
      window.setTimeout(resolve, 900);
    });
  }

  await target.__openAiMeasurementLoadPromise;
}
