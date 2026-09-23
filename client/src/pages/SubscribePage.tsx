import { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useLocation } from 'wouter';
import { useAuth } from '@/hooks/use-auth';
import { useLicense, LicenseType } from '@/hooks/use-license';
import { useUserWithLicense } from '@/hooks/use-user-with-license';
import {
  CalendarRange,
  Users,
  FileSpreadsheet,
  BellRing,
  AlertCircle,
  Crown,
} from 'lucide-react';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { useToast } from '@/hooks/use-toast';
import SubscriptionPlansPanel from '@/components/SubscriptionPlansPanel';
import { useQuery } from '@tanstack/react-query';
import { apiRequest } from '@/lib/queryClient';

export default function SubscribePage() {
  const { t } = useTranslation();
  const { toast } = useToast();
  const [, setLocation] = useLocation();
  const { isAuthenticated, isLoading } = useAuth();
  const { licenseInfo } = useLicense();
  const { user: userWithLicense, isLoading: userLoading } = useUserWithLicense();
  const offerToken = typeof window !== 'undefined'
    ? new URLSearchParams(window.location.search).get('offer')
    : null;
  const [now, setNow] = useState(Date.now());
  const { data: recoveryOffer } = useQuery({
    queryKey: ['/api/trial-recovery/validate', offerToken],
    queryFn: async () => {
      const res = await apiRequest('GET', `/api/trial-recovery/validate?offer=${encodeURIComponent(offerToken || '')}`);
      return res.json();
    },
    enabled: !!offerToken && offerToken !== 'expired' && isAuthenticated,
    retry: false,
  });

  useEffect(() => {
    if (!recoveryOffer?.expiresAt) return;
    const timer = window.setInterval(() => setNow(Date.now()), 1000);
    return () => window.clearInterval(timer);
  }, [recoveryOffer?.expiresAt]);
  const remainingMs = recoveryOffer?.expiresAt
    ? Math.max(0, new Date(recoveryOffer.expiresAt).getTime() - now)
    : 0;
  const remaining = {
    days: Math.floor(remainingMs / 86400000),
    hours: Math.floor((remainingMs % 86400000) / 3600000),
    minutes: Math.floor((remainingMs % 3600000) / 60000),
    seconds: Math.floor((remainingMs % 60000) / 1000),
  };

  const isTrialExpired =
    typeof window !== 'undefined' &&
    new URLSearchParams(window.location.search).get('expired') === 'true' &&
    licenseInfo?.type === LicenseType.TRIAL;

  useEffect(() => {
    if (!isLoading && !isAuthenticated) {
      const currentUrl = window.location.pathname + window.location.search;
      sessionStorage.setItem('redirectAfterLogin', currentUrl);
      toast({
        title: t('subscribe.loginRequiredTitle'),
        description: t('subscribe.loginRequired'),
        variant: 'destructive',
      });
      setLocation('/');
    }
  }, [isAuthenticated, isLoading, setLocation, toast]);

  useEffect(() => {
    if (!isLoading && !userLoading && isAuthenticated && userWithLicense) {
      const type = userWithLicense.type;
      const role = (userWithLicense as any).role;
      const isStaffOrAdmin =
        type === 'staff' || type === 'admin' ||
        role === 'staff' || role === 'admin' || role === 'ev_staff' || role === 'ev_admin';
      if (isStaffOrAdmin) {
        setLocation('/dashboard');
      }
    }
  }, [isAuthenticated, isLoading, userLoading, userWithLicense, setLocation]);

  const keyFeatures = [
    {
      icon: <CalendarRange className="h-10 w-10 text-primary" />,
      title: t('subscribe.features.scheduling.title'),
      description: t('subscribe.features.scheduling.description'),
    },
    {
      icon: <Users className="h-10 w-10 text-primary" />,
      title: t('subscribe.features.clients.title'),
      description: t('subscribe.features.clients.description'),
    },
    {
      icon: <BellRing className="h-10 w-10 text-primary" />,
      title: t('subscribe.features.notifications.title'),
      description: t('subscribe.features.notifications.description'),
    },
    {
      icon: <FileSpreadsheet className="h-10 w-10 text-primary" />,
      title: t('subscribe.features.reports.title'),
      description: t('subscribe.features.reports.description'),
    },
  ];

  return (
    <div className="container py-10">
      {/* Hero */}
      <div className="text-center mb-16">
        <h1 className="text-4xl font-bold tracking-tight mb-6">
          {t('subscribe.title')}
        </h1>
        <p className="text-lg text-muted-foreground max-w-3xl mx-auto mb-12">
          {t('subscribe.subtitle')}
        </p>

        {/* Trial Expired Warning */}
        {recoveryOffer?.success && (
          <Alert className="max-w-3xl mx-auto mb-8 border-purple-300 bg-purple-50">
            <Crown className="h-5 w-5 text-purple-700" />
            <AlertDescription className="text-purple-950">
              <p className="text-xl font-bold">Offerta personale: 50% sul primo anno</p>
              <p className="mt-2">Valida su tutti i piani annuali ancora per:</p>
              <p className="mt-2 font-mono text-2xl font-bold">
                {remaining.days}g {remaining.hours}h {remaining.minutes}m {remaining.seconds}s
              </p>
            </AlertDescription>
          </Alert>
        )}
        {offerToken === 'expired' && (
          <Alert className="max-w-3xl mx-auto mb-8 bg-red-50 border-red-300">
            <AlertCircle className="h-5 w-5 text-red-600" />
            <AlertDescription className="text-red-800">Questa offerta non è valida oppure è scaduta.</AlertDescription>
          </Alert>
        )}
        {isTrialExpired && (
          <Alert className="max-w-3xl mx-auto mb-8 bg-red-50 border-red-300" data-testid="alert-trial-expired">
            <AlertCircle className="h-5 w-5 text-red-600" />
            <AlertDescription className="text-red-800">
              <p className="font-semibold text-red-900 text-lg mb-2">{t('subscribe.trialExpiredTitle')}</p>
              <p className="mb-3">{t('subscribe.trialExpiredBody')}</p>
              <p className="font-medium">{t('subscribe.trialExpiredSafe')}</p>
            </AlertDescription>
          </Alert>
        )}

        {/* Key features grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8 mt-16">
          {keyFeatures.map((feature, index) => (
            <div key={index} className="flex flex-col items-center text-center p-4">
              <div className="mb-4">{feature.icon}</div>
              <h3 className="text-xl font-semibold mb-2">{feature.title}</h3>
              <p className="text-muted-foreground">{feature.description}</p>
            </div>
          ))}
        </div>
      </div>

      {/* Pricing Section — rendered via shared SubscriptionPlansPanel */}
      <div>
        <h2 className="text-3xl font-bold text-center mb-10 flex items-center justify-center">
          <Crown className="mr-2 h-8 w-8 text-amber-500" />
          {t('subscribe.pricingTitle')}
        </h2>

        <SubscriptionPlansPanel />
      </div>

      {/* FAQ */}
      <div className="mt-20 max-w-3xl mx-auto text-center">
        <h2 className="text-2xl font-bold mb-6">{t('subscribe.faq.title')}</h2>
        <div className="text-left space-y-6">
          <div>
            <h3 className="text-lg font-medium mb-2">{t('subscribe.faq.q1')}</h3>
            <p className="text-muted-foreground">{t('subscribe.faq.a1')}</p>
          </div>
          <div>
            <h3 className="text-lg font-medium mb-2">{t('subscribe.faq.q2')}</h3>
            <p className="text-muted-foreground">{t('subscribe.faq.a2')}</p>
          </div>
          <div>
            <h3 className="text-lg font-medium mb-2">{t('subscribe.faq.q3')}</h3>
            <p className="text-muted-foreground">{t('subscribe.faq.a3')}</p>
          </div>
        </div>
      </div>
    </div>
  );
}
