import { ReactNode } from 'react';
import { useLicense } from '@/hooks/use-license';
import { useAuth } from '@/hooks/use-auth';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Lock, AlertTriangle, User, Crown } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { Link } from 'wouter';

interface AuthorizedRouteProps {
  children: ReactNode;
  requiredRole?: 'admin' | 'business' | 'staff' | 'customer';
  requiredLicense?: 'pro' | 'business';
  featureName?: string;
  description?: string;
}

/**
 * Componente per la gestione delle autorizzazioni basate su ruolo e licenza
 * Controlla l'accesso alle diverse sezioni dell'applicazione
 */
export default function AuthorizedRoute({ 
  children, 
  requiredRole, 
  requiredLicense, 
  featureName = '',
  description = ''
}: AuthorizedRouteProps) {
  const { user, isLoading: authLoading } = useAuth();
  const { hasProAccess, hasBusinessAccess, isLoading: licenseLoading } = useLicense();
  const { t } = useTranslation();

  // Loading state
  if (authLoading || licenseLoading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
      </div>
    );
  }

  // Verifica autenticazione
  if (!user) {
    return (
      <Card className="max-w-md w-full mx-auto mt-10">
        <CardHeader className="text-center">
          <div className="flex justify-center mb-4">
            <div className="rounded-full bg-red-100 p-3">
              <Lock className="h-8 w-8 text-red-600" />
            </div>
          </div>
          <CardTitle className="text-2xl">
            {t('auth.required', 'Accesso richiesto')}
          </CardTitle>
          <CardDescription>
            {t('auth.loginRequired', 'Devi essere autenticato per accedere a questa sezione')}
          </CardDescription>
        </CardHeader>
        <CardContent className="text-center">
          <Link to="/auth">
            <Button className="w-full">
              {t('auth.login', 'Accedi')}
            </Button>
          </Link>
        </CardContent>
      </Card>
    );
  }

  // Verifica ruolo utente
  if (requiredRole) {
    const hasRequiredRole = checkUserRole(user.type, requiredRole);
    
    if (!hasRequiredRole) {
      return (
        <Card className="max-w-md w-full mx-auto mt-10">
          <CardHeader className="text-center">
            <div className="flex justify-center mb-4">
              <div className="rounded-full bg-orange-100 p-3">
                <User className="h-8 w-8 text-orange-600" />
              </div>
            </div>
            <CardTitle className="text-2xl">
              {t('auth.accessDenied', 'Accesso negato')}
            </CardTitle>
            <CardDescription>
              {t('auth.insufficientRole', `Questa sezione richiede il ruolo "${getRoleDisplayName(requiredRole)}"`)}
            </CardDescription>
          </CardHeader>
          <CardContent className="text-center">
            <p className="text-sm text-muted-foreground mb-4">
              {t('auth.currentRole', `Il tuo ruolo attuale: ${getRoleDisplayName(user.type)}`)}
            </p>
            <Link to="/">
              <Button variant="outline" className="w-full">
                {t('common.backToHome', 'Torna alla Home')}
              </Button>
            </Link>
          </CardContent>
        </Card>
      );
    }
  }

  // Verifica licenza
  if (requiredLicense) {
    const hasRequiredLicense = checkLicenseAccess(requiredLicense, hasProAccess, hasBusinessAccess);
    
    if (!hasRequiredLicense) {
      return (
        <Card className="max-w-md w-full mx-auto mt-10">
          <CardHeader className="text-center">
            <div className="flex justify-center mb-4">
              <div className="rounded-full bg-amber-100 p-3">
                <Crown className="h-8 w-8 text-amber-600" />
              </div>
            </div>
            <CardTitle className="text-2xl">
              {t('license.upgradeRequired', 'Upgrade richiesto')}
            </CardTitle>
            <CardDescription>
              {featureName 
                ? t('license.featureRequiresLicense', `"${featureName}" richiede una licenza ${requiredLicense.toUpperCase()}`)
                : t('license.licenseRequired', `Questa sezione richiede una licenza ${requiredLicense.toUpperCase()}`)
              }
            </CardDescription>
          </CardHeader>
          <CardContent className="text-center">
            {description && (
              <p className="text-sm text-muted-foreground mb-4">{description}</p>
            )}
            
            <div className="space-y-2">
              <Link to="/subscribe">
                <Button className="w-full">
                  <Crown className="mr-2 h-4 w-4" />
                  {t('license.upgrade', `Passa a ${requiredLicense.toUpperCase()}`)}
                </Button>
              </Link>
              <Link to="/">
                <Button variant="outline" className="w-full">
                  {t('common.backToHome', 'Torna alla Home')}
                </Button>
              </Link>
            </div>
          </CardContent>
        </Card>
      );
    }
  }

  // Se tutte le verifiche sono passate, mostra il contenuto
  return <>{children}</>;
}

/**
 * Verifica se l'utente ha il ruolo richiesto
 */
function checkUserRole(userType: string, requiredRole: string): boolean {
  // Admin ha accesso a tutto
  if (userType === 'admin') return true;

  // Verifica ruolo specifico
  switch (requiredRole) {
    case 'admin':
      return userType === 'admin';
    case 'business':
      return ['admin', 'business'].includes(userType);
    case 'staff':
      return ['admin', 'business', 'staff'].includes(userType);
    case 'customer':
      return ['admin', 'business', 'staff', 'customer'].includes(userType);
    default:
      return false;
  }
}

/**
 * Verifica se l'utente ha la licenza richiesta
 */
function checkLicenseAccess(requiredLicense: string, hasProAccess: boolean, hasBusinessAccess: boolean): boolean {
  switch (requiredLicense) {
    case 'pro':
      return hasProAccess || hasBusinessAccess; // Business include PRO
    case 'business':
      return hasBusinessAccess;
    default:
      return false;
  }
}

/**
 * Ottiene il nome visualizzabile del ruolo
 */
function getRoleDisplayName(role: string): string {
  const roleNames = {
    admin: 'Amministratore',
    business: 'Business',
    staff: 'Staff',
    customer: 'Cliente'
  };
  return roleNames[role as keyof typeof roleNames] || role;
}