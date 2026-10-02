import React, { useState, useEffect, useRef, useMemo } from 'react';
import {
  MicrophoneStage,
  Microphone,
  Sparkle,
  Copy,
  Check,
  TextT,
  MagnifyingGlass,
  X,
  Play,
  SlidersHorizontal,
  TextAlignLeft,
  TextAlignCenter,
  ArrowCounterClockwise,
  ArrowClockwise,
  PencilSimple,
  ShareNetwork,
  Waveform,
} from '@phosphor-icons/react';
import { formatTime } from '../utils/musicUtils';

export default function LyricsSection({
  song,
  currentTime = 0,
  duration = 0,
  isPlaying = false,
  seekTo = () => {},
  lyricsData = {
    loading: false,
    type: 'none',
    lines: [],
    rawText: '',
    romanizedLines: [],
    translationLines: [],
    language: '',
    source: '',
  },
  onUpdateLyrics,
  syncOffset = 0,
  setSyncOffset = () => {},
  onSearchLyrics = () => {},
  isSearchingLyrics = false,
  isMobile = false,
  parseLrcText,
  buildAutoSyncedLyrics,
}) {
  // View mode: 'synced' (Karaoke tracker) | 'reader' (Full static text reader)
  const [viewMode, setViewMode] = useState('synced');
  const [lyricsFontSize, setLyricsFontSize] = useState('large'); // 'compact' | 'standard' | 'large' | 'immersive'
  const [textAlign, setTextAlign] = useState('center'); // 'center' | 'left'
  const [languageMode, setLanguageMode] = useState('original'); // 'original' | 'romanized' | 'translation'
  const [searchQuery, setSearchQuery] = useState('');
  const [showSearchInput, setShowSearchInput] = useState(false);
  const [autoScroll, setAutoScroll] = useState(true);
  const [userHasScrolledAway, setUserHasScrolledAway] = useState(false);
  const [copiedAll, setCopiedAll] = useState(false);
  const [copiedLineIdx, setCopiedLineIdx] = useState(null);

  // Custom edit / manual lyrics modal
  const [showCustomModal, setShowCustomModal] = useState(false);
  const [customModalTab, setCustomModalTab] = useState('refine'); // 'refine' | 'paste'
  const [refineTitle, setRefineTitle] = useState(song?.title || '');
  const [refineArtist, setRefineArtist] = useState(song?.singers || song?.artist || '');
  const [pastedLyricsText, setPastedLyricsText] = useState('');

  const scrollContainerRef = useRef(null);
  const isProgrammaticScrollRef = useRef(false);
  const scrollTimeoutRef = useRef(null);

  // Sync refine modal inputs when song changes
  useEffect(() => {
    setRefineTitle(song?.title || '');
    setRefineArtist(song?.singers || song?.artist || '');
    setUserHasScrolledAway(false);
  }, [song?.id, song?.title, song?.artist, song?.singers]);

  // Determine active lyric line index based on playback time & syncOffset
  const activeLyricIndex = useMemo(() => {
    if (lyricsData.type !== 'synced' || !lyricsData.lines?.length) return -1;
    const effectiveTime = Math.max(0, currentTime + syncOffset);
    let currentIdx = -1;
    for (let i = 0; i < lyricsData.lines.length; i++) {
      const line = lyricsData.lines[i];
      if (typeof line.time === 'number' && effectiveTime >= line.time) {
        currentIdx = i;
      } else {
        break;
      }
    }
    return currentIdx;
  }, [lyricsData, currentTime, syncOffset]);

  // Intra-line progress (0..100) for active singing line
  const activeLyricProgress = useMemo(() => {
    if (activeLyricIndex < 0 || lyricsData.type !== 'synced') return 0;
    const currentLine = lyricsData.lines[activeLyricIndex];
    const nextLine = lyricsData.lines[activeLyricIndex + 1];
    if (!currentLine || typeof currentLine.time !== 'number') return 0;
    const start = currentLine.time;
    const end = nextLine && typeof nextLine.time === 'number' ? nextLine.time : Math.max(start + 4, duration || start + 5);
    const span = Math.max(0.6, end - start);
    const effectiveTime = Math.max(0, currentTime + syncOffset);
    return Math.min(100, Math.max(0, ((effectiveTime - start) / span) * 100));
  }, [activeLyricIndex, lyricsData, currentTime, syncOffset, duration]);

  // Smooth autoscroll to center the active line
  useEffect(() => {
    if (!autoScroll || userHasScrolledAway || viewMode !== 'synced' || activeLyricIndex < 0) return;
    const container = scrollContainerRef.current;
    if (!container || container.clientHeight <= 0) return;

    const activeEl = container.querySelector(`[data-lyric-line-idx="${activeLyricIndex}"]`);
    if (activeEl) {
      isProgrammaticScrollRef.current = true;
      const targetTop = Math.max(
        0,
        activeEl.offsetTop - container.clientHeight / 2 + activeEl.clientHeight / 2
      );
      container.scrollTo({ top: targetTop, behavior: 'smooth' });

      if (scrollTimeoutRef.current) clearTimeout(scrollTimeoutRef.current);
      scrollTimeoutRef.current = setTimeout(() => {
        isProgrammaticScrollRef.current = false;
      }, 450);
    }
  }, [activeLyricIndex, autoScroll, userHasScrolledAway, viewMode]);

  // Handle user manual scroll: reveal floating "Resume Sync" button if scrolled away
  const handleScroll = () => {
    if (isProgrammaticScrollRef.current || viewMode !== 'synced' || activeLyricIndex < 0) return;
    const container = scrollContainerRef.current;
    if (!container) return;
    const activeEl = container.querySelector(`[data-lyric-line-idx="${activeLyricIndex}"]`);
    if (activeEl) {
      const activeMid = activeEl.offsetTop + activeEl.clientHeight / 2;
      const viewMid = container.scrollTop + container.clientHeight / 2;
      const dist = Math.abs(activeMid - viewMid);
      // If user scrolled more than 140px away from active line, flag scrolled away
      if (dist > 140) {
        setUserHasScrolledAway(true);
      } else {
        setUserHasScrolledAway(false);
      }
    }
  };

  // Scroll back to active line
  const handleResumeSync = () => {
    setUserHasScrolledAway(false);
    setAutoScroll(true);
    const container = scrollContainerRef.current;
    if (!container) return;
    const activeEl = container.querySelector(`[data-lyric-line-idx="${activeLyricIndex}"]`);
    if (activeEl) {
      isProgrammaticScrollRef.current = true;
      const targetTop = Math.max(
        0,
        activeEl.offsetTop - container.clientHeight / 2 + activeEl.clientHeight / 2
      );
      container.scrollTo({ top: targetTop, behavior: 'smooth' });
      setTimeout(() => {
        isProgrammaticScrollRef.current = false;
      }, 450);
    }
  };

  // Copy full lyrics text
  const handleCopyAll = () => {
    if (!lyricsData.lines?.length) return;
    let text = '';
    if (languageMode === 'romanized' && lyricsData.romanizedLines?.length > 0) {
      text = lyricsData.romanizedLines.join('\n');
    } else if (languageMode === 'translation' && lyricsData.translationLines?.length > 0) {
      text = lyricsData.translationLines.join('\n');
    } else {
      text = lyricsData.lines.map((l) => (typeof l === 'object' ? l.text : l)).join('\n');
    }

    if (text && navigator.clipboard) {
      navigator.clipboard.writeText(`${song?.title || 'Song'} - ${song?.singers || song?.artist || ''} Lyrics:\n\n${text}`);
      setCopiedAll(true);
      setTimeout(() => setCopiedAll(false), 2200);
    }
  };

  // Copy individual line / verse quote
  const handleCopyLine = (e, text, time) => {
    e.stopPropagation();
    if (!text || !navigator.clipboard) return;
    const quote = `"${text}"\n— ${song?.title || 'Song'} (${formatTime(time)})`;
    navigator.clipboard.writeText(quote);
    setCopiedLineIdx(text);
    setTimeout(() => setCopiedLineIdx(null), 2000);
  };

  // Submit manual refine search
  const handleRefineSearchSubmit = (e) => {
    e?.preventDefault();
    if (!refineTitle.trim()) return;
    setShowCustomModal(false);
    onSearchLyrics?.(refineTitle.trim(), refineArtist.trim());
  };

  // Submit pasted custom lyrics
  const handlePasteLyricsSubmit = (e) => {
    e?.preventDefault();
    const raw = pastedLyricsText.trim();
    if (!raw) return;

    let parsedLines = [];
    let isSynced = false;

    if (typeof parseLrcText === 'function' && raw.includes('[')) {
      parsedLines = parseLrcText(raw);
      if (parsedLines.length > 0) isSynced = true;
    }

    if (!isSynced) {
      const plain = raw.split(/\r?\n/).map((l) => l.trim()).filter(Boolean);
      parsedLines = typeof buildAutoSyncedLyrics === 'function'
        ? buildAutoSyncedLyrics(plain, duration || 210)
        : plain.map((text, i) => ({ time: i * 5, text }));
      isSynced = true;
    }

    onUpdateLyrics?.({
      loading: false,
      type: isSynced ? 'synced' : 'plain',
      isAutoSynced: !raw.includes('['),
      lines: parsedLines,
      rawText: raw,
      romanizedLines: [],
      translationLines: [],
      source: 'User Custom Studio Lyrics',
    });

    setShowCustomModal(false);
    setPastedLyricsText('');
  };

  // Filter lyrics if search query active
  const filteredIndices = useMemo(() => {
    if (!searchQuery.trim() || !lyricsData.lines?.length) return null;
    const q = searchQuery.toLowerCase();
    const matches = new Set();
    lyricsData.lines.forEach((lineObj, idx) => {
      const text = (typeof lineObj === 'object' ? lineObj.text : lineObj) || '';
      if (text.toLowerCase().includes(q)) {
        matches.add(idx);
      }
    });
    return matches;
  }, [searchQuery, lyricsData.lines]);

  // Typography font size mapping
  const sizeClasses = {
    compact: 'text-xs sm:text-sm leading-normal py-1.5',
    standard: 'text-sm sm:text-base leading-relaxed py-2',
    large: 'text-base sm:text-lg xl:text-xl leading-relaxed py-2.5',
    immersive: 'text-lg sm:text-2xl xl:text-3xl leading-snug py-3.5',
  }[lyricsFontSize] || 'text-base sm:text-lg leading-relaxed py-2.5';

  return (
    <div className="flex-1 flex flex-col h-full overflow-hidden relative select-none">
      {/* ─── Studio Lyrics Top Navigation & Control Deck ────────────────── */}
      <div className="pb-3 mb-2 border-b border-white/10 flex flex-col gap-2.5 flex-shrink-0">
        <div className="flex flex-wrap items-center justify-between gap-2">
          {/* Track Context & Synced Status (Zero-Pill Discipline: Unboxed clean metadata) */}
          <div className="flex items-center gap-2 min-w-0">
            <div className="w-8 h-8 rounded-xl bg-[var(--primary)]/15 border border-[var(--primary)]/30 flex items-center justify-center flex-shrink-0">
              <MicrophoneStage weight="duotone" className="w-4 h-4 text-[var(--primary)]" />
            </div>
            <div className="min-w-0">
              <div className="flex items-center gap-2 text-xs font-bold text-white truncate">
                <span>{song?.title || 'Lyrics Studio'}</span>
                <span className="text-white/30 hidden xs:inline" aria-hidden="true">·</span>
                <span className="text-[var(--text-light)] font-medium hidden xs:inline truncate">
                  {song?.singers || song?.artist || 'Master Track'}
                </span>
              </div>
              <div className="flex items-center gap-2 text-[11px] text-[var(--text-light)]/80 mt-0.5">
                <span className={lyricsData.type === 'synced' ? 'text-[var(--primary)] font-semibold' : ''}>
                  {lyricsData.loading
                    ? 'Syncing time-coded lyrics...'
                    : lyricsData.type === 'synced'
                    ? (lyricsData.source || 'Time-Synced Karaoke')
                    : 'Static Lyrics Mode'}
                </span>
                {lyricsData.lines?.length > 0 && (
                  <>
                    <span aria-hidden="true">·</span>
                    <span className="font-mono tabular-nums">{lyricsData.lines.length} lines</span>
                  </>
                )}
              </div>
            </div>
          </div>

          {/* Primary View Switcher (Segmented Controls) */}
          <div className="flex items-center gap-1.5 flex-wrap">
            {lyricsData.lines?.length > 0 && (
              <div className="flex items-center bg-black/40 p-1 rounded-xl border border-white/10">
                <button
                  type="button"
                  onClick={() => setViewMode('synced')}
                  className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer whitespace-nowrap ${
                    viewMode === 'synced'
                      ? 'bg-[var(--primary)] text-black shadow-sm'
                      : 'text-white/70 hover:text-white'
                  }`}
                  title="Interactive Karaoke Tracker"
                >
                  Karaoke
                </button>
                <button
                  type="button"
                  onClick={() => setViewMode('reader')}
                  className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer whitespace-nowrap ${
                    viewMode === 'reader'
                      ? 'bg-[var(--primary)] text-black shadow-sm'
                      : 'text-white/70 hover:text-white'
                  }`}
                  title="Full Editorial Verse Reader"
                >
                  Full Text
                </button>
              </div>
            )}

            {/* In-lyrics Search Trigger */}
            {lyricsData.lines?.length > 0 && (
              <button
                type="button"
                onClick={() => {
                  setShowSearchInput((v) => !v);
                  if (showSearchInput) setSearchQuery('');
                }}
                className={`w-9 h-9 rounded-xl border flex items-center justify-center transition-all cursor-pointer ${
                  showSearchInput || searchQuery
                    ? 'bg-[var(--primary)]/20 border-[var(--primary)]/50 text-[var(--primary)]'
                    : 'bg-white/5 border-white/10 text-white/70 hover:text-white hover:bg-white/10'
                }`}
                title="Search within lyrics"
                aria-label="Search within lyrics"
              >
                <MagnifyingGlass weight="bold" className="w-4 h-4" />
              </button>
            )}

            {/* Custom Lyrics / Refine Search Trigger */}
            <button
              type="button"
              onClick={() => setShowCustomModal(true)}
              className="w-9 h-9 rounded-xl bg-white/5 hover:bg-white/10 border border-white/10 text-white/75 hover:text-[var(--primary)] flex items-center justify-center transition-all cursor-pointer"
              title="Refine Search or Paste Custom Lyrics"
              aria-label="Edit or refine lyrics search"
            >
              <PencilSimple weight="bold" className="w-4 h-4" />
            </button>

            {/* Deep Search Live Button */}
            <button
              type="button"
              onClick={() => onSearchLyrics?.(song?.title, song?.singers || song?.artist)}
              disabled={isSearchingLyrics || lyricsData.loading}
              className="px-3 py-2 rounded-xl bg-[var(--primary)]/15 hover:bg-[var(--primary)]/25 border border-[var(--primary)]/35 text-[var(--primary)] text-xs font-bold flex items-center gap-1.5 transition-all cursor-pointer disabled:opacity-50 whitespace-nowrap"
              title="Fetch fresh real-time synced lyrics"
            >
              <Sparkle weight="fill" className={`w-3.5 h-3.5 ${isSearchingLyrics ? 'animate-spin' : ''}`} />
              <span className="hidden sm:inline">{isSearchingLyrics ? 'Syncing...' : 'Sync Lyrics'}</span>
            </button>
          </div>
        </div>

        {/* Expandable In-Lyrics Search Field */}
        {showSearchInput && (
          <div className="relative w-full">
            <MagnifyingGlass className="w-4 h-4 text-white/40 absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Type word or phrase to highlight and jump..."
              className="w-full pl-9 pr-9 py-2 rounded-xl bg-black/60 border border-[var(--primary)]/40 text-xs text-white placeholder:text-white/40 focus:outline-none focus:ring-1 focus:ring-[var(--primary)]"
              autoFocus
            />
            {searchQuery && (
              <button
                type="button"
                onClick={() => setSearchQuery('')}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-white/50 hover:text-white text-xs"
              >
                <X weight="bold" className="w-3.5 h-3.5" />
              </button>
            )}
            {searchQuery && filteredIndices && (
              <div className="absolute right-9 top-1/2 -translate-y-1/2 text-[10px] font-mono text-[var(--primary)] tabular-nums font-bold">
                {filteredIndices.size} {filteredIndices.size === 1 ? 'match' : 'matches'}
              </div>
            )}
          </div>
        )}

        {/* Secondary Utility Toolbar: Language Mode, Sync Calibration, Text Size & Alignment */}
        {lyricsData.lines?.length > 0 && (
          <div className="flex items-center justify-between gap-2 flex-wrap pt-1 text-xs">
            {/* Language Selector (Original / Romanized / English) */}
            <div className="flex items-center gap-1 flex-wrap">
              {(lyricsData.romanizedLines?.length > 0 || lyricsData.translationLines?.length > 0) && (
                <div className="flex items-center bg-black/30 p-0.5 rounded-lg border border-white/10 text-[11px] font-bold">
                  <button
                    type="button"
                    onClick={() => setLanguageMode('original')}
                    className={`px-2 py-1 rounded-md transition-all cursor-pointer ${
                      languageMode === 'original'
                        ? 'bg-[var(--primary)] text-black font-extrabold'
                        : 'text-white/70 hover:text-white'
                    }`}
                  >
                    Original
                  </button>
                  {lyricsData.romanizedLines?.length > 0 && (
                    <button
                      type="button"
                      onClick={() => setLanguageMode('romanized')}
                      className={`px-2 py-1 rounded-md transition-all cursor-pointer ${
                        languageMode === 'romanized'
                          ? 'bg-[var(--primary)] text-black font-extrabold'
                          : 'text-white/70 hover:text-white'
                      }`}
                    >
                      Romanized
                    </button>
                  )}
                  {lyricsData.translationLines?.length > 0 && (
                    <button
                      type="button"
                      onClick={() => setLanguageMode('translation')}
                      className={`px-2 py-1 rounded-md transition-all cursor-pointer ${
                        languageMode === 'translation'
                          ? 'bg-[var(--primary)] text-black font-extrabold'
                          : 'text-white/70 hover:text-white'
                      }`}
                    >
                      English
                    </button>
                  )}
                </div>
              )}

              {/* Sync Calibration (-0.5s / +0.5s) */}
              {lyricsData.type === 'synced' && viewMode === 'synced' && (
                <div className="flex items-center bg-black/40 p-0.5 rounded-xl border border-white/10 text-[10px] font-mono font-bold">
                  <button
                    type="button"
                    onClick={() => setSyncOffset((o) => Math.round((o - 0.5) * 10) / 10)}
                    className="px-2 py-1 text-white/75 hover:text-[var(--primary)] active:scale-95 cursor-pointer rounded-lg hover:bg-white/5"
                    title="Delay lyrics by 0.5s"
                  >
                    -0.5s
                  </button>
                  <button
                    type="button"
                    onClick={() => setSyncOffset(0)}
                    className="px-2 py-1 text-[var(--primary)] cursor-pointer hover:underline"
                    title="Reset sync offset"
                  >
                    {syncOffset === 0 ? '0.0s' : `${syncOffset > 0 ? '+' : ''}${syncOffset.toFixed(1)}s`}
                  </button>
                  <button
                    type="button"
                    onClick={() => setSyncOffset((o) => Math.round((o + 0.5) * 10) / 10)}
                    className="px-2 py-1 text-white/75 hover:text-[var(--primary)] active:scale-95 cursor-pointer rounded-lg hover:bg-white/5"
                    title="Advance lyrics by 0.5s"
                  >
                    +0.5s
                  </button>
                </div>
              )}
            </div>

            {/* Typography Controls & Copy Action */}
            <div className="flex items-center gap-1.5 ml-auto">
              {/* Text Alignment */}
              <div className="hidden xs:flex items-center bg-black/40 p-0.5 rounded-xl border border-white/10">
                <button
                  type="button"
                  onClick={() => setTextAlign('left')}
                  className={`p-1.5 rounded-lg transition-colors cursor-pointer ${
                    textAlign === 'left' ? 'bg-white/15 text-[var(--primary)]' : 'text-white/50 hover:text-white'
                  }`}
                  title="Align Left"
                >
                  <TextAlignLeft weight="bold" className="w-3.5 h-3.5" />
                </button>
                <button
                  type="button"
                  onClick={() => setTextAlign('center')}
                  className={`p-1.5 rounded-lg transition-colors cursor-pointer ${
                    textAlign === 'center' ? 'bg-white/15 text-[var(--primary)]' : 'text-white/50 hover:text-white'
                  }`}
                  title="Align Center"
                >
                  <TextAlignCenter weight="bold" className="w-3.5 h-3.5" />
                </button>
              </div>

              {/* Font Size Cycle */}
              <button
                type="button"
                onClick={() => {
                  const sizes = ['compact', 'standard', 'large', 'immersive'];
                  const next = sizes[(sizes.indexOf(lyricsFontSize) + 1) % sizes.length];
                  setLyricsFontSize(next);
                }}
                className="h-8 px-2.5 rounded-xl bg-white/5 hover:bg-white/10 border border-white/10 text-[11px] font-bold text-white/80 flex items-center gap-1 cursor-pointer transition-colors"
                title="Change Lyric Font Size"
              >
                <TextT weight="bold" className="w-3.5 h-3.5 text-[var(--primary)]" />
                <span className="uppercase text-[10px] font-mono">{lyricsFontSize}</span>
              </button>

              {/* Copy Full Lyrics */}
              <button
                type="button"
                onClick={handleCopyAll}
                className="h-8 px-2.5 rounded-xl bg-white/5 hover:bg-white/10 border border-white/10 text-[11px] font-bold text-white/80 flex items-center gap-1 cursor-pointer transition-colors"
                title="Copy complete lyrics with credits"
              >
                {copiedAll ? (
                  <Check weight="bold" className="w-3.5 h-3.5 text-emerald-400" />
                ) : (
                  <Copy weight="duotone" className="w-3.5 h-3.5 text-[var(--primary)]" />
                )}
                <span>{copiedAll ? 'Copied' : 'Copy'}</span>
              </button>
            </div>
          </div>
        )}
      </div>

      {/* ─── Ambient Backdrop Diffusion ─────────────────────────────────── */}
      <div className="absolute inset-0 pointer-events-none overflow-hidden opacity-20">
        <div className="absolute top-1/4 left-1/2 -translate-x-1/2 w-80 h-80 rounded-full bg-[var(--primary)] blur-3xl" />
      </div>

      {/* ─── Scrollable Lyrics Canvas ───────────────────────────────────── */}
      <div
        ref={scrollContainerRef}
        onScroll={handleScroll}
        className={`flex-1 overflow-y-auto px-2 sm:px-4 py-6 custom-scrollbar relative z-10 transition-all ${
          textAlign === 'left' ? 'text-left' : 'text-center'
        }`}
      >
        {lyricsData.loading ? (
          <div className="h-full min-h-[220px] flex flex-col items-center justify-center gap-3 text-center py-12">
            <div className="w-10 h-10 rounded-full border-2 border-[var(--primary)] border-t-transparent animate-spin" />
            <p className="text-sm font-bold text-white">Connecting with Lyrics Engine...</p>
            <p className="text-xs text-[var(--text-light)]">Fetching studio time-codes and verified stanzas</p>
          </div>
        ) : lyricsData.lines?.length > 0 ? (
          <div className={`space-y-2 max-w-3xl mx-auto ${textAlign === 'center' ? 'items-center' : 'items-start'}`}>
            {lyricsData.lines.map((lineObj, idx) => {
              const rawLine = typeof lineObj === 'object' ? lineObj.text : lineObj;
              const displayLine =
                languageMode === 'romanized' && lyricsData.romanizedLines?.[idx]
                  ? lyricsData.romanizedLines[idx]
                  : languageMode === 'translation' && lyricsData.translationLines?.[idx]
                  ? lyricsData.translationLines[idx]
                  : rawLine;

              const isSynced = lyricsData.type === 'synced' && viewMode === 'synced';
              const isCurrent = isSynced && idx === activeLyricIndex;
              const isPast = isSynced && idx < activeLyricIndex;
              const isFuture = isSynced && idx > activeLyricIndex;
              const isMatch = filteredIndices ? filteredIndices.has(idx) : false;

              return (
                <div
                  key={idx}
                  data-lyric-line-idx={idx}
                  onClick={() => {
                    if (isSynced && typeof lineObj.time === 'number') {
                      seekTo(Math.max(0, lineObj.time - syncOffset));
                    }
                  }}
                  className={`group relative rounded-2xl px-4 transition-all duration-300 ${sizeClasses} ${
                    isSynced ? 'cursor-pointer' : ''
                  } ${
                    isCurrent
                      ? 'bg-[var(--primary)]/15 border border-[var(--primary)]/35 text-[var(--primary)] font-extrabold shadow-[0_0_30px_rgba(83,242,224,0.2)] scale-[1.02]'
                      : isPast
                      ? 'text-white/40 hover:text-white/80 font-medium'
                      : isFuture
                      ? 'text-white/70 hover:text-white font-medium'
                      : 'text-white/85 font-medium'
                  } ${isMatch ? 'ring-1 ring-[var(--primary)]/70 bg-[var(--primary)]/10' : ''}`}
                >
                  <div className={`flex items-center gap-3 ${textAlign === 'center' ? 'justify-between' : 'justify-start'}`}>
                    {/* Hover Jump Indicator with Play Icon (Left slot on left-aligned, hidden on center) */}
                    {isSynced && typeof lineObj.time === 'number' && textAlign === 'left' && (
                      <span className="opacity-0 group-hover:opacity-100 transition-opacity text-[10px] font-mono text-[var(--primary)] flex items-center gap-1 flex-shrink-0">
                        <Play weight="fill" className="w-3 h-3 text-[var(--primary)]" />
                        <span className="tabular-nums">{formatTime(Math.max(0, lineObj.time - syncOffset))}</span>
                      </span>
                    )}

                    {/* Lyric Text Content */}
                    <span className="flex-1 break-words font-display tracking-tight">
                      {displayLine}
                    </span>

                    {/* Right Action Cluster on Hover: Timestamp & One-click Verse Copy */}
                    <div className="flex items-center gap-2 flex-shrink-0">
                      {isSynced && typeof lineObj.time === 'number' && (
                        <span
                          className={`text-[10px] font-mono tabular-nums transition-opacity ${
                            isCurrent
                              ? 'text-[var(--primary)] font-bold opacity-90'
                              : 'text-white/40 opacity-40 group-hover:opacity-100'
                          }`}
                        >
                          {formatTime(Math.max(0, lineObj.time - syncOffset))}
                        </span>
                      )}

                      {/* Micro Quote Copy Button */}
                      <button
                        type="button"
                        onClick={(e) => handleCopyLine(e, displayLine, lineObj.time || 0)}
                        className="opacity-0 group-hover:opacity-80 hover:!opacity-100 p-1 rounded-lg text-white/60 hover:text-white hover:bg-white/10 transition-all cursor-pointer"
                        title="Copy this lyric line"
                      >
                        {copiedLineIdx === displayLine ? (
                          <Check weight="bold" className="w-3.5 h-3.5 text-emerald-400" />
                        ) : (
                          <Copy weight="bold" className="w-3.5 h-3.5" />
                        )}
                      </button>
                    </div>
                  </div>

                  {/* Active Line Intra-Line Vocal Progress Track */}
                  {isCurrent && (
                    <div className="w-full max-w-xs mx-auto h-1 bg-white/15 rounded-full overflow-hidden mt-2">
                      <div
                        style={{ width: `${activeLyricProgress}%` }}
                        className="h-full bg-gradient-to-r from-[var(--primary)] to-cyan-300 transition-all duration-150"
                      />
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        ) : (
          /* Empty State when no lyrics found */
          <div className="h-full min-h-[220px] flex flex-col items-center justify-center gap-3 text-center py-10 px-4">
            <div className="w-14 h-14 rounded-2xl bg-white/5 border border-white/10 flex items-center justify-center text-white/40 mb-1">
              <MicrophoneStage weight="duotone" className="w-7 h-7" />
            </div>
            <h3 className="text-base font-bold text-white">No Verified Lyrics Found</h3>
            <p className="text-xs text-[var(--text-light)] max-w-sm leading-relaxed">
              We couldn't automatically match synchronized lyrics for "{song?.title}". Refine the search title or paste your own lyrics below.
            </p>
            <div className="flex items-center gap-2 mt-2 flex-wrap justify-center">
              <button
                type="button"
                onClick={() => onSearchLyrics?.(song?.title, song?.singers || song?.artist)}
                disabled={isSearchingLyrics}
                className="px-4 py-2 rounded-xl bg-[var(--primary)] text-black text-xs font-bold flex items-center gap-1.5 shadow-md hover:brightness-110 cursor-pointer"
              >
                <Sparkle weight="fill" className="w-3.5 h-3.5" />
                <span>{isSearchingLyrics ? 'Searching...' : 'Retry Google Grounding'}</span>
              </button>
              <button
                type="button"
                onClick={() => {
                  setCustomModalTab('refine');
                  setShowCustomModal(true);
                }}
                className="px-4 py-2 rounded-xl bg-white/10 hover:bg-white/15 border border-white/15 text-white text-xs font-bold flex items-center gap-1.5 cursor-pointer"
              >
                <PencilSimple weight="bold" className="w-3.5 h-3.5 text-[var(--primary)]" />
                <span>Refine Search</span>
              </button>
              <button
                type="button"
                onClick={() => {
                  setCustomModalTab('paste');
                  setShowCustomModal(true);
                }}
                className="px-4 py-2 rounded-xl bg-white/10 hover:bg-white/15 border border-white/15 text-white text-xs font-bold flex items-center gap-1.5 cursor-pointer"
              >
                <span>Paste Custom Lyrics</span>
              </button>
            </div>
          </div>
        )}
      </div>

      {/* ─── Floating "Resume Sync" Indicator Pill ───────────────────────── */}
      {userHasScrolledAway && viewMode === 'synced' && activeLyricIndex >= 0 && (
        <div className="absolute bottom-4 left-1/2 -translate-x-1/2 z-20">
          <button
            type="button"
            onClick={handleResumeSync}
            className="px-4 py-2 rounded-full bg-[var(--primary)] text-black font-extrabold text-xs flex items-center gap-2 shadow-[0_8px_25px_rgba(83,242,224,0.45)] hover:brightness-110 active:scale-95 transition-all cursor-pointer"
          >
            <Waveform weight="bold" className="w-4 h-4 animate-pulse" />
            <span>Resume Live Karaoke</span>
            <span className="font-mono tabular-nums bg-black/15 px-1.5 py-0.5 rounded-md text-[10px]">
              {formatTime(currentTime)}
            </span>
          </button>
        </div>
      )}

      {/* ─── Refine Search & Custom Lyrics Modal ─────────────────────────── */}
      {showCustomModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/75 backdrop-blur-sm animate-in fade-in duration-200">
          <div className="bg-[#12181c] border border-white/15 rounded-3xl p-6 w-full max-w-md shadow-2xl relative">
            <div className="flex items-center justify-between pb-3 mb-4 border-b border-white/10">
              <div className="flex items-center gap-2">
                <Microphone weight="duotone" className="w-5 h-5 text-[var(--primary)]" />
                <h3 className="text-base font-bold text-white">Lyrics Studio Helper</h3>
              </div>
              <button
                type="button"
                onClick={() => setShowCustomModal(false)}
                className="w-8 h-8 rounded-xl bg-white/5 hover:bg-white/10 text-white/70 hover:text-white flex items-center justify-center cursor-pointer"
              >
                <X weight="bold" className="w-4 h-4" />
              </button>
            </div>

            {/* Modal Tabs */}
            <div className="flex items-center p-1 bg-black/40 rounded-xl border border-white/10 mb-4">
              <button
                type="button"
                onClick={() => setCustomModalTab('refine')}
                className={`flex-1 py-1.5 text-xs font-bold rounded-lg transition-colors cursor-pointer ${
                  customModalTab === 'refine' ? 'bg-[var(--primary)] text-black' : 'text-white/70 hover:text-white'
                }`}
              >
                Refine Query
              </button>
              <button
                type="button"
                onClick={() => setCustomModalTab('paste')}
                className={`flex-1 py-1.5 text-xs font-bold rounded-lg transition-colors cursor-pointer ${
                  customModalTab === 'paste' ? 'bg-[var(--primary)] text-black' : 'text-white/70 hover:text-white'
                }`}
              >
                Paste Lyrics
              </button>
            </div>

            {customModalTab === 'refine' ? (
              <form onSubmit={handleRefineSearchSubmit} className="space-y-3.5">
                <p className="text-xs text-[var(--text-light)]">
                  If the YouTube title has noise or featured artists causing a search mismatch, adjust the title and artist below:
                </p>
                <div>
                  <label className="text-[11px] font-bold text-white/70 block mb-1">Song Title</label>
                  <input
                    type="text"
                    value={refineTitle}
                    onChange={(e) => setRefineTitle(e.target.value)}
                    placeholder="e.g. Kesariya"
                    className="w-full px-3.5 py-2.5 rounded-xl bg-white/5 border border-white/10 text-sm text-white focus:outline-none focus:border-[var(--primary)]"
                    required
                  />
                </div>
                <div>
                  <label className="text-[11px] font-bold text-white/70 block mb-1">Artist / Singer</label>
                  <input
                    type="text"
                    value={refineArtist}
                    onChange={(e) => setRefineArtist(e.target.value)}
                    placeholder="e.g. Arijit Singh"
                    className="w-full px-3.5 py-2.5 rounded-xl bg-white/5 border border-white/10 text-sm text-white focus:outline-none focus:border-[var(--primary)]"
                  />
                </div>
                <div className="flex items-center justify-end gap-2 pt-2">
                  <button
                    type="button"
                    onClick={() => setShowCustomModal(false)}
                    className="px-4 py-2 rounded-xl bg-white/5 text-white/80 hover:text-white text-xs font-bold cursor-pointer"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    className="px-4 py-2 rounded-xl bg-[var(--primary)] text-black text-xs font-bold flex items-center gap-1.5 shadow-md hover:brightness-110 cursor-pointer"
                  >
                    <Sparkle weight="fill" className="w-3.5 h-3.5" />
                    <span>Search Lyrics</span>
                  </button>
                </div>
              </form>
            ) : (
              <form onSubmit={handlePasteLyricsSubmit} className="space-y-3.5">
                <p className="text-xs text-[var(--text-light)]">
                  Paste plain lyrics or timestamped LRC lines (e.g. <code>[00:15.20] Lyric line</code>). Plain text will be automatically calibrated to song duration.
                </p>
                <div>
                  <textarea
                    rows={8}
                    value={pastedLyricsText}
                    onChange={(e) => setPastedLyricsText(e.target.value)}
                    placeholder="Paste your lyrics here..."
                    className="w-full px-3.5 py-2.5 rounded-xl bg-white/5 border border-white/10 text-xs text-white placeholder:text-white/30 focus:outline-none focus:border-[var(--primary)] custom-scrollbar font-mono"
                    required
                  />
                </div>
                <div className="flex items-center justify-end gap-2 pt-2">
                  <button
                    type="button"
                    onClick={() => setShowCustomModal(false)}
                    className="px-4 py-2 rounded-xl bg-white/5 text-white/80 hover:text-white text-xs font-bold cursor-pointer"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    className="px-4 py-2 rounded-xl bg-[var(--primary)] text-black text-xs font-bold flex items-center gap-1.5 shadow-md hover:brightness-110 cursor-pointer"
                  >
                    <Check weight="bold" className="w-3.5 h-3.5" />
                    <span>Save & Sync Lyrics</span>
                  </button>
                </div>
              </form>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
