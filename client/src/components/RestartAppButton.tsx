import { useState } from 'react';
import { useToast } from '@/hooks/use-toast';
import { apiRequest } from '@/lib/queryClient';
import { Loader2, RefreshCw } from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import { useTranslation } from 'react-i18next';

interface RestartAppButtonProps {
  variant?: 'default' | 'destructive' | 'outline' | 'secondary' | 'ghost' | 'link';
  size?: 'default' | 'sm' | 'lg' | 'icon';
  className?: string;
}

export function RestartAppButton({ variant = 'default', size = 'default', className = '' }: RestartAppButtonProps) {
  const [isLoading, setIsLoading] = useState(false);
  const [isOpen, setIsOpen] = useState(false);
  const [isRestarting, setIsRestarting] = useState(false);
  const [countdown, setCountdown] = useState(0);
  const { toast } = useToast();
  const { t } = useTranslation();

  const handleRestartApp = async () => {
    try {
      setIsLoading(true);
      
      // Step 1: Ottieni un token di riavvio
      const tokenResponse = await apiRequest('GET', '/api/admin/restart-token');
      const tokenData = await tokenResponse.json();
      
      if (!tokenData.success || !tokenData.token) {
        throw new Error('Impossibile ottenere il token di riavvio');
      }
      
      // Step 2: Riavvia l'applicazione
      setIsRestarting(true);
      const restartResponse = await apiRequest('POST', '/api/admin/restart', { token: tokenData.token });
      const restartData = await restartResponse.json();
      
      if (!restartData.success) {
        throw new Error(restartData.message || 'Errore durante il riavvio');
      }
      
      // Step 3: Inizia il conto alla rovescia
      setCountdown(15); // 15 secondi per il riavvio
      
      // Diminuisci il countdown ogni secondo
      const countdownInterval = setInterval(() => {
        setCountdown((prev) => {
          const newCount = prev - 1;
          if (newCount <= 0) {
            clearInterval(countdownInterval);
            setIsOpen(false);
            
            // Ricarica la pagina alla fine del conto alla rovescia
            setTimeout(() => {
              window.location.reload();
            }, 500);
          }
          return newCount;
        });
      }, 1000);
      
      // Mostra un toast di successo
      toast({
        title: 'Riavvio in corso',
        description: restartData.message,
        duration: 5000,
      });
    } catch (error: any) {
      console.error('Errore durante il riavvio:', error);
      
      toast({
        title: 'Errore di riavvio',
        description: error.message || 'Si è verificato un errore durante il riavvio dell\'applicazione',
        variant: 'destructive',
      });
      
      setIsRestarting(false);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={setIsOpen}>
      <DialogTrigger asChild>
        <Button 
          variant={variant} 
          size={size} 
          className={`${className} relative group`}
          disabled={isLoading}
        >
          {isLoading ? (
            <Loader2 className="h-4 w-4 animate-spin mr-2" />
          ) : (
            <RefreshCw className="h-4 w-4 mr-2 group-hover:rotate-180 transition-transform duration-500" />
          )}
          {t('admin.restartApp')}
        </Button>
      </DialogTrigger>
      
      <DialogContent>
        <DialogHeader>
          <DialogTitle>
            {isRestarting ? t('admin.restartInProgress') : t('admin.confirmRestart')}
          </DialogTitle>
          <DialogDescription>
            {isRestarting 
              ? t('admin.restartCountdown', { seconds: countdown })
              : t('admin.restartWarning')}
          </DialogDescription>
        </DialogHeader>
        
        {!isRestarting && (
          <DialogFooter className="gap-2 sm:gap-0">
            <Button 
              variant="outline" 
              onClick={() => setIsOpen(false)}
              disabled={isLoading}
            >
              {t('common.cancel')}
            </Button>
            <Button 
              variant="destructive" 
              onClick={handleRestartApp}
              disabled={isLoading}
            >
              {isLoading && <Loader2 className="h-4 w-4 animate-spin mr-2" />}
              {t('admin.restartNow')}
            </Button>
          </DialogFooter>
        )}
        
        {isRestarting && (
          <div className="flex justify-center items-center py-4">
            <div className="animate-pulse rounded-full bg-primary h-16 w-16 flex items-center justify-center">
              <RefreshCw className="h-8 w-8 text-white animate-spin" />
            </div>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}