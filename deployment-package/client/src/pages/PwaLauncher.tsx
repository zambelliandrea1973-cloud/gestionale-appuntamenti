import { useEffect, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useLocation } from "wouter";
import { useToast } from "@/hooks/use-toast";

/**
 * PwaLauncher - Component per avvio PWA
 * 
 * Versione migliorata con:
 * 1. Controllo completo e più affidabile dei dati di accesso
 * 2. Più informazioni per il debug
 * 3. Maggiore sicurezza nel mantenimento del token di accesso
 * 4. Backup dei dati di accesso per evitare perdite
 */
export default function PwaLauncher() {
  const [, setLocation] = useLocation();
  const [loading, setLoading] = useState(true);
  const [storageData, setStorageData] = useState<any>(null);
  const [showDebugInfo, setShowDebugInfo] = useState(false);
  const { toast } = useToast();
  
  useEffect(() => {
    // Log di debug per vedere cosa c'è nel localStorage
    const storedData = {
      originalUrl: localStorage.getItem('originalUrl'),
      qrLink: localStorage.getItem('qrLink'),
      qrData: localStorage.getItem('qrData'),
      clientUsername: localStorage.getItem('clientUsername'),
      clientId: localStorage.getItem('clientId'),
      clientAccessToken: localStorage.getItem('clientAccessToken'),
      clientPassword: localStorage.getItem('clientPassword') ? '(password salvata)' : '(nessuna password salvata)'
    };
    
    setStorageData(storedData);
    console.log("PwaLauncher - Contenuto localStorage:", storedData);
    
    // RAFFORZAMENTO: Se abbiamo alcuni dati ma non altri (per evitare perdita di dati)
    if (storedData.clientId && !storedData.clientAccessToken && storedData.qrData) {
      console.log("Ricostruzione token da qrData");
      localStorage.setItem('clientAccessToken', storedData.qrData);
      storedData.clientAccessToken = storedData.qrData;
    }
    
    // Funzione per reindirizzare l'utente alla pagina appropriata
    const redirectUser = () => {
      // Controllo avanzato per determinare la destinazione dell'utente
      const hasCredentials = storedData.clientUsername && storedData.clientId;
      const hasToken = storedData.clientAccessToken;
      
      // Caso 1: Abbiamo credenziali E token - perfetto per login diretto e automatico
      if (hasCredentials && hasToken) {
        console.log("Credenziali e token disponibili, reindirizzamento all'area client");
        
        // Rinforzare salvando nuovamente il token (per prevenire la perdita)
        // A volte localStorage può non salvare correttamente o essere pulito
        localStorage.setItem('clientAccessToken', storedData.clientAccessToken);
        
        // Aggiorniamo il messaggio toast per avere un feedback migliore
        toast({
          title: "Accesso automatico",
          description: "Credenziali trovate, accesso in corso...",
          duration: 2000,
        });
        
        // Creiamo un URL con il token come parametro per massimizzare la compatibilità
        const targetUrl = `/client-area?token=${encodeURIComponent(storedData.clientAccessToken)}&clientId=${storedData.clientId}`;
        
        console.log("Accesso diretto all'area client con token esplicito:", targetUrl);
        setLocation(targetUrl);
      }
      // Caso 2: Abbiamo credenziali ma non token - probabile login standard
      else if (hasCredentials) {
        console.log("Utente già configurato, reindirizzamento alla pagina di login");
        
        toast({
          title: "Login richiesto",
          description: "Per favore, inserisci la tua password",
          duration: 2000,
        });
        
        // Reindirizza alla pagina di login client (nome utente sarà precompilato)
        setLocation('/client-login');
      }
      // Caso 3: Non abbiamo credenziali - necessaria attivazione 
      else {
        console.log("Utente non configurato, reindirizzamento alla pagina di attivazione QR");
        
        toast({
          title: "Configurazione necessaria",
          description: "Per favore, scansiona il QR code per configurare l'app",
          duration: 2000,
        });
        
        // Reindirizza alla pagina di attivazione QR
        setLocation('/activate');
      }
      
      setLoading(false);
    };
    
    // Reindirizza automaticamente dopo un breve delay
    const timer = setTimeout(redirectUser, 1500);
    
    return () => clearTimeout(timer);
  }, [setLocation, toast]);
  
  // Funzione per rigenerare manualmente il localStorage
  const riparaStorage = () => {
    // Se abbiamo clientId e qrData ma non token, proviamo a ricostruire
    if (storageData.clientId && storageData.qrData && !storageData.clientAccessToken) {
      localStorage.setItem('clientAccessToken', storageData.qrData);
      toast({
        title: "Storage riparato",
        description: "Token ricreato da qrData",
      });
      
      // Refresh della pagina
      window.location.reload();
    } else {
      toast({
        title: "Impossibile riparare",
        description: "Dati insufficienti per ricreare il token",
        variant: "destructive"
      });
    }
  };
  
  return (
    <div className="container mx-auto p-4 flex flex-col items-center justify-center min-h-screen">
      <Card className="w-full max-w-md">
        <CardHeader>
          <CardTitle className="text-center text-2xl">
            Benvenuto nell'App Cliente
          </CardTitle>
          <CardDescription className="text-center">
            Inizializzazione e controllo credenziali
          </CardDescription>
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
              <div className="w-full mt-2">
                <Button 
                  variant="ghost" 
                  className="text-xs" 
                  onClick={() => setShowDebugInfo(!showDebugInfo)}
                >
                  {showDebugInfo ? "Nascondi info debug" : "Mostra info debug"}
                </Button>
                
                {showDebugInfo && storageData && (
                  <div className="text-xs bg-muted p-2 rounded mt-2 overflow-auto max-h-40">
                    <p><strong>localStorage:</strong></p>
                    <p>clientId: {storageData.clientId || 'mancante'}</p>
                    <p>username: {storageData.clientUsername || 'mancante'}</p>
                    <p>token: {storageData.clientAccessToken ? 'presente' : 'mancante'}</p>
                    <p>qrData: {storageData.qrData ? 'presente' : 'mancante'}</p>
                    <p>password: {storageData.clientPassword}</p>
                    
                    <Button 
                      variant="outline" 
                      size="sm" 
                      className="mt-2 text-xs h-6" 
                      onClick={riparaStorage}
                    >
                      Tenta riparazione
                    </Button>
                  </div>
                )}
              </div>
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