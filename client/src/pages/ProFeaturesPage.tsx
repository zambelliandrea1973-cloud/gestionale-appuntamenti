import React, { useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { Card, CardContent, CardHeader, CardTitle, CardDescription, CardFooter } from "@/components/ui/card";
import { Lock, Crown, CalendarPlus, FileSpreadsheet, Receipt, Package, ArrowRight, CheckCircle2, Loader2 } from "lucide-react";
import GoogleCalendarSimpleSetup from '@/components/GoogleCalendarSimpleSetup';
import { Button } from '@/components/ui/button';
import { Link } from 'wouter';
import { useLicense } from '@/hooks/use-license';
import ProFeatureNavbar from '@/components/ProFeatureNavbar';
import { useQuery, useQueryClient } from '@tanstack/react-query';

/**
 * Pagina delle funzionalità PRO
 * Comprende: 
 * - Google Calendar
 * - Fatture (linking alla pagina esistente)
 * - Report (linking alla pagina esistente)
 */
export default function ProFeaturesPage() {
  const { t } = useTranslation();
  const { hasProAccess, isLoading } = useLicense();
  const queryClient = useQueryClient();
  
  // Utilizziamo l'hook useLicense per verificare se l'utente ha accesso PRO
  const hasPROAccess = !isLoading && hasProAccess;
  
  // Query per verificare lo stato della connessione Google Calendar
  const { data: googleAuthStatus, isLoading: isLoadingGoogleStatus } = useQuery<{
    authorized: boolean;
    email?: string;
    calendarEnabled?: boolean;
    disabledByUser?: boolean;
  }>({
    queryKey: ['/api/google-auth/status'],
    enabled: hasPROAccess,
    staleTime: 30000
  });
  
  // Auto-restore silenzioso: se il professionista non ha disconnesso volontariamente,
  // riabilita in automatico la connessione Google Calendar senza alcuna azione utente
  useEffect(() => {
    if (!hasPROAccess || isLoadingGoogleStatus) return;
    if (googleAuthStatus?.authorized) return; // già connesso
    if (googleAuthStatus?.disabledByUser) return; // scelta volontaria, rispettiamo
    
    // Disconnesso per bug/aggiornamento → ripristino silenzioso
    fetch('/api/google-auth/auto-restore', { method: 'POST', credentials: 'include' })
      .then(r => r.ok ? r.json() : null)
      .then(rd => {
        if (rd?.success && rd?.method === 'silent') {
          // Token ancora nel DB → riabilita e aggiorna la card
          queryClient.invalidateQueries({ queryKey: ['/api/google-auth/status'] });
        }
        // needs_oauth: nessun redirect automatico — l'utente clicca sulla card
        // per andare a /google-calendar e riconnettere manualmente
      })
      .catch(() => { /* silent */ });
  }, [hasPROAccess, isLoadingGoogleStatus, googleAuthStatus]);
  
  // Connesso = token presente nel DB (authorized=true), indipendentemente da calendarEnabled
  const isGoogleConnected = googleAuthStatus?.authorized === true;
  
  // Reindirizza direttamente alla pagina di abbonamento
  const handleUpgradeClick = () => {
    window.location.href = '/subscribe';
  };

  return (
    <div className="container py-6">
      <div className="flex items-center mb-6">
        <Crown className="h-6 w-6 mr-2 text-amber-500" />
        <h1 className="text-3xl font-bold tracking-tight">
          {t('pro.title')}
        </h1>
      </div>
      
      <div className="grid grid-cols-3 lg:grid-cols-5 gap-0 mb-8">
        <Link to="/pro-features" className="">
          <div 
            className="flex flex-col items-center justify-center py-2 px-2 sm:px-3 border-b-2 border-primary font-medium text-primary text-xs text-center"
          >
            <CalendarPlus className="h-4 w-4 mb-1" />
            <span className="line-clamp-1 sm:line-clamp-2 text-xs">{t('pro.googleCalendar')}</span>
          </div>
        </Link>
        
        <Link to="/invoices" className="">
          <div 
            className="flex flex-col items-center justify-center py-2 px-2 sm:px-3 border-b border-input bg-background hover:text-primary hover:bg-accent text-muted-foreground text-xs text-center"
          >
            <Receipt className="h-4 w-4 mb-1" />
            <span className="line-clamp-1 sm:line-clamp-2 text-xs">{t('pro.invoices')}</span>
          </div>
        </Link>
        
        <Link to="/packages" className="">
          <div 
            className="flex flex-col items-center justify-center py-2 px-2 sm:px-3 border-b border-input bg-background hover:text-primary hover:bg-accent text-muted-foreground text-xs text-center"
          >
            <Package className="h-4 w-4 mb-1" />
            <span className="line-clamp-1 sm:line-clamp-2 text-xs">{t('pro.packages')}</span>
          </div>
        </Link>
        
        <Link to="/inventory" className="">
          <div 
            className="flex flex-col items-center justify-center py-2 px-2 sm:px-3 border-b border-input bg-background hover:text-primary hover:bg-accent text-muted-foreground text-xs text-center"
          >
            <Package className="h-4 w-4 mb-1" />
            <span className="line-clamp-1 sm:line-clamp-2 text-xs">{t('pro.inventory')}</span>
          </div>
        </Link>
        
        <Link to="/reports" className="">
          <div 
            className="flex flex-col items-center justify-center py-2 px-2 sm:px-3 border-b border-input bg-background hover:text-primary hover:bg-accent text-muted-foreground text-xs text-center"
          >
            <FileSpreadsheet className="h-4 w-4 mb-1" />
            <span className="line-clamp-1 sm:line-clamp-2 text-xs">{t('pro.reports')}</span>
          </div>
        </Link>
      </div>
      
      {hasPROAccess ? (
        <div className="space-y-4">
          <Link to="/google-calendar">
            <Card className={`hover:shadow-lg transition-shadow cursor-pointer ${isGoogleConnected ? 'border-green-500/50 bg-green-50/30' : 'border-primary/20'}`}>
              <CardHeader className={`border-b ${isGoogleConnected ? 'bg-gradient-to-r from-green-500/10 to-green-500/5' : 'bg-gradient-to-r from-primary/10 to-primary/5'}`}>
                <div className="flex items-center justify-between">
                  <div>
                    <CardTitle className="flex items-center gap-2">
                      {isGoogleConnected ? (
                        <CheckCircle2 className="h-5 w-5 text-green-600" />
                      ) : (
                        <CalendarPlus className="h-5 w-5 text-primary" />
                      )}
                      {t('pro.syncGoogleCalendar')}
                    </CardTitle>
                    <CardDescription className="mt-1">
                      {t('pro.syncDescription')}
                    </CardDescription>
                  </div>
                  <ArrowRight className="h-5 w-5 text-primary" />
                </div>
              </CardHeader>
              <CardContent className="pt-4">
                {isLoadingGoogleStatus ? (
                  <div className="flex items-center gap-2 text-sm text-muted-foreground">
                    <Loader2 className="h-4 w-4 animate-spin" />
                    {t('common.loading')}
                  </div>
                ) : isGoogleConnected ? (
                  <div className="flex items-center gap-2">
                    <CheckCircle2 className="h-4 w-4 text-green-600" />
                    <span className="text-sm text-green-700 font-medium">
                      {t('pro.googleConnected')}
                    </span>
                    {googleAuthStatus?.email && (
                      <span className="text-sm text-muted-foreground">
                        ({googleAuthStatus.email})
                      </span>
                    )}
                  </div>
                ) : (
                  <p className="text-sm text-muted-foreground">
                    {t('pro.clickToConfigure')}
                  </p>
                )}
              </CardContent>
            </Card>
          </Link>
        </div>
      ) : (
        <Card className="max-w-md w-full mx-auto">
          <CardHeader className="text-center">
            <div className="flex justify-center mb-4">
              <div className="rounded-full bg-amber-100 p-3">
                <Lock className="h-8 w-8 text-amber-600" />
              </div>
            </div>
            <CardTitle className="text-2xl">
              {t('proFeature.title')}
            </CardTitle>
            <CardDescription>
              "{t('pro.googleCalendarIntegration')}" {t('proFeature.subtitle')}
            </CardDescription>
          </CardHeader>
          <CardContent>
            <p className="text-center mb-4 text-muted-foreground">
              {t('pro.googleCalendarLocked')}
            </p>
            
            <div className="border rounded-lg p-4 mb-4 bg-slate-50">
              <div className="flex items-center mb-2">
                <Crown className="h-5 w-5 text-amber-500 mr-2" />
                <h3 className="font-medium">
                  {t('proFeature.benefits.title')}:
                </h3>
              </div>
              <ul className="space-y-2 pl-7 list-disc text-sm">
                <li>{t('proFeature.benefits.invoices')}</li>
                <li>{t('proFeature.benefits.reports')}</li>
                <li>{t('proFeature.benefits.googleCalendar')}</li>
                <li>{t('proFeature.benefits.support')}</li>
              </ul>
            </div>
          </CardContent>
          <CardFooter className="flex flex-col space-y-2">
            <Button 
              className="w-full" 
              onClick={handleUpgradeClick}
            >
              {t('proFeature.upgradeButton')}
            </Button>
            <Link to="/">
              <Button
                variant="outline"
                className="w-full"
              >
                {t('common.backToHome')}
              </Button>
            </Link>
          </CardFooter>
        </Card>
      )}
    </div>
  );
}