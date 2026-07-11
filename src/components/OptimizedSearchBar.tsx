// High-performance search bar with debouncing, suggestions, and caching
// Supports keyboard navigation and recent searches

import { useState, useEffect, useCallback, useMemo, useRef, memo } from 'react';
import { Search, X, Clock, TrendingUp, Loader } from 'lucide-react';
import useDebouncedValue from '../hooks/useDebouncedValue';
import useMediaQuery from '../hooks/useMediaQuery';

interface SearchSuggestion {
  id: string;
  text: string;
  type: 'recent' | 'popular' | 'brand' | 'model';
  count?: number;
}

interface OptimizedSearchBarProps {
  value: string;
  onChange: (value: string) => void;
  onSearch?: (value: string) => void;
  placeholder?: string;
  suggestions?: SearchSuggestion[];
  onSuggestionsRequest?: (query: string) => Promise<SearchSuggestion[]>;
  recentSearches?: string[];
  popularSearches?: string[];
  maxSuggestions?: number;
  debounceMs?: number;
  className?: string;
  autoFocus?: boolean;
  showSuggestions?: boolean;
}

const RECENT_SEARCHES_KEY = 'kayad_recent_searches';
const MAX_RECENT_SEARCHES = 5;
const MAX_SUGGESTIONS = 8;

function getRecentSearches(): string[] {
  try {
    const stored = localStorage.getItem(RECENT_SEARCHES_KEY);
    return stored ? JSON.parse(stored) : [];
  } catch {
    return [];
  }
}

function saveRecentSearch(query: string) {
  if (!query.trim()) return;
  
  try {
    const recent = getRecentSearches();
    const filtered = recent.filter(s => s.toLowerCase() !== query.toLowerCase());
    const updated = [query, ...filtered].slice(0, MAX_RECENT_SEARCHES);
    localStorage.setItem(RECENT_SEARCHES_KEY, JSON.stringify(updated));
  } catch {
    // Silent fail
  }
}

