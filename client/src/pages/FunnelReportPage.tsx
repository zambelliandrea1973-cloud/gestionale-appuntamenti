import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { useTranslation } from "react-i18next";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Loader2, TrendingUp, Users, Star, CreditCard, Zap } from "lucide-react";

interface FunnelData {
  totalRegistrations: number;
  withFirstService: number;
  withFirstClient: number;
  withFirstAppointment: number;
  withSubscription: number;
  professionalActivated: number;
}

function pct(num: number, den: number) {
  if (!den) return "—";
  return `${Math.round((num / den) * 100)}%`;
}

export default function FunnelReportPage() {
  const { t } = useTranslation();
  const today = new Date().toISOString().slice(0, 10);
  const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString().slice(0, 10);

  const [from, setFrom] = useState(thirtyDaysAgo);
  const [to, setTo] = useState(today);
  const [applied, setApplied] = useState({ from: thirtyDaysAgo, to: today });

  const { data, isLoading } = useQuery<FunnelData>({
    queryKey: ["/api/analytics/funnel", applied.from, applied.to],
    queryFn: () =>
      fetch(`/api/analytics/funnel?from=${applied.from}&to=${applied.to}`, {
        credentials: "include",
      }).then((r) => r.json()),
    staleTime: 60 * 1000,
  });

  const reg = data?.totalRegistrations ?? 0;

  const steps = [
    {
      label: "Registrazioni",
      value: reg,
      pctLabel: "—",
      icon: <Users className="h-5 w-5 text-blue-500" />,
      color: "bg-blue-50 border-blue-200",
    },
    {
      label: "Primo servizio creato",
      value: data?.withFirstService ?? 0,
      pctLabel: pct(data?.withFirstService ?? 0, reg),
      icon: <Star className="h-5 w-5 text-indigo-500" />,
      color: "bg-indigo-50 border-indigo-200",
    },
    {
      label: "Primo cliente creato",
      value: data?.withFirstClient ?? 0,
      pctLabel: pct(data?.withFirstClient ?? 0, reg),
      icon: <Users className="h-5 w-5 text-violet-500" />,
      color: "bg-violet-50 border-violet-200",
    },
    {
      label: "Primo appuntamento",
      value: data?.withFirstAppointment ?? 0,
      pctLabel: pct(data?.withFirstAppointment ?? 0, reg),
      icon: <TrendingUp className="h-5 w-5 text-purple-500" />,
      color: "bg-purple-50 border-purple-200",
    },
    {
      label: "Professional activated",
      value: data?.professionalActivated ?? 0,
      pctLabel: pct(data?.professionalActivated ?? 0, reg),
      icon: <Zap className="h-5 w-5 text-amber-500" />,
      color: "bg-amber-50 border-amber-200",
    },
    {
      label: "Abbonamento acquistato",
      value: data?.withSubscription ?? 0,
      pctLabel: pct(data?.withSubscription ?? 0, reg),
      icon: <CreditCard className="h-5 w-5 text-green-500" />,
      color: "bg-green-50 border-green-200",
    },
  ];

  return (
    <div className="p-6 max-w-4xl mx-auto">
      <h1 className="text-2xl font-bold mb-1">Funnel Report</h1>
      <p className="text-muted-foreground mb-6 text-sm">
        Conversioni di valore per Google Ads — aggiornato in tempo reale dal database.
      </p>

      <Card className="mb-6">
        <CardContent className="pt-5 flex flex-wrap gap-4 items-end">
          <div>
            <Label className="text-xs">Dal</Label>
            <Input type="date" value={from} onChange={(e) => setFrom(e.target.value)} className="w-36" />
          </div>
          <div>
            <Label className="text-xs">Al</Label>
            <Input type="date" value={to} onChange={(e) => setTo(e.target.value)} className="w-36" />
          </div>
          <Button onClick={() => setApplied({ from, to })}>Applica</Button>
        </CardContent>
      </Card>

      {isLoading ? (
        <div className="flex items-center gap-2 text-muted-foreground">
          <Loader2 className="h-4 w-4 animate-spin" /> Caricamento...
        </div>
      ) : (
        <>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 mb-8">
            {steps.map((step) => (
              <Card key={step.label} className={`border ${step.color}`}>
                <CardHeader className="pb-2 pt-4 px-4">
                  <CardTitle className="text-sm font-medium flex items-center gap-2">
                    {step.icon} {step.label}
                  </CardTitle>
                </CardHeader>
                <CardContent className="px-4 pb-4">
                  <div className="text-3xl font-bold">{step.value}</div>
                  <div className="text-xs text-muted-foreground mt-1">
                    {step.pctLabel !== "—" ? `${step.pctLabel} delle registrazioni` : ""}
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>

          <Card>
            <CardHeader>
              <CardTitle className="text-base">Passaggi di funnel</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                {steps.slice(1).map((step, i) => {
                  const prev = steps[i];
                  const convRate = pct(step.value, prev.value);
                  return (
                    <div key={step.label} className="flex items-center justify-between text-sm border-b pb-2 last:border-0 last:pb-0">
                      <span className="text-muted-foreground">
                        {prev.label} → {step.label}
                      </span>
                      <span className="font-semibold">{convRate}</span>
                    </div>
                  );
                })}
              </div>
              <p className="text-xs text-muted-foreground mt-4">
                💡 Ottimizza Google Ads prima per <strong>Primo servizio</strong> (signal più vicino al professionista reale), poi per <strong>Professional activated</strong>, infine per <strong>Abbonamento acquistato</strong>.
              </p>
            </CardContent>
          </Card>
        </>
      )}
    </div>
  );
}
