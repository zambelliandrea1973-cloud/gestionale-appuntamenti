import React, { useState, useEffect } from 'react';
import { useLocation } from 'wouter';
import { useQuery, useMutation } from '@tanstack/react-query';
import { apiRequest, queryClient } from '@/lib/queryClient';
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
  CheckSquare,
  AlertCircle, 
  UserCircle, 
  Calendar, 
  Clock, 
  Smartphone, 
  X, 
  Phone,
  ExternalLink,
  Mail,
  Settings,
  QrCode
} from 'lucide-react';

// Stati del sistema WhatsApp semplificato
enum WhatsAppStatus {
  NOT_CONFIGURED = 'not_configured',
  CONFIGURED = 'configured'
}

// Informazioni sul sistema WhatsApp
interface WhatsAppInfo {
  status: WhatsAppStatus;
  phone: string;
  email: string;
  whatsappOptIn: boolean;
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
  const [, setLocation] = useLocation();
  
  // Stati per il sistema WhatsApp semplificato
  const [whatsappStatus, setWhatsappStatus] = useState<WhatsAppStatus>(WhatsAppStatus.NOT_CONFIGURED);
  const [phoneNumber, setPhoneNumber] = useState<string>('');
  const [email, setEmail] = useState<string>('');
  const [whatsappOptIn, setWhatsappOptIn] = useState<boolean>(false);
  const [savedSettings, setSavedSettings] = useState<WhatsAppInfo | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  // isVerifying stato rimosso - faceva parte del vecchio sistema SMS
  const [lastUpdated, setLastUpdated] = useState<Date | null>(null);
  const [configuredEmail, setConfiguredEmail] = useState<string>('');

  
  // Stati per gli appuntamenti e le notifiche
  const [appointments, setAppointments] = useState<Appointment[]>([]);
  const [groupedAppointments, setGroupedAppointments] = useState<Record<string, Appointment[]>>({});
  const [selectedAppointments, setSelectedAppointments] = useState<Record<number, boolean>>({});
  const [customMessage, setCustomMessage] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [isSending, setIsSending] = useState(false);
  // La sezione cronologia è stata rimossa
  
  // Tab attivo - mostriamo direttamente "Invia notifiche" come tab di default
  const [activeTab, setActiveTab] = useState("send-notifications");

  // Query per caricare ContactSettings con React Query
  const { data: contactSettingsData, isLoading: isLoadingSettings, refetch: refetchSettings } = useQuery({
    queryKey: ['/api/contact-settings'],
    staleTime: 0,
    cacheTime: 0
  });

  // Mutation per salvare ContactSettings 
  const updateContactSettingsMutation = useMutation({
    mutationFn: (data: { phone?: string; email?: string; whatsappOptIn?: boolean }) => 
      apiRequest('/api/contact-settings', {
        method: 'POST',
        body: JSON.stringify(data)
      }),
    onSuccess: () => {
      toast({
        title: t('✅ Configurazione salvata!'),
        description: t('Le impostazioni del telefono sono state salvate con successo'),
      });
      refetchSettings();
      queryClient.invalidateQueries({ queryKey: ['/api/contact-settings'] });
    },
    onError: () => {
      toast({
        title: t('❌ Errore nel salvataggio'),
        description: t('Si è verificato un errore durante il salvataggio delle impostazioni'),
        variant: 'destructive'
      });
    }
  });

  // Handler per salvare le impostazioni
  const handleSaveContactSettings = () => {
    updateContactSettingsMutation.mutate({
      phone: phoneNumber.trim(),
      email: email.trim(),
      whatsappOptIn: whatsappOptIn
    });
  };

