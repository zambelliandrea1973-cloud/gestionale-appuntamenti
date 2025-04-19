import { useState } from 'react';
import { localStorageClient } from '@/lib/localStorageClient';
import { useLocation } from 'wouter';
import { Button } from '@/components/ui/button';
import { useToast } from '@/hooks/use-toast';
import { Loader2 } from 'lucide-react';

interface SimpleLoginButtonProps {
  username: string;
  clientId: number;
  token: string;
  variant?: 'default' | 'outline' | 'secondary' | 'ghost' | 'link' | 'destructive';
  size?: 'default' | 'sm' | 'lg' | 'icon';
  isPwa?: boolean;
  text?: string;
}

/**
 * Componente pulsante per login semplificato tramite GET request
 * Particolarmente utile nei contesti PWA e browser Android/iOS con problemi di CORS o POST
 */
export default function SimpleLoginButton({
  username,
  clientId,
  token,
  variant = 'default',
  size = 'default',
  isPwa = false,
  text = 'Accesso semplificato'
}: SimpleLoginButtonProps) {
  const [isLoading, setIsLoading] = useState(false);
  const [, setLocation] = useLocation();
  const { toast } = useToast();

  const handleSimpleLogin = async () => {
    if (!username || !clientId || !token) {
      toast({
        title: "Errore",
        description: "Credenziali incomplete per il login semplificato",
        variant: "destructive"
      });
      return;
    }

    setIsLoading(true);

    try {
      // Costruiamo l'URL con i parametri per il login tramite GET
      const loginUrl = `/api/client/simple-login?username=${encodeURIComponent(username)}&clientId=${clientId}&token=${encodeURIComponent(token)}`;
      
      // Utilizziamo fetch direttamente per maggiore controllo
      const response = await fetch(loginUrl, {
        method: 'GET',
        headers: {
          'Accept': 'application/json',
          'X-PWA-Client': isPwa ? 'true' : 'false'
        }
      });
      
      const data = await response.json();
      
      if (response.ok) {
        // Salva credenziali nel localStorage per usi futuri
        localStorageClient.storeCredentials(username, clientId, token);
        
        toast({
          title: "Accesso effettuato",
          description: "Benvenuto nell'area cliente"
        });
        
        // Reindirizza all'area client
        setLocation('/client-area');
      } else {
        // Gestisce errori (anche quelli 401)
        console.error('Errore login semplificato:', data);
        toast({
          title: "Errore di accesso",
          description: data.message || 'Impossibile accedere con queste credenziali',
          variant: "destructive"
        });
      }
    } catch (error) {
      console.error('Errore durante il login semplificato:', error);
      toast({
        title: "Errore di connessione",
        description: "Verificare la connessione Internet e riprovare",
        variant: "destructive"
      });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <Button 
      variant={variant} 
      size={size}
      onClick={handleSimpleLogin}
      disabled={isLoading}
    >
      {isLoading ? (
        <>
          <Loader2 className="mr-2 h-4 w-4 animate-spin" />
          Accesso in corso...
        </>
      ) : (
        text
      )}
    </Button>
  );
}