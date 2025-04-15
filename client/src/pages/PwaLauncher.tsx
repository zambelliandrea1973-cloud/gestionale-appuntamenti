import { useEffect, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useLocation } from "wouter";

/**
 * PwaLauncher - Component ultra-semplificato per avvio PWA
 * 
 * Versione semplificata che reindirizza direttamente alla pagina di scansione QR code
 * poiché il metodo con credenziali non funziona correttamente nell'app PWA.
 */
export default function PwaLauncher() {
  const [, setLocation] = useLocation();
  const [loading, setLoading] = useState(true);
  
  useEffect(() => {
    // Log di debug per vedere cosa c'è nel localStorage
    console.log("PwaLauncher - Contenuto localStorage:", {
      originalUrl: localStorage.getItem('originalUrl'),
      qrLink: localStorage.getItem('qrLink'),
      qrData: localStorage.getItem('qrData'),
      clientUsername: localStorage.getItem('clientUsername'),
      clientId: localStorage.getItem('clientId'),
      token: localStorage.getItem('clientAccessToken')
    });
    
    // Reindirizza automaticamente alla pagina di attivazione QR dopo un breve delay
    const timer = setTimeout(() => {
      // Reindirizza direttamente alla pagina di attivazione QR (modalità semplificata)
      setLocation('/activate');
      setLoading(false);
    }, 1500);
    
    return () => clearTimeout(timer);
  }, [setLocation]);
  
  return (
    <div className="container mx-auto p-4 flex flex-col items-center justify-center min-h-screen">
      <Card className="w-full max-w-md">
        <CardHeader>
          <CardTitle className="text-center text-2xl">
            Benvenuto nell'App Cliente
          </CardTitle>
        </CardHeader>
        <CardContent className="flex flex-col items-center justify-center py-6 gap-6">
          {loading ? (
            <>
              <Loader2 className="h-16 w-16 animate-spin text-primary" />
              <p className="text-center text-muted-foreground">
                Inizializzazione applicazione...
              </p>
              <p className="text-sm text-center">
                Verrai reindirizzato alla scansione del QR code...
              </p>
            </>
          ) : (
            <p className="text-center">
              Se non vieni reindirizzato automaticamente, 
              <Button 
                variant="link"
                onClick={() => setLocation('/activate')}
                className="p-0 h-auto mx-1"
              >
                clicca qui
              </Button> 
              per procedere alla scansione del QR code.
            </p>
          )}
        </CardContent>
      </Card>
    </div>
  );
}