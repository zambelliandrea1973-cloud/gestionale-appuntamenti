import { useState } from "react";
import { useLocation } from "wouter";
import { useToast } from "@/hooks/use-toast";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { apiRequest } from "@/lib/queryClient";
import InstallAppPrompt from "@/components/InstallAppPrompt";

export default function ClientLogin() {
  const [, setLocation] = useLocation();
  const { toast } = useToast();
  const [username, setUsername] = useState<string>("");
  const [password, setPassword] = useState<string>("");
  const [loading, setLoading] = useState<boolean>(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    
    try {
      const response = await apiRequest('POST', '/api/client/login', {
        username,
        password,
      });
      
      if (response.ok) {
        const user = await response.json();
        
        toast({
          title: "Accesso effettuato",
          description: `Benvenuto, ${user.client?.firstName || username}!`,
        });
        
        // Redirect alla home page del cliente
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
                  <span className="animate-spin mr-2">⟳</span> Accesso in corso...
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
          </CardFooter>
        </form>
      </Card>
    </div>
  );
}