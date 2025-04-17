import React, { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Calendar, Check, ExternalLink, Loader2, X, Mail } from 'lucide-react';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import { Switch } from '@/components/ui/switch';
import { useToast } from '@/hooks/use-toast';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { 
  loadGoogleCalendarSettings, 
  saveGoogleCalendarSettings, 
  getGoogleAuthUrl, 
  exchangeCodeForToken,
  getAvailableCalendars,
  GoogleCalendarSettings as GoogleCalendarSettingsType,
} from '@/lib/googleCalendar';

export default function GoogleCalendarSettingsComponent() {
  const { t } = useTranslation();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  
  // Stati per le impostazioni
  const [calendarEmail, setCalendarEmail] = useState('');
  const [isEnabled, setIsEnabled] = useState(false);
  
  // Stati nascosti (mantenuti per compatibilità)
  const [clientId, setClientId] = useState('');
  const [clientSecret, setClientSecret] = useState('');
  const [redirectUri, setRedirectUri] = useState(window.location.origin + "/settings");
  const [authUrl, setAuthUrl] = useState<string | null>(null);
  const [authCode, setAuthCode] = useState('');
  const [showAuthDialog, setShowAuthDialog] = useState(false);
  const [isExchangingCode, setIsExchangingCode] = useState(false);
  const [showCalendarSelector, setShowCalendarSelector] = useState(false);
  
  // Query per ottenere le impostazioni attuali
  const { 
    data: settings,
    isLoading: isLoadingSettings,
    error: settingsError,
  } = useQuery({
    queryKey: ['/api/google-calendar/settings'],
    queryFn: loadGoogleCalendarSettings,
  });
  
  // Carica i calendari disponibili
  const {
    data: availableCalendars,
    isLoading: isLoadingCalendars,
    refetch: refetchCalendars
  } = useQuery({
    queryKey: ['/api/google-calendar/calendars'],
    queryFn: getAvailableCalendars,
    enabled: !!settings?.refreshToken, // Abilita la query solo se l'utente è autenticato
  });
  
  // Imposta i valori del form quando le impostazioni vengono caricate
  useEffect(() => {
    if (settings) {
      setCalendarEmail(settings.calendarId || "");
      setIsEnabled(settings.enabled);
      
      // Imposta anche i valori nascosti per compatibilità
      setClientId(settings.clientId || "");
      setRedirectUri(settings.redirectUri || window.location.origin + "/settings");
    }
  }, [settings]);
  
  // Mutation per salvare le impostazioni
  const saveSettingsMutation = useMutation({
    mutationFn: async (settings: GoogleCalendarSettingsType) => {
      return await saveGoogleCalendarSettings(settings);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/google-calendar/settings'] });
      toast({
        title: "Impostazioni salvate",
        description: "Le impostazioni di sincronizzazione sono state salvate con successo",
      });
    },
    onError: () => {
      toast({
        title: "Errore",
        description: "Impossibile salvare le impostazioni. Riprova più tardi.",
        variant: "destructive",
      });
    }
  });
  
  // Mutation per scambiare il codice di autorizzazione
  const exchangeCodeMutation = useMutation({
    mutationFn: async (code: string) => {
      return await exchangeCodeForToken(
        code,
        clientId,
        clientSecret,
        redirectUri
      );
    },
    onSuccess: (success) => {
      if (success) {
        queryClient.invalidateQueries({ queryKey: ['/api/google-calendar/settings'] });
        toast({
          title: "Autorizzazione completata",
          description: "Il tuo account Google è stato collegato con successo",
        });
        setShowAuthDialog(false);
      } else {
        toast({
          title: "Errore di autorizzazione",
          description: "Non è stato possibile autorizzare il tuo account Google. Verifica il codice inserito.",
          variant: "destructive",
        });
      }
    },
    onError: () => {
      toast({
        title: "Errore",
        description: "Si è verificato un errore durante l'autorizzazione con Google",
        variant: "destructive",
      });
    }
  });
  
  // Funzione per selezionare un calendario
  const handleSelectCalendar = (calendarId: string) => {
    setCalendarEmail(calendarId);
    setShowCalendarSelector(false);
  };
    
  // Salva le impostazioni
  const handleSaveSettings = () => {
    const updatedSettings: GoogleCalendarSettingsType = {
      enabled: isEnabled,
      calendarId: calendarEmail,
      
      // Mantieni i valori esistenti per retrocompatibilità
      clientId: settings?.clientId || clientId,
      clientSecret: settings?.clientSecret || clientSecret,
      redirectUri: settings?.redirectUri || redirectUri,
    };
    
    saveSettingsMutation.mutate(updatedSettings);
  };
  
  // Gestisci lo scambio di codice (per compatibilità)
  const handleExchangeCode = () => {
    if (!authCode) {
      toast({
        title: "Codice mancante",
        description: "Inserire il codice di autorizzazione fornito da Google",
        variant: "destructive",
      });
      return;
    }
    
    setIsExchangingCode(true);
    exchangeCodeMutation.mutate(authCode);
  };
  
  // Se le impostazioni stanno ancora caricando
  if (isLoadingSettings) {
    return (
      <Card className="w-full">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Calendar className="h-5 w-5" />
            Sincronizzazione Google Calendar
          </CardTitle>
          <CardDescription>
            Sincronizza gli appuntamenti con il tuo calendario Google
          </CardDescription>
        </CardHeader>
        <CardContent className="flex justify-center items-center p-8">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
        </CardContent>
      </Card>
    );
  }
  
  // Se c'è stato un errore nel caricamento delle impostazioni
  if (settingsError) {
    return (
      <Card className="w-full">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Calendar className="h-5 w-5" />
            Sincronizzazione Google Calendar
          </CardTitle>
          <CardDescription>
            Sincronizza gli appuntamenti con il tuo calendario Google
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="text-red-500">
            Errore durante il caricamento delle impostazioni di sincronizzazione
          </div>
        </CardContent>
      </Card>
    );
  }
  
  return (
    <>
      <Card className="w-full">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Calendar className="h-5 w-5" />
            Sincronizzazione Google Calendar
          </CardTitle>
          <CardDescription>
            Sincronizza gli appuntamenti con il tuo calendario Google
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-6">
            <div className="flex items-center justify-between">
              <div className="space-y-0.5">
                <h3 className="font-medium text-base">
                  Attiva sincronizzazione con Google Calendar
                </h3>
                <p className="text-sm text-muted-foreground">
                  Quando è attiva, gli appuntamenti verranno sincronizzati automaticamente con il calendario Google specificato
                </p>
              </div>
              <Switch
                checked={isEnabled}
                onCheckedChange={setIsEnabled}
              />
            </div>
            
            <div className="p-4 border rounded-md bg-blue-50 dark:bg-blue-950">
              <h3 className="font-medium mb-2 flex items-center gap-2">
                <Mail className="h-5 w-5 text-blue-600 dark:text-blue-400" />
                Indirizzo Gmail
              </h3>
              <p className="text-sm mb-4">
                Inserisci l'indirizzo Gmail del calendario con cui desideri sincronizzare gli appuntamenti:
              </p>
              
              <div className="space-y-2">
                <Input
                  value={calendarEmail}
                  onChange={(e) => setCalendarEmail(e.target.value)}
                  placeholder="tuo.indirizzo@gmail.com"
                  className="mb-1"
                />
                <p className="text-xs text-muted-foreground">
                  Puoi inserire sia "primary" per il tuo calendario principale, sia un indirizzo Gmail specifico
                </p>
              </div>
            </div>
            
            {settings?.refreshToken ? (
              <div className="p-4 border rounded-md bg-green-50 dark:bg-green-950 flex items-center gap-2">
                <Check className="h-5 w-5 text-green-600 dark:text-green-400" />
                <span>Il tuo account Google è già stato autorizzato</span>
              </div>
            ) : (
              <div className="p-4 border rounded-md bg-amber-50 dark:bg-amber-950 flex flex-col gap-3">
                <div className="flex items-start gap-2">
                  <X className="h-5 w-5 text-amber-600 dark:text-amber-400 shrink-0 mt-0.5" />
                  <div>
                    <p className="font-medium">Account Google non autorizzato</p>
                    <p className="text-sm text-muted-foreground">
                      Per completare la configurazione, devi autorizzare l'accesso al tuo account Google.
                    </p>
                  </div>
                </div>
                
                <div className="space-y-4">
                  {/* Client ID e Client Secret (hidden in prod) */}
                  <div className="grid grid-cols-1 gap-4">
                    <div className="space-y-2">
                      <Label htmlFor="client-id">Google Client ID</Label>
                      <Input
                        id="client-id"
                        value={clientId}
                        onChange={(e) => setClientId(e.target.value)}
                        placeholder="Il tuo Client ID di Google"
                      />
                      <p className="text-xs text-muted-foreground">
                        Ottieni questo valore dalla Console Google Cloud
                      </p>
                    </div>
                    
                    <div className="space-y-2">
                      <Label htmlFor="client-secret">Google Client Secret</Label>
                      <Input
                        id="client-secret"
                        type="password"
                        value={clientSecret}
                        onChange={(e) => setClientSecret(e.target.value)}
                        placeholder="Il tuo Client Secret di Google"
                      />
                      <p className="text-xs text-muted-foreground">
                        Ottieni questo valore dalla Console Google Cloud
                      </p>
                    </div>
                  </div>
                
                  <Button
                    variant="secondary"
                    className="w-full"
                    disabled={!clientId || !clientSecret || !redirectUri}
                    onClick={async () => {
                      // Salva le credenziali prima di richiedere l'autorizzazione
                      saveSettingsMutation.mutate({
                        enabled: true,
                        clientId,
                        clientSecret,
                        redirectUri,
                        calendarId: 'primary'
                      });
                      
                      try {
                        // Ottieni l'URL di autorizzazione
                        const url = await getGoogleAuthUrl(clientId, redirectUri);
                        if (url) {
                          setAuthUrl(url);
                          setShowAuthDialog(true);
                        }
                      } catch (error) {
                        console.error('Errore nel recupero URL auth:', error);
                        toast({
                          title: "Errore",
                          description: "Impossibile generare l'URL di autorizzazione",
                          variant: "destructive"
                        });
                      }
                    }}
                  >
                    Inizia processo di autorizzazione
                  </Button>
                </div>
              </div>
            )}
            
            <div className="prose dark:prose-invert max-w-none">
              <h3>Istruzioni:</h3>
              <ol>
                <li>Inserisci l'indirizzo Gmail del calendario che desideri utilizzare</li>
                <li>Attiva l'interruttore "Attiva sincronizzazione" per iniziare a sincronizzare gli appuntamenti</li>
                <li>Clicca su "Salva impostazioni" per confermare le tue scelte</li>
              </ol>
              <div className="bg-primary/10 p-4 rounded-md">
                <p className="text-sm">
                  <strong>Nota:</strong> Gli appuntamenti verranno sincronizzati solo se l'opzione è attivata e l'indirizzo Gmail è corretto.
                </p>
              </div>
            </div>
          </div>
        </CardContent>
        <CardFooter className="flex justify-end">
          <Button 
            onClick={handleSaveSettings}
            disabled={saveSettingsMutation.isPending}
          >
            {saveSettingsMutation.isPending ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Salvataggio in corso...
              </>
            ) : (
              "Salva impostazioni"
            )}
          </Button>
        </CardFooter>
      </Card>
      
      {/* Manteniamo il Dialog per compatibilità, ma l'utente standard non dovrebbe vederlo */}
      <Dialog open={showAuthDialog} onOpenChange={setShowAuthDialog}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Autorizza Google Calendar</DialogTitle>
            <DialogDescription>
              Per sincronizzare gli appuntamenti, devi autorizzare l'accesso al tuo account Google Calendar
            </DialogDescription>
          </DialogHeader>
          {authUrl && (
            <div className="flex flex-col space-y-4">
              <div className="p-4 border rounded-md bg-secondary/50">
                <p className="text-sm text-muted-foreground mb-2">
                  Apri il seguente link e segui le istruzioni per autorizzare l'accesso a Google Calendar:
                </p>
                <a
                  href={authUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-primary hover:underline flex items-center gap-1"
                >
                  Apri pagina di autorizzazione Google
                  <ExternalLink className="h-4 w-4" />
                </a>
              </div>
              
              <div className="space-y-2">
                <Label htmlFor="auth-code">
                  Codice di autorizzazione
                </Label>
                <Input
                  id="auth-code"
                  value={authCode}
                  onChange={(e) => setAuthCode(e.target.value)}
                  placeholder="Incolla qui il codice fornito da Google"
                />
              </div>
            </div>
          )}
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setShowAuthDialog(false)}
            >
              Annulla
            </Button>
            <Button
              onClick={handleExchangeCode}
              disabled={!authCode || isExchangingCode || exchangeCodeMutation.isPending}
            >
              {(isExchangingCode || exchangeCodeMutation.isPending) ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Verifica in corso...
                </>
              ) : (
                "Verifica codice"
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
      
      <Dialog open={showCalendarSelector} onOpenChange={setShowCalendarSelector}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Seleziona un calendario</DialogTitle>
            <DialogDescription>
              Scegli il calendario Google da utilizzare per la sincronizzazione
            </DialogDescription>
          </DialogHeader>
          
          {isLoadingCalendars ? (
            <div className="flex justify-center items-center p-8">
              <Loader2 className="h-8 w-8 animate-spin text-primary" />
            </div>
          ) : availableCalendars && availableCalendars.length > 0 ? (
            <div className="space-y-4 max-h-[400px] overflow-y-auto">
              <div 
                className="p-3 border rounded-md cursor-pointer hover:bg-secondary/50 flex items-center gap-2"
                onClick={() => handleSelectCalendar("primary")}
              >
                <Calendar className="h-5 w-5 text-primary" />
                <div>
                  <p className="font-medium">Calendario principale</p>
                  <p className="text-sm text-muted-foreground">primary</p>
                </div>
              </div>
              
              {availableCalendars.map((calendar) => (
                <div 
                  key={calendar.id}
                  className="p-3 border rounded-md cursor-pointer hover:bg-secondary/50 flex items-center gap-2"
                  onClick={() => handleSelectCalendar(calendar.id)}
                >
                  <Calendar className="h-5 w-5 text-primary" />
                  <div>
                    <p className="font-medium">{calendar.summary}</p>
                    <p className="text-sm text-muted-foreground">{calendar.id}</p>
                    {calendar.description && (
                      <p className="text-xs text-muted-foreground">{calendar.description}</p>
                    )}
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="p-4 border rounded-md bg-amber-50 dark:bg-amber-950">
              <p>Nessun calendario trovato nel tuo account Google</p>
            </div>
          )}
          
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowCalendarSelector(false)}>
              Annulla
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}