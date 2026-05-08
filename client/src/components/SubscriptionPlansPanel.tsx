import { useState } from 'react';
import { useTranslation, type TFunction } from 'react-i18next';
import { useLocation } from 'wouter';
import {
  Check,
  Crown,
  CreditCard,
  Star,
  CalendarClock,
  Users,
  AlertCircle,
  Loader2,
  ArrowRight,
  Wallet,
  Copy,
  ExternalLink,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { useLicense, LicenseType } from '@/hooks/use-license';
import { useToast } from '@/hooks/use-toast';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Checkbox } from '@/components/ui/checkbox';
import { Label } from '@/components/ui/label';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Separator } from '@/components/ui/separator';
import { useMutation, useQuery } from '@tanstack/react-query';
import { apiRequest } from '@/lib/queryClient';
import { useCurrency } from '@/hooks/use-currency';
import { useAuth } from '@/hooks/use-auth';

interface PlanFeature {
  key?: string;
  name: string;
  included: boolean;
}

interface Plan {
  id: string;
  type: LicenseType;
  name: string;
  description: string;
  price: number;
  priceLabel: string;
  features: PlanFeature[];
  popular?: boolean;
  buttonVariant?: 'default' | 'outline' | 'secondary';
}

interface ServerPlan {
  id: string | number;
  name: string;
  description?: string;
  price: number;
  interval?: 'month' | 'year';
  features?: string | PlanFeature[];
  active?: boolean;
}

interface PaymentMethod {
  id: string;
  publicConfig?: { recipient?: string; iban?: string; notes?: string };
}

const LEGACY_NAME_TO_SLUG: Record<string, string> = {
  'Appointment calendar': 'calendar',
  'Client management': 'clients',
  'QR/PWA app for clients': 'qrPwa',
  'Client appointment requests': 'appointmentRequests',
  'Client notifications': 'notifications',
  'Invoice generation': 'invoices',
  'Google Calendar sync': 'googleCalendar',
  'Reports and statistics': 'reports',
  'Promotional packages': 'packages',
  'Multi-staff management': 'multiStaff',
  'Product inventory': 'inventory',
  'AI Marketing campaigns': 'marketingAI',
  'Calendario appuntamenti': 'calendar',
  'Gestione appuntamenti': 'calendar',
  'Gestione appuntamenti base': 'calendar',
  'Gestione clienti': 'clients',
  'App QR/PWA per clienti': 'qrPwa',
  'PWA area clienti scaricabile': 'qrPwa',
  'Richiesta appuntamenti cliente': 'appointmentRequests',
  'Notifiche clienti': 'notifications',
  'Notifiche ai clienti': 'notifications',
  'Notifiche email': 'notifications',
  'Emissione fatture': 'invoices',
  'Gestione fatture': 'invoices',
  'Sincronizzazione Google Calendar': 'googleCalendar',
  'Integrazione Google Calendar': 'googleCalendar',
  'Integrazione calendario': 'googleCalendar',
  'Report e statistiche': 'reports',
  'Report dettagliati': 'reports',
  'Report avanzati': 'reports',
  'Pacchetti promozionali': 'packages',
  'Gestione piu dipendenti': 'multiStaff',
  'Gestione più dipendenti': 'multiStaff',
  'Supporto per più operatori': 'multiStaff',
  'Magazzino prodotti': 'inventory',
  'Campagne Marketing AI': 'marketingAI',
};

const translateFeatureName = (featureKey: string | undefined, featureName: string, t: TFunction): string => {
  const slug = featureKey || LEGACY_NAME_TO_SLUG[featureName];
  if (slug) {
    const translated = t(`planFeatures.${slug}`);
    if (translated && translated !== `planFeatures.${slug}`) return translated;
  }
  const fallbackSlug = LEGACY_NAME_TO_SLUG[featureName];
  if (fallbackSlug) {
    const translated = t(`planFeatures.${fallbackSlug}`);
    if (translated && translated !== `planFeatures.${fallbackSlug}`) return translated;
  }
  return t('planFeatures.unknownFeature', 'Feature');
};

