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

// ─── ECHO-MUSIC MULTI-SOURCE SYNCHRONIZED LYRICS (:lyrics + 6 Provider Modules) ───
function extractCleanTrackAndArtist(rawTitle: string, rawArtist: string): {
  cleanTitle: string;
  cleanArtist: string;
  altTitle?: string;
  altArtist?: string;
} {
  const stripNoise = (s: string) =>
    (s || '')
      .replace(
        /\s*[\(\[][^\)\]]*(?:official|video|audio|lyric|lyrics|visualizer|mv|hd|4k|hq|full\s*song|remaster|live|prod\.|feat\.|ft\.)[^\)\]]*[\)\]]/gi,
        ' '
      )
      .replace(/【.*?】/g, ' ')
      .replace(/\|.*$/g, ' ')
      .replace(
        /\b(?:official\s*(?:music\s*)?(?:video|audio|lyric\s*video)|full\s*(?:video|audio|song)|lyric\s*video|audio\s*song|4k\s*uhd)\b/gi,
        ' '
      )
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
      altArtist = left.split(/[,&/]/)[0].trim();
      altTitle = right;
      if (
        !cleanedArtist ||
        cleanedArtist.toLowerCase() === 'youtube music' ||
        cleanedTitle.toLowerCase().startsWith(cleanedArtist.toLowerCase())
      ) {
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

function formatMsToLrcTag(timeMs: number, isSyllable = false): string {
  const safeMs = Math.max(0, Math.round(Number(timeMs) || 0));
  const minutes = Math.floor(safeMs / 60000);
  const seconds = Math.floor((safeMs % 60000) / 1000);
  const millis = safeMs % 1000;
  const open = isSyllable ? '<' : '[';
  const close = isSyllable ? '>' : ']';
  return `${open}${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}.${String(millis).padStart(3, '0')}${close}`;
}

function parseTtmlTimeToMs(timeStr: string): number {
  const raw = (timeStr || '').trim();
  if (!raw) return 0;
  if (raw.endsWith('ms')) return parseFloat(raw) || 0;
  if (raw.endsWith('s')) return (parseFloat(raw) || 0) * 1000;
  const parts = raw.split(':').map(Number);
  if (parts.some(isNaN)) return 0;
  if (parts.length === 3) return (parts[0] * 3600 + parts[1] * 60 + parts[2]) * 1000;
  if (parts.length === 2) return (parts[0] * 60 + parts[1]) * 1000;
  return (parts[0] || 0) * 1000;
}

// TTML-to-LRC parser (:betterlyrics & :paxsenixlyrics TTMLParser equivalent)
function convertTTMLToLRC(ttml: string): string {
  if (!ttml || typeof ttml !== 'string' || !ttml.includes('<p')) return '';
  const decodeEntities = (s: string) =>
    s
      .replace(/&amp;/g, '&')
      .replace(/&lt;/g, '<')
      .replace(/&gt;/g, '>')
      .replace(/&quot;/g, '"')
      .replace(/&#39;|&apos;/g, "'");

  const pRegex = /<p\b([^>]*)>([\s\S]*?)<\/p>/gi;
  const lines: Array<{ timeMs: number; lrcLine: string }> = [];
  let match: RegExpExecArray | null;

  while ((match = pRegex.exec(ttml)) !== null) {
    const attrs = match[1] || '';
    const inner = match[2] || '';
    const beginMatch = attrs.match(/\bbegin\s*=\s*["']([^"']+)["']/i);
    if (!beginMatch) continue;
    const lineStartMs = parseTtmlTimeToMs(beginMatch[1]);
    const textContent = decodeEntities(
      inner
        .replace(/<span\b[^>]*ttm:role\s*=\s*["']x-bg["'][^>]*>[\s\S]*?<\/span>/gi, ' ')
        .replace(/<[^>]+>/g, ' ')
        .replace(/\s+/g, ' ')
        .trim()
    );
    if (textContent) {
      lines.push({
        timeMs: lineStartMs,
        lrcLine: `${formatMsToLrcTag(lineStartMs)}${textContent}`,
      });
    }
  }

  return lines
    .sort((a, b) => a.timeMs - b.timeMs)
    .map((l) => l.lrcLine)
    .join('\n');
}

interface EchoLyricsResult {
  provider: string;
  type: 'synced' | 'plain';
  syncedLyrics: string;
  plainLyrics: string;
  trackDuration?: number;
}

// 1. :youlyplus Module (YouLyPlus Lyrics Cluster)
const YOULYPLUS_SERVERS = [
  'https://lyricsplus.prjktla.workers.dev',
  'https://lyricsplus-seven.vercel.app',
  'https://lyrics-plus-backend.vercel.app',
];
let lastWorkingYouLyServer: string | null = null;

async function fetchYouLyPlusLyrics(
  title: string,
  artist: string,
  duration: number,
  album?: string,
  videoId?: string
): Promise<EchoLyricsResult | null> {
  const orderedServers = lastWorkingYouLyServer
    ? [lastWorkingYouLyServer, ...YOULYPLUS_SERVERS.filter((s) => s !== lastWorkingYouLyServer)]
    : YOULYPLUS_SERVERS;

  const queryServer = async (baseUrl: string): Promise<EchoLyricsResult | null> => {
    const params = new URLSearchParams({
      title,
      artist,
      duration: String(duration || 210),
    });
    if (album) params.set('album', album);
    if (videoId) params.set('id', videoId);

    const res = await fetch(`${baseUrl}/v2/lyrics/get?${params.toString()}`, {
      headers: { Accept: 'application/json', 'User-Agent': 'EchoMusic/2.0' },
      signal: AbortSignal.timeout(3800),
    });
    if (!res.ok) return null;
    const data: any = await res.json();

    if (typeof data?.syncedLyrics === 'string' && data.syncedLyrics.includes('[')) {
      lastWorkingYouLyServer = baseUrl;
      return {
        provider: 'YouLyPlus',
        type: 'synced',
        syncedLyrics: data.syncedLyrics.trim(),
        plainLyrics: data.plainLyrics || '',
        trackDuration: duration,
      };
    }

    if (Array.isArray(data?.lyrics) && data.lyrics.length > 0) {
      const lrcLines = data.lyrics
        .map((item: any) => {
          const lineMs = Number(item?.time) || 0;
          const text = String(item?.text || '').trim();
          if (!text && Array.isArray(item?.syllabus)) {
            const joined = item.syllabus
              .map((s: any) => String(s?.text || ''))
              .join('')
              .replace(/\s+/g, ' ')
              .trim();
            return joined ? `${formatMsToLrcTag(lineMs)}${joined}` : '';
          }
          return text ? `${formatMsToLrcTag(lineMs)}${text}` : '';
        })
        .filter(Boolean);

      if (lrcLines.length > 0) {
        lastWorkingYouLyServer = baseUrl;
        return {
          provider: 'YouLyPlus',
          type: 'synced',
          syncedLyrics: lrcLines.join('\n'),
          plainLyrics: data.plainLyrics || '',
          trackDuration: duration,
        };
      }
    }

    if (typeof data?.plainLyrics === 'string' && data.plainLyrics.trim().length > 20) {
      lastWorkingYouLyServer = baseUrl;
      return {
        provider: 'YouLyPlus',
        type: 'plain',
        syncedLyrics: '',
        plainLyrics: data.plainLyrics.trim(),
        trackDuration: duration,
      };
    }
    return null;
  };

  try {
    const results = await Promise.all(orderedServers.map((srv) => queryServer(srv).catch(() => null)));
    return results.find((r) => r?.type === 'synced') || results.find(Boolean) || null;
  } catch {
    return null;
  }
}

// 2. :paxsenixlyrics Module (PaxSenix Apple Music / Syllable & ELRC Lyrics)
async function fetchPaxsenixLyrics(
  title: string,
  artist: string,
  duration: number
): Promise<EchoLyricsResult | null> {
  try {
    const q = `${title} ${artist}`.trim();
    const headers = { 'User-Agent': 'echomusic/2.0', Accept: 'application/json' };
    const searchRes = await fetch(
      `https://lyrics.paxsenix.org/apple-music/search?q=${encodeURIComponent(q)}`,
      { headers, signal: AbortSignal.timeout(3800) }
    );
    if (!searchRes.ok) return null;
    const searchData: any = await searchRes.json();
    const candidates: any[] = Array.isArray(searchData)
      ? searchData
      : Array.isArray(searchData?.results)
      ? searchData.results
      : [];
    if (candidates.length === 0) return null;

    const targetDurMs = (duration || 210) * 1000;
    const scored = candidates
      .map((item: any) => {
        let score = 0;
        const itemDurMs = Number(item?.duration || item?.durationInMillis || 0);
        if (itemDurMs > 0 && duration > 0) {
          const diff = Math.abs(itemDurMs - targetDurMs);
          if (diff <= 3000) score += 80;
          else if (diff <= 10000) score += 30;
          else score -= 40;
        }
        const name = String(item?.displayName || item?.trackName || item?.name || '').toLowerCase();
        const art = String(item?.displayArtist || item?.artistName || '').toLowerCase();
        if (name.includes(title.toLowerCase())) score += 60;
        if (artist && art.includes(artist.toLowerCase())) score += 50;
        return { item, score };
      })
      .sort((a, b) => b.score - a.score);

    const best = scored[0]?.item;
    const trackId = best?.id || best?.trackId;
    if (!trackId) return null;

    const lrcRes = await fetch(
      `https://lyrics.paxsenix.org/apple-music/lyrics?id=${encodeURIComponent(String(trackId))}`,
      { headers, signal: AbortSignal.timeout(3800) }
    );
    if (!lrcRes.ok) return null;
    const lrcData: any = await lrcRes.json();

    if (lrcData?.ttmlContent) {
      const converted = convertTTMLToLRC(lrcData.ttmlContent);
      if (converted) {
        return {
          provider: 'PaxSenix',
          type: 'synced',
          syncedLyrics: converted,
          plainLyrics: lrcData.plain || '',
          trackDuration: duration,
        };
      }
    }

    const elrc = lrcData?.elrcMultiPerson || lrcData?.elrc;
    if (typeof elrc === 'string' && elrc.includes('[')) {
      return {
        provider: 'PaxSenix',
        type: 'synced',
        syncedLyrics: elrc.trim(),
        plainLyrics: lrcData.plain || '',
        trackDuration: duration,
      };
    }

    if (Array.isArray(lrcData?.content) && lrcData.content.length > 0) {
      const lines = lrcData.content
        .map((line: any) => {
          const lineMs = Number(line?.timestamp) || 0;
          const text = Array.isArray(line?.text)
            ? line.text.map((w: any) => w?.text || '').join(' ').replace(/\s+/g, ' ').trim()
            : String(line?.text || '').trim();
          return text ? `${formatMsToLrcTag(lineMs)}${text}` : '';
        })
        .filter(Boolean);
      if (lines.length > 0) {
        return {
          provider: 'PaxSenix',
          type: 'synced',
          syncedLyrics: lines.join('\n'),
          plainLyrics: lrcData.plain || '',
          trackDuration: duration,
        };
      }
    }

    if (typeof lrcData?.plain === 'string' && lrcData.plain.trim()) {
      return {
        provider: 'PaxSenix',
        type: 'plain',
        syncedLyrics: '',
        plainLyrics: lrcData.plain.trim(),
        trackDuration: duration,
      };
    }
  } catch {}
  return null;
}

// 3. :betterlyrics Module (Better Lyrics TTML API)
async function fetchBetterLyrics(
  title: string,
  artist: string,
  duration: number,
  album?: string
): Promise<EchoLyricsResult | null> {
  try {
    const params = new URLSearchParams({ s: title, a: artist });
    if (duration > 0) params.set('d', String(duration));
    if (album) params.set('al', album);

    const res = await fetch(`https://lyrics-api.boidu.dev/getLyrics?${params.toString()}`, {
      headers: { Accept: 'application/json', 'User-Agent': 'EchoMusic/2.0' },
      signal: AbortSignal.timeout(3800),
    });
    if (!res.ok) return null;
    const data: any = await res.json();
    if (data?.ttml) {
      const lrc = convertTTMLToLRC(data.ttml);
      if (lrc) {
        return {
          provider: 'Better Lyrics',
          type: 'synced',
          syncedLyrics: lrc,
          plainLyrics: '',
          trackDuration: duration,
        };
      }
    }
  } catch {}
  return null;
}

// 4. :simpmusic Module (SimpMusic VideoId Synced Lyrics Database)
async function fetchSimpMusicLyrics(
  videoId: string,
  duration: number
): Promise<EchoLyricsResult | null> {
  if (!videoId) return null;
  const cleanVid = videoId.replace(/^yt-/, '').trim();
  if (!cleanVid) return null;

  const endpoints = [
    `https://api-lyrics.simpmusic.org/v1/${encodeURIComponent(cleanVid)}`,
    `https://vivi-yt-music-server.onrender.com/v1/${encodeURIComponent(cleanVid)}`,
  ];

  for (const url of endpoints) {
    try {
      const res = await fetch(url, {
        headers: {
          Accept: 'application/json',
          'User-Agent': 'SimpMusicLyrics/1.0',
        },
        signal: AbortSignal.timeout(3500),
      });
      if (!res.ok) continue;
      const json: any = await res.json();
      const tracks: any[] = Array.isArray(json?.data) ? json.data : [];
      if (tracks.length === 0) continue;

      const sorted =
        duration > 0
          ? [...tracks].sort(
              (a, b) =>
                Math.abs((Number(a?.duration) || duration) - duration) -
                Math.abs((Number(b?.duration) || duration) - duration)
            )
          : tracks;

      const best = sorted[0];
      const synced = best?.richSyncLyrics || best?.syncedLyrics;
      if (typeof synced === 'string' && synced.includes('[')) {
        return {
          provider: 'SimpMusic',
          type: 'synced',
          syncedLyrics: synced.trim(),
          plainLyrics: best?.plainLyrics || '',
          trackDuration: Number(best?.duration) || duration,
        };
      }
      if (typeof best?.plainLyrics === 'string' && best.plainLyrics.trim()) {
        return {
          provider: 'SimpMusic',
          type: 'plain',
          syncedLyrics: '',
          plainLyrics: best.plainLyrics.trim(),
          trackDuration: Number(best?.duration) || duration,
        };
      }
    } catch {}
  }
  return null;
}

// 5. :lrclib Module (LRCLIB Duration-Ranked Synced Lyrics)
async function fetchLrcLibProviderLyrics(
  cleanTitle: string,
  cleanArtist: string,
  duration: number,
  altTitle?: string,
  altArtist?: string
): Promise<EchoLyricsResult | null> {
  try {
    const headers = { 'User-Agent': 'AzaadMusicPlayer/2.0 (EchoMusic LrcLib)' };
    let lrcData: any = null;

    const getUrl = `https://lrclib.net/api/get?track_name=${encodeURIComponent(cleanTitle)}&artist_name=${encodeURIComponent(cleanArtist)}${duration > 0 ? `&duration=${duration}` : ''}`;
    const lrcRes = await fetch(getUrl, { headers, signal: AbortSignal.timeout(3500) }).catch(() => null);
    if (lrcRes?.ok) {
      lrcData = await lrcRes.json();
    }

    const searchQueries = [
      `${cleanTitle} ${cleanArtist}`.trim(),
      altTitle ? `${altTitle} ${altArtist || cleanArtist}`.trim() : '',
      cleanTitle,
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
      return {
        provider: 'LrcLib',
        type: lrcData.syncedLyrics ? 'synced' : 'plain',
        syncedLyrics: lrcData.syncedLyrics || '',
        plainLyrics: lrcData.plainLyrics || '',
        trackDuration: Number(lrcData.duration) || duration,
      };
    }
  } catch {}
  return null;
}

// 6. :kugou Module (KuGou Timestamped LRC Engine)
async function fetchKuGouLyrics(
  title: string,
  artist: string,
  duration: number
): Promise<EchoLyricsResult | null> {
  try {
    const keyword = `${title} - ${artist}`.trim();
    const durMs = duration > 0 ? duration * 1000 : 210000;
    const searchUrl = `https://lyrics.kugou.com/search?ver=1&man=yes&client=pc&keyword=${encodeURIComponent(keyword)}&duration=${durMs}`;
    const searchRes = await fetch(searchUrl, { signal: AbortSignal.timeout(3500) });
    if (!searchRes.ok) return null;
    const searchJson: any = await searchRes.json();
    const candidates: any[] = Array.isArray(searchJson?.candidates) ? searchJson.candidates : [];
    const best = candidates[0];
    if (!best?.id || !best?.accesskey) return null;

    const dlUrl = `https://lyrics.kugou.com/download?fmt=lrc&charset=utf8&client=pc&ver=1&id=${encodeURIComponent(String(best.id))}&accesskey=${encodeURIComponent(String(best.accesskey))}`;
    const dlRes = await fetch(dlUrl, { signal: AbortSignal.timeout(3500) });
    if (!dlRes.ok) return null;
    const dlJson: any = await dlRes.json();
    if (!dlJson?.content) return null;

    const decoded = Buffer.from(String(dlJson.content), 'base64').toString('utf-8');
    const acceptedRegex = /^\[\d{2}:\d{2}\.\d{2,3}\].+/;
    const bannedMetaRegex = /^\[[^\]]+\][^:：]*[:：].+/;
    const validLines = decoded
      .split(/\r?\n/)
      .map((l) => l.trim())
      .filter((l) => acceptedRegex.test(l) && !bannedMetaRegex.test(l));

    if (validLines.length >= 4) {
      return {
        provider: 'KuGou',
        type: 'synced',
        syncedLyrics: validLines.join('\n'),
        plainLyrics: '',
        trackDuration: duration,
      };
    }
  } catch {}
  return null;
}

const ECHO_LYRICS_PROVIDERS = [
  'YouLyPlus',
  'Paxsenix',
  'BetterLyrics',
  'SimpMusic',
  'LrcLib',
  'Kugou',
] as const;

app.get('/api/lyrics/providers', (_req, res) => {
  res.json({
    success: true,
    providers: [
      { id: 'auto', name: 'Auto (6 Sources)' },
      { id: 'YouLyPlus', name: 'YouLyPlus' },
      { id: 'Paxsenix', name: 'PaxSenix' },
      { id: 'BetterLyrics', name: 'Better Lyrics' },
      { id: 'SimpMusic', name: 'SimpMusic' },
      { id: 'LrcLib', name: 'LrcLib' },
      { id: 'Kugou', name: 'KuGou' },
    ],
  });
});

app.all(['/api/google/lyrics', '/api/lyrics/search'], async (req, res) => {
  const title = (req.query.title as string) || (req.body?.title as string) || '';
  const artist = (req.query.artist as string) || (req.body?.artist as string) || '';
  const album = (req.query.album as string) || (req.body?.album as string) || '';
  const videoId = (req.query.videoId as string) || (req.body?.videoId as string) || '';
  const requestedProvider = ((req.query.provider as string) || (req.body?.provider as string) || 'auto').trim();
  const duration = parseInt((req.query.duration as string) || (req.body?.duration as string) || '210', 10);

  if (!title) {
    return res.status(400).json({ success: false, error: 'Missing song title' });
  }

  const cacheKey = `${requestedProvider.toLowerCase()}::${title.toLowerCase()}::${artist.toLowerCase()}::${Math.round(duration / 5) * 5}`;
  const cached = googleLyricsCache.get(cacheKey);
  const now = Date.now();
  if (cached && now - cached.timestamp < CACHE_TTL_MS * 24) {
    return res.json({ success: true, cached: true, ...cached.data });
  }

  try {
    const { cleanTitle, cleanArtist, altTitle, altArtist } = extractCleanTrackAndArtist(title, artist);

    const runProvider = async (name: string): Promise<EchoLyricsResult | null> => {
      switch (name.toLowerCase()) {
        case 'youlyplus':
          return fetchYouLyPlusLyrics(cleanTitle, cleanArtist, duration, album, videoId);
        case 'paxsenix':
          return fetchPaxsenixLyrics(cleanTitle, cleanArtist, duration);
        case 'betterlyrics':
          return fetchBetterLyrics(cleanTitle, cleanArtist, duration, album);
        case 'simpmusic':
          return fetchSimpMusicLyrics(videoId, duration);
        case 'lrclib':
          return fetchLrcLibProviderLyrics(cleanTitle, cleanArtist, duration, altTitle, altArtist);
        case 'kugou':
          return fetchKuGouLyrics(cleanTitle, cleanArtist, duration);
        default:
          return null;
      }
    };

    let winningResult: EchoLyricsResult | null = null;

    if (requestedProvider && requestedProvider.toLowerCase() !== 'auto') {
      winningResult = await runProvider(requestedProvider);
      if (!winningResult && requestedProvider.toLowerCase() !== 'lrclib') {
        winningResult = await fetchLrcLibProviderLyrics(cleanTitle, cleanArtist, duration, altTitle, altArtist);
      }
    } else {
      // Echo-Music Multi-Source Orchestrator: query all 6 providers concurrently and score by duration accuracy
      const settled = await Promise.all(
        ECHO_LYRICS_PROVIDERS.map((p) => runProvider(p).catch(() => null))
      );
      const syncedCandidates = settled.filter(
        (r): r is EchoLyricsResult => Boolean(r && r.type === 'synced' && r.syncedLyrics)
      );

      if (syncedCandidates.length > 0) {
        // Score candidates by closest duration match to playing audio + provider timestamp precision
        const scoreCandidate = (cand: EchoLyricsResult) => {
          let score = 100;
          const candDur = Number(cand.trackDuration) || duration;
          const diff = Math.abs(candDur - duration);
          score -= Math.min(60, diff * 3);
          if (cand.provider === 'LrcLib' && diff <= 4) score += 25;
          if (cand.provider === 'Better Lyrics') score += 20;
          if (cand.provider === 'SimpMusic') score += 18;
          if (cand.provider === 'PaxSenix') score += 15;
          if (cand.provider === 'YouLyPlus') score += 12;
          return score;
        };
        syncedCandidates.sort((a, b) => scoreCandidate(b) - scoreCandidate(a));
        winningResult = syncedCandidates[0];
      } else {
        winningResult = settled.find((r) => r && (r.syncedLyrics || r.plainLyrics)) || null;
      }
    }

    if (winningResult && (winningResult.syncedLyrics || winningResult.plainLyrics)) {
      const payload = {
        type: winningResult.syncedLyrics ? 'synced' : 'plain',
        syncedLyrics: winningResult.syncedLyrics || '',
        plainLyrics: winningResult.plainLyrics || '',
        trackDuration: Number(winningResult.trackDuration) || duration,
        romanizedLyrics: '',
        translation: '',
        language: 'Auto',
        provider: winningResult.provider,
        source: `${winningResult.provider} Synced`,
        availableProviders: ECHO_LYRICS_PROVIDERS,
      };
      googleLyricsCache.set(cacheKey, { timestamp: now, data: payload });
      return res.json({ success: true, ...payload });
    }
  } catch {}

  res.json({
    success: false,
    type: 'none',
    availableProviders: ECHO_LYRICS_PROVIDERS,
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

// ─── ECHO-MUSIC INNERTUBE & PIPED AUDIO STREAM EXTRACTOR (For Background Play) ───
async function extractYouTubeAudioStream(videoId: string): Promise<{ audioUrl: string; duration?: number; source: string } | null> {
  const cleanVid = (videoId || '').replace(/^yt-/, '').trim();
  if (!cleanVid || !/^[a-zA-Z0-9_-]{11}$/.test(cleanVid)) return null;

  // 1. Echo-Music :innertube ANDROID_VR (1.65.10) & IOS Player API
  const innerTubeClients = [
    {
      clientName: 'ANDROID_VR',
      clientVersion: '1.65.10',
      osName: 'Android',
      osVersion: '12L',
      deviceMake: 'Oculus',
      deviceModel: 'Quest 3',
      androidSdkVersion: 32,
      userAgent:
        'com.google.android.apps.youtube.vr.oculus/1.65.10 (Linux; U; Android 12L; eureka-user Build/SQ3A.220605.009.A1) gzip',
    },
    {
      clientName: 'IOS',
      clientVersion: '21.03.1',
      deviceMake: 'Apple',
      deviceModel: 'iPhone16,2',
      osName: 'iPhone',
      osVersion: '18.2.22C152',
      userAgent: 'com.google.ios.youtube/21.03.1 (iPhone16,2; U; CPU iOS 18_2 like Mac OS X;)',
    },
  ];

  for (const client of innerTubeClients) {
    try {
      const ytRes = await fetch('https://www.youtube.com/youtubei/v1/player?prettyPrint=false', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'User-Agent': client.userAgent,
          'X-YouTube-Client-Name': client.clientName === 'ANDROID_VR' ? '28' : '5',
          'X-YouTube-Client-Version': client.clientVersion,
        },
        body: JSON.stringify({
          videoId: cleanVid,
          context: {
            client: {
              clientName: client.clientName,
              clientVersion: client.clientVersion,
              osName: client.osName,
              osVersion: client.osVersion,
              deviceMake: client.deviceMake,
              deviceModel: client.deviceModel,
              ...(client.androidSdkVersion ? { androidSdkVersion: client.androidSdkVersion } : {}),
              hl: 'en',
              gl: 'US',
            },
          },
          contentCheckOk: true,
          racyCheckOk: true,
        }),
        signal: AbortSignal.timeout(3800),
      });

      if (ytRes.ok) {
        const data: any = await ytRes.json();
        const adaptive: any[] = data?.streamingData?.adaptiveFormats || [];
        const formats: any[] = data?.streamingData?.formats || [];
        const audioFormats = [...adaptive, ...formats]
          .filter((f: any) => f?.url && typeof f?.mimeType === 'string' && f.mimeType.startsWith('audio/'))
          .sort((a: any, b: any) => (Number(b.bitrate) || 0) - (Number(a.bitrate) || 0));

        // Prefer audio/mp4 (m4a) first for universal iOS Safari + Android Chrome compatibility, then audio/webm
        const m4aFormat = audioFormats.find((f: any) => f.mimeType.includes('audio/mp4'));
        const bestAudio = m4aFormat || audioFormats[0];
        if (bestAudio?.url) {
          const durSec = Number(data?.videoDetails?.lengthSeconds) || Math.round((Number(bestAudio.approxDurationMs) || 0) / 1000) || 210;
          return {
            audioUrl: `/api/audio/proxy?url=${encodeURIComponent(bestAudio.url)}`,
            duration: durSec,
            source: 'innertube',
          };
        }
      }
    } catch {}
  }

  // 2. Piped & Invidious Audio Stream Mirrors
  const pipedInstances = [
    `https://pipedapi.kavin.rocks/streams/${cleanVid}`,
    `https://api.piped.private.coffee/streams/${cleanVid}`,
    `https://pipedapi.adminforge.de/streams/${cleanVid}`,
  ];

  for (const ep of pipedInstances) {
    try {
      const res = await fetch(ep, {
        headers: { Accept: 'application/json', 'User-Agent': 'EchoMusic/2.0' },
        signal: AbortSignal.timeout(3500),
      });
      if (res.ok) {
        const data: any = await res.json();
        const streams: any[] = Array.isArray(data?.audioStreams) ? data.audioStreams : [];
        if (streams.length > 0) {
          const sorted = [...streams].sort((a, b) => (Number(b.bitrate) || 0) - (Number(a.bitrate) || 0));
          const m4a = sorted.find((s) => String(s.mimeType || '').includes('mp4') || String(s.format || '').includes('M4A'));
          const best = m4a || sorted[0];
          if (best?.url) {
            return {
              audioUrl: best.url,
              duration: Number(data?.duration) || 210,
              source: 'piped',
            };
          }
        }
      }
    } catch {}
  }

  return null;
}

// Byte-Range Audio Stream Proxy for Uninterrupted Mobile Lock-Screen Playback
app.get('/api/audio/proxy', async (req, res) => {
  const targetUrl = (req.query.url as string) || '';
  if (!targetUrl || !/^https?:\/\//i.test(targetUrl)) {
    return res.status(400).end();
  }

  try {
    const forwardHeaders: Record<string, string> = {
      'User-Agent':
        'com.google.android.apps.youtube.vr.oculus/1.65.10 (Linux; U; Android 12L; eureka-user Build/SQ3A.220605.009.A1) gzip',
    };
    if (req.headers.range) {
      forwardHeaders['Range'] = req.headers.range;
    }

    const upstream = await fetch(targetUrl, {
      headers: forwardHeaders,
      signal: AbortSignal.timeout(15000),
    });

    if (!upstream.ok && upstream.status !== 206) {
      return res.status(upstream.status).end();
    }

    res.status(upstream.status);
    const contentType = upstream.headers.get('content-type') || 'audio/mp4';
    const contentLength = upstream.headers.get('content-length');
    const contentRange = upstream.headers.get('content-range');
    const acceptRanges = upstream.headers.get('accept-ranges') || 'bytes';

    res.setHeader('Content-Type', contentType);
    res.setHeader('Accept-Ranges', acceptRanges);
    res.setHeader('Access-Control-Allow-Origin', '*');
    if (contentLength) res.setHeader('Content-Length', contentLength);
    if (contentRange) res.setHeader('Content-Range', contentRange);

    if (upstream.body) {
      const reader = upstream.body.getReader();
      const pump = async () => {
        try {
          while (true) {
            const { done, value } = await reader.read();
            if (done) break;
            if (!res.writableEnded) {
              res.write(Buffer.from(value));
            } else {
              break;
            }
          }
          if (!res.writableEnded) res.end();
        } catch {
          if (!res.writableEnded) res.end();
        }
      };
      req.on('close', () => {
        try {
          reader.cancel();
        } catch {}
      });
      await pump();
    } else {
      res.end();
    }
  } catch {
    if (!res.headersSent) res.status(502).end();
  }
});

// ─── VERIFIED 320KBPS STUDIO MASTER RESOLVER (Global & Regional Full Songs) ───
async function resolveVerifiedSaavnTracks(
  rawQuery: string,
  cleanTitle: string,
  cleanArtist: string,
  limit = 6
): Promise<
  Array<{
    id: string;
    title: string;
    artist: string;
    album: string;
    coverUrl: string;
    audioUrl: string;
    duration: number;
  }>
> {
  const q = rawQuery.trim();
  if (!q) return [];

  const unwantedCoverRegex =
    /\b(?:karaoke|instrumental|originally\s+performed|tribute|ringtone|nightcore|8d\s+audio|sped\s+up|slowed)\b/i;
  const userWantsVariant = unwantedCoverRegex.test(cleanTitle);

  try {
    // Step 1: Query official JioSaavn catalog with Indian edge IP header so global Western & Indian tracks are unlocked
    const officialUrl = `https://www.jiosaavn.com/api.php?__call=search.getResults&_format=json&_marker=0&api_version=4&ctx=web6dot0&n=${Math.max(10, limit * 2)}&p=1&q=${encodeURIComponent(q)}`;
    const searchRes = await fetch(officialUrl, {
      headers: {
        'X-Forwarded-For': '49.36.128.1',
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
        Accept: 'application/json',
      },
      signal: AbortSignal.timeout(4000),
    });

    if (searchRes.ok) {
      const searchJson: any = await searchRes.json();
      const rawResults: any[] = Array.isArray(searchJson?.results) ? searchJson.results : [];

      const norm = (s: string) =>
        (s || '')
          .toLowerCase()
          .replace(/&quot;|&amp;|&#039;/g, ' ')
          .replace(/[^a-z0-9\s]/g, ' ')
          .replace(/\s+/g, ' ')
          .trim();

      const targetTitleNorm = norm(cleanTitle);
      const targetArtistNorm = norm(cleanArtist);
      const artistTokens = targetArtistNorm
        .split(' ')
        .filter((w) => w.length >= 3 && !['the', 'and', 'official', 'music', 'youtube', 'topic', 'vevo'].includes(w));

      const scoredCandidates = rawResults
        .map((item: any) => {
          const itemTitle = String(item?.title || '').replace(/&quot;/g, '"').replace(/&amp;/g, '&');
          const primaryArtists = Array.isArray(item?.more_info?.artistMap?.primary_artists)
            ? item.more_info.artistMap.primary_artists.map((a: any) => a?.name || '').join(', ')
            : String(item?.subtitle || '');
          const combinedMeta = `${itemTitle} ${primaryArtists}`;

          if (!userWantsVariant && unwantedCoverRegex.test(combinedMeta)) {
            return { item, score: -100 };
          }

          const itemTitleNorm = norm(itemTitle);
          const itemArtistNorm = norm(primaryArtists);
          let score = 0;

          if (targetTitleNorm && itemTitleNorm === targetTitleNorm) score += 80;
          else if (
            targetTitleNorm &&
            (itemTitleNorm.includes(targetTitleNorm) || targetTitleNorm.includes(itemTitleNorm))
          ) {
            score += 45;
          } else {
            const titleWords = targetTitleNorm.split(' ').filter((w) => w.length >= 3);
            if (titleWords.length > 0 && titleWords.every((w) => itemTitleNorm.includes(w))) {
              score += 35;
            }
          }

          if (artistTokens.length > 0) {
            const matchedArtist = artistTokens.some((tok) => itemArtistNorm.includes(tok));
            if (matchedArtist) score += 65;
            else score -= 35;
          } else {
            score += 20;
          }

          return { item, score };
        })
        .filter((entry) => entry.score >= 30)
        .sort((a, b) => b.score - a.score)
        .slice(0, limit);

      if (scoredCandidates.length > 0) {
        const ids = scoredCandidates
          .map((c) => c.item?.id)
          .filter(Boolean)
          .join(',');

        const detailRes = await fetch(`https://saavn.sumit.co/api/songs/${encodeURIComponent(ids)}`, {
          headers: { Accept: 'application/json' },
          signal: AbortSignal.timeout(4000),
        });

        if (detailRes.ok) {
          const detailJson: any = await detailRes.json();
          const detailList: any[] = Array.isArray(detailJson?.data) ? detailJson.data : [];
          const resolvedTracks = detailList
            .map((d: any) => {
              const dl: any[] = Array.isArray(d?.downloadUrl) ? d.downloadUrl : [];
              const hq =
                dl.find((x) => x?.quality === '320kbps') ||
                dl.find((x) => x?.quality === '160kbps') ||
                dl[dl.length - 1];
              const audioUrl = hq?.url || hq?.link || '';
              if (!audioUrl) return null;

              const imgs: any[] = Array.isArray(d?.image) ? d.image : [];
              const bestImg = imgs.find((x) => x?.quality === '500x500') || imgs[imgs.length - 1];
              const artists = Array.isArray(d?.artists?.primary)
                ? d.artists.primary.map((a: any) => a?.name).filter(Boolean).join(', ')
                : cleanArtist || 'Featured Artist';

              return {
                id: String(d.id),
                title: String(d.name || cleanTitle).replace(/&quot;/g, '"').replace(/&amp;/g, '&'),
                artist: artists,
                album: String(d?.album?.name || ''),
                coverUrl: bestImg?.url || bestImg?.link || '',
                audioUrl,
                duration: Number(d?.duration) || 210,
              };
            })
            .filter((x): x is NonNullable<typeof x> => Boolean(x));

          if (resolvedTracks.length > 0) {
            return resolvedTracks;
          }
        }
      }
    }
  } catch {}

  return [];
}

// Public Search Endpoint for Verified 320kbps JioSaavn Tracks
app.get('/api/saavn/search', async (req, res) => {
  const query = ((req.query.q as string) || (req.query.query as string) || '').trim();
  const limit = Math.min(parseInt((req.query.limit as string) || '12', 10), 25);
  if (!query) return res.json({ success: true, results: [] });

  const { cleanTitle, cleanArtist } = extractCleanTrackAndArtist(query, '');
  const tracks = await resolveVerifiedSaavnTracks(query, cleanTitle, cleanArtist, limit);
  res.json({ success: true, results: tracks });
});

// Resolve Direct Audio Stream URL for Uninterrupted Native Background Playback
app.get('/api/audio/resolve', async (req, res) => {
  const title = (req.query.title as string) || '';
  const artist = (req.query.artist as string) || '';
  const videoId = (req.query.videoId as string) || '';
  const { cleanTitle, cleanArtist } = extractCleanTrackAndArtist(title, artist);
  const query = `${cleanTitle} ${cleanArtist}`.trim() || `${title} ${artist}`.trim() || videoId;

  if (!query && !videoId) {
    return res.status(400).json({ success: false, error: 'Missing query parameters' });
  }

  const cacheKey = `audio-v2-${query.toLowerCase()}::${videoId}`;
  const cached = audioResolveCache.get(cacheKey);
  if (cached && Date.now() - cached.timestamp < CACHE_TTL_MS) {
    return res.json(cached.data);
  }

  // Tier 1: Verified 320kbps Full-Length Studio Master (JioSaavn Global & Regional Catalog)
  if (cleanTitle) {
    const verifiedSaavn = await resolveVerifiedSaavnTracks(query, cleanTitle, cleanArtist, 3);
    if (verifiedSaavn.length > 0) {
      const best = verifiedSaavn[0];
      const result = {
        success: true,
        audioUrl: best.audioUrl,
        source: 'saavn',
        trackId: best.id,
        duration: best.duration,
      };
      audioResolveCache.set(cacheKey, { timestamp: Date.now(), data: result });
      return res.json(result);
    }
  }

  // Tier 2: Echo-Music InnerTube / Piped Direct YouTube Audio Stream
  if (videoId) {
    const ytStream = await extractYouTubeAudioStream(videoId);
    if (ytStream?.audioUrl) {
      const result = {
        success: true,
        audioUrl: ytStream.audioUrl,
        source: ytStream.source,
        trackId: videoId,
        duration: ytStream.duration || 210,
      };
      audioResolveCache.set(cacheKey, { timestamp: Date.now(), data: result });
      return res.json(result);
    }
  }

  // Tier 3: Audius Decentralized Hi-Fi Network (ONLY if both title AND artist match so we never swap to a random remix)
  try {
    const searchUrl = `https://api.audius.co/v1/tracks/search?query=${encodeURIComponent(query)}&app_name=${encodeURIComponent(AUDIUS_APP_NAME)}&limit=5`;
    const audiusRes = await fetch(searchUrl, { signal: AbortSignal.timeout(3500) });
    if (audiusRes.ok) {
      const json = await audiusRes.json();
      const tracks = json.data || [];
      if (tracks.length > 0 && cleanTitle && cleanArtist) {
        const normTitle = cleanTitle.toLowerCase().replace(/[^a-z0-9]/g, '');
        const normArtist = cleanArtist.toLowerCase().replace(/[^a-z0-9]/g, '');
        const exactMatch = tracks.find((t: any) => {
          const tTitle = String(t?.title || '').toLowerCase().replace(/[^a-z0-9]/g, '');
          const tArtist = String(t?.user?.name || t?.user?.handle || '')
            .toLowerCase()
            .replace(/[^a-z0-9]/g, '');
          return (
            tTitle &&
            tArtist &&
            (tTitle === normTitle || tTitle.includes(normTitle)) &&
            (tArtist.includes(normArtist) || normArtist.includes(tArtist))
          );
        });

        if (exactMatch && Number(exactMatch.duration) >= 60) {
          const streamUrl = `https://api.audius.co/v1/tracks/${exactMatch.id}/stream?app_name=${encodeURIComponent(AUDIUS_APP_NAME)}`;
          const result = {
            success: true,
            audioUrl: streamUrl,
            source: 'audius',
            trackId: exactMatch.id,
            duration: Number(exactMatch.duration) || 210,
          };
          audioResolveCache.set(cacheKey, { timestamp: Date.now(), data: result });
          return res.json(result);
        }
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
