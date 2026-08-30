const https = require('https');
const http = require('http');

const AUDIUS_APP_NAME = 'AZAAD_MUSIC_PLAYER';

// Active high-reliability discovery node endpoints
const DISCOVERY_NODES = [
  'https://api.audius.co/v1',
  'https://discoveryprovider.audius.co/v1',
  'https://discoveryprovider2.audius.co/v1',
  'https://discoveryprovider3.audius.co/v1',
];

let activeNodeIndex = 0;

function getDiscoveryNode() {
  return DISCOVERY_NODES[activeNodeIndex % DISCOVERY_NODES.length];
}

function rotateDiscoveryNode() {
  activeNodeIndex = (activeNodeIndex + 1) % DISCOVERY_NODES.length;
}

// Supported genres in Audius
const AUDIUS_GENRES = [
  'All',
  'Electronic',
  'Pop',
  'Hip-Hop/Rap',
  'Rock',
  'R&B/Soul',
  'Ambient',
  'Acoustic',
  'Alternative',
  'Classical',
  'Country',
  'Dance',
  'Deep House',
  'Disco',
  'Downtempo',
  'Drum & Bass',
  'Dubstep',
  'EDM',
  'Electro',
  'Folk',
  'House',
  'Indie',
  'Jazz',
  'Latin',
  'Metal',
  'Piano',
  'Progressive House',
  'Punk',
  'Reggae',
  'Synthwave',
  'Techno',
  'Trance',
  'Trap',
  'World',
];

// Curated high-fidelity backup tracks in case discovery nodes are temporarily slow or unreachable
const FALLBACK_TRENDING_TRACKS = [
  {
    id: 'audius-fb-1',
    audiusId: 'fb-1',
    title: 'Midnight City Lights',
    artist: 'Azaad Sound Lab',
    singers: 'Azaad Sound Lab',
    userHandle: 'azaadmusic',
    isVerified: true,
    category: 'Electronic',
    genre: 'Electronic',
    coverUrl: 'https://images.unsplash.com/photo-1614613535308-eb5fbd3d2c17?w=600&q=80',
    audioUrl: 'https://cdn.freesound.org/previews/612/612604_5674468-lq.mp3',
    duration: 215,
    playCount: 48920,
    favoriteCount: 3410,
    type: 'Track',
    vibe: 'Hi-Fi Master',
    featured: true,
    trending: true,
    source: 'audius',
    isFullSong: true,
    createdAt: new Date().toISOString(),
  },
  {
    id: 'audius-fb-2',
    audiusId: 'fb-2',
    title: 'Neon Horizon',
    artist: 'Solaris',
    singers: 'Solaris',
    userHandle: 'solaris',
    isVerified: true,
    category: 'Synthwave',
    genre: 'Synthwave',
    coverUrl: 'https://images.unsplash.com/photo-1518709268805-4e9042af9f23?w=600&q=80',
    audioUrl: 'https://cdn.freesound.org/previews/568/568285_12702738-lq.mp3',
    duration: 198,
    playCount: 39120,
    favoriteCount: 2890,
    type: 'Track',
    vibe: 'Cyberpunk Chill',
    featured: true,
    trending: true,
    source: 'audius',
    isFullSong: true,
    createdAt: new Date().toISOString(),
  },
  {
    id: 'audius-fb-3',
    audiusId: 'fb-3',
    title: 'Golden Sunset Chill',
    artist: 'Luna Beats',
    singers: 'Luna Beats',
    userHandle: 'lunabeats',
    isVerified: true,
    category: 'Pop',
    genre: 'Pop',
    coverUrl: 'https://images.unsplash.com/photo-1470225620780-dba8ba36b745?w=600&q=80',
    audioUrl: 'https://cdn.freesound.org/previews/580/580310_11861866-lq.mp3',
    duration: 185,
    playCount: 52400,
    favoriteCount: 4120,
    type: 'Track',
    vibe: 'Sunset Vibes',
    featured: true,
    trending: true,
    source: 'audius',
    isFullSong: true,
    createdAt: new Date().toISOString(),
  },
  {
    id: 'audius-fb-4',
    audiusId: 'fb-4',
    title: 'Velvet Nights (Deep House)',
    artist: 'Kairo & Mirage',
    singers: 'Kairo & Mirage',
    userHandle: 'kairo',
    isVerified: true,
    category: 'Deep House',
    genre: 'Deep House',
    coverUrl: 'https://images.unsplash.com/photo-1514525253161-7a46d19cd819?w=600&q=80',
    audioUrl: 'https://cdn.freesound.org/previews/566/566436_11861866-lq.mp3',
    duration: 240,
    playCount: 61200,
    favoriteCount: 5490,
    type: 'Track',
    vibe: 'Deep Groove',
    featured: true,
    trending: true,
    source: 'audius',
    isFullSong: true,
    createdAt: new Date().toISOString(),
  },
  {
    id: 'audius-fb-5',
    audiusId: 'fb-5',
    title: 'Elysium Dreams',
    artist: 'Aether Wave',
    singers: 'Aether Wave',
    userHandle: 'aetherwave',
    isVerified: true,
    category: 'Ambient',
    genre: 'Ambient',
    coverUrl: 'https://images.unsplash.com/photo-1511671782779-c97d3d27a1d4?w=600&q=80',
    audioUrl: 'https://cdn.freesound.org/previews/530/530703_11861866-lq.mp3',
    duration: 220,
    playCount: 31400,
    favoriteCount: 2150,
    type: 'Track',
    vibe: 'Atmospheric Relax',
    featured: true,
    trending: true,
    source: 'audius',
    isFullSong: true,
    createdAt: new Date().toISOString(),
  }
];

