// @ts-nocheck
import { useState } from "react";
import { useTranslation } from "react-i18next";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { format, addDays } from "date-fns";
import { getDateLocale, getBrowserLocale } from '@/lib/utils/date';
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
  const { t, i18n } = useTranslation();
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
      toast({ title: t('invoices.toast.created') });
    },
    onError: () => {
      toast({ title: t('invoices.toast.createError'), variant: "destructive" });
    },
  });

  const form = useForm({
    resolver: zodResolver(z.object({
      clientId: z.number().min(1, t('invoices.form.clientRequired')),
      totalAmount: z.number().min(0, t('invoices.form.amountPositive')),
      date: z.string().min(1, t('invoices.form.dateRequired')),
      dueDate: z.string().min(1, t('invoices.form.dueDateRequired')),
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
      recipientEmail: z.string().email(t('invoices.validation.invalidEmail')),
      subject: z.string().min(1, t('invoices.validation.subjectRequired')),
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
        title: `✅ ${t('invoices.toast.emailSent')}`, 
        description: `${t('invoices.sentToClient')}: ${data.recipientEmail}` 
      });
    },
    onError: (error) => {
      toast({ 
        title: `❌ ${t('invoices.toast.emailError')}`, 
        description: error.message,
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
      const statusLabel = variables.status === "paid" ? t('invoices.paid') : t('invoices.unpaid');
      toast({ 
        title: `✅ ${t('invoices.toast.statusUpdated')}`, 
        description: statusLabel 
      });
    },
    onError: (error) => {
      toast({ 
        title: `❌ ${t('invoices.toast.statusError')}`, 
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
        title: `🧹 ${t('invoices.toast.cleanupCompleted')}`, 
        description: data.message 
      });
    },
    onError: (error: Error) => {
      toast({ 
        title: `❌ ${t('invoices.toast.cleanupError')}`, 
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
          title: `✅ ${t('invoices.toast.printStarted')}`, 
          description: t('invoices.toast.printWindowWillOpen') 
        });
      } else {
        toast({ 
          title: `❌ ${t('invoices.print')}`, 
          description: t('invoices.toast.printError'),
          variant: "destructive" 
        });
      }
    },
    onError: (error) => {
      toast({ 
        title: `❌ ${t('invoices.toast.printError')}`, 
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
        title: `✅ ${t('invoices.toast.previewGenerated')}`, 
        description: t('invoices.toast.previewDescription') 
      });
    },
    onError: (error) => {
      toast({ 
        title: `❌ ${t('invoices.preview')}`, 
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
        title: t('invoices.migrationComplete'), 
        description: data.message 
      });
    },
    onError: (error) => {
      toast({ 
        title: t('invoices.migrationError'), 
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
        throw new Error(error.message || t('invoices.sendError'));
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
        title: `✅ ${t('invoices.toast.sent')}`, 
        description: data.message
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
        emailForm.setValue("subject", t('invoices.subjectTemplate', { number: invoice.invoiceNumber }));
        emailForm.setValue("message", t('invoices.emailBodyTemplate', { firstName: invoice.client?.firstName, lastName: invoice.client?.lastName || t('invoices.clientFallback'), invoiceNumber: invoice.invoiceNumber }));
      }
    } catch (error) {
      console.log('Error loading email suggestions:', error);
      // Fallback a valori di default
      emailForm.setValue("recipientEmail", "");
      emailForm.setValue("subject", t('invoices.subjectTemplate', { number: invoice.invoiceNumber }));
      emailForm.setValue("message", t('invoices.emailBodyTemplate', { firstName: invoice.client?.firstName, lastName: invoice.client?.lastName || t('invoices.clientFallback'), invoiceNumber: invoice.invoiceNumber }));
    }
    
    setIsEmailDialogOpen(true);
  };

  const onEmailSubmit = (data: any) => {
    sendEmailMutation.mutate(data);
  };

  const handleDeleteInvoice = (invoice: Invoice) => {
    const confirmed = window.confirm(
      t('invoices.deleteConfirm', { number: invoice.invoiceNumber }) + `\n\n` +
      t('invoices.irreversibleAction')
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
        title: `⚠️ ${t('invoices.channels.noChannelSelected')}`,
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
          <h2 className="text-2xl font-semibold">{t('invoices.title')}</h2>
          <p className="text-muted-foreground">
            {t('invoices.subtitle')}
          </p>
        </div>
        <div className="flex gap-2 flex-wrap">
          <Button 
            variant="outline" 
            size="sm"
            onClick={() => migrateClientIdsMutation.mutate()}
            disabled={migrateClientIdsMutation.isPending}
          >
            {migrateClientIdsMutation.isPending ? t('invoices.updating') : t('invoices.updateInvoices')}
          </Button>
          <Button 
            variant="outline" 
            size="sm"
            onClick={handleCleanupNumbering}
            disabled={cleanupMutation.isPending}
          >
            <RefreshCw className="h-4 w-4 mr-2" />
            {cleanupMutation.isPending ? t('invoices.cleaning') : t('invoices.cleanupNumbering')}
          </Button>
          <Button onClick={() => setIsFormOpen(true)}>
            <Plus className="h-4 w-4 mr-2" />
            {t('invoices.newInvoice')}
          </Button>
        </div>
      </div>

      {invoices.length === 0 ? (
        <Card className="p-8 text-center">
          <FileText className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
          <h3 className="text-lg font-medium mb-2">{t('invoices.noInvoices')}</h3>
          <p className="text-muted-foreground mb-4">
            {t('invoices.startCreating')}
          </p>
          <Button onClick={() => setIsFormOpen(true)}>
            <Plus className="h-4 w-4 mr-2" />
            {t('invoices.createFirst')}
          </Button>
        </Card>
      ) : (
        <div className="grid gap-4">
          {invoices.map((invoice) => (
            <Card key={invoice.id} className="p-4">
              <div className="flex items-center justify-between">
                <div className="flex-1">
                  <h3 className="font-medium">{t('invoices.invoiceNumber')}{invoice.invoiceNumber}</h3>
                  <p className="text-sm text-muted-foreground">
                    {t('invoices.client')}: {invoice.client?.firstName} {invoice.client?.lastName}
                  </p>
                  <p className="text-sm text-muted-foreground">
                    {t('invoices.date')}: {format(new Date(invoice.date), "dd/MM/yyyy", { locale: getDateLocale(i18n.language) })}
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
                            {t('invoices.paid')}
                          </>
                        ) : (
                          <>
                            <AlertCircle className="h-3 w-3 mr-1" />
                            {t('invoices.unpaid')}
                          </>
                        )}
                      </Badge>
                      {invoice.sentAt && (
                        <span className="text-xs text-green-600 flex items-center gap-1">
                          <Check className="h-3 w-3" />
                          {t('invoices.sentToClient')}
                        </span>
                      )}
                    </div>
                  </div>
                  
                  {/* Pulsanti azione rapidi - responsive */}
                  <div className="flex flex-wrap items-center gap-1 md:gap-2">
                    {/* 1. Preview */}
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => handlePreviewInvoice(invoice)}
                      disabled={previewMutation.isPending}
                      className="h-9 w-9 p-0 border-blue-300 hover:bg-blue-50 text-blue-600 flex-shrink-0"
                      title={t('invoices.invoicePreview')}
                      data-testid={`button-preview-invoice-${invoice.id}`}
                    >
                      <Eye className="h-4 w-4" />
                    </Button>
                    
                    {/* 2. Stampa */}
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => handlePrintInvoice(invoice)}
                      disabled={printMutation.isPending}
                      className="h-9 w-9 p-0 border-gray-300 hover:bg-gray-50 flex-shrink-0"
                      title={t('invoices.invoicePrint')}
                      data-testid={`button-print-invoice-${invoice.id}`}
                    >
                      <Printer className="h-4 w-4" />
                    </Button>
                    
                    {/* 3. PWA - toggle */}
                    <Button
                      size="sm"
                      onClick={() => updateChannel(invoice.id, 'pwa')}
                      className={`h-9 w-9 p-0 relative border flex-shrink-0 ${
                        invoice.publishedToPwa 
                          ? 'bg-gray-400 hover:bg-gray-500 text-white border-gray-400'
                          : sendPreferences[invoice.id]?.pwa === true 
                            ? 'bg-blue-600 hover:bg-blue-700 text-white border-blue-600'
                            : 'border-blue-300 text-blue-600 hover:bg-blue-50 bg-white'
                      }`}
                      title={`PWA${invoice.publishedToPwa ? ` ${t('invoices.sentResend')}` : ''}`}
                      data-testid={`button-toggle-pwa-${invoice.id}`}
                    >
                      <Smartphone className="h-4 w-4" />
                    </Button>
                    
                    {/* 4. Email - toggle */}
                    <Button
                      size="sm"
                      onClick={() => updateChannel(invoice.id, 'email')}
                      className={`h-9 w-9 p-0 relative border flex-shrink-0 ${
                        invoice.sentViaEmail 
                          ? 'bg-gray-400 hover:bg-gray-500 text-white border-gray-400'
                          : sendPreferences[invoice.id]?.email === true 
                            ? 'bg-orange-600 hover:bg-orange-700 text-white border-orange-600'
                            : 'border-orange-300 text-orange-600 hover:bg-orange-50 bg-white'
                      }`}
                      title={`Email${invoice.sentViaEmail ? ` ${t('invoices.sentResend')}` : ''}`}
                      data-testid={`button-toggle-email-${invoice.id}`}
                    >
                      <Mail className="h-4 w-4" />
                    </Button>
                    
                    {/* 5. WhatsApp - toggle */}
                    <Button
                      size="sm"
                      onClick={() => updateChannel(invoice.id, 'whatsapp')}
                      className={`h-9 w-9 p-0 relative border flex-shrink-0 ${
                        invoice.sentViaWhatsapp 
                          ? 'bg-gray-400 hover:bg-gray-500 text-white border-gray-400'
                          : sendPreferences[invoice.id]?.whatsapp === true 
                            ? 'bg-green-600 hover:bg-green-700 text-white border-green-600'
                            : 'border-green-300 text-green-600 hover:bg-green-50 bg-white'
                      }`}
                      title={`WhatsApp${invoice.sentViaWhatsapp ? ` ${t('invoices.sentResend')}` : ''}`}
                      data-testid={`button-toggle-whatsapp-${invoice.id}`}
                    >
                      <MessageCircle className="h-4 w-4" />
                    </Button>
                    
                    {/* 6. INVIA - pulsante finale */}
                    <Button
                      variant="default"
                      size="sm"
                      onClick={() => {
                        const channels = sendPreferences[invoice.id] || { pwa: true, email: false, whatsapp: false };
                        if (!channels.pwa && !channels.email && !channels.whatsapp) {
                          toast({
                            title: `⚠️ ${t('invoices.channels.noChannelSelectedTitle')}`,
                            description: t('invoices.channels.noChannelSelected'),
                            variant: "destructive"
                          });
                          return;
                        }
                        const resends: Array<{ channel: string; date: string }> = [];
                        if (channels.pwa && invoice.publishedToPwa) {
                          resends.push({ channel: t('invoices.channelPwa'), date: invoice.pwaPublishedAt ? new Date(invoice.pwaPublishedAt).toLocaleDateString(getBrowserLocale(i18n.language), { day: '2-digit', month: '2-digit', year: 'numeric' }) : t('invoices.unknownDate')});
                        }
                        if (channels.email && invoice.sentViaEmail) {
                          resends.push({ channel: "Email", date: invoice.emailSentAt ? new Date(invoice.emailSentAt).toLocaleDateString(getBrowserLocale(i18n.language), { day: '2-digit', month: '2-digit', year: 'numeric' }) : t('invoices.unknownDate')});
                        }
                        if (channels.whatsapp && invoice.sentViaWhatsapp) {
                          resends.push({ channel: "WhatsApp", date: invoice.whatsappSentAt ? new Date(invoice.whatsappSentAt).toLocaleDateString(getBrowserLocale(i18n.language), { day: '2-digit', month: '2-digit', year: 'numeric' }) : t('invoices.unknownDate')});
                        }
                        if (resends.length > 0) {
                          setPendingInvoiceId(invoice.id);
                          setPendingChannels(channels);
                          setChannelsNeedingConfirm(resends);
                          setIsResendConfirmOpen(true);
                        } else {
                          sendInvoiceMutation.mutate({ invoiceId: invoice.id, channels });
                        }
                      }}
                      disabled={sendInvoiceMutation.isPending}
                      className={`font-medium flex-shrink-0 ${
                        (invoice.publishedToPwa || invoice.sentViaEmail || invoice.sentViaWhatsapp)
                          ? 'bg-gray-400 hover:bg-gray-500 text-white'
                          : 'bg-green-600 hover:bg-green-700 text-white'
                      }`}
                      title={t('invoices.sendToChannels')}
                      data-testid={`button-send-invoice-${invoice.id}`}
                    >
                      <Send className="h-3 w-3 mr-1" />
                      <span className="hidden sm:inline">{t('invoices.sendShort')}</span>
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
                        {previewMutation.isPending ? t('invoices.previewing') : t('invoices.previewInvoice')}
                      </DropdownMenuItem>
                      <DropdownMenuItem 
                        onClick={() => handlePrintInvoice(invoice)}
                        disabled={printMutation.isPending}
                      >
                        <Printer className="h-4 w-4 mr-2" />
                        {printMutation.isPending ? t('invoices.printing') : t('invoices.printPdf')}
                      </DropdownMenuItem>
                      <DropdownMenuItem 
                        onClick={() => handleEmailInvoice(invoice)}
                        disabled={sendEmailMutation.isPending}
                      >
                        <Mail className="h-4 w-4 mr-2" />
                        {sendEmailMutation.isPending ? t('invoices.sending') : t('invoices.sendViaEmail')}
                      </DropdownMenuItem>
                      <DropdownMenuItem 
                        onClick={() => {
                          const currentStatus = invoice.status === "paid" ? t('invoices.statusPaid') : t('invoices.statusUnpaid');
                          const newStatus = invoice.status === "paid" ? "sent" : "paid";
                          const newStatusLabel = invoice.status === "paid" ? t('invoices.statusUnpaid') : t('invoices.statusPaid');
                          
                          const confirmed = window.confirm(
                            t('invoices.subjectTemplate', { number: invoice.invoiceNumber }) + `\n\n` +
                            t('invoices.currentStatusLine', { status: currentStatus }) + `\n` +
                            t('invoices.changeToLine', { status: newStatusLabel })
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
                        {t('invoices.changeStatus')}
                      </DropdownMenuItem>
                      <DropdownMenuItem 
                        onClick={() => handleDeleteInvoice(invoice)}
                        disabled={deleteMutation.isPending}
                        className="text-red-600 focus:text-red-600"
                      >
                        <Trash2 className="h-4 w-4 mr-2" />
                        {deleteMutation.isPending ? t('invoices.deleting') : t('invoices.deleteInvoice')}
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
        <DialogContent className="min-[1200px]:max-w-lg max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{t('invoices.newInvoice')}</DialogTitle>
            <DialogDescription>
              {t('invoices.newInvoiceDesc')}
            </DialogDescription>
          </DialogHeader>
          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
              <div className="bg-muted/50 p-3 rounded-md text-sm">
                <div className="flex items-center justify-between">
                  <span className="text-muted-foreground">
                    📋 {t('invoices.autoInvoiceNumber')}
                  </span>
                  <span className="font-mono font-semibold text-primary">
                    {nextInvoiceNumber?.nextInvoiceNumber || t('common.loading')}
                  </span>
                </div>
              </div>
              <FormField
                control={form.control}
                name="clientId"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>{t('invoices.client')}</FormLabel>
                    <Select 
                      onValueChange={(value) => field.onChange(parseInt(value))} 
                      value={field.value ? field.value.toString() : undefined}
                    >
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder={t('invoices.form.selectClient')} />
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
                        {t('invoices.noClientsFound')}
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
                    <FormLabel>{t('invoices.totalAmount')} ({symbol})</FormLabel>
                    <FormControl>
                      <div className="space-y-2">
                        <Input 
                          type="number" 
                          step="0.01" 
                          placeholder={t('invoices.form.amountManualPh')} 
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
                      <FormLabel>{t('invoices.invoiceDate')}</FormLabel>
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
                      <FormLabel>{t('invoices.dueDate')}</FormLabel>
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
                    <FormLabel>{t('invoices.descriptionOptional')}</FormLabel>
                    <FormControl>
                      <div className="space-y-2">
                        <Textarea 
                          placeholder={t('invoices.descriptionPlaceholder')} 
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
                    <FormLabel>{t('invoices.paymentStatus')}</FormLabel>
                    <Select onValueChange={field.onChange} defaultValue={field.value}>
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder={t('invoices.selectStatus')} />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        <SelectItem value="sent">{t('invoices.unpaid')}</SelectItem>
                        <SelectItem value="paid">{t('invoices.paid')}</SelectItem>
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <DialogFooter>
                <Button type="button" variant="outline" onClick={() => setIsFormOpen(false)}>
                  {t('invoices.cancel')}
                </Button>
                <Button type="submit" disabled={createMutation.isPending}>
                  {createMutation.isPending ? t('invoices.creating') : t('invoices.createInvoice')}
                </Button>
              </DialogFooter>
            </form>
          </Form>
        </DialogContent>
      </Dialog>

      {/* Dialog per invio email */}
      <Dialog open={isEmailDialogOpen} onOpenChange={setIsEmailDialogOpen}>
        <DialogContent className="min-[1200px]:max-w-md">
          <DialogHeader>
            <DialogTitle>{t('invoices.sendByEmail')}</DialogTitle>
            <DialogDescription>
              {t('invoices.sendInvoiceTo', { number: selectedInvoice?.invoiceNumber })}
            </DialogDescription>
          </DialogHeader>
          <Form {...emailForm}>
            <form onSubmit={emailForm.handleSubmit(onEmailSubmit)} className="space-y-4">
              <FormField
                control={emailForm.control}
                name="recipientEmail"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>{t('invoices.recipientEmail')}</FormLabel>
                    <FormControl>
                      <Input type="email" placeholder={t('invoices.recipientPlaceholder')} {...field} />
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
                    <FormLabel>{t('invoices.subject')}</FormLabel>
                    <FormControl>
                      <Input placeholder={t('invoices.subjectPlaceholder')} {...field} />
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
                    <FormLabel>{t('invoices.messageOptional')}</FormLabel>
                    <FormControl>
                      <Textarea 
                        placeholder={t('invoices.customMessagePlaceholder')} 
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
                  {t('invoices.cancel')}
                </Button>
                <Button type="submit" disabled={sendEmailMutation.isPending}>
                  {sendEmailMutation.isPending ? t('invoices.sending') : t('invoices.sendEmailBtn')}
                </Button>
              </DialogFooter>
            </form>
          </Form>
        </DialogContent>
      </Dialog>

      {/* Dialog per pulizia numerazione */}
      <Dialog open={isCleanupDialogOpen} onOpenChange={setIsCleanupDialogOpen}>
        <DialogContent className="min-[1200px]:max-w-md">
          <DialogHeader>
            <DialogTitle className="text-orange-600">{t('invoices.cleanupTitle')}</DialogTitle>
            <DialogDescription>
              {t('invoices.cleanupDescription')}
              <br />
              <span className="text-orange-600 font-medium mt-2 block">
                {t('invoices.cleanupWarning')}
              </span>
            </DialogDescription>
          </DialogHeader>
          
          <div className="bg-orange-50 p-4 rounded-md border border-orange-200">
            <div className="text-sm">
              <p><strong>{t('invoices.currentFormat')}:</strong> {t('invoices.currentFormatValue')}</p>
              <p><strong>{t('invoices.afterFormat')}:</strong> {t('invoices.afterFormatValue')}</p>
              <p><strong>{t('invoices.totalInvoices')}:</strong> {invoices.length}</p>
              <p className="text-green-600 mt-2"><strong>{t('invoices.chronologicalKept')}</strong></p>
            </div>
          </div>
          
          <DialogFooter className="flex gap-2">
            <Button 
              variant="outline" 
              onClick={() => setIsCleanupDialogOpen(false)}
              disabled={cleanupMutation.isPending}
              className="flex-1"
            >
              {t('invoices.cancel')}
            </Button>
            <Button 
              variant="default"
              onClick={confirmCleanup}
              disabled={cleanupMutation.isPending}
              className="flex-1 bg-orange-600 hover:bg-orange-700"
            >
              <RefreshCw className="h-4 w-4 mr-2" />
              {cleanupMutation.isPending ? t('invoices.cleaning') : t('invoices.doCleanup')}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Dialog per anteprima fattura */}
      <Dialog open={isPreviewDialogOpen} onOpenChange={setIsPreviewDialogOpen}>
        <DialogContent className="min-[1200px]:max-w-4xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="text-blue-600">{t('invoices.previewTitle')}</DialogTitle>
            <DialogDescription>
              {t('invoices.previewDescription', { number: selectedInvoice?.invoiceNumber })}
            </DialogDescription>
          </DialogHeader>
          
          <div className="bg-white border rounded-lg p-6 shadow-sm">
            {previewMutation.isPending ? (
              <div className="flex items-center justify-center h-64">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
                <span className="ml-3 text-muted-foreground">{t('invoices.previewGenerating')}</span>
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
                <p>{t('invoices.previewEmpty')}</p>
              </div>
            )}
          </div>
          
          <DialogFooter className="flex gap-2">
            <Button 
              variant="outline" 
              onClick={() => setIsPreviewDialogOpen(false)}
              className="flex-1"
            >
              {t('invoices.previewClose')}
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
                  {printMutation.isPending ? t('invoices.printing') : t('invoices.printInvoice')}
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
                  {sendEmailMutation.isPending ? t('invoices.sending') : t('invoices.sendViaEmail')}
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
            <AlertDialogTitle>{t('invoices.resendTitle')}</AlertDialogTitle>
            <AlertDialogDescription asChild>
              <div className="space-y-3">
                <p>{t('invoices.resendIntro')}</p>
                <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-3 space-y-2">
                  {channelsNeedingConfirm.map((item, idx) => (
                    <div key={idx} className="flex items-center justify-between text-sm">
                      <span className="font-medium text-yellow-900">{item.channel}</span>
                      <span className="text-yellow-700">{t('invoices.resendSentOn', { date: item.date })}</span>
                    </div>
                  ))}
                </div>
                <p className="text-sm text-muted-foreground">
                  {t('invoices.resendQuestion')}
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
              {t('invoices.cancel')}
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
              {t('invoices.resendConfirm')}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

    </div>
  );
}