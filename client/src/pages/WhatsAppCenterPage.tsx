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
  X, 
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
  // La sezione cronologia è stata rimossa
  
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

  // La funzione per caricare lo storico è stata rimossa

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
  
  // Funzione per generare i link WhatsApp
  const handleGenerateLinks = async () => {
    // Controlla se ci sono appuntamenti selezionati
    const selectedIds = Object.entries(selectedAppointments)
      .filter(([_, selected]) => selected)
      .map(([id]) => parseInt(id));
    
    if (selectedIds.length === 0) {
      toast({
        title: 'Nessun appuntamento selezionato',
        description: 'Seleziona almeno un appuntamento per generare i link WhatsApp',
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
          template: "default",
          customMessage: customMessage.trim() || null
        }),
      });
      
      const data = await response.json();
      
      if (data.success) {
        toast({
          title: 'Link generati',
          description: `Sono stati generati ${data.results.length} link WhatsApp`,
        });
        
        const links = data.results
          .filter((result: any) => result.success && result.whatsappLink)
          .map((result: any) => ({
            id: result.appointmentId,
            name: result.clientName,
            link: result.whatsappLink
          }));
        
        if (links.length > 0) {
          setGeneratedLinks(links);
          setShowGeneratedLinks(true);
          setCurrentLinkIndex(0);
          
          // Aggiorna la cronologia dopo aver generato i link
          fetchWhatsAppHistory();
          
          // Apri automaticamente il primo link WhatsApp
          if (links.length > 0) {
            // Apri immediatamente il primo link
            window.open(links[0].link, '_blank', 'noopener,noreferrer');
          }
          
          // Passa alla tab della cronologia dopo aver completato
          setActiveTab("history");
        }
      } else {
        throw new Error(data.error || 'Errore sconosciuto durante la generazione dei link');
      }
    } catch (error) {
      console.error('Errore nella generazione dei link', error);
      
      toast({
        title: 'Errore',
        description: 'Impossibile generare i link WhatsApp. Riprova.',
        variant: 'destructive',
      });
    } finally {
      setIsSending(false);
    }
  };
  
  // Funzione per aprire il link corrente
  const openCurrentLink = () => {
    if (generatedLinks.length > 0 && currentLinkIndex < generatedLinks.length) {
      window.open(generatedLinks[currentLinkIndex].link, '_blank', 'noopener,noreferrer');
    }
  };
  
  // Funzione per passare al link successivo o chiudere la finestra
  const goToNextLink = () => {
    if (currentLinkIndex < generatedLinks.length - 1) {
      setCurrentLinkIndex(prev => prev + 1);
    } else {
      setShowGeneratedLinks(false);
      // Aggiorna la cronologia dopo aver inviato tutti i messaggi
      fetchWhatsAppHistory();
    }
  };
  
  // Funzione per chiudere la finestra dei link generati
  const closeGeneratedLinks = () => {
    setShowGeneratedLinks(false);
  };
  
  // Funzione per ottenere il testo dello stato del dispositivo
  const getStatusText = (status: DeviceStatus): string => {
    switch (status) {
      case DeviceStatus.DISCONNECTED:
        return t('Non configurato');
      case DeviceStatus.CONNECTED:
        return t('Connesso');
      case DeviceStatus.VERIFICATION_PENDING:
        return t('Verifica necessaria');
      case DeviceStatus.VERIFIED:
        return t('Verificato');
      default:
        return t('Sconosciuto');
    }
  };
  
  // Funzione per ottenere il colore dello stato del dispositivo
  const getStatusColor = (status: DeviceStatus): string => {
    switch (status) {
      case DeviceStatus.DISCONNECTED:
        return 'text-red-600';
      case DeviceStatus.CONNECTED:
        return 'text-blue-600';
      case DeviceStatus.VERIFICATION_PENDING:
        return 'text-amber-600';
      case DeviceStatus.VERIFIED:
        return 'text-green-600';
      default:
        return 'text-slate-500';
    }
  };
  
  return (
    <div className="container mx-auto py-8 px-4 max-w-5xl">
      <div className="flex justify-between items-center mb-6">
        <div>
          <h1 className="text-2xl font-bold">
            {t('Centro WhatsApp unificato')}
          </h1>
          <p className="text-muted-foreground">
            {t('Configurazione telefono e notifiche WhatsApp')}
          </p>
        </div>
        
        <div className="text-right">
          <div className="text-sm text-muted-foreground mb-1">
            {t('Stato telefono')}:
            <span className={`ml-2 font-medium ${getStatusColor(deviceStatus)}`}>
              {getStatusText(deviceStatus)}
            </span>
          </div>
          
          {savedPhoneNumber && (
            <div className="text-sm font-medium">
              {savedPhoneNumber}
            </div>
          )}
          
          {lastUpdated && (
            <div className="text-xs text-muted-foreground">
              {t('Aggiornato')}: {format(lastUpdated, 'dd/MM/yyyy HH:mm')}
            </div>
          )}
        </div>
      </div>
      
      <Tabs
        value={activeTab}
        onValueChange={setActiveTab}
        className="space-y-6"
      >
        <TabsList className="grid grid-cols-2 w-full md:w-auto">
          <TabsTrigger value="device-setup">
            <Smartphone className="h-4 w-4 mr-2" />
            {t('Configurazione telefono')}
          </TabsTrigger>
          <TabsTrigger value="send-notifications">
            <Send className="h-4 w-4 mr-2" />
            {t('Invia notifiche')}
          </TabsTrigger>
        </TabsList>
        
        <TabsContent value="device-setup" className="space-y-6">
          <Card>
            <CardHeader className="bg-slate-50">
              <CardTitle className="flex items-center">
                <Smartphone className="mr-3 h-6 w-6 text-primary" />
                {t('Configurazione telefono WhatsApp')}
              </CardTitle>
              <CardDescription>
                {t('Configura il tuo dispositivo per inviare notifiche WhatsApp')}
              </CardDescription>
            </CardHeader>
            
            <CardContent className="space-y-6 pt-6">
              {deviceStatus === DeviceStatus.DISCONNECTED && (
                <div className="space-y-4">
                  <Alert variant="default" className="bg-muted/50">
                    <Smartphone className="h-4 w-4" />
                    <AlertTitle>{t('Nessun dispositivo configurato')}</AlertTitle>
                    <AlertDescription>
                      {t('Inserisci il numero di telefono che userai per inviare messaggi WhatsApp')}
                    </AlertDescription>
                  </Alert>
                  
                  <div className="grid gap-3">
                    <Label htmlFor="phone-number">{t('Numero di telefono WhatsApp')}</Label>
                    <Input
                      id="phone-number"
                      type="tel"
                      placeholder="+39 XXX XXXXXXX"
                      value={phoneNumber}
                      onChange={(e) => setPhoneNumber(e.target.value)}
                      disabled={isSubmitting}
                    />
                    <p className="text-sm text-muted-foreground">
                      {t('Inserisci il numero completo di prefisso internazionale (es. +39 per Italia)')}
                    </p>
                  </div>
                  
                  <div className="flex justify-end pt-2">
                    <Button 
                      onClick={handleRegisterPhone}
                      disabled={isSubmitting}
                    >
                      {isSubmitting ? (
                        <>
                          <RefreshCw className="h-4 w-4 mr-2 animate-spin" />
                          {t('Registrazione in corso...')}
                        </>
                      ) : (
                        <>
                          <Phone className="h-4 w-4 mr-2" />
                          {t('Registra numero')}
                        </>
                      )}
                    </Button>
                  </div>
                </div>
              )}
              
              {deviceStatus === DeviceStatus.VERIFICATION_PENDING && (
                <div className="space-y-4">
                  <Alert variant="default" className="bg-amber-50 border-amber-200">
                    <AlertCircle className="h-4 w-4 text-amber-600" />
                    <AlertTitle>{t('Verifica necessaria')}</AlertTitle>
                    <AlertDescription>
                      {t('Ti abbiamo inviato un codice di verifica tramite SMS al numero')} {savedPhoneNumber}.
                    </AlertDescription>
                  </Alert>
                  
                  <div className="grid gap-3">
                    <Label htmlFor="verification-code">{t('Codice di verifica')}</Label>
                    <Input
                      id="verification-code"
                      type="text"
                      placeholder="123456"
                      value={verificationCode}
                      onChange={(e) => setVerificationCode(e.target.value)}
                      disabled={isVerifying}
                    />
                    <p className="text-sm text-muted-foreground">
                      {t('Inserisci il codice a 6 cifre che hai ricevuto via SMS')}
                    </p>
                  </div>
                  
                  <div className="flex justify-end gap-3 pt-2">
                    <Button 
                      variant="outline"
                      onClick={handleDisconnect}
                      disabled={isVerifying}
                    >
                      {t('Annulla')}
                    </Button>
                    <Button 
                      onClick={handleVerifyCode}
                      disabled={isVerifying}
                    >
                      {isVerifying ? (
                        <>
                          <RefreshCw className="h-4 w-4 mr-2 animate-spin" />
                          {t('Verifica in corso...')}
                        </>
                      ) : (
                        <>
                          <CheckCircle className="h-4 w-4 mr-2" />
                          {t('Verifica codice')}
                        </>
                      )}
                    </Button>
                  </div>
                </div>
              )}
              
              {(deviceStatus === DeviceStatus.VERIFIED || deviceStatus === DeviceStatus.CONNECTED) && (
                <div className="space-y-4">
                  <Alert variant="default" className="bg-green-50 border-green-200">
                    <CheckCircle className="h-4 w-4 text-green-600" />
                    <AlertTitle>{t('Telefono configurato correttamente')}</AlertTitle>
                    <AlertDescription>
                      {t('Il numero')} {savedPhoneNumber} {t('è stato verificato e può essere usato per inviare notifiche WhatsApp')}
                    </AlertDescription>
                  </Alert>
                  
                  <div className="grid gap-3">
                    <div className="flex justify-between items-center">
                      <p className="text-sm font-medium">
                        {t('Telefono')}:
                        <span className="text-green-600 ml-2">
                          {savedPhoneNumber}
                        </span>
                      </p>
                      
                      <Button 
                        variant="outline" 
                        size="sm"
                        onClick={handleSendTestSms}
                      >
                        <Send className="h-4 w-4 mr-2" />
                        {t('Invia messaggio di test')}
                      </Button>
                    </div>
                    
                    <div className="rounded-md border p-4 bg-muted/30">
                      <div className="flex justify-between items-start">
                        <div>
                          <h3 className="font-medium">
                            {t('Come funziona')}
                          </h3>
                          <p className="text-sm text-muted-foreground mt-1">
                            {t('Segui questi passi per inviare notifiche WhatsApp ai tuoi clienti')}:
                          </p>
                        </div>
                        <div className="h-8 w-8 rounded-full bg-primary flex items-center justify-center">
                          <MessageSquare className="h-4 w-4 text-white" />
                        </div>
                      </div>
                      
                      <div className="space-y-2 mt-4">
                        <div className="flex gap-2">
                          <div className="h-5 w-5 rounded-full bg-primary flex items-center justify-center text-white text-xs font-medium">1</div>
                          <p className="text-sm">{t('Vai alla scheda "Invia notifiche" e seleziona gli appuntamenti')}</p>
                        </div>
                        <div className="flex gap-2">
                          <div className="h-5 w-5 rounded-full bg-primary flex items-center justify-center text-white text-xs font-medium">2</div>
                          <p className="text-sm">{t('Genera i link WhatsApp e segui le istruzioni sullo schermo')}</p>
                        </div>
                        <div className="flex gap-2">
                          <div className="h-5 w-5 rounded-full bg-primary flex items-center justify-center text-white text-xs font-medium">3</div>
                          <p className="text-sm">{t('I messaggi verranno inviati uno alla volta tramite la tua app WhatsApp')}</p>
                        </div>
                      </div>
                    </div>
                  </div>
                  
                  <div className="flex justify-end pt-2">
                    <Button 
                      variant="outline"
                      onClick={handleDisconnect}
                    >
                      <Phone className="h-4 w-4 mr-2" />
                      {t('Rimuovi telefono')}
                    </Button>
                  </div>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>
        
        <TabsContent value="send-notifications" className="space-y-6">
          <Card>
            <CardHeader className="bg-slate-50">
              <CardTitle className="flex items-center">
                <Send className="mr-3 h-6 w-6 text-primary" />
                {t('Invia notifiche WhatsApp')}
              </CardTitle>
              <CardDescription>
                {t('Seleziona gli appuntamenti e invia notifiche tramite WhatsApp')}
              </CardDescription>
            </CardHeader>
            
            <CardContent className="space-y-6 pt-6">
              {!savedPhoneNumber || deviceStatus === DeviceStatus.DISCONNECTED || deviceStatus === DeviceStatus.VERIFICATION_PENDING ? (
                <Alert variant="destructive">
                  <AlertCircle className="h-4 w-4" />
                  <AlertTitle>{t('Nessun telefono configurato')}</AlertTitle>
                  <AlertDescription>
                    {t('Devi prima configurare un telefono per poter inviare notifiche WhatsApp')}
                  </AlertDescription>
                </Alert>
              ) : isLoading ? (
                <div className="py-8 text-center">
                  <RefreshCw className="h-8 w-8 animate-spin mx-auto mb-2 text-primary" />
                  <p className="text-muted-foreground">{t('Caricamento appuntamenti in corso...')}</p>
                </div>
              ) : appointments.length === 0 ? (
                <div className="text-center py-8">
                  <Calendar className="h-12 w-12 mx-auto mb-4 text-muted-foreground" />
                  <h3 className="text-lg font-medium mb-2">{t('Nessun appuntamento trovato')}</h3>
                  <p className="text-muted-foreground max-w-md mx-auto mb-4">
                    {t('Non ci sono appuntamenti disponibili per i prossimi giorni')}
                  </p>
                  <Button 
                    onClick={fetchUpcomingAppointments}
                    variant="outline"
                  >
                    <RefreshCw className="h-4 w-4 mr-2" />
                    {t('Aggiorna')}
                  </Button>
                </div>
              ) : (
                <div className="space-y-6">
                  <div className="flex justify-between items-center">
                    <div className="flex items-center gap-2">
                      <Checkbox
                        id="select-all"
                        checked={appointments.length > 0 && appointments.every(app => selectedAppointments[app.id])}
                        onCheckedChange={(checked) => toggleAllAppointments(!!checked)}
                      />
                      <Label htmlFor="select-all" className="cursor-pointer">
                        {t('Seleziona tutti')} ({appointments.length})
                      </Label>
                    </div>
                    
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={fetchUpcomingAppointments}
                    >
                      <RefreshCw className="h-4 w-4 mr-2" />
                      {t('Aggiorna lista')}
                    </Button>
                  </div>
                  
                  <div className="rounded-md border">
                    <div className="p-4 border-b bg-muted/30">
                      <h3 className="font-medium">
                        {t('Appuntamenti prossimi')}
                      </h3>
                    </div>
                    
                    <div className="p-4 space-y-6">
                      {Object.entries(groupedAppointments).map(([date, apps]) => (
                        <div key={date} className="space-y-3">
                          <div className="flex items-center space-x-2">
                            <div className="h-2 w-2 rounded-full bg-primary" />
                            <h4 className="font-medium">{date}</h4>
                          </div>
                          
                          <div className="space-y-2 pl-4">
                            {apps.map(appointment => {
                                // Determiniamo se il messaggio è già stato inviato
                                const isMessageSent = appointment.reminderStatus?.includes('whatsapp_generated');
                                const bgColor = isMessageSent ? 'bg-red-50' : 'bg-green-50';
                                
                                // Creiamo un link WhatsApp diretto
                                const generateWhatsAppLink = () => {
                                  const phone = appointment.client?.phone?.replace(/[+\s]/g, '');
                                  const defaultMessage = `Gentile ${appointment.client?.firstName},\nLe ricordiamo il Suo appuntamento di ${appointment.service?.name} per ${format(new Date(appointment.date), 'dd/MM/yyyy')} alle ore ${appointment.startTime.substring(0, 5)}.`;
                                  const encodedMessage = encodeURIComponent(defaultMessage);
                                  return `https://wa.me/${phone}?text=${encodedMessage}`;
                                };
                                
                                const openWhatsApp = async () => {
                                  // Prima aggiorniamo lo stato dell'appuntamento (marca come inviato)
                                  try {
                                    const response = await fetch(`/api/notifications/mark-sent/${appointment.id}`, {
                                      method: 'POST',
                                    });
                                    
                                    if (response.ok) {
                                      // Aggiorna visivamente la riga subito senza richiedere ricaricamento
                                      appointment.reminderStatus = 'pending,whatsapp_generated';
                                      // Forza aggiornamento della UI
                                      setAppointments([...appointments]);
                                    }
                                  } catch (error) {
                                    console.error('Errore nell\'aggiornamento dello stato', error);
                                  }
                                  
                                  // Poi apriamo WhatsApp
                                  window.open(generateWhatsAppLink(), '_blank', 'noopener,noreferrer');
                                };
                                
                                return (
                                  <div 
                                    key={appointment.id} 
                                    className={`flex items-center gap-3 p-3 rounded-md border hover:bg-muted/30 transition-colors ${bgColor}`}
                                  >
                                    <Checkbox
                                      id={`appointment-${appointment.id}`}
                                      checked={!!selectedAppointments[appointment.id]}
                                      onCheckedChange={() => toggleAppointmentSelection(appointment.id)}
                                    />
                                    
                                    <div className="grid gap-0.5 flex-1">
                                      <Label 
                                        htmlFor={`appointment-${appointment.id}`}
                                        className="cursor-pointer font-medium"
                                      >
                                        {appointment.client?.firstName} {appointment.client?.lastName}
                                      </Label>
                                      <div className="text-sm text-muted-foreground flex gap-2 flex-wrap">
                                        <span>
                                          {appointment.service?.name}
                                        </span>
                                        <span className="text-muted-foreground/70">
                                          {appointment.startTime.substring(0, 5)} - {appointment.endTime.substring(0, 5)}
                                        </span>
                                      </div>
                                    </div>
                                    
                                    <div className="text-right flex items-center">
                                      <Button
                                        variant="outline"
                                        size="sm"
                                        className="h-8 px-3"
                                        onClick={openWhatsApp}
                                      >
                                        <Send className="h-3 w-3 mr-1" />
                                        {t('Invia')}
                                      </Button>
                                    </div>
                                  </div>
                                );
                            })}
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                  
                  <div className="space-y-3">
                    <div className="flex justify-between items-end">
                      <Label htmlFor="custom-message">
                        {t('Messaggio personalizzato')} <span className="text-muted-foreground">{t('(opzionale)')}</span>
                      </Label>
                      <span className="text-xs text-muted-foreground">
                        {customMessage.length}/500
                      </span>
                    </div>
                    
                    <Textarea
                      id="custom-message"
                      placeholder={t('Inserisci un messaggio personalizzato che verrà aggiunto al testo standard...')}
                      maxLength={500}
                      value={customMessage}
                      onChange={(e) => setCustomMessage(e.target.value)}
                    />
                  </div>
                  
                  <div className="pt-4 flex justify-end">
                    <Button
                      onClick={handleGenerateLinks}
                      disabled={
                        Object.values(selectedAppointments).filter(Boolean).length === 0 ||
                        isSending
                      }
                    >
                      {isSending ? (
                        <>
                          <RefreshCw className="h-4 w-4 mr-2 animate-spin" />
                          {t('Generazione in corso...')}
                        </>
                      ) : (
                        <>
                          <Send className="h-4 w-4 mr-2" />
                          {t('Genera link WhatsApp')}
                        </>
                      )}
                    </Button>
                  </div>
                </div>
              )}
            </CardContent>
          </Card>
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