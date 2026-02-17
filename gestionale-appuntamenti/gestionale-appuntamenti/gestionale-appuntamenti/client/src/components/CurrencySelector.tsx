import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useCurrency, SUPPORTED_CURRENCIES } from "@/hooks/use-currency";
import { useToast } from "@/hooks/use-toast";
import { DollarSign } from "lucide-react";

export default function CurrencySelector() {
  const { currency, symbol, updateCurrency, isUpdating } = useCurrency();
  const { toast } = useToast();

  const handleCurrencyChange = (newCurrencyCode: string) => {
    const selectedCurrency = SUPPORTED_CURRENCIES.find(c => c.code === newCurrencyCode);
    
    if (selectedCurrency) {
      updateCurrency(
        { currency: selectedCurrency.code, symbol: selectedCurrency.symbol },
        {
          onSuccess: () => {
            toast({
              title: "Valuta aggiornata",
              description: `Valuta impostata su ${selectedCurrency.name} (${selectedCurrency.symbol})`,
            });
          },
          onError: () => {
            toast({
              title: "Errore",
              description: "Impossibile aggiornare la valuta",
              variant: "destructive",
            });
          }
        }
      );
    }
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-2">
        <DollarSign className="h-5 w-5 text-muted-foreground" />
        <h3 className="text-lg font-medium">Valuta</h3>
      </div>
      
      <div className="space-y-3">
        <p className="text-sm text-muted-foreground">
          Seleziona la valuta che verrà utilizzata in tutto il programma per prezzi, fatture e report.
        </p>
        
        <div className="space-y-2">
          <Label htmlFor="currency-select">Valuta Corrente</Label>
          <Select
            value={currency}
            onValueChange={handleCurrencyChange}
            disabled={isUpdating}
          >
            <SelectTrigger id="currency-select" className="w-full md:w-[300px]">
              <SelectValue placeholder="Seleziona valuta" />
            </SelectTrigger>
            <SelectContent>
              {SUPPORTED_CURRENCIES.map((curr) => (
                <SelectItem key={curr.code} value={curr.code}>
                  <div className="flex items-center gap-2">
                    <span className="font-semibold">{curr.symbol}</span>
                    <span>{curr.name}</span>
                    <span className="text-muted-foreground text-xs">({curr.code})</span>
                  </div>
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          
          {currency && (
            <p className="text-sm text-muted-foreground">
              Simbolo attuale: <span className="font-semibold">{symbol}</span>
            </p>
          )}
        </div>
      </div>
    </div>
  );
}
