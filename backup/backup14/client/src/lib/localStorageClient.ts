import { apiRequest } from '@/lib/queryClient';

/**
 * LocalStorageClient - Servizio per gestire il salvataggio locale delle credenziali
 * e il ripristino delle sessioni degli utenti client nei dispositivi mobili
 */
class LocalStorageClient {
  private readonly STORAGE_KEY = 'client_auth_data';
  
  /**
   * Salva le credenziali del cliente nel localStorage
   */
  storeCredentials(username: string, clientId: string | number, token: string): void {
    try {
      const data = {
        username,
        clientId: typeof clientId === 'string' ? parseInt(clientId, 10) : clientId,
        token,
        lastLoginTime: new Date().toISOString(),
      };
      
      localStorage.setItem(this.STORAGE_KEY, JSON.stringify(data));
      console.log('Credenziali salvate nel localStorage');
    } catch (error) {
      console.error('Errore nel salvataggio delle credenziali:', error);
    }
  }
  
  /**
   * Verifica se esistono credenziali salvate
   */
  hasStoredCredentials(): boolean {
    try {
      const data = localStorage.getItem(this.STORAGE_KEY);
      return !!data;
    } catch (error) {
      console.error('Errore nel controllo delle credenziali salvate:', error);
      return false;
    }
  }
  
  /**
   * Recupera le credenziali salvate
   */
  getStoredCredentials(): { username: string; clientId: number; token: string } | null {
    try {
      const data = localStorage.getItem(this.STORAGE_KEY);
      if (!data) return null;
      
      return JSON.parse(data);
    } catch (error) {
      console.error('Errore nel recupero delle credenziali:', error);
      return null;
    }
  }
  
  /**
   * Tenta di ripristinare una sessione client usando le credenziali salvate
   */
  async restoreClientSession(): Promise<boolean> {
    try {
      const credentials = this.getStoredCredentials();
      if (!credentials) return false;
      
      const { username, clientId, token } = credentials;
      
      // Prima verifichiamo la validità del token
      const verifyResponse = await apiRequest('POST', '/api/verify-token', { token, clientId });
      
      if (!verifyResponse.ok) {
        console.warn('Token non valido durante il ripristino della sessione');
        return false;
      }
      
      // Effettuiamo il login usando l'API semplificata
      const loginUrl = `/api/client/simple-login?username=${encodeURIComponent(username)}&clientId=${clientId}&token=${encodeURIComponent(token)}`;
      const loginResponse = await fetch(loginUrl, {
        method: 'GET',
        headers: {
          'Accept': 'application/json',
          'X-PWA-Client': 'true'
        }
      });
      
      if (loginResponse.ok) {
        console.log('Sessione client ripristinata con successo');
        return true;
      } else {
        console.warn('Impossibile ripristinare la sessione');
        return false;
      }
    } catch (error) {
      console.error('Errore durante il ripristino della sessione:', error);
      return false;
    }
  }
  
  /**
   * Cancella le credenziali salvate
   */
  clearStoredCredentials(): void {
    try {
      localStorage.removeItem(this.STORAGE_KEY);
      console.log('Credenziali rimosse dal localStorage');
    } catch (error) {
      console.error('Errore nella rimozione delle credenziali:', error);
    }
  }
}

export const localStorageClient = new LocalStorageClient();