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
  options?: {
    withBetaAdminToken?: boolean
  }
): Promise<Response> {
  console.log(`Esecuzione richiesta ${method} a ${url}`, data ? JSON.stringify(data) : "");
  
  try {
    // Determina se l'app è in modalità PWA installata
    const isPWA = 
      window.matchMedia('(display-mode: standalone)').matches || 
      (window.navigator as any).standalone || // Proprietà disponibile solo su Safari iOS
      document.referrer.includes('android-app://');
    
    // Crea gli headers di base
    const headers: Record<string, string> = {};
    
    // Aggiungi Content-Type se abbiamo dati
    if (data) {
      headers["Content-Type"] = "application/json";
    }
    
    // Headers anti-cache per operazioni DELETE
    if (method === "DELETE") {
      headers["Cache-Control"] = "no-cache, no-store, must-revalidate";
      headers["Pragma"] = "no-cache";
      headers["Expires"] = "0";
      headers["X-No-Cache"] = "true";
    }
    
    // Aggiungi l'header x-pwa-app se siamo in una PWA
    if (isPWA) {
      headers["x-pwa-app"] = "true";
      console.log("Modalità PWA rilevata, aggiunto header x-pwa-app");
    }
    
    // Se è richiesto il token di autenticazione per l'area beta admin
    if (options?.withBetaAdminToken) {
      // Cerca in più posizioni per garantire massima compatibilità
      const savedPassword = localStorage.getItem('betaAdminPassword') || 
                           sessionStorage.getItem('betaAdminPassword') || 
                           'gironico';
      
      // Aggiungi il token in diversi header per massima compatibilità
      headers["X-Beta-Admin-Token"] = savedPassword;
      headers["Authorization"] = `Bearer ${savedPassword}`;
      headers["X-Auth-Token"] = savedPassword;
      
      // Log dettagliato per debug
      console.log("Aggiunto token di autenticazione per l'area beta admin", { 
        password: savedPassword ? '***' : undefined,  // Nascosto per motivi di sicurezza
        headerCount: Object.keys(headers).length,
        headers: Object.keys(headers).join(',')
      });
    }
    
    // Rileva il browser/dispositivo e aggiungi header specifici
    const userAgent = navigator.userAgent.toLowerCase();
    const isMobile = /android|webos|iphone|ipad|ipod|blackberry|iemobile|opera mini|mobile/i.test(userAgent);
    const isDuckDuckGo = userAgent.includes("duckduckgo");
    const isSafari = /^((?!chrome|android).)*safari/i.test(userAgent);
    
    // Aggiungi header per diversi tipi di browser/dispositivi
    if (isDuckDuckGo) {
      headers["x-browser"] = "duckduckgo";
      headers["x-bypass-auth"] = "true"; // Indica al server di usare modalità speciale di autenticazione
      console.log("Browser DuckDuckGo rilevato, aggiunti header specifici");
    } else if (isMobile) {
      headers["x-device-type"] = "mobile";
      console.log("Dispositivo mobile rilevato, aggiunti header specifici");
    } else if (isSafari) {
      headers["x-browser"] = "safari";
      console.log("Browser Safari rilevato, aggiunti header specifici");
    }
    
    // CORREZIONE: Aggiungi sempre x-device-type per garantire comportamento uniforme
    if (!headers["x-device-type"]) {
      headers["x-device-type"] = isMobile ? "mobile" : "desktop";
      console.log(`Header x-device-type aggiunto: ${headers["x-device-type"]}`);
    }
    
    // HEADER ANTI-CACHE AGGRESSIVI per prevenire problemi di dati obsoleti
    headers["Cache-Control"] = "no-cache, no-store, must-revalidate, max-age=0";
    headers["Pragma"] = "no-cache";
    headers["Expires"] = "0";
    headers["If-Modified-Since"] = "Mon, 26 Jul 1997 05:00:00 GMT";
    headers["If-None-Match"] = "*";
    console.log("Header anti-cache aggiunti per garantire dati sempre freschi");
    
    console.log(`Dettagli richiesta ${method} a ${url}:`, { 
      method, 
      headers,
      body: data ? JSON.stringify(data) : undefined
    });
    
    const res = await fetch(url, {
      method,
      headers,
      body: data ? JSON.stringify(data) : undefined,
      credentials: "include",
    });

    console.log(`Risposta da ${url}:`, res.status, res.statusText, 'ok:', res.ok);
    
    if (!res.ok) {
      const errorText = await res.text();
      console.error(`Errore API (${res.status}):`, errorText);
      throw new Error(`Errore ${res.status}: ${errorText || res.statusText}`);
    }
    
    // Cloniamo la risposta prima di restituirla per evitare problemi di "already consumed body"
    return res.clone();
  } catch (error) {
    console.error(`Eccezione durante la richiesta a ${url}:`, error);
    throw error;
  }
}

type UnauthorizedBehavior = "returnNull" | "throw";
export const getQueryFn: <T>(options: {
  on401: UnauthorizedBehavior;
  withBetaAdminToken?: boolean;
}) => QueryFunction<T> =
  ({ on401: unauthorizedBehavior, withBetaAdminToken = false }) =>
  async ({ queryKey }) => {
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
    
    // Se è richiesto il token di autenticazione per l'area beta admin
    if (withBetaAdminToken) {
      // Cerca in più posizioni per garantire massima compatibilità
      const savedPassword = localStorage.getItem('betaAdminPassword') || 
                           sessionStorage.getItem('betaAdminPassword') || 
                           'gironico';
      
      // Aggiungi il token in diversi header per massima compatibilità
      headers["X-Beta-Admin-Token"] = savedPassword;
      headers["Authorization"] = `Bearer ${savedPassword}`;
      headers["X-Auth-Token"] = savedPassword;
      
      // Log dettagliato per debug
      console.log("Aggiunto token di autenticazione per l'area beta admin (query)", { 
        password: savedPassword ? '***' : undefined,  // Nascosto per motivi di sicurezza
        headerCount: Object.keys(headers).length,
        headers: Object.keys(headers).join(',')
      });
    }
    
    // Rileva il browser/dispositivo e aggiungi header specifici
    const userAgent = navigator.userAgent.toLowerCase();
    const isMobile = /android|webos|iphone|ipad|ipod|blackberry|iemobile|opera mini|mobile/i.test(userAgent);
    const isDuckDuckGo = userAgent.includes("duckduckgo");
    const isSafari = /^((?!chrome|android).)*safari/i.test(userAgent);
    
    // Aggiungi header per diversi tipi di browser/dispositivi
    if (isDuckDuckGo) {
      headers["x-browser"] = "duckduckgo";
      headers["x-bypass-auth"] = "true"; // Indica al server di usare modalità speciale di autenticazione
    } else if (isMobile) {
      headers["x-device-type"] = "mobile";
    } else if (isSafari) {
      headers["x-browser"] = "safari";
    }
    
    const res = await fetch(queryKey[0] as string, {
      credentials: "include",
      headers
    });

    if (unauthorizedBehavior === "returnNull" && res.status === 401) {
      return null;
    }

    await throwIfResNotOk(res);
    return await res.json();
  };

export const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      queryFn: getQueryFn({ 
        on401: "throw",
        withBetaAdminToken: false
      }),
      refetchInterval: false,
      refetchOnWindowFocus: true,
      staleTime: 0, // Forza sempre richieste fresche
      gcTime: 0, // Rimuovi cache immediatamente
      retry: false,
    },
    mutations: {
      retry: false,
    },
  },
});