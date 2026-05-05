import { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useLocation } from 'wouter';
import { apiRequest } from '@/lib/queryClient';
import { useToast } from '@/hooks/use-toast';
import { useUserWithLicense } from '@/hooks/use-user-with-license';
import { 
  isBetaTester, 
  getBetaCode, 
  clearBetaInvite, 
  isBetaCodeUsed,
  markBetaCodeAsUsed
} from '@/lib/betaUtils';

export function BetaStatusChecker() {
  const { t } = useTranslation();
  const [isChecking, setIsChecking] = useState(false);
  const { toast } = useToast();
  const [, navigate] = useLocation();
  const { user } = useUserWithLicense();

  useEffect(() => {
    const checkBetaStatus = async () => {
      if (!user?.id) return;
      
      try {
        // Verifica se l'utente ha un badge beta valido in localStorage con separazione utente
        if (isBetaTester(user.id)) {
          const betaCode = getBetaCode(user.id);
          
          // Verifica se il codice è stato utilizzato
          if (!isBetaCodeUsed(user.id) && betaCode) {
            setIsChecking(true);
            
            // Verifica il codice beta sul server
            const response = await apiRequest('GET', `/api/beta/verify/${betaCode}`);
            const data = await response.json();
            
            if (data.valid) {
              // Codice valido, segnala che questo è un beta tester
              markBetaCodeAsUsed(user.id);
              
              // Mostra un toast di benvenuto per il beta tester
              toast({
                title: t('i18nFinale.betaStatus.title'),
                description: t('i18nFinale.betaStatus.welcomeMessage'),
                variant: 'default',
                duration: 5000,
              });
            } else {
              // Codice non valido o già usato, rimuovilo dal localStorage
              clearBetaInvite(user.id);
              
              toast({
                title: t('i18nFinale.betaStatus.invalidCode'),
                description: data.message || t('i18nFinale.betaStatus.codeExpired', 'The beta code is no longer valid.'),
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
  }, [user?.id, toast]);
  
  return null; // Questo componente non visualizza nulla, gestisce solo la logica
}