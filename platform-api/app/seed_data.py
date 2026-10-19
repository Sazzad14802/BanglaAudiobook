"""
Seed comprehensive platform dummy data for every user role in BornoVerse.
Creates:
- Admin user
- Free & Premium users
- Verified, pending and approved-unpaid publishers (users with publisher status)
- Publisher channels
- Public Free & Premium Audiobooks with Chapters
- User Library collections & Playlists
- Playback progress
- Subscription Plans, Orders, & bKash transactions
- Publisher verification applications
- Content moderation reports
- Publisher revenue views, ledger entries, and withdrawals
"""

import asyncio
from datetime import datetime, timezone, timedelta
from decimal import Decimal
import uuid
from sqlalchemy import select, delete

from app.core.database import async_session_maker
from app.core.security import hash_password
from app.models import User, Audiobook, Chapter
from app.models.audiobook import AudiobookStatus, AudiobookVisibility
from app.models.library import LibraryItem
from app.models.playback import PlaybackProgress
from app.models.platform import (
    Channel,
    PublisherApplication,
    Plan,
    Order,
    PaymentEvent,
    Report,
    Quota,
    PlaySession,
    EligibleView,
    Ledger,
    Withdrawal,
    Playlist,
    PlaylistBook,
    Setting,
    FinancialSnapshot,
)

def utc_now():
    return datetime.now(timezone.utc)

