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

export default function StaffLogin() {
  const [username, setUsername] = useState<string>("");
  const [password, setPassword] = useState<string>("");
  const [rememberMe, setRememberMe] = useState<boolean>(false);
  const [isAdminLogin, setIsAdminLogin] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);
  const [, navigate] = useLocation();
  const { toast } = useToast();
  
  // Controlla se dobbiamo mostrare la pagina di login per admin
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const roleParam = params.get('role');
    if (roleParam === 'admin') {
      setIsAdminLogin(true);
    }
  }, []);
  
  // Carica le credenziali memorizzate quando la pagina viene caricata
  useEffect(() => {
    const savedUsername = localStorage.getItem("staffUsername");
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
      console.log("Login riuscito, dati utente:", userData);
      
      // Verifica se l'utente è l'amministratore principale
      if (userData && userData.role === "admin" && userData.username === "zambelli.andrea.1973@gmail.com") {
        console.log("Utente admin principale, reindirizzamento a /staff-management");
        // Se è l'admin principale, reindirizza alla pagina di gestione staff
        navigate("/staff-management");
      } else {
        console.log("Utente standard, reindirizzamento alla dashboard");
        // Altrimenti reindirizza alla dashboard standard
        navigate("/dashboard");
      }
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
    
    // Se abbiamo selezionato "Ricorda il mio account", salva l'username
    if (rememberMe) {
      localStorage.setItem("staffUsername", username);
    } else {
      localStorage.removeItem("staffUsername");
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
              {isAdminLogin ? "Accesso Amministratore" : "Accesso Staff"}
            </CardTitle>
            <CardDescription className="text-center">
              {isAdminLogin 
                ? "Accedi con le credenziali di amministratore" 
                : "Accedi al pannello di amministrazione"}
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
                <Label
                  htmlFor="rememberMe"
                  className="text-sm font-normal cursor-pointer"
                >
                  Ricorda il mio account
                </Label>
              </div>
              
              <Button 
                type="submit" 
                className="w-full" 
                disabled={loginMutation.isPending}
              >
                {loginMutation.isPending ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
                {loginMutation.isPending ? "Accesso in corso..." : "Accedi"}
              </Button>
            </form>
          </CardContent>
          <CardFooter className="flex flex-col space-y-2 text-center text-sm">
            <div>Non hai un account? <a href="/register" className="text-primary hover:underline">Registrati</a></div>
            <div className="pt-2 border-t">
              <span className="text-muted-foreground">
                Sei un cliente? {" "}
                <a 
                  href="/client-login" 
                  className="text-primary hover:underline"
                  onClick={(e) => {
                    e.preventDefault();
                    navigate("/client-login");
                  }}
                >
                  Accedi all'area clienti
                </a>
              </span>
            </div>
          </CardFooter>
        </Card>
        
        {/* Sezione informativa */}
        <div className="hidden md:block p-6">
          <h2 className="text-3xl font-bold mb-4 bg-gradient-to-r from-primary to-primary/70 bg-clip-text text-transparent">
            Pannello di Amministrazione
          </h2>
          <p className="text-lg mb-6">
            Gestisci la tua attività da un'unica interfaccia:
          </p>
          <ul className="space-y-3">
            <li className="flex items-start">
              <div className="mr-2 rounded-full bg-primary/10 p-1 text-primary">
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                  <path d="M20 6L9 17L4 12" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                </svg>
              </div>
              <span>Calendario degli appuntamenti</span>
            </li>
            <li className="flex items-start">
              <div className="mr-2 rounded-full bg-primary/10 p-1 text-primary">
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                  <path d="M20 6L9 17L4 12" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                </svg>
              </div>
              <span>Gestione clienti</span>
            </li>
            <li className="flex items-start">
              <div className="mr-2 rounded-full bg-primary/10 p-1 text-primary">
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                  <path d="M20 6L9 17L4 12" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                </svg>
              </div>
              <span>Fatturazione e pagamenti</span>
            </li>
            <li className="flex items-start">
              <div className="mr-2 rounded-full bg-primary/10 p-1 text-primary">
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                  <path d="M20 6L9 17L4 12" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                </svg>
              </div>
              <span>Invio notifiche e promemoria</span>
            </li>
          </ul>
          <div className="mt-6 text-sm text-muted-foreground">
            Accesso riservato agli utenti staff e amministratori.
          </div>
        </div>
      </div>
    </div>
  );
}