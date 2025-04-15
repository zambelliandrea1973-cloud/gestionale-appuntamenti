import { useEffect, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useLocation } from "wouter";

/**
 * PwaLauncher - Component ultra-semplificato per avvio PWA
 * 
 * Questa versione è estremamente semplificata e offre solo un pulsante
 * per andare alla pagina di login, senza alcuna logica automatizzata.
 */
export default function PwaLauncher() {
  const [, setLocation] = useLocation();
  const [showButton, setShowButton] = useState(false);
  
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
    
    // Diamo all'utente la possibilità di vedere il pulsante dopo un breve ritardo
    const timer = setTimeout(() => {
      setShowButton(true);
    }, 1000);
    
    return () => clearTimeout(timer);
  }, []);
  
  // Funzione semplice per andare alla pagina di login
  const goToLogin = () => {
    setLocation('/client-login');
  };
  
  // Funzione semplice per andare alla pagina di attivazione
  const goToActivate = () => {
    setLocation('/activate');
  };
  
  return (
    <div className="container mx-auto p-4 flex flex-col items-center justify-center min-h-screen">
      <Card className="w-full max-w-md">
        <CardHeader>
          <CardTitle className="text-center text-2xl">
            Benvenuto nell'App Cliente
          </CardTitle>
        </CardHeader>
        <CardContent className="flex flex-col items-center justify-center py-6 gap-6">
          {!showButton ? (
            <>
              <Loader2 className="h-16 w-16 animate-spin text-primary" />
              <p className="text-center text-muted-foreground">
                Inizializzazione applicazione...
              </p>
            </>
          ) : (
            <>
              <p className="text-center">
                Scegli una delle seguenti opzioni:
              </p>
              <div className="w-full space-y-4">
                <Button 
                  size="lg" 
                  className="w-full"
                  onClick={goToLogin}
                >
                  Accedi con credenziali
                </Button>
                <Button 
                  size="lg" 
                  variant="outline"
                  className="w-full"
                  onClick={goToActivate}
                >
                  Usa QR Code
                </Button>
              </div>
              <p className="text-sm text-muted-foreground text-center mt-4">
                Se hai ricevuto un codice QR, utilizzalo per attivare o accedere al tuo account.
              </p>
            </>
          )}
        </CardContent>
      </Card>
    </div>
  );
}