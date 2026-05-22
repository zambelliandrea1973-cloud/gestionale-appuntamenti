import { useState } from "react";
import { useTranslation } from "react-i18next";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";
import { CreditCard, CheckCircle2, XCircle, Loader2, ExternalLink } from "lucide-react";

interface PosSettingsData {
  isEnabled: boolean;
  provider: string;
  currency: string;
  sumupApiKey: string;
  sumupMerchantCode: string;
}

export default function PosSettingsPanel() {
  const { t } = useTranslation();
  const { toast } = useToast();
  const qc = useQueryClient();

  const [apiKeyInput, setApiKeyInput] = useState("");
  const [testResult, setTestResult] = useState<null | "ok" | "fail">(null);

  const { data: settings, isLoading } = useQuery<PosSettingsData>({
    queryKey: ["/api/pos/settings"],
  });

  const saveMutation = useMutation({
    mutationFn: (data: Partial<PosSettingsData> & { sumupApiKey?: string }) =>
      apiRequest("POST", "/api/pos/settings", data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["/api/pos/settings"] });
      toast({ title: t("pos.settings.saved", "Impostazioni POS salvate") });
    },
    onError: () => toast({ title: t("pos.settings.saveError", "Errore nel salvataggio"), variant: "destructive" }),
  });

  const testMutation = useMutation({
    mutationFn: () => apiRequest("POST", "/api/pos/test", {}),
    onSuccess: (data: any) => {
      setTestResult("ok");
      qc.invalidateQueries({ queryKey: ["/api/pos/settings"] });
      toast({ title: t("pos.settings.testOk", "Connessione SumUp riuscita!"), description: `Merchant: ${data.merchantCode}` });
    },
    onError: () => {
      setTestResult("fail");
      toast({ title: t("pos.settings.testFail", "Connessione fallita"), description: t("pos.settings.testFailDesc", "Verificare la API key"), variant: "destructive" });
    },
  });

  const handleToggle = (enabled: boolean) => {
    saveMutation.mutate({ isEnabled: enabled });
  };

  const handleSave = () => {
    saveMutation.mutate({
      isEnabled: settings?.isEnabled ?? false,
      provider: "sumup",
      currency: "EUR",
      sumupApiKey: apiKeyInput || undefined,
    });
    setApiKeyInput("");
  };

  if (isLoading) return <div className="flex items-center gap-2 text-muted-foreground py-4"><Loader2 className="h-4 w-4 animate-spin" />{t("common.loading", "Caricamento...")}</div>;

  const isConfigured = !!settings?.sumupMerchantCode;

  return (
    <div className="space-y-6">
      {/* Header card */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="bg-primary/10 rounded-xl p-2">
                <CreditCard className="h-5 w-5 text-primary" />
              </div>
              <div>
                <CardTitle className="text-base">{t("pos.settings.title", "Pagamento con terminale POS")}</CardTitle>
                <CardDescription>{t("pos.settings.desc", "Accetta carte e bancomat direttamente dai tuoi appuntamenti e fatture")}</CardDescription>
              </div>
            </div>
            <Switch
              checked={settings?.isEnabled ?? false}
              onCheckedChange={handleToggle}
              disabled={saveMutation.isPending || !isConfigured}
            />
          </div>
        </CardHeader>

        {settings?.isEnabled && isConfigured && (
          <CardContent>
            <div className="flex items-center gap-2">
              <CheckCircle2 className="h-4 w-4 text-green-500" />
              <span className="text-sm text-green-700 font-medium">{t("pos.settings.active", "POS attivo")}</span>
              <Badge variant="outline" className="ml-2 text-xs">{settings.sumupMerchantCode}</Badge>
            </div>
          </CardContent>
        )}
      </Card>

      {/* SumUp configuration */}
      <Card>
        <CardHeader>
          <CardTitle className="text-sm font-semibold flex items-center gap-2">
            <span className="text-lg">🟢</span> SumUp
          </CardTitle>
          <CardDescription>
            {t("pos.settings.sumupDesc", "Inserisci la tua API key personale SumUp per collegare il terminale")}
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* Current status */}
          {isConfigured ? (
            <div className="flex items-center gap-2 p-3 bg-green-50 rounded-lg border border-green-200">
              <CheckCircle2 className="h-4 w-4 text-green-600 flex-shrink-0" />
              <div>
                <p className="text-sm font-medium text-green-800">{t("pos.settings.connected", "Account SumUp collegato")}</p>
                <p className="text-xs text-green-600">Merchant code: {settings?.sumupMerchantCode}</p>
              </div>
            </div>
          ) : (
            <div className="flex items-center gap-2 p-3 bg-amber-50 rounded-lg border border-amber-200">
              <XCircle className="h-4 w-4 text-amber-600 flex-shrink-0" />
              <p className="text-sm text-amber-800">{t("pos.settings.notConnected", "Account SumUp non ancora collegato")}</p>
            </div>
          )}

          {/* API key input */}
          <div className="space-y-2">
            <Label htmlFor="sumup-api-key">
              {t("pos.settings.apiKey", "API Key SumUp")}
            </Label>
            <Input
              id="sumup-api-key"
              type="password"
              placeholder={isConfigured ? "••••••••  (lascia vuoto per non modificare)" : t("pos.settings.apiKeyPlaceholder", "Incolla qui la tua API key SumUp")}
              value={apiKeyInput}
              onChange={e => { setApiKeyInput(e.target.value); setTestResult(null); }}
            />
            <p className="text-xs text-muted-foreground">
              {t("pos.settings.apiKeyHint", "Trovala su")} {" "}
              <a href="https://developer.sumup.com/" target="_blank" rel="noopener noreferrer" className="text-primary underline inline-flex items-center gap-1">
                developer.sumup.com <ExternalLink className="h-3 w-3" />
              </a>
              {" → "}{t("pos.settings.apiKeyHint2", "API Keys → Create key")}
            </p>
          </div>

          <div className="flex gap-2">
            <Button
              variant="outline"
              onClick={() => testMutation.mutate()}
              disabled={testMutation.isPending || (!apiKeyInput && !isConfigured)}
              className="gap-2"
            >
              {testMutation.isPending
                ? <><Loader2 className="h-4 w-4 animate-spin" />{t("pos.settings.testing", "Test...")}</>
                : testResult === "ok"
                  ? <><CheckCircle2 className="h-4 w-4 text-green-500" />{t("pos.settings.testOkBtn", "Connesso")}</>
                  : testResult === "fail"
                    ? <><XCircle className="h-4 w-4 text-red-500" />{t("pos.settings.testFailBtn", "Fallito")}</>
                    : t("pos.settings.testBtn", "Testa connessione")
              }
            </Button>
            <Button
              onClick={handleSave}
              disabled={saveMutation.isPending || (!apiKeyInput && isConfigured)}
            >
              {saveMutation.isPending ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : null}
              {t("common.save", "Salva")}
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Info: other providers coming */}
      <Card className="border-dashed">
        <CardContent className="pt-6">
          <p className="text-sm text-muted-foreground text-center">
            {t("pos.settings.moreProviders", "Prossimamente: Stripe Terminal, Square e altri provider")}
          </p>
        </CardContent>
      </Card>
    </div>
  );
}
