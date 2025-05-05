import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { 
  Check, 
  Crown, 
  CreditCard, 
  Star, 
  CalendarRange, 
  Users, 
  FileSpreadsheet,
  CalendarClock,
  BellRing
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { useLicense, LicenseType } from '@/hooks/use-license';
import { Loader2 } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Checkbox } from '@/components/ui/checkbox';
import { Label } from '@/components/ui/label';

// Importazioni PayPal
import { useEffect } from 'react';

// Definizione delle offerte
interface PlanFeature {
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

export default function SubscribePage() {
  const { t } = useTranslation();
  const { licenseInfo, activateLicense } = useLicense();
  const { toast } = useToast();
  const [paymentMethod, setPaymentMethod] = useState<'credit-card' | 'paypal'>('credit-card');
  const [isProcessing, setIsProcessing] = useState(false);
  const [showActivationDialog, setShowActivationDialog] = useState(false);
  const [activationCode, setActivationCode] = useState('');
  const [selectedPlanId, setSelectedPlanId] = useState<string | null>(null);
  const [acceptTerms, setAcceptTerms] = useState(false);
  
  // Funzione per gestire l'attivazione della licenza
  const handleActivateCode = async () => {
    if (!activationCode.trim()) {
      toast({
        title: 'Codice mancante',
        description: 'Inserisci un codice di attivazione valido',
        variant: 'destructive',
      });
      return;
    }
    
    try {
      setIsProcessing(true);
      // Rimuove tutti gli spazi dal codice prima di inviarlo al server
      const normalizedCode = activationCode.replace(/\s/g, '');
      await activateLicense(normalizedCode);
      setShowActivationDialog(false);
      setActivationCode('');
      
      toast({
        title: 'Licenza attivata',
        description: 'La tua licenza è stata attivata con successo.',
      });
    } catch (error: any) {
      toast({
        title: 'Errore',
        description: error.message || 'Si è verificato un errore durante l\'attivazione della licenza',
        variant: 'destructive',
      });
    } finally {
      setIsProcessing(false);
    }
  };
  
  // Funzione per gestire il pagamento
  const handlePayment = (planId: string) => {
    setSelectedPlanId(planId);
    // Qui in futuro implementeremo il processo di pagamento specifico
    // Per ora apriamo direttamente la finestra di attivazione
    setShowActivationDialog(true);
  };
  
  // Funzione per simulare il completamento di un pagamento
  const handleSimulatePayment = () => {
    toast({
      title: 'Pagamento simulato',
      description: 'In un\'applicazione reale, qui verrebbe elaborato il pagamento con il provider selezionato.',
    });
    
    // Chiudiamo la finestra dopo 2 secondi
    setTimeout(() => {
      setShowActivationDialog(true);
    }, 2000);
  };
  
  // Definizione dei piani
  const plans: Plan[] = [
    {
      id: 'trial',
      type: LicenseType.TRIAL,
      name: t('plans.trial.name', 'Prova'),
      description: t('plans.trial.description', 'Prova gratis per 40 giorni'),
      price: 0,
      priceLabel: t('plans.trial.price', 'Gratis'),
      buttonVariant: 'outline',
      features: [
        { name: t('plans.features.appointments', 'Gestione appuntamenti'), included: true },
        { name: t('plans.features.clients', 'Gestione clienti'), included: true },
        { name: t('plans.features.notifications', 'Notifiche ai clienti'), included: true },
        { name: t('plans.features.googleCalendar', 'Integrazione Google Calendar'), included: false },
        { name: t('plans.features.invoices', 'Gestione fatture'), included: false },
        { name: t('plans.features.reports', 'Report dettagliati'), included: false },
      ],
    },
    {
      id: 'base',
      type: LicenseType.BASE,
      name: t('plans.base.name', 'Base'),
      description: t('plans.base.description', 'Per professionisti individuali'),
      price: 9.90,
      priceLabel: '€9,90/mese',
      buttonVariant: 'outline',
      features: [
        { name: t('plans.features.appointments', 'Gestione appuntamenti'), included: true },
        { name: t('plans.features.clients', 'Gestione clienti'), included: true },
        { name: t('plans.features.notifications', 'Notifiche ai clienti'), included: true },
        { name: t('plans.features.googleCalendar', 'Integrazione Google Calendar'), included: false },
        { name: t('plans.features.invoices', 'Gestione fatture'), included: false },
        { name: t('plans.features.reports', 'Report dettagliati'), included: false },
      ],
    },
    {
      id: 'pro',
      type: LicenseType.PRO,
      name: t('plans.pro.name', 'PRO'),
      description: t('plans.pro.description', 'Tutte le funzionalità premium'),
      price: 19.90,
      priceLabel: '€19,90/mese',
      popular: true,
      buttonVariant: 'default',
      features: [
        { name: t('plans.features.appointments', 'Gestione appuntamenti'), included: true },
        { name: t('plans.features.clients', 'Gestione clienti'), included: true },
        { name: t('plans.features.notifications', 'Notifiche ai clienti'), included: true },
        { name: t('plans.features.googleCalendar', 'Integrazione Google Calendar'), included: true },
        { name: t('plans.features.invoices', 'Gestione fatture'), included: true },
        { name: t('plans.features.reports', 'Report dettagliati'), included: true },
      ],
    },
    {
      id: 'business',
      type: LicenseType.PRO,
      name: t('plans.business.name', 'Business'),
      description: t('plans.business.description', 'Per studi con più operatori'),
      price: 39.90,
      priceLabel: '€39,90/mese',
      buttonVariant: 'outline',
      features: [
        { name: t('plans.features.appointments', 'Gestione appuntamenti'), included: true },
        { name: t('plans.features.clients', 'Gestione clienti'), included: true },
        { name: t('plans.features.notifications', 'Notifiche ai clienti'), included: true },
        { name: t('plans.features.googleCalendar', 'Integrazione Google Calendar'), included: true },
        { name: t('plans.features.invoices', 'Gestione fatture'), included: true },
        { name: t('plans.features.reports', 'Report dettagliati'), included: true },
        { name: t('plans.features.multipleStaff', 'Supporto per più operatori'), included: true },
      ],
    },
  ];
  
  // Ottieni le features distintive per mostrare nella sezione hero
  const keyFeatures = [
    {
      icon: <CalendarRange className="h-10 w-10 text-primary" />,
      title: t('subscribe.features.scheduling.title', 'Gestione Appuntamenti'),
      description: t('subscribe.features.scheduling.description', 'Organizza facilmente il tuo calendario e gli appuntamenti con i clienti.'),
    },
    {
      icon: <Users className="h-10 w-10 text-primary" />,
      title: t('subscribe.features.clients.title', 'Gestione Clienti'),
      description: t('subscribe.features.clients.description', 'Mantieni tutti i dati dei tuoi clienti in un unico posto sicuro.'),
    },
    {
      icon: <BellRing className="h-10 w-10 text-primary" />,
      title: t('subscribe.features.notifications.title', 'Notifiche Automatiche'),
      description: t('subscribe.features.notifications.description', 'Invia promemoria automatici ai clienti per ridurre le cancellazioni.'),
    },
    {
      icon: <FileSpreadsheet className="h-10 w-10 text-primary" />,
      title: t('subscribe.features.reports.title', 'Report Dettagliati'),
      description: t('subscribe.features.reports.description', 'Analizza la tua attività con report e statistiche complete.'),
    },
  ];
  
  return (
    <div className="container py-10">
      {/* Hero Section */}
      <div className="text-center mb-16">
        <h1 className="text-4xl font-bold tracking-tight mb-6">
          {t('subscribe.title', 'Scegli il piano perfetto per la tua attività')}
        </h1>
        <p className="text-lg text-muted-foreground max-w-3xl mx-auto mb-12">
          {t('subscribe.subtitle', 'Tutti i piani includono un periodo di prova gratuito di 40 giorni. Nessuna carta di credito richiesta per iniziare.')}
        </p>
        
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
      
      {/* Pricing Section */}
      <div>
        <h2 className="text-3xl font-bold text-center mb-10 flex items-center justify-center">
          <Crown className="mr-2 h-8 w-8 text-amber-500" />
          {t('subscribe.pricingTitle', 'Piani e Prezzi')}
        </h2>
        
        {/* Payment Method Tabs */}
        <Tabs defaultValue="credit-card" className="mb-8 max-w-md mx-auto">
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger 
              value="credit-card" 
              onClick={() => setPaymentMethod('credit-card')}
              className="flex items-center"
            >
              <CreditCard className="h-4 w-4 mr-2" />
              {t('subscribe.paymentMethods.card', 'Carta di Credito')}
            </TabsTrigger>
            <TabsTrigger 
              value="paypal" 
              onClick={() => setPaymentMethod('paypal')}
              className="flex items-center"
            >
              <svg className="h-4 w-4 mr-2" viewBox="0 0 24 24" fill="currentColor">
                <path d="M7.076 21.337H2.47a.641.641 0 0 1-.633-.74L4.944.901C5.026.382 5.474 0 5.998 0h7.46c2.57 0 4.578.543 5.69 1.81 1.01 1.15 1.304 2.42 1.012 4.287-.023.143-.047.288-.077.437-.983 5.05-4.349 6.797-8.647 6.797h-2.19c-.524 0-.968.382-1.05.9l-1.12 7.106zm14.146-14.42a3.35 3.35 0 0 0-.607-.541c-.013.076-.026.175-.041.254-.59 3.003-2.598 6.726-8.674 6.726h-2.19c-1.279 0-2.385.945-2.585 2.22v.03l-.956 6.05h4.433c.48 0 .888-.348.965-.82l.04-.225.764-4.82.05-.264c.076-.472.485-.82.965-.82h.608c3.938 0 7.014-1.6 7.913-6.228.37-1.92.18-3.521-.685-4.562z" />
                <path d="M22.8 7.362c-.073-.43-.168-.838-.293-1.224a7.398 7.398 0 0 0-.412-1.143 5.855 5.855 0 0 0-.637-1.042c-.862-1.134-2.355-1.674-4.067-1.674h-7.46A2.486 2.486 0 0 0 7.49.772L4.382 19.316c-.094.596.296 1.15.896 1.15h4.433l1.115-7.07v.228c.19-1.274 1.296-2.218 2.575-2.218h2.19c6.085 0 10.008-3.722 10.675-9.204.02-.163.037-.325.052-.484h-.007c.122-1.586-.012-2.96-.51-4.355z" />
              </svg>
              PayPal
            </TabsTrigger>
          </TabsList>
        </Tabs>
        
        {/* Pricing Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8">
          {plans.map((plan) => (
            <Card key={plan.id} className={`flex flex-col ${plan.popular ? 'border-primary shadow-md relative' : ''}`}>
              {plan.popular && (
                <div className="absolute top-0 right-0 transform translate-x-2 -translate-y-2">
                  <span className="bg-amber-500 text-white text-xs py-1 px-3 rounded-full font-medium">
                    {t('subscribe.popular', 'Più popolare')}
                  </span>
                </div>
              )}
              
              <CardHeader>
                <CardTitle className="flex items-center">
                  {plan.type === LicenseType.PRO ? (
                    <Crown className="h-5 w-5 mr-2 text-amber-500" />
                  ) : plan.type === LicenseType.BASE ? (
                    <Star className="h-5 w-5 mr-2 text-blue-500" />
                  ) : (
                    <CalendarClock className="h-5 w-5 mr-2 text-green-500" />
                  )}
                  {plan.name}
                </CardTitle>
                <CardDescription>{plan.description}</CardDescription>
              </CardHeader>
              <CardContent className="flex-grow">
                <div className="mt-2 mb-6">
                  <span className="text-3xl font-bold">{plan.priceLabel}</span>
                </div>
                <ul className="space-y-2 mb-6">
                  {plan.features.map((feature, index) => (
                    <li key={index} className="flex items-start">
                      <div className={`rounded-full p-1 mr-2 ${feature.included ? 'text-green-500' : 'text-gray-300'}`}>
                        {feature.included ? <Check className="h-4 w-4" /> : <span className="block h-4 w-4">-</span>}
                      </div>
                      <span className={feature.included ? '' : 'text-gray-400'}>{feature.name}</span>
                    </li>
                  ))}
                </ul>
              </CardContent>
              <CardFooter>
                <Button 
                  variant={plan.buttonVariant} 
                  className="w-full"
                  onClick={() => handlePayment(plan.id)}
                  disabled={plan.type === LicenseType.TRIAL || plan.id === 'trial'}
                >
                  {plan.type === LicenseType.TRIAL || plan.id === 'trial' 
                    ? t('subscribe.startTrial', 'Già Attivo') 
                    : t('subscribe.subscribe', 'Abbonati')}
                </Button>
              </CardFooter>
            </Card>
          ))}
        </div>
        
        {/* FAQ and additional info */}
        <div className="mt-20 max-w-3xl mx-auto text-center">
          <h2 className="text-2xl font-bold mb-6">{t('subscribe.faq.title', 'Domande Frequenti')}</h2>
          <div className="text-left space-y-6">
            <div>
              <h3 className="text-lg font-medium mb-2">{t('subscribe.faq.q1', 'Posso annullare il mio abbonamento?')}</h3>
              <p className="text-muted-foreground">{t('subscribe.faq.a1', 'Sì, puoi annullare il tuo abbonamento in qualsiasi momento. L\'accesso alle funzionalità premium rimarrà attivo fino alla fine del periodo pagato.')}</p>
            </div>
            <div>
              <h3 className="text-lg font-medium mb-2">{t('subscribe.faq.q2', 'Come funziona il periodo di prova?')}</h3>
              <p className="text-muted-foreground">{t('subscribe.faq.a2', 'Il periodo di prova di 40 giorni include tutte le funzionalità di base. Non è richiesta una carta di credito per iniziare.')}</p>
            </div>
            <div>
              <h3 className="text-lg font-medium mb-2">{t('subscribe.faq.q3', 'Posso cambiare piano in seguito?')}</h3>
              <p className="text-muted-foreground">{t('subscribe.faq.a3', 'Sì, puoi passare a un piano superiore in qualsiasi momento. La differenza di prezzo verrà calcolata proporzionalmente.')}</p>
            </div>
          </div>
        </div>
      </div>
      
      {/* Dialog per l'attivazione del codice */}
      <Dialog open={showActivationDialog} onOpenChange={setShowActivationDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{t('subscribe.activateCode', 'Attiva il tuo codice')}</DialogTitle>
            <DialogDescription>
              {t('subscribe.activateCodeDescription', 'Inserisci il codice di attivazione che hai ricevuto dopo il pagamento.')}
            </DialogDescription>
          </DialogHeader>
          
          <div className="grid gap-4 py-4">
            <div className="grid gap-2">
              <Label htmlFor="activationCode">{t('subscribe.code', 'Codice di attivazione')}</Label>
              <Input
                id="activationCode"
                value={activationCode}
                onChange={(e) => {
                  // Rimuove tutti gli spazi dall'input
                  const rawValue = e.target.value.replace(/\s/g, '');
                  
                  if (rawValue.length > 16) {
                    // Limita a 16 caratteri
                    return;
                  }
                  
                  // Formatta aggiungendo spazi ogni 4 caratteri
                  let formattedValue = '';
                  for (let i = 0; i < rawValue.length; i++) {
                    if (i > 0 && i % 4 === 0) {
                      formattedValue += ' ';
                    }
                    formattedValue += rawValue[i];
                  }
                  
                  setActivationCode(formattedValue);
                }}
                placeholder="XXXX XXXX XXXX XXXX"
                className="col-span-3"
              />
            </div>
            
            <div className="flex items-center space-x-2">
              <Checkbox 
                id="terms" 
                checked={acceptTerms} 
                onCheckedChange={(checked) => setAcceptTerms(checked as boolean)} 
              />
              <label
                htmlFor="terms"
                className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70"
              >
                {t('subscribe.acceptTerms', 'Accetto i Termini di Servizio e la Privacy Policy')}
              </label>
            </div>
          </div>
          
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowActivationDialog(false)}>
              {t('common.cancel', 'Annulla')}
            </Button>
            <Button 
              onClick={handleActivateCode} 
              disabled={isProcessing || !acceptTerms || !activationCode.trim()}
            >
              {isProcessing ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  {t('common.processing', 'Elaborazione...')}
                </>
              ) : (
                t('common.activate', 'Attiva')
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}