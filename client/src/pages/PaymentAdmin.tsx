import { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { useToast } from "@/hooks/use-toast";
import { useCurrency } from "@/hooks/use-currency";
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
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuLabel, DropdownMenuSeparator, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { Calendar as CalendarComponent } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { cn } from "@/lib/utils";
import { apiRequest, queryClient } from '@/lib/queryClient';
import { useMutation } from "@tanstack/react-query";
import PaymentMethodsConfig from '@/components/payment/PaymentMethodsConfig';
import SubscriptionPlansAdmin from '@/components/SubscriptionPlansAdmin';
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
  Banknote,
  Loader2,
  Activity,
  Trash2,
  MoreHorizontal,
  Mail,
  MailCheck,
  MailX,
  MailMinus
} from 'lucide-react';
import { format } from 'date-fns';
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
  const { t } = useTranslation();
  const { toast } = useToast();
  const { symbol } = useCurrency();
  const [isLoading, setIsLoading] = useState(true);
  const [dashboardData, setDashboardData] = useState<any>(null);
  const [transactions, setTransactions] = useState<any[]>([]);
  const [subscriptions, setSubscriptions] = useState<any[]>([]);
  const [licenses, setLicenses] = useState<any[]>([]);
  const [showIban, setShowIban] = useState(false);
  const [bankingSettings, setBankingSettings] = useState<BankingSettings | null>(null);
  const [extendingUserId, setExtendingUserId] = useState<number | null>(null);
  const [editingDateField, setEditingDateField] = useState<{ licenseId: number; field: 'created' | 'expiry' } | null>(null);
  const [accessStats, setAccessStats] = useState<{ today: number; week: number; total: number; uniqueToday: number; uniqueWeek: number } | null>(null);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [deleteTargetUser, setDeleteTargetUser] = useState<{ id: number; username: string } | null>(null);
  const [deleteConfirmText, setDeleteConfirmText] = useState("");
  const [upgradeStaffTarget, setUpgradeStaffTarget] = useState<{ id: number; username: string } | null>(null);

  // Carica i dati automaticamente all'avvio del componente
  useEffect(() => {
    fetchDashboardData();
    fetchBankingSettings();
    fetchAccessStats();
  }, []);

  // Funzione per caricare le statistiche accessi
  const fetchAccessStats = async () => {
    try {
      const response = await apiRequest('GET', '/api/admin-license/access-stats');
      if (response.ok) {
        const data = await response.json();
        setAccessStats(data.stats);
      }
    } catch (error) {
      console.error('Error loading access statistics:', error);
    }
  };

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
      console.error('Error fetching data:', error);
      toast({
        title: t('paymentAdmin.toast.error'),
        description: t('paymentAdmin.toast.loadError'),
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
      console.error('Error fetching banking configuration:', error);
    }
  };

  // Funzione per aggiornare i dati
  const handleRefresh = () => {
    fetchDashboardData();
    fetchBankingSettings();
    toast({
      title: t('paymentAdmin.toast.refreshing'),
      description: t('paymentAdmin.toast.refreshingDesc'),
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
        title: t('paymentAdmin.toast.settingsSaved'),
        description: t('paymentAdmin.toast.settingsSavedDesc'),
      });
      fetchBankingSettings();
      triggerRefreshAfterSave('banking');
    },
    onError: () => {
      toast({
        title: t('paymentAdmin.toast.error'),
        description: t('paymentAdmin.toast.settingsSaveError'),
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
        title: t('paymentAdmin.toast.testCompleted'),
        description: data.message || t('paymentAdmin.toast.testCompletedDesc'),
      });
    },
    onError: () => {
      toast({
        title: t('paymentAdmin.toast.testFailed'),
        description: t('paymentAdmin.toast.testFailedDesc'),
        variant: "destructive",
      });
    },
  });

  // Mutation per estendere il trial di 40 giorni
  const extendTrialMutation = useMutation({
    mutationFn: async (userId: number) => {
      setExtendingUserId(userId);
      const response = await apiRequest('POST', '/api/admin-license/extend-trial', { userId });
      return await response.json();
    },
    onSuccess: (data) => {
      toast({
        title: t('paymentAdmin.toast.trialExtended'),
        description: data.message,
      });
      fetchDashboardData(); // Ricarica i dati per mostrare la nuova scadenza
      setExtendingUserId(null);
    },
    onError: (error: any) => {
      toast({
        title: t('paymentAdmin.toast.error'),
        description: error.message || t('paymentAdmin.toast.trialError'),
        variant: 'destructive',
      });
      setExtendingUserId(null);
    },
  });

  // Mutation per promuovere un utente a Staff (10 anni gratis)
  const upgradeToStaffMutation = useMutation({
    mutationFn: async (userId: number) => {
      const response = await apiRequest('POST', '/api/admin-license/upgrade-to-staff', { userId });
      return await response.json();
    },
    onSuccess: (data) => {
      toast({
        title: t('paymentAdmin.toast.staffUpgraded'),
        description: data.message,
      });
      fetchDashboardData();
    },
    onError: (error: any) => {
      toast({
        title: t('paymentAdmin.toast.error'),
        description: error.message || t('paymentAdmin.toast.staffUpgradeError'),
        variant: 'destructive',
      });
    },
  });

  // Mutation per aggiornare manualmente la data di scadenza
  const updateDateMutation = useMutation({
    mutationFn: async ({ userId, newDate, field }: { userId: number; newDate: Date; field: 'created' | 'expiry' }) => {
      const response = await apiRequest('POST', '/api/admin-license/update-expiry-date', {
        userId,
        newExpiryDate: newDate.toISOString(),
        field
      });
      return await response.json();
    },
    onSuccess: (data) => {
      toast({
        title: t('paymentAdmin.toast.dateUpdated'),
        description: data.message,
      });
      setEditingDateField(null);
      fetchDashboardData();
    },
    onError: (error: any) => {
      toast({
        title: t('paymentAdmin.toast.error'),
        description: error.message || t('paymentAdmin.toast.dateError'),
        variant: 'destructive',
      });
      setEditingDateField(null);
    },
  });

  const deleteUserMutation = useMutation({
    mutationFn: async (userId: number) => {
      const response = await apiRequest("DELETE", `/api/admin-license/delete-user/${userId}`);
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || "Failed to delete account");
      }
      return await response.json();
    },
    onSuccess: (data) => {
      toast({ title: t('paymentAdmin.toast.accountDeleted'), description: data.message || t('paymentAdmin.toast.accountDeletedDesc') });
      setDeleteDialogOpen(false);
      setDeleteTargetUser(null);
      setDeleteConfirmText("");
      fetchDashboardData();
    },
    onError: (error: any) => {
      toast({ title: t('paymentAdmin.toast.error'), description: error.message || t('paymentAdmin.toast.deleteError'), variant: "destructive" });
    },
  });

  // Handler per salvare configurazione bancaria (primo form)
  const handleSaveSettings = (formData: FormData) => {
    console.log('🏦 [PAYMENT ADMIN] handleSaveSettings called');
    console.log('🏦 [PAYMENT ADMIN] FormData received:', formData);
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
    console.log('🏦 [PAYMENT ADMIN] Settings estratti:', settings);
    console.log('🏦 [PAYMENT ADMIN] Invocazione mutation...');
    updateBankingMutation.mutate(settings);
  };

  // Handler per salvare SOLO configurazione pagamenti automatici (secondo form)
  const handleSavePaymentSettings = (formData: FormData) => {
    console.log('💳 [PAYMENT ADMIN] handleSavePaymentSettings called');
    
    // Prendiamo i dati bancari esistenti e aggiorniamo solo le impostazioni di pagamento
    const settings = {
      ...bankingSettings, // Mantieni tutti i dati bancari esistenti
      autoPayEnabled: formData.get('autoPayEnabled') === 'on',
      paymentDelay: parseInt(formData.get('paymentDelay') as string) || 30,
      minimumAmount: parseFloat(formData.get('minimumAmount') as string) || 1.0,
      description: formData.get('description') as string || 'Referral commission',
    };
    
    console.log('💳 [PAYMENT ADMIN] Settings updated:', settings);
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
      return format(new Date(dateString), 'dd MMM yyyy, HH:mm');
    } catch (error) {
      return t('paymentAdmin.dateInvalid');
    }
  };

  // Genera un badge per lo stato della transazione
  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'completed':
        return <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-800"><CheckCircle2 className="w-3 h-3 mr-1" /> {t('paymentAdmin.status.completed')}</span>;
      case 'pending':
        return <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-yellow-100 text-yellow-800"><Timer className="w-3 h-3 mr-1" /> {t('paymentAdmin.status.pending')}</span>;
      case 'failed':
        return <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-red-100 text-red-800"><AlertCircle className="w-3 h-3 mr-1" /> {t('paymentAdmin.status.failed')}</span>;
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

  // Calcola giorni rimanenti da una data di scadenza
  const calculateDaysLeft = (expiresAt: string | null) => {
    if (!expiresAt) return null;
    const now = new Date();
    const expiration = new Date(expiresAt);
    const diffTime = expiration.getTime() - now.getTime();
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    return Math.max(0, diffDays);
  };

  // Interfaccia amministrativa dei pagamenti
  return (
    <div className="min-h-screen p-4 bg-slate-50 dark:bg-slate-900">
      <header className="mb-8 flex justify-between items-center">
        <h1 className="text-3xl font-bold">{t('paymentAdmin.title')}</h1>
        <Button variant="outline" onClick={handleRefresh}>{t('paymentAdmin.refresh')}</Button>
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
                  <CardTitle className="text-sm font-medium text-muted-foreground">{t('paymentAdmin.kpi.totalRevenue')}</CardTitle>
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
                  <CardTitle className="text-sm font-medium text-muted-foreground">{t('paymentAdmin.kpi.activeSubs')}</CardTitle>
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
                  <CardTitle className="text-sm font-medium text-muted-foreground">{t('paymentAdmin.kpi.totalTx')}</CardTitle>
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
            <TabsList className="mb-4 h-auto flex-wrap justify-start">
              <TabsTrigger value="transactions">{t('paymentAdmin.tab.transactions')}</TabsTrigger>
              <TabsTrigger value="subscriptions">{t('paymentAdmin.tab.subscriptions')}</TabsTrigger>
              <TabsTrigger value="plans">{t('paymentAdmin.tab.plans')}</TabsTrigger>
              <TabsTrigger value="licenses">{t('paymentAdmin.tab.licenses')}</TabsTrigger>
              <TabsTrigger value="payment-methods" className="flex items-center gap-1">
                <Settings className="h-4 w-4" />
                <span>{t('paymentAdmin.tab.paymentMethods')}</span>
              </TabsTrigger>
              <TabsTrigger value="banking-config" className="flex items-center gap-1 bg-green-50 text-green-700 data-[state=active]:bg-green-600 data-[state=active]:text-white">
                <Shield className="h-4 w-4" />
                <span>{t('paymentAdmin.tab.bankingConfig')}</span>
              </TabsTrigger>
            </TabsList>
            
            <TabsContent value="transactions">
              <Card>
                <CardHeader>
                  <CardTitle>{t('paymentAdmin.transactions.title')}</CardTitle>
                  <CardDescription>
                    {t('paymentAdmin.transactions.description')}
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="rounded-md border overflow-hidden">
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>ID</TableHead>
                          <TableHead>{t('paymentAdmin.col.user')}</TableHead>
                          <TableHead>{t('paymentAdmin.col.date')}</TableHead>
                          <TableHead>{t('paymentAdmin.col.amount')}</TableHead>
                          <TableHead>{t('paymentAdmin.col.method')}</TableHead>
                          <TableHead>{t('paymentAdmin.col.status')}</TableHead>
                          <TableHead>{t('paymentAdmin.col.description')}</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {transactions.length > 0 ? (
                          transactions.map((transaction) => (
                            <TableRow key={transaction.id}>
                              <TableCell className="font-medium">
                                <div className="flex items-center gap-2">
                                  {transaction.id}
                                  {transaction.isTestData && (
                                    <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-amber-100 text-amber-800 border border-amber-200">
                                      DEMO
                                    </span>
                                  )}
                                </div>
                              </TableCell>
                              <TableCell>
                                <div className="flex flex-col gap-1">
                                  <div className="font-medium text-sm">
                                    {transaction.user?.username || `ID: ${transaction.userId}`}
                                  </div>
                                  <div className="flex flex-col text-xs text-muted-foreground">
                                    {transaction.user?.email && (
                                      <span>{transaction.user.email}</span>
                                    )}
                                    {transaction.user?.phone && (
                                      <span>{transaction.user.phone}</span>
                                    )}
                                  </div>
                                </div>
                              </TableCell>
                              <TableCell>{formatDate(transaction.createdAt)}</TableCell>
                              <TableCell>{formatCurrency(transaction.amount / 100)}</TableCell>
                              <TableCell>{getPaymentMethodBadge(transaction.paymentMethod)}</TableCell>
                              <TableCell>{getStatusBadge(transaction.status)}</TableCell>
                              <TableCell className="max-w-xs truncate">{transaction.description || '-'}</TableCell>
                            </TableRow>
                          ))
                        ) : (
                          <TableRow>
                            <TableCell colSpan={7} className="text-center py-4">
                              {t('paymentAdmin.transactions.empty')}
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
                  <CardTitle>{t('paymentAdmin.subs.title')}</CardTitle>
                  <CardDescription>
                    {t('paymentAdmin.subs.description')}
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="rounded-md border overflow-hidden">
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>ID</TableHead>
                          <TableHead>{t('paymentAdmin.col.user')}</TableHead>
                          <TableHead>{t('paymentAdmin.col.plan')}</TableHead>
                          <TableHead>{t('paymentAdmin.col.status')}</TableHead>
                          <TableHead>{t('paymentAdmin.col.start')}</TableHead>
                          <TableHead>{t('paymentAdmin.col.expiry')}</TableHead>
                          <TableHead>{t('paymentAdmin.col.method')}</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {subscriptions.length > 0 ? (
                          subscriptions.map((subscription) => (
                            <TableRow key={subscription.id}>
                              <TableCell className="font-medium">{subscription.id}</TableCell>
                              <TableCell>
                                <div className="flex flex-col gap-1">
                                  <div className="font-medium text-sm">
                                    {subscription.user?.username || `ID: ${subscription.userId}`}
                                  </div>
                                  <div className="flex flex-col text-xs text-muted-foreground">
                                    {subscription.user?.email && (
                                      <span>{subscription.user.email}</span>
                                    )}
                                    {subscription.user?.phone && (
                                      <span>{subscription.user.phone}</span>
                                    )}
                                  </div>
                                </div>
                              </TableCell>
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
                              {t('paymentAdmin.subs.empty')}
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
              <div className="space-y-4">
                <Card>
                  <CardHeader>
                    <CardTitle>{t('paymentAdmin.plans.title')}</CardTitle>
                    <CardDescription>
                      {t('paymentAdmin.plans.description')}
                    </CardDescription>
                  </CardHeader>
                </Card>
                <SubscriptionPlansAdmin />
              </div>
            </TabsContent>
            
            <TabsContent value="licenses">
              <Card>
                <CardHeader>
                  <CardTitle>{t('paymentAdmin.licenses.title')}</CardTitle>
                  <CardDescription>
                    {t('paymentAdmin.licenses.description')}
                  </CardDescription>
                  
                  {/* Widget Statistiche Accessi - compatto */}
                  {accessStats && (
                    <div className="mt-3 p-2.5 bg-muted/50 rounded-lg border flex items-center gap-3 flex-wrap text-sm">
                      <div className="flex items-center gap-1.5">
                        <Activity className="h-4 w-4 text-primary" />
                        <span className="font-medium">{t('paymentAdmin.access.label')}</span>
                      </div>
                      <div className="flex gap-3 flex-wrap">
                        <span className="text-muted-foreground">
                          {t('paymentAdmin.access.today')} <span className="font-semibold text-foreground">{accessStats.today}</span>
                          <span className="text-xs ml-1">({accessStats.uniqueToday} {t('paymentAdmin.access.users')})</span>
                        </span>
                        <span className="text-muted-foreground">
                          {t('paymentAdmin.access.week')} <span className="font-semibold text-foreground">{accessStats.week}</span>
                          <span className="text-xs ml-1">({accessStats.uniqueWeek} {t('paymentAdmin.access.users')})</span>
                        </span>
                        <span className="text-muted-foreground">
                          {t('paymentAdmin.access.total')} <span className="font-semibold text-foreground">{accessStats.total}</span>
                        </span>
                      </div>
                    </div>
                  )}
                </CardHeader>
                <CardContent>
                  <div className="space-y-3">
                    {licenses.length > 0 ? (
                      (() => {
                        // Mostra solo la licenza più recente per ogni utente
                        // (le licenze arrivano già ordinate per createdAt desc dal backend)
                        const seenUserIds = new Set<number>();
                        const uniqueLicenses = licenses.filter((lic) => {
                          const uid = lic.user?.id;
                          if (!uid) return true; // licenze senza utente le mostro tutte
                          if (seenUserIds.has(uid)) return false;
                          seenUserIds.add(uid);
                          return true;
                        });
                        return uniqueLicenses;
                      })().map((license) => {
                        const daysLeft = calculateDaysLeft(license.expiresAt);
                        
                        // Determina lo stato della licenza
                        const getStatusInfo = () => {
                          if (!license.isActive) {
                            return {
                              label: t('paymentAdmin.license.disabled'),
                              icon: <AlertCircle className="w-3 h-3 mr-1" />,
                              className: 'bg-red-100 text-red-800'
                            };
                          }
                          if (license.expiresAt && daysLeft !== null && daysLeft <= 0) {
                            return {
                              label: t('paymentAdmin.license.frozen'),
                              icon: <Timer className="w-3 h-3 mr-1" />,
                              className: 'bg-orange-100 text-orange-800'
                            };
                          }
                          return {
                            label: t('paymentAdmin.license.active'),
                            icon: <CheckCircle2 className="w-3 h-3 mr-1" />,
                            className: 'bg-green-100 text-green-800'
                          };
                        };
                        
                        const statusInfo = getStatusInfo();
                        
                        return (
                          <Card key={license.id} className="border-l-4 border-l-primary">
                            <CardContent className="p-4">
                              {/* Prima Riga: Info Utente e Stato */}
                              <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-3">
                                <div>
                                  <p className="text-xs text-muted-foreground mb-1">{t('paymentAdmin.license.user')}</p>
                                  <p className="font-medium text-sm">{license.user?.username || '-'}</p>
                                  <p className="text-xs text-muted-foreground">{license.user?.email || '-'}</p>
                                </div>
                                
                                <div>
                                  <p className="text-xs text-muted-foreground mb-1">{t('paymentAdmin.license.type')}</p>
                                  {getLicenseTypeBadge(license.type)}
                                </div>
                                
                                <div>
                                  <p className="text-xs text-muted-foreground mb-1">{t('paymentAdmin.license.status')}</p>
                                  <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${statusInfo.className}`}>
                                    {statusInfo.icon} {statusInfo.label}
                                  </span>
                                </div>
                                
                                <div className="flex gap-4 items-start">
                                  <div>
                                    <p className="text-xs text-muted-foreground mb-1">{t('paymentAdmin.license.id')}</p>
                                    <p className="font-mono text-sm">{license.id}</p>
                                  </div>
                                  <div>
                                    <p className="text-xs text-muted-foreground mb-1 flex items-center gap-1">
                                      <Activity className="h-3 w-3 text-primary" /> {t('paymentAdmin.license.accesses')}
                                    </p>
                                    <div className="flex gap-2 text-xs">
                                      <span title="Oggi" className="bg-blue-100 text-blue-800 px-1.5 py-0.5 rounded">
                                        {t('paymentAdmin.access.today')} <span className="font-semibold">{license.accessToday || 0}</span>
                                      </span>
                                      <span title="Ultimi 7 giorni" className="bg-green-100 text-green-800 px-1.5 py-0.5 rounded">
                                        {t('paymentAdmin.access.week')} <span className="font-semibold">{license.accessWeek || 0}</span>
                                      </span>
                                      <span title="Totale" className="bg-gray-100 text-gray-800 px-1.5 py-0.5 rounded">
                                        {t('paymentAdmin.license.totalShort')} <span className="font-semibold">{license.accessTotal || 0}</span>
                                      </span>
                                    </div>
                                  </div>
                                </div>
                              </div>
                              
                              {/* Badge Gmail / Google Calendar */}
                              {license.user && (() => {
                                const gs = license.gmailStatus;
                                if (!gs || gs === 'not_connected') return null;
                                if (gs === 'connected') {
                                  return (
                                    <div className="mt-2 inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium bg-green-100 text-green-800 border border-green-200">
                                      <MailCheck className="h-3.5 w-3.5" />
                                      {t('paymentAdmin.gmail.connected', 'Gmail connessa')}
                                    </div>
                                  );
                                }
                                if (gs === 'disabled_by_user') {
                                  return (
                                    <div className="mt-2 inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium bg-amber-100 text-amber-800 border border-amber-200">
                                      <MailMinus className="h-3.5 w-3.5" />
                                      {t('paymentAdmin.gmail.disabledByUser', 'Gmail disattivata dall\'utente')}
                                    </div>
                                  );
                                }
                                return null;
                              })()}
                              
                              <Separator className="my-3" />
                              
                              {/* Seconda Riga: Date e Giorni Rimanenti */}
                              <div className="grid grid-cols-3 gap-2 items-end">
                                <div className="min-w-0">
                                  <p className="text-xs text-muted-foreground mb-1">{t('paymentAdmin.license.created')}</p>
                                  <Popover>
                                    <PopoverTrigger asChild>
                                      <Button
                                        variant="outline"
                                        size="sm"
                                        className={cn(
                                          "w-full justify-start text-left font-normal h-8",
                                          !license.createdAt && "text-muted-foreground"
                                        )}
                                        data-testid={`edit-created-${license.id}`}
                                      >
                                        <Calendar className="mr-1 h-3 w-3 shrink-0" />
                                        <span className="text-xs truncate">{license.createdAt ? formatDate(license.createdAt) : t('paymentAdmin.license.select')}</span>
                                      </Button>
                                    </PopoverTrigger>
                                    <PopoverContent className="w-auto p-0" align="start">
                                      <CalendarComponent
                                        mode="single"
                                        selected={license.createdAt ? new Date(license.createdAt) : undefined}
                                        onSelect={(date) => {
                                          if (date && license.user?.id) {
                                            updateDateMutation.mutate({
                                              userId: license.user.id,
                                              newDate: date,
                                              field: 'created'
                                            });
                                          }
                                        }}
                                        initialFocus
                                      />
                                    </PopoverContent>
                                  </Popover>
                                </div>
                                
                                <div className="min-w-0">
                                  <p className="text-xs text-muted-foreground mb-1">{t('paymentAdmin.license.expiry')}</p>
                                  {license.type === 'passepartout' && !license.expiresAt ? (
                                    <div className="h-8 flex items-center">
                                      <span className="text-green-600 font-medium text-xs">{t('paymentAdmin.license.unlimited')}</span>
                                    </div>
                                  ) : (
                                    <Popover>
                                      <PopoverTrigger asChild>
                                        <Button
                                          variant="outline"
                                          size="sm"
                                          className={cn(
                                            "w-full justify-start text-left font-normal h-8",
                                            !license.expiresAt && "text-muted-foreground"
                                          )}
                                          data-testid={`edit-expiry-${license.id}`}
                                        >
                                          <Calendar className="mr-1 h-3 w-3 shrink-0" />
                                          <span className="text-xs truncate">{license.expiresAt ? formatDate(license.expiresAt) : t('paymentAdmin.license.select')}</span>
                                        </Button>
                                      </PopoverTrigger>
                                      <PopoverContent className="w-auto p-0" align="start">
                                        <CalendarComponent
                                          mode="single"
                                          selected={license.expiresAt ? new Date(license.expiresAt) : undefined}
                                          onSelect={(date) => {
                                            if (date && license.user?.id) {
                                              updateDateMutation.mutate({
                                                userId: license.user.id,
                                                newDate: date,
                                                field: 'expiry'
                                              });
                                            }
                                          }}
                                          disabled={(date) => date < new Date()}
                                          initialFocus
                                        />
                                      </PopoverContent>
                                    </Popover>
                                  )}
                                </div>
                                
                                <div className="min-w-0">
                                  <p className="text-xs text-muted-foreground mb-1">{t('paymentAdmin.license.daysLeft')}</p>
                                  {daysLeft !== null ? (
                                    <div className="flex flex-col">
                                      <span className={`font-semibold text-xs mb-1 ${
                                        daysLeft > 7 ? 'text-green-600' : 
                                        daysLeft > 0 ? 'text-orange-600' : 'text-red-600'
                                      }`}>
                                        {daysLeft} {t('paymentAdmin.license.days')}
                                      </span>
                                      <div className="w-full bg-gray-200 rounded-full h-2">
                                        <div 
                                          className={`h-2 rounded-full ${
                                            daysLeft > 30 ? 'bg-green-600' : 
                                            daysLeft > 7 ? 'bg-orange-600' : 'bg-red-600'
                                          }`}
                                          style={{ width: `${Math.min(100, (daysLeft / 40) * 100)}%` }}
                                        />
                                      </div>
                                    </div>
                                  ) : (
                                    <div className="h-8 flex items-center">
                                      <span className="text-muted-foreground text-xs">-</span>
                                    </div>
                                  )}
                                </div>
                                
                                <div>
                                  <p className="text-xs text-muted-foreground mb-1">{t('paymentAdmin.license.actions')}</p>
                                  <div className="flex items-center gap-1">
                                    {license.user?.id && (license.user as any).role !== 'admin' ? (
                                      <Button
                                        size="sm"
                                        className="h-8 flex-1"
                                        onClick={() => extendTrialMutation.mutate(license.user.id)}
                                        disabled={extendingUserId === license.user.id}
                                        data-testid={`button-extend-trial-${license.user.id}`}
                                      >
                                        {extendingUserId === license.user.id ? (
                                          <><Loader2 className="w-3 h-3 mr-1 animate-spin" /><span className="text-xs">{t('paymentAdmin.license.extending')}</span></>
                                        ) : (
                                          <span className="text-xs">{t('paymentAdmin.license.extend40')}</span>
                                        )}
                                      </Button>
                                    ) : (
                                      <div className="h-8 flex-1" />
                                    )}
                                    {license.user?.id && (
                                      <DropdownMenu>
                                        <DropdownMenuTrigger asChild>
                                          <Button variant="ghost" size="sm" className="h-8 w-8 p-0 shrink-0">
                                            <MoreHorizontal className="h-4 w-4" />
                                          </Button>
                                        </DropdownMenuTrigger>
                                        <DropdownMenuContent align="end">
                                          <DropdownMenuLabel>{t('paymentAdmin.license.actions')}</DropdownMenuLabel>
                                          <DropdownMenuSeparator />
                                          {license.type !== 'staff_free' && (
                                            <DropdownMenuItem
                                              onClick={() => {
                                                setUpgradeStaffTarget({
                                                  id: license.user.id,
                                                  username: license.user.username || license.user.email || `Utente ${license.user.id}`
                                                });
                                              }}
                                              data-testid={`button-upgrade-staff-${license.user.id}`}
                                            >
                                              <Shield className="h-4 w-4 mr-2" />
                                              {t('paymentAdmin.license.upgradeStaff')}
                                            </DropdownMenuItem>
                                          )}
                                          <DropdownMenuSeparator />
                                          <DropdownMenuItem
                                            className="text-destructive focus:text-destructive"
                                            onClick={() => {
                                              setDeleteTargetUser({ id: license.user.id, username: license.user.username || license.user.email || `Utente ${license.user.id}` });
                                              setDeleteConfirmText("");
                                              setDeleteDialogOpen(true);
                                            }}
                                          >
                                            <Trash2 className="h-4 w-4 mr-2" />
                                            {t('paymentAdmin.license.deleteAccount')}
                                          </DropdownMenuItem>
                                        </DropdownMenuContent>
                                      </DropdownMenu>
                                    )}
                                  </div>
                                </div>
                              </div>
                            </CardContent>
                          </Card>
                        );
                      })
                    ) : (
                      <Card>
                        <CardContent className="p-8 text-center">
                          <p className="text-muted-foreground">{t('paymentAdmin.license.empty')}</p>
                        </CardContent>
                      </Card>
                    )}
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
                  description: 'Referral commission - appointment management system',
                  isConfigured: false,
                };

                return (
                  <div className="space-y-6">
                    {/* Alert informativo */}
                    <Alert className="bg-green-50 border-green-200">
                      <Shield className="h-4 w-4 text-green-700" />
                      <AlertDescription className="text-green-800">
                        {t('paymentAdmin.banking.alert')}
                      </AlertDescription>
                    </Alert>

                    <div className="grid gap-6 lg:grid-cols-2">
                      {/* Configurazione dati bancari */}
                      <Card>
                        <CardHeader>
                          <CardTitle className="flex items-center gap-2">
                            <CreditCard className="h-5 w-5" />
                            {t('paymentAdmin.banking.title')}
                          </CardTitle>
                          <CardDescription>
                            {t('paymentAdmin.banking.description')}
                          </CardDescription>
                        </CardHeader>
                        <CardContent>
                          <form onSubmit={(e) => { e.preventDefault(); handleSaveSettings(new FormData(e.currentTarget)); }} className="space-y-4">
                            <div className="grid gap-2">
                              <Label htmlFor="bankName">{t('paymentAdmin.banking.bankName')}</Label>
                              <Input
                                id="bankName"
                                name="bankName"
                                defaultValue={currentSettings.bankName}
                                placeholder={t('paymentAdmin.banking.bankNamePlaceholder')}
                                required
                              />
                            </div>

                            <div className="grid gap-2">
                              <Label htmlFor="accountHolder">{t('paymentAdmin.banking.holder')}</Label>
                              <Input
                                id="accountHolder"
                                name="accountHolder"
                                defaultValue={currentSettings.accountHolder}
                                placeholder={t('paymentAdmin.banking.holderPlaceholder')}
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
                                  {showIban ? t('paymentAdmin.banking.hide') : t('paymentAdmin.banking.show')}
                                </Button>
                              </div>
                              {showIban ? (
                                <Input
                                  id="iban"
                                  name="iban"
                                  type="text"
                                  autoComplete="off"
                                  data-form-type="other"
                                  data-lpignore="true"
                                  defaultValue={currentSettings.iban}
                                  placeholder="IT60 X054 2811 1010 0000 0123 456"
                                  className="font-mono"
                                  required
                                />
                              ) : (
                                <>
                                  <div className="h-10 px-3 py-2 border rounded-md bg-muted font-mono text-sm flex items-center">
                                    {currentSettings.iban 
                                      ? '••••••••••••••••••••' + currentSettings.iban.slice(-4)
                                      : t('paymentAdmin.banking.ibanNotConfigured')}
                                  </div>
                                  <input type="hidden" name="iban" value={currentSettings.iban} />
                                </>
                              )}
                            </div>

                            <div className="grid gap-2">
                              <Label htmlFor="bic">BIC/SWIFT</Label>
                              <Input
                                id="bic"
                                name="bic"
                                defaultValue={currentSettings.bic}
                                placeholder={t('paymentAdmin.banking.bicPlaceholder')}
                              />
                            </div>

                            <div className="grid gap-2">
                              <Label htmlFor="address">{t('paymentAdmin.banking.address')}</Label>
                              <Textarea
                                id="address"
                                name="address"
                                defaultValue={currentSettings.address}
                                placeholder={t('paymentAdmin.banking.addressPlaceholder')}
                                rows={3}
                              />
                            </div>

                            <Button 
                              type="submit" 
                              className="w-full bg-green-600 hover:bg-green-700"
                              disabled={updateBankingMutation.isPending}
                            >
                              {updateBankingMutation.isPending ? t('paymentAdmin.banking.saving') : t('paymentAdmin.banking.save')}
                            </Button>
                          </form>
                        </CardContent>
                      </Card>

                      {/* Configurazione pagamenti automatici */}
                      <Card>
                        <CardHeader>
                          <CardTitle className="flex items-center gap-2">
                            <Settings className="h-5 w-5" />
                            {t('paymentAdmin.autopay.title')}
                          </CardTitle>
                          <CardDescription>
                            {t('paymentAdmin.autopay.description')}
                          </CardDescription>
                        </CardHeader>
                        <CardContent>
                          <form onSubmit={(e) => { e.preventDefault(); handleSavePaymentSettings(new FormData(e.currentTarget)); }} className="space-y-4">
                            <div className="flex items-center justify-between">
                              <div className="space-y-0.5">
                                <Label>{t('paymentAdmin.autopay.title')}</Label>
                                <p className="text-sm text-muted-foreground">
                                  {t('paymentAdmin.autopay.enableHint')}
                                </p>
                              </div>
                              <Switch 
                                name="autoPayEnabled"
                                defaultChecked={currentSettings.autoPayEnabled}
                              />
                            </div>

                            <Separator />

                            <div className="grid gap-2">
                              <Label htmlFor="paymentDelay">{t('paymentAdmin.autopay.delay')}</Label>
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
                                {t('paymentAdmin.autopay.delayHint')}
                              </p>
                            </div>

                            <div className="grid gap-2">
                              <Label htmlFor="minimumAmount">{t('paymentAdmin.autopay.minAmount')} ({symbol})</Label>
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
                                {t('paymentAdmin.autopay.minAmountHint')}
                              </p>
                            </div>

                            <div className="grid gap-2">
                              <Label htmlFor="description">{t('paymentAdmin.autopay.descriptionLabel')}</Label>
                              <Input
                                id="description"
                                name="description"
                                defaultValue={currentSettings.description}
                                placeholder={t('paymentAdmin.autopay.descriptionPlaceholder')}
                              />
                            </div>

                            <Button 
                              type="submit" 
                              variant="secondary" 
                              className="w-full"
                              disabled={updateBankingMutation.isPending}
                            >
                              {updateBankingMutation.isPending ? t('paymentAdmin.banking.saving') : t('paymentAdmin.autopay.save')}
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
                            {t('paymentAdmin.test.title')}
                          </CardTitle>
                        </CardHeader>
                        <CardContent className="space-y-4">
                          <p className="text-sm text-muted-foreground">
                            {t('paymentAdmin.test.description')}
                          </p>
                          
                          <Button 
                            onClick={() => testPaymentMutation.mutate()}
                            disabled={testPaymentMutation.isPending || !currentSettings.isConfigured}
                            className="w-full"
                          >
                            {testPaymentMutation.isPending ? t('paymentAdmin.test.running') : t('paymentAdmin.test.run')}
                          </Button>
                        </CardContent>
                      </Card>

                      {/* Riepilogo commissioni */}
                      <Card>
                        <CardHeader>
                          <CardTitle className="flex items-center gap-2">
                            <Euro className="h-5 w-5" />
                            {t('paymentAdmin.summary.title')}
                          </CardTitle>
                        </CardHeader>
                        <CardContent className="space-y-4">
                          <div className="grid grid-cols-2 gap-4 text-center">
                            <div className="space-y-1">
                              <div className="text-2xl font-bold text-green-600">25%</div>
                              <div className="text-sm text-muted-foreground">{t('paymentAdmin.summary.perSubscription')}</div>
                            </div>
                            <div className="space-y-1">
                              <div className="text-2xl font-bold text-blue-600">{currentSettings.paymentDelay}</div>
                              <div className="text-sm text-muted-foreground">{t('paymentAdmin.summary.waitingDays')}</div>
                            </div>
                          </div>
                          
                          <Separator />
                          
                          <div className="text-sm text-muted-foreground">
                            {t('paymentAdmin.summary.note', { days: currentSettings.paymentDelay })}
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

      <Dialog open={deleteDialogOpen} onOpenChange={(open) => {
        setDeleteDialogOpen(open);
        if (!open) { setDeleteTargetUser(null); setDeleteConfirmText(""); }
      }}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-destructive">
              <Trash2 className="h-5 w-5" /> {t('paymentAdmin.deleteDialog.title')}
            </DialogTitle>
            <DialogDescription>
              <span dangerouslySetInnerHTML={{ __html: t('paymentAdmin.deleteDialog.description', { username: deleteTargetUser?.username || '' }) }} />
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-2 py-2">
            <Label htmlFor="confirm-delete-payment">
              <span dangerouslySetInnerHTML={{ __html: t('paymentAdmin.deleteDialog.confirmHint', { username: deleteTargetUser?.username || '' }) }} />
            </Label>
            <Input
              id="confirm-delete-payment"
              value={deleteConfirmText}
              onChange={(e) => setDeleteConfirmText(e.target.value)}
              placeholder={deleteTargetUser?.username}
              disabled={deleteUserMutation.isPending}
            />
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => { setDeleteDialogOpen(false); setDeleteTargetUser(null); setDeleteConfirmText(""); }} disabled={deleteUserMutation.isPending}>
              {t('paymentAdmin.deleteDialog.cancel')}
            </Button>
            <Button
              variant="destructive"
              onClick={() => { if (deleteTargetUser) deleteUserMutation.mutate(deleteTargetUser.id); }}
              disabled={deleteUserMutation.isPending || deleteConfirmText !== deleteTargetUser?.username}
            >
              {deleteUserMutation.isPending ? (
                <><Loader2 className="h-4 w-4 mr-2 animate-spin" />{t('paymentAdmin.deleteDialog.deleting')}</>
              ) : t('paymentAdmin.deleteDialog.confirm')}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <AlertDialog open={!!upgradeStaffTarget} onOpenChange={(open) => { if (!open) setUpgradeStaffTarget(null); }}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle className="flex items-center gap-2">
              <Shield className="h-5 w-5 text-green-600" /> {t('paymentAdmin.staffDialog.title')}
            </AlertDialogTitle>
            <AlertDialogDescription asChild>
              <div dangerouslySetInnerHTML={{ __html: t('paymentAdmin.staffDialog.description', { username: upgradeStaffTarget?.username || '' }) }} />
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={upgradeToStaffMutation.isPending}>{t('paymentAdmin.deleteDialog.cancel')}</AlertDialogCancel>
            <AlertDialogAction
              onClick={(e) => {
                e.preventDefault();
                if (upgradeStaffTarget) {
                  upgradeToStaffMutation.mutate(upgradeStaffTarget.id, {
                    onSettled: () => setUpgradeStaffTarget(null)
                  });
                }
              }}
              disabled={upgradeToStaffMutation.isPending}
              className="bg-green-600 hover:bg-green-700"
              data-testid="button-confirm-upgrade-staff"
            >
              {upgradeToStaffMutation.isPending ? (
                <><Loader2 className="h-4 w-4 mr-2 animate-spin" />{t('paymentAdmin.staffDialog.promoting')}</>
              ) : t('paymentAdmin.staffDialog.confirm')}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}