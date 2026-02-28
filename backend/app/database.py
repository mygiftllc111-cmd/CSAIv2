from sqlalchemy.ext.asyncio import AsyncSession, create_async_engine, async_sessionmaker
from sqlalchemy.orm import DeclarativeBase
from sqlalchemy.pool import NullPool
from app.config import settings


class Base(DeclarativeBase):
    pass


def _get_database_url() -> str:
    """Get database URL, with fallback for development."""
    url = settings.DATABASE_URL
    if not url:
        # Fallback: construct from Supabase settings
        if settings.SUPABASE_URL:
            # Supabase URL format: https://xxx.supabase.co
            # DB URL format: postgresql+asyncpg://postgres:password@db.xxx.supabase.co:5432/postgres
            host = settings.SUPABASE_URL.replace("https://", "").replace("http://", "")
            return f"postgresql+asyncpg://postgres:{settings.SUPABASE_SERVICE_ROLE_KEY}@db.{host}:5432/postgres"
        # SQLite fallback for local development/testing
        return "sqlite+aiosqlite:///./dev.db"
    return url


_db_url = _get_database_url()

_is_pg = _db_url.startswith("postgresql")

engine = create_async_engine(
    _db_url,
    echo=False,
    **({} if not _is_pg else {
        "poolclass": NullPool,
        "connect_args": {
            "statement_cache_size": 0,
        },
    }),
)

async_session_factory = async_sessionmaker(
    engine,
    class_=AsyncSession,
    expire_on_commit=False,
)


def is_postgres() -> bool:
    """Check if using PostgreSQL (vs SQLite)."""
    return _is_pg


async def get_db() -> AsyncSession:
    async with async_session_factory() as session:
        try:
            yield session
        finally:
            await session.close()
