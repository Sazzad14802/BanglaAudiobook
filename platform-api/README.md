# Platform API — Audiobook Streaming Platform

FastAPI backend service powering the mobile-first audiobook streaming platform.

Handles user accounts, authentication (JWT), audiobook management, strict PUBLIC/PRIVATE visibility controls, chapters, personal libraries, playback progress tracking, PDF document uploads, and asynchronous generation job coordination with the external AI Model Runner.

---

## 1. Architecture Overview

```
                         ┌──────────────────┐
                         │   React Native   │
                         │    (Expo Go)     │
                         └────────┬─────────┘
                                  │
                                HTTPS
                                  │
                                  ▼
                         ┌──────────────────┐
                         │   Platform API   │
                         │     FastAPI      │
                         └────────┬─────────┘
                                  │
                ┌─────────────────┼──────────────────┐
                │                 │                  │
                ▼                 ▼                  ▼
           PostgreSQL           Redis          Object Storage /
          (18.x / async)       (Queue)         Local File Uploads
                                                     │
                                                     ▼
                                            Audio Stream delivery
                                              (CDN / Direct URL)

                      Generation Workflow:
                      
    User uploads PDF  ──► POST /api/v1/audiobooks/{id}/source
                                  │
    User requests gen ──► POST /api/v1/audiobooks/{id}/generate
                                  │
                     Creates GenerationJob (PENDING)
                                  │
                      Dispatches payload to queue
                                  │
                                  ▼
                    ┌───────────────────────────┐
                    │      Model Runner         │
                    │   (Separate Service)      │
                    │                           │
                    │  • OCR Document Analysis  │
                    │  • Text Chunking & Prep   │
                    │  • TTS Voice Synthesis    │
                    │  • FFmpeg Audio Stitching │
                    └───────────────────────────┘
```

> **IMPORTANT ARCHITECTURAL BOUNDARY:**
> The AI Model Runner (OCR, TTS, FFmpeg, model weights) is a **completely separate service** and is NOT part of this repository. The Platform API only manages metadata, authorization, and dispatches generation job requests.

---

## 2. Technology Stack

* **Language & Framework:** Python 3.11+, FastAPI (v0.115+)
* **Database & ORM:** PostgreSQL 18+, SQLAlchemy 2.x (Async with `asyncpg` and `psycopg`)
* **Migrations:** Alembic
* **Validation & Settings:** Pydantic v2, `pydantic-settings`
* **Security & Auth:** JWT tokens (`PyJWT`), password hashing with `bcrypt`
* **File Storage:** Local filesystem storage abstraction (swappable with S3/R2/MinIO)
* **Testing:** Pytest, `pytest-asyncio`, `httpx`, in-memory `aiosqlite`

---

## 3. Project Structure

```text
platform-api/
├── app/
│   ├── main.py                     # App factory, middleware, static uploads & health check
│   ├── core/
│   │   ├── config.py               # pydantic-settings configuration (.env driven)
│   │   ├── database.py             # Async SQLAlchemy engine & get_db dependency
│   │   └── security.py             # bcrypt password hashing & JWT encode/decode
│   ├── models/
│   │   ├── base.py                 # Declarative Base & UUID/Timestamp mixins
│   │   ├── user.py                 # User ORM model
│   │   ├── audiobook.py            # Audiobook ORM model & Visibility/Status Enums
│   │   ├── chapter.py              # Chapter ORM model
│   │   ├── generation_job.py       # GenerationJob ORM model
│   │   ├── library.py              # LibraryItem ORM model (bookmarks)
│   │   └── playback.py             # PlaybackProgress ORM model (positions)
│   ├── schemas/
│   │   ├── auth.py                 # Register, Login, TokenResponse schemas
│   │   ├── user.py                 # UserRead schema
│   │   ├── audiobook.py            # AudiobookCreate, Update, Read, List schemas
│   │   ├── chapter.py              # ChapterRead, ChapterCreate schemas
│   │   ├── generation.py           # GenerationJobResponse, Read schemas
│   │   ├── library.py              # LibraryItemRead, LibraryList schemas
│   │   └── playback.py             # PlaybackProgressUpdate, Read schemas
│   ├── api/
│   │   ├── deps.py                 # Dependency injection (Current user, DB session)
│   │   └── v1/
│   │       ├── router.py           # Aggregated v1 API router
│   │       └── endpoints/
│   │           ├── auth.py         # /auth/register, /auth/login, /auth/me
│   │           ├── users.py        # /users/me
│   │           ├── audiobooks.py   # /audiobooks CRUD, visibility, uploads, generation
│   │           ├── library.py      # /library saved audiobooks
│   │           └── playback.py     # /playback listening progress
│   └── services/
│       ├── auth_service.py         # Registration & authentication business logic
│       ├── audiobook_service.py    # Discovery & visibility authorization logic
│       ├── chapter_service.py      # Chapter retrieval & authorization
│       ├── library_service.py      # Personal library collection operations
│       ├── playback_service.py     # Bookmark & progress position tracking
│       ├── generation_service.py   # Generation job creation & status tracking
│       ├── generation_dispatcher.py# Model Runner boundary abstraction
│       └── storage_service.py      # File upload storage abstraction (local/S3)
├── alembic/
│   ├── env.py                      # Alembic migration environment
│   └── versions/                   # Migration versions
├── tests/                          # Comprehensive pytest test suite
├── .env.example                    # Environment variable template
├── requirements.txt                # Production dependencies
├── requirements-dev.txt            # Development & testing dependencies
├── pyproject.toml                  # Pytest configuration
└── README.md                       # Project documentation
```

