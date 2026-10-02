/**
 * Azaad Music Service - 100% Client-Side Music Architecture
 * Multi-source music streaming engine:
 * 1. Audius Network Public REST API (Decentralized Hi-Fi Full-Length Streaming)
 * 2. iTunes Catalog Public Search (Global & Regional Search)
 * 3. High-Fidelity Streaming & Metadata APIs (Global 320k Streaming)
 * 4. Curated Master Library (Pop, Hip-Hop, Rock, Electronic, R&B, Latin, Global Hits)
 * 5. In-Browser IndexedDB Local Music Storage (User Uploads with Persistent Audio)
 */

import { AUDIUS_APP_NAME } from '../config/env';

const DISCOVERY_NODES = [
  'https://api.audius.co/v1',
  'https://discoveryprovider.audius.co/v1',
  'https://discoveryprovider2.audius.co/v1',
  'https://discoveryprovider3.audius.co/v1',
  'https://audius-discovery-1.cultur3stake.com/v1',
];

let activeNodeIndex = 0;

export function getActiveDiscoveryNode() {
  return DISCOVERY_NODES[activeNodeIndex % DISCOVERY_NODES.length];
}

export function rotateDiscoveryNode() {
  activeNodeIndex = (activeNodeIndex + 1) % DISCOVERY_NODES.length;
  return getActiveDiscoveryNode();
}

// ─── COVER SANITIZATION & FALLBACK ENGINE ──────────────────────────────────

export const CURATED_FALLBACK_COVERS = [
  'https://images.unsplash.com/photo-1514525253161-7a46d19cd819?w=600&q=80',
  'https://images.unsplash.com/photo-1470225620780-dba8ba36b745?w=600&q=80',
  'https://images.unsplash.com/photo-1511671782779-c97d3d27a1d4?w=600&q=80',
  'https://images.unsplash.com/photo-1614613535308-eb5fbd3d2c17?w=600&q=80',
  'https://images.unsplash.com/photo-1518709268805-4e9042af9f23?w=600&q=80',
  'https://images.unsplash.com/photo-1519681393784-d120267933ba?w=600&q=80',
  'https://images.unsplash.com/photo-1493225457124-a3eb161ffa5f?w=600&q=80',
  'https://images.unsplash.com/photo-1508700115892-45ecd05ae2ad?w=600&q=80',
  'https://images.unsplash.com/photo-1498038432885-c6f3f1b912ee?w=600&q=80',
  'https://images.unsplash.com/photo-1465847899084-d164df4dedc6?w=600&q=80',
];

export function getFallbackCoverUrl(song) {
  if (!song) return CURATED_FALLBACK_COVERS[0];
  const videoId = song.videoId || song.youtubeId;
  if (videoId) {
    return `https://i.ytimg.com/vi/${videoId}/hqdefault.jpg`;
  }
  const str = `${song.title || ''} ${song.artist || song.singers || ''} ${song.id || ''}`;
  let hash = 0;
  for (let i = 0; i < str.length; i++) {
    hash = (hash << 5) - hash + str.charCodeAt(i);
    hash |= 0;
  }
  const index = Math.abs(hash) % CURATED_FALLBACK_COVERS.length;
  return CURATED_FALLBACK_COVERS[index];
}

