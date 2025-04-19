import React from 'react';
import { useNavigate } from 'wouter';
import { Button } from '@/components/ui/button';
import { Loader2 } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import localStorageClient from '@/lib/localStorageClient';

interface SimpleLoginButtonProps {
  className?: string;
  label?: string;
  onSuccess?: () => void;
  onError?: (error: any) => void;
}

/**
 * Pulsante per eseguire login semplificato con GET
 * Utilizza le credenziali in localStorage.
 */
export default function SimpleLoginButton({
  className = '',
  label = 'Accedi in modalità semplificata',
  onSuccess,
  onError
}: SimpleLoginButtonProps) {
  const [loading, setLoading] = React.useState(false);
  const [, navigate] = useNavigate();
  const { toast } = useToast();
  
  // Verifica se abbiamo le credenziali necessarie
  const hasCredentials = localStorageClient.hasStoredCredentials();
  
  const handleClick = async () => {
    try {
      setLoading(true);
      
      // Se non abbiamo credenziali, mostra un errore
      if (!hasCredentials) {
        toast({
          title: "Impossibile accedere",
          description: "Nessuna credenziale salvata. Esegui prima il login normale.",
          variant: "destructive"
        });
        return;
      }
      
      // Esegui login con metodo GET semplificato
      const user = await localStorageClient.loginWithStoredCredentials({
        useSimpleLogin: true,
        pwaMode: window.matchMedia('(display-mode: standalone)').matches || 
                (window.navigator as any).standalone || 
                document.referrer.includes('android-app://')
      });
      
      if (user) {
        // Mostra toast di successo
        toast({
          title: "Accesso effettuato",
          description: `Benvenuto, ${user.client?.firstName || 'Utente'}!`
        });
        
        // Callback di successo
        if (onSuccess) {
          onSuccess();
        } else {
          // Naviga all'area client
          setTimeout(() => {
            navigate('/client-area');
          }, 500);
        }
      } else {
        toast({
          title: "Accesso fallito",
          description: "Impossibile accedere con le credenziali salvate",
          variant: "destructive"
        });
        
        if (onError) {
          onError(new Error("Login failed"));
        }
      }
    } catch (error) {
      console.error("Errore durante login semplificato:", error);
      
      toast({
        title: "Errore",
        description: "Si è verificato un errore durante l'accesso",
        variant: "destructive"
      });
      
      if (onError) {
        onError(error);
      }
    } finally {
      setLoading(false);
    }
  };
  
  if (!hasCredentials) {
    return null; // Non mostrare il pulsante se non ci sono credenziali
  }
  
  return (
    <Button
      variant="outline"
      className={className}
      onClick={handleClick}
      disabled={loading}
    >
      {loading ? (
        <>
          <Loader2 className="mr-2 h-4 w-4 animate-spin" />
          Accesso in corso...
        </>
      ) : (
        label
      )}
    </Button>
  );
}