export default function SubscriptionPlansPanel() {
  const { t } = useTranslation();
  const { licenseInfo, activateLicense } = useLicense();
  const { toast } = useToast();
  const [location, setLocation] = useLocation();
  const { user, isAuthenticated } = useAuth();
  const isOnSubscribePage = location === '/subscribe';
  const { symbol } = useCurrency();
  const [paymentMethod, setPaymentMethod] = useState<'credit-card' | 'paypal' | 'bank'>('credit-card');
  const [isProcessing, setIsProcessing] = useState(false);
  const [showActivationDialog, setShowActivationDialog] = useState(false);
  const [activationCode, setActivationCode] = useState('');
  const [selectedPlanId, setSelectedPlanId] = useState<string | null>(null);
  const [acceptTerms, setAcceptTerms] = useState(false);
  const [showBankTransferInfo, setShowBankTransferInfo] = useState(false);
  const [bankTransferInfo, setBankTransferInfo] = useState<{
    bankInfo: { recipient?: string; iban?: string; notes?: string };
    planId: string;
  } | null>(null);

  const { data: serverPlans, isLoading: isLoadingPlans } = useQuery({
    queryKey: ['/api/payments/plans'],
    queryFn: async () => {
      const res = await apiRequest('GET', '/api/payments/plans');
      return await res.json();
    },
    staleTime: 5 * 60 * 1000,
    refetchOnWindowFocus: false,
  });

  const { data: subscriptionInfo, isLoading: isLoadingSubscription } = useQuery({
    queryKey: ['/api/payments/subscription'],
    queryFn: async () => {
      const res = await apiRequest('GET', '/api/payments/subscription');
      return await res.json();
    },
    staleTime: 5 * 60 * 1000,
    refetchOnWindowFocus: false,
  });

  const fallbackPlans: Plan[] = [
    {
      id: 'trial',
      type: LicenseType.TRIAL,
      name: t('plans.trial.name'),
      description: t('plans.trial.description'),
      price: 0,
      priceLabel: t('plans.trial.price'),
      buttonVariant: 'outline',
      features: [
        { key: 'calendar', name: 'calendar', included: true },
        { key: 'clients', name: 'clients', included: true },
        { key: 'qrPwa', name: 'qrPwa', included: true },
        { key: 'appointmentRequests', name: 'appointmentRequests', included: true },
        { key: 'notifications', name: 'notifications', included: true },
        { key: 'invoices', name: 'invoices', included: true },
        { key: 'reports', name: 'reports', included: false },
        { key: 'googleCalendar', name: 'googleCalendar', included: false },
        { key: 'packages', name: 'packages', included: false },
        { key: 'marketingAI', name: 'marketingAI', included: false },
      ],
    },
    {
      id: '1',
      type: LicenseType.BASE,
      name: t('plans.base.name'),
      description: t('plans.base.description'),
      price: 5.99,
      priceLabel: t('plans.base.priceLabel'),
      buttonVariant: 'outline',
      features: [
        { key: 'calendar', name: 'calendar', included: true },
        { key: 'clients', name: 'clients', included: true },
        { key: 'qrPwa', name: 'qrPwa', included: true },
        { key: 'appointmentRequests', name: 'appointmentRequests', included: true },
        { key: 'notifications', name: 'notifications', included: true },
        { key: 'invoices', name: 'invoices', included: true },
        { key: 'reports', name: 'reports', included: false },
        { key: 'googleCalendar', name: 'googleCalendar', included: false },
        { key: 'packages', name: 'packages', included: false },
        { key: 'marketingAI', name: 'marketingAI', included: false },
      ],
    },
    {
      id: '2',
      type: LicenseType.PRO,
      name: t('plans.pro.name'),
      description: t('plans.pro.description'),
      price: 9.99,
      priceLabel: t('plans.pro.priceLabel'),
      popular: true,
      buttonVariant: 'default',
      features: [
        { key: 'calendar', name: 'calendar', included: true },
        { key: 'clients', name: 'clients', included: true },
        { key: 'qrPwa', name: 'qrPwa', included: true },
        { key: 'appointmentRequests', name: 'appointmentRequests', included: true },
        { key: 'notifications', name: 'notifications', included: true },
        { key: 'invoices', name: 'invoices', included: true },
        { key: 'googleCalendar', name: 'googleCalendar', included: true },
        { key: 'reports', name: 'reports', included: true },
        { key: 'packages', name: 'packages', included: true },
        { key: 'multiStaff', name: 'multiStaff', included: false },
        { key: 'inventory', name: 'inventory', included: false },
        { key: 'marketingAI', name: 'marketingAI', included: false },
      ],
    },
    {
      id: '3',
      type: LicenseType.BUSINESS,
      name: t('plans.business.name'),
      description: t('plans.business.description'),
      price: 19.99,
      priceLabel: t('plans.business.priceLabel'),
      buttonVariant: 'outline',
      features: [
        { key: 'calendar', name: 'calendar', included: true },
        { key: 'clients', name: 'clients', included: true },
        { key: 'qrPwa', name: 'qrPwa', included: true },
        { key: 'appointmentRequests', name: 'appointmentRequests', included: true },
        { key: 'notifications', name: 'notifications', included: true },
        { key: 'invoices', name: 'invoices', included: true },
        { key: 'googleCalendar', name: 'googleCalendar', included: true },
        { key: 'reports', name: 'reports', included: true },
        { key: 'packages', name: 'packages', included: true },
        { key: 'multiStaff', name: 'multiStaff', included: true },
        { key: 'inventory', name: 'inventory', included: true },
        { key: 'marketingAI', name: 'marketingAI', included: true },
      ],
    },
  ];

  const plans: Plan[] = serverPlans?.length
    ? serverPlans.map((plan: ServerPlan) => {
        let features: PlanFeature[] = [];
        try {
          if (plan.features) {
            features = typeof plan.features === 'string'
              ? JSON.parse(plan.features)
              : (plan.features as PlanFeature[]);
          }
        } catch {
          features = [];
        }
        const planType = plan.name.toLowerCase().includes('pro')
          ? LicenseType.PRO
          : plan.name.toLowerCase().includes('business')
            ? LicenseType.BUSINESS
            : LicenseType.BASE;

        type RawFeature = { key?: unknown; name?: unknown; included?: unknown } | string;
        const normalizedFeatures: PlanFeature[] = Array.isArray(features) && features.length > 0
          ? features.map((f: RawFeature) => {
              if (typeof f === 'object' && f !== null) {
                if (f.key !== undefined) return { key: String(f.key), name: String(f.key), included: (f.included as boolean) ?? true };
                if (f.name !== undefined) return { name: String(f.name), included: (f.included as boolean) ?? true };
              }
              return { name: String(f), included: true };
            })
          : fallbackPlans.find(p => p.type === planType)?.features || [];

        const fallbackForType = fallbackPlans.find(p => p.type === planType);
        return {
          id: String(plan.id),
          type: planType,
          name: plan.name,
          description: plan.description || fallbackForType?.description || '',
          price: plan.price / 100,
          priceLabel: `€${(plan.price / 100).toFixed(2).replace('.', ',')}/${plan.interval === 'year' ? t('plans.intervalYear') : t('plans.intervalMonth')}`,
          popular: plan.name.toLowerCase().includes('pro'),
          buttonVariant: plan.name.toLowerCase().includes('pro') ? 'default' : 'outline' as 'default' | 'outline',
          features: normalizedFeatures,
        };
      })
    : fallbackPlans;

  const startPaypalSubscription = useMutation({
    mutationFn: async (planId: string) => {
      const res = await apiRequest('POST', '/api/payments/paypal/subscribe', { planId });
      return await res.json();
    },
    onSuccess: (data) => {
      if (data.success && data.url) {
        toast({ title: t('subscribe.redirectingPaypalTitle'), description: t('subscribe.redirectingPaypal') });
        setTimeout(() => { window.location.href = data.url; }, 500);
      } else {
        toast({ title: t('subscribe.paypalError'), description: data.message || t('subscribe.paypalStartFailed'), variant: 'destructive' });
      }
    },
    onError: (error: Error) => {
      toast({ title: t('subscribe.paypalError'), description: error.message || t('subscribe.genericError'), variant: 'destructive' });
    },
  });

  const startStripeSubscription = useMutation({
    mutationFn: async (planId: string) => {
      const res = await apiRequest('POST', '/api/payments/stripe/create-checkout-session', { planId });
      return await res.json();
    },
    onSuccess: (data) => {
      if (data.success && data.url) {
        toast({ title: t('subscribe.redirectingStripeTitle'), description: t('subscribe.redirectingSecure') });
        window.location.href = data.url;
      } else {
        toast({ title: t('subscribe.stripeError'), description: data.message || t('subscribe.stripeStartFailed'), variant: 'destructive' });
      }
    },
    onError: (error: Error) => {
      toast({ title: t('subscribe.stripeError'), description: error.message || t('subscribe.genericError'), variant: 'destructive' });
    },
  });

  const getBankTransferInfo = useMutation({
    mutationFn: async (planId: string) => {
      const res = await apiRequest('GET', '/api/payments/methods');
      const methods = await res.json();
      const bankMethod = methods.find((m: PaymentMethod) => m.id === 'bank');
      return { bankInfo: bankMethod?.publicConfig || {}, planId };
    },
    onSuccess: (data) => { setBankTransferInfo(data); setShowBankTransferInfo(true); },
    onError: () => {
      toast({ title: t('common.error'), description: t('subscribe.bankInfoFailed'), variant: 'destructive' });
    },
  });

  const handlePayment = (planId: string) => {
    setSelectedPlanId(planId);
    if (paymentMethod === 'paypal') {
      startPaypalSubscription.mutate(planId);
    } else if (paymentMethod === 'credit-card') {
      startStripeSubscription.mutate(planId);
    } else if (paymentMethod === 'bank') {
      getBankTransferInfo.mutate(planId);
    } else {
      setShowActivationDialog(true);
    }
  };

  const handleActivateCode = async () => {
    if (!activationCode.trim()) {
      toast({ title: t('subscribe.missingCode'), description: t('subscribe.invalidActivation'), variant: 'destructive' });
      return;
    }
    try {
      setIsProcessing(true);
      await activateLicense(activationCode.replace(/\s/g, ''));
      setShowActivationDialog(false);
      setActivationCode('');
      toast({ title: t('subscribe.licenseActivated'), description: t('subscribe.licenseActivatedDesc') });
    } catch (error: unknown) {
      const msg = error instanceof Error ? error.message : t('subscribe.genericError');
      toast({ title: t('common.error'), description: msg, variant: 'destructive' });
    } finally {
      setIsProcessing(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Link alla pagina completa — nascosto se già su /subscribe */}
      {!isOnSubscribePage && (
        <div className="flex justify-end">
          <Button
            variant="outline"
            size="sm"
            onClick={() => setLocation('/subscribe')}
            className="gap-2"
          >
            <ExternalLink className="h-4 w-4" />
            {t('settingsPage.openSubscribePage', 'Apri pagina abbonamenti')}
          </Button>
        </div>
      )}

      {/* Stato abbonamento attivo */}
      {subscriptionInfo?.status === 'active' && (
        <Alert className="bg-green-50 border-green-200">
          <Check className="h-4 w-4 text-green-500" />
          <AlertTitle className="text-green-800">{t('subscribe.activeSubscription')}</AlertTitle>
          <AlertDescription className="text-green-700">
            {subscriptionInfo.plan ? (
              <>
                {t('subscribe.currentPlan')}: <strong>{subscriptionInfo.plan.name}</strong>
                {subscriptionInfo.expiresAt && (
                  <span className="ml-2">· {t('subscribe.expiresAt')}: <strong>{new Date(subscriptionInfo.expiresAt).toLocaleDateString()}</strong></span>
                )}
              </>
            ) : (
              <>{t('subscribe.trialActive')}: <strong>{new Date(licenseInfo?.expiresAt || '').toLocaleDateString()}</strong></>
            )}
          </AlertDescription>
        </Alert>
      )}

      {isLoadingPlans || isLoadingSubscription ? (
        <div className="flex justify-center items-center py-12">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
          <span className="ml-2 text-muted-foreground">{t('common.loading')}</span>
        </div>
      ) : (
        <>
          {/* Selettore metodo di pagamento */}
          <Tabs
            defaultValue="credit-card"
            className="max-w-md"
            onValueChange={(value) => {
              if (value === 'credit-card' || value === 'paypal' || value === 'bank') {
                setPaymentMethod(value as 'credit-card' | 'paypal' | 'bank');
              }
            }}
          >
            <TabsList className="grid w-full grid-cols-3">
              <TabsTrigger value="credit-card" className="flex items-center gap-1">
                <CreditCard className="h-4 w-4" />
                {t('subscribe.paymentMethods.card')}
              </TabsTrigger>
              <TabsTrigger value="paypal" className="flex items-center gap-1">
                <svg className="h-4 w-4" viewBox="0 0 24 24" fill="currentColor">
                  <path d="M7.076 21.337H2.47a.641.641 0 0 1-.633-.74L4.944.901C5.026.382 5.474 0 5.998 0h7.46c2.57 0 4.578.543 5.69 1.81 1.01 1.15 1.304 2.42 1.012 4.287-.023.143-.047.288-.077.437-.983 5.05-4.349 6.797-8.647 6.797h-2.19c-.524 0-.968.382-1.05.9l-1.12 7.106zm14.146-14.42a3.35 3.35 0 0 0-.607-.541c-.013.076-.026.175-.041.254-.59 3.003-2.598 6.726-8.674 6.726h-2.19c-1.279 0-2.385.945-2.585 2.22v.03l-.956 6.05h4.433c.48 0 .888-.348.965-.82l.04-.225.764-4.82.05-.264c.076-.472.485-.82.965-.82h.608c3.938 0 7.014-1.6 7.913-6.228.37-1.92.18-3.521-.685-4.562z" />
                </svg>
                PayPal
              </TabsTrigger>
              <TabsTrigger value="bank" className="flex items-center gap-1">
                <Wallet className="h-4 w-4" />
                {t('subscribe.paymentMethods.bank')}
              </TabsTrigger>
            </TabsList>
            <div className="text-xs text-muted-foreground mt-2 flex items-center gap-1">
              <AlertCircle className="h-3 w-3 text-amber-500" />
              {t('subscribe.paymentSecurity')}
            </div>
          </Tabs>

          {/* Schede piani */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            {plans.map((plan: Plan) => {
              const isCurrentPlan =
                String(subscriptionInfo?.plan?.id) === String(plan.id) ||
                (plan.type === LicenseType.TRIAL && licenseInfo?.type === LicenseType.TRIAL);

              return (
                <Card
                  key={plan.id}
                  className={`flex flex-col h-full relative ${plan.popular ? 'border-primary shadow-md' : ''} ${isCurrentPlan ? 'border-green-500 bg-green-50/30' : ''}`}
                >
                  {plan.popular && (
                    <div className="absolute top-0 right-0 transform translate-x-2 -translate-y-2">
                      <span className="bg-amber-500 text-white text-xs py-1 px-3 rounded-full font-medium">
                        {t('subscribe.popular')}
                      </span>
                    </div>
                  )}
                  {isCurrentPlan && (
                    <div className="absolute top-0 left-0 transform -translate-x-2 -translate-y-2">
                      <span className="bg-green-500 text-white text-xs py-1 px-3 rounded-full font-medium">
                        {t('subscribe.currentPlan')}
                      </span>
                    </div>
                  )}

                  <CardHeader className="pb-4">
                    <CardTitle className="flex items-center text-base">
                      {plan.type === LicenseType.PRO ? (
                        <Crown className="h-4 w-4 mr-2 text-amber-500" />
                      ) : plan.type === LicenseType.BUSINESS ? (
                        <Users className="h-4 w-4 mr-2 text-purple-500" />
                      ) : plan.type === LicenseType.BASE ? (
                        <Star className="h-4 w-4 mr-2 text-blue-500" />
                      ) : (
                        <CalendarClock className="h-4 w-4 mr-2 text-green-500" />
                      )}
                      {plan.name}
                    </CardTitle>
                    <CardDescription className="text-xs">{plan.description}</CardDescription>
                  </CardHeader>

                  <CardContent className="flex-grow pt-0">
                    <div className="mb-4">
                      <span className="text-2xl font-bold">{plan.priceLabel}</span>
                      <span className="block text-xs text-muted-foreground">
                        {plan.type === LicenseType.TRIAL ? t('subscribe.for40Days') : t('subscribe.annualSub')}
                      </span>
                    </div>
                    <ul className="space-y-1.5">
                      {plan.features.flatMap((feature: PlanFeature, fi: number) => {
                        const name = translateFeatureName(feature.key, feature.name, t);
                        return name
                          .split(/[,;.\-]/)
                          .map(item => item.trim())
                          .filter(item => item.length > 0)
                          .map((item, ii) => (
                            <li key={`${fi}-${ii}`} className="flex items-start text-sm">
                              <div className={`rounded-full p-0.5 mr-2 flex-shrink-0 ${feature.included ? 'text-green-500' : 'text-gray-300'}`}>
                                {feature.included ? <Check className="h-3.5 w-3.5" /> : <span className="block h-3.5 w-3.5 text-center leading-none">-</span>}
                              </div>
                              <span className={feature.included ? '' : 'text-gray-400'}>{item}</span>
                            </li>
                          ));
                      })}
                    </ul>
                  </CardContent>

                  <CardFooter>
                    <Button
                      variant={isCurrentPlan ? 'outline' : plan.buttonVariant}
                      className={`w-full ${isCurrentPlan ? 'border-green-500 text-green-700 hover:bg-green-50' : ''}`}
                      onClick={() => !isCurrentPlan && handlePayment(plan.id)}
                      disabled={isCurrentPlan || plan.type === LicenseType.TRIAL || plan.id === 'trial' || !isAuthenticated}
                      size="sm"
                    >
                      {isCurrentPlan ? (
                        <span className="flex items-center justify-center">
                          <Check className="h-4 w-4 mr-1" /> {t('subscribe.active')}
                        </span>
                      ) : plan.type === LicenseType.TRIAL || plan.id === 'trial' ? (
                        t('subscribe.startTrial')
                      ) : (
                        <span className="flex items-center justify-center">
                          {startStripeSubscription.isPending || startPaypalSubscription.isPending
                            ? <Loader2 className="h-4 w-4 mr-1 animate-spin" />
                            : <ArrowRight className="h-4 w-4 mr-1" />}
                          {t('subscribe.subscribe')}
                        </span>
                      )}
                    </Button>
                  </CardFooter>
                </Card>
              );
            })}
          </div>
        </>
      )}

      {/* Dialog attivazione codice */}
      <Dialog open={showActivationDialog} onOpenChange={setShowActivationDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{t('subscribe.activateCode')}</DialogTitle>
            <DialogDescription>{t('subscribe.activateCodeDescription')}</DialogDescription>
          </DialogHeader>
          <div className="grid gap-4 py-4">
            <div className="grid gap-2">
              <Label htmlFor="activationCodePanel">{t('subscribe.code')}</Label>
              <Input
                id="activationCodePanel"
                value={activationCode}
                onChange={(e) => {
                  const raw = e.target.value.replace(/\s/g, '');
                  if (raw.length > 16) return;
                  let formatted = '';
                  for (let i = 0; i < raw.length; i++) {
                    if (i > 0 && i % 4 === 0) formatted += ' ';
                    formatted += raw[i];
                  }
                  setActivationCode(formatted);
                }}
                placeholder="XXXX XXXX XXXX XXXX"
              />
            </div>
            <div className="flex items-center space-x-2">
              <Checkbox id="termsPanel" checked={acceptTerms} onCheckedChange={(c) => setAcceptTerms(c as boolean)} />
              <label htmlFor="termsPanel" className="text-sm font-medium">{t('subscribe.acceptTerms')}</label>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowActivationDialog(false)}>{t('common.cancel')}</Button>
            <Button onClick={handleActivateCode} disabled={isProcessing || !acceptTerms || !activationCode.trim()}>
              {isProcessing ? <><Loader2 className="mr-2 h-4 w-4 animate-spin" />{t('common.processing')}</> : t('common.activate')}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Dialog bonifico bancario */}
      <Dialog open={showBankTransferInfo} onOpenChange={setShowBankTransferInfo}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{t('subscribe.bankTransfer.title')}</DialogTitle>
            <DialogDescription>{t('subscribe.bankTransfer.description')}</DialogDescription>
          </DialogHeader>
          {bankTransferInfo && (
            <div className="space-y-4 py-2">
              <div className="border rounded-md p-4 bg-muted/30 space-y-2">
                <div className="flex justify-between text-sm">
                  <span className="font-medium">{t('subscribe.bankTransfer.plan')}</span>
                  <span>{serverPlans?.find((p: ServerPlan) => String(p.id) === String(bankTransferInfo.planId))?.name}</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="font-medium">{t('subscribe.bankTransfer.amount')}</span>
                  <span>{symbol}{serverPlans?.find((p: ServerPlan) => String(p.id) === String(bankTransferInfo.planId))?.price}</span>
                </div>
                <Separator />
                <div className="text-sm"><p className="font-medium">{t('subscribe.bankTransfer.recipient')}</p><p>{bankTransferInfo.bankInfo.recipient || t('common.notSpecified')}</p></div>
                <div className="text-sm"><p className="font-medium">IBAN</p><p className="font-mono">{bankTransferInfo.bankInfo.iban || t('common.notSpecified')}</p></div>
                <div className="text-sm">
                  <p className="font-medium">{t('subscribe.bankTransfer.reason')}</p>
                  <p className="font-mono">{t('subscribe.bankTransfer.reasonTemplate', { plan: serverPlans?.find((p: ServerPlan) => String(p.id) === String(bankTransferInfo.planId))?.name })}</p>
                </div>
              </div>
              <Alert>
                <AlertCircle className="h-4 w-4" />
                <AlertTitle>{t('subscribe.bankTransfer.noteTitle')}</AlertTitle>
                <AlertDescription>{t('subscribe.bankTransfer.noteDesc')}</AlertDescription>
              </Alert>
            </div>
          )}
          <DialogFooter>
            <Button variant="secondary" onClick={() => setShowBankTransferInfo(false)}>{t('common.close')}</Button>
            <Button onClick={() => {
              const info = `IBAN: ${bankTransferInfo?.bankInfo.iban || ''}\n${t('subscribe.recipientLabel')}: ${bankTransferInfo?.bankInfo.recipient || ''}\n${t('subscribe.bankTransfer.amount')}: ${symbol}${serverPlans?.find((p: ServerPlan) => String(p.id) === String(bankTransferInfo?.planId))?.price}\n${t('subscribe.reasonLabel')}: ${t('subscribe.bankTransfer.reasonTemplate', { plan: serverPlans?.find((p: ServerPlan) => String(p.id) === String(bankTransferInfo?.planId))?.name })}`.trim();
              navigator.clipboard.writeText(info).then(() => toast({ title: t('common.copied'), description: t('subscribe.bankTransfer.copiedDetails') }));
            }}>
              <Copy className="mr-2 h-4 w-4" />{t('common.copy')}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
