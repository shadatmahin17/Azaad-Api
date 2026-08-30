const https = require('https');
const CryptoJS = require('crypto-js');
const { searchTracks: searchAudiusTracks } = require('./audius');

// High-performance HTTP Keep-Alive Agent for connection reuse
const httpsAgent = new https.Agent({
  keepAlive: true,
  maxSockets: 64,
  maxFreeSockets: 16,
  timeout: 60000,
  keepAliveMsecs: 30000,
});

// Fast In-Memory LRU Cache with TTL (Time To Live)
class MemoryCache {
  constructor(maxSize = 300, ttlMs = 15 * 60 * 1000) {
    this.maxSize = maxSize;
    this.ttlMs = ttlMs;
    this.cache = new Map();
  }

  get(key) {
    const entry = this.cache.get(key);
    if (!entry) return null;
    if (Date.now() > entry.expiry) {
      this.cache.delete(key);
      return null;
    }
    // Refresh LRU position
    this.cache.delete(key);
    this.cache.set(key, entry);
    return entry.value;
  }

  set(key, value) {
    if (this.cache.has(key)) {
      this.cache.delete(key);
    } else if (this.cache.size >= this.maxSize) {
      // Evict oldest item
      const firstKey = this.cache.keys().next().value;
      if (firstKey) this.cache.delete(firstKey);
    }
    this.cache.set(key, {
      value,
      expiry: Date.now() + this.ttlMs,
    });
  }

  clear() {
    this.cache.clear();
  }
}

const searchCache = new MemoryCache(300, 15 * 60 * 1000); // 15 min cache for searches

/**
 * Fetch JSON from HTTPS endpoint with timeout, connection reuse, and proper User-Agent
 */
function fetchHttpsJson(url, timeoutMs = 5000) {
  return new Promise((resolve) => {
    const req = https.get(
      url,
      {
        agent: httpsAgent,
        headers: {
          'User-Agent':
            'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
          Accept: 'application/json',
        },
        timeout: timeoutMs,
      },
      (res) => {
        let body = '';
        res.on('data', (chunk) => (body += chunk));
        res.on('end', () => {
          try {
            resolve(JSON.parse(body));
          } catch {
            resolve(null);
          }
        });
      }
    );
    req.on('error', () => resolve(null));
    req.on('timeout', () => {
      req.destroy();
      resolve(null);
    });
  });
}

/**
 * Fast decrypt JioSaavn DES-ECB encrypted media URL to direct 320kbps CDN stream
 */
const keyParsed = CryptoJS.enc.Utf8.parse('38346591');
function decryptSaavnUrl(encrypted) {
  if (!encrypted || typeof encrypted !== 'string') return null;
  try {
    const decrypted = CryptoJS.DES.decrypt(
      { ciphertext: CryptoJS.enc.Base64.parse(encrypted) },
      keyParsed,
      { mode: CryptoJS.mode.ECB, padding: CryptoJS.pad.Pkcs7 }
    );
    let url = decrypted.toString(CryptoJS.enc.Utf8);
    if (url && url.includes('.mp4')) {
      url = url.replace('_96.mp4', '_320.mp4').replace('_160.mp4', '_320.mp4');
    }
    return url || null;
  } catch {
    return null;
  }
}

/**
 * Clean and unescape HTML strings from API results
 */
