"""List orphan files older than 24h; --apply removes only those beneath UPLOAD_DIR."""
import asyncio
import argparse
import time
from pathlib import Path
from sqlalchemy import select
from app.core.database import async_session_maker
from app.core.config import settings
from app.models import Audiobook, Chapter
from app.models.platform import PublisherApplication

async def main(apply=False):
    root=Path(settings.UPLOAD_DIR).resolve()
    referenced=set()
    async with async_session_maker() as db:
        for column in [Audiobook.source_file_url,Audiobook.audio_url,Audiobook.cover_image_url,Chapter.audio_url,PublisherApplication.document_key]:
            for key in (await db.scalars(select(column).where(column.is_not(None)))).all():
                if key.startswith('/api/v1/covers/'):
                    key='/uploads/covers/'+key.rsplit('/',1)[1]
                if key.startswith('/uploads/'):
                    referenced.add((root/key[len('/uploads/'):]).resolve())
    for file in root.rglob('*'):
        resolved=file.resolve()
        if (file.is_file() and not file.is_symlink() and resolved.is_relative_to(root)
                and resolved not in referenced and time.time()-file.stat().st_mtime>86400):
            print(('Removing ' if apply else 'Orphan: ')+str(file.relative_to(root)))
            if apply:
                file.unlink()

if __name__=='__main__':
    parser=argparse.ArgumentParser();parser.add_argument('--apply',action='store_true')
    asyncio.run(main(parser.parse_args().apply))
