# Audiobook Streaming Platform

A mono-repo containing the two core services of the audiobook streaming platform.

```
audiobook-platform/
├── app/              # React Native mobile app (iOS & Android)
└── platform-api/     # FastAPI backend
```

> **Note:** The Model Runner (OCR / TTS / FFmpeg) is a separate service developed independently and is **not** part of this repository.

---

## Architecture

```
React Native App
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

## 1. `app/` — React Native Mobile App

### Prerequisites

| Tool | Recommended version |
|------|-------------------|
| Node.js | ≥ 18 |
| npm | ≥ 10 |
| Java JDK | 17 or 21 (Android) |
| Android Studio | Latest stable (for Android emulator) |
| Xcode | Latest stable (for iOS, macOS only) |
| CocoaPods | Latest stable (for iOS, macOS only) |

### Install dependencies

```bash
cd app
npm install
# macOS only — install iOS pods:
cd ios && bundle exec pod install && cd ..
```

### Run on Android

```bash
cd app
npx react-native run-android
```

### Run on iOS (macOS only)

```bash
cd app
npx react-native run-ios
```

### Start the Metro bundler separately (optional)

```bash
cd app
npx react-native start
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
