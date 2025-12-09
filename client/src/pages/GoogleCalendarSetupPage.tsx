import React, { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from "@/components/ui/switch";
import { useToast } from "@/hooks/use-toast";
import { Link } from 'wouter';
import { 
  Calendar, 
  ArrowRight, 
  RefreshCw, 
  Check, 
  Mail,
  AlertCircle
} from "lucide-react";
import { useLicense } from '@/hooks/use-license';

export default function GoogleCalendarSetupPage() {
  const { t } = useTranslation();
  const { toast } = useToast();
  const { hasProAccess, isLoading } = useLicense();
  
  const [email, setEmail] = useState('');
  const [isAuthenticating, setIsAuthenticating] = useState(false);
  const [isGoogleAuthorized, setIsGoogleAuthorized] = useState(false);
  const [isSyncEnabled, setIsSyncEnabled] = useState(false);
  const [isSaving, setIsSaving] = useState(false);

  const startGoogleAuth = async () => {
    if (!email.trim()) {
      toast({
        title: t('googleCalendar.errors.emailRequired'),
        description: t('googleCalendar.errors.emailRequired'),
        variant: "destructive",
      });
      return;
    }

    setIsAuthenticating(true);
    
    try {
      const response = await fetch('/api/google-auth/start');
      if (response.ok) {
        const data = await response.json();
        if (data.authUrl) {
          const authWindow = window.open(data.authUrl, 'googleAuthWindow', 'width=800,height=600');
          
          if (!authWindow) {
            throw new Error(t('googleCalendar.errors.popupBlocked'));
          }
          
          // Verifica periodicamente il completamento
          const checkInterval = setInterval(async () => {
            try {
              const statusResponse = await fetch('/api/google-auth/status');
              if (statusResponse.ok) {
                const statusData = await statusResponse.json();
                if (statusData.authorized) {
                  clearInterval(checkInterval);
                  setIsGoogleAuthorized(true);
                  setIsSyncEnabled(true);
                  
                  if (authWindow && !authWindow.closed) {
                    authWindow.close();
                  }
                  
                  toast({
                    title: t('googleCalendar.success.connected') + " 🎉",
                    description: t('googleCalendar.success.connected'),
                  });
                }
              }
            } catch (error) {
              console.error('Error checking status:', error);
            }
          }, 2000);
          
          setTimeout(() => {
            clearInterval(checkInterval);
            setIsAuthenticating(false);
          }, 120000);
        }
      }
    } catch (error) {
      console.error('Google auth error:', error);
      toast({
        title: t('common.error'),
        description: error instanceof Error ? error.message : t('googleCalendar.errors.authError'),
        variant: "destructive",
      });
      setIsAuthenticating(false);
    }
  };

  const handleSyncToggle = (enabled: boolean) => {
    setIsSyncEnabled(enabled);
    if (enabled) {
      toast({
        title: t('googleCalendar.setup.syncEnabled'),
        description: t('googleCalendar.setup.syncEnabledDesc'),
      });
    } else {
      toast({
        title: t('googleCalendar.setup.syncDisabled'),
      });
    }
  };

  if (isLoading) {
    return (
      <div className="container py-12 flex items-center justify-center min-h-screen">
        <RefreshCw className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  if (!hasProAccess) {
    return (
      <div className="container py-12">
        <Card className="max-w-md w-full mx-auto">
          <CardHeader className="text-center">
            <div className="flex justify-center mb-4">
              <Calendar className="h-12 w-12 text-amber-500" />
            </div>
            <CardTitle>{t('googleCalendar.setup.proFeatureTitle')}</CardTitle>
            <CardDescription>
              {t('googleCalendar.setup.proFeatureDesc')}
            </CardDescription>
          </CardHeader>
          <CardContent>
            <p className="text-center text-sm text-muted-foreground mb-4">
              {t('googleCalendar.setup.proOnlyMessage')}
            </p>
          </CardContent>
          <div className="flex flex-col gap-2 px-6 pb-6">
            <Link to="/subscribe">
              <Button className="w-full">
                {t('googleCalendar.setup.upgradeToPro')}
              </Button>
            </Link>
            <Link to="/dashboard">
              <Button variant="outline" className="w-full">
                {t('googleCalendar.setup.backToDashboard')}
              </Button>
            </Link>
          </div>
        </Card>
      </div>
    );
  }

  return (
    <div className="container py-8 max-w-2xl">
      <div className="mb-6">
        <Link to="/pro-features" className="text-sm text-primary hover:underline flex items-center gap-1 mb-4">
          ← {t('googleCalendar.setup.backToProFeatures')}
        </Link>
      </div>

      <Card>
        <CardHeader className="bg-gradient-to-r from-primary/10 to-primary/5 border-b">
          <div className="flex items-start justify-between">
            <div>
              <CardTitle className="flex items-center text-2xl gap-2">
                <Calendar className="h-6 w-6 text-primary" />
                {t('googleCalendar.setup.syncTitle')}
              </CardTitle>
              <CardDescription className="mt-2">
                {t('googleCalendar.setup.syncDescription')}
              </CardDescription>
            </div>
            <div className="px-3 py-1 bg-primary text-primary-foreground rounded-full text-xs font-semibold">
              PRO
            </div>
          </div>
        </CardHeader>

        <CardContent className="pt-8">
          <div className="space-y-8">
            {/* Passaggi semplificati */}
            <div className="space-y-4">
              <h3 className="font-semibold text-lg">{t('googleCalendar.setup.howItWorks')}</h3>
              
              <div className="space-y-3">
                <div className="flex gap-4">
                  <div className="flex-shrink-0 w-8 h-8 rounded-full bg-primary/20 text-primary flex items-center justify-center font-semibold text-sm">1</div>
                  <div>
                    <p className="font-medium">{t('googleCalendar.setup.step1Title')}</p>
                    <p className="text-sm text-muted-foreground">{t('googleCalendar.setup.step1Desc')}</p>
                  </div>
                </div>

                <div className="flex gap-4">
                  <div className="flex-shrink-0 w-8 h-8 rounded-full bg-primary/20 text-primary flex items-center justify-center font-semibold text-sm">2</div>
                  <div>
                    <p className="font-medium">{t('googleCalendar.setup.step2Title')}</p>
                    <p className="text-sm text-muted-foreground">{t('googleCalendar.setup.step2Desc')}</p>
                  </div>
                </div>

                <div className="flex gap-4">
                  <div className="flex-shrink-0 w-8 h-8 rounded-full bg-primary/20 text-primary flex items-center justify-center font-semibold text-sm">3</div>
                  <div>
                    <p className="font-medium">{t('googleCalendar.setup.step3Title')}</p>
                    <p className="text-sm text-muted-foreground">{t('googleCalendar.setup.step3Desc')}</p>
                  </div>
                </div>
              </div>
            </div>

            {/* Divider */}
            <div className="border-t" />

            {/* Form */}
            <div className="space-y-6">
              <div className="space-y-2">
                <Label className="flex items-center gap-2">
                  <Mail className="h-4 w-4" />
                  {t('googleCalendar.setup.emailLabel')}
                </Label>
                <Input
                  type="email"
                  placeholder={t('googleCalendar.setup.emailPlaceholder')}
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  disabled={isAuthenticating}
                  className="text-base"
                />
                <p className="text-xs text-muted-foreground">
                  {t('googleCalendar.setup.emailHint')}
                </p>
              </div>

              {/* Bottone connessione */}
              {!isGoogleAuthorized ? (
                <Button
                  onClick={startGoogleAuth}
                  disabled={isAuthenticating || !email.trim()}
                  className="w-full h-11 text-base"
                  size="lg"
                >
                  {isAuthenticating ? (
                    <>
                      <RefreshCw className="h-4 w-4 mr-2 animate-spin" />
                      {t('googleCalendar.setup.connecting')}
                    </>
                  ) : (
                    <>
                      <Calendar className="h-4 w-4 mr-2" />
                      {t('googleCalendar.setup.connectButton')}
                      <ArrowRight className="h-4 w-4 ml-2" />
                    </>
                  )}
                </Button>
              ) : (
                <div className="bg-green-50 dark:bg-green-950 p-4 rounded-lg border border-green-200 dark:border-green-800 flex items-start gap-3">
                  <Check className="h-5 w-5 text-green-600 dark:text-green-400 mt-0.5 flex-shrink-0" />
                  <div>
                    <p className="font-medium text-green-900 dark:text-green-100">{t('googleCalendar.setup.connectedSuccess')}</p>
                    <p className="text-sm text-green-700 dark:text-green-300 mt-1">
                      {email} {t('googleCalendar.setup.connectedEmail').replace('{{email}}', '')}
                    </p>
                  </div>
                </div>
              )}

              {/* Toggle sincronizzazione */}
              {isGoogleAuthorized && (
                <div className="bg-blue-50 dark:bg-blue-950 border border-blue-200 dark:border-blue-800 rounded-lg p-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="font-medium text-blue-900 dark:text-blue-100">{t('googleCalendar.setup.enableSync')}</p>
                      <p className="text-sm text-blue-700 dark:text-blue-300 mt-1">
                        {t('googleCalendar.setup.syncToGoogle')}
                      </p>
                    </div>
                    <Switch
                      checked={isSyncEnabled}
                      onCheckedChange={handleSyncToggle}
                      disabled={isSaving}
                    />
                  </div>
                </div>
              )}
            </div>

            {/* Note sicurezza */}
            <div className="bg-slate-50 dark:bg-slate-900 p-4 rounded-lg border border-slate-200 dark:border-slate-800">
              <div className="flex gap-3">
                <AlertCircle className="h-5 w-5 text-slate-500 flex-shrink-0 mt-0.5" />
                <div className="text-sm text-slate-600 dark:text-slate-400">
                  <p className="font-medium mb-1">🔒 {t('googleCalendar.setup.privacyTitle')}</p>
                  <p>
                    {t('googleCalendar.setup.privacyDesc')}
                  </p>
                </div>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
