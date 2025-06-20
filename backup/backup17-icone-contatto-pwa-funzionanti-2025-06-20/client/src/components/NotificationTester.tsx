import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Card, CardHeader, CardTitle, CardContent, CardFooter, CardDescription } from '@/components/ui/card';
import { toast } from '@/hooks/use-toast';
import { AlertCircle, CheckCircle2, SendHorizontal, MessageSquare, ExternalLink, Mail } from 'lucide-react';

/**
 * Componente per testare i servizi di notifica
 * Consente di inviare email e messaggi WhatsApp di test
 */
const NotificationTester: React.FC = () => {
  const [recipient, setRecipient] = useState('');
  const [message, setMessage] = useState('Questo è un messaggio di test.');
  const [isSending, setIsSending] = useState(false);
  const [result, setResult] = useState<any>(null);
  const [error, setError] = useState<string | null>(null);
  const [selectedMethod, setSelectedMethod] = useState<'email' | 'whatsapp'>('email');

  const handleSendTest = async () => {
    if (!recipient || !message) {
      toast({
        title: 'Errore',
        description: selectedMethod === 'email' 
          ? 'Indirizzo email e messaggio sono obbligatori' 
          : 'Numero di telefono e messaggio sono obbligatori',
        variant: 'destructive'
      });
      return;
    }

    setIsSending(true);
    setResult(null);
    setError(null);

    try {
      const endpoint = selectedMethod === 'email' 
        ? '/api/notification-settings/test-email' 
        : '/api/test-whatsapp';
      
      const payload = selectedMethod === 'email'
        ? { 
            to: recipient, 
            subject: 'Test email', 
            message: message 
          }
        : { 
            phoneNumber: recipient, 
            message: message 
          };
      
      const response = await fetch(endpoint, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(payload),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || data.message || 'Errore sconosciuto');
      }

      setResult(data);
      
      if (selectedMethod === 'email') {
        toast({
          title: 'Email inviata',
          description: 'Email di test inviata con successo!',
          variant: 'default'
        });
      } else {
        toast({
          title: 'Link WhatsApp generato',
          description: 'Clicca sul link per aprire WhatsApp e inviare il messaggio',
          variant: 'default'
        });
      }
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

  const handleMethodChange = (method: 'email' | 'whatsapp') => {
    setSelectedMethod(method);
    setResult(null);
    setError(null);
    setRecipient(''); // Reset recipient when switching methods
  };

  return (
    <Card className="w-full max-w-lg">
      <CardHeader>
        <CardTitle>Test notifiche</CardTitle>
        <CardDescription>
          Invia un messaggio di test per verificare la configurazione delle notifiche
        </CardDescription>
      </CardHeader>
      <CardContent>
        <div className="space-y-4">
          {/* Selezione del metodo */}
          <div className="flex border rounded-md overflow-hidden">
            <Button 
              type="button" 
              variant={selectedMethod === 'email' ? 'default' : 'outline'}
              className="flex-1 rounded-none"
              onClick={() => handleMethodChange('email')}
            >
              <Mail className="mr-2 h-4 w-4" />
              Email
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

          {/* Destinatario (email o numero di telefono) */}
          <div className="space-y-2">
            <Label htmlFor="recipient">
              {selectedMethod === 'email' ? 'Indirizzo email' : 'Numero di telefono'}
            </Label>
            <Input
              id="recipient"
              value={recipient}
              onChange={(e: React.ChangeEvent<HTMLInputElement>) => setRecipient(e.target.value)}
              placeholder={selectedMethod === 'email' ? 'esempio@email.it' : '+391234567890'}
              className="w-full"
            />
            <p className="text-xs text-gray-500">
              {selectedMethod === 'email' 
                ? 'Inserisci un indirizzo email valido' 
                : 'Inserisci il numero in formato internazionale con il prefisso +39'}
            </p>
          </div>

          {/* Messaggio */}
          <div className="space-y-2">
            <Label htmlFor="message">Messaggio</Label>
            <Textarea
              id="message"
              value={message}
              onChange={(e: React.ChangeEvent<HTMLTextAreaElement>) => setMessage(e.target.value)}
              placeholder="Scrivi il messaggio di test..."
              className="w-full"
            />
          </div>

          {/* Informazioni sul metodo */}
          <div className="p-3 bg-blue-50 border border-blue-200 rounded-md text-sm">
            <p className="font-medium text-blue-800">
              {selectedMethod === 'email' 
                ? 'ℹ️ Informazioni sull\'invio email' 
                : 'ℹ️ Informazioni su WhatsApp'}
            </p>
            <p className="mt-1 text-blue-700">
              {selectedMethod === 'email' 
                ? 'Questa funzione utilizza le impostazioni SMTP configurate per inviare email direttamente dal tuo account. Assicurati di aver configurato correttamente le impostazioni email.' 
                : 'Questa funzione genera un link che apre WhatsApp con il messaggio precompilato. L\'invio effettivo avviene dal tuo telefono. Non è necessario un servizio esterno come Twilio.'}
            </p>
          </div>

          {/* Risultato o errore */}
          {result && (
            <div className="p-3 bg-green-50 border border-green-200 rounded-md">
              <div className="flex items-start">
                <CheckCircle2 className="h-5 w-5 text-green-500 mr-2 mt-0.5" />
                <div>
                  {selectedMethod === 'email' ? (
                    <>
                      <p className="font-medium text-green-800">Email inviata con successo</p>
                      <p className="mt-1 text-sm text-green-700">
                        L'email è stata inviata correttamente a {recipient}
                      </p>
                    </>
                  ) : (
                    <>
                      <p className="font-medium text-green-800">Link WhatsApp generato con successo</p>
                      {result.whatsappLink && (
                        <div className="mt-2">
                          <a 
                            href={result.whatsappLink} 
                            target="_blank" 
                            rel="noopener noreferrer"
                            className="inline-flex items-center gap-1 bg-green-100 hover:bg-green-200 text-green-800 px-3 py-2 rounded-md text-sm font-medium transition-colors"
                          >
                            <ExternalLink className="h-4 w-4" />
                            Apri WhatsApp e invia il messaggio
                          </a>
                        </div>
                      )}
                    </>
                  )}
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
                </div>
              </div>
            </div>
          )}
        </div>
      </CardContent>
      <CardFooter>
        <Button 
          onClick={handleSendTest} 
          disabled={isSending || !recipient || !message}
          className="w-full"
        >
          {isSending ? (
            <>
              <div className="h-4 w-4 mr-2 animate-spin rounded-full border-2 border-current border-t-transparent" /> 
              {selectedMethod === 'email' ? 'Invio in corso...' : 'Generazione in corso...'}
            </>
          ) : (
            <>
              <SendHorizontal className="mr-2 h-4 w-4" />
              {selectedMethod === 'email' ? 'Invia email di test' : 'Genera link WhatsApp'}
            </>
          )}
        </Button>
      </CardFooter>
    </Card>
  );
};

export default NotificationTester;