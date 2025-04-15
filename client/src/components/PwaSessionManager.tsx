import { useEffect, useState } from 'react';
import { useLocation } from "wouter";
import { apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { Loader2 } from "lucide-react";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";

interface PwaSessionManagerProps {
  children: React.ReactNode;
}

export function PwaSessionManager({ children }: PwaSessionManagerProps) {
  const [, setLocation] = useLocation();
  const { toast } = useToast();
  const [isChecking, setIsChecking] = useState(false);
  const [sessionError, setSessionError] = useState(false);
  
  useEffect(() => {
    // Verifica se siamo in una PWA installata
    const isPWA = 
      window.matchMedia('(display-mode: standalone)').matches || 
      (window.navigator as any).standalone || 
      document.referrer.includes('android-app://');
      
    // Rileva browser
    const isDuckDuckGo = navigator.userAgent.includes("DuckDuckGo");
    
    // Recupera le credenziali salvate
    const hasStoredToken = !!localStorage.getItem('clientAccessToken');
    const hasStoredClientId = !!localStorage.getItem('clientId');
    const hasStoredUsername = !!localStorage.getItem('clientUsername');
    const hasStoredPassword = !!localStorage.getItem('clientPassword');
    
    // Se siamo in PWA e abbiamo credenziali salvate ma non siamo nella pagina di login
    if (isPWA && !window.location.pathname.includes('/login') && 
        !window.location.pathname.includes('/auto-login') &&
        (hasStoredToken && hasStoredClientId)) {
      
      // Verifica immediatamente lo stato della sessione
      checkSessionStatus();
    }
  }, []);
  
  const checkSessionStatus = async () => {
    setIsChecking(true);
    
    try {
      // Verifica se l'utente è autenticato
      const response = await apiRequest('GET', '/api/current-user');
      
      if (!response.ok) {
        // Se non è autenticato, prova a fare login automatico
        console.log("Sessione non attiva, tentativo di auto-login");
        await attemptAutoLogin();
      } else {
        console.log("Sessione già attiva");
        setIsChecking(false);
      }
    } catch (error) {
      console.error("Errore durante il controllo della sessione:", error);
      setIsChecking(false);
      setSessionError(true);
    }
  };
  
  const attemptAutoLogin = async () => {
    try {
      const storedToken = localStorage.getItem('clientAccessToken');
      const storedClientId = localStorage.getItem('clientId');
      const storedUsername = localStorage.getItem('clientUsername');
      const storedPassword = localStorage.getItem('clientPassword');
      
      // Se abbiamo token e clientId, prova prima autenticazione via token
      if (storedToken && storedClientId) {
        const tokenResponse = await apiRequest('POST', '/api/verify-token', { 
          token: storedToken, 
          clientId: parseInt(storedClientId, 10) 
        });
        
        if (tokenResponse.ok) {
          setIsChecking(false);
          console.log("Auto-login con token riuscito");
          return;
        }
      }
      
      // Se abbiamo username e password, prova login normale
      if (storedUsername && storedPassword) {
        const requestData: any = {
          username: storedUsername,
          password: storedPassword,
        };
        
        // Includi token e clientId se disponibili
        if (storedToken && storedClientId) {
          requestData.token = storedToken;
          requestData.clientId = parseInt(storedClientId, 10);
          
          // Se siamo in DuckDuckGo, attiva modalità bypass
          if (navigator.userAgent.includes("DuckDuckGo")) {
            requestData.bypassAuth = true;
            requestData.duckduckgo = true;
          }
        }
        
        const response = await apiRequest('POST', '/api/client/login', requestData);
        
        if (response.ok) {
          console.log("Auto-login con credenziali riuscito");
          setIsChecking(false);
          return;
        }
      }
      
      // Se entrambi i metodi falliscono, mostra errore
      console.log("Tutti i tentativi di auto-login falliti");
      setSessionError(true);
    } catch (error) {
      console.error("Errore durante auto-login:", error);
      setSessionError(true);
    } finally {
      setIsChecking(false);
    }
  };
  
  const handleGoToLogin = () => {
    setLocation('/login');
  };
  
  if (isChecking) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="flex flex-col items-center gap-3">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
          <p className="text-lg font-medium">Verificando la sessione...</p>
          <p className="text-sm text-muted-foreground">Attendi mentre ripristiniamo il tuo accesso</p>
        </div>
      </div>
    );
  }
  
  if (sessionError) {
    return (
      <div className="flex items-center justify-center min-h-screen p-4">
        <div className="w-full max-w-md space-y-4">
          <Alert variant="destructive">
            <AlertTitle>Sessione scaduta</AlertTitle>
            <AlertDescription>
              La tua sessione è scaduta o non è stato possibile ripristinarla automaticamente. 
              È necessario effettuare nuovamente l'accesso.
            </AlertDescription>
          </Alert>
          <Button onClick={handleGoToLogin} className="w-full">
            Vai al login
          </Button>
        </div>
      </div>
    );
  }
  
  return <>{children}</>;
}

export default PwaSessionManager;