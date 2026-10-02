import React, { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import {
  auth,
  logoutUser,
  subscribeToUserProfile,
  subscribeToLikedSongs,
  toggleCloudLikeSong,
  sanitizeSongForStorage,
  subscribeToUserPlaylists,
  saveCloudPlaylist,
  deleteCloudPlaylist,
  addSongToCloudPlaylist,
  removeSongFromCloudPlaylist,
  subscribeToPlayHistory,
  recordSongPlay,
  subscribeToSearchHistory,
  recordSearchQuery,
  removeSearchHistoryItem,
  clearSearchHistory,
  subscribeToPodcastSubscriptions,
  togglePodcastSubscription,
} from './firebase';
import { onAuthStateChanged } from 'firebase/auth';
import AuthGate from './components/AuthGate';
import UserProfileView from './components/UserProfileView';
import PodcastsView from './components/PodcastsView';
import GlobalSearch from './components/GlobalSearch';
import MusicPlayerPage from './components/MusicPlayerPage';
import PlayerBar from './components/PlayerBar';
import Playlists, { AddToPlaylistModal } from './components/Playlists';
import SongCard from './components/SongCard';
import EditModal from './components/EditModal';
import ArtistCard from './components/ArtistCard';
import ExplorePodcastsSection from './components/ExplorePodcastsSection';
import Sidebar from './components/Sidebar';
import { APP_LOGO_URL } from './config/env';
import { mediaUrl, handleCoverImageError, formatTime, normalizeSong } from './utils/musicUtils';
import {
  AlertCircle,
  CheckCircle2,
  Loader2,
  Music2,
  X,
  Compass,
} from 'lucide-react';
import {
  Fire,
  Broadcast,
  VinylRecord,
  Heart as PhHeart,
  Playlist,
  MicrophoneStage,
  UserCircle,
  Stack,
  SquaresFour,
  ListBullets,
  SlidersHorizontal as PhSliders,
  ArrowsClockwise,
  Sparkle,
  Crown,
  Waveform,
  Compass as PhCompass,
  MusicNotes,
  SignOut,
  CaretDown,
  CaretRight,
  Play as PhPlay,
  Pause as PhPause,
  MagnifyingGlass,
  Tag as PhTag,
  TrendUp,
  ArrowUp,
} from '@phosphor-icons/react';
import {
  getUnifiedTrendingTracks,
  searchUnifiedMusic,
  getLocalUserTracks,
  saveLocalUserTrack,
  deleteLocalUserTrack,
} from './services/musicService';

const AUDIUS_GENRES = [
  'All',
  'Global Hits',
  'Pop',
  'Latin',
  'K-Pop',
  'Afrobeats',
  'Hip-Hop/Rap',
  'Electronic',
  'EDM',
  'R&B/Soul',
  'Rock',
  'Indie',
  'Lo-Fi',
  'Acoustic',
  'Dance',
  'Deep House',
  'World',
  'Punjabi',
  'Classical',
  'Ambient',
];

const POPULAR_SEARCHES = [
  'APT. - ROSÉ & Bruno Mars',
  'Birds of a Feather - Billie Eilish',
  'Die With A Smile - Lady Gaga & Bruno Mars',
  'Espresso - Sabrina Carpenter',
  'Not Like Us - Kendrick Lamar',
  'Lose Control - Teddy Swims',
  'Water - Tyla',
  'Bad Bunny',
  'Coldplay',
  'Diljit Dosanjh',
  'Arijit Singh',
  'Lo-Fi Chill Beats',
];

// ─── Main App Component ────────────────────────────────────────────────────────
export default function App() {
  const [currentUser, setCurrentUser] = useState(null);
  const [authLoading, setAuthLoading] = useState(true);

  // Main navigation & state
  const [view, setView] = useState('explore'); // 'explore', 'favorites', 'playlists', 'artists', 'profile'
  const [sidebarOpen, setSidebarOpen] = useState(() => {
    if (typeof window === 'undefined') return true;
    const saved = localStorage.getItem('azaad_sidebar_open');
    if (saved !== null) return saved === 'true';
    return window.matchMedia('(min-width: 1024px)').matches;
  });

  useEffect(() => {
    if (typeof window !== 'undefined') {
      localStorage.setItem('azaad_sidebar_open', String(sidebarOpen));
    }
  }, [sidebarOpen]);

  // Songs & Audius Catalog State
  const [songs, setSongs] = useState([]);
  const [trendingTracks, setTrendingTracks] = useState([]);
  const [selectedGenre, setSelectedGenre] = useState('All');
  const [selectedTime, setSelectedTime] = useState('week'); // 'week', 'month', 'allTime'
  const [initLoading, setInitLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [searchQuery, setSearchQuery] = useState('');
  const [searchFilter, setSearchFilter] = useState('all'); // 'all' | 'title' | 'artist' | 'genre'
  const [debouncedQuery, setDebouncedQuery] = useState('');
  const [viewMode, setViewMode] = useState(() => {
    try {
      const saved = localStorage.getItem('azaad_view_mode');
      return saved && ['shelves', 'grid', 'list'].includes(saved) ? saved : 'shelves';
    } catch {
      return 'shelves';
    }
  });
  const [sortBy, setSortBy] = useState('trending'); // 'trending', 'popular', 'title', 'artist', 'duration'

  useEffect(() => {
    try {
      localStorage.setItem('azaad_view_mode', viewMode);
    } catch {
      /* ignore */
    }
  }, [viewMode]);

  // Player & Favorites
  const [currentSong, setCurrentSong] = useState(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [editSong, setEditSong] = useState(null);
  const [editLoading, setEditLoading] = useState(false);
  const [selectedArtist, setSelectedArtist] = useState(null);
  const [favorites, setFavorites] = useState([]);
  const [likedSongsList, setLikedSongsList] = useState([]);

  // True only for real Firebase-authenticated accounts (never for Guest sessions)
  const isCloudUser = Boolean(
    currentUser && !currentUser.isAnonymous && !String(currentUser.uid || '').startsWith('guest-')
  );

  // Purge legacy unscoped localStorage keys so guest sessions never inherit a logged-in user's data
  useEffect(() => {
    try {
      localStorage.removeItem('azaad_favorites');
      localStorage.removeItem('azaad_liked_songs_data');
      localStorage.removeItem('azaad_local_playlists');
      localStorage.removeItem('azaad_podcast_subscriptions');
    } catch {
      /* ignore */
    }
  }, []);

  // Playlists
  const [playlists, setPlaylists] = useState([]);
  const [playlistsLoading, setPlaylistsLoading] = useState(false);
  const [showCreatePlaylist, setShowCreatePlaylist] = useState(false);
  const [activePlaylist, setActivePlaylist] = useState(null);
  const [addToPlaylistSong, setAddToPlaylistSong] = useState(null);

  const successTimer = useRef(null);
  const errorTimer = useRef(null);
  const clientSearchCache = useRef(new Map());
  const [userMenuOpen, setUserMenuOpen] = useState(false);
  const userMenuRef = useRef(null);

  const showSuccess = useCallback((message, timeout = 2500) => {
    if (successTimer.current) clearTimeout(successTimer.current);
    setSuccess(message);
    successTimer.current = setTimeout(() => setSuccess(''), timeout);
  }, []);

  const showError = useCallback((message, timeout = 3500) => {
    if (errorTimer.current) clearTimeout(errorTimer.current);
    setError(message);
    errorTimer.current = setTimeout(() => setError(''), timeout);
  }, []);

  useEffect(() => {
    const handleOutsideClick = (e) => {
      if (userMenuRef.current && !userMenuRef.current.contains(e.target)) {
        setUserMenuOpen(false);
      }
    };
    document.addEventListener('mousedown', handleOutsideClick);
    return () => document.removeEventListener('mousedown', handleOutsideClick);
  }, []);

  // Listen to Firebase Auth state
  useEffect(() => {
    if (!auth) {
      setAuthLoading(false);
      return;
    }
    const unsubscribe = onAuthStateChanged(auth, (user) => {
      setCurrentUser(user);
      setAuthLoading(false);
    });
    return () => unsubscribe();
  }, []);

  // Real-time Cloud Sync for Liked Songs (strictly isolated per authenticated user)
  useEffect(() => {
    if (!isCloudUser || !currentUser?.uid) {
      setFavorites([]);
      setLikedSongsList([]);
      return;
    }
    const uid = currentUser.uid;
    try {
      const cachedSongs = localStorage.getItem(`azaad_liked_songs_${uid}`);
      const cachedIds = localStorage.getItem(`azaad_favorites_${uid}`);
      if (cachedSongs) {
        const parsed = JSON.parse(cachedSongs);
        if (Array.isArray(parsed)) setLikedSongsList(parsed);
      } else {
        setLikedSongsList([]);
      }
      if (cachedIds) {
        const parsedIds = JSON.parse(cachedIds);
        if (Array.isArray(parsedIds)) setFavorites(parsedIds);
      } else {
        setFavorites([]);
      }
    } catch {
      setFavorites([]);
      setLikedSongsList([]);
    }

    const unsubscribe = subscribeToLikedSongs(uid, (cloudLiked) => {
      if (Array.isArray(cloudLiked)) {
        const normalized = cloudLiked.map(normalizeSong).filter(Boolean);
        setLikedSongsList(normalized);
        const ids = normalized.map((item) => String(item.id || item.songId));
        setFavorites(ids);
        try {
          localStorage.setItem(`azaad_favorites_${uid}`, JSON.stringify(ids));
          localStorage.setItem(`azaad_liked_songs_${uid}`, JSON.stringify(normalized));
        } catch {
          /* ignore */
        }
      }
    });
    return () => unsubscribe();
  }, [isCloudUser, currentUser?.uid]);

  // Real-time Cloud Sync for User Playlists (strictly isolated per authenticated user)
  useEffect(() => {
    if (!isCloudUser || !currentUser?.uid) {
      setPlaylists([]);
      setActivePlaylist(null);
      setPlaylistsLoading(false);
      return;
    }
    setPlaylistsLoading(true);
    const unsubscribe = subscribeToUserPlaylists(
      currentUser.uid,
      (cloudPlaylists) => {
        setPlaylists(cloudPlaylists);
        setActivePlaylist((prev) => {
          if (!prev) return null;
          return cloudPlaylists.find((p) => p.id === prev.id) || prev;
        });
        setPlaylistsLoading(false);
      },
      () => setPlaylistsLoading(false)
    );
    return () => unsubscribe();
  }, [isCloudUser, currentUser?.uid]);

  // Real-time Cloud Sync for User Profile
  const [userProfile, setUserProfile] = useState(null);
  useEffect(() => {
    if (!isCloudUser || !currentUser?.uid) {
      setUserProfile(null);
      return;
    }
    const unsubscribe = subscribeToUserProfile(currentUser.uid, (profileData) => {
      setUserProfile(profileData);
    });
    return () => unsubscribe();
  }, [isCloudUser, currentUser?.uid]);

  // Real-time Cloud Sync for Played Songs History
  const [playHistory, setPlayHistory] = useState([]);
  useEffect(() => {
    if (!isCloudUser || !currentUser?.uid) {
      setPlayHistory([]);
      return;
    }
    const unsubscribe = subscribeToPlayHistory(currentUser.uid, (history) => {
      setPlayHistory(history);
    });
    return () => unsubscribe();
  }, [isCloudUser, currentUser?.uid]);

  // Real-time Cloud Sync for Search History
  const [searchHistory, setSearchHistory] = useState([]);
  useEffect(() => {
    if (!isCloudUser || !currentUser?.uid) {
      setSearchHistory([]);
      return;
    }
    const unsubscribe = subscribeToSearchHistory(currentUser.uid, (history) => {
      setSearchHistory(history);
    });
    return () => unsubscribe();
  }, [isCloudUser, currentUser?.uid]);

  // Real-time Cloud Sync for Podcast Subscriptions
  const [subscribedSeries, setSubscribedSeries] = useState([]);

  useEffect(() => {
    if (!isCloudUser || !currentUser?.uid) {
      setSubscribedSeries([]);
      return;
    }
    const uid = currentUser.uid;
    const unsubscribe = subscribeToPodcastSubscriptions(uid, (subs) => {
      setSubscribedSeries(subs);
      try {
        localStorage.setItem(`azaad_podcast_subscriptions_${uid}`, JSON.stringify(subs));
      } catch (e) {}
    });
    return () => unsubscribe();
  }, [isCloudUser, currentUser?.uid]);

  const handleTogglePodcastSubscription = useCallback(async (series) => {
    if (!series) return;
    const seriesId = String(series.id || series.seriesId);
    const isAlreadySubbed = subscribedSeries.some((s) => String(s.id || s.seriesId) === seriesId);

    // Optimistic local update
    setSubscribedSeries((prev) => {
      const next = isAlreadySubbed
        ? prev.filter((s) => String(s.id || s.seriesId) !== seriesId)
        : [
            ...prev,
            {
              id: seriesId,
              seriesId,
              title: series.title,
              host: series.host,
              coverUrl: series.coverUrl,
              category: series.category,
            },
          ];
      if (isCloudUser && currentUser?.uid) {
        try {
          localStorage.setItem(`azaad_podcast_subscriptions_${currentUser.uid}`, JSON.stringify(next));
        } catch (e) {}
      }
      return next;
    });

    if (isCloudUser && currentUser?.uid) {
      try {
        const isNowSubscribed = await togglePodcastSubscription(currentUser.uid, series);
        showSuccess(
          isNowSubscribed ? `Subscribed to ${series.title}!` : `Unsubscribed from ${series.title}`,
          2000
        );
      } catch (e) {
        showError('Could not sync subscription to cloud');
      }
    } else {
      showSuccess(
        isAlreadySubbed ? `Unsubscribed from ${series.title}` : `Subscribed to ${series.title}!`,
        2000
      );
    }
  }, [isCloudUser, currentUser, subscribedSeries, showSuccess, showError]);

  // Fast debounce search query (260ms)
  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedQuery(searchQuery);
    }, 260);
    return () => clearTimeout(timer);
  }, [searchQuery]);

  // Cloud & Local Sync for Favorites
  const toggleFavorite = async (songOrId) => {
    if (!songOrId) return;

    let targetSong = null;
    let songId = '';

    if (typeof songOrId === 'object' && songOrId !== null) {
      targetSong = normalizeSong(songOrId);
      songId = String(targetSong.id || targetSong.songId);
    } else {
      songId = String(songOrId);
      const found =
        songs.find((s) => String(s.id || s.songId) === songId) ||
        likedSongsList.find((s) => String(s.id || s.songId) === songId) ||
        (currentSong && String(currentSong.id || currentSong.songId) === songId ? currentSong : null);
      targetSong = normalizeSong(found || { id: songId, songId, title: 'Track' });
    }

    const cleanSong = sanitizeSongForStorage(targetSong) || targetSong;
    const isCurrentlyFav = favorites.includes(songId);

    // Update state immediately for instant feedback (scoped to user if authenticated)
    setFavorites((prev) => {
      const updated = prev.includes(songId) ? prev.filter((id) => id !== songId) : [...prev, songId];
      if (isCloudUser && currentUser?.uid) {
        try {
          localStorage.setItem(`azaad_favorites_${currentUser.uid}`, JSON.stringify(updated));
        } catch {
          /* ignore */
        }
      }
      return updated;
    });

    setLikedSongsList((prev) => {
      let updated;
      if (isCurrentlyFav) {
        updated = prev.filter((s) => String(s.id || s.songId) !== songId);
      } else {
        const exists = prev.some((s) => String(s.id || s.songId) === songId);
        updated = exists ? prev : [cleanSong, ...prev];
      }
      if (isCloudUser && currentUser?.uid) {
        try {
          localStorage.setItem(`azaad_liked_songs_${currentUser.uid}`, JSON.stringify(updated));
        } catch {
          /* ignore */
        }
      }
      return updated;
    });

    if (isCloudUser && currentUser?.uid) {
      try {
        const isLikedNow = await toggleCloudLikeSong(currentUser.uid, cleanSong);
        showSuccess(isLikedNow ? 'Saved to your cloud Liked Songs' : 'Removed from Liked Songs', 1800);
      } catch (err) {
        console.warn('Cloud like sync error:', err.message);
      }
    } else {
      showSuccess(isCurrentlyFav ? 'Removed from guest favorites' : 'Saved to guest favorites', 1800);
    }
  };

  // Fetch Music Tracks (Audius + Universal Catalog) with Client Caching & Hourly Freshness
  const fetchAudiusTracks = useCallback(
    async (genre = selectedGenre, query = debouncedQuery, time = selectedTime, forceRefresh = false) => {
      const cleanQuery = (query || '').trim();
      const cacheKey = `${genre}:${cleanQuery.toLowerCase()}:${time}:${searchFilter}`;
      if (!forceRefresh && clientSearchCache.current.has(cacheKey)) {
        const cached = clientSearchCache.current.get(cacheKey);
        setSongs(cached);
        if (!cleanQuery) setTrendingTracks(cached);
        setInitLoading(false);
        return;
      }

      setInitLoading(true);
      setError('');
      try {
        let rawList = [];
        if (cleanQuery) {
          rawList = await searchUnifiedMusic(cleanQuery, searchFilter);
        } else {
          rawList = await getUnifiedTrendingTracks(genre, time, forceRefresh);
        }

        const seenNormIds = new Set();
        const normalized = [];
        for (let idx = 0; idx < rawList.length; idx++) {
          const item = rawList[idx];
          if (!item) continue;
          const s = normalizeSong(item, idx);
          if (!s || !s.id || seenNormIds.has(s.id)) continue;
          seenNormIds.add(s.id);
          normalized.push(s);
        }

        clientSearchCache.current.set(cacheKey, normalized);
        setSongs(normalized);
        if (!cleanQuery) {
          setTrendingTracks(normalized);
        }
      } catch {
        // Fallback silently without throwing unhandled applet errors
        const fallback = getLocalUserTracks ? await getLocalUserTracks().catch(() => []) : [];
        if (fallback && fallback.length > 0) {
          setSongs(fallback);
        }
      } finally {
        setInitLoading(false);
      }
    },
    [selectedGenre, debouncedQuery, selectedTime, searchFilter]
  );

  const [lastExploreRefreshTime, setLastExploreRefreshTime] = useState(() => {
    try {
      const saved = localStorage.getItem('azaad_last_explore_refresh');
      return saved ? Number(saved) : Date.now();
    } catch {
      return Date.now();
    }
  });
  const [isRefreshingExplore, setIsRefreshingExplore] = useState(false);

  // Minutes left until next hourly auto-update
  const nextRefreshMinutes = useMemo(() => {
    const ONE_HOUR = 60 * 60 * 1000;
    const elapsed = Date.now() - (lastExploreRefreshTime || Date.now());
    const remainingMs = Math.max(0, ONE_HOUR - elapsed);
    return Math.max(1, Math.ceil(remainingMs / (60 * 1000)));
  }, [lastExploreRefreshTime, isRefreshingExplore]);

  // Manual Trigger to refresh explore
  const handleManualExploreRefresh = useCallback(async () => {
    setIsRefreshingExplore(true);
    clientSearchCache.current.clear();
    const now = Date.now();
    try {
      await fetchAudiusTracks(selectedGenre, '', selectedTime, true);
      localStorage.setItem('azaad_last_explore_refresh', String(now));
      setLastExploreRefreshTime(now);
      showSuccess('Explore refreshed with new trending songs');
    } finally {
      setIsRefreshingExplore(false);
    }
  }, [fetchAudiusTracks, selectedGenre, selectedTime]);

  // Hourly (every 1h = 3600000ms) Auto-Update Interval for Explore Section
  useEffect(() => {
    const ONE_HOUR = 60 * 60 * 1000;

    const checkHourlyRefresh = () => {
      const now = Date.now();
      const last = Number(localStorage.getItem('azaad_last_explore_refresh') || '0');
      if (!last || now - last >= ONE_HOUR) {
        setIsRefreshingExplore(true);
        clientSearchCache.current.clear();
        fetchAudiusTracks(selectedGenre, '', selectedTime, true)
          .finally(() => {
            setIsRefreshingExplore(false);
            localStorage.setItem('azaad_last_explore_refresh', String(now));
            setLastExploreRefreshTime(now);
          });
      }
    };

    // Check on mount
    checkHourlyRefresh();

    // Check periodically every minute if 1 hour has elapsed
    const timer = setInterval(() => {
      checkHourlyRefresh();
    }, 60 * 1000);

    return () => clearInterval(timer);
  }, [fetchAudiusTracks, selectedGenre, selectedTime]);

  useEffect(() => {
    fetchAudiusTracks(selectedGenre, debouncedQuery, selectedTime);
  }, [fetchAudiusTracks, selectedGenre, debouncedQuery, selectedTime]);

  // Derive artists from songs
  const artists = useMemo(() => {
    const map = {};
    songs.forEach((song) => {
      const name = song.artist || 'Unknown';
      if (!map[name]) {
        map[name] = { name, count: 0, coverUrl: song.coverUrl };
      }
      map[name].count += 1;
      if (!map[name].coverUrl && song.coverUrl) {
        map[name].coverUrl = song.coverUrl;
      }
    });
    return Object.values(map).sort((a, b) => b.count - a.count);
  }, [songs]);

  // Real-time filtered song list across library
  const filteredSongs = useMemo(() => {
    let list = songs;

    if (searchQuery.trim()) {
      const q = searchQuery.trim().toLowerCase();
      const tokens = q.split(/\s+/).filter(Boolean);

      list = list.filter((s) => {
        const title = (s.title || '').toLowerCase();
        const artist = (s.artist || s.singers || '').toLowerCase();
        const genre = (s.genre || s.category || '').toLowerCase();
        const fullCorpus = `${title} ${artist} ${genre} ${s.album || ''} ${s.vibe || ''}`;

        if (searchFilter === 'charts' || searchFilter === 'saavn') {
          const isChart =
            s.source === 'saavn' ||
            s.isFullSong ||
            s.playCount > 30000 ||
            (s.vibe && (s.vibe.includes('Hit') || s.vibe.includes('Viral') || s.vibe.includes('Chart')));
          return isChart && tokens.every((tok) => fullCorpus.includes(tok));
        }
        if (searchFilter === 'youtube') {
          const isYt = s.source === 'youtube' || Boolean(s.videoId) || Boolean(s.youtubeId);
          return isYt && tokens.every((tok) => fullCorpus.includes(tok));
        }
        if (searchFilter === 'title') {
          return tokens.every((tok) => title.includes(tok));
        }
        if (searchFilter === 'artist') {
          return tokens.every((tok) => artist.includes(tok));
        }
        if (searchFilter === 'genre') {
          return tokens.every((tok) => genre.includes(tok));
        }
        return tokens.every((tok) => fullCorpus.includes(tok));
      });
    }

    if (selectedArtist) {
      list = list.filter(
        (s) =>
          (s.artist && s.artist.toLowerCase() === selectedArtist.toLowerCase()) ||
          (s.singers && s.singers.toLowerCase().includes(selectedArtist.toLowerCase()))
      );
    }
    if (selectedGenre && selectedGenre !== 'All') {
      list = list.filter(
        (s) =>
          (s.genre || '').toLowerCase() === selectedGenre.toLowerCase() ||
          (s.category || '').toLowerCase() === selectedGenre.toLowerCase()
      );
    }
    if (view === 'favorites') {
      const allKnownFavorites = [...likedSongsList];
      for (const s of songs) {
        const sId = String(s.id || s.songId);
        if (favorites.includes(sId) && !allKnownFavorites.some((f) => String(f.id || f.songId) === sId)) {
          allKnownFavorites.push(s);
        }
      }
      list = allKnownFavorites.filter((s) => favorites.includes(String(s.id || s.songId)));
    }

    // Guarantee strictly unique track IDs to prevent duplicate React keys
    const seenFilterIds = new Set();
    const uniqueList = [];
    for (const item of list) {
      if (!item || !item.id || seenFilterIds.has(item.id)) continue;
      seenFilterIds.add(item.id);
      uniqueList.push(item);
    }

    // Apply active sort order
    if (sortBy === 'popular') {
      uniqueList.sort((a, b) => (b.playCount || 0) - (a.playCount || 0));
    } else if (sortBy === 'title') {
      uniqueList.sort((a, b) => (a.title || '').localeCompare(b.title || ''));
    } else if (sortBy === 'artist') {
      uniqueList.sort((a, b) => (a.singers || a.artist || '').localeCompare(b.singers || b.artist || ''));
    } else if (sortBy === 'duration') {
      uniqueList.sort((a, b) => (b.duration || 0) - (a.duration || 0));
    }

    return uniqueList;
  }, [songs, searchQuery, searchFilter, selectedArtist, selectedGenre, view, favorites, likedSongsList, sortBy]);

  // Group songs by genre for organized shelves view
  const genreShelves = useMemo(() => {
    if (!songs || songs.length === 0) return [];
    const grouped = {};
    const popularCategories = ['Pop', 'Hip-Hop/Rap', 'Electronic', 'Rock', 'Acoustic', 'Lo-Fi', 'Latin', 'R&B/Soul', 'World', 'Punjabi'];

    for (const song of songs) {
      const g = song.genre || song.category || 'Pop';
      if (!grouped[g]) grouped[g] = [];
      grouped[g].push(song);
    }

    const shelves = [];
    for (const cat of popularCategories) {
      if (grouped[cat] && grouped[cat].length >= 2) {
        shelves.push({ name: cat, tracks: grouped[cat].slice(0, 5) });
      }
    }

    for (const [cat, tracks] of Object.entries(grouped)) {
      if (!popularCategories.includes(cat) && tracks.length >= 3 && shelves.length < 6) {
        shelves.push({ name: cat, tracks: tracks.slice(0, 5) });
      }
    }

    return shelves;
  }, [songs]);

  const playSong = (song) => {
    if (!song) return;

    // Ensure the track is available in the songs list for playlist navigation without duplicates
    setSongs((prev) => {
      const remaining = prev.filter((s) => s.id !== song.id);
      return [song, ...remaining];
    });

    if (currentSong?.id === song.id) {
      // Toggle play / pause when the user clicks the currently active song
      setIsPlaying((prev) => !prev);
    } else {
      // Switch immediately to the new song and start playing
      setCurrentSong(song);
      setIsPlaying(true);
    }

    // Persist song play history in Firebase for the logged-in cloud user
    if (isCloudUser && currentUser?.uid) {
      recordSongPlay(currentUser.uid, song).catch((err) => {
        console.warn('Firebase song play recording error:', err);
      });
    }
  };

  const handleRecordSearch = useCallback(
    (term, filter) => {
      if (isCloudUser && currentUser?.uid && term && term.trim()) {
        recordSearchQuery(currentUser.uid, term.trim(), filter || searchFilter).catch((err) => {
          console.warn('Firebase search recording error:', err);
        });
      }
    },
    [isCloudUser, currentUser, searchFilter]
  );

  const handleRemoveSearchHistory = useCallback(
    async (item) => {
      if (!isCloudUser || !currentUser?.uid) return;
      try {
        if (item.id) {
          await removeSearchHistoryItem(currentUser.uid, item.id);
        }
      } catch (err) {
        console.warn('Firebase search delete error:', err);
      }
    },
    [isCloudUser, currentUser]
  );

  const handleClearSearchHistory = useCallback(async () => {
    if (!isCloudUser || !currentUser?.uid) return;
    try {
      await clearSearchHistory(currentUser.uid);
      showSuccess('Search history cleared from cloud');
    } catch (err) {
      console.warn('Firebase search clear error:', err);
    }
  }, [isCloudUser, currentUser, showSuccess]);

  const handleSignOut = async () => {
    try {
      await logoutUser();
      setCurrentUser(null);
      setFavorites([]);
      setLikedSongsList([]);
      setPlaylists([]);
      setActivePlaylist(null);
      setUserProfile(null);
      setPlayHistory([]);
      setSearchHistory([]);
      setSubscribedSeries([]);
      showSuccess('Signed out');
    } catch (err) {
      setError(err.message);
    }
  };

  const createPlaylist = async (name, description = '') => {
    if (!name.trim()) return null;
    setError('');

    const newPl = {
      name: name.trim(),
      description: description.trim(),
      tracks: [],
      songIds: [],
      trackCount: 0,
      createdAt: new Date().toISOString(),
    };

    if (isCloudUser && currentUser?.uid) {
      try {
        const plId = await saveCloudPlaylist(currentUser.uid, newPl);
        const fullPl = { id: plId, ...newPl };
        setPlaylists((prev) => [fullPl, ...prev.filter((p) => p.id !== plId)]);
        showSuccess('Playlist created in Cloud!');
        setShowCreatePlaylist(false);
        return fullPl;
      } catch (err) {
        setError('Failed to create cloud playlist: ' + err.message);
        return null;
      }
    }

    // Guest session playlist (in-memory only for current guest session)
    const localId = `guest-pl-${Date.now()}`;
    const localPl = { id: localId, ...newPl };
    setPlaylists((prev) => [localPl, ...prev]);
    showSuccess('Playlist created for guest session!');
    setShowCreatePlaylist(false);
    return localPl;
  };

  const deletePlaylist = async (id) => {
    if (!window.confirm('Delete this playlist?')) return;
    
    if (isCloudUser && currentUser?.uid) {
      try {
        await deleteCloudPlaylist(currentUser.uid, id);
        setPlaylists((prev) => prev.filter((p) => p.id !== id));
        if (activePlaylist?.id === id) setActivePlaylist(null);
        showSuccess('Playlist deleted from Cloud.');
        return;
      } catch (err) {
        setError('Failed to delete playlist: ' + err.message);
        return;
      }
    }

    // Guest session
    setPlaylists((prev) => prev.filter((p) => p.id !== id));
    if (activePlaylist?.id === id) setActivePlaylist(null);
    showSuccess('Playlist deleted.');
  };

  const addSongToPlaylist = async (playlistId, songOrId) => {
    if (!playlistId || !songOrId) return;

    let song = null;
    if (typeof songOrId === 'object' && songOrId !== null) {
      song = songOrId;
    } else {
      const sId = String(songOrId);
      song =
        songs.find((s) => String(s.id || s.songId) === sId) ||
        likedSongsList.find((s) => String(s.id || s.songId) === sId) ||
        trendingTracks.find((s) => String(s.id || s.songId) === sId) ||
        (currentSong && String(currentSong.id || currentSong.songId) === sId ? currentSong : null) ||
        { id: sId, songId: sId, title: 'Track' };
    }

    const cleanSong = sanitizeSongForStorage(song) || normalizeSong(song);
    const songId = String(cleanSong.id || cleanSong.songId);

    const updatePlaylistObject = (pl) => {
      const currentTracks = Array.isArray(pl.tracks) ? pl.tracks : [];
      if (!currentTracks.some((t) => String(t.id || t.songId) === songId)) {
        const updatedTracks = [...currentTracks, cleanSong];
        const songIds = updatedTracks.map((t) => String(t.id || t.songId)).filter(Boolean);
        const coverUrl = pl.coverUrl || cleanSong.coverUrl;
        return {
          ...pl,
          tracks: updatedTracks,
          songIds,
          trackCount: updatedTracks.length,
          coverUrl,
        };
      }
      return pl;
    };

    // Update state immediately so user sees track in playlist without delay
    setPlaylists((prev) => prev.map((pl) => (pl.id === playlistId ? updatePlaylistObject(pl) : pl)));
    setActivePlaylist((prev) => {
      if (prev && prev.id === playlistId) {
        return updatePlaylistObject(prev);
      }
      return prev;
    });

    if (isCloudUser && currentUser?.uid) {
      try {
        await addSongToCloudPlaylist(currentUser.uid, playlistId, cleanSong);
        showSuccess('Added to cloud playlist!', 1800);
      } catch (err) {
        setError('Failed to update playlist: ' + err.message);
      }
      setAddToPlaylistSong(null);
      return;
    }

    // Guest session
    showSuccess('Added to playlist!', 1800);
    setAddToPlaylistSong(null);
  };

  const removeSongFromPlaylist = async (playlistId, songId) => {
    if (!playlistId || !songId) return;
    const sIdStr = String(songId);

    const filterPlaylist = (pl) => {
      const currentTracks = Array.isArray(pl.tracks) ? pl.tracks : [];
      const updatedTracks = currentTracks.filter((t) => String(t.id || t.songId) !== sIdStr);
      const songIds = updatedTracks.map((t) => String(t.id || t.songId)).filter(Boolean);
      return {
        ...pl,
        tracks: updatedTracks,
        songIds,
        trackCount: updatedTracks.length,
      };
    };

    if (isCloudUser && currentUser?.uid) {
      try {
        await removeSongFromCloudPlaylist(currentUser.uid, playlistId, songId);
        setPlaylists((prev) => prev.map((pl) => (pl.id === playlistId ? filterPlaylist(pl) : pl)));
        if (activePlaylist?.id === playlistId) {
          setActivePlaylist((prev) => (prev ? filterPlaylist(prev) : null));
        }
        showSuccess('Removed from cloud playlist.');
      } catch (err) {
        setError('Failed to remove track: ' + err.message);
      }
      return;
    }

    // Guest session
    setPlaylists((prev) => prev.map((pl) => (pl.id === playlistId ? filterPlaylist(pl) : pl)));
    if (activePlaylist?.id === playlistId) {
      setActivePlaylist((prev) => (prev ? filterPlaylist(prev) : null));
    }
    showSuccess('Removed from playlist.');
  };

  const deleteTrack = async (id) => {
    if (!window.confirm('Delete this track?')) return;
    try {
      const target = songs.find((s) => s.id === id);
      if (target?.source === 'local') {
        await deleteLocalUserTrack(id);
      }
      setSongs((prev) => prev.filter((s) => s.id !== id));
      if (currentSong?.id === id) setCurrentSong(null);
      showSuccess('Track deleted.');
    } catch (err) {
      setError(err.message || 'Delete failed.');
    }
  };

  const handleEditSave = async (id, form) => {
    setEditLoading(true);
    setError('');
    try {
      const target = songs.find((s) => s.id === id);
      const updated = { ...target, ...form };
      if (target?.source === 'local') {
        await saveLocalUserTrack(updated);
      }
      setSongs((prev) => prev.map((s) => (s.id === id ? updated : s)));
      if (currentSong?.id === id) setCurrentSong(updated);
      setEditSong(null);
      showSuccess('Track updated.');
    } catch (err) {
      setError(err.message || 'Update failed.');
    } finally {
      setEditLoading(false);
    }
  };

  const [showScrollTop, setShowScrollTop] = useState(false);

  // Passive scroll listener for smooth Back-to-Top button
  useEffect(() => {
    let ticking = false;
    const onScroll = () => {
      if (!ticking) {
        window.requestAnimationFrame(() => {
          setShowScrollTop(window.scrollY > 420);
          ticking = false;
        });
        ticking = true;
      }
    };
    window.addEventListener('scroll', onScroll, { passive: true });
    return () => window.removeEventListener('scroll', onScroll);
  }, []);

  // Smooth scroll to top when switching views
  useEffect(() => {
    if (view !== 'player') {
      window.scrollTo({ top: 0, behavior: 'smooth' });
    }
  }, [view, selectedGenre, selectedArtist]);

  // Dynamic SEO title & canonical URL sync
  useEffect(() => {
    if (typeof document === 'undefined') return;
    const canonical = document.getElementById('canonical-link');
    if (canonical) canonical.setAttribute('href', window.location.origin + window.location.pathname);
    document.title = currentSong?.title
      ? `${currentSong.title} – ${currentSong.singers || currentSong.artist || 'Azaad Music'} | Azaad Music`
      : 'Azaad Music';
  }, [currentSong?.id, currentSong?.title, currentSong?.artist, currentSong?.singers, view]);

  const navItems = [
    { id: 'explore', label: 'Explore & Trending', icon: Fire },
    { id: 'podcasts', label: 'Podcasts', icon: Broadcast },
    { id: 'player', label: 'Now Playing', icon: VinylRecord },
    { id: 'favorites', label: 'Liked Songs', icon: PhHeart },
    { id: 'playlists', label: 'My Playlists', icon: Playlist },
    { id: 'artists', label: 'Top Artists', icon: MicrophoneStage },
    { id: 'profile', label: 'User Profile', icon: UserCircle },
  ];

  // Restrict full application access exclusively to authenticated users
  if (authLoading) {
    return (
      <div className="min-h-screen app-bg flex flex-col items-center justify-center gap-4 text-center px-4" id="app-auth-loading">
        <img
          src={APP_LOGO_URL}
          alt="Azaad Music"
          className="w-16 h-16 object-contain animate-pulse"
        />
        <div className="flex items-center gap-2 text-xs text-[var(--text-light)]">
          <Loader2 className="w-4 h-4 animate-spin text-[var(--primary)]" />
          <span>Synchronizing your Azaad Music session...</span>
        </div>
      </div>
    );
  }

  if (!currentUser) {
    return (
      <AuthGate
        onAuthSuccess={(user) => {
          setCurrentUser(user);
          showSuccess(`Welcome back, ${user.displayName || user.email}!`);
        }}
      />
    );
  }

  const bottomPad = currentSong ? 'pb-44 sm:pb-24' : 'pb-20 sm:pb-8';

  return (
    <div className={`min-h-screen app-bg text-[var(--text)] flex relative ${bottomPad}`}>
      {/* Desktop / Tablet Sidebar */}
      <Sidebar
        sidebarOpen={sidebarOpen}
        setSidebarOpen={setSidebarOpen}
        navItems={navItems}
        view={view}
        setView={setView}
        isPlaying={isPlaying}
        favorites={favorites}
        selectedGenre={selectedGenre}
        setSelectedGenre={setSelectedGenre}
        onResetArtistAndPlaylist={(id) => {
          if (id !== 'explore' && id !== 'favorites') setSelectedArtist(null);
          if (id !== 'playlists') setActivePlaylist(null);
        }}
      />

      {/* Main Container */}
      <main className="flex-1 min-w-0 relative z-10">
        {/* Top Header */}
        <header className="sticky top-0 z-30 bg-[var(--bg)]/90 backdrop-blur-2xl border-b border-white/[0.08] px-2.5 sm:px-5 lg:px-6 py-2.5 sm:py-3 flex items-center justify-between gap-2 sm:gap-3 shadow-[0_4px_24px_rgba(0,0,0,0.4)]">
          {/* Left: Mobile Brand & Desktop Breadcrumb */}
          <div className="flex items-center gap-2 sm:gap-3 flex-shrink-0">
            {/* Mobile Logo */}
            <div
              onClick={() => setView('explore')}
              className="md:hidden flex items-center justify-center cursor-pointer select-none group"
              title="Azaad Music"
            >
              <img
                src={APP_LOGO_URL}
                alt="Azaad Music"
                className="w-9 h-9 object-contain group-hover:scale-105 transition-transform"
              />
            </div>

            {/* Desktop Active View Pill */}
            <div className="hidden xl:flex items-center gap-2 px-3.5 py-1.5 rounded-xl bg-white/[0.04] border border-white/10 text-xs font-semibold text-[var(--text-light)]">
              {view === 'explore' && <PhCompass size={16} weight="duotone" className="text-[var(--primary)]" />}
              {view === 'podcasts' && <Broadcast size={16} weight="duotone" className="text-[var(--primary)]" />}
              {view === 'player' && <VinylRecord size={16} weight="duotone" className="text-[var(--primary)] animate-spin-slow" />}
              {view === 'favorites' && <PhHeart size={16} weight="fill" className="text-rose-400" />}
              {view === 'playlists' && <Playlist size={16} weight="duotone" className="text-[var(--accent)]" />}
              {view === 'artists' && <MicrophoneStage size={16} weight="duotone" className="text-[var(--primary)]" />}
              {view === 'profile' && <UserCircle size={16} weight="duotone" className="text-[var(--primary)]" />}
              <span className="text-white capitalize">
                {view === 'explore'
                  ? 'Explore & Trending'
                  : view === 'podcasts'
                  ? 'Podcasts & Shows'
                  : view === 'player'
                  ? 'Studio Player'
                  : view === 'favorites'
                  ? 'Liked Songs'
                  : view === 'playlists'
                  ? 'Cloud Playlists'
                  : view === 'artists'
                  ? 'Top Artists'
                  : 'Profile'}
              </span>
            </div>
          </div>

          {/* Center: Global Music Search */}
          <div className="flex-1 max-w-2xl min-w-0">
            <GlobalSearch
              searchQuery={searchQuery}
              onSearchChange={(q) => {
                setSearchQuery(q);
                if (view !== 'explore' && view !== 'favorites') {
                  setView('explore');
                }
              }}
              searchFilter={searchFilter}
              onSearchFilterChange={setSearchFilter}
              selectedGenre={selectedGenre}
              onSelectGenre={(g) => {
                setSelectedGenre(g);
                if (view !== 'explore') setView('explore');
              }}
              selectedArtist={selectedArtist}
              onSelectArtist={(a) => {
                setSelectedArtist(a);
                if (view !== 'explore') setView('explore');
              }}
              songs={songs}
              currentSong={currentSong}
              isPlaying={isPlaying}
              onPlaySong={playSong}
              onToggleFavorite={toggleFavorite}
              favorites={favorites}
              onAddToPlaylist={setAddToPlaylistSong}
              isLoading={initLoading}
              popularSearches={POPULAR_SEARCHES}
              genreOptions={AUDIUS_GENRES}
              searchHistory={searchHistory}
              onRecordSearch={handleRecordSearch}
              onRemoveSearchHistory={handleRemoveSearchHistory}
              onClearSearchHistory={handleClearSearchHistory}
              onViewAllResults={(mergedResults) => {
                if (Array.isArray(mergedResults) && mergedResults.length > 0) {
                  setSongs((prev) => {
                    const normalizedNew = mergedResults
                      .map((s, idx) => normalizeSong(s, idx))
                      .filter((s) => s && s.id);
                    const seen = new Set(normalizedNew.map((s) => s.id));
                    return [...normalizedNew, ...prev.filter((s) => s && !seen.has(s.id))];
                  });
                }
                if (view !== 'explore') setView('explore');
              }}
            />
          </div>

          {/* Right: Actions, Now Playing Indicator, View Toggle & Profile Menu */}
          <div className="flex items-center gap-2 flex-shrink-0">
            {/* Live Playing Track Equalizer Pill (when music is active) */}
            {currentSong && isPlaying && (
              <div
                onClick={() => {
                  const playerEl = document.getElementById('music-player-drawer');
                  if (playerEl) playerEl.scrollIntoView({ behavior: 'smooth' });
                }}
                title={`Now playing: ${currentSong.title} - ${currentSong.artist}`}
                className="hidden lg:flex items-center gap-2 px-3 py-1.5 rounded-xl bg-[var(--primary)]/10 border border-[var(--primary)]/30 hover:border-[var(--primary)]/60 cursor-pointer transition-all group"
              >
                <div className="flex items-end gap-[2px] h-3.5 w-3.5">
                  <span className="w-[2px] rounded-full bg-[var(--primary)] eq-bar-1" />
                  <span className="w-[2px] rounded-full bg-[var(--primary)] eq-bar-2" />
                  <span className="w-[2px] rounded-full bg-[var(--primary)] eq-bar-3" />
                  <span className="w-[2px] rounded-full bg-[var(--primary)] eq-bar-4" />
                </div>
                <span className="text-[11px] font-bold text-[var(--primary)] max-w-[110px] truncate">
                  {currentSong.title}
                </span>
              </div>
            )}

            {/* Hybrid Audio Quality Indicator */}
            <div
              className="hidden 2xl:flex items-center gap-1.5 px-2.5 py-1.5 rounded-xl bg-emerald-500/10 border border-emerald-500/25 text-[10px] font-semibold text-emerald-300 select-none"
              title="Full-Length YouTube + JioSaavn 320k Audio Engines Active"
            >
              <Waveform size={13} weight="bold" className="text-emerald-400 animate-pulse" />
              <span>Studio 320k</span>
            </div>

            {/* View Mode Toggle: Shelves vs Grid vs List */}
            <div className="hidden sm:flex items-center p-0.5 rounded-xl bg-white/[0.04] border border-white/10">
              <button
                type="button"
                onClick={() => setViewMode('shelves')}
                className={`px-2 py-1.5 rounded-lg transition-all flex items-center gap-1.5 text-xs font-semibold ${
                  viewMode === 'shelves'
                    ? 'bg-[var(--primary)] text-[var(--bg)] font-bold shadow-[0_0_10px_rgba(83,242,224,0.35)]'
                    : 'text-[var(--text-light)] hover:text-white'
                }`}
                title="Curated Shelves View"
              >
                <Stack size={15} weight={viewMode === 'shelves' ? 'fill' : 'duotone'} />
                <span className="hidden xl:inline">Shelves</span>
              </button>
              <button
                type="button"
                onClick={() => setViewMode('grid')}
                className={`px-2 py-1.5 rounded-lg transition-all flex items-center gap-1.5 text-xs font-semibold ${
                  viewMode === 'grid'
                    ? 'bg-[var(--primary)] text-[var(--bg)] font-bold shadow-[0_0_10px_rgba(83,242,224,0.35)]'
                    : 'text-[var(--text-light)] hover:text-white'
                }`}
                title="Grid View"
              >
                <SquaresFour size={15} weight={viewMode === 'grid' ? 'fill' : 'duotone'} />
                <span className="hidden xl:inline">Grid</span>
              </button>
              <button
                type="button"
                onClick={() => setViewMode('list')}
                className={`px-2 py-1.5 rounded-lg transition-all flex items-center gap-1.5 text-xs font-semibold ${
                  viewMode === 'list'
                    ? 'bg-[var(--primary)] text-[var(--bg)] font-bold shadow-[0_0_10px_rgba(83,242,224,0.35)]'
                    : 'text-[var(--text-light)] hover:text-white'
                }`}
                title="Tracklist Table View"
              >
                <ListBullets size={15} weight={viewMode === 'list' ? 'bold' : 'regular'} />
                <span className="hidden xl:inline">List</span>
              </button>
            </div>

            {/* Refresh Catalog Button */}
            <button
              onClick={() => fetchAudiusTracks(selectedGenre, debouncedQuery, selectedTime)}
              className="p-2 rounded-xl bg-white/[0.04] hover:bg-white/10 border border-white/10 hover:border-[var(--primary)]/30 text-[var(--text-light)] hover:text-[var(--primary)] transition-all active:scale-95"
              title="Refresh Music Catalog"
              aria-label="Refresh Music Catalog"
            >
              <ArrowsClockwise size={17} weight="bold" className={initLoading ? 'animate-spin text-[var(--primary)]' : ''} />
            </button>

            {/* User Profile Pill & Dropdown Menu */}
            {currentUser && (
              <div className="relative" ref={userMenuRef}>
                <button
                  type="button"
                  onClick={() => setUserMenuOpen((prev) => !prev)}
                  className="flex items-center gap-2 bg-white/[0.04] hover:bg-white/10 border border-white/10 hover:border-[var(--primary)]/40 rounded-xl px-2.5 py-1.5 transition-all group"
                  title="Account & Profile Settings"
                >
                  <div className="relative">
                    <img
                      src={
                        userProfile?.photoURL ||
                        currentUser.photoURL ||
                        `https://api.dicebear.com/7.x/avataaars/svg?seed=${currentUser.email || 'User'}`
                      }
                      alt="avatar"
                      className="w-6 h-6 rounded-full border border-[var(--primary)]/50 object-cover group-hover:scale-105 transition-transform"
                    />
                    <span className="absolute -bottom-0.5 -right-0.5 w-2 h-2 rounded-full bg-emerald-400 border border-[var(--bg)]" />
                  </div>
                  <span className="text-xs font-semibold text-[var(--text)] group-hover:text-[var(--primary)] hidden sm:inline-block max-w-[100px] truncate transition-colors">
                    {userProfile?.displayName || currentUser.displayName || currentUser.email?.split('@')[0]}
                  </span>
                  <CaretDown
                    size={13}
                    weight="bold"
                    className={`text-white/50 group-hover:text-white transition-transform duration-200 ${
                      userMenuOpen ? 'rotate-180 text-[var(--primary)]' : ''
                    }`}
                  />
                </button>

                {/* Account Popover Menu */}
                {userMenuOpen && (
                  <div className="absolute right-0 top-full mt-2 w-60 rounded-2xl glass-card p-2 shadow-2xl z-50 border border-[var(--primary)]/25 animate-in fade-in zoom-in-95 duration-150">
                    {/* User Info Header */}
                    <div className="px-3 py-2 border-b border-white/10 flex items-center gap-2.5">
                      <img
                        src={
                          userProfile?.photoURL ||
                          currentUser.photoURL ||
                          `https://api.dicebear.com/7.x/avataaars/svg?seed=${currentUser.email || 'User'}`
                        }
                        alt="avatar"
                        className="w-9 h-9 rounded-full border border-[var(--primary)]/50 object-cover"
                      />
                      <div className="min-w-0 flex-1">
                        <p className="text-xs font-bold text-white truncate">
                          {userProfile?.displayName || currentUser.displayName || 'Music Listener'}
                        </p>
                        <p className="text-[10px] text-[var(--text-light)] truncate">{currentUser.email}</p>
                      </div>
                    </div>

                    {/* Navigation items */}
                    <div className="p-1 space-y-0.5">
                      <button
                        type="button"
                        onClick={() => {
                          setView('profile');
                          setUserMenuOpen(false);
                        }}
                        className="w-full flex items-center gap-2.5 px-2.5 py-2 rounded-xl text-xs font-medium text-[var(--text-light)] hover:text-white hover:bg-white/5 transition-all"
                      >
                        <UserCircle size={17} weight="duotone" className="text-[var(--primary)]" />
                        <span>My Profile & Stats</span>
                      </button>

                      <button
                        type="button"
                        onClick={() => {
                          setView('favorites');
                          setUserMenuOpen(false);
                        }}
                        className="w-full flex items-center gap-2.5 px-2.5 py-2 rounded-xl text-xs font-medium text-[var(--text-light)] hover:text-white hover:bg-white/5 transition-all"
                      >
                        <PhHeart size={17} weight="fill" className="text-rose-400" />
                        <span>Liked Songs</span>
                        <span className="ml-auto text-[10px] font-mono text-white/60">{favorites.length}</span>
                      </button>

                      <button
                        type="button"
                        onClick={() => {
                          setView('playlists');
                          setUserMenuOpen(false);
                        }}
                        className="w-full flex items-center gap-2.5 px-2.5 py-2 rounded-xl text-xs font-medium text-[var(--text-light)] hover:text-white hover:bg-white/5 transition-all"
                      >
                        <Playlist size={17} weight="duotone" className="text-[var(--accent)]" />
                        <span>Cloud Playlists</span>
                        <span className="ml-auto text-[10px] font-mono text-white/60">{playlists.length}</span>
                      </button>
                    </div>

                    <div className="my-1 border-t border-white/10" />

                    {/* Sign Out */}
                    <button
                      type="button"
                      onClick={() => {
                        setUserMenuOpen(false);
                        handleSignOut();
                      }}
                      className="w-full flex items-center gap-2.5 px-2.5 py-2 rounded-xl text-xs font-semibold text-rose-400 hover:text-rose-300 hover:bg-rose-500/10 transition-all"
                    >
                      <SignOut size={17} weight="duotone" />
                      <span>Sign Out</span>
                    </button>
                  </div>
                )}
              </div>
            )}
          </div>
        </header>

        {/* Notifications & Toast */}
        <div className="px-4 md:px-6 pt-3 space-y-2">
          {success && (
            <div className="flex items-center gap-2 text-emerald-300 text-xs sm:text-sm bg-emerald-500/10 border border-emerald-500/20 rounded-xl px-4 py-2.5">
              <CheckCircle2 className="w-4 h-4 flex-shrink-0" /> {success}
            </div>
          )}
          {error && (
            <div className="flex items-center gap-2 text-red-300 text-xs sm:text-sm bg-red-500/10 border border-red-500/20 rounded-xl px-4 py-2.5">
              <AlertCircle className="w-4 h-4 flex-shrink-0" /> {error}
              <button onClick={() => setError('')} className="ml-auto p-1 hover:bg-white/10 rounded">
                <X className="w-3 h-3" />
              </button>
            </div>
          )}
        </div>

        {/* Content Views */}
        <div className="p-3 sm:p-6 space-y-6">
          {/* ─── EXPLORE & TRENDING VIEW ──────────────────────────────── */}
          {(view === 'explore' || view === 'favorites') && (
            <div className="space-y-6">
              {/* Header section with Genre & Quick Search Pills */}
              <div className="space-y-3">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                  <div>
                    <h2 className="font-display text-xl sm:text-2xl font-bold text-[var(--text)] tracking-wide flex items-center gap-2.5">
                      {view === 'favorites' ? (
                        <>
                          <PhHeart size={25} weight="fill" className="text-rose-400" />
                          <span>Liked Songs</span>
                        </>
                      ) : searchQuery ? (
                        <>
                          <MagnifyingGlass size={25} weight="duotone" className="text-[var(--primary)]" />
                          <span>
                            {searchFilter === 'title'
                              ? `Title matching "${searchQuery}"`
                              : searchFilter === 'artist'
                              ? `Artist matching "${searchQuery}"`
                              : searchFilter === 'genre'
                              ? `Genre matching "${searchQuery}"`
                              : `Search results for "${searchQuery}"`}
                          </span>
                        </>
                      ) : selectedArtist ? (
                        <>
                          <MicrophoneStage size={25} weight="duotone" className="text-[var(--primary)]" />
                          <span>Tracks by {selectedArtist}</span>
                        </>
                      ) : selectedGenre !== 'All' ? (
                        <>
                          <PhTag size={25} weight="duotone" className="text-[var(--accent)]" />
                          <span>{selectedGenre} Tracks</span>
                        </>
                      ) : (
                        <>
                          <Fire size={26} weight="fill" className="text-[var(--primary)] drop-shadow-[0_0_8px_rgba(83,242,224,0.4)]" />
                          <span>Trending & Popular Music</span>
                        </>
                      )}
                    </h2>
                    <p className="text-xs text-[var(--text-light)] mt-0.5 flex items-center gap-2 flex-wrap">
                      <span>
                        {view === 'favorites'
                          ? `${filteredSongs.length} tracks saved to your favorites`
                          : `${filteredSongs.length} track${filteredSongs.length !== 1 ? 's' : ''} available`}
                      </span>
                      {view === 'explore' && !searchQuery && (
                        <span className="inline-flex items-center gap-1.5 text-[11px] text-[var(--primary)] font-medium">
                          <span className="relative flex h-2 w-2">
                            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-[var(--primary)] opacity-75" />
                            <span className="relative inline-flex rounded-full h-2 w-2 bg-[var(--primary)]" />
                          </span>
                          Updates every 1h with fresh hits
                        </span>
                      )}
                      {searchQuery && (
                        <span className="text-[10px] px-2 py-0.5 rounded-full bg-[var(--primary)]/15 text-[var(--primary)] font-semibold border border-[var(--primary)]/20">
                          Scope:{' '}
                          {searchFilter === 'all'
                            ? 'All Sources'
                            : searchFilter === 'charts'
                            ? 'Top Charts'
                            : searchFilter === 'youtube'
                            ? 'YouTube HD'
                            : searchFilter === 'artist'
                            ? 'Artists'
                            : searchFilter === 'genre'
                            ? 'Genres'
                            : 'Title'}
                        </span>
                      )}
                    </p>
                  </div>

                  {/* Filter Scope Switcher on Search or Time filter */}
                  {searchQuery ? (
                    <div className="flex items-center gap-1 bg-[var(--card-bg)]/80 p-1 rounded-xl border border-white/5 self-start sm:self-auto overflow-x-auto max-w-full scrollbar-none">
                      {[
                        { id: 'all', label: 'All' },
                        { id: 'charts', label: 'Top Charts' },
                        { id: 'youtube', label: 'YouTube HD' },
                        { id: 'artist', label: 'Artists' },
                        { id: 'genre', label: 'Genres' },
                      ].map((mode) => (
                        <button
                          key={mode.id}
                          onClick={() => setSearchFilter(mode.id)}
                          className={`px-2.5 py-1 text-xs rounded-lg font-medium transition-all ${
                            searchFilter === mode.id
                              ? 'bg-[var(--primary)] text-[var(--bg)] font-bold shadow-sm'
                              : 'text-[var(--text-light)] hover:text-white'
                          }`}
                        >
                          {mode.label}
                        </button>
                      ))}
                    </div>
                  ) : view === 'explore' ? (
                    <div className="flex items-center gap-2 self-start sm:self-auto flex-wrap">
                      {/* Sort Selector */}
                      <div className="flex items-center gap-1.5 bg-[var(--card-bg)] px-2.5 py-1.5 rounded-xl border border-white/10 text-xs">
                        <PhSliders size={15} weight="duotone" className="text-[var(--primary)] flex-shrink-0" />
                        <select
                          value={sortBy}
                          onChange={(e) => setSortBy(e.target.value)}
                          className="bg-transparent text-white font-semibold focus:outline-none cursor-pointer text-xs"
                          aria-label="Sort songs"
                        >
                          <option value="trending" className="bg-[#11181e] text-white">Trending Now</option>
                          <option value="popular" className="bg-[#11181e] text-white">Most Popular</option>
                          <option value="title" className="bg-[#11181e] text-white">Title (A–Z)</option>
                          <option value="artist" className="bg-[#11181e] text-white">Artist (A–Z)</option>
                          <option value="duration" className="bg-[#11181e] text-white">Longest Tracks</option>
                        </select>
                      </div>

                      {/* Mobile View Mode Switcher */}
                      <div className="flex sm:hidden items-center p-0.5 rounded-xl bg-white/5 border border-white/10">
                        <button
                          type="button"
                          onClick={() => setViewMode('shelves')}
                          className={`p-1.5 rounded-lg transition-all ${
                            viewMode === 'shelves' ? 'bg-[var(--primary)] text-[var(--bg)] font-bold' : 'text-white/60'
                          }`}
                          title="Shelves View"
                        >
                          <Stack size={15} weight={viewMode === 'shelves' ? 'fill' : 'duotone'} />
                        </button>
                        <button
                          type="button"
                          onClick={() => setViewMode('grid')}
                          className={`p-1.5 rounded-lg transition-all ${
                            viewMode === 'grid' ? 'bg-[var(--primary)] text-[var(--bg)] font-bold' : 'text-white/60'
                          }`}
                          title="Grid View"
                        >
                          <SquaresFour size={15} weight={viewMode === 'grid' ? 'fill' : 'duotone'} />
                        </button>
                        <button
                          type="button"
                          onClick={() => setViewMode('list')}
                          className={`p-1.5 rounded-lg transition-all ${
                            viewMode === 'list' ? 'bg-[var(--primary)] text-[var(--bg)] font-bold' : 'text-white/60'
                          }`}
                          title="List View"
                        >
                          <ListBullets size={15} weight={viewMode === 'list' ? 'bold' : 'regular'} />
                        </button>
                      </div>

                      <div className="flex items-center gap-1.5 bg-[var(--card-bg)] p-1 rounded-xl border border-white/5">
                        {['week', 'month', 'allTime'].map((t) => (
                          <button
                            key={t}
                            onClick={() => setSelectedTime(t)}
                            className={`px-3 py-1 text-xs rounded-lg font-medium transition-all ${
                              selectedTime === t
                                ? 'bg-[var(--primary)] text-[var(--bg)] font-bold shadow-sm'
                                : 'text-[var(--text-light)] hover:text-white'
                            }`}
                          >
                            {t === 'week' ? 'Week' : t === 'month' ? 'Month' : 'All Time'}
                          </button>
                        ))}
                      </div>

                      {/* 1-Hour Auto-Update Live Badge & Manual Refresh */}
                      <div className="flex items-center gap-1.5 bg-[var(--card-bg)] px-2.5 py-1 rounded-xl border border-white/10 text-xs">
                        <span className="relative flex h-2 w-2">
                          <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75" />
                          <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-400" />
                        </span>
                        <span className="text-[11px] text-white/80 font-medium">
                          Live 1h • {nextRefreshMinutes > 0 ? `Next ~${nextRefreshMinutes}m` : 'Refreshing'}
                        </span>
                        <button
                          onClick={handleManualExploreRefresh}
                          disabled={isRefreshingExplore || initLoading}
                          title="Sync latest viral trends right now"
                          className="p-1 rounded-lg hover:bg-white/10 active:scale-95 text-[var(--primary)] transition-all disabled:opacity-40 flex items-center gap-1 cursor-pointer"
                        >
                          <ArrowsClockwise
                            size={14}
                            weight="bold"
                            className={isRefreshingExplore || initLoading ? 'animate-spin' : ''}
                          />
                        </button>
                      </div>
                    </div>
                  ) : null}
                </div>

                {/* Popular Quick Searches */}
                {view === 'explore' && (
                  <div className="flex items-center gap-2 overflow-x-auto pb-1 scrollbar-none smooth-row-scroll">
                    <span className="text-[11px] text-[var(--text-light)]/70 font-bold uppercase tracking-wider flex-shrink-0 flex items-center gap-1">
                      <Sparkle size={13} weight="fill" className="text-[var(--primary)]" /> Popular:
                    </span>
                    {POPULAR_SEARCHES.map((query) => (
                      <button
                        key={query}
                        onClick={() => {
                          setSearchQuery(query);
                          setView('explore');
                        }}
                        className={`px-2.5 py-1 rounded-lg text-xs transition-colors flex-shrink-0 border ${
                          searchQuery.toLowerCase() === query.toLowerCase()
                            ? 'bg-[var(--primary)] text-[var(--bg)] font-bold border-[var(--primary)]'
                            : 'bg-white/[0.04] hover:bg-white/10 text-[var(--text-light)] hover:text-white border-white/[0.07]'
                        }`}
                      >
                        {query}
                      </button>
                    ))}
                  </div>
                )}

                {/* Genre Filter Chips */}
                {view === 'explore' && (
                  <div className="flex items-center gap-2 overflow-x-auto pb-2 scrollbar-none pt-1 smooth-row-scroll">
                    {AUDIUS_GENRES.map((g) => (
                      <button
                        key={g}
                        onClick={() => setSelectedGenre(g)}
                        className={`px-3.5 py-1.5 rounded-full text-xs font-semibold whitespace-nowrap transition-all flex-shrink-0 ${
                          selectedGenre === g
                            ? 'bg-[var(--primary)] text-[var(--bg)] font-bold shadow-[0_0_12px_rgba(83,242,224,0.35)]'
                            : 'bg-[#121822]/90 border border-white/[0.08] text-[var(--text-light)] hover:text-[var(--text)] hover:border-[var(--primary)]/35'
                        }`}
                      >
                        {g}
                      </button>
                    ))}
                  </div>
                )}
              </div>

              {/* Tracks Display */}
              {initLoading ? (
                <div className="flex flex-col items-center justify-center py-24 space-y-3">
                  <Loader2 className="w-8 h-8 animate-spin text-[var(--primary)]" />
                  <p className="text-xs text-[var(--text-light)]">Fetching tracks from Azaad Stream Engine...</p>
                </div>
              ) : filteredSongs.length === 0 ? (
                <div className="text-center py-20 rounded-2xl glass-card border border-dashed border-white/10 p-6">
                  <Music2 className="w-12 h-12 text-[var(--text-light)]/30 mx-auto mb-3" />
                  <h3 className="text-base font-bold text-[var(--text)]">No tracks found</h3>
                  <p className="text-xs text-[var(--text-light)] mt-1 max-w-md mx-auto">
                    {view === 'favorites'
                      ? 'You haven\'t liked any songs yet. Click the heart icon on any Azaad track to add it here!'
                      : 'Try adjusting your search query or selecting a different genre filter.'}
                  </p>
                  {view === 'favorites' && (
                    <button
                      onClick={() => setView('explore')}
                      className="mt-4 px-4 py-2 rounded-xl bg-[var(--primary)] text-[var(--bg)] text-xs font-bold transition-all glow-primary inline-flex items-center gap-2"
                    >
                      <Compass className="w-4 h-4" /> Explore Trending Tracks
                    </button>
                  )}
                </div>
              ) : viewMode === 'shelves' && !searchQuery && selectedGenre === 'All' && !selectedArtist && view === 'explore' ? (
                /* ─── ORGANIZED CURATED SHELVES VIEW ─────────────────────────── */
                <div className="space-y-8">
                  {/* Spotlight #1 Global Hit Hero Showcase (Per UI-UX Pro Max Master Pattern) */}
                  {filteredSongs[0] && (
                    <div className="relative rounded-3xl overflow-hidden glass-card border border-[var(--primary)]/30 shadow-[0_20px_50px_rgba(0,0,0,0.55)]">
                      {/* Ambient Blurred Artwork Backdrop */}
                      <div className="absolute inset-0 overflow-hidden pointer-events-none">
                        <img
                          src={mediaUrl(filteredSongs[0].coverUrl, filteredSongs[0])}
                          alt=""
                          aria-hidden="true"
                          referrerPolicy="no-referrer"
                          onError={(e) => handleCoverImageError(e, filteredSongs[0])}
                          className="w-full h-full object-cover opacity-25 blur-2xl scale-110"
                        />
                        <div className="absolute inset-0 bg-gradient-to-r from-[#080b10]/95 via-[#0c1017]/85 to-transparent" />
                      </div>

                      <div className="relative z-10 p-5 sm:p-7 flex flex-col md:flex-row items-start md:items-center justify-between gap-6">
                        <div className="flex flex-col sm:flex-row items-start sm:items-center gap-5 min-w-0 flex-1">
                          {/* Cover Art with Spinning Vinyl Halo */}
                          <div
                            onClick={() => playSong(filteredSongs[0])}
                            className="relative w-24 h-24 sm:w-32 sm:h-32 rounded-2xl overflow-hidden flex-shrink-0 border-2 border-[var(--primary)]/40 shadow-[0_12px_32px_rgba(0,0,0,0.6)] group cursor-pointer"
                          >
                            <img
                              src={mediaUrl(filteredSongs[0].coverUrl, filteredSongs[0])}
                              alt={filteredSongs[0].title}
                              referrerPolicy="no-referrer"
                              onError={(e) => handleCoverImageError(e, filteredSongs[0])}
                              className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                            />
                            <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 flex items-center justify-center transition-opacity">
                              <div className="w-11 h-11 rounded-full bg-[var(--primary)] text-[var(--bg)] flex items-center justify-center shadow-lg">
                                {currentSong?.id === filteredSongs[0].id && isPlaying ? (
                                  <PhPause size={22} weight="fill" />
                                ) : (
                                  <PhPlay size={22} weight="fill" className="ml-0.5" />
                                )}
                              </div>
                            </div>
                          </div>

                          {/* Track Spotlight Info */}
                          <div className="space-y-2 min-w-0 flex-1">
                            <div className="flex items-center gap-2 flex-wrap">
                              <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-amber-500/20 border border-amber-500/40 text-amber-300 text-[11px] font-bold uppercase tracking-wider">
                                <Crown size={13} weight="fill" className="text-amber-400" />
                                #1 Global Chart Hit
                              </span>
                              <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full bg-[var(--primary)]/15 border border-[var(--primary)]/30 text-[var(--primary)] text-[11px] font-semibold">
                                <Waveform size={13} weight="bold" />
                                {filteredSongs[0].genre || 'Trending Hit'}
                              </span>
                            </div>

                            <h3
                              onClick={() => playSong(filteredSongs[0])}
                              className="font-display text-xl sm:text-3xl font-bold text-white tracking-wide truncate cursor-pointer hover:text-[var(--primary)] transition-colors"
                            >
                              {filteredSongs[0].title}
                            </h3>

                            <p className="text-sm text-[var(--text-light)] flex items-center gap-2 truncate">
                              <MicrophoneStage size={16} weight="duotone" className="text-[var(--primary)] flex-shrink-0" />
                              <span className="font-medium text-white/90 truncate">
                                {filteredSongs[0].singers || filteredSongs[0].artist}
                              </span>
                              {filteredSongs[0].duration > 0 && (
                                <span className="font-mono text-xs text-white/50">
                                  · {formatTime(filteredSongs[0].duration)}
                                </span>
                              )}
                            </p>
                          </div>
                        </div>

                        {/* Hero Action CTAs */}
                        <div className="flex items-center gap-2.5 flex-wrap sm:flex-nowrap w-full md:w-auto">
                          <button
                            type="button"
                            onClick={() => playSong(filteredSongs[0])}
                            className="flex-1 sm:flex-initial px-5 py-3 rounded-2xl bg-[var(--primary)] text-[var(--bg)] font-bold text-xs sm:text-sm flex items-center justify-center gap-2 hover:brightness-110 active:scale-95 transition-all glow-primary"
                          >
                            {currentSong?.id === filteredSongs[0].id && isPlaying ? (
                              <>
                                <PhPause size={18} weight="fill" />
                                <span>Pause Track</span>
                              </>
                            ) : (
                              <>
                                <PhPlay size={18} weight="fill" />
                                <span>Stream #1 Hit</span>
                              </>
                            )}
                          </button>

                          <button
                            type="button"
                            onClick={() => setAddToPlaylistSong(filteredSongs[0])}
                            className="px-4 py-3 rounded-2xl bg-white/[0.06] hover:bg-white/12 border border-white/15 text-white font-semibold text-xs sm:text-sm flex items-center gap-2 active:scale-95 transition-all"
                            title="Save to Cloud Playlist"
                          >
                            <Playlist size={18} weight="duotone" className="text-[var(--primary)]" />
                            <span>Save</span>
                          </button>
                        </div>
                      </div>
                    </div>
                  )}

                  {/* Shelf 1: Top Charts & Hot Hits */}
                  <section className="space-y-3">
                    <div className="flex items-center justify-between gap-3">
                      <div className="flex items-center gap-2.5">
                        <div className="w-9 h-9 rounded-xl bg-amber-500/15 border border-amber-500/30 flex items-center justify-center text-amber-400 shadow-sm">
                          <TrendUp size={19} weight="duotone" />
                        </div>
                        <div>
                          <h3 className="font-display text-base sm:text-lg font-bold text-white tracking-wide flex items-center gap-2">
                            <span>Top Charts & Trending</span>
                            <span className="font-sans text-[10px] font-bold px-2 py-0.5 rounded-full bg-amber-500/20 text-amber-300 border border-amber-500/30">
                              Hot 4
                            </span>
                          </h3>
                          <p className="text-xs text-[var(--text-light)]">The most streamed tracks this week</p>
                        </div>
                      </div>

                      {filteredSongs.length > 0 && (
                        <button
                          type="button"
                          onClick={() => playSong(filteredSongs[0])}
                          className="px-3.5 py-2 rounded-xl bg-[var(--primary)] text-[var(--bg)] text-xs font-bold transition-all glow-primary flex items-center gap-1.5 active:scale-95"
                        >
                          <PhPlay size={14} weight="fill" />
                          <span>Play Top Chart</span>
                        </button>
                      )}
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                      {filteredSongs.slice(0, 4).map((song, idx) => (
                        <SongCard
                          key={song.id}
                          index={idx}
                          song={song}
                          isCurrent={currentSong?.id === song.id}
                          isPlaying={currentSong?.id === song.id && isPlaying}
                          onPlay={playSong}
                          onEdit={setEditSong}
                          onDelete={deleteTrack}
                          onAddToPlaylist={setAddToPlaylistSong}
                          isFavorite={Boolean(
                            favorites.includes(String(song.id)) ||
                            (song.songId && favorites.includes(String(song.songId)))
                          )}
                          onToggleFavorite={toggleFavorite}
                          viewMode="ranked"
                        />
                      ))}
                    </div>
                  </section>

                  {/* Shelf 2: Quick Picks (Jump Back In) */}
                  {filteredSongs.length > 4 && (
                    <section className="space-y-3 pt-4 border-t border-white/5 smooth-shelf">
                      <div className="flex items-center justify-between gap-3">
                        <div className="flex items-center gap-2.5">
                          <div className="w-9 h-9 rounded-xl bg-[var(--primary)]/15 border border-[var(--primary)]/30 flex items-center justify-center text-[var(--primary)] shadow-sm">
                            <Sparkle size={18} weight="fill" />
                          </div>
                          <div>
                            <h3 className="font-display text-base sm:text-lg font-bold text-white tracking-wide">
                              Quick Picks & Highlights
                            </h3>
                            <p className="text-xs text-[var(--text-light)]">Instant access to popular hits</p>
                          </div>
                        </div>
                      </div>

                      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2.5">
                        {filteredSongs.slice(4, 10).map((song) => (
                          <SongCard
                            key={song.id}
                            song={song}
                            isCurrent={currentSong?.id === song.id}
                            isPlaying={currentSong?.id === song.id && isPlaying}
                            onPlay={playSong}
                            onEdit={setEditSong}
                            onDelete={deleteTrack}
                            onAddToPlaylist={setAddToPlaylistSong}
                            isFavorite={Boolean(
                              favorites.includes(String(song.id)) ||
                              (song.songId && favorites.includes(String(song.songId)))
                            )}
                            onToggleFavorite={toggleFavorite}
                            viewMode="compact"
                          />
                        ))}
                      </div>
                    </section>
                  )}

                  {/* Shelf 3: Curated Genre & Mood Shelves */}
                  {genreShelves.map((shelf) => (
                    <section key={shelf.name} className="space-y-3 pt-4 border-t border-white/5 smooth-shelf">
                      <div className="flex items-center justify-between gap-3">
                        <div className="flex items-center gap-2.5">
                          <div className="w-9 h-9 rounded-xl bg-white/5 border border-white/10 flex items-center justify-center text-[var(--primary)] shadow-sm">
                            <MusicNotes size={18} weight="duotone" />
                          </div>
                          <div>
                            <h3 className="font-display text-base sm:text-lg font-bold text-white tracking-wide">
                              {shelf.name} Hits
                            </h3>
                            <p className="text-xs text-[var(--text-light)]">Curated popular tracks in {shelf.name}</p>
                          </div>
                        </div>

                        <button
                          type="button"
                          onClick={() => {
                            setSelectedGenre(shelf.name);
                            setViewMode('grid');
                          }}
                          className="text-xs font-semibold text-[var(--primary)] hover:underline flex items-center gap-1"
                        >
                          <span>View all {shelf.name}</span>
                          <CaretRight size={14} weight="bold" />
                        </button>
                      </div>

                      <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-3.5 sm:gap-4">
                        {shelf.tracks.map((song) => (
                          <SongCard
                            key={song.id}
                            song={song}
                            isCurrent={currentSong?.id === song.id}
                            isPlaying={currentSong?.id === song.id && isPlaying}
                            onPlay={playSong}
                            onEdit={setEditSong}
                            onDelete={deleteTrack}
                            onAddToPlaylist={setAddToPlaylistSong}
                            isFavorite={Boolean(
                              favorites.includes(String(song.id)) ||
                              (song.songId && favorites.includes(String(song.songId)))
                            )}
                            onToggleFavorite={toggleFavorite}
                            viewMode="grid"
                          />
                        ))}
                      </div>
                    </section>
                  ))}

                  {/* Shelf 4: Trending Artists */}
                  {artists.length > 0 && (
                    <section className="space-y-3 pt-4 border-t border-white/5 smooth-shelf">
                      <div className="flex items-center justify-between gap-3">
                        <div className="flex items-center gap-2.5">
                          <div className="w-9 h-9 rounded-xl bg-violet-500/15 border border-violet-500/30 flex items-center justify-center text-violet-400 shadow-sm">
                            <MicrophoneStage size={18} weight="duotone" />
                          </div>
                          <div>
                            <h3 className="font-display text-base sm:text-lg font-bold text-white tracking-wide">
                              Trending Artists
                            </h3>
                            <p className="text-xs text-[var(--text-light)]">Top creators making waves</p>
                          </div>
                        </div>

                        <button
                          type="button"
                          onClick={() => setView('artists')}
                          className="text-xs font-semibold text-[var(--primary)] hover:underline flex items-center gap-1"
                        >
                          <span>All Artists</span>
                          <CaretRight size={14} weight="bold" />
                        </button>
                      </div>

                      <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-3">
                        {artists.slice(0, 6).map((a) => (
                          <ArtistCard
                            key={a.name}
                            artist={a.name}
                            songCount={a.count}
                            coverUrl={a.coverUrl}
                            isActive={selectedArtist === a.name}
                            onClick={() => {
                              setSelectedArtist(a.name === selectedArtist ? null : a.name);
                              setView('explore');
                            }}
                          />
                        ))}
                      </div>
                    </section>
                  )}

                  {/* Shelf 5: Featured Podcasts & Deep Dives */}
                  <ExplorePodcastsSection
                    currentSong={currentSong}
                    isPlaying={isPlaying}
                    onPlayEpisode={playSong}
                    onViewAllPodcasts={() => setView('podcasts')}
                    onOpenShow={() => setView('podcasts')}
                    subscribedIds={subscribedSeries.map((s) => s.seriesId || s.id)}
                    onToggleSubscribe={handleTogglePodcastSubscription}
                    onShowSuccess={showSuccess}
                  />
                </div>
              ) : viewMode === 'list' ? (
                /* ─── ORGANIZED TRACKLIST TABLE VIEW ─────────────────────────── */
                <div className="rounded-2xl glass-card overflow-hidden border border-white/10">
                  {/* Table Header */}
                  <div className="grid grid-cols-[auto_1fr_auto] md:grid-cols-[auto_2fr_1fr_auto_auto] items-center gap-3 sm:gap-4 px-4 py-3 text-[11px] font-bold text-[var(--text-light)]/70 uppercase tracking-wider border-b border-white/10 bg-white/[0.02]">
                    <div className="flex items-center gap-3 w-16">
                      <span className="w-6 text-center">#</span>
                      <span>Track</span>
                    </div>
                    <div>Title & Artist</div>
                    <div className="hidden md:block">Genre</div>
                    <div className="hidden sm:block text-right pr-2">Duration</div>
                    <div className="text-right pr-2">Actions</div>
                  </div>

                  {/* Table Rows */}
                  <div className="divide-y divide-white/5">
                    {filteredSongs.map((song, idx) => (
                      <SongCard
                        key={song.id}
                        index={idx}
                        song={song}
                        isCurrent={currentSong?.id === song.id}
                        isPlaying={currentSong?.id === song.id && isPlaying}
                        onPlay={playSong}
                        onEdit={setEditSong}
                        onDelete={deleteTrack}
                        onAddToPlaylist={setAddToPlaylistSong}
                        isFavorite={Boolean(
                          favorites.includes(String(song.id)) ||
                          (song.songId && favorites.includes(String(song.songId)))
                        )}
                        onToggleFavorite={toggleFavorite}
                        viewMode="list"
                      />
                    ))}
                  </div>
                </div>
              ) : (
                /* ─── ORGANIZED GRID VIEW ─────────────────────────────────────── */
                <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-3.5 sm:gap-4">
                  {filteredSongs.map((song, idx) => (
                    <SongCard
                      key={song.id}
                      index={idx}
                      song={song}
                      isCurrent={currentSong?.id === song.id}
                      isPlaying={currentSong?.id === song.id && isPlaying}
                      onPlay={playSong}
                      onEdit={setEditSong}
                      onDelete={deleteTrack}
                      onAddToPlaylist={setAddToPlaylistSong}
                      isFavorite={Boolean(
                        favorites.includes(String(song.id)) ||
                        (song.songId && favorites.includes(String(song.songId)))
                      )}
                      onToggleFavorite={toggleFavorite}
                      viewMode="grid"
                    />
                  ))}
                </div>
              )}
            </div>
          )}

          {/* ─── MY PLAYLISTS VIEW ────────────────────────────────────── */}
          {view === 'playlists' && (
            <Playlists
              playlists={playlists}
              activePlaylist={activePlaylist}
              setActivePlaylist={setActivePlaylist}
              isLoading={playlistsLoading}
              currentSong={currentSong}
              isPlaying={isPlaying}
              favorites={favorites}
              allSongs={[...songs, ...likedSongsList]}
              onPlaySong={(song, queue) => {
                if (queue && queue.length > 0) setSongs(queue);
                playSong(song);
              }}
              onToggleFavorite={toggleFavorite}
              onCreatePlaylist={createPlaylist}
              onDeletePlaylist={deletePlaylist}
              onRemoveSongFromPlaylist={removeSongFromPlaylist}
              onNavigateToExplore={() => {
                setActivePlaylist(null);
                setView('explore');
              }}
              showCreateModal={showCreatePlaylist}
              setShowCreateModal={setShowCreatePlaylist}
            />
          )}

          {view === 'artists' && (
            <div className="space-y-6">
              <div>
                <h2 className="font-display text-xl sm:text-2xl font-bold text-[var(--text)] tracking-wide flex items-center gap-2.5">
                  <MicrophoneStage size={26} weight="duotone" className="text-[var(--primary)]" />
                  <span>Trending Artists</span>
                </h2>
                <p className="text-xs text-[var(--text-light)] mt-0.5">
                  Discover top creators and trending artists on Azaad Music
                </p>
              </div>

              <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-4">
                {artists.map((a) => (
                  <ArtistCard
                    key={a.name}
                    artist={a.name}
                    songCount={a.count}
                    coverUrl={a.coverUrl}
                    isActive={selectedArtist === a.name}
                    onClick={() => {
                      setSelectedArtist(a.name === selectedArtist ? null : a.name);
                      setView('explore');
                    }}
                  />
                ))}
              </div>
            </div>
          )}

          {/* ─── PODCASTS & SHOWS VIEW ────────────────────────────── */}
          {view === 'podcasts' && (
            <PodcastsView
              currentSong={currentSong}
              isPlaying={isPlaying}
              onPlaySong={playSong}
              onPlayEpisode={playSong}
              subscribedSeries={subscribedSeries}
              onToggleSubscription={handleTogglePodcastSubscription}
              onOpenPlayerPage={() => setView('player')}
            />
          )}

          {/* ─── USER PROFILE & FIREBASE DATA VIEW ──────────────────── */}
          {view === 'profile' && (
            <UserProfileView
              currentUser={currentUser}
              userProfile={userProfile}
              playHistory={playHistory}
              searchHistory={searchHistory}
              favorites={favorites}
              allSongs={songs}
              playlists={playlists}
              currentSong={currentSong}
              isPlaying={isPlaying}
              onPlaySong={playSong}
              onToggleFavorite={toggleFavorite}
              onSelectSearchQuery={(q, filter) => {
                setSearchQuery(q);
                if (filter && filter !== 'all') setSearchFilter(filter);
                setView('explore');
              }}
              onOpenPlaylist={(pl) => {
                setActivePlaylist(pl);
                setView('playlists');
              }}
              onCreatePlaylist={() => setShowCreatePlaylist(true)}
              onNavigate={(v) => setView(v)}
              onSignOut={handleSignOut}
              onShowSuccess={showSuccess}
            />
          )}

          {/* ─── MUSIC PLAYER PAGE (FALLBACK WHEN NO SONG PLAYING) ───── */}
          {view === 'player' && !currentSong && (
            <MusicPlayerPage
              song={null}
              songs={filteredSongs.length > 0 ? filteredSongs : songs}
              onSelectSong={playSong}
              onBack={() => setView('explore')}
              allSongs={songs}
              subscribedSeries={subscribedSeries}
              onToggleSubscription={handleTogglePodcastSubscription}
            />
          )}
        </div>
      </main>

      {/* ─── FLOATING SMOOTH SCROLL-TO-TOP BUTTON ─────────────────── */}
      {showScrollTop && view !== 'player' && (
        <button
          type="button"
          onClick={() => window.scrollTo({ top: 0, behavior: 'smooth' })}
          aria-label="Scroll to top"
          title="Back to top"
          className={`fixed right-4 sm:right-6 z-40 w-10 h-10 rounded-full bg-[#121824]/95 hover:bg-[var(--primary)] text-[var(--primary)] hover:text-[var(--bg)] border border-[var(--primary)]/40 shadow-[0_8px_24px_rgba(0,0,0,0.65)] flex items-center justify-center transition-all duration-200 hover:scale-110 active:scale-95 ${
            currentSong ? 'bottom-36 sm:bottom-24' : 'bottom-20 sm:bottom-6'
          }`}
        >
          <ArrowUp size={18} weight="bold" />
        </button>
      )}

      {/* ─── MOBILE BOTTOM NAVIGATION ─────────────────────────────── */}
      <nav className="md:hidden fixed bottom-0 left-0 right-0 z-40 bg-[var(--sidebar-bg)]/95 backdrop-blur-2xl border-t border-white/[0.08] px-1.5 py-1.5 flex items-center justify-around gap-1">
        {navItems.map(({ id, label, icon: Icon }) => {
          const isActive = view === id;
          return (
            <button
              key={id}
              onClick={() => {
                setView(id);
                if (id !== 'explore' && id !== 'favorites') setSelectedArtist(null);
                if (id !== 'playlists') setActivePlaylist(null);
              }}
              className={`flex flex-col items-center gap-0.5 px-2 py-1 rounded-xl transition-all ${
                isActive
                  ? 'text-[var(--primary)] font-bold bg-[var(--primary)]/10'
                  : 'text-[var(--text-light)]/75 hover:text-[var(--text)]'
              }`}
            >
              <div className="relative">
                <Icon
                  size={20}
                  weight={isActive ? 'fill' : 'duotone'}
                  className={id === 'player' && isPlaying ? 'text-[var(--primary)] animate-spin-slow' : ''}
                />
                {id === 'player' && isPlaying && (
                  <span className="absolute -top-0.5 -right-0.5 w-2 h-2 rounded-full bg-[var(--primary)] animate-pulse" />
                )}
              </div>
              <span className="text-[10px] leading-tight">
                {id === 'player' ? 'Player' : id === 'favorites' ? 'Liked' : id === 'podcasts' ? 'Podcasts' : label.split(' ')[0]}
              </span>
            </button>
          );
        })}
      </nav>

      {/* ─── ADD TO PLAYLIST MODAL ─────────────────────────────────── */}
      {addToPlaylistSong && (
        <AddToPlaylistModal
          song={addToPlaylistSong}
          playlists={playlists}
          onClose={() => setAddToPlaylistSong(null)}
          onAddSongToPlaylist={addSongToPlaylist}
          onCreateNewPlaylist={() => {
            setAddToPlaylistSong(null);
            setView('playlists');
            setShowCreatePlaylist(true);
          }}
        />
      )}

      {/* ─── EDIT MODAL ────────────────────────────────────────────── */}
      {editSong && (
        <EditModal
          song={editSong}
          onClose={() => setEditSong(null)}
          onSave={handleEditSave}
          loading={editLoading}
        />
      )}

      {/* ─── BOTTOM AUDIO PLAYER & FULL MUSIC PLAYER VIEW ─────────── */}
      <PlayerBar
        song={currentSong}
        songs={filteredSongs.length > 0 ? filteredSongs : songs}
        onChangeSong={playSong}
        hasBottomNav={true}
        favorites={favorites}
        onToggleFavorite={toggleFavorite}
        onPlayStateChange={setIsPlaying}
        isPlayingProp={isPlaying}
        isPlayerPageView={view === 'player'}
        onClosePlayerPage={() => setView('explore')}
        onOpenPlayerPage={() => setView('player')}
        onAddToPlaylist={setAddToPlaylistSong}
        allSongs={songs}
        subscribedSeries={subscribedSeries}
        onToggleSubscription={handleTogglePodcastSubscription}
      />
    </div>
  );
}
