import { useQuery } from '@tanstack/react-query';
import { apiRequest } from '@/lib/queryClient';

interface User {
  id: number;
  username: string;
  email: string | null;
  type: 'user' | 'staff' | 'admin' | 'customer' | 'client';
  firstName: string | null;
  lastName: string | null;
  licenseInfo: {
    type: string;
    expiresAt: string | null;
    isActive: boolean;
    daysLeft: number | null;
  };
  stripeCustomerId?: string | null;
  stripeSubscriptionId?: string | null;
}

/**
 * Hook per gestire l'autenticazione dell'utente.
 * Utilizza React Query per ottenere i dati dell'utente corrente.
 */
export function useAuth() {
  const { data: user, isLoading, error } = useQuery({
    queryKey: ['/api/user-with-license'],
    queryFn: async () => {
      try {
        console.log('🔐 useAuth chiamando /api/user-with-license');
        const timestamp = new Date().getTime();
        const response = await fetch(`/api/user-with-license?t=${timestamp}`, {
          credentials: 'include',
          headers: {
            'Cache-Control': 'no-cache, no-store, must-revalidate',
            'Pragma': 'no-cache',
            'Expires': '0'
          }
        });
        console.log('🔐 useAuth risposta:', response.status, response.ok);
        
        if (!response.ok) {
          console.log('❌ useAuth - utente non autenticato');
          return null;
        }
        
        const data = await response.json();
        console.log('✅ useAuth - dati utente:', data);
        return data;
      } catch (error) {
        console.error('❌ Errore useAuth:', error);
        return null;
      }
    },
    retry: false,
    refetchOnWindowFocus: false,
    staleTime: 0, // Dati sempre freschi
    gcTime: 0, // No cache (TanStack Query v5)
  });

  return {
    user,
    isLoading,
    error,
    isAuthenticated: !!user,
    isStaff: user?.type === 'staff',
    isAdmin: user?.type === 'admin',
  };
}