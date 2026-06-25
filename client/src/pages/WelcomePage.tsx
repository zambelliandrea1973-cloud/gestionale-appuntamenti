import { useEffect, useState } from "react";
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
  X,
  Eye,
  PlayCircle,
} from "lucide-react";
import { SiGoogle, SiFacebook } from "react-icons/si";
import { Toaster } from "@/components/ui/toaster";
import { useUserWithLicense } from "@/hooks/use-user-with-license";
import { LanguageSelector } from "@/components/ui/language-selector";
import calendarPreview from "../assets/preview-calendario.jpg";
import clientiPreview from "../assets/preview-clienti.jpg";
import whatsappPreview from "../assets/preview-whatsapp.jpg";
import fatturePreview from "../assets/preview-fatture.jpg";

const QUICK_LANGS = [
  { code: "hi", flag: "🇮🇳", label: "हिंदी" },
  { code: "en", flag: "🇬🇧", label: "English" },
  { code: "it", flag: "🇮🇹", label: "Italiano" },
  { code: "fr", flag: "🇫🇷", label: "Français" },
  { code: "es", flag: "🇪🇸", label: "Español" },
  { code: "ru", flag: "🇷🇺", label: "Русский" },
];

export default function WelcomePage() {
  const [, setLocation] = useLocation();
  const { user, isLoading } = useUserWithLicense();
  const { t, i18n } = useTranslation();
  const [previewImg, setPreviewImg] = useState<{ src: string; title: string } | null>(null);
  const [demoLoading, setDemoLoading] = useState(false);

  const currentLang = i18n.language?.split("-")[0] || "it";
  const changeLang = (code: string) => {
    i18n.changeLanguage(code);
    localStorage.setItem("i18nextLng", code);
  };

  const handleDemoLogin = async () => {
    setDemoLoading(true);
    try {
      const res = await fetch("/api/auth/demo-login", { method: "POST", credentials: "include" });
      if (res.ok) {
        setLocation("/dashboard");
      }
    } catch (e) {
      console.error("[DEMO] login failed", e);
    } finally {
      setDemoLoading(false);
    }
  };

  const isPWA =
    window.matchMedia("(display-mode: standalone)").matches ||
    (window.navigator as any).standalone ||
    document.referrer.includes("android-app://");

  // Auto-detect language from IP for first-time visitors (no stored preference).
  // Falls back to browser language, then English.
  useEffect(() => {
    const stored = localStorage.getItem("i18nextLng");
    if (stored) return;

    const supported = ["it", "en", "de", "fr", "es", "ru", "nl", "no", "ro", "hi"];

    fetch("/api/geo/language", { credentials: "include" })
      .then((r) => r.json())
      .then((data: { lang?: string }) => {
        const lang = data?.lang && supported.includes(data.lang) ? data.lang : null;
        if (lang) {
          i18n.changeLanguage(lang);
          return;
        }
        // fallback: browser language
        const browserLangs = navigator.languages ?? [navigator.language];
        for (const bl of browserLangs) {
          const code = bl.split("-")[0].toLowerCase();
          if (supported.includes(code)) { i18n.changeLanguage(code); break; }
        }
      })
      .catch(() => {
        // network error: fall back to browser language
        const supported2 = ["it", "en", "de", "fr", "es", "ru", "nl", "no", "ro", "hi"];
        const browserLangs = navigator.languages ?? [navigator.language];
        for (const bl of browserLangs) {
          const code = bl.split("-")[0].toLowerCase();
          if (supported2.includes(code)) { i18n.changeLanguage(code); break; }
        }
      });
  }, []);

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
      console.log("Welcome page loaded in PWA mode", { hasStoredToken });
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
      title: t("welcomePage.feature1Title", "Smart calendar"),
      desc: t("welcomePage.feature1Desc", "Appointments always under control"),
      color: "bg-emerald-50 text-emerald-700",
      preview: calendarPreview,
    },
    {
      icon: Users,
      title: t("welcomePage.feature2Title", "Clients & records"),
      desc: t("welcomePage.feature2Desc", "Complete history at your fingertips"),
      color: "bg-blue-50 text-blue-700",
      preview: clientiPreview,
    },
    {
      icon: MessageCircle,
      title: t("welcomePage.feature3Title", "WhatsApp reminders"),
      desc: t("welcomePage.feature3Desc", "Reduce no-shows by up to 70%"),
      color: "bg-green-50 text-green-700",
      preview: whatsappPreview,
    },
    {
      icon: FileText,
      title: t("welcomePage.feature4Title", "Invoices & payments"),
      desc: t("welcomePage.feature4Desc", "Integrated tax management"),
      color: "bg-amber-50 text-amber-700",
      preview: fatturePreview,
    },
  ];

  const benefits = [
    t("welcomePage.benefit1", "No credit card required"),
    t("welcomePage.benefit2", "No ads in the app"),
    t("welcomePage.benefit3", "Sync with Google Calendar"),
    t("welcomePage.benefit4", "Works on phone, tablet and PC"),
    t("welcomePage.benefit5", "No data collection or spam"),
  ];

  return (
    <div className="flex flex-col min-h-screen bg-gradient-to-b from-primary/5 via-background to-background">
      {/* Header */}
      <header className="bg-primary text-white py-3 shadow-md">
        <div className="container mx-auto px-4">
          <div className="flex justify-between items-start gap-2">
            <h1 className="text-lg sm:text-2xl font-bold leading-tight">
              {t("welcomePage.headerTitle", "Welcome to")}
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
              alt={t('app.defaultTitle', 'Appointment Manager')}
              className="w-24 h-24 md:w-28 md:h-28 mx-auto mb-4 rounded-2xl shadow-lg object-cover"
            />
            <div className="inline-flex items-center gap-2 px-3 py-1 bg-primary/10 text-primary rounded-full text-xs font-medium mb-4">
              <Star className="h-3.5 w-3.5 fill-current" />
              {t("welcomePage.badge", "Used by hundreds of professionals")}
            </div>
            <h2 className="text-3xl md:text-4xl font-bold tracking-tight mb-3 leading-tight">
              {t("welcomePage.heroTitle", "Your studio, always in your pocket")}
            </h2>
            <p className="text-base md:text-lg text-muted-foreground max-w-xl mx-auto">
              {t(
                "welcomePage.heroSubtitle",
                "Manage appointments, clients, reminders and invoices in one app designed for hairdressers, beauticians and wellness professionals."
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
                {t("welcomePage.ctaPrimary", "Start for free · Create new account")}
              </Button>
              <p className="text-center text-xs text-muted-foreground">
                {t(
                  "welcomePage.ctaHint",
                  "No credit card required · Cancel any time"
                )}
              </p>

              {/* Demo tour button */}
              <Button
                variant="ghost"
                className="w-full h-11 text-sm text-muted-foreground hover:text-primary hover:bg-primary/5 border border-dashed border-muted-foreground/40 hover:border-primary/40 transition-colors"
                onClick={handleDemoLogin}
                disabled={demoLoading}
                data-testid="button-demo"
              >
                <PlayCircle className="mr-2 h-4 w-4 flex-shrink-0" />
                {demoLoading
                  ? t("welcomePage.demoLoading", "Loading demo...")
                  : t("welcomePage.demoButton", "Or try a demo tour without registration")}
              </Button>

              <div className="pt-2 space-y-2">
                <p className="text-center text-sm text-muted-foreground">
                  {t("welcomePage.alreadyAccount", "Already have an account?")}
                </p>
                <Button
                  variant="outline"
                  className="w-full h-12 text-base font-semibold border-2 border-primary text-primary hover:bg-primary/5"
                  onClick={() => setLocation("/login")}
                  data-testid="button-login"
                >
                  <LogIn className="mr-2 h-5 w-5" />
                  {t("welcomePage.login", "Log in")}
                </Button>
              </div>

              {/* Social login */}
              <div className="relative pt-1">
                <div className="absolute inset-0 flex items-center">
                  <div className="w-full border-t border-muted-foreground/20" />
                </div>
                <div className="relative flex justify-center">
                  <span className="bg-background px-3 text-xs text-muted-foreground">
                    {t("welcomePage.orSocialLogin", "or sign in with")}
                  </span>
                </div>
              </div>
              <Button variant="outline" className="w-full h-11 text-sm font-medium border border-gray-300 hover:bg-gray-50 gap-2"
                onClick={() => { window.location.href = "/api/auth/google"; }} data-testid="button-google-login">
                <SiGoogle className="h-4 w-4 text-[#4285F4]" />
                {t("welcomePage.googleLogin", "Continue with Google")}
              </Button>
              {/* Facebook login — abilitare quando FACEBOOK_APP_ID e FACEBOOK_APP_SECRET sono configurati
              <Button variant="outline" className="w-full h-11 text-sm font-medium border border-gray-300 hover:bg-gray-50 gap-2"
                onClick={() => { window.location.href = "/api/auth/facebook"; }} data-testid="button-facebook-login">
                <SiFacebook className="h-4 w-4 text-[#1877F2]" />
                {t("welcomePage.facebookLogin", "Continue with Facebook")}
              </Button>
              */}
            </div>
          </section>

          {/* Feature grid */}
          <section className="grid grid-cols-2 md:grid-cols-4 gap-3 md:gap-4 mb-10">
            {features.map((f, i) => {
              const Icon = f.icon;
              return (
                <div
                  key={i}
                  className="bg-card border rounded-xl p-4 text-center hover:shadow-md transition-shadow flex flex-col items-center"
                  data-testid={`feature-card-${i}`}
                >
                  <div
                    className={`inline-flex items-center justify-center w-10 h-10 rounded-lg mb-3 ${f.color}`}
                  >
                    <Icon className="h-5 w-5" />
                  </div>
                  <h3 className="font-semibold text-sm mb-1">{f.title}</h3>
                  <p className="text-xs text-muted-foreground leading-snug mb-3">
                    {f.desc}
                  </p>
                  <button
                    type="button"
                    onClick={() => setPreviewImg({ src: f.preview, title: f.title })}
                    className="inline-flex items-center gap-1 text-xs font-medium text-primary hover:underline mt-auto"
                  >
                    <Eye className="h-3 w-3" />
                    {t("invoices.preview", "Preview")}
                  </button>
                </div>
              );
            })}
          </section>

          {/* Lightbox */}
          {previewImg && (
            <div
              className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4"
              onClick={() => setPreviewImg(null)}
            >
              <div
                className="relative bg-white rounded-2xl shadow-2xl max-w-sm w-full overflow-hidden"
                onClick={(e) => e.stopPropagation()}
              >
                <div className="flex items-center justify-between px-4 py-3 border-b">
                  <span className="font-semibold text-sm">{previewImg.title}</span>
                  <button
                    type="button"
                    onClick={() => setPreviewImg(null)}
                    className="text-muted-foreground hover:text-foreground transition-colors"
                  >
                    <X className="h-5 w-5" />
                  </button>
                </div>
                <img
                  src={previewImg.src}
                  alt={previewImg.title}
                  className="w-full object-contain max-h-[70vh]"
                />
              </div>
            </div>
          )}

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
            <p className="font-medium text-gray-600">{t("app.version", "Appointment Manager v3.5.0")}</p>
            <p>{t("app.copyright", "© 2023-2025 All rights reserved")}</p>
            <p>{t('i18nFinale.welcomePageExtra.developerCredit', { author: 'Zambelli Andrea' })}</p>
            <div className="flex gap-4 mt-1">
              <a href="/privacy" className="text-primary hover:underline">
                {t('i18nFinale.welcomePage.privacyPolicy')}
              </a>
              <a href="/terms" className="text-primary hover:underline">
                {t('i18nFinale.welcomePage.termsOfService')}
              </a>
            </div>
          </div>
        </div>
      </footer>

      <Toaster />
    </div>
  );
}
