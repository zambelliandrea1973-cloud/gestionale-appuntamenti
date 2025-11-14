import { useEffect, useState } from "react";
import { useLocation } from "wouter";
import { apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import PrivacyConsentForm from "@/components/PrivacyConsentForm";
import { Loader2 } from "lucide-react";

interface UserData {
  id: number;
  username: string;
  type: string;
  client?: {
    id: number;
    firstName: string;
    lastName: string;
    phone: string;
    email?: string;
    hasConsent: boolean;
  };
}

export default function ConsentPage() {
  const [, setLocation] = useLocation();
  const { toast } = useToast();
  const [user, setUser] = useState<UserData | null>(null);
  const [loading, setLoading] = useState<boolean>(true);

  useEffect(() => {
    // Verifica autenticazione
    fetchCurrentUser();
  }, []);

  const fetchCurrentUser = async () => {
    try {
      const response = await apiRequest('GET', '/api/current-user');
      
      if (response.ok) {
        const userData = await response.json();
        
        // Verifica che l'utente sia un cliente
        if (userData.type !== "client") {
          toast({
            title: "Accesso negato",
            description: "Questa pagina è riservata ai clienti",
            variant: "destructive",
          });
          
          setLocation("/client-login");
          return;
        }
        
        setUser(userData);
      } else {
        // Se non autenticato, reindirizza alla pagina di login
        setLocation("/client-login");
      }
    } catch (error) {
      console.error("Errore nel caricamento dell'utente corrente:", error);
      toast({
        title: "Errore di connessione",
        description: "Impossibile verificare l'autenticazione",
        variant: "destructive",
      });
      
      setLocation("/client-login");
    } finally {
      setLoading(false);
    }
  };

  const handleConsentProvided = async () => {
    // Aggiorna lo stato dell'utente
    if (user?.client?.id) {
      try {
        const response = await apiRequest('PUT', `/api/clients/${user.client.id}`, {
          ...user.client,
          hasConsent: true
        });
        
        if (response.ok) {
          // Aggiorna lo stato locale
          setUser({
            ...user,
            client: {
              ...user.client,
              hasConsent: true
            }
          });
          
          // Mostra un messaggio di successo
          toast({
            title: "Consenso registrato",
            description: "Il tuo consenso è stato registrato con successo",
          });
          
          // Reindirizza all'area cliente
          setTimeout(() => setLocation("/client-area"), 1500);
        }
      } catch (error) {
        console.error("Errore nell'aggiornamento dello stato del consenso:", error);
      }
    }
  };

  if (loading) {
    return (
      <div className="container mx-auto p-4 flex items-center justify-center min-h-screen">
        <div className="text-center">
          <Loader2 className="h-8 w-8 animate-spin mx-auto mb-4" />
          <p className="text-muted-foreground">Caricamento...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="container mx-auto p-4 py-8">
      <div className="max-w-4xl mx-auto">
        <h1 className="text-3xl font-bold mb-8 text-center">Informativa sulla Privacy</h1>
        
        {user?.client && (
          <PrivacyConsentForm 
            clientId={user.client.id} 
            onConsentProvided={handleConsentProvided}
            hasConsent={user.client.hasConsent}
          />
        )}
      </div>
    </div>
  );
}