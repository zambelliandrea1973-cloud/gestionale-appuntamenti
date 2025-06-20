import React, { ReactNode } from 'react';
import { useTranslation } from 'react-i18next';
import {
  CalendarPlus,
  FileSpreadsheet,
  Receipt,
  Crown,
} from "lucide-react";
import { Link } from 'wouter';

/**
 * Componente di navigazione per le funzionalità PRO
 * Utilizzato su tutte le pagine PRO per mantenere una UI coerente
 */
interface ProFeatureNavbarProps {
  children: ReactNode;
}

export default function ProFeatureNavbar({ children }: ProFeatureNavbarProps) {
  const { t } = useTranslation();
  
  // Tab corrente basato sul percorso
  const isActive = (path: string) => {
    return window.location.pathname.includes(path);
  };
  
  return (
    <div className="container py-6">
      <div className="flex items-center mb-6">
        <Crown className="h-6 w-6 mr-2 text-amber-500" />
        <h1 className="text-3xl font-bold tracking-tight">
          {t('pro.title', 'Funzionalità PRO')}
        </h1>
      </div>
      
      <div className="grid w-full grid-cols-4 mb-8">
        <Link to="/pro-features">
          <div 
            className={`flex items-center justify-center py-3 px-3 ${
              isActive('/pro-features') && !isActive('/invoices') && !isActive('/reports') 
                ? 'border-b-2 border-primary font-medium text-primary' 
                : 'border-b border-input bg-background hover:text-primary hover:bg-accent text-muted-foreground'
            }`}
          >
            <CalendarPlus className="h-4 w-4 mr-2" />
            {t('pro.googleCalendar', 'Google Calendar')}
          </div>
        </Link>
        
        <Link to="/invoices">
          <div 
            className={`flex items-center justify-center py-3 px-3 ${
              isActive('/invoices') 
                ? 'border-b-2 border-primary font-medium text-primary' 
                : 'border-b border-input bg-background hover:text-primary hover:bg-accent text-muted-foreground'
            }`}
          >
            <Receipt className="h-4 w-4 mr-2" />
            {t('pro.invoices', 'Fatture')}
          </div>
        </Link>
        
        <Link to="/reports">
          <div 
            className={`flex items-center justify-center py-3 px-3 ${
              isActive('/reports') 
                ? 'border-b-2 border-primary font-medium text-primary' 
                : 'border-b border-input bg-background hover:text-primary hover:bg-accent text-muted-foreground'
            }`}
          >
            <FileSpreadsheet className="h-4 w-4 mr-2" />
            {t('pro.reports', 'Report')}
          </div>
        </Link>
      </div>
      
      {children}
    </div>
  );
}