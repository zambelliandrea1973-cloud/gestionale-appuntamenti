import { useState } from "react";
import { useTranslation } from "react-i18next";
import { X, Sparkles, Phone } from "lucide-react";
import { Button } from "@/components/ui/button";

const STORAGE_KEY = "setupServiceBannerDismissed";

export default function SetupServiceBanner() {
  const { t } = useTranslation();

  const [dismissed, setDismissed] = useState(() => {
    try {
      return localStorage.getItem(STORAGE_KEY) === "forever";
    } catch {
      return false;
    }
  });

  const [hidden, setHidden] = useState(() => {
    try {
      return localStorage.getItem(STORAGE_KEY) !== null;
    } catch {
      return false;
    }
  });

  if (dismissed || hidden) return null;

  const dismissTemp = () => {
    try {
      localStorage.setItem(STORAGE_KEY, "temp");
    } catch {}
    setHidden(true);
  };

  const dismissForever = () => {
    try {
      localStorage.setItem(STORAGE_KEY, "forever");
    } catch {}
    setDismissed(true);
  };

  return (
    <div className="relative rounded-xl border border-primary/30 bg-gradient-to-r from-primary/5 via-primary/10 to-primary/5 p-4 shadow-sm">
      <div className="flex items-start gap-3">
        <div className="flex-shrink-0 w-10 h-10 rounded-full bg-primary/15 flex items-center justify-center">
          <Sparkles className="h-5 w-5 text-primary" />
        </div>
        <div className="flex-1 min-w-0">
          <p className="font-semibold text-foreground text-sm">
            {t("setupServiceBanner.title", "Servizio di configurazione professionale")}
          </p>
          <p className="text-xs text-muted-foreground mt-0.5 leading-relaxed">
            {t("setupServiceBanner.desc", "Lascia fare a noi! Configuriamo il tuo account, importiamo i tuoi contatti (fino a 100) e ti guidiamo nell'utilizzo del gestionale.")}
          </p>
          <p className="text-xs font-semibold text-primary mt-1">
            {t("setupServiceBanner.price", "Servizio completo a soli €500")}
          </p>
          <div className="flex flex-wrap items-center gap-2 mt-3">
            <Button
              size="sm"
              className="h-8 text-xs gap-1.5"
              onClick={() => window.open("https://wa.me/393472550110?text=" + encodeURIComponent("Ciao, vorrei richiedere informazioni sul servizio di configurazione account a €500"), "_blank")}
            >
              <Phone className="h-3 w-3" />
              {t("setupServiceBanner.cta", "Richiedi informazioni")}
            </Button>
            <button
              className="text-xs text-muted-foreground hover:text-foreground underline underline-offset-2"
              onClick={dismissTemp}
            >
              {t("setupServiceBanner.dismiss", "Ricordamelo dopo")}
            </button>
            <button
              className="text-xs text-muted-foreground hover:text-foreground underline underline-offset-2"
              onClick={dismissForever}
            >
              {t("setupServiceBanner.dismissForever", "Non mostrare più")}
            </button>
          </div>
        </div>
        <button
          onClick={dismissTemp}
          className="flex-shrink-0 text-muted-foreground hover:text-foreground transition-colors"
          aria-label="Chiudi"
        >
          <X className="h-4 w-4" />
        </button>
      </div>
    </div>
  );
}
