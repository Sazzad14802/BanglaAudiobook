#!/bin/sh
# Waits for PostgreSQL, then (for the API container only) applies migrations and
# loads demo data into an empty database, and finally runs the container command.
set -e

python - <<'EOF'
import time
import psycopg
from sqlalchemy.engine import make_url
from app.core.config import settings

url = make_url(settings.sync_database_url)
for attempt in range(60):
    try:
        psycopg.connect(host=url.host, port=url.port or 5432, user=url.username,
                        password=url.password, dbname=url.database, connect_timeout=3).close()
        break
    except psycopg.OperationalError:
        print("Waiting for the database...", flush=True)
        time.sleep(2)
else:
    raise SystemExit("Database did not become ready in time")
EOF

if [ "$RUN_MIGRATIONS" = "true" ]; then
    echo "Applying database migrations..."
    alembic upgrade head

    if [ "$SEED_DEMO_DATA" = "true" ]; then
        python - <<'EOF'
import asyncio
from sqlalchemy import func, select
from app.core.database import async_session_maker
from app.models import User

async def main():
    # One event loop for both steps: pooled connections are bound to the loop.
    async with async_session_maker() as db:
        if await db.scalar(select(func.count()).select_from(User)):
            return
    from app.seed_data import seed
    print("Empty database: loading demo data...", flush=True)
    await seed()

asyncio.run(main())
EOF
    fi
fi

exec "$@"
