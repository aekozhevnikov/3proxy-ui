import { createContext, useContext, useEffect, useLayoutEffect, useState, ReactNode } from 'react';

interface ThemeContextType {
  theme: 'light' | 'dark';
  setTheme: (theme: 'light' | 'dark') => void;
  toggleTheme: () => void;
}

const ThemeContext = createContext<ThemeContextType | undefined>(undefined);

export function useTheme() {
  const context = useContext(ThemeContext);
  if (!context) {
    throw new Error('useTheme must be used within a ThemeProvider');
  }
  return context;
}

interface ThemeProviderProps {
  children: ReactNode;
  defaultTheme?: 'light' | 'dark';
}

export function ThemeProvider({ children, defaultTheme = 'dark' }: ThemeProviderProps) {
  const [theme, setThemeState] = useState<'light' | 'dark'>(() => {
    if (typeof window === 'undefined') return defaultTheme;
    
    // Match next-themes behavior: read from localStorage first
    const localStorageTheme = window.localStorage.getItem('theme') as 'light' | 'dark' | null;
    if (localStorageTheme === 'light' || localStorageTheme === 'dark') {
      return localStorageTheme;
    }
    
    return defaultTheme;
  });

  // Apply theme class synchronously to avoid flash (useLayoutEffect runs before paint)
  useLayoutEffect(() => {
    document.documentElement.classList.remove('light', 'dark');
    document.documentElement.classList.add(theme);
  }, [theme]);

  // Persist theme changes to localStorage (matching next-themes behavior)
  useEffect(() => {
    if (typeof window !== 'undefined') {
      window.localStorage.setItem('theme', theme);
    }
  }, [theme]);

  const setTheme = (newTheme: 'light' | 'dark') => {
    setThemeState(newTheme);
  };

  const toggleTheme = () => {
    setTheme(theme === 'light' ? 'dark' : 'light');
  };

  return (
    <ThemeContext.Provider value={{ theme, setTheme, toggleTheme }}>
      {children}
    </ThemeContext.Provider>
  );
}
