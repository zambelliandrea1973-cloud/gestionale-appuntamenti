import { useEffect } from "react";
import { useLocation } from "wouter";
import { useTranslation } from "react-i18next";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import {
  Calendar, Users, Bell, Star, CheckCircle2, ArrowRight,
  Scissors, Heart, Brain, Smile, Zap, Shield, Clock,
  Smartphone, Euro, MessageSquare, TrendingUp, Lock,
} from "lucide-react";
import { useUserWithLicense } from "@/hooks/use-user-with-license";
import fleurLogo from "../assets/fleur-de-vie.jpg";

export default function ProfessionistiLandingPage() {
  const [, setLocation] = useLocation();
  const { user } = useUserWithLicense();
  const { t } = useTranslation();

  useEffect(() => {
    if (user) setLocation("/dashboard");
  }, [user, setLocation]);

  const goRegister = () => setLocation("/register");
  const goLogin    = () => setLocation("/login");

  const PROFESSIONI = [
    { icon: Scissors,      key: "hairdressers" },
    { icon: Heart,         key: "beauticians" },
    { icon: Heart,         key: "masseurs" },
    { icon: Brain,         key: "psychologists" },
    { icon: Smile,         key: "dentists" },
    { icon: Zap,           key: "osteopaths" },
    { icon: Zap,           key: "physiotherapists" },
    { icon: Heart,         key: "naturopaths" },
    { icon: Smile,         key: "nutritionists" },
    { icon: Brain,         key: "coaches" },
    { icon: Zap,           key: "personalTrainers" },
    { icon: Heart,         key: "tattooArtists" },
  ];

  const BENEFICI = [
    { icon: Calendar,      key: "schedule" },
    { icon: Bell,          key: "reminders" },
    { icon: Users,         key: "clients" },
    { icon: Euro,          key: "billing" },
    { icon: MessageSquare, key: "booking" },
    { icon: TrendingUp,    key: "reports" },
  ];

  const CHECKLIST_KEYS = [
    "realtime", "whatsapp", "profile", "booking", "stats", "devices", "backup", "support",
  ] as const;

  const FAQ_KEYS = [
    "techSavvy", "dataSafe", "offline", "freeTrial", "staff",
  ] as const;

  const TESTIMONIALS = [
    { key: "lucia", stars: 5 },
    { key: "marco", stars: 5 },
    { key: "sara",  stars: 5 },
  ] as const;

  return (
    <div className="min-h-screen bg-white text-gray-900 flex flex-col">

      {/* ── NAV ── */}
      <header className="sticky top-0 z-40 bg-white/95 backdrop-blur border-b border-gray-100 shadow-sm">
        <div className="max-w-5xl mx-auto px-4 h-14 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <img src={fleurLogo} alt={t("landingPro.nav.brand")} className="h-8 w-8 rounded-full object-cover" />
            <span className="font-semibold text-sm hidden sm:inline">{t("landingPro.nav.brand")}</span>
          </div>
          <div className="flex items-center gap-2">
            <Button variant="ghost" size="sm" onClick={goLogin}>{t("landingPro.nav.login")}</Button>
            <Button size="sm" className="bg-[#4a5e2a] hover:bg-[#3a4e1a] text-white" onClick={goRegister}>
              {t("landingPro.nav.tryFree")}
            </Button>
          </div>
        </div>
      </header>

      {/* ── HERO ── */}
      <section className="bg-gradient-to-br from-[#4a5e2a]/10 via-white to-[#4a5e2a]/5 py-16 px-4">
        <div className="max-w-3xl mx-auto text-center space-y-6">
          <Badge className="bg-[#4a5e2a]/10 text-[#4a5e2a] border-[#4a5e2a]/20 hover:bg-[#4a5e2a]/10">
            {t("landingPro.hero.badge")}
          </Badge>

          <h1 className="text-3xl sm:text-4xl md:text-5xl font-bold leading-tight tracking-tight">
            {t("landingPro.hero.title")}<br className="hidden sm:block" />{" "}
            <span className="text-[#4a5e2a]">{t("landingPro.hero.titleHighlight")}</span>
          </h1>

          <p className="text-lg text-gray-600 max-w-xl mx-auto">
            {t("landingPro.hero.subtitle")}
          </p>

          <div className="flex flex-col sm:flex-row gap-3 justify-center">
            <Button
              size="lg"
              className="bg-[#4a5e2a] hover:bg-[#3a4e1a] text-white text-base gap-2 rounded-full px-8"
              onClick={goRegister}
            >
              {t("landingPro.hero.ctaStart")}
              <ArrowRight className="h-4 w-4" />
            </Button>
            <Button
              size="lg"
              variant="outline"
              className="rounded-full px-8 text-base"
              onClick={goLogin}
            >
              {t("landingPro.hero.ctaLogin")}
            </Button>
          </div>

          <p className="text-xs text-gray-400">
            {t("landingPro.hero.noCard")}
          </p>
        </div>
      </section>

      {/* ── PROFESSIONI ── */}
      <section className="py-14 px-4 bg-gray-50">
        <div className="max-w-4xl mx-auto">
          <p className="text-center text-sm font-medium text-gray-500 uppercase tracking-widest mb-8">
            {t("landingPro.professions.sectionLabel")}
          </p>
          <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-6 gap-3">
            {PROFESSIONI.map(({ icon: Icon, key }) => (
              <div
                key={key}
                className="flex flex-col items-center gap-2 p-3 rounded-xl bg-white border border-gray-100 shadow-sm"
              >
                <div className="h-9 w-9 rounded-full bg-[#4a5e2a]/10 flex items-center justify-center">
                  <Icon className="h-4 w-4 text-[#4a5e2a]" />
                </div>
                <span className="text-xs text-center font-medium text-gray-700 leading-tight">
                  {t(`landingPro.professions.${key}`)}
                </span>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── BENEFICI ── */}
      <section className="py-16 px-4">
        <div className="max-w-4xl mx-auto">
          <h2 className="text-2xl sm:text-3xl font-bold text-center mb-10">
            {t("landingPro.benefits.sectionTitle")}
          </h2>
          <div className="grid sm:grid-cols-2 md:grid-cols-3 gap-5">
            {BENEFICI.map(({ icon: Icon, key }) => (
              <Card key={key} className="border border-gray-100 shadow-sm hover:shadow-md transition-shadow">
                <CardContent className="p-5 space-y-3">
                  <div className="h-10 w-10 rounded-full bg-[#4a5e2a]/10 flex items-center justify-center">
                    <Icon className="h-5 w-5 text-[#4a5e2a]" />
                  </div>
                  <h3 className="font-semibold text-base">{t(`landingPro.benefits.${key}.title`)}</h3>
                  <p className="text-sm text-gray-500 leading-relaxed">{t(`landingPro.benefits.${key}.desc`)}</p>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      </section>

      {/* ── SOCIAL PROOF ── */}
      <section className="py-14 px-4 bg-[#4a5e2a] text-white">
        <div className="max-w-4xl mx-auto">
          <div className="grid sm:grid-cols-3 gap-8 text-center">
            <div>
              <div className="text-4xl font-bold">213</div>
              <div className="text-[#a8c060] text-sm mt-1">{t("landingPro.stats.professionals")}</div>
            </div>
            <div>
              <div className="text-4xl font-bold">5.0★</div>
              <div className="text-[#a8c060] text-sm mt-1">{t("landingPro.stats.rating")}</div>
            </div>
            <div>
              <div className="text-4xl font-bold">40d</div>
              <div className="text-[#a8c060] text-sm mt-1">{t("landingPro.stats.trial")}</div>
            </div>
          </div>
          <div className="mt-10 grid sm:grid-cols-3 gap-4">
            {TESTIMONIALS.map(({ key, stars }) => (
              <div key={key} className="bg-white/10 rounded-xl p-4 space-y-2">
                <div className="flex gap-0.5">
                  {Array.from({ length: stars }).map((_, i) => (
                    <Star key={i} className="h-4 w-4 fill-yellow-400 text-yellow-400" />
                  ))}
                </div>
                <p className="text-sm leading-relaxed">"{t(`landingPro.testimonials.${key}.text`)}"</p>
                <p className="text-xs text-[#a8c060] font-medium">{t(`landingPro.testimonials.${key}.author`)}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── CHECKLIST ── */}
      <section className="py-16 px-4">
        <div className="max-w-3xl mx-auto">
          <h2 className="text-2xl sm:text-3xl font-bold text-center mb-10">
            {t("landingPro.checklist.sectionTitle")}
          </h2>
          <div className="grid sm:grid-cols-2 gap-4">
            {CHECKLIST_KEYS.map((key) => (
              <div key={key} className="flex items-center gap-3">
                <CheckCircle2 className="h-5 w-5 text-[#4a5e2a] shrink-0" />
                <span className="text-sm text-gray-700">{t(`landingPro.checklist.items.${key}`)}</span>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── CTA CENTRALE ── */}
      <section className="py-14 px-4 bg-gradient-to-br from-[#4a5e2a]/10 via-white to-[#4a5e2a]/5">
        <div className="max-w-xl mx-auto text-center space-y-5">
          <div className="flex items-center justify-center gap-2 mb-2">
            <Lock className="h-4 w-4 text-[#4a5e2a]" />
            <Shield className="h-4 w-4 text-[#4a5e2a]" />
            <Smartphone className="h-4 w-4 text-[#4a5e2a]" />
          </div>
          <h2 className="text-2xl sm:text-3xl font-bold">{t("landingPro.cta.title")}</h2>
          <p className="text-gray-500 text-sm">
            {t("landingPro.cta.subtitle")}
          </p>
          <Button
            size="lg"
            className="bg-[#4a5e2a] hover:bg-[#3a4e1a] text-white text-base gap-2 rounded-full px-10 w-full sm:w-auto"
            onClick={goRegister}
          >
            {t("landingPro.cta.button")}
            <ArrowRight className="h-4 w-4" />
          </Button>
          <p className="text-xs text-gray-400">
            {t("landingPro.cta.note")}
          </p>
        </div>
      </section>

      {/* ── FAQ ── */}
      <section className="py-16 px-4 bg-gray-50">
        <div className="max-w-2xl mx-auto">
          <h2 className="text-2xl font-bold text-center mb-10">{t("landingPro.faq.sectionTitle")}</h2>
          <div className="space-y-4">
            {FAQ_KEYS.map((key) => (
              <div key={key} className="bg-white rounded-xl border border-gray-100 shadow-sm p-5">
                <h3 className="font-semibold text-sm mb-2">{t(`landingPro.faq.${key}.q`)}</h3>
                <p className="text-sm text-gray-500 leading-relaxed">{t(`landingPro.faq.${key}.a`)}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── FOOTER ── */}
      <footer className="py-8 px-4 border-t border-gray-100 text-center text-xs text-gray-400 space-y-2">
        <div className="flex items-center justify-center gap-2">
          <img src={fleurLogo} alt={t("landingPro.nav.brand")} className="h-6 w-6 rounded-full object-cover" />
          <span>{t("landingPro.footer.brand")}</span>
        </div>
        <div className="flex justify-center gap-4">
          <a href="/privacy" className="hover:text-gray-600 transition-colors">{t("landingPro.footer.privacy")}</a>
          <a href="/terms" className="hover:text-gray-600 transition-colors">{t("landingPro.footer.terms")}</a>
          <button onClick={goLogin} className="hover:text-gray-600 transition-colors">{t("landingPro.footer.login")}</button>
        </div>
        <p>{t("landingPro.footer.copyright", { year: new Date().getFullYear() })}</p>
      </footer>
    </div>
  );
}
