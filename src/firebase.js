import { initializeApp, getApps, getApp } from 'firebase/app';
import {
  getAuth,
  signInWithPopup,
  GoogleAuthProvider,
  signInWithEmailAndPassword,
  createUserWithEmailAndPassword,
  signOut as fbSignOut,
  onAuthStateChanged,
  updateProfile,
} from 'firebase/auth';
import {
  getFirestore,
  doc,
  setDoc,
  getDoc,
  getDocFromServer,
  getDocs,
  deleteDoc,
  collection,
  query,
  onSnapshot,
  orderBy,
  limit,
  serverTimestamp,
  writeBatch,
  setLogLevel,
} from 'firebase/firestore';
import { FIREBASE_CONFIG } from './config/env';

export const isFirebaseConfigured = Boolean(
  FIREBASE_CONFIG.apiKey &&
    FIREBASE_CONFIG.projectId &&
    !FIREBASE_CONFIG.apiKey.startsWith('your-')
);

let app = null;
let authInstance = null;
let dbInstance = null;

if (isFirebaseConfigured) {
  try {
    app = !getApps().length ? initializeApp(FIREBASE_CONFIG) : getApp();
    authInstance = getAuth(app);
    dbInstance = FIREBASE_CONFIG.firestoreDatabaseId
      ? getFirestore(app, FIREBASE_CONFIG.firestoreDatabaseId)
      : getFirestore(app);
  } catch (err) {
    console.warn('Firebase initialization skipped:', err?.message || err);
  }
}

export const auth = authInstance;
export const db = dbInstance;

// Suppress noisy Firestore internal transport error warnings that can trigger circular object logging
try {
  setLogLevel('silent');
} catch {
  // Ignore in environments where setLogLevel is not supported
}

// Operation types for error handling conforming to Firestore guidelines
export const OperationType = {
  CREATE: 'create',
  UPDATE: 'update',
  DELETE: 'delete',
  LIST: 'list',
  GET: 'get',
  WRITE: 'write',
};

export function handleFirestoreError(error, operationType, path) {
  const errInfo = {
    error: error instanceof Error ? error.message : String(error || 'Unknown Firestore error'),
    operationType,
    path: path || null,
    authInfo: {
      userId: auth.currentUser?.uid || null,
      email: auth.currentUser?.email || null,
      emailVerified: auth.currentUser?.emailVerified || null,
      isAnonymous: auth.currentUser?.isAnonymous || null,
      tenantId: auth.currentUser?.tenantId || null,
      providerInfo:
        auth.currentUser?.providerData?.map((provider) => ({
          providerId: provider?.providerId || null,
          email: provider?.email || null,
        })) || [],
    },
  };
  try {
    console.error('Firestore Error: ', JSON.stringify(errInfo));
  } catch {
    console.error('Firestore Error: ', errInfo.error);
  }
  throw new Error(typeof errInfo.error === 'string' ? errInfo.error : 'Firestore operation failed');
}

// Test connection on boot per Firebase guidelines
export async function testConnection() {
  if (!db) return;
  try {
    await getDocFromServer(doc(db, 'test', 'connection'));
  } catch (error) {
    if (error instanceof Error && error.message.includes('the client is offline')) {
      console.warn('Firebase client is offline or initializing.');
    }
  }
}
testConnection().catch(() => {});

const googleProvider = new GoogleAuthProvider();

export const signInWithGoogle = async () => {
  if (!auth) {
    const err = new Error('Firebase authentication is not configured in .env. Please configure VITE_FIREBASE_* variables or continue as Guest.');
    err.code = 'auth/not-configured';
    throw err;
  }
  try {
    const result = await signInWithPopup(auth, googleProvider);
    const user = result.user;
    if (user) {
      await saveUserProfile(user.uid, {
        displayName: user.displayName || 'Azaad Listener',
        email: user.email || '',
        photoURL: user.photoURL || '',
        lastLogin: serverTimestamp(),
      });
    }
    return user;
  } catch (error) {
    console.error('Google Sign-In Error:', error);
    throw error;
  }
};

export const signInWithEmail = async (email, password) => {
  if (!auth) {
    const err = new Error('Firebase authentication is not configured in .env. Please configure VITE_FIREBASE_* variables or continue as Guest.');
    err.code = 'auth/not-configured';
    throw err;
  }
  try {
    const result = await signInWithEmailAndPassword(auth, email, password);
    if (result.user) {
      await saveUserProfile(result.user.uid, {
        lastLogin: serverTimestamp(),
      });
    }
    return result.user;
  } catch (error) {
    console.error('Email Sign-In Error:', error);
    throw error;
  }
};

