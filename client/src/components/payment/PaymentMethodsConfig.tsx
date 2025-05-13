import { useState, useEffect } from 'react';
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
  CheckCircle2
} from 'lucide-react';
import { SiWise, SiPaypal, SiStripe } from 'react-icons/si';

interface PaymentMethod {
  id: string;
  name: string;
  enabled: boolean;
  config: Record<string, any>;
}

export default function PaymentMethodsConfig() {
  const { toast } = useToast();
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
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
        title: "Errore",
        description: "Impossibile caricare la configurazione dei metodi di pagamento.",
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
          title: "Configurazione salvata",
          description: "La configurazione dei metodi di pagamento è stata salvata con successo.",
          variant: "default",
        });
      } else {
        throw new Error("Errore durante il salvataggio");
      }
    } catch (error) {
      console.error("Errore nel salvataggio dei metodi di pagamento:", error);
      toast({
        title: "Errore",
        description: "Impossibile salvare la configurazione dei metodi di pagamento.",
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
          title: "Test riuscito",
          description: `La configurazione per ${id} funziona correttamente.`,
          variant: "default",
        });
      } else {
        const data = await response.json();
        throw new Error(data.message || "Errore durante il test");
      }
    } catch (error: any) {
      console.error(`Errore nel test di ${id}:`, error);
      toast({
        title: "Test fallito",
        description: `Errore per ${id}: ${error.message}`,
        variant: "destructive",
      });
    }
  };

  return (
    <Card className="w-full">
      <CardHeader>
        <CardTitle>Configurazione Metodi di Pagamento</CardTitle>
        <CardDescription>
          Configura i diversi metodi di pagamento disponibili per i clienti.
        </CardDescription>
      </CardHeader>
      
      <CardContent>
        {isLoading ? (
          <div className="flex items-center justify-center p-6">
            <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent"></div>
            <span className="ml-2">Caricamento configurazione...</span>
          </div>
        ) : (
          <Tabs defaultValue="stripe" className="w-full">
            <TabsList className="mb-4">
              <TabsTrigger value="stripe" className="flex items-center gap-1">
                <CreditCard className="h-4 w-4" />
                <span>Carta</span>
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
                <span>Banca</span>
              </TabsTrigger>
            </TabsList>
            
            {/* Stripe / Carta di Credito */}
            <TabsContent value="stripe">
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-2">
                    <SiStripe className="h-6 w-6 text-blue-600" />
                    <h3 className="text-xl font-semibold">Carta di Credito (Stripe)</h3>
                  </div>
                  <div className="flex items-center space-x-2">
                    <span className="text-sm text-muted-foreground">
                      {paymentMethods.find(m => m.id === 'stripe')?.enabled ? 'Abilitato' : 'Disabilitato'}
                    </span>
                    <Switch 
                      checked={paymentMethods.find(m => m.id === 'stripe')?.enabled || false}
                      onCheckedChange={() => togglePaymentMethod('stripe')}
                    />
                  </div>
                </div>
                
                <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                  <div className="space-y-2">
                    <Label htmlFor="stripe-publicKey">Chiave Pubblica (Publishable Key)</Label>
                    <Input 
                      id="stripe-publicKey" 
                      type="text" 
                      value={paymentMethods.find(m => m.id === 'stripe')?.config.publicKey || ''}
                      onChange={(e) => updatePaymentMethodConfig('stripe', 'publicKey', e.target.value)}
                      placeholder="pk_test_..."
                    />
                    <p className="text-xs text-muted-foreground">La chiave pubblica di Stripe che inizia con "pk_"</p>
                  </div>
                  
                  <div className="space-y-2">
                    <Label htmlFor="stripe-secretKey">Chiave Segreta (Secret Key)</Label>
                    <Input 
                      id="stripe-secretKey" 
                      type="password" 
                      value={paymentMethods.find(m => m.id === 'stripe')?.config.secretKey || ''}
                      onChange={(e) => updatePaymentMethodConfig('stripe', 'secretKey', e.target.value)}
                      placeholder="sk_test_..."
                    />
                    <p className="text-xs text-muted-foreground">La chiave segreta di Stripe che inizia con "sk_"</p>
                  </div>
                </div>
                
                <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                  <div className="space-y-2">
                    <Label htmlFor="stripe-webhookSecret">Webhook Secret</Label>
                    <Input 
                      id="stripe-webhookSecret" 
                      type="password" 
                      value={paymentMethods.find(m => m.id === 'stripe')?.config.webhookSecret || ''}
                      onChange={(e) => updatePaymentMethodConfig('stripe', 'webhookSecret', e.target.value)}
                      placeholder="whsec_..."
                    />
                    <p className="text-xs text-muted-foreground">La chiave segreta del webhook di Stripe (opzionale)</p>
                  </div>
                  
                  <div className="space-y-2">
                    <Label htmlFor="stripe-statementDescriptor">Descrizione in Estratto Conto</Label>
                    <Input 
                      id="stripe-statementDescriptor" 
                      type="text" 
                      value={paymentMethods.find(m => m.id === 'stripe')?.config.statementDescriptor || 'Ethera Scheduler'}
                      onChange={(e) => updatePaymentMethodConfig('stripe', 'statementDescriptor', e.target.value)}
                      placeholder="Es. Ethera Scheduler"
                      maxLength={22}
                    />
                    <p className="text-xs text-muted-foreground">Descrizione che appare sull'estratto conto (max 22 caratteri)</p>
                  </div>
                </div>
                
                <div className="flex justify-end space-x-2 mt-4">
                  <Button variant="outline" onClick={() => testPaymentMethod('stripe')} disabled={!paymentMethods.find(m => m.id === 'stripe')?.enabled}>
                    <CheckCircle2 className="h-4 w-4 mr-2" />
                    Test Configurazione
                  </Button>
                </div>
                
                <div className="bg-amber-50 p-4 rounded-md mt-4">
                  <div className="flex items-start">
                    <AlertTriangle className="h-5 w-5 mr-2 text-amber-600 mt-0.5" />
                    <div>
                      <h4 className="font-semibold text-amber-800">Come ottenere le chiavi Stripe</h4>
                      <ol className="mt-2 text-sm space-y-1 text-amber-700">
                        <li>1. Accedi al tuo account su <a href="https://dashboard.stripe.com" target="_blank" rel="noopener noreferrer" className="underline">dashboard.stripe.com</a></li>
                        <li>2. Vai in Developers {`>`} API keys</li>
                        <li>3. Copia la "Publishable key" e la "Secret key"</li>
                        <li>4. Per il webhook, vai in Developers {`>`} Webhooks, crea un endpoint con URL {window.location.origin}/api/payments/stripe/webhook</li>
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
                      {paymentMethods.find(m => m.id === 'paypal')?.enabled ? 'Abilitato' : 'Disabilitato'}
                    </span>
                    <Switch 
                      checked={paymentMethods.find(m => m.id === 'paypal')?.enabled || false}
                      onCheckedChange={() => togglePaymentMethod('paypal')}
                    />
                  </div>
                </div>
                
                <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                  <div className="space-y-2">
                    <Label htmlFor="paypal-clientId">Client ID</Label>
                    <Input 
                      id="paypal-clientId" 
                      type="text" 
                      value={paymentMethods.find(m => m.id === 'paypal')?.config.clientId || ''}
                      onChange={(e) => updatePaymentMethodConfig('paypal', 'clientId', e.target.value)}
                      placeholder="Es. ATc4RJ4qN6D..."
                    />
                  </div>
                  
                  <div className="space-y-2">
                    <Label htmlFor="paypal-clientSecret">Client Secret</Label>
                    <Input 
                      id="paypal-clientSecret" 
                      type="password" 
                      value={paymentMethods.find(m => m.id === 'paypal')?.config.clientSecret || ''}
                      onChange={(e) => updatePaymentMethodConfig('paypal', 'clientSecret', e.target.value)}
                      placeholder="Es. EGwT4QVt7D..."
                    />
                  </div>
                </div>
                
                <div className="space-y-2">
                  <div className="flex items-center space-x-2">
                    <Label htmlFor="paypal-mode">Modalità</Label>
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
                      <Label htmlFor="paypal-mode-sandbox">Sandbox (Test)</Label>
                    </div>
                    <div className="flex items-center space-x-2">
                      <input 
                        type="radio" 
                        id="paypal-mode-live" 
                        name="paypal-mode"
                        checked={paymentMethods.find(m => m.id === 'paypal')?.config.mode === 'live'}
                        onChange={() => updatePaymentMethodConfig('paypal', 'mode', 'live')}
                      />
                      <Label htmlFor="paypal-mode-live">Live (Produzione)</Label>
                    </div>
                  </div>
                  <p className="text-xs text-muted-foreground">Seleziona 'Sandbox' per i test o 'Live' per le transazioni reali</p>
                </div>
                
                <div className="flex justify-end space-x-2 mt-4">
                  <Button variant="outline" onClick={() => testPaymentMethod('paypal')} disabled={!paymentMethods.find(m => m.id === 'paypal')?.enabled}>
                    <CheckCircle2 className="h-4 w-4 mr-2" />
                    Test Configurazione
                  </Button>
                </div>
                
                <div className="bg-amber-50 p-4 rounded-md mt-4">
                  <div className="flex items-start">
                    <AlertTriangle className="h-5 w-5 mr-2 text-amber-600 mt-0.5" />
                    <div>
                      <h4 className="font-semibold text-amber-800">Come ottenere le credenziali PayPal</h4>
                      <ol className="mt-2 text-sm space-y-1 text-amber-700">
                        <li>1. Accedi al tuo account su <a href="https://developer.paypal.com" target="_blank" rel="noopener noreferrer" className="underline">developer.paypal.com</a></li>
                        <li>2. Vai su Dashboard {`>`} My Apps & Credentials</li>
                        <li>3. Crea una nuova app REST API oppure seleziona una esistente</li>
                        <li>4. Copia le credenziali "Client ID" e "Secret"</li>
                        <li>5. Assicurati di usare le credenziali giuste per Sandbox (test) o Live (produzione)</li>
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
                      {paymentMethods.find(m => m.id === 'wise')?.enabled ? 'Abilitato' : 'Disabilitato'}
                    </span>
                    <Switch 
                      checked={paymentMethods.find(m => m.id === 'wise')?.enabled || false}
                      onCheckedChange={() => togglePaymentMethod('wise')}
                    />
                  </div>
                </div>
                
                <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                  <div className="space-y-2">
                    <Label htmlFor="wise-apiKey">API Key</Label>
                    <Input 
                      id="wise-apiKey" 
                      type="password" 
                      value={paymentMethods.find(m => m.id === 'wise')?.config.apiKey || ''}
                      onChange={(e) => updatePaymentMethodConfig('wise', 'apiKey', e.target.value)}
                      placeholder="Es. dad06e..."
                    />
                  </div>
                  
                  <div className="space-y-2">
                    <Label htmlFor="wise-profileId">Profile ID</Label>
                    <Input 
                      id="wise-profileId" 
                      type="text" 
                      value={paymentMethods.find(m => m.id === 'wise')?.config.profileId || ''}
                      onChange={(e) => updatePaymentMethodConfig('wise', 'profileId', e.target.value)}
                      placeholder="Es. 12345..."
                    />
                  </div>
                </div>
                
                <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                  <div className="space-y-2">
                    <Label htmlFor="wise-accountId">Account ID</Label>
                    <Input 
                      id="wise-accountId" 
                      type="text" 
                      value={paymentMethods.find(m => m.id === 'wise')?.config.accountId || ''}
                      onChange={(e) => updatePaymentMethodConfig('wise', 'accountId', e.target.value)}
                      placeholder="Es. 6789..."
                    />
                  </div>
                  
                  <div className="space-y-2">
                    <Label htmlFor="wise-recipientEmail">Email Notifiche</Label>
                    <Input 
                      id="wise-recipientEmail" 
                      type="email" 
                      value={paymentMethods.find(m => m.id === 'wise')?.config.recipientEmail || ''}
                      onChange={(e) => updatePaymentMethodConfig('wise', 'recipientEmail', e.target.value)}
                      placeholder="Es. esempio@tuodominio.com"
                    />
                    <p className="text-xs text-muted-foreground">Email dove ricevere notifiche di pagamento</p>
                  </div>
                </div>
                
                <div className="flex justify-end space-x-2 mt-4">
                  <Button variant="outline" onClick={() => testPaymentMethod('wise')} disabled={!paymentMethods.find(m => m.id === 'wise')?.enabled}>
                    <CheckCircle2 className="h-4 w-4 mr-2" />
                    Test Configurazione
                  </Button>
                </div>
                
                <div className="bg-amber-50 p-4 rounded-md mt-4">
                  <div className="flex items-start">
                    <AlertTriangle className="h-5 w-5 mr-2 text-amber-600 mt-0.5" />
                    <div>
                      <h4 className="font-semibold text-amber-800">Come ottenere le credenziali Wise</h4>
                      <ol className="mt-2 text-sm space-y-1 text-amber-700">
                        <li>1. Accedi al tuo account Wise</li>
                        <li>2. Vai su Impostazioni {`>`} API e token</li>
                        <li>3. Crea un nuovo token API con i permessi necessari</li>
                        <li>4. Copia il token appena creato (è visibile solo al momento della creazione)</li>
                        <li>5. I valori Profile ID e Account ID sono disponibili nelle API documentazione di Wise</li>
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
                    <h3 className="text-xl font-semibold">Bonifico Bancario</h3>
                  </div>
                  <div className="flex items-center space-x-2">
                    <span className="text-sm text-muted-foreground">
                      {paymentMethods.find(m => m.id === 'bank')?.enabled ? 'Abilitato' : 'Disabilitato'}
                    </span>
                    <Switch 
                      checked={paymentMethods.find(m => m.id === 'bank')?.enabled || false}
                      onCheckedChange={() => togglePaymentMethod('bank')}
                    />
                  </div>
                </div>
                
                <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                  <div className="space-y-2">
                    <Label htmlFor="bank-accountName">Intestatario Conto</Label>
                    <Input 
                      id="bank-accountName" 
                      type="text" 
                      value={paymentMethods.find(m => m.id === 'bank')?.config.accountName || ''}
                      onChange={(e) => updatePaymentMethodConfig('bank', 'accountName', e.target.value)}
                      placeholder="Es. Ethera Srl"
                    />
                  </div>
                  
                  <div className="space-y-2">
                    <Label htmlFor="bank-bankName">Nome Banca</Label>
                    <Input 
                      id="bank-bankName" 
                      type="text" 
                      value={paymentMethods.find(m => m.id === 'bank')?.config.bankName || ''}
                      onChange={(e) => updatePaymentMethodConfig('bank', 'bankName', e.target.value)}
                      placeholder="Es. Intesa San Paolo"
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
                      placeholder="Es. IT60X0542811101000000123456"
                    />
                  </div>
                  
                  <div className="space-y-2">
                    <Label htmlFor="bank-swift">BIC/SWIFT</Label>
                    <Input 
                      id="bank-swift" 
                      type="text" 
                      value={paymentMethods.find(m => m.id === 'bank')?.config.swift || ''}
                      onChange={(e) => updatePaymentMethodConfig('bank', 'swift', e.target.value)}
                      placeholder="Es. UNCRITMMXXX"
                    />
                  </div>
                </div>
                
                <div className="space-y-2">
                  <Label htmlFor="bank-instructions">Istruzioni per il Pagamento</Label>
                  <Textarea 
                    id="bank-instructions" 
                    value={paymentMethods.find(m => m.id === 'bank')?.config.instructions || ''}
                    onChange={(e) => updatePaymentMethodConfig('bank', 'instructions', e.target.value)}
                    placeholder="Inserisci qui le istruzioni per il bonifico (es. causale da inserire)"
                    rows={4}
                  />
                  <p className="text-xs text-muted-foreground">Queste istruzioni saranno mostrate ai clienti che scelgono il bonifico bancario</p>
                </div>
              </div>
            </TabsContent>
          </Tabs>
        )}
      </CardContent>
      
      <CardFooter className="flex justify-end space-x-2">
        <Button variant="outline" onClick={fetchPaymentMethods} disabled={isLoading || isSaving}>
          Annulla
        </Button>
        <Button onClick={savePaymentMethods} disabled={isLoading || isSaving}>
          {isSaving ? (
            <>
              <div className="h-4 w-4 mr-2 animate-spin rounded-full border-2 border-primary border-t-transparent"></div>
              Salvataggio...
            </>
          ) : (
            <>
              <Save className="h-4 w-4 mr-2" />
              Salva Configurazione
            </>
          )}
        </Button>
      </CardFooter>
    </Card>
  );
}