import React from 'react';
import { APP_LOGO_URL } from '../config/env';
import {
  CaretLeft,
  CaretRight,
  Broadcast,
  Check,
  Waveform,
  MusicNotes,
  Headphones,
  Sparkle,
  Guitar,
  SpeakerHigh,
} from '@phosphor-icons/react';

const GENRE_ICONS = {
  Electronic: Waveform,
  Pop: Sparkle,
  'Hip-Hop/Rap': Headphones,
  Rock: Guitar,
  Ambient: MusicNotes,
  Dance: SpeakerHigh,
};

export default function Sidebar({
  sidebarOpen,
  setSidebarOpen,
  navItems = [],
  view,
  setView,
  isPlaying,
  favorites = [],
  selectedGenre,
  setSelectedGenre,
  onResetArtistAndPlaylist,
}) {
  return (
    <aside
      className={`hidden md:flex sidebar-slide ${
        sidebarOpen ? 'sidebar-expanded' : 'sidebar-collapsed'
      } sticky top-0 z-40 h-screen flex-col bg-[var(--sidebar-bg)]/95 backdrop-blur-2xl border-r border-white/[0.08]`}
    >
      {sidebarOpen ? (
        <div className="pt-5 pb-4 px-4 flex items-center justify-between">
          <img
            src={APP_LOGO_URL}
            alt="Azaad Music"
            className="w-10 h-10 object-contain flex-shrink-0"
          />
          <button
            type="button"
            onClick={() => setSidebarOpen(false)}
            title="Collapse sidebar"
            aria-label="Collapse sidebar"
            className="p-1.5 rounded-xl text-[var(--text-light)] hover:text-[var(--primary)] hover:bg-white/5 transition-colors"
          >
            <CaretLeft size={16} weight="bold" />
          </button>
        </div>
      ) : (
        <div className="pt-5 pb-4 flex flex-col items-center gap-2">
          <img
            src={APP_LOGO_URL}
            alt="Azaad Music"
            className="w-9 h-9 object-contain flex-shrink-0"
          />
          <button
            type="button"
            onClick={() => setSidebarOpen(true)}
            title="Expand sidebar"
            aria-label="Expand sidebar"
            className="p-1.5 rounded-xl text-[var(--text-light)] hover:text-[var(--primary)] hover:bg-white/5 transition-colors"
          >
            <CaretRight size={16} weight="bold" />
          </button>
        </div>
      )}

      <nav className="flex-1 px-2.5 lg:px-3 mt-2 overflow-y-auto scrollbar-none">
        <p className="sidebar-section-label text-[10px] font-bold uppercase tracking-[0.18em] text-[var(--text-light)]/50 px-3 mb-2">
          Studio Navigation
        </p>
        {navItems.map(({ id, label, icon: Icon }) => {
          const isActive = view === id;
          return (
            <button
              key={id}
              type="button"
              onClick={() => {
                setView(id);
                onResetArtistAndPlaylist?.(id);
              }}
              title={label}
              className={`sidebar-nav-btn w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm transition-all mb-1 cursor-pointer ${
                isActive
                  ? 'bg-gradient-to-r from-[var(--primary)]/20 to-[var(--primary)]/5 text-[var(--primary)] font-bold border border-[var(--primary)]/30 shadow-[0_4px_16px_rgba(83,242,224,0.12)]'
                  : 'text-[var(--text-light)] hover:text-[var(--text)] hover:bg-white/[0.04]'
              }`}
            >
              <Icon
                size={19}
                weight={isActive ? 'fill' : 'duotone'}
                className={`flex-shrink-0 transition-transform ${
                  id === 'player' && isPlaying ? 'text-[var(--primary)] animate-spin-slow' : ''
                }`}
              />
              <span className="sidebar-label truncate">{label}</span>
              {id === 'player' && isPlaying && (
                <span className="sidebar-label ml-auto flex items-end gap-[2px] px-1.5 py-0.5">
                  <span className="w-[2px] h-3 bg-[var(--primary)] eq-bar-1 rounded-full" />
                  <span className="w-[2px] h-3 bg-[var(--primary)] eq-bar-2 rounded-full" />
                  <span className="w-[2px] h-3 bg-[var(--primary)] eq-bar-3 rounded-full" />
                </span>
              )}
              {id === 'favorites' && favorites.length > 0 && (
                <span className="sidebar-label ml-auto text-[10px] font-mono bg-rose-500/20 text-rose-300 border border-rose-500/30 px-1.5 py-0.5 rounded-full font-bold">
                  {favorites.length}
                </span>
              )}
            </button>
          );
        })}

        {/* Quick Genres inside Sidebar */}
        {sidebarOpen && (
          <div className="mt-6 pt-4 border-t border-white/[0.06]">
            <p className="text-[10px] font-bold uppercase tracking-[0.18em] text-[var(--text-light)]/50 px-3 mb-2">
              Quick Vibes
            </p>
            <div className="space-y-0.5">
              {['Electronic', 'Pop', 'Hip-Hop/Rap', 'Rock', 'Ambient', 'Dance'].map((g) => {
                const GenreIcon = GENRE_ICONS[g] || MusicNotes;
                const isSelected = selectedGenre === g && view === 'explore';
                return (
                  <button
                    key={g}
                    type="button"
                    onClick={() => {
                      setSelectedGenre(g);
                      setView('explore');
                    }}
                    className={`w-full flex items-center justify-between px-3 py-1.5 rounded-xl text-xs transition-all cursor-pointer ${
                      isSelected
                        ? 'text-[var(--primary)] font-bold bg-[var(--primary)]/12 border border-[var(--primary)]/25'
                        : 'text-[var(--text-light)]/80 hover:text-[var(--text)] hover:bg-white/[0.04]'
                    }`}
                  >
                    <span className="flex items-center gap-2">
                      <GenreIcon size={14} weight={isSelected ? 'fill' : 'duotone'} className={isSelected ? 'text-[var(--primary)]' : 'text-[var(--text-light)]/60'} />
                      <span>{g}</span>
                    </span>
                    {isSelected && (
                      <Check size={13} weight="bold" className="text-[var(--primary)]" />
                    )}
                  </button>
                );
              })}
            </div>
          </div>
        )}
      </nav>

      {/* Azaad Streaming Engine Live Badge */}
      {sidebarOpen && (
        <div className="px-3 pb-4 pt-2">
          <div className="p-3 rounded-2xl bg-gradient-to-br from-[var(--primary)]/12 via-indigo-500/10 to-emerald-500/10 border border-[var(--primary)]/20 shadow-inner">
            <div className="flex items-center gap-2 mb-1">
              <Broadcast size={15} weight="duotone" className="text-[var(--primary)] animate-pulse" />
              <span className="text-[11px] font-bold text-[var(--text)]">Azaad Studio Engine</span>
            </div>
            <p className="text-[10px] text-[var(--text-light)] leading-relaxed">
              Stream unlimited full-length master tracks with zero ads.
            </p>
          </div>
        </div>
      )}
    </aside>
  );
}
