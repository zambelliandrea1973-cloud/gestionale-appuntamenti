import { useState, useEffect } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { useMutation, useQuery } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import { queryClient } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { calculateEndTime, formatDateForApi } from "@/lib/utils/date";
import { insertAppointmentSchema, Client, Service } from "@shared/schema";
import { Plus, Loader2, X } from "lucide-react";
import type { Locale } from "date-fns";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import ClientForm from "./ClientForm";
import { Dialog, DialogTrigger } from "@/components/ui/dialog";

interface AppointmentFormProps {
  appointmentId?: number;
  onClose: () => void;
  defaultDate?: Date;
  defaultTime?: string;
  clientId?: number;  // Cliente preselezionato, utile quando si apre dalla scheda cliente
}

// Extended schema with validation
const formSchema = insertAppointmentSchema.extend({
  date: z.date({ required_error: "La data è obbligatoria" }),
  startTime: z.string({ required_error: "L'ora di inizio è obbligatoria" })
    .regex(/^([01]?[0-9]|2[0-3]):[0-5][0-9]$/, "Formato ora non valido (HH:MM)"),
  clientId: z.number({ 
    required_error: "Seleziona un cliente",
    invalid_type_error: "Seleziona un cliente valido" 
  }),
  serviceId: z.number({ 
    required_error: "Seleziona un servizio",
    invalid_type_error: "Seleziona un servizio valido" 
  }),
});

type FormData = z.infer<typeof formSchema>;

