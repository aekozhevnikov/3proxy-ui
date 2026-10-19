import { HerouiProvider } from '@heroui/react';
import { ThemeProvider } from 'next-themes';
import { ReactNode } from 'react';

export function Providers({ children }: { children: ReactNode }) {
  return (
    <HerouiProvider>
      <ThemeProvider attribute="class" defaultTheme="system" enableSystem>
        {children}
      </ThemeProvider>
    </HerouiProvider>
  );
}
