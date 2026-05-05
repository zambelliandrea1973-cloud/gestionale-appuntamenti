// @ts-nocheck
import React, { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { Card, CardContent, CardHeader, CardTitle, CardDescription, CardFooter } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useToast } from '@/hooks/use-toast';
import { useMutation, useQuery } from '@tanstack/react-query';
import { apiRequest, queryClient, getQueryFn } from '@/lib/queryClient';
import { useAuth } from '@/hooks/use-auth';
import {
  Table,
  TableBody,
  TableCaption,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { 
  Loader2, 
  Copy, 
  Check, 
  X, 
  RefreshCw,
  Euro, 
  Users, 
  ArrowDownUp, 
  CreditCard, 
  CheckCircle2, 
  Timer, 
  AlertCircle,
  Tag,
  Wallet
} from 'lucide-react';
import { format } from 'date-fns';

// Tipo per i dati del form di creazione invito
interface InviteFormData {
  email: string;
  maxUses: number;
  expiryDays: number;
}

// Tipo per l'invito beta
interface BetaInvitation {
  id: number;
  invitationCode: string;
  email: string;
  maxUses: number;
  usedCount: number;
  createdAt: string;
  expiresAt: string | null;
  isUsed: boolean;
  usedById: number | null;
  usedAt: string | null;
  notes: string | null;
}

// Tipo per i dati del feedback
interface BetaFeedback {
  id: number;
  userId: number;
  username: string;
  feedbackType: string;
  content: string;
  rating: number;
  createdAt: string;
  status: 'pending' | 'reviewed' | 'implemented';
}

// Interfacce per la dashboard dei pagamenti
interface PaymentDashboardData {
  totalRecurringRevenue: number;
  totalSubscribers: number;
  totalTransactions: number;
  transactionsByMonth: {
    month: string;
    amount: number;
  }[];
  totalRevenue: number;
  plans?: any[];
}

interface Transaction {
  id: number;
  userId: number;
  amount: number;
  paymentMethod: string;
  status: string;
  createdAt: string;
  description: string;
}

interface Subscription {
  id: number;
  userId: number;
  status: string;
  currentPeriodStart: string;
  currentPeriodEnd: string;
  paymentMethod: string;
  plan?: {
    id: number;
    name: string;
    price: number;
  };
}

// Formatta la data in formato leggibile
const formatDate = (dateString: string) => {
  if (!dateString) return '-';
  return format(new Date(dateString), 'dd/MM/yyyy HH:mm');
};

// Formatta la valuta in Euro
const formatCurrency = (amount: number) => {
  return new Intl.NumberFormat('it-IT', { style: 'currency', currency: 'EUR' }).format(amount);
};

// Genera un badge per lo stato della transazione/abbonamento
const getStatusBadge = (status: string, t: (key: string) => string) => {
  switch (status?.toLowerCase()) {
    case 'active':
    case 'attivo':
    case 'completed':
    case 'completato':
    case 'paid':
    case 'pagato':
      return (
        <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-800">
          <CheckCircle2 className="w-3 h-3 mr-1" /> {t('betaAdmin.statusActive')}
        </span>
      );
    case 'pending':
    case 'in attesa':
      return (
        <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-yellow-100 text-yellow-800">
          <Timer className="w-3 h-3 mr-1" /> {t('betaAdmin.statusPending')}
        </span>
      );
    case 'failed':
    case 'fallito':
    case 'canceled':
    case 'cancellato':
      return (
        <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-red-100 text-red-800">
          <AlertCircle className="w-3 h-3 mr-1" /> {t('betaAdmin.statusFailed')}
        </span>
      );
    default:
      return (
        <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-gray-100 text-gray-800">
          {status || t('betaAdmin.unknown')}
        </span>
      );
  }
};

// Genera un badge per il metodo di pagamento
const getPaymentMethodBadge = (method: string, t: (key: string) => string) => {
  const methodLower = method?.toLowerCase() || '';
  
  if (methodLower.includes('stripe')) {
    return (
      <span className="inline-flex items-center px-2 py-0.5 rounded text-xs bg-blue-50 text-blue-800">
        <CreditCard className="w-3 h-3 mr-1" /> Stripe
      </span>
    );
  } else if (methodLower.includes('wise')) {
    return (
      <span className="inline-flex items-center px-2 py-0.5 rounded text-xs bg-green-50 text-green-800">
        <Wallet className="w-3 h-3 mr-1" /> Wise
      </span>
    );
  } else if (methodLower.includes('paypal')) {
    return (
      <span className="inline-flex items-center px-2 py-0.5 rounded text-xs bg-indigo-50 text-indigo-800">
        <Wallet className="w-3 h-3 mr-1" /> PayPal
      </span>
    );
  } else {
    return (
      <span className="inline-flex items-center px-2 py-0.5 rounded text-xs bg-gray-100 text-gray-800">
        <Wallet className="w-3 h-3 mr-1" /> {method || t('betaAdmin.unknown')}
      </span>
    );
  }
};

export default function BetaAdmin() {
  const { t } = useTranslation();
  const { toast } = useToast();
  const { user } = useAuth();
  const [adminPassword, setAdminPassword] = useState('');
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [isChangingPassword, setIsChangingPassword] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [showNewPassword, setShowNewPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [inviteData, setInviteData] = useState<InviteFormData>({
    email: '',
    maxUses: 1,
    expiryDays: 30
  });
  const [copiedCode, setCopiedCode] = useState<string | null>(null);

  // Query per ottenere tutti gli inviti beta
  const { data: invitations = [], isLoading: invitationsLoading, refetch: refetchInvitations } = useQuery<BetaInvitation[]>({
    queryKey: ['/api/beta/invitations'],
    queryFn: getQueryFn({ 
      on401: "throw",
      withBetaAdminToken: true 
    }),
    enabled: isAuthenticated, // Esegui solo se autenticato con la password beta admin
  });

  // Query per ottenere tutti i feedback
  const { data: feedbacks = [], isLoading: feedbacksLoading, refetch: refetchFeedbacks } = useQuery<BetaFeedback[]>({
    queryKey: ['/api/beta/feedback'],
    queryFn: getQueryFn({ 
      on401: "throw",
      withBetaAdminToken: true 
    }),
    enabled: isAuthenticated, // Esegui solo se autenticato con la password beta admin
  });
  
  // Query per ottenere la dashboard dei pagamenti
  const { data: dashboardData, isLoading: dashboardLoading, refetch: refetchDashboard } = useQuery<PaymentDashboardData>({
    queryKey: ['/api/payment/dashboard'],
    queryFn: getQueryFn({ 
      on401: "throw",
      withBetaAdminToken: true 
    }),
    enabled: isAuthenticated, // Esegui solo se autenticato con la password beta admin
  });
  
  // Query per ottenere le transazioni
  const { data: transactions = [], isLoading: transactionsLoading, refetch: refetchTransactions } = useQuery<Transaction[]>({
    queryKey: ['/api/payment/transactions'],
    queryFn: getQueryFn({ 
      on401: "throw",
      withBetaAdminToken: true 
    }),
    enabled: isAuthenticated, // Esegui solo se autenticato con la password beta admin
  });
  
  // Query per ottenere gli abbonamenti
  const { data: subscriptions = [], isLoading: subscriptionsLoading, refetch: refetchSubscriptions } = useQuery<Subscription[]>({
    queryKey: ['/api/payment/subscriptions'],
    queryFn: getQueryFn({ 
      on401: "throw",
      withBetaAdminToken: true 
    }),
    enabled: isAuthenticated, // Esegui solo se autenticato con la password beta admin
  });
  
  // Interfaccia per i dati delle licenze
  interface License {
    id: number;
    code: string;
    type: string;
    isActive: boolean;
    createdAt: string;
    activatedAt: string | null;
    expiresAt: string | null;
    userId: number | null;
    user: {
      id: number | null;
      username: string;
      email: string | null;
      type: string;
      role: string;
      createdAt: string;
      clientId?: number;
      clientName?: string | null;
    } | null;
    subscription: {
      id: number;
      status: string;
      planId: number;
      planName: string;
      currentPeriodStart: string;
      currentPeriodEnd: string;
    } | null;
  }
  
  // Query per ottenere le licenze
  const { data: licenses = [], isLoading: licensesLoading, refetch: refetchLicenses } = useQuery<License[]>({
    queryKey: ['/api/payments/payment-admin/licenses'],
    queryFn: getQueryFn({ 
      on401: "throw",
      withBetaAdminToken: true 
    }),
    enabled: isAuthenticated, // Esegui solo se autenticato con la password beta admin
  });

  // Mutation per creare un nuovo invito
  const createInviteMutation = useMutation({
    mutationFn: async (data: InviteFormData) => {
      const res = await apiRequest('POST', '/api/beta/invitations', data, { withBetaAdminToken: true });
      return await res.json();
    },
    onSuccess: () => {
      toast({
        title: t('betaAdmin.toast.inviteCreated'),
        description: t('betaAdmin.toast.inviteCreatedDesc'),
        variant: 'default',
      });
      // Reset del form
      setInviteData({
        email: '',
        maxUses: 1,
        expiryDays: 30
      });
      // Aggiorna la lista degli inviti
      refetchInvitations();
    },
    onError: (error: Error) => {
      toast({
        title: t('betaAdmin.toast.error'),
        description: t('betaAdmin.toast.inviteError'),
        variant: 'destructive',
      });
    }
  });

  // Mutation per aggiornare lo stato di un feedback
  const updateFeedbackStatusMutation = useMutation({
    mutationFn: async ({ id, status }: { id: number, status: string }) => {
      const res = await apiRequest('PUT', `/api/beta/feedback/${id}`, { status }, { withBetaAdminToken: true });
      return await res.json();
    },
    onSuccess: () => {
      toast({
        title: t('betaAdmin.toast.feedbackUpdated'),
        description: t('betaAdmin.toast.feedbackUpdatedDesc'),
        variant: 'default',
      });
      // Aggiorna la lista dei feedback
      refetchFeedbacks();
    },
    onError: (error: Error) => {
      toast({
        title: t('betaAdmin.toast.error'),
        description: t('betaAdmin.toast.feedbackUpdateError'),
        variant: 'destructive',
      });
    }
  });

  const handleCreateInvite = (e: React.FormEvent) => {
    e.preventDefault();
    if (!inviteData.email) {
      toast({
        title: t('betaAdmin.toast.emailMissing'),
        description: t('betaAdmin.toast.emailMissingDesc'),
        variant: 'destructive',
      });
      return;
    }
    
    // Mostra un messaggio di operazione in corso
    toast({
      title: t('betaAdmin.toast.creating'),
      description: t('betaAdmin.toast.creatingDesc'),
    });
    
    createInviteMutation.mutate(inviteData);
  };

  const copyToClipboard = (code: string) => {
    navigator.clipboard.writeText(code)
      .then(() => {
        setCopiedCode(code);
        toast({
          title: t('betaAdmin.toast.codeCopied'),
          description: t('betaAdmin.toast.codeCopiedDesc'),
          variant: 'default',
        });
        
        // Reset dello stato dopo 3 secondi
        setTimeout(() => {
          setCopiedCode(null);
        }, 3000);
      })
      .catch(() => {
        toast({
          title: t('betaAdmin.toast.error'),
          description: t('betaAdmin.toast.copyError'),
          variant: 'destructive',
        });
      });
  };

  const handleUpdateFeedbackStatus = (id: number, status: 'pending' | 'reviewed' | 'implemented') => {
    updateFeedbackStatusMutation.mutate({ id, status });
  };
  
  const getCurrentPassword = () => {
    return sessionStorage.getItem('betaAdminPassword') || '';
  };
  
  const handleAdminLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!adminPassword) {
      toast({ title: t('betaAdmin.toast.passwordRequired'), variant: 'destructive' });
      return;
    }
    
    try {
      const response = await fetch('/api/beta/invitations', {
        method: 'GET',
        headers: {
          'X-Beta-Admin-Token': adminPassword,
          'Accept': 'application/json'
        }
      });
      
      if (response.ok || response.status !== 401) {
        setIsAuthenticated(true);
        sessionStorage.setItem('betaAdminPassword', adminPassword);
        sessionStorage.setItem('betaAdminAuthenticated', 'true');
        document.documentElement.setAttribute('data-beta-admin-auth', 'true');
        
        toast({
          title: t('betaAdmin.toast.loginSuccess'),
          description: t('betaAdmin.toast.loginSuccessDesc'),
          variant: 'default',
        });
        
        setTimeout(() => {
          window.location.reload();
        }, 1000);
      } else {
        toast({
          title: t('betaAdmin.toast.accessDenied'),
          description: t('betaAdmin.toast.accessDeniedDesc'),
          variant: 'destructive',
        });
      }
    } catch (error) {
      console.error('Error during login:', error);
      toast({
        title: t('betaAdmin.toast.loginError'),
        description: t('betaAdmin.toast.loginErrorDesc'),
        variant: 'destructive',
      });
    }
  };
  
  const handlePasswordChange = (e: React.FormEvent) => {
    e.preventDefault();
    
    if (newPassword.length < 6) {
      toast({
        title: t('betaAdmin.toast.passwordTooShort'),
        description: t('betaAdmin.toast.passwordTooShortDesc'),
        variant: 'destructive'
      });
      return;
    }
    
    if (newPassword !== confirmPassword) {
      toast({
        title: t('betaAdmin.toast.passwordMismatch'),
        description: t('betaAdmin.toast.passwordMismatchDesc'),
        variant: 'destructive'
      });
      return;
    }
    
    sessionStorage.setItem('betaAdminPassword', newPassword);
    
    // Aggiorna anche il valore nella variabile di stato per mantenerlo sincronizzato
    setAdminPassword(newPassword);
    
    console.log('Administrative password updated');
    
    toast({
      title: t('betaAdmin.toast.passwordUpdated'),
      description: t('betaAdmin.toast.passwordUpdatedDesc'),
      variant: 'default'
    });
    
    // Reset del form
    setNewPassword('');
    setConfirmPassword('');
    setIsChangingPassword(false);
  };
  
  // Controlla se l'utente è già autenticato all'avvio e imposta la password memorizzata
  useEffect(() => {
    console.log('Verifying BetaAdmin authentication on startup');
    try {
      const isAuthenticatedFromSession = sessionStorage.getItem('betaAdminAuthenticated') === 'true';
      
      const savedPassword = sessionStorage.getItem('betaAdminPassword') || '';
      if (savedPassword) {
        setAdminPassword(savedPassword);
      }
      
      if (isAuthenticatedFromSession && savedPassword) {
        setIsAuthenticated(true);
        document.documentElement.setAttribute('data-beta-admin-auth', 'true');
      } else {
        console.log('No authentication found, login required');
        
        // Pulisci qualsiasi residuo di autenticazione precedente
        document.documentElement.removeAttribute('data-beta-admin-auth');
      }
    } catch (error) {
      console.error('Error verifying authentication:', error);
      // In caso di errore, ripristina lo stato pulito
      setIsAuthenticated(false);
    }
  }, []);
  
  // Se l'utente non è autenticato, mostra il form di login
  if (!isAuthenticated) {
    return (
      <div className="container py-10 mx-auto">
        <Card className="max-w-md mx-auto">
          <CardHeader>
            <CardTitle>{t('betaAdmin.login.title')}</CardTitle>
            <CardDescription>
              {t('betaAdmin.login.description')}
            </CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleAdminLogin} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="adminPassword">{t('betaAdmin.login.passwordLabel')}</Label>
                <div className="relative">
                  <Input
                    id="adminPassword"
                    type={showPassword ? "text" : "password"}
                    placeholder={t('betaAdmin.login.passwordPlaceholder')}
                    value={adminPassword}
                    onChange={(e) => setAdminPassword(e.target.value)}
                  />
                  <button
                    type="button"
                    className="absolute inset-y-0 right-0 pr-3 flex items-center text-sm leading-5"
                    onClick={() => setShowPassword(!showPassword)}
                  >
                    {showPassword ? (
                      <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-5 h-5">
                        <path strokeLinecap="round" strokeLinejoin="round" d="M3.98 8.223A10.477 10.477 0 0 0 1.934 12C3.226 16.338 7.244 19.5 12 19.5c.993 0 1.953-.138 2.863-.395M6.228 6.228A10.451 10.451 0 0 1 12 4.5c4.756 0 8.773 3.162 10.065 7.498a10.522 10.522 0 0 1-4.293 5.774M6.228 6.228 3 3m3.228 3.228 3.65 3.65m7.894 7.894L21 21m-3.228-3.228-3.65-3.65m0 0a3 3 0 1 0-4.243-4.243m4.242 4.242L9.88 9.88" />
                      </svg>
                    ) : (
                      <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-5 h-5">
                        <path strokeLinecap="round" strokeLinejoin="round" d="M2.036 12.322a1.012 1.012 0 0 1 0-.639C3.423 7.51 7.36 4.5 12 4.5c4.638 0 8.573 3.007 9.963 7.178.07.207.07.431 0 .639C20.577 16.49 16.64 19.5 12 19.5c-4.638 0-8.573-3.007-9.963-7.178Z" />
                        <path strokeLinecap="round" strokeLinejoin="round" d="M15 12a3 3 0 1 1-6 0 3 3 0 0 1 6 0Z" />
                      </svg>
                    )}
                  </button>
                </div>
              </div>
              <Button type="submit" className="w-full">
                {t('betaAdmin.login.submit')}
              </Button>
            </form>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="container py-10 mx-auto">
      <div className="max-w-6xl mx-auto space-y-8">
        <h1 className="text-4xl font-extrabold tracking-tight">{t('betaAdmin.title')}</h1>
        
        <Tabs defaultValue="beta" className="w-full">
          <TabsList className="mb-4">
            <TabsTrigger value="beta">{t('betaAdmin.tabs.beta')}</TabsTrigger>
            <TabsTrigger value="payments">{t('betaAdmin.tabs.payments')}</TabsTrigger>
          </TabsList>
          
          <TabsContent value="beta">
            {/* Sezione Creazione Inviti */}
            <Card className="mb-6">
              <CardHeader>
                <CardTitle>{t('betaAdmin.create.title')}</CardTitle>
                <CardDescription>
                  {t('betaAdmin.create.description')}
                </CardDescription>
              </CardHeader>
              <CardContent>
                <form onSubmit={handleCreateInvite} className="space-y-4">
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <div className="space-y-2">
                      <Label htmlFor="email">{t('betaAdmin.create.emailLabel')}</Label>
                      <Input
                        id="email"
                        type="email"
                        placeholder="esempio@email.com"
                        value={inviteData.email}
                        onChange={(e) => setInviteData({...inviteData, email: e.target.value})}
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="maxUses">{t('betaAdmin.create.maxUsesLabel')}</Label>
                      <Input
                        id="maxUses"
                        type="number"
                        min="1"
                        value={inviteData.maxUses}
                        onChange={(e) => setInviteData({...inviteData, maxUses: parseInt(e.target.value)})}
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="expiryDays">{t('betaAdmin.create.expiryLabel')}</Label>
                      <Input
                        id="expiryDays"
                        type="number"
                        min="1"
                        value={inviteData.expiryDays}
                        onChange={(e) => setInviteData({...inviteData, expiryDays: parseInt(e.target.value)})}
                      />
                    </div>
                  </div>
                  <Button 
                    type="submit" 
                    className="w-full"
                    disabled={createInviteMutation.isPending}
                  >
                    {createInviteMutation.isPending ? (
                      <>
                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                        {t('betaAdmin.create.creating')}
                      </>
                    ) : (
                      t('betaAdmin.create.submit')
                    )}
                  </Button>
                </form>
              </CardContent>
            </Card>

            {/* Sezione Lista Inviti */}
            <Card className="mb-6">
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <div>
                  <CardTitle>{t('betaAdmin.list.title')}</CardTitle>
                  <CardDescription>
                    {t('betaAdmin.list.description')}
                  </CardDescription>
                </div>
                <Button variant="outline" size="sm" onClick={() => refetchInvitations()}>
                  <RefreshCw className="h-4 w-4 mr-2" />
                  {t('betaAdmin.refresh')}
                </Button>
              </CardHeader>
              <CardContent>
                {invitationsLoading ? (
                  <div className="flex justify-center py-8">
                    <Loader2 className="h-8 w-8 animate-spin text-primary" />
                  </div>
                ) : invitations && invitations.length > 0 ? (
                  <Table>
                    <TableCaption>{t('betaAdmin.list.caption')}</TableCaption>
                    <TableHeader>
                      <TableRow>
                        <TableHead>{t('betaAdmin.col.code')}</TableHead>
                        <TableHead>{t('betaAdmin.col.email')}</TableHead>
                        <TableHead>{t('betaAdmin.col.usage')}</TableHead>
                        <TableHead>{t('betaAdmin.col.createdOn')}</TableHead>
                        <TableHead>{t('betaAdmin.col.expiry')}</TableHead>
                        <TableHead>{t('betaAdmin.col.status')}</TableHead>
                        <TableHead className="text-right">{t('betaAdmin.col.actions')}</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {invitations.map((invite: BetaInvitation) => (
                        <TableRow key={invite.id}>
                          <TableCell className="font-mono font-medium">{invite.invitationCode}</TableCell>
                          <TableCell>{invite.email}</TableCell>
                          <TableCell>{invite.usedCount} / {invite.maxUses}</TableCell>
                          <TableCell>{new Date(invite.createdAt).toLocaleDateString()}</TableCell>
                          <TableCell>
                            {invite.expiresAt ? new Date(invite.expiresAt).toLocaleDateString() : t('betaAdmin.notExpiring')}
                          </TableCell>
                          <TableCell>
                            {invite.isUsed ? (
                              <Badge variant="destructive">{t('betaAdmin.badge.used')}</Badge>
                            ) : new Date(invite.expiresAt || '') < new Date() ? (
                              <Badge variant="outline">{t('betaAdmin.badge.expired')}</Badge>
                            ) : (
                              <Badge variant="default" className="bg-green-500">{t('betaAdmin.badge.active')}</Badge>
                            )}
                          </TableCell>
                          <TableCell className="text-right">
                            <Button 
                              variant="ghost" 
                              size="sm"
                              onClick={() => copyToClipboard(invite.invitationCode)}
                            >
                              {copiedCode === invite.invitationCode ? (
                                <Check className="h-4 w-4" />
                              ) : (
                                <Copy className="h-4 w-4" />
                              )}
                            </Button>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                ) : (
                  <div className="text-center py-8 text-gray-500">
                    {t('betaAdmin.list.empty')}
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Sezione Feedback */}
            <Card className="mb-6">
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <div>
                  <CardTitle>{t('betaAdmin.feedback.title')}</CardTitle>
                  <CardDescription>
                    {t('betaAdmin.feedback.description')}
                  </CardDescription>
                </div>
                <Button variant="outline" size="sm" onClick={() => refetchFeedbacks()}>
                  <RefreshCw className="h-4 w-4 mr-2" />
                  {t('betaAdmin.refresh')}
                </Button>
              </CardHeader>
              <CardContent>
                {feedbacksLoading ? (
                  <div className="flex justify-center py-8">
                    <Loader2 className="h-8 w-8 animate-spin text-primary" />
                  </div>
                ) : feedbacks && feedbacks.length > 0 ? (
                  <Table>
                    <TableCaption>{t('betaAdmin.feedback.caption')}</TableCaption>
                    <TableHeader>
                      <TableRow>
                        <TableHead>{t('betaAdmin.col.user')}</TableHead>
                        <TableHead>{t('betaAdmin.col.type')}</TableHead>
                        <TableHead>{t('betaAdmin.col.content')}</TableHead>
                        <TableHead>{t('betaAdmin.col.rating')}</TableHead>
                        <TableHead>{t('betaAdmin.col.date')}</TableHead>
                        <TableHead>{t('betaAdmin.col.status')}</TableHead>
                        <TableHead className="text-right">{t('betaAdmin.col.actions')}</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {feedbacks.map((feedback: BetaFeedback) => (
                        <TableRow key={feedback.id}>
                          <TableCell>{feedback.username}</TableCell>
                          <TableCell>
                            <Badge variant="outline">
                              {feedback.feedbackType === 'general' && t('betaAdmin.feedback.general')}
                              {feedback.feedbackType === 'bug' && t('betaAdmin.feedback.bug')}
                              {feedback.feedbackType === 'feature' && t('betaAdmin.feedback.feature')}
                              {feedback.feedbackType === 'usability' && t('betaAdmin.feedback.usability')}
                            </Badge>
                          </TableCell>
                          <TableCell className="max-w-xs truncate">{feedback.content}</TableCell>
                          <TableCell>{feedback.rating}/5</TableCell>
                          <TableCell>{new Date(feedback.createdAt).toLocaleDateString()}</TableCell>
                          <TableCell>
                            {feedback.status === 'pending' && (
                              <Badge variant="outline">{t('betaAdmin.feedback.statusPending')}</Badge>
                            )}
                            {feedback.status === 'reviewed' && (
                              <Badge variant="secondary">{t('betaAdmin.feedback.statusReviewed')}</Badge>
                            )}
                            {feedback.status === 'implemented' && (
                              <Badge variant="default" className="bg-green-500">{t('betaAdmin.feedback.statusImplemented')}</Badge>
                            )}
                          </TableCell>
                          <TableCell className="text-right space-x-1">
                            <Button 
                              variant="ghost" 
                              size="sm"
                              onClick={() => handleUpdateFeedbackStatus(feedback.id, 'reviewed')}
                            >
                              <Check className="h-4 w-4" />
                            </Button>
                            <Button 
                              variant="ghost" 
                              size="sm"
                              onClick={() => handleUpdateFeedbackStatus(feedback.id, 'implemented')}
                            >
                              <Check className="h-4 w-4 text-green-500" />
                            </Button>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                ) : (
                  <div className="text-center py-8 text-gray-500">
                    {t('betaAdmin.feedback.empty')}
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Sezione Dashboard */}
            <Card className="mb-6">
              <CardHeader>
                <CardTitle>{t('betaAdmin.dashboard.title')}</CardTitle>
                <CardDescription>
                  {t('betaAdmin.dashboard.description')}
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                  <div className="flex flex-col space-y-2 p-4 border rounded-lg">
                    <span className="text-sm text-gray-500">{t('betaAdmin.dashboard.activeCodes')}</span>
                    <span className="text-3xl font-bold">
                      {invitations ? invitations.filter((i: BetaInvitation) => !i.isUsed && new Date(i.expiresAt || '') > new Date()).length : 0}
                    </span>
                  </div>
                  <div className="flex flex-col space-y-2 p-4 border rounded-lg">
                    <span className="text-sm text-gray-500">{t('betaAdmin.dashboard.betaTesters')}</span>
                    <span className="text-3xl font-bold">
                      {invitations ? invitations.filter((i: BetaInvitation) => i.isUsed).length : 0}
                    </span>
                  </div>
                  <div className="flex flex-col space-y-2 p-4 border rounded-lg">
                    <span className="text-sm text-gray-500">{t('betaAdmin.dashboard.feedbackReceived')}</span>
                    <span className="text-3xl font-bold">
                      {feedbacks ? feedbacks.length : 0}
                    </span>
                  </div>
                </div>
              </CardContent>
            </Card>
            
            {/* Sezione Cambio Password */}
            <Card>
              <CardHeader className="flex flex-row items-center justify-between">
                <div>
                  <CardTitle>{t('betaAdmin.security.title')}</CardTitle>
                  <CardDescription>
                    {t('betaAdmin.security.description')}
                  </CardDescription>
                </div>
                <Button 
                  variant="outline" 
                  onClick={() => setIsChangingPassword(!isChangingPassword)}
                >
                  {isChangingPassword ? t('betaAdmin.security.cancel') : t('betaAdmin.security.changePassword')}
                </Button>
              </CardHeader>
              <CardContent>
                {isChangingPassword ? (
                  <form onSubmit={handlePasswordChange} className="space-y-4">
                    <div className="space-y-2">
                      <Label htmlFor="newPassword">{t('betaAdmin.security.newPassword')}</Label>
                      <div className="relative">
                        <Input
                          id="newPassword"
                          type={showNewPassword ? "text" : "password"}
                          placeholder={t('betaAdmin.security.newPasswordPlaceholder')}
                          value={newPassword}
                          onChange={(e) => setNewPassword(e.target.value)}
                          className="pr-10"
                        />
                        <button
                          type="button"
                          className="absolute inset-y-0 right-0 pr-3 flex items-center text-sm leading-5"
                          onClick={() => setShowNewPassword(!showNewPassword)}
                        >
                          {showNewPassword ? <X className="h-4 w-4" /> : <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-5 h-5">
                            <path strokeLinecap="round" strokeLinejoin="round" d="M2.036 12.322a1.012 1.012 0 0 1 0-.639C3.423 7.51 7.36 4.5 12 4.5c4.638 0 8.573 3.007 9.963 7.178.07.207.07.431 0 .639C20.577 16.49 16.64 19.5 12 19.5c-4.638 0-8.573-3.007-9.963-7.178Z" />
                            <path strokeLinecap="round" strokeLinejoin="round" d="M15 12a3 3 0 1 1-6 0 3 3 0 0 1 6 0Z" />
                          </svg>}
                        </button>
                      </div>
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="confirmPassword">{t('betaAdmin.security.confirmPassword')}</Label>
                      <div className="relative">
                        <Input
                          id="confirmPassword"
                          type={showConfirmPassword ? "text" : "password"}
                          placeholder={t('betaAdmin.security.confirmPasswordPlaceholder')}
                          value={confirmPassword}
                          onChange={(e) => setConfirmPassword(e.target.value)}
                          className="pr-10"
                        />
                        <button
                          type="button"
                          className="absolute inset-y-0 right-0 pr-3 flex items-center text-sm leading-5"
                          onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                        >
                          {showConfirmPassword ? <X className="h-4 w-4" /> : <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-5 h-5">
                            <path strokeLinecap="round" strokeLinejoin="round" d="M2.036 12.322a1.012 1.012 0 0 1 0-.639C3.423 7.51 7.36 4.5 12 4.5c4.638 0 8.573 3.007 9.963 7.178.07.207.07.431 0 .639C20.577 16.49 16.64 19.5 12 19.5c-4.638 0-8.573-3.007-9.963-7.178Z" />
                            <path strokeLinecap="round" strokeLinejoin="round" d="M15 12a3 3 0 1 1-6 0 3 3 0 0 1 6 0Z" />
                          </svg>}
                        </button>
                      </div>
                    </div>
                    <Button type="submit" className="w-full">{t('betaAdmin.security.savePassword')}</Button>
                  </form>
                ) : (
                  <div className="text-center py-4">
                    <p>{t('betaAdmin.security.statusOk')} <span className="text-sm text-gray-500">{t('betaAdmin.security.lastChange')} {sessionStorage.getItem('betaAdminPassword') ? t('betaAdmin.security.activeSession') : t('betaAdmin.security.notSet')}</span></p>
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>
          
          <TabsContent value="payments">
            {/* Sezione Dashboard Pagamenti */}
            <Card className="mb-6">
              <CardHeader>
                <CardTitle>{t('betaAdmin.payments.dashboardTitle')}</CardTitle>
                <CardDescription>
                  {t('betaAdmin.payments.dashboardDescription')}
                </CardDescription>
              </CardHeader>
              <CardContent>
                {dashboardLoading ? (
                  <div className="flex justify-center py-8">
                    <Loader2 className="h-8 w-8 animate-spin text-primary" />
                  </div>
                ) : dashboardData ? (
                  <>
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-6">
                      <div className="flex flex-col space-y-2 p-4 border rounded-lg">
                        <span className="text-sm text-gray-500">{t('betaAdmin.payments.recurringRevenue')}</span>
                        <span className="text-3xl font-bold">
                          {formatCurrency(dashboardData.totalRecurringRevenue)}
                        </span>
                      </div>
                      <div className="flex flex-col space-y-2 p-4 border rounded-lg">
                        <span className="text-sm text-gray-500">{t('betaAdmin.payments.totalSubscribers')}</span>
                        <span className="text-3xl font-bold">
                          {dashboardData.totalSubscribers}
                        </span>
                      </div>
                      <div className="flex flex-col space-y-2 p-4 border rounded-lg">
                        <span className="text-sm text-gray-500">{t('betaAdmin.payments.totalTransactions')}</span>
                        <span className="text-3xl font-bold">
                          {dashboardData.totalTransactions}
                        </span>
                      </div>
                    </div>
                    
                    <div>
                      <h3 className="text-lg font-medium mb-4">{t('betaAdmin.payments.monthlyRevenue')}</h3>
                      <div className="h-64 w-full">
                        {dashboardData.transactionsByMonth?.length > 0 ? (
                          <div className="grid grid-cols-12 h-full gap-2">
                            {dashboardData.transactionsByMonth.map((item, index) => (
                              <div key={index} className="flex flex-col items-center justify-end">
                                <div 
                                  className="bg-primary w-full rounded-t-sm" 
                                  style={{ 
                                    height: `${Math.max(
                                      5, 
                                      (item.amount / Math.max(...dashboardData.transactionsByMonth.map(i => i.amount))) * 100
                                    )}%` 
                                  }}
                                ></div>
                                <span className="text-xs mt-1 text-gray-500">{item.month}</span>
                              </div>
                            ))}
                          </div>
                        ) : (
                          <div className="flex items-center justify-center h-full border rounded-md bg-gray-50">
                            <p className="text-gray-500">{t('betaAdmin.payments.noData')}</p>
                          </div>
                        )}
                      </div>
                    </div>
                  </>
                ) : (
                  <div className="text-center py-8 text-gray-500">
                    {t('betaAdmin.payments.cannotLoad')}
                  </div>
                )}
              </CardContent>
            </Card>
            
            <Tabs defaultValue="transactions" className="w-full">
              <TabsList className="mb-4">
                <TabsTrigger value="transactions">{t('betaAdmin.payments.tabTransactions')}</TabsTrigger>
                <TabsTrigger value="subscriptions">{t('betaAdmin.payments.tabSubscriptions')}</TabsTrigger>
                <TabsTrigger value="licenses">{t('betaAdmin.payments.tabLicenses')}</TabsTrigger>
                <TabsTrigger value="plans">{t('betaAdmin.payments.tabPlans')}</TabsTrigger>
                <TabsTrigger value="external-links">{t('betaAdmin.payments.tabExternal')}</TabsTrigger>
              </TabsList>
              
              <TabsContent value="transactions">
                <Card>
                  <CardHeader>
                    <CardTitle>{t('betaAdmin.payments.lastTransactions')}</CardTitle>
                    <CardDescription>
                      {t('betaAdmin.payments.lastTransactionsDesc')}
                    </CardDescription>
                  </CardHeader>
                  <CardContent>
                    <div className="rounded-md border overflow-hidden">
                      <Table>
                        <TableHeader>
                          <TableRow>
                            <TableHead>ID</TableHead>
                            <TableHead>{t('betaAdmin.col.user')}</TableHead>
                            <TableHead>{t('betaAdmin.col.amount')}</TableHead>
                            <TableHead>{t('betaAdmin.col.method')}</TableHead>
                            <TableHead>{t('betaAdmin.col.status')}</TableHead>
                            <TableHead>{t('betaAdmin.col.date')}</TableHead>
                            <TableHead>{t('betaAdmin.col.description')}</TableHead>
                          </TableRow>
                        </TableHeader>
                        <TableBody>
                          {transactionsLoading ? (
                            <TableRow>
                              <TableCell colSpan={7} className="text-center py-4">
                                <Loader2 className="h-6 w-6 animate-spin mx-auto" />
                              </TableCell>
                            </TableRow>
                          ) : transactions.length > 0 ? (
                            transactions.map((transaction) => (
                              <TableRow key={transaction.id}>
                                <TableCell className="font-medium">{transaction.id}</TableCell>
                                <TableCell>{transaction.userId}</TableCell>
                                <TableCell>{formatCurrency(transaction.amount)}</TableCell>
                                <TableCell>{getPaymentMethodBadge(transaction.paymentMethod, t)}</TableCell>
                                <TableCell>{getStatusBadge(transaction.status, t)}</TableCell>
                                <TableCell>{formatDate(transaction.createdAt)}</TableCell>
                                <TableCell className="max-w-xs truncate">{transaction.description}</TableCell>
                              </TableRow>
                            ))
                          ) : (
                            <TableRow>
                              <TableCell colSpan={7} className="text-center py-4">
                                {t('betaAdmin.payments.noTransactions')}
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
                    <CardTitle>{t('betaAdmin.payments.subscriptionsTitle')}</CardTitle>
                    <CardDescription>
                      {t('betaAdmin.payments.subscriptionsDesc')}
                    </CardDescription>
                  </CardHeader>
                  <CardContent>
                    <div className="rounded-md border overflow-hidden">
                      <Table>
                        <TableHeader>
                          <TableRow>
                            <TableHead>ID</TableHead>
                            <TableHead>{t('betaAdmin.col.user')}</TableHead>
                            <TableHead>{t('betaAdmin.col.plan')}</TableHead>
                            <TableHead>{t('betaAdmin.col.status')}</TableHead>
                            <TableHead>{t('betaAdmin.col.start')}</TableHead>
                            <TableHead>{t('betaAdmin.col.end')}</TableHead>
                            <TableHead>{t('betaAdmin.col.method')}</TableHead>
                          </TableRow>
                        </TableHeader>
                        <TableBody>
                          {subscriptionsLoading ? (
                            <TableRow>
                              <TableCell colSpan={7} className="text-center py-4">
                                <Loader2 className="h-6 w-6 animate-spin mx-auto" />
                              </TableCell>
                            </TableRow>
                          ) : subscriptions.length > 0 ? (
                            subscriptions.map((subscription) => (
                              <TableRow key={subscription.id}>
                                <TableCell className="font-medium">{subscription.id}</TableCell>
                                <TableCell>{subscription.userId}</TableCell>
                                <TableCell>{subscription.plan?.name || '-'}</TableCell>
                                <TableCell>{getStatusBadge(subscription.status, t)}</TableCell>
                                <TableCell>{formatDate(subscription.currentPeriodStart)}</TableCell>
                                <TableCell>{formatDate(subscription.currentPeriodEnd)}</TableCell>
                                <TableCell>{getPaymentMethodBadge(subscription.paymentMethod, t)}</TableCell>
                              </TableRow>
                            ))
                          ) : (
                            <TableRow>
                              <TableCell colSpan={7} className="text-center py-4">
                                {t('betaAdmin.payments.noSubscriptions')}
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
                    <CardTitle>{t('betaAdmin.payments.licensesTitle')}</CardTitle>
                    <CardDescription>
                      {t('betaAdmin.payments.licensesDesc')}
                    </CardDescription>
                  </CardHeader>
                  <CardContent>
                    <div className="rounded-md border overflow-hidden">
                      <Table>
                        <TableHeader>
                          <TableRow>
                            <TableHead>{t('betaAdmin.col.code')}</TableHead>
                            <TableHead>{t('betaAdmin.col.type')}</TableHead>
                            <TableHead>{t('betaAdmin.col.user')}</TableHead>
                            <TableHead>{t('betaAdmin.col.status')}</TableHead>
                            <TableHead>{t('betaAdmin.col.activated')}</TableHead>
                            <TableHead>{t('betaAdmin.col.expiry')}</TableHead>
                          </TableRow>
                        </TableHeader>
                        <TableBody>
                          {licensesLoading ? (
                            <TableRow>
                              <TableCell colSpan={6} className="text-center py-4">
                                <Loader2 className="h-6 w-6 animate-spin mx-auto" />
                              </TableCell>
                            </TableRow>
                          ) : licenses.length > 0 ? (
                            licenses.map((license) => (
                              <TableRow key={license.id}>
                                <TableCell className="font-medium">{license.code}</TableCell>
                                <TableCell>
                                  {(() => {
                                    switch(license.type) {
                                      case 'trial':
                                        return (
                                          <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-yellow-100 text-yellow-800">
                                            <Timer className="w-3 h-3 mr-1" /> Trial
                                          </span>
                                        );
                                      case 'base':
                                        return (
                                          <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-800">
                                            Base
                                          </span>
                                        );
                                      case 'pro':
                                        return (
                                          <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-purple-100 text-purple-800">
                                            Pro
                                          </span>
                                        );
                                      case 'business':
                                        return (
                                          <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-indigo-100 text-indigo-800">
                                            Business
                                          </span>
                                        );
                                      case 'staff':
                                        return (
                                          <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-800">
                                            <Users className="w-3 h-3 mr-1" /> Staff
                                          </span>
                                        );
                                      case 'admin':
                                        return (
                                          <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-red-100 text-red-800">
                                            Admin
                                          </span>
                                        );
                                      default:
                                        return license.type;
                                    }
                                  })()}
                                </TableCell>
                                <TableCell>
                                  {license.user ? (
                                    <div className="flex flex-col">
                                      <span>{license.user.username}</span>
                                      {license.user.clientName && (
                                        <span className="text-xs text-gray-500">{license.user.clientName}</span>
                                      )}
                                    </div>
                                  ) : (
                                    <span className="text-gray-500">-</span>
                                  )}
                                </TableCell>
                                <TableCell>
                                  {license.isActive ? (
                                    <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-800">
                                      <CheckCircle2 className="w-3 h-3 mr-1" /> {t('betaAdmin.payments.licenseActive')}
                                    </span>
                                  ) : (
                                    <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-red-100 text-red-800">
                                      <X className="w-3 h-3 mr-1" /> {t('betaAdmin.payments.licenseExpired')}
                                    </span>
                                  )}
                                </TableCell>
                                <TableCell>{formatDate(license.activatedAt || license.createdAt)}</TableCell>
                                <TableCell>
                                  {license.expiresAt ? (
                                    <span className={`${
                                      new Date(license.expiresAt) < new Date() ? 'text-red-600' : ''
                                    }`}>
                                      {formatDate(license.expiresAt)}
                                    </span>
                                  ) : (
                                    <span className="text-gray-500">{t('betaAdmin.payments.noExpiry')}</span>
                                  )}
                                </TableCell>
                              </TableRow>
                            ))
                          ) : (
                            <TableRow>
                              <TableCell colSpan={6} className="text-center py-4">
                                {t('betaAdmin.payments.noLicenses')}
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
                    <CardTitle>{t('betaAdmin.payments.plansTitle')}</CardTitle>
                    <CardDescription>
                      {t('betaAdmin.payments.plansDesc')}
                    </CardDescription>
                  </CardHeader>
                  <CardContent>
                    <div className="rounded-md border overflow-hidden">
                      <Table>
                        <TableHeader>
                          <TableRow>
                            <TableHead>ID</TableHead>
                            <TableHead>{t('betaAdmin.col.name')}</TableHead>
                            <TableHead>{t('betaAdmin.col.price')}</TableHead>
                            <TableHead>{t('betaAdmin.col.interval')}</TableHead>
                            <TableHead>{t('betaAdmin.col.status')}</TableHead>
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
                                <TableCell>{plan.interval === 'month' ? t('betaAdmin.payments.monthly') : t('betaAdmin.payments.yearly')}</TableCell>
                                <TableCell>
                                  {plan.isActive ? (
                                    <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-800">
                                      <CheckCircle2 className="w-3 h-3 mr-1" /> {t('betaAdmin.payments.planActive')}
                                    </span>
                                  ) : (
                                    <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-gray-100 text-gray-800">
                                      {t('betaAdmin.payments.planInactive')}
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
                                {t('betaAdmin.payments.noPlans')}
                              </TableCell>
                            </TableRow>
                          )}
                        </TableBody>
                      </Table>
                    </div>
                  </CardContent>
                </Card>
              </TabsContent>
              
              <TabsContent value="external-links">
                <Card>
                  <CardHeader>
                    <CardTitle>{t('betaAdmin.external.title')}</CardTitle>
                    <CardDescription>
                      {t('betaAdmin.external.description')}
                    </CardDescription>
                  </CardHeader>
                  <CardContent>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                      <div className="flex flex-col p-6 border rounded-lg space-y-4">
                        <div className="flex items-center space-x-3">
                          <div className="bg-indigo-100 p-3 rounded-full">
                            <svg className="w-8 h-8" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                              <path d="M20.0065 7.5H16.756C16.756 7.5 17.622 5.75 17.089 4.75C16.556 3.75 15.4895 3.5 14.956 3.5C14.4225 3.5 8.089 3.5 8.089 3.5C8.089 3.5 6.75605 3.25 6.089 5C5.42195 6.75 6.58905 9.5 6.58905 9.5H4.0065C3.54451 9.5 3.10108 9.6844 2.77257 10.0129C2.44407 10.3414 2.25981 10.7848 2.26002 11.2468C2.26045 13.9171 3.10271 16.5157 4.6861 18.6853C6.2695 20.8549 8.4942 22.4807 11.0065 23.3468C11.0065 23.3468 11.839 23.5 12.0065 23.5C12.174 23.5 13.0065 23.3468 13.0065 23.3468C15.5188 22.4807 17.7435 20.8549 19.3269 18.6853C20.9103 16.5157 21.7526 13.9171 21.753 11.2468C21.7532 10.7848 21.5689 10.3414 21.2404 10.0129C20.9119 9.6844 20.4685 9.5 20.0065 9.5V7.5Z" fill="#003087"/>
                              <path d="M18.6033 10.9077C18.5243 10.7432 18.4011 10.604 18.2476 10.5035C18.0942 10.403 17.9162 10.3448 17.7323 10.3348H14.3143C14.2697 10.3348 14.2262 10.3476 14.1883 10.3719C14.1504 10.3962 14.1194 10.4312 14.0991 10.4729C14.0789 10.5145 14.0701 10.5613 14.0736 10.6079C14.0771 10.6544 14.0928 10.6989 14.1187 10.7364L14.6647 11.5364C14.6985 11.5856 14.7168 11.6443 14.7173 11.7044V13.0044C14.7173 13.0727 14.6901 13.1381 14.6421 13.1862C14.594 13.2342 14.5286 13.2614 14.4603 13.2614H13.9423C13.874 13.2614 13.8086 13.2342 13.7605 13.1862C13.7125 13.1381 13.6853 13.0727 13.6853 13.0044V12.2324C13.6853 12.1641 13.6581 12.0987 13.61 12.0507C13.562 12.0026 13.4966 11.9754 13.4283 11.9754H12.1353C12.067 11.9754 12.0016 12.0026 11.9535 12.0507C11.9055 12.0987 11.8783 12.1641 11.8783 12.2324V13.0044C11.8783 13.0727 11.8511 13.1381 11.803 13.1862C11.755 13.2342 11.6896 13.2614 11.6213 13.2614H11.1033C11.035 13.2614 10.9696 13.2342 10.9215 13.1862C10.8735 13.1381 10.8463 13.0727 10.8463 13.0044V11.7044C10.8467 11.6443 10.865 11.5856 10.8988 11.5364L11.4448 10.7364C11.4708 10.6989 11.4864 10.6544 11.4899 10.6079C11.4935 10.5613 11.4846 10.5145 11.4644 10.4729C11.4442 10.4312 11.4132 10.3962 11.3752 10.3719C11.3373 10.3476 11.2938 10.3348 11.2493 10.3348H7.83129C7.64743 10.3448 7.46939 10.403 7.31592 10.5035C7.16246 10.604 7.03927 10.7432 6.96029 10.9077C6.76929 11.2977 6.67529 12.3517 6.67529 12.7157C6.67529 13.0797 6.75829 15.6037 6.84129 15.9997C6.98329 16.7197 7.45929 17.3557 8.13929 17.6797C8.33429 17.7837 8.55329 17.8357 8.77429 17.8357H16.7843C17.0073 17.8357 17.2233 17.7837 17.4253 17.6797C18.1033 17.3577 18.5813 16.7197 18.7233 15.9997C18.8033 15.6077 18.8853 13.0837 18.8853 12.7157C18.8853 12.3477 18.7973 11.2977 18.6033 10.9077Z" fill="#0070E0"/>
                            </svg>
                          </div>
                          <div>
                            <h3 className="text-xl font-semibold">PayPal</h3>
                            <p className="text-sm text-gray-500">{t('betaAdmin.external.paypalDesc')}</p>
                          </div>
                        </div>
                        
                        <div className="grid grid-cols-1 gap-4">
                          <a 
                            href="https://www.paypal.com/businessmanage/dashboard" 
                            target="_blank" 
                            rel="noopener noreferrer"
                            className="flex justify-between items-center w-full py-2 px-4 border border-indigo-200 rounded-lg text-indigo-700 hover:bg-indigo-50 transition-colors"
                          >
                            <span>{t('betaAdmin.external.dashboardBusiness')}</span>
                            <svg className="w-5 h-5" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                              <path d="M7 17L17 7M17 7H7M17 7V17" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                            </svg>
                          </a>
                          
                          <a 
                            href="https://www.paypal.com/businessmanage/transactions/completed" 
                            target="_blank" 
                            rel="noopener noreferrer"
                            className="flex justify-between items-center w-full py-2 px-4 border border-indigo-200 rounded-lg text-indigo-700 hover:bg-indigo-50 transition-colors"
                          >
                            <span>{t('betaAdmin.external.completedTransactions')}</span>
                            <svg className="w-5 h-5" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                              <path d="M7 17L17 7M17 7H7M17 7V17" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                            </svg>
                          </a>
                          
                          <a 
                            href="https://www.paypal.com/businessmanage/billing/plans" 
                            target="_blank" 
                            rel="noopener noreferrer"
                            className="flex justify-between items-center w-full py-2 px-4 border border-indigo-200 rounded-lg text-indigo-700 hover:bg-indigo-50 transition-colors"
                          >
                            <span>{t('betaAdmin.external.subscriptionPlans')}</span>
                            <svg className="w-5 h-5" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                              <path d="M7 17L17 7M17 7H7M17 7V17" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                            </svg>
                          </a>
                          
                          <a 
                            href="https://www.paypal.com/businessmanage/billing/subscriptions" 
                            target="_blank" 
                            rel="noopener noreferrer"
                            className="flex justify-between items-center w-full py-2 px-4 border border-indigo-200 rounded-lg text-indigo-700 hover:bg-indigo-50 transition-colors"
                          >
                            <span>{t('betaAdmin.external.subscriptionMgmt')}</span>
                            <svg className="w-5 h-5" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                              <path d="M7 17L17 7M17 7H7M17 7V17" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                            </svg>
                          </a>
                        </div>
                      </div>
                      
                      <div className="flex flex-col p-6 border rounded-lg space-y-4">
                        <div className="flex items-center space-x-3">
                          <div className="bg-blue-100 p-3 rounded-full">
                            <svg className="w-8 h-8" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                              <path d="M3 6.5V5C3 3.89543 3.89543 3 5 3H19C20.1046 3 21 3.89543 21 5V19C21 20.1046 20.1046 21 19 21H5C3.89543 21 3 20.1046 3 19V17.5" stroke="#00B9FF" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                              <path d="M12.5714 8L10 12L7.42857 8" stroke="#00B9FF" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                              <path d="M16.5714 16L14 12L11.4286 16" stroke="#00B9FF" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                              <path d="M10 12H14" stroke="#00B9FF" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                            </svg>
                          </div>
                          <div>
                            <h3 className="text-xl font-semibold">Wise</h3>
                            <p className="text-sm text-gray-500">{t('betaAdmin.external.wiseDesc')}</p>
                          </div>
                        </div>
                        
                        <div className="grid grid-cols-1 gap-4">
                          <a 
                            href="https://wise.com/user/account" 
                            target="_blank" 
                            rel="noopener noreferrer"
                            className="flex justify-between items-center w-full py-2 px-4 border border-blue-200 rounded-lg text-blue-700 hover:bg-blue-50 transition-colors"
                          >
                            <span>{t('betaAdmin.external.dashboardAccount')}</span>
                            <svg className="w-5 h-5" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                              <path d="M7 17L17 7M17 7H7M17 7V17" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                            </svg>
                          </a>
                          
                          <a 
                            href="https://wise.com/user/balances" 
                            target="_blank" 
                            rel="noopener noreferrer"
                            className="flex justify-between items-center w-full py-2 px-4 border border-blue-200 rounded-lg text-blue-700 hover:bg-blue-50 transition-colors"
                          >
                            <span>{t('betaAdmin.external.balanceMovements')}</span>
                            <svg className="w-5 h-5" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                              <path d="M7 17L17 7M17 7H7M17 7V17" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                            </svg>
                          </a>
                          
                          <a 
                            href="https://wise.com/user/activity" 
                            target="_blank" 
                            rel="noopener noreferrer"
                            className="flex justify-between items-center w-full py-2 px-4 border border-blue-200 rounded-lg text-blue-700 hover:bg-blue-50 transition-colors"
                          >
                            <span>{t('betaAdmin.external.recentActivity')}</span>
                            <svg className="w-5 h-5" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                              <path d="M7 17L17 7M17 7H7M17 7V17" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                            </svg>
                          </a>
                          
                          <a 
                            href="https://wise.com/user/recipients" 
                            target="_blank" 
                            rel="noopener noreferrer"
                            className="flex justify-between items-center w-full py-2 px-4 border border-blue-200 rounded-lg text-blue-700 hover:bg-blue-50 transition-colors"
                          >
                            <span>{t('betaAdmin.external.recipientsMgmt')}</span>
                            <svg className="w-5 h-5" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                              <path d="M7 17L17 7M17 7H7M17 7V17" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                            </svg>
                          </a>
                        </div>
                      </div>
                    </div>
                    
                    <div className="mt-8 p-4 bg-gray-50 rounded-lg border border-gray-200">
                      <div className="flex items-start">
                        <svg className="w-5 h-5 text-blue-500 mt-0.5 mr-2" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                          <path d="M13 16H12V12H11M12 8H12.01M21 12C21 16.9706 16.9706 21 12 21C7.02944 21 3 16.9706 3 12C3 7.02944 7.02944 3 12 3C16.9706 3 21 7.02944 21 12Z" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                        </svg>
                        <div>
                          <h4 className="text-sm font-medium">{t('betaAdmin.external.importantNote')}</h4>
                          <p className="text-sm text-gray-500 mt-1">
                            {t('betaAdmin.external.importantNoteText')}
                          </p>
                        </div>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </TabsContent>
            </Tabs>
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
}