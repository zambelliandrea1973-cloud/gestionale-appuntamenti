import React, { useState, useEffect } from 'react';
// Rimosso import Layout per evitare layout annidati
import FooterOnly from '@/components/FooterOnly';
import { NotificationSettingsForm } from '@/components/NotificationSettingsForm';
import GoogleCalendarSettings from '@/components/GoogleCalendarSettings';
import { format, parseISO } from 'date-fns';
import { it } from 'date-fns/locale';
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
  const [appointments, setAppointments] = useState<Appointment[]>([]);
  const [groupedAppointments, setGroupedAppointments] = useState<GroupedAppointments>({});
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedAppointments, setSelectedAppointments] = useState<Record<number, boolean>>({});
  const [customMessage, setCustomMessage] = useState('');
  const [sendingNotifications, setSendingNotifications] = useState(false);
  const [activeTab, setActiveTab] = useState('upcoming');
  const [sentHistory, setSentHistory] = useState<any[]>([]);
  const [loadingHistory, setLoadingHistory] = useState(false);

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

  // Carica lo storico quando cambio tab
  useEffect(() => {
    if (activeTab === 'history') {
      fetchNotificationHistory();
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

  // Invia notifiche per gli appuntamenti selezionati
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
          title: 'Promemoria generati',
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
        description: `Impossibile inviare i promemoria: ${err.message}`,
        variant: 'destructive'
      });
    } finally {
      setSendingNotifications(false);
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
            <h1 className="text-2xl font-bold">Notifiche ai clienti</h1>
            <p className="text-muted-foreground">Gestisci i promemoria per gli appuntamenti dei clienti</p>
          </div>
          
          <div className="mt-4 md:mt-0 flex gap-2">
            <Button 
              variant="outline" 
              onClick={fetchUpcomingAppointments}
              disabled={loading}
            >
              <RefreshCw className={`h-4 w-4 mr-2 ${loading ? 'animate-spin' : ''}`} />
              Aggiorna
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
              Da inviare
            </TabsTrigger>
            <TabsTrigger value="history">
              <CheckCircle className="h-4 w-4 mr-2" />
              Cronologia
            </TabsTrigger>
            <TabsTrigger value="settings">
              <Bell className="h-4 w-4 mr-2" />
              Impostazioni notifiche
            </TabsTrigger>
            <TabsTrigger value="calendar">
              <Calendar className="h-4 w-4 mr-2" />
              Google Calendario
            </TabsTrigger>
          </TabsList>
          
          <TabsContent value="upcoming" className="space-y-4">
            <Alert variant="default" className="bg-muted">
              <Info className="h-4 w-4" />
              <AlertTitle>Come funzionano le notifiche ai clienti</AlertTitle>
              <AlertDescription>
                <ul className="list-disc pl-5 text-sm space-y-1 mt-2">
                  <li>Seleziona gli appuntamenti per cui vuoi inviare un promemoria</li>
                  <li>Clicca su "Genera notifiche" per creare i link</li>
                  <li>Verranno generati link che aprono WhatsApp con testi precompilati</li>
                  <li>Puoi personalizzare il testo standard prima dell'invio</li>
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
                <CardTitle className="text-base">Messaggio personalizzato (opzionale)</CardTitle>
                <CardDescription>
                  Se specificato, questo testo verrà aggiunto al messaggio standard
                </CardDescription>
              </CardHeader>
              <CardContent>
                <Textarea
                  placeholder="Es. Ricordo di portare con sé la documentazione medica precedente."
                  className="resize-none"
                  value={customMessage}
                  onChange={(e) => setCustomMessage(e.target.value)}
                />
              </CardContent>
              <CardFooter className="flex justify-between pt-0">
                <p className="text-sm text-muted-foreground">
                  {customMessage.length} caratteri
                </p>
                <Button 
                  variant="destructive" 
                  size="sm"
                  disabled={!customMessage.trim()}
                  onClick={() => setCustomMessage('')}
                >
                  Cancella
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
                      <p>Caricamento appuntamenti in corso...</p>
                    </div>
                  ) : (
                    <div className="flex flex-col items-center text-muted-foreground">
                      <MessageSquare className="h-10 w-10 mb-4" />
                      <p className="font-medium">Nessun appuntamento da notificare</p>
                      <p className="text-sm mt-1">
                        Non ci sono appuntamenti imminenti che richiedono promemoria.
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
                                Seleziona tutti
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
                                <TableHead>Cliente</TableHead>
                                <TableHead>Servizio</TableHead>
                                <TableHead>Orario</TableHead>
                                <TableHead className="text-right">Azioni</TableHead>
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
                                      <Send className="h-4 w-4 mr-1" />
                                      Invia
                                    </Button>
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
                      Generazione in corso...
                    </>
                  ) : (
                    <>
                      <MessageSquare className="h-4 w-4 mr-2" />
                      Genera notifiche
                    </>
                  )}
                </Button>
              </div>
            )}
          </TabsContent>
          
          <TabsContent value="history">
            <Card>
              <CardHeader>
                <CardTitle>Cronologia notifiche inviate</CardTitle>
                <CardDescription>
                  Ultimi promemoria inviati ai clienti
                </CardDescription>
              </CardHeader>
              <CardContent>
                {loadingHistory ? (
                  <div className="flex justify-center py-8">
                    <RefreshCw className="h-10 w-10 text-primary animate-spin" />
                  </div>
                ) : sentHistory.length === 0 ? (
                  <div className="text-center py-8 text-muted-foreground">
                    <CheckCircle className="h-8 w-8 mx-auto mb-4" />
                    <p>Nessuna notifica inviata recentemente</p>
                  </div>
                ) : (
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Data</TableHead>
                        <TableHead>Messaggio</TableHead>
                        <TableHead className="text-right">Azioni</TableHead>
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
                                  <span>Riapri</span>
                                </a>
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