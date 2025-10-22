import { useEffect } from "react";
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
  FormDescription,
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
import { Card, CardContent, CardFooter } from "@/components/ui/card";
import { useToast } from "@/hooks/use-toast";
import { Calendar as CalendarIcon } from "lucide-react";

interface PaymentFormProps {
  invoiceId?: number;
  onClose: () => void;
  onSuccess: () => void;
}

const formSchema = z.object({
  invoiceId: z.string().min(1, { message: "La fattura è obbligatoria" }),
  amount: z.string().min(1, { message: "L'importo è obbligatorio" }),
  paymentDate: z.date(),
  paymentMethod: z.string().min(1, { message: "Il metodo di pagamento è obbligatorio" }),
  reference: z.string().optional(),
  notes: z.string().optional(),
});

type FormData = z.infer<typeof formSchema>;

export default function PaymentForm({
  invoiceId,
  onClose,
  onSuccess,
}: PaymentFormProps) {
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const form = useForm<FormData>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      invoiceId: invoiceId ? invoiceId.toString() : "",
      amount: "",
      paymentDate: new Date(),
      paymentMethod: "cash",
      reference: "",
      notes: "",
    },
  });

  const { data: invoices = [] } = useQuery({
    queryKey: ["/api/invoices"],
    enabled: !invoiceId,
  });

  const { data: invoice } = useQuery({
    queryKey: ["/api/invoices", invoiceId],
    enabled: !!invoiceId,
  });

  useEffect(() => {
    if (invoice) {
      // Calcola il saldo e imposta l'importo predefinito
      const totalPaid = invoice.payments.reduce((sum: number, payment: any) => sum + payment.amount, 0);
      const balance = invoice.totalAmount - totalPaid;
      
      if (balance > 0) {
        form.setValue("amount", (balance / 100).toString());
      }
    }
  }, [invoice, form]);

  const createMutation = useMutation({
    mutationFn: async (data: any) => {
      return apiRequest("POST", "/api/payments", data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/invoices"] });
      toast({
        title: "Pagamento registrato",
        description: "Il pagamento è stato registrato con successo",
      });
      onSuccess();
    },
    onError: () => {
      toast({
        title: "Errore",
        description: "Non è stato possibile registrare il pagamento",
        variant: "destructive",
      });
    },
  });

  const onSubmit = async (formData: FormData) => {
    try {
      const paymentData = {
        invoiceId: parseInt(formData.invoiceId),
        amount: Math.round(parseFloat(formData.amount) * 100),
        paymentDate: format(formData.paymentDate, "yyyy-MM-dd"),
        paymentMethod: formData.paymentMethod,
        reference: formData.reference || null,
        notes: formData.notes || null,
      };

      await createMutation.mutateAsync(paymentData);
    } catch (error) {
      toast({
        title: "Errore",
        description: "Si è verificato un errore durante il salvataggio del pagamento",
        variant: "destructive",
      });
    }
  };

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-8 mt-4">
        <FormField
          control={form.control}
          name="invoiceId"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Fattura</FormLabel>
              <Select
                value={field.value}
                onValueChange={field.onChange}
                disabled={!!invoiceId}
              >
                <FormControl>
                  <SelectTrigger>
                    <SelectValue placeholder="Seleziona fattura" />
                  </SelectTrigger>
                </FormControl>
                <SelectContent>
                  {invoices.map((inv: any) => (
                    <SelectItem key={inv.id} value={inv.id.toString()}>
                      {inv.invoiceNumber} - {inv.client.firstName} {inv.client.lastName}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <FormMessage />
            </FormItem>
          )}
        />

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <FormField
            control={form.control}
            name="amount"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Importo (€)</FormLabel>
                <FormControl>
                  <Input {...field} type="number" min="0" step="0.01" />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />

          <FormField
            control={form.control}
            name="paymentMethod"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Metodo di pagamento</FormLabel>
                <Select
                  value={field.value}
                  onValueChange={field.onChange}
                  disabled={field.disabled}
                >
                  <FormControl>
                    <SelectTrigger>
                      <SelectValue placeholder="Seleziona metodo" />
                    </SelectTrigger>
                  </FormControl>
                  <SelectContent>
                    <SelectItem value="cash">Contanti</SelectItem>
                    <SelectItem value="card">Carta</SelectItem>
                    <SelectItem value="bank_transfer">Bonifico</SelectItem>
                  </SelectContent>
                </Select>
                <FormMessage />
              </FormItem>
            )}
          />
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <FormField
            control={form.control}
            name="paymentDate"
            render={({ field }) => (
              <FormItem className="flex flex-col">
                <FormLabel>Data pagamento</FormLabel>
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
            name="reference"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Riferimento</FormLabel>
                <FormControl>
                  <Input {...field} placeholder="Numero transazione, assegno, ecc." />
                </FormControl>
                <FormDescription>
                  Opzionale - Utile per bonifici o pagamenti con carta
                </FormDescription>
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
                  placeholder="Note aggiuntive per il pagamento"
                />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        <Card>
          <CardContent className="pt-6">
            <div className="text-center">
              <p className="text-muted-foreground mb-2">
                Registrando un pagamento, lo stato della fattura verrà
                automaticamente aggiornato se il saldo è completamente pagato.
              </p>
            </div>
          </CardContent>
          <CardFooter className="flex justify-between">
            <Button variant="outline" onClick={onClose}>
              Annulla
            </Button>
            <Button
              type="submit"
              disabled={createMutation.isPending}
            >
              {createMutation.isPending ? "Salvataggio..." : "Registra pagamento"}
            </Button>
          </CardFooter>
        </Card>
      </form>
    </Form>
  );
}