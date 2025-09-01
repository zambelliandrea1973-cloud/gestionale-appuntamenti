import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { format, addDays } from "date-fns";
import { Plus, FileText, Printer, Mail, MoreVertical, Check, Clock, AlertCircle, Edit3 } from "lucide-react";
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
  const [isStatusDialogOpen, setIsStatusDialogOpen] = useState(false);
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

  const { data: suggestions } = useQuery<{
    clients: Array<{ name: string; fullName: string }>;
    amounts: number[];
    descriptions: string[];
  }>({
    queryKey: ["/api/invoices/suggestions"],
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
      totalAmount: "" as any,
      date: format(new Date(), "yyyy-MM-dd"),
      dueDate: format(addDays(new Date(), 30), "yyyy-MM-dd"),
      description: "",
      status: "draft" as const,
    },
  });

  const onSubmit = (data: any) => {
    // Assicurati che totalAmount sia un numero valido
    const submitData = {
      ...data,
      totalAmount: parseFloat(data.totalAmount) || 0
    };
    createMutation.mutate(submitData);
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
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ["/api/invoices"] });
      setIsEmailDialogOpen(false);
      setSelectedInvoice(null);
      emailForm.reset();
      toast({ 
        title: "✅ Email inviata con successo", 
        description: `Fattura inviata a ${data.recipientEmail}` 
      });
    },
    onError: (error) => {
      toast({ 
        title: "❌ Errore nell'invio dell'email", 
        description: error.message || "Verifica le impostazioni email",
        variant: "destructive" 
      });
    },
  });

  const updateStatusMutation = useMutation({
    mutationFn: async (data: { invoiceId: number; status: string }) => {
      const response = await fetch(`/api/invoices/${data.invoiceId}/status`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status: data.status }),
      });
      if (!response.ok) throw new Error("Failed to update status");
      return response.json();
    },
    onSuccess: (data, variables) => {
      queryClient.invalidateQueries({ queryKey: ["/api/invoices"] });
      const statusLabels = {
        draft: "Bozza",
        sent: "Inviata", 
        paid: "Pagata",
        overdue: "Scaduta"
      };
      toast({ 
        title: "✅ Stato aggiornato", 
        description: `Fattura marcata come: ${statusLabels[variables.status]}` 
      });
      setIsStatusDialogOpen(false);
      setSelectedInvoice(null);
    },
    onError: (error) => {
      toast({ 
        title: "❌ Errore aggiornamento stato", 
        description: error.message,
        variant: "destructive" 
      });
    },
  });

  const printMutation = useMutation({
    mutationFn: async (invoiceId: number) => {
      const response = await fetch(`/api/invoices/${invoiceId}/pdf`);
      if (!response.ok) throw new Error("Failed to generate PDF");
      return response.blob();
    },
    onSuccess: (blob, invoiceId) => {
      const url = window.URL.createObjectURL(blob);
      const printWindow = window.open(url, '_blank');
      if (printWindow) {
        printWindow.onload = () => {
          printWindow.print();
        };
        toast({ 
          title: "✅ Stampa avviata", 
          description: "La finestra di stampa si aprirà automaticamente" 
        });
      } else {
        toast({ 
          title: "❌ Errore stampa", 
          description: "Popup bloccato. Abilita i popup per stampare",
          variant: "destructive" 
        });
      }
    },
    onError: (error) => {
      toast({ 
        title: "❌ Errore nella generazione PDF", 
        description: error.message,
        variant: "destructive" 
      });
    },
  });

  const handlePrintInvoice = (invoice: Invoice) => {
    printMutation.mutate(invoice.id);
  };

  const handleEmailInvoice = (invoice: Invoice) => {
    setSelectedInvoice(invoice);
    emailForm.setValue("recipientEmail", invoice.client?.firstName ? `${invoice.client.firstName.toLowerCase()}.${invoice.client.lastName?.toLowerCase()}@esempio.it` : "");
    emailForm.setValue("subject", `Fattura ${invoice.invoiceNumber} - Studio Medico`);
    emailForm.setValue("message", `Gentile ${invoice.client?.firstName || invoice.clientName},\n\nIn allegato trova la fattura ${invoice.invoiceNumber}.\n\nCordiali saluti,\nStudio Medico`);
    setIsEmailDialogOpen(true);
  };

  const handleStatusChange = (invoice: Invoice) => {
    setSelectedInvoice(invoice);
    setIsStatusDialogOpen(true);
  };

  const handleQuickStatusUpdate = (invoice: Invoice, newStatus: string) => {
    updateStatusMutation.mutate({
      invoiceId: invoice.id,
      status: newStatus
    });
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
                    <div className="flex items-center gap-2">
                      <Badge 
                        variant={
                          invoice.status === "paid" ? "default" :
                          invoice.status === "sent" ? "secondary" :
                          invoice.status === "overdue" ? "destructive" : "outline"
                        }
                        className="cursor-pointer"
                        onClick={() => handleStatusChange(invoice)}
                      >
                        {invoice.status === "paid" ? (
                          <>
                            <Check className="h-3 w-3 mr-1" />
                            Pagata
                          </>
                        ) : invoice.status === "sent" ? (
                          <>
                            <Mail className="h-3 w-3 mr-1" />
                            Inviata
                          </>
                        ) : invoice.status === "overdue" ? (
                          <>
                            <AlertCircle className="h-3 w-3 mr-1" />
                            Scaduta
                          </>
                        ) : (
                          <>
                            <Edit3 className="h-3 w-3 mr-1" />
                            Bozza
                          </>
                        )}
                      </Badge>
                    </div>
                  </div>
                  
                  {/* Pulsanti azione rapidi */}
                  <div className="flex items-center gap-1">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => handlePrintInvoice(invoice)}
                      disabled={printMutation.isPending}
                      className="h-8 w-8 p-0"
                    >
                      <Printer className="h-3 w-3" />
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => handleEmailInvoice(invoice)}
                      disabled={sendEmailMutation.isPending}
                      className="h-8 w-8 p-0"
                    >
                      <Mail className="h-3 w-3" />
                    </Button>
                    
                    {/* Azioni rapide per stato */}
                    {invoice.status === "sent" && (
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => handleQuickStatusUpdate(invoice, "paid")}
                        disabled={updateStatusMutation.isPending}
                        className="h-8 px-2 text-xs text-green-600 border-green-200 hover:bg-green-50"
                      >
                        <Check className="h-3 w-3 mr-1" />
                        Segna Pagata
                      </Button>
                    )}
                    
                    {invoice.status === "draft" && (
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => handleQuickStatusUpdate(invoice, "sent")}
                        disabled={updateStatusMutation.isPending}
                        className="h-8 px-2 text-xs text-blue-600 border-blue-200 hover:bg-blue-50"
                      >
                        <Mail className="h-3 w-3 mr-1" />
                        Segna Inviata
                      </Button>
                    )}
                  </div>

                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button variant="ghost" size="sm">
                        <MoreVertical className="h-4 w-4" />
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end">
                      <DropdownMenuItem onClick={() => handleStatusChange(invoice)}>
                        <Edit3 className="h-4 w-4 mr-2" />
                        Cambia Stato
                      </DropdownMenuItem>
                      <DropdownMenuItem 
                        onClick={() => handlePrintInvoice(invoice)}
                        disabled={printMutation.isPending}
                      >
                        <Printer className="h-4 w-4 mr-2" />
                        {printMutation.isPending ? "Stampa..." : "Stampa PDF"}
                      </DropdownMenuItem>
                      <DropdownMenuItem 
                        onClick={() => handleEmailInvoice(invoice)}
                        disabled={sendEmailMutation.isPending}
                      >
                        <Mail className="h-4 w-4 mr-2" />
                        {sendEmailMutation.isPending ? "Invio..." : "Invia via Email"}
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
        <DialogContent className="sm:max-w-lg max-h-[90vh] overflow-y-auto">
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
                      <div className="relative">
                        <Input placeholder="Nome del cliente" {...field} list="client-suggestions" />
                        <datalist id="client-suggestions">
                          {suggestions?.clients.map((client, index) => (
                            <option key={index} value={client.fullName} />
                          ))}
                        </datalist>
                      </div>
                    </FormControl>
                    <FormMessage />
                    {suggestions?.clients.length > 0 && (
                      <div className="text-xs text-muted-foreground mt-1">
                        Suggerimenti: {suggestions.clients.slice(0, 3).map(c => c.name).join(", ")}
                        {suggestions.clients.length > 3 && "..."}
                      </div>
                    )}
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
                      <div className="space-y-2">
                        <Input 
                          type="number" 
                          step="0.01" 
                          placeholder="Inserisci importo manualmente" 
                          value={field.value || ""}
                          onChange={(e) => {
                            const value = e.target.value;
                            field.onChange(value === "" ? "" : parseFloat(value) || "");
                          }}
                        />
                        {suggestions?.amounts.length > 0 && (
                          <div className="flex flex-wrap gap-1">
                            {suggestions.amounts.slice(0, 6).map((amount) => (
                              <Button
                                key={amount}
                                type="button"
                                variant="outline"
                                size="sm"
                                className="h-6 px-2 text-xs"
                                onClick={() => field.onChange(amount)}
                              >
                                €{amount}
                              </Button>
                            ))}
                          </div>
                        )}
                      </div>
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
                      <div className="space-y-2">
                        <Textarea 
                          placeholder="Descrizione dei servizi..." 
                          {...field} 
                          list="description-suggestions"
                        />
                        <datalist id="description-suggestions">
                          {suggestions?.descriptions.map((desc, index) => (
                            <option key={index} value={desc} />
                          ))}
                        </datalist>
                        {suggestions?.descriptions.length > 0 && (
                          <div className="flex flex-wrap gap-1">
                            {suggestions.descriptions.slice(0, 5).map((desc) => (
                              <Button
                                key={desc}
                                type="button"
                                variant="outline"
                                size="sm"
                                className="h-6 px-2 text-xs capitalize"
                                onClick={() => field.onChange(desc)}
                              >
                                {desc}
                              </Button>
                            ))}
                          </div>
                        )}
                      </div>
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

      {/* Dialog per cambio stato */}
      <Dialog open={isStatusDialogOpen} onOpenChange={setIsStatusDialogOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Cambia Stato Fattura</DialogTitle>
            <DialogDescription>
              Aggiorna lo stato della fattura {selectedInvoice?.invoiceNumber}
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-3">
              <Button
                variant={selectedInvoice?.status === "draft" ? "secondary" : "outline"}
                className="h-16 flex-col gap-2"
                onClick={() => selectedInvoice && handleQuickStatusUpdate(selectedInvoice, "draft")}
                disabled={updateStatusMutation.isPending || selectedInvoice?.status === "draft"}
              >
                <Edit3 className="h-5 w-5" />
                <span className="text-sm">Bozza</span>
              </Button>
              
              <Button
                variant={selectedInvoice?.status === "sent" ? "secondary" : "outline"}
                className="h-16 flex-col gap-2"
                onClick={() => selectedInvoice && handleQuickStatusUpdate(selectedInvoice, "sent")}
                disabled={updateStatusMutation.isPending || selectedInvoice?.status === "sent"}
              >
                <Mail className="h-5 w-5" />
                <span className="text-sm">Inviata</span>
              </Button>
              
              <Button
                variant={selectedInvoice?.status === "paid" ? "default" : "outline"}
                className="h-16 flex-col gap-2 text-green-600 border-green-200 hover:bg-green-50"
                onClick={() => selectedInvoice && handleQuickStatusUpdate(selectedInvoice, "paid")}
                disabled={updateStatusMutation.isPending || selectedInvoice?.status === "paid"}
              >
                <Check className="h-5 w-5" />
                <span className="text-sm">Pagata</span>
              </Button>
              
              <Button
                variant={selectedInvoice?.status === "overdue" ? "destructive" : "outline"}
                className="h-16 flex-col gap-2"
                onClick={() => selectedInvoice && handleQuickStatusUpdate(selectedInvoice, "overdue")}
                disabled={updateStatusMutation.isPending || selectedInvoice?.status === "overdue"}
              >
                <AlertCircle className="h-5 w-5" />
                <span className="text-sm">Scaduta</span>
              </Button>
            </div>
            
            <div className="flex items-center justify-center pt-4 border-t">
              <div className="text-sm text-muted-foreground">
                Stato attuale: <span className="font-medium">
                  {selectedInvoice?.status === "paid" ? "Pagata" :
                   selectedInvoice?.status === "sent" ? "Inviata" :
                   selectedInvoice?.status === "overdue" ? "Scaduta" : "Bozza"}
                </span>
              </div>
            </div>
          </div>
          
          <DialogFooter>
            <Button 
              variant="outline" 
              onClick={() => setIsStatusDialogOpen(false)}
              disabled={updateStatusMutation.isPending}
            >
              Chiudi
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}