// Memoized suggestion item
const SuggestionItem = memo(function SuggestionItem({
  suggestion,
  isHighlighted,
  onClick,
}: {
  suggestion: SearchSuggestion;
  isHighlighted: boolean;
  onClick: () => void;
}) {
  const Icon = suggestion.type === 'recent' ? Clock : 
               suggestion.type === 'popular' ? TrendingUp : Search;

  return (
    <button
      onClick={onClick}
      style={{
        display: 'flex',
        alignItems: 'center',
        gap: 12,
        width: '100%',
        padding: '10px 16px',
        background: isHighlighted ? 'rgba(255,255,255,0.05)' : 'transparent',
        border: 'none',
        cursor: 'pointer',
        textAlign: 'left',
        color: 'rgba(255,255,255,0.7)',
        fontSize: 14,
        transition: 'background 0.15s',
      }}
      onMouseEnter={(e) => (e.currentTarget.style.background = 'rgba(255,255,255,0.05)')}
      onMouseLeave={(e) => (e.currentTarget.style.background = isHighlighted ? 'rgba(255,255,255,0.05)' : 'transparent')}
    >
      <Icon size={16} style={{ color: 'rgba(255,255,255,0.4)', flexShrink: 0 }} />
      <span style={{ flex: 1, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
        {suggestion.text}
      </span>
      {suggestion.count !== undefined && (
        <span style={{ fontSize: 12, color: 'rgba(255,255,255,0.4)' }}>
          {suggestion.count.toLocaleString()} results
        </span>
      )}
    </button>
  );
});

export default function OptimizedSearchBar({
  value,
  onChange,
  onSearch,
  placeholder = 'Search vehicles...',
  suggestions: customSuggestions = [],
  onSuggestionsRequest,
  popularSearches = [],
  maxSuggestions = MAX_SUGGESTIONS,
  debounceMs = 300,
  className,
  autoFocus = false,
  showSuggestions: controlledShowSuggestions,
}: OptimizedSearchBarProps) {
  const [inputValue, setInputValue] = useState(value);
  const [isFocused, setIsFocused] = useState(false);
  const [suggestions, setSuggestions] = useState<SearchSuggestion[]>([]);
  const [isLoadingSuggestions, setIsLoadingSuggestions] = useState(false);
  const [highlightedIndex, setHighlightedIndex] = useState(-1);
  const [recentSearches, setRecentSearches] = useState<string[]>([]);

  const inputRef = useRef<HTMLInputElement>(null);
  const suggestionsRef = useRef<HTMLDivElement>(null);
  const isMobile = useMediaQuery('(max-width: 768px)');

  // Debounced value for API calls
  const debouncedValue = useDebouncedValue(inputValue, debounceMs);

  // Load recent searches
  useEffect(() => {
    setRecentSearches(getRecentSearches());
  }, []);

  // Fetch suggestions when debounced value changes
  useEffect(() => {
    if (!onSuggestionsRequest || !debouncedValue.trim()) {
      setSuggestions([]);
      return;
    }

    let cancelled = false;
    setIsLoadingSuggestions(true);

    onSuggestionsRequest(debouncedValue)
      .then((results) => {
        if (!cancelled) {
          setSuggestions(results.slice(0, maxSuggestions));
        }
      })
      .catch(() => {
        if (!cancelled) {
          setSuggestions([]);
        }
      })
      .finally(() => {
        if (!cancelled) {
          setIsLoadingSuggestions(false);
        }
      });

    return () => {
      cancelled = true;
    };
  }, [debouncedValue, onSuggestionsRequest, maxSuggestions]);

  // Build suggestions list
  const suggestionsList = useMemo(() => {
    const list: SearchSuggestion[] = [];
    const query = inputValue.toLowerCase().trim();

    // Add recent searches (if no query or matching)
    if (!query) {
      recentSearches.forEach((s, i) => {
        list.push({ id: `recent-${i}`, text: s, type: 'recent' });
      });
    }

    // Add custom suggestions
    list.push(...customSuggestions.slice(0, maxSuggestions));

    // Add API suggestions
    list.push(...suggestions.slice(0, maxSuggestions));

    // Add popular searches if no results and has query
    if (!query && popularSearches.length > 0) {
      popularSearches.slice(0, 3).forEach((s, i) => {
        if (!list.some(item => item.text.toLowerCase() === s.toLowerCase())) {
          list.push({ id: `popular-${i}`, text: s, type: 'popular' });
        }
      });
    }

    // Filter by query if present
    if (query) {
      return list.filter(s => 
        s.text.toLowerCase().includes(query)
      ).slice(0, maxSuggestions);
    }

    return list.slice(0, maxSuggestions);
  }, [inputValue, recentSearches, customSuggestions, suggestions, popularSearches, maxSuggestions]);

  // Determine if suggestions should show
  const showSuggestions = useMemo(() => {
    if (controlledShowSuggestions !== undefined) {
      return controlledShowSuggestions && isFocused;
    }
    return isFocused && (suggestionsList.length > 0 || inputValue.trim().length > 0);
  }, [controlledShowSuggestions, isFocused, suggestionsList.length, inputValue]);

  // Sync external value
  useEffect(() => {
    setInputValue(value);
  }, [value]);

  // Handle input change
  const handleChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const newValue = e.target.value;
    setInputValue(newValue);
    onChange(newValue);
    setHighlightedIndex(-1);
  }, [onChange]);

  // Handle keyboard navigation
  const handleKeyDown = useCallback((e: React.KeyboardEvent) => {
    if (!showSuggestions) {
      if (e.key === 'Enter') {
        handleSubmit();
      }
      return;
    }

    switch (e.key) {
      case 'ArrowDown':
        e.preventDefault();
        setHighlightedIndex(prev => 
          prev < suggestionsList.length - 1 ? prev + 1 : prev
        );
        break;
      case 'ArrowUp':
        e.preventDefault();
        setHighlightedIndex(prev => prev > 0 ? prev - 1 : -1);
        break;
      case 'Enter':
        e.preventDefault();
        if (highlightedIndex >= 0 && suggestionsList[highlightedIndex]) {
          handleSuggestionClick(suggestionsList[highlightedIndex]);
        } else {
          handleSubmit();
        }
        break;
      case 'Escape':
        e.preventDefault();
        setIsFocused(false);
        inputRef.current?.blur();
        break;
    }
  }, [showSuggestions, highlightedIndex, suggestionsList, inputValue]);

  // Handle form submission
  const handleSubmit = useCallback(() => {
    const query = inputValue.trim();
    if (query) {
      saveRecentSearch(query);
      setRecentSearches(getRecentSearches());
      onSearch?.(query);
      setIsFocused(false);
      inputRef.current?.blur();
    }
  }, [inputValue, onSearch]);

  // Handle suggestion click
  const handleSuggestionClick = useCallback((suggestion: SearchSuggestion) => {
    const text = suggestion.text;
    setInputValue(text);
    onChange(text);
    
    if (suggestion.type === 'recent' || suggestion.type === 'popular') {
      saveRecentSearch(text);
      setRecentSearches(getRecentSearches());
    }
    
    onSearch?.(text);
    setIsFocused(false);
    inputRef.current?.blur();
  }, [onChange, onSearch]);

  // Handle clear
  const handleClear = useCallback(() => {
    setInputValue('');
    onChange('');
    setSuggestions([]);
    inputRef.current?.focus();
  }, [onChange]);

  // Click outside handler
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (suggestionsRef.current && !suggestionsRef.current.contains(e.target as Node)) {
        setIsFocused(false);
      }
    };

    if (isFocused) {
      document.addEventListener('mousedown', handleClickOutside);
      return () => document.removeEventListener('mousedown', handleClickOutside);
    }
  }, [isFocused]);

  return (
    <div 
      ref={suggestionsRef}
      className={className}
      style={{ position: 'relative', width: '100%' }}
    >
      {/* Search Input */}
      <div style={{
        display: 'flex',
        alignItems: 'center',
        gap: 12,
        padding: isMobile ? '12px 16px' : '14px 20px',
        background: 'var(--surface)',
        border: `1px solid ${isFocused ? 'var(--gold)' : 'var(--border)'}`,
        borderRadius: 12,
        transition: 'border-color 0.2s, box-shadow 0.2s',
        boxShadow: isFocused ? '0 0 0 3px rgba(212, 196, 168, 0.15)' : 'none',
      }}>
        {isLoadingSuggestions ? (
          <Loader size={20} style={{ color: 'var(--gold)', animation: 'spin 1s linear infinite' }} />
        ) : (
          <Search size={20} style={{ color: 'rgba(255,255,255,0.5)', flexShrink: 0 }} />
        )}
        
        <input
          ref={inputRef}
          type="text"
          value={inputValue}
          onChange={handleChange}
          onFocus={() => setIsFocused(true)}
          onKeyDown={handleKeyDown}
          placeholder={placeholder}
          autoFocus={autoFocus}
          style={{
            flex: 1,
            background: 'transparent',
            border: 'none',
            outline: 'none',
            color: '#fff',
            fontSize: isMobile ? 14 : 16,
            fontFamily: 'inherit',
          }}
        />

        {inputValue && (
          <button
            onClick={handleClear}
            style={{
              background: 'rgba(255,255,255,0.1)',
              border: 'none',
              borderRadius: '50%',
              width: 24,
              height: 24,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              cursor: 'pointer',
              color: 'rgba(255,255,255,0.7)',
              padding: 0,
            }}
          >
            <X size={14} />
          </button>
        )}

        <button
          onClick={handleSubmit}
          style={{
            padding: '8px 16px',
            background: 'var(--gold)',
            border: 'none',
            borderRadius: 8,
            color: '#000',
            fontWeight: 600,
            fontSize: 14,
            cursor: 'pointer',
            transition: 'transform 0.15s, opacity 0.15s',
          }}
          onMouseEnter={(e) => (e.currentTarget.style.transform = 'scale(1.02)')}
          onMouseLeave={(e) => (e.currentTarget.style.transform = 'scale(1)')}
        >
          Search
        </button>
      </div>

      {/* Suggestions Dropdown */}
      {showSuggestions && (
        <div style={{
          position: 'absolute',
          top: '100%',
          left: 0,
          right: 0,
          marginTop: 8,
          background: 'var(--card)',
          border: '1px solid var(--border)',
          borderRadius: 12,
          overflow: 'hidden',
          boxShadow: '0 8px 32px rgba(0,0,0,0.3)',
          zIndex: 1000,
          maxHeight: 400,
          overflowY: 'auto',
        }}>
          {/* Recent Searches Header */}
          {!inputValue.trim() && recentSearches.length > 0 && (
            <div style={{
              padding: '8px 16px',
              fontSize: 11,
              fontWeight: 700,
              color: 'rgba(255,255,255,0.4)',
              textTransform: 'uppercase',
              letterSpacing: '0.1em',
              borderBottom: '1px solid var(--border)',
            }}>
              Recent Searches
            </div>
          )}

          {/* Suggestions List */}
          {suggestionsList.map((suggestion, index) => (
            <SuggestionItem
              key={suggestion.id}
              suggestion={suggestion}
              isHighlighted={index === highlightedIndex}
              onClick={() => handleSuggestionClick(suggestion)}
            />
          ))}

          {/* Empty State */}
          {suggestionsList.length === 0 && inputValue.trim() && (
            <div style={{
              padding: 20,
              textAlign: 'center',
              color: 'rgba(255,255,255,0.5)',
              fontSize: 14,
            }}>
              No results found for "{inputValue}"
            </div>
          )}

          {/* Search Hint */}
          {inputValue.trim() && (
            <button
              onClick={handleSubmit}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: 8,
                width: '100%',
                padding: '12px 16px',
                background: 'rgba(212, 196, 168, 0.1)',
                border: 'none',
                borderTop: '1px solid var(--border)',
                cursor: 'pointer',
                color: 'var(--gold)',
                fontSize: 14,
                fontWeight: 500,
              }}
            >
              <Search size={16} />
              Search for "{inputValue}"
            </button>
          )}
        </div>
      )}
    </div>
  );
}

// Clear recent searches
export function clearRecentSearches() {
  try {
    localStorage.removeItem(RECENT_SEARCHES_KEY);
  } catch {
    // Silent fail
  }
}
