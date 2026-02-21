import React, { createContext, useContext, useState, useEffect } from 'react';

export interface Theme {
  bg: string;
  surface: string;
  surfaceHover: string;
  surfaceActive: string;
  text: string;
  textSecondary: string;
  textMuted: string;
  border: string;
  shadow: string;
  shadowHeavy: string;
  canvasBg: string;
  accent: string;
  accentHover: string;
  kbd: string;
  kbdBorder: string;
  inputBg: string;
  toastBg: string;
  toastText: string;
}

const lightTheme: Theme = {
  bg: '#f9fafb',
  surface: '#ffffff',
  surfaceHover: '#f3f4f6',
  surfaceActive: '#ede9fe',
  text: '#1f2937',
  textSecondary: '#4b5563',
  textMuted: '#9ca3af',
  border: '#e5e7eb',
  shadow: '0 2px 8px rgba(0,0,0,0.1)',
  shadowHeavy: '0 4px 20px rgba(0,0,0,0.15)',
  canvasBg: '#f9fafb',
  accent: '#667eea',
  accentHover: '#5a6fd6',
  kbd: '#f3f4f6',
  kbdBorder: '#d1d5db',
  inputBg: 'transparent',
  toastBg: '#1f2937',
  toastText: '#ffffff',
};

const darkTheme: Theme = {
  bg: '#0f172a',
  surface: '#1e293b',
  surfaceHover: '#334155',
  surfaceActive: '#312e81',
  text: '#f1f5f9',
  textSecondary: '#cbd5e1',
  textMuted: '#64748b',
  border: '#334155',
  shadow: '0 2px 8px rgba(0,0,0,0.3)',
  shadowHeavy: '0 4px 20px rgba(0,0,0,0.4)',
  canvasBg: '#0f172a',
  accent: '#818cf8',
  accentHover: '#6366f1',
  kbd: '#334155',
  kbdBorder: '#475569',
  inputBg: '#0f172a',
  toastBg: '#f1f5f9',
  toastText: '#0f172a',
};

interface ThemeContextType {
  theme: Theme;
  isDark: boolean;
  toggleTheme: () => void;
}

const ThemeContext = createContext<ThemeContextType>({
  theme: lightTheme,
  isDark: false,
  toggleTheme: () => {},
});

export const useTheme = () => useContext(ThemeContext);

export const ThemeProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [isDark, setIsDark] = useState(() => {
    try {
      return localStorage.getItem('whiteboard-theme') === 'dark';
    } catch {
      return false;
    }
  });

  useEffect(() => {
    try {
      localStorage.setItem('whiteboard-theme', isDark ? 'dark' : 'light');
    } catch {}
  }, [isDark]);

  const toggleTheme = () => setIsDark((prev) => !prev);

  return (
    <ThemeContext.Provider value={{ theme: isDark ? darkTheme : lightTheme, isDark, toggleTheme }}>
      {children}
    </ThemeContext.Provider>
  );
};
