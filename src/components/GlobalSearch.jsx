import React, { useState, useEffect, useRef, useMemo, useCallback } from 'react';
import {
  Search,
  X,
  Music2,
  Mic2,
  Play,
  Pause,
  Heart,
  Sparkles,
  SlidersHorizontal,
  Clock,
  Check,
  Tag,
  Youtube,
  TrendingUp,
  ChevronRight,
  ChevronDown,
  ArrowLeft,
  Mic,
  Flame,
  Plus,
} from 'lucide-react';
import {
  Sparkle as PhSparkle,
  YoutubeLogo,
  Trophy,
  MicrophoneStage,
  MusicNotes,
} from '@phosphor-icons/react';
import { searchUnifiedMusic } from '../services/musicService';
import { mediaUrl, handleCoverImageError, formatTime } from '../utils/musicUtils';

const FILTER_MODES = [
  {
    id: 'all',
    label: 'All Sources',
    shortLabel: 'All',
    icon: (props) => <PhSparkle weight="duotone" {...props} />,
    desc: 'Unified music search across global streaming engines',
    placeholder: 'Search songs, artists, viral hits, global charts...',
    mobilePlaceholder: 'Search songs, artists, charts...',
  },
  {
    id: 'youtube',
    label: 'YouTube HD',
    shortLabel: 'YouTube',
    icon: (props) => <YoutubeLogo weight="fill" {...props} />,
    desc: 'Full-length music videos & official global releases',
    placeholder: 'Search YouTube Music global catalog...',
    mobilePlaceholder: 'Search YouTube Music...',
  },
  {
    id: 'charts',
    label: 'Top Charts',
    shortLabel: 'Charts',
    icon: (props) => <Trophy weight="duotone" {...props} />,
    desc: 'Global viral hits, international charts & studio master audio',
    placeholder: 'Search global top charts & viral songs...',
    mobilePlaceholder: 'Search viral charts...',
  },
  {
    id: 'artist',
    label: 'Artists',
    shortLabel: 'Artists',
    icon: (props) => <MicrophoneStage weight="duotone" {...props} />,
    desc: 'Filter catalog by singer, band or composer worldwide',
    placeholder: 'Search by singer or artist name...',
    mobilePlaceholder: 'Search by artist name...',
  },
  {
    id: 'genre',
    label: 'Genres',
    shortLabel: 'Genres',
    icon: (props) => <MusicNotes weight="duotone" {...props} />,
    desc: 'Explore categories, moods, industries and vibes',
    placeholder: 'Filter by genre (e.g. Pop, Latin, K-Pop, Afrobeats, EDM, Lo-Fi)...',
    mobilePlaceholder: 'Filter by genre...',
  },
];

const DEFAULT_TRENDING = [
  'ROSÉ - APT.',
  'Billie Eilish',
  'Lady Gaga & Bruno Mars',
  'Sabrina Carpenter',
  'Bad Bunny',
  'Kendrick Lamar',
  'Teddy Swims',
  'Tyla - Water',
  'Diljit Dosanjh',
  'Arijit Singh',
  'ILLIT - Magnetic',
  'Lo-Fi Chill',
];

const QUICK_GENRES = [
  { name: 'Global Hits', color: 'from-amber-500/30 to-orange-500/20 border-amber-500/30 text-amber-300' },
  { name: 'Pop Hits', color: 'from-pink-500/30 to-rose-500/20 border-pink-500/30 text-pink-300' },
  { name: 'Latin', color: 'from-orange-500/30 to-amber-500/20 border-orange-500/30 text-orange-300' },
  { name: 'K-Pop', color: 'from-purple-500/30 to-indigo-500/20 border-purple-500/30 text-purple-300' },
  { name: 'Afrobeats', color: 'from-yellow-500/30 to-lime-500/20 border-yellow-500/30 text-yellow-300' },
  { name: 'Hip-Hop/Rap', color: 'from-blue-500/30 to-cyan-500/20 border-blue-500/30 text-blue-300' },
  { name: 'EDM & Dance', color: 'from-cyan-500/30 to-blue-500/20 border-cyan-500/30 text-cyan-300' },
  { name: 'Lo-Fi Chill', color: 'from-indigo-500/30 to-purple-500/20 border-indigo-500/30 text-indigo-300' },
  { name: 'Punjabi', color: 'from-emerald-500/30 to-teal-500/20 border-emerald-500/30 text-emerald-300' },
];

