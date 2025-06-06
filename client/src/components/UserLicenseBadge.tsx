import { useUserWithLicense } from '@/hooks/use-user-with-license';
import { Loader2 } from 'lucide-react';
import { cn } from '@/lib/utils';

interface UserLicenseBadgeProps {
  size?: 'sm' | 'md' | 'lg';
  className?: string;
}

export default function UserLicenseBadge({ size = 'md', className }: UserLicenseBadgeProps) {
  const { user, isLoading, getLicenseBadgeType, getUserType, getFullName } = useUserWithLicense();

  // Se stiamo caricando, mostriamo un indicatore di caricamento
  if (isLoading) {
    return (
      <span className={cn("ml-2 flex items-center", className)}>
        <Loader2 className={cn(
          size === 'sm' && "h-2 w-2",
          size === 'md' && "h-3 w-3",
          size === 'lg' && "h-4 w-4",
          "animate-spin mr-1"
        )} />
      </span>
    );
  }

  // Se non c'è un utente autenticato, non mostriamo nulla
  if (!user) {
    return null;
  }

  // Ottieni il tipo di licenza formattato - Sistema semplificato
  const licenseType = getLicenseBadgeType(user.licenseType || 'business');
  // Ottieni il tipo di account formattato
  const userType = getUserType(user.type);
  // Ottieni il nome utente completo
  const fullName = getFullName();

  // Determina il colore di sfondo in base al tipo di licenza
  const getBadgeColor = () => {
    const licenseRawType = user.licenseInfo.type;
    if (licenseRawType === 'pro') {
      return 'bg-amber-500 text-white';
    } else if (licenseRawType === 'base') {
      return 'bg-blue-500 text-white';
    } else if (licenseRawType === 'business') {
      return 'bg-purple-500 text-white';
    } else if (licenseRawType === 'staff_free') {
      return 'bg-green-500 text-white';
    } else if (licenseRawType === 'passepartout') {
      return 'bg-red-500 text-white font-bold';
    } else if (licenseRawType === 'trial') {
      return 'bg-white/20';
    } else {
      return 'bg-white/20';
    }
  };

  // Configura le dimensioni del badge in base alla prop size
  const getFontSize = () => {
    if (size === 'sm') return 'text-xs';
    if (size === 'lg') return 'text-sm';
    return 'text-xs'; // default (md)
  };

  return (
    <div className={cn("flex items-center", className)}>
      {size !== 'sm' && (
        <span className={cn(
          size === 'md' && "text-sm",
          size === 'lg' && "text-base",
          "font-medium mr-2"
        )}>
          {fullName}
        </span>
      )}
      <span className={cn(
        `ml-1 px-2 py-0.5 rounded-full font-medium ${getBadgeColor()}`,
        getFontSize()
      )}>
        {userType} • {licenseType}
      </span>
    </div>
  );
}