async def seed():
    async with async_session_maker() as db:
        print("[INFO] Seeding BornoVerse database with rich dummy data...")

        # ── 1. Create or ensure Users ──────────────────────────────────────────
        default_pw = hash_password("Password123!")
        admin_pw = hash_password("AdminPassword123!")

        # 1.1 Admin
        admin = await db.scalar(select(User).where(User.email == "admin@bornoverse.com", User.account_type == "admin"))
        if not admin:
            # Usernames are platform-wide; don't collide with an operator created by bootstrap_admin.
            taken = await db.scalar(select(User.id).where(User.username == "admin"))
            admin = User(
                username="platform_admin" if taken else "admin",
                email="admin@bornoverse.com",
                password_hash=admin_pw,
                account_type="admin",
                full_name="Platform Administrator",
            )
            db.add(admin)
            await db.flush()

        # 1.2 Free Listener
        listener_free = await db.scalar(select(User).where(User.email == "listener@bornoverse.com", User.account_type == "user"))
        if not listener_free:
            listener_free = User(
                username="shohan_listener",
                email="listener@bornoverse.com",
                password_hash=default_pw,
                account_type="user",
                full_name="Shohanur Rahman",
            )
            db.add(listener_free)
            await db.flush()

        # 1.3 Premium Listener
        listener_premium = await db.scalar(select(User).where(User.email == "premium@bornoverse.com", User.account_type == "user"))
        if not listener_premium:
            listener_premium = User(
                username="tanvir_premium",
                email="premium@bornoverse.com",
                password_hash=default_pw,
                account_type="user",
                full_name="Tanvir Ahmed",
                premium_until=utc_now() + timedelta(days=180),
            )
            db.add(listener_premium)
            await db.flush()
        else:
            listener_premium.premium_until = utc_now() + timedelta(days=180)

        # 1.4 Active Verified Publisher
        pub_active = await db.scalar(select(User).where(User.email == "publisher@bornoverse.com", User.account_type == "user"))
        if not pub_active:
            pub_active = User(
                username="bengal_heritage",
                email="publisher@bornoverse.com",
                password_hash=default_pw,
                account_type="user",
                publisher_status="active",
                full_name="Bengal Heritage Audio Media",
            )
            db.add(pub_active)
            await db.flush()
        else:
            pub_active.publisher_status = "active"

        # 1.5 Pending Approval Publisher
        pub_pending = await db.scalar(select(User).where(User.email == "publisher.pending@bornoverse.com", User.account_type == "user"))
        if not pub_pending:
            pub_pending = User(
                username="dhaka_books",
                email="publisher.pending@bornoverse.com",
                password_hash=default_pw,
                account_type="user",
                publisher_status="pending_approval",
                full_name="Dhaka Book House Ltd.",
            )
            db.add(pub_pending)
            await db.flush()

        # 1.6 Approved Pending Payment Publisher
        pub_approved = await db.scalar(select(User).where(User.email == "publisher.approved@bornoverse.com", User.account_type == "user"))
        if not pub_approved:
            pub_approved = User(
                username="ctg_press",
                email="publisher.approved@bornoverse.com",
                password_hash=default_pw,
                account_type="user",
                publisher_status="approved_pending_payment",
                full_name="Chittagong Audio Press",
            )
            db.add(pub_approved)
            await db.flush()

        # ── 2. Publisher Channels ──────────────────────────────────────────────
        channels = (await db.scalars(select(Channel).where(Channel.owner_id == pub_active.id))).all()
        if not channels:
            ch1 = Channel(
                owner_id=pub_active.id,
                name="ঐতিহ্য অডিও ক্লাসিকস (Heritage Audio Classics)",
                description="কালজয়ী বাংলা সাহিত্যের নির্ভুল আবৃত্তি ও সমৃদ্ধ অডিও রূপান্তর।",
            )
            ch2 = Channel(
                owner_id=pub_active.id,
                name="রহস্য রোমাঞ্চ জগৎ (Mystery & Thriller)",
                description="রোমহর্ষক রহস্য, গোয়েন্দা কাহিনী ও ভৌতিক সাহিত্যের জমজমাট অডিওবুক।",
            )
            ch3 = Channel(
                owner_id=pub_active.id,
                name="আধুনিক বাংলা গল্প (Modern Bangla Stories)",
                description="সমসাময়িক জনপ্রিয় কথাসাহিত্যিকদের সেরা গল্প ও উপন্যাস।",
            )
            db.add_all([ch1, ch2, ch3])
            await db.flush()
            channels = [ch1, ch2, ch3]

        ch_heritage = channels[0]
        ch_thriller = channels[1] if len(channels) > 1 else channels[0]

        # ── 3. Audiobooks & Chapters ───────────────────────────────────────────
        book_definitions = [
            {
                "id": uuid.UUID("11111111-1111-1111-1111-111111111111"),
                "title": "পথের পাঁচালী",
                "author": "বিভূতিভূষণ বন্দ্যোপাধ্যায়",
                "description": "কালজয়ী বাংলা সাহিত্য, নিশ্চিন্দিপুর গ্রামের অপুর শৈশব এবং গ্রামীণ বাংলার নিবিড় জীবনগাথা।",
                "genre": "সাহিত্য",
                "access_tier": "free",
                "channel_id": ch_heritage.id,
                "cover_image_url": "https://images.unsplash.com/photo-1544716278-ca5e3f4abd8c?q=80&w=800&auto=format&fit=crop",
                "duration_seconds": 31320,
                "chapters": [
                    ("নিশ্চিন্দিপুর", 1, 2280),
                    ("দুর্গা ও অপু", 2, 2340),
                    ("ইন্দির ঠাকরুনের গান", 3, 2100),
                    ("রেললাইন দেখার দিন", 4, 2640),
                ],
            },
            {
                "id": uuid.UUID("22222222-2222-2222-2222-222222222222"),
                "title": "চাঁদের পাহাড়",
                "author": "বিভূতিভূষণ বন্দ্যোপাধ্যায়",
                "description": "রোমাঞ্চকর আফ্রিকান অ্যাডভেঞ্চার। রিখটার্সফেল্ড পর্বতমালা, হলুদ হিরে ও বন্য প্রাণীদের মুখোমুখি শংকরের যাত্রা।",
                "genre": "রোমাঞ্চ",
                "access_tier": "free",
                "channel_id": ch_thriller.id,
                "cover_image_url": "https://images.unsplash.com/photo-1518709268805-4e9042af9f23?q=80&w=800&auto=format&fit=crop",
                "duration_seconds": 21600,
                "chapters": [
                    ("আফ্রিকার ডাক", 1, 1920),
                    ("রিখটার্সফেল্ড ও বুনিপ", 2, 2400),
                    ("আলভারেজের সন্ধান", 3, 2700),
                ],
            },
            {
                "id": uuid.UUID("33333333-3333-3333-3333-333333333333"),
                "title": "নীলকণ্ঠ পাখির খোঁজে",
                "author": "অতীন বন্দ্যোপাধ্যায়",
                "description": "দেশভাগ ও অবিভক্ত বাংলার নদীমাতৃক জীবনের মহাকাব্যিক আখ্যান। পদ্মার চরে মানুষের জীবনসংগ্রাম।",
                "genre": "সাহিত্য",
                "access_tier": "premium",
                "channel_id": ch_heritage.id,
                "cover_image_url": "https://images.unsplash.com/photo-1506744038136-46273834b3fb?q=80&w=800&auto=format&fit=crop",
                "duration_seconds": 36000,
                "chapters": [
                    ("পদ্মাপাড়ের মানুষ", 1, 3000),
                    ("দেশভাগের পদধ্বনি", 2, 3300),
                ],
            },
            {
                "id": uuid.UUID("44444444-4444-4444-4444-444444444444"),
                "title": "শেষের কবিতা",
                "author": "রবীন্দ্রনাথ ঠাকুর",
                "description": "অমিত রায় ও লাবণ্যের আধুনিক কাব্যিক প্রেমের অমর আখ্যান। শিলংয়ের পাহাড়ি আবহে রূপায়িত এক অনন্য সম্পর্ক।",
                "genre": "প্রেম ও রোমান্স",
                "access_tier": "premium",
                "channel_id": ch_heritage.id,
                "cover_image_url": "https://images.unsplash.com/photo-1476275466078-4007374efbbe?q=80&w=800&auto=format&fit=crop",
                "duration_seconds": 18000,
                "chapters": [
                    ("অমিত ও লাবণ্য", 1, 2160),
                    ("শিলং পাহাড়ের বাঁকে", 2, 2520),
                    ("শেষ বিদায়", 3, 2340),
                ],
            },
            {
                "id": uuid.UUID("55555555-5555-5555-5555-555555555555"),
                "title": "গীতাঞ্জলি",
                "author": "রবীন্দ্রনাথ ঠাকুর",
                "description": "নোবেলজয়ী কবিতার সংকলন। ঈশ্বরভক্তি, মানবপ্রেম ও প্রকৃতির স্নিগ্ধ রূপ নিয়ে রচিত অসামান্য গীতধারা।",
                "genre": "কবিতা",
                "access_tier": "free",
                "channel_id": ch_heritage.id,
                "cover_image_url": "https://images.unsplash.com/photo-1512820790803-83ca734da794?q=80&w=800&auto=format&fit=crop",
                "duration_seconds": 10800,
                "chapters": [
                    ("আমার মাথা নত করে দাও", 1, 1500),
                    ("জগৎ-পারাবারের তীরে", 2, 1680),
                ],
            },
            {
                "id": uuid.UUID("66666666-6666-6666-6666-666666666666"),
                "title": "ব্যোমকেশ সমগ্র: সত্যান্বেষী",
                "author": "শরদিন্দু বন্দ্যোপাধ্যায়",
                "description": "সত্যান্বেষী ব্যোমকেশ বক্সী ও অজিতের প্রথম অভিযান। নিখুঁত যুক্তি ও পর্যবেক্ষণ শক্তির চমকপ্রদ গোয়েন্দা কাহিনী।",
                "genre": "রহস্য",
                "access_tier": "premium",
                "channel_id": ch_thriller.id,
                "cover_image_url": "https://images.unsplash.com/photo-1478720568477-152d9b164e26?q=80&w=800&auto=format&fit=crop",
                "duration_seconds": 14400,
                "chapters": [
                    ("মেসবাড়ির রহস্য", 1, 2040),
                    ("খুনের কিনারা", 2, 2280),
                ],
            },
        ]

        created_books = []
        for bdef in book_definitions:
            existing_book = await db.get(Audiobook, bdef["id"])
            if not existing_book:
                book = Audiobook(
                    id=bdef["id"],
                    owner_id=pub_active.id,
                    title=bdef["title"],
                    author=bdef["author"],
                    description=bdef["description"],
                    genre=bdef["genre"],
                    access_tier=bdef["access_tier"],
                    channel_id=bdef["channel_id"],
                    cover_image_url=bdef["cover_image_url"],
                    duration_seconds=bdef["duration_seconds"],
                    language="bn",
                    visibility=AudiobookVisibility.PUBLIC,
                    status=AudiobookStatus.COMPLETED,
                    publication_status="published",
                    moderated=False,
                )
                db.add(book)
                await db.flush()

                for ch_title, ch_num, ch_dur in bdef["chapters"]:
                    ch = Chapter(
                        audiobook_id=book.id,
                        chapter_number=ch_num,
                        title=ch_title,
                        duration_seconds=ch_dur,
                        audio_url=f"/media/{book.id}/stream?chapter={ch_num}",
                    )
                    db.add(ch)
                created_books.append(book)
            else:
                created_books.append(existing_book)

        await db.flush()

        # ── 4. Subscription Plans ──────────────────────────────────────────────
        plans = (await db.scalars(select(Plan))).all()
        if not plans:
            p1 = Plan(name="মাসিক প্ল্যান (Monthly)", months=1, price=Decimal("150.00"), active=True)
            p2 = Plan(name="অর্ধবার্ষিক প্ল্যান (6 Months)", months=6, price=Decimal("600.00"), active=True)
            p3 = Plan(name="বার্ষিক প্রিমিয়াম (1 Year)", months=12, price=Decimal("1100.00"), active=True)
            db.add_all([p1, p2, p3])
            await db.flush()
            plans = [p1, p2, p3]

        plan_half_year = plans[1] if len(plans) > 1 else plans[0]

        # ── 5. Payment Orders ──────────────────────────────────────────────────
        existing_orders = (await db.scalars(select(Order))).all()
        if not existing_orders:
            # 5.1 Premium listener subscription order
            order1 = Order(
                user_id=listener_premium.id,
                kind="subscription",
                plan_id=plan_half_year.id,
                months=6,
                amount=Decimal("600.00"),
                status="confirmed",
                idempotency_key=f"sub-{listener_premium.id}-202610",
                provider="mock",
            )
            # 5.2 Publisher registration fee order
            order2 = Order(
                user_id=pub_active.id,
                kind="publisher_registration",
                plan_id=None,
                months=0,
                amount=Decimal("5000.00"),
                status="confirmed",
                idempotency_key=f"pub-reg-{pub_active.id}",
                provider="mock",
            )
            db.add_all([order1, order2])
            await db.flush()

            db.add(PaymentEvent(order_id=order1.id, status="success"))
            db.add(PaymentEvent(order_id=order2.id, status="success"))

        # ── 6. Publisher Verification Applications ────────────────────────────
        existing_apps = (await db.scalars(select(PublisherApplication))).all()
        if not existing_apps:
            app1 = PublisherApplication(
                user_id=pub_active.id,
                legal_name="Bengal Heritage Audio Media",
                document_key="applications/bengal_heritage_docs.pdf",
                status="approved",
                reason="All legal registrations and trade licenses verified.",
            )
            app2 = PublisherApplication(
                user_id=pub_pending.id,
                legal_name="Dhaka Book House Ltd.",
                document_key="applications/dhaka_trade_license.pdf",
                status="pending",
                reason="",
            )
            app3 = PublisherApplication(
                user_id=pub_approved.id,
                legal_name="Chittagong Audio Press",
                document_key="applications/ctg_tin_cert.pdf",
                status="approved_pending_payment",
                reason="Approved by admin. Pending registration payment.",
            )
            db.add_all([app1, app2, app3])

        # ── 7. User Library Items ──────────────────────────────────────────────
        book_pp = created_books[0]
        book_cp = created_books[1]
        book_sk = created_books[3]
        book_byomkesh = created_books[5]

        # Listener Free saved books
        for b in [book_pp, book_cp]:
            item = await db.scalar(select(LibraryItem).where(LibraryItem.user_id == listener_free.id, LibraryItem.audiobook_id == b.id))
            if not item:
                db.add(LibraryItem(user_id=listener_free.id, audiobook_id=b.id))

        # Listener Premium saved books
        for b in [book_sk, book_byomkesh]:
            item = await db.scalar(select(LibraryItem).where(LibraryItem.user_id == listener_premium.id, LibraryItem.audiobook_id == b.id))
            if not item:
                db.add(LibraryItem(user_id=listener_premium.id, audiobook_id=b.id))

        # ── 8. Playlists ───────────────────────────────────────────────────────
        pl_free = await db.scalar(select(Playlist).where(Playlist.user_id == listener_free.id))
        if not pl_free:
            pl_free1 = Playlist(user_id=listener_free.id, name="আমার প্রিয় গল্প (My Favorites)")
            pl_free2 = Playlist(user_id=listener_free.id, name="রাতের অডিওবুক (Bedtime)")
            db.add_all([pl_free1, pl_free2])
            await db.flush()
            db.add(PlaylistBook(playlist_id=pl_free1.id, audiobook_id=book_pp.id))
            db.add(PlaylistBook(playlist_id=pl_free2.id, audiobook_id=book_cp.id))

        pl_prem = await db.scalar(select(Playlist).where(Playlist.user_id == listener_premium.id))
        if not pl_prem:
            pl_prem1 = Playlist(user_id=listener_premium.id, name="রবীন্দ্র সাহিত্য ও উপন্যাস")
            pl_prem2 = Playlist(user_id=listener_premium.id, name="গোয়েন্দা ও রহস্য সংকলন")
            db.add_all([pl_prem1, pl_prem2])
            await db.flush()
            db.add(PlaylistBook(playlist_id=pl_prem1.id, audiobook_id=book_sk.id))
            db.add(PlaylistBook(playlist_id=pl_prem2.id, audiobook_id=book_byomkesh.id))

        # ── 9. Playback Progress ───────────────────────────────────────────────
        pp1 = await db.scalar(select(PlaybackProgress).where(PlaybackProgress.user_id == listener_free.id, PlaybackProgress.audiobook_id == book_pp.id))
        if not pp1:
            db.add(PlaybackProgress(
                user_id=listener_free.id,
                audiobook_id=book_pp.id,
                position_seconds=420.0,
            ))

        pp2 = await db.scalar(select(PlaybackProgress).where(PlaybackProgress.user_id == listener_premium.id, PlaybackProgress.audiobook_id == book_sk.id))
        if not pp2:
            db.add(PlaybackProgress(
                user_id=listener_premium.id,
                audiobook_id=book_sk.id,
                position_seconds=850.0,
            ))

        # ── 10. Content Moderation Reports ─────────────────────────────────────
        existing_reports = (await db.scalars(select(Report))).all()
        if not existing_reports:
            r1 = Report(
                user_id=listener_free.id,
                audiobook_id=book_byomkesh.id,
                reason="অডিওর দ্বিতীয় অধ্যায়ে কিছুটা ব্যাকগ্রাউন্ড নয়েজ শোনা যাচ্ছে।",
                status="open",
            )
            r2 = Report(
                user_id=listener_premium.id,
                audiobook_id=book_sk.id,
                reason="কপিরাইট তথ্য ও প্রকাশনার লাইসেন্স স্পষ্ট করা প্রয়োজন।",
                status="open",
            )
            db.add_all([r1, r2])

        # ── 11. Publisher Revenue Views, Ledger & Withdrawals ──────────────────
        current_month = utc_now().strftime("%Y-%m")
        existing_views = (await db.scalars(select(EligibleView).where(EligibleView.publisher_id == pub_active.id))).all()
        if not existing_views:
            db.add(EligibleView(
                user_id=listener_premium.id,
                audiobook_id=book_sk.id,
                publisher_id=pub_active.id,
                month=current_month,
            ))
            db.add(EligibleView(
                user_id=listener_premium.id,
                audiobook_id=book_byomkesh.id,
                publisher_id=pub_active.id,
                month=current_month,
            ))

        existing_ledgers = (await db.scalars(select(Ledger).where(Ledger.publisher_id == pub_active.id))).all()
        if not existing_ledgers:
            l1 = Ledger(
                publisher_id=pub_active.id,
                month=current_month,
                amount=Decimal("12450.00"),
                kind="revenue_allocation",
                reference=f"rev-alloc-{pub_active.id}-{current_month}",
            )
            db.add(l1)

        existing_withdrawals = (await db.scalars(select(Withdrawal).where(Withdrawal.publisher_id == pub_active.id))).all()
        if not existing_withdrawals:
            w1 = Withdrawal(
                publisher_id=pub_active.id,
                amount=Decimal("5000.00"),
                status="approved",
                destination="bKash: 01711223344",
                reason="Approved by platform finance",
            )
            w2 = Withdrawal(
                publisher_id=pub_active.id,
                amount=Decimal("3500.00"),
                status="pending",
                destination="Nagad: 01899887766",
                reason="",
            )
            db.add_all([w1, w2])

        await db.commit()
        print("[SUCCESS] Database successfully seeded with complete dummy data for all roles!")

if __name__ == "__main__":
    asyncio.run(seed())
