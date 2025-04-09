import React, { useState, useEffect } from 'react';
import { useLocation } from 'wouter';
import { useTranslation } from 'react-i18next';
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { ArrowLeft, Settings as SettingsIcon, Smartphone, Image, Brush, Type, Calendar, Link2, Check } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import AppIconUploader from '@/components/AppIconUploader';
import AppNameEditor from '@/components/AppNameEditor';
import { loadGoogleCalendarConfig, saveGoogleCalendarConfig, GoogleCalendarConfig } from '@/lib/googleCalendar';

export default function Settings() {
  const [, setLocation] = useLocation();
  const { t } = useTranslation();
  const { toast } = useToast();
  const [googleCalendarEnabled, setGoogleCalendarEnabled] = useState(false);
  const [googleApiKey, setGoogleApiKey] = useState('');
  const [googleClientId, setGoogleClientId] = useState('');
  const [saveSuccess, setSaveSuccess] = useState(false);
  
  // Carica la configurazione salvata al montaggio del componente
  useEffect(() => {
    const savedConfig = loadGoogleCalendarConfig();
    if (savedConfig) {
      setGoogleCalendarEnabled(savedConfig.enabled);
      setGoogleApiKey(savedConfig.apiKey);
      setGoogleClientId(savedConfig.clientId);
    }
  }, []);
  
  // Funzione per salvare la configurazione di Google Calendar
  const handleSaveGoogleCalendarConfig = () => {
    const config: GoogleCalendarConfig = {
      enabled: googleCalendarEnabled,
      apiKey: googleApiKey,
      clientId: googleClientId
    };
    
    saveGoogleCalendarConfig(config);
    
    toast({
      title: t('settings.saveSuccess', 'Configurazione salvata'),
      description: t('settings.googleCalendarSaved', 'Le impostazioni di Google Calendar sono state salvate correttamente'),
      variant: "default",
    });
    
    // Mostra l'icona di conferma per 2 secondi
    setSaveSuccess(true);
    setTimeout(() => setSaveSuccess(false), 2000);
  };

  return (
    <div className="container mx-auto p-4 max-w-6xl">
      <header className="mb-6">
        <div className="flex items-center mb-2">
          <Button 
            variant="ghost" 
            size="icon" 
            className="mr-2 h-8 w-8"
            onClick={() => setLocation("/")}
          >
            <ArrowLeft className="h-5 w-5" />
          </Button>
          <h1 className="text-3xl font-bold tracking-tight">{t('settings.title', 'Impostazioni')}</h1>
        </div>
        <p className="text-muted-foreground">
          {t('settings.description', 'Personalizza l\'applicazione e configura le preferenze')}
        </p>
      </header>

      <Tabs defaultValue="app" className="w-full">
        <TabsList className="grid grid-cols-4 mb-6">
          <TabsTrigger value="app" className="flex items-center">
            <SettingsIcon className="mr-2 h-4 w-4" />
            {t('settings.general', 'Generali')}
          </TabsTrigger>
          <TabsTrigger value="integrations" className="flex items-center">
            <Link2 className="mr-2 h-4 w-4" />
            {t('settings.integrations', 'Integrazioni')}
          </TabsTrigger>
          <TabsTrigger value="appearance" className="flex items-center">
            <Brush className="mr-2 h-4 w-4" />
            {t('settings.appearance', 'Aspetto')}
          </TabsTrigger>
          <TabsTrigger value="client-app" className="flex items-center">
            <Smartphone className="mr-2 h-4 w-4" />
            {t('settings.clientApp', 'App Cliente')}
          </TabsTrigger>
        </TabsList>

        <TabsContent value="app">
          <Card>
            <CardHeader>
              <CardTitle>{t('settings.generalTitle', 'Impostazioni Generali')}</CardTitle>
              <CardDescription>
                {t('settings.generalDesc', 'Configura le impostazioni generali dell\'applicazione')}
              </CardDescription>
            </CardHeader>
            <CardContent>
              <p className="text-sm text-muted-foreground">
                {t('settings.generalInDev', 'Questa sezione è in fase di sviluppo. Presto saranno disponibili opzioni per personalizzare l\'applicazione.')}
              </p>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="integrations">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center">
                <Calendar className="mr-2 h-5 w-5" />
                {t('settings.googleCalendar', 'Google Calendar')}
              </CardTitle>
              <CardDescription>
                {t('settings.googleCalendarDesc', 'Integra la tua agenda con Google Calendar')}
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="flex items-center space-x-2">
                <Switch 
                  id="google-calendar" 
                  checked={googleCalendarEnabled}
                  onCheckedChange={setGoogleCalendarEnabled}
                />
                <Label htmlFor="google-calendar">
                  {t('settings.enableGoogleCalendar', 'Abilita sincronizzazione con Google Calendar')}
                </Label>
              </div>
              
              {googleCalendarEnabled && (
                <div className="space-y-4 mt-4">
                  <div className="space-y-2">
                    <Label htmlFor="google-api-key">Google API Key</Label>
                    <Input
                      id="google-api-key"
                      placeholder="Inserisci la tua Google API Key"
                      value={googleApiKey}
                      onChange={(e) => setGoogleApiKey(e.target.value)}
                    />
                    <p className="text-sm text-muted-foreground">
                      {t('settings.googleApiKeyHelp', 'Necessaria per accedere alle API di Google')}
                    </p>
                  </div>
                  
                  <div className="space-y-2">
                    <Label htmlFor="google-client-id">Google Client ID</Label>
                    <Input
                      id="google-client-id"
                      placeholder="Inserisci il tuo Google Client ID"
                      value={googleClientId}
                      onChange={(e) => setGoogleClientId(e.target.value)}
                    />
                    <p className="text-sm text-muted-foreground">
                      {t('settings.googleClientIdHelp', 'Necessario per l\'autenticazione OAuth')}
                    </p>
                  </div>
                </div>
              )}
            </CardContent>
            <CardFooter>
              <Button 
                disabled={!googleCalendarEnabled || !googleApiKey || !googleClientId}
                className="ml-auto flex items-center"
                onClick={handleSaveGoogleCalendarConfig}
              >
                {saveSuccess ? (
                  <Check className="mr-2 h-4 w-4 text-green-500" />
                ) : null}
                {t('settings.saveGoogleCalendarSettings', 'Salva impostazioni')}
              </Button>
            </CardFooter>
          </Card>
        </TabsContent>
        
        <TabsContent value="appearance">
          <Card>
            <CardHeader>
              <CardTitle>{t('settings.appearanceTitle', 'Personalizzazione Aspetto')}</CardTitle>
              <CardDescription>
                {t('settings.appearanceDesc', 'Personalizza l\'aspetto dell\'applicazione')}
              </CardDescription>
            </CardHeader>
            <CardContent>
              <p className="text-sm text-muted-foreground">
                {t('settings.appearanceInDev', 'Questa sezione è in fase di sviluppo. Presto saranno disponibili opzioni per personalizzare i colori e l\'aspetto dell\'applicazione.')}
              </p>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="client-app">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center">
                <Smartphone className="mr-2 h-5 w-5" />
                {t('settings.clientAppTitle', 'Personalizzazione App Cliente')}
              </CardTitle>
              <CardDescription>
                {t('settings.clientAppDesc', 'Personalizza l\'aspetto dell\'app che i clienti installeranno sui loro dispositivi')}
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-8">
              <div>
                <div className="flex items-center mb-4">
                  <Type className="h-5 w-5 mr-2 text-muted-foreground" />
                  <h3 className="text-lg font-medium">{t('settings.appName', 'Nome App')}</h3>
                </div>
                <AppNameEditor />
              </div>
              
              <Separator className="my-8" />
              
              <div>
                <div className="flex items-center mb-4">
                  <Image className="h-5 w-5 mr-2 text-muted-foreground" />
                  <h3 className="text-lg font-medium">{t('settings.appIcon', 'Icona App')}</h3>
                </div>
                <AppIconUploader />
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}