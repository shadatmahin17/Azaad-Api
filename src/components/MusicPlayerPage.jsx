import React, { useState, useEffect, useRef, useMemo } from 'react';
import { APP_LOGO_URL } from '../config/env';
import {
  Play,
  Pause,
  SkipBack,
  SkipForward,
  Shuffle,
  Repeat,
  RepeatOnce,
  SpeakerHigh,
  SpeakerSlash,
  SpeakerLow,
  Heart,
  Playlist,
  VinylRecord,
  MicrophoneStage,
  YoutubeLogo,
  ShareNetwork,
  Check,
  CaretDown,
  ArrowLeft,
  MusicNotes,
  Fire,
  MagnifyingGlass,
  CheckCircle,
  SlidersHorizontal,
  ArrowCounterClockwise,
  ArrowClockwise,
  Microphone,
  BookOpenText,
  Plus,
  Clock,
  Timer,
  Gauge,
  Broadcast,
  Translate,
  Sparkle,
  Copy,
  TextT,
  FastForward,
  Rewind,
  ArrowsClockwise,
  Waveform,
  Faders,
  Disc,
} from '@phosphor-icons/react';
import { fetchGoogleSearchLyrics } from '../services/musicService';
import { formatTime, mediaUrl, handleCoverImageError as handleCoverError } from '../utils/musicUtils';
import { LikeHeartButton } from './SongCard';

// Deterministic pseudo-spectrum bars for interactive audio visualizer
const SPECTRUM_BARS = [
  0.38, 0.62, 0.85, 0.54, 0.92, 0.74, 0.48, 0.88,
  0.96, 0.66, 0.79, 0.58, 0.91, 0.72, 0.84, 0.45,
  0.69, 0.94, 0.61, 0.77, 0.52, 0.86, 0.64, 0.42,
];

// Verified real lyrics database for popular global & regional tracks
const VERIFIED_POPULAR_LYRICS = {
  'kesariya': {
    type: 'synced',
    lines: [
      { time: 5, text: "Mujhko itna bataaye koi..." },
      { time: 14, text: "Kaise tujhse dil na lagaaye koi..." },
      { time: 24, text: "Rabba ne tujhko banane mein, kar di hai husn ki khaali tijoriyaan" },
      { time: 38, text: "Kajal ki siyaahi se likhi hai tune jaane kitno ki love storiyaan" },
      { time: 52, text: "Kesariya tera ishq hai piya..." },
      { time: 64, text: "Rang jaaun jo main haath lagaun" },
      { time: 76, text: "Din beete saara teri fikr mein" },
      { time: 88, text: "Rain saari teri khair manaun..." },
      { time: 104, text: "Kesariya tera ishq hai piya..." },
      { time: 122, text: "Patjhad ke mausam mein bhi rangeen bahaar aayi" },
      { time: 140, text: "Jab se naino ne tere naina chhoo liye..." },
    ],
  },
  'tum hi ho': {
    type: 'synced',
    lines: [
      { time: 4, text: "Hum tere bin ab reh nahi sakte..." },
      { time: 14, text: "Tere bina kya wajood mera..." },
      { time: 25, text: "Tujhse juda agar ho jaayenge" },
      { time: 34, text: "Toh khud se hi ho jaayenge judaa..." },
      { time: 46, text: "Kyunki tum hi ho, ab tum hi ho" },
      { time: 58, text: "Zindagi ab tum hi ho..." },
      { time: 69, text: "Chain bhi, mera dard bhi" },
      { time: 81, text: "Meri aashiqui ab tum hi ho..." },
      { time: 98, text: "Tera mera rishta hai kaisa, ik pal door gawaara nahi" },
      { time: 114, text: "Tere liye har roz hai jeete, tujh ko diya mera waqt sabhi..." },
    ],
  },
  'apna bana le': {
    type: 'synced',
    lines: [
      { time: 6, text: "Tu mera koi na hoke bhi kuch laage..." },
      { time: 17, text: "Kiya re jo bhi tune kaise kiya re..." },
      { time: 29, text: "Ziya ko mere baandh aise liya re" },
      { time: 40, text: "Samajh ke bhi na samjhe dil ye mera..." },
      { time: 53, text: "Apna bana le piya, apna bana le piya" },
      { time: 65, text: "Dil ke nagar mein shehar tu basa le piya..." },
      { time: 79, text: "Chhune se tere haan tere haan tere" },
      { time: 92, text: "Feeki padoon na main jiyun tere sadke..." },
    ],
  },
  'channa mereya': {
    type: 'synced',
    lines: [
      { time: 4, text: "Achha chalta hoon, duaon mein yaad rakhna" },
      { time: 15, text: "Mere zikr ka zubaan pe swaad rakhna..." },
      { time: 27, text: "Dil ke sandookon mein mere achhe kaam rakhna" },
      { time: 38, text: "Chitthi taaron mein bhi mera tu salaam rakhna..." },
      { time: 52, text: "Andhera tera maine le liya, mera ujla sitaara tere naam kiya" },
      { time: 68, text: "Channa mereya mereya, channa mereya mereya" },
      { time: 80, text: "Channa mereya mereya beliya, O piya..." },
      { time: 98, text: "Tere rukh se apna rasta mod ke chala..." },
    ],
  },
};

// Echo-Music Multi-Source Synchronized Lyrics Registry (:lyrics + 6 Provider Modules)
const ECHO_LYRICS_PROVIDER_OPTIONS = [
  { id: 'auto', label: 'Auto (6 Sources)' },
  { id: 'YouLyPlus', label: 'YouLyPlus' },
  { id: 'Paxsenix', label: 'PaxSenix' },
  { id: 'BetterLyrics', label: 'Better Lyrics' },
  { id: 'SimpMusic', label: 'SimpMusic' },
  { id: 'LrcLib', label: 'LrcLib' },
  { id: 'Kugou', label: 'KuGou' },
];

// LRC / ELRC / Rich-Sync Parser helper (supports YouLyPlus, PaxSenix, BetterLyrics, SimpMusic, LrcLib, KuGou)
const parseLrcText = (lrcString) => {
  if (!lrcString || typeof lrcString !== 'string') return [];
  const lines = lrcString.split(/\r?\n/);
  const result = [];
  const timeRegex = /\[(\d{1,2}):(\d{2})(?:\.(\d{1,3}))?\]/g;

  for (const line of lines) {
    const trimmed = line.trim();
    if (!trimmed || /^<[^>]+>$/.test(trimmed)) continue;
    const matches = [...trimmed.matchAll(timeRegex)];
    const text = trimmed
      .replace(timeRegex, '')
      .replace(/<\d{1,2}:\d{2}(?:\.\d{1,3})?>/g, ' ')
      .replace(/\{(?:bg|agent:[^}]+)\}/gi, '')
      .replace(/\s+/g, ' ')
      .trim();

    if (matches.length > 0 && text) {
      for (const m of matches) {
        const min = parseInt(m[1], 10);
        const sec = parseInt(m[2], 10);
        const msStr = (m[3] || '0').padEnd(3, '0').slice(0, 3);
        const ms = parseInt(msStr, 10) / 1000;
        const time = min * 60 + sec + ms;
        result.push({ time: Math.round(time * 100) / 100, text });
      }
    }
  }

  return result.sort((a, b) => a.time - b.time);
};

// Converts plain lyric lines into proportional time-synced lines across song duration
const buildAutoSyncedLyrics = (plainLines = [], durationSec = 210) => {
  const clean = plainLines.map((l) => (typeof l === 'object' ? l.text : String(l || '')).trim()).filter(Boolean);
  if (clean.length === 0) return [];
  const totalDur = Math.max(45, Number(durationSec) || 210);
  const startOffset = Math.min(6, Math.round(totalDur * 0.035 * 10) / 10);
  const usableSpan = Math.max(20, totalDur * 0.91 - startOffset);
  const weights = clean.map((line) => Math.max(4, Math.min(28, line.length)));
  const totalWeight = weights.reduce((acc, w) => acc + w, 0) || clean.length;

  let cursor = startOffset;
  return clean.map((text, idx) => {
    const time = Math.round(cursor * 100) / 100;
    cursor += (weights[idx] / totalWeight) * usableSpan;
    return { time, text };
  });
};

// Normalize YouTube/streaming track title and artist for accurate LRCLIB matching
const normalizeLyricsQuery = (rawTitle = '', rawArtist = '') => {
  const strip = (s) =>
    String(s || '')
      .replace(/\s*[\(\[][^\)\]]*(?:official|video|audio|lyric|lyrics|visualizer|mv|hd|4k|hq|full\s*song|remaster|live|prod\.|feat\.|ft\.)[^\)\]]*[\)\]]/gi, ' ')
      .replace(/\|.*$/g, ' ')
      .replace(/\b(?:official\s*(?:music\s*)?(?:video|audio|lyric\s*video)|full\s*(?:video|audio|song)|lyric\s*video|audio\s*song|4k\s*uhd)\b/gi, ' ')
      .replace(/\s+(?:ft\.?|feat\.?|featuring)\s+.*$/i, '')
      .replace(/\s+/g, ' ')
      .trim();

  let cleanTitle = strip(rawTitle);
  let cleanArtist = strip(rawArtist)
    .replace(/\s*-\s*topic$/i, '')
    .replace(/\b(?:vevo|official|music|records|entertainment|series|studios)\b/gi, '')
    .split(/[,&/]|(?:\s+(?:x|vs\.?)\s+)/i)[0]
    .trim();

  const dashParts = cleanTitle.split(/\s+[-–—:]\s+/);
  if (dashParts.length >= 2) {
    const left = dashParts[0].trim();
    const right = dashParts.slice(1).join(' - ').trim();
    if (
      left &&
      right &&
      (!cleanArtist ||
        cleanArtist.toLowerCase() === 'youtube music' ||
        cleanTitle.toLowerCase().startsWith(cleanArtist.toLowerCase()))
    ) {
      if (!cleanArtist || cleanArtist.toLowerCase() === 'youtube music') {
        cleanArtist = left.split(/[,&/]/)[0].trim();
      }
      cleanTitle = right;
    }
  }

  return {
    cleanTitle: cleanTitle || rawTitle.trim(),
    cleanArtist: cleanArtist || rawArtist.trim(),
  };
};

// Global in-memory cache for real lyrics
const lyricsCache = new Map();

