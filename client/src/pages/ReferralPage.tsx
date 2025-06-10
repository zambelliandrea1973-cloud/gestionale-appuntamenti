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
import { format } from 'date-fns';
import { Copy, AlertCircle, Euro, Clipboard, Building, Share2 } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { useLocation } from 'wouter';
import { useUserWithLicense } from '@/hooks/use-user-with-license';
import AuthorizedRoute from '@/components/AuthorizedRoute';

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
      queryClient.invalidateQueries({ queryKey: ['/api/referral/stats'] });
      setOpenBankDialog(false);
      setBankAccountForm({
        bankName: '',
        accountHolder: '',
        iban: '',
        swift: ''
      });
      toast({
        title: "Dati bancari salvati",
        description: "I tuoi dati bancari sono stati salvati con successo.",
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
        description: "Il codice è stato copiato negli appunti.",
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

  // Carica i dati bancari se presenti
  useEffect(() => {
    if (referralData?.bankData) {
      setBankAccountForm({
        bankName: referralData.bankData.bankName || '',
        accountHolder: referralData.bankData.accountHolder || '',
        iban: referralData.bankData.iban || '',
        swift: referralData.bankData.swift || ''
      });
    }
  }, [referralData?.bankData]);

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
  const referralCode = referralData?.userData?.referralCode || referralData?.referralCode;
  
  // Determina se l'utente è staff o admin
  const isAdmin = userWithLicense?.type === 'admin';
  const isStaff = userWithLicense?.type === 'staff';

  return (
    <AuthorizedRoute 
      requiredLicense="business"
      featureName="Programma Referral"
      description="Il sistema referral è disponibile solo per utenti con licenza Business e membri dello staff"
    >
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
                ? 'Condividi questo codice per invitare nuovi professionisti. Riceverai €1/mese per ogni abbonamento attivo dal tuo 3° referral.'
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
              <div className="flex flex-col items-center gap-4">
                <p className="text-center">Non hai ancora un codice referral.</p>
                <Button 
                  onClick={() => generateCodeMutation.mutate()}
                  disabled={generateCodeMutation.isPending}
                >
                  {generateCodeMutation.isPending ? 'Generazione...' : 'Genera codice'}
                </Button>
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
          <p>Invita nuovi professionisti a utilizzare Wife Scheduler e guadagna commissioni mensili. Ecco come funziona:</p>
          <ol className="list-decimal pl-5 mt-2 space-y-1">
            <li>Condividi il tuo codice referral con altri professionisti</li>
            <li>Quando un nuovo utente si registra utilizzando il tuo codice, viene collegato al tuo account</li>
            <li>Dopo aver invitato almeno 3 utenti, inizierai a ricevere €1 al mese per ogni utente con abbonamento attivo</li>
            <li>I pagamenti vengono elaborati mensilmente tramite bonifico bancario</li>
          </ol>
        </AlertDescription>
      </Alert>

      {/* Tabella delle commissioni */}
      <Card className="mb-8">
        <CardHeader>
          <CardTitle>Le tue commissioni</CardTitle>
          <CardDescription>
            Elenco dettagliato delle commissioni attive sui tuoi referral
          </CardDescription>
        </CardHeader>
        <CardContent>
          {commissions.length > 0 ? (
            <Table>
              <TableCaption>Elenco delle tue commissioni attive</TableCaption>
              <TableHeader>
                <TableRow>
                  <TableHead>Utente</TableHead>
                  <TableHead>Data inizio</TableHead>
                  <TableHead>Importo mensile</TableHead>
                  <TableHead>Stato</TableHead>
                  <TableHead>Ultimo pagamento</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {commissions.map((commission) => (
                  <TableRow key={commission.id}>
                    <TableCell className="font-medium">ID: {commission.referredId}</TableCell>
                    <TableCell>{format(new Date(commission.startDate), 'dd/MM/yyyy')}</TableCell>
                    <TableCell>{formatAmount(commission.monthlyAmount)}</TableCell>
                    <TableCell>
                      <span className={`px-2 py-1 rounded-full text-xs ${
                        commission.status === 'active' 
                          ? 'bg-green-100 text-green-800' 
                          : 'bg-red-100 text-red-800'
                      }`}>
                        {commission.status === 'active' ? 'Attiva' : 'Inattiva'}
                      </span>
                    </TableCell>
                    <TableCell>
                      {commission.lastPaidPeriod 
                        ? format(new Date(`${commission.lastPaidPeriod}-01`), 'MMMM yyyy')
                        : 'Mai'}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          ) : (
            <div className="text-center py-8 text-muted-foreground">
              <Clipboard className="mx-auto h-12 w-12 mb-4 opacity-20" />
              <p>Non hai ancora commissioni attive.</p>
              <p className="text-sm">Condividi il tuo codice referral per iniziare a guadagnare!</p>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Dialog per i dati bancari */}
      <Dialog open={openBankDialog} onOpenChange={setOpenBankDialog}>
        <DialogContent className="sm:max-w-[425px]">
          <DialogHeader>
            <DialogTitle>Dati bancari per i pagamenti</DialogTitle>
            <DialogDescription>
              Inserisci i dati del tuo conto bancario per ricevere i pagamenti delle commissioni.
            </DialogDescription>
          </DialogHeader>
          <form onSubmit={handleBankFormSubmit}>
            <div className="grid gap-4 py-4">
              <div className="grid gap-2">
                <Label htmlFor="bankName">Nome banca</Label>
                <Input
                  id="bankName"
                  value={bankAccountForm.bankName}
                  onChange={(e) => setBankAccountForm({ ...bankAccountForm, bankName: e.target.value })}
                  required
                />
              </div>
              <div className="grid gap-2">
                <Label htmlFor="accountHolder">Intestatario conto</Label>
                <Input
                  id="accountHolder"
                  value={bankAccountForm.accountHolder}
                  onChange={(e) => setBankAccountForm({ ...bankAccountForm, accountHolder: e.target.value })}
                  required
                />
              </div>
              <div className="grid gap-2">
                <Label htmlFor="iban">IBAN</Label>
                <Input
                  id="iban"
                  value={bankAccountForm.iban}
                  onChange={(e) => setBankAccountForm({ ...bankAccountForm, iban: e.target.value })}
                  required
                />
              </div>
              <div className="grid gap-2">
                <Label htmlFor="swift">SWIFT/BIC (opzionale)</Label>
                <Input
                  id="swift"
                  value={bankAccountForm.swift}
                  onChange={(e) => setBankAccountForm({ ...bankAccountForm, swift: e.target.value })}
                />
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
    </AuthorizedRoute>
  );
}