import { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { useColorScheme } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';

const THEME_KEY = 'themeOverride';

export const lightTheme = {
  bg: '#F4F2EF',
  card: '#ffffff',
  text: '#1A1A1A',
  subText: '#888888',
  border: '#F0EDE8',
  inputBg: '#F8F6F3',
  tabBar: '#ffffff',
  headerBg: '#F4F2EF',
  accent: '#1B3FAB',
  chatBubbleThem: '#ffffff',
  chatBubbleThemText: '#1A1A1A',
  isDark: false,
};

export const darkTheme = {
  bg: '#111111',
  card: '#1E1E1E',
  text: '#F0EEE9',
  subText: '#9A9A9A',
  border: '#2A2A2A',
  inputBg: '#252525',
  tabBar: '#1E1E1E',
  headerBg: '#111111',
  accent: '#1B3FAB',
  chatBubbleThem: '#2A2A2A',
  chatBubbleThemText: '#F0EEE9',
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

  // Load saved preference on mount
  useEffect(() => {
    AsyncStorage.getItem(THEME_KEY).then(val => {
      if (val === 'light' || val === 'dark') setOverride(val);
    });
  }, []);

  const isDark = override ? override === 'dark' : systemScheme === 'dark';
  const theme = isDark ? darkTheme : lightTheme;

  const toggleTheme = async () => {
    const next = isDark ? 'light' : 'dark';
    setOverride(next);
    await AsyncStorage.setItem(THEME_KEY, next);
  };

  return (
    <ThemeContext.Provider value={{ theme, isDark, toggleTheme }}>
      {children}
    </ThemeContext.Provider>
  );
}

export function useTheme() {
  return useContext(ThemeContext);
}
