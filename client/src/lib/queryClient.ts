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
  
  try {
    // Determina se l'app è in modalità PWA installata
    const isPWA = 
      window.matchMedia('(display-mode: standalone)').matches || 
      window.navigator.standalone || 
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
    
    // Se è DuckDuckGo, aggiunge un flag specifico
    const isDuckDuckGo = navigator.userAgent.includes("DuckDuckGo");
    if (isDuckDuckGo) {
      headers["x-browser"] = "duckduckgo";
      console.log("Browser DuckDuckGo rilevato, aggiunto header specifico");
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
}) => QueryFunction<T> =
  ({ on401: unauthorizedBehavior }) =>
  async ({ queryKey }) => {
    // Determina se l'app è in modalità PWA installata
    const isPWA = 
      window.matchMedia('(display-mode: standalone)').matches || 
      window.navigator.standalone || 
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
