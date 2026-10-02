import React, { useState, useMemo, useCallback } from 'react';
import {
  Mic,
  Search,
  Radio,
  Sparkles,
  Play,
  Pause,
  Clock,
  Calendar,
  Check,
  Plus,
  Filter,
  SlidersHorizontal,
  ChevronRight,
  Disc3,
  Bookmark,
  Share2,
  Volume2,
  ExternalLink,
  Flame,
  ListFilter,
  CheckCircle2,
  ListMusic,
  ArrowRight,
  BookOpen,
  X,
} from 'lucide-react';
import {
  PODCAST_CATEGORIES,
  PODCAST_SERIES,
  POPULAR_PODCAST_EPISODES,
  searchPodcastsCatalog,
  formatPodcastDuration,
  normalizePodcastEpisode,
} from '../services/podcastService';

export default function PodcastsView({
  currentSong,
  isPlaying,
  onPlaySong,
  onPlayEpisode,
  subscribedSeries = [],
  onToggleSubscription,
  onOpenPlayerPage,
}) {
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('All');
  const [selectedSeriesId, setSelectedSeriesId] = useState('all');
  const [sortBy, setSortBy] = useState('popular'); // 'popular' | 'newest' | 'duration-asc' | 'duration-desc'
  const [activeTab, setActiveTab] = useState('all'); // 'all' | 'popular' | 'series' | 'subscriptions'
  const [expandedChaptersEpisodeId, setExpandedChaptersEpisodeId] = useState(null);
  const [copiedLinkEpisodeId, setCopiedLinkEpisodeId] = useState(null);

  const handlePlayEpisode = useCallback(
    (episode) => {
      if (!episode) return;
      if (typeof onPlaySong === 'function') {
        onPlaySong(episode);
      } else if (typeof onPlayEpisode === 'function') {
        onPlayEpisode(episode);
      }
    },
    [onPlaySong, onPlayEpisode]
  );

  // Subscribed series IDs set
  const subscribedSeriesIds = useMemo(() => {
    return subscribedSeries.map((s) => String(s.seriesId || s.id));
  }, [subscribedSeries]);

  // Filtered results
  const { series: filteredSeries, episodes: filteredEpisodes } = useMemo(() => {
    return searchPodcastsCatalog({
      query: searchQuery,
      category: selectedCategory,
      seriesFilter: selectedSeriesId,
      sortBy,
      subscribedSeriesIds,
      onlySubscribed: activeTab === 'subscriptions',
    });
  }, [searchQuery, selectedCategory, selectedSeriesId, sortBy, subscribedSeriesIds, activeTab]);

  const activeSeriesObject = useMemo(() => {
    if (selectedSeriesId === 'all') return null;
    return PODCAST_SERIES.find((s) => s.id === selectedSeriesId) || null;
  }, [selectedSeriesId]);

  const handleShareEpisode = (ep, e) => {
    e?.stopPropagation();
    const url = typeof window !== 'undefined' ? window.location.href : '';
    const text = `Listen to "${ep.title}" on Azaad Podcasts!`;
    if (navigator.clipboard) {
      navigator.clipboard.writeText(`${text}\n${url}`);
      setCopiedLinkEpisodeId(ep.id);
      setTimeout(() => setCopiedLinkEpisodeId(null), 2000);
    }
  };

  return (
    <div className="space-y-6 sm:space-y-8 select-none">
      {/* ─── Hero Showcase Section ────────────────────────────────────── */}
      <div className="relative rounded-3xl overflow-hidden glass-card border border-[var(--primary)]/20 p-5 sm:p-8 bg-gradient-to-br from-[#101b22] via-[#0d1418] to-[#0a0f12]">
        <div className="absolute top-0 right-0 w-96 h-96 bg-[var(--primary)]/10 rounded-full blur-3xl pointer-events-none -mr-20 -mt-20" />
        <div className="absolute bottom-0 left-1/3 w-80 h-80 bg-cyan-600/10 rounded-full blur-3xl pointer-events-none" />

        <div className="relative z-10 flex flex-col lg:flex-row lg:items-center justify-between gap-6">
          <div className="space-y-3 max-w-2xl">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-[var(--primary)]/15 border border-[var(--primary)]/30 text-[var(--primary)] text-xs font-bold tracking-wide uppercase">
              <Mic className="w-3.5 h-3.5" />
              <span>Azaad Podcasts & Master Talks</span>
            </div>

            <h1 className="text-2xl sm:text-4xl font-extrabold text-white tracking-tight leading-tight">
              Dive Deep into Ideas, Science & Global Conversations
            </h1>

            <p className="text-xs sm:text-sm text-[var(--text-light)] leading-relaxed">
              Explore master-quality audio episodes from world-renowned leaders, neuroscientists, creators, and investigators. Subscribe with one click to keep your favorite shows in sync.
            </p>

            {/* Quick Metrics */}
            <div className="flex items-center gap-4 sm:gap-6 pt-2 flex-wrap text-xs text-white/80 font-medium">
              <div className="flex items-center gap-1.5">
                <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
                <span>8 Top Series</span>
              </div>
              <div className="flex items-center gap-1.5">
                <Flame className="w-4 h-4 text-amber-400" />
                <span>Popular Episodes</span>
              </div>
              <div className="flex items-center gap-1.5">
                <Sparkles className="w-4 h-4 text-[var(--primary)]" />
                <span>Speed Control & Chapters</span>
              </div>
            </div>
          </div>

          {/* Quick Subscriptions Summary Card */}
          <div className="bg-white/5 backdrop-blur-md border border-white/10 rounded-2xl p-4 sm:p-5 flex flex-col justify-between min-w-[260px] self-start lg:self-stretch">
            <div>
              <span className="text-[11px] uppercase tracking-wider text-[var(--text-light)] font-bold block mb-1">
                Your Subscriptions
              </span>
              <div className="flex items-baseline gap-2">
                <span className="text-3xl font-extrabold text-white">
                  {subscribedSeriesIds.length}
                </span>
                <span className="text-xs text-[var(--text-light)]">active show{subscribedSeriesIds.length !== 1 ? 's' : ''}</span>
              </div>
            </div>

            <div className="mt-4 pt-3 border-t border-white/10 flex items-center justify-between">
              <button
                type="button"
                onClick={() => setActiveTab(activeTab === 'subscriptions' ? 'all' : 'subscriptions')}
                className={`text-xs font-semibold px-3 py-1.5 rounded-xl transition-all flex items-center gap-1.5 cursor-pointer ${
                  activeTab === 'subscriptions'
                    ? 'bg-[var(--primary)] text-[var(--bg)] font-bold'
                    : 'bg-white/10 text-white hover:bg-white/15'
                }`}
              >
                <Bookmark className="w-3.5 h-3.5" />
                <span>{activeTab === 'subscriptions' ? 'Showing Subscribed' : 'View Subscribed'}</span>
              </button>

              {subscribedSeriesIds.length > 0 && activeTab !== 'subscriptions' && (
                <span className="text-[11px] text-[var(--primary)] font-medium">
                  {subscribedSeriesIds.length} series saved
                </span>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* ─── Navigation Tabs Switcher ─────────────────────────────────── */}
      <div className="flex items-center gap-2 overflow-x-auto pb-1 scrollbar-none">
        {[
          { id: 'all', label: 'All Podcasts', count: POPULAR_PODCAST_EPISODES.length },
          { id: 'popular', label: '🔥 Popular Episodes', count: null },
          { id: 'series', label: '🎙️ Browse Series', count: PODCAST_SERIES.length },
          {
            id: 'subscriptions',
            label: '⭐ My Subscriptions',
            count: subscribedSeriesIds.length,
            highlight: subscribedSeriesIds.length > 0,
          },
        ].map((tab) => (
          <button
            key={tab.id}
            type="button"
            onClick={() => {
              setActiveTab(tab.id);
              if (tab.id === 'series') setSelectedSeriesId('all');
            }}
            className={`px-4 py-2 rounded-xl text-xs sm:text-sm font-semibold transition-all whitespace-nowrap flex items-center gap-2 cursor-pointer flex-shrink-0 ${
              activeTab === tab.id
                ? 'bg-[var(--primary)] text-[var(--bg)] font-bold shadow-[0_0_16px_rgba(83,242,224,0.3)]'
                : 'glass-card text-[var(--text-light)] hover:text-white hover:bg-white/10'
            }`}
          >
            <span>{tab.label}</span>
            {typeof tab.count === 'number' && (
              <span
                className={`text-[10px] px-1.5 py-0.2 rounded-full font-mono ${
                  activeTab === tab.id ? 'bg-black/20 text-black' : 'bg-white/10 text-white/70'
                }`}
              >
                {tab.count}
              </span>
            )}
          </button>
        ))}
      </div>

      {/* ─── Dedicated Search Filter for Podcast Series & Episodes ───── */}
      <div className="glass-card rounded-2xl p-4 sm:p-5 border border-white/10 space-y-4">
        {/* Top Search Bar & Sort */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          {/* Search Input */}
          <div className="relative flex-1">
            <Search className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-[var(--text-light)] pointer-events-none" />
            <input
              type="text"
              placeholder="Search podcast series, episode title, host, or topics..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-10 pr-9 py-2.5 rounded-xl bg-white/5 border border-white/10 text-white placeholder-white/40 text-xs sm:text-sm focus:outline-none focus:border-[var(--primary)] transition-colors"
            />
            {searchQuery && (
              <button
                type="button"
                onClick={() => setSearchQuery('')}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-white/50 hover:text-white p-1"
                title="Clear search"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            )}
          </div>

          {/* Dedicated Series Filter Selector */}
          <div className="flex items-center gap-2 flex-wrap">
            <div className="flex items-center gap-1.5 bg-white/5 border border-white/10 px-2.5 py-1.5 rounded-xl">
              <Radio className="w-3.5 h-3.5 text-[var(--primary)] flex-shrink-0" />
              <label htmlFor="podcast-series-select" className="sr-only">Filter by Series</label>
              <select
                id="podcast-series-select"
                aria-label="Filter by Podcast Series"
                value={selectedSeriesId}
                onChange={(e) => setSelectedSeriesId(e.target.value)}
                className="bg-transparent text-xs text-white font-medium focus:outline-none cursor-pointer pr-1"
              >
                <option value="all" className="bg-[#12181b] text-white">All Podcast Series</option>
                {PODCAST_SERIES.map((s) => (
                  <option key={s.id} value={s.id} className="bg-[#12181b] text-white">
                    {s.title} ({s.host})
                  </option>
                ))}
              </select>
            </div>

            {/* Sort Selector */}
            <div className="flex items-center gap-1.5 bg-white/5 border border-white/10 px-2.5 py-1.5 rounded-xl">
              <SlidersHorizontal className="w-3.5 h-3.5 text-[var(--accent)] flex-shrink-0" />
              <label htmlFor="podcast-sort-select" className="sr-only">Sort Podcasts</label>
              <select
                id="podcast-sort-select"
                aria-label="Sort Podcasts"
                value={sortBy}
                onChange={(e) => setSortBy(e.target.value)}
                className="bg-transparent text-xs text-white font-medium focus:outline-none cursor-pointer pr-1"
              >
                <option value="popular" className="bg-[#12181b] text-white">Most Popular</option>
                <option value="newest" className="bg-[#12181b] text-white">Newest First</option>
                <option value="duration-desc" className="bg-[#12181b] text-white">Duration (Longest)</option>
                <option value="duration-asc" className="bg-[#12181b] text-white">Duration (Shortest)</option>
              </select>
            </div>
          </div>
        </div>

        {/* Category Filter Chips (Horizontal Scroll on Mobile) */}
        <div className="flex items-center gap-1.5 overflow-x-auto pb-1 scrollbar-none pt-1">
          <span className="text-[11px] font-bold text-[var(--text-light)] uppercase tracking-wider mr-1 flex-shrink-0 flex items-center gap-1">
            <Filter className="w-3 h-3 text-[var(--primary)]" /> Category:
          </span>
          {PODCAST_CATEGORIES.map((cat) => {
            const isSelected = selectedCategory === cat;
            return (
              <button
                key={cat}
                type="button"
                onClick={() => setSelectedCategory(cat)}
                className={`px-3 py-1.5 rounded-full text-xs font-semibold transition-all whitespace-nowrap flex-shrink-0 cursor-pointer ${
                  isSelected
                    ? 'bg-[var(--primary)] text-[var(--bg)] shadow-[0_0_12px_rgba(83,242,224,0.35)]'
                    : 'bg-white/5 text-[var(--text-light)] hover:text-white hover:bg-white/10 border border-white/5'
                }`}
              >
                {cat}
              </button>
            );
          })}
        </div>

        {/* Active Filter Badges */}
        {(selectedCategory !== 'All' || selectedSeriesId !== 'all' || searchQuery || activeTab === 'subscriptions') && (
          <div className="flex items-center gap-2 pt-2 border-t border-white/10 flex-wrap text-xs">
            <span className="text-[11px] text-[var(--text-light)]">Active filters:</span>
            {activeSeriesObject && (
              <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-lg bg-[var(--primary)]/15 text-[var(--primary)] border border-[var(--primary)]/30 text-xs font-medium">
                Series: {activeSeriesObject.title}
                <button
                  type="button"
                  onClick={() => setSelectedSeriesId('all')}
                  className="hover:text-white p-0.5"
                >
                  <X className="w-3 h-3" />
                </button>
              </span>
            )}
            {selectedCategory !== 'All' && (
              <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-lg bg-cyan-500/15 text-cyan-300 border border-cyan-500/30 text-xs font-medium">
                Category: {selectedCategory}
                <button
                  type="button"
                  onClick={() => setSelectedCategory('All')}
                  className="hover:text-white p-0.5"
                >
                  <X className="w-3 h-3" />
                </button>
              </span>
            )}
            {searchQuery && (
              <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-lg bg-white/10 text-white border border-white/10 text-xs font-medium">
                Query: &ldquo;{searchQuery}&rdquo;
                <button
                  type="button"
                  onClick={() => setSearchQuery('')}
                  className="hover:text-white p-0.5"
                >
                  <X className="w-3 h-3" />
                </button>
              </span>
            )}
            {activeTab === 'subscriptions' && (
              <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-lg bg-amber-500/15 text-amber-300 border border-amber-500/30 text-xs font-medium">
                Subscribed Shows Only
                <button
                  type="button"
                  onClick={() => setActiveTab('all')}
                  className="hover:text-white p-0.5"
                >
                  <X className="w-3 h-3" />
                </button>
              </span>
            )}
            <button
              type="button"
              onClick={() => {
                setSearchQuery('');
                setSelectedCategory('All');
                setSelectedSeriesId('all');
                setActiveTab('all');
              }}
              className="text-[11px] text-[var(--primary)] hover:underline ml-auto"
            >
              Reset All
            </button>
          </div>
        )}
      </div>

      {/* ─── PODCAST SERIES SHOWCASE SECTION (When tab is 'series' or 'all') ─── */}
      {(activeTab === 'series' || (activeTab === 'all' && selectedSeriesId === 'all' && !searchQuery)) && (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-lg sm:text-xl font-bold text-white flex items-center gap-2">
                <Radio className="w-5 h-5 text-[var(--primary)]" />
                <span>Featured Podcast Series</span>
              </h2>
              <p className="text-xs text-[var(--text-light)] mt-0.5">
                Subscribe to shows to receive automatic new episode updates in your feed
              </p>
            </div>
            {activeTab !== 'series' && (
              <button
                type="button"
                onClick={() => setActiveTab('series')}
                className="text-xs font-semibold text-[var(--primary)] hover:underline flex items-center gap-1"
              >
                <span>View All ({PODCAST_SERIES.length})</span>
                <ChevronRight className="w-3.5 h-3.5" />
              </button>
            )}
          </div>

          {/* Series Grid */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            {filteredSeries.map((series) => {
              const isSubscribed = subscribedSeriesIds.includes(series.id);
              return (
                <div
                  key={series.id}
                  className="group rounded-2xl glass-card border border-white/10 hover:border-[var(--primary)]/40 p-4 transition-all duration-300 flex flex-col justify-between space-y-3 bg-[#12191e]/90 hover:shadow-[0_8px_30px_rgba(0,0,0,0.4)]"
                >
                  <div className="space-y-3">
                    {/* Series Artwork & Badge */}
                    <div className="relative aspect-video rounded-xl overflow-hidden bg-black/40 border border-white/10">
                      <img
                        src={series.coverUrl}
                        alt={series.title}
                        className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                        loading="lazy"
                      />
                      <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-transparent to-black/20" />
                      
                      {/* Category Badge */}
                      <span className="absolute top-2 left-2 px-2 py-0.5 rounded-full bg-black/70 backdrop-blur-md border border-white/15 text-[10px] font-semibold text-white">
                        {series.category}
                      </span>

                      {/* Series Badge */}
                      {series.badge && (
                        <span className="absolute bottom-2 left-2 px-2 py-0.5 rounded-md bg-[var(--primary)] text-[var(--bg)] text-[10px] font-bold shadow-sm">
                          {series.badge}
                        </span>
                      )}

                      {/* Quick filter by series button */}
                      <button
                        type="button"
                        onClick={() => setSelectedSeriesId(series.id)}
                        className="absolute bottom-2 right-2 p-1.5 rounded-lg bg-white/20 hover:bg-white/30 backdrop-blur-md text-white text-[10px] font-medium transition-all flex items-center gap-1 active:scale-95"
                        title="Filter episodes by this series"
                      >
                        <ListFilter className="w-3 h-3" />
                        <span>Filter</span>
                      </button>
                    </div>

                    {/* Series Info */}
                    <div>
                      <h3
                        onClick={() => setSelectedSeriesId(series.id)}
                        className="text-sm font-bold text-white group-hover:text-[var(--primary)] transition-colors line-clamp-1 cursor-pointer"
                        title={series.title}
                      >
                        {series.title}
                      </h3>
                      <p className="text-xs text-[var(--text-light)] truncate mt-0.5">
                        {series.host}
                      </p>
                      <p className="text-[11px] text-[var(--text-light)]/80 line-clamp-2 mt-2 leading-relaxed">
                        {series.description}
                      </p>
                    </div>
                  </div>

                  {/* Series Footer: Episodes Count, Rating, and Subscribe Button */}
                  <div className="pt-3 border-t border-white/10 flex items-center justify-between gap-2">
                    <div className="text-[11px] text-[var(--text-light)]">
                      <span className="font-semibold text-white">{series.totalEpisodes}</span> eps · ★ {series.rating}
                    </div>

                    {/* Subscribe Button */}
                    <button
                      type="button"
                      onClick={() => onToggleSubscription?.(series)}
                      className={`min-h-[36px] px-3 py-1.5 rounded-xl text-xs font-bold transition-all active:scale-95 flex items-center gap-1.5 cursor-pointer ${
                        isSubscribed
                          ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 hover:bg-emerald-500/30'
                          : 'bg-[var(--primary)] text-[var(--bg)] hover:brightness-110 shadow-sm'
                      }`}
                      title={isSubscribed ? 'Click to Unsubscribe' : 'Subscribe to Series'}
                    >
                      {isSubscribed ? (
                        <>
                          <Check className="w-3.5 h-3.5" />
                          <span>Subscribed</span>
                        </>
                      ) : (
                        <>
                          <Plus className="w-3.5 h-3.5" />
                          <span>Subscribe</span>
                        </>
                      )}
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* ─── GRID-BASED CARD DISPLAYS FOR POPULAR EPISODES ─────────────── */}
      <div className="space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
          <div>
            <h2 className="text-lg sm:text-xl font-bold text-white flex items-center gap-2">
              <Flame className="w-5 h-5 text-amber-400" />
              <span>
                {selectedSeriesId !== 'all' && activeSeriesObject
                  ? `Episodes from ${activeSeriesObject.title}`
                  : activeTab === 'subscriptions'
                  ? 'Episodes from Your Subscribed Shows'
                  : 'Popular Podcast Episodes'}
              </span>
            </h2>
            <p className="text-xs text-[var(--text-light)] mt-0.5">
              {filteredEpisodes.length} episode{filteredEpisodes.length !== 1 ? 's' : ''} ready to stream with high-clarity voice audio
            </p>
          </div>

          {selectedSeriesId !== 'all' && (
            <button
              type="button"
              onClick={() => setSelectedSeriesId('all')}
              className="text-xs font-semibold text-[var(--primary)] hover:underline self-start sm:self-auto cursor-pointer"
            >
              ← Back to all series
            </button>
          )}
        </div>

        {/* Empty State */}
        {filteredEpisodes.length === 0 ? (
          <div className="rounded-2xl glass-card border border-dashed border-white/10 p-8 text-center space-y-3">
            <Mic className="w-10 h-10 text-[var(--text-light)]/40 mx-auto" />
            <h3 className="text-base font-bold text-white">No episodes match your criteria</h3>
            <p className="text-xs text-[var(--text-light)] max-w-md mx-auto">
              {activeTab === 'subscriptions'
                ? "You haven't subscribed to any podcast shows yet, or no episodes matched your query. Click 'Subscribe' on any show above to build your personal library!"
                : "Try adjusting your search terms, changing the category, or selecting 'All Podcast Series'."}
            </p>
            <button
              type="button"
              onClick={() => {
                setSearchQuery('');
                setSelectedCategory('All');
                setSelectedSeriesId('all');
                setActiveTab('all');
              }}
              className="px-4 py-2 rounded-xl bg-[var(--primary)] text-[var(--bg)] text-xs font-bold transition-all inline-flex items-center gap-2 cursor-pointer"
            >
              <Sparkles className="w-3.5 h-3.5" />
              <span>Reset Filters & Explore</span>
            </button>
          </div>
        ) : (
          /* Grid of Episode Cards */
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
            {filteredEpisodes.map((episode) => {
              const isCurrent = currentSong?.id === episode.id;
              const isCurrentPlaying = isCurrent && isPlaying;
              const isSubscribed = subscribedSeriesIds.includes(episode.seriesId);
              const hasChapters = episode.chapters && episode.chapters.length > 0;
              const isExpanded = expandedChaptersEpisodeId === episode.id;

              return (
                <div
                  key={episode.id}
                  className={`rounded-2xl glass-card border transition-all duration-300 flex flex-col justify-between overflow-hidden group bg-[#11171c]/95 ${
                    isCurrent
                      ? 'border-[var(--primary)] shadow-[0_0_20px_rgba(83,242,224,0.25)] ring-1 ring-[var(--primary)]/40'
                      : 'border-white/10 hover:border-white/20 hover:shadow-xl'
                  }`}
                >
                  <div>
                    {/* Episode Card Header & Artwork */}
                    <div className="relative aspect-video w-full overflow-hidden bg-black/60">
                      <img
                        src={episode.coverUrl}
                        alt={episode.title}
                        className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                        loading="lazy"
                      />
                      <div className="absolute inset-0 bg-gradient-to-t from-black/85 via-black/20 to-transparent pointer-events-none" />

                      {/* Category & Episode number badges */}
                      <div className="absolute top-2.5 left-2.5 flex items-center gap-1.5 flex-wrap">
                        <span className="px-2 py-0.5 rounded-full bg-black/75 backdrop-blur-md border border-white/20 text-[10px] font-bold text-white shadow-sm">
                          {episode.category}
                        </span>
                        {episode.episodeNumber && (
                          <span className="px-2 py-0.5 rounded-full bg-[var(--primary)]/90 text-[var(--bg)] text-[10px] font-extrabold shadow-sm">
                            EP {episode.episodeNumber}
                          </span>
                        )}
                      </div>

                      {/* Share & Quick Subscribe button on artwork */}
                      <div className="absolute top-2.5 right-2.5 flex items-center gap-1">
                        <button
                          type="button"
                          onClick={(e) => handleShareEpisode(episode, e)}
                          className="p-1.5 rounded-xl bg-black/60 hover:bg-black/80 backdrop-blur-md border border-white/15 text-white/80 hover:text-white transition-all cursor-pointer"
                          title="Share Episode"
                        >
                          {copiedLinkEpisodeId === episode.id ? (
                            <Check className="w-3.5 h-3.5 text-emerald-400" />
                          ) : (
                            <Share2 className="w-3.5 h-3.5" />
                          )}
                        </button>
                      </div>

                      {/* Play Overlay Button */}
                      <button
                        type="button"
                        onClick={() => handlePlayEpisode(episode)}
                        className={`absolute inset-0 m-auto w-12 h-12 rounded-full flex items-center justify-center transition-all duration-300 shadow-xl cursor-pointer ${
                          isCurrentPlaying
                            ? 'bg-[var(--primary)] text-[var(--bg)] scale-100'
                            : 'bg-white/20 hover:bg-[var(--primary)] text-white hover:text-[var(--bg)] backdrop-blur-md border border-white/30 scale-90 group-hover:scale-100'
                        }`}
                        title={isCurrentPlaying ? 'Pause Episode' : 'Play Episode'}
                      >
                        {isCurrentPlaying ? (
                          <Pause className="w-5 h-5 fill-current" />
                        ) : (
                          <Play className="w-5 h-5 fill-current ml-0.5" />
                        )}
                      </button>

                      {/* Duration & Date Info Bar on bottom of artwork */}
                      <div className="absolute bottom-2 left-2.5 right-2.5 flex items-center justify-between text-[11px] text-white/90 font-medium">
                        <span className="flex items-center gap-1 drop-shadow-md">
                          <Clock className="w-3 h-3 text-[var(--primary)]" />
                          {formatPodcastDuration(episode.duration)}
                        </span>
                        <span className="flex items-center gap-1 drop-shadow-md text-white/70">
                          <Calendar className="w-3 h-3" />
                          {episode.publishedAt}
                        </span>
                      </div>
                    </div>

                    {/* Episode Body Content */}
                    <div className="p-4 space-y-2">
                      {/* Series Clickable Link */}
                      <button
                        type="button"
                        onClick={() => setSelectedSeriesId(episode.seriesId)}
                        className="text-[11px] font-bold text-[var(--primary)] hover:underline uppercase tracking-wider block truncate text-left cursor-pointer"
                        title={`Filter by ${episode.seriesTitle}`}
                      >
                        {episode.seriesTitle}
                      </button>

                      {/* Episode Title */}
                      <h3
                        onClick={() => handlePlayEpisode(episode)}
                        className="text-sm font-extrabold text-white group-hover:text-[var(--primary)] transition-colors line-clamp-2 leading-snug cursor-pointer"
                        title={episode.title}
                      >
                        {episode.title}
                      </h3>

                      {/* Host & Guest info */}
                      <p className="text-xs text-[var(--text-light)] truncate font-medium">
                        {episode.host}
                      </p>

                      {/* Episode Description snippet */}
                      <p className="text-[11px] text-[var(--text-light)]/80 line-clamp-2 leading-relaxed pt-1">
                        {episode.description}
                      </p>

                      {/* Interactive Chapters Drawer Toggle */}
                      {hasChapters && (
                        <div className="pt-2">
                          <button
                            type="button"
                            onClick={() =>
                              setExpandedChaptersEpisodeId(isExpanded ? null : episode.id)
                            }
                            className="text-[11px] text-white/70 hover:text-[var(--primary)] font-semibold inline-flex items-center gap-1.5 transition-colors cursor-pointer"
                          >
                            <BookOpen className="w-3 h-3 text-[var(--primary)]" />
                            <span>{isExpanded ? 'Hide Show Chapters' : `View ${episode.chapters.length} Chapters`}</span>
                          </button>

                          {/* Expanded Chapters List */}
                          {isExpanded && (
                            <div className="mt-2 p-2.5 rounded-xl bg-black/40 border border-white/10 space-y-1.5 max-h-40 overflow-y-auto pr-1">
                              <p className="text-[10px] uppercase font-bold text-[var(--text-light)] tracking-wider">
                                Episode Timestamps:
                              </p>
                              {episode.chapters.map((ch, idx) => (
                                <div
                                  key={idx}
                                  onClick={() => {
                                    handlePlayEpisode(episode);
                                    if (onOpenPlayerPage) onOpenPlayerPage();
                                  }}
                                  className="flex items-center justify-between text-[11px] text-white/80 hover:text-[var(--primary)] py-1 px-1.5 rounded hover:bg-white/5 cursor-pointer transition-colors"
                                >
                                  <span className="truncate pr-2">{ch.title}</span>
                                  <span className="font-mono text-[10px] text-[var(--primary)] flex-shrink-0">
                                    {Math.floor(ch.time / 60)}:{(ch.time % 60).toString().padStart(2, '0')}
                                  </span>
                                </div>
                              ))}
                            </div>
                          )}
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Episode Card Bottom Action Bar */}
                  <div className="p-4 pt-2 border-t border-white/10 flex items-center justify-between gap-2">
                    {/* Primary Play Button */}
                    <button
                      type="button"
                      onClick={() => handlePlayEpisode(episode)}
                      className={`min-h-[38px] px-3.5 py-1.5 rounded-xl text-xs font-bold transition-all active:scale-95 flex items-center gap-1.5 flex-1 justify-center cursor-pointer ${
                        isCurrent
                          ? 'bg-[var(--primary)] text-[var(--bg)] shadow-[0_0_14px_rgba(83,242,224,0.35)]'
                          : 'bg-white/10 hover:bg-white/15 text-white'
                      }`}
                    >
                      {isCurrentPlaying ? (
                        <>
                          <div className="flex items-end gap-[1.5px] h-3.5">
                            <span className="w-0.5 h-3 bg-black rounded-full eq-bar-1" />
                            <span className="w-0.5 h-3.5 bg-black rounded-full eq-bar-2" />
                            <span className="w-0.5 h-2 bg-black rounded-full eq-bar-3" />
                          </div>
                          <span>Now Playing</span>
                        </>
                      ) : (
                        <>
                          <Play className="w-3.5 h-3.5 fill-current" />
                          <span>Play Episode</span>
                        </>
                      )}
                    </button>

                    {/* Series Subscription Button */}
                    {episode.seriesId && (
                      <button
                        type="button"
                        onClick={() => {
                          const parentSeries = PODCAST_SERIES.find((s) => s.id === episode.seriesId) || {
                            id: episode.seriesId,
                            title: episode.seriesTitle,
                            host: episode.host,
                            coverUrl: episode.coverUrl,
                            category: episode.category,
                          };
                          onToggleSubscription?.(parentSeries);
                        }}
                        className={`min-h-[38px] px-3 py-1.5 rounded-xl text-xs font-semibold transition-all active:scale-95 flex items-center gap-1 cursor-pointer flex-shrink-0 ${
                          isSubscribed
                            ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/30'
                            : 'bg-white/5 hover:bg-white/10 text-white/80 border border-white/10'
                        }`}
                        title={isSubscribed ? 'Subscribed to show' : 'Subscribe to show'}
                      >
                        {isSubscribed ? (
                          <>
                            <Check className="w-3.5 h-3.5 text-emerald-400" />
                            <span className="hidden xs:inline">Subscribed</span>
                          </>
                        ) : (
                          <>
                            <Plus className="w-3.5 h-3.5 text-[var(--primary)]" />
                            <span className="hidden xs:inline">Subscribe</span>
                          </>
                        )}
                      </button>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