  // Carica lo stato iniziale del dispositivo telefonico e gli appuntamenti
  useEffect(() => {
    const fetchInitialData = async () => {
      try {
        // Carica le impostazioni di contatto
        const response = await fetch('/api/contact-settings');
        const data = await response.json();
        
        if (data.success && data.settings) {
          setSavedSettings(data.settings);
          setWhatsappStatus(data.settings.phone ? WhatsAppStatus.CONFIGURED : WhatsAppStatus.NOT_CONFIGURED);
          setLastUpdated(new Date(data.settings.updatedAt || Date.now()));
          
          // Se il telefono è configurato, carica gli appuntamenti
          if (data.settings.phone) {
            fetchUpcomingAppointments();
          } else if (activeTab === "send-notifications") {
            // Se siamo nella tab di invio ma il telefono non è configurato, mostra un messaggio
            toast({
              title: 'Telefono non configurato',
              description: 'È necessario configurare il telefono prima di inviare notifiche',
              variant: 'destructive',
            });
            setActiveTab("device-setup");
          }
        }

        // Carica anche l'email configurata
        try {
          const emailResponse = await fetch('/api/email-calendar-settings');
          const emailData = await emailResponse.json();
          console.log('📧 Email configurata caricata:', emailData.emailAddress);
          if (emailData.emailAddress) {
            setConfiguredEmail(emailData.emailAddress);
          }
        } catch (emailError) {
          console.error('Errore caricamento email configurata:', emailError);
          // Fallback alla tua email principale
          setConfiguredEmail('zambelli.andrea.1973@gmail.com');
        }
      } catch (error) {
        console.error('Errore nel caricamento dello stato del dispositivo', error);
      }
    };
    
    fetchInitialData();
    
    // Carica sempre gli appuntamenti quando la tab è "send-notifications"
    if (activeTab === "send-notifications") {
      fetchUpcomingAppointments();
    }
  }, [activeTab]);

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

  // La funzione updateDeviceInfo è stata rimossa - sostituita da ContactSettings
  
  // Genera QR code per WhatsApp Web

  
  // La funzione handleVerifyCode è stata rimossa - il nuovo sistema ContactSettings non usa codici di verifica
  
  // La funzione handleDisconnect è stata rimossa - sostituita da reset delle ContactSettings
  
  // La funzione handleSendTestSms è stata rimossa - sostituita da nuova logica ContactSettings
  
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
  
  // Seleziona solo gli appuntamenti non ancora inviati (in verde)
  const selectOnlyUnsent = () => {
    const updatedSelection: Record<number, boolean> = {};
    appointments.forEach(appointment => {
      const isMessageSent = appointment.reminderStatus?.includes('whatsapp_generated');
      updatedSelection[appointment.id] = !isMessageSent; // seleziona solo i non inviati
    });
    setSelectedAppointments(updatedSelection);
  };
  
  // Stato per i link WhatsApp generati e il processo sequenziale
  const [generatedLinks, setGeneratedLinks] = useState<{id: number, name: string, link: string}[]>([]);
  const [showGeneratedLinks, setShowGeneratedLinks] = useState(false);
  const [currentLinkIndex, setCurrentLinkIndex] = useState(0);
  const [isSequenceRunning, setIsSequenceRunning] = useState(false);
  const [sequenceProgress, setSequenceProgress] = useState(0);
  const [sequenceTotal, setSequenceTotal] = useState(0);
  
