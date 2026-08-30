const express = require('express');
const crypto = require('crypto');
const fs = require('fs');
const path = require('path');
const { requireAuth } = require('../middleware/auth');
const { upload } = require('../middleware/upload');
const { readSongs, writeSongs } = require('../utils/songs');
const { normalizeMediaUrl, isAllowedMediaUrl } = require('../utils/media');
const { normalizeCategory } = require('../utils/category');
const { removeLocalFile } = require('../utils/storage');
const {
  AUDIUS_GENRES,
  getTrendingTracks,
  searchTracks,
  getTrackById,
  getTrendingPlaylists,
  FALLBACK_TRENDING_TRACKS,
  FALLBACK_PLAYLISTS,
} = require('../utils/audius');
const {
  searchUniversalMusic,
  searchGlobalCatalog,
} = require('../utils/universalMusic');
const { ROOT_DIR } = require('../config/env');

const router = express.Router();

const DEFAULT_PAGE_SIZE = 40;
const MAX_PAGE_SIZE = 100;

// GET available Audius genres
router.get('/audius/genres', (req, res) => {
  res.json({ genres: AUDIUS_GENRES });
});

// GET trending tracks from Audius API
router.get('/audius/trending', async (req, res) => {
  const genre = req.query.genre || req.query.category;
  const time = req.query.time || 'week';
  const limit = Math.min(MAX_PAGE_SIZE, Math.max(1, parseInt(req.query.limit, 10) || 40));
  const offset = Math.max(0, parseInt(req.query.offset, 10) || 0);

  try {
    const tracks = await getTrendingTracks({ genre, time, limit, offset });
    res.setHeader('Cache-Control', 'public, max-age=120, stale-while-revalidate=300');
    res.json({
      tracks: tracks && tracks.length > 0 ? tracks : FALLBACK_TRENDING_TRACKS,
      total: tracks ? tracks.length : FALLBACK_TRENDING_TRACKS.length,
      genre: genre || 'All',
      time,
    });
  } catch (err) {
    console.warn('Recovered from Audius trending error with fallback tracks:', err.message);
    res.setHeader('Cache-Control', 'public, max-age=60');
    res.json({
      tracks: FALLBACK_TRENDING_TRACKS,
      total: FALLBACK_TRENDING_TRACKS.length,
      genre: genre || 'All',
      time,
      fallback: true,
    });
  }
});

// Search tracks across universal music catalog (Bollywood, International, Indie & Audius)
router.get(['/search', '/audius/search'], async (req, res) => {
  try {
    const query = req.query.q || req.query.query || req.query.search || '';
    const genre = req.query.genre;
    const limit = Math.min(MAX_PAGE_SIZE, Math.max(1, parseInt(req.query.limit, 10) || 50));
    const offset = Math.max(0, parseInt(req.query.offset, 10) || 0);

    if (!query.trim()) {
      const tracks = await getTrendingTracks({ genre, limit, offset });
      res.setHeader('Cache-Control', 'public, max-age=120, stale-while-revalidate=300');
      return res.json({
        tracks,
        songs: tracks,
        total: tracks.length,
        query: '',
      });
    }

    // 1. Search local songs
    let localMatches = [];
    try {
      const localSongs = readSongs();
      const qLower = query.toLowerCase();
      localMatches = localSongs
        .filter(
          (s) =>
            s.title?.toLowerCase().includes(qLower) ||
            s.artist?.toLowerCase().includes(qLower) ||
            s.singers?.toLowerCase().includes(qLower)
        )
        .map((s) => ({
          ...s,
          coverUrl: normalizeMediaUrl(s.coverUrl),
          audioUrl: normalizeMediaUrl(s.audioUrl),
          source: 'local',
        }));
    } catch {
      localMatches = [];
    }

    // 2. Search universal catalog (Bollywood + International + Audius)
    const universalMatches = await searchUniversalMusic({
      query,
      genre,
      limit,
      offset,
    });

    const combinedTracks = [...localMatches, ...universalMatches];

    res.setHeader('Cache-Control', 'public, max-age=300, stale-while-revalidate=600');
    res.json({
      tracks: combinedTracks,
      songs: combinedTracks,
      total: combinedTracks.length,
      query,
    });
  } catch (err) {
    console.error('Failed to search universal tracks:', err.message);
    res.status(500).json({ error: 'Failed to search tracks' });
  }
});

