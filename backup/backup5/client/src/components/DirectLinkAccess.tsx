import { useEffect, useState } from 'react';
import { useLocation } from 'wouter';
import { apiRequest } from '@/lib/queryClient';
import { useToast } from '@/hooks/use-toast';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Loader2 } from 'lucide-react';

interface DirectLinkAccessProps {
  token: string;
  clientId: number;
}

export function DirectLinkAccess({ token, clientId }: DirectLinkAccessProps) {
  const [, setLocation] = useLocation();
  const { toast } = useToast();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const verifyToken = async () => {
      setLoading(true);
      
      try {
        // Verifica il token e autentica l'utente in un unico passaggio
        const response = await apiRequest('POST', '/api/verify-token', {
          token,
          clientId: Number(clientId)
        });
        
        if (response.ok) {
          // Autenticazione riuscita
          toast({
            title: "Accesso effettuato",
            description: "Benvenuto nell'area cliente",
          });
          
          // Reindirizza all'area cliente
          setLocation('/client-area');
        } else {
          // Token non valido
          const errorData = await response.json();
          setError(errorData.message || "Token non valido o scaduto");
          toast({
            title: "Errore di accesso",
            description: "Il link utilizzato non è valido o è scaduto",
            variant: "destructive",
          });
          
          // Reindirizza al login dopo 3 secondi
          setTimeout(() => {
            setLocation('/client-login');
          }, 3000);
        }
      } catch (err) {
        console.error("Errore durante la verifica del token:", err);
        setError("Si è verificato un errore durante l'accesso");
        toast({
          title: "Errore di connessione",
          description: "Impossibile verificare le credenziali",
          variant: "destructive",
        });
        
        // Reindirizza al login dopo 3 secondi
        setTimeout(() => {
          setLocation('/client-login');
        }, 3000);
      } finally {
        setLoading(false);
      }
    };

    if (token && clientId) {
      verifyToken();
    } else {
      setError("Link di accesso non valido");
      setLoading(false);
      
      // Reindirizza al login dopo 3 secondi
      setTimeout(() => {
        setLocation('/client-login');
      }, 3000);
    }
  }, [token, clientId, setLocation, toast]);

  return (
    <div className="container mx-auto p-4 flex items-center justify-center min-h-screen">
      <Card className="w-full max-w-md mx-auto">
        <CardHeader>
          <CardTitle className="text-xl">Accesso diretto</CardTitle>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="flex flex-col items-center justify-center p-8">
              <Loader2 className="h-8 w-8 animate-spin text-primary" />
              <p className="mt-4 text-sm text-muted-foreground">Verifica delle credenziali in corso...</p>
            </div>
          ) : error ? (
            <div className="p-4 text-center">
              <p className="text-destructive font-medium">{error}</p>
              <p className="mt-2 text-sm text-muted-foreground">Reindirizzamento alla pagina di login...</p>
            </div>
          ) : (
            <div className="p-4 text-center">
              <p className="text-primary font-medium">Accesso effettuato con successo!</p>
              <p className="mt-2 text-sm text-muted-foreground">Reindirizzamento all'area cliente...</p>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}