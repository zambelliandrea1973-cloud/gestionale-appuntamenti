import { useEffect, useState } from 'react';
import { useLocation } from 'wouter';
import { apiRequest } from '@/lib/queryClient';
import { useToast } from '@/hooks/use-toast';

export function BetaStatusChecker() {
  const [isBetaTester, setIsBetaTester] = useState(false);
  const [isChecking, setIsChecking] = useState(false);
  const { toast } = useToast();
  const [, navigate] = useLocation();

  useEffect(() => {
    const checkBetaStatus = async () => {
      try {
        // Verifica se l'utente ha un badge beta valido in localStorage
        const betaStatus = localStorage.getItem('betaInviteStatus');
        const betaCode = localStorage.getItem('betaInviteCode');
        
        if (betaStatus === 'valid' && betaCode) {
          setIsBetaTester(true);
          
          // Verifica se il codice è stato utilizzato
          if (localStorage.getItem('betaCodeUsed') !== 'true') {
            setIsChecking(true);
            
            // Verifica il codice beta sul server
            const response = await apiRequest('GET', `/api/beta/verify/${betaCode}`);
            const data = await response.json();
            
            if (data.valid) {
              // Codice valido, segnala che questo è un beta tester
              localStorage.setItem('betaCodeUsed', 'true');
              
              // Mostra un toast di benvenuto per il beta tester
              toast({
                title: 'Modalità Beta',
                description: 'Benvenuto nel programma beta! Puoi inviare feedback in qualsiasi momento dalla pagina beta.',
                variant: 'default',
                duration: 5000,
              });
            } else {
              // Codice non valido o già usato, rimuovilo dal localStorage
              localStorage.removeItem('betaInviteStatus');
              localStorage.removeItem('betaInviteCode');
              localStorage.removeItem('betaInviteEmail');
              setIsBetaTester(false);
              
              toast({
                title: 'Codice beta non valido',
                description: data.message || 'Il codice beta non è più valido.',
                variant: 'destructive',
              });
            }
          }
        }
      } catch (error) {
        console.error('Errore durante la verifica del codice beta:', error);
      } finally {
        setIsChecking(false);
      }
    };
    
    checkBetaStatus();
  }, [toast]);
  
  return null; // Questo componente non visualizza nulla, gestisce solo la logica
}