import React, { useEffect, useState } from 'react';
import { Wifi, WifiOff } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { useToast } from '@/hooks/use-toast';

/**
 * Componente che gestisce e visualizza lo stato della connessione di rete
 * Mostra anche un toast quando cambia lo stato della connessione
 */
export function NetworkStatus() {
  const { t } = useTranslation();
  const { toast } = useToast();
  const [isOnline, setIsOnline] = useState(navigator.onLine);
  const [showIndicator, setShowIndicator] = useState(false);
  
  useEffect(() => {
    // Funzione per gestire il cambio di stato online/offline
    const handleOnlineStatusChange = () => {
      const online = navigator.onLine;
      setIsOnline(online);
      setShowIndicator(true);
      
      // Nascondi l'indicatore dopo 5 secondi
      setTimeout(() => setShowIndicator(false), 5000);
      
      // Mostra un toast in base allo stato
      if (online) {
        toast({
          title: t('common.onlineStatus'),
          description: t('common.connectionRestored'),
          variant: 'default',
        });
      } else {
        toast({
          title: t('common.offlineStatus'),
          description: t('common.connectionLost'),
          variant: 'destructive',
        });
      }
      
      // Comunica col service worker quando cambia lo stato della connessione
      if ('serviceWorker' in navigator && navigator.serviceWorker.controller) {
        navigator.serviceWorker.controller.postMessage({
          type: 'ONLINE_STATUS_CHANGE',
          isOnline: online
        });
      }
    };
    
    // Ascolta gli eventi "online" e "offline"
    window.addEventListener('online', handleOnlineStatusChange);
    window.addEventListener('offline', handleOnlineStatusChange);
    
    // Controlla subito lo stato della connessione
    if (!navigator.onLine) {
      setShowIndicator(true);
    }
    
    // Ascolta i messaggi dal service worker
    if ('serviceWorker' in navigator) {
      navigator.serviceWorker.addEventListener('message', (event) => {
        if (event.data && event.data.type === 'BACK_ONLINE') {
          toast({
            title: t('common.onlineStatus'),
            description: event.data.message || t('common.connectionRestored'),
            variant: 'default',
          });
        }
      });
    }
    
    // Cleanup
    return () => {
      window.removeEventListener('online', handleOnlineStatusChange);
      window.removeEventListener('offline', handleOnlineStatusChange);
    };
  }, [toast, t]);
  
  // Non mostrare nulla se siamo online e l'indicatore non deve essere mostrato
  if (isOnline && !showIndicator) {
    return null;
  }
  
  return (
    <div className={`fixed bottom-4 right-4 p-2 rounded-full z-50 transition-opacity duration-300 
      ${isOnline ? 'bg-green-500 text-white' : 'bg-red-500 text-white'} 
      ${showIndicator ? 'opacity-100' : 'opacity-0'}`}
    >
      {isOnline ? (
        <Wifi className="h-6 w-6" />
      ) : (
        <WifiOff className="h-6 w-6" />
      )}
    </div>
  );
}

export default NetworkStatus;