import { useUserWithLicense } from "@/hooks/use-user-with-license";

// Sistema semplificato - UserLicenseBadge
export default function UserLicenseBadge() {
  const { data: user, isLoading } = useUserWithLicense();

  if (isLoading || !user) {
    return null;
  }

  // Determina il colore in base al tipo di licenza
  const getBadgeColor = () => {
    const licenseType = user.licenseType || 'business';
    switch (licenseType) {
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
        return 'bg-white/20';
      default:
        return 'bg-gray-500 text-white';
    }
  };

  // Formatta il tipo di licenza per la visualizzazione
  const formatLicenseType = (type: string) => {
    switch (type) {
      case 'business':
        return 'Business';
      case 'pro':
        return 'Pro';
      case 'base':
        return 'Base';
      case 'staff_free':
        return 'Staff';
      case 'passepartout':
        return 'Passepartout';
      case 'trial':
        return 'Trial';
      default:
        return 'Standard';
    }
  };

  // Formatta il tipo di utente
  const formatUserType = (type: string) => {
    switch (type) {
      case 'customer':
        return 'Cliente';
      case 'staff':
        return 'Staff';
      case 'admin':
        return 'Admin';
      default:
        return 'Utente';
    }
  };

  const licenseDisplay = formatLicenseType(user.licenseType || 'business');
  const userTypeDisplay = formatUserType(user.type);

  return (
    <div className="flex items-center space-x-2">
      <div className={`px-3 py-1 rounded-full text-xs font-medium ${getBadgeColor()}`}>
        {licenseDisplay}
      </div>
      <div className="text-sm text-gray-600">
        {userTypeDisplay}
      </div>
      <div className="text-sm font-medium">
        {user.username}
      </div>
    </div>
  );
}