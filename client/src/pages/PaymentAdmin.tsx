import { useState, useEffect } from 'react';
import { useToast } from "@/hooks/use-toast";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableHeader, TableBody, TableRow, TableHead, TableCell } from "@/components/ui/table";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Separator } from "@/components/ui/separator";
import { apiRequest, queryClient } from '@/lib/queryClient';
import { useMutation } from "@tanstack/react-query";
import PaymentMethodsConfig from '@/components/payment/PaymentMethodsConfig';
import { 
  Euro, 
  Users, 
  ArrowDownUp, 
  CreditCard, 
  CheckCircle2, 
  Timer, 
  AlertCircle,
  Tag,
  Wallet,
  KeyRound,
  UserCheck,
  Calendar,
  BadgeCheck,
  Settings,
  Shield,
  Banknote
} from 'lucide-react';
import { format } from 'date-fns';
import { it } from 'date-fns/locale';
import { triggerRefreshAfterSave } from "@/lib/autoRefresh";

interface BankingSettings {
  bankName: string;
  accountHolder: string;
  iban: string;
  bic: string;
  address: string;
  autoPayEnabled: boolean;
  paymentDelay: number;
  minimumAmount: number;
  description: string;
  isConfigured: boolean;
}

export default function PaymentAdmin() {
  const { toast } = useToast();
  const [isLoading, setIsLoading] = useState(true);
  const [dashboardData, setDashboardData] = useState<any>(null);
  const [transactions, setTransactions] = useState<any[]>([]);
  const [subscriptions, setSubscriptions] = useState<any[]>([]);
  const [licenses, setLicenses] = useState<any[]>([]);
  const [showIban, setShowIban] = useState(false);
  const [bankingSettings, setBankingSettings] = useState<BankingSettings | null>(null);

  // Carica i dati automaticamente all'avvio del componente
  useEffect(() => {
    fetchDashboardData();
    fetchBankingSettings();
  }, []);

  // Funzione per caricare i dati della dashboard
  const fetchDashboardData = async () => {
    setIsLoading(true);
    try {
      // Opzioni per includere il token di autenticazione per l'area admin
      const options = { withBetaAdminToken: true };
      
      // Carica dati dashboard
      const dashboardResponse = await apiRequest("GET", "/api/payments/payment-admin/dashboard", undefined, options);
      const dashboardData = await dashboardResponse.json();
      setDashboardData(dashboardData);

      // Carica transazioni
      const transactionsResponse = await apiRequest("GET", "/api/payments/payment-admin/transactions", undefined, options);
      const transactionsData = await transactionsResponse.json();
      setTransactions(transactionsData);

      // Carica abbonamenti
      const subscriptionsResponse = await apiRequest("GET", "/api/payments/payment-admin/subscriptions", undefined, options);
      const subscriptionsData = await subscriptionsResponse.json();
      setSubscriptions(subscriptionsData);

      // Carica licenze con dettagli utente
      const licensesResponse = await apiRequest("GET", "/api/payments/payment-admin/licenses", undefined, options);
      const licensesData = await licensesResponse.json();
      setLicenses(licensesData);
      
    } catch (error) {
      console.error('Errore durante il recupero dei dati:', error);
      toast({
        title: "Errore",
        description: "Impossibile caricare i dati del dashboard.",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  // Funzione per caricare configurazione bancaria
  const fetchBankingSettings = async () => {
    try {
      const response = await apiRequest("GET", "/api/admin/banking-settings");
      const data = await response.json();
      setBankingSettings(data);
    } catch (error) {
      console.error('Errore durante il recupero della configurazione bancaria:', error);
    }
  };

  // Funzione per aggiornare i dati
  const handleRefresh = () => {
    fetchDashboardData();
    fetchBankingSettings();
    toast({
      title: "Aggiornamento dati",
      description: "Aggiornamento dati in corso...",
    });
  };

  // Mutation per aggiornare la configurazione bancaria
  const updateBankingMutation = useMutation({
    mutationFn: async (settings: Partial<BankingSettings>) => {
      const response = await apiRequest("POST", "/api/admin/banking-settings", settings);
      return response.json();
    },
    onSuccess: () => {
      toast({
        title: "Impostazioni salvate",
        description: "Le impostazioni bancarie sono state aggiornate con successo",
      });
      fetchBankingSettings();
      triggerRefreshAfterSave('banking');
    },
    onError: () => {
      toast({
        title: "Errore",
        description: "Impossibile salvare le impostazioni bancarie",
        variant: "destructive",
      });
    },
  });

  // Mutation per testare il sistema di pagamento
  const testPaymentMutation = useMutation({
    mutationFn: async () => {
      const response = await apiRequest("POST", "/api/admin/test-payment");
      return response.json();
    },
    onSuccess: (data) => {
      toast({
        title: "Test completato",
        description: data.message || "Il sistema di pagamento è configurato correttamente",
      });
    },
    onError: () => {
      toast({
        title: "Test fallito",
        description: "Verifica la configurazione dei dati bancari",
        variant: "destructive",
      });
    },
  });

  // Handler per salvare configurazione bancaria
  const handleSaveSettings = (formData: FormData) => {
    const settings = {
      bankName: formData.get('bankName') as string,
      accountHolder: formData.get('accountHolder') as string,
      iban: formData.get('iban') as string,
      bic: formData.get('bic') as string,
      address: formData.get('address') as string,
      autoPayEnabled: formData.get('autoPayEnabled') === 'on',
      paymentDelay: parseInt(formData.get('paymentDelay') as string) || 30,
      minimumAmount: parseFloat(formData.get('minimumAmount') as string) || 1.0,
      description: formData.get('description') as string,
    };
    updateBankingMutation.mutate(settings);
  };

  // Genera un badge per il tipo di licenza
  const getLicenseTypeBadge = (type: string) => {
    switch (type) {
      case 'trial':
        return <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-800"><Timer className="w-3 h-3 mr-1" /> Trial</span>;
      case 'base':
        return <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-gray-100 text-gray-800"><Tag className="w-3 h-3 mr-1" /> Base</span>;
      case 'pro':
        return <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-purple-100 text-purple-800"><UserCheck className="w-3 h-3 mr-1" /> Pro</span>;
      case 'business':
        return <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-amber-100 text-amber-800"><Users className="w-3 h-3 mr-1" /> Business</span>;
      case 'staff':
        return <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-800"><BadgeCheck className="w-3 h-3 mr-1" /> Staff</span>;
      case 'passepartout':
        return <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-red-100 text-red-800"><KeyRound className="w-3 h-3 mr-1" /> Admin</span>;
      default:
        return <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-gray-100 text-gray-800">{type}</span>;
    }
  };

  // Formatta il valore in Euro
  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('it-IT', { 
      style: 'currency', 
      currency: 'EUR' 
    }).format(amount);
  };

  // Formatta la data
  const formatDate = (dateString: string) => {
    try {
      return format(new Date(dateString), 'dd MMM yyyy, HH:mm', { locale: it });
    } catch (error) {
      return 'Data non valida';
    }
  };

  // Genera un badge per lo stato della transazione
  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'completed':
        return <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-800"><CheckCircle2 className="w-3 h-3 mr-1" /> Completato</span>;
      case 'pending':
        return <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-yellow-100 text-yellow-800"><Timer className="w-3 h-3 mr-1" /> In attesa</span>;
      case 'failed':
        return <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-red-100 text-red-800"><AlertCircle className="w-3 h-3 mr-1" /> Fallito</span>;
      default:
        return <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-gray-100 text-gray-800">{status}</span>;
    }
  };

  // Genera un badge per il metodo di pagamento
  const getPaymentMethodBadge = (method: string) => {
    switch (method) {
      case 'paypal':
        return <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-800"><CreditCard className="w-3 h-3 mr-1" /> PayPal</span>;
      case 'wise':
        return <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-800"><Wallet className="w-3 h-3 mr-1" /> Wise</span>;
      case 'stripe':
        return <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-purple-100 text-purple-800"><CreditCard className="w-3 h-3 mr-1" /> Stripe</span>;
      default:
        return <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-gray-100 text-gray-800">{method}</span>;
    }
  };

  // Interfaccia amministrativa dei pagamenti
  return (
    <div className="min-h-screen p-4 bg-slate-50 dark:bg-slate-900">
      <header className="mb-8 flex justify-between items-center">
        <h1 className="text-3xl font-bold">Dashboard Amministrazione Pagamenti</h1>
        <Button variant="outline" onClick={handleRefresh}>Aggiorna Dati</Button>
      </header>

      {isLoading ? (
        <div className="flex justify-center items-center h-64">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
        </div>
      ) : (
        <div className="container mx-auto">
          {dashboardData && (
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm font-medium text-muted-foreground">Entrate Totali</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="flex items-center">
                    <Euro className="h-5 w-5 text-muted-foreground mr-2" />
                    <span className="text-2xl font-bold">{formatCurrency(dashboardData.totalRevenue)}</span>
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm font-medium text-muted-foreground">Abbonamenti Attivi</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="flex items-center">
                    <Users className="h-5 w-5 text-muted-foreground mr-2" />
                    <span className="text-2xl font-bold">{dashboardData.activeSubscriptions || 0}</span>
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm font-medium text-muted-foreground">Transazioni Totali</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="flex items-center">
                    <ArrowDownUp className="h-5 w-5 text-muted-foreground mr-2" />
                    <span className="text-2xl font-bold">{dashboardData.transactionCount || 0}</span>
                  </div>
                </CardContent>
              </Card>
            </div>
          )}

          <Tabs defaultValue="transactions" className="w-full">
            <TabsList className="mb-4">
              <TabsTrigger value="transactions">Transazioni</TabsTrigger>
              <TabsTrigger value="subscriptions">Abbonamenti</TabsTrigger>
              <TabsTrigger value="plans">Piani</TabsTrigger>
              <TabsTrigger value="licenses">Licenze</TabsTrigger>
              <TabsTrigger value="payment-methods" className="flex items-center gap-1">
                <Settings className="h-4 w-4" />
                <span>Metodi di Pagamento</span>
              </TabsTrigger>
              <TabsTrigger value="banking-config" className="flex items-center gap-1 bg-green-50 text-green-700 data-[state=active]:bg-green-600 data-[state=active]:text-white">
                <Shield className="h-4 w-4" />
                <span>Configurazione Bancaria</span>
              </TabsTrigger>
            </TabsList>
            
            <TabsContent value="transactions">
              <Card>
                <CardHeader>
                  <CardTitle>Ultime Transazioni</CardTitle>
                  <CardDescription>
                    Dettaglio delle ultime transazioni di pagamento
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="rounded-md border overflow-hidden">
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>ID</TableHead>
                          <TableHead>Data</TableHead>
                          <TableHead>Importo</TableHead>
                          <TableHead>Metodo</TableHead>
                          <TableHead>Stato</TableHead>
                          <TableHead>Descrizione</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {transactions.length > 0 ? (
                          transactions.map((transaction) => (
                            <TableRow key={transaction.id}>
                              <TableCell className="font-medium">{transaction.id}</TableCell>
                              <TableCell>{formatDate(transaction.createdAt)}</TableCell>
                              <TableCell>{formatCurrency(transaction.amount / 100)}</TableCell>
                              <TableCell>{getPaymentMethodBadge(transaction.paymentMethod)}</TableCell>
                              <TableCell>{getStatusBadge(transaction.status)}</TableCell>
                              <TableCell className="max-w-xs truncate">{transaction.description || '-'}</TableCell>
                            </TableRow>
                          ))
                        ) : (
                          <TableRow>
                            <TableCell colSpan={6} className="text-center py-4">
                              Nessuna transazione trovata
                            </TableCell>
                          </TableRow>
                        )}
                      </TableBody>
                    </Table>
                  </div>
                </CardContent>
              </Card>
            </TabsContent>
            
            <TabsContent value="subscriptions">
              <Card>
                <CardHeader>
                  <CardTitle>Abbonamenti</CardTitle>
                  <CardDescription>
                    Elenco degli abbonamenti attivi e scaduti
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="rounded-md border overflow-hidden">
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>ID</TableHead>
                          <TableHead>Utente</TableHead>
                          <TableHead>Piano</TableHead>
                          <TableHead>Stato</TableHead>
                          <TableHead>Inizio</TableHead>
                          <TableHead>Scadenza</TableHead>
                          <TableHead>Metodo</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {subscriptions.length > 0 ? (
                          subscriptions.map((subscription) => (
                            <TableRow key={subscription.id}>
                              <TableCell className="font-medium">{subscription.id}</TableCell>
                              <TableCell>{subscription.userId}</TableCell>
                              <TableCell>{subscription.plan?.name || '-'}</TableCell>
                              <TableCell>{getStatusBadge(subscription.status)}</TableCell>
                              <TableCell>{formatDate(subscription.currentPeriodStart)}</TableCell>
                              <TableCell>{formatDate(subscription.currentPeriodEnd)}</TableCell>
                              <TableCell>{getPaymentMethodBadge(subscription.paymentMethod || '-')}</TableCell>
                            </TableRow>
                          ))
                        ) : (
                          <TableRow>
                            <TableCell colSpan={7} className="text-center py-4">
                              Nessun abbonamento trovato
                            </TableCell>
                          </TableRow>
                        )}
                      </TableBody>
                    </Table>
                  </div>
                </CardContent>
              </Card>
            </TabsContent>
            
            <TabsContent value="plans">
              <Card>
                <CardHeader>
                  <CardTitle>Piani di Abbonamento</CardTitle>
                  <CardDescription>
                    Dettaglio dei piani di abbonamento disponibili
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="rounded-md border overflow-hidden">
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>ID</TableHead>
                          <TableHead>Nome</TableHead>
                          <TableHead>Prezzo</TableHead>
                          <TableHead>Intervallo</TableHead>
                          <TableHead>Stato</TableHead>
                          <TableHead>Features</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {dashboardData?.plans?.length > 0 ? (
                          dashboardData.plans.map((plan: any) => (
                            <TableRow key={plan.id}>
                              <TableCell className="font-medium">{plan.id}</TableCell>
                              <TableCell>{plan.name}</TableCell>
                              <TableCell>{formatCurrency(plan.price / 100)}</TableCell>
                              <TableCell>{plan.interval === 'month' ? 'Mensile' : 'Annuale'}</TableCell>
                              <TableCell>
                                {plan.isActive ? (
                                  <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-800">
                                    <CheckCircle2 className="w-3 h-3 mr-1" /> Attivo
                                  </span>
                                ) : (
                                  <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-gray-100 text-gray-800">
                                    Inattivo
                                  </span>
                                )}
                              </TableCell>
                              <TableCell>
                                {plan.features && typeof plan.features === 'string' ? (
                                  <div className="flex flex-wrap gap-1">
                                    {JSON.parse(plan.features).map((feature: string, index: number) => (
                                      <span key={index} className="inline-flex items-center px-2 py-0.5 rounded text-xs bg-blue-50 text-blue-800">
                                        <Tag className="w-3 h-3 mr-1" /> {feature}
                                      </span>
                                    ))}
                                  </div>
                                ) : (
                                  '-'
                                )}
                              </TableCell>
                            </TableRow>
                          ))
                        ) : (
                          <TableRow>
                            <TableCell colSpan={6} className="text-center py-4">
                              Nessun piano di abbonamento trovato
                            </TableCell>
                          </TableRow>
                        )}
                      </TableBody>
                    </Table>
                  </div>
                </CardContent>
              </Card>
            </TabsContent>
            
            <TabsContent value="licenses">
              <Card>
                <CardHeader>
                  <CardTitle>Licenze</CardTitle>
                  <CardDescription>
                    Gestione delle licenze e degli utenti associati
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="rounded-md border overflow-hidden">
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>ID</TableHead>
                          <TableHead>Utente</TableHead>
                          <TableHead>Email</TableHead>
                          <TableHead>Tipo</TableHead>
                          <TableHead>Stato</TableHead>
                          <TableHead>Data Creazione</TableHead>
                          <TableHead>Scadenza</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {licenses.length > 0 ? (
                          licenses.map((license) => (
                            <TableRow key={license.id}>
                              <TableCell className="font-medium">{license.id}</TableCell>
                              <TableCell>{license.user?.username || '-'}</TableCell>
                              <TableCell>{license.user?.email || '-'}</TableCell>
                              <TableCell>{getLicenseTypeBadge(license.type)}</TableCell>
                              <TableCell>
                                {license.isActive ? (
                                  <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-800">
                                    <CheckCircle2 className="w-3 h-3 mr-1" /> Attiva
                                  </span>
                                ) : (
                                  <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-red-100 text-red-800">
                                    <AlertCircle className="w-3 h-3 mr-1" /> Scaduta
                                  </span>
                                )}
                              </TableCell>
                              <TableCell>{formatDate(license.createdAt)}</TableCell>
                              <TableCell>
                                {license.expiresAt ? formatDate(license.expiresAt) : 
                                 license.type === 'passepartout' ? 
                                  <span className="text-green-600 font-medium">Illimitata</span> : '-'}
                              </TableCell>
                            </TableRow>
                          ))
                        ) : (
                          <TableRow>
                            <TableCell colSpan={7} className="text-center py-4">
                              Nessuna licenza trovata
                            </TableCell>
                          </TableRow>
                        )}
                      </TableBody>
                    </Table>
                  </div>
                </CardContent>
              </Card>
            </TabsContent>
            
            {/* Tab Metodi di Pagamento */}
            <TabsContent value="payment-methods">
              <PaymentMethodsConfig />
            </TabsContent>
            
            {/* Tab Configurazione Bancaria */}
            <TabsContent value="banking-config">
              {(() => {
                const currentSettings = bankingSettings || {
                  bankName: '',
                  accountHolder: '',
                  iban: '',
                  bic: '',
                  address: '',
                  autoPayEnabled: false,
                  paymentDelay: 30,
                  minimumAmount: 1.0,
                  description: 'Commissione referral sistema gestione appuntamenti',
                  isConfigured: false,
                };

                return (
                  <div className="space-y-6">
                    {/* Alert informativo */}
                    <Alert className="bg-green-50 border-green-200">
                      <Shield className="h-4 w-4 text-green-700" />
                      <AlertDescription className="text-green-800">
                        Questi dati vengono utilizzati per elaborare automaticamente i pagamenti delle commissioni referral allo staff. 
                        Tutti i dati sono crittografati e conservati in sicurezza.
                      </AlertDescription>
                    </Alert>

                    <div className="grid gap-6 lg:grid-cols-2">
                      {/* Configurazione dati bancari */}
                      <Card>
                        <CardHeader>
                          <CardTitle className="flex items-center gap-2">
                            <CreditCard className="h-5 w-5" />
                            Dati Bancari Admin
                          </CardTitle>
                          <CardDescription>
                            IBAN aziendale dove ricevere i pagamenti dai clienti
                          </CardDescription>
                        </CardHeader>
                        <CardContent>
                          <form action={handleSaveSettings} className="space-y-4">
                            <div className="grid gap-2">
                              <Label htmlFor="bankName">Nome Banca</Label>
                              <Input
                                id="bankName"
                                name="bankName"
                                defaultValue={currentSettings.bankName}
                                placeholder="es. Intesa Sanpaolo"
                                required
                              />
                            </div>

                            <div className="grid gap-2">
                              <Label htmlFor="accountHolder">Intestatario Conto</Label>
                              <Input
                                id="accountHolder"
                                name="accountHolder"
                                defaultValue={currentSettings.accountHolder}
                                placeholder="Nome e Cognome / Ragione Sociale"
                                required
                              />
                            </div>

                            <div className="grid gap-2">
                              <div className="flex items-center justify-between">
                                <Label htmlFor="iban">IBAN</Label>
                                <Button 
                                  type="button"
                                  variant="ghost" 
                                  size="sm"
                                  onClick={() => setShowIban(!showIban)}
                                >
                                  {showIban ? "Nascondi" : "Mostra"}
                                </Button>
                              </div>
                              <Input
                                id="iban"
                                name="iban"
                                type={showIban ? "text" : "password"}
                                defaultValue={currentSettings.iban}
                                placeholder="IT60 X054 2811 1010 0000 0123 456"
                                className="font-mono"
                                required
                              />
                            </div>

                            <div className="grid gap-2">
                              <Label htmlFor="bic">BIC/SWIFT</Label>
                              <Input
                                id="bic"
                                name="bic"
                                defaultValue={currentSettings.bic}
                                placeholder="es. BCITITMM"
                              />
                            </div>

                            <div className="grid gap-2">
                              <Label htmlFor="address">Indirizzo</Label>
                              <Textarea
                                id="address"
                                name="address"
                                defaultValue={currentSettings.address}
                                placeholder="Indirizzo completo per fatturazione"
                                rows={3}
                              />
                            </div>

                            <Button 
                              type="submit" 
                              className="w-full bg-green-600 hover:bg-green-700"
                              disabled={updateBankingMutation.isPending}
                            >
                              {updateBankingMutation.isPending ? "Salvando..." : "Salva Dati Bancari"}
                            </Button>
                          </form>
                        </CardContent>
                      </Card>

                      {/* Configurazione pagamenti automatici */}
                      <Card>
                        <CardHeader>
                          <CardTitle className="flex items-center gap-2">
                            <Settings className="h-5 w-5" />
                            Pagamenti Automatici
                          </CardTitle>
                          <CardDescription>
                            Configura le commissioni per i referral staff
                          </CardDescription>
                        </CardHeader>
                        <CardContent>
                          <form action={handleSaveSettings} className="space-y-4">
                            <div className="flex items-center justify-between">
                              <div className="space-y-0.5">
                                <Label>Pagamenti Automatici</Label>
                                <p className="text-sm text-muted-foreground">
                                  Abilita i pagamenti automatici delle commissioni
                                </p>
                              </div>
                              <Switch 
                                name="autoPayEnabled"
                                defaultChecked={currentSettings.autoPayEnabled}
                              />
                            </div>

                            <Separator />

                            <div className="grid gap-2">
                              <Label htmlFor="paymentDelay">Ritardo Pagamento (giorni)</Label>
                              <Input
                                id="paymentDelay"
                                name="paymentDelay"
                                type="number"
                                min="1"
                                max="90"
                                defaultValue={currentSettings.paymentDelay}
                                placeholder="30"
                              />
                              <p className="text-sm text-muted-foreground">
                                Giorni di attesa prima di processare il pagamento
                              </p>
                            </div>

                            <div className="grid gap-2">
                              <Label htmlFor="minimumAmount">Importo Minimo (€)</Label>
                              <Input
                                id="minimumAmount"
                                name="minimumAmount"
                                type="number"
                                min="0.01"
                                step="0.01"
                                defaultValue={currentSettings.minimumAmount}
                                placeholder="1.00"
                              />
                              <p className="text-sm text-muted-foreground">
                                Importo minimo per processare un pagamento
                              </p>
                            </div>

                            <div className="grid gap-2">
                              <Label htmlFor="description">Descrizione Pagamento</Label>
                              <Input
                                id="description"
                                name="description"
                                defaultValue={currentSettings.description}
                                placeholder="Descrizione che apparirà nei bonifici"
                              />
                            </div>

                            <Button 
                              type="submit" 
                              variant="secondary" 
                              className="w-full"
                              disabled={updateBankingMutation.isPending}
                            >
                              {updateBankingMutation.isPending ? "Salvando..." : "Salva Configurazione"}
                            </Button>
                          </form>
                        </CardContent>
                      </Card>
                    </div>

                    {/* Test e statistiche */}
                    <div className="grid gap-6 lg:grid-cols-2">
                      {/* Test sistema */}
                      <Card>
                        <CardHeader>
                          <CardTitle className="flex items-center gap-2">
                            <Banknote className="h-5 w-5" />
                            Test Sistema
                          </CardTitle>
                        </CardHeader>
                        <CardContent className="space-y-4">
                          <p className="text-sm text-muted-foreground">
                            Verifica che la configurazione sia corretta eseguendo un test del sistema di pagamento.
                          </p>
                          
                          <Button 
                            onClick={() => testPaymentMutation.mutate()}
                            disabled={testPaymentMutation.isPending || !currentSettings.isConfigured}
                            className="w-full"
                          >
                            {testPaymentMutation.isPending ? "Test in corso..." : "Testa Configurazione"}
                          </Button>
                        </CardContent>
                      </Card>

                      {/* Riepilogo commissioni */}
                      <Card>
                        <CardHeader>
                          <CardTitle className="flex items-center gap-2">
                            <Euro className="h-5 w-5" />
                            Riepilogo Commissioni
                          </CardTitle>
                        </CardHeader>
                        <CardContent className="space-y-4">
                          <div className="grid grid-cols-2 gap-4 text-center">
                            <div className="space-y-1">
                              <div className="text-2xl font-bold text-green-600">10%</div>
                              <div className="text-sm text-muted-foreground">Per abbonamento</div>
                            </div>
                            <div className="space-y-1">
                              <div className="text-2xl font-bold text-blue-600">{currentSettings.paymentDelay}</div>
                              <div className="text-sm text-muted-foreground">Giorni di attesa</div>
                            </div>
                          </div>
                          
                          <Separator />
                          
                          <div className="text-sm text-muted-foreground">
                            Le commissioni vengono pagate automaticamente {currentSettings.paymentDelay} giorni dopo ogni abbonamento sponsorizzato.
                          </div>
                        </CardContent>
                      </Card>
                    </div>
                  </div>
                );
              })()}
            </TabsContent>
          </Tabs>
        </div>
      )}
    </div>
  );
}