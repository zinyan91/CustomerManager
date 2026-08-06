import React, { createContext, useContext, useEffect, useMemo, useState } from 'react';
import { LANG_STORAGE_KEY, loadLang, translate, type Lang, type TranslationKey } from '../lib/i18n';

interface LanguageContextType {
  lang: Lang;
  setLang: (lang: Lang) => void;
  t: (key: TranslationKey, vars?: Record<string, string | number>) => string;
}

const LanguageContext = createContext<LanguageContextType | undefined>(undefined);

export const LanguageProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [lang, setLangState] = useState<Lang>(() => loadLang());

  useEffect(() => {
    localStorage.setItem(LANG_STORAGE_KEY, lang);
    document.documentElement.lang = lang;
  }, [lang]);

  const value = useMemo<LanguageContextType>(() => ({
    lang,
    setLang: setLangState,
    t: (key, vars) => translate(lang, key, vars),
  }), [lang]);

  return <LanguageContext.Provider value={value}>{children}</LanguageContext.Provider>;
};

export const useLang = () => {
  const context = useContext(LanguageContext);
  if (!context) {
    throw new Error('useLang must be used within a LanguageProvider');
  }
  return context;
};