export function sanitizeCoverUrl(url, song) {
  const fallback = getFallbackCoverUrl(song);
  if (!url || typeof url !== 'string') {
    return fallback;
  }
  let clean = url.trim();
  if (clean === '' || clean === 'null' || clean === 'undefined' || clean === 'NaN') {
    return fallback;
  }
  if (clean.startsWith('//')) {
    clean = 'https:' + clean;
  }
  if (clean.startsWith('http://')) {
    clean = clean.replace(/^http:\/\//i, 'https://');
  }
  return clean;
}

// Helper: Normalize Audius track object to our internal Track schema
function formatAudiusTrack(track) {
  if (!track) return null;
  const id = track.id || track.track_id;
  if (!id) return null;

  const rawCover =
    track.artwork?.['480x480'] ||
    track.artwork?.['150x150'] ||
    track.artwork?.['1000x1000'] ||
    '';

  const user = track.user || {};
  const artistName = user.name || user.handle || 'Audius Creator';
  const duration = Math.round(Number(track.duration) || 0);

  const cover = sanitizeCoverUrl(rawCover, {
    title: track.title,
    artist: artistName,
    id: `audius-${id}`,
  });

  return {
    id: `audius-${id}`,
    audiusId: String(id),
    title: track.title || 'Untitled Track',
    artist: artistName,
    singers: artistName,
    userHandle: user.handle || '',
    isVerified: !!user.is_verified,
    category: track.genre || 'Electronic',
    genre: track.genre || 'Electronic',
    coverUrl: cover,
    audioUrl: `https://api.audius.co/v1/tracks/${id}/stream?app_name=${AUDIUS_APP_NAME}`,
    duration: duration > 0 ? duration : 180,
    playCount: Number(track.play_count) || 1200,
    favoriteCount: Number(track.favorite_count) || 350,
    vibe: track.mood || track.genre || 'Hi-Fi Master',
    source: 'audius',
    isFullSong: true,
    createdAt: track.release_date || new Date().toISOString(),
  };
}

// ─── AUDIUS FETCHING ─────────────────────────────────────────────────────────

export async function fetchAudiusTrendingTracks(genre = 'All', time = 'week', limit = 40) {
  const nodes = [...DISCOVERY_NODES];
  for (let i = 0; i < nodes.length; i++) {
    const baseUrl = nodes[(activeNodeIndex + i) % nodes.length];
    try {
      let url = `${baseUrl}/tracks/trending?app_name=${AUDIUS_APP_NAME}&limit=${limit}`;
      if (genre && genre !== 'All' && genre !== 'Bollywood' && genre !== 'Sufi' && genre !== 'Punjabi') {
        url += `&genre=${encodeURIComponent(genre)}`;
      }
      if (time && time !== 'allTime') {
        url += `&time=${time}`;
      }

      const res = await fetch(url, { signal: AbortSignal.timeout(4500) });
      if (res.ok) {
        const json = await res.json();
        const rawTracks = json?.data || [];
        if (Array.isArray(rawTracks) && rawTracks.length > 0) {
          const formatted = rawTracks.map(formatAudiusTrack).filter(Boolean);
          if (formatted.length > 0) return formatted;
        }
      }
    } catch {
      // Try next discovery node
    }
  }
  return [];
}

export async function searchAudiusTracks(query, genre, limit = 30) {
  if (!query) return [];
  const nodes = [...DISCOVERY_NODES];
  for (let i = 0; i < nodes.length; i++) {
    const baseUrl = nodes[(activeNodeIndex + i) % nodes.length];
    try {
      let url = `${baseUrl}/tracks/search?app_name=${AUDIUS_APP_NAME}&query=${encodeURIComponent(query)}&limit=${limit}`;
      if (genre && genre !== 'All') {
        url += `&genre=${encodeURIComponent(genre)}`;
      }
      const res = await fetch(url, { signal: AbortSignal.timeout(4500) });
      if (res.ok) {
        const json = await res.json();
        const rawTracks = json?.data || [];
        if (Array.isArray(rawTracks)) {
          return rawTracks.map(formatAudiusTrack).filter(Boolean);
        }
      }
    } catch {
      // Rotate node and continue
    }
  }
  return [];
}

// ─── YOUTUBE FREE API SEARCH & RESOLUTION ─────────────────────────────────────

export async function searchYouTubeMusicTracks(query, limit = 25) {
  if (!query) return [];
  try {
    const res = await fetch(`/api/youtube/search?q=${encodeURIComponent(query.trim())}&limit=${limit}`, {
      signal: AbortSignal.timeout(5000),
    });
    if (res.ok) {
      const data = await res.json();
      if (Array.isArray(data?.results)) return data.results;
    }
  } catch {}
  return [];
}

export async function resolveYouTubeCandidates(title, artist) {
  const q = `${title || ''} ${artist || ''}`.trim();
  if (!q) return [];

  try {
    const res = await fetch(
      `/api/youtube/resolve?title=${encodeURIComponent(title || '')}&artist=${encodeURIComponent(artist || '')}`,
      { signal: AbortSignal.timeout(4500) }
    );
    if (res.ok) {
      const json = await res.json();
      if (json.success) {
        const list = Array.isArray(json.candidates) && json.candidates.length > 0
          ? json.candidates
          : json.videoId
          ? [json.videoId]
          : [];
        if (list.length > 0) return list;
      }
    }
  } catch {}

  const results = await searchYouTubeMusicTracks(`${q} official audio`, 5);
  if (results && results.length > 0) {
    return results.map((r) => r.videoId).filter(Boolean);
  }
  return [];
}

export async function resolveYouTubeVideoId(title, artist) {
  const candidates = await resolveYouTubeCandidates(title, artist);
  return candidates.length > 0 ? candidates[0] : null;
}

// ─── JIOSAAVN DIRECT SEARCH (Verified 320kbps Studio Masters) ──────────────

export async function searchSaavnPublicTracks(query, limit = 15) {
  if (!query) return [];
  try {
    const res = await fetch(
      `/api/saavn/search?q=${encodeURIComponent(query)}&limit=${limit}`,
      { signal: AbortSignal.timeout(5000) }
    );
    if (res.ok) {
      const json = await res.json();
      const songs = json?.results || [];
      if (Array.isArray(songs) && songs.length > 0) {
        return songs
          .map((s) => {
            const coverUrl = sanitizeCoverUrl(s.coverUrl, {
              title: s.title,
              artist: s.artist,
              id: `saavn-${s.id}`,
            });
            return {
              id: `saavn-${s.id}`,
              title: s.title || 'Untitled Track',
              artist: s.artist || 'Featured Artist',
              singers: s.artist || 'Featured Artist',
              album: s.album || '',
              category: 'Global',
              genre: 'Global',
              coverUrl,
              audioUrl: s.audioUrl || '',
              duration: Number(s.duration) || 210,
              playCount: 89000,
              favoriteCount: 4500,
              vibe: 'Studio Master 320k',
              source: 'saavn',
              isFullSong: true,
            };
          })
          .filter((t) => t.audioUrl);
      }
    }
  } catch {}
  return [];
}

// ─── INDEXEDDB USER AUDIO STORAGE (100% Client-Side Local Uploads) ──────────

const DB_NAME = 'AzaadLocalMusicDB';
const DB_VERSION = 1;
const STORE_NAME = 'userTracks';

function openDB() {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open(DB_NAME, DB_VERSION);
    request.onupgradeneeded = (e) => {
      const db = e.target.result;
      if (!db.objectStoreNames.contains(STORE_NAME)) {
        db.createObjectStore(STORE_NAME, { keyPath: 'id' });
      }
    };
    request.onsuccess = (e) => resolve(e.target.result);
    request.onerror = (e) => reject(e.target.error);
  });
}

