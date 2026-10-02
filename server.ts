import express from 'express';
import path from 'path';
import { createServer as createViteServer } from 'vite';

try {
  process.loadEnvFile?.('.env');
} catch {
  // Ignore missing .env
}

const app = express();
const PORT = Number(process.env.PORT) || 3000;
const AUDIUS_APP_NAME = process.env.AUDIUS_APP_NAME || process.env.VITE_AUDIUS_APP_NAME || 'AZAAD_MUSIC_PLAYER';

app.use(express.json());

// In-memory cache for fast repeat searches and audio resolutions
const youtubeSearchCache = new Map<string, { timestamp: number; results: any[] }>();
const audioResolveCache = new Map<string, { timestamp: number; data: any }>();
const googleTrendsCache = new Map<string, { timestamp: number; tracks: any[] }>();
const googleSearchMusicCache = new Map<string, { timestamp: number; results: any[] }>();
const googleLyricsCache = new Map<string, { timestamp: number; data: any }>();

const CACHE_TTL_MS = Number(process.env.CACHE_TTL_MS) || 1000 * 60 * 60; // 1 hour TTL for all explore/cache items

// Official public real-time Apple iTunes Top Songs chart (no API key required, 100% reliable)
async function fetchLiveAppleTopCharts(genre = 'All'): Promise<Array<{ title: string; artist: string; singers: string; genre: string; vibe: string; year: number }>> {
  try {
    const url = 'https://itunes.apple.com/us/rss/topsongs/limit=30/json';
    const res = await fetch(url, {
      headers: { 'User-Agent': 'Mozilla/5.0' },
      signal: AbortSignal.timeout(3500),
    });
    if (res.ok) {
      const data = await res.json();
      const entries = data?.feed?.entry || [];
      return entries.map((entry: any) => {
        const title = entry['im:name']?.label || 'Trending Hit';
        const artist = entry['im:artist']?.label || 'Popular Artist';
        const category = entry?.category?.attributes?.label || (genre !== 'All' ? genre : 'Pop');
        return {
          title,
          artist,
          singers: artist,
          genre: category,
          vibe: 'Top Chart Trending Hit',
          year: 2026,
        };
      });
    }
  } catch {}
  return [];
}

// Helper to convert time format (e.g. '3:45' or '1:12:30') to seconds
function parseDurationToSeconds(durationStr?: string): number {
  if (!durationStr) return 210;
  const parts = durationStr.split(':').map((p) => parseInt(p, 10));
  if (parts.some(isNaN)) return 210;
  if (parts.length === 3) {
    return parts[0] * 3600 + parts[1] * 60 + parts[2];
  }
  if (parts.length === 2) {
    return parts[0] * 60 + parts[1];
  }
  return parts[0] || 210;
}

