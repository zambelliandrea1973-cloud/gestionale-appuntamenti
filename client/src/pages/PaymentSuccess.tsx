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
  const searchParams = new URLSearchParams(search);
  const sessionId = searchParams.get('session_id');
  // PayPal restituisce il token nell'URL di ritorno come "token" parameter
  const paypalOrderId = searchParams.get('subscription_id') || searchParams.get('order_id') || searchParams.get('token');
  const type = searchParams.get('type') || (sessionId ? 'stripe' : (paypalOrderId ? 'paypal' : 'stripe'));
  
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
          console.log('📦 Finalizzazione pagamento PayPal con token:', paypalOrderId);
          // Usa l'endpoint pubblico che non richiede autenticazione
          // (la sessione potrebbe essere persa dopo il redirect PayPal)
          const res = await fetch('/api/payments/paypal/finalize', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ token: paypalOrderId })
          });
          const result = await res.json();
          console.log('📦 Risultato finalizzazione PayPal:', result);
          if (result.success) {
            // Aggiorna le informazioni sull'abbonamento
            refetchSubscription();
          }
        }
      } catch (error) {
        console.error('Error during payment confirmation:', error);
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
        const hasActiveSubscription = subscriptionInfo && (subscriptionInfo.active || subscriptionInfo.status === 'active');
        const hasNonTrialLicense = licenseInfo?.type !== 'trial';
        
        setSuccess(hasActiveSubscription || hasNonTrialLicense);
      } catch (error) {
        console.error('Error during license check:', error);
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
              t('payment.processing', 'Processing payment...')
            ) : success ? (
              <>
                <Check className="h-10 w-10 mx-auto mb-4 text-green-500" />
                {t('payment.success.title', 'Payment completed successfully!')}
              </>
            ) : (
              t('payment.pending.title', 'Payment processing')
            )}
          </CardTitle>
          <CardDescription>
            {isChecking ? (
              t('payment.checking', 'Checking your subscription status...')
            ) : success ? (
              t('payment.success.description', 'Thank you for subscribing. Your account has been updated.')
            ) : (
              t('payment.pending.description', 'Your payment is being processed. This may take a few minutes. Check your subscription status in your personal area.')
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
                <p>{t('payment.success.activated', 'Your subscription has been activated successfully.')}</p>
                <p className="mt-2">{t('payment.success.access', 'You can now access all premium features.')}</p>
              </div>
              
              {/* Dettagli dell'abbonamento */}
              {subscriptionInfo && (
                <div className="mt-6 text-left">
                  <h3 className="font-medium text-lg mb-3">{t('payment.details', 'Subscription details')}</h3>
                  <div className="bg-gray-50 rounded-lg p-4 border">
                    <div className="flex justify-between items-center mb-2">
                      <span className="text-muted-foreground">{t('payment.plan', 'Plan')}:</span>
                      <span className="font-medium">{subscriptionInfo.plan?.name || t('payment.activePlan', 'Active Plan')}</span>
                    </div>
                    
                    {subscriptionInfo.startedAt && (
                      <div className="flex justify-between items-center mb-2">
                        <span className="text-muted-foreground">{t('payment.startDate', 'Start date')}:</span>
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
                      <span className="text-muted-foreground">{t('payment.status', 'Status')}:</span>
                      <span className="inline-flex items-center">
                        <span className="h-2 w-2 rounded-full bg-green-500 mr-2"></span>
                        {t('payment.active', 'Active')}
                      </span>
                    </div>
                  </div>
                  
                  {subscriptionInfo.plan && (
                    <div className="mt-4">
                      <h4 className="font-medium mb-2">{t('payment.features', 'Included features')}:</h4>
                      <ul className="space-y-1">
                        {(() => {
                          const raw = subscriptionInfo.plan.features;
                          const features = Array.isArray(raw) ? raw : typeof raw === 'string' ? (() => { try { return JSON.parse(raw); } catch { return []; } })() : [];
                          return Array.isArray(features) && features.map((feature: any, index: number) => (
                            <li key={index} className="flex items-start">
                              <Check className="h-4 w-4 text-green-500 mr-2 mt-0.5" />
                              <span>{typeof feature === 'string' ? feature : feature.name || feature.key}</span>
                            </li>
                          ));
                        })()}
                      </ul>
                    </div>
                  )}
                  
                  <div className="mt-6 bg-blue-50 text-blue-700 rounded-lg p-3 text-sm flex items-start">
                    <AlertCircle className="h-5 w-5 mr-2 flex-shrink-0 mt-0.5" />
                    <div>
                      {t('payment.supportInfo', 'For any questions about your subscription, contact support. Keep the payment receipt you will receive by email.')}
                    </div>
                  </div>
                </div>
              )}
            </>
          ) : (
            <div className="bg-amber-50 text-amber-700 rounded-lg p-4 my-4">
              <p>{t('payment.pending.info', 'Your payment has been received and your subscription will be activated shortly.')}</p>
              <p className="mt-2">{t('payment.pending.wait', 'Please wait a moment while we process the transaction.')}</p>
              
              <div className="mt-4 pt-4 border-t border-amber-200">
                <p className="text-sm flex items-center">
                  <AlertCircle className="h-4 w-4 mr-2" />
                  {t('payment.pending.refresh', 'If the page does not update automatically, reload it in a few minutes.')}
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
            {t('payment.return', 'Return to dashboard')}
            <ChevronRight className="h-4 w-4 ml-2" />
          </Button>
        </CardFooter>
      </Card>
    </div>
  );
}