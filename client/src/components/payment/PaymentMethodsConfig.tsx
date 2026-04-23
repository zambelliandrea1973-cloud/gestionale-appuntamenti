import { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { useToast } from "@/hooks/use-toast";
import { apiRequest } from '@/lib/queryClient';
import { 
  Card, 
  CardContent, 
  CardDescription, 
  CardHeader, 
  CardTitle, 
  CardFooter 
} from "@/components/ui/card";
import { Switch } from "@/components/ui/switch";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Textarea } from "@/components/ui/textarea";
import { 
  CreditCard, 
  Wallet, 
  Building2, 
  DollarSign,
  Save,
  AlertTriangle,
  CheckCircle2,
  Sparkles
} from 'lucide-react';
import { SiWise, SiPaypal, SiStripe } from 'react-icons/si';

interface PaymentMethod {
  id: string;
  name: string;
  enabled: boolean;
  config: Record<string, any>;
}

export default function PaymentMethodsConfig() {
  const { t } = useTranslation();
  const { toast } = useToast();
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [isAutoConfiguring, setIsAutoConfiguring] = useState(false);
  const [paymentMethods, setPaymentMethods] = useState<PaymentMethod[]>([
    {
      id: 'stripe',
      name: 'Carta di Credito (Stripe)',
      enabled: false,
      config: {
        publicKey: '',
        secretKey: '',
        webhookSecret: '',
        statementDescriptor: 'Ethera Scheduler'
      }
    },
    {
      id: 'paypal',
      name: 'PayPal',
      enabled: false,
      config: {
        clientId: '',
        clientSecret: '',
        mode: 'sandbox' // sandbox o live
      }
    },
    {
      id: 'wise',
      name: 'Wise (TransferWise)',
      enabled: false,
      config: {
        apiKey: '',
        profileId: '',
        accountId: '',
        recipientEmail: ''
      }
    },
    {
      id: 'bank',
      name: 'Bonifico Bancario',
      enabled: false,
      config: {
        accountName: '',
        iban: '',
        swift: '',
        bankName: '',
        instructions: ''
      }
    }
  ]);

  // Carica la configurazione dei metodi di pagamento
  useEffect(() => {
    fetchPaymentMethods();
  }, []);

  const fetchPaymentMethods = async () => {
    setIsLoading(true);
    try {
      // Carica i dati da API con token di autenticazione per l'area admin
      const response = await apiRequest(
        "GET", 
        "/api/payments/payment-admin/payment-methods", 
        undefined, 
        { withBetaAdminToken: true }
      );
      
      // Se non ci sono dati configurati, use default values
      if (response.ok) {
        const data = await response.json();
        if (data && data.length > 0) {
          setPaymentMethods(data);
        }
      }
    } catch (error) {
      console.error("Errore nel caricamento dei metodi di pagamento:", error);
      toast({
        title: t('common.error'),
        description: t('paymentMethodsConfig.toast.loadError'),
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  // Salva la configurazione dei metodi di pagamento
  const savePaymentMethods = async () => {
    setIsSaving(true);
    try {
      const response = await apiRequest(
        "POST", 
        "/api/payments/payment-admin/payment-methods", 
        { paymentMethods }, 
        { withBetaAdminToken: true }
      );
      
      if (response.ok) {
        toast({
          title: t('paymentMethodsConfig.toast.saveSuccessTitle'),
          description: t('paymentMethodsConfig.toast.saveSuccess'),
          variant: "default",
        });
      } else {
        throw new Error(t('paymentMethodsConfig.toast.saveError'));
      }
    } catch (error) {
      console.error("Errore nel salvataggio dei metodi di pagamento:", error);
      toast({
        title: t('common.error'),
        description: t('paymentMethodsConfig.toast.saveError'),
        variant: "destructive",
      });
    } finally {
      setIsSaving(false);
    }
  };

  // Modifica lo stato di abilitazione di un metodo di pagamento
  const togglePaymentMethod = (id: string) => {
    setPaymentMethods(prevMethods => 
      prevMethods.map(method => 
        method.id === id 
          ? { ...method, enabled: !method.enabled } 
          : method
      )
    );
  };

  // Aggiorna la configurazione di un metodo di pagamento
  const updatePaymentMethodConfig = (id: string, key: string, value: any) => {
    setPaymentMethods(prevMethods => 
      prevMethods.map(method => 
        method.id === id 
          ? { 
              ...method, 
              config: { 
                ...method.config, 
                [key]: value 
              } 
            } 
          : method
      )
    );
  };

  // Testa la configurazione di un metodo di pagamento
  const testPaymentMethod = async (id: string) => {
    try {
      const response = await apiRequest(
        "POST", 
        `/api/payments/payment-admin/test-payment-method/${id}`, 
        { config: paymentMethods.find(m => m.id === id)?.config }, 
        { withBetaAdminToken: true }
      );
      
      if (response.ok) {
        toast({
          title: t('paymentMethodsConfig.toast.testSuccessTitle'),
          description: t('paymentMethodsConfig.toast.testSuccess', { id }),
          variant: "default",
        });
      } else {
        const data = await response.json();
        throw new Error(data.message || t('paymentMethodsConfig.toast.testError'));
      }
    } catch (error: any) {
      console.error(`Errore nel test di ${id}:`, error);
      toast({
        title: t('paymentMethodsConfig.toast.testFailedTitle'),
        description: t('paymentMethodsConfig.toast.testFailed', { id, message: error.message }),
        variant: "destructive",
      });
    }
  };

  // Auto-configura Wise recuperando Profile ID e Account ID dall'API
  const autoConfigureWise = async () => {
    setIsAutoConfiguring(true);
    try {
      // Recupera l'API Key corrente dal form
      const wiseMethod = paymentMethods.find(m => m.id === 'wise');
      const apiKey = wiseMethod?.config.apiKey;
      
      if (!apiKey) {
        throw new Error(t('paymentMethodsConfig.toast.wiseEnterApiKey'));
      }
      
      const response = await apiRequest(
        "POST", 
        "/api/payments/payment-admin/wise/auto-configure", 
        { apiKey }, // Passa l'API Key dal form
        { withBetaAdminToken: true }
      );
      
      if (response.ok) {
        const data = await response.json();
        
        // Ricarica i metodi di pagamento per ottenere i nuovi valori
        await fetchPaymentMethods();
        
        toast({
          title: t('paymentMethodsConfig.toast.wiseSuccessTitle'),
          description: t('paymentMethodsConfig.toast.wiseSuccess', { profileId: data.data.profileId, accountId: data.data.accountId }),
          variant: "default",
        });
      } else {
        const errorData = await response.json();
        throw new Error(errorData.message || t('paymentMethodsConfig.toast.wiseAutoConfigError'));
      }
    } catch (error: any) {
      console.error("Errore nell'auto-configurazione Wise:", error);
      toast({
        title: t('paymentMethodsConfig.toast.wiseErrorTitle'),
        description: error.message || t('paymentMethodsConfig.toast.wiseFetchError'),
        variant: "destructive",
      });
    } finally {
      setIsAutoConfiguring(false);
    }
  };

  return (
    <Card className="w-full">
      <CardHeader>
        <CardTitle>{t('paymentMethodsConfig.title')}</CardTitle>
        <CardDescription>
          {t('paymentMethodsConfig.description')}
        </CardDescription>
      </CardHeader>
      
      <CardContent>
        {isLoading ? (
          <div className="flex items-center justify-center p-6">
            <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent"></div>
            <span className="ml-2">{t('paymentMethodsConfig.loading')}</span>
          </div>
        ) : (
          <Tabs defaultValue="stripe" className="w-full">
            <TabsList className="mb-4">
              <TabsTrigger value="stripe" className="flex items-center gap-1">
                <CreditCard className="h-4 w-4" />
                <span>{t('paymentMethodsConfig.tabs.card')}</span>
              </TabsTrigger>
              <TabsTrigger value="paypal" className="flex items-center gap-1">
                <SiPaypal className="h-4 w-4" />
                <span>PayPal</span>
              </TabsTrigger>
              <TabsTrigger value="wise" className="flex items-center gap-1">
                <SiWise className="h-4 w-4" />
                <span>Wise</span>
              </TabsTrigger>
              <TabsTrigger value="bank" className="flex items-center gap-1">
                <Building2 className="h-4 w-4" />
                <span>{t('paymentMethodsConfig.tabs.bank')}</span>
              </TabsTrigger>
            </TabsList>
            
            {/* Stripe / Carta di Credito */}
            <TabsContent value="stripe">
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-2">
                    <SiStripe className="h-6 w-6 text-blue-600" />
                    <h3 className="text-xl font-semibold">{t('paymentMethodsConfig.stripe.heading')}</h3>
                  </div>
                  <div className="flex items-center space-x-2">
                    <span className="text-sm text-muted-foreground">
                      {paymentMethods.find(m => m.id === 'stripe')?.enabled ? t('paymentMethodsConfig.enabled') : t('paymentMethodsConfig.disabled')}
                    </span>
                    <Switch 
                      checked={paymentMethods.find(m => m.id === 'stripe')?.enabled || false}
                      onCheckedChange={() => togglePaymentMethod('stripe')}
                    />
                  </div>
                </div>
                
                <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                  <div className="space-y-2">
                    <Label htmlFor="stripe-publicKey">{t('paymentMethodsConfig.stripe.publicKeyLabel')}</Label>
                    <Input 
                      id="stripe-publicKey" 
                      type="text" 
                      value={paymentMethods.find(m => m.id === 'stripe')?.config.publicKey || ''}
                      onChange={(e) => updatePaymentMethodConfig('stripe', 'publicKey', e.target.value)}
                      placeholder="pk_test_..."
                    />
                    <p className="text-xs text-muted-foreground">{t('paymentMethodsConfig.stripe.publicKeyHelp')}</p>
                  </div>
                  
                  <div className="space-y-2">
                    <Label htmlFor="stripe-secretKey">{t('paymentMethodsConfig.stripe.secretKeyLabel')}</Label>
                    <Input 
                      id="stripe-secretKey" 
                      type="text" 
                      value={paymentMethods.find(m => m.id === 'stripe')?.config.secretKey || ''}
                      onChange={(e) => updatePaymentMethodConfig('stripe', 'secretKey', e.target.value)}
                      placeholder="sk_test_... o sk_live_..."
                      className="font-mono text-sm"
                    />
                    <p className="text-xs text-muted-foreground">{t('paymentMethodsConfig.stripe.secretKeyHelp')}</p>
                  </div>
                </div>
                
                <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                  <div className="space-y-2">
                    <Label htmlFor="stripe-webhookSecret">{t('paymentMethodsConfig.stripe.webhookLabel')}</Label>
                    <Input 
                      id="stripe-webhookSecret" 
                      type="text" 
                      value={paymentMethods.find(m => m.id === 'stripe')?.config.webhookSecret || ''}
                      onChange={(e) => updatePaymentMethodConfig('stripe', 'webhookSecret', e.target.value)}
                      placeholder="whsec_..."
                      className="font-mono text-sm"
                    />
                    <p className="text-xs text-muted-foreground">{t('paymentMethodsConfig.stripe.webhookHelp')}</p>
                  </div>
                  
                  <div className="space-y-2">
                    <Label htmlFor="stripe-statementDescriptor">{t('paymentMethodsConfig.stripe.descriptorLabel')}</Label>
                    <Input 
                      id="stripe-statementDescriptor" 
                      type="text" 
                      value={paymentMethods.find(m => m.id === 'stripe')?.config.statementDescriptor || 'Ethera Scheduler'}
                      onChange={(e) => updatePaymentMethodConfig('stripe', 'statementDescriptor', e.target.value)}
                      placeholder={t('paymentMethodsConfig.stripe.descriptorPlaceholder')}
                      maxLength={22}
                    />
                    <p className="text-xs text-muted-foreground">{t('paymentMethodsConfig.stripe.descriptorHelp')}</p>
                  </div>
                </div>
                
                <div className="flex justify-end space-x-2 mt-4">
                  <Button variant="outline" onClick={() => testPaymentMethod('stripe')} disabled={!paymentMethods.find(m => m.id === 'stripe')?.enabled}>
                    <CheckCircle2 className="h-4 w-4 mr-2" />
                    {t('paymentMethodsConfig.testConfig')}
                  </Button>
                </div>
                
                <div className="bg-amber-50 p-4 rounded-md mt-4">
                  <div className="flex items-start">
                    <AlertTriangle className="h-5 w-5 mr-2 text-amber-600 mt-0.5" />
                    <div>
                      <h4 className="font-semibold text-amber-800">{t('paymentMethodsConfig.stripe.howToGet')}</h4>
                      <ol className="mt-2 text-sm space-y-1 text-amber-700">
                        <li>{t('paymentMethodsConfig.stripe.step1')} <a href="https://dashboard.stripe.com" target="_blank" rel="noopener noreferrer" className="underline">dashboard.stripe.com</a></li>
                        <li>{t('paymentMethodsConfig.stripe.step2')}</li>
                        <li>{t('paymentMethodsConfig.stripe.step3')}</li>
                        <li>{t('paymentMethodsConfig.stripe.step4')} {window.location.origin}/api/payments/stripe/webhook</li>
                      </ol>
                    </div>
                  </div>
                </div>
              </div>
            </TabsContent>
            
            {/* PayPal */}
            <TabsContent value="paypal">
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-2">
                    <SiPaypal className="h-6 w-6 text-blue-700" />
                    <h3 className="text-xl font-semibold">PayPal</h3>
                  </div>
                  <div className="flex items-center space-x-2">
                    <span className="text-sm text-muted-foreground">
                      {paymentMethods.find(m => m.id === 'paypal')?.enabled ? t('paymentMethodsConfig.enabled') : t('paymentMethodsConfig.disabled')}
                    </span>
                    <Switch 
                      checked={paymentMethods.find(m => m.id === 'paypal')?.enabled || false}
                      onCheckedChange={() => togglePaymentMethod('paypal')}
                    />
                  </div>
                </div>
                
                <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                  <div className="space-y-2">
                    <Label htmlFor="paypal-clientId">{t('paymentMethodsConfig.paypal.clientIdLabel')}</Label>
                    <Input 
                      id="paypal-clientId" 
                      type="text" 
                      value={paymentMethods.find(m => m.id === 'paypal')?.config.clientId || ''}
                      onChange={(e) => updatePaymentMethodConfig('paypal', 'clientId', e.target.value)}
                      placeholder={t('paymentMethodsConfig.paypal.clientIdPlaceholder')}
                    />
                  </div>
                  
                  <div className="space-y-2">
                    <Label htmlFor="paypal-clientSecret">{t('paymentMethodsConfig.paypal.clientSecretLabel')}</Label>
                    <Input 
                      id="paypal-clientSecret" 
                      type="text" 
                      value={paymentMethods.find(m => m.id === 'paypal')?.config.clientSecret || ''}
                      onChange={(e) => updatePaymentMethodConfig('paypal', 'clientSecret', e.target.value)}
                      placeholder={t('paymentMethodsConfig.paypal.clientSecretPlaceholder')}
                      className="font-mono text-sm"
                    />
                  </div>
                </div>
                
                <div className="space-y-2">
                  <div className="flex items-center space-x-2">
                    <Label htmlFor="paypal-mode">{t('paymentMethodsConfig.paypal.modeLabel')}</Label>
                  </div>
                  <div className="flex items-center space-x-4">
                    <div className="flex items-center space-x-2">
                      <input 
                        type="radio" 
                        id="paypal-mode-sandbox" 
                        name="paypal-mode"
                        checked={paymentMethods.find(m => m.id === 'paypal')?.config.mode === 'sandbox'}
                        onChange={() => updatePaymentMethodConfig('paypal', 'mode', 'sandbox')}
                      />
                      <Label htmlFor="paypal-mode-sandbox">{t('paymentMethodsConfig.paypal.sandbox')}</Label>
                    </div>
                    <div className="flex items-center space-x-2">
                      <input 
                        type="radio" 
                        id="paypal-mode-live" 
                        name="paypal-mode"
                        checked={paymentMethods.find(m => m.id === 'paypal')?.config.mode === 'live'}
                        onChange={() => updatePaymentMethodConfig('paypal', 'mode', 'live')}
                      />
                      <Label htmlFor="paypal-mode-live">{t('paymentMethodsConfig.paypal.live')}</Label>
                    </div>
                  </div>
                  <p className="text-xs text-muted-foreground">{t('paymentMethodsConfig.paypal.modeHelp')}</p>
                </div>
                
                <div className="flex justify-end space-x-2 mt-4">
                  <Button variant="outline" onClick={() => testPaymentMethod('paypal')} disabled={!paymentMethods.find(m => m.id === 'paypal')?.enabled}>
                    <CheckCircle2 className="h-4 w-4 mr-2" />
                    {t('paymentMethodsConfig.testConfig')}
                  </Button>
                </div>
                
                <div className="bg-amber-50 p-4 rounded-md mt-4">
                  <div className="flex items-start">
                    <AlertTriangle className="h-5 w-5 mr-2 text-amber-600 mt-0.5" />
                    <div>
                      <h4 className="font-semibold text-amber-800">{t('paymentMethodsConfig.paypal.howToGet')}</h4>
                      <ol className="mt-2 text-sm space-y-1 text-amber-700">
                        <li>{t('paymentMethodsConfig.paypal.step1')} <a href="https://developer.paypal.com" target="_blank" rel="noopener noreferrer" className="underline">developer.paypal.com</a></li>
                        <li>{t('paymentMethodsConfig.paypal.step2')}</li>
                        <li>{t('paymentMethodsConfig.paypal.step3')}</li>
                        <li>{t('paymentMethodsConfig.paypal.step4')}</li>
                        <li>{t('paymentMethodsConfig.paypal.step5')}</li>
                      </ol>
                    </div>
                  </div>
                </div>
              </div>
            </TabsContent>
            
            {/* Wise (TransferWise) */}
            <TabsContent value="wise">
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-2">
                    <SiWise className="h-6 w-6 text-green-600" />
                    <h3 className="text-xl font-semibold">Wise (TransferWise)</h3>
                  </div>
                  <div className="flex items-center space-x-2">
                    <span className="text-sm text-muted-foreground">
                      {paymentMethods.find(m => m.id === 'wise')?.enabled ? t('paymentMethodsConfig.enabled') : t('paymentMethodsConfig.disabled')}
                    </span>
                    <Switch 
                      checked={paymentMethods.find(m => m.id === 'wise')?.enabled || false}
                      onCheckedChange={() => togglePaymentMethod('wise')}
                    />
                  </div>
                </div>
                
                <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                  <div className="space-y-2">
                    <Label htmlFor="wise-apiKey">{t('paymentMethodsConfig.wise.apiKeyLabel')}</Label>
                    <Input 
                      id="wise-apiKey" 
                      type="text" 
                      value={paymentMethods.find(m => m.id === 'wise')?.config.apiKey || ''}
                      onChange={(e) => updatePaymentMethodConfig('wise', 'apiKey', e.target.value)}
                      placeholder={t('paymentMethodsConfig.wise.apiKeyPlaceholder')}
                      className="font-mono text-sm"
                    />
                  </div>
                  
                  <div className="space-y-2">
                    <Label htmlFor="wise-profileId">{t('paymentMethodsConfig.wise.profileIdLabel')}</Label>
                    <Input 
                      id="wise-profileId" 
                      type="text" 
                      value={paymentMethods.find(m => m.id === 'wise')?.config.profileId || ''}
                      onChange={(e) => updatePaymentMethodConfig('wise', 'profileId', e.target.value)}
                      placeholder={t('paymentMethodsConfig.wise.profileIdPlaceholder')}
                    />
                  </div>
                </div>
                
                <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                  <div className="space-y-2">
                    <Label htmlFor="wise-accountId">{t('paymentMethodsConfig.wise.accountIdLabel')}</Label>
                    <Input 
                      id="wise-accountId" 
                      type="text" 
                      value={paymentMethods.find(m => m.id === 'wise')?.config.accountId || ''}
                      onChange={(e) => updatePaymentMethodConfig('wise', 'accountId', e.target.value)}
                      placeholder={t('paymentMethodsConfig.wise.accountIdPlaceholder')}
                    />
                  </div>
                  
                  <div className="space-y-2">
                    <Label htmlFor="wise-recipientEmail">{t('paymentMethodsConfig.wise.emailLabel')}</Label>
                    <Input 
                      id="wise-recipientEmail" 
                      type="email" 
                      value={paymentMethods.find(m => m.id === 'wise')?.config.recipientEmail || ''}
                      onChange={(e) => updatePaymentMethodConfig('wise', 'recipientEmail', e.target.value)}
                      placeholder={t('paymentMethodsConfig.wise.emailPlaceholder')}
                    />
                    <p className="text-xs text-muted-foreground">{t('paymentMethodsConfig.wise.emailHelp')}</p>
                  </div>
                </div>
                
                <div className="flex justify-end space-x-2 mt-4">
                  <Button 
                    variant="default" 
                    onClick={autoConfigureWise} 
                    disabled={!paymentMethods.find(m => m.id === 'wise')?.config.apiKey || isAutoConfiguring}
                    data-testid="button-wise-auto-configure"
                  >
                    {isAutoConfiguring ? (
                      <>
                        <div className="h-4 w-4 mr-2 animate-spin rounded-full border-2 border-white border-t-transparent"></div>
                        {t('paymentMethodsConfig.wise.configuring')}
                      </>
                    ) : (
                      <>
                        <Sparkles className="h-4 w-4 mr-2" />
                        {t('paymentMethodsConfig.wise.autoConfigure')}
                      </>
                    )}
                  </Button>
                  <Button 
                    variant="outline" 
                    onClick={() => testPaymentMethod('wise')} 
                    disabled={!paymentMethods.find(m => m.id === 'wise')?.enabled}
                    data-testid="button-wise-test"
                  >
                    <CheckCircle2 className="h-4 w-4 mr-2" />
                    {t('paymentMethodsConfig.testConfig')}
                  </Button>
                </div>
                
                <div className="bg-green-50 p-4 rounded-md mt-4">
                  <div className="flex items-start">
                    <Sparkles className="h-5 w-5 mr-2 text-green-600 mt-0.5" />
                    <div>
                      <h4 className="font-semibold text-green-800">{t('paymentMethodsConfig.wise.autoConfigTitle')}</h4>
                      <p className="mt-2 text-sm text-green-700">
                        <strong>{t('paymentMethodsConfig.wise.newFeature')}</strong> {t('paymentMethodsConfig.wise.autoConfigInstructions')}
                      </p>
                      <p className="mt-1 text-sm text-green-700">
                        {t('paymentMethodsConfig.wise.autoConfigInstructions2')}
                      </p>
                    </div>
                  </div>
                </div>
                
                <div className="bg-amber-50 p-4 rounded-md mt-4">
                  <div className="flex items-start">
                    <AlertTriangle className="h-5 w-5 mr-2 text-amber-600 mt-0.5" />
                    <div>
                      <h4 className="font-semibold text-amber-800">{t('paymentMethodsConfig.wise.howToGet')}</h4>
                      <ol className="mt-2 text-sm space-y-1 text-amber-700">
                        <li>{t('paymentMethodsConfig.wise.step1')} <a href="https://wise.com" target="_blank" rel="noopener noreferrer" className="underline">wise.com</a></li>
                        <li>{t('paymentMethodsConfig.wise.step2')}</li>
                        <li>{t('paymentMethodsConfig.wise.step3')}</li>
                        <li>{t('paymentMethodsConfig.wise.step4')}</li>
                        <li>{t('paymentMethodsConfig.wise.step5')}</li>
                        <li>{t('paymentMethodsConfig.wise.step6')}</li>
                      </ol>
                    </div>
                  </div>
                </div>
              </div>
            </TabsContent>
            
            {/* Bonifico Bancario */}
            <TabsContent value="bank">
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-2">
                    <Building2 className="h-6 w-6 text-slate-700" />
                    <h3 className="text-xl font-semibold">{t('paymentMethodsConfig.bank.heading')}</h3>
                  </div>
                  <div className="flex items-center space-x-2">
                    <span className="text-sm text-muted-foreground">
                      {paymentMethods.find(m => m.id === 'bank')?.enabled ? t('paymentMethodsConfig.enabled') : t('paymentMethodsConfig.disabled')}
                    </span>
                    <Switch 
                      checked={paymentMethods.find(m => m.id === 'bank')?.enabled || false}
                      onCheckedChange={() => togglePaymentMethod('bank')}
                    />
                  </div>
                </div>
                
                <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                  <div className="space-y-2">
                    <Label htmlFor="bank-accountName">{t('paymentMethodsConfig.bank.accountNameLabel')}</Label>
                    <Input 
                      id="bank-accountName" 
                      type="text" 
                      value={paymentMethods.find(m => m.id === 'bank')?.config.accountName || ''}
                      onChange={(e) => updatePaymentMethodConfig('bank', 'accountName', e.target.value)}
                      placeholder={t('paymentMethodsConfig.bank.accountNamePlaceholder')}
                    />
                  </div>
                  
                  <div className="space-y-2">
                    <Label htmlFor="bank-bankName">{t('paymentMethodsConfig.bank.bankNameLabel')}</Label>
                    <Input 
                      id="bank-bankName" 
                      type="text" 
                      value={paymentMethods.find(m => m.id === 'bank')?.config.bankName || ''}
                      onChange={(e) => updatePaymentMethodConfig('bank', 'bankName', e.target.value)}
                      placeholder={t('paymentMethodsConfig.bank.bankNamePlaceholder')}
                    />
                  </div>
                </div>
                
                <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                  <div className="space-y-2">
                    <Label htmlFor="bank-iban">IBAN</Label>
                    <Input 
                      id="bank-iban" 
                      type="text" 
                      value={paymentMethods.find(m => m.id === 'bank')?.config.iban || ''}
                      onChange={(e) => updatePaymentMethodConfig('bank', 'iban', e.target.value)}
                      placeholder={t('paymentMethodsConfig.bank.ibanPlaceholder')}
                    />
                  </div>
                  
                  <div className="space-y-2">
                    <Label htmlFor="bank-swift">BIC/SWIFT</Label>
                    <Input 
                      id="bank-swift" 
                      type="text" 
                      value={paymentMethods.find(m => m.id === 'bank')?.config.swift || ''}
                      onChange={(e) => updatePaymentMethodConfig('bank', 'swift', e.target.value)}
                      placeholder={t('paymentMethodsConfig.bank.bicPlaceholder')}
                    />
                  </div>
                </div>
                
                <div className="space-y-2">
                  <Label htmlFor="bank-instructions">{t('paymentMethodsConfig.bank.instructionsLabel')}</Label>
                  <Textarea 
                    id="bank-instructions" 
                    value={paymentMethods.find(m => m.id === 'bank')?.config.instructions || ''}
                    onChange={(e) => updatePaymentMethodConfig('bank', 'instructions', e.target.value)}
                    placeholder={t('paymentMethodsConfig.bank.instructionsPlaceholder')}
                    rows={4}
                  />
                  <p className="text-xs text-muted-foreground">{t('paymentMethodsConfig.bank.instructionsHelp')}</p>
                </div>
              </div>
            </TabsContent>
          </Tabs>
        )}
      </CardContent>
      
      <CardFooter className="flex justify-end space-x-2">
        <Button variant="outline" onClick={fetchPaymentMethods} disabled={isLoading || isSaving}>{t('common.cancel')}</Button>
        <Button onClick={savePaymentMethods} disabled={isLoading || isSaving}>
          {isSaving ? (
            <>
              <div className="h-4 w-4 mr-2 animate-spin rounded-full border-2 border-primary border-t-transparent"></div>
              {t('paymentMethodsConfig.saving')}
            </>
          ) : (
            <>
              <Save className="h-4 w-4 mr-2" />
              {t('paymentMethodsConfig.saveButton')}
            </>
          )}
        </Button>
      </CardFooter>
    </Card>
  );
}