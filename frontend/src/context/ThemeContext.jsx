import React, { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';

/*
 * SkillGO theme controller.
 *
 * Resolves the active theme on first mount in this priority order:
 *   1. An explicit choice the user made previously (localStorage).
 *   2. The operating-system / browser preference (prefers-color-scheme).
 *   3. A safe "light" fallback.
 *
 * The resolved theme is reflected onto <html> as the `dark` class so every
 * Tailwind `dark:` variant and the neomorphic dark surfaces activate together.
 * The preference is persisted so the choice survives reloads and new tabs.
 */

const STORAGE_KEY = 'skillgo-theme';
const LIGHT = 'light';
const DARK = 'dark';

const ThemeContext = createContext(null);

function readStoredPreference() {
  if (typeof window === 'undefined') {
    return null;
  }
  try {
    const stored = window.localStorage.getItem(STORAGE_KEY);
    if (stored === LIGHT || stored === DARK) {
      return stored;
    }
  } catch (err) {
    // localStorage can throw in private / sandboxed contexts — ignore and
    // fall back to the system preference below.
  }
  return null;
}

function readSystemPreference() {
  if (typeof window === 'undefined' || typeof window.matchMedia !== 'function') {
    return LIGHT;
  }
  return window.matchMedia('(prefers-color-scheme: dark)').matches ? DARK : LIGHT;
}

function resolveInitialTheme() {
  return readStoredPreference() || readSystemPreference();
}

function applyThemeToDocument(theme) {
  if (typeof document === 'undefined') {
    return;
  }
  const root = document.documentElement;
  if (theme === DARK) {
    root.classList.add('dark');
    root.style.colorScheme = DARK;
  } else {
    root.classList.remove('dark');
    root.style.colorScheme = LIGHT;
  }
}

export function ThemeProvider({ children }) {
  const [theme, setTheme] = useState(resolveInitialTheme);

  // Reflect the current theme onto <html> and persist the explicit choice.
  useEffect(() => {
    applyThemeToDocument(theme);
    try {
      window.localStorage.setItem(STORAGE_KEY, theme);
    } catch (err) {
      // Persisting is best-effort; rendering must never fail because of it.
    }
  }, [theme]);

  // Follow live OS changes, but only while the user has not made an explicit
  // choice. The moment they toggle, localStorage wins and this stays inert.
  useEffect(() => {
    if (typeof window === 'undefined' || typeof window.matchMedia !== 'function') {
      return undefined;
    }
    const mediaQuery = window.matchMedia('(prefers-color-scheme: dark)');
    const handleChange = (event) => {
      if (readStoredPreference()) {
        return;
      }
      setTheme(event.matches ? DARK : LIGHT);
    };

    if (typeof mediaQuery.addEventListener === 'function') {
      mediaQuery.addEventListener('change', handleChange);
      return () => mediaQuery.removeEventListener('change', handleChange);
    }
    // Safari < 14 fallback.
    mediaQuery.addListener(handleChange);
    return () => mediaQuery.removeListener(handleChange);
  }, []);

  const setLight = useCallback(() => setTheme(LIGHT), []);
  const setDark = useCallback(() => setTheme(DARK), []);
  const toggleTheme = useCallback(() => {
    setTheme((current) => (current === DARK ? LIGHT : DARK));
  }, []);

  const value = useMemo(
    () => ({
      theme,
      isDark: theme === DARK,
      isLight: theme === LIGHT,
      setTheme,
      setLight,
      setDark,
      toggleTheme,
    }),
    [theme, setTheme, setLight, setDark, toggleTheme]
  );

  return <ThemeContext.Provider value={value}>{children}</ThemeContext.Provider>;
}

export function useTheme() {
  const context = useContext(ThemeContext);
  if (!context) {
    throw new Error('useTheme must be used within a <ThemeProvider>.');
  }
  return context;
}

export default ThemeContext;
