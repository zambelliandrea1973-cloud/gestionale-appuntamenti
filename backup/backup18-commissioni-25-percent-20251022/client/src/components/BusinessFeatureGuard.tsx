import { ReactNode } from 'react';
import { useLicense } from '@/hooks/use-license';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Crown, Lock, Briefcase, ArrowRight } from 'lucide-react';
import { useTranslation } from 'react-i18next';

interface BusinessFeatureGuardProps {
  children: ReactNode;
  featureName: string;
  description?: string;
}

/**
 * Componente che protegge le funzionalità BUSINESS
 * Se l'utente non ha un abbonamento BUSINESS, mostra un messaggio di upgrade
 * altrimenti mostra i contenuti normalmente
 */
export default function BusinessFeatureGuard({ children, featureName, description }: BusinessFeatureGuardProps) {
  const { hasBusinessAccess, isLoading } = useLicense();
  // Per la navigazione useremo semplici href invece di hook
  const navigate = (path: string) => { window.location.href = path };
  const { t } = useTranslation();
  
  // Se l'utente sta tentando di utilizzare una funzione BUSINESS ma non ha l'abbonamento,
  // mostriamo un messaggio di upgrade
  if (!isLoading && !hasBusinessAccess) {
    return (
      <div className="flex flex-col items-center justify-center h-full py-12">
        <Card className="max-w-md w-full mx-auto">
          <CardHeader className="text-center">
            <div className="flex justify-center mb-4">
              <div className="rounded-full bg-blue-100 p-3">
                <Lock className="h-8 w-8 text-blue-600" />
              </div>
            </div>
            <CardTitle className="text-2xl">
              {t('businessFeature.title', 'Funzionalità BUSINESS')}
            </CardTitle>
            <CardDescription>
              {t('businessFeature.subtitle', `"${featureName}" è disponibile solo con l'abbonamento BUSINESS`)}
            </CardDescription>
          </CardHeader>
          <CardContent>
            <p className="text-center mb-4 text-muted-foreground">
              {description || t('businessFeature.description', 'Passa al piano BUSINESS per sbloccare tutte le funzionalità avanzate per il tuo business.')}
            </p>
            
            <div className="border rounded-lg p-4 mb-4 bg-slate-50">
              <div className="flex items-center mb-2">
                <Briefcase className="h-5 w-5 text-blue-500 mr-2" />
                <h3 className="font-medium">
                  {t('businessFeature.benefits.title', 'Con BUSINESS ottieni')}:
                </h3>
              </div>
              <ul className="space-y-2 pl-7 list-disc text-sm">
                <li>{t('businessFeature.benefits.multiUser', 'Supporto multi-utente')}</li>
                <li>{t('businessFeature.benefits.analytics', 'Analytics avanzati')}</li>
                <li>{t('businessFeature.benefits.customization', 'Personalizzazione completa')}</li>
                <li>{t('businessFeature.benefits.support', 'Supporto prioritario 24/7')}</li>
                <li>{t('businessFeature.benefits.branding', 'Rimozione branding e white-label')}</li>
              </ul>
            </div>
          </CardContent>
          <CardFooter className="flex flex-col space-y-2">
            <Button 
              className="w-full" 
              onClick={() => navigate('/subscribe')}
            >
              {t('businessFeature.upgradeButton', 'Passa a BUSINESS')}
              <ArrowRight className="ml-2 h-4 w-4" />
            </Button>
            <Button
              variant="outline"
              className="w-full"
              onClick={() => navigate('/pro')}
            >
              {t('businessFeature.learnMore', 'Scopri di più')}
            </Button>
          </CardFooter>
        </Card>
      </div>
    );
  }
  
  // Se l'utente ha l'abbonamento BUSINESS o stiamo ancora caricando, mostriamo i contenuti normalmente
  return <>{children}</>;
}