import { useState, useEffect } from 'react';
import { useToast } from "@/hooks/use-toast";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableHeader, TableBody, TableRow, TableHead, TableCell } from "@/components/ui/table";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Checkbox } from "@/components/ui/checkbox";
import { apiRequest } from '@/lib/queryClient';
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
  Loader2
} from 'lucide-react';
import { format } from 'date-fns';
import { it } from 'date-fns/locale';

export default function PaymentAdmin() {
  const { toast } = useToast();
  const [isLoading, setIsLoading] = useState(true);
  const [dashboardData, setDashboardData] = useState<any>(null);
  const [transactions, setTransactions] = useState<any[]>([]);
  const [subscriptions, setSubscriptions] = useState<any[]>([]);
  const [licenses, setLicenses] = useState<any[]>([]);
  
  // Stati per dialog configurazione admin
  const [isAdminConfigDialogOpen, setIsAdminConfigDialogOpen] = useState(false);
  const [isSavingAdminConfig, setIsSavingAdminConfig] = useState(false);
  
  // Configurazione admin
  const [adminBankingConfig, setAdminBankingConfig] = useState({
    adminIban: "",
    adminBank: "",
    adminAccountHolder: "",
    paymentApiKey: "",
    dailyLimit: 500,
    autoPaymentsEnabled: false
  });

  // Carica i dati automaticamente all'avvio del componente
  useEffect(() => {
    fetchDashboardData();
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

  // Funzione per aggiornare i dati
  const handleRefresh = () => {
    fetchDashboardData();
    toast({
      title: "Aggiornamento dati",
      description: "Aggiornamento dati in corso...",
    });
  };

  // Funzione per salvare la configurazione bancaria admin
  const saveAdminConfig = async () => {
    if (!adminBankingConfig.adminIban) {
      toast({
        variant: "destructive",
        title: "Errore",
        description: "L'IBAN dell'amministratore è obbligatorio",
      });
      return;
    }

    setIsSavingAdminConfig(true);

    try {
      const response = await fetch('/api/admin/config', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(adminBankingConfig),
      });

      if (response.ok) {
        setIsAdminConfigDialogOpen(false);
        toast({
          title: "Successo",
          description: "Configurazione bancaria salvata con successo",
        });
      } else {
        const errorData = await response.json();
        throw new Error(errorData.message || "Errore durante il salvataggio della configurazione");
      }
    } catch (err: any) {
      toast({
        variant: "destructive",
        title: "Errore",
        description: err.message || "Impossibile salvare la configurazione",
      });
    } finally {
      setIsSavingAdminConfig(false);
    }
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
        <div className="flex gap-3">
          <Button 
            onClick={() => setIsAdminConfigDialogOpen(true)}
            className="bg-green-600 hover:bg-green-700 text-white"
          >
            <Shield className="mr-2 h-4 w-4" />
            Configurazione Bancaria
          </Button>
          <Button variant="outline" onClick={handleRefresh}>Aggiorna Dati</Button>
        </div>
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
          </Tabs>
        </div>
      )}

      {/* Dialog Configurazione Bancaria Admin */}
      <Dialog open={isAdminConfigDialogOpen} onOpenChange={setIsAdminConfigDialogOpen}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Shield className="h-5 w-5 text-blue-600" />
              Configurazione Bancaria Admin
            </DialogTitle>
            <DialogDescription>
              Configura i dati bancari aziendali dove ricevere i pagamenti dai clienti
            </DialogDescription>
          </DialogHeader>
          
          <div className="space-y-6 py-4">
            <div className="space-y-2">
              <Label htmlFor="adminIban">IBAN Aziendale *</Label>
              <Input
                id="adminIban"
                value={adminBankingConfig.adminIban}
                onChange={(e) => setAdminBankingConfig(prev => ({
                  ...prev,
                  adminIban: e.target.value
                }))}
                placeholder="IT60 X054 2811 1010 0000 0123 456"
                className="font-mono"
              />
              <p className="text-sm text-muted-foreground">
                Su questo IBAN riceverai i pagamenti dei clienti via Stripe/PayPal
              </p>
            </div>
            
            <div className="space-y-2">
              <Label htmlFor="adminBank">Banca</Label>
              <Input
                id="adminBank"
                value={adminBankingConfig.adminBank}
                onChange={(e) => setAdminBankingConfig(prev => ({
                  ...prev,
                  adminBank: e.target.value
                }))}
                placeholder="Nome della banca"
              />
            </div>
            
            <div className="space-y-2">
              <Label htmlFor="adminAccountHolder">Intestatario Conto</Label>
              <Input
                id="adminAccountHolder"
                value={adminBankingConfig.adminAccountHolder}
                onChange={(e) => setAdminBankingConfig(prev => ({
                  ...prev,
                  adminAccountHolder: e.target.value
                }))}
                placeholder="Nome completo intestatario"
              />
            </div>
            
            <div className="space-y-2">
              <Label htmlFor="paymentApiKey">API Key Pagamenti (opzionale)</Label>
              <Input
                id="paymentApiKey"
                type="password"
                value={adminBankingConfig.paymentApiKey}
                onChange={(e) => setAdminBankingConfig(prev => ({
                  ...prev,
                  paymentApiKey: e.target.value
                }))}
                placeholder="API key per servizio bonifici automatici"
              />
            </div>
            
            <div className="space-y-2">
              <Label htmlFor="dailyLimit">Limite Giornaliero (€)</Label>
              <Input
                id="dailyLimit"
                type="number"
                value={adminBankingConfig.dailyLimit}
                onChange={(e) => setAdminBankingConfig(prev => ({
                  ...prev,
                  dailyLimit: parseFloat(e.target.value) || 0
                }))}
                placeholder="500"
              />
            </div>
            
            <div className="flex items-center space-x-2">
              <Checkbox
                id="autoPaymentsEnabled"
                checked={adminBankingConfig.autoPaymentsEnabled}
                onCheckedChange={(checked) => setAdminBankingConfig(prev => ({
                  ...prev,
                  autoPaymentsEnabled: checked as boolean
                }))}
              />
              <Label htmlFor="autoPaymentsEnabled">
                Abilita pagamenti automatici (futuro)
              </Label>
            </div>
          </div>
          
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setIsAdminConfigDialogOpen(false)}
              disabled={isSavingAdminConfig}
            >
              Annulla
            </Button>
            <Button
              onClick={saveAdminConfig}
              disabled={isSavingAdminConfig || !adminBankingConfig.adminIban}
            >
              {isSavingAdminConfig ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Salvataggio...
                </>
              ) : (
                <>
                  <Shield className="mr-2 h-4 w-4" />
                  Salva Configurazione
                </>
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}