import { useEffect, useState } from 'react';
import { applyTheme, parseThemePreference, readThemePreference, themeStorageKey } from './theme.js';

export function ThemeSelect() {
  const [preference, setPreference] = useState(readThemePreference);

  useEffect(() => {
    applyTheme(preference);
    const media = matchMedia('(prefers-color-scheme: dark)');
    const onSystemChange = () => applyTheme(preference);
    const onStorage = (event: StorageEvent) => {
      if (event.key === themeStorageKey || event.key === null) {
        setPreference(readThemePreference());
      }
    };
    media.addEventListener('change', onSystemChange);
    window.addEventListener('storage', onStorage);
    return () => {
      media.removeEventListener('change', onSystemChange);
      window.removeEventListener('storage', onStorage);
    };
  }, [preference]);

  return <div className="theme-select">
    <label htmlFor="theme-preference">外观</label>
    <select id="theme-preference" value={preference} onChange={event => {
      const next = parseThemePreference(event.target.value);
      applyTheme(next);
      setPreference(next);
      try {
        localStorage.setItem(themeStorageKey, next);
      } catch {
        // Storage can be disabled; switching still works for this page session.
      }
    }}>
      <option value="system">跟随系统</option>
      <option value="light">亮色</option>
      <option value="dark">深色</option>
    </select>
  </div>;
}