---

## 4. Environment Variables

Create a `.env` file from `.env.example`:

```bash
cp .env.example .env
```

| Variable | Description | Example / Default |
|---|---|---|
| `DATABASE_URL` | Async PostgreSQL connection string | `postgresql+asyncpg://postgres:12345@localhost:5432/audiobook_db` |
| `SYNC_DATABASE_URL` | Sync PostgreSQL connection for Alembic | `postgresql+psycopg://postgres:12345@localhost:5432/audiobook_db` |
| `JWT_SECRET_KEY` | Secret key used to sign JWT access tokens | `your-secret-hex-key` |
| `JWT_ALGORITHM` | JWT signing algorithm | `HS256` |
| `JWT_ACCESS_TOKEN_EXPIRE_MINUTES` | Token lifetime in minutes | `1440` (24 hours) |
| `ALLOWED_ORIGINS` | CORS allowed origins (comma-separated or `*`) | `*` |
| `STORAGE_TYPE` | Storage backend (`local` or `s3`) | `local` |
| `UPLOAD_DIR` | Local storage folder for uploads | `uploads` |
| `MAX_UPLOAD_SIZE_MB` | Maximum allowed source PDF file size | `50` |
| `MODEL_RUNNER_DISPATCHER` | Dispatcher strategy (`mock` or `http`) | `mock` |

---

## 5. PostgreSQL Database Setup

1. Start your local PostgreSQL server (e.g. PostgreSQL 18).
2. Connect with your admin client (`psql` or pgAdmin) and create the database:

```sql
CREATE DATABASE audiobook_db;
```

---

## 6. Virtual Environment & Dependencies

```powershell
# Navigate to platform-api
cd platform-api

# Create virtual environment (Python 3.11+)
python -m venv .venv

# Activate on Windows PowerShell:
.\.venv\Scripts\Activate.ps1

# Activate on macOS / Linux:
# source .venv/bin/activate

# Install dependencies:
pip install -r requirements.txt -r requirements-dev.txt
```

---

## 7. Database Migrations (Alembic)

Apply existing migrations:

```powershell
alembic upgrade head
```

To create a new migration after updating models:

```powershell
alembic revision --autogenerate -m "describe_changes"
```

To roll back a migration:

```powershell
alembic downgrade -1
```

---

## 8. Running the Development Server

```powershell
uvicorn app.main:app --reload --host 0.0.0.0 --port 8000
```

The server will be available at:
* **API root:** `http://localhost:8000`
* **Health check:** `http://localhost:8000/health`
* **Interactive Swagger UI Docs:** `http://localhost:8000/docs`
* **Interactive ReDoc:** `http://localhost:8000/redoc`

---

## 9. Running the Test Suite

The test suite runs using isolated in-memory SQLite instances with foreign-keys enabled.

```powershell
pytest -v
```

