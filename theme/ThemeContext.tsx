import { createContext, useContext, useState, ReactNode } from 'react';
import { useColorScheme } from 'react-native';

export const lightTheme = {
  bg: '#F4F2EF',
  card: '#fff',
  text: '#1A1A1A',
  subText: '#888',
  border: '#F0EDE8',
  inputBg: '#F8F6F3',
  tabBar: '#fff',
  headerBg: '#F4F2EF',
  accent: '#FF4F5A',
  isDark: false,
};

export const darkTheme = {
  bg: '#111111',
  card: '#1E1E1E',
  text: '#F4F2EF',
  subText: '#888',
  border: '#2A2A2A',
  inputBg: '#2A2A2A',
  tabBar: '#1E1E1E',
  headerBg: '#111111',
  accent: '#FF4F5A',
  isDark: true,
};

export type Theme = typeof lightTheme;

type ThemeContextType = {
  theme: Theme;
  isDark: boolean;
  toggleTheme: () => void;
};

const ThemeContext = createContext<ThemeContextType>({
  theme: lightTheme,
  isDark: false,
  toggleTheme: () => {},
});

export function ThemeProvider({ children }: { children: ReactNode }) {
  const systemScheme = useColorScheme();
  const [override, setOverride] = useState<'light' | 'dark' | null>(null);
  const isDark = override ? override === 'dark' : systemScheme === 'dark';
  const theme = isDark ? darkTheme : lightTheme;
  const toggleTheme = () => setOverride(prev =>
    prev === 'dark' ? 'light' : prev === 'light' ? 'dark' : isDark ? 'light' : 'dark'
  );
  return (
    <ThemeContext.Provider value={{ theme, isDark, toggleTheme }}>
      {children}
    </ThemeContext.Provider>
  );
}

export function useTheme() {
  return useContext(ThemeContext);
}
