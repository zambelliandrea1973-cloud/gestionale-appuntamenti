import { useTranslation } from 'react-i18next';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

const LANGUAGES = [
  { code: 'it', flag: '🇮🇹' },
  { code: 'en', flag: '🇬🇧' },
  { code: 'de', flag: '🇩🇪' },
  { code: 'fr', flag: '🇫🇷' },
  { code: 'es', flag: '🇪🇸' },
  { code: 'ru', flag: '🇷🇺' },
  { code: 'nl', flag: '🇳🇱' },
  { code: 'no', flag: '🇳🇴' },
  { code: 'ro', flag: '🇷🇴' },
  { code: 'hi', flag: '🇮🇳' },
];

export function LanguageSelector() {
  const { t, i18n } = useTranslation();

  const handleLanguageChange = (value: string) => {
    i18n.changeLanguage(value);
    localStorage.setItem('i18nextLng', value);
    fetch('/api/user/language', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ language: value }),
    }).catch(() => {});
  };

  const currentCode = i18n.language.split('-')[0];
  const currentLang = LANGUAGES.find(l => l.code === currentCode) ?? LANGUAGES[0];

  return (
    <div className="flex items-center">
      <Select value={currentCode} onValueChange={handleLanguageChange}>
        <SelectTrigger className="border-none bg-transparent hover:bg-primary-foreground/10 focus:ring-0 focus:ring-offset-0 pl-0 pr-1">
          <div className="flex items-center gap-1.5">
            <span className="text-lg leading-none">{currentLang.flag}</span>
            <span className="text-sm font-medium">{t(`language.${currentCode}`)}</span>
          </div>
        </SelectTrigger>
        <SelectContent>
          {LANGUAGES.map(({ code, flag }) => (
            <SelectItem key={code} value={code}>
              <span className="flex items-center gap-2">
                <span className="text-lg leading-none">{flag}</span>
                <span>{t(`language.${code}`)}</span>
              </span>
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
    </div>
  );
}
