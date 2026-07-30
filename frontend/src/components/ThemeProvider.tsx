'use client';

import { createContext, useContext, useEffect, useState, ReactNode } from 'react';
import { Sun, Moon } from 'lucide-react';

type ThemeMode = 'light' | 'dark';
type UserRole = 'admin' | 'distributor';

interface ThemeContextType {
  mode: ThemeMode;
  role: UserRole;
  toggleMode: () => void;
  setRole: (role: UserRole) => void;
}

const ThemeContext = createContext<ThemeContextType | undefined>(undefined);

export function ThemeProvider({ children, initialRole = 'admin' }: { children: ReactNode; initialRole?: UserRole }) {
  const [mode, setMode] = useState<ThemeMode>(() => {
    if (typeof window !== 'undefined') {
      return (localStorage.getItem('theme_mode') as ThemeMode) || 'light';
    }
    return 'light';
  });
  const [role, setRole] = useState<UserRole>(initialRole);

  useEffect(() => {
    const root = document.documentElement;
    root.setAttribute('data-theme', mode);
    root.setAttribute('data-role', role);
    localStorage.setItem('theme_mode', mode);
  }, [mode, role]);

  const toggleMode = () => setMode(prev => prev === 'light' ? 'dark' : 'light');

  return (
    <ThemeContext.Provider value={{ mode, role, toggleMode, setRole }}>
      {children}
    </ThemeContext.Provider>
  );
}

export function useTheme() {
  const context = useContext(ThemeContext);
  if (!context) throw new Error('useTheme must be used within ThemeProvider');
  return context;
}

export function ThemeToggle() {
  const { mode, toggleMode, role } = useTheme();

  return (
    <button
      onClick={toggleMode}
      className="theme-toggle-btn"
      aria-label={mode === 'light' ? 'Switch to dark mode' : 'Switch to light mode'}
      title={mode === 'light' ? 'Dark Mode' : 'Light Mode'}
    >
      {mode === 'light' ? <Moon size={14} /> : <Sun size={14} />}
      <span className="hidden sm:inline">{mode === 'light' ? 'Dark' : 'Light'}</span>
    </button>
  );
}