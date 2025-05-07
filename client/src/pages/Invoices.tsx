import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import { format, parseISO } from "date-fns";
import { it } from "date-fns/locale";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from "@/components/ui/sheet";
import {
  Dialog,
  DialogTrigger,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
  DialogClose,
} from "@/components/ui/dialog";
import {
  Table,
  TableBody,
  TableCaption,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { useToast } from "@/hooks/use-toast";
import InvoiceForm from "@/components/InvoiceForm";
import ProFeatureGuard from "@/components/ProFeatureGuard";
import ProFeatureNavbar from "@/components/ProFeatureNavbar";
import InvoiceDetails from "@/components/InvoiceDetails";
import PaymentForm from "@/components/PaymentForm";
import { useTranslation } from 'react-i18next';
import { Link } from 'wouter';
import { 
  Euro, Trash2, Printer, FilePlus, FileEdit, 
  CreditCard, FileCheck, Calendar, Filter, Tag,
  Crown, CalendarPlus, FileSpreadsheet, Receipt
} from "lucide-react";

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
  const { t } = useTranslation();
  
  return (
    <ProFeatureGuard 
      featureName="Gestione Fatture"
      description="La gestione completa delle fatture è disponibile nella versione PRO. Aggiorna il tuo piano per accedere a questa funzionalità."
    >
      <div className="container py-6">
        <div className="flex items-center mb-6">
          <Crown className="h-6 w-6 mr-2 text-amber-500" />
          <h1 className="text-3xl font-bold tracking-tight">
            {t('pro.title', 'Funzionalità PRO')}
          </h1>
        </div>
        
        <div className="grid w-full grid-cols-3 mb-8">
          <Link to="/pro-features">
            <div 
              className="flex items-center justify-center py-3 px-3 border-b border-input bg-background hover:text-primary hover:bg-accent text-muted-foreground"
            >
              <CalendarPlus className="h-4 w-4 mr-2" />
              {t('pro.googleCalendar', 'Google Calendar')}
            </div>
          </Link>
          
          <Link to="/invoices">
            <div 
              className="flex items-center justify-center py-3 px-3 border-b-2 border-primary font-medium text-primary"
            >
              <Receipt className="h-4 w-4 mr-2" />
              {t('pro.invoices', 'Fatture')}
            </div>
          </Link>
          
          <Link to="/reports">
            <div 
              className="flex items-center justify-center py-3 px-3 border-b border-input bg-background hover:text-primary hover:bg-accent text-muted-foreground"
            >
              <FileSpreadsheet className="h-4 w-4 mr-2" />
              {t('pro.reports', 'Report')}
            </div>
          </Link>
        </div>
        
        <InvoicesContent />
      </div>
    </ProFeatureGuard>
  );
}