function cleanText(str) {
  if (!str) return '';
  return String(str)
    .replace(/&quot;/g, '"')
    .replace(/&#039;/g, "'")
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .trim();
}

/**
 * Search JioSaavn for 100% Full-Length Songs (320kbps / 160kbps CDN stream)
 */
async function searchSaavnSongs(query, limit = 30) {
  if (!query || !query.trim()) return [];
  const cleanQuery = query.trim();
  const cacheKey = `saavn:${cleanQuery.toLowerCase()}:${limit}`;
  const cached = searchCache.get(cacheKey);
  if (cached) return cached;

  const url = `https://www.jiosaavn.com/api.php?__call=search.getResults&_format=json&n=${limit}&p=1&_marker=0&ctx=web6dot0&q=${encodeURIComponent(
    cleanQuery
  )}`;

  try {
    const data = await fetchHttpsJson(url, 4500);
    if (!data || !data.results || !Array.isArray(data.results)) return [];

    const tracks = [];
    for (const item of data.results) {
      const enc = item.more_info?.encrypted_media_url || item.encrypted_media_url;
      const audioUrl = enc ? decryptSaavnUrl(enc) : null;
      if (!audioUrl) continue;

      const title = cleanText(item.song || item.title || 'Untitled Track');
      const artist = cleanText(
        item.more_info?.singers ||
          item.singers ||
          item.more_info?.primary_artists ||
          item.primary_artists ||
          'Unknown Artist'
      );
      const album = cleanText(item.album || item.more_info?.album || '');
      const cover = (item.image || '')
        .replace('150x150', '500x500')
        .replace('50x50', '500x500');
      const duration = parseInt(item.more_info?.duration || item.duration || 210, 10);

      const isBollywood =
        /bollywood|hindi|punjabi|tamil|telugu|bhojpuri|sufi|ghazal|marathi|gujarati|bengali/i.test(
          item.more_info?.language || ''
        ) ||
        /atif aslam|arijit singh|shreya ghoshal|sachin-jigar|pritam|badshah|honey singh|kumar sanu|neha kakkar|jubin nautiyal|alka yagnik|udit narayan|sonu nigam|kk|sunidhi chauhan|mohd\. rafi|lata mangeshkar|kishore kumar|anirudh|ar rahman/i.test(
          `${title} ${artist} ${album}`
        );

      tracks.push({
        id: `saavn-${item.id || Math.random().toString(36).slice(2)}`,
        globalId: item.id || '',
        title,
        artist,
        singers: artist,
        album,
        category: isBollywood ? 'Bollywood' : 'Pop',
        genre: item.more_info?.language || (isBollywood ? 'Bollywood' : 'Music'),
        coverUrl:
          cover ||
          'https://images.unsplash.com/photo-1511671782779-c97d3d27a1d4?w=600&q=80',
        audioUrl,
        duration,
        playCount:
          (item.play_count ? parseInt(item.play_count, 10) : 15000) +
          Math.floor(Math.random() * 5000),
        favoriteCount: Math.floor(Math.random() * 800) + 200,
        type: 'Track',
        vibe: isBollywood ? 'Bollywood Full Track' : 'Full Song',
        featured: true,
        trending: true,
        source: 'saavn',
        isFullSong: true,
      });
    }

    searchCache.set(cacheKey, tracks);
    return tracks;
  } catch (err) {
    console.warn('JioSaavn search error:', err.message);
    return [];
  }
}

/**
 * Search global catalog (iTunes) as backup metadata/preview
 */
async function searchGlobalCatalog(query, limit = 30) {
  if (!query || !query.trim()) return [];
  const cleanQuery = query.trim();
  const cacheKey = `itunes:${cleanQuery.toLowerCase()}:${limit}`;
  const cached = searchCache.get(cacheKey);
  if (cached) return cached;

  const url = `https://itunes.apple.com/search?term=${encodeURIComponent(
    cleanQuery
  )}&entity=song&limit=${limit}`;

  try {
    const data = await fetchHttpsJson(url, 4000);
    if (!data || !data.results || !Array.isArray(data.results)) return [];

    const tracks = data.results
      .filter((item) => item && (item.previewUrl || item.trackViewUrl))
      .map((item, idx) => {
        const cover = (
          item.artworkUrl100 ||
          item.artworkUrl60 ||
          item.artworkUrl30 ||
          ''
        )
          .replace('100x100bb.jpg', '600x600bb.jpg')
          .replace('100x100bb.png', '600x600bb.png');

        const isBollywood =
          /bollywood|indian|hindi|punjabi|tamil|telugu|bhojpuri|sufi|ghazal/i.test(
            item.primaryGenreName || ''
          ) ||
          /atif aslam|arijit singh|shreya ghoshal|sachin-jigar|pritam|badshah|honey singh|kumar sanu|neha kakkar|jubin nautiyal|alka yagnik|udit narayan|sonu nigam|kk|sunidhi chauhan|mohd\. rafi|lata mangeshkar|kishore kumar|anirudh|ar rahman/i.test(
            `${item.artistName || ''} ${item.collectionName || ''} ${
              item.trackName || ''
            }`
          );

        const category = isBollywood
          ? 'Bollywood'
          : item.primaryGenreName || 'Pop';

        return {
          id: `global-${item.trackId || idx}`,
          globalId: String(item.trackId || idx),
          title: item.trackName || 'Untitled Track',
          artist: item.artistName || 'Unknown Artist',
          singers: item.artistName || 'Unknown Artist',
          album: item.collectionName || '',
          category,
          genre: item.primaryGenreName || (isBollywood ? 'Bollywood' : 'Music'),
          coverUrl:
            cover ||
            'https://images.unsplash.com/photo-1511671782779-c97d3d27a1d4?w=600&q=80',
          audioUrl: item.previewUrl || '',
          duration: item.trackTimeMillis
            ? Math.round(item.trackTimeMillis / 1000)
            : 180,
          playCount: (item.trackNumber || 1) * 1200 + 750,
          favoriteCount: Math.floor(Math.random() * 300) + 80,
          type: 'Track',
          vibe: isBollywood
            ? 'Bollywood Romantic'
            : item.primaryGenreName || 'Trending',
          featured: true,
          trending: true,
          source: 'global',
          isFullSong: false,
          releaseDate: item.releaseDate,
        };
      });

    searchCache.set(cacheKey, tracks);
    return tracks;
  } catch (err) {
    console.warn('Global catalog search error:', err.message);
    return [];
  }
}

/**
 * Universal Multi-Engine Search with Parallel Execution & Caching
 */
async function searchUniversalMusic({ query, genre, limit = 50, offset = 0 }) {
  if (!query || !query.trim()) return [];
  const cleanQuery = query.trim();
  const cacheKey = `universal:${cleanQuery.toLowerCase()}:${genre || 'all'}:${limit}:${offset}`;
  const cached = searchCache.get(cacheKey);
  if (cached) return cached;

  // Search full-song engines in parallel with timeout racing
  const [saavnResults, audiusResults, globalResults] = await Promise.all([
    searchSaavnSongs(cleanQuery, limit).catch(() => []),
    searchAudiusTracks({ query: cleanQuery, genre, limit }).catch(() => []),
    searchGlobalCatalog(cleanQuery, Math.min(20, limit)).catch(() => []),
  ]);

  const combined = [];
  const seenKeys = new Set();

  // 1. Prioritize JioSaavn FULL SONGS (100% full duration 3-7 mins)
  for (const track of saavnResults) {
    const key = `${track.title.toLowerCase()}:::${track.artist.toLowerCase()}`;
    if (!seenKeys.has(key)) {
      seenKeys.add(key);
      combined.push(track);
    }
  }

  // 2. Add Audius FULL SONGS (100% full duration)
  for (const track of audiusResults) {
    const key = `${track.title.toLowerCase()}:::${track.artist.toLowerCase()}`;
    if (!seenKeys.has(key)) {
      seenKeys.add(key);
      combined.push(track);
    }
  }

  // 3. Add global catalog items
  for (const track of globalResults) {
    const key = `${track.title.toLowerCase()}:::${track.artist.toLowerCase()}`;
    if (!seenKeys.has(key)) {
      seenKeys.add(key);
      combined.push(track);
    }
  }

  // Fallback: If query has multiple words and results are small, run fast fuzzy search
  if (combined.length < 3 && cleanQuery.includes(' ')) {
    const words = cleanQuery.split(/\s+/).filter((w) => w.length > 2);
    if (words.length > 0) {
      const fallbackQuery = words[0];
      const [fallbackSaavn, fallbackAudius] = await Promise.all([
        searchSaavnSongs(fallbackQuery, 10).catch(() => []),
        searchAudiusTracks({ query: fallbackQuery, genre, limit: 10 }).catch(
          () => []
        ),
      ]);

      for (const track of [...fallbackSaavn, ...fallbackAudius]) {
        const key = `${track.title.toLowerCase()}:::${track.artist.toLowerCase()}`;
        if (!seenKeys.has(key)) {
          seenKeys.add(key);
          combined.push(track);
        }
      }
    }
  }

  const finalResults = combined.slice(offset, offset + limit);
  searchCache.set(cacheKey, finalResults);
  return finalResults;
}

module.exports = {
  searchSaavnSongs,
  searchGlobalCatalog,
  searchUniversalMusic,
  searchCache,
};
