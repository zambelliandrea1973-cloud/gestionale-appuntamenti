import { useState, useEffect } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { format } from "date-fns";
import { apiRequest } from "@/lib/queryClient";
import { Button } from "@/components/ui/button";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Calendar } from "@/components/ui/calendar";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { useToast } from "@/hooks/use-toast";
import { Calendar as CalendarIcon, Plus, Trash } from "lucide-react";

interface InvoiceFormProps {
  invoiceId?: number;
  onClose: () => void;
  onSuccess: () => void;
}

const formSchema = z.object({
  clientId: z.string().min(1, { message: "Il cliente è obbligatorio" }),
  invoiceNumber: z.string().min(1, { message: "Il numero fattura è obbligatorio" }),
  date: z.date(),
  dueDate: z.date(),
  status: z.string().min(1, { message: "Lo stato è obbligatorio" }),
  tax: z.string().optional(),
  notes: z.string().optional(),
  items: z.array(
    z.object({
      description: z.string().min(1, { message: "La descrizione è obbligatoria" }),
      quantity: z.string().min(1, { message: "La quantità è obbligatoria" }),
      unitPrice: z.string().min(1, { message: "Il prezzo unitario è obbligatorio" }),
      serviceId: z.string().optional(),
      appointmentId: z.string().optional(),
    })
  ).min(1, { message: "Aggiungi almeno un elemento alla fattura" }),
});

type FormData = z.infer<typeof formSchema>;

