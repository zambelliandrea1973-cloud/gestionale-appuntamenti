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
            ? "Account autorizzato" 
            : "Account non autorizzato"
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
        message: `Errore di connessione: ${error?.message || 'Errore sconosciuto'}`
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
          emailAddress: data.emailAddress || "Non configurato",
          calendarEnabled: data.calendarEnabled,
          calendarId: data.calendarId || "Non configurato",
          googleAuthStatus: data.googleAuthStatus
        });
      } else {
        setEmailTestResult({
          success: false,
          message: "Errore nel recupero delle impostazioni email"
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
                title: "Autorizzazione completata",
                description: "L'account Google è stato autorizzato con successo",
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
          title: "Errore",
          description: "Non è stato possibile avviare l'autorizzazione Google",
          variant: "destructive",
        });
      }
    } catch (error: any) {
      console.error('Errore nell\'autorizzazione Google:', error);
      toast({
        title: "Errore",
        description: "Si è verificato un errore durante l'autorizzazione Google",
        variant: "destructive",
      });
    }
  };

  return (
    <div className="container py-8 px-4 max-w-4xl mx-auto">
      <div className="mb-8">
        <div className="mb-2 flex items-center gap-2">
          <Link href="/settings" className="text-sm text-muted-foreground hover:underline">Impostazioni</Link>
          <ChevronRight className="h-4 w-4 text-muted-foreground" />
          <span className="text-sm font-medium">Risoluzione problemi Google</span>
        </div>
        <h1 className="text-3xl font-bold mb-2">Risolvere problemi di integrazione Google</h1>
        <p className="text-muted-foreground max-w-3xl">
          Questa pagina ti aiuta a diagnosticare e risolvere problemi con l'integrazione Google Calendar e le email.
        </p>
      </div>
      
      <Tabs defaultValue="diagnosi" value={activeTab} onValueChange={setActiveTab}>
        <TabsList className="grid grid-cols-3 w-full mb-8">
          <TabsTrigger value="diagnosi">
            <AlertCircle className="h-4 w-4 mr-2" />
            Diagnosi
          </TabsTrigger>
          <TabsTrigger value="soluzioni">
            <CheckCircle className="h-4 w-4 mr-2" />
            Soluzioni
          </TabsTrigger>
          <TabsTrigger value="configurazione">
            <HelpCircle className="h-4 w-4 mr-2" />
            Guida configurazione
          </TabsTrigger>
        </TabsList>
        
        <TabsContent value="diagnosi">
          <div className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center">
                  <AlertCircle className="h-5 w-5 mr-2 text-amber-500" />
                  Stato attuale Google Calendar
                </CardTitle>
                <CardDescription>
                  Verifica lo stato attuale della tua autorizzazione Google e delle configurazioni email
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  <div className="p-4 rounded-lg border">
                    <div className="flex justify-between items-start mb-4">
                      <div>
                        <h3 className="text-lg font-medium mb-1">Stato autorizzazione Google</h3>
                        <p className="text-muted-foreground text-sm">
                          L'autorizzazione è necessaria per l'accesso a Google Calendar e l'invio di email
                        </p>
                      </div>
                      <div className={`px-3 py-1 rounded-full text-sm font-medium ${googleStatus.authorized ? 'bg-green-100 text-green-800' : 'bg-amber-100 text-amber-800'}`}>
                        {googleStatus.authorized ? 'Autorizzato' : 'Non autorizzato'}
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
                          Verifica configurazione Google
                        </Button>
                        
                        <Button
                          variant="outline"
                          onClick={runEmailTest}
                          disabled={isLoading}
                        >
                          {isLoading ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <RefreshCw className="h-4 w-4 mr-2" />}
                          Verifica impostazioni email
                        </Button>
                      </div>
                    </div>
                  </div>
                  
                  {testResult && (
                    <div className={`p-4 rounded-lg border ${testResult.success ? 'bg-green-50 border-green-200' : 'bg-amber-50 border-amber-200'}`}>
                      <h3 className="text-lg font-medium mb-2">Risultato test Google</h3>
                      
                      <div className="space-y-3">
                        <div className="flex items-center">
                          <div className="w-64 font-medium">Client ID:</div>
                          <div className={testResult.clientIdPresente ? 'text-green-600' : 'text-red-600'}>
                            {testResult.clientIdPresente ? 'Presente' : 'Mancante'}
                          </div>
                        </div>
                        
                        <div className="flex items-center">
                          <div className="w-64 font-medium">Client Secret:</div>
                          <div className={testResult.clientSecretPresente ? 'text-green-600' : 'text-red-600'}>
                            {testResult.clientSecretPresente ? 'Presente' : 'Mancante'}
                          </div>
                        </div>
                        
                        <div className="flex items-start">
                          <div className="w-64 font-medium mt-1">URI di reindirizzamento:</div>
                          <div>
                            <span className="text-muted-foreground break-all">{testResult.redirectUri}</span>
                            <p className="text-sm text-amber-600 mt-1">
                              Questo URL deve corrispondere esattamente a quello configurato nella Console Google Cloud
                            </p>
                          </div>
                        </div>
                        
                        <div className="flex items-start">
                          <div className="w-64 font-medium mt-1">Scopes:</div>
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
                      <h3 className="text-lg font-medium mb-2">Impostazioni Email e Calendario</h3>
                      
                      <div className="space-y-3">
                        <div className="flex items-center">
                          <div className="w-64 font-medium">Email abilitata:</div>
                          <div>
                            {emailTestResult.emailEnabled ? (
                              <span className="text-green-600">Sì</span>
                            ) : (
                              <span className="text-amber-600">No</span>
                            )}
                          </div>
                        </div>
                        
                        <div className="flex items-center">
                          <div className="w-64 font-medium">Indirizzo email:</div>
                          <div>
                            {emailTestResult.emailAddress}
                          </div>
                        </div>
                        
                        <div className="flex items-center">
                          <div className="w-64 font-medium">Calendario abilitato:</div>
                          <div>
                            {emailTestResult.calendarEnabled ? (
                              <span className="text-green-600">Sì</span>
                            ) : (
                              <span className="text-amber-600">No</span>
                            )}
                          </div>
                        </div>
                        
                        <div className="flex items-center">
                          <div className="w-64 font-medium">ID Calendario:</div>
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
                {googleStatus.authorized ? "Autorizzazione completata" : "Autorizzazione mancante"}
              </AlertTitle>
              <AlertDescription>
                {googleStatus.authorized 
                  ? "Il tuo account Google è stato autorizzato correttamente" 
                  : "L'account Google non è autorizzato. Questo è necessario per l'utilizzo di Google Calendar e l'invio di email automatiche."}
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
                  Correzione problemi comuni
                </CardTitle>
                <CardDescription>
                  Soluzioni per risolvere i problemi più comuni con l'integrazione Google
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-6">
                  <div className="p-4 rounded-lg border bg-amber-50 border-amber-200">
                    <h3 className="text-lg font-medium mb-3 flex items-center">
                      <AlertTriangle className="h-5 w-5 mr-2 text-amber-600" />
                      Errore 400: redirect_uri_mismatch
                    </h3>
                    
                    <p className="mb-3">
                      Questo errore si verifica quando l'URI di reindirizzamento configurato nella Console Google Cloud non corrisponde esattamente all'URI utilizzato dall'applicazione.
                    </p>
                    
                    <div className="bg-white p-3 rounded border mb-4">
                      <div className="text-sm font-medium mb-1">URI di reindirizzamento dell'app:</div>
                      <div className="text-sm text-muted-foreground break-all">
                        https://wife-scheduler-zambelliandrea1.replit.app/api/google-auth/callback
                      </div>
                    </div>
                    
                    <p className="font-medium">Per risolvere questo problema:</p>
                    <ol className="list-decimal pl-5 space-y-2 mt-2 mb-4">
                      <li>Accedi alla <a href="https://console.cloud.google.com/apis/credentials" target="_blank" rel="noopener noreferrer" className="text-blue-600 hover:underline">Console Google Cloud</a></li>
                      <li>Seleziona il tuo progetto</li>
                      <li>Vai a "Credenziali" e trova l'ID client OAuth 2.0 utilizzato dall'applicazione</li>
                      <li>Modifica l'URI di reindirizzamento per corrispondere esattamente all'URI dell'app mostrato sopra</li>
                      <li>Aggiungi anche l'origine JavaScript: <span className="font-mono">https://wife-scheduler-zambelliandrea1.replit.app</span></li>
                      <li>Salva le modifiche</li>
                    </ol>
                    
                    <div className="flex justify-end">
                      <Button onClick={restartGoogleAuth}>
                        Riprova autorizzazione
                      </Button>
                    </div>
                  </div>
                  
                  <div className="p-4 rounded-lg border">
                    <h3 className="text-lg font-medium mb-3">Invio email non funzionante</h3>
                    
                    <p className="mb-3">
                      Se l'invio di email non funziona correttamente, verifica queste impostazioni:
                    </p>
                    
                    <ul className="list-disc pl-5 space-y-2 mb-4">
                      <li>Assicurati che l'email sia abilitata nelle impostazioni</li>
                      <li>Controlla che l'indirizzo email e la password siano corretti</li>
                      <li>Per gli account Google, è necessario utilizzare una "password per app" specifica. <a href="https://myaccount.google.com/apppasswords" target="_blank" rel="noopener noreferrer" className="text-blue-600 hover:underline">Crea una password per app</a></li>
                      <li>Verifica che l'account Google sia stato autorizzato correttamente</li>
                    </ul>
                    
                    <div className="flex justify-end">
                      <Link href="/email-settings">
                        <Button variant="outline">
                          Vai alle impostazioni email
                        </Button>
                      </Link>
                    </div>
                  </div>
                  
                  <div className="p-4 rounded-lg border bg-green-50 border-green-200">
                    <h3 className="text-lg font-medium mb-3 flex items-center">
                      <RefreshCw className="h-5 w-5 mr-2 text-green-600" />
                      Riavvia l'autorizzazione
                    </h3>
                    
                    <p className="mb-4">
                      In alcuni casi è necessario riavviare completamente il processo di autorizzazione con Google. Questo può risolvere problemi con token scaduti o revocati.
                    </p>
                    
                    <div className="flex justify-end">
                      <Button onClick={restartGoogleAuth} variant="default">
                        Riavvia autorizzazione Google
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
                  Guida alla configurazione Google
                </CardTitle>
                <CardDescription>
                  Come configurare correttamente Google Cloud per l'autorizzazione OAuth
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-6">
                  <div className="p-4 rounded-lg border">
                    <h3 className="text-lg font-medium mb-3">Procedura di configurazione</h3>
                    
                    <ol className="space-y-4 mb-4">
                      <li className="p-3 bg-muted rounded flex gap-3">
                        <div className="flex-shrink-0 h-6 w-6 rounded-full bg-blue-100 text-blue-600 flex items-center justify-center font-medium">1</div>
                        <div>
                          <p className="font-medium">Accedi alla Console Google Cloud</p>
                          <p className="text-sm text-muted-foreground mt-1">Vai a <a href="https://console.cloud.google.com/" target="_blank" rel="noopener noreferrer" className="text-blue-600 hover:underline">console.cloud.google.com</a> e accedi con il tuo account Google</p>
                        </div>
                      </li>
                      
                      <li className="p-3 bg-muted rounded flex gap-3">
                        <div className="flex-shrink-0 h-6 w-6 rounded-full bg-blue-100 text-blue-600 flex items-center justify-center font-medium">2</div>
                        <div>
                          <p className="font-medium">Crea un progetto o seleziona un progetto esistente</p>
                          <p className="text-sm text-muted-foreground mt-1">Dal menu in alto, seleziona o crea un nuovo progetto</p>
                        </div>
                      </li>
                      
                      <li className="p-3 bg-muted rounded flex gap-3">
                        <div className="flex-shrink-0 h-6 w-6 rounded-full bg-blue-100 text-blue-600 flex items-center justify-center font-medium">3</div>
                        <div>
                          <p className="font-medium">Abilita le API necessarie</p>
                          <p className="text-sm text-muted-foreground mt-1">Vai a "API e servizi" {'>'} "Libreria" e abilita Google Calendar API e Gmail API</p>
                        </div>
                      </li>
                      
                      <li className="p-3 bg-muted rounded flex gap-3">
                        <div className="flex-shrink-0 h-6 w-6 rounded-full bg-blue-100 text-blue-600 flex items-center justify-center font-medium">4</div>
                        <div>
                          <p className="font-medium">Configura la schermata di consenso OAuth</p>
                          <p className="text-sm text-muted-foreground mt-1">Vai a "API e servizi" {'>'} "Schermata consenso OAuth" e configura le informazioni sull'app</p>
                        </div>
                      </li>
                      
                      <li className="p-3 bg-muted rounded flex gap-3">
                        <div className="flex-shrink-0 h-6 w-6 rounded-full bg-blue-100 text-blue-600 flex items-center justify-center font-medium">5</div>
                        <div>
                          <p className="font-medium">Crea credenziali OAuth</p>
                          <p className="text-sm text-muted-foreground mt-1">Vai a "API e servizi" {'>'} "Credenziali" e crea un ID client OAuth 2.0 per applicazione Web</p>
                        </div>
                      </li>
                      
                      <li className="p-3 bg-amber-50 border-amber-200 border rounded flex gap-3">
                        <div className="flex-shrink-0 h-6 w-6 rounded-full bg-amber-100 text-amber-600 flex items-center justify-center font-medium">6</div>
                        <div>
                          <p className="font-medium">Configura le origini JavaScript e gli URI di reindirizzamento</p>
                          <div className="text-sm mt-1">
                            <p className="font-medium mb-1">Origini JavaScript autorizzate:</p>
                            <p className="font-mono text-muted-foreground mb-2">https://wife-scheduler-zambelliandrea1.replit.app</p>
                            
                            <p className="font-medium mb-1">URI di reindirizzamento autorizzati:</p>
                            <p className="font-mono text-muted-foreground">https://wife-scheduler-zambelliandrea1.replit.app/api/google-auth/callback</p>
                          </div>
                        </div>
                      </li>
                      
                      <li className="p-3 bg-muted rounded flex gap-3">
                        <div className="flex-shrink-0 h-6 w-6 rounded-full bg-blue-100 text-blue-600 flex items-center justify-center font-medium">7</div>
                        <div>
                          <p className="font-medium">Ottieni il Client ID e il Client Secret</p>
                          <p className="text-sm text-muted-foreground mt-1">Dopo aver creato le credenziali, annota il Client ID e il Client Secret</p>
                        </div>
                      </li>
                      
                      <li className="p-3 bg-muted rounded flex gap-3">
                        <div className="flex-shrink-0 h-6 w-6 rounded-full bg-blue-100 text-blue-600 flex items-center justify-center font-medium">8</div>
                        <div>
                          <p className="font-medium">Inserisci le credenziali nell'applicazione</p>
                          <p className="text-sm text-muted-foreground mt-1">Configura il Client ID e Client Secret nel tuo progetto attraverso l'amministratore dell'app</p>
                        </div>
                      </li>
                    </ol>
                    
                    <div className="flex justify-between mt-6">
                      <a 
                        href="https://console.cloud.google.com/apis/credentials" 
                        target="_blank" 
                        rel="noopener noreferrer" 
                        className="inline-flex items-center text-blue-600 hover:underline"
                      >
                        Vai alla console Google Cloud
                        <ExternalLink className="h-3 w-3 ml-1" />
                      </a>
                      
                      <Button onClick={restartGoogleAuth}>
                        Riavvia autorizzazione
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