import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription, CardFooter } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { useToast } from '@/hooks/use-toast';
import { useMutation, useQuery } from '@tanstack/react-query';
import { apiRequest, queryClient } from '@/lib/queryClient';
import { useAuth } from '@/hooks/use-auth';
import { Loader2, Check, CreditCard, Calendar, Users } from 'lucide-react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

// Tipo dei piani di abbonamento
interface SubscriptionPlan {
  id: number;
  name: string;
  price: number;
  features: string[];
  clientLimit: number;
  billingPeriod: 'monthly' | 'yearly';
  isPopular?: boolean;
}

export default function SubscribePage() {
  const { toast } = useToast();
  const { user } = useAuth();
  const [selectedPlanId, setSelectedPlanId] = useState<number | null>(null);
  const [billingPeriod, setBillingPeriod] = useState<'monthly' | 'yearly'>('monthly');
  const [paymentMethod, setPaymentMethod] = useState<'paypal' | 'wise'>('paypal');

  // Query per ottenere i piani disponibili
  const { data: plans, isLoading: plansLoading } = useQuery({
    queryKey: ['/api/payments/plans'],
    queryFn: async () => {
      const res = await apiRequest('GET', '/api/payments/plans');
      return await res.json();
    },
    enabled: !!user, // Esegui solo se l'utente è autenticato
  });

  // Query per ottenere lo stato dell'abbonamento attuale
  const { data: subscription, isLoading: subscriptionLoading } = useQuery({
    queryKey: ['/api/payments/subscription'],
    queryFn: async () => {
      const res = await apiRequest('GET', '/api/payments/subscription');
      return await res.json();
    },
    enabled: !!user, // Esegui solo se l'utente è autenticato
  });

  // Mutation per avviare un abbonamento PayPal
  const startPaypalSubscription = useMutation({
    mutationFn: async (planId: number) => {
      const res = await apiRequest('POST', '/api/payments/paypal/subscribe', { planId });
      return await res.json();
    },
    onSuccess: (data) => {
      if (data.approvalUrl) {
        // Reindirizza a PayPal per il pagamento
        window.location.href = data.approvalUrl;
      } else {
        toast({
          title: 'Errore',
          description: 'Non è stato possibile avviare il processo di pagamento',
          variant: 'destructive',
        });
      }
    },
    onError: (error: Error) => {
      toast({
        title: 'Errore',
        description: 'Si è verificato un errore durante l\'avvio dell\'abbonamento',
        variant: 'destructive',
      });
    }
  });

  // Mutation per avviare un abbonamento Wise
  const startWiseSubscription = useMutation({
    mutationFn: async (planId: number) => {
      const res = await apiRequest('POST', '/api/payments/wise/subscribe', { planId });
      return await res.json();
    },
    onSuccess: (data) => {
      if (data.paymentUrl) {
        // Reindirizza a Wise per il pagamento
        window.location.href = data.paymentUrl;
      } else {
        toast({
          title: 'Errore',
          description: 'Non è stato possibile avviare il processo di pagamento',
          variant: 'destructive',
        });
      }
    },
    onError: (error: Error) => {
      toast({
        title: 'Errore',
        description: 'Si è verificato un errore durante l\'avvio dell\'abbonamento',
        variant: 'destructive',
      });
    }
  });

  // Mutation per cancellare l'abbonamento
  const cancelSubscription = useMutation({
    mutationFn: async () => {
      const res = await apiRequest('POST', '/api/payments/subscription/cancel');
      return await res.json();
    },
    onSuccess: (data) => {
      if (data.success) {
        toast({
          title: 'Abbonamento cancellato',
          description: 'Il tuo abbonamento è stato cancellato con successo',
          variant: 'default',
        });
        // Aggiorna la query dell'abbonamento
        queryClient.invalidateQueries({queryKey: ['/api/payments/subscription']});
      } else {
        toast({
          title: 'Errore',
          description: data.message || 'Si è verificato un errore durante la cancellazione dell\'abbonamento',
          variant: 'destructive',
        });
      }
    },
    onError: (error: Error) => {
      toast({
        title: 'Errore',
        description: 'Si è verificato un errore durante la cancellazione dell\'abbonamento',
        variant: 'destructive',
      });
    }
  });

  // In attesa di caricamento dall'API utilizziamo dei piani dimostrativi
  const demoPlans: SubscriptionPlan[] = [
    {
      id: 1,
      name: 'Base',
      price: billingPeriod === 'monthly' ? 9.90 : 99,
      features: ['100 clienti', 'Tutte le funzionalità base', 'Promemoria SMS/Email', 'Accesso area cliente'],
      clientLimit: 100,
      billingPeriod,
    },
    {
      id: 2,
      name: 'Professionale',
      price: billingPeriod === 'monthly' ? 19.90 : 199,
      features: ['500 clienti', 'Tutte le funzionalità base', 'Promemoria SMS/Email/WhatsApp', 'Accesso area cliente', 'Sincronizzazione calendario', 'Fatturazione avanzata'],
      clientLimit: 500,
      billingPeriod,
      isPopular: true,
    },
    {
      id: 3,
      name: 'Business',
      price: billingPeriod === 'monthly' ? 39.90 : 399,
      features: ['Clienti illimitati', 'Tutte le funzionalità', 'Supporto prioritario', 'Personalizzazione avanzata', 'Esportazione dati avanzata'],
      clientLimit: -1, // illimitato
      billingPeriod,
    }
  ];

  // Piani da visualizzare (API o demo)
  const plansToShow = plans || demoPlans;

  const handleSelectPlan = (planId: number) => {
    setSelectedPlanId(planId);
  };

  const handleStartSubscription = () => {
    if (!selectedPlanId) {
      toast({
        title: 'Seleziona un piano',
        description: 'Seleziona un piano prima di procedere',
        variant: 'destructive',
      });
      return;
    }

    if (paymentMethod === 'paypal') {
      startPaypalSubscription.mutate(selectedPlanId);
    } else if (paymentMethod === 'wise') {
      startWiseSubscription.mutate(selectedPlanId);
    }
  };

  const handleCancelSubscription = () => {
    if (confirm('Sei sicuro di voler cancellare il tuo abbonamento?')) {
      cancelSubscription.mutate();
    }
  };

  // Se l'utente è già abbonato, mostriamo informazioni sull'abbonamento corrente
  if (subscription && subscription.active) {
    return (
      <div className="container py-10 mx-auto">
        <div className="max-w-3xl mx-auto">
          <h1 className="text-4xl font-extrabold tracking-tight text-center mb-10">Il Tuo Abbonamento</h1>
          
          <Card>
            <CardHeader>
              <CardTitle>Abbonamento Attivo</CardTitle>
              <CardDescription>
                Dettagli del tuo abbonamento attuale
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <p className="text-sm font-medium">Piano</p>
                  <p className="text-xl font-bold">{subscription.planName}</p>
                </div>
                <div>
                  <p className="text-sm font-medium">Stato</p>
                  <div className="flex items-center">
                    <span className="bg-green-100 text-green-800 text-xs font-medium px-2.5 py-0.5 rounded-full flex items-center">
                      <Check className="w-3 h-3 mr-1" />
                      Attivo
                    </span>
                  </div>
                </div>
                <div>
                  <p className="text-sm font-medium">Prezzo</p>
                  <p className="text-xl font-bold">€{subscription.price.toFixed(2)}</p>
                </div>
                <div>
                  <p className="text-sm font-medium">Periodo</p>
                  <p>{subscription.billingPeriod === 'monthly' ? 'Mensile' : 'Annuale'}</p>
                </div>
                {subscription.startDate && (
                  <div>
                    <p className="text-sm font-medium">Data inizio</p>
                    <p>{new Date(subscription.startDate).toLocaleDateString()}</p>
                  </div>
                )}
                {subscription.nextBillingDate && (
                  <div>
                    <p className="text-sm font-medium">Prossimo addebito</p>
                    <p>{new Date(subscription.nextBillingDate).toLocaleDateString()}</p>
                  </div>
                )}
                <div>
                  <p className="text-sm font-medium">Metodo di pagamento</p>
                  <p>{subscription.paymentMethod === 'paypal' ? 'PayPal' : 'Wise'}</p>
                </div>
                <div>
                  <p className="text-sm font-medium">Limite clienti</p>
                  <p>{subscription.clientLimit === -1 ? 'Illimitati' : subscription.clientLimit}</p>
                </div>
              </div>
            </CardContent>
            <CardFooter>
              <Button 
                variant="destructive" 
                className="w-full"
                onClick={handleCancelSubscription}
                disabled={cancelSubscription.isPending}
              >
                {cancelSubscription.isPending ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Annullamento in corso...
                  </>
                ) : (
                  'Cancella Abbonamento'
                )}
              </Button>
            </CardFooter>
          </Card>
        </div>
      </div>
    );
  }

  return (
    <div className="container py-10 mx-auto">
      <div className="max-w-6xl mx-auto">
        <h1 className="text-4xl font-extrabold tracking-tight text-center mb-4">Piani di Abbonamento</h1>
        <p className="text-center text-lg text-gray-500 mb-8">
          Scegli il piano giusto per le tue esigenze
        </p>

        <div className="flex justify-center mb-8">
          <Tabs defaultValue="monthly" className="w-[400px]" onValueChange={(value) => setBillingPeriod(value as 'monthly' | 'yearly')}>
            <TabsList className="grid w-full grid-cols-2">
              <TabsTrigger value="monthly">Mensile</TabsTrigger>
              <TabsTrigger value="yearly">Annuale <span className="ml-2 rounded-full bg-green-100 px-2 py-0.5 text-xs font-semibold text-green-800">-16%</span></TabsTrigger>
            </TabsList>
          </Tabs>
        </div>
        
        <div className="grid md:grid-cols-3 gap-8 mb-8">
          {plansToShow.map((plan) => (
            <Card 
              key={plan.id}
              className={`relative ${plan.isPopular ? 'border-primary shadow-lg' : ''} ${selectedPlanId === plan.id ? 'ring-2 ring-primary ring-offset-2' : ''}`}
            >
              {plan.isPopular && (
                <div className="absolute -top-3 left-0 right-0 flex justify-center">
                  <span className="bg-primary text-primary-foreground text-xs font-semibold px-3 py-1 rounded-full">
                    Più Popolare
                  </span>
                </div>
              )}
              <CardHeader>
                <CardTitle>{plan.name}</CardTitle>
                <CardDescription>
                  <div className="mt-4 flex items-baseline text-5xl font-extrabold">
                    €{plan.price.toFixed(2)}
                    <span className="ml-1 text-xl font-medium text-gray-500">
                      /{billingPeriod === 'monthly' ? 'mese' : 'anno'}
                    </span>
                  </div>
                </CardDescription>
              </CardHeader>
              <CardContent>
                <ul className="space-y-3">
                  {plan.features.map((feature, index) => (
                    <li key={index} className="flex">
                      <Check className="h-5 w-5 flex-shrink-0 text-green-500" />
                      <span className="ml-3 text-gray-500">{feature}</span>
                    </li>
                  ))}
                </ul>
              </CardContent>
              <CardFooter>
                <Button 
                  className="w-full" 
                  variant={plan.isPopular ? "default" : "outline"}
                  onClick={() => handleSelectPlan(plan.id)}
                >
                  {selectedPlanId === plan.id ? 'Selezionato ✓' : 'Seleziona Piano'}
                </Button>
              </CardFooter>
            </Card>
          ))}
        </div>

        {selectedPlanId && (
          <Card className="max-w-3xl mx-auto">
            <CardHeader>
              <CardTitle>Metodo di Pagamento</CardTitle>
              <CardDescription>
                Scegli come desideri pagare il tuo abbonamento
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-2 gap-4">
                <div 
                  className={`border p-4 rounded-lg cursor-pointer ${paymentMethod === 'paypal' ? 'border-primary bg-primary/5' : ''}`}
                  onClick={() => setPaymentMethod('paypal')}
                >
                  <div className="flex items-center justify-between mb-2">
                    <h3 className="font-semibold">PayPal</h3>
                    {paymentMethod === 'paypal' && <Check className="h-5 w-5 text-primary" />}
                  </div>
                  <p className="text-sm text-gray-500">Paga in modo sicuro con il tuo account PayPal</p>
                </div>
                <div 
                  className={`border p-4 rounded-lg cursor-pointer ${paymentMethod === 'wise' ? 'border-primary bg-primary/5' : ''}`}
                  onClick={() => setPaymentMethod('wise')}
                >
                  <div className="flex items-center justify-between mb-2">
                    <h3 className="font-semibold">Bonifico (Wise)</h3>
                    {paymentMethod === 'wise' && <Check className="h-5 w-5 text-primary" />}
                  </div>
                  <p className="text-sm text-gray-500">Paga tramite bonifico bancario internazionale</p>
                </div>
              </div>
            </CardContent>
            <CardFooter>
              <Button 
                className="w-full"
                onClick={handleStartSubscription}
                disabled={startPaypalSubscription.isPending || startWiseSubscription.isPending}
              >
                {(startPaypalSubscription.isPending || startWiseSubscription.isPending) ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Elaborazione in corso...
                  </>
                ) : (
                  'Procedi al Pagamento'
                )}
              </Button>
            </CardFooter>
          </Card>
        )}

        <div className="mt-12 text-center">
          <h2 className="text-2xl font-bold mb-4">Domande Frequenti</h2>
          
          <div className="max-w-3xl mx-auto mt-8 space-y-6 text-left">
            <div>
              <h3 className="text-lg font-semibold">Posso cambiare piano in un secondo momento?</h3>
              <p className="text-gray-500 mt-1">Sì, puoi aggiornare o declassare il tuo piano in qualsiasi momento. Le modifiche avranno effetto dal prossimo ciclo di fatturazione.</p>
            </div>
            <div>
              <h3 className="text-lg font-semibold">Cosa succede se supero il limite di clienti?</h3>
              <p className="text-gray-500 mt-1">Se raggiungi il limite di clienti del tuo piano, verrai avvisato e potrai decidere se fare l'upgrade a un piano superiore.</p>
            </div>
            <div>
              <h3 className="text-lg font-semibold">Come posso cancellare il mio abbonamento?</h3>
              <p className="text-gray-500 mt-1">Puoi cancellare il tuo abbonamento in qualsiasi momento dalla pagina del tuo account. L'abbonamento rimarrà attivo fino alla fine del periodo di fatturazione corrente.</p>
            </div>
            <div>
              <h3 className="text-lg font-semibold">Sono previsti dei costi aggiuntivi?</h3>
              <p className="text-gray-500 mt-1">No, il prezzo indicato include tutte le funzionalità del piano selezionato. Non ci sono costi nascosti o addebiti aggiuntivi.</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}