// Free YouTube search extractor with multi-tier failover and quiet fallback
async function searchYouTubeFree(query: string, limit = 20) {
  const cleanQuery = (query || '').trim();
  if (!cleanQuery) return [];

  const cacheKey = cleanQuery.toLowerCase();
  const cached = youtubeSearchCache.get(cacheKey);
  if (cached && Date.now() - cached.timestamp < CACHE_TTL_MS) {
    return cached.results;
  }

  // Tier 1: Direct YouTube web results
  try {
    const searchUrl = `https://www.youtube.com/results?search_query=${encodeURIComponent(cleanQuery)}`;
    const res = await fetch(searchUrl, {
      headers: {
        'User-Agent':
          'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36',
        'Accept-Language': 'en-US,en;q=0.9',
      },
      signal: AbortSignal.timeout(4500),
    });

    if (res.ok) {
      const html = await res.text();
      const match = html.match(/var ytInitialData = ({.*?});<\/script>/s);

      const videos: any[] = [];
      const seenIds = new Set<string>();

      if (match && match[1]) {
        try {
          const data = JSON.parse(match[1]);
          const sectionContents =
            data.contents?.twoColumnSearchResultsRenderer?.primaryContents?.sectionListRenderer
              ?.contents || [];

          for (const sec of sectionContents) {
            const items = sec.itemSectionRenderer?.contents || [];
            for (const item of items) {
              const vr = item.videoRenderer;
              if (vr && vr.videoId && !seenIds.has(vr.videoId)) {
                seenIds.add(vr.videoId);

                const title =
                  vr.title?.runs?.[0]?.text ||
                  vr.title?.accessibility?.accessibilityData?.label ||
                  'Unknown Track';
                const channel =
                  vr.ownerText?.runs?.[0]?.text ||
                  vr.longBylineText?.runs?.[0]?.text ||
                  'YouTube Music';
                const durationStr = vr.lengthText?.simpleText || '';
                const durationSec = parseDurationToSeconds(durationStr);

                const thumbs = vr.thumbnail?.thumbnails || [];
                const bestThumb =
                  thumbs[thumbs.length - 1]?.url ||
                  `https://i.ytimg.com/vi/${vr.videoId}/hqdefault.jpg`;

                videos.push({
                  id: `yt-${vr.videoId}`,
                  videoId: vr.videoId,
                  youtubeId: vr.videoId,
                  title,
                  artist: channel,
                  singers: channel,
                  album: 'YouTube Music',
                  category: 'YouTube Music',
                  genre: 'YouTube Music',
                  coverUrl: bestThumb,
                  audioUrl: '',
                  duration: durationSec,
                  playCount: 45000 + Math.floor(Math.random() * 20000),
                  favoriteCount: 3200 + Math.floor(Math.random() * 1000),
                  vibe: 'YouTube Stream',
                  source: 'youtube',
                  isFullSong: true,
                  previewOnly: false,
                });

                if (videos.length >= limit) break;
              }
            }
            if (videos.length >= limit) break;
          }
        } catch {}
      }

      if (videos.length === 0) {
        const idMatches = [...html.matchAll(/"videoId":"([a-zA-Z0-9_-]{11})"/g)].map((m) => m[1]);
        const uniqueIds = [...new Set(idMatches)].slice(0, limit);

        for (const vid of uniqueIds) {
          videos.push({
            id: `yt-${vid}`,
            videoId: vid,
            youtubeId: vid,
            title: cleanQuery,
            artist: 'YouTube Music',
            singers: 'YouTube Music',
            album: 'YouTube Music',
            category: 'YouTube Music',
            genre: 'YouTube Music',
            coverUrl: `https://i.ytimg.com/vi/${vid}/hqdefault.jpg`,
            audioUrl: '',
            duration: 210,
            playCount: 50000,
            favoriteCount: 4500,
            vibe: 'YouTube Stream',
            source: 'youtube',
            isFullSong: true,
            previewOnly: false,
          });
        }
      }

      if (videos.length > 0) {
        youtubeSearchCache.set(cacheKey, { timestamp: Date.now(), results: videos });
        return videos;
      }
    }
  } catch {
    // Quietly continue to Tier 2 mirrors
  }

  // Tier 2: Public high-speed Invidious API mirrors
  const mirrorEndpoints = [
    `https://invidious.f5.si/api/v1/search?q=${encodeURIComponent(cleanQuery)}&type=video`,
    `https://inv.nadeko.net/api/v1/search?q=${encodeURIComponent(cleanQuery)}&type=video`,
    `https://yt.artemislena.eu/api/v1/search?q=${encodeURIComponent(cleanQuery)}&type=video`,
  ];

  for (const endpoint of mirrorEndpoints) {
    try {
      const res = await fetch(endpoint, {
        headers: { 'Accept': 'application/json' },
        signal: AbortSignal.timeout(3500),
      });
      if (res.ok) {
        const items = await res.json();
        if (Array.isArray(items) && items.length > 0) {
          const videos = items.slice(0, limit).map((item: any) => ({
            id: `yt-${item.videoId}`,
            videoId: item.videoId,
            youtubeId: item.videoId,
            title: item.title || cleanQuery,
            artist: item.author || 'YouTube Artist',
            singers: item.author || 'YouTube Artist',
            album: 'YouTube Music',
            category: 'YouTube Music',
            genre: 'YouTube Music',
            coverUrl:
              item.videoThumbnails?.[0]?.url || `https://i.ytimg.com/vi/${item.videoId}/hqdefault.jpg`,
            audioUrl: '',
            duration: item.lengthSeconds || 210,
            playCount: item.viewCount || 55000,
            favoriteCount: 4200,
            vibe: 'YouTube Stream',
            source: 'youtube',
            isFullSong: true,
            previewOnly: false,
          }));

          youtubeSearchCache.set(cacheKey, { timestamp: Date.now(), results: videos });
          return videos;
        }
      }
    } catch {
      // Try next mirror
    }
  }

  return [];
}

