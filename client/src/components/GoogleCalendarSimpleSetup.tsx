import React, { useState, useEffect } from 'react';
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";
import { useTranslation, Trans } from 'react-i18next';
import { useTimezone } from '@/hooks/use-timezone';
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
  const timeZone = useTimezone();
  const [isGoogleAuthorized, setIsGoogleAuthorized] = useState(false);
  const [isSyncEnabled, setIsSyncEnabled] = useState(false);
  const [isAuthenticating, setIsAuthenticating] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [showAdvancedHelp, setShowAdvancedHelp] = useState(false);
  const [isSyncing, setIsSyncing] = useState(false);
  const [isLoadingStatus, setIsLoadingStatus] = useState(true);
  const [needsReauth, setNeedsReauth] = useState(false);

  // Carica stato reale + auto-restore silenzioso se la sync è stata interrotta (non dall'utente)
  useEffect(() => {
    const init = async () => {
      try {
        const r = await fetch('/api/google-auth/status', { credentials: 'include' });
        if (!r.ok) return;
        const data = await r.json();
        if (data.authorized) {
          setIsGoogleAuthorized(true);
          setIsSyncEnabled(!!data.calendarEnabled);
        } else if (!data.disabledByUser) {
          // Disconnesso per bug/aggiornamento → prova ripristino silenzioso
          const restore = await fetch('/api/google-auth/auto-restore', { method: 'POST', credentials: 'include' });
          if (restore.ok) {
            const rd = await restore.json();
            if (rd.success && rd.method === 'silent') {
              // Token ancora nel DB → riabilitato senza alcuna azione utente
              setIsGoogleAuthorized(true);
              setIsSyncEnabled(true);
            } else if (rd.reason === 'needs_oauth') {
              // Token sparito → mostra banner "Riconnetti" senza redirect automatico.
              // L'utente deve cliccare esplicitamente (evita redirect indesiderati).
              setNeedsReauth(true);
            }
          }
        }
      } catch { /* silent */ }
      finally { setIsLoadingStatus(false); }
    };
    init();
  }, []);

  const startGoogleAuth = async () => {
    setIsAuthenticating(true);
    
    try {
      // Utilizziamo l'URL generato manualmente per evitare errori redirect_uri_mismatch
      const response = await fetch('/api/google-auth/start');
      if (response.ok) {
        const data = await response.json();
        if (data.authUrl) {
          console.log("Auth URL:", data.authUrl);
          console.log("Auth debug info:", data.debug || "Not available");
          
          // Apre l'URL di autorizzazione in una nuova finestra
          const authWindow = window.open(data.authUrl, 'googleAuthWindow', 'width=800,height=600');
          
          if (!authWindow) {
            throw new Error(t('google.popupBlocked', 'The popup was blocked. Please disable the popup blocker for this site.'));
          }
          
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
                    title: t('google.authSuccess', 'Authorization complete'),
                    description: t('google.calendarConnected', 'Your Google Calendar has been connected successfully'),
                  });
                }
              }
            } catch (error) {
              console.error('Error checking authorization:', error);
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
        throw new Error(t('google.startAuthError', 'Unable to start Google authorization'));
      }
    } catch (error) {
      console.error('Error in Google authorization:', error);
      toast({
        title: t('common.error'),
        description: error instanceof Error ? error.message : 
          t('google.unknownError', 'An error occurred during Google authorization'),
        variant: "destructive",
      });
      
      // Aggiungi un suggerimento per l'errore 400 redirect_uri_mismatch
      toast({
        title: t('google.simpleSetup.error400Tip.title'),
        description: t('google.simpleSetup.error400Tip.description'),
        variant: "default",
        duration: 10000
      });
      
      setIsAuthenticating(false);
    }
  };

  // Quando sync viene abilitato, aggiorna lo stato
  const saveCalendarSettings = async (enabled: boolean) => {
    setIsSyncEnabled(enabled);
    if (enabled) {
      toast({
        title: t('google.syncEnabled', 'Sync enabled'),
        description: t('google.syncExplanation', 'New appointments will be automatically added to Google Calendar'),
      });
    } else {
      toast({
        title: t('google.syncDisabled', 'Sync disabled'),
      });
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
          title: t('google.authRevoked', 'Authorization revoked'),
          description: t('google.calendarDisconnected', 'Google Calendar has been disconnected'),
        });
      } else {
        throw new Error(t('google.revokeError', 'An error occurred while revoking authorization'));
      }
    } catch (error) {
      console.error('Error revoking authorization:', error);
      toast({
        title: t('common.error'),
        description: error instanceof Error ? error.message : 
          t('google.unknownError', 'An error occurred during disconnection'),
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

  // Funzione per triggerare la sincronizzazione bidirezionale
  const triggerSync = async () => {
    setIsSyncing(true);
    try {
      const response = await fetch('/api/google-calendar/sync-now', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Cache-Control': 'no-cache, no-store, must-revalidate',
        },
        body: JSON.stringify({ timeZone }),
      });
      
      if (response.ok) {
        const result = await response.json();
        toast({
          title: t('google.syncComplete', 'Sync complete'),
          description: result.message || t('google.syncSummary', 'Imported {{imported}} events, exported {{exported}} appointments', { imported: result.details?.imported || 0, exported: result.details?.exported || 0 }),
        });
      } else {
        throw new Error(t('google.syncError', 'Sync error'));
      }
    } catch (error) {
      console.error('Sync error:', error);
      toast({
        title: t('common.error'),
        description: error instanceof Error ? error.message : t('google.syncFailedError', 'Sync failed'),
        variant: "destructive",
      });
    } finally {
      setIsSyncing(false);
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
                {t('google.calendarIntegration', 'Google Calendar Integration')}
              </CardTitle>
              <CardDescription className="mt-1.5">
                {t('google.calendarDesc', 'Automatically sync your appointments with Google Calendar')}
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
              {t('google.simpleSetup.cloudConfig.title')}
            </h4>
            <p className="text-sm text-amber-700 dark:text-amber-400 mb-2">
              {t('google.simpleSetup.cloudConfig.intro')}
            </p>
            <div className="relative">
              <div className="p-3 bg-white dark:bg-amber-900 rounded border border-amber-200 dark:border-amber-700 font-mono text-xs break-all mb-1">
                https://wife-scheduler-zambelliandrea1.replit.app/api/google-auth/callback
              </div>
              <button 
                onClick={() => {
                  navigator.clipboard.writeText("https://wife-scheduler-zambelliandrea1.replit.app/api/google-auth/callback");
                  toast({
                    title: t('google.simpleSetup.cloudConfig.urlCopiedTitle'),
                    description: t('google.simpleSetup.cloudConfig.urlCopiedDesc')
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
              {t('google.simpleSetup.cloudConfig.error403Help')}
            </p>
            <p className="text-xs font-semibold text-amber-800 dark:text-amber-300 mt-2">
              {t('google.simpleSetup.cloudConfig.domainCheck')}
            </p>
            <div className="mt-3 border-t border-amber-200 dark:border-amber-700 pt-3">
              <a 
                href="/api/google-auth/compare-auth-urls" 
                target="_blank" 
                className="text-xs inline-flex items-center text-blue-600 hover:text-blue-800 font-medium"
              >
                <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="mr-1">
                  <path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6"/>
                  <polyline points="15 3 21 3 21 9"/>
                  <line x1="10" y1="14" x2="21" y2="3"/>
                </svg>
                {t('google.simpleSetup.cloudConfig.debugTool')}
              </a>
            </div>
          </div>
          
          {isLoadingStatus ? (
            <div className="flex items-center justify-center py-8 text-muted-foreground">
              <RefreshCw className="h-5 w-5 animate-spin mr-2" />
              <span className="text-sm">{t('common.loading', 'Loading...')}</span>
            </div>
          ) : isGoogleAuthorized ? (
            <div className="space-y-6">
              <div className="flex items-center justify-between p-4 rounded-lg border bg-secondary/10">
                <div className="flex items-center">
                  <Check className="h-5 w-5 mr-2 text-green-500" />
                  <div>
                    <h4 className="font-medium text-base">
                      {t('google.accountConnected', 'Google account connected')}
                    </h4>
                    <p className="text-sm text-muted-foreground">
                      {t('google.connectionActive', 'Google Calendar integration is active')}
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
                  {t('google.disconnect', 'Disconnect')}
                </Button>
              </div>
              
              <div className="flex items-center justify-between p-4 rounded-lg border">
                <div>
                  <h4 className="font-medium text-base">
                    {t('google.enableSync', 'Enable sync')}
                  </h4>
                  <p className="text-sm text-muted-foreground">
                    {t('google.syncDesc', 'Appointments will be automatically added to your Google Calendar')}
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
                    {t('google.syncActive', 'Sync active')}
                  </h4>
                  <p className="text-sm text-green-700 mt-1 pl-7">
                    {t('google.syncExplanation', 'When you create or edit an appointment, it will be automatically updated in your Google Calendar.')}
                  </p>
                </div>
              )}
            </div>
          ) : (
            <div className="space-y-6">
              <div className="p-5 rounded-lg border bg-muted/30 text-center">
                <Calendar className="h-12 w-12 mx-auto text-primary mb-3" />
                <h3 className="text-lg font-medium mb-2">
                  {t('google.connectCalendar', 'Connect your Google Calendar')}
                </h3>
                <p className="text-sm text-muted-foreground mb-4 max-w-md mx-auto">
                  {t('google.connectCalendarDesc', 'Link your Google account to automatically sync appointments between your calendar and Google Calendar.')}
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
                    ? t('google.connecting', 'Connecting...') 
                    : t('google.connectWithGoogle', 'Connect with Google')}
                  {!isAuthenticating && <ArrowRight className="h-4 w-4 ml-2" />}
                </Button>
              </div>
              
              <div className="flex items-start space-x-3 p-4 rounded-lg border bg-blue-50">
                <Shield className="h-5 w-5 text-blue-500 mt-0.5 flex-shrink-0" />
                <div className="text-sm text-blue-700">
                  <p className="mb-1 font-medium">{t('google.privacyNote', 'Privacy note')}</p>
                  <p>
                    {t('google.privacyExplanation', 'The connection uses Google OAuth, a secure standard that does not allow us to access your password. You can revoke access at any time.')}
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
                ? t('google.hideAdvancedHelp', 'Hide advanced options') 
                : t('google.showAdvancedHelp', 'Need help with configuration?')}
            </button>
            
            {showAdvancedHelp && (
              <div className="mt-3 text-sm space-y-4">
                <div className="p-4 border rounded-md bg-blue-50 dark:bg-blue-950 text-blue-700 dark:text-blue-300">
                  <h5 className="font-medium mb-2">{t('google.simpleSetup.error403.title')}</h5>
                  <p className="mb-2">{t('google.simpleSetup.error403.intro')}</p>
                  <ol className="list-decimal list-inside space-y-1 ml-2">
                    <li>
                      <Trans
                        i18nKey="google.simpleSetup.error403.step1"
                        components={{
                          1: <a href="https://console.cloud.google.com/apis/credentials" target="_blank" rel="noopener" className="underline" />
                        }}
                      />
                    </li>
                    <li>{t('google.simpleSetup.error403.step2')}</li>
                    <li>
                      <Trans
                        i18nKey="google.simpleSetup.error403.step3"
                        components={{ 1: <strong /> }}
                      />
                    </li>
                    <li>{t('google.simpleSetup.error403.step4')}</li>
                    <li>
                      <Trans
                        i18nKey="google.simpleSetup.error403.step5"
                        components={{
                          1: <span className="font-mono bg-blue-100 dark:bg-blue-900 px-1 py-0.5 rounded text-xs" />
                        }}
                        values={{ url: 'https://wife-scheduler-zambelliandrea1.replit.app/api/google-auth/callback' }}
                      />
                    </li>
                    <li>{t('google.simpleSetup.error403.step6')}</li>
                  </ol>
                </div>
                
                <div className="pl-6 text-muted-foreground">
                  <p>{t('google.advancedHelpDesc', 'If you need help with advanced configuration:')}</p>
                  <ul className="list-disc list-inside space-y-1 ml-2">
                    <li>
                      <Link to="/google-troubleshooting" className="text-primary hover:underline flex items-center">
                        {t('google.setupGuide', 'Advanced configuration guide')}
                        <ArrowRight className="h-3 w-3 ml-1" />
                      </Link>
                    </li>
                    <li>
                      {t('google.contactSupport', 'Contact support if you experience persistent issues')}
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
              ? t('google.lastSyncStatus', 'Status: Connected to Google Calendar') 
              : t('google.notConnected', 'Status: Not connected')}
          </div>
          <div className="flex items-center gap-4">
            {isGoogleAuthorized && (
              <Link to="/settings?tab=integrations" className="text-xs text-primary hover:underline flex items-center">
                {t('google.advancedSettings', 'Advanced settings')}
                <ArrowRight className="h-3 w-3 ml-1" />
              </Link>
            )}
            <Link to="/" className="text-xs text-primary hover:underline flex items-center">
              {t('common.backToHome', 'Back to Home')}
              <ArrowRight className="h-3 w-3 ml-1" />
            </Link>
          </div>
        </CardFooter>
      </Card>
    </div>
  );
}