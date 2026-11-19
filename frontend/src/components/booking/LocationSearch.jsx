import { useState, useEffect, useRef, useCallback } from 'react';
import { autocompleteLocations } from '../../services/locationService';

export default function LocationSearch({
  value = '',
  onChange,
  onSelectLocation,
  error = '',
  onFocus,
  disabled = false,
  id = 'eventAreaInput',
}) {
  const [query, setQuery] = useState(value);
  const [suggestions, setSuggestions] = useState([]);
  const [isOpen, setIsOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [statusNote, setStatusNote] = useState('');
  const [highlightIndex, setHighlightIndex] = useState(-1);

  const containerRef = useRef(null);
  const debounceTimerRef = useRef(null);
  const reqSeqRef = useRef(0);

  // Sync internal query when prop changes from outside (e.g., map selection or reset)
  const [prevPropValue, setPrevPropValue] = useState(value);
  if (value !== prevPropValue) {
    setPrevPropValue(value);
    setQuery(value || '');
  }

  // Handle outside click to close suggestions
  useEffect(() => {
    function handleClickOutside(event) {
      if (containerRef.current && !containerRef.current.contains(event.target)) {
        setIsOpen(false);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, []);

  const executeSearch = useCallback(async (text) => {
    const clean = text.trim();
    if (clean.length < 2) {
      setSuggestions([]);
      setIsOpen(false);
      setLoading(false);
      setStatusNote('');
      return;
    }

    const currentReqId = ++reqSeqRef.current;
    setLoading(true);
    setStatusNote('');

    const res = await autocompleteLocations(clean);

    if (currentReqId !== reqSeqRef.current) return;

    setLoading(false);
    if (res.suggestions && res.suggestions.length > 0) {
      setSuggestions(res.suggestions);
      setIsOpen(true);
      setHighlightIndex(-1);
      setStatusNote('');
    } else {
      setSuggestions([]);
      if (res.error) {
        setStatusNote(res.error);
        setIsOpen(true);
      } else {
        setStatusNote('No matching areas found in India. You can enter manually.');
        setIsOpen(true);
      }
    }
  }, []);

  function handleInputChange(e) {
    const nextVal = e.target.value;
    setQuery(nextVal);
    if (onChange) {
      onChange(nextVal);
    }

    if (debounceTimerRef.current) {
      clearTimeout(debounceTimerRef.current);
    }

    debounceTimerRef.current = setTimeout(() => {
      executeSearch(nextVal);
    }, 450);
  }

  function handleInputFocus(e) {
    if (onFocus) onFocus(e);
    if (suggestions.length > 0 && query.trim().length >= 2) {
      setIsOpen(true);
    }
  }

  function handleSelectSuggestion(suggestion) {
    const displayTitle = suggestion.title || suggestion.subtitle || '';
    setQuery(displayTitle);
    setIsOpen(false);
    setSuggestions([]);
    if (onChange) {
      onChange(displayTitle);
    }
    if (onSelectLocation) {
      onSelectLocation(suggestion);
    }
  }

  function handleKeyDown(e) {
    if (!isOpen || suggestions.length === 0) return;

    if (e.key === 'ArrowDown') {
      e.preventDefault();
      setHighlightIndex((prev) => (prev < suggestions.length - 1 ? prev + 1 : 0));
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      setHighlightIndex((prev) => (prev > 0 ? prev - 1 : suggestions.length - 1));
    } else if (e.key === 'Enter') {
      if (highlightIndex >= 0 && highlightIndex < suggestions.length) {
        e.preventDefault();
        handleSelectSuggestion(suggestions[highlightIndex]);
      }
    } else if (e.key === 'Escape') {
      setIsOpen(false);
    }
  }

  function handleClear() {
    setQuery('');
    setSuggestions([]);
    setIsOpen(false);
    setStatusNote('');
    if (onChange) onChange('');
  }

  return (
    <div className="location-search-container" ref={containerRef}>
      <label htmlFor={id} className="booking-field-label">
        Location / Area <span className="booking-req">*</span>
      </label>

      <div className="location-input-wrapper">
        <input
          id={id}
          type="text"
          className={`booking-control ${error ? 'booking-control-highlight' : ''}`}
          placeholder="e.g. Nirchal, Kasaragod"
          value={query}
          onChange={handleInputChange}
          onFocus={handleInputFocus}
          onKeyDown={handleKeyDown}
          autoComplete="off"
          disabled={disabled}
          aria-autocomplete="list"
          aria-expanded={isOpen}
          aria-invalid={Boolean(error)}
        />
        {loading && <span className="location-input-badge">Searching...</span>}
        {!loading && query && (
          <button
            type="button"
            className="location-input-clear-btn"
            onClick={handleClear}
            aria-label="Clear location input"
          >
            Clear
          </button>
        )}
      </div>

      {error && (
        <div className="booking-field-pointer" role="alert">
          <span>{error}</span>
        </div>
      )}

      {isOpen && (
        <div className="location-suggestions-dropdown" role="listbox">
          {suggestions.map((item, index) => {
            const isHighlighted = index === highlightIndex;
            return (
              <div
                key={item.place_id || `${item.title}-${index}`}
                role="option"
                aria-selected={isHighlighted}
                className={`location-suggestion-item ${isHighlighted ? 'is-highlighted' : ''}`}
                onClick={() => handleSelectSuggestion(item)}
                onMouseEnter={() => setHighlightIndex(index)}
              >
                <div className="location-suggestion-title">
                  {item.title}
                  {item.area_type && (
                    <span className="location-area-type-tag">
                      {item.area_type.replace(/([A-Z])/g, ' $1').toLowerCase()}
                    </span>
                  )}
                </div>
                {item.subtitle && (
                  <div className="location-suggestion-subtitle">{item.subtitle}</div>
                )}
              </div>
            );
          })}

          {statusNote && suggestions.length === 0 && (
            <div className="location-suggestion-note">{statusNote}</div>
          )}
        </div>
      )}
    </div>
  );
}