  // Funzione per avviare l'invio sequenziale
  const startSequentialSend = async () => {
    // Raccogliamo tutti gli appuntamenti selezionati
    const selectedIds = Object.entries(selectedAppointments)
      .filter(([_, isSelected]) => isSelected)
      .map(([id]) => parseInt(id));
    
    if (selectedIds.length === 0) {
      toast({
        title: t('Nessun appuntamento selezionato'),
        description: t('Seleziona almeno un appuntamento per inviare notifiche'),
        variant: 'destructive',
      });
      return;
    }
    
    // Prepariamo la lista dei link da aprire in sequenza
    const links: {id: number, name: string, link: string}[] = [];
    setIsSending(true);
    
    try {
      // Prepariamo gli appuntamenti selezionati
      const selectedAppointmentsDetails = appointments.filter(app => selectedIds.includes(app.id));
      
      // Creiamo i link WhatsApp per ogni appuntamento selezionato
      for (const appointment of selectedAppointmentsDetails) {
        const phone = appointment.client?.phone?.replace(/[+\s]/g, '');
        if (!phone) continue;
        
        let messageText = `Gentile ${appointment.client?.firstName},\nLe ricordiamo il Suo appuntamento di ${appointment.service?.name} per ${format(new Date(appointment.date), 'dd/MM/yyyy')} alle ore ${appointment.startTime.substring(0, 5)}.`;
        
        // Aggiungiamo il messaggio personalizzato se presente
        if (customMessage && customMessage.trim() !== '') {
          messageText += `\n\n${customMessage.trim()}`;
        }
        
        const encodedMessage = encodeURIComponent(messageText);
        const link = `https://wa.me/${phone}?text=${encodedMessage}`;
        
        links.push({
          id: appointment.id,
          name: `${appointment.client?.firstName} ${appointment.client?.lastName}`,
          link: link
        });
      }
      
      // Inizializziamo il processo di invio sequenziale
      setGeneratedLinks(links);
      setCurrentLinkIndex(0);
      setShowGeneratedLinks(true);
      setIsSequenceRunning(true);
      setSequenceProgress(0);
      setSequenceTotal(links.length);
      
      // Avviamo il processo aprendo il primo link
      if (links.length > 0) {
        await processSequentialLink(links, 0);
      }
    } catch (error) {
      console.error('Errore nella generazione dei link WhatsApp', error);
      toast({
        title: t('Errore'),
        description: t('Impossibile generare i link WhatsApp. Riprova.'),
        variant: 'destructive'
      });
    } finally {
      setIsSending(false);
    }
  };
  
  // Funzione per processare un link nella sequenza
  const processSequentialLink = async (links: {id: number, name: string, link: string}[], index: number) => {
    if (index >= links.length) {
      // Abbiamo finito la sequenza
      setIsSequenceRunning(false);
      toast({
        title: t('Invio completato'),
        description: t('Tutti i messaggi sono stati inviati')
      });
      setShowGeneratedLinks(false);
      fetchUpcomingAppointments(); // Aggiorniamo la lista per mostrare i nuovi stati
      return;
    }
    
    const current = links[index];
    
    // Aggiorniamo lo stato dell'appuntamento (marca come inviato)
    try {
      const response = await fetch(`/api/notifications/mark-sent/${current.id}`, {
        method: 'POST',
      });
      
      if (response.ok) {
        // Aggiorniamo lo stato negli appuntamenti
        const updatedAppointments = [...appointments];
        const appIndex = updatedAppointments.findIndex(a => a.id === current.id);
        if (appIndex >= 0) {
          updatedAppointments[appIndex].reminderStatus = 'pending,whatsapp_generated';
        }
        setAppointments(updatedAppointments);
      }
    } catch (error) {
      console.error('Errore nell\'aggiornamento dello stato', error);
    }
    
    // Aggiorniamo l'indice corrente e lo stato di avanzamento
    setCurrentLinkIndex(index);
    setSequenceProgress(index + 1);
    
    // Apriamo il link WhatsApp
    const popup = window.open(current.link, '_blank', 'width=800,height=600,toolbar=0,menubar=0,location=0,status=1,scrollbars=1,resizable=1,left=50,top=50');
    
    // Attendiamo che l'utente chiuda il popup o proceda manualmente
    // Nota: non possiamo rilevare automaticamente quando il popup viene chiuso per restrizioni di sicurezza
  };
  
  // Funzione per passare al link successivo nella sequenza
  const goToNextSequentialLink = async () => {
    if (currentLinkIndex < generatedLinks.length - 1) {
      await processSequentialLink(generatedLinks, currentLinkIndex + 1);
    } else {
      // Abbiamo finito
      setIsSequenceRunning(false);
      setShowGeneratedLinks(false);
      toast({
        title: t('Completato'),
        description: t('Tutti i messaggi sono stati processati')
      });
      fetchUpcomingAppointments(); // Aggiorniamo la lista per mostrare i nuovi stati
    }
  };
  
