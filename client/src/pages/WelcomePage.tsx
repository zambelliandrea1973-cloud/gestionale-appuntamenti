import { useEffect } from "react";
import { useLocation } from "wouter";
import { useTranslation } from "react-i18next";
import { Button } from "@/components/ui/button";
import {
  Calendar,
  Users,
  MessageCircle,
  FileText,
  CheckCircle2,
  Star,
  ArrowRight,
  LogIn,
} from "lucide-react";
import { Toaster } from "@/components/ui/toaster";
import { useUserWithLicense } from "@/hooks/use-user-with-license";
import { LanguageSelector } from "@/components/ui/language-selector";

export default function WelcomePage() {
  const [, setLocation] = useLocation();
  const { user, isLoading } = useUserWithLicense();
  const { t } = useTranslation();

  const isPWA =
    window.matchMedia("(display-mode: standalone)").matches ||
    (window.navigator as any).standalone ||
    document.referrer.includes("android-app://");

  useEffect(() => {
    const urlParams = new URLSearchParams(window.location.search);
    const hasClientToken = urlParams.get("token") && urlParams.get("clientId");

    if (!isLoading && user && !hasClientToken) {
      setLocation("/dashboard");
      return;
    }
  }, [user, isLoading, setLocation]);

  useEffect(() => {
    if (isPWA) {
      const hasStoredToken = !!localStorage.getItem("clientAccessToken");
      console.log("Welcome page caricata in modalità PWA", { hasStoredToken });
    }
  }, [isPWA]);

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="animate-spin w-8 h-8 border-4 border-primary border-t-transparent rounded-full" />
      </div>
    );
  }

  const features = [
    {
      icon: Calendar,
      title: t("welcomePage.feature1Title", "Calendario smart"),
      desc: t("welcomePage.feature1Desc", "Appuntamenti sempre sotto controllo"),
      color: "bg-emerald-50 text-emerald-700",
    },
    {
      icon: Users,
      title: t("welcomePage.feature2Title", "Clienti & schede"),
      desc: t("welcomePage.feature2Desc", "Storico completo a portata di mano"),
      color: "bg-blue-50 text-blue-700",
    },
    {
      icon: MessageCircle,
      title: t("welcomePage.feature3Title", "Promemoria WhatsApp"),
      desc: t("welcomePage.feature3Desc", "Riduci i no-show fino al 70%"),
      color: "bg-green-50 text-green-700",
    },
    {
      icon: FileText,
      title: t("welcomePage.feature4Title", "Fatture & incassi"),
      desc: t("welcomePage.feature4Desc", "Gestione fiscale integrata"),
      color: "bg-amber-50 text-amber-700",
    },
  ];

  const benefits = [
    t("welcomePage.benefit1", "40 giorni gratis, nessuna carta richiesta"),
    t("welcomePage.benefit2", "Sincronizza con Google Calendar"),
    t("welcomePage.benefit3", "Funziona da telefono, tablet e PC"),
  ];

  return (
    <div className="flex flex-col min-h-screen bg-gradient-to-b from-primary/5 via-background to-background">
      {/* Header */}
      <header className="bg-primary text-white py-3 shadow-md">
        <div className="container mx-auto px-4">
          <div className="flex justify-between items-center">
            <h1 className="text-xl font-semibold">{t("app.title")}</h1>
            <LanguageSelector />
          </div>
        </div>
      </header>

      {/* Main content */}
      <main className="flex-grow">
        <div className="container mx-auto px-4 py-8 md:py-12 max-w-4xl">
          {/* Hero */}
          <section className="text-center mb-10">
            <div className="inline-flex items-center gap-2 px-3 py-1 bg-primary/10 text-primary rounded-full text-xs font-medium mb-4">
              <Star className="h-3.5 w-3.5 fill-current" />
              {t("welcomePage.badge", "Usato da centinaia di professionisti")}
            </div>
            <h2 className="text-3xl md:text-4xl font-bold tracking-tight mb-3 leading-tight">
              {t("welcomePage.heroTitle", "Il tuo studio, sempre in tasca")}
            </h2>
            <p className="text-base md:text-lg text-muted-foreground max-w-xl mx-auto">
              {t(
                "welcomePage.heroSubtitle",
                "Gestisci appuntamenti, clienti, promemoria e fatture in un'unica app pensata per parrucchieri, estetiste e professionisti del benessere."
              )}
            </p>
          </section>

          {/* CTA primario subito visibile */}
          <section className="mb-10">
            <div className="max-w-md mx-auto space-y-3">
              <Button
                className="w-full h-14 text-base font-semibold shadow-lg shadow-primary/20"
                size="lg"
                onClick={() => setLocation("/register")}
                data-testid="button-create-account"
              >
                {t("welcomePage.ctaPrimary", "Inizia gratis 40 giorni")}
                <ArrowRight className="ml-2 h-5 w-5" />
              </Button>
              <p className="text-center text-xs text-muted-foreground">
                {t(
                  "welcomePage.ctaHint",
                  "Nessuna carta di credito richiesta · Cancelli quando vuoi"
                )}
              </p>
            </div>
          </section>

          {/* Feature grid */}
          <section className="grid grid-cols-2 md:grid-cols-4 gap-3 md:gap-4 mb-10">
            {features.map((f, i) => {
              const Icon = f.icon;
              return (
                <div
                  key={i}
                  className="bg-card border rounded-xl p-4 text-center hover:shadow-md transition-shadow"
                  data-testid={`feature-card-${i}`}
                >
                  <div
                    className={`inline-flex items-center justify-center w-10 h-10 rounded-lg mb-3 ${f.color}`}
                  >
                    <Icon className="h-5 w-5" />
                  </div>
                  <h3 className="font-semibold text-sm mb-1">{f.title}</h3>
                  <p className="text-xs text-muted-foreground leading-snug">
                    {f.desc}
                  </p>
                </div>
              );
            })}
          </section>

          {/* Benefits */}
          <section className="bg-card border rounded-xl p-5 md:p-6 mb-10 max-w-xl mx-auto">
            <ul className="space-y-3">
              {benefits.map((b, i) => (
                <li key={i} className="flex items-start gap-3 text-sm md:text-base">
                  <CheckCircle2 className="h-5 w-5 text-primary flex-shrink-0 mt-0.5" />
                  <span>{b}</span>
                </li>
              ))}
            </ul>
          </section>

          {/* Login secondario */}
          <section className="text-center">
            <p className="text-sm text-muted-foreground mb-2">
              {t("welcomePage.alreadyAccount", "Hai già un account?")}
            </p>
            <Button
              variant="outline"
              size="lg"
              onClick={() => setLocation("/login")}
              data-testid="button-login"
            >
              <LogIn className="mr-2 h-4 w-4" />
              {t("welcomePage.login")}
            </Button>
          </section>
        </div>
      </main>

      {/* Footer */}
      <footer className="bg-gray-50 border-t py-4 mt-8">
        <div className="container mx-auto px-4">
          <div className="flex flex-col items-center gap-2 text-xs text-gray-500">
            <p>{t("welcomePage.footerCopyright")}</p>
            <div className="flex gap-4">
              <a href="/privacy" className="text-primary hover:underline">
                Privacy Policy
              </a>
              <a href="/terms" className="text-primary hover:underline">
                Termini di Servizio
              </a>
            </div>
          </div>
        </div>
      </footer>

      <Toaster />
    </div>
  );
}
