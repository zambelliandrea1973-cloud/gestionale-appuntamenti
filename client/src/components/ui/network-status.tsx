import React, { useEffect, useState, useCallback } from 'react';
import { Wifi, WifiOff, AlertTriangle, Server } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { useToast } from '@/hooks/use-toast';
import axios from 'axios';

/**
 * Componente avanzato che gestisce e visualizza lo stato della connessione di rete
 * Include monitoraggio attivo del server e feedback visuale migliorato
 * Versione 2.0 con controllo proattivo dello stato del server
 */
export function NetworkStatus() {
  const { t } = useTranslation();
  const { toast } = useToast();
  const [isOnline, setIsOnline] = useState(navigator.onLine);
  const [showIndicator, setShowIndicator] = useState(false);
  const [serverStatus, setServerStatus] = useState<'online' | 'offline' | 'unknown'>('unknown');
  const [lastPingSuccess, setLastPingSuccess] = useState<Date | null>(null);
  const [reconnecting, setReconnecting] = useState(false);
  
  // Funzione per tentare il ping al server
  const pingServer = useCallback(async () => {
    if (!navigator.onLine) {
      setServerStatus('offline');
      return false;
    }
    
    try {
      // Aggiungiamo parametro casuale per evitare il caching
      const timestamp = Date.now();
      const response = await axios.get(`/api/health?_=${timestamp}`, {
        timeout: 5000,
        headers: {
          'Cache-Control': 'no-cache, no-store',
          'Pragma': 'no-cache'
        }
      });
      
      if (response.status === 200) {
        setServerStatus('online');
        setLastPingSuccess(new Date());
        return true;
      } else {
        setServerStatus('offline');
        return false;
      }
    } catch (error) {
      setServerStatus('offline');
      return false;
    }
  }, []);
  
  // Funzione per tentare di riconnettere al server
  const attemptReconnection = useCallback(async () => {
    if (reconnecting || !navigator.onLine) return;
    
    setReconnecting(true);
    
    // Mostra toast di tentativo riconnessione
    toast({
      title: t('common.reconnectingTitle'),
      description: t('common.reconnectingDescription'),
      variant: 'default',
    });
    
    // Tenta ping multipli con backoff esponenziale
    const maxAttempts = 3;
    let attempt = 1;
    let success = false;
    
    while (attempt <= maxAttempts && !success) {
      try {
        const result = await pingServer();
        if (result) {
          success = true;
          break;
        }
      } catch (error) {
        // Continua con il prossimo tentativo
      }
      
      // Attendi prima del prossimo tentativo (backoff esponenziale)
      const delayMs = Math.min(1000 * Math.pow(2, attempt - 1), 10000);
      await new Promise(resolve => setTimeout(resolve, delayMs));
      attempt++;
    }
    
    if (success) {
      toast({
        title: t('common.serverReconnected'),
        description: t('common.serverConnectionRestored'),
        variant: 'default',
      });
    } else {
      toast({
        title: t('common.serverOfflineTitle'),
        description: t('common.serverConnectionFailed'),
        variant: 'destructive',
      });
    }
    
    setReconnecting(false);
  }, [reconnecting, pingServer, toast, t]);
  
  // Gestione cambio stato online/offline
  const handleOnlineStatusChange = useCallback(() => {
    const online = navigator.onLine;
    setIsOnline(online);
    setShowIndicator(true);
    
    // Nascondi l'indicatore dopo 8 secondi (aumentato da 5 per migliore visibilità)
    setTimeout(() => setShowIndicator(false), 8000);
    
    // Mostra un toast in base allo stato
    if (online) {
      toast({
        title: t('common.onlineStatus'),
        description: t('common.connectionRestored'),
        variant: 'default',
      });
      
      // Se torniamo online, verifica anche lo stato del server
      setTimeout(() => {
        pingServer();
      }, 1000);
    } else {
      toast({
        title: t('common.offlineStatus'),
        description: t('common.connectionLost'),
        variant: 'destructive',
      });
      setServerStatus('offline');
    }
    
    // Comunica col service worker quando cambia lo stato della connessione
    if ('serviceWorker' in navigator && navigator.serviceWorker.controller) {
      navigator.serviceWorker.controller.postMessage({
        type: 'ONLINE_STATUS_CHANGE',
        isOnline: online
      });
    }
  }, [toast, t, pingServer]);
  
  // Effetto principale per setup listeners e ping periodico
  useEffect(() => {
    // Configura l'intervallo di ping del server
    const pingInterval = setInterval(() => {
      if (navigator.onLine) {
        pingServer();
      }
    }, 30000); // Ping ogni 30 secondi
    
    // Esegui ping iniziale
    pingServer();
    
    // Ascolta gli eventi "online" e "offline"
    window.addEventListener('online', handleOnlineStatusChange);
    window.addEventListener('offline', handleOnlineStatusChange);
    
    // Controlla subito lo stato della connessione
    if (!navigator.onLine) {
      setShowIndicator(true);
      setServerStatus('offline');
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
          
          // Verifica stato server quando torniamo online
          pingServer();
        }
      });
    }
    
    // Cleanup
    return () => {
      clearInterval(pingInterval);
      window.removeEventListener('online', handleOnlineStatusChange);
      window.removeEventListener('offline', handleOnlineStatusChange);
    };
  }, [handleOnlineStatusChange, pingServer, toast, t]);
  
  // Effetto per monitorare cambiamenti dello stato del server
  useEffect(() => {
    // Se il server passa da online a offline e il client è online, mostra una notifica
    if (serverStatus === 'offline' && isOnline && !reconnecting) {
      toast({
        title: t('common.serverOfflineTitle'),
        description: t('common.serverOfflineDescription'),
        variant: 'destructive',
      });
      
      // Tenta di riconnettersi automaticamente
      attemptReconnection();
    }
  }, [serverStatus, isOnline, toast, t, reconnecting, attemptReconnection]);
  
  // Determina l'icona e lo stile in base allo stato
  const getStatusDisplay = () => {
    if (!isOnline) {
      return {
        icon: <WifiOff className="h-6 w-6" />,
        bgColor: 'bg-red-500',
        tooltip: t('common.offlineStatus')
      };
    } else if (serverStatus === 'offline') {
      return {
        icon: <Server className="h-6 w-6" />,
        bgColor: 'bg-amber-500',
        tooltip: t('common.serverOfflineTitle')
      };
    } else if (reconnecting) {
      return {
        icon: <AlertTriangle className="h-6 w-6 animate-pulse" />,
        bgColor: 'bg-amber-400',
        tooltip: t('common.reconnectingTitle')
      };
    } else {
      return {
        icon: <Wifi className="h-6 w-6" />,
        bgColor: 'bg-green-500',
        tooltip: t('common.onlineStatus')
      };
    }
  };
  
  // Calcola se mostrare l'indicatore
  const shouldShowIndicator = () => {
    if (!isOnline || serverStatus === 'offline' || reconnecting) {
      return true;
    }
    
    return showIndicator;
  };
  
  const { icon, bgColor, tooltip } = getStatusDisplay();
  
  // Mostra sempre l'indicatore se siamo offline o il server è offline
  if (!shouldShowIndicator()) {
    return null;
  }
  
  return (
    <div 
      className={`fixed bottom-4 right-4 p-2 rounded-full z-50 transition-all duration-300 shadow-md
        ${bgColor} text-white cursor-pointer
        ${shouldShowIndicator() ? 'opacity-100 scale-100' : 'opacity-0 scale-95'}`}
      title={tooltip}
      onClick={reconnecting ? undefined : attemptReconnection}
    >
      {icon}
      
      {/* Mostra pulsante di riconnessione manuale se offline o server offline */}
      {(serverStatus === 'offline' && isOnline && !reconnecting) && (
        <div className="absolute -top-10 -left-20 bg-white text-black px-2 py-1 rounded text-xs shadow-lg">
          {t('common.tapToReconnect')}
        </div>
      )}
    </div>
  );
}

export default NetworkStatus;