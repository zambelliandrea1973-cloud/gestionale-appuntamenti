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
    
    // Aggiungi l'header x-pwa-app se siamo in una PWA
    if (isPWA) {
      headers["x-pwa-app"] = "true";
      console.log("Modalità PWA rilevata, aggiunto header x-pwa-app");
    }
    
    // Se è richiesto il token di autenticazione per l'area beta admin
    if (options?.withBetaAdminToken) {
      const savedPassword = localStorage.getItem('betaAdminPassword') || 'gironico';
      headers["X-Beta-Admin-Token"] = savedPassword;
      // Aggiunge un altro header per dispositivi mobili che potrebbero avere problemi con la gestione delle intestazioni
      headers["Authorization"] = `Bearer ${savedPassword}`;
      console.log("Aggiunto token di autenticazione per l'area beta admin", { 
        password: savedPassword ? '***' : undefined,  // Nascosto per motivi di sicurezza
        headerCount: Object.keys(headers).length,
        isAuthSet: !!headers["Authorization"]
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
      const savedPassword = localStorage.getItem('betaAdminPassword') || 'gironico';
      headers["X-Beta-Admin-Token"] = savedPassword;
      // Aggiunge un altro header per dispositivi mobili che potrebbero avere problemi con la gestione delle intestazioni
      headers["Authorization"] = `Bearer ${savedPassword}`;
      console.log("Aggiunto token di autenticazione per l'area beta admin (query)", { 
        password: savedPassword ? '***' : undefined,  // Nascosto per motivi di sicurezza
        headerCount: Object.keys(headers).length,
        isAuthSet: !!headers["Authorization"]
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
      refetchOnWindowFocus: false,
      staleTime: Infinity,
      retry: false,
    },
    mutations: {
      retry: false,
    },
  },
});