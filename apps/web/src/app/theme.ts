export type ThemePreference = 'system' | 'light' | 'dark';

export const themeStorageKey = 'boardgame.theme';

export function parseThemePreference(value: unknown): ThemePreference {
  return value === 'light' || value === 'dark' ? value : 'system';
}

export function readThemePreference(): ThemePreference {
  try {
    return parseThemePreference(localStorage.getItem(themeStorageKey));
  } catch {
    return 'system';
  }
}

export function applyTheme(preference: ThemePreference): void {
  const theme = preference === 'system'
    ? (matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light')
    : preference;
  document.documentElement.dataset.theme = theme;
  document.documentElement.style.colorScheme = theme;
  document.querySelector('meta[name="theme-color"]')?.setAttribute(
    'content', theme === 'light' ? '#f4f6fa' : '#1c1c1e',
  );
}

// Keep React initialization aligned with the small first-paint script in index.html.
applyTheme(readThemePreference());
