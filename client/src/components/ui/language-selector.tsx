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
    localStorage.setItem('i18nextLng', value);
    // Persist language preference to the server (fire-and-forget)
    fetch('/api/user/language', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ language: value }),
    }).catch(() => {
      // Silent fail — localStorage already stores the preference
    });
  };

  const getCurrentLanguageName = () => {
    const langCode = i18n.language.split('-')[0];
    return t(`language.${langCode}`);
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
          <SelectItem value="hi">{t('language.hi')}</SelectItem>
        </SelectContent>
      </Select>
    </div>
  );
}