// GET trending curated playlists from Audius
router.get('/audius/playlists', async (req, res) => {
  const limit = Math.min(50, Math.max(1, parseInt(req.query.limit, 10) || 20));
  try {
    const playlists = await getTrendingPlaylists({ limit });
    res.json({
      playlists: playlists && playlists.length > 0 ? playlists : FALLBACK_PLAYLISTS,
      total: playlists ? playlists.length : FALLBACK_PLAYLISTS.length,
    });
  } catch (err) {
    console.warn('Recovered from Audius playlists error with fallback:', err.message);
    res.json({ playlists: FALLBACK_PLAYLISTS, total: FALLBACK_PLAYLISTS.length, fallback: true });
  }
});

// Stream redirect endpoint for Audius tracks
router.get('/stream/:id', (req, res) => {
  const cleanId = String(req.params.id).replace(/^audius-/, '');
  const streamUrl = `https://api.audius.co/v1/tracks/${cleanId}/stream?app_name=AZAAD_MUSIC_PLAYER`;
  return res.redirect(302, streamUrl);
});

// GET main songs list (combining Audius tracks and local/uploaded tracks)
router.get('/', async (req, res) => {
  try {
    const query = (req.query.search || req.query.query || req.query.q || '').trim();
    const genre = (req.query.genre || req.query.category || '').trim();
    const source = req.query.source || 'all'; // 'all', 'audius', 'local'
    const page = Math.max(1, parseInt(req.query.page, 10) || 1);
    const limit = Math.min(
      MAX_PAGE_SIZE,
      Math.max(1, parseInt(req.query.limit, 10) || DEFAULT_PAGE_SIZE)
    );

    // 1. Fetch local songs
    const localSongs = readSongs();

    const normalizedLocalSongs = localSongs.map((song) => ({
      ...song,
      coverUrl: normalizeMediaUrl(song.coverUrl),
      audioUrl: normalizeMediaUrl(song.audioUrl),
      source: 'local',
    }));

    let catalogSongs = [];
    if (source !== 'local') {
      try {
        if (query) {
          catalogSongs = await searchUniversalMusic({ query, genre, limit: limit * 2 });
        } else {
          catalogSongs = await getTrendingTracks({ genre, limit });
        }
      } catch (err) {
        console.warn('Catalog fetch warning in /api/songs:', err.message);
        catalogSongs = [];
      }
    }

    // Filter local songs by query if provided
    let filteredLocalSongs = normalizedLocalSongs;
    if (query) {
      const qLower = query.toLowerCase();
      filteredLocalSongs = filteredLocalSongs.filter(
        (s) =>
          s.title?.toLowerCase().includes(qLower) ||
          s.artist?.toLowerCase().includes(qLower) ||
          s.singers?.toLowerCase().includes(qLower) ||
          s.genre?.toLowerCase().includes(qLower) ||
          s.category?.toLowerCase().includes(qLower)
      );
    }

    // Merge: local songs first, followed by catalog songs
    let allSongs = [];
    if (source === 'local') {
      allSongs = filteredLocalSongs;
    } else if (source === 'audius') {
      allSongs = catalogSongs;
    } else {
      allSongs = [...filteredLocalSongs, ...catalogSongs];
    }

    // Filter by genre/category if specified and not 'All'
    if (genre && genre !== 'All') {
      const gLower = genre.toLowerCase();
      allSongs = allSongs.filter(
        (s) =>
          s.genre?.toLowerCase() === gLower ||
          s.category?.toLowerCase() === gLower
      );
    }

    const offset = (page - 1) * limit;
    const paginatedSongs = allSongs.slice(offset, offset + limit);

    res.json({
      songs: paginatedSongs,
      pagination: {
        page,
        limit,
        total: allSongs.length,
        totalPages: Math.ceil(allSongs.length / limit) || 1,
      },
      sources: {
        localCount: normalizedLocalSongs.length,
        audiusCount: audiusSongs.length,
      },
    });
  } catch (err) {
    console.error('Error in GET /api/songs:', err);
    res.status(500).json({ error: 'Failed to retrieve songs' });
  }
});

