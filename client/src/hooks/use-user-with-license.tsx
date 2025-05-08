import { useQuery } from '@tanstack/react-query';
import { LicenseInfo } from './use-license';

// Interfaccia per i dati utente con le informazioni sulla licenza
export interface UserWithLicense {
  id: number;
  username: string;
  email: string | null;
  type: 'user' | 'staff' | 'admin'; // Tipi di account possibili
  firstName: string | null;
  lastName: string | null;
  licenseInfo: LicenseInfo;
}

export function useUserWithLicense() {
  const {
    data: user,
    error,
    isLoading
  } = useQuery<UserWithLicense>({
    queryKey: ['/api/user-with-license'],
    refetchOnWindowFocus: false,
    staleTime: 1000 * 60 * 5, // 5 minuti
  });

  // Funzione helper per ottenere un badge di tipo di licenza formattato
  const getLicenseBadgeType = (licenseType: string): string => {
    switch(licenseType) {
      case 'pro':
        return 'PRO';
      case 'base':
        return 'Base';
      case 'business':
        return 'BUSINESS';
      case 'staff_free':
        return 'Staff';
      case 'passepartout':
        return 'ADMIN';
      case 'trial':
      default:
        return 'Prova';
    }
  };

  // Ottiene il tipo di account in formato leggibile
  const getUserType = (type: string): string => {
    switch(type) {
      case 'admin':
        return 'Admin';
      case 'staff':
        return 'Staff';
      default:
        return 'Utente';
    }
  };

  // Funzione formattata per ottenere il nome completo dell'utente
  const getFullName = (): string => {
    if (!user) return '';
    
    if (user.firstName && user.lastName) {
      return `${user.firstName} ${user.lastName}`;
    }
    
    return user.username;
  };

  return {
    user,
    error,
    isLoading,
    getLicenseBadgeType,
    getUserType,
    getFullName
  };
}