import { QueryClient, QueryFunction } from "@tanstack/react-query";

async function throwIfResNotOk(res: Response) {
  if (!res.ok) {
    const text = (await res.text()) || res.statusText;
    throw new Error(`${res.status}: ${text}`);
  }
}

export async function apiRequest(
  method: string,
  url: string,
  data?: unknown | undefined,
): Promise<Response> {
  console.log(`Esecuzione richiesta ${method} a ${url}`, data ? JSON.stringify(data) : "");
  
  // Determina se l'app è in modalità PWA installata
  const isPWA = 
    window.matchMedia('(display-mode: standalone)').matches || 
    (window.navigator as any).standalone || // Proprietà disponibile solo su Safari iOS
    document.referrer.includes('android-app://');
  
  // Configura il numero massimo di tentativi di richiesta
  const MAX_RETRIES = 2;
  let retryCount = 0;
  let lastError: any = null;

  // Implementiamo un meccanismo di retry con backoff esponenziale
  while (retryCount <= MAX_RETRIES) {
    try {
      // Configura un timeout per la richiesta
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 10000); // 10 secondi timeout
      
      // Crea gli headers di base
      const headers: Record<string, string> = {};
      
      // Aggiungi Content-Type se abbiamo dati
      if (data) {
        headers["Content-Type"] = "application/json";
      }
      
      // Aggiungi l'header x-pwa-app se siamo in una PWA
      if (isPWA) {
        headers["x-pwa-app"] = "true";
        console.log("Modalità PWA rilevata, aggiunto header x-pwa-app");
      }
      
      // Se è DuckDuckGo, aggiunge un flag specifico
      const isDuckDuckGo = navigator.userAgent.includes("DuckDuckGo");
      if (isDuckDuckGo) {
        headers["x-browser"] = "duckduckgo";
        headers["x-bypass-auth"] = "true"; // Indica al server di usare modalità speciale di autenticazione
        console.log("Browser DuckDuckGo rilevato, aggiunti header specifici");
      }
      
      // Aggiungi token client se disponibile per endpoints client-related
      const storedToken = localStorage.getItem('clientAccessToken');
      const storedClientId = localStorage.getItem('clientId');
      
      if (storedToken && storedClientId && 
         (url.includes('/client/') || url.includes('/appointments/client/'))) {
        headers["x-client-token"] = storedToken;
        headers["x-client-id"] = storedClientId;
        console.log("Aggiunti token client negli headers per autenticazione fallback");
      }
      
      if (retryCount > 0) {
        console.log(`Tentativo #${retryCount + 1} per ${method} ${url}`);
        headers["x-retry-attempt"] = `${retryCount}`;
      }
      
      console.log(`Dettagli richiesta ${method} a ${url}:`, { 
        method, 
        headers,
        body: data ? JSON.stringify(data) : undefined,
        retry: retryCount
      });
      
      const res = await fetch(url, {
        method,
        headers,
        body: data ? JSON.stringify(data) : undefined,
        credentials: "include",
        signal: controller.signal,
        duplex: 'half' // Aggiunto per risolvere l'errore duplex con le richieste con corpo
      });
      
      clearTimeout(timeoutId);
      
      console.log(`Risposta da ${url}:`, res.status, res.statusText, 'ok:', res.ok);
      
      // Se otteniamo 401 in un endpoint client e abbiamo credenziali salvate,
      // tentiamo di ricreare la sessione prima di riprovare
      if (res.status === 401 && 
          url !== '/api/client/login' && 
          url.includes('/api/') &&
          (url.includes('/client/') || url.includes('/appointments/client/')) && 
          storedToken && 
          storedClientId && 
          localStorage.getItem('clientUsername') &&
          retryCount < MAX_RETRIES) {
        
        console.log("Rilevato errore 401 in endpoint cliente, tentativo di refresh sessione...");
        
        try {
          // Tenta di ricreare la sessione
          const username = localStorage.getItem('clientUsername');
          const password = localStorage.getItem('clientPassword') || '';
          
          const loginData = {
            username,
            password: password || 'token-auth-placeholder',
            token: storedToken,
            clientId: Number(storedClientId),
            bypassAuth: true,
            pwaInstalled: isPWA,
            recreateSession: true
          };
          
          console.log("Tentativo di ricreare sessione:", { ...loginData, password: password ? '[HIDDEN]' : '[EMPTY]' });
          
          const loginRes = await fetch('/api/client/login', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(loginData),
            credentials: 'include',
            duplex: 'half' // Aggiunto per risolvere l'errore duplex con le richieste con corpo
          });
          
          if (loginRes.ok) {
            const userData = await loginRes.json();
            console.log("Sessione ricreata con successo, ritento richiesta originale");
            
            // Aggiorniamo il token se c'è uno nuovo
            if (userData.token) {
              localStorage.setItem('clientAccessToken', userData.token);
            }
            
            // Incrementa il contatore dei retry e ricomincia il ciclo
            retryCount++;
            continue;
          } else {
            console.error("Impossibile ricreare la sessione:", await loginRes.text());
          }
        } catch (authError) {
          console.error("Errore durante il tentativo di ricreare la sessione:", authError);
        }
      }
      
      // Se non siamo riusciti a gestire 401 in modo speciale, gestiamo gli errori normalmente
      if (!res.ok) {
        const errorText = await res.text();
        console.error(`Errore API (${res.status}):`, errorText);
        
        // Se abbiamo ancora tentativi disponibili, proviamo di nuovo
        if (retryCount < MAX_RETRIES && res.status >= 500) {
          retryCount++;
          const delay = 1000 * Math.pow(2, retryCount - 1); // Backoff esponenziale
          console.log(`Riprovo tra ${delay}ms...`);
          await new Promise(resolve => setTimeout(resolve, delay));
          continue;
        }
        
        throw new Error(`Errore ${res.status}: ${errorText || res.statusText}`);
      }
      
      // Cloniamo la risposta prima di restituirla per evitare problemi di "already consumed body"
      return res.clone();
    } catch (error: any) {
      lastError = error;
      console.error(`Eccezione durante la richiesta a ${url} (tentativo ${retryCount+1}/${MAX_RETRIES+1}):`, error);
      
      // Non ritentare su abort intenzionali
      if (error?.name === 'AbortError' || retryCount >= MAX_RETRIES) {
        break;
      }
      
      // Attendi un po' prima di riprovare (backoff esponenziale)
      const delay = 1000 * Math.pow(2, retryCount);
      console.log(`Attesa di ${delay}ms prima del prossimo tentativo...`);
      await new Promise(resolve => setTimeout(resolve, delay));
      retryCount++;
    }
  }
  
  // Se arriviamo qui, tutti i tentativi sono falliti
  throw lastError || new Error(`Richiesta fallita dopo ${MAX_RETRIES + 1} tentativi`);
}

