import { useState, useEffect } from "react";
import { useLocation } from "wouter";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { AlertCircle, Loader2 } from "lucide-react";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { PasswordInput } from "@/components/ui/password-input";
import { Checkbox } from "@/components/ui/checkbox";
import { useMutation } from "@tanstack/react-query";
import { useToast } from "@/hooks/use-toast";

export default function CustomerLogin() {
  const [username, setUsername] = useState<string>("");
  const [password, setPassword] = useState<string>("");
  const [rememberMe, setRememberMe] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);
  const [, navigate] = useLocation();
  const { toast } = useToast();
  
  // Carica le credenziali memorizzate quando la pagina viene caricata
  useEffect(() => {
    const savedUsername = localStorage.getItem("customerUsername");
    if (savedUsername) {
      setUsername(savedUsername);
      setRememberMe(true);
    }
  }, []);
  
  // Crea la mutazione per gestire il login
  const loginMutation = useMutation({
    mutationFn: async (credentials: { username: string; password: string }) => {
      const response = await apiRequest("POST", "/api/staff/login", credentials);
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || "Errore durante l'accesso");
      }
      return response.json();
    },
    onSuccess: (userData) => {
      console.log("Login customer riuscito, dati utente:", userData);
      
      // Forza la ripultura della cache per ottenere i dati utente aggiornati
      queryClient.invalidateQueries({ queryKey: ['/api/user-with-license'] });
      queryClient.invalidateQueries({ queryKey: ['/api/clients'] });
      
      // Salva username se richiesto
      if (rememberMe) {
        localStorage.setItem("customerUsername", username);
      } else {
        localStorage.removeItem("customerUsername");
      }
      
      // Reindirizza alla dashboard
      setTimeout(() => {
        console.log("Reindirizzamento alla dashboard per customer");
        window.location.href = "/dashboard";
      }, 100);
    },
    onError: (error: Error) => {
      setError(error.message || "Si è verificato un errore durante l'accesso");
      toast({
        title: "Errore di accesso",
        description: error.message || "Si è verificato un errore durante l'accesso",
        variant: "destructive",
      });
    }
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    
    // Verifica che tutti i campi siano compilati
    if (!username || !password) {
      setError("Inserisci sia username che password");
      return;
    }
    
    // Esegui la mutazione
    loginMutation.mutate({ username, password });
  };
  
  return (
    <div className="flex flex-col min-h-screen items-center justify-center p-4 md:p-8">
      <div className="w-full max-w-4xl grid grid-cols-1 md:grid-cols-2 gap-6 items-center">
        {/* Form di login */}
        <Card className="w-full shadow-lg">
          <CardHeader>
            <CardTitle className="text-2xl font-bold text-center">
              Accesso Professionista
            </CardTitle>
            <CardDescription className="text-center">
              Accedi al tuo account professionale per gestire clienti e appuntamenti
            </CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit} className="space-y-4">
              {error && (
                <Alert variant="destructive">
                  <AlertCircle className="h-4 w-4" />
                  <AlertTitle>Errore</AlertTitle>
                  <AlertDescription>{error}</AlertDescription>
                </Alert>
              )}
              
              <div className="space-y-2">
                <Label htmlFor="username">Username</Label>
                <Input
                  id="username"
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                  placeholder="Inserisci il tuo username"
                />
              </div>
              
              <div className="space-y-2">
                <Label htmlFor="password">Password</Label>
                <PasswordInput
                  id="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="Inserisci la tua password"
                />
              </div>
              
              <div className="flex items-center space-x-2">
                <Checkbox 
                  id="rememberMe" 
                  checked={rememberMe}
                  onCheckedChange={(checked) => setRememberMe(checked as boolean)}
                />
                <Label htmlFor="rememberMe" className="text-sm">
                  Ricorda il mio account
                </Label>
              </div>
              
              <Button 
                type="submit" 
                className="w-full" 
                disabled={loginMutation.isPending}
              >
                {loginMutation.isPending ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Accesso in corso...
                  </>
                ) : (
                  "Accedi"
                )}
              </Button>
            </form>
          </CardContent>
          <CardFooter className="flex flex-col space-y-2">
            <div className="text-sm text-gray-600 text-center">
              Sei uno staff member o amministratore?{" "}
              <button
                onClick={() => navigate("/staff-login")}
                className="text-primary hover:underline"
              >
                Accedi come Staff
              </button>
            </div>
          </CardFooter>
        </Card>

        {/* Sezione informativa */}
        <div className="space-y-6">
          <div className="text-center md:text-left">
            <h1 className="text-3xl font-bold text-gray-900 mb-4">
              Gestione Professionale
            </h1>
            <p className="text-lg text-gray-600 mb-6">
              Accedi al tuo account professionale per gestire clienti, appuntamenti e tutti gli strumenti per il tuo lavoro.
            </p>
          </div>
          
          <div className="space-y-4">
            <div className="flex items-start space-x-3">
              <div className="bg-primary/10 p-2 rounded-full">
                <svg className="w-5 h-5 text-primary" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197m13.5-9a2.5 2.5 0 11-5 0 2.5 2.5 0 015 0z" />
                </svg>
              </div>
              <div>
                <h3 className="font-semibold text-gray-900">Gestione Clienti</h3>
                <p className="text-gray-600">Organizza e gestisci tutti i tuoi clienti in un unico posto</p>
              </div>
            </div>
            
            <div className="flex items-start space-x-3">
              <div className="bg-primary/10 p-2 rounded-full">
                <svg className="w-5 h-5 text-primary" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3a2 2 0 012-2h4a2 2 0 012 2v4m-6 4v4a2 2 0 002 2h4a2 2 0 002-2v-4M8 7H5a2 2 0 00-2 2v9a2 2 0 002 2h3m5-13h3a2 2 0 012 2v9a2 2 0 01-2 2h-3m-5-9v9" />
                </svg>
              </div>
              <div>
                <h3 className="font-semibold text-gray-900">Appuntamenti</h3>
                <p className="text-gray-600">Pianifica e monitora gli appuntamenti con facilità</p>
              </div>
            </div>
            
            <div className="flex items-start space-x-3">
              <div className="bg-primary/10 p-2 rounded-full">
                <svg className="w-5 h-5 text-primary" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
                </svg>
              </div>
              <div>
                <h3 className="font-semibold text-gray-900">Report e Analisi</h3>
                <p className="text-gray-600">Monitora le performance della tua attività</p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}