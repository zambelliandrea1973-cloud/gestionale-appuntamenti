import React, { useState, useEffect } from 'react';
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";
import { useTranslation } from 'react-i18next';
import { 
  Card, 
  CardContent, 
  CardFooter, 
  CardHeader, 
  CardTitle,
  CardDescription
} from "@/components/ui/card";
import {
  Check,
  Calendar,
  ArrowRight,
  RefreshCw,
  HelpCircle,
  AlertCircle,
  XCircle,
  Shield
} from "lucide-react";
import { Switch } from "@/components/ui/switch";
import { Link } from "wouter";

// URL di callback - Ora viene gestito lato server in base al dominio reale dell'applicazione
// Non è più necessario specificarlo qui, perché viene determinato dinamicamente lato server

/**
 * Componente semplificato per la configurazione di Google Calendar.
 * Incluso nella versione PRO dell'applicazione.
 */
export default function GoogleCalendarSimpleSetup() {
  const { t } = useTranslation();
  const { toast } = useToast();
  const [isGoogleAuthorized, setIsGoogleAuthorized] = useState(false);
  const [isSyncEnabled, setIsSyncEnabled] = useState(false);
  const [isAuthenticating, setIsAuthenticating] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [showAdvancedHelp, setShowAdvancedHelp] = useState(false);

  // Al caricamento del componente, verifica se l'utente ha già autorizzato Google
  useEffect(() => {
    const checkAuthStatus = async () => {
      try {
        const response = await fetch('/api/google-auth/status');
        if (response.ok) {
          const data = await response.json();
          setIsGoogleAuthorized(!!data.authorized);
          
          // Se è già autorizzato, recupera anche le impostazioni di sincronizzazione
          if (data.authorized) {
            const settingsResponse = await fetch('/api/email-calendar-settings');
            if (settingsResponse.ok) {
              const settingsData = await settingsResponse.json();
              setIsSyncEnabled(settingsData.calendarEnabled || false);
            }
          }
        }
      } catch (error) {
        console.error('Errore nel controllo dello stato di autorizzazione:', error);
      }
    };

    checkAuthStatus();
  }, []);

  // Funzione per avviare l'autorizzazione Google
  const startGoogleAuth = async () => {
    setIsAuthenticating(true);
    
    try {
      const response = await fetch('/api/google-auth/start');
      if (response.ok) {
        const data = await response.json();
        if (data.authUrl) {
          // Apre l'URL di autorizzazione in una nuova finestra
          const authWindow = window.open(data.authUrl, 'googleAuthWindow', 'width=800,height=600');
          
          // Verifica periodicamente se l'autorizzazione è completata
          const checkInterval = setInterval(async () => {
            try {
              const statusResponse = await fetch('/api/google-auth/status');
              if (statusResponse.ok) {
                const statusData = await statusResponse.json();
                if (statusData.authorized) {
                  clearInterval(checkInterval);
                  setIsGoogleAuthorized(true);
                  setIsSyncEnabled(true); // Abilita automaticamente la sincronizzazione
                  
                  // Salva l'impostazione di sincronizzazione
                  await saveCalendarSettings(true);
                  
                  if (authWindow && !authWindow.closed) {
                    authWindow.close();
                  }
                  
                  toast({
                    title: t('google.authSuccess', 'Autorizzazione completata'),
                    description: t('google.calendarConnected', 'Il tuo Google Calendar è stato collegato con successo'),
                  });
                }
              }
            } catch (error) {
              console.error('Errore durante il controllo dell\'autorizzazione:', error);
            } finally {
              // In ogni caso, termina lo stato di autenticazione dopo 5 secondi
              // per evitare che l'interfaccia rimanga bloccata in stato di caricamento
              setTimeout(() => {
                setIsAuthenticating(false);
              }, 5000);
            }
          }, 2000); // Controlla ogni 2 secondi
          
          // Ferma il controllo dopo 2 minuti (per evitare loop infiniti)
          setTimeout(() => {
            clearInterval(checkInterval);
            setIsAuthenticating(false);
          }, 120000);
        }
      } else {
        throw new Error(t('google.startAuthError', 'Non è stato possibile avviare l\'autorizzazione Google'));
      }
    } catch (error) {
      console.error('Errore nell\'autorizzazione Google:', error);
      toast({
        title: t('common.error', 'Errore'),
        description: error instanceof Error ? error.message : 
          t('google.unknownError', 'Si è verificato un errore durante l\'autorizzazione Google'),
        variant: "destructive",
      });
      setIsAuthenticating(false);
    }
  };

  // Funzione per salvare le impostazioni di sincronizzazione del calendario
  const saveCalendarSettings = async (enabled: boolean) => {
    setIsSaving(true);
    
    try {
      const response = await fetch('/api/email-calendar-settings', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          calendarEnabled: enabled,
          calendarId: '', // Usa il calendario principale di Google
          // Lasciamo le impostazioni email invariate
          emailEnabled: undefined,
          emailAddress: undefined,
          emailPassword: undefined,
        }),
      });
      
      if (response.ok) {
        setIsSyncEnabled(enabled);
        toast({
          title: t('settings.saved', 'Impostazioni salvate'),
          description: enabled 
            ? t('google.syncEnabled', 'Sincronizzazione con Google Calendar abilitata')
            : t('google.syncDisabled', 'Sincronizzazione con Google Calendar disabilitata'),
        });
      } else {
        throw new Error(t('settings.saveError', 'Si è verificato un errore durante il salvataggio delle impostazioni'));
      }
    } catch (error) {
      console.error('Errore nel salvataggio delle impostazioni:', error);
      toast({
        title: t('common.error', 'Errore'),
        description: error instanceof Error ? error.message : 
          t('settings.unknownError', 'Si è verificato un errore durante il salvataggio'),
        variant: "destructive",
      });
    } finally {
      setIsSaving(false);
    }
  };

  // Funzione per revocare l'autorizzazione Google
  const revokeGoogleAuth = async () => {
    try {
      setIsSaving(true);
      
      // Prima disattiva la sincronizzazione
      await saveCalendarSettings(false);
      
      // Poi revoca l'autorizzazione
      const response = await fetch('/api/google-auth/revoke', {
        method: 'POST',
      });
      
      if (response.ok) {
        setIsGoogleAuthorized(false);
        setIsSyncEnabled(false);
        toast({
          title: t('google.authRevoked', 'Autorizzazione revocata'),
          description: t('google.calendarDisconnected', 'Google Calendar è stato disconnesso'),
        });
      } else {
        throw new Error(t('google.revokeError', 'Si è verificato un errore durante la revoca dell\'autorizzazione'));
      }
    } catch (error) {
      console.error('Errore nella revoca dell\'autorizzazione:', error);
      toast({
        title: t('common.error', 'Errore'),
        description: error instanceof Error ? error.message : 
          t('google.unknownError', 'Si è verificato un errore durante la disconnessione'),
        variant: "destructive",
      });
    } finally {
      setIsSaving(false);
    }
  };

  // Gestisce il toggle della sincronizzazione
  const handleSyncToggle = (enabled: boolean) => {
    if (isGoogleAuthorized) {
      saveCalendarSettings(enabled);
    } else if (enabled) {
      // Se non è autorizzato e si tenta di abilitare, avvia l'autorizzazione
      startGoogleAuth();
    }
  };

  return (
    <div className="space-y-6">
      <Card className="border-primary/20">
        <CardHeader className="bg-gradient-to-r from-primary/10 to-primary/5 border-b">
          <div className="flex items-start justify-between">
            <div>
              <CardTitle className="flex items-center text-xl">
                <Calendar className="h-5 w-5 mr-2 text-primary" />
                {t('google.calendarIntegration', 'Integrazione Google Calendar')}
              </CardTitle>
              <CardDescription className="mt-1.5">
                {t('google.calendarDesc', 'Sincronizza automaticamente i tuoi appuntamenti con Google Calendar')}
              </CardDescription>
            </div>
            <div className="px-2 py-1 bg-primary-foreground rounded-full text-xs font-medium text-primary">
              PRO
            </div>
          </div>
        </CardHeader>
        
        <CardContent className="pt-6">
          {/* Nota importante sul dominio */}
          <div className="mb-6 p-4 border rounded-md bg-amber-50 dark:bg-amber-950">
            <h4 className="font-medium flex items-center text-amber-800 dark:text-amber-300 mb-2">
              <AlertCircle className="h-4 w-4 mr-2" />
              Importante: configurazione Google Cloud
            </h4>
            <p className="text-sm text-amber-700 dark:text-amber-400 mb-2">
              Per utilizzare l'integrazione con Google Calendar, devi configurare correttamente il progetto Google Cloud.
              Assicurati che l'URL di reindirizzamento nella console Google Cloud sia esattamente il seguente:
            </p>
            <div className="relative">
              <div className="p-3 bg-white dark:bg-amber-900 rounded border border-amber-200 dark:border-amber-700 font-mono text-xs break-all mb-1">
                https://workspace.zambelliandrea1.repl.co/api/google-auth/callback
              </div>
              <button 
                onClick={() => {
                  navigator.clipboard.writeText("https://workspace.zambelliandrea1.repl.co/api/google-auth/callback");
                  toast({
                    title: "URL copiato",
                    description: "L'URL di callback è stato copiato negli appunti"
                  });
                }}
                className="absolute top-2 right-2 bg-amber-100 dark:bg-amber-800 p-1 rounded hover:bg-amber-200 dark:hover:bg-amber-700"
              >
                <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-amber-700 dark:text-amber-300">
                  <rect width="14" height="14" x="8" y="8" rx="2" ry="2" />
                  <path d="M4 16c-1.1 0-2-.9-2-2V4c0-1.1.9-2 2-2h10c1.1 0 2 .9 2 2" />
                </svg>
              </button>
            </div>
            <p className="text-xs text-amber-600 dark:text-amber-500 mt-2">
              Se riscontri errori 403 (accesso negato), copia questo URL esatto e assicurati che sia configurato correttamente nella console Google Cloud → Credentials → OAuth 2.0 Client IDs → Authorized redirect URIs.
            </p>
            <p className="text-xs font-semibold text-amber-800 dark:text-amber-300 mt-2">
              Verifica attentamente che il dominio sia esattamente "workspace.zambelliandrea1.repl.co" e non ".replit.app" o altro.
            </p>
          </div>
          
          {isGoogleAuthorized ? (
            <div className="space-y-6">
              <div className="flex items-center justify-between p-4 rounded-lg border bg-secondary/10">
                <div className="flex items-center">
                  <Check className="h-5 w-5 mr-2 text-green-500" />
                  <div>
                    <h4 className="font-medium text-base">
                      {t('google.accountConnected', 'Account Google connesso')}
                    </h4>
                    <p className="text-sm text-muted-foreground">
                      {t('google.connectionActive', 'L\'integrazione con Google Calendar è attiva')}
                    </p>
                  </div>
                </div>
                <Button 
                  variant="outline" 
                  size="sm" 
                  onClick={revokeGoogleAuth}
                  disabled={isSaving}
                  className="border-red-200 text-red-500 hover:bg-red-50 hover:text-red-600"
                >
                  {isSaving ? <RefreshCw className="h-4 w-4 animate-spin" /> : <XCircle className="h-4 w-4 mr-2" />}
                  {t('google.disconnect', 'Disconnetti')}
                </Button>
              </div>
              
              <div className="flex items-center justify-between p-4 rounded-lg border">
                <div>
                  <h4 className="font-medium text-base">
                    {t('google.enableSync', 'Abilita sincronizzazione')}
                  </h4>
                  <p className="text-sm text-muted-foreground">
                    {t('google.syncDesc', 'Gli appuntamenti verranno aggiunti automaticamente al tuo Google Calendar')}
                  </p>
                </div>
                <Switch
                  checked={isSyncEnabled}
                  onCheckedChange={handleSyncToggle}
                  disabled={isSaving}
                />
              </div>
              
              {isSyncEnabled && (
                <div className="bg-green-50 p-4 rounded-lg border border-green-200">
                  <h4 className="font-medium text-base flex items-center text-green-700">
                    <Check className="h-5 w-5 mr-2 text-green-600" />
                    {t('google.syncActive', 'Sincronizzazione attiva')}
                  </h4>
                  <p className="text-sm text-green-700 mt-1 pl-7">
                    {t('google.syncExplanation', 'Quando crei o modifichi un appuntamento, questo verrà automaticamente aggiornato anche nel tuo Google Calendar.')}
                  </p>
                </div>
              )}
            </div>
          ) : (
            <div className="space-y-6">
              <div className="p-5 rounded-lg border bg-muted/30 text-center">
                <Calendar className="h-12 w-12 mx-auto text-primary mb-3" />
                <h3 className="text-lg font-medium mb-2">
                  {t('google.connectCalendar', 'Connetti il tuo Google Calendar')}
                </h3>
                <p className="text-sm text-muted-foreground mb-4 max-w-md mx-auto">
                  {t('google.connectCalendarDesc', 'Collega il tuo account Google per sincronizzare automaticamente gli appuntamenti tra la tua agenda e Google Calendar.')}
                </p>
                <Button 
                  onClick={startGoogleAuth} 
                  className="flex items-center"
                  disabled={isAuthenticating}
                >
                  {isAuthenticating ? (
                    <RefreshCw className="h-4 w-4 mr-2 animate-spin" />
                  ) : (
                    <Calendar className="h-4 w-4 mr-2" />
                  )}
                  {isAuthenticating 
                    ? t('google.connecting', 'Connessione in corso...') 
                    : t('google.connectWithGoogle', 'Connetti con Google')}
                  {!isAuthenticating && <ArrowRight className="h-4 w-4 ml-2" />}
                </Button>
              </div>
              
              <div className="flex items-start space-x-3 p-4 rounded-lg border bg-blue-50">
                <Shield className="h-5 w-5 text-blue-500 mt-0.5 flex-shrink-0" />
                <div className="text-sm text-blue-700">
                  <p className="mb-1 font-medium">{t('google.privacyNote', 'Nota sulla privacy')}</p>
                  <p>
                    {t('google.privacyExplanation', 'La connessione avviene tramite Google OAuth, uno standard sicuro che non ci permette di accedere alla tua password. Potrai revocare l\'accesso in qualsiasi momento.')}
                  </p>
                </div>
              </div>
            </div>
          )}
          
          <div className="mt-6">
            <button 
              type="button"
              onClick={() => setShowAdvancedHelp(!showAdvancedHelp)}
              className="flex items-center text-sm text-muted-foreground hover:text-foreground"
            >
              <HelpCircle className="h-4 w-4 mr-1.5" />
              {showAdvancedHelp 
                ? t('google.hideAdvancedHelp', 'Nascondi opzioni avanzate') 
                : t('google.showAdvancedHelp', 'Hai bisogno di aiuto con la configurazione?')}
            </button>
            
            {showAdvancedHelp && (
              <div className="mt-3 text-sm space-y-4">
                <div className="p-4 border rounded-md bg-blue-50 dark:bg-blue-950 text-blue-700 dark:text-blue-300">
                  <h5 className="font-medium mb-2">Risoluzione Errore 403 (access_denied)</h5>
                  <p className="mb-2">Se continui a ricevere l'errore 403, prova questa procedura:</p>
                  <ol className="list-decimal list-inside space-y-1 ml-2">
                    <li>Vai alla <a href="https://console.cloud.google.com/apis/credentials" target="_blank" rel="noopener" className="underline">Console Google Cloud</a></li>
                    <li>Seleziona il tuo progetto</li>
                    <li><strong>Elimina</strong> le vecchie credenziali OAuth 2.0</li>
                    <li>Crea un nuovo Client ID OAuth 2.0 completamente nuovo</li>
                    <li>Aggiungi con attenzione l'URL di callback esatto: <span className="font-mono bg-blue-100 dark:bg-blue-900 px-1 py-0.5 rounded text-xs">https://workspace.zambelliandrea1.repl.co/api/google-auth/callback</span></li>
                    <li>Ritorna qui e riprova l'autorizzazione</li>
                  </ol>
                </div>
                
                <div className="pl-6 text-muted-foreground">
                  <p>{t('google.advancedHelpDesc', 'Se hai bisogno di assistenza con la configurazione avanzata:')}</p>
                  <ul className="list-disc list-inside space-y-1 ml-2">
                    <li>
                      <Link to="/google-setup" className="text-primary hover:underline flex items-center">
                        {t('google.setupGuide', 'Guida alla configurazione avanzata')}
                        <ArrowRight className="h-3 w-3 ml-1" />
                      </Link>
                    </li>
                    <li>
                      {t('google.contactSupport', 'Contatta l\'assistenza se riscontri problemi persistenti')}
                    </li>
                  </ul>
                </div>
              </div>
            )}
          </div>
        </CardContent>
        
        <CardFooter className="bg-muted/20 border-t flex justify-between px-6 py-3">
          <div className="text-xs text-muted-foreground flex items-center">
            <Calendar className="h-3.5 w-3.5 mr-1.5" />
            {isGoogleAuthorized 
              ? t('google.lastSyncStatus', 'Stato: Connesso a Google Calendar') 
              : t('google.notConnected', 'Stato: Non connesso')}
          </div>
          {isGoogleAuthorized && (
            <Link to="/settings" className="text-xs text-primary hover:underline flex items-center">
              {t('google.advancedSettings', 'Impostazioni avanzate')}
              <ArrowRight className="h-3 w-3 ml-1" />
            </Link>
          )}
        </CardFooter>
      </Card>
    </div>
  );
}