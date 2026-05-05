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
            {t('auth.required', 'Login required')}
          </CardTitle>
          <CardDescription>
            {t('auth.loginRequired', 'You must be logged in to access this section')}
          </CardDescription>
        </CardHeader>
        <CardContent className="text-center">
          <Link to="/auth">
            <Button className="w-full">
              {t('auth.login')}
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
              {t('auth.accessDenied', 'Access denied')}
            </CardTitle>
            <CardDescription>
              {t('auth.insufficientRole', { role: getRoleDisplayName(requiredRole), defaultValue: `This section requires the '${getRoleDisplayName(requiredRole)}' role` })}
            </CardDescription>
          </CardHeader>
          <CardContent className="text-center">
            <p className="text-sm text-muted-foreground mb-4">
              {t('auth.currentRole', { role: getRoleDisplayName(user.type), defaultValue: `Your current role: ${getRoleDisplayName(user.type)}` })}
            </p>
            <Link to="/">
              <Button variant="outline" className="w-full">
                {t('common.backToHome', 'Back to Home')}
              </Button>
            </Link>
          </CardContent>
        </Card>
      );
    }
  }

  // Verifica licenza
  if (requiredLicense) {
    const hasRequiredLicense = checkLicenseAccess(requiredLicense, hasProAccess, hasBusinessAccess, user.type);
    
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
              {t('license.upgradeRequired', 'Upgrade required')}
            </CardTitle>
            <CardDescription>
              {featureName 
                ? t('license.featureRequiresLicense', { feature: featureName, license: requiredLicense.toUpperCase(), defaultValue: `"${featureName}" requires a ${requiredLicense.toUpperCase()} license` })
                : t('license.licenseRequired', { license: requiredLicense.toUpperCase(), defaultValue: `This section requires a ${requiredLicense.toUpperCase()} license` })
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
                  {t('license.upgrade', { license: requiredLicense.toUpperCase(), defaultValue: `Upgrade to ${requiredLicense.toUpperCase()}` })}
                </Button>
              </Link>
              <Link to="/">
                <Button variant="outline" className="w-full">
                  {t('common.backToHome', 'Back to Home')}
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
 * NOTA: Gli staff hanno accesso gratuito per 10 anni a tutte le funzionalità business
 */
function checkLicenseAccess(requiredLicense: string, hasProAccess: boolean, hasBusinessAccess: boolean, userType?: string): boolean {
  // Staff ha accesso gratuito per 10 anni a tutte le funzionalità business
  if (userType === 'staff') {
    return true; // Staff ha accesso completo come se avesse licenza business
  }
  
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
    admin: 'Administrator',
    business: 'Business',
    staff: 'Staff',
    customer: 'Customer'
  };
  return roleNames[role as keyof typeof roleNames] || role;
}