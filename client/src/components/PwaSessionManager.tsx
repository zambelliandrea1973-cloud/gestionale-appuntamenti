import { useEffect, useState, useCallback } from "react";
import { useLocation } from "wouter";
import { useToast } from "@/hooks/use-toast";
import { Loader2, WifiOff } from "lucide-react";
import { apiRequest } from "@/lib/queryClient";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";

/**
 * Componente PwaSessionManager avanzato
 * 
 * Gestisce il mantenimento e ripristino delle sessioni in modalità PWA
 * con supporto per scenari offline-first e fallback per errori di rete.
 * Versione 3.0 con supporto per diagnostica avanzata e retry automatici.
 */
export default function PwaSessionManager({ children }: { children: React.ReactNode }) {
  const [isLoading, setIsLoading] = useState(true);
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [offlineMode, setOfflineMode] = useState(false);
  const [retryCount, setRetryCount] = useState(0);
  const [isRetrying, setIsRetrying] = useState(false);
  const [_, setLocation] = useLocation();
  const { toast } = useToast();
  
  // Funzione per verificare sessione con gestione rete
  const verifySession = useCallback(async (isRetry = false) => {
    try {
      // Verifica stato rete
      const isOnline = navigator.onLine;
      
      // Rileva se siamo in una PWA installata
      const isPWA = 
        window.matchMedia('(display-mode: standalone)').matches || 
        (window.navigator as any).standalone || 
        document.referrer.includes('android-app://');
      
      console.log("PwaSessionManager - Verifica sessione, isPWA:", isPWA, "online:", isOnline);
      
      // Recupera token e clientId dal localStorage
      const token = localStorage.getItem('clientAccessToken');
      const clientId = localStorage.getItem('clientId');
      const username = localStorage.getItem('clientUsername');
      const hasPassword = !!localStorage.getItem('clientPassword');
      
      // Log dettagliato
      console.log("PwaSessionManager - Stato token:", { 
        hasToken: !!token,
        hasClientId: !!clientId,
        hasUsername: !!username,
        hasPassword,
        isPWA,
        isOnline,
        retryAttempt: isRetry ? retryCount : 0
      });
      
      // Se non ci sono token o clientId, reindirizza al login
      if (!token || !clientId) {
        console.log("PwaSessionManager - Nessun token o clientId trovato");
        setIsAuthenticated(false);
        setIsLoading(false);
        // Reindirizza al login solo se siamo in PWA
        if (isPWA) {
          toast({
            title: "Sessione scaduta",
            description: "La tua sessione è scaduta, effettua nuovamente l'accesso.",
            variant: "destructive",
          });
          setTimeout(() => {
            setLocation("/client-login?expired=true");
          }, 1500);
        }
        return;
      }
      
      // Verifica connessione internet
      if (!isOnline) {
        console.log("PwaSessionManager - Modalità offline rilevata");
        
        // Verifica se abbiamo dati locali validi per il cliente
        const lastAuthTime = localStorage.getItem('lastAuthenticated');
        const localClientData = localStorage.getItem('clientData');
        
        if (lastAuthTime && localClientData) {
          // Controlla se l'autenticazione è abbastanza recente (ultimi 7 giorni)
          const lastAuth = new Date(lastAuthTime);
          const now = new Date();
          const daysDiff = (now.getTime() - lastAuth.getTime()) / (1000 * 60 * 60 * 24);
          
          if (daysDiff < 7) {
            console.log("PwaSessionManager - Usando dati client offline (cached)", daysDiff.toFixed(1) + " giorni");
            setOfflineMode(true);
            setIsAuthenticated(true);
            setIsLoading(false);
            
            // Mostra toast di modalità offline
            toast({
              title: "Modalità offline attiva",
              description: "Stai visualizzando i dati salvati localmente. Alcune funzionalità potrebbero essere limitate.",
              variant: "default",
            });
            
            return;
          }
        }
        
        // Se non abbiamo dati validi offline, mostra messaggio errore
        setOfflineMode(true);
        setIsAuthenticated(false);
        setIsLoading(false);
        return;
      }
      
      // Se online, verifica il token
      console.log("PwaSessionManager - Verifica token lato server");
      
      try {
        // Configura timeout e controller per fetch
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), 8000); // 8s timeout
        
        const response = await fetch('/api/verify-token', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'X-PWA-Client': isPWA ? 'true' : 'false',
            'X-Retry-Count': isRetry ? retryCount.toString() : '0'
          },
          body: JSON.stringify({ 
            token, 
            clientId: parseInt(clientId, 10),
            includeData: true
          }),
          credentials: 'include',
          signal: controller.signal
        });
        
        clearTimeout(timeoutId);
        
        if (response.ok) {
          // Token valido
          console.log("PwaSessionManager - Token valido");
          
          // Salva i dati del client per uso offline
          try {
            const userData = await response.json();
            localStorage.setItem('clientData', JSON.stringify(userData));
            localStorage.setItem('lastAuthenticated', new Date().toISOString());
          } catch (e) {
            console.error("Errore parsing dati client:", e);
          }
          
          setOfflineMode(false);
          setIsAuthenticated(true);
          setIsLoading(false);
          return;
        } else if (response.status === 401) {
          console.log("PwaSessionManager - Token non valido (401), tentativo recupero");
          await attemptSessionRecovery(isPWA);
        } else {
          console.log(`PwaSessionManager - Errore server: ${response.status}`);
          
          // Verifica tentativo di retry
          if (isRetry) {
            console.log("PwaSessionManager - Errore persistente dopo retry");
            setIsAuthenticated(false);
            setIsLoading(false);
            
            toast({
              title: "Errore di connessione",
              description: "Impossibile verificare la sessione. Il server potrebbe essere non disponibile.",
              variant: "destructive",
            });
          } else if (retryCount < 2) {
            // Tentativo di riprovare
            console.log(`PwaSessionManager - Retry #${retryCount + 1}`);
            setRetryCount(prev => prev + 1);
            
            // Esponential backoff (1s, 2s)
            const delay = 1000 * Math.pow(2, retryCount);
            setTimeout(() => {
              verifySession(true);
            }, delay);
            
            // Non cambiamo ancora lo stato di loading
            return;
          } else {
            setIsAuthenticated(false);
            setIsLoading(false);
          }
        }
      } catch (fetchError) {
        console.error("PwaSessionManager - Errore fetch:", fetchError);
        
        // Verifica se è un errore di timeout o rete
        if (fetchError.name === 'AbortError') {
          console.log("PwaSessionManager - Timeout nella verifica token");
          
          // Controlla se possiamo entrare in modalità offline
          const localClientData = localStorage.getItem('clientData');
          if (localClientData) {
            console.log("PwaSessionManager - Attivazione modalità offline per timeout");
            setOfflineMode(true);
            setIsAuthenticated(true);
            setIsLoading(false);
            
            toast({
              title: "Modalità offline attiva",
              description: "Server non raggiungibile. Stai visualizzando i dati salvati localmente.",
              variant: "default",
            });
            return;
          }
          
          // Altrimenti, errore di connessione
          setIsAuthenticated(false);
          setIsLoading(false);
          
          toast({
            title: "Errore di connessione",
            description: "Il server non risponde. Verifica la tua connessione internet.",
            variant: "destructive",
          });
        } else if (!isRetry && retryCount < 2) {
          // Riprova in caso di errore generale di rete
          console.log(`PwaSessionManager - Retry dopo errore #${retryCount + 1}`);
          setRetryCount(prev => prev + 1);
          
          // Riprova con backoff esponenziale
          const delay = 1000 * Math.pow(2, retryCount);
          setTimeout(() => {
            verifySession(true);
          }, delay);
          
          // Mantieni lo stato di loading
          return;
        } else {
          setIsAuthenticated(false);
          setIsLoading(false);
        }
      }
    } catch (error) {
      console.error("PwaSessionManager - Errore generale verifica:", error);
      setIsAuthenticated(false);
      setIsLoading(false);
    }
  }, [setLocation, toast, retryCount]);
  
  // Funzione per tentare il recupero della sessione
  const attemptSessionRecovery = async (isPWA: boolean) => {
    console.log("PwaSessionManager - Tentativo recupero sessione");
    
    // Se siamo in PWA, tenta recupero sessione con informazioni salvate
    if (isPWA) {
      const username = localStorage.getItem('clientUsername');
      const password = localStorage.getItem('clientPassword');
      
      if (username && password) {
        try {
          console.log("PwaSessionManager - Tentativo recupero con credenziali cached");
          setIsRetrying(true);
          
          // Timeout e controller per evitare problemi di rete
          const controller = new AbortController();
          const timeoutId = setTimeout(() => controller.abort(), 10000); // 10s timeout
          
          const response = await fetch('/api/client/login', {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              'X-PWA-Client': 'true',
              'X-Auto-Recovery': 'true'
            },
            body: JSON.stringify({
              username,
              password,
              isPwa: true,
              bypassAuth: true, // Consente bypass per login PWA
              autoRecovery: true
            }),
            credentials: 'include',
            signal: controller.signal
          });
          
          clearTimeout(timeoutId);
          
          if (response.ok) {
            const result = await response.json();
            console.log("PwaSessionManager - Recupero sessione riuscito");
            
            // Aggiorna token e clientId
            if (result.token) {
              localStorage.setItem('clientAccessToken', result.token);
            }
            
            if (result.client?.id) {
              localStorage.setItem('clientId', result.client.id.toString());
              localStorage.setItem('clientData', JSON.stringify(result));
              localStorage.setItem('lastAuthenticated', new Date().toISOString());
            }
            
            setIsAuthenticated(true);
            setOfflineMode(false);
            toast({
              title: "Sessione ripristinata",
              description: "La tua sessione è stata ripristinata automaticamente.",
            });
          } else {
            // Recupero fallito
            console.log("PwaSessionManager - Recupero sessione fallito");
            handleFailedLogin();
          }
        } catch (error) {
          console.error("PwaSessionManager - Errore recupero sessione:", error);
          handleFailedLogin();
        } finally {
          setIsRetrying(false);
          setIsLoading(false);
        }
      } else {
        // Nessuna credenziale salvata
        console.log("PwaSessionManager - Nessuna credenziale salvata");
        handleFailedLogin();
      }
    } else {
      // Non siamo in PWA, semplicemente considera non autenticato
      console.log("PwaSessionManager - Non in PWA, no autenticazione");
      setIsAuthenticated(false);
      setIsLoading(false);
    }
  };
  
  // Funzione per gestire login fallito
  const handleFailedLogin = () => {
    setIsAuthenticated(false);
    
    // Pulisce cache potenzialmente corrotta
    localStorage.removeItem('clientAccessToken');
    localStorage.removeItem('qrData');
    
    // Mantieni clientId e username per migliorare l'esperienza di login
    
    // Reindirizza al login
    toast({
      title: "Sessione scaduta",
      description: "La tua sessione è scaduta, effettua nuovamente l'accesso.",
      variant: "destructive",
    });
    
    setTimeout(() => {
      setLocation("/client-login?expired=true");
    }, 1500);
  };
  
  // Effetto iniziale che avvia la verifica della sessione
  useEffect(() => {
    verifySession();
  }, [verifySession]);
  
  // Funzione per tentare riconnessione manuale
  const handleManualRetry = () => {
    setIsLoading(true);
    setRetryCount(0); // Reset counter
    verifySession(false);
  };

  // Se è in caricamento, mostra loader
  if (isLoading) {
    return (
      <div className="flex flex-col items-center justify-center min-h-screen">
        <Loader2 className="h-12 w-12 animate-spin text-primary" />
        <p className="mt-4 text-muted-foreground">
          {isRetrying ? "Ripristino sessione..." : "Verifica sessione..."}
        </p>
      </div>
    );
  }
  
  // Se siamo offline e non autenticati, mostra messaggio di errore
  if (offlineMode && !isAuthenticated) {
    return (
      <div className="flex flex-col items-center justify-center min-h-screen p-4">
        <Card className="w-full max-w-md">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <WifiOff className="h-5 w-5" />
              <span>Connessione assente</span>
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-muted-foreground">
              Non è possibile accedere all'area cliente senza una connessione internet attiva.
              Verifica la tua connessione e riprova.
            </p>
          </CardContent>
          <CardFooter className="flex flex-col gap-2">
            <Button 
              onClick={handleManualRetry} 
              className="w-full"
              variant="default"
            >
              Riprova connessione
            </Button>
            <Button 
              onClick={() => setLocation('/client-login')} 
              className="w-full"
              variant="outline"
            >
              Vai alla pagina di login
            </Button>
          </CardFooter>
        </Card>
      </div>
    );
  }

  // Altrimenti, renderizza i figli
  return <>{children}</>;
}