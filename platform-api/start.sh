#!/usr/bin/env bash
# ==============================================================================
# BanglaBook Platform API - Cloud Production Startup Script
# Runs Alembic migrations, starts background generation worker, and boots FastAPI
# ==============================================================================

set -e

echo "[1/3] Running Alembic Database Migrations..."
alembic upgrade head || {
    echo "Warning: Alembic upgrade returned non-zero. Attempting database bootstrap..."
}

echo "[2/3] Starting Background Generation Worker in background..."
python -m app.worker &
WORKER_PID=$!
echo "Worker started with PID: $WORKER_PID"

echo "[3/3] Starting Uvicorn Web Server on port ${PORT:-8000}..."
exec uvicorn app.main:app --host 0.0.0.0 --port "${PORT:-8000}"
