import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { format, addDays } from "date-fns";
import { Plus, FileText, Printer, Mail, MoreVertical } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
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
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { useToast } from "@/hooks/use-toast";

type Invoice = {
  id: number;
  invoiceNumber: string;
  clientId: number;
  totalAmount: number;
  tax: number | null;
  date: string;
  dueDate: string;
  status: string;
  notes: string | null;
  createdAt: Date;
  client: {
    id: number;
    firstName: string;
    lastName: string;
  };
  items: Array<{
    id: number;
    description: string;
    quantity: number;
    unitPrice: number;
    service?: {
      id: number;
      name: string;
    };
  }>;
  payments: Array<{
    id: number;
    amount: number;
    paymentDate: string;
    paymentMethod: string;
  }>;
};

export default function Invoices() {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [isEmailDialogOpen, setIsEmailDialogOpen] = useState(false);
  const [selectedInvoice, setSelectedInvoice] = useState<Invoice | null>(null);

  const {
    data: invoices = [],
    isLoading,
    error,
  } = useQuery<Invoice[]>({
    queryKey: ["/api/invoices"],
  });

  const { data: nextInvoiceNumber } = useQuery<{ nextInvoiceNumber: string }>({
    queryKey: ["/api/invoices/next-number"],
    enabled: isFormOpen,
  });

  const createMutation = useMutation({
    mutationFn: async (data: any) => {
      const response = await fetch("/api/invoices", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      });
      if (!response.ok) throw new Error("Failed to create invoice");
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/invoices"] });
      setIsFormOpen(false);
      toast({ title: "Fattura creata con successo" });
    },
    onError: () => {
      toast({ title: "Errore nella creazione della fattura", variant: "destructive" });
    },
  });

  const form = useForm({
    resolver: zodResolver(z.object({
      clientName: z.string().min(1, "Nome cliente richiesto"),
      totalAmount: z.number().min(0, "Importo deve essere positivo"),
      date: z.string().min(1, "Data richiesta"),
      dueDate: z.string().min(1, "Data scadenza richiesta"),
      description: z.string().optional(),
      status: z.enum(["draft", "sent", "paid", "overdue"]).default("draft"),
    })),
    defaultValues: {
      clientName: "",
      totalAmount: 0,
      date: format(new Date(), "yyyy-MM-dd"),
      dueDate: format(addDays(new Date(), 30), "yyyy-MM-dd"),
      description: "",
      status: "draft" as const,
    },
  });

  const onSubmit = (data: any) => {
    createMutation.mutate(data);
  };

  const emailForm = useForm({
    resolver: zodResolver(z.object({
      recipientEmail: z.string().email("Email non valida"),
      subject: z.string().min(1, "Oggetto richiesto"),
      message: z.string().optional(),
    })),
    defaultValues: {
      recipientEmail: "",
      subject: "",
      message: "",
    },
  });

  const sendEmailMutation = useMutation({
    mutationFn: async (data: any) => {
      const response = await fetch(`/api/invoices/${selectedInvoice?.id}/send-email`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      });
      if (!response.ok) throw new Error("Failed to send email");
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/invoices"] });
      setIsEmailDialogOpen(false);
      setSelectedInvoice(null);
      emailForm.reset();
      toast({ title: "Email inviata con successo" });
    },
    onError: () => {
      toast({ title: "Errore nell'invio dell'email", variant: "destructive" });
    },
  });

  const handlePrintInvoice = (invoice: Invoice) => {
    const printWindow = window.open(`/api/invoices/${invoice.id}/pdf`, '_blank');
    if (printWindow) {
      printWindow.onload = () => {
        printWindow.print();
      };
    }
  };

  const handleEmailInvoice = (invoice: Invoice) => {
    setSelectedInvoice(invoice);
    emailForm.setValue("subject", `Fattura ${invoice.invoiceNumber} - Studio Medico`);
    emailForm.setValue("message", `Gentile ${invoice.client?.firstName || invoice.clientName},\n\nIn allegato trova la fattura ${invoice.invoiceNumber}.\n\nCordiali saluti,\nStudio Medico`);
    setIsEmailDialogOpen(true);
  };

  const onEmailSubmit = (data: any) => {
    sendEmailMutation.mutate(data);
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-semibold">Gestione Fatture</h2>
          <p className="text-muted-foreground">
            Crea e gestisci le fatture per i tuoi clienti
          </p>
        </div>
        <Button onClick={() => setIsFormOpen(true)}>
          <Plus className="h-4 w-4 mr-2" />
          Nuova Fattura
        </Button>
      </div>

      {invoices.length === 0 ? (
        <Card className="p-8 text-center">
          <FileText className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
          <h3 className="text-lg font-medium mb-2">Nessuna fattura trovata</h3>
          <p className="text-muted-foreground mb-4">
            Inizia creando la tua prima fattura
          </p>
          <Button onClick={() => setIsFormOpen(true)}>
            <Plus className="h-4 w-4 mr-2" />
            Crea Prima Fattura
          </Button>
        </Card>
      ) : (
        <div className="grid gap-4">
          {invoices.map((invoice) => (
            <Card key={invoice.id} className="p-4">
              <div className="flex items-center justify-between">
                <div className="flex-1">
                  <h3 className="font-medium">Fattura #{invoice.invoiceNumber}</h3>
                  <p className="text-sm text-muted-foreground">
                    Cliente: {invoice.client?.firstName} {invoice.client?.lastName || invoice.clientName}
                  </p>
                  <p className="text-sm text-muted-foreground">
                    Data: {format(new Date(invoice.date), "dd/MM/yyyy")}
                  </p>
                </div>
                <div className="flex items-center gap-3">
                  <div className="text-right">
                    <p className="font-medium">€{invoice.totalAmount.toFixed(2)}</p>
                    <Badge variant={
                      invoice.status === "paid" ? "default" :
                      invoice.status === "sent" ? "secondary" :
                      invoice.status === "overdue" ? "destructive" : "outline"
                    }>
                      {invoice.status === "paid" ? "Pagata" :
                       invoice.status === "sent" ? "Inviata" :
                       invoice.status === "overdue" ? "Scaduta" : "Bozza"}
                    </Badge>
                  </div>
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button variant="ghost" size="sm">
                        <MoreVertical className="h-4 w-4" />
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end">
                      <DropdownMenuItem onClick={() => handlePrintInvoice(invoice)}>
                        <Printer className="h-4 w-4 mr-2" />
                        Stampa
                      </DropdownMenuItem>
                      <DropdownMenuItem onClick={() => handleEmailInvoice(invoice)}>
                        <Mail className="h-4 w-4 mr-2" />
                        Invia via Email
                      </DropdownMenuItem>
                    </DropdownMenuContent>
                  </DropdownMenu>
                </div>
              </div>
            </Card>
          ))}
        </div>
      )}

      <Dialog open={isFormOpen} onOpenChange={setIsFormOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Nuova Fattura</DialogTitle>
            <DialogDescription>
              Crea una nuova fattura per un cliente
            </DialogDescription>
          </DialogHeader>
          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
              <div className="bg-muted/50 p-3 rounded-md text-sm">
                <div className="flex items-center justify-between">
                  <span className="text-muted-foreground">
                    📋 Numero fattura automatico:
                  </span>
                  <span className="font-mono font-semibold text-primary">
                    {nextInvoiceNumber?.nextInvoiceNumber || "Caricamento..."}
                  </span>
                </div>
              </div>
              <FormField
                control={form.control}
                name="clientName"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Nome Cliente</FormLabel>
                    <FormControl>
                      <Input placeholder="Nome del cliente" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="totalAmount"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Importo Totale (€)</FormLabel>
                    <FormControl>
                      <Input 
                        type="number" 
                        step="0.01" 
                        placeholder="0.00" 
                        {...field}
                        onChange={(e) => field.onChange(parseFloat(e.target.value) || 0)}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <div className="grid grid-cols-2 gap-4">
                <FormField
                  control={form.control}
                  name="date"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Data Fattura</FormLabel>
                      <FormControl>
                        <Input type="date" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="dueDate"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Data Scadenza</FormLabel>
                      <FormControl>
                        <Input type="date" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>
              <FormField
                control={form.control}
                name="description"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Descrizione (opzionale)</FormLabel>
                    <FormControl>
                      <Textarea placeholder="Descrizione dei servizi..." {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="status"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Stato</FormLabel>
                    <Select onValueChange={field.onChange} defaultValue={field.value}>
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder="Seleziona stato" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        <SelectItem value="draft">Bozza</SelectItem>
                        <SelectItem value="sent">Inviata</SelectItem>
                        <SelectItem value="paid">Pagata</SelectItem>
                        <SelectItem value="overdue">Scaduta</SelectItem>
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <DialogFooter>
                <Button type="button" variant="outline" onClick={() => setIsFormOpen(false)}>
                  Annulla
                </Button>
                <Button type="submit" disabled={createMutation.isPending}>
                  {createMutation.isPending ? "Creazione..." : "Crea Fattura"}
                </Button>
              </DialogFooter>
            </form>
          </Form>
        </DialogContent>
      </Dialog>

      {/* Dialog per invio email */}
      <Dialog open={isEmailDialogOpen} onOpenChange={setIsEmailDialogOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Invia Fattura via Email</DialogTitle>
            <DialogDescription>
              Invia la fattura {selectedInvoice?.invoiceNumber} al cliente
            </DialogDescription>
          </DialogHeader>
          <Form {...emailForm}>
            <form onSubmit={emailForm.handleSubmit(onEmailSubmit)} className="space-y-4">
              <FormField
                control={emailForm.control}
                name="recipientEmail"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Email Destinatario</FormLabel>
                    <FormControl>
                      <Input type="email" placeholder="cliente@esempio.it" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={emailForm.control}
                name="subject"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Oggetto</FormLabel>
                    <FormControl>
                      <Input placeholder="Oggetto dell'email" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={emailForm.control}
                name="message"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Messaggio (opzionale)</FormLabel>
                    <FormControl>
                      <Textarea 
                        placeholder="Messaggio personalizzato..." 
                        rows={4}
                        {...field} 
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <DialogFooter>
                <Button type="button" variant="outline" onClick={() => setIsEmailDialogOpen(false)}>
                  Annulla
                </Button>
                <Button type="submit" disabled={sendEmailMutation.isPending}>
                  {sendEmailMutation.isPending ? "Invio..." : "Invia Email"}
                </Button>
              </DialogFooter>
            </form>
          </Form>
        </DialogContent>
      </Dialog>
    </div>
  );
}