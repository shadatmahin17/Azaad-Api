import React, { useState, useMemo, memo } from 'react';
import {
  UserCircle,
  EnvelopeSimple,
  MusicNotes,
  Heart,
  Playlist,
  Clock,
  MagnifyingGlass,
  SignOut,
  PencilSimple,
  FloppyDisk,
  X,
  Play,
  Pause,
  Sparkle,
  Check,
  VinylRecord,
  YoutubeLogo,
  Trash,
  SlidersHorizontal,
  ShieldCheck,
  ShareNetwork,
  Broadcast,
  Lightning,
  Headphones,
  Compass,
  Fire,
  SquaresFour,
  ListBullets,
  CaretRight,
  Plus,
  Waveform,
  Crown,
  MicrophoneStage,
  ChartBar,
} from '@phosphor-icons/react';
import {
  saveUserProfile,
  clearPlayHistory,
  clearSearchHistory,
  removeSearchHistoryItem,
} from '../firebase';
import { LikeHeartButton, EqualizerBars } from './SongCard';

const AVATAR_PRESETS = [
  { id: '1', label: 'VIP Beats', url: 'https://api.dicebear.com/7.x/bottts/svg?seed=AzaadVIP' },
  { id: '2', label: 'Soul Singer', url: 'https://api.dicebear.com/7.x/adventurer/svg?seed=MusicSoul' },
  { id: '3', label: 'Desi Vibe', url: 'https://api.dicebear.com/7.x/thumbs/svg?seed=DesiBeat' },
  { id: '4', label: 'Vinyl Lover', url: 'https://api.dicebear.com/7.x/notionists/svg?seed=VinylLover' },
  { id: '5', label: 'Neon Groove', url: 'https://api.dicebear.com/7.x/shapes/svg?seed=NeonGroove' },
  { id: '6', label: 'Cyber Sound', url: 'https://api.dicebear.com/7.x/identicon/svg?seed=Soundwave' },
];

const GENRES = [
  'Pop',
  'Global Hits',
  'Latin',
  'K-Pop',
  'Afrobeats',
  'Hip-Hop/Rap',
  'Electronic & EDM',
  'Lo-Fi Chill',
  'R&B/Soul',
  'Rock',
  'Indie',
  'Punjabi',
  'World & Classical',
];

