import { useTranslation } from "react-i18next";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useCurrency, SUPPORTED_CURRENCIES } from "@/hooks/use-currency";
import { useToast } from "@/hooks/use-toast";
import { DollarSign } from "lucide-react";

export default function CurrencySelector() {
  const { t } = useTranslation();
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
              title: t('i18nFinale.currencySelector.currencyUpdatedTitle'),
              description: t('i18nFinale.currencySelector.currencySetTo', { name: selectedCurrency.name, symbol: selectedCurrency.symbol }),
            });
          },
          onError: () => {
            toast({
              title: t('common.error'),
              description: t('i18nFinale.currencySelector.updateError'),
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
        <h3 className="text-lg font-medium">{t('i18nFinale.currencySelector.currencyHeading')}</h3>
      </div>
      
      <div className="space-y-3">
        <p className="text-sm text-muted-foreground">
          {t('i18nFinale.currencySelector.selectDescription')}
        </p>
        
        <div className="space-y-2">
          <Label htmlFor="currency-select">{t('i18nFinale.currencySelector.currentCurrencyLabel')}</Label>
          <Select
            value={currency}
            onValueChange={handleCurrencyChange}
            disabled={isUpdating}
          >
            <SelectTrigger id="currency-select" className="w-full md:w-[300px]">
              <SelectValue placeholder={t('i18nFinale.currencySelector.selectCurrency')} />
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
              {t('i18nFinale.currencySelector.currentSymbolLabel')} <span className="font-semibold">{symbol}</span>
            </p>
          )}
        </div>
      </div>
    </div>
  );
}
