import React, { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import {
  Play,
  Pause,
  SkipBack,
  SkipForward,
  SpeakerHigh,
  SpeakerLow,
  SpeakerSlash,
  Repeat,
  RepeatOnce,
  Shuffle,
  Sparkle,
  CornersOut,
  YoutubeLogo,
  X,
  Waveform,
  ArrowCounterClockwise,
  ArrowClockwise,
  Gauge,
  BookOpenText,
  Microphone,
  ArrowsOutSimple,
  ArrowsInSimple,
} from '@phosphor-icons/react';
import MusicPlayerPage from './MusicPlayerPage';
import { mediaUrl, handleCoverImageError, formatTime } from '../utils/musicUtils';
import {
  resolveYouTubeVideoId,
  resolveYouTubeCandidates,
  resolveAudioStream,
} from '../services/musicService';
import { LikeHeartButton } from './SongCard';

const PODCAST_PROGRESS_KEY = 'azaad_podcast_progress_v1';

function getSavedPodcastTime(episodeId) {
  if (!episodeId || typeof window === 'undefined') return 0;
  try {
    const raw = localStorage.getItem(PODCAST_PROGRESS_KEY);
    if (!raw) return 0;
    const map = JSON.parse(raw);
    const entry = map?.[episodeId];
    if (entry && typeof entry.time === 'number' && entry.time > 10) {
      if (entry.duration && entry.time >= entry.duration - 15) return 0;
      return entry.time;
    }
  } catch {}
  return 0;
}

function savePodcastTime(episodeId, time, duration) {
  if (!episodeId || typeof window === 'undefined' || typeof time !== 'number' || time < 5) return;
  try {
    const raw = localStorage.getItem(PODCAST_PROGRESS_KEY);
    const map = raw ? JSON.parse(raw) : {};
    map[episodeId] = {
      time: Math.floor(time),
      duration: Math.floor(duration || 0),
      updatedAt: Date.now(),
    };
    localStorage.setItem(PODCAST_PROGRESS_KEY, JSON.stringify(map));
  } catch {}
}

function PlayerBar({
  song,
  songs,
  onChangeSong,
  hasBottomNav,
  favorites = [],
  onToggleFavorite,
  onPlayStateChange,
  isPlayingProp,
  onOpenPlayerPage,
  onClosePlayerPage,
  onAddToPlaylist,
  allSongs = [],
  isPlayerPageView = false,
  subscribedSeries = [],
  onToggleSubscription = () => {},
}) {
  const audioRef = useRef(null);
  const preloaderRef = useRef(null);
  const ytPlayerRef = useRef(null);
  const seekBarRef = useRef(null);
  const playNextRef = useRef(null);
  const playPrevRef = useRef(null);
  const handleEndedRef = useRef(null);
  const handleYtErrorRef = useRef(null);
  const playSeqRef = useRef(0);
  const prevSongIdRef = useRef(null);
  const pendingPlayVideoIdRef = useRef(null);
  const pendingSeekTimeRef = useRef(0);
  const ytCandidatesRef = useRef([]);
  const ytTriedIdsRef = useRef(new Set());
  const lastSavedPodcastSecRef = useRef(0);

  const [isPlaying, setIsPlaying] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const [bufferedProgress, setBufferedProgress] = useState(0);
  const [volume, setVolume] = useState(1);
  const [isMuted, setIsMuted] = useState(false);
  const [isShuffled, setIsShuffled] = useState(false);
  const [repeatMode, setRepeatMode] = useState('off');
  const [isDragging, setIsDragging] = useState(false);
  const [audioError, setAudioError] = useState(false);
  const [resolvedAudio, setResolvedAudio] = useState({ songId: null, url: null });
  const [resolvingStatus, setResolvingStatus] = useState(null);
  const [playbackRate, setPlaybackRate] = useState(1);
  const [preferredPlayerTab, setPreferredPlayerTab] = useState(null);
  const [theaterVideo, setTheaterVideo] = useState(false);

  // Hybrid Dual-Engine State
  const [playbackEngine, setPlaybackEngine] = useState('audio'); // 'audio' | 'youtube'
  const [activeYtId, setActiveYtId] = useState(null);
  const [showVideo, setShowVideo] = useState(false);

  const isPodcast = Boolean(song?.isPodcast || song?.source === 'podcast' || song?.seriesId);

  // Active chapter for podcasts
  const activeChapter = useMemo(() => {
    if (!isPodcast || !song?.chapters?.length) return null;
    let current = song.chapters[0];
    for (let i = 0; i < song.chapters.length; i++) {
      if (currentTime >= song.chapters[i].time) {
        current = { ...song.chapters[i], index: i };
      } else {
        break;
      }
    }
    return current;
  }, [isPodcast, song?.chapters, currentTime]);

  // Ensure YouTube IFrame API script is injected in DOM
  useEffect(() => {
    if (typeof window === 'undefined') return;
    if (!window.YT && !document.querySelector('script[src*="youtube.com/iframe_api"]')) {
      const tag = document.createElement('script');
      tag.src = 'https://www.youtube.com/iframe_api';
      tag.async = true;
      document.head.appendChild(tag);
    }
  }, []);

  // Sync playback rate to audio element and YouTube player
  useEffect(() => {
    if (audioRef.current) {
      audioRef.current.playbackRate = playbackRate;
    }
    if (ytPlayerRef.current?.setPlaybackRate) {
      try {
        ytPlayerRef.current.setPlaybackRate(playbackRate);
      } catch {
        // Ignore if player not ready
      }
    }
  }, [playbackRate]);

  // Periodically save podcast playback position for auto-resume
  useEffect(() => {
    if (!isPodcast || !song?.id || currentTime < 5) return;
    if (Math.abs(currentTime - lastSavedPodcastSecRef.current) >= 3) {
      lastSavedPodcastSecRef.current = currentTime;
      savePodcastTime(song.id, currentTime, duration || song.duration || 0);
    }
  }, [isPodcast, song?.id, song?.duration, currentTime, duration]);

  const isLiked = Boolean(
    song &&
      (favorites.includes(String(song.id)) ||
        (song.songId && favorites.includes(String(song.songId))) ||
        (song.videoId && favorites.includes(String(song.videoId))))
  );

  const currentStreamUrl = useMemo(() => {
    if (resolvedAudio.songId === song?.id && resolvedAudio.url) {
      return resolvedAudio.url;
    }
    return song?.audioUrl || '';
  }, [song?.id, song?.audioUrl, resolvedAudio]);

  // Cycle playback speed helper (especially useful for podcasts)
  const cyclePlaybackSpeed = useCallback(() => {
    const rates = [0.75, 1, 1.25, 1.5, 1.75, 2];
    const idx = rates.indexOf(playbackRate);
    const next = rates[(idx + 1) % rates.length];
    setPlaybackRate(next);
  }, [playbackRate]);

  // YouTube IFrame API Loader & Player Initializer
  const initYouTubePlayer = useCallback(
    (videoId, autoPlay = true, startSeconds = 0) => {
      if (!videoId) return;
      ytTriedIdsRef.current.add(videoId);
      if (startSeconds > 0) {
        pendingSeekTimeRef.current = startSeconds;
      }

      const doInitOrLoad = () => {
        if (ytPlayerRef.current && typeof ytPlayerRef.current.loadVideoById === 'function') {
          try {
            if (autoPlay) {
              ytPlayerRef.current.loadVideoById({
                videoId,
                startSeconds: pendingSeekTimeRef.current > 0 ? pendingSeekTimeRef.current : 0,
              });
              pendingSeekTimeRef.current = 0;
              setIsPlaying(true);
              setAudioError(false);
              onPlayStateChange?.(true);
            } else {
              ytPlayerRef.current.cueVideoById({
                videoId,
                startSeconds: pendingSeekTimeRef.current > 0 ? pendingSeekTimeRef.current : 0,
              });
            }
            ytPlayerRef.current.setVolume(isMuted ? 0 : volume * 100);
            if (playbackRate !== 1 && typeof ytPlayerRef.current.setPlaybackRate === 'function') {
              ytPlayerRef.current.setPlaybackRate(playbackRate);
            }
            return;
          } catch (err) {
            console.warn('YouTube loadVideoById error, recreating player:', err);
          }
        }

        pendingPlayVideoIdRef.current = videoId;

        if (window.YT && window.YT.Player) {
          try {
            ytPlayerRef.current = new window.YT.Player('azaad-yt-iframe-target', {
              height: '100%',
              width: '100%',
              videoId,
              playerVars: {
                autoplay: autoPlay ? 1 : 0,
                controls: 1,
                modestbranding: 1,
                rel: 0,
                playsinline: 1,
                enablejsapi: 1,
              },
              events: {
                onReady: (evt) => {
                  try {
                    if (typeof evt?.target?.setVolume === 'function') {
                      evt.target.setVolume(isMuted ? 0 : volume * 100);
                    }
                    if (playbackRate !== 1 && typeof evt?.target?.setPlaybackRate === 'function') {
                      evt.target.setPlaybackRate(playbackRate);
                    }
                    const targetVideoId = pendingPlayVideoIdRef.current || videoId;
                    const seekStart = pendingSeekTimeRef.current > 0 ? pendingSeekTimeRef.current : 0;
                    pendingSeekTimeRef.current = 0;

                    if (targetVideoId && typeof evt?.target?.loadVideoById === 'function') {
                      evt.target.loadVideoById({ videoId: targetVideoId, startSeconds: seekStart });
                      pendingPlayVideoIdRef.current = null;
                      setIsPlaying(true);
                      setAudioError(false);
                      onPlayStateChange?.(true);
                    } else if (autoPlay && typeof evt?.target?.playVideo === 'function') {
                      if (seekStart > 0 && typeof evt?.target?.seekTo === 'function') {
                        evt.target.seekTo(seekStart, true);
                      }
                      evt.target.playVideo();
                      setIsPlaying(true);
                      setAudioError(false);
                      onPlayStateChange?.(true);
                    }
                  } catch (err) {
                    console.warn('YouTube onReady error:', err);
                  }
                },
                onStateChange: (evt) => {
                  // 1 = PLAYING, 2 = PAUSED, 0 = ENDED
                  if (evt.data === 1) {
                    setIsPlaying(true);
                    setAudioError(false);
                    onPlayStateChange?.(true);
                    try {
                      const dur =
                        typeof evt?.target?.getDuration === 'function' ? evt.target.getDuration() : 0;
                      if (dur && dur > 0) setDuration(dur);
                      if (pendingSeekTimeRef.current > 0 && typeof evt?.target?.seekTo === 'function') {
                        evt.target.seekTo(pendingSeekTimeRef.current, true);
                        pendingSeekTimeRef.current = 0;
                      }
                    } catch {}
                  } else if (evt.data === 2) {
                    setIsPlaying(false);
                    onPlayStateChange?.(false);
                  } else if (evt.data === 0) {
                    setIsPlaying(false);
                    onPlayStateChange?.(false);
                    handleEndedRef.current?.();
                  }
                },
                onError: (evt) => {
                  handleYtErrorRef.current?.(evt?.data);
                },
              },
            });
          } catch (e) {
            console.warn('Failed to construct new YT.Player:', e);
          }
        } else {
          let pollCount = 0;
          const interval = setInterval(() => {
            pollCount++;
            if (window.YT && window.YT.Player) {
              clearInterval(interval);
              initYouTubePlayer(videoId, autoPlay, startSeconds);
            } else if (pollCount > 60) {
              clearInterval(interval);
              handleYtErrorRef.current?.('timeout');
            }
          }, 100);
        }
      };

      doInitOrLoad();
    },
    [volume, isMuted, playbackRate, onPlayStateChange]
  );

  // Multi-Tier YouTube Error Recovery (Handles Embed Error 101 / 150 / 100 seamlessly)
  const handleYouTubeError = useCallback(
    async (errCode) => {
      if (!song) return;
      console.warn(`YouTube Player error (${errCode}) for "${song.title}". Attempting smart recovery...`);
      setResolvingStatus('Switching stream source...');

      // 1. Try next untried candidate YouTube Video ID (e.g., Official Audio / Lyric Video without VEVO embed lock)
      let candidates = ytCandidatesRef.current || [];
      let nextVid = candidates.find((id) => id && !ytTriedIdsRef.current.has(id));

      if (!nextVid) {
        try {
          const freshCandidates = await resolveYouTubeCandidates(
            `${song.title} audio`,
            song.singers || song.artist
          );
          ytCandidatesRef.current = freshCandidates;
          nextVid = freshCandidates.find((id) => id && !ytTriedIdsRef.current.has(id));
        } catch {}
      }

      if (nextVid && ytTriedIdsRef.current.size < 3) {
        setActiveYtId(nextVid);
        setPlaybackEngine('youtube');
        setResolvingStatus('Matched Official Audio Stream');
        initYouTubePlayer(nextVid, true, currentTime > 5 ? currentTime : 0);
        setTimeout(() => setResolvingStatus(null), 2500);
        return;
      }

      // 2. Fallback to Direct HTML5 Audio Stream (JioSaavn 320k / Audius / iTunes M4A)
      try {
        const directStream = await resolveAudioStream(
          song.title,
          song.singers || song.artist,
          activeYtId || song.videoId
        );
        if (directStream && directStream.audioUrl && audioRef.current) {
          if (ytPlayerRef.current?.stopVideo) {
            try {
              ytPlayerRef.current.stopVideo();
            } catch {}
          }
          setResolvedAudio({ songId: song.id, url: directStream.audioUrl });
          setPlaybackEngine('audio');
          setAudioError(false);
          setResolvingStatus('320k Direct Audio Stream');
          audioRef.current.src = mediaUrl(directStream.audioUrl);
          audioRef.current.load();
          if (currentTime > 5) {
            audioRef.current.currentTime = currentTime;
          }
          audioRef.current
            .play()
            .then(() => {
              setIsPlaying(true);
              onPlayStateChange?.(true);
            })
            .catch(() => {});
          setTimeout(() => setResolvingStatus(null), 2500);
          return;
        }
      } catch {}

      // 3. Final fallback if song has its own audioUrl
      if (song.audioUrl && audioRef.current) {
        setPlaybackEngine('audio');
        audioRef.current.src = mediaUrl(song.audioUrl);
        audioRef.current.load();
        audioRef.current
          .play()
          .then(() => {
            setIsPlaying(true);
            setAudioError(false);
            onPlayStateChange?.(true);
            setResolvingStatus(null);
          })
          .catch(() => {
            setAudioError(true);
            setIsPlaying(false);
            onPlayStateChange?.(false);
            setResolvingStatus(null);
          });
        return;
      }

      setAudioError(true);
      setIsPlaying(false);
      onPlayStateChange?.(false);
      setResolvingStatus(null);
    },
    [song, activeYtId, currentTime, initYouTubePlayer, onPlayStateChange]
  );

  useEffect(() => {
    handleYtErrorRef.current = handleYouTubeError;
  }, [handleYouTubeError]);

  // Robust Zero-Failure Fallback when HTML5 <audio> fails
  const handleAudioError = useCallback(async () => {
    const mediaErr = audioRef.current?.error;
    if (mediaErr?.code === 1 || mediaErr?.name === 'AbortError') {
      return;
    }

    const songId = song?.id;
    if (!songId) return;

    setResolvingStatus('Recovering high-res stream...');

    // 1. First try resolving a fresh direct audio stream (JioSaavn 320k / Audius / iTunes) if not already tried
    if (resolvedAudio.songId !== songId || !resolvedAudio.url) {
      try {
        const direct = await resolveAudioStream(
          song?.title,
          song?.singers || song?.artist,
          song?.videoId
        );
        if (direct && direct.audioUrl && direct.audioUrl !== song?.audioUrl && audioRef.current) {
          setResolvedAudio({ songId, url: direct.audioUrl });
          setPlaybackEngine('audio');
          audioRef.current.src = mediaUrl(direct.audioUrl);
          audioRef.current.load();
          const playPromise = audioRef.current.play();
          if (playPromise !== undefined) {
            try {
              await playPromise;
              setIsPlaying(true);
              setAudioError(false);
              onPlayStateChange?.(true);
              setResolvingStatus('Hi-Fi Master Stream');
              setTimeout(() => setResolvingStatus(null), 2500);
              return;
            } catch {}
          }
        }
      } catch {}
    }

    // 2. Switch to YouTube Engine with multi-candidate resolution
    const directYtId =
      song?.videoId ||
      song?.youtubeId ||
      (String(songId).startsWith('yt-') ? String(songId).replace(/^yt-/, '') : null);

    if (directYtId && !ytTriedIdsRef.current.has(directYtId)) {
      if (audioRef.current) audioRef.current.pause();
      setPlaybackEngine('youtube');
      setActiveYtId(directYtId);
      setResolvingStatus('YouTube Stream Active');
      initYouTubePlayer(directYtId, true, currentTime > 5 ? currentTime : 0);
      setTimeout(() => setResolvingStatus(null), 2500);
      return;
    }

    try {
      const candidates = await resolveYouTubeCandidates(song?.title, song?.singers || song?.artist);
      ytCandidatesRef.current = candidates;
      const resolvedVid = candidates.find((id) => !ytTriedIdsRef.current.has(id)) || candidates[0];
      if (resolvedVid) {
        song.videoId = resolvedVid;
        if (audioRef.current) audioRef.current.pause();
        setPlaybackEngine('youtube');
        setActiveYtId(resolvedVid);
        setResolvingStatus('YouTube Stream Active');
        initYouTubePlayer(resolvedVid, true, currentTime > 5 ? currentTime : 0);
        setTimeout(() => setResolvingStatus(null), 2500);
        return;
      }
    } catch {}

    setAudioError(true);
    setIsPlaying(false);
    onPlayStateChange?.(false);
    setResolvingStatus(null);
  }, [song, resolvedAudio, currentTime, onPlayStateChange, initYouTubePlayer]);

  // On-demand YouTube Video Resolution when user clicks "Video" / "Watch YouTube"
  const resolveYouTubeVideoForSong = useCallback(async () => {
    if (!song) return;
    if (activeYtId && playbackEngine === 'youtube') {
      setShowVideo(true);
      return;
    }

    setShowVideo(true);
    let vid =
      activeYtId ||
      song?.videoId ||
      song?.youtubeId ||
      (String(song?.id).startsWith('yt-') ? String(song?.id).replace(/^yt-/, '') : null);

    if (!vid) {
      setResolvingStatus('Finding YouTube video...');
      const candidates = await resolveYouTubeCandidates(song?.title, song?.singers || song?.artist);
      ytCandidatesRef.current = candidates;
      vid = candidates[0] || null;
      if (vid) {
        song.videoId = vid;
      }
    }

    if (vid) {
      const resumeSec =
        playbackEngine === 'audio' && audioRef.current ? audioRef.current.currentTime || 0 : currentTime || 0;
      if (audioRef.current) {
        audioRef.current.pause();
      }
      setActiveYtId(vid);
      setPlaybackEngine('youtube');
      setResolvingStatus('YouTube Video Ready');
      initYouTubePlayer(vid, true, resumeSec);
      setTimeout(() => setResolvingStatus(null), 2500);
    } else {
      setResolvingStatus('Video stream unavailable — playing audio');
      setShowVideo(false);
      setTimeout(() => setResolvingStatus(null), 2500);
    }
  }, [activeYtId, playbackEngine, currentTime, song, initYouTubePlayer]);

  // Track changed effect: clean teardown of previous track and instant switch to new track
  useEffect(() => {
    if (prevSongIdRef.current !== song?.id) {
      prevSongIdRef.current = song?.id;
      ytCandidatesRef.current = [];
      ytTriedIdsRef.current = new Set();
      lastSavedPodcastSecRef.current = 0;

      // 1. Immediately pause and reset HTML5 audio
      if (audioRef.current) {
        try {
          audioRef.current.pause();
          audioRef.current.currentTime = 0;
        } catch {}
      }

      // 2. Immediately stop previous YouTube player
      if (ytPlayerRef.current) {
        try {
          if (typeof ytPlayerRef.current.stopVideo === 'function') {
            ytPlayerRef.current.stopVideo();
          } else if (typeof ytPlayerRef.current.pauseVideo === 'function') {
            ytPlayerRef.current.pauseVideo();
          }
        } catch {}
      }

      if (!song) {
        setCurrentTime(0);
        setDuration(0);
        setBufferedProgress(0);
        setAudioError(false);
        setResolvedAudio({ songId: null, url: null });
        setResolvingStatus(null);
        setIsPlaying(false);
        onPlayStateChange?.(false);
        return;
      }

      // Check if podcast has saved resume position
      const isPod = Boolean(song?.isPodcast || song?.source === 'podcast' || song?.seriesId);
      const savedResumeTime = isPod ? getSavedPodcastTime(song.id) : 0;

      // 3. Reset playback states
      setCurrentTime(savedResumeTime || 0);
      setDuration(song?.duration || 0);
      setBufferedProgress(0);
      setAudioError(false);
      setResolvedAudio({ songId: song?.id, url: null });
      setResolvingStatus(
        savedResumeTime > 10 ? `Resumed at ${formatTime(savedResumeTime)}` : null
      );
      if (savedResumeTime > 10) {
        setTimeout(() => setResolvingStatus(null), 3500);
      }
      setIsPlaying(true);
      onPlayStateChange?.(true);

      const directYtId =
        song?.videoId ||
        song?.youtubeId ||
        (String(song?.id).startsWith('yt-') ? String(song?.id).replace(/^yt-/, '') : null);

      // 4. Prefer direct HTML5 audio if available and user does not have Video Mode open
      if (song?.audioUrl && !showVideo) {
        setPlaybackEngine('audio');
        setActiveYtId(directYtId || null);
        if (audioRef.current) {
          const targetUrl = mediaUrl(song.audioUrl);
          audioRef.current.src = targetUrl;
          audioRef.current.load();
          if (savedResumeTime > 0) {
            audioRef.current.currentTime = savedResumeTime;
          }
          audioRef.current.playbackRate = playbackRate;
          const playPromise = audioRef.current.play();
          if (playPromise !== undefined) {
            playPromise
              .then(() => {
                setIsPlaying(true);
                setAudioError(false);
                onPlayStateChange?.(true);
              })
              .catch((err) => {
                if (err.name === 'AbortError' || err.message?.includes('aborted')) return;
                if (err.name === 'NotAllowedError') {
                  setIsPlaying(false);
                  onPlayStateChange?.(false);
                  return;
                }
                handleAudioError();
              });
          }
        }
      } else if (directYtId) {
        setPlaybackEngine('youtube');
        setActiveYtId(directYtId);
        initYouTubePlayer(directYtId, true, savedResumeTime);
      } else {
        // Track has neither audioUrl nor videoId: resolve both in parallel for fastest start
        setResolvingStatus('Connecting stream...');
        Promise.all([
          resolveAudioStream(song?.title, song?.singers || song?.artist, null).catch(() => null),
          resolveYouTubeCandidates(song?.title, song?.singers || song?.artist).catch(() => []),
        ]).then(([directAudio, ytCandidates]) => {
          if (prevSongIdRef.current !== song?.id) return;
          ytCandidatesRef.current = ytCandidates || [];
          const bestYt = ytCandidates?.[0] || null;
          if (bestYt) song.videoId = bestYt;

          if (directAudio?.audioUrl && !showVideo && audioRef.current) {
            setResolvedAudio({ songId: song.id, url: directAudio.audioUrl });
            setPlaybackEngine('audio');
            setActiveYtId(bestYt);
            setResolvingStatus(null);
            audioRef.current.src = mediaUrl(directAudio.audioUrl);
            audioRef.current.load();
            if (savedResumeTime > 0) {
              audioRef.current.currentTime = savedResumeTime;
            }
            audioRef.current.play().catch(() => {
              if (bestYt) {
                setPlaybackEngine('youtube');
                initYouTubePlayer(bestYt, true, savedResumeTime);
              }
            });
          } else if (bestYt) {
            setPlaybackEngine('youtube');
            setActiveYtId(bestYt);
            setResolvingStatus(null);
            initYouTubePlayer(bestYt, true, savedResumeTime);
          } else {
            handleAudioError();
          }
        });
      }
    }
  }, [song?.id, song, showVideo, playbackRate, initYouTubePlayer, handleAudioError, onPlayStateChange]);

  // Sync with App's isPlayingProp
  useEffect(() => {
    if (isPlayingProp !== undefined && isPlayingProp !== isPlaying) {
      if (isPlayingProp) {
        if (playbackEngine === 'youtube') {
          ytPlayerRef.current?.playVideo?.();
        } else if (audioRef.current) {
          audioRef.current.play().catch(() => {});
        }
        setIsPlaying(true);
      } else {
        if (playbackEngine === 'youtube') {
          ytPlayerRef.current?.pauseVideo?.();
        } else if (audioRef.current) {
          audioRef.current.pause();
        }
        setIsPlaying(false);
      }
    }
  }, [isPlayingProp]);

  // Unmount cleanup
  useEffect(() => {
    return () => {
      try {
        if (audioRef.current) {
          audioRef.current.pause();
          audioRef.current.removeAttribute('src');
          audioRef.current.load();
        }
      } catch {}
      try {
        if (ytPlayerRef.current) {
          if (typeof ytPlayerRef.current.destroy === 'function') {
            ytPlayerRef.current.destroy();
          } else if (typeof ytPlayerRef.current.stopVideo === 'function') {
            ytPlayerRef.current.stopVideo();
          }
          ytPlayerRef.current = null;
        }
      } catch {}
    };
  }, []);

  // High-frequency (120ms) Playback Clock for Sub-Beat Lyrics & Seekbar Sync
  useEffect(() => {
    if (!isPlaying || isDragging) return;
    const timer = setInterval(() => {
      try {
        if (playbackEngine === 'youtube' && ytPlayerRef.current) {
          if (typeof ytPlayerRef.current.getCurrentTime === 'function') {
            const curr = ytPlayerRef.current.getCurrentTime();
            if (typeof curr === 'number' && !isNaN(curr)) setCurrentTime(curr);
          }
          if (typeof ytPlayerRef.current.getDuration === 'function') {
            const dur = ytPlayerRef.current.getDuration();
            if (typeof dur === 'number' && !isNaN(dur) && dur > 0) setDuration(dur);
          }
          if (typeof ytPlayerRef.current.getVideoLoadedFraction === 'function') {
            const fraction = ytPlayerRef.current.getVideoLoadedFraction() || 0;
            setBufferedProgress(fraction * 100);
          }
        } else if (playbackEngine === 'audio' && audioRef.current && !audioRef.current.paused) {
          const curr = audioRef.current.currentTime;
          if (typeof curr === 'number' && !isNaN(curr)) setCurrentTime(curr);
        }
      } catch {}
    }, 120);
    return () => clearInterval(timer);
  }, [playbackEngine, isPlaying, isDragging]);

  // Preload next track in queue
  useEffect(() => {
    if (!songs || songs.length <= 1 || !song?.id) return;
    const idx = songs.findIndex((s) => s.id === song?.id);
    const nextSong = idx !== -1 && idx < songs.length - 1 ? songs[idx + 1] : songs[0];
    if (!nextSong?.audioUrl) return;

    const timer = setTimeout(() => {
      if (!preloaderRef.current) {
        preloaderRef.current = new Audio();
        preloaderRef.current.preload = 'auto';
      }
      preloaderRef.current.src = mediaUrl(nextSong.audioUrl);
    }, 1500);

    return () => clearTimeout(timer);
  }, [song?.id, songs]);

  // Unified Play / Pause
  const togglePlay = useCallback(() => {
    if (playbackEngine === 'youtube') {
      if (isPlaying) {
        ytPlayerRef.current?.pauseVideo?.();
        setIsPlaying(false);
        onPlayStateChange?.(false);
      } else {
        if (activeYtId && (!ytPlayerRef.current || typeof ytPlayerRef.current.playVideo !== 'function')) {
          initYouTubePlayer(activeYtId, true, currentTime);
        } else {
          ytPlayerRef.current?.playVideo?.();
        }
        setIsPlaying(true);
        onPlayStateChange?.(true);
      }
      return;
    }

    if (!audioRef.current) return;
    if (isPlaying) {
      audioRef.current.pause();
      setIsPlaying(false);
      onPlayStateChange?.(false);
    } else {
      setAudioError(false);
      const currentPlayId = ++playSeqRef.current;
      const playPromise = audioRef.current.play();
      if (playPromise !== undefined) {
        playPromise
          .then(() => {
            if (currentPlayId === playSeqRef.current) {
              setIsPlaying(true);
              setAudioError(false);
              onPlayStateChange?.(true);
            }
          })
          .catch((err) => {
            if (
              currentPlayId !== playSeqRef.current ||
              err.name === 'AbortError' ||
              err.message?.includes('aborted')
            )
              return;
            if (err.name === 'NotAllowedError') {
              setIsPlaying(false);
              onPlayStateChange?.(false);
              return;
            }
            setIsPlaying(false);
            onPlayStateChange?.(false);
            handleAudioError();
          });
      }
    }
  }, [isPlaying, playbackEngine, activeYtId, currentTime, initYouTubePlayer, onPlayStateChange, handleAudioError]);

  // Skip backward / forward seconds (for podcasts & studio transport)
  const skipBackwardSeconds = useCallback(
    (secs = 15) => {
      const target = Math.max(0, currentTime - secs);
      if (playbackEngine === 'youtube') {
        ytPlayerRef.current?.seekTo?.(target, true);
        setCurrentTime(target);
      } else if (audioRef.current) {
        audioRef.current.currentTime = target;
        setCurrentTime(target);
      }
    },
    [playbackEngine, currentTime]
  );

  const skipForwardSeconds = useCallback(
    (secs = 30) => {
      const dur = duration || song?.duration || 0;
      const target = Math.min(dur || currentTime + secs, currentTime + secs);
      if (playbackEngine === 'youtube') {
        ytPlayerRef.current?.seekTo?.(target, true);
        setCurrentTime(target);
      } else if (audioRef.current) {
        audioRef.current.currentTime = target;
        setCurrentTime(target);
      }
    },
    [playbackEngine, currentTime, duration, song?.duration]
  );

  const updateBufferedProgress = () => {
    if (audioRef.current && audioRef.current.buffered.length > 0) {
      const dur = audioRef.current.duration || duration || song?.duration || 0;
      if (dur > 0) {
        try {
          const end = audioRef.current.buffered.end(audioRef.current.buffered.length - 1);
          setBufferedProgress(Math.min(100, (end / dur) * 100));
        } catch {}
      }
    }
  };

  const handleTimeUpdate = () => {
    if (playbackEngine === 'audio' && audioRef.current && !isDragging) {
      setCurrentTime(audioRef.current.currentTime);
      updateBufferedProgress();
    }
  };

  const handleLoadedMetadata = () => {
    if (audioRef.current && !isNaN(audioRef.current.duration) && audioRef.current.duration > 0) {
      setDuration(audioRef.current.duration);
    } else if (song?.duration) {
      setDuration(song.duration);
    }
    updateBufferedProgress();
  };

  // Unified Seek
  const handleSeek = (e) => {
    const dur = duration || song?.duration || 0;
    if (!dur || !seekBarRef.current) return;
    const rect = seekBarRef.current.getBoundingClientRect();
    const clientX = e.touches && e.touches.length > 0 ? e.touches[0].clientX : e.clientX;
    const ratio = Math.max(0, Math.min(1, (clientX - rect.left) / rect.width));
    const seekTime = ratio * dur;

    if (playbackEngine === 'youtube') {
      ytPlayerRef.current?.seekTo?.(seekTime, true);
      setCurrentTime(seekTime);
    } else if (audioRef.current) {
      audioRef.current.currentTime = seekTime;
      setCurrentTime(seekTime);
    }
  };

  const handleSeekMouseDown = (e) => {
    setIsDragging(true);
    handleSeek(e);
    const onMove = (ev) => handleSeek(ev);
    const onUp = () => {
      setIsDragging(false);
      window.removeEventListener('mousemove', onMove);
      window.removeEventListener('mouseup', onUp);
    };
    window.addEventListener('mousemove', onMove);
    window.addEventListener('mouseup', onUp);
  };

  // Unified Volume
  const handleVolumeChange = (e) => {
    const val = parseFloat(e.target.value);
    setVolume(val);
    if (audioRef.current) {
      audioRef.current.volume = val;
      audioRef.current.muted = false;
    }
    if (ytPlayerRef.current && typeof ytPlayerRef.current.setVolume === 'function') {
      ytPlayerRef.current.setVolume(val * 100);
      if (val > 0 && typeof ytPlayerRef.current.unMute === 'function') {
        ytPlayerRef.current.unMute();
      }
    }
    setIsMuted(val === 0);
  };

  // Unified Mute Toggle
  const toggleMute = useCallback(() => {
    const nextMuted = !isMuted;
    setIsMuted(nextMuted);
    if (audioRef.current) {
      audioRef.current.muted = nextMuted;
    }
    if (ytPlayerRef.current) {
      if (nextMuted && typeof ytPlayerRef.current.mute === 'function') {
        ytPlayerRef.current.mute();
      } else if (!nextMuted && typeof ytPlayerRef.current.unMute === 'function') {
        ytPlayerRef.current.unMute();
      }
    }
  }, [isMuted]);

  // Playlist Navigation
  const playNext = useCallback(() => {
    if (!song) return;
    if (isShuffled && songs.length > 1) {
      let next;
      do {
        next = songs[Math.floor(Math.random() * songs.length)];
      } while (next.id === song?.id && songs.length > 1);
      onChangeSong(next);
      return;
    }
    const idx = songs.findIndex((s) => s.id === song?.id);
    if (idx !== -1 && idx < songs.length - 1) onChangeSong(songs[idx + 1]);
    else if (songs.length > 0) onChangeSong(songs[0]);
  }, [isShuffled, songs, song?.id, onChangeSong]);

  useEffect(() => {
    playNextRef.current = playNext;
  }, [playNext]);

  const playPrev = useCallback(() => {
    if (!song) return;
    if (playbackEngine === 'youtube') {
      if (currentTime > 3) {
        ytPlayerRef.current?.seekTo?.(0, true);
        setCurrentTime(0);
        return;
      }
    } else if (audioRef.current && audioRef.current.currentTime > 3) {
      audioRef.current.currentTime = 0;
      return;
    }
    const idx = songs.findIndex((s) => s.id === song?.id);
    if (idx > 0) onChangeSong(songs[idx - 1]);
    else if (songs.length > 0) onChangeSong(songs[songs.length - 1]);
  }, [playbackEngine, currentTime, songs, song?.id, onChangeSong]);

  useEffect(() => {
    playPrevRef.current = playPrev;
  }, [playPrev]);

  // Unified Track Ended Handler
  const handleEnded = useCallback(() => {
    if (isPodcast && song?.id) {
      savePodcastTime(song.id, 0, duration || song.duration || 0);
    }
    if (repeatMode === 'one') {
      if (playbackEngine === 'youtube') {
        ytPlayerRef.current?.seekTo?.(0, true);
        ytPlayerRef.current?.playVideo?.();
        setIsPlaying(true);
      } else if (audioRef.current) {
        audioRef.current.currentTime = 0;
        audioRef.current
          .play()
          .then(() => setIsPlaying(true))
          .catch(() => {});
      }
      return;
    }
    setIsPlaying(false);
    playNext();
  }, [isPodcast, song?.id, song?.duration, duration, repeatMode, playbackEngine, playNext]);

  useEffect(() => {
    handleEndedRef.current = handleEnded;
  }, [handleEnded]);

  const cycleRepeat = () => {
    setRepeatMode((prev) => (prev === 'off' ? 'all' : prev === 'all' ? 'one' : 'off'));
  };

  // Global Keyboard Shortcuts
  useEffect(() => {
    const handleKeyDown = (e) => {
      const tag = e.target?.tagName?.toLowerCase();
      if (tag === 'input' || tag === 'textarea' || e.target?.isContentEditable) return;

      if (e.code === 'Space') {
        e.preventDefault();
        togglePlay();
      } else if (e.code === 'ArrowRight') {
        e.preventDefault();
        skipForwardSeconds(isPodcast ? 15 : 5);
      } else if (e.code === 'ArrowLeft') {
        e.preventDefault();
        skipBackwardSeconds(isPodcast ? 15 : 5);
      } else if (e.key === 'm' || e.key === 'M') {
        toggleMute();
      } else if (e.key === 'n' || e.key === 'N') {
        playNext();
      } else if (e.key === 'p' || e.key === 'P') {
        playPrev();
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [togglePlay, toggleMute, playNext, playPrev, skipForwardSeconds, skipBackwardSeconds, isPodcast]);

  // MediaSession API Integration
  useEffect(() => {
    if (!song || typeof navigator === 'undefined' || !('mediaSession' in navigator)) return;

    const cover = mediaUrl(song?.coverUrl, song);
    navigator.mediaSession.metadata = new MediaMetadata({
      title: song?.title || 'Untitled',
      artist: song?.singers || song?.artist || 'Unknown artist',
      album: song?.seriesTitle || song?.album || 'Azaad Music',
      artwork: cover
        ? [
            { src: cover, sizes: '96x96', type: 'image/jpeg' },
            { src: cover, sizes: '128x128', type: 'image/jpeg' },
            { src: cover, sizes: '192x192', type: 'image/jpeg' },
            { src: cover, sizes: '256x256', type: 'image/jpeg' },
            { src: cover, sizes: '512x512', type: 'image/jpeg' },
          ]
        : [],
    });

    navigator.mediaSession.setActionHandler('play', () => {
      if (playbackEngine === 'youtube') {
        ytPlayerRef.current?.playVideo?.();
        setIsPlaying(true);
      } else if (audioRef.current) {
        audioRef.current
          .play()
          .then(() => setIsPlaying(true))
          .catch(() => {});
      }
    });

    navigator.mediaSession.setActionHandler('pause', () => {
      if (playbackEngine === 'youtube') {
        ytPlayerRef.current?.pauseVideo?.();
        setIsPlaying(false);
      } else if (audioRef.current) {
        audioRef.current.pause();
        setIsPlaying(false);
      }
    });

    navigator.mediaSession.setActionHandler('previoustrack', isPodcast ? () => skipBackwardSeconds(15) : playPrev);
    navigator.mediaSession.setActionHandler('nexttrack', isPodcast ? () => skipForwardSeconds(30) : playNext);

    try {
      navigator.mediaSession.setActionHandler('seekto', (details) => {
        if (details.seekTime !== undefined && details.seekTime !== null) {
          const seekTime = Number(details.seekTime);
          if (playbackEngine === 'youtube') {
            ytPlayerRef.current?.seekTo?.(seekTime, true);
            setCurrentTime(seekTime);
          } else if (audioRef.current) {
            audioRef.current.currentTime = seekTime;
            setCurrentTime(seekTime);
          }
        }
      });
      navigator.mediaSession.setActionHandler('seekbackward', (details) => {
        skipBackwardSeconds(details.seekOffset || 15);
      });
      navigator.mediaSession.setActionHandler('seekforward', (details) => {
        skipForwardSeconds(details.seekOffset || 30);
      });
    } catch {}
  }, [
    song?.id,
    song?.title,
    song?.singers,
    song?.artist,
    song?.coverUrl,
    song?.seriesTitle,
    song?.album,
    isPodcast,
    playbackEngine,
    playNext,
    playPrev,
    skipBackwardSeconds,
    skipForwardSeconds,
  ]);

  useEffect(() => {
    if (typeof navigator === 'undefined' || !('mediaSession' in navigator)) return;
    navigator.mediaSession.playbackState = isPlaying ? 'playing' : 'paused';
  }, [isPlaying]);

  // Synchronize OS-level lock screen seek bar position
  useEffect(() => {
    if (
      typeof navigator === 'undefined' ||
      !('mediaSession' in navigator) ||
      !navigator.mediaSession.setPositionState
    )
      return;
    const dur = duration || song?.duration || 0;
    if (dur > 0 && currentTime >= 0 && currentTime <= dur) {
      try {
        navigator.mediaSession.setPositionState({
          duration: Math.max(0.1, dur),
          playbackRate: isPlaying ? playbackRate : 0,
          position: Math.min(Math.max(0, currentTime), dur),
        });
      } catch {}
    }
  }, [currentTime, duration, song?.duration, isPlaying, playbackRate]);

  // Background playback guard
  useEffect(() => {
    const handleVisibilityChange = () => {
      if (!document.hidden && isPlaying) {
        if (playbackEngine === 'audio' && audioRef.current && audioRef.current.paused) {
          audioRef.current.play().catch(() => {});
        } else if (playbackEngine === 'youtube' && ytPlayerRef.current) {
          const state = ytPlayerRef.current?.getPlayerState?.();
          if (state === 2) {
            ytPlayerRef.current?.playVideo?.();
          }
        }
      }
    };

    document.addEventListener('visibilitychange', handleVisibilityChange);
    return () => {
      document.removeEventListener('visibilitychange', handleVisibilityChange);
    };
  }, [isPlaying, playbackEngine]);

  const activeDuration = duration || song?.duration || 0;
  const progress = activeDuration ? (currentTime / activeDuration) * 100 : 0;
  const remainingSeconds = Math.max(0, activeDuration - currentTime);

  const handleToggleVideoMode = useCallback(() => {
    if (showVideo) {
      setShowVideo(false);
    } else {
      resolveYouTubeVideoForSong();
    }
  }, [showVideo, resolveYouTubeVideoForSong]);

  return (
    <>
      {/* Full-Screen Music & Podcast Studio Player View */}
      {isPlayerPageView && song && (
        <div className="fixed inset-0 z-[60] bg-[#0c1012] overflow-y-auto overscroll-contain h-[100dvh] w-full max-w-[100vw] overflow-x-hidden">
          <MusicPlayerPage
            song={song}
            songs={songs}
            initialTab={preferredPlayerTab}
            onClearInitialTab={() => setPreferredPlayerTab(null)}
            playback={{
              isPlaying,
              currentTime,
              duration: activeDuration,
              bufferedProgress,
              volume,
              isMuted,
              isShuffled,
              repeatMode,
              playbackEngine,
              activeYtId,
              showVideo,
              resolvingStatus,
              audioError,
              togglePlay,
              playNext,
              playPrev,
              seekTo: (targetSeconds) => {
                if (typeof targetSeconds !== 'number' || isNaN(targetSeconds) || !isFinite(targetSeconds))
                  return;
                const dur = duration || song?.duration || 0;
                if (!dur) return;
                const boundedTime = Math.max(0, Math.min(dur, targetSeconds));
                if (playbackEngine === 'youtube') {
                  ytPlayerRef.current?.seekTo?.(boundedTime, true);
                  setCurrentTime(boundedTime);
                } else if (audioRef.current) {
                  audioRef.current.currentTime = boundedTime;
                  setCurrentTime(boundedTime);
                }
              },
              setVolumeLevel: (val) => {
                setVolume(val);
                setIsMuted(val === 0);
                if (audioRef.current) audioRef.current.volume = val;
                if (ytPlayerRef.current?.setVolume) ytPlayerRef.current.setVolume(val * 100);
              },
              toggleMute,
              toggleShuffle: () => setIsShuffled((s) => !s),
              cycleRepeat: () =>
                setRepeatMode((r) => (r === 'off' ? 'all' : r === 'all' ? 'one' : 'off')),
              toggleVideo: handleToggleVideoMode,
              setShowVideo,
              playbackRate,
              setPlaybackRate,
              skipBackwardSeconds,
              skipForwardSeconds,
            }}
            onSelectSong={onChangeSong}
            isLiked={isLiked}
            onToggleFavorite={onToggleFavorite}
            onAddToPlaylist={onAddToPlaylist}
            onBack={onClosePlayerPage}
            allSongs={allSongs}
            subscribedSeries={subscribedSeries}
            onToggleSubscription={onToggleSubscription}
          />
        </div>
      )}

      {/* Picture-in-Picture & Theater YouTube Player (z-[80] so it sits above both main app and MusicPlayerPage) */}
      <div
        className={`fixed z-[80] transition-all duration-300 ${
          showVideo && song
            ? theaterVideo
              ? 'bottom-24 sm:bottom-24 right-2 left-2 sm:left-auto sm:right-6 sm:w-[540px] lg:w-[640px] rounded-3xl overflow-hidden bg-[#0b1014] shadow-[0_25px_70px_rgba(0,0,0,0.92)] border border-[var(--primary)]/40 block'
              : 'bottom-24 sm:bottom-24 right-3 sm:right-6 w-72 xs:w-80 sm:w-96 rounded-2xl overflow-hidden bg-[#0b1014] shadow-[0_20px_50px_rgba(0,0,0,0.88)] border border-[var(--primary)]/35 block'
            : 'fixed bottom-1 right-1 w-[2px] h-[2px] opacity-[0.005] pointer-events-none z-[-1] overflow-hidden'
        }`}
      >
        <div className="flex items-center justify-between px-3.5 py-2 bg-black/90 backdrop-blur-md border-b border-white/10">
          <div className="flex items-center gap-2 min-w-0">
            <YoutubeLogo size={17} weight="fill" className="text-red-500 flex-shrink-0" />
            <span className="text-xs font-bold text-white truncate max-w-[180px] sm:max-w-[260px]">
              {song?.title || 'YouTube Stream'}
            </span>
            {resolvingStatus && (
              <span className="text-[10px] font-mono text-[var(--primary)] animate-pulse truncate">
                • {resolvingStatus}
              </span>
            )}
          </div>
          <div className="flex items-center gap-1">
            <button
              onClick={() => setTheaterVideo((t) => !t)}
              className="p-1.5 rounded-lg text-white/70 hover:text-white hover:bg-white/10 transition-colors cursor-pointer"
              title={theaterVideo ? 'Compact Size' : 'Expand Video'}
            >
              {theaterVideo ? <ArrowsInSimple size={14} weight="bold" /> : <ArrowsOutSimple size={14} weight="bold" />}
            </button>
            <button
              onClick={() => setShowVideo(false)}
              className="p-1.5 rounded-lg text-white/70 hover:text-white hover:bg-white/10 transition-colors cursor-pointer"
              title="Minimize Video Player"
            >
              <X size={15} weight="bold" />
            </button>
          </div>
        </div>
        <div className="w-full aspect-video bg-black flex items-center justify-center relative">
          <div id="azaad-yt-iframe-target" className="w-full h-full" />
        </div>
      </div>

      {/* HTML5 Audio Element for Direct MP3 / AAC Audio Streams */}
      <audio
        ref={audioRef}
        src={playbackEngine === 'audio' && song ? mediaUrl(currentStreamUrl) : undefined}
        onTimeUpdate={handleTimeUpdate}
        onProgress={updateBufferedProgress}
        onLoadedMetadata={handleLoadedMetadata}
        onDurationChange={handleLoadedMetadata}
        onEnded={handleEnded}
        onError={handleAudioError}
        loop={repeatMode === 'one'}
        preload="auto"
        playsInline
        webkit-playsinline="true"
        x-webkit-airplay="allow"
      />

      {/* Main Bottom Player Bar */}
      {song && (
        <div
          className={`fixed z-50 transition-all duration-300 left-2 right-2 sm:left-0 sm:right-0 ${
            isPlayerPageView
              ? 'opacity-0 pointer-events-none -bottom-36 h-0 overflow-hidden'
              : hasBottomNav
              ? 'bottom-[68px] sm:bottom-0'
              : 'bottom-2 sm:bottom-0'
          } rounded-2xl sm:rounded-none overflow-hidden bg-[#0c1118]/95 sm:bg-[#0b0f17]/95 backdrop-blur-2xl border border-[var(--primary)]/25 shadow-[0_14px_45px_rgba(0,0,0,0.75)]`}
        >
          <div className="absolute inset-0 bg-[linear-gradient(135deg,rgba(10,14,20,0.92),rgba(8,11,16,0.98))] backdrop-blur-[8px]" />

          <div className="relative z-10">
            {/* Seek bar with buffered progress & Podcast Chapter Markers */}
            <div
              ref={seekBarRef}
              className="h-2 sm:h-2 bg-white/10 hover:h-3 cursor-pointer group relative w-full transition-all"
              onMouseDown={handleSeekMouseDown}
              onTouchStart={handleSeek}
            >
              {/* Buffered track */}
              <div
                className="absolute top-0 bottom-0 left-0 bg-white/15 transition-all duration-300 pointer-events-none"
                style={{ width: `${Math.min(100, Math.max(0, bufferedProgress))}%` }}
              />

              {/* Podcast Chapter Tick Marks */}
              {isPodcast &&
                activeDuration > 0 &&
                song.chapters?.map((ch, idx) => {
                  if (ch.time <= 0 || ch.time >= activeDuration) return null;
                  const pct = (ch.time / activeDuration) * 100;
                  return (
                    <div
                      key={idx}
                      style={{ left: `${pct}%` }}
                      title={`${ch.title} (${formatTime(ch.time)})`}
                      className="absolute top-0 bottom-0 w-[2px] bg-black/70 z-10 pointer-events-none"
                    />
                  );
                })}

              {/* Active progress */}
              <div
                className="h-full bg-gradient-to-r from-[var(--primary-dark)] via-[var(--primary)] to-emerald-400 group-hover:shadow-[0_0_14px_rgba(83,242,224,0.55)] transition-all relative"
                style={{ width: `${Math.min(100, Math.max(0, progress))}%` }}
              >
                <div className="absolute right-0 top-1/2 -translate-y-1/2 w-3.5 h-3.5 sm:w-4 sm:h-4 rounded-full bg-white border-2 border-[var(--primary)] opacity-0 group-hover:opacity-100 transition-opacity shadow-[0_0_10px_rgba(83,242,224,0.85)]" />
              </div>
            </div>

            {/* ─── Desktop / Tablet Player Layout ─── */}
            <div className="hidden sm:flex items-center justify-between px-4 md:px-6 py-3 max-w-screen-2xl mx-auto gap-4">
              {/* Left: Track / Episode Info */}
              <div
                onClick={onOpenPlayerPage}
                className="flex items-center gap-3.5 min-w-0 flex-1 cursor-pointer group select-none"
                title={isPodcast ? 'Open Podcast Studio Player' : 'Open Music Studio Player'}
              >
                <div className="relative flex-shrink-0">
                  <img
                    src={mediaUrl(song.coverUrl, song)}
                    alt={song.title}
                    loading="lazy"
                    decoding="async"
                    referrerPolicy="no-referrer"
                    onError={(e) => handleCoverImageError(e, song)}
                    className={`w-14 h-14 rounded-xl object-cover border border-[var(--primary)]/25 transition-transform group-hover:scale-105 ${
                      isPlaying ? 'shadow-[0_0_22px_rgba(83,242,224,0.25)]' : ''
                    }`}
                  />
                  {isPlaying && (
                    <div className="absolute -bottom-1 -right-1 flex items-end gap-[2px] bg-[#0b0f17]/95 border border-[var(--primary)]/30 rounded-md px-1 py-0.5 shadow-md">
                      <span className="w-[2.5px] rounded-full bg-[var(--primary)] eq-bar-1" />
                      <span className="w-[2.5px] rounded-full bg-[var(--primary)] eq-bar-2" />
                      <span className="w-[2.5px] rounded-full bg-[var(--primary)] eq-bar-3" />
                      <span className="w-[2.5px] rounded-full bg-[var(--primary)] eq-bar-4" />
                    </div>
                  )}
                </div>

                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2">
                    <p className="text-sm font-bold text-[var(--text)] truncate group-hover:text-[var(--primary)] transition-colors">
                      {song.title}
                    </p>
                    {isPodcast ? (
                      <span className="text-[9px] font-extrabold px-2 py-0.5 rounded-md bg-[var(--primary)]/15 text-[var(--primary)] border border-[var(--primary)]/30 uppercase tracking-wider flex items-center gap-1 flex-shrink-0">
                        <Microphone size={11} weight="fill" />
                        {song.episodeNumber ? `EP ${song.episodeNumber}` : 'PODCAST'}
                      </span>
                    ) : playbackEngine === 'youtube' || song.source === 'youtube' ? (
                      <span className="text-[9px] font-bold px-1.5 py-0.5 rounded-md bg-red-500/20 text-red-300 border border-red-500/30 uppercase tracking-wider flex items-center gap-1 flex-shrink-0">
                        <YoutubeLogo size={11} weight="fill" className="text-red-400" />
                        YouTube HD
                      </span>
                    ) : song.source === 'saavn' ? (
                      <span className="text-[9px] font-bold px-1.5 py-0.5 rounded-md bg-amber-500/15 text-amber-300 border border-amber-500/30 uppercase tracking-wider flex items-center gap-1 flex-shrink-0">
                        <Sparkle size={11} weight="fill" className="text-amber-400" />
                        320k Master
                      </span>
                    ) : (
                      <span className="text-[9px] font-bold px-1.5 py-0.5 rounded-md bg-[var(--primary)]/15 text-[var(--primary)] border border-[var(--primary)]/25 uppercase tracking-wider flex items-center gap-1 flex-shrink-0">
                        <Waveform size={11} weight="bold" />
                        Hi-Fi
                      </span>
                    )}

                    {resolvingStatus && (
                      <span className="text-[9px] font-medium px-1.5 py-0.5 rounded-md bg-cyan-500/20 text-cyan-300 border border-cyan-500/30 animate-pulse flex items-center gap-1 flex-shrink-0">
                        <Sparkle size={10} weight="fill" className="text-cyan-400" />
                        {resolvingStatus}
                      </span>
                    )}
                  </div>

                  <p className="text-xs text-[var(--text-light)] truncate flex items-center gap-1.5 mt-0.5">
                    <span className="truncate">{song.singers || song.artist}</span>
                    {isPodcast && activeChapter ? (
                      <span className="text-[11px] font-semibold text-[var(--primary)] truncate">
                        • Ch {activeChapter.index + 1}: {activeChapter.title}
                      </span>
                    ) : (
                      song.genre && <span className="text-[10px] opacity-60">· {song.genre}</span>
                    )}
                  </p>
                </div>

                <LikeHeartButton
                  isFavorite={isLiked}
                  onToggle={() => onToggleFavorite(song)}
                  size="md"
                  variant="icon"
                  className="flex-shrink-0"
                />
              </div>

              {/* Center: Adaptive Music / Podcast Transport Controls */}
              <div className="flex flex-col items-center gap-1 flex-shrink-0">
                <div className="flex items-center gap-2">
                  {isPodcast ? (
                    /* Podcast Speed Pill in Transport */
                    <button
                      onClick={cyclePlaybackSpeed}
                      className="px-2.5 py-1.5 rounded-xl bg-white/5 hover:bg-white/12 border border-white/10 text-xs font-mono font-extrabold text-[var(--primary)] flex items-center gap-1 transition-all cursor-pointer"
                      title="Cycle Podcast Playback Speed"
                    >
                      <Gauge size={14} weight="duotone" />
                      <span>{playbackRate}x</span>
                    </button>
                  ) : (
                    <button
                      onClick={() => setIsShuffled(!isShuffled)}
                      className={`p-2 rounded-xl transition-all cursor-pointer ${
                        isShuffled
                          ? 'text-[var(--primary)] bg-[var(--primary)]/15 border border-[var(--primary)]/30'
                          : 'text-[var(--text-light)] hover:text-[var(--text)] hover:bg-white/5'
                      }`}
                      title="Shuffle Queue"
                    >
                      <Shuffle size={17} weight={isShuffled ? 'bold' : 'regular'} />
                    </button>
                  )}

                  <button
                    onClick={playPrev}
                    className="p-2 rounded-xl text-[var(--text-light)] hover:text-white hover:bg-white/5 transition-all active:scale-95 cursor-pointer"
                    title="Previous Track / Episode (P)"
                  >
                    <SkipBack size={19} weight="fill" />
                  </button>

                  {/* -15s Rewind Button (Always visible on podcasts, subtle on music) */}
                  <button
                    onClick={() => skipBackwardSeconds(15)}
                    className={`px-2 py-1.5 rounded-xl flex items-center gap-0.5 transition-all active:scale-95 cursor-pointer ${
                      isPodcast
                        ? 'bg-[var(--primary)]/12 text-[var(--primary)] border border-[var(--primary)]/25 hover:bg-[var(--primary)]/20'
                        : 'text-[var(--text-light)] hover:text-white hover:bg-white/5'
                    }`}
                    title="Rewind 15 Seconds (Left Arrow)"
                  >
                    <ArrowCounterClockwise size={17} weight="bold" />
                    <span className="text-[10px] font-mono font-bold">15s</span>
                  </button>

                  {/* Play / Pause */}
                  <button
                    onClick={togglePlay}
                    className="w-12 h-12 rounded-full bg-[var(--primary)] text-[var(--bg)] flex items-center justify-center hover:scale-105 active:scale-95 transition-all glow-primary cursor-pointer"
                    title={isPlaying ? 'Pause (Space)' : 'Play (Space)'}
                  >
                    {isPlaying ? (
                      <Pause size={22} weight="fill" />
                    ) : (
                      <Play size={22} weight="fill" className="ml-0.5" />
                    )}
                  </button>

                  {/* +30s Fast-Forward Button */}
                  <button
                    onClick={() => skipForwardSeconds(30)}
                    className={`px-2 py-1.5 rounded-xl flex items-center gap-0.5 transition-all active:scale-95 cursor-pointer ${
                      isPodcast
                        ? 'bg-[var(--primary)]/12 text-[var(--primary)] border border-[var(--primary)]/25 hover:bg-[var(--primary)]/20'
                        : 'text-[var(--text-light)] hover:text-white hover:bg-white/5'
                    }`}
                    title="Fast-Forward 30 Seconds (Right Arrow)"
                  >
                    <span className="text-[10px] font-mono font-bold">30s</span>
                    <ArrowClockwise size={17} weight="bold" />
                  </button>

                  <button
                    onClick={playNext}
                    className="p-2 rounded-xl text-[var(--text-light)] hover:text-white hover:bg-white/5 transition-all active:scale-95 cursor-pointer"
                    title="Next Track / Episode (N)"
                  >
                    <SkipForward size={19} weight="fill" />
                  </button>

                  <button
                    onClick={cycleRepeat}
                    className={`p-2 rounded-xl transition-all relative cursor-pointer ${
                      repeatMode !== 'off'
                        ? 'text-[var(--primary)] bg-[var(--primary)]/15 border border-[var(--primary)]/30'
                        : 'text-[var(--text-light)] hover:text-[var(--text)] hover:bg-white/5'
                    }`}
                    title={`Repeat: ${repeatMode}`}
                  >
                    {repeatMode === 'one' ? (
                      <RepeatOnce size={17} weight="bold" />
                    ) : (
                      <Repeat size={17} weight={repeatMode !== 'off' ? 'bold' : 'regular'} />
                    )}
                  </button>
                </div>

                {/* Time & Podcast Remaining Readout */}
                <div className="flex items-center gap-2 font-mono tabular-nums">
                  <span className="text-[10px] text-[var(--primary)] font-semibold">
                    {formatTime(currentTime)}
                  </span>
                  <span className="text-[10px] text-white/25">/</span>
                  <span className="text-[10px] text-[var(--text-light)]">
                    {formatTime(activeDuration)}
                  </span>
                  {isPodcast && remainingSeconds > 0 && (
                    <span className="text-[10px] text-emerald-400/90 font-sans font-semibold ml-1">
                      (-{formatTime(remainingSeconds)} left)
                    </span>
                  )}
                </div>
              </div>

              {/* Right: Podcast Chapters Quick-Open, YouTube Video & Volume */}
              <div className="hidden md:flex items-center gap-2 flex-1 justify-end">
                {/* Podcast Chapters Quick Button */}
                {isPodcast && (
                  <button
                    onClick={() => {
                      setPreferredPlayerTab('notes');
                      onOpenPlayerPage?.();
                    }}
                    className="px-3 py-2 rounded-xl bg-[var(--primary)]/12 hover:bg-[var(--primary)]/20 text-[var(--primary)] border border-[var(--primary)]/30 text-xs font-bold flex items-center gap-1.5 transition-all cursor-pointer"
                    title="Open Episode Chapters & Show Notes"
                  >
                    <BookOpenText size={15} weight="duotone" />
                    <span>Chapters{song.chapters?.length ? ` (${song.chapters.length})` : ''}</span>
                  </button>
                )}

                {/* Time-Synced Lyrics Quick-Open Button */}
                {!isPodcast && (
                  <button
                    onClick={() => {
                      setPreferredPlayerTab('lyrics');
                      onOpenPlayerPage?.();
                    }}
                    className="px-3 py-2 rounded-xl text-[var(--text-light)] hover:text-white bg-white/5 border border-white/10 hover:bg-white/10 hover:border-[var(--primary)]/40 hover:text-[var(--primary)] text-xs font-semibold flex items-center gap-1.5 transition-all cursor-pointer"
                    title="Open Time-Synced Karaoke Lyrics Studio"
                  >
                    <Microphone size={16} weight="duotone" className="text-[var(--primary)]" />
                    <span>Lyrics</span>
                  </button>
                )}

                {/* Watch YouTube Video Toggle */}
                <button
                  onClick={handleToggleVideoMode}
                  className={`px-3 py-2 rounded-xl transition-all relative flex items-center gap-1.5 text-xs font-semibold cursor-pointer ${
                    showVideo
                      ? 'text-red-300 bg-red-500/20 border border-red-500/40 shadow-[0_0_14px_rgba(239,68,68,0.25)]'
                      : 'text-[var(--text-light)] hover:text-white bg-white/5 border border-white/10 hover:bg-white/10'
                  }`}
                  title={showVideo ? 'Hide YouTube Video' : 'Watch YouTube Video'}
                >
                  <YoutubeLogo size={16} weight="fill" className="text-red-500" />
                  <span>{showVideo ? 'Video On' : 'Video'}</span>
                  {playbackEngine === 'youtube' && (
                    <span className="flex h-2 w-2 relative">
                      <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-red-400 opacity-75" />
                      <span className="relative inline-flex rounded-full h-2 w-2 bg-red-500" />
                    </span>
                  )}
                </button>

                <button
                  onClick={toggleMute}
                  className="p-2 rounded-xl text-[var(--text-light)] hover:text-[var(--primary)] hover:bg-white/5 transition-colors cursor-pointer"
                  title={isMuted ? 'Unmute (M)' : 'Mute (M)'}
                >
                  {isMuted || volume === 0 ? (
                    <SpeakerSlash size={18} weight="duotone" className="text-rose-400" />
                  ) : volume < 0.5 ? (
                    <SpeakerLow size={18} weight="duotone" />
                  ) : (
                    <SpeakerHigh size={18} weight="duotone" />
                  )}
                </button>
                <input
                  type="range"
                  min="0"
                  max="1"
                  step="0.01"
                  value={isMuted ? 0 : volume}
                  onChange={handleVolumeChange}
                  aria-label="Volume"
                  className="w-20 lg:w-24"
                />

                <button
                  onClick={onOpenPlayerPage}
                  className="p-2 text-[var(--text-light)] hover:text-[var(--primary)] hover:bg-white/10 rounded-xl border border-transparent hover:border-white/10 transition-all ml-0.5 cursor-pointer"
                  title="Expand Full Studio Player"
                >
                  <CornersOut size={18} weight="bold" />
                </button>
              </div>
            </div>

            {/* ─── Mobile Player Layout (Optimized for Podcasts & Music) ─── */}
            <div className="sm:hidden px-3 py-2.5">
              <div className="flex items-center justify-between gap-2">
                {/* Song / Podcast Cover & Info */}
                <div
                  onClick={onOpenPlayerPage}
                  className="flex items-center gap-2.5 min-w-0 flex-1 cursor-pointer group"
                >
                  <div className="relative flex-shrink-0">
                    <img
                      src={mediaUrl(song.coverUrl, song)}
                      alt={song.title}
                      loading="lazy"
                      decoding="async"
                      referrerPolicy="no-referrer"
                      onError={(e) => handleCoverImageError(e, song)}
                      className={`w-11 h-11 rounded-xl object-cover border border-[var(--primary)]/25 ${
                        isPlaying ? 'shadow-[0_0_12px_rgba(83,242,224,0.25)]' : ''
                      }`}
                    />
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="text-[13px] font-bold text-[var(--text)] truncate leading-tight">
                      {song.title}
                    </p>
                    <p className="text-[11px] text-[var(--text-light)] truncate mt-0.5 flex items-center gap-1">
                      {isPodcast && activeChapter ? (
                        <span className="text-[var(--primary)] font-semibold truncate">
                          Ch {activeChapter.index + 1}: {activeChapter.title}
                        </span>
                      ) : resolvingStatus ? (
                        <span className="text-cyan-300 font-medium animate-pulse truncate">
                          {resolvingStatus}
                        </span>
                      ) : (
                        <span className="truncate">{song.singers || song.artist}</span>
                      )}
                    </p>
                  </div>
                </div>

                {/* Mobile Quick Actions: Adaptive for Podcast vs Music */}
                <div className="flex items-center gap-1 flex-shrink-0">
                  {isPodcast ? (
                    <>
                      <button
                        onClick={cyclePlaybackSpeed}
                        className="px-2 py-1.5 rounded-lg bg-white/8 text-[10px] font-mono font-extrabold text-[var(--primary)] border border-white/10"
                        title="Playback Speed"
                      >
                        {playbackRate}x
                      </button>
                      <button
                        onClick={() => skipBackwardSeconds(15)}
                        className="p-2 rounded-xl text-[var(--text-light)] active:text-white active:scale-90 transition-all"
                        title="Rewind 15s"
                      >
                        <ArrowCounterClockwise size={18} weight="bold" />
                      </button>
                      <button
                        onClick={togglePlay}
                        className="w-10 h-10 rounded-full bg-[var(--primary)] text-[var(--bg)] flex items-center justify-center active:scale-90 transition-all shadow-[0_0_16px_rgba(83,242,224,0.4)]"
                      >
                        {isPlaying ? (
                          <Pause size={18} weight="fill" />
                        ) : (
                          <Play size={18} weight="fill" className="ml-0.5" />
                        )}
                      </button>
                      <button
                        onClick={() => skipForwardSeconds(30)}
                        className="p-2 rounded-xl text-[var(--text-light)] active:text-white active:scale-90 transition-all"
                        title="Forward 30s"
                      >
                        <ArrowClockwise size={18} weight="bold" />
                      </button>
                    </>
                  ) : (
                    <>
                      <button
                        onClick={handleToggleVideoMode}
                        className={`p-2 rounded-xl active:scale-90 transition-transform ${
                          showVideo ? 'text-red-400 bg-red-500/15' : 'text-[var(--text-light)]/80 hover:text-white'
                        }`}
                        title="Toggle YouTube Video"
                      >
                        <YoutubeLogo size={17} weight="fill" className="text-red-500" />
                      </button>

                      <LikeHeartButton
                        isFavorite={isLiked}
                        onToggle={() => onToggleFavorite(song)}
                        size="md"
                        variant="icon"
                      />

                      <button
                        onClick={togglePlay}
                        className="w-10 h-10 rounded-full bg-[var(--primary)] text-[var(--bg)] flex items-center justify-center active:scale-90 transition-all shadow-[0_0_16px_rgba(83,242,224,0.4)]"
                      >
                        {isPlaying ? (
                          <Pause size={18} weight="fill" />
                        ) : (
                          <Play size={18} weight="fill" className="ml-0.5" />
                        )}
                      </button>
                      <button
                        onClick={playNext}
                        className="p-2 rounded-xl text-[var(--text-light)]/80 active:text-[var(--text)] active:scale-90 transition-all"
                      >
                        <SkipForward size={18} weight="fill" />
                      </button>
                    </>
                  )}
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </>
  );
}

export default PlayerBar;
