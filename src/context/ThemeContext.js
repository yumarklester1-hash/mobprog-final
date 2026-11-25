import React, { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { createTypography, darkColors, lightColors } from '../theme/theme';

const ThemeContext = createContext(null);
const THEME_STORAGE_KEY = 'dental-app-theme-mode';

export function ThemeProvider({ children }) {
  const [mode, setMode] = useState('light');
  const [ready, setReady] = useState(false);
  const [error, setError] = useState('');

  const loadMode = useCallback(async () => {
    setReady(false);
    setError('');
    try {
      const savedMode = await AsyncStorage.getItem(THEME_STORAGE_KEY);
      if (savedMode === 'dark' || savedMode === 'light') setMode(savedMode);
    } catch (loadError) {
      setError(loadError.message || 'Unable to load your display settings.');
    } finally {
      setReady(true);
    }
  }, []);

  useEffect(() => {
    loadMode();
  }, [loadMode]);

  const setThemeMode = useCallback(async (nextMode) => {
    await AsyncStorage.setItem(THEME_STORAGE_KEY, nextMode);
    setMode(nextMode);
    setError('');
  }, []);

  const palette = mode === 'dark' ? darkColors : lightColors;
  const value = useMemo(() => ({
    mode,
    colors: palette,
    typography: createTypography(palette),
    ready,
    error,
    retry: loadMode,
    setThemeMode,
  }), [mode, palette, ready, error, loadMode, setThemeMode]);

  return <ThemeContext.Provider value={value}>{children}</ThemeContext.Provider>;
}

export function useTheme() {
  const context = useContext(ThemeContext);
  if (!context) throw new Error('useTheme must be used inside ThemeProvider');
  return context;
}
