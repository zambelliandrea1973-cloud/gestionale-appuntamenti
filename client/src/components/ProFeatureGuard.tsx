import React from 'react';
import { useLocation } from 'wouter';
import { useTranslation } from 'react-i18next';
import {
  Crown,
  Lock,
  CheckCircle2,
} from 'lucide-react';
import { Button } from "@/components/ui/button";

interface ProFeatureGuardProps {
  children: React.ReactNode;
  featureName: string;
  description?: string;
}

/**
 * Componente che protegge le funzionalità PRO
 * Mostra il contenuto solo se l'utente ha accesso alle funzionalità PRO,
 * altrimenti mostra un messaggio per invitare all'upgrade
 */
export default function ProFeatureGuard({ children, featureName, description }: ProFeatureGuardProps) {
  const [, setLocation] = useLocation();
  const { t } = useTranslation();
  
  // In una implementazione reale, questo valore verrebbe recuperato dal server
  // per determinare se l'utente ha accesso alle funzioni PRO
  const hasPROAccess = false; // Temporaneamente impostato su false per mostrare il messaggio di upgrade
  
  if (hasPROAccess) {
    return <>{children}</>;
  }
  
  return (
    <div className="min-h-[70vh] flex items-center justify-center">
      <div className="max-w-md w-full space-y-8 p-6 bg-white border rounded-lg shadow-md">
        <div className="flex flex-col items-center text-center">
          <div className="h-16 w-16 bg-amber-100 rounded-full flex items-center justify-center mb-4">
            <Lock className="h-8 w-8 text-amber-600" />
          </div>
          <h2 className="text-2xl font-bold mb-2">
            {featureName} {t('pro.isProFeature', 'è una funzionalità PRO')}
          </h2>
          <p className="text-gray-500 mb-6">
            {description || t('pro.upgradeToAccess', 'Aggiorna il tuo piano per accedere a questa e altre funzionalità avanzate.')}
          </p>
          
          <div className="bg-amber-50 border border-amber-200 rounded-lg p-4 mb-6 w-full">
            <h3 className="font-medium text-amber-800 mb-2 flex items-center">
              <Crown className="h-5 w-5 mr-2 text-amber-500" />
              {t('pro.benefitsTitle', 'Vantaggi della versione PRO')}
            </h3>
            <ul className="space-y-2">
              <li className="flex items-center text-sm text-amber-700">
                <CheckCircle2 className="h-4 w-4 mr-2 text-amber-500" />
                {t('pro.benefit1', 'Integrazione con Google Calendar')}
              </li>
              <li className="flex items-center text-sm text-amber-700">
                <CheckCircle2 className="h-4 w-4 mr-2 text-amber-500" />
                {t('pro.benefit2', 'Gestione completa delle fatture')}
              </li>
              <li className="flex items-center text-sm text-amber-700">
                <CheckCircle2 className="h-4 w-4 mr-2 text-amber-500" />
                {t('pro.benefit3', 'Report dettagliati sull\'attività')}
              </li>
            </ul>
          </div>
          
          <div className="space-y-3 w-full">
            <Button 
              onClick={() => setLocation("/pro")}
              className="w-full bg-amber-500 hover:bg-amber-600"
            >
              <Crown className="h-4 w-4 mr-2" />
              {t('pro.showPlans', 'Scopri i piani PRO')}
            </Button>
            <Button 
              variant="outline" 
              onClick={() => setLocation("/")}
              className="w-full"
            >
              {t('common.backToHome', 'Torna alla Home')}
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}