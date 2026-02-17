import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
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
import { triggerRefreshAfterSave } from "@/lib/autoRefresh";
import { apiRequest, queryClient } from "@/lib/queryClient";

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
  const { toast } = useToast();
  const [showIban, setShowIban] = useState(false);

  const { data: bankingSettings, isLoading } = useQuery<BankingSettings>({
    queryKey: ['/api/admin/banking-settings'],
  });

  const updateBankingMutation = useMutation({
    mutationFn: async (settings: Partial<BankingSettings>) => {
      const response = await apiRequest("POST", "/api/admin/banking-settings", settings);
      return response.json();
    },
    onSuccess: () => {
      toast({
        title: "Impostazioni salvate",
        description: "Le impostazioni bancarie sono state aggiornate con successo",
      });
      queryClient.invalidateQueries({ queryKey: ['/api/admin/banking-settings'] });
      // Trigger refresh automatico per evitare problemi di cache
      triggerRefreshAfterSave('banking');
    },
    onError: () => {
      toast({
        title: "Errore",
        description: "Impossibile salvare le impostazioni bancarie",
        variant: "destructive",
      });
    },
  });

  const testPaymentMutation = useMutation({
    mutationFn: async () => {
      const response = await apiRequest("POST", "/api/admin/test-payment");
      return response.json();
    },
    onSuccess: (data) => {
      toast({
        title: "Test completato",
        description: data.message || "Il sistema di pagamento è configurato correttamente",
      });
    },
    onError: () => {
      toast({
        title: "Test fallito",
        description: "Verifica la configurazione dei dati bancari",
        variant: "destructive",
      });
    },
  });

  const handleSaveSettings = (formData: FormData) => {
    const settings = {
      bankName: formData.get('bankName') as string,
      accountHolder: formData.get('accountHolder') as string,
      iban: formData.get('iban') as string,
      bic: formData.get('bic') as string,
      address: formData.get('address') as string,
      autoPayEnabled: formData.get('autoPayEnabled') === 'on',
      paymentDelay: parseInt(formData.get('paymentDelay') as string) || 30,
      minimumAmount: parseFloat(formData.get('minimumAmount') as string) || 1.0,
      description: formData.get('description') as string,
    };

    updateBankingMutation.mutate(settings);
  };

  if (isLoading) {
    return (
      <div className="container mx-auto py-6">
        <div className="text-center">Caricamento impostazioni bancarie...</div>
      </div>
    );
  }

  const currentSettings = bankingSettings || {
    bankName: '',
    accountHolder: '',
    iban: '',
    bic: '',
    address: '',
    autoPayEnabled: false,
    paymentDelay: 30,
    minimumAmount: 1.0,
    description: 'Commissione referral sistema gestione appuntamenti',
    isConfigured: false,
  };

  return (
    <div className="container mx-auto py-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Configurazione Pagamenti</h1>
          <p className="text-muted-foreground mt-1">
            Gestisci i dati bancari per i pagamenti automatici delle commissioni referral
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Badge 
            variant={currentSettings.isConfigured ? "default" : "secondary"}
            className="flex items-center gap-1"
          >
            {currentSettings.isConfigured ? (
              <CheckCircle className="h-3 w-3" />
            ) : (
              <AlertCircle className="h-3 w-3" />
            )}
            {currentSettings.isConfigured ? "Configurato" : "Non configurato"}
          </Badge>
        </div>
      </div>

      {/* Alert informativo */}
      <Alert>
        <Shield className="h-4 w-4" />
        <AlertDescription>
          Questi dati vengono utilizzati per elaborare automaticamente i pagamenti delle commissioni referral allo staff. 
          Tutti i dati sono crittografati e conservati in sicurezza.
        </AlertDescription>
      </Alert>

      <div className="grid gap-6 lg:grid-cols-2">
        {/* Configurazione dati bancari */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <CreditCard className="h-5 w-5" />
              Dati Bancari
            </CardTitle>
          </CardHeader>
          <CardContent>
            <form action={handleSaveSettings} className="space-y-4">
              <div className="grid gap-2">
                <Label htmlFor="bankName">Nome Banca</Label>
                <Input
                  id="bankName"
                  name="bankName"
                  defaultValue={currentSettings.bankName}
                  placeholder="es. Intesa Sanpaolo"
                  required
                />
              </div>

              <div className="grid gap-2">
                <Label htmlFor="accountHolder">Intestatario Conto</Label>
                <Input
                  id="accountHolder"
                  name="accountHolder"
                  defaultValue={currentSettings.accountHolder}
                  placeholder="Nome e Cognome / Ragione Sociale"
                  required
                />
              </div>

              <div className="grid gap-2">
                <div className="flex items-center justify-between">
                  <Label htmlFor="iban">IBAN</Label>
                  <Button 
                    type="button"
                    variant="ghost" 
                    size="sm"
                    onClick={() => setShowIban(!showIban)}
                  >
                    {showIban ? "Nascondi" : "Mostra"}
                  </Button>
                </div>
                <Input
                  id="iban"
                  name="iban"
                  type={showIban ? "text" : "password"}
                  defaultValue={currentSettings.iban}
                  placeholder="IT60 X054 2811 1010 0000 0123 456"
                  required
                />
              </div>

              <div className="grid gap-2">
                <Label htmlFor="bic">BIC/SWIFT</Label>
                <Input
                  id="bic"
                  name="bic"
                  defaultValue={currentSettings.bic}
                  placeholder="es. BCITITMM"
                />
              </div>

              <div className="grid gap-2">
                <Label htmlFor="address">Indirizzo</Label>
                <Textarea
                  id="address"
                  name="address"
                  defaultValue={currentSettings.address}
                  placeholder="Indirizzo completo per fatturazione"
                  rows={3}
                />
              </div>

              <Button 
                type="submit" 
                className="w-full"
                disabled={updateBankingMutation.isPending}
              >
                {updateBankingMutation.isPending ? "Salvando..." : "Salva Dati Bancari"}
              </Button>
            </form>
          </CardContent>
        </Card>

        {/* Configurazione pagamenti automatici */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Settings className="h-5 w-5" />
              Pagamenti Automatici
            </CardTitle>
          </CardHeader>
          <CardContent>
            <form action={handleSaveSettings} className="space-y-4">
              <div className="flex items-center justify-between">
                <div className="space-y-0.5">
                  <Label>Pagamenti Automatici</Label>
                  <p className="text-sm text-muted-foreground">
                    Abilita i pagamenti automatici delle commissioni
                  </p>
                </div>
                <Switch 
                  name="autoPayEnabled"
                  defaultChecked={currentSettings.autoPayEnabled}
                />
              </div>

              <Separator />

              <div className="grid gap-2">
                <Label htmlFor="paymentDelay">Ritardo Pagamento (giorni)</Label>
                <Input
                  id="paymentDelay"
                  name="paymentDelay"
                  type="number"
                  min="1"
                  max="90"
                  defaultValue={currentSettings.paymentDelay}
                  placeholder="30"
                />
                <p className="text-sm text-muted-foreground">
                  Giorni di attesa prima di processare il pagamento
                </p>
              </div>

              <div className="grid gap-2">
                <Label htmlFor="minimumAmount">Importo Minimo (€)</Label>
                <Input
                  id="minimumAmount"
                  name="minimumAmount"
                  type="number"
                  min="0.01"
                  step="0.01"
                  defaultValue={currentSettings.minimumAmount}
                  placeholder="1.00"
                />
                <p className="text-sm text-muted-foreground">
                  Importo minimo per processare un pagamento
                </p>
              </div>

              <div className="grid gap-2">
                <Label htmlFor="description">Descrizione Pagamento</Label>
                <Input
                  id="description"
                  name="description"
                  defaultValue={currentSettings.description}
                  placeholder="Descrizione che apparirà nei bonifici"
                />
              </div>

              <Button 
                type="submit" 
                variant="secondary" 
                className="w-full"
                disabled={updateBankingMutation.isPending}
              >
                {updateBankingMutation.isPending ? "Salvando..." : "Salva Configurazione"}
              </Button>
            </form>
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
              Test Sistema
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <p className="text-sm text-muted-foreground">
              Verifica che la configurazione sia corretta eseguendo un test del sistema di pagamento.
            </p>
            
            <Button 
              onClick={() => testPaymentMutation.mutate()}
              disabled={testPaymentMutation.isPending || !currentSettings.isConfigured}
              className="w-full"
            >
              {testPaymentMutation.isPending ? "Test in corso..." : "Testa Configurazione"}
            </Button>
          </CardContent>
        </Card>

        {/* Riepilogo commissioni */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Euro className="h-5 w-5" />
              Riepilogo Commissioni
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-2 gap-4 text-center">
              <div className="space-y-1">
                <div className="text-2xl font-bold text-green-600">€1.00</div>
                <div className="text-sm text-muted-foreground">Per abbonamento</div>
              </div>
              <div className="space-y-1">
                <div className="text-2xl font-bold text-blue-600">30</div>
                <div className="text-sm text-muted-foreground">Giorni di attesa</div>
              </div>
            </div>
            
            <Separator />
            
            <div className="text-sm text-muted-foreground">
              Le commissioni vengono pagate automaticamente 30 giorni dopo ogni abbonamento sponsorizzato, 
              a partire dal terzo abbonamento per ogni membro dello staff.
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}