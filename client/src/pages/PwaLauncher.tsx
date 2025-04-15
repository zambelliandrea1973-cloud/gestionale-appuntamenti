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
    // Recupera tutti i possibili dati memorizzati
    const originalUrl = localStorage.getItem('originalUrl');
    const qrLink = localStorage.getItem('qrLink');
    const qrData = localStorage.getItem('qrData');
    const clientUsername = localStorage.getItem('clientUsername');
    const clientId = localStorage.getItem('clientId');
    const token = localStorage.getItem('clientAccessToken');
    
    console.log("PwaLauncher - Avvio reindirizzamento", {
      hasOriginalUrl: !!originalUrl,
      hasQrLink: !!qrLink,
      hasQrData: !!qrData,
      hasUsername: !!clientUsername,
      hasClientId: !!clientId,
      hasToken: !!token
    });
    
    // Priorità 1: Se abbiamo un link QR o URL originale, reindirizza subito
    if (qrLink) {
      console.log("PwaLauncher - Reindirizzamento a QR link:", qrLink);
      
      // Se è un URL relativo, aggiungi l'origine
      if (qrLink.startsWith('/')) {
        window.location.href = window.location.origin + qrLink;
      } else {
        window.location.href = qrLink;
      }
      return;
    }
    
    if (originalUrl) {
      console.log("PwaLauncher - Reindirizzamento a URL originale:", originalUrl);
      
      // Se è un URL relativo, aggiungi l'origine
      if (originalUrl.startsWith('/')) {
        window.location.href = window.location.origin + originalUrl;
      } else {
        window.location.href = originalUrl;
      }
      return;
    }
    
    // Priorità 2: Se abbiamo dati QR, reindirizza alla pagina di attivazione con i dati
    if (qrData) {
      console.log("PwaLauncher - Reindirizzamento con dati QR alla pagina di attivazione");
      window.location.href = `/activate?data=${encodeURIComponent(qrData)}`;
      return;
    }
    
    // Priorità 3: Se abbiamo un token e un clientId, costruisci un URL di accesso diretto
    if (token && clientId) {
      const directUrl = `/client-login?token=${token}&clientId=${clientId}`;
      console.log("PwaLauncher - Reindirizzamento costruito:", directUrl);
      window.location.href = directUrl;
      return;
    }
    
    // Priorità 4: Se abbiamo solo il username, reindirizza al login con username precompilato
    if (clientUsername) {
      localStorage.setItem('prefilledUsername', clientUsername);
      console.log("PwaLauncher - Reindirizzamento a login con username precompilato");
      window.location.href = '/client-login';
      return;
    }
    
    // Fallback: vai alla pagina di login principale
    console.log("PwaLauncher - Nessun dato trovato, reindirizzamento a login base");
    setMessage("Nessun QR code trovato, reindirizzamento alla pagina di login...");
    setTimeout(() => {
      window.location.href = '/client-login';
    }, 1500);
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