export const signUpWithEmail = async (email, password, displayName) => {
  if (!auth) {
    const err = new Error('Firebase authentication is not configured in .env. Please configure VITE_FIREBASE_* variables or continue as Guest.');
    err.code = 'auth/not-configured';
    throw err;
  }
  try {
    const result = await createUserWithEmailAndPassword(auth, email, password);
    if (result.user) {
      if (displayName) {
        await updateProfile(result.user, { displayName });
      }
      await saveUserProfile(result.user.uid, {
        displayName: displayName || result.user.displayName || 'Music Fan',
        email: result.user.email,
        photoURL: result.user.photoURL || '',
        createdAt: serverTimestamp(),
        lastLogin: serverTimestamp(),
      });
    }
    return result.user;
  } catch (error) {
    console.error('Email Sign-Up Error:', error);
    throw error;
  }
};

export const logoutUser = () => (auth ? fbSignOut(auth) : Promise.resolve());

// User Profile Functions
export const saveUserProfile = async (userId, data) => {
  if (!userId || !db) return;
  const path = `users/${userId}`;
  try {
    await setDoc(doc(db, 'users', userId), { ...data, userId }, { merge: true });
  } catch (error) {
    handleFirestoreError(error, OperationType.WRITE, path);
  }
};

export const subscribeToUserProfile = (userId, onUpdate, onError) => {
  if (!userId || !db) {
    onUpdate(null);
    return () => {};
  }
  const path = `users/${userId}`;
  return onSnapshot(
    doc(db, 'users', userId),
    (snap) => {
      onUpdate(snap.exists() ? snap.data() : null);
    },
    (err) => {
      console.warn('User profile sync warning:', err.message);
      if (onError) onError(err);
    }
  );
};

// Recursive sanitizer to guarantee no undefined values reach Firestore
export const sanitizeForFirestore = (obj) => {
  if (obj === null || obj === undefined) return null;
  if (typeof obj !== 'object') return obj;
  if (Array.isArray(obj)) {
    return obj
      .map((item) => sanitizeForFirestore(item))
      .filter((item) => item !== undefined);
  }
  const clean = {};
  for (const [key, value] of Object.entries(obj)) {
    if (value !== undefined) {
      if (typeof value === 'object' && value !== null && !value.toMillis) {
        clean[key] = sanitizeForFirestore(value);
      } else {
        clean[key] = value;
      }
    }
  }
  return clean;
};

// Guarantee consistent, clean song structure with zero undefined values
export const sanitizeSongForStorage = (song) => {
  if (!song) return null;
  const sId = String(song.id || song.songId || song.videoId || `track_${Date.now()}`);
  return {
    id: sId,
    songId: sId,
    title: String(song.title || 'Untitled Track'),
    artist: String(song.artist || song.singers || 'Unknown Artist'),
    singers: String(song.singers || song.artist || 'Unknown Artist'),
    album: String(song.album || ''),
    genre: String(song.genre || song.category || 'Music'),
    category: String(song.category || song.genre || 'Pop'),
    coverUrl: String(song.coverUrl || song.artwork || 'https://images.unsplash.com/photo-1514525253161-7a46d19cd819?w=600&q=80'),
    audioUrl: String(song.audioUrl || song.url || song.streamUrl || ''),
    duration: typeof song.duration === 'number' && !isNaN(song.duration) ? song.duration : 180,
    source: String(song.source || 'global'),
    isFullSong: Boolean(song.isFullSong ?? true),
    playCount: typeof song.playCount === 'number' ? song.playCount : 0,
    vibe: String(song.vibe || ''),
    ...(song.videoId ? { videoId: String(song.videoId) } : {}),
    ...(song.youtubeId ? { youtubeId: String(song.youtubeId) } : {}),
  };
};

// Liked Songs Functions
export const subscribeToLikedSongs = (userId, onUpdate, onError) => {
  if (!userId || !db) {
    onUpdate([]);
    return () => {};
  }
  const path = `users/${userId}/likedSongs`;
  const q = collection(db, path);
  return onSnapshot(
    q,
    (snapshot) => {
      const liked = snapshot.docs.map((d) => {
        const data = d.data();
        const clean = sanitizeSongForStorage({ id: d.id, ...data });
        return {
          ...clean,
          likedAt: data.likedAt,
        };
      });

      // Sort newest liked songs first
      liked.sort((a, b) => {
        const getMs = (item) => {
          if (!item) return 0;
          if (item.toMillis) return item.toMillis();
          if (typeof item === 'number') return item;
          if (typeof item === 'string') return new Date(item).getTime() || 0;
          return 0;
        };
        const timeA = getMs(a.likedAt);
        const timeB = getMs(b.likedAt);
        return timeB - timeA;
      });

      onUpdate(liked);
    },
    (err) => {
      console.warn('Liked songs sync warning:', err.message);
      if (onError) onError(err);
    }
  );
};

