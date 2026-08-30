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
  deleteDoc,
  collection,
  query,
  onSnapshot,
  orderBy,
  serverTimestamp,
} from 'firebase/firestore';
import firebaseConfig from '../../firebase-applet-config.json';

const app = !getApps().length ? initializeApp(firebaseConfig) : getApp();
export const auth = getAuth(app);
export const db = firebaseConfig.firestoreDatabaseId
  ? getFirestore(app, firebaseConfig.firestoreDatabaseId)
  : getFirestore(app);

const googleProvider = new GoogleAuthProvider();

export const signInWithGoogle = async () => {
  try {
    const result = await signInWithPopup(auth, googleProvider);
    const user = result.user;
    if (user) {
      await setDoc(
        doc(db, 'users', user.uid),
        {
          userId: user.uid,
          displayName: user.displayName || 'Azaad Listener',
          email: user.email || '',
          photoURL: user.photoURL || '',
          lastLogin: serverTimestamp(),
        },
        { merge: true }
      );
    }
    return user;
  } catch (error) {
    console.error('Google Sign-In Error:', error);
    throw error;
  }
};

export const signInWithEmail = (email, password) =>
  signInWithEmailAndPassword(auth, email, password);

export const signUpWithEmail = async (email, password, displayName) => {
  const result = await createUserWithEmailAndPassword(auth, email, password);
  if (displayName && result.user) {
    await updateProfile(result.user, { displayName });
    await setDoc(
      doc(db, 'users', result.user.uid),
      {
        userId: result.user.uid,
        displayName: displayName,
        email: result.user.email,
        createdAt: serverTimestamp(),
      },
      { merge: true }
    );
  }
  return result.user;
};

export const logoutUser = () => fbSignOut(auth);

// Subscribe to User Liked Songs (real-time)
export const subscribeToLikedSongs = (userId, onUpdate, onError) => {
  if (!userId) {
    onUpdate([]);
    return () => {};
  }
  const q = query(
    collection(db, `users/${userId}/likedSongs`),
    orderBy('likedAt', 'desc')
  );
  return onSnapshot(
    q,
    (snapshot) => {
      const liked = snapshot.docs.map((doc) => ({
        id: doc.id,
        ...doc.data(),
      }));
      onUpdate(liked);
    },
    (err) => {
      console.warn('Liked songs sync error:', err.message);
      if (onError) onError(err);
    }
  );
};

// Toggle Like Song in Cloud Firestore
export const toggleCloudLikeSong = async (userId, song) => {
  if (!userId || !song || !song.id) return;
  const songDocRef = doc(db, `users/${userId}/likedSongs`, String(song.id));
  const docSnap = await getDoc(songDocRef);

  if (docSnap.exists()) {
    await deleteDoc(songDocRef);
    return false; // unliked
  } else {
    await setDoc(songDocRef, {
      songId: String(song.id),
      title: song.title || 'Untitled',
      artist: song.artist || song.singers || 'Unknown Artist',
      singers: song.singers || song.artist || 'Unknown Artist',
      album: song.album || '',
      category: song.category || 'Pop',
      genre: song.genre || 'Music',
      coverUrl: song.coverUrl || '',
      audioUrl: song.audioUrl || '',
      duration: song.duration || 180,
      source: song.source || 'global',
      isFullSong: song.isFullSong ?? true,
      likedAt: serverTimestamp(),
    });
    return true; // liked
  }
};

// Subscribe to User Custom Playlists (real-time)
export const subscribeToUserPlaylists = (userId, onUpdate, onError) => {
  if (!userId) {
    onUpdate([]);
    return () => {};
  }
  const q = query(
    collection(db, `users/${userId}/playlists`),
    orderBy('updatedAt', 'desc')
  );
  return onSnapshot(
    q,
    (snapshot) => {
      const playlists = snapshot.docs.map((doc) => ({
        id: doc.id,
        ...doc.data(),
      }));
      onUpdate(playlists);
    },
    (err) => {
      console.warn('Playlists sync error:', err.message);
      if (onError) onError(err);
    }
  );
};

// Create or Update Playlist in Cloud Firestore
export const saveCloudPlaylist = async (userId, playlist) => {
  if (!userId || !playlist) return;
  const playlistId = playlist.id || `pl_${Date.now()}`;
  const plRef = doc(db, `users/${userId}/playlists`, playlistId);
  await setDoc(
    plRef,
    {
      id: playlistId,
      name: playlist.name || 'Untitled Playlist',
      description: playlist.description || '',
      coverUrl: playlist.coverUrl || 'https://images.unsplash.com/photo-1514525253161-7a46d19cd819?w=600&q=80',
      trackCount: (playlist.tracks || []).length,
      tracks: playlist.tracks || [],
      updatedAt: serverTimestamp(),
      createdAt: playlist.createdAt || serverTimestamp(),
    },
    { merge: true }
  );
  return playlistId;
};

// Delete Playlist from Cloud Firestore
export const deleteCloudPlaylist = async (userId, playlistId) => {
  if (!userId || !playlistId) return;
  const plRef = doc(db, `users/${userId}/playlists`, playlistId);
  await deleteDoc(plRef);
};
