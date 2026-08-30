import React, { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import {
  auth,
  signInWithGoogle,
  signInWithEmail,
  signUpWithEmail,
  logoutUser,
  subscribeToLikedSongs,
  toggleCloudLikeSong,
  subscribeToUserPlaylists,
  saveCloudPlaylist,
  deleteCloudPlaylist,
} from './firebase';
import { onAuthStateChanged } from 'firebase/auth';
import {
  Plus,
  Upload,
  Search,
  Trash2,
  AlertCircle,
  CheckCircle2,
  Loader2,
  Music2,
  ShieldCheck,
  RefreshCw,
  Save,
  Camera,
  LogOut,
  X,
  ImageIcon,
  User,
  Mail,
  PenLine,
  Library,
  Play,
  Pause,
  SkipBack,
  SkipForward,
  Volume2,
  VolumeX,
  Edit3,
  LayoutGrid,
  List,
  Link,
  Lock,
  Mic2,
  Repeat,
  Shuffle,
  Heart,
  ChevronRight,
  ChevronLeft,
  UserPlus,
  Eye,
  EyeOff,
  Shield,
  KeyRound,
  Calendar,
  Disc3,
  ListMusic,
  MoreVertical,
  ArrowLeft,
  Flame,
  Radio,
  Sparkles,
  ExternalLink,
  Clock,
  Compass,
  Check,
} from 'lucide-react';

const DEFAULT_API_BASE =
  typeof window !== 'undefined'
    ? `${window.location.origin}/api/songs`
    : 'http://localhost:3000/api/songs';
const API_BASE = import.meta.env.VITE_API_BASE || DEFAULT_API_BASE;
const SERVER_BASE = API_BASE.replace('/api/songs', '');
const LOGO_URL = '/img/Logo.png';

const MAX_AUDIO_SIZE = 100 * 1024 * 1024;
const MAX_IMAGE_SIZE = 15 * 1024 * 1024;

const AUDIUS_GENRES = [
  'All',
  'Bollywood',
  'Pop',
  'Electronic',
  'Hip-Hop/Rap',
  'Rock',
  'R&B/Soul',
  'Ambient',
  'Acoustic',
  'Alternative',
  'Classical',
  'Dance',
  'Deep House',
  'EDM',
  'Indie',
  'Jazz',
  'Latin',
  'Synthwave',
  'Techno',
  'Trance',
  'Trap',
];

const POPULAR_SEARCHES = [
  'Kesariya',
  'Tum Hi Ho',
  'Chaleya',
  'Atif Aslam',
  'Arijit Singh',
  'Shreya Ghoshal',
  'Electronic EDM',
  'Lofi Chill',
];

const CATEGORY_OPTIONS = ['Electronic', 'Pop', 'Hip-Hop/Rap', 'Rock', 'R&B/Soul', 'Ambient', 'Hindi', 'Bangla', 'English', 'Other'];

const firstNonEmptyString = (...values) => {
  for (const value of values) {
    if (typeof value === 'string' && value.trim()) return value.trim();
  }
  return '';
};

const normalizeSong = (song = {}, index = 0) => {
  const normalizedId = firstNonEmptyString(song.id, song._id, song.songId) || `song-${index}`;
  const audiusId = firstNonEmptyString(
    song.audiusId,
    String(normalizedId).startsWith('audius-') ? String(normalizedId).replace(/^audius-/, '') : ''
  );

  let audioUrl = firstNonEmptyString(song.audioUrl, song.directStreamUrl, song.audio, song.songUrl, song.url);
  if (!audioUrl && audiusId) {
    audioUrl = `https://api.audius.co/v1/tracks/${audiusId}/stream?app_name=AZAAD_MUSIC_PLAYER`;
  }

  const isSaavn = song.source === 'saavn' || String(normalizedId).startsWith('saavn-');
  const source = song.source || (isSaavn ? 'saavn' : audiusId ? 'audius' : String(normalizedId).startsWith('global-') ? 'global' : 'local');
  const duration = typeof song.duration === 'number' ? song.duration : 0;
  const isFullSong = song.isFullSong ?? (source === 'saavn' || source === 'audius' || source === 'local' || duration > 40);

  return {
    ...song,
    id: normalizedId,
    audiusId: audiusId || undefined,
    globalId: song.globalId || undefined,
    title: firstNonEmptyString(song.title, song.name, song.trackName) || 'Untitled Track',
    artist: firstNonEmptyString(song.artist, song.singer, song.author) || 'Unknown Artist',
    singers: firstNonEmptyString(song.singers, song.singer, song.artist) || 'Unknown Artist',
    coverUrl: firstNonEmptyString(song.coverUrl, song.cover, song.coverImage, song.image) || 'https://images.unsplash.com/photo-1511671782779-c97d3d27a1d4?w=500&auto=format&fit=crop&q=80',
    audioUrl: audioUrl || '',
    duration,
    genre: song.genre || song.category || 'Music',
    category: song.category || song.genre || 'Trending',
    playCount: song.playCount || song.play_count || 0,
    favoriteCount: song.favoriteCount || song.favorite_count || 0,
    source,
    isFullSong,
  };
};

const mediaUrl = (url) => {
  if (!url) return '';
  if (url.startsWith('http://') || url.startsWith('https://') || url.startsWith('blob:')) {
    return url;
  }
  const normalizedPath = url.startsWith('/') ? url : `/${url}`;
  return `${SERVER_BASE}${normalizedPath}`;
};

const formatTime = (seconds) => {
  if (!seconds || isNaN(seconds) || seconds < 0) return '0:00';
  const mins = Math.floor(seconds / 60);
  const secs = Math.floor(seconds % 60);
  return `${mins}:${secs.toString().padStart(2, '0')}`;
};

const formatNumber = (num) => {
  if (!num || isNaN(num)) return '0';
  if (num >= 1_000_000) return `${(num / 1_000_000).toFixed(1)}M`;
  if (num >= 1_000) return `${(num / 1_000).toFixed(1)}k`;
  return String(num);
};

// ─── Edit Modal ────────────────────────────────────────────────────────────────
function EditModal({ song, onClose, onSave, loading }) {
  const [form, setForm] = useState({
    title: song.title || '',
    artist: song.artist || '',
    singers: song.singers || '',
    category: song.category || 'Other',
    genre: song.genre || '',
    type: song.type || '',
    vibe: song.vibe || '',
  });

  const handleChange = (e) => {
    setForm((prev) => ({ ...prev, [e.target.name]: e.target.value }));
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    onSave(song.id, form);
  };

  const inputClass =
    'w-full px-4 py-3 rounded-xl bg-[var(--bg)]/60 border border-[var(--primary)]/10 text-[var(--text)] placeholder-[var(--text-light)] focus:outline-none focus:border-[var(--primary)] focus:ring-1 focus:ring-[var(--primary)] transition-colors';

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/70 backdrop-blur-sm" onClick={onClose} />
      <div className="relative w-full max-w-lg glass-card rounded-2xl p-6 shadow-2xl">
        <div className="flex items-center justify-between mb-6">
          <h3 className="text-lg font-bold text-[var(--text)]">Edit Track</h3>
          <button
            onClick={onClose}
            className="p-2 rounded-lg hover:bg-white/10 text-[var(--text-light)] hover:text-[var(--text)] transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div className="col-span-2">
              <label className="text-xs text-[var(--text-light)] mb-1 block">Title *</label>
              <input name="title" value={form.title} onChange={handleChange} required className={inputClass} />
            </div>
            <div>
              <label className="text-xs text-[var(--text-light)] mb-1 block">Artist *</label>
              <input name="artist" value={form.artist} onChange={handleChange} required className={inputClass} />
            </div>
            <div>
              <label className="text-xs text-[var(--text-light)] mb-1 block">Singer(s)</label>
              <input name="singers" value={form.singers} onChange={handleChange} className={inputClass} />
            </div>
            <div>
              <label className="text-xs text-[var(--text-light)] mb-1 block">Category</label>
              <select name="category" value={form.category} onChange={handleChange} className={inputClass}>
                {CATEGORY_OPTIONS.map((opt) => (
                  <option key={opt} value={opt}>
                    {opt}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="text-xs text-[var(--text-light)] mb-1 block">Genre</label>
              <input name="genre" value={form.genre} onChange={handleChange} className={inputClass} />
            </div>
            <div>
              <label className="text-xs text-[var(--text-light)] mb-1 block">Type</label>
              <input name="type" value={form.type} onChange={handleChange} className={inputClass} />
            </div>
            <div>
              <label className="text-xs text-[var(--text-light)] mb-1 block">Vibe</label>
              <input name="vibe" value={form.vibe} onChange={handleChange} className={inputClass} />
            </div>
          </div>

          <div className="flex gap-3 pt-2">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 py-3 rounded-xl border border-[var(--primary)]/20 text-[var(--text-light)] hover:bg-white/5 font-medium transition-colors"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={loading}
              className="flex-1 py-3 rounded-xl bg-[var(--primary-dark)] hover:bg-[var(--primary)] text-[var(--bg)] font-bold disabled:opacity-50 flex items-center justify-center gap-2 transition-colors"
            >
              {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
              {loading ? 'Saving...' : 'Save'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

// ─── Audio Player Bar ──────────────────────────────────────────────────────────
function PlayerBar({ song, songs, onChangeSong, hasBottomNav, favorites = [], onToggleFavorite }) {
  const audioRef = useRef(null);
  const preloaderRef = useRef(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const [bufferedProgress, setBufferedProgress] = useState(0);
  const [volume, setVolume] = useState(1);
  const [isMuted, setIsMuted] = useState(false);
  const [isShuffled, setIsShuffled] = useState(false);
  const [repeatMode, setRepeatMode] = useState('off');
  const [isDragging, setIsDragging] = useState(false);
  const [audioError, setAudioError] = useState(false);
  const seekBarRef = useRef(null);

  const isLiked = favorites.includes(song.id);

  // Preload next track in queue for instant zero-latency transition
  useEffect(() => {
    if (!songs || songs.length <= 1) return;
    const idx = songs.findIndex((s) => s.id === song.id);
    const nextSong = idx !== -1 && idx < songs.length - 1 ? songs[idx + 1] : songs[0];
    if (nextSong?.audioUrl) {
      if (!preloaderRef.current) {
        preloaderRef.current = new Audio();
        preloaderRef.current.preload = 'auto';
      }
      preloaderRef.current.src = mediaUrl(nextSong.audioUrl);
    }
  }, [song.id, songs]);

  useEffect(() => {
    if (audioRef.current && song?.audioUrl) {
      setAudioError(false);
      setBufferedProgress(0);
      const playPromise = audioRef.current.play();
      if (playPromise !== undefined) {
        playPromise
          .then(() => setIsPlaying(true))
          .catch((e) => {
            console.warn('Playback autoplay deferred or interrupted:', e.message);
            setIsPlaying(false);
          });
      }
    }
  }, [song.id, song.audioUrl]);

  const togglePlay = useCallback(() => {
    if (!audioRef.current) return;
    if (isPlaying) {
      audioRef.current.pause();
      setIsPlaying(false);
    } else {
      setAudioError(false);
      const playPromise = audioRef.current.play();
      if (playPromise !== undefined) {
        playPromise
          .then(() => {
            setIsPlaying(true);
            setAudioError(false);
          })
          .catch((err) => {
            console.warn('Play error:', err.message);
            setIsPlaying(false);
            setAudioError(true);
          });
      }
    }
  }, [isPlaying]);

  const updateBufferedProgress = () => {
    if (audioRef.current && audioRef.current.buffered.length > 0) {
      const dur = audioRef.current.duration || duration || song.duration || 0;
      if (dur > 0) {
        try {
          const end = audioRef.current.buffered.end(audioRef.current.buffered.length - 1);
          setBufferedProgress(Math.min(100, (end / dur) * 100));
        } catch {
          /* ignore buffer query error */
        }
      }
    }
  };

  const handleTimeUpdate = () => {
    if (audioRef.current && !isDragging) {
      setCurrentTime(audioRef.current.currentTime);
      updateBufferedProgress();
    }
  };

  const handleLoadedMetadata = () => {
    if (audioRef.current && !isNaN(audioRef.current.duration) && audioRef.current.duration > 0) {
      setDuration(audioRef.current.duration);
    } else if (song.duration) {
      setDuration(song.duration);
    }
    updateBufferedProgress();
  };

  const handleSeek = (e) => {
    if (!audioRef.current || !seekBarRef.current) return;
    const dur = duration || song.duration || 0;
    if (!dur) return;
    const rect = seekBarRef.current.getBoundingClientRect();
    const ratio = Math.max(0, Math.min(1, (e.clientX - rect.left) / rect.width));
    audioRef.current.currentTime = ratio * dur;
    setCurrentTime(ratio * dur);
  };

  const handleSeekMouseDown = (e) => {
    setIsDragging(true);
    handleSeek(e);
    const onMove = (ev) => handleSeek(ev);
    const onUp = () => {
      setIsDragging(false);
      window.removeEventListener('mousemove', onMove);
      window.removeEventListener('mouseup', onUp);
    };
    window.addEventListener('mousemove', onMove);
    window.addEventListener('mouseup', onUp);
  };

  const handleVolumeChange = (e) => {
    const val = parseFloat(e.target.value);
    setVolume(val);
    if (audioRef.current) {
      audioRef.current.volume = val;
      audioRef.current.muted = false;
    }
    setIsMuted(val === 0);
  };

  const toggleMute = useCallback(() => {
    if (audioRef.current) {
      audioRef.current.muted = !isMuted;
      setIsMuted(!isMuted);
    }
  }, [isMuted]);

  const playNext = useCallback(() => {
    if (isShuffled && songs.length > 1) {
      let next;
      do {
        next = songs[Math.floor(Math.random() * songs.length)];
      } while (next.id === song.id && songs.length > 1);
      onChangeSong(next);
      return;
    }
    const idx = songs.findIndex((s) => s.id === song.id);
    if (idx !== -1 && idx < songs.length - 1) onChangeSong(songs[idx + 1]);
    else if (songs.length > 0) onChangeSong(songs[0]);
  }, [isShuffled, songs, song.id, onChangeSong]);

  const playPrev = useCallback(() => {
    if (audioRef.current && audioRef.current.currentTime > 3) {
      audioRef.current.currentTime = 0;
      return;
    }
    const idx = songs.findIndex((s) => s.id === song.id);
    if (idx > 0) onChangeSong(songs[idx - 1]);
    else if (songs.length > 0) onChangeSong(songs[songs.length - 1]);
  }, [songs, song.id, onChangeSong]);

  // Global keyboard shortcuts for pro playback experience
  useEffect(() => {
    const handleKeyDown = (e) => {
      // Ignore when user is typing in inputs or textareas
      const tag = e.target?.tagName?.toLowerCase();
      if (tag === 'input' || tag === 'textarea' || e.target?.isContentEditable) return;

      if (e.code === 'Space') {
        e.preventDefault();
        togglePlay();
      } else if (e.code === 'ArrowRight') {
        e.preventDefault();
        if (audioRef.current) {
          audioRef.current.currentTime = Math.min(audioRef.current.currentTime + 5, duration || 9999);
        }
      } else if (e.code === 'ArrowLeft') {
        e.preventDefault();
        if (audioRef.current) {
          audioRef.current.currentTime = Math.max(audioRef.current.currentTime - 5, 0);
        }
      } else if (e.key === 'm' || e.key === 'M') {
        toggleMute();
      } else if (e.key === 'n' || e.key === 'N') {
        playNext();
      } else if (e.key === 'p' || e.key === 'P') {
        playPrev();
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [togglePlay, toggleMute, playNext, playPrev, duration]);

  const handleEnded = () => {
    if (repeatMode === 'one') {
      audioRef.current.currentTime = 0;
      audioRef.current
        .play()
        .then(() => setIsPlaying(true))
        .catch(() => {});
      return;
    }
    setIsPlaying(false);
    playNext();
  };

  const cycleRepeat = () => {
    setRepeatMode((prev) => (prev === 'off' ? 'all' : prev === 'all' ? 'one' : 'off'));
  };

  useEffect(() => {
    if (typeof navigator === 'undefined' || !('mediaSession' in navigator)) return;

    const cover = mediaUrl(song.coverUrl);
    navigator.mediaSession.metadata = new MediaMetadata({
      title: song.title || 'Untitled',
      artist: song.singers || song.artist || 'Unknown artist',
      album: 'Azaad Music',
      artwork: cover
        ? [
            { src: cover, sizes: '96x96', type: 'image/jpeg' },
            { src: cover, sizes: '128x128', type: 'image/jpeg' },
            { src: cover, sizes: '192x192', type: 'image/jpeg' },
            { src: cover, sizes: '256x256', type: 'image/jpeg' },
            { src: cover, sizes: '512x512', type: 'image/jpeg' },
          ]
        : [],
    });

    navigator.mediaSession.setActionHandler('play', () => {
      if (!audioRef.current) return;
      audioRef.current.play().then(() => setIsPlaying(true)).catch(() => {});
    });
    navigator.mediaSession.setActionHandler('pause', () => {
      if (!audioRef.current) return;
      audioRef.current.pause();
      setIsPlaying(false);
    });
    navigator.mediaSession.setActionHandler('previoustrack', playPrev);
    navigator.mediaSession.setActionHandler('nexttrack', playNext);
  }, [song.id, song.title, song.singers, song.artist, song.coverUrl, playNext, playPrev]);

  useEffect(() => {
    if (typeof navigator === 'undefined' || !('mediaSession' in navigator)) return;
    navigator.mediaSession.playbackState = isPlaying ? 'playing' : 'paused';
  }, [isPlaying]);

  const activeDuration = duration || song.duration || 0;
  const progress = activeDuration ? (currentTime / activeDuration) * 100 : 0;

  return (
    <div
      className={`fixed z-50 transition-all duration-300 left-2 right-2 sm:left-0 sm:right-0 ${
        hasBottomNav ? 'bottom-[68px] sm:bottom-0' : 'bottom-2 sm:bottom-0'
      } rounded-2xl sm:rounded-none overflow-hidden bg-[#161f26]/95 sm:bg-[rgba(30,39,46,0.95)] backdrop-blur-2xl border border-[var(--primary)]/20 shadow-[0_12px_40px_rgba(0,0,0,0.6)]`}
    >
      <div className="absolute inset-0 bg-[linear-gradient(135deg,rgba(12,16,18,0.90),rgba(12,16,18,0.98))] backdrop-blur-[6px]" />
      
      <audio
        ref={audioRef}
        src={mediaUrl(song.audioUrl)}
        onTimeUpdate={handleTimeUpdate}
        onProgress={updateBufferedProgress}
        onLoadedMetadata={handleLoadedMetadata}
        onDurationChange={handleLoadedMetadata}
        onEnded={handleEnded}
        onError={() => {
          console.warn('Audio playback source error, attempting stream fallback');
          const audiusId = song.audiusId || (String(song.id).startsWith('audius-') ? String(song.id).replace(/^audius-/, '') : null);
          if (audiusId && audioRef.current) {
            const fallbackUrl = `https://api.audius.co/v1/tracks/${audiusId}/stream?app_name=AZAAD_MUSIC_PLAYER`;
            if (audioRef.current.src !== fallbackUrl) {
              audioRef.current.src = fallbackUrl;
              audioRef.current.play().then(() => {
                setIsPlaying(true);
                setAudioError(false);
              }).catch(() => {
                setAudioError(true);
                setIsPlaying(false);
              });
              return;
            }
          }
          setAudioError(true);
          setIsPlaying(false);
        }}
        loop={repeatMode === 'one'}
        preload="auto"
      />

      <div className="relative z-10">
        {/* Seek bar with buffered progress */}
        <div
          ref={seekBarRef}
          className="h-1 sm:h-1.5 bg-white/10 cursor-pointer group relative w-full"
          onMouseDown={handleSeekMouseDown}
        >
          {/* Buffered track */}
          <div
            className="absolute top-0 bottom-0 left-0 bg-white/15 transition-all duration-300 pointer-events-none"
            style={{ width: `${Math.min(100, Math.max(0, bufferedProgress))}%` }}
          />

          {/* Active progress */}
          <div
            className="h-full bg-gradient-to-r from-[var(--primary-dark)] to-[var(--primary)] group-hover:shadow-[0_0_12px_rgba(83,242,224,0.4)] transition-all relative"
            style={{ width: `${Math.min(100, Math.max(0, progress))}%` }}
          >
            <div className="absolute right-0 top-1/2 -translate-y-1/2 w-3 h-3 sm:w-4 sm:h-4 rounded-full bg-[var(--primary)] opacity-0 group-hover:opacity-100 transition-opacity shadow-[0_0_8px_rgba(83,242,224,0.6)]" />
          </div>
        </div>

        {/* Desktop / Tablet player layout */}
        <div className="hidden sm:flex items-center justify-between px-4 md:px-6 py-3 max-w-screen-2xl mx-auto">
          {/* Track info */}
          <div className="flex items-center gap-3 min-w-0 flex-1">
            <div className="relative flex-shrink-0">
              <img
                src={mediaUrl(song.coverUrl)}
                alt={song.title}
                loading="lazy"
                decoding="async"
                className={`w-14 h-14 rounded-xl object-cover border border-[var(--primary)]/20 ${
                  isPlaying ? 'shadow-[0_0_20px_rgba(83,242,224,0.2)]' : ''
                }`}
              />
              {isPlaying && (
                <div className="absolute -bottom-1 -right-1 flex items-end gap-[2px] bg-[var(--card-bg)] rounded-md px-1 py-0.5">
                  <span className="w-[3px] rounded-full bg-[var(--primary)] eq-bar-1" />
                  <span className="w-[3px] rounded-full bg-[var(--primary)] eq-bar-2" />
                  <span className="w-[3px] rounded-full bg-[var(--primary)] eq-bar-3" />
                  <span className="w-[3px] rounded-full bg-[var(--primary)] eq-bar-4" />
                </div>
              )}
            </div>
            <div className="min-w-0">
              <div className="flex items-center gap-2">
                <p className="text-sm font-semibold text-[var(--text)] truncate">{song.title}</p>
                {song.source === 'saavn' || song.category === 'Bollywood' ? (
                  <span className="text-[9px] font-bold px-1.5 py-0.5 rounded bg-amber-500/15 text-amber-300 border border-amber-500/30 uppercase tracking-wider">
                    Bollywood Master
                  </span>
                ) : song.source === 'audius' ? (
                  <span className="text-[9px] font-bold px-1.5 py-0.5 rounded bg-[var(--primary)]/15 text-[var(--primary)] border border-[var(--primary)]/20 uppercase tracking-wider">
                    Azaad Hi-Fi
                  </span>
                ) : song.isFullSong ? (
                  <span className="text-[9px] font-bold px-1.5 py-0.5 rounded bg-emerald-500/15 text-emerald-300 border border-emerald-500/25 uppercase tracking-wider">
                    Full Track
                  </span>
                ) : null}
              </div>
              <p className="text-xs text-[var(--text-light)] truncate flex items-center gap-1.5">
                <span>{song.singers || song.artist}</span>
                {song.genre && <span className="text-[10px] opacity-60">· {song.genre}</span>}
              </p>
            </div>
            <button
              onClick={() => onToggleFavorite(song.id)}
              className={`p-2 rounded-full transition-colors flex-shrink-0 ${
                isLiked ? 'text-red-400' : 'text-[var(--text-light)] hover:text-red-400'
              }`}
              title={isLiked ? 'Liked' : 'Like track'}
            >
              <Heart className={`w-4 h-4 ${isLiked ? 'fill-current' : ''}`} />
            </button>
          </div>

          {/* Center controls */}
          <div className="flex flex-col items-center gap-1 flex-shrink-0">
            <div className="flex items-center gap-3">
              <button
                onClick={() => setIsShuffled(!isShuffled)}
                className={`p-2 rounded-full transition-colors ${
                  isShuffled ? 'text-[var(--primary)]' : 'text-[var(--text-light)] hover:text-[var(--text)]'
                }`}
                title="Shuffle"
              >
                <Shuffle className="w-4 h-4" />
              </button>
              <button onClick={playPrev} className="p-2 text-[var(--text-light)] hover:text-[var(--text)] transition-colors">
                <SkipBack className="w-5 h-5" />
              </button>
              <button
                onClick={togglePlay}
                className="w-12 h-12 rounded-full bg-[var(--primary)] text-[var(--bg)] flex items-center justify-center hover:scale-105 transition-all glow-primary"
                title={isPlaying ? 'Pause (Space)' : 'Play (Space)'}
              >
                {isPlaying ? <Pause className="w-5 h-5" /> : <Play className="w-5 h-5 ml-0.5" />}
              </button>
              <button onClick={playNext} className="p-2 text-[var(--text-light)] hover:text-[var(--text)] transition-colors">
                <SkipForward className="w-5 h-5" />
              </button>
              <button
                onClick={cycleRepeat}
                className={`p-2 rounded-full transition-colors relative ${
                  repeatMode !== 'off' ? 'text-[var(--primary)]' : 'text-[var(--text-light)] hover:text-[var(--text)]'
                }`}
                title={`Repeat: ${repeatMode}`}
              >
                <Repeat className="w-4 h-4" />
                {repeatMode === 'one' && (
                  <span className="absolute -top-0.5 -right-0.5 text-[8px] font-bold bg-[var(--primary)] text-[var(--bg)] w-3.5 h-3.5 rounded-full flex items-center justify-center">
                    1
                  </span>
                )}
              </button>
            </div>
            <div className="flex items-center gap-2">
              <span className="text-[10px] text-[var(--text-light)]">{formatTime(currentTime)}</span>
              <span className="text-[10px] text-[var(--text-light)]">/</span>
              <span className="text-[10px] text-[var(--text-light)]">{formatTime(activeDuration)}</span>
              {audioError && <span className="text-[10px] text-amber-400 ml-1">Stream retry...</span>}
            </div>
          </div>

          {/* Volume */}
          <div className="hidden md:flex items-center gap-2 flex-1 justify-end">
            <button onClick={toggleMute} className="p-2 text-[var(--text-light)] hover:text-[var(--text)] transition-colors">
              {isMuted ? <VolumeX className="w-4 h-4" /> : <Volume2 className="w-4 h-4" />}
            </button>
            <input
              type="range"
              min="0"
              max="1"
              step="0.01"
              value={isMuted ? 0 : volume}
              onChange={handleVolumeChange}
              className="w-28"
            />
          </div>
        </div>

        {/* Mobile player layout */}
        <div className="sm:hidden px-3 py-2.5">
          <div className="flex items-center justify-between gap-2.5">
            {/* Song Cover & Info */}
            <div className="flex items-center gap-2.5 min-w-0 flex-1">
              <div className="relative flex-shrink-0">
                <img
                  src={mediaUrl(song.coverUrl)}
                  alt={song.title}
                  loading="lazy"
                  decoding="async"
                  className={`w-11 h-11 rounded-xl object-cover border border-[var(--primary)]/20 ${
                    isPlaying ? 'shadow-[0_0_12px_rgba(83,242,224,0.2)]' : ''
                  }`}
                />
                {isPlaying && (
                  <div className="absolute -bottom-0.5 -right-0.5 flex items-end gap-[1.5px] bg-[var(--card-bg)]/90 rounded px-1 py-0.5">
                    <span className="w-[2px] rounded-full bg-[var(--primary)] eq-bar-1" />
                    <span className="w-[2px] rounded-full bg-[var(--primary)] eq-bar-2" />
                    <span className="w-[2px] rounded-full bg-[var(--primary)] eq-bar-3" />
                  </div>
                )}
              </div>
              <div className="min-w-0 flex-1">
                <p className="text-[13px] font-semibold text-[var(--text)] truncate leading-tight">{song.title}</p>
                <p className="text-[11px] text-[var(--text-light)] truncate mt-0.5">{song.singers || song.artist}</p>
              </div>
            </div>

            {/* Quick Actions */}
            <div className="flex items-center gap-1 flex-shrink-0">
              <button
                onClick={() => onToggleFavorite(song.id)}
                className={`p-2 rounded-full active:scale-90 transition-transform ${
                  isLiked ? 'text-red-400' : 'text-[var(--text-light)]/60 hover:text-red-400'
                }`}
                title="Like"
              >
                <Heart className={`w-4 h-4 ${isLiked ? 'fill-current' : ''}`} />
              </button>
              <button
                onClick={playPrev}
                className="p-2 text-[var(--text-light)]/70 active:text-[var(--text)] active:scale-90 transition-all"
                title="Previous"
              >
                <SkipBack className="w-4 h-4" />
              </button>
              <button
                onClick={togglePlay}
                className="w-9 h-9 rounded-full bg-[var(--primary)] text-[var(--bg)] flex items-center justify-center active:scale-90 transition-all shadow-[0_0_14px_rgba(83,242,224,0.35)]"
                title={isPlaying ? 'Pause' : 'Play'}
              >
                {isPlaying ? <Pause className="w-4 h-4" /> : <Play className="w-4 h-4 ml-0.5" />}
              </button>
              <button
                onClick={playNext}
                className="p-2 text-[var(--text-light)]/70 active:text-[var(--text)] active:scale-90 transition-all"
                title="Next"
              >
                <SkipForward className="w-4 h-4" />
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

// ─── Artist Card ───────────────────────────────────────────────────────────────
function ArtistCard({ artist, songCount, coverUrl, isActive, onClick }) {
  return (
    <button
      onClick={onClick}
      className={`flex flex-col items-center gap-3 p-4 rounded-2xl transition-all duration-200 group ${
        isActive
          ? 'glass-card border-[var(--primary)]/30 glow-primary'
          : 'hover:bg-[var(--card-bg)]/60 border border-transparent hover:border-[var(--primary)]/10'
      }`}
    >
      <div
        className={`relative w-20 h-20 rounded-full overflow-hidden border-2 transition-colors ${
          isActive ? 'border-[var(--primary)]' : 'border-white/10 group-hover:border-[var(--primary)]/40'
        }`}
      >
        {coverUrl ? (
          <img src={mediaUrl(coverUrl)} alt={artist} className="w-full h-full object-cover" />
        ) : (
          <div className="w-full h-full bg-gradient-to-br from-[var(--primary-dark)]/30 to-[var(--accent)]/30 flex items-center justify-center">
            <Mic2 className="w-8 h-8 text-[var(--primary)]/60" />
          </div>
        )}
        {isActive && (
          <div className="absolute inset-0 bg-[var(--primary)]/10 flex items-center justify-center">
            <Music2 className="w-5 h-5 text-[var(--primary)]" />
          </div>
        )}
      </div>
      <div className="text-center min-w-0 w-full">
        <p className={`text-sm font-semibold truncate ${isActive ? 'text-[var(--primary)]' : 'text-[var(--text)]'}`}>
          {artist}
        </p>
        <p className="text-[11px] text-[var(--text-light)]">
          {songCount} {songCount === 1 ? 'track' : 'tracks'}
        </p>
      </div>
    </button>
  );
}

// ─── Song Card Component ───────────────────────────────────────────────────────
function SongCard({
  song,
  isPlaying,
  onPlay,
  onEdit,
  onDelete,
  onAddToPlaylist,
  isFavorite,
  onToggleFavorite,
  viewMode,
}) {
  if (viewMode === 'list') {
    return (
      <div
        className={`group flex items-center gap-4 px-4 py-3 rounded-xl transition-all duration-200 ${
          isPlaying
            ? 'bg-[var(--primary)]/10 border border-[var(--primary)]/20'
            : 'hover:bg-white/5 border border-transparent'
        }`}
      >
        <div className="relative w-12 h-12 rounded-lg overflow-hidden flex-shrink-0 bg-black/40">
          <img src={mediaUrl(song.coverUrl)} alt={song.title} className="w-full h-full object-cover" />
          <button
            onClick={() => onPlay(song)}
            className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 flex items-center justify-center transition-opacity"
          >
            {isPlaying ? <Pause className="w-4 h-4 text-white" /> : <Play className="w-4 h-4 text-white ml-0.5" />}
          </button>
          {isPlaying && (
            <div className="absolute inset-0 bg-black/30 flex items-center justify-center">
              <div className="flex items-end gap-[2px]">
                <span className="w-[2px] rounded-full bg-[var(--primary)] eq-bar-1" />
                <span className="w-[2px] rounded-full bg-[var(--primary)] eq-bar-2" />
                <span className="w-[2px] rounded-full bg-[var(--primary)] eq-bar-3" />
              </div>
            </div>
          )}
        </div>
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2">
            <p className={`text-sm font-medium truncate ${isPlaying ? 'text-[var(--primary)]' : 'text-[var(--text)]'}`}>
              {song.title}
            </p>
            {song.source === 'saavn' || song.category === 'Bollywood' || song.genre === 'Bollywood' ? (
              <span className="text-[9px] font-bold px-1.5 py-0.2 rounded bg-amber-500/15 text-amber-300 border border-amber-500/30 hidden sm:inline-block">
                Bollywood Master
              </span>
            ) : song.source === 'audius' ? (
              <span className="text-[9px] font-bold px-1.5 py-0.2 rounded bg-[var(--primary)]/10 text-[var(--primary)] border border-[var(--primary)]/20 hidden sm:inline-block">
                Azaad Hi-Fi
              </span>
            ) : song.isFullSong ? (
              <span className="text-[9px] font-bold px-1.5 py-0.2 rounded bg-emerald-500/15 text-emerald-300 border border-emerald-500/25 hidden sm:inline-block">
                Full Track
              </span>
            ) : song.source === 'global' ? (
              <span className="text-[9px] font-bold px-1.5 py-0.2 rounded bg-purple-500/15 text-purple-300 border border-purple-500/25 hidden sm:inline-block">
                Global Hit
              </span>
            ) : null}
          </div>
          <p className="text-xs text-[var(--text-light)] truncate flex items-center gap-1.5">
            <span>{song.singers || song.artist}</span>
            {song.duration > 0 && <span className="opacity-50">· {formatTime(song.duration)}</span>}
          </p>
        </div>
        
        <span className="text-xs text-[var(--text-light)]/60 hidden md:block">
          {song.genre || song.category || 'Other'}
        </span>

        {song.playCount > 0 && (
          <span className="text-[11px] text-[var(--text-light)]/50 hidden lg:flex items-center gap-1">
            <Flame className="w-3 h-3 text-[var(--primary)]" />
            {formatNumber(song.playCount)}
          </span>
        )}

        <div className="flex items-center gap-1">
          <button
            onClick={() => onToggleFavorite(song.id)}
            className={`p-2 rounded-lg transition-colors ${
              isFavorite ? 'text-red-400' : 'text-[var(--text-light)] hover:text-red-400'
            }`}
            title={isFavorite ? 'Liked' : 'Like'}
          >
            <Heart className={`w-3.5 h-3.5 ${isFavorite ? 'fill-current' : ''}`} />
          </button>
          {onAddToPlaylist && (
            <button
              onClick={() => onAddToPlaylist(song)}
              className="p-2 rounded-lg hover:bg-[var(--primary)]/20 text-[var(--text-light)] hover:text-[var(--primary)] transition-colors"
              title="Add to playlist"
            >
              <ListMusic className="w-3.5 h-3.5" />
            </button>
          )}
          {song.source === 'local' && onEdit && (
            <button
              onClick={() => onEdit(song)}
              className="p-2 rounded-lg hover:bg-white/10 text-[var(--text-light)] hover:text-[var(--text)] transition-colors"
              title="Edit"
            >
              <Edit3 className="w-3.5 h-3.5" />
            </button>
          )}
          {song.source === 'local' && onDelete && (
            <button
              onClick={() => onDelete(song.id)}
              className="p-2 rounded-lg hover:bg-red-500/20 text-[var(--text-light)] hover:text-red-400 transition-colors"
              title="Delete"
            >
              <Trash2 className="w-3.5 h-3.5" />
            </button>
          )}
        </div>
      </div>
    );
  }

  return (
    <div
      className={`group relative rounded-2xl overflow-hidden glass-card transition-all duration-200 hover:border-[var(--primary)]/30 hover:shadow-lg ${
        isPlaying ? 'border-[var(--primary)]/30 shadow-[0_0_24px_rgba(83,242,224,0.12)]' : ''
      }`}
    >
      <div className="relative aspect-square overflow-hidden bg-black/40">
        <img
          src={mediaUrl(song.coverUrl)}
          alt={song.title}
          className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
          loading="lazy"
        />
        <div className="absolute inset-0 bg-gradient-to-t from-[var(--card-bg)] via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
        
        {/* Source Badge */}
        {song.source === 'saavn' || song.category === 'Bollywood' || song.genre === 'Bollywood' ? (
          <div className="absolute top-2.5 right-2.5 px-2 py-0.5 rounded-full bg-black/70 backdrop-blur-md border border-amber-500/40 text-[9px] font-bold text-amber-300">
            Bollywood Master
          </div>
        ) : song.source === 'audius' ? (
          <div className="absolute top-2.5 right-2.5 px-2 py-0.5 rounded-full bg-black/60 backdrop-blur-md border border-[var(--primary)]/30 text-[9px] font-bold text-[var(--primary)]">
            Azaad Hi-Fi
          </div>
        ) : song.isFullSong ? (
          <div className="absolute top-2.5 right-2.5 px-2 py-0.5 rounded-full bg-black/70 backdrop-blur-md border border-emerald-500/30 text-[9px] font-bold text-emerald-300">
            Full Track
          </div>
        ) : song.source === 'global' ? (
          <div className="absolute top-2.5 right-2.5 px-2 py-0.5 rounded-full bg-black/70 backdrop-blur-md border border-purple-500/30 text-[9px] font-bold text-purple-300">
            Global Hit
          </div>
        ) : null}

        {/* Play Button */}
        <button
          onClick={() => onPlay(song)}
          className="absolute bottom-3 right-3 w-11 h-11 rounded-full bg-[var(--primary)] text-[var(--bg)] flex items-center justify-center shadow-lg opacity-0 group-hover:opacity-100 translate-y-2 group-hover:translate-y-0 transition-all duration-200 hover:scale-110 glow-primary"
        >
          {isPlaying ? <Pause className="w-5 h-5" /> : <Play className="w-5 h-5 ml-0.5" />}
        </button>

        {/* Playing Status */}
        {isPlaying && (
          <div className="absolute top-3 left-3 px-2.5 py-1 rounded-full bg-[var(--primary)]/90 text-[10px] font-bold text-[var(--bg)] flex items-center gap-1.5 shadow-md">
            <span className="inline-flex gap-[2px] items-end">
              <span className="w-[3px] rounded-full bg-[var(--bg)] eq-bar-1" />
              <span className="w-[3px] rounded-full bg-[var(--bg)] eq-bar-2" />
              <span className="w-[3px] rounded-full bg-[var(--bg)] eq-bar-3" />
            </span>
            Playing
          </div>
        )}

        {song.duration > 0 && (
          <div className="absolute bottom-2.5 left-2.5 px-1.5 py-0.5 rounded bg-black/60 backdrop-blur-sm text-[10px] text-white/80">
            {formatTime(song.duration)}
          </div>
        )}
      </div>

      <div className="p-3.5 sm:p-4">
        <h4 className={`font-semibold truncate text-sm ${isPlaying ? 'text-[var(--primary)]' : 'text-[var(--text)]'}`}>
          {song.title}
        </h4>
        <p className="text-xs text-[var(--text-light)] truncate mt-0.5 flex items-center gap-1">
          <span>{song.singers || song.artist}</span>
        </p>

        <div className="flex items-center justify-between mt-3 pt-1 border-t border-white/5">
          <span className="text-[10px] text-[var(--text-light)]/70 uppercase tracking-wider font-medium truncate max-w-[80px]">
            {song.genre || song.category || 'Music'}
          </span>
          <div className="flex items-center gap-1">
            <button
              onClick={() => onToggleFavorite(song.id)}
              className={`p-1.5 rounded-lg transition-colors ${
                isFavorite ? 'text-red-400' : 'text-[var(--text-light)] hover:text-red-400'
              }`}
              title={isFavorite ? 'Liked' : 'Like track'}
            >
              <Heart className={`w-3.5 h-3.5 ${isFavorite ? 'fill-current' : ''}`} />
            </button>
            {onAddToPlaylist && (
              <button
                onClick={() => onAddToPlaylist(song)}
                className="p-1.5 rounded-lg hover:bg-[var(--primary)]/20 text-[var(--text-light)] hover:text-[var(--primary)] transition-colors"
                title="Add to playlist"
              >
                <ListMusic className="w-3.5 h-3.5" />
              </button>
            )}
            {song.source === 'local' && onEdit && (
              <button
                onClick={() => onEdit(song)}
                className="p-1.5 rounded-lg hover:bg-white/10 text-[var(--text-light)] hover:text-[var(--text)] transition-colors"
                title="Edit"
              >
                <Edit3 className="w-3.5 h-3.5" />
              </button>
            )}
            {song.source === 'local' && onDelete && (
              <button
                onClick={() => onDelete(song.id)}
                className="p-1.5 rounded-lg hover:bg-red-500/20 text-[var(--text-light)] hover:text-red-400 transition-colors"
                title="Delete"
              >
                <Trash2 className="w-3.5 h-3.5" />
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

// ─── Main App Component ────────────────────────────────────────────────────────
export default function App() {
  const [currentUser, setCurrentUser] = useState(null);
  const [authLoading, setAuthLoading] = useState(true);
  const [showAuthModal, setShowAuthModal] = useState(false);
  const [authEmail, setAuthEmail] = useState('');
  const [authPassword, setAuthPassword] = useState('');
  const [authDisplayName, setAuthDisplayName] = useState('');
  const [isSignup, setIsSignup] = useState(false);
  const [authSubmitting, setAuthSubmitting] = useState(false);

  // Main navigation & state
  const [view, setView] = useState('explore'); // 'explore', 'library', 'playlists', 'artists', 'audius-playlists', 'upload', 'profile'
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
  const [audiusPlaylists, setAudiusPlaylists] = useState([]);
  const [selectedGenre, setSelectedGenre] = useState('All');
  const [selectedTime, setSelectedTime] = useState('week'); // 'week', 'month', 'allTime'
  const [catalogSource, setCatalogSource] = useState('audius'); // 'audius', 'all', 'local'
  const [loading, setLoading] = useState(false);
  const [initLoading, setInitLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [searchQuery, setSearchQuery] = useState('');
  const [debouncedQuery, setDebouncedQuery] = useState('');
  const [viewMode, setViewMode] = useState('grid'); // 'grid' | 'list'

  // Player & Favorites
  const [currentSong, setCurrentSong] = useState(null);
  const [editSong, setEditSong] = useState(null);
  const [editLoading, setEditLoading] = useState(false);
  const [selectedArtist, setSelectedArtist] = useState(null);
  const [favorites, setFavorites] = useState(() => {
    try {
      const saved = localStorage.getItem('azaad_favorites');
      return saved ? JSON.parse(saved) : [];
    } catch {
      return [];
    }
  });

  // Playlists
  const [playlists, setPlaylists] = useState([]);
  const [playlistsLoading, setPlaylistsLoading] = useState(false);
  const [showCreatePlaylist, setShowCreatePlaylist] = useState(false);
  const [activePlaylist, setActivePlaylist] = useState(null);
  const [addToPlaylistSong, setAddToPlaylistSong] = useState(null);
  const [newPlaylistName, setNewPlaylistName] = useState('');
  const [newPlaylistDesc, setNewPlaylistDesc] = useState('');

  const successTimer = useRef(null);
  const searchInputRef = useRef(null);
  const blobUrlsRef = useRef([]);
  const clientSearchCache = useRef(new Map());

  // Listen to Firebase Auth state
  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (user) => {
      setCurrentUser(user);
      setAuthLoading(false);
    });
    return () => unsubscribe();
  }, []);

  // Real-time Cloud Sync for Liked Songs
  useEffect(() => {
    if (!currentUser) return;
    const unsubscribe = subscribeToLikedSongs(currentUser.uid, (cloudLiked) => {
      if (Array.isArray(cloudLiked)) {
        const ids = cloudLiked.map((item) => String(item.songId || item.id));
        setFavorites(ids);
        localStorage.setItem('azaad_favorites', JSON.stringify(ids));
      }
    });
    return () => unsubscribe();
  }, [currentUser]);

  // Real-time Cloud Sync for User Playlists
  useEffect(() => {
    if (!currentUser) return;
    setPlaylistsLoading(true);
    const unsubscribe = subscribeToUserPlaylists(
      currentUser.uid,
      (cloudPlaylists) => {
        setPlaylists(cloudPlaylists);
        setPlaylistsLoading(false);
      },
      () => setPlaylistsLoading(false)
    );
    return () => unsubscribe();
  }, [currentUser]);

  const [profile, setProfile] = useState({
    adminName: localStorage.getItem('admin_name') || 'Azad Hossain',
    adminEmail: localStorage.getItem('admin_email') || 'admin@azaad.com',
    adminPhoto: localStorage.getItem('admin_photo') || 'https://api.dicebear.com/7.x/avataaars/svg?seed=Azad',
    bio: localStorage.getItem('admin_bio') || 'Music Producer & Content Creator',
  });

  const [previews, setPreviews] = useState({ audio: '', cover: '', avatar: '' });
  const [audioUploadMode, setAudioUploadMode] = useState('file');
  const [coverUploadMode, setCoverUploadMode] = useState('file');
  const [audioUrlInput, setAudioUrlInput] = useState('');
  const [coverUrlInput, setCoverUrlInput] = useState('');

  // Fast debounce search query (260ms)
  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedQuery(searchQuery);
    }, 260);
    return () => clearTimeout(timer);
  }, [searchQuery]);

  // Cloud & Local Sync for Favorites
  const toggleFavorite = async (songId) => {
    const targetSong = songs.find((s) => s.id === songId) || { id: songId, title: 'Track' };
    
    // Update local state immediately for instant feedback
    setFavorites((prev) => {
      const updated = prev.includes(songId) ? prev.filter((id) => id !== songId) : [...prev, songId];
      localStorage.setItem('azaad_favorites', JSON.stringify(updated));
      return updated;
    });

    if (currentUser) {
      try {
        const isLikedNow = await toggleCloudLikeSong(currentUser.uid, targetSong);
        showSuccess(isLikedNow ? 'Saved to your cloud Liked Songs' : 'Removed from Liked Songs', 1800);
      } catch (err) {
        console.warn('Cloud like sync error:', err.message);
      }
    } else {
      showSuccess(favorites.includes(songId) ? 'Removed from favorites' : 'Saved to favorites');
    }
  };

  const showSuccess = (message, timeout = 2500) => {
    if (successTimer.current) clearTimeout(successTimer.current);
    setSuccess(message);
    successTimer.current = setTimeout(() => setSuccess(''), timeout);
  };

  const authFetch = useCallback(
    async (url, options = {}) => {
      return fetch(url, options);
    },
    []
  );

  // Fetch Music Tracks (Audius + Universal Catalog) with Client Caching
  const fetchAudiusTracks = useCallback(
    async (genre = selectedGenre, query = debouncedQuery, time = selectedTime) => {
      const cacheKey = `${genre}:${query.trim().toLowerCase()}:${time}`;
      if (clientSearchCache.current.has(cacheKey)) {
        const cached = clientSearchCache.current.get(cacheKey);
        setSongs(cached);
        if (!query.trim()) setTrendingTracks(cached);
        setInitLoading(false);
        return;
      }

      setInitLoading(true);
      setError('');
      try {
        let endpoint = `${SERVER_BASE}/api/songs?limit=60`;
        if (query.trim()) {
          endpoint = `${SERVER_BASE}/api/songs/search?q=${encodeURIComponent(query.trim())}&limit=60`;
          if (genre && genre !== 'All') endpoint += `&genre=${encodeURIComponent(genre)}`;
        } else {
          endpoint = `${SERVER_BASE}/api/songs/audius/trending?time=${time}&limit=60`;
          if (genre && genre !== 'All') endpoint += `&genre=${encodeURIComponent(genre)}`;
        }

        const res = await fetch(endpoint);
        if (!res.ok) throw new Error('Failed to fetch music');
        const data = await res.json();
        const list = Array.isArray(data) ? data : data.tracks || data.songs || [];
        const normalized = list.map((item, idx) => normalizeSong(item, idx));
        clientSearchCache.current.set(cacheKey, normalized);
        setSongs(normalized);
        if (!query.trim()) {
          setTrendingTracks(normalized);
        }
      } catch (err) {
        console.error('Fetch songs error:', err);
        setError('Failed to load music. Please retry.');
      } finally {
        setInitLoading(false);
      }
    },
    [selectedGenre, debouncedQuery, selectedTime]
  );

  // Fetch Audius Playlists
  const fetchAudiusPlaylists = useCallback(async () => {
    try {
      const res = await fetch(`${SERVER_BASE}/api/songs/audius/playlists?limit=24`);
      if (res.ok) {
        const data = await res.json();
        setAudiusPlaylists(data.playlists || []);
      }
    } catch (e) {
      console.warn('Audius playlists fetch failed:', e);
    }
  }, []);

  // Fetch Custom Local/Server Playlists (Fallback when not logged in)
  const fetchPlaylists = useCallback(async () => {
    if (currentUser) return;
    try {
      setPlaylistsLoading(true);
      const res = await fetch(`${SERVER_BASE}/api/playlists`);
      if (res.ok) {
        const data = await res.json();
        setPlaylists(Array.isArray(data.playlists) ? data.playlists : []);
      }
    } catch {
      /* ignore */
    } finally {
      setPlaylistsLoading(false);
    }
  }, [currentUser]);

  useEffect(() => {
    fetchAudiusTracks(selectedGenre, debouncedQuery, selectedTime);
  }, [fetchAudiusTracks, selectedGenre, debouncedQuery, selectedTime]);

  useEffect(() => {
    fetchAudiusPlaylists();
    fetchPlaylists();
  }, [fetchAudiusPlaylists, fetchPlaylists]);

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

  // Filtered song list
  const filteredSongs = useMemo(() => {
    let list = songs;
    if (selectedArtist) {
      list = list.filter((s) => s.artist === selectedArtist);
    }
    if (view === 'favorites') {
      list = list.filter((s) => favorites.includes(s.id));
    }
    return list;
  }, [songs, selectedArtist, view, favorites]);

  const playSong = (song) => {
    if (currentSong?.id === song.id) {
      setCurrentSong(null);
    } else {
      setCurrentSong(song);
    }
  };

  const handleGoogleAuth = async () => {
    setAuthSubmitting(true);
    setError('');
    try {
      const user = await signInWithGoogle();
      setShowAuthModal(false);
      showSuccess(`Welcome, ${user.displayName || user.email}!`);
    } catch (err) {
      setError(err.message || 'Google sign in failed');
    } finally {
      setAuthSubmitting(false);
    }
  };

  const handleEmailAuth = async (e) => {
    e.preventDefault();
    if (!authEmail || !authPassword) return;
    setAuthSubmitting(true);
    setError('');
    try {
      if (isSignup) {
        await signUpWithEmail(authEmail, authPassword, authDisplayName || 'Azaad User');
        showSuccess('Account created successfully!');
      } else {
        await signInWithEmail(authEmail, authPassword);
        showSuccess('Signed in successfully!');
      }
      setShowAuthModal(false);
      setAuthEmail('');
      setAuthPassword('');
      setAuthDisplayName('');
    } catch (err) {
      setError(err.message || 'Authentication failed');
    } finally {
      setAuthSubmitting(false);
    }
  };

  const handleSignOut = async () => {
    try {
      await logoutUser();
      showSuccess('Signed out');
    } catch (err) {
      setError(err.message);
    }
  };

  const createPlaylist = async (name, description) => {
    if (!name.trim()) return null;
    setError('');

    if (currentUser) {
      try {
        const newPl = {
          name: name.trim(),
          description: description.trim(),
          tracks: [],
          songIds: [],
        };
        const plId = await saveCloudPlaylist(currentUser.uid, newPl);
        showSuccess('Playlist created in Cloud!');
        setShowCreatePlaylist(false);
        setNewPlaylistName('');
        setNewPlaylistDesc('');
        return { id: plId, ...newPl };
      } catch (err) {
        setError('Failed to create cloud playlist: ' + err.message);
        return null;
      }
    }

    try {
      const res = await fetch(`${SERVER_BASE}/api/playlists`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: name.trim(), description: description.trim() }),
      });
      if (!res.ok) {
        const data = await res.json();
        setError(data.error || 'Failed to create playlist.');
        return null;
      }
      const pl = await res.json();
      setPlaylists((prev) => [pl, ...prev]);
      showSuccess('Playlist created!');
      setShowCreatePlaylist(false);
      setNewPlaylistName('');
      setNewPlaylistDesc('');
      return pl;
    } catch {
      setError('Could not reach the server.');
      return null;
    }
  };

  const deletePlaylist = async (id) => {
    if (!window.confirm('Delete this playlist?')) return;
    
    if (currentUser) {
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

    try {
      const res = await fetch(`${SERVER_BASE}/api/playlists/${id}`, {
        method: 'DELETE',
      });
      if (res.ok) {
        setPlaylists((prev) => prev.filter((p) => p.id !== id));
        if (activePlaylist?.id === id) setActivePlaylist(null);
        showSuccess('Playlist deleted.');
      }
    } catch {
      setError('Could not reach the server.');
    }
  };

  const addSongToPlaylist = async (playlistId, songId) => {
    const song = songs.find((s) => s.id === songId);
    if (currentUser) {
      try {
        const pl = playlists.find((p) => p.id === playlistId);
        if (pl) {
          const currentTracks = pl.tracks || [];
          const songIds = pl.songIds || currentTracks.map((t) => t.id || t.songId);
          if (!songIds.includes(songId)) {
            const updatedTracks = [...currentTracks, song || { id: songId, title: 'Track' }];
            const updatedPl = {
              ...pl,
              tracks: updatedTracks,
              songIds: [...songIds, songId],
              trackCount: updatedTracks.length,
            };
            await saveCloudPlaylist(currentUser.uid, updatedPl);
            showSuccess('Added to cloud playlist!');
          } else {
            showSuccess('Track already in playlist.');
          }
        }
      } catch (err) {
        setError('Failed to update playlist: ' + err.message);
      }
      setAddToPlaylistSong(null);
      return;
    }

    try {
      const res = await fetch(`${SERVER_BASE}/api/playlists/${playlistId}/songs`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ songId }),
      });
      if (res.ok) {
        const updated = await res.json();
        setPlaylists((prev) => prev.map((p) => (p.id === updated.id ? updated : p)));
        if (activePlaylist?.id === updated.id) setActivePlaylist(updated);
        showSuccess('Added to playlist!');
      }
    } catch {
      setError('Could not reach the server.');
    }
    setAddToPlaylistSong(null);
  };

  const removeSongFromPlaylist = async (playlistId, songId) => {
    if (currentUser) {
      try {
        const pl = playlists.find((p) => p.id === playlistId);
        if (pl) {
          const currentTracks = pl.tracks || [];
          const updatedTracks = currentTracks.filter((t) => (t.id || t.songId) !== songId);
          const songIds = (pl.songIds || []).filter((id) => id !== songId);
          const updatedPl = {
            ...pl,
            tracks: updatedTracks,
            songIds: songIds,
            trackCount: updatedTracks.length,
          };
          await saveCloudPlaylist(currentUser.uid, updatedPl);
          showSuccess('Removed from cloud playlist.');
        }
      } catch (err) {
        setError('Failed to remove track: ' + err.message);
      }
      return;
    }

    try {
      const res = await fetch(`${SERVER_BASE}/api/playlists/${playlistId}/songs/${songId}`, {
        method: 'DELETE',
      });
      if (res.ok) {
        const updated = await res.json();
        setPlaylists((prev) => prev.map((p) => (p.id === updated.id ? updated : p)));
        if (activePlaylist?.id === updated.id) setActivePlaylist(updated);
        showSuccess('Removed from playlist.');
      }
    } catch {
      setError('Could not reach the server.');
    }
  };

  const handleAddTrack = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError('');
    const fd = new FormData(e.target);

    if (audioUploadMode === 'url') {
      fd.delete('audio');
      if (audioUrlInput.trim()) fd.set('audioUrl', audioUrlInput.trim());
    }
    if (coverUploadMode === 'url') {
      fd.delete('cover');
      if (coverUrlInput.trim()) fd.set('coverUrl', coverUrlInput.trim());
    }

    try {
      const res = await authFetch(API_BASE, {
        method: 'POST',
        body: fd,
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Upload failed.');
      e.target.reset();
      setPreviews({ audio: '', cover: '', avatar: '' });
      setAudioUrlInput('');
      setCoverUrlInput('');
      fetchAudiusTracks();
      setView('explore');
      showSuccess('Track uploaded successfully!');
    } catch (err) {
      setError(err.message || 'Network error.');
    } finally {
      setLoading(false);
    }
  };

  const deleteTrack = async (id) => {
    if (!window.confirm('Delete this track permanently?')) return;
    try {
      const res = await authFetch(`${API_BASE}/${id}`, {
        method: 'DELETE',
      });
      if (!res.ok) {
        const d = await res.json();
        throw new Error(d.error || 'Delete failed.');
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
      const res = await authFetch(`${API_BASE}/${id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(form),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Update failed.');
      const updated = normalizeSong(data, 0);
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

  const navItems = [
    { id: 'explore', label: 'Explore & Trending', icon: Flame },
    { id: 'audius-playlists', label: 'Curated Playlists', icon: Disc3 },
    { id: 'favorites', label: 'Liked Songs', icon: Heart },
    { id: 'playlists', label: 'My Playlists', icon: ListMusic },
    { id: 'artists', label: 'Top Artists', icon: Mic2 },
    { id: 'upload', label: 'Upload Track', icon: Upload },
  ];

  const bottomPad = currentSong ? 'pb-44 sm:pb-24' : 'pb-20 sm:pb-8';

  return (
    <div className={`min-h-screen app-bg text-[var(--text)] flex relative ${bottomPad}`}>
      <div className="absolute inset-0 bg-[var(--bg)]/85" />

      {/* Desktop / Tablet Sidebar */}
      <aside
        className={`hidden md:flex sidebar-slide ${
          sidebarOpen ? 'sidebar-expanded' : 'sidebar-collapsed'
        } sticky top-0 z-40 h-screen flex-col bg-[var(--sidebar-bg)]/95 backdrop-blur-xl border-r border-[var(--primary)]/10`}
      >
        {sidebarOpen ? (
          <div className="pt-5 pb-4 px-4 flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-[var(--primary)] to-[var(--accent)] flex items-center justify-center shadow-md">
                <Music2 className="w-5 h-5 text-[var(--bg)]" />
              </div>
              <div>
                <h1 className="font-bold text-sm text-[var(--text)] leading-none">Azaad Music</h1>
                <span className="text-[10px] text-[var(--primary)] font-medium">Hi-Fi Master Audio</span>
              </div>
            </div>
            <button
              onClick={() => setSidebarOpen(false)}
              title="Collapse sidebar"
              className="p-1.5 rounded-lg text-[var(--text-light)] hover:text-[var(--text)] hover:bg-white/5 transition-colors"
            >
              <ChevronLeft className="w-4 h-4" />
            </button>
          </div>
        ) : (
          <div className="pt-5 pb-4 flex flex-col items-center gap-2">
            <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-[var(--primary)] to-[var(--accent)] flex items-center justify-center">
              <Music2 className="w-5 h-5 text-[var(--bg)]" />
            </div>
            <button
              onClick={() => setSidebarOpen(true)}
              title="Expand sidebar"
              className="p-1.5 rounded-lg text-[var(--text-light)] hover:text-[var(--text)] hover:bg-white/5 transition-colors"
            >
              <ChevronRight className="w-4 h-4" />
            </button>
          </div>
        )}

        <nav className="flex-1 px-2 lg:px-3 mt-2 overflow-y-auto">
          <p className="sidebar-section-label text-[10px] uppercase tracking-[0.2em] text-[var(--text-light)]/50 px-3 mb-2">
            Discover
          </p>
          {navItems.map(({ id, label, icon: Icon }) => (
            <button
              key={id}
              onClick={() => {
                setView(id);
                if (id !== 'explore' && id !== 'favorites') setSelectedArtist(null);
                if (id !== 'playlists') setActivePlaylist(null);
              }}
              title={label}
              className={`sidebar-nav-btn w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm transition-all mb-1 ${
                view === id
                  ? 'bg-[var(--primary)]/15 text-[var(--primary)] font-semibold border border-[var(--primary)]/20 shadow-sm'
                  : 'text-[var(--text-light)] hover:text-[var(--text)] hover:bg-white/5'
              }`}
            >
              <Icon className="w-4 h-4 flex-shrink-0" />
              <span className="sidebar-label truncate">{label}</span>
              {id === 'favorites' && favorites.length > 0 && (
                <span className="sidebar-label ml-auto text-[10px] bg-red-500/20 text-red-300 px-1.5 py-0.5 rounded-full font-bold">
                  {favorites.length}
                </span>
              )}
            </button>
          ))}

          {/* Quick Genres inside Sidebar */}
          {sidebarOpen && (
            <div className="mt-6 pt-4 border-t border-white/5">
              <p className="text-[10px] uppercase tracking-[0.2em] text-[var(--text-light)]/50 px-3 mb-2">
                Popular Genres
              </p>
              <div className="space-y-0.5">
                {['Electronic', 'Pop', 'Hip-Hop/Rap', 'Rock', 'Ambient', 'Dance'].map((g) => (
                  <button
                    key={g}
                    onClick={() => {
                      setSelectedGenre(g);
                      setView('explore');
                    }}
                    className={`w-full flex items-center justify-between px-3 py-1.5 rounded-lg text-xs transition-colors ${
                      selectedGenre === g && view === 'explore'
                        ? 'text-[var(--primary)] font-semibold bg-[var(--primary)]/10'
                        : 'text-[var(--text-light)]/80 hover:text-[var(--text)] hover:bg-white/5'
                    }`}
                  >
                    <span>{g}</span>
                    {selectedGenre === g && view === 'explore' && <Check className="w-3 h-3 text-[var(--primary)]" />}
                  </button>
                ))}
              </div>
            </div>
          )}
        </nav>

        {/* Azaad Streaming Engine Live Badge */}
        {sidebarOpen && (
          <div className="px-3 pb-4 pt-2">
            <div className="p-3 rounded-xl bg-gradient-to-r from-[var(--primary)]/10 to-[var(--accent)]/10 border border-[var(--primary)]/15">
              <div className="flex items-center gap-2 mb-1">
                <Radio className="w-3.5 h-3.5 text-[var(--primary)] animate-pulse" />
                <span className="text-[11px] font-bold text-[var(--text)]">Azaad Stream Engine</span>
              </div>
              <p className="text-[10px] text-[var(--text-light)] leading-relaxed">
                Stream unlimited full-length master tracks with zero ads.
              </p>
            </div>
          </div>
        )}
      </aside>

      {/* Main Container */}
      <main className="flex-1 min-w-0 relative z-10">
        {/* Top Header */}
        <header className="sticky top-0 z-30 bg-[var(--bg)]/90 backdrop-blur-xl border-b border-[var(--primary)]/10 px-4 md:px-6 py-3.5 flex items-center justify-between gap-4">
          <div className="flex items-center gap-3 flex-1 max-w-xl">
            <div className="relative w-full">
              <Search className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-[var(--text-light)]" />
              <input
                ref={searchInputRef}
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search any song (e.g. Tera Naam Doon, Kesariya), artist, genre..."
                className="w-full pl-10 pr-10 py-2.5 rounded-xl glass-card text-sm text-[var(--text)] placeholder-[var(--text-light)]/60 focus:outline-none focus:border-[var(--primary)] focus:ring-1 focus:ring-[var(--primary)] transition-all"
              />
              {searchQuery && (
                <button
                  onClick={() => setSearchQuery('')}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-[var(--text-light)] hover:text-white"
                >
                  <X className="w-3.5 h-3.5" />
                </button>
              )}
            </div>
          </div>

          <div className="flex items-center gap-2 flex-shrink-0">
            {currentUser ? (
              <div className="flex items-center gap-2 bg-white/5 border border-white/10 rounded-xl px-2.5 py-1.5">
                <img
                  src={currentUser.photoURL || `https://api.dicebear.com/7.x/avataaars/svg?seed=${currentUser.email || 'User'}`}
                  alt="avatar"
                  className="w-6 h-6 rounded-full border border-[var(--primary)]/40 object-cover"
                />
                <span className="text-xs font-semibold text-[var(--text)] hidden sm:inline-block max-w-[100px] truncate">
                  {currentUser.displayName || currentUser.email?.split('@')[0]}
                </span>
                <button
                  onClick={handleSignOut}
                  className="p-1 rounded-lg text-[var(--text-light)] hover:text-red-400 hover:bg-white/10 transition-colors"
                  title="Sign Out"
                >
                  <LogOut className="w-3.5 h-3.5" />
                </button>
              </div>
            ) : (
              <button
                onClick={() => setShowAuthModal(true)}
                className="px-3 py-1.5 rounded-xl bg-[var(--primary-dark)] hover:bg-[var(--primary)] text-[var(--bg)] font-bold text-xs inline-flex items-center gap-1.5 transition-all shadow-sm glow-primary"
              >
                <User className="w-3.5 h-3.5" />
                <span>Sign In</span>
              </button>
            )}

            <button
              onClick={() => fetchAudiusTracks(selectedGenre, debouncedQuery, selectedTime)}
              className="p-2.5 rounded-xl glass-card hover:bg-white/10 text-[var(--text-light)] hover:text-[var(--primary)] transition-colors"
              title="Refresh music"
            >
              <RefreshCw className={`w-4 h-4 ${initLoading ? 'animate-spin text-[var(--primary)]' : ''}`} />
            </button>
            <button
              onClick={() => setViewMode(viewMode === 'grid' ? 'list' : 'grid')}
              className="p-2.5 rounded-xl glass-card hover:bg-white/10 text-[var(--text-light)] hover:text-[var(--text)] transition-colors hidden sm:flex"
              title={viewMode === 'grid' ? 'Switch to List' : 'Switch to Grid'}
            >
              {viewMode === 'grid' ? <List className="w-4 h-4" /> : <LayoutGrid className="w-4 h-4" />}
            </button>
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
                    <h2 className="text-xl sm:text-2xl font-extrabold text-[var(--text)] flex items-center gap-2">
                      {view === 'favorites' ? (
                        <>
                          <Heart className="w-6 h-6 text-red-400 fill-current" />
                          <span>Liked Songs</span>
                        </>
                      ) : searchQuery ? (
                        <>
                          <Search className="w-6 h-6 text-[var(--primary)]" />
                          <span>Search results for "{searchQuery}"</span>
                        </>
                      ) : (
                        <>
                          <Flame className="w-6 h-6 text-[var(--primary)]" />
                          <span>Trending & Popular Music</span>
                        </>
                      )}
                    </h2>
                    <p className="text-xs text-[var(--text-light)] mt-0.5">
                      {view === 'favorites'
                        ? `${filteredSongs.length} tracks saved to your favorites`
                        : searchQuery
                        ? `${filteredSongs.length} tracks found across Azaad Music catalog`
                        : `Streaming high-fidelity tracks on Azaad Music (${filteredSongs.length} tracks)`}
                    </p>
                  </div>

                  {view === 'explore' && !searchQuery && (
                    <div className="flex items-center gap-1.5 bg-[var(--card-bg)]/80 p-1 rounded-xl border border-white/5 self-start sm:self-auto">
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
                          {t === 'week' ? 'This Week' : t === 'month' ? 'This Month' : 'All Time'}
                        </button>
                      ))}
                    </div>
                  )}
                </div>

                {/* Popular Quick Searches */}
                {view === 'explore' && (
                  <div className="flex items-center gap-2 overflow-x-auto pb-1 scrollbar-none">
                    <span className="text-[11px] text-[var(--text-light)]/60 font-semibold uppercase tracking-wider flex-shrink-0 flex items-center gap-1">
                      <Sparkles className="w-3 h-3 text-[var(--primary)]" /> Popular:
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
                            : 'bg-white/5 hover:bg-white/10 text-[var(--text-light)] hover:text-white border-white/5'
                        }`}
                      >
                        {query}
                      </button>
                    ))}
                  </div>
                )}

                {/* Genre Filter Chips */}
                {view === 'explore' && (
                  <div className="flex items-center gap-2 overflow-x-auto pb-2 scrollbar-none pt-1">
                    {AUDIUS_GENRES.map((g) => (
                      <button
                        key={g}
                        onClick={() => setSelectedGenre(g)}
                        className={`px-3.5 py-1.5 rounded-full text-xs font-semibold whitespace-nowrap transition-all flex-shrink-0 ${
                          selectedGenre === g
                            ? 'bg-[var(--primary)] text-[var(--bg)] shadow-[0_0_12px_rgba(83,242,224,0.4)]'
                            : 'glass-card text-[var(--text-light)] hover:text-[var(--text)] hover:border-[var(--primary)]/30'
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
              ) : viewMode === 'list' ? (
                <div className="rounded-2xl glass-card divide-y divide-white/5 overflow-hidden">
                  {filteredSongs.map((song) => (
                    <SongCard
                      key={song.id}
                      song={song}
                      isPlaying={currentSong?.id === song.id}
                      onPlay={playSong}
                      onEdit={setEditSong}
                      onDelete={deleteTrack}
                      onAddToPlaylist={setAddToPlaylistSong}
                      isFavorite={favorites.includes(song.id)}
                      onToggleFavorite={toggleFavorite}
                      viewMode="list"
                    />
                  ))}
                </div>
              ) : (
                <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-3.5 sm:gap-4">
                  {filteredSongs.map((song) => (
                    <SongCard
                      key={song.id}
                      song={song}
                      isPlaying={currentSong?.id === song.id}
                      onPlay={playSong}
                      onEdit={setEditSong}
                      onDelete={deleteTrack}
                      onAddToPlaylist={setAddToPlaylistSong}
                      isFavorite={favorites.includes(song.id)}
                      onToggleFavorite={toggleFavorite}
                      viewMode="grid"
                    />
                  ))}
                </div>
              )}
            </div>
          )}

          {/* ─── AUDIUS CURATED PLAYLISTS VIEW ────────────────────────── */}
          {view === 'audius-playlists' && (
            <div className="space-y-6">
              <div>
                <h2 className="text-xl sm:text-2xl font-extrabold text-[var(--text)] flex items-center gap-2">
                  <Disc3 className="w-6 h-6 text-[var(--accent)]" />
                  <span>Azaad Curated Playlists</span>
                </h2>
                <p className="text-xs text-[var(--text-light)] mt-0.5">
                  Popular playlists and charts curated for Azaad Music listeners
                </p>
              </div>

              {audiusPlaylists.length === 0 ? (
                <div className="flex items-center justify-center py-20">
                  <Loader2 className="w-6 h-6 animate-spin text-[var(--primary)]" />
                </div>
              ) : (
                <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-3 lg:grid-cols-4 gap-4">
                  {audiusPlaylists.map((pl) => (
                    <div
                      key={pl.id}
                      onClick={() => {
                        setSelectedGenre(pl.name);
                        setSearchQuery(pl.name);
                        setView('explore');
                      }}
                      className="group glass-card rounded-2xl overflow-hidden cursor-pointer hover:border-[var(--primary)]/30 hover:shadow-xl transition-all duration-300"
                    >
                      <div className="aspect-square relative overflow-hidden bg-black/40">
                        <img
                          src={mediaUrl(pl.coverUrl)}
                          alt={pl.name}
                          className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                          loading="lazy"
                        />
                        <div className="absolute inset-0 bg-gradient-to-t from-[var(--card-bg)] via-transparent to-transparent opacity-60" />
                        <div className="absolute bottom-3 left-3 right-3 flex items-center justify-between">
                          <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-black/60 backdrop-blur-md text-[var(--primary)]">
                            {pl.totalTracks} tracks
                          </span>
                        </div>
                      </div>
                      <div className="p-3.5">
                        <h4 className="font-bold text-sm text-[var(--text)] truncate group-hover:text-[var(--primary)] transition-colors">
                          {pl.name}
                        </h4>
                        <p className="text-xs text-[var(--text-light)] truncate mt-0.5">
                          By {pl.ownerName}
                        </p>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* ─── MY PLAYLISTS VIEW ────────────────────────────────────── */}
          {view === 'playlists' && (
            <div className="space-y-6">
              <div className="flex items-center justify-between">
                <div>
                  <h2 className="text-xl sm:text-2xl font-extrabold text-[var(--text)] flex items-center gap-2">
                    <ListMusic className="w-6 h-6 text-[var(--primary)]" />
                    <span>My Playlists</span>
                  </h2>
                  <p className="text-xs text-[var(--text-light)] mt-0.5">
                    {playlists.length} custom playlist{playlists.length !== 1 ? 's' : ''}
                  </p>
                </div>
                <button
                  onClick={() => setShowCreatePlaylist(true)}
                  className="px-4 py-2.5 rounded-xl bg-[var(--primary-dark)] hover:bg-[var(--primary)] text-[var(--bg)] text-xs sm:text-sm font-bold inline-flex items-center gap-2 transition-all glow-primary"
                >
                  <Plus className="w-4 h-4" /> New Playlist
                </button>
              </div>

              {playlistsLoading ? (
                <div className="flex items-center justify-center py-20">
                  <Loader2 className="w-6 h-6 animate-spin text-[var(--primary)]" />
                </div>
              ) : playlists.length === 0 ? (
                <div className="text-center py-20 rounded-2xl glass-card p-6">
                  <ListMusic className="w-12 h-12 text-[var(--text-light)]/30 mx-auto mb-3" />
                  <h3 className="text-base font-bold text-[var(--text)]">No playlists created yet</h3>
                  <p className="text-xs text-[var(--text-light)] mt-1 max-w-sm mx-auto mb-4">
                    Organize your favorite Azaad and uploaded tracks into custom music collections!
                  </p>
                  <button
                    onClick={() => setShowCreatePlaylist(true)}
                    className="px-5 py-2.5 rounded-xl bg-[var(--primary-dark)] hover:bg-[var(--primary)] text-[var(--bg)] text-xs font-bold inline-flex items-center gap-2 transition-all glow-primary"
                  >
                    <Plus className="w-4 h-4" /> Create Your First Playlist
                  </button>
                </div>
              ) : (
                <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-3 lg:grid-cols-4 gap-4">
                  {playlists.map((pl) => {
                    const plSongs = (pl.songIds || [])
                      .map((sid) => songs.find((s) => s.id === sid))
                      .filter(Boolean);
                    const coverSong = plSongs[0];
                    return (
                      <div
                        key={pl.id}
                        onClick={() => {
                          setActivePlaylist(pl);
                        }}
                        className="group relative rounded-2xl overflow-hidden glass-card cursor-pointer transition-all duration-200 hover:border-[var(--primary)]/30 hover:shadow-xl"
                      >
                        <div className="aspect-square bg-gradient-to-br from-[var(--primary)]/20 via-[var(--accent)]/10 to-[var(--primary-dark)]/10 relative overflow-hidden">
                          {coverSong ? (
                            <img
                              src={mediaUrl(coverSong.coverUrl)}
                              alt={pl.name}
                              className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                            />
                          ) : (
                            <div className="w-full h-full flex items-center justify-center">
                              <ListMusic className="w-12 h-12 text-[var(--primary)]/40" />
                            </div>
                          )}
                          <div className="absolute inset-0 bg-gradient-to-t from-[var(--card-bg)] via-transparent to-transparent" />
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              deletePlaylist(pl.id);
                            }}
                            className="absolute top-2 right-2 p-2 rounded-lg bg-black/60 text-white/80 hover:text-red-400 opacity-0 group-hover:opacity-100 transition-all"
                            title="Delete playlist"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                        <div className="p-4">
                          <h4 className="font-semibold truncate text-sm text-[var(--text)] group-hover:text-[var(--primary)] transition-colors">
                            {pl.name}
                          </h4>
                          <p className="text-xs text-[var(--text-light)] mt-0.5">
                            {pl.songIds?.length || 0} track{(pl.songIds?.length || 0) !== 1 ? 's' : ''}
                          </p>
                          {pl.description && (
                            <p className="text-xs text-[var(--text-light)]/60 mt-1 truncate">{pl.description}</p>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          )}

          {/* ─── TOP ARTISTS VIEW ─────────────────────────────────────── */}
          {view === 'artists' && (
            <div className="space-y-6">
              <div>
                <h2 className="text-xl sm:text-2xl font-extrabold text-[var(--text)] flex items-center gap-2">
                  <Mic2 className="w-6 h-6 text-[var(--primary)]" />
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

          {/* ─── UPLOAD TRACK VIEW ────────────────────────────────────── */}
          {view === 'upload' && (
            <div className="max-w-2xl mx-auto glass-card rounded-2xl p-6 sm:p-8 space-y-6">
              <div>
                <h2 className="text-xl font-bold text-[var(--text)] flex items-center gap-2">
                  <Upload className="w-5 h-5 text-[var(--primary)]" />
                  <span>Upload Your Own Track</span>
                </h2>
                <p className="text-xs text-[var(--text-light)] mt-1">
                  Add your original song or audio file to your personal Azaad library.
                </p>
              </div>

              <form onSubmit={handleAddTrack} className="space-y-4">
                <div>
                  <label className="text-xs font-semibold text-[var(--text-light)] mb-1.5 block">Song Title *</label>
                  <input
                    name="title"
                    required
                    placeholder="e.g. Midnight Pulse"
                    className="w-full px-4 py-3 rounded-xl bg-[var(--bg)]/60 border border-white/10 text-sm text-[var(--text)] focus:border-[var(--primary)] focus:outline-none"
                  />
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="text-xs font-semibold text-[var(--text-light)] mb-1.5 block">Artist Name *</label>
                    <input
                      name="artist"
                      required
                      placeholder="e.g. Azad"
                      className="w-full px-4 py-3 rounded-xl bg-[var(--bg)]/60 border border-white/10 text-sm text-[var(--text)] focus:border-[var(--primary)] focus:outline-none"
                    />
                  </div>
                  <div>
                    <label className="text-xs font-semibold text-[var(--text-light)] mb-1.5 block">Category / Genre</label>
                    <select
                      name="category"
                      className="w-full px-4 py-3 rounded-xl bg-[var(--bg)]/60 border border-white/10 text-sm text-[var(--text)] focus:border-[var(--primary)] focus:outline-none"
                    >
                      {CATEGORY_OPTIONS.map((c) => (
                        <option key={c} value={c}>{c}</option>
                      ))}
                    </select>
                  </div>
                </div>

                <div>
                  <label className="text-xs font-semibold text-[var(--text-light)] mb-1.5 block">Audio Source (MP3 / WAV or Stream URL) *</label>
                  <div className="flex gap-2 mb-2">
                    <button
                      type="button"
                      onClick={() => setAudioUploadMode('file')}
                      className={`px-3 py-1 rounded-lg text-xs font-medium ${
                        audioUploadMode === 'file' ? 'bg-[var(--primary)] text-[var(--bg)] font-bold' : 'bg-white/5 text-[var(--text-light)]'
                      }`}
                    >
                      File Upload
                    </button>
                    <button
                      type="button"
                      onClick={() => setAudioUploadMode('url')}
                      className={`px-3 py-1 rounded-lg text-xs font-medium ${
                        audioUploadMode === 'url' ? 'bg-[var(--primary)] text-[var(--bg)] font-bold' : 'bg-white/5 text-[var(--text-light)]'
                      }`}
                    >
                      Audio URL
                    </button>
                  </div>

                  {audioUploadMode === 'file' ? (
                    <input
                      type="file"
                      name="audio"
                      accept="audio/*"
                      required
                      className="w-full text-xs text-[var(--text-light)] file:mr-4 file:py-2.5 file:px-4 file:rounded-xl file:border-0 file:text-xs file:font-bold file:bg-[var(--primary)]/20 file:text-[var(--primary)] hover:file:bg-[var(--primary)]/30 cursor-pointer"
                    />
                  ) : (
                    <input
                      value={audioUrlInput}
                      onChange={(e) => setAudioUrlInput(e.target.value)}
                      placeholder="https://... audio stream URL"
                      required
                      className="w-full px-4 py-3 rounded-xl bg-[var(--bg)]/60 border border-white/10 text-sm text-[var(--text)] focus:border-[var(--primary)] focus:outline-none"
                    />
                  )}
                </div>

                <div>
                  <label className="text-xs font-semibold text-[var(--text-light)] mb-1.5 block">Cover Artwork (Image or URL) *</label>
                  <div className="flex gap-2 mb-2">
                    <button
                      type="button"
                      onClick={() => setCoverUploadMode('file')}
                      className={`px-3 py-1 rounded-lg text-xs font-medium ${
                        coverUploadMode === 'file' ? 'bg-[var(--primary)] text-[var(--bg)] font-bold' : 'bg-white/5 text-[var(--text-light)]'
                      }`}
                    >
                      Image Upload
                    </button>
                    <button
                      type="button"
                      onClick={() => setCoverUploadMode('url')}
                      className={`px-3 py-1 rounded-lg text-xs font-medium ${
                        coverUploadMode === 'url' ? 'bg-[var(--primary)] text-[var(--bg)] font-bold' : 'bg-white/5 text-[var(--text-light)]'
                      }`}
                    >
                      Image URL
                    </button>
                  </div>

                  {coverUploadMode === 'file' ? (
                    <input
                      type="file"
                      name="cover"
                      accept="image/*"
                      required
                      className="w-full text-xs text-[var(--text-light)] file:mr-4 file:py-2.5 file:px-4 file:rounded-xl file:border-0 file:text-xs file:font-bold file:bg-[var(--primary)]/20 file:text-[var(--primary)] hover:file:bg-[var(--primary)]/30 cursor-pointer"
                    />
                  ) : (
                    <input
                      value={coverUrlInput}
                      onChange={(e) => setCoverUrlInput(e.target.value)}
                      placeholder="https://... cover image URL"
                      required
                      className="w-full px-4 py-3 rounded-xl bg-[var(--bg)]/60 border border-white/10 text-sm text-[var(--text)] focus:border-[var(--primary)] focus:outline-none"
                    />
                  )}
                </div>

                <button
                  type="submit"
                  disabled={loading}
                  className="w-full py-3.5 rounded-xl bg-[var(--primary-dark)] hover:bg-[var(--primary)] text-[var(--bg)] font-bold disabled:opacity-50 transition-all flex items-center justify-center gap-2 glow-primary"
                >
                  {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Upload className="w-4 h-4" />}
                  {loading ? 'Uploading...' : 'Publish Track'}
                </button>
              </form>
            </div>
          )}
        </div>
      </main>

      {/* ─── MOBILE BOTTOM NAVIGATION ─────────────────────────────── */}
      <nav className="md:hidden fixed bottom-0 left-0 right-0 z-40 bg-[var(--sidebar-bg)]/95 backdrop-blur-2xl border-t border-[var(--primary)]/10 px-2 py-2 flex items-center justify-around">
        {navItems.slice(0, 5).map(({ id, label, icon: Icon }) => (
          <button
            key={id}
            onClick={() => {
              setView(id);
              if (id !== 'explore' && id !== 'favorites') setSelectedArtist(null);
            }}
            className={`flex flex-col items-center gap-1 p-1.5 rounded-xl transition-all ${
              view === id ? 'text-[var(--primary)] font-bold' : 'text-[var(--text-light)]/70 hover:text-[var(--text)]'
            }`}
          >
            <Icon className="w-5 h-5" />
            <span className="text-[10px]">{label.split(' ')[0]}</span>
          </button>
        ))}
      </nav>

      {/* ─── ADD TO PLAYLIST MODAL ─────────────────────────────────── */}
      {addToPlaylistSong && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-black/70 backdrop-blur-sm" onClick={() => setAddToPlaylistSong(null)} />
          <div className="relative w-full max-w-md glass-card rounded-2xl p-6 shadow-2xl space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="text-base font-bold text-[var(--text)] flex items-center gap-2">
                <ListMusic className="w-4 h-4 text-[var(--primary)]" />
                <span>Add to Playlist</span>
              </h3>
              <button
                onClick={() => setAddToPlaylistSong(null)}
                className="p-1.5 rounded-lg hover:bg-white/10 text-[var(--text-light)]"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <p className="text-xs text-[var(--text-light)] truncate">
              Adding: <strong className="text-white">{addToPlaylistSong.title}</strong>
            </p>

            <div className="max-h-60 overflow-y-auto space-y-2 pr-1">
              {playlists.length === 0 ? (
                <p className="text-xs text-center text-[var(--text-light)] py-4">No custom playlists created yet.</p>
              ) : (
                playlists.map((pl) => {
                  const alreadyIn = (pl.songIds || []).includes(addToPlaylistSong.id);
                  return (
                    <button
                      key={pl.id}
                      onClick={() => addSongToPlaylist(pl.id, addToPlaylistSong.id)}
                      className={`w-full flex items-center justify-between p-3 rounded-xl text-left text-xs transition-colors ${
                        alreadyIn
                          ? 'bg-[var(--primary)]/10 text-[var(--primary)] font-semibold'
                          : 'glass-card hover:bg-white/10 text-[var(--text)]'
                      }`}
                    >
                      <span className="truncate">{pl.name}</span>
                      {alreadyIn ? (
                        <span className="text-[10px] text-[var(--primary)] font-bold">Added</span>
                      ) : (
                        <Plus className="w-3.5 h-3.5 text-[var(--text-light)]" />
                      )}
                    </button>
                  );
                })
              )}
            </div>

            <button
              onClick={() => {
                setAddToPlaylistSong(null);
                setShowCreatePlaylist(true);
              }}
              className="w-full py-2.5 rounded-xl border border-[var(--primary)]/30 text-[var(--primary)] hover:bg-[var(--primary)]/10 text-xs font-bold transition-colors flex items-center justify-center gap-1.5"
            >
              <Plus className="w-3.5 h-3.5" /> Create New Playlist
            </button>
          </div>
        </div>
      )}

      {/* ─── CREATE PLAYLIST MODAL ─────────────────────────────────── */}
      {showCreatePlaylist && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-black/70 backdrop-blur-sm" onClick={() => setShowCreatePlaylist(false)} />
          <div className="relative w-full max-w-md glass-card rounded-2xl p-6 shadow-2xl space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="text-base font-bold text-[var(--text)]">Create Playlist</h3>
              <button
                onClick={() => setShowCreatePlaylist(false)}
                className="p-1.5 rounded-lg hover:bg-white/10 text-[var(--text-light)]"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="space-y-3">
              <div>
                <label className="text-xs text-[var(--text-light)] block mb-1">Playlist Name *</label>
                <input
                  value={newPlaylistName}
                  onChange={(e) => setNewPlaylistName(e.target.value)}
                  placeholder="e.g. My Chill Vibes"
                  className="w-full px-4 py-2.5 rounded-xl bg-[var(--bg)]/60 border border-white/10 text-sm text-[var(--text)] focus:border-[var(--primary)] focus:outline-none"
                />
              </div>
              <div>
                <label className="text-xs text-[var(--text-light)] block mb-1">Description (Optional)</label>
                <input
                  value={newPlaylistDesc}
                  onChange={(e) => setNewPlaylistDesc(e.target.value)}
                  placeholder="e.g. Best of Azaad Chill"
                  className="w-full px-4 py-2.5 rounded-xl bg-[var(--bg)]/60 border border-white/10 text-sm text-[var(--text)] focus:border-[var(--primary)] focus:outline-none"
                />
              </div>
            </div>

            <div className="flex gap-2 pt-2">
              <button
                type="button"
                onClick={() => setShowCreatePlaylist(false)}
                className="flex-1 py-2.5 rounded-xl border border-white/10 text-xs text-[var(--text-light)] hover:bg-white/5"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={() => createPlaylist(newPlaylistName, newPlaylistDesc)}
                className="flex-1 py-2.5 rounded-xl bg-[var(--primary)] text-[var(--bg)] text-xs font-bold glow-primary"
              >
                Create
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ─── AUTH MODAL (GOOGLE & EMAIL) ──────────────────────────── */}
      {showAuthModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-black/75 backdrop-blur-md" onClick={() => setShowAuthModal(false)} />
          <div className="relative w-full max-w-md glass-card rounded-2xl p-6 sm:p-7 shadow-2xl space-y-5 border border-white/10">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-xl bg-gradient-to-br from-[var(--primary)] to-[var(--accent)] flex items-center justify-center">
                  <Music2 className="w-4 h-4 text-[var(--bg)]" />
                </div>
                <div>
                  <h3 className="text-base font-bold text-[var(--text)]">
                    {isSignup ? 'Create Azaad Account' : 'Welcome to Azaad'}
                  </h3>
                  <p className="text-[11px] text-[var(--text-light)]">
                    Sync your playlists and liked songs to the cloud
                  </p>
                </div>
              </div>
              <button
                onClick={() => setShowAuthModal(false)}
                className="p-1.5 rounded-lg hover:bg-white/10 text-[var(--text-light)]"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Google Sign In Button */}
            <button
              onClick={handleGoogleAuth}
              disabled={authSubmitting}
              type="button"
              className="w-full py-3 px-4 rounded-xl bg-white hover:bg-neutral-100 text-neutral-900 font-semibold text-xs flex items-center justify-center gap-2.5 shadow transition-all hover:scale-[1.01]"
            >
              <svg className="w-4 h-4" viewBox="0 0 24 24">
                <path
                  fill="#4285F4"
                  d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
                />
                <path
                  fill="#34A853"
                  d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
                />
                <path
                  fill="#FBBC05"
                  d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z"
                />
                <path
                  fill="#EA4335"
                  d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z"
                />
              </svg>
              <span>Continue with Google</span>
            </button>

            <div className="flex items-center gap-3">
              <div className="flex-1 h-px bg-white/10" />
              <span className="text-[10px] uppercase tracking-wider text-[var(--text-light)]/60 font-semibold">
                Or with Email
              </span>
              <div className="flex-1 h-px bg-white/10" />
            </div>

            <form onSubmit={handleEmailAuth} className="space-y-3">
              {isSignup && (
                <div>
                  <label className="text-xs text-[var(--text-light)] block mb-1">Your Name</label>
                  <input
                    type="text"
                    required
                    value={authDisplayName}
                    onChange={(e) => setAuthDisplayName(e.target.value)}
                    placeholder="e.g. Azad Listener"
                    className="w-full px-3.5 py-2.5 rounded-xl bg-[var(--bg)]/60 border border-white/10 text-xs text-[var(--text)] focus:border-[var(--primary)] focus:outline-none"
                  />
                </div>
              )}

              <div>
                <label className="text-xs text-[var(--text-light)] block mb-1">Email Address</label>
                <input
                  type="email"
                  required
                  value={authEmail}
                  onChange={(e) => setAuthEmail(e.target.value)}
                  placeholder="listener@azaad.com"
                  className="w-full px-3.5 py-2.5 rounded-xl bg-[var(--bg)]/60 border border-white/10 text-xs text-[var(--text)] focus:border-[var(--primary)] focus:outline-none"
                />
              </div>

              <div>
                <label className="text-xs text-[var(--text-light)] block mb-1">Password</label>
                <input
                  type="password"
                  required
                  value={authPassword}
                  onChange={(e) => setAuthPassword(e.target.value)}
                  placeholder="••••••••"
                  className="w-full px-3.5 py-2.5 rounded-xl bg-[var(--bg)]/60 border border-white/10 text-xs text-[var(--text)] focus:border-[var(--primary)] focus:outline-none"
                />
              </div>

              <button
                type="submit"
                disabled={authSubmitting}
                className="w-full py-3 rounded-xl bg-[var(--primary-dark)] hover:bg-[var(--primary)] text-[var(--bg)] text-xs font-bold transition-all glow-primary flex items-center justify-center gap-2"
              >
                {authSubmitting ? (
                  <Loader2 className="w-4 h-4 animate-spin" />
                ) : isSignup ? (
                  'Create Account'
                ) : (
                  'Sign In'
                )}
              </button>
            </form>

            <div className="text-center pt-1">
              <button
                type="button"
                onClick={() => setIsSignup(!isSignup)}
                className="text-xs text-[var(--primary)] hover:underline font-medium"
              >
                {isSignup
                  ? 'Already have an account? Sign In'
                  : "Don't have an account? Sign Up free"}
              </button>
            </div>
          </div>
        </div>
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

      {/* ─── BOTTOM AUDIO PLAYER ───────────────────────────────────── */}
      {currentSong && (
        <PlayerBar
          song={currentSong}
          songs={filteredSongs.length > 0 ? filteredSongs : songs}
          onChangeSong={setCurrentSong}
          hasBottomNav={true}
          favorites={favorites}
          onToggleFavorite={toggleFavorite}
        />
      )}
    </div>
  );
}
