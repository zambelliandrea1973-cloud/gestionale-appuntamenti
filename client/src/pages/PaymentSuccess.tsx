import { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useLocation, useSearch } from 'wouter';
import { Check, ChevronRight, ExternalLink, CreditCard, AlertCircle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { useLicense } from '@/hooks/use-license';
import { useQuery } from '@tanstack/react-query';
import { apiRequest } from '@/lib/queryClient';
import { Separator } from '@/components/ui/separator';

export default function PaymentSuccess() {
  const { t } = useTranslation();
  const [, navigate] = useLocation();
  const search = useSearch();
  const { licenseInfo, isLoading: isLoadingLicense } = useLicense();
  const [isChecking, setIsChecking] = useState(true);
  const [success, setSuccess] = useState(false);
  
  // Recupera l'ID della sessione dalla query string (se presente)
  const sessionId = new URLSearchParams(search).get('session_id');
  const paypalOrderId = new URLSearchParams(search).get('order_id');
  const type = new URLSearchParams(search).get('type') || 'stripe';
  
  // Recupera informazioni sull'abbonamento
  const { data: subscriptionInfo, isLoading: isLoadingSubscription, refetch: refetchSubscription } = useQuery({
    queryKey: ['/api/payments/subscription'],
    queryFn: async () => {
      const res = await apiRequest('GET', '/api/payments/subscription');
      return await res.json();
    },
    refetchInterval: isChecking ? 3000 : false, // Aggiorna ogni 3 secondi durante la verifica
  });

  useEffect(() => {
    // Conferma la sessione di pagamento se l'ID è presente
    const confirmPayment = async () => {
      try {
        if (sessionId && type === 'stripe') {
          const res = await apiRequest('POST', '/api/payments/stripe/confirm-session', { 
            sessionId 
          });
          const result = await res.json();
          if (result.success) {
            // Aggiorna le informazioni sull'abbonamento
            refetchSubscription();
          }
        } else if (paypalOrderId && type === 'paypal') {
          const res = await apiRequest('POST', '/api/payments/paypal/confirm-order', { 
            orderId: paypalOrderId 
          });
          const result = await res.json();
          if (result.success) {
            // Aggiorna le informazioni sull'abbonamento
            refetchSubscription();
          }
        }
      } catch (error) {
        console.error('Errore durante la conferma del pagamento:', error);
      }
    };
    
    if (sessionId || paypalOrderId) {
      confirmPayment();
    }
  }, [sessionId, paypalOrderId, type, refetchSubscription]);

  useEffect(() => {
    // Controlla lo stato della licenza
    const checkLicense = async () => {
      try {
        // Verifica sia la licenza che le informazioni sull'abbonamento
        const hasActiveSubscription = subscriptionInfo && subscriptionInfo.active;
        const hasNonTrialLicense = licenseInfo?.type !== 'trial';
        
        setSuccess(hasActiveSubscription || hasNonTrialLicense);
      } catch (error) {
        console.error('Errore durante il controllo della licenza:', error);
        setSuccess(false);
      } finally {
        if (!isLoadingLicense && !isLoadingSubscription) {
          setIsChecking(false);
        }
      }
    };

    // Controlla lo stato della licenza quando i dati sono disponibili
    checkLicense();
    
    // Controlla nuovamente la licenza ogni 3 secondi (max 5 tentativi)
    let attempts = 0;
    const maxAttempts = 5;
    const interval = setInterval(() => {
      attempts++;
      if (success || attempts >= maxAttempts) {
        clearInterval(interval);
        setIsChecking(false);
      } else {
        checkLicense();
      }
    }, 3000);

    return () => {
      clearInterval(interval);
    };
  }, [licenseInfo, subscriptionInfo, success, isLoadingLicense, isLoadingSubscription]);

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
            <>
              <div className="bg-green-50 text-green-700 rounded-lg p-4 my-4">
                <p>{t('payment.success.activated', 'Il tuo abbonamento è stato attivato correttamente.')}</p>
                <p className="mt-2">{t('payment.success.access', 'Ora puoi accedere a tutte le funzionalità premium.')}</p>
              </div>
              
              {/* Dettagli dell'abbonamento */}
              {subscriptionInfo && (
                <div className="mt-6 text-left">
                  <h3 className="font-medium text-lg mb-3">{t('payment.details', 'Dettagli dell\'abbonamento')}</h3>
                  <div className="bg-gray-50 rounded-lg p-4 border">
                    <div className="flex justify-between items-center mb-2">
                      <span className="text-muted-foreground">{t('payment.plan', 'Piano')}:</span>
                      <span className="font-medium">{subscriptionInfo.plan?.name || t('payment.activePlan', 'Piano Attivo')}</span>
                    </div>
                    
                    {subscriptionInfo.startedAt && (
                      <div className="flex justify-between items-center mb-2">
                        <span className="text-muted-foreground">{t('payment.startDate', 'Data di inizio')}:</span>
                        <span>{new Date(subscriptionInfo.startedAt).toLocaleDateString()}</span>
                      </div>
                    )}
                    
                    {subscriptionInfo.expiresAt && (
                      <div className="flex justify-between items-center mb-2">
                        <span className="text-muted-foreground">{t('payment.nextBilling', 'Prossimo rinnovo')}:</span>
                        <span>{new Date(subscriptionInfo.expiresAt).toLocaleDateString()}</span>
                      </div>
                    )}
                    
                    <div className="flex justify-between items-center">
                      <span className="text-muted-foreground">{t('payment.status', 'Stato')}:</span>
                      <span className="inline-flex items-center">
                        <span className="h-2 w-2 rounded-full bg-green-500 mr-2"></span>
                        {t('payment.active', 'Attivo')}
                      </span>
                    </div>
                  </div>
                  
                  {subscriptionInfo.plan && (
                    <div className="mt-4">
                      <h4 className="font-medium mb-2">{t('payment.features', 'Funzionalità incluse')}:</h4>
                      <ul className="space-y-1">
                        {subscriptionInfo.plan.features && Array.isArray(JSON.parse(subscriptionInfo.plan.features || '[]')) && 
                          JSON.parse(subscriptionInfo.plan.features || '[]').map((feature: string, index: number) => (
                            <li key={index} className="flex items-start">
                              <Check className="h-4 w-4 text-green-500 mr-2 mt-0.5" />
                              <span>{feature}</span>
                            </li>
                          ))
                        }
                      </ul>
                    </div>
                  )}
                  
                  <div className="mt-6 bg-blue-50 text-blue-700 rounded-lg p-3 text-sm flex items-start">
                    <AlertCircle className="h-5 w-5 mr-2 flex-shrink-0 mt-0.5" />
                    <div>
                      {t('payment.supportInfo', 'Per qualsiasi domanda sull\'abbonamento, contatta il supporto. Conserva la ricevuta di pagamento che riceverai via email.')}
                    </div>
                  </div>
                </div>
              )}
            </>
          ) : (
            <div className="bg-amber-50 text-amber-700 rounded-lg p-4 my-4">
              <p>{t('payment.pending.info', 'Il tuo pagamento è stato ricevuto e il tuo abbonamento sarà attivato a breve.')}</p>
              <p className="mt-2">{t('payment.pending.wait', 'Ti preghiamo di pazientare alcuni istanti mentre elaboriamo la transazione.')}</p>
              
              <div className="mt-4 pt-4 border-t border-amber-200">
                <p className="text-sm flex items-center">
                  <AlertCircle className="h-4 w-4 mr-2" />
                  {t('payment.pending.refresh', 'Se la pagina non si aggiorna automaticamente, ricarica la pagina tra qualche minuto.')}
                </p>
              </div>
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