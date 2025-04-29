import React, { useState, useEffect } from 'react';
import FooterOnly from '@/components/FooterOnly';
import { format, parseISO, addDays } from 'date-fns';
import { it } from 'date-fns/locale';
import { useTranslation } from 'react-i18next';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import {
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from '@/components/ui/tabs';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import {
  Table,
  TableBody,
  TableCaption,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Textarea } from '@/components/ui/textarea';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useToast } from '@/hooks/use-toast';
import { 
  MessageSquare, 
  Send, 
  RefreshCw, 
  CheckCircle, 
  UserCircle, 
  Calendar, 
  Clock, 
  Smartphone, 
  AlertCircle, 
  Phone,
  ExternalLink
} from 'lucide-react';

// Stati del dispositivo telefonico
enum DeviceStatus {
  DISCONNECTED = 'disconnected',
  CONNECTED = 'connected',
  VERIFICATION_PENDING = 'verification_pending',
  VERIFIED = 'verified'
}

// Informazioni sul dispositivo
interface DeviceInfo {
  status: DeviceStatus;
  phoneNumber: string | null;
  lastUpdated?: Date | null;
}

// Interfaccia per gli appuntamenti
interface Appointment {
  id: number;
  clientId: number;
  serviceId: number;
  date: string;
  startTime: string;
  endTime: string;
  status: string;
  reminderType: string | null;
  reminderStatus: string | null;
  client?: {
    id: number;
    firstName: string;
    lastName: string;
    email: string;
    phone: string;
  };
  service?: {
    id: number;
    name: string;
    duration: number;
    price: number;
  };
}

// Interfaccia per le notifiche nella cronologia
interface NotificationHistoryItem {
  id: number;
  appointmentId: number;
  clientId: number;
  type: string;
  message: string;
  sent_at: string;
  status: string;
  client?: {
    id: number;
    firstName: string;
    lastName: string;
    phone: string;
  };
}

