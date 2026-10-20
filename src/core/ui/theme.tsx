import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from 'react';

export type ThemeChoice = 'system' | 'light' | 'dark';
export type ResolvedTheme = 'light' | 'dark';

interface ThemeState {
  choice: ThemeChoice;
  resolved: ResolvedTheme;
  cycle: () => void;
}

const STORAGE_KEY = 'atlas-theme';
const ThemeContext = createContext<ThemeState | null>(null);

function readStored(): ThemeChoice {
  try {
    const v = localStorage.getItem(STORAGE_KEY);
    if (v === 'light' || v === 'dark') return v;
  } catch {
    /* storage unavailable */
  }
  return 'system';
}

function systemTheme(): ResolvedTheme {
  return window.matchMedia?.('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
}

export function ThemeProvider({ children }: { children: ReactNode }) {
  const [choice, setChoice] = useState<ThemeChoice>(readStored);
  const [system, setSystem] = useState<ResolvedTheme>(systemTheme);

  useEffect(() => {
    const mq = window.matchMedia?.('(prefers-color-scheme: dark)');
    if (!mq) return;
    const onChange = () => setSystem(mq.matches ? 'dark' : 'light');
    mq.addEventListener('change', onChange);
    return () => mq.removeEventListener('change', onChange);
  }, []);

  useEffect(() => {
    const root = document.documentElement;
    if (choice === 'system') delete root.dataset.theme;
    else root.dataset.theme = choice;
    try {
      if (choice === 'system') localStorage.removeItem(STORAGE_KEY);
      else localStorage.setItem(STORAGE_KEY, choice);
    } catch {
      /* storage unavailable */
    }
  }, [choice]);

  const cycle = useCallback(
    () => setChoice((c) => (c === 'system' ? 'light' : c === 'light' ? 'dark' : 'system')),
    [],
  );
  const value = useMemo(
    () => ({ choice, resolved: choice === 'system' ? system : choice, cycle }),
    [choice, system, cycle],
  );
  return <ThemeContext.Provider value={value}>{children}</ThemeContext.Provider>;
}

export function useTheme(): ThemeState {
  const t = useContext(ThemeContext);
  if (!t) throw new Error('useTheme outside ThemeProvider');
  return t;
}

/** Palette read from CSS custom properties, for canvas drawing. */
export interface Palette {
  bg: string;
  fg: string;
  muted: string;
  grid: string;
  axis: string;
  c1: string;
  c2: string;
  c3: string;
  c4: string;
}

export function readPalette(el: Element): Palette {
  const cs = getComputedStyle(el);
  const v = (name: string) => cs.getPropertyValue(name).trim();
  return {
    bg: v('--bg-sunk'),
    fg: v('--fg'),
    muted: v('--muted'),
    grid: v('--grid'),
    axis: v('--axis'),
    c1: v('--c1'),
    c2: v('--c2'),
    c3: v('--c3'),
    c4: v('--c4'),
  };
}
