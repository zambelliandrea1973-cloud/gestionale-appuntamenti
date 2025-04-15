import { useEffect, useState } from 'react';
import { useLocation } from 'wouter';
import { useToast } from '@/hooks/use-toast';
import { apiRequest } from '@/lib/queryClient';
import { Card, CardContent, CardHeader, CardTitle, CardDescription, CardFooter } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import { Loader2 } from 'lucide-react';

export default function AutoLogin() {
  const [, setLocation] = useLocation();
  const { toast } = useToast();
  const [token, setToken] = useState<string | null>(null);
  const [clientId, setClientId] = useState<string | null>(null);
  const [username, setUsername] = useState<string>("");
  const [password, setPassword] = useState<string>("");
  const [verifying, setVerifying] = useState<boolean>(true);
  const [loading, setLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);

  // Gestisce l'estrazione dei parametri dall'URL o localStorage
  useEffect(() => {
    // Prima controlla i parametri URL
    const urlParams = new URLSearchParams(window.location.search);
    let tokenParam = urlParams.get('token');
    let clientIdParam = urlParams.get('clientId');
    let usernameParam = urlParams.get('username');
    
    // Se i parametri esistono nell'URL, salviamoli nel localStorage per usi futuri
    if (tokenParam && clientIdParam) {
      localStorage.setItem('clientAccessToken', tokenParam);
      localStorage.setItem('clientId', clientIdParam);
      if (usernameParam) {
        localStorage.setItem('clientUsername', usernameParam);
      }
    } 
    // Se non sono presenti nell'URL, prova a recuperarli dal localStorage (utile per PWA)
    else {
      const storedToken = localStorage.getItem('clientAccessToken');
      const storedClientId = localStorage.getItem('clientId');
      const storedUsername = localStorage.getItem('clientUsername');
      
      if (storedToken && storedClientId) {
        tokenParam = storedToken;
        clientIdParam = storedClientId;
        if (storedUsername) {
          usernameParam = storedUsername;
        }
        console.log("Parametri recuperati da localStorage per supporto PWA");
      }
    }

    // Imposta gli stati con i valori recuperati
    if (tokenParam) setToken(tokenParam);
    if (clientIdParam) setClientId(clientIdParam);
    if (usernameParam) setUsername(usernameParam);

    // Se abbiamo token e clientId, verifichiamo subito la validità del token
    if (tokenParam && clientIdParam) {
      verifyTokenWithoutAuth(tokenParam, clientIdParam);
    } else {
      setVerifying(false);
      setError("Link incompleto. Mancano alcuni parametri necessari.");
    }
  }, []);

  // Verifica la validità del token senza autenticare l'utente
  const verifyTokenWithoutAuth = async (tokenToVerify: string, clientIdToVerify: string) => {
    try {
      setVerifying(true);
      
      // Usa l'endpoint che verifica solo e non autentica
      const response = await apiRequest('GET', `/api/verify-token/${tokenToVerify}`);
      
      if (response.ok) {
        const data = await response.json();
        
        if (data.valid && data.clientId === Number(clientIdToVerify)) {
          // Token valido, ora abbiamo anche il nome utente se non era già incluso nell'URL
          if (!username && data.username) {
            setUsername(data.username);
          }
          // Se non abbiamo un username, imposta quello predefinito dal clientName
          else if (!username && data.clientName) {
            const firstNameFromClientName = data.clientName.split(' ')[0];
            setUsername(firstNameFromClientName);
          }
          
          setError(null);
        } else {
          setError("Token non valido o scaduto");
          
          // Reindirizza alla pagina di login normale dopo qualche secondo
          setTimeout(() => {
            setLocation('/client-login');
          }, 3000);
        }
      } else {
        setError("Errore durante la verifica del token");
        
        // Reindirizza alla pagina di login normale dopo qualche secondo
        setTimeout(() => {
          setLocation('/client-login');
        }, 3000);
      }
    } catch (error) {
      console.error("Errore durante la verifica:", error);
      setError("Si è verificato un errore di connessione");
      
      // Reindirizza alla pagina di login normale dopo qualche secondo
      setTimeout(() => {
        setLocation('/client-login');
      }, 3000);
    } finally {
      setVerifying(false);
    }
  };

  // Gestisce il login con il token
  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!token || !clientId) {
      setError("Mancano i parametri necessari");
      return;
    }
    
    setLoading(true);
    
    try {
      // Invia username e password insieme a token e clientId
      const response = await apiRequest('POST', '/api/client/login', {
        username,
        password,
        token,
        clientId: Number(clientId)
      });
      
      if (response.ok) {
        const user = await response.json();
        
        toast({
          title: "Accesso effettuato",
          description: `Benvenuto, ${user.client?.firstName || username}!`,
        });
        
        // Reindirizza all'area cliente con il token
        setTimeout(() => {
          setLocation(`/client-area?token=${token}`);
        }, 1000);
      } else {
        // Gestisci errori di login
        const errorData = await response.json().catch(() => ({}));
        
        toast({
          title: "Accesso fallito",
          description: errorData.message || "Password non valida",
          variant: "destructive",
        });
        
        setError("Password non valida. Riprova.");
      }
    } catch (error) {
      console.error("Errore durante il login:", error);
      toast({
        title: "Errore",
        description: "Si è verificato un errore durante l'accesso",
        variant: "destructive",
      });
      
      setError("Errore di connessione. Riprova più tardi.");
    } finally {
      setLoading(false);
    }
  };

  // Se stiamo verificando il token, mostro loader
  if (verifying) {
    return (
      <div className="container mx-auto p-4 flex items-center justify-center min-h-screen">
        <Card className="w-full max-w-md mx-auto">
          <CardHeader>
            <CardTitle className="text-xl">Verifica credenziali</CardTitle>
            <CardDescription>Stiamo verificando il tuo link di accesso</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="flex flex-col items-center justify-center p-8">
              <Loader2 className="h-8 w-8 animate-spin text-primary" />
              <p className="mt-4 text-sm text-muted-foreground">Attendere prego...</p>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  // Se c'è un errore grave, mostro il messaggio di errore
  if (error && (error.includes("Token non valido") || error.includes("Link incompleto"))) {
    return (
      <div className="container mx-auto p-4 flex items-center justify-center min-h-screen">
        <Card className="w-full max-w-md mx-auto">
          <CardHeader>
            <CardTitle className="text-xl text-destructive">Errore di accesso</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="p-4 text-center">
              <p className="text-destructive">{error}</p>
              <p className="mt-4 text-sm text-muted-foreground">
                Reindirizzamento alla pagina di login standard...
              </p>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  // Altrimenti mostro il form di login con username precompilato
  return (
    <div className="container mx-auto p-4 flex flex-col items-center justify-center min-h-screen">
      <Card className="w-full max-w-md">
        <CardHeader>
          <CardTitle className="text-center text-2xl">Accesso Area Clienti</CardTitle>
          <CardDescription className="text-center">
            Inserisci solo la tua password per accedere
          </CardDescription>
        </CardHeader>
        <form onSubmit={handleLogin}>
          <CardContent className="space-y-4">
            {error && (
              <div className="p-3 rounded-md bg-destructive/10 border border-destructive/20 text-destructive text-sm">
                {error}
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
                disabled  // Disabilitato perché precompilato
                className="bg-muted/50"
              />
            </div>
            
            <div className="space-y-2">
              <Label htmlFor="password">Password</Label>
              <Input
                id="password"
                type="password"
                placeholder="Inserisci la tua password"
                required
                autoFocus  // Focus automatico sul campo password
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
                Non ricordi la password? {" "}
                <a 
                  href="/client-login" 
                  className="text-primary hover:underline"
                  onClick={(e) => {
                    e.preventDefault();
                    setLocation("/client-login");
                  }}
                >
                  Accedi normalmente
                </a>
              </span>
            </div>
          </CardFooter>
        </form>
      </Card>
    </div>
  );
}