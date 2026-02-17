import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { format, addDays } from "date-fns";
import { Plus, FileText, Printer, Mail, MoreVertical, Check, Clock, AlertCircle, Edit3, Trash2, RefreshCw, Eye } from "lucide-react";
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
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
  const [isCleanupDialogOpen, setIsCleanupDialogOpen] = useState(false);
  const [isPreviewDialogOpen, setIsPreviewDialogOpen] = useState(false);
  const [selectedInvoice, setSelectedInvoice] = useState<Invoice | null>(null);
  const [previewHtml, setPreviewHtml] = useState<string>("");

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
    clients: Array<{ 
      id: string; 
      name: string; 
      fullName: string; 
      email: string; 
      phone: string; 
      address: string; 
      taxCode: string; 
      vatNumber: string; 
    }>;
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
      clientId: z.number().min(1, "Cliente richiesto"),
      totalAmount: z.number().min(0, "Importo deve essere positivo"),
      date: z.string().min(1, "Data richiesta"),
      dueDate: z.string().min(1, "Data scadenza richiesta"),
      description: z.string().optional(),
      status: z.enum(["draft", "sent", "paid", "overdue"]).default("draft"),
    })),
    defaultValues: {
      clientId: undefined,
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

  // Mutation per eliminazione fattura con doppia sicurezza
  const deleteMutation = useMutation({
    mutationFn: async (data: { invoiceId: number; confirmation: boolean }) => {
      const response = await fetch(`/api/invoices/${data.invoiceId}`, {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ confirmation: data.confirmation }),
      });
      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.message);
      }
      return response.json();
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ["/api/invoices"] });
      setIsDeleteDialogOpen(false);
      setSelectedInvoice(null);
      toast({ 
        title: "✅ Fattura eliminata", 
        description: data.message 
      });
    },
    onError: (error: Error) => {
      toast({ 
        title: "❌ Errore eliminazione fattura", 
        description: error.message,
        variant: "destructive" 
      });
    },
  });

  // Mutation per pulizia numerazione fatture
  const cleanupMutation = useMutation({
    mutationFn: async () => {
      const response = await fetch("/api/invoices/cleanup-numbering", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
      });
      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.message);
      }
      return response.json();
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ["/api/invoices"] });
      setIsCleanupDialogOpen(false);
      toast({ 
        title: "🧹 Pulizia completata", 
        description: data.message 
      });
    },
    onError: (error: Error) => {
      toast({ 
        title: "❌ Errore pulizia numerazione", 
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

  const previewMutation = useMutation({
    mutationFn: async (invoiceId: number) => {
      const response = await fetch(`/api/invoices/${invoiceId}/preview`);
      if (!response.ok) throw new Error("Failed to generate preview");
      return response.text();
    },
    onSuccess: (html, invoiceId) => {
      setPreviewHtml(html);
      setIsPreviewDialogOpen(true);
      toast({ 
        title: "✅ Anteprima generata", 
        description: "Ecco come apparirà la fattura" 
      });
    },
    onError: (error) => {
      toast({ 
        title: "❌ Errore anteprima", 
        description: error.message,
        variant: "destructive" 
      });
    },
  });

  const migrateClientIdsMutation = useMutation({
    mutationFn: async () => {
      const response = await fetch("/api/invoices/migrate-client-ids", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
      });
      if (!response.ok) throw new Error("Failed to migrate client IDs");
      return response.json();
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ["/api/invoices"] });
      toast({ 
        title: "Migrazione completata", 
        description: data.message 
      });
    },
    onError: (error) => {
      toast({ 
        title: "Errore nella migrazione", 
        description: error.message,
        variant: "destructive" 
      });
    },
  });

  const handlePrintInvoice = (invoice: Invoice) => {
    printMutation.mutate(invoice.id);
  };

  const handlePreviewInvoice = (invoice: Invoice) => {
    setSelectedInvoice(invoice);
    previewMutation.mutate(invoice.id);
  };

  const handleEmailInvoice = async (invoice: Invoice) => {
    setSelectedInvoice(invoice);
    
    try {
      // Carica suggerimenti email personalizzati dal server
      const response = await fetch(`/api/invoices/${invoice.id}/email-suggestions`);
      if (response.ok) {
        const suggestions = await response.json();
        emailForm.setValue("recipientEmail", suggestions.clientEmail || "");
        emailForm.setValue("subject", suggestions.subject);
        emailForm.setValue("message", suggestions.message);
      } else {
        // Fallback a valori di default
        emailForm.setValue("recipientEmail", "");
        emailForm.setValue("subject", `Fattura ${invoice.invoiceNumber}`);
        emailForm.setValue("message", `Gentile ${invoice.client?.firstName} ${invoice.client?.lastName || 'Cliente'},\n\nIn allegato la fattura ${invoice.invoiceNumber}.\n\nCordiali saluti`);
      }
    } catch (error) {
      console.log('Errore caricamento suggerimenti email:', error);
      // Fallback a valori di default
      emailForm.setValue("recipientEmail", "");
      emailForm.setValue("subject", `Fattura ${invoice.invoiceNumber}`);
      emailForm.setValue("message", `Gentile ${invoice.client?.firstName} ${invoice.client?.lastName || 'Cliente'},\n\nIn allegato la fattura ${invoice.invoiceNumber}.\n\nCordiali saluti`);
    }
    
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

  const handleDeleteInvoice = (invoice: Invoice) => {
    setSelectedInvoice(invoice);
    setIsDeleteDialogOpen(true);
  };

  const confirmDelete = () => {
    if (selectedInvoice) {
      deleteMutation.mutate({
        invoiceId: selectedInvoice.id,
        confirmation: true
      });
    }
  };

  const handleCleanupNumbering = () => {
    setIsCleanupDialogOpen(true);
  };

  const confirmCleanup = () => {
    cleanupMutation.mutate();
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
        <div className="flex gap-2">
          <Button 
            variant="outline" 
            size="sm"
            onClick={() => migrateClientIdsMutation.mutate()}
            disabled={migrateClientIdsMutation.isPending}
          >
            {migrateClientIdsMutation.isPending ? "Migrazione..." : "Aggiorna Fatture"}
          </Button>
          <Button 
            variant="outline" 
            size="sm"
            onClick={handleCleanupNumbering}
            disabled={cleanupMutation.isPending}
          >
            <RefreshCw className="h-4 w-4 mr-2" />
            {cleanupMutation.isPending ? "Pulizia..." : "Pulisci Numerazione"}
          </Button>
          <Button onClick={() => setIsFormOpen(true)}>
            <Plus className="h-4 w-4 mr-2" />
            Nuova Fattura
          </Button>
        </div>
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
                    Cliente: {invoice.client?.firstName} {invoice.client?.lastName}
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
                      onClick={() => handlePreviewInvoice(invoice)}
                      disabled={previewMutation.isPending}
                      className="h-8 w-8 p-0"
                      title="Anteprima fattura"
                    >
                      <Eye className="h-3 w-3" />
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => handlePrintInvoice(invoice)}
                      disabled={printMutation.isPending}
                      className="h-8 w-8 p-0"
                      title="Stampa fattura"
                    >
                      <Printer className="h-3 w-3" />
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => handleEmailInvoice(invoice)}
                      disabled={sendEmailMutation.isPending}
                      className="h-8 w-8 p-0"
                      title="Invia via email"
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
                      <DropdownMenuItem onClick={() => handlePreviewInvoice(invoice)}>
                        <Eye className="h-4 w-4 mr-2" />
                        {previewMutation.isPending ? "Anteprima..." : "Anteprima Fattura"}
                      </DropdownMenuItem>
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
                      <DropdownMenuItem 
                        onClick={() => handleDeleteInvoice(invoice)}
                        disabled={deleteMutation.isPending}
                        className="text-red-600 focus:text-red-600"
                      >
                        <Trash2 className="h-4 w-4 mr-2" />
                        {deleteMutation.isPending ? "Eliminazione..." : "Elimina Fattura"}
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
                name="clientId"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Cliente</FormLabel>
                    <Select 
                      onValueChange={(value) => field.onChange(parseInt(value))} 
                      value={field.value ? field.value.toString() : undefined}
                    >
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder="Seleziona un cliente" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        {suggestions?.clients.map((client) => (
                          <SelectItem key={client.id} value={client.id.toString()}>
                            <div className="flex flex-col">
                              <span className="font-medium">{client.fullName}</span>
                              {client.email && (
                                <span className="text-xs text-muted-foreground">{client.email}</span>
                              )}
                            </div>
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <FormMessage />
                    {suggestions?.clients.length === 0 && (
                      <div className="text-xs text-muted-foreground mt-1">
                        Nessun cliente trovato. Aggiungi prima alcuni clienti.
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

      {/* Dialog per eliminazione fattura con doppia conferma */}
      <Dialog open={isDeleteDialogOpen} onOpenChange={setIsDeleteDialogOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="text-red-600">⚠️ Elimina Fattura</DialogTitle>
            <DialogDescription>
              Sei sicuro di voler eliminare definitivamente la fattura <strong>{selectedInvoice?.invoiceNumber}</strong>?
              <br />
              <span className="text-red-600 font-medium mt-2 block">
                Questa azione non può essere annullata!
              </span>
            </DialogDescription>
          </DialogHeader>
          
          <div className="bg-red-50 p-4 rounded-md border border-red-200">
            <div className="text-sm">
              <p><strong>Fattura:</strong> {selectedInvoice?.invoiceNumber}</p>
              <p><strong>Cliente:</strong> {selectedInvoice?.client?.firstName} {selectedInvoice?.client?.lastName}</p>
              <p><strong>Importo:</strong> €{selectedInvoice?.totalAmount.toFixed(2)}</p>
              <p><strong>Data:</strong> {selectedInvoice?.date && format(new Date(selectedInvoice.date), "dd/MM/yyyy")}</p>
            </div>
          </div>
          
          <DialogFooter className="flex gap-2">
            <Button 
              variant="outline" 
              onClick={() => setIsDeleteDialogOpen(false)}
              disabled={deleteMutation.isPending}
              className="flex-1"
            >
              Annulla
            </Button>
            <Button 
              variant="destructive"
              onClick={confirmDelete}
              disabled={deleteMutation.isPending}
              className="flex-1"
            >
              <Trash2 className="h-4 w-4 mr-2" />
              {deleteMutation.isPending ? "Eliminazione..." : "Elimina Definitivamente"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Dialog per pulizia numerazione */}
      <Dialog open={isCleanupDialogOpen} onOpenChange={setIsCleanupDialogOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="text-orange-600">🧹 Pulizia Numerazione Fatture</DialogTitle>
            <DialogDescription>
              Questa operazione rinumererà tutte le tue fatture in ordine cronologico usando il formato legale <strong>NNN/YYYY</strong>.
              <br />
              <span className="text-orange-600 font-medium mt-2 block">
                Le fatture verranno rinumerate automaticamente!
              </span>
            </DialogDescription>
          </DialogHeader>
          
          <div className="bg-orange-50 p-4 rounded-md border border-orange-200">
            <div className="text-sm">
              <p><strong>Formato corrente:</strong> Misto (06/2025/001, 09/2025/002, ecc.)</p>
              <p><strong>Formato dopo pulizia:</strong> Legale NNN/YYYY (001/2025, 002/2025, ecc.)</p>
              <p><strong>Totale fatture:</strong> {invoices.length}</p>
              <p className="text-green-600 mt-2"><strong>✓ Ordine cronologico mantenuto</strong></p>
            </div>
          </div>
          
          <DialogFooter className="flex gap-2">
            <Button 
              variant="outline" 
              onClick={() => setIsCleanupDialogOpen(false)}
              disabled={cleanupMutation.isPending}
              className="flex-1"
            >
              Annulla
            </Button>
            <Button 
              variant="default"
              onClick={confirmCleanup}
              disabled={cleanupMutation.isPending}
              className="flex-1 bg-orange-600 hover:bg-orange-700"
            >
              <RefreshCw className="h-4 w-4 mr-2" />
              {cleanupMutation.isPending ? "Pulizia..." : "Pulisci Numerazione"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Dialog per anteprima fattura */}
      <Dialog open={isPreviewDialogOpen} onOpenChange={setIsPreviewDialogOpen}>
        <DialogContent className="sm:max-w-4xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="text-blue-600">👁️ Anteprima Fattura</DialogTitle>
            <DialogDescription>
              Anteprima di come apparirà la fattura <strong>{selectedInvoice?.invoiceNumber}</strong> prima dell'invio o stampa
            </DialogDescription>
          </DialogHeader>
          
          <div className="bg-white border rounded-lg p-6 shadow-sm">
            {previewMutation.isPending ? (
              <div className="flex items-center justify-center h-64">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
                <span className="ml-3 text-muted-foreground">Generazione anteprima...</span>
              </div>
            ) : previewHtml ? (
              <div 
                className="invoice-preview"
                dangerouslySetInnerHTML={{ __html: previewHtml }}
                style={{
                  fontFamily: 'Arial, sans-serif',
                  fontSize: '14px',
                  lineHeight: '1.4',
                  color: '#333'
                }}
              />
            ) : (
              <div className="text-center text-muted-foreground py-8">
                <FileText className="h-12 w-12 mx-auto mb-4 opacity-50" />
                <p>Nessuna anteprima disponibile</p>
              </div>
            )}
          </div>
          
          <DialogFooter className="flex gap-2">
            <Button 
              variant="outline" 
              onClick={() => setIsPreviewDialogOpen(false)}
              className="flex-1"
            >
              Chiudi Anteprima
            </Button>
            {selectedInvoice && (
              <>
                <Button 
                  variant="outline"
                  onClick={() => {
                    setIsPreviewDialogOpen(false);
                    handlePrintInvoice(selectedInvoice);
                  }}
                  disabled={printMutation.isPending}
                  className="flex-1"
                >
                  <Printer className="h-4 w-4 mr-2" />
                  {printMutation.isPending ? "Stampa..." : "Stampa Fattura"}
                </Button>
                <Button 
                  onClick={() => {
                    setIsPreviewDialogOpen(false);
                    handleEmailInvoice(selectedInvoice);
                  }}
                  disabled={sendEmailMutation.isPending}
                  className="flex-1"
                >
                  <Mail className="h-4 w-4 mr-2" />
                  {sendEmailMutation.isPending ? "Invio..." : "Invia via Email"}
                </Button>
              </>
            )}
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}