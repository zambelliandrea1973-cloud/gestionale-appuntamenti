import React, { useEffect, useState } from 'react';
import { Button } from './ui/button';
import { Loader2 } from 'lucide-react';

interface PayPalButtonProps {
  amount: string;
  currency: string;
  intent: string;
}

export default function PayPalButton({
  amount,
  currency,
  intent,
}: PayPalButtonProps) {
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    // Il componente per PayPal è già creato altrove nel progetto
    // Questo serve solo come elemento di collegamento
    console.log('PayPal button mounted with amount:', amount);
  }, [amount]);

  return (
    <Button 
      id="paypal-button"
      disabled={isLoading}
      className="w-full bg-gradient-to-r from-blue-400 to-blue-600 hover:from-blue-500 hover:to-blue-700 text-white"
    >
      {isLoading ? (
        <>
          <Loader2 className="mr-2 h-4 w-4 animate-spin" />
          Elaborazione...
        </>
      ) : (
        <>
          Paga con PayPal
        </>
      )}
    </Button>
  );
}