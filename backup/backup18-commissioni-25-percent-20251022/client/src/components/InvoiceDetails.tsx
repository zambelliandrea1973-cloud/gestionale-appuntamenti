import { format, parseISO } from "date-fns";
import { it } from "date-fns/locale";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
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
import { useToast } from "@/hooks/use-toast";
import { Trash2, Euro, FileEdit, RefreshCw } from "lucide-react";
import { useState } from "react";

interface InvoiceDetailsProps {
  invoice: any;
  onPaymentAdd: () => void;
  onRefresh: () => void;
}

export default function InvoiceDetails({
  invoice,
  onPaymentAdd,
  onRefresh,
}: InvoiceDetailsProps) {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [isDeleteConfirmOpen, setIsDeleteConfirmOpen] = useState(false);
  const [paymentToDelete, setPaymentToDelete] = useState<number | null>(null);

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat("it-IT", {
      style: "currency",
      currency: "EUR",
    }).format(amount / 100);
  };

  const formatDate = (dateString: string) => {
    return format(parseISO(dateString), "dd/MM/yyyy", { locale: it });
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

  const calculateTotalPaid = () => {
    return invoice.payments.reduce((total: number, payment: any) => total + payment.amount, 0);
  };

  const calculateBalance = () => {
    return invoice.totalAmount - calculateTotalPaid();
  };

  const getPaymentMethodLabel = (method: string) => {
    switch (method) {
      case "cash":
        return "Contanti";
      case "card":
        return "Carta";
      case "bank_transfer":
        return "Bonifico";
      default:
        return method;
    }
  };

  const deletePaymentMutation = useMutation({
    mutationFn: async (paymentId: number) => {
      return apiRequest("DELETE", `/api/payments/${paymentId}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/invoices"] });
      toast({
        title: "Pagamento eliminato",
        description: "Il pagamento è stato eliminato con successo",
      });
      setIsDeleteConfirmOpen(false);
      setPaymentToDelete(null);
      onRefresh();
    },
    onError: () => {
      toast({
        title: "Errore",
        description: "Non è stato possibile eliminare il pagamento",
        variant: "destructive",
      });
    },
  });

  const handleDeletePayment = () => {
    if (paymentToDelete !== null) {
      deletePaymentMutation.mutate(paymentToDelete);
    }
  };

  return (
    <div className="space-y-8 mt-4">
      <div className="flex justify-between items-center">
        <h3 className="text-2xl font-semibold">
          Fattura #{invoice.invoiceNumber}
        </h3>
        <Badge variant={getStatusBadgeVariant(invoice.status) as any}>
          {getStatusLabel(invoice.status)}
        </Badge>
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div>
          <h4 className="text-sm font-medium">Cliente</h4>
          <p className="text-lg">
            {invoice.client.firstName} {invoice.client.lastName}
          </p>
        </div>
        <div>
          <h4 className="text-sm font-medium">Data</h4>
          <p className="text-lg">{formatDate(invoice.date)}</p>
        </div>
        <div>
          <h4 className="text-sm font-medium">Scadenza</h4>
          <p className="text-lg">{formatDate(invoice.dueDate)}</p>
        </div>
        <div>
          <h4 className="text-sm font-medium">Totale</h4>
          <p className="text-xl font-bold">{formatCurrency(invoice.totalAmount)}</p>
        </div>
      </div>

      {invoice.tax > 0 && (
        <div>
          <h4 className="text-sm font-medium">IVA</h4>
          <p className="text-lg">{formatCurrency(invoice.tax)}</p>
        </div>
      )}

      {invoice.notes && (
        <div>
          <h4 className="text-sm font-medium">Note</h4>
          <p className="text-lg">{invoice.notes}</p>
        </div>
      )}

      <Card>
        <CardHeader>
          <CardTitle>Elementi</CardTitle>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Descrizione</TableHead>
                <TableHead className="text-right">Quantità</TableHead>
                <TableHead className="text-right">Prezzo</TableHead>
                <TableHead className="text-right">Totale</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {invoice.items.map((item: any) => (
                <TableRow key={item.id}>
                  <TableCell>
                    {item.description}
                    {item.service && (
                      <span className="text-sm text-muted-foreground block">
                        {item.service.name}
                      </span>
                    )}
                  </TableCell>
                  <TableCell className="text-right">{item.quantity}</TableCell>
                  <TableCell className="text-right">
                    {formatCurrency(item.unitPrice)}
                  </TableCell>
                  <TableCell className="text-right">
                    {formatCurrency(item.unitPrice * item.quantity)}
                  </TableCell>
                </TableRow>
              ))}
              <TableRow>
                <TableCell colSpan={3} className="text-right font-bold">
                  Totale
                </TableCell>
                <TableCell className="text-right font-bold">
                  {formatCurrency(invoice.totalAmount)}
                </TableCell>
              </TableRow>
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle>Pagamenti</CardTitle>
          <div className="flex gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={onRefresh}
            >
              <RefreshCw className="h-4 w-4 mr-2" />
              Aggiorna
            </Button>
            <Button
              variant="default"
              size="sm"
              onClick={onPaymentAdd}
            >
              <Euro className="h-4 w-4 mr-2" />
              Registra pagamento
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          {invoice.payments.length === 0 ? (
            <p className="text-center py-4 text-muted-foreground">
              Nessun pagamento registrato
            </p>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Data</TableHead>
                  <TableHead>Metodo</TableHead>
                  <TableHead className="text-right">Importo</TableHead>
                  <TableHead className="text-right">Azioni</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {invoice.payments.map((payment: any) => (
                  <TableRow key={payment.id}>
                    <TableCell>{formatDate(payment.paymentDate)}</TableCell>
                    <TableCell>
                      {getPaymentMethodLabel(payment.paymentMethod)}
                    </TableCell>
                    <TableCell className="text-right">
                      {formatCurrency(payment.amount)}
                    </TableCell>
                    <TableCell className="text-right">
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => {
                          setPaymentToDelete(payment.id);
                          setIsDeleteConfirmOpen(true);
                        }}
                      >
                        <Trash2 className="h-4 w-4 text-destructive" />
                      </Button>
                    </TableCell>
                  </TableRow>
                ))}
                <TableRow>
                  <TableCell colSpan={2} className="text-right font-bold">
                    Totale pagato
                  </TableCell>
                  <TableCell className="text-right font-bold">
                    {formatCurrency(calculateTotalPaid())}
                  </TableCell>
                  <TableCell />
                </TableRow>
                <TableRow>
                  <TableCell colSpan={2} className="text-right font-bold">
                    Saldo
                  </TableCell>
                  <TableCell className="text-right font-bold">
                    {calculateBalance() > 0 ? (
                      formatCurrency(calculateBalance())
                    ) : (
                      <span className="text-green-600">0,00 €</span>
                    )}
                  </TableCell>
                  <TableCell />
                </TableRow>
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      <Dialog
        open={isDeleteConfirmOpen}
        onOpenChange={setIsDeleteConfirmOpen}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Conferma eliminazione</DialogTitle>
            <DialogDescription>
              Sei sicuro di voler eliminare questo pagamento?
              <br />
              Questa azione non può essere annullata.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button
              variant="destructive"
              onClick={handleDeletePayment}
              disabled={deletePaymentMutation.isPending}
            >
              {deletePaymentMutation.isPending ? "Eliminazione..." : "Elimina"}
            </Button>
            <DialogClose asChild>
              <Button variant="outline">Annulla</Button>
            </DialogClose>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}