type UnauthorizedBehavior = "returnNull" | "throw";
export const getQueryFn: <T>(options: {
  on401: UnauthorizedBehavior;
}) => QueryFunction<T> =
  ({ on401: unauthorizedBehavior }) =>
  async ({ queryKey }) => {
    // Configura il numero massimo di tentativi di richiesta
    const MAX_RETRIES = 2;
    let retryCount = 0;
    let lastError: any = null;
    
    // Implementiamo un meccanismo di retry con backoff esponenziale
    while (retryCount <= MAX_RETRIES) {
      try {
        // Configura un timeout per la richiesta
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), 10000); // 10 secondi timeout
      
        // Determina se l'app è in modalità PWA installata
        const isPWA = 
          window.matchMedia('(display-mode: standalone)').matches || 
          (window.navigator as any).standalone || // Proprietà disponibile solo su Safari iOS
          document.referrer.includes('android-app://');
        
        // Crea gli headers di base
        const headers: Record<string, string> = {};
        
        // Aggiungi l'header x-pwa-app se siamo in una PWA
        if (isPWA) {
          headers["x-pwa-app"] = "true";
        }
        
        // Se è DuckDuckGo, aggiunge un flag specifico
        const isDuckDuckGo = navigator.userAgent.includes("DuckDuckGo");
        if (isDuckDuckGo) {
          headers["x-browser"] = "duckduckgo";
          headers["x-bypass-auth"] = "true"; // Indica al server di usare modalità speciale di autenticazione
        }
        
        // Aggiungi token client se disponibile per endpoints client-related
        const storedToken = localStorage.getItem('clientAccessToken');
        const storedClientId = localStorage.getItem('clientId');
        const url = queryKey[0] as string;
        
        if (storedToken && storedClientId && 
           (url.includes('/client/') || url.includes('/appointments/client/'))) {
          headers["x-client-token"] = storedToken;
          headers["x-client-id"] = storedClientId;
        }
        
        if (retryCount > 0) {
          headers["x-retry-attempt"] = `${retryCount}`;
        }
        
        const res = await fetch(url, {
          credentials: "include",
          headers,
          signal: controller.signal
        });
        
        clearTimeout(timeoutId);
        
        // Gestione errori 401
        if (res.status === 401) {
          // Se l'opzione è returnNull, restituisci null
          if (unauthorizedBehavior === "returnNull") {
            return null;
          }
          
          // Se abbiamo ancora tentativi e siamo in un endpoint client, possiamo ritentare
          if (retryCount < MAX_RETRIES && 
              (url.includes('/client/') || url.includes('/appointments/client/')) && 
              storedToken && 
              storedClientId && 
              localStorage.getItem('clientUsername')) {
            
            try {
              console.log("Tentativo di rinnovare sessione...");
              
              // Tenta di ricreare la sessione
              const username = localStorage.getItem('clientUsername');
              const password = localStorage.getItem('clientPassword') || '';
              
              const loginData = {
                username,
                password: password || 'token-auth-placeholder',
                token: storedToken,
                clientId: Number(storedClientId),
                bypassAuth: true,
                pwaInstalled: isPWA,
                recreateSession: true
              };
              
              const loginRes = await fetch('/api/client/login', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(loginData),
                credentials: 'include',
                duplex: 'half' // Aggiunto per risolvere l'errore duplex con le richieste con corpo
              });
              
              if (loginRes.ok) {
                const userData = await loginRes.json();
                
                // Aggiorniamo il token se c'è uno nuovo
                if (userData.token) {
                  localStorage.setItem('clientAccessToken', userData.token);
                }
                
                // Incrementa il contatore dei retry e ricomincia il ciclo
                retryCount++;
                continue;
              }
            } catch (authError) {
              console.error("Errore durante il tentativo di ricreare la sessione:", authError);
            }
          }
          
          // Se arriviamo qui, o non abbiamo potuto ritentare o abbiamo fallito nel farlo
          if (unauthorizedBehavior === "throw") {
            const errorText = await res.text();
            throw new Error(`Errore 401: ${errorText || res.statusText}`);
          }
        }
        
        // Per altri errori
        if (!res.ok) {
          const errorText = await res.text();
          
          // Se abbiamo ancora tentativi disponibili, proviamo di nuovo
          if (retryCount < MAX_RETRIES && res.status >= 500) {
            retryCount++;
            const delay = 1000 * Math.pow(2, retryCount - 1); // Backoff esponenziale
            await new Promise(resolve => setTimeout(resolve, delay));
            continue;
          }
          
          throw new Error(`${res.status}: ${errorText || res.statusText}`);
        }
        
        // Se siamo arrivati qui, la richiesta è andata a buon fine
        return await res.json();
      } catch (error: any) {
        lastError = error;
        
        // Non ritentare su abort intenzionali
        if (error?.name === 'AbortError' || retryCount >= MAX_RETRIES) {
          break;
        }
        
        // Attendi un po' prima di riprovare (backoff esponenziale)
        const delay = 1000 * Math.pow(2, retryCount);
        await new Promise(resolve => setTimeout(resolve, delay));
        retryCount++;
      }
    }
    
    // Se arriviamo qui, tutti i tentativi sono falliti
    throw lastError || new Error(`Richiesta fallita dopo ${MAX_RETRIES + 1} tentativi`);
  };

export const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      queryFn: getQueryFn({ on401: "throw" }),
      refetchInterval: false,
      refetchOnWindowFocus: false,
      staleTime: Infinity,
      retry: false,
    },
    mutations: {
      retry: false,
    },
  },
});