// API Routes
app.get('/api/health', (req, res) => {
  res.json({ status: 'ok', engine: 'Azaad Hybrid Streaming Engine' });
});

// ─── SEO & AI / LLM CRAWLER OPTIMIZATION (robots.txt, sitemap.xml, llms.txt) ───
const getBaseUrl = (req: express.Request) =>
  (process.env.APP_URL || `${req.protocol}://${req.get('host')}`).replace(/\/$/, '');

app.get('/robots.txt', (req, res) => {
  const base = getBaseUrl(req);
  res.type('text/plain').send(
    [
      'User-agent: *',
      'Allow: /',
      '',
      'User-agent: GPTBot',
      'User-agent: OAI-SearchBot',
      'User-agent: ChatGPT-User',
      'User-agent: ClaudeBot',
      'User-agent: PerplexityBot',
      'User-agent: Google-Extended',
      'User-agent: Applebot-Extended',
      'Allow: /',
      '',
      `Sitemap: ${base}/sitemap.xml`,
    ].join('\n')
  );
});

app.get('/sitemap.xml', (req, res) => {
  const base = getBaseUrl(req);
  const now = new Date().toISOString().split('T')[0];
  res.type('application/xml').send(`<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
  <url><loc>${base}/</loc><lastmod>${now}</lastmod><changefreq>hourly</changefreq><priority>1.0</priority></url>
  <url><loc>${base}/llms.txt</loc><lastmod>${now}</lastmod><changefreq>weekly</changefreq><priority>0.8</priority></url>
</urlset>`);
});

app.get(['/llms.txt', '/.well-known/llms.txt'], (req, res) => {
  const base = getBaseUrl(req);
  res.type('text/plain; charset=utf-8').send(`# Azaad Music

> Azaad Music is a high-fidelity global music and podcast streaming web application featuring hourly viral charts, 320kbps direct audio streaming, YouTube HD fallback, time-synced LRC lyrics, and cloud-synced playlists.

## Core Capabilities
- **Global & Regional Discovery**: Hourly updated charts combining Apple iTunes Top Songs, Audius decentralized Hi-Fi streams, JioSaavn 320kbps audio, and YouTube Music.
- **Hybrid Dual-Engine Player**: Seamless playback across HTML5 320kbps audio and YouTube IFrame video with automatic candidate failover and MediaSession OS controls.
- **Time-Synced Lyrics**: Real-time synchronized (\`.lrc\`) and plain lyrics powered by LRCLIB.
- **Podcasts & Chapters**: Curated technology, science, business, and history podcasts with timestamped chapter navigation and auto-resume.
- **Cloud Library**: Per-user isolated Firebase Firestore sync for Liked Songs, Custom Playlists, Play History, Search History, and Podcast Subscriptions, plus isolated Guest mode.

## Public Read-Only API Endpoints
- \`GET ${base}/api/health\`: Service status check.
- \`GET ${base}/api/explore/google-trends?genre=All\`: Hourly trending chart tracks.
- \`GET ${base}/api/google/search?q={query}\`: Unified music track search.
- \`GET ${base}/api/youtube/search?q={query}&limit=20\`: YouTube music track search.
- \`GET ${base}/api/google/lyrics?title={title}&artist={artist}\`: Time-synced and plain lyrics lookup.
`);
});