export default function InvoiceForm({
  invoiceId,
  onClose,
  onSuccess,
}: InvoiceFormProps) {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [isLoadingInvoiceNumber, setIsLoadingInvoiceNumber] = useState(false);

  const form = useForm<FormData>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      clientId: "",
      invoiceNumber: "",
      date: new Date(),
      dueDate: new Date(),
      status: "unpaid",
      tax: "0",
      notes: "",
      items: [
        {
          description: "",
          quantity: "1",
          unitPrice: "",
          serviceId: "",
          appointmentId: "",
        },
      ],
    },
  });

  const { data: clients = [] } = useQuery({
    queryKey: ["/api/clients"],
  });

  const { data: services = [] } = useQuery({
    queryKey: ["/api/services"],
  });

  const { data: invoice } = useQuery({
    queryKey: ["/api/invoices", invoiceId],
    enabled: !!invoiceId,
  });

  const generateInvoiceNumber = async () => {
    try {
      setIsLoadingInvoiceNumber(true);
      const response = await apiRequest("GET", "/api/generate-invoice-number");
      const data = await response.json();
      form.setValue("invoiceNumber", data.invoiceNumber);
    } catch (error) {
      toast({
        title: "Errore",
        description: "Impossibile generare il numero fattura",
        variant: "destructive",
      });
    } finally {
      setIsLoadingInvoiceNumber(false);
    }
  };

  useEffect(() => {
    if (!invoiceId && !form.getValues("invoiceNumber")) {
      generateInvoiceNumber();
    }
  }, [invoiceId]);

  useEffect(() => {
    if (invoice) {
      // Popola il form con i dati della fattura esistente
      form.reset({
        clientId: invoice.clientId.toString(),
        invoiceNumber: invoice.invoiceNumber,
        date: new Date(invoice.date),
        dueDate: new Date(invoice.dueDate),
        status: invoice.status,
        tax: invoice.tax ? (invoice.tax / 100).toString() : "0",
        notes: invoice.notes || "",
        items: invoice.items.map((item: any) => ({
          description: item.description,
          quantity: item.quantity.toString(),
          unitPrice: (item.unitPrice / 100).toString(),
          serviceId: item.serviceId ? item.serviceId.toString() : "",
          appointmentId: item.appointmentId ? item.appointmentId.toString() : "",
        })),
      });
    }
  }, [invoice, form]);

  const createMutation = useMutation({
    mutationFn: async (data: any) => {
      return apiRequest("POST", "/api/invoices", data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/invoices"] });
      toast({
        title: "Fattura creata",
        description: "La fattura è stata creata con successo",
      });
      onSuccess();
    },
    onError: () => {
      toast({
        title: "Errore",
        description: "Non è stato possibile creare la fattura",
        variant: "destructive",
      });
    },
  });

  const updateMutation = useMutation({
    mutationFn: async ({ id, data }: { id: number; data: any }) => {
      return apiRequest("PUT", `/api/invoices/${id}`, data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/invoices"] });
      toast({
        title: "Fattura aggiornata",
        description: "La fattura è stata aggiornata con successo",
      });
      onSuccess();
    },
    onError: () => {
      toast({
        title: "Errore",
        description: "Non è stato possibile aggiornare la fattura",
        variant: "destructive",
      });
    },
  });

  const onSubmit = async (formData: FormData) => {
    try {
      // Calcola il totale
      const totalAmount = formData.items.reduce(
        (sum, item) => 
          sum + parseInt(item.quantity) * parseFloat(item.unitPrice) * 100,
        0
      );

      const taxAmount = formData.tax 
        ? Math.round(totalAmount * (parseFloat(formData.tax) / 100))
        : 0;

      const invoiceData = {
        clientId: parseInt(formData.clientId),
        invoiceNumber: formData.invoiceNumber,
        date: format(formData.date, "yyyy-MM-dd"),
        dueDate: format(formData.dueDate, "yyyy-MM-dd"),
        status: formData.status,
        totalAmount: Math.round(totalAmount),
        tax: taxAmount,
        notes: formData.notes || null,
      };

      if (invoiceId) {
        // Update
        await updateMutation.mutateAsync({
          id: invoiceId,
          data: invoiceData,
        });

        // Gestione degli elementi della fattura tramite API separate
        // Questo è semplificato - in un'implementazione reale dovresti gestire
        // l'aggiornamento/eliminazione degli elementi esistenti
      } else {
        // Create
        const response = await createMutation.mutateAsync(invoiceData);
        
        if (response.ok) {
          const newInvoice = await response.json();
          
          // Aggiunta degli elementi della fattura
          for (const item of formData.items) {
            await apiRequest("POST", "/api/invoice-items", {
              invoiceId: newInvoice.id,
              description: item.description,
              quantity: parseInt(item.quantity),
              unitPrice: Math.round(parseFloat(item.unitPrice) * 100),
              serviceId: item.serviceId ? parseInt(item.serviceId) : null,
              appointmentId: item.appointmentId ? parseInt(item.appointmentId) : null,
            });
          }
        }
      }
    } catch (error) {
      toast({
        title: "Errore",
        description: "Si è verificato un errore durante il salvataggio della fattura",
        variant: "destructive",
      });
    }
  };

  const addItem = () => {
    const items = form.getValues("items");
    form.setValue("items", [
      ...items,
      {
        description: "",
        quantity: "1",
        unitPrice: "",
        serviceId: "",
        appointmentId: "",
      },
    ]);
  };

  const removeItem = (index: number) => {
    const items = form.getValues("items");
    if (items.length > 1) {
      form.setValue(
        "items",
        items.filter((_, i) => i !== index)
      );
    }
  };

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-8 mt-4">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <FormField
            control={form.control}
            name="clientId"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Cliente</FormLabel>
                <Select
                  value={field.value}
                  onValueChange={field.onChange}
                  disabled={field.disabled}
                >
                  <FormControl>
                    <SelectTrigger>
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

          <FormField
            control={form.control}
            name="invoiceNumber"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Numero fattura</FormLabel>
                <div className="flex gap-2">
                  <FormControl>
                    <Input {...field} />
                  </FormControl>
                  <Button
                    type="button"
                    variant="outline"
                    onClick={generateInvoiceNumber}
                    disabled={isLoadingInvoiceNumber}
                  >
                    {isLoadingInvoiceNumber ? "..." : "Genera"}
                  </Button>
                </div>
                <FormMessage />
              </FormItem>
            )}
          />
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <FormField
            control={form.control}
            name="date"
            render={({ field }) => (
              <FormItem className="flex flex-col">
                <FormLabel>Data fattura</FormLabel>
                <Popover>
                  <PopoverTrigger asChild>
                    <FormControl>
                      <Button
                        variant={"outline"}
                        className="pl-3 text-left font-normal"
                      >
                        {field.value ? (
                          format(field.value, "dd/MM/yyyy")
                        ) : (
                          <span>Seleziona una data</span>
                        )}
                        <CalendarIcon className="ml-auto h-4 w-4 opacity-50" />
                      </Button>
                    </FormControl>
                  </PopoverTrigger>
                  <PopoverContent className="w-auto p-0" align="start">
                    <Calendar
                      mode="single"
                      selected={field.value}
                      onSelect={field.onChange}
                      disabled={(date) => date < new Date("2000-01-01")}
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
            name="dueDate"
            render={({ field }) => (
              <FormItem className="flex flex-col">
                <FormLabel>Data scadenza</FormLabel>
                <Popover>
                  <PopoverTrigger asChild>
                    <FormControl>
                      <Button
                        variant={"outline"}
                        className="pl-3 text-left font-normal"
                      >
                        {field.value ? (
                          format(field.value, "dd/MM/yyyy")
                        ) : (
                          <span>Seleziona una data</span>
                        )}
                        <CalendarIcon className="ml-auto h-4 w-4 opacity-50" />
                      </Button>
                    </FormControl>
                  </PopoverTrigger>
                  <PopoverContent className="w-auto p-0" align="start">
                    <Calendar
                      mode="single"
                      selected={field.value}
                      onSelect={field.onChange}
                      disabled={(date) => date < new Date("2000-01-01")}
                      initialFocus
                    />
                  </PopoverContent>
                </Popover>
                <FormMessage />
              </FormItem>
            )}
          />
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <FormField
            control={form.control}
            name="status"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Stato</FormLabel>
                <Select
                  value={field.value}
                  onValueChange={field.onChange}
                  disabled={field.disabled}
                >
                  <FormControl>
                    <SelectTrigger>
                      <SelectValue placeholder="Seleziona stato" />
                    </SelectTrigger>
                  </FormControl>
                  <SelectContent>
                    <SelectItem value="unpaid">Non pagata</SelectItem>
                    <SelectItem value="paid">Pagata</SelectItem>
                    <SelectItem value="overdue">Scaduta</SelectItem>
                    <SelectItem value="cancelled">Annullata</SelectItem>
                  </SelectContent>
                </Select>
                <FormMessage />
              </FormItem>
            )}
          />

          <FormField
            control={form.control}
            name="tax"
            render={({ field }) => (
              <FormItem>
                <FormLabel>IVA (%)</FormLabel>
                <FormControl>
                  <Input
                    {...field}
                    type="number"
                    min="0"
                    max="100"
                    step="0.1"
                  />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
        </div>

        <FormField
          control={form.control}
          name="notes"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Note</FormLabel>
              <FormControl>
                <Textarea
                  {...field}
                  placeholder="Note aggiuntive per la fattura"
                />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        <Card>
          <CardHeader>
            <CardTitle>Elementi fattura</CardTitle>
            <CardDescription>
              Aggiungi gli elementi da includere nella fattura
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {form.getValues("items").map((_, index) => (
              <div
                key={index}
                className="grid grid-cols-1 md:grid-cols-4 gap-4 items-end border-b pb-4"
              >
                <FormField
                  control={form.control}
                  name={`items.${index}.description`}
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Descrizione</FormLabel>
                      <FormControl>
                        <Input {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name={`items.${index}.quantity`}
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Quantità</FormLabel>
                      <FormControl>
                        <Input {...field} type="number" min="1" />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name={`items.${index}.unitPrice`}
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Prezzo (€)</FormLabel>
                      <FormControl>
                        <Input {...field} type="number" min="0" step="0.01" />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name={`items.${index}.serviceId`}
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Servizio (opzionale)</FormLabel>
                      <Select
                        value={field.value}
                        onValueChange={field.onChange}
                        disabled={field.disabled}
                      >
                        <FormControl>
                          <SelectTrigger>
                            <SelectValue placeholder="Seleziona servizio" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          <SelectItem value="">Nessun servizio</SelectItem>
                          {services.map((service: any) => (
                            <SelectItem
                              key={service.id}
                              value={service.id.toString()}
                            >
                              {service.name} - {(service.price / 100).toFixed(2)}€
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  className="md:col-span-4 w-fit"
                  onClick={() => removeItem(index)}
                >
                  <Trash className="h-4 w-4 mr-2" />
                  Rimuovi elemento
                </Button>
              </div>
            ))}

            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={addItem}
              className="mt-2"
            >
              <Plus className="h-4 w-4 mr-2" />
              Aggiungi elemento
            </Button>
          </CardContent>

          <CardFooter className="flex justify-between">
            <Button variant="outline" onClick={onClose}>
              Annulla
            </Button>
            <Button
              type="submit"
              disabled={createMutation.isPending || updateMutation.isPending}
            >
              {createMutation.isPending || updateMutation.isPending
                ? "Salvataggio..."
                : invoiceId
                ? "Aggiorna"
                : "Crea fattura"}
            </Button>
          </CardFooter>
        </Card>
      </form>
    </Form>
  );
}