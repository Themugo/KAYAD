import { useState, type FC } from 'react';
import { useTheme } from '../../../context/ThemeContext';
import { preferencesAPI } from '../../../api/api.exports';

interface ThemeSettingsProps {
  className?: string;
}

export const ThemeSettings: FC<ThemeSettingsProps> = ({ className = '' }) => {
  const { theme, setTheme } = useTheme();
  const [saving, setSaving] = useState(false);

  const themes = [
    { value: 'light', label: 'Light', icon: '☀️' },
    { value: 'dark', label: 'Dark', icon: '🌙' },
    { value: 'system', label: 'System', icon: '💻' },
  ] as const;

  const handleThemeChange = async (newTheme: 'light' | 'dark' | 'system') => {
    setSaving(true);
    try {
      await setTheme(newTheme);
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className={`bg-white dark:bg-[#12576D] rounded-xl p-4 shadow-sm ${className}`}>
      <h3 className="text-lg font-semibold text-[#0A3340] dark:text-[#64748B] mb-4">
        Appearance
      </h3>

      <div className="grid grid-cols-3 gap-3">
        {themes.map(({ value, label, icon }) => (
          <button
            key={value}
            onClick={() => handleThemeChange(value)}
            disabled={saving}
            className={`
              flex flex-col items-center gap-2 p-4 rounded-xl border-2 transition-all
              ${
                theme === value
                  ? 'border-brand-500 bg-brand-50 dark:bg-brand-900/20'
                  : 'border-[#D7E7E4] dark:border-[#12576D] hover:border-brand-300'
              }
              ${saving ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer'}
            `}
          >
            <span className="text-2xl">{icon}</span>
            <span
              className={`text-sm font-medium ${
                theme === value
                  ? 'text-brand-600 dark:text-brand-400'
                  : 'text-[#176B87] dark:text-[#64748B]'
              }`}
            >
              {label}
            </span>
          </button>
        ))}
      </div>

      <p className="mt-4 text-sm text-[#64748B] dark:text-[#5AAFA4]">
        {theme === 'system'
          ? 'Theme follows your system settings'
          : theme === 'dark'
          ? 'Dark mode is active'
          : 'Light mode is active'}
      </p>
    </div>
  );
};

export default ThemeSettings;