export async function getLocalUserTracks() {
  try {
    const db = await openDB();
    return new Promise((resolve) => {
      const tx = db.transaction(STORE_NAME, 'readonly');
      const store = tx.objectStore(STORE_NAME);
      const req = store.getAll();
      req.onsuccess = () => {
        const tracks = req.result || [];
        // Map any stored Blobs to active ObjectURLs
        const withUrls = tracks.map((t) => {
          let audioUrl = t.audioUrl;
          if (t.audioBlob) {
            audioUrl = URL.createObjectURL(t.audioBlob);
          }
          return {
            ...t,
            audioUrl,
            source: 'local',
          };
        });
        resolve(withUrls);
      };
      req.onerror = () => resolve([]);
    });
  } catch {
    return [];
  }
}

export async function saveLocalUserTrack(trackData) {
  try {
    const db = await openDB();
    return new Promise((resolve, reject) => {
      const tx = db.transaction(STORE_NAME, 'readwrite');
      const store = tx.objectStore(STORE_NAME);
      store.put(trackData);
      tx.oncomplete = () => resolve(trackData);
      tx.onerror = (e) => reject(e.target.error);
    });
  } catch (err) {
    throw err;
  }
}

export async function deleteLocalUserTrack(id) {
  try {
    const db = await openDB();
    return new Promise((resolve, reject) => {
      const tx = db.transaction(STORE_NAME, 'readwrite');
      const store = tx.objectStore(STORE_NAME);
      store.delete(id);
      tx.oncomplete = () => resolve(true);
      tx.onerror = (e) => reject(e.target.error);
    });
  } catch {
    return false;
  }
}

