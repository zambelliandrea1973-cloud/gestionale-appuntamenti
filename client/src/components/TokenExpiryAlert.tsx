import React, { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
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
  const { t } = useTranslation();
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
          title: t('i18nFinale.tokenExpiry.regenerated'),
          description: t('i18nFinale.tokenExpiry.regeneratedDescription'),
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
        title: t('common.error'),
        description: t('i18nFinale.tokenExpiry.cannotRegenerate'),
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
            {t('i18nFinale.tokenExpiry.expiringTitle')}
          </AlertDialogTitle>
          <AlertDialogDescription>
            <p className="mt-2">
              {daysToExpiry === 0
                ? t('i18nFinale.tokenExpiry.expiresToday')
                : daysToExpiry === 1
                  ? t('i18nFinale.tokenExpiry.expiresInOneDay')
                  : t('i18nFinale.tokenExpiry.expiresInDays', { count: daysToExpiry })}
            </p>
            <p className="mt-2">
              {t('i18nFinale.tokenExpiry.regenerationPrompt')}
            </p>
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel>{t('i18nFinale.tokenExpiry.later')}</AlertDialogCancel>
          <AlertDialogAction
            onClick={regenerateToken}
            disabled={isRegenerating}
            className="bg-amber-600 hover:bg-amber-700"
          >
            {isRegenerating ? (
              <>
                <RefreshCw className="h-4 w-4 mr-2 animate-spin" />
                {t('i18nFinale.tokenExpiry.regenerating')}
              </>
            ) : (
              t('i18nFinale.tokenExpiry.regenerateToken')
            )}
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}