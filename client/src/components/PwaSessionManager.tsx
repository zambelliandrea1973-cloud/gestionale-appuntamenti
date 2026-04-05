import { useEffect, useState } from "react";
import { useLocation } from "wouter";
import { useToast } from "@/hooks/use-toast";
import { Loader2 } from "lucide-react";
import { apiRequest } from "@/lib/queryClient";

export default function PwaSessionManager({ children }: { children: React.ReactNode }) {
  const [isLoading, setIsLoading] = useState(true);
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [_, setLocation] = useLocation();
  const { toast } = useToast();

  useEffect(() => {
    const verifySession = async () => {
      try {
        const isPWA = 
          window.matchMedia('(display-mode: standalone)').matches || 
          (window.navigator as any).standalone || 
          document.referrer.includes('android-app://');
        
        console.log("PwaSessionManager - Verifica sessione, isPWA:", isPWA);
        
        const token = localStorage.getItem('clientAccessToken');
        const clientId = localStorage.getItem('clientId');
        
        if (!token || !clientId) {
          console.log("PwaSessionManager - Nessun token o clientId trovato");
          setIsAuthenticated(false);
          setIsLoading(false);
          if (isPWA) {
            toast({
              title: "Sessione scaduta",
              description: "La tua sessione è scaduta, effettua nuovamente l'accesso.",
              variant: "destructive",
            });
            setTimeout(() => {
              setLocation("/client-login");
            }, 1000);
          }
          return;
        }
        
        console.log("PwaSessionManager - Verifica token");
        const response = await apiRequest('POST', '/api/verify-token', { 
          token, 
          clientId: parseInt(clientId, 10) 
        });
        
        if (response.ok) {
          console.log("PwaSessionManager - Token valido");
          setIsAuthenticated(true);
        } else {
          console.log("PwaSessionManager - Token non valido, sessione scaduta");
          setIsAuthenticated(false);
          
          if (isPWA) {
            toast({
              title: "Sessione scaduta",
              description: "La tua sessione è scaduta, effettua nuovamente l'accesso.",
              variant: "destructive",
            });
            setTimeout(() => {
              setLocation("/client-login");
            }, 1000);
          }
        }
      } catch (error) {
        console.error("PwaSessionManager - Errore verifica sessione:", error);
        setIsAuthenticated(false);
      } finally {
        setIsLoading(false);
      }
    };
    
    verifySession();
  }, [setLocation, toast]);

  if (isLoading) {
    return (
      <div className="flex flex-col items-center justify-center min-h-screen">
        <Loader2 className="h-12 w-12 animate-spin text-primary" />
        <p className="mt-4 text-muted-foreground">Verifica sessione...</p>
      </div>
    );
  }

  return <>{children}</>;
}
