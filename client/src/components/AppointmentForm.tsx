import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { useMutation, useQuery } from "@tanstack/react-query";
import { queryClient, apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { insertAppointmentSchema } from "@shared/schema";
import { Loader2, X, Plus, Calendar } from "lucide-react";
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
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { Calendar as CalendarComponent } from "@/components/ui/calendar";
import { Dialog, DialogTrigger } from "@/components/ui/dialog";
import ClientForm from "./ClientForm";

interface AppointmentFormProps {
  appointmentId?: number;
  onClose: () => void;
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
      console.log("Tentativo di salvataggio appuntamento con dati:", data);
      
      // Controlli preliminari
      if (!data.clientId || !data.serviceId || !data.date || !data.startTime) {
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
      
      // Close form after a short delay to ensure UI updates
      setTimeout(() => {
        onClose();
      }, 100);
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

  const onSubmit = (data: FormData) => {
    try {
      console.log("Invio form appuntamento con dati:", data);
      
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
      
      // Submit data
      mutation.mutate(data);
    } catch (error: any) {
      console.error("Errore durante la preparazione dei dati:", error);
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
                            <Calendar className="ml-auto h-4 w-4 opacity-50" />
                          </Button>
                        </FormControl>
                      </PopoverTrigger>
                      <PopoverContent className="w-auto p-0">
                        <CalendarComponent
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