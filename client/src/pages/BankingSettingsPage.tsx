import { useState, useEffect } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
// Force browser cache bust - v2.0
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Separator } from "@/components/ui/separator";
import { CreditCard, Banknote, Settings, Shield, AlertCircle, CheckCircle, Euro } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { useCurrency } from "@/hooks/use-currency";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useTranslation } from "react-i18next";

interface BankingSettings {
  bankName: string;
  accountHolder: string;
  iban: string;
  bic: string;
  address: string;
  autoPayEnabled: boolean;
  paymentDelay: number; // giorni
  minimumAmount: number; // euro
  description: string;
  isConfigured: boolean;
}

export default function BankingSettingsPage() {
  console.log('✅ ✅ ✅ NEW BANKING CODE LOADED! V3.0 - BUG FIXED ✅ ✅ ✅');
  
  const { t } = useTranslation();
  const { toast } = useToast();
  const { symbol } = useCurrency();
  const [settings, setSettings] = useState<BankingSettings | null>(null);

  const { data: bankingSettings, isLoading } = useQuery<BankingSettings>({
    queryKey: ['/api/admin/banking-settings'],
  });

  // Inizializza lo state locale quando i dati vengono caricati
  useEffect(() => {
    if (bankingSettings) {
      setSettings(bankingSettings);
    }
  }, [bankingSettings]);

  const updateBankingMutation = useMutation({
    mutationFn: async (settings: Partial<BankingSettings>) => {
      console.log('🏦 [MUTATION] Sending POST to /api/admin/banking-settings');
      console.log('🏦 [MUTATION] Data:', settings);
      const response = await apiRequest("POST", "/api/admin/banking-settings", settings);
      return response.json();
    },
    onSuccess: () => {
      console.log('🏦 [MUTATION] Save completed successfully!');
      toast({
        title: t("common.saved"),
        description: t("bankingSettings.savedDesc"),
      });
      queryClient.invalidateQueries({ queryKey: ['/api/admin/banking-settings'] });
    },
    onError: (error) => {
      console.error('🏦 [MUTATION] Save error:', error);
      toast({
        title: t("common.error"),
        description: t("bankingSettings.errorSave"),
        variant: "destructive",
      });
    },
  });

  const testPaymentMutation = useMutation({
    mutationFn: async () => {
      const response = await apiRequest("POST");
      return response.json();
    },
    onSuccess: (data) => {
      toast({
        title: t("bankingSettings.testOk"),
        description: data.message || t("bankingSettings.testOkDesc"),
      });
    },
    onError: () => {
      toast({
        title: t("bankingSettings.testFail"),
        description: t("bankingSettings.testFailDesc"),
        variant: "destructive",
      });
    },
  });

  // Aggiorna un singolo campo
  const updateField = (field: keyof BankingSettings, value: any) => {
    setSettings(prev => prev ? { ...prev, [field]: value } : null);
  };

  // Salva tutte le impostazioni
  const handleSaveSettings = () => {
    console.log('🏦 [BANKING] Save called!');
    console.log('🏦 [BANKING] Data to save:', settings);
    
    if (!settings) {
      console.error('❌ [BANKING] No data to save');
      return;
    }

    updateBankingMutation.mutate(settings);
  };

  if (isLoading || !settings) {
    return (
      <div className="container mx-auto py-6">
        <div className="text-center">{t("bankingSettings.loading")}</div>
      </div>
    );
  }

  return (
    <div className="container mx-auto py-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">{t("bankingSettings.title")}</h1>
          <p className="text-muted-foreground mt-1">
            {t("bankingSettings.subtitle")}
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Badge 
            variant={settings.isConfigured ? "default" : "secondary"}
            className="flex items-center gap-1"
          >
            {settings.isConfigured ? (
              <CheckCircle className="h-3 w-3" />
            ) : (
              <AlertCircle className="h-3 w-3" />
            )}
            {settings.isConfigured ? t("bankingSettings.configured") : t("bankingSettings.notConfigured")}
          </Badge>
        </div>
      </div>

      {/* Alert informativo */}
      <Alert>
        <Shield className="h-4 w-4" />
        <AlertDescription>
          {t("bankingSettings.alertSecurity")}
        </AlertDescription>
      </Alert>

      <div className="grid gap-6 lg:grid-cols-2">
        {/* Configurazione dati bancari */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <CreditCard className="h-5 w-5" />
              {t("bankingSettings.bankDataTitle")}
            </CardTitle>
          </CardHeader>
          <CardContent>
            <form onSubmit={(e) => { e.preventDefault(); handleSaveSettings(); }} className="space-y-4">
              <div className="grid gap-2">
                <Label htmlFor="bankName">{t("bankingSettings.bankName")}</Label>
                <Input
                  id="bankName"
                  value={settings.bankName}
                  onChange={(e) => updateField('bankName', e.target.value)}
                  placeholder={t("bankingSettings.bankNamePh")}
                  autoComplete="off"
                />
              </div>

              <div className="grid gap-2">
                <Label htmlFor="accountHolder">{t("bankingSettings.accountHolder")}</Label>
                <Input
                  id="accountHolder"
                  value={settings.accountHolder}
                  onChange={(e) => updateField('accountHolder', e.target.value)}
                  placeholder={t("bankingSettings.accountHolderPh")}
                  autoComplete="off"
                />
              </div>

              <div className="grid gap-2">
                <Label htmlFor="iban">{t("bankingSettings.iban")}</Label>
                <Input
                  id="iban"
                  type="text"
                  value={settings.iban}
                  onChange={(e) => updateField('iban', e.target.value)}
                  placeholder={t("bankingSettings.ibanPh")}
                  autoComplete="off"
                />
              </div>

              <div className="grid gap-2">
                <Label htmlFor="bic">{t("bankingSettings.bicSwift")}</Label>
                <Input
                  id="bic"
                  value={settings.bic}
                  onChange={(e) => updateField('bic', e.target.value)}
                  placeholder={t("bankingSettings.bicPh")}
                  autoComplete="off"
                />
              </div>

              <div className="grid gap-2">
                <Label htmlFor="address">{t("bankingSettings.address")}</Label>
                <Textarea
                  id="address"
                  value={settings.address}
                  onChange={(e) => updateField('address', e.target.value)}
                  placeholder={t("bankingSettings.addressPh")}
                  rows={3}
                />
              </div>

              <Button 
                type="submit"
                className="w-full"
                disabled={updateBankingMutation.isPending}
              >
                {updateBankingMutation.isPending ? t("bankingSettings.saving") : t("bankingSettings.saveBankData")}
              </Button>
            </form>
          </CardContent>
        </Card>

        {/* Configurazione pagamenti automatici */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Settings className="h-5 w-5" />
              {t("bankingSettings.autoPaymentsTitle")}
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <div className="space-y-0.5">
                  <Label>{t("bankingSettings.autoPayLabel")}</Label>
                  <p className="text-sm text-muted-foreground">
                    {t("bankingSettings.autoPayDesc")}
                  </p>
                </div>
                <Switch 
                  checked={settings.autoPayEnabled}
                  onCheckedChange={(checked) => updateField('autoPayEnabled', checked)}
                />
              </div>

              <Separator />

              <div className="grid gap-2">
                <Label htmlFor="paymentDelay">{t("bankingSettings.paymentDelay")}</Label>
                <Input
                  id="paymentDelay"
                  type="number"
                  min="1"
                  max="90"
                  value={settings.paymentDelay}
                  onChange={(e) => updateField('paymentDelay', parseInt(e.target.value) || 30)}
                  placeholder="30"
                />
                <p className="text-sm text-muted-foreground">
                  {t("bankingSettings.paymentDelayDesc")}
                </p>
              </div>

              <div className="grid gap-2">
                <Label htmlFor="minimumAmount">{t("bankingSettings.minimumAmount", { symbol })}</Label>
                <Input
                  id="minimumAmount"
                  type="number"
                  min="0.01"
                  step="0.01"
                  value={settings.minimumAmount}
                  onChange={(e) => updateField('minimumAmount', parseFloat(e.target.value) || 1.0)}
                  placeholder="1.00"
                />
                <p className="text-sm text-muted-foreground">
                  {t("bankingSettings.minimumAmountDesc")}
                </p>
              </div>

              <div className="grid gap-2">
                <Label htmlFor="description">{t("bankingSettings.description")}</Label>
                <Input
                  id="description"
                  value={settings.description}
                  onChange={(e) => updateField('description', e.target.value)}
                  placeholder={t("bankingSettings.descriptionPh")}
                />
              </div>

              <Button 
                type="button"
                onClick={handleSaveSettings}
                variant="secondary" 
                className="w-full"
                disabled={updateBankingMutation.isPending}
              >
                {updateBankingMutation.isPending ? t("bankingSettings.saving") : t("bankingSettings.saveConfig")}
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Test e statistiche */}
      <div className="grid gap-6 lg:grid-cols-2">
        {/* Test sistema */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Banknote className="h-5 w-5" />
              {t("bankingSettings.testTitle")}
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <p className="text-sm text-muted-foreground">
              {t("bankingSettings.testDesc")}
            </p>
            
            <Button 
              onClick={() => testPaymentMutation.mutate()}
              disabled={testPaymentMutation.isPending || !settings.isConfigured}
              className="w-full"
            >
              {testPaymentMutation.isPending ? t("bankingSettings.testRunning") : t("bankingSettings.testButton")}
            </Button>
          </CardContent>
        </Card>

        {/* Riepilogo commissioni */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Euro className="h-5 w-5" />
              {t("bankingSettings.summaryTitle")}
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-2 gap-4 text-center">
              <div className="space-y-1">
                <div className="text-2xl font-bold text-green-600">{symbol}1.00</div>
                <div className="text-sm text-muted-foreground">{t("bankingSettings.perSubscription")}</div>
              </div>
              <div className="space-y-1">
                <div className="text-2xl font-bold text-blue-600">30</div>
                <div className="text-sm text-muted-foreground">{t("bankingSettings.waitingDays")}</div>
              </div>
            </div>
            
            <Separator />
            
            <div className="text-sm text-muted-foreground">
              {t("bankingSettings.footerText")}
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}