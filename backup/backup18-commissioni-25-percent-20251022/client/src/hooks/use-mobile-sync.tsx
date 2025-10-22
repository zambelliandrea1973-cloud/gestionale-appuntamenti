import { useEffect, useRef } from 'react';
import { useQueryClient } from '@tanstack/react-query';

/**
 * Hook per sincronizzazione forzata sui dispositivi mobili
 * Invalida la cache e forza il refresh dei dati ogni volta che l'app torna in primo piano
 */
export function useMobileSync() {
  const queryClient = useQueryClient();
  const lastRefreshTime = useRef<number>(0);
  
  // Rileva se siamo su dispositivo mobile
  const isMobile = /Mobi|Android|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent) ||
                   window.innerWidth <= 768 ||
                   'ontouchstart' in window;

  useEffect(() => {
    if (!isMobile) return;

    const handleVisibilityChange = () => {
      // Quando l'app torna visibile su mobile, forza refresh
      if (!document.hidden) {
        const now = Date.now();
        // Previeni refresh troppo frequenti (minimo 30 secondi)
        if (now - lastRefreshTime.current > 30000) {
          console.log('📱 MOBILE SYNC: App tornata visibile, forzando refresh dati...');
          
          // Invalida tutte le query critiche per sincronizzazione
          queryClient.invalidateQueries({ queryKey: ['/api/appointments'] });
          queryClient.invalidateQueries({ queryKey: ['/api/clients'] });
          queryClient.invalidateQueries({ queryKey: ['/api/services'] });
          queryClient.invalidateQueries({ queryKey: ['/api/user-with-license'] });
          queryClient.invalidateQueries({ queryKey: ['/api/tenant-context'] });
          
          // Forza refetch immediato
          queryClient.refetchQueries({ type: 'active' });
          
          lastRefreshTime.current = now;
          console.log('📱 MOBILE SYNC: Cache invalidata e refetch forzato');
        }
      }
    };

    const handleFocus = () => {
      // Quando la finestra riceve il focus su mobile
      if (isMobile) {
        console.log('📱 MOBILE SYNC: Finestra in focus, verificando sincronizzazione...');
        handleVisibilityChange();
      }
    };

    // Event listeners per rilevare quando l'app torna attiva
    document.addEventListener('visibilitychange', handleVisibilityChange);
    window.addEventListener('focus', handleFocus);
    
    // Per PWA, ascolta anche eventi specifici mobile
    window.addEventListener('pageshow', handleVisibilityChange);
    
    return () => {
      document.removeEventListener('visibilitychange', handleVisibilityChange);
      window.removeEventListener('focus', handleFocus);
      window.removeEventListener('pageshow', handleVisibilityChange);
    };
  }, [queryClient, isMobile]);

  // Forza refresh iniziale su mobile se è passato molto tempo
  useEffect(() => {
    if (isMobile) {
      const lastVisit = localStorage.getItem('lastMobileVisit');
      const now = Date.now();
      
      if (!lastVisit || now - parseInt(lastVisit) > 300000) { // 5 minuti
        console.log('📱 MOBILE SYNC: Prima visita o lunga assenza, forzando refresh completo...');
        queryClient.invalidateQueries();
        queryClient.refetchQueries({ type: 'active' });
      }
      
      localStorage.setItem('lastMobileVisit', now.toString());
    }
  }, [queryClient, isMobile]);

  return { isMobile };
}