# Bangla AudioBook Platform

A mono-repo containing the core services of the **Bangla AudioBook** community-driven audiobook platform.

```
audiobook-platform/
├── app/              # Expo (React Native + TypeScript) mobile app — runs via Expo Go
├── platform-api/     # FastAPI Platform API backend
└── tts-service/      # FastAPI AI TTS Service (Bangla VITS & XTTS v2 TTS synthesis)
```

---

## Architecture

```
React Native App (Expo Go)
       │
       ▼
Platform API (FastAPI) [Port: 8000]
       │
       ▼ (HTTP / Webhook Dispatch)
TTS Service (FastAPI) [Port: 8001]
   ├── Bangla VITS (EMTIAZZ/bangladeshi-bangla-tts-vits)
   └── Coqui XTTS v2 (multilingual voice cloning & expressive speech)
       │
       ▼ (output audio)
Object Storage / CDN
       │
       ▼ (audio_url)
React Native Player (expo-audio)
```

---

## 1. `app/` — Expo Mobile App

Uses the **Expo managed workflow** — run instantly on your phone with the [Expo Go](https://expo.dev/go) app, no native build required.

### Tech Stack

| Technology | Purpose |
|---|---|
| React Native + TypeScript | Core mobile framework |
| Expo (managed workflow) | Build tooling + native module access |
| React Navigation | Screen navigation (native-stack + bottom-tabs) |
| expo-audio | Modern audio playback (New Architecture & Expo Go compatible) |
| expo-secure-store | Secure JWT token storage |
| expo-document-picker | PDF file picker |

### Project Structure

```
app/src/
├── api/            # Typed API client modules (auth, audiobooks, library, playback, generation)
├── components/     # Reusable UI components (AudiobookCard, ChapterItem, AudioPlayer, …)
├── contexts/       # AuthContext (session), PlayerContext (audio playback)
├── navigation/     # AppNavigator, AuthNavigator, MainNavigator
├── screens/        # All screens grouped by feature
│   ├── auth/       # LoginScreen, RegisterScreen
│   ├── home/       # HomeScreen (public discovery)
│   ├── audiobook/  # AudiobookDetailsScreen, ChapterListScreen, PlayerScreen
│   ├── library/    # LibraryScreen
│   ├── create/     # CreateAudiobookScreen, UploadSourceScreen, GenerationStatusScreen
│   └── profile/    # ProfileScreen
├── storage/        # authStorage (secure token persistence)
├── types/          # TypeScript interfaces mirroring API schemas
├── config.ts       # Centralized API base URL configuration
└── theme.ts        # Design tokens (colors, spacing, fonts, radii)
```

### API URL Configuration

Edit **`src/config.ts`** to set the correct base URL for your environment:

| Environment | Value |
|---|---|
| Android emulator | `http://10.0.2.2:8000` (default) |
| iOS simulator | `http://localhost:8000` |
| Physical device | `http://<YOUR_LAN_IP>:8000` |

### Prerequisites

| Tool | Recommended version |
|------|-------------------|
| Node.js | ≥ 18 |
| npm | ≥ 10 |
| Expo Go app | Latest (install on your iOS or Android phone) |

### Install dependencies

```bash
cd app
npm install
```

### Start the development server

```bash
cd app
npm start
# or: npx expo start
```

This prints a **QR code** in the terminal. Scan it with:
- **Android**: the Expo Go app
- **iOS**: the Camera app (or Expo Go)

### Run on Android emulator / iOS simulator

```bash
npm run android   # requires Android emulator running
npm run ios       # macOS only, requires iOS simulator
npm run web       # runs in browser (limited audio support)
```

---

## 2. `platform-api/` — FastAPI Backend

### Prerequisites

| Tool | Recommended version |
|------|-------------------|
| Python | 3.11+ |
| PostgreSQL | 14+ (tested on 18) |

### Set up the virtual environment

```bash
cd platform-api
python -m venv .venv

# Activate — Windows PowerShell:
.venv\Scripts\Activate.ps1

# Activate — macOS / Linux:
source .venv/bin/activate
```

### Install dependencies

```bash
pip install -r requirements.txt

# Dev / test dependencies (optional):
pip install -r requirements-dev.txt
```

### Configure environment

```bash
cp .env.example .env
# Edit .env as needed (database URL, JWT secret, etc.)
```

### Run the development server

```bash
uvicorn app.main:app --reload --host 0.0.0.0 --port 8000
```

### Verify the API is running

```bash
curl http://localhost:8000/health
# Expected response:
# {"status":"ok","version":"0.1.0"}
```

Interactive API docs are available at:
- Swagger UI: http://localhost:8000/docs
- ReDoc: http://localhost:8000/redoc

### Run tests

```bash
pytest
```

---

## 3. `tts-service/` — AI TTS Service (FastAPI + TTS)

Dedicated AI speech synthesis service for Bangla audiobooks.

### Tech Stack & Models

| Technology | Purpose |
|---|---|
| FastAPI + Uvicorn | High-performance inference API (Port 8001) |
| Bangla VITS (`EMTIAZZ/bangladeshi-bangla-tts-vits`) | Native Bangladeshi Bengali speech synthesis |
| Coqui XTTS v2 (`xtts_v2`) | Multilingual voice cloning & expressive narrative audio |
| PyTorch & TorchAudio | Deep learning inference framework |

### Quick Start

```bash
cd tts-service
python -m venv venv

# Windows PowerShell:
.\venv\Scripts\Activate.ps1

pip install -r requirements.txt
cp .env.example .env

# Start TTS service:
uvicorn app.main:app --reload --host 0.0.0.0 --port 8001
```

- **Interactive Docs:** http://localhost:8001/docs
- **Health Check:** http://localhost:8001/health

---

## Development Status

| Feature | `app/` (Expo Go) | `platform-api/` (FastAPI) | `tts-service/` (FastAPI) |
|---|---|---|---|
| Project scaffold | ✅ Completed | ✅ Completed | ✅ Completed |
| Health check & Docs | — | ✅ Completed (`:8000/docs`) | ✅ Completed (`:8001/docs`) |
| Authentication (JWT & bcrypt) | ✅ Completed | ✅ Completed | — |
| User profile (`/me`) | ✅ Completed | ✅ Completed | — |
| Audiobook CRUD & metadata | ✅ Completed | ✅ Completed | — |
| PUBLIC / PRIVATE visibility | ✅ Completed | ✅ Completed | — |
| Public discovery (leak-proof) | ✅ Completed | ✅ Completed | — |
| Chapters & metadata | ✅ Completed | ✅ Completed | — |
| Source PDF upload | ✅ Completed | ✅ Completed | — |
| Generation job dispatch & status | ✅ Completed | ✅ Completed | ✅ Completed (`POST /jobs`) |
| Generation status polling | ✅ Completed | ✅ Completed | ✅ Completed (`GET /jobs/{id}`) |
| Direct Audio Synthesis | — | — | ✅ Completed (`POST /generate`) |
| Voice Catalog | — | — | ✅ Completed (`GET /speakers`) |
| Personal library (save / remove) | ✅ Completed | ✅ Completed | — |
| Audio playback (expo-audio) | ✅ Completed | ✅ Completed | — |
| Playback progress tracking | ✅ Completed | ✅ Completed | — |
| TTS Service integration | — | ✅ Completed | ✅ Completed |
