// @ts-nocheck
import { useEffect, useState } from "react";
import { Link, useLocation } from "wouter";
import { useTranslation } from 'react-i18next';
import { 
  CalendarDays, 
  Users, 
  BarChart,
  ArrowRight,
  FileText,
  Clock,
  Flower,
  MessageSquare,
  BookOpen
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { LanguageSelector } from "@/components/ui/language-selector";
import { apiRequest } from "@/lib/queryClient";
import { useUserWithLicense } from "@/hooks/use-user-with-license";
import FooterContactIcons from "@/components/FooterContactIcons";
import OnboardingBanner from "@/components/OnboardingBanner";
import ScrollDownHint from "@/components/ScrollDownHint";

function AppIcon() {
  const [iconUrl, setIconUrl] = useState<string>("");
  const [loading, setLoading] = useState(true);
  
  useEffect(() => {
    const fetchIconInfo = async () => {
      try {
        setLoading(true);
        console.log('🏠 HOME AppIcon: Starting icon load');
        const response = await apiRequest("GET", "/api/client-app-info");
        console.log('🏠 HOME AppIcon: Response received, status:', response.status);
        const data = await response.json();
        console.log('🏠 HOME AppIcon: Parsed data:', { 
          hasIcon: !!data.icon,
          iconLength: data.icon?.length,
          url: data.icon?.substring(0, 50) + '...'
        });
        if (data.icon) {
          setIconUrl(data.icon);
          console.log('✅ HOME AppIcon: Icon set correctly');
        } else {
          console.log('❌ HOME AppIcon: No icon in response');
        }
      } catch (error) {
        console.error("❌ HOME AppIcon: Error fetching icon information:", error);
      } finally {
        setLoading(false);
      }
    };
    fetchIconInfo();
  }, []);
  
  if (loading) {
    return <div className="w-full h-full flex items-center justify-center"><Clock className="w-8 h-8 animate-spin text-primary/50" /></div>;
  }
  if (!iconUrl) {
    return (
      <div className="w-full h-full flex items-center justify-center bg-muted">
        <Flower className="w-12 h-12 text-primary" />
      </div>
    );
  }
  return (
    <img 
      src={iconUrl}
      alt="Fleur de Vie" 
      className="w-full h-full object-cover rounded-full"
    />
  );
}

function CompanyName() {
  const { t } = useTranslation();
  const { user } = useUserWithLicense();
  const [settings, setSettings] = useState<{
    name: string;
    fontSize: number;
    fontFamily: string;
    fontStyle: string;
    color: string;
    enabled: boolean;
  } | null>(null);
  const [loading, setLoading] = useState(true);
  
  useEffect(() => {
    const fetchCompanyNameSettings = async () => {
      if (!user?.id) {
        setLoading(false);
        return;
      }
      try {
        setLoading(true);
        console.log(`🏢 FRONTEND CompanyName: Loading settings for user ${user.id}`);
        const response = await apiRequest("GET", "/api/company-name-settings");
        console.log(`🏢 FRONTEND CompanyName: API response status: ${response.status}`);
        if (response.ok) {
          const data = await response.json();
          console.log(`✅ FRONTEND CompanyName: Settings loaded:`, data);
          setSettings(data);
        } else if (response.status === 404) {
          setSettings(null);
        }
      } catch (error) {
        console.error("❌ FRONTEND CompanyName: Error loading:", error);
      } finally {
        setLoading(false);
      }
    };
    fetchCompanyNameSettings();
  }, [user?.id]);
  
  if (loading) return null;
  if (!settings || !settings.enabled || !settings.name) return null;
  
  const nameStyle = {
    fontSize: `${settings.fontSize}px`,
    fontFamily: settings.fontFamily,
    fontStyle: settings.fontStyle,
    color: settings.color,
    marginTop: '8px',
    textAlign: 'center' as const,
    maxWidth: '300px'
  };
  return <div style={nameStyle}>{settings.name}</div>;
}

function BetaBadge() {
  const [isBeta, setIsBeta] = useState(false);
  
  useEffect(() => {
    import('@/lib/betaUtils').then(({ isBetaTester }) => { setIsBeta(isBetaTester()); });
    const checkBetaStatus = () => {
      import('@/lib/betaUtils').then(({ isBetaTester }) => { setIsBeta(isBetaTester()); });
    };
    window.addEventListener('storage', checkBetaStatus);
    return () => window.removeEventListener('storage', checkBetaStatus);
  }, []);
  
  if (!isBeta) return null;
  return (
    <div className="absolute top-2 right-2 animate-pulse">
      <Link href="/beta" className="inline-block">
        <span className="px-2 py-1 bg-gradient-to-r from-indigo-500 to-purple-600 text-white text-xs font-semibold rounded-full shadow-lg hover:shadow-xl transition-shadow">
          Beta Tester
        </span>
      </Link>
    </div>
  );
}

const CARDS = [
  {
    key: "calendar",
    titleKey: "calendar.title",
    descKey: "calendar.description",
    subDescKey: "calendar.subDescription",
    btnKey: "calendar.goTo",
    route: "/calendar",
    icon: CalendarDays,
    bg: "bg-blue-50",
    iconBg: "bg-blue-100",
    iconColor: "text-blue-500",
    btnColor: "border-blue-200 text-blue-600 hover:bg-blue-50",
    accent: "bg-blue-400",
  },
  {
    key: "clients",
    titleKey: "clients.title",
    descKey: "clients.description",
    subDescKey: "clients.subDescription",
    btnKey: "clients.goTo",
    route: "/clients",
    icon: Users,
    bg: "bg-violet-50",
    iconBg: "bg-violet-100",
    iconColor: "text-violet-500",
    btnColor: "border-violet-200 text-violet-600 hover:bg-violet-50",
    accent: "bg-violet-400",
  },
  {
    key: "notifications",
    titleKey: "whatsappNotifications.title",
    descKey: "whatsappNotifications.description",
    subDescKey: "whatsappNotifications.subDescription",
    btnKey: "whatsappNotifications.goTo",
    route: "/notifications",
    icon: MessageSquare,
    bg: "bg-emerald-50",
    iconBg: "bg-emerald-100",
    iconColor: "text-emerald-500",
    btnColor: "border-emerald-200 text-emerald-600 hover:bg-emerald-50",
    accent: "bg-emerald-400",
  },
  {
    key: "invoices",
    titleKey: "invoices.title",
    descKey: "invoices.description",
    subDescKey: "invoices.subDescription",
    btnKey: "invoices.goTo",
    route: "/invoices",
    icon: FileText,
    bg: "bg-orange-50",
    iconBg: "bg-orange-100",
    iconColor: "text-orange-500",
    btnColor: "border-orange-200 text-orange-600 hover:bg-orange-50",
    accent: "bg-orange-400",
  },
  {
    key: "reports",
    titleKey: "reports.title",
    descKey: "reports.description",
    subDescKey: "reports.subDescription",
    btnKey: "reports.goTo",
    route: "/reports",
    icon: BarChart,
    bg: "bg-pink-50",
    iconBg: "bg-pink-100",
    iconColor: "text-pink-500",
    btnColor: "border-pink-200 text-pink-600 hover:bg-pink-50",
    accent: "bg-pink-400",
  },
  {
    key: "manual",
    titleKey: "home.manual.title",
    titleFallback: "Manuale",
    descKey: "home.manual.description",
    descFallback: "Guida completa all'uso",
    subDescKey: "home.manual.content",
    subDescFallback: "Consulta il manuale d'uso con screenshot e video tutorial per ogni funzionalità del gestionale",
    btnKey: "home.manual.button",
    btnFallback: "Vai al Manuale",
    route: "/manuale",
    icon: BookOpen,
    bg: "bg-teal-50",
    iconBg: "bg-teal-100",
    iconColor: "text-teal-500",
    btnColor: "border-teal-200 text-teal-600 hover:bg-teal-50",
    accent: "bg-teal-400",
    testId: "card-manual",
    btnTestId: "button-go-to-manual",
  },
];

export default function Home() {
  const [_, navigate] = useLocation();
  const { t } = useTranslation();
  const { user } = useUserWithLicense();
  const [onboardingDismissed, setOnboardingDismissed] = useState(false);

  const showOnboardingBanner =
    !!user &&
    user.type !== 'client' &&
    !user.hideWelcomeGuide &&
    !onboardingDismissed;

  return (
    <div className="space-y-6 relative">
      {showOnboardingBanner && (
        <OnboardingBanner onDismiss={() => setOnboardingDismissed(true)} />
      )}
      <ScrollDownHint />
      <BetaBadge />

      {/* Hero section */}
      <div className="text-center py-8">
        <div className="flex flex-col items-center mb-5">
          <div className="w-28 h-28 rounded-full shadow-lg bg-white border-4 border-white ring-4 ring-primary/10 flex items-center justify-center overflow-hidden icon-rotate">
            <AppIcon />
          </div>
          <CompanyName />
        </div>
        <h1 className="text-3xl font-bold mb-2 text-gray-800">
          {t('app.welcome')}
        </h1>
        <p className="text-gray-400 text-sm">
          {t('app.description')}
        </p>
      </div>

      {/* Cards grid — 2 col mobile · 2 col tablet · 3 col desktop (2×3 = symmetric) */}
      <div className="grid grid-cols-2 lg:grid-cols-3 gap-3 sm:gap-5">
        {CARDS.map((card) => {
          const Icon = card.icon;
          return (
            <div
              key={card.key}
              data-testid={card.testId}
              className={`rounded-2xl overflow-hidden shadow-sm border border-white/80 ${card.bg} flex flex-col transition-all duration-200 hover:shadow-md hover:-translate-y-0.5 cursor-pointer`}
              onClick={() => navigate(card.route)}
            >
              {/* Colored top accent bar */}
              <div className={`h-1.5 w-full ${card.accent} opacity-60`} />

              <div className="p-3 sm:p-5 flex flex-col flex-1">
                {/* Icon + title row */}
                <div className="flex items-start gap-2 sm:gap-3 mb-2 sm:mb-3">
                  <div className={`w-9 h-9 sm:w-10 sm:h-10 rounded-xl ${card.iconBg} flex items-center justify-center flex-shrink-0`}>
                    <Icon className={`w-4 h-4 sm:w-5 sm:h-5 ${card.iconColor}`} />
                  </div>
                  <div>
                    <h2 className="font-semibold text-gray-800 text-sm sm:text-base leading-tight">
                      {t(card.titleKey, card.titleFallback)}
                    </h2>
                    <p className={`text-xs ${card.iconColor} opacity-80 font-medium mt-0.5 hidden sm:block`}>
                      {t(card.descKey, card.descFallback)}
                    </p>
                  </div>
                </div>

                {/* Description — hidden on mobile, visible on sm+ */}
                <p className="text-gray-500 text-sm flex-1 leading-relaxed hidden sm:block">
                  {t(card.subDescKey, card.subDescFallback)}
                </p>

                {/* CTA button */}
                <button
                  data-testid={card.btnTestId}
                  onClick={(e) => { e.stopPropagation(); navigate(card.route); }}
                  className={`mt-3 sm:mt-4 w-full flex items-center justify-center gap-1 sm:gap-2 py-1.5 sm:py-2 px-2 sm:px-4 rounded-xl border text-xs sm:text-sm font-medium transition-colors ${card.btnColor}`}
                >
                  <span className="truncate">{t(card.btnKey, card.btnFallback)}</span>
                  <ArrowRight className="w-3 h-3 sm:w-4 sm:h-4 flex-shrink-0" />
                </button>
              </div>
            </div>
          );
        })}
      </div>

      {/* Footer contact icons */}
      <div className="mt-10">
        <FooterContactIcons ownerId={user?.id} />
      </div>

      {/* Legal footer */}
      <div className="mt-6 pt-6 border-t border-gray-100">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 text-sm text-gray-400">
          <div>
            <h3 className="font-semibold text-gray-600 mb-2">{t('homeFooter.systemInfo')}</h3>
            <p>{t('homeFooter.appVersion')}</p>
            <p>{t('homeFooter.copyright')}</p>
            <p>{t('homeFooter.allRightsReserved')}</p>
          </div>
          <div>
            <h3 className="font-semibold text-gray-600 mb-2">{t('homeFooter.privacySecurity')}</h3>
            <p>{t('homeFooter.technicalSupport')} zambelli.andrea.1973@gmail.com</p>
            <Link to="/privacy">
              <button className="text-primary hover:underline mt-1 block">
                {t('homeFooter.privacyPolicy')}
              </button>
            </Link>
            <button
              className="text-primary hover:underline mt-1"
              onClick={() => navigate('/terms')}
            >
              {t('homeFooter.termsOfService')}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
