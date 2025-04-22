import React, { useState, useEffect } from 'react';
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
import { it } from 'date-fns/locale';

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
  return format(new Date(dateString), 'dd/MM/yyyy HH:mm', { locale: it });
};

// Formatta la valuta in Euro
const formatCurrency = (amount: number) => {
  return new Intl.NumberFormat('it-IT', { style: 'currency', currency: 'EUR' }).format(amount);
};

// Genera un badge per lo stato della transazione/abbonamento
const getStatusBadge = (status: string) => {
  switch (status?.toLowerCase()) {
    case 'active':
    case 'attivo':
    case 'completed':
    case 'completato':
    case 'paid':
    case 'pagato':
      return (
        <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-800">
          <CheckCircle2 className="w-3 h-3 mr-1" /> Attivo/Completato
        </span>
      );
    case 'pending':
    case 'in attesa':
      return (
        <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-yellow-100 text-yellow-800">
          <Timer className="w-3 h-3 mr-1" /> In Attesa
        </span>
      );
    case 'failed':
    case 'fallito':
    case 'canceled':
    case 'cancellato':
      return (
        <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-red-100 text-red-800">
          <AlertCircle className="w-3 h-3 mr-1" /> Fallito/Cancellato
        </span>
      );
    default:
      return (
        <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-gray-100 text-gray-800">
          {status || 'Sconosciuto'}
        </span>
      );
  }
};

// Genera un badge per il metodo di pagamento
const getPaymentMethodBadge = (method: string) => {
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
        <Wallet className="w-3 h-3 mr-1" /> {method || 'Sconosciuto'}
      </span>
    );
  }
};

