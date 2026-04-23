import React, { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Alert,
  AlertDescription,
  AlertTitle,
} from "@/components/ui/alert";
import { Separator } from "@/components/ui/separator";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useToast } from "@/hooks/use-toast";
import { AlertCircle, CheckCircle, Loader2, RefreshCw, AlertTriangle, HelpCircle, ChevronRight, ExternalLink } from 'lucide-react';
import { Link } from 'wouter';

export default function GoogleTroubleshootingPage() {
  const { t } = useTranslation();
  const { toast } = useToast();
  const [isLoading, setIsLoading] = useState(false);
  const [activeTab, setActiveTab] = useState("diagnosi");
  const [testResult, setTestResult] = useState<any>(null);
  const [emailTestResult, setEmailTestResult] = useState<any>(null);
  const [googleStatus, setGoogleStatus] = useState<{
    authorized: boolean;
    message?: string;
  }>({ authorized: false });

  // Controlla lo stato dell'autorizzazione Google
  const checkGoogleAuth = async () => {
    try {
      const response = await fetch('/api/google-auth/status');
      if (response.ok) {
        const data = await response.json();
        setGoogleStatus({
          authorized: data.authorized,
          message: data.authorized 
            ? t('googleCalendar.troubleshooting.statusAccountAuthorized')
            : t('googleCalendar.troubleshooting.statusAccountNotAuthorized')
        });
      }
    } catch (error) {
      console.error("Errore nel controllo dell'autorizzazione Google:", error);
    }
  };

  // Carica lo stato iniziale
  useEffect(() => {
    checkGoogleAuth();
  }, []);

  // Esegue il test di configurazione Google
  const runGoogleTest = async () => {
    setIsLoading(true);
    try {
      const response = await fetch('/api/google-auth/test-configuration');
      const data = await response.json();
      setTestResult(data);
    } catch (error: any) {
      console.error("Errore nel test di configurazione:", error);
      setTestResult({
        success: false,
        message: t('googleCalendar.troubleshooting.connError', { error: error?.message || t('googleCalendar.troubleshooting.unknownError') })
      });
    } finally {
      setIsLoading(false);
    }
  };

  // Esegue il test delle email
  const runEmailTest = async () => {
    setIsLoading(true);
    try {
      const response = await fetch('/api/email-calendar-settings');
      if (response.ok) {
        const data = await response.json();
        setEmailTestResult({
          success: true,
          emailEnabled: data.emailEnabled,
          emailAddress: data.emailAddress || t('googleCalendar.troubleshooting.notConfigured'),
          calendarEnabled: data.calendarEnabled,
          calendarId: data.calendarId || t('googleCalendar.troubleshooting.notConfigured'),
          googleAuthStatus: data.googleAuthStatus
        });
      } else {
        setEmailTestResult({
          success: false,
          message: t('googleCalendar.troubleshooting.emailFetchError')
        });
      }
    } catch (error: any) {
      console.error("Errore nel test email:", error);
      setEmailTestResult({
        success: false,
        message: `Errore di connessione: ${error?.message || 'Errore sconosciuto'}`
      });
    } finally {
      setIsLoading(false);
    }
  };

  // Riavvia l'autorizzazione Google
  const restartGoogleAuth = async () => {
    try {
      const response = await fetch('/api/google-auth/start');
      if (response.ok) {
        const data = await response.json();
        if (data.authUrl) {
          // Aggiungiamo un gestore di eventi per il messaggio di successo
          const messageListener = (event: MessageEvent) => {
            if (event.data === 'google-auth-success') {
              window.removeEventListener('message', messageListener);
              checkGoogleAuth();
              toast({
                title: t('googleCalendar.troubleshooting.toastAuthDone'),
                description: t('googleCalendar.troubleshooting.toastAuthDoneDesc'),
              });
            }
          };
          
          window.addEventListener('message', messageListener);
          
          // Apre l'URL di autorizzazione in una nuova finestra
          const authWindow = window.open(data.authUrl, 'googleAuthWindow', 'width=800,height=600');
          
          // Verifica periodicamente se l'autorizzazione è completata (come fallback)
          const checkInterval = setInterval(async () => {
            try {
              // Se la finestra è stata chiusa, controlliamo lo stato
              if (authWindow && authWindow.closed) {
                await checkGoogleAuth();
                clearInterval(checkInterval);
              }
            } catch (error: any) {
              console.error('Errore durante il controllo dell\'autorizzazione:', error);
            }
          }, 3000);
          
          // Ferma il controllo dopo 2 minuti
          setTimeout(() => {
            clearInterval(checkInterval);
            window.removeEventListener('message', messageListener);
          }, 120000);
        }
      } else {
        toast({
          title: t('common.error'),
          description: t('googleCalendar.troubleshooting.toastCannotStart'),
          variant: "destructive",
        });
      }
    } catch (error: any) {
      console.error('Errore nell\'autorizzazione Google:', error);
      toast({
        title: t('common.error'),
        description: t('googleCalendar.troubleshooting.toastAuthErrorDesc'),
        variant: "destructive",
      });
    }
  };

  return (
    <div className="container py-8 px-4 max-w-4xl mx-auto">
      <div className="mb-8">
        <div className="mb-2 flex items-center gap-2">
          <Link href="/settings" className="text-sm text-muted-foreground hover:underline">{t('googleCalendar.troubleshooting.breadcrumbSettings')}</Link>
          <ChevronRight className="h-4 w-4 text-muted-foreground" />
          <span className="text-sm font-medium">{t('googleCalendar.troubleshooting.breadcrumbCurrent')}</span>
        </div>
        <h1 className="text-3xl font-bold mb-2">{t('googleCalendar.troubleshooting.title')}</h1>
        <p className="text-muted-foreground max-w-3xl">
          {t('googleCalendar.troubleshooting.subtitle')}
        </p>
      </div>
      
      <Tabs defaultValue="diagnosi" value={activeTab} onValueChange={setActiveTab}>
        <TabsList className="grid grid-cols-3 w-full mb-8">
          <TabsTrigger value="diagnosi">
            <AlertCircle className="h-4 w-4 mr-2" />
            {t('googleCalendar.troubleshooting.tabDiagnosis')}
          </TabsTrigger>
          <TabsTrigger value="soluzioni">
            <CheckCircle className="h-4 w-4 mr-2" />
            {t('googleCalendar.troubleshooting.tabSolutions')}
          </TabsTrigger>
          <TabsTrigger value="configurazione">
            <HelpCircle className="h-4 w-4 mr-2" />
            {t('googleCalendar.troubleshooting.tabConfig')}
          </TabsTrigger>
        </TabsList>
        
        <TabsContent value="diagnosi">
          <div className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center">
                  <AlertCircle className="h-5 w-5 mr-2 text-amber-500" />
                  {t('googleCalendar.troubleshooting.currentStatus')}
                </CardTitle>
                <CardDescription>
                  {t('googleCalendar.troubleshooting.statusDesc')}
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  <div className="p-4 rounded-lg border">
                    <div className="flex justify-between items-start mb-4">
                      <div>
                        <h3 className="text-lg font-medium mb-1">{t('googleCalendar.troubleshooting.googleAuthStatus')}</h3>
                        <p className="text-muted-foreground text-sm">
                          {t('googleCalendar.troubleshooting.authNeeded')}
                        </p>
                      </div>
                      <div className={`px-3 py-1 rounded-full text-sm font-medium ${googleStatus.authorized ? 'bg-green-100 text-green-800' : 'bg-amber-100 text-amber-800'}`}>
                        {googleStatus.authorized ? t('googleCalendar.troubleshooting.authorized') : t('googleCalendar.troubleshooting.notAuthorized')}
                      </div>
                    </div>
                    
                    <div className="border-t pt-4 mt-4">
                      <div className="flex justify-between">
                        <Button 
                          variant="outline" 
                          onClick={runGoogleTest}
                          disabled={isLoading}
                        >
                          {isLoading ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <RefreshCw className="h-4 w-4 mr-2" />}
                          {t('googleCalendar.troubleshooting.verifyGoogle')}
                        </Button>
                        
                        <Button
                          variant="outline"
                          onClick={runEmailTest}
                          disabled={isLoading}
                        >
                          {isLoading ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <RefreshCw className="h-4 w-4 mr-2" />}
                          {t('googleCalendar.troubleshooting.verifyEmail')}
                        </Button>
                      </div>
                    </div>
                  </div>
                  
                  {testResult && (
                    <div className={`p-4 rounded-lg border ${testResult.success ? 'bg-green-50 border-green-200' : 'bg-amber-50 border-amber-200'}`}>
                      <h3 className="text-lg font-medium mb-2">{t('googleCalendar.troubleshooting.googleResultTitle')}</h3>
                      
                      <div className="space-y-3">
                        <div className="flex items-center">
                          <div className="w-64 font-medium">{t('googleCalendar.troubleshooting.clientId')}</div>
                          <div className={testResult.clientIdPresente ? 'text-green-600' : 'text-red-600'}>
                            {testResult.clientIdPresente ? t('googleCalendar.troubleshooting.present') : t('googleCalendar.troubleshooting.missing')}
                          </div>
                        </div>
                        
                        <div className="flex items-center">
                          <div className="w-64 font-medium">{t('googleCalendar.troubleshooting.clientSecret')}</div>
                          <div className={testResult.clientSecretPresente ? 'text-green-600' : 'text-red-600'}>
                            {testResult.clientSecretPresente ? t('googleCalendar.troubleshooting.present') : t('googleCalendar.troubleshooting.missing')}
                          </div>
                        </div>
                        
                        <div className="flex items-start">
                          <div className="w-64 font-medium mt-1">{t('googleCalendar.troubleshooting.redirectUri')}</div>
                          <div>
                            <span className="text-muted-foreground break-all">{testResult.redirectUri}</span>
                            <p className="text-sm text-amber-600 mt-1">
                              {t('googleCalendar.troubleshooting.redirectUriHint')}
                            </p>
                          </div>
                        </div>
                        
                        <div className="flex items-start">
                          <div className="w-64 font-medium mt-1">{t('googleCalendar.troubleshooting.scopes')}</div>
                          <div>
                            {testResult.scopeValidi && testResult.scopeValidi.map((scope: string, index: number) => (
                              <div key={index} className="text-sm text-muted-foreground">{scope}</div>
                            ))}
                          </div>
                        </div>
                      </div>
                    </div>
                  )}
                  
                  {emailTestResult && (
                    <div className="p-4 rounded-lg border bg-blue-50 border-blue-200">
                      <h3 className="text-lg font-medium mb-2">{t('googleCalendar.troubleshooting.emailResultTitle')}</h3>
                      
                      <div className="space-y-3">
                        <div className="flex items-center">
                          <div className="w-64 font-medium">{t('googleCalendar.troubleshooting.emailEnabled')}</div>
                          <div>
                            {emailTestResult.emailEnabled ? (
                              <span className="text-green-600">{t('googleCalendar.troubleshooting.yes')}</span>
                            ) : (
                              <span className="text-amber-600">{t('googleCalendar.troubleshooting.no')}</span>
                            )}
                          </div>
                        </div>
                        
                        <div className="flex items-center">
                          <div className="w-64 font-medium">{t('googleCalendar.troubleshooting.emailAddress')}</div>
                          <div>
                            {emailTestResult.emailAddress}
                          </div>
                        </div>
                        
                        <div className="flex items-center">
                          <div className="w-64 font-medium">{t('googleCalendar.troubleshooting.calendarEnabled')}</div>
                          <div>
                            {emailTestResult.calendarEnabled ? (
                              <span className="text-green-600">{t('googleCalendar.troubleshooting.yes')}</span>
                            ) : (
                              <span className="text-amber-600">{t('googleCalendar.troubleshooting.no')}</span>
                            )}
                          </div>
                        </div>
                        
                        <div className="flex items-center">
                          <div className="w-64 font-medium">{t('googleCalendar.troubleshooting.calendarId')}</div>
                          <div>
                            {emailTestResult.calendarId}
                          </div>
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>
            
            <Alert variant={googleStatus.authorized ? "default" : "destructive"}>
              <AlertCircle className="h-4 w-4" />
              <AlertTitle>
                {googleStatus.authorized ? t('googleCalendar.troubleshooting.alertAuthOk') : t('googleCalendar.troubleshooting.alertAuthMissing')}
              </AlertTitle>
              <AlertDescription>
                {googleStatus.authorized 
                  ? t('googleCalendar.troubleshooting.alertAuthOkDesc')
                  : t('googleCalendar.troubleshooting.alertAuthMissingDesc')}
              </AlertDescription>
            </Alert>
          </div>
        </TabsContent>
        
        <TabsContent value="soluzioni">
          <div className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center">
                  <CheckCircle className="h-5 w-5 mr-2 text-green-500" />
                  {t('googleCalendar.troubleshooting.commonProblems')}
                </CardTitle>
                <CardDescription>
                  {t('googleCalendar.troubleshooting.commonProblemsDesc')}
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-6">
                  <div className="p-4 rounded-lg border bg-amber-50 border-amber-200">
                    <h3 className="text-lg font-medium mb-3 flex items-center">
                      <AlertTriangle className="h-5 w-5 mr-2 text-amber-600" />
                      {t('googleCalendar.troubleshooting.error400')}
                    </h3>
                    
                    <p className="mb-3">
                      {t('googleCalendar.troubleshooting.error400Desc')}
                    </p>
                    
                    <div className="bg-white p-3 rounded border mb-4">
                      <div className="text-sm font-medium mb-1">{t('googleCalendar.troubleshooting.appRedirectUri')}</div>
                      <div className="text-sm text-muted-foreground break-all">
                        https://wife-scheduler-zambelliandrea1.replit.app/api/google-auth/callback
                      </div>
                    </div>
                    
                    <p className="font-medium">{t('googleCalendar.troubleshooting.toFixThis')}</p>
                    <ol className="list-decimal pl-5 space-y-2 mt-2 mb-4">
                      {(t('googleCalendar.troubleshooting.fixSteps', { returnObjects: true }) as string[]).map((step, idx) => (
                        <li key={idx} dangerouslySetInnerHTML={{ __html: step }} />
                      ))}
                    </ol>
                    
                    <div className="flex justify-end">
                      <Button onClick={restartGoogleAuth}>
                        {t('googleCalendar.troubleshooting.retryAuth')}
                      </Button>
                    </div>
                  </div>
                  
                  <div className="p-4 rounded-lg border">
                    <h3 className="text-lg font-medium mb-3">{t('googleCalendar.troubleshooting.emailNotWorking')}</h3>
                    
                    <p className="mb-3">
                      {t('googleCalendar.troubleshooting.emailNotWorkingDesc')}
                    </p>
                    
                    <ul className="list-disc pl-5 space-y-2 mb-4">
                      {(t('googleCalendar.troubleshooting.emailChecks', { returnObjects: true }) as string[]).map((item, idx) => (
                        <li key={idx} dangerouslySetInnerHTML={{ __html: item }} />
                      ))}
                    </ul>
                    
                    <div className="flex justify-end">
                      <Link href="/email-settings">
                        <Button variant="outline">
                          {t('googleCalendar.troubleshooting.goToEmailSettings')}
                        </Button>
                      </Link>
                    </div>
                  </div>
                  
                  <div className="p-4 rounded-lg border bg-green-50 border-green-200">
                    <h3 className="text-lg font-medium mb-3 flex items-center">
                      <RefreshCw className="h-5 w-5 mr-2 text-green-600" />
                      {t('googleCalendar.troubleshooting.restartAuthorization')}
                    </h3>
                    
                    <p className="mb-4">
                      {t('googleCalendar.troubleshooting.restartAuthDesc')}
                    </p>
                    
                    <div className="flex justify-end">
                      <Button onClick={restartGoogleAuth} variant="default">
                        {t('googleCalendar.troubleshooting.restartAuthBtn')}
                      </Button>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>
        
        <TabsContent value="configurazione">
          <div className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center">
                  <HelpCircle className="h-5 w-5 mr-2 text-blue-500" />
                  {t('googleCalendar.troubleshooting.configGuide')}
                </CardTitle>
                <CardDescription>
                  {t('googleCalendar.troubleshooting.configGuideDesc')}
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-6">
                  <div className="p-4 rounded-lg border">
                    <h3 className="text-lg font-medium mb-3">{t('googleCalendar.troubleshooting.configProcedure')}</h3>
                    
                    <ol className="space-y-4 mb-4">
                      {[1, 2, 3, 4, 5, 6, 7, 8].map((n) => {
                        const isHighlight = n === 6;
                        return (
                          <li key={n} className={`p-3 ${isHighlight ? 'bg-amber-50 border-amber-200 border' : 'bg-muted'} rounded flex gap-3`}>
                            <div className={`flex-shrink-0 h-6 w-6 rounded-full ${isHighlight ? 'bg-amber-100 text-amber-600' : 'bg-blue-100 text-blue-600'} flex items-center justify-center font-medium`}>{n}</div>
                            <div>
                              <p className="font-medium">{t(`googleCalendar.troubleshooting.configStep${n}Title`)}</p>
                              {n === 6 ? (
                                <div className="text-sm mt-1">
                                  <p className="font-medium mb-1">{t('googleCalendar.troubleshooting.jsOrigins')}</p>
                                  <p className="font-mono text-muted-foreground mb-2">https://wife-scheduler-zambelliandrea1.replit.app</p>
                                  <p className="font-medium mb-1">{t('googleCalendar.troubleshooting.redirectUris')}</p>
                                  <p className="font-mono text-muted-foreground">https://wife-scheduler-zambelliandrea1.replit.app/api/google-auth/callback</p>
                                </div>
                              ) : (
                                <p className="text-sm text-muted-foreground mt-1" dangerouslySetInnerHTML={{ __html: t(`googleCalendar.troubleshooting.configStep${n}Desc`) }} />
                              )}
                            </div>
                          </li>
                        );
                      })}
                    </ol>
                    
                    <div className="flex justify-between mt-6">
                      <a 
                        href="https://console.cloud.google.com/apis/credentials" 
                        target="_blank" 
                        rel="noopener noreferrer" 
                        className="inline-flex items-center text-blue-600 hover:underline"
                      >
                        {t('googleCalendar.troubleshooting.gotoCloudConsole')}
                        <ExternalLink className="h-3 w-3 ml-1" />
                      </a>
                      
                      <Button onClick={restartGoogleAuth}>
                        {t('googleCalendar.troubleshooting.restartAuth')}
                      </Button>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
}