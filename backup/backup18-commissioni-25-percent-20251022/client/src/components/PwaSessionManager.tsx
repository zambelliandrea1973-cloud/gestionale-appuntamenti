import { useEffect, useState } from "react";
import { useLocation } from "wouter";
import { useToast } from "@/hooks/use-toast";
import { Loader2 } from "lucide-react";
import { apiRequest } from "@/lib/queryClient";

/**
 * Componente PwaSessionManager
 * 
 * Gestisce il mantenimento e ripristino delle sessioni in modalità PWA
 * Questo componente dovrebbe essere utilizzato come wrapper nelle pagine
 * che richiedono autenticazione in aree protette dell'app
 */
export default function PwaSessionManager({ children }: { children: React.ReactNode }) {
  const [isLoading, setIsLoading] = useState(true);
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [_, setLocation] = useLocation();
  const { toast } = useToast();

  useEffect(() => {
    const verifySession = async () => {
      try {
        // Rileva se siamo in una PWA installata
        const isPWA = 
          window.matchMedia('(display-mode: standalone)').matches || 
          (window.navigator as any).standalone || 
          document.referrer.includes('android-app://');
        
        console.log("PwaSessionManager - Verifica sessione, isPWA:", isPWA);
        
        // Recupera token e clientId
        const token = localStorage.getItem('clientAccessToken');
        const clientId = localStorage.getItem('clientId');
        
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
              setLocation("/client-login");
            }, 1000);
          }
          return;
        }
        
        // Verifica il token
        console.log("PwaSessionManager - Verifica token");
        const response = await apiRequest('POST', '/api/verify-token', { 
          token, 
          clientId: parseInt(clientId, 10) 
        });
        
        if (response.ok) {
          // Token valido
          console.log("PwaSessionManager - Token valido");
          setIsAuthenticated(true);
        } else {
          // Token non valido, tenta recupero sessione
          console.log("PwaSessionManager - Token non valido, tentativo recupero");
          
          // Se siamo in PWA, tenta recupero sessione con informazioni salvate
          if (isPWA) {
            const username = localStorage.getItem('clientUsername');
            const password = localStorage.getItem('clientPassword');
            
            if (username && password) {
              try {
                console.log("PwaSessionManager - Tentativo recupero con credenziali");
                
                const loginData = {
                  username,
                  password,
                  isPwa: true
                };
                
                const loginResponse = await apiRequest('POST', '/api/client/login', loginData);
                
                if (loginResponse.ok) {
                  const result = await loginResponse.json();
                  console.log("PwaSessionManager - Recupero sessione riuscito");
                  
                  // Aggiorna token e clientId
                  if (result.token) {
                    localStorage.setItem('clientAccessToken', result.token);
                  }
                  
                  if (result.client?.id) {
                    localStorage.setItem('clientId', result.client.id.toString());
                  }
                  
                  setIsAuthenticated(true);
                } else {
                  // Recupero fallito
                  console.log("PwaSessionManager - Recupero sessione fallito");
                  setIsAuthenticated(false);
                  
                  // Reindirizza al login
                  toast({
                    title: "Sessione scaduta",
                    description: "La tua sessione è scaduta, effettua nuovamente l'accesso.",
                    variant: "destructive",
                  });
                  
                  setTimeout(() => {
                    setLocation("/client-login");
                  }, 1000);
                }
              } catch (error) {
                console.error("PwaSessionManager - Errore recupero sessione:", error);
                setIsAuthenticated(false);
                
                // Reindirizza al login
                toast({
                  title: "Errore sessione",
                  description: "Si è verificato un errore nel ripristino della sessione.",
                  variant: "destructive",
                });
                
                setTimeout(() => {
                  setLocation("/client-login");
                }, 1000);
              }
            } else {
              // Nessuna credenziale salvata
              console.log("PwaSessionManager - Nessuna credenziale salvata");
              setIsAuthenticated(false);
              
              // Reindirizza al login
              toast({
                title: "Sessione scaduta",
                description: "La tua sessione è scaduta, effettua nuovamente l'accesso.",
                variant: "destructive",
              });
              
              setTimeout(() => {
                setLocation("/client-login");
              }, 1000);
            }
          } else {
            // Non siamo in PWA, semplicemente considera non autenticato
            console.log("PwaSessionManager - Non in PWA, no autenticazione");
            setIsAuthenticated(false);
          }
        }
      } catch (error) {
        console.error("PwaSessionManager - Errore verifica sessione:", error);
        setIsAuthenticated(false);
      } finally {
        // Imposta sempre isLoading a false alla fine
        setIsLoading(false);
      }
    };
    
    verifySession();
  }, [setLocation, toast]);

  // Se è in caricamento, mostra loader
  if (isLoading) {
    return (
      <div className="flex flex-col items-center justify-center min-h-screen">
        <Loader2 className="h-12 w-12 animate-spin text-primary" />
        <p className="mt-4 text-muted-foreground">Verifica sessione...</p>
      </div>
    );
  }

  // Altrimenti, renderizza i figli
  return <>{children}</>;
}