const FALLBACK_PLAYLISTS = [
  {
    id: 'audius-pl-fb-1',
    audiusId: 'fb-pl-1',
    name: 'Azaad Top Hits 2026',
    description: 'The definitive sound of modern electronic, pop, and global beats.',
    coverUrl: 'https://images.unsplash.com/photo-1514525253161-7a46d19cd819?w=600&q=80',
    totalTracks: 25,
    ownerName: 'Azaad Curators',
    ownerAvatar: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=150&q=80',
    isVerified: true,
    favoriteCount: 1420,
    repostCount: 380,
    source: 'audius',
  },
  {
    id: 'audius-pl-fb-2',
    audiusId: 'fb-pl-2',
    name: 'Midnight Chill & Lo-Fi Lounge',
    description: 'Smooth, relaxed beats for late night focus and unwinding.',
    coverUrl: 'https://images.unsplash.com/photo-1470225620780-dba8ba36b745?w=600&q=80',
    totalTracks: 30,
    ownerName: 'Azaad Chillout',
    ownerAvatar: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=150&q=80',
    isVerified: true,
    favoriteCount: 2190,
    repostCount: 512,
    source: 'audius',
  },
  {
    id: 'audius-pl-fb-3',
    audiusId: 'fb-pl-3',
    name: 'Deep Bass & Club Bangers',
    description: 'High energy festival tracks and pumping underground club music.',
    coverUrl: 'https://images.unsplash.com/photo-1511671782779-c97d3d27a1d4?w=600&q=80',
    totalTracks: 40,
    ownerName: 'Azaad Electro',
    ownerAvatar: 'https://images.unsplash.com/photo-1492562080023-ab3db95bfbce?w=150&q=80',
    isVerified: true,
    favoriteCount: 3890,
    repostCount: 920,
    source: 'audius',
  }
];

/**
 * Helper to make single HTTPS GET request with strict timeout
 */
function singleFetchJson(url, timeoutMs = 4000) {
  return new Promise((resolve, reject) => {
    const client = url.startsWith('https') ? https : http;
    const req = client.get(
      url,
      {
        headers: {
          'User-Agent': `${AUDIUS_APP_NAME}/1.0`,
          Accept: 'application/json',
        },
        timeout: timeoutMs,
      },
      (res) => {
        if (res.statusCode >= 300 && res.statusCode < 400 && res.headers.location) {
          return resolve(singleFetchJson(res.headers.location, timeoutMs));
        }

        let body = '';
        res.on('data', (chunk) => {
          body += chunk;
        });
        res.on('end', () => {
          if (res.statusCode < 200 || res.statusCode >= 300) {
            return reject(new Error(`Audius HTTP ${res.statusCode}`));
          }
          try {
            const data = JSON.parse(body);
            resolve(data);
          } catch (e) {
            reject(new Error(`Audius JSON parse error: ${e.message}`));
          }
        });
      }
    );

    req.on('timeout', () => {
      req.destroy();
      reject(new Error('Audius API request timed out'));
    });

    req.on('error', (err) => {
      reject(err);
    });
  });
}

/**
 * Multi-node resilient fetch with failover and node rotation
 */
