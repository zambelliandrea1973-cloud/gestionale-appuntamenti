import React from 'react';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";
import { Calendar, ExternalLink, Check, CopyIcon, RefreshCw } from "lucide-react";
import { useTranslation } from 'react-i18next';

export default function GoogleSetupInstructionsPage() {
  const { t } = useTranslation();
  const { toast } = useToast();
  const [testingStatus, setTestingStatus] = React.useState<'idle' | 'testing' | 'success' | 'error'>('idle');
  const callbackUrl = 'https://workspace.replit.app/api/google-auth/callback';

  // Funzione per copiare l'URL negli appunti
  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text).then(() => {
      toast({
        title: t('common.copied', 'Copiato negli appunti'),
        description: text,
      });
    }).catch(() => {
      toast({
        title: t('common.error', 'Errore'),
        description: t('common.copyFailed', 'Impossibile copiare negli appunti'),
        variant: "destructive",
      });
    });
  };

  // Funzione per testare la configurazione
  const startGoogleAuth = async () => {
    try {
      const response = await fetch('/api/google-auth/start');
      if (response.ok) {
        const data = await response.json();
        if (data.authUrl) {
          // Apre l'URL di autorizzazione in una nuova finestra
          window.open(data.authUrl, 'googleAuthWindow', 'width=800,height=600');
          
          toast({
            title: t('google.authStarted', 'Autorizzazione avviata'),
            description: t('google.authOpenedWindow', 'Abbiamo aperto una nuova finestra per l\'autorizzazione Google'),
          });
        } else {
          throw new Error('URL di autorizzazione non disponibile');
        }
      } else {
        throw new Error('Non è stato possibile avviare l\'autorizzazione Google');
      }
    } catch (error) {
      console.error('Errore nell\'autorizzazione Google:', error);
      toast({
        title: t('google.authError', 'Errore di autorizzazione'),
        description: error instanceof Error ? error.message : t('google.genericError', 'Si è verificato un errore durante l\'avvio dell\'autorizzazione'),
        variant: "destructive",
      });
    }
  };

  const testConfiguration = async () => {
    setTestingStatus('testing');
    
    try {
      const response = await fetch('/api/google-auth/test-configuration');
      const data = await response.json();
      
      if (data.success) {
        setTestingStatus('success');
        toast({
          title: t('google.testSuccess', 'Test completato con successo'),
          description: t('google.configCorrect', 'La configurazione Google sembra corretta'),
        });
      } else {
        setTestingStatus('error');
        toast({
          title: t('google.testFailed', 'Test fallito'),
          description: data.error || t('google.configError', 'Si è verificato un errore con la configurazione Google'),
          variant: "destructive",
        });
      }
    } catch (error) {
      setTestingStatus('error');
      toast({
        title: t('google.testFailed', 'Test fallito'),
        description: t('google.networkError', 'Errore di rete durante il test'),
        variant: "destructive",
      });
    }
  };

  return (
    <div className="container py-8 max-w-4xl">
      <div className="flex items-center mb-6">
        <Calendar className="h-6 w-6 mr-2 text-primary" />
        <h1 className="text-3xl font-bold tracking-tight">
          {t('google.setupTitle', 'Configurazione Google Calendar')}
        </h1>
      </div>
      
      <p className="text-muted-foreground mb-8">
        {t('google.setupDescription', 'Segui questi passaggi per configurare correttamente l\'integrazione con Google Calendar.')}
      </p>
      
      <Tabs defaultValue="instructions" className="w-full">
        <TabsList className="grid w-full grid-cols-2">
          <TabsTrigger value="instructions">
            {t('google.instructions', 'Istruzioni di configurazione')}
          </TabsTrigger>
          <TabsTrigger value="testing">
            {t('google.testing', 'Test e risoluzione problemi')}
          </TabsTrigger>
        </TabsList>
        
        <TabsContent value="instructions" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>{t('google.step', 'Passaggio')} 1: {t('google.createProject', 'Accedere alla Google Cloud Console')}</CardTitle>
              <CardDescription>
                {t('google.accessConsole', 'Accedi alla console di Google Cloud per gestire le API e le credenziali')}
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <ol className="list-decimal list-inside space-y-3 ml-2">
                <li>
                  {t('google.visitConsole', 'Visita la')} <a
                    href="https://console.cloud.google.com/"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-primary underline underline-offset-4 flex items-center inline-flex gap-1"
                  >
                    Google Cloud Console <ExternalLink className="h-3 w-3" />
                  </a>
                </li>
                <li>{t('google.signIn', 'Accedi con il tuo account Google')}</li>
                <li>{t('google.createProject', 'Crea un nuovo progetto o seleziona un progetto esistente')}</li>
              </ol>
            </CardContent>
          </Card>
          
          <Card>
            <CardHeader>
              <CardTitle>{t('google.step', 'Passaggio')} 2: {t('google.enableAPIs', 'Abilita le API di Google necessarie')}</CardTitle>
              <CardDescription>
                {t('google.enableAPIDesc', 'Attiva le API di Google Calendar e Gmail per l\'integrazione')}
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <ol className="list-decimal list-inside space-y-3 ml-2">
                <li>{t('google.goToAPI', 'Vai a "API e servizi" > "Libreria API"')}</li>
                <li>
                  {t('google.searchCalendar', 'Cerca "Google Calendar API", selezionala e clicca "Abilita"')}
                </li>
                <li>
                  {t('google.searchGmail', 'Cerca "Gmail API", selezionala e clicca "Abilita"')}
                </li>
              </ol>
            </CardContent>
          </Card>
          
          <Card>
            <CardHeader>
              <CardTitle>{t('google.step', 'Passaggio')} 3: {t('google.configOAuth', 'Configura le credenziali OAuth')}</CardTitle>
              <CardDescription>
                {t('google.configOAuthDesc', 'Crea e configura le credenziali OAuth 2.0 per l\'autenticazione')}
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <ol className="list-decimal list-inside space-y-3 ml-2">
                <li>{t('google.goToCredentials', 'Vai a "API e servizi" > "Credenziali"')}</li>
                <li>{t('google.clickCreate', 'Clicca su "Crea credenziali" > "ID client OAuth"')}</li>
                <li>
                  {t('google.configConsent', 'Se richiesto, configura la schermata di consenso OAuth:')}
                  <ul className="list-disc list-inside ml-6 mt-2 space-y-1">
                    <li>{t('google.userType', 'Tipo utente: Esterno')}</li>
                    <li>{t('google.appName', 'Nome app: [Nome tua applicazione]')}</li>
                    <li>{t('google.supportEmail', 'Email di supporto: [La tua email]')}</li>
                    <li>{t('google.developerEmail', 'Email sviluppatore: [La tua email]')}</li>
                  </ul>
                </li>
                <li>
                  {t('google.createOAuthClient', 'Crea un ID client OAuth 2.0:')}
                  <ul className="list-disc list-inside ml-6 mt-2 space-y-1">
                    <li>{t('google.appType', 'Tipo di applicazione: Applicazione Web')}</li>
                    <li>{t('google.appName', 'Nome: [Nome tua applicazione]')}</li>
                    <li>
                      {t('google.redirectURI', 'URI di reindirizzamento autorizzati: Aggiungi il seguente URL esatto')}
                      <div className="flex items-center mt-2 p-2 bg-muted rounded-md">
                        <code className="text-sm text-muted-foreground">{callbackUrl}</code>
                        <Button 
                          variant="ghost" 
                          size="icon" 
                          onClick={() => copyToClipboard(callbackUrl)}
                          className="ml-2"
                        >
                          <CopyIcon className="h-4 w-4" />
                        </Button>
                      </div>
                    </li>
                  </ul>
                </li>
                <li>
                  {t('google.saveCredentials', 'Dopo aver creato il client OAuth, salva i seguenti dati:')}
                  <ul className="list-disc list-inside ml-6 mt-2 space-y-1">
                    <li>{t('google.clientID', 'Client ID')}</li>
                    <li>{t('google.clientSecret', 'Client Secret')}</li>
                  </ul>
                </li>
              </ol>
            </CardContent>
          </Card>
          
          <Card>
            <CardHeader>
              <CardTitle>{t('google.step', 'Passaggio')} 4: {t('google.configApp', 'Configura l\'applicazione')}</CardTitle>
              <CardDescription>
                {t('google.configAppDesc', 'Inserisci le credenziali OAuth in Replit')}
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <ol className="list-decimal list-inside space-y-3 ml-2">
                <li>
                  {t('google.accessSecrets', 'Accedi ai secrets di Replit tramite "Secrets" nel pannello di controllo')}
                </li>
                <li>
                  {t('google.addClientID', 'Aggiungi un nuovo secret con chiave "GOOGLE_CLIENT_ID" e il valore del Client ID')}
                </li>
                <li>
                  {t('google.addClientSecret', 'Aggiungi un nuovo secret con chiave "GOOGLE_CLIENT_SECRET" e il valore del Client Secret')}
                </li>
                <li>
                  {t('google.restartApp', 'Riavvia l\'applicazione per applicare le modifiche')}
                </li>
              </ol>
            </CardContent>
          </Card>
        </TabsContent>
        
        <TabsContent value="testing" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>{t('google.testConfiguration', 'Test della configurazione')}</CardTitle>
              <CardDescription>
                {t('google.testConfigDesc', 'Verifica che la configurazione OAuth di Google sia corretta')}
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex flex-col space-y-4">
                <Button 
                  onClick={testConfiguration} 
                  className="w-fit"
                  disabled={testingStatus === 'testing'}
                >
                  {testingStatus === 'testing' ? (
                    <>
                      <RefreshCw className="h-4 w-4 mr-2 animate-spin" />
                      {t('google.testing', 'Verifica in corso...')}
                    </>
                  ) : testingStatus === 'success' ? (
                    <>
                      <Check className="h-4 w-4 mr-2" />
                      {t('google.testAgain', 'Verifica di nuovo')}
                    </>
                  ) : (
                    t('google.testConfig', 'Verifica configurazione')
                  )}
                </Button>
                
                <div className="my-4 p-4 bg-muted rounded-lg border border-muted-foreground/20">
                  <h4 className="font-medium mb-2">{t('google.tryAuth', 'Prova l\'autorizzazione:')}</h4>
                  <p className="text-sm mb-3">
                    {t('google.tryAuthDesc', 'Dopo aver configurato correttamente le credenziali, puoi provare a iniziare il processo di autorizzazione:')}
                  </p>
                  <Button 
                    onClick={startGoogleAuth} 
                    className="flex items-center"
                    variant="default"
                  >
                    <Calendar className="h-4 w-4 mr-2" />
                    {t('google.startAuthProcess', 'Avvia processo di autorizzazione')}
                  </Button>
                </div>
                
                <div className="mt-6">
                  <h4 className="font-medium mb-2">{t('google.commonIssues', 'Problemi comuni e soluzioni:')}</h4>
                  <ul className="list-disc list-inside space-y-2">
                    <li>
                      <strong>{t('google.error400', 'Errore 400: redirect_uri_mismatch')}</strong>
                      <p className="ml-6 text-muted-foreground text-sm">
                        {t('google.error400Desc', 'L\'URL di reindirizzamento configurato nella console Google Cloud non corrisponde esattamente a quello utilizzato dall\'applicazione. Assicurati di utilizzare esattamente l\'URL mostrato sopra.')}
                      </p>
                    </li>
                    <li>
                      <strong>{t('google.error403', 'Errore 403: access_denied')}</strong>
                      <p className="ml-6 text-muted-foreground text-sm">
                        {t('google.error403Desc', 'L\'app Google Cloud non ha i permessi necessari o non è stata verificata. Assicurati di aver abilitato le API necessarie e di aver configurato correttamente la schermata di consenso OAuth.')}
                      </p>
                    </li>
                    <li>
                      <strong>{t('google.credentials', 'Credenziali invalide')}</strong>
                      <p className="ml-6 text-muted-foreground text-sm">
                        {t('google.credentialsDesc', 'Assicurati che il Client ID e il Client Secret siano corretti e corrispondano a quelli del progetto Google Cloud.')}
                      </p>
                    </li>
                  </ul>
                </div>
              </div>
            </CardContent>
          </Card>
          
          <Card>
            <CardHeader>
              <CardTitle>{t('google.debugInfo', 'Informazioni di debug')}</CardTitle>
              <CardDescription>
                {t('google.debugInfoDesc', 'Informazioni utili per il debug della configurazione')}
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <div>
                  <h4 className="font-medium mb-2">{t('google.callbackUrl', 'URL di callback:')}</h4>
                  <div className="flex items-center p-2 bg-muted rounded-md">
                    <code className="text-sm text-muted-foreground">{callbackUrl}</code>
                    <Button 
                      variant="ghost" 
                      size="icon" 
                      onClick={() => copyToClipboard(callbackUrl)}
                      className="ml-2"
                    >
                      <CopyIcon className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
                
                <div>
                  <h4 className="font-medium mb-2">{t('google.requiredAPIs', 'API necessarie:')}</h4>
                  <ul className="list-disc list-inside space-y-1">
                    <li>Google Calendar API</li>
                    <li>Gmail API</li>
                  </ul>
                </div>
                
                <div>
                  <h4 className="font-medium mb-2">{t('google.scopes', 'Ambiti (scopes) richiesti:')}</h4>
                  <ul className="list-disc list-inside space-y-1">
                    <li>
                      <code className="text-xs">https://www.googleapis.com/auth/calendar</code>
                      <span className="text-sm text-muted-foreground ml-2">
                        {t('google.calendarScope', '(Accesso completo al calendario)')}
                      </span>
                    </li>
                    <li>
                      <code className="text-xs">https://www.googleapis.com/auth/gmail.send</code>
                      <span className="text-sm text-muted-foreground ml-2">
                        {t('google.gmailScope', '(Invio di email)')}
                      </span>
                    </li>
                  </ul>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}