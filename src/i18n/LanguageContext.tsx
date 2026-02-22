import { createContext, useContext, useState, useCallback, type ReactNode } from 'react';
import th from './th';
import en from './en';
import type { Translations } from './th';

type Language = 'th' | 'en';

const translations: Record<Language, Translations> = { th, en };

interface LanguageContextType {
    lang: Language;
    setLang: (lang: Language) => void;
    t: Translations;
    toggleLang: () => void;
}

const LanguageContext = createContext<LanguageContextType | null>(null);

export function LanguageProvider({ children }: { children: ReactNode }) {
    const [lang, setLangState] = useState<Language>(() => {
        const saved = localStorage.getItem('app_language');
        if (saved === 'th' || saved === 'en') return saved;
        // Detect browser language
        const browserLang = navigator.language.startsWith('th') ? 'th' : 'en';
        return browserLang;
    });

    const setLang = useCallback((newLang: Language) => {
        setLangState(newLang);
        localStorage.setItem('app_language', newLang);
    }, []);

    const toggleLang = useCallback(() => {
        setLangState(prev => {
            const next = prev === 'th' ? 'en' : 'th';
            localStorage.setItem('app_language', next);
            return next;
        });
    }, []);

    const value: LanguageContextType = {
        lang,
        setLang,
        t: translations[lang],
        toggleLang,
    };

    return (
        <LanguageContext.Provider value={value}>
            {children}
        </LanguageContext.Provider>
    );
}

export function useLanguage(): LanguageContextType {
    const ctx = useContext(LanguageContext);
    if (!ctx) {
        throw new Error('useLanguage must be used within a LanguageProvider');
    }
    return ctx;
}
