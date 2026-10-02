import { sanitizeCoverUrl, getFallbackCoverUrl } from '../services/musicService';
import { AUDIUS_APP_NAME } from '../config/env';

export const firstNonEmptyString = (...values) => {
  for (const value of values) {
    if (typeof value === 'string' && value.trim()) return value.trim();
  }
  return '';
};

export const normalizeSong = (song = {}, index = 0) => {
  const normalizedId = firstNonEmptyString(song.id, song._id, song.songId) || `song-${index}`;
  const audiusId = firstNonEmptyString(
    song.audiusId,
    String(normalizedId).startsWith('audius-') ? String(normalizedId).replace(/^audius-/, '') : ''
  );

  let audioUrl = firstNonEmptyString(song.audioUrl, song.directStreamUrl, song.audio, song.songUrl, song.url);
  // Strip 30-second iTunes previews so the player resolves full-length 320kbps streams instead
  if (
    audioUrl &&
    (audioUrl.includes('audio-ssl.itunes.apple.com') ||
      audioUrl.includes('itunes.apple.com') ||
      audioUrl.includes('preview.saavncdn.com'))
  ) {
    audioUrl = '';
  }
  if (!audioUrl && audiusId) {
    audioUrl = `https://api.audius.co/v1/tracks/${audiusId}/stream?app_name=${AUDIUS_APP_NAME}`;
  }

  const videoId =
    song.videoId ||
    song.youtubeId ||
    (String(normalizedId).startsWith('yt-') ? String(normalizedId).replace(/^yt-/, '') : undefined);

  const isPodcast = Boolean(song.isPodcast || song.source === 'podcast' || song.seriesId);
  const isYouTube =
    !isPodcast &&
    (song.source === 'youtube' ||
      String(normalizedId).startsWith('yt-') ||
      Boolean(song.youtubeId) ||
      Boolean(song.videoId) ||
      (!audioUrl && Boolean(videoId)));
  const isSaavn = song.source === 'saavn' || String(normalizedId).startsWith('saavn-');
  const isInvidious = song.source === 'invidious' || song.source === 'piped' || String(normalizedId).startsWith('invidious-');
  const isJamendo = song.source === 'jamendo' || String(normalizedId).startsWith('jamendo-');
  const source = isPodcast
    ? 'podcast'
    : (isYouTube || (Boolean(videoId) && !audioUrl))
      ? 'youtube'
      : song.source ||
        (isSaavn ? 'saavn' : isInvidious ? 'invidious' : isJamendo ? 'jamendo' : audiusId ? 'audius' : String(normalizedId).startsWith('global-') ? 'global' : 'local');
  const duration = typeof song.duration === 'number' ? song.duration : 0;
  const isFullSong = true;
  const bitrate =
    song.bitrate ||
    (source === 'youtube'
      ? 'YouTube Free HD'
      : source === 'saavn' || source === 'jamendo'
      ? '320 kbps HD'
      : source === 'invidious'
      ? 'Universal HD Stream'
      : source === 'local'
      ? 'Lossless Master'
      : source === 'audius'
      ? 'Hi-Fi Audio'
      : '320 kbps Master');

  const title = firstNonEmptyString(song.title, song.name, song.trackName) || 'Untitled Track';
  const artist = firstNonEmptyString(song.artist, song.singer, song.author) || 'Unknown Artist';
  const singers = firstNonEmptyString(song.singers, song.singer, song.artist) || artist;
  const rawCover = firstNonEmptyString(song.coverUrl, song.cover, song.coverImage, song.image, song.thumbnail);
  const coverUrl = sanitizeCoverUrl(rawCover, {
    id: normalizedId,
    title,
    artist,
    singers,
    videoId,
    youtubeId: videoId,
  });

  return {
    ...song,
    id: normalizedId,
    videoId: videoId || undefined,
    youtubeId: videoId || undefined,
    audiusId: audiusId || undefined,
    globalId: song.globalId || undefined,
    title,
    artist,
    singers,
    coverUrl,
    audioUrl: audioUrl || '',
    duration,
    genre: song.genre || song.category || 'Music',
    category: song.category || song.genre || 'Trending',
    playCount: song.playCount || song.play_count || 0,
    favoriteCount: song.favoriteCount || song.favorite_count || 0,
    source,
    isFullSong,
    bitrate,
  };
};

export const mediaUrl = (url, song) => {
  return sanitizeCoverUrl(url, song);
};

export const audioStreamUrl = (url) => {
  if (!url || typeof url !== 'string') return '';
  const clean = url.trim();
  if (!clean || clean === 'null' || clean === 'undefined') return '';
  if (clean.startsWith('//')) return 'https:' + clean;
  if (clean.startsWith('http://')) return clean.replace(/^http:\/\//i, 'https://');
  return clean;
};

export const handleCoverImageError = (e, song) => {
  const target = e.currentTarget;
  if (!target.dataset.fallbackApplied) {
    target.dataset.fallbackApplied = 'true';
    target.src = getFallbackCoverUrl(song);
  }
};

export const formatTime = (seconds) => {
  if (!seconds || isNaN(seconds) || seconds < 0) return '0:00';
  const mins = Math.floor(seconds / 60);
  const secs = Math.floor(seconds % 60);
  return `${mins}:${secs.toString().padStart(2, '0')}`;
};

export const formatNumber = (num) => {
  if (!num || isNaN(num)) return '0';
  if (num >= 1_000_000) return `${(num / 1_000_000).toFixed(1)}M`;
  if (num >= 1_000) return `${(num / 1_000).toFixed(1)}k`;
  return String(num);
};
