"""Create a custom-format PostgreSQL backup without exposing credentials in arguments."""
import os
import shutil
import subprocess
from pathlib import Path
from datetime import datetime, timezone
from sqlalchemy.engine import make_url
from app.core.config import settings

def main():
    url=make_url(settings.sync_database_url)
    if url.get_backend_name()!='postgresql':
        raise RuntimeError('PostgreSQL connection required')
    destination=Path('backups');destination.mkdir(exist_ok=True)
    path=destination/f"bornoverse-{datetime.now(timezone.utc):%Y%m%dT%H%M%SZ}.dump"
    executable=shutil.which('pg_dump')
    if not executable:
        raise RuntimeError('Install PostgreSQL client tools and add pg_dump to PATH')
    env=os.environ.copy()
    env.update(PGHOST=url.host or 'localhost',PGPORT=str(url.port or 5432),PGUSER=url.username or '',PGPASSWORD=url.password or '',PGDATABASE=url.database or '')
    subprocess.run([executable,'--format=custom','--file',str(path)],env=env,check=True,capture_output=True)
    print(f'Backup created: {path} ({path.stat().st_size} bytes)')

if __name__=='__main__':main()