export default function AppointmentForm({ 
  appointmentId,
  onClose,
  defaultDate = new Date(),
  defaultTime = "09:00",
  clientId: defaultClientId
}: AppointmentFormProps) {
  const { toast } = useToast();
  const [isClientDialogOpen, setIsClientDialogOpen] = useState(false);
  
  // Fetch clients
  const { data: clients = [], isLoading: isLoadingClients } = useQuery({
    queryKey: ["/api/clients"]
  });
  
  // Fetch services
  const { data: services = [], isLoading: isLoadingServices } = useQuery({
    queryKey: ["/api/services"]
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
      clientId: defaultClientId,
      serviceId: undefined,
      date: defaultDate,
      startTime: defaultTime,
      notes: ""
    }
  });
  
  // Update form values when editing existing appointment
  useEffect(() => {
    if (appointment) {
      form.reset({
        clientId: appointment.clientId,
        serviceId: appointment.serviceId,
        date: new Date(appointment.date),
        startTime: appointment.startTime,
        notes: appointment.notes || ""
      });
    }
  }, [appointment, form]);
  
  // Create or update appointment mutation
  const mutation = useMutation({
    mutationFn: async (data: {
      clientId: number;
      serviceId: number;
      date: string;
      startTime: string;
      endTime: string;
      notes?: string;
      status: string;
    }) => {
      console.log("Tentativo di creazione appuntamento con dati:", data);

      // Verifica che i dati siano completi
      if (!data.clientId || !data.serviceId || !data.date || !data.startTime || !data.endTime) {
        console.error("Dati incompleti:", data);
        throw new Error("Dati appuntamento incompleti");
      }

      if (appointmentId) {
        return apiRequest("PUT", `/api/appointments/${appointmentId}`, data);
      } else {
        return apiRequest("POST", "/api/appointments", data);
      }
    },
    onSuccess: async (response, variables) => {
      console.log("Risposta ricevuta:", response);
      toast({
        title: appointmentId ? "Appuntamento aggiornato" : "Appuntamento creato",
        description: appointmentId 
          ? "L'appuntamento è stato aggiornato con successo" 
          : "Nuovo appuntamento creato con successo",
      });
      
      // Invalidate all appointment-related queries to ensure fresh data
      console.log("Inizia invalidazione queries dopo salvataggio");
      
      // Force invalidation of the specific date query
      const dateString = formatDateForApi(variables.date);
      console.log("Invalidazione query per data specifica:", dateString);
      await queryClient.invalidateQueries({ queryKey: [`/api/appointments/date/${dateString}`] });
      
      // Invalidate all appointments
      console.log("Invalidazione lista generale appuntamenti");
      await queryClient.invalidateQueries({ queryKey: ['/api/appointments'] });
      
      // Invalidate range queries for calendar views
      console.log("Invalidazione query per intervalli di date (range)");
      await queryClient.invalidateQueries({ queryKey: ['/api/appointments/range'] });
      
      // Invalidate specific client's appointments
      if (variables.clientId) {
        console.log("Invalidazione appuntamenti del cliente:", variables.clientId);
        await queryClient.invalidateQueries({ queryKey: [`/api/appointments/client/${variables.clientId}`] });
      }
      
      // Logging for confirmation
      console.log("Appuntamento salvato con successo, date invalidate");
      
      // Forziamo un refresh dell'UI per mostrare i nuovi dati
      console.log("Forzatura refresh UI");
      
      // Chiudiamo il form
      console.log("Chiusura del form di appuntamento");
      if (typeof onClose === 'function') {
        onClose();
      } else {
        console.error("onClose non è una funzione valida:", onClose);
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
      console.log("Submitting form with data:", data);
      
      // Validazioni aggiuntive lato client
      if (!data.clientId) {
        toast({
          title: "Errore",
          description: "Seleziona un cliente",
          variant: "destructive"
        });
        return;
      }
      
      if (!data.serviceId) {
        toast({
          title: "Errore",
          description: "Seleziona un servizio",
          variant: "destructive"
        });
        return;
      }
      
      if (!data.date) {
        toast({
          title: "Errore",
          description: "Seleziona una data",
          variant: "destructive"
        });
        return;
      }
      
      if (!data.startTime) {
        toast({
          title: "Errore",
          description: "Seleziona un orario",
          variant: "destructive"
        });
        return;
      }
      
      // Verifica se il cliente ha fornito il consenso
      const selectedClient = clients.find(c => c.id === data.clientId);
      if (selectedClient && !selectedClient.hasConsent) {
        // Mostra un avviso, ma permetti comunque di procedere
        toast({
          title: "Attenzione",
          description: "Il cliente non ha fornito il consenso al trattamento dei dati. L'appuntamento verrà comunque creato.",
          variant: "destructive",
          duration: 5000,
        });
      }
      
      // Calcoliamo l'orario di fine in base alla durata del servizio selezionato
      const service = services.find(s => s.id === data.serviceId);
      
      let endTime = "";
      if (service) {
        // Calcoliamo l'orario di fine in base alla durata del servizio
        const [hours, minutes] = data.startTime.split(':').map(Number);
        const startMinutes = hours * 60 + minutes;
        const endMinutes = startMinutes + service.duration;
        
        const endHours = Math.floor(endMinutes / 60);
        const endMins = endMinutes % 60;
        
        endTime = `${endHours.toString().padStart(2, '0')}:${endMins.toString().padStart(2, '0')}`;
        console.log(`Calcolato orario di fine: ${endTime} per servizio con durata ${service.duration} minuti`);
      } else {
        // Se non troviamo il servizio, utilizziamo un valore di default (1 ora dopo)
        console.warn("Servizio non trovato, utilizzando durata predefinita di 60 minuti");
        const [hours, minutes] = data.startTime.split(':').map(Number);
        const startMinutes = hours * 60 + minutes;
        const endMinutes = startMinutes + 60; // Default 1 ora
        
        const endHours = Math.floor(endMinutes / 60);
        const endMins = endMinutes % 60;
        
        endTime = `${endHours.toString().padStart(2, '0')}:${endMins.toString().padStart(2, '0')}`;
      }
      
      // Prepara i dati per l'invio
      const formattedDate = formatDateForApi(data.date);
      
      const appointment = {
        clientId: data.clientId,
        serviceId: data.serviceId,
        date: formattedDate,
        startTime: data.startTime + ":00", // Aggiungiamo i secondi per uniformità
        endTime: endTime + ":00", // Aggiungiamo i secondi per uniformità
        notes: data.notes || "",
        status: "scheduled"
      };
      
      console.log("Invio appuntamento al server:", appointment);
      
      // Inviamo i dati direttamente con la mutation
      mutation.mutate(appointment);
    } catch (error) {
      console.error("Errore durante la preparazione dei dati:", error);
      toast({
        title: "Errore",
        description: "Si è verificato un errore durante la preparazione dei dati",
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
            {/* Client selector (visibile solo se non c'è un cliente preselezionato) */}
            {!defaultClientId ? (
              <FormField
                control={form.control}
                name="clientId"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Cliente</FormLabel>
                    <div className="flex gap-2">
                      <FormControl>
                        <Select
                          value={field.value?.toString()}
                          onValueChange={(value) => field.onChange(parseInt(value))}
                        >
                          <SelectTrigger>
                            <SelectValue placeholder="Seleziona cliente" />
                          </SelectTrigger>
                          <SelectContent>
                            {clients.map((client) => (
                              <SelectItem key={client.id} value={client.id.toString()}>
                                {client.firstName} {client.lastName}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </FormControl>
                      
                      <Dialog open={isClientDialogOpen} onOpenChange={setIsClientDialogOpen}>
                        <DialogTrigger asChild>
                          <Button variant="outline" type="button" size="icon">
                            <Plus className="h-4 w-4" />
                          </Button>
                        </DialogTrigger>
                        <ClientForm onClientCreated={handleClientCreated} onClose={() => setIsClientDialogOpen(false)} />
                      </Dialog>
                    </div>
                    <FormMessage />
                  </FormItem>
                )}
              />
            ) : (
              // Se c'è un cliente preselezionato, mostra solo il nome
              <FormField
                control={form.control}
                name="clientId"
                render={({ field }) => {
                  // Trova il cliente selezionato
                  const selectedClient = clients.find(c => c.id === field.value);
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
                  <FormControl>
                    <Select
                      value={field.value?.toString()}
                      onValueChange={(value) => field.onChange(parseInt(value))}
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Seleziona servizio" />
                      </SelectTrigger>
                      <SelectContent>
                        {services.map((service) => (
                          <SelectItem key={service.id} value={service.id.toString()}>
                            {service.name} - {service.duration} min
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            
            {/* Date and time pickers */}
            <div className="grid grid-cols-2 gap-4">
              <FormField
                control={form.control}
                name="date"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Data</FormLabel>
                    <Popover>
                      <PopoverTrigger asChild>
                        <FormControl>
                          <Button
                            variant="outline"
                            className="w-full justify-start text-left font-normal"
                          >
                            {field.value ? (
                              format(field.value, "PPP", { locale: it })
                            ) : (
                              <span>Seleziona data</span>
                            )}
                          </Button>
                        </FormControl>
                      </PopoverTrigger>
                      <PopoverContent className="w-auto p-0">
                        <Calendar
                          mode="single"
                          selected={field.value}
                          onSelect={field.onChange}
                          initialFocus
                        />
                      </PopoverContent>
                    </Popover>
                    <FormMessage />
                  </FormItem>
                )}
              />
              
              <FormField
                control={form.control}
                name="startTime"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Ora</FormLabel>
                    <FormControl>
                      <Input
                        type="time"
                        {...field}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
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
                {mutation.isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                {appointmentId ? "Aggiorna" : "Salva"} Appuntamento
              </Button>
            </div>
          </form>
        </Form>
      )}
    </div>
  );
}

// Helper function to format date
// Implementazione semplificata per formattare le date
function format(date: Date, format: string, options?: { locale: Locale }): string {
  return new Intl.DateTimeFormat("it-IT", {
    day: "numeric",
    month: "long",
    year: "numeric",
  }).format(date);
}

// Oggetto Locale semplificato
const it = {
  code: "it",
  formatLong: {
    date: () => "dd/MM/yyyy",
    time: () => "HH:mm",
    dateTime: () => "dd/MM/yyyy HH:mm",
  },
  formatDistance: () => "",
  formatRelative: () => "",
  localize: {
    ordinalNumber: () => "",
    era: () => "",
    quarter: () => "",
    month: () => "",
    day: () => "",
    dayPeriod: () => ""
  },
  match: {
    ordinalNumber: () => ({ value: 0, rest: "" }),
    era: () => ({ value: 0, rest: "" }),
    quarter: () => ({ value: 0, rest: "" }),
    month: () => ({ value: 0, rest: "" }),
    day: () => ({ value: 0, rest: "" }),
    dayPeriod: () => ({ value: 0, rest: "" })
  },
  options: {
    weekStartsOn: 1,
    firstWeekContainsDate: 4
  }
};