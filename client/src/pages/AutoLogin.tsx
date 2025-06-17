import { useEffect, useState } from "react";
import { useLocation } from "wouter";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { useToast } from "@/hooks/use-toast";
import { Loader2, CheckCircle, XCircle } from "lucide-react";
import { apiRequest } from "@/lib/queryClient";
import { Button } from "@/components/ui/button";

/**
 * Pagina di AutoLogin per PWA
 * 
 * Questa pagina tenta di autenticare automaticamente un utente
 * quando avvia l'app in modalità PWA, utilizzando le credenziali memorizzate
 */
export default function AutoLogin() {
  const [_, setLocation] = useLocation();
  const { toast } = useToast();
  const [status, setStatus] = useState<"loading" | "success" | "error">("loading");
  const [message, setMessage] = useState<string>("Tentativo di accesso automatico...");
  const [clientName, setClientName] = useState<string>("");
  const [error, setError] = useState<string>("");

  useEffect(() => {
    const attemptAutoLogin = async () => {
      try {
        console.log("Tentativo di auto-login dalla pagina AutoLogin");
        
        // Recupera parametri URL (per attivazione QR)
        const urlParams = new URLSearchParams(window.location.search);
        const urlToken = urlParams.get('token');
        const urlClientId = urlParams.get('clientId');
        
        // Rileva se siamo in una PWA installata
        const isPWA = 
          window.matchMedia('(display-mode: standalone)').matches || 
          (window.navigator as any).standalone || 
          document.referrer.includes('android-app://');

        const isDuckDuckGo = navigator.userAgent.includes("DuckDuckGo");
          
        // Recupera le credenziali salvate
        const username = localStorage.getItem('clientUsername');
        const password = localStorage.getItem('clientPassword');
        const token = urlToken || localStorage.getItem('clientAccessToken');
        const clientId = urlClientId || localStorage.getItem('clientId');
        
        // Log dei dati che abbiamo (senza mostrare la password)
        console.log(`Auto-login - Dati disponibili: 
          isPWA: ${isPWA}, 
          isDuckDuckGo: ${isDuckDuckGo}, 
          username: ${username ? 'sì' : 'no'}, 
          password: ${password ? 'sì' : 'no'}, 
          token: ${token ? 'sì' : 'no'}, 
          clientId: ${clientId ? 'sì' : 'no'}`);
        
        // Se non abbiamo dati sufficienti per tentare il login, interrompi
        if (!username) {
          setStatus("error");
          setMessage("Accesso automatico fallito");
          setError("Nessun nome utente salvato. Effettua il login manualmente.");
          return;
        }
        
        // Se abbiamo un token e un cliente ID dalla URL, tenta la verifica del token QR
        if (token && clientId) {
          try {
            console.log("Tentativo di verifica token QR:", { token: token.substring(0, 10) + '...', clientId });
            const tokenResponse = await apiRequest('POST', '/api/client-access/verify-token', { 
              token, 
              clientId: parseInt(clientId, 10) 
            });
            
            if (tokenResponse.ok) {
              const result = await tokenResponse.json();
              setStatus("success");
              setMessage("Accesso effettuato");
              setClientName(result.client?.firstName || 'Utente');
              
              // Salva le informazioni del cliente per accessi futuri
              localStorage.setItem('clientId', clientId);
              localStorage.setItem('clientAccessToken', token);
              if (result.client?.firstName) {
                localStorage.setItem('clientUsername', result.client.firstName);
              }
              
              toast({
                title: "Accesso automatico effettuato",
                description: `Benvenuto, ${result.client?.firstName || 'Utente'}!`,
              });
              
              // Redirezione alla client area
              setTimeout(() => {
                setLocation(`/client-area?token=${token}&clientId=${clientId}`);
              }, 1500);
              
              return;
            } else {
              console.log("Verifica token QR fallita, tentativo con credenziali salvate");
            }
          } catch (error) {
            console.error("Errore durante verifica token QR:", error);
          }
        }
        
        // Se la verifica del token fallisce o non abbiamo token, tenta con le credenziali
        if (username && password) {
          try {
            console.log("Tentativo di login con credenziali");
            
            const requestData: any = {
              username,
              password,
            };
            
            // Aggiungi token e clientId se disponibili
            if (token && clientId) {
              requestData.token = token;
              requestData.clientId = parseInt(clientId, 10);
              
              // Aggiungi flag di bypass per DuckDuckGo
              if (isDuckDuckGo && isPWA) {
                requestData.bypassAuth = true;
                requestData.duckduckgo = true;
                console.log("Modalità bypass per DuckDuckGo PWA attivata");
              }
            }
            
            const response = await apiRequest('POST', '/api/client/login', requestData);
            
            if (response.ok) {
              const result = await response.json();
              
              // Aggiorna credenziali salvate
              if (result.client?.id) {
                localStorage.setItem('clientId', result.client.id.toString());
              }
              
              if (result.token) {
                localStorage.setItem('clientAccessToken', result.token);
              }
              
              // Aggiorna stato
              setStatus("success");
              setMessage("Accesso effettuato");
              setClientName(result.client?.firstName || 'Utente');
              
              toast({
                title: "Accesso automatico effettuato",
                description: `Benvenuto, ${result.client?.firstName || 'Utente'}!`,
              });
              
              // Redirezione alla client area
              setTimeout(() => {
                if (result.token) {
                  setLocation(`/client-area?token=${result.token}`);
                } else if (token) {
                  setLocation(`/client-area?token=${token}`);
                } else {
                  setLocation("/client-area");
                }
              }, 1500);
              
            } else {
              const errorData = await response.json().catch(() => ({}));
              setStatus("error");
              setMessage("Accesso automatico fallito");
              setError(errorData.message || "Credenziali non valide o scadute");
              
              console.error("Auto-login fallito:", errorData);
            }
          } catch (error) {
            console.error("Errore durante auto-login con credenziali:", error);
            setStatus("error");
            setMessage("Errore durante l'accesso automatico");
            setError("Si è verificato un errore durante il tentativo di accesso automatico.");
          }
        } else {
          setStatus("error");
          setMessage("Accesso automatico fallito");
          setError("Credenziali incomplete. Effettua il login manualmente.");
        }
      } catch (error) {
        console.error("Errore durante auto-login:", error);
        setStatus("error");
        setMessage("Errore imprevisto");
        setError("Si è verificato un errore imprevisto durante il tentativo di accesso automatico.");
      }
    };
    
    attemptAutoLogin();
  }, [setLocation, toast]);

  return (
    <div className="container mx-auto p-4 flex flex-col items-center justify-center min-h-screen">
      <Card className="w-full max-w-md">
        <CardHeader>
          <CardTitle className="text-center text-2xl">
            {status === "loading" ? "Accesso automatico in corso..." : message}
          </CardTitle>
        </CardHeader>
        <CardContent className="flex flex-col items-center justify-center gap-4 py-6">
          {status === "loading" && (
            <>
              <Loader2 className="h-16 w-16 animate-spin text-primary" />
              <p className="text-center text-muted-foreground">
                Stiamo verificando le tue credenziali, attendere prego.
              </p>
            </>
          )}
          
          {status === "success" && (
            <>
              <CheckCircle className="h-16 w-16 text-green-500" />
              <p className="text-center text-xl font-medium">
                Benvenuto, {clientName}!
              </p>
              <p className="text-center text-muted-foreground">
                Sarai reindirizzato all'area clienti in un istante...
              </p>
            </>
          )}
          
          {status === "error" && (
            <>
              <XCircle className="h-16 w-16 text-red-500" />
              <p className="text-center text-muted-foreground">
                {error}
              </p>
              <Button 
                className="mt-4 w-full" 
                onClick={() => setLocation("/client-login")}
              >
                Vai al login manuale
              </Button>
            </>
          )}
        </CardContent>
      </Card>
    </div>
  );
}