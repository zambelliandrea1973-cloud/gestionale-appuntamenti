import React, { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import {
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from "@/components/ui/tabs";
import { Card, CardContent, CardHeader, CardTitle, CardDescription, CardFooter } from "@/components/ui/card";
import {
  CalendarPlus,
  FileSpreadsheet,
  Receipt,
  Crown,
  Star,
  Lock
} from "lucide-react";
import GoogleCalendarSimpleSetup from '@/components/GoogleCalendarSimpleSetup';
import { Button } from '@/components/ui/button';
import { Link, useLocation } from 'wouter';
import { useLicense } from '@/hooks/use-license';

/**
 * Pagina delle funzionalità PRO
 * Comprende: 
 * - Google Calendar
 * - Fatture (linking alla pagina esistente)
 * - Report (linking alla pagina esistente)
 */
export default function ProFeaturesPage() {
  const { t } = useTranslation();
  const [, setLocation] = useLocation();
  const [activeTab, setActiveTab] = useState("google-calendar");
  const { hasProAccess, isLoading, licenseInfo } = useLicense();
  
  // Utilizziamo l'hook useLicense per verificare se l'utente ha accesso PRO
  const hasPROAccess = !isLoading && hasProAccess;
  
  // Reindirizza direttamente alla pagina di abbonamento
  const handleUpgradeClick = () => {
    window.location.href = '/subscribe';
  };
  
  // Effetto per il reindirizzamento diretto quando si seleziona una tab
  useEffect(() => {
    if (activeTab === "invoices") {
      setLocation("/invoices");
    } else if (activeTab === "reports") {
      setLocation("/reports");
    }
  }, [activeTab, setLocation]);

  // Funzione per rendere il contenuto della schermata di blocco
  const renderLockedFeatureContent = (featureName, description) => {
    if (hasPROAccess) {
      return (
        <div className="space-y-4">
          {activeTab === "google-calendar" && <GoogleCalendarSimpleSetup />}
        </div>
      );
    }

    return (
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
            {t('proFeature.subtitle', `"${featureName}" è disponibile solo con l'abbonamento PRO`)}
          </CardDescription>
        </CardHeader>
        <CardContent>
          <p className="text-center mb-4 text-muted-foreground">
            {description}
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
    );
  };
  
  return (
    <div className="container py-6">
      <div className="flex items-center mb-6">
        <Crown className="h-6 w-6 mr-2 text-amber-500" />
        <h1 className="text-3xl font-bold tracking-tight">
          {t('pro.title', 'Funzionalità PRO')}
        </h1>
      </div>
      
      <Tabs 
        defaultValue="google-calendar" 
        className="w-full" 
        onValueChange={(value) => setActiveTab(value)}
      >
        <TabsList className="grid w-full grid-cols-3 mb-8">
          <TabsTrigger value="google-calendar" className="flex items-center">
            <CalendarPlus className="h-4 w-4 mr-2" />
            {t('pro.googleCalendar', 'Google Calendar')}
          </TabsTrigger>
          <TabsTrigger value="invoices" className="flex items-center">
            <Receipt className="h-4 w-4 mr-2" />
            {t('pro.invoices', 'Fatture')} 
          </TabsTrigger>
          <TabsTrigger value="reports" className="flex items-center">
            <FileSpreadsheet className="h-4 w-4 mr-2" />
            {t('pro.reports', 'Report')}
          </TabsTrigger>
        </TabsList>
        
        <TabsContent value="google-calendar">
          {renderLockedFeatureContent(
            t('pro.googleCalendarIntegration', 'Integrazione Google Calendar'),
            t('pro.googleCalendarLocked', 'L\'integrazione con Google Calendar è disponibile nella versione PRO. Aggiorna il tuo piano per accedere a questa funzionalità.')
          )}
        </TabsContent>
        
        <TabsContent value="invoices">
          {/* Contenuto vuoto - reindirizzamento gestito dall'effetto */}
        </TabsContent>
        
        <TabsContent value="reports">
          {/* Contenuto vuoto - reindirizzamento gestito dall'effetto */}
        </TabsContent>
      </Tabs>
    </div>
  );
}