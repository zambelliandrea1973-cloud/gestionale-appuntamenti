/**
 * Sistema avanzato di cache lato client per gestire disconnessioni temporanee
 * Implementa un meccanismo di cache persistente che consente all'applicazione
 * di funzionare anche in caso di disconnessioni temporanee dal server.
 */

type CacheEntry = {
  data: any;
  timestamp: number;
  expires: number | null;
};

type StorageType = 'localStorage' | 'sessionStorage' | 'memory';

class OfflineCache {
  private readonly PREFIX = 'app_cache_';
  private readonly DEFAULT_TTL = 30 * 60 * 1000; // 30 minuti in millisecondi
  private readonly CRITICAL_TTL = 24 * 60 * 60 * 1000; // 24 ore per dati critici
  private memoryCache: Record<string, CacheEntry> = {};
  private isOnline: boolean = navigator.onLine;
  
  constructor() {
    // Registra listener per gli eventi online/offline
    window.addEventListener('online', this.handleOnlineStatusChange.bind(this));
    window.addEventListener('offline', this.handleOnlineStatusChange.bind(this));
    
    // Registra eventi del service worker se disponibile
    if ('serviceWorker' in navigator && navigator.serviceWorker.controller) {
      navigator.serviceWorker.addEventListener('message', (event) => {
        if (event.data && event.data.type === 'CACHE_UPDATED') {
          this.notifyCacheUpdate(event.data.key, event.data.data);
        }
      });
    }
    
    // Inizializza cache
    this.clearExpiredEntries();
    console.log('Sistema di cache offline inizializzato');
  }
  
  /**
   * Gestisce i cambiamenti di stato online/offline
   */
  private handleOnlineStatusChange() {
    const wasOnline = this.isOnline;
    this.isOnline = navigator.onLine;
    
    if (this.isOnline && !wasOnline) {
      // Appena tornati online, avvia sincronizzazione
      console.log('Connessione ripristinata, avvio sincronizzazione cache...');
      this.synchronizeCache();
    } else if (!this.isOnline && wasOnline) {
      console.log('Connessione persa, attivazione modalità offline');
    }
  }
  
  /**
   * Sincronizza la cache con il server quando torniamo online
   */
  private async synchronizeCache() {
    // Questa funzione potrebbe sincronizzare i dati modificati offline
    // con il server quando la connessione viene ripristinata
    // Il comportamento specifico dipenderà dalle necessità dell'applicazione
    
    // Per ora si limita a notificare l'avvenuta sincronizzazione
    const event = new CustomEvent('cache-synchronized');
    window.dispatchEvent(event);
  }
  
  /**
   * Salva dati nella cache
   */
  async set(key: string, data: any, options: {
    ttl?: number;
    storage?: StorageType;
    critical?: boolean;
  } = {}) {
    const fullKey = this.PREFIX + key;
    const ttl = options.critical ? this.CRITICAL_TTL : (options.ttl || this.DEFAULT_TTL);
    const timestamp = Date.now();
    const expires = ttl ? timestamp + ttl : null;
    const entry: CacheEntry = { data, timestamp, expires };
    
    const storageType = options.storage || 'localStorage';
    
    try {
      // Salva sempre in memoria per accesso veloce
      this.memoryCache[fullKey] = entry;
      
      // Salva nella storage specificata
      if (storageType === 'localStorage' || storageType === 'sessionStorage') {
        const storage = window[storageType];
        storage.setItem(fullKey, JSON.stringify(entry));
      }
      
      // Notifica il service worker se presente
      this.notifyServiceWorker(key, data);
      
      return true;
    } catch (error) {
      console.error(`Errore nel salvataggio della cache per ${key}:`, error);
      return false;
    }
  }
  
  /**
   * Recupera dati dalla cache
   */
  async get<T = any>(key: string, options: {
    checkExpiry?: boolean;
    storage?: StorageType;
    fallbackFetch?: () => Promise<T>;
  } = {}): Promise<T | null> {
    const fullKey = this.PREFIX + key;
    const checkExpiry = options.checkExpiry !== false;
    const storageType = options.storage || 'localStorage';
    
    try {
      // Prova prima in memoria
      let entry = this.memoryCache[fullKey] as CacheEntry | undefined;
      
      // Se non trovato in memoria, cerca nella storage specificata
      if (!entry && (storageType === 'localStorage' || storageType === 'sessionStorage')) {
        const storage = window[storageType];
        const rawData = storage.getItem(fullKey);
        if (rawData) {
          entry = JSON.parse(rawData) as CacheEntry;
          // Aggiorna la cache in memoria
          this.memoryCache[fullKey] = entry;
        }
      }
      
      // Se non trovato o scaduto
      if (!entry || (checkExpiry && entry.expires && entry.expires < Date.now())) {
        // Se siamo online e c'è una funzione di fallback, usala per aggiornare la cache
        if (this.isOnline && options.fallbackFetch) {
          try {
            const freshData = await options.fallbackFetch();
            await this.set(key, freshData, { storage: storageType });
            return freshData;
          } catch (fetchError) {
            console.error(`Errore nel recupero dati freschi per ${key}:`, fetchError);
            // Se c'è un errore ma abbiamo dati in cache, usiamo quelli anche se scaduti
            if (entry) {
              console.log(`Uso dati scaduti dalla cache per ${key}`);
              return entry.data as T;
            }
            return null;
          }
        } else if (!this.isOnline && entry) {
          // Se siamo offline, usa i dati in cache anche se scaduti
          console.log(`Modalità offline: uso dati scaduti dalla cache per ${key}`);
          return entry.data as T;
        }
        
        return null;
      }
      
      return entry.data as T;
    } catch (error) {
      console.error(`Errore nel recupero dalla cache per ${key}:`, error);
      
      // Se c'è un fallback e siamo online, usalo
      if (this.isOnline && options.fallbackFetch) {
        try {
          return await options.fallbackFetch();
        } catch (fetchError) {
          console.error(`Anche il fallback è fallito per ${key}:`, fetchError);
        }
      }
      
      return null;
    }
  }
  
