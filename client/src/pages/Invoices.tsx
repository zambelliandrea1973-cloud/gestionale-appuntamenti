import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { format, addDays } from "date-fns";
import { Plus, FileText, Printer, Mail, MoreVertical, Check, Clock, AlertCircle, Edit3, Trash2, RefreshCw, Eye, MessageCircle, Smartphone, Send } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
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
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { useToast } from "@/hooks/use-toast";
import { useCurrency } from "@/hooks/use-currency";

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
  // Tracking invio multicanale
  publishedToPwa?: boolean;
  pwaPublishedAt?: Date | null;
  sentViaEmail?: boolean;
  emailSentAt?: Date | null;
  sentViaWhatsapp?: boolean;
  whatsappSentAt?: Date | null;
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
  const { symbol, formatPrice } = useCurrency();
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [isEmailDialogOpen, setIsEmailDialogOpen] = useState(false);
  const [isCleanupDialogOpen, setIsCleanupDialogOpen] = useState(false);
  const [isPreviewDialogOpen, setIsPreviewDialogOpen] = useState(false);
  const [isSendDialogOpen, setIsSendDialogOpen] = useState(false);
  const [selectedInvoice, setSelectedInvoice] = useState<Invoice | null>(null);
  const [previewHtml, setPreviewHtml] = useState<string>("");
  
  // State per canali di invio (default tutti disattivati)
  const [sendPreferences, setSendPreferences] = useState<Record<number, { pwa: boolean; email: boolean; whatsapp: boolean }>>({});
  
  // Helper: toggle indipendente per ogni canale (multi-selezione come checkbox)
  const updateChannel = (invoiceId: number, channel: 'pwa' | 'email' | 'whatsapp') => {
    setSendPreferences(prev => {
      const current = prev[invoiceId] || { pwa: false, email: false, whatsapp: false };
      const next = !current[channel];
      return {
        ...prev,
        [invoiceId]: {
          ...current,
          [channel]: next
        }
      };
    });
  };
  
  // Helper: default channels consistente
  const defaultChannels = { pwa: false, email: false, whatsapp: false };
  
  // State per conferma re-invio
  const [isResendConfirmOpen, setIsResendConfirmOpen] = useState(false);
  const [pendingInvoiceId, setPendingInvoiceId] = useState<number | null>(null);
  const [pendingChannels, setPendingChannels] = useState<{ pwa: boolean; email: boolean; whatsapp: boolean }>({ pwa: false, email: false, whatsapp: false });
  const [channelsNeedingConfirm, setChannelsNeedingConfirm] = useState<Array<{ channel: string; date: string }>>([]);

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
      status: z.enum(["sent", "paid"]).default("sent"),
    })),
    defaultValues: {
      clientId: undefined,
      totalAmount: "" as any,
      date: format(new Date(), "yyyy-MM-dd"),
      dueDate: format(addDays(new Date(), 30), "yyyy-MM-dd"),
      description: "",
      status: "sent" as const,
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

  // Mutation per cambio stato (senza Dialog, solo window.confirm)
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
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ["/api/invoices"] });
      const statusLabel = variables.status === "paid" ? "Pagata" : "Non pagata";
      toast({ 
        title: "✅ Stato aggiornato", 
        description: `Fattura marcata come: ${statusLabel}` 
      });
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
      // Feedback visivo: la fattura scompare dalla lista
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

  // Mutation multicanale per invio fattura (PWA, Email, WhatsApp)
  const sendInvoiceMutation = useMutation({
    mutationFn: async ({ invoiceId, channels }: { invoiceId: number; channels: { pwa: boolean; email: boolean; whatsapp: boolean } }) => {
      const response = await fetch(`/api/invoices/${invoiceId}/send`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ channels }),
      });
      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.message || "Errore invio fattura");
      }
      return response.json();
    },
    onSuccess: async (data, variables) => {
      // Invalida e ricarica immediatamente i dati per aggiornare il pulsante verde->grigio
      await queryClient.invalidateQueries({ queryKey: ["/api/invoices"] });
      await queryClient.refetchQueries({ queryKey: ["/api/invoices"] });
      
      setIsSendDialogOpen(false);
      setSelectedInvoice(null);
      
      // Reset selezioni canali dopo invio
      setSendPreferences(prev => ({
        ...prev,
        [variables.invoiceId]: { pwa: false, email: false, whatsapp: false }
      }));
      
      toast({ 
        title: "✅ Fattura inviata", 
        description: data.message || "Invio completato con successo"
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

  const onEmailSubmit = (data: any) => {
    sendEmailMutation.mutate(data);
  };

  const handleDeleteInvoice = (invoice: Invoice) => {
    const confirmed = window.confirm(
      `Sei sicuro di voler eliminare la fattura ${invoice.invoiceNumber}?\n\n` +
      `Questa azione è irreversibile!`
    );
    
    if (confirmed) {
      deleteMutation.mutate({ 
        invoiceId: invoice.id, 
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

  // Handler per aprire dialog invio multicanale
  const handleSendInvoice = (invoice: Invoice) => {
    setSelectedInvoice(invoice);
    
    // Inizializza preferenze canali se non esistono (PWA default attivo)
    if (!sendPreferences[invoice.id]) {
      setSendPreferences(prev => ({
        ...prev,
        [invoice.id]: { pwa: true, email: false, whatsapp: false }
      }));
    }
    
    setIsSendDialogOpen(true);
  };

  const confirmSend = () => {
    if (!selectedInvoice) return;
    
    const channels = sendPreferences[selectedInvoice.id] || { pwa: true, email: false, whatsapp: false };
    
    // Validazione: almeno un canale selezionato
    if (!channels.pwa && !channels.email && !channels.whatsapp) {
      toast({
        title: "⚠️ Nessun canale selezionato",
        description: "Seleziona almeno un canale di invio",
        variant: "destructive"
      });
      return;
    }
    
    sendInvoiceMutation.mutate({ invoiceId: selectedInvoice.id, channels });
  };

  const toggleChannel = (channel: 'pwa' | 'email' | 'whatsapp') => {
    if (!selectedInvoice) return;
    
    setSendPreferences({
      ...sendPreferences,
      [selectedInvoice.id]: {
        ...sendPreferences[selectedInvoice.id],
        [channel]: !sendPreferences[selectedInvoice.id]?.[channel]
      }
    });
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
      <div className="flex items-center justify-between flex-wrap gap-4">
        <div>
          <h2 className="text-2xl font-semibold">Gestione Fatture</h2>
          <p className="text-muted-foreground">
            Crea e gestisci le fatture per i tuoi clienti
          </p>
        </div>
        <div className="flex gap-2 flex-wrap">
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
                    <p className="font-medium">{symbol}{invoice.totalAmount.toFixed(2)}</p>
                    <div className="flex flex-col items-end gap-1">
                      <Badge 
                        variant={invoice.status === "paid" ? "default" : "secondary"}
                        className={invoice.status === "paid" ? "bg-green-600" : "bg-orange-500 text-white"}
                      >
                        {invoice.status === "paid" ? (
                          <>
                            <Check className="h-3 w-3 mr-1" />
                            Pagata
                          </>
                        ) : (
                          <>
                            <AlertCircle className="h-3 w-3 mr-1" />
                            Da pagare
                          </>
                        )}
                      </Badge>
                      {invoice.sentAt && (
                        <span className="text-xs text-green-600 flex items-center gap-1">
                          <Check className="h-3 w-3" />
                          Inviata al cliente
                        </span>
                      )}
                    </div>
                  </div>
                  
                  {/* Pulsanti azione rapidi - 6 pulsanti: Preview, Stampa, 3 toggle canali, Invia */}
                  <div className="flex items-center gap-2">
                    {/* 1. Preview */}
                    <Button
                      variant="outline"
                      size="default"
                      onClick={() => handlePreviewInvoice(invoice)}
                      disabled={previewMutation.isPending}
                      className="h-10 w-10 p-0 border-blue-300 hover:bg-blue-50 text-blue-600"
                      title="Anteprima fattura"
                      data-testid={`button-preview-invoice-${invoice.id}`}
                    >
                      <Eye className="h-5 w-5" />
                    </Button>
                    
                    {/* 2. Stampa */}
                    <Button
                      variant="outline"
                      size="default"
                      onClick={() => handlePrintInvoice(invoice)}
                      disabled={printMutation.isPending}
                      className="h-10 w-10 p-0 border-gray-300 hover:bg-gray-50"
                      title="Stampa fattura"
                      data-testid={`button-print-invoice-${invoice.id}`}
                    >
                      <Printer className="h-5 w-5" />
                    </Button>
                    
                    {/* 3. PWA - toggle */}
                    <Button
                      size="default"
                      onClick={() => updateChannel(invoice.id, 'pwa')}
                      className={`h-10 w-10 p-0 relative border ${
                        invoice.publishedToPwa 
                          ? 'bg-gray-400 hover:bg-gray-500 text-white border-gray-400'  // Grigio se già inviato
                          : sendPreferences[invoice.id]?.pwa === true 
                            ? 'bg-blue-600 hover:bg-blue-700 text-white border-blue-600'  // Blu se selezionato
                            : 'border-blue-300 text-blue-600 hover:bg-blue-50 bg-white'  // Outline default
                      }`}
                      title={`PWA - Area Clienti${invoice.publishedToPwa ? ` (Già inviata ${invoice.pwaPublishedAt ? new Date(invoice.pwaPublishedAt).toLocaleDateString('it-IT') : ''} - Clicca per re-inviare)` : ''}`}
                      data-testid={`button-toggle-pwa-${invoice.id}`}
                    >
                      <Smartphone className="h-5 w-5" />
                      {sendPreferences[invoice.id]?.pwa === true && (
                        <Check className="h-3 w-3 absolute top-0 right-0 bg-green-500 text-white rounded-full p-0.5" />
                      )}
                      {invoice.publishedToPwa && (
                        <div className="h-2 w-2 absolute bottom-0 left-0 bg-yellow-400 rounded-full" title="Già inviata" />
                      )}
                    </Button>
                    
                    {/* 4. Email - toggle */}
                    <Button
                      size="default"
                      onClick={() => updateChannel(invoice.id, 'email')}
                      className={`h-10 w-10 p-0 relative border ${
                        invoice.sentViaEmail 
                          ? 'bg-gray-400 hover:bg-gray-500 text-white border-gray-400'  // Grigio se già inviato
                          : sendPreferences[invoice.id]?.email === true 
                            ? 'bg-orange-600 hover:bg-orange-700 text-white border-orange-600'  // Arancione se selezionato
                            : 'border-orange-300 text-orange-600 hover:bg-orange-50 bg-white'  // Outline default
                      }`}
                      title={`Email${invoice.sentViaEmail ? ` (Già inviata ${invoice.emailSentAt ? new Date(invoice.emailSentAt).toLocaleDateString('it-IT') : ''} - Clicca per re-inviare)` : ''}`}
                      data-testid={`button-toggle-email-${invoice.id}`}
                    >
                      <Mail className="h-5 w-5" />
                      {sendPreferences[invoice.id]?.email === true && (
                        <Check className="h-3 w-3 absolute top-0 right-0 bg-green-500 text-white rounded-full p-0.5" />
                      )}
                      {invoice.sentViaEmail && (
                        <div className="h-2 w-2 absolute bottom-0 left-0 bg-yellow-400 rounded-full" title="Già inviata" />
                      )}
                    </Button>
                    
                    {/* 5. WhatsApp - toggle */}
                    <Button
                      size="default"
                      onClick={() => updateChannel(invoice.id, 'whatsapp')}
                      className={`h-10 w-10 p-0 relative border ${
                        invoice.sentViaWhatsapp 
                          ? 'bg-gray-400 hover:bg-gray-500 text-white border-gray-400'  // Grigio se già inviato
                          : sendPreferences[invoice.id]?.whatsapp === true 
                            ? 'bg-green-600 hover:bg-green-700 text-white border-green-600'  // Verde se selezionato
                            : 'border-green-300 text-green-600 hover:bg-green-50 bg-white'  // Outline default
                      }`}
                      title={`WhatsApp${invoice.sentViaWhatsapp ? ` (Già inviata ${invoice.whatsappSentAt ? new Date(invoice.whatsappSentAt).toLocaleDateString('it-IT') : ''} - Clicca per re-inviare)` : ''}`}
                      data-testid={`button-toggle-whatsapp-${invoice.id}`}
                    >
                      <MessageCircle className="h-5 w-5" />
                      {sendPreferences[invoice.id]?.whatsapp === true && (
                        <Check className="h-3 w-3 absolute top-0 right-0 bg-green-500 text-white rounded-full p-0.5" />
                      )}
                      {invoice.sentViaWhatsapp && (
                        <div className="h-2 w-2 absolute bottom-0 left-0 bg-yellow-400 rounded-full" title="Già inviata" />
                      )}
                    </Button>
                    
                    {/* 6. INVIA - pulsante finale */}
                    <Button
                      variant="default"
                      size="default"
                      onClick={() => {
                        const channels = sendPreferences[invoice.id] || { pwa: true, email: false, whatsapp: false };
                        
                        // Validazione: almeno un canale selezionato
                        if (!channels.pwa && !channels.email && !channels.whatsapp) {
                          toast({
                            title: "⚠️ Nessun canale selezionato",
                            description: "Seleziona almeno un canale di invio",
                            variant: "destructive"
                          });
                          return;
                        }
                        
                        // Controllo re-invio: quali canali selezionati sono già stati usati?
                        const resends: Array<{ channel: string; date: string }> = [];
                        if (channels.pwa && invoice.publishedToPwa) {
                          resends.push({ 
                            channel: "PWA - Area Clienti", 
                            date: invoice.pwaPublishedAt ? new Date(invoice.pwaPublishedAt).toLocaleDateString('it-IT', { day: '2-digit', month: '2-digit', year: 'numeric' }) : 'Data sconosciuta'
                          });
                        }
                        if (channels.email && invoice.sentViaEmail) {
                          resends.push({ 
                            channel: "Email", 
                            date: invoice.emailSentAt ? new Date(invoice.emailSentAt).toLocaleDateString('it-IT', { day: '2-digit', month: '2-digit', year: 'numeric' }) : 'Data sconosciuta'
                          });
                        }
                        if (channels.whatsapp && invoice.sentViaWhatsapp) {
                          resends.push({ 
                            channel: "WhatsApp", 
                            date: invoice.whatsappSentAt ? new Date(invoice.whatsappSentAt).toLocaleDateString('it-IT', { day: '2-digit', month: '2-digit', year: 'numeric' }) : 'Data sconosciuta'
                          });
                        }
                        
                        // Se ci sono canali da re-inviare, mostra conferma
                        if (resends.length > 0) {
                          setPendingInvoiceId(invoice.id);
                          setPendingChannels(channels);
                          setChannelsNeedingConfirm(resends);
                          setIsResendConfirmOpen(true);
                        } else {
                          // Nessun re-invio, procedi direttamente
                          sendInvoiceMutation.mutate({ invoiceId: invoice.id, channels });
                        }
                      }}
                      disabled={sendInvoiceMutation.isPending}
                      className={`h-10 px-6 font-medium ${
                        (invoice.publishedToPwa || invoice.sentViaEmail || invoice.sentViaWhatsapp)
                          ? 'bg-gray-400 hover:bg-gray-500 text-white'
                          : 'bg-green-600 hover:bg-green-700 text-white'
                      }`}
                      title="Invia ai canali selezionati"
                      data-testid={`button-send-invoice-${invoice.id}`}
                    >
                      <Send className="h-4 w-4 mr-2" />
                      INVIO
                    </Button>
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
                        onClick={() => {
                          const currentStatus = invoice.status === "paid" ? "Pagata" : "Non pagata";
                          const newStatus = invoice.status === "paid" ? "sent" : "paid";
                          const newStatusLabel = invoice.status === "paid" ? "Non pagata" : "Pagata";
                          
                          const confirmed = window.confirm(
                            `Fattura ${invoice.invoiceNumber}\n\n` +
                            `Stato attuale: ${currentStatus}\n` +
                            `Cambiare in: ${newStatusLabel}?`
                          );
                          
                          if (confirmed) {
                            updateStatusMutation.mutate({ 
                              invoiceId: invoice.id, 
                              status: newStatus 
                            });
                          }
                        }}
                      >
                        <Edit3 className="h-4 w-4 mr-2" />
                        Cambia Stato
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
                    <FormLabel>Importo Totale ({symbol})</FormLabel>
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
                                {symbol}{amount}
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
                    <FormLabel>Stato Pagamento</FormLabel>
                    <Select onValueChange={field.onChange} defaultValue={field.value}>
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder="Seleziona stato" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        <SelectItem value="sent">Non pagata</SelectItem>
                        <SelectItem value="paid">Pagata</SelectItem>
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

      {/* AlertDialog per conferma re-invio */}
      <AlertDialog open={isResendConfirmOpen} onOpenChange={setIsResendConfirmOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>⚠️ Conferma Re-invio Fattura</AlertDialogTitle>
            <AlertDialogDescription asChild>
              <div className="space-y-3">
                <p>Questa fattura è già stata inviata tramite i seguenti canali:</p>
                <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-3 space-y-2">
                  {channelsNeedingConfirm.map((item, idx) => (
                    <div key={idx} className="flex items-center justify-between text-sm">
                      <span className="font-medium text-yellow-900">{item.channel}</span>
                      <span className="text-yellow-700">Inviata il {item.date}</span>
                    </div>
                  ))}
                </div>
                <p className="text-sm text-muted-foreground">
                  Vuoi davvero re-inviare la fattura ai canali selezionati?
                </p>
              </div>
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel 
              onClick={() => {
                setIsResendConfirmOpen(false);
                setPendingInvoiceId(null);
                setPendingChannels({ pwa: false, email: false, whatsapp: false });
                setChannelsNeedingConfirm([]);
              }}
            >
              Annulla
            </AlertDialogCancel>
            <AlertDialogAction
              onClick={() => {
                if (pendingInvoiceId) {
                  sendInvoiceMutation.mutate({ 
                    invoiceId: pendingInvoiceId, 
                    channels: pendingChannels 
                  });
                }
                setIsResendConfirmOpen(false);
                setPendingInvoiceId(null);
                setPendingChannels({ pwa: false, email: false, whatsapp: false });
                setChannelsNeedingConfirm([]);
              }}
              className="bg-green-600 hover:bg-green-700"
            >
              Conferma Re-invio
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

    </div>
  );
}