// GET single song by ID
router.get('/:id', async (req, res) => {
  try {
    const { id } = req.params;
    if (id.startsWith('audius-') || /^[a-zA-Z0-9_-]{5,}$/.test(id)) {
      const audiusTrack = await getTrackById(id);
      if (audiusTrack) {
        return res.json(audiusTrack);
      }
    }

    const songs = readSongs();
    const song = songs.find((s) => s.id === id);
    if (!song) {
      return res.status(404).json({ error: 'Song not found' });
    }

    return res.json({
      ...song,
      coverUrl: normalizeMediaUrl(song.coverUrl),
      audioUrl: normalizeMediaUrl(song.audioUrl),
      source: 'local',
    });
  } catch (err) {
    return res.status(500).json({ error: err.message });
  }
});

router.post(
  '/',
  requireAuth,
  upload.fields([
    { name: 'audio', maxCount: 1 },
    { name: 'cover', maxCount: 1 },
  ]),
  async (req, res) => {
    try {
      const songs = readSongs();

      const {
        title,
        artist,
        category,
        featured,
        trending,
        audioUrl,
        coverUrl,
        genre,
        singers,
        type,
        vibe,
      } = req.body;
      const audioFile = req.files?.audio?.[0];
      const coverFile = req.files?.cover?.[0];
      const sanitizedAudioUrl = audioUrl ? String(audioUrl).trim() : '';
      const sanitizedCoverUrl = coverUrl ? String(coverUrl).trim() : '';
      const hasAudioSource = Boolean(audioFile) || Boolean(sanitizedAudioUrl);
      const hasCoverSource = Boolean(coverFile) || Boolean(sanitizedCoverUrl);

      if (!title || !artist || !hasAudioSource || !hasCoverSource) {
        return res.status(400).json({
          error:
            'title, artist, plus audio and cover (file or URL) are required',
        });
      }

      if (sanitizedAudioUrl && !isAllowedMediaUrl(sanitizedAudioUrl)) {
        return res
          .status(400)
          .json({ error: 'audioUrl must be a valid http(s) or s3:// URL' });
      }

      if (sanitizedCoverUrl && !isAllowedMediaUrl(sanitizedCoverUrl)) {
        return res
          .status(400)
          .json({ error: 'coverUrl must be a valid http(s) or s3:// URL' });
      }

      const songId = crypto.randomUUID();
      const ts = Date.now();

      let resolvedAudioUrl = sanitizedAudioUrl
        ? normalizeMediaUrl(sanitizedAudioUrl)
        : null;
      let resolvedCoverUrl = sanitizedCoverUrl
        ? normalizeMediaUrl(sanitizedCoverUrl)
        : null;

      if (audioFile) {
        resolvedAudioUrl = `/uploads/audio/${audioFile.filename}`;
      }

      if (coverFile) {
        resolvedCoverUrl = `/uploads/covers/${coverFile.filename}`;
      }

      const newSong = {
        id: songId,
        title: String(title).trim(),
        artist: String(artist).trim(),
        category: normalizeCategory(category),
        genre: genre ? String(genre).trim() : '',
        singers: singers ? String(singers).trim() : String(artist).trim(),
        type: type ? String(type).trim() : '',
        vibe: vibe ? String(vibe).trim() : '',
        featured: featured === 'true' || featured === true,
        trending: trending === 'true' || trending === true,
        coverUrl: resolvedCoverUrl,
        audioUrl: resolvedAudioUrl,
        createdAt: new Date().toISOString(),
      };

      songs.unshift(newSong);
      writeSongs(songs);

      return res.status(201).json(newSong);
    } catch (error) {
      console.error('Song creation failed:', error);
      return res.status(500).json({ error: 'Upload failed' });
    }
  }
);

