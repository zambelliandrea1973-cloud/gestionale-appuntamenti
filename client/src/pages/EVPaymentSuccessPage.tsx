// @ts-nocheck
import { useEffect, useState } from "react";
import { useLocation } from "wouter";
import { useMutation } from "@tanstack/react-query";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { CheckCircle2, XCircle, Loader2, ShoppingBag, ArrowRight, Package } from "lucide-react";

export default function EVPaymentSuccessPage() {
  const [, setLocation] = useLocation();
  const [orderId, setOrderId] = useState<string | null>(null);
  const [sessionId, setSessionId] = useState<string | null>(null);
  const [mode, setMode] = useState<"stripe" | "transfer" | null>(null);
  const [transferInfo, setTransferInfo] = useState<any>(null);

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const oid = params.get("order_id");
    const sid = params.get("session_id");
    const m = params.get("mode") as "stripe" | "transfer" | null;
    const iban = params.get("iban");
    const holder = params.get("iban_holder");
    const bank = params.get("bank");
    const amount = params.get("amount");
    const ref = params.get("ref");
    setOrderId(oid);
    setSessionId(sid);
    setMode(m || (iban ? "transfer" : "stripe"));
    if (iban) setTransferInfo({ iban, holder, bank, amount, ref: ref || oid });
  }, []);

  const verifyMutation = useMutation({
    mutationFn: async () => {
      const res = await apiRequest("POST", "/api/inventory/ev-orders/verify-payment", {
        orderId,
        sessionId,
      });
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/inventory/ev-orders"] });
    },
  });

  useEffect(() => {
    if (orderId && mode === "stripe" && sessionId) {
      verifyMutation.mutate();
    }
  }, [orderId, sessionId]);

  if (!orderId) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center text-gray-400">
          <XCircle className="w-12 h-12 mx-auto mb-2 text-red-300" />
          <div>Ordine non trovato.</div>
          <button onClick={() => setLocation("/ev-cosmetics/shop")} className="mt-4 text-violet-600 underline text-sm">
            Torna allo shop
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-violet-50 to-white flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl shadow-lg border border-gray-100 max-w-md w-full overflow-hidden">
        {/* Header */}
        <div className="bg-gradient-to-r from-violet-600 to-purple-600 px-6 py-8 text-center">
          <div className="w-16 h-16 bg-white/20 rounded-full flex items-center justify-center mx-auto mb-3">
            {mode === "stripe" ? (
              verifyMutation.isPending ? (
                <Loader2 className="w-8 h-8 text-white animate-spin" />
              ) : verifyMutation.isSuccess && verifyMutation.data?.paid ? (
                <CheckCircle2 className="w-8 h-8 text-white" />
              ) : (
                <Package className="w-8 h-8 text-white" />
              )
            ) : (
              <Package className="w-8 h-8 text-white" />
            )}
          </div>
          <h1 className="text-xl font-bold text-white">
            {mode === "stripe"
              ? verifyMutation.isPending
                ? "Verifica pagamento..."
                : verifyMutation.data?.paid
                ? "Pagamento confermato!"
                : "Ordine ricevuto"
              : "Ordine inviato!"}
          </h1>
          <p className="text-violet-200 text-sm mt-1">
            {mode === "stripe" ? "EV Cosmetics ha ricevuto il tuo ordine" : "Completa il pagamento tramite bonifico"}
          </p>
        </div>

        <div className="px-6 py-6 space-y-4">
          {/* Order ID */}
          <div className="bg-violet-50 rounded-xl p-4 text-center border border-violet-100">
            <div className="text-xs text-violet-500 font-semibold mb-1">NUMERO ORDINE</div>
            <div className="text-2xl font-black text-violet-700 font-mono">{orderId}</div>
          </div>

          {/* Stripe success */}
          {mode === "stripe" && verifyMutation.isSuccess && verifyMutation.data?.paid && (
            <div className="bg-emerald-50 border border-emerald-200 rounded-xl p-4">
              <div className="flex items-center gap-2 text-emerald-700 font-semibold text-sm mb-1">
                <CheckCircle2 className="w-4 h-4" />
                Pagamento completato
              </div>
              <p className="text-xs text-emerald-600">
                EV Cosmetics ha ricevuto il pagamento. Il tuo ordine è in elaborazione.
              </p>
            </div>
          )}

          {/* Transfer instructions */}
          {mode === "transfer" && (
            <div className="bg-amber-50 border border-amber-200 rounded-xl p-4 space-y-3">
              <div className="font-semibold text-amber-800 text-sm flex items-center gap-1.5">
                🏦 Istruzioni per il bonifico
              </div>
              {transferInfo?.iban && (
                <div className="space-y-2 text-sm">
                  <div className="flex justify-between">
                    <span className="text-gray-500">Beneficiario</span>
                    <span className="font-semibold text-gray-900">{transferInfo.holder || "EV Cosmetics"}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-500">IBAN</span>
                    <span className="font-mono font-bold text-gray-900 text-xs">{transferInfo.iban}</span>
                  </div>
                  {transferInfo.bank && (
                    <div className="flex justify-between">
                      <span className="text-gray-500">Banca</span>
                      <span className="font-semibold text-gray-900">{transferInfo.bank}</span>
                    </div>
                  )}
                  {transferInfo.amount && (
                    <div className="flex justify-between">
                      <span className="text-gray-500">Importo</span>
                      <span className="font-bold text-violet-700 text-base">€{parseFloat(transferInfo.amount).toFixed(2)}</span>
                    </div>
                  )}
                  <div className="flex justify-between">
                    <span className="text-gray-500">Causale</span>
                    <span className="font-mono font-bold text-gray-900">{transferInfo.ref}</span>
                  </div>
                </div>
              )}
              <p className="text-xs text-amber-700 bg-amber-100 rounded-lg px-3 py-2">
                Usa esattamente il numero ordine come causale. L'ordine sarà confermato alla ricezione del pagamento.
              </p>
            </div>
          )}

          {/* Pending state for stripe no-verify */}
          {mode === "stripe" && verifyMutation.isSuccess && !verifyMutation.data?.paid && (
            <div className="bg-amber-50 border border-amber-200 rounded-xl p-4">
              <div className="text-amber-800 text-sm font-semibold mb-1">In attesa di conferma</div>
              <p className="text-xs text-amber-700">L'ordine è stato ricevuto. EV Cosmetics lo confermerà a breve.</p>
            </div>
          )}

          <div className="text-xs text-gray-400 text-center">
            Riceverai una email quando l'ordine verrà spedito.
          </div>

          {/* Actions */}
          <div className="flex flex-col gap-2 pt-2">
            <button
              onClick={() => setLocation("/ev-cosmetics/shop")}
              className="w-full flex items-center justify-center gap-2 bg-violet-600 hover:bg-violet-700 text-white font-bold py-3 rounded-xl text-sm"
            >
              <ShoppingBag className="w-4 h-4" />
              Continua lo shopping
            </button>
            <button
              onClick={() => setLocation("/dashboard")}
              className="w-full flex items-center justify-center gap-2 text-gray-500 hover:text-gray-700 font-medium py-2 rounded-xl text-sm border border-gray-200 hover:bg-gray-50"
            >
              Vai alla dashboard
              <ArrowRight className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