// Componente principale
const WhatsAppCenterPage: React.FC = () => {
  const { t } = useTranslation();
  const { toast } = useToast();
  
  // Stati per il dispositivo telefonico
  const [deviceStatus, setDeviceStatus] = useState<DeviceStatus>(DeviceStatus.DISCONNECTED);
  const [phoneNumber, setPhoneNumber] = useState<string>('');
  const [savedPhoneNumber, setSavedPhoneNumber] = useState<string | null>(null);
  const [verificationCode, setVerificationCode] = useState<string>('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isVerifying, setIsVerifying] = useState(false);
  const [lastUpdated, setLastUpdated] = useState<Date | null>(null);
  
  // Stati per gli appuntamenti e le notifiche
  const [appointments, setAppointments] = useState<Appointment[]>([]);
  const [groupedAppointments, setGroupedAppointments] = useState<Record<string, Appointment[]>>({});
  const [selectedAppointments, setSelectedAppointments] = useState<Record<number, boolean>>({});
  const [customMessage, setCustomMessage] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [isSending, setIsSending] = useState(false);
  const [smsHistory, setSmsHistory] = useState<NotificationHistoryItem[]>([]);
  const [historyLoading, setHistoryLoading] = useState(false);
  
  // Tab attivo
  const [activeTab, setActiveTab] = useState("device-setup");

  // Carica lo stato iniziale del dispositivo telefonico
  useEffect(() => {
    const fetchInitialStatus = async () => {
      try {
        const response = await fetch('/api/direct-phone/direct-status');
        const data = await response.json();
        
        if (data.success && data.phoneInfo) {
          updateDeviceInfo(data.phoneInfo);
          
          // Se il telefono è già verificato, carica gli appuntamenti
          if (data.phoneInfo.status === DeviceStatus.VERIFIED || 
              data.phoneInfo.status === DeviceStatus.CONNECTED) {
            fetchUpcomingAppointments();
            fetchWhatsAppHistory();
          }
        }
      } catch (error) {
        console.error('Errore nel caricamento dello stato del dispositivo', error);
      }
    };
    
    fetchInitialStatus();
  }, []);

  // Funzione per caricare gli appuntamenti
  const fetchUpcomingAppointments = async () => {
    setIsLoading(true);
    try {
      const response = await fetch('/api/notifications/upcoming-appointments');
      const data = await response.json();
      
      if (data.success) {
        setAppointments(data.appointments || []);
        setGroupedAppointments(data.groupedAppointments || {});
      } else {
        throw new Error(data.error || 'Errore sconosciuto');
      }
    } catch (error) {
      console.error('Errore nel caricamento appuntamenti:', error);
      toast({
        title: 'Errore',
        description: 'Impossibile caricare gli appuntamenti.',
        variant: 'destructive',
      });
    } finally {
      setIsLoading(false);
    }
  };

  // Funzione per caricare lo storico delle notifiche WhatsApp
  const fetchWhatsAppHistory = async () => {
    setHistoryLoading(true);
    try {
      const response = await fetch('/api/notifications/history');
      if (response.ok) {
        const data = await response.json();
        setSmsHistory(data.notifications || []);
      } else {
        throw new Error('Errore nel caricamento dello storico');
      }
    } catch (error) {
      console.error('Errore nel caricamento storico WhatsApp:', error);
    } finally {
      setHistoryLoading(false);
    }
  };

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
      const response = await fetch('/api/direct-phone/register-direct', {
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
          description: 'Ti abbiamo inviato un codice di verifica',
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
  
  // Verifica il codice di verifica
  const handleVerifyCode = async () => {
    if (!verificationCode.trim()) {
      toast({
        title: 'Errore',
        description: 'Inserisci il codice di verifica ricevuto',
        variant: 'destructive',
      });
      return;
    }
    
    setIsVerifying(true);
    
    try {
      const response = await fetch('/api/direct-phone/verify-direct', {
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
        
        // Carica gli appuntamenti dopo la verifica
        fetchUpcomingAppointments();
        fetchWhatsAppHistory();
        
        // Passa alla tab di invio messaggi
        setActiveTab("send-notifications");
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
      const response = await fetch('/api/direct-phone/disconnect-direct', {
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
        
        // Torna alla tab di configurazione
        setActiveTab("device-setup");
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
  
  // Genera e apre un link WhatsApp per inviare un messaggio di test
  const handleSendTestSms = async () => {
    try {
      const response = await fetch('/api/direct-phone/send-test-direct', {
        method: 'POST',
      });
      
      const data = await response.json();
      
      if (data.success && data.whatsappLink) {
        // Apri il link WhatsApp in una nuova finestra
        window.open(data.whatsappLink, '_blank', 'noopener,noreferrer');
        
        toast({
          title: 'Link WhatsApp generato',
          description: 'Abbiamo aperto WhatsApp con un messaggio di test',
        });
      } else {
        throw new Error(data.error || 'Errore sconosciuto durante la generazione del link WhatsApp');
      }
    } catch (error) {
      console.error('Errore nella generazione del link WhatsApp', error);
      
      toast({
        title: 'Errore',
        description: 'Impossibile generare il link WhatsApp. Riprova.',
        variant: 'destructive',
      });
    }
  };
  
  // Toggle selezione di un appuntamento
  const toggleAppointmentSelection = (id: number) => {
    setSelectedAppointments(prev => ({
      ...prev,
      [id]: !prev[id]
    }));
  };
  
  // Toggle selezione di tutti gli appuntamenti
  const toggleAllAppointments = (selected: boolean) => {
    const updatedSelection: Record<number, boolean> = {};
    appointments.forEach(appointment => {
      updatedSelection[appointment.id] = selected;
    });
    setSelectedAppointments(updatedSelection);
  };
  
  // Stato per i link WhatsApp generati
  const [generatedLinks, setGeneratedLinks] = useState<{id: number, name: string, link: string}[]>([]);
  const [showGeneratedLinks, setShowGeneratedLinks] = useState(false);
  const [currentLinkIndex, setCurrentLinkIndex] = useState(0);

  // Invia messaggi agli appuntamenti selezionati
  const handleSendNotifications = async () => {
    const selectedIds = Object.entries(selectedAppointments)
      .filter(([_, isSelected]) => isSelected)
      .map(([id]) => parseInt(id));
    
    if (selectedIds.length === 0) {
      toast({
        title: 'Nessun appuntamento selezionato',
        description: 'Seleziona almeno un appuntamento per inviare le notifiche',
        variant: 'destructive',
      });
      return;
    }
    
    setIsSending(true);
    
    try {
      const response = await fetch('/api/notifications/send-batch', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          appointmentIds: selectedIds,
          customMessage: customMessage.trim() || undefined
        }),
      });
      
      const data = await response.json();
      
      if (data.success) {
        const successCount = data.results.filter((r: any) => r.success).length;
        
        // Estrai i link WhatsApp dai risultati
        const links = data.results
          .filter((r: any) => r.success && r.whatsappLink)
          .map((r: any) => ({
            id: r.appointmentId,
            name: r.clientName || 'Cliente',
            link: r.whatsappLink
          }));
        
        // Salva i link generati nello stato
        setGeneratedLinks(links);
        setShowGeneratedLinks(true);
        setCurrentLinkIndex(0);
        
        toast({
          title: 'WhatsApp generati',
          description: `${successCount} link WhatsApp generati con successo. Puoi aprirli ora in sequenza.`,
          variant: 'default'
        });
        
        // Aggiorna la lista dopo l'invio
        fetchUpcomingAppointments();
        // Aggiorna lo storico delle notifiche
        fetchWhatsAppHistory();
        
        // Passa automaticamente alla tab cronologia
        setActiveTab("history");
      } else {
        throw new Error(data.error || 'Errore nell\'invio delle notifiche');
      }
    } catch (error) {
      console.error('Errore nell\'invio delle notifiche', error);
      
      toast({
        title: 'Errore',
        description: error instanceof Error ? error.message : 'Impossibile inviare le notifiche. Riprova.',
        variant: 'destructive',
      });
    } finally {
      setIsSending(false);
    }
  };
  
  // Aprire il link WhatsApp attuale
  const openCurrentLink = () => {
    if (generatedLinks.length > 0 && currentLinkIndex < generatedLinks.length) {
      window.open(generatedLinks[currentLinkIndex].link, '_blank', 'noopener,noreferrer');
    }
  };
  
  // Passa al link successivo
  const goToNextLink = () => {
    if (currentLinkIndex < generatedLinks.length - 1) {
      setCurrentLinkIndex(currentLinkIndex + 1);
    } else {
      // Finiti tutti i link
      toast({
        title: 'Completato',
        description: 'Hai inviato tutti i messaggi WhatsApp!',
        variant: 'default'
      });
      
      // Reset delle selezioni e del messaggio personalizzato
      setSelectedAppointments({});
      setCustomMessage('');
      setShowGeneratedLinks(false);
      // Passa automaticamente alla tab cronologia
      setActiveTab("history");
    }
  };
  
  // Chiudi la lista dei link generati e passa alla tab cronologia
  const closeGeneratedLinks = () => {
    setShowGeneratedLinks(false);
    // Reset delle selezioni e del messaggio personalizzato
    setSelectedAppointments({});
    setCustomMessage('');
    // Passa alla tab cronologia dopo aver generato i link
    setActiveTab("history");
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
  
  // Conta il numero di appuntamenti selezionati
  const countSelectedAppointments = () => {
    return Object.values(selectedAppointments).filter(isSelected => isSelected).length;
  };
  
  // Formatta la data
  const formatDate = (dateString: string) => {
    return format(parseISO(dateString), 'EEEE d MMMM yyyy', { locale: it });
  };

  // Rendering della pagina principale
  return (
    <div className="container mx-auto px-4 py-8 min-h-screen flex flex-col">
      <header className="mb-8 text-center">
        <h1 className="text-3xl font-bold mb-2">
          {t('Centro Notifiche WhatsApp')}
        </h1>
        <p className="text-muted-foreground max-w-2xl mx-auto">
          {t('Configura il tuo telefono e invia messaggi WhatsApp ai tuoi clienti')}
        </p>
      </header>
      
      <Tabs defaultValue={activeTab} onValueChange={setActiveTab} className="flex-1">
        <TabsList className="grid w-full grid-cols-3 mb-8">
          <TabsTrigger value="device-setup" className="py-3">
            <Phone className="h-4 w-4 mr-2" />
            {t('Configurazione Telefono')}
          </TabsTrigger>
          <TabsTrigger 
            value="send-notifications"
            disabled={deviceStatus !== DeviceStatus.VERIFIED && deviceStatus !== DeviceStatus.CONNECTED}
            className="py-3"
          >
            <MessageSquare className="h-4 w-4 mr-2" />
            {t('Invia Notifiche')}
          </TabsTrigger>
          <TabsTrigger value="history" 
            disabled={deviceStatus !== DeviceStatus.VERIFIED && deviceStatus !== DeviceStatus.CONNECTED}
            className="py-3"
          >
            <Clock className="h-4 w-4 mr-2" />
            {t('Cronologia Notifiche')}
          </TabsTrigger>
        </TabsList>
        
        <TabsContent value="device-setup" className="flex-1">
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
                          {t('Abbiamo inviato un codice di verifica al numero')} <strong>{savedPhoneNumber}</strong>
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
                          {t('Invia WhatsApp di test')}
                        </Button>
                        
                        <Button
                          variant="outline"
                          className="border-red-300 text-red-600 hover:bg-red-50"
                          onClick={handleDisconnect}
                        >
                          {t('Rimuovi questo numero')}
                        </Button>
                        
                        {(deviceStatus === DeviceStatus.VERIFIED || deviceStatus === DeviceStatus.CONNECTED) && (
                          <Button
                            className="w-full mt-4"
                            onClick={() => setActiveTab("send-notifications")}
                          >
                            <MessageSquare className="h-4 w-4 mr-2" />
                            {t('Vai alla pagina di invio notifiche')}
                          </Button>
                        )}
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
                              {t('Riceverai un codice di verifica da inserire per confermare il tuo numero')}
                            </p>
                          </div>
                        </div>
                        
                        <div className="flex gap-4">
                          <div className="flex-shrink-0 h-8 w-8 rounded-full bg-primary/10 text-primary flex items-center justify-center font-bold">3</div>
                          <div>
                            <h4 className="text-lg font-medium">{t('Inizia a inviare notifiche')}</h4>
                            <p className="text-muted-foreground mt-1">
                              {t('Nella scheda "Invia Notifiche" potrai iniziare a inviare messaggi WhatsApp ai tuoi clienti')}
                            </p>
                          </div>
                        </div>
                      </div>
                    </div>
                    
                    <div className="p-4 bg-green-50 rounded-lg border border-green-200">
                      <h4 className="text-lg font-medium text-green-800 flex items-center">
                        <CheckCircle className="h-5 w-5 mr-2 text-green-600" />
                        {t('WhatsApp consigliato:')}
                      </h4>
                      
                      <ul className="mt-2 space-y-2 list-disc pl-5 text-green-700">
                        <li>
                          {t('Questo numero sarà utilizzato principalmente per l\'invio di notifiche via WhatsApp')}
                        </li>
                        <li>
                          {t('I messaggi WhatsApp sono gratuiti e più affidabili degli SMS')}
                        </li>
                        <li>
                          {t('Assicurati che il numero abbia WhatsApp installato e attivo')}
                        </li>
                        <li>
                          {t('Inserisci il prefisso internazionale corretto (es. +39 per l\'Italia)')}
                        </li>
                      </ul>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>
          </div>
        </TabsContent>
      
        <TabsContent value="send-notifications" className="flex-1">
          <Card className="shadow-md mb-8">
            <CardHeader className="bg-slate-50">
              <CardTitle>
                <div className="flex items-center">
                  <MessageSquare className="mr-3 h-6 w-6 text-primary" />
                  {t('Notifiche da inviare')}
                </div>
              </CardTitle>
              <CardDescription>
                {t('Seleziona gli appuntamenti e invia notifiche WhatsApp ai tuoi clienti')}
              </CardDescription>
            </CardHeader>
            
            <CardContent className="p-6">
              {isLoading ? (
                <div className="py-4 text-center">
                  <RefreshCw className="h-8 w-8 animate-spin mx-auto mb-2 text-primary" />
                  <p className="text-muted-foreground">{t('Caricamento appuntamenti...')}</p>
                </div>
              ) : appointments.length === 0 ? (
                <div className="text-center py-8">
                  <AlertCircle className="h-12 w-12 mx-auto mb-4 text-muted-foreground" />
                  <h3 className="text-lg font-medium mb-2">{t('Nessun appuntamento trovato')}</h3>
                  <p className="text-muted-foreground max-w-md mx-auto mb-4">
                    {t('Non ci sono appuntamenti imminenti che necessitano di notifiche')}
                  </p>
                  <Button
                    variant="outline"
                    onClick={fetchUpcomingAppointments}
                    className="mx-auto"
                  >
                    <RefreshCw className="h-4 w-4 mr-2" />
                    {t('Ricarica appuntamenti')}
                  </Button>
                </div>
              ) : (
                <div className="space-y-6">
                  <div className="flex justify-between items-center mb-4">
                    <div className="flex items-center gap-3">
                      <Checkbox 
                        id="select-all"
                        checked={appointments.length > 0 && Object.keys(selectedAppointments).length === appointments.length && Object.values(selectedAppointments).every(Boolean)}
                        onCheckedChange={(checked) => toggleAllAppointments(!!checked)}
                      />
                      <label
                        htmlFor="select-all"
                        className="text-sm font-medium cursor-pointer"
                      >
                        {t('Seleziona tutti')}
                      </label>
                    </div>
                    
                    <div>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={fetchUpcomingAppointments}
                        className="ml-auto"
                      >
                        <RefreshCw className="h-4 w-4 mr-2" />
                        {t('Ricarica')}
                      </Button>
                    </div>
                  </div>
                  
                  <div className="space-y-4">
                    {Object.entries(groupedAppointments).map(([date, dateAppointments]) => (
                      <Card key={date} className="overflow-hidden">
                        <CardHeader className="p-4 bg-slate-50">
                          <CardTitle className="text-base">
                            <Calendar className="h-4 w-4 inline-block mr-2" />
                            <span className="capitalize">{formatDate(date)}</span>
                            <Badge className="ml-2" variant="outline">
                              {dateAppointments.length} appuntamenti
                            </Badge>
                          </CardTitle>
                        </CardHeader>
                        
                        <Table>
                          <TableHeader>
                            <TableRow>
                              <TableHead className="w-12"></TableHead>
                              <TableHead>{t('Cliente')}</TableHead>
                              <TableHead>{t('Servizio')}</TableHead>
                              <TableHead>{t('Orario')}</TableHead>
                              <TableHead>{t('Stato')}</TableHead>
                            </TableRow>
                          </TableHeader>
                          <TableBody>
                            {dateAppointments.map((appointment) => (
                              <TableRow key={appointment.id}>
                                <TableCell className="p-2">
                                  <Checkbox
                                    id={`select-${appointment.id}`}
                                    checked={selectedAppointments[appointment.id] || false}
                                    onCheckedChange={() => toggleAppointmentSelection(appointment.id)}
                                  />
                                </TableCell>
                                <TableCell>
                                  <div className="flex items-center gap-2">
                                    <UserCircle className="h-5 w-5 text-muted-foreground" />
                                    <div>
                                      <div className="font-medium">{appointment.client?.firstName} {appointment.client?.lastName}</div>
                                      <div className="text-xs text-muted-foreground">{appointment.client?.phone}</div>
                                    </div>
                                  </div>
                                </TableCell>
                                <TableCell>
                                  {appointment.service?.name}
                                </TableCell>
                                <TableCell className="whitespace-nowrap">
                                  {appointment.startTime.substring(0, 5)}
                                </TableCell>
                                <TableCell>
                                  <Badge variant={appointment.reminderStatus?.includes('whatsapp_generated') ? 'secondary' : 'default'}>
                                    {appointment.reminderStatus?.includes('whatsapp_generated') ? t('WhatsApp inviato') : t('Da inviare')}
                                  </Badge>
                                </TableCell>
                              </TableRow>
                            ))}
                          </TableBody>
                        </Table>
                      </Card>
                    ))}
                  </div>
                </div>
              )}
              
              {appointments.length > 0 && (
                <div className="mt-8 space-y-4 border-t pt-6">
                  <div className="space-y-2">
                    <Label htmlFor="custom-message">{t('Messaggio personalizzato (opzionale)')}</Label>
                    <Textarea
                      id="custom-message"
                      placeholder={t('Aggiungi un messaggio personalizzato al promemoria...')}
                      value={customMessage}
                      onChange={(e) => setCustomMessage(e.target.value)}
                      rows={3}
                    />
                    <p className="text-xs text-muted-foreground">
                      {t('Questo messaggio verrà aggiunto al template standard del promemoria')}
                    </p>
                  </div>
                  
                  <div className="flex flex-col xs:flex-row gap-4 justify-between items-center">
                    <div className="text-sm">
                      <span className="font-medium">{countSelectedAppointments()}</span> {t('appuntamenti selezionati')}
                    </div>
                    
                    <Button
                      className="w-full xs:w-auto"
                      disabled={countSelectedAppointments() === 0 || isSending}
                      onClick={handleSendNotifications}
                    >
                      {isSending ? (
                        <>
                          <RefreshCw className="h-4 w-4 mr-2 animate-spin" />
                          {t('Invio in corso...')}
                        </>
                      ) : (
                        <>
                          <Send className="h-4 w-4 mr-2" />
                          {t('Genera notifiche WhatsApp')}
                        </>
                      )}
                    </Button>
                  </div>
                </div>
              )}
            </CardContent>
          </Card>
          
          <Alert className="mb-6">
            <AlertCircle className="h-4 w-4" />
            <AlertTitle>{t('Importante')}</AlertTitle>
            <AlertDescription>
              {t('I link WhatsApp devono essere aperti manualmente e i messaggi inviati direttamente dall\'app WhatsApp sul tuo telefono.')}
            </AlertDescription>
          </Alert>
          
          {savedPhoneNumber && (
            <Card className="shadow-md mb-6">
              <CardHeader className="bg-slate-50">
                <CardTitle className="flex items-center text-base font-medium">
                  <Smartphone className="h-5 w-5 mr-2 text-primary" />
                  {t('Telefono configurato')}
                </CardTitle>
              </CardHeader>
              <CardContent className="p-4">
                <div className="flex justify-between items-center">
                  <div>
                    <span className="text-muted-foreground mr-2">{t('Numero:')} </span>
                    <span className="font-medium">{savedPhoneNumber}</span>
                  </div>
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={handleSendTestSms}
                  >
                    <Send className="h-4 w-4 mr-2" />
                    {t('WhatsApp di test')}
                  </Button>
                </div>
              </CardContent>
            </Card>
          )}
        </TabsContent>
        
        <TabsContent value="history" className="flex-1">
          <Card className="shadow-md mb-6">
            <CardHeader className="bg-slate-50">
              <CardTitle className="flex items-center">
                <Clock className="mr-3 h-6 w-6 text-primary" />
                {t('Cronologia notifiche inviate')}
              </CardTitle>
              <CardDescription>
                {t('Visualizza le ultime notifiche WhatsApp generate')}
              </CardDescription>
            </CardHeader>
            
            <CardContent className="p-4">
              {historyLoading ? (
                <div className="py-8 text-center">
                  <RefreshCw className="h-8 w-8 animate-spin mx-auto mb-2 text-primary" />
                  <p className="text-muted-foreground">{t('Caricamento cronologia...')}</p>
                </div>
              ) : smsHistory.length === 0 ? (
                <div className="text-center py-8">
                  <Clock className="h-12 w-12 mx-auto mb-4 text-muted-foreground" />
                  <h3 className="text-lg font-medium mb-2">{t('Nessuna notifica inviata')}</h3>
                  <p className="text-muted-foreground max-w-md mx-auto mb-4">
                    {t('Non ci sono notifiche nel registro storico')}
                  </p>
                </div>
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>{t('Data e ora')}</TableHead>
                      <TableHead>{t('Cliente')}</TableHead>
                      <TableHead>{t('Messaggio')}</TableHead>
                      <TableHead className="text-right">{t('Apri')}</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {smsHistory.map((notification) => {
                      // Estrai il link WhatsApp dal messaggio se presente
                      const match = notification.message.match(/\[Apri WhatsApp\]\((https:\/\/wa\.me\/[^)]+)\)/);
                      const whatsappLink = match ? match[1] : null;
                      
                      return (
                        <TableRow 
                          key={notification.id}
                          className={notification.status === 'sent' || whatsappLink ? 'bg-red-100' : ''}
                        >
                          <TableCell className="whitespace-nowrap">
                            {notification.sent_at ? format(new Date(notification.sent_at), 'dd/MM/yyyy HH:mm') : 'N/D'}
                          </TableCell>
                          <TableCell className="font-medium">
                            {notification.client?.firstName} {notification.client?.lastName}
                          </TableCell>
                          <TableCell>
                            <div className="max-w-md truncate" title={notification.message.replace(/\[Apri WhatsApp\]\(https:\/\/wa\.me\/[^)]+\)/, '')}>
                              {notification.message.replace(/\[Apri WhatsApp\]\(https:\/\/wa\.me\/[^)]+\)/, '')}
                            </div>
                          </TableCell>
                          <TableCell className="text-right">
                            {whatsappLink && (
                              <Button
                                size="sm"
                                variant="outline"
                                className="h-8 px-2"
                                onClick={() => window.open(whatsappLink, '_blank', 'noopener,noreferrer')}
                              >
                                <ExternalLink className="h-4 w-4" />
                              </Button>
                            )}
                          </TableCell>
                        </TableRow>
                      );
                    })}
                  </TableBody>
                </Table>
              )}
            </CardContent>
          </Card>
          
          <div className="flex justify-end">
            <Button
              variant="outline"
              onClick={fetchWhatsAppHistory}
              className="ml-auto"
            >
              <RefreshCw className="h-4 w-4 mr-2" />
              {t('Aggiorna cronologia')}
            </Button>
          </div>
        </TabsContent>
      </Tabs>
      
      {/* Modal per i link generati - versione di tipo popup che mantiene visibili gli elementi sottostanti */}
      {showGeneratedLinks && generatedLinks.length > 0 && (
        <div className="fixed bottom-0 right-0 z-50 p-4 pointer-events-none">
          <div className="bg-white rounded-xl shadow-xl w-full max-w-md overflow-hidden pointer-events-auto border-2 border-primary">
            <div className="p-4 bg-primary text-white flex justify-between items-center">
              <div>
                <h3 className="text-lg font-bold">
                  {t('Link WhatsApp')}
                </h3>
                <p className="text-sm">{t('Contatto')} {currentLinkIndex + 1} di {generatedLinks.length}</p>
              </div>
              <Badge variant="secondary">
                {Math.round((currentLinkIndex + 1) / generatedLinks.length * 100)}%
              </Badge>
            </div>
            
            <div className="p-4">
              <div className="w-full bg-gray-200 rounded-full h-2 mb-4">
                <div 
                  className="bg-primary h-2 rounded-full" 
                  style={{ width: `${((currentLinkIndex + 1) / generatedLinks.length) * 100}%` }}
                />
              </div>
              
              <div className="border rounded-lg bg-white p-3 mb-3">
                <p className="font-bold text-base">
                  {generatedLinks[currentLinkIndex]?.name}
                </p>
              </div>
              
              <div className="flex gap-2">
                <Button
                  onClick={openCurrentLink}
                  size="sm"
                  className="flex-1"
                >
                  <Send className="h-4 w-4 mr-1" />
                  {t('Apri WhatsApp')}
                </Button>
                
                <Button
                  onClick={goToNextLink}
                  variant="outline"
                  size="sm"
                  className="flex-1"
                >
                  {currentLinkIndex < generatedLinks.length - 1 ? t('Prossimo') : t('Termina')}
                </Button>
                
                <Button
                  onClick={closeGeneratedLinks}
                  variant="ghost"
                  size="sm"
                  className="h-8 w-8 p-0"
                >
                  <X className="h-4 w-4" />
                </Button>
              </div>
            </div>
          </div>
        </div>
      )}
    
      <FooterOnly />
    </div>
  );
};

export default WhatsAppCenterPage;