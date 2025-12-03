import { useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Check, X } from "lucide-react";

const subscriptionPlans = [
  {
    id: 'trial',
    name: 'Prova',
    description: 'Per 40 giorni',
    price: 'Gratis',
    period: 'Per 40 giorni',
    features: [
      { name: 'Gestione appuntamenti', included: true },
      { name: 'Gestione clienti', included: true },
      { name: 'Notifiche ai clienti', included: true },
      { name: 'Integrazione Google Calendar', included: false },
      { name: 'Gestione fatture', included: false },
      { name: 'Report dettagliati', included: false }
    ],
    buttonText: 'Prova gratis per 40 giorni',
    popular: false,
    active: false
  },
  {
    id: 'base',
    name: 'Base',
    description: 'Per professionisti individuali',
    price: '€3,99',
    period: '/mese',
    subtext: 'Abbonamento annuale',
    features: [
      { name: 'Gestione appuntamenti', included: true },
      { name: 'Gestione clienti', included: true },
      { name: 'Notifiche ai clienti', included: true },
      { name: 'Integrazione Google Calendar', included: false },
      { name: 'Gestione fatture', included: false },
      { name: 'Report dettagliati', included: false }
    ],
    buttonText: 'Abbonati',
    popular: false,
    active: true
  },
  {
    id: 'pro',
    name: 'PRO',
    description: 'Tutte le funzionalità premium',
    price: '€6,99',
    period: '/mese',
    subtext: 'Abbonamento annuale',
    features: [
      { name: 'Gestione appuntamenti', included: true },
      { name: 'Gestione clienti', included: true },
      { name: 'Notifiche ai clienti', included: true },
      { name: 'Integrazione Google Calendar', included: true },
      { name: 'Gestione fatture', included: true },
      { name: 'Report dettagliati', included: true }
    ],
    buttonText: 'Abbonati',
    popular: true,
    active: false
  },
  {
    id: 'business',
    name: 'Business',
    description: 'Per studi con più operatori',
    price: '€9,99',
    period: '/mese',
    subtext: 'Abbonamento annuale',
    features: [
      { name: 'Gestione appuntamenti', included: true },
      { name: 'Gestione clienti', included: true },
      { name: 'Notifiche ai clienti', included: true },
      { name: 'Integrazione Google Calendar', included: true },
      { name: 'Gestione fatture', included: true },
      { name: 'Report dettagliati', included: true },
      { name: 'Supporto per più operatori', included: true }
    ],
    buttonText: 'Abbonati',
    popular: false,
    active: false
  }
];

export default function SubscriptionPlans() {
  const [selectedPlan, setSelectedPlan] = useState<string | null>(null);

  const handlePlanSelect = (planId: string) => {
    setSelectedPlan(planId);
    // Implementare logica di sottoscrizione
    console.log(`Piano selezionato: ${planId}`);
  };

  return (
    <div className="container mx-auto px-4 py-8">
      <div className="text-center mb-12">
        <h1 className="text-4xl font-bold mb-4">Scegli il tuo piano</h1>
        <p className="text-lg text-muted-foreground">
          Seleziona il piano più adatto alle tue esigenze professionali
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 max-w-7xl mx-auto">
        {subscriptionPlans.map((plan) => (
          <Card 
            key={plan.id} 
            className={`relative transition-all duration-300 hover:shadow-lg ${
              plan.popular ? 'border-primary ring-2 ring-primary/20' : ''
            } ${plan.active ? 'bg-green-50 border-green-500' : ''}`}
          >
            {plan.popular && (
              <Badge className="absolute -top-3 left-1/2 transform -translate-x-1/2 bg-primary">
                Più popolare
              </Badge>
            )}
            
            {plan.active && (
              <Badge className="absolute -top-3 left-1/2 transform -translate-x-1/2 bg-green-600">
                Già Attivo
              </Badge>
            )}

            <CardHeader className="text-center pb-8">
              <CardTitle className="text-2xl font-bold">{plan.name}</CardTitle>
              <CardDescription className="text-sm">{plan.description}</CardDescription>
              
              <div className="mt-4">
                <div className="text-4xl font-bold">
                  {plan.price}
                  <span className="text-lg font-normal text-muted-foreground">
                    {plan.period}
                  </span>
                </div>
                {plan.subtext && (
                  <p className="text-sm text-muted-foreground mt-1">{plan.subtext}</p>
                )}
              </div>
            </CardHeader>

            <CardContent className="space-y-4">
              <div className="space-y-3">
                {plan.features.map((feature, index) => (
                  <div key={index} className="flex items-center gap-3">
                    {feature.included ? (
                      <Check className="h-4 w-4 text-green-600 flex-shrink-0" />
                    ) : (
                      <X className="h-4 w-4 text-muted-foreground flex-shrink-0" />
                    )}
                    <span className={`text-sm ${
                      feature.included ? 'text-foreground' : 'text-muted-foreground'
                    }`}>
                      {feature.name}
                    </span>
                  </div>
                ))}
              </div>

              <Button
                className="w-full mt-6"
                variant={plan.active ? "secondary" : plan.popular ? "default" : "outline"}
                onClick={() => handlePlanSelect(plan.id)}
                disabled={plan.active}
              >
                {plan.active ? "Già Attivo" : plan.buttonText}
              </Button>
            </CardContent>
          </Card>
        ))}
      </div>

      <div className="text-center mt-12">
        <p className="text-muted-foreground">
          Tutti i piani includono supporto clienti e aggiornamenti gratuiti
        </p>
      </div>
    </div>
  );
}