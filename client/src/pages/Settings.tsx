import React, { useState, useEffect } from 'react';
import { useLocation } from 'wouter';
import { useTranslation } from 'react-i18next';
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
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
import { queryClient } from "@/lib/queryClient";
import { ArrowLeft, Settings as SettingsIcon, Image, Brush, Contact, Lock, Shield, Eye, EyeOff, RefreshCw, Mail, Calendar, Users, Building, BookOpen, KeyRound, Clock, CreditCard, Sparkles, Hash, Store } from "lucide-react";
import AppIconUploader from '@/components/AppIconUploader';
import ContactInfoEditor from '@/components/ContactInfoEditor';
import CompanyNameEditor from '@/components/CompanyNameEditor';
import CompanyBusinessDataEditor from '@/components/CompanyBusinessDataEditor';
import SimpleServiceManager from '@/components/SimpleServiceManager';
import EmailSettings from '@/components/EmailSettings';
import AdminNotifications from '@/components/AdminNotifications';
import SubscriptionPlansAdmin from '@/components/SubscriptionPlansAdmin';
import CurrencySelector from '@/components/CurrencySelector';
import WorkingHoursEditor from '@/components/WorkingHoursEditor';
import SubscriptionPlansPanel from '@/components/SubscriptionPlansPanel';
import PosSettingsPanel from '@/components/pos/PosSettingsPanel';

import { RestartAppButton } from '@/components/RestartAppButton';
import SetupServiceBanner from '@/components/SetupServiceBanner';

const VALID_TABS = ['app', 'contacts', 'staff', 'integrations', 'pos', 'appearance', 'security', 'subscription', 'admin'] as const;

function resolveTabFromUrl(): string | null {
  const params = new URLSearchParams(window.location.search);
  const queryTab = params.get('tab');
  if (queryTab && (VALID_TABS as readonly string[]).includes(queryTab)) return queryTab;
  return null;
}

