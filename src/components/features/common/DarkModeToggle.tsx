import React from 'react';
import { useTheme } from '../../../context/ThemeContext';

interface DarkModeToggleProps {
  size?: 'sm' | 'md' | 'lg';
  showLabel?: boolean;
  className?: string;
}

export const DarkModeToggle: React.FC<DarkModeToggleProps> = ({
  size = 'md',
  showLabel = false,
  className = '',
}) => {
  const { isDarkMode, toggleDarkMode, loading } = useTheme();

  const sizeClasses = {
    sm: 'w-8 h-8',
    md: 'w-10 h-10',
    lg: 'w-12 h-12',
  };

  const iconSizes = {
    sm: 'w-4 h-4',
    md: 'w-5 h-5',
    lg: 'w-6 h-6',
  };

  if (loading) {
    return (
      <div className={`${sizeClasses[size]} ${className} animate-pulse bg-cream-200 dark:bg-charcoal-700 rounded-full`} />
    );
  }

  return (
    <button
      onClick={toggleDarkMode}
      className={`
        ${sizeClasses[size]}
        ${className}
        relative inline-flex items-center justify-center
        rounded-full
        bg-cream-100 dark:bg-charcoal-700
        hover:bg-cream-200 dark:hover:bg-charcoal-600
        transition-all duration-200
        focus:outline-none focus:ring-2 focus:ring-brand-500 focus:ring-offset-2
        dark:focus:ring-offset-charcoal-900
      `}
      aria-label={isDarkMode ? 'Switch to light mode' : 'Switch to dark mode'}
      title={isDarkMode ? 'Switch to light mode' : 'Switch to dark mode'}
    >
      {/* Sun icon (shown in dark mode) */}
      <svg
        className={`${iconSizes[size]} text-brand-500 absolute transition-all duration-300 ${
          isDarkMode ? 'opacity-100 rotate-0' : 'opacity-0 rotate-90'
        }`}
        fill="none"
        viewBox="0 0 24 24"
        stroke="currentColor"
      >
        <path
          strokeLinecap="round"
          strokeLinejoin="round"
          strokeWidth={2}
          d="M12 3v1m0 16v1m9-9h-1M4 12H3m15.364 6.364l-.707-.707M6.343 6.343l-.707-.707m12.728 0l-.707.707M6.343 17.657l-.707.707M16 12a4 4 0 11-8 0 4 4 0 018 0z"
        />
      </svg>

      {/* Moon icon (shown in light mode) */}
      <svg
        className={`${iconSizes[size]} text-charcoal-600 dark:text-cream-100 absolute transition-all duration-300 ${
          isDarkMode ? 'opacity-0 -rotate-90' : 'opacity-100 rotate-0'
        }`}
        fill="none"
        viewBox="0 0 24 24"
        stroke="currentColor"
      >
        <path
          strokeLinecap="round"
          strokeLinejoin="round"
          strokeWidth={2}
          d="M20.354 15.354A9 9 0 018.646 3.646 9.003 9.003 0 0012 21a9.003 9.003 0 008.354-5.646z"
        />
      </svg>

      {showLabel && (
        <span className="ml-2 text-sm font-medium text-charcoal-600 dark:text-cream-100">
          {isDarkMode ? 'Dark' : 'Light'}
        </span>
      )}
    </button>
  );
};

export default DarkModeToggle;
