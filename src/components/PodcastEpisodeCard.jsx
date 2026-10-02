import React, { memo } from 'react';
import {
  Play,
  Pause,
  Clock,
  BookmarkSimple,
  Check,
  ShareNetwork,
  MicrophoneStage,
  Broadcast,
} from '@phosphor-icons/react';
import { EqualizerBars } from './SongCard';

/**
 * Format duration nicely into hours and minutes
 */
function formatDurationBadge(seconds) {
  if (!seconds || seconds <= 0) return '45 min';
  const hrs = Math.floor(seconds / 3600);
  const mins = Math.floor((seconds % 3600) / 60);
  if (hrs > 0) {
    return `${hrs}h ${mins > 0 ? `${mins}m` : ''}`.trim();
  }
  return `${mins}m`;
}

/**
 * High-fidelity, mobile-optimized, memoized card component for popular podcast episodes.
 */
function PodcastEpisodeCardComponent({
  episode,
  currentSong,
  isPlaying,
  onPlay,
  onOpenShow,
  isSubscribed = false,
  onToggleSubscribe,
  onShare,
  className = '',
}) {
  if (!episode) return null;

  const isCurrent = Boolean(
    (currentSong?.id && currentSong.id === episode.id) ||
    (currentSong?.videoId && episode.videoId && currentSong.videoId === episode.videoId)
  );
  const isPlayingThis = isCurrent && isPlaying;

  const showTitle = episode.showTitle || episode.artist || 'Podcast Show';
  const hostName = episode.host || episode.artist || 'Podcast Host';
  const releaseDate = episode.releaseDate || 'Recent';

  const handleShare = (e) => {
    e.stopPropagation();
    if (onShare) {
      onShare(episode);
    } else if (navigator.share) {
      navigator.share({
        title: episode.title,
        text: `Listen to "${episode.title}" on Azaad Music!`,
        url: window.location.href,
      }).catch(() => {});
    }
  };

  const handleSubscribe = (e) => {
    e.stopPropagation();
    if (onToggleSubscribe) {
      onToggleSubscribe(episode.showId || episode);
    }
  };

  return (
    <div
      onClick={() => onPlay?.(episode)}
      className={`group relative flex flex-col justify-between rounded-2xl p-3.5 sm:p-4 smooth-card cursor-pointer select-none border ${
        isCurrent
          ? 'bg-gradient-to-b from-[var(--primary)]/15 via-[#111822] to-[#0c1017] border-[var(--primary)]/50 shadow-[0_8px_24px_rgba(83,242,224,0.16)]'
          : 'bg-[#101620]/95 hover:bg-[#161e2b] border-white/10 hover:border-[var(--primary)]/30 shadow-md hover:-translate-y-0.5'
      } ${className}`}
    >
      <div>
        {/* Artwork Container */}
        <div className="relative aspect-video sm:aspect-[16/10] w-full rounded-xl overflow-hidden bg-black/50 mb-3 border border-white/5">
          <img
            src={episode.coverUrl || 'https://images.unsplash.com/photo-1589254065878-42c9da997008?w=800&auto=format&fit=crop&q=80'}
            alt={episode.title}
            decoding="async"
            loading="lazy"
            className="w-full h-full object-cover transition-transform duration-300 group-hover:scale-105"
            onError={(e) => {
              e.currentTarget.src = 'https://images.unsplash.com/photo-1478737270239-2f02b77fc618?w=800&auto=format&fit=crop&q=80';
            }}
          />

          {/* Top Badges */}
          <div className="absolute top-2 left-2 right-2 flex items-center justify-between gap-1 pointer-events-none">
            <span className="px-2 py-0.5 rounded-md text-[10px] font-extrabold uppercase tracking-wider bg-black/85 text-cyan-300 border border-cyan-400/25 shadow-sm truncate max-w-[65%]">
              {episode.category || 'Podcast'}
            </span>

            {episode.episodeNumber && (
              <span className="px-1.5 py-0.5 rounded-md text-[10px] font-mono font-bold bg-black/75 text-white/90 border border-white/15">
                EP {episode.episodeNumber}
              </span>
            )}
          </div>

          {/* Bottom Duration Badge */}
          <div className="absolute bottom-2 right-2 px-2 py-0.5 rounded-md text-[10px] font-mono font-bold bg-black/85 text-white/90 flex items-center gap-1 shadow-sm border border-white/10">
            <Clock size={12} weight="duotone" className="text-[var(--primary)]" />
            <span>{formatDurationBadge(episode.duration)}</span>
          </div>

          {/* Center Play Button Overlay */}
          <div
            className={`absolute inset-0 flex items-center justify-center bg-black/40 transition-opacity duration-200 ${
              isPlayingThis ? 'opacity-100' : 'opacity-0 sm:group-hover:opacity-100'
            }`}
          >
            <button
              type="button"
              className={`w-12 h-12 rounded-full flex items-center justify-center transition-transform active:scale-95 shadow-xl ${
                isPlayingThis
                  ? 'bg-[var(--primary)] text-black scale-100 ring-4 ring-[var(--primary)]/30'
                  : 'bg-[var(--primary)] text-black hover:scale-110'
              }`}
              aria-label={isPlayingThis ? 'Pause episode' : 'Play episode'}
            >
              {isPlayingThis ? (
                <Pause size={21} weight="fill" />
              ) : (
                <Play size={21} weight="fill" className="ml-0.5" />
              )}
            </button>
          </div>

          {/* Equalizer animation when playing */}
          {isPlayingThis && (
            <div className="absolute bottom-2 left-2 flex items-end gap-0.5 px-2 py-1 rounded-md bg-black/85 border border-[var(--primary)]/30">
              <EqualizerBars color="var(--primary)" barCount={3} className="h-3" />
            </div>
          )}
        </div>

        {/* Series & Host Header */}
        <div className="flex items-center justify-between gap-2 text-xs mb-1.5">
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              if (onOpenShow) onOpenShow(episode.showId);
            }}
            className="font-bold text-[var(--primary)] hover:underline truncate max-w-[70%] text-left flex items-center gap-1.5 group/show"
            title={`View ${showTitle}`}
          >
            <Broadcast size={13} weight="duotone" className="flex-shrink-0" />
            <span className="truncate">{showTitle}</span>
          </button>

          <span className="text-[11px] font-mono text-[var(--text-light)]/70 flex-shrink-0 font-medium">
            {releaseDate}
          </span>
        </div>

        {/* Episode Title */}
        <h3 className="text-sm sm:text-base font-bold text-white group-hover:text-[var(--primary)] transition-colors line-clamp-2 leading-snug">
          {episode.title}
        </h3>

        {/* Host / Guest info */}
        <div className="flex items-center gap-1.5 text-xs text-[var(--text-light)] mt-1 truncate">
          <MicrophoneStage size={13} weight="duotone" className="text-[var(--text-light)]/70 flex-shrink-0" />
          <span className="truncate">{hostName}</span>
          {episode.guest && (
            <>
              <span className="text-white/40">•</span>
              <span className="text-white/90 truncate">ft. {episode.guest}</span>
            </>
          )}
        </div>

        {/* Snippet / Description */}
        {episode.description && (
          <p className="text-xs text-[var(--text-light)]/75 mt-2 line-clamp-2 leading-relaxed">
            {episode.description}
          </p>
        )}
      </div>

      {/* Action Footer Bar (Thumb-Friendly) */}
      <div className="mt-3.5 pt-3 border-t border-white/5 flex items-center justify-between gap-2">
        <button
          type="button"
          onClick={handleSubscribe}
          className={`min-h-[36px] sm:min-h-[32px] px-3 py-1.5 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 active:scale-95 ${
            isSubscribed
              ? 'bg-emerald-500/15 border border-emerald-500/30 text-emerald-300 hover:bg-emerald-500/25'
              : 'bg-white/5 hover:bg-white/10 border border-white/10 text-white/85 hover:text-white'
          }`}
          title={isSubscribed ? 'Subscribed to show' : 'Subscribe to show'}
        >
          {isSubscribed ? (
            <>
              <Check size={14} weight="bold" className="text-emerald-400" />
              <span>Subscribed</span>
            </>
          ) : (
            <>
              <BookmarkSimple size={14} weight="duotone" className="text-[var(--primary)]" />
              <span>Subscribe</span>
            </>
          )}
        </button>

        {/* Right Action Icons */}
        <div className="flex items-center gap-1.5">
          <button
            type="button"
            onClick={handleShare}
            className="w-9 h-9 sm:w-8 sm:h-8 rounded-xl bg-white/5 hover:bg-white/10 border border-white/5 text-[var(--text-light)] hover:text-white flex items-center justify-center transition-all active:scale-90"
            title="Share Episode"
            aria-label="Share episode"
          >
            <ShareNetwork size={15} weight="duotone" />
          </button>

          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              onPlay?.(episode);
            }}
            className={`min-h-[36px] sm:min-h-[32px] px-3 py-1.5 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 active:scale-95 ${
              isPlayingThis
                ? 'bg-[var(--primary)] text-black shadow-md shadow-[var(--primary)]/25'
                : 'bg-white/10 hover:bg-[var(--primary)] text-white hover:text-black'
            }`}
          >
            {isPlayingThis ? (
              <>
                <Pause size={13} weight="fill" />
                <span>Playing</span>
              </>
            ) : (
              <>
                <Play size={13} weight="fill" className="ml-0.5" />
                <span>Play</span>
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );
}

export default memo(PodcastEpisodeCardComponent);
