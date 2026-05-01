import { useEffect, useState, useCallback } from 'react';

export type Theme = 'dark' | 'light' | 'system';
export type AccentTheme = 'rose' | 'ocean' | 'amber' | 'emerald' | 'slate';

const STORAGE_KEY = 'flowa-theme';
const ACCENT_STORAGE_KEY = 'flowa-accent-theme';

type Palette = {
  label: string;
  preview: string;
  brand: {
    50: string;
    100: string;
    200: string;
    300: string;
    400: string;
    500: string;
    600: string;
    700: string;
    800: string;
    900: string;
  };
  accent: {
    400: string;
    500: string;
    600: string;
  };
};

const ACCENT_PALETTES: Record<AccentTheme, Palette> = {
  rose: {
    label: 'Rose',
    preview: '#F63049',
    brand: {
      50: '255 241 242',
      100: '255 228 230',
      200: '254 205 211',
      300: '253 164 175',
      400: '251 113 133',
      500: '246 48 73',
      600: '225 29 72',
      700: '190 18 60',
      800: '159 18 57',
      900: '136 19 55',
    },
    accent: {
      400: '34 211 238',
      500: '6 182 212',
      600: '8 145 178',
    },
  },
  ocean: {
    label: 'Ocean',
    preview: '#0EA5E9',
    brand: {
      50: '240 249 255',
      100: '224 242 254',
      200: '186 230 253',
      300: '125 211 252',
      400: '56 189 248',
      500: '14 165 233',
      600: '2 132 199',
      700: '3 105 161',
      800: '7 89 133',
      900: '12 74 110',
    },
    accent: {
      400: '167 139 250',
      500: '139 92 246',
      600: '124 58 237',
    },
  },
  amber: {
    label: 'Amber',
    preview: '#F59E0B',
    brand: {
      50: '255 251 235',
      100: '254 243 199',
      200: '253 230 138',
      300: '252 211 77',
      400: '251 191 36',
      500: '245 158 11',
      600: '217 119 6',
      700: '180 83 9',
      800: '146 64 14',
      900: '120 53 15',
    },
    accent: {
      400: '248 113 113',
      500: '239 68 68',
      600: '220 38 38',
    },
  },
  emerald: {
    label: 'Emerald',
    preview: '#10B981',
    brand: {
      50: '236 253 245',
      100: '209 250 229',
      200: '167 243 208',
      300: '110 231 183',
      400: '52 211 153',
      500: '16 185 129',
      600: '5 150 105',
      700: '4 120 87',
      800: '6 95 70',
      900: '6 78 59',
    },
    accent: {
      400: '56 189 248',
      500: '14 165 233',
      600: '2 132 199',
    },
  },
  slate: {
    label: 'Slate',
    preview: '#64748B',
    brand: {
      50: '248 250 252',
      100: '241 245 249',
      200: '226 232 240',
      300: '203 213 225',
      400: '148 163 184',
      500: '100 116 139',
      600: '71 85 105',
      700: '51 65 85',
      800: '30 41 59',
      900: '15 23 42',
    },
    accent: {
      400: '45 212 191',
      500: '20 184 166',
      600: '13 148 136',
    },
  },
};

function getSystemTheme(): 'dark' | 'light' {
  return window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
}

function applyTheme(theme: Theme) {
  const resolved = theme === 'system' ? getSystemTheme() : theme;
  const html = document.documentElement;
  if (resolved === 'dark') {
    html.classList.add('dark');
    html.classList.remove('light');
  } else {
    html.classList.remove('dark');
    html.classList.add('light');
  }
}

function applyAccent(accentTheme: AccentTheme) {
  const palette = ACCENT_PALETTES[accentTheme] ?? ACCENT_PALETTES.rose;
  const html = document.documentElement;

  html.style.setProperty('--brand-50-rgb', palette.brand[50]);
  html.style.setProperty('--brand-100-rgb', palette.brand[100]);
  html.style.setProperty('--brand-200-rgb', palette.brand[200]);
  html.style.setProperty('--brand-300-rgb', palette.brand[300]);
  html.style.setProperty('--brand-400-rgb', palette.brand[400]);
  html.style.setProperty('--brand-500-rgb', palette.brand[500]);
  html.style.setProperty('--brand-600-rgb', palette.brand[600]);
  html.style.setProperty('--brand-700-rgb', palette.brand[700]);
  html.style.setProperty('--brand-800-rgb', palette.brand[800]);
  html.style.setProperty('--brand-900-rgb', palette.brand[900]);

  html.style.setProperty('--accent-400-rgb', palette.accent[400]);
  html.style.setProperty('--accent-500-rgb', palette.accent[500]);
  html.style.setProperty('--accent-600-rgb', palette.accent[600]);
}

export function useTheme() {
  const [theme, setThemeState] = useState<Theme>(() => {
    const stored = localStorage.getItem(STORAGE_KEY) as Theme | null;
    return stored || 'light';
  });

  const setTheme = useCallback((t: Theme) => {
    setThemeState(t);
    localStorage.setItem(STORAGE_KEY, t);
    applyTheme(t);
  }, []);

  // Apply on mount
  useEffect(() => {
    applyTheme(theme);
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  // Listen for system theme changes when set to 'system'
  useEffect(() => {
    if (theme !== 'system') return;
    const mq = window.matchMedia('(prefers-color-scheme: dark)');
    const handler = () => applyTheme('system');
    mq.addEventListener('change', handler);
    return () => mq.removeEventListener('change', handler);
  }, [theme]);

  const resolvedTheme: 'dark' | 'light' = theme === 'system' ? getSystemTheme() : theme;

  return { theme, setTheme, resolvedTheme };
}

export function useAccentTheme() {
  const [accentTheme, setAccentThemeState] = useState<AccentTheme>(() => {
    const stored = localStorage.getItem(ACCENT_STORAGE_KEY) as AccentTheme | null;
    return stored || 'rose';
  });

  const setAccentTheme = useCallback((accent: AccentTheme) => {
    setAccentThemeState(accent);
    localStorage.setItem(ACCENT_STORAGE_KEY, accent);
    applyAccent(accent);
  }, []);

  useEffect(() => {
    applyAccent(accentTheme);
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  return {
    accentTheme,
    setAccentTheme,
    accentPalettes: ACCENT_PALETTES,
  };
}