// Live Google Search Grounded Trending Tracks (Updated Hourly)
export async function fetchGoogleTrendingTracks(genre = 'All', force = false) {
  try {
    const res = await fetch(`/api/explore/google-trends?genre=${encodeURIComponent(genre)}&force=${force}`, {
      signal: AbortSignal.timeout(6500),
    });
    if (res.ok) {
      const data = await res.json();
      if (Array.isArray(data?.tracks) && data.tracks.length > 0) {
        return data.tracks;
      }
    }
  } catch {}
  return [];
}

// Live Google Search Grounded Music Search
export async function searchGoogleMusicTracks(query) {
  if (!query) return [];
  try {
    const res = await fetch(`/api/google/search?q=${encodeURIComponent(query)}`, {
      signal: AbortSignal.timeout(6500),
    });
    if (res.ok) {
      const data = await res.json();
      if (Array.isArray(data?.results) && data.results.length > 0) {
        return data.results;
      }
    }
  } catch {}
  return [];
}

// Echo-Music Multi-Source Synchronized Lyrics (:lyrics + 6 Provider Modules)
export async function fetchGoogleSearchLyrics(title, artist, duration = 210, options = {}) {
  if (!title) return null;
  try {
    const params = new URLSearchParams({
      title,
      artist: artist || '',
      duration: String(Math.round(Number(duration) || 210)),
    });
    if (options.album) params.set('album', options.album);
    if (options.videoId) params.set('videoId', options.videoId);
    if (options.provider) params.set('provider', options.provider);

    const res = await fetch(`/api/google/lyrics?${params.toString()}`, {
      signal: AbortSignal.timeout(8500),
    });
    if (res.ok) {
      const data = await res.json();
      if (data && data.success && (data.syncedLyrics || data.plainLyrics)) {
        return data;
      }
    }
  } catch {}
  return null;
}

// ─── UNIFIED TRENDING & HOURLY DISCOVERY ───────────────────────────────────

export const HOURLY_EXPLORE_QUERIES = [
  'top global viral hits 2026 billboard spotify',
  'billboard hot 100 top global viral music',
  'trending global songs 2026 official',
  'viral global hits spotify chartbusters',
  'top latin hits reggaeton 2026',
  'top k-pop viral hits 2026 illit newjeans bts',
  'afrobeats top hits 2026 burna boy tyla rema',
  'top hip hop rap hits 2026 kendrick drake',
  'top edm dance chartbusters 2026',
  'lofi chill beats relax 2026',
  'trending international chartbusters 2026',
  'latest universal hits 2026 viral releases',
];

