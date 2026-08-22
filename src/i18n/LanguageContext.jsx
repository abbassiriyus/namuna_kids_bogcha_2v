'use client';

import { createContext, useContext, useCallback, useEffect, useMemo, useState } from 'react';
import { DEFAULT_LANG, getText, markHydrated, readStoredLanguage } from './translations';

const LanguageContext = createContext(null);

export const LANGUAGES = ['uz', 'ru', 'en'];

/**
 * Butun ilova uchun til holati.
 *
 * Ikki muammoni hal qiladi:
 *
 * 1) Til o'zgarganda faqat o'z holatini yangilagan komponent qayta tarjima
 *    bo'lardi (avval faqat Sidebar). Bu yerda `key={lang}` orqali butun daraxt
 *    qayta render qilinadi — sahifalar, modallar va jadval sarlavhalari ham
 *    darhol yangi tilga o'tadi, sahifani yangilash shart emas.
 *
 * 2) Hydration mos kelmasligi: server DEFAULT_LANG bilan render qiladi, client
 *    esa localStorage'dagi tilni o'qib boshqa matn chizardi. Shu sababli til
 *    faqat mount bo'lgandan keyin (markHydrated bilan) yoqiladi — birinchi
 *    client render serverdagi HTML bilan aynan bir xil bo'ladi.
 */
export function LanguageProvider({ children }) {
  const [lang, setLangState] = useState(DEFAULT_LANG);

  useEffect(() => {
    markHydrated();
    const saved = readStoredLanguage();
    if (typeof document !== 'undefined') document.documentElement.lang = saved;
    // Saqlangan til boshqacha bo'lsa, `key` o'zgarib daraxt qayta chiziladi.
    setLangState(saved);
  }, []);

  const setLang = useCallback((next) => {
    if (!LANGUAGES.includes(next)) return;
    if (typeof window !== 'undefined') {
      localStorage.setItem('app_lang', next);
      document.documentElement.lang = next;
    }
    setLangState(next);
  }, []);

  const toggleLang = useCallback(() => {
    setLang(LANGUAGES[(LANGUAGES.indexOf(lang) + 1) % LANGUAGES.length]);
  }, [lang, setLang]);

  const value = useMemo(
    () => ({ lang, setLang, toggleLang, t: (key) => getText(key, lang) }),
    [lang, setLang, toggleLang]
  );

  return (
    <LanguageContext.Provider value={value}>
      <div key={lang} style={{ display: 'contents' }}>{children}</div>
    </LanguageContext.Provider>
  );
}

/** Komponentlarda: const { t, lang, toggleLang } = useLang(); */
export function useLang() {
  const ctx = useContext(LanguageContext);
  // Provider'siz ishlatilsa ham buzilmasin (masalan alohida test/render).
  if (!ctx) {
    return {
      lang: DEFAULT_LANG,
      setLang: () => {},
      toggleLang: () => {},
      t: (key) => getText(key, DEFAULT_LANG),
    };
  }
  return ctx;
}