export const toggleCloudLikeSong = async (userId, song) => {
  if (!userId || !song || !db) return false;
  const cleanSong = sanitizeSongForStorage(song);
  if (!cleanSong || !cleanSong.id) return false;
  const songId = cleanSong.id;
  const path = `users/${userId}/likedSongs/${songId}`;
  const songDocRef = doc(db, `users/${userId}/likedSongs`, songId);
  try {
    const docSnap = await getDoc(songDocRef);
    if (docSnap.exists()) {
      await deleteDoc(songDocRef);
      return false; // unliked
    } else {
      const payload = sanitizeForFirestore({
        ...cleanSong,
        likedAt: serverTimestamp(),
      });
      await setDoc(songDocRef, payload);
      return true; // liked
    }
  } catch (error) {
    handleFirestoreError(error, OperationType.WRITE, path);
  }
};

// Playlists Functions
export const subscribeToUserPlaylists = (userId, onUpdate, onError) => {
  if (!userId || !db) {
    onUpdate([]);
    return () => {};
  }
  const path = `users/${userId}/playlists`;
  const q = collection(db, path);
  return onSnapshot(
    q,
    (snapshot) => {
      const playlists = snapshot.docs.map((d) => {
        const data = d.data();
        const rawTracks = Array.isArray(data.tracks) ? data.tracks : [];
        const tracks = rawTracks.map(sanitizeSongForStorage).filter(Boolean);
        const songIds = Array.isArray(data.songIds) && data.songIds.length > 0
          ? data.songIds
          : tracks.map((t) => String(t.id || t.songId)).filter(Boolean);
        const coverUrl = data.coverUrl || tracks[0]?.coverUrl || 'https://images.unsplash.com/photo-1514525253161-7a46d19cd819?w=600&q=80';
        return {
          id: d.id,
          ...data,
          tracks,
          songIds,
          trackCount: tracks.length,
          coverUrl,
        };
      });

      // Sort newest updated first
      playlists.sort((a, b) => {
        const getMs = (item) => {
          if (!item) return 0;
          if (item.toMillis) return item.toMillis();
          if (typeof item === 'number') return item;
          if (typeof item === 'string') return new Date(item).getTime() || 0;
          return 0;
        };
        const timeA = getMs(a.updatedAt) || getMs(a.createdAt);
        const timeB = getMs(b.updatedAt) || getMs(b.createdAt);
        return timeB - timeA;
      });

      onUpdate(playlists);
    },
    (err) => {
      console.warn('Playlists sync warning:', err.message);
      if (onError) onError(err);
    }
  );
};

export const saveCloudPlaylist = async (userId, playlist) => {
  if (!userId || !playlist || !db) return;
  const playlistId = playlist.id || `pl_${Date.now()}`;
  const path = `users/${userId}/playlists/${playlistId}`;
  const plRef = doc(db, `users/${userId}/playlists`, playlistId);
  try {
    const rawTracks = Array.isArray(playlist.tracks) ? playlist.tracks : [];
    const tracks = rawTracks.map(sanitizeSongForStorage).filter(Boolean);
    const songIds = Array.isArray(playlist.songIds) && playlist.songIds.length > 0
      ? playlist.songIds
      : tracks.map((t) => String(t.id || t.songId)).filter(Boolean);
    const coverUrl = playlist.coverUrl || tracks[0]?.coverUrl || 'https://images.unsplash.com/photo-1514525253161-7a46d19cd819?w=600&q=80';

    const cleanData = sanitizeForFirestore({
      id: playlistId,
      name: playlist.name || 'Untitled Playlist',
      description: playlist.description || '',
      coverUrl,
      trackCount: tracks.length,
      tracks,
      songIds,
      updatedAt: serverTimestamp(),
      createdAt: playlist.createdAt || serverTimestamp(),
    });

    await setDoc(plRef, cleanData, { merge: true });
    return playlistId;
  } catch (error) {
    handleFirestoreError(error, OperationType.WRITE, path);
  }
};

export const deleteCloudPlaylist = async (userId, playlistId) => {
  if (!userId || !playlistId || !db) return;
  const path = `users/${userId}/playlists/${playlistId}`;
  try {
    await deleteDoc(doc(db, `users/${userId}/playlists`, playlistId));
  } catch (error) {
    handleFirestoreError(error, OperationType.DELETE, path);
  }
};

