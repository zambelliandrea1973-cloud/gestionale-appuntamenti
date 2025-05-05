import { ReactNode } from 'react';
import { useLicense } from '@/hooks/use-license';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Crown, Lock, ArrowRight } from 'lucide-react';
import { useTranslation } from 'react-i18next';

interface ProFeatureGuardProps {
  children: ReactNode;
  featureName: string;
  description?: string;
}

/**
 * Componente che protegge le funzionalità PRO
 * Se l'utente non ha un abbonamento PRO, mostra un messaggio di upgrade
 * altrimenti mostra i contenuti normalmente
 */
export default function ProFeatureGuard({ children, featureName, description }: ProFeatureGuardProps) {
  const { hasProAccess, isLoading } = useLicense();
  // Per la navigazione useremo semplici href invece di hook
  const navigate = (path: string) => { window.location.href = path };
  const { t } = useTranslation();
  
  // Se l'utente sta tentando di utilizzare una funzione PRO ma non ha l'abbonamento,
  // mostriamo un messaggio di upgrade
  if (!isLoading && !hasProAccess) {
    return (
      <div className="flex flex-col items-center justify-center h-full py-12">
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
              {description || t('proFeature.description', 'Passa a un piano premium per sbloccare tutte le funzionalità avanzate.')}
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
              onClick={() => navigate('/subscribe')}
            >
              {t('proFeature.upgradeButton', 'Passa a PRO')}
              <ArrowRight className="ml-2 h-4 w-4" />
            </Button>
            <Button
              variant="outline"
              className="w-full"
              onClick={() => navigate('/pro')}
            >
              {t('proFeature.learnMore', 'Scopri di più')}
            </Button>
          </CardFooter>
        </Card>
      </div>
    );
  }
  
  // Se l'utente ha l'abbonamento PRO o stiamo ancora caricando, mostriamo i contenuti normalmente
  return <>{children}</>;
}