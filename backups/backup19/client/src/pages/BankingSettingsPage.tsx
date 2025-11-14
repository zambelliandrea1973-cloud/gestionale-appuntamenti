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
  console.log('✅ ✅ ✅ NUOVO CODICE BANKING CARICATO! V3.0 - BUG FIXED ✅ ✅ ✅');
  
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
      console.log('🏦 [MUTATION] Invio POST a /api/admin/banking-settings');
      console.log('🏦 [MUTATION] Dati:', settings);
      const response = await apiRequest("POST", "/api/admin/banking-settings", settings);
      return response.json();
    },
    onSuccess: () => {
      console.log('🏦 [MUTATION] Salvataggio completato con successo!');
      toast({
        title: "Impostazioni salvate",
        description: "Le impostazioni bancarie sono state aggiornate con successo",
      });
      queryClient.invalidateQueries({ queryKey: ['/api/admin/banking-settings'] });
    },
    onError: (error) => {
      console.error('🏦 [MUTATION] Errore salvataggio:', error);
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

  // Aggiorna un singolo campo
  const updateField = (field: keyof BankingSettings, value: any) => {
    setSettings(prev => prev ? { ...prev, [field]: value } : null);
  };

  // Salva tutte le impostazioni
  const handleSaveSettings = () => {
    console.log('🏦 [BANKING] Salvataggio chiamato!');
    console.log('🏦 [BANKING] Dati da salvare:', settings);
    
    if (!settings) {
      console.error('❌ [BANKING] Nessun dato da salvare');
      return;
    }

    updateBankingMutation.mutate(settings);
  };

  if (isLoading || !settings) {
    return (
      <div className="container mx-auto py-6">
        <div className="text-center">Caricamento impostazioni bancarie...</div>
      </div>
    );
  }

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
            variant={settings.isConfigured ? "default" : "secondary"}
            className="flex items-center gap-1"
          >
            {settings.isConfigured ? (
              <CheckCircle className="h-3 w-3" />
            ) : (
              <AlertCircle className="h-3 w-3" />
            )}
            {settings.isConfigured ? "Configurato" : "Non configurato"}
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
            <form onSubmit={(e) => { e.preventDefault(); handleSaveSettings(); }} className="space-y-4">
              <div className="grid gap-2">
                <Label htmlFor="bankName">Nome Banca</Label>
                <Input
                  id="bankName"
                  value={settings.bankName}
                  onChange={(e) => updateField('bankName', e.target.value)}
                  placeholder="es. Intesa Sanpaolo"
                  autoComplete="off"
                />
              </div>

              <div className="grid gap-2">
                <Label htmlFor="accountHolder">Intestatario Conto</Label>
                <Input
                  id="accountHolder"
                  value={settings.accountHolder}
                  onChange={(e) => updateField('accountHolder', e.target.value)}
                  placeholder="Nome e Cognome / Ragione Sociale"
                  autoComplete="off"
                />
              </div>

              <div className="grid gap-2">
                <Label htmlFor="iban">IBAN</Label>
                <Input
                  id="iban"
                  type="text"
                  value={settings.iban}
                  onChange={(e) => updateField('iban', e.target.value)}
                  placeholder="IT60 X054 2811 1010 0000 0123 456"
                  autoComplete="off"
                />
              </div>

              <div className="grid gap-2">
                <Label htmlFor="bic">BIC/SWIFT</Label>
                <Input
                  id="bic"
                  value={settings.bic}
                  onChange={(e) => updateField('bic', e.target.value)}
                  placeholder="es. BCITITMM"
                  autoComplete="off"
                />
              </div>

              <div className="grid gap-2">
                <Label htmlFor="address">Indirizzo</Label>
                <Textarea
                  id="address"
                  value={settings.address}
                  onChange={(e) => updateField('address', e.target.value)}
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
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <div className="space-y-0.5">
                  <Label>Pagamenti Automatici</Label>
                  <p className="text-sm text-muted-foreground">
                    Abilita i pagamenti automatici delle commissioni
                  </p>
                </div>
                <Switch 
                  checked={settings.autoPayEnabled}
                  onCheckedChange={(checked) => updateField('autoPayEnabled', checked)}
                />
              </div>

              <Separator />

              <div className="grid gap-2">
                <Label htmlFor="paymentDelay">Ritardo Pagamento (giorni)</Label>
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
                  Giorni di attesa prima di processare il pagamento
                </p>
              </div>

              <div className="grid gap-2">
                <Label htmlFor="minimumAmount">Importo Minimo ({symbol})</Label>
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
                  Importo minimo per processare un pagamento
                </p>
              </div>

              <div className="grid gap-2">
                <Label htmlFor="description">Descrizione Pagamento</Label>
                <Input
                  id="description"
                  value={settings.description}
                  onChange={(e) => updateField('description', e.target.value)}
                  placeholder="Descrizione che apparirà nei bonifici"
                />
              </div>

              <Button 
                type="button"
                onClick={handleSaveSettings}
                variant="secondary" 
                className="w-full"
                disabled={updateBankingMutation.isPending}
              >
                {updateBankingMutation.isPending ? "Salvando..." : "Salva Configurazione"}
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
              Test Sistema
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <p className="text-sm text-muted-foreground">
              Verifica che la configurazione sia corretta eseguendo un test del sistema di pagamento.
            </p>
            
            <Button 
              onClick={() => testPaymentMutation.mutate()}
              disabled={testPaymentMutation.isPending || !settings.isConfigured}
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
                <div className="text-2xl font-bold text-green-600">{symbol}1.00</div>
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