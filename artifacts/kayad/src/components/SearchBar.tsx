// src/components/SearchBar.tsx
// ─────────────────────────────────────────────────────────────────
// Premium controlled search input.
//
// Replaces the previous SearchBar (which had embedded category chips
// and did its own router navigation, fighting with the page state).
//
// Behaviour:
//   • Controlled by `value` / `onChange` — no internal state for the
//     query. Parent owns the URL search param.
//   • Debounced via the parent (we just call onChange on every keystroke
//     and pressing Enter; the parent decides whether to debounce).
//   • Lightweight suggestion list driven by `suggestions` prop.
//   • Clean clear button + visual focus glow.
//   • Premium typography: DM Sans body, gold glow on focus.
// ─────────────────────────────────────────────────────────────────
import { useRef, useState, useEffect } from 'react';
import { Search, X } from 'lucide-react';

const DEFAULT_BRANDS = [
  'BMW', 'Mercedes', 'Toyota', 'Nissan', 'Subaru',
  'Audi', 'Lexus', 'Range Rover', 'Volkswagen', 'Mazda',
];

interface SearchBarProps {
  value?: string;
  onChange?: (value: string) => void;
  onSubmit?: (value: string) => void;
  suggestions?: string[];
  placeholder?: string;
  autoFocus?: boolean;
  size?: 'sm' | 'md' | 'lg';
}

export default function SearchBar({
  value = '',
  onChange,
  onSubmit,
  suggestions = DEFAULT_BRANDS,
  placeholder = 'Search by make, model, or keyword…',
  autoFocus = false,
  size = 'md',
}: SearchBarProps) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [focused, setFocused] = useState(false);

  useEffect(() => {
    if (autoFocus && inputRef.current) inputRef.current.focus();
  }, [autoFocus]);

  const matched = value
    ? suggestions.filter(s => s.toLowerCase().includes(value.toLowerCase()))
    : suggestions;
  const showSuggestions = focused && matched.length > 0 && matched[0] !== value;

  const padY = size === 'sm' ? 9 : size === 'lg' ? 15 : 12;
  const iconSize = size === 'sm' ? 15 : size === 'lg' ? 19 : 17;
  const fontSize = size === 'sm' ? 13 : size === 'lg' ? 16 : 14;

  return (
    <div style={{ position: 'relative', width: '100%' }}>
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          width: '100%',
          background: focused ? 'rgba(255,255,255,0.045)' : 'rgba(255,255,255,0.02)',
          border: `1px solid ${focused ? 'var(--gold)' : 'rgba(255,255,255,0.08)'}`,
          borderRadius: 10,
          boxShadow: focused ? '0 0 0 3px rgba(212,196,168,0.10)' : 'none',
          transition: 'all 0.2s ease',
        }}
      >
        <Search
          size={iconSize}
          style={{
            color: focused || value ? 'var(--gold)' : 'rgba(255,255,255,0.4)',
            marginLeft: 12,
            flexShrink: 0,
            transition: 'color 0.2s',
          }}
        />
        <input
          ref={inputRef}
          type="search"
          value={value}
          onChange={e => onChange?.(e.target.value)}
          onFocus={() => setFocused(true)}
          onBlur={() => setTimeout(() => setFocused(false), 150)}
          onKeyDown={e => { if (e.key === 'Enter') onSubmit?.(value); }}
          placeholder={placeholder}
          aria-label="Search cars"
          style={{
            flex: 1,
            background: 'transparent',
            border: 'none',
            outline: 'none',
            color: '#fff',
            fontSize,
            fontWeight: 500,
            padding: `${padY}px 12px`,
            fontFamily: 'var(--font-body)',
            minWidth: 0,
          }}
        />
        {value && (
          <button
            type="button"
            onClick={() => { onChange?.(''); inputRef.current?.focus(); }}
            aria-label="Clear search"
            style={{
              background: 'rgba(255,255,255,0.06)',
              border: 'none',
              borderRadius: '50%',
              width: 22, height: 22,
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              cursor: 'pointer',
              color: 'rgba(255,255,255,0.6)',
              marginRight: 8,
              flexShrink: 0,
            }}
          >
            <X size={12} />
          </button>
        )}
      </div>

      {showSuggestions && (
        <div
          role="listbox"
          style={{
            position: 'absolute',
            top: 'calc(100% + 6px)',
            left: 0, right: 0,
            background: '#0c0c0c',
            border: '1px solid rgba(255,255,255,0.08)',
            borderRadius: 10,
            overflow: 'hidden',
            zIndex: 50,
            boxShadow: '0 8px 32px rgba(0,0,0,0.5)',
            maxHeight: 280, overflowY: 'auto',
          }}
        >
          {matched.slice(0, 8).map(brand => (
            <button
              key={brand}
              type="button"
              onMouseDown={() => { onChange?.(brand); onSubmit?.(brand); }}
              style={{
                display: 'flex', alignItems: 'center', gap: 10,
                width: '100%', padding: '10px 14px',
                background: 'transparent', border: 'none',
                color: 'rgba(255,255,255,0.85)',
                fontSize: 13, fontFamily: 'var(--font-body)',
                cursor: 'pointer', textAlign: 'left',
                transition: 'background 0.15s',
              }}
              onMouseEnter={e => { e.currentTarget.style.background = 'rgba(255,255,255,0.04)'; }}
              onMouseLeave={e => { e.currentTarget.style.background = 'transparent'; }}
            >
              <Search size={12} style={{ color: 'rgba(255,255,255,0.35)' }} />
              <span>{brand}</span>
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
