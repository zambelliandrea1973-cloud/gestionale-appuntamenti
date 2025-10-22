import React, { useState, useEffect } from 'react';
import { useLocation } from 'wouter';
import { useTranslation } from 'react-i18next';
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { 
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { useToast } from "@/hooks/use-toast";
import { useUserWithLicense } from "@/hooks/use-user-with-license";
import { ArrowLeft, Settings as SettingsIcon, Image, Brush, Contact, Type, Lock, Shield, Eye, EyeOff, RefreshCw, Mail, Calendar, Users, Building } from "lucide-react";
import AppIconUploader from '@/components/AppIconUploader';
import ContactInfoEditor from '@/components/ContactInfoEditor';
import CompanyNameEditor from '@/components/CompanyNameEditor';
import CompanyBusinessDataEditor from '@/components/CompanyBusinessDataEditor';
import SimpleServiceManager from '@/components/SimpleServiceManager';
import EmailSettings from '@/components/EmailSettings';
import AdminNotifications from '@/components/AdminNotifications';
import SubscriptionPlansAdmin from '@/components/SubscriptionPlansAdmin';

import { RestartAppButton } from '@/components/RestartAppButton';

export default function Settings() {
  const [, setLocation] = useLocation();
  const { t } = useTranslation();
  const { toast } = useToast();
  const { user } = useUserWithLicense(); // Ottiene i dati dell'utente corrente incluso il tipo
  const [showPassword, setShowPassword] = useState(false);
  const [activeTab, setActiveTab] = useState("app");
  
  // Recupera la tab selezionata da localStorage quando il componente viene montato
  useEffect(() => {
    const savedTab = localStorage.getItem('settings_active_tab');
    console.log("🔧 SETTINGS: Tab salvata in localStorage:", savedTab);
    if (savedTab) {
      setActiveTab(savedTab);
    }
    console.log("🔧 SETTINGS: Tab attiva impostata a:", savedTab || "app");
  }, []);

  // Debug del tab attivo
  useEffect(() => {
    console.log("🔧 SETTINGS: Tab attualmente attiva:", activeTab);
  }, [activeTab]);

  // Verifico se l'utente è un amministratore
  const isAdmin = user?.type === 'admin';
  
  // Funzione per accedere direttamente alla dashboard beta admin
  const handleDirectAdminAccess = () => {
    if (isAdmin) {
      // Reindirizza direttamente alla dashboard beta admin
      setLocation("/beta-admin");
    } else {
      toast({
        title: "Accesso negato",
        description: "Solo gli amministratori possono accedere a questa area.",
        variant: "destructive",
      });
    }
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

      <Tabs value={activeTab} className="w-full" onValueChange={(value) => {
        setActiveTab(value);
        localStorage.setItem('settings_active_tab', value);
      }}>
        <TabsList className={`grid ${isAdmin ? 'grid-cols-6' : 'grid-cols-5'} mb-6`}>
          <TabsTrigger value="app" className="flex items-center whitespace-nowrap">
            <SettingsIcon className="mr-2 h-4 w-4" />
            <span>{t('settings.general', 'Generali')}</span>
          </TabsTrigger>
          <TabsTrigger value="contacts" className="flex items-center whitespace-nowrap">
            <Contact className="mr-2 h-4 w-4" />
            <span>{t('settings.contacts', 'Contatti')}</span>
          </TabsTrigger>
          <TabsTrigger value="staff" className="flex items-center whitespace-nowrap">
            <Users className="mr-2 h-4 w-4" />
            <span>Staff & Stanze</span>
          </TabsTrigger>
          <TabsTrigger value="integrations" className="flex items-center whitespace-nowrap">
            <Mail className="mr-2 h-4 w-4" />
            <span>{t('settings.integrations', 'Email')}</span>
          </TabsTrigger>
          <TabsTrigger value="appearance" className="flex items-center whitespace-nowrap">
            <Brush className="mr-2 h-4 w-4" />
            <span>{t('settings.appearance', 'Aspetto')}</span>
          </TabsTrigger>
          {isAdmin && (
            <TabsTrigger value="admin" className="flex items-center whitespace-nowrap">
              <Shield className="mr-2 h-4 w-4" />
              <span>Admin</span>
            </TabsTrigger>
          )}
        </TabsList>

        <TabsContent value="app">
          <Card>
            <CardHeader>
              <CardTitle>{t('settings.generalTitle', 'Impostazioni Generali')}</CardTitle>
              <CardDescription>
                {t('settings.generalDesc', 'Configura le impostazioni generali dell\'applicazione')}
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-8">
              <SimpleServiceManager />
              
              <div className="pt-6 mt-6 border-t">
                <div className="flex items-center mb-4">
                  <Shield className="h-5 w-5 mr-2 text-muted-foreground" />
                  <h3 className="text-lg font-medium">Area Amministrativa</h3>
                </div>
                <div className="space-y-4">
                  <p className="text-sm text-muted-foreground">
                    Accedi all'area di amministrazione beta per gestire gli inviti e monitorare i feedback degli utenti beta.
                  </p>
                  <div className="flex flex-col sm:flex-row gap-3">
                    <Button 
                      variant="default" 
                      className="flex items-center" 
                      onClick={handleDirectAdminAccess}
                    >
                      <Lock className="mr-2 h-4 w-4" />
                      Accedi alla Dashboard Beta Admin
                    </Button>
                    
                    <RestartAppButton 
                      variant="outline" 
                      className="border-dashed"
                    />
                  </div>
                  
                  {/* Notifiche Admin - Solo per amministratori */}
                  {user && user.type === 'admin' && (
                    <div className="mt-6">
                      <AdminNotifications />
                    </div>
                  )}
                </div>
              </div>
              


              <div className="pt-6 mt-6 border-t">
                <div className="flex items-center mb-4">
                  <RefreshCw className="h-5 w-5 mr-2 text-muted-foreground" />
                  <h3 className="text-lg font-medium">Gestione Sistema</h3>
                </div>
                <div className="space-y-4">
                  <p className="text-sm text-muted-foreground">
                    Da qui puoi gestire il sistema, riavviare l'applicazione o verificare lo stato di salute.
                  </p>
                  <div className="bg-muted/50 p-4 rounded-lg border border-dashed space-y-3">
                    <div className="flex flex-wrap gap-3 items-center">
                      <span className="text-sm font-medium">Stato server:</span>
                      <span className="bg-green-100 text-green-800 text-xs font-medium px-2.5 py-0.5 rounded-full flex items-center">
                        <span className="w-2 h-2 mr-1 bg-green-500 rounded-full"></span>
                        Online
                      </span>
                    </div>
                    
                    <div className="flex flex-wrap gap-3">
                      <RestartAppButton />
                    </div>
                  </div>
                </div>
              </div>
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

        <TabsContent value="staff">
          <div className="grid gap-6 md:grid-cols-2">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center">
                  <Users className="mr-2 h-5 w-5" />
                  Gestione Collaboratori
                </CardTitle>
                <CardDescription>
                  Gestisci i collaboratori dello studio e le loro specializzazioni
                </CardDescription>
              </CardHeader>
              <CardContent>
                <p className="text-sm text-muted-foreground mb-4">
                  Aggiungi e gestisci i collaboratori che lavorano nel tuo studio. 
                  Potrai assegnarli agli appuntamenti e personalizzare le comunicazioni.
                </p>
                <Button 
                  onClick={() => setLocation('/collaborators')}
                  className="w-full"
                >
                  <Users className="mr-2 h-4 w-4" />
                  Gestisci Collaboratori
                </Button>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="flex items-center">
                  <Building className="mr-2 h-5 w-5" />
                  Gestione Stanze/Cabine
                </CardTitle>
                <CardDescription>
                  Configura le stanze e cabine di trattamento del tuo studio
                </CardDescription>
              </CardHeader>
              <CardContent>
                <p className="text-sm text-muted-foreground mb-4">
                  Organizza le stanze del tuo studio con colori personalizzati per il calendario.
                  Assegna le stanze agli appuntamenti per una migliore organizzazione.
                </p>
                <Button 
                  onClick={() => setLocation('/treatment-rooms')}
                  className="w-full"
                  variant="outline"
                >
                  <Building className="mr-2 h-4 w-4" />
                  Gestisci Stanze
                </Button>
              </CardContent>
            </Card>
          </div>
        </TabsContent>
        

        <TabsContent value="integrations">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center">
                <Mail className="mr-2 h-5 w-5" />
                <span>{t('settings.integrations', 'Configurazione Email')}</span>
              </CardTitle>
              <CardDescription>
                {t('settings.integrationsDesc', 'Configura l\'invio delle email per le notifiche ai clienti')}
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-6">

                
                <EmailSettings />
              </div>
            </CardContent>
          </Card>
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
                <AppIconUploader onIconUpdated={() => {
                  toast({
                    title: "Icona Aggiornata",
                    description: "L'icona PWA è stata personalizzata con successo. I clienti vedranno il tuo logo quando installeranno l'app.",
                  });
                }} />
              </div>
              
              <div className="pt-4 border-t">
                <div className="flex items-center mb-4">
                  <Type className="h-5 w-5 mr-2 text-muted-foreground" />
                  <h3 className="text-lg font-medium">{t('settings.companyName', 'Nome Aziendale')}</h3>
                </div>
                <CompanyNameEditor />
              </div>

              <div className="pt-4 border-t">
                <CompanyBusinessDataEditor />
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {isAdmin && (
          <TabsContent value="admin">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center">
                  <Shield className="mr-2 h-5 w-5" />
                  Gestione Piani Abbonamento
                </CardTitle>
                <CardDescription>
                  Modifica prezzi e autorizzazioni dei pacchetti abbonamento (Trial, Base, Pro, Business)
                </CardDescription>
              </CardHeader>
              <CardContent>
                <SubscriptionPlansAdmin />
              </CardContent>
            </Card>
          </TabsContent>
        )}
      </Tabs>

      {/* Il dialog per la richiesta della password è stato rimosso - 
         l'accesso è ora diretto per gli utenti amministratori */}
    </div>
  );
}