  /**
   * Rimuove un elemento dalla cache
   */
  remove(key: string) {
    const fullKey = this.PREFIX + key;
    
    try {
      // Rimuovi dalla memoria
      delete this.memoryCache[fullKey];
      
      // Rimuovi da localStorage e sessionStorage
      localStorage.removeItem(fullKey);
      sessionStorage.removeItem(fullKey);
      
      return true;
    } catch (error) {
      console.error(`Errore nella rimozione dalla cache per ${key}:`, error);
      return false;
    }
  }
  
  /**
   * Pulisce tutta la cache
   */
  clear() {
    try {
      // Pulisci memoria
      this.memoryCache = {};
      
      // Pulisci localStorage e sessionStorage (solo gli elementi con il nostro prefisso)
      const storages = [localStorage, sessionStorage];
      storages.forEach(storage => {
        const toRemove: string[] = [];
        for (let i = 0; i < storage.length; i++) {
          const key = storage.key(i);
          if (key && key.startsWith(this.PREFIX)) {
            toRemove.push(key);
          }
        }
        
        toRemove.forEach(key => storage.removeItem(key));
      });
      
      return true;
    } catch (error) {
      console.error('Errore nella pulizia della cache:', error);
      return false;
    }
  }
  
  /**
   * Pulisce le voci scadute dalla cache
   */
  clearExpiredEntries() {
    const now = Date.now();
    
    try {
      // Pulisci dalla memoria
      Object.keys(this.memoryCache).forEach(key => {
        const entry = this.memoryCache[key];
        if (entry.expires && entry.expires < now) {
          delete this.memoryCache[key];
        }
      });
      
      // Pulisci da localStorage e sessionStorage
      const storages = [localStorage, sessionStorage];
      storages.forEach(storage => {
        const toRemove: string[] = [];
        for (let i = 0; i < storage.length; i++) {
          const key = storage.key(i);
          if (key && key.startsWith(this.PREFIX)) {
            try {
              const entry = JSON.parse(storage.getItem(key) || '{}') as CacheEntry;
              if (entry.expires && entry.expires < now) {
                toRemove.push(key);
              }
            } catch (e) {
              // Se c'è un errore di parsing, rimuovi comunque
              toRemove.push(key);
            }
          }
        }
        
        toRemove.forEach(key => storage.removeItem(key));
      });
      
      return true;
    } catch (error) {
      console.error('Errore nella pulizia della cache scaduta:', error);
      return false;
    }
  }
  
  /**
   * Notifica un aggiornamento della cache a tutti i listener registrati
   */
  private notifyCacheUpdate(key: string, data: any) {
    const event = new CustomEvent('cache-updated', {
      detail: { key, data }
    });
    window.dispatchEvent(event);
  }
  
  /**
   * Notifica il service worker di un aggiornamento della cache
   */
  private notifyServiceWorker(key: string, data: any) {
    if ('serviceWorker' in navigator && navigator.serviceWorker.controller) {
      navigator.serviceWorker.controller.postMessage({
        type: 'CACHE_UPDATE',
        key,
        data
      });
    }
  }
  
  /**
   * Ottiene lo stato corrente della cache
   */
  getStats() {
    const memoryEntries = Object.keys(this.memoryCache).length;
    
    let localStorageEntries = 0;
    let sessionStorageEntries = 0;
    
    try {
      for (let i = 0; i < localStorage.length; i++) {
        const key = localStorage.key(i);
        if (key && key.startsWith(this.PREFIX)) {
          localStorageEntries++;
        }
      }
      
      for (let i = 0; i < sessionStorage.length; i++) {
        const key = sessionStorage.key(i);
        if (key && key.startsWith(this.PREFIX)) {
          sessionStorageEntries++;
        }
      }
    } catch (e) {
      console.error('Errore nel calcolo delle statistiche cache:', e);
    }
    
    return {
      memoryEntries,
      localStorageEntries,
      sessionStorageEntries,
      totalEntries: memoryEntries + localStorageEntries + sessionStorageEntries,
      isOnline: this.isOnline
    };
  }
}

// Esporta un'istanza singleton
export const offlineCache = new OfflineCache();

/**
 * Hook per utilizzare la cache offline con React Query
 */
export function useOfflineQueryOptions<T>(key: string, ttl?: number) {
  // Prefisso per la chiave della cache
  const cacheKeyPrefix = 'app_cache_';
  
  return {
    staleTime: ttl || 5 * 60 * 1000, // 5 minuti di default
    cacheTime: ttl || 30 * 60 * 1000, // 30 minuti di default
    retry: navigator.onLine ? 3 : false, // Non ritenta se offline
    retryDelay: (attempt: number) => Math.min(1000 * 2 ** attempt, 30000),
    refetchOnWindowFocus: navigator.onLine,
    refetchOnReconnect: true,
    onSuccess: (data: T) => {
      // Salva i dati nella cache offline
      offlineCache.set(key, data, { ttl });
    },
    initialData: () => {
      // Cerca dati dalla cache offline come initialData
      const cachedData = localStorage.getItem(cacheKeyPrefix + key);
      if (cachedData) {
        try {
          const parsed = JSON.parse(cachedData);
          return parsed.data as T;
        } catch (e) {
          return undefined;
        }
      }
      return undefined;
    }
  };
}