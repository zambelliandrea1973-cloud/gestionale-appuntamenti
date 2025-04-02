import { useState, useEffect } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { useMutation, useQuery } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import { queryClient } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { calculateEndTime, formatDateForApi } from "@/lib/utils/date";
import { insertAppointmentSchema } from "@shared/schema";
import { Plus, Loader2 } from "lucide-react";
import {
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { type Locale } from "date-fns";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
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
  defaultTime = "09:00" 
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
      clientId: undefined,
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
    mutationFn: async (data: FormData) => {
      // Calculate end time based on service duration
      const service = services.find(s => s.id === data.serviceId);
      const endTime = calculateEndTime(data.startTime, service?.duration || 60);
      
      const apiData = {
        clientId: data.clientId,
        serviceId: data.serviceId,
        date: formatDateForApi(data.date),
        startTime: data.startTime,
        endTime: endTime,
        notes: data.notes,
        status: "scheduled"
      };

      if (appointmentId) {
        return apiRequest("PUT", `/api/appointments/${appointmentId}`, apiData);
      } else {
        return apiRequest("POST", "/api/appointments", apiData);
      }
    },
    onError: (error) => {
      toast({
        title: "Errore",
        description: `Si è verificato un errore: ${error.message}`,
        variant: "destructive",
      });
    }
  });
  
  const onSubmit = (data: FormData) => {
    mutation.mutate(data);
  };
  
  const handleClientCreated = (newClientId: number) => {
    form.setValue("clientId", newClientId);
    setIsClientDialogOpen(false);
    queryClient.invalidateQueries({ queryKey: ['/api/clients'] });
  };
  
  // Loading state
  const isLoading = isLoadingClients || isLoadingServices || (appointmentId && isLoadingAppointment);
  
  return (
    <DialogContent className="sm:max-w-[600px]">
      <DialogHeader>
        <DialogTitle>
          {appointmentId ? "Modifica Appuntamento" : "Nuovo Appuntamento"}
        </DialogTitle>
      </DialogHeader>
      
      {isLoading ? (
        <div className="flex justify-center p-6">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
        </div>
      ) : (
        <Form {...form}>
          <form onSubmit={(e) => {
            e.preventDefault();
            // Questo evita il submit normale e gestisce manualmente la logica
            const data = form.getValues();
            // Esegue la validazione del form
            form.trigger().then(isValid => {
              if (isValid) {
                // Solo se valido, esegue la mutazione
                mutation.mutate(data as FormData, {
                  onSuccess: async () => {
                    toast({
                      title: appointmentId ? "Appuntamento aggiornato" : "Appuntamento creato",
                      description: appointmentId 
                        ? "L'appuntamento è stato aggiornato con successo" 
                        : "Nuovo appuntamento creato con successo",
                    });
                    
                    // Invalidate queries to refresh data
                    await queryClient.invalidateQueries({ queryKey: ['/api/appointments'] });
                    
                    // Invalidate date-specific queries
                    const dateString = formatDateForApi(form.getValues().date);
                    await queryClient.invalidateQueries({ queryKey: [`/api/appointments/date/${dateString}`] });
                    
                    // Invalidate range queries for calendar views
                    await queryClient.invalidateQueries({ queryKey: ['/api/appointments/range'] });
                    
                    console.log("Appuntamento salvato con successo, date invalidate");
                    
                    // Chiude il form immediatamente
                    onClose();
                  }
                });
              }
            });
          }} className="space-y-4 py-2">
            {/* Client selector with option to create new */}
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
            
            <DialogFooter>
              <Button
                type="button"
                variant="outline"
                onClick={onClose}
                disabled={mutation.isPending}
              >
                Annulla
              </Button>
              <Button 
                type="button" 
                onClick={(e) => {
                  e.preventDefault();
                  form.handleSubmit((data) => {
                    mutation.mutate(data, {
                      onSuccess: async () => {
                        toast({
                          title: appointmentId ? "Appuntamento aggiornato" : "Appuntamento creato",
                          description: appointmentId 
                            ? "L'appuntamento è stato aggiornato con successo" 
                            : "Nuovo appuntamento creato con successo",
                        });
                        
                        // Invalidate queries to refresh data
                        await queryClient.invalidateQueries({ queryKey: ['/api/appointments'] });
                        
                        // Invalidate date-specific queries
                        const dateString = formatDateForApi(form.getValues().date);
                        await queryClient.invalidateQueries({ queryKey: [`/api/appointments/date/${dateString}`] });
                        
                        // Invalidate range queries for calendar views
                        await queryClient.invalidateQueries({ queryKey: ['/api/appointments/range'] });
                        
                        console.log("Appuntamento salvato con successo, date invalidate");
                        
                        // Chiude il form immediatamente
                        onClose();
                      }
                    });
                  })();
                }}
                disabled={mutation.isPending}
              >
                {mutation.isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                {appointmentId ? "Aggiorna" : "Salva"} Appuntamento
              </Button>
            </DialogFooter>
          </form>
        </Form>
      )}
    </DialogContent>
  );
}

// Helper function to format date
function format(date: Date, format: string, options?: { locale: Locale }): string {
  return new Intl.DateTimeFormat("it-IT", {
    day: "numeric",
    month: "long",
    year: "numeric",
  }).format(date);
}

// Implementazione minima di Locale per evitare errori di tipo
const it: Locale = {
  code: "it",
  formatLong: {
    date: () => "dd/MM/yyyy",
  },
  formatDistance: () => "",
  formatRelative: () => "",
  localize: {
    ordinalNumber: () => "",
    era: () => [""],
    quarter: () => [""],
    month: () => [""],
    day: () => [""],
    dayPeriod: () => [""]
  },
  match: {
    ordinalNumber: () => ({ match: null, result: 0 }),
    era: () => ({ match: null, result: 0 }),
    quarter: () => ({ match: null, result: 0 }),
    month: () => ({ match: null, result: 0 }),
    day: () => ({ match: null, result: 0 }),
    dayPeriod: () => ({ match: null, result: 0 })
  },
  options: {
    weekStartsOn: 1,
    firstWeekContainsDate: 4
  }
};