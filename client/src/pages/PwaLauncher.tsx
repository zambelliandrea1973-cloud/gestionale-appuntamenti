import { useEffect, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useLocation } from "wouter";
import { useToast } from "@/hooks/use-toast";

/**
 * PwaLauncher - Component per avvio PWA
 * 
 * Versione avanzata che:
 * 1. Controlla se l'utente ha già un account configurato (username, clientId salvati)
 * 2. Se sì, reindirizza alla pagina di login con username precompilato
 * 3. Se no, reindirizza alla pagina di attivazione tramite QR
 */
export default function PwaLauncher() {
  const [, setLocation] = useLocation();
  const [loading, setLoading] = useState(true);
  const { toast } = useToast();
  
  useEffect(() => {
    // Log di debug per vedere cosa c'è nel localStorage
    const storedData = {
      originalUrl: localStorage.getItem('originalUrl'),
      qrLink: localStorage.getItem('qrLink'),
      qrData: localStorage.getItem('qrData'),
      clientUsername: localStorage.getItem('clientUsername'),
      clientId: localStorage.getItem('clientId'),
      token: localStorage.getItem('clientAccessToken')
    };
    
    console.log("PwaLauncher - Contenuto localStorage:", storedData);
    
    // Funzione per reindirizzare l'utente alla pagina appropriata
    const redirectUser = () => {
      // Se l'utente ha già un clientId e username configurati
      if (storedData.clientUsername && storedData.clientId) {
        console.log("Utente già configurato, reindirizzamento alla pagina di login");
        
        // Reindirizza alla pagina di login client (nome utente sarà precompilato)
        // Rimosso il toast per evitare pop-up non necessari
        
        setLocation('/client-login');
      } else {
        // Se l'utente non ha ancora configurato il suo account
        console.log("Utente non configurato, reindirizzamento alla pagina di attivazione QR");
        
        // Rimosso il toast per evitare pop-up non necessari
        
        // Reindirizza alla pagina di attivazione QR
        setLocation('/activate');
      }
      
      setLoading(false);
    };
    
    // Reindirizza automaticamente dopo un breve delay
    const timer = setTimeout(redirectUser, 1500);
    
    return () => clearTimeout(timer);
  }, [setLocation, toast]);
  
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
                Verifica delle informazioni utente in corso...
              </p>
            </>
          ) : (
            <p className="text-center">
              Se non vieni reindirizzato automaticamente, 
              <Button 
                variant="link"
                onClick={() => setLocation('/client-login')}
                className="p-0 h-auto mx-1"
              >
                clicca qui
              </Button> 
              per procedere al login.
            </p>
          )}
        </CardContent>
      </Card>
    </div>
  );
}