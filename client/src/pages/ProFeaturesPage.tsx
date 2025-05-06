import React, { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import {
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from "@/components/ui/tabs";
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
  
  return (
    <div className="container py-6">
      <div className="flex items-center mb-6">
        <Crown className="h-6 w-6 mr-2 text-amber-500" />
        <h1 className="text-3xl font-bold tracking-tight">
          {t('pro.title', 'Funzionalità PRO')}
        </h1>
      </div>
      
      {/* Banner rimosso per evitare duplicazione */}
      
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
          {hasPROAccess ? (
            <GoogleCalendarSimpleSetup />
          ) : (
            <div className="rounded-lg border p-10 text-center">
              <Lock className="h-10 w-10 mx-auto text-muted-foreground mb-3" />
              <h3 className="text-lg font-medium mb-2">{t('pro.featureLocked', 'Funzionalità bloccata')}</h3>
              <p className="text-sm text-muted-foreground mb-4 max-w-md mx-auto">
                {t('pro.googleCalendarLocked', 'L\'integrazione con Google Calendar è disponibile solo per utenti PRO.')}
              </p>
              <Button onClick={handleUpgradeClick}>
                {t('pro.unlockFeature', 'Sblocca questa funzionalità')}
              </Button>
            </div>
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