import { useLocation } from "wouter";
import { useForm, useWatch } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { useMutation, useQuery } from "@tanstack/react-query";
import { queryClient, apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
// import { insertAppointmentSchema } from "../../../shared/schema"; // Rimosso per evitare limiti integer
import { Loader2, X, Calendar, Clock, Bell, MailIcon, Smartphone, MessageSquare, Users, Package, UserPlus, AlertCircle, ArrowRight } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { useEffect, useRef, useState } from "react";
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
// I messaggi di errore sono chiavi i18n e vengono tradotti automaticamente da <FormMessage />
const formSchema = z.object({
  clientId: z.number({
    required_error: "appointmentForm.errors.requiredClient",
  }),
  serviceId: z.number({
    required_error: "appointmentForm.errors.requiredService",
  }),
  staffId: z.number().nullable().optional(),
  roomId: z.number().nullable().optional(),
  packagePurchaseId: z.number().nullable().optional(),
  date: z.date({
    required_error: "appointmentForm.errors.requiredDate",
  }),
  startTime: z.string({
    required_error: "appointmentForm.errors.requiredStartTime",
  }),
  endTime: z.string().nullable().optional(),
  notes: z.string().nullable().optional(),
  reminderType: z.string().nullable().optional(),
});

type FormData = z.infer<typeof formSchema>;

// Helper: converte qualsiasi valore in un Date valido, con fallback a oggi.
// Previene RangeError: Invalid time value in date-fns v3.
function safeDate(d: any): Date {
  if (d instanceof Date && !isNaN(d.getTime())) return d;
  if (typeof d === 'string' && d) {
    const parsed = new Date(d.includes('T') ? d : `${d}T00:00:00`);
    if (!isNaN(parsed.getTime())) return parsed;
  }
  return new Date();
}

// Helper function to format date for API
// Normalizza qualsiasi forma di data (Date | "yyyy-MM-dd" | ISO string) in
// "yyyy-MM-dd" senza far esplodere date-fns v3 (che non accetta string in format()).
function toApiDate(d: any): string {
  if (!d) return formatDateForApi(new Date());
  if (typeof d === 'string') {
    if (/^\d{4}-\d{2}-\d{2}/.test(d)) return d.slice(0, 10);
    return formatDateForApi(new Date(d));
  }
  if (d instanceof Date) return formatDateForApi(d);
  return formatDateForApi(new Date(d));
}

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
  const [quickClientLastName, setQuickClientLastName] = useState("");
  const [quickClientPhone, setQuickClientPhone] = useState("");
  const quickClientLastNameRef = useRef<HTMLInputElement | null>(null);
  const quickClientPhoneRef = useRef<HTMLInputElement | null>(null);
  const [isServiceDropdownOpen, setIsServiceDropdownOpen] = useState(false);
  const [selectedClient, setSelectedClient] = useState<any>(null);
  // Mostra i dettagli solo se stiamo modificando un appuntamento o se vengono forniti valori predefiniti
  const [showDateTimeDetails, setShowDateTimeDetails] = useState(!!appointmentId || !!defaultDate || !!defaultTime);
  
  // Stati per controllare l'apertura dei selettori data/ora
  const [isCalendarOpen, setIsCalendarOpen] = useState(false);
  const [isTimePickerOpen, setIsTimePickerOpen] = useState(false);

  // Posizione del popup calendario (trascinabile)
  const [calendarPos, setCalendarPos] = useState({ x: 16, y: 170 });
  const calendarDragRef = useRef({ active: false, startX: 0, startY: 0, originX: 0, originY: 0 });
  
  // Stato per la durata personalizzata dell'appuntamento (in minuti)
  const [customDuration, setCustomDuration] = useState<number | null>(null);
  
  // Stati per gestire conflitti orari
  const [conflictDialogOpen, setConflictDialogOpen] = useState(false);
  const [conflictDetails, setConflictDetails] = useState<{
    staffConflicts: any[];
    roomConflicts: any[];
  } | null>(null);
  const [pendingAppointmentData, setPendingAppointmentData] = useState<any>(null);

  // 🛡️ Anti-double-submit: ref sincrono (blocca il secondo click prima del re-render)
  // + stato React per disabilitare il bottone e mostrare la barra di caricamento.
  const submittingRef = useRef(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  // Flag per distinguere la chiusura del conflict dialog "Procedi" (NON sbloccare)
  // dalle chiusure per Cancel/Escape/click-fuori (sblocca).
  const proceedingFromConflictRef = useRef(false);
  const beginSubmitting = () => {
    submittingRef.current = true;
    setIsSubmitting(true);
  };
  const endSubmitting = () => {
    submittingRef.current = false;
    setIsSubmitting(false);
  };

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
  const { data: clients = [], isLoading: isLoadingClients } = useQuery<any[]>({
    queryKey: ['/api/clients']
  });

  // Fetch services
  const { data: services = [], isLoading: isLoadingServices } = useQuery<any[]>({
    queryKey: ['/api/services']
  });

  // Fetch collaborators - FORCE FRESH DATA
  const { data: collaborators = [], isLoading: isLoadingCollaborators, refetch: refetchCollaborators } = useQuery<any[]>({
    queryKey: ['/api/collaborators'],
    staleTime: 0,
    gcTime: 0,
  });

  // Fetch treatment rooms - FORCE FRESH DATA
  const { data: treatmentRooms = [], isLoading: isLoadingRooms, refetch: refetchRooms } = useQuery<any[]>({
    queryKey: ['/api/treatment-rooms'],
    staleTime: 0,
    gcTime: 0,
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

  // Fetch appointment if editing — usa l'endpoint singolo /api/appointments/:id
  // Il fetcher di default usa il PRIMO elemento del queryKey come URL,
  // quindi ['/api/appointments', id] chiamerebbe la lista intera invece del singolo.
  const { data: appointment, isLoading: isLoadingAppointment, isError: isAppointmentError } = useQuery<any>({
    queryKey: [`/api/appointments/${appointmentId}`],
    enabled: !!appointmentId,
    staleTime: Infinity,
    refetchOnWindowFocus: false,
    refetchOnMount: false,
    refetchOnReconnect: false,
    retry: 2,
  });

  // Update form values when editing existing appointment
  useEffect(() => {
    if (appointment && !Array.isArray(appointment)) {
      // Forza interpretazione locale (non UTC) per evitare drift di fuso orario.
      // "2026-05-12" → new Date("2026-05-12") = mezzanotte UTC → giorno sbagliato in UTC+2.
      const rawDate = appointment.date ?? "";
      const appointmentDate = rawDate
        ? new Date(rawDate.includes('T') ? rawDate : `${rawDate}T00:00:00`)
        : new Date();
      const startTime = (appointment.startTime ?? "09:00").substring(0, 5);
      
      form.reset({
        clientId: appointment.clientId,
        serviceId: appointment.serviceId,
        staffId: appointment.staffId ?? undefined,
        roomId: appointment.roomId ?? undefined,
        packagePurchaseId: appointment.packagePurchaseId ?? undefined,
        date: appointmentDate,
        startTime: startTime,
        endTime: appointment.endTime ?? undefined,
        notes: appointment.notes ?? undefined,
        reminderType: appointment.reminderType ?? undefined,
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
  const { data: clientPackages = [] } = useQuery<any[]>({
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
      console.log(`🔍 [APPOINTMENT FORM] Client selected ${client.firstName} ${client.lastName}:`, {
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

  // Handler per trascinare il popup calendario
  const onCalendarDragStart = (e: React.TouchEvent | React.MouseEvent) => {
    const clientX = 'touches' in e ? e.touches[0].clientX : (e as React.MouseEvent).clientX;
    const clientY = 'touches' in e ? e.touches[0].clientY : (e as React.MouseEvent).clientY;
    calendarDragRef.current = { active: true, startX: clientX, startY: clientY, originX: calendarPos.x, originY: calendarPos.y };
  };
  const onCalendarDragMove = (e: React.TouchEvent | React.MouseEvent) => {
    if (!calendarDragRef.current.active) return;
    const clientX = 'touches' in e ? e.touches[0].clientX : (e as React.MouseEvent).clientX;
    const clientY = 'touches' in e ? e.touches[0].clientY : (e as React.MouseEvent).clientY;
    const maxX = Math.max(0, window.innerWidth - 320);
    const maxY = Math.max(0, window.innerHeight - 420);
    setCalendarPos({
      x: Math.max(0, Math.min(maxX, calendarDragRef.current.originX + clientX - calendarDragRef.current.startX)),
      y: Math.max(0, Math.min(maxY, calendarDragRef.current.originY + clientY - calendarDragRef.current.startY)),
    });
  };
  const onCalendarDragEnd = () => { calendarDragRef.current.active = false; };

  // Create or update appointment mutation
  const mutation = useMutation({
    mutationFn: async (data: FormData) => {
      console.log("=== MUTATION FUNCTION STARTED ===");
      console.log("Attempting to save appointment with data:", data);
      
      // Controlli preliminari
      if (!data.clientId || !data.serviceId || !data.date || !data.startTime) {
        console.error("ERROR: Incomplete appointment data", {
          clientId: data.clientId,
          serviceId: data.serviceId,
          date: data.date,
          startTime: data.startTime
        });
        throw new Error(t('appointmentForm.errors.dataIncomplete'));
      }
      
      // Calcola l'orario di fine in base alla durata del servizio o alla durata personalizzata
      const service = services.find((s: any) => s.id === data.serviceId);
      if (!service) {
        throw new Error(t('appointmentForm.errors.serviceNotFound'));
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
      
      console.log("Formatted data for API:", appointmentData);
      
      // Esegui la chiamata API
      const url = appointmentId 
        ? `/api/appointments/${appointmentId}` 
        : "/api/appointments";
      
      const method = appointmentId ? "PUT" : "POST";
      
      // Utilizziamo apiRequest al posto di fetch diretto
      console.log(`Sending ${method} request to ${url} with data:`, appointmentData);
      
      try {
        const response = await apiRequest(method, url, appointmentData);
        const responseData = await response.json();
        console.log("Server response received:", responseData);
        return responseData;
      } catch (error) {
        console.error("API request failed:", error);
        throw error;
      }
    },
    
    onSuccess: async (data) => {
      console.log("Appointment saved successfully:", data);
      
      toast({
        title: appointmentId
          ? t('appointmentForm.toast.updated.title')
          : t('appointmentForm.toast.created.title'),
        description: appointmentId
          ? t('appointmentForm.toast.updated.desc')
          : t('appointmentForm.toast.created.desc'),
      });
      
      // Invalidate all related queries
      console.log("🔄 Multi-tenant system: invalidating appointment cache...");
      
      // Invalidate general appointments list
      await queryClient.invalidateQueries({ queryKey: ['/api/appointments'] });
      
      // Invalidate the specific date for this appointment.
      // Il backend restituisce `data.date` come stringa (es. "2026-04-26" o
      // ISO con timezone). date-fns v3 NON accetta stringhe in `format()` e
      // lancia un'eccezione che interrompe l'invalidazione: per questo prima
      // del fix il calendario non si aggiornava dopo il salvataggio.
      const appointmentDate = toApiDate(data.date);
      await queryClient.invalidateQueries({ 
        queryKey: [`/api/appointments/date/${appointmentDate}`] 
      });
      
      // Invalidate surrounding dates to ensure calendar updates.
      // Usa T00:00:00 (locale) per evitare drift di un giorno per fusi orari.
      const today = new Date(`${appointmentDate}T00:00:00`);
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
      
      // Invalida anche le query range usate da WeekView
      await queryClient.invalidateQueries({
        predicate: (query) => String(query.queryKey[0]).includes('/api/appointments/range'),
      });

      // Force refresh of all appointment-related queries
      await queryClient.refetchQueries({ 
        queryKey: ['/api/appointments'],
        type: 'all'
      });
      
      console.log("✅ Multi-tenant system: cache successfully invalidated");
      
      // Notifica che l'appuntamento è stato salvato
      if (onAppointmentSaved) {
        console.log("Calling onAppointmentSaved callback");
        onAppointmentSaved();
      } else {
        // Se non c'è il callback specifico, chiudi la form dopo un breve ritardo
        setTimeout(() => {
          onClose();
        }, 100);
      }
    },
    
    onError: (error) => {
      console.error("Failed to save appointment:", error);
      toast({
        title: t("common.error"),
        description: t('common.errorWithMessage', { message: error.message }),
        variant: "destructive",
      });
    }
  });

  // Funzione per salvare l'appuntamento (senza controllo conflitti)
  const saveAppointment = async (data: FormData) => {
    try {
      console.log("Sending data to mutation...");
      
      // WORKAROUND: Bypass the mutation and make a direct API call
      console.log("DIRECT ATTEMPT: Bypassing the mutation system");
      
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
        status: "scheduled",
        force_create: !!(data as any)._forceCreate
      };
      
      console.log("Formatted data for DIRECT API:", appointmentData);
      
      // Esegui la chiamata diretta
      const url = appointmentId 
        ? `/api/appointments/${appointmentId}` 
        : "/api/appointments";
      
      const method = appointmentId ? "PUT" : "POST";
      
      console.log(`Sending DIRECT ${method} request to ${url} with data:`, appointmentData);
      
      const response = await apiRequest(method, url, appointmentData);
      
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }
      
      const result = await response.json();
      console.log("DIRECT RESPONSE RECEIVED:", result);
      
      // Invalida tutte le query relative agli appuntamenti
      console.log("Direct query invalidation");
      await queryClient.invalidateQueries({ queryKey: ['/api/appointments'] });
      
      // Invalida la data specifica dell'appuntamento + ±2 giorni (timezone-safe)
      // FIX: prima il loop era centrato su `new Date()` (oggi del sistema), quindi
      // se l'appuntamento era in una data lontana la sua chiave di cache non veniva
      // toccata e il calendario restava stale (toast diceva "salvato" ma vista vuota).
      const appointmentApiDate = toApiDate(data.date as any);
      const baseDate = new Date(`${appointmentApiDate}T00:00:00`);
      for (let i = -2; i <= 2; i++) {
        const d = new Date(baseDate);
        d.setDate(d.getDate() + i);
        const formattedDate = formatDateForApi(d);
        await queryClient.invalidateQueries({ 
          queryKey: [`/api/appointments/date/${formattedDate}`] 
        });
      }
      
      // Invalida anche le query range usate da WeekView
      await queryClient.invalidateQueries({
        predicate: (query) => String(query.queryKey[0]).includes('/api/appointments/range'),
      });

      // Forza il refetch immediato delle query principali
      await queryClient.refetchQueries({ queryKey: ['/api/appointments'] });
      await queryClient.refetchQueries({ queryKey: [`/api/appointments/date/${appointmentApiDate}`] });
      
      // Notifica successo
      toast({
        title: appointmentId
          ? t('appointmentForm.toast.updated.title')
          : t('appointmentForm.toast.created.title'),
        description: appointmentId
          ? t('appointmentForm.toast.updated.desc')
          : t('appointmentForm.toast.created.desc'),
      });
      
      // Chiudi la form
      console.log("Closing form after successful direct request");
      
      // Notifica che l'appuntamento è stato salvato
      if (onAppointmentSaved) {
        console.log("Calling onAppointmentSaved callback (after direct request)");
        onAppointmentSaved();
      } else {
        // Se non c'è il callback specifico, chiudi la form
        console.log("Closing form without specific callback");
        onClose();
      }
    } catch (error: any) {
      // Conflitto orario segnalato dal backend (409): mostra dialog di conferma invece di bloccare
      if (error?.message?.includes('already exists at this time')) {
        setConflictDetails(null);
        setPendingAppointmentData({ ...data, _forceCreate: true });
        setConflictDialogOpen(true);
        return; // Il finally chiamerà endSubmitting; handleConflictConfirm farà beginSubmitting
      }
      console.error("Save error:", error);
      toast({
        title: t('appointmentForm.errors.savingTitle'),
        description: t('common.errorWithMessage', { message: error.message }),
        variant: "destructive"
      });
      throw error;
    } finally {
      // 🛡️ Sblocca sempre il submit, sia in caso di successo che di errore.
      endSubmitting();
    }
  };

  // Funzione per gestire la conferma dopo rilevamento conflitti
  const handleConflictConfirm = async () => {
    // Cattura i dati subito (prima che React state venga azzerato dall'onOpenChange)
    const dataToSave = pendingAppointmentData;
    if (!dataToSave) return;
    
    console.log("✅ User confirmed to proceed despite conflicts");
    setConflictDialogOpen(false);
    setPendingAppointmentData(null);
    setConflictDetails(null);
    
    try {
      // _forceCreate: true fa sì che saveAppointment mandi force_create=true al backend
      await saveAppointment({ ...dataToSave, _forceCreate: true } as any);
    } catch (error) {
      console.error("Failed to save after conflict confirmation");
    } finally {
      endSubmitting();
    }
  };

  // Funzione per controllare conflitti di orario
  const checkConflicts = async (appointmentData: any) => {
    try {
      // Recupera tutti gli appuntamenti della stessa data
      const dateStr = formatDateForApi(appointmentData.date);
      const response = await fetch(`/api/appointments/date/${dateStr}`);
      if (!response.ok) {
        console.error("Failed to load appointments for conflict check");
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
              staffName: staff ? `${staff.firstName} ${staff.lastName}` : t('appointmentForm.fields.staff'),
              time: `${(apt.startTime ?? "").substring(0, 5)} - ${(apt.endTime ?? "").substring(0, 5)}`
            });
          }
          
          // Conflitto stanza
          if (appointmentData.roomId && apt.roomId && appointmentData.roomId === apt.roomId) {
            const room = treatmentRooms.find((r: any) => r.id === apt.roomId);
            roomConflicts.push({
              appointment: apt,
              roomName: room ? room.name : t('appointmentForm.fields.room'),
              time: `${(apt.startTime ?? "").substring(0, 5)} - ${(apt.endTime ?? "").substring(0, 5)}`
            });
          }
        }
      });
      
      return { staffConflicts, roomConflicts };
    } catch (error) {
      console.error("Failed to check conflicts:", error);
      return { staffConflicts: [], roomConflicts: [] };
    }
  };

  const onSubmit = async (data: FormData) => {
    // 🛡️ Guard sincrono contro doppi click: se è già in corso, ignora il submit.
    if (submittingRef.current) {
      console.log("⏭️ Submit ignored: save already in progress");
      return;
    }
    beginSubmitting();
    try {
      console.log("=== STARTING APPOINTMENT SAVE PROCESS ===");
      console.log("Form data:", data);
      
      // Controllo se il cliente è di un altro account e chiedi conferma
      const client = clients.find((c: any) => c.id === data.clientId);
      const clientOwnerId = client?.ownerId || client?.originalOwnerId;
      if (currentUser?.type === 'admin' && client && clientOwnerId && clientOwnerId !== currentUser.id) {
        const confirmed = window.confirm(
          t('appointmentForm.errors.confirmOtherAccount', {
            firstName: client.firstName,
            lastName: client.lastName,
          })
        );
        
        if (!confirmed) {
          console.log("Save cancelled by user");
          endSubmitting();
          return;
        }
      }
      
      // 🚨 DEBUG CRITICO: Verifica dei valori del form
      console.log("🔍 [SUBMIT DEBUG] staffId from form:", data.staffId, typeof data.staffId);
      console.log("🔍 [SUBMIT DEBUG] roomId from form:", data.roomId, typeof data.roomId);
      
      // Verifica anche i valori direttamente dal form state
      const formValues = form.getValues();
      console.log("🔍 [FORM STATE] staffId:", formValues.staffId, typeof formValues.staffId);
      console.log("🔍 [FORM STATE] roomId:", formValues.roomId, typeof formValues.roomId);
      console.log("🔍 [FORM STATE] all values:", formValues);
      console.log(`Client ID: ${data.clientId}, Service ID: ${data.serviceId}`);
      console.log(`Date: ${data.date}, Time: ${data.startTime}`);
      
      // Controlli di validità
      if (!data.clientId || data.clientId === 0) {
        console.error("No client selected!");
        toast({
          title: t("common.error"),
          description: t('appointmentForm.errors.requiredClient'),
          variant: "destructive"
        });
        endSubmitting();
        return;
      }
      
      if (!data.serviceId || data.serviceId === 0) {
        console.error("No service selected!");
        toast({
          title: t("common.error"),
          description: t('appointmentForm.errors.requiredService'),
          variant: "destructive"
        });
        endSubmitting();
        return;
      }
      
      // Check if client has provided consent
      const selectedClient = clients.find((c: any) => c.id === data.clientId);
      if (selectedClient && !selectedClient.hasConsent) {
        // Show a warning but allow to proceed
        toast({
          title: t("common.warning"),
          description: t('appointmentForm.errors.consentWarning'),
          variant: "destructive",
          duration: 5000,
        });
      }
      
      // Log client e service
      console.log("Selected client:", selectedClient);
      const selectedService = services.find((s: any) => s.id === data.serviceId);
      console.log("Selected service:", selectedService);
      
      // Controllo conflitti di orario (professionista/stanza)
      console.log("🔍 Checking time slot conflicts...");
      const conflicts = await checkConflicts(data);
      
      if (conflicts.staffConflicts.length > 0 || conflicts.roomConflicts.length > 0) {
        // Ci sono conflitti - mostra dialog di conferma
        console.log("⚠️ Conflicts found:", conflicts);
        setConflictDetails(conflicts);
        setPendingAppointmentData(data);
        setConflictDialogOpen(true);
        return; // Aspetta conferma dall'utente
      }
      
      // Nessun conflitto - salva direttamente
      console.log("✅ No conflicts detected - proceeding with save");
      await saveAppointment(data);
      
    } catch (error: any) {
      console.error("Critical error preparing data:", error);
      toast({
        title: t("common.error"),
        description: t('common.errorWithMessage', { message: error.message }),
        variant: "destructive"
      });
      endSubmitting();
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
      const firstName = searchTerm.trim();
      const lastName = quickClientLastName.trim() || '-';
      const phone = quickClientPhone.trim();

      const response = await apiRequest('POST', '/api/clients', {
        firstName,
        lastName,
        phone,
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.message || t('appointmentForm.toast.clientCreateErrorDesc'));
      }

      await queryClient.invalidateQueries({ queryKey: ['/api/clients'] });

      field.onChange(data.id);
      setClientSearchTerm(`${data.firstName} ${data.lastName}`);
      setIsClientDropdownOpen(false);
      setQuickClientLastName("");
      setQuickClientPhone("");

      toast({
        title: t('appointmentForm.toast.clientCreated.title'),
        description: t('appointmentForm.toast.clientCreated.desc', { firstName: data.firstName, lastName: data.lastName }),
      });
    } catch (error: any) {
      toast({
        title: t("common.error"),
        description: error.message || t('appointmentForm.errors.createClient'),
        variant: "destructive",
      });
    } finally {
      setIsCreatingQuickClient(false);
    }
  };

  // Loading state
  const isLoading = isLoadingClients || isLoadingServices || isLoadingCollaborators || isLoadingRooms || (appointmentId && isLoadingAppointment);

  // Error state: API returned an error for the single-appointment fetch
  if (appointmentId && isAppointmentError) {
    return (
      <div className="bg-white rounded-lg shadow-lg p-6 w-[calc(100vw-16px)] sm:w-auto sm:min-w-[380px] flex flex-col gap-4 items-center">
        <p className="text-sm text-gray-600">{t('appointmentForm.loadError', 'Error loading the form. Please try again.')}</p>
        <Button variant="outline" onClick={onClose}>{t('common.close', 'Close')}</Button>
      </div>
    );
  }

  return (
    <div className="bg-white rounded-lg shadow-lg p-4 overflow-y-auto max-h-[calc(100vh-24px)] sm:max-h-[85vh] w-[calc(100vw-16px)] sm:w-auto min-[1200px]:max-w-[600px]">
      <div className="flex justify-between items-center mb-4">
        <h2 className="text-xl font-bold">
          {appointmentId ? t('appointmentForm.editTitle') : t('appointmentForm.newTitle')}
        </h2>
        <Button 
          variant="ghost" 
          size="icon" 
          onClick={onClose}
          disabled={isSubmitting || mutation.isPending}
        >
          <X className="h-4 w-4" />
        </Button>
      </div>

      {/* 🔄 Barra di caricamento durante il salvataggio: rende visibile che il
          processo è in corso così l'utente non clicca più volte il pulsante. */}
      {(isSubmitting || mutation.isPending) && (
        <div
          role="status"
          aria-live="polite"
          data-testid="appointment-form-saving-bar"
          className="mb-4 flex items-center gap-2 rounded-md border border-primary/30 bg-primary/10 px-3 py-2 text-sm font-medium text-primary"
        >
          <Loader2 className="h-4 w-4 animate-spin" />
          <span>{t('appointmentForm.actions.savingButton')}</span>
          <div className="ml-auto h-1 w-24 overflow-hidden rounded-full bg-primary/20">
            <div className="h-full w-1/2 animate-pulse rounded-full bg-primary" />
          </div>
        </div>
      )}

      {isLoading ? (
        <div className="flex justify-center p-6">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
        </div>
      ) : (
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit, (errors) => {
            console.error("❌ [APPOINTMENT FORM] Validation errors:", JSON.stringify(errors, null, 2));
            const errorFields = Object.keys(errors);
            toast({
              title: t('appointmentForm.toast.validationTitle'),
              description: t('appointmentForm.toast.validationDesc', { fields: errorFields.join(', ') }),
              variant: "destructive"
            });
          })} className="space-y-4">
            {/* Warning per cliente di altro account */}
            {selectedClient && currentUser?.type === 'admin' && (selectedClient.ownerId || selectedClient.originalOwnerId) !== currentUser.id && (
              <Alert className="border-orange-300 bg-orange-50">
                <Users className="h-4 w-4 text-orange-600" />
                <AlertDescription className="text-orange-800">
                  <strong>{t('common.warning')}:</strong> {t('appointmentForm.warnings.otherAccountClient', { firstName: selectedClient.firstName, lastName: selectedClient.lastName })}
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
                    <FormLabel>{t('appointmentForm.client')}</FormLabel>
                    <FormControl>
                      <div className="relative">
                        <Input 
                          placeholder={t('appointmentForm.fields.clientPlaceholder')} 
                          value={clientSearchTerm}
                          onChange={(e) => setClientSearchTerm(e.target.value)}
                          onFocus={() => setIsClientDropdownOpen(true)}
                          onBlur={(e) => {
                            // Non chiudere se il focus si sposta sui campi Cognome/Telefono del quick-create
                            const next = e.relatedTarget as HTMLElement | null;
                            if (next && (next === quickClientLastNameRef.current || next === quickClientPhoneRef.current)) {
                              return;
                            }
                            // Ritardo per permettere il click sulle opzioni
                            setTimeout(() => setIsClientDropdownOpen(false), 200);
                          }}
                          onKeyDown={(e) => {
                            if (e.key === 'Enter') {
                              const filteredClients = clients.filter((client: any) =>
                                clientSearchTerm.length === 0 ||
                                `${client.firstName} ${client.lastName}`
                                  .toLowerCase()
                                  .includes(clientSearchTerm.toLowerCase())
                              );
                              const showQuickCreate = clientSearchTerm.trim().length >= 2 && filteredClients.length === 0;
                              if (showQuickCreate) {
                                e.preventDefault();
                                quickClientLastNameRef.current?.focus();
                              }
                            }
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
                                            {t('appointmentForm.otherAccount')}
                                          </span>
                                        )}
                                      </div>
                                    );
                                  })}
                                  {showQuickCreate && (
                                    <div className="p-3 border-t border-dashed bg-green-50/50 space-y-2">
                                      <div className="flex items-center gap-2 text-green-700 font-medium text-sm">
                                        <UserPlus className="h-4 w-4 shrink-0" />
                                        <span>{t('appointmentForm.createNewClient.before')}<strong>{clientSearchTerm.trim()}</strong>{t('appointmentForm.createNewClient.after')}</span>
                                      </div>
                                      <div className="grid grid-cols-2 gap-2">
                                        <Input
                                          ref={quickClientLastNameRef}
                                          placeholder={t('clientForm.lastName')}
                                          value={quickClientLastName}
                                          onChange={(e) => setQuickClientLastName(e.target.value)}
                                          onMouseDown={(e) => e.stopPropagation()}
                                          onBlur={(e) => {
                                            const next = e.relatedTarget as HTMLElement | null;
                                            if (next && next === quickClientPhoneRef.current) return;
                                            setTimeout(() => setIsClientDropdownOpen(false), 200);
                                          }}
                                          onKeyDown={(e) => {
                                            if (e.key === 'Enter') {
                                              e.preventDefault();
                                              quickClientPhoneRef.current?.focus();
                                            }
                                          }}
                                          className="h-8 text-sm"
                                        />
                                        <Input
                                          ref={quickClientPhoneRef}
                                          placeholder={t('clientForm.phone')}
                                          value={quickClientPhone}
                                          onChange={(e) => setQuickClientPhone(e.target.value)}
                                          onMouseDown={(e) => e.stopPropagation()}
                                          onBlur={() => {
                                            setTimeout(() => setIsClientDropdownOpen(false), 200);
                                          }}
                                          onKeyDown={(e) => {
                                            if (e.key === 'Enter') {
                                              e.preventDefault();
                                              createQuickClient(clientSearchTerm, field);
                                            }
                                          }}
                                          className="h-8 text-sm"
                                        />
                                      </div>
                                      <Button
                                        type="button"
                                        size="sm"
                                        className="w-full h-8 bg-green-600 hover:bg-green-700"
                                        disabled={isCreatingQuickClient}
                                        onMouseDown={(e) => e.preventDefault()}
                                        onClick={() => createQuickClient(clientSearchTerm, field)}
                                      >
                                        {isCreatingQuickClient ? (
                                          <span className="flex items-center gap-2">
                                            <Loader2 className="h-3 w-3 animate-spin" />
                                            {t('appointmentForm.creatingClient')}
                                          </span>
                                        ) : (
                                          t('clientForm.newClient')
                                        )}
                                      </Button>
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
                      <FormLabel>{t('appointmentForm.client')}</FormLabel>
                      <div className="p-2 bg-muted rounded-md">
                        {selectedClient ? (
                          <div className="font-medium">{selectedClient.firstName} {selectedClient.lastName}</div>
                        ) : (
                          <div className="text-muted-foreground">{t('appointmentForm.loadingClient')}</div>
                        )}
                      </div>
                      <FormMessage />
                    </FormItem>
                  );
                }}
              />
            )}
            
            {services.length === 1 && services[0]?.name === "Consulenza" && services[0]?.price === 0 && (
              <Alert className="border-amber-300 bg-amber-50">
                <AlertCircle className="h-4 w-4 text-amber-600" />
                <AlertDescription className="text-amber-800">
                  <p className="font-medium mb-1">{t('services.defaultServiceAlert')}</p>
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    className="mt-1 text-xs gap-1 border-amber-400 text-amber-700 hover:bg-amber-100"
                    onClick={() => {
                      if (onClose) onClose();
                      navigate('/settings?section=services');
                    }}
                  >
                    <ArrowRight className="h-3 w-3" />
                    {t('services.goToServiceSettings')}
                  </Button>
                </AlertDescription>
              </Alert>
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
                    <FormLabel>{t('appointmentForm.service')}</FormLabel>
                    <FormControl>
                      <div className="relative">
                        <Input 
                          placeholder={t('appointmentForm.fields.servicePlaceholder')} 
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
                          <div
                            className="absolute top-full left-0 w-full max-h-48 overflow-y-auto z-10 bg-white border rounded-md shadow-lg mt-1"
                            onMouseDown={(e) => e.preventDefault()}
                            onTouchStart={(e) => e.stopPropagation()}
                          >
                            {services.length === 0 ? (
                              <div className="p-3 text-center">
                                <p className="text-sm text-muted-foreground mb-2">
                                  {t('calendar.noServicesAvailable')}
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
                                  {t('calendar.goToSettingsToCreateService')}
                                </button>
                              </div>
                            ) : filteredServices.length === 0 ? (
                              <div className="p-3 text-center text-sm text-muted-foreground">
                                {t('calendar.noServicesFound')}
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
                                      console.log("📦 Service from package selected, packagePurchaseId:", packageForService.id);
                                    } else {
                                      form.setValue('packagePurchaseId', undefined);
                                    }
                                  }}
                                >
                                  <div className="flex items-center justify-between">
                                    <span>{service.name} - {service.duration} min</span>
                                    {isFromPackage && packageForService && (
                                      <Badge variant="secondary" className="ml-2 bg-amber-100 text-amber-800 text-xs">
                                        {t('appointmentForm.packageBadge', { count: packageForService.sessionsRemaining })}
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
                          t('appointmentForm.durationLabel', { minutes: customDuration });
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
                      <FormLabel>{t('appointmentForm.fields.staff')}</FormLabel>
                      <FormControl>
                        <Select
                          value={field.value?.toString() || "none"}
                          onValueChange={(value) => {
                            console.log('🎯 COLLABORATOR SELECTED:', value);
                            console.log('🎯 [STAFFID DEBUG] Value received:', value, typeof value);
                            const staffIdValue = value !== "none" ? parseInt(value) : undefined;
                            console.log('🎯 [STAFFID DEBUG] Converted value:', staffIdValue, typeof staffIdValue);
                            field.onChange(staffIdValue);
                            console.log('🎯 [STAFFID DEBUG] field.onChange called with:', staffIdValue);
                            
                            // Verifica immediata del form state
                            setTimeout(() => {
                              const currentValue = form.getValues('staffId');
                              console.log('[STAFFID DEBUG] form value after onChange:', currentValue);
                            }, 100);
                          }}
                          onOpenChange={(open) => {
                            console.log('[DROPDOWN STAFF]:', open ? 'OPEN' : 'CLOSED');
                            if (open) {
                              console.log('[STAFF AVAILABLE IN DROPDOWN]:', collaborators?.length || 0);
                              console.log('[STAFF LIST]:', collaborators);
                            }
                          }}
                        >
                          <SelectTrigger>
                            <SelectValue placeholder={t('appointmentForm.fields.staffPlaceholder')} />
                          </SelectTrigger>
                          <SelectContent className="z-[9999] max-h-[200px] overflow-y-auto bg-white border shadow-lg">
                            <SelectItem value="none">{t('appointmentForm.fields.noStaff')}</SelectItem>
                            {collaborators
                              // TEMP: rimuovo il filtro isActive per debug
                              // .filter((collaborator: any) => collaborator.isActive)
                              .map((collaborator: any) => {
                                console.log('[RENDERING STAFF]:', collaborator);
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
                      <FormLabel>{t('appointmentForm.fields.room')}</FormLabel>
                      <FormControl>
                        <Select
                          value={field.value?.toString() || "none"}
                          onValueChange={(value) => {
                            console.log('[ROOM SELECTED]:', value);
                            console.log('[ROOMID DEBUG] received value:', value, typeof value);
                            const roomIdValue = value !== "none" ? parseInt(value) : undefined;
                            console.log('[ROOMID DEBUG] converted value:', roomIdValue, typeof roomIdValue);
                            field.onChange(roomIdValue);
                            console.log('[ROOMID DEBUG] field.onChange called with:', roomIdValue);
                            
                            // Verifica immediata del form state
                            setTimeout(() => {
                              const currentValue = form.getValues('roomId');
                              console.log('[ROOMID DEBUG] form value after onChange:', currentValue);
                            }, 100);
                          }}
                          onOpenChange={(open) => {
                            console.log('[DROPDOWN ROOMS]:', open ? 'OPEN' : 'CLOSED');
                            if (open) {
                              console.log('[ROOMS AVAILABLE IN DROPDOWN]:', treatmentRooms?.length || 0);
                              console.log('[ROOMS LIST]:', treatmentRooms);
                            }
                          }}
                        >
                          <SelectTrigger>
                            <SelectValue placeholder={t('appointmentForm.fields.roomPlaceholder')} />
                          </SelectTrigger>
                          <SelectContent className="z-[9999] max-h-[200px] overflow-y-auto bg-white border shadow-lg">
                            <SelectItem value="none">{t('appointmentForm.fields.noRoom')}</SelectItem>
                            {treatmentRooms
                              // TEMP: rimuovo il filtro isActive per debug
                              // .filter((room: any) => room.isActive)
                              .map((room: any) => {
                                console.log('🏗️ RENDERING ROOM:', room);
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
                        onClick={() => {
                          if (!isCalendarOpen) {
                            setCalendarPos({ x: 16, y: Math.max(60, Math.round(window.innerHeight * 0.18)) });
                          }
                          setIsCalendarOpen(!isCalendarOpen);
                        }}
                      >
                        <Calendar className="mr-2 h-4 w-4" />
                        {format(safeDate(field.value), "PPP", { locale: getDateLocale(i18n.language) })}
                      </Button>

                      {isCalendarOpen && (
                        <div
                          className="popover-content fixed z-[9999] bg-white border border-gray-200 rounded-xl shadow-2xl overflow-hidden"
                          style={{ left: calendarPos.x, top: calendarPos.y, width: Math.min(320, window.innerWidth - 32) }}
                          onClick={(e) => e.stopPropagation()}
                        >
                          {/* Maniglia di trascinamento */}
                          <div
                            className="flex items-center justify-center gap-2 py-2.5 bg-gray-50 border-b border-gray-200 select-none"
                            style={{ touchAction: 'none', cursor: 'grab' }}
                            onTouchStart={onCalendarDragStart}
                            onTouchMove={onCalendarDragMove}
                            onTouchEnd={onCalendarDragEnd}
                            onMouseDown={onCalendarDragStart}
                            onMouseMove={onCalendarDragMove}
                            onMouseUp={onCalendarDragEnd}
                            onMouseLeave={onCalendarDragEnd}
                          >
                            <div className="w-10 h-1.5 bg-gray-300 rounded-full" />
                          </div>
                          <div className="p-3">
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
                  <p className="text-sm text-blue-700 font-medium">{t('appointmentForm.slotDetails.title')}</p>
                  <div className="flex justify-between mt-1">
                    <span className="text-sm">{t('appointmentForm.slotDetails.dateLabel', { date: format(safeDate(form.getValues().date), "PPP", { locale: getDateLocale(i18n.language) }) })}</span>
                    <span className="text-sm">{t('appointmentForm.slotDetails.timeLabel', { time: form.getValues().startTime })}</span>
                  </div>
                </div>
              )}
            </div>
            
            {/* Reminder Type - Canali promemoria */}
            <div className="mt-4 p-3 border-2 border-dashed border-green-200 rounded-md bg-green-50">
              <h3 className="font-medium text-base mb-3 flex items-center text-green-700">
                <Bell className="h-5 w-5 mr-2" />
                {t('appointmentForm.notifications.title')}
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
                    <MailIcon className="h-4 w-4 mr-1" /> {t('i18nFinale.appointmentForm.emailLabel')}
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
                  <FormLabel>{t('common.notes')}</FormLabel>
                  <FormControl>
                    <Textarea
                      placeholder={t('appointmentForm.fields.notesPlaceholder')}
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
                disabled={isSubmitting || mutation.isPending}
                data-testid="appointment-form-cancel"
              >
                {t('common.cancel')}
              </Button>
              <Button 
                type="submit"
                disabled={isSubmitting || mutation.isPending}
                data-testid="appointment-form-submit"
              >
                {(isSubmitting || mutation.isPending) ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    {t('appointmentForm.actions.savingButton')}
                  </>
                ) : (
                  appointmentId ? t('appointmentForm.actions.update') : t('appointmentForm.save')
                )}
              </Button>
            </div>
          </form>
        </Form>
      )}
      
      {/* Alert Dialog per Conflitti Orari */}
      <AlertDialog open={conflictDialogOpen} onOpenChange={(open) => {
        setConflictDialogOpen(open);
        // Se il dialog viene chiuso (Escape, X, click fuori) senza confermare,
        // sblocca il submit così l'utente può riprovare.
        // ATTENZIONE: se la chiusura è causata dal click su "Procedi"
        // (proceedingFromConflictRef = true), NON sbloccare: la lock deve
        // restare attiva fino al finally di saveAppointment per impedire
        // doppi invii in flight.
        if (!open) {
          if (proceedingFromConflictRef.current) {
            // Resetta il flag e mantieni la lock attiva
            proceedingFromConflictRef.current = false;
          } else {
            // Chiusura non confermata: sblocca submit e ripulisci lo stato pendente
            endSubmitting();
            setPendingAppointmentData(null);
            setConflictDetails(null);
          }
        }
      }}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle className="text-orange-600">{t('appointmentForm.conflict.title')}</AlertDialogTitle>
            <AlertDialogDescription>
              <div className="space-y-4 mt-4">
                <p className="text-gray-700">
                  {t('appointmentForm.conflict.intro')}
                </p>
                
                {conflictDetails?.staffConflicts && conflictDetails.staffConflicts.length > 0 && (
                  <div className="bg-orange-50 border border-orange-200 rounded-lg p-3">
                    <h4 className="font-semibold text-orange-900 mb-2">
                      {t('appointmentForm.conflict.staffHeading')}
                    </h4>
                    <ul className="space-y-1 text-sm text-orange-800">
                      {conflictDetails.staffConflicts.map((conflict, index) => (
                        <li key={index}>
                          <strong>{conflict.staffName}</strong> {t('appointmentForm.conflict.staffLineSuffix')} {conflict.time}
                          {conflict.appointment.client && (
                            <span className="text-orange-600"> {t('appointmentForm.conflict.withClient')} {conflict.appointment.client.firstName} {conflict.appointment.client.lastName}</span>
                          )}
                        </li>
                      ))}
                    </ul>
                  </div>
                )}
                
                {conflictDetails?.roomConflicts && conflictDetails.roomConflicts.length > 0 && (
                  <div className="bg-orange-50 border border-orange-200 rounded-lg p-3">
                    <h4 className="font-semibold text-orange-900 mb-2">
                      {t('appointmentForm.conflict.roomHeading')}
                    </h4>
                    <ul className="space-y-1 text-sm text-orange-800">
                      {conflictDetails.roomConflicts.map((conflict, index) => (
                        <li key={index}>
                          <strong>{conflict.roomName}</strong> {t('appointmentForm.conflict.roomLineSuffix')} {conflict.time}
                          {conflict.appointment.client && (
                            <span className="text-orange-600"> {t('appointmentForm.conflict.byClient')} {conflict.appointment.client.firstName} {conflict.appointment.client.lastName}</span>
                          )}
                        </li>
                      ))}
                    </ul>
                  </div>
                )}
                
                <p className="text-gray-700 font-medium mt-4">
                  {t('appointmentForm.conflict.askProceed')}
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
              {t('common.cancel')}
            </AlertDialogCancel>
            <AlertDialogAction 
              onPointerDown={() => { proceedingFromConflictRef.current = true; }}
              onClick={handleConflictConfirm}
              className="bg-orange-600 hover:bg-orange-700"
            >
              {t('appointmentForm.conflict.proceed')}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}