function InvoicesContent() {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [activeInvoice, setActiveInvoice] = useState<Invoice | null>(null);
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [isPaymentFormOpen, setIsPaymentFormOpen] = useState(false);
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
  const [statusFilter, setStatusFilter] = useState<string | null>(null);
  const [dateFilter, setDateFilter] = useState<string | null>(null);

  const {
    data: invoices = [],
    isLoading,
    error,
  } = useQuery<Invoice[]>({
    queryKey: ["/api/invoices"],
    select: (data) => {
      // Ordina le fatture per data (più recenti prima)
      return [...data].sort((a, b) => {
        return new Date(b.date).getTime() - new Date(a.date).getTime();
      });
    },
  });

  const filteredInvoices = invoices.filter((invoice: Invoice) => {
    let matchesStatus = true;
    let matchesDate = true;

    if (statusFilter && statusFilter !== "all") {
      matchesStatus = invoice.status === statusFilter;
    }

    if (dateFilter && dateFilter !== "all") {
      const currentDate = new Date();
      
      if (dateFilter === "thisMonth") {
        const invoiceDate = new Date(invoice.date);
        matchesDate = 
          invoiceDate.getMonth() === currentDate.getMonth() && 
          invoiceDate.getFullYear() === currentDate.getFullYear();
      } else if (dateFilter === "lastMonth") {
        const invoiceDate = new Date(invoice.date);
        const lastMonth = currentDate.getMonth() === 0 ? 11 : currentDate.getMonth() - 1;
        const lastMonthYear = currentDate.getMonth() === 0 ? 
          currentDate.getFullYear() - 1 : 
          currentDate.getFullYear();
        
        matchesDate = 
          invoiceDate.getMonth() === lastMonth && 
          invoiceDate.getFullYear() === lastMonthYear;
      } else if (dateFilter === "thisYear") {
        const invoiceDate = new Date(invoice.date);
        matchesDate = invoiceDate.getFullYear() === currentDate.getFullYear();
      }
    }

    return matchesStatus && matchesDate;
  });

  const deleteMutation = useMutation({
    mutationFn: async (invoiceId: number) => {
      return apiRequest("DELETE", `/api/invoices/${invoiceId}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/invoices"] });
      toast({
        title: "Fattura eliminata",
        description: "La fattura è stata eliminata con successo",
      });
      setIsDeleteDialogOpen(false);
      setActiveInvoice(null);
    },
    onError: () => {
      toast({
        title: "Errore",
        description: "Non è stato possibile eliminare la fattura",
        variant: "destructive",
      });
    },
  });

  const handleDeleteInvoice = () => {
    if (activeInvoice) {
      deleteMutation.mutate(activeInvoice.id);
    }
  };

  const getStatusBadgeVariant = (status: string) => {
    switch (status) {
      case "paid":
        return "success";
      case "unpaid":
        return "secondary";
      case "overdue":
        return "destructive";
      case "cancelled":
        return "outline";
      default:
        return "default";
    }
  };

  const getStatusLabel = (status: string) => {
    switch (status) {
      case "paid":
        return "Pagata";
      case "unpaid":
        return "Non pagata";
      case "overdue":
        return "Scaduta";
      case "cancelled":
        return "Annullata";
      default:
        return status;
    }
  };

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat("it-IT", {
      style: "currency",
      currency: "EUR",
    }).format(amount / 100);
  };

  const formatDate = (dateString: string) => {
    return format(parseISO(dateString), "dd/MM/yyyy", { locale: it });
  };

  const handleRefresh = () => {
    queryClient.invalidateQueries({ queryKey: ["/api/invoices"] });
  };

  const calculateTotalPaid = (invoice: Invoice) => {
    return invoice.payments.reduce((total, payment) => total + payment.amount, 0);
  };

  const calculateBalance = (invoice: Invoice) => {
    const totalPaid = calculateTotalPaid(invoice);
    return invoice.totalAmount - totalPaid;
  };

  if (isLoading) {
    return (
      <div className="flex justify-center items-center h-full">
        <div className="animate-spin h-8 w-8 border-4 border-primary rounded-full border-t-transparent"></div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex justify-center items-center h-full">
        <div className="text-destructive">Errore nel caricamento delle fatture</div>
      </div>
    );
  }

  return (
    <div className="p-4">
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-3xl font-bold">Fatture</h1>
        <div className="flex gap-2">
          <Select value={dateFilter || "all"} onValueChange={value => setDateFilter(value === "all" ? null : value)}>
            <SelectTrigger className="w-[180px]">
              <div className="flex items-center gap-2">
                <Calendar className="h-4 w-4" />
                {!dateFilter ? "Filtra per data" : (
                  dateFilter === "thisMonth" ? "Mese corrente" :
                  dateFilter === "lastMonth" ? "Mese scorso" :
                  dateFilter === "thisYear" ? "Anno corrente" : 
                  "Filtra per data"
                )}
              </div>
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Tutte le date</SelectItem>
              <SelectItem value="thisMonth">Mese corrente</SelectItem>
              <SelectItem value="lastMonth">Mese scorso</SelectItem>
              <SelectItem value="thisYear">Anno corrente</SelectItem>
            </SelectContent>
          </Select>
          
          <Select value={statusFilter || "all"} onValueChange={value => setStatusFilter(value === "all" ? null : value)}>
            <SelectTrigger className="w-[180px]">
              <div className="flex items-center gap-2">
                <Tag className="h-4 w-4" />
                {!statusFilter ? "Filtra per stato" : getStatusLabel(statusFilter)}
              </div>
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Tutti gli stati</SelectItem>
              <SelectItem value="unpaid">Non pagata</SelectItem>
              <SelectItem value="paid">Pagata</SelectItem>
              <SelectItem value="overdue">Scaduta</SelectItem>
              <SelectItem value="cancelled">Annullata</SelectItem>
            </SelectContent>
          </Select>
          
          <Button variant="outline" onClick={handleRefresh}>
            <Filter className="h-4 w-4 mr-2" />
            Aggiorna
          </Button>

          <Button onClick={() => {
            setActiveInvoice(null);
            setIsFormOpen(true);
          }}>
            <FilePlus className="h-4 w-4 mr-2" />
            Nuova fattura
          </Button>
        </div>
      </div>

      {filteredInvoices.length === 0 ? (
        <div className="text-center p-8 border rounded-lg">
          <p className="text-muted-foreground">Nessuna fattura trovata</p>
        </div>
      ) : (
        <div className="space-y-4">
          <Card>
            <CardHeader className="pb-2">
              <CardTitle>Elenco fatture</CardTitle>
            </CardHeader>
            <CardContent>
              <Table>
                <TableCaption>Elenco delle fatture</TableCaption>
                <TableHeader>
                  <TableRow>
                    <TableHead>Numero</TableHead>
                    <TableHead>Cliente</TableHead>
                    <TableHead>Data</TableHead>
                    <TableHead>Scadenza</TableHead>
                    <TableHead>Totale</TableHead>
                    <TableHead>Saldo</TableHead>
                    <TableHead>Stato</TableHead>
                    <TableHead className="text-right">Azioni</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredInvoices.map((invoice: Invoice) => (
                    <TableRow key={invoice.id}>
                      <TableCell>{invoice.invoiceNumber}</TableCell>
                      <TableCell>
                        {invoice.client.firstName} {invoice.client.lastName}
                      </TableCell>
                      <TableCell>{formatDate(invoice.date)}</TableCell>
                      <TableCell>{formatDate(invoice.dueDate)}</TableCell>
                      <TableCell>{formatCurrency(invoice.totalAmount)}</TableCell>
                      <TableCell>
                        {calculateBalance(invoice) > 0 
                          ? formatCurrency(calculateBalance(invoice))
                          : <span className="text-green-600">0,00 €</span>
                        }
                      </TableCell>
                      <TableCell>
                        <Badge variant={getStatusBadgeVariant(invoice.status) as any}>
                          {getStatusLabel(invoice.status)}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-right">
                        <div className="flex justify-end gap-2">
                          <Sheet>
                            <SheetTrigger asChild>
                              <Button
                                variant="outline"
                                size="sm"
                                onClick={() => setActiveInvoice(invoice)}
                              >
                                <FileCheck className="h-4 w-4" />
                              </Button>
                            </SheetTrigger>
                            <SheetContent side="right" className="w-[600px] sm:w-[540px]">
                              <SheetHeader>
                                <SheetTitle>Dettagli fattura</SheetTitle>
                              </SheetHeader>
                              {activeInvoice && (
                                <InvoiceDetails 
                                  invoice={activeInvoice} 
                                  onPaymentAdd={() => {
                                    setIsPaymentFormOpen(true);
                                  }}
                                  onRefresh={handleRefresh}
                                />
                              )}
                            </SheetContent>
                          </Sheet>

                          <TooltipProvider>
                            <Tooltip>
                              <TooltipTrigger asChild>
                                <Button
                                  variant="outline"
                                  size="sm"
                                  onClick={() => {
                                    setActiveInvoice(invoice);
                                    setIsFormOpen(true);
                                  }}
                                >
                                  <FileEdit className="h-4 w-4" />
                                </Button>
                              </TooltipTrigger>
                              <TooltipContent>
                                <p>Modifica</p>
                              </TooltipContent>
                            </Tooltip>
                          </TooltipProvider>

                          <TooltipProvider>
                            <Tooltip>
                              <TooltipTrigger asChild>
                                <Button
                                  variant="outline"
                                  size="sm"
                                  onClick={() => {
                                    setActiveInvoice(invoice);
                                    setIsPaymentFormOpen(true);
                                  }}
                                >
                                  <Euro className="h-4 w-4" />
                                </Button>
                              </TooltipTrigger>
                              <TooltipContent>
                                <p>Aggiungi pagamento</p>
                              </TooltipContent>
                            </Tooltip>
                          </TooltipProvider>

                          <TooltipProvider>
                            <Tooltip>
                              <TooltipTrigger asChild>
                                <Button
                                  variant="outline"
                                  size="sm"
                                  onClick={() => {
                                    // Implementare la stampa della fattura
                                    alert("Funzionalità di stampa da implementare");
                                  }}
                                >
                                  <Printer className="h-4 w-4" />
                                </Button>
                              </TooltipTrigger>
                              <TooltipContent>
                                <p>Stampa</p>
                              </TooltipContent>
                            </Tooltip>
                          </TooltipProvider>

                          <Dialog
                            open={isDeleteDialogOpen && activeInvoice?.id === invoice.id}
                            onOpenChange={setIsDeleteDialogOpen}
                          >
                            <DialogTrigger asChild>
                              <Button
                                variant="outline"
                                size="sm"
                                onClick={() => setActiveInvoice(invoice)}
                              >
                                <Trash2 className="h-4 w-4 text-destructive" />
                              </Button>
                            </DialogTrigger>
                            <DialogContent>
                              <DialogHeader>
                                <DialogTitle>Conferma eliminazione</DialogTitle>
                                <DialogDescription>
                                  Sei sicuro di voler eliminare questa fattura?
                                  <br />
                                  Questa azione non può essere annullata.
                                </DialogDescription>
                              </DialogHeader>
                              <DialogFooter>
                                <Button
                                  variant="destructive"
                                  onClick={handleDeleteInvoice}
                                  disabled={deleteMutation.isPending}
                                >
                                  {deleteMutation.isPending ? "Eliminazione..." : "Elimina"}
                                </Button>
                                <DialogClose asChild>
                                  <Button variant="outline">Annulla</Button>
                                </DialogClose>
                              </DialogFooter>
                            </DialogContent>
                          </Dialog>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </div>
      )}

      <Sheet open={isFormOpen} onOpenChange={setIsFormOpen}>
        <SheetContent side="right" className="w-[600px] sm:w-[540px]">
          <SheetHeader>
            <SheetTitle>
              {activeInvoice ? "Modifica fattura" : "Nuova fattura"}
            </SheetTitle>
          </SheetHeader>
          <InvoiceForm
            invoiceId={activeInvoice?.id}
            onClose={() => setIsFormOpen(false)}
            onSuccess={() => {
              handleRefresh();
              setIsFormOpen(false);
              setActiveInvoice(null);
            }}
          />
        </SheetContent>
      </Sheet>

      <Sheet open={isPaymentFormOpen} onOpenChange={setIsPaymentFormOpen}>
        <SheetContent side="right" className="w-[600px] sm:w-[540px]">
          <SheetHeader>
            <SheetTitle>
              Registra pagamento
            </SheetTitle>
          </SheetHeader>
          <PaymentForm
            invoiceId={activeInvoice?.id}
            onClose={() => setIsPaymentFormOpen(false)}
            onSuccess={() => {
              handleRefresh();
              setIsPaymentFormOpen(false);
            }}
          />
        </SheetContent>
      </Sheet>
    </div>
  );
}