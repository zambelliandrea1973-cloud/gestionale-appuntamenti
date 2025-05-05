import React, { useState } from 'react';
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
import { Link } from 'wouter';

/**
 * Pagina delle funzionalità PRO
 * Comprende: 
 * - Google Calendar
 * - Fatture (linking alla pagina esistente)
 * - Report (linking alla pagina esistente)
 */
export default function ProFeaturesPage() {
  const { t } = useTranslation();
  const [showUpgradeMessage, setShowUpgradeMessage] = useState(false);
  
  // In una implementazione reale, questo valore verrebbe recuperato dal server
  // per determinare se l'utente ha accesso alle funzioni PRO
  const hasPROAccess = true; // Temporaneamente impostato su true per sviluppo
  
  const handleUpgradeClick = () => {
    // In un'applicazione reale, qui reindirizzeremmo l'utente verso la pagina di upgrade
    setShowUpgradeMessage(true);
  };
  
  return (
    <div className="container py-6">
      <div className="flex items-center mb-6">
        <Crown className="h-6 w-6 mr-2 text-amber-500" />
        <h1 className="text-3xl font-bold tracking-tight">
          {t('pro.title', 'Funzionalità PRO')}
        </h1>
      </div>
      
      {/* Banner PRO - Visibile solo per utenti non PRO */}
      {!hasPROAccess && (
        <div className="mb-8 p-5 rounded-lg border bg-gradient-to-br from-amber-50 to-amber-100 border-amber-200">
          <div className="flex items-start max-w-3xl">
            <div className="flex-shrink-0 h-12 w-12 flex items-center justify-center bg-amber-500 text-white rounded-full mr-4">
              <Star className="h-6 w-6" />
            </div>
            <div>
              <h3 className="text-lg font-semibold mb-1">{t('pro.upgradeTitle', 'Passa alla versione PRO')}</h3>
              <p className="text-sm text-amber-900 mb-3">
                {t('pro.upgradeDesc', 'Sblocca funzionalità avanzate per gestire meglio la tua attività: integrazione con Google Calendar, gestione fatture e report dettagliati.')}
              </p>
              <div className="flex items-center space-x-3">
                <Button 
                  onClick={handleUpgradeClick}
                  className="bg-amber-500 hover:bg-amber-600 text-white"
                >
                  {t('pro.upgrade', 'Passa a PRO')}
                </Button>
                <Link to="/subscribe" className="text-sm text-amber-700 hover:underline">
                  {t('pro.learnMore', 'Scopri di più')}
                </Link>
              </div>
              
              {showUpgradeMessage && (
                <p className="mt-3 text-sm p-2 bg-amber-100 rounded-md text-amber-800">
                  {t('pro.upgradeMessage', 'Per migliorare il tuo abbonamento, contatta l\'assistenza o visita il tuo pannello di abbonamento')}
                </p>
              )}
            </div>
          </div>
        </div>
      )}
      
      <Tabs defaultValue="google-calendar" className="w-full">
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
          <div className="space-y-6">
            <div className="rounded-lg border p-5">
              <h3 className="text-lg font-medium mb-3 flex items-center">
                <Receipt className="h-5 w-5 mr-2 text-primary" />
                {t('pro.invoices', 'Fatture')}
              </h3>
              <p className="text-sm text-muted-foreground mb-4">
                {t('pro.invoicesDesc', 'Gestisci e crea facilmente fatture per i tuoi clienti. Accedi alla pagina dedicata per iniziare.')}
              </p>
              <Link to="/invoices">
                <Button>
                  {t('pro.goToInvoices', 'Vai a Fatture')}
                </Button>
              </Link>
            </div>
            
            {/* Qui potrebbero essere aggiunte statistiche riassuntive o funzionalità extra */}
          </div>
        </TabsContent>
        
        <TabsContent value="reports">
          <div className="space-y-6">
            <div className="rounded-lg border p-5">
              <h3 className="text-lg font-medium mb-3 flex items-center">
                <FileSpreadsheet className="h-5 w-5 mr-2 text-primary" />
                {t('pro.reports', 'Report')}
              </h3>
              <p className="text-sm text-muted-foreground mb-4">
                {t('pro.reportsDesc', 'Visualizza report dettagliati sulla tua attività, statistiche sui clienti e analisi finanziarie.')}
              </p>
              <Link to="/reports">
                <Button>
                  {t('pro.goToReports', 'Vai a Report')}
                </Button>
              </Link>
            </div>
            
            {/* Qui potrebbero essere aggiunte statistiche riassuntive o funzionalità extra */}
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
}