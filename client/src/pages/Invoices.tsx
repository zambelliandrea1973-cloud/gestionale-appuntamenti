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
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [isFormOpen, setIsFormOpen] = useState(false);

  const {
    data: invoices = [],
    isLoading,
    error,
  } = useQuery<Invoice[]>({
    queryKey: ["/api/invoices"],
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
      invoiceNumber: z.string().min(1, "Numero fattura richiesto"),
      clientName: z.string().min(1, "Nome cliente richiesto"),
      totalAmount: z.number().min(0, "Importo deve essere positivo"),
      date: z.string().min(1, "Data richiesta"),
      dueDate: z.string().min(1, "Data scadenza richiesta"),
      description: z.string().optional(),
      status: z.enum(["draft", "sent", "paid", "overdue"]).default("draft"),
    })),
    defaultValues: {
      invoiceNumber: "",
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
                <div>
                  <h3 className="font-medium">Fattura #{invoice.invoiceNumber}</h3>
                  <p className="text-sm text-muted-foreground">
                    Cliente: {invoice.client?.firstName} {invoice.client?.lastName}
                  </p>
                  <p className="text-sm text-muted-foreground">
                    Data: {format(new Date(invoice.date), "dd/MM/yyyy")}
                  </p>
                </div>
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
              <FormField
                control={form.control}
                name="invoiceNumber"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Numero Fattura</FormLabel>
                    <FormControl>
                      <Input placeholder="es. 2025-001" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
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
    </div>
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