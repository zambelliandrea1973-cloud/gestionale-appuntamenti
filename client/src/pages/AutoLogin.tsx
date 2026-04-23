import { useEffect, useState } from "react";
import { useLocation } from "wouter";
import { useTranslation } from "react-i18next";
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
  const { t } = useTranslation();
  const [_, setLocation] = useLocation();
  const { toast } = useToast();
  const [status, setStatus] = useState<"loading" | "success" | "error">("loading");
  const [message, setMessage] = useState<string>("");
  const [clientName, setClientName] = useState<string>("");
  const [error, setError] = useState<string>("");

  useEffect(() => {
    // Set initial loading message after t is available
    setMessage(t("autoLogin.loadingTitle"));

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
          
        const token = urlToken || localStorage.getItem('clientAccessToken');
        const clientId = urlClientId || localStorage.getItem('clientId');
        
        console.log(`Auto-login - Dati disponibili: 
          isPWA: ${isPWA}, 
          isDuckDuckGo: ${isDuckDuckGo}, 
          token: ${token ? 'sì' : 'no'}, 
          clientId: ${clientId ? 'sì' : 'no'}`);
        
        // Se abbiamo un token e un cliente ID dalla URL, tenta la verifica del token QR
        if (token && clientId) {
          try {
            console.log("Tentativo di verifica token QR automatico:", { token: token.substring(0, 10) + '...', clientId });
            const tokenResponse = await apiRequest('POST', '/api/client-access/verify-token', { 
              token, 
              clientId: parseInt(clientId, 10) 
            });
            
            if (tokenResponse.ok) {
              const result = await tokenResponse.json();
              const userName = result.client?.firstName || t("autoLogin.defaultUser");
              setStatus("success");
              setMessage(t("autoLogin.successMessage"));
              setClientName(userName);
              
              // Salva le informazioni del cliente per accessi futuri
              localStorage.setItem('clientId', clientId);
              localStorage.setItem('clientAccessToken', token);
              if (result.client?.firstName) {
                localStorage.setItem('clientUsername', result.client.firstName);
              }
              
              toast({
                title: t("autoLogin.qrToastTitle"),
                description: t("autoLogin.qrToastDesc", { name: userName }),
              });
              
              // Redirezione immediata alla client area
              setTimeout(() => {
                setLocation(`/client-area?token=${token}&clientId=${clientId}`);
              }, 1000);
              
              return;
            } else {
              setStatus("error");
              setMessage(t("autoLogin.qrInvalidTitle"));
              setError(t("autoLogin.qrInvalidDesc"));
              return;
            }
          } catch (error) {
            console.error("Errore durante verifica token QR:", error);
            setStatus("error");
            setMessage(t("autoLogin.connectionErrorTitle"));
            setError(t("autoLogin.connectionErrorDesc"));
            return;
          }
        }
        
        // Se non abbiamo token QR, significa che non possiamo effettuare login automatico
        setStatus("error");
        setMessage(t("autoLogin.unavailableTitle"));
        setError(t("autoLogin.unavailableDesc"));
      } catch (error) {
        console.error("Errore durante auto-login:", error);
        setStatus("error");
        setMessage(t("autoLogin.unexpectedErrorTitle"));
        setError(t("autoLogin.unexpectedErrorDesc"));
      }
    };
    
    attemptAutoLogin();
  }, [setLocation, toast, t]);

  return (
    <div className="container mx-auto p-4 flex flex-col items-center justify-center min-h-screen">
      <Card className="w-full max-w-md">
        <CardHeader>
          <CardTitle className="text-center text-2xl">
            {status === "loading" ? t("autoLogin.loadingTitle") : message}
          </CardTitle>
        </CardHeader>
        <CardContent className="flex flex-col items-center justify-center gap-4 py-6">
          {status === "loading" && (
            <>
              <Loader2 className="h-16 w-16 animate-spin text-primary" />
              <p className="text-center text-muted-foreground">
                {t("autoLogin.verifyingCredentials")}
              </p>
            </>
          )}
          
          {status === "success" && (
            <>
              <CheckCircle className="h-16 w-16 text-green-500" />
              <p className="text-center text-xl font-medium">
                {t("autoLogin.welcomeUser", { name: clientName })}
              </p>
              <p className="text-center text-muted-foreground">
                {t("autoLogin.redirectingClient")}
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
                {t("autoLogin.manualLoginButton")}
              </Button>
            </>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
