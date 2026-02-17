import { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { useQueryClient } from '@tanstack/react-query';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from "@/components/ui/switch";
import { useToast } from "@/hooks/use-toast";
import { Link } from 'wouter';
import { Checkbox } from "@/components/ui/checkbox";
import { ScrollArea } from "@/components/ui/scroll-area";
import { 
  Calendar, 
  ArrowRight, 
  RefreshCw, 
  Check, 
  Mail,
  AlertCircle,
  Users,
  Download,
  CheckSquare,
  Upload,
  FileSpreadsheet,
  ChevronDown,
  ChevronUp,
  Info
} from "lucide-react";
import { useLicense } from '@/hooks/use-license';

export default function GoogleCalendarSetupPage() {
  const { t } = useTranslation();
  const { toast } = useToast();
  const { hasProAccess, isLoading } = useLicense();
  const queryClient = useQueryClient();
  
  const [email, setEmail] = useState('');
  const [isAuthenticating, setIsAuthenticating] = useState(false);
  const [isGoogleAuthorized, setIsGoogleAuthorized] = useState(false);
  const [isSyncEnabled, setIsSyncEnabled] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [isSyncing, setIsSyncing] = useState(false);
  const [lastSyncResult, setLastSyncResult] = useState<{ success: boolean; message: string } | null>(null);
  const [isCheckingStatus, setIsCheckingStatus] = useState(true);
  const [lastSyncAt, setLastSyncAt] = useState<string | null>(null);
  const [totalSyncedEvents, setTotalSyncedEvents] = useState<number>(0);
  
  // Stati per importazione contatti
  interface GoogleContact {
    resourceName: string;
    name: string;
    firstName: string;
    lastName: string;
    email: string;
    phone: string;
    address: string;
  }
  const [contacts, setContacts] = useState<GoogleContact[]>([]);
  const [selectedContacts, setSelectedContacts] = useState<Set<string>>(new Set());
  const [isLoadingContacts, setIsLoadingContacts] = useState(false);
  const [isImporting, setIsImporting] = useState(false);
  const [contactsLoaded, setContactsLoaded] = useState(false);
  const [importResult, setImportResult] = useState<{ success: boolean; message: string } | null>(null);
  const [needsContactsReauth, setNeedsContactsReauth] = useState(false);
  
  // Stati per importazione CSV
  const [csvContacts, setCsvContacts] = useState<Array<{name: string; email: string; phone: string}>>([]);
  const [selectedCsvContacts, setSelectedCsvContacts] = useState<Set<number>>(new Set());
  const [isImportingCsv, setIsImportingCsv] = useState(false);
  const [csvImportResult, setCsvImportResult] = useState<{ success: boolean; message: string } | null>(null);
  const [showCsvInstructions, setShowCsvInstructions] = useState(false);
  
  useEffect(() => {
    const checkGoogleAuthStatus = async () => {
      try {
        const response = await fetch('/api/google-auth/status');
        if (response.ok) {
          const data = await response.json();
          if (data.authorized) {
            setIsGoogleAuthorized(true);
            setIsSyncEnabled(data.calendarEnabled || false);
            if (data.email) {
              setEmail(data.email);
            }
            if (data.lastSyncAt) {
              setLastSyncAt(data.lastSyncAt);
            }
          }
        }
        
        // Recupera anche lo stato della sincronizzazione dal calendario
        const syncStatusRes = await fetch('/api/google-calendar/status', { credentials: 'include' });
        if (syncStatusRes.ok) {
          const syncData = await syncStatusRes.json();
          if (syncData.lastSyncAt) {
            setLastSyncAt(syncData.lastSyncAt);
          }
          if (syncData.totalSyncedEvents !== undefined) {
            setTotalSyncedEvents(syncData.totalSyncedEvents);
          }
        }
      } catch (error) {
        console.error('Error checking Google auth status:', error);
      } finally {
        setIsCheckingStatus(false);
      }
    };
    
    if (hasProAccess && !isLoading) {
      checkGoogleAuthStatus();
    } else {
      setIsCheckingStatus(false);
    }
  }, [hasProAccess, isLoading]);

  const startGoogleAuth = async () => {
    if (!email.trim()) {
      toast({
        title: t('googleCalendar.errors.emailRequired'),
        description: t('googleCalendar.errors.emailRequired'),
        variant: "destructive",
      });
      return;
    }

    setIsAuthenticating(true);
    
    try {
      const response = await fetch('/api/google-auth/start');
      if (response.ok) {
        const data = await response.json();
        if (data.authUrl) {
          const authWindow = window.open(data.authUrl, 'googleAuthWindow', 'width=800,height=600');
          
          if (!authWindow) {
            throw new Error(t('googleCalendar.errors.popupBlocked'));
          }
          
          // Verifica periodicamente il completamento
          const checkInterval = setInterval(async () => {
            try {
              const statusResponse = await fetch('/api/google-auth/status');
              if (statusResponse.ok) {
                const statusData = await statusResponse.json();
                if (statusData.authorized) {
                  clearInterval(checkInterval);
                  setIsGoogleAuthorized(true);
                  setIsSyncEnabled(true);
                  
                  if (authWindow && !authWindow.closed) {
                    authWindow.close();
                  }
                  
                  toast({
                    title: t('googleCalendar.success.connected') + " 🎉",
                    description: t('googleCalendar.success.connected'),
                  });
                }
              }
            } catch (error) {
              console.error('Error checking status:', error);
            }
          }, 2000);
          
          setTimeout(() => {
            clearInterval(checkInterval);
            setIsAuthenticating(false);
          }, 120000);
        }
      }
    } catch (error) {
      console.error('Google auth error:', error);
      toast({
        title: t('common.error'),
        description: error instanceof Error ? error.message : t('googleCalendar.errors.authError'),
        variant: "destructive",
      });
      setIsAuthenticating(false);
    }
  };

  // Funzione per riautenticazione (quando servono nuovi permessi per i contatti)
  const handleReconnectGoogle = async () => {
    try {
      // Prima revoca il token esistente per forzare nuovi scope
      console.log("🔄 Revoca token esistente prima della riconnessione...");
      await fetch('/api/google-auth/revoke', { method: 'POST' });
      
      // Poi avvia la nuova autorizzazione
      const response = await fetch('/api/google-auth/start');
      if (response.ok) {
        const data = await response.json();
        if (data.authUrl) {
          // Usa redirect diretto invece di popup per evitare blocchi
          window.location.href = data.authUrl;
        }
      } else {
        toast({
          title: "Errore",
          description: "Impossibile avviare la riconnessione",
          variant: "destructive",
        });
      }
    } catch (error) {
      toast({
        title: "Errore",
        description: "Errore di connessione",
        variant: "destructive",
      });
    }
  };

  const handleSyncToggle = (enabled: boolean) => {
    setIsSyncEnabled(enabled);
    if (enabled) {
      toast({
        title: t('googleCalendar.setup.syncEnabled'),
        description: t('googleCalendar.setup.syncEnabledDesc'),
      });
    } else {
      toast({
        title: t('googleCalendar.setup.syncDisabled'),
      });
    }
  };

  const handleManualSync = async () => {
    setIsSyncing(true);
    setLastSyncResult(null);
    
    try {
      const response = await fetch('/api/google-calendar/sync-now', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Cache-Control': 'no-cache, no-store, must-revalidate',
        },
        credentials: 'include',
      });
      
      const contentType = response.headers.get('content-type');
      if (!contentType || !contentType.includes('application/json')) {
        throw new Error('Sessione scaduta. Effettua nuovamente il login.');
      }
      
      const data = await response.json();
      
      if (response.ok && data.success) {
        setLastSyncResult({ success: true, message: data.message || 'Sincronizzazione completata!' });
        // Aggiorna lo stato permanente della sincronizzazione
        setLastSyncAt(new Date().toISOString());
        setTotalSyncedEvents(prev => prev + (data.details?.exported || 0));
        toast({
          title: "✅ Sincronizzazione completata",
          description: `Importati: ${data.details?.imported || 0}, Esportati: ${data.details?.exported || 0}`,
        });
      } else {
        const errorMsg = data.error || data.message || 'Errore durante la sincronizzazione';
        setLastSyncResult({ success: false, message: errorMsg });
        toast({
          title: "Errore sincronizzazione",
          description: errorMsg,
          variant: "destructive",
        });
      }
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Errore di connessione';
      setLastSyncResult({ success: false, message: errorMessage });
      toast({
        title: "Errore",
        description: errorMessage,
        variant: "destructive",
      });
    } finally {
      setIsSyncing(false);
    }
  };

  // === Funzioni per importazione contatti ===
  const loadGoogleContacts = async () => {
    setIsLoadingContacts(true);
    setImportResult(null);
    
    try {
      const response = await fetch('/api/google-auth/contacts', {
        credentials: 'include',
      });
      
      const data = await response.json();
      
      if (response.ok && data.success) {
        setContacts(data.contacts || []);
        setContactsLoaded(true);
        setNeedsContactsReauth(false);
        toast({
          title: "Contatti caricati",
          description: `Trovati ${data.total || 0} contatti nella tua rubrica Google`,
        });
      } else {
        if (data.needsReauth) {
          setNeedsContactsReauth(true);
          toast({
            title: "Riconnetti Google",
            description: "È necessario riconnettere il tuo account Google per accedere ai contatti.",
            variant: "destructive",
          });
        } else {
          toast({
            title: "Errore",
            description: data.error || "Errore nel caricamento dei contatti",
            variant: "destructive",
          });
        }
      }
    } catch (error) {
      toast({
        title: "Errore",
        description: "Errore di connessione",
        variant: "destructive",
      });
    } finally {
      setIsLoadingContacts(false);
    }
  };

  const handleContactSelection = (resourceName: string, checked: boolean) => {
    const newSelection = new Set(selectedContacts);
    if (checked) {
      newSelection.add(resourceName);
    } else {
      newSelection.delete(resourceName);
    }
    setSelectedContacts(newSelection);
  };

  const handleSelectAll = () => {
    if (selectedContacts.size === contacts.length) {
      setSelectedContacts(new Set());
    } else {
      setSelectedContacts(new Set(contacts.map(c => c.resourceName)));
    }
  };

  const importContacts = async (importAll: boolean = false) => {
    setIsImporting(true);
    setImportResult(null);
    
    try {
      // Invia solo i resourceNames (ID) per sicurezza - i dati vengono recuperati lato server
      const resourceNamesToSend = importAll 
        ? [] 
        : Array.from(selectedContacts);
      
      const response = await fetch('/api/google-auth/contacts/import', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ 
          resourceNames: resourceNamesToSend,
          importAll 
        }),
      });
      
      const data = await response.json();
      
      if (response.ok && data.success) {
        setImportResult({ 
          success: true, 
          message: data.message || `Importati ${data.imported} contatti` 
        });
        toast({
          title: "✅ Importazione completata",
          description: data.message,
        });
        // Invalida la cache dei clienti per mostrare i nuovi clienti importati
        await queryClient.invalidateQueries({ queryKey: ['/api/clients'] });
        // Resetta selezione
        setSelectedContacts(new Set());
        if (!importAll) {
          // Rimuovi i contatti importati dalla lista
          setContacts(prev => prev.filter(c => !selectedContacts.has(c.resourceName)));
        } else {
          setContacts([]);
          setContactsLoaded(false);
        }
      } else {
        if (data.needsReauth) {
          setNeedsContactsReauth(true);
        }
        setImportResult({ success: false, message: data.error || "Errore nell'importazione" });
        toast({
          title: "Errore",
          description: data.error || "Errore nell'importazione dei contatti",
          variant: "destructive",
        });
      }
    } catch (error) {
      setImportResult({ success: false, message: "Errore di connessione" });
      toast({
        title: "Errore",
        description: "Errore di connessione",
        variant: "destructive",
      });
    } finally {
      setIsImporting(false);
    }
  };

  // === Funzioni per importazione CSV ===
  const handleCsvFileUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (e) => {
      try {
        const text = e.target?.result as string;
        const lines = text.split('\n').filter(line => line.trim());
        
        if (lines.length < 2) {
          toast({
            title: "File vuoto",
            description: "Il file CSV non contiene dati",
            variant: "destructive",
          });
          return;
        }

        // Parse header
        const header = lines[0].toLowerCase().split(/[,;]/);
        const nameIdx = header.findIndex(h => h.includes('nome') || h.includes('name'));
        const emailIdx = header.findIndex(h => h.includes('email') || h.includes('mail'));
        const phoneIdx = header.findIndex(h => h.includes('telefono') || h.includes('phone') || h.includes('tel'));

        if (nameIdx === -1 && emailIdx === -1 && phoneIdx === -1) {
          toast({
            title: "Formato non valido",
            description: "Il file deve contenere colonne: nome, email o telefono",
            variant: "destructive",
          });
          return;
        }

        // Parse contacts
        const parsedContacts = [];
        for (let i = 1; i < lines.length; i++) {
          const values = lines[i].split(/[,;]/);
          const contact = {
            name: nameIdx >= 0 ? values[nameIdx]?.trim().replace(/"/g, '') || '' : '',
            email: emailIdx >= 0 ? values[emailIdx]?.trim().replace(/"/g, '') || '' : '',
            phone: phoneIdx >= 0 ? values[phoneIdx]?.trim().replace(/"/g, '') || '' : '',
          };
          
          // Aggiungi solo se ha almeno un dato
          if (contact.name || contact.email || contact.phone) {
            parsedContacts.push(contact);
          }
        }

        setCsvContacts(parsedContacts);
        setSelectedCsvContacts(new Set(parsedContacts.map((_, i) => i)));
        setCsvImportResult(null);
        
        toast({
          title: "File caricato",
          description: `Trovati ${parsedContacts.length} contatti nel file`,
        });
      } catch (error) {
        toast({
          title: "Errore lettura file",
          description: "Impossibile leggere il file CSV",
          variant: "destructive",
        });
      }
    };
    reader.readAsText(file);
  };

  const handleImportCsvContacts = async () => {
    if (selectedCsvContacts.size === 0) {
      toast({
        title: "Nessun contatto selezionato",
        description: "Seleziona almeno un contatto da importare",
        variant: "destructive",
      });
      return;
    }

    setIsImportingCsv(true);
    setCsvImportResult(null);

    try {
      const contactsToImport = csvContacts
        .filter((_, i) => selectedCsvContacts.has(i))
        .map(c => ({
          firstName: c.name.split(' ')[0] || c.name,
          lastName: c.name.split(' ').slice(1).join(' ') || '',
          email: c.email,
          phone: c.phone,
          notes: 'Importato da file CSV'
        }));

      const response = await fetch('/api/clients/import-csv', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ contacts: contactsToImport }),
      });

      const data = await response.json();

      if (response.ok && data.success) {
        setCsvImportResult({ 
          success: true, 
          message: `Importati ${data.imported} contatti` + (data.skipped > 0 ? `, ${data.skipped} già esistenti` : '')
        });
        toast({
          title: "Importazione completata",
          description: `Importati ${data.imported} contatti`,
        });
        // Pulisci la lista
        setCsvContacts([]);
        setSelectedCsvContacts(new Set());
        queryClient.invalidateQueries({ queryKey: ['/api/clients'] });
      } else {
        setCsvImportResult({ success: false, message: data.error || "Errore nell'importazione" });
        toast({
          title: "Errore",
          description: data.error || "Errore nell'importazione",
          variant: "destructive",
        });
      }
    } catch (error) {
      setCsvImportResult({ success: false, message: "Errore di connessione" });
      toast({
        title: "Errore",
        description: "Errore di connessione",
        variant: "destructive",
      });
    } finally {
      setIsImportingCsv(false);
    }
  };

  const toggleCsvContact = (index: number) => {
    setSelectedCsvContacts(prev => {
      const next = new Set(prev);
      if (next.has(index)) {
        next.delete(index);
      } else {
        next.add(index);
      }
      return next;
    });
  };

  const selectAllCsv = () => {
    setSelectedCsvContacts(new Set(csvContacts.map((_, i) => i)));
  };

  const deselectAllCsv = () => {
    setSelectedCsvContacts(new Set());
  };

  if (isLoading || isCheckingStatus) {
    return (
      <div className="container py-12 flex items-center justify-center min-h-screen">
        <RefreshCw className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  if (!hasProAccess) {
    return (
      <div className="container py-12">
        <Card className="max-w-md w-full mx-auto">
          <CardHeader className="text-center">
            <div className="flex justify-center mb-4">
              <Calendar className="h-12 w-12 text-amber-500" />
            </div>
            <CardTitle>{t('googleCalendar.setup.proFeatureTitle')}</CardTitle>
            <CardDescription>
              {t('googleCalendar.setup.proFeatureDesc')}
            </CardDescription>
          </CardHeader>
          <CardContent>
            <p className="text-center text-sm text-muted-foreground mb-4">
              {t('googleCalendar.setup.proOnlyMessage')}
            </p>
          </CardContent>
          <div className="flex flex-col gap-2 px-6 pb-6">
            <Link to="/subscribe">
              <Button className="w-full">
                {t('googleCalendar.setup.upgradeToPro')}
              </Button>
            </Link>
            <Link to="/dashboard">
              <Button variant="outline" className="w-full">
                {t('googleCalendar.setup.backToDashboard')}
              </Button>
            </Link>
          </div>
        </Card>
      </div>
    );
  }

  return (
    <div className="container py-8 max-w-2xl">
      <div className="mb-6">
        <Link to="/pro-features" className="text-sm text-primary hover:underline flex items-center gap-1 mb-4">
          ← {t('googleCalendar.setup.backToProFeatures')}
        </Link>
      </div>

      <Card>
        <CardHeader className="bg-gradient-to-r from-primary/10 to-primary/5 border-b">
          <div className="flex items-start justify-between">
            <div>
              <CardTitle className="flex items-center text-2xl gap-2">
                <Calendar className="h-6 w-6 text-primary" />
                {t('googleCalendar.setup.syncTitle')}
              </CardTitle>
              <CardDescription className="mt-2">
                {t('googleCalendar.setup.syncDescription')}
              </CardDescription>
            </div>
            <div className="px-3 py-1 bg-primary text-primary-foreground rounded-full text-xs font-semibold">
              PRO
            </div>
          </div>
        </CardHeader>

        <CardContent className="pt-8">
          <div className="space-y-8">
            {/* Passaggi semplificati */}
            <div className="space-y-4">
              <h3 className="font-semibold text-lg">{t('googleCalendar.setup.howItWorks')}</h3>
              
              <div className="space-y-3">
                <div className="flex gap-4">
                  <div className="flex-shrink-0 w-8 h-8 rounded-full bg-primary/20 text-primary flex items-center justify-center font-semibold text-sm">1</div>
                  <div>
                    <p className="font-medium">{t('googleCalendar.setup.step1Title')}</p>
                    <p className="text-sm text-muted-foreground">{t('googleCalendar.setup.step1Desc')}</p>
                  </div>
                </div>

                <div className="flex gap-4">
                  <div className="flex-shrink-0 w-8 h-8 rounded-full bg-primary/20 text-primary flex items-center justify-center font-semibold text-sm">2</div>
                  <div>
                    <p className="font-medium">{t('googleCalendar.setup.step2Title')}</p>
                    <p className="text-sm text-muted-foreground">{t('googleCalendar.setup.step2Desc')}</p>
                  </div>
                </div>

                <div className="flex gap-4">
                  <div className="flex-shrink-0 w-8 h-8 rounded-full bg-primary/20 text-primary flex items-center justify-center font-semibold text-sm">3</div>
                  <div>
                    <p className="font-medium">{t('googleCalendar.setup.step3Title')}</p>
                    <p className="text-sm text-muted-foreground">{t('googleCalendar.setup.step3Desc')}</p>
                  </div>
                </div>
              </div>
            </div>

            {/* Divider */}
            <div className="border-t" />

            {/* Form */}
            <div className="space-y-6">
              <div className="space-y-2">
                <Label className="flex items-center gap-2">
                  <Mail className="h-4 w-4" />
                  {t('googleCalendar.setup.emailLabel')}
                </Label>
                <Input
                  type="email"
                  placeholder={t('googleCalendar.setup.emailPlaceholder')}
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  disabled={isAuthenticating}
                  className="text-base"
                />
                <p className="text-xs text-muted-foreground">
                  {t('googleCalendar.setup.emailHint')}
                </p>
              </div>

              {/* Bottone connessione */}
              {!isGoogleAuthorized ? (
                <Button
                  onClick={startGoogleAuth}
                  disabled={isAuthenticating || !email.trim()}
                  className="w-full h-11 text-base"
                  size="lg"
                >
                  {isAuthenticating ? (
                    <>
                      <RefreshCw className="h-4 w-4 mr-2 animate-spin" />
                      {t('googleCalendar.setup.connecting')}
                    </>
                  ) : (
                    <>
                      <Calendar className="h-4 w-4 mr-2" />
                      {t('googleCalendar.setup.connectButton')}
                      <ArrowRight className="h-4 w-4 ml-2" />
                    </>
                  )}
                </Button>
              ) : (
                <div className="bg-green-50 dark:bg-green-950 p-4 rounded-lg border border-green-200 dark:border-green-800 flex items-start gap-3">
                  <Check className="h-5 w-5 text-green-600 dark:text-green-400 mt-0.5 flex-shrink-0" />
                  <div>
                    <p className="font-medium text-green-900 dark:text-green-100">{t('googleCalendar.setup.connectedSuccess')}</p>
                    <p className="text-sm text-green-700 dark:text-green-300 mt-1">
                      {email} {t('googleCalendar.setup.connectedEmail').replace('{{email}}', '')}
                    </p>
                  </div>
                </div>
              )}

              {/* Toggle sincronizzazione */}
              {isGoogleAuthorized && (
                <div className="space-y-4">
                  <div className="bg-blue-50 dark:bg-blue-950 border border-blue-200 dark:border-blue-800 rounded-lg p-4">
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="font-medium text-blue-900 dark:text-blue-100">{t('googleCalendar.setup.enableSync')}</p>
                        <p className="text-sm text-blue-700 dark:text-blue-300 mt-1">
                          {t('googleCalendar.setup.syncToGoogle')}
                        </p>
                      </div>
                      <Switch
                        checked={isSyncEnabled}
                        onCheckedChange={handleSyncToggle}
                        disabled={isSaving}
                      />
                    </div>
                  </div>
                  
                  {/* Pulsante sincronizzazione manuale */}
                  <Button
                    onClick={handleManualSync}
                    disabled={isSyncing}
                    className="w-full"
                    variant="outline"
                  >
                    {isSyncing ? (
                      <>
                        <RefreshCw className="h-4 w-4 mr-2 animate-spin" />
                        Sincronizzazione in corso...
                      </>
                    ) : (
                      <>
                        <RefreshCw className="h-4 w-4 mr-2" />
                        Sincronizza ora
                      </>
                    )}
                  </Button>
                  
                  {/* Risultato ultima sincronizzazione */}
                  {lastSyncResult && (
                    <div className={`p-3 rounded-lg text-sm ${
                      lastSyncResult.success 
                        ? 'bg-green-50 dark:bg-green-950 text-green-800 dark:text-green-200 border border-green-200 dark:border-green-800'
                        : 'bg-red-50 dark:bg-red-950 text-red-800 dark:text-red-200 border border-red-200 dark:border-red-800'
                    }`}>
                      {lastSyncResult.success ? '✅' : '❌'} {lastSyncResult.message}
                    </div>
                  )}
                  
                  {/* Stato permanente della sincronizzazione */}
                  {lastSyncAt && (
                    <div className="bg-purple-50 dark:bg-purple-950 p-4 rounded-lg border border-purple-200 dark:border-purple-800">
                      <div className="flex items-center gap-3">
                        <Calendar className="h-5 w-5 text-purple-600 dark:text-purple-400" />
                        <div>
                          <p className="font-medium text-purple-900 dark:text-purple-100">
                            Stato sincronizzazione
                          </p>
                          <p className="text-sm text-purple-700 dark:text-purple-300 mt-1">
                            Ultima sincronizzazione: {new Date(lastSyncAt).toLocaleString('it-IT', { 
                              day: '2-digit', 
                              month: '2-digit', 
                              year: 'numeric',
                              hour: '2-digit', 
                              minute: '2-digit' 
                            })}
                          </p>
                          <p className="text-sm text-purple-700 dark:text-purple-300">
                            Eventi sincronizzati: {totalSyncedEvents}
                          </p>
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              )}
            </div>

            {/* Note sicurezza */}
            <div className="bg-slate-50 dark:bg-slate-900 p-4 rounded-lg border border-slate-200 dark:border-slate-800">
              <div className="flex gap-3">
                <AlertCircle className="h-5 w-5 text-slate-500 flex-shrink-0 mt-0.5" />
                <div className="text-sm text-slate-600 dark:text-slate-400">
                  <p className="font-medium mb-1">🔒 {t('googleCalendar.setup.privacyTitle')}</p>
                  <p>
                    {t('googleCalendar.setup.privacyDesc')}
                  </p>
                </div>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* === SEZIONE SINCRONIZZAZIONE CONTATTI === */}
      {isGoogleAuthorized && (
        <Card className="mt-6">
          <CardHeader className="bg-gradient-to-r from-blue-500/10 to-blue-400/5 border-b">
            <div className="flex items-start justify-between">
              <div>
                <CardTitle className="flex items-center text-xl gap-2">
                  <Users className="h-5 w-5 text-blue-600" />
                  Sincronizzazione Contatti Google
                </CardTitle>
                <CardDescription className="mt-2">
                  Importa i contatti dalla tua rubrica Google come clienti
                </CardDescription>
              </div>
              <div className="px-3 py-1 bg-blue-600 text-white rounded-full text-xs font-semibold">
                PRO
              </div>
            </div>
          </CardHeader>

          <CardContent className="pt-6">
            <div className="space-y-4">
              {/* Banner funzione in fase di test */}
              <div className="bg-yellow-50 dark:bg-yellow-950 p-4 rounded-lg border border-yellow-300 dark:border-yellow-700">
                <div className="flex items-start gap-3">
                  <AlertCircle className="h-5 w-5 text-yellow-600 dark:text-yellow-400 flex-shrink-0 mt-0.5" />
                  <div>
                    <p className="font-medium text-yellow-900 dark:text-yellow-100">
                      🧪 Funzione in fase di test
                    </p>
                    <p className="text-sm text-yellow-700 dark:text-yellow-300 mt-1">
                      L'importazione contatti Google è attualmente disponibile solo per gli utenti tester autorizzati. 
                      Se non sei tra i tester, potresti vedere un errore "Accesso bloccato" da Google.
                    </p>
                  </div>
                </div>
              </div>
              
              {/* Banner riautenticazione necessaria */}
              {needsContactsReauth && (
                <div className="bg-amber-50 dark:bg-amber-950 p-4 rounded-lg border border-amber-200 dark:border-amber-800">
                  <div className="flex items-start gap-3">
                    <AlertCircle className="h-5 w-5 text-amber-600 dark:text-amber-400 flex-shrink-0 mt-0.5" />
                    <div className="flex-1">
                      <p className="font-medium text-amber-900 dark:text-amber-100">
                        Riconnessione necessaria
                      </p>
                      <p className="text-sm text-amber-700 dark:text-amber-300 mt-1">
                        Per accedere ai contatti è necessario riconnettere il tuo account Google con i nuovi permessi.
                      </p>
                      <Button 
                        onClick={handleReconnectGoogle} 
                        className="mt-3 bg-amber-600 hover:bg-amber-700"
                        size="sm"
                      >
                        Riconnetti Google
                      </Button>
                    </div>
                  </div>
                </div>
              )}

              {/* Pulsante per caricare i contatti */}
              {!contactsLoaded && !needsContactsReauth ? (
                <Button
                  onClick={loadGoogleContacts}
                  disabled={isLoadingContacts}
                  className="w-full"
                  variant="outline"
                >
                  {isLoadingContacts ? (
                    <>
                      <RefreshCw className="h-4 w-4 mr-2 animate-spin" />
                      Caricamento contatti...
                    </>
                  ) : (
                    <>
                      <Download className="h-4 w-4 mr-2" />
                      Carica contatti da Google
                    </>
                  )}
                </Button>
              ) : (
                <>
                  {/* Info contatti trovati */}
                  <div className="bg-blue-50 dark:bg-blue-950 p-4 rounded-lg border border-blue-200 dark:border-blue-800">
                    <p className="font-medium text-blue-900 dark:text-blue-100">
                      Trovati {contacts.length} contatti
                    </p>
                    <p className="text-sm text-blue-700 dark:text-blue-300 mt-1">
                      Seleziona i contatti da importare o usa "Importa tutti"
                    </p>
                  </div>

                  {/* Pulsanti azioni */}
                  <div className="flex gap-2 flex-wrap">
                    <Button
                      onClick={handleSelectAll}
                      variant="outline"
                      size="sm"
                      disabled={needsContactsReauth}
                    >
                      <CheckSquare className="h-4 w-4 mr-2" />
                      {selectedContacts.size === contacts.length ? 'Deseleziona tutti' : 'Seleziona tutti'}
                    </Button>
                    <Button
                      onClick={() => importContacts(true)}
                      disabled={isImporting || contacts.length === 0 || needsContactsReauth}
                      variant="default"
                      size="sm"
                    >
                      {isImporting ? (
                        <RefreshCw className="h-4 w-4 mr-2 animate-spin" />
                      ) : (
                        <Download className="h-4 w-4 mr-2" />
                      )}
                      Importa tutti ({contacts.length})
                    </Button>
                    {selectedContacts.size > 0 && (
                      <Button
                        onClick={() => importContacts(false)}
                        disabled={isImporting || needsContactsReauth}
                        variant="secondary"
                        size="sm"
                      >
                        Importa selezionati ({selectedContacts.size})
                      </Button>
                    )}
                  </div>

                  {/* Lista contatti con checkbox */}
                  {contacts.length > 0 && (
                    <ScrollArea className="h-64 border rounded-lg p-2">
                      <div className="space-y-2">
                        {contacts.map((contact) => (
                          <div 
                            key={contact.resourceName}
                            className="flex items-center gap-3 p-2 hover:bg-slate-50 dark:hover:bg-slate-900 rounded-lg cursor-pointer"
                            onClick={() => handleContactSelection(contact.resourceName, !selectedContacts.has(contact.resourceName))}
                          >
                            <Checkbox
                              checked={selectedContacts.has(contact.resourceName)}
                              onCheckedChange={(checked) => handleContactSelection(contact.resourceName, !!checked)}
                            />
                            <div className="flex-1 min-w-0">
                              <p className="font-medium text-sm truncate">{contact.name || 'Senza nome'}</p>
                              <div className="flex gap-2 text-xs text-muted-foreground">
                                {contact.email && <span>{contact.email}</span>}
                                {contact.phone && <span>{contact.phone}</span>}
                              </div>
                            </div>
                          </div>
                        ))}
                      </div>
                    </ScrollArea>
                  )}

                  {/* Pulsante ricarica */}
                  <Button
                    onClick={loadGoogleContacts}
                    disabled={isLoadingContacts}
                    variant="ghost"
                    size="sm"
                    className="w-full"
                  >
                    <RefreshCw className={`h-4 w-4 mr-2 ${isLoadingContacts ? 'animate-spin' : ''}`} />
                    Ricarica contatti
                  </Button>
                </>
              )}

              {/* Risultato importazione */}
              {importResult && (
                <div className={`p-3 rounded-lg text-sm ${
                  importResult.success 
                    ? 'bg-green-50 dark:bg-green-950 text-green-800 dark:text-green-200 border border-green-200 dark:border-green-800'
                    : 'bg-red-50 dark:bg-red-950 text-red-800 dark:text-red-200 border border-red-200 dark:border-red-800'
                }`}>
                  {importResult.success ? '✅' : '❌'} {importResult.message}
                </div>
              )}

              {/* Note */}
              <div className="text-xs text-muted-foreground">
                <p>• I contatti già esistenti (stesso email o telefono) verranno saltati</p>
                <p>• I contatti importati avranno la nota "Importato da Google Contacts"</p>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* === SEZIONE IMPORTAZIONE DA FILE CSV === */}
      <Card className="mt-6">
        <CardHeader className="bg-gradient-to-r from-green-500/10 to-green-400/5 border-b">
          <div className="flex items-start justify-between">
            <div>
              <CardTitle className="flex items-center text-xl gap-2">
                <FileSpreadsheet className="h-5 w-5 text-green-600" />
                Importa da File (CSV/vCard)
              </CardTitle>
              <CardDescription className="mt-2">
                Per chi non usa Gmail: importa i contatti dal telefono o da altri servizi
              </CardDescription>
            </div>
          </div>
        </CardHeader>

        <CardContent className="pt-6">
          <div className="space-y-4">
            {/* Istruzioni a tendina */}
            <div className="border rounded-lg overflow-hidden">
              <button
                onClick={() => setShowCsvInstructions(!showCsvInstructions)}
                className="w-full flex items-center justify-between p-4 bg-gray-50 dark:bg-gray-900 hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors"
              >
                <div className="flex items-center gap-2">
                  <Info className="h-4 w-4 text-blue-500" />
                  <span className="font-medium">Come esportare i contatti dal telefono</span>
                </div>
                {showCsvInstructions ? (
                  <ChevronUp className="h-4 w-4" />
                ) : (
                  <ChevronDown className="h-4 w-4" />
                )}
              </button>
              
              {showCsvInstructions && (
                <div className="p-4 bg-white dark:bg-gray-950 text-sm space-y-4">
                  <div>
                    <h4 className="font-semibold text-green-700 dark:text-green-400 mb-2">📱 iPhone (iCloud)</h4>
                    <ol className="list-decimal list-inside space-y-1 text-muted-foreground">
                      <li>Vai su <strong>icloud.com/contacts</strong> dal computer</li>
                      <li>Seleziona i contatti da esportare (o "Seleziona tutto")</li>
                      <li>Clicca l'icona ingranaggio → <strong>Esporta vCard</strong></li>
                      <li>Converti il file .vcf in CSV con un convertitore online</li>
                    </ol>
                  </div>
                  
                  <div>
                    <h4 className="font-semibold text-green-700 dark:text-green-400 mb-2">📱 Android (senza Gmail)</h4>
                    <ol className="list-decimal list-inside space-y-1 text-muted-foreground">
                      <li>Apri l'app <strong>Contatti</strong> sul telefono</li>
                      <li>Menu → <strong>Impostazioni</strong> → <strong>Esporta</strong></li>
                      <li>Scegli <strong>Esporta in file .vcf</strong></li>
                      <li>Invia il file al computer e convertilo in CSV</li>
                    </ol>
                  </div>
                  
                  <div>
                    <h4 className="font-semibold text-green-700 dark:text-green-400 mb-2">💻 Outlook / Microsoft</h4>
                    <ol className="list-decimal list-inside space-y-1 text-muted-foreground">
                      <li>Apri <strong>Outlook.com</strong> → Persone</li>
                      <li>Clicca <strong>Gestisci</strong> → <strong>Esporta contatti</strong></li>
                      <li>Scegli formato <strong>CSV</strong></li>
                    </ol>
                  </div>
                  
                  <div className="bg-blue-50 dark:bg-blue-950 p-3 rounded-lg border border-blue-200 dark:border-blue-800">
                    <p className="font-medium text-blue-900 dark:text-blue-100 mb-1">📋 Formato file richiesto</p>
                    <p className="text-blue-700 dark:text-blue-300 text-xs">
                      Il file CSV deve avere le colonne: <strong>Nome</strong>, <strong>Email</strong>, <strong>Telefono</strong><br/>
                      Esempio: <code>Nome,Email,Telefono</code> oppure <code>Name,Email,Phone</code>
                    </p>
                  </div>
                </div>
              )}
            </div>

            {/* Upload file */}
            <div className="flex items-center gap-4">
              <Label
                htmlFor="csv-upload"
                className="flex-1 cursor-pointer"
              >
                <div className="flex items-center justify-center gap-2 p-4 border-2 border-dashed rounded-lg hover:border-green-500 hover:bg-green-50 dark:hover:bg-green-950 transition-colors">
                  <Upload className="h-5 w-5 text-green-600" />
                  <span>Clicca per caricare un file CSV</span>
                </div>
                <Input
                  id="csv-upload"
                  type="file"
                  accept=".csv,.txt"
                  className="hidden"
                  onChange={handleCsvFileUpload}
                />
              </Label>
            </div>

            {/* Lista contatti caricati */}
            {csvContacts.length > 0 && (
              <>
                <div className="bg-green-50 dark:bg-green-950 p-4 rounded-lg border border-green-200 dark:border-green-800">
                  <p className="font-medium text-green-900 dark:text-green-100">
                    Trovati {csvContacts.length} contatti
                  </p>
                  <p className="text-sm text-green-700 dark:text-green-300 mt-1">
                    {selectedCsvContacts.size} selezionati per l'importazione
                  </p>
                </div>

                <div className="flex gap-2">
                  <Button variant="outline" size="sm" onClick={selectAllCsv}>
                    Seleziona tutti
                  </Button>
                  <Button variant="outline" size="sm" onClick={deselectAllCsv}>
                    Deseleziona tutti
                  </Button>
                  <Button 
                    className="ml-auto bg-green-600 hover:bg-green-700"
                    size="sm"
                    onClick={handleImportCsvContacts}
                    disabled={isImportingCsv || selectedCsvContacts.size === 0}
                  >
                    {isImportingCsv ? (
                      <>
                        <RefreshCw className="h-4 w-4 mr-2 animate-spin" />
                        Importazione...
                      </>
                    ) : (
                      <>
                        <Download className="h-4 w-4 mr-2" />
                        Importa {selectedCsvContacts.size} contatti
                      </>
                    )}
                  </Button>
                </div>

                <ScrollArea className="h-64 border rounded-lg p-2">
                  <div className="space-y-1">
                    {csvContacts.map((contact, index) => (
                      <div
                        key={index}
                        className={`flex items-center gap-3 p-2 rounded hover:bg-gray-50 dark:hover:bg-gray-900 ${
                          selectedCsvContacts.has(index) ? 'bg-green-50 dark:bg-green-950' : ''
                        }`}
                      >
                        <Checkbox
                          checked={selectedCsvContacts.has(index)}
                          onCheckedChange={() => toggleCsvContact(index)}
                        />
                        <div className="flex-1 min-w-0">
                          <p className="font-medium text-sm truncate">{contact.name || 'Senza nome'}</p>
                          <div className="flex gap-2 text-xs text-muted-foreground">
                            {contact.email && <span>{contact.email}</span>}
                            {contact.phone && <span>{contact.phone}</span>}
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </ScrollArea>
              </>
            )}

            {/* Risultato importazione */}
            {csvImportResult && (
              <div className={`p-3 rounded-lg text-sm ${
                csvImportResult.success 
                  ? 'bg-green-50 dark:bg-green-950 text-green-800 dark:text-green-200 border border-green-200 dark:border-green-800'
                  : 'bg-red-50 dark:bg-red-950 text-red-800 dark:text-red-200 border border-red-200 dark:border-red-800'
              }`}>
                {csvImportResult.success ? '✅' : '❌'} {csvImportResult.message}
              </div>
            )}

            {/* Note */}
            <div className="text-xs text-muted-foreground">
              <p>• Formati supportati: CSV (separatore virgola o punto e virgola)</p>
              <p>• I contatti già esistenti verranno saltati automaticamente</p>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
