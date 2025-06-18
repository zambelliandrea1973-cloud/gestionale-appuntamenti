import { ReactNode } from 'react';
import { useLicense } from '@/hooks/use-license';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { 
  Crown, 
  Lock, 
  ArrowRight, 
  CalendarPlus, 
  FileSpreadsheet, 
  Receipt 
} from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { Link } from 'wouter';

interface ProFeatureGuardProps {
  children: ReactNode;
  featureName: string;
  description?: string;
}

/**
 * Barra di navigazione delle funzionalità PRO
 * Questo componente è sempre visibile, anche se l'utente non ha accesso PRO
 */
function ProNavigationBar() {
  const { t } = useTranslation();
  const currentPath = window.location.pathname;
  
  // Determina quale tab è attivo
  const isGoogleCalendarActive = currentPath.includes('/pro-features');
  const isInvoicesActive = currentPath.includes('/invoices');
  const isReportsActive = currentPath.includes('/reports');

  return (
    <div className="mb-8">
      <div className="flex items-center mb-6">
        <Crown className="h-6 w-6 mr-2 text-amber-500" />
        <h1 className="text-3xl font-bold tracking-tight">
          {t('pro.title', 'Funzionalità PRO')}
        </h1>
      </div>
      
      <div className="grid w-full grid-cols-3">
        <Link to="/pro-features">
          <div 
            className={`flex items-center justify-center py-3 px-3 ${
              isGoogleCalendarActive
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
              isInvoicesActive 
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
              isReportsActive 
                ? 'border-b-2 border-primary font-medium text-primary' 
                : 'border-b border-input bg-background hover:text-primary hover:bg-accent text-muted-foreground'
            }`}
          >
            <FileSpreadsheet className="h-4 w-4 mr-2" />
            {t('pro.reports', 'Report')}
          </div>
        </Link>
      </div>
    </div>
  );
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
  
  // La barra di navigazione PRO è sempre visibile
  // Se l'utente non ha l'abbonamento PRO, mostriamo il messaggio di upgrade
  if (!isLoading && !hasProAccess) {
    return (
      <div className="container py-6">
        <ProNavigationBar />
        
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
              onClick={() => navigate('/')}
            >
              {t('common.backToHome', 'Torna alla Home')}
            </Button>
          </CardFooter>
        </Card>
      </div>
    );
  }
  
  // Se l'utente ha l'abbonamento PRO, mostriamo i contenuti con la barra di navigazione
  return (
    <div className="container py-6">
      <ProNavigationBar />
      {children}
    </div>
  );
}