import React, { useState, useMemo } from 'react';
import {
  ListMusic,
  Plus,
  Trash2,
  Play,
  Pause,
  Shuffle,
  ArrowLeft,
  Music2,
  Clock,
  Heart,
  X,
  Loader2,
  Sparkles,
  ExternalLink,
} from 'lucide-react';
import { mediaUrl, handleCoverImageError, formatTime, normalizeSong } from '../utils/musicUtils';
import { LikeHeartButton } from './SongCard';

export default function Playlists({
  playlists = [],
  activePlaylist,
  setActivePlaylist,
  isLoading,
  currentSong,
  isPlaying,
  favorites = [],
  allSongs = [],
  onPlaySong,
  onToggleFavorite,
  onCreatePlaylist,
  onDeletePlaylist,
  onRemoveSongFromPlaylist,
  onNavigateToExplore,
  showCreateModal,
  setShowCreateModal,
}) {
  const [newPlaylistName, setNewPlaylistName] = useState('');
  const [newPlaylistDesc, setNewPlaylistDesc] = useState('');
  const [isCreating, setIsCreating] = useState(false);

  // Synchronize active playlist with the latest updated playlist item from props
  const currentActivePlaylist = useMemo(() => {
    if (!activePlaylist) return null;
    return playlists.find((p) => String(p.id) === String(activePlaylist.id)) || activePlaylist;
  }, [activePlaylist, playlists]);

  // Derive tracks for active playlist reliably
  const activeTracks = useMemo(() => {
    if (!currentActivePlaylist) return [];
    const rawTracks = Array.isArray(currentActivePlaylist.tracks) ? currentActivePlaylist.tracks : [];
    if (rawTracks.length > 0) {
      return rawTracks.map(normalizeSong).filter(Boolean);
    }
    const songIds = Array.isArray(currentActivePlaylist.songIds) ? currentActivePlaylist.songIds : [];
    if (songIds.length > 0 && Array.isArray(allSongs)) {
      return songIds
        .map((sId) => allSongs.find((s) => String(s.id || s.songId) === String(sId)))
        .filter(Boolean)
        .map(normalizeSong);
    }
    return [];
  }, [currentActivePlaylist, allSongs]);

  // Calculate total playlist duration
  const totalDurationText = useMemo(() => {
    if (!activeTracks.length) return '0 min';
    const totalSecs = activeTracks.reduce((acc, t) => acc + (typeof t.duration === 'number' ? t.duration : 0), 0);
    const mins = Math.floor(totalSecs / 60);
    if (mins < 60) return `${mins} min`;
    const hours = Math.floor(mins / 60);
    const remainMins = mins % 60;
    return `${hours} hr ${remainMins} min`;
  }, [activeTracks]);

  const handleCreateSubmit = async (e) => {
    e?.preventDefault?.();
    if (!newPlaylistName.trim() || isCreating) return;
    setIsCreating(true);
    try {
      await onCreatePlaylist(newPlaylistName.trim(), newPlaylistDesc.trim());
      setNewPlaylistName('');
      setNewPlaylistDesc('');
      setShowCreateModal(false);
    } finally {
      setIsCreating(false);
    }
  };

  const handlePlayAll = (shuffle = false) => {
    if (!activeTracks || activeTracks.length === 0) return;
    if (shuffle) {
      const shuffled = [...activeTracks].sort(() => Math.random() - 0.5);
      onPlaySong(shuffled[0], shuffled);
    } else {
      onPlaySong(activeTracks[0], activeTracks);
    }
  };

  // ─── ACTIVE PLAYLIST DETAIL VIEW ──────────────────────────────────────────
  if (currentActivePlaylist) {
    const isThisPlaylistPlaying =
      isPlaying &&
      activeTracks.some((t) => String(t.id || t.songId) === String(currentSong?.id || currentSong?.songId));

    const coverSong = activeTracks[0];
    const playlistCover =
      currentActivePlaylist.coverUrl ||
      coverSong?.coverUrl ||
      'https://images.unsplash.com/photo-1514525253161-7a46d19cd819?w=600&q=80';

    return (
      <div className="space-y-6">
        {/* Back navigation button */}
        <button
          onClick={() => setActivePlaylist(null)}
          className="inline-flex items-center gap-2 px-3 py-1.5 rounded-xl text-xs font-semibold text-[var(--text-light)] hover:text-white bg-white/5 hover:bg-white/10 border border-white/10 transition-colors"
        >
          <ArrowLeft className="w-4 h-4" />
          <span>Back to All Playlists</span>
        </button>

        {/* Playlist Hero Banner */}
        <div className="relative rounded-3xl overflow-hidden glass-card border border-white/10 p-6 sm:p-8 bg-gradient-to-b from-white/[0.04] to-transparent">
          <div className="flex flex-col sm:flex-row items-center sm:items-end gap-6">
            {/* Playlist Artwork */}
            <div className="relative w-40 h-40 sm:w-48 sm:h-48 rounded-2xl overflow-hidden shadow-2xl flex-shrink-0 bg-black/40 border border-white/15 group">
              {coverSong ? (
                <img
                  src={mediaUrl(playlistCover, coverSong)}
                  alt={currentActivePlaylist.name}
                  className="w-full h-full object-cover"
                  referrerPolicy="no-referrer"
                  onError={(e) => handleCoverImageError(e, coverSong)}
                />
              ) : (
                <div className="w-full h-full bg-gradient-to-br from-[var(--primary)]/20 via-[var(--accent)]/10 to-[var(--primary-dark)]/20 flex items-center justify-center">
                  <ListMusic className="w-16 h-16 text-[var(--primary)]/50" />
                </div>
              )}
              {activeTracks.length > 0 && (
                <button
                  onClick={() => handlePlayAll(false)}
                  className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center"
                  title="Play all tracks"
                >
                  <div className="w-14 h-14 rounded-full bg-[var(--primary)] text-[var(--bg)] flex items-center justify-center shadow-lg transform scale-90 group-hover:scale-100 transition-transform">
                    {isThisPlaylistPlaying ? <Pause className="w-6 h-6" /> : <Play className="w-6 h-6 ml-0.5" />}
                  </div>
                </button>
              )}
            </div>

            {/* Playlist Info & Controls */}
            <div className="flex-1 min-w-0 text-center sm:text-left space-y-3">
              <div className="inline-flex items-center gap-2 px-2.5 py-1 rounded-md bg-[var(--primary)]/10 text-[var(--primary)] text-[10px] font-bold tracking-wider uppercase">
                <ListMusic className="w-3 h-3" />
                <span>Custom Playlist</span>
              </div>

              <h1 className="text-2xl sm:text-4xl font-extrabold text-[var(--text)] truncate tracking-tight">
                {currentActivePlaylist.name}
              </h1>

              {currentActivePlaylist.description ? (
                <p className="text-xs sm:text-sm text-[var(--text-light)] max-w-xl line-clamp-2">
                  {currentActivePlaylist.description}
                </p>
              ) : (
                <p className="text-xs text-[var(--text-light)]/60">Curated music collection on Azaad</p>
              )}

              <div className="flex flex-wrap items-center justify-center sm:justify-start gap-4 text-xs text-[var(--text-light)] pt-1">
                <span>
                  <strong className="text-white font-semibold">{activeTracks.length}</strong> {activeTracks.length === 1 ? 'song' : 'songs'}
                </span>
                <span>•</span>
                <span className="flex items-center gap-1">
                  <Clock className="w-3.5 h-3.5 text-[var(--text-light)]/70" />
                  {totalDurationText}
                </span>
              </div>

              {/* Action Buttons */}
              <div className="flex flex-wrap items-center justify-center sm:justify-start gap-3 pt-2">
                <button
                  disabled={activeTracks.length === 0}
                  onClick={() => handlePlayAll(false)}
                  className="px-6 py-2.5 rounded-xl bg-[var(--primary)] hover:bg-[var(--primary-dark)] text-[var(--bg)] font-bold text-xs sm:text-sm inline-flex items-center gap-2 transition-all glow-primary disabled:opacity-40 disabled:cursor-not-allowed cursor-pointer"
                >
                  {isThisPlaylistPlaying ? <Pause className="w-4 h-4" /> : <Play className="w-4 h-4 ml-0.5" />}
                  <span>{isThisPlaylistPlaying ? 'Pause Playlist' : 'Play All'}</span>
                </button>

                <button
                  disabled={activeTracks.length <= 1}
                  onClick={() => handlePlayAll(true)}
                  className="px-4 py-2.5 rounded-xl bg-white/5 hover:bg-white/10 text-[var(--text)] border border-white/10 text-xs sm:text-sm font-semibold inline-flex items-center gap-2 transition-colors disabled:opacity-40 disabled:cursor-not-allowed cursor-pointer"
                >
                  <Shuffle className="w-4 h-4 text-[var(--primary)]" />
                  <span>Shuffle</span>
                </button>

                <button
                  onClick={() => onDeletePlaylist(currentActivePlaylist.id)}
                  className="p-2.5 rounded-xl bg-white/5 hover:bg-red-500/20 text-[var(--text-light)] hover:text-red-400 border border-white/10 transition-colors ml-auto cursor-pointer"
                  title="Delete playlist"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>
            </div>
          </div>
        </div>

        {/* Tracks List */}
        <div className="space-y-3">
          <div className="flex items-center justify-between px-2">
            <h3 className="text-sm font-bold text-[var(--text)] flex items-center gap-2">
              <Music2 className="w-4 h-4 text-[var(--primary)]" />
              <span>Tracks ({activeTracks.length})</span>
            </h3>
          </div>

          {activeTracks.length === 0 ? (
            <div className="text-center py-16 rounded-2xl glass-card p-6 border border-white/5 space-y-3">
              <ListMusic className="w-12 h-12 text-[var(--primary)]/30 mx-auto mb-2" />
              <h4 className="text-base font-bold text-[var(--text)]">This playlist is empty</h4>
              <p className="text-xs text-[var(--text-light)] max-w-sm mx-auto">
                Explore trending songs or search your favorite artists and click <strong>Add to playlist</strong> to build your playlist!
              </p>
              <button
                onClick={onNavigateToExplore}
                className="mt-2 px-5 py-2.5 rounded-xl bg-[var(--primary-dark)] hover:bg-[var(--primary)] text-[var(--bg)] text-xs font-bold inline-flex items-center gap-2 transition-all glow-primary"
              >
                <Sparkles className="w-4 h-4" />
                <span>Explore Songs</span>
              </button>
            </div>
          ) : (
            <div className="rounded-2xl glass-card overflow-hidden border border-white/10">
              {/* Organized Table Header */}
              <div className="grid grid-cols-[auto_1fr_auto] md:grid-cols-[auto_2fr_auto_auto_auto] items-center gap-3 sm:gap-4 px-4 py-2.5 text-[11px] font-bold text-[var(--text-light)]/70 uppercase tracking-wider border-b border-white/10 bg-white/[0.02]">
                <div className="flex items-center gap-3 w-16">
                  <span className="w-6 text-center">#</span>
                  <span>Track</span>
                </div>
                <div>Title & Artist</div>
                <div className="hidden md:block">Source</div>
                <div className="text-right pr-2">Duration</div>
                <div className="text-right pr-2">Actions</div>
              </div>

              <div className="divide-y divide-white/5">
                {activeTracks.map((song, idx) => {
                  const sId = String(song.id || song.songId);
                  const isTrackPlaying = isPlaying && String(currentSong?.id || currentSong?.songId) === sId;
                  const isTrackActive = String(currentSong?.id || currentSong?.songId) === sId;
                  const isFav = Boolean(
                    favorites.includes(sId) ||
                    (song.id && favorites.includes(String(song.id))) ||
                    (song.songId && favorites.includes(String(song.songId)))
                  );

                  return (
                    <div
                      key={`${sId}-${idx}`}
                      onClick={() => onPlaySong(song, activeTracks)}
                      className={`group relative grid grid-cols-[auto_1fr_auto] md:grid-cols-[auto_2fr_auto_auto_auto] items-center gap-3 sm:gap-4 px-4 py-2.5 transition-all duration-150 cursor-pointer ${
                        isTrackActive
                          ? 'bg-[var(--primary)]/15 border-l-2 border-[var(--primary)]'
                          : 'hover:bg-white/[0.04]'
                      }`}
                    >
                      {/* Index or Play icon */}
                      <div className="flex items-center gap-2.5 sm:gap-3 flex-shrink-0 w-16">
                        <div className="w-6 text-center text-xs font-mono tabular-nums text-[var(--text-light)]/70">
                          {isTrackPlaying ? (
                            <div className="flex items-end justify-center gap-[2px] h-3">
                              <span className="w-[2px] rounded-full bg-[var(--primary)] eq-bar-1" />
                              <span className="w-[2px] rounded-full bg-[var(--primary)] eq-bar-2" />
                              <span className="w-[2px] rounded-full bg-[var(--primary)] eq-bar-3" />
                            </div>
                          ) : (
                            <>
                              <span className="group-hover:hidden">{String(idx + 1).padStart(2, '0')}</span>
                              <Play className="w-3.5 h-3.5 text-white fill-white hidden group-hover:inline-block ml-0.5" />
                            </>
                          )}
                        </div>

                        {/* Artwork */}
                        <div className="relative w-10 h-10 rounded-lg overflow-hidden flex-shrink-0 bg-black/40 border border-white/10">
                          <img
                            src={mediaUrl(song.coverUrl, song)}
                            alt={song.title}
                            className="w-full h-full object-cover"
                            referrerPolicy="no-referrer"
                            onError={(e) => handleCoverImageError(e, song)}
                            loading="lazy"
                          />
                        </div>
                      </div>

                      {/* Title & Artist */}
                      <div className="min-w-0 pr-2">
                        <p
                          className={`text-sm font-semibold truncate transition-colors ${
                            isTrackActive ? 'text-[var(--primary)]' : 'text-white group-hover:text-[var(--primary)]'
                          }`}
                        >
                          {song.title}
                        </p>
                        <p className="text-xs text-[var(--text-light)] truncate mt-0.5">
                          {song.artist || song.singers || 'Unknown Artist'}
                        </p>
                      </div>

                      {/* Source */}
                      <div className="hidden md:block min-w-0 pr-2">
                        <span className="text-xs text-[var(--text-light)]/60 capitalize">
                          {song.source || 'Stream'}
                        </span>
                      </div>

                      {/* Duration */}
                      <div className="text-right text-xs font-mono tabular-nums text-[var(--text-light)]/70 pr-2">
                        {formatTime(song.duration)}
                      </div>

                      {/* Actions: Favorite & Remove */}
                      <div className="flex items-center justify-end gap-1 flex-shrink-0">
                        <LikeHeartButton
                          isFavorite={isFav}
                          onToggle={() => onToggleFavorite(song)}
                          size="md"
                          variant="icon"
                        />

                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            onRemoveSongFromPlaylist(currentActivePlaylist.id, sId);
                          }}
                          className="p-2 rounded-lg hover:bg-red-500/20 text-[var(--text-light)]/60 hover:text-red-400 transition-colors"
                          title="Remove from this playlist"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}
        </div>
      </div>
    );
  }

  // ─── PLAYLISTS GRID OVERVIEW ──────────────────────────────────────────────
  return (
    <div className="space-y-6">
      {/* Top Header */}
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
          onClick={() => setShowCreateModal(true)}
          className="px-4 py-2.5 rounded-xl bg-[var(--primary-dark)] hover:bg-[var(--primary)] text-[var(--bg)] text-xs sm:text-sm font-bold inline-flex items-center gap-2 transition-all glow-primary"
        >
          <Plus className="w-4 h-4" />
          <span>New Playlist</span>
        </button>
      </div>

      {isLoading ? (
        <div className="flex flex-col items-center justify-center py-20 gap-3">
          <Loader2 className="w-7 h-7 animate-spin text-[var(--primary)]" />
          <p className="text-xs text-[var(--text-light)]">Loading playlists...</p>
        </div>
      ) : playlists.length === 0 ? (
        <div className="text-center py-20 rounded-2xl glass-card p-6 border border-white/5 space-y-3">
          <ListMusic className="w-12 h-12 text-[var(--text-light)]/30 mx-auto mb-3" />
          <h3 className="text-base font-bold text-[var(--text)]">No playlists created yet</h3>
          <p className="text-xs text-[var(--text-light)] max-w-sm mx-auto mb-4">
            Organize your favorite tracks into personalized playlists for every mood and moment.
          </p>
          <button
            onClick={() => setShowCreateModal(true)}
            className="px-5 py-2.5 rounded-xl bg-[var(--primary-dark)] hover:bg-[var(--primary)] text-[var(--bg)] text-xs font-bold inline-flex items-center gap-2 transition-all glow-primary"
          >
            <Plus className="w-4 h-4" /> Create Your First Playlist
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-3 lg:grid-cols-4 gap-4">
          {playlists.map((pl) => {
            const tracks = Array.isArray(pl.tracks) ? pl.tracks : [];
            const trackCount = tracks.length > 0 ? tracks.length : (pl.trackCount || pl.songIds?.length || 0);
            const coverSong = tracks[0];
            const coverUrl =
              pl.coverUrl ||
              coverSong?.coverUrl ||
              'https://images.unsplash.com/photo-1514525253161-7a46d19cd819?w=600&q=80';

            return (
              <div
                key={pl.id}
                onClick={() => setActivePlaylist(pl)}
                className="group relative rounded-2xl overflow-hidden glass-card cursor-pointer transition-all duration-300 hover:border-[var(--primary)]/40 hover:shadow-xl flex flex-col"
              >
                {/* Artwork */}
                <div className="aspect-square bg-gradient-to-br from-[var(--primary)]/20 via-[var(--accent)]/10 to-[var(--primary-dark)]/10 relative overflow-hidden">
                  <img
                    src={mediaUrl(coverUrl, coverSong)}
                    alt={pl.name}
                    className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                    referrerPolicy="no-referrer"
                    onError={(e) => handleCoverImageError(e, coverSong)}
                    loading="lazy"
                  />
                  <div className="absolute inset-0 bg-gradient-to-t from-[var(--card-bg)] via-transparent to-transparent opacity-80" />

                  {/* Play Button Overlay */}
                  {tracks.length > 0 && (
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        onPlaySong(tracks[0], tracks);
                      }}
                      className="absolute bottom-3 right-3 w-10 h-10 rounded-full bg-[var(--primary)] text-[var(--bg)] flex items-center justify-center shadow-lg opacity-0 group-hover:opacity-100 transform translate-y-2 group-hover:translate-y-0 transition-all duration-200"
                      title="Play playlist"
                    >
                      <Play className="w-4 h-4 ml-0.5 fill-current" />
                    </button>
                  )}

                  {/* Delete Button */}
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      onDeletePlaylist(pl.id);
                    }}
                    className="absolute top-2 right-2 p-2 rounded-lg bg-black/60 text-white/80 hover:text-red-400 opacity-0 group-hover:opacity-100 transition-all duration-200"
                    title="Delete playlist"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </div>

                {/* Info */}
                <div className="p-4 flex-1 flex flex-col justify-between">
                  <div>
                    <h4 className="font-semibold truncate text-sm text-[var(--text)] group-hover:text-[var(--primary)] transition-colors">
                      {pl.name}
                    </h4>
                    <p className="text-xs text-[var(--text-light)] mt-0.5">
                      {trackCount} {trackCount === 1 ? 'track' : 'tracks'}
                    </p>
                  </div>
                  {pl.description && (
                    <p className="text-xs text-[var(--text-light)]/60 mt-1.5 truncate">{pl.description}</p>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* ─── CREATE PLAYLIST MODAL ────────────────────────────────────── */}
      {showCreateModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-black/70 backdrop-blur-sm" onClick={() => setShowCreateModal(false)} />
          <div className="relative w-full max-w-md glass-card rounded-2xl p-6 shadow-2xl space-y-4 border border-white/10">
            <div className="flex items-center justify-between">
              <h3 className="text-base font-bold text-[var(--text)] flex items-center gap-2">
                <ListMusic className="w-4 h-4 text-[var(--primary)]" />
                <span>Create New Playlist</span>
              </h3>
              <button
                onClick={() => setShowCreateModal(false)}
                className="p-1.5 rounded-lg hover:bg-white/10 text-[var(--text-light)] hover:text-white"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleCreateSubmit} className="space-y-3">
              <div>
                <label className="text-xs text-[var(--text-light)] block mb-1 font-medium">Playlist Name *</label>
                <input
                  value={newPlaylistName}
                  onChange={(e) => setNewPlaylistName(e.target.value)}
                  placeholder="e.g. My Chill Vibes"
                  required
                  autoFocus
                  className="w-full px-4 py-2.5 rounded-xl bg-[var(--bg)]/60 border border-white/10 text-sm text-[var(--text)] focus:border-[var(--primary)] focus:outline-none"
                />
              </div>

              <div>
                <label className="text-xs text-[var(--text-light)] block mb-1 font-medium">Description (Optional)</label>
                <input
                  value={newPlaylistDesc}
                  onChange={(e) => setNewPlaylistDesc(e.target.value)}
                  placeholder="e.g. Best of Azaad Chill & Lo-Fi"
                  className="w-full px-4 py-2.5 rounded-xl bg-[var(--bg)]/60 border border-white/10 text-sm text-[var(--text)] focus:border-[var(--primary)] focus:outline-none"
                />
              </div>

              <div className="flex gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setShowCreateModal(false)}
                  className="flex-1 py-2.5 rounded-xl border border-white/10 text-xs text-[var(--text-light)] hover:bg-white/5"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={!newPlaylistName.trim() || isCreating}
                  className="flex-1 py-2.5 rounded-xl bg-[var(--primary)] hover:bg-[var(--primary-dark)] text-[var(--bg)] text-xs font-bold glow-primary disabled:opacity-50 flex items-center justify-center gap-2"
                >
                  {isCreating ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Plus className="w-3.5 h-3.5" />}
                  <span>Create</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}

// ─── ADD TO PLAYLIST MODAL ──────────────────────────────────────────────────
export function AddToPlaylistModal({
  song,
  playlists = [],
  onClose,
  onAddSongToPlaylist,
  onCreateNewPlaylist,
}) {
  if (!song) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/70 backdrop-blur-sm" onClick={onClose} />
      <div className="relative w-full max-w-md glass-card rounded-2xl p-6 shadow-2xl space-y-4 border border-white/10">
        <div className="flex items-center justify-between">
          <h3 className="text-base font-bold text-[var(--text)] flex items-center gap-2">
            <ListMusic className="w-4 h-4 text-[var(--primary)]" />
            <span>Add to Playlist</span>
          </h3>
          <button onClick={onClose} className="p-1.5 rounded-lg hover:bg-white/10 text-[var(--text-light)] hover:text-white">
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Song preview */}
        <div className="flex items-center gap-3 p-2.5 rounded-xl bg-white/5 border border-white/10">
          <div className="w-11 h-11 rounded-lg overflow-hidden flex-shrink-0 bg-black/40 border border-white/10">
            <img
              src={mediaUrl(song.coverUrl, song)}
              alt={song.title}
              className="w-full h-full object-cover"
              referrerPolicy="no-referrer"
              onError={(e) => handleCoverImageError(e, song)}
            />
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-xs font-bold text-white truncate">{song.title}</p>
            <p className="text-[11px] text-[var(--text-light)] truncate mt-0.5">
              {song.artist || song.singers || 'Unknown Artist'}
            </p>
          </div>
        </div>

        {/* Playlists list */}
        <div className="max-h-60 overflow-y-auto space-y-2 pr-1">
          {playlists.length === 0 ? (
            <p className="text-xs text-center text-[var(--text-light)] py-4">No custom playlists created yet.</p>
          ) : (
            playlists.map((pl) => {
              const songId = String(song.id || song.songId);
              const alreadyIn =
                (pl.songIds || []).map(String).includes(songId) ||
                (pl.tracks || []).some((t) => String(t.id || t.songId) === songId);

              return (
                <button
                  key={pl.id}
                  onClick={() => onAddSongToPlaylist(pl.id, song)}
                  className={`w-full flex items-center justify-between p-3 rounded-xl text-left text-xs transition-colors ${
                    alreadyIn
                      ? 'bg-[var(--primary)]/10 text-[var(--primary)] font-semibold border border-[var(--primary)]/30'
                      : 'glass-card hover:bg-white/10 text-[var(--text)] border border-transparent'
                  }`}
                >
                  <div className="flex items-center gap-2 truncate">
                    <ListMusic className="w-3.5 h-3.5 flex-shrink-0 opacity-70" />
                    <span className="truncate">{pl.name}</span>
                    <span className="text-[10px] text-[var(--text-light)]/70">
                      ({pl.tracks?.length || pl.trackCount || pl.songIds?.length || 0})
                    </span>
                  </div>

                  {alreadyIn ? (
                    <span className="text-[10px] text-[var(--primary)] font-bold px-2 py-0.5 rounded-full bg-[var(--primary)]/20">
                      Added
                    </span>
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
            onClose();
            onCreateNewPlaylist();
          }}
          className="w-full py-2.5 rounded-xl border border-[var(--primary)]/30 text-[var(--primary)] hover:bg-[var(--primary)]/10 text-xs font-bold transition-colors flex items-center justify-center gap-1.5"
        >
          <Plus className="w-3.5 h-3.5" />
          <span>Create New Playlist</span>
        </button>
      </div>
    </div>
  );
}
