// @ts-nocheck
import React, { useState, useEffect } from 'react';
import { useLocation } from 'wouter';
import { useQuery, useMutation } from '@tanstack/react-query';
import { apiRequest, queryClient } from '@/lib/queryClient';
import FooterOnly from '@/components/FooterOnly';
import { format, parseISO, addDays } from 'date-fns';
import { useTranslation } from 'react-i18next';
import { getDateLocale } from '@/lib/utils/date';
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
  QrCode,
  Sparkles,
  Save
} from 'lucide-react';
import { Link } from 'wouter';

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
  const { t, i18n } = useTranslation();
  const { toast } = useToast();
  const [, setLocation] = useLocation();
  
  // Stati per il sistema WhatsApp semplificato
  const [whatsappStatus, setWhatsappStatus] = useState<WhatsAppStatus>(WhatsAppStatus.NOT_CONFIGURED);
  const [phoneNumber, setPhoneNumber] = useState<string>('');
  const [email, setEmail] = useState<string>('');
  const [whatsappOptIn, setWhatsappOptIn] = useState<boolean>(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  // isVerifying stato rimosso - faceva parte del vecchio sistema SMS
  const [lastUpdated, setLastUpdated] = useState<Date | null>(null);
  
  // Stato per invio automatico completo
  const [isSendingAll, setIsSendingAll] = useState(false);
  const [configuredEmail, setConfiguredEmail] = useState<string>('');

  
  // Stati per gli appuntamenti e le notifiche
  const [appointments, setAppointments] = useState<Appointment[]>([]);
  const [groupedAppointments, setGroupedAppointments] = useState<Record<string, Appointment[]>>({});
  const [selectedAppointments, setSelectedAppointments] = useState<Record<number, boolean>>({});
  const [customMessage, setCustomMessage] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [isSending, setIsSending] = useState(false);
  // La sezione cronologia è stata rimossa
  
  // Stati per i messaggi marketing
  const [marketingMessages, setMarketingMessages] = useState<any[]>([]);
  const [isLoadingMarketing, setIsLoadingMarketing] = useState(false);
  
  // Tab attivo - mostriamo direttamente "Invia notifiche" come tab di default
  const [activeTab, setActiveTab] = useState("send-notifications");

  // Query per caricare ContactSettings con React Query
  const { data: contactSettingsData, isLoading: isLoadingSettings, refetch: refetchSettings } = useQuery<any>({
    queryKey: ['/api/contact-settings'],
    staleTime: 0,
    gcTime: 0
  });

  // Mutation per salvare ContactSettings (usando fetch diretto per debug) 
  const updateContactSettingsMutation = useMutation({
    mutationFn: async (data: { phone?: string; email?: string; whatsappOptIn?: boolean }) => {
      const response = await fetch('/api/contact-settings', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        credentials: 'same-origin',
        body: JSON.stringify(data)
      });
      
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }
      
      return response.json();
    },
    onSuccess: () => {
      toast({
        title: `✅ ${t('whatsappCenter.toast.configSaved')}`,
        description: t('whatsappCenter.toast.configSavedDescription'),
      });
      refetchSettings();
      queryClient.invalidateQueries({ queryKey: ['/api/contact-settings'] });
    },
    onError: () => {
      toast({
        title: `❌ ${t('whatsappCenter.toast.saveError')}`,
        description: t('whatsappCenter.toast.saveErrorDescription'),
        variant: 'destructive'
      });
    }
  });

  // Handler per salvare le impostazioni (WhatsApp abilitato automaticamente)
  const handleSaveContactSettings = () => {
    updateContactSettingsMutation.mutate({
      phone: phoneNumber.trim(),
      email: email.trim(),
      whatsappOptIn: true // Sempre abilitato automaticamente
    });
  };

  // Sincronizza form fields con contactSettingsData quando cambiano
  useEffect(() => {
    if (contactSettingsData?.success && contactSettingsData?.settings) {
      const settings = contactSettingsData.settings;
      console.log('🔧 CENTRO WHATSAPP: Sincronizzazione settings:', settings);
      
      // Aggiorna i form fields
      setPhoneNumber(settings.phone || '');
      setEmail(settings.email || '');
      setWhatsappOptIn(settings.whatsappOptIn || false);
      
      // Aggiorna lo stato WhatsApp
      const newStatus = settings.phone ? WhatsAppStatus.CONFIGURED : WhatsAppStatus.NOT_CONFIGURED;
      console.log('📞 CENTRO WHATSAPP: Telefono configurato?', settings.phone, 'Status:', newStatus);
      setWhatsappStatus(newStatus);
      
      // Aggiorna last updated
      setLastUpdated(new Date(settings.updatedAt || Date.now()));
    }
  }, [contactSettingsData]);

  // Carica email configurata e appuntamenti all'avvio e al cambio tab
  useEffect(() => {
    const loadEmailConfig = async () => {
      try {
        const emailResponse = await fetch('/api/email-calendar-settings');
        const emailData = await emailResponse.json();
        console.log('📧 Email configurata caricata:', emailData.emailAddress);
        if (emailData.emailAddress) {
          setConfiguredEmail(emailData.emailAddress);
        }
      } catch (emailError) {
        console.error('Errore caricamento email configurata:', emailError);
        setConfiguredEmail('zambelli.andrea.1973@gmail.com');
      }
    };
    
    loadEmailConfig();
    
    // Carica appuntamenti quando siamo nella tab di invio notifiche
    if (activeTab === "send-notifications" && !isLoadingSettings) {
      fetchUpcomingAppointments();
    }
    
    // Carica messaggi marketing quando la tab è "marketing-campaigns"
    if (activeTab === "marketing-campaigns") {
      fetchMarketingMessages();
    }
  }, [activeTab, whatsappStatus, isLoadingSettings]);

  // Funzione per caricare gli appuntamenti
  const fetchUpcomingAppointments = async () => {
    setIsLoading(true);
    try {
      const response = await fetch('/api/notifications/upcoming-appointments');
      const data = await response.json();
      
      console.log('🔍 CENTRO WHATSAPP: Dati ricevuti dall\'API:', JSON.stringify(data, null, 2));
      
      if (data.success) {
        const appointments = data.appointments || [];
        console.log('📅 CENTRO WHATSAPP: Appuntamenti elaborati:', appointments.length);
        console.log('📋 CENTRO WHATSAPP: Primo appuntamento di esempio:', appointments[0]);
        
        setAppointments(appointments);
        
        // Raggruppa gli appuntamenti per data se non sono già raggruppati
        const grouped = appointments.reduce((groups: Record<string, Appointment[]>, appointment: Appointment) => {
          const dateKey = appointment.date;
          if (!groups[dateKey]) {
            groups[dateKey] = [];
          }
          groups[dateKey].push(appointment);
          return groups;
        }, {});
        
        console.log('🗂️ CENTRO WHATSAPP: Appuntamenti raggruppati:', Object.keys(grouped).map(date => `${date}: ${grouped[date].length} app`));
        setGroupedAppointments(grouped);
      } else {
        throw new Error(data.error || 'Unknown error');
      }
    } catch (error) {
      console.error('❌ CENTRO WHATSAPP: Errore nel caricamento appuntamenti:', error);
      toast({
        title: t('whatsappCenter.sendNotifications.error'),
        description: t('whatsappCenter.toast.loadError'),
        variant: 'destructive',
      });
    } finally {
      setIsLoading(false);
    }
  };

  // Funzione per caricare i messaggi marketing pendenti
  const fetchMarketingMessages = async () => {
    setIsLoadingMarketing(true);
    try {
      const response = await fetch('/api/campaigns/pending-messages');
      const data = await response.json();
      
      console.log('📱 MARKETING: Messaggi ricevuti:', data);
      
      if (data.success) {
        setMarketingMessages(data.messages || []);
        console.log(`📱 MARKETING: ${data.messages?.length || 0} messaggi pendenti caricati`);
      } else {
        throw new Error(data.error || 'Unknown error');
      }
    } catch (error) {
      console.error('❌ MARKETING: Errore nel caricamento:', error);
      toast({
        title: t('whatsappCenter.sendNotifications.error'),
        description: t('whatsappCenter.toast.loadMarketingError'),
        variant: 'destructive',
      });
    } finally {
      setIsLoadingMarketing(false);
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
  
  // NUOVO: Funzione per inviare automaticamente TUTTI i messaggi di domani
  const handleSendAllTomorrow = async () => {
    if (isSendingAll) return;
    
    setIsSendingAll(true);
    
    try {
      console.log('🚀 FRONTEND: Avviando invio automatico per domani...');
      
      const response = await apiRequest('POST', '/api/notifications/send-all-tomorrow');
      
      const data = await response.json();
      
      if (data.success) {
        const { results, summary } = data;
        
        console.log('✅ FRONTEND: Invio automatico completato:', summary);
        
        // Mostra risultato all'utente
        toast({
          title: `🎉 ${t('whatsappCenter.toast.autoSendComplete')}`,
          description: `${t('whatsappCenter.toast.autoSendDescription', { count: summary.successful })} ${summary.failed > 0 ? t('whatsappCenter.toast.autoSendErrors', { count: summary.failed }) : ''}`,
          variant: summary.failed > 0 ? 'destructive' : 'default'
        });
        
        // Aggiorna automaticamente la lista degli appuntamenti
        await fetchUpcomingAppointments();
        
        // Se ci sono messaggi preparati, mostra i link WhatsApp per aprirli
        if (results && results.length > 0) {
          const links = results
            .filter((r: any) => r.success)
            .map((r: any) => ({
              id: r.id,
              name: r.clientName,
              link: r.whatsappUrl
            }));
          
          if (links.length > 0) {
            setGeneratedLinks(links);
            setCurrentLinkIndex(0);
            setShowGeneratedLinks(true);
            setIsSequenceRunning(false);
            
            // Mostra toast aggiuntivo per guidare l'utente
            setTimeout(() => {
              toast({
                title: `💬 ${t('whatsappCenter.toast.messagesReady')}`,
                description: t('whatsappCenter.toast.messagesReadyDescription', { count: links.length }),
              });
            }, 1000);
          }
        }
        
      } else {
        throw new Error(data.error || 'Unknown error during automatic send');
      }
      
    } catch (error: any) {
      console.error('❌ FRONTEND: Errore invio automatico:', error);
      toast({
        title: `❌ ${t('whatsappCenter.toast.autoSendError')}`,
        description: error.message || t('whatsappCenter.toast.autoSendErrorDescription'),
        variant: 'destructive'
      });
    } finally {
      setIsSendingAll(false);
    }
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
        title: t('whatsappCenter.sendNotifications.noAppointmentSelected'),
        description: t('whatsappCenter.sendNotifications.selectAtLeastOne'),
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
        
        let messageText = t('whatsapp.reminderTemplate', 'Dear {{name}},\nWe remind you of your appointment for {{service}} on {{date}} at {{time}}.', {
          name: appointment.client?.firstName,
          service: appointment.service?.name,
          date: format(new Date(appointment.date), 'dd/MM/yyyy'),
          time: appointment.startTime.substring(0, 5),
        });
        
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
        title: t('whatsappCenter.sendNotifications.error'),
        description: t('whatsappCenter.sendNotifications.cannotGenerateLinks'),
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
        title: t('whatsappCenter.sendNotifications.sendComplete'),
        description: t('whatsappCenter.sendNotifications.allMessagesSent')
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
        title: t('whatsappCenter.sendNotifications.completed'),
        description: t('whatsappCenter.sendNotifications.allMessagesProcessed')
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
        title: t('whatsappCenter.sendNotifications.noLinksGenerated'),
        description: t('whatsappCenter.sendNotifications.selectAppointmentsForLinks'),
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
          title: t('whatsappCenter.sendNotifications.linksGenerated'),
          description: t('whatsappCenter.sendNotifications.linksGeneratedCount', { count: data.results.length }),
        });
        
        const links = data.results
          .filter((result: any) => result.success && result.whatsappUrl)
          .map((result: any) => ({
            id: result.appointmentId,
            name: result.clientName,
            link: result.whatsappUrl
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
        throw new Error(data.error || 'Unknown error generating links');
      }
    } catch (error) {
      console.error('Errore nella generazione dei link', error);
      
      toast({
        title: t('whatsappCenter.sendNotifications.error'),
        description: t('whatsappCenter.sendNotifications.cannotGenerateLinks'),
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
        return t('whatsappCenter.whatsappConfig.notConfigured');
      case WhatsAppStatus.CONFIGURED:
        return t('whatsappCenter.whatsappConfig.configured');
      default:
        return t('whatsappCenter.whatsappConfig.unknown');
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
          {t('whatsappCenter.pageTitle')}
        </h1>
        <p className="text-muted-foreground mt-2 max-w-2xl mx-auto">
          {t('whatsappCenter.pageSubtitle')}
        </p>
      </div>
      
      <div className="grid gap-8 mb-8">
        <div className="bg-blue-50 border border-blue-200 rounded-lg p-6 text-center">
          <div className="mx-auto w-16 h-16 mb-4 rounded-full bg-blue-100 flex items-center justify-center">
            <Mail className="h-8 w-8 text-blue-600" />
          </div>
          <h3 className="text-xl font-medium text-blue-800 mb-3">
            {t('whatsappCenter.emailNotifications.title')}
          </h3>
          <p className="mb-4 text-blue-700 max-w-lg mx-auto">
            {t('whatsappCenter.emailNotifications.description')}
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
            {t('whatsappCenter.emailNotifications.configureButton')}
          </Button>
        </div>
        
        <div className="bg-gradient-to-br from-purple-50 to-pink-50 border border-purple-200 rounded-lg p-6 text-center">
          <div className="mx-auto w-16 h-16 mb-4 rounded-full bg-gradient-to-br from-purple-100 to-pink-100 flex items-center justify-center">
            <Sparkles className="h-8 w-8 text-purple-600" />
          </div>
          <h3 className="text-xl font-medium bg-gradient-to-r from-purple-600 to-pink-600 bg-clip-text text-transparent mb-3">
            {t('whatsappCenter.marketingAI.title')}
          </h3>
          <p className="mb-4 text-purple-700 max-w-lg mx-auto">
            {t('whatsappCenter.marketingAI.description')}
          </p>
          <Link href="/campagne-marketing">
            <Button 
              variant="default"
              size="lg"
              className="bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-700 hover:to-pink-700 flex items-center mx-auto"
            >
              <Sparkles className="mr-2 h-5 w-5" />
              {t('whatsappCenter.marketingAI.createButton')}
            </Button>
          </Link>
        </div>
      </div>
      
      <div className="border-t border-b py-6 my-6">
        <h2 className="text-2xl font-bold text-center mb-6">
          {t('whatsappCenter.whatsappConfig.sectionTitle')}
        </h2>
      </div>
      
      <div className="flex justify-between items-center mb-6">
        <div>
          <h3 className="text-xl font-medium">
            {t('whatsappCenter.whatsappConfig.systemTitle')}
          </h3>
          <p className="text-muted-foreground">
            {t('whatsappCenter.whatsappConfig.systemDescription')}
          </p>
        </div>
        
        <div className="text-right">
          <div className="text-sm text-muted-foreground mb-1">
            {t('whatsappCenter.whatsappConfig.phoneStatus')}:
            <span className={`ml-2 font-medium ${getStatusColor(whatsappStatus)}`}>
              {getStatusText(whatsappStatus)}
            </span>
          </div>
          
          {contactSettingsData?.settings?.phone && (
            <div className="text-sm font-medium">
              {contactSettingsData.settings.phone}
            </div>
          )}
          
          {lastUpdated && (
            <div className="text-xs text-muted-foreground">
              {t('whatsappCenter.whatsappConfig.updated')}: {format(lastUpdated, 'dd/MM/yyyy HH:mm')}
            </div>
          )}
        </div>
      </div>
      
      <Tabs
        value={activeTab}
        onValueChange={setActiveTab}
        className="space-y-6"
      >
        <TabsList className="grid grid-cols-3 w-full md:w-auto">
          <TabsTrigger value="device-setup">
            <Smartphone className="h-4 w-4 mr-2" />
            {t('whatsappCenter.tabs.phoneSetup')}
          </TabsTrigger>
          <TabsTrigger value="send-notifications">
            <Send className="h-4 w-4 mr-2" />
            {t('whatsappCenter.tabs.sendNotifications')}
          </TabsTrigger>
          <TabsTrigger value="marketing-campaigns">
            <Sparkles className="h-4 w-4 mr-2" />
            {t('whatsappCenter.tabs.marketingCampaigns')}
          </TabsTrigger>
        </TabsList>
        
        <TabsContent value="device-setup" className="space-y-6">
          <Card>
            <CardHeader className="bg-slate-50">
              <CardTitle className="flex items-center">
                <Smartphone className="mr-3 h-6 w-6 text-primary" />
                {t('whatsappCenter.phoneSetup.title')}
              </CardTitle>
              <CardDescription>
                {t('whatsappCenter.phoneSetup.description')}
              </CardDescription>
            </CardHeader>
            
            <CardContent className="space-y-6 pt-6">
              {whatsappStatus === WhatsAppStatus.NOT_CONFIGURED && (
                <div className="space-y-6">
                  <Alert variant="default" className="bg-blue-50 border-blue-200">
                    <Settings className="h-4 w-4 text-blue-600" />
                    <AlertTitle className="text-blue-800">{t('whatsappCenter.phoneSetup.configurePhone')}</AlertTitle>
                    <AlertDescription className="text-blue-700">
                      {t('whatsappCenter.phoneSetup.enterPhonePrompt')}
                    </AlertDescription>
                  </Alert>
                  
                  <div className="bg-white border-2 border-blue-200 rounded-lg p-6">
                    <div className="space-y-4 max-w-md mx-auto">
                      <div className="text-center mb-6">
                        <div className="mx-auto w-16 h-16 bg-blue-100 rounded-full flex items-center justify-center mb-3">
                          <Phone className="h-8 w-8 text-blue-600" />
                        </div>
                        <h3 className="font-medium text-gray-900 mb-2">{t('whatsappCenter.tabs.phoneSetup')}</h3>
                        <p className="text-sm text-gray-600">{t('whatsappCenter.phoneSetup.contactInfo')}</p>
                      </div>
                      
                      <div className="space-y-4">
                        <div>
                          <Label htmlFor="phone-input" className="text-sm font-medium">
                            {t('whatsappCenter.phoneSetup.phoneNumber')} *
                          </Label>
                          <Input
                            id="phone-input"
                            type="tel"
                            placeholder={t('whatsappCenter.phoneSetup.phonePlaceholder')}
                            value={phoneNumber}
                            onChange={(e) => setPhoneNumber(e.target.value)}
                            className="mt-1"
                            data-testid="input-phone"
                          />
                          <p className="text-xs text-gray-500 mt-1">
                            {t('whatsappCenter.phoneSetup.phoneHint')}
                          </p>
                        </div>
                        
                        <div>
                          <Label htmlFor="email-input" className="text-sm font-medium">
                            {t('whatsappCenter.phoneSetup.email')} ({t('whatsappCenter.phoneSetup.optional')})
                          </Label>
                          <Input
                            id="email-input"
                            type="email"
                            placeholder={t('i18nFinale.whatsAppCenterPage.emailPlaceholder')}
                            value={email}
                            onChange={(e) => setEmail(e.target.value)}
                            className="mt-1"
                            data-testid="input-email"
                          />
                        </div>
                        
                        <div className="bg-green-50 border border-green-200 rounded-lg p-3">
                          <div className="flex items-center gap-2">
                            <CheckCircle className="h-4 w-4 text-green-600" />
                            <span className="text-sm font-medium text-green-800">
                              {t('whatsappCenter.phoneSetup.whatsappAutoEnabled')}
                            </span>
                          </div>
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
                            {t('whatsappCenter.phoneSetup.saving')}
                          </>
                        ) : (
                          <>
                            <CheckCircle className="h-4 w-4 mr-2" />
                            {t('whatsappCenter.phoneSetup.saveConfig')}
                          </>
                        )}
                      </Button>
                    </div>
                  </div>
                  
                  <div className="bg-green-50 border border-green-200 rounded-lg p-4">
                    <div className="flex gap-3">
                      <MessageSquare className="h-5 w-5 text-green-600 flex-shrink-0 mt-0.5" />
                      <div className="text-sm">
                        <p className="font-medium text-green-800 mb-1">{t('whatsappCenter.phoneSetup.howNotificationsWork')}</p>
                        <p className="text-green-700">
                          {t('whatsappCenter.phoneSetup.notificationsExplanation')}
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
                    <AlertTitle>{t('whatsappCenter.phoneSetup.configuredSuccess')}</AlertTitle>
                    <AlertDescription>
                      {t('whatsappCenter.phoneSetup.configuredDescription')}
                    </AlertDescription>
                  </Alert>
                  
                  <div className="grid gap-4">
                    <div>
                      <Label htmlFor="phone-edit" className="text-sm font-medium">
                        {t('whatsappCenter.phoneSetup.phoneNumber')} *
                      </Label>
                      <Input
                        id="phone-edit"
                        type="tel"
                        placeholder={t('whatsappCenter.phoneSetup.phonePlaceholder')}
                        value={phoneNumber}
                        onChange={(e) => setPhoneNumber(e.target.value)}
                        className="mt-1"
                        data-testid="input-phone-edit"
                      />
                      <p className="text-xs text-gray-500 mt-1">
                        {t('whatsappCenter.phoneSetup.phoneHint')}
                      </p>
                    </div>
                    
                    <div className="flex gap-2">
                      <Button 
                        onClick={handleSaveContactSettings}
                        disabled={!phoneNumber.trim() || updateContactSettingsMutation.isPending}
                        className="flex-1"
                        data-testid="button-update-phone"
                      >
                        {updateContactSettingsMutation.isPending ? (
                          <>
                            <RefreshCw className="h-4 w-4 mr-2 animate-spin" />
                            {t('whatsappCenter.phoneSetup.updating')}
                          </>
                        ) : (
                          <>
                            <Save className="h-4 w-4 mr-2" />
                            {t('whatsappCenter.phoneSetup.updatePhone')}
                          </>
                        )}
                      </Button>
                      
                      <Button 
                        variant="outline"
                        onClick={() => {
                          // Test WhatsApp link generation
                          const message = t('whatsapp.testMessage', 'Test message from the appointment management system');
                          const phone = phoneNumber || contactSettingsData?.settings?.phone || '';
                          const link = `https://wa.me/${phone.replace(/[^0-9]/g, '')}?text=${encodeURIComponent(message)}`;
                          window.open(link, '_blank');
                        }}
                        disabled={!phoneNumber.trim()}
                        data-testid="button-test-whatsapp"
                      >
                        <Send className="h-4 w-4 mr-2" />
                        {t('whatsappCenter.phoneSetup.test')}
                      </Button>
                    </div>
                    
                    <div className="rounded-md border p-4 bg-muted/30">
                      <div className="flex justify-between items-start">
                        <div>
                          <h3 className="font-medium">
                            {t('whatsappCenter.phoneSetup.howItWorks')}
                          </h3>
                          <p className="text-sm text-muted-foreground mt-1">
                            {t('whatsappCenter.phoneSetup.howItWorksDescription')}:
                          </p>
                        </div>
                        <div className="h-8 w-8 rounded-full bg-primary flex items-center justify-center">
                          <MessageSquare className="h-4 w-4 text-white" />
                        </div>
                      </div>
                      
                      <div className="space-y-2 mt-4">
                        <div className="flex gap-2">
                          <div className="h-5 w-5 rounded-full bg-primary flex items-center justify-center text-white text-xs font-medium">1</div>
                          <p className="text-sm">{t('whatsappCenter.phoneSetup.step1')}</p>
                        </div>
                        <div className="flex gap-2">
                          <div className="h-5 w-5 rounded-full bg-primary flex items-center justify-center text-white text-xs font-medium">2</div>
                          <p className="text-sm">{t('whatsappCenter.phoneSetup.step2')}</p>
                        </div>
                        <div className="flex gap-2">
                          <div className="h-5 w-5 rounded-full bg-primary flex items-center justify-center text-white text-xs font-medium">3</div>
                          <p className="text-sm">{t('whatsappCenter.phoneSetup.step3')}</p>
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
                          title: t('whatsappCenter.phoneSetup.featureNotImplemented'),
                          description: t('whatsappCenter.phoneSetup.removePhoneDescription')
                        });
                      }}
                    >
                      <Phone className="h-4 w-4 mr-2" />
                      {t('whatsappCenter.phoneSetup.removePhone')}
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
                {t('whatsappCenter.sendNotifications.title')}
              </CardTitle>
              <CardDescription>
                {t('whatsappCenter.sendNotifications.description')}
              </CardDescription>
            </CardHeader>
            
            <CardContent className="space-y-6 pt-6">
              {!contactSettingsData?.settings?.phone || whatsappStatus === WhatsAppStatus.NOT_CONFIGURED ? (
                <Alert variant="destructive">
                  <AlertCircle className="h-4 w-4" />
                  <AlertTitle>{t('whatsappCenter.sendNotifications.noPhoneConfigured')}</AlertTitle>
                  <AlertDescription>
                    {t('whatsappCenter.sendNotifications.noPhoneDescription')}
                  </AlertDescription>
                </Alert>
              ) : isLoading ? (
                <div className="py-8 text-center">
                  <RefreshCw className="h-8 w-8 animate-spin mx-auto mb-2 text-primary" />
                  <p className="text-muted-foreground">{t('whatsappCenter.sendNotifications.loadingAppointments')}</p>
                </div>
              ) : appointments.length === 0 ? (
                <div className="text-center py-8">
                  <Calendar className="h-12 w-12 mx-auto mb-4 text-muted-foreground" />
                  <h3 className="text-lg font-medium mb-2">{t('whatsappCenter.sendNotifications.noAppointments')}</h3>
                  <p className="text-muted-foreground max-w-md mx-auto mb-4">
                    {t('whatsappCenter.sendNotifications.noAppointmentsDescription')}
                  </p>
                  <Button 
                    onClick={fetchUpcomingAppointments}
                    variant="outline"
                  >
                    <RefreshCw className="h-4 w-4 mr-2" />
                    {t('whatsappCenter.sendNotifications.refresh')}
                  </Button>
                </div>
              ) : (
                <div className="space-y-6">
                                  <div className="flex flex-col gap-3">
                    <div className="flex justify-between items-center flex-wrap gap-2">
                      <div className="flex items-center gap-1 flex-wrap">
                        <Button
                          size="sm"
                          variant="secondary"
                          onClick={selectOnlyUnsent}
                          className="bg-green-100 hover:bg-green-200 text-green-700 border-green-300"
                        >
                          <CheckSquare className="h-4 w-4 mr-1" />
                          {t('whatsappCenter.sendNotifications.selectOnlyUnsent')}
                        </Button>
                        
                        <div className="relative inline-block group">
                          <Button
                            size="sm"
                            variant="ghost"
                            className="h-8 w-8 p-0"
                          >
                            <AlertCircle className="h-4 w-4 text-muted-foreground" />
                            <span className="sr-only">{t('whatsappCenter.sendNotifications.info')}</span>
                          </Button>
                          <div className="absolute z-50 invisible group-hover:visible opacity-0 group-hover:opacity-100 transition-opacity bottom-full left-1/2 transform -translate-x-1/2 mb-2 bg-white p-2 rounded shadow-lg border w-60 text-xs text-muted-foreground">
                            {t('whatsappCenter.sendNotifications.selectAndSendInfo')}
                          </div>
                        </div>
                      </div>
                      
                      <div className="flex items-center gap-1 flex-wrap">
                        <Button
                          size="sm"
                          variant="default"
                          onClick={handleSendAllTomorrow}
                          disabled={isSendingAll}
                          className="bg-green-600 hover:bg-green-700 text-white"
                          data-testid="button-send-all-tomorrow"
                        >
                          <MessageSquare className="h-4 w-4 mr-1" />
                          {isSendingAll ? t('whatsappCenter.sendNotifications.sendingAuto') : t('whatsappCenter.sendNotifications.sendAllTomorrow')}
                        </Button>
                        
                        <Button
                          size="sm"
                          variant="default"
                          onClick={startSequentialSend}
                          disabled={isSending || Object.values(selectedAppointments).filter(Boolean).length === 0}
                          className="bg-blue-600 hover:bg-blue-700"
                        >
                          <Send className="h-4 w-4 mr-1" />
                          {isSending ? t('whatsappCenter.sendNotifications.sending') : t('whatsappCenter.sendNotifications.sendSequence')}
                        </Button>
                        
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={fetchUpcomingAppointments}
                          className="ml-1"
                        >
                          <RefreshCw className="h-4 w-4" />
                          <span className="sr-only">{t('whatsappCenter.sendNotifications.refreshList')}</span>
                        </Button>
                      </div>
                    </div>
                  </div>
                  
                  <div className="rounded-md border">
                    <div className="p-4 border-b bg-muted/30">
                      <h3 className="font-medium">
                        {t('whatsappCenter.sendNotifications.upcomingAppointments')}
                      </h3>
                    </div>
                    
                    <div className="p-4 space-y-6">
                      {Object.entries(groupedAppointments)
                        .sort(([dateA], [dateB]) => dateA.localeCompare(dateB))
                        .map(([date, apps]) => (
                        <div key={date} className="space-y-3">
                          <div className="flex items-center space-x-2">
                            <div className="h-2 w-2 rounded-full bg-primary" />
                            <h4 className="font-medium">{format(parseISO(date), 'dd MMMM yyyy', { locale: getDateLocale(i18n.language) })}</h4>
                          </div>
                          
                          <div className="space-y-2 pl-4">
                            {apps.map(appointment => {
                                // Determiniamo se il messaggio è già stato inviato
                                // Supporta sia 'whatsapp_generated' (nuovo) che 'sent' (legacy)
                                const isMessageSent = appointment.reminderStatus?.includes('whatsapp_generated') || 
                                                     appointment.reminderStatus?.includes('sent');
                                
                                // Nascondi messaggi inviati da più di 30 giorni
                                if (isMessageSent && appointment.whatsappSentAt) {
                                  const sentDate = new Date(appointment.whatsappSentAt);
                                  const daysSinceSent = Math.floor((Date.now() - sentDate.getTime()) / (1000 * 60 * 60 * 24));
                                  if (daysSinceSent > 30) {
                                    return null; // Nascondi appuntamento
                                  }
                                }
                                
                                const bgColor = isMessageSent ? 'bg-red-50' : 'bg-green-50';
                                
                                // Creiamo un link WhatsApp diretto
                                const generateWhatsAppLink = () => {
                                  const phone = appointment.client?.phone?.replace(/[+\s]/g, '');
                                  let messageText = t('whatsapp.reminderTemplate', 'Dear {{name}},\nWe remind you of your appointment for {{service}} on {{date}} at {{time}}.', {
                                    name: appointment.client?.firstName,
                                    service: appointment.service?.name,
                                    date: format(new Date(appointment.date), 'dd/MM/yyyy'),
                                    time: appointment.startTime.substring(0, 5),
                                  });
                                  
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
                                        {isMessageSent ? t('whatsappCenter.sendNotifications.sent') : t('whatsappCenter.sendNotifications.send')}
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
                        {t('whatsappCenter.sendNotifications.customMessage')} <span className="text-muted-foreground">({t('whatsappCenter.phoneSetup.optional')})</span>
                      </Label>
                      <span className="text-xs text-muted-foreground">
                        {customMessage.length}/500
                      </span>
                    </div>
                    
                    <div className="bg-muted/30 border border-muted rounded-md p-3 mb-2 text-sm flex gap-2">
                      <AlertCircle className="h-4 w-4 flex-shrink-0 mt-0.5" />
                      <p>
                        {t('whatsappCenter.sendNotifications.customMessageHint')}
                      </p>
                    </div>
                    
                    <Textarea
                      id="custom-message"
                      placeholder={t('whatsappCenter.sendNotifications.customMessagePlaceholder')}
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
        
        <TabsContent value="marketing-campaigns" className="space-y-6">
          <Card>
            <CardHeader className="bg-slate-50">
              <CardTitle className="flex items-center">
                <Sparkles className="mr-3 h-6 w-6 text-primary" />
                {t('whatsappCenter.marketing.title')}
              </CardTitle>
              <CardDescription>
                {t('whatsappCenter.marketing.description')}
              </CardDescription>
            </CardHeader>
            
            <CardContent className="space-y-6 pt-6">
              {isLoadingMarketing ? (
                <div className="py-8 text-center">
                  <RefreshCw className="h-8 w-8 animate-spin mx-auto mb-2 text-primary" />
                  <p className="text-muted-foreground">{t('whatsappCenter.marketing.loadingMessages')}</p>
                </div>
              ) : marketingMessages.length === 0 ? (
                <div className="text-center py-8">
                  <Sparkles className="h-12 w-12 mx-auto mb-4 text-muted-foreground" />
                  <h3 className="text-lg font-medium mb-2">{t('whatsappCenter.marketing.noMessages')}</h3>
                  <p className="text-muted-foreground max-w-md mx-auto mb-4">
                    {t('whatsappCenter.marketing.noMessagesDescription')}
                  </p>
                  <Button 
                    onClick={fetchMarketingMessages}
                    variant="outline"
                  >
                    <RefreshCw className="h-4 w-4 mr-2" />
                    {t('whatsappCenter.sendNotifications.refresh')}
                  </Button>
                </div>
              ) : (
                <div className="space-y-4">
                  <div className="flex justify-between items-center mb-4">
                    <p className="text-sm text-muted-foreground">
                      {marketingMessages.length} {marketingMessages.length === 1 ? t('whatsappCenter.marketing.messagePending') : t('whatsappCenter.marketing.messagesPending')}
                    </p>
                    <Button 
                      onClick={fetchMarketingMessages}
                      variant="outline"
                      size="sm"
                    >
                      <RefreshCw className="h-4 w-4 mr-2" />
                      {t('whatsappCenter.sendNotifications.refresh')}
                    </Button>
                  </div>
                  
                  {/* Raggruppa per campagna */}
                  {Object.entries(
                    marketingMessages.reduce((acc: Record<string, any[]>, msg) => {
                      const campaign = msg.campaignName || t('whatsappCenter.marketing.noName');
                      if (!acc[campaign]) acc[campaign] = [];
                      acc[campaign].push(msg);
                      return acc;
                    }, {})
                  ).map(([campaignName, messages]) => (
                    <Card key={campaignName} className="border-2">
                      <CardHeader className="pb-3">
                        <div className="flex items-center justify-between">
                          <div className="flex-1">
                            <CardTitle className="text-base flex items-center gap-2">
                              <Sparkles className="h-4 w-4 text-primary" />
                              {campaignName}
                            </CardTitle>
                            <CardDescription>
                              {messages.length} {messages.length === 1 ? t('whatsappCenter.marketing.message') : t('whatsappCenter.marketing.messages')}
                            </CardDescription>
                          </div>
                          <Button
                            onClick={() => {
                              // Genera array di link per questa campagna
                              const links = messages
                                .filter((msg: any) => msg.whatsappLink)
                                .map((msg: any) => ({
                                  link: msg.whatsappLink,
                                  name: `${msg.client?.firstName} ${msg.client?.lastName}`,
                                  phone: msg.phone
                                }));
                              
                              if (links.length > 0) {
                                setGeneratedLinks(links);
                                setCurrentLinkIndex(0);
                                setShowGeneratedLinks(true);
                                setIsSequenceRunning(false);
                              }
                            }}
                            className="ml-4"
                          >
                            <Send className="h-4 w-4 mr-2" />
                            {t('whatsappCenter.sendNotifications.sendSequence')}
                          </Button>
                        </div>
                      </CardHeader>
                      <CardContent className="space-y-2">
                        {messages.map((msg: any, idx: number) => (
                          <div 
                            key={msg.id}
                            className="flex items-center justify-between p-3 border rounded-lg hover:bg-muted/50"
                          >
                            <div className="flex-1">
                              <p className="font-medium">
                                {msg.client?.firstName} {msg.client?.lastName}
                              </p>
                              <p className="text-sm text-muted-foreground">
                                {msg.phone}
                              </p>
                            </div>
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() => {
                                if (msg.whatsappLink) {
                                  window.open(msg.whatsappLink, '_blank');
                                }
                              }}
                            >
                              <Send className="h-4 w-4 mr-1" />
                              {t('whatsappCenter.sendNotifications.send')}
                            </Button>
                          </div>
                        ))}
                      </CardContent>
                    </Card>
                  ))}
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
                  {isSequenceRunning ? t('whatsappCenter.linkModal.sequentialSend') : t('whatsappCenter.linkModal.whatsappLinks')}
                </h3>
                <p className="text-sm">{t('whatsappCenter.linkModal.contact')} {currentLinkIndex + 1} {t('whatsappCenter.linkModal.of')} {generatedLinks.length}</p>
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
                    {t('whatsappCenter.linkModal.whatsappOpened')}
                  </p>
                )}
              </div>
              
              {isSequenceRunning ? (
                <div className="flex flex-col gap-2">
                  <p className="text-sm text-center">{t('whatsappCenter.linkModal.afterSending')}</p>
                  <Button
                    onClick={goToNextSequentialLink}
                    size="lg"
                    className="flex-1"
                  >
                    <Send className="h-4 w-4 mr-1" />
                    {currentLinkIndex < generatedLinks.length - 1 
                      ? t('whatsappCenter.linkModal.nextContact') 
                      : t('whatsappCenter.linkModal.finishSend')}
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
                    {t('whatsappCenter.linkModal.openWhatsApp')}
                  </Button>
                  
                  <Button
                    onClick={goToNextLink}
                    variant="outline"
                    size="sm"
                    className="flex-1"
                  >
                    {currentLinkIndex < generatedLinks.length - 1 ? t('whatsappCenter.linkModal.next') : t('whatsappCenter.linkModal.finish')}
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