import React, { useState, useEffect } from 'react';
import { useQuery, useMutation } from '@tanstack/react-query';
import { getQueryFn, apiRequest, queryClient } from '@/lib/queryClient';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Table, TableBody, TableCaption, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Switch } from '@/components/ui/switch';
import { format } from 'date-fns';
import { Copy, AlertCircle, Euro, Clipboard, Building, Share2, Calendar } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { useLocation } from 'wouter';
import { useUserWithLicense } from '@/hooks/use-user-with-license';

interface Commission {
  id: number;
  referrerId: number; // ID dell'utente che ha fatto il referral
  referredId: number; // ID dell'utente invitato
  subscriptionId: number; // ID dell'abbonamento associato
  monthlyAmount: number; // Importo mensile della commissione in centesimi
  status: string; // active o inactive
  startDate: string; // Da quando inizia a maturare la commissione
  endDate: string | null; // Quando è terminata (null se ancora attiva)
  lastPaidPeriod: string | null; // Ultimo periodo pagato
}

interface BankAccount {
  id: number;
  userId: number;
  bankName: string;
  accountHolder: string;
  iban: string;
  swift: string | null;
  isDefault: boolean;
}

interface ReferralStats {
  totalActiveCommissions: number;
  currentMonthAmount: number;
  lastMonthAmount: number;
  hasBankAccount: boolean;
}

// Definizione dell'interfaccia per la risposta API
interface ReferralResponse {
  userData: {
    id: number;
    username: string;
    email: string;
    referralCode: string | null;
    referredBy: number | null;
    paypalEmail: string | null;
    autoPayoutEnabled: boolean;
  };
  commissionsData: Commission[];
  bankData: BankAccount | null;
  statsData: ReferralStats;
}

