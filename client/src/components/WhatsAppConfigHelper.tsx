import React, { useState, useEffect } from 'react';
import { Button } from './ui/button';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from './ui/card';
import { Separator } from './ui/separator';
import { Badge } from './ui/badge';
import { Input } from './ui/input';
import { Label } from './ui/label';
import { useToast } from '@/hooks/use-toast';
import { InfoIcon, SendIcon, CheckCircle, XCircle, ExternalLink } from 'lucide-react';
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
      const response = await fetch('/api/messaging-config-status');
      const data = await response.json();
      setConfigStatus(data);
    } catch (error) {
      console.error('Errore nel recupero dello stato di configurazione:', error);
      toast({
        variant: "destructive",
        title: "Errore",
        description: "Impossibile recuperare lo stato della configurazione messaggistica"
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
          title: "Link WhatsApp generato",
          description: "Clicca sul link per inviare il messaggio",
          variant: "default"
        });
      } else {
        toast({
          title: "Errore nella generazione",
          description: result.message || "Si è verificato un errore durante la generazione del link WhatsApp",
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

  const isConfigured = configStatus?.config?.status === 'configurata';

  return (
    <Card className="w-full">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          Messaggistica WhatsApp
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
          Invia messaggi WhatsApp direttamente dal tuo numero
        </CardDescription>
      </CardHeader>
      
      <CardContent className="space-y-4">
        <div className="space-y-2">
          <div className="font-medium">Stato configurazione:</div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
            <div className="flex items-center gap-2">
              <span>Email configurata:</span>
              {configStatus?.config?.emailConfigured ? (
                <CheckCircle className="h-5 w-5 text-green-500" />
              ) : (
                <XCircle className="h-5 w-5 text-red-500" />
              )}
            </div>
            <div className="flex items-center gap-2">
              <span>Numero di telefono:</span>
              {configStatus?.config?.whatsappConfigured ? (
                <div className="flex gap-1 items-center">
                  <CheckCircle className="h-5 w-5 text-green-500" />
                  <span className="text-sm text-muted-foreground">{configStatus?.config?.professionalPhone}</span>
                </div>
              ) : (
                <XCircle className="h-5 w-5 text-red-500" />
              )}
            </div>
          </div>
        </div>
        
        <Separator />
        
        {!configStatus?.config?.whatsappConfigured && (
          <div className="bg-amber-50 p-4 rounded-md border border-amber-200">
            <div className="flex gap-2 items-start">
              <InfoIcon className="h-5 w-5 text-amber-600 mt-0.5" />
              <div>
                <h4 className="font-medium text-amber-800">Configurazione necessaria</h4>
                <p className="text-sm text-amber-700 mt-1">Per utilizzare WhatsApp, devi inserire il tuo numero di telefono nelle informazioni di contatto.</p>
              </div>
            </div>
            
            <div className="mt-3 text-sm text-amber-700 space-y-2">
              <p className="font-medium">Passaggi per la configurazione:</p>
              <ol className="list-decimal pl-5 space-y-1">
                <li>Vai alla pagina "Informazioni di contatto" dal menu</li>
                <li>Inserisci il tuo numero di telefono nel formato internazionale (es. +39...)</li>
                <li>Salva le modifiche</li>
                <li>Torna a questa pagina e aggiorna lo stato</li>
              </ol>
            </div>
          </div>
        )}
        
        <div className="bg-green-50 p-4 rounded-md border border-green-200">
          <div className="flex gap-2 items-start">
            <InfoIcon className="h-5 w-5 text-green-600 mt-0.5" />
            <div>
              <h4 className="font-medium text-green-800">Metodo diretto WhatsApp</h4>
              <p className="text-sm text-green-700 mt-1">
                Questa funzionalità utilizza il tuo numero WhatsApp personale per inviare messaggi direttamente senza costi aggiuntivi.
              </p>
              <p className="text-sm text-green-700 mt-2">
                I messaggi vengono inviati tramite link diretti WhatsApp che aprono automaticamente l'app con il messaggio precompilato.
              </p>
            </div>
          </div>
        </div>
        
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
              {testResult.success ? "Link WhatsApp generato con successo" : "Errore durante la generazione"}
            </h4>
            <p className={`text-sm mt-1 ${testResult.success ? 'text-green-700' : 'text-red-700'}`}>
              {testResult.message}
            </p>
            
            {testResult.whatsappLink && (
              <div className="mt-3">
                <a 
                  href={testResult.whatsappLink} 
                  target="_blank" 
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-1 bg-green-100 hover:bg-green-200 text-green-800 px-3 py-2 rounded-md text-sm font-medium transition-colors"
                >
                  <ExternalLink className="h-4 w-4" />
                  Apri WhatsApp e invia il messaggio
                </a>
                <p className="text-xs text-green-600 mt-2">
                  Il link aprirà WhatsApp con il messaggio precompilato. Basta premere invio per inviarlo.
                </p>
              </div>
            )}
            
            {testResult.instructions && (
              <div className="mt-2 text-sm text-green-700">
                <p className="font-medium">Istruzioni:</p>
                <p className="mt-1">
                  {testResult.instructions}
                </p>
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
              Generazione in corso...
            </>
          ) : (
            <>
              <SendIcon className="h-4 w-4 mr-2" />
              Genera link WhatsApp
            </>
          )}
        </Button>
      </CardFooter>
    </Card>
  );
};

export default WhatsAppConfigHelper;