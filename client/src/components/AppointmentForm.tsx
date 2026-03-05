import { useLocation } from "wouter";
import { useForm, useWatch } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { useMutation, useQuery } from "@tanstack/react-query";
import { queryClient, apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
// import { insertAppointmentSchema } from "../../../shared/schema"; // Rimosso per evitare limiti integer
import { Loader2, X, Calendar, Clock, Bell, MailIcon, Smartphone, MessageSquare, Users, Package, UserPlus } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
import { format } from "date-fns";
import { getDateLocale } from "@/lib/utils/date";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Checkbox } from "@/components/ui/checkbox";
import { Calendar as CalendarComponent } from "@/components/ui/calendar";
import { Alert, AlertDescription } from "@/components/ui/alert";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";


interface AppointmentFormProps {
  appointmentId?: number;
  onClose: () => void;
  onAppointmentSaved?: () => void;
  defaultDate?: Date;
  defaultTime?: string;
  clientId?: number;
  selectedSlots?: string[];
}

// Schema personalizzato per evitare limitazioni integer su timestamp ID
const formSchema = z.object({
  clientId: z.number({
    required_error: "Seleziona un cliente",
  }),
  serviceId: z.number({
    required_error: "Seleziona un servizio",
  }),
  staffId: z.number().nullable().optional(),
  roomId: z.number().nullable().optional(),
  packagePurchaseId: z.number().nullable().optional(),
  date: z.date({
    required_error: "Seleziona una data per l'appuntamento",
  }),
  startTime: z.string({
    required_error: "Seleziona un orario di inizio",
  }),
  endTime: z.string().nullable().optional(),
  notes: z.string().nullable().optional(),
  reminderType: z.string().nullable().optional(),
});

type FormData = z.infer<typeof formSchema>;

// Helper function to format date for API
function formatDateForApi(date: Date | string): string {
  if (typeof date === 'string') return date;
  return format(date, 'yyyy-MM-dd');
}

