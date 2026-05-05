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
import { Calendar, ExternalLink, Check, CopyIcon, RefreshCw, Lock } from "lucide-react";
import { useTranslation } from 'react-i18next';
import { useCapabilities } from "@/hooks/use-capabilities";
import { UpgradePrompt } from "@/components/UpgradePrompt";

export default function GoogleSetupInstructionsPage() {
  const { t } = useTranslation();
  const { toast } = useToast();
  const { hasCapability, getUpgradeMessage } = useCapabilities();
  const [showUpgradePrompt, setShowUpgradePrompt] = React.useState(false);
  const [testingStatus, setTestingStatus] = React.useState<'idle' | 'testing' | 'success' | 'error'>('idle');
  const callbackUrl = 'https://workspace.replit.app/api/google-auth/callback';

  // Verifica accesso a Google Calendar (solo PRO+)
  const canAccessGoogleCal = hasCapability('google_calendar');
  const upgradeMessage = getUpgradeMessage('google_calendar');

  // Funzione per copiare l'URL negli appunti
  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text).then(() => {
      toast({
        title: t('common.copied', 'Copied to clipboard'),
        description: text,
      });
    }).catch(() => {
      toast({
        title: t('common.error'),
        description: t('common.copyFailed', 'Unable to copy to clipboard'),
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
            title: t('google.authStarted', 'Authorization started'),
            description: t('google.authOpenedWindow', 'A new window has been opened for Google authorization'),
          });
        } else {
          throw new Error('Authorization URL not available');
        }
      } else {
        throw new Error('Unable to start Google authorization');
      }
    } catch (error) {
      console.error('Errore nell\'autorizzazione Google:', error);
      toast({
        title: t('google.authError', 'Authorization error'),
        description: error instanceof Error ? error.message : t('google.genericError', 'An error occurred while starting authorization'),
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
          title: t('google.testSuccess', 'Test completed successfully'),
          description: t('google.configCorrect', 'The Google configuration appears correct'),
        });
      } else {
        setTestingStatus('error');
        toast({
          title: t('google.testFailed', 'Test failed'),
          description: data.error || t('google.configError', 'An error occurred with the Google configuration'),
          variant: "destructive",
        });
      }
    } catch (error) {
      setTestingStatus('error');
      toast({
        title: t('google.testFailed', 'Test failed'),
        description: t('google.networkError', 'Network error during test'),
        variant: "destructive",
      });
    }
  };

  // Se non ha accesso a Google Calendar, mostra UI bloccata
  if (!canAccessGoogleCal) {
    return (
      <>
        <div className="container mx-auto py-6 space-y-6">
          <Card className="border-2 border-purple-200 bg-purple-50/50">
            <CardContent className="text-center py-12">
              <Lock className="h-16 w-16 mx-auto text-purple-600 mb-4" />
              <h3 className="text-2xl font-bold text-gray-900 mb-2">{t('i18nFinale.googleSetup.notAvailable')}</h3>
              <p className="text-gray-600 mb-6 max-w-md mx-auto">
                {t('i18nFinale.googleSetup.availableOnlyInPlans')} <span className="font-bold text-purple-700">Pro</span> e <span className="font-bold text-purple-700">Business</span>.
              </p>
              <Button 
                onClick={() => setShowUpgradePrompt(true)}
                className="bg-gradient-to-r from-blue-500 to-purple-500 hover:from-blue-600 hover:to-purple-600"
                data-testid="button-upgrade-google"
              >
                {t('license.upgrade', { license: 'Pro', defaultValue: 'Upgrade to Pro' })}
              </Button>
            </CardContent>
          </Card>
        </div>
        
        <UpgradePrompt
          open={showUpgradePrompt}
          onOpenChange={setShowUpgradePrompt}
          title={upgradeMessage.title}
          description={upgradeMessage.description}
          requiredPlan={upgradeMessage.requiredPlan}
        />
      </>
    );
  }

  return (
    <div className="container py-8 max-w-4xl">
      <div className="flex items-center mb-6">
        <Calendar className="h-6 w-6 mr-2 text-primary" />
        <h1 className="text-3xl font-bold tracking-tight">
          {t('google.setupTitle', 'Google Calendar Setup')}
        </h1>
      </div>
      
      <p className="text-muted-foreground mb-8">
        {t('google.setupDescription', 'Follow these steps to correctly set up the Google Calendar integration.')}
      </p>
      
      <Tabs defaultValue="instructions" className="w-full">
        <TabsList className="grid w-full grid-cols-2">
          <TabsTrigger value="instructions">
            {t('google.instructions', 'Configuration instructions')}
          </TabsTrigger>
          <TabsTrigger value="testing">
            {t('google.testing', 'Test & troubleshooting')}
          </TabsTrigger>
        </TabsList>
        
        <TabsContent value="instructions" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>{t('google.step', 'Step')} 1: {t('google.createProject', 'Access Google Cloud Console')}</CardTitle>
              <CardDescription>
                {t('google.accessConsole', 'Access the Google Cloud console to manage APIs and credentials')}
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <ol className="list-decimal list-inside space-y-3 ml-2">
                <li>
                  {t('google.visitConsole', 'Visit the')} <a
                    href="https://console.cloud.google.com/"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-primary underline underline-offset-4 flex items-center inline-flex gap-1"
                  >
                    Google Cloud Console <ExternalLink className="h-3 w-3" />
                  </a>
                </li>
                <li>{t('google.signIn', 'Sign in with your Google account')}</li>
                <li>{t('google.createProject', 'Create a new project or select an existing one')}</li>
              </ol>
            </CardContent>
          </Card>
          
          <Card>
            <CardHeader>
              <CardTitle>{t('google.step', 'Step')} 2: {t('google.enableAPIs', 'Enable required Google APIs')}</CardTitle>
              <CardDescription>
                {t('google.enableAPIDesc', 'Enable Google Calendar and Gmail APIs for the integration')}
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <ol className="list-decimal list-inside space-y-3 ml-2">
                <li>{t('google.goToAPI', 'Go to "APIs and services" > "Library"')}</li>
                <li>
                  {t('google.searchCalendar', 'Search "Google Calendar API", select it and click "Enable"')}
                </li>
                <li>
                  {t('google.searchGmail', 'Search "Gmail API", select it and click "Enable"')}
                </li>
              </ol>
            </CardContent>
          </Card>
          
          <Card>
            <CardHeader>
              <CardTitle>{t('google.step', 'Step')} 3: {t('google.configOAuth', 'Configure OAuth credentials')}</CardTitle>
              <CardDescription>
                {t('google.configOAuthDesc', 'Create and configure OAuth 2.0 credentials for authentication')}
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <ol className="list-decimal list-inside space-y-3 ml-2">
                <li>{t('google.goToCredentials', 'Go to "APIs and services" > "Credentials"')}</li>
                <li>{t('google.clickCreate', 'Click "Create credentials" > "OAuth client ID"')}</li>
                <li>
                  {t('google.configConsent', 'If prompted, configure the OAuth consent screen:')}
                  <ul className="list-disc list-inside ml-6 mt-2 space-y-1">
                    <li>{t('google.userType', 'User type: External')}</li>
                    <li>{t('google.appName', 'App name: [Your app name]')}</li>
                    <li>{t('google.supportEmail', 'Support email: [Your email]')}</li>
                    <li>{t('google.developerEmail', 'Developer email: [Your email]')}</li>
                  </ul>
                </li>
                <li>
                  {t('google.createOAuthClient', 'Create an OAuth 2.0 client ID:')}
                  <ul className="list-disc list-inside ml-6 mt-2 space-y-1">
                    <li>{t('google.appType', 'Application type: Web Application')}</li>
                    <li>{t('google.appName', 'Name: [Your app name]')}</li>
                    <li>
                      {t('google.redirectURI', 'Authorized redirect URIs: Add the following exact URL')}
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
                  {t('google.saveCredentials', 'After creating the OAuth client, save the following data:')}
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
              <CardTitle>{t('google.step', 'Step')} 4: {t('google.configApp', 'Configure the application')}</CardTitle>
              <CardDescription>
                {t('google.configAppDesc', 'Enter the OAuth credentials in Replit')}
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <ol className="list-decimal list-inside space-y-3 ml-2">
                <li>
                  {t('google.accessSecrets', 'Access Replit secrets via "Secrets" in the control panel')}
                </li>
                <li>
                  {t('google.addClientID', 'Add a new secret with key "GOOGLE_CLIENT_ID" and the Client ID value')}
                </li>
                <li>
                  {t('google.addClientSecret', 'Add a new secret with key "GOOGLE_CLIENT_SECRET" and the Client Secret value')}
                </li>
                <li>
                  {t('google.restartApp', 'Restart the application to apply the changes')}
                </li>
              </ol>
            </CardContent>
          </Card>
        </TabsContent>
        
        <TabsContent value="testing" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>{t('google.testConfiguration', 'Configuration test')}</CardTitle>
              <CardDescription>
                {t('google.testConfigDesc', 'Verify that the Google OAuth configuration is correct')}
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
                      {t('google.verifying', 'Checking...')}
                    </>
                  ) : testingStatus === 'success' ? (
                    <>
                      <Check className="h-4 w-4 mr-2" />
                      {t('google.testAgain', 'Test again')}
                    </>
                  ) : (
                    t('google.testConfig', 'Test configuration')
                  )}
                </Button>
                
                <div className="my-4 p-4 bg-muted rounded-lg border border-muted-foreground/20">
                  <h4 className="font-medium mb-2">{t('google.tryAuth', 'Try authorization:')}</h4>
                  <p className="text-sm mb-3">
                    {t('google.tryAuthDesc', 'After correctly configuring the credentials, you can try starting the authorization process:')}
                  </p>
                  <Button 
                    onClick={startGoogleAuth} 
                    className="flex items-center"
                    variant="default"
                  >
                    <Calendar className="h-4 w-4 mr-2" />
                    {t('google.startAuthProcess', 'Start authorization process')}
                  </Button>
                </div>
                
                <div className="mt-6">
                  <h4 className="font-medium mb-2">{t('google.commonIssues', 'Common issues and solutions:')}</h4>
                  <ul className="list-disc list-inside space-y-2">
                    <li>
                      <strong>{t('google.error400', 'Error 400: redirect_uri_mismatch')}</strong>
                      <p className="ml-6 text-muted-foreground text-sm">
                        {t('google.error400Desc', 'The redirect URL configured in the Google Cloud console does not exactly match the one used by the application. Make sure to use exactly the URL shown above.')}
                      </p>
                    </li>
                    <li>
                      <strong>{t('google.error403', 'Error 403: access_denied')}</strong>
                      <p className="ml-6 text-muted-foreground text-sm">
                        {t('google.error403Desc', 'The Google Cloud app does not have the required permissions or has not been verified. Make sure you have enabled the necessary APIs and correctly configured the OAuth consent screen.')}
                      </p>
                    </li>
                    <li>
                      <strong>{t('google.credentials', 'Invalid credentials')}</strong>
                      <p className="ml-6 text-muted-foreground text-sm">
                        {t('google.credentialsDesc', 'Make sure the Client ID and Client Secret are correct and match those of the Google Cloud project.')}
                      </p>
                    </li>
                  </ul>
                </div>
              </div>
            </CardContent>
          </Card>
          
          <Card>
            <CardHeader>
              <CardTitle>{t('google.debugInfo', 'Debug information')}</CardTitle>
              <CardDescription>
                {t('google.debugInfoDesc', 'Useful information for debugging the configuration')}
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <div>
                  <h4 className="font-medium mb-2">{t('google.callbackUrl', 'Callback URL:')}</h4>
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
                  <h4 className="font-medium mb-2">{t('google.requiredAPIs', 'Required APIs:')}</h4>
                  <ul className="list-disc list-inside space-y-1">
                    <li>Google Calendar API</li>
                    <li>Gmail API</li>
                  </ul>
                </div>
                
                <div>
                  <h4 className="font-medium mb-2">{t('google.scopes', 'Required scopes:')}</h4>
                  <ul className="list-disc list-inside space-y-1">
                    <li>
                      <code className="text-xs">https://www.googleapis.com/auth/calendar</code>
                      <span className="text-sm text-muted-foreground ml-2">
                        {t('google.calendarScope', '(Full calendar access)')}
                      </span>
                    </li>
                    <li>
                      <code className="text-xs">https://www.googleapis.com/auth/gmail.send</code>
                      <span className="text-sm text-muted-foreground ml-2">
                        {t('google.gmailScope', '(Email sending)')}
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