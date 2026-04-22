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
  UserPlus,
  LogIn,
} from "lucide-react";
import { Toaster } from "@/components/ui/toaster";
import { useUserWithLicense } from "@/hooks/use-user-with-license";
import { LanguageSelector } from "@/components/ui/language-selector";

const QUICK_LANGS = [
  { code: "en", flag: "🇬🇧", label: "English" },
  { code: "fr", flag: "🇫🇷", label: "Français" },
  { code: "es", flag: "🇪🇸", label: "Español" },
  { code: "de", flag: "🇩🇪", label: "Deutsch" },
  { code: "it", flag: "🇮🇹", label: "Italiano" },
];

export default function WelcomePage() {
  const [, setLocation] = useLocation();
  const { user, isLoading } = useUserWithLicense();
  const { t, i18n } = useTranslation();

  const currentLang = i18n.language?.split("-")[0] || "it";
  const changeLang = (code: string) => {
    i18n.changeLanguage(code);
    localStorage.setItem("i18nextLng", code);
  };

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
    t("welcomePage.benefit1", "Nessuna carta di credito richiesta"),
    t("welcomePage.benefit2", "Nessuna pubblicità nell'app"),
    t("welcomePage.benefit3", "Sincronizza con Google Calendar"),
    t("welcomePage.benefit4", "Funziona da telefono, tablet e PC"),
  ];

  return (
    <div className="flex flex-col min-h-screen bg-gradient-to-b from-primary/5 via-background to-background">
      {/* Header */}
      <header className="bg-primary text-white py-3 shadow-md">
        <div className="container mx-auto px-4">
          <div className="flex justify-between items-start gap-2">
            <h1 className="text-lg sm:text-2xl font-bold leading-tight">
              {t("welcomePage.headerTitle", "Benvenuto nel")}
              <br />
              {t("app.title")}
            </h1>
            <div className="flex flex-col items-end gap-1">
              <div className="flex items-center gap-1">
                {QUICK_LANGS.map((l) => {
                  const active = currentLang === l.code;
                  return (
                    <button
                      key={l.code}
                      type="button"
                      onClick={() => changeLang(l.code)}
                      title={l.label}
                      aria-label={l.label}
                      data-testid={`flag-${l.code}`}
                      className={`text-xl leading-none px-1.5 py-0.5 rounded transition-all ${
                        active
                          ? "bg-white/25 ring-2 ring-white scale-110"
                          : "opacity-70 hover:opacity-100 hover:bg-white/10"
                      }`}
                    >
                      {l.flag}
                    </button>
                  );
                })}
              </div>
              <LanguageSelector />
            </div>
          </div>
        </div>
      </header>

      {/* Main content */}
      <main className="flex-grow">
        <div className="container mx-auto px-4 py-8 md:py-12 max-w-4xl">
          {/* Hero */}
          <section className="text-center mb-10">
            <img
              src="/fleur-de-vie.jpg"
              alt="Gestionale Appuntamenti"
              className="w-24 h-24 md:w-28 md:h-28 mx-auto mb-4 rounded-2xl shadow-lg object-cover"
            />
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

          {/* CTA primario + login secondario */}
          <section className="mb-10">
            <div className="max-w-md mx-auto space-y-3">
              <Button
                className="w-full h-14 text-base font-semibold shadow-lg shadow-primary/20"
                size="lg"
                onClick={() => setLocation("/register")}
                data-testid="button-create-account"
              >
                <UserPlus className="mr-2 h-5 w-5" />
                {t("welcomePage.ctaPrimary", "Inizia gratis · Crea nuovo account")}
              </Button>
              <p className="text-center text-xs text-muted-foreground">
                {t(
                  "welcomePage.ctaHint",
                  "Nessuna carta di credito richiesta · Cancelli quando vuoi"
                )}
              </p>

              <div className="pt-4 space-y-2">
                <p className="text-center text-sm text-muted-foreground">
                  {t("welcomePage.alreadyAccount", "Hai già un account?")}
                </p>
                <Button
                  variant="outline"
                  className="w-full h-12 text-base font-semibold border-2 border-primary text-primary hover:bg-primary/5"
                  onClick={() => setLocation("/login")}
                  data-testid="button-login"
                >
                  <LogIn className="mr-2 h-5 w-5" />
                  {t("welcomePage.login", "Accedi")}
                </Button>
              </div>
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

        </div>
      </main>

      {/* Footer */}
      <footer className="bg-gray-50 border-t py-4 mt-8">
        <div className="container mx-auto px-4">
          <div className="flex flex-col items-center gap-1 text-xs text-gray-500">
            <p className="font-medium text-gray-600">{t("app.version", "Gestionale Appuntamenti v3.5.0")}</p>
            <p>{t("app.copyright", "© 2023-2025 Tutti i diritti riservati")}</p>
            <p>Zambelli Andrea - Gestionale Appuntamenti</p>
            <div className="flex gap-4 mt-1">
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
