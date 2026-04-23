import { useEffect } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { format } from "date-fns";
import { useTranslation } from "react-i18next";
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
  invoiceId: z.string().min(1, { message: "paymentForm.errInvoiceRequired" }),
  amount: z.string().min(1, { message: "paymentForm.errAmountRequired" }),
  paymentDate: z.date(),
  paymentMethod: z.string().min(1, { message: "paymentForm.errMethodRequired" }),
  reference: z.string().optional(),
  notes: z.string().optional(),
});

type FormData = z.infer<typeof formSchema>;

export default function PaymentForm({
  invoiceId,
  onClose,
  onSuccess,
}: PaymentFormProps) {
  const { t } = useTranslation();
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

  const { data: invoices = [] } = useQuery<any[]>({
    queryKey: ["/api/invoices"],
    enabled: !invoiceId,
  });

  const { data: invoice } = useQuery<any>({
    queryKey: ["/api/invoices", invoiceId],
    enabled: !!invoiceId,
  });

  useEffect(() => {
    if (invoice) {
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
        title: t("paymentForm.successTitle"),
        description: t("paymentForm.successDesc"),
      });
      onSuccess();
    },
    onError: () => {
      toast({
        title: t("paymentForm.errorTitle"),
        description: t("paymentForm.errorRecord"),
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
        title: t("paymentForm.errorTitle"),
        description: t("paymentForm.errorSaving"),
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
          render={({ field, fieldState }) => (
            <FormItem>
              <FormLabel>{t("paymentForm.invoice")}</FormLabel>
              <Select
                value={field.value}
                onValueChange={field.onChange}
                disabled={!!invoiceId}
              >
                <FormControl>
                  <SelectTrigger>
                    <SelectValue placeholder={t("paymentForm.selectInvoice")} />
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
              {fieldState.error?.message && <FormMessage>{t(fieldState.error.message)}</FormMessage>}
            </FormItem>
          )}
        />

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <FormField
            control={form.control}
            name="amount"
            render={({ field, fieldState }) => (
              <FormItem>
                <FormLabel>{t("paymentForm.amount")}</FormLabel>
                <FormControl>
                  <Input {...field} type="number" min="0" step="0.01" />
                </FormControl>
                {fieldState.error?.message && <FormMessage>{t(fieldState.error.message)}</FormMessage>}
              </FormItem>
            )}
          />

          <FormField
            control={form.control}
            name="paymentMethod"
            render={({ field, fieldState }) => (
              <FormItem>
                <FormLabel>{t("paymentForm.method")}</FormLabel>
                <Select
                  value={field.value}
                  onValueChange={field.onChange}
                  disabled={field.disabled}
                >
                  <FormControl>
                    <SelectTrigger>
                      <SelectValue placeholder={t("paymentForm.selectMethod")} />
                    </SelectTrigger>
                  </FormControl>
                  <SelectContent>
                    <SelectItem value="cash">{t("paymentForm.cash")}</SelectItem>
                    <SelectItem value="card">{t("paymentForm.card")}</SelectItem>
                    <SelectItem value="bank_transfer">{t("paymentForm.bankTransfer")}</SelectItem>
                  </SelectContent>
                </Select>
                {fieldState.error?.message && <FormMessage>{t(fieldState.error.message)}</FormMessage>}
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
                <FormLabel>{t("paymentForm.paymentDate")}</FormLabel>
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
                          <span>{t("paymentForm.selectDate")}</span>
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
                <FormLabel>{t("paymentForm.reference")}</FormLabel>
                <FormControl>
                  <Input {...field} placeholder={t("paymentForm.referencePh")} />
                </FormControl>
                <FormDescription>
                  {t("paymentForm.referenceDesc")}
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
              <FormLabel>{t("paymentForm.notes")}</FormLabel>
              <FormControl>
                <Textarea
                  {...field}
                  placeholder={t("paymentForm.notesPh")}
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
                {t("paymentForm.infoText")}
              </p>
            </div>
          </CardContent>
          <CardFooter className="flex justify-between">
            <Button variant="outline" onClick={onClose}>
              {t("paymentForm.cancel")}
            </Button>
            <Button
              type="submit"
              disabled={createMutation.isPending}
            >
              {createMutation.isPending ? t("paymentForm.saving") : t("paymentForm.registerPayment")}
            </Button>
          </CardFooter>
        </Card>
      </form>
    </Form>
  );
}
