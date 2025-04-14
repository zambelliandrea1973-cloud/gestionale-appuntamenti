import React, { useState } from 'react';
import { Button, Input, Label, Textarea, Card, CardHeader, CardTitle, CardContent, CardFooter, CardDescription } from '@/components/ui';
import { toast } from '@/hooks/use-toast';
import { AlertCircle, CheckCircle2, SendHorizontal, MessageSquare } from 'lucide-react';

/**
 * Componente per testare la configurazione Twilio
 * Consente di inviare SMS e messaggi WhatsApp di test
 */
const TwilioTester: React.FC = () => {
  const [phoneNumber, setPhoneNumber] = useState('');
  const [message, setMessage] = useState('Questo è un messaggio di test.');
  const [isSending, setIsSending] = useState(false);
  const [result, setResult] = useState<any>(null);
  const [error, setError] = useState<string | null>(null);
  const [selectedMethod, setSelectedMethod] = useState<'sms' | 'whatsapp'>('sms');

  const handleSendTest = async () => {
    if (!phoneNumber || !message) {
      toast({
        title: 'Errore',
        description: 'Numero di telefono e messaggio sono obbligatori.',
        variant: 'destructive'
      });
      return;
    }

    setIsSending(true);
    setResult(null);
    setError(null);

    try {
      const endpoint = selectedMethod === 'sms' 
        ? '/api/test-sms' 
        : '/api/test-whatsapp';
      
      const response = await fetch(endpoint, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          phoneNumber: phoneNumber,
          message: message
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || data.message || 'Errore sconosciuto');
      }

      setResult(data);
      toast({
        title: 'Messaggio inviato',
        description: `${selectedMethod === 'sms' ? 'SMS' : 'WhatsApp'} inviato con successo!`,
        variant: 'default'
      });
    } catch (err: any) {
      console.error('Errore nell\'invio del messaggio:', err);
      setError(err.message || 'Errore sconosciuto');
      
      toast({
        title: 'Errore',
        description: err.message || 'Errore nell\'invio del messaggio',
        variant: 'destructive'
      });
    } finally {
      setIsSending(false);
    }
  };

  const handleMethodChange = (method: 'sms' | 'whatsapp') => {
    setSelectedMethod(method);
    setResult(null);
    setError(null);
  };

  return (
    <Card className="w-full max-w-lg">
      <CardHeader>
        <CardTitle>Test Twilio</CardTitle>
        <CardDescription>
          Invia un messaggio di test per verificare la configurazione Twilio
        </CardDescription>
      </CardHeader>
      <CardContent>
        <div className="space-y-4">
          {/* Selezione del metodo */}
          <div className="flex border rounded-md overflow-hidden">
            <Button 
              type="button" 
              variant={selectedMethod === 'sms' ? 'default' : 'outline'}
              className="flex-1 rounded-none"
              onClick={() => handleMethodChange('sms')}
            >
              <MessageSquare className="mr-2 h-4 w-4" />
              SMS
            </Button>
            <Button 
              type="button" 
              variant={selectedMethod === 'whatsapp' ? 'default' : 'outline'}
              className="flex-1 rounded-none"
              onClick={() => handleMethodChange('whatsapp')}
            >
              <MessageSquare className="mr-2 h-4 w-4" />
              WhatsApp
            </Button>
          </div>

          {/* Numero di telefono */}
          <div className="space-y-2">
            <Label htmlFor="phoneNumber">Numero di telefono</Label>
            <Input
              id="phoneNumber"
              value={phoneNumber}
              onChange={(e) => setPhoneNumber(e.target.value)}
              placeholder="+391234567890"
              className="w-full"
            />
            <p className="text-xs text-gray-500">
              Inserisci il numero in formato internazionale con il prefisso +39
            </p>
          </div>

          {/* Messaggio */}
          <div className="space-y-2">
            <Label htmlFor="message">Messaggio</Label>
            <Textarea
              id="message"
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              placeholder="Scrivi il messaggio di test..."
              className="w-full"
            />
          </div>

          {/* Avviso account di prova */}
          <div className="p-3 bg-yellow-50 border border-yellow-200 rounded-md text-sm">
            <p className="font-medium text-yellow-800">⚠️ Limitazioni account di prova Twilio</p>
            <p className="mt-1 text-yellow-700">
              Con un account di prova Twilio, puoi inviare messaggi solo a numeri di telefono verificati.
              Assicurati che il numero sia verificato nel tuo account Twilio.
            </p>
          </div>

          {/* Risultato o errore */}
          {result && (
            <div className="p-3 bg-green-50 border border-green-200 rounded-md">
              <div className="flex items-start">
                <CheckCircle2 className="h-5 w-5 text-green-500 mr-2 mt-0.5" />
                <div>
                  <p className="font-medium text-green-800">Messaggio inviato con successo</p>
                  <p className="mt-1 text-sm text-green-700">
                    ID messaggio: {result.details?.sid}<br />
                    Stato: {result.details?.status}
                  </p>
                </div>
              </div>
            </div>
          )}

          {error && (
            <div className="p-3 bg-red-50 border border-red-200 rounded-md">
              <div className="flex items-start">
                <AlertCircle className="h-5 w-5 text-red-500 mr-2 mt-0.5" />
                <div>
                  <p className="font-medium text-red-800">Errore nell'invio del messaggio</p>
                  <p className="mt-1 text-sm text-red-700">{error}</p>
                  {error.includes('unverified') && (
                    <p className="mt-2 text-sm text-red-700">
                      Per gli account di prova Twilio, è necessario verificare il numero di destinazione su 
                      <a 
                        href="https://www.twilio.com/console/phone-numbers/verified" 
                        target="_blank" 
                        rel="noopener noreferrer"
                        className="underline font-medium"
                      > twilio.com</a>
                    </p>
                  )}
                </div>
              </div>
            </div>
          )}
        </div>
      </CardContent>
      <CardFooter>
        <Button 
          onClick={handleSendTest} 
          disabled={isSending || !phoneNumber || !message}
          className="w-full"
        >
          {isSending ? (
            <>
              <div className="h-4 w-4 mr-2 animate-spin rounded-full border-2 border-current border-t-transparent" /> 
              Invio in corso...
            </>
          ) : (
            <>
              <SendHorizontal className="mr-2 h-4 w-4" />
              Invia {selectedMethod === 'sms' ? 'SMS' : 'WhatsApp'} di test
            </>
          )}
        </Button>
      </CardFooter>
    </Card>
  );
};

export default TwilioTester;