import { createContext, useState, useContext, useEffect, ReactNode } from 'react';
import ar from '@/locales/ar.json';
import en from '@/locales/en.json';
import ku from '@/locales/ku.json';

const translations = { ar, en, ku };

type Language = 'ar' | 'en' | 'ku';

interface LanguageContextType {
  language: Language;
  setLanguage: (lang: Language) => void;
  t: (key: string, replacements?: { [key: string]: string | number }) => string;
  dir: 'ltr' | 'rtl';
}

const LanguageContext = createContext<LanguageContextType | undefined>(undefined);

export const LanguageProvider = ({ children }: { children: ReactNode }) => {
  const [language, setLanguageState] = useState<Language>(() => {
    return (localStorage.getItem('language') as Language) || 'ar';
  });

  const dir = language === 'ar' || language === 'ku' ? 'rtl' : 'ltr';

  useEffect(() => {
    localStorage.setItem('language', language);
    document.documentElement.lang = language;
    document.documentElement.dir = dir;
  }, [language, dir]);

  const setLanguage = (lang: Language) => {
    setLanguageState(lang);
  };

  const t = (key: string, replacements: { [key: string]: string | number } = {}): string => {
    // eslint-disable-next-line @typescript-eslint/ban-ts-comment
    // @ts-ignore
    let translation = translations[language][key] || key;
    Object.keys(replacements).forEach(placeholder => {
      const regex = new RegExp(`\\{${placeholder}\\}`, 'g');
      translation = translation.replace(regex, String(replacements[placeholder]));
    });
    return translation;
  };

  return (
    <LanguageContext.Provider value={{ language, setLanguage, t, dir }}>
      {children}
    </LanguageContext.Provider>
  );
};

export const useTranslation = () => {
  const context = useContext(LanguageContext);
  if (!context) {
    throw new Error('useTranslation must be used within a LanguageProvider');
  }
  return context;
};