export default function AppointmentForm({
  appointmentId,
  onClose,
  onAppointmentSaved,
  defaultDate,
  defaultTime,
  clientId: defaultClientId,
  selectedSlots = [],
}: AppointmentFormProps) {
  const { toast } = useToast();
  const [, navigate] = useLocation();
  const [isClientDialogOpen, setIsClientDialogOpen] = useState(false);
  const [clientSearchTerm, setClientSearchTerm] = useState("");
  const [serviceSearchTerm, setServiceSearchTerm] = useState("");
  const [isClientDropdownOpen, setIsClientDropdownOpen] = useState(false);
  const [isServiceDropdownOpen, setIsServiceDropdownOpen] = useState(false);
  const [selectedClient, setSelectedClient] = useState<any>(null);
  // Mostra i dettagli solo se stiamo modificando un appuntamento o se vengono forniti valori predefiniti
  const [showDateTimeDetails, setShowDateTimeDetails] = useState(!!appointmentId || !!defaultDate || !!defaultTime);
  
  // Stati per controllare l'apertura dei selettori data/ora
  const [isCalendarOpen, setIsCalendarOpen] = useState(false);
  const [isTimePickerOpen, setIsTimePickerOpen] = useState(false);
  
  // Stato per la durata personalizzata dell'appuntamento (in minuti)
  const [customDuration, setCustomDuration] = useState<number | null>(null);
  
  // Stati per gestire conflitti orari
  const [conflictDialogOpen, setConflictDialogOpen] = useState(false);
  const [conflictDetails, setConflictDetails] = useState<{
    staffConflicts: any[];
    roomConflicts: any[];
  } | null>(null);
  const [pendingAppointmentData, setPendingAppointmentData] = useState<any>(null);
  
  // i18n
  const { t, i18n } = useTranslation();

  // Fetch current user
  const { data: currentUser } = useQuery({
    queryKey: ['/api/user'],
    queryFn: async () => {
      const response = await fetch('/api/user', { credentials: 'include' });
      if (!response.ok) throw new Error('Failed to fetch user');
      return response.json();
    }
  });

  // Fetch clients
  const { data: clients = [], isLoading: isLoadingClients } = useQuery({
    queryKey: ['/api/clients']
  });

  // Fetch services
  const { data: services = [], isLoading: isLoadingServices } = useQuery({
    queryKey: ['/api/services']
  });

  // Fetch collaborators - FORCE FRESH DATA
  const { data: collaborators = [], isLoading: isLoadingCollaborators, refetch: refetchCollaborators } = useQuery({
    queryKey: ['/api/collaborators'],
    staleTime: 0, // Always consider data stale
    gcTime: 0, // Don't cache the data
  });

  // Fetch treatment rooms - FORCE FRESH DATA
  const { data: treatmentRooms = [], isLoading: isLoadingRooms, refetch: refetchRooms } = useQuery({
    queryKey: ['/api/treatment-rooms'],
    staleTime: 0, // Always consider data stale
    gcTime: 0, // Don't cache the data
  });

  // Form setup - DEVE ESSERE PRIMA di qualsiasi useEffect che lo utilizza
  const form = useForm<FormData>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      clientId: defaultClientId || 0,
      serviceId: 0,
      staffId: undefined,
      roomId: undefined,
      date: defaultDate || new Date(),
      startTime: defaultTime || "09:00",
      notes: "",
      reminderType: "whatsapp" // Imposta solo WhatsApp come valore predefinito
    }
  });

  // Auto-seleziona il primo collaboratore quando i dati sono caricati
  useEffect(() => {
    if (collaborators && collaborators.length > 0 && !appointmentId) {
      // Precompila solo se non stiamo modificando un appuntamento esistente
      const firstCollaborator = collaborators[0];
      form.setValue('staffId', firstCollaborator.id);
    }
  }, [collaborators, appointmentId]);

  // Fetch appointment if editing
  const { data: appointment, isLoadingAppointment } = useQuery({
    queryKey: [`/api/appointments/${appointmentId}`],
    enabled: !!appointmentId,
    staleTime: Infinity,
    refetchOnWindowFocus: false,
    refetchOnMount: false,
    refetchOnReconnect: false
  });

  // Update form values when editing existing appointment
  useEffect(() => {
    if (appointment) {
      // Parse the date string into a Date object
      const appointmentDate = new Date(appointment.date);
      const startTime = appointment.startTime.substring(0, 5); // Extract HH:MM part
      
      form.reset({
        ...appointment,
        date: appointmentDate,
        startTime: startTime
      });
    }
  }, [appointment]);

  // Update clientId when defaultClientId changes
  useEffect(() => {
    if (defaultClientId) {
      form.setValue("clientId", defaultClientId);
    }
  }, [defaultClientId]);

  // Track selected client for warnings - use useWatch for reliability
  const watchedClientId = useWatch({ control: form.control, name: "clientId" });
  
  // Fetch pacchetti attivi del cliente selezionato
  const { data: clientPackages = [] } = useQuery({
    queryKey: ['/api/packages/purchases', watchedClientId],
    enabled: !!watchedClientId && watchedClientId > 0,
    select: (data: any[]) => {
      // Filtra solo pacchetti attivi con sessioni rimanenti
      return data.filter((pkg: any) => 
        pkg.status === 'active' && pkg.sessionsRemaining > 0
      );
    }
  });
  
  useEffect(() => {
    const client = clients.find((c: any) => c.id === watchedClientId);
    setSelectedClient(client || null);
    
    // Debug forzato
    if (client) {
      const clientOwnerId = client.ownerId || client.originalOwnerId;
      const isOther = currentUser?.type === 'admin' && clientOwnerId && clientOwnerId !== currentUser.id;
      console.log(`🔍 [APPOINTMENT FORM] Cliente selezionato ${client.firstName} ${client.lastName}:`, {
        clientId: client.id,
        ownerId: client.ownerId,
        originalOwnerId: client.originalOwnerId,
        clientOwnerId,
        currentUserId: currentUser?.id,
        isOtherAccount: isOther
      });
    }
  }, [watchedClientId, clients, currentUser]);
  
  // Gestione del click fuori dai popover per chiuderli
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      // Chiudi i popover quando si clicca altrove
      if (isCalendarOpen || isTimePickerOpen) {
        const target = event.target as HTMLElement;
        
        // Se il click non è all'interno di un popover, chiudili
        if (!target.closest('.popover-content')) {
          setIsCalendarOpen(false);
          setIsTimePickerOpen(false);
        }
      }
    };
    
    document.addEventListener('mousedown', handleClickOutside);
    
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [isCalendarOpen, isTimePickerOpen]);

  // Create or update appointment mutation
  const mutation = useMutation({
    mutationFn: async (data: FormData) => {
      console.log("=== MUTATION FUNCTION INIZIATA ===");
      console.log("Tentativo di salvataggio appuntamento con dati:", data);
      
      // Controlli preliminari
      if (!data.clientId || !data.serviceId || !data.date || !data.startTime) {
        console.error("ERRORE: Dati incompleti per l'appuntamento", {
          clientId: data.clientId,
          serviceId: data.serviceId,
          date: data.date,
          startTime: data.startTime
        });
        throw new Error("Dati incompleti per l'appuntamento");
      }
      
      // Calcola l'orario di fine in base alla durata del servizio o alla durata personalizzata
      const service = services.find((s: any) => s.id === data.serviceId);
      if (!service) {
        throw new Error("Servizio non trovato");
      }
      
      // Calcola l'orario di fine utilizzando la durata personalizzata se disponibile
      const [hours, minutes] = data.startTime.split(':').map(Number);
      const startMinutes = hours * 60 + minutes;
      const endMinutes = startMinutes + (customDuration !== null ? customDuration : service.duration);
      
      const endHours = Math.floor(endMinutes / 60);
      const endMins = endMinutes % 60;
      
      const endTime = `${endHours.toString().padStart(2, '0')}:${endMins.toString().padStart(2, '0')}:00`;
      
      // Prepara i dati per l'invio
      const appointmentData = {
        clientId: data.clientId,
        serviceId: data.serviceId,
        staffId: data.staffId || null,
        roomId: data.roomId || null,
        date: formatDateForApi(data.date),
        startTime: data.startTime + ":00",
        endTime: endTime,
        notes: data.notes || "",
        reminderType: data.reminderType || "",
        status: "scheduled"
      };
      
      console.log("Dati formattati per API:", appointmentData);
      
      // Esegui la chiamata API
      const url = appointmentId 
        ? `/api/appointments/${appointmentId}` 
        : "/api/appointments";
      
      const method = appointmentId ? "PUT" : "POST";
      
      // Utilizziamo apiRequest al posto di fetch diretto
      console.log(`Invio richiesta ${method} a ${url} con dati:`, appointmentData);
      
      try {
        const response = await apiRequest(method, url, appointmentData);
        const responseData = await response.json();
        console.log("Risposta server ricevuta:", responseData);
        return responseData;
      } catch (error) {
        console.error("Errore durante la richiesta API:", error);
        throw error;
      }
    },
    
    onSuccess: async (data) => {
      console.log("Appuntamento salvato con successo:", data);
      
      toast({
        title: appointmentId ? "Appuntamento aggiornato" : "Appuntamento creato",
        description: appointmentId 
          ? "L'appuntamento è stato aggiornato con successo" 
          : "Nuovo appuntamento creato con successo",
      });
      
      // Invalidate all related queries
      console.log("🔄 Sistema multi-tenant: invalidazione cache appuntamenti...");
      
      // Invalidate general appointments list
      await queryClient.invalidateQueries({ queryKey: ['/api/appointments'] });
      
      // Invalidate the specific date for this appointment
      const appointmentDate = formatDateForApi(data.date);
      await queryClient.invalidateQueries({ 
        queryKey: [`/api/appointments/date/${appointmentDate}`] 
      });
      
      // Invalidate surrounding dates to ensure calendar updates
      const today = new Date(data.date);
      for (let i = -2; i <= 2; i++) {
        const date = new Date(today);
        date.setDate(date.getDate() + i);
        const formattedDate = formatDateForApi(date);
        await queryClient.invalidateQueries({ 
          queryKey: [`/api/appointments/date/${formattedDate}`] 
        });
      }
      
      // Invalidate client-specific queries
      if (data.clientId) {
        await queryClient.invalidateQueries({ 
          queryKey: [`/api/appointments/client/${data.clientId}`] 
        });
      }
      
      // Force refresh of all appointment-related queries
      await queryClient.refetchQueries({ 
        queryKey: ['/api/appointments'],
        type: 'all'
      });
      
      console.log("✅ Sistema multi-tenant: cache invalidata con successo");
      
      // Notifica che l'appuntamento è stato salvato
      if (onAppointmentSaved) {
        console.log("Chiamata callback onAppointmentSaved");
        onAppointmentSaved();
      } else {
        // Se non c'è il callback specifico, chiudi la form dopo un breve ritardo
        setTimeout(() => {
          onClose();
        }, 100);
      }
    },
    
    onError: (error) => {
      console.error("Errore durante il salvataggio dell'appuntamento:", error);
      toast({
        title: "Errore",
        description: `Si è verificato un errore: ${error.message}`,
        variant: "destructive",
      });
    }
  });

  // Funzione per salvare l'appuntamento (senza controllo conflitti)
  const saveAppointment = async (data: FormData) => {
    try {
      console.log("Invio dati alla mutation...");
      
      // WORKAROUND: Bypass the mutation and make a direct API call
      console.log("TENTATIVO DIRETTO: Bypassing the mutation system");
      
      const selectedService = services.find((s: any) => s.id === data.serviceId);
      
      // Calcola l'orario di fine utilizzando la durata personalizzata se disponibile
      const [hours, minutes] = data.startTime.split(':').map(Number);
      const startMinutes = hours * 60 + minutes;
      const endMinutes = startMinutes + (customDuration !== null ? customDuration : (selectedService?.duration || 60));
      
      const endHours = Math.floor(endMinutes / 60);
      const endMins = endMinutes % 60;
      
      const endTime = `${endHours.toString().padStart(2, '0')}:${endMins.toString().padStart(2, '0')}:00`;
      
      // Prepara i dati per l'invio
      const appointmentData = {
        clientId: data.clientId,
        serviceId: data.serviceId,
        staffId: data.staffId || null,
        roomId: data.roomId || null,
        packagePurchaseId: data.packagePurchaseId || null,
        date: formatDateForApi(data.date),
        startTime: data.startTime + ":00",
        endTime: endTime,
        notes: data.notes || "",
        reminderType: (data as any).reminderType || "",
        status: "scheduled"
      };
      
      console.log("Dati formattati per API DIRETTA:", appointmentData);
      
      // Esegui la chiamata diretta
      const url = appointmentId 
        ? `/api/appointments/${appointmentId}` 
        : "/api/appointments";
      
      const method = appointmentId ? "PUT" : "POST";
      
      console.log(`Invio richiesta DIRETTA ${method} a ${url} con dati:`, appointmentData);
      
      const response = await apiRequest(method, url, appointmentData);
      
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }
      
      const result = await response.json();
      console.log("RISPOSTA DIRETTA RICEVUTA:", result);
      
      // Invalida tutte le query relative agli appuntamenti
      console.log("Invalidazione diretta delle query");
      await queryClient.invalidateQueries({ queryKey: ['/api/appointments'] });
      
      // Invalida anche le query per data specifica per i prossimi 30 giorni
      const today = new Date();
      for (let i = -7; i < 30; i++) {
        const date = new Date(today);
        date.setDate(date.getDate() + i);
        const formattedDate = formatDateForApi(date);
        await queryClient.invalidateQueries({ 
          queryKey: [`/api/appointments/date/${formattedDate}`] 
        });
      }
      
      // Forza il refetch immediato delle query principali
      await queryClient.refetchQueries({ queryKey: ['/api/appointments'] });
      await queryClient.refetchQueries({ queryKey: [`/api/appointments/date/${formatDateForApi(data.date)}`] });
      
      // Notifica successo
      toast({
        title: appointmentId ? "Appuntamento aggiornato" : "Appuntamento creato",
        description: appointmentId 
          ? "L'appuntamento è stato aggiornato con successo" 
          : "Nuovo appuntamento creato con successo",
      });
      
      // Chiudi la form
      console.log("Chiusura form dopo successo richiesta diretta");
      
      // Notifica che l'appuntamento è stato salvato
      if (onAppointmentSaved) {
        console.log("Chiamata callback onAppointmentSaved (dopo richiesta diretta)");
        onAppointmentSaved();
      } else {
        // Se non c'è il callback specifico, chiudi la form
        console.log("Chiusura form senza callback specifico");
        onClose();
      }
    } catch (error: any) {
      console.error("ERRORE DURANTE SALVATAGGIO:", error);
      toast({
        title: "Errore durante il salvataggio",
        description: `Si è verificato un errore: ${error.message}`,
        variant: "destructive"
      });
      throw error;
    }
  };

  // Funzione per gestire la conferma dopo rilevamento conflitti
  const handleConflictConfirm = async () => {
    if (!pendingAppointmentData) return;
    
    console.log("✅ Utente ha confermato di procedere nonostante i conflitti");
    setConflictDialogOpen(false);
    
    try {
      await saveAppointment(pendingAppointmentData);
    } catch (error) {
      console.error("Errore durante salvataggio dopo conferma conflitti");
    }
    
    setPendingAppointmentData(null);
    setConflictDetails(null);
  };

  // Funzione per controllare conflitti di orario
  const checkConflicts = async (appointmentData: any) => {
    try {
      // Recupera tutti gli appuntamenti della stessa data
      const dateStr = formatDateForApi(appointmentData.date);
      const response = await fetch(`/api/appointments/date/${dateStr}`);
      if (!response.ok) {
        console.error("Errore nel caricamento appuntamenti per controllo conflitti");
        return { staffConflicts: [], roomConflicts: [] };
      }
      
      const dayAppointments = await response.json();
      
      // Calcola orario fine del nuovo appuntamento
      const selectedService = services.find((s: any) => s.id === appointmentData.serviceId);
      const [startHours, startMinutes] = appointmentData.startTime.split(':').map(Number);
      const startMinutesTotal = startHours * 60 + startMinutes;
      const duration = customDuration !== null ? customDuration : (selectedService?.duration || 60);
      const endMinutesTotal = startMinutesTotal + duration;
      
      const staffConflicts: any[] = [];
      const roomConflicts: any[] = [];
      
      // Controlla ogni appuntamento esistente
      dayAppointments.forEach((apt: any) => {
        // Salta l'appuntamento che stiamo modificando
        if (appointmentId && apt.id === appointmentId) {
          return;
        }
        
        // Calcola range orario dell'appuntamento esistente
        const [aptStartH, aptStartM] = apt.startTime.split(':').map(Number);
        const [aptEndH, aptEndM] = apt.endTime.split(':').map(Number);
        const aptStartMin = aptStartH * 60 + aptStartM;
        const aptEndMin = aptEndH * 60 + aptEndM;
        
        // Verifica sovrapposizione oraria
        const hasOverlap = !(endMinutesTotal <= aptStartMin || startMinutesTotal >= aptEndMin);
        
        if (hasOverlap) {
          // Conflitto professionista
          if (appointmentData.staffId && apt.staffId && appointmentData.staffId === apt.staffId) {
            const staff = collaborators.find((c: any) => c.id === apt.staffId);
            staffConflicts.push({
              appointment: apt,
              staffName: staff ? `${staff.firstName} ${staff.lastName}` : 'Professionista',
              time: `${apt.startTime.substring(0, 5)} - ${apt.endTime.substring(0, 5)}`
            });
          }
          
          // Conflitto stanza
          if (appointmentData.roomId && apt.roomId && appointmentData.roomId === apt.roomId) {
            const room = treatmentRooms.find((r: any) => r.id === apt.roomId);
            roomConflicts.push({
              appointment: apt,
              roomName: room ? room.name : 'Stanza',
              time: `${apt.startTime.substring(0, 5)} - ${apt.endTime.substring(0, 5)}`
            });
          }
        }
      });
      
      return { staffConflicts, roomConflicts };
    } catch (error) {
      console.error("Errore nel controllo conflitti:", error);
      return { staffConflicts: [], roomConflicts: [] };
    }
  };

  const onSubmit = async (data: FormData) => {
    try {
      console.log("=== INIZIO PROCESSO SALVATAGGIO APPUNTAMENTO ===");
      console.log("Dati form:", data);
      
      // Controllo se il cliente è di un altro account e chiedi conferma
      const client = clients.find((c: any) => c.id === data.clientId);
      const clientOwnerId = client?.ownerId || client?.originalOwnerId;
      if (currentUser?.type === 'admin' && client && clientOwnerId && clientOwnerId !== currentUser.id) {
        const confirmed = window.confirm(
          `ATTENZIONE: Stai per creare un appuntamento per ${client.firstName} ${client.lastName}, ` +
          `che appartiene a un altro account.\n\n` +
          `Sei sicuro di voler procedere?`
        );
        
        if (!confirmed) {
          console.log("Salvataggio annullato dall'utente");
          return;
        }
      }
      
      // 🚨 DEBUG CRITICO: Verifica dei valori del form
      console.log("🔍 [SUBMIT DEBUG] staffId dal form:", data.staffId, typeof data.staffId);
      console.log("🔍 [SUBMIT DEBUG] roomId dal form:", data.roomId, typeof data.roomId);
      
      // Verifica anche i valori direttamente dal form state
      const formValues = form.getValues();
      console.log("🔍 [FORM STATE] staffId:", formValues.staffId, typeof formValues.staffId);
      console.log("🔍 [FORM STATE] roomId:", formValues.roomId, typeof formValues.roomId);
      console.log("🔍 [FORM STATE] tutti i valori:", formValues);
      console.log(`Client ID: ${data.clientId}, Service ID: ${data.serviceId}`);
      console.log(`Data: ${data.date}, Ora: ${data.startTime}`);
      
      // Controlli di validità
      if (!data.clientId || data.clientId === 0) {
        console.error("Cliente non selezionato!");
        toast({
          title: "Errore",
          description: "Seleziona un cliente per l'appuntamento",
          variant: "destructive"
        });
        return;
      }
      
      if (!data.serviceId || data.serviceId === 0) {
        console.error("Servizio non selezionato!");
        toast({
          title: "Errore",
          description: "Seleziona un servizio per l'appuntamento",
          variant: "destructive"
        });
        return;
      }
      
      // Check if client has provided consent
      const selectedClient = clients.find((c: any) => c.id === data.clientId);
      if (selectedClient && !selectedClient.hasConsent) {
        // Show a warning but allow to proceed
        toast({
          title: "Attenzione",
          description: "Il cliente non ha fornito il consenso al trattamento dei dati. L'appuntamento verrà comunque creato.",
          variant: "destructive",
          duration: 5000,
        });
      }
      
      // Log client e service
      console.log("Cliente selezionato:", selectedClient);
      const selectedService = services.find((s: any) => s.id === data.serviceId);
      console.log("Servizio selezionato:", selectedService);
      
      // Controllo conflitti di orario (professionista/stanza)
      console.log("🔍 Controllo conflitti di orario...");
      const conflicts = await checkConflicts(data);
      
      if (conflicts.staffConflicts.length > 0 || conflicts.roomConflicts.length > 0) {
        // Ci sono conflitti - mostra dialog di conferma
        console.log("⚠️ Conflitti trovati:", conflicts);
        setConflictDetails(conflicts);
        setPendingAppointmentData(data);
        setConflictDialogOpen(true);
        return; // Aspetta conferma dall'utente
      }
      
      // Nessun conflitto - salva direttamente
      console.log("✅ Nessun conflitto rilevato - procedo con salvataggio");
      await saveAppointment(data);
      
    } catch (error: any) {
      console.error("ERRORE CRITICO durante la preparazione dei dati:", error);
      toast({
        title: "Errore",
        description: `Si è verificato un errore: ${error.message}`,
        variant: "destructive"
      });
    }
  };

  const handleClientCreated = (newClientId: number) => {
    form.setValue("clientId", newClientId);
    setIsClientDialogOpen(false);
    queryClient.invalidateQueries({ queryKey: ['/api/clients'] });
  };

  const [isCreatingQuickClient, setIsCreatingQuickClient] = useState(false);

  const createQuickClient = async (searchTerm: string, field: any) => {
    if (isCreatingQuickClient) return;
    setIsCreatingQuickClient(true);
    try {
      const parts = searchTerm.trim().split(/\s+/);
      const firstName = parts[0] || searchTerm.trim();
      const lastName = parts.slice(1).join(' ') || '-';

      const response = await apiRequest('POST', '/api/clients', {
        firstName,
        lastName,
        phone: '',
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.message || 'Errore nella creazione del cliente');
      }

      await queryClient.invalidateQueries({ queryKey: ['/api/clients'] });

      field.onChange(data.id);
      setClientSearchTerm(`${data.firstName} ${data.lastName}`);
      setIsClientDropdownOpen(false);

      toast({
        title: "Cliente creato",
        description: `${data.firstName} ${data.lastName} creato. Potrai completare i dati in seguito.`,
      });
    } catch (error: any) {
      toast({
        title: "Errore",
        description: error.message || 'Impossibile creare il cliente',
        variant: "destructive",
      });
    } finally {
      setIsCreatingQuickClient(false);
    }
  };

  // Loading state
  const isLoading = isLoadingClients || isLoadingServices || isLoadingCollaborators || isLoadingRooms || (appointmentId && isLoadingAppointment);

  return (
    <div className="bg-white rounded-lg shadow-lg p-4 overflow-auto max-h-[85vh] sm:max-w-[600px]">
      <div className="flex justify-between items-center mb-4">
        <h2 className="text-xl font-bold">
          {appointmentId ? "Modifica Appuntamento" : "Nuovo Appuntamento"}
        </h2>
        <Button 
          variant="ghost" 
          size="icon" 
          onClick={onClose}
          disabled={mutation.isPending}
        >
          <X className="h-4 w-4" />
        </Button>
      </div>
      
      {isLoading ? (
        <div className="flex justify-center p-6">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
        </div>
      ) : (
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit, (errors) => {
            console.error("❌ [APPOINTMENT FORM] Errori validazione:", JSON.stringify(errors, null, 2));
            const errorFields = Object.keys(errors);
            toast({
              title: "Errore di validazione",
              description: `Campi con errori: ${errorFields.join(', ')}`,
              variant: "destructive"
            });
          })} className="space-y-4">
            {/* Warning per cliente di altro account */}
            {selectedClient && currentUser?.type === 'admin' && (selectedClient.ownerId || selectedClient.originalOwnerId) !== currentUser.id && (
              <Alert className="border-orange-300 bg-orange-50">
                <Users className="h-4 w-4 text-orange-600" />
                <AlertDescription className="text-orange-800">
                  <strong>Attenzione:</strong> Stai creando un appuntamento per un cliente di un altro account ({selectedClient.firstName} {selectedClient.lastName}). 
                  Verifica di avere i permessi necessari prima di procedere.
                </AlertDescription>
              </Alert>
            )}

            {/* Client selector (visible only if no default client) */}
            {!defaultClientId ? (
              <FormField
                control={form.control}
                name="clientId"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Cliente</FormLabel>
                    <FormControl>
                      <div className="relative">
                        <Input 
                          placeholder="Cerca cliente..." 
                          value={clientSearchTerm}
                          onChange={(e) => setClientSearchTerm(e.target.value)}
                          onFocus={() => setIsClientDropdownOpen(true)}
                          onBlur={() => {
                            // Ritardo per permettere il click sulle opzioni
                            setTimeout(() => setIsClientDropdownOpen(false), 200);
                          }}
                          className="w-full"
                        />
                        
                        {/* Mostra il valore selezionato solo se non c'è testo nella ricerca */}
                        {(() => {
                          if (clientSearchTerm) return null;
                          const selectedClient = clients.find((c: any) => c.id === field.value);
                          return selectedClient ? (
                            <div className="absolute right-3 top-1/2 transform -translate-y-1/2 text-sm text-muted-foreground opacity-70">
                              {selectedClient.firstName} {selectedClient.lastName}
                            </div>
                          ) : null;
                        })()}
                        
                        {/* Lista dei risultati filtrati */}
                        {isClientDropdownOpen && (
                          <div className="absolute top-full left-0 w-full max-h-48 overflow-y-auto z-10 bg-white border rounded-md shadow-lg mt-1">
                            {(() => {
                              const filteredClients = clients.filter((client: any) => 
                                clientSearchTerm.length === 0 || 
                                `${client.firstName} ${client.lastName}`
                                  .toLowerCase()
                                  .includes(clientSearchTerm.toLowerCase())
                              );
                              const showQuickCreate = clientSearchTerm.trim().length >= 2 && filteredClients.length === 0;
                              return (
                                <>
                                  {filteredClients.map((client: any) => {
                                    const clientOwnerId = client.ownerId || client.originalOwnerId;
                                    const isOtherAccount = currentUser?.type === 'admin' && clientOwnerId && clientOwnerId !== currentUser.id;
                                    return (
                                      <div 
                                        key={client.id} 
                                        className={`p-2 hover:bg-slate-100 cursor-pointer flex items-center justify-between ${isOtherAccount ? 'bg-orange-50/50' : ''}`}
                                        onClick={() => {
                                          field.onChange(client.id);
                                          setClientSearchTerm(`${client.firstName} ${client.lastName}`);
                                          setIsClientDropdownOpen(false);
                                        }}
                                      >
                                        <span>{client.firstName} {client.lastName}</span>
                                        {isOtherAccount && (
                                          <span className="flex items-center text-xs text-orange-600">
                                            <Users className="h-3 w-3 mr-1" />
                                            Altro account
                                          </span>
                                        )}
                                      </div>
                                    );
                                  })}
                                  {showQuickCreate && (
                                    <div
                                      className="p-3 hover:bg-green-50 cursor-pointer border-t border-dashed flex items-center gap-2 text-green-700 font-medium"
                                      onClick={() => createQuickClient(clientSearchTerm, field)}
                                    >
                                      <UserPlus className="h-4 w-4" />
                                      {isCreatingQuickClient ? (
                                        <span className="flex items-center gap-2">
                                          <Loader2 className="h-3 w-3 animate-spin" />
                                          Creazione in corso...
                                        </span>
                                      ) : (
                                        <span>+ Crea "<strong>{clientSearchTerm.trim()}</strong>" come nuovo cliente</span>
                                      )}
                                    </div>
                                  )}
                                </>
                              );
                            })()}
                          </div>
                        )}
                      </div>
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            ) : (
              // If there's a default client, just show their name
              <FormField
                control={form.control}
                name="clientId"
                render={({ field }) => {
                  const selectedClient = clients.find((c: any) => c.id === field.value);
                  return (
                    <FormItem>
                      <FormLabel>Cliente</FormLabel>
                      <div className="p-2 bg-muted rounded-md">
                        {selectedClient ? (
                          <div className="font-medium">{selectedClient.firstName} {selectedClient.lastName}</div>
                        ) : (
                          <div className="text-muted-foreground">Caricamento dati cliente...</div>
                        )}
                      </div>
                      <FormMessage />
                    </FormItem>
                  );
                }}
              />
            )}
            
            {/* Service selector */}
            <FormField
              control={form.control}
              name="serviceId"
              render={({ field }) => {
                // Estrai serviceIds dai pacchetti attivi del cliente
                const packageServiceIds = new Set(
                  clientPackages.flatMap((pkg: any) => pkg.serviceIds || [])
                );
                
                // Trova quale pacchetto usa ciascun servizio
                const getPackageForService = (serviceId: number) => {
                  return clientPackages.find((pkg: any) => 
                    pkg.serviceIds?.includes(serviceId)
                  );
                };
                
                // Filtra e ordina i servizi: prima quelli dei pacchetti, poi gli altri
                const filteredServices = services
                  .filter((service: any) =>
                    serviceSearchTerm.length === 0 || 
                    service.name.toLowerCase().includes(serviceSearchTerm.toLowerCase())
                  )
                  .sort((a: any, b: any) => {
                    const aInPackage = packageServiceIds.has(a.id);
                    const bInPackage = packageServiceIds.has(b.id);
                    if (aInPackage && !bInPackage) return -1;
                    if (!aInPackage && bInPackage) return 1;
                    return 0;
                  });
                
                return (
                  <FormItem>
                    <FormLabel>Servizio</FormLabel>
                    <FormControl>
                      <div className="relative">
                        <Input 
                          placeholder="Cerca servizio..." 
                          value={serviceSearchTerm}
                          onChange={(e) => setServiceSearchTerm(e.target.value)}
                          onFocus={() => setIsServiceDropdownOpen(true)}
                          onBlur={() => {
                            // Ritardo per permettere il click sulle opzioni
                            setTimeout(() => setIsServiceDropdownOpen(false), 200);
                          }}
                          className="w-full"
                        />
                        
                        {/* Mostra il valore selezionato solo se non c'è testo nella ricerca */}
                        {(() => {
                          if (serviceSearchTerm) return null;
                          const selectedService = services.find((s: any) => s.id === field.value);
                          return selectedService ? (
                            <div className="absolute right-3 top-1/2 transform -translate-y-1/2 text-sm text-muted-foreground opacity-70">
                              {selectedService.name}
                            </div>
                          ) : null;
                        })()}
                        
                        {/* Lista dei risultati filtrati */}
                        {isServiceDropdownOpen && (
                          <div className="absolute top-full left-0 w-full max-h-48 overflow-y-auto z-10 bg-white border rounded-md shadow-lg mt-1">
                            {services.length === 0 ? (
                              <div className="p-3 text-center">
                                <p className="text-sm text-muted-foreground mb-2">
                                  {t('calendar.noServicesAvailable', 'Nessun servizio disponibile')}
                                </p>
                                <button 
                                  type="button"
                                  className="text-sm text-primary font-medium hover:underline cursor-pointer"
                                  onMouseDown={(e) => {
                                    e.preventDefault();
                                    e.stopPropagation();
                                    if (onClose) onClose();
                                    navigate('/settings?section=services');
                                  }}
                                >
                                  {t('calendar.goToSettingsToCreateService', 'Vai alle Impostazioni per creare un servizio')}
                                </button>
                              </div>
                            ) : filteredServices.length === 0 ? (
                              <div className="p-3 text-center text-sm text-muted-foreground">
                                {t('calendar.noServicesFound', 'Nessun servizio trovato')}
                              </div>
                            ) : null}
                            {filteredServices.map((service: any) => {
                              const isFromPackage = packageServiceIds.has(service.id);
                              const packageForService = isFromPackage ? getPackageForService(service.id) : null;
                              
                              return (
                                <div 
                                  key={service.id} 
                                  className={`p-2 hover:bg-slate-100 cursor-pointer ${isFromPackage ? 'bg-amber-50 border-l-2 border-amber-500' : ''}`}
                                  onClick={() => {
                                    field.onChange(service.id);
                                    setServiceSearchTerm(service.name);
                                    setIsServiceDropdownOpen(false);
                                    setCustomDuration(service.duration);
                                    
                                    // Imposta packagePurchaseId se è un servizio del pacchetto
                                    if (packageForService) {
                                      form.setValue('packagePurchaseId', packageForService.id);
                                      console.log("📦 Servizio da pacchetto selezionato, packagePurchaseId:", packageForService.id);
                                    } else {
                                      form.setValue('packagePurchaseId', undefined);
                                    }
                                  }}
                                >
                                  <div className="flex items-center justify-between">
                                    <span>{service.name} - {service.duration} min</span>
                                    {isFromPackage && packageForService && (
                                      <Badge variant="secondary" className="ml-2 bg-amber-100 text-amber-800 text-xs">
                                        Pacchetto ({packageForService.sessionsRemaining} disponibili)
                                      </Badge>
                                    )}
                                  </div>
                                </div>
                              );
                            })}
                          </div>
                        )}
                      </div>
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                );
              }}
            />
            
            {/* Sezione per durata personalizzata - mostrata solo se un servizio è selezionato */}
            {form.watch("serviceId") > 0 && customDuration !== null && (
              <div className="mt-4 p-3 border border-blue-200 rounded-md bg-blue-50">
                <div className="flex items-center justify-between">
                  <div>
                    <h4 className="text-sm font-medium text-blue-800">{t('calendar.customDuration')}</h4>
                    <p className="text-xs text-blue-600 mt-1">
                      {(() => {
                        const selectedService = services.find((s: any) => s.id === form.getValues().serviceId);
                        return selectedService ? 
                          `${selectedService.name}: ${customDuration} min` : 
                          `Durata: ${customDuration} min`;
                      })()}
                    </p>
                  </div>
                  <div className="flex space-x-2">
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      className="h-8 px-2 text-xs"
                      onClick={() => {
                        if (customDuration > 15) {
                          setCustomDuration(customDuration - 15);
                        }
                      }}
                      title={t('calendar.decrementBy15Min')}
                    >
                      -15
                    </Button>
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      className="h-8 px-2 text-xs"
                      onClick={() => {
                        setCustomDuration(customDuration + 15);
                      }}
                      title={t('calendar.incrementBy15Min')}
                    >
                      +15
                    </Button>
                  </div>
                </div>
              </div>
            )}
            
            {/* Collaboratori e Stanze - mostrati sempre */}
            <div>
            {/* DEBUG: Forza visualizzazione */}
              <div className="grid grid-cols-2 gap-4">
                {/* Collaboratore/Staff */}
                <FormField
                  control={form.control}
                  name="staffId"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Professionista</FormLabel>
                      <FormControl>
                        <Select
                          value={field.value?.toString() || "none"}
                          onValueChange={(value) => {
                            console.log('🎯 COLLABORATORE SELEZIONATO:', value);
                            console.log('🎯 [STAFFID DEBUG] Value ricevuto:', value, typeof value);
                            const staffIdValue = value !== "none" ? parseInt(value) : undefined;
                            console.log('🎯 [STAFFID DEBUG] Valore convertito:', staffIdValue, typeof staffIdValue);
                            field.onChange(staffIdValue);
                            console.log('🎯 [STAFFID DEBUG] field.onChange chiamato con:', staffIdValue);
                            
                            // Verifica immediata del form state
                            setTimeout(() => {
                              const currentValue = form.getValues('staffId');
                              console.log('🎯 [STAFFID DEBUG] Valore nel form dopo onChange:', currentValue);
                            }, 100);
                          }}
                          onOpenChange={(open) => {
                            console.log('🔍 DROPDOWN COLLABORATORI:', open ? 'APERTO' : 'CHIUSO');
                            if (open) {
                              console.log('📊 COLLABORATORI DISPONIBILI NEL DROPDOWN:', collaborators?.length || 0);
                              console.log('📋 LISTA COLLABORATORI:', collaborators);
                            }
                          }}
                        >
                          <SelectTrigger>
                            <SelectValue placeholder="Seleziona professionista..." />
                          </SelectTrigger>
                          <SelectContent className="z-[9999] max-h-[200px] overflow-y-auto bg-white border shadow-lg">
                            <SelectItem value="none">Nessun professionista</SelectItem>
                            {collaborators
                              // TEMP: rimuovo il filtro isActive per debug
                              // .filter((collaborator: any) => collaborator.isActive)
                              .map((collaborator: any) => {
                                console.log('🔨 RENDERING COLLABORATORE:', collaborator);
                                return (
                                  <SelectItem key={collaborator.id} value={collaborator.id.toString()}>
                                    {collaborator.firstName} {collaborator.lastName}
                                    {collaborator.specialization && (
                                      <span className="text-sm text-muted-foreground ml-2">
                                        - {collaborator.specialization}
                                      </span>
                                    )}
                                  </SelectItem>
                                );
                              })}
                          </SelectContent>
                        </Select>
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                {/* Stanza/Cabina */}
                <FormField
                  control={form.control}
                  name="roomId"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Stanza/Cabina (opzionale)</FormLabel>
                      <FormControl>
                        <Select
                          value={field.value?.toString() || "none"}
                          onValueChange={(value) => {
                            console.log('🏠 STANZA SELEZIONATA:', value);
                            console.log('🏠 [ROOMID DEBUG] Value ricevuto:', value, typeof value);
                            const roomIdValue = value !== "none" ? parseInt(value) : undefined;
                            console.log('🏠 [ROOMID DEBUG] Valore convertito:', roomIdValue, typeof roomIdValue);
                            field.onChange(roomIdValue);
                            console.log('🏠 [ROOMID DEBUG] field.onChange chiamato con:', roomIdValue);
                            
                            // Verifica immediata del form state
                            setTimeout(() => {
                              const currentValue = form.getValues('roomId');
                              console.log('🏠 [ROOMID DEBUG] Valore nel form dopo onChange:', currentValue);
                            }, 100);
                          }}
                          onOpenChange={(open) => {
                            console.log('🔍 DROPDOWN STANZE:', open ? 'APERTO' : 'CHIUSO');
                            if (open) {
                              console.log('📊 STANZE DISPONIBILI NEL DROPDOWN:', treatmentRooms?.length || 0);
                              console.log('📋 LISTA STANZE:', treatmentRooms);
                            }
                          }}
                        >
                          <SelectTrigger>
                            <SelectValue placeholder="Seleziona stanza..." />
                          </SelectTrigger>
                          <SelectContent className="z-[9999] max-h-[200px] overflow-y-auto bg-white border shadow-lg">
                            <SelectItem value="none">Nessuna stanza</SelectItem>
                            {treatmentRooms
                              // TEMP: rimuovo il filtro isActive per debug
                              // .filter((room: any) => room.isActive)
                              .map((room: any) => {
                                console.log('🏗️ RENDERING STANZA:', room);
                                return (
                                  <SelectItem key={room.id} value={room.id.toString()}>
                                    <div className="flex items-center gap-2">
                                      <div 
                                        className="w-3 h-3 rounded-full border" 
                                        style={{ backgroundColor: room.color }}
                                      />
                                      {room.name}
                                    </div>
                                  </SelectItem>
                                );
                              })}
                          </SelectContent>
                        </Select>
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>
            </div>
            
            {/* Sezione per selezione di data e ora */}
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <FormField
                  control={form.control}
                  name="date"
                  render={({ field }) => (
                    <FormItem className="flex flex-col">
                      <Button
                        type="button"
                        variant="outline"
                        className="w-full justify-start text-left font-normal"
                        onClick={() => setIsCalendarOpen(!isCalendarOpen)}
                      >
                        <Calendar className="mr-2 h-4 w-4" />
                        {format(field.value, "PPP", { locale: getDateLocale(i18n.language) })}
                      </Button>
                      
                      {isCalendarOpen && (
                        <div className="p-3 bg-white border rounded-md shadow-md mt-1 absolute z-50 popover-content">
                          <CalendarComponent
                            mode="single"
                            selected={field.value}
                            onSelect={(date) => {
                              if (date) {
                                field.onChange(date);
                                setShowDateTimeDetails(true);
                                setIsCalendarOpen(false);
                              }
                            }}
                            disabled={(date) => date < new Date(new Date().setHours(0, 0, 0, 0))}
                            initialFocus
                          />
                        </div>
                      )}
                    </FormItem>
                  )}
                />
                
                <FormField
                  control={form.control}
                  name="startTime"
                  render={({ field }) => (
                    <FormItem className="flex flex-col">
                      <Button
                        type="button"
                        variant="outline"
                        className="w-full justify-start text-left font-normal"
                        onClick={() => setIsTimePickerOpen(!isTimePickerOpen)}
                      >
                        <Clock className="mr-2 h-4 w-4" />
                        {field.value}
                      </Button>
                      
                      {isTimePickerOpen && (
                        <div className="p-3 bg-white border rounded-md shadow-md mt-1 absolute z-50 popover-content">
                          <div className="max-h-[200px] overflow-y-auto popover-content">
                            {Array.from({ length: 12 }).map((_, i) => {
                              const hour = i + 9; // Start from 9:00 AM
                              const timeOptions = ["00", "15", "30", "45"];
                              
                              return timeOptions.map((minutes) => {
                                const timeValue = `${hour.toString().padStart(2, "0")}:${minutes}`;
                                
                                return (
                                  <div
                                    key={timeValue}
                                    className={`p-2 cursor-pointer hover:bg-slate-100 ${
                                      field.value === timeValue ? "bg-primary/10 font-medium" : ""
                                    }`}
                                    onClick={() => {
                                      field.onChange(timeValue);
                                      setShowDateTimeDetails(true);
                                      setIsTimePickerOpen(false);
                                    }}
                                  >
                                    {timeValue}
                                  </div>
                                );
                              });
                            })}
                          </div>
                        </div>
                      )}
                    </FormItem>
                  )}
                />
              </div>
              
              {/* Mostriamo i dettagli solo se l'utente ha interagito con i campi data/ora
                  o se stiamo modificando un appuntamento esistente, 
                  o se vengono forniti valori di default */}
              {(showDateTimeDetails || !!appointmentId || !!defaultDate || !!defaultTime) && (
                <div className="p-3 bg-blue-50 rounded-md">
                  <p className="text-sm text-blue-700 font-medium">Dettagli slot selezionato:</p>
                  <div className="flex justify-between mt-1">
                    <span className="text-sm">Data: {format(form.getValues().date, "PPP", { locale: getDateLocale(i18n.language) })}</span>
                    <span className="text-sm">Ora: {form.getValues().startTime}</span>
                  </div>
                </div>
              )}
            </div>
            
            {/* Reminder Type - Canali promemoria */}
            <div className="mt-4 p-3 border-2 border-dashed border-green-200 rounded-md bg-green-50">
              <h3 className="font-medium text-base mb-3 flex items-center text-green-700">
                <Bell className="h-5 w-5 mr-2" />
                Seleziona Canali di Notifica
              </h3>
              <div className="grid grid-cols-2 gap-4">
                <div className="flex items-center space-x-2">
                  <Checkbox 
                    id="reminderWhatsApp" 
                    className="data-[state=checked]:bg-green-600"
                    defaultChecked={true}
                    onCheckedChange={(checked) => {
                      const currentReminders = form.getValues().reminderType || 'whatsapp';
                      let types = currentReminders ? currentReminders.split(',') : ['whatsapp'];
                      
                      if (checked) {
                        if (!types.includes('whatsapp')) types.push('whatsapp');
                      } else {
                        const index = types.indexOf('whatsapp');
                        if (index !== -1) types.splice(index, 1);
                      }
                      
                      console.log("WhatsApp checkbox: setting value to", types.join(','));
                      form.setValue('reminderType', types.join(','));
                    }}
                  />
                  <label
                    htmlFor="reminderWhatsApp"
                    className="text-sm font-medium flex items-center leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70"
                  >
                    <MessageSquare className="h-4 w-4 mr-1" /> WhatsApp
                  </label>
                </div>
                
                <div className="flex items-center space-x-2">
                  <Checkbox 
                    id="reminderEmail" 
                    className="data-[state=checked]:bg-green-600"
                    defaultChecked={false}
                    onCheckedChange={(checked) => {
                      const currentReminders = form.getValues().reminderType || 'whatsapp';
                      let types = currentReminders ? currentReminders.split(',') : ['whatsapp'];
                      
                      if (checked) {
                        if (!types.includes('email')) types.push('email');
                      } else {
                        const index = types.indexOf('email');
                        if (index !== -1) types.splice(index, 1);
                      }
                      
                      console.log("Email checkbox: setting value to", types.join(','));
                      form.setValue('reminderType', types.join(','));
                    }}
                  />
                  <label
                    htmlFor="reminderEmail"
                    className="text-sm font-medium flex items-center leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70"
                  >
                    <MailIcon className="h-4 w-4 mr-1" /> Email
                  </label>
                </div>
              </div>
            </div>
            
            {/* Notes */}
            <FormField
              control={form.control}
              name="notes"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Note</FormLabel>
                  <FormControl>
                    <Textarea
                      placeholder="Inserisci eventuali note sull'appuntamento"
                      className="resize-none"
                      {...field}
                      value={field.value || ''}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            
            <div className="flex justify-end space-x-2 pt-4">
              <Button
                type="button"
                variant="outline"
                onClick={onClose}
                disabled={mutation.isPending}
              >
                Annulla
              </Button>
              <Button 
                type="submit"
                disabled={mutation.isPending}
              >
                {mutation.isPending ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Salvataggio...
                  </>
                ) : (
                  appointmentId ? "Aggiorna" : "Salva"
                )}
              </Button>
            </div>
          </form>
        </Form>
      )}
      
      {/* Alert Dialog per Conflitti Orari */}
      <AlertDialog open={conflictDialogOpen} onOpenChange={setConflictDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle className="text-orange-600">⚠️ Conflitto di Orario Rilevato</AlertDialogTitle>
            <AlertDialogDescription>
              <div className="space-y-4 mt-4">
                <p className="text-gray-700">
                  Hai creato un appuntamento che si sovrappone con uno o più appuntamenti esistenti:
                </p>
                
                {conflictDetails?.staffConflicts && conflictDetails.staffConflicts.length > 0 && (
                  <div className="bg-orange-50 border border-orange-200 rounded-lg p-3">
                    <h4 className="font-semibold text-orange-900 mb-2">
                      🧑 Conflitto Professionista:
                    </h4>
                    <ul className="space-y-1 text-sm text-orange-800">
                      {conflictDetails.staffConflicts.map((conflict, index) => (
                        <li key={index}>
                          <strong>{conflict.staffName}</strong> ha già un appuntamento alle {conflict.time}
                          {conflict.appointment.client && (
                            <span className="text-orange-600"> con {conflict.appointment.client.firstName} {conflict.appointment.client.lastName}</span>
                          )}
                        </li>
                      ))}
                    </ul>
                  </div>
                )}
                
                {conflictDetails?.roomConflicts && conflictDetails.roomConflicts.length > 0 && (
                  <div className="bg-orange-50 border border-orange-200 rounded-lg p-3">
                    <h4 className="font-semibold text-orange-900 mb-2">
                      🏠 Conflitto Stanza:
                    </h4>
                    <ul className="space-y-1 text-sm text-orange-800">
                      {conflictDetails.roomConflicts.map((conflict, index) => (
                        <li key={index}>
                          <strong>{conflict.roomName}</strong> è già occupata alle {conflict.time}
                          {conflict.appointment.client && (
                            <span className="text-orange-600"> da {conflict.appointment.client.firstName} {conflict.appointment.client.lastName}</span>
                          )}
                        </li>
                      ))}
                    </ul>
                  </div>
                )}
                
                <p className="text-gray-700 font-medium mt-4">
                  Vuoi procedere comunque con la creazione dell'appuntamento?
                </p>
              </div>
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel onClick={() => {
              setConflictDialogOpen(false);
              setPendingAppointmentData(null);
              setConflictDetails(null);
            }}>
              Annulla
            </AlertDialogCancel>
            <AlertDialogAction 
              onClick={handleConflictConfirm}
              className="bg-orange-600 hover:bg-orange-700"
            >
              Sì, Procedi Comunque
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}