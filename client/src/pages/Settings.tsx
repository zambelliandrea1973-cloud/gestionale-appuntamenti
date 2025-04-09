import React from 'react';
import { useLocation } from 'wouter';
import { useTranslation } from 'react-i18next';
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import { ArrowLeft, Settings as SettingsIcon, Smartphone, Image, Brush, Type, Link2, Contact, Calendar } from "lucide-react";
import AppIconUploader from '@/components/AppIconUploader';
import AppNameEditor from '@/components/AppNameEditor';
import ContactInfoEditor from '@/components/ContactInfoEditor';
import GoogleCalendarSettings from '@/components/GoogleCalendarSettings';

export default function Settings() {
  const [, setLocation] = useLocation();
  const { t } = useTranslation();

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
        <TabsList className="grid grid-cols-5 mb-6">
          <TabsTrigger value="app" className="flex items-center whitespace-nowrap">
            <SettingsIcon className="mr-2 h-4 w-4" />
            <span>{t('settings.general', 'Generali')}</span>
          </TabsTrigger>
          <TabsTrigger value="contacts" className="flex items-center whitespace-nowrap">
            <Contact className="mr-2 h-4 w-4" />
            <span>{t('settings.contacts', 'Contatti')}</span>
          </TabsTrigger>
          <TabsTrigger value="integrations" className="flex items-center whitespace-nowrap">
            <Calendar className="mr-2 h-4 w-4" />
            <span className="truncate">{t('settings.googleCalendar', 'Google calendario')}</span>
          </TabsTrigger>
          <TabsTrigger value="appearance" className="flex items-center whitespace-nowrap">
            <Brush className="mr-2 h-4 w-4" />
            <span>{t('settings.appearance', 'Aspetto')}</span>
          </TabsTrigger>
          <TabsTrigger value="client-app" className="flex items-center whitespace-nowrap">
            <Smartphone className="mr-2 h-4 w-4" />
            <span>{t('settings.clientApp', 'App Cliente')}</span>
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

        <TabsContent value="contacts">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center">
                <Contact className="mr-2 h-5 w-5" />
                {t('settings.contactsTitle', 'Informazioni di Contatto')}
              </CardTitle>
              <CardDescription>
                {t('settings.contactsDesc', 'Gestisci le informazioni di contatto che verranno mostrate a piè di pagina nell\'app cliente')}
              </CardDescription>
            </CardHeader>
            <CardContent>
              <ContactInfoEditor />
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="integrations">
          <GoogleCalendarSettings />
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