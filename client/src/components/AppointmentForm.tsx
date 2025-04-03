import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { useMutation, useQuery } from "@tanstack/react-query";
import { queryClient, apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { insertAppointmentSchema } from "@shared/schema";
import { Loader2, X, Calendar } from "lucide-react";
import { useEffect, useState } from "react";
import { format } from "date-fns";
import { it } from "date-fns/locale";
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
import { Calendar as CalendarComponent } from "@/components/ui/calendar";


interface AppointmentFormProps {
  appointmentId?: number;
  onClose: () => void;
  onAppointmentSaved?: () => void;
  defaultDate?: Date;
  defaultTime?: string;
  clientId?: number;
}

// Extended schema with validation
const formSchema = insertAppointmentSchema.extend({
  date: z.date({
    required_error: "Seleziona una data per l'appuntamento",
  }),
  startTime: z.string({
    required_error: "Seleziona un orario di inizio",
  }),
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
}: AppointmentFormProps) {
  const { toast } = useToast();
  const [isClientDialogOpen, setIsClientDialogOpen] = useState(false);

  // Fetch clients
  const { data: clients = [], isLoading: isLoadingClients } = useQuery({
    queryKey: ['/api/clients']
  });

  // Fetch services
  const { data: services = [], isLoading: isLoadingServices } = useQuery({
    queryKey: ['/api/services']
  });

  // Fetch appointment if editing
  const { data: appointment, isLoading: isLoadingAppointment } = useQuery({
    queryKey: [`/api/appointments/${appointmentId}`],
    enabled: !!appointmentId
  });

  // Form setup
  const form = useForm<FormData>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      clientId: defaultClientId || 0,
      serviceId: 0,
      date: defaultDate || new Date(),
      startTime: defaultTime || "09:00",
      notes: ""
    }
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
  }, [appointment, form]);

  // Update clientId when defaultClientId changes
  useEffect(() => {
    if (defaultClientId) {
      form.setValue("clientId", defaultClientId);
    }
  }, [defaultClientId, form]);

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
      
      // Calcola l'orario di fine in base alla durata del servizio
      const service = services.find((s: any) => s.id === data.serviceId);
      if (!service) {
        throw new Error("Servizio non trovato");
      }
      
      // Calcola l'orario di fine
      const [hours, minutes] = data.startTime.split(':').map(Number);
      const startMinutes = hours * 60 + minutes;
      const endMinutes = startMinutes + service.duration;
      
      const endHours = Math.floor(endMinutes / 60);
      const endMins = endMinutes % 60;
      
      const endTime = `${endHours.toString().padStart(2, '0')}:${endMins.toString().padStart(2, '0')}:00`;
      
      // Prepara i dati per l'invio
      const appointmentData = {
        clientId: data.clientId,
        serviceId: data.serviceId,
        date: formatDateForApi(data.date),
        startTime: data.startTime + ":00",
        endTime: endTime,
        notes: data.notes || "",
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
      console.log("Invalidazione cache appuntamenti...");
      
      // Invalidate general appointments list
      await queryClient.invalidateQueries({ queryKey: ['/api/appointments'] });
      
      // Invalidate date-specific queries for all dates in the next 30 days
      const today = new Date();
      for (let i = 0; i < 30; i++) {
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
      
      // Invalidate date range queries
      await queryClient.invalidateQueries({ 
        queryKey: ['/api/appointments/range'] 
      });
      
      console.log("Cache invalidata con successo");
      
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

  const onSubmit = async (data: FormData) => {
    try {
      console.log("=== INIZIO PROCESSO SALVATAGGIO APPUNTAMENTO ===");
      console.log("Dati form:", data);
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
      
      // Submit data with try-catch directly here
      console.log("Invio dati alla mutation...");
      
      try {
        // WORKAROUND: Bypass the mutation and make a direct API call
        console.log("TENTATIVO DIRETTO: Bypassing the mutation system");
        
        // Calcola l'orario di fine 
        const [hours, minutes] = data.startTime.split(':').map(Number);
        const startMinutes = hours * 60 + minutes;
        const endMinutes = startMinutes + (selectedService?.duration || 60);
        
        const endHours = Math.floor(endMinutes / 60);
        const endMins = endMinutes % 60;
        
        const endTime = `${endHours.toString().padStart(2, '0')}:${endMins.toString().padStart(2, '0')}:00`;
        
        // Prepara i dati per l'invio
        const appointmentData = {
          clientId: data.clientId,
          serviceId: data.serviceId,
          date: formatDateForApi(data.date),
          startTime: data.startTime + ":00",
          endTime: endTime,
          notes: data.notes || "",
          status: "scheduled"
        };
        
        console.log("Dati formattati per API DIRETTA:", appointmentData);
        
        // Esegui la chiamata diretta
        const url = appointmentId 
          ? `/api/appointments/${appointmentId}` 
          : "/api/appointments";
        
        const method = appointmentId ? "PUT" : "POST";
        
        console.log(`Invio richiesta DIRETTA ${method} a ${url} con dati:`, appointmentData);
        
        const response = await fetch(url, {
          method: method,
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify(appointmentData),
        });
        
        if (!response.ok) {
          throw new Error(`HTTP error! status: ${response.status}`);
        }
        
        const result = await response.json();
        console.log("RISPOSTA DIRETTA RICEVUTA:", result);
        
        // Invalida tutte le query relative agli appuntamenti
        console.log("Invalidazione diretta delle query");
        await queryClient.invalidateQueries({ queryKey: ['/api/appointments'] });
        
        const today = new Date();
        for (let i = 0; i < 30; i++) {
          const date = new Date(today);
          date.setDate(date.getDate() + i);
          const formattedDate = formatDateForApi(date);
          await queryClient.invalidateQueries({ 
            queryKey: [`/api/appointments/date/${formattedDate}`] 
          });
        }
        
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
        
        return;
      } catch (error: any) {
        console.error("ERRORE DURANTE RICHIESTA DIRETTA:", error);
        toast({
          title: "Errore durante il salvataggio diretto",
          description: `Si è verificato un errore: ${error.message}`,
          variant: "destructive"
        });
        // Proceed with normal mutation as fallback
      }
      
      // If direct approach failed, try with mutation
      console.log("Tentativo con mutation standard");
      mutation.mutate(data);
      
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

  // Loading state
  const isLoading = isLoadingClients || isLoadingServices || (appointmentId && isLoadingAppointment);

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
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
            {/* Client selector (visible only if no default client) */}
            {!defaultClientId ? (
              <FormField
                control={form.control}
                name="clientId"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Cliente</FormLabel>
                    <Select
                      value={String(field.value || "")}
                      onValueChange={(value) => field.onChange(parseInt(value))}
                    >
                      <FormControl>
                        <SelectTrigger className="w-full">
                          <SelectValue placeholder="Seleziona cliente" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        {clients.map((client: any) => (
                          <SelectItem key={client.id} value={client.id.toString()}>
                            {client.firstName} {client.lastName}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
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
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Servizio</FormLabel>
                  <Select
                    value={String(field.value || "")}
                    onValueChange={(value) => {
                      field.onChange(parseInt(value));
                      
                      // Calcola automaticamente l'orario di fine in base al servizio
                      const selectedService = services.find((s: any) => s.id === parseInt(value));
                      if (selectedService) {
                        console.log("Servizio selezionato con durata:", selectedService.duration);
                      }
                    }}
                  >
                    <FormControl>
                      <SelectTrigger className="w-full">
                        <SelectValue placeholder="Seleziona servizio" />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      {services.map((service: any) => (
                        <SelectItem key={service.id} value={service.id.toString()}>
                          {service.name} - {service.duration} min
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )}
            />
            
            {/* Informazioni sullo slot selezionato (informativo) */}
            <div className="p-3 bg-blue-50 rounded-md">
              <p className="text-sm text-blue-700 font-medium">Dettagli slot selezionato:</p>
              <div className="flex justify-between mt-1">
                <span className="text-sm">Data: {format(form.getValues().date, "PPP", { locale: it })}</span>
                <span className="text-sm">Ora: {form.getValues().startTime}</span>
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
                onClick={(e) => {
                  console.log("Pulsante Salva cliccato");
                  // Se siamo chiamati dalla modale, prova anche il metodo di salvataggio diretto
                  if (!appointmentId && form.getValues("clientId")) {
                    console.log("Tentativo di attivare il salvataggio diretto");
                    
                    // Estrai i valori esatti dal form tramite form.getValues()
                    const formValues = form.getValues();
                    
                    console.log("VALORI FORM ESTRATTI:", formValues);
                    
                    // Salva i valori in una variabile globale o locale storage
                    // per poterli recuperare dal modal
                    window.lastFormValues = formValues;
                    
                    const directButton = document.getElementById('saveAppointmentDirectButton');
                    if (directButton) {
                      console.log("Attivazione pulsante di salvataggio diretto");
                      e.preventDefault(); // Preveniamo il comportamento normale
                      directButton.click(); // Attiviamo il salvataggio diretto
                      return;
                    }
                  }
                }}
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
    </div>
  );
}