export const addSongToCloudPlaylist = async (userId, playlistId, song) => {
  if (!userId || !playlistId || !song || !db) return;
  const path = `users/${userId}/playlists/${playlistId}`;
  try {
    const plRef = doc(db, `users/${userId}/playlists`, playlistId);
    const snap = await getDoc(plRef);
    const cleanSong = sanitizeSongForStorage(song);
    if (!cleanSong) return;
    const songId = cleanSong.id;

    if (snap.exists()) {
      const plData = snap.data();
      const rawTracks = Array.isArray(plData.tracks) ? plData.tracks : [];
      const existingTracks = rawTracks.map(sanitizeSongForStorage).filter(Boolean);
      if (!existingTracks.some((t) => String(t.id || t.songId) === songId)) {
        const updatedTracks = [...existingTracks, cleanSong];
        const songIds = updatedTracks.map((t) => String(t.id || t.songId)).filter(Boolean);
        const coverUrl = plData.coverUrl || cleanSong.coverUrl || 'https://images.unsplash.com/photo-1514525253161-7a46d19cd819?w=600&q=80';
        
        const updatePayload = sanitizeForFirestore({
          tracks: updatedTracks,
          songIds,
          trackCount: updatedTracks.length,
          coverUrl,
          updatedAt: serverTimestamp(),
        });

        await setDoc(plRef, updatePayload, { merge: true });
      }
    } else {
      const initialPayload = sanitizeForFirestore({
        id: playlistId,
        name: 'My Playlist',
        description: '',
        tracks: [cleanSong],
        songIds: [songId],
        trackCount: 1,
        coverUrl: cleanSong.coverUrl || 'https://images.unsplash.com/photo-1514525253161-7a46d19cd819?w=600&q=80',
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
      });
      await setDoc(plRef, initialPayload, { merge: true });
    }
  } catch (error) {
    handleFirestoreError(error, OperationType.UPDATE, path);
  }
};

export const removeSongFromCloudPlaylist = async (userId, playlistId, songId) => {
  if (!userId || !playlistId || !songId || !db) return;
  const path = `users/${userId}/playlists/${playlistId}`;
  try {
    const plRef = doc(db, `users/${userId}/playlists`, playlistId);
    const snap = await getDoc(plRef);
    if (snap.exists()) {
      const plData = snap.data();
      const rawTracks = Array.isArray(plData.tracks) ? plData.tracks : [];
      const existingTracks = rawTracks.map(sanitizeSongForStorage).filter(Boolean);
      const sIdStr = String(songId);
      const updatedTracks = existingTracks.filter((t) => String(t.id || t.songId) !== sIdStr);
      const songIds = updatedTracks.map((t) => String(t.id || t.songId)).filter(Boolean);
      
      const updatePayload = sanitizeForFirestore({
        tracks: updatedTracks,
        songIds,
        trackCount: updatedTracks.length,
        updatedAt: serverTimestamp(),
      });

      await setDoc(plRef, updatePayload, { merge: true });
    }
  } catch (error) {
    handleFirestoreError(error, OperationType.UPDATE, path);
  }
};

// Play History Functions
export const recordSongPlay = async (userId, song) => {
  if (!userId || !song || !song.id || !db) return;
  const songKey = String(song.id).replace(/[^a-zA-Z0-9_-]/g, '_').slice(0, 80);
  const path = `users/${userId}/playHistory/${songKey}`;
  try {
    const histRef = doc(db, `users/${userId}/playHistory`, songKey);
    await setDoc(
      histRef,
      {
        id: songKey,
        songId: String(song.id),
        title: song.title || 'Untitled',
        artist: song.artist || song.singers || 'Unknown Artist',
        coverUrl: song.coverUrl || '',
        audioUrl: song.audioUrl || '',
        source: song.source || 'global',
        genre: song.genre || song.category || 'Music',
        duration: song.duration || 180,
        playedAt: serverTimestamp(),
      },
      { merge: true }
    );
  } catch (error) {
    console.warn('Record song play warning:', error.message);
  }
};

export const subscribeToPlayHistory = (userId, onUpdate, onError, limitCount = 30) => {
  if (!userId || !db) {
    onUpdate([]);
    return () => {};
  }
  const path = `users/${userId}/playHistory`;
  const q = query(
    collection(db, path),
    orderBy('playedAt', 'desc'),
    limit(limitCount)
  );
  return onSnapshot(
    q,
    (snapshot) => {
      const history = snapshot.docs.map((d) => ({
        id: d.id,
        ...d.data(),
      }));
      onUpdate(history);
    },
    (err) => {
      console.warn('Play history sync warning:', err.message);
      if (onError) onError(err);
    }
  );
};

