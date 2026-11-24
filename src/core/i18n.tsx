import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from 'react';
import type { TopicMeta } from './topic';

/** Site languages. Turkish is the source language; German covers the site chrome and topic titles/summaries/tags. */
export type Lang = 'tr' | 'de';
export const LANGS: readonly Lang[] = ['tr', 'de'];

const STORAGE_KEY = 'atlas-lang';

function readStored(): Lang {
  try {
    const v = localStorage.getItem(STORAGE_KEY);
    if (v === 'tr' || v === 'de') return v;
  } catch {
    /* storage unavailable */
  }
  return 'tr';
}

interface LangState {
  lang: Lang;
  setLang: (l: Lang) => void;
}
const LangContext = createContext<LangState | null>(null);

export function LangProvider({ children }: { children: ReactNode }) {
  const [lang, setLangState] = useState<Lang>(readStored);

  useEffect(() => {
    document.documentElement.lang = lang;
  }, [lang]);

  const setLang = useCallback((l: Lang) => {
    setLangState(l);
    try {
      localStorage.setItem(STORAGE_KEY, l);
    } catch {
      /* storage unavailable */
    }
  }, []);

  const value = useMemo(() => ({ lang, setLang }), [lang, setLang]);
  return <LangContext.Provider value={value}>{children}</LangContext.Provider>;
}

export function useLang(): LangState {
  const ctx = useContext(LangContext);
  if (!ctx) throw new Error('useLang must be used inside <LangProvider>');
  return ctx;
}

/** Pick the string for the current language from a { tr, de } pair. */
export function pick<T>(lang: Lang, v: Record<Lang, T>): T {
  return v[lang];
}

/** Title, summary and tags of a topic in the given language (falls back to Turkish). */
export function localMeta(meta: TopicMeta, lang: Lang): Pick<TopicMeta, 'title' | 'summary' | 'tags'> {
  if (lang === 'de' && meta.de) return { title: meta.de.title, summary: meta.de.summary, tags: meta.de.tags ?? meta.tags };
  return { title: meta.title, summary: meta.summary, tags: meta.tags };
}

/** UI strings of the site chrome. */
export const UI = {
  themePrefix: { tr: 'Tema:', de: 'Design:' },
  theme: {
    tr: { system: 'sistem', light: 'açık', dark: 'koyu' },
    de: { system: 'System', light: 'hell', dark: 'dunkel' },
  },
  themeTitle: { tr: 'Temayı değiştir', de: 'Design wechseln' },
  langTitle: { tr: 'Dil', de: 'Sprache' },
  footer: {
    tr: 'MIT lisanslı · Statik site, sunucu yok · Kaynak kodu GitHub’da',
    de: 'MIT-Lizenz · Statische Seite, kein Server · Quellcode auf GitHub',
  },
  heroTitle: { tr: 'Mühendislik matematiğini elinle oyna', de: 'Ingenieurmathematik zum Anfassen' },
  heroText: {
    tr: 'Her konu aynı sırayı izler: kısa sezgi, etkileşimli görsel, ilk prensiplerden adım adım türetme ve yorum. Bir konu seç.',
    de: 'Jedes Thema folgt demselben Ablauf: kurze Intuition, interaktive Grafik, schrittweise Herleitung aus den Grundprinzipien und Einordnung. Wähle ein Thema.',
  },
  search: { tr: 'Konu ara…', de: 'Thema suchen…' },
  searchLabel: { tr: 'Konu ara', de: 'Thema suchen' },
  noMatch: { tr: 'Eşleşen konu yok.', de: 'Kein passendes Thema.' },
  soon: { tr: 'Yakında', de: 'Demnächst' },
  roadmap: {
    tr: ['Kalman filtresi', 'Fourier / spektrum', 'Park / Clarke dönüşümü', 'Matris üstel ve durum uzayı', 'NVH spektral analiz'],
    de: ['Kalman-Filter', 'Fourier / Spektrum', 'Park- / Clarke-Transformation', 'Matrixexponential und Zustandsraum', 'NVH-Spektralanalyse'],
  },
  back: { tr: '← Tüm konular', de: '← Alle Themen' },
  notFound: { tr: 'Konu bulunamadı.', de: 'Thema nicht gefunden.' },
  home: { tr: 'Ana sayfaya dön', de: 'Zur Startseite' },
  loading: { tr: 'Yükleniyor…', de: 'Wird geladen…' },
  loadError: { tr: 'Konu yüklenemedi:', de: 'Thema konnte nicht geladen werden:' },
  sectionsLabel: { tr: 'Bölümler', de: 'Abschnitte' },
  sections: {
    tr: { sezgi: 'Sezgi', etkilesim: 'Etkileşimli görsel', turetme: 'Adım adım türetme', yorum: 'Yorum ve genelleme' },
    de: { sezgi: 'Intuition', etkilesim: 'Interaktive Grafik', turetme: 'Schrittweise Herleitung', yorum: 'Einordnung und Verallgemeinerung' },
  },
  contentNote: {
    tr: '',
    de: 'Hinweis: Die Inhalte dieses Themas sind bisher nur auf Türkisch.',
  },
} as const;
