import React from 'react';
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
} from "lucide-react";
import { useLocation } from 'wouter';

/**
 * Componente di navigazione per le funzionalità PRO
 * Utilizzato su tutte le pagine PRO per mantenere una UI coerente
 */
export default function ProFeatureNavbar() {
  const { t } = useTranslation();
  const [location, setLocation] = useLocation();
  
  // Determina quale tab è attiva in base al percorso
  const getActiveTab = () => {
    if (location.includes('/invoices')) return "invoices";
    if (location.includes('/reports')) return "reports";
    return "google-calendar";
  };
  
  // Gestisce il cambio di tab
  const handleTabChange = (value: string) => {
    if (value === "google-calendar") {
      setLocation("/pro-features");
    } else if (value === "invoices") {
      setLocation("/invoices");
    } else if (value === "reports") {
      setLocation("/reports");
    }
  };
  
  return (
    <>
      <div className="flex items-center mb-6">
        <Crown className="h-6 w-6 mr-2 text-amber-500" />
        <h1 className="text-3xl font-bold tracking-tight">
          {t('pro.title', 'Funzionalità PRO')}
        </h1>
      </div>
      
      <Tabs 
        value={getActiveTab()} 
        className="w-full mb-8" 
        onValueChange={handleTabChange}
      >
        <TabsList className="grid w-full grid-cols-3">
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
      </Tabs>
    </>
  );
}