// ============================================
// Header Component — Search Bar & User Profile
// ============================================

import React, { useState, useEffect, useRef } from 'react';
import { Search, LogOut, FileText } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { suggestApiCall } from '../services/search.service';

interface HeaderProps {
  onSearch: (query: string) => void;
}

export const Header: React.FC<HeaderProps> = ({ onSearch }) => {
  const { user, logout } = useAuth();
  const [query, setQuery] = useState('');
  const [suggestions, setSuggestions] = useState<string[]>([]);
  const [showDropdown, setShowDropdown] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  // Debounced auto-suggest API call
  useEffect(() => {
    if (!query.trim()) {
      setSuggestions([]);
      setShowDropdown(false);
      return;
    }

    const timer = setTimeout(async () => {
      try {
        const res = await suggestApiCall(query);
        if (res.success && Array.isArray(res.data)) {
          setSuggestions(res.data);
          setShowDropdown(res.data.length > 0);
        }
      } catch (err) {
        setSuggestions([]);
      }
    }, 250);

    return () => clearTimeout(timer);
  }, [query]);

  // Hide dropdown on click outside
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
        setShowDropdown(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const handleSelectSuggestion = (item: string) => {
    setQuery(item);
    setShowDropdown(false);
    onSearch(item);
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      setShowDropdown(false);
      onSearch(query);
    }
  };

  return (
    <header className="header">
      <div className="search-bar-container" ref={dropdownRef}>
        <div className="search-input-wrapper">
          <Search size={18} style={{ color: '#64748b' }} />
          <input
            type="text"
            placeholder="Search files and folders in Elasticsearch..."
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            onKeyDown={handleKeyDown}
            onFocus={() => setShowDropdown(suggestions.length > 0)}
          />
        </div>

        {/* Real-time Auto-Suggest Dropdown */}
        {showDropdown && (
          <div className="suggest-dropdown">
            {suggestions.map((item, idx) => (
              <div
                key={idx}
                className="suggest-item"
                onClick={() => handleSelectSuggestion(item)}
              >
                <FileText size={16} style={{ color: '#3b82f6' }} />
                <span>{item}</span>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* User Info & Logout */}
      <div className="user-profile">
        <div className="user-avatar">
          {user?.firstName ? user.firstName[0]?.toUpperCase() : (user?.email?.[0]?.toUpperCase() || 'U')}
        </div>
        <div style={{ fontSize: '0.88rem' }}>
          <div style={{ fontWeight: 600 }}>{user?.firstName ? `${user.firstName} ${user.lastName || ''}` : user?.username}</div>
          <div style={{ fontSize: '0.78rem', color: '#94a3b8' }}>{user?.email}</div>
        </div>
        <button onClick={logout} className="icon-btn" title="Logout" style={{ marginLeft: '12px' }}>
          <LogOut size={18} />
        </button>
      </div>
    </header>
  );
};