Tests cover:
* Authentication: Registration, duplicate detection, login, protected identity routes
* Audiobook CRUD: Creation, owner authorization, update metadata, deletion
* Visibility rules: `PUBLIC` vs `PRIVATE`, owner access, non-owner restrictions, visibility toggling
* Public Discovery: Verify private books never leak; only completed public books appear
* Personal Library: Adding public books, rejecting private books, duplicate prevention, removal
* Playback Progress: Saving position, retrieving progress, chapter validation
* PDF Source Upload: Validation of PDF file type and size limits
* Generation: Job creation, async dispatch, ownership validation, status checks

---

## 10. Implemented API Endpoints

All endpoints are versioned under `/api/v1/`:

### Authentication & Users
| Method | Endpoint | Description | Auth Required |
|---|---|---|---|
| `POST` | `/api/v1/auth/register` | Register a new user | No |
| `POST` | `/api/v1/auth/login` | Login and receive JWT access token | No |
| `GET` | `/api/v1/auth/me` | Get authenticated user identity | Yes |
| `GET` | `/api/v1/users/me` | Get user profile | Yes |

### Audiobooks & Discovery
| Method | Endpoint | Description | Auth Required |
|---|---|---|---|
| `GET` | `/api/v1/audiobooks` | Discover public, completed audiobooks (paginated) | Optional |
| `POST` | `/api/v1/audiobooks` | Create a new audiobook container | Yes |
| `GET` | `/api/v1/audiobooks/my` | List all audiobooks owned by caller | Yes |
| `GET` | `/api/v1/audiobooks/{id}` | Get audiobook details (owner or public completed) | Optional |
| `PATCH` | `/api/v1/audiobooks/{id}` | Update title, author, description (owner only) | Yes |
| `DELETE` | `/api/v1/audiobooks/{id}` | Delete audiobook (owner only) | Yes |
| `PATCH` | `/api/v1/audiobooks/{id}/visibility`| Set visibility to `PUBLIC` or `PRIVATE` | Yes |
| `POST` | `/api/v1/audiobooks/{id}/source` | Upload source PDF file (owner only) | Yes |
| `POST` | `/api/v1/audiobooks/{id}/generate`| Request audiobook generation job | Yes |
| `GET` | `/api/v1/audiobooks/{id}/generation-status` | Get job history and status | Yes |
| `GET` | `/api/v1/audiobooks/{id}/chapters` | List chapters for an audiobook | Optional |
| `GET` | `/api/v1/audiobooks/{id}/chapters/{chapter_id}` | Get specific chapter details | Optional |

### Personal Library
| Method | Endpoint | Description | Auth Required |
|---|---|---|---|
| `GET` | `/api/v1/library` | List audiobooks in user's saved library | Yes |
| `POST` | `/api/v1/library/{audiobook_id}` | Add a public completed book to library | Yes |
| `DELETE` | `/api/v1/library/{audiobook_id}` | Remove book from library | Yes |

### Playback Progress
| Method | Endpoint | Description | Auth Required |
|---|---|---|---|
| `GET` | `/api/v1/playback/{audiobook_id}` | Get saved playback position and chapter | Yes |
| `PUT` | `/api/v1/playback/{audiobook_id}` | Save/update playback position | Yes |

---

## 11. Model Runner Integration Boundary

The Model Runner is an external worker pipeline responsible for:
1. **OCR:** Optical Character Recognition of uploaded PDF pages.
2. **Text Processing:** Cleaning, chunking into logical chapters.
3. **TTS:** Synthesizing speech per chunk/chapter.
4. **FFmpeg:** Encoding audio to AAC/MP3 segments and calculating durations.

### Dispatch Contract:
When a user requests generation (`POST /api/v1/audiobooks/{id}/generate`), the Platform API:
1. Validates ownership and confirms `source_file_url` exists.
2. Creates a `GenerationJob` record with status `PENDING`.
3. Dispatches the following contract payload via `BaseGenerationDispatcher`:

```json
{
  "job_id": "c7a8b3e1-...",
  "audiobook_id": "9f2d1e0c-...",
  "source_document_url": "/uploads/sources/uuid_document.pdf",
  "language": "bn"
}
```

4. Returns immediately with HTTP 202 Accepted and the `job_id`.

The `generation_dispatcher.py` service defines `BaseGenerationDispatcher` with:
* `MockGenerationDispatcher`: Default for local dev and testing (logs payload).
* `HTTPGenerationDispatcher`: Ready for HTTP webhook dispatch to a runner.
* Can be easily swapped with Redis/Celery or RabbitMQ message queue brokers.