async function fetchFromDiscoveryNodes(pathWithQuery, timeoutMs = 4500) {
  const cleanPath = pathWithQuery.startsWith('/') ? pathWithQuery : `/${pathWithQuery}`;
  
  // Try up to 3 different nodes in sequence before failing
  for (let i = 0; i < DISCOVERY_NODES.length; i++) {
    const nodeBase = DISCOVERY_NODES[(activeNodeIndex + i) % DISCOVERY_NODES.length];
    const url = `${nodeBase}${cleanPath}`;
    try {
      const data = await singleFetchJson(url, timeoutMs);
      if (data && (data.data || Array.isArray(data))) {
        activeNodeIndex = (activeNodeIndex + i) % DISCOVERY_NODES.length;
        return data;
      }
    } catch (err) {
      // Rotate and try next node
      continue;
    }
  }
  
  throw new Error('All Audius discovery nodes timed out or returned errors');
}

/**
 * Normalizes an Audius track payload into the Azaad player standard song object
 */
function formatAudiusTrack(track) {
  if (!track) return null;
  const trackId = String(track.id || track.track_id || '');
  const title = track.title || 'Untitled Track';
  const artistName = track.user?.name || track.user?.handle || 'Unknown Artist';
  const genre = track.genre || 'Electronic';

  let coverUrl =
    track.artwork?.['480x480'] ||
    track.artwork?.['1000x1000'] ||
    track.artwork?.['150x150'] ||
    track.user?.profile_picture?.['480x480'] ||
    'https://images.unsplash.com/photo-1511671782779-c97d3d27a1d4?w=500&auto=format&fit=crop&q=80';

  const audioUrl = `https://api.audius.co/v1/tracks/${trackId}/stream?app_name=${encodeURIComponent(
    AUDIUS_APP_NAME
  )}`;

  return {
    id: `audius-${trackId}`,
    audiusId: trackId,
    title,
    artist: artistName,
    singers: artistName,
    userHandle: track.user?.handle || '',
    userAvatar: track.user?.profile_picture?.['150x150'] || '',
    isVerified: Boolean(track.user?.is_verified),
    category: genre,
    genre,
    coverUrl,
    audioUrl,
    directStreamUrl: track.stream?.url || audioUrl,
    duration: typeof track.duration === 'number' ? track.duration : 180,
    playCount: track.play_count || 0,
    favoriteCount: track.favorite_count || 0,
    repostCount: track.repost_count || 0,
    description: track.description || '',
    bpm: track.bpm || null,
    mood: track.mood || '',
    tags: track.tags || '',
    type: 'Track',
    vibe: track.mood || genre,
    featured: (track.favorite_count || 0) > 30,
    trending: true,
    source: 'audius',
    isFullSong: true,
    createdAt: track.release_date || track.created_at || new Date().toISOString(),
  };
}

/**
 * In-memory short cache to reduce rate limits and speed up responses
 */
const cache = new Map();
const CACHE_TTL_MS = 5 * 60 * 1000; // 5 minutes cache

function getCached(key) {
  const entry = cache.get(key);
  if (entry && Date.now() - entry.time < CACHE_TTL_MS) {
    return entry.data;
  }
  return null;
}

function setCached(key, data) {
  cache.set(key, { data, time: Date.now() });
}

/**
 * Fetches trending tracks from Audius API with resilient fallback
 */
async function getTrendingTracks({ genre, time = 'week', limit = 40, offset = 0 } = {}) {
  const cacheKey = `trending:${genre || 'all'}:${time}:${limit}:${offset}`;
  const cached = getCached(cacheKey);
  if (cached && cached.length > 0) return cached;

  let path = `/tracks/trending?app_name=${encodeURIComponent(
    AUDIUS_APP_NAME
  )}&limit=${Math.min(100, Math.max(1, limit))}&offset=${offset}&time=${time}`;

  if (genre && genre !== 'All') {
    path += `&genre=${encodeURIComponent(genre)}`;
  }

  try {
    const response = await fetchFromDiscoveryNodes(path, 4000);
    const rawList = Array.isArray(response?.data) ? response.data : [];
    const tracks = rawList.map(formatAudiusTrack).filter(Boolean);

    if (tracks.length > 0) {
      setCached(cacheKey, tracks);
      return tracks;
    }
  } catch (err) {
    console.warn('Audius trending discovery fallback engaged:', err.message);
  }

  // Fallback to cached or curated tracks if discovery node timed out
  const fallback = FALLBACK_TRENDING_TRACKS.filter((t) =>
    !genre || genre === 'All' ? true : t.genre.toLowerCase() === genre.toLowerCase()
  );
  return fallback.length > 0 ? fallback : FALLBACK_TRENDING_TRACKS;
}

/**
 * Searches tracks in the Audius API catalog with fallback
 */
