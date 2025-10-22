import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useEffect } from "react";
import { apiRequest } from "@/lib/queryClient";

interface MobileSyncData {
  clients: any[];
  clientsCount: number;
  companySettings: any;
  services: any[];
  userType: string;
  timestamp: number;
  syncedAt: string;
}

export function useMobileForcedSync() {
  const queryClient = useQueryClient();
  
  // Rileva se siamo su mobile
  const isMobile = /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent);
  
  // Query per la sincronizzazione forzata mobile
  const { data: syncData, isLoading, error } = useQuery<MobileSyncData>({
    queryKey: ['/api/mobile-sync'],
    queryFn: async () => {
      const response = await apiRequest('GET', '/api/mobile-sync');
      return response.json();
    },
    enabled: isMobile, // Solo per dispositivi mobili
    refetchInterval: 30000, // Risincronizza ogni 30 secondi
    refetchOnWindowFocus: true,
    refetchOnMount: true,
    staleTime: 0, // Considera sempre i dati obsoleti
    gcTime: 0, // Non mantenere cache
  });

  // Quando riceviamo i dati sincronizzati, aggiorniamo tutte le cache
  useEffect(() => {
    if (syncData && isMobile) {
      console.log(`📱 [MOBILE-SYNC] Aggiornamento cache con ${syncData.clientsCount} clienti`);
      
      // Aggiorna cache clienti
      queryClient.setQueryData(['/api/clients'], syncData.clients);
      
      // Aggiorna cache impostazioni azienda
      queryClient.setQueryData(['/api/company-name-settings'], syncData.companySettings);
      
      // Aggiorna cache servizi
      queryClient.setQueryData(['/api/services'], syncData.services);
      
      // Invalida tutte le query per forzare un refresh
      queryClient.invalidateQueries();
      
      console.log(`📱 [MOBILE-SYNC] Cache aggiornata con dati freschi - timestamp: ${syncData.timestamp}`);
    }
  }, [syncData, queryClient, isMobile]);

  return {
    syncData,
    isLoading,
    error,
    isMobile,
    clientsCount: syncData?.clientsCount || 0,
    isForcesynced: !!syncData
  };
}