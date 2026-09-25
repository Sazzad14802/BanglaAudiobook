# Audiobook Streaming Platform

A mono-repo containing the two core services of the audiobook streaming platform.

```
audiobook-platform/
├── app/              # Expo (React Native) mobile app — runs via Expo Go
└── platform-api/     # FastAPI backend
```

> **Note:** The Model Runner (OCR / TTS / FFmpeg) is a separate service developed independently and is **not** part of this repository.

---

## Architecture

```
React Native App (Expo Go)
       │
       ▼
Platform API (FastAPI)
       │
       ▼
Queue / Job System
       │
       ▼
Model Runner  ← separate service
```

---

## 1. `app/` — Expo Mobile App

Uses the **Expo managed workflow** — run instantly on your phone with the [Expo Go](https://expo.dev/go) app, no native build required.

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
npm run web       # runs in browser
```

---

## 2. `platform-api/` — FastAPI Backend

### Prerequisites

| Tool | Recommended version |
|------|-------------------|
| Python | 3.11+ |

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
# Edit .env as needed
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

## Development Status

| Feature | `app/` | `platform-api/` |
|---------|--------|-----------------|
| Project scaffold | ✅ | ✅ |
| Health check | — | ✅ |
| Authentication | 🔜 | 🔜 |
| Audiobook discovery | 🔜 | 🔜 |
| Audiobook library | 🔜 | 🔜 |
| Search | 🔜 | 🔜 |
| Audiobook details | 🔜 | 🔜 |
| Audio player / streaming | 🔜 | 🔜 |
| Upload | 🔜 | 🔜 |
| Generation jobs | 🔜 | 🔜 |
| User profile | 🔜 | 🔜 |