export default function GlobalSearch({
  searchQuery,
  onSearchChange,
  searchFilter = 'all',
  onSearchFilterChange,
  selectedGenre = 'All',
  onSelectGenre,
  selectedArtist = null,
  onSelectArtist,
  songs = [],
  currentSong = null,
  isPlaying = false,
  onPlaySong,
  onToggleFavorite,
  favorites = [],
  onAddToPlaylist,
  isLoading = false,
  popularSearches = DEFAULT_TRENDING,
  onViewAllResults,
  searchHistory = [],
  onRemoveSearchHistory = null,
  onClearSearchHistory = null,
  onRecordSearch = null,
}) {
  const [isOpen, setIsOpen] = useState(false);
  const [isFocused, setIsFocused] = useState(false);
  const [selectedIndex, setSelectedIndex] = useState(-1);
  const [showFilterMenu, setShowFilterMenu] = useState(false);

  // Mobile dedicated full-screen search view state (< 768px)
  const [isMobileSearchOpen, setIsMobileSearchOpen] = useState(false);
  const [isMobileViewport, setIsMobileViewport] = useState(false);

  // Voice Search states
  const [isListening, setIsListening] = useState(false);
  const [speechSupported, setSpeechSupported] = useState(false);

  // Online intelligent search states
  const [remoteResults, setRemoteResults] = useState([]);
  const [isSearchingOnline, setIsSearchingOnline] = useState(false);

  // Fallback / local recent searches
  const [localRecentSearches, setLocalRecentSearches] = useState(() => {
    try {
      const saved = localStorage.getItem('azaad_recent_searches');
      return saved ? JSON.parse(saved) : [];
    } catch {
      return [];
    }
  });

  const containerRef = useRef(null);
  const inputRef = useRef(null);
  const mobileInputRef = useRef(null);
  const resultsScrollRef = useRef(null);
  const debounceTimerRef = useRef(null);
  const abortControllerRef = useRef(null);

  // Detect mobile viewport (under 768px md breakpoint)
  useEffect(() => {
    const checkMobile = () => {
      const isMob = window.innerWidth < 768;
      setIsMobileViewport(isMob);
      if (!isMob && isMobileSearchOpen) {
        setIsMobileSearchOpen(false);
      }
    };
    checkMobile();
    window.addEventListener('resize', checkMobile);
    return () => window.removeEventListener('resize', checkMobile);
  }, [isMobileSearchOpen]);

  // Check speech recognition capability
  useEffect(() => {
    const hasSpeech =
      typeof window !== 'undefined' &&
      Boolean(window.SpeechRecognition || window.webkitSpeechRecognition);
    setSpeechSupported(hasSpeech);
  }, []);

  // Lock body scroll when mobile full-screen search is open
  useEffect(() => {
    if (isMobileSearchOpen) {
      const prevOverflow = document.body.style.overflow;
      document.body.style.overflow = 'hidden';
      const timer = setTimeout(() => {
        mobileInputRef.current?.focus();
      }, 60);
      return () => {
        clearTimeout(timer);
        document.body.style.overflow = prevOverflow;
      };
    }
    return undefined;
  }, [isMobileSearchOpen]);

  // Effective recent searches: merge Firebase search history with local
  const effectiveRecentSearches = useMemo(() => {
    if (Array.isArray(searchHistory) && searchHistory.length > 0) {
      return searchHistory.map((item) => ({
        id: item.id || item.query,
        query: item.query,
        filter: item.filter,
        isFirebase: true,
      }));
    }
    return localRecentSearches.map((term) => ({
      id: term,
      query: term,
      filter: 'all',
      isFirebase: false,
    }));
  }, [searchHistory, localRecentSearches]);

  // Save query to recent searches (both Firebase and local)
  const saveRecentSearch = useCallback(
    (term) => {
      if (!term || !term.trim()) return;
      const clean = term.trim();

      if (onRecordSearch) {
        try {
          onRecordSearch(clean, searchFilter);
        } catch {}
      }

      setLocalRecentSearches((prev) => {
        const filtered = prev.filter((item) => item.toLowerCase() !== clean.toLowerCase());
        const updated = [clean, ...filtered].slice(0, 10);
        try {
          localStorage.setItem('azaad_recent_searches', JSON.stringify(updated));
        } catch {}
        return updated;
      });
    },
    [onRecordSearch, searchFilter]
  );

  // Voice Search Handler
  const handleStartVoiceSearch = useCallback(
    (e) => {
      e?.stopPropagation();
      const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
      if (!SpeechRecognition) return;

      if (isMobileViewport && !isMobileSearchOpen) {
        setIsMobileSearchOpen(true);
      }

      try {
        const recognition = new SpeechRecognition();
        recognition.lang = 'en-US';
        recognition.continuous = false;
        recognition.interimResults = false;

        recognition.onstart = () => setIsListening(true);
        recognition.onresult = (event) => {
          const transcript = event.results?.[0]?.[0]?.transcript;
          if (transcript) {
            onSearchChange(transcript);
            saveRecentSearch(transcript);
            if (isMobileViewport) {
              setIsMobileSearchOpen(true);
            } else {
              setIsOpen(true);
            }
          }
          setIsListening(false);
        };
        recognition.onerror = () => setIsListening(false);
        recognition.onend = () => setIsListening(false);
        recognition.start();
      } catch {
        setIsListening(false);
      }
    },
    [onSearchChange, isMobileViewport, isMobileSearchOpen, saveRecentSearch]
  );

  const removeRecentSearch = (item, e) => {
    e?.stopPropagation();
    if (item.isFirebase && onRemoveSearchHistory) {
      onRemoveSearchHistory(item);
    }
    setLocalRecentSearches((prev) => {
      const updated = prev.filter((t) => t.toLowerCase() !== item.query.toLowerCase());
      try {
        localStorage.setItem('azaad_recent_searches', JSON.stringify(updated));
      } catch {}
      return updated;
    });
  };

  const clearAllRecent = (e) => {
    e?.stopPropagation();
    if (onClearSearchHistory) {
      onClearSearchHistory();
    }
    setLocalRecentSearches([]);
    try {
      localStorage.removeItem('azaad_recent_searches');
    } catch {}
  };

  // Keyboard shortcut: '/' or 'Cmd+K' / 'Ctrl+K'
  useEffect(() => {
    const handleGlobalKeyDown = (e) => {
      if (['INPUT', 'TEXTAREA', 'SELECT'].includes(e.target.tagName)) {
        if (e.key === 'Escape') {
          if (isMobileSearchOpen) {
            setIsMobileSearchOpen(false);
          } else if (isFocused || isOpen) {
            setIsOpen(false);
            setShowFilterMenu(false);
            inputRef.current?.blur();
          }
        }
        return;
      }

      if (e.key === '/' || ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 'k')) {
        e.preventDefault();
        if (isMobileViewport) {
          setIsMobileSearchOpen(true);
        } else {
          inputRef.current?.focus();
          setIsOpen(true);
        }
      }
    };

    window.addEventListener('keydown', handleGlobalKeyDown);
    return () => window.removeEventListener('keydown', handleGlobalKeyDown);
  }, [isFocused, isOpen, isMobileSearchOpen, isMobileViewport]);

  // Click outside to close desktop/tablet dropdown
  useEffect(() => {
    const handleClickOutside = (e) => {
      if (containerRef.current && !containerRef.current.contains(e.target)) {
        setIsOpen(false);
        setShowFilterMenu(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const queryTrimmed = (searchQuery || '').trim().toLowerCase();

  // Multi-source live online search effect (fast 180ms debounce + shared cache in musicService)
  useEffect(() => {
    if (!queryTrimmed || queryTrimmed.length < 2) {
      setRemoteResults([]);
      setIsSearchingOnline(false);
      return;
    }

    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
    }
    const controller = new AbortController();
    abortControllerRef.current = controller;

    clearTimeout(debounceTimerRef.current);
    debounceTimerRef.current = setTimeout(async () => {
      setIsSearchingOnline(true);
      try {
        const results = await searchUnifiedMusic(queryTrimmed, searchFilter);
        if (!controller.signal.aborted) {
          setRemoteResults(results || []);
          setIsSearchingOnline(false);
        }
      } catch {
        if (!controller.signal.aborted) {
          setIsSearchingOnline(false);
        }
      }
    }, 180);

    return () => {
      clearTimeout(debounceTimerRef.current);
    };
  }, [queryTrimmed, searchFilter]);

  // Token-based intelligent scoring and matching
  const allMergedResults = useMemo(() => {
    const localList = songs || [];
    const remoteList = remoteResults || [];

    const seenMap = new Set();
    const seenIds = new Set();
    const unique = [];

    const addUnique = (s, isLocal) => {
      if (!s) return;
      const id = String(s.id || '').trim();
      const normTitle = (s.title || '')
        .toLowerCase()
        .replace(/\s*[\(\[][^\)\]]*[\)\]]/g, '')
        .replace(/[^a-z0-9]/g, '');
      const normArtist = (s.artist || s.singers || '').toLowerCase().replace(/[^a-z0-9]/g, '');
      const key = `${normTitle}::${normArtist}`;

      if (id && seenIds.has(id)) return;
      if (normTitle && normArtist && seenMap.has(key)) return;

      if (id) seenIds.add(id);
      if (normTitle && normArtist) seenMap.add(key);
      unique.push({ ...s, isLocal });
    };

    localList.forEach((s) => addUnique(s, true));
    remoteList.forEach((s) => addUnique(s, false));

    if (!queryTrimmed) {
      return unique.slice(0, 12);
    }

    const tokens = queryTrimmed.split(/\s+/).filter(Boolean);

    return unique
      .map((song) => {
        const title = (song.title || '').toLowerCase();
        const artist = (song.artist || song.singers || '').toLowerCase();
        const genre = (song.genre || song.category || '').toLowerCase();
        const fullCorpus = `${title} ${artist} ${genre} ${song.album || ''} ${song.vibe || ''}`;

        let score = 0;

        if (title === queryTrimmed) score += 130;
        else if (title.startsWith(queryTrimmed)) score += 85;
        else if (title.includes(queryTrimmed)) score += 55;

        if (artist === queryTrimmed) score += 95;
        else if (artist.startsWith(queryTrimmed)) score += 65;
        else if (artist.includes(queryTrimmed)) score += 40;

        if (genre.includes(queryTrimmed)) score += 25;

        const matchedTokens = tokens.filter((tok) => fullCorpus.includes(tok));
        if (matchedTokens.length === tokens.length) {
          score += 45;
        } else if (matchedTokens.length > 0) {
          score += matchedTokens.length * 14;
        }

        if (searchFilter === 'charts' || searchFilter === 'saavn') {
          const isChart =
            song.source === 'saavn' ||
            song.isFullSong ||
            song.playCount > 40000 ||
            (song.vibe && (song.vibe.includes('Hit') || song.vibe.includes('Viral') || song.vibe.includes('Chart')));
          if (!isChart && searchFilter === 'charts') score = Math.max(1, score - 20);
        } else if (searchFilter === 'youtube') {
          const isYt = song.source === 'youtube' || Boolean(song.videoId) || Boolean(song.youtubeId);
          if (!isYt) score = 0;
        } else if (searchFilter === 'artist') {
          if (!tokens.some((tok) => artist.includes(tok))) score = 0;
        } else if (searchFilter === 'genre') {
          if (!tokens.some((tok) => genre.includes(tok))) score = 0;
        }

        return { song, score };
      })
      .filter((item) => item.score > 0)
      .sort((a, b) => b.score - a.score)
      .map((item) => item.song);
  }, [songs, remoteResults, queryTrimmed, searchFilter]);

  const topResult = useMemo(() => {
    if (!queryTrimmed || allMergedResults.length === 0) return null;
    return allMergedResults[0];
  }, [allMergedResults, queryTrimmed]);

  const matchedSongs = useMemo(() => {
    if (!queryTrimmed) return allMergedResults.slice(0, 10);
    return allMergedResults.slice(1, 16);
  }, [allMergedResults, queryTrimmed]);

  const matchedArtists = useMemo(() => {
    if (!queryTrimmed) return [];
    const artistMap = new Map();
    allMergedResults.forEach((s) => {
      const artistName = s.artist || s.singers;
      if (!artistName) return;
      if (artistName.toLowerCase().includes(queryTrimmed)) {
        if (!artistMap.has(artistName)) {
          artistMap.set(artistName, { name: artistName, count: 1, coverUrl: s.coverUrl, sampleSong: s });
        } else {
          artistMap.get(artistName).count += 1;
        }
      }
    });
    return Array.from(artistMap.values()).slice(0, 4);
  }, [allMergedResults, queryTrimmed]);

  const matchedGenres = useMemo(() => {
    if (!queryTrimmed) return [];
    const genreMap = new Map();
    allMergedResults.forEach((s) => {
      const g = s.genre || s.category;
      if (!g || g === 'Music' || g === 'Trending') return;
      if (g.toLowerCase().includes(queryTrimmed)) {
        genreMap.set(g, (genreMap.get(g) || 0) + 1);
      }
    });
    return Array.from(genreMap.entries())
      .map(([name, count]) => ({ name, count }))
      .slice(0, 4);
  }, [allMergedResults, queryTrimmed]);

  // Scroll keyboard-selected result into view on desktop/tablet
  useEffect(() => {
    if (selectedIndex < 0 || !resultsScrollRef.current) return;
    const el = resultsScrollRef.current.querySelector(`[data-search-idx="${selectedIndex}"]`);
    if (el) {
      el.scrollIntoView({ block: 'nearest', behavior: 'smooth' });
    }
  }, [selectedIndex]);

  const currentFilterInfo = FILTER_MODES.find((m) => m.id === searchFilter) || FILTER_MODES[0];
  const CurrentIcon = currentFilterInfo.icon;

  const handleInputChange = (e) => {
    onSearchChange(e.target.value);
    setIsOpen(true);
    setSelectedIndex(-1);
  };

  const handleClearSearch = (e) => {
    e?.stopPropagation();
    onSearchChange('');
    setSelectedIndex(-1);
    if (isMobileSearchOpen) {
      mobileInputRef.current?.focus();
    } else {
      inputRef.current?.focus();
    }
  };

  const handleSelectSong = (song) => {
    if (!song) return;
    saveRecentSearch(song.title);
    onPlaySong(song);
    setIsOpen(false);
    if (isMobileSearchOpen) {
      setIsMobileSearchOpen(false);
    }
  };

  const handleSelectTerm = (term) => {
    saveRecentSearch(term);
    onSearchChange(term);
    setSelectedIndex(-1);
    if (isMobileViewport) {
      setIsMobileSearchOpen(true);
      mobileInputRef.current?.focus();
    } else {
      setIsOpen(true);
      inputRef.current?.focus();
    }
  };

  const handleSelectArtistMatch = (artistName) => {
    saveRecentSearch(artistName);
    if (onSelectArtist) onSelectArtist(artistName);
    setIsOpen(false);
    setIsMobileSearchOpen(false);
  };

  const handleSelectGenreMatch = (genreName) => {
    saveRecentSearch(genreName);
    if (onSelectGenre) onSelectGenre(genreName);
    setIsOpen(false);
    setIsMobileSearchOpen(false);
  };

  const handleTriggerViewAll = () => {
    if (searchQuery?.trim()) saveRecentSearch(searchQuery);
    setIsOpen(false);
    setIsMobileSearchOpen(false);
    if (onViewAllResults) onViewAllResults(allMergedResults);
  };

  // Keyboard navigation
  const handleKeyDown = (e) => {
    const listToNavigate = topResult ? [topResult, ...matchedSongs] : matchedSongs;
    if (e.key === 'ArrowDown') {
      e.preventDefault();
      setIsOpen(true);
      setSelectedIndex((prev) => Math.min(prev + 1, listToNavigate.length - 1));
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      setSelectedIndex((prev) => Math.max(prev - 1, -1));
    } else if (e.key === 'Enter') {
      e.preventDefault();
      if (selectedIndex >= 0 && listToNavigate[selectedIndex]) {
        handleSelectSong(listToNavigate[selectedIndex]);
      } else if (topResult) {
        handleSelectSong(topResult);
      } else {
        handleTriggerViewAll();
      }
    } else if (e.key === 'Escape') {
      setIsOpen(false);
      setShowFilterMenu(false);
      inputRef.current?.blur();
    }
  };

  const highlightMatch = (text = '', query = '') => {
    if (!query) return text;
    try {
      const parts = text.split(new RegExp(`(${query.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')})`, 'gi'));
      return (
        <span>
          {parts.map((part, i) =>
            part.toLowerCase() === query.toLowerCase() ? (
              <mark key={`m-${i}`} className="bg-[var(--primary)]/30 text-[var(--primary)] font-semibold rounded px-0.5">
                {part}
              </mark>
            ) : (
              <span key={`t-${i}`}>{part}</span>
            )
          )}
        </span>
      );
    } catch {
      return text;
    }
  };

  const hasActiveFilters =
    Boolean(searchQuery) ||
    searchFilter !== 'all' ||
    (selectedGenre && selectedGenre !== 'All') ||
    Boolean(selectedArtist);

  // Shared Search Results & Discovery Renderer for Mobile, Tablet & Desktop
  const renderSearchContent = (isMobileSheet = false) => (
    <>
      {/* ── STATE 1: Empty Query - Recent Searches, Trending, and Genre Quick-Picks ── */}
      {!queryTrimmed && (
        <div className="space-y-4">
          {/* Recent Searches */}
          {effectiveRecentSearches.length > 0 && (
            <div className="space-y-2">
              <div className="flex items-center justify-between px-1">
                <p className="text-[11px] uppercase font-bold tracking-wider text-[var(--text-light)]/80 flex items-center gap-1.5">
                  <Clock className="w-3.5 h-3.5 text-[var(--primary)]" />
                  <span>Recent Searches</span>
                  {effectiveRecentSearches.some((s) => s.isFirebase) && (
                    <span className="text-[9px] text-[var(--primary)] font-medium lowercase bg-[var(--primary)]/10 px-1.5 py-0.5 rounded-md">
                      cloud synced
                    </span>
                  )}
                </p>
                <button
                  type="button"
                  onClick={clearAllRecent}
                  className="text-[11px] text-red-400/85 hover:text-red-300 font-medium transition-colors cursor-pointer"
                >
                  Clear all
                </button>
              </div>
              <div className="flex flex-wrap gap-1.5">
                {effectiveRecentSearches.map((item) => (
                  <div
                    key={item.id || item.query}
                    onClick={() => handleSelectTerm(item.query)}
                    className="group flex items-center gap-1.5 min-h-[34px] px-3 py-1.5 rounded-xl bg-white/[0.05] hover:bg-[var(--primary)]/18 active:bg-[var(--primary)]/25 text-xs text-[var(--text-light)] hover:text-white border border-white/10 hover:border-[var(--primary)]/30 cursor-pointer transition-all"
                  >
                    <Search className="w-3 h-3 text-[var(--primary)] opacity-70 flex-shrink-0" />
                    <span className="truncate max-w-[180px]">{item.query}</span>
                    <button
                      type="button"
                      onClick={(e) => removeRecentSearch(item, e)}
                      className="p-1 -mr-1 rounded-lg hover:bg-white/15 text-white/45 hover:text-white"
                      title="Remove search"
                    >
                      <X className="w-3 h-3" />
                    </button>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Trending Keywords */}
          <div className="space-y-2">
            <p className="text-[11px] uppercase font-bold tracking-wider text-[var(--text-light)]/80 px-1 flex items-center gap-1.5">
              <TrendingUp className="w-3.5 h-3.5 text-[var(--primary)]" />
              <span>Trending Global Searches</span>
            </p>
            <div className="flex flex-wrap gap-1.5">
              {popularSearches.map((term) => (
                <button
                  key={term}
                  type="button"
                  onClick={() => handleSelectTerm(term)}
                  className="min-h-[36px] px-3 py-1.5 rounded-xl bg-white/[0.05] hover:bg-[var(--primary)]/18 active:bg-[var(--primary)]/25 hover:text-[var(--primary)] text-xs text-[var(--text)] border border-white/10 hover:border-[var(--primary)]/30 transition-all text-left flex items-center gap-1.5 group cursor-pointer"
                >
                  <Flame className="w-3.5 h-3.5 text-amber-400 flex-shrink-0 group-hover:scale-110 transition-transform" />
                  <span>{term}</span>
                </button>
              ))}
            </div>
          </div>

          {/* Quick Genre & Mood Explorer */}
          <div className="space-y-2 pt-0.5">
            <p className="text-[11px] uppercase font-bold tracking-wider text-[var(--text-light)]/80 px-1 flex items-center gap-1.5">
              <Sparkles className="w-3.5 h-3.5 text-[var(--accent)]" />
              <span>Explore by Mood & Genre</span>
            </p>
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
              {QUICK_GENRES.map((g) => (
                <button
                  key={g.name}
                  type="button"
                  onClick={() => handleSelectTerm(g.name)}
                  className={`min-h-[44px] flex items-center justify-between px-3 py-2.5 rounded-xl bg-gradient-to-br ${g.color} border transition-all text-left hover:brightness-110 active:scale-98 cursor-pointer`}
                >
                  <span className="text-xs font-bold truncate">{g.name}</span>
                  <ChevronRight className="w-3.5 h-3.5 opacity-60 flex-shrink-0" />
                </button>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* ── STATE 2: Query Entered - Live Multi-Source Results ── */}
      {queryTrimmed && (
        <div className="space-y-4">
          {/* TOP RESULT HERO CARD */}
          {topResult && (
            <div className="space-y-1.5">
              <p className="text-[10px] uppercase font-bold tracking-wider text-[var(--primary)] px-1 flex items-center gap-1">
                <Sparkles className="w-3 h-3" /> Top Match
              </p>
              <div
                data-search-idx={0}
                onClick={() => handleSelectSong(topResult)}
                className={`relative flex items-center gap-3.5 p-3 rounded-2xl border transition-all cursor-pointer group ${
                  currentSong?.id === topResult.id
                    ? 'bg-[var(--primary)]/20 border-[var(--primary)] shadow-[0_0_24px_rgba(83,242,224,0.2)]'
                    : selectedIndex === 0
                    ? 'bg-white/12 border-[var(--primary)]/50'
                    : 'bg-gradient-to-r from-[var(--primary)]/12 via-white/[0.04] to-transparent hover:bg-white/10 border-[var(--primary)]/30'
                }`}
              >
                <div className="relative w-14 h-14 sm:w-16 sm:h-16 rounded-xl overflow-hidden bg-black/50 flex-shrink-0 border border-white/10">
                  <img
                    src={mediaUrl(topResult.coverUrl, topResult)}
                    alt={topResult.title}
                    loading="lazy"
                    decoding="async"
                    referrerPolicy="no-referrer"
                    onError={(e) => handleCoverImageError(e, topResult)}
                    className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                  />
                  <div className="absolute inset-0 bg-black/35 group-hover:bg-black/20 flex items-center justify-center transition-colors">
                    <div className="w-9 h-9 rounded-full bg-[var(--primary)] text-[var(--bg)] flex items-center justify-center shadow-lg group-hover:scale-110 transition-transform">
                      {currentSong?.id === topResult.id && isPlaying ? (
                        <Pause className="w-4 h-4 fill-current" />
                      ) : (
                        <Play className="w-4 h-4 ml-0.5 fill-current" />
                      )}
                    </div>
                  </div>
                </div>

                <div className="min-w-0 flex-1">
                  <h4 className="text-sm font-bold text-white group-hover:text-[var(--primary)] truncate transition-colors">
                    {highlightMatch(topResult.title, queryTrimmed)}
                  </h4>
                  <p className="text-xs text-[var(--text-light)] truncate mt-0.5">
                    {highlightMatch(topResult.singers || topResult.artist, queryTrimmed)}
                  </p>
                  <div className="flex items-center gap-1.5 mt-1.5 text-[11px] text-[var(--text-light)]/75 flex-wrap">
                    <span className="text-[var(--primary)] font-semibold">
                      {topResult.source === 'youtube'
                        ? 'YouTube HD'
                        : topResult.source === 'saavn'
                        ? 'Studio 320k'
                        : 'Hi-Fi Master'}
                    </span>
                    <span>·</span>
                    <span>{topResult.genre || topResult.category || 'Music'}</span>
                    {topResult.duration > 0 && (
                      <>
                        <span>·</span>
                        <span className="font-mono tabular-nums">{formatTime(topResult.duration)}</span>
                      </>
                    )}
                  </div>
                </div>

                <div className="flex items-center gap-1 flex-shrink-0">
                  {onAddToPlaylist && (
                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        onAddToPlaylist(topResult);
                      }}
                      className="w-9 h-9 rounded-xl bg-white/5 hover:bg-white/15 text-white/70 hover:text-[var(--primary)] flex items-center justify-center transition-colors cursor-pointer"
                      title="Add to playlist"
                    >
                      <Plus className="w-4 h-4" />
                    </button>
                  )}
                  <button
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation();
                      onToggleFavorite?.(topResult);
                    }}
                    className={`w-9 h-9 rounded-xl flex items-center justify-center transition-colors cursor-pointer ${
                      favorites.includes(String(topResult.id))
                        ? 'text-red-400 bg-red-500/10'
                        : 'text-white/50 hover:text-red-400 hover:bg-white/10'
                    }`}
                    title="Like song"
                  >
                    <Heart className={`w-4 h-4 ${favorites.includes(String(topResult.id)) ? 'fill-current' : ''}`} />
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* MATCHING ARTISTS */}
          {matchedArtists.length > 0 && (
            <div className="space-y-1.5">
              <p className="text-[10px] uppercase font-bold tracking-wider text-[var(--text-light)]/70 px-1 flex items-center gap-1">
                <Mic2 className="w-3 h-3 text-[var(--primary)]" /> Matching Artists
              </p>
              <div className="grid grid-cols-2 gap-2">
                {matchedArtists.map((artist) => (
                  <button
                    key={artist.name}
                    type="button"
                    onClick={() => handleSelectArtistMatch(artist.name)}
                    className="min-h-[48px] flex items-center gap-2.5 p-2 rounded-xl bg-white/[0.04] hover:bg-[var(--primary)]/15 border border-white/10 hover:border-[var(--primary)]/30 text-left transition-all group cursor-pointer"
                  >
                    <div className="w-9 h-9 rounded-full overflow-hidden bg-black/40 border border-white/10 flex-shrink-0">
                      <img
                        src={mediaUrl(artist.coverUrl, artist.sampleSong)}
                        alt={artist.name}
                        loading="lazy"
                        decoding="async"
                        referrerPolicy="no-referrer"
                        onError={(e) => handleCoverImageError(e, artist.sampleSong)}
                        className="w-full h-full object-cover"
                      />
                    </div>
                    <div className="min-w-0 flex-1">
                      <p className="text-xs font-semibold text-white group-hover:text-[var(--primary)] truncate">
                        {highlightMatch(artist.name, queryTrimmed)}
                      </p>
                      <p className="text-[10px] text-[var(--text-light)]/70 tabular-nums">
                        {artist.count} track{artist.count !== 1 ? 's' : ''}
                      </p>
                    </div>
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* MATCHING GENRES */}
          {matchedGenres.length > 0 && (
            <div className="space-y-1.5">
              <p className="text-[10px] uppercase font-bold tracking-wider text-[var(--text-light)]/70 px-1 flex items-center gap-1">
                <Tag className="w-3 h-3 text-[var(--accent)]" /> Matching Genres
              </p>
              <div className="flex flex-wrap gap-1.5">
                {matchedGenres.map((g) => (
                  <button
                    key={g.name}
                    type="button"
                    onClick={() => handleSelectGenreMatch(g.name)}
                    className="min-h-[34px] px-3 py-1.5 rounded-xl bg-[var(--accent)]/15 hover:bg-[var(--accent)]/25 text-[var(--accent)] border border-[var(--accent)]/30 text-xs font-medium transition-all flex items-center gap-1.5 cursor-pointer"
                  >
                    <span>{highlightMatch(g.name, queryTrimmed)}</span>
                    <span className="text-[10px] opacity-75 font-mono tabular-nums">({g.count})</span>
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* SONGS & AUDIO STREAMS LIST */}
          <div className="space-y-1.5">
            <div className="flex items-center justify-between px-1 text-[10px] uppercase font-bold tracking-wider text-[var(--text-light)]/70">
              <span className="flex items-center gap-1">
                <Music2 className="w-3 h-3 text-[var(--primary)]" /> Songs & Audio Streams
              </span>
              <span className="font-mono tabular-nums">
                {isSearchingOnline ? (
                  <span className="text-[var(--primary)] flex items-center gap-1">
                    <span className="w-1.5 h-1.5 rounded-full bg-[var(--primary)] animate-ping" />
                    Live searching...
                  </span>
                ) : (
                  `${allMergedResults.length} matches`
                )}
              </span>
            </div>

            {allMergedResults.length === 0 ? (
              <div className="py-10 text-center text-xs text-[var(--text-light)]/70 space-y-2">
                {isSearchingOnline ? (
                  <div className="flex flex-col items-center gap-2">
                    <div className="w-6 h-6 rounded-full border-2 border-[var(--primary)] border-t-transparent animate-spin" />
                    <span>Searching universal music catalog...</span>
                  </div>
                ) : (
                  <div>
                    <p className="font-semibold text-white/85">No tracks found matching "{searchQuery}"</p>
                    <p className="text-[11px] text-white/45 mt-1">
                      Try checking the spelling or switch scope to "All Sources" or "YouTube HD".
                    </p>
                  </div>
                )}
              </div>
            ) : (
              <div className="space-y-1">
                {matchedSongs.map((song, index) => {
                  const navIdx = index + (topResult ? 1 : 0);
                  const isCurrent = currentSong?.id === song.id;
                  const isSelected = selectedIndex === navIdx;
                  const isFav = favorites.includes(String(song.id));

                  return (
                    <div
                      key={song.id || index}
                      data-search-idx={navIdx}
                      onClick={() => handleSelectSong(song)}
                      className={`flex items-center justify-between p-2 sm:p-2.5 rounded-xl transition-all cursor-pointer group min-h-[56px] ${
                        isCurrent
                          ? 'bg-[var(--primary)]/18 border border-[var(--primary)]/35 text-[var(--primary)]'
                          : isSelected
                          ? 'bg-white/12 border border-white/15'
                          : 'bg-white/[0.02] hover:bg-white/[0.07] active:bg-white/10 border border-transparent'
                      }`}
                    >
                      <div className="flex items-center gap-3 min-w-0 flex-1">
                        <div className="relative w-11 h-11 rounded-xl overflow-hidden flex-shrink-0 bg-black/40 border border-white/10">
                          <img
                            src={mediaUrl(song.coverUrl, song)}
                            alt={song.title}
                            loading="lazy"
                            decoding="async"
                            referrerPolicy="no-referrer"
                            onError={(e) => handleCoverImageError(e, song)}
                            className="w-full h-full object-cover"
                          />
                          <div
                            className={`absolute inset-0 bg-black/40 flex items-center justify-center transition-opacity ${
                              isMobileSheet || isCurrent ? 'opacity-100' : 'opacity-0 group-hover:opacity-100'
                            }`}
                          >
                            {isCurrent && isPlaying ? (
                              <Pause className="w-4 h-4 text-[var(--primary)] fill-current" />
                            ) : (
                              <Play className="w-4 h-4 text-white fill-current ml-0.5" />
                            )}
                          </div>
                        </div>

                        <div className="min-w-0 flex-1">
                          <p className="text-xs sm:text-[13px] font-bold text-white truncate group-hover:text-[var(--primary)] transition-colors">
                            {highlightMatch(song.title, queryTrimmed)}
                          </p>
                          <div className="flex items-center gap-1.5 text-[11px] text-[var(--text-light)] truncate mt-0.5">
                            <span className="truncate">{highlightMatch(song.singers || song.artist, queryTrimmed)}</span>
                            <span aria-hidden="true">·</span>
                            <span className="text-[10px] text-[var(--primary)]/90 font-medium flex-shrink-0">
                              {song.source === 'youtube'
                                ? 'YouTube HD'
                                : song.source === 'saavn'
                                ? '320k Master'
                                : 'Hi-Fi'}
                            </span>
                          </div>
                        </div>
                      </div>

                      <div className="flex items-center gap-1 sm:gap-1.5 text-xs text-[var(--text-light)]/70 flex-shrink-0 ml-2">
                        {song.duration > 0 && (
                          <span className="hidden xs:inline font-mono text-[11px] tabular-nums mr-1">
                            {formatTime(song.duration)}
                          </span>
                        )}
                        {onAddToPlaylist && (
                          <button
                            type="button"
                            onClick={(e) => {
                              e.stopPropagation();
                              onAddToPlaylist(song);
                            }}
                            className="w-8 h-8 rounded-lg hover:bg-white/10 text-white/45 hover:text-[var(--primary)] flex items-center justify-center transition-colors cursor-pointer"
                            title="Add to playlist"
                          >
                            <Plus className="w-3.5 h-3.5" />
                          </button>
                        )}
                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            onToggleFavorite?.(song);
                          }}
                          className={`w-8 h-8 rounded-lg flex items-center justify-center transition-colors cursor-pointer ${
                            isFav ? 'text-red-400' : 'hover:text-red-400 text-white/40'
                          }`}
                          title={isFav ? 'Liked' : 'Like'}
                        >
                          <Heart className={`w-3.5 h-3.5 ${isFav ? 'fill-current' : ''}`} />
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>
      )}
    </>
  );

  return (
    <div ref={containerRef} className="relative w-full max-w-2xl" id="global-music-search">
      {/* ─────────────────────────────────────────────────────────────────
          MOBILE TRIGGER BAR (< 768px)
          Ergonomic 42px touch target with direct 1-tap Voice & Clear actions
      ───────────────────────────────────────────────────────────────── */}
      <div className="md:hidden w-full">
        <div
          role="button"
          tabIndex={0}
          onClick={() => setIsMobileSearchOpen(true)}
          onKeyDown={(e) => {
            if (e.key === 'Enter' || e.key === ' ') {
              e.preventDefault();
              setIsMobileSearchOpen(true);
            }
          }}
          className="w-full min-h-[42px] flex items-center justify-between gap-2 px-3 py-1.5 rounded-2xl bg-white/[0.07] hover:bg-white/[0.10] active:bg-white/[0.12] border border-white/10 hover:border-[var(--primary)]/30 shadow-inner transition-all group select-none cursor-pointer"
          title="Search songs, artists, top charts, or YouTube..."
        >
          <div className="flex items-center gap-2 min-w-0 flex-1">
            <Search className="w-4 h-4 text-[var(--primary)] flex-shrink-0" />
            <span className="text-xs truncate text-left text-[var(--text-light)]">
              {searchQuery ? (
                <span className="text-white font-semibold flex items-center gap-1.5 truncate">
                  <span className="text-[var(--primary)] truncate">"{searchQuery}"</span>
                  {searchFilter !== 'all' && (
                    <span className="text-[10px] text-white/50 uppercase font-mono flex-shrink-0">
                      · {currentFilterInfo.shortLabel}
                    </span>
                  )}
                </span>
              ) : (
                <span className="text-white/50">{currentFilterInfo.mobilePlaceholder}</span>
              )}
            </span>
          </div>

          <div className="flex items-center gap-1 flex-shrink-0">
            {(isLoading || isSearchingOnline) && (
              <div className="w-3.5 h-3.5 rounded-full border-2 border-[var(--primary)] border-t-transparent animate-spin mr-0.5" />
            )}
            {searchQuery && (
              <button
                type="button"
                onClick={handleClearSearch}
                className="w-7 h-7 rounded-full flex items-center justify-center text-white/65 hover:text-white bg-white/8 active:bg-white/15"
                title="Clear search"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            )}
            {speechSupported && (
              <button
                type="button"
                onClick={handleStartVoiceSearch}
                className={`w-7 h-7 rounded-full flex items-center justify-center transition-colors ${
                  isListening ? 'bg-red-500 text-white animate-pulse' : 'bg-white/5 text-[var(--primary)]'
                }`}
                title="Voice Search"
              >
                <Mic className="w-3.5 h-3.5" />
              </button>
            )}
          </div>
        </div>
      </div>

      {/* ─────────────────────────────────────────────────────────────────
          TABLET & DESKTOP SEARCH BAR (>= 768px)
      ───────────────────────────────────────────────────────────────── */}
      <div
        className={`hidden md:flex relative items-center rounded-2xl transition-all duration-200 ${
          isFocused || isOpen
            ? 'bg-[#151c22] border border-[var(--primary)] shadow-[0_0_24px_rgba(83,242,224,0.22)] ring-1 ring-[var(--primary)]/30'
            : 'bg-white/[0.06] hover:bg-white/[0.09] border border-white/10 hover:border-white/20 shadow-inner'
        }`}
      >
        {/* Scope Selector Button */}
        <div className="relative flex-shrink-0">
          <button
            type="button"
            onClick={() => setShowFilterMenu((prev) => !prev)}
            title={`Active Search Engine: ${currentFilterInfo.label}`}
            className="flex items-center gap-1.5 pl-3 pr-2 lg:pr-2.5 py-2.5 text-xs font-semibold text-[var(--text-light)] hover:text-white transition-all select-none rounded-l-2xl group cursor-pointer whitespace-nowrap"
          >
            <CurrentIcon className="w-4 h-4 text-[var(--primary)] group-hover:scale-110 transition-transform flex-shrink-0" />
            <span className="truncate max-w-[68px] lg:max-w-[96px] font-medium text-[var(--text)]">
              {currentFilterInfo.shortLabel || currentFilterInfo.label}
            </span>
            <ChevronDown
              className={`w-3.5 h-3.5 text-white/50 group-hover:text-white transition-transform duration-200 flex-shrink-0 ${
                showFilterMenu ? 'rotate-180 text-[var(--primary)]' : ''
              }`}
            />
          </button>

          {/* Filter Mode Dropdown Menu */}
          {showFilterMenu && (
            <div className="absolute top-full left-0 mt-2 w-64 rounded-2xl glass-card p-2 shadow-2xl z-50 border border-[var(--primary)]/30 animate-in fade-in zoom-in-95 duration-150">
              <div className="px-2.5 py-1.5 text-[10px] uppercase font-bold tracking-wider text-[var(--text-light)]/60 flex items-center justify-between">
                <span>Search Engine & Scope</span>
                <span className="text-[9px] text-[var(--primary)] font-mono">Hi-Fi 320k</span>
              </div>
              <div className="space-y-1 mt-1">
                {FILTER_MODES.map((mode) => {
                  const Icon = mode.icon;
                  const isSelected = searchFilter === mode.id;
                  return (
                    <button
                      key={mode.id}
                      type="button"
                      onClick={() => {
                        onSearchFilterChange(mode.id);
                        setShowFilterMenu(false);
                        inputRef.current?.focus();
                      }}
                      className={`w-full flex items-start gap-2.5 px-3 py-2 rounded-xl text-left transition-all cursor-pointer ${
                        isSelected
                          ? 'bg-[var(--primary)]/15 border border-[var(--primary)]/30 text-[var(--primary)] font-bold'
                          : 'text-[var(--text-light)] hover:text-white hover:bg-white/5 border border-transparent'
                      }`}
                    >
                      <Icon className={`w-4 h-4 mt-0.5 flex-shrink-0 ${isSelected ? 'text-[var(--primary)]' : 'opacity-70'}`} />
                      <div className="min-w-0 flex-1">
                        <div className="flex items-center justify-between text-xs">
                          <span className={isSelected ? 'text-[var(--primary)] font-semibold' : 'text-[var(--text)]'}>
                            {mode.label}
                          </span>
                          {isSelected && <Check className="w-3.5 h-3.5 text-[var(--primary)] flex-shrink-0" />}
                        </div>
                        <p className="text-[10px] text-[var(--text-light)]/70 line-clamp-1 mt-0.5 leading-tight">
                          {mode.desc}
                        </p>
                      </div>
                    </button>
                  );
                })}
              </div>
            </div>
          )}
        </div>

        {/* Vertical divider */}
        <div className="w-[1px] h-5 bg-white/10 flex-shrink-0 mx-0.5" />

        {/* Tablet & Desktop Input Area */}
        <div className="relative flex-1 flex items-center min-w-0">
          <Search
            className={`w-4 h-4 ml-2.5 flex-shrink-0 transition-colors ${
              isFocused ? 'text-[var(--primary)]' : 'text-white/40'
            }`}
          />
          <input
            ref={inputRef}
            type="text"
            value={searchQuery}
            onChange={handleInputChange}
            onFocus={() => {
              setIsFocused(true);
              setIsOpen(true);
            }}
            onBlur={() => setIsFocused(false)}
            onKeyDown={handleKeyDown}
            placeholder={currentFilterInfo.placeholder}
            className="w-full bg-transparent pl-2.5 pr-20 lg:pr-24 py-2.5 text-xs lg:text-sm text-[var(--text)] placeholder-white/40 focus:outline-none truncate"
            id="global-search-input"
            autoComplete="off"
            spellCheck="false"
          />

          {/* Right Action Icons */}
          <div className="absolute right-2 top-1/2 -translate-y-1/2 flex items-center gap-1">
            {(isLoading || isSearchingOnline) && (
              <div
                className="w-4 h-4 rounded-full border-2 border-[var(--primary)] border-t-transparent animate-spin"
                title="Searching music catalog in real-time..."
              />
            )}

            {speechSupported && (
              <button
                type="button"
                onClick={handleStartVoiceSearch}
                className={`p-1.5 rounded-lg transition-all cursor-pointer ${
                  isListening
                    ? 'bg-red-500/20 text-red-400 animate-pulse'
                    : 'text-white/40 hover:text-[var(--primary)] hover:bg-white/10'
                }`}
                title={isListening ? 'Listening...' : 'Voice Search'}
              >
                <Mic className="w-3.5 h-3.5" />
              </button>
            )}

            {searchQuery && (
              <button
                type="button"
                onClick={handleClearSearch}
                className="p-1 rounded-lg text-white/50 hover:text-white hover:bg-white/10 transition-all active:scale-90 cursor-pointer"
                title="Clear search"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            )}

            {!searchQuery && !isLoading && !isSearchingOnline && (
              <kbd className="hidden lg:inline-flex items-center gap-0.5 px-2 py-0.5 rounded-lg bg-white/5 border border-white/10 text-[10px] text-white/40 font-mono tracking-wider">
                <span className="text-[9px]">⌘</span>K
              </kbd>
            )}
          </div>
        </div>
      </div>

      {/* Active Filter Bar (Tablet & Desktop) */}
      {hasActiveFilters && (
        <div className="hidden md:flex items-center flex-wrap gap-1.5 mt-2 px-1">
          <span className="text-[10px] uppercase font-bold tracking-wider text-[var(--text-light)]/60 flex items-center gap-1">
            <SlidersHorizontal className="w-3 h-3 text-[var(--primary)]" /> Active:
          </span>

          {searchQuery && (
            <button
              type="button"
              onClick={() => onSearchChange('')}
              className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-lg bg-[var(--primary)]/15 border border-[var(--primary)]/30 text-[var(--primary)] text-[11px] font-medium hover:bg-[var(--primary)]/25 cursor-pointer"
              title="Clear query"
            >
              <span>"{searchQuery}"</span>
              <X className="w-3 h-3" />
            </button>
          )}

          {searchFilter !== 'all' && (
            <button
              type="button"
              onClick={() => onSearchFilterChange('all')}
              className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-lg bg-white/10 border border-white/15 text-[var(--text-light)] text-[11px] hover:text-white cursor-pointer"
              title="Reset scope"
            >
              <span>Scope: {currentFilterInfo.label}</span>
              <X className="w-3 h-3" />
            </button>
          )}

          {selectedGenre && selectedGenre !== 'All' && (
            <button
              type="button"
              onClick={() => onSelectGenre('All')}
              className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-lg bg-[var(--accent)]/20 border border-[var(--accent)]/30 text-[var(--accent)] text-[11px] font-medium cursor-pointer"
              title="Clear genre"
            >
              <span>Genre: {selectedGenre}</span>
              <X className="w-3 h-3" />
            </button>
          )}

          {selectedArtist && (
            <button
              type="button"
              onClick={() => onSelectArtist(null)}
              className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-lg bg-amber-500/20 border border-amber-500/30 text-amber-300 text-[11px] font-medium cursor-pointer"
              title="Clear artist"
            >
              <span>Artist: {selectedArtist}</span>
              <X className="w-3 h-3" />
            </button>
          )}

          <button
            type="button"
            onClick={() => {
              onSearchChange('');
              onSearchFilterChange('all');
              if (onSelectGenre) onSelectGenre('All');
              if (onSelectArtist) onSelectArtist(null);
            }}
            className="text-[10px] text-red-400/80 hover:text-red-300 underline font-medium ml-1 transition-colors cursor-pointer"
          >
            Clear all
          </button>
        </div>
      )}

      {/* ─────────────────────────────────────────────────────────────────
          TABLET & DESKTOP COMMAND PALETTE DROPDOWN (>= 768px)
          Spans full readable width on md tablets and wide 44rem panel on lg+
      ───────────────────────────────────────────────────────────────── */}
      {isOpen && !isMobileViewport && (
        <div className="hidden md:flex md:fixed md:left-4 md:right-4 md:top-[64px] lg:absolute lg:top-full lg:left-0 lg:right-auto lg:w-[min(44rem,calc(100vw-3rem))] mt-2 rounded-2xl glass-card shadow-[0_24px_60px_rgba(0,0,0,0.85)] border border-[var(--primary)]/30 z-50 overflow-hidden max-h-[78vh] flex-col animate-in fade-in slide-in-from-top-2 duration-150">
          {/* Header Bar */}
          <div className="px-4 py-2.5 bg-white/5 border-b border-white/10 flex items-center justify-between text-xs text-[var(--text-light)]">
            <span className="font-semibold text-[var(--text)] flex items-center gap-1.5 truncate">
              <Sparkles className="w-3.5 h-3.5 text-[var(--primary)] flex-shrink-0" />
              <span className="truncate">
                {queryTrimmed
                  ? `Results for "${searchQuery}" (${allMergedResults.length} tracks)`
                  : 'Universal Music Search & Discovery'}
              </span>
            </span>
            <span className="text-[10px] flex items-center gap-1.5 flex-shrink-0 ml-2">
              {isSearchingOnline ? (
                <span className="text-[var(--primary)] font-semibold flex items-center gap-1.5">
                  <span className="w-1.5 h-1.5 rounded-full bg-[var(--primary)] animate-ping" />
                  Live Searching...
                </span>
              ) : (
                <span>
                  Scope: <strong className="text-[var(--primary)]">{currentFilterInfo.label}</strong>
                </span>
              )}
            </span>
          </div>

          {/* Quick Scope Switcher Tabs */}
          <div className="px-3 py-2 bg-black/30 border-b border-white/10 flex items-center gap-1.5 overflow-x-auto scrollbar-none">
            {FILTER_MODES.map((mode) => {
              const Icon = mode.icon;
              const isSelected = searchFilter === mode.id;
              return (
                <button
                  key={mode.id}
                  type="button"
                  onClick={() => {
                    onSearchFilterChange(mode.id);
                    inputRef.current?.focus();
                  }}
                  className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-medium whitespace-nowrap transition-all cursor-pointer ${
                    isSelected
                      ? 'bg-[var(--primary)] text-[var(--bg)] font-bold shadow-[0_0_12px_rgba(83,242,224,0.3)]'
                      : 'bg-white/5 hover:bg-white/10 text-[var(--text-light)] hover:text-white border border-white/5'
                  }`}
                >
                  <Icon className={`w-3.5 h-3.5 ${isSelected ? 'text-[var(--bg)]' : 'text-[var(--primary)]'}`} />
                  <span>{mode.shortLabel || mode.label}</span>
                </button>
              );
            })}
          </div>

          {/* Scrollable Results Body */}
          <div ref={resultsScrollRef} className="overflow-y-auto p-3.5 flex-1 custom-scrollbar">
            {renderSearchContent(false)}
          </div>

          {/* Footer Bar */}
          {allMergedResults.length > 0 && onViewAllResults && (
            <div className="px-4 py-2.5 bg-white/5 border-t border-white/10 flex items-center justify-between gap-2">
              <span className="text-[11px] text-[var(--text-light)] hidden sm:inline">
                Use <kbd className="px-1.5 py-0.5 bg-white/10 rounded font-mono text-[10px]">↑↓</kbd> to navigate,{' '}
                <kbd className="px-1.5 py-0.5 bg-white/10 rounded font-mono text-[10px]">Enter</kbd> to play
              </span>
              <button
                type="button"
                onClick={handleTriggerViewAll}
                className="text-xs font-bold text-[var(--primary)] hover:underline flex items-center gap-1 ml-auto cursor-pointer"
              >
                <span>View all {allMergedResults.length} results in Explore</span>
                <ChevronRight className="w-3.5 h-3.5" />
              </button>
            </div>
          )}
        </div>
      )}

      {/* ─────────────────────────────────────────────────────────────────
          MOBILE FULL-SCREEN SEARCH VIEW (< 768px)
          Safe-area aware, 44px touch targets, voice search & sticky CTA
      ───────────────────────────────────────────────────────────────── */}
      {isMobileSearchOpen && (
        <div
          className="fixed inset-0 z-[100] h-[100dvh] bg-[#0b0f12] flex flex-col animate-in fade-in slide-in-from-top-2 duration-150"
          id="mobile-search-fullscreen"
        >
          {/* Top Bar: Back Button, Search Input, Voice Mic, and Scope Strip */}
          <div className="relative z-10 px-3 pt-[max(env(safe-area-inset-top),10px)] pb-2.5 bg-[#0c1013]/95 backdrop-blur-2xl border-b border-white/10 flex flex-col gap-2 flex-shrink-0">
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => setIsMobileSearchOpen(false)}
                className="w-11 h-11 rounded-2xl bg-white/[0.06] active:bg-white/15 flex items-center justify-center text-white transition-all flex-shrink-0"
                title="Back"
                aria-label="Close search"
              >
                <ArrowLeft className="w-5 h-5" />
              </button>

              <div className="flex-1 relative flex items-center bg-white/[0.08] rounded-2xl border border-[var(--primary)]/45 shadow-[0_0_16px_rgba(83,242,224,0.14)] min-w-0">
                <Search className="w-4 h-4 ml-3 text-[var(--primary)] flex-shrink-0" />
                <input
                  ref={mobileInputRef}
                  type="text"
                  value={searchQuery}
                  onChange={(e) => onSearchChange(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') {
                      if (topResult) {
                        handleSelectSong(topResult);
                      } else if (searchQuery?.trim()) {
                        handleTriggerViewAll();
                      }
                    }
                  }}
                  placeholder={currentFilterInfo.mobilePlaceholder}
                  className="w-full bg-transparent pl-2.5 pr-20 py-2.5 text-base text-white placeholder-white/40 focus:outline-none"
                  autoComplete="off"
                  autoCorrect="off"
                  autoCapitalize="off"
                  spellCheck="false"
                />

                <div className="absolute right-1.5 flex items-center gap-1">
                  {(isLoading || isSearchingOnline) && (
                    <div className="w-4 h-4 rounded-full border-2 border-[var(--primary)] border-t-transparent animate-spin mr-0.5" />
                  )}

                  {searchQuery && (
                    <button
                      type="button"
                      onClick={handleClearSearch}
                      className="w-8 h-8 rounded-xl bg-white/10 active:bg-white/20 flex items-center justify-center text-white/80"
                      title="Clear search"
                    >
                      <X className="w-4 h-4" />
                    </button>
                  )}

                  {speechSupported && (
                    <button
                      type="button"
                      onClick={handleStartVoiceSearch}
                      className={`w-8 h-8 rounded-xl flex items-center justify-center transition-all ${
                        isListening
                          ? 'bg-red-500 text-white shadow-[0_0_12px_rgba(239,68,68,0.8)] animate-pulse'
                          : 'bg-white/5 active:bg-[var(--primary)]/20 text-[var(--primary)]'
                      }`}
                      title={isListening ? 'Listening...' : 'Voice Search'}
                    >
                      <Mic className="w-4 h-4" />
                    </button>
                  )}
                </div>
              </div>
            </div>

            {isListening && (
              <div className="flex items-center justify-between px-3 py-1.5 rounded-xl bg-red-500/15 border border-red-500/30 text-xs text-red-300">
                <div className="flex items-center gap-2">
                  <span className="w-2 h-2 rounded-full bg-red-400 animate-ping" />
                  <span className="font-semibold">Listening... say a song or artist name</span>
                </div>
                <button
                  type="button"
                  onClick={() => setIsListening(false)}
                  className="text-[11px] text-red-300 underline font-medium"
                >
                  Cancel
                </button>
              </div>
            )}

            {/* Horizontal Scope Switcher */}
            <div className="flex items-center gap-1.5 overflow-x-auto pb-0.5 scrollbar-none">
              {FILTER_MODES.map((mode) => {
                const Icon = mode.icon;
                const isSelected = searchFilter === mode.id;
                return (
                  <button
                    key={mode.id}
                    type="button"
                    onClick={() => {
                      onSearchFilterChange(mode.id);
                      mobileInputRef.current?.focus();
                    }}
                    className={`min-h-[36px] flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold whitespace-nowrap transition-all select-none active:scale-95 ${
                      isSelected
                        ? 'bg-[var(--primary)] text-[var(--bg)] font-bold shadow-[0_0_12px_rgba(83,242,224,0.35)]'
                        : 'bg-white/[0.05] text-[var(--text-light)] border border-white/10'
                    }`}
                  >
                    <Icon className={`w-3.5 h-3.5 ${isSelected ? 'text-[var(--bg)]' : 'text-[var(--primary)]'}`} />
                    <span>{mode.shortLabel || mode.label}</span>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Scrollable Results Content */}
          <div className="flex-1 overflow-y-auto overscroll-contain px-3 py-3 pb-28">
            {renderSearchContent(true)}
          </div>

          {/* Sticky Mobile Bottom CTA when query has matches */}
          {queryTrimmed && allMergedResults.length > 0 && onViewAllResults && (
            <div className="p-3 pb-[max(env(safe-area-inset-bottom),12px)] bg-[#0c1013]/95 backdrop-blur-xl border-t border-white/10 flex-shrink-0">
              <button
                type="button"
                onClick={handleTriggerViewAll}
                className="w-full h-11 rounded-2xl bg-[var(--primary)] text-[var(--bg)] font-extrabold text-xs flex items-center justify-center gap-1.5 shadow-[0_0_20px_rgba(83,242,224,0.3)] active:scale-[0.98] transition-transform"
              >
                <span>View All {allMergedResults.length} Results in Explore</span>
                <ChevronRight className="w-4 h-4" />
              </button>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
