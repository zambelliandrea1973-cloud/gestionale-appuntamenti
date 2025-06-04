import React, { useState } from 'react';
import { Button } from './ui/button';
import { apiRequest } from '@/lib/queryClient';
import { useToast } from '@/hooks/use-toast';
import { Loader2 } from 'lucide-react';

interface StripeCheckoutButtonProps {
  planId: number;
  buttonText?: string;
  className?: string;
}

export default function StripeCheckoutButton({
  planId,
  buttonText = 'Paga con carta di credito',
  className = ''
}: StripeCheckoutButtonProps) {
  const [isLoading, setIsLoading] = useState(false);
  const { toast } = useToast();

  const handlePayment = async () => {
    try {
      setIsLoading(true);
      
      // Costruisci gli URL di ritorno
      const baseUrl = window.location.origin;
      const successUrl = `${baseUrl}/payment/success`;
      const cancelUrl = `${baseUrl}/payment/cancel`;
      
      // Crea una sessione di checkout Stripe
      const response = await apiRequest('POST', '/api/payments/stripe/create-checkout-session', {
        planId: planId,
        successUrl,
        cancelUrl
      });
      
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || 'Errore durante la creazione della sessione di pagamento');
      }
      
      const data = await response.json();
      
      if (!data.success || !data.url) {
        throw new Error(data.message || 'URL della sessione di pagamento non trovato');
      }
      
      // Reindirizza alla pagina di checkout di Stripe
      window.location.href = data.url;
    } catch (error) {
      console.error('Errore durante il processo di pagamento:', error);
      
      toast({
        title: 'Errore di pagamento',
        description: error instanceof Error ? error.message : 'Si è verificato un errore durante il processo di pagamento',
        variant: 'destructive'
      });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <Button 
      onClick={handlePayment} 
      disabled={isLoading}
      className={`bg-gradient-to-r from-blue-500 to-blue-700 hover:from-blue-600 hover:to-blue-800 text-white ${className}`}
    >
      {isLoading ? (
        <>
          <Loader2 className="mr-2 h-4 w-4 animate-spin" />
          Elaborazione...
        </>
      ) : (
        <>
          {buttonText}
        </>
      )}
    </Button>
  );
}