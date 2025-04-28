import React, { useState, useEffect } from 'react';
// Rimosso import Layout per evitare layout annidati
import FooterOnly from '@/components/FooterOnly';
import { NotificationSettingsForm } from '@/components/NotificationSettingsForm';
import GoogleCalendarSettings from '@/components/GoogleCalendarSettings';
import { format, parseISO } from 'date-fns';
import { it } from 'date-fns/locale';
import { useTranslation } from 'react-i18next';
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
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
import { toast } from '@/hooks/use-toast';
import { MessageSquare, Send, RefreshCw, CheckCircle, UserCircle, Calendar, Clock, Scissors, ExternalLink, Info, Bell } from 'lucide-react';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from '@/components/ui/accordion';
import { AlertCircle } from 'lucide-react';

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
  client: {
    id: number;
    firstName: string;
    lastName: string;
    phone: string;
    email: string;
  };
  service: {
    id: number;
    name: string;
    duration: number;
    color: string;
  };
}

interface GroupedAppointments {
  [date: string]: Appointment[];
}

const NotificationsPage: React.FC = () => {
  const { t } = useTranslation();
  const [appointments, setAppointments] = useState<Appointment[]>([]);
  const [groupedAppointments, setGroupedAppointments] = useState<GroupedAppointments>({});
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedAppointments, setSelectedAppointments] = useState<Record<number, boolean>>({});
  const [customMessage, setCustomMessage] = useState('');
  const [sendingNotifications, setSendingNotifications] = useState(false);
  const [sendingSMS, setSendingSMS] = useState(false);
  const [activeTab, setActiveTab] = useState('upcoming');
  const [sentHistory, setSentHistory] = useState<any[]>([]);
  const [smsHistory, setSmsHistory] = useState<any[]>([]);
  const [loadingHistory, setLoadingHistory] = useState(false);
  const [loadingSmsHistory, setLoadingSmsHistory] = useState(false);

  // Carica gli appuntamenti imminenti
  const fetchUpcomingAppointments = async () => {
    setLoading(true);
    setError(null);
    
    try {
      const response = await fetch('/api/notifications/upcoming-appointments');
      
      if (!response.ok) {
        throw new Error(`Errore durante il recupero degli appuntamenti: ${response.status}`);
      }
      
      const data = await response.json();
      
      if (data.success) {
        setAppointments(data.appointments || []);
        setGroupedAppointments(data.groupedAppointments || {});
      } else {
        throw new Error(data.error || 'Errore sconosciuto');
      }
    } catch (err: any) {
      setError(err.message);
      toast({
        title: 'Errore',
        description: `Impossibile caricare gli appuntamenti: ${err.message}`,
        variant: 'destructive'
      });
    } finally {
      setLoading(false);
    }
  };

  // Carica lo storico delle notifiche
  const fetchNotificationHistory = async () => {
    setLoadingHistory(true);
    
    try {
      const response = await fetch('/api/notifications/history');
      
      if (!response.ok) {
        throw new Error(`Errore durante il recupero dello storico: ${response.status}`);
      }
      
      const data = await response.json();
      
      if (data.success) {
        setSentHistory(data.notifications || []);
      } else {
        throw new Error(data.error || 'Errore sconosciuto');
      }
    } catch (err: any) {
      toast({
        title: 'Errore',
        description: `Impossibile caricare lo storico: ${err.message}`,
        variant: 'destructive'
      });
    } finally {
      setLoadingHistory(false);
    }
  };

  // Carica i dati all'inizializzazione
  useEffect(() => {
    fetchUpcomingAppointments();
  }, []);
  
  // Nota: useEffect per cambiare tab mantenuto più sotto

  // Carica lo storico delle notifiche SMS
  const fetchSmsHistory = async () => {
    setLoadingSmsHistory(true);
    
    try {
      const response = await fetch('/api/notifications/sms-history');
      
      if (!response.ok) {
        throw new Error(`Errore durante il recupero dello storico SMS: ${response.status}`);
      }
      
      const data = await response.json();
      
      if (data.success) {
        setSmsHistory(data.notifications || []);
      } else {
        throw new Error(data.error || 'Errore sconosciuto');
      }
    } catch (err: any) {
      toast({
        title: 'Errore',
        description: `Impossibile caricare lo storico SMS: ${err.message}`,
        variant: 'destructive'
      });
    } finally {
      setLoadingSmsHistory(false);
    }
  };

  // Carica gli storici quando cambio tab
  useEffect(() => {
    if (activeTab === 'history') {
      fetchNotificationHistory();
      fetchSmsHistory();
    }
  }, [activeTab]);
  
  // Aggiorna lo storico SMS quando visualizzo la cronologia
  useEffect(() => {
    // Controlla se entrambi i tab 'history' e subtab 'sms' sono attivi
    const tabsElements = document.querySelectorAll('[data-state="active"][value="sms"]');
    if (activeTab === 'history' && tabsElements.length > 0) {
      fetchSmsHistory();
    }
  }, [activeTab]);

  // Gestisce la selezione di un appuntamento
  const handleAppointmentSelection = (appointmentId: number, checked: boolean) => {
    setSelectedAppointments(prev => ({
      ...prev,
      [appointmentId]: checked
    }));
  };

  // Seleziona tutti gli appuntamenti per una data specifica
  const handleSelectAllForDate = (date: string, checked: boolean) => {
    const updatedSelection = { ...selectedAppointments };
    
    if (groupedAppointments[date]) {
      groupedAppointments[date].forEach(appointment => {
        updatedSelection[appointment.id] = checked;
      });
    }
    
    setSelectedAppointments(updatedSelection);
  };

  // Conta quanti appuntamenti sono selezionati per una data
  const countSelectedForDate = (date: string): [number, number] => {
    if (!groupedAppointments[date]) return [0, 0];
    
    const total = groupedAppointments[date].length;
    const selected = groupedAppointments[date].filter(a => selectedAppointments[a.id]).length;
    
    return [selected, total];
  };

  // Verifica se tutti gli appuntamenti per una data sono selezionati
  const areAllSelectedForDate = (date: string): boolean => {
    if (!groupedAppointments[date]) return false;
    
    const [selected, total] = countSelectedForDate(date);
    return selected === total && total > 0;
  };

  // Invia notifiche WhatsApp per gli appuntamenti selezionati
  const handleSendNotifications = async () => {
    const selectedIds = Object.entries(selectedAppointments)
      .filter(([_, isSelected]) => isSelected)
      .map(([id]) => parseInt(id));
    
    if (selectedIds.length === 0) {
      toast({
        title: 'Nessun appuntamento selezionato',
        description: 'Seleziona almeno un appuntamento per inviare notifiche',
        variant: 'destructive'
      });
      return;
    }
    
    setSendingNotifications(true);
    
    try {
      const response = await fetch('/api/notifications/send-batch', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          appointmentIds: selectedIds,
          customMessage: customMessage.trim() || undefined
        })
      });
      
      if (!response.ok) {
        throw new Error(`Errore durante l'invio delle notifiche: ${response.status}`);
      }
      
      const data = await response.json();
      
      if (data.success) {
        toast({
          title: 'Promemoria WhatsApp generati',
          description: data.message || `${data.results.length} promemoria WhatsApp generati con successo`,
          variant: 'default'
        });
        
        // Aggiorna la lista dopo l'invio
        fetchUpcomingAppointments();
        // Reset delle selezioni e del messaggio personalizzato
        setSelectedAppointments({});
        setCustomMessage('');
      } else {
        throw new Error(data.error || 'Errore sconosciuto');
      }
    } catch (err: any) {
      toast({
        title: 'Errore',
        description: `Impossibile inviare i promemoria WhatsApp: ${err.message}`,
        variant: 'destructive'
      });
    } finally {
      setSendingNotifications(false);
    }
  };
  
  // Invia SMS per gli appuntamenti selezionati
  const handleSendSMS = async () => {
    const selectedIds = Object.entries(selectedAppointments)
      .filter(([_, isSelected]) => isSelected)
      .map(([id]) => parseInt(id));
    
    if (selectedIds.length === 0) {
      toast({
        title: 'Nessun appuntamento selezionato',
        description: 'Seleziona almeno un appuntamento per inviare SMS',
        variant: 'destructive'
      });
      return;
    }
    
    setSendingSMS(true);
    
    try {
      const response = await fetch('/api/notifications/send-sms-batch', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          appointmentIds: selectedIds,
          message: customMessage.trim() || undefined
        })
      });
      
      if (!response.ok) {
        throw new Error(`Errore durante l'invio degli SMS: ${response.status}`);
      }
      
      const data = await response.json();
      
      if (data.success) {
        // Controlla se è presente un avviso per account trial o con limitazioni
        if (data.trialAccount || data.trialWarning) {
          toast({
            title: "Account Twilio con limitazioni",
            description: data.trialWarning || "Il tuo account Twilio ha delle limitazioni e potrebbe non consegnare SMS a tutti i numeri.",
            variant: "destructive",
            duration: 8000,
          });
        }
        
        // Verifica se ci sono errori specifici da mostrare
        const errorsFound = data.results.some((r: any) => !r.success);
        
        if (errorsFound) {
          // Raggruppa gli errori per tipo per evitare toast duplicati
          const errorTypes: Record<string, number> = {};
          
          data.results.forEach((result: any) => {
            if (!result.success && result.errorCode) {
              errorTypes[result.errorCode] = (errorTypes[result.errorCode] || 0) + 1;
            }
          });
          
          // Mostra i messaggi di errore principali
          Object.entries(errorTypes).forEach(([errorCode, count]) => {
            const errorResult = data.results.find((r: any) => !r.success && r.errorCode === errorCode);
            if (errorResult) {
              toast({
                title: `Errore invio SMS (${count} ${count === 1 ? 'destinatario' : 'destinatari'})`,
                description: errorResult.error,
                variant: "destructive",
                duration: 6000,
              });
            }
          });
        }
        
        // Mostra il toast di successo solo se ci sono stati invii riusciti
        const successCount = data.stats?.success || data.results.filter((r: any) => r.success).length;
        if (successCount > 0) {
          toast({
            title: 'SMS inviati',
            description: `${successCount} SMS inviati con successo`,
            variant: 'default'
          });
        }
        
        // Aggiorna la lista dopo l'invio
        fetchUpcomingAppointments();
        // Aggiorna lo storico degli SMS
        fetchSmsHistory();
        // Reset delle selezioni e del messaggio personalizzato
        setSelectedAppointments({});
        setCustomMessage('');
      } else {
        throw new Error(data.error || 'Errore sconosciuto');
      }
    } catch (err: any) {
      toast({
        title: 'Errore',
        description: `Impossibile inviare gli SMS: ${err.message}`,
        variant: 'destructive'
      });
    } finally {
      setSendingSMS(false);
    }
  };

  // Formatta la data in formato italiano
  const formatDate = (dateStr: string): string => {
    try {
      const date = parseISO(dateStr);
      return format(date, 'EEEE d MMMM yyyy', { locale: it });
    } catch (e) {
      return dateStr;
    }
  };

  // Formatta l'ora in formato 24 ore
  const formatTime = (timeStr: string): string => {
    try {
      return timeStr.substring(0, 5);
    } catch (e) {
      return timeStr;
    }
  };

  // Estrae il link WhatsApp da un messaggio
  const extractWhatsAppLink = (message: string): string | null => {
    const regex = /\[Apri WhatsApp\]\((https:\/\/wa\.me\/[^\)]+)\)/;
    const match = message.match(regex);
    return match ? match[1] : null;
  };

  // Renderizza la pagina con il footer
  return (
    <div className="flex flex-col min-h-screen">
      <div className="flex-grow container mx-auto py-6 px-4">
        <div className="flex flex-col md:flex-row items-start md:items-center justify-between mb-6">
          <div>
            <h1 className="text-2xl font-bold">{t('notificationsPage.title')}</h1>
            <p className="text-muted-foreground">{t('notificationsPage.subtitle')}</p>
          </div>
          
          <div className="mt-4 md:mt-0 flex gap-2">
            <Button 
              variant="outline" 
              onClick={fetchUpcomingAppointments}
              disabled={loading}
            >
              <RefreshCw className={`h-4 w-4 mr-2 ${loading ? 'animate-spin' : ''}`} />
              {t('notificationsPage.refresh')}
            </Button>
          </div>
        </div>

        <Tabs 
          defaultValue="upcoming" 
          value={activeTab}
          onValueChange={setActiveTab}
          className="space-y-4"
        >
          <TabsList className="grid grid-cols-4">
            <TabsTrigger value="upcoming">
              <MessageSquare className="h-4 w-4 mr-2" />
              {t('notificationsPage.tabs.upcoming')}
            </TabsTrigger>
            <TabsTrigger value="history">
              <CheckCircle className="h-4 w-4 mr-2" />
              {t('notificationsPage.tabs.history')}
            </TabsTrigger>
            <TabsTrigger value="settings">
              <Bell className="h-4 w-4 mr-2" />
              {t('notificationsPage.tabs.settings')}
            </TabsTrigger>
            <TabsTrigger value="calendar">
              <Calendar className="h-4 w-4 mr-2" />
              {t('notificationsPage.tabs.calendar')}
            </TabsTrigger>
          </TabsList>
          
          <TabsContent value="upcoming" className="space-y-4">
            <Alert variant="default" className="bg-muted">
              <Info className="h-4 w-4" />
              <AlertTitle>{t('notificationsPage.howItWorks.title')}</AlertTitle>
              <AlertDescription>
                <ul className="list-disc pl-5 text-sm space-y-1 mt-2">
                  <li>{t('notificationsPage.howItWorks.steps.0')}</li>
                  <li>{t('notificationsPage.howItWorks.steps.1')}</li>
                  <li>{t('notificationsPage.howItWorks.steps.2')}</li>
                  <li>{t('notificationsPage.howItWorks.steps.3')}</li>
                </ul>
              </AlertDescription>
            </Alert>
            
            <Alert className="bg-amber-50 border-amber-200">
              <AlertCircle className="h-4 w-4 text-amber-600" />
              <AlertTitle className="text-amber-800">Limitazioni SMS Twilio</AlertTitle>
              <AlertDescription className="text-amber-700">
                <p className="mb-1">Gli SMS potrebbero non essere consegnati in questi casi:</p>
                <ul className="list-disc pl-5 text-sm space-y-1">
                  <li>Account Twilio in modalità trial (gratuita): SMS inviati solo a numeri verificati</li>
                  <li>Restrizioni geografiche: alcuni prefissi internazionali potrebbero essere bloccati</li>
                  <li>Numeri non validi: verifica la formattazione (es. +393471234567)</li>
                </ul>
              </AlertDescription>
            </Alert>
            
            {error && (
              <Alert variant="destructive">
                <AlertCircle className="h-4 w-4" />
                <AlertTitle>Errore</AlertTitle>
                <AlertDescription>{error}</AlertDescription>
              </Alert>
            )}
            
            {/* Textarea per messaggio personalizzato */}
            <Card className="mb-6">
              <CardHeader className="pb-3">
                <CardTitle className="text-base">{t('notificationsPage.customMessage.title')}</CardTitle>
                <CardDescription>
                  {t('notificationsPage.customMessage.description')}
                </CardDescription>
              </CardHeader>
              <CardContent>
                <Textarea
                  placeholder={t('notificationsPage.customMessage.placeholder')}
                  className="resize-none"
                  value={customMessage}
                  onChange={(e) => setCustomMessage(e.target.value)}
                />
              </CardContent>
              <CardFooter className="flex justify-between pt-0">
                <p className="text-sm text-muted-foreground">
                  {customMessage.length} {t('notificationsPage.customMessage.characters')}
                </p>
                <Button 
                  variant="destructive" 
                  size="sm"
                  disabled={!customMessage.trim()}
                  onClick={() => setCustomMessage('')}
                >
                  {t('notificationsPage.customMessage.clear')}
                </Button>
              </CardFooter>
            </Card>
            
            {/* Lista appuntamenti raggruppati per data */}
            {Object.keys(groupedAppointments).length === 0 ? (
              <Card>
                <CardContent className="pt-6 text-center py-10">
                  {loading ? (
                    <div className="flex flex-col items-center">
                      <RefreshCw className="h-10 w-10 text-primary animate-spin mb-4" />
                      <p>{t('notificationsPage.noAppointments.loading')}</p>
                    </div>
                  ) : (
                    <div className="flex flex-col items-center text-muted-foreground">
                      <MessageSquare className="h-10 w-10 mb-4" />
                      <p className="font-medium">{t('notificationsPage.noAppointments.empty')}</p>
                      <p className="text-sm mt-1">
                        {t('notificationsPage.noAppointments.description')}
                      </p>
                    </div>
                  )}
                </CardContent>
              </Card>
            ) : (
              <Accordion type="multiple" className="space-y-4">
                {Object.entries(groupedAppointments).map(([date, dateAppointments]) => {
                  const [selected, total] = countSelectedForDate(date);
                  
                  return (
                    <AccordionItem 
                      value={date} 
                      key={date}
                      className="border rounded-lg overflow-hidden"
                    >
                      <AccordionTrigger className="px-4 py-2 hover:no-underline">
                        <div className="flex flex-1 justify-between items-center">
                          <div className="flex items-center gap-3">
                            <div className="relative">
                              <Calendar className="h-5 w-5 text-primary" />
                              {selected > 0 && (
                                <div className="absolute -top-1 -right-1 h-3 w-3 rounded-full bg-primary"></div>
                              )}
                            </div>
                            <span className="font-medium capitalize">{formatDate(date)}</span>
                          </div>
                          <div className="flex items-center gap-3">
                            <div className="flex items-center gap-2">
                              <Checkbox 
                                id={`select-all-${date}`}
                                checked={areAllSelectedForDate(date)}
                                onCheckedChange={(checked) => 
                                  handleSelectAllForDate(date, !!checked)
                                }
                                onClick={(e) => e.stopPropagation()}
                              />
                              <label 
                                htmlFor={`select-all-${date}`}
                                className="text-sm"
                                onClick={(e) => e.stopPropagation()}
                              >
                                {t('notificationsPage.table.selectAll')}
                              </label>
                            </div>
                            <Badge variant={selected > 0 ? "default" : "outline"}>
                              {selected}/{total}
                            </Badge>
                          </div>
                        </div>
                      </AccordionTrigger>
                      <AccordionContent>
                        <div className="px-4 pb-3">
                          <Table>
                            <TableHeader>
                              <TableRow>
                                <TableHead className="w-10"></TableHead>
                                <TableHead>{t('notificationsPage.table.client')}</TableHead>
                                <TableHead>{t('notificationsPage.table.service')}</TableHead>
                                <TableHead>{t('notificationsPage.table.time')}</TableHead>
                                <TableHead className="text-right">{t('notificationsPage.table.actions')}</TableHead>
                              </TableRow>
                            </TableHeader>
                            <TableBody>
                              {dateAppointments.map((appointment) => (
                                <TableRow key={appointment.id}>
                                  <TableCell className="p-2">
                                    <Checkbox 
                                      id={`select-${appointment.id}`}
                                      checked={!!selectedAppointments[appointment.id]}
                                      onCheckedChange={(checked) => 
                                        handleAppointmentSelection(appointment.id, !!checked)
                                      }
                                    />
                                  </TableCell>
                                  <TableCell className="font-medium">
                                    <div className="flex items-center gap-2">
                                      <UserCircle className="h-4 w-4 text-primary" />
                                      {appointment.client.firstName} {appointment.client.lastName}
                                      <div className="text-xs text-muted-foreground ml-1">
                                        {appointment.client.phone}
                                      </div>
                                    </div>
                                  </TableCell>
                                  <TableCell>
                                    <div className="flex items-center gap-1">
                                      <Scissors className="h-4 w-4 text-muted-foreground" />
                                      {appointment.service.name}
                                    </div>
                                  </TableCell>
                                  <TableCell>
                                    <div className="flex items-center gap-1">
                                      <Clock className="h-4 w-4 text-muted-foreground" />
                                      {formatTime(appointment.startTime)}
                                    </div>
                                  </TableCell>
                                  <TableCell className="text-right">
                                    <div className="flex gap-2 justify-end">
                                        <Button
                                          size="sm"
                                          variant="ghost"
                                          onClick={() => {
                                            const updatedSelection = { ...selectedAppointments };
                                            updatedSelection[appointment.id] = true;
                                            setSelectedAppointments(updatedSelection);
                                            
                                            handleSendNotifications();
                                          }}
                                          disabled={sendingNotifications}
                                        >
                                          <MessageSquare className="h-4 w-4 mr-1" />
                                          WhatsApp
                                        </Button>
                                        
                                        <Button
                                          size="sm"
                                          variant="ghost"
                                          onClick={() => {
                                            const updatedSelection = { ...selectedAppointments };
                                            updatedSelection[appointment.id] = true;
                                            setSelectedAppointments(updatedSelection);
                                            
                                            handleSendSMS();
                                          }}
                                          disabled={sendingSMS}
                                        >
                                          <Send className="h-4 w-4 mr-1" />
                                          SMS
                                        </Button>
                                      </div>
                                  </TableCell>
                                </TableRow>
                              ))}
                            </TableBody>
                          </Table>
                        </div>
                      </AccordionContent>
                    </AccordionItem>
                  );
                })}
              </Accordion>
            )}
            
            {/* Pulsante invio multiplo in fondo */}
            {Object.keys(groupedAppointments).length > 0 && (
              <div className="flex justify-center mt-6">
                <div className="flex flex-col md:flex-row gap-3">
                  <Button 
                    size="lg"
                    onClick={handleSendNotifications}
                    disabled={
                      sendingNotifications || 
                      Object.values(selectedAppointments).filter(Boolean).length === 0
                    }
                    className="w-full md:w-auto"
                  >
                    {sendingNotifications ? (
                      <>
                        <RefreshCw className="h-4 w-4 mr-2 animate-spin" /> 
                        {t('notificationsPage.buttons.generating')}
                      </>
                    ) : (
                      <>
                        <MessageSquare className="h-4 w-4 mr-2" />
                        {t('notificationsPage.buttons.generateWhatsApp')}
                      </>
                    )}
                  </Button>
                  
                  <Button 
                    size="lg"
                    variant="outline"
                    onClick={handleSendSMS}
                    disabled={
                      sendingSMS || 
                      Object.values(selectedAppointments).filter(Boolean).length === 0
                    }
                    className="w-full md:w-auto"
                  >
                    {sendingSMS ? (
                      <>
                        <RefreshCw className="h-4 w-4 mr-2 animate-spin" /> 
                        Invio SMS in corso...
                      </>
                    ) : (
                      <>
                        <Send className="h-4 w-4 mr-2" />
                        Invia SMS
                      </>
                    )}
                  </Button>
                </div>
              </div>
            )}
          </TabsContent>
          
          <TabsContent value="history">
            <Card>
              <CardHeader>
                <CardTitle>{t('notificationsPage.history.title')}</CardTitle>
                <CardDescription>
                  {t('notificationsPage.history.description')}
                </CardDescription>
              </CardHeader>
              <CardContent>
                {loadingHistory && loadingSmsHistory ? (
                  <div className="flex justify-center py-8">
                    <RefreshCw className="h-10 w-10 text-primary animate-spin" />
                  </div>
                ) : (
                  <Tabs defaultValue="whatsapp">
                    <TabsList className="mb-4">
                      <TabsTrigger value="whatsapp">
                        <MessageSquare className="h-4 w-4 mr-2" />
                        WhatsApp
                      </TabsTrigger>
                      <TabsTrigger value="sms">
                        <Send className="h-4 w-4 mr-2" />
                        SMS
                      </TabsTrigger>
                    </TabsList>
                    
                    <TabsContent value="whatsapp">
                      {loadingHistory ? (
                        <div className="flex justify-center py-8">
                          <RefreshCw className="h-8 w-8 text-primary animate-spin" />
                        </div>
                      ) : sentHistory.length === 0 ? (
                        <div className="text-center py-8 text-muted-foreground">
                          <CheckCircle className="h-8 w-8 mx-auto mb-4" />
                          <p>{t('notificationsPage.history.noNotifications')}</p>
                        </div>
                      ) : (
                        <Table>
                          <TableHeader>
                            <TableRow>
                              <TableHead>{t('notificationsPage.history.table.date')}</TableHead>
                              <TableHead>{t('notificationsPage.history.table.message')}</TableHead>
                              <TableHead className="text-right">{t('notificationsPage.history.table.actions')}</TableHead>
                            </TableRow>
                          </TableHeader>
                          <TableBody>
                            {sentHistory.map((notification) => {
                              const whatsappLink = extractWhatsAppLink(notification.message);
                              return (
                                <TableRow key={notification.id}>
                                  <TableCell className="whitespace-nowrap">
                                    {notification.sent_at ? format(new Date(notification.sent_at), 'dd/MM/yyyy HH:mm') : 'N/D'}
                                  </TableCell>
                                  <TableCell>
                                    <div className="max-w-md truncate" title={notification.message}>
                                      {notification.message.replace(/\[Apri WhatsApp\]\(.*?\)/g, '')}
                                    </div>
                                  </TableCell>
                                  <TableCell className="text-right">
                                    {whatsappLink && (
                                      <a 
                                        href={whatsappLink} 
                                        target="_blank" 
                                        rel="noopener noreferrer"
                                        className="inline-flex items-center space-x-1 text-blue-600 hover:text-blue-800"
                                      >
                                        <ExternalLink className="h-4 w-4" />
                                        <span>{t('notificationsPage.history.table.reopen')}</span>
                                      </a>
                                    )}
                                  </TableCell>
                                </TableRow>
                              );
                            })}
                          </TableBody>
                        </Table>
                      )}
                    </TabsContent>
                    
                    <TabsContent value="sms">
                      {loadingSmsHistory ? (
                        <div className="flex justify-center py-8">
                          <RefreshCw className="h-8 w-8 text-primary animate-spin" />
                        </div>
                      ) : smsHistory.length === 0 ? (
                        <div className="text-center py-8 text-muted-foreground">
                          <Send className="h-8 w-8 mx-auto mb-4 opacity-40" />
                          <p>{t('notificationsPage.history.noSmsNotifications')}</p>
                        </div>
                      ) : (
                        <Table>
                          <TableHeader>
                            <TableRow>
                              <TableHead>{t('notificationsPage.history.table.date')}</TableHead>
                              <TableHead>{t('notificationsPage.history.table.client')}</TableHead>
                              <TableHead>{t('notificationsPage.history.table.message')}</TableHead>
                              <TableHead>{t('notificationsPage.history.table.status')}</TableHead>
                            </TableRow>
                          </TableHeader>
                          <TableBody>
                            {smsHistory.map((notification: any) => {
                              let metadata = {};
                              try {
                                if (notification.metadata) {
                                  metadata = JSON.parse(notification.metadata);
                                }
                              } catch (e) {
                                console.error("Errore nel parsing dei metadata:", e);
                              }
                              
                              return (
                                <TableRow key={notification.id}>
                                  <TableCell className="whitespace-nowrap">
                                    {notification.sent_at ? format(new Date(notification.sent_at), 'dd/MM/yyyy HH:mm') : 'N/D'}
                                  </TableCell>
                                  <TableCell>
                                    {notification.client?.firstName} {notification.client?.lastName}
                                  </TableCell>
                                  <TableCell>
                                    <div className="max-w-md truncate" title={notification.message}>
                                      {notification.message}
                                    </div>
                                  </TableCell>
                                  <TableCell>
                                    <Badge variant={(metadata as any)?.status === 'delivered' ? 'default' : (metadata as any)?.status === 'sent' ? 'outline' : 'destructive'}>
                                      {(metadata as any)?.status === 'delivered' ? t('notificationsPage.history.status.delivered') : 
                                       (metadata as any)?.status === 'sent' ? t('notificationsPage.history.status.sent') : 
                                       (metadata as any)?.status === 'undelivered' ? t('notificationsPage.history.status.undelivered') : 
                                       (metadata as any)?.status === 'failed' ? t('notificationsPage.history.status.failed') : t('notificationsPage.history.status.unknown')}
                                    </Badge>
                                  </TableCell>
                                </TableRow>
                              );
                            })}
                          </TableBody>
                        </Table>
                      )}
                    </TabsContent>
                  </Tabs>
                )}
              </CardContent>
            </Card>
          </TabsContent>
          
          {/* Tab per le impostazioni notifiche */}
          <TabsContent value="settings">
            <NotificationSettingsForm />
          </TabsContent>
          
          {/* Tab per Google Calendar */}
          <TabsContent value="calendar">
            <GoogleCalendarSettings />
          </TabsContent>
        </Tabs>
      </div>
      
      {/* Footer della pagina */}
      <FooterOnly />
    </div>
  );
};

export default NotificationsPage;