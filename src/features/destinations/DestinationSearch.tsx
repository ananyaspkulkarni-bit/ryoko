import React, { useState, useEffect, useRef } from 'react';
import { SearchInput } from '../../components/ui/SearchInput';
import { destinationSearchService } from './destinationSearchService';
import { DestinationSuggestions } from './DestinationSuggestions';
import type { Destination } from '../../types';
import { getDestinationData } from '../../data/destinations';
import { destinationDiscoveryService } from '../../services/destinationDiscoveryService';
import { Compass } from 'lucide-react';

export interface DestinationSearchProps {
  onSelectDestination: (destination: Destination) => void;
}

export const DestinationSearch: React.FC<DestinationSearchProps> = ({
  onSelectDestination,
}) => {
  const [query, setQuery] = useState('');
  const [suggestions, setSuggestions] = useState<Destination[]>([]);
  const [selectedIndex, setSelectedIndex] = useState<number>(0);
  const [isOpen, setIsOpen] = useState(false);
  const searchContainerRef = useRef<HTMLDivElement>(null);

  const handleQueryChange = (val: string) => {
    setQuery(val);
    const trimmed = val.trim();
    if (!trimmed) {
      setSuggestions([]);
      setIsOpen(false);
      return;
    }

    const results = destinationSearchService.search(trimmed);
    setSuggestions(results);
    setSelectedIndex(0);
    setIsOpen(results.length > 0);
  };

  // SHARED DESTINATION SELECTION FUNCTION
  const handleDestinationSelect = (destinationName: string) => {
    const trimmed = destinationName.trim();
    if (!trimmed) return;
    const resolution = destinationDiscoveryService.resolveDestination(trimmed);
    const dest = resolution.destination || getDestinationData(trimmed);

    setQuery(dest.name);
    setIsOpen(false);
    onSelectDestination(dest);
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      if (isOpen && suggestions.length > 0 && suggestions[selectedIndex]) {
        handleDestinationSelect(suggestions[selectedIndex].name);
      } else if (query.trim()) {
        handleDestinationSelect(query);
      }
    } else if (isOpen && suggestions.length > 0) {
      if (e.key === 'ArrowDown') {
        e.preventDefault();
        setSelectedIndex((prev) => (prev + 1) % suggestions.length);
      } else if (e.key === 'ArrowUp') {
        e.preventDefault();
        setSelectedIndex((prev) => (prev - 1 + suggestions.length) % suggestions.length);
      } else if (e.key === 'Escape') {
        setIsOpen(false);
      }
    }
  };

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (searchContainerRef.current && !searchContainerRef.current.contains(e.target as Node)) {
        setIsOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  return (
    <div
      ref={searchContainerRef}
      style={{
        position: 'relative',
        width: '100%',
        maxWidth: '480px',
        margin: '0 auto',
      }}
      onKeyDown={handleKeyDown}
    >
      {isOpen && (
        <DestinationSuggestions
          suggestions={suggestions}
          selectedIndex={selectedIndex}
          onSelect={(dest) => handleDestinationSelect(dest.name)}
        />
      )}

      <div
        style={{
          boxShadow: 'var(--shadow-postcard)',
          borderRadius: 'var(--radius-md)',
        }}
      >
        <SearchInput
          value={query}
          onChange={handleQueryChange}
          onClear={() => handleQueryChange('')}
          placeholder="Where should we go? (e.g. Paris, Tokyo, Kyoto)"

          style={{
            fontSize: '1.05rem',
            paddingTop: '12px',
            paddingBottom: '12px',
            borderRadius: 'var(--radius-md)',
            backgroundColor: 'var(--bg-surface-elevated)',
            border: '2px solid var(--color-cypress)',
          }}
        />
      </div>

      <div
        style={{
          display: 'flex',
          justifyContent: 'center',
          alignItems: 'center',
          flexWrap: 'wrap',
          gap: '10px',
          marginTop: '12px',
          fontSize: '0.82rem',
          color: 'var(--text-muted)',
        }}
      >
        <span style={{ display: 'inline-flex', alignItems: 'center', gap: '4px', fontWeight: 600 }}>
          <Compass size={14} style={{ color: 'var(--color-princeton-orange)' }} /> Quick Try:
        </span>
        {['Paris', 'Tokyo', 'Thailand', 'Rome', 'Egypt', 'Mumbai'].map((cityName) => {

          return (
            <button
              key={cityName}
              type="button"
              onClick={() => handleDestinationSelect(cityName)}
              style={{
                backgroundColor: 'var(--color-vanilla-custard)',
                color: 'var(--text-primary)',
                border: '1px solid var(--color-chrysanthemum)',
                padding: '3px 12px',
                borderRadius: 'var(--radius-full)',
                fontWeight: 700,
                cursor: 'pointer',
                fontFamily: 'var(--font-family-sans)',
                fontSize: '0.8rem',
                boxShadow: 'var(--shadow-sm)',
                transition: 'transform 150ms ease, background-color 150ms ease',
              }}
            >
              ✦ {cityName}
            </button>
          );
        })}
      </div>
    </div>
  );
};

