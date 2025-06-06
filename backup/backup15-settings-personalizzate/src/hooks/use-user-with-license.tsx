import { createContext, ReactNode, useContext } from "react";
import { useQuery } from "@tanstack/react-query";
import { useTranslation } from "react-i18next";

// Definizione delle interfacce dei dati
export interface LicenseInfo {
  type: string;
  expiresAt: string | null;
  isActive: boolean;
  daysLeft: number | null;
}

export interface UserWithLicense {
  id: number;
  username: string;
  email: string | null;
  type: 'user' | 'staff' | 'admin' | 'customer' | 'client'; // Tipi di account possibili
  firstName: string | null;
  lastName: string | null;
  licenseInfo: LicenseInfo;
}

interface UserLicenseContextType {
  user: UserWithLicense | null;
  isLoading: boolean;
  error: Error | null;
  getLicenseBadgeType: (licenseType: string) => string;
  getUserType: (userType: string) => string;
  getFullName: () => string;
}

const UserLicenseContext = createContext<UserLicenseContextType | null>(null);

export function UserLicenseProvider({ children }: { children: ReactNode }) {
  const { t } = useTranslation();
  
  const {
    data: user,
    error,
    isLoading,
  } = useQuery<UserWithLicense | null>({
    queryKey: ["/api/user-with-license"],
    queryFn: async () => {
      console.log("🔍 QUERY USER-WITH-LICENSE CHIAMATA - FORZA DATI FRESCHI");
      // Aggiungi timestamp per evitare cache del browser
      const timestamp = new Date().getTime();
      const response = await fetch(`/api/user-with-license?t=${timestamp}`, {
        credentials: 'include',
        headers: {
          'Cache-Control': 'no-cache, no-store, must-revalidate',
          'Pragma': 'no-cache',
          'Expires': '0'
        }
      });
      console.log("🔍 Risposta user-with-license:", response.status, response.ok);
      if (!response.ok) {
        // Se l'utente non è autenticato, ritorna null invece di lanciare errore
        if (response.status === 401) {
          console.log("🔍 Utente non autenticato, ritorno null");
          return null;
        }
        throw new Error(`HTTP ${response.status}`);
      }
      const data = await response.json();
      console.log("🔍 Dati utente ricevuti FRESCHI:", data);
      return data;
    },
    retry: (failureCount, error) => {
      // Non ripetere se è un 401 (non autenticato)
      if (error?.message?.includes('401')) {
        return false;
      }
      return failureCount < 1;
    },
    // FORZA REFRESH - Risolve il problema del nome utente cached
    staleTime: 0, // I dati sono sempre considerati stale
    gcTime: 0, // Non mantenere cache (TanStack Query v5)
    refetchOnWindowFocus: true, // Ricarica quando la finestra diventa attiva
    refetchOnMount: true, // Ricarica sempre al mount
  });

  // Funzione per ottenere il tipo di licenza formattato per il badge
  const getLicenseBadgeType = (licenseType: string): string => {
    switch(licenseType) {
      case 'trial':
        return t('license.type.trial', 'Prova');
      case 'base':
        return t('license.type.base', 'Base');
      case 'pro':
        return t('license.type.pro', 'Pro');
      case 'business':
        return t('license.type.business', 'Business');
      case 'staff_free':
        return t('license.type.staff', 'Staff');
      case 'passepartout':
        return t('license.type.passepartout', 'Master');
      default:
        return licenseType;
    }
  };

  // Funzione per ottenere il tipo di utente formattato
  const getUserType = (userType: string): string => {
    switch(userType) {
      case 'admin':
        return t('user.type.admin', 'Admin');
      case 'staff':
        return t('user.type.staff', 'Staff');
      case 'user':
        return t('user.type.user', 'Utente');
      case 'customer':
        return t('user.type.customer', 'Acquirente');
      case 'client':
        return t('user.type.client', 'Cliente');
      default:
        return userType;
    }
  };

  // Funzione per ottenere il nome completo dell'utente
  const getFullName = (): string => {
    if (!user) return '';
    
    if (user.firstName && user.lastName) {
      return `${user.firstName} ${user.lastName}`;
    }
    
    if (user.firstName) {
      return user.firstName;
    }
    
    if (user.lastName) {
      return user.lastName;
    }
    
    return user.username;
  };

  return (
    <UserLicenseContext.Provider
      value={{
        user: user ?? null,
        isLoading,
        error: error as Error | null,
        getLicenseBadgeType,
        getUserType,
        getFullName
      }}
    >
      {children}
    </UserLicenseContext.Provider>
  );
}

export function useUserWithLicense() {
  const context = useContext(UserLicenseContext);
  if (!context) {
    throw new Error("useUserWithLicense must be used within a UserLicenseProvider");
  }
  return context;
}