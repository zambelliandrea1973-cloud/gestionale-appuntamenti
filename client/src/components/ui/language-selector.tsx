import { useTranslation } from 'react-i18next';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Globe, ChevronDown } from 'lucide-react';

export function LanguageSelector() {
  const { t, i18n } = useTranslation();
  
  const handleLanguageChange = (value: string) => {
    i18n.changeLanguage(value);
    // Salva la lingua selezionata nel localStorage
    localStorage.setItem('i18nextLng', value);
  };

  // Funzione per ottenere il nome della lingua corrente
  const getCurrentLanguageName = () => {
    return t(`language.${i18n.language}`);
  };

  return (
    <div className="flex items-center">
      <Select
        value={i18n.language}
        onValueChange={handleLanguageChange}
      >
        <SelectTrigger className="border-none bg-transparent hover:bg-primary-foreground/10 focus:ring-0 focus:ring-offset-0 pl-0 pr-1">
          <div className="flex items-center gap-1">
            <Globe className="h-4 w-4" />
            <span className="text-sm font-medium">{getCurrentLanguageName()}</span>
            <ChevronDown className="h-3 w-3 opacity-50" />
          </div>
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="it">{t('language.it')}</SelectItem>
          <SelectItem value="en">{t('language.en')}</SelectItem>
          <SelectItem value="de">{t('language.de')}</SelectItem>
          <SelectItem value="fr">{t('language.fr')}</SelectItem>
          <SelectItem value="es">{t('language.es')}</SelectItem>
          <SelectItem value="ru">{t('language.ru')}</SelectItem>
          <SelectItem value="nl">{t('language.nl')}</SelectItem>
          <SelectItem value="no">{t('language.no')}</SelectItem>
          <SelectItem value="ro">{t('language.ro')}</SelectItem>
        </SelectContent>
      </Select>
    </div>
  );
}