// ─── LIVE EXPLORE TRENDS (Updated Hourly) ───────────────────
app.get('/api/explore/google-trends', async (req, res) => {
  const genre = ((req.query.genre as string) || 'All').trim();
  const force = req.query.force === 'true';
  const cacheKey = `trends-${genre.toLowerCase()}`;

  const cached = googleTrendsCache.get(cacheKey);
  const now = Date.now();
  if (!force && cached && now - cached.timestamp < CACHE_TTL_MS) {
    return res.json({
      success: true,
      source: 'trends-cache',
      timestamp: cached.timestamp,
      expiresInMs: CACHE_TTL_MS - (now - cached.timestamp),
      tracks: cached.tracks,
    });
  }

  let discoveredSongs: any[] = [];

  // Step 1: Fetch live Apple Top Charts
  const appleCharts = await fetchLiveAppleTopCharts(genre);
  if (appleCharts.length > 0) {
    discoveredSongs = appleCharts;
  }

  // Step 2: Direct YouTube fallback if empty
  if (discoveredSongs.length === 0) {
    const fallbackTerms = [
      genre !== 'All' ? `top ${genre} viral hits 2026` : 'top global viral hits 2026 billboard spotify',
      'latest global chartbusters 2026',
    ];
    const ytTracks = await searchYouTubeFree(fallbackTerms[0], 18);
    const resolvedFallback = ytTracks.map((t) => ({
      ...t,
      genre: genre !== 'All' ? genre : t.genre || 'Trending',
      vibe: 'Hourly Trending Release',
      source: 'youtube',
    }));

    googleTrendsCache.set(cacheKey, { timestamp: now, tracks: resolvedFallback });
    return res.json({
      success: true,
      source: 'youtube-hourly',
      timestamp: now,
      expiresInMs: CACHE_TTL_MS,
      tracks: resolvedFallback,
    });
  }

  // Step 3: Resolve each discovered song into a playable streaming track
  const resolvedTracks: any[] = [];
  const resolvePromises = discoveredSongs.slice(0, 16).map(async (songItem, idx) => {
    try {
      const q = `${songItem.title} ${songItem.artist}`.trim();
      const ytResults = await searchYouTubeFree(q, 1);
      if (ytResults && ytResults.length > 0) {
        const top = ytResults[0];
        return {
          id: `gt-${top.videoId || idx}`,
          videoId: top.videoId,
          youtubeId: top.videoId,
          title: songItem.title || top.title,
          artist: songItem.artist || top.artist,
          singers: songItem.singers || songItem.artist || top.artist,
          album: songItem.album || 'Trending Release',
          category: songItem.genre || genre,
          genre: songItem.genre || genre,
          coverUrl: top.coverUrl,
          audioUrl: '',
          duration: top.duration || 210,
          playCount: 180000 + Math.floor(Math.random() * 250000),
          favoriteCount: 14000 + Math.floor(Math.random() * 8000),
          vibe: songItem.vibe || 'Global Chartbuster',
          source: 'youtube',
          isFullSong: true,
          previewOnly: false,
        };
      }
    } catch {}
    return null;
  });

  const settled = await Promise.all(resolvePromises);
  settled.forEach((track) => {
    if (track) resolvedTracks.push(track);
  });

  if (resolvedTracks.length === 0) {
    const ytTracks = await searchYouTubeFree('top global viral hits 2026', 15);
    resolvedTracks.push(...ytTracks);
  }

  googleTrendsCache.set(cacheKey, { timestamp: now, tracks: resolvedTracks });

  res.json({
    success: true,
    source: 'live-charts',
    timestamp: now,
    expiresInMs: CACHE_TTL_MS,
    tracks: resolvedTracks,
  });
});

// ─── DIRECT MUSIC SEARCH ────────────────────────
app.get('/api/google/search', async (req, res) => {
  const query = ((req.query.q as string) || (req.query.query as string) || '').trim();
  if (!query) {
    return res.json({ success: true, results: [], total: 0 });
  }

  const cacheKey = `gsearch-${query.toLowerCase()}`;
  const cached = googleSearchMusicCache.get(cacheKey);
  const now = Date.now();
  if (cached && now - cached.timestamp < CACHE_TTL_MS) {
    return res.json({ success: true, source: 'cache', results: cached.results });
  }

  const directYt = await searchYouTubeFree(query, 12);
  googleSearchMusicCache.set(cacheKey, { timestamp: now, results: directYt });
  res.json({ success: true, source: 'youtube', results: directYt });
});

