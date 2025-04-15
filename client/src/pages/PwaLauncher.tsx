import { useEffect, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Loader2 } from "lucide-react";

/**
 * PwaLauncher - Component semplificato per avvio PWA
 * 
 * Questo componente agisce come un semplice reindirizzamento al link originale
 * memorizzato dal QR code, senza tentare di gestire l'autenticazione in modo complesso.
 */
export default function PwaLauncher() {
  const [message, setMessage] = useState<string>("Reindirizzamento in corso...");
  
  useEffect(() => {
    // Recupera l'URL originale memorizzato
    const originalUrl = localStorage.getItem('originalUrl');
    const clientUsername = localStorage.getItem('clientUsername');
    const clientId = localStorage.getItem('clientId');
    const token = localStorage.getItem('clientAccessToken');
    
    console.log("PwaLauncher - Avvio reindirizzamento", {
      hasOriginalUrl: !!originalUrl,
      hasUsername: !!clientUsername,
      hasClientId: !!clientId,
      hasToken: !!token
    });
    
    // Se abbiamo l'URL originale, reindirizza subito
    if (originalUrl) {
      console.log("PwaLauncher - Reindirizzamento a:", originalUrl);
      window.location.href = originalUrl;
      return;
    }
    
    // Se abbiamo un token e un clientId, costruisci un URL di accesso diretto
    if (token && clientId) {
      const directUrl = `/client-login?token=${token}&clientId=${clientId}`;
      console.log("PwaLauncher - Reindirizzamento costruito:", directUrl);
      window.location.href = directUrl;
      return;
    }
    
    // Se abbiamo solo il username, reindirizza al login con username precompilato
    if (clientUsername) {
      localStorage.setItem('prefilledUsername', clientUsername);
      console.log("PwaLauncher - Reindirizzamento a login con username precompilato");
      window.location.href = '/client-login';
      return;
    }
    
    // Fallback: vai alla pagina di login principale
    console.log("PwaLauncher - Nessun dato trovato, reindirizzamento a login base");
    window.location.href = '/client-login';
  }, []);
  
  return (
    <div className="container mx-auto p-4 flex flex-col items-center justify-center min-h-screen">
      <Card className="w-full max-w-md">
        <CardHeader>
          <CardTitle className="text-center text-2xl">
            {message}
          </CardTitle>
        </CardHeader>
        <CardContent className="flex flex-col items-center justify-center py-6">
          <Loader2 className="h-16 w-16 animate-spin text-primary" />
          <p className="text-center text-muted-foreground mt-4">
            Accesso all'area cliente...
          </p>
        </CardContent>
      </Card>
    </div>
  );
}