router.put('/:id', requireAuth, (req, res) => {
  try {
    const songs = readSongs();
    const index = songs.findIndex((song) => song.id === req.params.id);

    if (index === -1) {
      return res.status(404).json({ error: 'Song not found' });
    }

    const currentSong = songs[index];
    const title =
      typeof req.body.title === 'string'
        ? req.body.title.trim()
        : currentSong.title;
    const artist =
      typeof req.body.artist === 'string'
        ? req.body.artist.trim()
        : currentSong.artist;
    const category =
      typeof req.body.category === 'string'
        ? normalizeCategory(req.body.category)
        : currentSong.category || 'Other';
    const genre =
      typeof req.body.genre === 'string'
        ? req.body.genre.trim()
        : currentSong.genre || '';
    const singers =
      typeof req.body.singers === 'string'
        ? req.body.singers.trim()
        : currentSong.singers || currentSong.artist;
    const type =
      typeof req.body.type === 'string'
        ? req.body.type.trim()
        : currentSong.type || '';
    const vibe =
      typeof req.body.vibe === 'string'
        ? req.body.vibe.trim()
        : currentSong.vibe || '';

    const parseFeaturedTrending = (value, fallback) => {
      if (typeof value === 'boolean') return value;
      if (value === 'true') return true;
      if (value === 'false') return false;
      return fallback;
    };

    const featured = parseFeaturedTrending(
      req.body.featured,
      currentSong.featured
    );
    const trending = parseFeaturedTrending(
      req.body.trending,
      currentSong.trending
    );

    const coverUrl =
      typeof req.body.coverUrl === 'string'
        ? req.body.coverUrl.trim()
        : currentSong.coverUrl;
    const audioUrl =
      typeof req.body.audioUrl === 'string'
        ? req.body.audioUrl.trim()
        : currentSong.audioUrl;

    if (!title || !artist) {
      return res
        .status(400)
        .json({ error: 'title and artist are required' });
    }

    if (
      audioUrl &&
      !audioUrl.startsWith('/uploads/') &&
      !isAllowedMediaUrl(audioUrl)
    ) {
      return res.status(400).json({
        error:
          'audioUrl must be a valid http(s), s3:// URL, or local upload path',
      });
    }

    if (
      coverUrl &&
      !coverUrl.startsWith('/uploads/') &&
      !isAllowedMediaUrl(coverUrl)
    ) {
      return res.status(400).json({
        error:
          'coverUrl must be a valid http(s), s3:// URL, or local upload path',
      });
    }

    const updatedSong = {
      ...currentSong,
      title,
      artist,
      category: category || 'Other',
      genre,
      singers,
      type,
      vibe,
      featured,
      trending,
      coverUrl: coverUrl ? normalizeMediaUrl(coverUrl) : currentSong.coverUrl,
      audioUrl: audioUrl ? normalizeMediaUrl(audioUrl) : currentSong.audioUrl,
    };

    songs[index] = updatedSong;
    writeSongs(songs);
    return res.json(updatedSong);
  } catch (error) {
    console.error('Song update failed:', error);
    return res.status(500).json({ error: 'Update failed' });
  }
});

router.delete('/:id', requireAuth, (req, res) => {
  try {
    const songs = readSongs();
    const index = songs.findIndex((song) => song.id === req.params.id);

    if (index === -1) {
      return res.status(404).json({ error: 'Song not found' });
    }

    const removed = songs[index];
    songs.splice(index, 1);

    const removeIfLocal = (relativeUrl) => {
      if (!relativeUrl || typeof relativeUrl !== 'string') return;
      if (!relativeUrl.startsWith('/uploads/')) return;
      const safePath = path.normalize(relativeUrl).replace(/^\//, '');
      if (!safePath.startsWith('uploads/')) return;
      const fullPath = path.join(ROOT_DIR, safePath);
      if (fs.existsSync(fullPath)) {
        fs.unlinkSync(fullPath);
      }
    };

    removeIfLocal(removed.coverUrl);
    removeIfLocal(removed.audioUrl);

    writeSongs(songs);
    return res.json({ success: true, removed });
  } catch (error) {
    console.error('Song deletion failed:', error);
    return res.status(500).json({ error: 'Delete failed' });
  }
});

module.exports = router;
