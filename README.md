# Azaad Music — Hi-Fi Global Music & Podcast Streaming Platform

**Azaad Music** is a full-stack, studio-grade music and podcast streaming web application built with **React 18**, **Vite**, **Tailwind CSS v4**, **Express 5 (TypeScript)**, and **Firebase (Authentication & Cloud Firestore)**.

It delivers uninterrupted full-length playback across global viral hits, international charts, independent Audius artists, and curated podcast shows—complete with real-time synchronized karaoke lyrics, custom cloud playlists, listening telemetry, and multi-tier audio failover.

---

## Table of Contents

- [Key Features](#key-features)
- [Architecture & Tech Stack](#architecture--tech-stack)
- [Hybrid Audio Streaming Engine](#hybrid-audio-streaming-engine)
- [Environment Configuration (`.env`)](#environment-configuration-env)
- [Quick Start & Local Development](#quick-start--local-development)
- [Project Structure](#project-structure)
- [Backend API Reference](#backend-api-reference)
- [Cloud Firestore Schema & Security Rules](#cloud-firestore-schema--security-rules)
- [Production Build & Deployment](#production-build--deployment)
- [Security & Privacy Best Practices](#security--privacy-best-practices)
- [License](#license)

---

## Key Features

### 1. Multi-Source Global Music Discovery
- **Hourly Updated Top Charts**: Automatically refreshes trending global hits every hour using live Apple Music / iTunes Top Charts, YouTube Music releases, and decentralized Audius discovery nodes.
- **Organized Browse Modes**: Seamlessly switch between **Curated Shelves**, **Responsive Album Grid**, and **Compact Tracklist Table** views.
- **Smart Command-Palette Search (`⌘K` / `/`)**: Instant unified search with voice recognition support, scope filters (`All Sources`, `YouTube HD`, `Top Charts`, `Artists`, `Genres`), and cloud-synced search history.

### 2. Studio Vinyl Deck & Synchronized Lyrics
- **Full-Screen Studio Player (`MusicPlayerPage`)**: Features a tactile spinning vinyl turntable, interactive tonearm, live equalizer visualization, and dynamic artwork ambient backdrop.
- **Real-Time LRC Karaoke Lyrics**: Fetches time-synced LRC and plain lyrics from LRCLIB with line-by-line auto-scroll and interactive timestamp seeking.
- **Persistent Bottom Player Bar (`PlayerBar`)**: Docked studio transport with seek bar, volume slider, shuffle, repeat modes, queue drawer, and MediaSession API integration (lock-screen controls & background playback).

### 3. Dedicated Podcast Studio & Shows Hub
- **Podcast Directory & Series Browser (`PodcastsView`)**: Explore deep-dive episodes across Technology, Health & Science, Business & Startups, Culture & Mindset, True Crime, and History.
- **Podcast-Optimized Playback Controls**: Variable playback speed (`0.75x` to `2.0x`), `-15s` / `+30s` skip buttons, interactive chapter markers, sleep timer (`15m`, `30m`, `45m`, `60m`, or end of episode), and automatic resume-position persistence.

### 4. Real-Time Firebase Cloud Sync & User Profile
- **Authentication (`AuthGate`)**: Supports 1-click Google OAuth (`signInWithPopup`), Email/Password registration & sign-in, and instant Guest mode.
- **Studio Listener Profile (`UserProfileView`)**:
  - Customizable avatar presets, custom avatar URLs, listener bio, primary music vibe, and preferred streaming bitrate (`320kbps Master`, `256kbps`, `128kbps`).
  - Automatic **Music Persona** & **Top Artists Listening DNA** calculated from personal stream history and liked tracks.
  - Real-time Cloud Firestore synchronization for **Liked Songs**, **Custom Playlists**, **Play History**, **Search History**, and **Podcast Subscriptions**.

---

## Architecture & Tech Stack

| Layer | Technology |
| :--- | :--- |
| **Frontend Framework** | React 18 (Functional Components & Hooks), Vite 5 |
| **Styling & Design System** | Tailwind CSS v4 (`@tailwindcss/vite`), Custom Studio Dark Glassmorphism |
| **Icons** | `@phosphor-icons/react` & `lucide-react` |
| **Backend Server** | Node.js, Express 5 (`server.ts` executed via `tsx` in dev, bundled via `esbuild` in prod) |
| **Authentication & Database** | Firebase v10 (`firebase/auth` & `firebase/firestore`) |
| **Audio & Media Engines** | HTML5 Audio API, YouTube IFrame Player API, Audius REST API, JioSaavn 320kbps Stream Resolver, LRCLIB Synced Lyrics API, IndexedDB (Local Uploads) |

---

## Hybrid Audio Streaming Engine

Azaad Music uses a multi-tier audio resolution pipeline so every track plays reliably without dead links or playback interruptions:

1. **Tier 1 — High-Bitrate Native Audio (`320kbps` / `M4A`)**: Resolves direct studio streams via `/api/audio/resolve` (JioSaavn 320kbps, Audius decentralized nodes, and Apple iTunes M4A streams) for zero-latency HTML5 `<audio>` playback and background tab/lock-screen support.
2. **Tier 2 — Multi-Candidate YouTube HD Failover**: Resolves multiple verified YouTube video IDs per track (`/api/youtube/resolve`) and automatically skips restricted or unavailable embeds (`onError` codes `2`, `5`, `100`, `101`, `150`) to the next playable candidate or native audio stream.
3. **Tier 3 — Cross-Origin Range Proxy (`/api/audio/proxy`)**: Streams external podcast and audio URLs with full HTTP `206 Partial Content` (`Range` header) support for instant seeking.
4. **Tier 4 — Client-Side IndexedDB Storage**: Allows users to upload and play local audio files directly in their browser with zero server storage overhead.

---

## Environment Configuration (`.env`)

All sensitive credentials, Firebase keys, OAuth identifiers, and branding asset URLs are externalized into `.env` and loaded via `/src/config/env.js` (client) and `process.env` (server). **No API keys or secrets are hardcoded in source files.**

### Setup Instructions

1. Copy the template file to create your local `.env`:
   ```bash
   cp .env.example .env
   ```
2. Populate `.env` with your project credentials:

```dotenv
# ─────────────────────────────────────────────────────────────────────────────
# Server Runtime Configuration
# ─────────────────────────────────────────────────────────────────────────────
NODE_ENV=development
PORT=3000
CACHE_TTL_MS=3600000
AUDIUS_APP_NAME=AZAAD_MUSIC_PLAYER

# ─────────────────────────────────────────────────────────────────────────────
# Branding & Public Asset Configuration
# ─────────────────────────────────────────────────────────────────────────────
VITE_APP_NAME="Azaad Music"
VITE_APP_LOGO_URL="/img/Logo.png"
VITE_APP_FAVICON_URL="/img/favicon.png"

# ─────────────────────────────────────────────────────────────────────────────
# Streaming Engine Configuration
# ─────────────────────────────────────────────────────────────────────────────
VITE_AUDIUS_APP_NAME="AZAAD_MUSIC_PLAYER"

# ─────────────────────────────────────────────────────────────────────────────
# Firebase Authentication & Cloud Firestore Configuration
# ─────────────────────────────────────────────────────────────────────────────
VITE_FIREBASE_PROJECT_ID="your-firebase-project-id"
VITE_FIREBASE_APP_ID="your-firebase-app-id"
VITE_FIREBASE_API_KEY="your-firebase-api-key"
VITE_FIREBASE_AUTH_DOMAIN="your-firebase-project-id.firebaseapp.com"
VITE_FIREBASE_FIRESTORE_DATABASE_ID="(default)"
VITE_FIREBASE_STORAGE_BUCKET="your-firebase-project-id.firebasestorage.app"
VITE_FIREBASE_MESSAGING_SENDER_ID="your-messaging-sender-id"
VITE_FIREBASE_MEASUREMENT_ID=""
VITE_FIREBASE_OAUTH_CLIENT_ID="your-google-oauth-client-id.apps.googleusercontent.com"
VITE_FIREBASE_RECAPTCHA_SITE_KEY=""
```

### Environment Variable Reference

| Variable | Scope | Description |
| :--- | :--- | :--- |
| `NODE_ENV` | Server | Runtime environment (`development` or `production`). |
| `PORT` | Server | HTTP server port (default: `3000`). |
| `CACHE_TTL_MS` | Server | In-memory cache TTL in milliseconds for charts, search, and lyrics (default: `3600000` / 1 hour). |
| `AUDIUS_APP_NAME` | Server | Application identifier sent to Audius REST API endpoints. |
| `VITE_APP_NAME` | Client | Application display name. |
| `VITE_APP_LOGO_URL` | Client | URL or local path for the brand logo rendered across Sidebar, Header, Player, and Auth screens. |
| `VITE_APP_FAVICON_URL` | Client | URL or local path for the browser favicon and Apple touch icon in `index.html`. |
| `VITE_AUDIUS_APP_NAME` | Client | Client-side Audius API application identifier. |
| `VITE_FIREBASE_PROJECT_ID` | Client | Firebase project ID. |
| `VITE_FIREBASE_APP_ID` | Client | Firebase web application ID. |
| `VITE_FIREBASE_API_KEY` | Client | Firebase web API key for Auth & Firestore initialization. |
| `VITE_FIREBASE_AUTH_DOMAIN` | Client | Firebase Authentication domain (`<project-id>.firebaseapp.com`). |
| `VITE_FIREBASE_FIRESTORE_DATABASE_ID` | Client | Named Cloud Firestore database ID (or `(default)`). |
| `VITE_FIREBASE_STORAGE_BUCKET` | Client | Firebase Cloud Storage bucket domain. |
| `VITE_FIREBASE_MESSAGING_SENDER_ID` | Client | Firebase Cloud Messaging sender ID. |
| `VITE_FIREBASE_OAUTH_CLIENT_ID` | Client | Google OAuth 2.0 Web Client ID. |

---

## Quick Start & Local Development

### Prerequisites
- **Node.js** `v18+` (recommended `v20+`)
- **npm** `v9+`

### Installation & Running Locally

1. **Install dependencies:**
   ```bash
   npm install
   ```

2. **Configure environment variables:**
   ```bash
   cp .env.example .env
   ```

3. **Start the full-stack development server (Express + Vite Middleware on port `3000`):**
   ```bash
   npm run dev
   ```

4. **Open in browser:**
   Navigate to `http://localhost:3000`

---

## Project Structure

```text
.
├── .env.example                       # Safe environment variable template (no secrets)
├── .gitignore                         # Ignores .env, node_modules, dist, and local configs
├── index.html                         # SPA entry point with SEO meta & dynamic favicon
├── metadata.json                      # Application metadata
├── package.json                       # Scripts and dependencies
├── server.ts                          # Express 5 API server + Vite middleware integration
├── vite.config.js                     # Vite 5 + React + Tailwind CSS v4 configuration
├── firestore.rules                    # Cloud Firestore security rules
├── firebase-blueprint.json            # Firestore entity schemas & collection definitions
└── src/
    ├── main.jsx                       # React DOM root mount
    ├── App.jsx                        # Main application state, views, and cloud sync hooks
    ├── index.css                      # Tailwind CSS v4 imports, custom scrollbars, animations
    ├── firebase.js                    # Firebase Auth & Firestore CRUD / real-time listeners
    ├── config/
    │   └── env.js                     # Centralized environment variable loader (import.meta.env)
    ├── services/
    │   ├── musicService.js            # Multi-source music catalog, search, and stream resolver
    │   └── podcastService.js          # Podcast series catalog, episodes, chapters, and progress
    ├── utils/
    │   └── musicUtils.js              # Track normalization, cover art sanitization, formatters
    └── components/
        ├── AuthGate.jsx               # Google OAuth, Email/Password, and Guest authentication UI
        ├── Sidebar.jsx                # Collapsible studio navigation & quick genre selector
        ├── GlobalSearch.jsx           # Command-palette search bar with voice & scope filters
        ├── PlayerBar.jsx              # Persistent bottom audio player, queue drawer, podcast bar
        ├── MusicPlayerPage.jsx        # Full-screen vinyl studio deck & real-time LRC lyrics
        ├── PodcastsView.jsx           # Podcast directory, show pages, speed & sleep timer controls
        ├── ExplorePodcastsSection.jsx # Featured podcast shelf on the Explore view
        ├── PodcastEpisodeCard.jsx     # Individual podcast episode card with progress tracking
        ├── UserProfileView.jsx        # Listener profile, listening DNA, history & cloud settings
        ├── Playlists.jsx              # Custom cloud playlist manager & tracklist view
        ├── SongCard.jsx               # Ranked, Grid, Compact, and List track cards
        ├── ArtistCard.jsx             # Artist spotlight card
        ├── ArtistsView.jsx            # All Artists directory grid
        └── EditModal.jsx              # Track metadata editor modal
```

---

## Backend API Reference

All backend routes are served by `server.ts` on the same origin (`/api/*`):

| Method | Endpoint | Description |
| :--- | :--- | :--- |
| `GET` | `/api/health` | Returns server status (`{ status: "ok", engine: "Azaad Hybrid Streaming Engine" }`). |
| `GET` | `/api/explore/google-trends` | Fetches hourly trending tracks by `genre` (`?genre=All&force=false`) combining Apple Top Charts and YouTube Music. |
| `GET` | `/api/google/search` | Searches global music tracks (`?q=<query>`) with high-resolution artwork and playable IDs. |
| `GET` | `/api/google/lyrics` | Resolves time-synced LRC and plain lyrics (`?title=<title>&artist=<artist>&duration=<sec>`) via LRCLIB. |
| `GET` | `/api/youtube/search` | Searches YouTube Music videos (`?q=<query>&limit=20`) with multi-tier failover (YouTube Web, Piped, Invidious). |
| `GET` | `/api/youtube/resolve` | Resolves playable YouTube candidate video IDs (`?title=<title>&artist=<artist>`). |
| `GET` | `/api/audio/resolve` | Resolves direct `320kbps` / `M4A` audio streams (`?title=<title>&artist=<artist>&videoId=<id>`) across JioSaavn, Audius, and iTunes. |
| `GET` | `/api/audio/proxy` | Streams cross-origin audio (`?url=<encoded_url>`) with full HTTP `Range` (`206 Partial Content`) support. |

---

## Cloud Firestore Schema & Security Rules

User data is isolated under `/users/{userId}` and protected by `firestore.rules` so only the authenticated owner (`request.auth.uid == userId`) can read or write their private subcollections:

- `/users/{userId}` — **UserProfile**: `displayName`, `email`, `photoURL`, `bio`, `favoriteGenre`, `audioQuality`, `createdAt`, `lastLogin`
- `/users/{userId}/likedSongs/{songId}` — **LikedSong**: Normalized track metadata + `likedAt` timestamp
- `/users/{userId}/playlists/{playlistId}` — **Playlist**: `name`, `description`, `coverUrl`, `trackCount`, `tracks[]`, `songIds[]`, `createdAt`, `updatedAt`
- `/users/{userId}/playHistory/{historyId}` — **PlayHistory**: Recently streamed tracks ordered by `playedAt`
- `/users/{userId}/searchHistory/{searchId}` — **SearchHistory**: Recent search queries and active filters ordered by `searchedAt`
- `/users/{userId}/podcastSubscriptions/{seriesId}` — **PodcastSubscription**: Subscribed podcast shows ordered by `subscribedAt`

---

## Production Build & Deployment

1. **Build the client bundle and server bundle:**
   ```bash
   npm run build
   ```
   - Compiles the React + Tailwind frontend into `dist/` via `vite build`.
   - Bundles `server.ts` into `dist/server.cjs` via `esbuild`.

2. **Start the production server:**
   ```bash
   NODE_ENV=production npm start
   ```

---

## Security & Privacy Best Practices

- **Zero Hardcoded Secrets**: All Firebase API keys, project identifiers, OAuth client IDs, and asset endpoints live exclusively in `.env`.
- **Git Protection**: `.gitignore` blocks `.env`, `.env.*` (except `.env.example`), and `firebase-applet-config.json` from ever being committed.
- **Strict Ownership Rules**: `firestore.rules` enforces per-user document isolation across all subcollections.

---

## License

MIT License
