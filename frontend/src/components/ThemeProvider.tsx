'use client';

import { createContext, useContext, useEffect, useState, ReactNode } from 'react';

type UserRole = 'admin' | 'distributor';

interface ThemeContextType {
  role: UserRole;
  setRole: (role: UserRole) => void;
}

const ThemeContext = createContext<ThemeContextType | undefined>(undefined);

// Rudra uses a single flat neutral (white/black) theme. No light/dark toggle.
export function ThemeProvider({ children, initialRole = 'admin' }: { children: ReactNode; initialRole?: UserRole }) {
  const [role, setRole] = useState<UserRole>(initialRole);

  useEffect(() => {
    const root = document.documentElement;
    root.setAttribute('data-theme', 'light');
    root.setAttribute('data-role', role);
  }, [role]);

  return (
    <ThemeContext.Provider value={{ role, setRole }}>
      {children}
    </ThemeContext.Provider>
  );
}

export function useTheme() {
  const context = useContext(ThemeContext);
  if (!context) throw new Error('useTheme must be used within ThemeProvider');
  return context;
}