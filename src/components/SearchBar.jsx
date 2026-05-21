import { useState, useRef, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Search } from 'lucide-react';

const BRAND_SUGGESTIONS = ['Toyota', 'Nissan', 'BMW', 'Mercedes', 'Audi', 'Subaru', 'Volkswagen'];
const QUICK_FILTERS = [
  { label: 'All', value: 'all' },
  { label: 'Auction', value: 'auction' },
  { label: 'Buy Now', value: 'fixed' },
  { label: 'Sold', value: 'sold' },
];

export default function SearchBar({ onSearch }) {
  const navigate = useNavigate();
  const inputRef = useRef(null);
  const [query, setQuery] = useState('');
  const [activeChip, setActiveChip] = useState('all');
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [expanded, setExpanded] = useState(false);
  const filteredSuggestions = BRAND_SUGGESTIONS.filter(s =>
    s.toLowerCase().includes(query.toLowerCase())
  );

  useEffect(() => {
    if (expanded && inputRef.current) inputRef.current.focus();
  }, [expanded]);

  function handleSubmit(val) {
    const q = (val || query).trim();
    onSearch?.(q);
    navigate(`/showroom?search=${encodeURIComponent(q)}`);
    setShowSuggestions(false);
    setExpanded(false);
  }

  function handleSuggestionClick(brand) {
    setQuery(brand);
    setShowSuggestions(false);
    handleSubmit(brand);
    setActiveChip('all');
  }

  function handleChipClick(value) {
    setActiveChip(value);
    navigate(value === 'all' ? '/showroom' : `/showroom?filter=${value}`);
  }

  return (
    <div style={{
      width: '100%',
      maxWidth: 720,
      margin: '0 auto',
    }}>
      <div style={{
        position: 'relative',
        display: 'flex',
        alignItems: 'center',
        width: '100%',
      }}>
        <div style={{
          display: 'flex',
          alignItems: 'center',
          width: '100%',
          background: 'var(--surface)',
          border: '2px solid var(--border)',
          borderRadius: 'var(--radius-lg)',
          transition: 'all 0.3s var(--ease)',
          outline: 'none',
          ...(expanded && {
            borderColor: 'var(--gold)',
            boxShadow: '0 0 0 4px var(--gold-glow)',
          }),
        }}>
          <Search size={20} style={{
            color: query ? 'var(--gold)' : 'var(--text-muted)',
            marginLeft: 18,
            flexShrink: 0,
            transition: 'color 0.2s',
          }} />
          <input
            ref={inputRef}
            value={query}
            onChange={e => { setQuery(e.target.value); setShowSuggestions(true); }}
            onFocus={() => { setExpanded(true); setShowSuggestions(true); }}
            onBlur={() => setTimeout(() => setShowSuggestions(false), 200)}
            onKeyDown={e => { if (e.key === 'Enter') handleSubmit(); }}
            placeholder="Search by make, model, or keyword..."
            style={{
              flex: 1,
              background: 'transparent',
              border: 'none',
              outline: 'none',
              color: 'var(--text)',
              fontSize: 16,
              fontWeight: 500,
              padding: '15px 14px',
              fontFamily: 'var(--font-body)',
              minWidth: 0,
            }}
          />
          {query && (
            <button
              onClick={() => { setQuery(''); inputRef.current?.focus(); }}
              style={{
                background: 'rgba(255,255,255,0.06)',
                border: 'none',
                borderRadius: '50%',
                width: 24,
                height: 24,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                cursor: 'pointer',
                color: 'var(--text-muted)',
                fontSize: 14,
                marginRight: 8,
                flexShrink: 0,
              }}
            >✕</button>
          )}
          <button
            onClick={() => handleSubmit()}
            style={{
              background: 'var(--gold)',
              border: 'none',
              borderRadius: `0 var(--radius-lg) var(--radius-lg) 0`,
              padding: '15px 24px',
              cursor: 'pointer',
              fontWeight: 700,
              fontSize: 14,
              color: '#000',
              display: 'flex',
              alignItems: 'center',
              gap: 6,
              flexShrink: 0,
              transition: 'opacity 0.2s',
            }}
            onMouseEnter={e => e.currentTarget.style.opacity = '0.85'}
            onMouseLeave={e => e.currentTarget.style.opacity = '1'}
          >
            <Search size={16} />
            <span style={{ display: 'inline' }}>Search</span>
          </button>
        </div>

        {showSuggestions && query && filteredSuggestions.length > 0 && (
          <div style={{
            position: 'absolute',
            top: '100%',
            left: 0,
            right: 0,
            marginTop: 6,
            background: 'var(--card)',
            border: '1px solid var(--border)',
            borderRadius: 'var(--radius)',
            zIndex: 50,
            overflow: 'hidden',
            boxShadow: '0 20px 60px rgba(0,0,0,0.5)',
          }}>
            {filteredSuggestions.map(brand => (
              <button
                key={brand}
                onMouseDown={() => handleSuggestionClick(brand)}
                style={{
                  display: 'block',
                  width: '100%',
                  textAlign: 'left',
                  padding: '11px 18px',
                  background: 'transparent',
                  border: 'none',
                  color: 'var(--text)',
                  fontSize: 14,
                  cursor: 'pointer',
                  transition: 'background 0.15s',
                  fontFamily: 'var(--font-body)',
                }}
                onMouseEnter={e => e.currentTarget.style.background = 'var(--surface)'}
                onMouseLeave={e => e.currentTarget.style.background = 'transparent'}
              >
                <Search size={12} style={{ color: 'var(--text-muted)', marginRight: 10 }} />
                {brand}
              </button>
            ))}
          </div>
        )}
      </div>

      <div style={{
        display: 'flex',
        gap: 8,
        marginTop: 14,
        justifyContent: 'center',
        flexWrap: 'wrap',
      }}>
        {QUICK_FILTERS.map(f => (
          <button
            key={f.value}
            onClick={() => handleChipClick(f.value)}
            style={{
              padding: '7px 18px',
              borderRadius: 9999,
              border: `1px solid ${activeChip === f.value ? 'var(--gold)' : 'var(--border)'}`,
              background: activeChip === f.value ? 'var(--gold-glow-strong)' : 'transparent',
              color: activeChip === f.value ? 'var(--gold-light)' : 'var(--text-muted)',
              fontSize: 12,
              fontWeight: 700,
              cursor: 'pointer',
              transition: 'all 0.2s var(--ease)',
              letterSpacing: '0.04em',
              fontFamily: 'var(--font-body)',
            }}
            onMouseEnter={e => {
              if (activeChip !== f.value) {
                e.currentTarget.style.borderColor = 'var(--gold-muted)';
                e.currentTarget.style.color = 'var(--text)';
              }
            }}
            onMouseLeave={e => {
              if (activeChip !== f.value) {
                e.currentTarget.style.borderColor = 'var(--border)';
                e.currentTarget.style.color = 'var(--text-muted)';
              }
            }}
          >
            {f.label}
          </button>
        ))}
      </div>
    </div>
  );
}
