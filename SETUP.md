# Local Setup (after a fresh clone)

`start-dev.bat` only **launches** the services. It does not install dependencies,
create `.env` files, or set up the database. Do the one-time setup below first.

## Quick way: run the setup script

1. Install **Python 3.11**, **Node.js 18+** and **PostgreSQL 14+** (make sure Postgres is running).
2. Run the setup script from the repo root:

   ```powershell
   .\setup-dev.bat
   ```

3. Start everything with `.\start-dev.bat`.

At the start, the script asks whether to install the tts-service, which is several GB. It's
only needed for PDF → audiobook generation, and you can re-run the script later to add it.

The script creates the `.env` files and generates the secrets (`JWT_SECRET_KEY` and a shared
`TTS_SERVICE_KEY`). It asks for your Gemini API key and, if needed, your Postgres password.
It then creates the virtual environments, installs all dependencies, creates the
`audiobook_db` database and runs the migrations.

It is safe to re-run, for example **after pulling new changes**. Steps that are already done are
skipped, and dependencies are reinstalled only when `requirements.txt` or `package-lock.json` changed.

| Option | Effect |
|---|---|
| `-SkipTts` | Skip the tts-service install (several GB: PyTorch, Coqui TTS) |
| `-SkipNode` | Skip `npm install` for `admin/` and `app/` |
| `-NoPrompt` | Never ask for input |
| `-Force` | Reinstall dependencies even if unchanged |

Example: `.\setup-dev.bat -SkipTts`

The manual steps below do the same thing, if you prefer them or the script fails.

---

## Alternative: run the backend in Docker

Docker runs **PostgreSQL 18, the Platform API, the generation worker and the admin
portal** in containers, so you don't need to install PostgreSQL or set up Python for
them. The **TTS service** and the **mobile app** still run on your PC.

Requirements: Docker Desktop (running), plus the one-time setup of `tts-service`
(step 3 below) and `app` (step 5). `platform-api/.env` must exist; `setup-dev.bat`
creates it, or copy it from `.env.example`.

```powershell
docker compose up --build -d      # first run: builds images, migrates, loads demo data
.\start-dev.bat -TtsOnly          # TTS/OCR service on the host (port 8001)
cd app; npx expo start --go       # mobile app, as usual
```

| Service | URL |
|---|---|
| Admin portal | http://localhost:5173 |
| Platform API docs | http://localhost:8000/docs |
| PostgreSQL (for pgAdmin etc.) | `localhost:5433`, user `postgres`, password `bornoverse`, database `audiobook_db` |

- A new (empty) database is filled with the demo accounts automatically
  (`admin@bornoverse.com` / `AdminPassword123!`, `listener@bornoverse.com` / `Password123!`, …).
  Set `SEED_DEMO_DATA=false` before the first `up` to start empty.
- Code changes in `platform-api/app` and `admin/src` reload automatically.
- Uploaded files are stored in `platform-api/uploads`, as in the non-Docker setup.
- Docker uses its own database, separate from a locally installed PostgreSQL.
- Don't run `start-dev.bat` (without `-TtsOnly`) at the same time: both use ports 8000 and 5173.

| Command | Effect |
|---|---|
| `docker compose logs -f api worker` | Follow API and worker logs |
| `docker compose down` | Stop (data is kept) |
| `docker compose down -v` | Stop and delete the Docker database (fresh demo data next time) |
| `docker compose up --build -d` | Rebuild after `requirements.txt` or `package.json` changes |

---

# Manual setup

All commands are for **Windows PowerShell**, run from the repo root.

---

## 0. Prerequisites

| Tool | Version | Notes |
|---|---|---|
| Node.js + npm | 18+ | for `admin/` and `app/` |
| Python | 3.11+ | for `platform-api/` and `tts-service/` |
| PostgreSQL | 14+ | must be running locally |
| Expo Go | latest | on your phone, to run the mobile app |

If PowerShell blocks `Activate.ps1`, run once:

```powershell
Set-ExecutionPolicy -Scope CurrentUser RemoteSigned
```

---

## 1. Database

Create an empty database named `audiobook_db`:

```powershell
psql -U postgres -c "CREATE DATABASE audiobook_db;"
```

(Or create it in pgAdmin.) The default config expects user `postgres`, password `12345`.

---

## 2. Platform API (`platform-api/`)

```powershell
cd platform-api
python -m venv .venv
.\.venv\Scripts\Activate.ps1
pip install -r requirements.txt
copy .env.example .env
```

Edit `platform-api\.env`:

- `DATABASE_URL` / `SYNC_DATABASE_URL`: your Postgres user, password, and database
- `JWT_SECRET_KEY`: any long random string
- `TTS_SERVICE_KEY`: any shared secret (use the **same value** in `tts-service\.env`)

Create the tables, then go back to the root:

```powershell
alembic upgrade head
deactivate
cd ..
```

---

## 3. TTS / OCR Service (`tts-service/`)

> Name the venv `.venv` (with a dot). `start-dev.ps1` looks for that folder.

```powershell
cd tts-service
python -m venv .venv
.\.venv\Scripts\Activate.ps1
pip install -r requirements.txt
copy .env.example .env
deactivate
cd ..
```

Edit `tts-service\.env`:

- `GEMINI_API_KEY`: your Gemini API key (required for PDF → audiobook generation)
- Add this line: `TTS_SERVICE_KEY=<same value as in platform-api\.env>`

---

## 4. Admin Portal (`admin/`)

```powershell
cd admin
npm install
cd ..
```

---

## 5. Mobile App (`app/`)

```powershell
cd app
npm install
copy .env.example .env
cd ..
```

For local development, leave `app\.env` empty; the app finds the API on your LAN.

---

## Run everything

```powershell
.\start-dev.bat               # API, TTS, worker, admin, Expo (via tunnel)
.\start-dev.bat -NoTunnel     # Expo over Wi-Fi/LAN instead of a tunnel
.\start-dev.bat -BackendOnly  # API, TTS, and worker only
.\stop-dev.bat                # stop all services
```

| Service | URL |
|---|---|
| Admin portal | http://localhost:5173 |
| Platform API docs | http://localhost:8000/docs |
| TTS / OCR docs | http://localhost:8001/docs |
| Mobile app | scan the QR code in the "BornoVerse Mobile" window with Expo Go |

---

## Optional features

These can stay empty in `platform-api\.env`. The rest of the app works, and only that feature is turned off:

| Feature | Settings |
|---|---|
| Google sign-in | `SUPABASE_URL`, `SUPABASE_ANON_KEY` (and `EXPO_PUBLIC_SUPABASE_URL` in `app\.env`) |
| Payments | `SSLCOMMERZ_STORE_ID`, `SSLCOMMERZ_STORE_PASSWORD` |
| Password recovery email | `SMTP_*`, `MAIL_FROM` |

---

## After pulling new changes

```powershell
# New Python packages / DB migrations
cd platform-api; .\.venv\Scripts\Activate.ps1; pip install -r requirements.txt; alembic upgrade head; deactivate; cd ..
cd tts-service;  .\.venv\Scripts\Activate.ps1; pip install -r requirements.txt; deactivate; cd ..

# New npm packages
cd admin; npm install; cd ..
cd app;   npm install; cd ..
```
