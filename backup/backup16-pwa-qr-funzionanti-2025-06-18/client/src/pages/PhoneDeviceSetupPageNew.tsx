import React, { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { 
  Smartphone, 
  AlertCircle, 
  QrCode, 
  RefreshCw, 
  CheckCircle, 
  Phone, 
  Sparkles 
} from "lucide-react";
import { QRCodeSVG } from 'qrcode.react';
import { useToast } from "@/hooks/use-toast";
import { socketIo } from '../lib/socket';
import { format } from 'date-fns';

enum DeviceStatus {
  DISCONNECTED = 'disconnected',
  CONNECTING = 'connecting',
  CONNECTED = 'connected',
  QR_READY = 'qr_ready',
  AUTHENTICATED = 'authenticated',
  AUTH_FAILURE = 'auth_failure'
}

interface DeviceInfo {
  status: DeviceStatus;
  deviceId: string | null;
  phoneNumber: string | null;
}

const PhoneDeviceSetupPage: React.FC = () => {
  const { t } = useTranslation();
  const { toast } = useToast();
  const [deviceStatus, setDeviceStatus] = useState<DeviceStatus>(DeviceStatus.DISCONNECTED);
  const [qrCode, setQrCode] = useState<string>('');
  const [deviceId, setDeviceId] = useState<string | null>(null);
  const [phoneNumber, setPhoneNumber] = useState<string | null>(null);
  const [isGeneratingQR, setIsGeneratingQR] = useState(false);
  const [lastUpdated, setLastUpdated] = useState<Date | null>(null);
  const [simulationInProgress, setSimulationInProgress] = useState(false);
  
  // Inizializza il socket e carica lo stato iniziale
  useEffect(() => {
    // Carica lo stato iniziale del dispositivo telefonico
    const fetchInitialStatus = async () => {
      try {
        const response = await fetch('/api/phone-device/status');
        const data = await response.json();
        
        if (data.success && data.status) {
          updateDeviceInfo(data.status);
        }
      } catch (error) {
        console.error('Errore nel caricamento dello stato del dispositivo', error);
      }
    };
    
    fetchInitialStatus();
    
    // Imposta listener del socket per gli aggiornamenti di stato
    const newSocket = socketIo;
    
    newSocket.on('device_status', (data: DeviceInfo) => {
      updateDeviceInfo(data);
    });
    
    newSocket.on('qr_code', (data: { qrCode: string }) => {
      setQrCode(data.qrCode);
      setIsGeneratingQR(false);
      setLastUpdated(new Date());
    });
    
    return () => {
      newSocket.off('device_status');
      newSocket.off('qr_code');
    };
  }, []);
  
  // Aggiorna le informazioni del dispositivo
  const updateDeviceInfo = (data: DeviceInfo) => {
    setDeviceStatus(data.status);
    setDeviceId(data.deviceId);
    setPhoneNumber(data.phoneNumber);
    setLastUpdated(new Date());
    
    // Se il dispositivo è già autenticato, non mostriamo il QR
    if (data.status === DeviceStatus.AUTHENTICATED || data.status === DeviceStatus.CONNECTED) {
      setQrCode('');
    }
  };
  
  // Avvia il processo di accoppiamento
  const handleStartPairing = async () => {
    setIsGeneratingQR(true);
    
    try {
      const response = await fetch('/api/phone-device/start-pairing', {
        method: 'POST',
      });
      
      const data = await response.json();
      
      if (!data.success) {
        throw new Error(data.error || 'Errore sconosciuto durante l\'avvio dell\'accoppiamento');
      }
      
      toast({
        title: 'Generazione QR code in corso',
        description: 'Attendi la visualizzazione del QR code e poi scansionalo con il tuo telefono',
      });
      
    } catch (error) {
      console.error('Errore nell\'avvio dell\'accoppiamento', error);
      setIsGeneratingQR(false);
      
      toast({
        title: 'Errore',
        description: 'Impossibile avviare il processo di accoppiamento. Riprova tra qualche istante.',
        variant: 'destructive',
      });
    }
  };
  
  // Disconnette il dispositivo
  const handleDisconnect = async () => {
    try {
      const response = await fetch('/api/phone-device/disconnect', {
        method: 'POST',
      });
      
      const data = await response.json();
      
      if (data.success) {
        toast({
          title: 'Dispositivo disconnesso',
          description: 'Il dispositivo è stato disconnesso con successo',
        });
        
        // Resettiamo lo stato
        setDeviceStatus(DeviceStatus.DISCONNECTED);
        setQrCode('');
        setDeviceId(null);
        setPhoneNumber(null);
      } else {
        throw new Error(data.error || 'Errore sconosciuto durante la disconnessione');
      }
    } catch (error) {
      console.error('Errore nella disconnessione del dispositivo', error);
      
      toast({
        title: 'Errore',
        description: 'Impossibile disconnettere il dispositivo. Riprova tra qualche istante.',
        variant: 'destructive',
      });
    }
  };

  // Simula la scansione del QR code (per modalità test)
  const handleSimulateScan = async () => {
    setSimulationInProgress(true);
    
    try {
      const response = await fetch('/api/phone-device/simulate-scan', {
        method: 'POST'
      });
      
      const data = await response.json();
      
      if (data.success) {
        toast({
          title: 'Test di connessione riuscito',
          description: 'La simulazione di scansione QR è stata completata con successo',
          variant: 'default'
        });
      } else {
        throw new Error(data.error || 'Errore sconosciuto durante la simulazione');
      }
    } catch (error) {
      console.error('Errore nella simulazione della scansione', error);
      
      toast({
        title: 'Errore simulazione',
        description: 'Impossibile simulare la scansione del QR code',
        variant: 'destructive',
      });
    } finally {
      setSimulationInProgress(false);
    }
  };
  
  // Ottiene il testo dello stato in base allo stato del dispositivo
  const getStatusText = (status: DeviceStatus): string => {
    switch (status) {
      case DeviceStatus.DISCONNECTED:
        return t('Nessun telefono collegato');
      case DeviceStatus.CONNECTING:
        return t('Connessione in corso...');
      case DeviceStatus.CONNECTED:
        return t('Telefono collegato');
      case DeviceStatus.QR_READY:
        return t('In attesa di scansione...');
      case DeviceStatus.AUTHENTICATED:
        return t('Telefono configurato e pronto');
      case DeviceStatus.AUTH_FAILURE:
        return t('Errore di connessione');
      default:
        return t('Stato sconosciuto');
    }
  };
  
  // Ottiene il colore dello stato in base allo stato del dispositivo
  const getStatusColor = (status: DeviceStatus): string => {
    switch (status) {
      case DeviceStatus.DISCONNECTED:
        return 'text-slate-500';
      case DeviceStatus.CONNECTING:
        return 'text-amber-500';
      case DeviceStatus.CONNECTED:
        return 'text-green-500';
      case DeviceStatus.QR_READY:
        return 'text-blue-500';
      case DeviceStatus.AUTHENTICATED:
        return 'text-green-600';
      case DeviceStatus.AUTH_FAILURE:
        return 'text-red-500';
      default:
        return 'text-slate-500';
    }
  };
  
  // Controlla se mostrare il QR code
  const shouldShowQRCode = () => {
    return deviceStatus === DeviceStatus.QR_READY && qrCode;
  };
  
  // Controlla se mostrare il pulsante di accoppiamento
  const shouldShowPairingButton = () => {
    return [DeviceStatus.DISCONNECTED, DeviceStatus.AUTH_FAILURE].includes(deviceStatus);
  };
  
  // Controlla se mostrare il pulsante di disconnessione
  const shouldShowDisconnectButton = () => {
    return [DeviceStatus.AUTHENTICATED, DeviceStatus.CONNECTED].includes(deviceStatus);
  };

  // Rendering della pagina principale
  return (
    <div className="container mx-auto px-4 py-8">
      <header className="mb-8 text-center">
        <h1 className="text-3xl font-bold mb-2">
          {t('Configurazione Telefono per Notifiche')}
        </h1>
        <p className="text-muted-foreground max-w-2xl mx-auto">
          {t('Questa procedura ti permetterà di collegare un telefono per inviare messaggi ai tuoi clienti')}
        </p>
      </header>
      
      <div className="grid gap-8 md:grid-cols-12">
        {/* RIQUADRO PRINCIPALE CON STATO */}
        <div className="md:col-span-7">
          <Card className="shadow-md">
            <CardHeader className="bg-slate-50">
              <CardTitle className="flex items-center text-xl">
                <Phone className="mr-3 h-6 w-6 text-primary" />
                {t('Il tuo telefono per le notifiche')}
              </CardTitle>
              <CardDescription className="text-base">
                {deviceStatus === DeviceStatus.DISCONNECTED ? 
                  t('Collega un telefono per iniziare a inviare notifiche ai clienti') : 
                  t('Stato attuale del collegamento con il tuo telefono')}
              </CardDescription>
            </CardHeader>

            <CardContent className="space-y-6 p-6">
              {/* STATO CONNESSIONE */}
              <div className="p-4 border rounded-xl bg-muted/30 shadow-sm">
                <div className="flex flex-col gap-4">
                  {/* Indicatore stato */}
                  <div className="flex items-center">
                    <div className={`w-4 h-4 rounded-full mr-3 ${getStatusColor(deviceStatus)}`} />
                    <span className="font-medium text-lg">{getStatusText(deviceStatus)}</span>
                  </div>
                  
                  {/* Dettagli dispositivo, se presente */}
                  {(deviceStatus === DeviceStatus.AUTHENTICATED || deviceStatus === DeviceStatus.CONNECTED) && (
                    <div className="flex flex-col gap-2 pl-7">
                      {phoneNumber && (
                        <div className="flex items-center text-base">
                          <Smartphone className="h-5 w-5 mr-2 inline text-slate-500" />
                          <span className="font-medium">{phoneNumber}</span>
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

              {/* PULSANTI AZIONE */}
              <div className="flex flex-col gap-4">
                {shouldShowPairingButton() && (
                  <div className="flex flex-col gap-6 items-center p-6 border-2 border-dashed border-primary/30 rounded-xl bg-primary/5">
                    <div className="text-center max-w-sm">
                      <h3 className="font-medium text-lg mb-2">
                        {t('Collega il tuo telefono')}
                      </h3>
                      <p className="text-muted-foreground text-sm mb-4">
                        {t('Clicca il pulsante qui sotto e segui le istruzioni semplici per connettere il tuo telefono')}
                      </p>
                    </div>
                    
                    <Button
                      variant="default"
                      size="lg"
                      onClick={handleStartPairing}
                      disabled={isGeneratingQR}
                      className="text-base py-6 px-8"
                    >
                      {isGeneratingQR ? (
                        <>
                          <RefreshCw className="mr-2 h-5 w-5 animate-spin" />
                          {t('Preparazione...')}
                        </>
                      ) : (
                        <>
                          <QrCode className="mr-2 h-5 w-5" />
                          {t('Inizia Configurazione')}
                        </>
                      )}
                    </Button>

                    {/* Modalità test (visibile solo per amministratori) */}
                    <div className="w-full pt-4 mt-4 border-t border-dashed border-slate-200">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={handleSimulateScan}
                        disabled={simulationInProgress || deviceStatus !== DeviceStatus.QR_READY}
                        className="w-full"
                      >
                        <Sparkles className="mr-2 h-4 w-4" />
                        {simulationInProgress ? 'Simulazione in corso...' : 'Modalità Test: Simula Scansione QR'}
                      </Button>
                    </div>
                  </div>
                )}

                {shouldShowDisconnectButton() && (
                  <div className="flex flex-col gap-4 items-center p-6 border-2 border-dashed border-green-200 rounded-xl bg-green-50">
                    <div className="text-center">
                      <CheckCircle className="h-10 w-10 text-green-500 mx-auto mb-2" />
                      <h3 className="font-medium text-xl mb-2 text-green-800">
                        {t('Telefono collegato correttamente')}
                      </h3>
                      <p className="text-green-700 mb-4">
                        {t('Il tuo telefono è pronto per inviare notifiche ai clienti')}
                      </p>
                    </div>

                    <Button
                      variant="outline"
                      onClick={handleDisconnect}
                      className="border-green-300"
                    >
                      {t('Scollega questo telefono')}
                    </Button>
                  </div>
                )}
              </div>

              {/* VISUALIZZAZIONE QR CODE */}
              {shouldShowQRCode() && (
                <div className="flex flex-col items-center p-6 border-2 border-dashed border-blue-200 rounded-xl bg-blue-50">
                  <div className="text-center mb-4">
                    <h3 className="font-medium text-xl mb-2 text-blue-800">
                      {t('Scansiona il codice QR')}
                    </h3>
                    <p className="text-blue-700 mb-2">
                      {t('Apri WhatsApp sul tuo telefono:')}
                    </p>
                    <ol className="text-sm text-blue-600 text-left list-decimal pl-5 space-y-1">
                      <li>Tocca l'icona ⋮ (tre punti) in alto a destra</li>
                      <li>Seleziona "Dispositivi collegati"</li>
                      <li>Tocca "Collega un dispositivo"</li>
                      <li>Punta la fotocamera verso questo codice QR</li>
                    </ol>
                  </div>
                  
                  <div className="bg-white p-4 rounded-xl border-4 border-blue-100 shadow-md">
                    <QRCode value={qrCode} size={250} />
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
                {t('Informazioni utili per configurare il tuo dispositivo')}
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
                        <h4 className="text-lg font-medium">{t('Collega il tuo telefono')}</h4>
                        <p className="text-muted-foreground mt-1">
                          {t('Clicca "Inizia Configurazione" e scansiona il codice QR con il tuo telefono')}
                        </p>
                      </div>
                    </div>
                    
                    <div className="flex gap-4">
                      <div className="flex-shrink-0 h-8 w-8 rounded-full bg-primary/10 text-primary flex items-center justify-center font-bold">2</div>
                      <div>
                        <h4 className="text-lg font-medium">{t('Mantieni WhatsApp attivo')}</h4>
                        <p className="text-muted-foreground mt-1">
                          {t('Assicurati che il telefono resti connesso a internet e WhatsApp rimanga attivo')}
                        </p>
                      </div>
                    </div>
                    
                    <div className="flex gap-4">
                      <div className="flex-shrink-0 h-8 w-8 rounded-full bg-primary/10 text-primary flex items-center justify-center font-bold">3</div>
                      <div>
                        <h4 className="text-lg font-medium">{t('Inizia a inviare notifiche')}</h4>
                        <p className="text-muted-foreground mt-1">
                          {t('Torna alla pagina "Notifiche" e inizia a inviare promemoria automatici ai tuoi clienti')}
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
                      {t('Utilizza il tuo telefono aziendale o un telefono dedicato alle notifiche clienti')}
                    </li>
                    <li>
                      {t('Assicurati che il telefono sia sempre carico e connesso a internet')}
                    </li>
                    <li>
                      {t('Non chiudere l\'app WhatsApp sul telefono')}
                    </li>
                    <li>
                      {t('Per problemi con l\'invio di SMS o messaggi WhatsApp, riavvia la procedura')}
                    </li>
                  </ul>
                </div>
                
                {(deviceStatus === DeviceStatus.AUTHENTICATED || deviceStatus === DeviceStatus.CONNECTED) && (
                  <Alert variant="default" className="bg-green-50 border-green-200">
                    <CheckCircle className="h-5 w-5 text-green-600" />
                    <AlertTitle className="text-green-800">{t('Cosa fare adesso?')}</AlertTitle>
                    <AlertDescription className="text-green-700">
                      <p className="mb-2">
                        {t('Il tuo telefono è configurato e pronto. Puoi ora:')}
                      </p>
                      <ul className="list-disc pl-5 space-y-1 text-sm">
                        <li>
                          {t('Tornare alla pagina Notifiche e inviare messaggi ai clienti')}
                        </li>
                        <li>
                          {t('Verificare che i messaggi arrivino correttamente')}
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

// Componente per visualizzare il QR code
const QRCode = ({ value, size = 256 }: { value: string, size?: number }) => {
  return (
    <div style={{ width: size, height: size, position: 'relative' }}>
      <QRCodeSVG 
        value={value}
        size={size}
        bgColor={"#ffffff"}
        fgColor={"#000000"}
        level={"L"}
        includeMargin={false}
      />
    </div>
  );
};

export default PhoneDeviceSetupPage;