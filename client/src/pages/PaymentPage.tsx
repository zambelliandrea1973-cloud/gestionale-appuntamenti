import React, { useEffect, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Loader2, CreditCard, Wallet } from 'lucide-react';
import { useTranslation } from 'react-i18next';

import { PageHeader } from '../components/PageHeader';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '../components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '../components/ui/tabs';
import { Alert, AlertDescription, AlertTitle } from '../components/ui/alert';
import StripeCheckoutButton from '../components/StripeCheckoutButton';
import { Badge } from '../components/ui/badge';

export default function PaymentPage() {
  const { t } = useTranslation();
  const [selectedTab, setSelectedTab] = useState('creditCard');

  // Ottieni i piani di abbonamento disponibili
  const { data: plans = [], isLoading: plansLoading } = useQuery<any[]>({
    queryKey: ['/api/payments/plans'],
    retry: 3
  });

  // Ottieni lo stato dell'abbonamento attuale dell'utente
  const { data: subscription, isLoading: subscriptionLoading } = useQuery<any>({
    queryKey: ['/api/payments/subscription'],
    retry: 3
  });

  // Formatta il prezzo per la visualizzazione
  const formatPrice = (price: number) => {
    return new Intl.NumberFormat('it-IT', {
      style: 'currency',
      currency: 'EUR'
    }).format(price);
  };

  // Formatta la data di scadenza
  const formatExpiryDate = (dateString: string) => {
    const date = new Date(dateString);
    return new Intl.DateTimeFormat('it-IT', {
      day: 'numeric',
      month: 'long',
      year: 'numeric'
    }).format(date);
  };

  return (
    <div className="container mx-auto px-4 py-8">
      <PageHeader
        title={t('payments.title')}
        description={t('payments.description')}
      />

      {/* Stato abbonamento attuale */}
      {subscriptionLoading ? (
        <div className="flex justify-center my-8">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
        </div>
      ) : subscription ? (
        <Alert className="mb-8 bg-gradient-to-r from-blue-50 to-indigo-50 border-blue-200">
          <AlertTitle className="text-blue-800 font-medium">
            {t('payments.currentSubscription')}
          </AlertTitle>
          <AlertDescription className="text-blue-700">
            {subscription.status === 'active' ? (
              <>
                {subscription.plan && subscription.currentPeriodEnd ? (
                  t('payments.activeSubscription', { 
                    plan: subscription.plan?.name || t('payments.unknownPlan'),
                    expiry: formatExpiryDate(subscription.currentPeriodEnd)
                  })
                ) : (
                  t('payments.subscriptionDetails')
                )}
              </>
            ) : (
              t('payments.inactiveSubscription')
            )}
          </AlertDescription>
        </Alert>
      ) : null}

      {/* Piani disponibili */}
      {plansLoading ? (
        <div className="flex justify-center my-8">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 mb-8">
          {plans?.map((plan: any) => (
            <Card key={plan.id} className="flex flex-col h-full overflow-hidden border-2 hover:shadow-lg transition-shadow duration-300">
              <CardHeader className={`${
                plan.name.toLowerCase().includes('pro') 
                  ? 'bg-gradient-to-r from-blue-600 to-indigo-600 text-white' 
                  : plan.name.toLowerCase().includes('business')
                    ? 'bg-gradient-to-r from-indigo-600 to-purple-600 text-white'
                    : 'bg-gradient-to-r from-gray-100 to-gray-200'
              }`}>
                <CardTitle className="flex justify-between items-center">
                  <span>{plan.name}</span>
                  {plan.name.toLowerCase().includes('pro') && (
                    <Badge className="bg-white text-blue-600">Popolare</Badge>
                  )}
                </CardTitle>
                <CardDescription className={`
                  ${plan.name.toLowerCase().includes('pro') || plan.name.toLowerCase().includes('business')
                    ? 'text-gray-200' 
                    : 'text-gray-600'
                  }
                `}>
                  {plan.description}
                </CardDescription>
                <div className="text-3xl font-bold mt-2">
                  {formatPrice(plan.price / 100)}
                  <span className="text-sm font-normal ml-1">
                    /{plan.interval === 'month' ? t('common.month') : t('common.year')}
                  </span>
                </div>
              </CardHeader>
              
              <CardContent className="flex-grow py-6">
                <ul className="space-y-3">
                  {plan.features?.map((feature: string, index: number) => (
                    <li key={index} className="flex items-start">
                      <svg className="h-5 w-5 text-green-500 mr-2 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M5 13l4 4L19 7"></path>
                      </svg>
                      <span>{feature}</span>
                    </li>
                  ))}
                  {plan.clientLimit && (
                    <li className="flex items-start">
                      <svg className="h-5 w-5 text-green-500 mr-2 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M5 13l4 4L19 7"></path>
                      </svg>
                      <span>{t('payments.clientLimit', { limit: plan.clientLimit })}</span>
                    </li>
                  )}
                </ul>
              </CardContent>
              
              <CardFooter className="bg-gray-50 px-6 py-4">
                <Tabs defaultValue="creditCard" className="w-full" value={selectedTab} onValueChange={setSelectedTab}>
                  <TabsList className="grid w-full grid-cols-2 mb-4">
                    <TabsTrigger value="creditCard" className="flex items-center">
                      <CreditCard className="h-4 w-4 mr-2" />
                      <span>{t('payments.creditCard')}</span>
                    </TabsTrigger>
                    <TabsTrigger value="paypal" className="flex items-center">
                      <Wallet className="h-4 w-4 mr-2" />
                      <span>PayPal</span>
                    </TabsTrigger>
                  </TabsList>
                  
                  <TabsContent value="creditCard" className="mt-0">
                    <StripeCheckoutButton 
                      planId={plan.id} 
                      buttonText={t('payments.payWithCreditCard')}
                      className="w-full"
                    />
                  </TabsContent>
                  
                  <TabsContent value="paypal" className="mt-0">
                    <div
                      id="paypal-button" 
                      className="w-full bg-gradient-to-r from-blue-400 to-blue-600 hover:from-blue-500 hover:to-blue-700 text-white py-2 px-4 rounded-md cursor-pointer flex items-center justify-center"
                      onClick={() => {
                        console.log('PayPal button clicked for plan:', plan.id);
                        // Qui sarà implementata la logica PayPal
                      }}
                    >
                      Paga con PayPal
                    </div>
                  </TabsContent>
                </Tabs>
              </CardFooter>
            </Card>
          ))}
        </div>
      )}

      {/* Informazioni sui pagamenti */}
      <div className="mt-8 bg-gray-50 rounded-lg p-6 border border-gray-200">
        <h3 className="text-lg font-medium mb-4">{t('payments.securePaymentInfo')}</h3>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div>
            <h4 className="font-medium mb-2">{t('payments.cardPayments')}</h4>
            <p className="text-gray-600 text-sm">
              {t('payments.cardPaymentsDescription')}
            </p>
          </div>
          <div>
            <h4 className="font-medium mb-2">{t('payments.paypalPayments')}</h4>
            <p className="text-gray-600 text-sm">
              {t('payments.paypalPaymentsDescription')}
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}