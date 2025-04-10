import React from 'react';
import { useLocation } from 'wouter';
import { useTranslation } from 'react-i18next';
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { ArrowLeft, Settings as SettingsIcon, Image, Brush, Contact, Calendar, Type } from "lucide-react";
import AppIconUploader from '@/components/AppIconUploader';
import ContactInfoEditor from '@/components/ContactInfoEditor';
import GoogleCalendarSettings from '@/components/GoogleCalendarSettings';
import CompanyNameEditor from '@/components/CompanyNameEditor';
import ServiceManager from '@/components/ServiceManager';

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
        <TabsList className="grid grid-cols-4 mb-6">
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
              <ServiceManager />
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
              <CardTitle className="flex items-center">
                <Brush className="mr-2 h-5 w-5" />
                {t('settings.appearanceTitle', 'Identità Aziendale')}
              </CardTitle>
              <CardDescription>
                {t('settings.appearanceDesc', 'Personalizza l\'icona dell\'applicazione per riflettere l\'identità della tua azienda. Questa impostazione si applicherà sia all\'app principale che all\'app cliente.')}
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-8">
              <div>
                <div className="flex items-center mb-4">
                  <Image className="h-5 w-5 mr-2 text-muted-foreground" />
                  <h3 className="text-lg font-medium">{t('settings.appIcon', 'Icona App')}</h3>
                </div>
                <AppIconUploader />
              </div>
              
              <div className="pt-4 border-t">
                <div className="flex items-center mb-4">
                  <Type className="h-5 w-5 mr-2 text-muted-foreground" />
                  <h3 className="text-lg font-medium">{t('settings.companyName', 'Nome Aziendale')}</h3>
                </div>
                <CompanyNameEditor />
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}