function UserProfileViewComponent({
  currentUser,
  userProfile,
  playHistory = [],
  searchHistory = [],
  favorites = [],
  favoriteSongs = [],
  allSongs = [],
  playlists = [],
  currentSong = null,
  isPlaying = false,
  onPlaySong,
  onToggleFavorite,
  onSelectSearchQuery,
  onOpenPlaylist,
  onCreatePlaylist,
  onNavigate,
  onSignOut,
  onShowSuccess,
}) {
  const [activeTab, setActiveTab] = useState('overview');
  const [isEditing, setIsEditing] = useState(false);
  const [showSignOutConfirm, setShowSignOutConfirm] = useState(false);
  const [showClearHistoryConfirm, setShowClearHistoryConfirm] = useState(false);
  const [showClearSearchConfirm, setShowClearSearchConfirm] = useState(false);
  const [viewMode, setViewMode] = useState('grid'); // 'grid' | 'list'
  const [favoritesFilter, setFavoritesFilter] = useState('');
  const [historyFilter, setHistoryFilter] = useState('');
  const [copiedLink, setCopiedLink] = useState(false);

  // Profile Form State
  const [displayName, setDisplayName] = useState(
    userProfile?.displayName || currentUser?.displayName || ''
  );
  const [favoriteGenre, setFavoriteGenre] = useState(
    userProfile?.favoriteGenre || 'Global Hits'
  );
  const [bio, setBio] = useState(
    userProfile?.bio || 'Audiophile exploring global studio masters, viral charts, and deep-cut tracks.'
  );
  const [selectedAvatar, setSelectedAvatar] = useState(
    userProfile?.photoURL || currentUser?.photoURL || AVATAR_PRESETS[0].url
  );
  const [customAvatarUrl, setCustomAvatarUrl] = useState('');
  const [audioQuality, setAudioQuality] = useState(
    userProfile?.audioQuality || '320k'
  );
  const [isSaving, setIsSaving] = useState(false);

  // Sync form when profile loads
  React.useEffect(() => {
    if (userProfile) {
      if (userProfile.displayName) setDisplayName(userProfile.displayName);
      if (userProfile.favoriteGenre) setFavoriteGenre(userProfile.favoriteGenre);
      if (userProfile.bio) setBio(userProfile.bio);
      if (userProfile.photoURL) setSelectedAvatar(userProfile.photoURL);
      if (userProfile.audioQuality) setAudioQuality(userProfile.audioQuality);
    }
  }, [userProfile]);

  const email = userProfile?.email || currentUser?.email || 'listener@azaadmusic.com';
  const effectiveName =
    userProfile?.displayName ||
    currentUser?.displayName ||
    (currentUser?.email ? currentUser.email.split('@')[0] : 'Listener');
  const photoURL = selectedAvatar || userProfile?.photoURL || currentUser?.photoURL;

  // Robust check for liked state
  const isLiked = (songId) => {
    if (!songId) return false;
    const sId = String(songId);
    return favorites.some((f) =>
      typeof f === 'string' ? f === sId : String(f?.id || f?.songId) === sId
    );
  };

  // Resolve favorite track list into complete song objects
  const resolvedFavoriteSongs = useMemo(() => {
    if (favoriteSongs && favoriteSongs.length > 0) {
      return favoriteSongs;
    }
    const songMap = new Map();
    (allSongs || []).forEach((s) => {
      if (s?.id) songMap.set(String(s.id), s);
    });
    return (favorites || []).map((item, index) => {
      if (typeof item === 'object' && item !== null && (item.title || item.songId)) {
        return {
          id: String(item.id || item.songId || `fav-${index}`),
          title: item.title || 'Liked Track',
          artist: item.artist || item.singers || 'Unknown Artist',
          singers: item.singers || item.artist || 'Unknown Artist',
          coverUrl:
            item.coverUrl ||
            'https://images.unsplash.com/photo-1511671782779-c97d3d27a1d4?w=600&q=80',
          audioUrl: item.audioUrl || '',
          duration: item.duration || 210,
          genre: item.genre || 'Soundtrack',
          ...item,
        };
      }
      const strId = String(item);
      if (songMap.has(strId)) {
        return songMap.get(strId);
      }
      return {
        id: strId,
        title: 'Liked Track',
        artist: 'Favorite Song',
        coverUrl:
          'https://images.unsplash.com/photo-1511671782779-c97d3d27a1d4?w=600&q=80',
        duration: 210,
      };
    });
  }, [favorites, favoriteSongs, allSongs]);

  // Filtered favorite songs
  const filteredFavorites = useMemo(() => {
    if (!favoritesFilter.trim()) return resolvedFavoriteSongs;
    const q = favoritesFilter.toLowerCase().trim();
    return resolvedFavoriteSongs.filter((s) => {
      const title = (s.title || '').toLowerCase();
      const artist = (s.artist || s.singers || '').toLowerCase();
      return title.includes(q) || artist.includes(q);
    });
  }, [resolvedFavoriteSongs, favoritesFilter]);

  // Filtered play history
  const filteredHistory = useMemo(() => {
    if (!historyFilter.trim()) return playHistory;
    const q = historyFilter.toLowerCase().trim();
    return playHistory.filter((item) => {
      const song = item?.song || item || {};
      const title = (song.title || '').toLowerCase();
      const artist = (song.artist || song.singers || '').toLowerCase();
      return title.includes(q) || artist.includes(q);
    });
  }, [playHistory, historyFilter]);

  // Compute Top Streamed Artists & Listening DNA from user's playHistory + favorites
  const topArtistsDNA = useMemo(() => {
    const map = new Map();
    const registerTrack = (song, weight = 1) => {
      if (!song) return;
      const rawArtist = song.artist || song.singers;
      if (!rawArtist || rawArtist === 'Unknown Artist') return;
      const primaryArtist = rawArtist.split(',')[0].split('&')[0].trim();
      if (!primaryArtist) return;
      const existing = map.get(primaryArtist);
      if (existing) {
        existing.count += weight;
      } else {
        map.set(primaryArtist, {
          name: primaryArtist,
          count: weight,
          coverUrl: song.coverUrl,
          sampleSong: song,
        });
      }
    };

    playHistory.forEach((item) => registerTrack(item?.song || item, 2));
    resolvedFavoriteSongs.forEach((song) => registerTrack(song, 1));

    return Array.from(map.values())
      .sort((a, b) => b.count - a.count)
      .slice(0, 4);
  }, [playHistory, resolvedFavoriteSongs]);

  // Estimated listening stats
  const estimatedListeningHours = useMemo(() => {
    const totalMinutes = Math.round(playHistory.length * 3.4);
    const hours = Math.floor(totalMinutes / 60);
    const mins = totalMinutes % 60;
    if (hours > 0) return `${hours}h ${mins}m`;
    return `${mins}m`;
  }, [playHistory.length]);

  // Music Persona based on genre & activity
  const musicPersona = useMemo(() => {
    const genre = (userProfile?.favoriteGenre || favoriteGenre || '').toLowerCase();
    if (genre.includes('pop')) return { title: 'Pop Culture Explorer', vibe: 'Catchy & Chart-Topping', icon: Fire };
    if (genre.includes('hip-hop') || genre.includes('rap')) return { title: 'Rhythm & Flow Curator', vibe: 'Lyrical & Bass Heavy', icon: Lightning };
    if (genre.includes('rock') || genre.includes('metal')) return { title: 'Electric Riff Enthusiast', vibe: 'Raw Energy & Drums', icon: Broadcast };
    if (genre.includes('electronic') || genre.includes('edm') || genre.includes('dance')) return { title: 'Neon Synth Pioneer', vibe: 'Sonic Wave Hunter', icon: Waveform };
    if (genre.includes('r&b') || genre.includes('soul')) return { title: 'Soul & Groove Connoisseur', vibe: 'Velvet Vocals & Smooth Bass', icon: VinylRecord };
    if (genre.includes('lo-fi') || genre.includes('ambient') || genre.includes('chill')) return { title: 'Midnight Flow Architect', vibe: 'Deep Focus & Chill', icon: Headphones };
    if (genre.includes('latin') || genre.includes('reggaeton')) return { title: 'Latin Pulse Dancer', vibe: 'Tropical & Infectious', icon: Lightning };
    if (genre.includes('k-pop')) return { title: 'K-Pop Universe Voyager', vibe: 'Dynamic & Polished', icon: Sparkle };
    if (genre.includes('classical') || genre.includes('jazz')) return { title: 'Acoustic Virtuoso', vibe: 'Harmonic & Timeless', icon: VinylRecord };
    if (genre.includes('bolly')) return { title: 'Cinematic Melophile', vibe: 'Soulful & Dramatic', icon: Fire };
    return { title: 'Global Sound Voyager', vibe: 'Eclectic & Boundaryless', icon: Compass };
  }, [userProfile?.favoriteGenre, favoriteGenre]);

  const handleSaveProfile = async (e) => {
    e.preventDefault();
    if (!currentUser?.uid) return;
    setIsSaving(true);
    try {
      const finalAvatar = customAvatarUrl.trim() || selectedAvatar;
      await saveUserProfile(currentUser.uid, {
        displayName: displayName.trim() || effectiveName,
        favoriteGenre,
        bio: bio.trim(),
        photoURL: finalAvatar,
        audioQuality,
      });
      setIsEditing(false);
      onShowSuccess?.('Profile & studio audio settings updated!');
    } catch (err) {
      console.warn('Profile save error:', err);
    } finally {
      setIsSaving(false);
    }
  };

  const handleClearHistory = async () => {
    if (!currentUser?.uid) return;
    try {
      await clearPlayHistory(currentUser.uid);
      setShowClearHistoryConfirm(false);
      onShowSuccess?.('Listening history cleared from cloud');
    } catch (err) {
      console.warn('Clear history error:', err);
    }
  };

  const handleClearSearches = async () => {
    if (!currentUser?.uid) return;
    try {
      await clearSearchHistory(currentUser.uid);
      setShowClearSearchConfirm(false);
      onShowSuccess?.('Search history cleared from cloud');
    } catch (err) {
      console.warn('Clear search error:', err);
    }
  };

  const handleRemoveSingleSearch = async (e, id) => {
    e.stopPropagation();
    if (!currentUser?.uid || !id) return;
    try {
      await removeSearchHistoryItem(currentUser.uid, id);
    } catch (err) {
      console.warn('Remove search error:', err);
    }
  };

  const handleCopyProfileLink = () => {
    try {
      const shareUrl = window.location.href;
      navigator.clipboard.writeText(shareUrl);
      setCopiedLink(true);
      onShowSuccess?.('Profile link copied to clipboard!');
      setTimeout(() => setCopiedLink(false), 2500);
    } catch (e) {
      console.warn('Copy link error:', e);
    }
  };

  const formatTimeAgo = (timestamp) => {
    if (!timestamp) return 'Recently';
    const date = timestamp?.toDate ? timestamp.toDate() : new Date(timestamp);
    const now = new Date();
    const diffSecs = Math.floor((now - date) / 1000);
    if (diffSecs < 60) return 'Just now';
    if (diffSecs < 3600) return `${Math.floor(diffSecs / 60)}m ago`;
    if (diffSecs < 86400) return `${Math.floor(diffSecs / 3600)}h ago`;
    return `${Math.floor(diffSecs / 86400)}d ago`;
  };

  const formatDuration = (seconds) => {
    if (!seconds || isNaN(seconds)) return '3:30';
    const m = Math.floor(seconds / 60);
    const s = Math.floor(seconds % 60);
    return `${m}:${s < 10 ? '0' : ''}${s}`;
  };

  const PersonaIcon = musicPersona.icon;

  return (
    <div className="space-y-6 max-w-6xl mx-auto pb-16 px-2 sm:px-4">
      {/* ─── 1. STUDIO AUDIOPHILE HERO HEADER ────────────────────────── */}
      <div className="relative overflow-hidden rounded-3xl glass-card border border-[var(--primary)]/20 p-6 sm:p-8 shadow-[0_20px_50px_rgba(0,0,0,0.5)]">
        {/* Ambient Studio Glow */}
        <div className="absolute -top-24 -right-24 w-80 h-80 bg-[var(--primary)]/12 rounded-full blur-3xl pointer-events-none" />
        <div className="absolute -bottom-24 -left-24 w-80 h-80 bg-indigo-500/10 rounded-full blur-3xl pointer-events-none" />

        <div className="flex flex-col md:flex-row items-center md:items-start gap-6 relative z-10">
          {/* Avatar Frame */}
          <div className="relative group shrink-0">
            <div className="w-24 h-24 sm:w-32 sm:h-32 rounded-3xl overflow-hidden bg-gradient-to-br from-[var(--primary)]/35 via-[#111822] to-indigo-900/40 p-1 border-2 border-[var(--primary)]/35 shadow-2xl transition-transform duration-300 group-hover:scale-[1.02]">
              <div className="w-full h-full rounded-[20px] overflow-hidden bg-[#0a0e14] flex items-center justify-center">
                {photoURL ? (
                  <img
                    src={photoURL}
                    alt={effectiveName}
                    decoding="async"
                    className="w-full h-full object-cover"
                    referrerPolicy="no-referrer"
                    onError={(e) => {
                      e.target.onerror = null;
                      e.target.src = AVATAR_PRESETS[0].url;
                    }}
                  />
                ) : (
                  <UserCircle size={52} weight="duotone" className="text-[var(--primary)]" />
                )}
              </div>
            </div>

            {/* Live Cloud Sync Indicator */}
            <div
              className="absolute -bottom-1 -right-1 px-2.5 py-0.5 rounded-full bg-emerald-500 text-[#070a0f] text-[10px] font-extrabold ring-4 ring-[#0c1118] flex items-center gap-1 shadow-lg"
              title="Cloud Sync Active"
            >
              <span className="w-1.5 h-1.5 rounded-full bg-[#070a0f] animate-pulse" />
              <span>SYNCED</span>
            </div>

            {/* Quick Edit Avatar Button */}
            <button
              type="button"
              onClick={() => setIsEditing(true)}
              className="absolute inset-0 rounded-3xl bg-black/60 opacity-0 group-hover:opacity-100 flex flex-col items-center justify-center gap-1 text-white text-xs font-semibold transition-opacity cursor-pointer"
            >
              <PencilSimple size={18} weight="duotone" className="text-[var(--primary)]" />
              <span>Customize</span>
            </button>
          </div>

          {/* User Identity & Editorial Metadata */}
          <div className="flex-1 text-center md:text-left space-y-3 min-w-0">
            <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
              <div>
                <div className="flex flex-wrap items-center justify-center md:justify-start gap-2.5">
                  <h1 className="font-display text-2xl sm:text-4xl font-bold text-[var(--text)] tracking-wide">
                    {effectiveName}
                  </h1>
                  <span className="inline-flex items-center gap-1 text-xs font-bold text-amber-300">
                    <Crown size={16} weight="fill" className="text-amber-400" />
                    <span>Studio Member</span>
                  </span>
                </div>

                <p className="text-xs sm:text-sm text-[var(--text-light)] flex items-center justify-center md:justify-start gap-1.5 mt-1">
                  <EnvelopeSimple size={15} weight="duotone" className="text-[var(--primary)]" />
                  <span className="truncate">{email}</span>
                </p>
              </div>

              {/* Action Buttons */}
              <div className="flex flex-wrap items-center justify-center md:justify-end gap-2 pt-1 lg:pt-0">
                <button
                  type="button"
                  onClick={() => setIsEditing(!isEditing)}
                  className="px-4 py-2 rounded-xl text-xs font-semibold bg-white/[0.06] hover:bg-white/[0.12] text-[var(--text)] border border-[var(--primary)]/25 transition-all flex items-center gap-1.5 shadow-sm active:scale-95 cursor-pointer"
                >
                  {isEditing ? (
                    <X size={15} weight="bold" />
                  ) : (
                    <PencilSimple size={15} weight="duotone" className="text-[var(--primary)]" />
                  )}
                  <span>{isEditing ? 'Close Editor' : 'Edit Profile'}</span>
                </button>

                <button
                  type="button"
                  onClick={handleCopyProfileLink}
                  className="px-4 py-2 rounded-xl text-xs font-semibold bg-white/[0.05] hover:bg-white/[0.1] text-[var(--text)] border border-white/10 transition-all flex items-center gap-1.5 shadow-sm active:scale-95 cursor-pointer"
                  title="Share Profile"
                >
                  {copiedLink ? (
                    <Check size={15} weight="bold" className="text-emerald-400" />
                  ) : (
                    <ShareNetwork size={15} weight="duotone" />
                  )}
                  <span>{copiedLink ? 'Copied' : 'Share'}</span>
                </button>

                <button
                  type="button"
                  onClick={() => setShowSignOutConfirm(true)}
                  className="px-4 py-2 rounded-xl text-xs font-semibold bg-rose-500/10 hover:bg-rose-500/20 text-rose-400 border border-rose-500/25 transition-all flex items-center gap-1.5 shadow-sm active:scale-95 cursor-pointer"
                >
                  <SignOut size={15} weight="duotone" />
                  <span>Sign Out</span>
                </button>
              </div>
            </div>

            {/* User Bio */}
            <p className="text-xs sm:text-sm text-[var(--text-light)] max-w-2xl leading-relaxed">
              {bio}
            </p>

            {/* Clean Unboxed Inline Metadata Line (Per Frontend Design Zero-Pill Discipline) */}
            <div className="flex flex-wrap items-center justify-center md:justify-start gap-x-3 gap-y-1.5 pt-1 text-xs text-[var(--text-light)]">
              <span className="inline-flex items-center gap-1.5 text-[var(--primary)] font-semibold">
                <PersonaIcon size={15} weight="duotone" />
                <span>{musicPersona.title}</span>
                <span className="text-[var(--text-light)]/70 font-normal">({musicPersona.vibe})</span>
              </span>
              <span aria-hidden="true" className="text-white/25">·</span>
              <span className="inline-flex items-center gap-1.5">
                <VinylRecord size={14} weight="duotone" className="text-[var(--primary)]" />
                <span>Primary Vibe: <strong className="text-white font-semibold">{userProfile?.favoriteGenre || favoriteGenre}</strong></span>
              </span>
              <span aria-hidden="true" className="text-white/25">·</span>
              <span className="inline-flex items-center gap-1.5">
                <Waveform size={14} weight="bold" className="text-emerald-400" />
                <span>Stream Engine: <strong className="text-emerald-300 font-mono font-semibold">{audioQuality === '320k' ? '320kbps Master' : audioQuality.toUpperCase()}</strong></span>
              </span>
            </div>
          </div>
        </div>

        {/* ─── INLINE PROFILE & AVATAR DRAWER ─────────────────────────── */}
        {isEditing && (
          <form
            onSubmit={handleSaveProfile}
            className="mt-6 pt-6 border-t border-white/10 space-y-5 animate-in fade-in duration-200"
          >
            <div className="flex items-center justify-between">
              <h3 className="text-sm font-bold text-[var(--text)] flex items-center gap-2">
                <SlidersHorizontal size={17} weight="duotone" className="text-[var(--primary)]" />
                <span>Customize Studio Profile & Audio Preferences</span>
              </h3>
              <button
                type="button"
                onClick={() => setIsEditing(false)}
                className="text-xs text-[var(--text-light)]/60 hover:text-[var(--text)]"
              >
                Dismiss
              </button>
            </div>

            {/* Avatar Selector Carousel */}
            <div>
              <label className="block text-xs font-semibold text-[var(--text-light)] mb-2">
                Choose Studio Avatar or Preset
              </label>
              <div className="grid grid-cols-3 sm:grid-cols-6 gap-2.5">
                {AVATAR_PRESETS.map((preset) => (
                  <button
                    key={preset.id}
                    type="button"
                    onClick={() => {
                      setSelectedAvatar(preset.url);
                      setCustomAvatarUrl('');
                    }}
                    className={`p-2.5 rounded-2xl border transition-all flex flex-col items-center gap-1.5 cursor-pointer ${
                      selectedAvatar === preset.url && !customAvatarUrl
                        ? 'bg-[var(--primary)]/20 border-[var(--primary)] shadow-md ring-1 ring-[var(--primary)]/40'
                        : 'bg-white/[0.04] border-white/10 hover:border-white/20'
                    }`}
                  >
                    <img
                      src={preset.url}
                      alt={preset.label}
                      className="w-10 h-10 rounded-xl object-cover bg-[#0a0e14]"
                    />
                    <span className="text-[10px] font-medium text-[var(--text-light)] truncate max-w-[75px]">
                      {preset.label}
                    </span>
                  </button>
                ))}
              </div>

              {/* Custom Avatar URL option */}
              <div className="mt-3">
                <input
                  type="url"
                  value={customAvatarUrl}
                  onChange={(e) => setCustomAvatarUrl(e.target.value)}
                  placeholder="Or paste any custom image URL (Unsplash, Pinterest, etc.)..."
                  className="w-full px-3.5 py-2.5 rounded-xl bg-[#0c1119] border border-white/10 text-xs text-[var(--text)] placeholder:text-[var(--text-light)]/40 focus:outline-none focus:border-[var(--primary)]"
                />
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              {/* Display Name */}
              <div>
                <label className="block text-xs font-semibold text-[var(--text-light)] mb-1.5">
                  Display Name
                </label>
                <input
                  type="text"
                  value={displayName}
                  onChange={(e) => setDisplayName(e.target.value)}
                  placeholder="Your listener name"
                  maxLength={40}
                  className="w-full px-3.5 py-2.5 rounded-xl bg-[#0c1119] border border-white/10 text-sm text-[var(--text)] focus:outline-none focus:border-[var(--primary)]"
                />
              </div>

              {/* Primary Vibe / Genre */}
              <div>
                <label className="block text-xs font-semibold text-[var(--text-light)] mb-1.5">
                  Favorite Music Vibe
                </label>
                <select
                  value={favoriteGenre}
                  onChange={(e) => setFavoriteGenre(e.target.value)}
                  className="w-full px-3.5 py-2.5 rounded-xl bg-[#0c1119] border border-white/10 text-sm text-[var(--text)] focus:outline-none focus:border-[var(--primary)]"
                >
                  {GENRES.map((g) => (
                    <option key={g} value={g}>
                      {g}
                    </option>
                  ))}
                </select>
              </div>

              {/* Audio Quality */}
              <div>
                <label className="block text-xs font-semibold text-[var(--text-light)] mb-1.5">
                  Streaming Quality
                </label>
                <select
                  value={audioQuality}
                  onChange={(e) => setAudioQuality(e.target.value)}
                  className="w-full px-3.5 py-2.5 rounded-xl bg-[#0c1119] border border-white/10 text-sm text-[var(--text)] focus:outline-none focus:border-[var(--primary)]"
                >
                  <option value="320k">Lossless 320kbps (Full Master)</option>
                  <option value="256k">High Quality 256kbps</option>
                  <option value="128k">Data Saver 128kbps</option>
                </select>
              </div>
            </div>

            {/* Bio Field */}
            <div>
              <label className="block text-xs font-semibold text-[var(--text-light)] mb-1.5">
                Listener Bio / Mood Tagline
              </label>
              <textarea
                value={bio}
                onChange={(e) => setBio(e.target.value)}
                rows={2}
                maxLength={160}
                placeholder="Share your musical taste or current favorite tracks..."
                className="w-full px-3.5 py-2.5 rounded-xl bg-[#0c1119] border border-white/10 text-xs text-[var(--text)] focus:outline-none focus:border-[var(--primary)] resize-none"
              />
            </div>

            <div className="flex items-center justify-end gap-3 pt-2">
              <button
                type="button"
                onClick={() => setIsEditing(false)}
                className="px-4 py-2 rounded-xl text-xs font-semibold text-[var(--text-light)] hover:text-[var(--text)] bg-white/5 hover:bg-white/10 transition-all cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={isSaving}
                className="py-2 px-5 rounded-xl bg-[var(--primary)] hover:brightness-110 text-[var(--primary-foreground)] font-bold text-xs transition-all flex items-center gap-2 shadow-lg active:scale-95 disabled:opacity-50 cursor-pointer"
              >
                <FloppyDisk size={15} weight="bold" />
                <span>{isSaving ? 'Saving Changes...' : 'Save Profile'}</span>
              </button>
            </div>
          </form>
        )}
      </div>

      {/* ─── 2. BENTO TELEMETRY CARDS ────────────────────────────────── */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
        {/* Liked Songs Stat */}
        <div
          onClick={() => setActiveTab('favorites')}
          className="p-4 sm:p-5 rounded-2xl glass-card smooth-card hover:border-rose-500/35 cursor-pointer group space-y-2.5 relative overflow-hidden"
        >
          <div className="flex items-center justify-between">
            <div className="w-10 h-10 rounded-xl bg-rose-500/15 text-rose-400 flex items-center justify-center group-hover:scale-105 transition-transform">
              <Heart size={20} weight="fill" />
            </div>
            <span className="text-[11px] font-medium text-rose-300/80">
              Library
            </span>
          </div>
          <div>
            <div className="text-2xl sm:text-3xl font-bold font-mono tabular-nums text-[var(--text)]">
              {favorites.length}
            </div>
            <div className="text-xs text-[var(--text-light)] flex items-center justify-between mt-1">
              <span>Liked Tracks</span>
              <CaretRight size={14} weight="bold" className="group-hover:translate-x-0.5 transition-transform text-[var(--primary)]" />
            </div>
          </div>
        </div>

        {/* Cloud Playlists Stat */}
        <div
          onClick={() => setActiveTab('playlists')}
          className="p-4 sm:p-5 rounded-2xl glass-card smooth-card hover:border-[var(--primary)]/35 cursor-pointer group space-y-2.5 relative overflow-hidden"
        >
          <div className="flex items-center justify-between">
            <div className="w-10 h-10 rounded-xl bg-[var(--primary)]/15 text-[var(--primary)] flex items-center justify-center group-hover:scale-105 transition-transform">
              <Playlist size={20} weight="duotone" />
            </div>
            <span className="text-[11px] font-medium text-[var(--primary)]/80">
              Cloud Synced
            </span>
          </div>
          <div>
            <div className="text-2xl sm:text-3xl font-bold font-mono tabular-nums text-[var(--text)]">
              {playlists.length}
            </div>
            <div className="text-xs text-[var(--text-light)] flex items-center justify-between mt-1">
              <span>Custom Playlists</span>
              <CaretRight size={14} weight="bold" className="group-hover:translate-x-0.5 transition-transform text-[var(--primary)]" />
            </div>
          </div>
        </div>

        {/* Listening Time / History */}
        <div
          onClick={() => setActiveTab('overview')}
          className="p-4 sm:p-5 rounded-2xl glass-card smooth-card hover:border-amber-500/35 cursor-pointer group space-y-2.5 relative overflow-hidden"
        >
          <div className="flex items-center justify-between">
            <div className="w-10 h-10 rounded-xl bg-amber-500/15 text-amber-400 flex items-center justify-center group-hover:scale-105 transition-transform">
              <Clock size={20} weight="duotone" />
            </div>
            <span className="text-[11px] font-mono tabular-nums text-amber-300/85">
              {playHistory.length} plays
            </span>
          </div>
          <div>
            <div className="text-2xl sm:text-3xl font-bold font-mono tabular-nums text-[var(--text)]">
              {estimatedListeningHours}
            </div>
            <div className="text-xs text-[var(--text-light)] flex items-center justify-between mt-1">
              <span>Stream Time</span>
              <CaretRight size={14} weight="bold" className="group-hover:translate-x-0.5 transition-transform text-[var(--primary)]" />
            </div>
          </div>
        </div>

        {/* Audio Engine / Cloud Sync */}
        <div
          onClick={() => setActiveTab('settings')}
          className="p-4 sm:p-5 rounded-2xl glass-card smooth-card hover:border-emerald-500/35 cursor-pointer group space-y-2.5 relative overflow-hidden"
        >
          <div className="flex items-center justify-between">
            <div className="w-10 h-10 rounded-xl bg-emerald-500/15 text-emerald-400 flex items-center justify-center group-hover:scale-105 transition-transform">
              <Waveform size={20} weight="bold" />
            </div>
            <span className="text-[11px] font-medium text-emerald-300/90 flex items-center gap-1.5">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
              Active
            </span>
          </div>
          <div>
            <div className="text-2xl sm:text-3xl font-bold font-mono tabular-nums text-emerald-400">
              {audioQuality}
            </div>
            <div className="text-xs text-[var(--text-light)] flex items-center justify-between mt-1">
              <span>Hybrid Audio Engine</span>
              <CaretRight size={14} weight="bold" className="group-hover:translate-x-0.5 transition-transform text-[var(--primary)]" />
            </div>
          </div>
        </div>
      </div>

      {/* ─── 2.5 TOP STREAMED ARTISTS & LISTENING DNA SHELF ───────────── */}
      {topArtistsDNA.length > 0 && (
        <div className="rounded-3xl glass-card border border-white/[0.08] p-5 sm:p-6 space-y-4">
          <div className="flex items-center justify-between gap-2">
            <div className="flex items-center gap-2.5">
              <div className="w-9 h-9 rounded-xl bg-[var(--primary)]/15 border border-[var(--primary)]/30 flex items-center justify-center text-[var(--primary)]">
                <ChartBar size={18} weight="duotone" />
              </div>
              <div>
                <h3 className="font-display text-sm sm:text-base font-bold text-white tracking-wide">
                  Your Top Artists & Listening DNA
                </h3>
                <p className="text-xs text-[var(--text-light)]">
                  Ranked by your personal stream rotation and saved favorites
                </p>
              </div>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
            {topArtistsDNA.map((artistItem, idx) => (
              <div
                key={artistItem.name}
                onClick={() => artistItem.sampleSong && onPlaySong?.(artistItem.sampleSong)}
                className="group flex items-center gap-3 p-3 rounded-2xl bg-white/[0.03] hover:bg-white/[0.07] border border-white/[0.06] hover:border-[var(--primary)]/30 transition-all cursor-pointer"
              >
                <span className="text-xs font-mono tabular-nums font-bold text-[var(--primary)]/80 w-5">
                  0{idx + 1}
                </span>
                <div className="relative w-11 h-11 rounded-full overflow-hidden shrink-0 border border-white/15 bg-black/50">
                  <img
                    src={
                      artistItem.coverUrl ||
                      'https://images.unsplash.com/photo-1511671782779-c97d3d27a1d4?w=600&q=80'
                    }
                    alt={artistItem.name}
                    decoding="async"
                    loading="lazy"
                    className="w-full h-full object-cover group-hover:scale-105 transition-transform"
                  />
                  <div className="absolute inset-0 bg-black/45 opacity-0 group-hover:opacity-100 flex items-center justify-center transition-opacity">
                    <Play size={14} weight="fill" className="text-[var(--primary)] ml-0.5" />
                  </div>
                </div>
                <div className="min-w-0 flex-1">
                  <p className="text-xs sm:text-sm font-bold text-white group-hover:text-[var(--primary)] truncate transition-colors">
                    {artistItem.name}
                  </p>
                  <p className="text-[11px] text-[var(--text-light)] truncate">
                    {artistItem.sampleSong?.title || 'Play top track'}
                  </p>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* ─── 3. MODERN SEGMENTED TABS ────────────────────────────────── */}
      <div className="flex items-center justify-between gap-3 border-b border-white/10 pb-2.5 overflow-x-auto scrollbar-none smooth-row-scroll">
        <div className="flex items-center gap-1.5 sm:gap-2">
          {[
            { id: 'overview', label: 'Listening History', count: playHistory.length, icon: MusicNotes },
            { id: 'favorites', label: 'Liked Tracks', count: favorites.length, icon: Heart },
            { id: 'playlists', label: 'Cloud Playlists', count: playlists.length, icon: Playlist },
            { id: 'searches', label: 'Search History', count: searchHistory.length, icon: MagnifyingGlass },
            { id: 'settings', label: 'Audio & Cloud', icon: SlidersHorizontal },
          ].map((tab) => {
            const Icon = tab.icon;
            const isActive = activeTab === tab.id;
            return (
              <button
                key={tab.id}
                type="button"
                onClick={() => setActiveTab(tab.id)}
                className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs sm:text-sm font-semibold transition-all whitespace-nowrap cursor-pointer ${
                  isActive
                    ? 'bg-[var(--primary)] text-[var(--primary-foreground)] font-bold shadow-[0_0_16px_rgba(83,242,224,0.3)]'
                    : 'text-[var(--text-light)] hover:text-[var(--text)] hover:bg-white/[0.05]'
                }`}
              >
                <Icon
                  size={17}
                  weight={isActive ? 'fill' : 'duotone'}
                  className={isActive ? 'text-[var(--primary-foreground)]' : ''}
                />
                <span>{tab.label}</span>
                {typeof tab.count === 'number' && tab.count > 0 && (
                  <span
                    className={`font-mono tabular-nums text-[11px] ${
                      isActive
                        ? 'text-[var(--primary-foreground)]/85 font-bold'
                        : 'text-[var(--text-light)]/70'
                    }`}
                  >
                    ({tab.count})
                  </span>
                )}
              </button>
            );
          })}
        </div>
      </div>

      {/* ─── 4. TAB CONTENTS ─────────────────────────────────────────── */}

      {/* ── TAB 1: LISTENING HISTORY ── */}
      {activeTab === 'overview' && (
        <div className="space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 glass-card p-3.5 rounded-2xl">
            {/* Search within history */}
            <div className="relative flex-1">
              <MagnifyingGlass
                size={15}
                weight="bold"
                className="absolute left-3.5 top-1/2 -translate-y-1/2 text-[var(--text-light)]/60"
              />
              <input
                type="text"
                value={historyFilter}
                onChange={(e) => setHistoryFilter(e.target.value)}
                placeholder="Filter listening history by track or artist..."
                className="w-full pl-9 pr-3 py-2 rounded-xl bg-white/[0.04] border border-white/10 text-xs sm:text-sm text-[var(--text)] placeholder:text-[var(--text-light)]/40 focus:outline-none focus:border-[var(--primary)]"
              />
            </div>

            <div className="flex items-center gap-2 shrink-0">
              {playHistory.length > 0 && (
                <>
                  <button
                    type="button"
                    onClick={() => {
                      const first = playHistory[0]?.song || playHistory[0];
                      if (first) onPlaySong?.(first);
                    }}
                    className="px-3.5 py-2 rounded-xl bg-[var(--primary)] text-[var(--primary-foreground)] text-xs font-bold flex items-center gap-1.5 transition-all hover:brightness-110 active:scale-95 cursor-pointer"
                  >
                    <Play size={14} weight="fill" />
                    <span>Play Recent Mix</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => setShowClearHistoryConfirm(true)}
                    className="px-3.5 py-2 rounded-xl bg-rose-500/10 hover:bg-rose-500/20 text-rose-400 border border-rose-500/25 text-xs font-semibold flex items-center gap-1.5 transition-all cursor-pointer"
                  >
                    <Trash size={14} weight="duotone" />
                    <span>Clear</span>
                  </button>
                </>
              )}
            </div>
          </div>

          {filteredHistory.length === 0 ? (
            <div className="text-center py-16 rounded-3xl glass-card p-8 space-y-3">
              <div className="w-16 h-16 rounded-2xl bg-[var(--primary)]/10 text-[var(--primary)] flex items-center justify-center mx-auto">
                <MusicNotes size={32} weight="duotone" />
              </div>
              <p className="text-base font-bold text-[var(--text)]">No listening history recorded</p>
              <p className="text-xs text-[var(--text-light)]/70 max-w-sm mx-auto">
                Stream any viral hit or universal track from the Explore catalog to automatically sync your listening records.
              </p>
              <button
                type="button"
                onClick={() => onNavigate?.('explore')}
                className="mt-2 px-5 py-2.5 rounded-xl bg-[var(--primary)] text-[var(--primary-foreground)] font-bold text-xs shadow-md hover:brightness-110 transition-all cursor-pointer"
              >
                Discover Tracks
              </button>
            </div>
          ) : (
            <div className="space-y-1.5">
              {filteredHistory.map((item, idx) => {
                const song = item?.song || item || {};
                const songId = song?.id || item?.id || `hist-${idx}`;
                const isCurrent = currentSong?.id === songId;
                const uniqueKey = `hist-${item?.id || songId}-${idx}`;
                const liked = isLiked(songId);

                return (
                  <div
                    key={uniqueKey}
                    onClick={() => onPlaySong?.(song)}
                    className={`group flex items-center gap-3.5 p-2.5 sm:p-3 rounded-2xl border smooth-card cursor-pointer ${
                      isCurrent
                        ? 'bg-[var(--primary)]/12 border-[var(--primary)]/45 shadow-md'
                        : 'bg-[#121822]/85 hover:bg-[#182130] border-white/[0.06] hover:border-[var(--primary)]/25'
                    }`}
                  >
                    {/* Index or Live Equalizer */}
                    <div className="w-6 text-center text-xs font-mono tabular-nums text-[var(--text-light)]/60 flex items-center justify-center">
                      {isCurrent && isPlaying ? (
                        <EqualizerBars color="var(--primary)" barCount={3} className="h-3" />
                      ) : (
                        <>
                          <span className="group-hover:hidden">{String(idx + 1).padStart(2, '0')}</span>
                          <Play size={14} weight="fill" className="text-[var(--primary)] hidden group-hover:block" />
                        </>
                      )}
                    </div>

                    {/* Album Art */}
                    <div className="relative w-11 h-11 sm:w-12 sm:h-12 rounded-xl overflow-hidden shrink-0 bg-neutral-900 border border-white/10 shadow-sm">
                      <img
                        src={
                          song.coverUrl ||
                          'https://images.unsplash.com/photo-1511671782779-c97d3d27a1d4?w=600&q=80'
                        }
                        alt={song.title || 'Track'}
                        decoding="async"
                        loading="lazy"
                        className="w-full h-full object-cover"
                      />
                    </div>

                    {/* Title & Artist */}
                    <div className="flex-1 min-w-0">
                      <h4
                        className={`text-xs sm:text-sm font-bold truncate ${
                          isCurrent ? 'text-[var(--primary)]' : 'text-[var(--text)] group-hover:text-[var(--primary)]'
                        }`}
                      >
                        {song.title || 'Untitled Track'}
                      </h4>
                      <p className="text-[11px] sm:text-xs text-[var(--text-light)]/75 truncate mt-0.5 flex items-center gap-1.5">
                        <span className="truncate">{song.artist || song.singers || 'Unknown Artist'}</span>
                        {song.source === 'youtube' && (
                          <>
                            <span aria-hidden="true">·</span>
                            <span className="inline-flex items-center gap-1 text-red-400 font-medium text-[11px]">
                              <YoutubeLogo size={12} weight="fill" /> YouTube
                            </span>
                          </>
                        )}
                      </p>
                    </div>

                    {/* Time Ago & Like */}
                    <div className="text-right shrink-0 flex items-center gap-3">
                      <span className="text-[11px] font-mono tabular-nums text-[var(--text-light)]/60 hidden sm:inline">
                        {formatTimeAgo(item?.playedAt)}
                      </span>

                      <LikeHeartButton
                        isFavorite={liked}
                        onToggle={() => onToggleFavorite?.(songId)}
                        size="md"
                        variant="icon"
                      />
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}

      {/* ── TAB 2: LIKED TRACKS ── */}
      {activeTab === 'favorites' && (
        <div className="space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 glass-card p-3.5 rounded-2xl">
            {/* Search in favorites */}
            <div className="relative flex-1">
              <MagnifyingGlass
                size={15}
                weight="bold"
                className="absolute left-3.5 top-1/2 -translate-y-1/2 text-[var(--text-light)]/60"
              />
              <input
                type="text"
                value={favoritesFilter}
                onChange={(e) => setFavoritesFilter(e.target.value)}
                placeholder="Search liked songs by title or artist..."
                className="w-full pl-9 pr-3 py-2 rounded-xl bg-white/[0.04] border border-white/10 text-xs sm:text-sm text-[var(--text)] placeholder:text-[var(--text-light)]/40 focus:outline-none focus:border-[var(--primary)]"
              />
            </div>

            {/* View controls & Shuffle */}
            <div className="flex items-center gap-2 shrink-0">
              {resolvedFavoriteSongs.length > 0 && (
                <button
                  type="button"
                  onClick={() => {
                    const randomIdx = Math.floor(Math.random() * resolvedFavoriteSongs.length);
                    const randomSong = resolvedFavoriteSongs[randomIdx];
                    if (randomSong) onPlaySong?.(randomSong);
                  }}
                  className="px-3.5 py-2 rounded-xl bg-[var(--primary)] text-[var(--primary-foreground)] text-xs font-bold flex items-center gap-1.5 transition-all hover:brightness-110 active:scale-95 cursor-pointer"
                >
                  <Play size={14} weight="fill" />
                  <span>Shuffle Liked</span>
                </button>
              )}

              <div className="flex items-center bg-white/[0.04] rounded-xl p-0.5 border border-white/10">
                <button
                  type="button"
                  onClick={() => setViewMode('grid')}
                  className={`p-2 rounded-lg transition-all cursor-pointer ${
                    viewMode === 'grid'
                      ? 'bg-[var(--primary)] text-[var(--primary-foreground)]'
                      : 'text-[var(--text-light)]/70 hover:text-[var(--text)]'
                  }`}
                  title="Grid View"
                >
                  <SquaresFour size={15} weight={viewMode === 'grid' ? 'fill' : 'duotone'} />
                </button>
                <button
                  type="button"
                  onClick={() => setViewMode('list')}
                  className={`p-2 rounded-lg transition-all cursor-pointer ${
                    viewMode === 'list'
                      ? 'bg-[var(--primary)] text-[var(--primary-foreground)]'
                      : 'text-[var(--text-light)]/70 hover:text-[var(--text)]'
                  }`}
                  title="List View"
                >
                  <ListBullets size={15} weight="bold" />
                </button>
              </div>
            </div>
          </div>

          {filteredFavorites.length === 0 ? (
            <div className="text-center py-16 rounded-3xl glass-card p-8 space-y-3">
              <div className="w-16 h-16 rounded-2xl bg-rose-500/10 text-rose-400 flex items-center justify-center mx-auto">
                <Heart size={32} weight="duotone" />
              </div>
              <p className="text-base font-bold text-[var(--text)]">No favorite songs found</p>
              <p className="text-xs text-[var(--text-light)]/70 max-w-sm mx-auto">
                {favoritesFilter
                  ? 'No tracks matched your search query.'
                  : 'Tap the heart icon on any track to save it to your personal cloud favorites collection.'}
              </p>
              <button
                type="button"
                onClick={() => onNavigate?.('explore')}
                className="mt-2 px-5 py-2.5 rounded-xl bg-[var(--primary)] text-[var(--primary-foreground)] font-bold text-xs shadow-md hover:brightness-110 transition-all cursor-pointer"
              >
                Browse Catalog
              </button>
            </div>
          ) : viewMode === 'grid' ? (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
              {filteredFavorites.map((song, idx) => {
                const songId = song?.id || `fav-${idx}`;
                const isCurrent = currentSong?.id === songId;
                const uniqueKey = `fav-grid-${songId}-${idx}`;

                return (
                  <div
                    key={uniqueKey}
                    onClick={() => onPlaySong?.(song)}
                    className={`group p-3 rounded-2xl border smooth-card cursor-pointer flex items-center gap-3 relative ${
                      isCurrent
                        ? 'bg-[var(--primary)]/12 border-[var(--primary)]/45 shadow-lg'
                        : 'bg-[#121822]/90 hover:bg-[#182130] border-white/[0.06] hover:border-[var(--primary)]/25'
                    }`}
                  >
                    <div className="relative w-14 h-14 rounded-xl overflow-hidden shrink-0 bg-neutral-900 border border-white/10 shadow-sm">
                      <img
                        src={
                          song.coverUrl ||
                          'https://images.unsplash.com/photo-1511671782779-c97d3d27a1d4?w=600&q=80'
                        }
                        alt={song.title || 'Track'}
                        decoding="async"
                        loading="lazy"
                        className="w-full h-full object-cover"
                      />
                      <div className="absolute inset-0 bg-black/45 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
                        {isCurrent && isPlaying ? (
                          <Pause size={20} weight="fill" className="text-[var(--primary)]" />
                        ) : (
                          <Play size={20} weight="fill" className="text-white ml-0.5" />
                        )}
                      </div>
                    </div>

                    <div className="flex-1 min-w-0">
                      <h4
                        className={`text-xs sm:text-sm font-bold truncate ${
                          isCurrent ? 'text-[var(--primary)]' : 'text-[var(--text)] group-hover:text-[var(--primary)]'
                        }`}
                      >
                        {song.title || 'Liked Track'}
                      </h4>
                      <p className="text-[11px] text-[var(--text-light)]/75 truncate mt-0.5">
                        {song.artist || song.singers || 'Unknown Artist'}
                      </p>
                      <div className="flex items-center gap-1.5 mt-1 text-[10px] text-[var(--text-light)]/70 font-mono tabular-nums">
                        <span>{formatDuration(song.duration)}</span>
                        <span aria-hidden="true">·</span>
                        <span className="text-emerald-400 font-semibold">320k</span>
                      </div>
                    </div>

                    <LikeHeartButton
                      isFavorite={true}
                      onToggle={() => onToggleFavorite?.(songId)}
                      size="md"
                      variant="icon"
                    />
                  </div>
                );
              })}
            </div>
          ) : (
            <div className="space-y-1.5">
              {filteredFavorites.map((song, idx) => {
                const songId = song?.id || `fav-${idx}`;
                const isCurrent = currentSong?.id === songId;
                const uniqueKey = `fav-list-${songId}-${idx}`;

                return (
                  <div
                    key={uniqueKey}
                    onClick={() => onPlaySong?.(song)}
                    className={`group flex items-center gap-3.5 p-2.5 rounded-2xl border smooth-card cursor-pointer ${
                      isCurrent
                        ? 'bg-[var(--primary)]/12 border-[var(--primary)]/45 shadow-md'
                        : 'bg-[#121822]/85 hover:bg-[#182130] border-white/[0.06] hover:border-[var(--primary)]/25'
                    }`}
                  >
                    <div className="w-6 text-center text-xs text-[var(--text-light)]/50 font-mono tabular-nums">
                      {String(idx + 1).padStart(2, '0')}
                    </div>

                    <img
                      src={
                        song.coverUrl ||
                        'https://images.unsplash.com/photo-1511671782779-c97d3d27a1d4?w=600&q=80'
                      }
                      alt={song.title || 'Track'}
                      decoding="async"
                      loading="lazy"
                      className="w-10 h-10 rounded-xl object-cover shrink-0 border border-white/10"
                    />

                    <div className="flex-1 min-w-0">
                      <h4
                        className={`text-xs sm:text-sm font-bold truncate ${
                          isCurrent ? 'text-[var(--primary)]' : 'text-[var(--text)] group-hover:text-[var(--primary)]'
                        }`}
                      >
                        {song.title || 'Liked Track'}
                      </h4>
                      <p className="text-[11px] text-[var(--text-light)]/75 truncate">
                        {song.artist || song.singers || 'Unknown Artist'}
                      </p>
                    </div>

                    <span className="text-xs text-[var(--text-light)]/60 font-mono tabular-nums hidden sm:inline">
                      {formatDuration(song.duration)}
                    </span>

                    <LikeHeartButton
                      isFavorite={true}
                      onToggle={() => onToggleFavorite?.(songId)}
                      size="md"
                      variant="icon"
                    />
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}

      {/* ── TAB 3: CLOUD PLAYLISTS ── */}
      {activeTab === 'playlists' && (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="font-display text-base font-bold text-[var(--text)] tracking-wide">
              Your Cloud Playlists ({playlists.length})
            </h3>
            {onCreatePlaylist && (
              <button
                type="button"
                onClick={onCreatePlaylist}
                className="px-4 py-2 rounded-xl bg-[var(--primary)] text-[var(--primary-foreground)] font-bold text-xs flex items-center gap-1.5 shadow-sm hover:brightness-110 transition-all cursor-pointer"
              >
                <Plus size={15} weight="bold" />
                <span>New Playlist</span>
              </button>
            )}
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {/* Create Shortcut Card */}
            {onCreatePlaylist && (
              <div
                onClick={onCreatePlaylist}
                className="p-6 rounded-3xl bg-white/[0.02] hover:bg-white/[0.05] border-2 border-dashed border-[var(--primary)]/25 hover:border-[var(--primary)]/55 transition-all cursor-pointer flex flex-col items-center justify-center text-center space-y-2 min-h-[160px] group"
              >
                <div className="w-12 h-12 rounded-2xl bg-[var(--primary)]/12 text-[var(--primary)] flex items-center justify-center group-hover:scale-110 transition-transform">
                  <Plus size={24} weight="bold" />
                </div>
                <div className="font-bold text-sm text-[var(--text)] group-hover:text-[var(--primary)] transition-colors">
                  Create Playlist
                </div>
                <p className="text-xs text-[var(--text-light)]/65">
                  Build a custom mix synced to your cloud account
                </p>
              </div>
            )}

            {playlists.map((pl, idx) => (
              <div
                key={`pl-${pl.id || idx}-${idx}`}
                onClick={() => onOpenPlaylist?.(pl)}
                className="p-5 rounded-3xl glass-card smooth-card hover:border-[var(--primary)]/35 cursor-pointer group space-y-4 relative overflow-hidden"
              >
                <div className="flex items-center justify-between">
                  <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-[var(--primary)]/25 to-cyan-800/35 text-[var(--primary)] flex items-center justify-center group-hover:scale-105 transition-transform border border-[var(--primary)]/25">
                    <Playlist size={24} weight="duotone" />
                  </div>
                  <span className="text-xs font-mono tabular-nums text-[var(--text-light)]">
                    {(pl.songs || []).length} tracks
                  </span>
                </div>

                <div>
                  <h4 className="font-bold text-sm sm:text-base text-[var(--text)] group-hover:text-[var(--primary)] transition-colors truncate">
                    {pl.name || 'Untitled Playlist'}
                  </h4>
                  <p className="text-xs text-[var(--text-light)]/75 mt-1 line-clamp-1">
                    {pl.description || 'Curated cloud playlist on Azaad Music'}
                  </p>
                </div>

                <div className="pt-2.5 border-t border-white/[0.06] flex items-center justify-between text-xs text-[var(--text-light)]/70">
                  <span>Open Collection</span>
                  <CaretRight size={15} weight="bold" className="text-[var(--primary)] group-hover:translate-x-1 transition-transform" />
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* ── TAB 4: SEARCH HISTORY ── */}
      {activeTab === 'searches' && (
        <div className="space-y-4">
          <div className="flex items-center justify-between glass-card p-4 rounded-2xl">
            <div>
              <h3 className="text-sm font-bold text-[var(--text)]">Cloud Search History</h3>
              <p className="text-xs text-[var(--text-light)]/70 mt-0.5">
                Past queries are synced across all your devices in real-time.
              </p>
            </div>

            {searchHistory.length > 0 && (
              <button
                type="button"
                onClick={() => setShowClearSearchConfirm(true)}
                className="px-3.5 py-2 rounded-xl bg-rose-500/10 hover:bg-rose-500/20 text-rose-400 border border-rose-500/25 text-xs font-semibold flex items-center gap-1.5 transition-all cursor-pointer"
              >
                <Trash size={14} weight="duotone" />
                <span>Clear All</span>
              </button>
            )}
          </div>

          {searchHistory.length === 0 ? (
            <div className="text-center py-16 rounded-3xl glass-card p-8 space-y-3">
              <div className="w-16 h-16 rounded-2xl bg-white/5 text-[var(--text-light)] flex items-center justify-center mx-auto">
                <MagnifyingGlass size={30} weight="duotone" />
              </div>
              <p className="text-base font-bold text-[var(--text)]">No search queries recorded</p>
              <p className="text-xs text-[var(--text-light)]/70 max-w-sm mx-auto">
                Any songs, artists, or lyrics you search for in the top search bar will appear here for fast 1-click discovery.
              </p>
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
              {searchHistory.map((item, idx) => (
                <div
                  key={`search-${item.id || idx}-${idx}`}
                  onClick={() => onSelectSearchQuery?.(item.query, item.filter)}
                  className="flex items-center justify-between p-3.5 rounded-2xl bg-[#121822]/90 hover:bg-[#182130] border border-white/[0.06] hover:border-[var(--primary)]/30 transition-all cursor-pointer group"
                >
                  <div className="flex items-center gap-3 min-w-0">
                    <div className="w-9 h-9 rounded-xl bg-white/[0.04] text-[var(--text-light)] flex items-center justify-center group-hover:text-[var(--primary)] transition-colors shrink-0">
                      <MagnifyingGlass size={16} weight="duotone" />
                    </div>
                    <div className="min-w-0">
                      <span className="text-xs sm:text-sm font-semibold text-[var(--text)] group-hover:text-[var(--primary)] transition-colors truncate block">
                        {item.query}
                      </span>
                      <div className="flex items-center gap-2 mt-0.5 text-[10px] text-[var(--text-light)]/60">
                        <span className="font-mono">{formatTimeAgo(item.searchedAt)}</span>
                        {item.filter && item.filter !== 'all' && (
                          <>
                            <span aria-hidden="true">·</span>
                            <span className="text-[var(--primary)] font-semibold uppercase">
                              {item.filter}
                            </span>
                          </>
                        )}
                      </div>
                    </div>
                  </div>

                  <button
                    type="button"
                    onClick={(e) => handleRemoveSingleSearch(e, item.id)}
                    className="p-1.5 rounded-lg text-[var(--text-light)]/40 hover:text-rose-400 hover:bg-rose-500/10 transition-all opacity-0 group-hover:opacity-100 shrink-0 cursor-pointer"
                    title="Remove from history"
                  >
                    <X size={14} weight="bold" />
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* ── TAB 5: AUDIO & CLOUD SETTINGS ── */}
      {activeTab === 'settings' && (
        <div className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* Audio Engine Configuration */}
            <div className="p-6 rounded-3xl glass-card space-y-4">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-[var(--primary)]/15 text-[var(--primary)] flex items-center justify-center">
                  <Headphones size={20} weight="duotone" />
                </div>
                <div>
                  <h4 className="font-bold text-sm text-[var(--text)]">Lossless Audio Stream</h4>
                  <p className="text-xs text-[var(--text-light)]/70">Studio bitrate & master playback engine</p>
                </div>
              </div>

              <div className="space-y-2">
                {[
                  { id: '320k', label: 'Lossless 320kbps', sub: 'Original Master Studio Quality (Recommended)' },
                  { id: '256k', label: 'High 256kbps', sub: 'Balanced crisp audio stream' },
                  { id: '128k', label: 'Data Saver 128kbps', sub: 'Minimal data consumption for mobile network' },
                ].map((opt) => (
                  <button
                    key={opt.id}
                    type="button"
                    onClick={async () => {
                      setAudioQuality(opt.id);
                      if (currentUser?.uid) {
                        try {
                          await saveUserProfile(currentUser.uid, { audioQuality: opt.id });
                          onShowSuccess?.(`Streaming bitrate set to ${opt.id}`);
                        } catch (e) {
                          console.warn(e);
                        }
                      }
                    }}
                    className={`w-full p-3.5 rounded-2xl border text-left flex items-center justify-between transition-all cursor-pointer ${
                      audioQuality === opt.id
                        ? 'bg-[var(--primary)]/15 border-[var(--primary)] shadow-sm'
                        : 'bg-white/[0.03] border-white/[0.06] hover:border-white/20'
                    }`}
                  >
                    <div>
                      <div className="text-xs font-bold text-[var(--text)]">{opt.label}</div>
                      <div className="text-[11px] text-[var(--text-light)]/65 mt-0.5">{opt.sub}</div>
                    </div>
                    {audioQuality === opt.id && (
                      <Check size={16} weight="bold" className="text-[var(--primary)]" />
                    )}
                  </button>
                ))}
              </div>
            </div>

            {/* Cloud Sync & Storage Engine */}
            <div className="p-6 rounded-3xl glass-card space-y-4">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-emerald-500/15 text-emerald-400 flex items-center justify-center">
                  <ShieldCheck size={20} weight="duotone" />
                </div>
                <div>
                  <h4 className="font-bold text-sm text-[var(--text)]">Cloud Security & Sync</h4>
                  <p className="text-xs text-[var(--text-light)]/70">Firebase Firestore Real-Time Replication</p>
                </div>
              </div>

              <div className="space-y-2.5 text-xs text-[var(--text-light)]/85">
                <div className="flex items-center justify-between p-3 rounded-2xl bg-white/[0.03] border border-white/[0.06]">
                  <span className="font-medium">Account ID</span>
                  <span className="font-mono text-[11px] text-[var(--primary)] truncate max-w-[160px]">
                    {currentUser?.uid || 'Guest'}
                  </span>
                </div>

                <div className="flex items-center justify-between p-3 rounded-2xl bg-white/[0.03] border border-white/[0.06]">
                  <span className="font-medium">Cloud Replication</span>
                  <span className="font-mono text-[11px] text-emerald-400">
                    Real-Time Synced
                  </span>
                </div>

                <div className="flex items-center justify-between p-3 rounded-2xl bg-white/[0.03] border border-white/[0.06]">
                  <span className="font-medium">Membership Tier</span>
                  <span className="text-[11px] font-semibold text-emerald-400">
                    Verified Audiophile
                  </span>
                </div>
              </div>

              <button
                type="button"
                onClick={() => setIsEditing(true)}
                className="w-full py-2.5 rounded-xl bg-[var(--primary)]/15 hover:bg-[var(--primary)]/25 text-[var(--primary)] border border-[var(--primary)]/30 text-xs font-bold transition-all flex items-center justify-center gap-1.5 cursor-pointer"
              >
                <PencilSimple size={15} weight="duotone" />
                <span>Edit Profile Info</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ─── CONFIRMATION MODALS ────────────────────────────────────── */}

      {/* Clear Play History Modal */}
      {showClearHistoryConfirm && (
        <div className="fixed inset-0 z-50 bg-black/75 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="max-w-sm w-full p-6 rounded-3xl glass-card border border-white/15 space-y-4 shadow-2xl">
            <div className="w-12 h-12 rounded-2xl bg-rose-500/15 text-rose-400 flex items-center justify-center mx-auto">
              <Trash size={24} weight="duotone" />
            </div>
            <div className="text-center space-y-1">
              <h3 className="text-base font-bold text-white">Clear Listening History?</h3>
              <p className="text-xs text-[var(--text-light)]">
                This will delete all records of recently played songs from your cloud account. This action cannot be undone.
              </p>
            </div>
            <div className="flex items-center gap-3 pt-2">
              <button
                type="button"
                onClick={() => setShowClearHistoryConfirm(false)}
                className="flex-1 py-2.5 rounded-xl text-xs font-semibold bg-white/5 hover:bg-white/10 text-white transition-all cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleClearHistory}
                className="flex-1 py-2.5 rounded-xl text-xs font-bold bg-rose-500 hover:bg-rose-600 text-white transition-all cursor-pointer"
              >
                Yes, Clear
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Clear Search History Modal */}
      {showClearSearchConfirm && (
        <div className="fixed inset-0 z-50 bg-black/75 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="max-w-sm w-full p-6 rounded-3xl glass-card border border-white/15 space-y-4 shadow-2xl">
            <div className="w-12 h-12 rounded-2xl bg-rose-500/15 text-rose-400 flex items-center justify-center mx-auto">
              <Trash size={24} weight="duotone" />
            </div>
            <div className="text-center space-y-1">
              <h3 className="text-base font-bold text-white">Clear Search History?</h3>
              <p className="text-xs text-[var(--text-light)]">
                This will clear all saved search queries from your cloud profile.
              </p>
            </div>
            <div className="flex items-center gap-3 pt-2">
              <button
                type="button"
                onClick={() => setShowClearSearchConfirm(false)}
                className="flex-1 py-2.5 rounded-xl text-xs font-semibold bg-white/5 hover:bg-white/10 text-white transition-all cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleClearSearches}
                className="flex-1 py-2.5 rounded-xl text-xs font-bold bg-rose-500 hover:bg-rose-600 text-white transition-all cursor-pointer"
              >
                Yes, Clear
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Sign Out Confirm Modal */}
      {showSignOutConfirm && (
        <div className="fixed inset-0 z-50 bg-black/75 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="max-w-sm w-full p-6 rounded-3xl glass-card border border-white/15 space-y-4 shadow-2xl">
            <div className="w-12 h-12 rounded-2xl bg-amber-500/15 text-amber-400 flex items-center justify-center mx-auto">
              <SignOut size={24} weight="duotone" />
            </div>
            <div className="text-center space-y-1">
              <h3 className="text-base font-bold text-white">Sign Out of Azaad Music?</h3>
              <p className="text-xs text-[var(--text-light)]">
                Your playlists, likes, and listening history are safely stored in Firebase cloud and will be restored when you sign in again.
              </p>
            </div>
            <div className="flex items-center gap-3 pt-2">
              <button
                type="button"
                onClick={() => setShowSignOutConfirm(false)}
                className="flex-1 py-2.5 rounded-xl text-xs font-semibold bg-white/5 hover:bg-white/10 text-white transition-all cursor-pointer"
              >
                Stay Logged In
              </button>
              <button
                type="button"
                onClick={() => {
                  setShowSignOutConfirm(false);
                  onSignOut?.();
                }}
                className="flex-1 py-2.5 rounded-xl text-xs font-bold bg-rose-500 hover:bg-rose-600 text-white transition-all cursor-pointer"
              >
                Sign Out
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default memo(UserProfileViewComponent);