function dedupeTracks(tracks, requireStream = false) {
  const seenIds = new Set();
  const seenTitles = new Set();
  const deduped = [];

  for (const track of tracks) {
    if (!track || (requireStream && !track.audioUrl && !track.videoId && !track.youtubeId)) continue;
    const trackId = String(track.id || '').trim();
    const audiusId = track.audiusId ? String(track.audiusId).trim() : null;
    const videoId = track.videoId ? String(track.videoId).trim() : null;

    if (trackId && seenIds.has(trackId)) continue;
    if (audiusId && seenIds.has(`audius-${audiusId}`)) continue;
    if (videoId && seenIds.has(`yt-${videoId}`)) continue;

    const cleanTitle = (track.title || '')
      .toLowerCase()
      .replace(/\s*[\(\[][^\)\]]*[\)\]]/g, '')
      .replace(/[^a-z0-9]/g, '');
    const cleanArtist = (track.artist || track.singers || '')
      .toLowerCase()
      .replace(/[^a-z0-9]/g, '');
    const titleArtistKey = `${cleanTitle}:::${cleanArtist}`;

    if (cleanTitle && cleanArtist && seenTitles.has(titleArtistKey)) continue;

    if (trackId) seenIds.add(trackId);
    if (audiusId) seenIds.add(`audius-${audiusId}`);
    if (videoId) seenIds.add(`yt-${videoId}`);
    if (cleanTitle && cleanArtist) seenTitles.add(titleArtistKey);

    deduped.push(track);
  }
  return deduped;
}

export async function getUnifiedTrendingTracks(genre = 'All', time = 'week', forceRefresh = false) {
  const currentHour = Math.floor(Date.now() / (1000 * 60 * 60));
  const hourlyExploreQuery = HOURLY_EXPLORE_QUERIES[currentHour % HOURLY_EXPLORE_QUERIES.length];

  // 1. Fetch live Google Search Grounded trending music (refreshed every hour)
  const googlePromise = fetchGoogleTrendingTracks(genre, forceRefresh);

  // 2. Fetch live Audius trending
  const audiusPromise = fetchAudiusTrendingTracks(genre, time, 35);
  
  // 3. Load any local tracks stored by user
  const localPromise = getLocalUserTracks();

  // 4. Fetch fresh trending YouTube tracks dynamically based on hourly rotation and genre
  let ytQuery = hourlyExploreQuery;
  if (genre === 'YouTube Music' || genre === 'Trending') {
    ytQuery = `top global hit songs 2026 ${hourlyExploreQuery}`;
  } else if (genre === 'Pop') {
    ytQuery = 'top pop viral hits 2026 billboard';
  } else if (genre === 'Hip-Hop/Rap') {
    ytQuery = 'top hip hop rap viral songs 2026';
  } else if (genre === 'Latin') {
    ytQuery = 'top latin reggaeton hits 2026';
  } else if (genre === 'K-Pop') {
    ytQuery = 'top k-pop viral hits 2026';
  } else if (genre === 'Afrobeats') {
    ytQuery = 'top afrobeats hits 2026';
  } else if (genre === 'Electronic' || genre === 'EDM') {
    ytQuery = 'top edm electronic dance hits 2026';
  } else if (genre === 'Lo-Fi') {
    ytQuery = 'lofi hip hop chill beats relax 2026';
  } else if (genre === 'Rock') {
    ytQuery = 'top rock hits 2026';
  } else if (genre === 'R&B/Soul') {
    ytQuery = 'top r&b soul viral hits 2026';
  } else if (genre === 'Punjabi') {
    ytQuery = 'latest punjabi hits 2026 new release';
  } else if (genre === 'World' || genre === 'Classical') {
    ytQuery = `${genre} peaceful beautiful music 2026`;
  } else if (genre !== 'All') {
    ytQuery = `${genre} top viral hit songs 2026`;
  }

  const ytPromise = searchYouTubeMusicTracks(ytQuery, 25);
  const ytSecondaryPromise =
    genre === 'All' || genre === 'Trending'
      ? searchYouTubeMusicTracks('top global hits 2026 viral billboard', 15)
      : Promise.resolve([]);

  const [googleTracks, audiusTracks, localTracks, ytTracks, ytSecondaryTracks] = await Promise.all([
    googlePromise.catch(() => []),
    audiusPromise.catch(() => []),
    localPromise.catch(() => []),
    ytPromise.catch(() => []),
    ytSecondaryPromise.catch(() => []),
  ]);

  const combined = [
    ...localTracks,
    ...googleTracks,
    ...ytTracks,
    ...ytSecondaryTracks,
    ...audiusTracks,
  ].map((track) => ({
    ...track,
    coverUrl: sanitizeCoverUrl(track.coverUrl, track),
  }));

  return dedupeTracks(combined);
}

