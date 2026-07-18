import { useState, useEffect, useCallback, useRef } from 'react';
import { Filter, X } from 'lucide-react';

/**
 * Debounce hook for search input
 */
export function useDebounce(value, delay = 300) {
  const [debouncedValue, setDebouncedValue] = useState(value);

  useEffect(() => {
    const timer = setTimeout(() => setDebouncedValue(value), delay);
    return () => clearTimeout(timer);
  }, [value, delay]);

  return debouncedValue;
}

/**
 * Search Analytics Hook
 * Tracks search queries and results for insights
 */
export function useSearchAnalytics() {
  const trackSearch = useCallback((query, resultsCount, filters = {}) => {
    try {
      const analytics = JSON.parse(localStorage.getItem('kayad_search_analytics') || '[]');
      analytics.push({
        query,
        resultsCount,
        filters,
        timestamp: new Date().toISOString(),
        userAgent: navigator.userAgent,
      });
      // Keep last 100 searches
      localStorage.setItem('kayad_search_analytics', JSON.stringify(analytics.slice(-100)));
    } catch {}
  }, []);

  const getPopularSearches = useCallback(() => {
    try {
      const analytics = JSON.parse(localStorage.getItem('kayad_search_analytics') || '[]');
      const counts = {};
      analytics.forEach(a => {
        const q = a.query.toLowerCase();
        counts[q] = (counts[q] || 0) + 1;
      });
      return Object.entries(counts)
        .sort((a, b) => b[1] - a[1])
        .slice(0, 10)
        .map(([query, count]) => ({ query, count }));
    } catch {
      return [];
    }
  }, []);

  return { trackSearch, getPopularSearches };
}

/**
 * Search Filters Component
 */
export function SearchFilters({ filters, onChange, onClear }) {
  const [expanded, setExpanded] = useState(false);
  
  const activeFilters = Object.entries(filters).filter(([_, v]) => v !== null && v !== undefined && v !== '' && !(Array.isArray(v) && v.length === 0));
  
  const handleRemove = (key) => {
    onChange({ ...filters, [key]: null });
  };

  const handleClearAll = () => {
    onClear?.();
  };

  return (
    <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8, alignItems: 'center' }}>
      {/* Active filter chips */}
      {activeFilters.map(([key, value]) => (
        <div
          key={key}
          style={{
            display: 'inline-flex',
            alignItems: 'center',
            gap: 6,
            padding: '6px 12px',
            background: 'rgba(59, 130, 246, 0.1)',
            border: '1px solid rgba(59, 130, 246, 0.2)',
            borderRadius: 20,
            fontSize: 12,
            fontWeight: 500,
          }}
        >
          <span style={{ color: 'var(--blue-500)' }}>
            {key}: {Array.isArray(value) ? value.join(', ') : value}
          </span>
          <button
            onClick={() => handleRemove(key)}
            style={{
              background: 'transparent',
              border: 'none',
              cursor: 'pointer',
              padding: 0,
              color: 'var(--blue-500)',
              fontSize: 14,
              lineHeight: 1,
            }}
          >
            ✕
          </button>
        </div>
      ))}
      
      {/* Clear all button */}
      {activeFilters.length > 1 && (
        <button
          onClick={handleClearAll}
          style={{
            background: 'transparent',
            border: 'none',
            cursor: 'pointer',
            color: 'var(--text-muted)',
            fontSize: 12,
            textDecoration: 'underline',
          }}
        >
          Clear all
        </button>
      )}
      
      {/* Expand/collapse filters */}
      <button
        onClick={() => setExpanded(!expanded)}
        style={{
          display: 'inline-flex',
          alignItems: 'center',
          gap: 6,
          padding: '6px 12px',
          background: expanded ? 'var(--blue-500)' : 'transparent',
          border: `1px solid ${expanded ? 'var(--blue-500)' : 'var(--border)'}`,
          borderRadius: 20,
          color: expanded ? '#fff' : 'var(--text)',
          fontSize: 12,
          fontWeight: 500,
          cursor: 'pointer',
        }}
      >
        <Filter size={14} />
        More Filters
      </button>
    </div>
  );
}

/**
 * Search Suggestions Dropdown
 */
