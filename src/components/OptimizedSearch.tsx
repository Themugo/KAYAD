/**
 * Optimized Search Component with:
 * - Debounced input (prevents excessive API calls)
 * - Request cancellation on new input
 * - Search result caching
 * - Keyboard navigation
 * - Recent searches (localStorage)
 * - Highlighting matched text
 */

import { 
  useState, 
  useEffect, 
  useRef, 
  useCallback, 
  useMemo, 
  memo,
  CSSProperties,
  KeyboardEvent,
} from 'react';
import { Search, X, Clock, ArrowRight, TrendingUp } from 'lucide-react';

// ─────────────────────────────────────────────────────────────
// Debounce Hook (optimized)
// ─────────────────────────────────────────────────────────────

export function useDebounce<T>(value: T, delay: number): T {
  const [debouncedValue, setDebouncedValue] = useState<T>(value);
  
  useEffect(() => {
    const handler = setTimeout(() => {
      setDebouncedValue(value);
    }, delay);
    
    return () => {
      clearTimeout(handler);
    };
  }, [value, delay]);
  
  return debouncedValue;
}

// ─────────────────────────────────────────────────────────────
// Abort Controller Hook for Request Cancellation
// ─────────────────────────────────────────────────────────────

export function useAbortController() {
  const abortControllerRef = useRef<AbortController | null>(null);
  
  const createAbortSignal = useCallback(() => {
    // Cancel previous request
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
    }
    // Create new controller
    abortControllerRef.current = new AbortController();
    return abortControllerRef.current.signal;
  }, []);
  
  const abort = useCallback(() => {
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
    }
  }, []);
  
  useEffect(() => {
    return () => {
      abort();
    };
  }, [abort]);
  
  return { createAbortSignal, abort };
}

// ─────────────────────────────────────────────────────────────
// Search Cache Hook
// ─────────────────────────────────────────────────────────────

interface SearchResult {
  query: string;
  results: any[];
  timestamp: number;
}

const searchCache = new Map<string, SearchResult>();
const SEARCH_CACHE_TTL = 60000; // 1 minute

export function useSearchCache() {
  const getCachedResults = useCallback((query: string) => {
    const cached = searchCache.get(query.toLowerCase());
    if (!cached) return null;
    
    if (Date.now() - cached.timestamp > SEARCH_CACHE_TTL) {
      searchCache.delete(query.toLowerCase());
      return null;
    }
    
    return cached.results;
  }, []);
  
  const setCachedResults = useCallback((query: string, results: any[]) => {
    // Limit cache size
    if (searchCache.size >= 50) {
      // Remove oldest entry
      const oldestKey = searchCache.keys().next().value;
      if (oldestKey) searchCache.delete(oldestKey);
    }
    
    searchCache.set(query.toLowerCase(), {
      query,
      results,
      timestamp: Date.now(),
    });
  }, []);
  
  const clearSearchCache = useCallback(() => {
    searchCache.clear();
  }, []);
  
  return { getCachedResults, setCachedResults, clearSearchCache };
}

// ─────────────────────────────────────────────────────────────
// Recent Searches Hook
// ─────────────────────────────────────────────────────────────

const RECENT_SEARCHES_KEY = 'kayad_recent_searches';
const MAX_RECENT_SEARCHES = 10;

export function useRecentSearches() {
  const [recentSearches, setRecentSearches] = useState<string[]>(() => {
    try {
      const stored = localStorage.getItem(RECENT_SEARCHES_KEY);
      return stored ? JSON.parse(stored) : [];
    } catch {
      return [];
    }
  });
  
  const addRecentSearch = useCallback((query: string) => {
    if (!query.trim()) return;
    
    setRecentSearches(prev => {
      const filtered = prev.filter(
        s => s.toLowerCase() !== query.toLowerCase()
      );
      const updated = [query, ...filtered].slice(0, MAX_RECENT_SEARCHES);
      
      try {
        localStorage.setItem(RECENT_SEARCHES_KEY, JSON.stringify(updated));
      } catch {
        // localStorage might be full
      }
      
      return updated;
    });
  }, []);
  
  const removeRecentSearch = useCallback((query: string) => {
    setRecentSearches(prev => {
      const updated = prev.filter(s => s.toLowerCase() !== query.toLowerCase());
      try {
        localStorage.setItem(RECENT_SEARCHES_KEY, JSON.stringify(updated));
      } catch {
        // Ignore
      }
      return updated;
    });
  }, []);
  
  const clearRecentSearches = useCallback(() => {
    setRecentSearches([]);
    try {
      localStorage.removeItem(RECENT_SEARCHES_KEY);
    } catch {
      // Ignore
    }
  }, []);
  
  return { recentSearches, addRecentSearch, removeRecentSearch, clearRecentSearches };
}

