import React, { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { 
  Smartphone, 
  AlertCircle, 
  CheckCircle, 
  Phone, 
  Send
} from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { format } from 'date-fns';

enum DeviceStatus {
  DISCONNECTED = 'disconnected',
  CONNECTED = 'connected',
  VERIFICATION_PENDING = 'verification_pending',
  VERIFIED = 'verified'
}

interface DeviceInfo {
  status: DeviceStatus;
  phoneNumber: string | null;
  lastUpdated?: Date | null;
}

const SimplePhoneSetup: React.FC = () => {
  const { t } = useTranslation();
  const { toast } = useToast();
  const [deviceStatus, setDeviceStatus] = useState<DeviceStatus>(DeviceStatus.DISCONNECTED);
  const [phoneNumber, setPhoneNumber] = useState<string>('');
  const [savedPhoneNumber, setSavedPhoneNumber] = useState<string | null>(null);
  const [verificationCode, setVerificationCode] = useState<string>('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isVerifying, setIsVerifying] = useState(false);
  const [lastUpdated, setLastUpdated] = useState<Date | null>(null);
  
  // Carica lo stato iniziale del dispositivo telefonico
  useEffect(() => {
    const fetchInitialStatus = async () => {
      try {
        const response = await fetch('/api/direct-phone/direct-status');
        const data = await response.json();
        
        if (data.success && data.phoneInfo) {
          updateDeviceInfo(data.phoneInfo);
        }
      } catch (error) {
        console.error('Errore nel caricamento dello stato del dispositivo', error);
      }
    };
    
    fetchInitialStatus();
  }, []);
  
  // Aggiorna le informazioni del dispositivo
  const updateDeviceInfo = (data: DeviceInfo) => {
    setDeviceStatus(data.status);
    setSavedPhoneNumber(data.phoneNumber);
    setLastUpdated(data.lastUpdated ? new Date(data.lastUpdated) : new Date());
  };
  
  // Registra un nuovo numero di telefono
  const handleRegisterPhone = async () => {
    if (!phoneNumber.trim()) {
      toast({
        title: 'Errore',
        description: 'Inserisci un numero di telefono valido',
        variant: 'destructive',
      });
      return;
    }
    
    setIsSubmitting(true);
    
    try {
      const response = await fetch('/api/phone-device/register-direct', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ phoneNumber: phoneNumber.trim() }),
      });
      
      const data = await response.json();
      
      if (data.success) {
        toast({
          title: 'Numero registrato',
          description: 'Ti abbiamo inviato un SMS con un codice di verifica',
        });
        
        // Aggiorniamo lo stato in attesa di verifica
        setDeviceStatus(DeviceStatus.VERIFICATION_PENDING);
        setSavedPhoneNumber(phoneNumber.trim());
        setLastUpdated(new Date());
      } else {
        throw new Error(data.error || 'Errore sconosciuto durante la registrazione');
      }
    } catch (error) {
      console.error('Errore nella registrazione del numero', error);
      
      toast({
        title: 'Errore',
        description: error instanceof Error ? error.message : 'Impossibile registrare il numero. Riprova.',
        variant: 'destructive',
      });
    } finally {
      setIsSubmitting(false);
    }
  };
  
  // Verifica il codice SMS
  const handleVerifyCode = async () => {
    if (!verificationCode.trim()) {
      toast({
        title: 'Errore',
        description: 'Inserisci il codice di verifica ricevuto via SMS',
        variant: 'destructive',
      });
      return;
    }
    
    setIsVerifying(true);
    
    try {
      const response = await fetch('/api/phone-device/verify-direct', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ 
          phoneNumber: savedPhoneNumber,
          verificationCode: verificationCode.trim() 
        }),
      });
      
      const data = await response.json();
      
      if (data.success) {
        toast({
          title: 'Numero verificato',
          description: 'Il tuo numero è stato verificato con successo!',
          variant: 'default',
        });
        
        // Aggiorniamo lo stato a verificato
        setDeviceStatus(DeviceStatus.VERIFIED);
        setLastUpdated(new Date());
      } else {
        throw new Error(data.error || 'Codice di verifica non valido');
      }
    } catch (error) {
      console.error('Errore nella verifica del codice', error);
      
      toast({
        title: 'Errore',
        description: error instanceof Error ? error.message : 'Impossibile verificare il codice. Riprova.',
        variant: 'destructive',
      });
    } finally {
      setIsVerifying(false);
    }
  };
  
  // Disconnette il dispositivo
  const handleDisconnect = async () => {
    try {
      const response = await fetch('/api/phone-device/disconnect-direct', {
        method: 'POST',
      });
      
      const data = await response.json();
      
      if (data.success) {
        toast({
          title: 'Numero rimosso',
          description: 'Il numero di telefono è stato rimosso con successo',
        });
        
        // Resettiamo lo stato
        setDeviceStatus(DeviceStatus.DISCONNECTED);
        setSavedPhoneNumber(null);
        setPhoneNumber('');
        setVerificationCode('');
        setLastUpdated(new Date());
      } else {
        throw new Error(data.error || 'Errore sconosciuto durante la rimozione');
      }
    } catch (error) {
      console.error('Errore nella rimozione del numero', error);
      
      toast({
        title: 'Errore',
        description: 'Impossibile rimuovere il numero. Riprova.',
        variant: 'destructive',
      });
    }
  };
  
  // Invia un SMS di test
  const handleSendTestSms = async () => {
    try {
      const response = await fetch('/api/phone-device/send-test-direct', {
        method: 'POST',
      });
      
      const data = await response.json();
      
      if (data.success) {
        toast({
          title: 'SMS inviato',
          description: 'SMS di test inviato con successo al tuo numero',
        });
      } else {
        throw new Error(data.error || 'Errore sconosciuto durante l\'invio del test');
      }
    } catch (error) {
      console.error('Errore nell\'invio dell\'SMS di test', error);
      
      toast({
        title: 'Errore',
        description: 'Impossibile inviare l\'SMS di test. Riprova.',
        variant: 'destructive',
      });
    }
  };
  
  // Ottiene il testo dello stato in base allo stato del dispositivo
  const getStatusText = (status: DeviceStatus): string => {
    switch (status) {
      case DeviceStatus.DISCONNECTED:
        return t('Nessun telefono configurato');
      case DeviceStatus.VERIFICATION_PENDING:
        return t('In attesa di verifica');
      case DeviceStatus.VERIFIED:
      case DeviceStatus.CONNECTED:
        return t('Telefono configurato e pronto');
      default:
        return t('Stato sconosciuto');
    }
  };
  
  // Ottiene il colore dello stato in base allo stato del dispositivo
  const getStatusColor = (status: DeviceStatus): string => {
    switch (status) {
      case DeviceStatus.DISCONNECTED:
        return 'text-slate-500';
      case DeviceStatus.VERIFICATION_PENDING:
        return 'text-amber-500';
      case DeviceStatus.VERIFIED:
      case DeviceStatus.CONNECTED:
        return 'text-green-600';
      default:
        return 'text-slate-500';
    }
  };

  // Rendering della pagina principale
  return (
    <div className="container mx-auto px-4 py-8">
      <header className="mb-8 text-center">
        <h1 className="text-3xl font-bold mb-2">
          {t('Configurazione Telefono per Notifiche')}
        </h1>
        <p className="text-muted-foreground max-w-2xl mx-auto">
          {t('Inserisci il tuo numero di telefono per inviare messaggi e notifiche ai clienti')}
        </p>
      </header>
      
      <div className="grid gap-8 md:grid-cols-12">
        {/* RIQUADRO PRINCIPALE */}
        <div className="md:col-span-7">
          <Card className="shadow-md">
            <CardHeader className="bg-slate-50">
              <CardTitle className="flex items-center text-xl">
                <Phone className="mr-3 h-6 w-6 text-primary" />
                {t('Il tuo telefono per le notifiche')}
              </CardTitle>
              <CardDescription className="text-base">
                {deviceStatus === DeviceStatus.DISCONNECTED ? 
                  t('Configura un numero di telefono per inviare notifiche ai clienti') : 
                  t('Stato attuale del tuo numero per le notifiche')}
              </CardDescription>
            </CardHeader>

            <CardContent className="space-y-6 p-6">
              {/* STATO */}
              <div className="p-4 border rounded-xl bg-muted/30 shadow-sm">
                <div className="flex flex-col gap-4">
                  {/* Indicatore stato */}
                  <div className="flex items-center">
                    <div className={`w-4 h-4 rounded-full mr-3 ${getStatusColor(deviceStatus)}`} />
                    <span className="font-medium text-lg">{getStatusText(deviceStatus)}</span>
                  </div>
                  
                  {/* Dettagli dispositivo, se presente */}
                  {(deviceStatus !== DeviceStatus.DISCONNECTED) && (
                    <div className="flex flex-col gap-2 pl-7">
                      {savedPhoneNumber && (
                        <div className="flex items-center text-base">
                          <Smartphone className="h-5 w-5 mr-2 inline text-slate-500" />
                          <span className="font-medium">{savedPhoneNumber}</span>
                        </div>
                      )}
                      
                      {lastUpdated && (
                        <div className="text-sm text-muted-foreground">
                          Ultimo aggiornamento: {format(lastUpdated, 'HH:mm:ss')}
                        </div>
                      )}
                    </div>
                  )}
                </div>
              </div>

              {/* CONFIGURAZIONE */}
              {deviceStatus === DeviceStatus.DISCONNECTED && (
                <div className="border-2 border-dashed border-primary/30 rounded-xl bg-primary/5 p-6">
                  <div className="text-center mb-4">
                    <h3 className="font-medium text-lg mb-2">
                      {t('Configura il tuo numero di telefono')}
                    </h3>
                    <p className="text-muted-foreground text-sm mb-4">
                      {t('Inserisci il tuo numero di telefono con il prefisso internazionale (es. +39)')}
                    </p>
                  </div>
                  
                  <div className="space-y-4">
                    <div className="space-y-2">
                      <Label htmlFor="phone-number">{t('Numero di telefono')}</Label>
                      <Input 
                        id="phone-number"
                        type="tel" 
                        placeholder="+39 XXX XXXXXXX"
                        value={phoneNumber}
                        onChange={(e) => setPhoneNumber(e.target.value)}
                      />
                      <p className="text-xs text-muted-foreground">
                        {t('Esempio: +393471234567 (senza spazi)')}
                      </p>
                    </div>
                    
                    <Button
                      className="w-full"
                      disabled={isSubmitting || !phoneNumber.trim()}
                      onClick={handleRegisterPhone}
                    >
                      {isSubmitting ? (
                        <>Registrazione in corso...</>
                      ) : (
                        <>Registra questo numero</>
                      )}
                    </Button>
                  </div>
                </div>
              )}

              {/* VERIFICA */}
              {deviceStatus === DeviceStatus.VERIFICATION_PENDING && (
                <div className="border-2 border-dashed border-amber-200 rounded-xl bg-amber-50 p-6">
                  <div className="text-center mb-4">
                    <AlertCircle className="h-8 w-8 text-amber-500 mx-auto mb-2" />
                    <h3 className="font-medium text-lg mb-2 text-amber-800">
                      {t('Verifica il tuo numero')}
                    </h3>
                    <p className="text-amber-700 mb-4">
                      {t('Abbiamo inviato un SMS con un codice di verifica al numero')} <strong>{savedPhoneNumber}</strong>
                    </p>
                  </div>
                  
                  <div className="space-y-4">
                    <div className="space-y-2">
                      <Label htmlFor="verification-code">{t('Codice di verifica')}</Label>
                      <Input 
                        id="verification-code"
                        type="text" 
                        placeholder="123456"
                        value={verificationCode}
                        onChange={(e) => setVerificationCode(e.target.value)}
                      />
                    </div>
                    
                    <Button
                      className="w-full"
                      disabled={isVerifying || !verificationCode.trim()}
                      onClick={handleVerifyCode}
                    >
                      {isVerifying ? (
                        <>Verifica in corso...</>
                      ) : (
                        <>Verifica codice</>
                      )}
                    </Button>
                  </div>
                </div>
              )}

              {/* TELEFONO CONFIGURATO */}
              {(deviceStatus === DeviceStatus.VERIFIED || deviceStatus === DeviceStatus.CONNECTED) && (
                <div className="border-2 border-dashed border-green-200 rounded-xl bg-green-50 p-6">
                  <div className="text-center mb-4">
                    <CheckCircle className="h-10 w-10 text-green-500 mx-auto mb-2" />
                    <h3 className="font-medium text-xl mb-2 text-green-800">
                      {t('Numero di telefono configurato')}
                    </h3>
                    <p className="text-green-700 mb-4">
                      {t('Il tuo numero è configurato e pronto per inviare notifiche ai clienti')}
                    </p>
                  </div>
                  
                  <div className="flex flex-col gap-4">
                    <Button
                      variant="outline"
                      className="border-green-300"
                      onClick={handleSendTestSms}
                    >
                      <Send className="h-4 w-4 mr-2" />
                      {t('Invia SMS di test')}
                    </Button>
                    
                    <Button
                      variant="outline"
                      className="border-red-300 text-red-600 hover:bg-red-50"
                      onClick={handleDisconnect}
                    >
                      {t('Rimuovi questo numero')}
                    </Button>
                  </div>
                </div>
              )}
            </CardContent>
          </Card>
        </div>
        
        {/* RIQUADRO GUIDA */}
        <div className="md:col-span-5">
          <Card className="shadow-md">
            <CardHeader className="bg-slate-50">
              <CardTitle className="flex items-center">
                <Smartphone className="mr-2 h-5 w-5" />
                {t('Guida rapida')}
              </CardTitle>
              <CardDescription>
                {t('Informazioni utili per configurare il tuo numero')}
              </CardDescription>
            </CardHeader>
            
            <CardContent className="p-6">
              <div className="space-y-6">
                <div>
                  <h3 className="text-xl font-medium mb-4">
                    {t('Come funziona in 3 passaggi:')}
                  </h3>
                  
                  <div className="space-y-6">
                    <div className="flex gap-4">
                      <div className="flex-shrink-0 h-8 w-8 rounded-full bg-primary/10 text-primary flex items-center justify-center font-bold">1</div>
                      <div>
                        <h4 className="text-lg font-medium">{t('Inserisci il tuo numero')}</h4>
                        <p className="text-muted-foreground mt-1">
                          {t('Inserisci il tuo numero di telefono con il prefisso internazionale')}
                        </p>
                      </div>
                    </div>
                    
                    <div className="flex gap-4">
                      <div className="flex-shrink-0 h-8 w-8 rounded-full bg-primary/10 text-primary flex items-center justify-center font-bold">2</div>
                      <div>
                        <h4 className="text-lg font-medium">{t('Verifica il numero')}</h4>
                        <p className="text-muted-foreground mt-1">
                          {t('Riceverai un SMS con un codice da inserire per verificare il tuo numero')}
                        </p>
                      </div>
                    </div>
                    
                    <div className="flex gap-4">
                      <div className="flex-shrink-0 h-8 w-8 rounded-full bg-primary/10 text-primary flex items-center justify-center font-bold">3</div>
                      <div>
                        <h4 className="text-lg font-medium">{t('Inizia a inviare notifiche')}</h4>
                        <p className="text-muted-foreground mt-1">
                          {t('Torna alla pagina Notifiche e inizia a inviare promemoria ai tuoi clienti')}
                        </p>
                      </div>
                    </div>
                  </div>
                </div>
                
                <div className="p-4 bg-amber-50 rounded-lg border border-amber-200">
                  <h4 className="text-lg font-medium text-amber-800 flex items-center">
                    <AlertCircle className="h-5 w-5 mr-2 text-amber-600" />
                    {t('Note importanti:')}
                  </h4>
                  
                  <ul className="mt-2 space-y-2 list-disc pl-5 text-amber-700">
                    <li>
                      {t('Utilizza un numero di telefono con un piano che includa SMS')}
                    </li>
                    <li>
                      {t('Assicurati di inserire il prefisso internazionale corretto (es. +39 per l\'Italia)')}
                    </li>
                    <li>
                      {t('I costi degli SMS verranno addebitati secondo il tuo piano tariffario')}
                    </li>
                  </ul>
                </div>
                
                {(deviceStatus === DeviceStatus.VERIFIED || deviceStatus === DeviceStatus.CONNECTED) && (
                  <Alert variant="default" className="bg-green-50 border-green-200">
                    <CheckCircle className="h-5 w-5 text-green-600" />
                    <AlertTitle className="text-green-800">{t('Cosa fare adesso?')}</AlertTitle>
                    <AlertDescription className="text-green-700">
                      <p className="mb-2">
                        {t('Il tuo numero è configurato e pronto. Puoi ora:')}
                      </p>
                      <ul className="list-disc pl-5 space-y-1 text-sm">
                        <li>
                          {t('Tornare alla pagina Notifiche e inviare messaggi ai clienti')}
                        </li>
                        <li>
                          {t('Inviare un SMS di test per verificare il funzionamento')}
                        </li>
                      </ul>
                    </AlertDescription>
                  </Alert>
                )}
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
};

export default SimplePhoneSetup;