// ─── VERIFIED LYRICS SEARCH (Synchronized & Plain) ─────────────────────────
function extractCleanTrackAndArtist(rawTitle: string, rawArtist: string): { cleanTitle: string; cleanArtist: string; altTitle?: string; altArtist?: string } {
  const stripNoise = (s: string) =>
    (s || '')
      .replace(/\s*[\(\[][^\)\]]*(?:official|video|audio|lyric|lyrics|visualizer|mv|hd|4k|hq|full\s*song|remaster|live|prod\.|feat\.|ft\.|from\s+["'].*?["']|soundtrack|ost)[^\)\]]*[\)\]]/gi, ' ')
      .replace(/\|.*$/g, ' ')
      .replace(/\b(?:official\s*(?:music\s*)?(?:video|audio|lyric\s*video)|full\s*(?:video|audio|song)|lyric\s*video|audio\s*song|4k\s*uhd|soundtrack|ost)\b/gi, ' ')
      .replace(/\s+(?:ft\.?|feat\.?|featuring)\s+.*$/i, '')
      .replace(/\s+/g, ' ')
      .trim();

  let cleanedTitle = stripNoise(rawTitle);
  let cleanedArtist = stripNoise(rawArtist)
    .replace(/\s*-\s*topic$/i, '')
    .replace(/\b(?:vevo|official|music|records|entertainment|series|studios)\b/gi, '')
    .split(/[,&/]|(?:\s+(?:x|vs\.?)\s+)/i)[0]
    .trim();

  let altTitle: string | undefined;
  let altArtist: string | undefined;

  const dashParts = cleanedTitle.split(/\s+[-–—:]\s+/);
  if (dashParts.length >= 2) {
    const left = dashParts[0].trim();
    const right = dashParts.slice(1).join(' - ').trim();
    if (left && right) {
      // Common YouTube pattern: "Artist - Song Title" or "Song Title - Artist"
      altArtist = left.split(/[,&/]/)[0].trim();
      altTitle = right;
      if (!cleanedArtist || cleanedArtist.toLowerCase() === 'youtube music' || cleanedTitle.toLowerCase().startsWith(cleanedArtist.toLowerCase())) {
        cleanedTitle = right;
        if (!cleanedArtist || cleanedArtist.toLowerCase() === 'youtube music') {
          cleanedArtist = altArtist;
        }
      }
    }
  }

  return {
    cleanTitle: cleanedTitle || rawTitle.trim(),
    cleanArtist: cleanedArtist || rawArtist.trim(),
    altTitle,
    altArtist,
  };
}

app.all(['/api/google/lyrics', '/api/lyrics/search'], async (req, res) => {
  const title = (req.query.title as string) || (req.body?.title as string) || '';
  const artist = (req.query.artist as string) || (req.body?.artist as string) || '';
  const duration = parseInt((req.query.duration as string) || (req.body?.duration as string) || '210', 10);

  if (!title) {
    return res.status(400).json({ success: false, error: 'Missing song title' });
  }

  const cacheKey = `${title.toLowerCase()}::${artist.toLowerCase()}::${Math.round(duration / 5) * 5}`;
  const cached = googleLyricsCache.get(cacheKey);
  const now = Date.now();
  if (cached && now - cached.timestamp < CACHE_TTL_MS * 24) {
    return res.json({ success: true, cached: true, ...cached.data });
  }

  try {
    const { cleanTitle, cleanArtist, altTitle, altArtist } = extractCleanTrackAndArtist(title, artist);
    const headers = { 'User-Agent': 'AzaadMusicPlayer/2.0 (LrcClient)' };

    let lrcData: any = null;
    const getUrl = `https://lrclib.net/api/get?track_name=${encodeURIComponent(cleanTitle)}&artist_name=${encodeURIComponent(cleanArtist)}${duration > 0 ? `&duration=${duration}` : ''}`;
    const lrcRes = await fetch(getUrl, { headers, signal: AbortSignal.timeout(3500) }).catch(() => null);
    if (lrcRes?.ok) {
      lrcData = await lrcRes.json();
    }

    const titleWithoutParens = cleanTitle.replace(/\s*[\(\[].*?[\)\]]/g, '').trim();
    // Search queries ranked by syncedLyrics availability and closest track duration
    const searchQueries = [
      `${cleanTitle} ${cleanArtist}`.trim(),
      titleWithoutParens && titleWithoutParens !== cleanTitle ? `${titleWithoutParens} ${cleanArtist}`.trim() : '',
      altTitle ? `${altTitle} ${altArtist || cleanArtist}`.trim() : '',
      cleanTitle,
      titleWithoutParens && titleWithoutParens !== cleanTitle ? titleWithoutParens : '',
    ].filter((q, i, arr) => Boolean(q) && arr.indexOf(q) === i);

    for (const q of searchQueries) {
      if (lrcData?.syncedLyrics) break;
      const searchRes = await fetch(`https://lrclib.net/api/search?q=${encodeURIComponent(q)}`, {
        headers,
        signal: AbortSignal.timeout(3500),
      }).catch(() => null);
      if (searchRes?.ok) {
        const items = await searchRes.json();
        if (Array.isArray(items) && items.length > 0) {
          const syncedCandidates = items.filter((it: any) => it.syncedLyrics);
          if (syncedCandidates.length > 0) {
            syncedCandidates.sort(
              (a: any, b: any) =>
                Math.abs((Number(a.duration) || duration) - duration) -
                Math.abs((Number(b.duration) || duration) - duration)
            );
            lrcData = syncedCandidates[0];
            break;
          }
          if (!lrcData) {
            lrcData = items.find((it: any) => it.plainLyrics) || items[0];
          }
        }
      }
    }

    if (lrcData && (lrcData.syncedLyrics || lrcData.plainLyrics)) {
      const payload = {
        type: lrcData.syncedLyrics ? 'synced' : 'plain',
        syncedLyrics: lrcData.syncedLyrics || '',
        plainLyrics: lrcData.plainLyrics || '',
        trackDuration: Number(lrcData.duration) || duration,
        romanizedLyrics: '',
        translation: '',
        language: 'Auto',
        source: lrcData.syncedLyrics ? 'LRCLIB Time-Synced' : 'LRCLIB Verified',
      };
      googleLyricsCache.set(cacheKey, { timestamp: now, data: payload });
      return res.json({ success: true, ...payload });
    }
  } catch {}

  res.json({
    success: false,
    type: 'none',
    error: 'Lyrics unavailable for this track',
  });
});

// YouTube Free Search Endpoint
app.get('/api/youtube/search', async (req, res) => {
  const query = (req.query.q as string) || (req.query.query as string) || '';
  const limit = Math.min(parseInt((req.query.limit as string) || '20', 10), 50);

  if (!query) {
    return res.json({ results: [], total: 0 });
  }

  const results = await searchYouTubeFree(query, limit);
  res.json({ results, total: results.length });
});

// YouTube Resolution for any title + artist to ensure full song playback
app.get('/api/youtube/resolve', async (req, res) => {
  const title = (req.query.title as string) || '';
  const artist = (req.query.artist as string) || '';
  const baseQuery = `${title} ${artist}`.trim();

  if (!baseQuery) {
    return res.status(400).json({ error: 'Missing title or artist' });
  }

  // Search both official audio/lyrics (which rarely have VEVO embed blocks) and general query
  const [audioResults, generalResults] = await Promise.all([
    searchYouTubeFree(`${baseQuery} official audio lyrics`, 5).catch(() => []),
    searchYouTubeFree(baseQuery, 5).catch(() => []),
  ]);

  const combined = [...audioResults, ...generalResults];
  const seen = new Set<string>();
  const unique = combined.filter((item) => {
    if (!item?.videoId || seen.has(item.videoId)) return false;
    seen.add(item.videoId);
    return true;
  });

  if (unique.length > 0) {
    const best = unique[0];
    return res.json({
      success: true,
      videoId: best.videoId,
      candidates: unique.map((u) => u.videoId).slice(0, 6),
      title: best.title,
      duration: best.duration,
      coverUrl: best.coverUrl,
    });
  }

  res.json({ success: false, videoId: null, candidates: [] });
});

// Resolve Direct Audio Stream URL for Uninterrupted Native Background Playback
app.get('/api/audio/resolve', async (req, res) => {
  const title = (req.query.title as string) || '';
  const artist = (req.query.artist as string) || '';
  const videoId = (req.query.videoId as string) || '';
  const query = `${title} ${artist}`.trim() || videoId;

  if (!query) {
    return res.status(400).json({ success: false, error: 'Missing query parameters' });
  }

  const cacheKey = `audio-${query.toLowerCase()}`;
  const cached = audioResolveCache.get(cacheKey);
  if (cached && Date.now() - cached.timestamp < CACHE_TTL_MS) {
    return res.json(cached.data);
  }

  // Tier 1: JioSaavn 320kbps High-Fidelity Direct Audio Stream
  const saavnEndpoints = [
    `https://saavn.dev/api/search/songs?query=${encodeURIComponent(query)}&page=1&limit=5`,
    `https://jiosaavn-api-privatecvc2.vercel.app/search/songs?query=${encodeURIComponent(query)}`,
  ];

  for (const ep of saavnEndpoints) {
    try {
      const saavnRes = await fetch(ep, { signal: AbortSignal.timeout(3500) });
      if (saavnRes.ok) {
        const json = await saavnRes.json();
        const songs = json?.data?.results || json?.data?.songs || json?.results || [];
        if (Array.isArray(songs) && songs.length > 0) {
          const bestSong = songs[0];
          const dl = Array.isArray(bestSong.downloadUrl) ? bestSong.downloadUrl : [];
          const highQuality =
            dl.find((d: any) => d.quality === '320kbps') ||
            dl.find((d: any) => d.quality === '160kbps') ||
            dl[dl.length - 1];
          const audioUrl = highQuality?.link || highQuality?.url || bestSong.media_url || bestSong.url || '';
          if (audioUrl) {
            const result = {
              success: true,
              audioUrl,
              source: 'saavn',
              trackId: bestSong.id,
              duration: Number(bestSong.duration) || 210,
            };
            audioResolveCache.set(cacheKey, { timestamp: Date.now(), data: result });
            return res.json(result);
          }
        }
      }
    } catch {
      // Continue to next endpoint
    }
  }

  // Tier 2: Audius Decentralized Hi-Fi Network
  try {
    const searchUrl = `https://api.audius.co/v1/tracks/search?query=${encodeURIComponent(query)}&app_name=${encodeURIComponent(AUDIUS_APP_NAME)}&limit=5`;
    const audiusRes = await fetch(searchUrl, { signal: AbortSignal.timeout(3500) });
    if (audiusRes.ok) {
      const json = await audiusRes.json();
      const tracks = json.data || [];
      if (tracks.length > 0) {
        const cleanTitleWords = title
          .toLowerCase()
          .replace(/[^a-z0-9\s]/g, '')
          .split(/\s+/)
          .filter((w: string) => w.length >= 2);

        const matchingTrack =
          tracks.find((t: any) => {
            const trackTitle = (t.title || '').toLowerCase();
            return cleanTitleWords.length > 0 && cleanTitleWords.some((w: string) => trackTitle.includes(w));
          }) || tracks[0];

        if (matchingTrack) {
          const streamUrl = `https://api.audius.co/v1/tracks/${matchingTrack.id}/stream?app_name=${encodeURIComponent(AUDIUS_APP_NAME)}`;
          const result = {
            success: true,
            audioUrl: streamUrl,
            source: 'audius',
            trackId: matchingTrack.id,
            duration: matchingTrack.duration || 210,
          };
          audioResolveCache.set(cacheKey, { timestamp: Date.now(), data: result });
          return res.json(result);
        }
      }
    }
  } catch {
    // Quietly continue
  }

  // Tier 3: Apple iTunes Direct M4A Stream Fallback
  try {
    const itunesUrl = `https://itunes.apple.com/search?term=${encodeURIComponent(query)}&media=music&entity=song&limit=5`;
    const itunesRes = await fetch(itunesUrl, { signal: AbortSignal.timeout(3500) });
    if (itunesRes.ok) {
      const json = await itunesRes.json();
      const results = json?.results || [];
      const match = results.find((r: any) => r.previewUrl);
      if (match && match.previewUrl) {
        const result = {
          success: true,
          audioUrl: match.previewUrl,
          source: 'itunes',
          trackId: String(match.trackId),
          duration: Math.round((match.trackTimeMillis || 210000) / 1000),
        };
        audioResolveCache.set(cacheKey, { timestamp: Date.now(), data: result });
        return res.json(result);
      }
    }
  } catch {
    // Quietly continue
  }

  res.json({ success: false, audioUrl: null });
});

// Vite middleware & Static serving setup
async function startServer() {
  if (process.env.NODE_ENV !== 'production') {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), 'dist');
    app.use(express.static(distPath));
    // In Express v5, catch-all is *all
    app.get('*all', (req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`Azaad Music Server running on http://0.0.0.0:${PORT}`);
  });
}

startServer();
