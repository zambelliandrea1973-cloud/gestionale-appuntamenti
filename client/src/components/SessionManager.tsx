import { useEffect, useState } from 'react';
import { useLocation } from 'wouter';
import { localStorageClient } from '@/lib/localStorageClient';
import { apiRequest } from '@/lib/queryClient';

/**
 * SessionManager - Componente per gestire la sessione del client
 * Si occupa del ripristino automatico della sessione e del login semplificato
 * usando il localStorage
 */
export default function SessionManager() {
  const [, setLocation] = useLocation();
  const [initialized, setInitialized] = useState(false);
  const [tokenRestored, setTokenRestored] = useState(false);
  
  // Al caricamento della pagina, verifica se ci sono credenziali salvate
  useEffect(() => {
    const initialize = async () => {
      // Evita esecuzioni multiple
      if (initialized) return;
      setInitialized(true);
      
      // Cerca parametri nell'URL o nel localStorage
      if (window.location.pathname.includes('/client-area')) {
        // Se siamo già nell'area client, non fare nulla
        return;
      }
      
      // Se abbiamo un token nell'URL (link diretto), salvalo nel localStorage
      const urlParams = new URLSearchParams(window.location.search);
      const token = urlParams.get('token');
      const clientId = urlParams.get('clientId');
      
      if (token && clientId) {
        // Verifica che il token sia valido
        try {
          console.log("Verifying token from URL:", { token, clientId });
          const response = await apiRequest('POST', '/api/verify-token', { token, clientId });
          
          if (response.ok) {
            const data = await response.json();
            
            // Salva le credenziali per uso futuro
            if (data.username) {
              localStorageClient.storeCredentials(data.username, clientId, token);
              setTokenRestored(true);
              console.log("Token and credentials saved from URL");
            } else {
              console.warn("Valid token but username missing");
            }
          } else {
            console.error("Invalid token in URL");
          }
        } catch (error) {
          console.error("Error verifying token:", error);
        }
      }
      
      // Prova a ripristinare la sessione da localStorage
      if (localStorageClient.hasStoredCredentials() && !tokenRestored) {
        console.log("Attempting to restore session from localStorage");
        
        try {
          const restored = await localStorageClient.restoreClientSession();
          
          if (restored) {
            console.log("Session restored successfully");
            
            // Navigate to client area
            setTimeout(() => {
              setLocation('/client-area');
            }, 100);
          } else {
            console.warn("Unable to restore session");
          }
        } catch (error) {
          console.error("Error restoring session:", error);
        }
      }
    };
    
    // Esegui solo lato client e dopo che il DOM è completamente caricato
    if (typeof window !== 'undefined') {
      // Attendi un po' per assicurarci che tutto sia caricato
      const timer = setTimeout(() => {
        initialize();
      }, 500);
      
      return () => clearTimeout(timer);
    }
  }, [initialized, setLocation, tokenRestored]);

  // Componente senza UI
  return null;
}