export default function Settings() {
  const [location, setLocation] = useLocation();
  const { t } = useTranslation();
  const { toast } = useToast();
  const { user } = useUserWithLicense(); // Ottiene i dati dell'utente corrente incluso il tipo
  const [showPassword, setShowPassword] = useState(false);
  const [activeTab, setActiveTab] = useState("app");
  const [assignmentCode, setAssignmentCode] = useState('');
  const [savingCode, setSavingCode] = useState(false);
  const [showCodeChangeDialog, setShowCodeChangeDialog] = useState(false);
  const [originalAssignmentCode, setOriginalAssignmentCode] = useState('');
  // Se l'utente è arrivato qui dal wizard AI con ?returnTo=/onboarding,
  // mostriamo un banner che lo guida al ritorno automatico dopo il salvataggio.
  const [returnTo, setReturnTo] = useState<string | null>(null);
  useEffect(() => {
    try {
      const params = new URLSearchParams(window.location.search);
      const r = params.get('returnTo');
      if (r && r.startsWith('/') && !r.startsWith('//')) setReturnTo(r);
    } catch {
      // ignore
    }
  }, []);
  
  // Recupera la tab selezionata dal parametro URL ?tab= al montaggio del componente
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const section = params.get('section');
    if (section === 'services') {
      setActiveTab('app');
      setTimeout(() => {
        const el = document.getElementById('service-manager-section');
        if (el) el.scrollIntoView({ behavior: 'smooth', block: 'start' });
      }, 300);
      return;
    }
    const urlTab = resolveTabFromUrl();
    setActiveTab(urlTab ?? 'app');
  }, []);

  // Reagisce ai cambi di URL (navigazione via Link sullo stesso percorso)
  useEffect(() => {
    setActiveTab(resolveTabFromUrl() ?? 'app');
  }, [location]);

  // Carica il codice identificativo dall'utente corrente
  useEffect(() => {
    if (user && (user.type === 'staff' || user.type === 'admin') && user.assignmentCode) {
      setAssignmentCode(user.assignmentCode);
      setOriginalAssignmentCode(user.assignmentCode);
    }
  }, [user]);

  const performSaveAssignmentCode = async () => {
    const code = assignmentCode.trim();
    setSavingCode(true);
    try {
      const response = await fetch('/api/user/assignment-code', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ assignmentCode: code }),
      });
      if (response.ok) {
        const data = await response.json();
        setAssignmentCode(data.assignmentCode);
        setOriginalAssignmentCode(data.assignmentCode);
        queryClient.invalidateQueries({ queryKey: ['/api/user-with-license'] });
        toast({
          title: t('userSettings.toast.assignmentCodeSavedTitle'),
          description: t('userSettings.toast.assignmentCodeSavedDesc'),
        });
      } else {
        const isDuplicate = response.status === 409;
        toast({
          title: t('common.error'),
          description: isDuplicate
            ? t('userSettings.toast.assignmentCodeDuplicate')
            : t('userSettings.toast.assignmentCodeErrorDesc'),
          variant: 'destructive',
        });
      }
    } catch (error) {
      console.error('Failed to save assignment code:', error);
      toast({
        title: t('common.error'),
        description: t('userSettings.toast.assignmentCodeErrorDesc'),
        variant: 'destructive',
      });
    } finally {
      setSavingCode(false);
    }
  };

  const saveAssignmentCode = async () => {
    const code = assignmentCode.trim();
    if (!code || !/^[a-zA-Z0-9]{4,10}$/.test(code)) {
      toast({
        title: t('common.error'),
        description: t('userSettings.toast.assignmentCodeInvalid'),
        variant: 'destructive',
      });
      return;
    }
    if (originalAssignmentCode && originalAssignmentCode !== code) {
      setShowCodeChangeDialog(true);
      return;
    }
    await performSaveAssignmentCode();
  };

  // Verifico se l'utente è un amministratore
  const isAdmin = user?.type === 'admin';
  
  // Funzione per accedere direttamente alla dashboard beta admin
  const handleDirectAdminAccess = () => {
    if (isAdmin) {
      // Reindirizza direttamente alla dashboard beta admin
      setLocation("/beta-admin");
    } else {
      toast({
        title: t('settingsPage.accessDenied'),
        description: t('settingsPage.adminOnlyAccess'),
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
          <h1 className="text-3xl font-bold tracking-tight">{t('settings.title', 'Settings')}</h1>
        </div>
        <p className="text-muted-foreground">
          {t('settings.description', 'Customize the application and configure preferences')}
        </p>
      </header>

      <div className="mb-6">
        <SetupServiceBanner />
      </div>

      {returnTo && (
        <Card className="mb-6 border-primary/40 bg-primary/5">
          <CardContent className="p-4 flex flex-col sm:flex-row sm:items-center gap-3">
            <Sparkles className="h-5 w-5 text-primary shrink-0" />
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium">
                {t('settings.returnToTourBanner.title')}
              </p>
              <p className="text-xs text-muted-foreground">
                {t('settings.returnToTourBanner.description')}
              </p>
            </div>
            <Button
              variant="outline"
              size="sm"
              onClick={() => setLocation(returnTo)}
              data-testid="button-return-to-tour"
            >
              {t('settings.returnToTourBanner.button')}
            </Button>
          </CardContent>
        </Card>
      )}

      <Tabs value={activeTab} className="w-full" onValueChange={(value) => {
        setActiveTab(value);
        const url = new URL(window.location.href);
        url.searchParams.set('tab', value);
        window.history.replaceState(null, '', url.toString());
      }}>
        <TabsList className="mb-6 h-auto flex-wrap justify-start">
          <TabsTrigger value="app" className="flex items-center whitespace-nowrap">
            <SettingsIcon className="mr-2 h-4 w-4" />
            <span>{t('settings.general', 'General')}</span>
          </TabsTrigger>
          <TabsTrigger value="contacts" className="flex items-center whitespace-nowrap">
            <Contact className="mr-2 h-4 w-4" />
            <span>{t('settings.contacts', 'Contacts & Hours')}</span>
          </TabsTrigger>
          <TabsTrigger value="staff" className="flex items-center whitespace-nowrap">
            <Users className="mr-2 h-4 w-4" />
            <span>{t('settingsPage.staffAndRooms')}</span>
          </TabsTrigger>
          <TabsTrigger value="integrations" className="flex items-center whitespace-nowrap">
            <Mail className="mr-2 h-4 w-4" />
            <span>{t('settings.integrations', 'Email')}</span>
          </TabsTrigger>
          <TabsTrigger value="pos" className="flex items-center whitespace-nowrap">
            <Store className="mr-2 h-4 w-4" />
            <span>{t('settings.pos', 'POS / Carta')}</span>
          </TabsTrigger>
          <TabsTrigger value="appearance" className="flex items-center whitespace-nowrap">
            <Brush className="mr-2 h-4 w-4" />
            <span>{t('settings.appearance', 'Aspetto')}</span>
          </TabsTrigger>
          <TabsTrigger value="security" className="flex items-center whitespace-nowrap">
            <KeyRound className="mr-2 h-4 w-4" />
            <span>{t('settingsPage.security')}</span>
          </TabsTrigger>
          <TabsTrigger value="subscription" className="flex items-center whitespace-nowrap">
            <CreditCard className="mr-2 h-4 w-4" />
            <span>{t('settingsPage.subscriptionTab', 'Abbonamento')}</span>
          </TabsTrigger>
          {isAdmin && (
            <TabsTrigger value="admin" className="flex items-center whitespace-nowrap">
              <Shield className="mr-2 h-4 w-4" />
              <span>{t('settingsPage.admin')}</span>
            </TabsTrigger>
          )}
        </TabsList>

        <TabsContent value="app">
          <Card>
            <CardHeader>
              <CardTitle>{t('settings.generalTitle', 'General Settings')}</CardTitle>
              <CardDescription>
                {t('settings.generalDesc', 'Configure the general settings of the application')}
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-8">
              <div id="service-manager-section">
                <SimpleServiceManager />
              </div>
              
              <div className="pt-6 mt-6 border-t">
                <CurrencySelector />
              </div>

              <div className="pt-6 mt-6 border-t">
                <div className="flex items-center mb-4">
                  <CreditCard className="h-5 w-5 mr-2 text-muted-foreground" />
                  <h3 className="text-lg font-medium">{t('settingsPage.subscriptionHeading')}</h3>
                </div>
                <p className="text-sm text-muted-foreground mb-4">
                  {t('settingsPage.subscriptionDescription')}
                </p>
                <Button variant="default" className="flex items-center" asChild>
                  <a href="/settings?tab=subscription">
                    <CreditCard className="mr-2 h-4 w-4" />
                    {t('settingsPage.subscriptionTab', 'Abbonamento')}
                  </a>
                </Button>
              </div>
              
              {isAdmin && (
              <>
              <div className="pt-6 mt-6 border-t">
                <div className="flex items-center mb-4">
                  <Shield className="h-5 w-5 mr-2 text-muted-foreground" />
                  <h3 className="text-lg font-medium">{t('settingsPage.administrativeArea')}</h3>
                </div>
                <div className="space-y-4">
                  <p className="text-sm text-muted-foreground">
                    {t('settingsPage.adminAreaDescription')}
                  </p>
                  <div className="flex flex-col sm:flex-row gap-3">
                    <Button 
                      variant="default" 
                      className="flex items-center" 
                      onClick={handleDirectAdminAccess}
                    >
                      <Lock className="mr-2 h-4 w-4" />
                      {t('settingsPage.accessBetaAdminDashboard')}
                    </Button>
                    
                    <RestartAppButton 
                      variant="outline" 
                      className="border-dashed"
                    />
                  </div>
                  
                  <div className="mt-6">
                    <AdminNotifications />
                  </div>
                </div>
              </div>

              <div className="pt-6 mt-6 border-t">
                <div className="flex items-center mb-4">
                  <RefreshCw className="h-5 w-5 mr-2 text-muted-foreground" />
                  <h3 className="text-lg font-medium">{t('settingsPage.systemManagement')}</h3>
                </div>
                <div className="space-y-4">
                  <p className="text-sm text-muted-foreground">
                    {t('settingsPage.systemManagementDescription')}
                  </p>
                  <div className="bg-muted/50 p-4 rounded-lg border border-dashed space-y-3">
                    <div className="flex flex-wrap gap-3 items-center">
                      <span className="text-sm font-medium">{t('settingsPage.serverStatus')}</span>
                      <span className="bg-green-100 text-green-800 text-xs font-medium px-2.5 py-0.5 rounded-full flex items-center">
                        <span className="w-2 h-2 mr-1 bg-green-500 rounded-full"></span>
                        {t('settingsPage.online')}
                      </span>
                    </div>
                    
                    <div className="flex flex-wrap gap-3">
                      <RestartAppButton />
                    </div>
                  </div>
                </div>
              </div>
              </>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="contacts">
          <div className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center">
                  <Contact className="mr-2 h-5 w-5" />
                  {t('settings.contactsTitle', 'Contact Information')}
                </CardTitle>
                <CardDescription>
                  {t('settings.contactsDesc', 'Manage the contact information shown in the footer of the client app')}
                </CardDescription>
              </CardHeader>
              <CardContent>
                <ContactInfoEditor />
              </CardContent>
            </Card>

            <WorkingHoursEditor />
          </div>
        </TabsContent>

        <TabsContent value="staff">
          <div className="grid gap-6 md:grid-cols-2">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center">
                  <Users className="mr-2 h-5 w-5" />
                  {t('settingsPage.collaboratorsManagement')}
                </CardTitle>
                <CardDescription>
                  {t('settingsPage.collaboratorsManagementDesc')}
                </CardDescription>
              </CardHeader>
              <CardContent>
                <p className="text-sm text-muted-foreground mb-4">
                  {t('settingsPage.collaboratorsDescription')}
                </p>
                <Button 
                  onClick={() => setLocation('/collaborators')}
                  className="w-full"
                >
                  <Users className="mr-2 h-4 w-4" />
                  {t('settingsPage.manageCollaborators')}
                </Button>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="flex items-center">
                  <Building className="mr-2 h-5 w-5" />
                  {t('settingsPage.roomsManagement')}
                </CardTitle>
                <CardDescription>
                  {t('settingsPage.roomsManagementDesc')}
                </CardDescription>
              </CardHeader>
              <CardContent>
                <p className="text-sm text-muted-foreground mb-4">
                  {t('settingsPage.roomsDescription')}
                </p>
                <Button 
                  onClick={() => setLocation('/treatment-rooms')}
                  className="w-full"
                  variant="outline"
                >
                  <Building className="mr-2 h-4 w-4" />
                  {t('settingsPage.manageRooms')}
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
                <span>{t('settings.integrations', 'Email Configuration')}</span>
              </CardTitle>
              <CardDescription>
                {t('settings.integrationsDesc', 'Configure email sending for client notifications')}
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-6">

                
                <EmailSettings />
              </div>
            </CardContent>
          </Card>
        </TabsContent>
        
        <TabsContent value="pos">
          <PosSettingsPanel />
        </TabsContent>

        <TabsContent value="appearance">
          <div className="space-y-6">
            {(user?.type === 'staff' || user?.type === 'admin') && (
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center">
                    <Hash className="mr-2 h-5 w-5" />
                    {t('userSettings.branding.assignmentCodeLabel')}
                  </CardTitle>
                  <CardDescription>
                    {t('userSettings.branding.assignmentCodeDesc')}
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="flex gap-3 items-end">
                    <div className="flex-1 space-y-2">
                      <Label htmlFor="assignmentCode">{t('userSettings.branding.assignmentCodeLabel')}</Label>
                      <Input
                        id="assignmentCode"
                        value={assignmentCode}
                        onChange={(e) => setAssignmentCode(e.target.value.toUpperCase())}
                        placeholder={t('userSettings.branding.assignmentCodePlaceholder')}
                        maxLength={10}
                        className="font-mono text-base uppercase"
                      />
                    </div>
                    <Button
                      onClick={saveAssignmentCode}
                      disabled={savingCode}
                    >
                      {savingCode
                        ? t('userSettings.branding.assignmentCodeSaving')
                        : t('userSettings.branding.assignmentCodeSave')}
                    </Button>
                  </div>
                </CardContent>
              </Card>
            )}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center">
                  <Brush className="mr-2 h-5 w-5" />
                  {t('settings.appearanceTitle', 'Business Identity')}
                </CardTitle>
                <CardDescription>
                  {t('settings.appearanceDesc', 'Customize the application icon to reflect your company identity. This setting will apply to both the main app and the client app.')}
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-6">
                <AppIconUploader onSuccess={() => {
                  toast({
                    title: t('settingsPage.iconUpdated'),
                    description: t('settingsPage.iconUpdatedDescription'),
                  });
                }} />
                
                <CompanyNameEditor />

                <CompanyBusinessDataEditor />
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        <TabsContent value="subscription">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center">
                <CreditCard className="mr-2 h-5 w-5" />
                {t('settingsPage.subscriptionHeading')}
              </CardTitle>
              <CardDescription>
                {t('settingsPage.subscriptionDescription')}
              </CardDescription>
            </CardHeader>
            <CardContent>
              <SubscriptionPlansPanel />
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="security">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center">
                <KeyRound className="mr-2 h-5 w-5" />
                {t('settingsPage.accountSecurityTitle')}
              </CardTitle>
              <CardDescription>
                {t('settingsPage.accountSecurityDescription')}
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="p-4 bg-blue-50 border border-blue-200 rounded-lg">
                <div className="flex items-center mb-3">
                  <Lock className="mr-2 h-5 w-5 text-blue-600" />
                  <h3 className="font-semibold text-blue-900">{t('settingsPage.changePasswordHeading')}</h3>
                </div>
                <p className="text-sm text-blue-800 mb-4">
                  {t('settingsPage.changePasswordDescription')}
                </p>
                <Button 
                  onClick={() => setLocation("/password-change")}
                  className="bg-blue-600 hover:bg-blue-700"
                >
                  <KeyRound className="mr-2 h-4 w-4" />
                  {t('settingsPage.goToPasswordChange')}
                </Button>
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
                  {t('settingsPage.subscriptionPlansHeading')}
                </CardTitle>
                <CardDescription>
                  {t('settingsPage.subscriptionPlansDescription')}
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

      <Dialog open={showCodeChangeDialog} onOpenChange={setShowCodeChangeDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{t('userSettings.branding.assignmentCodeChangeWarningTitle')}</DialogTitle>
            <DialogDescription>
              {t('userSettings.branding.assignmentCodeChangeWarningDesc')}
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowCodeChangeDialog(false)}>
              {t('userSettings.branding.assignmentCodeChangeCancel')}
            </Button>
            <Button
              onClick={async () => {
                setShowCodeChangeDialog(false);
                await performSaveAssignmentCode();
              }}
            >
              {t('userSettings.branding.assignmentCodeChangeConfirm')}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}