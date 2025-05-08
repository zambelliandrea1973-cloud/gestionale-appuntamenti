import { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useLocation } from 'wouter';
import { Check, ChevronRight } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { useLicense } from '@/hooks/use-license';

export default function PaymentSuccess() {
  const { t } = useTranslation();
  const [, navigate] = useLocation();
  const { licenseInfo, isLoading } = useLicense();
  const [isChecking, setIsChecking] = useState(true);
  const [success, setSuccess] = useState(false);

  useEffect(() => {
    // Controlla lo stato della licenza
    const checkLicense = async () => {
      try {
        // Se la licenza è attiva, mostra il successo
        setSuccess(licenseInfo?.type !== 'trial');
      } catch (error) {
        console.error('Errore durante il controllo della licenza:', error);
        setSuccess(false);
      } finally {
        setIsChecking(false);
      }
    };

    // Controlla lo stato della licenza all'avvio
    checkLicense();

    // Controlla nuovamente la licenza ogni 3 secondi (max 5 tentativi)
    let attempts = 0;
    const maxAttempts = 5;
    const interval = setInterval(() => {
      attempts++;
      if (success || attempts >= maxAttempts) {
        clearInterval(interval);
      } else {
        checkLicense();
      }
    }, 3000);

    return () => {
      clearInterval(interval);
    };
  }, [licenseInfo, success]);

  return (
    <div className="container max-w-lg mx-auto py-12">
      <Card className="w-full">
        <CardHeader className="text-center">
          <CardTitle className="text-2xl">
            {isChecking ? (
              t('payment.processing', 'Elaborazione del pagamento in corso...')
            ) : success ? (
              <>
                <Check className="h-10 w-10 mx-auto mb-4 text-green-500" />
                {t('payment.success.title', 'Pagamento completato con successo!')}
              </>
            ) : (
              t('payment.pending.title', 'Elaborazione del pagamento')
            )}
          </CardTitle>
          <CardDescription>
            {isChecking ? (
              t('payment.checking', 'Stiamo verificando lo stato del tuo abbonamento...')
            ) : success ? (
              t('payment.success.description', 'Grazie per aver sottoscritto un abbonamento. Il tuo account è stato aggiornato.')
            ) : (
              t('payment.pending.description', 'Il tuo pagamento è in fase di elaborazione. Questo processo può richiedere alcuni minuti. Controlla lo stato dell\'abbonamento nella tua area personale.')
            )}
          </CardDescription>
        </CardHeader>
        <CardContent className="text-center">
          {isChecking ? (
            <div className="flex justify-center my-8">
              <div className="animate-spin h-8 w-8 border-4 border-primary border-t-transparent rounded-full" />
            </div>
          ) : success ? (
            <div className="bg-green-50 text-green-700 rounded-lg p-4 my-4">
              <p>{t('payment.success.activated', 'Il tuo abbonamento è stato attivato correttamente.')}</p>
              <p className="mt-2">{t('payment.success.access', 'Ora puoi accedere a tutte le funzionalità premium.')}</p>
            </div>
          ) : (
            <div className="bg-amber-50 text-amber-700 rounded-lg p-4 my-4">
              <p>{t('payment.pending.info', 'Il tuo pagamento è stato ricevuto e il tuo abbonamento sarà attivato a breve.')}</p>
              <p className="mt-2">{t('payment.pending.wait', 'Ti preghiamo di pazientare alcuni istanti mentre elaboriamo la transazione.')}</p>
            </div>
          )}
        </CardContent>
        <CardFooter className="flex justify-center">
          <Button 
            onClick={() => navigate('/')}
            className="mt-4"
          >
            {t('payment.return', 'Torna alla dashboard')}
            <ChevronRight className="h-4 w-4 ml-2" />
          </Button>
        </CardFooter>
      </Card>
    </div>
  );
}