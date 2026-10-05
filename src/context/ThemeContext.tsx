import React, { createContext, useContext, useState, useEffect } from 'react';

export type Theme = 'light' | 'dark';
export type AccentColor = 'emerald' | 'indigo' | 'blue' | 'purple' | 'rose' | 'amber';

export interface AccentConfig {
  id: AccentColor;
  name: string;
  dotColor: string;
  primaryBg: string;
  primaryHoverBg: string;
  primaryText: string;
  primaryBorder: string;
  bubbleGradient: string;
  badgeBg: string;
  ringFocus: string;
}

export const ALL_ACCENTS: AccentConfig[] = [
  {
    id: 'emerald',
    name: 'Emerald Green',
    dotColor: '#10b981',
    primaryBg: 'bg-emerald-600',
    primaryHoverBg: 'hover:bg-emerald-500',
    primaryText: 'text-emerald-600 dark:text-emerald-400',
    primaryBorder: 'border-emerald-500',
    bubbleGradient: 'bg-gradient-to-tr from-emerald-600 to-teal-500',
    badgeBg: 'bg-emerald-500/15 text-emerald-400 border-emerald-500/30',
    ringFocus: 'focus:ring-emerald-500'
  },
  {
    id: 'indigo',
    name: 'Royal Indigo',
    dotColor: '#6366f1',
    primaryBg: 'bg-indigo-600',
    primaryHoverBg: 'hover:bg-indigo-500',
    primaryText: 'text-indigo-600 dark:text-indigo-400',
    primaryBorder: 'border-indigo-500',
    bubbleGradient: 'bg-gradient-to-tr from-indigo-600 to-violet-500',
    badgeBg: 'bg-indigo-500/15 text-indigo-400 border-indigo-500/30',
    ringFocus: 'focus:ring-indigo-500'
  },
  {
    id: 'blue',
    name: 'Ocean Blue',
    dotColor: '#0284c7',
    primaryBg: 'bg-sky-600',
    primaryHoverBg: 'hover:bg-sky-500',
    primaryText: 'text-sky-600 dark:text-sky-400',
    primaryBorder: 'border-sky-500',
    bubbleGradient: 'bg-gradient-to-tr from-sky-600 to-blue-500',
    badgeBg: 'bg-sky-500/15 text-sky-400 border-sky-500/30',
    ringFocus: 'focus:ring-sky-500'
  },
  {
    id: 'purple',
    name: 'Neon Violet',
    dotColor: '#a855f7',
    primaryBg: 'bg-purple-600',
    primaryHoverBg: 'hover:bg-purple-500',
    primaryText: 'text-purple-600 dark:text-purple-400',
    primaryBorder: 'border-purple-500',
    bubbleGradient: 'bg-gradient-to-tr from-purple-600 to-fuchsia-500',
    badgeBg: 'bg-purple-500/15 text-purple-400 border-purple-500/30',
    ringFocus: 'focus:ring-purple-500'
  },
  {
    id: 'rose',
    name: 'Crimson Rose',
    dotColor: '#f43f5e',
    primaryBg: 'bg-rose-600',
    primaryHoverBg: 'hover:bg-rose-500',
    primaryText: 'text-rose-600 dark:text-rose-400',
    primaryBorder: 'border-rose-500',
    bubbleGradient: 'bg-gradient-to-tr from-rose-600 to-pink-500',
    badgeBg: 'bg-rose-500/15 text-rose-400 border-rose-500/30',
    ringFocus: 'focus:ring-rose-500'
  },
  {
    id: 'amber',
    name: 'Sunset Amber',
    dotColor: '#f59e0b',
    primaryBg: 'bg-amber-600',
    primaryHoverBg: 'hover:bg-amber-500',
    primaryText: 'text-amber-600 dark:text-amber-400',
    primaryBorder: 'border-amber-500',
    bubbleGradient: 'bg-gradient-to-tr from-amber-600 to-orange-500',
    badgeBg: 'bg-amber-500/15 text-amber-400 border-amber-500/30',
    ringFocus: 'focus:ring-amber-500'
  }
];

interface ThemeContextType {
  theme: Theme;
  isDayMode: boolean;
  toggleTheme: () => void;
  setTheme: (theme: Theme) => void;
  accent: AccentColor;
  setAccent: (accent: AccentColor) => void;
  accentConfig: AccentConfig;
  allAccents: AccentConfig[];
}

const defaultAccentConfig = ALL_ACCENTS[0];

const ThemeContext = createContext<ThemeContextType>({
  theme: 'dark',
  isDayMode: false,
  toggleTheme: () => {},
  setTheme: () => {},
  accent: 'emerald',
  setAccent: () => {},
  accentConfig: defaultAccentConfig,
  allAccents: ALL_ACCENTS
});

export const ThemeProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [theme, setThemeState] = useState<Theme>(() => {
    try {
      const saved = localStorage.getItem('qchat_theme');
      if (saved === 'light' || saved === 'dark') return saved;
    } catch {
      // ignore
    }
    return 'dark'; // Night mode is the default mode
  });

  const [accent, setAccentState] = useState<AccentColor>(() => {
    try {
      const saved = localStorage.getItem('qchat_accent_color');
      if (ALL_ACCENTS.some((a) => a.id === saved)) return saved as AccentColor;
    } catch {
      // ignore
    }
    return 'emerald'; // Fresh recognizable colorful accent
  });

  const setTheme = (newTheme: Theme) => {
    setThemeState(newTheme);
    try {
      localStorage.setItem('qchat_theme', newTheme);
    } catch {
      // ignore
    }
  };

  const setAccent = (newAccent: AccentColor) => {
    setAccentState(newAccent);
    try {
      localStorage.setItem('qchat_accent_color', newAccent);
    } catch {
      // ignore
    }
  };

  const toggleTheme = () => {
    setTheme(theme === 'dark' ? 'light' : 'dark');
  };

  useEffect(() => {
    document.documentElement.setAttribute('data-theme', theme);
    document.documentElement.setAttribute('data-accent', accent);

    if (theme === 'light') {
      document.documentElement.classList.add('theme-light');
      document.documentElement.classList.remove('theme-dark', 'dark');
      document.body.style.backgroundColor = '#F1FAF5';
      document.body.style.color = '#0f172a';
    } else {
      document.documentElement.classList.add('theme-dark', 'dark');
      document.documentElement.classList.remove('theme-light');
      document.body.style.backgroundColor = '#020617';
      document.body.style.color = '#f8fafc';
    }
  }, [theme, accent]);

  const isDayMode = theme === 'light';
  const accentConfig = ALL_ACCENTS.find((a) => a.id === accent) || defaultAccentConfig;

  return (
    <ThemeContext.Provider
      value={{
        theme,
        isDayMode,
        toggleTheme,
        setTheme,
        accent,
        setAccent,
        accentConfig,
        allAccents: ALL_ACCENTS
      }}
    >
      {children}
    </ThemeContext.Provider>
  );
};

export const useTheme = () => useContext(ThemeContext);
