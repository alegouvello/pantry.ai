import { useTranslation } from 'react-i18next';
import { Globe } from 'lucide-react';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Label } from '@/components/ui/label';

const languages = [
  { code: 'en', name: 'English', flag: '🇺🇸' },
  { code: 'es', name: 'Español', flag: '🇪🇸' },
  { code: 'fr', name: 'Français', flag: '🇫🇷' },
  { code: 'tr', name: 'Türkçe', flag: '🇹🇷' },
];

export function LanguageSelector() {
  const { i18n, t } = useTranslation();

  const handleLanguageChange = (value: string) => {
    i18n.changeLanguage(value);
    localStorage.setItem('i18nextLng', value);
  };

  const currentLanguage = languages.find(lang => lang.code === i18n.language) || languages[0];

  return (
    <div className="space-y-2">
      <Label className="flex items-center gap-2">
        <Globe className="h-4 w-4" />
        {t('settings.language')}
      </Label>
      <Select value={i18n.language} onValueChange={handleLanguageChange}>
        <SelectTrigger className="w-full">
          <SelectValue>
            <span className="flex items-center gap-2">
              <span>{currentLanguage.flag}</span>
              <span>{currentLanguage.name}</span>
            </span>
          </SelectValue>
        </SelectTrigger>
        <SelectContent className="bg-popover">
          {languages.map((lang) => (
            <SelectItem key={lang.code} value={lang.code}>
              <span className="flex items-center gap-2">
                <span>{lang.flag}</span>
                <span>{lang.name}</span>
              </span>
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
    </div>
  );
}
