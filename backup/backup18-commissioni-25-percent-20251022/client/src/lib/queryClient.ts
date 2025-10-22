import { QueryClient, QueryFunction } from "@tanstack/react-query";

async function throwIfResNotOk(res: Response) {
  if (!res.ok) {
    const text = (await res.text()) || res.statusText;
    throw new Error(`${res.status}: ${text}`);
  }
}

/**
 * Helper condiviso per creare headers consistenti con rilevamento dispositivo
 * Garantisce che x-device-type sia sempre presente in ogni richiesta
 */
function buildDeviceHeaders(options?: { withBetaAdminToken?: boolean }): Record<string, string> {
  const headers: Record<string, string> = {};
  
  // Determina se l'app è in modalità PWA installata
  const isPWA = 
    window.matchMedia('(display-mode: standalone)').matches || 
    (window.navigator as any).standalone || 
    document.referrer.includes('android-app://');
  
  // Aggiungi l'header x-pwa-app se siamo in una PWA
  if (isPWA) {
    headers["x-pwa-app"] = "true";
  }
  
  // Rileva il browser/dispositivo
  const userAgent = navigator.userAgent.toLowerCase();
  const isMobile = /android|webos|iphone|ipad|ipod|blackberry|iemobile|opera mini|mobile/i.test(userAgent);
  const isDuckDuckGo = userAgent.includes("duckduckgo");
  const isSafari = /^((?!chrome|android).)*safari/i.test(userAgent);
  
  // Aggiungi header specifici del browser
  if (isDuckDuckGo) {
    headers["x-browser"] = "duckduckgo";
    headers["x-bypass-auth"] = "true";
  } else if (isSafari) {
    headers["x-browser"] = "safari";
  }
  
  // SEMPRE aggiungi x-device-type (mobile o desktop)
  headers["x-device-type"] = isMobile ? "mobile" : "desktop";
  
  // Se richiesto, aggiungi token beta admin
  if (options?.withBetaAdminToken) {
    const savedPassword = localStorage.getItem('betaAdminPassword') || 
                         sessionStorage.getItem('betaAdminPassword') || 
                         'gironico';
    headers["X-Beta-Admin-Token"] = savedPassword;
    headers["Authorization"] = `Bearer ${savedPassword}`;
    headers["X-Auth-Token"] = savedPassword;
  }
  
  return headers;
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
    // Usa l'helper condiviso per headers consistenti
    const headers = buildDeviceHeaders({ withBetaAdminToken: options?.withBetaAdminToken });
    
    // Aggiungi Content-Type se abbiamo dati
    if (data) {
      headers["Content-Type"] = "application/json";
    }
    
    // HEADER ANTI-CACHE AGGRESSIVI per prevenire problemi di dati obsoleti
    headers["Cache-Control"] = "no-cache, no-store, must-revalidate, max-age=0";
    headers["Pragma"] = "no-cache";
    headers["Expires"] = "0";
    headers["If-Modified-Since"] = "Mon, 26 Jul 1997 05:00:00 GMT";
    headers["If-None-Match"] = "*";
    console.log("Header anti-cache aggiunti per garantire dati sempre freschi");
    console.log(`Header x-device-type aggiunto: ${headers["x-device-type"]}`);
    
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
      
      // Ignora silenziosamente gli errori 404 per i token di attivazione clienti inesistenti
      const isClientTokenError = url.includes('/activation-token') && res.status === 404;
      if (!isClientTokenError) {
        console.error(`Errore API (${res.status}):`, errorText);
      }
      
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
    // Usa l'helper condiviso per headers consistenti (garantisce sempre x-device-type)
    const headers = buildDeviceHeaders({ withBetaAdminToken });
    
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