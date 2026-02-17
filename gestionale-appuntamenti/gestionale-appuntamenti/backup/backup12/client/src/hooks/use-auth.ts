import { useQuery } from '@tanstack/react-query';
import { apiRequest } from '@/lib/queryClient';

interface User {
  id: number;
  username: string;
  email: string;
  role: string;
  stripeCustomerId?: string | null;
  stripeSubscriptionId?: string | null;
  // Aggiungi altri campi utente se necessario
}

/**
 * Hook per gestire l'autenticazione dell'utente.
 * Utilizza React Query per ottenere i dati dell'utente corrente.
 */
export function useAuth() {
  const { data: user, isLoading, error } = useQuery<User | null>({
    queryKey: ['/api/current-user'],
    queryFn: async () => {
      try {
        const res = await apiRequest('GET', '/api/current-user');
        // Se la risposta è ok, restituisci l'utente
        if (res.ok) {
          return await res.json();
        }
        // Altrimenti restituisci null (utente non autenticato)
        return null;
      } catch (error) {
        console.error('Errore nel recupero dell\'utente:', error);
        return null;
      }
    },
    retry: false,
    refetchOnWindowFocus: false,
    staleTime: 5 * 60 * 1000, // 5 minuti
  });

  return {
    user,
    isLoading,
    error,
    isAuthenticated: !!user,
    isStaff: user?.role === 'staff',
    isAdmin: user?.role === 'admin',
  };
}