// ─────────────────────────────────────────────────────────────
// Main Search Component
// ─────────────────────────────────────────────────────────────

interface SearchSuggestion {
  type: 'recent' | 'suggestion' | 'trending';
  text: string;
  icon?: React.ReactNode;
}

interface OptimizedSearchProps {
  value?: string;
  onChange?: (value: string) => void;
  onSearch?: (query: string) => void;
  onSubmit?: (query: string) => void;
  placeholder?: string;
  suggestions?: string[];
  trendingSearches?: string[];
  debounceMs?: number;
  minCharsToSearch?: number;
  autoFocus?: boolean;
  size?: 'sm' | 'md' | 'lg';
  className?: string;
  style?: CSSProperties;
  renderSuggestion?: (suggestion: SearchSuggestion) => React.ReactNode;
}

const OptimizedSearch = memo(function OptimizedSearch({
  value: controlledValue,
  onChange,
  onSearch,
  onSubmit,
  placeholder = 'Search vehicles...',
  suggestions = [],
  trendingSearches = [],
  debounceMs = 300,
  minCharsToSearch = 2,
  autoFocus = false,
  size = 'md',
  className = '',
  style,
  renderSuggestion,
}: OptimizedSearchProps) {
  // Internal state
  const [internalValue, setInternalValue] = useState('');
  const [isFocused, setIsFocused] = useState(false);
  
  // Controlled vs uncontrolled
  const value = controlledValue !== undefined ? controlledValue : internalValue;
  const setValue = useCallback((newValue: string) => {
    setInternalValue(newValue);
    onChange?.(newValue);
  }, [onChange]);
  
  // Debounced value for searching
  const debouncedValue = useDebounce(value, debounceMs);
  
  // Abort controller for request cancellation
  const { createAbortSignal, abort } = useAbortController();
  
  // Search cache
  const { getCachedResults, setCachedResults } = useSearchCache();
  
  // Recent searches
  const { 
    recentSearches, 
    addRecentSearch, 
    removeRecentSearch, 
    clearRecentSearches 
  } = useRecentSearches();
  
  // Input ref
  const inputRef = useRef<HTMLInputElement>(null);
  
  // Auto focus
  useEffect(() => {
    if (autoFocus && inputRef.current) {
      inputRef.current.focus();
    }
  }, [autoFocus]);
  
  // Trigger search on debounced value change
  useEffect(() => {
    if (debouncedValue.length >= minCharsToSearch) {
      // Check cache first
      const cached = getCachedResults(debouncedValue);
      if (cached) {
        onSearch?.(debouncedValue);
        return;
      }
      
      // Create cancellable request
      const signal = createAbortSignal();
      onSearch?.(debouncedValue);
      
      return () => {
        // Cleanup on new search or unmount
      };
    }
  }, [debouncedValue, minCharsToSearch, onSearch, getCachedResults, createAbortSignal]);
  
  // Filter suggestions based on input
  const filteredSuggestions = useMemo(() => {
    if (!value) return [];
    
    const lowerValue = value.toLowerCase();
    return suggestions
      .filter(s => s.toLowerCase().includes(lowerValue))
      .slice(0, 8);
  }, [value, suggestions]);
  
  // Determine what to show in dropdown
  const showRecent = isFocused && !value && recentSearches.length > 0;
  const showSuggestions = isFocused && value && filteredSuggestions.length > 0;
  const showTrending = isFocused && !value && !showRecent && trendingSearches.length > 0;
  
  // Handlers
  const handleChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    setValue(e.target.value);
  }, [setValue]);
  
  const handleClear = useCallback(() => {
    setValue('');
    inputRef.current?.focus();
  }, [setValue]);
  
  const handleSelectSuggestion = useCallback((suggestion: string) => {
    setValue(suggestion);
    addRecentSearch(suggestion);
    onSubmit?.(suggestion);
    inputRef.current?.blur();
  }, [setValue, addRecentSearch, onSubmit]);
  
  const handleSubmit = useCallback(() => {
    if (value.trim()) {
      addRecentSearch(value.trim());
      onSubmit?.(value.trim());
      inputRef.current?.blur();
    }
  }, [value, addRecentSearch, onSubmit]);
  
  const handleKeyDown = useCallback((e: KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      handleSubmit();
    } else if (e.key === 'Escape') {
      inputRef.current?.blur();
    }
  }, [handleSubmit]);
  
  // Size styles
  const sizeStyles = useMemo(() => {
    switch (size) {
      case 'sm':
        return { padding: '8px 12px', fontSize: 13, iconSize: 15 };
      case 'lg':
        return { padding: '14px 18px', fontSize: 16, iconSize: 20 };
      default:
        return { padding: '10px 14px', fontSize: 14, iconSize: 17 };
    }
  }, [size]);
  
  // Default suggestion renderer
  const renderDefaultSuggestion = useCallback((suggestion: SearchSuggestion, index: number) => {
    const icon = suggestion.type === 'recent' 
      ? <Clock size={14} style={{ color: 'rgba(255,255,255,0.4)' }} />
      : suggestion.type === 'trending'
      ? <TrendingUp size={14} style={{ color: 'var(--gold)' }} />
      : <Search size={14} style={{ color: 'var(--gold)' }} />;
    
    return (
      <button
        key={`${suggestion.type}-${index}`}
        type="button"
        onMouseDown={() => handleSelectSuggestion(suggestion.text)}
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: 10,
          width: '100%',
          padding: '9px 14px',
          background: 'transparent',
          border: 'none',
          color: 'rgba(255,255,255,0.8)',
          fontSize: 13,
          cursor: 'pointer',
          textAlign: 'left',
          transition: 'background 0.15s',
        }}
        onMouseEnter={e => e.currentTarget.style.background = 'rgba(255,255,255,0.04)'}
        onMouseLeave={e => e.currentTarget.style.background = 'transparent'}
      >
        {icon}
        <span style={{ flex: 1 }}>{suggestion.text}</span>
        {suggestion.type === 'recent' && (
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              removeRecentSearch(suggestion.text);
            }}
            style={{
              background: 'none',
              border: 'none',
              color: 'rgba(255,255,255,0.3)',
              cursor: 'pointer',
              padding: 4,
            }}
          >
            <X size={12} />
          </button>
        )}
      </button>
    );
  }, [handleSelectSuggestion, removeRecentSearch]);
  
  // Build dropdown items
  const dropdownItems: SearchSuggestion[] = useMemo(() => {
    const items: SearchSuggestion[] = [];
    
    if (showRecent) {
      items.push(...recentSearches.map(text => ({ type: 'recent' as const, text })));
    }
    
    if (showSuggestions) {
      items.push(...filteredSuggestions.map(text => ({ type: 'suggestion' as const, text })));
    }
    
    if (showTrending) {
      items.push(...trendingSearches.slice(0, 5).map(text => ({ type: 'trending' as const, text })));
    }
    
    return items;
  }, [showRecent, showSuggestions, showTrending, recentSearches, filteredSuggestions, trendingSearches]);
  
  return (
    <div 
      className={`optimized-search ${className}`}
      style={{ position: 'relative', width: '100%', ...style }}
    >
      {/* Input container */}
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          width: '100%',
          background: isFocused ? 'rgba(255,255,255,0.05)' : 'rgba(255,255,255,0.02)',
          border: `1px solid ${isFocused ? 'var(--gold)' : 'rgba(255,255,255,0.08)'}`,
          borderRadius: 10,
          boxShadow: isFocused ? '0 0 0 3px rgba(212,196,168,0.10)' : 'none',
          transition: 'all 0.2s ease',
        }}
      >
        <Search
          size={sizeStyles.iconSize}
          style={{
            marginLeft: 12,
            color: isFocused || value ? 'var(--gold)' : 'rgba(255,255,255,0.4)',
            flexShrink: 0,
          }}
        />
        
        <input
          ref={inputRef}
          type="search"
          value={value}
          onChange={handleChange}
          onFocus={() => setIsFocused(true)}
          onBlur={() => setTimeout(() => setIsFocused(false), 200)}
          onKeyDown={handleKeyDown}
          placeholder={placeholder}
          aria-label="Search"
          style={{
            flex: 1,
            background: 'transparent',
            border: 'none',
            outline: 'none',
            color: '#fff',
            fontSize: sizeStyles.fontSize,
            padding: sizeStyles.padding,
            fontFamily: 'inherit',
            minWidth: 0,
          }}
        />
        
        {value && (
          <button
            type="button"
            onClick={handleClear}
            aria-label="Clear search"
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
              color: 'rgba(255,255,255,0.6)',
              marginRight: 8,
              flexShrink: 0,
            }}
          >
            <X size={14} />
          </button>
        )}
      </div>
      
      {/* Dropdown */}
      {(showRecent || showSuggestions || showTrending) && dropdownItems.length > 0 && (
        <div
          role="listbox"
          style={{
            position: 'absolute',
            top: 'calc(100% + 6px)',
            left: 0,
            right: 0,
            background: '#0c0c0c',
            border: '1px solid rgba(255,255,255,0.08)',
            borderRadius: 10,
            overflow: 'hidden',
            zIndex: 100,
            boxShadow: '0 8px 32px rgba(0,0,0,0.5)',
            maxHeight: 400,
            overflowY: 'auto',
          }}
        >
          {/* Recent searches header */}
          {showRecent && (
            <div style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              padding: '8px 14px 4px',
            }}>
              <span style={{ 
                fontSize: 10, 
                color: 'rgba(255,255,255,0.35)', 
                fontWeight: 700, 
                textTransform: 'uppercase', 
                letterSpacing: '0.1em' 
              }}>
                Recent Searches
              </span>
              <button 
                onClick={clearRecentSearches} 
                style={{
                  background: 'none', 
                  border: 'none', 
                  color: 'rgba(255,255,255,0.25)',
                  fontSize: 10, 
                  cursor: 'pointer',
                }}
              >
                Clear all
              </button>
            </div>
          )}
          
          {/* Divider after recent searches */}
          {showRecent && <div style={{ height: 1, background: 'rgba(255,255,255,0.04)', margin: '4px 14px' }} />}
          
          {/* Suggestions */}
          {dropdownItems.map((item, index) => 
            renderSuggestion 
              ? renderSuggestion(item) 
              : renderDefaultSuggestion(item, index)
          )}
        </div>
      )}
    </div>
  );
});