export const clearPlayHistory = async (userId) => {
  if (!userId || !db) return;
  const path = `users/${userId}/playHistory`;
  try {
    const q = query(collection(db, path), limit(100));
    const snap = await getDocs(q);
    const batch = writeBatch(db);
    snap.docs.forEach((d) => batch.delete(d.ref));
    await batch.commit();
  } catch (error) {
    handleFirestoreError(error, OperationType.DELETE, path);
  }
};

// Search History Functions
export const recordSearchQuery = async (userId, queryText, filter = 'all') => {
  if (!userId || !queryText || !queryText.trim() || !db) return;
  const cleanQ = queryText.trim();
  const searchId = cleanQ.toLowerCase().replace(/[^a-zA-Z0-9_-]/g, '_').slice(0, 64);
  const path = `users/${userId}/searchHistory/${searchId}`;
  try {
    const ref = doc(db, `users/${userId}/searchHistory`, searchId);
    await setDoc(
      ref,
      {
        id: searchId,
        query: cleanQ,
        filter: filter || 'all',
        searchedAt: serverTimestamp(),
      },
      { merge: true }
    );
  } catch (error) {
    console.warn('Record search warning:', error.message);
  }
};

export const subscribeToSearchHistory = (userId, onUpdate, onError, limitCount = 20) => {
  if (!userId || !db) {
    onUpdate([]);
    return () => {};
  }
  const path = `users/${userId}/searchHistory`;
  const q = query(
    collection(db, path),
    orderBy('searchedAt', 'desc'),
    limit(limitCount)
  );
  return onSnapshot(
    q,
    (snapshot) => {
      const history = snapshot.docs.map((d) => ({
        id: d.id,
        ...d.data(),
      }));
      onUpdate(history);
    },
    (err) => {
      console.warn('Search history sync warning:', err.message);
      if (onError) onError(err);
    }
  );
};

export const removeSearchHistoryItem = async (userId, id) => {
  if (!userId || !id || !db) return;
  const path = `users/${userId}/searchHistory/${id}`;
  try {
    await deleteDoc(doc(db, `users/${userId}/searchHistory`, id));
  } catch (error) {
    handleFirestoreError(error, OperationType.DELETE, path);
  }
};

export const clearSearchHistory = async (userId) => {
  if (!userId || !db) return;
  const path = `users/${userId}/searchHistory`;
  try {
    const q = query(collection(db, path), limit(100));
    const snap = await getDocs(q);
    const batch = writeBatch(db);
    snap.docs.forEach((d) => batch.delete(d.ref));
    await batch.commit();
  } catch (error) {
    handleFirestoreError(error, OperationType.DELETE, path);
  }
};

// Podcast Subscriptions Functions
export const subscribeToPodcastSubscriptions = (userId, onUpdate, onError) => {
  if (!userId || !db) {
    onUpdate([]);
    return () => {};
  }
  const path = `users/${userId}/podcastSubscriptions`;
  const q = collection(db, path);
  return onSnapshot(
    q,
    (snapshot) => {
      const subs = snapshot.docs.map((d) => {
        const data = d.data();
        return {
          id: d.id,
          seriesId: d.id,
          ...data,
        };
      });
      onUpdate(subs);
    },
    (err) => {
      console.warn('Podcast subscription sync warning:', err.message);
      if (onError) onError(err);
    }
  );
};

export const togglePodcastSubscription = async (userId, series) => {
  if (!userId || !series || !db) return false;
  const seriesId = String(series.id || series.seriesId);
  const path = `users/${userId}/podcastSubscriptions/${seriesId}`;
  const subDocRef = doc(db, `users/${userId}/podcastSubscriptions`, seriesId);
  try {
    const docSnap = await getDoc(subDocRef);
    if (docSnap.exists()) {
      await deleteDoc(subDocRef);
      return false; // unsubscribed
    } else {
      const payload = sanitizeForFirestore({
        id: seriesId,
        seriesId,
        title: series.title || 'Untitled Series',
        host: series.host || 'Podcast Creator',
        coverUrl: series.coverUrl || '',
        category: series.category || 'General',
        totalEpisodes: series.totalEpisodes || series.episodes?.length || 0,
        subscribedAt: serverTimestamp(),
      });
      await setDoc(subDocRef, payload);
      return true; // subscribed
    }
  } catch (error) {
    handleFirestoreError(error, OperationType.WRITE, path);
    return false;
  }
};

