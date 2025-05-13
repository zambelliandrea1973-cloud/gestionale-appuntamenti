import React, { useState } from 'react';
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
import { ArrowLeft, Settings as SettingsIcon, Image, Brush, Contact, Type, Lock, Shield, Eye, EyeOff, RefreshCw, Mail, Calendar } from "lucide-react";
import AppIconUploader from '@/components/AppIconUploader';
import ContactInfoEditor from '@/components/ContactInfoEditor';
import CompanyNameEditor from '@/components/CompanyNameEditor';
import ServiceManager from '@/components/ServiceManager';
import EmailSettings from '@/components/EmailSettings';
import { RestartAppButton } from '@/components/RestartAppButton';

export default function Settings() {
  const [, setLocation] = useLocation();
  const { t } = useTranslation();
  const { toast } = useToast();
  const [isAdminDialogOpen, setIsAdminDialogOpen] = useState(false);
  const [adminPassword, setAdminPassword] = useState('');
  const [isPasswordSubmitting, setIsPasswordSubmitting] = useState(false);
  const [showPassword, setShowPassword] = useState(false);

  const handleAdminAccess = () => {
    setIsPasswordSubmitting(true);
    
    // Controlla la password (quella corretta è "gironico")
    if (adminPassword === "gironico") {
      setIsPasswordSubmitting(false);
      setIsAdminDialogOpen(false);
      
      // Salva la password in localStorage per consentire accesso successivo
      localStorage.setItem('betaAdminPassword', adminPassword);
      localStorage.setItem('betaAdminAuthenticated', 'true');
      sessionStorage.setItem('betaAdminAuthenticated', 'true');
      
      console.log('Password salvata in localStorage e sessionStorage');
      
      // Reindirizza alla dashboard beta admin
      setLocation("/beta-admin");
    } else {
      setIsPasswordSubmitting(false);
      toast({
        title: "Errore di autenticazione",
        description: "Password non valida. Riprova.",
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
            <Mail className="mr-2 h-4 w-4" />
            <span>{t('settings.integrations', 'Email')}</span>
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
            <CardContent className="space-y-8">
              <ServiceManager />
              
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
                      onClick={() => setIsAdminDialogOpen(true)}
                    >
                      <Lock className="mr-2 h-4 w-4" />
                      Accedi alla Dashboard Beta Admin
                    </Button>
                    
                    <RestartAppButton 
                      variant="outline" 
                      className="border-dashed"
                    />
                  </div>
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
                <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mb-6">
                  <div className="flex items-start">
                    <div className="flex-shrink-0 h-10 w-10 flex items-center justify-center bg-blue-500 text-white rounded-full mr-4">
                      <Calendar className="h-5 w-5" />
                    </div>
                    <div>
                      <h3 className="text-base font-medium text-blue-700 mb-1">Integrazione con Google Calendar spostata</h3>
                      <p className="text-sm text-blue-900 mb-3">
                        L'integrazione con Google Calendar è stata spostata esclusivamente nella sezione PRO per migliorare l'organizzazione delle funzionalità. Accedi alla sezione PRO per configurare e gestire la sincronizzazione del calendario.
                      </p>
                      <Button 
                        onClick={() => setLocation("/pro")}
                        className="bg-blue-500 hover:bg-blue-600 text-white"
                      >
                        Vai alla sezione PRO
                      </Button>
                    </div>
                  </div>
                </div>
                
                <EmailAndCalendarSettings />
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

      {/* Dialog per la richiesta della password */}
      <Dialog open={isAdminDialogOpen} onOpenChange={setIsAdminDialogOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Accesso Area Amministrativa</DialogTitle>
            <DialogDescription>
              Inserisci la password per accedere all'area amministrativa beta
            </DialogDescription>
          </DialogHeader>
          <div className="py-4">
            <div className="relative">
              <Input
                type={showPassword ? "text" : "password"}
                placeholder="Password"
                value={adminPassword}
                onChange={(e) => setAdminPassword(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') {
                    handleAdminAccess();
                  }
                }}
              />
              <button
                type="button"
                className="absolute inset-y-0 right-0 pr-3 flex items-center text-sm leading-5"
                onClick={() => setShowPassword(!showPassword)}
              >
                {showPassword ? (
                  <EyeOff className="h-5 w-5 text-gray-500" />
                ) : (
                  <Eye className="h-5 w-5 text-gray-500" />
                )}
              </button>
            </div>
          </div>
          <DialogFooter>
            <Button 
              variant="secondary" 
              onClick={() => {
                setIsAdminDialogOpen(false);
                setAdminPassword('');
              }}
            >
              Annulla
            </Button>
            <Button 
              onClick={handleAdminAccess} 
              disabled={isPasswordSubmitting}
              className="flex items-center"
            >
              {isPasswordSubmitting ? (
                <>
                  <div className="h-4 w-4 mr-2 animate-spin rounded-full border-2 border-primary border-t-transparent"></div>
                  Verifica...
                </>
              ) : (
                <>
                  <Lock className="mr-2 h-4 w-4" />
                  Accedi
                </>
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}