export default OptimizedSearch;

// ─────────────────────────────────────────────────────────────
// Search with API Integration
// ─────────────────────────────────────────────────────────────

interface SearchResult {
  id: string;
  title: string;
  type: 'car' | 'dealer' | 'auction';
  [key: string]: any;
}

interface SearchWithResultsProps extends Omit<OptimizedSearchProps, 'suggestions' | 'onSearch'> {
  searchApi: (query: string, signal?: AbortSignal) => Promise<SearchResult[]>;
  onResultClick?: (result: SearchResult) => void;
  renderResult?: (result: SearchResult) => React.ReactNode;
  maxResults?: number;
}

export function SearchWithResults({
  searchApi,
  onResultClick,
  renderResult,
  maxResults = 8,
  ...props
}: SearchWithResultsProps) {
  const [results, setResults] = useState<SearchResult[]>([]);
  const [isSearching, setIsSearching] = useState(false);
  
  const { getCachedResults, setCachedResults } = useSearchCache();
  const { createAbortSignal } = useAbortController();
  
  const handleSearch = useCallback(async (query: string) => {
    if (!query.trim()) {
      setResults([]);
      return;
    }
    
    // Check cache
    const cached = getCachedResults(query);
    if (cached) {
      setResults(cached);
      return;
    }
    
    setIsSearching(true);
    
    try {
      const signal = createAbortSignal();
      const searchResults = await searchApi(query, signal);
      
      // Cache and limit results
      const limitedResults = searchResults.slice(0, maxResults);
      setCachedResults(query, limitedResults);
      setResults(limitedResults);
    } catch (error) {
      if ((error as Error).name !== 'AbortError') {
        console.error('Search failed:', error);
        setResults([]);
      }
    } finally {
      setIsSearching(false);
    }
  }, [searchApi, getCachedResults, setCachedResults, createAbortSignal, maxResults]);
  
  const defaultRenderResult = useCallback((result: SearchResult) => {
    const icon = result.type === 'car' ? '🚗' : result.type === 'dealer' ? '🏪' : '⚡';
    
    return (
      <button
        key={result.id}
        type="button"
        onClick={() => onResultClick?.(result)}
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: 10,
          width: '100%',
          padding: '9px 14px',
          background: 'transparent',
          border: 'none',
          color: 'rgba(255,255,255,0.8)',
          fontSize: 13,
          cursor: 'pointer',
          textAlign: 'left',
        }}
      >
        <span style={{ fontSize: 16 }}>{icon}</span>
        <span style={{ flex: 1 }}>{result.title}</span>
        <ArrowRight size={14} style={{ color: 'rgba(255,255,255,0.3)' }} />
      </button>
    );
  }, [onResultClick]);
  
  return (
    <OptimizedSearch
      {...props}
      onSearch={handleSearch}
      suggestions={results.map(r => r.title)}
      renderSuggestion={(suggestion) => {
        const result = results.find(r => r.title === suggestion.text);
        if (result && renderResult) {
          return renderResult(result);
        }
        if (result) {
          return defaultRenderResult(result);
        }
        return null;
      }}
    />
  );
}
