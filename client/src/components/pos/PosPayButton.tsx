import { useState, useEffect } from "react";
import { useTranslation } from "react-i18next";
import { useQuery, useMutation } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import { Button } from "@/components/ui/button";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription,
} from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";
import { CreditCard, CheckCircle2, Loader2, QrCode, ExternalLink, RefreshCw } from "lucide-react";

interface PosPayButtonProps {
  amount: number;           // in euros
  invoiceId?: number;
  appointmentId?: number;
  clientId?: number;
  description?: string;
  isAnonymous?: boolean;
  onPaid?: () => void;
  className?: string;
}

interface PosSettings { isEnabled: boolean; }

export function PosPayButton({
  amount, invoiceId, appointmentId, clientId, description, isAnonymous = false, onPaid, className,
}: PosPayButtonProps) {
  const { t } = useTranslation();
  const { toast } = useToast();
  const [open, setOpen] = useState(false);
  const [posPaymentId, setPosPaymentId] = useState<number | null>(null);
  const [checkoutUrl, setCheckoutUrl] = useState<string | null>(null);
  const [status, setStatus] = useState<"pending" | "paid" | "failed">("pending");
  const [polling, setPolling] = useState(false);

  const { data: settings } = useQuery<PosSettings>({
    queryKey: ["/api/pos/settings"],
  });

  const checkoutMutation = useMutation({
    mutationFn: () => apiRequest("POST", "/api/pos/checkout", {
      amount, invoiceId, appointmentId, clientId, description, isAnonymous,
    }),
    onSuccess: (data: any) => {
      setPosPaymentId(data.posPaymentId);
      setCheckoutUrl(data.checkoutUrl);
      setStatus("pending");
      setPolling(true);
    },
    onError: (err: any) => {
      toast({ title: t("pos.pay.error", "Errore nel creare il pagamento"), description: err.message, variant: "destructive" });
    },
  });

  // Poll status every 3 seconds while dialog is open and status is pending
  useEffect(() => {
    if (!polling || !posPaymentId || status !== "pending") return;
    const interval = setInterval(async () => {
      try {
        const res = await apiRequest("GET", `/api/pos/checkout/${posPaymentId}/status`) as any;
        if (res.status === "paid") {
          setStatus("paid");
          setPolling(false);
          toast({ title: t("pos.pay.success", "Pagamento ricevuto! ✅") });
          onPaid?.();
        } else if (res.status === "failed") {
          setStatus("failed");
          setPolling(false);
        }
      } catch {}
    }, 3000);
    return () => clearInterval(interval);
  }, [polling, posPaymentId, status]);

  const handleOpen = () => {
    setOpen(true);
    setStatus("pending");
    setPosPaymentId(null);
    setCheckoutUrl(null);
    checkoutMutation.mutate();
  };

  const handleClose = () => {
    setOpen(false);
    setPolling(false);
  };

  if (!settings?.isEnabled) return null;

  return (
    <>
      <Button
        variant="outline"
        className={`gap-2 border-blue-200 text-blue-700 hover:bg-blue-50 ${className ?? ""}`}
        onClick={handleOpen}
      >
        <CreditCard className="h-4 w-4" />
        {t("pos.pay.button", "Carta / Bancomat")}
      </Button>

      <Dialog open={open} onOpenChange={handleClose}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <CreditCard className="h-5 w-5 text-primary" />
              {t("pos.pay.title", "Pagamento con carta")}
            </DialogTitle>
            <DialogDescription>
              {t("pos.pay.amount", "Importo")}: <strong>€{amount.toFixed(2)}</strong>
              {isAnonymous && (
                <Badge variant="outline" className="ml-2 text-xs">{t("pos.pay.anonymous", "Anonimo")}</Badge>
              )}
            </DialogDescription>
          </DialogHeader>

          <div className="py-4 space-y-4">
            {checkoutMutation.isPending && (
              <div className="flex flex-col items-center gap-3 py-6">
                <Loader2 className="h-8 w-8 animate-spin text-primary" />
                <p className="text-sm text-muted-foreground">{t("pos.pay.creating", "Creazione pagamento...")}</p>
              </div>
            )}

            {checkoutUrl && status === "pending" && (
              <div className="space-y-4">
                <div className="flex flex-col items-center gap-3 p-4 bg-muted/50 rounded-xl">
                  <QrCode className="h-10 w-10 text-primary" />
                  <p className="text-sm text-center text-muted-foreground">
                    {t("pos.pay.instructions", "Il cliente può scansionare il QR code oppure aprire il link per pagare")}
                  </p>
                  <Button
                    variant="outline"
                    size="sm"
                    className="gap-2 text-xs"
                    onClick={() => window.open(checkoutUrl, "_blank")}
                  >
                    <ExternalLink className="h-3 w-3" />
                    {t("pos.pay.openLink", "Apri link pagamento")}
                  </Button>
                </div>
                <div className="flex items-center gap-2 p-3 bg-amber-50 border border-amber-200 rounded-lg">
                  <Loader2 className="h-4 w-4 animate-spin text-amber-600 flex-shrink-0" />
                  <p className="text-xs text-amber-800">{t("pos.pay.waiting", "In attesa del pagamento...")}</p>
                </div>
              </div>
            )}

            {status === "paid" && (
              <div className="flex flex-col items-center gap-3 py-6">
                <CheckCircle2 className="h-12 w-12 text-green-500" />
                <p className="text-base font-semibold text-green-700">{t("pos.pay.paid", "Pagamento ricevuto!")}</p>
                <p className="text-sm text-muted-foreground">€{amount.toFixed(2)}</p>
                <Button onClick={handleClose} className="mt-2">{t("common.close", "Chiudi")}</Button>
              </div>
            )}

            {status === "failed" && (
              <div className="flex flex-col items-center gap-3 py-6">
                <div className="text-red-500 text-4xl">✗</div>
                <p className="text-sm text-red-600 font-medium">{t("pos.pay.failed", "Pagamento fallito")}</p>
                <Button variant="outline" onClick={() => { checkoutMutation.mutate(); setStatus("pending"); }} className="gap-2">
                  <RefreshCw className="h-4 w-4" />
                  {t("pos.pay.retry", "Riprova")}
                </Button>
              </div>
            )}
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}
