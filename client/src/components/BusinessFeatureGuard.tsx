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
              {t('businessFeature.title', 'BUSINESS Feature')}
            </CardTitle>
            <CardDescription>
              {t('businessFeature.subtitle', '"{{featureName}}" is only available with the BUSINESS subscription', { featureName })}
            </CardDescription>
          </CardHeader>
          <CardContent>
            <p className="text-center mb-4 text-muted-foreground">
              {description || t('businessFeature.description', 'Upgrade to the BUSINESS plan to unlock all advanced features for your business.')}
            </p>
            
            <div className="border rounded-lg p-4 mb-4 bg-slate-50">
              <div className="flex items-center mb-2">
                <Briefcase className="h-5 w-5 text-blue-500 mr-2" />
                <h3 className="font-medium">
                  {t('businessFeature.benefits.title', 'With BUSINESS you get')}:
                </h3>
              </div>
              <ul className="space-y-2 pl-7 list-disc text-sm">
                <li>{t('businessFeature.benefits.multiUser', 'Multi-user support')}</li>
                <li>{t('businessFeature.benefits.analytics', 'Advanced analytics')}</li>
                <li>{t('businessFeature.benefits.customization', 'Full customization')}</li>
                <li>{t('businessFeature.benefits.support', '24/7 priority support')}</li>
                <li>{t('businessFeature.benefits.branding', 'Branding removal and white-label')}</li>
              </ul>
            </div>
          </CardContent>
          <CardFooter className="flex flex-col space-y-2">
            <Button 
              className="w-full" 
              onClick={() => navigate('/subscribe')}
            >
              {t('businessFeature.upgradeButton', 'Upgrade to BUSINESS')}
              <ArrowRight className="ml-2 h-4 w-4" />
            </Button>
            <Button
              variant="outline"
              className="w-full"
              onClick={() => navigate('/pro')}
            >
              {t('businessFeature.learnMore', 'Learn more')}
            </Button>
          </CardFooter>
        </Card>
      </div>
    );
  }
  
  // Se l'utente ha l'abbonamento BUSINESS o stiamo ancora caricando, mostriamo i contenuti normalmente
  return <>{children}</>;
}