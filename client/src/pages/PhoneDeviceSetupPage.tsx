import React, { useEffect, useState } from 'react';
import { Loader2, Smartphone, QrCode as LucideQrCode, PhoneOff, Check, RefreshCw, Send } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { io, Socket } from 'socket.io-client';
import { useTranslation } from 'react-i18next';
import { QRCodeSVG } from 'qrcode.react';

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

const PhoneDeviceSetupPage = () => {
  const { toast } = useToast();
  const { t } = useTranslation();
  const [socket, setSocket] = useState<Socket | null>(null);
  const [deviceInfo, setDeviceInfo] = useState<DeviceInfo>({
    status: DeviceStatus.DISCONNECTED,
    deviceId: null,
    phoneNumber: null
  });
  const [qrCode, setQrCode] = useState<string | null>(null);
  const [isConnecting, setIsConnecting] = useState(false);
  const [isDisconnecting, setIsDisconnecting] = useState(false);
  const [testNumber, setTestNumber] = useState('');
  const [testMessage, setTestMessage] = useState('Questo è un messaggio di test');
  const [isSending, setIsSending] = useState(false);

  // Inizializza il socket e gestisce gli eventi
  useEffect(() => {
    // Determina l'URL della socket in base al protocollo (http/https)
    const protocol = window.location.protocol === "https:" ? "wss:" : "ws:";
    const wsUrl = `${protocol}//${window.location.host}`;
    
    const newSocket = io(wsUrl, { path: '/phone-device-socket' });
    
    newSocket.on('connect', () => {
      console.log('Connesso al server socket.io');
      // Quando la connessione è stabilita, richiediamo lo stato attuale del dispositivo
      fetch('/api/phone-device/status')
        .then(res => res.json())
        .then(data => {
          if (data.success && data.status) {
            setDeviceInfo(data.status);
          }
        })
        .catch(err => console.error('Errore nel recupero dello stato:', err));
    });

    newSocket.on('device_status', (data: DeviceInfo) => {
      console.log('Ricevuto stato dispositivo:', data);
      setDeviceInfo(data);
      
      // Resetta lo stato di connessione/disconnessione
      setIsConnecting(false);
      setIsDisconnecting(false);
      
      // Mostra toast per eventi importanti
      if (data.status === DeviceStatus.CONNECTED && deviceInfo.status !== DeviceStatus.CONNECTED) {
        toast({
          title: "Dispositivo connesso con successo!",
          description: `Numero di telefono: ${data.phoneNumber || 'Sconosciuto'}`,
        });
      } else if (data.status === DeviceStatus.DISCONNECTED && deviceInfo.status !== DeviceStatus.DISCONNECTED) {
        toast({
          title: "Dispositivo disconnesso",
          description: "Il dispositivo è stato disconnesso.",
        });
      } else if (data.status === DeviceStatus.AUTH_FAILURE) {
        toast({
          title: "Autenticazione fallita",
          description: "Non è stato possibile autenticare il dispositivo. Riprova.",
          variant: "destructive",
        });
      }
    });

    newSocket.on('qr_code', (qr: string) => {
      console.log('Ricevuto QR code');
      setQrCode(qr);
      // Aggiorniamo anche lo stato del dispositivo quando riceviamo un QR
      setDeviceInfo(prev => ({...prev, status: DeviceStatus.QR_READY}));
    });

    newSocket.on('disconnect', () => {
      console.log('Disconnesso dal server socket.io');
      toast({
        title: "Connessione persa",
        description: "La connessione al server è stata persa. Ricarica la pagina.",
        variant: "destructive",
      });
    });

    setSocket(newSocket);

    return () => {
      newSocket.disconnect();
    };
  }, []);

  // Gestione delle azioni sul dispositivo
  const handleStartPairing = async () => {
    setIsConnecting(true);
    setQrCode(null);
    
    toast({
      title: "Inizializzazione dispositivo",
      description: "Preparazione del codice QR per l'accoppiamento...",
    });
    
    try {
      const response = await fetch('/api/phone-device/start-pairing', {
        method: 'POST',
      });
      const data = await response.json();
      
      if (!data.success) {
        toast({
          title: "Errore",
          description: data.message || "Impossibile inizializzare il dispositivo",
          variant: "destructive",
        });
        setIsConnecting(false);
      }
    } catch (error) {
      console.error('Errore durante l\'inizializzazione:', error);
      toast({
        title: "Errore di connessione",
        description: "Impossibile comunicare con il server",
        variant: "destructive",
      });
      setIsConnecting(false);
    }
  };

  const handleDisconnect = async () => {
    setIsDisconnecting(true);
    
    toast({
      title: "Disconnessione in corso",
      description: "Disconnessione del dispositivo...",
    });
    
    try {
      const response = await fetch('/api/phone-device/disconnect', {
        method: 'POST',
      });
      const data = await response.json();
      
      if (!data.success) {
        toast({
          title: "Errore",
          description: data.message || "Impossibile disconnettere il dispositivo",
          variant: "destructive",
        });
        setIsDisconnecting(false);
      }
    } catch (error) {
      console.error('Errore durante la disconnessione:', error);
      toast({
        title: "Errore di connessione",
        description: "Impossibile comunicare con il server",
        variant: "destructive",
      });
      setIsDisconnecting(false);
    }
  };

  // Invia un messaggio di test
  const handleSendTestMessage = async () => {
    if (!testNumber || !testMessage) {
      toast({
        title: "Dati mancanti",
        description: "Inserisci un numero di telefono e un messaggio.",
        variant: "destructive",
      });
      return;
    }
    
    setIsSending(true);
    
    try {
      const response = await fetch('/api/phone-device/send-test', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          phone: testNumber,
          message: testMessage
        }),
      });
      
      const data = await response.json();
      
      if (data.success) {
        toast({
          title: "Messaggio inviato",
          description: "Il messaggio di test è stato inviato con successo!",
        });
      } else {
        toast({
          title: "Errore nell'invio",
          description: data.error || "Non è stato possibile inviare il messaggio.",
          variant: "destructive",
        });
      }
    } catch (error) {
      toast({
        title: "Errore nell'invio",
        description: "Si è verificato un errore durante l'invio del messaggio.",
        variant: "destructive",
      });
    } finally {
      setIsSending(false);
    }
  };

  // Determina lo stato in formato leggibile
  const getStatusText = (status: DeviceStatus): string => {
    switch (status) {
      case DeviceStatus.DISCONNECTED:
        return t('Disconnesso');
      case DeviceStatus.CONNECTING:
        return t('Connessione in corso...');
      case DeviceStatus.QR_READY:
        return t('Scansiona il codice QR');
      case DeviceStatus.AUTHENTICATED:
        return t('Autenticato');
      case DeviceStatus.CONNECTED:
        return t('Connesso');
      case DeviceStatus.AUTH_FAILURE:
        return t('Autenticazione fallita');
      default:
        return t('Sconosciuto');
    }
  };

  // Determina il colore dello stato
  const getStatusColor = (status: DeviceStatus): string => {
    switch (status) {
      case DeviceStatus.CONNECTED:
      case DeviceStatus.AUTHENTICATED:
        return 'text-green-500';
      case DeviceStatus.CONNECTING:
      case DeviceStatus.QR_READY:
        return 'text-blue-500';
      case DeviceStatus.AUTH_FAILURE:
        return 'text-red-500';
      default:
        return 'text-gray-500';
    }
  };

  return (
    <div className="container mx-auto py-8">
      <h1 className="text-3xl font-bold mb-6">{t('Configurazione Dispositivo per Messaggi')}</h1>
      
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <Card className="md:col-span-2">
          <CardHeader>
            <CardTitle>{t('Stato Dispositivo')}</CardTitle>
            <CardDescription>
              {t('Collega un dispositivo per l\'invio automatico di messaggi WhatsApp e SMS')}
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="flex items-center space-x-4 mb-6">
              <Smartphone className="h-8 w-8" />
              <div>
                <div className="text-sm text-muted-foreground">{t('Stato')}:</div>
                <div className={`font-medium ${getStatusColor(deviceInfo.status)}`}>
                  {getStatusText(deviceInfo.status)}
                </div>
              </div>
              
              {deviceInfo.phoneNumber && (
                <div className="ml-8">
                  <div className="text-sm text-muted-foreground">{t('Numero Telefono')}:</div>
                  <div className="font-medium">{deviceInfo.phoneNumber}</div>
                </div>
              )}
            </div>
            
            <div className="space-y-2">
              {deviceInfo.status === DeviceStatus.DISCONNECTED && (
                <Button 
                  onClick={handleStartPairing} 
                  disabled={isConnecting}
                  className="w-full md:w-auto"
                >
                  {isConnecting ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      {t('Connessione...')}
                    </>
                  ) : (
                    <>
                      <LucideQrCode className="mr-2 h-4 w-4" />
                      {t('Inizia Accoppiamento')}
                    </>
                  )}
                </Button>
              )}
              
              {deviceInfo.status !== DeviceStatus.DISCONNECTED && (
                <Button 
                  onClick={handleDisconnect} 
                  variant="destructive"
                  disabled={isDisconnecting}
                  className="w-full md:w-auto"
                >
                  {isDisconnecting ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      {t('Disconnessione...')}
                    </>
                  ) : (
                    <>
                      <PhoneOff className="mr-2 h-4 w-4" />
                      {t('Disconnetti Dispositivo')}
                    </>
                  )}
                </Button>
              )}
            </div>
          </CardContent>
        </Card>
        
        {deviceInfo.status === DeviceStatus.QR_READY && qrCode && (
          <Card>
            <CardHeader>
              <CardTitle>{t('Scansiona il Codice QR')}</CardTitle>
              <CardDescription>
                {t('Apri WhatsApp sul tuo telefono e scansiona questo codice QR')}
              </CardDescription>
            </CardHeader>
            <CardContent className="flex justify-center">
              {/* Visualizza il QR code come immagine */}
              <div className="border p-4 bg-white">
                <QRCodeSVG value={qrCode} size={256} />
              </div>
            </CardContent>
            <CardFooter>
              <Button 
                variant="outline" 
                onClick={handleStartPairing}
                className="w-full"
              >
                <RefreshCw className="mr-2 h-4 w-4" />
                {t('Genera Nuovo QR')}
              </Button>
            </CardFooter>
          </Card>
        )}
        
        {deviceInfo.status === DeviceStatus.CONNECTED && (
          <Card>
            <CardHeader>
              <CardTitle>{t('Test Invio Messaggio')}</CardTitle>
              <CardDescription>
                {t('Invia un messaggio di test per verificare il funzionamento')}
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <label className="text-sm font-medium leading-none mb-2 block">
                  {t('Numero di telefono')}
                </label>
                <input 
                  type="text" 
                  value={testNumber} 
                  onChange={(e) => setTestNumber(e.target.value)}
                  placeholder="+39XXXXXXXXXX"
                  className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                />
                <p className="text-sm text-muted-foreground mt-1">
                  {t('Inserisci il numero con prefisso internazionale')}
                </p>
              </div>
              
              <div>
                <label className="text-sm font-medium leading-none mb-2 block">
                  {t('Messaggio')}
                </label>
                <textarea 
                  value={testMessage} 
                  onChange={(e) => setTestMessage(e.target.value)}
                  placeholder={t('Scrivi un messaggio di test')}
                  rows={3}
                  className="flex w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                />
              </div>
            </CardContent>
            <CardFooter>
              <Button 
                onClick={handleSendTestMessage} 
                disabled={isSending || !testNumber || !testMessage}
                className="w-full"
              >
                {isSending ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    {t('Invio in corso...')}
                  </>
                ) : (
                  <>
                    <Send className="mr-2 h-4 w-4" />
                    {t('Invia Messaggio Test')}
                  </>
                )}
              </Button>
            </CardFooter>
          </Card>
        )}
        
        <Card className="md:col-span-2">
          <CardHeader>
            <CardTitle>{t('Istruzioni')}</CardTitle>
            <CardDescription>
              {t('Come utilizzare il sistema di messaggistica con il tuo telefono')}
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Tabs defaultValue="setup">
              <TabsList className="mb-4">
                <TabsTrigger value="setup">{t('Configurazione')}</TabsTrigger>
                <TabsTrigger value="usage">{t('Utilizzo')}</TabsTrigger>
                <TabsTrigger value="troubleshooting">{t('Risoluzione Problemi')}</TabsTrigger>
              </TabsList>
              
              <TabsContent value="setup" className="space-y-4">
                <Alert>
                  <AlertTitle>{t('Requisiti')}</AlertTitle>
                  <AlertDescription>
                    <ul className="list-disc pl-5 space-y-1 mt-2">
                      <li>{t('Un telefono Android o iOS con WhatsApp installato')}</li>
                      <li>{t('Connessione internet stabile sul telefono')}</li>
                      <li>{t('Il telefono deve essere acceso durante l\'invio dei messaggi')}</li>
                    </ul>
                  </AlertDescription>
                </Alert>
                
                <h3 className="text-lg font-medium">{t('Passaggi di configurazione:')}</h3>
                <ol className="list-decimal pl-5 space-y-2">
                  <li>
                    {t('Clicca su "Inizia Accoppiamento" per generare un codice QR')}
                  </li>
                  <li>
                    {t('Apri WhatsApp sul tuo telefono e vai a Impostazioni → Dispositivi collegati → Collega un dispositivo')}
                  </li>
                  <li>
                    {t('Scansiona il codice QR mostrato sullo schermo')}
                  </li>
                  <li>
                    {t('Attendi che il dispositivo venga connesso')}
                  </li>
                  <li>
                    {t('Testa l\'invio di un messaggio per verificare che tutto funzioni correttamente')}
                  </li>
                </ol>
              </TabsContent>
              
              <TabsContent value="usage" className="space-y-4">
                <h3 className="text-lg font-medium">{t('Come funziona:')}</h3>
                <p>
                  {t('Una volta accoppiato il dispositivo, il sistema utilizzerà automaticamente il tuo telefono per inviare:')}
                </p>
                <ul className="list-disc pl-5 space-y-1 mt-2">
                  <li>{t('Promemoria per gli appuntamenti')}</li>
                  <li>{t('Notifiche di cancellazione o modifica')}</li>
                  <li>{t('Altri messaggi automatici configurati nel sistema')}</li>
                </ul>
                
                <Alert>
                  <AlertTitle>{t('Importante')}</AlertTitle>
                  <AlertDescription>
                    <p className="mt-2">
                      {t('Per garantire che i messaggi vengano inviati correttamente:')}
                    </p>
                    <ul className="list-disc pl-5 space-y-1 mt-2">
                      <li>{t('Mantieni il telefono acceso e connesso a internet')}</li>
                      <li>{t('Non chiudere WhatsApp Web (può funzionare in background)')}</li>
                      <li>{t('Ricollega il dispositivo se cambi telefono o reinstalli WhatsApp')}</li>
                    </ul>
                  </AlertDescription>
                </Alert>
              </TabsContent>
              
              <TabsContent value="troubleshooting" className="space-y-4">
                <h3 className="text-lg font-medium">{t('Problemi comuni:')}</h3>
                
                <div className="space-y-3">
                  <div>
                    <h4 className="font-medium">{t('Il codice QR non viene riconosciuto')}</h4>
                    <p className="text-sm text-muted-foreground">
                      {t('Riprova generando un nuovo codice QR. Assicurati che la fotocamera del telefono sia pulita e che ci sia abbastanza luce.')}
                    </p>
                  </div>
                  
                  <div>
                    <h4 className="font-medium">{t('Disconnessioni frequenti')}</h4>
                    <p className="text-sm text-muted-foreground">
                      {t('Verifica che il telefono abbia una connessione internet stabile. Evita di utilizzare la modalità risparmio energetico estremo che potrebbe chiudere WhatsApp in background.')}
                    </p>
                  </div>
                  
                  <div>
                    <h4 className="font-medium">{t('I messaggi non vengono inviati')}</h4>
                    <p className="text-sm text-muted-foreground">
                      {t('Verifica che il dispositivo sia ancora connesso. Prova a disconnettere e riconnettere il dispositivo. Assicurati che il numero di telefono del destinatario sia corretto e formattato con il prefisso internazionale.')}
                    </p>
                  </div>
                  
                  <div>
                    <h4 className="font-medium">{t('Errore di autenticazione')}</h4>
                    <p className="text-sm text-muted-foreground">
                      {t('La sessione WhatsApp Web potrebbe essere scaduta. Disconnetti e riaccoppia il dispositivo seguendo nuovamente i passaggi di configurazione.')}
                    </p>
                  </div>
                </div>
              </TabsContent>
            </Tabs>
          </CardContent>
        </Card>
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