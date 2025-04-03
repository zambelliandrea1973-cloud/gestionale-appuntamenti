import { useState, useEffect } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
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
    enabled: !!appointmentId,
  });
  
  // Setup form with default values
  const form = useForm<FormData>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      clientId: defaultClientId || undefined,
      serviceId: undefined,
      date: defaultDate,
      startTime: defaultTime,
      notes: ""
    }
  });
  
  // Update form when editing or when defaultClientId changes
  useEffect(() => {
    if (appointment) {
      const date = new Date(appointment.date);
      const startTime = appointment.startTime.slice(0, 5); // Format HH:MM from HH:MM:SS
      
      form.reset({
        clientId: appointment.clientId,
        serviceId: appointment.serviceId,
        date: date,
        startTime: startTime,
        notes: appointment.notes || ""
      });
    } else if (defaultClientId) {
      form.setValue("clientId", defaultClientId);
    }
  }, [appointment, defaultClientId, form]);
  
  // Mutation per salvare l'appuntamento
  const mutation = useMutation({
    mutationFn: async (data: any) => {
      console.log("Tentativo di creazione appuntamento con dati:", data);

      // Verifica che i dati siano completi
      if (!data.clientId || !data.serviceId || !data.date || !data.startTime || !data.endTime) {
        console.error("Dati incompleti:", data);
        throw new Error("Dati appuntamento incompleti");
      }

      // Eseguiamo la chiamata direttamente con fetch per evitare problemi
      const url = appointmentId ? `/api/appointments/${appointmentId}` : "/api/appointments";
      const method = appointmentId ? "PUT" : "POST";
      
      console.log(`Esecuzione fetch ${method} a ${url} con dati:`, data);
      
      const response = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
        credentials: "include"
      });
      
      console.log(`Risposta ricevuta da ${url}:`, response.status, response.statusText);
      
      if (!response.ok) {
        const errorText = await response.text();
        console.error(`Errore durante la chiamata API (${response.status}):`, errorText);
        throw new Error(`Errore ${response.status}: ${errorText || response.statusText}`);
      }
      
      // Convertiamo la risposta in JSON e restituiamo
      const responseJson = await response.json();
      console.log("Risposta JSON ricevuta:", responseJson);
      return responseJson;
    },
    onSuccess: async (data, variables) => {
      console.log("Mutation completata con successo, dati ricevuti:", data);
      
      toast({
        title: appointmentId ? "Appuntamento aggiornato" : "Appuntamento creato",
        description: appointmentId 
          ? "L'appuntamento è stato aggiornato con successo" 
          : "Nuovo appuntamento creato con successo",
      });
      
      try {
        // Invalidiamo tutte le query correlate agli appuntamenti
        console.log("Inizia invalidazione queries dopo salvataggio");
        
        // Invalidiamo lista generale appuntamenti
        await queryClient.invalidateQueries({ queryKey: ['/api/appointments'] });
        console.log("Lista generale appuntamenti invalidata");
        
        // Invalidiamo query per data specifica
        if (variables.date) {
          const dateString = typeof variables.date === 'string' 
            ? variables.date 
            : formatDateForApi(variables.date);
          await queryClient.invalidateQueries({ queryKey: [`/api/appointments/date/${dateString}`] });
          console.log("Query per data specifica invalidata:", dateString);
        }
        
        // Invalidiamo query per intervalli di date
        await queryClient.invalidateQueries({ 
          queryKey: ['/api/appointments/range'] 
        });
        console.log("Query per intervalli di date invalidate");
        
        // Invalidiamo query per appuntamenti di clienti specifici
        if (variables.clientId) {
          await queryClient.invalidateQueries({ 
            queryKey: [`/api/appointments/client/${variables.clientId}`] 
          });
          console.log("Query per appuntamenti del cliente invalidate:", variables.clientId);
        }
        
        console.log("Tutte le query invalidate con successo");
        
        // Piccolo ritardo per assicurarsi che l'UI si aggiorni prima di chiudere
        setTimeout(() => {
          // Chiudiamo il form dopo aver invalidato tutte le query
          if (typeof onClose === 'function') {
            console.log("Chiusura form di appuntamento");
            onClose();
          } else {
            console.error("onClose non è una funzione valida:", onClose);
          }
        }, 100);
      } catch (error) {
        console.error("Errore durante l'invalidazione delle query:", error);
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
                            {clients.map((client: any) => (
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
                  <FormControl>
                    <Select
                      value={field.value?.toString()}
                      onValueChange={(value) => field.onChange(parseInt(value))}
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Seleziona servizio" />
                      </SelectTrigger>
                      <SelectContent>
                        {services.map((service: any) => (
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