export default function MusicPlayerPage({
  song,
  songs = [],
  initialTab = null,
  onClearInitialTab = () => {},
  playback = {},
  onSelectSong,
  onPlaySong,
  isLiked = false,
  onToggleFavorite,
  onAddToPlaylist,
  onBack,
  allSongs = [],
  subscribedSeries = [],
  onToggleSubscription = () => {},
}) {
  const handleSelectSong = (track) => {
    if (!track) return;
    if (typeof onSelectSong === 'function') {
      onSelectSong(track);
    } else if (typeof onPlaySong === 'function') {
      onPlaySong(track);
    }
  };

  const isPodcast = Boolean(song?.isPodcast || song?.source === 'podcast' || song?.seriesId);
  const [activeTab, setActiveTab] = useState('art'); // 'art' | 'lyrics' | 'notes' | 'queue'
  const [podcastBookmarks, setPodcastBookmarks] = useState([]);

  // Sync initialTab when opened from PlayerBar "Chapters" button, and ensure valid tab on track type switch
  useEffect(() => {
    if (initialTab) {
      setActiveTab(initialTab);
      onClearInitialTab?.();
    } else if (isPodcast && activeTab === 'lyrics') {
      setActiveTab('notes');
    } else if (!isPodcast && activeTab === 'notes') {
      setActiveTab('art');
    }
  }, [initialTab, isPodcast, song?.id]);

  // Load saved bookmarks for current podcast episode
  useEffect(() => {
    if (!isPodcast || !song?.id || typeof window === 'undefined') {
      setPodcastBookmarks([]);
      return;
    }
    try {
      const raw = localStorage.getItem('azaad_podcast_bookmarks_v1');
      const map = raw ? JSON.parse(raw) : {};
      setPodcastBookmarks(Array.isArray(map[song.id]) ? map[song.id] : []);
    } catch {
      setPodcastBookmarks([]);
    }
  }, [isPodcast, song?.id]);
  const [copiedLink, setCopiedLink] = useState(false);
  const [searchQueue, setSearchQueue] = useState('');
  const [vinylMode, setVinylMode] = useState(true); // Toggle between Vinyl Turntable and Studio Sleeve
  const [lyricsData, setLyricsData] = useState({
    loading: false,
    type: 'none',
    lines: [],
    rawText: '',
    romanizedLines: [],
    translationLines: [],
    language: '',
    source: '',
  });
  const [lyricsLanguageMode, setLyricsLanguageMode] = useState('original'); // 'original' | 'romanized' | 'translation'
  const [selectedLyricsProvider, setSelectedLyricsProvider] = useState('auto'); // 'auto' | 'YouLyPlus' | 'Paxsenix' | 'BetterLyrics' | 'SimpMusic' | 'LrcLib' | 'Kugou'
  const [syncOffset, setSyncOffset] = useState(0); // In seconds: e.g. -0.5, 0, +0.5
  const [lyricsFontSize, setLyricsFontSize] = useState('normal'); // 'normal' | 'large' | 'xl'
  const [autoScroll, setAutoScroll] = useState(true);
  const [copiedLyrics, setCopiedLyrics] = useState(false);
  const [isSearchingGoogleLyrics, setIsSearchingGoogleLyrics] = useState(false);
  const [showMobileVolume, setShowMobileVolume] = useState(false);
  const [showSpeedMenu, setShowSpeedMenu] = useState(false);
  const [showSleepMenu, setShowSleepMenu] = useState(false);
  const [sleepSecondsLeft, setSleepSecondsLeft] = useState(null);
  const [sleepTimerOption, setSleepTimerOption] = useState(null);

  const lyricsContainerRef = useRef(null);
  const mobileLyricsContainerRef = useRef(null);
  const seekBarRef = useRef(null);
  const [isHoveringSeek, setIsHoveringSeek] = useState(false);
  const [isDraggingSeek, setIsDraggingSeek] = useState(false);
  const [hoverSeekTime, setHoverSeekTime] = useState(0);

  // Check if series is subscribed
  const isSubscribed = Boolean(
    song?.seriesId &&
    subscribedSeries?.some((s) => String(s.seriesId || s.id) === String(song.seriesId))
  );

  // Lock body scroll on mobile only when active song full-screen overlay is open
  useEffect(() => {
    if (!song) return undefined;
    const origOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => {
      document.body.style.overflow = origOverflow;
    };
  }, [song]);

  const {
    isPlaying = false,
    currentTime = 0,
    duration = 0,
    bufferedProgress = 0,
    volume = 1,
    isMuted = false,
    isShuffled = false,
    repeatMode = 'off',
    playbackEngine = 'audio',
    activeYtId = null,
    showVideo = false,
    resolvingStatus = null,
    audioError = false,
    playbackRate = 1,
    setPlaybackRate = () => {},
    skipBackwardSeconds = (secs = 15) => {
      const target = Math.max(0, currentTime - secs);
      seekTo(target);
    },
    skipForwardSeconds = (secs = 30) => {
      const dur = duration || song?.duration || 0;
      const target = Math.min(dur || (currentTime + secs), currentTime + secs);
      seekTo(target);
    },
    togglePlay = () => {},
    playNext = () => {},
    playPrev = () => {},
    seekTo = () => {},
    setVolumeLevel = () => {},
    toggleMute = () => {},
    toggleShuffle = () => {},
    cycleRepeat = () => {},
    toggleVideo = () => {},
    setShowVideo = () => {},
  } = playback;

  // Sleep Timer countdown effect
  useEffect(() => {
    if (!sleepSecondsLeft || sleepSecondsLeft <= 0) return;
    const interval = setInterval(() => {
      setSleepSecondsLeft((prev) => {
        if (!prev || prev <= 1) {
          clearInterval(interval);
          if (isPlaying) togglePlay();
          setSleepTimerOption(null);
          return null;
        }
        return prev - 1;
      });
    }, 1000);
    return () => clearInterval(interval);
  }, [sleepSecondsLeft, isPlaying, togglePlay]);

  const handleSetSleepTimer = (mins) => {
    if (!mins) {
      setSleepTimerOption(null);
      setSleepSecondsLeft(null);
    } else {
      setSleepTimerOption(mins);
      setSleepSecondsLeft(mins * 60);
    }
    setShowSleepMenu(false);
  };

  // Find active chapter based on current playback time
  const activeChapterIndex = useMemo(() => {
    if (!song?.chapters || !song.chapters.length) return -1;
    let idx = -1;
    for (let i = 0; i < song.chapters.length; i++) {
      if (currentTime >= song.chapters[i].time) {
        idx = i;
      } else {
        break;
      }
    }
    return idx;
  }, [song?.chapters, currentTime]);

  const activeChapter = useMemo(() => {
    if (activeChapterIndex < 0 || !song?.chapters?.[activeChapterIndex]) return null;
    return song.chapters[activeChapterIndex];
  }, [song?.chapters, activeChapterIndex]);

  const hoverChapterTitle = useMemo(() => {
    if (!isPodcast || !song?.chapters?.length) return null;
    let ch = song.chapters[0];
    for (let i = 0; i < song.chapters.length; i++) {
      if (hoverSeekTime >= song.chapters[i].time) {
        ch = song.chapters[i];
      } else {
        break;
      }
    }
    return ch?.title || null;
  }, [isPodcast, song?.chapters, hoverSeekTime]);

  const jumpToChapterOffset = (delta) => {
    if (!song?.chapters?.length) return;
    const nextIdx = Math.max(0, Math.min(song.chapters.length - 1, (activeChapterIndex < 0 ? 0 : activeChapterIndex) + delta));
    const targetCh = song.chapters[nextIdx];
    if (targetCh && typeof targetCh.time === 'number') {
      seekTo(targetCh.time);
    }
  };

  const handleAddPodcastBookmark = () => {
    if (!isPodcast || !song?.id) return;
    const label = activeChapter?.title
      ? `${activeChapter.title}`
      : `Insight at ${formatTime(currentTime)}`;
    const newBm = {
      id: `${Date.now()}`,
      time: Math.floor(currentTime),
      label,
    };
    const updated = [...podcastBookmarks, newBm].sort((a, b) => a.time - b.time);
    setPodcastBookmarks(updated);
    try {
      const raw = localStorage.getItem('azaad_podcast_bookmarks_v1');
      const map = raw ? JSON.parse(raw) : {};
      map[song.id] = updated;
      localStorage.setItem('azaad_podcast_bookmarks_v1', JSON.stringify(map));
    } catch {}
  };

  const handleRemovePodcastBookmark = (bmId) => {
    if (!isPodcast || !song?.id) return;
    const updated = podcastBookmarks.filter((b) => b.id !== bmId);
    setPodcastBookmarks(updated);
    try {
      const raw = localStorage.getItem('azaad_podcast_bookmarks_v1');
      const map = raw ? JSON.parse(raw) : {};
      map[song.id] = updated;
      localStorage.setItem('azaad_podcast_bookmarks_v1', JSON.stringify(map));
    } catch {}
  };

  const activeDuration = duration || song?.duration || 0;
  const progressPercent = activeDuration ? Math.min(100, (currentTime / activeDuration) * 100) : 0;

  // Real lyrics fetcher from LRCLIB or verified catalog
  useEffect(() => {
    setSyncOffset(0);
    if (!song) {
      setLyricsData({ loading: false, type: 'none', lines: [], rawText: '' });
      return;
    }

    const title = song.title || '';
    const artist = song.singers || song.artist || '';
    const trackDur = Math.round(duration || song?.duration || 210);
    const durBucket = Math.round(trackDur / 5) * 5;
    const songVideoId =
      song.videoId ||
      song.youtubeId ||
      (String(song.id || '').startsWith('yt-') ? String(song.id).replace(/^yt-/, '') : '');
    const cacheKey = `${selectedLyricsProvider.toLowerCase()}::${title.toLowerCase()}::${artist.toLowerCase()}::${durBucket}`;

    // 1. Check if song already has lyrics attached (when in auto mode)
    if (selectedLyricsProvider === 'auto' && song.syncedLyrics) {
      const parsed = parseLrcText(song.syncedLyrics);
      if (parsed.length > 0) {
        setLyricsData({ loading: false, type: 'synced', isAutoSynced: false, lines: parsed, rawText: song.syncedLyrics });
        return;
      }
    }
    if (selectedLyricsProvider === 'auto' && song.lyrics) {
      if (typeof song.lyrics === 'string' && song.lyrics.includes('[')) {
        const parsed = parseLrcText(song.lyrics);
        if (parsed.length > 0) {
          setLyricsData({ loading: false, type: 'synced', isAutoSynced: false, lines: parsed, rawText: song.lyrics });
          return;
        }
      }
      if (typeof song.lyrics === 'string' && song.lyrics.trim().length > 10) {
        const plainLines = song.lyrics.split(/\r?\n/).map((l) => l.trim()).filter(Boolean);
        const autoSynced = buildAutoSyncedLyrics(plainLines, trackDur);
        setLyricsData({
          loading: false,
          type: 'synced',
          isAutoSynced: true,
          plainLines,
          lines: autoSynced,
          rawText: song.lyrics,
          source: 'Auto-Synced',
        });
        return;
      }
    }

    // 2. Check memory cache
    if (lyricsCache.has(cacheKey)) {
      setLyricsData(lyricsCache.get(cacheKey));
      return;
    }

    // 3. Check verified popular songs dictionary (when in auto mode)
    const lowerTitle = title.toLowerCase();
    if (selectedLyricsProvider === 'auto') {
      for (const [key, val] of Object.entries(VERIFIED_POPULAR_LYRICS)) {
        if (lowerTitle.includes(key)) {
          const entry = { loading: false, type: val.type, isAutoSynced: false, lines: val.lines, rawText: '', source: 'Verified Synced' };
          lyricsCache.set(cacheKey, entry);
          setLyricsData(entry);
          return;
        }
      }
    }

    // 4. Fetch real lyrics with Echo-Music 6-Provider Engine + Client LrcLib Fallback
    let isMounted = true;
    setLyricsData((prev) => ({ ...prev, loading: true }));

    const fetchRealLyrics = async () => {
      try {
        const { cleanTitle, cleanArtist } = normalizeLyricsQuery(title, artist);

        // Attempt 1: Server-side Echo-Music Multi-Source Lyrics Engine (:lyrics + 6 Provider Modules)
        const googleResult = await fetchGoogleSearchLyrics(title, artist, trackDur, {
          album: song.album || '',
          videoId: songVideoId,
          provider: selectedLyricsProvider,
        });
        if (googleResult && isMounted) {
          if (googleResult.syncedLyrics) {
            const parsed = parseLrcText(googleResult.syncedLyrics);
            if (parsed.length > 0) {
              const entry = {
                loading: false,
                type: 'synced',
                isAutoSynced: false,
                lrcDuration: googleResult.trackDuration || trackDur,
                lines: parsed,
                rawText: googleResult.syncedLyrics,
                romanizedLines: googleResult.romanizedLyrics
                  ? googleResult.romanizedLyrics.split(/\r?\n/).map((l) => l.trim()).filter(Boolean)
                  : [],
                translationLines: googleResult.translation
                  ? googleResult.translation.split(/\r?\n/).map((l) => l.trim()).filter(Boolean)
                  : [],
                language: googleResult.language || '',
                source: googleResult.source || 'LRCLIB Synced',
              };
              lyricsCache.set(cacheKey, entry);
              setLyricsData(entry);
              return;
            }
          }
          if (googleResult.plainLyrics) {
            const plainLines = googleResult.plainLyrics.split(/\r?\n/).map((l) => l.trim()).filter(Boolean);
            if (plainLines.length > 0) {
              const entry = {
                loading: false,
                type: 'synced',
                isAutoSynced: true,
                plainLines,
                lines: buildAutoSyncedLyrics(plainLines, trackDur),
                rawText: googleResult.plainLyrics,
                romanizedLines: [],
                translationLines: [],
                source: 'Smart Time-Synced',
              };
              lyricsCache.set(cacheKey, entry);
              setLyricsData(entry);
              return;
            }
          }
        }

        // Attempt 2: Direct client-side LRCLIB search with duration ranking
        const searchUrl = `https://lrclib.net/api/search?q=${encodeURIComponent(`${cleanTitle} ${cleanArtist}`.trim())}`;
        const resp = await fetch(searchUrl).catch(() => null);
        if (resp?.ok) {
          const list = await resp.json();
          if (Array.isArray(list) && list.length > 0 && isMounted) {
            const syncedList = list
              .filter((it) => it.syncedLyrics)
              .sort((a, b) => Math.abs((a.duration || trackDur) - trackDur) - Math.abs((b.duration || trackDur) - trackDur));
            const bestSynced = syncedList[0];
            if (bestSynced) {
              const parsed = parseLrcText(bestSynced.syncedLyrics);
              if (parsed.length > 0) {
                const entry = {
                  loading: false,
                  type: 'synced',
                  isAutoSynced: false,
                  lrcDuration: bestSynced.duration || trackDur,
                  lines: parsed,
                  rawText: bestSynced.syncedLyrics,
                  romanizedLines: [],
                  translationLines: [],
                  source: 'LRCLIB Synced',
                };
                lyricsCache.set(cacheKey, entry);
                setLyricsData(entry);
                return;
              }
            }

            const bestPlain = list.find((it) => it.plainLyrics);
            if (bestPlain) {
              const plainLines = bestPlain.plainLyrics.split(/\r?\n/).map((l) => l.trim()).filter(Boolean);
              const entry = {
                loading: false,
                type: 'synced',
                isAutoSynced: true,
                plainLines,
                lines: buildAutoSyncedLyrics(plainLines, trackDur),
                rawText: bestPlain.plainLyrics,
                romanizedLines: [],
                translationLines: [],
                source: 'Smart Time-Synced',
              };
              lyricsCache.set(cacheKey, entry);
              setLyricsData(entry);
              return;
            }
          }
        }

        // No lyrics found
        if (isMounted) {
          const entry = { loading: false, type: 'none', lines: [], rawText: '', romanizedLines: [], translationLines: [] };
          lyricsCache.set(cacheKey, entry);
          setLyricsData(entry);
        }
      } catch {
        if (isMounted) {
          setLyricsData({ loading: false, type: 'none', lines: [], rawText: '', romanizedLines: [], translationLines: [] });
        }
      }
    };

    fetchRealLyrics();

    return () => {
      isMounted = false;
    };
  }, [song?.id, song?.title, song?.artist, song?.singers, selectedLyricsProvider]);

  // Re-calibrate auto-synced plain lyrics when real audio duration metadata loads
  useEffect(() => {
    if (lyricsData.isAutoSynced && lyricsData.plainLines?.length > 0 && activeDuration > 30) {
      setLyricsData((prev) => ({
        ...prev,
        lines: buildAutoSyncedLyrics(prev.plainLines, activeDuration),
      }));
    }
  }, [activeDuration, lyricsData.isAutoSynced]);

  // Synchronized Lyrics Fetch Trigger (Echo-Music 6-Provider Deep Sync)
  const handleFetchGoogleLyrics = async (overrideProvider) => {
    if (!song) return;
    const targetProvider =
      typeof overrideProvider === 'string' ? overrideProvider : selectedLyricsProvider;
    setIsSearchingGoogleLyrics(true);
    setLyricsData((prev) => ({ ...prev, loading: true }));
    try {
      const targetDur = activeDuration || song.duration || 210;
      const songVideoId =
        song.videoId ||
        song.youtubeId ||
        (String(song.id || '').startsWith('yt-') ? String(song.id).replace(/^yt-/, '') : '');
      const gLyrics = await fetchGoogleSearchLyrics(
        song.title,
        song.singers || song.artist,
        targetDur,
        {
          album: song.album || '',
          videoId: songVideoId,
          provider: targetProvider,
        }
      );
      if (gLyrics && (gLyrics.syncedLyrics || gLyrics.plainLyrics)) {
        let lines = [];
        let isAutoSynced = false;
        let plainLines = [];
        if (gLyrics.syncedLyrics) {
          const parsed = parseLrcText(gLyrics.syncedLyrics);
          if (parsed.length > 0) {
            lines = parsed;
          }
        }
        if (lines.length === 0 && gLyrics.plainLyrics) {
          plainLines = gLyrics.plainLyrics.split(/\r?\n/).map((l) => l.trim()).filter(Boolean);
          lines = buildAutoSyncedLyrics(plainLines, targetDur);
          isAutoSynced = true;
        }

        const romanizedLines = gLyrics.romanizedLyrics
          ? gLyrics.romanizedLyrics.split(/\r?\n/).map((l) => l.trim()).filter(Boolean)
          : [];
        const translationLines = gLyrics.translation
          ? gLyrics.translation.split(/\r?\n/).map((l) => l.trim()).filter(Boolean)
          : [];

        const cacheKey = `${targetProvider.toLowerCase()}::${(song.title || '').toLowerCase()}::${(song.singers || song.artist || '').toLowerCase()}`;
        const entry = {
          loading: false,
          type: lines.length > 0 ? 'synced' : 'none',
          isAutoSynced,
          plainLines,
          lines,
          rawText: gLyrics.syncedLyrics || gLyrics.plainLyrics,
          romanizedLines,
          translationLines,
          language: gLyrics.language || '',
          source: gLyrics.source || (isAutoSynced ? 'Smart Time-Synced' : 'Live Synced'),
        };
        lyricsCache.set(cacheKey, entry);
        setLyricsData(entry);
      } else {
        setLyricsData((prev) => ({ ...prev, loading: false }));
      }
    } catch {
      setLyricsData((prev) => ({ ...prev, loading: false }));
    } finally {
      setIsSearchingGoogleLyrics(false);
    }
  };

  const handleCopyLyrics = () => {
    let textToCopy = '';
    if (lyricsLanguageMode === 'romanized' && lyricsData.romanizedLines?.length > 0) {
      textToCopy = lyricsData.romanizedLines.join('\n');
    } else if (lyricsLanguageMode === 'translation' && lyricsData.translationLines?.length > 0) {
      textToCopy = lyricsData.translationLines.join('\n');
    } else {
      textToCopy =
        lyricsData.type === 'synced'
          ? lyricsData.lines.map((l) => (typeof l === 'object' ? l.text : l)).join('\n')
          : lyricsData.lines.join('\n');
    }

    if (textToCopy && navigator.clipboard) {
      navigator.clipboard.writeText(`${song.title} - ${song.singers || song.artist} Lyrics:\n\n${textToCopy}`);
      setCopiedLyrics(true);
      setTimeout(() => setCopiedLyrics(false), 2200);
    }
  };

  // Find active synced lyric line based on current playback time + syncOffset calibration
  const activeLyricIndex = useMemo(() => {
    if (lyricsData.type !== 'synced' || !lyricsData.lines.length) return -1;
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

  // Intra-line progress percentage (0..100) for the active lyric line
  const activeLyricProgress = useMemo(() => {
    if (activeLyricIndex < 0 || lyricsData.type !== 'synced') return 0;
    const currentLine = lyricsData.lines[activeLyricIndex];
    const nextLine = lyricsData.lines[activeLyricIndex + 1];
    if (!currentLine || typeof currentLine.time !== 'number') return 0;
    const start = currentLine.time;
    const end = nextLine && typeof nextLine.time === 'number' ? nextLine.time : Math.max(start + 5, activeDuration);
    const span = Math.max(0.5, end - start);
    const effectiveTime = Math.max(0, currentTime + syncOffset);
    return Math.min(100, Math.max(0, ((effectiveTime - start) / span) * 100));
  }, [activeLyricIndex, lyricsData, currentTime, syncOffset, activeDuration]);

  // Smooth scroll active lyric into center of both desktop & mobile containers
  useEffect(() => {
    if (!autoScroll || activeTab !== 'lyrics' || activeLyricIndex < 0) return;
    const containers = [lyricsContainerRef.current, mobileLyricsContainerRef.current];
    for (const container of containers) {
      if (!container || container.clientHeight <= 0) continue;
      const activeEl = container.querySelector(`[data-lyric-idx="${activeLyricIndex}"]`);
      if (activeEl) {
        const targetTop = Math.max(
          0,
          activeEl.offsetTop - container.clientHeight / 2 + activeEl.clientHeight / 2
        );
        container.scrollTo({ top: targetTop, behavior: 'smooth' });
      }
    }
  }, [activeLyricIndex, activeTab, autoScroll]);

  // Share track link handler
  const handleShare = () => {
    const url = typeof window !== 'undefined' ? window.location.href : '';
    const shareText = `Listening to "${song?.title}" by ${song?.singers || song?.artist} on Azaad Music!`;
    if (navigator.clipboard) {
      navigator.clipboard.writeText(`${shareText}\n${url}`);
      setCopiedLink(true);
      setTimeout(() => setCopiedLink(false), 2500);
    }
  };

  // Safe seek target calculation supporting touch & mouse
  const calculateTargetFromEvent = (e) => {
    if (!seekBarRef.current || !activeDuration || !isFinite(activeDuration)) return 0;
    const rect = seekBarRef.current.getBoundingClientRect();
    const clientX = e.touches && e.touches.length > 0 ? e.touches[0].clientX : e.clientX;
    const ratio = Math.max(0, Math.min(1, (clientX - rect.left) / rect.width));
    return ratio * activeDuration;
  };

  // Mouse seek handlers
  const handleSeekClick = (e) => {
    const targetSeconds = calculateTargetFromEvent(e);
    if (typeof targetSeconds === 'number' && isFinite(targetSeconds) && !isNaN(targetSeconds)) {
      seekTo(targetSeconds);
    }
  };

  const handleSeekMouseMove = (e) => {
    const targetSeconds = calculateTargetFromEvent(e);
    setHoverSeekTime(targetSeconds);
  };

  // Touch seek handlers for mobile dragging
  const handleTouchStart = (e) => {
    setIsDraggingSeek(true);
    const targetSeconds = calculateTargetFromEvent(e);
    setHoverSeekTime(targetSeconds);
  };

  const handleTouchMove = (e) => {
    if (isDraggingSeek) {
      const targetSeconds = calculateTargetFromEvent(e);
      setHoverSeekTime(targetSeconds);
    }
  };

  const handleTouchEnd = (e) => {
    if (isDraggingSeek) {
      setIsDraggingSeek(false);
      const targetSeconds = calculateTargetFromEvent(e.changedTouches ? e.changedTouches[0] : e);
      if (typeof targetSeconds === 'number' && isFinite(targetSeconds) && !isNaN(targetSeconds)) {
        seekTo(targetSeconds);
      }
    }
  };

  // Filtered Queue list
  const queueList = useMemo(() => {
    const base = songs.length > 0 ? songs : allSongs;
    if (!searchQueue.trim()) return base;
    const q = searchQueue.toLowerCase();
    return base.filter(
      (s) =>
        s.title?.toLowerCase().includes(q) ||
        s.artist?.toLowerCase().includes(q) ||
        s.singers?.toLowerCase().includes(q) ||
        s.genre?.toLowerCase().includes(q)
    );
  }, [songs, allSongs, searchQueue]);

  // Fallback when no song is selected
  if (!song) {
    const fallbackPicks = (allSongs.length > 0 ? allSongs : songs).slice(0, 8);
    return (
      <div className="min-h-[100dvh] flex flex-col items-center justify-center px-4 py-8 text-center relative overflow-hidden bg-[#0a0e10]">
        <div className="absolute w-80 h-80 sm:w-96 sm:h-96 rounded-full bg-[var(--primary)]/10 blur-3xl -top-10 -left-10 pointer-events-none" />
        <div className="absolute w-80 h-80 sm:w-96 sm:h-96 rounded-full bg-cyan-500/10 blur-3xl -bottom-10 -right-10 pointer-events-none" />

        <div className="relative z-10 max-w-lg w-full">
          <div className="w-20 h-20 sm:w-28 sm:h-28 mx-auto flex items-center justify-center mb-5">
            <img
              src={APP_LOGO_URL}
              alt="Azaad Music"
              className="w-full h-full object-contain"
            />
          </div>

          <h2 className="text-xl sm:text-3xl font-extrabold text-white tracking-tight mb-2 font-display">
            Azaad Studio Deck
          </h2>
          <p className="text-xs sm:text-sm text-[var(--text-light)] max-w-md mx-auto mb-6 leading-relaxed">
            Select a track from your library or explore trending charts to unlock the high-fidelity vinyl deck, real-time synced karaoke lyrics, and studio queue.
          </p>

          {fallbackPicks.length > 0 && (
            <div className="w-full text-left bg-[#11171a]/95 border border-white/10 rounded-3xl p-3.5 sm:p-4 shadow-2xl">
              <div className="flex items-center justify-between mb-3 px-1">
                <span className="text-xs font-extrabold uppercase tracking-wider text-[var(--primary)] flex items-center gap-1.5">
                  <Fire weight="duotone" className="w-4 h-4" /> Instant Studio Sessions
                </span>
                <span className="text-[11px] font-mono text-[var(--text-light)]/70">
                  {fallbackPicks.length} Ready
                </span>
              </div>
              <div className="divide-y divide-white/5 max-h-60 sm:max-h-72 overflow-y-auto pr-1 custom-scrollbar">
                {fallbackPicks.map((item, idx) => (
                  <div
                    key={item.id || idx}
                    onClick={() => handleSelectSong(item)}
                    className="flex items-center justify-between p-2.5 rounded-2xl hover:bg-white/8 active:bg-white/15 transition-all cursor-pointer group min-h-[52px]"
                  >
                    <div className="flex items-center gap-3 min-w-0">
                      <div className="relative w-10 h-10 rounded-xl overflow-hidden flex-shrink-0 border border-white/10">
                        <img
                          src={mediaUrl(item.coverUrl, item)}
                          alt={item.title}
                          loading="lazy"
                          decoding="async"
                          className="w-full h-full object-cover group-hover:scale-105 transition-transform"
                          referrerPolicy="no-referrer"
                          onError={(e) => handleCoverError(e, item)}
                        />
                      </div>
                      <div className="min-w-0">
                        <p className="text-xs sm:text-sm font-bold text-white truncate group-hover:text-[var(--primary)] transition-colors">
                          {item.title}
                        </p>
                        <p className="text-[11px] text-[var(--text-light)] truncate">
                          {item.singers || item.artist}
                        </p>
                      </div>
                    </div>
                    <button
                      className="w-9 h-9 rounded-full bg-[var(--primary)]/10 group-hover:bg-[var(--primary)] text-[var(--primary)] group-hover:text-black flex items-center justify-center transition-all shadow-sm flex-shrink-0"
                      title="Play Song"
                    >
                      <Play weight="fill" className="w-4 h-4 ml-0.5" />
                    </button>
                  </div>
                ))}
              </div>
            </div>
          )}

          <div className="mt-5 flex items-center justify-center gap-3">
            <button
              onClick={() => onBack?.()}
              className="min-h-[44px] px-4 sm:px-5 py-2.5 rounded-xl bg-white/10 hover:bg-white/15 active:scale-95 text-xs sm:text-sm font-bold text-white transition-all flex items-center gap-2 cursor-pointer"
            >
              <ArrowLeft weight="bold" className="w-4 h-4" /> Back to Explore
            </button>
            {fallbackPicks[0] && (
              <button
                onClick={() => handleSelectSong(fallbackPicks[0])}
                className="min-h-[44px] px-5 sm:px-6 py-2.5 rounded-xl bg-[var(--primary)] text-[var(--primary-foreground)] text-xs sm:text-sm font-extrabold shadow-[0_0_20px_rgba(83,242,224,0.4)] hover:brightness-110 active:scale-95 transition-all flex items-center gap-2 cursor-pointer"
              >
                <Play weight="fill" className="w-4 h-4" /> Start Listening
              </button>
            )}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-[100dvh] w-full max-w-7xl flex flex-col justify-between relative px-3 sm:px-6 lg:px-8 pt-[max(env(safe-area-inset-top),10px)] pb-[max(env(safe-area-inset-bottom),12px)] mx-auto select-none bg-[#090d0f] text-white overflow-x-hidden box-border">
      {/* Dynamic Album Art Ambient Stage Glow (GPU-composited) */}
      <div className="fixed inset-0 pointer-events-none -z-10 overflow-hidden">
        <img
          src={mediaUrl(song.coverUrl, song)}
          alt=""
          aria-hidden="true"
          decoding="async"
          className="w-full h-full object-cover opacity-[0.16] scale-125 blur-[90px] saturate-150 transform-gpu"
          referrerPolicy="no-referrer"
          onError={(e) => handleCoverError(e, song)}
        />
        <div className="absolute inset-0 bg-gradient-to-b from-[#090d0f]/75 via-[#090d0f]/88 to-[#090d0f]" />
        <div className="absolute top-0 left-1/4 w-[340px] sm:w-[460px] h-[340px] sm:h-[460px] rounded-full bg-[var(--primary)]/10 blur-[110px]" />
      </div>

      {/* ─── Top Header Navigation ────────────────────────────────────────────── */}
      <header className="flex items-center justify-between gap-2 py-2.5 sm:py-3.5 border-b border-white/10 mb-3 sm:mb-5 flex-shrink-0">
        <div className="flex items-center gap-2 sm:gap-2.5 min-w-0">
          {/* Mobile Minimize / Back button with uniform 40px height */}
          <button
            onClick={() => onBack?.()}
            className="w-10 h-10 sm:w-auto sm:h-10 sm:px-3.5 rounded-xl bg-white/[0.06] hover:bg-white/12 active:scale-95 border border-white/10 text-white/90 hover:text-white transition-all flex items-center justify-center gap-2 text-xs sm:text-sm font-bold shadow-sm group flex-shrink-0 cursor-pointer"
            title="Minimize Player"
            aria-label="Back to Explore"
          >
            <CaretDown weight="bold" className="w-4 h-4 sm:hidden group-hover:translate-y-0.5 transition-transform" />
            <ArrowLeft weight="bold" className="w-4 h-4 hidden sm:block group-hover:-translate-x-0.5 transition-transform" />
            <span className="hidden sm:inline">Explore</span>
          </button>

          {/* Studio Master Status Indicator (uniform h-10 height) */}
          <div className="h-10 flex items-center gap-2 px-3 rounded-xl bg-[#11181c]/90 border border-white/10 shadow-inner min-w-0">
            <span className="relative flex h-2 w-2 flex-shrink-0">
              {isPlaying && (
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-[var(--primary)] opacity-75" />
              )}
              <span className={`relative inline-flex rounded-full h-2 w-2 ${isPlaying ? 'bg-[var(--primary)]' : 'bg-white/40'}`} />
            </span>
            <span className="text-[11px] sm:text-xs font-extrabold tracking-wider uppercase text-white/90 truncate">
              {isPlaying ? 'Studio Live' : 'Standby'}
            </span>
            <span className="hidden md:inline-flex items-center gap-1 text-[10px] font-mono font-bold px-2 py-0.5 rounded-lg bg-[var(--primary)]/12 text-[var(--primary)] border border-[var(--primary)]/25">
              <Waveform weight="bold" className="w-3 h-3" /> 24-BIT HI-RES
            </span>
          </div>
        </div>

        {/* Top Right Action Buttons (Uniform h-10 / 40px height & rounded-xl across all items) */}
        <div className="flex items-center gap-1.5 sm:gap-2 flex-shrink-0">
          {/* Universal YouTube Video Toggle Button */}
          <button
            onClick={toggleVideo}
            className={`w-10 h-10 sm:w-auto sm:h-10 sm:px-3.5 rounded-xl border text-xs font-bold flex items-center justify-center gap-1.5 transition-all active:scale-95 cursor-pointer ${
              showVideo
                ? 'bg-red-500/20 text-red-300 border-red-500/45 shadow-[0_0_15px_rgba(239,68,68,0.28)]'
                : 'bg-white/[0.06] text-white/85 hover:text-white border-white/10 hover:bg-white/12'
            }`}
            title={showVideo ? 'Hide YouTube Video Player' : 'Watch YouTube Video'}
            aria-label={showVideo ? 'Hide YouTube Video Player' : 'Watch YouTube Video'}
          >
            <YoutubeLogo weight="fill" className="w-4 h-4 text-red-500 flex-shrink-0" />
            <span className="hidden sm:inline">{showVideo ? 'Video On' : 'YouTube'}</span>
          </button>

          {/* Turntable / Sleeve Toggle (Desktop Art mode) */}
          {!isPodcast && (
            <button
              onClick={() => setVinylMode((v) => !v)}
              className={`hidden sm:flex h-10 px-3.5 rounded-xl border text-xs font-bold items-center gap-1.5 transition-all cursor-pointer ${
                vinylMode
                  ? 'bg-[var(--primary)]/15 text-[var(--primary)] border-[var(--primary)]/35 shadow-[0_0_12px_rgba(83,242,224,0.18)]'
                  : 'bg-white/5 text-white/75 border-white/10 hover:text-white hover:bg-white/10'
              }`}
              title="Toggle Vinyl Turntable View"
            >
              <VinylRecord weight="duotone" className={`w-4 h-4 ${isPlaying && vinylMode ? 'animate-spin-slow' : ''}`} />
              <span>{vinylMode ? 'Turntable' : 'Sleeve'}</span>
            </button>
          )}

          {/* Podcast Subscribe Button in Header */}
          {isPodcast && song?.seriesId && (
            <button
              onClick={() => {
                onToggleSubscription?.({
                  id: song.seriesId,
                  seriesId: song.seriesId,
                  title: song.seriesTitle || song.album || 'Podcast Series',
                  host: song.singers || song.artist || 'Host',
                  coverUrl: song.coverUrl,
                  category: song.category || 'Podcast',
                });
              }}
              className={`h-10 px-3 sm:px-3.5 rounded-xl border text-xs font-bold flex items-center justify-center gap-1.5 transition-all active:scale-95 cursor-pointer ${
                isSubscribed
                  ? 'bg-emerald-500/20 text-emerald-300 border-emerald-500/30'
                  : 'bg-[var(--primary)] text-[var(--bg)] border-transparent shadow-[0_0_12px_rgba(83,242,224,0.3)]'
              }`}
              title={isSubscribed ? 'Subscribed to Series' : 'Subscribe to Series'}
              aria-label={isSubscribed ? 'Subscribed to Series' : 'Subscribe to Series'}
            >
              {isSubscribed ? (
                <>
                  <Check weight="bold" className="w-4 h-4 text-emerald-400" />
                  <span className="hidden sm:inline">Subscribed</span>
                </>
              ) : (
                <>
                  <Plus weight="bold" className="w-4 h-4" />
                  <span className="hidden sm:inline">Subscribe</span>
                </>
              )}
            </button>
          )}

          {/* Share Button */}
          <button
            onClick={handleShare}
            className={`w-10 h-10 sm:w-auto sm:h-10 sm:px-3.5 rounded-xl border text-xs font-bold flex items-center justify-center gap-1.5 transition-all active:scale-95 cursor-pointer ${
              copiedLink
                ? 'bg-emerald-500/20 text-emerald-400 border-emerald-500/40'
                : 'bg-white/[0.06] text-white/80 hover:text-white border-white/10 hover:bg-white/12'
            }`}
            title="Share Song Link"
            aria-label="Share song"
          >
            {copiedLink ? <Check weight="bold" className="w-4 h-4 text-emerald-400" /> : <ShareNetwork weight="duotone" className="w-4 h-4" />}
            <span className="hidden sm:inline">{copiedLink ? 'Copied' : 'Share'}</span>
          </button>

          {/* Add to Playlist Button */}
          <button
            onClick={() => onAddToPlaylist?.(song)}
            className="w-10 h-10 sm:w-auto sm:h-10 sm:px-3.5 rounded-xl bg-white/[0.06] hover:bg-white/12 active:scale-95 border border-white/10 text-white/80 hover:text-white transition-all text-xs font-bold flex items-center justify-center gap-1.5 cursor-pointer"
            title="Add to Playlist"
            aria-label="Add to playlist"
          >
            <Playlist weight="duotone" className="w-4 h-4 text-[var(--primary)]" />
            <span className="hidden md:inline">Save</span>
          </button>

          {/* Favorite / Like Button (Matched exact w-10 h-10 rounded-xl geometry) */}
          <LikeHeartButton
            isFavorite={isLiked}
            onToggle={() => onToggleFavorite?.(song)}
            size="md"
            variant="badge"
            className="!w-10 !h-10 !p-0 !rounded-xl flex-shrink-0"
          />
        </div>
      </header>

      {/* ─── Mode Switcher Tabs (Proportional Flex Sizing, Zero Truncation) ───── */}
      <div className="flex items-center gap-1.5 sm:gap-2 p-1.5 bg-[#101619]/90 border border-white/10 rounded-2xl mb-3 sm:mb-5 flex-shrink-0 w-full overflow-hidden shadow-inner">
        {(isPodcast
          ? [
              { id: 'art', label: 'Studio Deck', icon: VinylRecord },
              {
                id: 'notes',
                label: `Chapters${song.chapters?.length ? ` (${song.chapters.length})` : ''}`,
                icon: BookOpenText,
              },
              { id: 'queue', label: `Episodes (${queueList.length})`, icon: Playlist },
            ]
          : [
              { id: 'art', label: 'Studio Deck', icon: VinylRecord },
              {
                id: 'lyrics',
                label: lyricsData.type === 'synced' ? 'Live Lyrics' : 'Lyrics',
                icon: MicrophoneStage,
                badge: lyricsData.type === 'synced' ? 'SYNC' : null,
              },
              { id: 'queue', label: `Up Next (${queueList.length})`, icon: Playlist },
            ]
        ).map((tab) => {
          const Icon = tab.icon;
          const isActive = activeTab === tab.id;
          return (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`flex-auto min-h-[40px] sm:min-h-[44px] flex items-center justify-center gap-1.5 sm:gap-2 px-2.5 sm:px-4 py-1.5 sm:py-2 rounded-xl text-xs sm:text-sm font-bold whitespace-nowrap transition-all active:scale-98 cursor-pointer ${
                isActive
                  ? 'bg-[var(--primary)] text-[var(--primary-foreground)] shadow-[0_0_18px_rgba(83,242,224,0.3)]'
                  : 'text-[var(--text-light)] hover:text-white hover:bg-white/5'
              }`}
            >
              <Icon weight={isActive ? 'fill' : 'duotone'} className="w-4 h-4 flex-shrink-0" />
              <span>{tab.label}</span>
              {tab.badge && (
                <span
                  className={`hidden sm:inline-block text-[9px] font-mono font-extrabold px-1.5 py-0.5 rounded-md ${
                    isActive
                      ? 'bg-black/20 text-black'
                      : 'bg-[var(--primary)]/15 text-[var(--primary)]'
                  }`}
                >
                  {tab.badge}
                </span>
              )}
            </button>
          );
        })}
      </div>

      {/* ─── Main Content Area ────────────────────────────────────────── */}
      <div className="flex-1 min-h-0 flex flex-col justify-center">
        {/* ─── DESKTOP (lg:): Two-Column Hi-Fi Studio Layout ─── */}
        <div className="hidden lg:grid lg:grid-cols-12 lg:gap-8 items-start">
          {/* Left Column: Hi-Fi Vinyl Turntable / Sleeve Stage & Track Telemetry */}
          <div className="lg:col-span-5 flex flex-col items-center">
            <div className="relative w-full max-w-[340px] xl:max-w-[370px] aspect-square mx-auto mb-5 flex items-center justify-center group">
              {/* Outer Ambient Ring */}
              <div
                className={`absolute inset-2 rounded-full bg-gradient-to-tr from-[var(--primary)]/20 via-cyan-500/10 to-transparent blur-2xl transition-opacity duration-700 pointer-events-none ${
                  isPlaying ? 'opacity-90' : 'opacity-30'
                }`}
              />

              {/* Vinyl Record Disc */}
              <div
                onClick={() => togglePlay()}
                title={isPlaying ? 'Click to Pause' : 'Click to Play'}
                className={`absolute right-1 w-[86%] h-[86%] rounded-full bg-[radial-gradient(circle,#1b2429_0%,#0b0f12_62%,#060809_100%)] border-4 border-white/12 shadow-[0_20px_50px_rgba(0,0,0,0.9)] flex items-center justify-center transition-all duration-700 cursor-pointer ${
                  vinylMode
                    ? isPlaying
                      ? 'translate-x-9 xl:translate-x-11'
                      : 'translate-x-5'
                    : 'translate-x-0 opacity-0 pointer-events-none'
                }`}
              >
                {/* Vinyl Grooves & Light Sheen */}
                <div className="w-[90%] h-[90%] rounded-full border border-white/[0.06] flex items-center justify-center relative overflow-hidden">
                  <div className="absolute inset-0 bg-[conic-gradient(from_0deg,transparent_0deg,rgba(255,255,255,0.06)_40deg,transparent_80deg,transparent_180deg,rgba(83,242,224,0.08)_220deg,transparent_260deg)] pointer-events-none" />
                  <div className="w-[76%] h-[76%] rounded-full border border-white/[0.05] flex items-center justify-center">
                    <div className="w-[60%] h-[60%] rounded-full border border-white/[0.08] flex items-center justify-center">
                      {/* Center Vinyl Label */}
                      <div
                        className={`w-20 h-20 xl:w-24 xl:h-24 rounded-full overflow-hidden border-2 border-[var(--primary)]/40 shadow-inner relative flex items-center justify-center ${
                          isPlaying ? 'animate-spin-slow' : ''
                        }`}
                      >
                        <img
                          src={mediaUrl(song.coverUrl, song)}
                          alt=""
                          className="w-full h-full object-cover opacity-85"
                          referrerPolicy="no-referrer"
                          onError={(e) => handleCoverError(e, song)}
                        />
                        <div className="absolute w-4 h-4 rounded-full bg-[#090d0f] border-2 border-white/40 shadow-md" />
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              {/* Studio Tonearm Indicator (when Vinyl Mode active) */}
              {vinylMode && (
                <div
                  className={`absolute -top-2 right-2 z-20 w-16 h-28 pointer-events-none transition-transform duration-700 origin-top-right ${
                    isPlaying ? 'rotate-[18deg]' : 'rotate-0'
                  }`}
                >
                  <div className="ml-auto w-5 h-5 rounded-full bg-gradient-to-br from-zinc-300 to-zinc-600 border border-white/30 shadow-md" />
                  <div className="ml-auto mr-2 w-1 h-20 bg-gradient-to-b from-zinc-300 via-zinc-400 to-[var(--primary)] rounded-full shadow" />
                </div>
              )}

              {/* High-Grade Cover Art Sleeve */}
              <div
                onClick={() => togglePlay()}
                className={`relative z-10 w-[86%] h-[86%] rounded-3xl overflow-hidden border border-white/15 bg-[#12181b] shadow-[0_24px_60px_rgba(0,0,0,0.85)] cursor-pointer transition-transform duration-500 ${
                  vinylMode ? '-translate-x-3 xl:-translate-x-4' : 'translate-x-0 scale-[1.03]'
                }`}
              >
                <img
                  src={mediaUrl(song.coverUrl, song)}
                  alt={song.title}
                  decoding="async"
                  className="w-full h-full object-cover select-none pointer-events-none group-hover:scale-[1.03] transition-transform duration-700"
                  referrerPolicy="no-referrer"
                  onError={(e) => handleCoverError(e, song)}
                />
                <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-transparent to-white/10 pointer-events-none" />

                {song.genre && (
                  <div className="absolute top-3 left-3 flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-black/65 backdrop-blur-md border border-white/15 text-[11px] font-bold text-white/95">
                    <VinylRecord weight="duotone" className={`w-3.5 h-3.5 text-[var(--primary)] ${isPlaying ? 'animate-spin-slow' : ''}`} />
                    <span>{song.genre}</span>
                  </div>
                )}

                {/* Bottom Sleeve Telemetry Strip */}
                <div className="absolute bottom-3 inset-x-3 flex items-center justify-between px-3 py-1.5 rounded-2xl bg-black/65 backdrop-blur-md border border-white/10">
                  <div className="flex items-center gap-1.5 text-[10px] font-mono font-bold text-[var(--primary)]">
                    <Waveform weight="bold" className="w-3.5 h-3.5" />
                    <span>{isPlaying ? 'PLAYING' : 'PAUSED'}</span>
                  </div>
                  <span className="text-[10px] font-mono text-white/80 tabular-nums">
                    {formatTime(currentTime)} / {formatTime(activeDuration)}
                  </span>
                </div>
              </div>
            </div>

            {/* Desktop Track Details */}
            <div className="w-full text-center px-2">
              {isPodcast && (
                <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-[var(--primary)]/15 border border-[var(--primary)]/30 text-[var(--primary)] text-xs font-bold uppercase tracking-wider mb-2">
                  <Microphone weight="duotone" className="w-3.5 h-3.5" />
                  <span>Podcast Episode</span>
                </div>
              )}
              <h1 className="text-2xl xl:text-3xl font-extrabold text-white tracking-tight leading-tight line-clamp-2">
                {song.title}
              </h1>
              <p className="text-base text-[var(--text-light)] mt-1 truncate font-semibold">
                {song.singers || song.artist}
              </p>

              {/* Interactive Audio Spectrum Visualizer Card (Desktop Left Column) */}
              <div className="mt-4 p-3 rounded-2xl bg-[#11171b]/90 border border-white/10 shadow-inner">
                <div className="flex items-center justify-between text-[10px] font-mono uppercase tracking-wider text-[var(--text-light)] mb-2">
                  <span className="flex items-center gap-1 text-[var(--primary)] font-bold">
                    <Faders weight="duotone" className="w-3.5 h-3.5" /> Acoustic Spectrum
                  </span>
                  <span className="tabular-nums">{Math.round(progressPercent)}% Complete</span>
                </div>
                <div
                  className="flex items-end justify-between gap-1 h-9 px-1 cursor-pointer"
                  onClick={(e) => {
                    if (!activeDuration) return;
                    const rect = e.currentTarget.getBoundingClientRect();
                    const ratio = Math.max(0, Math.min(1, (e.clientX - rect.left) / rect.width));
                    seekTo(ratio * activeDuration);
                  }}
                  title="Click spectrum to seek"
                >
                  {SPECTRUM_BARS.map((val, idx) => {
                    const barRatio = (idx + 1) / SPECTRUM_BARS.length;
                    const isPassed = barRatio <= progressPercent / 100;
                    const dynamicHeight = isPlaying
                      ? Math.max(22, Math.round(val * 100 * (0.75 + 0.25 * Math.sin(currentTime * 4 + idx))))
                      : Math.round(val * 70);
                    return (
                      <div
                        key={idx}
                        style={{ height: `${dynamicHeight}%` }}
                        className={`flex-1 rounded-full transition-all duration-200 ${
                          isPassed
                            ? 'bg-gradient-to-t from-[var(--primary)] to-cyan-300 shadow-[0_0_8px_rgba(83,242,224,0.35)]'
                            : 'bg-white/15 hover:bg-white/30'
                        }`}
                      />
                    );
                  })}
                </div>
              </div>
            </div>
          </div>

          {/* Right Column: Dynamic Studio Panel (Overview / Lyrics / Queue / Chapters) */}
          <div className="lg:col-span-7 bg-[#10161a]/90 border border-white/10 rounded-3xl p-6 shadow-[0_20px_50px_rgba(0,0,0,0.65)] h-[430px] xl:h-[460px] flex flex-col overflow-hidden">
            {activeTab === 'art' && (
              <div className="flex-1 flex flex-col justify-between overflow-y-auto pr-1 custom-scrollbar">
                <div>
                  <div className="flex items-center justify-between border-b border-white/10 pb-3.5 mb-4">
                    <div>
                      <span className="text-[11px] font-bold uppercase tracking-widest text-[var(--primary)] flex items-center gap-1.5">
                        <Sparkle weight="fill" className="w-3.5 h-3.5" />
                        {isPodcast ? 'Episode Intelligence' : 'Studio Track Dossier'}
                      </span>
                      <h2 className="text-xl font-extrabold text-white mt-0.5">
                        {isPodcast ? 'Show Notes & Audio Specs' : 'Master Recording & Credits'}
                      </h2>
                    </div>

                    <button
                      onClick={toggleVideo}
                      className={`px-3.5 py-2 rounded-xl text-xs font-bold flex items-center gap-1.5 border transition-all cursor-pointer ${
                        showVideo
                          ? 'bg-red-500 text-white border-red-400 shadow-[0_0_15px_rgba(239,68,68,0.4)]'
                          : 'bg-red-500/15 text-red-300 border-red-500/30 hover:bg-red-500/25'
                      }`}
                    >
                      <YoutubeLogo weight="fill" className="w-4 h-4" />
                      <span>{showVideo ? 'Hide Video' : 'Watch YouTube Video'}</span>
                    </button>
                  </div>

                  {/* Podcast Live Chapter Control Strip */}
                  {isPodcast && song.chapters?.length > 0 && (
                    <div className="p-3.5 rounded-2xl bg-gradient-to-r from-[var(--primary)]/12 via-cyan-500/5 to-transparent border border-[var(--primary)]/30 mb-4 flex items-center justify-between gap-3">
                      <div className="min-w-0 flex-1">
                        <span className="text-[10px] font-mono font-extrabold uppercase tracking-wider text-[var(--primary)] block">
                          Active Chapter ({activeChapterIndex + 1} / {song.chapters.length})
                        </span>
                        <p className="text-sm font-extrabold text-white truncate mt-0.5">
                          {activeChapter?.title || song.chapters[0]?.title}
                        </p>
                      </div>
                      <div className="flex items-center gap-1.5 flex-shrink-0">
                        <button
                          onClick={() => jumpToChapterOffset(-1)}
                          disabled={activeChapterIndex <= 0}
                          className="px-2.5 py-1.5 rounded-xl bg-black/40 hover:bg-black/60 disabled:opacity-35 border border-white/10 text-xs font-bold text-white cursor-pointer"
                          title="Previous Chapter"
                        >
                          Prev Ch
                        </button>
                        <button
                          onClick={() => jumpToChapterOffset(1)}
                          disabled={activeChapterIndex >= song.chapters.length - 1}
                          className="px-2.5 py-1.5 rounded-xl bg-[var(--primary)]/20 hover:bg-[var(--primary)]/30 disabled:opacity-35 border border-[var(--primary)]/35 text-xs font-bold text-[var(--primary)] cursor-pointer"
                          title="Next Chapter"
                        >
                          Next Ch
                        </button>
                      </div>
                    </div>
                  )}

                  {/* Podcast Quick Speed & Bookmark Bar */}
                  {isPodcast && (
                    <div className="flex flex-wrap items-center justify-between gap-2 p-3 rounded-2xl bg-white/[0.03] border border-white/[0.08] mb-4">
                      <div className="flex items-center gap-1 flex-wrap">
                        <span className="text-[10px] font-bold uppercase tracking-wider text-[var(--text-light)] mr-1.5 flex items-center gap-1">
                          <Gauge weight="duotone" className="w-3.5 h-3.5 text-[var(--primary)]" /> Speed:
                        </span>
                        {[0.75, 1, 1.25, 1.5, 1.75, 2].map((rate) => (
                          <button
                            key={rate}
                            onClick={() => setPlaybackRate(rate)}
                            className={`px-2 py-1 rounded-lg text-[11px] font-mono font-bold transition-all cursor-pointer ${
                              playbackRate === rate
                                ? 'bg-[var(--primary)] text-black shadow-sm'
                                : 'bg-black/40 text-white/70 hover:text-white border border-white/10'
                            }`}
                          >
                            {rate}x
                          </button>
                        ))}
                      </div>
                      <button
                        onClick={handleAddPodcastBookmark}
                        className="px-3 py-1.5 rounded-xl bg-amber-500/15 hover:bg-amber-500/25 border border-amber-500/30 text-amber-300 text-xs font-bold flex items-center gap-1.5 transition-all cursor-pointer"
                        title="Bookmark current timestamp"
                      >
                        <Plus weight="bold" className="w-3.5 h-3.5" />
                        <span>Bookmark {formatTime(currentTime)}</span>
                      </button>
                    </div>
                  )}

                  {/* Metadata Bento Grid */}
                  <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 mb-5">
                    <div className="p-3.5 rounded-2xl bg-white/[0.03] border border-white/[0.08]">
                      <span className="text-[10px] font-bold uppercase tracking-wider text-[var(--text-light)] block">
                        {isPodcast ? 'Host / Creator' : 'Lead Artist'}
                      </span>
                      <span className="text-sm font-bold text-white mt-1 block truncate">
                        {song.singers || song.artist || 'Unknown Artist'}
                      </span>
                    </div>

                    <div className="p-3.5 rounded-2xl bg-white/[0.03] border border-white/[0.08]">
                      <span className="text-[10px] font-bold uppercase tracking-wider text-[var(--text-light)] block">
                        {isPodcast ? 'Series' : 'Genre / Style'}
                      </span>
                      <span className="text-sm font-bold text-[var(--primary)] mt-1 block truncate">
                        {song.seriesTitle || song.genre || 'Global Pop'}
                      </span>
                    </div>

                    <div className="p-3.5 rounded-2xl bg-white/[0.03] border border-white/[0.08]">
                      <span className="text-[10px] font-bold uppercase tracking-wider text-[var(--text-light)] block">
                        Duration & Speed
                      </span>
                      <span className="text-sm font-mono font-bold text-white mt-1 block">
                        {formatTime(activeDuration)} • {playbackRate}x
                      </span>
                    </div>
                  </div>

                  {/* Podcast Description OR Live Lyrics Preview Card */}
                  {isPodcast ? (
                    <div className="p-4 rounded-2xl bg-white/[0.02] border border-white/5 mb-4">
                      <h4 className="text-xs font-bold uppercase tracking-wider text-white/60 mb-1.5">
                        Episode Summary
                      </h4>
                      <p className="text-xs sm:text-sm text-[var(--text-light)] leading-relaxed line-clamp-4">
                        {song.description ||
                          'Tune in to this featured episode on Azaad Music Podcast Studio. Use chapter markers or 15s/30s skip controls below to navigate key topics effortlessly.'}
                      </p>
                    </div>
                  ) : (
                    <div
                      onClick={() => setActiveTab('lyrics')}
                      className="p-4 rounded-2xl bg-gradient-to-br from-[var(--primary)]/10 via-white/[0.03] to-transparent border border-[var(--primary)]/25 hover:border-[var(--primary)]/50 transition-all cursor-pointer group mb-4"
                    >
                      <div className="flex items-center justify-between mb-1.5">
                        <span className="text-[11px] font-extrabold uppercase tracking-wider text-[var(--primary)] flex items-center gap-1.5">
                          <MicrophoneStage weight="duotone" className="w-4 h-4" />
                          {lyricsData.type === 'synced' ? 'Live Synced Karaoke Preview' : 'Lyrics Studio'}
                        </span>
                        <span className="text-[11px] font-semibold text-white/70 group-hover:text-[var(--primary)] transition-colors">
                          Open Full Lyrics →
                        </span>
                      </div>
                      <p className="text-sm sm:text-base font-bold text-white line-clamp-2 leading-snug">
                        {lyricsData.loading
                          ? 'Synchronizing time-coded lyrics...'
                          : lyricsData.type === 'synced' && activeLyricIndex >= 0
                          ? lyricsData.lines[activeLyricIndex]?.text
                          : lyricsData.lines?.length > 0
                          ? typeof lyricsData.lines[0] === 'object'
                            ? lyricsData.lines[0].text
                            : lyricsData.lines[0]
                          : 'Tap to open lyrics studio & real-time translation'}
                      </p>
                    </div>
                  )}
                </div>

                {/* Up Next Peek Strip */}
                {queueList.length > 1 && (
                  <div className="pt-3 border-t border-white/10 flex items-center justify-between gap-3">
                    <div className="flex items-center gap-2.5 min-w-0">
                      <span className="text-[10px] font-extrabold uppercase tracking-wider px-2 py-1 rounded-lg bg-white/8 text-[var(--primary)] flex-shrink-0">
                        Up Next
                      </span>
                      <p className="text-xs font-semibold text-white/90 truncate">
                        {queueList.find((item) => item.id !== song.id)?.title || queueList[0]?.title}
                      </p>
                    </div>
                    <button
                      onClick={() => setActiveTab('queue')}
                      className="text-xs font-bold text-[var(--primary)] hover:underline flex-shrink-0 cursor-pointer"
                    >
                      View Queue ({queueList.length})
                    </button>
                  </div>
                )}
              </div>
            )}

            {/* Desktop Chapters Tab (Podcasts) */}
            {activeTab === 'notes' && isPodcast && (
              <div className="flex-1 flex flex-col h-full overflow-hidden">
                <div className="flex items-center justify-between pb-3 mb-3 border-b border-white/10">
                  <div>
                    <h3 className="text-base font-bold text-white flex items-center gap-2">
                      <BookOpenText weight="duotone" className="w-4 h-4 text-[var(--primary)]" />
                      Episode Chapters & Bookmarks
                    </h3>
                    <p className="text-xs text-[var(--text-light)] mt-0.5">
                      Click any chapter to jump immediately • {podcastBookmarks.length} saved bookmarks
                    </p>
                  </div>
                  <button
                    onClick={handleAddPodcastBookmark}
                    className="px-3 py-1.5 rounded-xl bg-[var(--primary)]/15 hover:bg-[var(--primary)]/25 border border-[var(--primary)]/30 text-[var(--primary)] text-xs font-bold flex items-center gap-1.5 cursor-pointer"
                  >
                    <Plus weight="bold" className="w-3.5 h-3.5" />
                    <span>Bookmark {formatTime(currentTime)}</span>
                  </button>
                </div>

                {/* Saved Bookmarks Strip (if any) */}
                {podcastBookmarks.length > 0 && (
                  <div className="mb-3 p-2.5 rounded-2xl bg-amber-500/10 border border-amber-500/25 flex items-center gap-2 overflow-x-auto custom-scrollbar flex-shrink-0">
                    <span className="text-[10px] font-extrabold uppercase tracking-wider text-amber-300 px-1.5 flex-shrink-0">
                      Bookmarks:
                    </span>
                    {podcastBookmarks.map((bm) => (
                      <div
                        key={bm.id}
                        className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-xl bg-black/50 border border-amber-500/30 text-xs text-white flex-shrink-0"
                      >
                        <button
                          onClick={() => seekTo(bm.time)}
                          className="font-mono font-bold text-amber-300 hover:underline cursor-pointer"
                        >
                          {formatTime(bm.time)}
                        </button>
                        <span className="text-white/75 truncate max-w-[120px]">{bm.label}</span>
                        <button
                          onClick={() => handleRemovePodcastBookmark(bm.id)}
                          className="text-white/40 hover:text-red-400 ml-1 cursor-pointer"
                          title="Delete bookmark"
                        >
                          ×
                        </button>
                      </div>
                    ))}
                  </div>
                )}

                <div className="flex-1 overflow-y-auto space-y-2 pr-1 custom-scrollbar">
                  {song.chapters && song.chapters.length > 0 ? (
                    song.chapters.map((ch, idx) => {
                      const isCurrentChapter = idx === activeChapterIndex;
                      const nextChTime = song.chapters[idx + 1]?.time || activeDuration || ch.time + 600;
                      const chDuration = Math.max(1, nextChTime - ch.time);
                      const chProgress = isCurrentChapter
                        ? Math.min(100, Math.max(0, ((currentTime - ch.time) / chDuration) * 100))
                        : currentTime >= nextChTime
                        ? 100
                        : 0;

                      return (
                        <button
                          key={idx}
                          onClick={() => seekTo(ch.time)}
                          className={`w-full flex flex-col p-3 rounded-2xl border text-left transition-all cursor-pointer ${
                            isCurrentChapter
                              ? 'bg-[var(--primary)]/15 border-[var(--primary)]/40 text-white shadow-sm'
                              : 'bg-white/[0.03] border-white/5 text-white/80 hover:bg-white/[0.07]'
                          }`}
                        >
                          <div className="w-full flex items-center justify-between">
                            <div className="flex items-center gap-3 min-w-0">
                              <span
                                className={`w-7 h-7 rounded-xl border flex items-center justify-center text-xs font-mono font-bold flex-shrink-0 ${
                                  isCurrentChapter
                                    ? 'bg-[var(--primary)] text-black border-transparent'
                                    : 'bg-black/40 border-white/10 text-[var(--primary)]'
                                }`}
                              >
                                {idx + 1}
                              </span>
                              <span className="text-sm font-bold truncate">{ch.title}</span>
                            </div>
                            <div className="flex items-center gap-2 flex-shrink-0 ml-2">
                              <span className="text-[10px] font-mono text-white/45">
                                {Math.round(chDuration / 60)}m
                              </span>
                              <span className="text-xs font-mono font-semibold px-2.5 py-1 rounded-lg bg-black/40 text-[var(--primary)]">
                                {formatTime(ch.time)}
                              </span>
                            </div>
                          </div>
                          {chProgress > 0 && (
                            <div className="w-full h-1 bg-black/40 rounded-full overflow-hidden mt-2">
                              <div
                                style={{ width: `${chProgress}%` }}
                                className="h-full bg-[var(--primary)] rounded-full transition-all"
                              />
                            </div>
                          )}
                        </button>
                      );
                    })
                  ) : (
                    <div className="p-5 rounded-2xl bg-white/[0.02] border border-white/5 text-sm text-[var(--text-light)] leading-relaxed">
                      {song.description || 'No timestamped chapters provided for this episode.'}
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* Desktop Lyrics Tab */}
            {activeTab === 'lyrics' && (
              <div className="flex-1 flex flex-col h-full overflow-hidden">
                <div className="flex flex-wrap items-center justify-between gap-2 pb-3 mb-3 border-b border-white/10 flex-shrink-0">
                  <div className="flex items-center gap-2">
                    <MicrophoneStage weight="duotone" className="w-4 h-4 text-[var(--primary)]" />
                    <h3 className="text-sm font-bold text-white">Karaoke Lyrics Studio</h3>
                    {lyricsData.type === 'synced' && (
                      <span className="text-[10px] px-2 py-0.5 rounded-full bg-[var(--primary)]/15 text-[var(--primary)] border border-[var(--primary)]/30 font-extrabold uppercase tracking-wider">
                        Time-Synced
                      </span>
                    )}
                  </div>

                  {/* Lyrics Toolbar */}
                  <div className="flex items-center gap-1.5 flex-wrap">
                    {(lyricsData.romanizedLines?.length > 0 || lyricsData.translationLines?.length > 0) && (
                      <div className="flex items-center bg-black/40 p-0.5 rounded-xl border border-white/10">
                        <button
                          onClick={() => setLyricsLanguageMode('original')}
                          className={`px-2 py-1 rounded-lg text-[10px] font-bold transition-all cursor-pointer ${
                            lyricsLanguageMode === 'original'
                              ? 'bg-[var(--primary)] text-black'
                              : 'text-white/70 hover:text-white'
                          }`}
                        >
                          Original
                        </button>
                        {lyricsData.romanizedLines?.length > 0 && (
                          <button
                            onClick={() => setLyricsLanguageMode('romanized')}
                            className={`px-2 py-1 rounded-lg text-[10px] font-bold transition-all cursor-pointer ${
                              lyricsLanguageMode === 'romanized'
                                ? 'bg-[var(--primary)] text-black'
                                : 'text-white/70 hover:text-white'
                            }`}
                          >
                            Romanized
                          </button>
                        )}
                        {lyricsData.translationLines?.length > 0 && (
                          <button
                            onClick={() => setLyricsLanguageMode('translation')}
                            className={`px-2 py-1 rounded-lg text-[10px] font-bold transition-all cursor-pointer ${
                              lyricsLanguageMode === 'translation'
                                ? 'bg-[var(--primary)] text-black'
                                : 'text-white/70 hover:text-white'
                            }`}
                          >
                            English
                          </button>
                        )}
                      </div>
                    )}

                    {/* Sync Offset Calibration (-0.5s / +0.5s) & Auto-Scroll */}
                    {lyricsData.type === 'synced' && (
                      <div className="flex items-center gap-1 bg-black/40 p-0.5 rounded-xl border border-white/10">
                        <button
                          onClick={() => setSyncOffset((o) => Math.round((o - 0.5) * 10) / 10)}
                          className="px-2 py-1 rounded-lg text-[10px] font-mono font-bold text-white/75 hover:text-[var(--primary)] hover:bg-white/5 cursor-pointer"
                          title="Delay lyrics by 0.5s"
                        >
                          -0.5s
                        </button>
                        <button
                          onClick={() => setSyncOffset(0)}
                          className="px-1.5 py-1 text-[10px] font-mono font-bold text-[var(--primary)] cursor-pointer"
                          title="Reset lyric sync offset"
                        >
                          {syncOffset === 0 ? '0.0s' : `${syncOffset > 0 ? '+' : ''}${syncOffset.toFixed(1)}s`}
                        </button>
                        <button
                          onClick={() => setSyncOffset((o) => Math.round((o + 0.5) * 10) / 10)}
                          className="px-2 py-1 rounded-lg text-[10px] font-mono font-bold text-white/75 hover:text-[var(--primary)] hover:bg-white/5 cursor-pointer"
                          title="Advance lyrics by 0.5s"
                        >
                          +0.5s
                        </button>
                      </div>
                    )}

                    <button
                      onClick={() => setAutoScroll((a) => !a)}
                      className={`px-2.5 py-1 rounded-xl border text-[11px] font-bold flex items-center gap-1 cursor-pointer ${
                        autoScroll
                          ? 'bg-[var(--primary)]/15 border-[var(--primary)]/30 text-[var(--primary)]'
                          : 'bg-white/5 border-white/10 text-white/60 hover:text-white'
                      }`}
                      title="Toggle Auto-Scroll Lyrics"
                    >
                      <span>{autoScroll ? 'Auto-Scroll On' : 'Auto-Scroll Off'}</span>
                    </button>

                    <button
                      onClick={() =>
                        setLyricsFontSize((s) => (s === 'normal' ? 'large' : s === 'large' ? 'xl' : 'normal'))
                      }
                      className="px-2.5 py-1 rounded-xl bg-white/5 hover:bg-white/10 border border-white/10 text-[11px] font-bold text-white/80 flex items-center gap-1 cursor-pointer"
                      title="Cycle Lyric Font Size"
                    >
                      <TextT weight="bold" className="w-3.5 h-3.5 text-[var(--primary)]" />
                      <span className="uppercase">{lyricsFontSize}</span>
                    </button>

                    {lyricsData.lines.length > 0 && (
                      <button
                        onClick={handleCopyLyrics}
                        className="px-2.5 py-1 rounded-xl bg-white/5 hover:bg-white/10 border border-white/10 text-[11px] font-bold text-white/80 flex items-center gap-1 cursor-pointer"
                        title="Copy Lyrics"
                      >
                        {copiedLyrics ? (
                          <Check weight="bold" className="w-3.5 h-3.5 text-emerald-400" />
                        ) : (
                          <Copy weight="duotone" className="w-3.5 h-3.5" />
                        )}
                        <span>{copiedLyrics ? 'Copied' : 'Copy'}</span>
                      </button>
                    )}

                    <button
                      onClick={() => handleFetchGoogleLyrics()}
                      disabled={isSearchingGoogleLyrics}
                      className="px-2.5 py-1 rounded-xl bg-[var(--primary)]/15 hover:bg-[var(--primary)]/25 border border-[var(--primary)]/30 text-[11px] font-bold text-[var(--primary)] flex items-center gap-1 cursor-pointer disabled:opacity-50"
                      title="Deep Search Synced Lyrics"
                    >
                      <Sparkle weight="fill" className={`w-3 h-3 ${isSearchingGoogleLyrics ? 'animate-spin' : ''}`} />
                      <span>{isSearchingGoogleLyrics ? 'Syncing...' : 'Sync Lyrics'}</span>
                    </button>
                  </div>
                </div>

                {/* Echo-Music 6-Provider Module Switcher Bar */}
                <div className="flex items-center gap-1.5 overflow-x-auto no-scrollbar pb-2.5 mb-1 border-b border-white/5">
                  <span className="text-[10px] font-mono uppercase tracking-wider text-white/45 flex-shrink-0 mr-1">
                    Source:
                  </span>
                  {ECHO_LYRICS_PROVIDER_OPTIONS.map((prov) => {
                    const isActive = selectedLyricsProvider === prov.id;
                    return (
                      <button
                        key={prov.id}
                        type="button"
                        onClick={() => setSelectedLyricsProvider(prov.id)}
                        className={`px-2.5 py-1 rounded-lg text-[10px] font-bold whitespace-nowrap transition-all cursor-pointer flex-shrink-0 ${
                          isActive
                            ? 'bg-[var(--primary)] text-black shadow-[0_0_12px_rgba(83,242,224,0.3)]'
                            : 'bg-white/5 text-white/65 hover:text-white hover:bg-white/10 border border-white/10'
                        }`}
                      >
                        {prov.label}
                      </button>
                    );
                  })}
                </div>

                {/* Scrollable Lyrics Canvas */}
                <div
                  ref={lyricsContainerRef}
                  className="flex-1 overflow-y-auto px-3 py-6 space-y-4 custom-scrollbar text-center"
                >
                  {lyricsData.loading ? (
                    <div className="h-full flex flex-col items-center justify-center gap-3 text-[var(--text-light)]">
                      <div className="w-9 h-9 rounded-full border-2 border-[var(--primary)] border-t-transparent animate-spin" />
                      <p className="text-xs font-medium">Fetching studio-grade lyrics for "{song.title}"...</p>
                    </div>
                  ) : lyricsData.lines.length > 0 ? (
                    lyricsData.lines.map((lineObj, idx) => {
                      const rawLine = typeof lineObj === 'object' ? lineObj.text : lineObj;
                      const displayLine =
                        lyricsLanguageMode === 'romanized' && lyricsData.romanizedLines?.[idx]
                          ? lyricsData.romanizedLines[idx]
                          : lyricsLanguageMode === 'translation' && lyricsData.translationLines?.[idx]
                          ? lyricsData.translationLines[idx]
                          : rawLine;
                      const isSynced = lyricsData.type === 'synced';
                      const isCurrent = isSynced && idx === activeLyricIndex;
                      const isPast = isSynced && idx < activeLyricIndex;

                      const sizeClass =
                        lyricsFontSize === 'xl'
                          ? 'text-xl sm:text-2xl'
                          : lyricsFontSize === 'large'
                          ? 'text-lg sm:text-xl'
                          : 'text-base sm:text-lg';

                      return (
                        <div
                          key={idx}
                          data-lyric-idx={idx}
                          onClick={() => {
                            if (isSynced && typeof lineObj.time === 'number') {
                              seekTo(Math.max(0, lineObj.time - syncOffset));
                            }
                          }}
                          className={`relative overflow-hidden transition-all duration-300 px-4 py-2.5 rounded-2xl ${
                            isSynced ? 'cursor-pointer hover:bg-white/5' : ''
                          } ${
                            isCurrent
                              ? 'bg-[var(--primary)]/12 border border-[var(--primary)]/30 text-[var(--primary)] font-extrabold scale-[1.03] shadow-[0_0_24px_rgba(83,242,224,0.18)]'
                              : isPast
                              ? 'text-white/40 font-semibold'
                              : 'text-white/75 font-semibold'
                          } ${sizeClass}`}
                        >
                          <div className="flex items-center justify-between gap-2">
                            <span className="flex-1 text-center">{displayLine}</span>
                            {isSynced && typeof lineObj.time === 'number' && (
                              <span className="text-[10px] font-mono tabular-nums opacity-45 flex-shrink-0">
                                {formatTime(Math.max(0, lineObj.time - syncOffset))}
                              </span>
                            )}
                          </div>
                          {isCurrent && (
                            <div className="w-24 mx-auto h-0.5 bg-white/15 rounded-full overflow-hidden mt-1.5">
                              <div
                                style={{ width: `${activeLyricProgress}%` }}
                                className="h-full bg-[var(--primary)] transition-all duration-150"
                              />
                            </div>
                          )}
                        </div>
                      );
                    })
                  ) : (
                    <div className="h-full flex flex-col items-center justify-center gap-3 text-center py-8">
                      <MicrophoneStage weight="duotone" className="w-10 h-10 text-white/25" />
                      <p className="text-sm font-bold text-white/80">No instant lyrics cached for this track</p>
                      <button
                        onClick={handleFetchGoogleLyrics}
                        disabled={isSearchingGoogleLyrics}
                        className="px-4 py-2 rounded-xl bg-[var(--primary)] text-black text-xs font-extrabold flex items-center gap-1.5 shadow-md hover:brightness-110 cursor-pointer"
                      >
                        <Sparkle weight="fill" className="w-4 h-4" />
                        <span>{isSearchingGoogleLyrics ? 'Searching...' : 'Search Grounded Lyrics'}</span>
                      </button>
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* Desktop Queue Tab */}
            {activeTab === 'queue' && (
              <div className="flex-1 flex flex-col h-full overflow-hidden">
                <div className="flex items-center justify-between gap-3 pb-3 mb-3 border-b border-white/10 flex-shrink-0">
                  <div>
                    <h3 className="text-sm font-bold text-white flex items-center gap-2">
                      <Playlist weight="duotone" className="w-4 h-4 text-[var(--primary)]" />
                      <span>Up Next Queue</span>
                      <span className="text-xs font-mono text-[var(--primary)]">({queueList.length})</span>
                    </h3>
                  </div>

                  {/* Filter Queue Input */}
                  <div className="relative w-52">
                    <MagnifyingGlass className="w-3.5 h-3.5 text-white/40 absolute left-3 top-1/2 -translate-y-1/2" />
                    <input
                      type="text"
                      value={searchQueue}
                      onChange={(e) => setSearchQueue(e.target.value)}
                      placeholder="Filter queue..."
                      className="w-full pl-8 pr-3 py-1.5 rounded-xl bg-black/40 border border-white/10 text-xs text-white placeholder:text-white/35 focus:outline-none focus:border-[var(--primary)]/50"
                    />
                  </div>
                </div>

                <div className="flex-1 overflow-y-auto space-y-1.5 pr-1 custom-scrollbar">
                  {queueList.map((item, idx) => {
                    const isCurrent = item.id === song.id;
                    return (
                      <div
                        key={item.id || idx}
                        onClick={() => handleSelectSong(item)}
                        className={`flex items-center justify-between p-2.5 rounded-2xl border transition-all cursor-pointer group ${
                          isCurrent
                            ? 'bg-[var(--primary)]/15 border-[var(--primary)]/40 text-white'
                            : 'bg-white/[0.02] border-transparent hover:bg-white/[0.06] text-white/85'
                        }`}
                      >
                        <div className="flex items-center gap-3 min-w-0">
                          <span className="w-5 text-center text-xs font-mono text-white/45 flex-shrink-0">
                            {isCurrent ? (
                              <Waveform weight="bold" className="w-4 h-4 text-[var(--primary)] mx-auto animate-pulse" />
                            ) : (
                              idx + 1
                            )}
                          </span>
                          <img
                            src={mediaUrl(item.coverUrl, item)}
                            alt={item.title}
                            loading="lazy"
                            decoding="async"
                            className="w-10 h-10 rounded-xl object-cover border border-white/10 flex-shrink-0"
                            referrerPolicy="no-referrer"
                            onError={(e) => handleCoverError(e, item)}
                          />
                          <div className="min-w-0">
                            <p
                              className={`text-xs sm:text-sm font-bold truncate ${
                                isCurrent ? 'text-[var(--primary)]' : 'text-white group-hover:text-[var(--primary)]'
                              }`}
                            >
                              {item.title}
                            </p>
                            <p className="text-[11px] text-[var(--text-light)] truncate">
                              {item.singers || item.artist}
                            </p>
                          </div>
                        </div>

                        <div className="flex items-center gap-2 flex-shrink-0">
                          {item.duration && (
                            <span className="text-[11px] font-mono text-white/45">
                              {formatTime(item.duration)}
                            </span>
                          )}
                          <div
                            className={`w-8 h-8 rounded-full flex items-center justify-center transition-all ${
                              isCurrent
                                ? 'bg-[var(--primary)] text-black'
                                : 'bg-white/5 text-white/70 group-hover:bg-[var(--primary)] group-hover:text-black'
                            }`}
                          >
                            {isCurrent && isPlaying ? (
                              <Pause weight="fill" className="w-3.5 h-3.5" />
                            ) : (
                              <Play weight="fill" className="w-3.5 h-3.5 ml-0.5" />
                            )}
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}
          </div>
        </div>

        {/* ─── MOBILE / TABLET (<lg): Responsive Single-Stage View ─── */}
        <div className="lg:hidden flex-1 flex flex-col justify-between min-h-0">
          {activeTab === 'art' && (
            <div className="flex-1 flex flex-col items-center justify-center py-1">
              {/* Mobile Vinyl / Sleeve Showcase */}
              <div
                onClick={() => togglePlay()}
                className="relative w-56 h-56 xs:w-64 xs:h-64 sm:w-72 sm:h-72 mx-auto mb-4 flex items-center justify-center cursor-pointer"
              >
                <div
                  className={`absolute inset-0 rounded-full bg-[var(--primary)]/15 blur-2xl transition-opacity ${
                    isPlaying ? 'opacity-90' : 'opacity-30'
                  }`}
                />
                <div className="relative z-10 w-full h-full rounded-3xl overflow-hidden border-2 border-white/15 shadow-[0_18px_45px_rgba(0,0,0,0.8)] bg-[#12181b]">
                  <img
                    src={mediaUrl(song.coverUrl, song)}
                    alt={song.title}
                    decoding="async"
                    className="w-full h-full object-cover"
                    referrerPolicy="no-referrer"
                    onError={(e) => handleCoverError(e, song)}
                  />
                  <div className="absolute inset-0 bg-gradient-to-t from-black/65 via-transparent to-transparent" />
                  <div className="absolute bottom-2.5 inset-x-2.5 flex items-center justify-between px-2.5 py-1 rounded-xl bg-black/65 backdrop-blur-md border border-white/10">
                    <span className="text-[10px] font-mono font-bold text-[var(--primary)] flex items-center gap-1">
                      <Waveform weight="bold" className="w-3 h-3" /> HI-RES
                    </span>
                    <span className="text-[10px] font-mono text-white/80 tabular-nums">
                      {formatTime(currentTime)}
                    </span>
                  </div>
                </div>
              </div>

              {/* Mobile Song Title & Artist + Podcast Chapter Quick Strip */}
              <div className="w-full text-center px-2 mb-2">
                <h1 className="text-lg xs:text-xl sm:text-2xl font-extrabold text-white tracking-tight truncate">
                  {song.title}
                </h1>
                <p className="text-xs sm:text-sm text-[var(--text-light)] font-medium truncate mt-0.5">
                  {song.singers || song.artist}
                </p>

                {isPodcast && activeChapter && (
                  <div className="mt-2.5 inline-flex items-center gap-2 px-3 py-1.5 rounded-xl bg-[var(--primary)]/12 border border-[var(--primary)]/30 max-w-full">
                    <button
                      onClick={() => jumpToChapterOffset(-1)}
                      disabled={activeChapterIndex <= 0}
                      className="text-xs font-bold text-white/80 disabled:opacity-30 px-1"
                    >
                      ◀
                    </button>
                    <span className="text-xs font-bold text-[var(--primary)] truncate">
                      Ch {activeChapterIndex + 1}: {activeChapter.title}
                    </span>
                    <button
                      onClick={() => jumpToChapterOffset(1)}
                      disabled={activeChapterIndex >= (song.chapters?.length || 1) - 1}
                      className="text-xs font-bold text-white/80 disabled:opacity-30 px-1"
                    >
                      ▶
                    </button>
                  </div>
                )}

                {/* Mobile Live Synced Lyric Banner on Studio Deck */}
                {!isPodcast && lyricsData.lines.length > 0 && (
                  <button
                    type="button"
                    onClick={() => setActiveTab('lyrics')}
                    className="mt-2.5 w-full max-w-md mx-auto flex items-center justify-center gap-2 px-3.5 py-2 rounded-2xl bg-[var(--primary)]/10 border border-[var(--primary)]/25 text-xs font-bold text-[var(--primary)] transition-all active:scale-98 cursor-pointer"
                  >
                    <MicrophoneStage weight="duotone" className="w-4 h-4 flex-shrink-0" />
                    <span className="truncate">
                      {activeLyricIndex >= 0 && lyricsData.lines[activeLyricIndex]
                        ? lyricsData.lines[activeLyricIndex].text
                        : lyricsData.lines[0]?.text || lyricsData.lines[0]}
                    </span>
                  </button>
                )}
              </div>
            </div>
          )}

          {/* Mobile Lyrics View */}
          {activeTab === 'lyrics' && (
            <div className="flex-1 bg-[#10161a]/90 border border-white/10 rounded-3xl p-3.5 sm:p-4 flex flex-col overflow-hidden max-h-[54dvh] mb-2">
              <div className="flex flex-wrap items-center justify-between gap-1.5 pb-2.5 mb-2 border-b border-white/10">
                <span className="text-xs font-bold text-[var(--primary)] flex items-center gap-1.5">
                  <MicrophoneStage weight="duotone" className="w-4 h-4" />
                  {lyricsData.type === 'synced' ? 'Live Synced Lyrics' : 'Lyrics'}
                </span>
                <div className="flex items-center gap-1">
                  {lyricsData.type === 'synced' && (
                    <div className="flex items-center bg-black/40 p-0.5 rounded-lg border border-white/10 text-[10px] font-mono font-bold">
                      <button
                        onClick={() => setSyncOffset((o) => Math.round((o - 0.5) * 10) / 10)}
                        className="px-1.5 py-0.5 text-white/75 active:text-[var(--primary)]"
                      >
                        -0.5s
                      </button>
                      <button
                        onClick={() => setSyncOffset(0)}
                        className="px-1 py-0.5 text-[var(--primary)]"
                      >
                        {syncOffset === 0 ? '0s' : `${syncOffset > 0 ? '+' : ''}${syncOffset}s`}
                      </button>
                      <button
                        onClick={() => setSyncOffset((o) => Math.round((o + 0.5) * 10) / 10)}
                        className="px-1.5 py-0.5 text-white/75 active:text-[var(--primary)]"
                      >
                        +0.5s
                      </button>
                    </div>
                  )}
                  <button
                    onClick={() => handleFetchGoogleLyrics()}
                    disabled={isSearchingGoogleLyrics}
                    className="px-2.5 py-1 rounded-lg bg-[var(--primary)]/15 text-[var(--primary)] text-[11px] font-bold flex items-center gap-1"
                  >
                    <Sparkle weight="fill" className="w-3 h-3" />
                    <span>{isSearchingGoogleLyrics ? 'Syncing...' : 'Sync'}</span>
                  </button>
                </div>
              </div>

              {/* Mobile Echo-Music 6-Provider Selector Strip */}
              <div className="flex items-center gap-1 overflow-x-auto no-scrollbar pb-2 mb-1 border-b border-white/5">
                {ECHO_LYRICS_PROVIDER_OPTIONS.map((prov) => {
                  const isActive = selectedLyricsProvider === prov.id;
                  return (
                    <button
                      key={prov.id}
                      type="button"
                      onClick={() => setSelectedLyricsProvider(prov.id)}
                      className={`px-2 py-0.5 rounded-md text-[10px] font-bold whitespace-nowrap transition-all flex-shrink-0 ${
                        isActive
                          ? 'bg-[var(--primary)] text-black'
                          : 'bg-white/5 text-white/60 border border-white/10'
                      }`}
                    >
                      {prov.label}
                    </button>
                  );
                })}
              </div>
              <div
                ref={mobileLyricsContainerRef}
                className="flex-1 overflow-y-auto space-y-2.5 py-3 text-center custom-scrollbar relative"
              >
                {lyricsData.loading ? (
                  <p className="text-xs text-[var(--text-light)] py-10">Synchronizing time-coded lyrics...</p>
                ) : lyricsData.lines.length > 0 ? (
                  lyricsData.lines.map((lineObj, idx) => {
                    const text = typeof lineObj === 'object' ? lineObj.text : lineObj;
                    const isSynced = lyricsData.type === 'synced';
                    const isCurrent = isSynced && idx === activeLyricIndex;
                    const isPast = isSynced && idx < activeLyricIndex;
                    return (
                      <div
                        key={idx}
                        data-lyric-idx={idx}
                        onClick={() => {
                          if (isSynced && typeof lineObj.time === 'number') {
                            seekTo(Math.max(0, lineObj.time - syncOffset));
                          }
                        }}
                        className={`text-sm sm:text-base px-3 py-2 rounded-2xl transition-all duration-300 ${
                          isSynced ? 'cursor-pointer active:bg-white/10' : ''
                        } ${
                          isCurrent
                            ? 'text-[var(--primary)] font-extrabold bg-[var(--primary)]/12 border border-[var(--primary)]/30 scale-[1.02] shadow-[0_0_18px_rgba(83,242,224,0.16)]'
                            : isPast
                            ? 'text-white/40 font-medium'
                            : 'text-white/75 font-medium'
                        }`}
                      >
                        <span>{text}</span>
                        {isCurrent && (
                          <div className="w-20 mx-auto h-0.5 bg-white/15 rounded-full overflow-hidden mt-1.5">
                            <div
                              style={{ width: `${activeLyricProgress}%` }}
                              className="h-full bg-[var(--primary)] transition-all duration-150"
                            />
                          </div>
                        )}
                      </div>
                    );
                  })
                ) : (
                  <p className="text-xs text-white/60 py-10">Tap Sync above to fetch time-synced lyrics.</p>
                )}
              </div>
            </div>
          )}

          {/* Mobile Chapters View */}
          {activeTab === 'notes' && isPodcast && (
            <div className="flex-1 bg-[#10161a]/90 border border-white/10 rounded-3xl p-4 overflow-y-auto max-h-[52dvh] mb-2 space-y-2">
              {song.chapters && song.chapters.length > 0 ? (
                song.chapters.map((ch, idx) => (
                  <button
                    key={idx}
                    onClick={() => seekTo(ch.time)}
                    className="w-full flex items-center justify-between p-2.5 rounded-xl bg-white/5 text-left"
                  >
                    <span className="text-xs font-bold text-white truncate">{ch.title}</span>
                    <span className="text-[11px] font-mono text-[var(--primary)] ml-2">{formatTime(ch.time)}</span>
                  </button>
                ))
              ) : (
                <p className="text-xs text-[var(--text-light)] leading-relaxed">{song.description}</p>
              )}
            </div>
          )}

          {/* Mobile Queue View */}
          {activeTab === 'queue' && (
            <div className="flex-1 bg-[#10161a]/90 border border-white/10 rounded-3xl p-3.5 flex flex-col overflow-hidden max-h-[52dvh] mb-2">
              <div className="flex-1 overflow-y-auto space-y-1.5 pr-1 custom-scrollbar">
                {queueList.map((item, idx) => {
                  const isCurrent = item.id === song.id;
                  return (
                    <div
                      key={item.id || idx}
                      onClick={() => handleSelectSong(item)}
                      className={`flex items-center justify-between p-2 rounded-xl ${
                        isCurrent ? 'bg-[var(--primary)]/15 text-[var(--primary)]' : 'bg-white/[0.02] text-white'
                      }`}
                    >
                      <div className="flex items-center gap-2.5 min-w-0">
                        <img
                          src={mediaUrl(item.coverUrl, item)}
                          alt={item.title}
                          loading="lazy"
                          decoding="async"
                          className="w-9 h-9 rounded-lg object-cover flex-shrink-0"
                          referrerPolicy="no-referrer"
                          onError={(e) => handleCoverError(e, item)}
                        />
                        <div className="min-w-0">
                          <p className="text-xs font-bold truncate">{item.title}</p>
                          <p className="text-[10px] text-[var(--text-light)] truncate">{item.singers || item.artist}</p>
                        </div>
                      </div>
                      <Play weight="fill" className="w-3.5 h-3.5 flex-shrink-0 mr-1" />
                    </div>
                  );
                })}
              </div>
            </div>
          )}
        </div>
      </div>

      {/* ─── Bottom Tactile Studio Transport Dock ─────────────────────────────── */}
      <footer className="mt-3 sm:mt-5 pt-3 sm:pt-4 border-t border-white/10 bg-[#0d1316]/95 rounded-3xl px-3.5 sm:px-6 py-3 sm:py-4 border border-white/10 shadow-[0_16px_40px_rgba(0,0,0,0.75)] flex-shrink-0">
        {/* Interactive Scrubber Timeline */}
        <div className="mb-3">
          <div
            ref={seekBarRef}
            onClick={handleSeekClick}
            onMouseEnter={() => setIsHoveringSeek(true)}
            onMouseLeave={() => setIsHoveringSeek(false)}
            onMouseMove={handleSeekMouseMove}
            onTouchStart={handleTouchStart}
            onTouchMove={handleTouchMove}
            onTouchEnd={handleTouchEnd}
            className="relative h-6 flex items-center cursor-pointer group touch-none"
          >
            {/* Hover Time & Chapter Preview Pill */}
            {(isHoveringSeek || isDraggingSeek) && activeDuration > 0 && (
              <div
                style={{
                  left: `${Math.max(8, Math.min(92, (hoverSeekTime / activeDuration) * 100))}%`,
                }}
                className="absolute -top-9 -translate-x-1/2 px-2.5 py-1 rounded-lg bg-[var(--primary)] text-black text-[10px] font-mono font-extrabold shadow-lg pointer-events-none whitespace-nowrap z-20 flex items-center gap-1.5"
              >
                <span>{formatTime(hoverSeekTime)}</span>
                {hoverChapterTitle && (
                  <span className="font-sans font-bold max-w-[160px] truncate border-l border-black/25 pl-1.5">
                    {hoverChapterTitle}
                  </span>
                )}
              </div>
            )}

            {/* Track Rail */}
            <div className="w-full h-2 group-hover:h-2.5 bg-white/10 rounded-full overflow-hidden relative transition-all">
              {/* Buffered Progress */}
              <div
                style={{ width: `${Math.min(100, bufferedProgress)}%` }}
                className="absolute inset-y-0 left-0 bg-white/15 rounded-full transition-all"
              />

              {/* Podcast Chapter Tick Dividers on Scrubber */}
              {isPodcast &&
                activeDuration > 0 &&
                song.chapters?.map((ch, idx) => {
                  if (ch.time <= 0 || ch.time >= activeDuration) return null;
                  const pct = (ch.time / activeDuration) * 100;
                  return (
                    <div
                      key={idx}
                      style={{ left: `${pct}%` }}
                      className="absolute inset-y-0 w-[2px] bg-black/80 z-10 pointer-events-none"
                    />
                  );
                })}

              {/* Active Playback Fill */}
              <div
                style={{ width: `${progressPercent}%` }}
                className="
                  absolute inset-y-0 left-0
                  bg-gradient-to-r from-[var(--primary)] via-cyan-300 to-[var(--primary)]
                  rounded-full shadow-[0_0_12px_rgba(83,242,224,0.6)]
                "
              />
            </div>

            {/* Scrubber Thumb */}
            <div
              style={{ left: `${progressPercent}%` }}
              className="w-4 h-4 rounded-full bg-white border-2 border-[var(--primary)] shadow-[0_0_12px_rgba(83,242,224,0.9)] absolute -translate-x-1/2 scale-90 group-hover:scale-110 transition-transform"
            />
          </div>

          <div className="flex items-center justify-between text-[11px] font-mono font-semibold text-[var(--text-light)] tabular-nums -mt-1">
            <span className="text-white/90">{formatTime(currentTime)}</span>
            {resolvingStatus ? (
              <span className="text-[var(--primary)] animate-pulse text-[10px] font-sans font-bold">
                {resolvingStatus}
              </span>
            ) : (
              <span className="text-[10px] uppercase tracking-wider text-white/45 hidden xs:inline">
                {isPodcast ? `Speed ${playbackRate}x` : 'Master Stream'}
              </span>
            )}
            <span>{formatTime(activeDuration)}</span>
          </div>
        </div>

        {/* ─── Transport Controls: Symmetrical Mobile & 3-Column Desktop Grid ─── */}
        {/* MOBILE (<md): Symmetrical 5-Column Primary Transport + Centered Studio Utility Strip */}
        <div className="md:hidden flex flex-col gap-2.5">
          {/* Primary Symmetrical 5-Button Transport Row (Play button strictly at 50% center) */}
          <div className="grid grid-cols-5 items-center justify-items-center w-full max-w-[340px] mx-auto">
            {/* Slot 1 (Far Left): Shuffle (Music) or Rewind 15s (Podcast) */}
            {!isPodcast ? (
              <button
                onClick={toggleShuffle}
                className={`w-10 h-10 rounded-xl flex items-center justify-center transition-all active:scale-95 cursor-pointer ${
                  isShuffled
                    ? 'bg-[var(--primary)]/20 text-[var(--primary)] border border-[var(--primary)]/40'
                    : 'bg-white/[0.04] text-white/70 hover:text-white border border-white/[0.08]'
                }`}
                title="Shuffle"
                aria-label="Toggle Shuffle"
              >
                <Shuffle weight={isShuffled ? 'bold' : 'regular'} className="w-4 h-4" />
              </button>
            ) : (
              <button
                onClick={() => skipBackwardSeconds(15)}
                className="w-10 h-10 rounded-xl bg-white/[0.04] hover:bg-white/10 border border-white/[0.08] text-white/80 flex items-center justify-center transition-all active:scale-95 cursor-pointer"
                title="Rewind 15 seconds"
                aria-label="Rewind 15 seconds"
              >
                <ArrowCounterClockwise weight="bold" className="w-4 h-4" />
              </button>
            )}

            {/* Slot 2 (Inner Left): Previous Track */}
            <button
              onClick={playPrev}
              className="w-11 h-11 rounded-2xl bg-white/[0.08] hover:bg-white/15 border border-white/10 text-white flex items-center justify-center transition-all active:scale-95 cursor-pointer"
              title="Previous Track"
              aria-label="Previous Track"
            >
              <SkipBack weight="fill" className="w-5 h-5" />
            </button>

            {/* Slot 3 (Exact 50% Center): Primary Play / Pause Button */}
            <button
              onClick={togglePlay}
              className="w-14 h-14 rounded-2xl bg-[var(--primary)] text-[var(--primary-foreground)] shadow-[0_0_28px_rgba(83,242,224,0.48)] hover:brightness-110 active:scale-95 transition-all flex items-center justify-center cursor-pointer"
              title={isPlaying ? 'Pause' : 'Play'}
              aria-label={isPlaying ? 'Pause' : 'Play'}
            >
              {isPlaying ? (
                <Pause weight="fill" className="w-6 h-6" />
              ) : (
                <Play weight="fill" className="w-6 h-6 ml-0.5" />
              )}
            </button>

            {/* Slot 4 (Inner Right): Next Track */}
            <button
              onClick={playNext}
              className="w-11 h-11 rounded-2xl bg-white/[0.08] hover:bg-white/15 border border-white/10 text-white flex items-center justify-center transition-all active:scale-95 cursor-pointer"
              title="Next Track"
              aria-label="Next Track"
            >
              <SkipForward weight="fill" className="w-5 h-5" />
            </button>

            {/* Slot 5 (Far Right): Repeat (Music) or Forward 30s (Podcast) */}
            {!isPodcast ? (
              <button
                onClick={cycleRepeat}
                className={`w-10 h-10 rounded-xl flex items-center justify-center transition-all active:scale-95 cursor-pointer ${
                  repeatMode !== 'off'
                    ? 'bg-[var(--primary)]/20 text-[var(--primary)] border border-[var(--primary)]/40'
                    : 'bg-white/[0.04] text-white/70 hover:text-white border border-white/[0.08]'
                }`}
                title={`Repeat: ${repeatMode}`}
                aria-label="Cycle Repeat Mode"
              >
                {repeatMode === 'one' ? (
                  <RepeatOnce weight="bold" className="w-4 h-4" />
                ) : (
                  <Repeat weight={repeatMode !== 'off' ? 'bold' : 'regular'} className="w-4 h-4" />
                )}
              </button>
            ) : (
              <button
                onClick={() => skipForwardSeconds(30)}
                className="w-10 h-10 rounded-xl bg-white/[0.04] hover:bg-white/10 border border-white/[0.08] text-white/80 flex items-center justify-center transition-all active:scale-95 cursor-pointer"
                title="Forward 30 seconds"
                aria-label="Forward 30 seconds"
              >
                <ArrowClockwise weight="bold" className="w-4 h-4" />
              </button>
            )}
          </div>

          {/* Mobile Secondary Studio Utility Strip (Rewind -15s, Speed, Sleep Timer, Forward +30s) */}
          <div className="flex items-center justify-between w-full max-w-[340px] mx-auto pt-2 border-t border-white/[0.06]">
            <button
              onClick={() => skipBackwardSeconds(15)}
              className="h-8 px-2.5 rounded-lg bg-white/[0.04] hover:bg-white/10 border border-white/[0.08] text-[11px] font-mono font-bold text-white/75 hover:text-white flex items-center gap-1 transition-all active:scale-95 cursor-pointer"
              title="Rewind 15 seconds"
            >
              <ArrowCounterClockwise weight="bold" className="w-3.5 h-3.5 text-[var(--primary)]" />
              <span>-15s</span>
            </button>

            <button
              onClick={() => {
                const rates = [0.75, 1, 1.25, 1.5, 2];
                const next = rates[(rates.indexOf(playbackRate) + 1) % rates.length];
                setPlaybackRate(next);
              }}
              className="h-8 px-2.5 rounded-lg bg-white/[0.04] hover:bg-white/10 border border-white/[0.08] text-[11px] font-mono font-bold text-[var(--primary)] flex items-center gap-1 transition-all active:scale-95 cursor-pointer"
              title="Playback Speed"
            >
              <Gauge weight="duotone" className="w-3.5 h-3.5" />
              <span>{playbackRate}x</span>
            </button>

            <div className="relative">
              <button
                onClick={() => setShowSleepMenu((v) => !v)}
                className={`h-8 px-2.5 rounded-lg flex items-center gap-1 text-[11px] font-bold transition-all active:scale-95 cursor-pointer ${
                  sleepSecondsLeft
                    ? 'bg-amber-500/20 text-amber-300 border border-amber-500/35'
                    : 'bg-white/[0.04] text-white/75 hover:text-white border border-white/[0.08]'
                }`}
                title="Sleep Timer"
              >
                <Timer weight={sleepSecondsLeft ? 'fill' : 'regular'} className="w-3.5 h-3.5" />
                <span>{sleepSecondsLeft ? `${Math.ceil(sleepSecondsLeft / 60)}m` : 'Timer'}</span>
              </button>

              {showSleepMenu && (
                <div className="absolute bottom-10 left-1/2 -translate-x-1/2 z-30 w-40 p-2 rounded-2xl bg-[#141c21] border border-white/15 shadow-2xl space-y-1">
                  <p className="text-[10px] font-bold uppercase tracking-wider text-white/50 px-2 py-1">
                    Sleep Timer
                  </p>
                  {[15, 30, 45, 60].map((m) => (
                    <button
                      key={m}
                      onClick={() => handleSetSleepTimer(m)}
                      className={`w-full text-left px-2.5 py-1.5 rounded-xl text-xs font-semibold transition-colors cursor-pointer ${
                        sleepTimerOption === m
                          ? 'bg-[var(--primary)] text-black font-bold'
                          : 'text-white/80 hover:bg-white/10'
                      }`}
                    >
                      {m} Minutes
                    </button>
                  ))}
                  {sleepSecondsLeft && (
                    <button
                      onClick={() => handleSetSleepTimer(null)}
                      className="w-full text-left px-2.5 py-1.5 rounded-xl text-xs font-bold text-red-400 hover:bg-red-500/10 cursor-pointer"
                    >
                      Turn Off Timer
                    </button>
                  )}
                </div>
              )}
            </div>

            <button
              onClick={() => skipForwardSeconds(30)}
              className="h-8 px-2.5 rounded-lg bg-white/[0.04] hover:bg-white/10 border border-white/[0.08] text-[11px] font-mono font-bold text-white/75 hover:text-white flex items-center gap-1 transition-all active:scale-95 cursor-pointer"
              title="Forward 30 seconds"
            >
              <span>+30s</span>
              <ArrowClockwise weight="bold" className="w-3.5 h-3.5 text-[var(--primary)]" />
            </button>
          </div>
        </div>

        {/* DESKTOP (md+): 3-Column Balanced Grid (Guarantees Center Play Button is at Exact 50% X) */}
        <div className="hidden md:grid md:grid-cols-3 items-center gap-4">
          {/* Left Utility Controls (Shuffle, Speed, Sleep Timer) */}
          <div className="flex items-center gap-2 justify-self-start">
            {!isPodcast && (
              <button
                onClick={toggleShuffle}
                className={`w-10 h-10 rounded-xl flex items-center justify-center transition-all cursor-pointer ${
                  isShuffled
                    ? 'bg-[var(--primary)]/20 text-[var(--primary)] border border-[var(--primary)]/40'
                    : 'bg-white/[0.04] text-white/65 hover:text-white border border-white/10'
                }`}
                title="Shuffle"
                aria-label="Toggle Shuffle"
              >
                <Shuffle weight={isShuffled ? 'bold' : 'regular'} className="w-4 h-4" />
              </button>
            )}

            <button
              onClick={() => {
                const rates = [0.75, 1, 1.25, 1.5, 2];
                const next = rates[(rates.indexOf(playbackRate) + 1) % rates.length];
                setPlaybackRate(next);
              }}
              className="px-3 h-10 rounded-xl bg-white/[0.04] hover:bg-white/10 border border-white/10 text-xs font-mono font-bold text-[var(--primary)] flex items-center gap-1.5 cursor-pointer"
              title="Playback Speed"
            >
              <Gauge weight="duotone" className="w-4 h-4" />
              <span>{playbackRate}x</span>
            </button>

            {/* Sleep Timer quick button */}
            <div className="relative">
              <button
                onClick={() => setShowSleepMenu((v) => !v)}
                className={`h-10 px-3 rounded-xl flex items-center gap-1.5 text-xs font-bold transition-all cursor-pointer ${
                  sleepSecondsLeft
                    ? 'bg-amber-500/20 text-amber-300 border border-amber-500/30'
                    : 'bg-white/[0.04] text-white/65 hover:text-white border border-white/10'
                }`}
                title="Sleep Timer"
              >
                <Timer weight={sleepSecondsLeft ? 'fill' : 'regular'} className="w-4 h-4" />
                {sleepSecondsLeft ? (
                  <span className="font-mono text-[11px]">{Math.ceil(sleepSecondsLeft / 60)}m</span>
                ) : (
                  <span className="text-xs">Timer</span>
                )}
              </button>

              {showSleepMenu && (
                <div className="absolute bottom-12 left-0 z-30 w-40 p-2 rounded-2xl bg-[#141c21] border border-white/15 shadow-2xl space-y-1">
                  <p className="text-[10px] font-bold uppercase tracking-wider text-white/50 px-2 py-1">
                    Sleep Timer
                  </p>
                  {[15, 30, 45, 60].map((m) => (
                    <button
                      key={m}
                      onClick={() => handleSetSleepTimer(m)}
                      className={`w-full text-left px-2.5 py-1.5 rounded-xl text-xs font-semibold transition-colors cursor-pointer ${
                        sleepTimerOption === m
                          ? 'bg-[var(--primary)] text-black font-bold'
                          : 'text-white/80 hover:bg-white/10'
                      }`}
                    >
                      {m} Minutes
                    </button>
                  ))}
                  {sleepSecondsLeft && (
                    <button
                      onClick={() => handleSetSleepTimer(null)}
                      className="w-full text-left px-2.5 py-1.5 rounded-xl text-xs font-bold text-red-400 hover:bg-red-500/10 cursor-pointer"
                    >
                      Turn Off Timer
                    </button>
                  )}
                </div>
              )}
            </div>
          </div>

          {/* Center Core Transport Buttons (Mathematically centered at 50% X) */}
          <div className="flex items-center justify-center gap-3 justify-self-center">
            {/* Rewind 15s */}
            <button
              onClick={() => skipBackwardSeconds(15)}
              className="w-10 h-10 rounded-xl bg-white/5 hover:bg-white/10 border border-white/10 text-white/80 hover:text-white flex items-center justify-center transition-all active:scale-95 cursor-pointer"
              title="Rewind 15 seconds"
              aria-label="Rewind 15 seconds"
            >
              <ArrowCounterClockwise weight="bold" className="w-4 h-4" />
            </button>

            {/* Previous Track */}
            <button
              onClick={playPrev}
              className="w-11 h-11 rounded-2xl bg-white/8 hover:bg-white/15 border border-white/10 text-white flex items-center justify-center transition-all active:scale-95 cursor-pointer"
              title="Previous Track"
              aria-label="Previous Track"
            >
              <SkipBack weight="fill" className="w-5 h-5" />
            </button>

            {/* Primary Play / Pause Button */}
            <button
              onClick={togglePlay}
              className="w-15 h-15 rounded-2xl bg-[var(--primary)] text-[var(--primary-foreground)] shadow-[0_0_30px_rgba(83,242,224,0.5)] hover:brightness-110 active:scale-95 transition-all flex items-center justify-center cursor-pointer"
              title={isPlaying ? 'Pause' : 'Play'}
              aria-label={isPlaying ? 'Pause' : 'Play'}
            >
              {isPlaying ? (
                <Pause weight="fill" className="w-7 h-7" />
              ) : (
                <Play weight="fill" className="w-7 h-7 ml-0.5" />
              )}
            </button>

            {/* Next Track */}
            <button
              onClick={playNext}
              className="w-11 h-11 rounded-2xl bg-white/8 hover:bg-white/15 border border-white/10 text-white flex items-center justify-center transition-all active:scale-95 cursor-pointer"
              title="Next Track"
              aria-label="Next Track"
            >
              <SkipForward weight="fill" className="w-5 h-5" />
            </button>

            {/* Fast Forward 30s */}
            <button
              onClick={() => skipForwardSeconds(30)}
              className="w-10 h-10 rounded-xl bg-white/5 hover:bg-white/10 border border-white/10 text-white/80 hover:text-white flex items-center justify-center transition-all active:scale-95 cursor-pointer"
              title="Forward 30 seconds"
              aria-label="Forward 30 seconds"
            >
              <ArrowClockwise weight="bold" className="w-4 h-4" />
            </button>
          </div>

          {/* Right Volume & Repeat Controls */}
          <div className="flex items-center gap-2.5 justify-self-end">
            <button
              onClick={cycleRepeat}
              className={`w-10 h-10 rounded-xl flex items-center justify-center transition-all cursor-pointer ${
                repeatMode !== 'off'
                  ? 'bg-[var(--primary)]/20 text-[var(--primary)] border border-[var(--primary)]/40'
                  : 'bg-white/[0.04] text-white/65 hover:text-white border border-white/10'
              }`}
              title={`Repeat: ${repeatMode}`}
              aria-label="Cycle Repeat Mode"
            >
              {repeatMode === 'one' ? (
                <RepeatOnce weight="bold" className="w-4 h-4" />
              ) : (
                <Repeat weight={repeatMode !== 'off' ? 'bold' : 'regular'} className="w-4 h-4" />
              )}
            </button>

            {/* Desktop Volume Slider */}
            <div className="flex items-center gap-2 bg-white/[0.04] px-3 h-10 rounded-xl border border-white/10">
              <button
                onClick={toggleMute}
                className="text-white/80 hover:text-[var(--primary)] transition-colors cursor-pointer"
                title={isMuted ? 'Unmute' : 'Mute'}
              >
                {isMuted || volume === 0 ? (
                  <SpeakerSlash weight="fill" className="w-4 h-4 text-red-400" />
                ) : volume < 0.5 ? (
                  <SpeakerLow weight="fill" className="w-4 h-4 text-[var(--primary)]" />
                ) : (
                  <SpeakerHigh weight="fill" className="w-4 h-4 text-[var(--primary)]" />
                )}
              </button>
              <input
                type="range"
                min="0"
                max="1"
                step="0.01"
                value={isMuted ? 0 : volume}
                onChange={(e) => setVolumeLevel(parseFloat(e.target.value))}
                className="w-20 accent-[var(--primary)] cursor-pointer h-1.5 rounded-lg"
                aria-label="Volume"
              />
            </div>
          </div>
        </div>
      </footer>
    </div>
  );
}
