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
        
        // Se abbiamo un token e un cliente ID dalla URL, tenta la verifica del token QR (completamente automatico)
        if (token && clientId) {
          try {
            console.log("Tentativo di verifica token QR automatico:", { token: token.substring(0, 10) + '...', clientId });
            const tokenResponse = await apiRequest('POST', '/api/client-access/verify-token', { 
              token, 
              clientId: parseInt(clientId, 10) 
            });
            
            if (tokenResponse.ok) {
              const result = await tokenResponse.json();
              setStatus("success");
              setMessage("Accesso effettuato automaticamente");
              setClientName(result.client?.firstName || 'Utente');
              
              // Salva le informazioni del cliente per accessi futuri
              localStorage.setItem('clientId', clientId);
              localStorage.setItem('clientAccessToken', token);
              if (result.client?.firstName) {
                localStorage.setItem('clientUsername', result.client.firstName);
              }
              
              toast({
                title: "Accesso automatico tramite QR",
                description: `Benvenuto, ${result.client?.firstName || 'Utente'}!`,
              });
              
              // Redirezione immediata alla client area
              setTimeout(() => {
                setLocation(`/client-area?token=${token}&clientId=${clientId}`);
              }, 1000);
              
              return;
            } else {
              // Se il token QR fallisce, mostra errore specifico
              setStatus("error");
              setMessage("QR Code non valido");
              setError("Il codice QR potrebbe essere scaduto o non valido. Richiedi un nuovo codice.");
              return;
            }
          } catch (error) {
            console.error("Errore durante verifica token QR:", error);
            setStatus("error");
            setMessage("Errore di connessione");
            setError("Impossibile verificare il codice QR. Controlla la connessione internet.");
            return;
          }
        }
        
        // Se non abbiamo token QR, significa che non possiamo effettuare login automatico
        setStatus("error");
        setMessage("Accesso automatico non disponibile");
        setError("Nessun codice QR valido trovato. Scansiona un QR code per accedere automaticamente.");
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