  // Funzione per generare i link WhatsApp (vecchio metodo)
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
          
          // Aggiorniamo gli appuntamenti con lo stato aggiornato
          fetchUpcomingAppointments();
          
          // Apri automaticamente il primo link WhatsApp
          if (links.length > 0) {
            // Apri immediatamente il primo link in un popup
            window.open(links[0].link, '_blank', 'width=800,height=600,toolbar=0,menubar=0,location=0,status=1,scrollbars=1,resizable=1,left=50,top=50');
          }
          
          // Rimaniamo nella tab di invio notifiche dopo aver completato
          setActiveTab("send-notifications");
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
      window.open(generatedLinks[currentLinkIndex].link, '_blank', 'width=800,height=600,toolbar=0,menubar=0,location=0,status=1,scrollbars=1,resizable=1,left=50,top=50');
    }
  };
  
  // Funzione per passare al link successivo o chiudere la finestra
  const goToNextLink = () => {
    if (currentLinkIndex < generatedLinks.length - 1) {
      setCurrentLinkIndex(prev => prev + 1);
    } else {
      setShowGeneratedLinks(false);
      // Aggiorniamo gli appuntamenti con lo stato aggiornato
      fetchUpcomingAppointments();
    }
  };
  
  // Funzione per chiudere la finestra dei link generati
  const closeGeneratedLinks = () => {
    setShowGeneratedLinks(false);
  };
  
  // Funzione per ottenere il testo dello stato del dispositivo
  const getStatusText = (status: WhatsAppStatus): string => {
    switch (status) {
      case WhatsAppStatus.NOT_CONFIGURED:
        return t('Non configurato');
      case WhatsAppStatus.CONFIGURED:
        return t('Configurato');
      default:
        return t('Sconosciuto');
    }
  };
  
  // Funzione per ottenere il colore dello stato WhatsApp
  const getStatusColor = (status: WhatsAppStatus): string => {
    switch (status) {
      case WhatsAppStatus.NOT_CONFIGURED:
        return 'text-red-600';
      case WhatsAppStatus.CONFIGURED:
        return 'text-green-600';
      default:
        return 'text-slate-500';
    }
  };
  
  return (
    <div className="container mx-auto py-8 px-4 max-w-5xl">
      <div className="mb-6 text-center">
        <h1 className="text-3xl font-bold">
          {t('Centro Configurazione e Invio Notifiche')}
        </h1>
        <p className="text-muted-foreground mt-2 max-w-2xl mx-auto">
          {t('Gestisci le tue notifiche per i clienti attraverso WhatsApp ed Email')}
        </p>
      </div>
      
      <div className="grid gap-8 mb-8">
        <div className="bg-blue-50 border border-blue-200 rounded-lg p-6 text-center">
          <div className="mx-auto w-16 h-16 mb-4 rounded-full bg-blue-100 flex items-center justify-center">
            <Mail className="h-8 w-8 text-blue-600" />
          </div>
          <h3 className="text-xl font-medium text-blue-800 mb-3">
            {t('Configurazione Notifiche Email')}
          </h3>
          <p className="mb-4 text-blue-700 max-w-lg mx-auto">
            {t('Configura i modelli e le impostazioni per inviare promemoria automatici via email ai tuoi clienti')}
          </p>
          <Button 
            variant="default"
            size="lg"
            className="bg-blue-600 hover:bg-blue-700 flex items-center mx-auto"
            onClick={() => {
              // Reindirizza alla pagina impostazioni con tab email selezionato
              // Memorizza la tab da selezionare in localStorage
              localStorage.setItem('settings_active_tab', 'integrations');
              setLocation("/settings");
            }}
          >
            <Mail className="mr-2 h-5 w-5" />
            {t('Configura Email')}
          </Button>
        </div>
      </div>
      
      <div className="border-t border-b py-6 my-6">
        <h2 className="text-2xl font-bold text-center mb-6">
          {t('Configurazione e Utilizzo WhatsApp')}
        </h2>
      </div>
      
      <div className="flex justify-between items-center mb-6">
        <div>
          <h3 className="text-xl font-medium">
            {t('Sistema Notifiche WhatsApp')}
          </h3>
          <p className="text-muted-foreground">
            {t('Configurazione telefono e invio messaggi WhatsApp')}
          </p>
        </div>
        
        <div className="text-right">
          <div className="text-sm text-muted-foreground mb-1">
            {t('Stato telefono')}:
            <span className={`ml-2 font-medium ${getStatusColor(whatsappStatus)}`}>
              {getStatusText(whatsappStatus)}
            </span>
          </div>
          
          {savedSettings?.phone && (
            <div className="text-sm font-medium">
              {savedSettings.phone}
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
              {whatsappStatus === WhatsAppStatus.NOT_CONFIGURED && (
                <div className="space-y-6">
                  <Alert variant="default" className="bg-blue-50 border-blue-200">
                    <Settings className="h-4 w-4 text-blue-600" />
                    <AlertTitle className="text-blue-800">{t('Configura il tuo telefono')}</AlertTitle>
                    <AlertDescription className="text-blue-700">
                      {t('Inserisci il tuo numero di telefono per iniziare a inviare notifiche WhatsApp ai clienti')}
                    </AlertDescription>
                  </Alert>
                  
                  <div className="bg-white border-2 border-blue-200 rounded-lg p-6">
                    <div className="space-y-4 max-w-md mx-auto">
                      <div className="text-center mb-6">
                        <div className="mx-auto w-16 h-16 bg-blue-100 rounded-full flex items-center justify-center mb-3">
                          <Phone className="h-8 w-8 text-blue-600" />
                        </div>
                        <h3 className="font-medium text-gray-900 mb-2">{t('Configurazione telefono')}</h3>
                        <p className="text-sm text-gray-600">{t('Le tue informazioni di contatto per le notifiche')}</p>
                      </div>
                      
                      <div className="space-y-4">
                        <div>
                          <Label htmlFor="phone-input" className="text-sm font-medium">
                            {t('Numero di telefono')} *
                          </Label>
                          <Input
                            id="phone-input"
                            type="tel"
                            placeholder="+39 123 456 7890"
                            value={phoneNumber}
                            onChange={(e) => setPhoneNumber(e.target.value)}
                            className="mt-1"
                            data-testid="input-phone"
                          />
                          <p className="text-xs text-gray-500 mt-1">
                            {t('Inserisci il numero con il prefisso internazionale (es. +39 per Italia)')}
                          </p>
                        </div>
                        
                        <div>
                          <Label htmlFor="email-input" className="text-sm font-medium">
                            {t('Email')} ({t('opzionale')})
                          </Label>
                          <Input
                            id="email-input"
                            type="email"
                            placeholder="nome@esempio.com"
                            value={email}
                            onChange={(e) => setEmail(e.target.value)}
                            className="mt-1"
                            data-testid="input-email"
                          />
                        </div>
                        
                        <div className="flex items-center space-x-2">
                          <Checkbox
                            id="whatsapp-opt-in"
                            checked={whatsappOptIn}
                            onCheckedChange={(checked) => setWhatsappOptIn(!!checked)}
                            data-testid="checkbox-whatsapp-opt-in"
                          />
                          <Label htmlFor="whatsapp-opt-in" className="text-sm">
                            {t('Abilita notifiche WhatsApp')}
                          </Label>
                        </div>
                      </div>
                      
                      <Button 
                        onClick={handleSaveContactSettings}
                        disabled={!phoneNumber.trim() || updateContactSettingsMutation.isPending}
                        className="w-full bg-blue-600 hover:bg-blue-700 mt-6"
                        data-testid="button-save-settings"
                      >
                        {updateContactSettingsMutation.isPending ? (
                          <>
                            <RefreshCw className="h-4 w-4 mr-2 animate-spin" />
                            {t('Salvataggio...')}
                          </>
                        ) : (
                          <>
                            <CheckCircle className="h-4 w-4 mr-2" />
                            {t('Salva configurazione')}
                          </>
                        )}
                      </Button>
                    </div>
                  </div>
                  
                  <div className="bg-green-50 border border-green-200 rounded-lg p-4">
                    <div className="flex gap-3">
                      <MessageSquare className="h-5 w-5 text-green-600 flex-shrink-0 mt-0.5" />
                      <div className="text-sm">
                        <p className="font-medium text-green-800 mb-1">{t('Come funzionano le notifiche:')}</p>
                        <p className="text-green-700">
                          {t('Dopo aver salvato il telefono, potrai inviare notifiche WhatsApp ai clienti tramite link diretti che si aprono nella tua app WhatsApp.')}
                        </p>
                      </div>
                    </div>
                  </div>
                </div>
              )}
              
              {/* Vecchia sezione UI per verifica SMS rimossa - sostituita da ContactSettings */}

              
              {whatsappStatus === WhatsAppStatus.CONFIGURED && (
                <div className="space-y-4">
                  <Alert variant="default" className="bg-green-50 border-green-200">
                    <CheckCircle className="h-4 w-4 text-green-600" />
                    <AlertTitle>{t('Telefono configurato correttamente')}</AlertTitle>
                    <AlertDescription>
                      {t('WhatsApp è configurato e può essere usato per inviare notifiche ai clienti')}
                    </AlertDescription>
                  </Alert>
                  
                  <div className="grid gap-3">
                    <div className="flex justify-between items-center">
                      <p className="text-sm font-medium">
                        {t('Telefono')}:
                        <span className="text-green-600 ml-2">
                          {savedSettings?.phone || 'Non configurato'}
                        </span>
                      </p>
                      
                      <Button 
                        variant="outline" 
                        size="sm"
                        onClick={() => {
                          // Test WhatsApp link generation
                          const message = "Test messaggio dal sistema di gestione appuntamenti";
                          const phone = savedSettings?.phone || '';
                          const link = `https://wa.me/${phone.replace(/[^0-9]/g, '')}?text=${encodeURIComponent(message)}`;
                          window.open(link, '_blank');
                        }}
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
                      onClick={() => {
                        // Reset ContactSettings (da implementare)
                        toast({
                          title: t('Funzione da implementare'),
                          description: t('La rimozione telefono sarà implementata nel nuovo sistema ContactSettings')
                        });
                      }}
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
              {!savedSettings?.phone || whatsappStatus === WhatsAppStatus.NOT_CONFIGURED ? (
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
                                  <div className="flex flex-col gap-3">
                    <div className="flex justify-between items-center">
                      <div className="flex items-center gap-1">
                        <Button
                          size="sm"
                          variant="secondary"
                          onClick={selectOnlyUnsent}
                          className="bg-green-100 hover:bg-green-200 text-green-700 border-green-300"
                        >
                          <CheckSquare className="h-4 w-4 mr-1" />
                          {t('Seleziona solo non inviati')}
                        </Button>
                        
                        <div className="relative inline-block group">
                          <Button
                            size="sm"
                            variant="ghost"
                            className="h-8 w-8 p-0"
                          >
                            <AlertCircle className="h-4 w-4 text-muted-foreground" />
                            <span className="sr-only">{t('Informazioni')}</span>
                          </Button>
                          <div className="absolute z-50 invisible group-hover:visible opacity-0 group-hover:opacity-100 transition-opacity bottom-full left-1/2 transform -translate-x-1/2 mb-2 bg-white p-2 rounded shadow-lg border w-60 text-xs text-muted-foreground">
                            {t('Seleziona più appuntamenti e premi "Invia in sequenza" per inviarli uno dopo l\'altro')}
                          </div>
                        </div>
                      </div>
                      
                      <div className="flex items-center gap-1">
                        <Button
                          size="sm"
                          variant="default"
                          onClick={startSequentialSend}
                          disabled={isSending || Object.values(selectedAppointments).filter(Boolean).length === 0}
                          className="bg-blue-600 hover:bg-blue-700"
                        >
                          <Send className="h-4 w-4 mr-1" />
                          {isSending ? t('Invio in corso...') : t('Invia in sequenza')}
                        </Button>
                        
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={fetchUpcomingAppointments}
                          className="ml-1"
                        >
                          <RefreshCw className="h-4 w-4" />
                          <span className="sr-only">{t('Aggiorna lista')}</span>
                        </Button>
                      </div>
                    </div>
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
                                  let messageText = `Gentile ${appointment.client?.firstName},\nLe ricordiamo il Suo appuntamento di ${appointment.service?.name} per ${format(new Date(appointment.date), 'dd/MM/yyyy')} alle ore ${appointment.startTime.substring(0, 5)}.`;
                                  
                                  // Aggiungiamo il messaggio personalizzato se presente
                                  if (customMessage && customMessage.trim() !== '') {
                                    messageText += `\n\n${customMessage.trim()}`;
                                  }
                                  
                                  const encodedMessage = encodeURIComponent(messageText);
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
                                  
                                  // Poi apriamo WhatsApp in un popup
                                  window.open(generateWhatsAppLink(), '_blank', 'width=800,height=600,toolbar=0,menubar=0,location=0,status=1,scrollbars=1,resizable=1,left=50,top=50');
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
                                        variant={isMessageSent ? "secondary" : "outline"}
                                        size="sm"
                                        className={`h-8 px-3 ${isMessageSent ? 'bg-red-100 text-red-600 border-red-300 hover:bg-red-200' : ''}`}
                                        onClick={openWhatsApp}
                                      >
                                        {isMessageSent ? (
                                          <CheckCircle className="h-3 w-3 mr-1" />
                                        ) : (
                                          <Send className="h-3 w-3 mr-1" />
                                        )}
                                        {isMessageSent ? t('INVIATO') : t('Invia')}
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
                    
                    <div className="bg-muted/30 border border-muted rounded-md p-3 mb-2 text-sm flex gap-2">
                      <AlertCircle className="h-4 w-4 flex-shrink-0 mt-0.5" />
                      <p>
                        {t('Inserisci qui un messaggio aggiuntivo che verrà incluso nei messaggi WhatsApp per tutti i clienti selezionati sopra. Questo ti permette di personalizzare il contenuto del messaggio standard.')}
                      </p>
                    </div>
                    
                    <Textarea
                      id="custom-message"
                      placeholder={t('Inserisci un messaggio personalizzato che verrà aggiunto al testo standard...')}
                      maxLength={500}
                      value={customMessage}
                      onChange={(e) => setCustomMessage(e.target.value)}
                    />
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
                  {isSequenceRunning ? t('Invio in sequenza') : t('Link WhatsApp')}
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
                {isSequenceRunning && (
                  <p className="text-sm text-muted-foreground mt-1">
                    {t('WhatsApp si è aperto in una nuova finestra')}
                  </p>
                )}
              </div>
              
              {isSequenceRunning ? (
                <div className="flex flex-col gap-2">
                  <p className="text-sm text-center">{t('Dopo aver inviato il messaggio:')}</p>
                  <Button
                    onClick={goToNextSequentialLink}
                    size="lg"
                    className="flex-1"
                  >
                    <Send className="h-4 w-4 mr-1" />
                    {currentLinkIndex < generatedLinks.length - 1 
                      ? t('Vai al prossimo contatto') 
                      : t('Termina invio')}
                  </Button>
                </div>
              ) : (
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
              )}
            </div>
          </div>
        </div>
      )}
    
      <FooterOnly />
    </div>
  );
};

export default WhatsAppCenterPage;