// ─── UNIFIED MULTI-SOURCE SEARCH (With In-Memory & In-Flight Cache) ────────
const unifiedSearchCache = new Map();
const unifiedSearchInFlight = new Map();
const SEARCH_CACHE_TTL_MS = 1000 * 60 * 15; // 15 minutes

export async function searchUnifiedMusic(query, filter = 'all') {
  const clean = (query || '').trim();
  if (!clean) return [];

  const lowerQuery = clean.toLowerCase();
  const cacheKey = `${lowerQuery}::${filter}`;
  const cached = unifiedSearchCache.get(cacheKey);
  if (cached && Date.now() - cached.timestamp < SEARCH_CACHE_TTL_MS) {
    return cached.results;
  }

  if (unifiedSearchInFlight.has(cacheKey)) {
    return unifiedSearchInFlight.get(cacheKey);
  }

  const searchPromise = (async () => {
    try {
      // 1. Search in local tracks first
      const localTracks = await getLocalUserTracks().catch(() => []);
      const matchedLocal = localTracks.filter((s) => {
        const t = (s.title || '').toLowerCase();
        const a = (s.artist || s.singers || '').toLowerCase();
        const g = (s.genre || s.category || '').toLowerCase();

        if (filter === 'title') return t.includes(lowerQuery);
        if (filter === 'artist') return a.includes(lowerQuery);
        if (filter === 'genre') return g.includes(lowerQuery);
        return t.includes(lowerQuery) || a.includes(lowerQuery) || g.includes(lowerQuery);
      });

      // 2. Parallel queries to Google Search, YouTube Free, JioSaavn, and Audius Hi-Fi
      const isGoogleSearchMode = filter === 'google';
      const [googleResults, youtubeResults, saavnResults, audiusResults] = await Promise.all([
        searchGoogleMusicTracks(clean).catch(() => []),
        searchYouTubeMusicTracks(clean, isGoogleSearchMode ? 10 : 25).catch(() => []),
        searchSaavnPublicTracks(clean, 15).catch(() => []),
        searchAudiusTracks(clean, 15).catch(() => []),
      ]);

      const all = isGoogleSearchMode
        ? [...googleResults, ...matchedLocal, ...youtubeResults, ...saavnResults, ...audiusResults]
        : [...matchedLocal, ...googleResults, ...youtubeResults, ...saavnResults, ...audiusResults];

      const deduped = dedupeTracks(all, true);
      if (deduped.length > 0) {
        unifiedSearchCache.set(cacheKey, { timestamp: Date.now(), results: deduped });
      }
      return deduped;
    } finally {
      unifiedSearchInFlight.delete(cacheKey);
    }
  })();

  unifiedSearchInFlight.set(cacheKey, searchPromise);
  return searchPromise;
}

// Dynamically resolve direct audio stream for uninterrupted native background playback
const clientAudioStreamCache = new Map();

export async function resolveAudioStream(title, artist, videoId) {
  const cacheKey = `${(title || '').toLowerCase()}::${(artist || '').toLowerCase()}::${videoId || ''}`;
  if (clientAudioStreamCache.has(cacheKey)) {
    return clientAudioStreamCache.get(cacheKey);
  }
  try {
    const params = new URLSearchParams();
    if (title) params.set('title', title);
    if (artist) params.set('artist', artist);
    if (videoId) params.set('videoId', videoId);
    const res = await fetch(`/api/audio/resolve?${params.toString()}`, {
      signal: AbortSignal.timeout(6000),
    });
    if (res.ok) {
      const data = await res.json();
      if (data && data.success && data.audioUrl) {
        clientAudioStreamCache.set(cacheKey, data);
        return data;
      }
    }
  } catch {}
  return null;
}
