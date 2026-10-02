import React, { useState, memo } from 'react';
import {
  Play,
  Pause,
  Heart,
  Playlist,
  PencilSimple,
  Trash,
  Fire,
  Crown,
  Medal,
  Headphones,
  MusicNotes,
} from '@phosphor-icons/react';
import { mediaUrl, handleCoverImageError, formatTime, formatNumber } from '../utils/musicUtils';

// ─── Animated Like Button with Heart-Pulsing & Expanding Burst ───────────────
export const LikeHeartButton = memo(function LikeHeartButton({
  isFavorite,
  onToggle,
  size = 'md', // 'sm' | 'md' | 'lg'
  variant = 'circle', // 'circle' | 'icon' | 'badge'
  className = '',
}) {
  const [isPulsing, setIsPulsing] = useState(false);

  const handleClick = (e) => {
    e.stopPropagation();
    setIsPulsing(true);
    setTimeout(() => setIsPulsing(false), 500);
    onToggle();
  };

  const iconSizes = {
    sm: 15,
    md: 18,
    lg: 21,
  };

  return (
    <button
      type="button"
      onClick={handleClick}
      aria-label={isFavorite ? 'Remove from favorites' : 'Add to favorites'}
      title={isFavorite ? 'Liked • Saved to your library' : 'Like this song'}
      className={`relative flex items-center justify-center transition-transform duration-150 active:scale-75 hover:scale-108 select-none cursor-pointer ${
        variant === 'circle'
          ? `rounded-full ${
              isFavorite
                ? 'bg-rose-500/25 text-rose-400 border border-rose-500/60 shadow-[0_0_14px_rgba(244,63,94,0.4)] ring-1 ring-rose-500/30'
                : 'bg-black/75 text-white/85 hover:text-rose-400 border border-white/15 hover:bg-black/90'
            } p-2`
          : variant === 'badge'
          ? `rounded-xl px-2.5 py-1.5 gap-1.5 border text-xs font-semibold ${
              isFavorite
                ? 'bg-rose-500/20 text-rose-400 border-rose-500/40 shadow-[0_0_12px_rgba(244,63,94,0.3)]'
                : 'bg-white/5 text-[var(--text-light)] hover:text-rose-400 border-white/10 hover:bg-white/10'
            }`
          : `p-2 rounded-xl ${
              isFavorite
                ? 'text-rose-400 bg-rose-500/15 ring-1 ring-rose-500/30 shadow-sm'
                : 'text-[var(--text-light)]/80 hover:text-rose-400 hover:bg-white/10'
            }`
      } ${className}`}
    >
      {/* Subtle expanding ripple burst on like toggle */}
      {isPulsing && (
        <span className="absolute inset-0 rounded-full border-2 border-rose-500 pointer-events-none animate-ping" />
      )}

      {/* Pulsing heart icon */}
      <span className={`flex items-center justify-center transition-transform duration-200 ${isPulsing ? 'scale-125' : 'scale-100'}`}>
        <Heart
          size={iconSizes[size] || 18}
          weight={isFavorite ? 'fill' : 'duotone'}
          className={`transition-colors duration-200 ${
            isFavorite
              ? 'text-rose-500 drop-shadow-[0_0_8px_rgba(244,63,94,0.65)]'
              : 'text-current'
          }`}
        />
      </span>
    </button>
  );
});

// ─── Play Song Animation (GPU-Composited Equalizer) ──────────────────────────
export const EqualizerBars = memo(function EqualizerBars({ color = 'var(--primary)', barCount = 4, className = 'h-3.5' }) {
  return (
    <div className={`flex items-end gap-[2px] ${className}`}>
      <span className="w-[2.5px] rounded-full eq-bar-1" style={{ backgroundColor: color }} />
      <span className="w-[2.5px] rounded-full eq-bar-2" style={{ backgroundColor: color }} />
      <span className="w-[2.5px] rounded-full eq-bar-3" style={{ backgroundColor: color }} />
      {barCount >= 4 && <span className="w-[2.5px] rounded-full eq-bar-4" style={{ backgroundColor: color }} />}
    </div>
  );
});

