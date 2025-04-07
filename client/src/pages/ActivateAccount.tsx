import { useState, useEffect } from "react";
import { useLocation } from "wouter";
import { useToast } from "@/hooks/use-toast";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { apiRequest } from "@/lib/queryClient";
import InstallAppPrompt from "@/components/InstallAppPrompt";

interface TokenVerificationResult {
  valid: boolean;
  clientId?: number;
  clientName?: string;
  message?: string;
  accountExists?: boolean;
}

export default function ActivateAccount() {
  const [, setLocation] = useLocation();
  const { toast } = useToast();
  const [token, setToken] = useState<string>("");
  const [username, setUsername] = useState<string>("");
  const [password, setPassword] = useState<string>("");
  const [confirmPassword, setConfirmPassword] = useState<string>("");
  const [tokenVerification, setTokenVerification] = useState<TokenVerificationResult | null>(null);
  const [loading, setLoading] = useState<boolean>(false);
  const [verifying, setVerifying] = useState<boolean>(true);

  useEffect(() => {
    // Estrai il token dalla query string
    const params = new URLSearchParams(window.location.search);
    const tokenFromUrl = params.get("token");
    
    if (tokenFromUrl) {
      setToken(tokenFromUrl);
      verifyToken(tokenFromUrl);
    } else {
      setVerifying(false);
    }
  }, []);
  
  const verifyToken = async (tokenToVerify: string) => {
    setVerifying(true);
    try {
      const response = await fetch(`/api/verify-token/${tokenToVerify}`);
      const data = await response.json();
      
      setTokenVerification(data);
      
      if (!data.valid) {
        toast({
          title: "Token non valido",
          description: data.message || "Il token di attivazione non è valido o è scaduto",
          variant: "destructive",
        });
      } else if (data.accountExists) {
        // Se l'account esiste già, comunichiamo all'utente che può accedere
        toast({
          title: "Account già esistente",
          description: "Hai già un account attivo. Inserisci solo la tua password per accedere.",
        });
      }
    } catch (error) {
      console.error("Errore durante la verifica del token:", error);
      setTokenVerification({ valid: false, message: "Errore durante la verifica del token" });
      toast({
        title: "Errore",
        description: "Si è verificato un errore durante la verifica del token",
        variant: "destructive",
      });
    } finally {
      setVerifying(false);
    }
  };
  
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    // Se l'account non esiste ancora, verifichiamo che le password coincidano
    if (!tokenVerification?.accountExists && password !== confirmPassword) {
      toast({
        title: "Errore",
        description: "Le password non corrispondono",
        variant: "destructive",
      });
      return;
    }
    
    setLoading(true);
    
    try {
      // Prepariamo i dati per la richiesta
      const requestData: Record<string, string> = {
        token,
        password,
      };
      
      // Aggiungiamo lo username solo se non è un account esistente
      if (!tokenVerification?.accountExists) {
        requestData.username = username;
      }
      
      console.log("Invio dati di attivazione:", requestData);
      
      const response = await apiRequest('POST', '/api/activate-account', requestData);
      
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || "Errore durante l'attivazione");
      }
      
      const data = await response.json();
      
      console.log("Risposta attivazione:", data);
      
      if (data.accountExists) {
        toast({
          title: "Accesso effettuato",
          description: "Accesso effettuato con successo. Stai per essere reindirizzato all'area clienti.",
        });
        
        // Redirect direttamente all'area clienti
        setTimeout(() => {
          setLocation("/client-area");
        }, 2000);
      } else {
        toast({
          title: "Account attivato",
          description: "Il tuo account è stato attivato con successo. Ora puoi accedere all'area clienti.",
        });
        
        // Redirect alla pagina di login cliente
        setTimeout(() => {
          setLocation("/client-login");
        }, 2000);
      }
      
    } catch (error: any) {
      console.error("Errore durante l'attivazione dell'account:", error);
      toast({
        title: "Errore",
        description: error.message || "Si è verificato un errore durante l'attivazione dell'account",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  if (verifying) {
    return (
      <div className="container mx-auto p-4 flex flex-col items-center justify-center min-h-screen">
        <InstallAppPrompt />
        <Card className="w-full max-w-md">
          <CardHeader>
            <CardTitle className="text-center text-2xl">Attivazione Account</CardTitle>
            <CardDescription className="text-center">Verifica del token in corso...</CardDescription>
          </CardHeader>
          <CardContent className="flex justify-center p-6">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (!token) {
    return (
      <div className="container mx-auto p-4 flex flex-col items-center justify-center min-h-screen">
        <InstallAppPrompt />
        <Card className="w-full max-w-md">
          <CardHeader>
            <CardTitle className="text-center text-2xl">Token Mancante</CardTitle>
            <CardDescription className="text-center">Per attivare il tuo account è necessario un token di attivazione valido.</CardDescription>
          </CardHeader>
          <CardContent>
            <p className="text-center mb-4">Scansiona il QR code fornito dal tuo professionista o inserisci manualmente il token.</p>
            <div className="flex space-x-2">
              <Input 
                placeholder="Inserisci manualmente il token" 
                value={token} 
                onChange={(e) => setToken(e.target.value)}
              />
              <Button onClick={() => verifyToken(token)}>Verifica</Button>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (tokenVerification && !tokenVerification.valid) {
    return (
      <div className="container mx-auto p-4 flex flex-col items-center justify-center min-h-screen">
        <InstallAppPrompt />
        <Card className="w-full max-w-md">
          <CardHeader>
            <CardTitle className="text-center text-2xl">Token Non Valido</CardTitle>
            <CardDescription className="text-center">Il token di attivazione non è valido o è scaduto.</CardDescription>
          </CardHeader>
          <CardContent>
            <p className="text-center mb-4">{tokenVerification.message}</p>
            <p className="text-center mb-4">Contatta il tuo professionista per ottenere un nuovo token di attivazione.</p>
          </CardContent>
        </Card>
      </div>
    );
  }

  // Se l'account esiste già, mostra il form di accesso
  if (tokenVerification?.accountExists) {
    return (
      <div className="container mx-auto p-4 flex flex-col items-center justify-center min-h-screen">
        <InstallAppPrompt />
        <Card className="w-full max-w-md">
          <CardHeader>
            <CardTitle className="text-center text-xl md:text-2xl">Accedi al tuo Account</CardTitle>
            {tokenVerification?.clientName && (
              <CardDescription className="text-center">
                Account di: <strong>{tokenVerification.clientName}</strong>
              </CardDescription>
            )}
          </CardHeader>
          <form onSubmit={handleSubmit}>
            <CardContent className="space-y-4">
              <div className="p-3 bg-blue-50 rounded-md text-blue-700 mb-4">
                <p className="text-sm">
                  Hai già un account attivo. Inserisci solo la tua password per accedere.
                </p>
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
            <CardFooter>
              <Button className="w-full" type="submit" disabled={loading}>
                {loading ? (
                  <>
                    <span className="animate-spin mr-2">⟳</span> Accesso in corso...
                  </>
                ) : (
                  "Accedi"
                )}
              </Button>
            </CardFooter>
          </form>
        </Card>
      </div>
    );
  }

  // Se l'account non esiste, mostra il form di attivazione
  return (
    <div className="container mx-auto p-4 flex flex-col items-center justify-center min-h-screen">
      <InstallAppPrompt />
      <Card className="w-full max-w-md">
        <CardHeader>
          <CardTitle className="text-center text-xl md:text-2xl">Attiva il tuo Account</CardTitle>
          {tokenVerification?.clientName && (
            <CardDescription className="text-center">
              Stai attivando l'account per: <strong>{tokenVerification.clientName}</strong>
            </CardDescription>
          )}
        </CardHeader>
        <form onSubmit={handleSubmit}>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="username">Nome utente</Label>
              <Input
                id="username"
                placeholder="Scegli un nome utente"
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
                placeholder="Scegli una password"
                required
                value={password}
                onChange={(e) => setPassword(e.target.value)}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="confirmPassword">Conferma Password</Label>
              <Input
                id="confirmPassword"
                type="password"
                placeholder="Ripeti la password"
                required
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
              />
            </div>
          </CardContent>
          <CardFooter>
            <Button className="w-full" type="submit" disabled={loading}>
              {loading ? (
                <>
                  <span className="animate-spin mr-2">⟳</span> Attivazione in corso...
                </>
              ) : (
                "Attiva Account"
              )}
            </Button>
          </CardFooter>
        </form>
      </Card>
    </div>
  );
}