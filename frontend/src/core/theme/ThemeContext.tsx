import { createContext, useContext, useEffect, useState, ReactNode } from 'react';
import Cookies from 'js-cookie';

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
    // Try to get theme from cookie, then localStorage, then default
    const cookieTheme = Cookies.get('theme');
    if (cookieTheme === 'light' || cookieTheme === 'dark') {
      return cookieTheme;
    }
    
    if (typeof window !== 'undefined') {
      const localStorageTheme = window.localStorage.getItem('theme') as 'light' | 'dark' | null;
      if (localStorageTheme === 'light' || localStorageTheme === 'dark') {
        return localStorageTheme;
      }
    }
    
    return defaultTheme;
  });

  useEffect(() => {
    // Save theme to cookie and localStorage
    Cookies.set('theme', theme, { expires: 365 }); // 1 year
    if (typeof window !== 'undefined') {
      window.localStorage.setItem('theme', theme);
      // Apply theme class to document root
      document.documentElement.classList.remove('light', 'dark');
      document.documentElement.classList.add(theme);
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