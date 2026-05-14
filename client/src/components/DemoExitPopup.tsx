import { useState, useEffect } from "react";
import { useLocation } from "wouter";
import { useTranslation } from "react-i18next";
import { useUserWithLicense } from "@/hooks/use-user-with-license";
import { Button } from "@/components/ui/button";
import { X, Sparkles } from "lucide-react";

const DELAY_MS = 3 * 60 * 1000; // 3 minutes

export function DemoExitPopup() {
  const { user } = useUserWithLicense();
  const [, setLocation] = useLocation();
  const { t } = useTranslation();
  const [visible, setVisible] = useState(false);
  const [dismissed, setDismissed] = useState(false);

  const isDemo = !!(user as any)?.isDemo;

  useEffect(() => {
    if (!isDemo || dismissed) return;

    const timer = setTimeout(() => {
      setVisible(true);
    }, DELAY_MS);

    return () => clearTimeout(timer);
  }, [isDemo, dismissed]);

  if (!isDemo || !visible || dismissed) return null;

  return (
    <div className="fixed bottom-0 left-0 right-0 z-[9999] p-3 sm:p-4 md:flex md:justify-center">
      <div className="bg-white border border-primary/30 rounded-2xl shadow-2xl shadow-primary/20 p-4 sm:p-5 w-full md:max-w-sm relative">
        {/* Close button */}
        <button
          onClick={() => { setVisible(false); setDismissed(true); }}
          className="absolute top-3 right-3 text-muted-foreground hover:text-foreground transition-colors"
          aria-label={t("demoExitPopup.dismiss")}
        >
          <X className="h-4 w-4" />
        </button>

        {/* Icon + Title */}
        <div className="flex items-start gap-3 mb-3">
          <div className="flex-shrink-0 bg-primary/10 rounded-xl p-2">
            <Sparkles className="h-5 w-5 text-primary" />
          </div>
          <div>
            <p className="font-bold text-sm sm:text-base leading-snug">
              {t("demoExitPopup.title")}
            </p>
            <p className="text-xs sm:text-sm text-muted-foreground mt-1 leading-snug">
              {t("demoExitPopup.subtitle")}
            </p>
          </div>
        </div>

        {/* Buttons */}
        <div className="flex gap-2 mt-3">
          <Button
            className="flex-1 h-10 text-sm font-semibold"
            onClick={() => setLocation("/register")}
          >
            {t("demoExitPopup.cta")}
          </Button>
          <Button
            variant="ghost"
            className="text-xs text-muted-foreground px-3 h-10 flex-shrink-0"
            onClick={() => { setVisible(false); setDismissed(true); }}
          >
            {t("demoExitPopup.dismiss")}
          </Button>
        </div>
      </div>
    </div>
  );
}
