import React, { useState, useMemo, memo } from 'react';
import {
  Broadcast,
  ArrowRight,
  BookmarkSimple,
  Check,
  MagnifyingGlass,
  SlidersHorizontal,
  X,
} from '@phosphor-icons/react';
import {
  CURATED_PODCAST_SHOWS,
  getPopularPodcastEpisodes,
} from '../services/podcastService';
import PodcastEpisodeCard from './PodcastEpisodeCard';

function ExplorePodcastsSectionComponent({
  currentSong,
  isPlaying,
  onPlayEpisode,
  onViewAllPodcasts,
  onOpenShow,
  subscribedIds = [],
  onToggleSubscribe,
}) {
  const [seriesFilter, setSeriesFilter] = useState('all');
  const [filterQuery, setFilterQuery] = useState('');
  const [activeCategory, setActiveCategory] = useState('all');

  const popularEpisodes = useMemo(() => {
    return getPopularPodcastEpisodes(12);
  }, []);

  // Filter episodes based on series filter, category, and search query
  const displayedEpisodes = useMemo(() => {
    return popularEpisodes.filter((ep) => {
      if (seriesFilter !== 'all' && ep.showId !== seriesFilter) {
        return false;
      }
      if (activeCategory === 'subscribed') {
        if (!subscribedIds.includes(ep.showId)) return false;
      } else if (activeCategory !== 'all') {
        if (ep.category !== activeCategory) return false;
      }
      if (filterQuery.trim()) {
        const q = filterQuery.toLowerCase();
        const matchesTitle = ep.title.toLowerCase().includes(q);
        const matchesHost = ep.host?.toLowerCase().includes(q);
        const matchesShow = ep.showTitle?.toLowerCase().includes(q);
        const matchesDesc = ep.description?.toLowerCase().includes(q);
        if (!matchesTitle && !matchesHost && !matchesShow && !matchesDesc) {
          return false;
        }
      }
      return true;
    });
  }, [popularEpisodes, seriesFilter, activeCategory, filterQuery, subscribedIds]);

  return (
    <section className="space-y-4 pt-4 border-t border-white/10 smooth-shelf">
      {/* ─── Header: Title & View All ───────────────────────────────── */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-xl bg-violet-500/20 border border-violet-500/30 flex items-center justify-center text-violet-400 shadow-sm">
              <Broadcast size={19} weight="duotone" />
            </div>
            <h2 className="font-display text-lg sm:text-xl font-bold text-white tracking-wide">
              Featured Podcasts & Talk
            </h2>
            <span className="px-2 py-0.5 rounded-full text-[10px] font-bold uppercase bg-violet-500/20 text-violet-300 border border-violet-500/30">
              Long-Form
            </span>
          </div>
          <p className="text-xs text-[var(--text-light)] mt-1">
            Deep-dive conversations, science protocols, technology insights, and world-class storytelling
          </p>
        </div>

        <button
          type="button"
          onClick={onViewAllPodcasts}
          className="min-h-[40px] px-4 py-2 rounded-xl bg-white/5 hover:bg-white/10 active:scale-95 border border-white/10 text-xs sm:text-sm font-bold text-white transition-all flex items-center gap-2 self-start sm:self-auto group"
        >
          <span>Explore All Shows</span>
          <ArrowRight size={16} weight="bold" className="group-hover:translate-x-1 transition-transform text-[var(--primary)]" />
        </button>
      </div>

      {/* ─── Dedicated Search & Series Filter Controls ───────────────── */}
      <div className="p-3.5 sm:p-4 rounded-2xl bg-[#0e141d]/90 border border-white/10 space-y-3">
        <div className="flex flex-col md:flex-row items-stretch md:items-center gap-3">
          {/* Series Search Input */}
          <div className="relative flex-1">
            <MagnifyingGlass size={16} weight="bold" className="absolute left-3.5 top-1/2 -translate-y-1/2 text-[var(--text-light)]" />
            <input
              type="text"
              value={filterQuery}
              onChange={(e) => setFilterQuery(e.target.value)}
              placeholder="Filter podcast series, episode topic, or host..."
              className="w-full pl-10 pr-10 py-2 rounded-xl bg-white/5 border border-white/10 text-xs sm:text-sm text-white placeholder-[var(--text-light)]/60 focus:outline-none focus:border-[var(--primary)]/50 transition-colors"
            />
            {filterQuery && (
              <button
                type="button"
                onClick={() => setFilterQuery('')}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-xs text-[var(--text-light)] hover:text-white"
              >
                <X size={14} weight="bold" />
              </button>
            )}
          </div>

          {/* Series Dropdown Filter */}
          <div className="flex items-center gap-2 min-w-[220px]">
            <SlidersHorizontal size={17} weight="duotone" className="text-[var(--primary)] flex-shrink-0" />
            <select
              value={seriesFilter}
              onChange={(e) => setSeriesFilter(e.target.value)}
              className="w-full py-2 px-3 rounded-xl bg-[#111822] border border-white/15 text-xs sm:text-sm font-semibold text-white focus:outline-none focus:border-[var(--primary)] transition-colors cursor-pointer"
              aria-label="Filter by podcast series"
            >
              <option value="all">All Podcast Series ({CURATED_PODCAST_SHOWS.length})</option>
              {CURATED_PODCAST_SHOWS.map((show) => (
                <option key={show.id} value={show.id}>
                  {show.title} ({show.episodes?.length || 0} eps)
                </option>
              ))}
            </select>
          </div>

          {/* Subscribed Quick Filter */}
          <button
            type="button"
            onClick={() => setActiveCategory((prev) => (prev === 'subscribed' ? 'all' : 'subscribed'))}
            className={`min-h-[38px] px-3.5 py-2 rounded-xl text-xs font-bold transition-all flex items-center justify-center gap-1.5 active:scale-95 flex-shrink-0 ${
              activeCategory === 'subscribed'
                ? 'bg-[var(--primary)] text-black font-extrabold shadow-sm'
                : 'bg-white/5 hover:bg-white/10 text-white/80 border border-white/10'
            }`}
          >
            <BookmarkSimple size={15} weight={activeCategory === 'subscribed' ? 'fill' : 'duotone'} />
            <span>Subscribed ({subscribedIds.length})</span>
          </button>
        </div>

        {/* Quick Series Pills Carousel */}
        <div className="flex items-center gap-2 overflow-x-auto pb-1 scrollbar-none pt-1 smooth-row-scroll">
          <button
            type="button"
            onClick={() => setSeriesFilter('all')}
            className={`px-3 py-1.5 rounded-xl text-xs font-bold whitespace-nowrap transition-all flex-shrink-0 ${
              seriesFilter === 'all'
                ? 'bg-white text-black shadow-sm'
                : 'bg-white/5 text-[var(--text-light)] hover:text-white border border-white/5'
            }`}
          >
            All Series
          </button>

          {CURATED_PODCAST_SHOWS.map((show) => {
            const isSub = subscribedIds.includes(show.id);
            const isSelected = seriesFilter === show.id;
            return (
              <div
                key={show.id}
                className={`flex items-center gap-1.5 px-3 py-1 rounded-xl text-xs font-medium whitespace-nowrap transition-all flex-shrink-0 border ${
                  isSelected
                    ? 'bg-[var(--primary)]/20 border-[var(--primary)] text-white font-bold'
                    : 'bg-white/5 border-white/5 text-[var(--text-light)] hover:text-white'
                }`}
              >
                <button
                  type="button"
                  onClick={() => setSeriesFilter(isSelected ? 'all' : show.id)}
                  className="hover:underline flex items-center gap-1.5"
                >
                  <span>{show.title}</span>
                </button>
                <button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation();
                    onToggleSubscribe?.(show);
                  }}
                  className={`p-1 rounded-md transition-colors ${
                    isSub ? 'text-emerald-400 hover:text-emerald-300' : 'text-white/40 hover:text-white'
                  }`}
                  title={isSub ? `Subscribed to ${show.title}` : `Subscribe to ${show.title}`}
                  aria-label={isSub ? 'Unsubscribe' : 'Subscribe'}
                >
                  {isSub ? <Check size={13} weight="bold" /> : <BookmarkSimple size={13} weight="duotone" />}
                </button>
              </div>
            );
          })}
        </div>
      </div>

      {/* ─── Grid-Based Card Displays for Popular Episodes ───────────── */}
      {displayedEpisodes.length === 0 ? (
        <div className="py-12 text-center rounded-2xl bg-white/5 border border-dashed border-white/10 p-6">
          <Broadcast size={38} weight="duotone" className="text-white/30 mx-auto mb-2" />
          <p className="text-sm font-bold text-white">No podcast episodes match your filters</p>
          <p className="text-xs text-[var(--text-light)] mt-1">
            Try resetting your search query or selecting a different show series.
          </p>
          <button
            type="button"
            onClick={() => {
              setSeriesFilter('all');
              setFilterQuery('');
              setActiveCategory('all');
            }}
            className="mt-3 px-4 py-2 rounded-xl bg-[var(--primary)] text-black text-xs font-bold"
          >
            Reset Filters
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-3.5 sm:gap-4">
          {displayedEpisodes.map((ep) => (
            <PodcastEpisodeCard
              key={ep.id}
              episode={ep}
              currentSong={currentSong}
              isPlaying={isPlaying}
              onPlay={(selected) => onPlayEpisode?.(selected, displayedEpisodes)}
              onOpenShow={onOpenShow}
              isSubscribed={subscribedIds.includes(ep.showId)}
              onToggleSubscribe={onToggleSubscribe}
              onShare={() => {
                if (navigator.share) {
                  navigator.share({
                    title: ep.title,
                    text: `Listening to "${ep.title}" on Azaad Music!`,
                    url: window.location.href,
                  }).catch(() => {});
                }
              }}
            />
          ))}
        </div>
      )}
    </section>
  );
}

export default memo(ExplorePodcastsSectionComponent);
