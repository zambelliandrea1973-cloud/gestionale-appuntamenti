import { useState, useEffect } from "react";
import { useLocation } from "wouter";
import { useToast } from "@/hooks/use-toast";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { apiRequest } from "@/lib/queryClient";
import InstallAppPrompt from "@/components/InstallAppPrompt";
import { Loader2 } from "lucide-react";

/**
 * ClientLogin - Component versione semplificata
 * Questa versione gestisce in modo adeguato anche il messaggio di sessione scaduta
 */
export default function ClientLogin() {
  const [, setLocation] = useLocation();
  const { toast } = useToast();
  const [username, setUsername] = useState<string>("");
  const [password, setPassword] = useState<string>("");
  const [loading, setLoading] = useState<boolean>(false);
  const [autoLoginAttempted, setAutoLoginAttempted] = useState<boolean>(false);
  const [directLinkLoading, setDirectLinkLoading] = useState<boolean>(false);

  // Stato per controllare se mostrare il messaggio di sessione scaduta
  const [showSessionExpiredMessage, setShowSessionExpiredMessage] = useState<boolean>(false);

  // Verifica se ci sono parametri nell'URL che indicano una sessione scaduta
  useEffect(() => {
    const urlParams = new URLSearchParams(window.location.search);
    
    // Se c'è il parametro 'expired=true', mostra il messaggio di sessione scaduta
    if (urlParams.get('expired') === 'true') {
      setShowSessionExpiredMessage(true);
      
      // Rimuovi il parametro dall'URL per evitare che rimanga nella cronologia
      const newUrl = window.location.pathname;
      window.history.replaceState({}, document.title, newUrl);
      
      // Solo se è scaduta la sessione, pulisci il token
      console.log("Sessione scaduta, pulizia solo del token");
      localStorage.removeItem('clientAccessToken');
    }
    
    // Non rimuoviamo più il clientAccessToken qui in modo generale
    // perché questo causava la perdita del token anche durante i normali
    // accessi all'app, portando al problema del "Token Mancante" al terzo tentativo
  }, []);
  
  // Verifica se ci sono parametri di token e clientId nell'URL o localStorage per accesso diretto
  useEffect(() => {
    // Rileva se siamo in una PWA installata
    const isPWA = 
      window.matchMedia('(display-mode: standalone)').matches || 
      (window.navigator as any).standalone || 
      document.referrer.includes('android-app://');
      
    // Salva l'URL corrente come URL originale per supportare l'apertura diretta da PWA
    const currentUrl = window.location.href;
    localStorage.setItem('originalUrl', currentUrl);
    console.log("URL originale salvato:", currentUrl);
    
    // Se siamo in un contesto di service worker, invia l'URL originale
    if (navigator.serviceWorker && navigator.serviceWorker.controller) {
      console.log("Invio URL originale al service worker");
      navigator.serviceWorker.controller.postMessage({
        type: 'SAVE_ORIGINAL_URL',
        url: currentUrl
      });
    }
    
    // Diagnostica avanzata: log completo del localStorage
    const allStorageKeys = ['originalUrl', 'qrLink', 'qrData', 'clientUsername', 'clientId', 'clientAccessToken', 'clientPassword'];
    const localStorageData = allStorageKeys.reduce((result, key) => {
      result[key] = localStorage.getItem(key) ? 
        (key === 'clientPassword' ? '(password presente)' : localStorage.getItem(key)) : 
        null;
      return result;
    }, {} as Record<string, string | null>);
    
    console.log("Diagnostica completa localStorage:", localStorageData);
    
    // Riparazione localStorage - se token è assente ma qrData è presente e abbiamo un clientId
    if (!localStorage.getItem('clientAccessToken') && localStorage.getItem('qrData') && localStorage.getItem('clientId')) {
      console.log("RIPARAZIONE: Token mancante, ricostruito da qrData");
      localStorage.setItem('clientAccessToken', localStorage.getItem('qrData') || '');
      
      // Informiamo l'utente della riparazione
      toast({
        title: "Riparazione dati",
        description: "Le informazioni di accesso sono state ricostruite",
        duration: 3000,
      });
    }
    
    // Pre-popola nome utente dal localStorage se disponibile
    const storedUsername = localStorage.getItem('clientUsername');
    const storedPassword = localStorage.getItem('clientPassword'); // Se memorizzata
    
    // Aggiungi un log più completo per debug
    console.log("Controllo credenziali salvate:", { 
      isPWA, 
      hasStoredUsername: !!storedUsername, 
      hasStoredPassword: !!storedPassword,
      pathName: window.location.pathname,
      browser: navigator.userAgent
    });
    
    if (storedUsername) {
      console.log("Usando nome utente memorizzato:", storedUsername);
      setUsername(storedUsername);
      
      // Se c'è anche la password memorizzata (opzionale), imposta anche quella
      if (storedPassword) {
        console.log("Usando password memorizzata (PWA)");
        setPassword(storedPassword);
        
        // Se siamo in una PWA, tentiamo un login automatico immediato con credenziali salvate
        if (isPWA) {
          console.log("Rilevata PWA installata, tentativo di login automatico");
          // Non facciamo il login immediato qui ma impostiamo le credenziali
          // per l'utente che può fare il login manualmente con un semplice clic
        }
      }
    }
    
    const attemptDirectLogin = async () => {
      try {
        // Non tentare di nuovo se già tentato
        if (autoLoginAttempted) return;
        setAutoLoginAttempted(true);
        
        // Rileva se siamo in DuckDuckGo e in modalità PWA
        const isDuckDuckGo = navigator.userAgent.includes("DuckDuckGo");
        const isPWA = 
          window.matchMedia('(display-mode: standalone)').matches || 
          (window.navigator as any).standalone || 
          document.referrer.includes('android-app://');
        
        console.log(`App avviata - DuckDuckGo: ${isDuckDuckGo}, PWA: ${isPWA}`);
        
        // Estrai token e clientId dall'URL
        const urlParams = new URLSearchParams(window.location.search);
        let token = urlParams.get('token');
        let clientId = urlParams.get('clientId');
        
        // Se i parametri esistono nell'URL, salviamoli nel localStorage per usi futuri
        if (token && clientId) {
          localStorage.setItem('clientAccessToken', token);
          localStorage.setItem('clientId', clientId);
        } 
        // Se non sono presenti nell'URL, prova a recuperarli dal localStorage (utile per PWA)
        else {
          const storedToken = localStorage.getItem('clientAccessToken');
          const storedClientId = localStorage.getItem('clientId');
          
          if (storedToken && storedClientId) {
            token = storedToken;
            clientId = storedClientId;
            console.log("Parametri recuperati da localStorage per supporto PWA in ClientLogin");
          }
        }
        
        // Auto-login in modalità PWA
        // Se abbiamo nome utente, token e siamo in una PWA installata, tentiamo un login automatico
        // Rimosso il controllo specifico per DuckDuckGo per supportare tutti i browser
        if (isPWA && storedUsername && token && clientId) {
          console.log("Tentativo di login automatico per app PWA installata");
          
          try {
            setDirectLinkLoading(true);
            
            // Crea una richiesta per il login automatico da PWA
            const requestData = {
              username: storedUsername,
              password: storedPassword || "placeholder-password-for-token-auth",
              token,
              clientId: parseInt(clientId, 10),
              bypassAuth: true,
              pwaInstalled: true
            };
            
            console.log("Tentativo login automatico per app installata con token");
            const response = await apiRequest('POST', '/api/client/login', requestData);
            
            if (response.ok) {
              const result = await response.json();
              
              // Auto-redirezione alla client area
              toast({
                title: "Accesso automatico effettuato",
                description: `Benvenuto, ${result.client?.firstName || 'Utente'}!`,
              });
              
              setTimeout(() => {
                setLocation(`/client-area?token=${token}`);
              }, 500);
              
              return; // Interrompi il flusso qui
            } else {
              // Se fallisce l'auto-login, continua con il processo standard
              console.log("Auto-login fallito, continua con processo standard");
              setDirectLinkLoading(false);
            }
          } catch (error) {
            console.error("Errore durante auto-login:", error);
            setDirectLinkLoading(false);
          }
        }
        
        // Se non ci sono entrambi i parametri o se il processo auto-login è fallito, non fare nulla
        if (!token || !clientId) return;
        
        // Tentativo di login diretto
        console.log("Tentativo di login diretto con token");
        setDirectLinkLoading(true);
        
        // Richiedi al backend di autenticare con token
        const response = await apiRequest('POST', '/api/verify-token', { 
          token, 
          clientId: parseInt(clientId, 10) 
        });
        
        if (response.ok) {
          const result = await response.json();
          
          // Salva anche il nome utente se disponibile
          if (result.username) {
            localStorage.setItem('clientUsername', result.username);
          }
          
          // Redirezione alla pagina client area
          toast({
            title: "Accesso diretto effettuato",
            description: `Benvenuto, ${result.client?.firstName || 'Utente'}!`,
          });
          
          setTimeout(() => {
            // Aggiungi il token all'URL della pagina client per poterlo riutilizzare
            setLocation(`/client-area?token=${token}`);
          }, 500);
          
        } else {
          console.error("Token di accesso non valido o scaduto");
          toast({
            title: "Link di accesso non valido",
            description: "Il link che hai utilizzato non è più valido o è scaduto. Si prega di effettuare il login normale.",
            variant: "destructive",
            duration: 5000,
          });
          
          // Rimuovi i parametri dall'URL senza ricaricare la pagina
          const newUrl = `${window.location.pathname}`;
          window.history.replaceState({}, document.title, newUrl);
          
          // Rimuovi anche le informazioni del localStorage che potrebbero essere scadute
          localStorage.removeItem('clientAccessToken');
          localStorage.removeItem('clientId');
          localStorage.removeItem('clientUsername');
        }
      } catch (error) {
        console.error("Errore durante l'accesso diretto:", error);
        toast({
          title: "Errore di accesso",
          description: "Si è verificato un errore durante l'accesso diretto. Prova ad accedere con username e password.",
          variant: "destructive",
          duration: 5000,
        });
      } finally {
        setDirectLinkLoading(false);
      }
    };
    
    attemptDirectLogin();
  }, [setLocation, toast, autoLoginAttempted]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    
    try {
      // Versione semplice e diretta: solo username e password
      const requestData = {
        username,
        password,
      };
      
      console.log("Tentativo di login semplificato con username e password");
      
      const response = await apiRequest('POST', '/api/client/login', requestData);
      
      if (response.ok) {
        const user = await response.json();
        
        // Salva tutte le informazioni essenziali nel localStorage per garantire 
        // il corretto funzionamento dell'app PWA installata nelle sessioni successive
        if (user.client?.id) {
          localStorage.setItem('clientId', user.client.id.toString());
        }
        localStorage.setItem('clientUsername', username);
        
        // Salviamo anche il token se presente nella risposta
        if (user.token) {
          localStorage.setItem('clientAccessToken', user.token);
          console.log("Token salvato nel localStorage per utilizzi futuri");
        }
        
        toast({
          title: "Accesso effettuato",
          description: `Benvenuto, ${user.client?.firstName || username}!`,
        });
        
        // Redirect semplice all'area client
        setTimeout(() => {
          setLocation("/client-area");
        }, 1000);
      } else {
        // Gestisci errori di login
        const errorData = await response.json().catch(() => ({}));
        
        toast({
          title: "Accesso fallito",
          description: errorData.message || "Nome utente o password non validi",
          variant: "destructive",
        });
      }
    } catch (error) {
      console.error("Errore durante il login:", error);
      toast({
        title: "Errore",
        description: "Si è verificato un errore durante l'accesso",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  // Se stiamo caricando attraverso un link diretto, mostra un feedback
  if (directLinkLoading) {
    return (
      <div className="container mx-auto p-4 flex flex-col items-center justify-center min-h-screen">
        <Card className="w-full max-w-md p-6">
          <div className="flex flex-col items-center justify-center gap-4">
            <Loader2 className="h-8 w-8 animate-spin text-primary" />
            <h2 className="text-xl font-medium">Accesso diretto in corso...</h2>
            <p className="text-center text-muted-foreground">
              Stiamo verificando il tuo link di accesso rapido, attendere prego.
            </p>
          </div>
        </Card>
      </div>
    );
  }

  return (
    <div className="container mx-auto p-4 flex flex-col items-center justify-center min-h-screen">
      <InstallAppPrompt />
      <Card className="w-full max-w-md">
        <CardHeader>
          <CardTitle className="text-center text-2xl">Accesso Area Clienti</CardTitle>
          <CardDescription className="text-center">Accedi al tuo account cliente per visualizzare i tuoi appuntamenti e gestire le tue informazioni</CardDescription>
        </CardHeader>
        <form onSubmit={handleSubmit}>
          <CardContent className="space-y-4">
            {/* Messaggio di sessione scaduta */}
            {showSessionExpiredMessage && (
              <div className="p-4 rounded-md bg-red-50 border border-red-200 text-red-700 text-sm mb-4 flex flex-col items-center gap-1">
                <h3 className="font-semibold text-red-800">Sessione scaduta</h3>
                <p>La tua sessione è scaduta, effettua nuovamente l'accesso.</p>
              </div>
            )}
            
            {/* Se abbiamo un token nell'URL ma l'autenticazione è fallita mostra un avviso */}
            {autoLoginAttempted && new URLSearchParams(window.location.search).get('token') && !directLinkLoading && !showSessionExpiredMessage && (
              <div className="p-3 rounded-md bg-amber-50 border border-amber-200 text-amber-800 text-sm mb-4">
                Non è stato possibile accedere con il link diretto. Esegui l'accesso con le tue credenziali.
              </div>
            )}
          
            <div className="space-y-2">
              <Label htmlFor="username">Nome utente</Label>
              <Input
                id="username"
                placeholder="Inserisci il tuo nome utente"
                required
                value={username}
                onChange={(e) => setUsername(e.target.value)}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="password">Password</Label>
              <Input
                id="password"
                type="password"
                placeholder="Inserisci la tua password"
                required
                value={password}
                onChange={(e) => setPassword(e.target.value)}
              />
            </div>
          </CardContent>
          <CardFooter className="flex flex-col space-y-2">
            <Button className="w-full" type="submit" disabled={loading}>
              {loading ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" /> Accesso in corso...
                </>
              ) : (
                "Accedi"
              )}
            </Button>
            <div className="text-center text-sm">
              <span className="text-muted-foreground">
                Hai un codice QR? {" "}
                <a 
                  href="/activate" 
                  className="text-primary hover:underline"
                  onClick={(e) => {
                    e.preventDefault();
                    setLocation("/activate");
                  }}
                >
                  Attiva il tuo account
                </a>
              </span>
            </div>
            
            {/* Aggiungi un extra messaggio per le PWA */}
            {window.matchMedia('(display-mode: standalone)').matches && (
              <div className="mt-4 text-center text-xs text-muted-foreground">
                <p>App installata correttamente.</p>
                <p>Questa versione si aprirà direttamente con il tuo QR code nelle prossime esecuzioni.</p>
              </div>
            )}
          </CardFooter>
        </form>
      </Card>
    </div>
  );
}