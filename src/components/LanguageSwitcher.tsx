
import { useTranslation } from '@/context/LanguageContext';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Languages } from 'lucide-react';

const LanguageSwitcher = () => {
  const { language, setLanguage, t } = useTranslation();

  const onLangChange = (lang: string) => {
    setLanguage(lang as 'ar' | 'en' | 'ku');
  };

  return (
    <div className="flex items-center gap-2">
      <Languages className="h-5 w-5 text-amber-700" />
      <Select onValueChange={onLangChange} defaultValue={language}>
        <SelectTrigger className="w-[180px] border-amber-300 bg-transparent focus:border-amber-500">
          <SelectValue placeholder={t('language')} />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="ar">العربية</SelectItem>
          <SelectItem value="en">English</SelectItem>
          <SelectItem value="ku">کوردی (سۆرانی)</SelectItem>
        </SelectContent>
      </Select>
    </div>
  );
};

export default LanguageSwitcher;
