import { useEffect, useState } from "react";
import { Link, useLocation } from "wouter";
import { useTranslation } from "react-i18next";
import {
  OPENAI_MEASUREMENT_SETTINGS_EVENT,
  readOpenAiMeasurementConsent,
  saveOpenAiMeasurementConsent,
} from "@/lib/openaiMeasurement";

const PUBLIC_PATHS = new Set([
  "/",
  "/register",
  "/login",
  "/staff-login",
  "/customer-login",
  "/professionisti",
  "/privacy",
  "/terms",
  "/subscribe",
  "/partnership/bicom",
]);

export default function OpenAiMeasurementConsent() {
  const { t } = useTranslation();
  const [location] = useLocation();
  const [choice, setChoice] = useState<boolean | null>(null);
  const [open, setOpen] = useState(false);

  useEffect(() => {
    const currentChoice = readOpenAiMeasurementConsent();
    setChoice(currentChoice);
    setOpen(currentChoice === null);

    const openSettings = () => setOpen(true);
    window.addEventListener(OPENAI_MEASUREMENT_SETTINGS_EVENT, openSettings);
    return () =>
      window.removeEventListener(OPENAI_MEASUREMENT_SETTINGS_EVENT, openSettings);
  }, []);

  const choose = (accepted: boolean) => {
    saveOpenAiMeasurementConsent(accepted);
    setChoice(accepted);
    setOpen(false);
    if (!accepted) {
      const queue = (window as Window & { oaiq?: (...args: unknown[]) => void }).oaiq;
      queue?.("consent", false);
    }
  };

  if (!PUBLIC_PATHS.has(location.split("?")[0]) || !open) return null;

  return (
    <aside
      aria-label={t("openaiMeasurementConsent.title")}
      className="fixed inset-x-3 bottom-3 z-[100] mx-auto max-w-3xl rounded-xl border bg-background p-4 shadow-2xl sm:inset-x-6 sm:bottom-6 sm:p-5"
      data-testid="openai-measurement-consent"
    >
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="space-y-1">
          <h2 className="text-sm font-semibold">
            {t("openaiMeasurementConsent.title")}
          </h2>
          <p className="max-w-xl text-sm text-muted-foreground">
            {t("openaiMeasurementConsent.description")}{" "}
            <Link
              href="/privacy"
              className="font-medium text-primary underline underline-offset-2"
            >
              {t("openaiMeasurementConsent.privacyLink")}
            </Link>
          </p>
        </div>
        <div className="flex shrink-0 gap-2">
          <button
            type="button"
            onClick={() => choose(false)}
            className="min-h-10 rounded-md border px-3 py-2 text-sm font-medium hover:bg-muted focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
          >
            {t("openaiMeasurementConsent.reject")}
          </button>
          <button
            type="button"
            onClick={() => choose(true)}
            className="min-h-10 rounded-md bg-primary px-3 py-2 text-sm font-medium text-primary-foreground hover:bg-primary/90 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
          >
            {t("openaiMeasurementConsent.accept")}
          </button>
        </div>
      </div>
      {choice !== null && (
        <p className="sr-only" aria-live="polite">
          {choice
            ? t("openaiMeasurementConsent.accepted")
            : t("openaiMeasurementConsent.rejected")}
        </p>
      )}
    </aside>
  );
}