export function SearchSuggestions({ 
  suggestions = [], 
  recentSearches = [], 
  popularSearches = [],
  onSelect, 
  visible = false 
}) {
  const hasSuggestions = suggestions.length > 0;
  const hasRecent = recentSearches.length > 0;
  const hasPopular = popularSearches.length > 0;
  
  if (!visible || (!hasSuggestions && !hasRecent && !hasPopular)) return null;

  return (
    <div
      role="listbox"
      style={{
        position: 'absolute',
        top: 'calc(100% + 4px)',
        left: 0,
        right: 0,
        background: '#fff',
        border: '1px solid var(--border)',
        borderRadius: 12,
        overflow: 'hidden',
        zIndex: 100,
        boxShadow: '0 8px 32px rgba(0,0,0,0.12)',
        maxHeight: 400,
        overflowY: 'auto',
      }}
    >
      {/* Recent searches */}
      {hasRecent && (
        <div>
          <div style={{
            padding: '8px 16px 4px',
            fontSize: 11,
            fontWeight: 700,
            color: 'var(--text-muted)',
            textTransform: 'uppercase',
            letterSpacing: '0.05em',
          }}>
            Recent Searches
          </div>
          {recentSearches.map((query, i) => (
            <button
              key={`recent-${i}`}
              onClick={() => onSelect(query)}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: 12,
                width: '100%',
                padding: '10px 16px',
                background: 'transparent',
                border: 'none',
                cursor: 'pointer',
                textAlign: 'left',
                fontSize: 13,
                color: 'var(--text)',
              }}
            >
              <span style={{ color: 'var(--text-muted)', fontSize: 14 }}>🕐</span>
              {query}
            </button>
          ))}
        </div>
      )}

      {/* Suggestions */}
      {hasSuggestions && (
        <div>
          {hasRecent && (
            <div style={{ height: 1, background: 'var(--border)', margin: '8px 0' }} />
          )}
          <div style={{
            padding: '8px 16px 4px',
            fontSize: 11,
            fontWeight: 700,
            color: 'var(--text-muted)',
            textTransform: 'uppercase',
            letterSpacing: '0.05em',
          }}>
            Suggestions
          </div>
          {suggestions.map((item, i) => (
            <button
              key={`suggestion-${i}`}
              onClick={() => onSelect(typeof item === 'string' ? item : item.query)}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: 12,
                width: '100%',
                padding: '10px 16px',
                background: 'transparent',
                border: 'none',
                cursor: 'pointer',
                textAlign: 'left',
                fontSize: 13,
                color: 'var(--text)',
              }}
            >
              <span style={{ color: 'var(--blue-500)', fontSize: 14 }}>🔍</span>
              <span>{typeof item === 'string' ? item : item.query}</span>
              {item.count && (
                <span style={{ marginLeft: 'auto', fontSize: 11, color: 'var(--text-muted)' }}>
                  {item.count} results
                </span>
              )}
            </button>
          ))}
        </div>
      )}

      {/* Popular searches */}
      {hasPopular && !hasSuggestions && (
        <div>
          {hasRecent && (
            <div style={{ height: 1, background: 'var(--border)', margin: '8px 0' }} />
          )}
          <div style={{
            padding: '8px 16px 4px',
            fontSize: 11,
            fontWeight: 700,
            color: 'var(--text-muted)',
            textTransform: 'uppercase',
            letterSpacing: '0.05em',
          }}>
            Popular
          </div>
          {popularSearches.slice(0, 5).map((item, i) => (
            <button
              key={`popular-${i}`}
              onClick={() => onSelect(item.query)}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: 12,
                width: '100%',
                padding: '10px 16px',
                background: 'transparent',
                border: 'none',
                cursor: 'pointer',
                textAlign: 'left',
                fontSize: 13,
                color: 'var(--text)',
              }}
            >
              <span style={{ color: 'var(--gold)', fontSize: 14 }}>★</span>
              {item.query}
              <span style={{ marginLeft: 'auto', fontSize: 11, color: 'var(--text-muted)' }}>
                {item.count} searches
              </span>
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

/**
 * Voice Search Hook
 * Provides speech recognition capability
 */
export function useVoiceSearch() {
  const [isListening, setIsListening] = useState(false);
  const [transcript, setTranscript] = useState('');
  const [isSupported, setIsSupported] = useState(false);
  const recognitionRef = useRef(null);

  useEffect(() => {
    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
    if (SpeechRecognition) {
      setIsSupported(true);
      recognitionRef.current = new SpeechRecognition();
      recognitionRef.current.continuous = false;
      recognitionRef.current.interimResults = true;
      
      recognitionRef.current.onresult = (event) => {
        const transcript = Array.from(event.results)
          .map(result => result[0].transcript)
          .join('');
        setTranscript(transcript);
      };
      
      recognitionRef.current.onend = () => {
        setIsListening(false);
      };
      
      recognitionRef.current.onerror = () => {
        setIsListening(false);
      };
    }
  }, []);

  const startListening = useCallback(() => {
    if (recognitionRef.current && !isListening) {
      setTranscript('');
      recognitionRef.current.start();
      setIsListening(true);
    }
  }, [isListening]);

  const stopListening = useCallback(() => {
    if (recognitionRef.current && isListening) {
      recognitionRef.current.stop();
      setIsListening(false);
    }
  }, [isListening]);

  return {
    isListening,
    transcript,
    isSupported,
    startListening,
    stopListening,
  };
}