async function searchTracks({ query, genre, limit = 40, offset = 0 } = {}) {
  if (!query || !query.trim()) {
    return getTrendingTracks({ genre, limit, offset });
  }

  const cacheKey = `search:${query.trim().toLowerCase()}:${genre || 'all'}:${limit}:${offset}`;
  const cached = getCached(cacheKey);
  if (cached && cached.length > 0) return cached;

  let path = `/tracks/search?app_name=${encodeURIComponent(
    AUDIUS_APP_NAME
  )}&query=${encodeURIComponent(query.trim())}&limit=${Math.min(100, Math.max(1, limit))}&offset=${offset}`;

  if (genre && genre !== 'All') {
    path += `&genre=${encodeURIComponent(genre)}`;
  }

  try {
    const response = await fetchFromDiscoveryNodes(path, 4000);
    const rawList = Array.isArray(response?.data) ? response.data : [];
    const tracks = rawList.map(formatAudiusTrack).filter(Boolean);

    if (tracks.length > 0) {
      setCached(cacheKey, tracks);
      return tracks;
    }
  } catch (err) {
    console.warn('Audius search discovery fallback engaged:', err.message);
  }

  const qLower = query.toLowerCase();
  return FALLBACK_TRENDING_TRACKS.filter(
    (t) =>
      t.title.toLowerCase().includes(qLower) ||
      t.artist.toLowerCase().includes(qLower) ||
      t.genre.toLowerCase().includes(qLower)
  );
}

/**
 * Fetches a single track by Audius ID
 */
async function getTrackById(id) {
  const cleanId = String(id).replace(/^audius-/, '');
  const cacheKey = `track:${cleanId}`;
  const cached = getCached(cacheKey);
  if (cached) return cached;

  const path = `/tracks/${cleanId}?app_name=${encodeURIComponent(AUDIUS_APP_NAME)}`;

  try {
    const response = await fetchFromDiscoveryNodes(path, 3500);
    const trackData = response?.data;
    if (trackData) {
      const formatted = formatAudiusTrack(trackData);
      if (formatted) {
        setCached(cacheKey, formatted);
        return formatted;
      }
    }
  } catch (err) {
    console.warn('Audius track by ID fallback:', err.message);
  }

  return FALLBACK_TRENDING_TRACKS.find((t) => t.audiusId === cleanId) || null;
}

/**
 * Fetches trending playlists from Audius with fallback
 */
async function getTrendingPlaylists({ limit = 20 } = {}) {
  const cacheKey = `playlists:trending:${limit}`;
  const cached = getCached(cacheKey);
  if (cached && cached.length > 0) return cached;

  const path = `/playlists/trending?app_name=${encodeURIComponent(
    AUDIUS_APP_NAME
  )}&limit=${limit}`;

  try {
    const response = await fetchFromDiscoveryNodes(path, 4000);
    const rawPlaylists = Array.isArray(response?.data) ? response.data : [];

    if (rawPlaylists.length > 0) {
      const formatted = rawPlaylists.map((pl) => ({
        id: `audius-pl-${pl.id}`,
        audiusId: pl.id,
        name: pl.playlist_name || pl.title || 'Audius Playlist',
        description: pl.description || `Curated by ${pl.user?.name || 'Audius'}`,
        coverUrl:
          pl.artwork?.['480x480'] ||
          pl.artwork?.['1000x1000'] ||
          pl.artwork?.['150x150'] ||
          'https://images.unsplash.com/photo-1514525253161-7a46d19cd819?w=500&auto=format&fit=crop&q=80',
        totalTracks: pl.track_count || pl.total_play_count || 0,
        ownerName: pl.user?.name || pl.user?.handle || 'Audius Curator',
        ownerAvatar: pl.user?.profile_picture?.['150x150'] || '',
        isVerified: Boolean(pl.user?.is_verified),
        favoriteCount: pl.favorite_count || 0,
        repostCount: pl.repost_count || 0,
        source: 'audius',
      }));

      setCached(cacheKey, formatted);
      return formatted;
    }
  } catch (err) {
    console.warn('Audius playlists discovery fallback engaged:', err.message);
  }

  return FALLBACK_PLAYLISTS;
}

module.exports = {
  AUDIUS_APP_NAME,
  AUDIUS_GENRES,
  formatAudiusTrack,
  getTrendingTracks,
  searchTracks,
  getTrackById,
  getTrendingPlaylists,
  FALLBACK_TRENDING_TRACKS,
  FALLBACK_PLAYLISTS,
};
