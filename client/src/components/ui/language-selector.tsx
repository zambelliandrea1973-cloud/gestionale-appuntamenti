import { useTranslation } from 'react-i18next';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Globe } from 'lucide-react';

export function LanguageSelector() {
  const { t, i18n } = useTranslation();
  
  const handleLanguageChange = (value: string) => {
    i18n.changeLanguage(value);
    // Salva la lingua selezionata nel localStorage
    localStorage.setItem('i18nextLng', value);
  };

  return (
    <div className="flex items-center gap-2">
      <Globe className="h-4 w-4 text-muted-foreground" />
      <Select
        value={i18n.language}
        onValueChange={handleLanguageChange}
      >
        <SelectTrigger className="w-[160px]">
          <SelectValue placeholder={t('language.select')} />
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