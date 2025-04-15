import { useEffect, useState } from 'react';
import { useLocation } from "wouter";
import { Card, CardContent } from "@/components/ui/card";
import { Loader2, Check, AlertCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";

export default function AutoLogin() {
  const [, setLocation] = useLocation();
  const { toast } = useToast();
  const [status, setStatus] = useState<'checking' | 'success' | 'error'>('checking');
  const [message, setMessage] = useState('Verifica delle credenziali in corso...');
  
  useEffect(() => {
    attemptAutoLogin();
  }, []);
  
  const attemptAutoLogin = async () => {
    try {
      // Assicuriamoci di ottenere i parametri sia dall'URL che dal localStorage
      const urlParams = new URLSearchParams(window.location.search);
      let token = urlParams.get('token');
      let clientId = urlParams.get('clientId');
      
      // Se i parametri esistono nell'URL, salviamoli nel localStorage per usi futuri
      if (token && clientId) {
        localStorage.setItem('clientAccessToken', token);
        localStorage.setItem('clientId', clientId);
      } 
      // Se non sono presenti nell'URL, prova a recuperarli dal localStorage
      else {
        const storedToken = localStorage.getItem('clientAccessToken');
        const storedClientId = localStorage.getItem('clientId');
        
        if (storedToken && storedClientId) {
          token = storedToken;
          clientId = storedClientId;
          console.log("Parametri recuperati da localStorage per tentativo di auto-login");
        } else {
          // Se non abbiamo né token né clientId, non possiamo procedere
          setStatus('error');
          setMessage('Nessuna credenziale trovata per l\'accesso automatico');
          return;
        }
      }
      
      // Ottieni anche username e password se disponibili
      const storedUsername = localStorage.getItem('clientUsername');
      const storedPassword = localStorage.getItem('clientPassword');
      
      // Prima prova autenticazione con token
      const tokenResponse = await apiRequest('POST', '/api/verify-token', { 
        token, 
        clientId: parseInt(clientId, 10) 
      });
      
      // Se l'autenticazione con token ha successo
      if (tokenResponse.ok) {
        setStatus('success');
        setMessage('Autenticazione riuscita! Reindirizzamento in corso...');
        
        setTimeout(() => {
          setLocation(`/client-area?token=${token}`);
        }, 1500);
        return;
      }
      
      // Se abbiamo username e password, prova con il login normale
      if (storedUsername && storedPassword) {
        const requestData: any = {
          username: storedUsername,
          password: storedPassword,
          token,
          clientId: parseInt(clientId, 10),
        };
        
        // Se siamo in DuckDuckGo, attiva modalità bypass
        if (navigator.userAgent.includes("DuckDuckGo")) {
          requestData.bypassAuth = true;
          requestData.duckduckgo = true;
        }
        
        const loginResponse = await apiRequest('POST', '/api/client/login', requestData);
        
        if (loginResponse.ok) {
          setStatus('success');
          setMessage('Accesso effettuato con successo! Reindirizzamento in corso...');
          
          setTimeout(() => {
            setLocation(`/client-area?token=${token}`);
          }, 1500);
          return;
        }
      }
      
      // Se tutti i tentativi falliscono
      setStatus('error');
      setMessage('Impossibile effettuare l\'accesso automatico. È necessario fare login manualmente.');
      
    } catch (error) {
      console.error("Errore durante il tentativo di auto-login:", error);
      setStatus('error');
      setMessage('Si è verificato un errore durante l\'accesso automatico');
    }
  };
  
  const goToLogin = () => {
    setLocation('/login');
  };
  
  const goToClientArea = () => {
    setLocation('/client-area');
  };
  
  return (
    <div className="container flex items-center justify-center min-h-screen p-4">
      <Card className="w-full max-w-md border shadow-md">
        <CardContent className="pt-6 pb-6">
          <div className="flex flex-col items-center justify-center space-y-4 text-center">
            {status === 'checking' && (
              <>
                <Loader2 className="h-12 w-12 animate-spin text-primary" />
                <h1 className="text-xl font-semibold">Accesso automatico</h1>
                <p className="text-muted-foreground">{message}</p>
              </>
            )}
            
            {status === 'success' && (
              <>
                <div className="h-12 w-12 rounded-full bg-green-100 flex items-center justify-center">
                  <Check className="h-8 w-8 text-green-600" />
                </div>
                <h1 className="text-xl font-semibold">Accesso riuscito</h1>
                <p className="text-muted-foreground">{message}</p>
                <Button className="mt-4" onClick={goToClientArea}>
                  Vai all'area cliente
                </Button>
              </>
            )}
            
            {status === 'error' && (
              <>
                <div className="h-12 w-12 rounded-full bg-red-100 flex items-center justify-center">
                  <AlertCircle className="h-8 w-8 text-red-600" />
                </div>
                <h1 className="text-xl font-semibold">Impossibile accedere</h1>
                <p className="text-muted-foreground">{message}</p>
                <Button className="mt-4" onClick={goToLogin}>
                  Vai alla pagina di login
                </Button>
              </>
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}