export default function BetaAdmin() {
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

  // Mutation per creare un nuovo invito
  const createInviteMutation = useMutation({
    mutationFn: async (data: InviteFormData) => {
      const res = await apiRequest('POST', '/api/beta/invitations', data, { withBetaAdminToken: true });
      return await res.json();
    },
    onSuccess: () => {
      toast({
        title: 'Invito creato!',
        description: 'Il codice di invito è stato creato con successo.',
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
        title: 'Errore',
        description: 'Si è verificato un errore durante la creazione dell\'invito.',
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
        title: 'Feedback aggiornato!',
        description: 'Lo stato del feedback è stato aggiornato con successo.',
        variant: 'default',
      });
      // Aggiorna la lista dei feedback
      refetchFeedbacks();
    },
    onError: (error: Error) => {
      toast({
        title: 'Errore',
        description: 'Si è verificato un errore durante l\'aggiornamento del feedback.',
        variant: 'destructive',
      });
    }
  });

  const handleCreateInvite = (e: React.FormEvent) => {
    e.preventDefault();
    if (!inviteData.email) {
      toast({
        title: 'Email mancante',
        description: 'Inserisci un\'email valida per l\'invito.',
        variant: 'destructive',
      });
      return;
    }
    
    // Mostra un messaggio di operazione in corso
    toast({
      title: 'Creazione in corso...',
      description: 'Sto creando il codice di invito, attendi qualche secondo.',
    });
    
    createInviteMutation.mutate(inviteData);
  };

  const copyToClipboard = (code: string) => {
    navigator.clipboard.writeText(code)
      .then(() => {
        setCopiedCode(code);
        toast({
          title: 'Codice copiato!',
          description: 'Il codice è stato copiato negli appunti.',
          variant: 'default',
        });
        
        // Reset dello stato dopo 3 secondi
        setTimeout(() => {
          setCopiedCode(null);
        }, 3000);
      })
      .catch(() => {
        toast({
          title: 'Errore',
          description: 'Impossibile copiare il codice negli appunti.',
          variant: 'destructive',
        });
      });
  };

  const handleUpdateFeedbackStatus = (id: number, status: 'pending' | 'reviewed' | 'implemented') => {
    updateFeedbackStatusMutation.mutate({ id, status });
  };
  
  // Password amministrativa iniziale (verrà caricata dal localStorage se è stata cambiata)
  const DEFAULT_ADMIN_PASSWORD = 'gironico';
  
  // Carica la password corrente dal localStorage o usa quella predefinita
  const getCurrentPassword = () => {
    const savedPassword = localStorage.getItem('betaAdminPassword');
    return savedPassword || DEFAULT_ADMIN_PASSWORD;
  };
  
  const handleAdminLogin = (e: React.FormEvent) => {
    e.preventDefault();
    if (adminPassword === getCurrentPassword()) {
      setIsAuthenticated(true);
      
      // Salva lo stato di autenticazione sia nella sessione che in localStorage
      // per mantenerlo durante la navigazione e tra sessioni diverse
      sessionStorage.setItem('betaAdminAuthenticated', 'true');
      localStorage.setItem('betaAdminAuthenticated', 'true');
      
      // Assicurati che la password corrente sia salvata in localStorage
      localStorage.setItem('betaAdminPassword', adminPassword);
      
      console.log('Login effettuato con successo, stato salvato in sessionStorage e localStorage');
      
      toast({
        title: 'Accesso effettuato',
        description: 'Ora hai accesso alle funzionalità amministrative.',
        variant: 'default',
      });
    } else {
      console.log('Login fallito: password non corretta');
      toast({
        title: 'Accesso negato',
        description: 'La password inserita non è corretta.',
        variant: 'destructive',
      });
    }
  };
  
  const handlePasswordChange = (e: React.FormEvent) => {
    e.preventDefault();
    
    if (newPassword.length < 6) {
      toast({
        title: 'Password troppo corta',
        description: 'La nuova password deve contenere almeno 6 caratteri.',
        variant: 'destructive'
      });
      return;
    }
    
    if (newPassword !== confirmPassword) {
      toast({
        title: 'Le password non corrispondono',
        description: 'La conferma della password non corrisponde alla nuova password.',
        variant: 'destructive'
      });
      return;
    }
    
    // Salva la nuova password nel localStorage
    localStorage.setItem('betaAdminPassword', newPassword);
    
    // Aggiorna anche il valore nella variabile di stato per mantenerlo sincronizzato
    setAdminPassword(newPassword);
    
    console.log('Password amministrativa aggiornata e salvata in localStorage');
    
    toast({
      title: 'Password aggiornata',
      description: 'La password amministrativa è stata modificata con successo.',
      variant: 'default'
    });
    
    // Reset del form
    setNewPassword('');
    setConfirmPassword('');
    setIsChangingPassword(false);
  };
  
  // Controlla se l'utente è già autenticato all'avvio e imposta la password memorizzata
  useEffect(() => {
    // Verifica se c'è già un'autenticazione valida nella sessione o localStorage
    const isAuthenticatedFromSession = sessionStorage.getItem('betaAdminAuthenticated') === 'true';
    const isAuthenticatedFromLocalStorage = localStorage.getItem('betaAdminAuthenticated') === 'true';
    
    // Imposta la password al valore memorizzato in localStorage
    const savedPassword = localStorage.getItem('betaAdminPassword') || 'gironico';
    setAdminPassword(savedPassword);
    
    // Se l'utente è già autenticato (da sessionStorage o localStorage), imposta lo stato
    if (isAuthenticatedFromSession || isAuthenticatedFromLocalStorage) {
      setIsAuthenticated(true);
      console.log('Utente già autenticato, ripristinata password da localStorage');
      
      // Sincronizza lo stato di autenticazione tra storage per assicurare consistenza
      sessionStorage.setItem('betaAdminAuthenticated', 'true');
      localStorage.setItem('betaAdminAuthenticated', 'true');
    } else {
      console.log('Nessuna autenticazione trovata, serve login');
    }
  }, []);
  
  // Se l'utente non è autenticato, mostra il form di login
  if (!isAuthenticated) {
    return (
      <div className="container py-10 mx-auto">
        <Card className="max-w-md mx-auto">
          <CardHeader>
            <CardTitle>Accesso Amministratore</CardTitle>
            <CardDescription>
              Inserisci la password per accedere all'area amministrativa.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleAdminLogin} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="adminPassword">Password Amministratore</Label>
                <div className="relative">
                  <Input
                    id="adminPassword"
                    type={showPassword ? "text" : "password"}
                    placeholder="Inserisci la password"
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
                Accedi
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
        <h1 className="text-4xl font-extrabold tracking-tight">Amministrazione</h1>
        
        <Tabs defaultValue="beta" className="w-full">
          <TabsList className="mb-4">
            <TabsTrigger value="beta">Beta Test</TabsTrigger>
            <TabsTrigger value="payments">Pagamenti</TabsTrigger>
          </TabsList>
          
          <TabsContent value="beta">
            {/* Sezione Creazione Inviti */}
            <Card className="mb-6">
              <CardHeader>
                <CardTitle>Crea Nuovo Codice di Invito</CardTitle>
                <CardDescription>
                  Genera un nuovo codice di invito per i beta tester
                </CardDescription>
              </CardHeader>
              <CardContent>
                <form onSubmit={handleCreateInvite} className="space-y-4">
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <div className="space-y-2">
                      <Label htmlFor="email">Email del Destinatario</Label>
                      <Input
                        id="email"
                        type="email"
                        placeholder="esempio@email.com"
                        value={inviteData.email}
                        onChange={(e) => setInviteData({...inviteData, email: e.target.value})}
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="maxUses">Numero Massimo di Utilizzi</Label>
                      <Input
                        id="maxUses"
                        type="number"
                        min="1"
                        value={inviteData.maxUses}
                        onChange={(e) => setInviteData({...inviteData, maxUses: parseInt(e.target.value)})}
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="expiryDays">Scadenza (giorni)</Label>
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
                        Creazione in corso...
                      </>
                    ) : (
                      'Crea Codice di Invito'
                    )}
                  </Button>
                </form>
              </CardContent>
            </Card>

            {/* Sezione Lista Inviti */}
            <Card className="mb-6">
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <div>
                  <CardTitle>Codici di Invito</CardTitle>
                  <CardDescription>
                    Lista di tutti i codici di invito generati
                  </CardDescription>
                </div>
                <Button variant="outline" size="sm" onClick={() => refetchInvitations()}>
                  <RefreshCw className="h-4 w-4 mr-2" />
                  Aggiorna
                </Button>
              </CardHeader>
              <CardContent>
                {invitationsLoading ? (
                  <div className="flex justify-center py-8">
                    <Loader2 className="h-8 w-8 animate-spin text-primary" />
                  </div>
                ) : invitations && invitations.length > 0 ? (
                  <Table>
                    <TableCaption>Lista dei codici di invito per beta test</TableCaption>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Codice</TableHead>
                        <TableHead>Email</TableHead>
                        <TableHead>Utilizzi</TableHead>
                        <TableHead>Creato il</TableHead>
                        <TableHead>Scadenza</TableHead>
                        <TableHead>Stato</TableHead>
                        <TableHead className="text-right">Azioni</TableHead>
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
                            {invite.expiresAt ? new Date(invite.expiresAt).toLocaleDateString() : 'Non scade'}
                          </TableCell>
                          <TableCell>
                            {invite.isUsed ? (
                              <Badge variant="destructive">Utilizzato</Badge>
                            ) : new Date(invite.expiresAt || '') < new Date() ? (
                              <Badge variant="outline">Scaduto</Badge>
                            ) : (
                              <Badge variant="default" className="bg-green-500">Attivo</Badge>
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
                    Nessun codice di invito trovato. Crea il tuo primo codice!
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Sezione Feedback */}
            <Card className="mb-6">
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <div>
                  <CardTitle>Feedback Beta Test</CardTitle>
                  <CardDescription>
                    Feedback ricevuti dai beta tester
                  </CardDescription>
                </div>
                <Button variant="outline" size="sm" onClick={() => refetchFeedbacks()}>
                  <RefreshCw className="h-4 w-4 mr-2" />
                  Aggiorna
                </Button>
              </CardHeader>
              <CardContent>
                {feedbacksLoading ? (
                  <div className="flex justify-center py-8">
                    <Loader2 className="h-8 w-8 animate-spin text-primary" />
                  </div>
                ) : feedbacks && feedbacks.length > 0 ? (
                  <Table>
                    <TableCaption>Lista dei feedback ricevuti dai beta tester</TableCaption>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Utente</TableHead>
                        <TableHead>Tipo</TableHead>
                        <TableHead>Contenuto</TableHead>
                        <TableHead>Valutazione</TableHead>
                        <TableHead>Data</TableHead>
                        <TableHead>Stato</TableHead>
                        <TableHead className="text-right">Azioni</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {feedbacks.map((feedback: BetaFeedback) => (
                        <TableRow key={feedback.id}>
                          <TableCell>{feedback.username}</TableCell>
                          <TableCell>
                            <Badge variant="outline">
                              {feedback.feedbackType === 'general' && 'Generale'}
                              {feedback.feedbackType === 'bug' && 'Bug'}
                              {feedback.feedbackType === 'feature' && 'Funzionalità'}
                              {feedback.feedbackType === 'usability' && 'Usabilità'}
                            </Badge>
                          </TableCell>
                          <TableCell className="max-w-xs truncate">{feedback.content}</TableCell>
                          <TableCell>{feedback.rating}/5</TableCell>
                          <TableCell>{new Date(feedback.createdAt).toLocaleDateString()}</TableCell>
                          <TableCell>
                            {feedback.status === 'pending' && (
                              <Badge variant="outline">In attesa</Badge>
                            )}
                            {feedback.status === 'reviewed' && (
                              <Badge variant="secondary">Esaminato</Badge>
                            )}
                            {feedback.status === 'implemented' && (
                              <Badge variant="default" className="bg-green-500">Implementato</Badge>
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
                    Nessun feedback ricevuto dai beta tester.
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Sezione Dashboard */}
            <Card className="mb-6">
              <CardHeader>
                <CardTitle>Dashboard Beta Test</CardTitle>
                <CardDescription>
                  Statistiche generali sul programma beta
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                  <div className="flex flex-col space-y-2 p-4 border rounded-lg">
                    <span className="text-sm text-gray-500">Codici Attivi</span>
                    <span className="text-3xl font-bold">
                      {invitations ? invitations.filter((i: BetaInvitation) => !i.isUsed && new Date(i.expiresAt || '') > new Date()).length : 0}
                    </span>
                  </div>
                  <div className="flex flex-col space-y-2 p-4 border rounded-lg">
                    <span className="text-sm text-gray-500">Beta Tester</span>
                    <span className="text-3xl font-bold">
                      {invitations ? invitations.filter((i: BetaInvitation) => i.isUsed).length : 0}
                    </span>
                  </div>
                  <div className="flex flex-col space-y-2 p-4 border rounded-lg">
                    <span className="text-sm text-gray-500">Feedback Ricevuti</span>
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
                  <CardTitle>Sicurezza</CardTitle>
                  <CardDescription>
                    Gestisci la password di amministrazione
                  </CardDescription>
                </div>
                <Button 
                  variant="outline" 
                  onClick={() => setIsChangingPassword(!isChangingPassword)}
                >
                  {isChangingPassword ? 'Annulla' : 'Cambia Password'}
                </Button>
              </CardHeader>
              <CardContent>
                {isChangingPassword ? (
                  <form onSubmit={handlePasswordChange} className="space-y-4">
                    <div className="space-y-2">
                      <Label htmlFor="newPassword">Nuova Password</Label>
                      <div className="relative">
                        <Input
                          id="newPassword"
                          type={showNewPassword ? "text" : "password"}
                          placeholder="Nuova password"
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
                      <Label htmlFor="confirmPassword">Conferma Password</Label>
                      <div className="relative">
                        <Input
                          id="confirmPassword"
                          type={showConfirmPassword ? "text" : "password"}
                          placeholder="Conferma nuova password"
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
                    <Button type="submit" className="w-full">Salva Nuova Password</Button>
                  </form>
                ) : (
                  <div className="text-center py-4">
                    <p>La password attuale è sicura. <span className="text-sm text-gray-500">Ultima modifica: {localStorage.getItem('betaAdminPassword') ? 'di recente' : 'mai'}</span></p>
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>
          
          <TabsContent value="payments">
            {/* Sezione Dashboard Pagamenti */}
            <Card className="mb-6">
              <CardHeader>
                <CardTitle>Dashboard Pagamenti</CardTitle>
                <CardDescription>
                  Panoramica delle metriche di pagamento e abbonamenti
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
                        <span className="text-sm text-gray-500">Ricavi Ricorrenti</span>
                        <span className="text-3xl font-bold">
                          {formatCurrency(dashboardData.totalRecurringRevenue)}
                        </span>
                      </div>
                      <div className="flex flex-col space-y-2 p-4 border rounded-lg">
                        <span className="text-sm text-gray-500">Abbonati Totali</span>
                        <span className="text-3xl font-bold">
                          {dashboardData.totalSubscribers}
                        </span>
                      </div>
                      <div className="flex flex-col space-y-2 p-4 border rounded-lg">
                        <span className="text-sm text-gray-500">Transazioni Totali</span>
                        <span className="text-3xl font-bold">
                          {dashboardData.totalTransactions}
                        </span>
                      </div>
                    </div>
                    
                    <div>
                      <h3 className="text-lg font-medium mb-4">Ricavi Mensili</h3>
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
                            <p className="text-gray-500">Nessun dato disponibile</p>
                          </div>
                        )}
                      </div>
                    </div>
                  </>
                ) : (
                  <div className="text-center py-8 text-gray-500">
                    Impossibile caricare i dati della dashboard
                  </div>
                )}
              </CardContent>
            </Card>
            
            <Tabs defaultValue="transactions" className="w-full">
              <TabsList className="mb-4">
                <TabsTrigger value="transactions">Transazioni</TabsTrigger>
                <TabsTrigger value="subscriptions">Abbonamenti</TabsTrigger>
                <TabsTrigger value="plans">Piani</TabsTrigger>
              </TabsList>
              
              <TabsContent value="transactions">
                <Card>
                  <CardHeader>
                    <CardTitle>Ultime Transazioni</CardTitle>
                    <CardDescription>
                      Elenco completo delle transazioni di pagamento
                    </CardDescription>
                  </CardHeader>
                  <CardContent>
                    <div className="rounded-md border overflow-hidden">
                      <Table>
                        <TableHeader>
                          <TableRow>
                            <TableHead>ID</TableHead>
                            <TableHead>Utente</TableHead>
                            <TableHead>Importo</TableHead>
                            <TableHead>Metodo</TableHead>
                            <TableHead>Stato</TableHead>
                            <TableHead>Data</TableHead>
                            <TableHead>Descrizione</TableHead>
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
                                <TableCell>{getPaymentMethodBadge(transaction.paymentMethod)}</TableCell>
                                <TableCell>{getStatusBadge(transaction.status)}</TableCell>
                                <TableCell>{formatDate(transaction.createdAt)}</TableCell>
                                <TableCell className="max-w-xs truncate">{transaction.description}</TableCell>
                              </TableRow>
                            ))
                          ) : (
                            <TableRow>
                              <TableCell colSpan={7} className="text-center py-4">
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
                      Elenco degli abbonamenti attivi e passati
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
                            <TableHead>Termine</TableHead>
                            <TableHead>Metodo</TableHead>
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
                                <TableCell>{getStatusBadge(subscription.status)}</TableCell>
                                <TableCell>{formatDate(subscription.currentPeriodStart)}</TableCell>
                                <TableCell>{formatDate(subscription.currentPeriodEnd)}</TableCell>
                                <TableCell>{getPaymentMethodBadge(subscription.paymentMethod)}</TableCell>
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
            </Tabs>
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
}