export default function ReferralPage() {
  const { toast } = useToast();
  const [, navigate] = useLocation();
  const { user: userWithLicense, isLoading: isUserLoading } = useUserWithLicense();
  
  // Gestisce gli utenti che non hanno i permessi necessari
  const [hasPermission, setHasPermission] = useState<boolean | null>(null);
  
  useEffect(() => {
    if (!isUserLoading && userWithLicense) {
      // Solo gli utenti staff, admin e i piani business possono accedere
      const permission = 
        userWithLicense.type === 'staff' || 
        userWithLicense.type === 'admin' || 
        userWithLicense.licenseInfo?.type === 'business';
      
      setHasPermission(permission);
      
      // Non reindirizzare, mostriamo un messaggio informativo
      if (!permission) {
        toast({
          title: "Funzionalità limitata",
          description: "Il programma di referral è disponibile solo per utenti con abbonamento Business e per lo staff autorizzato.",
          variant: "destructive"
        });
      }
    }
  }, [userWithLicense, isUserLoading, toast]);
  
  // Non usiamo useAuth ma prendiamo le informazioni dell'utente dalla risposta dell'API
  const [bankAccountForm, setBankAccountForm] = useState({
    paypalEmail: '',
    autoPayoutEnabled: false,
    bankName: '',
    accountHolder: '',
    iban: '',
    swift: ''
  });
  const [openBankDialog, setOpenBankDialog] = useState(false);

  // Ottieni le statistiche sui referral
  const { data: referralData, isLoading: isLoadingReferral } = useQuery<ReferralResponse>({
    queryKey: ['/api/referral/staff'],
    queryFn: getQueryFn({ on401: "returnNull" }),
  });

  // Genera un nuovo codice di referral
  const generateCodeMutation = useMutation({
    mutationFn: async () => {
      const response = await apiRequest('POST', '/api/referral/generate-code');
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/referral/stats'] });
      toast({
        title: "Codice generato",
        description: "Il tuo codice di referral è stato generato con successo.",
      });
    },
    onError: (error: any) => {
      toast({
        variant: "destructive",
        title: "Errore",
        description: `Impossibile generare il codice: ${error.message}`,
      });
    }
  });

  // Salva i dati bancari
  const saveBankAccountMutation = useMutation({
    mutationFn: async (data: typeof bankAccountForm) => {
      const response = await apiRequest('POST', '/api/referral/bank-account', data);
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/referral/staff'] });
      setOpenBankDialog(false);
      toast({
        title: "Configurazione salvata",
        description: "Le tue preferenze di pagamento sono state salvate con successo.",
      });
    },
    onError: (error: any) => {
      toast({
        variant: "destructive",
        title: "Errore",
        description: `Impossibile salvare i dati bancari: ${error.message}`,
      });
    }
  });

  // Gestisce la copia del codice di referral negli appunti
  const copyToClipboard = () => {
    if (referralData?.userData?.referralCode) {
      navigator.clipboard.writeText(referralData.userData.referralCode);
      toast({
        title: "Codice copiato!",
        description: "Il tuo codice referral è stato copiato negli appunti.",
      });
    }
  };

  // Gestisce la condivisione del codice referral
  const shareReferralCode = () => {
    if (referralData?.userData?.referralCode) {
      const text = `Iscriviti a Wife Scheduler usando il mio codice referral: ${referralData.userData.referralCode}`;
      
      if (navigator.share) {
        navigator.share({
          title: 'Codice Referral Wife Scheduler',
          text: text,
          url: window.location.origin
        }).catch((error) => {
          console.error('Errore nella condivisione:', error);
        });
      } else {
        navigator.clipboard.writeText(text);
        toast({
          title: "Testo copiato!",
          description: "Il messaggio di invito è stato copiato negli appunti.",
        });
      }
    }
  };

  // Carica i dati bancari e PayPal se presenti
  useEffect(() => {
    if (referralData) {
      setBankAccountForm({
        paypalEmail: referralData.userData?.paypalEmail || '',
        autoPayoutEnabled: referralData.userData?.autoPayoutEnabled || false,
        bankName: referralData.bankData?.bankName || '',
        accountHolder: referralData.bankData?.accountHolder || '',
        iban: referralData.bankData?.iban || '',
        swift: referralData.bankData?.swift || ''
      });
    }
  }, [referralData]);

  // Forza il refetch quando si apre il dialog
  useEffect(() => {
    if (openBankDialog) {
      queryClient.invalidateQueries({ queryKey: ['/api/referral/staff'] });
    }
  }, [openBankDialog]);

  // Gestisce il submit del form dei dati bancari
  const handleBankFormSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    saveBankAccountMutation.mutate(bankAccountForm);
  };

  // Formatta un importo in centesimi in Euro
  const formatAmount = (amount: number) => {
    return (amount / 100).toLocaleString('it-IT', {
      style: 'currency',
      currency: 'EUR'
    });
  };

  // Mostra un loader durante il caricamento
  if (isLoadingReferral || isUserLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-primary"></div>
      </div>
    );
  }
  
  // Mostra un messaggio informativo se non ha i permessi necessari
  if (hasPermission === false) {
    return (
      <div className="container mx-auto py-8 px-4">
        <h1 className="text-3xl font-bold mb-6">Programma di Referral</h1>
        
        <Card className="mb-8">
          <CardHeader>
            <CardTitle>Accesso limitato</CardTitle>
            <CardDescription>
              Questa funzionalità è riservata agli utenti con piano Business e membri dello staff.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="text-center py-8">
              <AlertCircle className="mx-auto h-12 w-12 mb-4 text-amber-500" />
              <h3 className="font-semibold text-lg mb-2">Aggiorna il tuo piano per accedere</h3>
              <p className="mb-6 text-muted-foreground">
                Il programma di referral ti permette di guadagnare invitando nuovi professionisti ad utilizzare la piattaforma.
                Questa funzionalità è disponibile esclusivamente per gli utenti con piano Business.
              </p>
              <Button onClick={() => navigate('/subscription')}>
                Scopri il piano Business
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  // Gestisce entrambe le strutture dati (admin e staff)
  const stats: ReferralStats = referralData?.statsData || referralData?.stats || {
    totalActiveCommissions: 0,
    currentMonthAmount: 0,
    lastMonthAmount: 0,
    hasBankAccount: false
  };

  const commissions: Commission[] = referralData?.commissionsData || referralData?.commissions || [];
  const bankAccount: BankAccount | null = referralData?.bankData || null;
  const referralCode = referralData?.stats?.myReferralCode || userWithLicense?.id?.toString();
  
  // Determina se l'utente è staff o admin
  const isAdmin = userWithLicense?.type === 'admin';
  const isStaff = userWithLicense?.type === 'staff';

  return (
    <div className="container mx-auto py-8 px-4">
      <h1 className="text-3xl font-bold mb-6">
        {isStaff ? 'Il Mio Programma Referral' : 'Gestione Programma Referral'}
      </h1>
      
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 mb-8">
        {/* Sezione codice referral */}
        <Card className="lg:col-span-8">
          <CardHeader>
            <CardTitle>
              {isStaff ? 'Il tuo codice referral personale' : 'Codice referral'}
            </CardTitle>
            <CardDescription>
              {isStaff 
                ? 'Condividi questo codice per invitare nuovi professionisti. Riceverai il 25% del prezzo dell\'abbonamento per ogni cliente referenziato.'
                : 'Gestione dei codici referral e commissioni per tutti gli staff.'
              }
            </CardDescription>
          </CardHeader>
          <CardContent>
            {referralCode ? (
              <div className="flex flex-col md:flex-row gap-4 items-center">
                <div className="bg-primary/10 text-primary text-xl font-mono p-4 rounded-md flex-grow text-center">
                  {referralCode}
                </div>
                <div className="flex gap-2">
                  <Button
                    variant="outline"
                    size="icon"
                    onClick={copyToClipboard}
                    title="Copia negli appunti"
                  >
                    <Copy className="h-4 w-4" />
                  </Button>
                  <Button
                    variant="outline"
                    size="icon"
                    onClick={shareReferralCode}
                    title="Condividi"
                  >
                    <Share2 className="h-4 w-4" />
                  </Button>
                </div>
              </div>
            ) : (
              <div className="flex flex-col md:flex-row gap-4 items-center">
                <div className="bg-primary/10 text-primary text-xl font-mono p-4 rounded-md flex-grow text-center">
                  {userWithLicense?.id || 'Caricamento...'}
                </div>
                <div className="flex gap-2">
                  <Button
                    variant="outline"
                    size="icon"
                    onClick={copyToClipboard}
                    title="Copia negli appunti"
                  >
                    <Copy className="h-4 w-4" />
                  </Button>
                  <Button
                    variant="outline"
                    size="icon"
                    onClick={shareReferralCode}
                    title="Condividi"
                  >
                    <Share2 className="h-4 w-4" />
                  </Button>
                </div>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Sezione statistiche */}
        <Card className="lg:col-span-4">
          <CardHeader>
            <CardTitle>
              {isStaff ? 'Le mie commissioni' : 'Statistiche generali'}
            </CardTitle>
            <CardDescription>
              {isStaff 
                ? 'Riepilogo dei tuoi guadagni personali'
                : 'Panoramica commissioni di tutti gli staff'
              }
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <div className="flex justify-between">
                <span className="text-muted-foreground">Commissioni attive:</span>
                <span className="font-medium">{stats.totalActiveCommissions}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Mese corrente:</span>
                <span className="font-medium">{formatAmount(stats.currentMonthAmount)}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Mese precedente:</span>
                <span className="font-medium">{formatAmount(stats.lastMonthAmount)}</span>
              </div>
              
              <div className="pt-3 border-t">
                <div className="flex justify-between items-start mb-2">
                  <span className="text-muted-foreground">PayPal:</span>
                  <span className="font-medium text-sm text-right break-all">
                    {referralData?.userData?.paypalEmail || 'Non configurato'}
                  </span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-muted-foreground">Auto-payout:</span>
                  <span className={`font-medium text-sm ${referralData?.userData?.autoPayoutEnabled ? 'text-green-600' : 'text-muted-foreground'}`}>
                    {referralData?.userData?.autoPayoutEnabled ? '✓ Attivo' : '✗ Disattivo'}
                  </span>
                </div>
              </div>
            </div>
          </CardContent>
          <CardFooter>
            <div className="w-full">
              {!stats.hasBankAccount && (
                <Button 
                  variant="outline" 
                  className="w-full"
                  onClick={() => setOpenBankDialog(true)}
                >
                  <Building className="mr-2 h-4 w-4" />
                  Aggiungi dati bancari
                </Button>
              )}
              {stats.hasBankAccount && (
                <Button 
                  variant="outline" 
                  className="w-full"
                  onClick={() => setOpenBankDialog(true)}
                >
                  <Building className="mr-2 h-4 w-4" />
                  Modifica dati bancari
                </Button>
              )}
            </div>
          </CardFooter>
        </Card>
      </div>

      {/* Sezione informazioni */}
      <Alert className="mb-8">
        <AlertCircle className="h-4 w-4" />
        <AlertTitle>Come funziona il programma</AlertTitle>
        <AlertDescription>
          <p className="mb-3">Invita nuovi professionisti a utilizzare Wife Scheduler e guadagna commissioni ricorrenti. Ecco come funziona:</p>
          <ol className="list-decimal pl-5 space-y-2">
            <li><strong>Condividi il tuo codice referral</strong> con altri professionisti</li>
            <li><strong>Registrazione e abbonamento:</strong> Quando un nuovo utente si registra usando il tuo codice e attiva un abbonamento a pagamento, viene collegato al tuo account</li>
            <li><strong>Commissione del 25%:</strong> Riceverai il 25% del prezzo dell'abbonamento per ogni cliente referenziato con abbonamento attivo</li>
            <li><strong>Payout dopo 30 giorni:</strong> Le commissioni vengono elaborate automaticamente 30 giorni dopo la loro creazione</li>
            <li><strong>Metodi di pagamento:</strong>
              <ul className="list-disc pl-5 mt-1 space-y-1">
                <li><strong>PayPal (Consigliato):</strong> Payout automatici se attivi l'opzione nella configurazione</li>
                <li><strong>Bonifico bancario:</strong> Elaborazione manuale da parte dell'amministratore</li>
              </ul>
            </li>
          </ol>
        </AlertDescription>
      </Alert>

      {/* Utenti sponsorizzati con abbonamento attivo */}
      <div className="mb-8">
        <div className="mb-4">
          <h2 className="text-2xl font-bold">✅ Utenti con abbonamento attivo</h2>
          <p className="text-muted-foreground">Questi utenti generano commissioni (una tantum per annuali, mensili per i piani mensili)</p>
        </div>
        {referralData?.referredUsers && referralData.referredUsers.filter((u: any) => u.hasActiveSubscription).length > 0 ? (
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
            {referralData.referredUsers.filter((u: any) => u.hasActiveSubscription).map((user: any) => {
              const isYearly = user.planInterval === 'year';
              const commissionLabel = isYearly ? 'Commissione totale' : 'Commissione mensile';
              const paymentNote = isYearly ? '(una tantum)' : '(ricorrente)';
              
              return (
                <Card key={user.id} className="relative overflow-hidden border-green-200 dark:border-green-800">
                  <div className="absolute top-0 right-0 w-24 h-24 bg-green-500/10 rounded-bl-full" />
                  <CardHeader className="relative pb-3">
                    <div className="flex items-start justify-between gap-2">
                      <div className="flex-1 min-w-0">
                        <CardTitle className="text-base font-semibold line-clamp-1 pr-2">
                          {user.username}
                        </CardTitle>
                        <CardDescription className="text-sm mt-1">
                          {user.planName}
                        </CardDescription>
                      </div>
                      <span className="flex-shrink-0 px-2.5 py-1 rounded-full text-xs font-medium whitespace-nowrap bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200">
                        Attivo
                      </span>
                    </div>
                  </CardHeader>
                  <CardContent className="relative space-y-3">
                    <div className="flex items-center justify-between p-3 bg-green-50 dark:bg-green-950/30 rounded-lg">
                      <div className="flex flex-col">
                        <span className="text-sm text-muted-foreground">{commissionLabel}</span>
                        <span className="text-xs text-muted-foreground/70 italic">{paymentNote}</span>
                      </div>
                      <span className="text-xl font-bold text-green-600 dark:text-green-400">
                        {user.commissionAmount ? user.commissionAmount.toFixed(2) : '0.00'} €
                      </span>
                    </div>
                    <div className="flex items-center text-sm text-muted-foreground">
                      <Euro className="h-4 w-4 mr-2" />
                      <span>Piano: {user.planPrice}€/{isYearly ? 'anno' : 'mese'}</span>
                    </div>
                    <div className="flex items-center text-sm text-muted-foreground">
                      <Calendar className="h-4 w-4 mr-2" />
                      <span>Iscritto: {format(new Date(user.registeredAt), 'dd/MM/yyyy')}</span>
                    </div>
                  </CardContent>
                </Card>
              );
            })}
          </div>
        ) : (
          <Card className="border-dashed">
            <CardContent className="text-center py-12">
              <Clipboard className="mx-auto h-16 w-16 mb-4 text-muted-foreground/20" />
              <h3 className="text-lg font-semibold mb-2">Nessun abbonamento attivo</h3>
              <p className="text-muted-foreground">Gli utenti devono attivare un abbonamento a pagamento per generare commissioni</p>
            </CardContent>
          </Card>
        )}
      </div>

      {/* Utenti sponsorizzati in prova */}
      <div className="mb-8">
        <div className="mb-4">
          <h2 className="text-2xl font-bold">⏳ Utenti in prova (Trial)</h2>
          <p className="text-muted-foreground">Questi utenti si sono registrati con il tuo codice ma non hanno ancora attivato un abbonamento</p>
        </div>
        {referralData?.referredUsers && referralData.referredUsers.filter((u: any) => !u.hasActiveSubscription).length > 0 ? (
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
            {referralData.referredUsers.filter((u: any) => !u.hasActiveSubscription).map((user: any) => (
              <Card key={user.id} className="relative overflow-hidden border-orange-200 dark:border-orange-800">
                <div className="absolute top-0 right-0 w-24 h-24 bg-orange-500/10 rounded-bl-full" />
                <CardHeader className="relative pb-3">
                  <div className="flex items-start justify-between gap-2">
                    <div className="flex-1 min-w-0">
                      <CardTitle className="text-base font-semibold line-clamp-1 pr-2">
                        {user.username}
                      </CardTitle>
                      <CardDescription className="text-sm mt-1 text-orange-600 dark:text-orange-400 line-clamp-1">
                        {user.email}
                      </CardDescription>
                    </div>
                    <span className="flex-shrink-0 px-2.5 py-1 rounded-full text-xs font-medium whitespace-nowrap bg-orange-100 text-orange-800 dark:bg-orange-900 dark:text-orange-200">
                      Trial
                    </span>
                  </div>
                </CardHeader>
                <CardContent className="relative space-y-3">
                  <div className="flex items-center justify-between p-3 bg-orange-50 dark:bg-orange-950/30 rounded-lg">
                    <span className="text-sm text-muted-foreground">Commissione</span>
                    <span className="text-xl font-bold text-orange-600 dark:text-orange-400">
                      0.00 €
                    </span>
                  </div>
                  <div className="flex items-center text-sm text-muted-foreground">
                    <Calendar className="h-4 w-4 mr-2" />
                    <span>Registrato: {format(new Date(user.registeredAt), 'dd/MM/yyyy')}</span>
                  </div>
                  <div className="text-xs text-orange-600 dark:text-orange-400 italic">
                    💡 Inizierai a guadagnare quando attiverà un abbonamento
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        ) : (
          <Card className="border-dashed">
            <CardContent className="text-center py-12">
              <p className="text-muted-foreground">Tutti i tuoi utenti sponsorizzati hanno attivato un abbonamento! 🎉</p>
            </CardContent>
          </Card>
        )}
      </div>

      {/* Dialog per i dati bancari */}
      <Dialog open={openBankDialog} onOpenChange={setOpenBankDialog}>
        <DialogContent className="sm:max-w-[500px] max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Metodi di pagamento commissioni</DialogTitle>
            <DialogDescription>
              Configura come vuoi ricevere i pagamenti delle tue commissioni referral.
            </DialogDescription>
          </DialogHeader>
          <form onSubmit={handleBankFormSubmit} className="space-y-4">
            <div className="border-b pb-4">
              <h4 className="font-semibold mb-3">PayPal (Consigliato)</h4>
              <div className="space-y-3">
                <div className="space-y-2">
                  <Label htmlFor="paypalEmail">Email PayPal</Label>
                  <Input
                    id="paypalEmail"
                    type="email"
                    placeholder="tuo-email@paypal.com"
                    value={bankAccountForm.paypalEmail}
                    onChange={(e) => setBankAccountForm({ ...bankAccountForm, paypalEmail: e.target.value })}
                  />
                  <p className="text-xs text-muted-foreground">
                    Inserisci l'email del tuo account PayPal per ricevere i pagamenti automatici.
                  </p>
                </div>
                <div className="flex items-center justify-between">
                  <div className="space-y-0.5">
                    <Label htmlFor="autoPayoutEnabled">Payout automatico</Label>
                    <p className="text-xs text-muted-foreground">
                      Le commissioni vengono inviate automaticamente dopo 30 giorni via PayPal
                    </p>
                  </div>
                  <Switch
                    id="autoPayoutEnabled"
                    checked={bankAccountForm.autoPayoutEnabled}
                    onCheckedChange={(checked) => setBankAccountForm({ ...bankAccountForm, autoPayoutEnabled: checked })}
                    disabled={!bankAccountForm.paypalEmail}
                  />
                </div>
              </div>
            </div>
            
            <div>
              <h4 className="font-semibold mb-3">Bonifico bancario (Alternativo)</h4>
              <p className="text-xs text-muted-foreground mb-3">
                Se preferisci, puoi ricevere i pagamenti tramite bonifico bancario (elaborazione manuale).
              </p>
              <div className="space-y-3">
                <div className="space-y-2">
                  <Label htmlFor="bankName">Nome banca</Label>
                  <Input
                    id="bankName"
                    value={bankAccountForm.bankName}
                    onChange={(e) => setBankAccountForm({ ...bankAccountForm, bankName: e.target.value })}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="accountHolder">Intestatario conto</Label>
                  <Input
                    id="accountHolder"
                    value={bankAccountForm.accountHolder}
                    onChange={(e) => setBankAccountForm({ ...bankAccountForm, accountHolder: e.target.value })}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="iban">IBAN</Label>
                  <Input
                    id="iban"
                    value={bankAccountForm.iban}
                    onChange={(e) => setBankAccountForm({ ...bankAccountForm, iban: e.target.value })}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="swift">SWIFT/BIC (opzionale)</Label>
                  <Input
                    id="swift"
                    value={bankAccountForm.swift}
                    onChange={(e) => setBankAccountForm({ ...bankAccountForm, swift: e.target.value })}
                  />
                </div>
              </div>
            </div>
            <DialogFooter>
              <Button 
                type="submit" 
                disabled={saveBankAccountMutation.isPending}
              >
                {saveBankAccountMutation.isPending ? "Salvataggio..." : "Salva"}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}