// ─── Main SongCard Component (Memoized & GPU-Accelerated for Smooth Scroll) ──
function SongCardComponent({
  song,
  index,
  isCurrent,
  isPlaying,
  onPlay,
  onEdit,
  onDelete,
  onAddToPlaylist,
  isFavorite,
  onToggleFavorite,
  viewMode = 'grid', // 'grid' | 'list' | 'compact' | 'ranked'
}) {
  const isThisSongActive = isCurrent;

  // ─── 1. COMPACT MODE (Quick Picks / Jump Back In shelves) ──────────────────
  if (viewMode === 'compact') {
    return (
      <div
        onClick={() => onPlay(song)}
        className={`group relative flex items-center gap-3 p-2.5 rounded-2xl smooth-card cursor-pointer overflow-hidden ${
          isThisSongActive
            ? 'bg-gradient-to-r from-[var(--primary)]/15 via-[var(--card-bg)] to-[var(--card-bg)] border border-[var(--primary)]/50 shadow-[0_4px_20px_rgba(83,242,224,0.16)] ring-1 ring-[var(--primary)]/30'
            : 'bg-[#121822]/90 hover:bg-[#192230]/95 border border-white/[0.06] hover:border-[var(--primary)]/25'
        }`}
      >
        {/* Cover with hover play or equalizer */}
        <div className="relative w-12 h-12 rounded-xl overflow-hidden flex-shrink-0 bg-black/50 border border-white/10 shadow-sm">
          <img
            src={mediaUrl(song.coverUrl, song)}
            alt={song.title}
            decoding="async"
            loading="lazy"
            className={`w-full h-full object-cover transition-transform duration-300 ${
              isThisSongActive && isPlaying ? 'scale-105' : 'group-hover:scale-105'
            }`}
            referrerPolicy="no-referrer"
            onError={(e) => handleCoverImageError(e, song)}
          />
          {isThisSongActive && isPlaying ? (
            <div className="absolute inset-0 bg-black/60 flex items-center justify-center">
              <EqualizerBars color="var(--primary)" barCount={3} className="h-3.5" />
            </div>
          ) : (
            <div className="absolute inset-0 bg-black/45 opacity-0 group-hover:opacity-100 flex items-center justify-center transition-opacity">
              <div className="w-7 h-7 rounded-full bg-[var(--primary)] text-[var(--bg)] flex items-center justify-center shadow-md">
                <Play size={14} weight="fill" className="ml-0.5" />
              </div>
            </div>
          )}
        </div>

        {/* Track Title and Artist */}
        <div className="min-w-0 flex-1">
          <h4
            className={`text-xs sm:text-sm font-semibold truncate transition-colors ${
              isThisSongActive ? 'text-[var(--primary)] font-bold' : 'text-[var(--text)] group-hover:text-[var(--primary)]'
            }`}
          >
            {song.title}
          </h4>
          <p className="text-[11px] text-[var(--text-light)] truncate mt-0.5 flex items-center gap-1.5">
            <span className="truncate">{song.singers || song.artist || 'Unknown Artist'}</span>
            {song.duration > 0 && (
              <span className="font-mono text-[10px] opacity-60 flex-shrink-0">· {formatTime(song.duration)}</span>
            )}
          </p>
        </div>

        {/* Quick action buttons */}
        <div className="flex items-center gap-1 flex-shrink-0">
          {onAddToPlaylist && (
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                onAddToPlaylist(song);
              }}
              className="p-1.5 rounded-xl opacity-0 group-hover:opacity-100 hover:bg-white/10 text-[var(--text-light)] hover:text-[var(--primary)] transition-all"
              title="Add to playlist"
            >
              <Playlist size={16} weight="duotone" />
            </button>
          )}
          <LikeHeartButton
            isFavorite={isFavorite}
            onToggle={() => onToggleFavorite(song)}
            size="sm"
            variant="icon"
          />
        </div>
      </div>
    );
  }

  // ─── 2. RANKED MODE (Top Charts / Hot Tracks shelf) ────────────────────────
  if (viewMode === 'ranked') {
    const rankNumber = typeof index === 'number' ? String(index + 1).padStart(2, '0') : null;

    return (
      <div
        onClick={() => onPlay(song)}
        className={`group relative flex items-center gap-3.5 p-3.5 rounded-2xl smooth-card cursor-pointer overflow-hidden ${
          isThisSongActive
            ? 'bg-gradient-to-r from-[var(--primary)]/15 via-[var(--card-bg)] to-[var(--card-bg)] border border-[var(--primary)]/55 shadow-[0_6px_24px_rgba(83,242,224,0.16)] ring-1 ring-[var(--primary)]/30'
            : 'bg-[#121822]/90 hover:bg-[#192230]/95 border border-white/[0.07] hover:border-[var(--primary)]/30'
        }`}
      >
        {/* Editorial Rank Badge */}
        {rankNumber && (
          <div className="w-9 flex-shrink-0 flex flex-col items-center justify-center">
            {index === 0 ? (
              <Crown size={14} weight="fill" className="text-amber-400 mb-0.5 drop-shadow-[0_0_6px_rgba(251,191,36,0.6)]" />
            ) : index === 1 || index === 2 ? (
              <Medal size={13} weight="fill" className={index === 1 ? 'text-slate-300 mb-0.5' : 'text-amber-600 mb-0.5'} />
            ) : null}
            <span
              className={`text-lg sm:text-xl font-black font-mono tabular-nums tracking-tighter leading-none ${
                index === 0
                  ? 'text-amber-400 drop-shadow-[0_0_8px_rgba(251,191,36,0.5)]'
                  : index === 1
                  ? 'text-slate-200'
                  : index === 2
                  ? 'text-amber-500'
                  : 'text-white/35 group-hover:text-[var(--primary)]'
              }`}
            >
              {rankNumber}
            </span>
          </div>
        )}

        {/* Thumbnail with overlay */}
        <div className="relative w-14 h-14 rounded-xl overflow-hidden flex-shrink-0 bg-black/50 border border-white/10 shadow-md">
          <img
            src={mediaUrl(song.coverUrl, song)}
            alt={song.title}
            decoding="async"
            loading="lazy"
            className="w-full h-full object-cover transition-transform duration-300 group-hover:scale-105"
            referrerPolicy="no-referrer"
            onError={(e) => handleCoverImageError(e, song)}
          />
          {isThisSongActive && isPlaying ? (
            <div className="absolute inset-0 bg-black/60 flex items-center justify-center">
              <EqualizerBars color="var(--primary)" barCount={3} className="h-3.5" />
            </div>
          ) : (
            <div className="absolute inset-0 bg-black/45 opacity-0 group-hover:opacity-100 flex items-center justify-center transition-opacity">
              <div className="w-8 h-8 rounded-full bg-[var(--primary)] text-[var(--bg)] flex items-center justify-center shadow-lg">
                <Play size={16} weight="fill" className="ml-0.5" />
              </div>
            </div>
          )}
        </div>

        {/* Title, Artist, & Metadata */}
        <div className="min-w-0 flex-1">
          <h4
            className={`text-sm font-bold truncate transition-colors ${
              isThisSongActive ? 'text-[var(--primary)]' : 'text-white group-hover:text-[var(--primary)]'
            }`}
          >
            {song.title}
          </h4>
          <p className="text-xs text-[var(--text-light)] truncate mt-0.5">
            {song.singers || song.artist}
          </p>
          <div className="flex items-center gap-2 text-[11px] text-[var(--text-light)]/70 mt-1">
            <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded-md bg-white/[0.04] border border-white/[0.06] text-[10px] font-medium">
              <MusicNotes size={11} weight="duotone" className="text-[var(--primary)]" />
              {song.genre || song.category || 'Pop'}
            </span>
            {song.duration > 0 && (
              <span className="font-mono tabular-nums text-[10px]">{formatTime(song.duration)}</span>
            )}
            {song.playCount > 0 && (
              <span className="inline-flex items-center gap-1 text-amber-400/95 font-medium">
                <Fire size={12} weight="fill" className="text-amber-400" />
                <span className="font-mono tabular-nums text-[10px]">{formatNumber(song.playCount)}</span>
              </span>
            )}
          </div>
        </div>

        {/* Action icons */}
        <div className="flex items-center gap-1.5 flex-shrink-0">
          <LikeHeartButton
            isFavorite={isFavorite}
            onToggle={() => onToggleFavorite(song)}
            size="md"
            variant="icon"
          />
          {onAddToPlaylist && (
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                onAddToPlaylist(song);
              }}
              className="p-2 rounded-xl hover:bg-white/10 text-[var(--text-light)] hover:text-[var(--primary)] transition-colors"
              title="Add to playlist"
            >
              <Playlist size={18} weight="duotone" />
            </button>
          )}
        </div>
      </div>
    );
  }

  // ─── 3. TABULAR LIST MODE (Tracklist Table) ────────────────────────────────
  if (viewMode === 'list') {
    const trackIndex = typeof index === 'number' ? String(index + 1).padStart(2, '0') : null;

    return (
      <div
        onClick={() => onPlay(song)}
        className={`group relative grid grid-cols-[auto_1fr_auto] md:grid-cols-[auto_2fr_1fr_auto_auto] items-center gap-3 sm:gap-4 px-3.5 sm:px-4 py-2.5 rounded-xl transition-colors duration-150 cursor-pointer ${
          isThisSongActive
            ? 'bg-[var(--primary)]/12 border border-[var(--primary)]/40 shadow-sm ring-1 ring-[var(--primary)]/20'
            : 'hover:bg-white/[0.045] border border-transparent'
        }`}
      >
        {/* Col 1: Index Number or Live Play Button / Equalizer */}
        <div className="flex items-center gap-2.5 sm:gap-3 flex-shrink-0">
          <div className="w-6 text-center text-xs font-mono tabular-nums text-[var(--text-light)]/60 flex items-center justify-center">
            {isThisSongActive && isPlaying ? (
              <EqualizerBars color="var(--primary)" barCount={3} className="h-3" />
            ) : isThisSongActive && !isPlaying ? (
              <span className="w-2 h-2 rounded-full bg-[var(--primary)]" />
            ) : (
              <>
                <span className="group-hover:hidden">{trackIndex || '•'}</span>
                <Play size={15} weight="fill" className="text-[var(--primary)] hidden group-hover:block ml-0.5" />
              </>
            )}
          </div>

          {/* Album Cover Thumbnail */}
          <div className="relative w-10 h-10 rounded-lg overflow-hidden flex-shrink-0 bg-black/50 border border-white/10">
            <img
              src={mediaUrl(song.coverUrl, song)}
              alt={song.title}
              decoding="async"
              loading="lazy"
              className="w-full h-full object-cover"
              referrerPolicy="no-referrer"
              onError={(e) => handleCoverImageError(e, song)}
            />
          </div>
        </div>

        {/* Col 2: Title and Artist */}
        <div className="min-w-0 pr-2">
          <p
            className={`text-sm font-semibold truncate transition-colors ${
              isThisSongActive ? 'text-[var(--primary)] font-bold' : 'text-white group-hover:text-[var(--primary)]'
            }`}
          >
            {song.title}
          </p>
          <p className="text-xs text-[var(--text-light)] truncate mt-0.5">
            {song.singers || song.artist || 'Unknown Artist'}
          </p>
        </div>

        {/* Col 3: Genre / Category (Desktop) */}
        <div className="hidden md:block min-w-0 pr-2">
          <span className="inline-flex items-center gap-1.5 text-xs text-[var(--text-light)]/80 truncate">
            <MusicNotes size={13} weight="duotone" className="text-[var(--primary)]/80 flex-shrink-0" />
            <span className="truncate">{song.genre || song.category || 'General'}</span>
          </span>
        </div>

        {/* Col 4: Duration (Tabular) */}
        <div className="text-right text-xs font-mono tabular-nums text-[var(--text-light)]/75 pr-2 hidden sm:block">
          {song.duration > 0 ? formatTime(song.duration) : '--:--'}
        </div>

        {/* Col 5: Actions (Heart, Playlist, Edit/Delete) */}
        <div className="flex items-center justify-end gap-1.5 flex-shrink-0">
          <LikeHeartButton
            isFavorite={isFavorite}
            onToggle={() => onToggleFavorite(song)}
            size="md"
            variant="icon"
          />

          {onAddToPlaylist && (
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                onAddToPlaylist(song);
              }}
              className="p-2 rounded-xl hover:bg-white/10 text-[var(--text-light)]/80 hover:text-[var(--primary)] transition-colors"
              title="Add to playlist"
            >
              <Playlist size={18} weight="duotone" />
            </button>
          )}

          {song.source === 'local' && onEdit && (
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                onEdit(song);
              }}
              className="p-2 rounded-xl hover:bg-white/10 text-[var(--text-light)]/80 hover:text-white transition-colors"
              title="Edit song"
            >
              <PencilSimple size={16} weight="duotone" />
            </button>
          )}

          {song.source === 'local' && onDelete && (
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                onDelete(song.id);
              }}
              className="p-2 rounded-xl hover:bg-rose-500/15 text-[var(--text-light)]/80 hover:text-rose-400 transition-colors"
              title="Delete song"
            >
              <Trash size={16} weight="duotone" />
            </button>
          )}
        </div>
      </div>
    );
  }

  // ─── 4. STANDARD GRID MODE (Pro Studio Card, GPU-Accelerated) ───────────────
  return (
    <div
      onClick={() => onPlay(song)}
      className={`group relative flex flex-col rounded-2xl overflow-hidden glass-card smooth-card hover:-translate-y-1 hover:shadow-[0_14px_32px_rgba(0,0,0,0.55)] cursor-pointer ${
        isThisSongActive
          ? 'border-[var(--primary)]/60 shadow-[0_0_24px_rgba(83,242,224,0.2)] ring-1 ring-[var(--primary)]/40 bg-[var(--card-bg)]'
          : 'hover:border-[var(--primary)]/30 border-white/[0.07]'
      }`}
    >
      {/* Active Top Accent Line */}
      {isThisSongActive && (
        <div className="absolute top-0 left-0 right-0 h-[2px] bg-gradient-to-r from-[var(--primary)] via-white to-[var(--primary)] z-30 pointer-events-none" />
      )}

      {/* Cover Image Container */}
      <div className="relative aspect-square w-full overflow-hidden bg-black/50">
        <img
          src={mediaUrl(song.coverUrl, song)}
          alt={song.title}
          decoding="async"
          loading="lazy"
          className={`w-full h-full object-cover transition-transform duration-300 ${
            isThisSongActive && isPlaying ? 'scale-105' : 'group-hover:scale-105'
          }`}
          referrerPolicy="no-referrer"
          onError={(e) => handleCoverImageError(e, song)}
        />

        {/* Ambient Contrast Scrim */}
        <div className="absolute inset-0 bg-gradient-to-t from-black/85 via-black/15 to-transparent opacity-65 group-hover:opacity-80 transition-opacity duration-200 pointer-events-none" />

        {/* Playing Status Pill (Top-Left, only visible when active) */}
        {isThisSongActive && (
          <div
            className={`absolute top-2.5 left-2.5 z-20 px-2.5 py-1 rounded-lg text-[10px] font-bold tracking-wider flex items-center gap-1.5 shadow-lg ${
              isPlaying
                ? 'bg-[var(--primary)] text-[var(--bg)]'
                : 'bg-black/85 text-white border border-white/20'
            }`}
          >
            {isPlaying ? (
              <>
                <EqualizerBars color="var(--bg)" barCount={3} className="h-2.5" />
                <span>Playing</span>
              </>
            ) : (
              <span>Paused</span>
            )}
          </div>
        )}

        {/* Center Hover Play Button */}
        <button
          type="button"
          onClick={(e) => {
            e.stopPropagation();
            onPlay(song);
          }}
          className={`absolute inset-0 m-auto w-12 h-12 rounded-full bg-[var(--primary)] text-[var(--bg)] flex items-center justify-center shadow-[0_6px_24px_rgba(83,242,224,0.45)] transition-all duration-200 hover:scale-108 active:scale-95 z-20 ${
            isThisSongActive
              ? 'opacity-100 scale-100 ring-4 ring-[var(--primary)]/30'
              : 'opacity-0 group-hover:opacity-100 scale-90 group-hover:scale-100'
          }`}
          title={isThisSongActive && isPlaying ? 'Pause' : 'Play song'}
          aria-label={isThisSongActive && isPlaying ? 'Pause song' : 'Play song'}
        >
          {isThisSongActive && isPlaying ? (
            <Pause size={22} weight="fill" />
          ) : (
            <Play size={22} weight="fill" className="ml-0.5" />
          )}
        </button>

        {/* Quick Like Button (Bottom-Left) */}
        <div className="absolute bottom-2.5 left-2.5 z-20">
          <LikeHeartButton
            isFavorite={isFavorite}
            onToggle={() => onToggleFavorite(song)}
            size="sm"
            variant="circle"
          />
        </div>

        {/* Duration Badge (Bottom-Right) */}
        {song.duration > 0 && (
          <div className="absolute bottom-2.5 right-2.5 px-2 py-0.5 rounded-lg bg-black/80 text-[10px] font-mono tabular-nums text-white/95 z-10 border border-white/15">
            {formatTime(song.duration)}
          </div>
        )}
      </div>

      {/* Card Info Section */}
      <div className="p-3.5 flex flex-col justify-between flex-1">
        <div>
          <h4
            className={`font-bold truncate text-sm transition-colors ${
              isThisSongActive ? 'text-[var(--primary)]' : 'text-white group-hover:text-[var(--primary)]'
            }`}
            title={song.title}
          >
            {song.title}
          </h4>
          <p
            className="text-xs text-[var(--text-light)] truncate mt-0.5"
            title={song.singers || song.artist}
          >
            {song.singers || song.artist || 'Unknown Artist'}
          </p>
        </div>

        {/* Card Footer: Metadata & Actions */}
        <div className="flex items-center justify-between mt-3 pt-2.5 border-t border-white/[0.06] text-xs text-[var(--text-light)]/75">
          <div className="flex items-center gap-1.5 min-w-0 pr-2">
            <MusicNotes size={13} weight="duotone" className="text-[var(--primary)] flex-shrink-0" />
            <span className="truncate text-[11px] font-medium">
              {song.genre || song.category || 'Music'}
            </span>
            {song.playCount > 0 && (
              <>
                <span aria-hidden="true">·</span>
                <span className="font-mono tabular-nums text-[10px] inline-flex items-center gap-0.5 text-amber-300/90 flex-shrink-0">
                  <Headphones size={11} weight="duotone" />
                  {formatNumber(song.playCount)}
                </span>
              </>
            )}
          </div>

          <div className="flex items-center gap-1 flex-shrink-0">
            {onAddToPlaylist && (
              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  onAddToPlaylist(song);
                }}
                className="p-1.5 rounded-xl hover:bg-white/10 text-[var(--text-light)] hover:text-[var(--primary)] transition-colors"
                title="Add to playlist"
                aria-label="Add to playlist"
              >
                <Playlist size={16} weight="duotone" />
              </button>
            )}

            {song.source === 'local' && onEdit && (
              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  onEdit(song);
                }}
                className="p-1.5 rounded-xl hover:bg-white/10 text-[var(--text-light)] hover:text-white transition-colors"
                title="Edit"
              >
                <PencilSimple size={15} weight="duotone" />
              </button>
            )}

            {song.source === 'local' && onDelete && (
              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  onDelete(song.id);
                }}
                className="p-1.5 rounded-xl hover:bg-rose-500/15 text-[var(--text-light)] hover:text-rose-400 transition-colors"
                title="Delete"
              >
                <Trash size={15} weight="duotone" />
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

const SongCard = memo(SongCardComponent, (prev, next) => {
  return (
    prev.song?.id === next.song?.id &&
    prev.isCurrent === next.isCurrent &&
    prev.isPlaying === next.isPlaying &&
    prev.isFavorite === next.isFavorite &&
    prev.viewMode === next.viewMode &&
    prev.index === next.index
  );
});

export default SongCard;
