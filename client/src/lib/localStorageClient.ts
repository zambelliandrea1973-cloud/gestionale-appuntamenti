/**
 * LocalStorageClient - Modulo di supporto per l'autenticazione dei client basata su localStorage
 * Fornisce funzioni per migliorare l'accesso quando si ha una connessione instabile o
 * quando ci sono problemi con le richieste POST che usano un corpo JSON.
 */

import { apiRequest } from "./queryClient";

// Interfaccia per i dati utente del client
interface ClientUser {
  id: number;
  username: string;
  type: string;
  clientId: number;
  client?: any;
  token?: string;
}

// Interfaccia per le opzioni di login
interface LoginOptions {
  useSimpleLogin?: boolean;
  forceRefresh?: boolean;
  pwaMode?: boolean;
}

/**
 * Modulo per gestire l'autenticazione cliente basata su localStorage
 */
export const localStorageClient = {
  /**
   * Verifica se ci sono credenziali memorizzate nel localStorage
   */
  hasStoredCredentials(): boolean {
    const username = localStorage.getItem('clientUsername');
    const clientId = localStorage.getItem('clientId');
    const token = localStorage.getItem('clientAccessToken');
    
    return !!(username && clientId && token);
  },
  
  /**
   * Salva le credenziali del cliente nel localStorage
   */
  storeCredentials(username: string, clientId: number | string, token: string, password?: string): void {
    localStorage.setItem('clientUsername', username);
    localStorage.setItem('clientId', clientId.toString());
    localStorage.setItem('clientAccessToken', token);
    
    // Salva anche come qrData per compatibilità con versioni precedenti
    localStorage.setItem('qrData', token);
    
    // Salva la password solo se specificata (per PWA)
    if (password) {
      localStorage.setItem('clientPassword', password);
    }
    
    console.log(`Credenziali salvate per ${username} (ID: ${clientId})`);
  },
  
  /**
   * Recupera le credenziali dal localStorage
   */
  getStoredCredentials(): { username: string | null; clientId: string | null; token: string | null; password: string | null } {
    return {
      username: localStorage.getItem('clientUsername'),
      clientId: localStorage.getItem('clientId'),
      token: localStorage.getItem('clientAccessToken') || localStorage.getItem('qrData'),
      password: localStorage.getItem('clientPassword')
    };
  },
  
  /**
   * Rimuove le credenziali dal localStorage
   */
  clearCredentials(): void {
    localStorage.removeItem('clientUsername');
    localStorage.removeItem('clientId');
    localStorage.removeItem('clientAccessToken');
    localStorage.removeItem('qrData');
    localStorage.removeItem('clientPassword');
    
    console.log("Credenziali client rimosse");
  },
  
  /**
   * Esegue login con le credenziali memorizzate usando l'API GET semplificata
   */
  async loginWithStoredCredentials(options: LoginOptions = {}): Promise<ClientUser | null> {
    try {
      const { username, clientId, token } = this.getStoredCredentials();
      
      // Verifica se abbiamo tutte le informazioni necessarie
      if (!username || !clientId || !token) {
        console.log("Credenziali memorizzate incomplete");
        return null;
      }
      
      // Rileva se siamo in modalità PWA
      const isPWA = options.pwaMode !== undefined 
        ? options.pwaMode 
        : (window.matchMedia('(display-mode: standalone)').matches || 
          (window.navigator as any).standalone || 
          document.referrer.includes('android-app://'));
      
      // Opzione per usare l'API semplificata (GET) oppure il metodo POST standard
      if (options.useSimpleLogin) {
        console.log("Usando endpoint simple-login (GET)");
        
        // Costruisci l'URL con i parametri di query
        const url = `/api/client/simple-login?username=${encodeURIComponent(username)}&clientId=${clientId}&token=${encodeURIComponent(token)}&pwa=${isPWA}`;
        
        // Esegui la richiesta GET
        const response = await fetch(url, {
          method: 'GET',
          credentials: 'include',
          headers: {
            'x-pwa-client': isPWA ? 'true' : 'false'
          }
        });
        
        if (response.ok) {
          const data = await response.json();
          console.log("Login via GET completato con successo");
          return data.user;
        } else {
          console.error("Login via GET fallito:", await response.text());
          return null;
        }
      } else {
        // Usa il metodo POST standard (può fallire con errore duplex)
        console.log("Usando endpoint standard (POST)");
        
        const requestData = {
          username,
          password: this.getStoredCredentials().password || 'token-auth-placeholder',
          token,
          clientId: parseInt(clientId, 10),
          bypassAuth: true,
          pwaInstalled: isPWA
        };
        
        const response = await apiRequest('POST', '/api/client/login', requestData);
        
        if (response.ok) {
          const user = await response.json();
          console.log("Login via POST completato con successo");
          return user;
        }
      }
      
      return null;
    } catch (error) {
      console.error("Errore durante login con credenziali memorizzate:", error);
      return null;
    }
  },
  
  /**
   * Ripristina la sessione del cliente usando localStorage
   * (utilizza di default il metodo GET semplificato)
   */
  async restoreClientSession(): Promise<boolean> {
    try {
      if (!this.hasStoredCredentials()) {
        console.log("Nessuna credenziale memorizzata da ripristinare");
        return false;
      }
      
      // Tenta prima con il metodo GET semplificato
      let user = await this.loginWithStoredCredentials({ useSimpleLogin: true });
      
      // Se fallisce, prova con il metodo POST come fallback
      if (!user) {
        console.log("Tentativo con metodo GET fallito, provo con POST...");
        user = await this.loginWithStoredCredentials({ useSimpleLogin: false });
      }
      
      return !!user;
    } catch (error) {
      console.error("Errore nel ripristino della sessione:", error);
      return false;
    }
  }
};

export default localStorageClient;