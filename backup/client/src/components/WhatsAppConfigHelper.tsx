import React, { useState, useEffect } from 'react';
import { Button } from './ui/button';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from './ui/card';
import { Separator } from './ui/separator';
import { Badge } from './ui/badge';
import { Input } from './ui/input';
import { Label } from './ui/label';
import { useToast } from '@/hooks/use-toast';
import { InfoIcon, SendIcon, CheckCircle, XCircle } from 'lucide-react';
import { apiRequest } from '@/lib/queryClient';

const WhatsAppConfigHelper: React.FC = () => {
  const { toast } = useToast();
  const [configStatus, setConfigStatus] = useState<any>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isTesting, setIsTesting] = useState(false);
  const [testData, setTestData] = useState({
    phoneNumber: '',
    message: 'Questo è un messaggio di test WhatsApp. Configurazione completata con successo!'
  });
  const [testResult, setTestResult] = useState<any>(null);

  useEffect(() => {
    fetchConfigStatus();
  }, []);

  const fetchConfigStatus = async () => {
    try {
      setIsLoading(true);
      const response = await fetch('/api/twilio-config-status');
      const data = await response.json();
      setConfigStatus(data);
    } catch (error) {
      console.error('Errore nel recupero dello stato di configurazione:', error);
      toast({
        variant: "destructive",
        title: "Errore",
        description: "Impossibile recuperare lo stato della configurazione WhatsApp"
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleTestSend = async () => {
    if (!testData.phoneNumber) {
      toast({
        variant: "destructive",
        title: "Errore",
        description: "Inserisci un numero di telefono valido"
      });
      return;
    }

    try {
      setIsTesting(true);
      setTestResult(null);
      
      const response = await apiRequest('POST', '/api/test-whatsapp', {
        to: testData.phoneNumber,
        message: testData.message
      });
      
      const result = await response.json();
      setTestResult(result);
      
      if (response.ok) {
        toast({
          title: "Test completato",
          description: "Messaggio WhatsApp inviato con successo",
          variant: "default"
        });
      } else {
        toast({
          title: "Errore nell'invio",
          description: result.message || "Si è verificato un errore durante l'invio del messaggio",
          variant: "destructive"
        });
      }
    } catch (error) {
      console.error('Errore durante il test:', error);
      setTestResult({
        success: false,
        message: "Errore di connessione durante il test"
      });
      toast({
        variant: "destructive",
        title: "Errore di connessione",
        description: "Impossibile completare il test WhatsApp"
      });
    } finally {
      setIsTesting(false);
    }
  };

  if (isLoading) {
    return (
      <Card className="w-full">
        <CardHeader>
          <CardTitle>Configurazione WhatsApp</CardTitle>
          <CardDescription>Verifica dello stato...</CardDescription>
        </CardHeader>
        <CardContent className="flex items-center justify-center p-6">
          <div className="animate-spin h-8 w-8 border-4 border-primary border-t-transparent rounded-full"></div>
        </CardContent>
      </Card>
    );
  }

  const isConfigured = configStatus?.config?.status === 'completa';

  return (
    <Card className="w-full">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          Configurazione WhatsApp
          {isConfigured ? (
            <Badge variant="outline" className="bg-green-50 text-green-700 border-green-200">
              Configurato
            </Badge>
          ) : (
            <Badge variant="outline" className="bg-amber-50 text-amber-700 border-amber-200">
              Configurazione necessaria
            </Badge>
          )}
        </CardTitle>
        <CardDescription>
          Verifica e configura il servizio WhatsApp tramite Twilio
        </CardDescription>
      </CardHeader>
      
      <CardContent className="space-y-4">
        <div className="space-y-2">
          <div className="font-medium">Stato configurazione:</div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
            <div className="flex items-center gap-2">
              <span>Account Twilio:</span>
              {configStatus?.config?.accountConfigured ? (
                <CheckCircle className="h-5 w-5 text-green-500" />
              ) : (
                <XCircle className="h-5 w-5 text-red-500" />
              )}
            </div>
            <div className="flex items-center gap-2">
              <span>Numero di telefono:</span>
              {configStatus?.config?.phoneNumberConfigured ? (
                <div className="flex gap-1 items-center">
                  <CheckCircle className="h-5 w-5 text-green-500" />
                  <span className="text-sm text-muted-foreground">{configStatus?.config?.phoneNumberMasked}</span>
                </div>
              ) : (
                <XCircle className="h-5 w-5 text-red-500" />
              )}
            </div>
          </div>
        </div>
        
        <Separator />
        
        {!isConfigured && (
          <div className="bg-amber-50 p-4 rounded-md border border-amber-200">
            <div className="flex gap-2 items-start">
              <InfoIcon className="h-5 w-5 text-amber-600 mt-0.5" />
              <div>
                <h4 className="font-medium text-amber-800">Configurazione necessaria</h4>
                <p className="text-sm text-amber-700 mt-1">Per utilizzare WhatsApp, devi configurare le variabili d'ambiente di Twilio.</p>
              </div>
            </div>
            
            <div className="mt-3 text-sm text-amber-700 space-y-2">
              <p className="font-medium">Passaggi per la configurazione:</p>
              <ol className="list-decimal pl-5 space-y-1">
                <li>Accedi alla dashboard Twilio: <a href="https://www.twilio.com/console" target="_blank" rel="noopener noreferrer" className="text-blue-600 hover:underline">www.twilio.com/console</a></li>
                <li>Vai su "Messaging" &gt; "Settings" &gt; "WhatsApp Sandbox"</li>
                <li>Segui le istruzioni per configurare il tuo account WhatsApp</li>
                <li>Invia un messaggio di attivazione al numero della Sandbox Twilio dal tuo telefono</li>
                <li>Configura le variabili d'ambiente TWILIO_ACCOUNT_SID, TWILIO_AUTH_TOKEN e TWILIO_PHONE_NUMBER</li>
              </ol>
            </div>
          </div>
        )}
        
        <div>
          <h3 className="font-medium mb-2">Testa l'invio di messaggi WhatsApp</h3>
          <div className="space-y-3">
            <div className="space-y-2">
              <Label htmlFor="phoneNumber">Numero di telefono (con prefisso internazionale)</Label>
              <Input
                id="phoneNumber"
                placeholder="+39xxxxxxxxxx"
                value={testData.phoneNumber}
                onChange={(e) => setTestData({...testData, phoneNumber: e.target.value})}
              />
              <p className="text-xs text-muted-foreground">
                Inserisci il numero in formato internazionale (es. +39XXXXXXXXXX)
              </p>
            </div>
            
            <div className="space-y-2">
              <Label htmlFor="message">Messaggio di test</Label>
              <Input
                id="message"
                placeholder="Messaggio di test"
                value={testData.message}
                onChange={(e) => setTestData({...testData, message: e.target.value})}
              />
            </div>
          </div>
        </div>
        
        {testResult && (
          <div className={`p-4 rounded-md border ${testResult.success ? 'bg-green-50 border-green-200' : 'bg-red-50 border-red-200'}`}>
            <h4 className={`font-medium ${testResult.success ? 'text-green-800' : 'text-red-800'}`}>
              {testResult.success ? "Test completato con successo" : "Errore durante il test"}
            </h4>
            <p className={`text-sm mt-1 ${testResult.success ? 'text-green-700' : 'text-red-700'}`}>
              {testResult.message}
            </p>
            
            {testResult.whatsappSetupInfo && (
              <div className="mt-3 text-sm text-red-700">
                <p className="font-medium">Istruzioni per la configurazione WhatsApp:</p>
                <pre className="mt-1 whitespace-pre-wrap text-xs bg-white/50 p-2 rounded">
                  {testResult.whatsappSetupInfo}
                </pre>
              </div>
            )}
            
            {testResult.twilioDetails && (
              <div className="mt-2 text-sm">
                <p className="font-medium text-red-700">Dettagli errore Twilio:</p>
                <div className="mt-1 bg-white/50 p-2 rounded text-xs">
                  <div><strong>Codice:</strong> {testResult.twilioDetails.code}</div>
                  {testResult.twilioDetails.moreInfo && (
                    <div className="mt-1">
                      <strong>Info:</strong> 
                      <a 
                        href={testResult.twilioDetails.moreInfo} 
                        target="_blank" 
                        rel="noopener noreferrer"
                        className="text-blue-600 hover:underline ml-1"
                      >
                        {testResult.twilioDetails.moreInfo}
                      </a>
                    </div>
                  )}
                </div>
              </div>
            )}
          </div>
        )}
      </CardContent>
      
      <CardFooter className="justify-between">
        <Button 
          variant="outline" 
          onClick={fetchConfigStatus}
          disabled={isLoading || isTesting}
        >
          Aggiorna stato
        </Button>
        <Button 
          onClick={handleTestSend} 
          disabled={isLoading || isTesting || !testData.phoneNumber}
        >
          {isTesting ? (
            <>
              <div className="animate-spin h-4 w-4 border-2 border-current border-t-transparent rounded-full mr-2"></div>
              Invio in corso...
            </>
          ) : (
            <>
              <SendIcon className="h-4 w-4 mr-2" />
              Invia test WhatsApp
            </>
          )}
        </Button>
      </CardFooter>
    </Card>
  );
};

export default WhatsAppConfigHelper;