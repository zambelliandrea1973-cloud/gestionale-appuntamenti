import React from 'react';
import { useTranslation } from 'react-i18next';
import { Card, CardContent, CardHeader, CardTitle, CardDescription, CardFooter } from "@/components/ui/card";
import { Lock, Crown, CalendarPlus, FileSpreadsheet, Receipt, Package } from "lucide-react";
import GoogleCalendarSimpleSetup from '@/components/GoogleCalendarSimpleSetup';
import { Button } from '@/components/ui/button';
import { Link } from 'wouter';
import { useLicense } from '@/hooks/use-license';
import ProFeatureNavbar from '@/components/ProFeatureNavbar';

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
  
  // Utilizziamo l'hook useLicense per verificare se l'utente ha accesso PRO
  const hasPROAccess = !isLoading && hasProAccess;
  
  // Reindirizza direttamente alla pagina di abbonamento
  const handleUpgradeClick = () => {
    window.location.href = '/subscribe';
  };

  return (
    <div className="container py-6">
      <div className="flex items-center mb-6">
        <Crown className="h-6 w-6 mr-2 text-amber-500" />
        <h1 className="text-3xl font-bold tracking-tight">
          {t('pro.title', 'Funzionalità PRO')}
        </h1>
      </div>
      
      <div className="grid grid-cols-3 lg:grid-cols-5 gap-0 mb-8">
        <Link to="/pro-features" className="">
          <div 
            className="flex flex-col items-center justify-center py-2 px-2 sm:px-3 border-b-2 border-primary font-medium text-primary text-xs text-center"
          >
            <CalendarPlus className="h-4 w-4 mb-1" />
            <span className="line-clamp-1 sm:line-clamp-2 text-xs">{t('pro.googleCalendar', 'Google Calendar')}</span>
          </div>
        </Link>
        
        <Link to="/invoices" className="">
          <div 
            className="flex flex-col items-center justify-center py-2 px-2 sm:px-3 border-b border-input bg-background hover:text-primary hover:bg-accent text-muted-foreground text-xs text-center"
          >
            <Receipt className="h-4 w-4 mb-1" />
            <span className="line-clamp-1 sm:line-clamp-2 text-xs">{t('pro.invoices', 'Fatture')}</span>
          </div>
        </Link>
        
        <Link to="/packages" className="">
          <div 
            className="flex flex-col items-center justify-center py-2 px-2 sm:px-3 border-b border-input bg-background hover:text-primary hover:bg-accent text-muted-foreground text-xs text-center"
          >
            <Package className="h-4 w-4 mb-1" />
            <span className="line-clamp-1 sm:line-clamp-2 text-xs">{t('pro.packages', 'Pacchetti')}</span>
          </div>
        </Link>
        
        <Link to="/inventory" className="">
          <div 
            className="flex flex-col items-center justify-center py-2 px-2 sm:px-3 border-b border-input bg-background hover:text-primary hover:bg-accent text-muted-foreground text-xs text-center"
          >
            <Package className="h-4 w-4 mb-1" />
            <span className="line-clamp-1 sm:line-clamp-2 text-xs">{t('pro.inventory', 'Magazzino')}</span>
          </div>
        </Link>
        
        <Link to="/reports" className="">
          <div 
            className="flex flex-col items-center justify-center py-2 px-2 sm:px-3 border-b border-input bg-background hover:text-primary hover:bg-accent text-muted-foreground text-xs text-center"
          >
            <FileSpreadsheet className="h-4 w-4 mb-1" />
            <span className="line-clamp-1 sm:line-clamp-2 text-xs">{t('pro.reports', 'Report')}</span>
          </div>
        </Link>
      </div>
      
      {hasPROAccess ? (
        <div className="space-y-4">
          <Link to="/google-calendar">
            <Card className="hover:shadow-lg transition-shadow cursor-pointer border-primary/20">
              <CardHeader className="bg-gradient-to-r from-primary/10 to-primary/5 border-b">
                <div className="flex items-center justify-between">
                  <div>
                    <CardTitle className="flex items-center gap-2">
                      <CalendarPlus className="h-5 w-5 text-primary" />
                      Sincronizza Google Calendar
                    </CardTitle>
                    <CardDescription className="mt-1">
                      Gestisci la sincronizzazione dei tuoi appuntamenti con Google Calendar
                    </CardDescription>
                  </div>
                  <ArrowRight className="h-5 w-5 text-primary" />
                </div>
              </CardHeader>
              <CardContent className="pt-4">
                <p className="text-sm text-muted-foreground">
                  Clicca per configurare e gestire la sincronizzazione con Google Calendar
                </p>
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
              {t('proFeature.title', 'Funzionalità PRO')}
            </CardTitle>
            <CardDescription>
              {t('proFeature.subtitle', `"${t('pro.googleCalendarIntegration', 'Integrazione Google Calendar')}" è disponibile solo con l'abbonamento PRO`)}
            </CardDescription>
          </CardHeader>
          <CardContent>
            <p className="text-center mb-4 text-muted-foreground">
              {t('pro.googleCalendarLocked', 'L\'integrazione con Google Calendar è disponibile nella versione PRO. Aggiorna il tuo piano per accedere a questa funzionalità.')}
            </p>
            
            <div className="border rounded-lg p-4 mb-4 bg-slate-50">
              <div className="flex items-center mb-2">
                <Crown className="h-5 w-5 text-amber-500 mr-2" />
                <h3 className="font-medium">
                  {t('proFeature.benefits.title', 'Con PRO ottieni')}:
                </h3>
              </div>
              <ul className="space-y-2 pl-7 list-disc text-sm">
                <li>{t('proFeature.benefits.invoices', 'Gestione fatture completa')}</li>
                <li>{t('proFeature.benefits.reports', 'Report dettagliati sull\'attività')}</li>
                <li>{t('proFeature.benefits.googleCalendar', 'Integrazione con Google Calendar')}</li>
                <li>{t('proFeature.benefits.support', 'Supporto prioritario')}</li>
              </ul>
            </div>
          </CardContent>
          <CardFooter className="flex flex-col space-y-2">
            <Button 
              className="w-full" 
              onClick={handleUpgradeClick}
            >
              {t('proFeature.upgradeButton', 'Passa a PRO')}
            </Button>
            <Link to="/">
              <Button
                variant="outline"
                className="w-full"
              >
                {t('common.backToHome', 'Torna alla Home')}
              </Button>
            </Link>
          </CardFooter>
        </Card>
      )}
    </div>
  );
}