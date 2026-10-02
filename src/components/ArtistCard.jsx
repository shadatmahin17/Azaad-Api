import React, { memo } from 'react';
import { MicrophoneStage, MusicNotes, SealCheck } from '@phosphor-icons/react';
import { mediaUrl, handleCoverImageError } from '../utils/musicUtils';

function ArtistCardComponent({ artist, songCount, coverUrl, isActive, onClick }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`flex flex-col items-center gap-3 p-4 rounded-2xl smooth-card group cursor-pointer ${
        isActive
          ? 'glass-card border-[var(--primary)]/40 glow-primary ring-1 ring-[var(--primary)]/25'
          : 'bg-[#121822]/75 hover:bg-[#182130]/95 border border-white/[0.06] hover:border-[var(--primary)]/25 hover:-translate-y-0.5'
      }`}
    >
      <div
        className={`relative w-20 h-20 rounded-full overflow-hidden border-2 transition-colors ${
          isActive
            ? 'border-[var(--primary)] shadow-[0_0_16px_rgba(83,242,224,0.35)]'
            : 'border-white/10 group-hover:border-[var(--primary)]/45'
        }`}
      >
        {coverUrl ? (
          <img
            src={mediaUrl(coverUrl, { artist })}
            alt={artist}
            decoding="async"
            loading="lazy"
            className="w-full h-full object-cover transition-transform duration-300 group-hover:scale-105"
            referrerPolicy="no-referrer"
            onError={(e) => handleCoverImageError(e, { artist })}
          />
        ) : (
          <div className="w-full h-full bg-gradient-to-br from-[var(--primary-dark)]/30 to-[var(--accent)]/30 flex items-center justify-center">
            <MicrophoneStage size={30} weight="duotone" className="text-[var(--primary)]/75" />
          </div>
        )}
        {isActive && (
          <div className="absolute inset-0 bg-black/45 flex items-center justify-center">
            <MusicNotes size={22} weight="fill" className="text-[var(--primary)]" />
          </div>
        )}
      </div>
      <div className="text-center min-w-0 w-full">
        <p className={`text-sm font-bold truncate flex items-center justify-center gap-1 ${isActive ? 'text-[var(--primary)]' : 'text-[var(--text)] group-hover:text-[var(--primary)]'}`}>
          <span className="truncate">{artist}</span>
          <SealCheck size={13} weight="fill" className="text-[var(--primary)] flex-shrink-0 opacity-85" />
        </p>
        <p className="text-[11px] font-mono text-[var(--text-light)] mt-0.5">
          {songCount} {songCount === 1 ? 'track' : 'tracks'}
        </p>
      </div>
    </button>
  );
}

export default memo(ArtistCardComponent);
