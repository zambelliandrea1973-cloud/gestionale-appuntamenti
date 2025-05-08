import { useUserWithLicense } from '@/hooks/use-user-with-license';
import { Loader2 } from 'lucide-react';

export default function UserLicenseBadge() {
  const { user, isLoading, getLicenseBadgeType, getUserType, getFullName } = useUserWithLicense();

  // Se stiamo caricando, mostriamo un indicatore di caricamento
  if (isLoading) {
    return <span className="ml-2 flex items-center"><Loader2 className="h-3 w-3 animate-spin mr-1" /></span>;
  }

  // Se non c'è un utente autenticato, non mostriamo nulla
  if (!user) {
    return null;
  }

  // Ottieni il tipo di licenza formattato
  const licenseType = getLicenseBadgeType(user.licenseInfo.type);
  // Ottieni il tipo di account formattato
  const userType = getUserType(user.type);
  // Ottieni il nome utente completo
  const fullName = getFullName();

  // Determina il colore di sfondo in base al tipo di licenza
  const getBadgeColor = () => {
    switch(user.licenseInfo.type) {
      case 'pro':
        return 'bg-amber-500 text-white';
      case 'base':
        return 'bg-blue-500 text-white';
      case 'business':
        return 'bg-purple-500 text-white';
      case 'staff_free':
        return 'bg-green-500 text-white';
      case 'passepartout':
        return 'bg-red-500 text-white font-bold';
      case 'trial':
      default:
        return 'bg-white/20';
    }
  };

  return (
    <div className="ml-2 flex items-center">
      <span className="text-sm font-medium mr-2">{fullName}</span>
      <span className={`ml-1 text-xs px-2 py-0.5 rounded-full font-medium ${getBadgeColor()}`}>
        {userType} • {licenseType}
      </span>
    </div>
  );
}