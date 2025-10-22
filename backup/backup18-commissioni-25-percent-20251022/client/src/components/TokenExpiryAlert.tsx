import React, { useEffect, useState } from 'react';
import { apiRequest } from '@/lib/queryClient';
import { useToast } from '@/hooks/use-toast';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { AlertTriangle, RefreshCw } from 'lucide-react';

interface TokenExpiryAlertProps {
  token: string;
  clientId: number;
}

export function TokenExpiryAlert({ token, clientId }: TokenExpiryAlertProps) {
  const [isExpiringSoon, setIsExpiringSoon] = useState<boolean>(false);
  const [daysToExpiry, setDaysToExpiry] = useState<number>(0);
  const [showDialog, setShowDialog] = useState<boolean>(false);
  const [isRegenerating, setIsRegenerating] = useState<boolean>(false);
  const { toast } = useToast();

  // Controlla lo stato di scadenza del token
  useEffect(() => {
    if (token) {
      checkTokenExpiry();
    }
  }, [token]);

  const checkTokenExpiry = async () => {
    try {
      const response = await apiRequest('GET', `/api/token/${token}/expiry-status`);
      
      if (response.ok) {
        const data = await response.json();
        setIsExpiringSoon(data.isExpiringSoon);
        setDaysToExpiry(data.daysToExpiry);
        
        // Se il token sta per scadere, mostra il dialog
        if (data.isExpiringSoon) {
          setShowDialog(true);
        }
      }
    } catch (error) {
      console.error('Errore nel controllo della scadenza del token:', error);
    }
  };

  // Funzione per rigenerare il token
  const regenerateToken = async () => {
    setIsRegenerating(true);
    
    try {
      const response = await apiRequest('POST', `/api/clients/${clientId}/regenerate-token`);
      
      if (response.ok) {
        const data = await response.json();
        
        toast({
          title: 'Token rigenerato con successo',
          description: 'Un nuovo QR code è stato generato.',
        });
        
        // Chiudi il dialog
        setShowDialog(false);
        
        // Reindirizza alla pagina con il nuovo QR code
        window.location.href = data.activationUrl;
      } else {
        throw new Error('Errore nella rigenerazione del token');
      }
    } catch (error) {
      console.error('Errore nella rigenerazione del token:', error);
      toast({
        title: 'Errore',
        description: 'Impossibile rigenerare il token. Riprova più tardi.',
        variant: 'destructive',
      });
    } finally {
      setIsRegenerating(false);
    }
  };

  // Se il token non sta per scadere, non mostrare nulla
  if (!isExpiringSoon) {
    return null;
  }

  return (
    <AlertDialog open={showDialog} onOpenChange={setShowDialog}>
      <AlertDialogContent className="max-w-md">
        <AlertDialogHeader>
          <AlertDialogTitle className="flex items-center text-amber-600">
            <AlertTriangle className="h-5 w-5 mr-2" />
            Attenzione: Token in scadenza
          </AlertDialogTitle>
          <AlertDialogDescription>
            <p className="mt-2">
              Il tuo token di accesso scadrà {daysToExpiry === 0 ? 'oggi' : `tra ${daysToExpiry} ${daysToExpiry === 1 ? 'giorno' : 'giorni'}`}.
            </p>
            <p className="mt-2">
              Per continuare ad accedere all'area cliente tramite QR code, è necessario generare un nuovo token. 
              Vuoi rigenerarlo ora?
            </p>
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel>Più tardi</AlertDialogCancel>
          <AlertDialogAction
            onClick={regenerateToken}
            disabled={isRegenerating}
            className="bg-amber-600 hover:bg-amber-700"
          >
            {isRegenerating ? (
              <>
                <RefreshCw className="h-4 w-4 mr-2 animate-spin" />
                Rigenerazione...
              </>
            ) : (
              'Rigenera Token'
            )}
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}