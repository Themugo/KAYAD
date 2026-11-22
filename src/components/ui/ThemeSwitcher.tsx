import { useEffect, useState } from 'react';
import { Sun, Moon, Monitor } from 'lucide-react';
import { applyTheme, readThemePreference, saveThemePreference, watchSystemTheme, type ThemePreference } from '../../theme/themePreference';

const OPTIONS: { value: ThemePreference; label: string; Icon: typeof Sun }[] = [
  { value: 'light', label: 'Light', Icon: Sun },
  { value: 'dark', label: 'Dark', Icon: Moon },
  { value: 'system', label: 'System', Icon: Monitor },
];

/** Three-way theme choice (Light / Dark / System). Accessible radio group; the choice persists and applies immediately. */
export default function ThemeSwitcher({ className = '' }: { className?: string }) {
  const [pref, setPref] = useState<ThemePreference>(() => readThemePreference());
  useEffect(() => { applyTheme(readThemePreference()); return watchSystemTheme(); }, []);
  const choose = (v: ThemePreference) => { setPref(v); saveThemePreference(v); };
  return (
    <div role="radiogroup" aria-label="Colour theme" className={`inline-flex rounded-lg border border-white/25 p-0.5 ${className}`}>
      {OPTIONS.map(({ value, label, Icon }) => (
        <button
          key={value} type="button" role="radio" aria-checked={pref === value} onClick={() => choose(value)}
          onKeyDown={(e) => { const i = OPTIONS.findIndex((o) => o.value === pref); if (e.key === 'ArrowRight' || e.key === 'ArrowDown') { e.preventDefault(); choose(OPTIONS[(i + 1) % 3].value); } if (e.key === 'ArrowLeft' || e.key === 'ArrowUp') { e.preventDefault(); choose(OPTIONS[(i + 2) % 3].value); } }}
          tabIndex={pref === value ? 0 : -1}
          className={`inline-flex min-h-[32px] items-center gap-1.5 rounded-md px-2.5 text-xs font-semibold ${pref === value ? 'bg-white text-[#0A3340]' : 'text-white/90 hover:bg-white/10'}`}
        >
          <Icon className="h-3.5 w-3.5" aria-hidden="true" /><span>{label}</span>
        </button>
      ))}
    </div>
  );
}
