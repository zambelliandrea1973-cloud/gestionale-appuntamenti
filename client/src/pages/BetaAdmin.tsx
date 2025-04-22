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
import { Badge } from "@/components/ui/badge";
import { Loader2, Copy, Check, X, RefreshCw } from 'lucide-react';

// Tipo per i dati del form di creazione invito
interface InviteFormData {
  email: string;
  maxUses: number;
  expiryDays: number;
}

// Tipo per l'invito beta
interface BetaInvitation {
  id: number;
  code: string;
  email: string;
  maxUses: number;
  usedCount: number;
  createdAt: string;
  expiresAt: string | null;
  isUsed: boolean;
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

export default function BetaAdmin() {
  const { toast } = useToast();
  const { user } = useAuth();
  const [adminPassword, setAdminPassword] = useState('');
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [isChangingPassword, setIsChangingPassword] = useState(false);
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
  const DEFAULT_ADMIN_PASSWORD = 'EF2025Admin';
  
  // Carica la password corrente dal localStorage o usa quella predefinita
  const getCurrentPassword = () => {
    const savedPassword = localStorage.getItem('betaAdminPassword');
    return savedPassword || DEFAULT_ADMIN_PASSWORD;
  };
  
  const handleAdminLogin = (e: React.FormEvent) => {
    e.preventDefault();
    if (adminPassword === getCurrentPassword()) {
      setIsAuthenticated(true);
      
      // Salva lo stato di autenticazione nella sessione per mantenerlo durante la navigazione
      sessionStorage.setItem('betaAdminAuthenticated', 'true');
      
      toast({
        title: 'Accesso effettuato',
        description: 'Ora hai accesso alle funzionalità amministrative.',
        variant: 'default',
      });
    } else {
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
  
  // Controlla se l'utente è già autenticato all'avvio
  useEffect(() => {
    const isAuthenticatedFromSession = sessionStorage.getItem('betaAdminAuthenticated') === 'true';
    if (isAuthenticatedFromSession) {
      setIsAuthenticated(true);
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
                <Input
                  id="adminPassword"
                  type="password"
                  placeholder="Inserisci la password"
                  value={adminPassword}
                  onChange={(e) => setAdminPassword(e.target.value)}
                />
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
        <h1 className="text-4xl font-extrabold tracking-tight">Gestione Beta Test</h1>
        
        {/* Sezione Creazione Inviti */}
        <Card>
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
        <Card>
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
                      <TableCell className="font-mono font-medium">{invite.code}</TableCell>
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
                          onClick={() => copyToClipboard(invite.code)}
                        >
                          {copiedCode === invite.code ? (
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
        <Card>
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
        <Card>
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
                Modifica la password di accesso all'area amministrativa
              </CardDescription>
            </div>
            {!isChangingPassword && (
              <Button 
                variant="outline" 
                size="sm" 
                onClick={() => setIsChangingPassword(true)}
              >
                Modifica Password
              </Button>
            )}
          </CardHeader>
          <CardContent>
            {isChangingPassword ? (
              <form onSubmit={handlePasswordChange} className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="newPassword">Nuova Password</Label>
                  <Input
                    id="newPassword"
                    type="password"
                    placeholder="Inserisci la nuova password"
                    value={newPassword}
                    onChange={(e) => setNewPassword(e.target.value)}
                    minLength={6}
                  />
                  <p className="text-xs text-gray-500">
                    La password deve contenere almeno 6 caratteri
                  </p>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="confirmPassword">Conferma Password</Label>
                  <Input
                    id="confirmPassword"
                    type="password"
                    placeholder="Conferma la nuova password"
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                  />
                </div>
                <div className="flex space-x-2">
                  <Button 
                    type="submit" 
                    className="flex-1"
                  >
                    Salva Nuova Password
                  </Button>
                  <Button 
                    type="button" 
                    variant="outline"
                    onClick={() => {
                      setIsChangingPassword(false);
                      setNewPassword('');
                      setConfirmPassword('');
                    }}
                  >
                    Annulla
                  </Button>
                </div>
              </form>
            ) : (
              <div className="text-center py-4">
                <p>La password attuale è sicura. <span className="text-sm text-gray-500">Ultima modifica: {localStorage.getItem('betaAdminPassword') ? 'di recente' : 'mai'}</span></p>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}